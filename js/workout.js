/**
 * MÓDULO: workout.js
 * PUNTO DE ENTRADA del módulo de Entrenamiento Activo
 * Gestiona el entrenamiento activo: inicialización, finalización, cierre.
 * 
 * CORREGIDO: Separada la lógica de cierre para evitar recursión.
 * - cerrarEntrenamiento(): maneja confirmación, cierra modal y limpia estado.
 */

// ===========================================================================
// SINCRONIZACIÓN DEL VIEWPORT MÓVIL
// ===========================================================================

let activeWorkoutViewportFrame = null;
let stopActiveWorkoutViewportSync = null;

const ACTIVE_WORKOUT_CHROME_TOP_LOCK = 16;
const ACTIVE_WORKOUT_CHROME_MICRO_DELTA = 2;
const ACTIVE_WORKOUT_CHROME_HIDE_DISTANCE = 32;
const ACTIVE_WORKOUT_CHROME_REVEAL_DISTANCE = 12;
const ACTIVE_WORKOUT_KEYBOARD_MIN_REDUCTION = 120;

let activeWorkoutChromeScrollContainer = null;
let activeWorkoutChromeLastScrollTop = 0;
let activeWorkoutChromeDirection = 0;
let activeWorkoutChromeDistance = 0;
let activeWorkoutChromeTransitionGeneration = 0;
let activeWorkoutChromeLayoutFrame = null;
let activeWorkoutChromeLayoutSyncPending = false;
let activeWorkoutChromeTrailingHiddenState = null;

/**
 * Reinicia solo la referencia del detector para que cambios geométricos del
 * viewport no se interpreten como intención de scroll del usuario.
 */
function resetActiveWorkoutChromeScrollReference() {
    activeWorkoutChromeLastScrollTop = Math.max(
        0,
        activeWorkoutChromeScrollContainer?.scrollTop || 0
    );
    activeWorkoutChromeDirection = 0;
    activeWorkoutChromeDistance = 0;
}

/**
 * Detecta el teclado únicamente en pantallas táctiles y con un control editable
 * enfocado. Así, una variación normal del viewport no congela el detector.
 */
function isActiveWorkoutVirtualKeyboardOpen() {
    const viewport = window.visualViewport;
    const activeElement = document.activeElement;
    const isCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches;
    const isEditableFocus = activeElement?.matches?.(
        'input, textarea, select, [contenteditable="true"]'
    );

    if (!viewport || !isCoarsePointer || !isEditableFocus) return false;

    return window.innerHeight - viewport.height >= ACTIVE_WORKOUT_KEYBOARD_MIN_REDUCTION;
}

/**
 * Cambia el único estado visual del chrome superior.
 */
function setActiveWorkoutChromeHidden(hidden) {
    const modal = document.getElementById('active-workout');
    if (!modal || modal.classList.contains('aw-chrome-hidden') === hidden) return;

    const transitionGeneration = beginActiveWorkoutChromeLayoutChange();
    modal.classList.toggle('aw-chrome-hidden', hidden);
    synchronizeActiveWorkoutChromeAfterLayoutChange(transitionGeneration);
}

/**
 * Devuelve las transiciones que pueden cambiar la altura de la carcasa sticky.
 */
function getActiveWorkoutChromeLayoutAnimations(modal) {
    const animatedElements = modal.querySelectorAll(
        '.aw-collapsible-chrome, #aw-toolbar-wrapper, #aw-exercises-wrapper'
    );

    return Array.from(animatedElements).flatMap(element => {
        if (typeof element.getAnimations !== 'function') return [];
        return element.getAnimations().filter(animation => animation.playState === 'running');
    });
}

/**
 * Activa la guardia antes de alterar el layout para cubrir también el primer
 * ajuste de scroll anchoring que pueda producirse en ese mismo ciclo.
 */
