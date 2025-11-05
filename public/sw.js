/**
 * Service Worker for Heijō Mini-Journal
 * 
 * Handles:
 * - Push notifications
 * - Background sync
 * - Offline functionality
 */

const CACHE_NAME = 'heijo-v1';
const OFFLINE_URL = '/offline';

// Install event - cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/icon-192.svg',
        '/icon-512.svg',
      ]);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  
  const title = data.title || 'Heijō Reminder';
  const options = {
    body: data.body || 'Time to journal!',
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    tag: data.tag || 'journal-reminder',
    requireInteraction: false,
    data: {
      url: data.url || '/journal',
      ...data,
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event - open app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/journal';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-journal-entries') {
    event.waitUntil(
      // Sync journal entries in background
      syncJournalEntries()
    );
  }
});

async function syncJournalEntries() {
  // This would sync entries to Supabase
  // Implementation depends on your sync strategy
  try {
    // Placeholder for actual sync logic
    console.log('Background sync triggered');
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return response || fetch(event.request).catch(() => {
        // If offline and request is for a page, return offline page
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
      });
    })
  );
});

