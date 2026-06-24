/**
 * MÓDULO: wake-lock.js
 * Controla el Screen Wake Lock API para mantener la pantalla encendida
 * mientras la aplicación está abierta y visible.
 * 
 * FUNCIONALIDADES:
 * - Solicitar Wake Lock al cargar la app.
 * - Liberar automáticamente al cambiar de pestaña/minimizar.
 * - Reactivar automáticamente al volver a la app.
 * - Manejo silencioso de errores (navegadores no soportados).
 * 
 * COMPATIBILIDAD:
 * - Chrome 84+
 * - Edge 84+
 * - Safari 16.4+
 * - Firefox 126+
 * - Opera 70+
 */

// ==========================================================================
// VARIABLES GLOBALES
// ==========================================================================

let wakeLockInstance = null;
let wakeLockSupported = false;
let wakeLockActive = false;
let wakeLockRequesInProgress = false;

// ==========================================================================
// FUNCIÓN PRINCIPAL: SOLICITAR WAKE LOCK
// ==========================================================================

async function requestWakeLock() {
    // Evitar solicitudes simultáneas
    if (wakeLockRequesInProgress) {
        console.log('[wake-lock] Solicitud en progreso, ignorando...');
        return;
    }

    // Si ya está activo, no hacer nada
    if (wakeLockActive) {
        console.log('[wake-lock] Wake Lock ya activo.');
        return;
    }

    // Verificar si el navegador soporta la API
    if (!('wakeLock' in navigator)) {
        console.warn('[wake-lock] Screen Wake Lock API no soportada en este navegador.');
        wakeLockSupported = false;
        return;
    }

    wakeLockSupported = true;
    wakeLockRequesInProgress = true;

    try {
        console.log('[wake-lock] Solicitando Wake Lock...');
        
        // Solicitar el Wake Lock
        wakeLockInstance = await navigator.wakeLock.request('screen');
        
        wakeLockActive = true;
        wakeLockRequesInProgress = false;
        
        console.log('[wake-lock] ✅ Wake Lock activado correctamente.');
        
        // Escuchar cuando se libere (por ejemplo, al cambiar de pestaña)
        wakeLockInstance.addEventListener('release', () => {
            console.log('[wake-lock] Wake Lock liberado (evento).');
            wakeLockActive = false;
            wakeLockInstance = null;
            
            // Intentar reactivar cuando la página vuelva a ser visible
            // (esto se maneja en handleVisibilityChange)
        });
        
        return true;
        
    } catch (error) {
        wakeLockRequesInProgress = false;
        
        // Manejar errores específicos
        if (error.name === 'NotAllowedError') {
            console.warn('[wake-lock] Permiso denegado para Wake Lock.');
        } else if (error.name === 'NotSupportedError') {
            console.warn('[wake-lock] Wake Lock no soportado en este contexto.');
        } else {
            console.error('[wake-lock] Error al solicitar Wake Lock:', error);
        }
        
        wakeLockActive = false;
        wakeLockInstance = null;
        return false;
    }
}

// ==========================================================================
// FUNCIÓN: LIBERAR WAKE LOCK MANUALMENTE
// ==========================================================================

function releaseWakeLock() {
    if (!wakeLockInstance) {
        console.log('[wake-lock] No hay Wake Lock activo para liberar.');
        return;
    }

    try {
        wakeLockInstance.release();
        console.log('[wake-lock] Wake Lock liberado manualmente.');
        wakeLockActive = false;
        wakeLockInstance = null;
    } catch (error) {
        console.error('[wake-lock] Error al liberar Wake Lock:', error);
    }
}

// ==========================================================================
// FUNCIÓN: MANEJAR CAMBIO DE VISIBILIDAD
// ==========================================================================

