/**
 * MÓDULO: back-handler.js
 * Control de navegación con historial y manejo del botón de retroceso.
 * 
 * Técnica: el entrenamiento tiene su propio estado en el historial (pushState).
 * Al cancelar la salida, se reconstruye la trampa con otro pushState.
 * 
 * Compatible con Samsung Internet y Chrome Android.
 * 
 * Inspirado en las soluciones de Gemini y Copilot.
 */

// ==========================================================================
// VARIABLES GLOBALES
// ==========================================================================

let backHandlerInitialized = false;
let esBloqueoActivo = false; // true mientras el entrenamiento esté activo

// ==========================================================================
// INICIALIZACIÓN
// ==========================================================================

function initBackHandler() {
    if (backHandlerInitialized) return;
    window.addEventListener('popstate', handlePopState);
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';
    backHandlerInitialized = true;
    console.log('[back-handler] Inicializado.');
}

// ==========================================================================
// FUNCIONES PARA EL ENTRENAMIENTO (LLAMAR DESDE workout.js)
// ==========================================================================

/**
 * Se debe llamar justo cuando se abre el modal de entrenamiento (display: flex)
 */
function alAbrirEntrenamiento() {
    esBloqueoActivo = true;
    // Empujamos el estado del entrenamiento al historial.
    // Esto crea el "freno de mano" en la pila.
    history.pushState({ tab: 'workout' }, '', '#workout');
    console.log('[back-handler] Entrenamiento abierto, estado pushState.');
}

/**
 * Se debe llamar cuando el entrenamiento se cierra definitivamente (confirmado)
 */
function cerrarEntrenamiento() {
    const workoutModal = document.getElementById('active-workout');
    if (workoutModal) workoutModal.style.display = 'none';
    esBloqueoActivo = false;
    console.log('[back-handler] Entrenamiento cerrado.');
}

// ==========================================================================
// MANEJADOR DE POPSTATE (BOTÓN DE RETROCESO)
// ==========================================================================

function handlePopState(event) {
    const state = event.state;
    const workoutModal = document.getElementById('active-workout');
    const isWorkoutVisible = workoutModal && workoutModal.style.display === 'flex';

    console.log('[back-handler] popstate:', state, 'visible:', isWorkoutVisible, 'bloqueo:', esBloqueoActivo);

    // CASO 1: El entrenamiento está visible y el bloqueo está activo
    if (isWorkoutVisible && esBloqueoActivo) {
        // El navegador ya ha retrocedido un paso (salió del estado #workout).
        // Mostramos la confirmación.
        window.showConfirm(
            '¿Salir del entrenamiento? Se perderán las notas no guardadas.',
            'Cancelar entrenamiento'
        ).then((confirmado) => {
            if (confirmado) {
                // Usuario confirma: cerrar entrenamiento y liberar bloqueo.
                // El navegador ya está en la pestaña anterior, no hacemos push.
                console.log('[back-handler] Usuario confirmó salida.');
                esBloqueoActivo = false;
                cerrarEntrenamiento();
            } else {
                // Usuario cancela: reconstruir la trampa del historial.
                // Pequeño delay para evitar race conditions en Samsung/Chrome.
                console.log('[back-handler] Usuario canceló. Reconstruyendo trampa...');
                setTimeout(() => {
                    if (esBloqueoActivo) {
                        history.pushState({ tab: 'workout' }, '', '#workout');
                        console.log('[back-handler] Trampa reconstruida (pushState).');
                    }
                }, 50);
            }
        });
        return;
    }

    // CASO 2: Navegación normal entre pestañas (sin entrenamiento activo)
    if (state && state.tab && state.tab !== 'workout') {
        console.log('[back-handler] Navegando a pestaña:', state.tab);
        window.switchTab(state.tab, { noPushState: true });
        return;
    }

    // CASO 3: Sin estado (raíz) o estado no reconocido: permitir salida nativa
    console.log('[back-handler] Estado raíz o no reconocido. Permitiendo salida nativa.');
    // No hacemos nada, el navegador cerrará la PWA.
}

// ==========================================================================
// FUNCIÓN PARA NAVEGAR ENTRE PESTAÑAS (DESDE LA UI)
// ==========================================================================

function navigateToTab(tabName) {
    // Si el entrenamiento está activo, no permitimos cambiar de pestaña
    // (el usuario debe salir del entrenamiento primero).
    if (esBloqueoActivo) {
        console.warn('[back-handler] No se puede cambiar de pestaña durante el entrenamiento.');
        return;
    }

    const mainTabs = ['today', 'plan', 'history', 'exercises'];
    if (mainTabs.includes(tabName)) {
        const state = { tab: tabName };
        history.pushState(state, '', '#' + tabName);
        window.switchTab(tabName, { noPushState: true });
    } else {
        window.switchTab(tabName, { noPushState: true });
    }
}

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.initBackHandler = initBackHandler;
window.alAbrirEntrenamiento = alAbrirEntrenamiento;
window.cerrarEntrenamiento = cerrarEntrenamiento;
window.navigateToTab = navigateToTab;

// ==========================================================================
// INICIALIZACIÓN AUTOMÁTICA
// ==========================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBackHandler);
} else {
    initBackHandler();
}

console.log('[back-handler] Módulo cargado correctamente.');