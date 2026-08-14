/**
 * MÓDULO CENTRAL: index.js
 * Controla la navegación global por pestañas de la aplicación.
 * 
 * MODIFICADO: Integración con back-handler.js para actualizar currentTab
 * y establecer un estado inicial en el historial.
 */

const internalScreens = ['editor', 'exercise-editor', 'history-detail', 'exercise-viewer', 'ia-assistant'];
let routineNavigationActive = false;

/**
 * Sincroniza la barra inferior con el contexto de navegación actual.
 * Una rutina mantiene la barra oculta durante todas sus vistas internas.
 */
function syncBottomNavVisibility(tabId) {
    const bottomNav = document.querySelector('.bottom-nav');
    if (!bottomNav) return;

    const activeTabId = tabId || document.querySelector('.screen:not(.hidden)')?.id?.replace('screen-', '');
    const isContextualHistory = activeTabId === 'history'
        && ['workout', 'session', 'today'].includes(window.historyReturnScreen);
    const shouldHide = internalScreens.includes(activeTabId)
        || routineNavigationActive
        || isContextualHistory;
    bottomNav.classList.toggle('hidden-nav', shouldHide);
}

/**
 * Define si la navegación actual pertenece a una rutina, sin acoplarla a cada vista hija.
 */
function setRoutineNavigationActive(isActive) {
    routineNavigationActive = Boolean(isActive);
    syncBottomNavVisibility();
}

function switchTab(tabId, options = {}) {
    const preserveRoutineContext = options.preserveRoutineContext === true;

    // 1. Ocultar todas las pantallas
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => s.classList.add('hidden'));

    // 2. Desactivar todos los botones del menú inferior
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));

    // 3. Gestionar la visibilidad del menú inferior
    if (!preserveRoutineContext && ['today', 'history', 'exercises'].includes(tabId)) {
        routineNavigationActive = false;
    }
    syncBottomNavVisibility(tabId);

    // 4. Mostrar la pantalla solicitada
    const targetScreen = document.getElementById(`screen-${tabId}`);
    if (targetScreen) {
        targetScreen.classList.remove('hidden');
        targetScreen.scrollTop = 0;
    }

    // 5. Activar el botón correspondiente en el menú (si no es pantalla interna)
    if (!internalScreens.includes(tabId)) {
        const currentBtn = Array.from(navItems).find(btn => btn.getAttribute('onclick').includes(`'${tabId}'`));
        if (currentBtn) currentBtn.classList.add('active');
    }

    // 6. Lógica modular específica
    if (tabId === 'plan') {
        if (!options.skipPlanRender) renderRoutineList();
    }
    if (tabId === 'exercises') {
        setTimeout(() => {
            if (typeof initExercisesPage === 'function') {
                initExercisesPage();
            } else if (typeof renderExercises === 'function') {
                renderExercises();
            }
        }, 50);
    }
    if (tabId === 'history') {
        setTimeout(() => {
            if (typeof initHistoryPage === 'function') {
                initHistoryPage();
            } else if (typeof renderHistory === 'function') {
                renderHistory();
            }
        }, 50);
    }
}

window.setRoutineNavigationActive = setRoutineNavigationActive;

// ==========================================================================
// NAVEGAR Y CAMBIAR DE PESTAÑA
// ==========================================================================

function navigateAndSwitch(tabId) {
    switchTab(tabId);
}

// ==========================================================================
// INICIALIZACIÓN DE LA APP
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Si hay un hash en la URL, usarlo para navegar
    const hash = window.location.hash.replace('#', '');
    const validTabs = ['today', 'plan', 'history', 'exercises'];
    let initialTab = 'today';
    if (hash && validTabs.includes(hash)) {
        initialTab = hash;
    }

    // Mostrar la pestaña inicial. back-handler.js es el único propietario de
    // la frontera ROOT + SENTINEL y no representa pestañas en History API.
    switchTab(initialTab);

    // Inicializar módulos si están visibles
    const exercisesScreen = document.getElementById('screen-exercises');
    if (exercisesScreen && !exercisesScreen.classList.contains('hidden')) {
        setTimeout(() => {
            if (typeof initExercisesPage === 'function') initExercisesPage();
        }, 100);
    }

    const historyScreen = document.getElementById('screen-history');
    if (historyScreen && !historyScreen.classList.contains('hidden')) {
        setTimeout(() => {
            if (typeof initHistoryPage === 'function') initHistoryPage();
        }, 100);
    }
});
