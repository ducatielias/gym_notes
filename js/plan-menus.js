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
        await window.showAlert(`Historial de modificaciones de "${session.title}"\n\nÚltima modificación: ${new Date(session.lastModified).toLocaleString()}`, "Historial");
    }
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