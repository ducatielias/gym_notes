/**
 * MÃ“DULO: back-handler.js
 * Control de navegaciÃ³n con historial y manejo del botÃ³n de retroceso.
 * 
 * TÃ©cnica: el entrenamiento tiene su propio estado en el historial (pushState).
 * Al cancelar la salida, se reconstruye la trampa con otro pushState.
 * 
 * Compatible con Samsung Internet y Chrome Android.
 */

// ==========================================================================
// VARIABLES GLOBALES
// ==========================================================================

let backHandlerInitialized = false;
let esBloqueoActivo = false; // true mientras el entrenamiento estÃ© activo
let currentTab = 'today';
let backResolutionPending = false;
// Estado privado de una sola resolución asíncrona; no crea otra pila de historial.
let pendingBackResolution = null;
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
 * Orden semÃ¡ntico de las capas de AtrÃ¡s. Dentro de una misma prioridad gana
 * el primer registro: register() conserva ese orden incluso al actualizar un ID.
 */
const BACK_HANDLER_PRIORITY = Object.freeze({
    DIALOG: 700,
    PWA_UPDATE_NOTICE: 675,
    TRANSIENT_OVERLAY: 650,
    OVERLAY: 600,
    MENU: 575,
    CONTEXTUAL_VIEW: 550,
    AUXILIARY_PANEL: 500,
    CHILD_VIEW: 400,
    PROTECTED_CONTEXT: 300,
    PRIMARY_NAVIGATION: 200,
    APP_EXIT: 100
});


/**
 * Comprueba la visibilidad efectiva de un overlay dinamico sin inferirla de
 * estados historicos. Los modulos de cada flujo mantienen sus propios cierres.
 */
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
function stabilizeConsumedPopState(context, resolution = null, force = false) {
    if (context?.source !== 'popstate') return;
    if (resolution?.historyStabilized && !force) return;

    if (context.workoutActive) {
        const workoutModal = document.getElementById('active-workout');

        // La entrada se reconstruye antes de esperar una confirmaciÃ³n asÃ­ncrona.
        // Si otro popstate la consume durante la espera, force la repone una vez.
        if (workoutModal?.style.display !== 'flex') return;

        history.pushState({ tab: 'workout' }, '', '#workout');
        if (resolution) resolution.historyStabilized = true;
        return;
    }

    if (context.visibleScreenId === 'history' && context.historyReturnScreen === 'workout') {
        history.pushState({ tab: 'history', returnScreen: 'workout' }, '', '#history');
        if (resolution) resolution.historyStabilized = true;
        return;
    }

    const mainTabs = ['today', 'plan', 'history', 'exercises'];
    const tabToRestore = mainTabs.includes(context.currentTab) ? context.currentTab : null;

    if (!tabToRestore) {
        console.warn('[back-handler] No se pudo estabilizar el historial: pestana principal desconocida.');
        return;
    }

    history.pushState({ tab: tabToRestore }, '', '#' + tabToRestore);
    if (resolution) resolution.historyStabilized = true;
}

function reconcileClosedWorkoutHistory(resolution) {
    if (!resolution?.historyStabilized || !resolution.context.workoutActive) return;

    const workoutModal = document.getElementById('active-workout');
    if (workoutModal?.style.display === 'flex') return;

    // La protecciÃ³n temprana ya no representa la vista tras aceptar el cierre.
    // Se transforma en el destino real sin dejar una entrada #workout fantasma.
    history.replaceState({ tab: 'history' }, '', '#history');
}

function consumePendingWorkoutBackResolution() {
    const resolution = pendingBackResolution;
    if (!resolution?.context?.workoutActive) return false;

    if (window.GymNotesModal?.isOpen?.()) {
        window.GymNotesModal.dismiss?.();
    }

    // Este popstate ya consumiÃ³ la entrada protectora. La reconstrucciÃ³n es
    // inmediata y no ejecuta manejadores inferiores ni un segundo cierre.
    stabilizeConsumedPopState(resolution.context, resolution, true);
    return true;
}

/**
 * Ejecuta consumidores por prioridad y usa el fallback heredado solo cuando
 * ninguno absorbe Atras. El bloqueo cubre promesas de confirmacion.
 */
async function resolveBackAction(context, legacyFallback) {
    if (backResolutionPending) {
        if (consumePendingWorkoutBackResolution()) {
            return BACK_ACTION_RESULT.PENDING_CONFIRMATION;
        }
        console.warn('[back-handler] Accion Atras ignorada: hay una resolucion pendiente.');
        return BACK_ACTION_RESULT.PENDING_CONFIRMATION;
    }

    backResolutionPending = true;
    const resolution = {
        context,
        historyStabilized: false
    };
    pendingBackResolution = resolution;

    // Un popstate ya desplazÃ³ el Ã­ndice del navegador. Para Entrenamiento
    // Activo, la entrada protectora se repone antes del primer await del
    // resolvedor, de modo que un segundo AtrÃ¡s no alcanza una entrada externa.
    if (context.workoutActive) {
        stabilizeConsumedPopState(context, resolution);
    }

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
                    if (handler.id === 'active-workout') {
                        reconcileClosedWorkoutHistory(resolution);
                    }
                    stabilizeConsumedPopState(context, resolution);
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
        if (pendingBackResolution === resolution) {
            pendingBackResolution = null;
        }
    }
}

/**
 * Crea solo el contexto que consumen el resolvedor y el fallback. No expone
 * estado mutable ni crea una pila de navegaciÃ³n paralela.
 */
