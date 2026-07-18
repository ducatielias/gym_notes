/**
 * MÓDULO: plan-sessions.js
 * Controla la visualización de sesiones dentro de una rutina y sus operaciones CRUD
 * 
 * MODIFICADO: Botón "+" reemplazado por menú de tres puntos con opciones:
 * Añadir sesión, Importar sesión, Exportar sesión (con checklist), Borrar todas
 * 
 * MODIFICADO: El texto "Modificado: fecha" se reemplaza por contador de días exactos
 * (Hoy, Ayer, Hace X días, Sin realizar)
 * 
 * CORRECCIÓN: Una sesión se considera "realizada" si existe un registro en el historial
 * con el mismo nombre de sesión y nombre de rutina.
 * 
 * MODIFICADO: Importación con selector de sesiones (checklist) igual que la exportación
 * MODIFICADO: Nombre de archivo exportado: GN_Sesiones_fecha_hora.json
 * 
 * MODIFICADO: Eliminado botón Asistente IA del menú de sesiones
 */

// ==========================================================================
// ABRIR UNA RUTINA Y VER SUS SESIONES
// ==========================================================================

function openRoutine(id) {
    currentRoutineId = id;
    const routine = appData.routines.find(r => r.id === id);
    const planUI = document.getElementById('plan-container');
    if (!planUI) return;

    const routineName = GymNotesSafe.escapeText(routine.name);

    planUI.innerHTML = `
        <header class="screen-header">
            <div class="header-nav-row">
                <button class="btn-back" onclick="renderRoutineList()">
                    <i class="fa-solid fa-chevron-left"></i> Volver
                </button>
                <div style="position:relative;">
                    <button class="btn-header-options" onclick="toggleSessionListOptionsMenu(event)" title="Opciones">
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                    <div class="session-list-options-menu hidden" id="sessionListOptionsMenu" onclick="event.stopPropagation()">
                        <button class="menu-item" onclick="createNewSession(); closeSessionListOptionsMenu();">
                            <i class="fa-solid fa-plus"></i> Añadir sesión
                        </button>
                        <div class="menu-divider"></div>
                        <button class="menu-item" onclick="abrirImportarSesiones(); closeSessionListOptionsMenu();">
                            <i class="fa-solid fa-file-import"></i> Importar sesión
                        </button>
                        <button class="menu-item" onclick="abrirExportarSesiones(); closeSessionListOptionsMenu();">
                            <i class="fa-solid fa-file-export"></i> Exportar sesión
                        </button>
                        <div class="menu-divider"></div>
                        <button class="menu-item menu-delete" onclick="borrarTodasSesiones(); closeSessionListOptionsMenu();" style="color:#ef4444;">
                            <i class="fa-solid fa-trash-can" style="color:#ef4444;"></i> Borrar todas
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <div class="plan-sessions-heading">
            <h2 class="plan-sessions-heading__title">${routineName}</h2>
        </div>

        <div id="sessions-list" class="cards-grid">
            ${routine.sessions.map((session, index) => {
                const resultado = calcularEstadoSesion(session, routine.name);
                const sessionIdAttribute = GymNotesSafe.escapeText(session.id);
                const sessionIdHandler = GymNotesSafe.escapeInlineHandlerArgument(session.id);
                const sessionTitle = GymNotesSafe.escapeText(session.title);
                return `
                    <div class="card card-session" onclick="openSessionEditor('${sessionIdHandler}')">
                        <div class="card-content">
                            <h3>${sessionTitle}</h3>
                            <p style="color: ${!resultado.realizada ? '#ef4444' : 'var(--text-muted)'};">${resultado.texto}</p>
                        </div>
                        
                        <button class="btn-session-options" onclick="toggleSessionMenu(event, '${sessionIdHandler}')">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>

                        <div class="session-menu-dropdown hidden" id="menu-${sessionIdAttribute}" onclick="event.stopPropagation()">
                            <button class="session-menu-item" onclick="moveSessionOrder('${sessionIdHandler}', -1)">
                                <i class="fa-solid fa-arrow-up"></i> Mover arriba
                            </button>
                            <button class="session-menu-item" onclick="moveSessionOrder('${sessionIdHandler}', 1)">
                                <i class="fa-solid fa-arrow-down"></i> Mover abajo
                            </button>
                            
                            <div class="routine-menu-divider"></div>
                            
                            <button class="session-menu-item" onclick="copySessionToRoutine('${sessionIdHandler}')">
                                <i class="fa-solid fa-clone"></i> Copiar sesión
                            </button>
                            <button class="session-menu-item" onclick="moveSessionToRoutine('${sessionIdHandler}')">
                                <i class="fa-solid fa-right-from-bracket"></i> Mover sesión
                            </button>
                            <button class="session-menu-item menu-delete" onclick="deleteSession('${sessionIdHandler}')">
                                <i class="fa-solid fa-trash-can"></i> Eliminar sesión
                            </button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>

        ${routine.sessions.length === 0 ? `
            <div class="empty-state">
                <p>Esta rutina no tiene sesiones.<br>¡Añade una ahora!</p>
            </div>
        ` : ''}
        
        <!-- Input oculto para importar sesión desde el menú de opciones -->
        <input type="file" id="file-import-session-list" style="display:none" accept=".json,.txt" onchange="procesarArchivoImportacionSesiones(event)">
    `;
}

// ==========================================================================
// CALCULAR ESTADO DE LA SESIÓN (basado en historial)
// ==========================================================================

function calcularEstadoSesion(session, routineName) {
    // Obtener el historial validado desde el estado central
    const historyDB = getHistory();
    
    // Buscar en el historial si existe un registro con este nombre de sesión y rutina
    const registroHistorial = historyDB.find(h => 
        h.nombre_sesion === session.title && 
        h.nombre_rutina === routineName
    );
    
    // Si no hay registro en el historial, la sesión no se ha realizado
    if (!registroHistorial) {
        return {
            realizada: false,
            texto: 'Sin realizar'
        };
    }
    
    // Si hay registro, calcular los días desde la fecha del historial
    const fechaHistorial = registroHistorial.fecha;
    if (!fechaHistorial) {
        return {
            realizada: true,
            texto: 'Sin fecha'
        };
    }
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const fecha = new Date(fechaHistorial);
    fecha.setHours(0, 0, 0, 0);
    
    const diffTime = hoy.getTime() - fecha.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    let texto = '';
    if (diffDays === 0) {
        texto = 'Hoy';
    } else if (diffDays === 1) {
        texto = 'Ayer';
    } else {
        texto = `Hace ${diffDays} días`;
    }
    
    return {
        realizada: true,
        texto: texto
    };
}

// ==========================================================================
// MENÚ DE OPCIONES DE LA LISTA DE SESIONES
// ==========================================================================

function toggleSessionListOptionsMenu(event) {
    event.stopPropagation();
    const menu = document.getElementById('sessionListOptionsMenu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
}

function closeSessionListOptionsMenu() {
    const menu = document.getElementById('sessionListOptionsMenu');
    if (menu) {
        menu.classList.add('hidden');
    }
}

// Cerrar el menú al hacer clic fuera
document.addEventListener('click', function() {
    const menu = document.getElementById('sessionListOptionsMenu');
    if (menu) {
        menu.classList.add('hidden');
    }
});

const sessionTransferOverlayAccessibility = (() => {
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
// EXPORTAR SESIONES CON CHECKLIST
// ==========================================================================

function abrirExportarSesiones() {
    const routine = appData.routines.find(r => r.id === currentRoutineId);
    if (!routine) {
        window.showAlert('No se encontró la rutina.', 'Error');
        return;
    }
    
    if (routine.sessions.length === 0) {
        window.showAlert('No hay sesiones para exportar.', 'Exportar');
        return;
    }
    
    // Crear el modal de exportación
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'export-sessions-modal';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '3000';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    overlay.style.backdropFilter = 'blur(4px)';
    overlay.style.webkitBackdropFilter = 'blur(4px)';
    
    // Construir la lista de sesiones con checkboxes
    let sesionesHtml = '';
    routine.sessions.forEach((session, index) => {
        const resultado = calcularEstadoSesion(session, routine.name);
        const isSinRealizar = !resultado.realizada;
        sesionesHtml += `
            <div style="display:flex; align-items:center; gap:12px; padding:10px 12px; border-bottom:1px solid #f3f4f6; cursor:pointer;" onclick="toggleSessionCheckbox('session-check-${index}')">
                <input type="checkbox" id="session-check-${index}" checked style="width:18px; height:18px; accent-color: var(--accent-color, #ccff00); cursor:pointer;">
                <label for="session-check-${index}" style="cursor:pointer; flex:1; font-size:14px; font-weight:500; color:#1f2937;">${GymNotesSafe.escapeText(session.title)}</label>
                <span style="font-size:11px; color: ${isSinRealizar ? '#ef4444' : '#9ca3af'};">${resultado.texto}</span>
            </div>
        `;
    });
    
    overlay.innerHTML = `
        <div class="modal-container" style="max-width: 400px; width: 90%; max-height: 80vh; display: flex; flex-direction: column;">
            <div class="modal-header">
                <span class="modal-icon"><i class="fa-solid fa-file-export"></i></span>
                <h3 style="margin:0; font-size:18px; font-weight:700;">Exportar sesiones</h3>
            </div>
            <div class="modal-body" style="flex:1; overflow-y:auto; padding: 16px 20px;">
                <p style="font-size:14px; color:#6b7280; margin-bottom:16px;">Selecciona las sesiones que deseas exportar:</p>
                <div style="display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap;">
                    <button onclick="seleccionarTodasSesiones(true)" style="padding:6px 14px; border:1px solid #e5e7eb; border-radius:8px; background:white; font-size:12px; font-weight:600; cursor:pointer; color:#4b5563;">
                        Seleccionar todas
                    </button>
                    <button onclick="seleccionarTodasSesiones(false)" style="padding:6px 14px; border:1px solid #e5e7eb; border-radius:8px; background:white; font-size:12px; font-weight:600; cursor:pointer; color:#4b5563;">
                        Deseleccionar todas
                    </button>
                </div>
                <div id="sesiones-checkbox-list">
                    ${sesionesHtml}
                </div>
            </div>
            <div class="modal-footer" style="padding:16px 20px 20px; display:flex; gap:12px; border-top:1px solid #f3f4f6;">
                <button onclick="cerrarExportarSesiones()" class="modal-btn modal-btn-secondary" style="flex:1; padding:12px; border:none; border-radius:12px; font-size:15px; font-weight:600; cursor:pointer; background:#f3f4f6; color:#4b5563;">
                    Cancelar
                </button>
                <button onclick="exportarSesionesSeleccionadas()" class="modal-btn modal-btn-primary" style="flex:2; padding:12px; border:none; border-radius:12px; font-size:15px; font-weight:600; cursor:pointer; background:var(--accent-color, #ccff00); color:var(--primary-color, #000000);">
                    <i class="fa-solid fa-file-export"></i> Exportar seleccionadas
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    sessionTransferOverlayAccessibility.setup(overlay, cerrarExportarSesiones);
}

