/**
 * Service Worker for SmartAccountant
 * Enables offline functionality and background sync
 */

const CACHE_NAME = 'smartaccountant-v2';
const API_CACHE_NAME = 'smartaccountant-api-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico'
];

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('📦 Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );

  self.skipWaiting();
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activated');

  event.waitUntil(
    caches.keys().then(cacheNames => {
      const staleCaches = cacheNames.filter(name => name !== CACHE_NAME && name !== API_CACHE_NAME);
      return Promise.all([
        self.clients.claim(),
        ...staleCaches.map(name => {
          console.log('🗑️ Deleting old cache:', name);
          return caches.delete(name);
        })
      ]);
    })
  );
});

/**
 * Fetch event - serve from cache, fallback to network
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and external URLs
  if (request.method !== 'GET') {
    return;
  }

  // API requests - network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Navigation and HTML should prefer network to avoid stale app shell.
  if (request.mode === 'navigate' || request.destination === 'document' || url.pathname === '/' || url.pathname.endsWith('/index.html')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Static assets - cache first, network fallback
  event.respondWith(cacheFirstStrategy(request));
});

/**
 * Network first strategy (for API calls)
 */
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('📡 Network error, trying cache:', request.url);

    const acceptsHtml = request.mode === 'navigate'
      || request.destination === 'document'
      || (request.headers.get('accept') || '').includes('text/html');

    if (acceptsHtml) {
      const appShell = await caches.match('/index.html') || await caches.match('/');
      if (appShell) {
        return appShell;
      }
    }

    // Try cache on network failure
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Return offline response
    return new Response(
      JSON.stringify({
        error: 'Offline - cached data may be unavailable',
        timestamp: new Date().toISOString()
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Cache first strategy (for static assets)
 */
async function cacheFirstStrategy(request) {
  const cached = await caches.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('❌ Failed to fetch:', request.url);

    // Return 404 page if offline
    return new Response('Page not found', {
      status: 404,
      statusText: 'Not Found'
    });
  }
}

/**
 * Background sync event
 */
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);

  if (event.tag === 'sync-data') {
    event.waitUntil(performSync());
  }
});

/**
 * Perform background sync
 */
async function performSync() {
  try {
    console.log('🔄 Performing background sync...');

    // Send message to main thread to trigger sync
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_REQUIRED',
        timestamp: new Date().toISOString()
      });
    });
  } catch (error) {
    console.error('❌ Background sync error:', error);
  }
}

/**
 * Message event - handle messages from main thread
 */
self.addEventListener('message', (event) => {
  console.log('📨 Message from main thread:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      Promise.all([
        caches.delete(CACHE_NAME),
        caches.delete(API_CACHE_NAME),
      ]).then(() => {
        console.log('🗑️ Cache cleared');
      })
    );
  }
});

/**
 * Push event - handle push notifications
 */
self.addEventListener('push', (event) => {
  console.log('🔔 Push notification received');

  let data = {
    title: 'Smart Accountant',
    body: 'You have a new notification',
    icon: '/favicon.ico'
  };

  if (event.data) {
    data = JSON.parse(event.data.text());
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: '/favicon.ico',
      tag: 'smartaccountant',
      requireInteraction: false
    })
  );
});

/**
 * Notification click event
 */
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Notification clicked');

  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // Focus existing window if available
      for (let i = 0; i < clientList.length; i++) {
        if (clientList[i].url === '/' && 'focus' in clientList[i]) {
          return clientList[i].focus();
        }
      }

      // Open new window if needed
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
