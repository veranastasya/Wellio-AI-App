import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bell,
  Clock,
  Settings2,
  TestTube2,
  Info,
  Target,
  Calendar,
  Activity,
  Loader2,
  Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ClientReminderSettings } from "@shared/schema";

interface ReminderSettingsProps {
  clientId: string;
  clientName?: string;
}

export function ReminderSettings({ clientId, clientName }: ReminderSettingsProps) {
  const { toast } = useToast();
  const [hasChanges, setHasChanges] = useState(false);
  const [testingSending, setTestingSending] = useState(false);
  
  const [localSettings, setLocalSettings] = useState<Partial<ClientReminderSettings>>({
    remindersEnabled: true,
    goalRemindersEnabled: true,
    planRemindersEnabled: true,
    inactivityRemindersEnabled: true,
    inactivityThresholdDays: 2,
    quietHoursStart: "21:00",
    quietHoursEnd: "08:00",
    maxRemindersPerDay: 3,
  });

  const { data: settings, isLoading } = useQuery<ClientReminderSettings>({
    queryKey: ['/api/clients', clientId, 'reminder-settings'],
    enabled: !!clientId,
  });

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
      setHasChanges(false);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<ClientReminderSettings>) => {
      const { id, clientId: _cid, coachId: _coach, createdAt, updatedAt, ...mutableFields } = updates as ClientReminderSettings;
      return apiRequest('PATCH', `/api/clients/${clientId}/reminder-settings`, mutableFields);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'reminder-settings'] });
      setHasChanges(false);
      toast({
        title: "Settings saved",
        description: "Notification settings have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleChange = <K extends keyof ClientReminderSettings>(
    key: K,
    value: ClientReminderSettings[K]
  ) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateMutation.mutate(localSettings);
  };

  const handleTestNotification = async () => {
    setTestingSending(true);
    try {
      await apiRequest('POST', `/api/clients/${clientId}/trigger-reminders`, { bypassQuietHours: true });
      toast({
        title: "Test triggered",
        description: "Reminders have been processed for this client.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to trigger test notification.",
        variant: "destructive",
      });
    }
    setTestingSending(false);
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-primary" />
          Notification Settings
          {clientName && (
            <span className="text-muted-foreground font-normal text-sm">
              for {clientName}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-5">
        <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <Bell className="w-4 h-4 text-primary" />
            <div>
              <p className="text-sm font-medium">All Notifications</p>
              <p className="text-xs text-muted-foreground">Master toggle for all reminders</p>
            </div>
          </div>
          <Switch
            checked={localSettings.remindersEnabled ?? true}
            onCheckedChange={(checked) => handleChange('remindersEnabled', checked)}
            data-testid="toggle-all-notifications"
          />
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="text-sm font-medium">Reminder Types</h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <Target className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Goal Reminders</span>
              </div>
              <Switch
                checked={localSettings.goalRemindersEnabled ?? true}
                onCheckedChange={(checked) => handleChange('goalRemindersEnabled', checked)}
                disabled={!localSettings.remindersEnabled}
                data-testid="toggle-goal-reminders"
              />
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Plan Reminders</span>
              </div>
              <Switch
                checked={localSettings.planRemindersEnabled ?? true}
                onCheckedChange={(checked) => handleChange('planRemindersEnabled', checked)}
                disabled={!localSettings.remindersEnabled}
                data-testid="toggle-plan-reminders"
              />
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <Activity className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Inactivity Reminders</span>
              </div>
              <Switch
                checked={localSettings.inactivityRemindersEnabled ?? true}
                onCheckedChange={(checked) => handleChange('inactivityRemindersEnabled', checked)}
                disabled={!localSettings.remindersEnabled}
                data-testid="toggle-inactivity-reminders"
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Inactivity Threshold</h4>
            <Badge variant="secondary" className="text-xs">
              {localSettings.inactivityThresholdDays} day{(localSettings.inactivityThresholdDays ?? 2) !== 1 ? 's' : ''}
            </Badge>
          </div>
          <Slider
            value={[localSettings.inactivityThresholdDays ?? 2]}
            onValueChange={([value]) => handleChange('inactivityThresholdDays', value)}
            min={1}
            max={7}
            step={1}
            className="w-full"
            disabled={!localSettings.remindersEnabled || !localSettings.inactivityRemindersEnabled}
            data-testid="slider-inactivity-threshold"
          />
          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Trigger inactivity reminder after this many days without activity
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Daily Limit</h4>
            <Badge variant="secondary" className="text-xs">
              Max {localSettings.maxRemindersPerDay ?? 3} per day
            </Badge>
          </div>
          <Slider
            value={[localSettings.maxRemindersPerDay ?? 3]}
            onValueChange={([value]) => handleChange('maxRemindersPerDay', value)}
            min={1}
            max={10}
            step={1}
            className="w-full"
            disabled={!localSettings.remindersEnabled}
            data-testid="slider-max-per-day"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1</span>
            <span>5</span>
            <span>10</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Quiet Hours
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Start</Label>
              <Input
                type="time"
                value={localSettings.quietHoursStart ?? "21:00"}
                onChange={(e) => handleChange('quietHoursStart', e.target.value)}
                disabled={!localSettings.remindersEnabled}
                data-testid="input-quiet-hours-start"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">End</Label>
              <Input
                type="time"
                value={localSettings.quietHoursEnd ?? "08:00"}
                onChange={(e) => handleChange('quietHoursEnd', e.target.value)}
                disabled={!localSettings.remindersEnabled}
                data-testid="input-quiet-hours-end"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            No notifications will be sent during quiet hours
          </p>
        </div>

        <Separator />

        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={!hasChanges || updateMutation.isPending}
            data-testid="button-save-settings"
          >
            {updateMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Settings
          </Button>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={handleTestNotification}
                disabled={testingSending || !localSettings.remindersEnabled}
                data-testid="button-test-notification"
              >
                {testingSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <TestTube2 className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Trigger reminders now</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
}
