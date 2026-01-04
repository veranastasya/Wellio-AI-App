import { storage } from "./storage";
import { logger } from "./logger";
import webpush from "web-push";
import type { Client, Goal, ClientReminderSettings, ReminderType } from "@shared/schema";

interface ReminderCandidate {
  clientId: string;
  clientName: string;
  type: ReminderType;
  category: "goal" | "plan" | "inactivity" | "daily_checkin";
  title: string;
  message: string;
  relatedGoalId?: string;
  relatedPlanId?: string;
  severity?: "high" | "medium" | "low";
  daysSince?: number;
}

// Cooldown periods in hours per reminder category
const REMINDER_COOLDOWNS: Record<string, number> = {
  inactivity: 24,      // 24 hours between inactivity reminders of same type
  goal: 24,            // 24 hours between goal reminders of same type
  plan: 24,            // 24 hours between plan reminders
  daily_checkin: 24,   // Once per day for meal-time check-ins
};

// High severity threshold - for messaging customization (NOT for bypassing limits)
const HIGH_SEVERITY_DAYS_THRESHOLD = 5;

// Maximum inactivity reminders per day - NEVER bypass this limit
const MAX_INACTIVITY_REMINDERS_PER_DAY = 1;

async function hasRecentReminderOfType(clientId: string, reminderType: ReminderType, cooldownHours: number): Promise<boolean> {
  const recentReminders = await storage.getRecentSentReminders(clientId, reminderType, cooldownHours);
  return recentReminders.length > 0;
}

function isWithinQuietHours(settings: ClientReminderSettings): boolean {
  const now = new Date();
  
  // Use client's timezone for quiet hours check
  const clientTimezone = settings.timezone || "America/New_York";
  let currentHour: number;
  let currentMinutes: number;
  
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: clientTimezone,
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    currentHour = parseInt(parts.find(p => p.type === "hour")?.value || "0", 10);
    currentMinutes = parseInt(parts.find(p => p.type === "minute")?.value || "0", 10);
  } catch {
    // Fallback to server time if timezone parsing fails
    currentHour = now.getHours();
    currentMinutes = now.getMinutes();
  }
  
  const currentTime = currentHour * 60 + currentMinutes;

  const [startHour, startMin] = settings.quietHoursStart.split(":").map(Number);
  const [endHour, endMin] = settings.quietHoursEnd.split(":").map(Number);
  
  const quietStart = startHour * 60 + startMin;
  const quietEnd = endHour * 60 + endMin;

  if (quietStart > quietEnd) {
    return currentTime >= quietStart || currentTime < quietEnd;
  }
  return currentTime >= quietStart && currentTime < quietEnd;
}

function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

function getClientLocalHour(timezone: string): number {
  const now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    return parseInt(parts.find(p => p.type === "hour")?.value || "0", 10);
  } catch {
    // Fallback to server time if timezone parsing fails
    return now.getHours();
  }
}

