import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, LogOut, User, Mail, Phone, Bell, BellOff, CheckCircle, XCircle, AlertCircle, HelpCircle, Globe } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS, COACH_UI_TRANSLATIONS, COMMON_TIMEZONES, type SupportedLanguage, type Coach } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCoachPushNotifications } from "@/hooks/useCoachPushNotifications";
import { HybridOnboarding } from "@/components/onboarding";

interface CoachProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  onboardingCompleted?: boolean;
  preferredLanguage?: string;
  timezone?: string;
}

export default function CoachSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showTour, setShowTour] = useState(false);
  const {
    isSupported,
    isSubscribed,
    permission,
    isLoading: isPushLoading,
    subscribe,
    unsubscribe,
  } = useCoachPushNotifications();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    preferredLanguage: "en" as SupportedLanguage,
    timezone: "America/New_York",
  });

  const { data: profile, isLoading } = useQuery<CoachProfile>({
    queryKey: ["/api/coach/profile"],
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        preferredLanguage: (profile.preferredLanguage as SupportedLanguage) || "en",
        timezone: profile.timezone || "America/New_York",
      });
    }
  }, [profile]);

  const lang: SupportedLanguage = formData.preferredLanguage || "en";
  const t = COACH_UI_TRANSLATIONS.settings;

  const updateMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; phone: string; preferredLanguage: string; timezone: string }) => {
      const response = await apiRequest("PATCH", "/api/coach/profile", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach/profile"] });
      toast({
        title: t.profileUpdated[lang],
        description: t.profileUpdatedDescription[lang],
      });
    },
    onError: () => {
      toast({
        title: t.errorTitle[lang],
        description: t.errorUpdateProfile[lang],
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/coach/logout");
      return response.json();
    },
    onSuccess: () => {
      setLocation("/coach/login");
    },
    onError: () => {
      toast({
        title: t.errorTitle[lang],
        description: t.errorLogout[lang],
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleRetakeTour = async () => {
    try {
      await apiRequest("PATCH", "/api/coach/profile", {
        onboardingCompleted: false,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/coach/profile"] });
      setShowTour(true);
    } catch (error) {
      toast({
        title: t.errorTitle[lang],
        description: t.errorTour[lang],
        variant: "destructive",
      });
    }
  };

  const handleTourComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/coach/profile"] });
    setShowTour(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const initials = formData.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "C";

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground" data-testid="text-settings-title">
            {t.title[lang]}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {t.subtitle[lang]}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Avatar className="w-12 h-12 bg-primary">
                <AvatarFallback className="bg-primary text-primary-foreground text-lg font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <span className="text-xl">{t.profileInformation[lang]}</span>
                <CardDescription className="mt-0.5">
                  {t.profileDescription[lang]}
                </CardDescription>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {t.name[lang]}
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder={t.yourName[lang]}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="input-coach-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {t.email[lang]}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  data-testid="input-coach-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {t.phone[lang]}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  data-testid="input-coach-phone"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="language" className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  {t.preferredLanguage[lang]}
                </Label>
                <Select
                  value={formData.preferredLanguage}
                  onValueChange={(value) => setFormData({ ...formData, preferredLanguage: value as SupportedLanguage })}
                >
                  <SelectTrigger data-testid="select-coach-language">
                    <SelectValue placeholder={t.selectLanguage[lang]} />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_LANGUAGES.map((langOption) => (
                      <SelectItem key={langOption} value={langOption} data-testid={`option-language-${langOption}`}>
                        {LANGUAGE_LABELS[langOption]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone" className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  {t.timezone?.[lang] || "Timezone"}
                </Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                >
                  <SelectTrigger data-testid="select-coach-timezone">
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
              </div>

              <Button 
                type="submit" 
                className="w-full gap-2"
                disabled={updateMutation.isPending}
                data-testid="button-save-profile"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {t.saveChanges[lang]}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="text-lg">{t.pushNotifications[lang]}</span>
                <CardDescription className="mt-0.5">
                  {t.pushDescription[lang]}
                </CardDescription>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isSupported ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <AlertCircle className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">{t.notSupported[lang]}</p>
                  <p className="text-sm text-muted-foreground">
                    {t.notSupportedDescription[lang]}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{t.status[lang]}:</span>
                    {isSubscribed ? (
                      <Badge variant="outline" className="gap-1" data-testid="badge-notifications-enabled">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        {t.enabled[lang]}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1" data-testid="badge-notifications-disabled">
                        <BellOff className="w-3 h-3 text-muted-foreground" />
                        {t.disabled[lang]}
                      </Badge>
                    )}
                  </div>
                  {permission === "denied" && (
                    <Badge variant="destructive" className="gap-1" data-testid="badge-permission-denied">
                      <XCircle className="w-3 h-3" />
                      {t.blocked[lang]}
                    </Badge>
                  )}
                </div>

                {permission === "denied" ? (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm font-medium text-destructive mb-1">
                      {t.notificationsBlocked[lang]}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t.notificationsBlockedDescription[lang]}
                    </p>
                  </div>
                ) : isSubscribed ? (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={unsubscribe}
                    disabled={isPushLoading}
                    data-testid="button-disable-notifications"
                  >
                    {isPushLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <BellOff className="w-4 h-4" />
                    )}
                    {t.disableNotifications[lang]}
                  </Button>
                ) : (
                  <Button
                    className="w-full gap-2"
                    onClick={subscribe}
                    disabled={isPushLoading}
                    data-testid="button-enable-notifications"
                  >
                    {isPushLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Bell className="w-4 h-4" />
                    )}
                    {t.enableNotifications[lang]}
                  </Button>
                )}
              </>
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
                <span className="text-lg">{t.helpSettings[lang]}</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full gap-2"
              onClick={handleRetakeTour}
              data-testid="button-retake-tour"
            >
              <HelpCircle className="w-4 h-4" />
              {t.retakeAppTour[lang]}
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              {t.retakeDescription[lang]}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t.account[lang]}</CardTitle>
            <CardDescription>
              {t.accountDescription[lang]}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              data-testid="button-logout"
            >
              {logoutMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              {t.logOut[lang]}
            </Button>
          </CardContent>
        </Card>
      </div>

      {showTour && (
        <HybridOnboarding 
          isCoach={true}
          userId={profile?.id || "coach"}
          userName={profile?.name || "Coach"}
          onComplete={handleTourComplete}
        />
      )}
    </div>
  );
}
