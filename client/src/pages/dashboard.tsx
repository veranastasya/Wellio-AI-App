import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Video, Trophy, DollarSign, Lightbulb, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { Client, Session, Activity } from "@shared/schema";

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
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Loading your dashboard...</p>
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
        <div className="max-w-7xl mx-auto p-6">
          <Card className="border-destructive">
            <CardContent className="py-16 text-center">
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
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's what's happening with your clients today.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <div className="text-3xl font-bold tracking-tight" data-testid={`text-stat-${index}-value`}>{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.subtitle}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2" data-testid="card-progress-overview">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Client Progress Distribution</CardTitle>
                <p className="text-sm text-muted-foreground">Grouped by performance level</p>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
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
              <CardTitle>Today's Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {todaysSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No sessions scheduled for today</p>
              ) : (
                todaysSessions.map((session, index) => (
                  <div key={session.id} className="flex items-start gap-3" data-testid={`session-${index}`}>
                    <div className="w-1 h-16 bg-primary rounded-full" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{session.clientName}</p>
                      <p className="text-sm text-muted-foreground">{session.sessionType}</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2" data-testid="card-recent-activities">
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No recent activities</p>
              ) : (
                recentActivities.map((activity, index) => (
                  <div key={activity.id} className="flex items-start gap-4" data-testid={`activity-${index}`}>
                    <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-accent-foreground">
                        {getInitials(activity.clientName)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium text-primary">{activity.clientName}</span>{" "}
                        <span className="text-muted-foreground">{activity.description}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{activity.timestamp}</p>
                    </div>
                    {activity.status === "completed" && (
                      <span className="text-xs bg-chart-3/10 text-chart-3 px-2 py-1 rounded-full font-medium">
                        Completed
                      </span>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary to-primary/80 text-white" data-testid="card-ai-insights">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                <CardTitle className="text-white">AI Insights</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-semibold text-white">Progress Overview</p>
                <p className="text-sm text-white/90 mt-1">
                  {clients.length > 0
                    ? `Average client progress: ${Math.round(clients.reduce((sum, c) => sum + c.progressScore, 0) / clients.length)}%. ${clients.filter(c => c.progressScore < 70).length} clients may benefit from plan adjustments.`
                    : "Add clients to see AI-powered insights and recommendations."}
                </p>
              </div>
              {clients.length > 0 && (
                <div className="border-t border-white/20 pt-3">
                  <p className="text-sm text-white/90">
                    {clients.filter(c => c.progressScore < 70).length > 0
                      ? `Consider scheduling check-ins with clients below 70% progress to re-evaluate their programs.`
                      : "All clients are making excellent progress! Keep up the great work."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