function getDaysSinceLastActivity(client: Client): number {
  if (!client.lastActiveAt) return 999;
  const lastActive = new Date(client.lastActiveAt);
  const now = new Date();
  const diffMs = now.getTime() - lastActive.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

async function getGoalReminders(client: Client, settings: ClientReminderSettings): Promise<ReminderCandidate[]> {
  if (!settings.goalRemindersEnabled) return [];

  const goals = await storage.getGoalsByClientId(client.id);
  const activeGoals = goals.filter(g => g.status === "active" && g.scope === "long_term");
  const cooldownHours = REMINDER_COOLDOWNS.goal;

  // Group goals by reminder type to ensure deterministic selection
  const goalsByType = new Map<ReminderType, Goal[]>();
  for (const goal of activeGoals) {
    const reminderType = getGoalReminderType(goal.goalType);
    if (!goalsByType.has(reminderType)) {
      goalsByType.set(reminderType, []);
    }
    goalsByType.get(reminderType)!.push(goal);
  }

  const reminders: ReminderCandidate[] = [];

  // Process each type once, picking the first valid goal for that type
  const entries = Array.from(goalsByType.entries());
  for (const [reminderType, goalsOfType] of entries) {
    // Check cooldown for this type first (before creating any reminders)
    const hasRecentReminder = await hasRecentReminderOfType(client.id, reminderType, cooldownHours);
    if (hasRecentReminder) continue;

    // Find the first goal that produces a valid reminder
    for (const goal of goalsOfType) {
      const reminder = createGoalReminder(client, goal);
      if (reminder) {
        reminders.push(reminder);
        break; // Only one reminder per type
      }
    }
  }

  return reminders;
}

function getGoalReminderType(goalType: string): ReminderType {
  switch (goalType) {
    case "weight":
    case "lose_weight":
    case "maintain_weight":
      return "goal_weight";
    case "workout":
    case "fitness":
    case "improve_fitness_endurance":
    case "gain_muscle_strength":
      return "goal_workout";
    case "nutrition":
    case "eat_healthier":
    case "calories":
      return "goal_nutrition";
    default:
      return "goal_general";
  }
}

function createGoalReminder(client: Client, goal: Goal): ReminderCandidate | null {
  const progress = goal.baselineValue 
    ? ((goal.currentValue - goal.baselineValue) / (goal.targetValue - goal.baselineValue)) * 100
    : (goal.currentValue / goal.targetValue) * 100;

  const reminderType = getGoalReminderType(goal.goalType);
  let title = "";
  let message = "";

  switch (reminderType) {
    case "goal_weight":
      title = "Time to log your weight!";
      message = `Track your progress toward your ${goal.title} goal. You're ${Math.round(Math.max(0, Math.min(100, progress)))}% there!`;
      break;
    case "goal_workout":
      title = "Ready for today's workout?";
      message = `Keep up the momentum on your ${goal.title} goal! Log your workout when you're done.`;
      break;
    case "goal_nutrition":
      title = "How's your nutrition today?";
      message = `Stay on track with your ${goal.title} goal. Log your meals to track your progress!`;
      break;
    default:
      title = "Check in on your goal!";
      message = `Don't forget to track your progress on: ${goal.title}`;
  }

  return {
    clientId: client.id,
    clientName: client.name,
    type: reminderType,
    category: "goal",
    title,
    message,
    relatedGoalId: goal.id,
  };
}

async function getPlanReminders(client: Client, settings: ClientReminderSettings): Promise<ReminderCandidate[]> {
  if (!settings.planRemindersEnabled) return [];

  const cooldownHours = REMINDER_COOLDOWNS.plan;
  const hasRecentReminder = await hasRecentReminderOfType(client.id, "plan_daily", cooldownHours);
  if (hasRecentReminder) return [];

  const plans = await storage.getClientPlansByClientId(client.id);
  // Include both "assigned" and "active" status plans
  const activePlans = plans.filter(p => (p.status === "assigned" || p.status === "active") && p.shared);

  if (activePlans.length === 0) return [];

  const latestPlan = activePlans[0];
  const planContent = latestPlan.planContent as any;
  
  let todayActivity = "";
  if (planContent?.weeklyPrograms) {
    const dayOfWeek = new Date().getDay();
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayName = dayNames[dayOfWeek];
    
    const currentWeek = Object.values(planContent.weeklyPrograms)[0] as any;
    if (currentWeek?.workouts) {
      const todayWorkout = currentWeek.workouts.find((w: any) => 
        w.day?.toLowerCase() === dayName || w.dayOfWeek === dayOfWeek
      );
      if (todayWorkout) {
        todayActivity = todayWorkout.name || todayWorkout.type || "scheduled activity";
      }
    }
  }

  if (!todayActivity) {
    todayActivity = "your planned activities";
  }

  return [{
    clientId: client.id,
    clientName: client.name,
    type: "plan_daily",
    category: "plan",
    title: `Today's plan: ${todayActivity}`,
    message: `Did you complete ${todayActivity}? Log your progress to stay on track!`,
    relatedPlanId: latestPlan.id,
  }];
}

async function getInactivityReminders(client: Client, settings: ClientReminderSettings): Promise<ReminderCandidate[]> {
  if (!settings.inactivityRemindersEnabled) return [];

  const today = getTodayDateString();
  const thresholdDays = settings.inactivityThresholdDays;

  // Check if we've already sent the max inactivity reminders today (MAX 1 per day)
  const inactivityRemindersToday = await storage.countInactivityRemindersToday(client.id, today);
  if (inactivityRemindersToday >= MAX_INACTIVITY_REMINDERS_PER_DAY) {
    logger.debug("Skipping inactivity reminders - daily limit reached", { 
      clientId: client.id, 
      limit: MAX_INACTIVITY_REMINDERS_PER_DAY,
      sentToday: inactivityRemindersToday 
    });
    return [];
  }

  // Check if client has messaged the coach recently - treat messaging as activity
  const lastMessageTimestamp = await storage.getLastClientMessageTimestamp(client.id);
  if (lastMessageTimestamp) {
    const lastMessageDate = new Date(lastMessageTimestamp);
    const now = new Date();
    const daysSinceMessage = Math.floor((now.getTime() - lastMessageDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // If client messaged within threshold, they're not truly inactive
    if (daysSinceMessage < thresholdDays) {
      logger.debug("Skipping inactivity reminders - client messaged recently", { 
        clientId: client.id, 
        daysSinceMessage 
      });
      return [];
    }
  }

  const progressEvents = await storage.getProgressEventsByClientId(client.id);

  const mealLogs = progressEvents.filter(e => e.eventType === "nutrition");
  const workoutLogs = progressEvents.filter(e => e.eventType === "workout");
  const checkInLogs = progressEvents.filter(e => e.eventType === "checkin_mood" || e.eventType === "weight");

  const lastMealDate = mealLogs.length > 0 ? new Date(mealLogs[0].dateForMetric) : null;
  const lastWorkoutDate = workoutLogs.length > 0 ? new Date(workoutLogs[0].dateForMetric) : null;
  const lastCheckInDate = checkInLogs.length > 0 ? new Date(checkInLogs[0].dateForMetric) : null;

  const now = new Date();
  const daysSinceMeal = lastMealDate ? Math.floor((now.getTime() - lastMealDate.getTime()) / (1000 * 60 * 60 * 24)) : 999;
  const daysSinceWorkout = lastWorkoutDate ? Math.floor((now.getTime() - lastWorkoutDate.getTime()) / (1000 * 60 * 60 * 24)) : 999;
  const daysSinceCheckIn = lastCheckInDate ? Math.floor((now.getTime() - lastCheckInDate.getTime()) / (1000 * 60 * 60 * 24)) : 999;

  // Build list of eligible inactivity reminders with their priority (days since)
  interface InactivityCandidate {
    type: ReminderType;
    title: string;
    message: string;
    daysSince: number;
    severity: "high" | "medium" | "low";
  }

  const eligibleReminders: InactivityCandidate[] = [];
  const cooldownHours = REMINDER_COOLDOWNS.inactivity;

  // Helper to determine severity based on days since activity
  const getSeverity = (days: number): "high" | "medium" | "low" => {
    if (days >= HIGH_SEVERITY_DAYS_THRESHOLD) return "high";
    if (days >= 3) return "medium";
    return "low";
  };

  // Check inactivity - respect cooldowns strictly (no bypass for high severity)
  // Daily limit is already enforced at the top of this function
  if (daysSinceMeal >= thresholdDays && daysSinceMeal < 999) {
    const severity = getSeverity(daysSinceMeal);
    const hasRecentReminder = await hasRecentReminderOfType(client.id, "inactivity_meals", cooldownHours);
    
    // Always respect cooldown - no bypass
    if (!hasRecentReminder) {
      eligibleReminders.push({
        type: "inactivity_meals",
        title: severity === "high" ? "We're concerned about you!" : "We miss your meal logs!",
        message: severity === "high" 
          ? `It's been ${daysSinceMeal} days since your last meal log. Everything okay? We're here to help!`
          : `It's been ${daysSinceMeal} days since your last meal log. Quick check-in: what did you eat today?`,
        daysSince: daysSinceMeal,
        severity,
      });
    }
  }

  if (daysSinceWorkout >= thresholdDays && daysSinceWorkout < 999) {
    const severity = getSeverity(daysSinceWorkout);
    const hasRecentReminder = await hasRecentReminderOfType(client.id, "inactivity_workouts", cooldownHours);
    
    // Always respect cooldown - no bypass
    if (!hasRecentReminder) {
      eligibleReminders.push({
        type: "inactivity_workouts",
        title: severity === "high" ? "We haven't seen you in a while!" : "Time to get moving!",
        message: severity === "high"
          ? `It's been ${daysSinceWorkout} days since your last workout. Need help getting back on track?`
          : `It's been ${daysSinceWorkout} days since your last workout. Even a short session counts!`,
        daysSince: daysSinceWorkout,
        severity,
      });
    }
  }

  if (daysSinceCheckIn >= thresholdDays + 1 && daysSinceCheckIn < 999) {
    const severity = getSeverity(daysSinceCheckIn);
    const hasRecentReminder = await hasRecentReminderOfType(client.id, "inactivity_checkin", cooldownHours);
    
    // Always respect cooldown - no bypass
    if (!hasRecentReminder) {
      eligibleReminders.push({
        type: "inactivity_checkin",
        title: severity === "high" ? "We're thinking of you!" : "How are you feeling?",
        message: severity === "high"
          ? `We haven't heard from you in ${daysSinceCheckIn} days. Your coach is here to support you - just say hi!`
          : `We haven't heard from you in a while. A quick check-in helps your coach support you better!`,
        daysSince: daysSinceCheckIn,
        severity,
      });
    }
  }

  // Return ONLY the most concerning inactivity (highest days since)
  // This prevents sending 3 separate inactivity notifications at once
  if (eligibleReminders.length === 0) return [];

  eligibleReminders.sort((a, b) => b.daysSince - a.daysSince);
  const mostConcerning = eligibleReminders[0];

  return [{
    clientId: client.id,
    clientName: client.name,
    type: mostConcerning.type,
    category: "inactivity",
    title: mostConcerning.title,
    message: mostConcerning.message,
    severity: mostConcerning.severity,
    daysSince: mostConcerning.daysSince,
  }];
}

// Daily check-in reminders - encouraging messages for breakfast, lunch, dinner
async function getDailyCheckInReminders(client: Client, settings: ClientReminderSettings): Promise<ReminderCandidate[]> {
  const reminders: ReminderCandidate[] = [];
  const clientTimezone = settings.timezone || "America/New_York";
  const currentHour = getClientLocalHour(clientTimezone);

  // Encouraging messages for each meal time
  const checkInMessages = {
    breakfast: {
      type: "daily_breakfast" as ReminderType,
      hour: { start: 7, end: 10 },
      titles: [
        "Good morning! How was breakfast?",
        "Rise and shine! What's fueling you today?",
        "Morning check-in time!",
      ],
      messages: [
        "Starting the day right! Log your breakfast and set the tone for a great day ahead.",
        "A good breakfast sets you up for success. What did you have this morning?",
        "How are you feeling this morning? Take a moment to check in with yourself.",
      ],
    },
    lunch: {
      type: "daily_lunch" as ReminderType,
      hour: { start: 11, end: 14 },
      titles: [
        "Lunchtime check-in!",
        "How's your day going?",
        "Midday motivation!",
      ],
      messages: [
        "Halfway through the day! What's keeping you energized?",
        "How was lunch? Keep that momentum going strong!",
        "You're doing great! Take a moment to log your progress.",
      ],
    },
    dinner: {
      type: "daily_dinner" as ReminderType,
      hour: { start: 17, end: 20 },
      titles: [
        "Evening reflection time!",
        "How was your day?",
        "Wind-down check-in!",
      ],
      messages: [
        "What a day! How was dinner? Reflect on your wins today.",
        "You've made it through another day. How are you feeling?",
        "Evening check-in: What's one thing you're proud of today?",
      ],
    },
  };

  const cooldownHours = REMINDER_COOLDOWNS.daily_checkin;

  for (const [meal, config] of Object.entries(checkInMessages)) {
    // Check if current time is within the meal's window
    if (currentHour >= config.hour.start && currentHour < config.hour.end) {
      // Use timestamp-based cooldown instead of daily check
      const hasRecentReminder = await hasRecentReminderOfType(client.id, config.type, cooldownHours);
      if (!hasRecentReminder) {
        // Pick a random message for variety
        const titleIndex = Math.floor(Math.random() * config.titles.length);
        const messageIndex = Math.floor(Math.random() * config.messages.length);

        reminders.push({
          clientId: client.id,
          clientName: client.name,
          type: config.type,
          category: "daily_checkin",
          title: config.titles[titleIndex],
          message: config.messages[messageIndex],
        });
      }
    }
  }

  return reminders;
}

async function sendPushReminder(clientId: string, title: string, body: string, reminderType: string, coachName?: string): Promise<boolean> {
  try {
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      logger.warn("Reminder skipped: VAPID keys not configured");
      return false;
    }
    
    webpush.setVapidDetails(
      "mailto:support@wellio.app",
      vapidPublicKey,
      vapidPrivateKey
    );
    
    const subscriptions = await storage.getAllPushSubscriptions(clientId);
    
    if (subscriptions.length === 0) {
      logger.debug("Reminder skipped: Client has no push subscriptions", { clientId });
      return false;
    }
    
    // Use coach name as title - iOS will add "from [App Name]" automatically
    const notificationTitle = coachName || "Wellio AI";
    
    // Combine the reminder title and message for the body
    const notificationBody = `${title}\n${body}`;
    
    const pushPayload = JSON.stringify({
      type: "reminder",
      title: notificationTitle,
      body: notificationBody,
      icon: "/icon-192.png?v=3",
      badge: "/icon-72.png?v=3",
      tag: `wellio-reminder-${reminderType}`,
      data: { 
        url: "/client/ai-tracker",
        reminderType,
      }
    });
    
    let sentCount = 0;
    
    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          pushPayload
        );
        sentCount++;
      } catch (error: any) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          logger.info("Push subscription expired, removing", { clientId, endpoint: subscription.endpoint.slice(-20) });
          await storage.deletePushSubscriptionByEndpoint(subscription.endpoint);
        }
      }
    }
    
    return sentCount > 0;
  } catch (error: any) {
    logger.error("Failed to send push reminder", { clientId }, error);
    return false;
  }
}

