/**
 * GN-21X-D-MEASURE
 * Instrumentación temporal para comparar viewport, safe areas y geometría
 * entre una pestaña normal y las PWAs instaladas de GymNotes.
 */
(function initializeViewportDiagnostics() {
    'use strict';

    const PANEL_ID = 'gn-viewport-diagnostics';
    const RAPID_TAP_WINDOW_MS = 1800;
    const REQUIRED_TAPS = 5;
    const DISPLAY_MODES = ['fullscreen', 'standalone', 'minimal-ui', 'browser'];

    let rapidTapTimestamps = [];
    let currentSnapshot = null;
    let previouslyFocusedElement = null;

    function roundMetric(value) {
        return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
    }

    function getRect(element) {
        if (!element) return null;

        const rect = element.getBoundingClientRect();
        return {
            top: roundMetric(rect.top),
            right: roundMetric(rect.right),
            bottom: roundMetric(rect.bottom),
            left: roundMetric(rect.left),
            width: roundMetric(rect.width),
            height: roundMetric(rect.height)
        };
    }

    function getComputedMetrics(element, properties) {
        if (!element) return null;

        const styles = window.getComputedStyle(element);
        return properties.reduce((metrics, property) => {
            metrics[property] = styles.getPropertyValue(property);
            return metrics;
        }, {});
    }

    function getElementMetrics(element, properties) {
        if (!element) return null;

        return {
            selector: element === document.documentElement
                ? 'html'
                : element === document.body
                    ? 'body'
                    : element.id
                        ? `#${element.id}`
                        : `.${Array.from(element.classList).join('.')}`,
            rect: getRect(element),
            clientHeight: element.clientHeight,
            offsetHeight: element.offsetHeight,
            scrollHeight: element.scrollHeight,
            computed: getComputedMetrics(element, properties)
        };
    }

    function detectDisplayMode() {
        const matches = DISPLAY_MODES.reduce((result, mode) => {
            result[mode] = window.matchMedia(`(display-mode: ${mode})`).matches;
            return result;
        }, {});

        return {
            effective: DISPLAY_MODES.find(mode => matches[mode]) || 'unknown',
            matches
        };
    }

    function measureSafeAreas() {
        const probe = document.createElement('div');
        probe.className = 'gn-viewport-diagnostics__probe';
        probe.setAttribute('aria-hidden', 'true');
        document.body.appendChild(probe);

        const styles = window.getComputedStyle(probe);
        const measured = {
            top: styles.paddingTop,
            right: styles.paddingRight,
            bottom: styles.paddingBottom,
            left: styles.paddingLeft
        };

        probe.remove();
        return measured;
    }

    function measureViewportUnits() {
        return ['vh', 'dvh', 'svh', 'lvh'].reduce((metrics, unit) => {
            const supported = window.CSS?.supports?.('height', `100${unit}`) ?? false;
            if (!supported) {
                metrics[`100${unit}`] = 'unsupported';
                return metrics;
            }

            const probe = document.createElement('div');
            probe.className = `gn-viewport-diagnostics__unit-probe gn-viewport-diagnostics__unit-probe--${unit}`;
            probe.setAttribute('aria-hidden', 'true');
            document.body.appendChild(probe);
            metrics[`100${unit}`] = `${roundMetric(probe.getBoundingClientRect().height)}px`;
            probe.remove();
            return metrics;
        }, {});
    }

    function captureViewportDiagnostics() {
        const rootStyles = window.getComputedStyle(document.documentElement);
        const visualViewport = window.visualViewport;
        const visibleScreen = document.querySelector('.screen:not(.hidden)');
        const todayHeader = document.querySelector('#screen-today > .gn-screen-header');
        const todayHeaderRow = todayHeader?.querySelector('.gn-screen-header__row') || null;
        const bottomNav = document.querySelector('.bottom-nav');
        const navRect = getRect(bottomNav);
        const visualViewportBottom = visualViewport
            ? visualViewport.offsetTop + visualViewport.height
            : null;

        const boxProperties = [
            'height',
            'min-height',
            'max-height',
            'padding-top',
            'padding-bottom',
            'margin-top',
            'margin-bottom',
            'position',
            'overflow-y',
            'background-color'
        ];

        const snapshot = {
            phase: 'GN-21X-D-MEASURE',
            capturedAt: new Date().toISOString(),
            displayMode: detectDisplayMode(),
            viewport: {
                innerWidth: window.innerWidth,
                innerHeight: window.innerHeight,
                documentClientWidth: document.documentElement.clientWidth,
                documentClientHeight: document.documentElement.clientHeight,
                visualViewport: visualViewport
                    ? {
                        width: roundMetric(visualViewport.width),
                        height: roundMetric(visualViewport.height),
                        offsetTop: roundMetric(visualViewport.offsetTop),
                        offsetLeft: roundMetric(visualViewport.offsetLeft),
                        pageTop: roundMetric(visualViewport.pageTop),
                        pageLeft: roundMetric(visualViewport.pageLeft),
                        scale: roundMetric(visualViewport.scale)
                    }
                    : null,
                units: measureViewportUnits()
            },
            safeAreas: {
                measured: measureSafeAreas(),
                rootTokens: {
                    gnSafeTop: rootStyles.getPropertyValue('--gn-safe-top').trim(),
                    gnSafeRight: rootStyles.getPropertyValue('--gn-safe-right').trim(),
                    gnSafeBottom: rootStyles.getPropertyValue('--gn-safe-bottom').trim(),
                    gnSafeLeft: rootStyles.getPropertyValue('--gn-safe-left').trim()
                }
            },
            globalGeometry: {
                authoredHeightChain: 'body: 100vh -> #main-content: 100% -> .screen: 100%',
                html: getElementMetrics(document.documentElement, boxProperties),
                body: getElementMetrics(document.body, boxProperties),
                mainContent: getElementMetrics(document.getElementById('main-content'), boxProperties),
                visibleScreen: getElementMetrics(visibleScreen, boxProperties)
            },
            todayHeader: {
                header: getElementMetrics(todayHeader, boxProperties),
                row: getElementMetrics(todayHeaderRow, boxProperties)
            },
            bottomNavigation: {
                navigation: getElementMetrics(bottomNav, [
                    ...boxProperties,
                    'bottom',
                    'padding-left',
                    'padding-right'
                ]),
                distances: navRect
                    ? {
                        bottomToInnerHeight: roundMetric(window.innerHeight - navRect.bottom),
                        bottomToVisualViewportHeight: visualViewport
                            ? roundMetric(visualViewport.height - navRect.bottom)
                            : null,
                        bottomToVisualViewportEdge: visualViewportBottom === null
                            ? null
                            : roundMetric(visualViewportBottom - navRect.bottom)
                    }
                    : null
            },
            surfaces: {
                html: getComputedMetrics(document.documentElement, ['background-color']),
                body: getComputedMetrics(document.body, ['background-color']),
                mainContent: getComputedMetrics(document.getElementById('main-content'), ['background-color']),
                visibleScreen: getComputedMetrics(visibleScreen, ['background-color']),
                todayHeader: getComputedMetrics(todayHeader, ['background-color'])
            }
        };

        currentSnapshot = snapshot;
        return snapshot;
    }

    function setPanelStatus(message) {
        const status = document.querySelector(`#${PANEL_ID} .gn-viewport-diagnostics__status`);
        if (status) status.textContent = message;
    }

    function renderSnapshot(snapshot) {
        const panel = document.getElementById(PANEL_ID);
        const output = panel?.querySelector('.gn-viewport-diagnostics__output');
        const mode = panel?.querySelector('.gn-viewport-diagnostics__mode');
        if (!panel || !output || !mode) return;

        output.textContent = JSON.stringify(snapshot, null, 2);
        mode.textContent = `${snapshot.displayMode.effective} · ${snapshot.capturedAt}`;
        setPanelStatus('Captura lista. Usa “Copiar JSON” para compartirla.');
    }

    function closePanel() {
        const panel = document.getElementById(PANEL_ID);
        if (!panel || panel.hidden) return;

        panel.hidden = true;
        panel.setAttribute('aria-hidden', 'true');
        document.removeEventListener('keydown', handlePanelKeydown);

        if (previouslyFocusedElement instanceof HTMLElement && previouslyFocusedElement.isConnected) {
            previouslyFocusedElement.focus({ preventScroll: true });
        }
        previouslyFocusedElement = null;
    }

    function handlePanelKeydown(event) {
        if (event.key === 'Escape') closePanel();
    }

    function openPanel() {
        const panel = document.getElementById(PANEL_ID);
        if (!panel) return;

        // La primera medición se toma antes de mostrar el overlay de diagnóstico.
        const snapshot = captureViewportDiagnostics();
        previouslyFocusedElement = document.activeElement;
        panel.hidden = false;
        panel.setAttribute('aria-hidden', 'false');
        renderSnapshot(snapshot);
        document.addEventListener('keydown', handlePanelKeydown);
        panel.querySelector('.gn-viewport-diagnostics__button--close')?.focus({ preventScroll: true });
    }

    function refreshPanel() {
        renderSnapshot(captureViewportDiagnostics());
    }

    async function copySnapshot() {
        if (!currentSnapshot) refreshPanel();

        try {
            await navigator.clipboard.writeText(JSON.stringify(currentSnapshot, null, 2));
            setPanelStatus('JSON copiado al portapapeles.');
        } catch (error) {
            console.warn('[GN-21X-D-MEASURE] No se pudo copiar la captura.', error);
            setPanelStatus('No se pudo copiar automáticamente. Mantén pulsado el JSON para seleccionarlo.');
        }
    }

    function createPanel() {
        const overlay = document.createElement('div');
        overlay.id = PANEL_ID;
        overlay.hidden = true;
        overlay.setAttribute('aria-hidden', 'true');

        const dialog = document.createElement('section');
        dialog.className = 'gn-viewport-diagnostics__panel';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', 'gn-viewport-diagnostics-title');

        const header = document.createElement('header');
        header.className = 'gn-viewport-diagnostics__header';

        const headingGroup = document.createElement('div');
        const title = document.createElement('h2');
        title.id = 'gn-viewport-diagnostics-title';
        title.className = 'gn-viewport-diagnostics__title';
        title.textContent = 'Diagnóstico de viewport';
        const mode = document.createElement('p');
        mode.className = 'gn-viewport-diagnostics__mode';
        headingGroup.append(title, mode);

        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'gn-viewport-diagnostics__button gn-viewport-diagnostics__button--close';
        closeButton.textContent = 'Cerrar';
        closeButton.addEventListener('click', closePanel);
        header.append(headingGroup, closeButton);

        const output = document.createElement('pre');
        output.className = 'gn-viewport-diagnostics__output';
        output.tabIndex = 0;

        const actions = document.createElement('footer');
        actions.className = 'gn-viewport-diagnostics__actions';

        const refreshButton = document.createElement('button');
        refreshButton.type = 'button';
        refreshButton.className = 'gn-viewport-diagnostics__button';
        refreshButton.textContent = 'Actualizar';
        refreshButton.addEventListener('click', refreshPanel);

        const copyButton = document.createElement('button');
        copyButton.type = 'button';
        copyButton.className = 'gn-viewport-diagnostics__button';
        copyButton.textContent = 'Copiar JSON';
        copyButton.addEventListener('click', copySnapshot);

        const status = document.createElement('p');
        status.className = 'gn-viewport-diagnostics__status';
        status.setAttribute('aria-live', 'polite');
        actions.append(refreshButton, copyButton, status);

        dialog.append(header, output, actions);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
    }

    function handleTodayTitleTap(event) {
        const todayScreen = event.currentTarget;
        const title = event.target.closest('.today-header__title, .gn-screen-header h1');
        if (!title || !todayScreen.contains(title) || title.textContent.trim() !== 'Gym Notes') return;

        const now = performance.now();
        rapidTapTimestamps = rapidTapTimestamps.filter(timestamp => now - timestamp <= RAPID_TAP_WINDOW_MS);
        rapidTapTimestamps.push(now);

        if (rapidTapTimestamps.length < REQUIRED_TAPS) return;

        rapidTapTimestamps = [];
        openPanel();
    }

    function initialize() {
        if (window.GN21XDiagnostics) return;

        const todayScreen = document.getElementById('screen-today');
        if (!todayScreen) return;

        createPanel();
        todayScreen.addEventListener('click', handleTodayTitleTap);
        window.GN21XDiagnostics = Object.freeze({
            capture: captureViewportDiagnostics,
            open: openPanel,
            close: closePanel
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        initialize();
    }
})();
