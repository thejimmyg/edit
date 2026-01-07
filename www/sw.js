// Separate caches for scripts (versioned) and content (persistent)
const SCRIPT_VERSION = 3;
const SCRIPT_CACHE = 'scripts-v' + SCRIPT_VERSION;
const CONTENT_CACHE = 'content-v1';

console.log('[SW] Service worker loaded, script version', SCRIPT_VERSION);

// Determine which cache to use for a URL
function getCacheName(url) {
  if (url.pathname.startsWith('/_script/') || url.pathname === '/sw.js') {
    return SCRIPT_CACHE;
  }
  return CONTENT_CACHE;
}

// Check if offline mode is enabled
async function isOfflineMode() {
  try {
    const cache = await caches.open(CONTENT_CACHE);
    const response = await cache.match('/__offline_mode__');
    const enabled = response !== undefined;
    console.log('[SW] isOfflineMode:', enabled);
    return enabled;
  } catch (e) {
    console.error('[SW] isOfflineMode error:', e);
    return false;
  }
}

// Cache-first strategy (for _gallery files and offline mode)
async function cacheFirst(request, cacheName) {
  const url = request.url;
  console.log('[SW] cacheFirst:', url);

  try {
    const cached = await caches.match(request);
    if (cached) {
      console.log('[SW] cacheFirst HIT:', url);
      return cached;
    }
    console.log('[SW] cacheFirst MISS, fetching:', url);
  } catch (e) {
    console.error('[SW] cacheFirst match error:', e);
  }

  try {
    const response = await fetch(request);
    console.log('[SW] cacheFirst fetched:', url, 'status:', response.status);
    if (response.status === 200) {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
      console.log('[SW] cacheFirst cached:', url, 'in', cacheName);
    } else {
      console.log('[SW] cacheFirst not caching status:', response.status);
    }
    return response;
  } catch (e) {
    console.error('[SW] cacheFirst fetch error:', url, e);
    return new Response('Offline - content not cached', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Network-first strategy (for regular files)
async function networkFirst(request, cacheName) {
  const url = request.url;
  console.log('[SW] networkFirst:', url);

  try {
    const response = await fetch(request);
    console.log('[SW] networkFirst fetched:', url, 'status:', response.status);
    if (response.status === 200) {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
      console.log('[SW] networkFirst cached:', url, 'in', cacheName);
    } else {
      console.log('[SW] networkFirst not caching status:', response.status);
    }
    return response;
  } catch (e) {
    console.log('[SW] networkFirst fetch failed, trying cache:', url);
    try {
      const cached = await caches.match(request);
      if (cached) {
        console.log('[SW] networkFirst cache fallback HIT:', url);
        return cached;
      }
    } catch (matchError) {
      console.error('[SW] networkFirst cache match error:', matchError);
    }

    console.log('[SW] networkFirst no cache, returning 503:', url);
    return new Response('Offline - content not cached', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Handle fetch events
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    console.log('[SW] Skipping non-GET:', event.request.method, url.href);
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    console.log('[SW] Skipping non-http:', url.protocol, url.href);
    return;
  }

  // Skip range requests (video streaming) - let browser handle directly
  if (event.request.headers.get('Range')) {
    console.log('[SW] Skipping range request:', url.pathname);
    return;
  }

  console.log('[SW] Handling fetch:', url.pathname);
  const cacheName = getCacheName(url);

  event.respondWith((async () => {
    try {
      const offlineMode = await isOfflineMode();

      // Gallery files: always cache-first
      if (url.pathname.includes('/_gallery/')) {
        console.log('[SW] Using cacheFirst for gallery:', url.pathname);
        return await cacheFirst(event.request, cacheName);
      }

      // Offline mode enabled: cache-first for everything
      if (offlineMode) {
        console.log('[SW] Using cacheFirst (offline mode):', url.pathname);
        return await cacheFirst(event.request, cacheName);
      }

      // Normal mode: network-first
      console.log('[SW] Using networkFirst:', url.pathname);
      return await networkFirst(event.request, cacheName);
    } catch (e) {
      console.error('[SW] Fetch handler error:', e);
      return new Response('Service Worker Error: ' + e.message, {
        status: 500,
        statusText: 'Internal Error'
      });
    }
  })());
});

// Handle messages from the page
self.addEventListener('message', async (event) => {
  console.log('[SW] Received message:', event.data);

  try {
    if (event.data && event.data.type === 'SET_OFFLINE_MODE') {
      const cache = await caches.open(CONTENT_CACHE);
      if (event.data.enabled) {
        await cache.put('/__offline_mode__', new Response('true'));
        console.log('[SW] Offline mode ENABLED');
      } else {
        await cache.delete('/__offline_mode__');
        console.log('[SW] Offline mode DISABLED');
      }
      // Notify all clients of the change
      const clients = await self.clients.matchAll();
      console.log('[SW] Notifying', clients.length, 'clients');
      clients.forEach(client => {
        client.postMessage({ type: 'OFFLINE_MODE_CHANGED', enabled: event.data.enabled });
      });
    }

    if (event.data && event.data.type === 'GET_OFFLINE_MODE') {
      const enabled = await isOfflineMode();
      console.log('[SW] GET_OFFLINE_MODE, responding with:', enabled);
      if (event.source) {
        event.source.postMessage({ type: 'OFFLINE_MODE_STATUS', enabled });
      } else {
        // Fallback: send to all clients
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({ type: 'OFFLINE_MODE_STATUS', enabled });
        });
      }
    }
  } catch (e) {
    console.error('[SW] Message handler error:', e);
  }
});

// Install event - activate immediately
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  self.skipWaiting();
});

// Activate event - claim all clients and clean old SCRIPT caches only
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    Promise.all([
      // Clean up old script caches and legacy single cache, preserve content cache
      caches.keys().then(keys => {
        return Promise.all(
          keys.filter(key =>
            (key.startsWith('scripts-v') && key !== SCRIPT_CACHE) ||
            key.startsWith('site-cache-v')  // Clean up old single cache
          ).map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
        );
      }),
      // Claim clients
      self.clients.claim()
    ]).then(() => {
      console.log('[SW] Activated, cleaned old script caches, claimed clients');
    })
  );
});

// Log any errors
self.addEventListener('error', (event) => {
  console.error('[SW] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled rejection:', event.reason);
});
