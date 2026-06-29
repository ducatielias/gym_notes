/**
 * MÓDULO: back-handler.js
 * Controla el comportamiento del botón de retroceso físico/gestual en teléfonos
 * 
 * VERSIÓN MEJORADA PARA SAMSUNG INTERNET:
 * - Hash Routing para navegación interna
 * - Double-State Trap para mantener el historial activo
 * - Reactivación por interacciones del usuario (clics)
 * - Prevención de cierre en PWA standalone
 */

// ==========================================================================
// VARIABLES GLOBALES
// ==========================================================================

let backHandlerInitialized = false;
let backHandlerActive = true;
let onViewChangeCallback = null;
let isProcessingHashChange = false;

// ==========================================================================
// FUNCIÓN PRINCIPAL: INICIALIZAR CONTROL DE RETROCESO PARA SAMSUNG
// ==========================================================================

function initBackHandlerSamsung(onViewChange) {
    console.log('[back-handler] Inicializando control de retroceso para Samsung...');
    
    // Evitar inicializar múltiples veces
    if (backHandlerInitialized) {
        console.log('[back-handler] Ya estaba inicializado.');
        return;
    }
    
    // Guardar el callback para cambios de vista
    onViewChangeCallback = onViewChange || null;
    
    // ============================================================
    // 1. Asegurar un Hash base inicial
    // ============================================================
    if (!window.location.hash || window.location.hash === '#/' || window.location.hash === '#') {
        console.log('[back-handler] Estableciendo hash base: #/home');
        window.location.hash = '#/home';
    }
    
    // ============================================================
    // 2. Double-State Trap - Mantiene el historial "lleno" para Samsung
    // ============================================================
    function refreshHistoryTrap() {
        try {
            // Verificar si el estado actual ya es nuestro estado trampa
            if (window.history.state && window.history.state.trap === 'active') {
                return;
            }
            
            console.log('[back-handler] Refrescando trampa de historial...');
            
            // Reemplazar el estado actual con un estado base
            window.history.replaceState({ trap: 'base' }, '', window.location.href);
            
            // Pushear un estado activo (esto crea una entrada en el historial)
            window.history.pushState({ trap: 'active' }, '', window.location.href);
            
            console.log('[back-handler] Trampa de historial activada.');
        } catch (error) {
            console.warn('[back-handler] Error al refrescar trampa:', error);
        }
    }
    
    // Inicializar la trampa inmediatamente
    refreshHistoryTrap();
    
    // ============================================================
    // 3. CRITICAL SAMSUNG FIX: Reactivar la trampa con interacciones reales
    //    Samsung requiere interacciones del usuario para validar el stack de historial
    // ============================================================
    const interactionEvents = ['click', 'touchstart', 'touchend', 'keydown'];
    
    interactionEvents.forEach(eventType => {
        document.addEventListener(eventType, function() {
            // Solo reactivar si el historial no está en estado activo
            if (!window.history.state || window.history.state.trap !== 'active') {
                refreshHistoryTrap();
            }
        }, { passive: true });
    });
    
    // También reactivar al hacer scroll (menos importante pero ayuda)
    let scrollTimeout = null;
    window.addEventListener('scroll', function() {
        if (scrollTimeout) return;
        scrollTimeout = setTimeout(function() {
            if (!window.history.state || window.history.state.trap !== 'active') {
                refreshHistoryTrap();
            }
            scrollTimeout = null;
        }, 500);
    }, { passive: true });
    
    // ============================================================
    // 4. Listener del cambio de Hash (Navegación interna de la SPA)
    // ============================================================
    window.addEventListener('hashchange', function(event) {
        if (isProcessingHashChange) return;
        isProcessingHashChange = true;
        
        try {
            const currentHash = window.location.hash || '#/';
            console.log('[back-handler] Hashchange detectado:', currentHash);
            
            // Si el usuario intenta limpiar el hash (retroceder al origen absoluto)
            if (!currentHash || currentHash === '#/' || currentHash === '#') {
                console.log('[back-handler] Hash vacío detectado, redirigiendo a #/home');
                window.location.hash = '#/home';
                refreshHistoryTrap();
                isProcessingHashChange = false;
                return;
            }
            
            // Extraer el nombre de la vista (ej: '#/routines' -> 'routines')
            const route = currentHash.replace('#/', '').split('?')[0];
            
            // Si hay un callback para cambios de vista, ejecutarlo
            if (typeof onViewChangeCallback === 'function') {
                onViewChangeCallback(route || 'home');
            }
            
            // Refrescar la trampa después de cada cambio de hash
            refreshHistoryTrap();
            
        } catch (error) {
            console.warn('[back-handler] Error en hashchange:', error);
        }
        
        isProcessingHashChange = false;
    });
    
    // ============================================================
    // 5. Intercepción de Popstate como salvaguarda extrema
    // ============================================================
    window.addEventListener('popstate', function(event) {
        console.log('[back-handler] Popstate detectado:', event.state);
        
        // Verificar si el estado es nuestra trampa activa
        if (!event.state || event.state.trap !== 'active') {
            console.log('[back-handler] Estado no válido, restaurando trampa...');
            refreshHistoryTrap();
            
            // Asegurar que el hash no esté vacío
            if (!window.location.hash || window.location.hash === '#/' || window.location.hash === '#') {
                window.location.hash = '#/home';
            }
        }
    });
    
    // ============================================================
    // 6. Prevenir el gesto de retroceso en iOS (swipe from left edge)
    // ============================================================
    let touchStartX = 0;
    let touchStartY = 0;
    
    document.addEventListener('touchstart', function(event) {
        const touch = event.touches[0];
        if (touch) {
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
        }
    }, { passive: true });
    
    document.addEventListener('touchmove', function(event) {
        const touch = event.touches[0];
        if (!touch || touchStartX === undefined) return;
        
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        
        // Detectar swipe de izquierda a derecha cerca del borde izquierdo
        if (touchStartX < 50 && deltaX > 30 && Math.abs(deltaY) < 100) {
            console.log('[back-handler] Gesto de retroceso en iOS detectado y bloqueado');
            event.preventDefault();
            
            // Refrescar trampa para asegurar que el historial esté activo
            refreshHistoryTrap();
            
            // Forzar el hash si está vacío
            if (!window.location.hash || window.location.hash === '#/' || window.location.hash === '#') {
                window.location.hash = '#/home';
            }
        }
    }, { passive: false });
    
    // ============================================================
    // 7. Prevenir "pull to refresh" y gestos que causen navegación
    // ============================================================
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';
    
    // ============================================================
    // 8. Manejo de la visibilidad de la página (reactivar al volver)
    // ============================================================
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            console.log('[back-handler] Página visible, verificando trampa...');
            if (!window.history.state || window.history.state.trap !== 'active') {
                refreshHistoryTrap();
            }
            if (!window.location.hash || window.location.hash === '#/' || window.location.hash === '#') {
                window.location.hash = '#/home';
            }
        }
    });
    
    backHandlerInitialized = true;
    console.log('[back-handler] Control de retroceso Samsung configurado correctamente');
}

