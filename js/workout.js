/**
 * MÓDULO: workout.js
 * PUNTO DE ENTRADA del módulo de Entrenamiento Activo
 * Gestiona el entrenamiento activo: inicialización, finalización, cierre.
 * 
 * CORREGIDO: Separada la lógica de cierre para evitar recursión.
 * - cerrarEntrenamiento(): maneja confirmación, cierra modal y limpia estado.
 * - liberarBloqueoEntrenamiento(): se llama desde back-handler para liberar el historial.
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
    resetAllTimersAndState();
    
    if (aw_quillInstance) {
        aw_quillInstance = null;
    }
    
    aw_currentWorkout = {
        id: 'w-' + Date.now(),
        sessionId: sessionData.id,
        sessionTitle: sessionData.title,
        sessionContent: sessionData.content,
        routineName: sessionData.routineName,
        fecha: new Date().toISOString(),
        duracion_minutos: 0
    };
    
    const titleSpan = document.getElementById('aw-session-title');
    if (titleSpan) {
        titleSpan.textContent = `${aw_currentWorkout.routineName} - ${aw_currentWorkout.sessionTitle}`;
    }
    
    const modal = document.getElementById('active-workout');
    if (modal) {
        modal.style.display = 'flex';
    }
    
    // Activar bloqueo del historial
    if (typeof window.alAbrirEntrenamiento === 'function') {
        window.alAbrirEntrenamiento();
        console.log('[iniciarEntrenamiento] Bloqueo de historial activado.');
    }
    
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
    
    const descansoPanel = document.getElementById('descanso-panel');
    const timerPanel = document.getElementById('timer-panel');
    if (descansoPanel) descansoPanel.style.display = 'none';
    if (timerPanel) timerPanel.style.display = 'none';
    
    setTimeout(() => {
        inicializarEditorEntrenamiento();
        if (typeof window.configurarListenerGlobalEjercicios === 'function') {
            window.configurarListenerGlobalEjercicios();
        }
    }, 50);
    
    iniciarTotalTimer();
};

// ==========================================================================
// FUNCIÓN FINALIZAR ENTRENAMIENTO (GUARDAR Y SALIR)
// ==========================================================================

window.finalizarEntrenamiento = async function() {
    if (!aw_currentWorkout) {
        alert('No hay entrenamiento activo.');
        return;
    }
    
    if (!await window.showConfirm('¿Terminar entrenamiento y guardar las anotaciones?', 'Finalizar entrenamiento')) return;
    
    let contenidoEditado = obtenerContenidoEditado();
    const duracionMinutos = Math.floor(aw_totalSeconds / 60);
    
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
    
    let historyDB = null;
    let previousHistory = null;
    try {
        historyDB = getHistory();
        previousHistory = [...historyDB];
        historyDB.unshift(historyRecord);

        const persistenceResult = saveHistory();
        if (!persistenceResult.ok) {
            historyDB.splice(0, historyDB.length, ...previousHistory);
            console.error('[workout.js] Error guardando historial:', persistenceResult);
            if (typeof window.showAlert === 'function') {
                await window.showAlert('No se pudo guardar el entrenamiento. Inténtalo de nuevo.', 'Error al guardar');
            }
            return persistenceResult;
        }

        if (window.historyDB !== undefined) window.historyDB = historyDB;
    } catch (error) {
        if (historyDB && previousHistory) {
            historyDB.splice(0, historyDB.length, ...previousHistory);
        }
        console.error('[workout.js] Error guardando historial:', error);
        if (typeof window.showAlert === 'function') {
            await window.showAlert('No se pudo guardar el entrenamiento. Inténtalo de nuevo.', 'Error al guardar');
        }
        return { ok: false, status: 'persistence-error', error: error instanceof Error ? error.message : String(error) };
    }
    
    detenerTotalTimer();
    window.pausarDescanso();
    window.pausarTimer();
    detenerIntervalo();
    
    // Cerrar el modal
    const modal = document.getElementById('active-workout');
    if (modal) modal.style.display = 'none';
    
    // Liberar bloqueo del historial
    if (typeof window.liberarBloqueoEntrenamiento === 'function') {
        window.liberarBloqueoEntrenamiento();
        console.log('[finalizarEntrenamiento] Bloqueo de historial liberado.');
    }
    
    // Limpiar filtros y navegar al historial
    if (typeof window.resetHistoryFilters === 'function') window.resetHistoryFilters();
    else {
        historySearchTerm = '';
        window.historySearchTerm = '';
        historyRoutineFilter = 'todos';
        window.historyRoutineFilter = 'todos';
        historyReturnScreen = null;
        window.historyReturnScreen = null;
    }
    
    switchTab('history');
    setTimeout(() => {
        const input = document.getElementById('historySearchInput');
        if (input) {
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const routineSelect = document.getElementById('historyRoutineFilterSelect');
        if (routineSelect) routineSelect.value = 'todos';
        updateHistoryClearButton();
        renderHistory();
    }, 100);
    
    if (typeof window.showAlert === 'function') {
        await window.showAlert(`Entrenamiento guardado en el historial.\nDuración: ${duracionMinutos} minutos`, "Entrenamiento completado");
    }
    
    aw_currentWorkout = null;
    aw_quillInstance = null;
};

// ==========================================================================
// FUNCIÓN CERRAR ENTRENAMIENTO (SIN GUARDAR)
// ==========================================================================

window.cerrarEntrenamiento = async function() {
    // Si hay entrenamiento activo, preguntar
    if (aw_currentWorkout) {
        const confirmar = await window.showConfirm(
            "¿Cerrar sin guardar? Se perderán las anotaciones.",
            "Cancelar entrenamiento"
        );
        if (!confirmar) return;
    }
    
    // Detener temporizadores
    detenerTotalTimer();
    window.pausarDescanso();
    window.pausarTimer();
    detenerIntervalo();
    
    // Cerrar modal
    const modal = document.getElementById('active-workout');
    if (modal) modal.style.display = 'none';
    
    // Liberar bloqueo del historial
    if (typeof window.liberarBloqueoEntrenamiento === 'function') {
        window.liberarBloqueoEntrenamiento();
        console.log('[cerrarEntrenamiento] Bloqueo de historial liberado.');
    }
    
    // Limpiar filtros y navegar al historial
    if (typeof window.resetHistoryFilters === 'function') window.resetHistoryFilters();
    else {
        historySearchTerm = '';
        window.historySearchTerm = '';
        historyRoutineFilter = 'todos';
        window.historyRoutineFilter = 'todos';
        historyReturnScreen = null;
        window.historyReturnScreen = null;
    }
    
    switchTab('history');
    setTimeout(() => {
        const input = document.getElementById('historySearchInput');
        if (input) {
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const routineSelect = document.getElementById('historyRoutineFilterSelect');
        if (routineSelect) routineSelect.value = 'todos';
        updateHistoryClearButton();
        renderHistory();
    }, 100);
    
    aw_currentWorkout = null;
    aw_quillInstance = null;
    
    console.log('[cerrarEntrenamiento] Entrenamiento cerrado correctamente');
};

// ==========================================================================
// FUNCIONES PARA BOTONES DE FORMATO Y EJERCICIOS
// ==========================================================================

function obtenerListaEjerciciosDesdeBD() {
    if (typeof window.getExercises === 'function') {
        const exercises = window.getExercises();
        if (exercises && exercises.length > 0) return exercises;
    }
    return [];
}

function renderExercisesListEntrenamiento(lista) {
    const listContainer = document.getElementById('aw-exercises-list');
    if (!listContainer) return;

    if (!lista || lista.length === 0) {
        listContainer.innerHTML = `<li class="no-results">No hay ejercicios guardados. <br>Ve a la pestaña "Ejercicios" para crear uno.</li>`;
        return;
    }

    listContainer.innerHTML = lista.map(ejercicio => {
        const placeholderImage = getPlaceholderImage(ejercicio.nombre);
        const imgSrc = GymNotesSafe.getSafeImageUrl(ejercicio.img) || placeholderImage;
        const exerciseName = GymNotesSafe.escapeText(ejercicio.nombre);
        const exerciseNameHandler = GymNotesSafe.escapeInlineHandlerArgument(ejercicio.nombre);
        const exerciseIdHandler = GymNotesSafe.escapeInlineHandlerArgument(ejercicio.id);
        const imageSrcAttribute = GymNotesSafe.escapeText(imgSrc);
        const placeholderHandler = GymNotesSafe.escapeInlineHandlerArgument(placeholderImage);
        return `
            <li class="exercise-item" onclick="insertarEjercicioEnEntrenamiento('${exerciseNameHandler}', '${exerciseIdHandler}')">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <img src="${imageSrcAttribute}" 
                         style="width: 32px; height: 32px; border-radius: 8px; object-fit: cover; background: #f3f4f6; flex-shrink: 0;" 
                         onerror="this.src='${placeholderHandler}'"
                         alt="${exerciseName}">
                    <span>${exerciseName}</span>
                </div>
            </li>
        `;
    }).join('');
}

function getPlaceholderImage(text) {
    return 'data:image/svg+xml,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
            <rect width="32" height="32" fill="#f3f4f6" rx="8"/>
            <text x="16" y="20" font-family="Arial" font-size="16" text-anchor="middle" fill="#9ca3af">💪</text>
        </svg>
    `);
}

function filtrarEjerciciosEntrenamiento() {
    const searchInput = document.getElementById('aw-search-exercise');
    if (!searchInput) return;

    const query = searchInput.value.toLowerCase().trim();
    
    if (typeof window.getExercises === 'function') {
        const exercises = window.getExercises();
        let filtered = exercises;
        if (query) {
            filtered = exercises.filter(ex => 
                ex.nombre.toLowerCase().includes(query) ||
                (ex.grupo && ex.grupo.toLowerCase().includes(query))
            );
        }
        if (filtered && filtered.length > 0) {
            renderExercisesListEntrenamiento(filtered);
            return;
        }
    }
    renderExercisesListEntrenamiento([]);
}

function insertarEjercicioEnEntrenamiento(nombreEjercicio, ejercicioId) {
    if (!aw_quillInstance) {
        console.warn('[workout] Quill no está inicializado');
        return;
    }

    const range = aw_quillInstance.getSelection(true);
    if (!range) {
        console.warn('[workout] No se pudo obtener la selección de Quill');
        return;
    }
    
    aw_quillInstance.insertText(range.index, `${nombreEjercicio}`, {
        'bold': true,
        'color': '#2563eb'
    });
    
    const newRange = aw_quillInstance.getSelection();
    if (newRange) {
        aw_quillInstance.setSelection(newRange.index, 0);
    }
    
    toggleSectionEntrenamiento('exercises');
}

window.toggleSectionEntrenamiento = function(type) {
    const toolbarWrapper = document.getElementById('aw-toolbar-wrapper');
    const exercisesWrapper = document.getElementById('aw-exercises-wrapper');
    const formatBtn = document.getElementById('aw-format-btn');
    const exercisesBtn = document.getElementById('aw-exercises-btn');

    if (!toolbarWrapper || !exercisesWrapper || !formatBtn || !exercisesBtn) return;

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

    if (type === 'exercises') {
        if (exercisesWrapper.classList.contains('open')) {
            exercisesWrapper.classList.remove('open');
            exercisesWrapper.style.maxHeight = '0px';
            exercisesBtn.classList.remove('active');
        } else {
            exercisesWrapper.classList.add('open');
            exercisesWrapper.style.maxHeight = '240px';
            exercisesBtn.classList.add('active');
            const searchInput = document.getElementById('aw-search-exercise');
            if (searchInput) searchInput.value = "";
            renderExercisesListEntrenamiento(obtenerListaEjerciciosDesdeBD());
            toolbarWrapper.classList.remove('open');
            toolbarWrapper.style.maxHeight = '0px';
            formatBtn.classList.remove('active');
        }
    }
};

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.resetAllTimersAndState = resetAllTimersAndState;
window.insertarEjercicioEnEntrenamiento = insertarEjercicioEnEntrenamiento;
window.filtrarEjerciciosEntrenamiento = filtrarEjerciciosEntrenamiento;
window.obtenerListaEjerciciosDesdeBD = obtenerListaEjerciciosDesdeBD;
window.renderExercisesListEntrenamiento = renderExercisesListEntrenamiento;
