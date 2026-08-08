/**
 * MÓDULO: data-import-export.js
 * Controla la importación y exportación de todos los datos de la aplicación.
 * 
 * FUNCIONALIDADES:
 * - Exportar datos (Rutinas, Historial, Ejercicios) con selector.
 * - Importar datos con selector de qué sobrescribir.
 * - Formato de archivo: GN_fecha_hora.json
 * - Confirmación antes de sobrescribir.
 * - Manejo de errores.
 * 
 * CORREGIDO: El modal de confirmación ya no se superpone al modal de selección.
 */

// ==========================================================================
// VARIABLES GLOBALES
// ==========================================================================

let importFileData = null;

const dataTransferOverlayAccessibility = (() => {
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
// FUNCIÓN: OBTENER TIMESTAMP PARA NOMBRE DE ARCHIVO
// ==========================================================================

function getDataTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}_${hours}-${minutes}`;
}

// ==========================================================================
// FUNCIÓN: OBTENER DATOS ACTUALES DE LA APP
// ==========================================================================

function cloneDataSnapshot(value, key) {
    try {
        return { ok: true, value: JSON.parse(JSON.stringify(value)) };
    } catch (error) {
        return {
            ok: false,
            status: GymNotesStorage.STATUS.SERIALIZATION_FAILED,
            key,
            error: error instanceof Error ? error.message : String(error),
            storageState: 'unchanged'
        };
    }
}

function createPersistenceBlockedResult(key, cause) {
    return {
        ok: false,
        status: 'persistence-blocked',
        key,
        cause,
        storageState: 'unchanged'
    };
}

function getCurrentAppData() {
    if (appDataPersistenceBlocked) {
        return createPersistenceBlockedResult(APP_DATA_STORAGE_KEY, appDataStorageIssue);
    }

    if (exercisesDataPersistenceBlocked) {
        return createPersistenceBlockedResult(EXERCISES_STORAGE_KEY, exercisesDataStorageIssue);
    }

    const currentHistory = getHistory();
    if (historyDataPersistenceBlocked) {
        return createPersistenceBlockedResult(HISTORY_STORAGE_KEY, historyDataStorageIssue);
    }

    const routinesSnapshot = cloneDataSnapshot(appData.routines, APP_DATA_STORAGE_KEY);
    const historySnapshot = cloneDataSnapshot(currentHistory, HISTORY_STORAGE_KEY);
    const exercisesSnapshot = cloneDataSnapshot(getExercises(), EXERCISES_STORAGE_KEY);
    const failedSnapshot = [routinesSnapshot, historySnapshot, exercisesSnapshot].find(snapshot => !snapshot.ok);

    if (failedSnapshot) {
        return failedSnapshot;
    }

    return {
        ok: true,
        data: {
            rutinas: routinesSnapshot.value,
            historial: historySnapshot.value,
            ejercicios: exercisesSnapshot.value
        }
    };
}

function showDataAccessError(result, action) {
    console.error(`[data-import-export] No se pudo ${action}.`, result);
    window.showAlert(`No se pudo ${action} porque uno de los datos almacenados no es válido.`, 'Error');
}

// ==========================================================================
// FUNCIÓN: EXPORTAR DATOS
// ==========================================================================

function openExportDataModal() {
    console.log('[data-import-export] Abriendo modal de exportación...');
    
    const currentDataResult = getCurrentAppData();
    if (!currentDataResult.ok) {
        showDataAccessError(currentDataResult, 'preparar la exportación');
        return;
    }

    const data = currentDataResult.data;
    const totalRutinas = data.rutinas.length;
    const totalHistorial = data.historial.length;
    const totalEjercicios = data.ejercicios.length;
    
    if (totalRutinas === 0 && totalHistorial === 0 && totalEjercicios === 0) {
        window.showAlert('No hay datos para exportar. La aplicación está vacía.', 'Aviso');
        return;
    }
    
    // Crear el modal de exportación
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'export-data-modal';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '3000';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    overlay.style.backdropFilter = 'blur(4px)';
    overlay.style.webkitBackdropFilter = 'blur(4px)';
    
    overlay.innerHTML = `
        <div class="modal-container" style="max-width: 400px; width: 90%; max-height: 80vh; display: flex; flex-direction: column;">
            <div class="modal-header">
                <span class="modal-icon"><i class="fa-solid fa-file-export"></i></span>
                <h3 style="margin:0; font-size:18px; font-weight:700;">Exportar datos</h3>
            </div>
            <div class="modal-body" style="flex:1; overflow-y:auto; padding: 16px 20px;">
                <p style="font-size:14px; color:#6b7280; margin-bottom:16px;">Selecciona los datos que deseas exportar:</p>
                
                <div style="display:flex; flex-direction:column; gap:12px;">
                    <label style="display:flex; align-items:center; gap:12px; padding:10px 14px; border:1px solid #e5e7eb; border-radius:12px; cursor:pointer; transition:background 0.15s ease;" 
                           onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background=''">
                        <input type="checkbox" id="export-rutinas" checked style="width:18px; height:18px; accent-color: var(--accent-color, #ccff00); cursor:pointer;">
                        <div style="flex:1;">
                            <div style="font-weight:600; font-size:15px; color:#1f2937;">Rutinas</div>
                            <div style="font-size:12px; color:#9ca3af;">${totalRutinas} rutina(s)</div>
                        </div>
                    </label>
                    
                    <label style="display:flex; align-items:center; gap:12px; padding:10px 14px; border:1px solid #e5e7eb; border-radius:12px; cursor:pointer; transition:background 0.15s ease;"
                           onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background=''">
                        <input type="checkbox" id="export-historial" checked style="width:18px; height:18px; accent-color: var(--accent-color, #ccff00); cursor:pointer;">
                        <div style="flex:1;">
                            <div style="font-weight:600; font-size:15px; color:#1f2937;">Historial</div>
                            <div style="font-size:12px; color:#9ca3af;">${totalHistorial} registro(s)</div>
                        </div>
                    </label>
                    
                    <label style="display:flex; align-items:center; gap:12px; padding:10px 14px; border:1px solid #e5e7eb; border-radius:12px; cursor:pointer; transition:background 0.15s ease;"
                           onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background=''">
                        <input type="checkbox" id="export-ejercicios" checked style="width:18px; height:18px; accent-color: var(--accent-color, #ccff00); cursor:pointer;">
                        <div style="flex:1;">
                            <div style="font-weight:600; font-size:15px; color:#1f2937;">Ejercicios</div>
                            <div style="font-size:12px; color:#9ca3af;">${totalEjercicios} ejercicio(s)</div>
                        </div>
                    </label>
                </div>
                
                <div style="margin-top:16px; padding:12px; background:#f3f4f6; border-radius:10px; font-size:12px; color:#6b7280;">
                    <i class="fa-solid fa-info-circle"></i> El archivo se guardará como: <strong>GN_fecha_hora.json</strong>
                </div>
            </div>
            <div class="modal-footer" style="padding:16px 20px 20px; display:flex; gap:12px; border-top:1px solid #f3f4f6;">
                <button onclick="cerrarExportDataModal()" class="modal-btn modal-btn-secondary" style="flex:1; padding:12px; border:none; border-radius:12px; font-size:15px; font-weight:600; cursor:pointer; background:#f3f4f6; color:#4b5563;">
                    Cancelar
                </button>
                <button onclick="exportData()" class="modal-btn modal-btn-primary" style="flex:2; padding:12px; border:none; border-radius:12px; font-size:15px; font-weight:600; cursor:pointer; background:var(--accent-color, #ccff00); color:var(--primary-color, #000000);">
                    <i class="fa-solid fa-file-export"></i> Exportar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    dataTransferOverlayAccessibility.setup(overlay, cerrarExportDataModal);
}

