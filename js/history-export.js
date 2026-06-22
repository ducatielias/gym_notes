/**
 * MÓDULO: history-export.js
 * Exportación e importación del historial
 * 
 * MODIFICADO: Eliminada exportación CSV, añadida importación de historial
 * MODIFICADO: Nombre de archivo exportado: GN_Historial_fecha_hora.json
 */

// ==========================================================================
// EXPORTAR HISTORIAL (JSON)
// ==========================================================================

function exportHistoryJSON() {
    const history = getHistory();
    if (history.length === 0) {
        window.showAlert('No hay historial para exportar.', 'Exportar');
        return;
    }
    const dataStr = JSON.stringify(history, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GN_Historial_${getHistoryTimestamp()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.showAlert('Historial exportado correctamente.', 'Exportar');
}

// ==========================================================================
// IMPORTAR HISTORIAL (JSON)
// ==========================================================================

function importHistoryFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            // Validar que el archivo contiene un array de registros de historial
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error('El archivo no contiene un historial válido. Debe ser un array de registros.');
            }
            
            // Validar que al menos el primer registro tiene la estructura correcta
            const firstItem = data[0];
            if (!firstItem.fecha || !firstItem.nombre_sesion || !firstItem.nombre_rutina) {
                throw new Error('El archivo no tiene el formato de historial esperado. Faltan campos obligatorios (fecha, nombre_sesion, nombre_rutina).');
            }
            
            // Mostrar confirmación antes de importar
            const confirmacion = await window.showConfirm(
                `¿Estás seguro de que quieres importar ${data.length} registro(s) de historial?\n\n⚠️ ATENCIÓN: Esto SOBRESCRIBIRÁ todo tu historial actual.`,
                'Importar historial'
            );
            
            if (!confirmacion) {
                event.target.value = '';
                return;
            }
            
            // Reemplazar el historial actual con los datos importados
            // Asegurar que cada registro tenga un ID único
            const historyConIds = data.map(record => {
                if (!record.id) {
                    record.id = 'h-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
                }
                return record;
            });
            
            setHistory(historyConIds);
            renderHistory();
            
            window.showAlert(`Historial importado correctamente.\n${historyConIds.length} registro(s) importados.`, 'Importación completada');
            
        } catch (err) {
            window.showAlert('Error al leer el archivo: ' + err.message, 'Error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ==========================================================================
// ELIMINAR HISTORIAL
// ==========================================================================

async function clearAllHistoryConfirm() {
    const confirm = await window.showConfirm(
        '¿Estás seguro de que quieres eliminar TODO el historial? Esta acción no se puede deshacer.',
        'Borrar historial'
    );
    if (confirm) {
        clearAllHistory();
        renderHistory();
        window.showAlert('Historial eliminado correctamente.', 'Eliminado');
    }
}

async function deleteHistoryItem(id) {
    const item = getHistoryRecord(id);
    if (!item) return;

    const confirm = await window.showConfirm(
        `¿Eliminar el entrenamiento de "${item.nombre_sesion}" del ${new Date(item.fecha).toLocaleDateString('es-ES')}?`,
        'Eliminar registro'
    );
    if (confirm) {
        deleteHistoryRecord(id);
        renderHistory();
        window.showAlert('Registro eliminado.', 'Eliminado');
    }
}

// ==========================================================================
// COMPARTIR REGISTRO DE HISTORIAL
// ==========================================================================

async function shareHistoryItem(id) {
    const item = getHistoryRecord(id);
    if (!item) return;

    const fecha = new Date(item.fecha).toLocaleString('es-ES');
    const contenido = (item.contenido_editado || item.contenido_original || 'Sin anotaciones')
        .replace(/<[^>]*>/g, ' ')
        .substring(0, 300);
    
    const mensaje = `🏋️ Entrenamiento: ${item.nombre_sesion}\n📅 ${fecha}\n📋 ${item.nombre_rutina}\n⏱ ${item.duracion_minutos || 0} min\n\n📝 ${contenido}${contenido.length >= 300 ? '...' : ''}`;

    if (navigator.share) {
        try {
            await navigator.share({
                title: `Entrenamiento: ${item.nombre_sesion}`,
                text: mensaje
            });
        } catch (e) {
            // Usuario canceló
        }
    } else {
        try {
            await navigator.clipboard.writeText(mensaje);
            window.showAlert('Texto copiado al portapapeles.', 'Compartir');
        } catch {
            window.showAlert(mensaje, 'Compartir entrenamiento');
        }
    }
}

// ==========================================================================
// UTILIDADES
// ==========================================================================

function getHistoryTimestamp() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}`;
}

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.exportHistoryJSON = exportHistoryJSON;
window.importHistoryFromFile = importHistoryFromFile;
window.clearAllHistoryConfirm = clearAllHistoryConfirm;
window.deleteHistoryItem = deleteHistoryItem;
window.shareHistoryItem = shareHistoryItem;