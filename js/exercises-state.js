<<<<<<< HEAD
/**
 * MÓDULO: exercises-state.js
 * Estado global y almacenamiento para el módulo de Ejercicios
 */

// ==========================================================================
// ESTADO GLOBAL
// ==========================================================================

=======
/**
 * MÓDULO: exercises-state.js
 * Estado global y almacenamiento para el módulo de Ejercicios
 */

// ==========================================================================
// ESTADO GLOBAL
// ==========================================================================

>>>>>>> a0e06567d66fb0b2bcaca3a4ed517c8aee665a60
const EXERCISES_STORAGE_KEY = 'sharkExercises';

function createDefaultExercisesData() {
    return { exercises: [] };
}

/**
 * Valida solo la estructura necesaria para conservar ejercicios antiguos sin
 * exigir metadatos opcionales que pueden no existir en datos ya guardados.
 */
function validateExercisesDataStructure(value) {
    const rootValidation = GymNotesStorage.validateStructure(value, {
        type: 'object',
        requiredKeys: ['exercises']
    });
    if (!rootValidation.valid) {
        return { ...rootValidation, location: 'root' };
    }

    const exercisesValidation = GymNotesStorage.validateStructure(value.exercises, { type: 'array' });
    if (!exercisesValidation.valid) {
        return { ...exercisesValidation, location: 'exercises' };
    }

    for (let index = 0; index < value.exercises.length; index += 1) {
        const exerciseValidation = GymNotesStorage.validateStructure(value.exercises[index], { type: 'object' });
        if (!exerciseValidation.valid) {
            return {
                valid: false,
                status: GymNotesStorage.STATUS.INVALID_ITEM,
                location: `exercises[${index}]`,
                validation: exerciseValidation
            };
        }
    }

    return { valid: true, status: GymNotesStorage.STATUS.VALID };
}

function loadExercisesData() {
    const readResult = GymNotesStorage.readJson(EXERCISES_STORAGE_KEY);

    if (readResult.status === GymNotesStorage.STATUS.MISSING) {
        return { data: createDefaultExercisesData(), issue: null, persistenceBlocked: false };
    }

    if (!readResult.ok) {
        return { data: createDefaultExercisesData(), issue: readResult, persistenceBlocked: true };
    }

    const validation = validateExercisesDataStructure(readResult.value);
    if (!validation.valid) {
        return {
            data: createDefaultExercisesData(),
            issue: { status: validation.status, location: validation.location, validation },
            persistenceBlocked: true
        };
    }

    return { data: readResult.value, issue: null, persistenceBlocked: false };
}

const exercisesDataLoad = loadExercisesData();
let exercisesData = exercisesDataLoad.data;
let exercisesDataStorageIssue = exercisesDataLoad.issue;
let exercisesDataPersistenceBlocked = exercisesDataLoad.persistenceBlocked;

if (exercisesDataStorageIssue) {
    console.warn('[exercises-state] sharkExercises no se ha cargado. Se usara un estado temporal sin sobrescribir el valor almacenado.', {
        status: exercisesDataStorageIssue.status,
        location: exercisesDataStorageIssue.location
    });
}

let exercisesFilter = 'Todos';
<<<<<<< HEAD
let exercisesSearchTerm = '';
let currentExerciseId = null;
let exerciseAutocompleteActive = false;

// Grupos por defecto
const DEFAULT_EXERCISE_GROUPS = [
    'Compuesto', 'Full Body', 'Trapecios', 'Hombros', 'Pectorales',
    'Dorsales', 'Espalda', 'Bíceps', 'Tríceps', 'Antebrazos',
    'Abdominales', 'Oblicuos', 'Glúteos', 'Abductores', 'Aductores',
    'Cuádriceps', 'Isquiotibiales', 'Gemelos'
];

// ==========================================================================
// FUNCIONES DE ALMACENAMIENTO
// ==========================================================================

=======
let exercisesSearchTerm = '';
let currentExerciseId = null;
let exerciseAutocompleteActive = false;

// Grupos por defecto
const DEFAULT_EXERCISE_GROUPS = [
    'Compuesto', 'Full Body', 'Trapecios', 'Hombros', 'Pectorales',
    'Dorsales', 'Espalda', 'Bíceps', 'Tríceps', 'Antebrazos',
    'Abdominales', 'Oblicuos', 'Glúteos', 'Abductores', 'Aductores',
    'Cuádriceps', 'Isquiotibiales', 'Gemelos'
];

// ==========================================================================
// FUNCIONES DE ALMACENAMIENTO
// ==========================================================================