function handleVisibilityChange() {
    // Si la página está visible y el Wake Lock no está activo, reactivarlo
    if (document.visibilityState === 'visible') {
        console.log('[wake-lock] Página visible - verificando Wake Lock...');
        
        // Verificar si el Wake Lock sigue activo (puede haberse liberado automáticamente)
        if (!wakeLockActive && wakeLockSupported) {
            console.log('[wake-lock] Wake Lock inactivo al volver a la página. Reactivando...');
            
            // Pequeño delay para evitar conflictos
            setTimeout(() => {
                requestWakeLock();
            }, 300);
        } else if (wakeLockActive) {
            console.log('[wake-lock] Wake Lock ya activo al volver.');
        }
    } else {
        // La página ya no es visible, el Wake Lock se liberará automáticamente
        // pero marcamos como inactivo para evitar estados inconsistentes
        if (wakeLockActive) {
            console.log('[wake-lock] Página ya no visible. Wake Lock se liberará automáticamente.');
            // No liberamos manualmente porque la API lo hace sola,
            // pero marcamos como inactivo cuando se dispare el evento 'release'
        }
    }
}

// ==========================================================================
// FUNCIÓN: REACTIVAR WAKE LOCK (FORZADO)
// ==========================================================================

function reactivateWakeLock() {
    console.log('[wake-lock] Reactivación forzada...');
    
    if (!wakeLockSupported) {
        console.warn('[wake-lock] Wake Lock no soportado.');
        return false;
    }
    
    // Si ya está activo, no hacer nada
    if (wakeLockActive) {
        console.log('[wake-lock] Wake Lock ya activo.');
        return true;
    }
    
    // Solicitar de nuevo
    return requestWakeLock();
}

// ==========================================================================
// FUNCIÓN: INICIALIZAR WAKE LOCK
// ==========================================================================

function initWakeLock() {
    console.log('[wake-lock] Inicializando sistema de Wake Lock...');
    
    // Verificar soporte
    if (!('wakeLock' in navigator)) {
        console.warn('[wake-lock] Screen Wake Lock API no soportada en este navegador.');
        wakeLockSupported = false;
        return;
    }
    
    wakeLockSupported = true;
    
    // Solicitar Wake Lock al iniciar
    requestWakeLock();
    
    // Escuchar cambios de visibilidad (cambios de pestaña, minimizar, etc.)
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Escuchar cuando la página se recarga o se cierra
    window.addEventListener('beforeunload', () => {
        if (wakeLockInstance) {
            console.log('[wake-lock] Liberando Wake Lock al cerrar la página...');
            try {
                wakeLockInstance.release();
            } catch (e) {
                // Ignorar errores al cerrar
            }
        }
    });
    
    // Escuchar eventos de enfoque de la ventana
    window.addEventListener('focus', () => {
        console.log('[wake-lock] Ventana enfocada - verificando Wake Lock...');
        if (!wakeLockActive && wakeLockSupported) {
            setTimeout(() => {
                requestWakeLock();
            }, 300);
        }
    });
    
    console.log('[wake-lock] Sistema de Wake Lock inicializado correctamente.');
}

// ==========================================================================
// FUNCIÓN: OBTENER ESTADO DEL WAKE LOCK
// ==========================================================================

function getWakeLockStatus() {
    return {
        supported: wakeLockSupported,
        active: wakeLockActive,
        instance: wakeLockInstance !== null
    };
}

// ==========================================================================
// INICIALIZACIÓN AUTOMÁTICA
// ==========================================================================

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWakeLock);
} else {
    // Si el DOM ya está cargado, inicializar inmediatamente
    setTimeout(initWakeLock, 100);
}

// También inicializar cuando la página esté completamente cargada
// (por si el DOMContentLoaded se ejecutó antes de que este script se cargara)
if (document.readyState === 'complete') {
    setTimeout(initWakeLock, 200);
}

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.requestWakeLock = requestWakeLock;
window.releaseWakeLock = releaseWakeLock;
window.reactivateWakeLock = reactivateWakeLock;
window.initWakeLock = initWakeLock;
window.getWakeLockStatus = getWakeLockStatus;

console.log('[wake-lock] Módulo cargado correctamente.');