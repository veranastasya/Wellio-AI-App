import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bell,
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
  const { t } = useTranslation();
  const { toast } = useToast();
  const [hasChanges, setHasChanges] = useState(false);
  const [testingSending, setTestingSending] = useState(false);
  
  const [localSettings, setLocalSettings] = useState<Partial<ClientReminderSettings>>({
    remindersEnabled: true,
    goalRemindersEnabled: true,
    planRemindersEnabled: true,
    inactivityRemindersEnabled: true,
    inactivityThresholdDays: 2,
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
      const { id, clientId: _cid, coachId: _coach, createdAt, updatedAt, quietHoursStart: _qhs, quietHoursEnd: _qhe, ...mutableFields } = updates as ClientReminderSettings;
      return apiRequest('PATCH', `/api/clients/${clientId}/reminder-settings`, mutableFields);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'reminder-settings'] });
      setHasChanges(false);
      toast({
        title: t('reminderSettings.settingsSaved'),
        description: t('reminderSettings.settingsSavedDescription'),
      });
    },
    onError: () => {
      toast({
        title: t('reminderSettings.error'),
        description: t('reminderSettings.saveFailed'),
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
        title: t('reminderSettings.testTriggered'),
        description: t('reminderSettings.testTriggeredDescription'),
      });
    } catch {
      toast({
        title: t('reminderSettings.error'),
        description: t('reminderSettings.testFailed'),
        variant: "destructive",
      });
    }
    setTestingSending(false);
  };

  const thresholdDays = localSettings.inactivityThresholdDays ?? 2;
  const daysLabel = thresholdDays === 1 ? t('reminderSettings.day') : t('reminderSettings.days');

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-4 sm:p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b px-3 sm:px-6">
        <CardTitle className="text-base sm:text-lg font-semibold flex flex-wrap items-center gap-2">
          <Settings2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
          <span>{t('reminderSettings.title')}</span>
          {clientName && (
            <span className="text-muted-foreground font-normal text-xs sm:text-sm">
              {t('reminderSettings.forClient', { name: clientName })}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Bell className="w-4 h-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{t('reminderSettings.allNotifications')}</p>
              <p className="text-xs text-muted-foreground hidden sm:block">{t('reminderSettings.masterToggle')}</p>
            </div>
          </div>
          <Switch
            checked={localSettings.remindersEnabled ?? true}
            onCheckedChange={(checked) => handleChange('remindersEnabled', checked)}
            data-testid="toggle-all-notifications"
          />
        </div>

        <Separator />

        <div className="space-y-2 sm:space-y-3">
          <h4 className="text-sm font-medium">{t('reminderSettings.reminderTypes')}</h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <Target className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate">{t('reminderSettings.goalReminders')}</span>
              </div>
              <Switch
                checked={localSettings.goalRemindersEnabled ?? true}
                onCheckedChange={(checked) => handleChange('goalRemindersEnabled', checked)}
                disabled={!localSettings.remindersEnabled}
                data-testid="toggle-goal-reminders"
              />
            </div>
            
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate">{t('reminderSettings.planReminders')}</span>
              </div>
              <Switch
                checked={localSettings.planRemindersEnabled ?? true}
                onCheckedChange={(checked) => handleChange('planRemindersEnabled', checked)}
                disabled={!localSettings.remindersEnabled}
                data-testid="toggle-plan-reminders"
              />
            </div>
            
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <Activity className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate">{t('reminderSettings.inactivityReminders')}</span>
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
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="text-sm font-medium">{t('reminderSettings.inactivityThreshold')}</h4>
            <Badge variant="secondary" className="text-xs">
              {thresholdDays} {daysLabel}
            </Badge>
          </div>
          <Slider
            value={[localSettings.inactivityThresholdDays ?? 2]}
            onValueChange={([value]) => handleChange('inactivityThresholdDays', value)}
            min={1}
            max={7}
            step={1}
            className="w-full touch-pan-x"
            disabled={!localSettings.remindersEnabled || !localSettings.inactivityRemindersEnabled}
            data-testid="slider-inactivity-threshold"
          />
          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{t('reminderSettings.inactivityThresholdDescription')}</span>
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="text-sm font-medium">{t('reminderSettings.dailyLimit')}</h4>
            <Badge variant="secondary" className="text-xs">
              {t('reminderSettings.maxPerDay', { count: localSettings.maxRemindersPerDay ?? 3 })}
            </Badge>
          </div>
          <Slider
            value={[localSettings.maxRemindersPerDay ?? 3]}
            onValueChange={([value]) => handleChange('maxRemindersPerDay', value)}
            min={1}
            max={10}
            step={1}
            className="w-full touch-pan-x"
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

        <div className="flex gap-2">
          <Button
            className="flex-1 min-h-[44px]"
            onClick={handleSave}
            disabled={!hasChanges || updateMutation.isPending}
            data-testid="button-save-settings"
          >
            {updateMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {t('reminderSettings.saveSettings')}
          </Button>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="min-h-[44px] min-w-[44px]"
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
              <p>{t('reminderSettings.triggerNow')}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
}
