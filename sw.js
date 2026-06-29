/**
 * Gym Notes - Service Worker (Versión Portable)
 * VERSIÓN: 1.0.1
 */

const CACHE_VERSION = 'gym-notes-v0-76';
const CACHE_NAME = CACHE_VERSION;

const FILES_TO_CACHE = [
  './',
  'index.html',
  'manifest.json',
  
  'css/index-core.css',
  'css/index-components.css',
  'css/index-modals.css',
  'css/index-workout.css',
  'css/gym-session.css',
  'css/gym-exercises.css',
  'css/gym-plan.css',
  'css/history.css',
  'css/exercise-viewer.css',
  'css/ia-assistant.css',
  'css/today-dashboard.css',
  
  'js/index.js',
  'js/modal.js',
  'js/ui-helpers.js',
  'js/back-handler.js',
  'js/wake-lock.js',
  'js/data-import-export.js',
  'js/sw-update.js',
  
  'js/plan-state.js',
  'js/plan-menus.js',
  'js/plan-routines.js',
  'js/plan-sessions.js',
  'js/plan.js',
  
  'js/exercises-state.js',
  'js/exercises-render.js',
  'js/exercises-crud.js',
  'js/exercises-import-export.js',
  'js/exercises-share.js',
  'js/exercises.js',
  
  'js/history-state.js',
  'js/history-filters.js',
  'js/history-render.js',
  'js/history-export.js',
  'js/history-edit.js',
  'js/history.js',
  
  'js/workout-state.js',
  'js/workout-timers.js',
  'js/workout-editor.js',
  'js/workout.js',
  'js/gym-session.js',
  
  'js/exercise-viewer.js',
  'js/ia-assistant.js',
  'js/today-dashboard.js',
  
  'icons/icon-72x72.png',
  'icons/icon-96x96.png',
  'icons/icon-128x128.png',
  'icons/icon-144x144.png',
  'icons/icon-152x152.png',
  'icons/icon-192x192.png',
  'icons/icon-256x256.png',
  'icons/icon-384x384.png',
  'icons/icon-512x512.png',
  
  'https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.snow.css',
  'https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// INSTALACIÓN
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cacheando archivos...');
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(() => {
        console.log('[SW] Instalación completada');
        return self.skipWaiting();
      })
  );
});

// ACTIVACIÓN
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('[SW] Activación completada');
      return self.clients.claim();
    })
    .then(() => {
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            action: 'updateAvailable',
            version: CACHE_VERSION
          });
        });
      });
    })
  );
});

// INTERCEPTACIÓN DE PETICIONES
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  if (request.method !== 'GET') return;
  
  // Ignorar peticiones a Google Fonts
  if (url.hostname.includes('fonts.googleapis.com') || 
      url.hostname.includes('fonts.gstatic.com')) {
    return;
  }
  
  // Gestión estricta de navegaciones de documentos principales
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('./') || caches.match('index.html')
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request);
        })
        .catch(() => {
          return caches.match('./') || caches.match('index.html');
        })
    );
    return;
  }
  
  // Estrategia Cache-First para assets estáticos
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Stale-While-Revalidate
          fetch(request)
            .then(networkResponse => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME)
                  .then(cache => cache.put(request, networkResponse));
              }
            })
            .catch(() => {});
          return cachedResponse;
        }
        return fetch(request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(request, clone));
            }
            return networkResponse;
          });
      })
  );
});

// MANEJO DE MENSAJES
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    console.log('[SW] Saltando espera...');
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker cargado correctamente');