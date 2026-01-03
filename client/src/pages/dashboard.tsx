import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  TrendingUp, 
  Calendar,
  MessageSquare,
  ChevronRight,
  FileText,
  Lightbulb,
  Plus
} from "lucide-react";
import { Link } from "wouter";
import type { Client, Session, Message, Coach, SupportedLanguage, WeeklyScheduleItem } from "@shared/schema";
import { COACH_UI_TRANSLATIONS } from "@shared/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { HybridOnboarding } from "@/components/onboarding";
import { queryClient } from "@/lib/queryClient";

export default function Dashboard() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  const { data: coachProfile } = useQuery<Omit<Coach, "passwordHash">>({
    queryKey: ["/api/coach/profile"],
  });

  // Translations
  const lang = (coachProfile?.preferredLanguage || "en") as SupportedLanguage;
  const t = COACH_UI_TRANSLATIONS;
  
  useEffect(() => {
    if (coachProfile && !coachProfile.onboardingCompleted) {
      setShowOnboarding(true);
    }
  }, [coachProfile]);
  
  const handleOnboardingComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/coach/profile"] });
    setShowOnboarding(false);
  };
  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  const { data: scheduleItems = [] } = useQuery<WeeklyScheduleItem[]>({
    queryKey: ["/api/weekly-schedule-items"],
  });

  const isLoading = clientsLoading || sessionsLoading;

  const totalClients = clients.length;
  const activePrograms = clients.filter(c => c.status === "active").length;
  
  const today = new Date();
  const todayStr = today.toLocaleDateString('en-CA'); // YYYY-MM-DD format
  const tomorrowStr = new Date(today.getTime() + 86400000).toLocaleDateString('en-CA');
  
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  const thisWeekSessions = sessions.filter(s => {
    const sessionDate = new Date(s.date);
    return sessionDate >= weekStart && sessionDate <= weekEnd;
  }).length;

  const unreadMessages = messages.filter(m => !m.read && m.sender !== "coach").length;

  // Filter out clients with ended programs (endDate in the past)
  // Use direct string comparison (YYYY-MM-DD format) to avoid timezone issues
  const activeClients = clients.filter(c => {
    if (!c.endDate) return true; // No end date = active
    // c.endDate is already in YYYY-MM-DD format from the database
    return c.endDate >= todayStr; // End date today or future = still active
  });

  const avgClientProgress = activeClients.length > 0
    ? Math.round(activeClients.reduce((sum, c) => sum + c.progressScore, 0) / activeClients.length)
    : 0;

  // Get client IDs of active clients for filtering schedule items
  const activeClientIds = new Set(activeClients.map(c => c.id));
  
  // Filter schedule items to only include those from active clients
  const activeScheduleItems = scheduleItems.filter(item => activeClientIds.has(item.clientId));
  
  // Completion rate: completed schedule items / total schedule items for active clients
  const completedItems = activeScheduleItems.filter(item => item.completed).length;
  const totalItems = activeScheduleItems.length;
  const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  
  const upcomingSessions = sessions
    .filter(s => s.status === "scheduled" && (s.date === todayStr || s.date === tomorrowStr))
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    })
    .slice(0, 4);

  const recentClients = [...clients]
    .sort((a, b) => b.progressScore - a.progressScore)
    .slice(0, 4);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Check if client is within grace period (new client: <5 days old)
  const isWithinGracePeriod = (client: Client) => {
    // If no joinedDate, assume NOT in grace period (show actual status)
    if (!client.joinedDate) return false;
    const joinedDate = new Date(client.joinedDate);
    // Guard against invalid dates
    if (isNaN(joinedDate.getTime())) return false;
    const now = new Date();
    const daysSinceJoined = Math.floor((now.getTime() - joinedDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceJoined < 5;
  };

  const getStatusBadge = (progress: number, client?: Client) => {
    if (progress >= 80) return { label: t.dashboard.excellent[lang], color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" };
    if (progress >= 50) return { label: t.dashboard.onTrack[lang], color: "bg-primary/20 text-primary dark:bg-primary/30" };
    // Check for grace period - show "Getting Started" instead of "Needs Attention" for new clients
    if (progress > 0 && client && isWithinGracePeriod(client)) {
      return { label: t.dashboard.gettingStarted[lang], color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" };
    }
    return { label: t.dashboard.needsAttention[lang], color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
  };

  const avatarColors = [
    "bg-primary text-primary-foreground",
    "bg-accent text-accent-foreground", 
    "bg-purple-500 text-white",
    "bg-orange-500 text-white",
  ];

  const formatSessionTime = (date: string, time: string) => {
    const isToday = date === todayStr;
    const isTomorrow = date === tomorrowStr;
    const dayLabel = isToday ? t.dashboard.today[lang] : isTomorrow ? t.dashboard.tomorrow[lang] : date;
    return `${dayLabel}, ${time}`;
  };

  const formatSessionType = (sessionType: string | null) => {
    if (!sessionType) return t.dashboard.session[lang];
    const labels: Record<string, string> = {
      "video": t.dashboard.videoCall[lang],
      "in-person": t.dashboard.inPerson[lang],
      "follow_up": t.dashboard.followUp[lang],
      "initial": t.dashboard.initialConsultation[lang],
      "check_in": t.dashboard.checkIn[lang],
      "assessment": t.dashboard.assessment[lang],
      "coaching": t.dashboard.coaching[lang],
    };
    return labels[sessionType] || sessionType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  };

  const formatLastActive = (lastActiveAt: string | null | undefined) => {
    if (!lastActiveAt) return t.dashboard.never[lang];
    
    const lastActive = new Date(lastActiveAt);
    const now = new Date();
    const diffMs = now.getTime() - lastActive.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return t.dashboard.justNow[lang];
    if (diffMins < 60) return `${diffMins} ${t.dashboard.minAgo[lang]}`;
    if (diffHours < 24) return `${diffHours} ${diffHours > 1 ? t.dashboard.hoursAgo[lang] : t.dashboard.hourAgo[lang]}`;
    if (diffDays < 7) return `${diffDays} ${diffDays > 1 ? t.dashboard.daysAgo[lang] : t.dashboard.dayAgo[lang]}`;
    return lastActive.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
          <div className="h-8 bg-muted rounded animate-pulse w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="h-16 bg-muted rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {showOnboarding && (
        <HybridOnboarding 
          isCoach={true}
          userId="coach"
          userName="Coach"
          onComplete={handleOnboardingComplete}
        />
      )}
      <div className="bg-background min-h-screen">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Welcome Header */}
        <div data-testid="dashboard-welcome">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground" data-testid="text-dashboard-title">
            {t.dashboard.welcomeBack[lang]}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {t.dashboard.subtitle[lang]}
          </p>
        </div>

        {/* Top Stats Row - 4 Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card data-testid="card-stat-clients">
            <CardContent className="p-4 sm:p-6">
              <div className="p-2 rounded-lg bg-primary/10 w-fit">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div className="mt-3">
                <p className="text-2xl sm:text-3xl font-bold text-foreground">{totalClients}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{t.dashboard.totalClients[lang]}</p>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-programs">
            <CardContent className="p-4 sm:p-6">
              <div className="p-2 rounded-lg bg-chart-2/10 w-fit">
                <TrendingUp className="w-5 h-5 text-chart-2" />
              </div>
              <div className="mt-3">
                <p className="text-2xl sm:text-3xl font-bold text-foreground">{activePrograms}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{t.dashboard.activePrograms[lang]}</p>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-sessions">
            <CardContent className="p-4 sm:p-6">
              <div className="p-2 rounded-lg bg-chart-3/10 w-fit">
                <Calendar className="w-5 h-5 text-chart-3" />
              </div>
              <div className="mt-3">
                <p className="text-2xl sm:text-3xl font-bold text-foreground">{thisWeekSessions}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{t.dashboard.thisWeekSessions[lang]}</p>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-messages">
            <CardContent className="p-4 sm:p-6">
              <div className="p-2 rounded-lg bg-chart-4/10 w-fit">
                <MessageSquare className="w-5 h-5 text-chart-4" />
              </div>
              <div className="mt-3">
                <p className="text-2xl sm:text-3xl font-bold text-foreground">{unreadMessages}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{t.dashboard.unreadMessages[lang]}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Cards Row - 2 Colored Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-primary rounded-xl p-4 sm:p-6 text-primary-foreground" data-testid="card-avg-progress">
            <p className="text-sm font-medium opacity-90">{t.dashboard.avgClientProgress[lang]}</p>
            <p className="text-3xl sm:text-4xl font-bold mt-1">{avgClientProgress}%</p>
          </div>

          <div className="bg-primary rounded-xl p-4 sm:p-6 text-primary-foreground" data-testid="card-completion-rate">
            <p className="text-sm font-medium opacity-90">{t.dashboard.completionRate[lang]}</p>
            <p className="text-3xl sm:text-4xl font-bold mt-1">{completionRate}%</p>
          </div>

        </div>

        {/* Two Column Layout: Recent Activity + Upcoming Sessions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Client Activity */}
          <Card data-testid="card-recent-activity">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
              <CardTitle className="text-base sm:text-lg">{t.dashboard.recentClientActivity[lang]}</CardTitle>
              <Link href="/clients">
                <Button variant="ghost" size="sm" className="text-primary h-auto px-2">
                  {t.dashboard.viewAll[lang]}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentClients.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t.dashboard.noClientsYet[lang]}
                </p>
              ) : (
                recentClients.map((client, index) => {
                  const status = getStatusBadge(client.progressScore, client);
                  
                  return (
                    <div key={client.id} className="flex items-center gap-3" data-testid={`client-activity-${client.id}`}>
                      <Avatar className={`w-10 h-10 ${avatarColors[index % avatarColors.length]}`}>
                        <AvatarFallback className={avatarColors[index % avatarColors.length]}>
                          {getInitials(client.name)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm truncate">{client.name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{t.dashboard.active[lang]} {formatLastActive(client.lastActiveAt)}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${client.progressScore}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8">{client.progressScore}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Upcoming Sessions */}
          <Card data-testid="card-upcoming-sessions">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
              <CardTitle className="text-base sm:text-lg">{t.dashboard.upcomingSessions[lang]}</CardTitle>
              <Link href="/scheduling">
                <Button variant="ghost" size="sm" className="text-primary h-auto px-2">
                  {t.dashboard.viewCalendar[lang]}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t.dashboard.noUpcomingSessions[lang]}
                </p>
              ) : (
                upcomingSessions.map((session) => (
                  <div key={session.id} className="flex items-start justify-between gap-3" data-testid={`session-${session.id}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{session.clientName}</p>
                      <p className="text-xs text-primary">{formatSessionTime(session.date, session.startTime)}</p>
                      <p className="text-xs text-muted-foreground">{formatSessionType(session.sessionType)}</p>
                    </div>
                  </div>
                ))
              )}
              
              <Link href="/scheduling" className="block">
                <Button 
                  variant="outline" 
                  className="w-full mt-2 border-primary text-primary hover:bg-primary/10"
                  data-testid="button-schedule-session"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t.dashboard.scheduleNewSession[lang]}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div data-testid="quick-actions">
          <h2 className="text-sm font-medium text-muted-foreground mb-4">{t.dashboard.quickActions[lang]}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/clients">
              <Card className="hover-elevate cursor-pointer h-full" data-testid="action-manage-clients">
                <CardContent className="p-4 sm:p-6 flex flex-col items-center text-center">
                  <div className="p-3 rounded-lg bg-muted mb-3">
                    <Users className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">{t.dashboard.manageClients[lang]}</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/questionnaires">
              <Card className="hover-elevate cursor-pointer h-full" data-testid="action-create-questionnaire">
                <CardContent className="p-4 sm:p-6 flex flex-col items-center text-center">
                  <div className="p-3 rounded-lg bg-muted mb-3">
                    <FileText className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">{t.dashboard.createQuestionnaire[lang]}</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/communication">
              <Card className="hover-elevate cursor-pointer h-full" data-testid="action-message-clients">
                <CardContent className="p-4 sm:p-6 flex flex-col items-center text-center">
                  <div className="p-3 rounded-lg bg-muted mb-3">
                    <MessageSquare className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">{t.dashboard.messageClients[lang]}</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/ai-insights">
              <Card className="hover-elevate cursor-pointer h-full" data-testid="action-view-insights">
                <CardContent className="p-4 sm:p-6 flex flex-col items-center text-center">
                  <div className="p-3 rounded-lg bg-muted mb-3">
                    <Lightbulb className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">{t.dashboard.viewAIInsights[lang]}</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
