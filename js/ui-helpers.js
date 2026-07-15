/**
 * MÓDULO: ui-helpers.js
 * Controla la visibilidad del botón flotante de scroll, el reseteo de scroll
 * al cambiar de pestañas, y la observación de mutaciones del DOM para mantener
 * el scroll en la parte superior cuando el contenido cambia.
 */

// Capturar todas las pantallas que tienen scroll independiente
const allScreens = document.querySelectorAll('.screen');
const globalScrollTopButton = document.getElementById('globalScrollTopBtn');

// Asignar el escuchador de scroll a cada una de ellas de forma genérica
allScreens.forEach(screen => {
    screen.addEventListener('scroll', function() {
        if (!globalScrollTopButton) return;

        // Si la pantalla activa actual baja más de 250px, mostramos el botón genérico
        const shouldShowScrollTopButton = this.scrollTop > 250;
        const isScrollTopButtonVisible = globalScrollTopButton.classList.contains('visible');

        if (shouldShowScrollTopButton !== isScrollTopButtonVisible) {
            globalScrollTopButton.classList.toggle('visible', shouldShowScrollTopButton);
        }
    }, { passive: true });
});

// Función centralizada para devolver el scroll arriba de la pantalla activa
function scrollToTopGlobal() {
    // Buscamos cuál es la pantalla que no está oculta en este momento
    const activeScreen = document.querySelector('.screen:not(.hidden)');
    if (activeScreen) {
        activeScreen.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
}

// Interceptamos la función original de cambiar pestañas para resetear scroll a 0 instantáneamente
const originalSwitchTab = window.switchTab;
window.switchTab = function(tabId) {
    // Ejecutamos la lógica nativa del index.js
    if (typeof originalSwitchTab === 'function') {
        originalSwitchTab(tabId);
    }

    // RESETEO DE PESTAÑA: Devolvemos a 0 el scroll de la nueva pantalla de destino inmediatamente
    const targetScreen = document.getElementById(`screen-${tabId}`);
    if (targetScreen) {
        targetScreen.scrollTop = 0;
    }

    // Ocultar el botón de scroll automáticamente durante la transición
    const globalBtn = document.getElementById('globalScrollTopBtn');
    if (globalBtn) {
        globalBtn.classList.remove('visible');
    }
};

/* ==========================================================================
   SOLUCIÓN AL COMPORTAMIENTO GLOBAL DE SCROLL INTERNO (MUTATION OBSERVER)
   ========================================================================== */
// Este observador vigila si el DOM cambia internamente dentro de las pantallas.
// Cuando cambias de "Mis Rutinas" a las sesiones de una rutina, el contenido muta, 
// e inmediatamente forzamos que el scroll regrese a la parte superior.
const globalScrollObserver = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
            // Buscamos cuál es la pantalla visible actualmente
            const activeScreen = document.querySelector('.screen:not(.hidden)');
            if (activeScreen) {
                // Reseteamos su scroll a 0 de forma instantánea para que el usuario no vea saltos
                activeScreen.scrollTop = 0;
            }
            
            // Ocultamos el botón flotante superior de scroll por si venía de estar muy abajo
            const globalBtn = document.getElementById('globalScrollTopBtn');
            if (globalBtn) {
                globalBtn.classList.remove('visible');
            }
            break;
        }
    }
});

// Iniciamos la observación en los contenedores clave de la app al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    const planContainer = document.getElementById('plan-container');
    
    // Si el contenedor existe, vigilamos cualquier cambio en sus elementos hijos
    if (planContainer) {
        globalScrollObserver.observe(planContainer, { childList: true, subtree: true });
    }
});
