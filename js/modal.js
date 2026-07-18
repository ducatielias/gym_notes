<<<<<<< HEAD
/**
 * MÓDULO: modal.js
 * Sistema de modales personalizados para reemplazar alert(), confirm() y prompt()
 * Todas las funciones retornan Promise para manejo asíncrono.
 */

const modalOverlay = document.getElementById('customModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalInput = document.getElementById('modalInput');
=======
/**
 * MÓDULO: modal.js
 * Sistema de modales personalizados para reemplazar alert(), confirm() y prompt()
 * Todas las funciones retornan Promise para manejo asíncrono.
 */

const modalOverlay = document.getElementById('customModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalInput = document.getElementById('modalInput');
>>>>>>> a0e06567d66fb0b2bcaca3a4ed517c8aee665a60
const modalConfirmBtn = document.getElementById('modalConfirmBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');
const modalIcon = document.getElementById('modalIcon');
const modalDialog = modalOverlay.querySelector('.modal-container');

let resolvePromise = null;
let currentType = 'alert'; // 'alert', 'confirm', 'prompt', 'selector'
let modalTriggerElement = null;
let modalKeyboardListenerAttached = false;

const modalIconVariantClasses = [
    'modal-icon--alert',
    'modal-icon--confirm',
    'modal-icon--prompt',
    'modal-icon--selector'
];

/**
 * Aplica la variante visual conocida del icono sin modificar estilos inline.
 */
function setModalIconVariant(variantClass) {
    modalIcon.classList.remove(...modalIconVariantClasses);
    modalIcon.classList.add(variantClass);
}
<<<<<<< HEAD

=======

>>>>>>> a0e06567d66fb0b2bcaca3a4ed517c8aee665a60
function getModalFocusableElements() {
    const focusableSelector = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled]):not([type="hidden"])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    return Array.from(modalDialog.querySelectorAll(focusableSelector)).filter((element) => {
        return !element.closest('.hidden') && element.getAttribute('aria-hidden') !== 'true';
    });
}

function restoreModalFocus() {
    const elementToRestore = modalTriggerElement;
    modalTriggerElement = null;

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

function focusModalInitialElement(preferredElement) {
    const focusableElements = getModalFocusableElements();
    const initialElement = focusableElements.includes(preferredElement)
        ? preferredElement
        : focusableElements[0] || modalDialog;

    initialElement.focus();
}

function activateModalKeyboardListener() {
    if (!modalKeyboardListenerAttached) {
        document.addEventListener('keydown', handleModalKeydown);
        modalKeyboardListenerAttached = true;
    }
}

function deactivateModalKeyboardListener() {
    if (modalKeyboardListenerAttached) {
        document.removeEventListener('keydown', handleModalKeydown);
        modalKeyboardListenerAttached = false;
    }
}

function completeModal(result) {
    const resolver = resolvePromise;
    resolvePromise = null;

    modalOverlay.classList.add('hidden');
    modalOverlay.setAttribute('aria-hidden', 'true');
    deactivateModalKeyboardListener();
    document.body.style.overflow = '';

    const dynamicContent = document.getElementById('modalDynamicContent');
    if (dynamicContent) {
        dynamicContent.innerHTML = '';
    }

    restoreModalFocus();

    if (resolver) {
        resolver(result);
    }
}

function closeModal() {
    if (currentType === 'prompt' || currentType === 'selector') {
        completeModal(null);
    } else if (currentType === 'confirm') {
        completeModal(false);
    } else {
        completeModal(undefined);
    }
}

function confirmModal(value) {
    completeModal(currentType === 'alert' ? undefined : value);
}

function handleModalKeydown(event) {
    if (modalOverlay.classList.contains('hidden')) return;

    if (event.key === 'Tab') {
        const focusableElements = getModalFocusableElements();

        if (focusableElements.length === 0) {
            event.preventDefault();
            modalDialog.focus();
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
        return;
    }

    if (event.key === 'Enter' && currentType !== 'selector') {
        event.preventDefault();
        modalConfirmBtn.click();
    } else if (event.key === 'Escape') {
        event.preventDefault();
        modalCancelBtn.click();
    }
}

function openModal(resolve, preferredFocusElement) {
    const activeElement = document.activeElement;
    modalTriggerElement = activeElement instanceof HTMLElement && activeElement !== document.body
        ? activeElement
        : null;
    resolvePromise = resolve;

    modalOverlay.classList.remove('hidden');
    modalOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    activateModalKeyboardListener();
    focusModalInitialElement(preferredFocusElement);
}
<<<<<<< HEAD

function setupModalListeners() {
    modalConfirmBtn.onclick = () => {
        if (currentType === 'prompt') {
            const inputValue = modalInput.value.trim();
            confirmModal(inputValue === '' ? null : inputValue);
        } else if (currentType === 'confirm') {
            confirmModal(true);
        } else if (currentType === 'selector') {
            // En selector, el botón confirmar no se usa directamente
            // La selección se hace mediante los botones de rutina
            closeModal();
        } else {
            confirmModal(undefined);
        }
    };

    modalCancelBtn.onclick = () => {
        if (currentType === 'prompt') {
            confirmModal(null);
        } else if (currentType === 'confirm') {
            confirmModal(false);
        } else if (currentType === 'selector') {
            confirmModal(null);
        } else {
            closeModal();
        }
    };

    // Cerrar al hacer clic fuera del modal (solo en alert)
    modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay && currentType === 'alert') {
            closeModal();
        }
    };

}

