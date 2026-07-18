/**
 * MÓDULO: history-state.js
 * Estado global y almacenamiento para el módulo de Historial
 */

// ==========================================================================
// ESTADO GLOBAL
// ==========================================================================

const HISTORY_STORAGE_KEY = 'sharkHistory';

function createDefaultHistoryData() {
    return [];
}

/**
 * Valida unicamente la estructura necesaria para mantener compatibilidad con
 * registros antiguos cuyos campos internos puedan estar ausentes.
 */
function validateHistoryDataStructure(value) {
    const rootValidation = GymNotesStorage.validateStructure(value, { type: 'array' });
    if (!rootValidation.valid) {
        return { ...rootValidation, location: 'root' };
    }

    for (let index = 0; index < value.length; index += 1) {
        const recordValidation = GymNotesStorage.validateStructure(value[index], { type: 'object' });
        if (!recordValidation.valid) {
            return {
                valid: false,
                status: GymNotesStorage.STATUS.INVALID_ITEM,
                location: `history[${index}]`,
                validation: recordValidation
            };
        }
    }

    return { valid: true, status: GymNotesStorage.STATUS.VALID };
}

function loadHistoryData() {
    const readResult = GymNotesStorage.readJson(HISTORY_STORAGE_KEY);

    if (readResult.status === GymNotesStorage.STATUS.MISSING) {
        return { data: createDefaultHistoryData(), issue: null, persistenceBlocked: false };
    }

    if (!readResult.ok) {
        return { data: createDefaultHistoryData(), issue: readResult, persistenceBlocked: true };
    }

    const validation = validateHistoryDataStructure(readResult.value);
    if (!validation.valid) {
        return {
            data: createDefaultHistoryData(),
            issue: { status: validation.status, location: validation.location, validation },
            persistenceBlocked: true
        };
    }

    return { data: readResult.value, issue: null, persistenceBlocked: false };
}

let historyDB = createDefaultHistoryData();
let historyDataStorageIssue = null;
let historyDataPersistenceBlocked = false;
let historyStorageWarningLogged = false;

function applyHistoryDataLoad(historyDataLoad) {
    historyDB = historyDataLoad.data;
    historyDataStorageIssue = historyDataLoad.issue;
    historyDataPersistenceBlocked = historyDataLoad.persistenceBlocked;

    // Mantener la referencia pública alineada también tras una recarga desde
    // almacenamiento o un fallback temporal por datos corruptos.
    window.historyDB = historyDB;

    if (historyDataStorageIssue && !historyStorageWarningLogged) {
        console.warn('[history-state] sharkHistory no se ha cargado. Se usara un estado temporal sin sobrescribir el valor almacenado.', {
            status: historyDataStorageIssue.status,
            location: historyDataStorageIssue.location
        });
        historyStorageWarningLogged = true;
    }

    return historyDB;
}

applyHistoryDataLoad(loadHistoryData());
let historyFilter = 'todos'; // 'todos', 'hoy', 'semana', 'mes'
let historyRoutineFilter = 'todos';
let historySearchTerm = '';
let historyViewingItem = null;
let historyReturnScreen = null; // 'workout' o 'session' para saber a dónde volver
let historyOriginalRoutineFilter = 'todos'; // Guarda el filtro de rutina original cuando se aplica desde origen

// ==========================================================================
// FUNCIONES DE ALMACENAMIENTO
// ==========================================================================

function saveHistory() {
    if (historyDataPersistenceBlocked) {
        return {
            ok: false,
            status: 'persistence-blocked',
            key: HISTORY_STORAGE_KEY,
            cause: historyDataStorageIssue
        };
    }

    const validation = validateHistoryDataStructure(historyDB);
    if (!validation.valid) {
        const result = {
            ok: false,
            status: validation.status,
            key: HISTORY_STORAGE_KEY,
            validation
        };
        console.error('[history-state] No se ha guardado sharkHistory porque su estructura no es valida.', result);
        return result;
    }

    const writeResult = GymNotesStorage.writeJson(HISTORY_STORAGE_KEY, historyDB, {
        schema: { type: 'array' }
    });

    if (!writeResult.ok) {
        console.error('[history-state] Error al guardar sharkHistory.', writeResult);
    }

    return writeResult;
}

function refreshHistoryData() {
    return applyHistoryDataLoad(loadHistoryData());
}

function getHistory() {
    // Siempre obtener la versión más reciente desde localStorage
    return refreshHistoryData();
}

/**
 * Persiste una mutación de historial sin dejar el estado en memoria adelantado
 * si localStorage rechaza la escritura o está bloqueado por datos corruptos.
 */
function commitHistoryMutation(nextHistory) {
    const previousHistory = historyDB;
    historyDB = nextHistory;

    const persistenceResult = saveHistory();
    if (!persistenceResult.ok) {
        historyDB = previousHistory;
    }

    window.historyDB = historyDB;
    return persistenceResult;
}

function setHistory(history) {
    refreshHistoryData();
    return commitHistoryMutation(history);
}

function addHistoryRecord(record) {
    // Asegurarnos de tener la versión más reciente
    refreshHistoryData();
    return commitHistoryMutation([record, ...historyDB]);
}

function deleteHistoryRecord(id) {
    refreshHistoryData();
    return commitHistoryMutation(historyDB.filter(item => item.id !== id));
}

function getHistoryRecord(id) {
    // Asegurarnos de tener la versión más reciente
    refreshHistoryData();
    return historyDB.find(item => item.id === id);
}

function clearAllHistory() {
    refreshHistoryData();
    return commitHistoryMutation([]);
}

function getHistoryStats() {
    // Asegurarnos de tener la versión más reciente
    refreshHistoryData();
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
// FUNCIÓN PARA RESTAURAR FILTROS AL VOLVER
// ==========================================================================

function resetHistoryFilters() {
    historySearchTerm = '';
    window.historySearchTerm = '';
    historyRoutineFilter = 'todos';
    window.historyRoutineFilter = 'todos';
    historyFilter = 'todos';
    window.historyFilter = 'todos';
    historyReturnScreen = null;
    window.historyReturnScreen = null;
    historyOriginalRoutineFilter = 'todos';
    window.historyOriginalRoutineFilter = 'todos';
}

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.historyDB = historyDB;
window.historyFilter = historyFilter;
window.historyRoutineFilter = historyRoutineFilter;
window.historySearchTerm = historySearchTerm;
window.historyViewingItem = historyViewingItem;
window.historyReturnScreen = historyReturnScreen;
window.historyOriginalRoutineFilter = historyOriginalRoutineFilter;
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
window.resetHistoryFilters = resetHistoryFilters;
