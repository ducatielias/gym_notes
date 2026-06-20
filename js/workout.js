/**
 * MÓDULO: workout.js
 * PUNTO DE ENTRADA del módulo de Entrenamiento Activo
 * Gestiona el entrenamiento activo: inicialización, finalización, cierre
 * y funciones de ejercicios (Formato y Ejercicios Gym)
 */

// ==========================================================================
// FUNCIONES DE RESETEO DE ESTADO
// ==========================================================================

function resetAllTimersAndState() {
    if (aw_totalTimerInterval) { clearInterval(aw_totalTimerInterval); aw_totalTimerInterval = null; }
    if (aw_descansoTimerInterval) { clearInterval(aw_descansoTimerInterval); aw_descansoTimerInterval = null; }
    if (aw_timerTrabajoInterval) { clearInterval(aw_timerTrabajoInterval); aw_timerTrabajoInterval = null; }
    if (aw_intervaloTimer) { clearInterval(aw_intervaloTimer); aw_intervaloTimer = null; }
    
    aw_totalSeconds = 0;
    aw_descansoSeconds = 60;
    aw_trabajoSeconds = 0;
    aw_descansoActivo = false;
    aw_timerActivo = false;
    aw_intervaloActivo = false;
    aw_intervaloPausado = false;
    
    actualizarDisplayTotal();
    actualizarDisplayDescanso();
    actualizarDisplayTrabajo();
    
    const btnPlayDescanso = document.getElementById('btn-descanso-play');
    const btnPauseDescanso = document.getElementById('btn-descanso-pause');
    if (btnPlayDescanso) btnPlayDescanso.style.display = 'inline-flex';
    if (btnPauseDescanso) btnPauseDescanso.style.display = 'none';
    
    const btnPlayTimer = document.getElementById('btn-timer-play');
    const btnPauseTimer = document.getElementById('btn-timer-pause');
    if (btnPlayTimer) btnPlayTimer.style.display = 'inline-flex';
    if (btnPauseTimer) btnPauseTimer.style.display = 'none';
    
    const area = document.getElementById('timer-trabajo-area');
    if (area) area.style.background = '';
}

// ==========================================================================
// FUNCIÓN PRINCIPAL: INICIAR ENTRENAMIENTO
// ==========================================================================

window.iniciarEntrenamiento = function(sessionData) {
    // Limpiar estados previos
    resetAllTimersAndState();
    
    // Destruir instancia anterior de Quill si existe
    if (aw_quillInstance) {
        aw_quillInstance = null;
    }
    
    // Guardar datos del entrenamiento actual (copia del contenido)
    aw_currentWorkout = {
        id: 'w-' + Date.now(),
        sessionId: sessionData.id,
        sessionTitle: sessionData.title,
        sessionContent: sessionData.content, // Copia del contenido original
        routineName: sessionData.routineName,
        fecha: new Date().toISOString(),
        duracion_minutos: 0
    };
    
    // Actualizar título en el modal (usando textContent, no innerHTML)
    const titleSpan = document.getElementById('aw-session-title');
    if (titleSpan) {
        titleSpan.textContent = `${aw_currentWorkout.routineName} - ${aw_currentWorkout.sessionTitle}`;
        console.log('[iniciarEntrenamiento] Título actualizado:', titleSpan.textContent);
    } else {
        console.warn('[iniciarEntrenamiento] No se encontró el elemento aw-session-title');
    }
    
    // --- CORRECCIÓN: Mostrar el modal ANTES de inicializar Quill ---
    const modal = document.getElementById('active-workout');
    if (modal) {
        modal.style.display = 'flex';
        console.log('[iniciarEntrenamiento] Modal mostrado');
    }
    
    // Configurar listeners para los paneles de temporizadores (antes de inicializar Quill)
    const timerDescansoArea = document.getElementById('timer-descanso-area');
    const timerTrabajoArea = document.getElementById('timer-trabajo-area');
    if (timerDescansoArea) {
        timerDescansoArea.onclick = (e) => {
            if (!e.target.closest('button')) togglePanel('descanso-panel');
        };
    }
    if (timerTrabajoArea) {
        timerTrabajoArea.onclick = (e) => {
            if (!e.target.closest('button')) togglePanel('timer-panel');
        };
    }
    
    // Ocultar paneles al inicio
    const descansoPanel = document.getElementById('descanso-panel');
    const timerPanel = document.getElementById('timer-panel');
    if (descansoPanel) descansoPanel.style.display = 'none';
    if (timerPanel) timerPanel.style.display = 'none';
    
    // Inicializar el editor y enlazar el botón de historial
    setTimeout(() => {
        inicializarEditorEntrenamiento();
    }, 50);
    
    // Iniciar temporizador total
    iniciarTotalTimer();
};

