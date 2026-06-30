/**
 * MÓDULO: back-handler.js
 * Control de navegación mediante el historial para la SPA.
 * 
 * Este módulo maneja el evento popstate para permitir la navegación
 * interna entre pestañas usando el historial del navegador.
 * Cuando el usuario está en la raíz (sin estado), el botón de retroceso
 * cerrará la aplicación de forma natural (sin modal).
 * 
 * Para mostrar un modal de confirmación al salir, se proporciona un botón
 * de "Salir" en la interfaz de usuario.
 */

// ==========================================================================
// VARIABLES GLOBALES
// ==========================================================================

let backHandlerInitialized = false;

// ==========================================================================
// FUNCIÓN PRINCIPAL: INICIALIZAR EL CONTROL DE NAVEGACIÓN
// ==========================================================================

function initBackHandler() {
    if (backHandlerInitialized) return;
    
    // Escuchar el evento popstate para navegación interna
    window.addEventListener('popstate', handlePopState);
    
    // Prevenir overscroll (opcional)
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';
    
    backHandlerInitialized = true;
    console.log('[back-handler] Control de navegación inicializado.');
}

// ==========================================================================
// MANEJADOR DE POPSTATE (NAVEGACIÓN INTERNA)
// ==========================================================================

function handlePopState(event) {
    const state = event.state;
    console.log('[back-handler] popstate detectado:', state);
    
    if (state && state.tab) {
        // Navegación interna: cambiar a la pestaña indicada
        const tab = state.tab;
        console.log('[back-handler] Navegando a pestaña:', tab);
        // Usar switchTab sin pushState para evitar bucles
        window.switchTab(tab, { noPushState: true });
    } else {
        // Sin estado: estamos en la raíz, el navegador manejará la salida.
        console.log('[back-handler] Estado raíz, permitiendo salida nativa.');
        // No hacer nada, dejar que el navegador cierre la app.
    }
}

// ==========================================================================
// FUNCIÓN PARA NAVEGAR A UNA PESTAÑA CON PUSHSTATE
// ==========================================================================

function navigateToTab(tabName) {
    // Solo si la pestaña no es una de las pantallas internas (editor, detalle)
    const internalScreens = ['editor', 'exercise-editor', 'history-detail', 'exercise-viewer'];
    if (internalScreens.includes(tabName)) {
        // Para estas pantallas, no usamos pushState porque son modales
        // que se abren sobre la pestaña actual.
        window.switchTab(tabName, { noPushState: true });
        return;
    }
    
    // Crear un estado con la pestaña
    const state = { tab: tabName };
    const url = new URL(window.location);
    url.hash = tabName; // Opcional: mantener el hash como referencia
    history.pushState(state, '', url.toString());
    // Llamar a switchTab sin pushState para evitar recursión
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