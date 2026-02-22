import OpenAI from "openai";
import { storage } from "./storage";
import { logger } from "./logger";
import type {
  Client,
  TriggerType,
  TriggerSeverity,
  InsertEngagementTrigger,
  ClientDataLog,
  SmartLog,
  Message,
  Goal,
  ProgressEvent,
  WeeklyScheduleItem,
  NutritionPayload,
  WorkoutPayload,
  CheckinPayload,
  AIParsedData,
} from "@shared/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ActivityAnalysis {
  daysSinceMeal: number;
  daysSinceWorkout: number;
  daysSinceCheckIn: number;
  daysSinceMessage: number;
  daysSinceAnyActivity: number;
  hasActiveGoals: boolean;
  hasWorkoutGoals: boolean;
  hasNutritionGoals: boolean;
}

interface ComprehensiveClientContext {
  client: {
    name: string;
    goalType: string | null;
    goalDescription: string | null;
    sex: string | null;
    age: number | null;
    weight: number | null;
    height: number | null;
    targetWeight: number | null;
    activityLevel: string | null;
    joinedDate: string;
  };
  goals: { type: string; description: string | null; status: string; targetValue: number | string | null; currentValue: number | string | null }[];
  recentNutrition: { date: string; calories?: number; protein?: number; carbs?: number; fats?: number; comment?: string }[];
  recentWorkouts: { date: string; type?: string; duration?: number; intensity?: string; comment?: string }[];
  recentCheckins: { date: string; weight?: number; energy?: number; mood?: number; sleepHours?: number; comment?: string }[];
  recentSmartLogs: { date: string; rawText: string | null; parsed: AIParsedData | null }[];
  recentMessages: { date: string; sender: string; content: string }[];
  weeklyPlanAdherence: { totalItems: number; completedItems: number; completionRate: number };
  planTargets: { caloriesPerDay?: number; proteinG?: number; workoutsPerWeek?: number; stepsPerDay?: number; sleepHours?: number } | null;
  activityAnalysis: ActivityAnalysis;
}

function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

function getDateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

