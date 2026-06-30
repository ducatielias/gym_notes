/**
 * MÓDULO: sw-update.js
 * Controla la detección de actualizaciones del Service Worker
 * y muestra un modal para gestionar la actualización.
 * 
 * FUNCIONALIDADES:
 * - Detectar nuevas versiones del Service Worker
 * - Mostrar modal con opciones: Actualizar, Exportar y actualizar, Más tarde
 * - Permitir exportar datos antes de actualizar
 * - Forzar la actualización cuando el usuario lo decida
 */

// ==========================================================================
// ESTADO GLOBAL
// ==========================================================================

let swUpdatePending = false;
let swUpdateRegistration = null;
let swUpdateResolve = null;

// ==========================================================================
// DETECTAR ACTUALIZACIONES DEL SERVICE WORKER
// ==========================================================================

function initSWUpdateDetection() {
    console.log('[sw-update] Inicializando detector de actualizaciones...');
    
    if (!('serviceWorker' in navigator)) {
        console.log('[sw-update] Service Worker no soportado');
        return;
    }

    // Escuchar mensajes del Service Worker
    navigator.serviceWorker.addEventListener('message', handleSWMessage);

    // Verificar actualizaciones periódicamente (cada 5 minutos)
    setInterval(() => {
        checkForSWUpdate();
    }, 5 * 60 * 1000);

    // Verificar al volver a la página (visibility change)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            checkForSWUpdate();
        }
    });

    console.log('[sw-update] Detector de actualizaciones inicializado');
}

function handleSWMessage(event) {
    console.log('[sw-update] Mensaje del Service Worker:', event.data);
    
    if (event.data && event.data.action === 'updateAvailable') {
        console.log('[sw-update] ¡Nueva versión disponible!');
        swUpdatePending = true;
        showUpdateModal();
    }
}

function checkForSWUpdate() {
    if (!('serviceWorker' in navigator)) return;
    
    navigator.serviceWorker.ready.then((registration) => {
        registration.update().then(() => {
            console.log('[sw-update] Comprobación de actualización completada');
        }).catch((error) => {
            console.warn('[sw-update] Error al comprobar actualizaciones:', error);
        });
    });
}

// ==========================================================================
// MODAL DE ACTUALIZACIÓN
// ==========================================================================

