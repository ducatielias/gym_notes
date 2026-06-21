/**
 * MÓDULO: workout-editor.js
 * Controla el editor Quill y la gestión del botón de historial en el entrenamiento
 * 
 * MODIFICADO: Añadido listener para clics en ejercicios dentro del editor del entrenamiento
 * usando un listener a nivel de documento para mayor fiabilidad.
 * CORREGIDO: Detección mejorada para enlaces .exercise-link.
 */

// ==========================================================================
// FUNCIÓN PARA INICIALIZAR QUILL Y ENLAZAR EL BOTÓN DE HISTORIAL
// ==========================================================================

function inicializarEditorEntrenamiento() {
    // Limpiar y preparar el contenedor del editor
    const container = document.getElementById('aw-editor-container');
    if (!container) {
        console.error('[inicializarEditorEntrenamiento] Contenedor aw-editor-container no encontrado');
        return;
    }
    
    // Crear el elemento donde se montará Quill (solo el contenido del editor, NO el header)
    container.innerHTML = '<div id="aw-quill-editor" style="height: 100%;"></div>';
    
    // Inicializar Quill en modo edición (sin toolbar fija, usará la del contenedor expandible)
    aw_quillInstance = new Quill('#aw-quill-editor', {
        theme: 'snow',
        modules: {
            toolbar: '#aw-toolbar-container'  // Enlazado al contenedor de herramientas del entrenamiento
        },
        placeholder: 'Anota aquí tus series, repeticiones, sensaciones...'
    });
    
    // Cargar el contenido original (copia)
    if (aw_currentWorkout && aw_currentWorkout.sessionContent) {
        aw_quillInstance.clipboard.dangerouslyPasteHTML(aw_currentWorkout.sessionContent);
    }
    
    // Habilitar edición
    aw_quillInstance.enable();
    aw_quillInstance.focus();
    
    console.log('[inicializarEditorEntrenamiento] Quill inicializado correctamente');
    
    // ============================================================
    // ENLAZAR EL BOTÓN DE HISTORIAL POR JS
    // ============================================================
    const historyBtn = document.getElementById('aw-history-btn');
    if (historyBtn) {
        // Eliminar listeners previos
        historyBtn.onclick = null;
        // Asignar directamente la función global
        historyBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('[Workout] Botón de historial pulsado (click enlazado por JS)');
            // Verificar que aw_currentWorkout existe
            if (!aw_currentWorkout) {
                console.warn('[Workout] aw_currentWorkout es null, intentando recuperar...');
                // Intentar recuperar el título desde el DOM
                const titleSpan = document.getElementById('aw-session-title');
                if (titleSpan && titleSpan.textContent) {
                    const titleText = titleSpan.textContent;
                    const parts = titleText.split(' - ');
                    if (parts.length === 2) {
                        // Reconstruir aw_currentWorkout temporalmente
                        aw_currentWorkout = {
                            sessionTitle: parts[1] || 'Sesión',
                            routineName: parts[0] || 'Rutina'
                        };
                        console.log('[Workout] aw_currentWorkout reconstruido:', aw_currentWorkout);
                    }
                }
            }
            // Llamar a la función global
            if (typeof window.mostrarHistorialEntrenamientoActual === 'function') {
                window.mostrarHistorialEntrenamientoActual();
            } else {
                console.error('[Workout] window.mostrarHistorialEntrenamientoActual no es una función');
                alert('Error: La función de historial no está disponible.');
            }
        };
        console.log('[Workout] Evento de historial enlazado correctamente al botón.');
    } else {
        console.warn('[Workout] No se encontró el botón #aw-history-btn para enlazar el evento');
    }
    
    // ============================================================
    // CONFIGURAR LISTENER GLOBAL PARA CLICS EN EJERCICIOS (HIPERENLACES)
    // ============================================================
    configurarListenerGlobalEjerciciosEnEntrenamiento();
}

function obtenerContenidoEditado() {
    if (aw_quillInstance) {
        return aw_quillInstance.getSemanticHTML();
    }
    return '';
}