function cerrarExportDataModal() {
    const modal = document.getElementById('export-data-modal');
    if (modal) {
        dataTransferOverlayAccessibility.cleanup(modal);
        modal.remove();
    }
}

function exportData() {
    const exportRutinas = document.getElementById('export-rutinas')?.checked || false;
    const exportHistorial = document.getElementById('export-historial')?.checked || false;
    const exportEjercicios = document.getElementById('export-ejercicios')?.checked || false;
    
    if (!exportRutinas && !exportHistorial && !exportEjercicios) {
        window.showAlert('Selecciona al menos un tipo de datos para exportar.', 'Aviso');
        return;
    }
    
    const currentDataResult = getCurrentAppData();
    if (!currentDataResult.ok) {
        showDataAccessError(currentDataResult, 'exportar los datos');
        return;
    }

    const allData = currentDataResult.data;
    const exportData = {};
    
    if (exportRutinas) exportData.rutinas = allData.rutinas;
    if (exportHistorial) exportData.historial = allData.historial;
    if (exportEjercicios) exportData.ejercicios = allData.ejercicios;
    
    // Añadir metadatos
    const exportPackage = {
        version: '1.0',
        fecha_exportacion: new Date().toISOString(),
        tipo_exportacion: 'gym_notes_backup',
        datos: exportData
    };
    
    // Crear y descargar el archivo
    const dataStr = JSON.stringify(exportPackage, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GN_${getDataTimestamp()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    cerrarExportDataModal();
    
    const tipos = [];
    if (exportRutinas) tipos.push('rutinas');
    if (exportHistorial) tipos.push('historial');
    if (exportEjercicios) tipos.push('ejercicios');
    
    window.showAlert(`Exportación completada.\nDatos exportados: ${tipos.join(', ')}`, 'Exportar');
}

// ==========================================================================
// FUNCIÓN: IMPORTAR DATOS
// ==========================================================================

function openImportDataModal() {
    console.log('[data-import-export] Abriendo selector de archivos para importar...');
    
    // Crear input de archivo oculto
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,.txt';
    fileInput.style.display = 'none';
    fileInput.onchange = function(event) {
        const file = event.target.files[0];
        if (file) {
            processImportFile(file);
        }
        this.remove();
    };
    document.body.appendChild(fileInput);
    fileInput.click();
}

/**
 * Identifica el tipo de intercambio por su estructura mínima, no por el
 * nombre del archivo. Esta función no valida los datos de dominio: esa
 * responsabilidad sigue perteneciendo a cada importador existente.
 */
function detectUniversalImportType(data) {
    const isObject = data !== null && typeof data === 'object' && !Array.isArray(data);
    const detectedTypes = [];

    if (isObject && data.datos !== null && typeof data.datos === 'object' && !Array.isArray(data.datos)) {
        detectedTypes.push('backup');
    }

    if (Array.isArray(data) && data.length > 0) {
        const firstItem = data[0];
        const isItemObject = firstItem !== null && typeof firstItem === 'object' && !Array.isArray(firstItem);

        if (isItemObject && firstItem.fecha && firstItem.nombre_sesion && firstItem.nombre_rutina) {
            detectedTypes.push('historial');
        }

        if (isItemObject && firstItem.nombre) {
            detectedTypes.push('ejercicios');
        }

        if (isItemObject && firstItem.name) {
            detectedTypes.push('rutinas');
        }
    }

    if (isObject && data.tipo === 'ejercicios_export' && Array.isArray(data.ejercicios)) {
        detectedTypes.push('ejercicios');
    }

    if (isObject && data.ejercicio && typeof data.ejercicio === 'object' && data.ejercicio.nombre) {
        detectedTypes.push('ejercicios');
    }

    if (isObject && Array.isArray(data.rutinas)) {
        detectedTypes.push('rutinas');
    }

    const uniqueTypes = [...new Set(detectedTypes)];
    if (uniqueTypes.length === 1) {
        return { ok: true, type: uniqueTypes[0] };
    }

    if (uniqueTypes.length > 1) {
        return {
            ok: false,
            error: 'El archivo contiene estructuras de importación incompatibles entre sí. No se ha importado ningún dato.'
        };
    }

    return {
        ok: false,
        error: 'El archivo no corresponde a un backup, historial, ejercicios ni rutinas compatibles con GymNotes.'
    };
}

/**
 * Conserva los importadores de cada dominio sin crear un segundo flujo de
 * validación o persistencia. Cada uno sigue leyendo y tratando el archivo
 * con sus confirmaciones, selectores y reglas actuales.
 */
function delegateUniversalImport(file, importType) {
    const importHandlers = {
        historial: window.importHistoryFromFile,
        ejercicios: window.importExercisesFromFile,
        rutinas: window.procesarArchivoImportacionRutinas
    };
    const importHandler = importHandlers[importType];

    if (typeof importHandler !== 'function') {
        throw new Error('El importador seleccionado no está disponible. Recarga la aplicación e inténtalo de nuevo.');
    }

    importHandler({
        target: {
            files: [file],
            value: ''
        }
    });
}

/** Prepara el backup global con la misma validación y selector previos. */
function processGlobalBackupImport(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data) || !data.datos || typeof data.datos !== 'object' || Array.isArray(data.datos)) {
        throw new Error('El archivo no tiene el formato esperado. Falta la propiedad "datos".');
    }

    const hasRutinas = Array.isArray(data.datos.rutinas) && data.datos.rutinas.length > 0;
    const hasHistorial = Array.isArray(data.datos.historial) && data.datos.historial.length > 0;
    const hasEjercicios = Array.isArray(data.datos.ejercicios) && data.datos.ejercicios.length > 0;

    if (!hasRutinas && !hasHistorial && !hasEjercicios) {
        throw new Error('El archivo no contiene datos válidos (rutinas, historial o ejercicios).');
    }

    importFileData = data.datos;
    showImportSelectionModal(data.datos, data.fecha_exportacion || '');
}

