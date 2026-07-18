/**
 * MÓDULO CENTRAL: index.js
 * Controla la navegación global por pestañas de la aplicación.
 * 
 * MODIFICADO: Integración con back-handler.js para actualizar currentTab
 * y establecer un estado inicial en el historial.
 */

function switchTab(tabId, options = {}) {
    const noPushState = options.noPushState || false;

    // 1. Ocultar todas las pantallas
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => s.classList.add('hidden'));

    // 2. Desactivar todos los botones del menú inferior
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));

    // 3. Gestionar la visibilidad del menú inferior
    const bottomNav = document.querySelector('.bottom-nav');
    const internalScreens = ['editor', 'exercise-editor', 'history-detail', 'exercise-viewer'];
    if (internalScreens.includes(tabId)) {
        if (bottomNav) bottomNav.classList.add('hidden-nav');
    } else {
        if (bottomNav) bottomNav.classList.remove('hidden-nav');
    }

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

    // 6. Si es una pestaña principal, actualizar currentTab en back-handler
    const mainTabs = ['today', 'plan', 'history', 'exercises'];
    if (mainTabs.includes(tabId) && typeof window.setCurrentTab === 'function') {
        window.setCurrentTab(tabId);
    }

    // 7. Lógica modular específica
    if (tabId === 'plan') {
        renderRoutineList();
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

// ==========================================================================
// NAVEGAR Y CAMBIAR DE PESTAÑA (CON HISTORIAL)
// ==========================================================================

function navigateAndSwitch(tabId) {
    if (typeof window.navigateToTab === 'function') {
        window.navigateToTab(tabId);
    } else {
        // Fallback
        const mainTabs = ['today', 'plan', 'history', 'exercises'];
        if (mainTabs.includes(tabId)) {
            const state = { tab: tabId };
            const url = new URL(window.location);
            url.hash = tabId;
            history.pushState(state, '', url.toString());
        }
        switchTab(tabId, { noPushState: true });
    }
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

    // Mostrar la pestaña inicial sin modificar historial (noPushState)
    switchTab(initialTab, { noPushState: true });

    // Establecer un estado inicial en el historial para que el retroceso funcione
    // (si no hay estado, el navegador no tiene referencia)
    if (window.history && window.history.state === null) {
        const state = { tab: initialTab };
        history.replaceState(state, '', '#' + initialTab);
    }

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
