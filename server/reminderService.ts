import { storage } from "./storage";
import { logger } from "./logger";
import webpush from "web-push";
import type { Client, Goal, ClientReminderSettings, ReminderType } from "@shared/schema";

interface ReminderCandidate {
  clientId: string;
  clientName: string;
  type: ReminderType;
  category: "goal" | "plan" | "inactivity";
  title: string;
  message: string;
  relatedGoalId?: string;
  relatedPlanId?: string;
}

function isWithinQuietHours(settings: ClientReminderSettings): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
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
  const reminders: ReminderCandidate[] = [];
  const today = getTodayDateString();

  // Fetch all sent reminders for today once (O(1) instead of O(goals))
  const allSentToday = await storage.getSentReminders(client.id, today);
  const sentTypes = new Set(allSentToday.map(r => r.reminderType));

  for (const goal of activeGoals) {
    const reminderType = getGoalReminderType(goal.goalType);
    
    // Skip if this type was already sent today
    if (sentTypes.has(reminderType)) continue;

    const reminder = createGoalReminder(client, goal);
    if (reminder) {
      reminders.push(reminder);
      // Mark as sent to prevent duplicates within same run
      sentTypes.add(reminderType);
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

  const today = getTodayDateString();
  const alreadySent = await storage.getSentRemindersByTypeAndDate(client.id, "plan_daily", today);
  if (alreadySent.length > 0) return [];

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

  const reminders: ReminderCandidate[] = [];
  const today = getTodayDateString();
  const thresholdDays = settings.inactivityThresholdDays;

  const smartLogs = await storage.getSmartLogsByClientId(client.id);
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

  if (daysSinceMeal >= thresholdDays) {
    const alreadySent = await storage.getSentRemindersByTypeAndDate(client.id, "inactivity_meals", today);
    if (alreadySent.length === 0) {
      reminders.push({
        clientId: client.id,
        clientName: client.name,
        type: "inactivity_meals",
        category: "inactivity",
        title: "We miss your meal logs!",
        message: `It's been ${daysSinceMeal} days since your last meal log. Quick check-in: what did you eat today?`,
      });
    }
  }

  if (daysSinceWorkout >= thresholdDays) {
    const alreadySent = await storage.getSentRemindersByTypeAndDate(client.id, "inactivity_workouts", today);
    if (alreadySent.length === 0) {
      reminders.push({
        clientId: client.id,
        clientName: client.name,
        type: "inactivity_workouts",
        category: "inactivity",
        title: "Time to get moving!",
        message: `It's been ${daysSinceWorkout} days since your last workout. Even a short session counts!`,
      });
    }
  }

  if (daysSinceCheckIn >= thresholdDays + 1) {
    const alreadySent = await storage.getSentRemindersByTypeAndDate(client.id, "inactivity_checkin", today);
    if (alreadySent.length === 0) {
      reminders.push({
        clientId: client.id,
        clientName: client.name,
        type: "inactivity_checkin",
        category: "inactivity",
        title: "How are you feeling?",
        message: `We haven't heard from you in a while. A quick check-in helps your coach support you better!`,
      });
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
    
    // Format title with coach name for personalization
    const notificationTitle = coachName 
      ? `Reminder from ${coachName}` 
      : "Wellio AI";
    
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
        inactivityThresholdDays: 2,
        quietHoursStart: "21:00",
        quietHoursEnd: "08:00",
        timezone: "America/New_York",
        maxRemindersPerDay: 3,
      });
    }

    if (!settings.remindersEnabled) {
      return { sentCount: 0, skippedReason: "Reminders are disabled for this client" };
    }

    if (!options.bypassQuietHours && isWithinQuietHours(settings)) {
      logger.debug("Skipping reminders during quiet hours", { clientId: client.id });
      return { sentCount: 0, skippedReason: "Currently within quiet hours" };
    }

    const alreadySentToday = await storage.countSentRemindersToday(client.id, today);
    if (alreadySentToday >= settings.maxRemindersPerDay) {
      logger.debug("Max daily reminders reached", { clientId: client.id, count: alreadySentToday });
      return { sentCount: 0, skippedReason: "Daily reminder limit reached" };
    }

    const remainingSlots = settings.maxRemindersPerDay - alreadySentToday;

    const candidates: ReminderCandidate[] = [];

    const goalReminders = await getGoalReminders(client, settings);
    const planReminders = await getPlanReminders(client, settings);
    const inactivityReminders = await getInactivityReminders(client, settings);

    candidates.push(...inactivityReminders);
    candidates.push(...goalReminders);
    candidates.push(...planReminders);

    const remindersToSend = candidates.slice(0, remainingSlots);

    if (candidates.length === 0) {
      return { sentCount: 0, skippedReason: "No reminders are due (client has no active goals, plans, or recent activity)" };
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
    logger.error("Error processing reminders for client", { clientId: client.id }, error);
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
    logger.error("Error in reminder processing cycle", error);
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