function processImportFile(file) {
    console.log('[data-import-export] Procesando archivo:', file.name);
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            const detection = detectUniversalImportType(data);

            if (!detection.ok) {
                throw new Error(detection.error);
            }

            if (detection.type === 'backup') {
                processGlobalBackupImport(data);
                return;
            }

            delegateUniversalImport(file, detection.type);
        } catch (error) {
            importFileData = null;
            console.error('[data-import-export] Error al leer el archivo:', error);
            window.showAlert('Error al leer el archivo: ' + error.message, 'Error');
        }
    };
    reader.onerror = function() {
        importFileData = null;
        window.showAlert('Error al leer el archivo.', 'Error');
    };
    reader.readAsText(file);
}

function showImportSelectionModal(data, fechaExportacion) {
    console.log('[data-import-export] Mostrando selector de importación...');
    
    const totalRutinas = Array.isArray(data.rutinas) ? data.rutinas.length : 0;
    const totalHistorial = Array.isArray(data.historial) ? data.historial.length : 0;
    const totalEjercicios = Array.isArray(data.ejercicios) ? data.ejercicios.length : 0;
    
    // Crear el modal de importación
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'import-data-modal';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '3000';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    overlay.style.backdropFilter = 'blur(4px)';
    overlay.style.webkitBackdropFilter = 'blur(4px)';
    
    const fechaTexto = fechaExportacion ? ` (Exportado: ${new Date(fechaExportacion).toLocaleString('es-ES')})` : '';
    
    overlay.innerHTML = `
        <div class="modal-container" style="max-width: 400px; width: 90%; max-height: 80vh; display: flex; flex-direction: column;">
            <div class="modal-header">
                <span class="modal-icon"><i class="fa-solid fa-file-import"></i></span>
                <h3 style="margin:0; font-size:18px; font-weight:700;">Importar datos</h3>
            </div>
            <div class="modal-body" style="flex:1; overflow-y:auto; padding: 16px 20px;">
                <p style="font-size:14px; color:#6b7280; margin-bottom:4px;">Selecciona los datos que deseas importar${fechaTexto}</p>
                <p style="font-size:13px; color:#ef4444; margin-bottom:16px;">⚠️ Los datos seleccionados SOBRESCRIBIRÁN los actuales.</p>
                
                <div style="display:flex; flex-direction:column; gap:12px;">
                    <label style="display:flex; align-items:center; gap:12px; padding:10px 14px; border:1px solid #e5e7eb; border-radius:12px; cursor:pointer; transition:background 0.15s ease;"
                           onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background=''">
                        <input type="checkbox" id="import-rutinas" ${totalRutinas > 0 ? 'checked' : 'disabled'} style="width:18px; height:18px; accent-color: var(--accent-color, #ccff00); cursor:pointer;">
                        <div style="flex:1;">
                            <div style="font-weight:600; font-size:15px; color:#1f2937;">Rutinas</div>
                            <div style="font-size:12px; color:#9ca3af;">${totalRutinas} rutina(s)</div>
                        </div>
                    </label>
                    
                    <label style="display:flex; align-items:center; gap:12px; padding:10px 14px; border:1px solid #e5e7eb; border-radius:12px; cursor:pointer; transition:background 0.15s ease;"
                           onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background=''">
                        <input type="checkbox" id="import-historial" ${totalHistorial > 0 ? 'checked' : 'disabled'} style="width:18px; height:18px; accent-color: var(--accent-color, #ccff00); cursor:pointer;">
                        <div style="flex:1;">
                            <div style="font-weight:600; font-size:15px; color:#1f2937;">Historial</div>
                            <div style="font-size:12px; color:#9ca3af;">${totalHistorial} registro(s)</div>
                        </div>
                    </label>
                    
                    <label style="display:flex; align-items:center; gap:12px; padding:10px 14px; border:1px solid #e5e7eb; border-radius:12px; cursor:pointer; transition:background 0.15s ease;"
                           onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background=''">
                        <input type="checkbox" id="import-ejercicios" ${totalEjercicios > 0 ? 'checked' : 'disabled'} style="width:18px; height:18px; accent-color: var(--accent-color, #ccff00); cursor:pointer;">
                        <div style="flex:1;">
                            <div style="font-weight:600; font-size:15px; color:#1f2937;">Ejercicios</div>
                            <div style="font-size:12px; color:#9ca3af;">${totalEjercicios} ejercicio(s)</div>
                        </div>
                    </label>
                </div>
            </div>
            <div class="modal-footer" style="padding:16px 20px 20px; display:flex; gap:12px; border-top:1px solid #f3f4f6;">
                <button onclick="cerrarImportDataModal()" class="modal-btn modal-btn-secondary" style="flex:1; padding:12px; border:none; border-radius:12px; font-size:15px; font-weight:600; cursor:pointer; background:#f3f4f6; color:#4b5563;">
                    Cancelar
                </button>
                <button onclick="importData()" class="modal-btn modal-btn-primary" style="flex:2; padding:12px; border:none; border-radius:12px; font-size:15px; font-weight:600; cursor:pointer; background:var(--accent-color, #ccff00); color:var(--primary-color, #000000);">
                    <i class="fa-solid fa-file-import"></i> Importar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    dataTransferOverlayAccessibility.setup(overlay, cerrarImportDataModal);
}

function cerrarImportDataModal() {
    const modal = document.getElementById('import-data-modal');
    if (modal) {
        dataTransferOverlayAccessibility.cleanup(modal);
        modal.remove();
    }
    // No limpiamos importFileData aquí para que pueda usarse después si el usuario confirma
}

function createImportValidationFailure(key, validation) {
    return {
        ok: false,
        status: GymNotesStorage.STATUS.VALIDATION_FAILED,
        key,
        validation,
        storageState: 'unchanged'
    };
}

function prepareGlobalImport(importRutinas, importHistorial, importEjercicios) {
    if (!importRutinas && !importHistorial && !importEjercicios) {
        return {
            ok: false,
            status: GymNotesStorage.STATUS.INVALID_OPERATION,
            error: 'No se ha seleccionado ningún conjunto de datos para importar.',
            storageState: 'unchanged'
        };
    }

    if (!importFileData || typeof importFileData !== 'object' || Array.isArray(importFileData)) {
        return {
            ok: false,
            status: GymNotesStorage.STATUS.INVALID_OPERATION,
            error: 'No hay un paquete de importación válido preparado.',
            storageState: 'unchanged'
        };
    }

    const changes = [];
    const importedTypes = [];
    let nextAppData;
    let nextExercisesData;
    let nextHistory;
    let currentHistory;

    if (importRutinas) {
        if (appDataPersistenceBlocked) {
            return createPersistenceBlockedResult(APP_DATA_STORAGE_KEY, appDataStorageIssue);
        }

        if (!Array.isArray(importFileData.rutinas)) {
            return createImportValidationFailure(APP_DATA_STORAGE_KEY, { location: 'rutinas', expected: 'array' });
        }

        const routinesSnapshot = cloneDataSnapshot(importFileData.rutinas, APP_DATA_STORAGE_KEY);
        if (!routinesSnapshot.ok) return routinesSnapshot;

        nextAppData = { ...appData, routines: routinesSnapshot.value };
        const appDataValidation = validateAppDataStructure(nextAppData);
        if (!appDataValidation.valid) {
            return createImportValidationFailure(APP_DATA_STORAGE_KEY, appDataValidation);
        }

        changes.push({
            key: APP_DATA_STORAGE_KEY,
            value: nextAppData,
            schema: { type: 'object', requiredKeys: ['routines'] }
        });
        importedTypes.push('rutinas');
    }

    if (importEjercicios) {
        if (exercisesDataPersistenceBlocked) {
            return createPersistenceBlockedResult(EXERCISES_STORAGE_KEY, exercisesDataStorageIssue);
        }

        if (!Array.isArray(importFileData.ejercicios)) {
            return createImportValidationFailure(EXERCISES_STORAGE_KEY, { location: 'ejercicios', expected: 'array' });
        }

        const exercisesSnapshot = cloneDataSnapshot(importFileData.ejercicios, EXERCISES_STORAGE_KEY);
        if (!exercisesSnapshot.ok) return exercisesSnapshot;

        nextExercisesData = { ...exercisesData, exercises: exercisesSnapshot.value };
        const exercisesValidation = validateExercisesDataStructure(nextExercisesData);
        if (!exercisesValidation.valid) {
            return createImportValidationFailure(EXERCISES_STORAGE_KEY, exercisesValidation);
        }

        changes.push({
            key: EXERCISES_STORAGE_KEY,
            value: nextExercisesData,
            schema: { type: 'object', requiredKeys: ['exercises'] }
        });
        importedTypes.push('ejercicios');
    }

    if (importHistorial) {
        currentHistory = getHistory();
        if (historyDataPersistenceBlocked) {
            return createPersistenceBlockedResult(HISTORY_STORAGE_KEY, historyDataStorageIssue);
        }

        if (!Array.isArray(importFileData.historial)) {
            return createImportValidationFailure(HISTORY_STORAGE_KEY, { location: 'historial', expected: 'array' });
        }

        const historySnapshot = cloneDataSnapshot(importFileData.historial, HISTORY_STORAGE_KEY);
        if (!historySnapshot.ok) return historySnapshot;

        nextHistory = historySnapshot.value;
        const historyValidation = validateHistoryDataStructure(nextHistory);
        if (!historyValidation.valid) {
            return createImportValidationFailure(HISTORY_STORAGE_KEY, historyValidation);
        }

        changes.push({
            key: HISTORY_STORAGE_KEY,
            value: nextHistory,
            schema: { type: 'array' }
        });
        importedTypes.push('historial');
    }

    const preparedChanges = GymNotesStorage.prepareJsonChanges(changes);
    if (!preparedChanges.ok) {
        return preparedChanges;
    }

    return {
        ...preparedChanges,
        nextAppData,
        nextExercisesData,
        nextHistory,
        currentHistory,
        importedTypes
    };
}

function synchronizeImportedMemory(preparedImport) {
    if (preparedImport.nextAppData) {
        appData.routines = preparedImport.nextAppData.routines;
        window.appData = appData;
    }

    if (preparedImport.nextExercisesData) {
        exercisesData.exercises = preparedImport.nextExercisesData.exercises;
        window.exercisesData = exercisesData;
    }

    if (preparedImport.nextHistory) {
        preparedImport.currentHistory.splice(0, preparedImport.currentHistory.length, ...preparedImport.nextHistory);
        window.historyDB = preparedImport.currentHistory;
    }
}

function showImportPersistenceError(result) {
    cerrarImportDataModal();
    console.error('[data-import-export] Error en la importación:', result);

    if (result.status === GymNotesStorage.STATUS.ROLLBACK_FAILED) {
        window.showAlert('No se pudo confirmar la importación. El almacenamiento puede haber quedado en un estado incompleto.', 'Error');
        return;
    }

    window.showAlert('No se pudieron importar los datos seleccionados. No se ha aplicado ningún cambio.', 'Error');
}

function importData() {
    const importRutinas = document.getElementById('import-rutinas')?.checked || false;
    const importHistorial = document.getElementById('import-historial')?.checked || false;
    const importEjercicios = document.getElementById('import-ejercicios')?.checked || false;
    
    if (!importRutinas && !importHistorial && !importEjercicios) {
        cerrarImportDataModal();
        window.showAlert('Selecciona al menos un tipo de datos para importar.', 'Aviso');
        return;
    }
    
    if (!importFileData) {
        cerrarImportDataModal();
        window.showAlert('No hay datos para importar.', 'Error');
        return;
    }
    
    // Confirmar la importación
    const tipos = [];
    if (importRutinas) tipos.push('rutinas');
    if (importHistorial) tipos.push('historial');
    if (importEjercicios) tipos.push('ejercicios');
    
    cerrarImportDataModal();
    window.showConfirm(
        `¿Estás seguro de que quieres importar ${tipos.join(', ')}?\n\n⚠️ Los datos existentes serán SOBRESCRITOS. Esta acción no se puede deshacer.`,
        'Confirmar importación'
    ).then(confirm => {
        if (confirm) {
            performImport(importRutinas, importHistorial, importEjercicios);
        } else {
            console.log('[data-import-export] Importación cancelada por el usuario.');
            cerrarImportDataModal();
            importFileData = null;
        }
    });
}

function performImport(importRutinas, importHistorial, importEjercicios) {
    console.log('[data-import-export] Realizando importación...');
    const preparedImport = prepareGlobalImport(importRutinas, importHistorial, importEjercicios);
    if (!preparedImport.ok) {
        showImportPersistenceError(preparedImport);
        return preparedImport;
    }

    const persistenceResult = GymNotesStorage.applyPreparedChanges(preparedImport);
    if (!persistenceResult.ok) {
        showImportPersistenceError(persistenceResult);
        return persistenceResult;
    }

    // La memoria y la interfaz solo se confirman después de persistir todas
    // las claves seleccionadas; no se usan setters que escriban de nuevo.
    synchronizeImportedMemory(preparedImport);
    cerrarImportDataModal();
    importFileData = null;

    window.showAlert(
        `Importación completada.\nDatos importados: ${preparedImport.importedTypes.join(', ')}.\n\n🔄 Recargando la aplicación para aplicar los cambios...`,
        'Importación completada'
    );

    setTimeout(() => {
        location.reload();
    }, 1500);

    return persistenceResult;
}

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.openExportDataModal = openExportDataModal;
window.cerrarExportDataModal = cerrarExportDataModal;
window.exportData = exportData;
window.openImportDataModal = openImportDataModal;
window.processImportFile = processImportFile;
window.showImportSelectionModal = showImportSelectionModal;
window.cerrarImportDataModal = cerrarImportDataModal;
window.importData = importData;
window.performImport = performImport;
window.getDataTimestamp = getDataTimestamp;
