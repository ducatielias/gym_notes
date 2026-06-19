/**
 * MÓDULO: plan-state.js
 * Estado global y almacenamiento para el módulo de Plan (Rutinas y Sesiones)
 */

// ==========================================================================
// ESTADO GLOBAL
// ==========================================================================

let appData = JSON.parse(localStorage.getItem('sharkAppData')) || {
    routines: []
};

let currentRoutineId = null;

// ==========================================================================
// FUNCIONES DE ALMACENAMIENTO
// ==========================================================================

function saveData() {
    localStorage.setItem('sharkAppData', JSON.stringify(appData));
}

// ==========================================================================
// EXPOSICIÓN GLOBAL (para que otros módulos puedan acceder)
// ==========================================================================

window.appData = appData;
window.currentRoutineId = currentRoutineId;
window.saveData = saveData;