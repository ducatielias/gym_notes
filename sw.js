/**
 * Gym Notes - Service Worker (Versión Portable)
 * VERSIÓN: 1.0.5
 * 
 * CORREGIDO: Rutas relativas para funcionar en cualquier subdirectorio
 * CORREGIDO: Cacheo robusto con fallback a index.html
 * CORREGIDO: Stale-While-Revalidate optimizado
 * MODIFICADO: Soporte para mensaje "getVersion" que devuelve CACHE_VERSION
 */

const CACHE_VERSION = 'gym-notes-v1-14';
const CACHE_NAME = CACHE_VERSION;

// ============================================================
// ARCHIVOS A CACHEAR (Rutas relativas sin la barra '/' al inicio)
// ============================================================
const FILES_TO_CACHE = [
  './', // Cachea la raíz del subdirectorio (index.html)
  'index.html',
  'manifest.json',
  
  // CSS
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

  // Design System
  'css/design/tokens.css',
  'css/design/components/buttons.css',
  'css/design/components/cards.css',
  'css/design/components/forms.css',
  'css/design/components/headers.css',
  'css/design/components/menus.css',
  'css/design/components/modals.css',
  'css/design/components/navigation.css',
  'css/design/pages/active-workout.css',
  'css/design/pages/exercise-editor.css',
  'css/design/pages/exercises.css',
  'css/design/pages/exercise-viewer.css',
  'css/design/pages/history.css',
  'css/design/pages/history-detail.css',
  'css/design/pages/ia-assistant.css',
  'css/design/pages/today.css',
  'css/design/pages/workout-timers.css',
  
  // JS - CORE
  'js/index.js',
  'js/safe-render.js',
  'js/storage-service.js',
  'js/modal.js',
  'js/ui-helpers.js',
  'js/back-handler.js',
  'js/wake-lock.js',
  'js/data-import-export.js',
  'js/sw-update.js',
  
  // JS - PLAN
  'js/plan-state.js',
  'js/plan-menus.js',
  'js/plan-routines.js',
  'js/plan-sessions.js',
  'js/plan.js',
  
  // JS - EXERCISES
  'js/exercises-state.js',
  'js/exercises-render.js',
  'js/exercises-crud.js',
  'js/exercises-import-export.js',
  'js/exercises-share.js',
  'js/exercises.js',
  
  // JS - HISTORY
  'js/history-state.js',
  'js/history-filters.js',
  'js/history-render.js',
  'js/history-export.js',
  'js/history-edit.js',
  'js/history.js',
  
  // JS - WORKOUT
  'js/workout-state.js',
  'js/workout-timers.js',
  'js/workout-editor.js',
  'js/workout.js',
  'js/gym-session.js',
  
  // JS - OTROS
  'js/exercise-viewer.js',
  'js/ia-assistant.js',
  'js/today-dashboard.js',
  
  // Iconos
  'icons/icon-72x72.png',
  'icons/icon-96x96.png',
  'icons/icon-128x128.png',
  'icons/icon-144x144.png',
  'icons/icon-152x152.png',
  'icons/icon-192x192.png',
  'icons/icon-256x256.png',
  'icons/icon-384x384.png',
  'icons/icon-512x512.png',
  
  // Librerías externas (CDNs)
  'https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.snow.css',
  'https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// ============================================================
// INSTALACIÓN
// ============================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando e inflando caché...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cacheando archivos...');
        return cache.addAll(FILES_TO_CACHE)
          .catch(err => {
            console.error('[SW] Error en cache.addAll. Verifica que todos los archivos existan:', err);
            throw err;
          });
      })
      .then(() => {
        console.log('[SW] Instalación completada');
        return self.skipWaiting();
      })
  );
});

// ============================================================
// ACTIVACIÓN
// ============================================================
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
      // Notificar a la página que hay una nueva versión
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

// ============================================================
// INTERCEPTACIÓN DE PETICIONES (Cache First + Stale-While-Revalidate)
// ============================================================
self.addEventListener('fetch', (event) => {
  // Solo manejar peticiones GET
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // Ignorar peticiones a Google Fonts (no las cacheamos)
  if (url.hostname.includes('fonts.googleapis.com') || 
      url.hostname.includes('fonts.gstatic.com')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Stale-While-Revalidate: Actualizar caché desde la red silenciosamente
          fetch(event.request)
            .then(networkResponse => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME)
                  .then(cache => cache.put(event.request, networkResponse));
              }
            })
            .catch(() => {
              // Fallo en silencio si está offline
            });
          return cachedResponse;
        }
        
        // Si no está en caché, ir a la red
        return fetch(event.request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, clone))
                .catch(() => {});
            }
            return networkResponse;
          })
          .catch(() => {
            // Fallback para navegación de páginas si falla internet
            if (event.request.mode === 'navigate') {
              return caches.match('./') || caches.match('index.html');
            }
            return new Response('Offline - Recurso no disponible', { status: 503 });
          });
      })
  );
});

// ============================================================
// MANEJO DE MENSAJES (incluyendo solicitud de versión)
// ============================================================
self.addEventListener('message', (event) => {
  const data = event.data;
  
  // Mensaje para saltar la espera (actualización)
  if (data && data.action === 'skipWaiting') {
    console.log('[SW] Saltando espera...');
    self.skipWaiting();
    return;
  }
  
  // Mensaje para obtener la versión de la caché
  if (data && data.action === 'getVersion') {
    console.log('[SW] Recibida solicitud de versión. Enviando:', CACHE_VERSION);
    // Responder al puerto de mensaje si existe
    if (event.ports && event.ports.length > 0) {
      event.ports[0].postMessage({ version: CACHE_VERSION });
      console.log('[SW] Versión enviada por puerto.');
    } else {
      // Si no hay puerto, responder al cliente que envió el mensaje
      event.source.postMessage({ 
        action: 'versionResponse', 
        version: CACHE_VERSION 
      });
      console.log('[SW] Versión enviada por source.');
    }
    return;
  }
});

console.log('[SW] Service Worker cargado correctamente');
