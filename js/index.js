/**
 * MÓDULO CENTRAL: index.js
 * Controla la navegación global por pestañas de la aplicación.
 * 
 * MODIFICADO: Los botones del menú usan navigateToTab en lugar de switchTab
 * para que el historial se gestione correctamente (integrado con back-handler.js).
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

    // 6. Lógica modular específica
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
    // Delegar en navigateToTab (definido en back-handler.js)
    if (typeof window.navigateToTab === 'function') {
        window.navigateToTab(tabId);
    } else {
        // Fallback: si no está disponible, hacer pushState manual
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
    if (hash && validTabs.includes(hash)) {
        switchTab(hash, { noPushState: true });
    } else {
        switchTab('today', { noPushState: true });
    }

    // Configurar listeners de scroll para el botón flotante
    const scrollableScreens = document.querySelectorAll('.screen');
    scrollableScreens.forEach(screen => {
        screen.addEventListener('scroll', handleScreenScrollDetection);
    });

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

/**
 * Controla la visibilidad adaptativa del botón flotante según el scroll.
 */
function handleScreenScrollDetection(event) {
    const currentScreen = event.currentTarget;
    const globalBtn = document.getElementById('globalScrollTopBtn');
    if (!globalBtn) return;
    if (currentScreen.scrollTop > 250) {
        globalBtn.classList.add('visible');
    } else {
        globalBtn.classList.remove('visible');
    }
}

/**
 * Desplaza la pantalla actual visible suavemente hasta el borde superior.
 */
function scrollToTopCurrentScreen() {
    const activeScreen = document.querySelector('.screen:not(.hidden)');
    if (activeScreen) {
        activeScreen.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Exponer funciones globalmente
window.switchTab = switchTab;
window.navigateAndSwitch = navigateAndSwitch;
window.scrollToTopCurrentScreen = scrollToTopCurrentScreen;