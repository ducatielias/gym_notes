/**
 * MÓDULO: modal.js
 * Sistema de modales personalizados para reemplazar alert(), confirm() y prompt()
 * Todas las funciones retornan Promise para manejo asíncrono.
 */

const modalOverlay = document.getElementById('customModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalInput = document.getElementById('modalInput');
const modalConfirmBtn = document.getElementById('modalConfirmBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');
const modalIcon = document.getElementById('modalIcon');

let resolvePromise = null;
let currentType = 'alert'; // 'alert', 'confirm', 'prompt', 'selector'

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

function closeModal() {
    modalOverlay.classList.add('hidden');
    if (resolvePromise) {
        if (currentType === 'prompt') {
            resolvePromise(null);
        } else if (currentType === 'confirm') {
            resolvePromise(false);
        } else if (currentType === 'selector') {
            resolvePromise(null);
        } else {
            resolvePromise(undefined);
        }
        resolvePromise = null;
    }
    // Restaurar scroll del body si se bloqueó
    document.body.style.overflow = '';
    // Limpiar contenido dinámico del selector si existe
    const dynamicContent = document.getElementById('modalDynamicContent');
    if (dynamicContent) {
        dynamicContent.innerHTML = '';
    }
}

function confirmModal(value) {
    modalOverlay.classList.add('hidden');
    if (resolvePromise) {
        if (currentType === 'prompt') {
            resolvePromise(value);
        } else if (currentType === 'confirm') {
            resolvePromise(value);
        } else if (currentType === 'selector') {
            resolvePromise(value);
        } else {
            resolvePromise(undefined);
        }
        resolvePromise = null;
    }
    document.body.style.overflow = '';
    const dynamicContent = document.getElementById('modalDynamicContent');
    if (dynamicContent) {
        dynamicContent.innerHTML = '';
    }
}

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

    // Tecla Enter confirma, Escape cancela
    document.addEventListener('keydown', (e) => {
        if (!modalOverlay.classList.contains('hidden')) {
            if (e.key === 'Enter' && currentType !== 'selector') {
                e.preventDefault();
                modalConfirmBtn.click();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                modalCancelBtn.click();
            }
        }
    });
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
        
        modalOverlay.classList.remove('hidden');
        resolvePromise = resolve;
        
        // Prevenir scroll del body
        document.body.style.overflow = 'hidden';
        modalInput.value = '';
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
        
        modalOverlay.classList.remove('hidden');
        resolvePromise = resolve;
        document.body.style.overflow = 'hidden';
        modalInput.value = '';
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
        
        modalOverlay.classList.remove('hidden');
        resolvePromise = resolve;
        document.body.style.overflow = 'hidden';
        setTimeout(() => modalInput.focus(), 50);
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
        
        modalOverlay.classList.remove('hidden');
        resolvePromise = resolve;
        document.body.style.overflow = 'hidden';
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
window.showRoutineSelector = showRoutineSelector;
