/**
 * MÓDULO: workout-editor.js
 * Controla el editor Quill y la gestión del botón de historial en el entrenamiento
 * 
 * MODIFICADO: Listener de ejercicios por texto en negrita, con resolución compartida
 * por nombre en exercise-viewer.js hasta que el contenido persista IDs semánticos.
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
        aw_quillInstance.clipboard.dangerouslyPasteHTML(GymNotesSafe.sanitizeRichHtml(aw_currentWorkout.sessionContent));
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
    // CONFIGURAR LISTENER PARA CLICS EN EJERCICIOS (DENTRO DEL EDITOR)
    // ============================================================
    configurarListenerEjerciciosEnEntrenamiento();
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
// CONFIGURAR LISTENER PARA CLICS EN EJERCICIOS EN ENTRENAMIENTO
// ==========================================================================

function configurarListenerEjerciciosEnEntrenamiento() {
    // Obtener el contenedor del editor
    const contenedorEditor = document.querySelector('#aw-editor-container .ql-editor');
    if (!contenedorEditor) {
        console.warn('[workout] Editor no encontrado, reintentando...');
        setTimeout(configurarListenerEjerciciosEnEntrenamiento, 300);
        return;
    }
    
    // Eliminar listener anterior si existe
    if (contenedorEditor._ejercicioListener) {
        contenedorEditor.removeEventListener('click', contenedorEditor._ejercicioListener);
        console.log('[workout] Listener de ejercicios anterior eliminado');
    }
    
    // Crear nuevo listener específico para el editor
    const listener = function(e) {
        // Verificar que el entrenamiento activo esté visible
        const workoutModal = document.getElementById('active-workout');
        if (!workoutModal || workoutModal.style.display !== 'flex') {
            return;
        }
        
        // Obtener el elemento clickeado
        let target = e.target;
        
        // Debe mantenerse sincronizado con el listener global del visor.
        // La identificación por texto es temporal mientras no se persistan IDs semánticos.
        const getExerciseElement = function(el) {
            if (!el || el === contenedorEditor) return null;
            return el.tagName === 'STRONG' ? el : el.closest('strong');
        };
        
        // Buscar el elemento con formato de ejercicio (subiendo en el DOM)
        let elementoEjercicio = null;
        let currentElement = target;
        
        while (currentElement && currentElement !== contenedorEditor) {
            const exerciseElement = getExerciseElement(currentElement);
            if (exerciseElement) {
                elementoEjercicio = exerciseElement;
                break;
            }
            currentElement = currentElement.parentElement;
        }
        
        // Si encontramos un elemento con formato de ejercicio
        if (elementoEjercicio) {
            // Extraer el nombre del ejercicio (texto del elemento)
            const nombreEjercicio = elementoEjercicio.textContent.trim();
            
            if (nombreEjercicio && nombreEjercicio.length > 1) {
                console.log('[workout] Detectado clic en ejercicio por formato:', nombreEjercicio);
                
                // Reutilizar el mismo criterio que el visor para contenido antiguo y nuevo.
                if (typeof window.findExerciseByInteractiveText === 'function') {
                    const ejercicio = window.findExerciseByInteractiveText(nombreEjercicio);
                    if (ejercicio && ejercicio.id) {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('[workout] Abriendo visor para:', ejercicio.nombre, 'ID:', ejercicio.id);
                        if (typeof window.openExerciseViewer === 'function') {
                            window.openExerciseViewer(ejercicio.id);
                        } else {
                            console.warn('[workout] openExerciseViewer no está disponible');
                        }
                        return;
                    } else {
                        console.warn('[workout] No se encontró ejercicio con nombre:', nombreEjercicio);
                    }
                } else {
                    console.warn('[workout] window.findExerciseByInteractiveText no está definida');
                }
            }
        }
    };
    
    // Guardar referencia al listener y añadirlo
    contenedorEditor._ejercicioListener = listener;
    contenedorEditor.addEventListener('click', listener);
    console.log('[workout] Listener de ejercicios configurado correctamente');
}

// ==========================================================================
// FUNCIÓN PARA FORZAR LA RECONFIGURACIÓN DEL LISTENER
// ==========================================================================

function reconfigurarListenerEjerciciosEntrenamiento() {
    configurarListenerEjerciciosEnEntrenamiento();
    console.log('[workout] Listener de ejercicios reconfigurado');
}
