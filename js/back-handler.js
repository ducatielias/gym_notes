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
 * Orden semántico de las capas de Atrás. Dentro de una misma prioridad gana
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

// RC-21H.1-METRICS START
// Diagnóstico temporal en memoria para reproducir Atrás en móviles sin DevTools.
const RC21H_METRICS_MAX_EVENTS = 120;
let rc21hMetricsEvents = [];
let rc21hMetricsCaptureActive = false;
let rc21hMetricsPanel = null;
let rc21hMetricsLongPressTimer = null;
let rc21hMetricsInitialized = false;

function cloneRC21HMetricValue(value) {
    try {
        return JSON.parse(JSON.stringify(value ?? null));
    } catch (error) {
        return '[no-serializable]';
    }
}

function isRC21HMetricElementVisible(elementId) {
    const element = document.getElementById(elementId);
    return Boolean(
        element
        && element.isConnected
        && !element.hidden
        && !element.classList.contains('hidden')
        && element.style.display !== 'none'
        && element.getAttribute('aria-hidden') !== 'true'
    );
}

function getRC21HMetricVisibleScreen() {
    return document.querySelector('.screen:not(.hidden)')?.id || null;
}

function createRC21HMetricEntry(type, phase, details = {}) {
    const visualViewport = window.visualViewport;
    const workoutExists = typeof aw_currentWorkout !== 'undefined' && Boolean(aw_currentWorkout);

    return {
        timestamp: Number(performance.now().toFixed(2)),
        recordedAt: new Date().toISOString(),
        type,
        phase,
        historyState: cloneRC21HMetricValue(history.state),
        historyLength: history.length,
        href: window.location.href,
        hash: window.location.hash,
        visibilityState: document.visibilityState,
        documentHasFocus: document.hasFocus(),
        visibleScreen: getRC21HMetricVisibleScreen(),
        backResolutionPending,
        workoutExists,
        workoutLockActive: esBloqueoActivo,
        activeWorkoutVisible: isRC21HMetricElementVisible('active-workout'),
        commonModalVisible: isRC21HMetricElementVisible('customModal'),
        historyReturnScreen: window.historyReturnScreen || null,
        details: cloneRC21HMetricValue(details),
        viewport: {
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight,
            visualWidth: visualViewport?.width ?? null,
            visualHeight: visualViewport?.height ?? null,
            visualOffsetTop: visualViewport?.offsetTop ?? null
        }
    };
}

function refreshRC21HMetricsPanel() {
    if (!rc21hMetricsPanel?.isConnected) return;

    const count = rc21hMetricsPanel.querySelector('[data-rc21h-count]');
    const output = rc21hMetricsPanel.querySelector('[data-rc21h-output]');
    if (count) count.textContent = `Eventos registrados: ${rc21hMetricsEvents.length}`;
    if (output) output.value = JSON.stringify(createRC21HMetricsSnapshot(), null, 2);
}

function recordRC21HMetric(type, phase, details = {}) {
    if (!rc21hMetricsCaptureActive) return;

    try {
        rc21hMetricsEvents.push(createRC21HMetricEntry(type, phase, details));
        if (rc21hMetricsEvents.length > RC21H_METRICS_MAX_EVENTS) {
            rc21hMetricsEvents.shift();
        }
        refreshRC21HMetricsPanel();
    } catch (error) {
        // Un fallo del diagnóstico nunca debe afectar a la navegación real.
    }
}

function createRC21HMetricsSnapshot() {
    const visualViewport = window.visualViewport;

    return {
        metadata: {
            userAgent: navigator.userAgent || null,
            platform: navigator.userAgentData?.platform || navigator.platform || null,
            standalone: Boolean(
                navigator.standalone
                || window.matchMedia?.('(display-mode: standalone)').matches
            ),
            viewport: {
                innerWidth: window.innerWidth,
                innerHeight: window.innerHeight
            },
            visualViewport: visualViewport ? {
                width: visualViewport.width,
                height: visualViewport.height,
                offsetTop: visualViewport.offsetTop
            } : null,
            capturedAt: new Date().toISOString()
        },
        events: cloneRC21HMetricValue(rc21hMetricsEvents)
    };
}

