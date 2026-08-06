/**
 * MÓDULO: back-handler.js
 * Control de navegación con historial y manejo del botón de retroceso.
 * 
 * Técnica: el entrenamiento tiene su propio estado en el historial (pushState).
 * Al cancelar la salida, se reconstruye la trampa con otro pushState.
 * 
 * Compatible con Samsung Internet y Chrome Android.
 */

// ==========================================================================
// VARIABLES GLOBALES
// ==========================================================================

let backHandlerInitialized = false;
let esBloqueoActivo = false; // true mientras el entrenamiento esté activo
let currentTab = 'today';
let backResolutionPending = false;
let nextBackHandlerOrder = 0;

const registeredBackHandlers = new Map();

/**
 * Resultados explicitos del resolvedor central. Los manejadores registrados
 * consumen o dejan pasar Atras; el estado pendiente evita la reentrancia.
 */
const BACK_ACTION_RESULT = Object.freeze({
    CONSUMED: 'consumed',
    NOT_CONSUMED: 'not-consumed',
    PENDING_CONFIRMATION: 'pending-confirmation'
});

/**
 * Orden semantico para las familias que se migraran en fases posteriores.
 */
const BACK_HANDLER_PRIORITY = Object.freeze({
    DIALOG: 700,
    OVERLAY: 600,
    CONTEXTUAL_VIEW: 550,
    AUXILIARY_PANEL: 500,
    CHILD_VIEW: 400,
    PROTECTED_CONTEXT: 300,
    PRIMARY_NAVIGATION: 200,
    APP_EXIT: 100
});

// ===========================================================================
// REGISTRO CENTRAL DE MANEJADORES
// ===========================================================================

/**
 * Registra o actualiza un consumidor de Atras sin crear listeners globales.
 * Un ID repetido conserva su orden y sustituye su definicion, evitando que la
 * reapertura de una misma interfaz duplique el consumo de Atras.
 */
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

/**
 * Elimina de forma segura un consumidor. Puede invocarse mas de una vez al
 * cerrar una vista u overlay sin dejar registros residuales.
 */
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
        `[back-handler] El manejador "${sourceId}" devolvio un resultado invalido.`,
        result
    );
    return BACK_ACTION_RESULT.NOT_CONSUMED;
}

/**
 * Un popstate ya ha movido el puntero del navegador antes de que un handler
 * pueda cerrar una capa. Al consumirlo, se reconstruye la entrada principal
 * actual con el mismo mecanismo heredado para no navegar por debajo del modal.
 */
function stabilizeConsumedPopState(context) {
    if (context?.source !== 'popstate') return;

    if (context.workoutActive) {
        const workoutModal = document.getElementById('active-workout');

        // Si el cierre confirmado ya ocultó el entrenamiento, se mantiene la
        // navegación que ejecutó cerrarEntrenamiento() en lugar de recrear
        // una entrada #workout que ya no representa la vista actual.
        if (workoutModal?.style.display !== 'flex') {
            return;
        }

        history.pushState({ tab: 'workout' }, '', '#workout');
        return;
    }

    if (context.visibleScreenId === 'history' && context.historyReturnScreen === 'workout') {
        history.pushState({ tab: 'history', returnScreen: 'workout' }, '', '#history');
        return;
    }

    const mainTabs = ['today', 'plan', 'history', 'exercises'];
    const tabToRestore = mainTabs.includes(context.currentTab) ? context.currentTab : null;

    if (!tabToRestore) {
        console.warn('[back-handler] No se pudo estabilizar el historial: pestana principal desconocida.');
        return;
    }

    history.pushState({ tab: tabToRestore }, '', '#' + tabToRestore);
}

/**
 * Ejecuta consumidores por prioridad y usa el fallback heredado solo cuando
 * ninguno absorbe Atras. El bloqueo cubre promesas de confirmacion.
 */