function showAlert(message, title = 'Aviso') {
    return new Promise((resolve) => {
        currentType = 'alert';
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modalIcon.innerHTML = '<i class="fa-solid fa-circle-info"></i>';
        setModalIconVariant('modal-icon--alert');
        modalInput.classList.add('hidden');
        modalCancelBtn.classList.add('hidden');
        modalConfirmBtn.textContent = 'Aceptar';
        modalConfirmBtn.classList.remove('hidden');
        
        // Limpiar contenido dinámico
        const dynamicContent = document.getElementById('modalDynamicContent');
        if (dynamicContent) {
            dynamicContent.innerHTML = '';
            dynamicContent.classList.add('hidden');
        }
        
        modalInput.value = '';
        openModal(resolve, modalConfirmBtn);
    });
}

function showConfirm(message, title = 'Confirmar') {
    return new Promise((resolve) => {
        currentType = 'confirm';
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modalIcon.innerHTML = '<i class="fa-solid fa-question-circle"></i>';
        setModalIconVariant('modal-icon--confirm');
        modalInput.classList.add('hidden');
        modalCancelBtn.classList.remove('hidden');
        modalCancelBtn.textContent = 'Cancelar';
        modalConfirmBtn.textContent = 'Aceptar';
        modalConfirmBtn.classList.remove('hidden');
        
        const dynamicContent = document.getElementById('modalDynamicContent');
        if (dynamicContent) {
            dynamicContent.innerHTML = '';
            dynamicContent.classList.add('hidden');
        }
        
        modalInput.value = '';
        openModal(resolve, modalConfirmBtn);
    });
}

function showPrompt(message, defaultValue = '', title = 'Entrada de texto') {
    return new Promise((resolve) => {
        currentType = 'prompt';
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modalIcon.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
        setModalIconVariant('modal-icon--prompt');
        modalInput.classList.remove('hidden');
        modalInput.value = defaultValue;
        modalInput.placeholder = 'Escribe aquí...';
        modalCancelBtn.classList.remove('hidden');
        modalCancelBtn.textContent = 'Cancelar';
        modalConfirmBtn.textContent = 'Aceptar';
        modalConfirmBtn.classList.remove('hidden');
        
        const dynamicContent = document.getElementById('modalDynamicContent');
        if (dynamicContent) {
            dynamicContent.innerHTML = '';
            dynamicContent.classList.add('hidden');
        }
        
        openModal(resolve, modalInput);
    });
}

