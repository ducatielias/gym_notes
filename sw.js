/**
 * Gym Notes - Service Worker
 * Gestiona el caché offline y la instalación como PWA
 * 
 * VERSIÓN: 1.0.0
 */

// ==========================================================================
// CONSTANTES
// ==========================================================================

const CACHE_VERSION = 'gym-notes-v0-72';
const CACHE_NAME = CACHE_VERSION;

// Archivos a cachear para funcionamiento offline
const FILES_TO_CACHE = [
  // HTML
  '/index.html',
  
  // CSS
  '/css/index-core.css',
  '/css/index-components.css',
  '/css/index-modals.css',
  '/css/index-workout.css',
  '/css/gym-session.css',
  '/css/gym-exercises.css',
  '/css/gym-plan.css',
  '/css/history.css',
  '/css/exercise-viewer.css',
  '/css/ia-assistant.css',
  '/css/today-dashboard.css',
  
  // JS - CORE
  '/js/index.js',
  '/js/modal.js',
  '/js/ui-helpers.js',
  '/js/back-handler.js',
  '/js/wake-lock.js',
  '/js/data-import-export.js',
  
  // JS - PLAN
  '/js/plan-state.js',
  '/js/plan-menus.js',
  '/js/plan-routines.js',
  '/js/plan-sessions.js',
  '/js/plan.js',
  
  // JS - EXERCISES
  '/js/exercises-state.js',
  '/js/exercises-render.js',
  '/js/exercises-crud.js',
  '/js/exercises-import-export.js',
  '/js/exercises-share.js',
  '/js/exercises.js',
  
  // JS - HISTORY
  '/js/history-state.js',
  '/js/history-filters.js',
  '/js/history-render.js',
  '/js/history-export.js',
  '/js/history-edit.js',
  '/js/history.js',
  
  // JS - WORKOUT
  '/js/workout-state.js',
  '/js/workout-timers.js',
  '/js/workout-editor.js',
  '/js/workout.js',
  '/js/gym-session.js',
  
  // JS - OTROS
  '/js/exercise-viewer.js',
  '/js/ia-assistant.js',
  '/js/today-dashboard.js',
  
  // Librerías externas (CDN - se cachean desde la red)
  'https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.snow.css',
  'https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// ==========================================================================
// EVENTOS DEL SERVICE WORKER
// ==========================================================================

// INSTALACIÓN
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cacheando archivos...');
        return cache.addAll(FILES_TO_CACHE)
          .then(() => {
            console.log('[SW] Archivos cacheados correctamente');
            // Forzar la activación inmediata
            return self.skipWaiting();
          })
          .catch((error) => {
            console.error('[SW] Error al cachear archivos:', error);
          });
      })
  );
});

// ACTIVACIÓN
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Eliminar cachés antiguas
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('[SW] Service Worker activado');
      // Tomar control de todas las páginas
      return self.clients.claim();
    })
  );
});

// INTERCEPTACIÓN DE PETICIONES
self.addEventListener('fetch', (event) => {
  // Estrategia: Cache First con fallback a red
  // Excepto para peticiones que no sean GET
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Excluir peticiones de analytics o externas no esenciales
  const url = new URL(event.request.url);
  
  // Si es una petición a Google Fonts, dejar que pase (no cacheamos)
  if (url.hostname.includes('fonts.googleapis.com') || 
      url.hostname.includes('fonts.gstatic.com')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Si está en caché, devolverlo
        if (cachedResponse) {
          // Actualizar el caché en segundo plano (stale-while-revalidate)
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                  });
              }
            })
            .catch(() => {
              // Si falla la red, no importa, tenemos caché
            });
          return cachedResponse;
        }
        
        // Si no está en caché, ir a la red
        return fetch(event.request)
          .then((networkResponse) => {
            // Si la respuesta es válida, guardar en caché para futuras
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseClone);
                })
                .catch((error) => {
                  console.warn('[SW] Error al guardar en caché:', error);
                });
            }
            return networkResponse;
          })
          .catch((error) => {
            console.warn('[SW] Error en fetch:', error);
            // Si es una petición de navegación y offline, mostrar página offline
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html')
                .then((offlinePage) => {
                  if (offlinePage) {
                    return offlinePage;
                  }
                  // Si no hay página offline, mostrar error
                  return new Response('Offline - No se pudo cargar la página', {
                    status: 503,
                    statusText: 'Service Unavailable'
                  });
                });
            }
            return new Response('Offline - Recurso no disponible', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// MANEJO DE MENSAJES
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker cargado correctamente');