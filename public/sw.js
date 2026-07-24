const CACHE_NAME = 'mg-clearance-v4-live';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => caches.delete(cache))
      );
    })
  );
  self.clients.claim();
});

// Lock Screen System Notification Message Listener
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, tag, data } = event.data;
    const options = {
      body: body || 'New clearance update from Showroom',
      icon: icon || '/icon-192.png',
      badge: '/icon-192.png',
      tag: tag || `mg-notif-${Date.now()}`,
      renotify: true,
      vibrate: [300, 100, 300, 100, 300], // Phone vibration pattern for lock screen
      data: data || { url: '/' },
      requireInteraction: true // Keeps notification on phone lock screen until tapped
    };

    self.registration.showNotification(title || 'MG Clearance Hub', options);
  }
});

// Lock Screen Notification Click Handler (Opens PWA App)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.url.startsWith(self.location.origin)) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});

