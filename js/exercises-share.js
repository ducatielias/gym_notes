<<<<<<< HEAD
/**
 * MÓDULO: exercises-share.js
 * Compartir ejercicios individuales
 */

// ==========================================================================
// COMPARTIR EJERCICIO
// ==========================================================================

async function shareExercise(id) {
    const exercise = getExercises().find(ex => ex.id === id);
    if (!exercise) return;

    const action = await window.showExerciseShareDialog(exercise);
    
    if (action === 'file') {
        exportSingleExercise(exercise);
    } else if (action === 'share') {
        shareExerciseViaWeb(exercise);
    }
}

async function shareExerciseViaWeb(exercise) {
    const data = b64EncodeUnicode(JSON.stringify({
        n: exercise.nombre,
        g: exercise.grupo || '',
        i: exercise.img || '',
        v: exercise.video || '',
        t: exercise.notas || ''
    }));
    const url = `${window.location.origin}${window.location.pathname}?share-exercise=${data}`;
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: exercise.nombre,
                text: `Ejercicio: ${exercise.nombre}`,
                url: url
            });
        } catch (e) {
            // Usuario canceló
        }
    } else {
        try {
            await navigator.clipboard.writeText(url);
            window.showAlert('Enlace copiado al portapapeles.', 'Compartir');
        } catch {
            window.showAlert(`Comparte este enlace: ${url}`, 'Compartir');
        }
    }
}

// ==========================================================================
// DIALOGO DE COMPARTIR
// ==========================================================================

=======
/**
 * MÓDULO: exercises-share.js
 * Compartir ejercicios individuales
 */

// ==========================================================================
// COMPARTIR EJERCICIO
// ==========================================================================

async function shareExercise(id) {
    const exercise = getExercises().find(ex => ex.id === id);
    if (!exercise) return;

    const action = await window.showExerciseShareDialog(exercise);
    
    if (action === 'file') {
        exportSingleExercise(exercise);
    } else if (action === 'share') {
        shareExerciseViaWeb(exercise);
    }
}

async function shareExerciseViaWeb(exercise) {
    const data = b64EncodeUnicode(JSON.stringify({
        n: exercise.nombre,
        g: exercise.grupo || '',
        i: exercise.img || '',
        v: exercise.video || '',
        t: exercise.notas || ''
    }));
    const url = `${window.location.origin}${window.location.pathname}?share-exercise=${data}`;
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: exercise.nombre,
                text: `Ejercicio: ${exercise.nombre}`,
                url: url
            });
        } catch (e) {
            // Usuario canceló
        }
    } else {
        try {
            await navigator.clipboard.writeText(url);
            window.showAlert('Enlace copiado al portapapeles.', 'Compartir');
        } catch {
            window.showAlert(`Comparte este enlace: ${url}`, 'Compartir');
        }
    }
}

// ==========================================================================
// DIALOGO DE COMPARTIR
// ==========================================================================

>>>>>>> a0e06567d66fb0b2bcaca3a4ed517c8aee665a60
/**
 * Aísla el foco y los listeners temporales de cada diálogo de compartir.
 */
const exerciseShareOverlayAccessibility = (() => {
    const overlayStates = new WeakMap();
    let instanceSequence = 0;

    const focusableSelector = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled]):not([type="hidden"])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    function isCustomModalOpen() {
        const customModal = document.getElementById('customModal');
        return customModal &&
            !customModal.classList.contains('hidden') &&
            customModal.getAttribute('aria-hidden') !== 'true';
    }

    function getFocusableElements(dialog) {
        return Array.from(dialog.querySelectorAll(focusableSelector)).filter((element) => {
            const styles = window.getComputedStyle(element);
            return !element.disabled &&
                element.getAttribute('aria-disabled') !== 'true' &&
                !element.hidden &&
                !element.closest('.hidden') &&
                element.getAttribute('aria-hidden') !== 'true' &&
                styles.display !== 'none' &&
                styles.visibility !== 'hidden';
        });
    }

    function addListener(overlay, target, type, listener, options) {
        const state = overlayStates.get(overlay);
        if (!state) return;

        target.addEventListener(type, listener, options);
        state.listeners.push({ target, type, listener, options });
    }

    function restoreFocus(state) {
        const previousFocus = state.previousFocus;
        if (
            previousFocus &&
            previousFocus.isConnected &&
            !previousFocus.disabled &&
            !previousFocus.closest('.hidden') &&
            typeof previousFocus.focus === 'function' &&
            !isCustomModalOpen()
        ) {
            previousFocus.focus();
        }
    }

    function cleanup(overlay) {
        const state = overlayStates.get(overlay);
        if (!state) return;

        state.listeners.forEach(({ target, type, listener, options }) => {
            target.removeEventListener(type, listener, options);
        });
        overlayStates.delete(overlay);
        restoreFocus(state);
    }

    function setup(overlay, { dialog, title, description, initialFocus, onEscape, onBackdrop }) {
        const instanceId = ++instanceSequence;
        const activeElement = document.activeElement;
        const previousFocus = activeElement && activeElement !== document.body ? activeElement : null;

        title.id = `exercise-share-title-${instanceId}`;
        description.id = `exercise-share-description-${instanceId}`;
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', title.id);
        dialog.setAttribute('aria-describedby', description.id);
        dialog.setAttribute('tabindex', '-1');

        overlayStates.set(overlay, { dialog, previousFocus, listeners: [] });

        const handleKeydown = (event) => {
            if (!overlay.isConnected || isCustomModalOpen()) return;

            if (event.key === 'Tab') {
                const focusableElements = getFocusableElements(dialog);
                if (focusableElements.length === 0) {
                    event.preventDefault();
                    dialog.focus();
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
            } else if (event.key === 'Escape') {
                event.preventDefault();
                onEscape();
            }
        };

        const handleBackdropClick = (event) => {
            if (event.target === overlay) {
                onBackdrop();
            }
        };

        addListener(overlay, document, 'keydown', handleKeydown);
        addListener(overlay, overlay, 'click', handleBackdropClick);

        const focusableElements = getFocusableElements(dialog);
        (focusableElements.includes(initialFocus) ? initialFocus : focusableElements[0] || dialog).focus();
    }

    return { setup, addListener, cleanup };
})();

