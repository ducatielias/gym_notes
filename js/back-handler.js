/**
 * MÓDULO: back-handler.js
 * Control de navegación con historial y manejo del botón de retroceso.
 * 
 * Este módulo gestiona el evento popstate para:
 * - Navegar entre pestañas principales (Hoy, Plan, Historial, Ejercicios)
 * - Mostrar un modal de confirmación al salir del entrenamiento activo
 * - Permitir la salida nativa de la aplicación cuando no hay estado interno
 * 
 * Inspirado en la técnica de "state stack" de GymTrack Pro, pero adaptado
 * al sistema de modales personalizados de Gym Notes.
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
    
    // Escuchar el evento popstate para navegación interna
    window.addEventListener('popstate', handlePopState);
    
    // Prevenir el overscroll (efecto "estirar" en móviles)
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
    
    // 1. Verificar si el entrenamiento activo está visible
    const workoutModal = document.getElementById('active-workout');
    const isWorkoutVisible = workoutModal && workoutModal.style.display === 'flex';
    
    if (isWorkoutVisible) {
        // Si el entrenamiento está visible, preguntar al usuario si desea salir
        console.log('[back-handler] Entrenamiento activo detectado. Mostrando confirmación.');
        // Prevenir el comportamiento por defecto (no dejar que el navegador cierre la app)
        event.preventDefault();
        event.stopPropagation();
        
        // Llamar a la función cerrarEntrenamiento (ya implementada en workout.js)
        if (typeof window.cerrarEntrenamiento === 'function') {
            window.cerrarEntrenamiento();
        } else {
            console.warn('[back-handler] cerrarEntrenamiento no está disponible');
            // Fallback: mostrar un alert nativo
            if (confirm('¿Salir del entrenamiento? Se perderán las notas no guardadas.')) {
                // Cerrar el modal manualmente
                if (workoutModal) workoutModal.style.display = 'none';
                // Limpiar estado del entrenamiento
                if (typeof window.resetAllTimersAndState === 'function') {
                    window.resetAllTimersAndState();
                }
                window.aw_currentWorkout = null;
                window.aw_quillInstance = null;
                // Mostrar el menú inferior
                const bottomNav = document.querySelector('.bottom-nav');
                if (bottomNav) bottomNav.classList.remove('hidden-nav');
                // Navegar a la pantalla de hoy
                window.switchTab('today', { noPushState: true });
            }
        }
        return;
    }
    
    // 2. Si no hay entrenamiento, manejar la navegación interna
    if (state && state.tab) {
        // Navegación interna: cambiar a la pestaña indicada sin modificar historial
        console.log('[back-handler] Navegando a pestaña:', state.tab);
        window.switchTab(state.tab, { noPushState: true });
    } else {
        // Sin estado: estamos en la raíz, permitir que el navegador cierre la app
        console.log('[back-handler] Estado raíz, permitiendo salida nativa.');
        // No hacer nada, dejar que el navegador maneje la salida.
        // Esto es lo que espera Samsung Internet.
    }
}

// ==========================================================================
// FUNCIÓN PARA NAVEGAR A UNA PESTAÑA CON PUSHSTATE
// ==========================================================================

function navigateToTab(tabName) {
    // Solo para pestañas principales (no internas)
    const mainTabs = ['today', 'plan', 'history', 'exercises'];
    if (mainTabs.includes(tabName)) {
        // Crear un estado con la pestaña
        const state = { tab: tabName };
        const url = new URL(window.location);
        url.hash = tabName; // Opcional: mantener el hash como referencia
        history.pushState(state, '', url.toString());
    }
    // Cambiar la UI sin volver a modificar el historial
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