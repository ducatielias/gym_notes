/**
 * MÓDULO: exercise-viewer.js
 * Controla la visualización de ejercicios en una ventana emergente
 * desde enlaces dentro del editor de sesiones y entrenamiento activo.
 * 
 * MODIFICADO: Ahora usa pantalla completa con header fijo, footer fijo y scroll central.
 * Guarda la pantalla de origen para volver correctamente (sesión, entrenamiento, historial o ejercicios).
 * CORREGIDO: Al abrir desde entrenamiento, oculta el modal antes de mostrar el visor.
 * CORREGIDO: Al abrir desde historial (lista o detalle), vuelve al historial.
 * 
 * MODIFICADO: Eliminado el botón "Editar" del footer, solo quedan "Vídeo" y "Buscar en web".
 * 
 * MODIFICADO: Al hacer clic en la imagen, se abre un lightbox interno en lugar de una nueva pestaña.
 */

// ==========================================================================
// VARIABLES GLOBALES
// ==========================================================================

let exerciseViewerOrigen = null; // 'session', 'workout', 'exercises', 'history', 'history-list'
let lightboxActive = false;
let activeLightboxOverlay = null;
let lightboxEscapeHandler = null;
let lightboxTriggerElement = null;
let lightboxRemovalTimer = null;

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
            const nombreBuscado = exerciseId;
            exercise = exercises.find(ex => ex.nombre === nombreBuscado);
        }
    }
    
    if (!exercise) {
        console.warn('[exercise-viewer] Ejercicio no encontrado:', exerciseId);
        window.showAlert('Ejercicio no encontrado en la base de datos.', 'Error');
        return;
    }
    
    // DETECTAR ORIGEN: desde dónde se abrió el visor
    // Verificar si estamos en entrenamiento activo
    const workoutModal = document.getElementById('active-workout');
    const isWorkoutVisible = workoutModal && workoutModal.style.display === 'flex';
    
    // Verificar si estamos en el editor de sesiones
    const editorScreen = document.getElementById('screen-editor');
    const isEditorVisible = editorScreen && !editorScreen.classList.contains('hidden');
    
    // Verificar si estamos en el detalle del historial
    const historyDetailScreen = document.getElementById('screen-history-detail');
    const isHistoryDetailVisible = historyDetailScreen && !historyDetailScreen.classList.contains('hidden');
    
    // Verificar si estamos en la lista del historial
    const historyScreen = document.getElementById('screen-history');
    const isHistoryVisible = historyScreen && !historyScreen.classList.contains('hidden');
    
    if (isWorkoutVisible) {
        exerciseViewerOrigen = 'workout';
        console.log('[exercise-viewer] Origen: entrenamiento activo');
        // OCULTAR EL MODAL DE ENTRENAMIENTO ANTES DE ABRIR EL VISOR
        workoutModal.style.display = 'none';
        console.log('[exercise-viewer] Modal de entrenamiento ocultado');
    } else if (isHistoryDetailVisible) {
        exerciseViewerOrigen = 'history-detail';
        console.log('[exercise-viewer] Origen: historial (detalle)');
    } else if (isHistoryVisible) {
        exerciseViewerOrigen = 'history-list';
        console.log('[exercise-viewer] Origen: historial (lista)');
    } else if (isEditorVisible) {
        exerciseViewerOrigen = 'session';
        console.log('[exercise-viewer] Origen: editor de sesión');
    } else {
        exerciseViewerOrigen = 'exercises';
        console.log('[exercise-viewer] Origen: página de ejercicios');
    }
    
    // Crear y mostrar el visor a pantalla completa
    mostrarVisorEjercicioCompleto(exercise);
}

