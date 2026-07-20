/**
 * MÓDULO: plan-routines.js
 * Controla el listado de rutinas y sus operaciones CRUD
 * 
 * MODIFICADO: Botón "+" reemplazado por menú de tres puntos con opciones:
 * Añadir rutina, Importar rutina, Exportar rutina, Borrar todo
 * 
 * MODIFICADO: Exportación e importación con selector de rutinas (checklist)
 * MODIFICADO: Nombre de archivo exportado: GN_Rutinas_fecha_hora.json
 * 
 * MODIFICADO: Header con icono de aplicación, título y acciones de Rutinas.
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
        <header class="screen-header gn-screen-header">
            <div class="header-nav-row gn-screen-header__row">
                <div class="gn-header__leading">
                    <img class="gn-header__brand-icon" src="icons/icon-192x192.png" alt="Gym Notes" onerror="this.style.display='none'">
                    <h1>Rutinas</h1>
                </div>
                <div class="gn-header-actions">
                    <button class="btn-header-ia" onclick="openIAAssistant()" title="Asistente IA">
                        <i class="fa-solid fa-robot"></i>
                    </button>
                    <div class="routine-list-header__options">
                        <button class="btn-header-options gn-options-button" type="button" aria-label="Opciones" onclick="toggleRoutineListOptionsMenu(event)" title="Opciones">
                            <i class="fa-solid fa-ellipsis-vertical"></i>
                        </button>
                        <div class="routine-list-options-menu hidden" id="routineListOptionsMenu" onclick="event.stopPropagation()">
                            <button class="menu-item" onclick="createNewRoutine(); closeRoutineListOptionsMenu();">
                                <i class="fa-solid fa-plus"></i> Añadir rutina
                            </button>
                            <div class="menu-divider"></div>
                            <button class="menu-item" onclick="document.getElementById('file-import-routine-list').click(); closeRoutineListOptionsMenu();">
                                <i class="fa-solid fa-file-import"></i> Importar rutinas
                            </button>
                            <button class="menu-item" onclick="abrirExportarRutinas(); closeRoutineListOptionsMenu();">
                                <i class="fa-solid fa-file-export"></i> Exportar rutinas
                            </button>
                            <div class="menu-divider"></div>
                            <button class="menu-item menu-delete" onclick="borrarTodasRutinas(); closeRoutineListOptionsMenu();" style="color:#ef4444;">
                                <i class="fa-solid fa-trash-can" style="color:#ef4444;"></i> Borrar todas
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>

        <div id="routines-list" class="cards-grid">
            ${appData.routines.map((routine, index) => {
                const routineIdAttribute = GymNotesSafe.escapeText(routine.id);
                const routineIdHandler = GymNotesSafe.escapeInlineHandlerArgument(routine.id);
                const routineName = GymNotesSafe.escapeText(routine.name);
                return `
                <div class="card card-routine" onclick="openRoutine('${routineIdHandler}')">
                    <div class="card-content">
                        <h3>${routineName}</h3>
                        <p>${routine.sessions.length} sesiones creadas</p>
                    </div>
                    
                    <button class="btn-routine-options" onclick="toggleRoutineMenu(event, '${routineIdHandler}')">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>

                    <div class="routine-menu-dropdown hidden" id="menu-routine-${routineIdAttribute}" onclick="event.stopPropagation()">
                        <button class="routine-menu-item" onclick="moveRoutineOrder('${routineIdHandler}', -1)">
                            <i class="fa-solid fa-arrow-up"></i> Mover arriba
                        </button>
                        <button class="routine-menu-item" onclick="moveRoutineOrder('${routineIdHandler}', 1)">
                            <i class="fa-solid fa-arrow-down"></i> Mover abajo
                        </button>
                        
                        <div class="routine-menu-divider"></div>
                        
                        <button class="routine-menu-item" onclick="renameRoutine('${routineIdHandler}')">
                            <i class="fa-solid fa-pen"></i> Editar nombre
                        </button>
                        <button class="routine-menu-item" onclick="copyWholeRoutine('${routineIdHandler}')">
                            <i class="fa-solid fa-clone"></i> Copiar rutina
                        </button>
                        <button class="routine-menu-item menu-delete" onclick="deleteRoutine('${routineIdHandler}')">
                            <i class="fa-solid fa-trash-can"></i> Eliminar rutina
                        </button>
                    </div>
                </div>
            `;
            }).join('')}
        </div>

        ${appData.routines.length === 0 ? `
            <div class="empty-state">
                <p>No tienes rutinas todavía.<br>Crea la primera para empezar.</p>
            </div>
        ` : ''}
        
        <!-- Input oculto para importar rutina desde el menú de opciones -->
        <input type="file" id="file-import-routine-list" style="display:none" accept=".json,.txt" onchange="procesarArchivoImportacionRutinas(event)">
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

const routineTransferOverlayAccessibility = (() => {
    const overlayStates = new WeakMap();
    let instanceSequence = 0;
    const focusableSelector = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled]):not([type="hidden"])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[contenteditable="true"]',
        '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    function isFocusable(element) {
        if (
            !(element instanceof HTMLElement) ||
            !element.isConnected ||
            element.disabled ||
            element.closest('.hidden') ||
            element.getAttribute('aria-hidden') === 'true'
        ) {
            return false;
        }

        const computedStyle = window.getComputedStyle(element);
        return computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden';
    }

    function getFocusableElements(dialog) {
        return Array.from(dialog.querySelectorAll(focusableSelector)).filter(isFocusable);
    }

    function isCommonModalOpen() {
        const commonModal = document.getElementById('customModal');
        return commonModal && !commonModal.classList.contains('hidden');
    }

    function setup(overlay, closeOverlay) {
        const dialog = overlay.querySelector('.modal-container');
        const title = dialog?.querySelector('h3');
        if (!dialog || !title) return;

        const instanceId = `${overlay.id}-a11y-${++instanceSequence}`;
        const description = dialog.querySelector('.modal-body > p');
        const triggerElement = document.activeElement;

        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('tabindex', '-1');
        title.id = `${instanceId}-title`;
        dialog.setAttribute('aria-labelledby', title.id);

        if (description) {
            description.id = `${instanceId}-description`;
            dialog.setAttribute('aria-describedby', description.id);
        }

        const handleKeydown = (event) => {
            if (!overlay.isConnected || isCommonModalOpen()) return;

            if (event.key === 'Escape') {
                event.preventDefault();
                closeOverlay();
                return;
            }

            if (event.key !== 'Tab') return;

            const focusableElements = getFocusableElements(dialog);
            if (focusableElements.length === 0) {
                event.preventDefault();
                dialog.focus();
                return;
            }

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (!focusableElements.includes(document.activeElement)) {
                event.preventDefault();
                (event.shiftKey ? lastElement : firstElement).focus();
            } else if (event.shiftKey && document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            } else if (!event.shiftKey && document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        };

        overlayStates.set(overlay, { triggerElement, handleKeydown });
        document.addEventListener('keydown', handleKeydown);

        const focusableElements = getFocusableElements(dialog);
        const firstFormControl = focusableElements.find((element) => (
            ['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)
        ));
        (firstFormControl || focusableElements[0] || dialog).focus();
    }

    function cleanup(overlay) {
        const state = overlayStates.get(overlay);
        if (!state) return;

        document.removeEventListener('keydown', state.handleKeydown);
        overlayStates.delete(overlay);

        if (isFocusable(state.triggerElement)) {
            state.triggerElement.focus();
        }
    }

    return { setup, cleanup };
})();

// ==========================================================================
// EXPORTAR RUTINAS CON SELECTOR (CHECKLIST)
// ==========================================================================

// Variable global para almacenar las rutinas a exportar
let rutinasParaExportar = [];

function abrirExportarRutinas() {
    if (appData.routines.length === 0) {
        window.showAlert('No hay rutinas para exportar.', 'Exportar');
        return;
    }
    
    // Crear el modal de exportación
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'export-routines-modal';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '3000';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    overlay.style.backdropFilter = 'blur(4px)';
    overlay.style.webkitBackdropFilter = 'blur(4px)';
    
    // Construir la lista de rutinas con checkboxes
    let rutinasHtml = '';
    appData.routines.forEach((routine, index) => {
        rutinasHtml += `
            <div style="display:flex; align-items:center; gap:12px; padding:10px 12px; border-bottom:1px solid #f3f4f6; cursor:pointer;" onclick="toggleRoutineCheckboxExport('routine-export-check-${index}')">
                <input type="checkbox" id="routine-export-check-${index}" checked style="width:18px; height:18px; accent-color: var(--accent-color, #ccff00); cursor:pointer;">
                <label for="routine-export-check-${index}" style="cursor:pointer; flex:1; font-size:14px; font-weight:500; color:#1f2937;">${GymNotesSafe.escapeText(routine.name)}</label>
                <span style="font-size:11px; color:#9ca3af;">${routine.sessions.length} sesiones</span>
            </div>
        `;
    });
    
    overlay.innerHTML = `
        <div class="modal-container" style="max-width: 400px; width: 90%; max-height: 80vh; display: flex; flex-direction: column;">
            <div class="modal-header">
                <span class="modal-icon"><i class="fa-solid fa-file-export"></i></span>
                <h3 style="margin:0; font-size:18px; font-weight:700;">Exportar rutinas</h3>
            </div>
            <div class="modal-body" style="flex:1; overflow-y:auto; padding: 16px 20px;">
                <p style="font-size:14px; color:#6b7280; margin-bottom:16px;">Selecciona las rutinas que deseas exportar:</p>
                <div style="display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap;">
                    <button onclick="seleccionarTodasRutinasExport(true)" style="padding:6px 14px; border:1px solid #e5e7eb; border-radius:8px; background:white; font-size:12px; font-weight:600; cursor:pointer; color:#4b5563;">
                        Seleccionar todas
                    </button>
                    <button onclick="seleccionarTodasRutinasExport(false)" style="padding:6px 14px; border:1px solid #e5e7eb; border-radius:8px; background:white; font-size:12px; font-weight:600; cursor:pointer; color:#4b5563;">
                        Deseleccionar todas
                    </button>
                </div>
                <div id="rutinas-export-checkbox-list">
                    ${rutinasHtml}
                </div>
            </div>
            <div class="modal-footer" style="padding:16px 20px 20px; display:flex; gap:12px; border-top:1px solid #f3f4f6;">
                <button onclick="cerrarExportarRutinas()" class="modal-btn modal-btn-secondary" style="flex:1; padding:12px; border:none; border-radius:12px; font-size:15px; font-weight:600; cursor:pointer; background:#f3f4f6; color:#4b5563;">
                    Cancelar
                </button>
                <button onclick="exportarRutinasSeleccionadas()" class="modal-btn modal-btn-primary" style="flex:2; padding:12px; border:none; border-radius:12px; font-size:15px; font-weight:600; cursor:pointer; background:var(--accent-color, #ccff00); color:var(--primary-color, #000000);">
                    <i class="fa-solid fa-file-export"></i> Exportar seleccionadas
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    routineTransferOverlayAccessibility.setup(overlay, cerrarExportarRutinas);
}

function cerrarExportarRutinas() {
    const modal = document.getElementById('export-routines-modal');
    if (modal) {
        routineTransferOverlayAccessibility.cleanup(modal);
        modal.remove();
    }
    rutinasParaExportar = [];
}

function toggleRoutineCheckboxExport(id) {
    const checkbox = document.getElementById(id);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
    }
}

function seleccionarTodasRutinasExport(seleccionar) {
    const checkboxes = document.querySelectorAll('#rutinas-export-checkbox-list input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = seleccionar;
    });
}

function exportarRutinasSeleccionadas() {
    const checkboxes = document.querySelectorAll('#rutinas-export-checkbox-list input[type="checkbox"]');
    const indicesSeleccionados = [];
    checkboxes.forEach((cb, index) => {
        if (cb.checked) {
            indicesSeleccionados.push(index);
        }
    });
    
    if (indicesSeleccionados.length === 0) {
        window.showAlert('No has seleccionado ninguna rutina para exportar.', 'Aviso');
        return;
    }
    
    const rutinasSeleccionadas = indicesSeleccionados.map(idx => appData.routines[idx]);
    
    const clean = {
        tipo: 'rutinas_export',
        fecha: new Date().toISOString(),
        rutinas: rutinasSeleccionadas.map(routine => ({
            id: routine.id,
            name: routine.name,
            sessions: routine.sessions.map(session => ({
                id: session.id,
                title: session.title,
                content: session.content,
                lastModified: session.lastModified,
                createdAt: session.createdAt
            }))
        }))
    };
    
    const dataStr = JSON.stringify(clean, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GN_Rutinas_${getRoutineTimestamp()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    cerrarExportarRutinas();
    window.showAlert(`${rutinasSeleccionadas.length} rutina(s) exportadas correctamente.`, 'Exportar');
}

// ==========================================================================
// IMPORTAR RUTINAS CON SELECTOR (CHECKLIST)
// ==========================================================================

// Variables globales para almacenar las rutinas del archivo importado
let rutinasArchivoImportado = [];
let rutinasConNombresExistentes = [];

function procesarArchivoImportacionRutinas(event) {
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

            if (routinesToImport.length === 0) {
                window.showAlert('No se encontraron rutinas en el archivo.', 'Aviso');
                return;
            }

            // Validar toda la selección antes de mostrar acciones que puedan persistirla.
            const routinesValidation = validateAppDataStructure({ routines: routinesToImport });
            const invalidSessionIndex = routinesToImport.findIndex(routine => (
                routine && Array.isArray(routine.sessions) && routine.sessions.some(session => (
                    !session || Array.isArray(session) || typeof session !== 'object'
                ))
            ));
            if (!routinesValidation.valid || invalidSessionIndex >= 0) {
                throw new Error('El archivo contiene una estructura de rutinas o sesiones no válida.');
            }

            // Detectar qué rutinas ya existen en la aplicación.
            const nombresExistentes = new Set(appData.routines.map(r => r.name.toLowerCase().trim()));
            const rutinasConDuplicados = routinesToImport.filter(r => 
                nombresExistentes.has(String(r.name || 'Rutina sin nombre').toLowerCase().trim())
            );

            // Guardar las rutinas del archivo para usarlas en el modal
            rutinasArchivoImportado = routinesToImport;
            rutinasConNombresExistentes = rutinasConDuplicados.map(r => r.name);

            // Mostrar el modal con el checklist
            mostrarModalImportacionRutinas(routinesToImport, rutinasConDuplicados);

        } catch (err) {
            window.showAlert('Error al leer el archivo: ' + err.message, 'Error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function mostrarModalImportacionRutinas(routinesToImport, rutinasDuplicadas) {
    // Crear el modal de importación
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'import-routines-modal';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '3000';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    overlay.style.backdropFilter = 'blur(4px)';
    overlay.style.webkitBackdropFilter = 'blur(4px)';
    
    // Detectar nombres de rutinas existentes
    const nombresExistentes = new Set(appData.routines.map(r => r.name.toLowerCase().trim()));
    
    // Construir la lista de rutinas del archivo con checkboxes
    let rutinasHtml = '';
    routinesToImport.forEach((routine, index) => {
        const nombre = routine.name || 'Rutina sin nombre';
        const nombreExiste = nombresExistentes.has(nombre.toLowerCase().trim());
        const sesionesCount = (routine.sessions || []).length;
        
        rutinasHtml += `
            <div style="display:flex; align-items:center; gap:12px; padding:10px 12px; border-bottom:1px solid #f3f4f6; cursor:pointer;" onclick="toggleRoutineCheckboxImport('routine-import-check-${index}')">
                <input type="checkbox" id="routine-import-check-${index}" ${nombreExiste ? '' : 'checked'} style="width:18px; height:18px; accent-color: var(--accent-color, #ccff00); cursor:pointer;">
                <label for="routine-import-check-${index}" style="cursor:pointer; flex:1; font-size:14px; font-weight:500; color:#1f2937;">${GymNotesSafe.escapeText(nombre)}</label>
                <span style="font-size:11px; color:#9ca3af;">${sesionesCount} sesiones</span>
                ${nombreExiste ? `<span style="font-size:10px; color:#ef4444; background:#fef2f2; padding:2px 8px; border-radius:10px;">ya existe</span>` : ''}
            </div>
        `;
    });
    
    const duplicadosText = rutinasDuplicadas.length > 0 
        ? `<p style="font-size:13px; color:#ef4444; margin-top:4px;">⚠️ ${rutinasDuplicadas.length} rutina(s) ya existen en tu lista. Las que ya existen no se marcarán por defecto.</p>` 
        : '';
    
    overlay.innerHTML = `
        <div class="modal-container" style="max-width: 400px; width: 90%; max-height: 80vh; display: flex; flex-direction: column;">
            <div class="modal-header">
                <span class="modal-icon"><i class="fa-solid fa-file-import"></i></span>
                <h3 style="margin:0; font-size:18px; font-weight:700;">Importar rutinas</h3>
            </div>
            <div class="modal-body" style="flex:1; overflow-y:auto; padding: 16px 20px;">
                <p style="font-size:14px; color:#6b7280; margin-bottom:4px;">Archivo: <strong>${routinesToImport.length} rutina(s)</strong></p>
                ${duplicadosText}
                <p style="font-size:14px; color:#6b7280; margin-top:12px; margin-bottom:16px;">Selecciona las rutinas que deseas importar:</p>
                <div style="display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap;">
                    <button onclick="seleccionarTodasRutinasImport(true)" style="padding:6px 14px; border:1px solid #e5e7eb; border-radius:8px; background:white; font-size:12px; font-weight:600; cursor:pointer; color:#4b5563;">
                        Seleccionar todas
                    </button>
                    <button onclick="seleccionarTodasRutinasImport(false)" style="padding:6px 14px; border:1px solid #e5e7eb; border-radius:8px; background:white; font-size:12px; font-weight:600; cursor:pointer; color:#4b5563;">
                        Deseleccionar todas
                    </button>
                    <button onclick="seleccionarSoloNuevasImport()" style="padding:6px 14px; border:1px solid #e5e7eb; border-radius:8px; background:white; font-size:12px; font-weight:600; cursor:pointer; color:#4b5563;">
                        Solo nuevas
                    </button>
                </div>
                <div id="rutinas-import-checkbox-list">
                    ${rutinasHtml}
                </div>
            </div>
            <div class="modal-footer" style="padding:16px 20px 20px; display:flex; gap:12px; border-top:1px solid #f3f4f6;">
                <button onclick="cerrarImportarRutinas()" class="modal-btn modal-btn-secondary" style="flex:1; padding:12px; border:none; border-radius:12px; font-size:15px; font-weight:600; cursor:pointer; background:#f3f4f6; color:#4b5563;">
                    Cancelar
                </button>
                <button onclick="importarRutinasSeleccionadas()" class="modal-btn modal-btn-primary" style="flex:2; padding:12px; border:none; border-radius:12px; font-size:15px; font-weight:600; cursor:pointer; background:var(--accent-color, #ccff00); color:var(--primary-color, #000000);">
                    <i class="fa-solid fa-file-import"></i> Importar seleccionadas
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    routineTransferOverlayAccessibility.setup(overlay, cerrarImportarRutinas);
}

function cerrarImportarRutinas() {
    const modal = document.getElementById('import-routines-modal');
    if (modal) {
        routineTransferOverlayAccessibility.cleanup(modal);
        modal.remove();
    }
    // Limpiar variables
    rutinasArchivoImportado = [];
    rutinasConNombresExistentes = [];
}

function toggleRoutineCheckboxImport(id) {
    const checkbox = document.getElementById(id);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
    }
}

function seleccionarTodasRutinasImport(seleccionar) {
    const checkboxes = document.querySelectorAll('#rutinas-import-checkbox-list input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = seleccionar;
    });
}

function seleccionarSoloNuevasImport() {
    const checkboxes = document.querySelectorAll('#rutinas-import-checkbox-list input[type="checkbox"]');
    const nombresExistentes = new Set(appData.routines.map(r => r.name.toLowerCase().trim()));
    checkboxes.forEach((cb, index) => {
        const routine = rutinasArchivoImportado[index];
        if (routine) {
            const nombre = routine.name || 'Rutina sin nombre';
            const existe = nombresExistentes.has(nombre.toLowerCase().trim());
            cb.checked = !existe;
        }
    });
}

function importarRutinasSeleccionadas() {
    const checkboxes = document.querySelectorAll('#rutinas-import-checkbox-list input[type="checkbox"]');
    const indicesSeleccionados = [];
    checkboxes.forEach((cb, index) => {
        if (cb.checked) {
            indicesSeleccionados.push(index);
        }
    });
    
    if (indicesSeleccionados.length === 0) {
        window.showAlert('No has seleccionado ninguna rutina para importar.', 'Aviso');
        return;
    }
    
    const rutinasSeleccionadas = indicesSeleccionados.map(idx => rutinasArchivoImportado[idx]);
    
    // Detectar conflictos de nombres para mostrar advertencia
    const nombresExistentes = new Set(appData.routines.map(r => r.name.toLowerCase().trim()));
    const rutinasConConflicto = rutinasSeleccionadas.filter(r => 
        nombresExistentes.has((r.name || 'Rutina sin nombre').toLowerCase().trim())
    );
    const nextRoutines = [...appData.routines];
    
    // Añadir las rutinas seleccionadas a la aplicación
    let importadas = 0;
    let sobrescritas = 0;
    
    rutinasSeleccionadas.forEach(imported => {
        const nombreRutina = imported.name || 'Rutina importada';
        const nombreExistente = nextRoutines.find(r => r.name.toLowerCase().trim() === nombreRutina.toLowerCase().trim());
        
        if (nombreExistente) {
            // Si existe, añadir con un sufijo "(copia)"
            const newRoutine = {
                ...imported,
                id: 'r-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
                name: nombreRutina + ' (copia)',
                sessions: (imported.sessions || []).map(session => ({
                    ...session,
                    id: 's-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
                    title: session.title || 'Sesión sin título',
                    content: session.content || '',
                    lastModified: session.lastModified || Date.now(),
                    createdAt: session.createdAt || Date.now()
                }))
            };
            nextRoutines.push(newRoutine);
            importadas++;
        } else {
            const newRoutine = {
                ...imported,
                id: 'r-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
                name: nombreRutina,
                sessions: (imported.sessions || []).map(session => ({
                    ...session,
                    id: 's-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
                    title: session.title || 'Sesión sin título',
                    content: session.content || '',
                    lastModified: session.lastModified || Date.now(),
                    createdAt: session.createdAt || Date.now()
                }))
            };
            nextRoutines.push(newRoutine);
            importadas++;
        }
    });

    const previousRoutines = appData.routines;
    appData.routines = nextRoutines;
    const persistenceResult = saveData();
    if (!persistenceResult.ok) {
        appData.routines = previousRoutines;
        window.appData = appData;
        console.error('[plan-routines] No se pudieron importar las rutinas.', persistenceResult);
        window.showAlert(`No se pudieron importar las rutinas: ${persistenceResult.error || persistenceResult.status}.`, 'Error');
        return persistenceResult;
    }

    window.appData = appData;
    renderRoutineList();
    cerrarImportarRutinas();
    
    let mensaje = `${importadas} rutina(s) importadas correctamente.`;
    if (rutinasConConflicto.length > 0) {
        mensaje += `\n\n⚠️ ${rutinasConConflicto.length} rutina(s) ya existían y se han importado como copias.`;
    }
    window.showAlert(mensaje, 'Importación completada');
    return persistenceResult;
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
    let currentHistory;
    let nextAppData;
    let nextHistory;
    let actualizados = 0;

    try {
        currentHistory = getHistory();

        if (appDataPersistenceBlocked || historyDataPersistenceBlocked) {
            return {
                ok: false,
                status: 'persistence-blocked',
                key: appDataPersistenceBlocked ? APP_DATA_STORAGE_KEY : HISTORY_STORAGE_KEY,
                cause: appDataPersistenceBlocked ? appDataStorageIssue : historyDataStorageIssue,
                storageState: 'unchanged'
            };
        }

        // Se preparan copias independientes para no tocar memoria hasta que la
        // transacción haya persistido todas las claves de forma compensable.
        nextAppData = {
            ...appData,
            routines: appData.routines.map(item => item.id === routineId
                ? { ...item, name: newNameTrimmed }
                : item)
        };

        nextHistory = currentHistory.map(record => {
            if (record.nombre_rutina === oldName) {
                actualizados++;
                return { ...record, nombre_rutina: newNameTrimmed };
            }
            return record;
        });

        const appDataValidation = validateAppDataStructure(nextAppData);
        if (!appDataValidation.valid) {
            return {
                ok: false,
                status: appDataValidation.status,
                key: APP_DATA_STORAGE_KEY,
                validation: appDataValidation,
                storageState: 'unchanged'
            };
        }

        if (actualizados > 0) {
            const historyValidation = validateHistoryDataStructure(nextHistory);
            if (!historyValidation.valid) {
                return {
                    ok: false,
                    status: historyValidation.status,
                    key: HISTORY_STORAGE_KEY,
                    validation: historyValidation,
                    storageState: 'unchanged'
                };
            }
        }

        const changes = [{
            key: APP_DATA_STORAGE_KEY,
            value: nextAppData,
            schema: { type: 'object', requiredKeys: ['routines'] }
        }];

        if (actualizados > 0) {
            changes.push({
                key: HISTORY_STORAGE_KEY,
                value: nextHistory,
                schema: { type: 'array' }
            });
        }

        const preparedChanges = GymNotesStorage.prepareJsonChanges(changes);
        if (!preparedChanges.ok) {
            return preparedChanges;
        }

        const persistenceResult = GymNotesStorage.applyPreparedChanges(preparedChanges);
        if (!persistenceResult.ok) {
            console.error('[renameRoutine] Error persistiendo el renombrado de rutina:', persistenceResult);
            if (persistenceResult.status === GymNotesStorage.STATUS.ROLLBACK_FAILED && typeof window.showAlert === 'function') {
                await window.showAlert('No se pudo actualizar el historial. La rutina no se ha renombrado.', 'Error al guardar');
            }
            return persistenceResult;
        }

        appData.routines = nextAppData.routines;
        window.appData = appData;

        if (actualizados > 0) {
            currentHistory.splice(0, currentHistory.length, ...nextHistory);
            window.historyDB = currentHistory;
        }

        console.log(`[renameRoutine] Historial actualizado: ${actualizados} registros modificados de "${oldName}" a "${newNameTrimmed}"`);

        if (actualizados > 0 && typeof window.showAlert === 'function') {
            await window.showAlert(`Rutina renombrada correctamente.\n${actualizados} registro(s) del historial actualizados.`, "Completado");
        }

        renderRoutineList();
        return persistenceResult;
    } catch (error) {
        console.error('[renameRoutine] Error preparando el renombrado de rutina:', error);
        return { ok: false, status: 'persistence-error', error: error instanceof Error ? error.message : String(error) };
    }
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
window.abrirExportarRutinas = abrirExportarRutinas;
window.cerrarExportarRutinas = cerrarExportarRutinas;
window.toggleRoutineCheckboxExport = toggleRoutineCheckboxExport;
window.seleccionarTodasRutinasExport = seleccionarTodasRutinasExport;
window.exportarRutinasSeleccionadas = exportarRutinasSeleccionadas;
window.procesarArchivoImportacionRutinas = procesarArchivoImportacionRutinas;
window.mostrarModalImportacionRutinas = mostrarModalImportacionRutinas;
window.cerrarImportarRutinas = cerrarImportarRutinas;
window.toggleRoutineCheckboxImport = toggleRoutineCheckboxImport;
window.seleccionarTodasRutinasImport = seleccionarTodasRutinasImport;
window.seleccionarSoloNuevasImport = seleccionarSoloNuevasImport;
window.importarRutinasSeleccionadas = importarRutinasSeleccionadas;
window.borrarTodasRutinas = borrarTodasRutinas;
window.createNewRoutine = createNewRoutine;
window.moveRoutineOrder = moveRoutineOrder;
window.renameRoutine = renameRoutine;
window.copyWholeRoutine = copyWholeRoutine;
window.deleteRoutine = deleteRoutine;
