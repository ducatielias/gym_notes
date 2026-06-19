/**
 * MÓDULO: plan-sessions.js
 * Controla la visualización de sesiones dentro de una rutina y sus operaciones CRUD
 */

// ==========================================================================
// ABRIR UNA RUTINA Y VER SUS SESIONES
// ==========================================================================

function openRoutine(id) {
    currentRoutineId = id;
    const routine = appData.routines.find(r => r.id === id);
    const planUI = document.getElementById('plan-container');
    if (!planUI) return;

    planUI.innerHTML = `
        <header class="screen-header">
            <div class="header-nav-row">
                <button class="btn-back" onclick="renderRoutineList()">
                    <i class="fa-solid fa-chevron-left"></i> Volver
                </button>
                <button class="btn-header-add" onclick="createNewSession()" title="Nueva Sesión">
                    <i class="fa-solid fa-plus"></i>
                </button>
            </div>
            <h2 class="routine-detail-title">${routine.name}</h2>
        </header>

        <div id="sessions-list" class="cards-grid">
            ${routine.sessions.map((session, index) => `
                <div class="card card-session" onclick="openSessionEditor('${session.id}')">
                    <div class="card-content">
                        <h3>${session.title}</h3>
                        <p>Modificado: ${new Date(session.lastModified).toLocaleDateString()}</p>
                    </div>
                    
                    <button class="btn-session-options" onclick="toggleSessionMenu(event, '${session.id}')">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>

                    <div class="session-menu-dropdown hidden" id="menu-${session.id}" onclick="event.stopPropagation()">
                        <button class="session-menu-item" onclick="moveSessionOrder('${session.id}', -1)">
                            <i class="fa-solid fa-arrow-up"></i> Mover arriba
                        </button>
                        <button class="session-menu-item" onclick="moveSessionOrder('${session.id}', 1)">
                            <i class="fa-solid fa-arrow-down"></i> Mover abajo
                        </button>
                        
                        <div class="routine-menu-divider"></div>
                        
                        <button class="session-menu-item" onclick="copySessionToRoutine('${session.id}')">
                            <i class="fa-solid fa-clone"></i> Copiar sesión
                        </button>
                        <button class="session-menu-item" onclick="moveSessionToRoutine('${session.id}')">
                            <i class="fa-solid fa-right-from-bracket"></i> Mover sesión
                        </button>
                        <button class="session-menu-item menu-delete" onclick="deleteSession('${session.id}')">
                            <i class="fa-solid fa-trash-can"></i> Eliminar sesión
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>

        ${routine.sessions.length === 0 ? `
            <div class="empty-state">
                <p>Esta rutina no tiene sesiones.<br>¡Añade una ahora!</p>
            </div>
        ` : ''}
    `;
}

// ==========================================================================
// CRUD DE SESIONES
// ==========================================================================

function createNewSession() {
    const routine = appData.routines.find(r => r.id === currentRoutineId);
    if (!routine) return;

    const newSession = {
        id: 's-' + Date.now(),
        title: 'Nueva Sesión',
        content: '',
        lastModified: Date.now()
    };

    routine.sessions.push(newSession);
    saveData();
    
    openSessionEditor(newSession.id, true);
}

function moveSessionOrder(sessionId, direction) {
    const routine = appData.routines.find(r => r.id === currentRoutineId);
    if (!routine) return;

    const index = routine.sessions.findIndex(s => s.id === sessionId);
    if (index === -1) return;

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= routine.sessions.length) return;

    const [movedSession] = routine.sessions.splice(index, 1);
    routine.sessions.splice(targetIndex, 0, movedSession);

    saveData();
    openRoutine(currentRoutineId);
}

async function deleteSession(sessionId) {
    const routine = appData.routines.find(r => r.id === currentRoutineId);
    if (!routine) return;

    const session = routine.sessions.find(s => s.id === sessionId);
    if (!session) return;

    const confirmDelete = await window.showConfirm(`¿Estás seguro de que deseas eliminar la sesión "${session.title}"?`, "Eliminar sesión");
    if (confirmDelete) {
        routine.sessions = routine.sessions.filter(s => s.id !== sessionId);
        saveData();
        openRoutine(currentRoutineId);
    }
}

async function copySessionToRoutine(sessionId) {
    const currentRoutine = appData.routines.find(r => r.id === currentRoutineId);
    const sessionToCopy = currentRoutine.sessions.find(s => s.id === sessionId);
    if (!sessionToCopy) return;

    const selectedRoutine = await window.showRoutineSelector(
        appData.routines,
        currentRoutineId,
        'copy'
    );

    if (!selectedRoutine) return;

    const clonedSession = {
        id: 's-' + Date.now(),
        title: `${sessionToCopy.title} (Copia)`,
        content: sessionToCopy.content,
        lastModified: Date.now()
    };

    selectedRoutine.sessions.push(clonedSession);
    saveData();
    
    await window.showAlert(`Sesión copiada con éxito a "${selectedRoutine.name}"`, "Completado");
    openRoutine(currentRoutineId);
}

async function moveSessionToRoutine(sessionId) {
    const currentRoutine = appData.routines.find(r => r.id === currentRoutineId);
    const sessionIndex = currentRoutine.sessions.findIndex(s => s.id === sessionId);
    if (sessionIndex === -1) return;

    const sessionToMove = currentRoutine.sessions[sessionIndex];

    const selectedRoutine = await window.showRoutineSelector(
        appData.routines,
        currentRoutineId,
        'move'
    );

    if (!selectedRoutine) return;

    if (selectedRoutine.id === currentRoutineId) {
        await window.showAlert("No puedes mover una sesión a la misma rutina.", "Aviso");
        return;
    }

    currentRoutine.sessions.splice(sessionIndex, 1);
    sessionToMove.lastModified = Date.now();
    selectedRoutine.sessions.push(sessionToMove);

    saveData();
    
    await window.showAlert(`Sesión movida con éxito a "${selectedRoutine.name}"`, "Completado");
    openRoutine(currentRoutineId);
}

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.openRoutine = openRoutine;
window.createNewSession = createNewSession;
window.moveSessionOrder = moveSessionOrder;
window.deleteSession = deleteSession;
window.copySessionToRoutine = copySessionToRoutine;
window.moveSessionToRoutine = moveSessionToRoutine;