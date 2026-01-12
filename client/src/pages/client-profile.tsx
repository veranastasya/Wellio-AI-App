import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Mail, Phone, Calendar, User, Scale, Ruler, Target, Bell, BellOff, CheckCircle, XCircle, AlertCircle, HelpCircle, Globe } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@shared/schema";
import { getGoalTypeLabel, getGoalTypeLabelTranslated, getActivityLevelLabel, SUPPORTED_LANGUAGES, LANGUAGE_NATIVE_LABELS, CLIENT_UI_TRANSLATIONS, COMMON_TIMEZONES, type SupportedLanguage } from "@shared/schema";
import { type UnitsPreference, UNITS_LABELS, UNITS_LABELS_TRANSLATED, formatWeight, formatHeight } from "@shared/units";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { HybridOnboarding } from "@/components/onboarding";
import { syncLanguage } from "@/lib/i18n";

export default function ClientProfile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [clientData, setClientData] = useState<Client | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [unitsPreference, setUnitsPreference] = useState<UnitsPreference>("metric");
  const [showTour, setShowTour] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState<SupportedLanguage>("en");
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);
  const [timezone, setTimezone] = useState("America/New_York");
  const [isSavingTimezone, setIsSavingTimezone] = useState(false);
  const {
    isSupported,
    isSubscribed,
    permission,
    isLoading: isPushLoading,
    subscribe,
    unsubscribe,
  } = usePushNotifications();
  
  // Translation helper
  const lang = preferredLanguage;
  const t = CLIENT_UI_TRANSLATIONS;

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
      if (data.client.unitsPreference) {
        setUnitsPreference(data.client.unitsPreference as UnitsPreference);
      }
      if (data.client.preferredLanguage) {
        setPreferredLanguage(data.client.preferredLanguage as SupportedLanguage);
      }
      if (data.client.timezone) {
        setTimezone(data.client.timezone);
      }
    } catch (error) {
      localStorage.removeItem("clientId");
      localStorage.removeItem("clientEmail");
      setLocation("/client/login");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRetakeTour = async () => {
    if (!clientData?.id) {
      toast({
        title: "Error",
        description: "Unable to start tour. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const response = await apiRequest("PATCH", `/api/clients/${clientData.id}`, {
        onboardingCompleted: false,
      });
      
      if (!response.ok) {
        throw new Error("Failed to reset onboarding");
      }
      
      setShowTour(true);
    } catch (error) {
      console.error("Failed to start app tour:", error);
      toast({
        title: "Error",
        description: "Failed to start app tour. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTourComplete = async () => {
    await loadClient();
    setShowTour(false);
  };

  const handleLanguageChange = async (newLanguage: SupportedLanguage) => {
    if (!clientData?.id) return;
    
    setIsSavingLanguage(true);
    try {
      const response = await apiRequest("PATCH", `/api/client-auth/me`, {
        preferredLanguage: newLanguage,
      });
      
      if (!response.ok) {
        throw new Error("Failed to update language preference");
      }
      
      setPreferredLanguage(newLanguage);
      setClientData({ ...clientData, preferredLanguage: newLanguage });
      queryClient.invalidateQueries({ queryKey: ["/api/client-auth/me"] });
      syncLanguage(newLanguage);
      
      toast({
        title: "Language updated",
        description: `AI responses will now be in ${LANGUAGE_NATIVE_LABELS[newLanguage]}`,
      });
    } catch (error) {
      console.error("Failed to update language:", error);
      toast({
        title: "Error",
        description: "Failed to update language preference. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingLanguage(false);
    }
  };

  const handleTimezoneChange = async (newTimezone: string) => {
    if (!clientData?.id) return;
    
    setIsSavingTimezone(true);
    try {
      const response = await apiRequest("PATCH", `/api/client-auth/me`, {
        timezone: newTimezone,
      });
      
      if (!response.ok) {
        throw new Error("Failed to update timezone");
      }
      
      setTimezone(newTimezone);
      setClientData({ ...clientData, timezone: newTimezone });
      queryClient.invalidateQueries({ queryKey: ["/api/client-auth/me"] });
      
      const tzLabel = COMMON_TIMEZONES.find(tz => tz.value === newTimezone)?.label || newTimezone;
      toast({
        title: "Timezone updated",
        description: `Session times will display in ${tzLabel}`,
      });
    } catch (error) {
      console.error("Failed to update timezone:", error);
      toast({
        title: "Error",
        description: "Failed to update timezone. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingTimezone(false);
    }
  };

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

  const initials = clientData.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const memberSinceDate = new Date(clientData.joinedDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const currentWeight = clientData.weight || 0;
  const targetWeight = clientData.targetWeight || clientData.goalWeight || currentWeight;
  const weightDiff = currentWeight - targetWeight;
  const startWeight = currentWeight + 10;
  const totalToLose = startWeight - targetWeight;
  const progressPercent = totalToLose > 0 ? Math.min(100, Math.max(0, ((startWeight - currentWeight) / totalToLose) * 100)) : 0;

  const goals = [];
  if (clientData.goalType) {
    goals.push(getGoalTypeLabelTranslated(clientData.goalType, lang, clientData.goalDescription));
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground" data-testid="text-profile-title">
              {t.profile.title[lang]}
            </h1>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 sm:w-20 sm:h-20 bg-violet-500">
                <AvatarFallback className="bg-violet-500 text-white text-xl sm:text-2xl font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold text-foreground" data-testid="text-client-name">
                  {clientData.name}
                </h2>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                  <Calendar className="w-4 h-4" />
                  {t.profile.memberSince[lang]} {memberSinceDate}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">{t.profile.contactInfo[lang]}</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">{t.profile.email[lang]}</p>
                  <p className="text-base text-foreground" data-testid="text-client-email">
                    {clientData.email}
                  </p>
                </div>
              </div>
              {clientData.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t.profile.phone[lang]}</p>
                    <p className="text-base text-foreground" data-testid="text-client-phone">
                      {clientData.phone}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {(clientData.age || clientData.height || clientData.weight || clientData.targetWeight) && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">{t.profile.physicalStats[lang]}</h3>
                <Select value={unitsPreference} onValueChange={(v) => setUnitsPreference(v as UnitsPreference)}>
                  <SelectTrigger className="w-[120px]" data-testid="select-units-preference">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us">{UNITS_LABELS_TRANSLATED[lang].us}</SelectItem>
                    <SelectItem value="metric">{UNITS_LABELS_TRANSLATED[lang].metric}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {clientData.age && (
                  <div className="bg-violet-50 dark:bg-violet-950/30 rounded-xl p-4" data-testid="stat-age">
                    <div className="flex items-center gap-1.5 mb-2">
                      <User className="w-4 h-4 text-violet-500" />
                      <span className="text-sm font-medium text-violet-600 dark:text-violet-400">{t.profile.age[lang]}</span>
                    </div>
                    <p className="text-lg font-semibold text-foreground">{clientData.age} {t.profile.years[lang]}</p>
                  </div>
                )}
                
                {clientData.height && (
                  <div className="bg-teal-50 dark:bg-teal-950/30 rounded-xl p-4" data-testid="stat-height">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Ruler className="w-4 h-4 text-teal-500" />
                      <span className="text-sm font-medium text-teal-600 dark:text-teal-400">{t.profile.height[lang]}</span>
                    </div>
                    <p className="text-lg font-semibold text-foreground">
                      {formatHeight(clientData.height, unitsPreference)}
                    </p>
                  </div>
                )}
                
                {clientData.weight && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4" data-testid="stat-current">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Scale className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium text-amber-600 dark:text-amber-400">{t.profile.currentWeight[lang]}</span>
                    </div>
                    <p className="text-lg font-semibold text-foreground">
                      {formatWeight(clientData.weight, unitsPreference)}
                    </p>
                  </div>
                )}
                
                {(clientData.targetWeight || clientData.goalWeight) && (
                  <div className="bg-rose-50 dark:bg-rose-950/30 rounded-xl p-4" data-testid="stat-target">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Target className="w-4 h-4 text-rose-500" />
                      <span className="text-sm font-medium text-rose-600 dark:text-rose-400">{t.profile.targetWeight[lang]}</span>
                    </div>
                    <p className="text-lg font-semibold text-foreground">
                      {formatWeight(clientData.targetWeight || clientData.goalWeight || 0, unitsPreference)}
                    </p>
                  </div>
                )}
              </div>

              {clientData.weight && (clientData.targetWeight || clientData.goalWeight) && (
                <div className="bg-muted/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Progress to goal</span>
                    <span className="text-sm text-primary font-medium">
                      {weightDiff > 0 ? `-${formatWeight(weightDiff, unitsPreference).replace(/[^\d.]/g, '')}` : formatWeight(Math.abs(weightDiff), unitsPreference).replace(/[^\d.]/g, '')} of {formatWeight(totalToLose > 0 ? totalToLose : 10, unitsPreference)}
                    </span>
                  </div>
                  <Progress value={progressPercent} className="h-3" />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {(clientData.goalType || clientData.activityLevel || clientData.preferences) && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">{t.profile.goalsPreferences[lang]}</h3>
              
              {goals.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-2">{t.goals.myGoals[lang]}</p>
                  <div className="flex flex-wrap gap-2">
                    {goals.map((goal, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className="rounded-full px-3 py-1"
                        data-testid={`badge-goal-${index}`}
                      >
                        {goal}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {clientData.activityLevel && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Activity Level</p>
                    <p className="text-base font-medium text-foreground" data-testid="text-activity-level">
                      {getActivityLevelLabel(clientData.activityLevel)}
                    </p>
                  </div>
                )}
                
                {clientData.trainingExperience && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Training Experience</p>
                    <p className="text-base font-medium text-foreground capitalize" data-testid="text-training-experience">
                      {clientData.trainingExperience.replace(/_/g, " ")}
                    </p>
                  </div>
                )}
                
                {clientData.preferences?.dislikes && (
                  <div className="sm:col-span-2">
                    <p className="text-sm text-muted-foreground mb-1">Dietary Preferences</p>
                    <p className="text-base font-medium text-foreground capitalize" data-testid="text-dietary-preferences">
                      {clientData.preferences.dislikes}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="text-lg">Push Notifications</span>
                <CardDescription className="mt-0.5">
                  Get notified when your coach messages you
                </CardDescription>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isSupported ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <AlertCircle className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Not Supported</p>
                  <p className="text-sm text-muted-foreground">
                    Push notifications are not supported on this browser or device
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    {isSubscribed ? (
                      <Badge variant="outline" className="gap-1" data-testid="badge-client-notifications-enabled">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        Enabled
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1" data-testid="badge-client-notifications-disabled">
                        <BellOff className="w-3 h-3 text-muted-foreground" />
                        Disabled
                      </Badge>
                    )}
                  </div>
                  {permission === "denied" && (
                    <Badge variant="destructive" className="gap-1" data-testid="badge-client-permission-denied">
                      <XCircle className="w-3 h-3" />
                      Blocked
                    </Badge>
                  )}
                </div>

                {permission === "denied" ? (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm font-medium text-destructive mb-1">
                      Notifications Blocked
                    </p>
                    <p className="text-sm text-muted-foreground">
                      You have blocked notifications for this site. To enable them, click the lock icon in your browser's address bar and allow notifications.
                    </p>
                  </div>
                ) : isSubscribed ? (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={unsubscribe}
                    disabled={isPushLoading}
                    data-testid="button-client-disable-notifications"
                  >
                    {isPushLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <BellOff className="w-4 h-4" />
                    )}
                    Disable Notifications
                  </Button>
                ) : (
                  <Button
                    className="w-full gap-2"
                    onClick={subscribe}
                    disabled={isPushLoading}
                    data-testid="button-client-enable-notifications"
                  >
                    {isPushLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Bell className="w-4 h-4" />
                    )}
                    Enable Notifications
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <span className="text-lg">Language Preferences</span>
                <CardDescription className="mt-0.5">
                  Choose your language for AI responses
                </CardDescription>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">AI Response Language</p>
                <p className="text-sm text-muted-foreground">
                  AI Tracker and Insights will respond in this language
                </p>
              </div>
            </div>
            <Select 
              value={preferredLanguage} 
              onValueChange={(v) => handleLanguageChange(v as SupportedLanguage)}
              disabled={isSavingLanguage}
            >
              <SelectTrigger className="w-full" data-testid="select-preferred-language">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <SelectItem key={lang} value={lang} data-testid={`option-language-${lang}`}>
                    {LANGUAGE_NATIVE_LABELS[lang]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isSavingLanguage && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="text-lg">Timezone</span>
                <p className="text-sm text-muted-foreground font-normal">
                  Session times will display in your timezone
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select 
              value={timezone} 
              onValueChange={handleTimezoneChange}
              disabled={isSavingTimezone}
            >
              <SelectTrigger className="w-full" data-testid="select-timezone">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {COMMON_TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value} data-testid={`option-timezone-${tz.value}`}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isSavingTimezone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#28A0AE]/10 flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-[#28A0AE]" />
              </div>
              <div>
                <span className="text-lg">Help & Settings</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full gap-2"
              onClick={handleRetakeTour}
              data-testid="button-client-retake-tour"
            >
              <HelpCircle className="w-4 h-4" />
              Retake App Tour
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Learn about features and navigation again
            </p>
          </CardContent>
        </Card>
      </div>

      {showTour && clientData && (
        <HybridOnboarding 
          isCoach={false}
          userId={clientData.id}
          userName={clientData.name}
          onComplete={handleTourComplete}
        />
      )}
    </div>
  );
}
