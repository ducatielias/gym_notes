<<<<<<< HEAD
/**
 * MÓDULO: plan-menus.js
 * Controla los menús contextuales de rutinas y sesiones
 */

=======
/**
 * MÓDULO: plan-menus.js
 * Controla los menús contextuales de rutinas y sesiones
 */

>>>>>>> a0e06567d66fb0b2bcaca3a4ed517c8aee665a60
// ===========================================================================
// MENÚS CONTEXTUALES PARA RUTINAS
// ===========================================================================

/**
 * Cierra todos los menús contextuales de tarjetas de Plan.
 * La clase .hidden es el único estado de apertura de estos menús.
 */
function closePlanCardMenus() {
    document.querySelectorAll('.session-menu-dropdown, .routine-menu-dropdown')
        .forEach(menu => menu.classList.add('hidden'));
}

function toggleRoutineMenu(event, routineId) {
    event.stopPropagation();

    const targetMenu = document.getElementById(`menu-routine-${routineId}`);
    if (!targetMenu) return;

    const shouldOpen = targetMenu.classList.contains('hidden');
    closePlanCardMenus();

    if (shouldOpen) targetMenu.classList.remove('hidden');
}
<<<<<<< HEAD

// ==========================================================================
// MENÚS CONTEXTUALES PARA SESIONES
// ==========================================================================

=======

// ==========================================================================
// MENÚS CONTEXTUALES PARA SESIONES
// ==========================================================================

>>>>>>> a0e06567d66fb0b2bcaca3a4ed517c8aee665a60
function toggleSessionMenu(event, sessionId) {
    event.stopPropagation();

    const targetMenu = document.getElementById(`menu-${sessionId}`);
    if (!targetMenu) return;

    const shouldOpen = targetMenu.classList.contains('hidden');
    closePlanCardMenus();

    if (shouldOpen) targetMenu.classList.remove('hidden');
}
<<<<<<< HEAD

=======

>>>>>>> a0e06567d66fb0b2bcaca3a4ed517c8aee665a60
/**
 * Cierra un menú de tarjeta antes de que un clic exterior alcance la tarjeta
 * u otra acción situada debajo. Los botones de opciones y el propio menú
 * conservan su propagación para poder alternar y ejecutar sus acciones.
 */
function handlePlanCardMenuOutsideClick(event) {
    const target = event.target instanceof Element ? event.target : null;

    // Un modal ya abierto no debe participar en el cierre de menús de Plan.
    if (target?.closest('#customModal')) return;

    const openMenus = document.querySelectorAll(
        '.session-menu-dropdown:not(.hidden), .routine-menu-dropdown:not(.hidden)'
    );

    if (openMenus.length === 0) return;

    const clickedInsideMenu = target?.closest('.session-menu-dropdown, .routine-menu-dropdown');
    const clickedMenuToggle = target?.closest('.btn-session-options, .btn-routine-options');

    if (clickedInsideMenu) {
        // El camino del evento ya está fijado: ocultar primero permite que el
        // onclick de la acción continúe y abra su modal sin dejar un menú activo.
        closePlanCardMenus();
        return;
    }

    if (clickedMenuToggle) return;

    closePlanCardMenus();

    // El listener se ejecuta en captura: al detener la propagación aquí, el
    // elemento exterior no recibe el mismo clic que acaba de cerrar el menú.
    event.preventDefault();
    event.stopPropagation();
}

// El cierre de los menús de tarjetas debe ocurrir antes de sus onclick inline.
document.addEventListener('click', handlePlanCardMenuOutsideClick, true);

// El menú del editor mantiene su cierre heredado independiente.
document.addEventListener('click', () => {
    const editorMenu = document.getElementById('editorOptionsMenu');
    if (editorMenu) {
        editorMenu.classList.add('hidden');
<<<<<<< HEAD
    }
});

// ==========================================================================
// MENÚ DE OPCIONES DEL EDITOR (TRES PUNTOS)
// ==========================================================================

function toggleSessionOptionsMenu(event) {
    event.stopPropagation();
    closePlanCardMenus();
    
    const targetMenu = document.getElementById('editorOptionsMenu');
    if (targetMenu) {
        targetMenu.classList.toggle('hidden');
    }
}