function beginActiveWorkoutChromeLayoutChange() {
    resetActiveWorkoutChromeScrollReference();
    activeWorkoutChromeLayoutSyncPending = true;

    if (activeWorkoutChromeLayoutFrame !== null) {
        window.cancelAnimationFrame(activeWorkoutChromeLayoutFrame);
        activeWorkoutChromeLayoutFrame = null;
    }

    return ++activeWorkoutChromeTransitionGeneration;
}

/**
 * El chrome y sus paneles alteran la altura situada antes del contenido. Se
 * deja actuar al scroll anchoring nativo y se descartan únicamente sus deltas.
 */
function synchronizeActiveWorkoutChromeAfterLayoutChange(
    transitionGeneration,
    preservedHiddenState = null
) {
    const modal = document.getElementById('active-workout');
    if (!modal) return;

    const animations = getActiveWorkoutChromeLayoutAnimations(modal);
    const completeSynchronization = () => {
        if (transitionGeneration !== activeWorkoutChromeTransitionGeneration) return;

        activeWorkoutChromeLayoutFrame = window.requestAnimationFrame(() => {
            activeWorkoutChromeLayoutFrame = window.requestAnimationFrame(() => {
                activeWorkoutChromeLayoutFrame = null;
                if (transitionGeneration !== activeWorkoutChromeTransitionGeneration) return;

                if (preservedHiddenState !== null) {
                    modal.classList.toggle('aw-chrome-hidden', preservedHiddenState);
                    activeWorkoutChromeTrailingHiddenState = preservedHiddenState;
                }

                activeWorkoutChromeLayoutSyncPending = false;
                resetActiveWorkoutChromeScrollReference();
            });
        });
    };

    if (animations.length > 0) {
        Promise.allSettled(animations.map(animation => animation.finished)).then(completeSynchronization);
        return;
    }

    completeSynchronization();
}

/**
 * Indica si un cambio de layout propio sigue en curso.
 */
function isActiveWorkoutChromeTransitioning(modal) {
    if (activeWorkoutChromeLayoutSyncPending) return true;

    return getActiveWorkoutChromeLayoutAnimations(modal).length > 0;
}

/**
 * Interpreta únicamente cambios reales de scrollTop del propietario vertical.
 */
function handleActiveWorkoutChromeScroll() {
    const container = activeWorkoutChromeScrollContainer;
    const modal = document.getElementById('active-workout');
    if (!container || !modal) return;

    const scrollTop = Math.max(0, container.scrollTop);

    if (isActiveWorkoutVirtualKeyboardOpen()) {
        resetActiveWorkoutChromeScrollReference();
        return;
    }

    if (activeWorkoutChromeTrailingHiddenState !== null) {
        modal.classList.toggle('aw-chrome-hidden', activeWorkoutChromeTrailingHiddenState);
        activeWorkoutChromeTrailingHiddenState = null;
        resetActiveWorkoutChromeScrollReference();
        return;
    }

    if (isActiveWorkoutChromeTransitioning(modal)) {
        resetActiveWorkoutChromeScrollReference();
        return;
    }

    if (container.scrollHeight <= container.clientHeight || scrollTop <= ACTIVE_WORKOUT_CHROME_TOP_LOCK) {
        setActiveWorkoutChromeHidden(false);
        resetActiveWorkoutChromeScrollReference();
        return;
    }

    const delta = scrollTop - activeWorkoutChromeLastScrollTop;
    activeWorkoutChromeLastScrollTop = scrollTop;

    if (Math.abs(delta) < ACTIVE_WORKOUT_CHROME_MICRO_DELTA) return;

    const direction = delta > 0 ? 1 : -1;
    if (direction !== activeWorkoutChromeDirection) {
        activeWorkoutChromeDirection = direction;
        activeWorkoutChromeDistance = 0;
    }

    activeWorkoutChromeDistance += Math.abs(delta);

    if (direction > 0 && !modal.classList.contains('aw-chrome-hidden')) {
        const header = modal.querySelector('.aw-header');
        if (header?.contains(document.activeElement)) {
            activeWorkoutChromeDistance = 0;
            return;
        }

        if (activeWorkoutChromeDistance >= ACTIVE_WORKOUT_CHROME_HIDE_DISTANCE) {
            setActiveWorkoutChromeHidden(true);
            activeWorkoutChromeDistance = 0;
        }
        return;
    }

    if (
        direction < 0
        && modal.classList.contains('aw-chrome-hidden')
        && activeWorkoutChromeDistance >= ACTIVE_WORKOUT_CHROME_REVEAL_DISTANCE
    ) {
        setActiveWorkoutChromeHidden(false);
        activeWorkoutChromeDistance = 0;
    }
}