interface ProcessOptions {
  bypassQuietHours?: boolean;
}

interface ProcessResult {
  sentCount: number;
  skippedReason?: string;
}

export async function processRemindersForClient(client: Client, options: ProcessOptions = {}): Promise<ProcessResult> {
  let sentCount = 0;
  const today = getTodayDateString();

  try {
    let settings = await storage.getClientReminderSettings(client.id);
    
    if (!settings) {
      const coach = await storage.getDefaultCoach();
      if (!coach) return { sentCount: 0, skippedReason: "No coach assigned" };
      
      settings = await storage.createClientReminderSettings({
        clientId: client.id,
        coachId: client.coachId || coach.id,
        remindersEnabled: true,
        goalRemindersEnabled: true,
        planRemindersEnabled: true,
        inactivityRemindersEnabled: true,
        inactivityThresholdDays: 1,
        quietHoursStart: "21:00",
        quietHoursEnd: "08:00",
        timezone: "America/New_York",
        maxRemindersPerDay: 5,
      });
    }

    if (!settings.remindersEnabled) {
      return { sentCount: 0, skippedReason: "Reminders are disabled for this client" };
    }

    // Check if we've hit the client's daily reminder limit
    const remindersSentToday = await storage.countSentRemindersToday(client.id, today);
    const maxPerDay = settings.maxRemindersPerDay || 3;
    if (remindersSentToday >= maxPerDay) {
      logger.debug("Skipping reminders - daily limit reached", { 
        clientId: client.id, 
        limit: maxPerDay,
        sentToday: remindersSentToday 
      });
      return { sentCount: 0, skippedReason: `Daily limit of ${maxPerDay} reminders reached` };
    }

    // Check quiet hours - but high severity inactivity notifications can bypass
    const inQuietHours = !options.bypassQuietHours && isWithinQuietHours(settings);
    
    // Collect reminders by priority category (highest to lowest)
    // Priority: inactivity (most urgent) > goals > plan > daily check-in (least urgent)
    // Each getter handles its own cooldown logic internally
    
    const inactivityReminders = await getInactivityReminders(client, settings);
    
    // High severity inactivity reminders bypass quiet hours - client really needs to hear from us
    const hasHighSeverityInactivity = inactivityReminders.length > 0 && 
      inactivityReminders[0].severity === "high";
    
    if (inQuietHours && !hasHighSeverityInactivity) {
      logger.debug("Skipping reminders during quiet hours", { clientId: client.id });
      return { sentCount: 0, skippedReason: "Currently within quiet hours" };
    }
    
    const goalReminders = await getGoalReminders(client, settings);
    const planReminders = await getPlanReminders(client, settings);
    const dailyCheckInReminders = await getDailyCheckInReminders(client, settings);

    // Pick the most important reminder using priority order
    // Inactivity > goals > plan > daily check-in
    // Each type manages its own cooldown, so we just pick the highest priority available
    let selectedReminder: ReminderCandidate | null = null;

    if (inactivityReminders.length > 0) {
      selectedReminder = inactivityReminders[0];
      logger.debug("Selected inactivity reminder", { 
        clientId: client.id, 
        severity: inactivityReminders[0].severity,
        daysSince: inactivityReminders[0].daysSince 
      });
    } else if (goalReminders.length > 0) {
      selectedReminder = goalReminders[0];
    } else if (planReminders.length > 0) {
      selectedReminder = planReminders[0];
    } else if (dailyCheckInReminders.length > 0) {
      selectedReminder = dailyCheckInReminders[0];
    }

    const remindersToSend = selectedReminder ? [selectedReminder] : [];

    if (remindersToSend.length === 0) {
      return { sentCount: 0, skippedReason: "No reminders are due at this time" };
    }

    // Get coach name for personalized notifications
    let coachName: string | undefined;
    if (client.coachId) {
      const coach = await storage.getCoach(client.coachId);
      coachName = coach?.name;
    }

    for (const reminder of remindersToSend) {
      const success = await sendPushReminder(client.id, reminder.title, reminder.message, reminder.type, coachName);
      
      if (success) {
        await storage.createSentReminder({
          clientId: reminder.clientId,
          reminderType: reminder.type,
          reminderCategory: reminder.category,
          title: reminder.title,
          message: reminder.message,
          sentAt: new Date().toISOString(),
          sentDate: today,
          deliveryStatus: "sent",
          relatedGoalId: reminder.relatedGoalId,
          relatedPlanId: reminder.relatedPlanId,
        });
        sentCount++;
        logger.info("Reminder sent", { 
          clientId: client.id, 
          clientName: client.name, 
          type: reminder.type,
          title: reminder.title 
        });
      }
    }

    if (sentCount === 0 && remindersToSend.length > 0) {
      return { sentCount: 0, skippedReason: "Client does not have push notifications enabled" };
    }

  } catch (error: any) {
    logger.error("Error processing reminders for client", { 
      clientId: client.id,
      message: error?.message || String(error),
      stack: error?.stack,
      name: error?.name
    });
    return { sentCount: 0, skippedReason: "Error processing reminders" };
  }

  return { sentCount };
}