>>>>>>> a0e06567d66fb0b2bcaca3a4ed517c8aee665a60
function saveExercises() {
    if (exercisesDataPersistenceBlocked) {
        return {
            ok: false,
            status: 'persistence-blocked',
            key: EXERCISES_STORAGE_KEY,
            cause: exercisesDataStorageIssue
        };
    }

    const validation = validateExercisesDataStructure(exercisesData);
    if (!validation.valid) {
        const result = {
            ok: false,
            status: validation.status,
            key: EXERCISES_STORAGE_KEY,
            validation
        };
        console.error('[exercises-state] No se ha guardado sharkExercises porque su estructura no es valida.', result);
        return result;
    }

    const writeResult = GymNotesStorage.writeJson(EXERCISES_STORAGE_KEY, exercisesData, {
        schema: { type: 'object', requiredKeys: ['exercises'] }
    });

    if (!writeResult.ok) {
        console.error('[exercises-state] Error al guardar sharkExercises.', writeResult);
    }

    return writeResult;
<<<<<<< HEAD
}

function getExercises() {
    return exercisesData.exercises || [];
}

=======
}

function getExercises() {
    return exercisesData.exercises || [];
}

>>>>>>> a0e06567d66fb0b2bcaca3a4ed517c8aee665a60
function setExercises(exercises) {
    exercisesData.exercises = exercises;
    return saveExercises();
}
<<<<<<< HEAD

function getExerciseGroups() {
    const exerciseGroups = new Set();
    getExercises().forEach(ex => {
        if (ex.grupo) exerciseGroups.add(ex.grupo);
    });
    return [...exerciseGroups].sort();
}

function getAllGroups() {
    const customGroups = getExerciseGroups();
    const allGroups = new Set([...DEFAULT_EXERCISE_GROUPS, ...customGroups]);
    return [...allGroups].sort();
}

function generateExerciseId() {
    return 'ex-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
}

// ==========================================================================
// FUNCIÓN PARA BUSCAR EJERCICIO POR NOMBRE
// ==========================================================================

function buscarEjercicioPorNombre(nombre) {
    if (!nombre || typeof nombre !== 'string') return null;
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) return null;
    
    const exercises = getExercises();
    // Buscar coincidencia exacta (insensible a mayúsculas)
    let ejercicio = exercises.find(ex => ex.nombre.toLowerCase() === nombreLimpio.toLowerCase());
    
    if (!ejercicio) {
        // Buscar coincidencia parcial (si el nombre contiene el texto o viceversa)
        ejercicio = exercises.find(ex => 
            ex.nombre.toLowerCase().includes(nombreLimpio.toLowerCase()) || 
            nombreLimpio.toLowerCase().includes(ex.nombre.toLowerCase())
        );
    }
    
    return ejercicio || null;
}

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.exercisesData = exercisesData;
window.exercisesFilter = exercisesFilter;
window.exercisesSearchTerm = exercisesSearchTerm;
window.currentExerciseId = currentExerciseId;
window.saveExercises = saveExercises;
window.getExercises = getExercises;
window.setExercises = setExercises;
window.getExerciseGroups = getExerciseGroups;
window.getAllGroups = getAllGroups;
window.generateExerciseId = generateExerciseId;
window.DEFAULT_EXERCISE_GROUPS = DEFAULT_EXERCISE_GROUPS;
=======

function getExerciseGroups() {
    const exerciseGroups = new Set();
    getExercises().forEach(ex => {
        if (ex.grupo) exerciseGroups.add(ex.grupo);
    });
    return [...exerciseGroups].sort();
}

function getAllGroups() {
    const customGroups = getExerciseGroups();
    const allGroups = new Set([...DEFAULT_EXERCISE_GROUPS, ...customGroups]);
    return [...allGroups].sort();
}

function generateExerciseId() {
    return 'ex-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
}

// ==========================================================================
// FUNCIÓN PARA BUSCAR EJERCICIO POR NOMBRE
// ==========================================================================

function buscarEjercicioPorNombre(nombre) {
    if (!nombre || typeof nombre !== 'string') return null;
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) return null;
    
    const exercises = getExercises();
    // Buscar coincidencia exacta (insensible a mayúsculas)
    let ejercicio = exercises.find(ex => ex.nombre.toLowerCase() === nombreLimpio.toLowerCase());
    
    if (!ejercicio) {
        // Buscar coincidencia parcial (si el nombre contiene el texto o viceversa)
        ejercicio = exercises.find(ex => 
            ex.nombre.toLowerCase().includes(nombreLimpio.toLowerCase()) || 
            nombreLimpio.toLowerCase().includes(ex.nombre.toLowerCase())
        );
    }
    
    return ejercicio || null;
}

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.exercisesData = exercisesData;
window.exercisesFilter = exercisesFilter;
window.exercisesSearchTerm = exercisesSearchTerm;
window.currentExerciseId = currentExerciseId;
window.saveExercises = saveExercises;
window.getExercises = getExercises;
window.setExercises = setExercises;
window.getExerciseGroups = getExerciseGroups;
window.getAllGroups = getAllGroups;
window.generateExerciseId = generateExerciseId;
window.DEFAULT_EXERCISE_GROUPS = DEFAULT_EXERCISE_GROUPS;
>>>>>>> a0e06567d66fb0b2bcaca3a4ed517c8aee665a60
window.buscarEjercicioPorNombre = buscarEjercicioPorNombre;
