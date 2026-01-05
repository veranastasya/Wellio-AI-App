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
  
  const clientCreatedDate = client.createdAt ? new Date(client.createdAt) : now;
  const daysSinceClientCreated = Math.max(0, Math.floor((now.getTime() - clientCreatedDate.getTime()) / (1000 * 60 * 60 * 24)));
  
  const getLastDate = (logs: typeof progressEvents): Date | null => {
    if (logs.length === 0) return null;
    const sortedLogs = [...logs].sort((a, b) => {
      const dateA = a.dateForMetric || a.createdAt || "";
      const dateB = b.dateForMetric || b.createdAt || "";
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
    const lastLog = sortedLogs[0];
    const dateStr = lastLog.dateForMetric || lastLog.createdAt;
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  };
  
  const lastMealDate = getLastDate(mealLogs);
  const lastWorkoutDate = getLastDate(workoutLogs);
  const lastCheckInDate = getLastDate(checkInLogs);
  
  const daysSince = (date: Date | null, fallbackToClientCreated: boolean = true): number => {
    if (!date) {
      return fallbackToClientCreated ? daysSinceClientCreated : 999;
    }
    const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
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

// Store insight messages as JSON with template key and parameters for i18n
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

function detectTriggersFromAnalysis(analysis: ActivityAnalysis, clientName: string): DetectedTrigger[] {
  const triggers: DetectedTrigger[] = [];
  
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
    const analysis = await analyzeClientActivity(client);
    
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
      return true;
    });
    
    const unresolvedByType = new Map<TriggerType, typeof stillUnresolved[0]>();
    for (const t of stillUnresolved) {
      unresolvedByType.set(t.type, t);
    }
    
    const detectedTriggers = detectTriggersFromAnalysis(analysis, client.name);
    
    let created = 0;
    let escalated = 0;
    const now = new Date().toISOString();
    
    for (const detected of detectedTriggers) {
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
        // Always update existing triggers to keep day counts accurate
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
          } else {
            logger.debug("AI insight updated", {
              clientId: client.id,
              clientName: client.name,
              type: detected.type,
              reason: detected.reason,
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