window.showExerciseShareDialog = function(exercise) {
<<<<<<< HEAD
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'exercise-share-dialog';
        overlay.style.display = 'flex';
        overlay.style.zIndex = '3000';
        
        overlay.innerHTML = `
            <div class="modal-container" style="max-width: 300px;">
                <div class="modal-header">
                    <span class="modal-icon"><i class="fa-solid fa-share-nodes"></i></span>
                    <h3>Compartir ejercicio</h3>
                </div>
                <div class="modal-body">
                    <p style="font-weight: 600; margin-bottom: 16px;">"${GymNotesSafe.escapeText(exercise.nombre)}"</p>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <button id="share-file-btn" class="modal-btn modal-btn-primary" style="width: 100%; text-align: center;">
                            <i class="fa-solid fa-file-export"></i> Guardar archivo
                        </button>
                        <button id="share-link-btn" class="modal-btn" style="width: 100%; text-align: center; background: #e3f2fd; color: #0d47a1;">
                            <i class="fa-solid fa-link"></i> Compartir enlace
                        </button>
                        <button id="share-cancel-btn" class="modal-btn modal-btn-secondary" style="width: 100%; text-align: center;">
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        `;
        
=======
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'exercise-share-dialog';
        overlay.style.display = 'flex';
        overlay.style.zIndex = '3000';
        
        overlay.innerHTML = `
            <div class="modal-container" style="max-width: 300px;">
                <div class="modal-header">
                    <span class="modal-icon"><i class="fa-solid fa-share-nodes"></i></span>
                    <h3>Compartir ejercicio</h3>
                </div>
                <div class="modal-body">
                    <p style="font-weight: 600; margin-bottom: 16px;">"${GymNotesSafe.escapeText(exercise.nombre)}"</p>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <button id="share-file-btn" class="modal-btn modal-btn-primary" style="width: 100%; text-align: center;">
                            <i class="fa-solid fa-file-export"></i> Guardar archivo
                        </button>
                        <button id="share-link-btn" class="modal-btn" style="width: 100%; text-align: center; background: #e3f2fd; color: #0d47a1;">
                            <i class="fa-solid fa-link"></i> Compartir enlace
                        </button>
                        <button id="share-cancel-btn" class="modal-btn modal-btn-secondary" style="width: 100%; text-align: center;">
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        `;
        
>>>>>>> a0e06567d66fb0b2bcaca3a4ed517c8aee665a60
        document.body.appendChild(overlay);

        const dialog = overlay.querySelector('.modal-container');
        const title = dialog.querySelector('h3');
        const description = dialog.querySelector('.modal-body p');
        const saveFileButton = overlay.querySelector('#share-file-btn');
        const shareLinkButton = overlay.querySelector('#share-link-btn');
        const cancelButton = overlay.querySelector('#share-cancel-btn');
        let settled = false;

        function closeShareDialog(result) {
            if (settled) return;
            settled = true;
            exerciseShareOverlayAccessibility.cleanup(overlay);
            overlay.remove();
            resolve(result);
        }

        exerciseShareOverlayAccessibility.setup(overlay, {
            dialog,
            title,
            description,
            initialFocus: saveFileButton,
            onEscape: () => closeShareDialog(null),
            onBackdrop: () => closeShareDialog(null)
        });

        exerciseShareOverlayAccessibility.addListener(overlay, saveFileButton, 'click', () => {
            closeShareDialog('file');
        });
        exerciseShareOverlayAccessibility.addListener(overlay, shareLinkButton, 'click', () => {
            closeShareDialog('share');
        });
        exerciseShareOverlayAccessibility.addListener(overlay, cancelButton, 'click', () => {
            closeShareDialog(null);
        });
<<<<<<< HEAD
    });
};

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.shareExercise = shareExercise;
=======
    });
};

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.shareExercise = shareExercise;
>>>>>>> a0e06567d66fb0b2bcaca3a4ed517c8aee665a60
window.shareExerciseViaWeb = shareExerciseViaWeb;
