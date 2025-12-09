import { createContext, useContext, useCallback, useState, useMemo, type ReactNode } from 'react';
import type {
  EngagementState,
  EngagementActions,
  ClientActivityEvent,
  Trigger,
  Recommendation,
  NotificationPreference,
} from '@/models/engagement';
import {
  getMockActivityFeed,
  detectTriggers as detectTriggersLogic,
  generateRecommendation,
  simulateNotificationSend,
  getMockNotificationPreferences,
} from '@/logic/engagement';
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

  const loadActivityFeed = useCallback((clientId: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    const activityFeed = getMockActivityFeed(clientId);
    const preferences = getMockNotificationPreferences(clientId);
    
    setState(prev => ({
      ...prev,
      activityFeed,
      notificationPreferences: preferences,
      selectedClientId: clientId,
      isLoading: false,
      triggers: [],
      recommendations: [],
    }));
  }, []);

  const detectTriggers = useCallback(() => {
    if (!state.selectedClientId || state.activityFeed.length === 0) {
      console.warn('[Engagement] Cannot detect triggers: no client selected or empty activity feed');
      return;
    }
    
    const triggers = detectTriggersLogic(state.activityFeed, state.selectedClientId);
    setState(prev => ({ ...prev, triggers }));
  }, [state.selectedClientId, state.activityFeed]);

  const generateRecommendations = useCallback(() => {
    if (state.triggers.length === 0) {
      console.warn('[Engagement] Cannot generate recommendations: no triggers detected');
      return;
    }
    
    const unresolvedTriggers = state.triggers.filter(t => !t.isResolved);
    const recommendations = unresolvedTriggers.map(trigger => generateRecommendation(trigger));
    
    setState(prev => ({ ...prev, recommendations }));
  }, [state.triggers]);

  const sendRecommendation = useCallback(async (recommendationId: string) => {
    const recommendation = state.recommendations.find(r => r.id === recommendationId);
    if (!recommendation) {
      console.error(`[Engagement] Recommendation not found: ${recommendationId}`);
      return;
    }
    
    if (!state.notificationPreferences) {
      toast({
        title: 'Error',
        description: 'No notification preferences available',
        variant: 'destructive',
      });
      return;
    }
    
    const result = await simulateNotificationSend(recommendation, state.notificationPreferences);
    
    if (result.success) {
      setState(prev => ({
        ...prev,
        recommendations: prev.recommendations.map(r =>
          r.id === recommendationId
            ? { ...r, status: 'sent' as const, sentAt: new Date().toISOString() }
            : r
        ),
      }));
      
      toast({
        title: 'Message Sent',
        description: `Notification sent via ${result.channels.join(', ')}`,
      });
    } else {
      toast({
        title: 'Send Failed',
        description: result.error || 'Failed to send notification',
        variant: 'destructive',
      });
    }
  }, [state.recommendations, state.notificationPreferences, toast]);

  const dismissRecommendation = useCallback((recommendationId: string) => {
    console.log(`[Engagement] Dismissing recommendation: ${recommendationId}`);
    
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
  }, [toast]);

  const updateNotificationPreferences = useCallback((updates: Partial<NotificationPreference>) => {
    console.log('[Engagement] Updating notification preferences:', updates);
    
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
  }, [toast]);

  const sendTestNotification = useCallback(async () => {
    console.log('[Engagement] Sending test notification');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const channels: string[] = [];
    if (state.notificationPreferences?.inApp) channels.push('In-App');
    if (state.notificationPreferences?.webPush) channels.push('Web Push');
    if (state.notificationPreferences?.sms) channels.push('SMS');
    
    toast({
      title: 'Test Notification Sent',
      description: channels.length > 0 
        ? `Test sent via: ${channels.join(', ')}`
        : 'No channels enabled for notifications',
    });
  }, [state.notificationPreferences, toast]);

  const selectClient = useCallback((clientId: string) => {
    loadActivityFeed(clientId);
    
    setTimeout(() => {
      setState(prev => {
        if (prev.activityFeed.length > 0 && prev.selectedClientId) {
          const triggers = detectTriggersLogic(prev.activityFeed, prev.selectedClientId);
          const recommendations = triggers.map(t => generateRecommendation(t));
          return { ...prev, triggers, recommendations };
        }
        return prev;
      });
    }, 100);
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
