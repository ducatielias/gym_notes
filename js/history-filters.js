/**
 * MÓDULO: history-filters.js
 * Lógica adicional de filtros para el historial
 */

// ==========================================================================
// FUNCIONES DE FILTRADO AVANZADO
// ==========================================================================

function filterHistoryByDateRange(history, startDate, endDate) {
    if (!startDate && !endDate) return history;
    return history.filter(item => {
        const date = new Date(item.fecha);
        if (startDate && endDate) {
            return date >= startDate && date <= endDate;
        } else if (startDate) {
            return date >= startDate;
        } else if (endDate) {
            return date <= endDate;
        }
        return true;
    });
}

function filterHistoryByRoutine(history, routineName) {
    if (!routineName || routineName === 'todos') return history;
    return history.filter(item => item.nombre_rutina === routineName);
}

function filterHistoryBySession(history, sessionName) {
    if (!sessionName || sessionName === 'todos') return history;
    return history.filter(item => item.nombre_sesion === sessionName);
}

function filterHistoryBySearch(history, searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') return history;
    const term = searchTerm.toLowerCase().trim();
    return history.filter(item =>
        item.nombre_rutina.toLowerCase().includes(term) ||
        item.nombre_sesion.toLowerCase().includes(term) ||
        (item.contenido_editado && item.contenido_editado.toLowerCase().includes(term)) ||
        (item.contenido_original && item.contenido_original.toLowerCase().includes(term))
    );
}

// ==========================================================================
// OBTENER FILTROS DISPONIBLES
// ==========================================================================

function getAvailableRoutinesFromHistory() {
    const routines = new Set();
    historyDB.forEach(item => {
        if (item.nombre_rutina) routines.add(item.nombre_rutina);
    });
    return ['todos', ...routines].sort();
}

function getAvailableSessionsFromHistory() {
    const sessions = new Set();
    historyDB.forEach(item => {
        if (item.nombre_sesion) sessions.add(item.nombre_sesion);
    });
    return ['todos', ...sessions].sort();
}

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.filterHistoryByDateRange = filterHistoryByDateRange;
window.filterHistoryByRoutine = filterHistoryByRoutine;
window.filterHistoryBySession = filterHistoryBySession;
window.filterHistoryBySearch = filterHistoryBySearch;
window.getAvailableRoutinesFromHistory = getAvailableRoutinesFromHistory;
window.getAvailableSessionsFromHistory = getAvailableSessionsFromHistory;