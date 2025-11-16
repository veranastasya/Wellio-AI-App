import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, TrendingDown, Target, Award, Calendar, Users } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useState } from "react";
import type { Client, Session } from "@shared/schema";

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("30");

  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });

  if (clientsLoading || sessionsLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const getDaysAgo = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  };

  const filterByTimeRange = () => {
    const daysAgo = getDaysAgo(parseInt(timeRange));
    return sessions.filter((session) => {
      const sessionDate = new Date(session.date);
      return sessionDate >= daysAgo;
    });
  };

  const filteredSessions = filterByTimeRange();

  const activeClients = clients.filter((c) => c.status === "active").length;
  const avgProgress = clients.length > 0
    ? Math.round(clients.reduce((sum, c) => sum + c.progressScore, 0) / clients.length)
    : 0;

  const completedSessions = filteredSessions.filter((s) => s.status === "completed").length;
  const totalFilteredSessions = filteredSessions.length;
  const completionRate = totalFilteredSessions > 0 
    ? Math.round((completedSessions / totalFilteredSessions) * 100) 
    : 0;

  const clientsAbove80 = clients.filter((c) => c.progressScore >= 80).length;

  const goalDistribution = clients.reduce((acc, client) => {
    const goal = client.goalType || "Unknown";
    acc[goal] = (acc[goal] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(goalDistribution).map(([name, value]) => ({
    name,
    value,
  }));

  const COLORS = ['#28A0AE', '#E2F9AD', '#7FB3D5', '#F4A460', '#9370DB'];

  const progressTrend = clients
    .sort((a, b) => a.progressScore - b.progressScore)
    .map((client) => ({
      name: client.name.split(" ")[0],
      progress: client.progressScore,
      goal: client.goalType,
    }));

  const generateMonthlyData = () => {
    const months = [];
    const daysInRange = parseInt(timeRange);
    const monthCount = Math.min(Math.ceil(daysInRange / 30), 6);
    const rangeStart = getDaysAgo(daysInRange);
    
    for (let i = monthCount - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      if (monthEnd < rangeStart) continue;
      
      const monthSessions = filteredSessions.filter((s) => {
        const sessionDate = new Date(s.date);
        return sessionDate >= monthStart && sessionDate <= monthEnd;
      });
      
      const completedInMonth = monthSessions.filter((s) => s.status === "completed").length;
      
      const avgProgressSnapshot = clients.length > 0 
        ? Math.round(clients.reduce((sum, c) => sum + c.progressScore, 0) / clients.length)
        : 0;
      
      months.push({
        month: monthName,
        avgProgress: avgProgressSnapshot,
        sessions: completedInMonth,
      });
    }
    
    return months.filter(m => m);
  };

  const monthlyData = generateMonthlyData();

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="heading-analytics">
            Progress Analytics
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Comprehensive client performance insights and metrics
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-timerange">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight" data-testid="metric-active-clients">{activeClients}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {clients.length} total clients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Progress</CardTitle>
            <Target className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight" data-testid="metric-avg-progress">{avgProgress}%</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-green-600" />
              <p className="text-xs text-green-600">+5% from last month</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Session Completion</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight" data-testid="metric-completion-rate">{completionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {completedSessions} of {totalFilteredSessions} sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performers</CardTitle>
            <Award className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight" data-testid="metric-top-performers">{clientsAbove80}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Clients above 80% progress
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Progress Trend Over Time</CardTitle>
            <p className="text-sm text-muted-foreground">
              Average client progress by month
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avgProgress"
                  stroke="#28A0AE"
                  strokeWidth={2}
                  name="Avg Progress (%)"
                  dot={{ fill: '#28A0AE' }}
                />
                <Line
                  type="monotone"
                  dataKey="sessions"
                  stroke="#E2F9AD"
                  strokeWidth={2}
                  name="Sessions"
                  dot={{ fill: '#E2F9AD' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Goal Distribution</CardTitle>
            <p className="text-sm text-muted-foreground">
              Client goals breakdown
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Individual Client Performance</CardTitle>
          <p className="text-sm text-muted-foreground">
            Current progress scores sorted by performance
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={progressTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                }}
              />
              <Bar dataKey="progress" fill="#28A0AE" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Performance Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-900 dark:text-green-100">Excellent Progress</p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {clientsAbove80} clients maintaining 80%+ progress scores
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <Target className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">Goal Completion Rate</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {completionRate}% of scheduled sessions completed successfully
                </p>
              </div>
            </div>

            {clients.filter((c) => c.progressScore < 50).length > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <TrendingDown className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900 dark:text-amber-100">Attention Needed</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    {clients.filter((c) => c.progressScore < 50).length} clients below 50% progress - consider intervention
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Achievement Badges</CardTitle>
            <p className="text-sm text-muted-foreground">
              Recognition milestones reached
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-card border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                  <Award className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium">Top Performer</p>
                  <p className="text-xs text-muted-foreground">90%+ Progress Score</p>
                </div>
              </div>
              <Badge variant="secondary" data-testid="badge-top-performer">
                {clients.filter((c) => c.progressScore >= 90).length} clients
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-card border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Goal Achiever</p>
                  <p className="text-xs text-muted-foreground">75-89% Progress</p>
                </div>
              </div>
              <Badge variant="secondary" data-testid="badge-goal-achiever">
                {clients.filter((c) => c.progressScore >= 75 && c.progressScore < 90).length} clients
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-card border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">On Track</p>
                  <p className="text-xs text-muted-foreground">50-74% Progress</p>
                </div>
              </div>
              <Badge variant="secondary" data-testid="badge-on-track">
                {clients.filter((c) => c.progressScore >= 50 && c.progressScore < 75).length} clients
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
