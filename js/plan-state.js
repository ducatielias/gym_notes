<<<<<<< HEAD
/**
 * MÓDULO: plan-state.js
 * Estado global y almacenamiento para el módulo de Plan (Rutinas y Sesiones)
 */

=======
/**
 * MÓDULO: plan-state.js
 * Estado global y almacenamiento para el módulo de Plan (Rutinas y Sesiones)
 */

>>>>>>> a0e06567d66fb0b2bcaca3a4ed517c8aee665a60
// ========================================================================== 
// ESTADO GLOBAL
// ========================================================================== 

const APP_DATA_STORAGE_KEY = 'sharkAppData';

function createDefaultAppData() {
    return { routines: [] };
}

/**
 * Valida únicamente la estructura necesaria para que el estado de plan sea
 * legible, sin exigir campos opcionales de rutinas o sesiones antiguas.
 */
function validateAppDataStructure(value) {
    const rootValidation = GymNotesStorage.validateStructure(value, {
        type: 'object',
        requiredKeys: ['routines']
    });
    if (!rootValidation.valid) {
        return { ...rootValidation, location: 'root' };
    }

    const routinesValidation = GymNotesStorage.validateStructure(value.routines, { type: 'array' });
    if (!routinesValidation.valid) {
        return { ...routinesValidation, location: 'routines' };
    }

    for (let index = 0; index < value.routines.length; index += 1) {
        const routine = value.routines[index];
        const routineValidation = GymNotesStorage.validateStructure(routine, { type: 'object' });
        if (!routineValidation.valid) {
            return {
                valid: false,
                status: GymNotesStorage.STATUS.INVALID_ITEM,
                location: `routines[${index}]`,
                validation: routineValidation
            };
        }

        if (Object.prototype.hasOwnProperty.call(routine, 'sessions')) {
            const sessionsValidation = GymNotesStorage.validateStructure(routine.sessions, { type: 'array' });
            if (!sessionsValidation.valid) {
                return {
                    valid: false,
                    status: sessionsValidation.status,
                    location: `routines[${index}].sessions`,
                    validation: sessionsValidation
                };
            }
        }
    }

    return { valid: true, status: GymNotesStorage.STATUS.VALID };
}

function loadAppData() {
    const readResult = GymNotesStorage.readJson(APP_DATA_STORAGE_KEY);

    if (readResult.status === GymNotesStorage.STATUS.MISSING) {
        return { data: createDefaultAppData(), issue: null, persistenceBlocked: false };
    }

    if (!readResult.ok) {
        return { data: createDefaultAppData(), issue: readResult, persistenceBlocked: true };
    }

    const validation = validateAppDataStructure(readResult.value);
    if (!validation.valid) {
        return {
            data: createDefaultAppData(),
            issue: { status: validation.status, location: validation.location, validation },
            persistenceBlocked: true
        };
    }

    return { data: readResult.value, issue: null, persistenceBlocked: false };
}

const appDataLoad = loadAppData();
let appData = appDataLoad.data;
let appDataStorageIssue = appDataLoad.issue;
let appDataPersistenceBlocked = appDataLoad.persistenceBlocked;

if (appDataStorageIssue) {
    console.warn('[plan-state] sharkAppData no se ha cargado. Se usará un estado temporal sin sobrescribir el valor almacenado.', {
        status: appDataStorageIssue.status,
        location: appDataStorageIssue.location
    });
}

let currentRoutineId = null;
<<<<<<< HEAD

// ==========================================================================
// FUNCIONES DE ALMACENAMIENTO
// ==========================================================================

=======

// ==========================================================================
// FUNCIONES DE ALMACENAMIENTO
// ==========================================================================

>>>>>>> a0e06567d66fb0b2bcaca3a4ed517c8aee665a60
function saveData() {
    if (appDataPersistenceBlocked) {
        return {
            ok: false,
            status: 'persistence-blocked',
            key: APP_DATA_STORAGE_KEY,
            cause: appDataStorageIssue
        };
    }

    const validation = validateAppDataStructure(appData);
    if (!validation.valid) {
        const result = {
            ok: false,
            status: validation.status,
            key: APP_DATA_STORAGE_KEY,
            validation
        };
        console.error('[plan-state] No se ha guardado sharkAppData porque su estructura no es válida.', result);
        return result;
    }

    const writeResult = GymNotesStorage.writeJson(APP_DATA_STORAGE_KEY, appData, {
        schema: { type: 'object', requiredKeys: ['routines'] }
    });

    if (!writeResult.ok) {
        console.error('[plan-state] Error al guardar sharkAppData.', writeResult);
    }

    return writeResult;
}
<<<<<<< HEAD

// ==========================================================================
// EXPOSICIÓN GLOBAL (para que otros módulos puedan acceder)
// ==========================================================================

window.appData = appData;
window.currentRoutineId = currentRoutineId;
=======

// ==========================================================================
// EXPOSICIÓN GLOBAL (para que otros módulos puedan acceder)
// ==========================================================================

window.appData = appData;
window.currentRoutineId = currentRoutineId;
>>>>>>> a0e06567d66fb0b2bcaca3a4ed517c8aee665a60
window.saveData = saveData;
