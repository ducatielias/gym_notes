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
 * - Obtener la versión actual desde sw.js dinámicamente
 * - Comprobar actualizaciones bajo demanda (desde la interfaz)
 * - Ignorar una versión específica (guardar en localStorage)
 */

// ==========================================================================
// ESTADO GLOBAL
// ==========================================================================

let swUpdatePending = false;
let swUpdateRegistration = null;
let swUpdateResolve = null;
let swCurrentVersion = 'desconocida';
let swVersionLoaded = false;
let swUpdateApplying = false;
let swUpdateReloaded = false;

// ==========================================================================
// OBTENER VERSIÓN DESDE sw.js
// ==========================================================================

async function fetchSWVersion() {
    try {
        const response = await fetch('./sw.js');
        if (!response.ok) throw new Error('No se pudo cargar sw.js');
        const text = await response.text();
        // Buscar CACHE_VERSION = 'gym-notes-v0-81' o similar
        const match = text.match(/CACHE_VERSION\s*=\s*['"]([^'"]+)['"]/);
        if (match && match[1]) {
            let version = match[1];
            // Extraer número después de 'v' o 'gym-notes-v'
            // formato esperado: gym-notes-v0-81 -> v0.81
            const versionMatch = version.match(/v([\d-]+)/);
            if (versionMatch) {
                let num = versionMatch[1];
                // Reemplazar guiones por puntos
                num = num.replace(/-/g, '.');
                swCurrentVersion = 'v' + num;
            } else {
                swCurrentVersion = version;
            }
            console.log('[sw-update] Versión detectada desde sw.js:', swCurrentVersion);
        } else {
            console.warn('[sw-update] No se encontró CACHE_VERSION en sw.js');
        }
    } catch (error) {
        console.warn('[sw-update] Error al obtener versión desde sw.js:', error);
    }
    swVersionLoaded = true;
}

// ==========================================================================
// DETECTAR ACTUALIZACIONES DEL SERVICE WORKER
// ==========================================================================