/**
 * Registra una sola vez el detector después del foco inicial de Quill.
 */
function startActiveWorkoutChromeTracking() {
    stopActiveWorkoutChromeTracking();

    const modal = document.getElementById('active-workout');
    const container = modal?.querySelector('.aw-container');
    if (!modal || modal.style.display !== 'flex' || !container) return;

    setActiveWorkoutChromeHidden(false);
    activeWorkoutChromeScrollContainer = container;
    resetActiveWorkoutChromeScrollReference();
    container.addEventListener('scroll', handleActiveWorkoutChromeScroll, { passive: true });
}

/**
 * Retira el listener y deja preparada la siguiente apertura en estado visible.
 */
function stopActiveWorkoutChromeTracking() {
    activeWorkoutChromeTransitionGeneration += 1;
    activeWorkoutChromeLayoutSyncPending = false;
    activeWorkoutChromeTrailingHiddenState = null;

    if (activeWorkoutChromeLayoutFrame !== null) {
        window.cancelAnimationFrame(activeWorkoutChromeLayoutFrame);
        activeWorkoutChromeLayoutFrame = null;
    }

    activeWorkoutChromeScrollContainer?.removeEventListener(
        'scroll',
        handleActiveWorkoutChromeScroll
    );
    activeWorkoutChromeScrollContainer = null;
    activeWorkoutChromeLastScrollTop = 0;
    activeWorkoutChromeDirection = 0;
    activeWorkoutChromeDistance = 0;
    document.getElementById('active-workout')?.classList.remove('aw-chrome-hidden');
}

/**
 * Ajusta exclusivamente la carcasa de Entrenamiento Activo al viewport visual
 * móvil, sin controlar el scroll ni la visibilidad de sus controles.
 */
function syncActiveWorkoutVisualViewport() {
    activeWorkoutViewportFrame = null;

    const modal = document.getElementById('active-workout');
    const viewport = window.visualViewport;
    if (!modal || modal.style.display !== 'flex' || !viewport) return;

    const viewportHeight = Math.round(viewport.height);
    const viewportOffsetTop = Math.max(0, Math.round(viewport.offsetTop));
    if (viewportHeight <= 0) return;

    modal.style.setProperty('--aw-visual-viewport-height', `${viewportHeight}px`);
    modal.style.setProperty('--aw-visual-viewport-offset-top', `${viewportOffsetTop}px`);
    modal.classList.add('aw-visual-viewport-active');
    resetActiveWorkoutChromeScrollReference();
}

function queueActiveWorkoutVisualViewportSync() {
    if (activeWorkoutViewportFrame !== null) return;

    activeWorkoutViewportFrame = window.requestAnimationFrame(syncActiveWorkoutVisualViewport);
}

function startActiveWorkoutVisualViewportSync() {
    stopActiveWorkoutVisualViewportSync();

    const viewport = window.visualViewport;
    const isCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches;
    if (!viewport || !isCoarsePointer) return;

    viewport.addEventListener('resize', queueActiveWorkoutVisualViewportSync);
    viewport.addEventListener('scroll', queueActiveWorkoutVisualViewportSync);
    window.addEventListener('orientationchange', queueActiveWorkoutVisualViewportSync);

    stopActiveWorkoutViewportSync = () => {
        viewport.removeEventListener('resize', queueActiveWorkoutVisualViewportSync);
        viewport.removeEventListener('scroll', queueActiveWorkoutVisualViewportSync);
        window.removeEventListener('orientationchange', queueActiveWorkoutVisualViewportSync);
        stopActiveWorkoutViewportSync = null;
    };

    queueActiveWorkoutVisualViewportSync();
}

