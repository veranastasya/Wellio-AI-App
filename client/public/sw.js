// Wellio Service Worker for Push Notifications
// Version: 2 - Fixed notification display

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
  console.log('[SW] Push notification received');
  
  let data = {
    title: 'Wellio',
    body: 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    tag: 'wellio-notification',
    data: { url: '/client', type: 'default' }
  };
  
  if (event.data) {
    try {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || payload.message || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
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
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    vibrate: [100, 50, 100],
    requireInteraction: data.data?.type === NOTIFICATION_TYPES.MESSAGE,
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
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
