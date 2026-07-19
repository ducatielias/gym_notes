/**
 * MÓDULO: exercises-crud.js
 * CRUD de ejercicios: crear, editar, eliminar (pantalla completa)
 * 
 * MODIFICADO: Al renombrar un ejercicio, se actualiza automáticamente
 * en todas las sesiones de rutinas y en el historial.
 * 
 * MODIFICADO: Al introducir una URL de YouTube en el campo de vídeo,
 * se auto-completa la URL de la imagen con la miniatura del video.
 */

// ==========================================================================
// ABRIR / CERRAR EDITOR DE EJERCICIOS
// ==========================================================================

function openExerciseModal(id = null) {
    currentExerciseId = id;
    
    const container = document.getElementById('exercise-editor-ui');
    if (!container) {
        console.error('Contenedor exercise-editor-ui no encontrado');
        return;
    }

    const groups = getAllGroups();
    let exercise = null;

    if (id) {
        exercise = getExercises().find(ex => ex.id === id);
        if (!exercise) {
            window.showAlert('Ejercicio no encontrado.', 'Error');
            return;
        }
    }

    const exerciseName = GymNotesSafe.escapeText(exercise?.nombre ?? '');
    const exerciseId = GymNotesSafe.escapeText(exercise?.id ?? '');
    const exerciseNotes = GymNotesSafe.escapeText(exercise?.notas ?? '');
    const exerciseImage = GymNotesSafe.escapeText(exercise?.img ?? '');
    const exerciseVideo = GymNotesSafe.escapeText(exercise?.video ?? '');

    container.innerHTML = `
        <div class="exercise-editor-container">
            <div class="exercise-editor-sticky-header">
                <div class="exercise-editor-nav-top">
                    <button class="btn-exercise-nav-close gn-back-button" type="button" aria-label="Volver" onclick="closeExerciseModal()" title="Volver">
                        <i class="fa-solid fa-chevron-left"></i>
                    </button>
                    <button class="btn-exercise-nav-save" onclick="saveExerciseFromEditor()">
                        <i class="fa-solid fa-floppy-disk"></i> Guardar
                    </button>
                </div>

                <div class="exercise-editor-title-row">
                    <span class="exercise-editor-prefix">Ejercicio:</span>
                    <input type="text" id="ex-editor-nombre" class="exercise-editor-title-input" placeholder="Nombre del ejercicio (ej: Press de Banca)" value="${exerciseName}" autocomplete="off">
                </div>
            </div>

            <div class="exercise-editor-body">
                <input type="hidden" id="ex-editor-id" value="${exerciseId}">
                
                <label for="ex-editor-grupo">Grupo muscular</label>
                <select id="ex-editor-grupo">
                    ${groups.map(g => {
                        const safeGroup = GymNotesSafe.escapeText(g);
                        return `<option value="${safeGroup}" ${exercise && exercise.grupo === g ? 'selected' : ''}>${safeGroup}</option>`;
                    }).join('')}
                </select>
                
                <button type="button" class="exercise-muscles-toggle" onclick="toggleExerciseMuscles()">
                    <i class="fa-solid fa-chevron-right"></i> Músculos implicados
                </button>
                <div class="exercise-muscles-container" id="exerciseMusclesContainer">
                    <div id="exerciseMusclesCheckboxes"></div>
                </div>
                
                <label for="ex-editor-notas">Notas / Técnica</label>
                <textarea id="ex-editor-notas" placeholder="Notas, técnica, series recomendadas...">${exerciseNotes}</textarea>
                
                <label for="ex-editor-img">URL de imagen (opcional)</label>
                <input type="url" id="ex-editor-img" placeholder="https://ejemplo.com/imagen.jpg" value="${exerciseImage}" autocomplete="off">
                
                <label for="ex-editor-video">URL de vídeo (opcional)</label>
                <input type="url" id="ex-editor-video" placeholder="https://youtube.com/watch?v=..." value="${exerciseVideo}" autocomplete="off">
            </div>
        </div>
    `;

    updateExerciseMusclesEditor(exercise ? exercise.notas || '' : '');
    
    // ============================================================
    // CONFIGURAR EL AUTO-COMPLETADO DE IMAGEN DESDE URL DE VÍDEO
    // ============================================================
    configurarAutoCompletadoImagen();

    switchTab('exercise-editor');
    
    setTimeout(() => {
        const nombreInput = document.getElementById('ex-editor-nombre');
        if (nombreInput) nombreInput.focus();
    }, 300);
}