function showRoutineSelector(routines, currentRoutineId, actionType = 'copy') {
    return new Promise((resolve) => {
        currentType = 'selector';
        
        const actionText = actionType === 'copy' ? 'copiar la sesión a' : 'mover la sesión a';
        modalTitle.textContent = actionType === 'copy' ? 'Copiar sesión' : 'Mover sesión';
        modalMessage.textContent = `Selecciona la rutina donde deseas ${actionText}:`;
        modalIcon.innerHTML = '<i class="fa-solid fa-list-ul"></i>';
        setModalIconVariant('modal-icon--selector');
        
        modalInput.classList.add('hidden');
        modalCancelBtn.classList.remove('hidden');
        modalCancelBtn.textContent = 'Cancelar';
        modalConfirmBtn.classList.add('hidden');
        
        // Crear contenedor dinámico para la lista de rutinas
        const dynamicContent = document.getElementById('modalDynamicContent');
        if (!dynamicContent) {
            // Si no existe el contenedor, lo creamos
            const modalBody = document.querySelector('.modal-body');
            const newDynamicContent = document.createElement('div');
            newDynamicContent.id = 'modalDynamicContent';
            newDynamicContent.className = 'modal-dynamic-content';
            modalBody.appendChild(newDynamicContent);
        }
        
        const contentContainer = document.getElementById('modalDynamicContent');
        contentContainer.classList.remove('hidden');
        contentContainer.innerHTML = '';
        
        // Crear lista de rutinas
        const listContainer = document.createElement('div');
        listContainer.className = 'modal-routine-list';
        
        routines.forEach(routine => {
            const routineBtn = document.createElement('button');
            routineBtn.className = 'modal-routine-item';
            
            // Si es la rutina actual y la acción es "mover", deshabilitar
            if (actionType === 'move' && routine.id === currentRoutineId) {
                routineBtn.classList.add('disabled');
                routineBtn.innerHTML = `
                    <span>${GymNotesSafe.escapeText(routine.name)}</span>
                    <span class="modal-routine-current-badge">(actual)</span>
                `;
                routineBtn.disabled = true;
            } else {
                routineBtn.innerHTML = `<span>${GymNotesSafe.escapeText(routine.name)}</span>`;
                routineBtn.onclick = () => {
                    confirmModal(routine);
                };
            }
            
            listContainer.appendChild(routineBtn);
        });
        
        contentContainer.appendChild(listContainer);
        
        openModal(resolve, contentContainer.querySelector('.modal-routine-item:not([disabled])') || modalCancelBtn);
    });
}

// Función auxiliar para escapar HTML y prevenir inyección
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Inicializar listeners al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    setupModalListeners();
});

// Exponer funciones globalmente
window.showAlert = showAlert;
window.showConfirm = showConfirm;
window.showPrompt = showPrompt;
=======

function setupModalListeners() {
    modalConfirmBtn.onclick = () => {
        if (currentType === 'prompt') {
            const inputValue = modalInput.value.trim();
            confirmModal(inputValue === '' ? null : inputValue);
        } else if (currentType === 'confirm') {
            confirmModal(true);
        } else if (currentType === 'selector') {
            // En selector, el botón confirmar no se usa directamente
            // La selección se hace mediante los botones de rutina
            closeModal();
        } else {
            confirmModal(undefined);
        }
    };

    modalCancelBtn.onclick = () => {
        if (currentType === 'prompt') {
            confirmModal(null);
        } else if (currentType === 'confirm') {
            confirmModal(false);
        } else if (currentType === 'selector') {
            confirmModal(null);
        } else {
            closeModal();
        }
    };

    // Cerrar al hacer clic fuera del modal (solo en alert)
    modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay && currentType === 'alert') {
            closeModal();
        }
    };

}

function showAlert(message, title = 'Aviso') {
    return new Promise((resolve) => {
        currentType = 'alert';
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modalIcon.innerHTML = '<i class="fa-solid fa-circle-info"></i>';
        setModalIconVariant('modal-icon--alert');
        modalInput.classList.add('hidden');
        modalCancelBtn.classList.add('hidden');
        modalConfirmBtn.textContent = 'Aceptar';
        modalConfirmBtn.classList.remove('hidden');
        
        // Limpiar contenido dinámico
        const dynamicContent = document.getElementById('modalDynamicContent');
        if (dynamicContent) {
            dynamicContent.innerHTML = '';
            dynamicContent.classList.add('hidden');
        }
        
        modalInput.value = '';
        openModal(resolve, modalConfirmBtn);
    });
}

