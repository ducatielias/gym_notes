/**
 * MÓDULO: plan-routines.js
 * Controla el listado de rutinas y sus operaciones CRUD
 * 
 * MODIFICADO: Botón "+" reemplazado por menú de tres puntos con opciones:
 * Añadir rutina, Importar rutina, Exportar rutina, Borrar todo
 */

// ==========================================================================
// RENDERIZADO PRINCIPAL DE RUTINAS
// ==========================================================================

function renderRoutineList() {
    // Limpiar los IDs guardados para el historial
    window.historySessionId = null;
    window.historyRoutineId = null;
    
    const planUI = document.getElementById('plan-container');
    if (!planUI) return;

    planUI.innerHTML = `
        <header class="screen-header">
            <div class="header-nav-row">
                <h1>Mis Rutinas</h1>
                <div style="position:relative;">
                    <button class="btn-header-options" onclick="toggleRoutineListOptionsMenu(event)" title="Opciones">
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                    <div class="routine-list-options-menu hidden" id="routineListOptionsMenu" onclick="event.stopPropagation()">
                        <button class="menu-item" onclick="createNewRoutine(); closeRoutineListOptionsMenu();">
                            <i class="fa-solid fa-plus"></i> Añadir rutina
                        </button>
                        <div class="menu-divider"></div>
                        <button class="menu-item" onclick="document.getElementById('file-import-routine-list').click(); closeRoutineListOptionsMenu();">
                            <i class="fa-solid fa-file-import"></i> Importar rutina
                        </button>
                        <button class="menu-item" onclick="exportAllRoutines(); closeRoutineListOptionsMenu();">
                            <i class="fa-solid fa-file-export"></i> Exportar rutina
                        </button>
                        <div class="menu-divider"></div>
                        <button class="menu-item menu-delete" onclick="borrarTodasRutinas(); closeRoutineListOptionsMenu();" style="color:#ef4444;">
                            <i class="fa-solid fa-trash-can" style="color:#ef4444;"></i> Borrar todas
                        </button>
                    </div>
                </div>
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
        
        <!-- Input oculto para importar rutina desde el menú de opciones -->
        <input type="file" id="file-import-routine-list" style="display:none" accept=".json,.txt" onchange="importRoutinesFromFile(event)">
    `;
}

// ==========================================================================
// MENÚ DE OPCIONES DE LA LISTA DE RUTINAS
// ==========================================================================

function toggleRoutineListOptionsMenu(event) {
    event.stopPropagation();
    const menu = document.getElementById('routineListOptionsMenu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
}

function closeRoutineListOptionsMenu() {
    const menu = document.getElementById('routineListOptionsMenu');
    if (menu) {
        menu.classList.add('hidden');
    }
}

// Cerrar el menú al hacer clic fuera
document.addEventListener('click', function() {
    const menu = document.getElementById('routineListOptionsMenu');
    if (menu) {
        menu.classList.add('hidden');
    }
});

// ==========================================================================
// EXPORTAR TODAS LAS RUTINAS
// ==========================================================================

function exportAllRoutines() {
    if (appData.routines.length === 0) {
        window.showAlert('No hay rutinas para exportar.', 'Exportar');
        return;
    }
    
    const clean = {
        tipo: 'rutinas_export',
        fecha: new Date().toISOString(),
        rutinas: appData.routines.map(routine => ({
            id: routine.id,
            name: routine.name,
            sessions: routine.sessions.map(session => ({
                id: session.id,
                title: session.title,
                content: session.content,
                lastModified: session.lastModified
            }))
        }))
    };
    
    const dataStr = JSON.stringify(clean, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rutinas_Export_${getRoutineTimestamp()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.showAlert('Rutinas exportadas correctamente.', 'Exportar');
}

// ==========================================================================
// IMPORTAR RUTINAS DESDE ARCHIVO
// ==========================================================================

function importRoutinesFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            let routinesToImport = [];

            if (data.tipo === 'rutinas_export' && Array.isArray(data.rutinas)) {
                routinesToImport = data.rutinas;
            } else if (Array.isArray(data) && data.length > 0 && data[0].name) {
                routinesToImport = data;
            } else if (data.rutinas && Array.isArray(data.rutinas)) {
                routinesToImport = data.rutinas;
            } else {
                throw new Error('El archivo no tiene un formato de rutinas válido.');
            }

            // Mostrar confirmación
            const confirmacion = await window.showConfirm(
                `¿Estás seguro de que quieres importar ${routinesToImport.length} rutina(s)?\n\n⚠️ ATENCIÓN: Esto AÑADIRÁ las rutinas a tu lista actual.`,
                'Importar rutinas'
            );
            
            if (!confirmacion) {
                event.target.value = '';
                return;
            }

            // Añadir las rutinas con nuevos IDs
            routinesToImport.forEach(imported => {
                const newRoutine = {
                    id: 'r-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
                    name: imported.name || 'Rutina importada',
                    sessions: (imported.sessions || []).map(session => ({
                        id: 's-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
                        title: session.title || 'Sesión sin título',
                        content: session.content || '',
                        lastModified: session.lastModified || Date.now()
                    }))
                };
                appData.routines.push(newRoutine);
            });

            saveData();
            renderRoutineList();
            window.showAlert(`Se importaron ${routinesToImport.length} rutina(s) correctamente.`, 'Importación completada');

        } catch (err) {
            window.showAlert('Error al leer el archivo: ' + err.message, 'Error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ==========================================================================
// BORRAR TODAS LAS RUTINAS
// ==========================================================================

async function borrarTodasRutinas() {
    if (appData.routines.length === 0) {
        window.showAlert('No hay rutinas para borrar.', 'Aviso');
        return;
    }

    const confirm = await window.showConfirm(
        `¿Estás seguro de que quieres eliminar TODAS las ${appData.routines.length} rutinas?\n\n⚠️ Esta acción no se puede deshacer.`,
        'Borrar todas las rutinas'
    );
    
    if (!confirm) return;

    appData.routines = [];
    saveData();
    renderRoutineList();
    window.showAlert(`Se han eliminado todas las rutinas.`, 'Eliminado');
}

// ==========================================================================
// UTILIDADES
// ==========================================================================

function getRoutineTimestamp() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}`;
}

// ==========================================================================
// CRUD DE RUTINAS (EXISTENTES)
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
window.toggleRoutineListOptionsMenu = toggleRoutineListOptionsMenu;
window.closeRoutineListOptionsMenu = closeRoutineListOptionsMenu;
window.exportAllRoutines = exportAllRoutines;
window.importRoutinesFromFile = importRoutinesFromFile;
window.borrarTodasRutinas = borrarTodasRutinas;
window.createNewRoutine = createNewRoutine;
window.moveRoutineOrder = moveRoutineOrder;
window.renameRoutine = renameRoutine;
window.copyWholeRoutine = copyWholeRoutine;
window.deleteRoutine = deleteRoutine;