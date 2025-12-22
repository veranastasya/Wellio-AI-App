import { storage } from "./storage";
import { logger } from "./logger";
import type { Client, TriggerType, TriggerSeverity, InsertEngagementTrigger } from "@shared/schema";

interface ActivityAnalysis {
  daysSinceMeal: number;
  daysSinceWorkout: number;
  daysSinceCheckIn: number;
  daysSinceAnyActivity: number;
  hasActiveGoals: boolean;
  hasWorkoutGoals: boolean;
  hasNutritionGoals: boolean;
}

function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

async function analyzeClientActivity(client: Client): Promise<ActivityAnalysis> {
  const progressEvents = await storage.getProgressEventsByClientId(client.id);
  const goals = await storage.getGoalsByClientId(client.id);
  
  const mealLogs = progressEvents.filter(e => e.eventType === "nutrition");
  const workoutLogs = progressEvents.filter(e => e.eventType === "workout");
  const checkInLogs = progressEvents.filter(e => 
    e.eventType === "checkin_mood" || e.eventType === "weight" || e.eventType === "sleep"
  );
  
  const now = new Date();
  
  const getLastDate = (logs: typeof progressEvents): Date | null => {
    if (logs.length === 0) return null;
    const sortedLogs = [...logs].sort((a, b) => 
      new Date(b.dateForMetric).getTime() - new Date(a.dateForMetric).getTime()
    );
    return new Date(sortedLogs[0].dateForMetric);
  };
  
  const lastMealDate = getLastDate(mealLogs);
  const lastWorkoutDate = getLastDate(workoutLogs);
  const lastCheckInDate = getLastDate(checkInLogs);
  
  const daysSince = (date: Date | null): number => {
    if (!date) return 999;
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  };
  
  const daysSinceMeal = daysSince(lastMealDate);
  const daysSinceWorkout = daysSince(lastWorkoutDate);
  const daysSinceCheckIn = daysSince(lastCheckInDate);
  const daysSinceAnyActivity = Math.min(daysSinceMeal, daysSinceWorkout, daysSinceCheckIn);
  
  const activeGoals = goals.filter(g => g.status === "active");
  const hasActiveGoals = activeGoals.length > 0;
  
  const workoutGoalTypes = ["workout", "fitness", "improve_fitness_endurance", "gain_muscle_strength"];
  const nutritionGoalTypes = ["nutrition", "eat_healthier", "calories", "lose_weight", "maintain_weight"];
  
  const hasWorkoutGoals = activeGoals.some(g => workoutGoalTypes.includes(g.goalType));
  const hasNutritionGoals = activeGoals.some(g => nutritionGoalTypes.includes(g.goalType));
  
  return {
    daysSinceMeal,
    daysSinceWorkout,
    daysSinceCheckIn,
    daysSinceAnyActivity,
    hasActiveGoals,
    hasWorkoutGoals,
    hasNutritionGoals,
  };
}

interface DetectedTrigger {
  type: TriggerType;
  severity: TriggerSeverity;
  reason: string;
  recommendedAction: string;
}

