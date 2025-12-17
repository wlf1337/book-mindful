// Service Worker for handling push notifications
// This file is optional but provides better control over notification behavior

self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received.');
  
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/pwa-512x512.png',
    badge: '/pwa-512x512.png',
    tag: data.tag || 'default',
    data: data.data || {},
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Quietly', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click Received.');
  
  event.notification.close();
  
  // Open the app when notification is clicked
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});
