// Wellio Service Worker for Push Notifications
// Version: 3 - Simplified options for maximum browser compatibility

const NOTIFICATION_TYPES = {
  MESSAGE: 'message',
  PLAN_ASSIGNED: 'plan_assigned',
  TEST: 'test',
  REMINDER: 'reminder',
  GOAL_UPDATE: 'goal_update'
};

const DEFAULT_URLS = {
  coach: '/dashboard',
  client: '/client'
};

function getDeepLinkUrl(notificationData) {
  if (!notificationData) return DEFAULT_URLS.client;
  
  const { type, url, clientId, userType } = notificationData;
  
  if (url) return url;
  
  const baseUrl = userType === 'coach' ? DEFAULT_URLS.coach : DEFAULT_URLS.client;
  
  switch (type) {
    case NOTIFICATION_TYPES.MESSAGE:
      if (userType === 'coach' && clientId) {
        return `/communication?client=${clientId}`;
      }
      return userType === 'coach' ? '/communication' : '/client/coach-chat';
      
    case NOTIFICATION_TYPES.PLAN_ASSIGNED:
      return userType === 'coach' ? '/dashboard' : '/client/my-plan';
      
    case NOTIFICATION_TYPES.GOAL_UPDATE:
      if (userType === 'coach' && clientId) {
        return `/clients/${clientId}?tab=goals`;
      }
      return '/client';
      
    case NOTIFICATION_TYPES.REMINDER:
      return baseUrl;
      
    case NOTIFICATION_TYPES.TEST:
      return baseUrl;
      
    default:
      return baseUrl;
  }
}

self.addEventListener('install', (event) => {
  console.log('[SW] Service worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service worker activated');
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received at:', new Date().toISOString());
  
  let data = {
    title: 'Wellio',
    body: 'You have a new notification',
    tag: 'wellio-notification',
    data: { url: '/client', type: 'default' }
  };
  
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[SW] Push payload:', JSON.stringify(payload));
      data = {
        title: payload.title || data.title,
        body: payload.body || payload.message || data.body,
        tag: payload.tag || `wellio-${payload.data?.type || 'notification'}-${Date.now()}`,
        data: {
          ...data.data,
          ...payload.data,
          type: payload.data?.type || payload.type || 'default'
        }
      };
    } catch (e) {
      console.log('[SW] Failed to parse push data:', e);
      data.body = event.data.text() || data.body;
    }
  }
  
  const options = {
    body: data.body,
    tag: data.tag,
    data: data.data,
    silent: false,
    renotify: true
  };
  
  console.log('[SW] Calling showNotification with title:', data.title, 'options:', JSON.stringify(options));
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
      .then(() => {
        console.log('[SW] showNotification completed successfully');
      })
      .catch((err) => {
        console.error('[SW] showNotification failed:', err);
      })
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();
  
  if (event.action === 'dismiss') {
    console.log('[SW] Notification dismissed via action');
    return;
  }
  
  const notificationData = event.notification.data || {};
  const urlToOpen = getDeepLinkUrl(notificationData);
  
  console.log('[SW] Deep-linking to:', urlToOpen);
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windowClients) => {
      const baseOrigin = self.location.origin;
      const targetUrl = new URL(urlToOpen, baseOrigin).href;
      
      for (const client of windowClients) {
        const clientUrl = new URL(client.url);
        if (clientUrl.origin === baseOrigin) {
          try {
            await client.focus();
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              url: urlToOpen,
              notificationType: notificationData.type,
              data: notificationData
            });
            return;
          } catch (e) {
            console.log('[SW] Could not focus client:', e);
          }
        }
      }
      
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
});

self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