// ==========================================================================
// FUNCIÓN FINALIZAR ENTRENAMIENTO
// ==========================================================================

window.finalizarEntrenamiento = async function() {
    if (!aw_currentWorkout) {
        alert('No hay entrenamiento activo.');
        return;
    }
    
    // Usar modal personalizado en lugar de confirm nativo
    if (!await window.showConfirm('¿Terminar entrenamiento y guardar las anotaciones?', 'Finalizar entrenamiento')) return;
    
    // Detener todos los temporizadores
    detenerTotalTimer();
    window.pausarDescanso();
    window.pausarTimer();
    detenerIntervalo();
    
    // Obtener el contenido editado del Quill
    let contenidoEditado = obtenerContenidoEditado();
    
    // Calcular duración en minutos
    const duracionMinutos = Math.floor(aw_totalSeconds / 60);
    
    // Crear registro de historial
    const historyRecord = {
        id: aw_currentWorkout.id,
        fecha: aw_currentWorkout.fecha,
        nombre_rutina: aw_currentWorkout.routineName,
        nombre_sesion: aw_currentWorkout.sessionTitle,
        contenido_original: aw_currentWorkout.sessionContent,
        contenido_editado: contenidoEditado,
        duracion_minutos: duracionMinutos,
        timestamp_fin: new Date().toISOString()
    };
    
    // Guardar en historyDB usando la función de history-state.js
    try {
        if (typeof window.addHistoryRecord === 'function') {
            window.addHistoryRecord(historyRecord);
            console.log('[workout.js] Historial guardado correctamente mediante addHistoryRecord');
        } else {
            // Fallback: guardar directamente en localStorage
            console.warn('[workout.js] addHistoryRecord no disponible, usando fallback');
            let historyDB = JSON.parse(localStorage.getItem('sharkHistory')) || [];
            historyDB.unshift(historyRecord);
            localStorage.setItem('sharkHistory', JSON.stringify(historyDB));
            // Intentar actualizar window.historyDB
            if (window.historyDB !== undefined) {
                window.historyDB = historyDB;
            }
        }
    } catch (error) {
        console.error('[workout.js] Error guardando historial:', error);
        // Fallback de emergencia
        let historyDB = JSON.parse(localStorage.getItem('sharkHistory')) || [];
        historyDB.unshift(historyRecord);
        localStorage.setItem('sharkHistory', JSON.stringify(historyDB));
    }
    
    // Cerrar el modal de entrenamiento
    const modal = document.getElementById('active-workout');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // LIMPIAR FILTROS Y NAVEGAR AL HISTORIAL NORMAL (SIN FILTRO, SIN BOTÓN DE RETROCESO)
    // Limpiar todos los filtros
    if (typeof window.resetHistoryFilters === 'function') {
        window.resetHistoryFilters();
    } else {
        historySearchTerm = '';
        window.historySearchTerm = '';
        historyRoutineFilter = 'todos';
        window.historyRoutineFilter = 'todos';
        historyReturnScreen = null;
        window.historyReturnScreen = null;
    }
    
    // Navegar al historial normal
    switchTab('history');
    
    // Renderizar el historial después de un breve delay
    setTimeout(() => {
        // Limpiar el input visualmente
        const input = document.getElementById('historySearchInput');
        if (input) {
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        // Actualizar el select de rutinas
        const routineSelect = document.getElementById('historyRoutineFilterSelect');
        if (routineSelect) {
            routineSelect.value = 'todos';
        }
        updateHistoryClearButton();
        renderHistory();
    }, 100);
    
    // Mostrar mensaje de éxito
    if (typeof window.showAlert === 'function') {
        await window.showAlert(`Entrenamiento guardado en el historial.\nDuración: ${duracionMinutos} minutos`, "Entrenamiento completado");
    } else {
        alert(`Entrenamiento guardado. Duración: ${duracionMinutos} minutos`);
    }
    
    // Limpiar variables
    aw_currentWorkout = null;
    aw_quillInstance = null;
};

// ==========================================================================
// FUNCIÓN CERRAR ENTRENAMIENTO
// ==========================================================================

window.cerrarEntrenamiento = async function() {
    if (aw_currentWorkout) {
        if (typeof window.showConfirm === 'function') {
            const confirmar = await window.showConfirm("¿Cerrar sin guardar? Se perderán las anotaciones.", "Cancelar entrenamiento");
            if (!confirmar) return;
        } else {
            if (!confirm("¿Cerrar sin guardar? Se perderán las anotaciones.")) return;
        }
    }
    
    // Detener todos los temporizadores
    detenerTotalTimer();
    window.pausarDescanso();
    window.pausarTimer();
    detenerIntervalo();
    
    // Cerrar modal
    const modal = document.getElementById('active-workout');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // LIMPIAR FILTROS Y NAVEGAR AL HISTORIAL NORMAL (SIN FILTRO, SIN BOTÓN DE RETROCESO)
    // Limpiar todos los filtros
    if (typeof window.resetHistoryFilters === 'function') {
        window.resetHistoryFilters();
    } else {
        historySearchTerm = '';
        window.historySearchTerm = '';
        historyRoutineFilter = 'todos';
        window.historyRoutineFilter = 'todos';
        historyReturnScreen = null;
        window.historyReturnScreen = null;
    }
    
    // Navegar al historial normal
    switchTab('history');
    
    // Renderizar el historial después de un breve delay
    setTimeout(() => {
        const input = document.getElementById('historySearchInput');
        if (input) {
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const routineSelect = document.getElementById('historyRoutineFilterSelect');
        if (routineSelect) {
            routineSelect.value = 'todos';
        }
        updateHistoryClearButton();
        renderHistory();
    }, 100);
    
    aw_currentWorkout = null;
    aw_quillInstance = null;
    
    console.log('[cerrarEntrenamiento] Entrenamiento cerrado correctamente');
};

// ==========================================================================
// FUNCIONES PARA BOTONES DE FORMATO Y EJERCICIOS (entrenamiento)
// ==========================================================================

// Lista de ejercicios por defecto (copia de gym-session.js)
function obtenerListaEjerciciosPorDefecto() {
    // Obtener ejercicios desde el sistema de ejercicios
    if (typeof window.getExerciseAutocompleteList === 'function') {
        const exercises = window.getExerciseAutocompleteList('');
        if (exercises && exercises.length > 0) {
            return exercises.map(ex => ex.nombre);
        }
    }
    
    // Fallback: lista por defecto si no hay ejercicios guardados
    return [
        "Press de Banca (Barra)", "Press Inclinado (Mancuernas)", "Aperturas en Polea",
        "Fondos en Paralelas", "Sentadillas Traseras", "Prensa de Piernas",
        "Extensión de Cuádriceps", "Peso Muerto Rumano", "Curl de Piernas",
        "Elevaciones de Gemelos", "Dominadas", "Remo con Barra",
        "Jalón al Pecho", "Remo con Mancuerna", "Press Militar (Barra)",
        "Elevaciones Laterales", "Pájaros (Hombro Posterior)", "Curl de Bíceps (Barra)",
        "Curl Martillo", "Extensiones de Tríceps (Polea)", "Press Francés"
    ];
}

// Renderizar la lista de ejercicios dentro del entrenamiento
function renderExercisesListEntrenamiento(lista) {
    const listContainer = document.getElementById('aw-exercises-list');
    if (!listContainer) return;

    if (lista.length === 0) {
        listContainer.innerHTML = `<li class="no-results">No se encontraron ejercicios</li>`;
        return;
    }

    listContainer.innerHTML = lista.map(ejercicio => `
        <li class="exercise-item" onclick="insertarEjercicioEnEntrenamiento('${ejercicio.replace(/'/g, "\\'")}')">
            ${ejercicio}
        </li>
    `).join('');
}

// Filtrar ejercicios en tiempo real (entrenamiento)
function filtrarEjerciciosEntrenamiento() {
    const searchInput = document.getElementById('aw-search-exercise');
    if (!searchInput) return;

    const query = searchInput.value.toLowerCase().trim();
    
    // Usar el sistema de autocompletado de ejercicios
    if (typeof window.getExerciseAutocompleteList === 'function') {
        const exercises = window.getExerciseAutocompleteList(query);
        if (exercises && exercises.length > 0) {
            renderExercisesListEntrenamiento(exercises.map(ex => ex.nombre));
            return;
        }
    }
    
    // Fallback: usar lista por defecto
    const todosLosEjercicios = obtenerListaEjerciciosPorDefecto();
    if (query === "") {
        renderExercisesListEntrenamiento(todosLosEjercicios);
        return;
    }
    const filtrados = todosLosEjercicios.filter(ej => ej.toLowerCase().includes(query));
    renderExercisesListEntrenamiento(filtrados);
}

// Insertar el ejercicio seleccionado en el editor del entrenamiento
function insertarEjercicioEnEntrenamiento(nombreEjercicio) {
    if (!aw_quillInstance) return;

    // Obtener la posición actual del cursor
    const range = aw_quillInstance.getSelection(true);
    
    // Insertar el texto formateado en negrita seguido de un salto de línea
    aw_quillInstance.insertText(range.index, `\n• ${nombreEjercicio}: `, { 'bold': true });
    
    // Desplazar el cursor al final del bloque insertado
    aw_quillInstance.setSelection(range.index + nombreEjercicio.length + 4);
    
    // Cerrar el panel de ejercicios automáticamente
    toggleSectionEntrenamiento('exercises');
}

// Controlar la conmutación de los paneles de formato y ejercicios (entrenamiento)
window.toggleSectionEntrenamiento = function(type) {
    const toolbarWrapper = document.getElementById('aw-toolbar-wrapper');
    const exercisesWrapper = document.getElementById('aw-exercises-wrapper');
    const formatBtn = document.getElementById('aw-format-btn');
    const exercisesBtn = document.getElementById('aw-exercises-btn');

    if (!toolbarWrapper || !exercisesWrapper || !formatBtn || !exercisesBtn) return;

    // Caso A: Click en el botón de Formato
    if (type === 'format') {
        if (toolbarWrapper.classList.contains('open')) {
            toolbarWrapper.classList.remove('open');
            toolbarWrapper.style.maxHeight = '0px';
            formatBtn.classList.remove('active');
        } else {
            toolbarWrapper.classList.add('open');
            toolbarWrapper.style.maxHeight = '240px';
            formatBtn.classList.add('active');

            exercisesWrapper.classList.remove('open');
            exercisesWrapper.style.maxHeight = '0px';
            exercisesBtn.classList.remove('active');
        }
    }

    // Caso B: Click en el botón de Ejercicios Gym
    if (type === 'exercises') {
        if (exercisesWrapper.classList.contains('open')) {
            exercisesWrapper.classList.remove('open');
            exercisesWrapper.style.maxHeight = '0px';
            exercisesBtn.classList.remove('active');
        } else {
            exercisesWrapper.classList.add('open');
            exercisesWrapper.style.maxHeight = '240px';
            exercisesBtn.classList.add('active');
            
            // Limpiar buscador y cargar lista por defecto
            const searchInput = document.getElementById('aw-search-exercise');
            if (searchInput) searchInput.value = "";
            renderExercisesListEntrenamiento(obtenerListaEjerciciosPorDefecto());

            toolbarWrapper.classList.remove('open');
            toolbarWrapper.style.maxHeight = '0px';
            formatBtn.classList.remove('active');
        }
    }
};

// ==========================================================================
// EXPOSICIÓN GLOBAL DE FUNCIONES PRINCIPALES
// ==========================================================================

window.resetAllTimersAndState = resetAllTimersAndState;