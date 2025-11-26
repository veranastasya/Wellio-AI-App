import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Dumbbell, Flame, TrendingUp, Trophy, Apple, Droplets, MessageSquare, Calendar } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Client, SmartLog, ProgressEvent } from "@shared/schema";
import { format, subDays, parseISO, isToday, isYesterday, differenceInDays } from "date-fns";

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
