/**
 * MÓDULO: plan-menus.js
 * Controla los menús contextuales de rutinas y sesiones
 */

// ==========================================================================
// MENÚS CONTEXTUALES PARA RUTINAS
// ==========================================================================

function toggleRoutineMenu(event, routineId) {
    event.stopPropagation();
    
    const routineDropdowns = document.querySelectorAll('.routine-menu-dropdown');
    routineDropdowns.forEach(menu => {
        if (menu.id !== `menu-routine-${routineId}`) {
            menu.classList.add('hidden');
        }
    });

    const sessionDropdowns = document.querySelectorAll('.session-menu-dropdown');
    sessionDropdowns.forEach(menu => menu.classList.add('hidden'));

    const targetMenu = document.getElementById(`menu-routine-${routineId}`);
    if (targetMenu) {
        targetMenu.classList.toggle('hidden');
    }
}

// ==========================================================================
// MENÚS CONTEXTUALES PARA SESIONES
// ==========================================================================

function toggleSessionMenu(event, sessionId) {
    event.stopPropagation();
    
    const dropdowns = document.querySelectorAll('.session-menu-dropdown');
    dropdowns.forEach(menu => {
        if (menu.id !== `menu-${sessionId}`) {
            menu.classList.add('hidden');
        }
    });

    const routineDropdowns = document.querySelectorAll('.routine-menu-dropdown');
    routineDropdowns.forEach(menu => menu.classList.add('hidden'));

    const targetMenu = document.getElementById(`menu-${sessionId}`);
    if (targetMenu) {
        targetMenu.classList.toggle('hidden');
    }
}

// Cerrar menús al hacer clic fuera
document.addEventListener('click', () => {
    document.querySelectorAll('.session-menu-dropdown').forEach(m => m.classList.add('hidden'));
    document.querySelectorAll('.routine-menu-dropdown').forEach(m => m.classList.add('hidden'));
    const editorMenu = document.getElementById('editorOptionsMenu');
    if (editorMenu) {
        editorMenu.classList.add('hidden');
    }
});

// ==========================================================================
// MENÚ DE OPCIONES DEL EDITOR (TRES PUNTOS)
// ==========================================================================

function toggleSessionOptionsMenu(event) {
    event.stopPropagation();
    
    document.querySelectorAll('.session-menu-dropdown').forEach(m => m.classList.add('hidden'));
    document.querySelectorAll('.routine-menu-dropdown').forEach(m => m.classList.add('hidden'));
    
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
window.startSessionTracking = startSessionTracking;