async function handleSessionHistory() {
    const session = window.editingSession;
    if (session) {
        // Obtener el nombre de la sesión y la rutina actual
        const sessionTitle = session.title;
        const routine = appData.routines.find(r => r.id === currentRoutineId);
        const routineName = routine ? routine.name : '';
        
        // GUARDAR LOS IDs PARA VOLVER EXACTAMENTE A LA MISMA SESIÓN
        window.historySessionId = session.id;
        window.historyRoutineId = currentRoutineId;
        
        console.log('[handleSessionHistory] Guardando IDs - sesión:', session.id, 'rutina:', currentRoutineId);
        console.log('[handleSessionHistory] Buscando sesión:', sessionTitle, 'en rutina:', routineName);
        
        // Guardar origen para el botón de retroceso
        historyReturnScreen = 'session';
        window.historyReturnScreen = 'session';
        
        // Guardar el nombre de la rutina para filtrar
        historyOriginalRoutineFilter = routineName;
        window.historyOriginalRoutineFilter = routineName;
        
        // Establecer el filtro de búsqueda por nombre de sesión
        historySearchTerm = sessionTitle;
        window.historySearchTerm = sessionTitle;
        
        // Establecer el filtro de rutina
        historyRoutineFilter = routineName;
        window.historyRoutineFilter = routineName;
        
        // Navegar a la pantalla de historial
        switchTab('history');
        
        // Esperar a que el DOM se renderice y luego aplicar el filtro
        setTimeout(() => {
            const input = document.getElementById('historySearchInput');
            if (input) {
                input.value = sessionTitle;
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
            
            // Actualizar el select de rutinas
            const routineSelect = document.getElementById('historyRoutineFilterSelect');
            if (routineSelect) {
                routineSelect.value = routineName;
            }
            
            updateHistoryClearButton();
            renderHistory();
        }, 100);
    }
    
    // Cerrar el menú
    const menu = document.getElementById('editorOptionsMenu');
    if (menu) menu.classList.add('hidden');
}

async function handleSessionShare() {
    const session = window.editingSession;
    if (session) {
        await window.showAlert(`Compartir sesión: "${session.title}"\n\n(La funcionalidad de compartir estará disponible próximamente)`, "Compartir");
    }
    const menu = document.getElementById('editorOptionsMenu');
    if (menu) menu.classList.add('hidden');
}

async function startSessionTracking() {
    const session = window.editingSession;
    if (session) {
        const routine = appData.routines.find(r => r.id === currentRoutineId);
        if (routine) {
            iniciarEntrenamiento({
                id: session.id,
                title: session.title,
                content: session.content,
                routineName: routine.name
            });
        } else {
            await window.showAlert("No se pudo iniciar el entrenamiento.", "Error");
        }
    }
}

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.toggleRoutineMenu = toggleRoutineMenu;
window.toggleSessionMenu = toggleSessionMenu;
window.toggleSessionOptionsMenu = toggleSessionOptionsMenu;
window.handleSessionHistory = handleSessionHistory;
window.handleSessionShare = handleSessionShare;
=======
    }
});

// ==========================================================================
// MENÚ DE OPCIONES DEL EDITOR (TRES PUNTOS)
// ==========================================================================

function toggleSessionOptionsMenu(event) {
    event.stopPropagation();
    closePlanCardMenus();
    
    const targetMenu = document.getElementById('editorOptionsMenu');
    if (targetMenu) {
        targetMenu.classList.toggle('hidden');
    }
}

async function handleSessionHistory() {
    const session = window.editingSession;
    if (session) {
        // Obtener el nombre de la sesión y la rutina actual
        const sessionTitle = session.title;
        const routine = appData.routines.find(r => r.id === currentRoutineId);
        const routineName = routine ? routine.name : '';
        
        // GUARDAR LOS IDs PARA VOLVER EXACTAMENTE A LA MISMA SESIÓN
        window.historySessionId = session.id;
        window.historyRoutineId = currentRoutineId;
        
        console.log('[handleSessionHistory] Guardando IDs - sesión:', session.id, 'rutina:', currentRoutineId);
        console.log('[handleSessionHistory] Buscando sesión:', sessionTitle, 'en rutina:', routineName);
        
        // Guardar origen para el botón de retroceso
        historyReturnScreen = 'session';
        window.historyReturnScreen = 'session';
        
        // Guardar el nombre de la rutina para filtrar
        historyOriginalRoutineFilter = routineName;
        window.historyOriginalRoutineFilter = routineName;
        
        // Establecer el filtro de búsqueda por nombre de sesión
        historySearchTerm = sessionTitle;
        window.historySearchTerm = sessionTitle;
        
        // Establecer el filtro de rutina
        historyRoutineFilter = routineName;
        window.historyRoutineFilter = routineName;
        
        // Navegar a la pantalla de historial
        switchTab('history');
        
        // Esperar a que el DOM se renderice y luego aplicar el filtro
        setTimeout(() => {
            const input = document.getElementById('historySearchInput');
            if (input) {
                input.value = sessionTitle;
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
            
            // Actualizar el select de rutinas
            const routineSelect = document.getElementById('historyRoutineFilterSelect');
            if (routineSelect) {
                routineSelect.value = routineName;
            }
            
            updateHistoryClearButton();
            renderHistory();
        }, 100);
    }
    
    // Cerrar el menú
    const menu = document.getElementById('editorOptionsMenu');
    if (menu) menu.classList.add('hidden');
}

async function handleSessionShare() {
    const session = window.editingSession;
    if (session) {
        await window.showAlert(`Compartir sesión: "${session.title}"\n\n(La funcionalidad de compartir estará disponible próximamente)`, "Compartir");
    }
    const menu = document.getElementById('editorOptionsMenu');
    if (menu) menu.classList.add('hidden');
}

async function startSessionTracking() {
    const session = window.editingSession;
    if (session) {
        const routine = appData.routines.find(r => r.id === currentRoutineId);
        if (routine) {
            iniciarEntrenamiento({
                id: session.id,
                title: session.title,
                content: session.content,
                routineName: routine.name
            });
        } else {
            await window.showAlert("No se pudo iniciar el entrenamiento.", "Error");
        }
    }
}

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.toggleRoutineMenu = toggleRoutineMenu;
window.toggleSessionMenu = toggleSessionMenu;
window.toggleSessionOptionsMenu = toggleSessionOptionsMenu;
window.handleSessionHistory = handleSessionHistory;
window.handleSessionShare = handleSessionShare;
>>>>>>> a0e06567d66fb0b2bcaca3a4ed517c8aee665a60
window.startSessionTracking = startSessionTracking;
