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

function getCurrentAppData() {
    const data = {
        rutinas: [],
        historial: [],
        ejercicios: []
    };
    
    // Obtener rutinas
    if (typeof window.appData !== 'undefined' && window.appData.routines) {
        data.rutinas = JSON.parse(JSON.stringify(window.appData.routines));
    }
    
    // Obtener historial
    try {
        const historyDB = JSON.parse(localStorage.getItem('sharkHistory')) || [];
        data.historial = JSON.parse(JSON.stringify(historyDB));
    } catch (e) {
        console.warn('[data-import-export] Error al obtener historial:', e);
        data.historial = [];
    }
    
    // Obtener ejercicios
    if (typeof window.getExercises === 'function') {
        data.ejercicios = JSON.parse(JSON.stringify(window.getExercises()));
    } else {
        try {
            const exercisesData = JSON.parse(localStorage.getItem('sharkExercises')) || { exercises: [] };
            data.ejercicios = JSON.parse(JSON.stringify(exercisesData.exercises || []));
        } catch (e) {
            console.warn('[data-import-export] Error al obtener ejercicios:', e);
            data.ejercicios = [];
        }
    }
    
    return data;
}

// ==========================================================================
// FUNCIÓN: EXPORTAR DATOS
// ==========================================================================

function openExportDataModal() {
    console.log('[data-import-export] Abriendo modal de exportación...');
    
    const data = getCurrentAppData();
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
}

function cerrarExportDataModal() {
    const modal = document.getElementById('export-data-modal');
    if (modal) {
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
    
    const allData = getCurrentAppData();
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

function processImportFile(file) {
    console.log('[data-import-export] Procesando archivo:', file.name);
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // Validar el formato del archivo
            if (!data.datos || typeof data.datos !== 'object') {
                throw new Error('El archivo no tiene el formato esperado. Falta la propiedad "datos".');
            }
            
            // Verificar que al menos hay un tipo de dato
            const hasRutinas = data.datos.rutinas && Array.isArray(data.datos.rutinas) && data.datos.rutinas.length > 0;
            const hasHistorial = data.datos.historial && Array.isArray(data.datos.historial) && data.datos.historial.length > 0;
            const hasEjercicios = data.datos.ejercicios && Array.isArray(data.datos.ejercicios) && data.datos.ejercicios.length > 0;
            
            if (!hasRutinas && !hasHistorial && !hasEjercicios) {
                throw new Error('El archivo no contiene datos válidos (rutinas, historial o ejercicios).');
            }
            
            importFileData = data.datos;
            showImportSelectionModal(data.datos, data.fecha_exportacion || '');
            
        } catch (error) {
            console.error('[data-import-export] Error al leer el archivo:', error);
            window.showAlert('Error al leer el archivo: ' + error.message, 'Error');
        }
    };
    reader.onerror = function() {
        window.showAlert('Error al leer el archivo.', 'Error');
    };
    reader.readAsText(file);
}

function showImportSelectionModal(data, fechaExportacion) {
    console.log('[data-import-export] Mostrando selector de importación...');
    
    const totalRutinas = data.rutinas ? data.rutinas.length : 0;
    const totalHistorial = data.historial ? data.historial.length : 0;
    const totalEjercicios = data.ejercicios ? data.ejercicios.length : 0;
    
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
}

function cerrarImportDataModal() {
    const modal = document.getElementById('import-data-modal');
    if (modal) {
        modal.remove();
    }
    // No limpiamos importFileData aquí para que pueda usarse después si el usuario confirma
}