async function analyzeClientActivity(client: Client): Promise<ActivityAnalysis> {
  const progressEvents = await storage.getProgressEventsByClientId(client.id);
  const goals = await storage.getGoalsByClientId(client.id);
  const clientDataLogs = await storage.getClientDataLogsByClientId(client.id);
  const smartLogs = await storage.getSmartLogsByClientId(client.id);

  const mealLogs = progressEvents.filter(e => e.eventType === "nutrition");
  const workoutLogs = progressEvents.filter(e => e.eventType === "workout");
  const checkInLogs = progressEvents.filter(e =>
    e.eventType === "checkin_mood" || e.eventType === "weight" || e.eventType === "sleep"
  );

  const nutritionDataLogs = clientDataLogs.filter(l => l.type === "nutrition");
  const workoutDataLogs = clientDataLogs.filter(l => l.type === "workout");
  const checkinDataLogs = clientDataLogs.filter(l => l.type === "checkin");

  const smartMeals = smartLogs.filter(s => s.aiClassificationJson?.has_nutrition);
  const smartWorkouts = smartLogs.filter(s => s.aiClassificationJson?.has_workout);
  const smartCheckins = smartLogs.filter(s =>
    s.aiClassificationJson?.has_sleep || s.aiClassificationJson?.has_mood || s.aiClassificationJson?.has_weight
  );

  const now = new Date();
  const clientJoinedDate = client.joinedDate ? new Date(client.joinedDate) : now;
  const daysSinceClientJoined = Math.max(0, Math.floor((now.getTime() - clientJoinedDate.getTime()) / (1000 * 60 * 60 * 24)));

  const getLastDateFromEvents = (logs: typeof progressEvents): Date | null => {
    if (logs.length === 0) return null;
    const sorted = [...logs].sort((a, b) => {
      const dateA = a.dateForMetric || a.createdAt || "";
      const dateB = b.dateForMetric || b.createdAt || "";
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
    const dateStr = sorted[0].dateForMetric || sorted[0].createdAt;
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const getLastDateFromDataLogs = (logs: ClientDataLog[]): Date | null => {
    if (logs.length === 0) return null;
    const sorted = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const d = new Date(sorted[0].date);
    return isNaN(d.getTime()) ? null : d;
  };

  const getLastDateFromSmartLogs = (logs: SmartLog[]): Date | null => {
    if (logs.length === 0) return null;
    const sorted = [...logs].sort((a, b) =>
      new Date(b.localDateForClient).getTime() - new Date(a.localDateForClient).getTime()
    );
    const d = new Date(sorted[0].localDateForClient);
    return isNaN(d.getTime()) ? null : d;
  };

  const mostRecent = (...dates: (Date | null)[]): Date | null => {
    const valid = dates.filter((d): d is Date => d !== null);
    if (valid.length === 0) return null;
    return valid.reduce((a, b) => a.getTime() > b.getTime() ? a : b);
  };

  const lastMealDate = mostRecent(
    getLastDateFromEvents(mealLogs),
    getLastDateFromDataLogs(nutritionDataLogs),
    getLastDateFromSmartLogs(smartMeals)
  );
  const lastWorkoutDate = mostRecent(
    getLastDateFromEvents(workoutLogs),
    getLastDateFromDataLogs(workoutDataLogs),
    getLastDateFromSmartLogs(smartWorkouts)
  );
  const lastCheckInDate = mostRecent(
    getLastDateFromEvents(checkInLogs),
    getLastDateFromDataLogs(checkinDataLogs),
    getLastDateFromSmartLogs(smartCheckins)
  );

  const lastMessageTimestamp = await storage.getLastClientMessageTimestamp(client.id);
  const lastMessageDate = lastMessageTimestamp ? new Date(lastMessageTimestamp) : null;

  const daysSince = (date: Date | null): number => {
    if (!date) return daysSinceClientJoined;
    const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  const daysSinceMeal = daysSince(lastMealDate);
  const daysSinceWorkout = daysSince(lastWorkoutDate);
  const daysSinceCheckIn = daysSince(lastCheckInDate);
  const daysSinceMessage = daysSince(lastMessageDate);
  const daysSinceAnyActivity = Math.min(daysSinceMeal, daysSinceWorkout, daysSinceCheckIn, daysSinceMessage);

  const activeGoals = goals.filter(g => g.status === "active");
  const workoutGoalTypes = ["workout", "fitness", "improve_fitness_endurance", "gain_muscle_strength"];
  const nutritionGoalTypes = ["nutrition", "eat_healthier", "calories", "lose_weight", "maintain_weight"];

  return {
    daysSinceMeal,
    daysSinceWorkout,
    daysSinceCheckIn,
    daysSinceMessage,
    daysSinceAnyActivity,
    hasActiveGoals: activeGoals.length > 0,
    hasWorkoutGoals: activeGoals.some(g => workoutGoalTypes.includes(g.goalType)),
    hasNutritionGoals: activeGoals.some(g => nutritionGoalTypes.includes(g.goalType)),
  };
}

async function buildComprehensiveContext(client: Client): Promise<ComprehensiveClientContext> {
  const lookbackDays = 14;
  const startDate = getDateNDaysAgo(lookbackDays);

  const [
    goals,
    clientDataLogs,
    smartLogs,
    recentMessages,
    scheduleItems,
    planTargetRecords,
    activityAnalysis,
  ] = await Promise.all([
    storage.getGoalsByClientId(client.id),
    storage.getClientDataLogsByClientId(client.id, { startDate }),
    storage.getSmartLogsByClientId(client.id, { startDate }),
    storage.getMessagesByClientId(client.id, { limit: 30 }),
    storage.getWeeklyScheduleItems(client.id),
    storage.getPlanTargetsByClientId(client.id),
    analyzeClientActivity(client),
  ]);

  const recentNutrition = clientDataLogs
    .filter(l => l.type === "nutrition")
    .map(l => {
      const p = l.payload as NutritionPayload;
      return { date: l.date, calories: p.calories, protein: p.protein, carbs: p.carbs, fats: p.fats, comment: p.comment };
    });

  const recentWorkouts = clientDataLogs
    .filter(l => l.type === "workout")
    .map(l => {
      const p = l.payload as WorkoutPayload;
      return { date: l.date, type: p.workoutType, duration: p.durationMinutes, intensity: p.intensity, comment: p.comment };
    });

  const recentCheckins = clientDataLogs
    .filter(l => l.type === "checkin")
    .map(l => {
      const p = l.payload as CheckinPayload;
      return { date: l.date, weight: p.weight, energy: p.energy, mood: p.mood, sleepHours: p.sleepHours, comment: p.comment };
    });

  const recentSmartLogs = smartLogs
    .filter(s => s.processingStatus === "completed" && s.rawText)
    .slice(0, 20)
    .map(s => ({
      date: s.localDateForClient,
      rawText: s.rawText,
      parsed: s.aiParsedJson,
    }));

  const recentMsgs = recentMessages
    .filter(m => {
      const msgDate = new Date(m.timestamp);
      return msgDate >= new Date(startDate);
    })
    .slice(0, 20)
    .map(m => ({
      date: m.timestamp.split("T")[0] || m.timestamp,
      sender: m.sender,
      content: m.content.substring(0, 200),
    }));

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentScheduleItems = scheduleItems.filter(item => {
    const d = new Date(item.scheduledDate);
    return d >= weekAgo && d <= now;
  });
  const totalItems = recentScheduleItems.length;
  const completedItems = recentScheduleItems.filter(i => i.completed).length;

  const latestTargets = planTargetRecords.length > 0 ? planTargetRecords[0] : null;
  const targetsConfig = latestTargets?.configJson;

  return {
    client: {
      name: client.name,
      goalType: client.goalType,
      goalDescription: client.goalDescription,
      sex: client.sex,
      age: client.age,
      weight: client.weight,
      height: client.height,
      targetWeight: client.targetWeight,
      activityLevel: client.activityLevel,
      joinedDate: client.joinedDate,
    },
    goals: goals.filter(g => g.status === "active").map(g => ({
      type: g.goalType,
      description: g.description,
      status: g.status,
      targetValue: g.targetValue,
      currentValue: g.currentValue,
    })),
    recentNutrition,
    recentWorkouts,
    recentCheckins,
    recentSmartLogs,
    recentMessages: recentMsgs,
    weeklyPlanAdherence: {
      totalItems,
      completedItems,
      completionRate: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
    },
    planTargets: targetsConfig ? {
      caloriesPerDay: targetsConfig.calories_target_per_day,
      proteinG: targetsConfig.protein_target_g,
      workoutsPerWeek: targetsConfig.workouts_per_week_target,
      stepsPerDay: targetsConfig.steps_target_per_day,
      sleepHours: targetsConfig.sleep_target_hours,
    } : null,
    activityAnalysis,
  };
}

function hasEnoughDataForAI(ctx: ComprehensiveClientContext): boolean {
  const totalDataPoints =
    ctx.recentNutrition.length +
    ctx.recentWorkouts.length +
    ctx.recentCheckins.length +
    ctx.recentSmartLogs.length;
  return totalDataPoints >= 3;
}

function buildContextSummaryForAI(ctx: ComprehensiveClientContext): string {
  const sections: string[] = [];

  sections.push(`CLIENT PROFILE:
Name: ${ctx.client.name}
Goal: ${ctx.client.goalType || "Not set"} - ${ctx.client.goalDescription || "No description"}
Age: ${ctx.client.age || "Unknown"}, Sex: ${ctx.client.sex || "Unknown"}
Weight: ${ctx.client.weight || "Unknown"}, Target: ${ctx.client.targetWeight || "Not set"}
Height: ${ctx.client.height || "Unknown"}, Activity Level: ${ctx.client.activityLevel || "Unknown"}
Joined: ${ctx.client.joinedDate}`);

  if (ctx.goals.length > 0) {
    sections.push(`ACTIVE GOALS:\n${ctx.goals.map(g =>
      `- ${g.type}: ${g.description || "No description"} (Target: ${g.targetValue || "N/A"}, Current: ${g.currentValue || "N/A"})`
    ).join("\n")}`);
  }

  if (ctx.planTargets) {
    const t = ctx.planTargets;
    sections.push(`PLAN TARGETS:
${t.caloriesPerDay ? `Calories/day: ${t.caloriesPerDay}` : ""}
${t.proteinG ? `Protein: ${t.proteinG}g` : ""}
${t.workoutsPerWeek ? `Workouts/week: ${t.workoutsPerWeek}` : ""}
${t.stepsPerDay ? `Steps/day: ${t.stepsPerDay}` : ""}
${t.sleepHours ? `Sleep target: ${t.sleepHours}h` : ""}`.trim());
  }

  if (ctx.recentNutrition.length > 0) {
    sections.push(`NUTRITION LOGS (last 14 days, ${ctx.recentNutrition.length} entries):\n${
      ctx.recentNutrition.slice(0, 10).map(n =>
        `${n.date}: ${n.calories ? n.calories + " cal" : ""}${n.protein ? ", " + n.protein + "g protein" : ""}${n.comment ? " - " + n.comment : ""}`
      ).join("\n")
    }`);
  }

  if (ctx.recentWorkouts.length > 0) {
    sections.push(`WORKOUT LOGS (last 14 days, ${ctx.recentWorkouts.length} entries):\n${
      ctx.recentWorkouts.slice(0, 10).map(w =>
        `${w.date}: ${w.type || "workout"}${w.duration ? ", " + w.duration + " min" : ""}${w.intensity ? ", " + w.intensity + " intensity" : ""}${w.comment ? " - " + w.comment : ""}`
      ).join("\n")
    }`);
  }

  if (ctx.recentCheckins.length > 0) {
    sections.push(`CHECK-INS (last 14 days, ${ctx.recentCheckins.length} entries):\n${
      ctx.recentCheckins.slice(0, 10).map(c =>
        `${c.date}: ${c.weight ? "Weight: " + c.weight : ""}${c.mood ? ", Mood: " + c.mood + "/10" : ""}${c.energy ? ", Energy: " + c.energy + "/10" : ""}${c.sleepHours ? ", Sleep: " + c.sleepHours + "h" : ""}${c.comment ? " - " + c.comment : ""}`
      ).join("\n")
    }`);
  }

  if (ctx.recentSmartLogs.length > 0) {
    sections.push(`AI TRACKER ENTRIES (last 14 days, ${ctx.recentSmartLogs.length} entries):\n${
      ctx.recentSmartLogs.slice(0, 10).map(s => {
        let parsed = "";
        if (s.parsed) {
          if (s.parsed.nutrition) parsed += ` [Nutrition: ${s.parsed.nutrition.calories || s.parsed.nutrition.calories_est || "?"} cal]`;
          if (s.parsed.workout) parsed += ` [Workout: ${s.parsed.workout.type}, ${s.parsed.workout.duration_min || "?"}min, ${s.parsed.workout.intensity}]`;
          if (s.parsed.sleep) parsed += ` [Sleep: ${s.parsed.sleep.hours}h${s.parsed.sleep.quality ? ", " + s.parsed.sleep.quality : ""}]`;
          if (s.parsed.mood) parsed += ` [Mood: ${s.parsed.mood.rating}/10]`;
          if (s.parsed.weight) parsed += ` [Weight: ${s.parsed.weight.value}${s.parsed.weight.unit}]`;
        }
        return `${s.date}: "${(s.rawText || "").substring(0, 100)}"${parsed}`;
      }).join("\n")
    }`);
  }

  if (ctx.recentMessages.length > 0) {
    sections.push(`RECENT CHAT (last 14 days, ${ctx.recentMessages.length} messages):\n${
      ctx.recentMessages.slice(0, 15).map(m =>
        `${m.date} [${m.sender}]: ${m.content}`
      ).join("\n")
    }`);
  }

  sections.push(`WEEKLY PLAN ADHERENCE:
Total scheduled items this week: ${ctx.weeklyPlanAdherence.totalItems}
Completed: ${ctx.weeklyPlanAdherence.completedItems}
Completion rate: ${ctx.weeklyPlanAdherence.completionRate}%`);

  sections.push(`ACTIVITY SUMMARY:
Days since last meal log: ${ctx.activityAnalysis.daysSinceMeal}
Days since last workout: ${ctx.activityAnalysis.daysSinceWorkout}
Days since last check-in: ${ctx.activityAnalysis.daysSinceCheckIn}
Days since last message: ${ctx.activityAnalysis.daysSinceMessage}
Days since any activity: ${ctx.activityAnalysis.daysSinceAnyActivity}`);

  return sections.join("\n\n");
}

interface AIInsightResult {
  type: TriggerType;
  severity: TriggerSeverity;
  reason: string;
  recommendedAction: string;
}

async function generateAIInsights(ctx: ComprehensiveClientContext): Promise<AIInsightResult[]> {
  if (!process.env.OPENAI_API_KEY) {
    logger.debug("OpenAI API key not configured, skipping AI-powered insights");
    return [];
  }

  if (!hasEnoughDataForAI(ctx)) {
    return [];
  }

  const contextSummary = buildContextSummaryForAI(ctx);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 1500,
      messages: [
        {
          role: "system",
          content: `You are an AI assistant for a fitness and wellness coaching platform. You analyze comprehensive client data to generate actionable insights for the coach. You act as a "shadow coach" — always monitoring the full picture.

Your job is to detect patterns, concerns, and opportunities that the coach should know about. Focus on:
1. Nutrition patterns (are they hitting targets? declining? skipping meals?)
2. Workout consistency and intensity trends
3. Sleep and recovery patterns
4. Mood and energy correlations
5. Plan adherence and engagement
6. Chat sentiment (is the client struggling, motivated, confused?)
7. Goal progress trajectory

IMPORTANT RULES:
- Only flag ACTIONABLE insights, not obvious facts
- Minimum 3 data points needed for any trend analysis
- Don't flag something as concerning if there's insufficient data
- Be specific in your recommendations — tell the coach what to do
- Consider the client's goals when evaluating their data
- If plan targets exist, compare actual vs target values

Return a JSON object with an "insights" array. Each insight must have:
- type: one of "inactivity", "missed_workout", "nutrition_concern", "sleep_issue", "declining_metrics", "goal_at_risk", "engagement_drop"
- severity: "low", "medium", or "high"
- reason: A concise explanation for the coach (1-2 sentences, mention the client by first name)
- recommendedAction: A specific action the coach should take (1-2 sentences)

Return {"insights": []} if there are no significant findings. Maximum 3 insights per client.`,
        },
        {
          role: "user",
          content: contextSummary,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return [];

    const parsed = JSON.parse(content);
    const insights = Array.isArray(parsed.insights) ? parsed.insights : [];

    if (!Array.isArray(insights)) return [];

    const validTypes: TriggerType[] = ["inactivity", "missed_workout", "nutrition_concern", "sleep_issue", "declining_metrics", "goal_at_risk", "engagement_drop"];
    const validSeverities: TriggerSeverity[] = ["low", "medium", "high"];

    return insights
      .filter(i => validTypes.includes(i.type) && validSeverities.includes(i.severity) && i.reason && i.recommendedAction)
      .slice(0, 3);
  } catch (error: any) {
    logger.error("GPT-4 insight generation failed", { clientName: ctx.client.name, error: error?.message });
    return [];
  }
}

interface InsightMessageData {
  templateKey: string;
  params: { name: string; days: number };
}

function createInsightMessage(templateKey: string, clientName: string, days: number): string {
  const data: InsightMessageData = {
    templateKey,
    params: { name: clientName, days }
  };
  return JSON.stringify(data);
}

function detectRuleBasedTriggers(analysis: ActivityAnalysis, clientName: string): AIInsightResult[] {
  const triggers: AIInsightResult[] = [];

  if (analysis.daysSinceAnyActivity >= 5) {
    triggers.push({
      type: "inactivity",
      severity: "high",
      reason: createInsightMessage("inactivityHighReason", clientName, analysis.daysSinceAnyActivity),
      recommendedAction: createInsightMessage("inactivityHighAction", clientName, analysis.daysSinceAnyActivity),
    });
  } else if (analysis.daysSinceAnyActivity >= 3) {
    triggers.push({
      type: "inactivity",
      severity: "medium",
      reason: createInsightMessage("inactivityMediumReason", clientName, analysis.daysSinceAnyActivity),
      recommendedAction: createInsightMessage("inactivityMediumAction", clientName, analysis.daysSinceAnyActivity),
    });
  }

  if (analysis.daysSinceMeal >= 3 && analysis.hasNutritionGoals) {
    const alreadyHasInactivity = triggers.some(t => t.type === "inactivity");
    if (!alreadyHasInactivity) {
      triggers.push({
        type: "nutrition_concern",
        severity: analysis.daysSinceMeal >= 5 ? "high" : "medium",
        reason: createInsightMessage("nutritionConcernReason", clientName, analysis.daysSinceMeal),
        recommendedAction: createInsightMessage("nutritionConcernAction", clientName, analysis.daysSinceMeal),
      });
    }
  }

  if (analysis.daysSinceWorkout >= 4 && analysis.hasWorkoutGoals) {
    const alreadyHasInactivity = triggers.some(t => t.type === "inactivity");
    if (!alreadyHasInactivity) {
      triggers.push({
        type: "missed_workout",
        severity: analysis.daysSinceWorkout >= 7 ? "high" : "medium",
        reason: createInsightMessage("missedWorkoutReason", clientName, analysis.daysSinceWorkout),
        recommendedAction: createInsightMessage("missedWorkoutAction", clientName, analysis.daysSinceWorkout),
      });
    }
  }

  return triggers;
}

const SEVERITY_ORDER: Record<TriggerSeverity, number> = { low: 1, medium: 2, high: 3 };

export async function detectInsightsForClient(client: Client): Promise<{ created: number; resolved: number; escalated: number }> {
  if (!client.coachId) {
    return { created: 0, resolved: 0, escalated: 0 };
  }

  try {
    const ctx = await buildComprehensiveContext(client);
    const analysis = ctx.activityAnalysis;

    const existingTriggers = await storage.getEngagementTriggers(client.id, client.coachId);
    const unresolvedTriggers = existingTriggers.filter(t => !t.isResolved);

    let resolved = 0;
    for (const trigger of unresolvedTriggers) {
      let shouldResolve = false;

      if (trigger.type === "inactivity" && analysis.daysSinceAnyActivity < 2) {
        shouldResolve = true;
      }
      if (trigger.type === "nutrition_concern" && analysis.daysSinceMeal < 2) {
        shouldResolve = true;
      }
      if (trigger.type === "missed_workout" && analysis.daysSinceWorkout < 3) {
        shouldResolve = true;
      }
      if (trigger.type === "sleep_issue" && analysis.daysSinceCheckIn < 2) {
        shouldResolve = true;
      }
      if (trigger.type === "engagement_drop" && analysis.daysSinceAnyActivity < 2) {
        shouldResolve = true;
      }

      if (shouldResolve) {
        await storage.resolveEngagementTrigger(trigger.id);
        resolved++;
        logger.debug("Auto-resolved trigger due to recent activity", {
          clientId: client.id,
          triggerId: trigger.id,
          type: trigger.type,
        });
      }
    }

    const stillUnresolved = unresolvedTriggers.filter(t => {
      if (t.type === "inactivity" && analysis.daysSinceAnyActivity < 2) return false;
      if (t.type === "nutrition_concern" && analysis.daysSinceMeal < 2) return false;
      if (t.type === "missed_workout" && analysis.daysSinceWorkout < 3) return false;
      if (t.type === "sleep_issue" && analysis.daysSinceCheckIn < 2) return false;
      if (t.type === "engagement_drop" && analysis.daysSinceAnyActivity < 2) return false;
      return true;
    });

    const unresolvedByType = new Map<TriggerType, typeof stillUnresolved[0]>();
    for (const t of stillUnresolved) {
      unresolvedByType.set(t.type as TriggerType, t);
    }

    const ruleBasedTriggers = detectRuleBasedTriggers(analysis, client.name);
    const aiTriggers = await generateAIInsights(ctx);

    const triggerTypesSeen = new Set<string>();
    const allDetected: AIInsightResult[] = [];

    for (const t of ruleBasedTriggers) {
      if (!triggerTypesSeen.has(t.type)) {
        triggerTypesSeen.add(t.type);
        allDetected.push(t);
      }
    }
    for (const t of aiTriggers) {
      if (!triggerTypesSeen.has(t.type)) {
        triggerTypesSeen.add(t.type);
        allDetected.push(t);
      }
    }

    let created = 0;
    let escalated = 0;
    const now = new Date().toISOString();

    for (const detected of allDetected) {
      const existing = unresolvedByType.get(detected.type);

      if (!existing) {
        const triggerData: InsertEngagementTrigger = {
          clientId: client.id,
          coachId: client.coachId,
          type: detected.type,
          severity: detected.severity,
          reason: detected.reason,
          recommendedAction: detected.recommendedAction,
          isResolved: false,
          detectedAt: now,
          createdAt: now,
        };

        await storage.createEngagementTrigger(triggerData);
        created++;

        logger.info("AI insight detected", {
          clientId: client.id,
          clientName: client.name,
          type: detected.type,
          severity: detected.severity,
        });
      } else {
        const severityChanged = SEVERITY_ORDER[detected.severity] > SEVERITY_ORDER[existing.severity as TriggerSeverity];
        const reasonChanged = existing.reason !== detected.reason;

        if (severityChanged || reasonChanged) {
          await storage.updateEngagementTrigger(existing.id, {
            severity: detected.severity,
            reason: detected.reason,
            recommendedAction: detected.recommendedAction,
          });

          if (severityChanged) {
            escalated++;
            logger.info("AI insight escalated", {
              clientId: client.id,
              clientName: client.name,
              type: detected.type,
              fromSeverity: existing.severity,
              toSeverity: detected.severity,
            });
          }
        }
      }
    }

    return { created, resolved, escalated };
  } catch (error: any) {
    logger.error("Error detecting insights for client", {
      clientId: client.id,
      message: error?.message || String(error),
    });
    return { created: 0, resolved: 0, escalated: 0 };
  }
}

export async function processAllClientInsights(): Promise<{
  processedClients: number;
  createdTriggers: number;
  resolvedTriggers: number;
  escalatedTriggers: number;
}> {
  logger.info("Starting AI insight detection cycle");

  let processedClients = 0;
  let createdTriggers = 0;
  let resolvedTriggers = 0;
  let escalatedTriggers = 0;

  try {
    const clients = await storage.getClients();
    const activeClients = clients.filter((c: Client) => c.status === "active" && c.coachId);

    logger.info("Processing clients for AI insights", { count: activeClients.length });

    for (const client of activeClients) {
      const result = await detectInsightsForClient(client);
      createdTriggers += result.created;
      resolvedTriggers += result.resolved;
      escalatedTriggers += result.escalated;
      processedClients++;
    }

    logger.info("AI insight detection cycle complete", {
      processedClients,
      createdTriggers,
      resolvedTriggers,
      escalatedTriggers,
    });
  } catch (error: any) {
    logger.error("Error in AI insight detection cycle", {
      message: error?.message || String(error),
      stack: error?.stack,
    });
  }

  return { processedClients, createdTriggers, resolvedTriggers, escalatedTriggers };
}

let insightInterval: ReturnType<typeof setInterval> | null = null;

export function startAIInsightScheduler(intervalMs: number = 6 * 60 * 60 * 1000): void {
  if (insightInterval) {
    logger.warn("AI insight scheduler already running");
    return;
  }

  logger.info("Starting AI insight scheduler", { intervalMs });

  insightInterval = setInterval(async () => {
    await processAllClientInsights();
  }, intervalMs);

  setTimeout(async () => {
    await processAllClientInsights();
  }, 10000);
}

export function stopAIInsightScheduler(): void {
  if (insightInterval) {
    clearInterval(insightInterval);
    insightInterval = null;
    logger.info("AI insight scheduler stopped");
  }
}
