/**
 * GN-21X-E0-MEASURE
 * Instrumentación temporal para comparar dos estados del chrome móvil.
 * No modifica la geometría ni el comportamiento funcional de GymNotes.
 */
(function initializeViewportE0Metrics() {
    'use strict';

    const PANEL_ID = 'gn-viewport-e0-metrics';
    const REQUIRED_TAPS = 5;
    const TAP_WINDOW_MS = 1800;

    let tapTimestamps = [];
    let currentSnapshot = null;
    let previouslyFocusedElement = null;

    function roundMetric(value) {
        return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
    }

    function getRectMetrics(element) {
        if (!element) return null;

        const rect = element.getBoundingClientRect();
        return {
            top: roundMetric(rect.top),
            bottom: roundMetric(rect.bottom),
            height: roundMetric(rect.height)
        };
    }

    function getEffectiveDisplayMode() {
        return ['fullscreen', 'standalone', 'browser']
            .find(mode => window.matchMedia(`(display-mode: ${mode})`).matches)
            || 'unknown';
    }

    function measureViewportUnits() {
        return ['vh', 'dvh', 'svh', 'lvh'].reduce((measurements, unit) => {
            if (!window.CSS?.supports?.('height', `100${unit}`)) {
                measurements[`100${unit}`] = 'unsupported';
                return measurements;
            }

            const probe = document.createElement('div');
            probe.className = `gn-viewport-e0-metrics__unit-probe gn-viewport-e0-metrics__unit-probe--${unit}`;
            probe.setAttribute('aria-hidden', 'true');
            document.body.appendChild(probe);
            measurements[`100${unit}`] = roundMetric(probe.getBoundingClientRect().height);
            probe.remove();
            return measurements;
        }, {});
    }

    function measureNativeSafeArea() {
        const probe = document.createElement('div');
        probe.className = 'gn-viewport-e0-metrics__safe-probe';
        probe.setAttribute('aria-hidden', 'true');
        document.body.appendChild(probe);

        const styles = window.getComputedStyle(probe);
        const measurements = {
            top: styles.paddingTop,
            bottom: styles.paddingBottom
        };

        probe.remove();
        return measurements;
    }

    function captureSnapshot() {
        const visualViewport = window.visualViewport;
        const rootStyles = window.getComputedStyle(document.documentElement);
        const body = document.body;
        const mainContent = document.getElementById('main-content');
        const visibleScreen = document.querySelector('.screen:not(.hidden)');
        const header = document.querySelector('#screen-today > .gn-screen-header');
        const navbar = document.querySelector('.bottom-nav');
        const headerStyles = header ? window.getComputedStyle(header) : null;
        const navbarStyles = navbar ? window.getComputedStyle(navbar) : null;

        const snapshot = {
            phase: 'GN-21X-E0-MEASURE',
            capturedAt: new Date().toISOString(),
            displayMode: getEffectiveDisplayMode(),
            viewport: {
                innerHeight: roundMetric(window.innerHeight),
                clientHeight: roundMetric(document.documentElement.clientHeight),
                visualViewport: visualViewport
                    ? {
                        height: roundMetric(visualViewport.height),
                        offsetTop: roundMetric(visualViewport.offsetTop),
                        pageTop: roundMetric(visualViewport.pageTop)
                    }
                    : null
            },
            viewportUnits: measureViewportUnits(),
            nativeSafeArea: measureNativeSafeArea(),
            gymNotesTokens: {
                safeTop: rootStyles.getPropertyValue('--gn-safe-top').trim(),
                safeBottom: rootStyles.getPropertyValue('--gn-safe-bottom').trim()
            },
            rootGeometry: {
                bodyHeight: getRectMetrics(body)?.height ?? null,
                mainContentHeight: getRectMetrics(mainContent)?.height ?? null,
                visibleScreenHeight: getRectMetrics(visibleScreen)?.height ?? null
            },
            header: {
                ...getRectMetrics(header),
                paddingTop: headerStyles?.paddingTop ?? null
            },
            navbar: {
                ...getRectMetrics(navbar),
                computedBottom: navbarStyles?.bottom ?? null
            },
            scroll: {
                windowScrollY: roundMetric(window.scrollY)
            }
        };

        currentSnapshot = snapshot;
        return snapshot;
    }

    function setStatus(message) {
        const status = document.querySelector(`#${PANEL_ID} .gn-viewport-e0-metrics__status`);
        if (status) status.textContent = message;
    }

    function renderSnapshot(snapshot) {
        const panel = document.getElementById(PANEL_ID);
        const output = panel?.querySelector('.gn-viewport-e0-metrics__output');
        const summary = panel?.querySelector('.gn-viewport-e0-metrics__summary');
        if (!panel || !output || !summary) return;

        output.textContent = JSON.stringify(snapshot, null, 2);
        summary.textContent = `${snapshot.displayMode} · ${snapshot.capturedAt}`;
        setStatus('Captura lista para copiar.');
    }

    function handlePanelKeydown(event) {
        if (event.key === 'Escape') closePanel();
    }

    function closePanel() {
        const panel = document.getElementById(PANEL_ID);
        if (!panel || panel.hidden) return;

        panel.hidden = true;
        panel.setAttribute('aria-hidden', 'true');
        tapTimestamps = [];
        document.removeEventListener('keydown', handlePanelKeydown);

        if (previouslyFocusedElement instanceof HTMLElement && previouslyFocusedElement.isConnected) {
            previouslyFocusedElement.focus({ preventScroll: true });
        }
        previouslyFocusedElement = null;
    }

    function openPanel() {
        const panel = document.getElementById(PANEL_ID);
        if (!panel) return;

        // La captura canónica ocurre antes de que el overlay sea visible.
        const snapshot = captureSnapshot();
        previouslyFocusedElement = document.activeElement;
        panel.hidden = false;
        panel.setAttribute('aria-hidden', 'false');
        renderSnapshot(snapshot);
        document.addEventListener('keydown', handlePanelKeydown);
        panel.querySelector('.gn-viewport-e0-metrics__close')?.focus({ preventScroll: true });
    }

    function refreshSnapshot() {
        renderSnapshot(captureSnapshot());
    }

    async function copySnapshot() {
        if (!currentSnapshot) currentSnapshot = captureSnapshot();

        try {
            await navigator.clipboard.writeText(JSON.stringify(currentSnapshot, null, 2));
            setStatus('JSON copiado al portapapeles.');
        } catch (error) {
            console.warn('[GN-21X-E0-MEASURE] No se pudo copiar el JSON.', error);
            setStatus('No se pudo copiar automáticamente; selecciona el JSON visible.');
        }
    }

    function createButton(label, className, handler) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.textContent = label;
        button.addEventListener('click', handler);
        return button;
    }

    function createPanel() {
        const overlay = document.createElement('div');
        overlay.id = PANEL_ID;
        overlay.hidden = true;
        overlay.setAttribute('aria-hidden', 'true');

        const dialog = document.createElement('section');
        dialog.className = 'gn-viewport-e0-metrics__panel';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', 'gn-viewport-e0-metrics-title');

        const header = document.createElement('header');
        header.className = 'gn-viewport-e0-metrics__header';

        const headingGroup = document.createElement('div');
        const title = document.createElement('h2');
        title.id = 'gn-viewport-e0-metrics-title';
        title.className = 'gn-viewport-e0-metrics__title';
        title.textContent = 'Viewport · E0';
        const summary = document.createElement('p');
        summary.className = 'gn-viewport-e0-metrics__summary';
        headingGroup.append(title, summary);

        const closeButton = createButton(
            'Cerrar',
            'gn-viewport-e0-metrics__button gn-viewport-e0-metrics__close',
            closePanel
        );
        header.append(headingGroup, closeButton);

        const output = document.createElement('pre');
        output.className = 'gn-viewport-e0-metrics__output';
        output.tabIndex = 0;

        const actions = document.createElement('footer');
        actions.className = 'gn-viewport-e0-metrics__actions';
        const refreshButton = createButton(
            'Actualizar',
            'gn-viewport-e0-metrics__button',
            refreshSnapshot
        );
        const copyButton = createButton(
            'Copiar JSON',
            'gn-viewport-e0-metrics__button',
            copySnapshot
        );
        const status = document.createElement('p');
        status.className = 'gn-viewport-e0-metrics__status';
        status.setAttribute('aria-live', 'polite');
        actions.append(refreshButton, copyButton, status);

        dialog.append(header, output, actions);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
    }

    function handleTodayTitleTap(event) {
        const screen = event.currentTarget;
        const title = event.target.closest('.today-header__title, .gn-screen-header h1');
        if (!title || !screen.contains(title) || title.textContent.trim() !== 'Gym Notes') return;

        const now = performance.now();
        tapTimestamps = tapTimestamps.filter(timestamp => now - timestamp <= TAP_WINDOW_MS);
        tapTimestamps.push(now);

        if (tapTimestamps.length < REQUIRED_TAPS) return;

        tapTimestamps = [];
        openPanel();
    }

    function initialize() {
        const todayScreen = document.getElementById('screen-today');
        if (!todayScreen || document.getElementById(PANEL_ID)) return;

        createPanel();
        todayScreen.addEventListener('click', handleTodayTitleTap);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        initialize();
    }
})();
