import OpenAI from "openai";
import type { NutritionLog, WorkoutLog, CheckIn } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface TrendAnalysis {
  category: "nutrition" | "activity" | "consistency" | "progress";
  trend: "improving" | "declining" | "stable" | "plateau";
  confidence: number;
  description: string;
  recommendation?: string;
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
  checkIns: CheckIn[]
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

  // Generate AI summary using OpenAI
  const summary = await generateAISummary(clientName, trends, nutritionLogs, workoutLogs, checkIns);

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

async function generateAISummary(
  clientName: string,
  trends: TrendAnalysis[],
  nutritionLogs: NutritionLog[],
  workoutLogs: WorkoutLog[],
  checkIns: CheckIn[]
): Promise<string> {
  try {
    // Count synced vs manual entries
    const syncedNutrition = nutritionLogs.filter(log => log.dataSource === "apple_health").length;
    const syncedWorkouts = workoutLogs.filter(log => log.dataSource === "apple_health").length;
    const syncedCheckIns = checkIns.filter(log => log.dataSource === "apple_health").length;
    const totalSynced = syncedNutrition + syncedWorkouts + syncedCheckIns;
    
    const context = `
Client: ${clientName}
Data Summary:
- ${nutritionLogs.length} nutrition logs (${syncedNutrition} auto-synced from wearables)
- ${workoutLogs.length} workout sessions (${syncedWorkouts} auto-synced from wearables)
- ${checkIns.length} check-ins (${syncedCheckIns} auto-synced from wearables)
- Data collection: ${totalSynced > 0 ? "Automated tracking enabled via wearable integration" : "Manual tracking only"}

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
          content: "You are a professional fitness coach AI assistant. Provide concise, actionable insights based on client data. Keep summaries under 100 words and focus on the most important trends and next steps. When wearable data is present, acknowledge the benefit of automated tracking for data accuracy.",
        },
        {
          role: "user",
          content: `Based on this client data, provide a brief performance summary and top 1-2 recommendations:\n\n${context}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    return completion.choices[0]?.message?.content || "Unable to generate summary at this time.";
  } catch (error) {
    console.error("OpenAI API error:", error);
    // Fallback to rule-based summary with data source acknowledgment
    const improving = trends.filter(t => t.trend === "improving").length;
    const declining = trends.filter(t => t.trend === "declining").length;
    
    // Count synced entries for fallback summary
    const syncedNutrition = nutritionLogs.filter(log => log.dataSource === "apple_health").length;
    const syncedWorkouts = workoutLogs.filter(log => log.dataSource === "apple_health").length;
    const syncedCheckIns = checkIns.filter(log => log.dataSource === "apple_health").length;
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
