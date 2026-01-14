import OpenAI from "openai";
import type { NutritionLog, WorkoutLog, CheckIn, Goal, ProgressEvent } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface TrendAnalysis {
  category: "nutrition" | "activity" | "consistency" | "progress" | "weight" | "sleep" | "mood" | "steps";
  trend: "improving" | "declining" | "stable" | "plateau";
  confidence: number;
  description: string;
  recommendation?: string;
  dataPoints?: number;
  recentValue?: number;
  previousValue?: number;
  changePercent?: number;
}

export interface GoalPrediction {
  goalId: string;
  goalTitle: string;
  goalType: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  deadline: string;
  progressPercent: number;
  estimatedCompletionDate: string | null;
  daysToCompletion: number | null;
  successProbability: number;
  onTrack: boolean;
  trend: "ahead" | "on_track" | "behind" | "at_risk";
  recommendation: string;
}

export interface EnhancedClientInsight {
  id: string;
  clientId: string;
  clientName: string;
  trends: TrendAnalysis[];
  goalPredictions: GoalPrediction[];
  summary: string;
  quickStats: {
    totalDataPoints: number;
    trackingConsistency: number;
    overallTrend: "improving" | "stable" | "declining";
    topStrength: string | null;
    topOpportunity: string | null;
  };
  generatedAt: string;
}

export interface ClientInsight {
  id: string;
  clientId: string;
  clientName: string;
  insights: TrendAnalysis[];
  summary: string;
  generatedAt: string;
}

