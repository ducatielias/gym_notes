/**
 * MÓDULO: exercise-viewer.js
 * Controla la visualización de ejercicios en una ventana emergente
 * desde enlaces dentro del editor de sesiones y entrenamiento activo.
 * 
 * MODIFICADO: Añadida detección por texto para ejercicios insertados
 * con formato nativo de Quill (negrita + subrayado + color).
 */

// ==========================================================================
// ABRIR VISOR DE EJERCICIOS
// ==========================================================================

function openExerciseViewer(exerciseId) {
    console.log('[exercise-viewer] Abriendo visor para ID:', exerciseId);
    
    // Buscar el ejercicio en la base de datos
    let exercise = null;
    
    if (typeof window.getExercises === 'function') {
        const exercises = window.getExercises();
        exercise = exercises.find(ex => ex.id === exerciseId);
    }
    
    if (!exercise) {
        // Si no se encuentra por ID, intentar buscar por nombre
        if (typeof window.getExercises === 'function') {
            const exercises = window.getExercises();
            // Buscar por nombre (puede ser que el ID no esté disponible en enlaces antiguos)
            const nombreBuscado = exerciseId;
            exercise = exercises.find(ex => ex.nombre === nombreBuscado);
        }
    }
    
    if (!exercise) {
        console.warn('[exercise-viewer] Ejercicio no encontrado:', exerciseId);
        window.showAlert('Ejercicio no encontrado en la base de datos.', 'Error');
        return;
    }
    
    // Crear y mostrar el visor
    mostrarVisorEjercicio(exercise);
}