async function resolveBackAction(context, legacyFallback) {
    if (backResolutionPending) {
        console.warn('[back-handler] Accion Atras ignorada: hay una resolucion pendiente.');
        return BACK_ACTION_RESULT.PENDING_CONFIRMATION;
    }

    backResolutionPending = true;

    try {
        for (const handler of getRegisteredBackHandlers()) {
            let canHandle = false;

            try {
                canHandle = Boolean(await handler.canHandle(context));
            } catch (error) {
                console.error(`[back-handler] Error en canHandle() de "${handler.id}".`, error);
                continue;
            }

            if (!canHandle) continue;

            try {
                const result = normalizeBackActionResult(
                    await handler.handle(context),
                    handler.id
                );

                if (result === BACK_ACTION_RESULT.CONSUMED) {
                    stabilizeConsumedPopState(context);
                    return result;
                }
            } catch (error) {
                console.error(`[back-handler] Error en handle() de "${handler.id}".`, error);
            }
        }

        if (typeof legacyFallback === 'function') {
            try {
                return normalizeBackActionResult(
                    await legacyFallback(context),
                    'fallback-heredado'
                );
            } catch (error) {
                console.error('[back-handler] Error en el fallback heredado.', error);
            }
        }

        return BACK_ACTION_RESULT.NOT_CONSUMED;
    } finally {
        backResolutionPending = false;
    }
}

/**
 * Crea un contexto efimero desde el DOM y los estados ya existentes. No crea
 * una pila paralela ni introduce nuevas banderas de navegacion.
 */
function buildBackContext(event) {
    const workoutModal = document.getElementById('active-workout');
    const customModal = document.getElementById('customModal');
    const visibleScreen = document.querySelector('.screen:not(.hidden)');
    const isWorkoutVisible = workoutModal?.style.display === 'flex';
    const isCustomModalVisible = customModal
        && !customModal.classList.contains('hidden')
        && customModal.getAttribute('aria-hidden') !== 'true';

    return Object.freeze({
        source: 'popstate',
        state: event?.state ?? null,
        currentTab,
        visibleScreenId: visibleScreen?.id?.replace('screen-', '') || null,
        activeModalId: isCustomModalVisible ? 'custom-modal' : null,
        historyReturnScreen: window.historyReturnScreen || null,
        routineNavigationActive: Boolean(window.currentRoutineId),
        workoutActive: Boolean(isWorkoutVisible),
        url: window.location.href,
        hash: window.location.hash
    });
}

/**
 * RC-21B integra unicamente el dialogo comun. El resto de capas se migrara
 * despues mediante el mismo registro.
 */
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

// ==========================================================================
// INICIALIZACIÓN
// ==========================================================================

function initBackHandler() {
    if (backHandlerInitialized) return;
    window.addEventListener('popstate', handlePopState);
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';
    registerCommonModalBackHandler();
    backHandlerInitialized = true;
    console.log('[back-handler] Inicializado.');
}

// ==========================================================================
// FUNCIONES PARA EL ENTRENAMIENTO
// ==========================================================================

function alAbrirEntrenamiento() {
    esBloqueoActivo = true;
    history.pushState({ tab: 'workout' }, '', '#workout');
    console.log('[back-handler] Entrenamiento abierto, estado pushState.');
}

function liberarBloqueoEntrenamiento() {
    esBloqueoActivo = false;
    console.log('[back-handler] Bloqueo de entrenamiento liberado.');
}

// ==========================================================================
// DETECTAR PANTALLAS INTERNAS
// ==========================================================================

function hayPantallaInternaVisible() {
    const internals = ['editor', 'exercise-editor', 'history-detail', 'exercise-viewer'];
    for (const id of internals) {
        const el = document.getElementById(`screen-${id}`);
        if (el && !el.classList.contains('hidden')) {
            return true;
        }
    }
    return false;
}

// ==========================================================================
// MANEJADOR DE POPSTATE (BOTÓN DE RETROCESO)
// ==========================================================================

function handlePopState(event) {
    const context = buildBackContext(event);

    void resolveBackAction(context, runLegacyBackFallback).catch((error) => {
        // El resolvedor ya aisla fallos de consumidores concretos. Este cierre
        // evita una promesa rechazada si falla la infraestructura global.
        console.error('[back-handler] Error no controlado resolviendo Atras.', error);
    });
}

/**
 * Adaptador temporal del flujo de RC-20. Conserva sus ramas y espera sus
 * confirmaciones para que el nucleo pueda bloquear la reentrancia.
 */
async function runLegacyBackFallback(context) {
    const legacyResult = handleLegacyPopState({ state: context.state });

    if (legacyResult && typeof legacyResult.then === 'function') {
        await legacyResult;
    }

    return BACK_ACTION_RESULT.CONSUMED;
}

