/**
 * MÓDULO: history-export.js
 * Exportación del historial
 */

// ==========================================================================
// EXPORTAR HISTORIAL
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
    a.download = `Historial_${getHistoryTimestamp()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.showAlert('Historial exportado correctamente.', 'Exportar');
}

function exportHistoryCSV() {
    const history = getHistory();
    if (history.length === 0) {
        window.showAlert('No hay historial para exportar.', 'Exportar');
        return;
    }

    // Cabeceras CSV
    let csv = 'Fecha,Rutina,Sesión,Duración (min),Anotaciones\n';
    
    history.forEach(item => {
        const fecha = new Date(item.fecha).toLocaleString('es-ES');
        const duracion = item.duracion_minutos || 0;
        const contenido = (item.contenido_editado || '')
            .replace(/<[^>]*>/g, ' ') // Quitar HTML
            .replace(/"/g, '""') // Escapar comillas
            .replace(/\n/g, ' ') // Quitar saltos de línea
            .substring(0, 500); // Limitar longitud
        
        csv += `"${fecha}","${item.nombre_rutina || ''}","${item.nombre_sesion || ''}",${duracion},"${contenido}"\n`;
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM para UTF-8
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Historial_${getHistoryTimestamp()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.showAlert('Historial exportado correctamente.', 'Exportar');
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
window.exportHistoryCSV = exportHistoryCSV;
window.clearAllHistoryConfirm = clearAllHistoryConfirm;
window.deleteHistoryItem = deleteHistoryItem;
window.shareHistoryItem = shareHistoryItem;