export async function processAllReminders(): Promise<{ processedClients: number; sentReminders: number }> {
  logger.info("Starting reminder processing cycle");
  
  let processedClients = 0;
  let sentReminders = 0;

  try {
    const clientsWithSubscriptions = await storage.getClientsWithPushSubscriptions();
    
    logger.info("Found clients with push subscriptions", { count: clientsWithSubscriptions.length });

    for (const client of clientsWithSubscriptions) {
      if (client.status !== "active") continue;

      const result = await processRemindersForClient(client);
      if (result.sentCount > 0) {
        sentReminders += result.sentCount;
      }
      processedClients++;
    }

    logger.info("Reminder processing cycle complete", { processedClients, sentReminders });
  } catch (error: any) {
    logger.error("Error in reminder processing cycle", { 
      message: error?.message || String(error),
      stack: error?.stack,
      name: error?.name
    });
  }

  return { processedClients, sentReminders };
}

let reminderInterval: ReturnType<typeof setInterval> | null = null;

export function startReminderScheduler(intervalMs: number = 60 * 60 * 1000): void {
  if (reminderInterval) {
    logger.warn("Reminder scheduler already running");
    return;
  }

  logger.info("Starting reminder scheduler", { intervalMs });
  
  reminderInterval = setInterval(async () => {
    await processAllReminders();
  }, intervalMs);

  setTimeout(async () => {
    await processAllReminders();
  }, 5000);
}

export function stopReminderScheduler(): void {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
    logger.info("Reminder scheduler stopped");
  }
}
