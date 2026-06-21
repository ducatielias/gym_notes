/**
 * MÓDULO: workout.js
 * PUNTO DE ENTRADA del módulo de Entrenamiento Activo
 * Gestiona el entrenamiento activo: inicialización, finalización, cierre
 * y funciones de ejercicios (Formato y Ejercicios Gym)
 * 
 * MODIFICADO: Los ejercicios insertados usan formato nativo de Quill
 * y se detectan por texto para abrir el visor.
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
        // Configurar listener global para ejercicios
        if (typeof window.configurarListenerGlobalEjercicios === 'function') {
            window.configurarListenerGlobalEjercicios();
        }
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

// Obtener lista de ejercicios SOLO desde la base de datos (para entrenamiento)
function obtenerListaEjerciciosDesdeBD() {
    // Obtener ejercicios desde el sistema de ejercicios
    if (typeof window.getExerciseAutocompleteList === 'function') {
        const exercises = window.getExerciseAutocompleteList('');
        if (exercises && exercises.length > 0) {
            return exercises;
        }
    }
    
    // Si no hay ejercicios en la base de datos, devolver array vacío
    return [];
}

// Renderizar la lista de ejercicios dentro del entrenamiento
function renderExercisesListEntrenamiento(lista) {
    const listContainer = document.getElementById('aw-exercises-list');
    if (!listContainer) return;

    if (!lista || lista.length === 0) {
        listContainer.innerHTML = `<li class="no-results">No hay ejercicios guardados. <br>Ve a la pestaña "Ejercicios" para crear uno.</li>`;
        return;
    }

    // Obtener la URL de la imagen o usar un placeholder
    listContainer.innerHTML = lista.map(ejercicio => {
        const imgSrc = ejercicio.img || getPlaceholderImage(ejercicio.nombre);
        const nombreEscapado = ejercicio.nombre.replace(/'/g, "\\'");
        const idEscapado = ejercicio.id.replace(/'/g, "\\'");
        
        return `
            <li class="exercise-item" onclick="insertarEjercicioEnEntrenamiento('${nombreEscapado}', '${idEscapado}')">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <img src="${imgSrc}" 
                         style="width: 32px; height: 32px; border-radius: 8px; object-fit: cover; background: #f3f4f6; flex-shrink: 0;" 
                         onerror="this.src='${getPlaceholderImage(ejercicio.nombre)}'"
                         alt="${ejercicio.nombre}">
                    <span>${ejercicio.nombre}</span>
                </div>
            </li>
        `;
    }).join('');
}

// Función para obtener imagen placeholder (entrenamiento)
function getPlaceholderImage(text) {
    return 'data:image/svg+xml,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
            <rect width="32" height="32" fill="#f3f4f6" rx="8"/>
            <text x="16" y="20" font-family="Arial" font-size="16" text-anchor="middle" fill="#9ca3af">💪</text>
        </svg>
    `);
}

// Filtrar ejercicios en tiempo real (entrenamiento) - SOLO desde la base de datos
function filtrarEjerciciosEntrenamiento() {
    const searchInput = document.getElementById('aw-search-exercise');
    if (!searchInput) return;

    const query = searchInput.value.toLowerCase().trim();
    
    // Usar el sistema de autocompletado de ejercicios SOLO de la base de datos
    if (typeof window.getExerciseAutocompleteList === 'function') {
        const exercises = window.getExerciseAutocompleteList(query);
        if (exercises && exercises.length > 0) {
            renderExercisesListEntrenamiento(exercises);
            return;
        }
    }
    
    // Si no hay ejercicios en la base de datos o no hay coincidencias
    renderExercisesListEntrenamiento([]);
}

// Insertar el ejercicio seleccionado en el editor del entrenamiento
// MODIFICADO: Usa el formato nativo de Quill (negrita + subrayado + color)
function insertarEjercicioEnEntrenamiento(nombreEjercicio, ejercicioId) {
    if (!aw_quillInstance) {
        console.warn('[workout] Quill no está inicializado');
        return;
    }

    // Obtener la posición actual del cursor
    const range = aw_quillInstance.getSelection(true);
    if (!range) {
        console.warn('[workout] No se pudo obtener la selección de Quill');
        return;
    }
    
    // Asegurar que tenemos un ID válido
    const id = ejercicioId || nombreEjercicio;
    console.log('[workout] Insertando ejercicio:', nombreEjercicio, 'ID:', id);
    
    // Insertar el texto con formato (negrita + subrayado + color)
    aw_quillInstance.insertText(range.index, `\n• ${nombreEjercicio}: `, {
        'bold': true,
        'underline': true,
        'color': '#ccff00'
    });
    
    // Desplazar el cursor al final del bloque insertado
    const newRange = aw_quillInstance.getSelection();
    if (newRange) {
        aw_quillInstance.setSelection(newRange.index, 0);
    }
    
    // Cerrar el panel de ejercicios automáticamente
    toggleSectionEntrenamiento('exercises');
    
    console.log('[workout] Ejercicio insertado correctamente');
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
            
            // Limpiar buscador y cargar lista desde la base de datos
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
// EXPOSICIÓN GLOBAL DE FUNCIONES PRINCIPALES
// ==========================================================================

window.resetAllTimersAndState = resetAllTimersAndState;
window.insertarEjercicioEnEntrenamiento = insertarEjercicioEnEntrenamiento;