function buildBackContext(event) {
    const workoutModal = document.getElementById('active-workout');
    const visibleScreen = document.querySelector('.screen:not(.hidden)');
    const isWorkoutVisible = workoutModal?.style.display === 'flex';

    return Object.freeze({
        source: 'popstate',
        state: event?.state ?? null,
        currentTab,
        visibleScreenId: visibleScreen?.id?.replace('screen-', '') || null,
        historyReturnScreen: window.historyReturnScreen || null,
        workoutActive: Boolean(isWorkoutVisible)
    });
}

/**
 * El diÃ¡logo comÃºn pertenece al nÃºcleo. Cada mÃ³dulo propietario registra sus
 * propias capas con register({ id, priority, canHandle, handle }).
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
// INICIALIZACIÃ“N
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
    // RC-21 ya cubre editor de sesiÃ³n, detalle de Historial y visor de
    // ejercicios. El editor de Ejercicios aÃºn conserva solo su retorno
    // heredado closeExerciseModal(), por lo que necesita este Ãºltimo fallback.
    const exerciseEditor = document.getElementById('screen-exercise-editor');
    return Boolean(exerciseEditor && !exerciseEditor.classList.contains('hidden'));
}

// ==========================================================================
// MANEJADOR DE POPSTATE (BOTÃ“N DE RETROCESO)
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
 * Compatibilidad mÃ­nima: resuelve salida en raÃ­z, navegaciÃ³n principal, el
 * editor de Ejercicios no migrado y el entrenamiento si su estado legado es
 * el Ãºnico disponible. Mantiene las confirmaciones asÃ­ncronas bajo el mismo
 * bloqueo de reentrancia del resolvedor.
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
            'Â¿Salir del entrenamiento? Se perderÃ¡n las notas no guardadas.',
            'Cancelar entrenamiento'
        ).then((confirmado) => {
            if (confirmado) {
                console.log('[back-handler] Usuario confirmÃ³ salida del entrenamiento.');
                // Llamar a la funciÃ³n de cierre del entrenamiento (definida en workout.js)
                if (typeof window.cerrarEntrenamiento === 'function') {
                    return window.cerrarEntrenamiento();
                } else {
                    // Fallback: cerrar manualmente
                    if (workoutModal) workoutModal.style.display = 'none';
                    liberarBloqueoEntrenamiento();
                }
            } else {
                console.log('[back-handler] Usuario cancelÃ³. Reconstruyendo trampa...');
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

    // CASO 2: NavegaciÃ³n entre pestaÃ±as (hay estado)
    if (state && state.tab && state.tab !== 'workout') {
        console.log('[back-handler] Navegando a pestaÃ±a:', state.tab);
        window.switchTab(state.tab, { noPushState: true });
        return;
    }

    // CASO 3: Sin estado (raÃ­z)
    console.log('[back-handler] Estado raÃ­z detectado.');

    if (hayPantallaInternaVisible()) {
        console.log('[back-handler] Pantalla interna visible. Cerrando...');
        window.switchTab(currentTab, { noPushState: true });
        history.pushState({ tab: currentTab }, '', '#' + currentTab);
        return;
    }

    console.log('[back-handler] Mostrando confirmaciÃ³n de salida de la app.');
    return window.showConfirm(
        'Â¿EstÃ¡s seguro de que quieres salir de Gym Notes?',
        'Salir de la app'
    ).then((confirmado) => {
        if (confirmado) {
            console.log('[back-handler] Usuario confirmÃ³ salir de la app.');
            window.removeEventListener('popstate', handlePopState);
            setTimeout(() => {
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    window.close();
                }
            }, 100);
        } else {
            console.log('[back-handler] Usuario cancelÃ³ salida. Restaurando estado.');
            history.pushState({ tab: currentTab }, '', '#' + currentTab);
        }
    });
}

// ==========================================================================
// FUNCIÃ“N PARA NAVEGAR ENTRE PESTAÃ‘AS
// ==========================================================================

function navigateToTab(tabName) {
    if (esBloqueoActivo) {
        console.warn('[back-handler] No se puede cambiar de pestaÃ±a durante el entrenamiento.');
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
// EXPOSICIÃ“N GLOBAL
// ==========================================================================

window.initBackHandler = initBackHandler;
window.alAbrirEntrenamiento = alAbrirEntrenamiento;
window.liberarBloqueoEntrenamiento = liberarBloqueoEntrenamiento;
window.navigateToTab = navigateToTab;
window.setCurrentTab = setCurrentTab;
/**
 * API pÃºblica mÃ­nima para mÃ³dulos propietarios. register() sustituye un ID
 * existente de forma idempotente; isOverlayVisible() evita inferir overlays
 * dinÃ¡micos desde banderas histÃ³ricas.
 */
window.GymNotesBackNavigation = Object.freeze({
    register: registerBackHandler,
    unregister: unregisterBackHandler,
    isOverlayVisible: isBackNavigationOverlayVisible,
    PRIORITY: BACK_HANDLER_PRIORITY,
    RESULT: BACK_ACTION_RESULT
});

// ui-helpers.js se carga antes que este nÃºcleo y expone el Ãºnico registro
// compartido para los menÃºs de cabecera.
window.registerHeaderOptionsMenuBackHandler?.();

// ==========================================================================
// INICIALIZACIÃ“N AUTOMÃTICA
// ==========================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBackHandler);
} else {
    initBackHandler();
}

console.log('[back-handler] MÃ³dulo cargado correctamente.');
