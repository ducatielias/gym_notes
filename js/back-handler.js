/**
 * MÓDULO: back-handler.js
 * Gestiona el botón Atrás físico mediante una frontera History mínima.
 *
 * History API solo representa ROOT + SENTINEL. Las pantallas internas y sus
 * retornos pertenecen a los botones visibles de cada módulo.
 */

// ==========================================================================
// ESTADO DEL NÚCLEO
// ==========================================================================

let backHandlerInitialized = false;
let backResolutionPending = false;
let nextBackHandlerOrder = 0;

const GYM_NOTES_ROOT_STATE_KEY = 'gymNotesRoot';
const GYM_NOTES_SENTINEL_STATE_KEY = 'gymNotesSentinel';
const registeredBackHandlers = new Map();

const BACK_ACTION_RESULT = Object.freeze({
    CONSUMED: 'consumed',
    NOT_CONSUMED: 'not-consumed',
    PENDING_CONFIRMATION: 'pending-confirmation'
});

const BACK_HANDLER_PRIORITY = Object.freeze({
    DIALOG: 700,
    PWA_UPDATE_NOTICE: 675,
    TRANSIENT_OVERLAY: 650,
    MENU: 575,
    AUXILIARY_PANEL: 500,
    PROTECTED_CONTEXT: 300
});

function isBackNavigationOverlayVisible(overlayId) {
    const overlay = document.getElementById(overlayId);
    return Boolean(
        overlay
        && overlay.isConnected
        && !overlay.hidden
        && !overlay.classList.contains('hidden')
        && overlay.style.display !== 'none'
        && overlay.getAttribute('aria-hidden') !== 'true'
    );
}

// ==========================================================================
// REGISTRO DE CONSUMIDORES
// ==========================================================================

function registerBackHandler(config) {
    const id = config?.id;
    const handle = config?.handle;

    if (typeof id !== 'string' || id.trim() === '' || typeof handle !== 'function') {
        console.error('[back-handler] Registro rechazado: se requieren id y handle().');
        return () => false;
    }

    const priority = Number.isFinite(config.priority)
        ? config.priority
        : BACK_HANDLER_PRIORITY.AUXILIARY_PANEL;
    const existingHandler = registeredBackHandlers.get(id);

    registeredBackHandlers.set(id, {
        id,
        priority,
        canHandle: typeof config.canHandle === 'function' ? config.canHandle : () => true,
        handle,
        order: existingHandler?.order ?? nextBackHandlerOrder++
    });

    return () => unregisterBackHandler(id);
}

function unregisterBackHandler(id) {
    return registeredBackHandlers.delete(id);
}

function getRegisteredBackHandlers() {
    return Array.from(registeredBackHandlers.values()).sort((first, second) => {
        if (second.priority !== first.priority) {
            return second.priority - first.priority;
        }

        return first.order - second.order;
    });
}

function normalizeBackActionResult(result, sourceId) {
    if (result === BACK_ACTION_RESULT.CONSUMED || result === BACK_ACTION_RESULT.NOT_CONSUMED) {
        return result;
    }

    console.error(
        `[back-handler] El manejador "${sourceId}" devolvió un resultado inválido.`,
        result
    );
    return BACK_ACTION_RESULT.NOT_CONSUMED;
}

// ==========================================================================
// FRONTERA ROOT + SENTINEL
// ==========================================================================

function isGymNotesRootState(state) {
    return state?.[GYM_NOTES_ROOT_STATE_KEY] === true;
}

function isGymNotesSentinelState(state) {
    return state?.[GYM_NOTES_SENTINEL_STATE_KEY] === true;
}

/**
 * Normaliza la entrada actual y crea una sola frontera genérica. Una recarga
 * sobre la sentinel existente no añade otra entrada al historial.
 */
function initializeBackHistoryBoundary() {
    if (isGymNotesSentinelState(history.state)) return;

    if (!isGymNotesRootState(history.state)) {
        history.replaceState({ [GYM_NOTES_ROOT_STATE_KEY]: true }, '', window.location.href);
    }

    ensureBackSentinel();
}

/**
 * Rearma la misma sentinel antes de ejecutar un consumidor. Su estado no
 * contiene pantalla, pestaña, entrenamiento, origen ni identificadores.
 */
function ensureBackSentinel() {
    if (isGymNotesSentinelState(history.state)) return false;

    history.pushState({ [GYM_NOTES_SENTINEL_STATE_KEY]: true }, '', window.location.href);
    return true;
}

