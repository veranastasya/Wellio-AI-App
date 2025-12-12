import { db } from "./db";
import { clients, goals, progressEvents } from "@shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

// Weight configuration for composite score
const WEIGHTS = {
  longTermGoals: 0.5,   // 50% - Long-term goal progress
  weeklyTasks: 0.3,     // 30% - Weekly task completion
  activity: 0.2,        // 20% - Activity consistency
};

// Activity targets per week (used for activity consistency score)
const WEEKLY_ACTIVITY_TARGETS = {
  workouts: 3,
  nutrition_logs: 5,
  checkins: 1,
  weight_logs: 1,
};

function getWeekStartDate(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0];
}

function getWeekEndDate(): string {
  const weekStart = new Date(getWeekStartDate());
  weekStart.setDate(weekStart.getDate() + 6);
  return weekStart.toISOString().split("T")[0];
}

interface ProgressBreakdown {
  goalProgress: number;
  weeklyProgress: number;
  activityProgress: number;
  compositeScore: number;
}

export async function calculateClientProgress(clientId: string): Promise<ProgressBreakdown> {
  const weekStart = getWeekStartDate();
  const weekEnd = getWeekEndDate();

  // 1. Calculate Long-Term Goal Progress (50%)
  const longTermGoals = await db
    .select()
    .from(goals)
    .where(
      and(
        eq(goals.clientId, clientId),
        eq(goals.status, "active"),
        eq(goals.scope, "long_term")
      )
    );

  let goalProgress = 0;
  if (longTermGoals.length > 0) {
    const goalProgressSum = longTermGoals.reduce((sum, goal) => {
      const baseline = goal.baselineValue ?? 0;
      const target = goal.targetValue;
      const current = goal.currentValue;

      // Handle different goal directions
      const totalChange = Math.abs(target - baseline);
      if (totalChange === 0) return sum + 100; // Already at target

      const actualChange = Math.abs(current - baseline);
      
      // Check if moving in correct direction
      const correctDirection = 
        (target > baseline && current >= baseline) || 
        (target < baseline && current <= baseline);

      if (!correctDirection) return sum; // No progress if wrong direction

      const progress = Math.min(100, (actualChange / totalChange) * 100);
      return sum + progress;
    }, 0);

    goalProgress = Math.round(goalProgressSum / longTermGoals.length);
  }

  // 2. Calculate Weekly Task Progress (30%)
  const weeklyTasks = await db
    .select()
    .from(goals)
    .where(
      and(
        eq(goals.clientId, clientId),
        eq(goals.scope, "weekly_task"),
        gte(goals.weekStartDate, weekStart),
        lte(goals.weekStartDate, weekEnd)
      )
    );

  let weeklyProgress = 0;
  if (weeklyTasks.length > 0) {
    const completedTasks = weeklyTasks.filter(
      (task) => task.status === "completed" || task.currentValue >= task.targetValue
    );
    weeklyProgress = Math.round((completedTasks.length / weeklyTasks.length) * 100);
  }

  // 3. Calculate Activity Consistency (20%)
  const weeklyEvents = await db
    .select()
    .from(progressEvents)
    .where(
      and(
        eq(progressEvents.clientId, clientId),
        gte(progressEvents.dateForMetric, weekStart),
        lte(progressEvents.dateForMetric, weekEnd)
      )
    );

  // Count events by type
  const eventCounts = {
    workouts: 0,
    nutrition_logs: 0,
    checkins: 0,
    weight_logs: 0,
  };

  weeklyEvents.forEach((event) => {
    switch (event.eventType) {
      case "workout":
        eventCounts.workouts++;
        break;
      case "nutrition":
        eventCounts.nutrition_logs++;
        break;
      case "checkin_mood":
        eventCounts.checkins++;
        break;
      case "weight":
        eventCounts.weight_logs++;
        break;
    }
  });

  // Calculate activity score (capped contributions per category)
  const workoutScore = Math.min(1, eventCounts.workouts / WEEKLY_ACTIVITY_TARGETS.workouts);
  const nutritionScore = Math.min(1, eventCounts.nutrition_logs / WEEKLY_ACTIVITY_TARGETS.nutrition_logs);
  const checkinScore = Math.min(1, eventCounts.checkins / WEEKLY_ACTIVITY_TARGETS.checkins);
  const weightScore = Math.min(1, eventCounts.weight_logs / WEEKLY_ACTIVITY_TARGETS.weight_logs);

  // Average across all activity types (equal weight)
  const activityProgress = Math.round(
    ((workoutScore + nutritionScore + checkinScore + weightScore) / 4) * 100
  );

  // 4. Calculate Composite Score
  const compositeScore = Math.round(
    goalProgress * WEIGHTS.longTermGoals +
    weeklyProgress * WEIGHTS.weeklyTasks +
    activityProgress * WEIGHTS.activity
  );

  return {
    goalProgress: Math.min(100, Math.max(0, goalProgress)),
    weeklyProgress: Math.min(100, Math.max(0, weeklyProgress)),
    activityProgress: Math.min(100, Math.max(0, activityProgress)),
    compositeScore: Math.min(100, Math.max(0, compositeScore)),
  };
}

export async function updateClientProgress(clientId: string): Promise<ProgressBreakdown> {
  const breakdown = await calculateClientProgress(clientId);

  await db
    .update(clients)
    .set({
      progressScore: breakdown.compositeScore,
      goalProgress: breakdown.goalProgress,
      weeklyProgress: breakdown.weeklyProgress,
      activityProgress: breakdown.activityProgress,
      progressUpdatedAt: new Date().toISOString(),
    })
    .where(eq(clients.id, clientId));

  return breakdown;
}

export async function updateAllClientsProgress(coachId?: string): Promise<void> {
  let clientList;
  
  if (coachId) {
    clientList = await db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.coachId, coachId));
  } else {
    clientList = await db.select({ id: clients.id }).from(clients);
  }

  for (const client of clientList) {
    await updateClientProgress(client.id);
  }
}
