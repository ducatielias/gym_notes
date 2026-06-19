/**
 * MÓDULO: exercises-state.js
 * Estado global y almacenamiento para el módulo de Ejercicios
 */

// ==========================================================================
// ESTADO GLOBAL
// ==========================================================================

let exercisesData = JSON.parse(localStorage.getItem('sharkExercises')) || { exercises: [] };
let exercisesFilter = 'Todos';
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

function saveExercises() {
    localStorage.setItem('sharkExercises', JSON.stringify(exercisesData));
}

function getExercises() {
    return exercisesData.exercises || [];
}

function setExercises(exercises) {
    exercisesData.exercises = exercises;
    saveExercises();
}

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