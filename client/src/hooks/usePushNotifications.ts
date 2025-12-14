import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission | null;
  isLoading: boolean;
}

export function usePushNotifications() {
  const { toast } = useToast();
  const [state, setState] = useState<PushNotificationState>({
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
      
      setState({
        isSupported: true,
        isSubscribed: !!subscription,
        permission,
        isLoading: false,
      });
    } catch (error) {
      console.error('[Push] Error checking subscription:', error);
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

      const vapidRes = await fetch('/api/client/push/vapid-public-key');
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
      
      // Retry server persistence with backoff
      let persistSuccess = false;
      let lastError: unknown;
      
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await apiRequest('POST', '/api/client/push/subscribe', {
            endpoint: subJson.endpoint,
            keys: subJson.keys,
          });
          
          if (response.ok) {
            persistSuccess = true;
            break;
          }
        } catch (err) {
          lastError = err;
          console.error(`[Push] Server persist attempt ${attempt + 1} failed:`, err);
        }
        
        // Backoff: 1s, 2s, 4s
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }

      if (!persistSuccess) {
        // Unsubscribe from browser since server persist failed
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
        description: 'You will now receive push notifications from your coach',
      });

      return true;
    } catch (error) {
      console.error('[Push] Subscription error:', error);
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

      await apiRequest('DELETE', '/api/client/push/subscription');

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
      console.error('[Push] Unsubscribe error:', error);
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
    let cleanup: (() => void) | undefined;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('[SW] Service Worker registered:', registration.scope);
        })
        .catch((error) => {
          console.error('[SW] Registration failed:', error);
        });

      const handleServiceWorkerMessage = (event: MessageEvent) => {
        if (event.data?.type === 'NOTIFICATION_CLICK') {
          console.log('[Push] Notification click received:', event.data);
          const { url } = event.data;
          if (url && typeof url === 'string') {
            window.location.href = url;
          }
        }
      };

      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      
      cleanup = () => {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      };
    }
    
    checkSubscription();
    
    return cleanup;
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
