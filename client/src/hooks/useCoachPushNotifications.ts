import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface CoachPushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission | null;
  isLoading: boolean;
}

export function useCoachPushNotifications() {
  const { toast } = useToast();
  const [state, setState] = useState<CoachPushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    permission: null,
    isLoading: true,
  });

  const checkSupport = useCallback(() => {
    const supported = 
      'serviceWorker' in navigator && 
      'PushManager' in window &&
      'Notification' in window;
    return supported;
  }, []);

  const checkSubscription = useCallback(async () => {
    if (!checkSupport()) {
      setState(prev => ({ ...prev, isSupported: false, isLoading: false }));
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      const permission = Notification.permission;
      
      // Also check server-side status
      const statusRes = await fetch('/api/coach/push/status', { credentials: 'include' });
      const statusData = statusRes.ok ? await statusRes.json() : { enabled: false };
      
      setState({
        isSupported: true,
        isSubscribed: !!subscription && statusData.enabled,
        permission,
        isLoading: false,
      });
    } catch (error) {
      console.error('[CoachPush] Error checking subscription:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [checkSupport]);

  const subscribe = useCallback(async () => {
    if (!checkSupport()) {
      toast({
        title: 'Not Supported',
        description: 'Push notifications are not supported on this device',
        variant: 'destructive',
      });
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        setState(prev => ({ ...prev, permission, isLoading: false }));
        toast({
          title: 'Permission Denied',
          description: 'Please enable notifications in your browser settings',
          variant: 'destructive',
        });
        return false;
      }

      const vapidRes = await fetch('/api/coach/push/vapid-public-key', { credentials: 'include' });
      if (!vapidRes.ok) {
        throw new Error('Failed to get VAPID key');
      }
      const { publicKey } = await vapidRes.json();

      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const subJson = subscription.toJSON();
      
      // Persist to server
      let persistSuccess = false;
      let lastError: unknown;
      
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await apiRequest('POST', '/api/coach/push/subscribe', {
            endpoint: subJson.endpoint,
            keys: subJson.keys,
          });
          
          if (response.ok) {
            persistSuccess = true;
            break;
          }
        } catch (err) {
          lastError = err;
          console.error(`[CoachPush] Server persist attempt ${attempt + 1} failed:`, err);
        }
        
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }

      if (!persistSuccess) {
        await subscription.unsubscribe();
        throw lastError || new Error('Failed to persist subscription to server');
      }

      setState({
        isSupported: true,
        isSubscribed: true,
        permission: 'granted',
        isLoading: false,
      });

      toast({
        title: 'Notifications Enabled',
        description: 'You will now receive push notifications when clients message you',
      });

      return true;
    } catch (error) {
      console.error('[CoachPush] Subscription error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      toast({
        title: 'Subscription Failed',
        description: 'Failed to enable push notifications. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  }, [checkSupport, toast]);

  const unsubscribe = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }

      await apiRequest('DELETE', '/api/coach/push/subscription');

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
      }));

      toast({
        title: 'Notifications Disabled',
        description: 'You will no longer receive push notifications',
      });

      return true;
    } catch (error) {
      console.error('[CoachPush] Unsubscribe error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      toast({
        title: 'Failed',
        description: 'Failed to disable push notifications',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('[SW] Service Worker registered for coach:', registration.scope);
        })
        .catch((error) => {
          console.error('[SW] Registration failed:', error);
        });
    }
    
    checkSubscription();
  }, [checkSubscription]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    checkSubscription,
  };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
