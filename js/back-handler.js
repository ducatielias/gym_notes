/**
 * MÓDULO: back-handler.js
 * Controla el comportamiento del botón de retroceso físico/gestual en teléfonos
 * 
 * MODIFICADO: Ahora muestra un modal de confirmación antes de permitir salir de la app.
 * Si el usuario confirma, se permite la navegación hacia atrás; si cancela, se queda.
 * 
 * TÉCNICA: "History Trap" + confirmación antes de salir.
 */

// ==========================================================================
// VARIABLES GLOBALES
// ==========================================================================

let backHandlerInitialized = false;
let backHandlerActive = true;
let backHandlerLastState = null;
let backHandlerConfirming = false; // Evita múltiples modales simultáneos

// ==========================================================================
// FUNCIÓN PRINCIPAL: INICIALIZAR EL CONTROL DE RETROCESO
// ==========================================================================

function initBackHandler() {
    console.log('[back-handler] Inicializando control de retroceso con confirmación...');
    
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
    
    // Si ya estamos mostrando un modal, no hacer nada
    if (backHandlerConfirming) {
        console.log('[back-handler] Ya hay un modal de confirmación activo.');
        return;
    }
    
    // Obtener el estado actual
    const state = event.state;
    
    // Si el estado no es nuestro o no tiene la marca preventBack,
    // lo reemplazamos con nuestro estado para mantener el control
    if (!state || state.app !== 'gym-notes' || !state.preventBack) {
        console.log('[back-handler] Estado no controlado, restaurando control...');
        restaurarControl();
        return;
    }
    
    // Mostrar modal de confirmación para salir de la app
    backHandlerConfirming = true;
    window.showConfirm(
        '¿Estás seguro de que quieres salir de Gym Notes?',
        'Salir de la app'
    ).then((confirmado) => {
        backHandlerConfirming = false;
        if (confirmado) {
            // El usuario quiere salir: permitir la navegación hacia atrás
            console.log('[back-handler] Usuario confirmó salir. Permitiendo navegación.');
            permitirSalida();
        } else {
            // El usuario cancela: restaurar el control
            console.log('[back-handler] Usuario canceló. Restaurando control.');
            restaurarControl();
        }
    });
}

// ==========================================================================
// FUNCIÓN PARA RESTAURAR EL CONTROL (después de cancelar)
// ==========================================================================

function restaurarControl() {
    // Reemplazar el estado actual con uno controlado
    const newState = {
        app: 'gym-notes',
        timestamp: Date.now(),
        preventBack: true,
        isRestoredState: true
    };
    history.replaceState(newState, '', location.href);
    
    // Pushear otro estado trampa para mantener el control
    const trapState = {
        app: 'gym-notes',
        timestamp: Date.now(),
        preventBack: true,
        isTrapState: true
    };
    history.pushState(trapState, '', location.href);
    backHandlerLastState = trapState;
    console.log('[back-handler] Control restaurado.');
}

// ==========================================================================
// FUNCIÓN PARA PERMITIR LA SALIDA (confirmado por el usuario)
// ==========================================================================

function permitirSalida() {
    console.log('[back-handler] Permitiendo salida de la app...');
    
    // Remover los listeners para que no interfieran
    window.removeEventListener('popstate', handleBackEvent);
    document.removeEventListener('touchstart', handleTouchStart);
    document.removeEventListener('touchmove', handleTouchMove);
    
    backHandlerInitialized = false;
    
    // Intentar ir hacia atrás en el historial
    // Si hay historial previo, irá a la página anterior
    // Si no, no hará nada (la app se quedará)
    try {
        if (window.history.length > 1) {
            // Ir atrás una página
            window.history.back();
        } else {
            // No hay historial previo, mostrar un mensaje o simplemente no hacer nada
            console.log('[back-handler] No hay historial previo. No se puede salir.');
            // Podríamos mostrar un mensaje, pero mejor no molestar.
            // En PWA, el retroceso cerraría la app, pero no podemos controlarlo.
            // Dejamos que el navegador maneje la situación.
            // Re-inicializamos el control por si el usuario quiere quedarse.
            setTimeout(() => {
                if (!backHandlerInitialized) {
                    initBackHandler();
                }
            }, 100);
        }
    } catch (e) {
        console.warn('[back-handler] Error al intentar salir:', e);
        // Re-inicializar el control
        setTimeout(() => {
            if (!backHandlerInitialized) {
                initBackHandler();
            }
        }, 100);
    }
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
        console.log('[back-handler] Gesto de retroceso en iOS detectado.');
        
        // Si ya estamos mostrando un modal, no hacer nada
        if (backHandlerConfirming) return;
        
        // Mostrar el mismo modal de confirmación
        backHandlerConfirming = true;
        window.showConfirm(
            '¿Estás seguro de que quieres salir de Gym Notes?',
            'Salir de la app'
        ).then((confirmado) => {
            backHandlerConfirming = false;
            if (confirmado) {
                console.log('[back-handler] Usuario confirmó salir (iOS swipe).');
                permitirSalida();
            } else {
                console.log('[back-handler] Usuario canceló (iOS swipe).');
                restaurarControl();
            }
        });
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
window.getBackHandlerStatus = getBackHandlerStatus;

// ==========================================================================
// INICIALIZACIÓN AUTOMÁTICA
// ==========================================================================

// Inicializar el control de retroceso cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
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