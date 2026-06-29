/**
 * MÓDULO: back-handler.js
 * Controla el comportamiento del botón de retroceso físico/gestual en teléfonos
 * 
 * Esta funcionalidad previene que el usuario salga accidentalmente de la aplicación
 * al presionar el botón de retroceso en dispositivos móviles.
 * 
 * VERSIÓN MEJORADA: Anulación completa del retroceso, incluso en iOS (gestos de deslizamiento)
 * y en Android (botón físico). Mantiene al usuario siempre dentro de la aplicación.
 * 
 * TÉCNICA: "History Trap" - Mantiene siempre un estado en el historial para que
 * el retroceso no tenga efecto.
 */

// ==========================================================================
// VARIABLES GLOBALES
// ==========================================================================

let backHandlerInitialized = false;
let backHandlerActive = true;
let backHandlerLastState = null;

// ==========================================================================
// FUNCIÓN PRINCIPAL: INICIALIZAR EL CONTROL DE RETROCESO
// ==========================================================================

function initBackHandler() {
    console.log('[back-handler] Inicializando control de retroceso (versión mejorada)...');
    
    // Evitar inicializar múltiples veces
    if (backHandlerInitialized) {
        console.log('[back-handler] Ya estaba inicializado.');
        return;
    }
    
    // Verificar soporte de la API History
    if (!window.history || !window.history.pushState) {
        console.warn('[back-handler] API History no soportada en este navegador');
        return;
    }
    
    // ============================================================
    // 1. Crear un estado base en el historial
    // ============================================================
    const baseState = {
        app: 'gym-notes',
        timestamp: Date.now(),
        preventBack: true,
        isBaseState: true
    };
    
    // Reemplazar el estado actual con nuestro estado base
    history.replaceState(baseState, '', location.href);
    
    // ============================================================
    // 2. Añadir un estado "trampa" extra para que siempre haya
    //    al menos un estado previo al actual
    // ============================================================
    const trapState = {
        app: 'gym-notes',
        timestamp: Date.now(),
        preventBack: true,
        isTrapState: true
    };
    
    // Pushear el estado trampa (esto crea una entrada en el historial)
    history.pushState(trapState, '', location.href);
    
    // Guardar referencia al último estado
    backHandlerLastState = trapState;
    
    // ============================================================
    // 3. Configurar el listener de popstate
    // ============================================================
    window.addEventListener('popstate', handleBackEvent);
    
    // ============================================================
    // 4. Configurar un listener para evitar el gesto de retroceso
    //    en iOS (swipe from left edge)
    // ============================================================
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    
    // ============================================================
    // 5. Prevenir el comportamiento de "pull to refresh" y gestos
    //    que puedan causar navegación
    // ============================================================
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';
    
    backHandlerInitialized = true;
    console.log('[back-handler] Control de retroceso configurado correctamente');
}

// ==========================================================================
// MANEJADOR DEL EVENTO DE RETROCESO (popstate)
// ==========================================================================

function handleBackEvent(event) {
    console.log('[back-handler] Evento popstate detectado (botón de retroceso o gesto)');
    
    // Prevenir el comportamiento por defecto
    event.preventDefault();
    event.stopPropagation();
    
    // Obtener el estado actual
    const state = event.state;
    
    // Si el estado no es nuestro o no tiene la marca preventBack,
    // lo reemplazamos con nuestro estado para mantener el control
    if (!state || state.app !== 'gym-notes' || !state.preventBack) {
        console.log('[back-handler] Estado no controlado, restaurando control...');
        const newState = {
            app: 'gym-notes',
            timestamp: Date.now(),
            preventBack: true,
            isRestoredState: true
        };
        history.replaceState(newState, '', location.href);
        // Pushear otro estado para mantener la trampa
        const trapState = {
            app: 'gym-notes',
            timestamp: Date.now(),
            preventBack: true,
            isTrapState: true
        };
        history.pushState(trapState, '', location.href);
        backHandlerLastState = trapState;
        return;
    }
    
    // Si estamos en un estado controlado, simplemente lo reemplazamos
    // por un nuevo estado para que el retroceso no tenga efecto
    console.log('[back-handler] Retroceso desactivado - permaneciendo en la app');
    
    // Crear un nuevo estado para reemplazar el actual
    const newState = {
        app: 'gym-notes',
        timestamp: Date.now(),
        preventBack: true,
        isReplacementState: true
    };
    
    // IMPORTANTE: Primero reemplazamos el estado actual con uno nuevo
    // y luego pusheamos otro estado para mantener la trampa
    history.replaceState(newState, '', location.href);
    
    // Añadir un estado extra para que siempre haya un estado previo
    const extraState = {
        app: 'gym-notes',
        timestamp: Date.now(),
        preventBack: true,
        isExtraState: true
    };
    history.pushState(extraState, '', location.href);
    backHandlerLastState = extraState;
}

