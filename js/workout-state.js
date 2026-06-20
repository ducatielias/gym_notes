/**
 * MÓDULO: workout-state.js
 * Estado global y almacenamiento para el módulo de Entrenamiento Activo
 */

// ==================== VARIABLES GLOBALES ====================
let aw_currentWorkout = null;          // Datos del entrenamiento actual
let aw_quillInstance = null;            // Instancia de Quill para el entrenamiento
let aw_totalTimerInterval = null;
let aw_descansoTimerInterval = null;
let aw_timerTrabajoInterval = null;
let aw_totalSeconds = 0;
let aw_descansoSeconds = 60;
let aw_trabajoSeconds = 0;
let aw_descansoActivo = false;
let aw_timerActivo = false;
let aw_intervaloTimer = null;
let aw_rondasRestantes = 0;
let aw_tiempoTrabajoIntervalo = 20;
let aw_tiempoDescansoIntervalo = 10;
let aw_enPeriodoTrabajo = true;
let aw_intervaloActivo = false;
let aw_intervaloPausado = false;
let aw_tiempoActualIntervalo = 0;
let aw_estadoIntervaloPausado = {
    tiempoActual: 0,
    trabajo: 20,
    descanso: 10,
    rondasRestantes: 0,
    enPeriodoTrabajo: true,
    areaBackground: '#d4edda'
};
let aw_audioCtx = null;

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.aw_currentWorkout = aw_currentWorkout;
window.aw_quillInstance = aw_quillInstance;
window.aw_totalSeconds = aw_totalSeconds;
window.aw_descansoSeconds = aw_descansoSeconds;
window.aw_trabajoSeconds = aw_trabajoSeconds;