function mostrarVisorEjercicioCompleto(exercise) {
    console.log('[exercise-viewer] Mostrando visor completo para:', exercise.nombre);
    
    const container = document.getElementById('screen-exercise-viewer');
    if (!container) {
        console.error('[exercise-viewer] Contenedor screen-exercise-viewer no encontrado');
        return;
    }
    
    const imageUrl = GymNotesSafe.getSafeImageUrl(exercise.img);
    const videoUrl = GymNotesSafe.getSafeExternalUrl(exercise.video);
    const hasVideo = Boolean(videoUrl);
    const imgSrc = imageUrl || getExerciseViewerPlaceholder(exercise.nombre);
    const notas = exercise.notas || 'Sin notas adicionales.';
    const exerciseName = GymNotesSafe.escapeText(exercise.nombre);
    const exerciseNameHandler = GymNotesSafe.escapeInlineHandlerArgument(exercise.nombre);
    const exerciseGroup = GymNotesSafe.escapeText(exercise.grupo || 'General');
    const imageSrcAttribute = GymNotesSafe.escapeText(imgSrc);
    const lightboxSourceHandler = GymNotesSafe.escapeInlineHandlerArgument(imgSrc);
    const placeholderHandler = GymNotesSafe.escapeInlineHandlerArgument(getExerciseViewerPlaceholder(exercise.nombre));
    const videoUrlHandler = GymNotesSafe.escapeInlineHandlerArgument(videoUrl);
    
    container.innerHTML = `
        <div class="exercise-viewer-full-container">
            <!-- HEADER FIJO -->
            <div class="exercise-viewer-full-header">
                <div class="exercise-viewer-full-nav-top">
                    <button class="btn-exercise-viewer-close" onclick="closeExerciseViewerFull()" title="Volver">
                        <i class="fa-solid fa-chevron-left"></i>
                    </button>
                    <span class="exercise-viewer-full-badge">${exerciseGroup}</span>
                </div>
                <div class="exercise-viewer-full-title-row">
                    <h2 class="exercise-viewer-full-title">${exerciseName}</h2>
                </div>
            </div>
            
            <!-- CONTENIDO SCROLLABLE -->
            <div class="exercise-viewer-full-body">
                <div class="exercise-viewer-full-image-container" onclick="openExerciseLightbox('${lightboxSourceHandler}', '${exerciseNameHandler}')">
                    <img src="${imageSrcAttribute}" 
                         class="exercise-viewer-full-image" 
                         onerror="this.src='${placeholderHandler}'"
                         alt="${exerciseName}">
                </div>
                
                <div class="exercise-viewer-full-info">
                    <div class="exercise-viewer-full-group">
                        <span class="exercise-viewer-full-label">Grupo muscular:</span>
                        <span class="exercise-viewer-full-value">${exerciseGroup}</span>
                    </div>
                    
                    <div class="exercise-viewer-full-notes">
                        <span class="exercise-viewer-full-label">Notas / Técnica:</span>
                        <div class="exercise-viewer-full-notes-content">${linkifyExerciseViewerHTML(notas)}</div>
                    </div>
                </div>
            </div>
            
            <!-- FOOTER FIJO CON 2 BOTONES -->
            <div class="exercise-viewer-full-footer">
                <button class="exercise-viewer-full-btn exercise-viewer-full-btn-video" onclick="openExerciseViewerVideo('${videoUrlHandler}')" ${!hasVideo ? 'disabled' : ''}>
                    <i class="fa-solid fa-play"></i> Vídeo
                </button>
                <button class="exercise-viewer-full-btn exercise-viewer-full-btn-web" onclick="searchExerciseOnViewerWeb('${exerciseNameHandler}')">
                    <i class="fa-solid fa-globe"></i> Buscar en web
                </button>
            </div>
        </div>
    `;
    
    // OCULTAR EL MENÚ INFERIOR
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) bottomNav.classList.add('hidden-nav');
    
    // Navegar a la pantalla del visor
    switchTab('exercise-viewer');
    
    // Asegurar que el scroll del body esté en la parte superior
    setTimeout(() => {
        const bodyEl = container.querySelector('.exercise-viewer-full-body');
        if (bodyEl) bodyEl.scrollTop = 0;
    }, 50);
}