function importData() {
    const importRutinas = document.getElementById('import-rutinas')?.checked || false;
    const importHistorial = document.getElementById('import-historial')?.checked || false;
    const importEjercicios = document.getElementById('import-ejercicios')?.checked || false;
    
    if (!importRutinas && !importHistorial && !importEjercicios) {
        window.showAlert('Selecciona al menos un tipo de datos para importar.', 'Aviso');
        return;
    }
    
    if (!importFileData) {
        window.showAlert('No hay datos para importar.', 'Error');
        return;
    }
    
    // Confirmar la importación
    const tipos = [];
    if (importRutinas) tipos.push('rutinas');
    if (importHistorial) tipos.push('historial');
    if (importEjercicios) tipos.push('ejercicios');
    
    // CERRAR EL MODAL DE SELECCIÓN ANTES DE MOSTRAR LA CONFIRMACIÓN
    cerrarImportDataModal();
    
    window.showConfirm(
        `¿Estás seguro de que quieres importar ${tipos.join(', ')}?\n\n⚠️ Los datos existentes serán SOBRESCRITOS. Esta acción no se puede deshacer.`,
        'Confirmar importación'
    ).then(confirm => {
        if (confirm) {
            performImport(importRutinas, importHistorial, importEjercicios);
        } else {
            // Si el usuario cancela, no hacemos nada (el modal ya está cerrado)
            console.log('[data-import-export] Importación cancelada por el usuario.');
            // Limpiar los datos del archivo
            importFileData = null;
        }
    });
}

function performImport(importRutinas, importHistorial, importEjercicios) {
    console.log('[data-import-export] Realizando importación...');
    let importados = [];
    
    try {
        // IMPORTAR RUTINAS
        if (importRutinas && importFileData.rutinas && Array.isArray(importFileData.rutinas)) {
            if (typeof window.appData !== 'undefined' && window.appData.routines) {
                // Reemplazar las rutinas existentes
                window.appData.routines = JSON.parse(JSON.stringify(importFileData.rutinas));
                // Guardar en localStorage
                if (typeof window.saveData === 'function') {
                    window.saveData();
                } else {
                    localStorage.setItem('sharkAppData', JSON.stringify(window.appData));
                }
                importados.push('rutinas');
                console.log('[data-import-export] Rutinas importadas:', importFileData.rutinas.length);
            } else {
                console.warn('[data-import-export] appData.routines no disponible');
            }
        }
        
        // IMPORTAR HISTORIAL
        if (importHistorial && importFileData.historial && Array.isArray(importFileData.historial)) {
            try {
                // Asegurar que cada registro tenga un ID único
                const historialConIds = importFileData.historial.map(record => {
                    if (!record.id) {
                        record.id = 'h-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
                    }
                    return record;
                });
                localStorage.setItem('sharkHistory', JSON.stringify(historialConIds));
                // Actualizar variable global
                if (window.historyDB !== undefined) {
                    window.historyDB = historialConIds;
                }
                importados.push('historial');
                console.log('[data-import-export] Historial importado:', historialConIds.length);
            } catch (e) {
                console.error('[data-import-export] Error importando historial:', e);
            }
        }
        
        // IMPORTAR EJERCICIOS
        if (importEjercicios && importFileData.ejercicios && Array.isArray(importFileData.ejercicios)) {
            try {
                // Asegurar que cada ejercicio tenga un ID único
                const ejerciciosConIds = importFileData.ejercicios.map(ex => {
                    if (!ex.id) {
                        ex.id = 'ex-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
                    }
                    return ex;
                });
                const exercisesData = { exercises: ejerciciosConIds };
                localStorage.setItem('sharkExercises', JSON.stringify(exercisesData));
                // Actualizar variable global
                if (window.exercisesData !== undefined) {
                    window.exercisesData = exercisesData;
                }
                importados.push('ejercicios');
                console.log('[data-import-export] Ejercicios importados:', ejerciciosConIds.length);
            } catch (e) {
                console.error('[data-import-export] Error importando ejercicios:', e);
            }
        }
        
        // Limpiar los datos del archivo
        importFileData = null;
        
        // Mostrar mensaje de éxito
        if (importados.length > 0) {
            window.showAlert(
                `Importación completada.\nDatos importados: ${importados.join(', ')}.\n\n🔄 Recargando la aplicación para aplicar los cambios...`,
                'Importación completada'
            );
            
            // Recargar la aplicación para aplicar los cambios
            setTimeout(() => {
                location.reload();
            }, 1500);
        } else {
            window.showAlert('No se importó ningún dato.', 'Aviso');
        }
        
    } catch (error) {
        console.error('[data-import-export] Error en la importación:', error);
        window.showAlert('Error al importar los datos: ' + error.message, 'Error');
        importFileData = null;
    }
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