// ==========================================================================
// FUNCIÓN DE COMPATIBILIDAD (para usar el mismo nombre que antes)
// ==========================================================================

function initBackHandler(onViewChange) {
    initBackHandlerSamsung(onViewChange);
}

// ==========================================================================
// FUNCIÓN PARA REINICIAR EL CONTROL
// ==========================================================================

function resetBackHandler() {
    console.log('[back-handler] Reiniciando control de retroceso...');
    backHandlerInitialized = false;
    onViewChangeCallback = null;
    
    // Eliminar listeners (no podemos eliminarlos fácilmente, pero reiniciamos el estado)
    setTimeout(function() {
        initBackHandler(onViewChangeCallback);
    }, 100);
}

// ==========================================================================
// FUNCIÓN PARA PERMITIR SALIR DE LA APP (SOLO EN CASOS EXTREMOS)
// ==========================================================================

function allowBackNavigation() {
    console.log('[back-handler] ⚠️ Permitir navegación hacia atrás (salir de la app)');
    
    backHandlerInitialized = false;
    
    // Intentar ir al estado anterior real
    try {
        if (window.history.length > 1) {
            window.history.go(-1);
        } else {
            window.location.href = 'about:blank';
        }
    } catch (e) {
        console.warn('[back-handler] Error al intentar salir:', e);
        window.location.href = 'about:blank';
    }
}

// ==========================================================================
// FUNCIÓN PARA NAVEGAR A UNA VISTA (DESDE LA APP)
// ==========================================================================

function navigateToView(viewName) {
    if (!viewName || viewName === '') {
        viewName = 'home';
    }
    window.location.hash = '#/' + viewName;
}

// ==========================================================================
// FUNCIÓN PARA OBTENER LA VISTA ACTUAL
// ==========================================================================

function getCurrentView() {
    const hash = window.location.hash || '#/';
    return hash.replace('#/', '').split('?')[0] || 'home';
}

// ==========================================================================
// FUNCIÓN PARA OBTENER EL ESTADO DEL CONTROL
// ==========================================================================

function getBackHandlerStatus() {
    return {
        initialized: backHandlerInitialized,
        active: backHandlerActive,
        currentHash: window.location.hash || '#/',
        currentView: getCurrentView(),
        hasHistory: window.history && window.history.length > 0,
        currentState: window.history ? window.history.state : null
    };
}

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.initBackHandler = initBackHandler;
window.initBackHandlerSamsung = initBackHandlerSamsung;
window.resetBackHandler = resetBackHandler;
window.allowBackNavigation = allowBackNavigation;
window.navigateToView = navigateToView;
window.getCurrentView = getCurrentView;
window.getBackHandlerStatus = getBackHandlerStatus;

// ==========================================================================
// INICIALIZACIÓN AUTOMÁTICA (si no se llama desde fuera)
// ==========================================================================

// No inicializar automáticamente para permitir que el index.js pase el callback
console.log('[back-handler] Módulo cargado correctamente. Inicializar con initBackHandler(callback)');