function closeExerciseViewerFull() {
    console.log('[exercise-viewer] Cerrando visor, origen:', exerciseViewerOrigen);
    
    // Cerrar el lightbox si está abierto
    if (lightboxActive) {
        closeExerciseLightbox();
    }

    // Limpiar el contenedor
    const container = document.getElementById('screen-exercise-viewer');
    if (container) {
        container.innerHTML = '';
    }
    
    // Ocultar el visor
    const viewerScreen = document.getElementById('screen-exercise-viewer');
    if (viewerScreen) viewerScreen.classList.add('hidden');
    
    // Volver a la pantalla según el origen
    if (exerciseViewerOrigen === 'workout') {
        // Volver al entrenamiento activo
        const modal = document.getElementById('active-workout');
        if (modal) {
            modal.style.display = 'flex';
            console.log('[exercise-viewer] Modal de entrenamiento restaurado');
        }
        // Ocultar el menú inferior (el entrenamiento lo oculta)
        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav) bottomNav.classList.add('hidden-nav');
        
        // Navegar a la pantalla de hoy (donde está el entrenamiento)
        switchTab('today');
        // Re-ocultar el menú inferior
        if (bottomNav) bottomNav.classList.add('hidden-nav');
        
    } else if (exerciseViewerOrigen === 'history-detail' || exerciseViewerOrigen === 'history-list') {
        // Volver al historial (lista o detalle)
        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav) bottomNav.classList.add('hidden-nav');
        
        // Si venía del detalle, restaurar la pantalla de detalle
        if (exerciseViewerOrigen === 'history-detail') {
            const historyDetailScreen = document.getElementById('screen-history-detail');
            if (historyDetailScreen) {
                historyDetailScreen.classList.remove('hidden');
            }
            switchTab('history-detail');
        } else {
            // Si venía de la lista, ir a la lista de historial
            switchTab('history');
            // Renderizar el historial para asegurar que los datos estén actualizados
            setTimeout(() => {
                if (typeof renderHistory === 'function') {
                    renderHistory();
                }
            }, 50);
        }
        
    } else if (exerciseViewerOrigen === 'session') {
        // Volver al editor de sesiones
        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav) bottomNav.classList.add('hidden-nav');
        switchTab('editor');
        
    } else {
        // Volver a la página de ejercicios
        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav) bottomNav.classList.remove('hidden-nav');
        switchTab('exercises');
        // Asegurar que el menú inferior esté visible
        if (bottomNav) bottomNav.classList.remove('hidden-nav');
    }
    
    // Limpiar el origen
    exerciseViewerOrigen = null;
}

// Mantener la función original para compatibilidad
function closeExerciseViewer() {
    closeExerciseViewerFull();
}

// ==========================================================================
// FUNCIONES AUXILIARES
// ==========================================================================

function openExerciseViewerVideo(url) {
    const safeUrl = GymNotesSafe.getSafeExternalUrl(url);
    if (!safeUrl) {
        window.showAlert('Este ejercicio no tiene vídeo asociado.', 'Sin vídeo');
        return;
    }
    if (typeof window.verVideo === 'function') {
        window.verVideo(safeUrl);
    } else {
        window.open(safeUrl, '_blank');
    }
}

function searchExerciseOnViewerWeb(nombre) {
    const query = encodeURIComponent(`${nombre} ejercicio gimnasio técnica`);
    window.open(`https://www.google.com/search?q=${query}`, '_blank');
}

// ==========================================================================
// LIGHTBOX INTERNO PARA IMÁGENES
// ==========================================================================

function getLightboxFocusableElements(overlay) {
    const focusableSelector = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled]):not([type="hidden"])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    return Array.from(overlay.querySelectorAll(focusableSelector)).filter((element) => {
        return !element.closest('.hidden') && element.getAttribute('aria-hidden') !== 'true';
    });
}

function restoreLightboxFocus() {
    const elementToRestore = lightboxTriggerElement;
    lightboxTriggerElement = null;

    if (
        elementToRestore &&
        elementToRestore.isConnected &&
        !elementToRestore.disabled &&
        !elementToRestore.closest('.hidden') &&
        typeof elementToRestore.focus === 'function'
    ) {
        elementToRestore.focus();
    }
}

function removeLightboxKeyboardListener() {
    if (lightboxEscapeHandler) {
        document.removeEventListener('keydown', lightboxEscapeHandler);
        lightboxEscapeHandler = null;
    }
}