function cerrarExportarSesiones() {
    const modal = document.getElementById('export-sessions-modal');
    if (modal) {
        sessionTransferOverlayAccessibility.cleanup(modal);
        modal.remove();
    }
}

function toggleSessionCheckbox(id) {
    const checkbox = document.getElementById(id);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
    }
}

function seleccionarTodasSesiones(seleccionar) {
    const checkboxes = document.querySelectorAll('#sesiones-checkbox-list input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = seleccionar;
    });
}

function exportarSesionesSeleccionadas() {
    const routine = appData.routines.find(r => r.id === currentRoutineId);
    if (!routine) {
        window.showAlert('No se encontró la rutina.', 'Error');
        cerrarExportarSesiones();
        return;
    }
    
    const checkboxes = document.querySelectorAll('#sesiones-checkbox-list input[type="checkbox"]');
    const indicesSeleccionados = [];
    checkboxes.forEach((cb, index) => {
        if (cb.checked) {
            indicesSeleccionados.push(index);
        }
    });
    
    if (indicesSeleccionados.length === 0) {
        window.showAlert('No has seleccionado ninguna sesión para exportar.', 'Aviso');
        return;
    }
    
    const sesionesSeleccionadas = indicesSeleccionados.map(idx => routine.sessions[idx]);
    
    const clean = {
        tipo: 'sesiones_export',
        fecha: new Date().toISOString(),
        rutina: routine.name,
        sesiones: sesionesSeleccionadas.map(session => ({
            id: session.id,
            title: session.title,
            content: session.content,
            lastModified: session.lastModified,
            createdAt: session.createdAt
        }))
    };
    
    const dataStr = JSON.stringify(clean, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GN_Sesiones_${getSessionTimestamp()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    cerrarExportarSesiones();
    window.showAlert(`${sesionesSeleccionadas.length} sesión(es) exportadas correctamente.`, 'Exportar');
}

// ==========================================================================
// IMPORTAR SESIONES CON SELECTOR (CHECKLIST)
// ==========================================================================

// Variable global para almacenar las sesiones del archivo importado
let sesionesArchivoImportado = [];
let nombreRutinaArchivoImportado = '';

function abrirImportarSesiones() {
    // Disparar el selector de archivos
    document.getElementById('file-import-session-list').click();
}

function procesarArchivoImportacionSesiones(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            let sessionsToImport = [];
            let nombreRutina = '';

            if (data.tipo === 'sesiones_export' && Array.isArray(data.sesiones)) {
                sessionsToImport = data.sesiones;
                nombreRutina = data.rutina || 'Rutina';
            } else if (Array.isArray(data) && data.length > 0 && data[0].title) {
                sessionsToImport = data;
            } else if (data.sesiones && Array.isArray(data.sesiones)) {
                sessionsToImport = data.sesiones;
            } else {
                throw new Error('El archivo no tiene un formato de sesiones válido.');
            }

            if (sessionsToImport.length === 0) {
                window.showAlert('No se encontraron sesiones en el archivo.', 'Aviso');
                return;
            }

            // Guardar las sesiones del archivo para usarlas en el modal
            sesionesArchivoImportado = sessionsToImport;
            nombreRutinaArchivoImportado = nombreRutina;

            // Mostrar el modal con el checklist
            mostrarModalImportacionSesiones(sessionsToImport, nombreRutina);

        } catch (err) {
            window.showAlert('Error al leer el archivo: ' + err.message, 'Error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function mostrarModalImportacionSesiones(sessionsToImport, nombreRutina) {
    // Crear el modal de importación
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'import-sessions-modal';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '3000';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    overlay.style.backdropFilter = 'blur(4px)';
    overlay.style.webkitBackdropFilter = 'blur(4px)';
    
    // Construir la lista de sesiones del archivo con checkboxes
    let sesionesHtml = '';
    sessionsToImport.forEach((session, index) => {
        const titulo = session.title || 'Sesión sin título';
        sesionesHtml += `
            <div style="display:flex; align-items:center; gap:12px; padding:10px 12px; border-bottom:1px solid #f3f4f6; cursor:pointer;" onclick="toggleSessionCheckboxImport('session-import-check-${index}')">
                <input type="checkbox" id="session-import-check-${index}" checked style="width:18px; height:18px; accent-color: var(--accent-color, #ccff00); cursor:pointer;">
                <label for="session-import-check-${index}" style="cursor:pointer; flex:1; font-size:14px; font-weight:500; color:#1f2937;">${GymNotesSafe.escapeText(titulo)}</label>
                ${session.lastModified ? `<span style="font-size:11px; color:#9ca3af;">${new Date(session.lastModified).toLocaleDateString('es-ES')}</span>` : ''}
            </div>
        `;
    });
    
    overlay.innerHTML = `
        <div class="modal-container" style="max-width: 400px; width: 90%; max-height: 80vh; display: flex; flex-direction: column;">
            <div class="modal-header">
                <span class="modal-icon"><i class="fa-solid fa-file-import"></i></span>
                <h3 style="margin:0; font-size:18px; font-weight:700;">Importar sesiones</h3>
            </div>
            <div class="modal-body" style="flex:1; overflow-y:auto; padding: 16px 20px;">
                <p style="font-size:14px; color:#6b7280; margin-bottom:4px;">Archivo: <strong>${GymNotesSafe.escapeText(nombreRutina || 'Sin nombre')}</strong></p>
                <p style="font-size:14px; color:#6b7280; margin-bottom:16px;">Selecciona las sesiones que deseas importar:</p>
                <div style="display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap;">
                    <button onclick="seleccionarTodasSesionesImport(true)" style="padding:6px 14px; border:1px solid #e5e7eb; border-radius:8px; background:white; font-size:12px; font-weight:600; cursor:pointer; color:#4b5563;">
                        Seleccionar todas
                    </button>
                    <button onclick="seleccionarTodasSesionesImport(false)" style="padding:6px 14px; border:1px solid #e5e7eb; border-radius:8px; background:white; font-size:12px; font-weight:600; cursor:pointer; color:#4b5563;">
                        Deseleccionar todas
                    </button>
                </div>
                <div id="sesiones-import-checkbox-list">
                    ${sesionesHtml}
                </div>
            </div>
            <div class="modal-footer" style="padding:16px 20px 20px; display:flex; gap:12px; border-top:1px solid #f3f4f6;">
                <button onclick="cerrarImportarSesiones()" class="modal-btn modal-btn-secondary" style="flex:1; padding:12px; border:none; border-radius:12px; font-size:15px; font-weight:600; cursor:pointer; background:#f3f4f6; color:#4b5563;">
                    Cancelar
                </button>
                <button onclick="importarSesionesSeleccionadas()" class="modal-btn modal-btn-primary" style="flex:2; padding:12px; border:none; border-radius:12px; font-size:15px; font-weight:600; cursor:pointer; background:var(--accent-color, #ccff00); color:var(--primary-color, #000000);">
                    <i class="fa-solid fa-file-import"></i> Importar seleccionadas
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    sessionTransferOverlayAccessibility.setup(overlay, cerrarImportarSesiones);
}

function cerrarImportarSesiones() {
    const modal = document.getElementById('import-sessions-modal');
    if (modal) {
        sessionTransferOverlayAccessibility.cleanup(modal);
        modal.remove();
    }
    // Limpiar variables
    sesionesArchivoImportado = [];
    nombreRutinaArchivoImportado = '';
}

function toggleSessionCheckboxImport(id) {
    const checkbox = document.getElementById(id);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
    }
}

function seleccionarTodasSesionesImport(seleccionar) {
    const checkboxes = document.querySelectorAll('#sesiones-import-checkbox-list input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = seleccionar;
    });
}

function importarSesionesSeleccionadas() {
    const routine = appData.routines.find(r => r.id === currentRoutineId);
    if (!routine) {
        window.showAlert('No se encontró la rutina destino.', 'Error');
        cerrarImportarSesiones();
        return;
    }
    
    const checkboxes = document.querySelectorAll('#sesiones-import-checkbox-list input[type="checkbox"]');
    const indicesSeleccionados = [];
    checkboxes.forEach((cb, index) => {
        if (cb.checked) {
            indicesSeleccionados.push(index);
        }
    });
    
    if (indicesSeleccionados.length === 0) {
        window.showAlert('No has seleccionado ninguna sesión para importar.', 'Aviso');
        return;
    }
    
    const sesionesSeleccionadas = indicesSeleccionados.map(idx => sesionesArchivoImportado[idx]);
    
    // Añadir las sesiones seleccionadas a la rutina actual
    const ahora = Date.now();
    sesionesSeleccionadas.forEach(imported => {
        const newSession = {
            id: 's-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            title: imported.title || 'Sesión importada',
            content: imported.content || '',
            lastModified: ahora,
            createdAt: imported.createdAt || ahora
        };
        routine.sessions.push(newSession);
    });

    saveData();
    openRoutine(currentRoutineId);
    cerrarImportarSesiones();
    
    window.showAlert(`${sesionesSeleccionadas.length} sesión(es) importadas correctamente.`, 'Importación completada');
}

// ==========================================================================
// BORRAR TODAS LAS SESIONES
// ==========================================================================

async function borrarTodasSesiones() {
    const routine = appData.routines.find(r => r.id === currentRoutineId);
    if (!routine) {
        window.showAlert('No se encontró la rutina.', 'Error');
        return;
    }
    
    if (routine.sessions.length === 0) {
        window.showAlert('No hay sesiones para borrar.', 'Aviso');
        return;
    }

    const confirm = await window.showConfirm(
        `¿Estás seguro de que quieres eliminar TODAS las ${routine.sessions.length} sesiones de "${routine.name}"?\n\n⚠️ Esta acción no se puede deshacer.`,
        'Borrar todas las sesiones'
    );
    
    if (!confirm) return;

    routine.sessions = [];
    saveData();
    openRoutine(currentRoutineId);
    window.showAlert(`Se han eliminado todas las sesiones.`, 'Eliminado');
}

// ==========================================================================
// UTILIDADES
// ==========================================================================

function getSessionTimestamp() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}`;
}

// ==========================================================================
// CRUD DE SESIONES (EXISTENTES)
// ==========================================================================

function createNewSession() {
    const routine = appData.routines.find(r => r.id === currentRoutineId);
    if (!routine) return;

    const now = Date.now();
    const newSession = {
        id: 's-' + Date.now(),
        title: 'Nueva Sesión',
        content: '',
        lastModified: now,
        createdAt: now
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

    const now = Date.now();
    const clonedSession = {
        id: 's-' + Date.now(),
        title: `${sessionToCopy.title} (Copia)`,
        content: sessionToCopy.content,
        lastModified: now,
        createdAt: now
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
window.toggleSessionListOptionsMenu = toggleSessionListOptionsMenu;
window.closeSessionListOptionsMenu = closeSessionListOptionsMenu;
window.abrirExportarSesiones = abrirExportarSesiones;
window.cerrarExportarSesiones = cerrarExportarSesiones;
window.toggleSessionCheckbox = toggleSessionCheckbox;
window.seleccionarTodasSesiones = seleccionarTodasSesiones;
window.exportarSesionesSeleccionadas = exportarSesionesSeleccionadas;
window.abrirImportarSesiones = abrirImportarSesiones;
window.procesarArchivoImportacionSesiones = procesarArchivoImportacionSesiones;
window.mostrarModalImportacionSesiones = mostrarModalImportacionSesiones;
window.cerrarImportarSesiones = cerrarImportarSesiones;
window.toggleSessionCheckboxImport = toggleSessionCheckboxImport;
window.seleccionarTodasSesionesImport = seleccionarTodasSesionesImport;
window.importarSesionesSeleccionadas = importarSesionesSeleccionadas;
window.borrarTodasSesiones = borrarTodasSesiones;
window.createNewSession = createNewSession;
window.moveSessionOrder = moveSessionOrder;
window.deleteSession = deleteSession;
window.copySessionToRoutine = copySessionToRoutine;
window.moveSessionToRoutine = moveSessionToRoutine;
window.calcularEstadoSesion = calcularEstadoSesion;
