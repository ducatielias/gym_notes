/**
 * MÓDULO: exercises-crud.js
 * CRUD de ejercicios: crear, editar, eliminar (pantalla completa)
 * 
 * MODIFICADO: Al renombrar un ejercicio, se actualiza automáticamente
 * en todas las sesiones de rutinas y en el historial.
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

    container.innerHTML = `
        <div class="exercise-editor-container">
            <div class="exercise-editor-sticky-header">
                <div class="exercise-editor-nav-top">
                    <button class="btn-exercise-nav-close" onclick="closeExerciseModal()" title="Volver">
                        <i class="fa-solid fa-chevron-left"></i>
                    </button>
                    <button class="btn-exercise-nav-save" onclick="saveExerciseFromEditor()">
                        <i class="fa-solid fa-floppy-disk"></i> Guardar
                    </button>
                </div>

                <div class="exercise-editor-title-row">
                    <span class="exercise-editor-prefix">Ejercicio:</span>
                    <input type="text" id="ex-editor-nombre" class="exercise-editor-title-input" placeholder="Nombre del ejercicio (ej: Press de Banca)" value="${exercise ? exercise.nombre : ''}" autocomplete="off">
                </div>
            </div>

            <div class="exercise-editor-body">
                <input type="hidden" id="ex-editor-id" value="${exercise ? exercise.id : ''}">
                
                <label for="ex-editor-grupo">Grupo muscular</label>
                <select id="ex-editor-grupo">
                    ${groups.map(g => `<option value="${g}" ${exercise && exercise.grupo === g ? 'selected' : ''}>${g}</option>`).join('')}
                </select>
                
                <button type="button" class="exercise-muscles-toggle" onclick="toggleExerciseMuscles()">
                    <i class="fa-solid fa-chevron-right"></i> Músculos implicados
                </button>
                <div class="exercise-muscles-container" id="exerciseMusclesContainer">
                    <div id="exerciseMusclesCheckboxes"></div>
                </div>
                
                <label for="ex-editor-notas">Notas / Técnica</label>
                <textarea id="ex-editor-notas" placeholder="Notas, técnica, series recomendadas...">${exercise ? exercise.notas || '' : ''}</textarea>
                
                <label for="ex-editor-img">URL de imagen (opcional)</label>
                <input type="url" id="ex-editor-img" placeholder="https://ejemplo.com/imagen.jpg" value="${exercise ? exercise.img || '' : ''}" autocomplete="off">
                
                <label for="ex-editor-video">URL de vídeo (opcional)</label>
                <input type="url" id="ex-editor-video" placeholder="https://youtube.com/watch?v=..." value="${exercise ? exercise.video || '' : ''}" autocomplete="off">
            </div>
        </div>
    `;

    updateExerciseMusclesEditor(exercise ? exercise.notas || '' : '');

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

    let exercises = getExercises();
    const existingIndex = exercises.findIndex(ex => ex.id === id);
    
    // DETECTAR SI EL NOMBRE CAMBIÓ
    const nombreCambio = oldNombre !== null && oldNombre !== nombre && oldNombre !== '';
    
    if (existingIndex >= 0) {
        exercises[existingIndex] = exercise;
    } else {
        exercises.push(exercise);
    }

    setExercises(exercises);
    
    // ============================================================
    // ACTUALIZAR EL NOMBRE EN SESIONES Y HISTORIAL SI CAMBIÓ
    // ============================================================
    if (nombreCambio) {
        console.log(`[exercises-crud] Renombrando ejercicio de "${oldNombre}" a "${nombre}"`);
        actualizarNombreEnSesionesYHistorial(oldNombre, nombre);
    }
    
    closeExerciseModal();
    renderExercises();
    window.showAlert(`Ejercicio "${exercise.nombre}" guardado correctamente.${nombreCambio ? ' (Renombrado en sesiones e historial)' : ''}`, 'Guardado');
}

// ==========================================================================
// ACTUALIZAR NOMBRE DEL EJERCICIO EN SESIONES E HISTORIAL
// ==========================================================================

function actualizarNombreEnSesionesYHistorial(oldNombre, newNombre) {
    let cambiosRealizados = 0;
    let cambiosHistorial = 0;
    
    // ------------------------------------------------------------
    // 1. ACTUALIZAR EN SESIONES DE RUTINAS
    // ------------------------------------------------------------
    if (typeof window.appData !== 'undefined' && window.appData.routines) {
        const routines = window.appData.routines;
        
        routines.forEach(routine => {
            routine.sessions.forEach(session => {
                if (session.content && session.content.includes(oldNombre)) {
                    // Reemplazar el nombre en el contenido HTML
                    const oldContent = session.content;
                    // Escapar caracteres especiales para regex
                    const escapedOldNombre = oldNombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    // Reemplazar el nombre (preservando el formato HTML)
                    const newContent = oldContent.replace(
                        new RegExp(escapedOldNombre, 'g'), 
                        newNombre
                    );
                    if (newContent !== oldContent) {
                        session.content = newContent;
                        session.lastModified = Date.now();
                        cambiosRealizados++;
                        console.log(`[exercises-crud] Actualizado en sesión: "${session.title}"`);
                    }
                }
            });
        });
        
        // Guardar los cambios en appData
        if (cambiosRealizados > 0 && typeof window.saveData === 'function') {
            window.saveData();
            console.log(`[exercises-crud] ${cambiosRealizados} sesiones actualizadas`);
        }
    } else {
        console.warn('[exercises-crud] window.appData no disponible para actualizar sesiones');
    }
    
    // ------------------------------------------------------------
    // 2. ACTUALIZAR EN HISTORIAL
    // ------------------------------------------------------------
    try {
        let historyDB = JSON.parse(localStorage.getItem('sharkHistory')) || [];
        let historialActualizado = false;
        
        historyDB = historyDB.map(record => {
            let modificado = false;
            let newRecord = { ...record };
            
            // Actualizar en contenido_editado
            if (record.contenido_editado && record.contenido_editado.includes(oldNombre)) {
                const escapedOldNombre = oldNombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                newRecord.contenido_editado = record.contenido_editado.replace(
                    new RegExp(escapedOldNombre, 'g'),
                    newNombre
                );
                modificado = true;
                cambiosHistorial++;
            }
            
            // Actualizar en contenido_original
            if (record.contenido_original && record.contenido_original.includes(oldNombre)) {
                const escapedOldNombre = oldNombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                newRecord.contenido_original = record.contenido_original.replace(
                    new RegExp(escapedOldNombre, 'g'),
                    newNombre
                );
                modificado = true;
                cambiosHistorial++;
            }
            
            return modificado ? newRecord : record;
        });
        
        if (cambiosHistorial > 0) {
            localStorage.setItem('sharkHistory', JSON.stringify(historyDB));
            // Actualizar la variable global si existe
            if (typeof window.historyDB !== 'undefined') {
                window.historyDB = historyDB;
            }
            console.log(`[exercises-crud] ${cambiosHistorial} registros de historial actualizados`);
        }
    } catch (error) {
        console.error('[exercises-crud] Error actualizando historial:', error);
    }
    
    // ------------------------------------------------------------
    // 3. NOTIFICAR AL USUARIO
    // ------------------------------------------------------------
    const totalCambios = cambiosRealizados + cambiosHistorial;
    if (totalCambios > 0) {
        console.log(`[exercises-crud] Total de cambios realizados: ${totalCambios}`);
        // Mostrar notificación después del alert principal
        setTimeout(() => {
            let mensaje = `Nombre del ejercicio actualizado en:\n`;
            if (cambiosRealizados > 0) mensaje += `• ${cambiosRealizados} sesión(es)\n`;
            if (cambiosHistorial > 0) mensaje += `• ${cambiosHistorial} registro(s) del historial\n`;
            if (totalCambios === 0) mensaje = 'No se encontraron referencias a este ejercicio en sesiones o historial.';
            window.showAlert(mensaje, 'Actualización completada');
        }, 300);
    }
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
                    <input type="checkbox" value="${g}" ${selectedMuscles.includes(g) ? 'checked' : ''}>
                    <span class="muscle-label">${g}</span>
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