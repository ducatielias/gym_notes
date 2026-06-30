/**
 * MÓDULO CENTRAL: index.js
 * Controla la navegación global por pestañas de la aplicación.
 * 
 * MODIFICADO: Ahora utiliza el historial del navegador para la navegación
 * entre pestañas principales, mediante pushState y popstate.
 * Las pantallas internas (editor, detalle) no modifican el historial.
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
    if (internalScreens.includes(tabId) || tabId === 'history') {
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
    if (!internalScreens.includes(tabId) && tabId !== 'history') {
        const currentBtn = Array.from(navItems).find(btn => btn.getAttribute('onclick').includes(`'${tabId}'`));
        if (currentBtn) currentBtn.classList.add('active');
    }

    // 6. Si la pestaña es principal y no viene de popstate, actualizar el historial
    const mainTabs = ['today', 'plan', 'history', 'exercises'];
    if (mainTabs.includes(tabId) && !noPushState && typeof window.navigateToTab === 'function') {
        window.navigateToTab(tabId);
    }

    // 7. Lógica modular específica
    if (tabId === 'plan') renderRoutineList();
    if (tabId === 'exercises') {
        setTimeout(() => {
            if (typeof initExercisesPage === 'function') initExercisesPage();
            else if (typeof renderExercises === 'function') renderExercises();
        }, 50);
    }
    if (tabId === 'history') {
        setTimeout(() => {
            if (typeof initHistoryPage === 'function') initHistoryPage();
            else if (typeof renderHistory === 'function') renderHistory();
        }, 50);
    }
}

// Inicialización de la App al cargar el documento
document.addEventListener('DOMContentLoaded', () => {
    // Si hay un hash en la URL, usarlo para navegar
    const hash = window.location.hash.replace('#', '');
    const validTabs = ['today', 'plan', 'history', 'exercises'];
    if (hash && validTabs.includes(hash)) {
        switchTab(hash, { noPushState: true });
    } else {
        switchTab('today', { noPushState: true });
    }

    const scrollableScreens = document.querySelectorAll('.screen');
    scrollableScreens.forEach(screen => {
        screen.addEventListener('scroll', handleScreenScrollDetection);
    });

    // Inicializar ejercicios si está visible
    const exercisesScreen = document.getElementById('screen-exercises');
    if (exercisesScreen && !exercisesScreen.classList.contains('hidden')) {
        setTimeout(function() {
            if (typeof initExercisesPage === 'function') {
                initExercisesPage();
            }
        }, 100);
    }

    // Inicializar historial si está visible
    const historyScreen = document.getElementById('screen-history');
    if (historyScreen && !historyScreen.classList.contains('hidden')) {
        setTimeout(function() {
            if (typeof initHistoryPage === 'function') {
                initHistoryPage();
            }
        }, 100);
    }
});

/**
 * Controla la visibilidad adaptativa del botón flotante según la posición del scroll.
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
        activeScreen.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
}