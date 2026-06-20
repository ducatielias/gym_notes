/**
 * MÓDULO: plan-routines.js
 * Controla el listado de rutinas y sus operaciones CRUD
 */

// ==========================================================================
// RENDERIZADO PRINCIPAL DE RUTINAS
// ==========================================================================

function renderRoutineList() {
    const planUI = document.getElementById('plan-container');
    if (!planUI) return;

    planUI.innerHTML = `
        <header class="screen-header">
            <div class="header-nav-row">
                <h1>Mis Rutinas</h1>
                <button class="btn-header-add" onclick="createNewRoutine()" title="Nueva Rutina">
                    <i class="fa-solid fa-plus"></i>
                </button>
            </div>
        </header>
        
        <div id="routines-list" class="cards-grid">
            ${appData.routines.map((routine, index) => `
                <div class="card card-routine" onclick="openRoutine('${routine.id}')">
                    <div class="card-content">
                        <h3>${routine.name}</h3>
                        <p>${routine.sessions.length} sesiones creadas</p>
                    </div>
                    
                    <button class="btn-routine-options" onclick="toggleRoutineMenu(event, '${routine.id}')">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>

                    <div class="routine-menu-dropdown hidden" id="menu-routine-${routine.id}" onclick="event.stopPropagation()">
                        <button class="routine-menu-item" onclick="moveRoutineOrder('${routine.id}', -1)">
                            <i class="fa-solid fa-arrow-up"></i> Mover arriba
                        </button>
                        <button class="routine-menu-item" onclick="moveRoutineOrder('${routine.id}', 1)">
                            <i class="fa-solid fa-arrow-down"></i> Mover abajo
                        </button>
                        
                        <div class="routine-menu-divider"></div>
                        
                        <button class="routine-menu-item" onclick="renameRoutine('${routine.id}')">
                            <i class="fa-solid fa-pen"></i> Editar nombre
                        </button>
                        <button class="routine-menu-item" onclick="copyWholeRoutine('${routine.id}')">
                            <i class="fa-solid fa-clone"></i> Copiar rutina
                        </button>
                        <button class="routine-menu-item menu-delete" onclick="deleteRoutine('${routine.id}')">
                            <i class="fa-solid fa-trash-can"></i> Eliminar rutina
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>

        ${appData.routines.length === 0 ? `
            <div class="empty-state">
                <p>No tienes rutinas todavía.<br>Crea la primera para empezar.</p>
            </div>
        ` : ''}
    `;
}

// ==========================================================================
// CRUD DE RUTINAS
// ==========================================================================

async function createNewRoutine() {
    const name = await window.showPrompt("Nombre de la nueva rutina:", "", "Nueva Rutina");
    if (!name) return;

    const newRoutine = {
        id: 'r-' + Date.now(),
        name: name,
        sessions: []
    };

    appData.routines.push(newRoutine);
    saveData();
    renderRoutineList();
}

function moveRoutineOrder(routineId, direction) {
    const index = appData.routines.findIndex(r => r.id === routineId);
    if (index === -1) return;

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= appData.routines.length) return;

    const [movedRoutine] = appData.routines.splice(index, 1);
    appData.routines.splice(targetIndex, 0, movedRoutine);

    saveData();
    renderRoutineList();
}

async function renameRoutine(routineId) {
    const routine = appData.routines.find(r => r.id === routineId);
    if (!routine) return;

    const oldName = routine.name;
    const newName = await window.showPrompt("Modificar nombre de la rutina:", routine.name, "Editar nombre");
    if (!newName || newName.trim() === "") return;

    const newNameTrimmed = newName.trim();
    routine.name = newNameTrimmed;
    saveData();
    
    // ACTUALIZAR EL HISTORIAL: Cambiar el nombre de la rutina en todos los registros del historial
    try {
        // Obtener el historial actual
        let historyDB = JSON.parse(localStorage.getItem('sharkHistory')) || [];
        let actualizados = 0;
        
        // Recorrer y actualizar los registros que coincidan con el nombre antiguo
        historyDB = historyDB.map(record => {
            if (record.nombre_rutina === oldName) {
                actualizados++;
                return { ...record, nombre_rutina: newNameTrimmed };
            }
            return record;
        });
        
        // Guardar el historial actualizado
        localStorage.setItem('sharkHistory', JSON.stringify(historyDB));
        
        // Actualizar la variable global si existe
        if (window.historyDB !== undefined) {
            window.historyDB = historyDB;
        }
        
        console.log(`[renameRoutine] Historial actualizado: ${actualizados} registros modificados de "${oldName}" a "${newNameTrimmed}"`);
        
        if (actualizados > 0 && typeof window.showAlert === 'function') {
            await window.showAlert(`Rutina renombrada correctamente.\n${actualizados} registro(s) del historial actualizados.`, "Completado");
        }
    } catch (error) {
        console.error('[renameRoutine] Error actualizando el historial:', error);
    }
    
    renderRoutineList();
}

async function copyWholeRoutine(routineId) {
    const originalRoutine = appData.routines.find(r => r.id === routineId);
    if (!originalRoutine) return;

    const clonedSessions = originalRoutine.sessions.map(session => ({
        id: 's-' + Math.floor(Math.random() * 10000000) + Date.now(),
        title: session.title,
        content: session.content,
        lastModified: Date.now()
    }));

    const clonedRoutine = {
        id: 'r-' + Date.now(),
        name: `${originalRoutine.name} (Copia)`,
        sessions: clonedSessions
    };

    appData.routines.push(clonedRoutine);
    saveData();
    
    await window.showAlert(`Rutina "${originalRoutine.name}" duplicada con éxito.`, "Completado");
    renderRoutineList();
}

async function deleteRoutine(routineId) {
    const routine = appData.routines.find(r => r.id === routineId);
    if (!routine) return;

    const confirmDelete = await window.showConfirm(`¿Estás completamente seguro de eliminar la rutina "${routine.name}" y todas sus sesiones?`, "Eliminar rutina");
    if (confirmDelete) {
        appData.routines = appData.routines.filter(r => r.id !== routineId);
        saveData();
        renderRoutineList();
    }
}

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.renderRoutineList = renderRoutineList;
window.createNewRoutine = createNewRoutine;
window.moveRoutineOrder = moveRoutineOrder;
window.renameRoutine = renameRoutine;
window.copyWholeRoutine = copyWholeRoutine;
window.deleteRoutine = deleteRoutine;