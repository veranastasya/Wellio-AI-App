import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, LogOut, User, Mail, Phone, Bell, BellOff, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCoachPushNotifications } from "@/hooks/useCoachPushNotifications";

interface CoachProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

export default function CoachSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
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
      });
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; phone: string }) => {
      const response = await apiRequest("PATCH", "/api/coach/profile", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach/profile"] });
      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
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
        title: "Error",
        description: "Failed to log out. Please try again.",
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
            Settings
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage your coach profile and account
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
                <span className="text-xl">Profile Information</span>
                <CardDescription className="mt-0.5">
                  Update your name and contact details
                </CardDescription>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="input-coach-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
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
                  Phone Number
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
                Save Changes
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
                <span className="text-lg">Push Notifications</span>
                <CardDescription className="mt-0.5">
                  Get notified when clients message you
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
                      <Badge variant="outline" className="gap-1" data-testid="badge-notifications-enabled">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        Enabled
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1" data-testid="badge-notifications-disabled">
                        <BellOff className="w-3 h-3 text-muted-foreground" />
                        Disabled
                      </Badge>
                    )}
                  </div>
                  {permission === "denied" && (
                    <Badge variant="destructive" className="gap-1" data-testid="badge-permission-denied">
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
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/coach/push/test', {
                            method: 'POST',
                            credentials: 'include',
                          });
                          const data = await response.json();
                          if (data.success) {
                            toast({
                              title: 'Test Sent',
                              description: data.message,
                            });
                          } else {
                            toast({
                              title: 'Test Failed',
                              description: data.error || 'Failed to send test notification',
                              variant: 'destructive',
                            });
                          }
                        } catch {
                          toast({
                            title: 'Error',
                            description: 'Failed to send test notification',
                            variant: 'destructive',
                          });
                        }
                      }}
                      data-testid="button-test-notification"
                    >
                      <Bell className="w-4 h-4" />
                      Send Test Notification
                    </Button>
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
                      Disable Notifications
                    </Button>
                  </div>
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
                    Enable Notifications
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account</CardTitle>
            <CardDescription>
              Sign out of your coach account
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
              Log Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
