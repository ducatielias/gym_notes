/**
 * MÓDULO: workout-editor.js
 * Controla el editor Quill y la gestión del botón de historial en el entrenamiento
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