function detectTriggersFromAnalysis(analysis: ActivityAnalysis, clientName: string): DetectedTrigger[] {
  const triggers: DetectedTrigger[] = [];
  
  if (analysis.daysSinceAnyActivity >= 5 && analysis.daysSinceAnyActivity < 999) {
    triggers.push({
      type: "inactivity",
      severity: "high",
      reason: `${clientName} hasn't logged any activity in ${analysis.daysSinceAnyActivity} days. This may indicate disengagement or personal challenges.`,
      recommendedAction: "Send a supportive check-in message to understand what's going on and offer assistance.",
    });
  } else if (analysis.daysSinceAnyActivity >= 3 && analysis.daysSinceAnyActivity < 999) {
    triggers.push({
      type: "inactivity",
      severity: "medium",
      reason: `${clientName} hasn't logged any activity in ${analysis.daysSinceAnyActivity} days.`,
      recommendedAction: "Send a friendly reminder to check in and log their progress.",
    });
  }
  
  if (analysis.daysSinceMeal >= 3 && analysis.daysSinceMeal < 999 && analysis.hasNutritionGoals) {
    const alreadyHasInactivity = triggers.some(t => t.type === "inactivity");
    if (!alreadyHasInactivity) {
      triggers.push({
        type: "nutrition_concern",
        severity: analysis.daysSinceMeal >= 5 ? "high" : "medium",
        reason: `${clientName} hasn't logged any meals in ${analysis.daysSinceMeal} days despite having nutrition goals.`,
        recommendedAction: "Check if they're having trouble tracking meals or need meal planning support.",
      });
    }
  }
  
  if (analysis.daysSinceWorkout >= 4 && analysis.daysSinceWorkout < 999 && analysis.hasWorkoutGoals) {
    const alreadyHasInactivity = triggers.some(t => t.type === "inactivity");
    if (!alreadyHasInactivity) {
      triggers.push({
        type: "missed_workout",
        severity: analysis.daysSinceWorkout >= 7 ? "high" : "medium",
        reason: `${clientName} hasn't logged a workout in ${analysis.daysSinceWorkout} days despite having fitness goals.`,
        recommendedAction: "Discuss potential barriers and consider adjusting their workout plan.",
      });
    }
  }
  
  return triggers;
}

async function hasExistingUnresolvedTrigger(clientId: string, coachId: string, type: TriggerType): Promise<boolean> {
  const triggers = await storage.getEngagementTriggers(clientId, coachId);
  return triggers.some(t => t.type === type && !t.isResolved);
}

async function autoResolveStaleTriggersForClient(client: Client, analysis: ActivityAnalysis): Promise<number> {
  if (!client.coachId) return 0;
  
  const triggers = await storage.getEngagementTriggers(client.id, client.coachId);
  const unresolvedTriggers = triggers.filter(t => !t.isResolved);
  
  let resolvedCount = 0;
  
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
    
    if (shouldResolve) {
      await storage.resolveEngagementTrigger(trigger.id);
      resolvedCount++;
      logger.debug("Auto-resolved trigger due to recent activity", {
        clientId: client.id,
        triggerId: trigger.id,
        type: trigger.type,
      });
    }
  }
  
  return resolvedCount;
}

export async function detectInsightsForClient(client: Client): Promise<{ created: number; resolved: number }> {
  if (!client.coachId) {
    return { created: 0, resolved: 0 };
  }
  
  try {
    const analysis = await analyzeClientActivity(client);
    
    const resolved = await autoResolveStaleTriggersForClient(client, analysis);
    
    const detectedTriggers = detectTriggersFromAnalysis(analysis, client.name);
    
    let created = 0;
    const now = new Date().toISOString();
    
    for (const detected of detectedTriggers) {
      const hasExisting = await hasExistingUnresolvedTrigger(client.id, client.coachId, detected.type);
      
      if (!hasExisting) {
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
      }
    }
    
    return { created, resolved };
  } catch (error: any) {
    logger.error("Error detecting insights for client", {
      clientId: client.id,
      message: error?.message || String(error),
    });
    return { created: 0, resolved: 0 };
  }
}

export async function processAllClientInsights(): Promise<{ 
  processedClients: number; 
  createdTriggers: number; 
  resolvedTriggers: number;
}> {
  logger.info("Starting AI insight detection cycle");
  
  let processedClients = 0;
  let createdTriggers = 0;
  let resolvedTriggers = 0;
  
  try {
    const clients = await storage.getClients();
    const activeClients = clients.filter((c: Client) => c.status === "active" && c.coachId);
    
    logger.info("Processing clients for AI insights", { count: activeClients.length });
    
    for (const client of activeClients) {
      const result = await detectInsightsForClient(client);
      createdTriggers += result.created;
      resolvedTriggers += result.resolved;
      processedClients++;
    }
    
    logger.info("AI insight detection cycle complete", {
      processedClients,
      createdTriggers,
      resolvedTriggers,
    });
  } catch (error: any) {
    logger.error("Error in AI insight detection cycle", {
      message: error?.message || String(error),
      stack: error?.stack,
    });
  }
  
  return { processedClients, createdTriggers, resolvedTriggers };
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
