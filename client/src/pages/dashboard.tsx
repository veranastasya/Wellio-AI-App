import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Video, Trophy, Lightbulb, TrendingUp, Target, ArrowUp, ArrowDown, Minus, Activity as ActivityIcon, Brain, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { Client, Session, Activity } from "@shared/schema";
import { GoalsDashboardWidget } from "@/components/goals/goals-dashboard-widget";
import { StatGrid } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";

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

export default function Dashboard() {
  const { data: clients = [], isLoading: clientsLoading, isError: clientsError } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: sessions = [], isLoading: sessionsLoading, isError: sessionsError } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });

  const { data: activities = [], isLoading: activitiesLoading, isError: activitiesError } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  const isLoading = clientsLoading || sessionsLoading || activitiesLoading;
  const isError = clientsError || sessionsError || activitiesError;

  const totalClients = clients.length;
  const activeSessions = sessions.filter((s) => s.status === "scheduled").length;
  const completedSessions = sessions.filter((s) => s.status === "completed").length;
  const totalSessions = activeSessions + completedSessions;
  const successRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

  const progressData = (() => {
    if (clients.length === 0) {
      return [
        { group: "Group 1", progress: 0 },
        { group: "Group 2", progress: 0 },
        { group: "Group 3", progress: 0 },
        { group: "Group 4", progress: 0 },
      ];
    }

    const sortedClients = [...clients].sort((a, b) => a.progressScore - b.progressScore);
    const quarters = [
      sortedClients.slice(0, Math.ceil(clients.length / 4)),
      sortedClients.slice(Math.ceil(clients.length / 4), Math.ceil(clients.length / 2)),
      sortedClients.slice(Math.ceil(clients.length / 2), Math.ceil((clients.length * 3) / 4)),
      sortedClients.slice(Math.ceil((clients.length * 3) / 4)),
    ];

    return quarters.map((quarter, idx) => {
      const avgProgress = quarter.length > 0
        ? Math.round(quarter.reduce((sum, c) => sum + c.progressScore, 0) / quarter.length)
        : 0;
      return {
        group: `Group ${idx + 1}`,
        progress: avgProgress,
      };
    });
  })();

  const today = new Date().toLocaleDateString('en-CA');
  const todaysSessions = sessions
    .filter((s) => s.status === "scheduled" && s.date === today)
    .sort((a, b) => {
      const parseTime = (timeStr: string) => {
        const [time, period] = timeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
      };
      return parseTime(a.startTime) - parseTime(b.startTime);
    })
    .slice(0, 3);

  const recentActivities = activities.slice(0, 3);

  const avgClientProgress = clients.length > 0
    ? Math.round(clients.reduce((sum, c) => sum + c.progressScore, 0) / clients.length)
    : 0;

  const statsCards = [
    {
      title: "Total Clients",
      value: totalClients,
      subtitle: totalClients === 1 ? "active client" : "active clients",
      icon: Users,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
    },
    {
      title: "Active Sessions",
      value: activeSessions,
      subtitle: `${completedSessions} completed`,
      icon: Video,
      iconColor: "text-chart-2",
      iconBg: "bg-chart-2/10",
    },
    {
      title: "Success Rate",
      value: `${successRate}%`,
      subtitle: `${completedSessions}/${totalSessions} sessions`,
      icon: Trophy,
      iconColor: "text-chart-3",
      iconBg: "bg-chart-3/10",
    },
    {
      title: "Avg Progress",
      value: `${avgClientProgress}%`,
      subtitle: "client average",
      icon: TrendingUp,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
    },
  ];

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="bg-background">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Loading your dashboard...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-t-2 border-t-primary">
                <CardHeader className="pb-2">
                  <div className="h-4 bg-muted rounded animate-pulse w-24" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded animate-pulse w-32 mb-2" />
                  <div className="h-3 bg-muted rounded animate-pulse w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="h-6 bg-muted rounded animate-pulse w-48" />
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="h-6 bg-muted rounded animate-pulse w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-background">
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          <Card className="border-destructive">
            <CardContent className="py-12 sm:py-16 text-center">
              <TrendingUp className="w-16 h-16 mx-auto text-destructive mb-4" />
              <p className="text-lg font-medium text-foreground">Failed to load dashboard</p>
              <p className="text-sm text-muted-foreground mt-1">
                Please try refreshing the page
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Welcome back! Here's what's happening with your clients today.</p>
        </div>

        <StatGrid columns={{ base: 1, md: 2, lg: 4 }} gapClass="gap-4">
          {statsCards.map((stat, index) => (
            <Card key={stat.title} className="border-t-2 border-t-primary" data-testid={`card-stat-${index}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.iconBg}`}>
                  <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid={`text-stat-${index}-value`}>{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.subtitle}
                </p>
              </CardContent>
            </Card>
          ))}
        </StatGrid>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card className="lg:col-span-2" data-testid="card-progress-overview">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="text-base sm:text-lg">Client Progress Distribution</CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground">Grouped by performance level</p>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="group" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="progress"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={3}
                    name="Average Progress Score"
                    dot={{ fill: "hsl(var(--chart-1))", r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card data-testid="card-todays-schedule">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Today's Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              {todaysSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No sessions scheduled for today</p>
              ) : (
                todaysSessions.map((session, index) => (
                  <div key={session.id} className="flex items-start gap-3" data-testid={`session-${index}`}>
                    <div className="w-1 h-14 sm:h-16 bg-primary rounded-full flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base text-foreground truncate">{session.clientName}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{session.sessionType}</p>
                      <p className="text-xs text-primary mt-1">
                        {session.startTime} - {session.endTime}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card className="lg:col-span-2" data-testid="card-recent-activities">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Recent Activities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              {recentActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No recent activities</p>
              ) : (
                recentActivities.map((activity, index) => (
                  <div key={activity.id} className="flex items-start gap-3 sm:gap-4" data-testid={`activity-${index}`}>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                      <span className="text-xs sm:text-sm font-semibold text-accent-foreground">
                        {getInitials(activity.clientName)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm">
                        <span className="font-medium text-primary">{activity.clientName}</span>{" "}
                        <span className="text-muted-foreground">{activity.description}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{activity.timestamp}</p>
                    </div>
                    {activity.status === "completed" && (
                      <span className="text-xs bg-chart-3/10 text-chart-3 px-2 py-1 rounded-full font-medium flex-shrink-0">
                        Completed
                      </span>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <GoalsDashboardWidget />
        </div>

        <AIInsightsCard clients={clients} />
      </div>
    </div>
  );
}

function AIInsightsCard({ clients }: { clients: Client[] }) {
  const { data: allInsights, isLoading } = useQuery<EnhancedClientInsight[]>({
    queryKey: ["/api/dashboard/insights"],
    queryFn: async () => {
      if (clients.length === 0) return [];
      const insightPromises = clients.slice(0, 5).map(async (client) => {
        try {
          const response = await fetch(`/api/clients/${client.id}/insights`, { credentials: 'include' });
          if (!response.ok) return null;
          return response.json();
        } catch {
          return null;
        }
      });
      const results = await Promise.all(insightPromises);
      return results.filter((r): r is EnhancedClientInsight => r !== null && r.quickStats?.totalDataPoints > 0);
    },
    enabled: clients.length > 0,
    staleTime: 5 * 60 * 1000,
  });

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
        return "bg-emerald-500/20 text-emerald-300";
      case "declining":
      case "at_risk":
        return "bg-rose-500/20 text-rose-300";
      case "behind":
        return "bg-amber-500/20 text-amber-300";
      default:
        return "bg-white/20 text-white";
    }
  };

  const hasData = allInsights && allInsights.length > 0;
  const totalDataPoints = hasData ? allInsights.reduce((sum, i) => sum + (i.quickStats?.totalDataPoints || 0), 0) : 0;
  const improvingClients = hasData ? allInsights.filter(i => i.quickStats?.overallTrend === "improving").length : 0;
  const avgConsistency = hasData ? Math.round(allInsights.reduce((sum, i) => sum + (i.quickStats?.trackingConsistency || 0), 0) / allInsights.length) : 0;

  const topGoalPredictions = hasData
    ? allInsights
        .flatMap(i => i.goalPredictions?.map(g => ({ ...g, clientName: i.clientName })) || [])
        .filter(g => g.successProbability > 0)
        .sort((a, b) => b.progressPercent - a.progressPercent)
        .slice(0, 3)
    : [];

  const significantTrends = hasData
    ? allInsights
        .flatMap(i => i.trends?.filter(t => t.confidence > 0.6).map(t => ({ ...t, clientName: i.clientName })) || [])
        .slice(0, 3)
    : [];

  return (
    <Card className="bg-gradient-to-br from-primary to-primary/80 text-white" data-testid="card-ai-insights">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            <CardTitle className="text-white">AI Insights</CardTitle>
          </div>
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasData ? (
          <div className="text-center py-4">
            <ActivityIcon className="w-10 h-10 mx-auto mb-2 opacity-60" />
            <p className="text-sm text-white/90">
              {clients.length === 0
                ? "Add clients to see AI-powered insights and trend analysis."
                : "Waiting for client data... Insights will appear once clients log activities via the AI Tracker."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white/10 rounded-lg p-2">
                <p className="text-xl font-bold">{totalDataPoints}</p>
                <p className="text-xs text-white/70">Data Points</p>
              </div>
              <div className="bg-white/10 rounded-lg p-2">
                <p className="text-xl font-bold">{improvingClients}/{allInsights.length}</p>
                <p className="text-xs text-white/70">Improving</p>
              </div>
              <div className="bg-white/10 rounded-lg p-2">
                <p className="text-xl font-bold">{avgConsistency}%</p>
                <p className="text-xs text-white/70">Consistency</p>
              </div>
            </div>

            {topGoalPredictions.length > 0 && (
              <div className="border-t border-white/20 pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4" />
                  <p className="font-semibold text-sm">Goal Progress Predictions</p>
                </div>
                <div className="space-y-2">
                  {topGoalPredictions.map((goal, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm bg-white/5 rounded px-2 py-1">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{goal.clientName}</p>
                        <p className="text-xs text-white/70 truncate">{goal.goalTitle}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs">{goal.progressPercent}%</span>
                        <Badge variant="secondary" className={`text-[10px] px-1 py-0 ${getTrendColor(goal.trend)}`}>
                          {getTrendIcon(goal.trend)}
                          <span className="ml-1">{Math.round(goal.successProbability * 100)}%</span>
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {significantTrends.length > 0 && (
              <div className="border-t border-white/20 pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <p className="font-semibold text-sm">Detected Trends</p>
                </div>
                <div className="space-y-2">
                  {significantTrends.map((trend, idx) => (
                    <div key={idx} className="text-sm bg-white/5 rounded px-2 py-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{trend.clientName}</span>
                        <Badge variant="secondary" className={`text-[10px] px-1 py-0 ${getTrendColor(trend.trend)}`}>
                          {getTrendIcon(trend.trend)}
                          <span className="ml-1 capitalize">{trend.category}</span>
                        </Badge>
                      </div>
                      <p className="text-xs text-white/70 mt-0.5">{trend.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {allInsights.some(i => i.quickStats?.topOpportunity) && (
              <div className="border-t border-white/20 pt-3">
                <p className="font-semibold text-sm flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Recommendations
                </p>
                <ul className="mt-2 space-y-1">
                  {allInsights
                    .filter(i => i.quickStats?.topOpportunity)
                    .slice(0, 2)
                    .map((insight, idx) => (
                      <li key={idx} className="text-xs text-white/90">
                        <span className="font-medium">{insight.clientName}:</span> {insight.quickStats.topOpportunity}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