function closeExerciseModal() {
    currentExerciseId = null;
    switchTab('exercises');
}

// ==========================================================================
// EXTRAER ID DE YOUTUBE
// ==========================================================================

function extraerIdYouTube(url) {
    if (!url || typeof url !== 'string') return null;
    
    // Patrones para diferentes formatos de YouTube
    const patterns = [
        // youtube.com/watch?v=ID
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/v\/)([^#&?]*)/,
        // youtube.com/watch?feature=...&v=ID
        /[?&]v=([^#&?]*)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1] && match[1].length === 11) {
            return match[1];
        }
    }
    
    return null;
}

// ==========================================================================
// CONFIGURAR AUTO-COMPLETADO DE IMAGEN DESDE VÍDEO
// ==========================================================================

function configurarAutoCompletadoImagen() {
    const videoInput = document.getElementById('ex-editor-video');
    const imgInput = document.getElementById('ex-editor-img');
    
    if (!videoInput || !imgInput) return;
    
    // Eliminar listener anterior si existe
    if (videoInput._imageAutoCompleteListener) {
        videoInput.removeEventListener('input', videoInput._imageAutoCompleteListener);
    }
    
    // Crear nuevo listener
    const listener = function() {
        const url = this.value.trim();
        const youtubeId = extraerIdYouTube(url);
        
        // Si hay un ID de YouTube válido y el campo de imagen está vacío
        if (youtubeId && !imgInput.value.trim()) {
            const thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
            imgInput.value = thumbnailUrl;
            // Disparar evento para actualizar la interfaz
            imgInput.dispatchEvent(new Event('input', { bubbles: true }));
            console.log('[exercises-crud] Imagen auto-completada desde YouTube:', thumbnailUrl);
        }
    };
    
    videoInput._imageAutoCompleteListener = listener;
    videoInput.addEventListener('input', listener);
}

// ==========================================================================
// GUARDAR EJERCICIO (CON ACTUALIZACIÓN EN SESIONES E HISTORIAL)
// ==========================================================================

function saveExerciseFromEditor() {
    const idInput = document.getElementById('ex-editor-id');
    const nombreInput = document.getElementById('ex-editor-nombre');
    const grupoSelect = document.getElementById('ex-editor-grupo');
    const imgInput = document.getElementById('ex-editor-img');
    const videoInput = document.getElementById('ex-editor-video');
    const notasTextarea = document.getElementById('ex-editor-notas');

    const nombre = nombreInput.value.trim();
    if (!nombre) {
        window.showAlert('El nombre del ejercicio es obligatorio.', 'Campos incompletos');
        return;
    }

    const id = idInput.value || generateExerciseId();
    
    // Obtener el ejercicio antiguo (si existe)
    const oldExercise = getExercises().find(ex => ex.id === id);
    const oldNombre = oldExercise ? oldExercise.nombre : null;
    
    const exercise = {
        id: id,
        nombre: nombre,
        grupo: grupoSelect.value || 'General',
        img: imgInput.value.trim() || '',
        video: videoInput.value.trim() || '',
        notas: notasTextarea.value.trim() || ''
    };

    const exercises = getExercises();
    const nextExercises = [...exercises];
    const existingIndex = exercises.findIndex(ex => ex.id === id);
    
    // DETECTAR SI EL NOMBRE CAMBIÓ
    const nombreCambio = oldNombre !== null && oldNombre !== nombre && oldNombre !== '';
    
    if (existingIndex >= 0) {
        nextExercises[existingIndex] = exercise;
    } else {
        nextExercises.push(exercise);
    }
    
    // ============================================================
    // ACTUALIZAR EL NOMBRE EN SESIONES Y HISTORIAL SI CAMBIÓ
    // ============================================================
    if (nombreCambio) {
        console.log(`[exercises-crud] Renombrando ejercicio de "${oldNombre}" a "${nombre}"`);
        const nextExercisesData = { ...exercisesData, exercises: nextExercises };
        const persistenceResult = actualizarNombreEnSesionesYHistorial(oldNombre, nombre, nextExercisesData);
        if (!persistenceResult.ok) {
            console.error('[exercises-crud] No se ha guardado el renombrado del ejercicio:', persistenceResult);
            return persistenceResult;
        }
    } else {
        setExercises(nextExercises);
    }
    
    closeExerciseModal();
    renderExercises();
    window.showAlert(`Ejercicio "${exercise.nombre}" guardado correctamente.${nombreCambio ? ' (Renombrado en sesiones e historial)' : ''}`, 'Guardado');
}

// ==========================================================================
// ACTUALIZAR NOMBRE DEL EJERCICIO EN SESIONES E HISTORIAL
// ==========================================================================

function createRenameValidationFailure(key, validation) {
    return {
        ok: false,
        status: GymNotesStorage.STATUS.VALIDATION_FAILED,
        key,
        validation,
        storageState: 'unchanged'
    };
}

/**
 * Prepara las referencias afectadas sin mutar los estados actuales y las
 * persiste juntas mediante una transacción compensable de localStorage.
 */
function actualizarNombreEnSesionesYHistorial(oldNombre, newNombre, nextExercisesData = null) {
    let cambiosRealizados = 0;
    let cambiosHistorial = 0;
    let nextAppData = appData;
    let currentHistory = null;
    let nextHistory = null;
    const escapedOldNombre = oldNombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const exerciseNamePattern = new RegExp(escapedOldNombre, 'g');
    const blockedState = [
        { key: 'sharkExercises', blocked: exercisesDataPersistenceBlocked, cause: exercisesDataStorageIssue },
        { key: 'sharkAppData', blocked: appDataPersistenceBlocked, cause: appDataStorageIssue },
        { key: 'sharkHistory', blocked: historyDataPersistenceBlocked, cause: historyDataStorageIssue }
    ].find(state => state.blocked);

    if (blockedState) {
        return {
            ok: false,
            status: 'persistence-blocked',
            key: blockedState.key,
            cause: blockedState.cause,
            storageState: 'unchanged'
        };
    }

    try {
        if (typeof window.appData !== 'undefined' && Array.isArray(appData.routines)) {
            const nextRoutines = appData.routines.map(routine => {
                let routineChanged = false;
                const nextSessions = routine.sessions.map(session => {
                    if (!session.content || !session.content.includes(oldNombre)) {
                        return session;
                    }

                    const newContent = session.content.replace(exerciseNamePattern, newNombre);
                    if (newContent === session.content) {
                        return session;
                    }

                    routineChanged = true;
                    cambiosRealizados++;
                    return { ...session, content: newContent, lastModified: Date.now() };
                });

                return routineChanged ? { ...routine, sessions: nextSessions } : routine;
            });

            if (cambiosRealizados > 0) {
                nextAppData = { ...appData, routines: nextRoutines };
            }
        } else {
            console.warn('[exercises-crud] window.appData no disponible para actualizar sesiones');
        }

        currentHistory = getHistory();
        nextHistory = currentHistory.map(record => {
            let modified = false;
            let nextRecord = record;

            if (record.contenido_editado && record.contenido_editado.includes(oldNombre)) {
                nextRecord = { ...nextRecord, contenido_editado: record.contenido_editado.replace(exerciseNamePattern, newNombre) };
                modified = true;
                cambiosHistorial++;
            }

            if (record.contenido_original && record.contenido_original.includes(oldNombre)) {
                nextRecord = { ...nextRecord, contenido_original: record.contenido_original.replace(exerciseNamePattern, newNombre) };
                modified = true;
                cambiosHistorial++;
            }

            return modified ? nextRecord : record;
        });
    } catch (error) {
        console.error('[exercises-crud] No se ha preparado el renombrado del ejercicio:', error);
        return {
            ok: false,
            status: GymNotesStorage.STATUS.INVALID_OPERATION,
            error: error instanceof Error ? error.message : String(error),
            storageState: 'unchanged'
        };
    }

    const changes = [];
    if (nextExercisesData) {
        const exercisesValidation = validateExercisesDataStructure(nextExercisesData);
        if (!exercisesValidation.valid) {
            return createRenameValidationFailure('sharkExercises', exercisesValidation);
        }
        changes.push({
            key: 'sharkExercises',
            value: nextExercisesData,
            schema: { type: 'object', requiredKeys: ['exercises'] }
        });
    }

    if (cambiosRealizados > 0) {
        const appDataValidation = validateAppDataStructure(nextAppData);
        if (!appDataValidation.valid) {
            return createRenameValidationFailure('sharkAppData', appDataValidation);
        }
        changes.push({
            key: 'sharkAppData',
            value: nextAppData,
            schema: { type: 'object', requiredKeys: ['routines'] }
        });
    }

    if (cambiosHistorial > 0) {
        const historyValidation = validateHistoryDataStructure(nextHistory);
        if (!historyValidation.valid) {
            return createRenameValidationFailure('sharkHistory', historyValidation);
        }
        changes.push({ key: 'sharkHistory', value: nextHistory, schema: { type: 'array' } });
    }

    if (changes.length === 0) {
        return {
            ok: true,
            status: GymNotesStorage.STATUS.APPLIED,
            writtenKeys: [],
            restoredKeys: [],
            storageState: 'unchanged',
            cambiosRealizados,
            cambiosHistorial
        };
    }

    const preparedChanges = GymNotesStorage.prepareJsonChanges(changes);
    if (!preparedChanges.ok) {
        console.error('[exercises-crud] No se ha preparado el renombrado del ejercicio:', preparedChanges);
        return preparedChanges;
    }

    const persistenceResult = GymNotesStorage.applyPreparedChanges(preparedChanges);
    if (!persistenceResult.ok) {
        console.error('[exercises-crud] No se ha guardado el renombrado del ejercicio:', persistenceResult);
        return persistenceResult;
    }

    // Actualizar memoria solo tras una persistencia coordinada correcta.
    if (nextExercisesData) {
        exercisesData.exercises = nextExercisesData.exercises;
    }
    if (cambiosRealizados > 0) {
        appData.routines = nextAppData.routines;
        window.appData = appData;
        console.log(`[exercises-crud] ${cambiosRealizados} sesiones actualizadas`);
    }
    if (cambiosHistorial > 0) {
        currentHistory.splice(0, currentHistory.length, ...nextHistory);
        if (typeof window.historyDB !== 'undefined') {
            window.historyDB = currentHistory;
        }
        console.log(`[exercises-crud] ${cambiosHistorial} registros de historial actualizados`);
    }

    const totalCambios = cambiosRealizados + cambiosHistorial;
    if (totalCambios > 0) {
        console.log(`[exercises-crud] Total de cambios realizados: ${totalCambios}`);
        setTimeout(() => {
            let mensaje = `Nombre del ejercicio actualizado en:\n`;
            if (cambiosRealizados > 0) mensaje += `• ${cambiosRealizados} sesión(es)\n`;
            if (cambiosHistorial > 0) mensaje += `• ${cambiosHistorial} registro(s) del historial\n`;
            window.showAlert(mensaje, 'Actualización completada');
        }, 300);
    }

    return { ...persistenceResult, cambiosRealizados, cambiosHistorial };
}

// ==========================================================================
// ELIMINAR EJERCICIO
// ==========================================================================

async function deleteExercise(id) {
    const exercise = getExercises().find(ex => ex.id === id);
    if (!exercise) return;

    const confirm = await window.showConfirm(
        `¿Estás seguro de eliminar el ejercicio "${exercise.nombre}"?`,
        'Eliminar ejercicio'
    );
    if (!confirm) return;

    let exercises = getExercises().filter(ex => ex.id !== id);
    setExercises(exercises);
    renderExercises();
    window.showAlert(`Ejercicio "${exercise.nombre}" eliminado.`, 'Eliminado');
}

// ==========================================================================
// MÚSCULOS IMPLICADOS - GRID DE 2 COLUMNAS (EDITOR)
// ==========================================================================

function toggleExerciseMuscles() {
    const container = document.getElementById('exerciseMusclesContainer');
    const toggle = document.querySelector('.exercise-muscles-toggle');
    if (container && toggle) {
        container.classList.toggle('open');
        toggle.classList.toggle('open');
    }
}

function updateExerciseMusclesEditor(notas) {
    const container = document.getElementById('exerciseMusclesCheckboxes');
    if (!container) return;

    const groups = getAllGroups();
    const selectedMuscles = extractMusclesFromNotes(notas);

    container.innerHTML = `
        <div class="muscles-grid">
            ${groups.map(g => `
                <label class="muscle-check">
                    <input type="checkbox" value="${GymNotesSafe.escapeText(g)}" ${selectedMuscles.includes(g) ? 'checked' : ''}>
                    <span class="muscle-label">${GymNotesSafe.escapeText(g)}</span>
                </label>
            `).join('')}
        </div>
    `;

    container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', function() {
            const notasTextarea = document.getElementById('ex-editor-notas');
            if (!notasTextarea) return;
            
            const selected = Array.from(container.querySelectorAll('input[type="checkbox"]:checked'))
                .map(cb => cb.value);
            
            const nuevasNotas = updateNotesWithMuscles(notasTextarea.value, selected);
            notasTextarea.value = nuevasNotas;
            notasTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        });
    });
}

