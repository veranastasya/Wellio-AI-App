import { createContext, useContext, useCallback, useState, useMemo, type ReactNode } from 'react';
import type {
  EngagementState,
  EngagementActions,
  ClientActivityEvent,
  Trigger,
  Recommendation,
  NotificationPreference,
} from '@/models/engagement';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const initialState: EngagementState = {
  activityFeed: [],
  triggers: [],
  recommendations: [],
  notificationPreferences: null,
  selectedClientId: null,
  isLoading: false,
};

type EngagementContextType = EngagementState & EngagementActions;

const EngagementContext = createContext<EngagementContextType | null>(null);

export function EngagementProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [state, setState] = useState<EngagementState>(initialState);

  const loadActivityFeed = useCallback(async (clientId: string) => {
    setState(prev => ({ ...prev, isLoading: true, selectedClientId: clientId }));
    
    try {
      const [activityRes, triggersRes, recommendationsRes, prefsRes] = await Promise.all([
        fetch(`/api/engagement/activity/${clientId}`),
        fetch(`/api/engagement/triggers/${clientId}`),
        fetch(`/api/engagement/recommendations/${clientId}`),
        fetch(`/api/engagement/notification-preferences/${clientId}`),
      ]);

      const activity: ClientActivityEvent[] = activityRes.ok ? await activityRes.json() : [];
      const triggers: Trigger[] = triggersRes.ok ? await triggersRes.json() : [];
      const recommendations: Recommendation[] = recommendationsRes.ok ? await recommendationsRes.json() : [];
      const prefs = prefsRes.ok ? await prefsRes.json() : null;

      const mapFrequency = (f: string): NotificationPreference['frequency'] => {
        if (['minimal', 'moderate', 'active', 'aggressive'].includes(f)) {
          return f as NotificationPreference['frequency'];
        }
        return 'moderate';
      };

      const notificationPreferences: NotificationPreference | null = prefs ? {
        clientId,
        sms: prefs.smsEnabled || false,
        webPush: prefs.webPushEnabled || false,
        inApp: prefs.inAppEnabled !== false,
        frequency: mapFrequency(prefs.frequency || 'moderate'),
        dailyLimit: prefs.dailyLimit || 5,
        quietHoursEnabled: !!(prefs.quietHoursStart && prefs.quietHoursEnd),
        quietHoursStart: prefs.quietHoursStart || '22:00',
        quietHoursEnd: prefs.quietHoursEnd || '08:00',
      } : {
        clientId,
        sms: false,
        webPush: false,
        inApp: true,
        frequency: 'moderate',
        dailyLimit: 5,
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
      };

      setState(prev => ({
        ...prev,
        activityFeed: activity,
        triggers: triggers.map(t => ({
          id: t.id,
          clientId: t.clientId,
          type: t.type as any,
          severity: t.severity as any,
          reason: t.reason,
          recommendedAction: t.recommendedAction,
          detectedAt: t.detectedAt,
          isResolved: t.isResolved || false,
        })),
        recommendations: recommendations.map(r => ({
          id: r.id,
          triggerId: r.triggerId,
          clientId: r.clientId,
          message: r.message,
          reason: r.reason,
          priority: r.priority as any,
          status: r.status as any,
          sentAt: r.sentAt,
          sentVia: r.sentVia,
          createdAt: r.createdAt,
        })),
        notificationPreferences,
        isLoading: false,
      }));
    } catch (error) {
      console.error('[Engagement] Failed to load data:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        activityFeed: [],
        triggers: [],
        recommendations: [],
        notificationPreferences: {
          clientId,
          sms: false,
          webPush: false,
          inApp: true,
          frequency: 'moderate' as const,
          dailyLimit: 5,
          quietHoursEnabled: false,
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00',
        },
      }));
    }
  }, []);

  const detectTriggers = useCallback(async () => {
    if (!state.selectedClientId) {
      console.warn('[Engagement] Cannot detect triggers: no client selected');
      return;
    }
    
    try {
      const response = await apiRequest('POST', `/api/engagement/detect-triggers/${state.selectedClientId}`);
      const data = await response.json();
      
      if (data.triggers && data.triggers.length > 0) {
        setState(prev => ({
          ...prev,
          triggers: [...data.triggers, ...prev.triggers],
        }));
        
        toast({
          title: 'Triggers Detected',
          description: `Found ${data.triggers.length} new trigger(s)`,
        });
      } else {
        toast({
          title: 'No New Triggers',
          description: data.message || 'No engagement issues detected',
        });
      }
    } catch (error) {
      console.error('[Engagement] Failed to detect triggers:', error);
      toast({
        title: 'Detection Failed',
        description: 'Failed to analyze client activity',
        variant: 'destructive',
      });
    }
  }, [state.selectedClientId, toast]);

  const generateRecommendations = useCallback(async () => {
    const unresolvedTriggers = state.triggers.filter(t => !t.isResolved);
    
    if (unresolvedTriggers.length === 0) {
      toast({
        title: 'No Triggers',
        description: 'No unresolved triggers to generate recommendations for',
      });
      return;
    }
    
    try {
      const newRecommendations: Recommendation[] = [];
      
      for (const trigger of unresolvedTriggers) {
        const response = await apiRequest('POST', `/api/engagement/generate-recommendation/${trigger.id}`);
        if (response.ok) {
          const rec = await response.json();
          newRecommendations.push({
            id: rec.id,
            triggerId: rec.triggerId,
            clientId: rec.clientId,
            message: rec.message,
            reason: rec.reason,
            priority: rec.priority,
            status: rec.status,
            sentAt: rec.sentAt,
            sentVia: rec.sentVia,
            createdAt: rec.createdAt,
          });
        }
      }
      
      if (newRecommendations.length > 0) {
        setState(prev => ({
          ...prev,
          recommendations: [...newRecommendations, ...prev.recommendations],
        }));
        
        toast({
          title: 'Recommendations Generated',
          description: `Created ${newRecommendations.length} recommendation(s)`,
        });
      }
    } catch (error) {
      console.error('[Engagement] Failed to generate recommendations:', error);
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate recommendations',
        variant: 'destructive',
      });
    }
  }, [state.triggers, toast]);

  const sendRecommendation = useCallback(async (recommendationId: string) => {
    const recommendation = state.recommendations.find(r => r.id === recommendationId);
    if (!recommendation) {
      console.error(`[Engagement] Recommendation not found: ${recommendationId}`);
      return;
    }
    
    try {
      const channels: string[] = [];
      if (state.notificationPreferences?.inApp) channels.push('in_app');
      if (state.notificationPreferences?.sms) channels.push('sms');
      
      channels.push('email');
      
      const response = await apiRequest('POST', '/api/engagement/send-notification', {
        clientId: recommendation.clientId,
        title: 'Message from your coach',
        message: recommendation.message,
        channels,
      });
      
      const result = await response.json();
      
      if (result.success) {
        const successChannels = result.results
          .filter((r: any) => r.success)
          .map((r: any) => r.channel);
        
        await apiRequest('PATCH', `/api/engagement/recommendations/${recommendationId}`, {
          status: 'sent',
          sentAt: new Date().toISOString(),
          sentVia: successChannels.join(','),
        });
        
        setState(prev => ({
          ...prev,
          recommendations: prev.recommendations.map(r =>
            r.id === recommendationId
              ? { ...r, status: 'sent' as const, sentAt: new Date().toISOString(), sentVia: successChannels.join(',') }
              : r
          ),
        }));
        
        toast({
          title: 'Message Sent',
          description: `Notification sent via ${successChannels.join(', ')}`,
        });
      } else {
        throw new Error('Send failed');
      }
    } catch (error) {
      console.error('[Engagement] Failed to send recommendation:', error);
      toast({
        title: 'Send Failed',
        description: 'Failed to send notification',
        variant: 'destructive',
      });
    }
  }, [state.recommendations, state.notificationPreferences, toast]);

  const dismissRecommendation = useCallback(async (recommendationId: string) => {
    try {
      await apiRequest('PATCH', `/api/engagement/recommendations/${recommendationId}`, {
        status: 'dismissed',
      });
      
      setState(prev => ({
        ...prev,
        recommendations: prev.recommendations.map(r =>
          r.id === recommendationId
            ? { ...r, status: 'dismissed' as const }
            : r
        ),
      }));
      
      toast({
        title: 'Recommendation Dismissed',
        description: 'The recommendation has been dismissed.',
      });
    } catch (error) {
      console.error('[Engagement] Failed to dismiss recommendation:', error);
      toast({
        title: 'Dismiss Failed',
        description: 'Failed to dismiss recommendation',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const updateNotificationPreferences = useCallback(async (updates: Partial<NotificationPreference>) => {
    if (!state.selectedClientId) return;
    
    try {
      const prefs = {
        smsEnabled: updates.sms ?? state.notificationPreferences?.sms ?? false,
        webPushEnabled: updates.webPush ?? state.notificationPreferences?.webPush ?? false,
        inAppEnabled: updates.inApp ?? state.notificationPreferences?.inApp ?? true,
        frequency: updates.frequency ?? state.notificationPreferences?.frequency ?? 'moderate',
        dailyLimit: updates.dailyLimit ?? state.notificationPreferences?.dailyLimit ?? 5,
        quietHoursStart: updates.quietHoursEnabled 
          ? (updates.quietHoursStart ?? state.notificationPreferences?.quietHoursStart ?? '22:00')
          : null,
        quietHoursEnd: updates.quietHoursEnabled 
          ? (updates.quietHoursEnd ?? state.notificationPreferences?.quietHoursEnd ?? '08:00')
          : null,
      };
      
      await apiRequest('PUT', `/api/engagement/notification-preferences/${state.selectedClientId}`, prefs);
      
      setState(prev => ({
        ...prev,
        notificationPreferences: prev.notificationPreferences
          ? { ...prev.notificationPreferences, ...updates }
          : null,
      }));
      
      toast({
        title: 'Preferences Updated',
        description: 'Your notification preferences have been saved.',
      });
    } catch (error) {
      console.error('[Engagement] Failed to update preferences:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to save notification preferences',
        variant: 'destructive',
      });
    }
  }, [state.selectedClientId, state.notificationPreferences, toast]);

  const sendTestNotification = useCallback(async () => {
    if (!state.selectedClientId) {
      toast({
        title: 'Error',
        description: 'No client selected',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const channels: string[] = ['in_app'];
      if (state.notificationPreferences?.sms) channels.push('sms');
      
      await apiRequest('POST', '/api/engagement/send-notification', {
        clientId: state.selectedClientId,
        title: 'Test Notification',
        message: 'This is a test notification from your coach.',
        channels,
      });
      
      toast({
        title: 'Test Notification Sent',
        description: 'A test notification has been sent to the client.',
      });
    } catch (error) {
      console.error('[Engagement] Failed to send test notification:', error);
      toast({
        title: 'Send Failed',
        description: 'Failed to send test notification',
        variant: 'destructive',
      });
    }
  }, [state.selectedClientId, state.notificationPreferences, toast]);

  const selectClient = useCallback((clientId: string) => {
    loadActivityFeed(clientId);
  }, [loadActivityFeed]);

  const reset = useCallback(() => {
    setState(initialState);
    console.log('[Engagement] State reset to initial values');
  }, []);

  const contextValue = useMemo<EngagementContextType>(() => ({
    ...state,
    loadActivityFeed,
    detectTriggers,
    generateRecommendations,
    sendRecommendation,
    dismissRecommendation,
    updateNotificationPreferences,
    sendTestNotification,
    selectClient,
    reset,
  }), [
    state,
    loadActivityFeed,
    detectTriggers,
    generateRecommendations,
    sendRecommendation,
    dismissRecommendation,
    updateNotificationPreferences,
    sendTestNotification,
    selectClient,
    reset,
  ]);

  return (
    <EngagementContext.Provider value={contextValue}>
      {children}
    </EngagementContext.Provider>
  );
}

export function useEngagement(): EngagementContextType {
  const context = useContext(EngagementContext);
  if (!context) {
    throw new Error('useEngagement must be used within an EngagementProvider');
  }
  return context;
}