function handleLightboxKeydown(event) {
    const overlay = activeLightboxOverlay;
    if (!lightboxActive || !overlay) return;

    if (event.key === 'Escape') {
        event.preventDefault();
        closeExerciseLightbox();
        return;
    }

    if (event.key !== 'Tab') return;

    const focusableElements = getLightboxFocusableElements(overlay);
    if (focusableElements.length === 0) {
        event.preventDefault();
        overlay.focus();
        return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (!focusableElements.includes(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? lastElement : firstElement).focus();
    } else if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
    }
}

function handleLightboxBackdropClick(event) {
    if (event.target === event.currentTarget) {
        closeExerciseLightbox();
    }
}

function openExerciseLightbox(src, nombre) {
    console.log('[exercise-viewer] Abriendo lightbox para:', src);
    const safeSource = GymNotesSafe.getSafeLightboxImageUrl(src);
    if (!safeSource) return;
    const safeName = GymNotesSafe.escapeText(nombre || 'Ejercicio');
    const safeSourceAttribute = GymNotesSafe.escapeText(safeSource);
    const placeholderHandler = GymNotesSafe.escapeInlineHandlerArgument(getExerciseViewerPlaceholder('Imagen no disponible'));
    
    // Si ya hay un lightbox activo, cerrarlo primero
    if (lightboxActive) {
        closeExerciseLightbox();
    }

    const staleOverlay = document.getElementById('exerciseLightboxOverlay');
    if (staleOverlay) {
        staleOverlay.remove();
    }
    if (lightboxRemovalTimer) {
        clearTimeout(lightboxRemovalTimer);
        lightboxRemovalTimer = null;
    }
    
    // Crear el overlay del lightbox
    const overlay = document.createElement('div');
    overlay.className = 'exercise-lightbox-overlay';
    overlay.id = 'exerciseLightboxOverlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Visor de imagen');
    overlay.setAttribute('tabindex', '-1');
    
    // Contenido del lightbox
    overlay.innerHTML = `
        <button class="lightbox-close-btn" onclick="closeExerciseLightbox()" aria-label="Cerrar imagen">
            <i class="fa-solid fa-xmark"></i>
        </button>
        <img class="lightbox-image" src="${safeSourceAttribute}" alt="${safeName}" onerror="this.src='${placeholderHandler}'">
        <div class="lightbox-caption">${safeName}</div>
    `;
    
    // Añadir al body
    document.body.appendChild(overlay);
    activeLightboxOverlay = overlay;
    lightboxActive = true;
    const activeElement = document.activeElement;
    lightboxTriggerElement = activeElement instanceof HTMLElement && activeElement !== document.body
        ? activeElement
        : null;
    
    // Activar la animación después de un pequeño delay
    requestAnimationFrame(() => {
        if (lightboxActive && activeLightboxOverlay === overlay) {
            overlay.classList.add('visible');
        }
    });
    
    // Cerrar al hacer clic fuera de la imagen
    overlay.addEventListener('click', handleLightboxBackdropClick);

    lightboxEscapeHandler = handleLightboxKeydown;
    document.addEventListener('keydown', lightboxEscapeHandler);
    
    // Prevenir scroll del body
    document.body.style.overflow = 'hidden';

    const closeButton = overlay.querySelector('.lightbox-close-btn');
    (closeButton || overlay).focus();
}

function closeExerciseLightbox() {
    console.log('[exercise-viewer] Cerrando lightbox');
    
    const overlay = activeLightboxOverlay || document.getElementById('exerciseLightboxOverlay');
    removeLightboxKeyboardListener();
    lightboxActive = false;
    activeLightboxOverlay = null;

    if (lightboxRemovalTimer) {
        clearTimeout(lightboxRemovalTimer);
        lightboxRemovalTimer = null;
    }

    if (overlay) {
        overlay.removeEventListener('click', handleLightboxBackdropClick);
        overlay.classList.remove('visible');
        // Esperar a que termine la animación antes de eliminar
        lightboxRemovalTimer = setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            lightboxRemovalTimer = null;
        }, 350);
    }
    
    // Restaurar scroll del body
    document.body.style.overflow = '';
    restoreLightboxFocus();
}

function linkifyExerciseViewerHTML(html) {
    if (!html) return 'Sin notas adicionales.';
    return GymNotesSafe.sanitizeRichHtml(String(html).replace(/\n/g, '<br>'), { linkify: true });
}