// ==========================================================================
// RESOLUCIÓN DEL BOTÓN ATRÁS
// ==========================================================================

/**
 * Todos los canHandle actuales son predicados DOM sincrónicos. Seleccionar el
 * consumidor primero permite rearmar History antes de un handler asíncrono.
 */
function findFirstAvailableBackHandler(context) {
    for (const handler of getRegisteredBackHandlers()) {
        try {
            if (handler.canHandle(context)) return handler;
        } catch (error) {
            console.error(`[back-handler] Error en canHandle() de "${handler.id}".`, error);
        }
    }

    return null;
}

async function executeBackHandler(handler, context) {
    try {
        return normalizeBackActionResult(
            await handler.handle(context),
            handler.id
        );
    } catch (error) {
        console.error(`[back-handler] Error en handle() de "${handler.id}".`, error);
        return BACK_ACTION_RESULT.NOT_CONSUMED;
    }
}

/**
 * Rearma la sentinel antes del primer await del consumidor. Durante una
 * resolución pendiente solo el modal común puede ejecutarse, para que un
 * segundo Atrás cancele la confirmación sin duplicar la acción original.
 */
async function resolveBackAction(context) {
    const handler = findFirstAvailableBackHandler(context);

    if (backResolutionPending) {
        ensureBackSentinel();

        if (handler?.id === 'custom-modal') {
            return executeBackHandler(handler, context);
        }

        console.warn('[back-handler] Acción Atrás ignorada: hay una resolución pendiente.');
        return BACK_ACTION_RESULT.PENDING_CONFIRMATION;
    }

    if (!handler) {
        // El Back físico no navega ni abandona GymNotes. Al estar ahora en
        // ROOT, este push sustituye la sentinel consumida sin acumular capas.
        ensureBackSentinel();
        return BACK_ACTION_RESULT.NOT_CONSUMED;
    }

    ensureBackSentinel();
    backResolutionPending = true;

    try {
        return await executeBackHandler(handler, context);
    } finally {
        backResolutionPending = false;
    }
}

function buildBackContext(event) {
    return Object.freeze({
        source: 'popstate',
        state: event?.state ?? null
    });
}

function registerCommonModalBackHandler() {
    registerBackHandler({
        id: 'custom-modal',
        priority: BACK_HANDLER_PRIORITY.DIALOG,
        canHandle: () => Boolean(window.GymNotesModal?.isOpen?.()),
        handle: () => {
            const dismissed = window.GymNotesModal?.dismiss?.();
            return dismissed ? BACK_ACTION_RESULT.CONSUMED : BACK_ACTION_RESULT.NOT_CONSUMED;
        }
    });
}

function handlePopState(event) {
    // Solo ROOT es la transición controlada por GymNotes. Estados anteriores de
    // RC-21 se ignoran para que una pila antigua pueda continuar hacia fuera.
    if (!isGymNotesRootState(event?.state)) return;

    const context = buildBackContext(event);

    void resolveBackAction(context)
        .then((result) => {
            if (result === BACK_ACTION_RESULT.NOT_CONSUMED) {
                console.log('[back-handler] Sin consumidor. Back neutralizado y sentinel rearmada.');
            }
        })
        .catch((error) => {
            console.error('[back-handler] Error no controlado resolviendo Atrás.', error);
        });
}

// ==========================================================================
// INICIALIZACIÓN Y API PÚBLICA
// ==========================================================================

function initBackHandler() {
    if (backHandlerInitialized) return;

    initializeBackHistoryBoundary();
    window.addEventListener('popstate', handlePopState);
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';
    registerCommonModalBackHandler();
    backHandlerInitialized = true;
    console.log('[back-handler] Inicializado con ROOT + SENTINEL.');
}

window.initBackHandler = initBackHandler;

window.GymNotesBackNavigation = Object.freeze({
    register: registerBackHandler,
    unregister: unregisterBackHandler,
    isOverlayVisible: isBackNavigationOverlayVisible,
    PRIORITY: BACK_HANDLER_PRIORITY,
    RESULT: BACK_ACTION_RESULT
});

// ui-helpers.js se carga antes que este núcleo y expone el registro compartido.
window.registerHeaderOptionsMenuBackHandler?.();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBackHandler);
} else {
    initBackHandler();
}

console.log('[back-handler] Módulo cargado correctamente.');
