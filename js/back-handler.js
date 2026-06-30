/**
 * MÓDULO: back-handler.js
 * Control universal de retroceso usando la técnica de "Hash Trap".
 * 
 * Esta versión está optimizada para navegadores móviles, especialmente
 * Samsung Internet, donde los métodos tradicionales con pushState fallan.
 * 
 * Técnica: Se usa el hash (#app) como punto de anclaje. Cuando el usuario
 * intenta volver atrás (popstate), se restaura el hash inmediatamente
 * antes de mostrar el modal de confirmación.
 */

// ==========================================================================
// VARIABLES GLOBALES
// ==========================================================================

let backHandlerInitialized = false;
let isConfirmingExit = false;

// ==========================================================================
// FUNCIÓN PRINCIPAL: INICIALIZAR EL CONTROL DE RETROCESO
// ==========================================================================

function initBackHandler() {
    if (backHandlerInitialized) return;

    // REGLA CLAVE: No configuramos la trampa hasta que el usuario haya
    // interactuado con la página. Esto evita que los filtros anti-hijacking
    // de Samsung Internet anulen nuestro control.
    const setupTrapOnInteraction = () => {
        setupHashTrap();
        document.removeEventListener('touchstart', setupTrapOnInteraction);
        document.removeEventListener('click', setupTrapOnInteraction);
    };

    // Escuchamos el primer toque o clic (pasivo, una sola vez)
    document.addEventListener('touchstart', setupTrapOnInteraction, { passive: true, once: true });
    document.addEventListener('click', setupTrapOnInteraction, { passive: true, once: true });

    // Prevenir el comportamiento de "estirar" la pantalla en bordes (overscroll)
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';

    backHandlerInitialized = true;
    console.log('[back-handler] Esperando interacción para activar la trampa...');
}

// ==========================================================================
// CONFIGURAR LA TRAMPA DEL HASH
// ==========================================================================

function setupHashTrap() {
    // Si ya estamos en la trampa, no hacemos nada
    if (location.hash === '#app') return;

    // Empujamos el hash a la URL. Esto crea una entrada sólida en el historial.
    history.pushState(null, null, '#app');

    // Escuchamos los cambios en el historial (popstate o hashchange)
    window.addEventListener('popstate', handleBackEvent);
    console.log('[back-handler] Trampa de historial (#app) configurada.');
}

// ==========================================================================
// MANEJADOR DEL EVENTO POPSTATE (INTENTO DE SALIR)
// ==========================================================================

function handleBackEvent(event) {
    // Si el usuario intentó volver atrás, el hash '#app' desaparecerá de la URL.
    if (location.hash !== '#app') {
        // Si ya hay un modal abierto, restauramos silenciosamente el hash
        if (isConfirmingExit) {
            history.pushState(null, null, '#app');
            return;
        }

        console.log('[back-handler] Intento de salida detectado.');
        isConfirmingExit = true;

        // 1. RESTAURACIÓN INMEDIATA:
        // No podemos cancelar el popstate, así que inmediatamente volvemos
        // a meter la trampa en el historial ANTES de mostrar el modal.
        history.pushState(null, null, '#app');

        // 2. MOSTRAR MODAL ASÍNCRONO
        window.showConfirm(
            '¿Estás seguro de que quieres salir de Gym Notes?',
            'Salir de la app'
        ).then((confirmado) => {
            isConfirmingExit = false;

            if (confirmado) {
                console.log('[back-handler] Usuario confirmó salir.');
                permitirSalida();
            } else {
                console.log('[back-handler] Usuario canceló. Se mantiene la trampa.');
                // No necesitamos hacer pushState aquí porque ya lo hicimos
                // en el paso 1 (Restauración inmediata).
            }
        });
    }
}

// ==========================================================================
// PERMITIR LA SALIDA (CUANDO EL USUARIO CONFIRMA)
// ==========================================================================

function permitirSalida() {
    // Limpiamos los eventos para que no vuelvan a atrapar la navegación
    window.removeEventListener('popstate', handleBackEvent);
    backHandlerInitialized = false;

    // Hacemos retroceder el historial dos veces.
    // Una para salir de nuestro '#app' actual, y otra para salir de la página base.
    // Usamos setTimeout para asegurar que el navegador procesa la remoción del listener.
    setTimeout(() => {
        window.history.go(-2);
    }, 50);
}

// ==========================================================================
// FUNCIONES AUXILIARES (REINICIO, ESTADO, ETC.)
// ==========================================================================

function resetBackHandler() {
    console.log('[back-handler] Reiniciando control de retroceso...');
    window.removeEventListener('popstate', handleBackEvent);
    backHandlerInitialized = false;
    isConfirmingExit = false;
    // Si el hash está presente, lo eliminamos para empezar de nuevo
    if (location.hash === '#app') {
        history.replaceState(null, null, location.pathname + location.search);
    }
    setTimeout(initBackHandler, 100);
}

function getBackHandlerStatus() {
    return {
        initialized: backHandlerInitialized,
        isConfirming: isConfirmingExit,
        hasHash: location.hash === '#app'
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

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(initBackHandler, 100);
    });
} else {
    setTimeout(initBackHandler, 100);
}

console.log('[back-handler] Módulo cargado correctamente (Hash Trap)');