function clearRC21HMetrics() {
    rc21hMetricsEvents = [];
    refreshRC21HMetricsPanel();
}

function closeRC21HMetricsPanel() {
    if (rc21hMetricsPanel?.isConnected) {
        rc21hMetricsPanel.remove();
    }
    rc21hMetricsPanel = null;
}

async function copyRC21HMetrics() {
    const serializedSnapshot = JSON.stringify(createRC21HMetricsSnapshot(), null, 2);
    const output = rc21hMetricsPanel?.querySelector('[data-rc21h-output]');
    if (output) {
        output.value = serializedSnapshot;
        output.select();
    }

    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(serializedSnapshot);
            return true;
        }
    } catch (error) {
        // El textarea visible mantiene una alternativa seleccionable sin red.
    }

    try {
        return Boolean(document.execCommand?.('copy'));
    } catch (error) {
        return false;
    }
}

function showRC21HMetricsPanel() {
    if (rc21hMetricsPanel?.isConnected) {
        refreshRC21HMetricsPanel();
        return;
    }

    const panel = document.createElement('section');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'RC-21H Diagnóstico');
    panel.style.cssText = [
        'position:fixed',
        'z-index:10000',
        'inset:12px',
        'display:flex',
        'flex-direction:column',
        'gap:10px',
        'padding:16px',
        'background:#fffdf8',
        'color:#25241e',
        'border:2px solid #2b2a24',
        'border-radius:16px',
        'box-shadow:0 8px 24px rgba(0,0,0,.24)',
        'font:14px system-ui,sans-serif'
    ].join(';');

    const title = document.createElement('strong');
    title.textContent = 'RC-21H Diagnóstico';

    const count = document.createElement('span');
    count.textContent = 'Eventos registrados: 0';
    count.setAttribute('data-rc21h-count', '');

    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.textContent = 'Copiar diagnóstico';
    copyButton.addEventListener('click', async () => {
        const copied = await copyRC21HMetrics();
        copyButton.textContent = copied ? 'Diagnóstico copiado' : 'Selecciona y copia el texto';
    });

    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.textContent = 'Limpiar';
    clearButton.addEventListener('click', clearRC21HMetrics);

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.textContent = 'Cerrar';
    closeButton.addEventListener('click', closeRC21HMetricsPanel);

    const output = document.createElement('textarea');
    output.readOnly = true;
    output.setAttribute('data-rc21h-output', '');
    output.setAttribute('aria-label', 'Diagnóstico seleccionable');
    output.style.cssText = 'flex:1;min-height:180px;width:100%;resize:vertical;font:11px ui-monospace,monospace;box-sizing:border-box';

    panel.append(title, count, copyButton, clearButton, closeButton, output);
    document.body.appendChild(panel);
    rc21hMetricsPanel = panel;
    refreshRC21HMetricsPanel();
}

function clearRC21HMetricsLongPress() {
    if (rc21hMetricsLongPressTimer !== null) {
        window.clearTimeout(rc21hMetricsLongPressTimer);
        rc21hMetricsLongPressTimer = null;
    }
}

function handleRC21HMetricsPointerDown(event) {
    if (!rc21hMetricsCaptureActive) return;

    const target = event.target instanceof Element ? event.target.closest('#aw-session-title') : null;
    if (!target) return;

    clearRC21HMetricsLongPress();
    rc21hMetricsLongPressTimer = window.setTimeout(() => {
        rc21hMetricsLongPressTimer = null;
        showRC21HMetricsPanel();
    }, 1000);
}

function startRC21HMetricsCapture() {
    rc21hMetricsCaptureActive = true;
    rc21hMetricsEvents = [];
    recordRC21HMetric('metrics-capture-start', 'workout-opened');
}

function stopRC21HMetricsCapture() {
    recordRC21HMetric('metrics-capture-stopped', 'workout-closed');
    rc21hMetricsCaptureActive = false;
    clearRC21HMetricsLongPress();
}

