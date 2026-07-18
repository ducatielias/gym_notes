<<<<<<< HEAD
/**
 * MÓDULO: history-edit.js
 * Controla la edición de registros del historial.
 * Permite modificar fecha, hora y contenido (con editor Quill).
 * 
 * FUNCIONALIDADES:
 * - Abrir edición desde el detalle del historial.
 * - Renderizar formulario con fecha, hora y editor Quill.
 * - Guardar cambios en localStorage y reordenar por fecha.
 * - Cancelar edición sin guardar.
 * 
 * MODIFICADO: Añadida función openHistoryEditFromDetail()
 */

// ==========================================================================
// VARIABLES GLOBALES
// ==========================================================================

let historyEditingId = null;
let historyEditQuillInstance = null;
let historyEditOriginalItem = null;

// ==========================================================================
// ABRIR EDICIÓN DEL HISTORIAL
// ==========================================================================

function openHistoryEdit(id) {
    console.log('[history-edit] Abriendo edición para ID:', id);
    
    const item = getHistoryRecord(id);
    if (!item) {
        window.showAlert('Registro no encontrado.', 'Error');
        return;
    }
    
    historyEditingId = id;
    historyEditOriginalItem = JSON.parse(JSON.stringify(item)); // Copia para cancelar
    
    const container = document.getElementById('history-detail-ui');
    if (!container) return;
    
    renderHistoryEdit(container, item);
    // No cambiamos de pestaña porque ya estamos en history-detail
}

// ==========================================================================
// RENDERIZAR FORMULARIO DE EDICIÓN
// ==========================================================================

function renderHistoryEdit(container, item) {
    const fecha = new Date(item.fecha);
    const fechaStr = fecha.toISOString().split('T')[0];
    const horaStr = fecha.toTimeString().split(' ')[0].substring(0, 5);
    
    const contenido = item.contenido_editado || item.contenido_original || '';
    const sessionName = GymNotesSafe.escapeText(item.nombre_sesion || 'Sesión sin título');
    const routineName = GymNotesSafe.escapeText(item.nombre_rutina || 'Sin rutina');
    
    container.innerHTML = `
        <div class="history-detail-container">
            <div class="history-detail-sticky-header">
                <div class="history-detail-nav-top">
                    <button class="btn-history-detail-close" onclick="cancelHistoryEdit()" title="Cancelar">
                        <i class="fa-solid fa-chevron-left"></i>
                    </button>
                    <button class="btn-history-detail-save" onclick="saveHistoryEdit()" title="Guardar cambios">
                        <i class="fa-solid fa-floppy-disk"></i> Guardar
                    </button>
                </div>

                <div class="history-detail-title-row">
                    <span class="history-detail-prefix">Editando entrenamiento</span>
                    <div class="history-detail-title" style="font-size:18px;">${sessionName}</div>
                    <div class="history-detail-meta" style="font-size:13px; color:#9ca3af;">
                        <i class="fa-solid fa-dumbbell"></i> ${routineName}
                    </div>
                </div>
            </div>

            <div class="history-detail-body">
                <!-- FECHA Y HORA -->
                <div class="history-edit-datetime-row">
                    <div class="history-edit-field">
                        <label for="history-edit-date">Fecha</label>
                        <input type="date" id="history-edit-date" value="${fechaStr}" class="history-edit-input">
                    </div>
                    <div class="history-edit-field">
                        <label for="history-edit-time">Hora</label>
                        <input type="time" id="history-edit-time" value="${horaStr}" class="history-edit-input">
                    </div>
                </div>

                <!-- EDITOR QUILL PARA EL CONTENIDO -->
                <div style="margin-top: 16px;">
                    <label style="display:block; font-size:14px; font-weight:700; color:#4b5563; margin-bottom:6px;">Anotaciones</label>
                    <div id="history-edit-editor-container" style="height: 300px; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: white;"></div>
                </div>

                <!-- CONTENIDO ORIGINAL (referencia) -->
                ${item.contenido_original && item.contenido_original !== item.contenido_editado ? `
                    <div class="history-detail-original" style="margin-top: 20px;">
                        <div class="history-detail-original-label">
                            <i class="fa-solid fa-file-lines"></i> Contenido original
                        </div>
                        <div class="history-detail-original-content" style="font-size:13px; color:#6b7280; max-height:150px; overflow-y:auto;">
                            ${linkifyHistoryHTML(item.contenido_original)}
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    // ============================================================
    // INICIALIZAR QUILL EN EL CONTENEDOR
    // ============================================================
    setTimeout(() => {
        const editorContainer = document.getElementById('history-edit-editor-container');
        if (!editorContainer) {
            console.error('[history-edit] Contenedor del editor no encontrado');
            return;
        }
        
        // Destruir instancia anterior si existe
        if (historyEditQuillInstance) {
            historyEditQuillInstance = null;
        }
        
        // Crear nueva instancia de Quill
        historyEditQuillInstance = new Quill(editorContainer, {
            theme: 'snow',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['clean']
                ]
            },
            placeholder: 'Edita tus anotaciones...'
        });
        
        // Cargar el contenido existente
        if (contenido) {
            historyEditQuillInstance.clipboard.dangerouslyPasteHTML(GymNotesSafe.sanitizeRichHtml(contenido));
        }
        
        // Habilitar edición
        historyEditQuillInstance.enable();
        historyEditQuillInstance.focus();
        
        console.log('[history-edit] Quill inicializado correctamente');
    }, 100);
}