function initSWUpdateDetection() {
    console.log('[sw-update] Inicializando detector de actualizaciones...');
    
    // Obtener la versión desde sw.js
    fetchSWVersion();
    
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
        // Verificar si esta versión ya fue ignorada
        const ignoredVersion = localStorage.getItem('sw_ignored_version');
        if (ignoredVersion === swCurrentVersion) {
            console.log('[sw-update] Versión ignorada por el usuario, no se muestra el modal.');
            return;
        }
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
// COMPROBAR ACTUALIZACIÓN BAJO DEMANDA (DESDE INTERFAZ)
// ==========================================================================

async function checkForUpdateAndShowResult() {
    console.log('[sw-update] Comprobando actualizaciones bajo demanda...');
    
    if (!('serviceWorker' in navigator)) {
        if (typeof window.showAlert === 'function') {
            window.showAlert('Tu navegador no soporta Service Worker.', 'Aviso');
        } else {
            alert('Tu navegador no soporta Service Worker.');
        }
        return;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        // Forzar la comprobación
        await registration.update();
        
        // Esperar un momento para que el SW pueda responder
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verificar si hay un worker en espera
        if (registration.waiting) {
            console.log('[sw-update] Nueva versión encontrada (waiting).');
            // Verificar si fue ignorada
            const ignoredVersion = localStorage.getItem('sw_ignored_version');
            if (ignoredVersion === swCurrentVersion) {
                if (typeof window.showAlert === 'function') {
                    window.showAlert('Hay una actualización disponible, pero la has ignorado. Para instalarla, ve a "Actualizar app" de nuevo.', 'Aviso');
                }
                return;
            }
            swUpdatePending = true;
            showUpdateModal();
            return;
        }
        
        // También podemos verificar si hay un nuevo worker instalado pero no activo aún
        // (a veces el update() no lo deja en waiting inmediatamente)
        // Forzamos un segundo check
        await registration.update();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (registration.waiting) {
            console.log('[sw-update] Nueva versión encontrada (segundo intento).');
            const ignoredVersion = localStorage.getItem('sw_ignored_version');
            if (ignoredVersion === swCurrentVersion) {
                if (typeof window.showAlert === 'function') {
                    window.showAlert('Hay una actualización disponible, pero la has ignorado. Para instalarla, ve a "Actualizar app" de nuevo.', 'Aviso');
                }
                return;
            }
            swUpdatePending = true;
            showUpdateModal();
            return;
        }
        
        // Si no hay waiting, podemos consultar si hay una actualización en el registro
        // (algunos navegadores pueden tener un installing)
        if (registration.installing) {
            console.log('[sw-update] Worker instalando, esperando...');
            // Esperar a que termine de instalar
            await new Promise(resolve => {
                const checkInstalling = () => {
                    if (registration.installing) {
                        setTimeout(checkInstalling, 200);
                    } else {
                        resolve();
                    }
                };
                checkInstalling();
            });
            // Volver a comprobar
            if (registration.waiting) {
                const ignoredVersion = localStorage.getItem('sw_ignored_version');
                if (ignoredVersion === swCurrentVersion) {
                    if (typeof window.showAlert === 'function') {
                        window.showAlert('Hay una actualización disponible, pero la has ignorado. Para instalarla, ve a "Actualizar app" de nuevo.', 'Aviso');
                    }
                    return;
                }
                swUpdatePending = true;
                showUpdateModal();
                return;
            }
        }
        
        // Si llegamos aquí, no hay actualización
        if (typeof window.showAlert === 'function') {
            window.showAlert('✅ La aplicación ya está actualizada a la última versión.', 'Actualizado');
        } else {
            alert('La aplicación ya está actualizada.');
        }
        
    } catch (error) {
        console.error('[sw-update] Error al comprobar actualizaciones:', error);
        if (typeof window.showAlert === 'function') {
            window.showAlert('Error al comprobar actualizaciones: ' + error.message, 'Error');
        } else {
            alert('Error al comprobar actualizaciones.');
        }
    }
}

// ==========================================================================
// MODAL DE ACTUALIZACIÓN
// ==========================================================================

/**
 * Isola los listeners temporales y el foco de cada diálogo de actualización.
 * Los listeners del ciclo de vida del Service Worker permanecen fuera de esta
 * utilidad y no se eliminan al cerrar el diálogo.
 */
const swUpdateModalAccessibility = (() => {
    const overlayStates = new WeakMap();
    let instanceSequence = 0;

    const focusableSelector = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled]):not([type="hidden"])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    function isCustomModalOpen() {
        const customModal = document.getElementById('customModal');
        return customModal &&
            !customModal.classList.contains('hidden') &&
            customModal.getAttribute('aria-hidden') !== 'true';
    }

    function getFocusableElements(dialog) {
        return Array.from(dialog.querySelectorAll(focusableSelector)).filter((element) => {
            const styles = window.getComputedStyle(element);
            return !element.disabled &&
                element.getAttribute('aria-disabled') !== 'true' &&
                !element.hidden &&
                !element.closest('.hidden') &&
                element.getAttribute('aria-hidden') !== 'true' &&
                styles.display !== 'none' &&
                styles.visibility !== 'hidden';
        });
    }

    function addListener(overlay, target, type, listener, options) {
        const state = overlayStates.get(overlay);
        if (!state) return;

        target.addEventListener(type, listener, options);
        state.listeners.push({ target, type, listener, options });
    }

    function restoreFocus(state) {
        const previousFocus = state.previousFocus;
        if (
            previousFocus &&
            previousFocus.isConnected &&
            !previousFocus.disabled &&
            !previousFocus.closest('.hidden') &&
            typeof previousFocus.focus === 'function' &&
            !isCustomModalOpen()
        ) {
            previousFocus.focus();
        }
    }

    function cleanup(overlay) {
        const state = overlayStates.get(overlay);
        if (!state) return;

        state.listeners.forEach(({ target, type, listener, options }) => {
            target.removeEventListener(type, listener, options);
        });
        overlayStates.delete(overlay);
        restoreFocus(state);
    }

    function setup(overlay, { dialog, title, description, onEscape, onBackdrop }) {
        const instanceId = ++instanceSequence;
        const activeElement = document.activeElement;
        const previousFocus = activeElement && activeElement !== document.body ? activeElement : null;

        title.id = `sw-update-title-${instanceId}`;
        description.id = `sw-update-description-${instanceId}`;
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', title.id);
        dialog.setAttribute('aria-describedby', description.id);
        dialog.setAttribute('tabindex', '-1');

        overlayStates.set(overlay, { dialog, previousFocus, listeners: [] });

        const handleKeydown = (event) => {
            if (!overlay.isConnected || isCustomModalOpen()) return;

            if (event.key === 'Tab') {
                const focusableElements = getFocusableElements(dialog);
                if (focusableElements.length === 0) {
                    event.preventDefault();
                    dialog.focus();
                    return;
                }

                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (!focusableElements.includes(document.activeElement)) {
                    event.preventDefault();
                    (event.shiftKey ? lastElement : firstElement).focus();
                } else if (event.shiftKey && document.activeElement === firstElement) {
                    event.preventDefault();
                    lastElement.focus();
                } else if (!event.shiftKey && document.activeElement === lastElement) {
                    event.preventDefault();
                    firstElement.focus();
                }
            } else if (event.key === 'Escape') {
                event.preventDefault();
                onEscape();
            }
        };

        const handleBackdropClick = (event) => {
            if (event.target === overlay) {
                onBackdrop();
            }
        };

        addListener(overlay, document, 'keydown', handleKeydown);
        addListener(overlay, overlay, 'click', handleBackdropClick);

        // El aviso puede aparecer automáticamente; no preselecciona una
        // acción que recarga la página, pero sí entra en el diálogo modal.
        if (!isCustomModalOpen()) {
            dialog.focus();
        }
    }

    return { setup, addListener, cleanup };
})();

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

    // Usar la versión obtenida dinámicamente
    const versionDisplay = swVersionLoaded ? swCurrentVersion : '...cargando...';

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
                    Versión actual: <span id="sw-current-version">${versionDisplay}</span>
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
                    Ignorar esta versión
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const dialog = overlay.querySelector('.modal-container');
    const title = dialog.querySelector('h3');
    const description = dialog.querySelector('.modal-body p');
    const updateButton = overlay.querySelector('#sw-update-btn');
    const exportAndUpdateButton = overlay.querySelector('#sw-export-update-btn');
    const laterButton = overlay.querySelector('#sw-later-btn');

    swUpdateModalAccessibility.setup(overlay, {
        dialog,
        title,
        description,
        onEscape: () => closeUpdateModal(),
        onBackdrop: () => {
            closeUpdateModal();
            console.log('[sw-update] Actualización pospuesta (clic fuera)');
        }
    });

    // Listeners temporales de esta instancia visual.
    swUpdateModalAccessibility.addListener(overlay, updateButton, 'click', function() {
        closeUpdateModal();
        performUpdate();
    });

    swUpdateModalAccessibility.addListener(overlay, exportAndUpdateButton, 'click', function() {
        closeUpdateModal();
        performExportAndUpdate();
    });

    swUpdateModalAccessibility.addListener(overlay, laterButton, 'click', function() {
        // Guardar la versión ignorada en localStorage
        if (swCurrentVersion && swCurrentVersion !== 'desconocida') {
            localStorage.setItem('sw_ignored_version', swCurrentVersion);
            console.log('[sw-update] Versión ignorada:', swCurrentVersion);
        }
        closeUpdateModal();
        console.log('[sw-update] Actualización ignorada (versión guardada)');
        // Mostrar un mensaje informativo
        if (typeof window.showAlert === 'function') {
            window.showAlert('Has ignorado esta actualización. No se te volverá a preguntar por esta versión.', 'Ignorada');
        }
    });
}

