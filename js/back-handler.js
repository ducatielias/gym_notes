/**
 * MÓDULO: back-handler.js
 * Control de navegación con historial y manejo del botón de retroceso.
 * 
 * Técnica: el entrenamiento tiene su propio estado en el historial (pushState).
 * Al cancelar la salida, se reconstruye la trampa con otro pushState.
 * 
 * Compatible con Samsung Internet y Chrome Android.
 */

// ==========================================================================
// VARIABLES GLOBALES
// ==========================================================================

let backHandlerInitialized = false;
let esBloqueoActivo = false; // true mientras el entrenamiento esté activo
let currentTab = 'today';

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
// FUNCIONES PARA EL ENTRENAMIENTO
// ==========================================================================

function alAbrirEntrenamiento() {
    esBloqueoActivo = true;
    history.pushState({ tab: 'workout' }, '', '#workout');
    console.log('[back-handler] Entrenamiento abierto, estado pushState.');
}

function liberarBloqueoEntrenamiento() {
    esBloqueoActivo = false;
    console.log('[back-handler] Bloqueo de entrenamiento liberado.');
}

// ==========================================================================
// DETECTAR PANTALLAS INTERNAS
// ==========================================================================

function hayPantallaInternaVisible() {
    const internals = ['editor', 'exercise-editor', 'history-detail', 'exercise-viewer'];
    for (const id of internals) {
        const el = document.getElementById(`screen-${id}`);
        if (el && !el.classList.contains('hidden')) {
            return true;
        }
    }
    return false;
}

// ==========================================================================
// MANEJADOR DE POPSTATE (BOTÓN DE RETROCESO)
// ==========================================================================

function handlePopState(event) {
    const state = event.state;
    const workoutModal = document.getElementById('active-workout');
    const isWorkoutVisible = workoutModal && workoutModal.style.display === 'flex';

    console.log('[back-handler] popstate:', state, 'visible:', isWorkoutVisible, 'bloqueo:', esBloqueoActivo);

    // CASO 1: Entrenamiento visible
    if (isWorkoutVisible && esBloqueoActivo) {
        window.showConfirm(
            '¿Salir del entrenamiento? Se perderán las notas no guardadas.',
            'Cancelar entrenamiento'
        ).then((confirmado) => {
            if (confirmado) {
                console.log('[back-handler] Usuario confirmó salida del entrenamiento.');
                // Llamar a la función de cierre del entrenamiento (definida en workout.js)
                if (typeof window.cerrarEntrenamiento === 'function') {
                    window.cerrarEntrenamiento();
                } else {
                    // Fallback: cerrar manualmente
                    if (workoutModal) workoutModal.style.display = 'none';
                    liberarBloqueoEntrenamiento();
                }
            } else {
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

    // CASO 2: Navegación entre pestañas (hay estado)
    if (state && state.tab && state.tab !== 'workout') {
        console.log('[back-handler] Navegando a pestaña:', state.tab);
        window.switchTab(state.tab, { noPushState: true });
        return;
    }

    // CASO 3: Sin estado (raíz)
    console.log('[back-handler] Estado raíz detectado.');

    if (hayPantallaInternaVisible()) {
        console.log('[back-handler] Pantalla interna visible. Cerrando...');
        window.switchTab(currentTab, { noPushState: true });
        history.pushState({ tab: currentTab }, '', '#' + currentTab);
        return;
    }

    console.log('[back-handler] Mostrando confirmación de salida de la app.');
    window.showConfirm(
        '¿Estás seguro de que quieres salir de Gym Notes?',
        'Salir de la app'
    ).then((confirmado) => {
        if (confirmado) {
            console.log('[back-handler] Usuario confirmó salir de la app.');
            window.removeEventListener('popstate', handlePopState);
            setTimeout(() => {
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    window.close();
                }
            }, 100);
        } else {
            console.log('[back-handler] Usuario canceló salida. Restaurando estado.');
            history.pushState({ tab: currentTab }, '', '#' + currentTab);
        }
    });
}

// ==========================================================================
// FUNCIÓN PARA NAVEGAR ENTRE PESTAÑAS
// ==========================================================================

function navigateToTab(tabName) {
    if (esBloqueoActivo) {
        console.warn('[back-handler] No se puede cambiar de pestaña durante el entrenamiento.');
        return;
    }

    const mainTabs = ['today', 'plan', 'history', 'exercises'];
    if (mainTabs.includes(tabName)) {
        const state = { tab: tabName };
        history.pushState(state, '', '#' + tabName);
        window.switchTab(tabName, { noPushState: true });
        currentTab = tabName;
    } else {
        window.switchTab(tabName, { noPushState: true });
    }
}

function setCurrentTab(tabName) {
    if (tabName) currentTab = tabName;
}

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.initBackHandler = initBackHandler;
window.alAbrirEntrenamiento = alAbrirEntrenamiento;
window.liberarBloqueoEntrenamiento = liberarBloqueoEntrenamiento;
window.navigateToTab = navigateToTab;
window.setCurrentTab = setCurrentTab;

// ==========================================================================
// INICIALIZACIÓN AUTOMÁTICA
// ==========================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBackHandler);
} else {
    initBackHandler();
}

console.log('[back-handler] Módulo cargado correctamente.');