// ==========================================================================
// GUARDAR EDICIÓN
// ==========================================================================

function saveHistoryEdit() {
    console.log('[history-edit] Guardando cambios...');
    
    // Validar que tenemos un ID
    if (!historyEditingId) {
        window.showAlert('No hay registro en edición.', 'Error');
        return;
    }
    
    // Obtener el registro actual
    const item = getHistoryRecord(historyEditingId);
    if (!item) {
        window.showAlert('Registro no encontrado.', 'Error');
        return;
    }
    
    // Obtener fecha y hora
    const dateInput = document.getElementById('history-edit-date');
    const timeInput = document.getElementById('history-edit-time');
    
    if (!dateInput || !timeInput) {
        window.showAlert('Error: Campos de fecha/hora no encontrados.', 'Error');
        return;
    }
    
    const dateStr = dateInput.value;
    const timeStr = timeInput.value;
    
    if (!dateStr || !timeStr) {
        window.showAlert('Por favor, completa la fecha y hora.', 'Campos incompletos');
        return;
    }
    
    // Construir nueva fecha
    const newFecha = new Date(`${dateStr}T${timeStr}:00`);
    if (isNaN(newFecha.getTime())) {
        window.showAlert('Fecha u hora inválida.', 'Error');
        return;
    }
    
    // Obtener contenido del editor Quill
    let nuevoContenido = '';
    if (historyEditQuillInstance) {
        nuevoContenido = historyEditQuillInstance.getSemanticHTML();
    }
    
    // Si no hay contenido, usar el original como fallback
    if (!nuevoContenido || nuevoContenido.trim() === '') {
        nuevoContenido = item.contenido_original || '';
    }
    
    // Actualizar el registro
    const updatedItem = {
        ...item,
        fecha: newFecha.getTime(),
        contenido_editado: nuevoContenido,
        timestamp_fin: newFecha.toISOString()
    };
    
=======
/**
 * MÓDULO: history-edit.js
 * Controla la edición de registros del historial.
 * Permite modificar fecha, hora y contenido (con editor Quill).
 * 
 * FUNCIONALIDADES:
 * - Abrir edición desde el detalle del historial.
 * - Renderizar formulario con fecha, hora y editor Quill.
 * - Guardar cambios en localStorage y reordenar por fecha.
 * - Cancelar edición sin guardar.
 * 
 * MODIFICADO: Añadida función openHistoryEditFromDetail()
 */

// ==========================================================================
// VARIABLES GLOBALES
// ==========================================================================

let historyEditingId = null;
let historyEditQuillInstance = null;
let historyEditOriginalItem = null;

// ==========================================================================
// ABRIR EDICIÓN DEL HISTORIAL
// ==========================================================================

function openHistoryEdit(id) {
    console.log('[history-edit] Abriendo edición para ID:', id);
    
    const item = getHistoryRecord(id);
    if (!item) {
        window.showAlert('Registro no encontrado.', 'Error');
        return;
    }
    
    historyEditingId = id;
    historyEditOriginalItem = JSON.parse(JSON.stringify(item)); // Copia para cancelar
    
    const container = document.getElementById('history-detail-ui');
    if (!container) return;
    
    renderHistoryEdit(container, item);
    // No cambiamos de pestaña porque ya estamos en history-detail
}

// ==========================================================================
// RENDERIZAR FORMULARIO DE EDICIÓN
// ==========================================================================

function renderHistoryEdit(container, item) {
    const fecha = new Date(item.fecha);
    const fechaStr = fecha.toISOString().split('T')[0];
    const horaStr = fecha.toTimeString().split(' ')[0].substring(0, 5);
    
    const contenido = item.contenido_editado || item.contenido_original || '';
    const sessionName = GymNotesSafe.escapeText(item.nombre_sesion || 'Sesión sin título');
    const routineName = GymNotesSafe.escapeText(item.nombre_rutina || 'Sin rutina');
    
    container.innerHTML = `
        <div class="history-detail-container">
            <div class="history-detail-sticky-header">
                <div class="history-detail-nav-top">
                    <button class="btn-history-detail-close" onclick="cancelHistoryEdit()" title="Cancelar">
                        <i class="fa-solid fa-chevron-left"></i>
                    </button>
                    <button class="btn-history-detail-save" onclick="saveHistoryEdit()" title="Guardar cambios">
                        <i class="fa-solid fa-floppy-disk"></i> Guardar
                    </button>
                </div>

                <div class="history-detail-title-row">
                    <span class="history-detail-prefix">Editando entrenamiento</span>
                    <div class="history-detail-title" style="font-size:18px;">${sessionName}</div>
                    <div class="history-detail-meta" style="font-size:13px; color:#9ca3af;">
                        <i class="fa-solid fa-dumbbell"></i> ${routineName}
                    </div>
                </div>
            </div>

            <div class="history-detail-body">
                <!-- FECHA Y HORA -->
                <div class="history-edit-datetime-row">
                    <div class="history-edit-field">
                        <label for="history-edit-date">Fecha</label>
                        <input type="date" id="history-edit-date" value="${fechaStr}" class="history-edit-input">
                    </div>
                    <div class="history-edit-field">
                        <label for="history-edit-time">Hora</label>
                        <input type="time" id="history-edit-time" value="${horaStr}" class="history-edit-input">
                    </div>
                </div>

                <!-- EDITOR QUILL PARA EL CONTENIDO -->
                <div style="margin-top: 16px;">
                    <label style="display:block; font-size:14px; font-weight:700; color:#4b5563; margin-bottom:6px;">Anotaciones</label>
                    <div id="history-edit-editor-container" style="height: 300px; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: white;"></div>
                </div>

                <!-- CONTENIDO ORIGINAL (referencia) -->
                ${item.contenido_original && item.contenido_original !== item.contenido_editado ? `
                    <div class="history-detail-original" style="margin-top: 20px;">
                        <div class="history-detail-original-label">
                            <i class="fa-solid fa-file-lines"></i> Contenido original
                        </div>
                        <div class="history-detail-original-content" style="font-size:13px; color:#6b7280; max-height:150px; overflow-y:auto;">
                            ${linkifyHistoryHTML(item.contenido_original)}
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    // ============================================================
    // INICIALIZAR QUILL EN EL CONTENEDOR
    // ============================================================
    setTimeout(() => {
        const editorContainer = document.getElementById('history-edit-editor-container');
        if (!editorContainer) {
            console.error('[history-edit] Contenedor del editor no encontrado');
            return;
        }
        
        // Destruir instancia anterior si existe
        if (historyEditQuillInstance) {
            historyEditQuillInstance = null;
        }
        
        // Crear nueva instancia de Quill
        historyEditQuillInstance = new Quill(editorContainer, {
            theme: 'snow',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['clean']
                ]
            },
            placeholder: 'Edita tus anotaciones...'
        });
        
        // Cargar el contenido existente
        if (contenido) {
            historyEditQuillInstance.clipboard.dangerouslyPasteHTML(GymNotesSafe.sanitizeRichHtml(contenido));
        }
        
        // Habilitar edición
        historyEditQuillInstance.enable();
        historyEditQuillInstance.focus();
        
        console.log('[history-edit] Quill inicializado correctamente');
    }, 100);
}