function mostrarVisorEjercicio(exercise) {
    console.log('[exercise-viewer] Mostrando visor para:', exercise.nombre);
    
    // Crear el overlay si no existe
    let overlay = document.getElementById('exercise-viewer-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'exercise-viewer-overlay';
        overlay.className = 'exercise-viewer-overlay';
        document.body.appendChild(overlay);
    }
    
    // Determinar si hay vídeo
    const hasVideo = exercise.video && exercise.video.trim() !== '';
    const imgSrc = exercise.img || getExerciseViewerPlaceholder(exercise.nombre);
    const notas = exercise.notas || 'Sin notas adicionales.';
    const nombreEscapado = exercise.nombre.replace(/'/g, "\\'");
    
    // Construir HTML del visor
    overlay.innerHTML = `
        <div class="exercise-viewer-container">
            <div class="exercise-viewer-header">
                <div class="exercise-viewer-header-top">
                    <button class="exercise-viewer-close" onclick="closeExerciseViewer()" title="Cerrar">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                    <span class="exercise-viewer-badge">${exercise.grupo || 'General'}</span>
                </div>
                <div class="exercise-viewer-title-row">
                    <h2 class="exercise-viewer-title">${exercise.nombre}</h2>
                </div>
            </div>
            
            <div class="exercise-viewer-body">
                <div class="exercise-viewer-image-container">
                    <img src="${imgSrc}" 
                         class="exercise-viewer-image" 
                         onerror="this.src='${getExerciseViewerPlaceholder(exercise.nombre)}'"
                         alt="${exercise.nombre}"
                         onclick="openExerciseLightbox('${imgSrc}')">
                </div>
                
                <div class="exercise-viewer-info">
                    <div class="exercise-viewer-group">
                        <span class="exercise-viewer-label">Grupo muscular:</span>
                        <span class="exercise-viewer-value">${exercise.grupo || 'General'}</span>
                    </div>
                    
                    <div class="exercise-viewer-notes">
                        <span class="exercise-viewer-label">Notas / Técnica:</span>
                        <div class="exercise-viewer-notes-content">${linkifyExerciseViewerHTML(notas)}</div>
                    </div>
                </div>
                
                <div class="exercise-viewer-actions">
                    <button class="exercise-viewer-btn exercise-viewer-btn-video" onclick="openExerciseViewerVideo('${exercise.video || ''}')" ${!hasVideo ? 'disabled' : ''}>
                        <i class="fa-solid fa-play"></i> Vídeo
                    </button>
                    <button class="exercise-viewer-btn exercise-viewer-btn-web" onclick="searchExerciseOnViewerWeb('${nombreEscapado}')">
                        <i class="fa-solid fa-globe"></i> Buscar en web
                    </button>
                    <button class="exercise-viewer-btn exercise-viewer-btn-edit" onclick="closeExerciseViewerAndEdit('${exercise.id}')">
                        <i class="fa-solid fa-pen"></i> Editar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Mostrar el overlay
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeExerciseViewer() {
    const overlay = document.getElementById('exercise-viewer-overlay');
    if (overlay) {
        overlay.style.display = 'none';
        overlay.innerHTML = '';
    }
    document.body.style.overflow = '';
}

function closeExerciseViewerAndEdit(exerciseId) {
    closeExerciseViewer();
    // Abrir el editor de ejercicios
    if (typeof window.openExerciseModal === 'function') {
        setTimeout(() => {
            window.openExerciseModal(exerciseId);
        }, 300);
    } else {
        window.showAlert('No se puede abrir el editor de ejercicios.', 'Error');
    }
}

function openExerciseViewerVideo(url) {
    if (!url || url.trim() === '') {
        window.showAlert('Este ejercicio no tiene vídeo asociado.', 'Sin vídeo');
        return;
    }
    if (typeof window.verVideo === 'function') {
        window.verVideo(url);
    } else {
        window.open(url, '_blank');
    }
}

function searchExerciseOnViewerWeb(nombre) {
    const query = encodeURIComponent(`${nombre} ejercicio gimnasio técnica`);
    window.open(`https://www.google.com/search?q=${query}`, '_blank');
}

function openExerciseLightbox(src) {
    if (typeof window.openLightbox === 'function') {
        window.openLightbox(src);
    } else {
        window.open(src, '_blank');
    }
}

function linkifyExerciseViewerHTML(html) {
    if (!html) return 'Sin notas adicionales.';
    const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return html.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}

function getExerciseViewerPlaceholder(text) {
    return 'data:image/svg+xml,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
            <rect width="200" height="200" fill="#f3f4f6"/>
            <text x="100" y="100" font-family="Arial" font-size="64" text-anchor="middle" dy=".3em" fill="#9ca3af">💪</text>
            <text x="100" y="140" font-family="Arial" font-size="14" text-anchor="middle" fill="#9ca3af">${text.substring(0, 30)}</text>
        </svg>
    `);
}

// ==========================================================================
// DETECTAR CLIC EN EJERCICIOS POR TEXTO (cuando no tienen clase .exercise-link)
// ==========================================================================

function configurarListenerPorTexto() {
    // Eliminar listener anterior si existe
    if (window._textLinkListener) {
        document.removeEventListener('click', window._textLinkListener);
    }
    
    const listener = function(e) {
        // Buscar si el clic fue en un elemento con formato de ejercicio
        const target = e.target;
        if (!target) return;
        
        // Verificar si el texto contiene el formato de ejercicio (negrita + subrayado + color)
        const textContent = target.textContent || '';
        const parentContent = target.parentElement ? target.parentElement.textContent || '' : '';
        
        // Buscar patrones de ejercicio: "• Nombre: " en negrita
        // El elemento puede ser strong, u, o cualquier elemento que contenga el texto
        const isExercise = 
            (textContent.includes('•') || parentContent.includes('•')) &&
            (target.tagName === 'STRONG' || target.tagName === 'U' || 
             target.closest('strong') || target.closest('u') ||
             (target.style && target.style.fontWeight === 'bold') ||
             (target.style && target.style.textDecoration === 'underline'));
        
        if (isExercise) {
            // Extraer el nombre del ejercicio
            let fullText = textContent;
            if (!fullText.includes('•') && parentContent.includes('•')) {
                fullText = parentContent;
            }
            
            // Limpiar el texto para obtener solo el nombre
            let nombre = fullText.replace('•', '').replace(':', '').trim();
            // Si hay más texto después del nombre, limitar
            const parts = nombre.split(':');
            nombre = parts[0].trim();
            
            // También verificar si hay un elemento strong que contiene el nombre
            const strongElement = target.closest('strong');
            if (strongElement && strongElement.textContent) {
                const strongText = strongElement.textContent.replace('•', '').trim();
                if (strongText.length > 0) {
                    nombre = strongText;
                }
            }
            
            // Verificar si el nombre coincide con algún ejercicio
            if (nombre && nombre.length > 1) {
                console.log('[exercise-viewer] Detectado clic en ejercicio por texto:', nombre);
                
                if (typeof window.getExercises === 'function') {
                    const exercises = window.getExercises();
                    // Buscar por nombre exacto o por coincidencia parcial
                    let exercise = exercises.find(ex => ex.nombre === nombre);
                    if (!exercise) {
                        // Buscar por coincidencia parcial (si el nombre contiene el texto)
                        exercise = exercises.find(ex => ex.nombre.includes(nombre) || nombre.includes(ex.nombre));
                    }
                    if (exercise && typeof window.openExerciseViewer === 'function') {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('[exercise-viewer] Abriendo visor para:', exercise.nombre, 'ID:', exercise.id);
                        window.openExerciseViewer(exercise.id);
                        return;
                    } else {
                        console.warn('[exercise-viewer] No se encontró ejercicio con nombre:', nombre);
                    }
                }
            }
        }
    };
    
    window._textLinkListener = listener;
    document.addEventListener('click', listener);
    console.log('[exercise-viewer] Listener por texto configurado');
}

// ==========================================================================
// CONFIGURAR LISTENER GLOBAL PARA ENLACES DE EJERCICIOS
// ==========================================================================

function configurarListenerGlobalEjercicios() {
    // Eliminar listener anterior si existe
    if (window._exerciseLinkListener) {
        document.removeEventListener('click', window._exerciseLinkListener);
        console.log('[exercise-viewer] Listener global anterior eliminado');
    }
    
    // Crear nuevo listener a nivel de documento para enlaces con clase .exercise-link
    const listener = function(e) {
        // Buscar si el clic fue en un enlace de ejercicio o en un elemento hijo
        const target = e.target.closest('.exercise-link');
        if (target) {
            e.preventDefault();
            e.stopPropagation();
            const exerciseId = target.getAttribute('data-exercise-id');
            if (exerciseId) {
                console.log('[exercise-viewer] Clic en ejercicio (listener global):', exerciseId);
                if (typeof window.openExerciseViewer === 'function') {
                    window.openExerciseViewer(exerciseId);
                } else {
                    console.warn('[exercise-viewer] openExerciseViewer no está disponible');
                }
            } else {
                console.warn('[exercise-viewer] El enlace no tiene data-exercise-id:', target);
            }
        }
    };
    
    window._exerciseLinkListener = listener;
    document.addEventListener('click', listener);
    console.log('[exercise-viewer] Listener global configurado correctamente');
    
    // También configurar el listener por texto para ejercicios con formato nativo de Quill
    configurarListenerPorTexto();
}

// ==========================================================================
// INICIALIZACIÓN
// ==========================================================================

// Configurar el listener global cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', configurarListenerGlobalEjercicios);
} else {
    configurarListenerGlobalEjercicios();
}

// También configurar cuando Quill esté listo (por si el DOM ya estaba cargado)
setTimeout(configurarListenerGlobalEjercicios, 500);

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.openExerciseViewer = openExerciseViewer;
window.closeExerciseViewer = closeExerciseViewer;
window.closeExerciseViewerAndEdit = closeExerciseViewerAndEdit;
window.openExerciseViewerVideo = openExerciseViewerVideo;
window.searchExerciseOnViewerWeb = searchExerciseOnViewerWeb;
window.openExerciseLightbox = openExerciseLightbox;
window.linkifyExerciseViewerHTML = linkifyExerciseViewerHTML;
window.getExerciseViewerPlaceholder = getExerciseViewerPlaceholder;
window.configurarListenerGlobalEjercicios = configurarListenerGlobalEjercicios;
window.configurarListenerPorTexto = configurarListenerPorTexto;