function showConfirm(message, title = 'Confirmar') {
    return new Promise((resolve) => {
        currentType = 'confirm';
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modalIcon.innerHTML = '<i class="fa-solid fa-question-circle"></i>';
        setModalIconVariant('modal-icon--confirm');
        modalInput.classList.add('hidden');
        modalCancelBtn.classList.remove('hidden');
        modalCancelBtn.textContent = 'Cancelar';
        modalConfirmBtn.textContent = 'Aceptar';
        modalConfirmBtn.classList.remove('hidden');
        
        const dynamicContent = document.getElementById('modalDynamicContent');
        if (dynamicContent) {
            dynamicContent.innerHTML = '';
            dynamicContent.classList.add('hidden');
        }
        
        modalInput.value = '';
        openModal(resolve, modalConfirmBtn);
    });
}

function showPrompt(message, defaultValue = '', title = 'Entrada de texto') {
    return new Promise((resolve) => {
        currentType = 'prompt';
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modalIcon.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
        setModalIconVariant('modal-icon--prompt');
        modalInput.classList.remove('hidden');
        modalInput.value = defaultValue;
        modalInput.placeholder = 'Escribe aquí...';
        modalCancelBtn.classList.remove('hidden');
        modalCancelBtn.textContent = 'Cancelar';
        modalConfirmBtn.textContent = 'Aceptar';
        modalConfirmBtn.classList.remove('hidden');
        
        const dynamicContent = document.getElementById('modalDynamicContent');
        if (dynamicContent) {
            dynamicContent.innerHTML = '';
            dynamicContent.classList.add('hidden');
        }
        
        openModal(resolve, modalInput);
    });
}

function showRoutineSelector(routines, currentRoutineId, actionType = 'copy') {
    return new Promise((resolve) => {
        currentType = 'selector';
        
        const actionText = actionType === 'copy' ? 'copiar la sesión a' : 'mover la sesión a';
        modalTitle.textContent = actionType === 'copy' ? 'Copiar sesión' : 'Mover sesión';
        modalMessage.textContent = `Selecciona la rutina donde deseas ${actionText}:`;
        modalIcon.innerHTML = '<i class="fa-solid fa-list-ul"></i>';
        setModalIconVariant('modal-icon--selector');
        
        modalInput.classList.add('hidden');
        modalCancelBtn.classList.remove('hidden');
        modalCancelBtn.textContent = 'Cancelar';
        modalConfirmBtn.classList.add('hidden');
        
        // Crear contenedor dinámico para la lista de rutinas
        const dynamicContent = document.getElementById('modalDynamicContent');
        if (!dynamicContent) {
            // Si no existe el contenedor, lo creamos
            const modalBody = document.querySelector('.modal-body');
            const newDynamicContent = document.createElement('div');
            newDynamicContent.id = 'modalDynamicContent';
            newDynamicContent.className = 'modal-dynamic-content';
            modalBody.appendChild(newDynamicContent);
        }
        
        const contentContainer = document.getElementById('modalDynamicContent');
        contentContainer.classList.remove('hidden');
        contentContainer.innerHTML = '';
        
        // Crear lista de rutinas
        const listContainer = document.createElement('div');
        listContainer.className = 'modal-routine-list';
        
        routines.forEach(routine => {
            const routineBtn = document.createElement('button');
            routineBtn.className = 'modal-routine-item';
            
            // Si es la rutina actual y la acción es "mover", deshabilitar
            if (actionType === 'move' && routine.id === currentRoutineId) {
                routineBtn.classList.add('disabled');
                routineBtn.innerHTML = `
                    <span>${GymNotesSafe.escapeText(routine.name)}</span>
                    <span class="modal-routine-current-badge">(actual)</span>
                `;
                routineBtn.disabled = true;
            } else {
                routineBtn.innerHTML = `<span>${GymNotesSafe.escapeText(routine.name)}</span>`;
                routineBtn.onclick = () => {
                    confirmModal(routine);
                };
            }
            
            listContainer.appendChild(routineBtn);
        });
        
        contentContainer.appendChild(listContainer);
        
        openModal(resolve, contentContainer.querySelector('.modal-routine-item:not([disabled])') || modalCancelBtn);
    });
}

// Función auxiliar para escapar HTML y prevenir inyección
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Inicializar listeners al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    setupModalListeners();
});

// Exponer funciones globalmente
window.showAlert = showAlert;
window.showConfirm = showConfirm;
window.showPrompt = showPrompt;
>>>>>>> a0e06567d66fb0b2bcaca3a4ed517c8aee665a60
window.showRoutineSelector = showRoutineSelector;