function getExerciseViewerPlaceholder(text) {
    const safeText = GymNotesSafe.escapeText(String(text ?? '').substring(0, 30));
    return GymNotesSafe.createInternalSvgPlaceholder(`
        <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
            <rect width="200" height="200" fill="#f3f4f6"/>
            <text x="100" y="100" font-family="Arial" font-size="64" text-anchor="middle" dy=".3em" fill="#9ca3af">💪</text>
            <text x="100" y="140" font-family="Arial" font-size="14" text-anchor="middle" fill="#9ca3af">${safeText}</text>
        </svg>
    `);
}

// ==========================================================================
// DETECTAR CLIC EN EJERCICIOS POR FORMATO (negrita + color azul)
// ==========================================================================

function configurarListenerPorFormato() {
    // Eliminar listener anterior si existe
    if (window._formatLinkListener) {
        document.removeEventListener('click', window._formatLinkListener);
    }
    
    const listener = function(e) {
        const target = e.target;
        if (!target) return;
        
        let elemento = target;
        
        if (elemento.tagName !== 'STRONG') {
            elemento = target.closest('strong');
        }
        
        if (elemento && elemento.tagName === 'STRONG') {
            const textContent = elemento.textContent || '';
            
            if (textContent.length > 1) {
                const style = elemento.getAttribute('style') || '';
                const isBlue = style.includes('color: #2563eb') || 
                              style.includes('color:#2563eb') ||
                              style.includes('color: rgb(37, 99, 235)') ||
                              style.includes('color:rgb(37, 99, 235)');
                
                let computedBlue = false;
                try {
                    const computedStyle = window.getComputedStyle(elemento);
                    const color = computedStyle.color;
                    computedBlue = color === 'rgb(37, 99, 235)' || color === '#2563eb';
                } catch(e) {}
                
                if (isBlue || computedBlue) {
                    console.log('[exercise-viewer] Detectado clic en ejercicio por formato:', textContent);
                    
                    if (typeof window.getExercises === 'function') {
                        const exercises = window.getExercises();
                        let exercise = exercises.find(ex => ex.nombre === textContent);
                        if (!exercise) {
                            exercise = exercises.find(ex => ex.nombre.includes(textContent) || textContent.includes(ex.nombre));
                        }
                        if (exercise && typeof window.openExerciseViewer === 'function') {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('[exercise-viewer] Abriendo visor para:', exercise.nombre, 'ID:', exercise.id);
                            window.openExerciseViewer(exercise.id);
                            return;
                        } else {
                            console.warn('[exercise-viewer] No se encontró ejercicio con nombre:', textContent);
                        }
                    }
                }
            }
        }
    };
    
    window._formatLinkListener = listener;
    document.addEventListener('click', listener);
    console.log('[exercise-viewer] Listener por formato configurado');
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
    
    const listener = function(e) {
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
    
    configurarListenerPorFormato();
}

// ==========================================================================
// INICIALIZACIÓN
// ==========================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', configurarListenerGlobalEjercicios);
} else {
    configurarListenerGlobalEjercicios();
}

setTimeout(configurarListenerGlobalEjercicios, 500);

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.openExerciseViewer = openExerciseViewer;
window.closeExerciseViewer = closeExerciseViewer;
window.closeExerciseViewerFull = closeExerciseViewerFull;
window.openExerciseViewerVideo = openExerciseViewerVideo;
window.searchExerciseOnViewerWeb = searchExerciseOnViewerWeb;
window.openExerciseLightbox = openExerciseLightbox;
window.closeExerciseLightbox = closeExerciseLightbox;
window.linkifyExerciseViewerHTML = linkifyExerciseViewerHTML;
window.getExerciseViewerPlaceholder = getExerciseViewerPlaceholder;
window.configurarListenerGlobalEjercicios = configurarListenerGlobalEjercicios;
window.configurarListenerPorFormato = configurarListenerPorFormato;
window.mostrarVisorEjercicioCompleto = mostrarVisorEjercicioCompleto;
window.exerciseViewerOrigen = exerciseViewerOrigen;
