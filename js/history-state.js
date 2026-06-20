/**
 * MÓDULO: history-state.js
 * Estado global y almacenamiento para el módulo de Historial
 */

// ==========================================================================
// ESTADO GLOBAL
// ==========================================================================

let historyDB = JSON.parse(localStorage.getItem('sharkHistory')) || [];
let historyFilter = 'todos'; // 'todos', 'hoy', 'semana', 'mes'
let historyRoutineFilter = 'todos';
let historySearchTerm = '';
let historyViewingItem = null;

// ==========================================================================
// FUNCIONES DE ALMACENAMIENTO
// ==========================================================================

function saveHistory() {
    localStorage.setItem('sharkHistory', JSON.stringify(historyDB));
}

function getHistory() {
    // Siempre obtener la versión más reciente desde localStorage
    historyDB = JSON.parse(localStorage.getItem('sharkHistory')) || [];
    return historyDB;
}

function setHistory(history) {
    historyDB = history;
    saveHistory();
    // Actualizar la referencia global
    window.historyDB = historyDB;
    return historyDB;
}

function addHistoryRecord(record) {
    // Asegurarnos de tener la versión más reciente
    historyDB = JSON.parse(localStorage.getItem('sharkHistory')) || [];
    historyDB.unshift(record);
    saveHistory();
    // Actualizar la referencia global
    window.historyDB = historyDB;
    return historyDB;
}

function deleteHistoryRecord(id) {
    historyDB = historyDB.filter(item => item.id !== id);
    saveHistory();
    window.historyDB = historyDB;
    return historyDB;
}

function getHistoryRecord(id) {
    // Asegurarnos de tener la versión más reciente
    historyDB = JSON.parse(localStorage.getItem('sharkHistory')) || [];
    return historyDB.find(item => item.id === id);
}

function clearAllHistory() {
    historyDB = [];
    saveHistory();
    window.historyDB = historyDB;
}

function getHistoryStats() {
    // Asegurarnos de tener la versión más reciente
    historyDB = JSON.parse(localStorage.getItem('sharkHistory')) || [];
    return {
        total: historyDB.length,
        totalMinutes: historyDB.reduce((acc, item) => acc + (item.duracion_minutos || 0), 0),
        uniqueSessions: new Set(historyDB.map(item => item.nombre_sesion)).size,
        uniqueRoutines: new Set(historyDB.map(item => item.nombre_rutina)).size
    };
}

function getUniqueRoutinesFromHistory() {
    const routines = new Set();
    historyDB.forEach(item => {
        if (item.nombre_rutina) routines.add(item.nombre_rutina);
    });
    return ['todos', ...routines].sort();
}

function getUniqueSessionsFromHistory() {
    const sessions = new Set();
    historyDB.forEach(item => {
        if (item.nombre_sesion) sessions.add(item.nombre_sesion);
    });
    return [...sessions].sort();
}

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.historyDB = historyDB;
window.historyFilter = historyFilter;
window.historyRoutineFilter = historyRoutineFilter;
window.historySearchTerm = historySearchTerm;
window.historyViewingItem = historyViewingItem;
window.saveHistory = saveHistory;
window.getHistory = getHistory;
window.setHistory = setHistory;
window.addHistoryRecord = addHistoryRecord;
window.deleteHistoryRecord = deleteHistoryRecord;
window.getHistoryRecord = getHistoryRecord;
window.clearAllHistory = clearAllHistory;
window.getHistoryStats = getHistoryStats;
window.getUniqueRoutinesFromHistory = getUniqueRoutinesFromHistory;
window.getUniqueSessionsFromHistory = getUniqueSessionsFromHistory;