function initRC21HMetrics() {
    if (rc21hMetricsInitialized) return;

    document.addEventListener('pointerdown', handleRC21HMetricsPointerDown, { passive: true });
    document.addEventListener('pointerup', clearRC21HMetricsLongPress, { passive: true });
    document.addEventListener('pointercancel', clearRC21HMetricsLongPress, { passive: true });
    window.addEventListener('rc21h-metric', (event) => {
        const detail = event.detail || {};
        recordRC21HMetric(detail.type || 'external-metric', detail.phase || 'unknown', detail.details || {});
    });
    document.addEventListener('visibilitychange', () => {
        recordRC21HMetric('visibilitychange', 'document', { visibilityState: document.visibilityState });
    });
    window.addEventListener('pagehide', (event) => {
        recordRC21HMetric('pagehide', 'document', { persisted: Boolean(event.persisted) });
    });
    window.addEventListener('pageshow', (event) => {
        recordRC21HMetric('pageshow', 'document', { persisted: Boolean(event.persisted) });
    });
    window.addEventListener('beforeunload', () => {
        recordRC21HMetric('beforeunload', 'document');
    });

    window.RC21HMetrics = Object.freeze({
        show: showRC21HMetricsPanel,
        copy: copyRC21HMetrics,
        clear: clearRC21HMetrics,
        snapshot: () => cloneRC21HMetricValue(createRC21HMetricsSnapshot())
    });
    rc21hMetricsInitialized = true;
}
// RC-21H.1-METRICS END

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
function stabilizeConsumedPopState(context) {
    if (context?.source !== 'popstate') return;

    recordRC21HMetric('stabilization-start', 'history', {
        workoutActive: context.workoutActive,
        visibleScreenId: context.visibleScreenId
    });

    if (context.workoutActive) {
        const workoutModal = document.getElementById('active-workout');

        // Si el cierre confirmado ya ocultó el entrenamiento, se mantiene la
        // navegación que ejecutó cerrarEntrenamiento() en lugar de recrear
        // una entrada #workout que ya no representa la vista actual.
        if (workoutModal?.style.display !== 'flex') {
            recordRC21HMetric('stabilization-complete', 'history', { strategy: 'workout-closed' });
            return;
        }

        history.pushState({ tab: 'workout' }, '', '#workout');
        recordRC21HMetric('stabilization-complete', 'history', { strategy: 'workout' });
        return;
    }

    if (context.visibleScreenId === 'history' && context.historyReturnScreen === 'workout') {
        history.pushState({ tab: 'history', returnScreen: 'workout' }, '', '#history');
        recordRC21HMetric('stabilization-complete', 'history', { strategy: 'workout-history' });
        return;
    }

    const mainTabs = ['today', 'plan', 'history', 'exercises'];
    const tabToRestore = mainTabs.includes(context.currentTab) ? context.currentTab : null;

    if (!tabToRestore) {
        console.warn('[back-handler] No se pudo estabilizar el historial: pestana principal desconocida.');
        recordRC21HMetric('stabilization-complete', 'history', { strategy: 'skipped' });
        return;
    }

    history.pushState({ tab: tabToRestore }, '', '#' + tabToRestore);
    recordRC21HMetric('stabilization-complete', 'history', { strategy: 'main-tab', tab: tabToRestore });
}

/**
 * Ejecuta consumidores por prioridad y usa el fallback heredado solo cuando
 * ninguno absorbe Atras. El bloqueo cubre promesas de confirmacion.
 */
async function resolveBackAction(context, legacyFallback) {
    if (backResolutionPending) {
        console.warn('[back-handler] Accion Atras ignorada: hay una resolucion pendiente.');
        recordRC21HMetric('back-ignored-pending', 'reentrancy');
        return BACK_ACTION_RESULT.PENDING_CONFIRMATION;
    }

    backResolutionPending = true;
    recordRC21HMetric('resolution-lock-enabled', 'reentrancy');
    recordRC21HMetric('resolver-start', 'back-resolution');

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

            recordRC21HMetric('handler-selected', 'back-resolution', {
                id: handler.id,
                priority: handler.priority
            });
            if (handler.id === 'active-workout') {
                recordRC21HMetric('active-workout-handler-start', 'back-handler');
                recordRC21HMetric('close-workout-called', 'back-handler');
            }

            try {
                const result = normalizeBackActionResult(
                    await handler.handle(context),
                    handler.id
                );
                if (handler.id === 'active-workout') {
                    recordRC21HMetric('close-workout-resolved', 'back-handler', { result });
                    recordRC21HMetric('active-workout-handler-complete', 'back-handler', { result });
                }
                recordRC21HMetric('handler-result', 'back-resolution', {
                    id: handler.id,
                    result
                });

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
                recordRC21HMetric('fallback-start', 'back-resolution');
                const result = normalizeBackActionResult(
                    await legacyFallback(context),
                    'fallback-heredado'
                );
                recordRC21HMetric('handler-result', 'back-resolution', {
                    id: 'fallback-heredado',
                    result
                });
                return result;
            } catch (error) {
                console.error('[back-handler] Error en el fallback heredado.', error);
            }
        }

        return BACK_ACTION_RESULT.NOT_CONSUMED;
    } finally {
        backResolutionPending = false;
        recordRC21HMetric('resolution-lock-released', 'reentrancy');
    }
}