function closeUpdateModal() {
    const modal = document.getElementById('sw-update-modal');
    if (modal) {
        swUpdateModalAccessibility.cleanup(modal);
        modal.remove();
    }
}

// ==========================================================================
// ACCIONES DE ACTUALIZACIÓN
// ==========================================================================

async function performUpdate() {
    if (swUpdateApplying) {
        return { applied: false, reason: 'already-applying' };
    }

    console.log('[sw-update] Ejecutando actualización...');

    if (!('serviceWorker' in navigator)) {
        return { applied: false, reason: 'service-worker-unsupported' };
    }

    swUpdateApplying = true;

    try {
        const registration = await navigator.serviceWorker.ready;
        const waitingWorker = registration.waiting;

        if (!waitingWorker) {
            swUpdateApplying = false;
            console.warn('[sw-update] No hay un Service Worker en espera para activar.');
            return { applied: false, reason: 'no-waiting-worker' };
        }

        // Limpiar la versión ignorada solo después de confirmar que puede aplicarse.
        localStorage.removeItem('sw_ignored_version');

        if (typeof window.showAlert === 'function') {
            window.showAlert('🔄 Actualizando la aplicación...\nLa página se recargará automáticamente.', 'Actualizando');
        }

        const reloadOnce = () => {
            if (swUpdateReloaded) return;

            swUpdateReloaded = true;
            console.log('[sw-update] Nuevo Service Worker activo, recargando...');
            window.location.reload();
        };

        // El listener solo existe tras una confirmación explícita y se consume una vez.
        navigator.serviceWorker.addEventListener('controllerchange', reloadOnce, { once: true });

        try {
            waitingWorker.postMessage({ action: 'skipWaiting' });
        } catch (error) {
            navigator.serviceWorker.removeEventListener('controllerchange', reloadOnce);
            throw error;
        }

        return { applied: true, reason: 'confirmed' };
    } catch (error) {
        swUpdateApplying = false;
        console.error('[sw-update] No se pudo aplicar la actualización:', error);
        return {
            applied: false,
            reason: 'apply-failed',
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

function performExportAndUpdate() {
    console.log('[sw-update] Exportando datos y actualizando...');

    const canExport = typeof window.openExportDataModal === 'function' &&
        typeof window.exportData === 'function' &&
        typeof window.cerrarExportDataModal === 'function';

    if (!canExport) {
        if (typeof window.showAlert === 'function') {
            window.showAlert('No se pudo iniciar la exportación. La actualización no se ha aplicado.', 'Aviso');
        }
        return { applied: false, reason: 'export-unavailable' };
    }

    const originalExportData = window.exportData;
    const originalCloseExportModal = window.cerrarExportDataModal;
    let handlersRestored = false;

    const restoreExportHandlers = () => {
        if (handlersRestored) return;

        handlersRestored = true;
        window.exportData = originalExportData;
        window.cerrarExportDataModal = originalCloseExportModal;
    };

    // Cancelar, pulsar fuera o usar Escape solo restaura y cierra el exportador.
    window.cerrarExportDataModal = function(...args) {
        restoreExportHandlers();
        return originalCloseExportModal.apply(this, args);
    };

    // La actualización continúa únicamente si exportData cerró el modal tras
    // generar correctamente el archivo. Los errores de validación lo mantienen abierto.
    window.exportData = function(...args) {
        const exportModal = document.getElementById('export-data-modal');
        let result;

        try {
            result = originalExportData.apply(this, args);
        } catch (error) {
            restoreExportHandlers();
            throw error;
        }

        const exportCompleted = Boolean(exportModal) &&
            !document.getElementById('export-data-modal');

        if (exportCompleted) {
            restoreExportHandlers();
            performUpdate();
        }

        return result;
    };

    try {
        window.openExportDataModal();
    } catch (error) {
        restoreExportHandlers();
        throw error;
    }

    if (!document.getElementById('export-data-modal')) {
        restoreExportHandlers();
        return { applied: false, reason: 'export-not-started' };
    }

    return { applied: false, reason: 'awaiting-export' };
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
window.checkForUpdateAndShowResult = checkForUpdateAndShowResult;
window.fetchSWVersion = fetchSWVersion;

console.log('[sw-update] Módulo cargado correctamente');
