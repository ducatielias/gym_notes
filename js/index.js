/**
 * MÓDULO CENTRAL: index.js
 * Controla la navegación global por pestañas de la aplicación.
 */

function switchTab(tabId) {
    // 1. Ocultar todas las pantallas del contenedor principal
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => s.classList.add('hidden'));

    // 2. Desactivar el estado visual de todos los botones del menú inferior
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));

    // 3. Capturar el contenedor del menú inferior (bottom-nav)
    const bottomNav = document.querySelector('.bottom-nav');

    // SOLUCIÓN AL TECLADO: Si entramos al editor, ocultamos por completo el menú de pestañas
    if (tabId === 'editor') {
        if (bottomNav) bottomNav.classList.add('hidden-nav');
    } else {
        // Al regresar a cualquier otra pestaña, volvemos a mostrar el menú de inmediato
        if (bottomNav) bottomNav.classList.remove('hidden-nav');
    }

    // 4. Mostrar la pantalla solicitada
    const targetScreen = document.getElementById(`screen-${tabId}`);
    if (targetScreen) {
        targetScreen.classList.remove('hidden');
        
        // CORRECCIÓN SEGURO: Reiniciamos el scroll arriba solo al cambiar físicamente de pestaña
        targetScreen.scrollTop = 0;
    }

    // 5. Buscar el botón correspondiente en el menú inferior y activarlo (si no estamos en el editor)
    if (tabId !== 'editor') {
        const currentBtn = Array.from(navItems).find(btn => btn.getAttribute('onclick').includes(`'${tabId}'`));
        if (currentBtn) {
            currentBtn.classList.add('active');
        }
    }

    // Lógica interna modular: Si el usuario entra a 'Plan', refrescar la lista de rutinas
    if (tabId === 'plan') {
        renderRoutineList(); 
    }

    // NUEVO: Si el usuario entra a 'Exercises', inicializar la página de ejercicios
    if (tabId === 'exercises') {
        // Esperar a que el DOM se renderice completamente
        setTimeout(function() {
            if (typeof initExercisesPage === 'function') {
                initExercisesPage();
            } else {
                // Fallback: si la función no está disponible, forzar renderizado
                const container = document.getElementById('exercises-container');
                if (container && typeof renderExercises === 'function') {
                    renderExercises();
                }
            }
        }, 50);
    }
}

// Inicialización de la App al cargar el documento
document.addEventListener('DOMContentLoaded', () => {
    // Definimos "Hoy" como la pantalla de arranque por defecto de la aplicación
    switchTab('today'); // CORREGIDO: antes era 'hoy', ahora usa el ID correcto 'today'

    // Vincular la detección de scroll individual en cada una de las pantallas principales
    const scrollableScreens = document.querySelectorAll('.screen');
    scrollableScreens.forEach(screen => {
        screen.addEventListener('scroll', handleScreenScrollDetection);
    });

    // NUEVO: Inicializar la página de ejercicios si está visible al cargar
    const exercisesScreen = document.getElementById('screen-exercises');
    if (exercisesScreen && !exercisesScreen.classList.contains('hidden')) {
        setTimeout(function() {
            if (typeof initExercisesPage === 'function') {
                initExercisesPage();
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

    // Si el usuario baja más de 250px en la pantalla activa, mostramos el botón flotante
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