function extractMusclesFromNotes(notas) {
    if (!notas) return [];
    const regex = /^Músculos implicados:\s*(.+)$/im;
    const match = notas.match(regex);
    if (match && match[1]) {
        return match[1].split(',').map(s => s.trim()).filter(s => s.length > 0);
    }
    return [];
}

function updateNotesWithMuscles(notasOriginal, listaMusculos) {
    const lineaMusculos = `Músculos implicados: ${listaMusculos.join(', ')}`;
    if (!notasOriginal || notasOriginal.trim() === '') {
        return lineaMusculos;
    }
    const regex = /^Músculos implicados:.*$/im;
    if (regex.test(notasOriginal)) {
        return notasOriginal.replace(regex, lineaMusculos);
    } else {
        return notasOriginal.trim() + '\n\n' + lineaMusculos;
    }
}

// ==========================================================================
// OPCIONES DE EJERCICIOS
// ==========================================================================

function openExerciseOptions() {
    if (typeof window.abrirOpcionesEjercicios === 'function') {
        window.abrirOpcionesEjercicios();
        return;
    }
    
    window.showAlert(
        'Opciones de ejercicios:\n\n' +
        '• Añadir ejercicio (botón +)\n' +
        '• Editar desde cada tarjeta\n' +
        '• Eliminar desde cada tarjeta\n' +
        '• Compartir desde cada tarjeta',
        'Opciones'
    );
}

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.openExerciseModal = openExerciseModal;
window.closeExerciseModal = closeExerciseModal;
window.saveExerciseFromEditor = saveExerciseFromEditor;
window.deleteExercise = deleteExercise;
window.toggleExerciseMuscles = toggleExerciseMuscles;
window.updateExerciseMusclesEditor = updateExerciseMusclesEditor;
window.openExerciseOptions = openExerciseOptions;
window.actualizarNombreEnSesionesYHistorial = actualizarNombreEnSesionesYHistorial;
window.extraerIdYouTube = extraerIdYouTube;
window.configurarAutoCompletadoImagen = configurarAutoCompletadoImagen;