function showUpdateModal() {
    console.log('[sw-update] Mostrando modal de actualización...');
    
    // Verificar si ya hay un modal abierto
    if (document.getElementById('sw-update-modal')) {
        return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'sw-update-modal';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '4000';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.6)';
    overlay.style.backdropFilter = 'blur(6px)';
    overlay.style.webkitBackdropFilter = 'blur(6px)';

    overlay.innerHTML = `
        <div class="modal-container" style="max-width: 340px; width: 90%;">
            <div class="modal-header">
                <span class="modal-icon"><i class="fa-solid fa-arrow-up-circle" style="color: #ccff00;"></i></span>
                <h3 style="margin:0; font-size:18px; font-weight:700;">Actualización disponible</h3>
            </div>
            <div class="modal-body" style="padding: 16px 20px 8px 20px;">
                <p style="font-size:14px; color:#374151; text-align:left; line-height:1.5; margin-bottom:12px;">
                    Hay una nueva versión de <strong>Gym Notes</strong> disponible.
                </p>
                <p style="font-size:13px; color:#6b7280; text-align:left; line-height:1.4; margin-bottom:4px;">
                    <i class="fa-solid fa-info-circle" style="color:#9ca3af;"></i>
                    Se recomienda exportar los datos antes de actualizar por seguridad.
                </p>
                <div style="margin-top:8px; padding:10px 12px; background:#f3f4f6; border-radius:8px; font-size:12px; color:#6b7280; text-align:center;">
                    <i class="fa-solid fa-cloud-arrow-up"></i> 
                    Versión actual: <span id="sw-current-version">v.0.80</span>
                </div>
            </div>
            <div class="modal-footer" style="padding:12px 20px 20px; display:flex; flex-direction:column; gap:8px; border-top:1px solid #f3f4f6;">
                <button id="sw-update-btn" class="modal-btn modal-btn-primary" style="width:100%; padding:12px; border:none; border-radius:12px; font-size:15px; font-weight:700; cursor:pointer; background:var(--accent-color, #ccff00); color:var(--primary-color, #000000);">
                    <i class="fa-solid fa-rotate"></i> Actualizar ahora
                </button>
                <button id="sw-export-update-btn" class="modal-btn" style="width:100%; padding:12px; border:1px solid #e5e7eb; border-radius:12px; font-size:14px; font-weight:600; cursor:pointer; background:#ffffff; color:#4b5563;">
                    <i class="fa-solid fa-file-export"></i> Exportar y actualizar
                </button>
                <button id="sw-later-btn" class="modal-btn modal-btn-secondary" style="width:100%; padding:12px; border:none; border-radius:12px; font-size:14px; font-weight:600; cursor:pointer; background:transparent; color:#9ca3af;">
                    Más tarde
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Event listeners
    document.getElementById('sw-update-btn').addEventListener('click', function() {
        closeUpdateModal();
        performUpdate();
    });

    document.getElementById('sw-export-update-btn').addEventListener('click', function() {
        closeUpdateModal();
        performExportAndUpdate();
    });

    document.getElementById('sw-later-btn').addEventListener('click', function() {
        closeUpdateModal();
        console.log('[sw-update] Actualización pospuesta');
        // Mostrar un pequeño toast o notificación (opcional)
    });

    // Cerrar al hacer clic fuera
    overlay.addEventListener('click', function(e) {
        if (e.target === this) {
            closeUpdateModal();
            console.log('[sw-update] Actualización pospuesta (clic fuera)');
        }
    });
}

function closeUpdateModal() {
    const modal = document.getElementById('sw-update-modal');
    if (modal) {
        modal.remove();
    }
}

// ==========================================================================
// ACCIONES DE ACTUALIZACIÓN
// ==========================================================================

function performUpdate() {
    console.log('[sw-update] Ejecutando actualización...');
    
    if (typeof window.showAlert === 'function') {
        window.showAlert('🔄 Actualizando la aplicación...\nLa página se recargará automáticamente.', 'Actualizando');
    }
    
    // Forzar la activación del nuevo Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
            // Buscar el worker en espera
            if (registration.waiting) {
                // Enviar mensaje para saltar la espera
                registration.waiting.postMessage({ action: 'skipWaiting' });
            } else {
                // Si no hay worker en espera, recargar directamente
                window.location.reload();
            }
        }).catch(() => {
            window.location.reload();
        });
    } else {
        window.location.reload();
    }
    
    // Escuchar cuando el nuevo SW tome el control
    navigator.serviceWorker.addEventListener('controllerchange', function() {
        console.log('[sw-update] Nuevo Service Worker activo, recargando...');
        window.location.reload();
    });
}

function performExportAndUpdate() {
    console.log('[sw-update] Exportando datos y actualizando...');
    
    // Abrir el modal de exportación de datos
    if (typeof window.openExportDataModal === 'function') {
        // Modificamos ligeramente el comportamiento para que después de exportar, se actualice
        const originalClose = window.cerrarExportDataModal;
        
        // Sobrescribimos temporalmente el cierre para ejecutar la actualización después de exportar
        window.cerrarExportDataModal = function() {
            // Restaurar la función original
            window.cerrarExportDataModal = originalClose;
            
            // Ejecutar la exportación real
            if (typeof originalClose === 'function') {
                originalClose();
            }
            
            // Mostrar mensaje y actualizar
            setTimeout(() => {
                if (typeof window.showAlert === 'function') {
                    window.showAlert('✅ Datos exportados.\n🔄 Actualizando la aplicación...', 'Completado');
                }
                setTimeout(() => {
                    performUpdate();
                }, 1000);
            }, 500);
        };
        
        // Abrir el modal de exportación
        window.openExportDataModal();
    } else {
        // Si no existe la función de exportación, solo actualizar
        window.showAlert('⚠️ No se pudo exportar los datos.\nActualizando directamente...', 'Aviso');
        setTimeout(() => {
            performUpdate();
        }, 1000);
    }
}

// ==========================================================================
// FUNCIÓN PARA FORZAR ACTUALIZACIÓN (desde el SW)
// ==========================================================================

function forceSWUpdate() {
    if (!('serviceWorker' in navigator)) return;
    
    navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
            registration.waiting.postMessage({ action: 'skipWaiting' });
            // Recargar cuando el nuevo SW tome el control
            navigator.serviceWorker.addEventListener('controllerchange', function() {
                window.location.reload();
            });
        } else {
            // Comprobar si hay actualizaciones
            registration.update().then(() => {
                // Si después de actualizar hay un worker en espera, activarlo
                if (registration.waiting) {
                    registration.waiting.postMessage({ action: 'skipWaiting' });
                }
            });
        }
    });
}

// ==========================================================================
// INICIALIZACIÓN
// ==========================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSWUpdateDetection);
} else {
    setTimeout(initSWUpdateDetection, 500);
}

// Exponer funciones globalmente
window.initSWUpdateDetection = initSWUpdateDetection;
window.performUpdate = performUpdate;
window.performExportAndUpdate = performExportAndUpdate;
window.forceSWUpdate = forceSWUpdate;
window.showUpdateModal = showUpdateModal;
window.closeUpdateModal = closeUpdateModal;

console.log('[sw-update] Módulo cargado correctamente');