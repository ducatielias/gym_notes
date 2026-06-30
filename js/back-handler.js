/**
 * MÓDULO: back-handler.js
 * Control de navegación con historial y manejo del botón de retroceso.
 * 
 * Inspirado en la técnica de "state stack" de GymTrack Pro.
 * Cuando el usuario está en el entrenamiento activo, al pulsar atrás
 * se muestra un modal de confirmación. Si cancela, se restaura el estado
 * del entrenamiento en el historial para que el siguiente atrás vuelva a
 * mostrar el modal.
 */

// ==========================================================================
// VARIABLES GLOBALES
// ==========================================================================

let backHandlerInitialized = false;

// ==========================================================================
// INICIALIZACIÓN
// ==========================================================================

function initBackHandler() {
    if (backHandlerInitialized) return;
    
    window.addEventListener('popstate', handlePopState);
    
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';
    
    backHandlerInitialized = true;
    console.log('[back-handler] Control de navegación inicializado.');
}

// ==========================================================================
// MANEJADOR DE POPSTATE (BOTÓN DE RETROCESO)
// ==========================================================================

function handlePopState(event) {
    const state = event.state;
    console.log('[back-handler] popstate detectado:', state);
    
    // Verificar si el entrenamiento activo está visible
    const workoutModal = document.getElementById('active-workout');
    const isWorkoutVisible = workoutModal && workoutModal.style.display === 'flex';
    
    if (isWorkoutVisible) {
        // Si el entrenamiento está visible, preguntar al usuario si desea salir
        console.log('[back-handler] Entrenamiento activo detectado. Mostrando confirmación.');
        
        // Prevenir el comportamiento por defecto (no dejar que el navegador cierre la app)
        event.preventDefault();
        event.stopPropagation();
        
        // Mostrar el modal de confirmación
        if (typeof window.showConfirm === 'function') {
            window.showConfirm(
                '¿Salir del entrenamiento? Se perderán las notas no guardadas.',
                'Cancelar entrenamiento'
            ).then((confirmado) => {
                if (confirmado) {
                    // El usuario confirma: salir del entrenamiento
                    console.log('[back-handler] Usuario confirmó salir del entrenamiento.');
                    if (typeof window.cerrarEntrenamiento === 'function') {
                        window.cerrarEntrenamiento();
                    } else {
                        // Fallback: cerrar manualmente
                        if (workoutModal) workoutModal.style.display = 'none';
                        if (typeof window.resetAllTimersAndState === 'function') {
                            window.resetAllTimersAndState();
                        }
                        window.aw_currentWorkout = null;
                        window.aw_quillInstance = null;
                        const bottomNav = document.querySelector('.bottom-nav');
                        if (bottomNav) bottomNav.classList.remove('hidden-nav');
                        window.switchTab('today', { noPushState: true });
                    }
                } else {
                    // El usuario cancela: restaurar el estado del entrenamiento en el historial
                    console.log('[back-handler] Usuario canceló. Restaurando estado del entrenamiento.');
                    // Reemplazar el estado actual del historial con el estado del entrenamiento
                    // para que la próxima vez que pulse atrás vuelva a mostrar el modal.
                    const workoutState = { tab: 'workout' };
                    history.replaceState(workoutState, '', location.href);
                    // No hacemos nada más, el entrenamiento sigue visible.
                }
            });
        } else {
            // Fallback: usar confirm nativo
            if (confirm('¿Salir del entrenamiento? Se perderán las notas no guardadas.')) {
                if (typeof window.cerrarEntrenamiento === 'function') {
                    window.cerrarEntrenamiento();
                } else {
                    if (workoutModal) workoutModal.style.display = 'none';
                    if (typeof window.resetAllTimersAndState === 'function') {
                        window.resetAllTimersAndState();
                    }
                    window.aw_currentWorkout = null;
                    window.aw_quillInstance = null;
                    const bottomNav = document.querySelector('.bottom-nav');
                    if (bottomNav) bottomNav.classList.remove('hidden-nav');
                    window.switchTab('today', { noPushState: true });
                }
            }
        }
        return;
    }
    
    // 2. Si no hay entrenamiento, manejar la navegación interna
    if (state && state.tab) {
        console.log('[back-handler] Navegando a pestaña:', state.tab);
        window.switchTab(state.tab, { noPushState: true });
    } else {
        console.log('[back-handler] Estado raíz, permitiendo salida nativa.');
        // No hacer nada, dejar que el navegador maneje la salida.
    }
}

// ==========================================================================
// FUNCIÓN PARA NAVEGAR A UNA PESTAÑA CON PUSHSTATE
// ==========================================================================

function navigateToTab(tabName) {
    const mainTabs = ['today', 'plan', 'history', 'exercises'];
    if (mainTabs.includes(tabName)) {
        const state = { tab: tabName };
        const url = new URL(window.location);
        url.hash = tabName;
        history.pushState(state, '', url.toString());
    }
    window.switchTab(tabName, { noPushState: true });
}

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.initBackHandler = initBackHandler;
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