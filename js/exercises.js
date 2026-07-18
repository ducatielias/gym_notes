<<<<<<< HEAD
/**
 * MÓDULO: exercises.js
 * PUNTO DE ENTRADA del módulo de Ejercicios
 * Coordina la inicialización y las funciones de integración con el editor
 */

// ==========================================================================
// INICIALIZACIÓN
// ==========================================================================

function initExercisesPage() {
    renderExercises();

    const input = document.getElementById('exercisesSearchInput');
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                clearExercisesSearch();
            }
        });
    }
}

// ==========================================================================
// FUNCIONES PARA EL BOTÓN "EJERCICIOS GYM" DEL EDITOR
// ==========================================================================

window.getExerciseAutocompleteList = function(searchTerm) {
    const exercises = getExercises();
    const term = searchTerm.toLowerCase().trim();
    if (!term) return exercises.slice(0, 8);
    
    return exercises
        .filter(ex => 
            ex.nombre.toLowerCase().includes(term) ||
            (ex.grupo && ex.grupo.toLowerCase().includes(term))
        )
        .slice(0, 8);
};

window.insertExerciseFromAutocomplete = function(exerciseName, editorInstance) {
    if (!editorInstance || typeof editorInstance.insertText !== 'function') return;
    
    const range = editorInstance.getSelection(true);
    const text = `\n• ${exerciseName}: `;
    editorInstance.insertText(range.index, text, { 'bold': true });
    editorInstance.setSelection(range.index + exerciseName.length + 4);
};

// ==========================================================================
// FUNCIONES DE INTEGRACIÓN PARA EL EDITOR DE SESIONES
// ==========================================================================

function getExerciseListForEditor() {
    return getExercises().map(ex => ex.nombre);
}

function getExerciseSuggestions(searchTerm) {
    const exercises = getExercises();
    const term = searchTerm.toLowerCase().trim();
    if (!term) return exercises.slice(0, 8);
    
    return exercises
        .filter(ex => 
            ex.nombre.toLowerCase().includes(term) ||
            (ex.grupo && ex.grupo.toLowerCase().includes(term))
        )
        .slice(0, 8);
}

function insertExerciseIntoEditor(exerciseName, editorInstance) {
    if (!editorInstance || typeof editorInstance.insertText !== 'function') return;
    
    const range = editorInstance.getSelection(true);
    const text = `\n• ${exerciseName}: `;
    editorInstance.insertText(range.index, text, { 'bold': true });
    editorInstance.setSelection(range.index + exerciseName.length + 4);
}

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.initExercisesPage = initExercisesPage;
window.getExerciseListForEditor = getExerciseListForEditor;
window.getExerciseSuggestions = getExerciseSuggestions;
=======
/**
 * MÓDULO: exercises.js
 * PUNTO DE ENTRADA del módulo de Ejercicios
 * Coordina la inicialización y las funciones de integración con el editor
 */

// ==========================================================================
// INICIALIZACIÓN
// ==========================================================================

function initExercisesPage() {
    renderExercises();

    const input = document.getElementById('exercisesSearchInput');
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                clearExercisesSearch();
            }
        });
    }
}

// ==========================================================================
// FUNCIONES PARA EL BOTÓN "EJERCICIOS GYM" DEL EDITOR
// ==========================================================================

window.getExerciseAutocompleteList = function(searchTerm) {
    const exercises = getExercises();
    const term = searchTerm.toLowerCase().trim();
    if (!term) return exercises.slice(0, 8);
    
    return exercises
        .filter(ex => 
            ex.nombre.toLowerCase().includes(term) ||
            (ex.grupo && ex.grupo.toLowerCase().includes(term))
        )
        .slice(0, 8);
};

window.insertExerciseFromAutocomplete = function(exerciseName, editorInstance) {
    if (!editorInstance || typeof editorInstance.insertText !== 'function') return;
    
    const range = editorInstance.getSelection(true);
    const text = `\n• ${exerciseName}: `;
    editorInstance.insertText(range.index, text, { 'bold': true });
    editorInstance.setSelection(range.index + exerciseName.length + 4);
};

// ==========================================================================
// FUNCIONES DE INTEGRACIÓN PARA EL EDITOR DE SESIONES
// ==========================================================================

function getExerciseListForEditor() {
    return getExercises().map(ex => ex.nombre);
}

function getExerciseSuggestions(searchTerm) {
    const exercises = getExercises();
    const term = searchTerm.toLowerCase().trim();
    if (!term) return exercises.slice(0, 8);
    
    return exercises
        .filter(ex => 
            ex.nombre.toLowerCase().includes(term) ||
            (ex.grupo && ex.grupo.toLowerCase().includes(term))
        )
        .slice(0, 8);
}

function insertExerciseIntoEditor(exerciseName, editorInstance) {
    if (!editorInstance || typeof editorInstance.insertText !== 'function') return;
    
    const range = editorInstance.getSelection(true);
    const text = `\n• ${exerciseName}: `;
    editorInstance.insertText(range.index, text, { 'bold': true });
    editorInstance.setSelection(range.index + exerciseName.length + 4);
}

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.initExercisesPage = initExercisesPage;
window.getExerciseListForEditor = getExerciseListForEditor;
window.getExerciseSuggestions = getExerciseSuggestions;
>>>>>>> a0e06567d66fb0b2bcaca3a4ed517c8aee665a60
window.insertExerciseIntoEditor = insertExerciseIntoEditor;