export async function analyzeClientData(
  clientId: string,
  clientName: string,
  nutritionLogs: NutritionLog[],
  workoutLogs: WorkoutLog[],
  checkIns: CheckIn[],
  goals?: Goal[],
  preferredLanguage: "en" | "ru" | "es" = "en"
): Promise<ClientInsight> {
  const trends: TrendAnalysis[] = [];

  // Analyze nutrition trends
  if (nutritionLogs.length >= 2) {
    const nutritionTrend = analyzeNutritionTrend(nutritionLogs);
    if (nutritionTrend) trends.push(nutritionTrend);
  }

  // Analyze workout consistency
  if (workoutLogs.length >= 2) {
    const workoutTrend = analyzeWorkoutTrend(workoutLogs);
    if (workoutTrend) trends.push(workoutTrend);
  }

  // Analyze body composition progress
  if (checkIns.length >= 2) {
    const progressTrend = analyzeProgressTrend(checkIns);
    if (progressTrend) trends.push(progressTrend);
  }

  // Generate AI summary using OpenAI (including goals)
  const summary = await generateAISummary(clientName, trends, nutritionLogs, workoutLogs, checkIns, goals, preferredLanguage);

  return {
    id: `insight_${clientId}_${Date.now()}`,
    clientId,
    clientName,
    insights: trends,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

function analyzeNutritionTrend(logs: NutritionLog[]): TrendAnalysis | null {
  if (logs.length < 2) return null;

  const sortedLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const recent = sortedLogs.slice(-7); // Last 7 entries
  const earlier = sortedLogs.slice(0, Math.min(7, sortedLogs.length - 7));

  if (earlier.length === 0) {
    return {
      category: "nutrition",
      trend: "stable",
      confidence: 0.5,
      description: "Not enough data to determine nutrition trends yet",
    };
  }

  const recentAvgProtein = recent.reduce((sum, log) => sum + (log.protein || 0), 0) / recent.length;
  const earlierAvgProtein = earlier.reduce((sum, log) => sum + (log.protein || 0), 0) / earlier.length;
  
  const recentAvgCalories = recent.reduce((sum, log) => sum + (log.calories || 0), 0) / recent.length;
  const earlierAvgCalories = earlier.reduce((sum, log) => sum + (log.calories || 0), 0) / earlier.length;

  // Guard against division by zero
  if (earlierAvgProtein <= 0 && earlierAvgCalories <= 0) {
    return {
      category: "nutrition",
      trend: "stable",
      confidence: 0.3,
      description: "Insufficient historical nutrition data to detect trends",
    };
  }

  let trend: TrendAnalysis["trend"] = "stable";
  let description = "";
  let recommendation = "";

  // Calculate protein change only if we have valid baseline
  const proteinChange = earlierAvgProtein > 0 
    ? ((recentAvgProtein - earlierAvgProtein) / earlierAvgProtein) * 100 
    : 0;

  // Calculate calorie change only if we have valid baseline
  const calorieChange = earlierAvgCalories > 0 
    ? ((recentAvgCalories - earlierAvgCalories) / earlierAvgCalories) * 100 
    : 0;

  if (earlierAvgProtein > 0 && Math.abs(proteinChange) > 10) {
    trend = proteinChange > 0 ? "improving" : "declining";
    description = `Protein intake ${proteinChange > 0 ? "increased" : "decreased"} by ${Math.abs(proteinChange).toFixed(1)}% over recent period`;
    if (proteinChange < -10) {
      recommendation = "Consider increasing protein intake to support muscle recovery and growth";
    }
  } else if (earlierAvgCalories > 0 && Math.abs(calorieChange) > 15) {
    trend = "stable";
    description = `Calorie intake ${calorieChange > 0 ? "increased" : "decreased"} by ${Math.abs(calorieChange).toFixed(1)}%`;
    recommendation = "Monitor energy levels and adjust calories based on training intensity";
  } else {
    description = "Nutrition intake is consistent and stable";
  }

  return {
    category: "nutrition",
    trend,
    confidence: 0.8,
    description,
    recommendation,
  };
}

function analyzeWorkoutTrend(logs: WorkoutLog[]): TrendAnalysis | null {
  if (logs.length < 2) return null;

  const sortedLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const recentWeek = sortedLogs.filter(log => {
    const daysDiff = (Date.now() - new Date(log.date).getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
  });

  const avgDuration = recentWeek.reduce((sum, log) => sum + (log.duration || 0), 0) / recentWeek.length;
  const workoutsPerWeek = recentWeek.length;

  let trend: TrendAnalysis["trend"] = "stable";
  let description = "";
  let recommendation = "";

  if (workoutsPerWeek >= 4) {
    trend = "improving";
    description = `Excellent consistency: ${workoutsPerWeek} workouts in the past week (avg ${avgDuration.toFixed(0)} min)`;
  } else if (workoutsPerWeek >= 2) {
    trend = "stable";
    description = `Good consistency: ${workoutsPerWeek} workouts in the past week`;
    recommendation = "Try to add one more session per week to accelerate progress";
  } else {
    trend = "declining";
    description = `Low activity: only ${workoutsPerWeek} workout(s) in the past week`;
    recommendation = "Aim for at least 3 workouts per week to maintain momentum";
  }

  return {
    category: "activity",
    trend,
    confidence: 0.9,
    description,
    recommendation,
  };
}

function analyzeProgressTrend(checkIns: CheckIn[]): TrendAnalysis | null {
  if (checkIns.length < 2) return null;

  const sortedCheckIns = [...checkIns].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const latest = sortedCheckIns[sortedCheckIns.length - 1];
  const previous = sortedCheckIns[sortedCheckIns.length - 2];

  const weightChange = (latest.weight || 0) - (previous.weight || 0);
  const bodyFatChange = (latest.bodyFat || 0) - (previous.bodyFat || 0);

  let trend: TrendAnalysis["trend"] = "stable";
  let description = "";
  let recommendation = "";

  if (Math.abs(weightChange) < 1 && Math.abs(bodyFatChange) < 1) {
    trend = "plateau";
    description = "Body metrics have plateaued with minimal change";
    recommendation = "Consider adjusting training intensity or nutrition to break through the plateau";
  } else if (bodyFatChange < -1) {
    trend = "improving";
    description = `Body fat decreased by ${Math.abs(bodyFatChange).toFixed(1)}% - excellent progress!`;
  } else if (weightChange > 2 && bodyFatChange < 0.5) {
    trend = "improving";
    description = "Gaining lean mass while maintaining body composition";
  } else {
    trend = "stable";
    description = `Weight ${weightChange > 0 ? "increased" : "decreased"} by ${Math.abs(weightChange).toFixed(1)} lbs`;
  }

  return {
    category: "progress",
    trend,
    confidence: 0.85,
    description,
    recommendation,
  };
}

const LANGUAGE_INSTRUCTIONS = {
  en: "Respond in English.",
  ru: "Respond in Russian (Русский).",
  es: "Respond in Spanish (Español).",
};

async function generateAISummary(
  clientName: string,
  trends: TrendAnalysis[],
  nutritionLogs: NutritionLog[],
  workoutLogs: WorkoutLog[],
  checkIns: CheckIn[],
  goals?: Goal[],
  preferredLanguage: "en" | "ru" | "es" = "en"
): Promise<string> {
  try {
    // Count synced vs manual entries (both apple_health and rook)
    const syncedNutrition = nutritionLogs.filter(log => 
      log.dataSource === "apple_health" || log.dataSource === "rook"
    ).length;
    const syncedWorkouts = workoutLogs.filter(log => 
      log.dataSource === "apple_health" || log.dataSource === "rook"
    ).length;
    const syncedCheckIns = checkIns.filter(log => 
      log.dataSource === "apple_health" || log.dataSource === "rook"
    ).length;
    const totalSynced = syncedNutrition + syncedWorkouts + syncedCheckIns;
    
    // Analyze goals progress
    const activeGoals = goals?.filter(g => g.status === "active") || [];
    const goalsContext = activeGoals.length > 0 
      ? `\n\nActive Goals:\n${activeGoals.map(g => {
          const progress = g.targetValue > 0 ? Math.round((g.currentValue / g.targetValue) * 100) : 0;
          const daysLeft = Math.ceil((new Date(g.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          return `- ${g.title}: ${progress}% complete (${g.currentValue}/${g.targetValue} ${g.unit}) - ${daysLeft > 0 ? `${daysLeft} days remaining` : 'deadline passed'}`;
        }).join('\n')}`
      : "";
    
    const context = `
Client: ${clientName}
Data Summary:
- ${nutritionLogs.length} nutrition logs (${syncedNutrition} auto-synced from wearables)
- ${workoutLogs.length} workout sessions (${syncedWorkouts} auto-synced from wearables)
- ${checkIns.length} check-ins (${syncedCheckIns} auto-synced from wearables)
- Data collection: ${totalSynced > 0 ? "Automated tracking enabled via wearable integration" : "Manual tracking only"}${goalsContext}

Detected Trends:
${trends.map(t => `- ${t.category}: ${t.trend} - ${t.description}`).join('\n')}

Recommendations:
${trends.filter(t => t.recommendation).map(t => `- ${t.recommendation}`).join('\n')}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a professional fitness coach AI assistant. Provide concise, actionable insights based on client data. Keep summaries under 100 words and focus on the most important trends and next steps. When wearable data is present, acknowledge the benefit of automated tracking for data accuracy. When goals are present, reference them in your summary and recommendations. ${LANGUAGE_INSTRUCTIONS[preferredLanguage]}`,
        },
        {
          role: "user",
          content: `Based on this client data, provide a brief performance summary and top 1-2 recommendations. If goals are present, comment on their progress:\n\n${context}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    return completion.choices[0]?.message?.content || "Unable to generate summary at this time.";
  } catch (error) {
    console.error("OpenAI API error:", error);
    // Fallback to rule-based summary with data source acknowledgment
    const improving = trends.filter(t => t.trend === "improving").length;
    const declining = trends.filter(t => t.trend === "declining").length;
    
    // Count synced entries for fallback summary (both apple_health and rook)
    const syncedNutrition = nutritionLogs.filter(log => 
      log.dataSource === "apple_health" || log.dataSource === "rook"
    ).length;
    const syncedWorkouts = workoutLogs.filter(log => 
      log.dataSource === "apple_health" || log.dataSource === "rook"
    ).length;
    const syncedCheckIns = checkIns.filter(log => 
      log.dataSource === "apple_health" || log.dataSource === "rook"
    ).length;
    const totalSynced = syncedNutrition + syncedWorkouts + syncedCheckIns;
    
    const dataSourceNote = totalSynced > 0 
      ? ` Data includes ${totalSynced} auto-synced entries from wearables for improved tracking accuracy.` 
      : "";

    if (improving > declining) {
      return `${clientName} is making great progress across multiple areas. Continue current program with minor adjustments as needed.${dataSourceNote}`;
    } else if (declining > 0) {
      return `${clientName} shows some areas needing attention. Focus on consistency and review nutrition targets.${dataSourceNote}`;
    } else {
      return `${clientName} is maintaining steady progress. Consider adding new challenges to break through current plateau.${dataSourceNote}`;
    }
  }
}

export async function analyzeProgressEventsWithGoals(
  clientId: string,
  clientName: string,
  progressEvents: ProgressEvent[],
  goals: Goal[],
  preferredLanguage: "en" | "ru" | "es" = "en"
): Promise<EnhancedClientInsight> {
  const trends: TrendAnalysis[] = [];
  
  const weightEvents = progressEvents.filter(e => e.eventType === "weight");
  const nutritionEvents = progressEvents.filter(e => e.eventType === "nutrition");
  const workoutEvents = progressEvents.filter(e => e.eventType === "workout");
  const sleepEvents = progressEvents.filter(e => e.eventType === "sleep");
  const moodEvents = progressEvents.filter(e => e.eventType === "checkin_mood" || e.eventType === "mood");
  const stepsEvents = progressEvents.filter(e => e.eventType === "steps");

  if (weightEvents.length >= 2) {
    const weightTrend = analyzeWeightTrend(weightEvents);
    if (weightTrend) trends.push(weightTrend);
  }

  if (nutritionEvents.length >= 2) {
    const nutritionTrend = analyzeProgressNutritionTrend(nutritionEvents);
    if (nutritionTrend) trends.push(nutritionTrend);
  }

  if (workoutEvents.length >= 2) {
    const activityTrend = analyzeActivityTrend(workoutEvents);
    if (activityTrend) trends.push(activityTrend);
  }

  if (sleepEvents.length >= 2) {
    const sleepTrend = analyzeSleepTrend(sleepEvents);
    if (sleepTrend) trends.push(sleepTrend);
  }

  if (moodEvents.length >= 2) {
    const moodTrend = analyzeMoodTrend(moodEvents);
    if (moodTrend) trends.push(moodTrend);
  }

  if (stepsEvents.length >= 2) {
    const stepsTrend = analyzeStepsTrend(stepsEvents);
    if (stepsTrend) trends.push(stepsTrend);
  }

  const consistencyTrend = analyzeTrackingConsistency(progressEvents);
  if (consistencyTrend) trends.push(consistencyTrend);

  const goalPredictions = generateGoalPredictions(goals, progressEvents, trends);

  const summary = await generateEnhancedSummary(clientName, trends, goalPredictions, progressEvents, preferredLanguage);

  const improving = trends.filter(t => t.trend === "improving").length;
  const declining = trends.filter(t => t.trend === "declining").length;
  const overallTrend: "improving" | "stable" | "declining" = 
    improving > declining ? "improving" : declining > improving ? "declining" : "stable";

  const uniqueDays = new Set(progressEvents.map(e => e.dateForMetric)).size;
  const dayRange = progressEvents.length > 0 
    ? Math.max(1, Math.ceil((Date.now() - new Date(progressEvents[progressEvents.length - 1].createdAt).getTime()) / (1000 * 60 * 60 * 24)))
    : 1;
  const trackingConsistency = Math.min(100, Math.round((uniqueDays / Math.max(dayRange, 7)) * 100));

  const strengths = trends.filter(t => t.trend === "improving");
  const opportunities = trends.filter(t => t.trend === "declining" || t.trend === "plateau");

  return {
    id: `insight_${clientId}_${Date.now()}`,
    clientId,
    clientName,
    trends,
    goalPredictions,
    summary,
    quickStats: {
      totalDataPoints: progressEvents.length,
      trackingConsistency,
      overallTrend,
      topStrength: strengths.length > 0 ? strengths[0].category : null,
      topOpportunity: opportunities.length > 0 ? opportunities[0].category : null,
    },
    generatedAt: new Date().toISOString(),
  };
}

function analyzeWeightTrend(events: ProgressEvent[]): TrendAnalysis | null {
  if (events.length < 2) return null;

  const sorted = [...events].sort((a, b) => 
    new Date(a.dateForMetric).getTime() - new Date(b.dateForMetric).getTime()
  );

  const recent = sorted.slice(-3);
  const earlier = sorted.slice(0, Math.max(1, sorted.length - 3));

  const getWeight = (e: ProgressEvent) => {
    const data = e.dataJson as any;
    return data.value_kg || data.value || 0;
  };

  const recentAvg = recent.reduce((sum, e) => sum + getWeight(e), 0) / recent.length;
  const earlierAvg = earlier.reduce((sum, e) => sum + getWeight(e), 0) / earlier.length;

  if (earlierAvg <= 0) return null;

  const changePercent = ((recentAvg - earlierAvg) / earlierAvg) * 100;
  const changeKg = recentAvg - earlierAvg;

  let trend: TrendAnalysis["trend"] = "stable";
  let description = "";
  let recommendation = "";

  if (Math.abs(changePercent) < 1) {
    trend = "stable";
    description = `Weight holding steady at ${recentAvg.toFixed(1)} kg`;
  } else if (changeKg < -0.5) {
    trend = "improving";
    description = `Weight decreased by ${Math.abs(changeKg).toFixed(1)} kg (${Math.abs(changePercent).toFixed(1)}%)`;
    recommendation = "Great progress! Maintain current nutrition plan and activity level.";
  } else if (changeKg > 0.5) {
    trend = "declining";
    description = `Weight increased by ${changeKg.toFixed(1)} kg (${changePercent.toFixed(1)}%)`;
    recommendation = "Review caloric intake and consider increasing activity.";
  } else {
    trend = "plateau";
    description = `Weight fluctuating slightly around ${recentAvg.toFixed(1)} kg`;
    recommendation = "Consider adjusting workout intensity or nutrition timing.";
  }

  return {
    category: "weight",
    trend,
    confidence: Math.min(0.9, 0.5 + events.length * 0.05),
    description,
    recommendation,
    dataPoints: events.length,
    recentValue: recentAvg,
    previousValue: earlierAvg,
    changePercent,
  };
}

function analyzeProgressNutritionTrend(events: ProgressEvent[]): TrendAnalysis | null {
  if (events.length < 2) return null;

  const sorted = [...events].sort((a, b) => 
    new Date(a.dateForMetric).getTime() - new Date(b.dateForMetric).getTime()
  );

  const recent = sorted.slice(-5);
  const earlier = sorted.slice(0, Math.max(1, sorted.length - 5));

  const getCalories = (e: ProgressEvent) => {
    const data = e.dataJson as any;
    return data.calories || data.calories_est || 0;
  };

  const getProtein = (e: ProgressEvent) => {
    const data = e.dataJson as any;
    return data.protein_g || data.protein_est_g || 0;
  };

  const recentCalories = recent.reduce((sum, e) => sum + getCalories(e), 0) / recent.length;
  const recentProtein = recent.reduce((sum, e) => sum + getProtein(e), 0) / recent.length;
  const earlierCalories = earlier.reduce((sum, e) => sum + getCalories(e), 0) / earlier.length;
  const earlierProtein = earlier.reduce((sum, e) => sum + getProtein(e), 0) / earlier.length;

  let trend: TrendAnalysis["trend"] = "stable";
  let description = "";
  let recommendation = "";

  const proteinChange = earlierProtein > 0 ? ((recentProtein - earlierProtein) / earlierProtein) * 100 : 0;
  const calorieChange = earlierCalories > 0 ? ((recentCalories - earlierCalories) / earlierCalories) * 100 : 0;

  if (recentCalories > 0 && recentProtein > 0) {
    if (proteinChange > 10) {
      trend = "improving";
      description = `Protein intake up ${proteinChange.toFixed(0)}% (avg ${recentProtein.toFixed(0)}g/day)`;
      recommendation = "Excellent protein focus! Keep it up for muscle recovery.";
    } else if (proteinChange < -10) {
      trend = "declining";
      description = `Protein intake down ${Math.abs(proteinChange).toFixed(0)}% (avg ${recentProtein.toFixed(0)}g/day)`;
      recommendation = "Try to increase protein with each meal for better results.";
    } else {
      trend = "stable";
      description = `Consistent nutrition: ~${recentCalories.toFixed(0)} cal, ${recentProtein.toFixed(0)}g protein daily`;
    }
  } else if (events.length > 0) {
    description = `${events.length} nutrition entries logged`;
    trend = "stable";
  }

  return {
    category: "nutrition",
    trend,
    confidence: Math.min(0.85, 0.4 + events.length * 0.05),
    description,
    recommendation,
    dataPoints: events.length,
    recentValue: recentCalories,
    previousValue: earlierCalories,
    changePercent: calorieChange,
  };
}

function analyzeActivityTrend(events: ProgressEvent[]): TrendAnalysis | null {
  if (events.length < 2) return null;

  const now = Date.now();
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

  const recentWeek = events.filter(e => new Date(e.dateForMetric).getTime() >= oneWeekAgo);
  const previousWeek = events.filter(e => {
    const time = new Date(e.dateForMetric).getTime();
    return time >= twoWeeksAgo && time < oneWeekAgo;
  });

  const getDuration = (e: ProgressEvent) => {
    const data = e.dataJson as any;
    return data.duration_min || data.duration || 30;
  };

  const recentCount = recentWeek.length;
  const previousCount = previousWeek.length;
  const avgDuration = recentWeek.length > 0 
    ? recentWeek.reduce((sum, e) => sum + getDuration(e), 0) / recentWeek.length 
    : 0;

  let trend: TrendAnalysis["trend"] = "stable";
  let description = "";
  let recommendation = "";

  if (recentCount >= 4) {
    trend = "improving";
    description = `Strong activity: ${recentCount} workouts this week (avg ${avgDuration.toFixed(0)} min)`;
    recommendation = "Great consistency! Consider adding variety to prevent plateaus.";
  } else if (recentCount >= 2) {
    trend = previousCount > recentCount ? "declining" : "stable";
    description = `${recentCount} workouts this week${previousCount > recentCount ? ` (down from ${previousCount})` : ""}`;
    recommendation = "Try to fit in one more session to accelerate progress.";
  } else if (recentCount === 1) {
    trend = "declining";
    description = `Only 1 workout logged this week`;
    recommendation = "Aim for at least 3 sessions weekly for consistent results.";
  } else {
    trend = "declining";
    description = `No workouts logged this week`;
    recommendation = "Start with even 15-20 minute sessions to rebuild the habit.";
  }

  return {
    category: "activity",
    trend,
    confidence: 0.9,
    description,
    recommendation,
    dataPoints: events.length,
    recentValue: recentCount,
    previousValue: previousCount,
  };
}

function analyzeSleepTrend(events: ProgressEvent[]): TrendAnalysis | null {
  if (events.length < 2) return null;

  const sorted = [...events].sort((a, b) => 
    new Date(a.dateForMetric).getTime() - new Date(b.dateForMetric).getTime()
  );

  const getSleepHours = (e: ProgressEvent) => {
    const data = e.dataJson as any;
    return data.sleep_hours || data.hours || data.duration_hours || 0;
  };

  const recent = sorted.slice(-5);
  const avgSleep = recent.reduce((sum, e) => sum + getSleepHours(e), 0) / recent.length;

  let trend: TrendAnalysis["trend"] = "stable";
  let description = "";
  let recommendation = "";

  if (avgSleep >= 7.5) {
    trend = "improving";
    description = `Excellent sleep: averaging ${avgSleep.toFixed(1)} hours`;
    recommendation = "Great sleep habits! This supports recovery and performance.";
  } else if (avgSleep >= 6.5) {
    trend = "stable";
    description = `Adequate sleep: averaging ${avgSleep.toFixed(1)} hours`;
    recommendation = "Try to add 30-60 min more sleep for optimal recovery.";
  } else {
    trend = "declining";
    description = `Low sleep: averaging only ${avgSleep.toFixed(1)} hours`;
    recommendation = "Prioritize sleep - it's crucial for progress and recovery.";
  }

  return {
    category: "sleep",
    trend,
    confidence: Math.min(0.85, 0.5 + events.length * 0.05),
    description,
    recommendation,
    dataPoints: events.length,
    recentValue: avgSleep,
  };
}

function analyzeMoodTrend(events: ProgressEvent[]): TrendAnalysis | null {
  if (events.length < 2) return null;

  const sorted = [...events].sort((a, b) => 
    new Date(a.dateForMetric).getTime() - new Date(b.dateForMetric).getTime()
  );

  const getMoodScore = (e: ProgressEvent) => {
    const data = e.dataJson as any;
    return data.mood_rating || data.mood || data.score || 5;
  };

  const recent = sorted.slice(-5);
  const earlier = sorted.slice(0, Math.max(1, sorted.length - 5));

  const recentAvg = recent.reduce((sum, e) => sum + getMoodScore(e), 0) / recent.length;
  const earlierAvg = earlier.reduce((sum, e) => sum + getMoodScore(e), 0) / earlier.length;

  let trend: TrendAnalysis["trend"] = "stable";
  let description = "";
  let recommendation = "";

  const moodChange = recentAvg - earlierAvg;

  if (recentAvg >= 7) {
    trend = moodChange > 0.5 ? "improving" : "stable";
    description = `Positive mood: averaging ${recentAvg.toFixed(1)}/10`;
    recommendation = "Keep up activities that boost your wellbeing!";
  } else if (recentAvg >= 5) {
    trend = moodChange < -0.5 ? "declining" : "stable";
    description = `Moderate mood: averaging ${recentAvg.toFixed(1)}/10`;
    recommendation = "Consider what activities or habits improve your energy.";
  } else {
    trend = "declining";
    description = `Low mood: averaging ${recentAvg.toFixed(1)}/10`;
    recommendation = "Focus on rest, social connection, and enjoyable activities.";
  }

  return {
    category: "mood",
    trend,
    confidence: Math.min(0.8, 0.4 + events.length * 0.05),
    description,
    recommendation,
    dataPoints: events.length,
    recentValue: recentAvg,
    previousValue: earlierAvg,
  };
}

function analyzeStepsTrend(events: ProgressEvent[]): TrendAnalysis | null {
  if (events.length < 2) return null;

  const sorted = [...events].sort((a, b) => 
    new Date(a.dateForMetric).getTime() - new Date(b.dateForMetric).getTime()
  );

  const getSteps = (e: ProgressEvent) => {
    const data = e.dataJson as any;
    return data.steps || 0;
  };

  const recent = sorted.slice(-7);
  const avgSteps = recent.reduce((sum, e) => sum + getSteps(e), 0) / recent.length;

  let trend: TrendAnalysis["trend"] = "stable";
  let description = "";
  let recommendation = "";

  if (avgSteps >= 10000) {
    trend = "improving";
    description = `Excellent activity: ${Math.round(avgSteps).toLocaleString()} steps/day average`;
    recommendation = "Great movement! Consider adding structured workouts.";
  } else if (avgSteps >= 7000) {
    trend = "stable";
    description = `Good activity: ${Math.round(avgSteps).toLocaleString()} steps/day average`;
    recommendation = "Try to reach 10,000 steps on most days.";
  } else if (avgSteps >= 4000) {
    trend = "declining";
    description = `Low activity: ${Math.round(avgSteps).toLocaleString()} steps/day average`;
    recommendation = "Add short walks after meals to boost daily movement.";
  } else {
    trend = "declining";
    description = `Very low activity: ${Math.round(avgSteps).toLocaleString()} steps/day`;
    recommendation = "Start with small goals - even 5,000 steps is a good target.";
  }

  return {
    category: "steps",
    trend,
    confidence: Math.min(0.9, 0.5 + events.length * 0.05),
    description,
    recommendation,
    dataPoints: events.length,
    recentValue: avgSteps,
  };
}

function analyzeTrackingConsistency(events: ProgressEvent[]): TrendAnalysis | null {
  if (events.length < 3) return null;

  const uniqueDates = new Set(events.map(e => e.dateForMetric));
  const daysTracked = uniqueDates.size;
  
  const sortedDates = Array.from(uniqueDates).sort();
  const firstDate = new Date(sortedDates[0]);
  const lastDate = new Date(sortedDates[sortedDates.length - 1]);
  const dayRange = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  
  const consistency = (daysTracked / dayRange) * 100;

  let trend: TrendAnalysis["trend"] = "stable";
  let description = "";
  let recommendation = "";

  if (consistency >= 70) {
    trend = "improving";
    description = `Great tracking: ${daysTracked} of ${dayRange} days (${consistency.toFixed(0)}%)`;
    recommendation = "Excellent consistency - this data helps optimize your plan!";
  } else if (consistency >= 40) {
    trend = "stable";
    description = `Moderate tracking: ${daysTracked} of ${dayRange} days (${consistency.toFixed(0)}%)`;
    recommendation = "Try to log daily for more accurate insights.";
  } else {
    trend = "declining";
    description = `Low tracking: only ${daysTracked} of ${dayRange} days (${consistency.toFixed(0)}%)`;
    recommendation = "More frequent logging will help us track your progress better.";
  }

  return {
    category: "consistency",
    trend,
    confidence: 0.95,
    description,
    recommendation,
    dataPoints: events.length,
    recentValue: consistency,
  };
}

function generateGoalPredictions(
  goals: Goal[],
  progressEvents: ProgressEvent[],
  trends: TrendAnalysis[]
): GoalPrediction[] {
  const activeGoals = goals.filter(g => g.status === "active");
  
  return activeGoals.map(goal => {
    const now = new Date();
    const deadline = new Date(goal.deadline);
    const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    const progressPercent = goal.targetValue > 0 
      ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100))
      : 0;
    
    const remaining = goal.targetValue - goal.currentValue;
    
    let ratePerDay = 0;
    let estimatedDaysToComplete: number | null = null;
    let estimatedCompletionDate: string | null = null;
    let successProbability = 0.5;
    let onTrack = false;
    let trendStatus: GoalPrediction["trend"] = "on_track";
    let recommendation = "";

    const relevantEvents = getRelevantEventsForGoal(goal, progressEvents);
    
    if (relevantEvents.length >= 2) {
      const sortedEvents = [...relevantEvents].sort((a, b) => 
        new Date(a.dateForMetric).getTime() - new Date(b.dateForMetric).getTime()
      );
      
      const firstValue = getEventValue(sortedEvents[0], goal.goalType);
      const lastValue = getEventValue(sortedEvents[sortedEvents.length - 1], goal.goalType);
      const firstDate = new Date(sortedEvents[0].dateForMetric);
      const lastDate = new Date(sortedEvents[sortedEvents.length - 1].dateForMetric);
      const daysBetween = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const progressMade = calculateProgressTowardGoal(goal, firstValue, lastValue);
      ratePerDay = progressMade / daysBetween;
      
      if (ratePerDay > 0 && remaining > 0) {
        estimatedDaysToComplete = Math.ceil(remaining / ratePerDay);
        const completionDate = new Date(now.getTime() + estimatedDaysToComplete * 24 * 60 * 60 * 1000);
        estimatedCompletionDate = completionDate.toISOString().split('T')[0];
        
        if (estimatedDaysToComplete <= daysRemaining) {
          successProbability = Math.min(0.95, 0.7 + (daysRemaining - estimatedDaysToComplete) / daysRemaining * 0.25);
          trendStatus = estimatedDaysToComplete < daysRemaining * 0.8 ? "ahead" : "on_track";
          onTrack = true;
        } else {
          const overshoot = estimatedDaysToComplete / Math.max(1, daysRemaining);
          successProbability = Math.max(0.1, 0.5 / overshoot);
          trendStatus = overshoot > 1.5 ? "at_risk" : "behind";
        }
      } else if (remaining <= 0) {
        successProbability = 1;
        trendStatus = "ahead";
        onTrack = true;
        estimatedDaysToComplete = 0;
        estimatedCompletionDate = now.toISOString().split('T')[0];
      }
    } else {
      if (daysRemaining > 0) {
        const requiredDailyProgress = remaining / daysRemaining;
        successProbability = progressPercent > 0 ? Math.min(0.5, progressPercent / 100) : 0.3;
        trendStatus = progressPercent < 20 && daysRemaining < 30 ? "at_risk" : "behind";
      }
    }

    if (trendStatus === "ahead") {
      recommendation = `Great progress! You're ahead of schedule to reach ${goal.title}.`;
    } else if (trendStatus === "on_track") {
      recommendation = `You're on track for ${goal.title}. Keep up the current pace!`;
    } else if (trendStatus === "behind") {
      recommendation = `You're slightly behind on ${goal.title}. Try to increase daily effort.`;
    } else {
      recommendation = `${goal.title} needs attention. Consider adjusting the target or timeline.`;
    }

    return {
      goalId: goal.id,
      goalTitle: goal.title,
      goalType: goal.goalType,
      currentValue: goal.currentValue,
      targetValue: goal.targetValue,
      unit: goal.unit,
      deadline: goal.deadline,
      progressPercent,
      estimatedCompletionDate,
      daysToCompletion: estimatedDaysToComplete,
      successProbability: Math.round(successProbability * 100) / 100,
      onTrack,
      trend: trendStatus,
      recommendation,
    };
  });
}

function getRelevantEventsForGoal(goal: Goal, events: ProgressEvent[]): ProgressEvent[] {
  const goalType = goal.goalType.toLowerCase();
  
  return events.filter(e => {
    const eventType = e.eventType.toLowerCase();
    
    if (goalType.includes("weight") && eventType === "weight") return true;
    if (goalType.includes("workout") && eventType === "workout") return true;
    if (goalType.includes("exercise") && eventType === "workout") return true;
    if (goalType.includes("nutrition") && eventType === "nutrition") return true;
    if (goalType.includes("calorie") && eventType === "nutrition") return true;
    if (goalType.includes("protein") && eventType === "nutrition") return true;
    if (goalType.includes("step") && eventType === "steps") return true;
    if (goalType.includes("sleep") && eventType === "sleep") return true;
    
    return false;
  });
}

function getEventValue(event: ProgressEvent, goalType: string): number {
  const data = event.dataJson as any;
  const type = goalType.toLowerCase();
  
  if (type.includes("weight")) {
    return data.value_kg || data.value || 0;
  }
  if (type.includes("calorie")) {
    return data.calories || data.calories_est || 0;
  }
  if (type.includes("protein")) {
    return data.protein_g || data.protein_est_g || 0;
  }
  if (type.includes("step")) {
    return data.steps || 0;
  }
  if (type.includes("sleep")) {
    return data.sleep_hours || data.hours || 0;
  }
  if (type.includes("workout") || type.includes("exercise")) {
    return 1;
  }
  
  return 0;
}

function calculateProgressTowardGoal(goal: Goal, firstValue: number, lastValue: number): number {
  const type = goal.goalType.toLowerCase();
  
  if (type.includes("weight") && type.includes("lose")) {
    return firstValue - lastValue;
  }
  if (type.includes("weight") && type.includes("gain")) {
    return lastValue - firstValue;
  }
  if (type.includes("weight")) {
    if (goal.targetValue < goal.currentValue) {
      return firstValue - lastValue;
    }
    return lastValue - firstValue;
  }
  
  return Math.abs(lastValue - firstValue);
}

async function generateEnhancedSummary(
  clientName: string,
  trends: TrendAnalysis[],
  goalPredictions: GoalPrediction[],
  progressEvents: ProgressEvent[],
  preferredLanguage: "en" | "ru" | "es" = "en"
): Promise<string> {
  try {
    const trendsContext = trends.map(t => 
      `- ${t.category}: ${t.trend} - ${t.description}`
    ).join('\n');
    
    const goalsContext = goalPredictions.length > 0
      ? `\nGoal Progress:\n${goalPredictions.map(g => 
          `- ${g.goalTitle}: ${g.progressPercent}% complete, ${g.trend} (${Math.round(g.successProbability * 100)}% success probability)`
        ).join('\n')}`
      : "";
    
    const context = `
Client: ${clientName}
Data Points: ${progressEvents.length} entries logged

Trends:
${trendsContext}
${goalsContext}

Key Recommendations:
${trends.filter(t => t.recommendation).slice(0, 3).map(t => `- ${t.recommendation}`).join('\n')}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a supportive fitness coach AI. Provide a brief, encouraging summary (under 80 words) that highlights progress and gives one actionable next step. Be specific about data when available. Focus on positives while gently addressing areas for improvement. ${LANGUAGE_INSTRUCTIONS[preferredLanguage]}`,
        },
        {
          role: "user",
          content: `Summarize this client's progress and give one key recommendation:\n\n${context}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    return completion.choices[0]?.message?.content || generateFallbackSummary(clientName, trends, goalPredictions);
  } catch (error) {
    console.error("OpenAI API error in generateEnhancedSummary:", error);
    return generateFallbackSummary(clientName, trends, goalPredictions);
  }
}

function generateFallbackSummary(
  clientName: string,
  trends: TrendAnalysis[],
  goalPredictions: GoalPrediction[]
): string {
  const improving = trends.filter(t => t.trend === "improving");
  const declining = trends.filter(t => t.trend === "declining");
  const onTrackGoals = goalPredictions.filter(g => g.onTrack);
  
  let summary = `${clientName}'s recent progress: `;
  
  if (improving.length > 0) {
    summary += `Strong performance in ${improving.map(t => t.category).join(", ")}. `;
  }
  
  if (declining.length > 0) {
    summary += `Focus areas: ${declining.map(t => t.category).join(", ")}. `;
  }
  
  if (goalPredictions.length > 0) {
    summary += `${onTrackGoals.length} of ${goalPredictions.length} goals on track. `;
  }
  
  if (declining.length > 0 && declining[0].recommendation) {
    summary += declining[0].recommendation;
  } else if (improving.length > 0 && improving[0].recommendation) {
    summary += improving[0].recommendation;
  } else {
    summary += "Keep up the consistent effort!";
  }
  
  return summary;
}

export interface ProgramBuilderAction {
  type: "add_training" | "add_schedule" | "add_meal" | "add_meal_plan" | "add_weekly_meal_plan" | "add_habit" | "add_task" | "modify_training" | "none";
  response: string;
  data?: {
    day?: string;
    title?: string;
    exercises?: Array<{
      name: string;
      sets: number;
      reps: number;
      note?: string;
    }>;
    schedule?: Array<{
      day: string;
      title: string;
      exercises: Array<{
        name: string;
        sets: number;
        reps: number;
        note?: string;
      }>;
    }>;
    meal?: {
      type: string;
      name: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
    mealPlan?: Array<{
      type: string;
      name: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    }>;
    weeklyMealPlan?: Array<{
      day: string;
      title: string;
      meals: Array<{
        type: string;
        name: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      }>;
    }>;
    habit?: {
      name: string;
      frequency: string;
    };
    task?: {
      name: string;
      dueDay: string;
    };
    exercisesToAdd?: Array<{
      name: string;
      sets: number;
      reps: number;
      note?: string;
    }>;
    targetDay?: string;
  };
}

export async function processProgramBuilderRequest(
  userMessage: string,
  clientName: string,
  existingTrainingDays?: Array<{ day: string; title: string; exercises: Array<{ name: string; sets: number; reps: number }> }>,
  preferredLanguage: "en" | "ru" | "es" = "en",
  clientMacros?: {
    weight?: number;
    targetWeight?: number;
    age?: number;
    sex?: string;
    height?: number;
    activityLevel?: string;
    goalType?: string;
    calculatedMacros?: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
  },
  clientContext?: {
    goals?: Array<{ type: string; target: number; current: number; deadline: string | null; status: string }>;
    recentNutrition?: Array<{ date: string; calories: number | null; protein: number | null; carbs: number | null; fats: number | null }>;
    recentWorkouts?: Array<{ date: string; type: string; duration: number | null; intensity: string | null }>;
    trainingExperience?: string;
    equipmentAccess?: string;
    medicalNotes?: string;
    preferences?: any;
  }
): Promise<ProgramBuilderAction> {
  try {
    const existingContext = existingTrainingDays && existingTrainingDays.length > 0
      ? `\n\nExisting Training Days:\n${existingTrainingDays.map(d => 
          `- ${d.day}: ${d.title} (${d.exercises.map(e => e.name).join(", ")})`
        ).join("\n")}`
      : "\n\nNo existing training days yet.";

    // Build client macro context if available
    let macroContext = "";
    if (clientMacros) {
      const parts: string[] = [];
      if (clientMacros.weight) parts.push(`Weight: ${clientMacros.weight}kg`);
      if (clientMacros.targetWeight) parts.push(`Target Weight: ${clientMacros.targetWeight}kg`);
      if (clientMacros.goalType) parts.push(`Goal: ${clientMacros.goalType}`);
      if (clientMacros.activityLevel) parts.push(`Activity Level: ${clientMacros.activityLevel}`);
      
      if (clientMacros.calculatedMacros) {
        parts.push(`Daily Targets: ${clientMacros.calculatedMacros.calories} kcal, ${clientMacros.calculatedMacros.protein}g protein, ${clientMacros.calculatedMacros.carbs}g carbs, ${clientMacros.calculatedMacros.fat}g fat`);
      }
      
      if (parts.length > 0) {
        macroContext = `\n\nClient Profile & Macro Targets:\n${parts.join("\n")}`;
      }
    }
    
    // Build full client context (goals, history, etc.)
    let fullContext = "";
    if (clientContext) {
      const contextParts: string[] = [];
      
      // Active goals
      if (clientContext.goals && clientContext.goals.length > 0) {
        const goalsStr = clientContext.goals.map(g => {
          const progress = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0;
          return `  - ${g.type}: ${g.current}/${g.target} (${progress}% complete)${g.deadline ? `, deadline: ${g.deadline}` : ''}`;
        }).join("\n");
        contextParts.push(`Active Goals:\n${goalsStr}`);
      }
      
      // Recent workout history
      if (clientContext.recentWorkouts && clientContext.recentWorkouts.length > 0) {
        const workoutStr = clientContext.recentWorkouts.map(w => 
          `  - ${w.date}: ${w.type}${w.duration ? ` (${w.duration} min)` : ''}${w.intensity ? `, ${w.intensity} intensity` : ''}`
        ).join("\n");
        contextParts.push(`Recent Workouts (last 7 days):\n${workoutStr}`);
      } else {
        contextParts.push("Recent Workouts: No workouts logged in the last 7 days");
      }
      
      // Recent nutrition history
      if (clientContext.recentNutrition && clientContext.recentNutrition.length > 0) {
        const avgCalories = Math.round(clientContext.recentNutrition.reduce((sum, n) => sum + (n.calories || 0), 0) / clientContext.recentNutrition.length);
        const avgProtein = Math.round(clientContext.recentNutrition.reduce((sum, n) => sum + (n.protein || 0), 0) / clientContext.recentNutrition.length);
        contextParts.push(`Recent Nutrition (7-day avg): ~${avgCalories} kcal, ~${avgProtein}g protein/day`);
      }
      
      // Training experience and equipment
      if (clientContext.trainingExperience) {
        contextParts.push(`Training Experience: ${clientContext.trainingExperience}`);
      }
      if (clientContext.equipmentAccess) {
        contextParts.push(`Equipment Access: ${clientContext.equipmentAccess}`);
      }
      if (clientContext.medicalNotes) {
        contextParts.push(`Medical Notes: ${clientContext.medicalNotes}`);
      }
      
      if (contextParts.length > 0) {
        fullContext = `\n\nClient History & Context:\n${contextParts.join("\n")}`;
      }
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a certified fitness and nutrition expert with a degree in Exercise Science and Sports Nutrition. You hold certifications including NASM-CPT, CSCS, and Precision Nutrition. With 10+ years of experience training clients, you create evidence-based, periodized training programs tailored to individual goals and abilities.

Your role is to parse user requests and create or modify workout programs AND meal plans using your professional expertise.

MEAL PLANS BASED ON MACROS:
When the user asks for a meal plan based on their macros:
- For a SINGLE day meal plan, use "add_meal_plan" type
- For a WEEKLY/multi-day meal plan, use "add_weekly_meal_plan" type
- Use the client's macro targets (calories, protein, carbs, fat) provided in the context
- Create balanced meals that fit within the daily targets
- Distribute macros across 3-5 meals (typically: breakfast 25%, lunch 30%, dinner 30%, snacks 15%)

CRITICAL - SHOW YOUR REASONING (MANDATORY):
When creating ANY meal plan (add_meal_plan OR add_weekly_meal_plan), your "response" field MUST ALWAYS include your calculation reasoning. This is NOT optional.

Your response MUST follow this EXACT format:

"**Macro Calculation:**
- BMR (Mifflin-St Jeor): For {name} ({weight}kg, {height}cm, {age}yo, {sex}): BMR = X kcal
- TDEE: BMR × {activity multiplier} = X kcal
- Goal adjustment: {goal type} → {deficit/surplus} = X kcal daily target

**Daily Macro Targets:**
- Calories: X kcal
- Protein: Xg (2g per kg bodyweight)
- Fat: Xg (0.9g per kg bodyweight)  
- Carbs: Xg (remaining calories)

**Meal Distribution:**
I've distributed these macros across breakfast (25%), lunch (30%), dinner (30%), and snacks (15%) for balanced nutrition throughout the day.

Here's the meal plan I've created:"

If client profile data (weight, height, age, sex, activity level) is missing, explain what data is needed and do NOT generate a meal plan without it.

PERSONALIZATION BASED ON CLIENT HISTORY:
When creating ANY plan (training, nutrition, habits, or tasks), you MUST consider and reference the client's:
1. Active Goals - Design plans that directly support their goals (e.g., if goal is "lose 5kg", prioritize caloric deficit and cardio)
2. Recent Workout History - Build on what they've been doing (e.g., "I see you've been doing upper body work, let's add a complementary lower body session")
3. Recent Nutrition - Address gaps or maintain consistency (e.g., "Your protein intake has been around 80g/day, let's boost that closer to your target")
4. Training Experience - Adjust complexity and volume accordingly (beginner vs advanced)
5. Equipment Access - Only include exercises they can actually perform
6. Medical Notes - Avoid exercises or foods that could cause issues

Your "response" field should briefly mention HOW the plan relates to their history/goals to show personalization.

Your job is to understand what the user wants to add or change, even if they make typos or use informal language.
Common corrections:
- "split squad" or "split squads" = "Bulgarian Split Squat"
- "taylor" or "tailer" = "tailor" (modify)
- "bench" = "Bench Press"
- "dead" or "deads" = "Deadlifts"

CRITICAL: When adding a workout, you MUST ALWAYS include exercises in the exercises array. NEVER return an empty exercises array.
If the user asks for a general workout type (e.g., "upper body", "leg day", "push day", "pull day", "full body"), generate 4-6 appropriate exercises with sets and reps.
Example workout types and exercises:
- Upper Body: Bench Press, Overhead Press, Bent-Over Rows, Lat Pulldown, Bicep Curls, Tricep Dips
- Lower Body: Squats, Romanian Deadlifts, Leg Press, Lunges, Leg Curls, Calf Raises
- Push: Bench Press, Incline Dumbbell Press, Overhead Press, Tricep Pushdowns, Lateral Raises
- Pull: Pull-ups, Barbell Rows, Face Pulls, Bicep Curls, Rear Delt Flyes
- Full Body: Squats, Bench Press, Deadlifts, Overhead Press, Pull-ups

You must respond with a JSON object in this exact format:
{
  "type": "add_training" | "add_schedule" | "add_meal" | "add_meal_plan" | "add_weekly_meal_plan" | "update_weekly_meal_plan" | "add_habit" | "add_task" | "modify_training" | "none",
  "response": "FOR MEAL PLANS: MUST include calculation breakdown: '**Macro Calculation:** BMR (Mifflin-St Jeor) for [name] ([weight]kg, [height]cm, [age]yo): [X] kcal. TDEE: BMR × [multiplier] = [X] kcal. Goal adjustment: [X] kcal daily target. **Daily Targets:** [X] kcal, [X]g protein, [X]g carbs, [X]g fat. **Distribution:** Breakfast 25%, Lunch 30%, Dinner 30%, Snacks 15%.' FOR OTHER TYPES: A friendly confirmation message.",
  "data": {
    // For add_training (single workout day):
    "day": "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday",
    "title": "Workout Title",
    "exercises": [{ "name": "Exercise Name", "sets": 4, "reps": 10, "note": "optional note" }]
    
    // For add_schedule (MULTIPLE TRAINING/WORKOUT days - use ONLY for workouts/exercise programs):
    "schedule": [
      { "day": "Monday", "title": "Upper Body", "exercises": [{ "name": "Bench Press", "sets": 4, "reps": 10 }] },
      { "day": "Wednesday", "title": "Lower Body", "exercises": [{ "name": "Squats", "sets": 4, "reps": 8 }] }
    ]
    
    // For modify_training (adding exercises to existing day):
    "targetDay": "Wednesday",
    "exercisesToAdd": [{ "name": "Bulgarian Split Squat", "sets": 3, "reps": 12 }]
    
    // For add_meal (single meal):
    "meal": { "type": "Breakfast|Lunch|Dinner|Snack", "name": "Meal name", "calories": 500, "protein": 30, "carbs": 40, "fat": 20 }
    
    // For add_meal_plan (SINGLE DAY meal plan):
    "mealPlan": [
      { "type": "Breakfast", "name": "Oatmeal with Greek Yogurt", "calories": 450, "protein": 35, "carbs": 55, "fat": 12 },
      { "type": "Lunch", "name": "Grilled Chicken Salad", "calories": 550, "protein": 45, "carbs": 30, "fat": 25 },
      { "type": "Snack", "name": "Protein Shake with Banana", "calories": 300, "protein": 30, "carbs": 35, "fat": 5 },
      { "type": "Dinner", "name": "Salmon with Rice and Vegetables", "calories": 600, "protein": 40, "carbs": 50, "fat": 22 }
    ]
    
    // For add_weekly_meal_plan OR update_weekly_meal_plan (same format - update replaces existing):
    "weeklyMealPlan": [
      { "day": "Monday", "title": "Day 1 Meals", "meals": [
        { "type": "Breakfast", "name": "Eggs & Toast", "calories": 400, "protein": 25, "carbs": 30, "fat": 18 },
        { "type": "Lunch", "name": "Chicken Salad", "calories": 500, "protein": 40, "carbs": 20, "fat": 25 },
        { "type": "Dinner", "name": "Grilled Fish", "calories": 550, "protein": 45, "carbs": 30, "fat": 22 }
      ]},
      { "day": "Tuesday", "title": "Day 2 Meals", "meals": [...] }
    ]
    
    // For add_habit:
    "habit": { "name": "Habit description", "frequency": "Daily|Weekly" }
    
    // For add_task:
    "task": { "name": "Task description", "dueDay": "Mon|Tue|Wed|Thu|Fri|Sat|Sun" }
  }
}

CRITICAL DISTINCTION:
- "add_schedule" is ONLY for TRAINING/WORKOUT schedules (exercises with sets and reps). NEVER use it for meals.
- "add_weekly_meal_plan" is for NUTRITION/MEAL plans across multiple days. Use this when user asks for "weekly meal plan", "meal plan for the week", or any multi-day nutrition request.
- "add_meal_plan" is for a single day's worth of meals.

IMPORTANT: When the user requests multiple training days (e.g., "4-day split", "weekly schedule", "3 day workout plan", "upper lower split"), use "add_schedule" with an array of days. Only use "add_training" for a single workout day.

CRITICAL BEHAVIOR: NEVER respond with type "none" when asked to modify, update, adjust, or recalculate a plan. If the user asks you to change something about an existing plan (e.g., "recalculate with 1g fat per kg", "update macros", "adjust the meal plan"), you MUST:
1. Make the requested changes immediately
2. Use "update_weekly_meal_plan" to replace the current nutrition plan with the updated version
3. NEVER ask "Would you like me to..." - just do it

The "update_weekly_meal_plan" type works exactly like "add_weekly_meal_plan" but signals to replace existing nutrition instead of adding to it.

Only use type "none" if the request is completely unrelated to fitness/nutrition programming (e.g., "tell me a joke", "what's the weather").

IMPORTANT LANGUAGE INSTRUCTION: Write ALL text content in the client's preferred language. ${LANGUAGE_INSTRUCTIONS[preferredLanguage]}
This includes:
- The "response" field
- Workout titles
- Exercise names (but keep commonly known terms like "Push-ups", "Squats" recognizable)
- Meal names
- Habit descriptions
- Task descriptions
- Any notes or comments

For example, if the language is Russian, "Upper Body Day" should be "День верхней части тела", etc.`
        },
        {
          role: "user",
          content: `Client: ${clientName}${existingContext}${macroContext}${fullContext}\n\nUser request: "${userMessage}"`
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return {
        type: "none",
        response: "I couldn't process that request. Try asking me to add a workout, meal, habit, or task."
      };
    }

    const parsed = JSON.parse(content) as ProgramBuilderAction;
    return parsed;
  } catch (error) {
    console.error("OpenAI Program Builder error:", error);
    return {
      type: "none",
      response: "I'm having trouble processing your request right now. Please try again, or use simple phrases like 'Add upper body workout for Monday' or 'Add a habit to drink more water'."
    };
  }
}