function stopActiveWorkoutVisualViewportSync() {
    if (activeWorkoutViewportFrame !== null) {
        window.cancelAnimationFrame(activeWorkoutViewportFrame);
        activeWorkoutViewportFrame = null;
    }

    stopActiveWorkoutViewportSync?.();

    const modal = document.getElementById('active-workout');
    if (!modal) return;

    modal.classList.remove('aw-visual-viewport-active');
    modal.style.removeProperty('--aw-visual-viewport-height');
    modal.style.removeProperty('--aw-visual-viewport-offset-top');
}

// ===========================================================================
// FUNCIONES DE RESETEO DE ESTADO
// ===========================================================================

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
    stopActiveWorkoutChromeTracking();
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
        startActiveWorkoutVisualViewportSync();
    }
    
    const timerDescansoArea = document.getElementById('timer-descanso-area');
    const timerTrabajoArea = document.getElementById('timer-trabajo-area');
    if (timerDescansoArea) {
        timerDescansoArea.onclick = (e) => {
            if (!e.target.closest('button')) {
                const preserveChromeHidden = document.getElementById('active-workout')
                    ?.classList.contains('aw-chrome-hidden') || false;
                const transitionGeneration = beginActiveWorkoutChromeLayoutChange();
                togglePanel('descanso-panel');
                synchronizeActiveWorkoutChromeAfterLayoutChange(
                    transitionGeneration,
                    preserveChromeHidden
                );
            }
        };
    }
    if (timerTrabajoArea) {
        timerTrabajoArea.onclick = (e) => {
            if (!e.target.closest('button')) {
                const preserveChromeHidden = document.getElementById('active-workout')
                    ?.classList.contains('aw-chrome-hidden') || false;
                const transitionGeneration = beginActiveWorkoutChromeLayoutChange();
                togglePanel('timer-panel');
                synchronizeActiveWorkoutChromeAfterLayoutChange(
                    transitionGeneration,
                    preserveChromeHidden
                );
            }
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
        startActiveWorkoutChromeTracking();
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
    stopActiveWorkoutChromeTracking();
    
    // Cerrar el modal
    const modal = document.getElementById('active-workout');
    if (modal) modal.style.display = 'none';
    stopActiveWorkoutVisualViewportSync();
    
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
        if (!confirmar) {
            return false;
        }
    }
    
    // Detener temporizadores
    detenerTotalTimer();
    window.pausarDescanso();
    window.pausarTimer();
    detenerIntervalo();
    stopActiveWorkoutChromeTracking();
    
    // Cerrar modal
    const modal = document.getElementById('active-workout');
    if (modal) modal.style.display = 'none';
    stopActiveWorkoutVisualViewportSync();
    
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
    return true;
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

    const preserveChromeHidden = document.getElementById('active-workout')
        ?.classList.contains('aw-chrome-hidden') || false;
    const transitionGeneration = beginActiveWorkoutChromeLayoutChange();

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

    synchronizeActiveWorkoutChromeAfterLayoutChange(
        transitionGeneration,
        preserveChromeHidden
    );
};

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.resetAllTimersAndState = resetAllTimersAndState;
window.insertarEjercicioEnEntrenamiento = insertarEjercicioEnEntrenamiento;
window.filtrarEjerciciosEntrenamiento = filtrarEjerciciosEntrenamiento;
window.obtenerListaEjerciciosDesdeBD = obtenerListaEjerciciosDesdeBD;
window.renderExercisesListEntrenamiento = renderExercisesListEntrenamiento;