// ==========================================================================
// MANEJADOR DE TOUCH PARA EVITAR GESTOS DE RETROCESO EN iOS
// ==========================================================================

let touchStartX = 0;
let touchStartY = 0;
let isSwipingBack = false;

function handleTouchStart(event) {
    const touch = event.touches[0];
    if (!touch) return;
    
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isSwipingBack = false;
}

function handleTouchMove(event) {
    // Solo prevenir si el gesto es de izquierda a derecha (retroceso)
    // y está cerca del borde izquierdo (menos de 50px)
    const touch = event.touches[0];
    if (!touch || touchStartX === undefined) return;
    
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    
    // Detectar swipe de izquierda a derecha cerca del borde izquierdo
    if (touchStartX < 50 && deltaX > 30 && Math.abs(deltaY) < 100) {
        // Esto es un gesto de retroceso en iOS
        isSwipingBack = true;
        event.preventDefault();
        console.log('[back-handler] Gesto de retroceso en iOS detectado y bloqueado');
        
        // Forzar un popstate para mantener el control
        if (window.history && window.history.state) {
            const state = history.state;
            if (state && state.app === 'gym-notes') {
                // Ya estamos en un estado controlado, no hacer nada
            } else {
                // Restaurar el control
                const newState = {
                    app: 'gym-notes',
                    timestamp: Date.now(),
                    preventBack: true,
                    isRestoredState: true
                };
                history.replaceState(newState, '', location.href);
                const trapState = {
                    app: 'gym-notes',
                    timestamp: Date.now(),
                    preventBack: true,
                    isTrapState: true
                };
                history.pushState(trapState, '', location.href);
            }
        }
    }
}

// ==========================================================================
// FUNCIÓN PARA REINICIAR EL CONTROL (SI ES NECESARIO)
// ==========================================================================

function resetBackHandler() {
    console.log('[back-handler] Reiniciando control de retroceso...');
    
    // Limpiar el listener existente
    window.removeEventListener('popstate', handleBackEvent);
    document.removeEventListener('touchstart', handleTouchStart);
    document.removeEventListener('touchmove', handleTouchMove);
    
    backHandlerInitialized = false;
    
    // Reconfigurar el control
    setTimeout(() => {
        initBackHandler();
    }, 100);
}

// ==========================================================================
// FUNCIÓN PARA PERMITIR SALIR DE LA APP (SOLO EN CASOS EXTREMOS)
// ==========================================================================

function allowBackNavigation() {
    console.log('[back-handler] ⚠️ Permitir navegación hacia atrás (salir de la app)');
    
    // Remover el listener de popstate
    window.removeEventListener('popstate', handleBackEvent);
    document.removeEventListener('touchstart', handleTouchStart);
    document.removeEventListener('touchmove', handleTouchMove);
    
    backHandlerInitialized = false;
    
    // Restaurar el comportamiento nativo del historial
    // Esto permitirá que el usuario salga de la app si presiona retroceso
    // después de que se haya removido la trampa
    
    // Limpiar el historial de estados de la app
    try {
        // Ir al estado anterior real (si existe)
        if (window.history.length > 1) {
            window.history.go(-1);
        } else {
            // Si no hay historial, simplemente recargar
            window.location.reload();
        }
    } catch (e) {
        console.warn('[back-handler] Error al intentar salir:', e);
        window.location.href = 'about:blank';
    }
}

// ==========================================================================
// FUNCIÓN PARA OBTENER EL ESTADO ACTUAL DEL CONTROL
// ==========================================================================

function getBackHandlerStatus() {
    return {
        initialized: backHandlerInitialized,
        active: backHandlerActive,
        hasHistory: window.history && window.history.length > 0,
        currentState: window.history ? window.history.state : null
    };
}

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.initBackHandler = initBackHandler;
window.resetBackHandler = resetBackHandler;
window.allowBackNavigation = allowBackNavigation;
window.getBackHandlerStatus = getBackHandlerStatus;

// ==========================================================================
// INICIALIZACIÓN AUTOMÁTICA
// ==========================================================================

// Inicializar el control de retroceso cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        // Pequeño retraso para asegurar que todo esté listo
        setTimeout(initBackHandler, 100);
    });
} else {
    setTimeout(initBackHandler, 100);
}

// También inicializar cuando la página esté completamente cargada
if (document.readyState === 'complete') {
    setTimeout(initBackHandler, 200);
}

console.log('[back-handler] Módulo cargado correctamente');

// ==========================================================================
// SOLUCIÓN ADICIONAL: Prevenir el retroceso en Android WebView
// ==========================================================================

// Para Android WebView, también podemos interceptar el evento 'beforeunload'
// aunque no es tan efectivo como el popstate, pero ayuda en algunos casos.
window.addEventListener('beforeunload', function(event) {
    // Si la app está activa y el usuario intenta salir, mostrar un mensaje
    // (opcional, puede resultar molesto)
    // event.preventDefault();
    // event.returnValue = '';
});

console.log('[back-handler] Módulo cargado correctamente');