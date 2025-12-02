import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Dumbbell, Flame, TrendingUp, Trophy, Apple, Droplets, MessageSquare, Calendar, Brain, Target, ArrowUp, ArrowDown, Minus, Lightbulb, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Client, SmartLog, ProgressEvent } from "@shared/schema";
import { format, subDays, parseISO, isToday, isYesterday, differenceInDays } from "date-fns";

interface TrendAnalysis {
  category: string;
  trend: "improving" | "declining" | "stable" | "plateau";
  confidence: number;
  description: string;
  recommendation?: string;
}

interface GoalPrediction {
  goalId: string;
  goalTitle: string;
  progressPercent: number;
  successProbability: number;
  trend: "ahead" | "on_track" | "behind" | "at_risk";
  recommendation: string;
}

interface EnhancedClientInsight {
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
}

function formatRelativeTime(dateStr: string): string {
  const date = parseISO(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}

function getActivityIcon(eventType: string) {
  switch (eventType) {
    case "workout": return { icon: Dumbbell, color: "text-orange-500" };
    case "nutrition": return { icon: Apple, color: "text-green-500" };
    case "weight": return { icon: TrendingUp, color: "text-blue-500" };
    case "sleep": return { icon: Calendar, color: "text-indigo-500" };
    case "water": return { icon: Droplets, color: "text-cyan-500" };
    default: return { icon: MessageSquare, color: "text-primary" };
  }
}

export default function ClientDashboard() {
  const [, setLocation] = useLocation();
  const [clientData, setClientData] = useState<Client | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const clientId = localStorage.getItem("clientId");
    if (!clientId) {
      setLocation("/client/login");
      return;
    }
    loadClient();
  }, []);

  const loadClient = async () => {
    try {
      const response = await apiRequest("GET", "/api/client-auth/me");
      const data = await response.json();
      
      if (!data.client) {
        localStorage.removeItem("clientId");
        localStorage.removeItem("clientEmail");
        setLocation("/client/login");
        return;
      }
      setClientData(data.client);
    } catch (error) {
      localStorage.removeItem("clientId");
      localStorage.removeItem("clientEmail");
      setLocation("/client/login");
    } finally {
      setIsVerifying(false);
    }
  };

  const sevenDaysAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");

  const { data: progressEvents } = useQuery<ProgressEvent[]>({
    queryKey: ["/api/client/progress-events", clientData?.id],
    queryFn: async () => {
      if (!clientData?.id) return [];
      const response = await apiRequest("GET", `/api/client/progress-events?startDate=${sevenDaysAgo}`);
      return response.json();
    },
    enabled: !!clientData?.id,
  });

  const { data: smartLogs } = useQuery<SmartLog[]>({
    queryKey: ["/api/smart-logs", clientData?.id],
    queryFn: async () => {
      if (!clientData?.id) return [];
      const response = await apiRequest("GET", `/api/smart-logs/${clientData.id}?limit=10`);
      return response.json();
    },
    enabled: !!clientData?.id,
  });

  const { data: insights, isLoading: insightsLoading } = useQuery<EnhancedClientInsight>({
    queryKey: ["/api/client/insights"],
    enabled: !!clientData?.id,
  });

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!clientData) {
    return null;
  }

  const workoutsThisWeek = progressEvents?.filter(e => e.eventType === "workout").length || 0;
  
  const nutritionEvents = progressEvents?.filter(e => e.eventType === "nutrition") || [];
  const avgCalories = nutritionEvents.length > 0 
    ? Math.round(nutritionEvents.reduce((sum, e) => sum + ((e.dataJson as any).calories || 0), 0) / nutritionEvents.length)
    : 0;

  const logDates = new Set(smartLogs?.map(log => log.localDateForClient) || []);
  let streak = 0;
  let currentDate = new Date();
  while (logDates.has(format(currentDate, "yyyy-MM-dd"))) {
    streak++;
    currentDate = subDays(currentDate, 1);
  }

  const achievements = Math.min(8, Math.floor((smartLogs?.length || 0) / 3));

  const recentActivities = (smartLogs || []).slice(0, 4).map(log => {
    const classification = log.aiClassificationJson as any;
    const eventType = classification?.detected_event_types?.[0] || "note";
    const { icon, color } = getActivityIcon(eventType);
    
    const rawText = log.rawText || "";
    let title = rawText.slice(0, 50);
    if (rawText.length > 50) title += "...";
    
    return {
      id: log.id,
      title,
      time: formatRelativeTime(log.createdAt),
      icon,
      color,
    };
  });

  const upcomingItems = [
    { id: "1", title: "Morning Run", time: "Tomorrow, 07:00", checked: false },
    { id: "2", title: "Log progress in AI tracker", time: "Today, 20:00", checked: false },
    { id: "3", title: "Coach call", time: "Friday, 15:00", checked: false },
  ];

  const statCards = [
    { 
      value: workoutsThisWeek, 
      label: "Workouts/week", 
      icon: Dumbbell, 
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      iconColor: "text-blue-500"
    },
    { 
      value: avgCalories || "-", 
      label: "Calories/day", 
      icon: Flame, 
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
      iconColor: "text-orange-500"
    },
    { 
      value: streak, 
      label: "Day streak", 
      icon: TrendingUp, 
      bgColor: "bg-green-50 dark:bg-green-950/30",
      iconColor: "text-green-500"
    },
    { 
      value: achievements, 
      label: "Achievements", 
      icon: Trophy, 
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
      iconColor: "text-amber-500"
    },
  ];

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground" data-testid="text-dashboard-title">
            Welcome back, {clientData.name.split(" ")[0]}!
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Here's your progress for the last 7 days
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {statCards.map((stat, index) => (
            <Card key={index} className="hover-elevate transition-all duration-150" data-testid={`card-stat-${index}`}>
              <CardContent className="p-4 sm:p-6">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${stat.bgColor} flex items-center justify-center mb-3`}>
                  <stat.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.iconColor}`} />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* AI Insights Section */}
        <ClientInsightsCard insights={insights} isLoading={insightsLoading} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4" data-testid="text-recent-activity-title">
                Recent Activity
              </h2>
              {recentActivities.length > 0 ? (
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0`}>
                        <activity.icon className={`w-4 h-4 ${activity.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No recent activity</p>
                  <p className="text-xs mt-1">Start logging in the AI Tracker!</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground" data-testid="text-upcoming-title">
                  Upcoming
                </h2>
                <Calendar className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="space-y-3">
                {upcomingItems.map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <Checkbox 
                      id={item.id}
                      className="mt-0.5"
                      data-testid={`checkbox-upcoming-${item.id}`}
                    />
                    <label htmlFor={item.id} className="flex-1 cursor-pointer">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.time}</p>
                    </label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ClientInsightsCard({ insights, isLoading }: { insights?: EnhancedClientInsight; isLoading: boolean }) {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
      case "ahead":
        return <ArrowUp className="w-3 h-3" />;
      case "declining":
      case "behind":
      case "at_risk":
        return <ArrowDown className="w-3 h-3" />;
      default:
        return <Minus className="w-3 h-3" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "improving":
      case "ahead":
      case "on_track":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400";
      case "declining":
      case "at_risk":
        return "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400";
      case "behind":
        return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getOverallTrendColor = (trend?: string) => {
    switch (trend) {
      case "improving":
        return "text-emerald-500";
      case "declining":
        return "text-rose-500";
      default:
        return "text-muted-foreground";
    }
  };

  const hasData = insights && insights.quickStats?.totalDataPoints > 0;

  return (
    <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20" data-testid="card-ai-insights">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Your AI Insights</h2>
              <p className="text-xs text-muted-foreground">Based on your tracking data</p>
            </div>
          </div>
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
        </div>

        {!hasData ? (
          <div className="text-center py-6">
            <Brain className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Start logging your activities in the AI Tracker to see personalized insights and goal predictions.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Log workouts, meals, sleep, and more to unlock trends analysis.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-background rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-foreground">{insights.quickStats.totalDataPoints}</p>
                <p className="text-xs text-muted-foreground">Data Points</p>
              </div>
              <div className="bg-background rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-foreground">{insights.quickStats.trackingConsistency}%</p>
                <p className="text-xs text-muted-foreground">Consistency</p>
              </div>
              <div className="bg-background rounded-lg p-3 text-center">
                <p className={`text-xl font-bold capitalize ${getOverallTrendColor(insights.quickStats.overallTrend)}`}>
                  {getTrendIcon(insights.quickStats.overallTrend)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Trend</p>
              </div>
            </div>

            {/* Goal Predictions */}
            {insights.goalPredictions && insights.goalPredictions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium text-foreground">Your Goal Progress</p>
                </div>
                <div className="space-y-2">
                  {insights.goalPredictions.slice(0, 2).map((goal, idx) => (
                    <div key={idx} className="bg-background rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-foreground truncate flex-1">{goal.goalTitle}</p>
                        <Badge variant="secondary" className={`text-xs ml-2 ${getTrendColor(goal.trend)}`}>
                          {getTrendIcon(goal.trend)}
                          <span className="ml-1">{Math.round(goal.successProbability * 100)}% likely</span>
                        </Badge>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mt-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, goal.progressPercent)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{goal.progressPercent}% complete</p>
                      {goal.recommendation && (
                        <p className="text-xs text-muted-foreground mt-1 italic">Tip: {goal.recommendation}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trends */}
            {insights.trends && insights.trends.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium text-foreground">Detected Trends</p>
                </div>
                <div className="space-y-2">
                  {insights.trends.filter(t => t.confidence > 0.5).slice(0, 3).map((trend, idx) => (
                    <div key={idx} className="bg-background rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground capitalize">{trend.category}</span>
                        <Badge variant="secondary" className={`text-xs ${getTrendColor(trend.trend)}`}>
                          {getTrendIcon(trend.trend)}
                          <span className="ml-1 capitalize">{trend.trend}</span>
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{trend.description}</p>
                      {trend.recommendation && (
                        <p className="text-xs text-primary mt-1 flex items-center gap-1">
                          <Lightbulb className="w-3 h-3" />
                          {trend.recommendation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            {insights.summary && (
              <div className="bg-background rounded-lg p-3 border-l-2 border-primary">
                <p className="text-sm text-foreground">{insights.summary}</p>
              </div>
            )}

            {/* Strengths & Opportunities */}
            {(insights.quickStats.topStrength || insights.quickStats.topOpportunity) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {insights.quickStats.topStrength && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3">
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <Trophy className="w-3 h-3" />
                      Your Strength
                    </p>
                    <p className="text-sm text-foreground mt-1">{insights.quickStats.topStrength}</p>
                  </div>
                )}
                {insights.quickStats.topOpportunity && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" />
                      Opportunity
                    </p>
                    <p className="text-sm text-foreground mt-1">{insights.quickStats.topOpportunity}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
