/**
 * Gym Notes - Service Worker
 * Gestiona el caché offline y la instalación como PWA
 * 
 * VERSIÓN: 1.0.0
 * MODIFICADO: Caché completo de todos los recursos de la aplicación para funcionamiento offline total.
 * MODIFICADO: Rutas relativas para funcionar en cualquier entorno (GitHub Pages, local, etc.).
 * MODIFICADO: Notificación a la página cuando hay una nueva versión disponible.
 */

// ==========================================================================
// CONSTANTES
// ==========================================================================

const CACHE_VERSION = 'gym-notes-v0-73';
const CACHE_NAME = CACHE_VERSION;

// Archivos a cachear para funcionamiento offline (todos los recursos de la app)
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
  '/js/sw-update.js',
  
  // Iconos
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-256x256.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  
  // Manifiesto
  '/manifest.json',
  
  // Librerías externas (CDN)
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
            // Notificar a la página que hay una nueva versión
            self.skipWaiting();
            return true;
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
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('[SW] Service Worker activado');
      
      // Notificar a todas las páginas que el SW ha sido activado
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            action: 'updateAvailable',
            version: CACHE_VERSION,
            timestamp: Date.now()
          });
        });
      });
      
      return self.clients.claim();
    })
  );
});

// INTERCEPTACIÓN DE PETICIONES
self.addEventListener('fetch', (event) => {
  // Solo manejar peticiones GET
  if (event.request.method !== 'GET') {
    return;
  }
  
  const url = new URL(event.request.url);
  
  // Excluir peticiones a Google Fonts (no las cacheamos)
  if (url.hostname.includes('fonts.googleapis.com') || 
      url.hostname.includes('fonts.gstatic.com')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Si está en caché, devolverlo y actualizar en segundo plano
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
    console.log('[SW] Recibido mensaje skipWaiting, activando nueva versión...');
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker cargado correctamente');