function resetearEditorEntrenamiento() {
    if (aw_quillInstance) {
        aw_quillInstance = null;
    }
}

// ==========================================================================
// CONFIGURAR LISTENER GLOBAL PARA CLICS EN EJERCICIOS EN ENTRENAMIENTO
// ==========================================================================

function configurarListenerGlobalEjerciciosEnEntrenamiento() {
    // Eliminar listener anterior si existe
    if (window._workoutExerciseListener) {
        document.removeEventListener('click', window._workoutExerciseListener);
        console.log('[workout] Listener global de ejercicios anterior eliminado');
    }
    
    // Crear nuevo listener a nivel de documento
    const listener = function(e) {
        // Verificar que el entrenamiento activo esté visible
        const workoutModal = document.getElementById('active-workout');
        if (!workoutModal || workoutModal.style.display !== 'flex') {
            return;
        }
        
        // Verificar que el clic sea dentro del área del editor de Quill
        const editorArea = document.querySelector('#aw-editor-container .ql-editor');
        if (!editorArea || !editorArea.contains(e.target)) {
            return;
        }
        
        // 1. BUSCAR POR CLASE .exercise-link (más fiable)
        let target = e.target.closest('.exercise-link');
        
        if (target) {
            const exerciseId = target.getAttribute('data-exercise-id');
            if (exerciseId) {
                console.log('[workout] Detectado clic en exercise-link (por clase):', exerciseId);
                e.preventDefault();
                e.stopPropagation();
                if (typeof window.openExerciseViewer === 'function') {
                    window.openExerciseViewer(exerciseId);
                    return;
                }
            }
        }
        
        // 2. FALLBACK: Buscar por elemento strong con color azul
        let elemento = e.target;
        if (elemento.tagName !== 'STRONG') {
            elemento = e.target.closest('strong');
        }
        
        if (elemento && elemento.tagName === 'STRONG') {
            const textContent = elemento.textContent || '';
            
            if (textContent.length > 1) {
                // Verificar si el strong tiene color azul
                let isBlue = false;
                
                // Verificar estilo inline
                const style = elemento.getAttribute('style') || '';
                isBlue = style.includes('color: #2563eb') || 
                         style.includes('color:#2563eb') ||
                         style.includes('color: rgb(37, 99, 235)') ||
                         style.includes('color:rgb(37, 99, 235)') ||
                         style.includes('color: #3b82f6') ||
                         style.includes('color:#3b82f6');
                
                // Verificar estilo computado
                try {
                    const computedStyle = window.getComputedStyle(elemento);
                    const color = computedStyle.color;
                    isBlue = isBlue || 
                             color === 'rgb(37, 99, 235)' || 
                             color === '#2563eb' || 
                             color === 'rgb(59, 130, 246)' ||
                             color === '#3b82f6';
                } catch(err) {}
                
                if (isBlue) {
                    console.log('[workout] Detectado clic en ejercicio por formato (strong):', textContent);
                    
                    if (typeof window.getExercises === 'function') {
                        const exercises = window.getExercises();
                        let exercise = exercises.find(ex => ex.nombre === textContent);
                        if (!exercise) {
                            exercise = exercises.find(ex => ex.nombre.includes(textContent) || textContent.includes(ex.nombre));
                        }
                        if (exercise && typeof window.openExerciseViewer === 'function') {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('[workout] Abriendo visor para:', exercise.nombre, 'ID:', exercise.id);
                            window.openExerciseViewer(exercise.id);
                            return;
                        }
                    }
                }
            }
        }
    };
    
    window._workoutExerciseListener = listener;
    document.addEventListener('click', listener);
    console.log('[workout] Listener global de ejercicios configurado');
}

// ==========================================================================
// FUNCIÓN PARA FORZAR LA RECONFIGURACIÓN DEL LISTENER (útil después de recargar)
// ==========================================================================

function reconfigurarListenerEjerciciosEntrenamiento() {
    configurarListenerGlobalEjerciciosEnEntrenamiento();
    console.log('[workout] Listener de ejercicios reconfigurado');
}