function handleLegacyPopState(event) {
    const state = event.state;
    const workoutModal = document.getElementById('active-workout');
    const isWorkoutVisible = workoutModal && workoutModal.style.display === 'flex';

    console.log('[back-handler] popstate:', state, 'visible:', isWorkoutVisible, 'bloqueo:', esBloqueoActivo);

    // CASO 1: Entrenamiento visible sin estado real para el handler migrado.
    // Esta compatibilidad se conserva para no cerrar un modal legacy incompleto.
    if (isWorkoutVisible && esBloqueoActivo) {
        return window.showConfirm(
            '¿Salir del entrenamiento? Se perderán las notas no guardadas.',
            'Cancelar entrenamiento'
        ).then((confirmado) => {
            if (confirmado) {
                console.log('[back-handler] Usuario confirmó salida del entrenamiento.');
                // Llamar a la función de cierre del entrenamiento (definida en workout.js)
                if (typeof window.cerrarEntrenamiento === 'function') {
                    return window.cerrarEntrenamiento();
                } else {
                    // Fallback: cerrar manualmente
                    if (workoutModal) workoutModal.style.display = 'none';
                    liberarBloqueoEntrenamiento();
                }
            } else {
                console.log('[back-handler] Usuario canceló. Reconstruyendo trampa...');
                setTimeout(() => {
                    if (esBloqueoActivo) {
                        history.pushState({ tab: 'workout' }, '', '#workout');
                        console.log('[back-handler] Trampa reconstruida (pushState).');
                    }
                }, 50);
            }
        });
        return;
    }

    // CASO 2: Navegación entre pestañas (hay estado)
    if (state && state.tab && state.tab !== 'workout') {
        console.log('[back-handler] Navegando a pestaña:', state.tab);
        window.switchTab(state.tab, { noPushState: true });
        return;
    }

    // CASO 3: Sin estado (raíz)
    console.log('[back-handler] Estado raíz detectado.');

    if (hayPantallaInternaVisible()) {
        console.log('[back-handler] Pantalla interna visible. Cerrando...');
        window.switchTab(currentTab, { noPushState: true });
        history.pushState({ tab: currentTab }, '', '#' + currentTab);
        return;
    }

    console.log('[back-handler] Mostrando confirmación de salida de la app.');
    return window.showConfirm(
        '¿Estás seguro de que quieres salir de Gym Notes?',
        'Salir de la app'
    ).then((confirmado) => {
        if (confirmado) {
            console.log('[back-handler] Usuario confirmó salir de la app.');
            window.removeEventListener('popstate', handlePopState);
            setTimeout(() => {
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    window.close();
                }
            }, 100);
        } else {
            console.log('[back-handler] Usuario canceló salida. Restaurando estado.');
            history.pushState({ tab: currentTab }, '', '#' + currentTab);
        }
    });
}

// ==========================================================================
// FUNCIÓN PARA NAVEGAR ENTRE PESTAÑAS
// ==========================================================================

function navigateToTab(tabName) {
    if (esBloqueoActivo) {
        console.warn('[back-handler] No se puede cambiar de pestaña durante el entrenamiento.');
        return;
    }

    const mainTabs = ['today', 'plan', 'history', 'exercises'];
    if (mainTabs.includes(tabName)) {
        const state = { tab: tabName };
        history.pushState(state, '', '#' + tabName);
        window.switchTab(tabName, { noPushState: true });
        currentTab = tabName;
    } else {
        window.switchTab(tabName, { noPushState: true });
    }
}

function setCurrentTab(tabName) {
    if (tabName) currentTab = tabName;
}

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.initBackHandler = initBackHandler;
window.alAbrirEntrenamiento = alAbrirEntrenamiento;
window.liberarBloqueoEntrenamiento = liberarBloqueoEntrenamiento;
window.navigateToTab = navigateToTab;
window.setCurrentTab = setCurrentTab;
window.GymNotesBackNavigation = Object.freeze({
    register: registerBackHandler,
    unregister: unregisterBackHandler,
    PRIORITY: BACK_HANDLER_PRIORITY,
    RESULT: BACK_ACTION_RESULT
});

// ==========================================================================
// INICIALIZACIÓN AUTOMÁTICA
// ==========================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBackHandler);
} else {
    initBackHandler();
}

console.log('[back-handler] Módulo cargado correctamente.');