// ==========================================================================
// GUARDAR EDICIÓN
// ==========================================================================

function saveHistoryEdit() {
    console.log('[history-edit] Guardando cambios...');
    
    // Validar que tenemos un ID
    if (!historyEditingId) {
        window.showAlert('No hay registro en edición.', 'Error');
        return;
    }
    
    // Obtener el registro actual
    const item = getHistoryRecord(historyEditingId);
    if (!item) {
        window.showAlert('Registro no encontrado.', 'Error');
        return;
    }
    
    // Obtener fecha y hora
    const dateInput = document.getElementById('history-edit-date');
    const timeInput = document.getElementById('history-edit-time');
    
    if (!dateInput || !timeInput) {
        window.showAlert('Error: Campos de fecha/hora no encontrados.', 'Error');
        return;
    }
    
    const dateStr = dateInput.value;
    const timeStr = timeInput.value;
    
    if (!dateStr || !timeStr) {
        window.showAlert('Por favor, completa la fecha y hora.', 'Campos incompletos');
        return;
    }
    
    // Construir nueva fecha
    const newFecha = new Date(`${dateStr}T${timeStr}:00`);
    if (isNaN(newFecha.getTime())) {
        window.showAlert('Fecha u hora inválida.', 'Error');
        return;
    }
    
    // Obtener contenido del editor Quill
    let nuevoContenido = '';
    if (historyEditQuillInstance) {
        nuevoContenido = historyEditQuillInstance.getSemanticHTML();
    }
    
    // Si no hay contenido, usar el original como fallback
    if (!nuevoContenido || nuevoContenido.trim() === '') {
        nuevoContenido = item.contenido_original || '';
    }
    
    // Actualizar el registro
    const updatedItem = {
        ...item,
        fecha: newFecha.getTime(),
        contenido_editado: nuevoContenido,
        timestamp_fin: newFecha.toISOString()
    };
    
>>>>>>> a0e06567d66fb0b2bcaca3a4ed517c8aee665a60
    // Actualizar el estado central del historial
    try {
        const historyDB = getHistory();
        const index = historyDB.findIndex(h => h.id === historyEditingId);
        
        if (index === -1) {
            window.showAlert('Registro no encontrado en la base de datos.', 'Error');
            return;
        }

        // Conserva el estado anterior si el servicio no puede persistir el cambio.
        const previousHistory = [...historyDB];
        
        // Reemplazar el registro
        historyDB[index] = updatedItem;
<<<<<<< HEAD
        
        // Reordenar por fecha (más reciente primero)
        historyDB.sort((a, b) => b.fecha - a.fecha);
        
=======
        
        // Reordenar por fecha (más reciente primero)
        historyDB.sort((a, b) => b.fecha - a.fecha);
        
>>>>>>> a0e06567d66fb0b2bcaca3a4ed517c8aee665a60
        const persistenceResult = saveHistory();
        if (!persistenceResult.ok) {
            historyDB.splice(0, historyDB.length, ...previousHistory);
            console.error('[history-edit] Error al guardar:', persistenceResult);
            window.showAlert('Error al guardar los cambios: ' + (persistenceResult.error || persistenceResult.status), 'Error');
            return persistenceResult;
        }
        
        // Actualizar variable global
<<<<<<< HEAD
        if (window.historyDB !== undefined) {
            window.historyDB = historyDB;
        }
        
        console.log('[history-edit] Cambios guardados correctamente');
        
        // Limpiar estado de edición
        historyEditingId = null;
        historyEditOriginalItem = null;
        historyEditQuillInstance = null;
        
        // Volver a la lista de historial
        switchTab('history');
        renderHistory();
        
        window.showAlert('Entrenamiento actualizado correctamente.', 'Guardado');
        
    } catch (error) {
        console.error('[history-edit] Error al guardar:', error);
        window.showAlert('Error al guardar los cambios: ' + error.message, 'Error');
    }
}

