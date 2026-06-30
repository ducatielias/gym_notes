/**
 * MÓDULO: back-handler.js
 * Control de navegación mediante el historial.
 * 
 * Maneja el evento popstate para navegar entre pestañas usando
 * el historial del navegador. Cuando no hay estado, permite la salida nativa.
 */

let backHandlerInitialized = false;

function initBackHandler() {
    if (backHandlerInitialized) return;
    window.addEventListener('popstate', handlePopState);
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';
    backHandlerInitialized = true;
    console.log('[back-handler] Inicializado.');
}

function handlePopState(event) {
    const state = event.state;
    console.log('[back-handler] popstate:', state);
    if (state && state.tab) {
        // Navegación interna: cambiar a la pestaña sin modificar historial
        window.switchTab(state.tab, { noPushState: true });
    } else {
        // Sin estado: salida nativa (no hacer nada)
        console.log('[back-handler] Estado raíz, permitiendo salida.');
    }
}

window.initBackHandler = initBackHandler;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBackHandler);
} else {
    initBackHandler();
}