/**
 * Crea solo el contexto que consumen el resolvedor y el fallback. No expone
 * estado mutable ni crea una pila de navegación paralela.
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
 * El diálogo común pertenece al núcleo. Cada módulo propietario registra sus
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
// INICIALIZACIÓN
// ==========================================================================

function initBackHandler() {
    if (backHandlerInitialized) return;
    initRC21HMetrics();
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
    startRC21HMetricsCapture();
    history.pushState({ tab: 'workout' }, '', '#workout');
    recordRC21HMetric('workout-history-entry-created', 'training');
    console.log('[back-handler] Entrenamiento abierto, estado pushState.');
}

function liberarBloqueoEntrenamiento() {
    esBloqueoActivo = false;
    stopRC21HMetricsCapture();
    console.log('[back-handler] Bloqueo de entrenamiento liberado.');
}

// ==========================================================================
// DETECTAR PANTALLAS INTERNAS
// ==========================================================================

function hayPantallaInternaVisible() {
    // RC-21 ya cubre editor de sesión, detalle de Historial y visor de
    // ejercicios. El editor de Ejercicios aún conserva solo su retorno
    // heredado closeExerciseModal(), por lo que necesita este último fallback.
    const exerciseEditor = document.getElementById('screen-exercise-editor');
    return Boolean(exerciseEditor && !exerciseEditor.classList.contains('hidden'));
}

// ==========================================================================
// MANEJADOR DE POPSTATE (BOTÓN DE RETROCESO)
// ==========================================================================

function handlePopState(event) {
    recordRC21HMetric('popstate-received', 'history', { eventState: cloneRC21HMetricValue(event?.state) });
    const context = buildBackContext(event);
    recordRC21HMetric('back-context-built', 'history', { eventState: context.state });

    void resolveBackAction(context, runLegacyBackFallback)
        .then((result) => {
            recordRC21HMetric('popstate-complete', 'history', { result });
        })
        .catch((error) => {
            // El resolvedor ya aisla fallos de consumidores concretos. Este cierre
            // evita una promesa rechazada si falla la infraestructura global.
            recordRC21HMetric('popstate-complete', 'history', { result: 'error' });
            console.error('[back-handler] Error no controlado resolviendo Atras.', error);
        });
}

/**
 * Compatibilidad mínima: resuelve salida en raíz, navegación principal, el
 * editor de Ejercicios no migrado y el entrenamiento si su estado legado es
 * el único disponible. Mantiene las confirmaciones asíncronas bajo el mismo
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
/**
 * API pública mínima para módulos propietarios. register() sustituye un ID
 * existente de forma idempotente; isOverlayVisible() evita inferir overlays
 * dinámicos desde banderas históricas.
 */
window.GymNotesBackNavigation = Object.freeze({
    register: registerBackHandler,
    unregister: unregisterBackHandler,
    isOverlayVisible: isBackNavigationOverlayVisible,
    PRIORITY: BACK_HANDLER_PRIORITY,
    RESULT: BACK_ACTION_RESULT
});

// ui-helpers.js se carga antes que este núcleo y expone el único registro
// compartido para los menús de cabecera.
window.registerHeaderOptionsMenuBackHandler?.();

// ==========================================================================
// INICIALIZACIÓN AUTOMÁTICA
// ==========================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBackHandler);
} else {
    initBackHandler();
}

console.log('[back-handler] Módulo cargado correctamente.');