// ==========================================================================
// CANCELAR EDICIÓN
// ==========================================================================

function cancelHistoryEdit() {
    console.log('[history-edit] Cancelando edición...');
    
    // Preguntar si está seguro de descartar cambios
    if (historyEditQuillInstance) {
        const contenidoActual = historyEditQuillInstance.getSemanticHTML();
        const contenidoOriginal = historyEditOriginalItem?.contenido_editado || historyEditOriginalItem?.contenido_original || '';
        
        if (contenidoActual !== contenidoOriginal) {
            window.showConfirm(
                '¿Seguro que quieres cancelar? Los cambios no guardados se perderán.',
                'Cancelar edición'
            ).then(confirm => {
                if (confirm) {
                    finalizarCancelacionEdicion();
                }
            });
            return;
        }
    }
    
    finalizarCancelacionEdicion();
}

function finalizarCancelacionEdicion() {
    // Limpiar instancia de Quill
    if (historyEditQuillInstance) {
        historyEditQuillInstance = null;
    }
    
    // Limpiar estado
    historyEditingId = null;
    historyEditOriginalItem = null;
    
    // Volver a la lista de historial
    switchTab('history');
    renderHistory();
    
    console.log('[history-edit] Edición cancelada');
}

// ==========================================================================
// FUNCIÓN PARA CERRAR EDICIÓN DESDE EL BOTÓN DE RETROCESO
// ==========================================================================

function closeHistoryEdit() {
    // Si hay una edición en curso, preguntar antes de cerrar
    if (historyEditingId) {
        cancelHistoryEdit();
    } else {
        switchTab('history');
        renderHistory();
    }
}

// ==========================================================================
// ABRIR EDICIÓN DESDE EL DETALLE DEL HISTORIAL
// ==========================================================================

function openHistoryEditFromDetail(id) {
    console.log('[history-edit] Abriendo edición desde el detalle para ID:', id);
    
    const item = getHistoryRecord(id);
    if (!item) {
        window.showAlert('Registro no encontrado.', 'Error');
        return;
    }
    
    historyEditingId = id;
    historyEditOriginalItem = JSON.parse(JSON.stringify(item)); // Copia para cancelar
    
    const container = document.getElementById('history-detail-ui');
    if (!container) return;
    
    renderHistoryEdit(container, item);
    // No cambiamos de pestaña porque ya estamos en history-detail
}

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.openHistoryEdit = openHistoryEdit;
window.openHistoryEditFromDetail = openHistoryEditFromDetail;
window.saveHistoryEdit = saveHistoryEdit;
window.cancelHistoryEdit = cancelHistoryEdit;
window.closeHistoryEdit = closeHistoryEdit;
=======
        if (window.historyDB !== undefined) {
            window.historyDB = historyDB;
        }
        
        console.log('[history-edit] Cambios guardados correctamente');
        
        // Limpiar estado de edición
        historyEditingId = null;
        historyEditOriginalItem = null;
        historyEditQuillInstance = null;
        
        // Volver a la lista de historial
        switchTab('history');
        renderHistory();
        
        window.showAlert('Entrenamiento actualizado correctamente.', 'Guardado');
        
    } catch (error) {
        console.error('[history-edit] Error al guardar:', error);
        window.showAlert('Error al guardar los cambios: ' + error.message, 'Error');
    }
}

// ==========================================================================
// CANCELAR EDICIÓN
// ==========================================================================

function cancelHistoryEdit() {
    console.log('[history-edit] Cancelando edición...');
    
    // Preguntar si está seguro de descartar cambios
    if (historyEditQuillInstance) {
        const contenidoActual = historyEditQuillInstance.getSemanticHTML();
        const contenidoOriginal = historyEditOriginalItem?.contenido_editado || historyEditOriginalItem?.contenido_original || '';
        
        if (contenidoActual !== contenidoOriginal) {
            window.showConfirm(
                '¿Seguro que quieres cancelar? Los cambios no guardados se perderán.',
                'Cancelar edición'
            ).then(confirm => {
                if (confirm) {
                    finalizarCancelacionEdicion();
                }
            });
            return;
        }
    }
    
    finalizarCancelacionEdicion();
}

function finalizarCancelacionEdicion() {
    // Limpiar instancia de Quill
    if (historyEditQuillInstance) {
        historyEditQuillInstance = null;
    }
    
    // Limpiar estado
    historyEditingId = null;
    historyEditOriginalItem = null;
    
    // Volver a la lista de historial
    switchTab('history');
    renderHistory();
    
    console.log('[history-edit] Edición cancelada');
}

// ==========================================================================
// FUNCIÓN PARA CERRAR EDICIÓN DESDE EL BOTÓN DE RETROCESO
// ==========================================================================

function closeHistoryEdit() {
    // Si hay una edición en curso, preguntar antes de cerrar
    if (historyEditingId) {
        cancelHistoryEdit();
    } else {
        switchTab('history');
        renderHistory();
    }
}

// ==========================================================================
// ABRIR EDICIÓN DESDE EL DETALLE DEL HISTORIAL
// ==========================================================================

function openHistoryEditFromDetail(id) {
    console.log('[history-edit] Abriendo edición desde el detalle para ID:', id);
    
    const item = getHistoryRecord(id);
    if (!item) {
        window.showAlert('Registro no encontrado.', 'Error');
        return;
    }
    
    historyEditingId = id;
    historyEditOriginalItem = JSON.parse(JSON.stringify(item)); // Copia para cancelar
    
    const container = document.getElementById('history-detail-ui');
    if (!container) return;
    
    renderHistoryEdit(container, item);
    // No cambiamos de pestaña porque ya estamos en history-detail
}

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.openHistoryEdit = openHistoryEdit;
window.openHistoryEditFromDetail = openHistoryEditFromDetail;
window.saveHistoryEdit = saveHistoryEdit;
window.cancelHistoryEdit = cancelHistoryEdit;
window.closeHistoryEdit = closeHistoryEdit;
>>>>>>> a0e06567d66fb0b2bcaca3a4ed517c8aee665a60
window.historyEditQuillInstance = historyEditQuillInstance;
