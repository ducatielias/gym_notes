/**
 * MÓDULO: today-progress.js
 * Resume el progreso del historial en la pantalla Hoy sin modificar ni persistir datos.
 */

(function initializeTodayProgress() {
    'use strict';

    const DEFAULT_PERIOD_DAYS = 7;
    const SUPPORTED_PERIODS = new Set([7, 30]);

    let selectedPeriodDays = DEFAULT_PERIOD_DAYS;
    let currentContainer = null;

    function escapeText(value) {
        if (!window.GymNotesSafe || typeof window.GymNotesSafe.escapeText !== 'function') {
            return '';
        }

        return window.GymNotesSafe.escapeText(value);
    }

    function readHistory() {
        if (typeof window.getHistory !== 'function') return [];

        try {
            const history = window.getHistory();
            return Array.isArray(history) ? history : [];
        } catch (error) {
            console.warn('[today-progress] No se pudo obtener el historial.', error);
            return [];
        }
    }

    function parseRecordDate(value) {
        if (value === null || value === undefined) return null;

        if (value instanceof Date) {
            const copy = new Date(value.getTime());
            return Number.isFinite(copy.getTime()) ? copy : null;
        }

        if (typeof value === 'string') {
            const candidate = value.trim();
            const localDateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(candidate);

            if (localDateMatch) {
                const year = Number(localDateMatch[1]);
                const month = Number(localDateMatch[2]) - 1;
                const day = Number(localDateMatch[3]);
                const localDate = new Date(year, month, day);

                if (
                    localDate.getFullYear() === year &&
                    localDate.getMonth() === month &&
                    localDate.getDate() === day
                ) {
                    return localDate;
                }

                return null;
            }

            if (!candidate) return null;
        }

        if (typeof value !== 'string' && typeof value !== 'number') return null;

        const parsedDate = new Date(value);
        return Number.isFinite(parsedDate.getTime()) ? parsedDate : null;
    }

    function startOfLocalDay(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    function addLocalDays(date, amount) {
        const result = new Date(date.getTime());
        result.setDate(result.getDate() + amount);
        return result;
    }

    function getPeriodRange(days, now) {
        const todayStart = startOfLocalDay(now);
        return {
            start: addLocalDays(todayStart, -(days - 1)),
            end: addLocalDays(todayStart, 1)
        };
    }

    function prepareDatedRecords(records) {
        return records
            .filter(record => record && typeof record === 'object' && !Array.isArray(record))
            .map((record, sourceIndex) => ({
                record,
                sourceIndex,
                date: parseRecordDate(record.fecha)
            }))
            .filter(item => item.date !== null);
    }

    function filterRecordsByRange(records, range) {
        const startTime = range.start.getTime();
        const endTime = range.end.getTime();

        return records.filter(item => {
            const recordTime = item.date.getTime();
            return recordTime >= startTime && recordTime < endTime;
        });
    }

    function sortDatedRecordsNewestFirst(records) {
        return [...records].sort((left, right) => {
            const dateDifference = right.date.getTime() - left.date.getTime();
            return dateDifference || left.sourceIndex - right.sourceIndex;
        });
    }

    function getNonNegativeNumber(value) {
        if (typeof value !== 'number' && typeof value !== 'string') return null;
        if (typeof value === 'string' && value.trim() === '') return null;

        const numericValue = typeof value === 'number' ? value : Number(value);
        return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : null;
    }

    function getRecordDuration(record) {
        return getNonNegativeNumber(record.duracion_minutos);
    }

    function sumRecordDurations(records) {
        if (records.length === 0) return null;

        let totalMinutes = 0;
        for (const item of records) {
            const duration = getRecordDuration(item.record);
            if (duration === null) return null;
            totalMinutes += duration;
        }

        return Number.isFinite(totalMinutes) ? totalMinutes : null;
    }

    function formatDuration(minutes) {
        if (!Number.isFinite(minutes) || minutes < 0) return '—';

        const roundedMinutes = Math.round(minutes);
        if (roundedMinutes < 60) return `${roundedMinutes} min`;

        const hours = Math.floor(roundedMinutes / 60);
        const remainingMinutes = roundedMinutes % 60;
        return remainingMinutes === 0 ? `${hours} h` : `${hours} h ${remainingMinutes} min`;
    }

    /**
     * Resume la actividad por días locales únicos. Varias sesiones dentro del
     * mismo día cuentan una sola vez y las fechas inválidas se ignoran.
     */
    function calculateConsistency(records, periodDays) {
        const activeDateKeys = new Set();

        records.forEach(item => {
            const dateKey = typeof window.formatHistoryLocalDateKey === 'function'
                ? window.formatHistoryLocalDateKey(item.record.fecha)
                : null;

            if (dateKey) activeDateKeys.add(dateKey);
        });

        const activeDays = activeDateKeys.size;
        const percentage = Math.round((activeDays / periodDays) * 100);

        return {
            activeDays,
            percentage,
            detail: `${activeDays} de ${periodDays} días`,
            ariaLabel: `Constancia: ${percentage} por ciento, ${activeDays} de ${periodDays} días con entrenamiento.`
        };
    }

    function getConsistencyMessage(allDatedRecords, now) {
        if (allDatedRecords.length === 0) {
            return 'Tu progreso aparecerá aquí cuando completes tu primer entrenamiento.';
        }

        const todayStart = startOfLocalDay(now);
        const daysSinceMonday = (todayStart.getDay() + 6) % 7;
        const weekRange = {
            start: addLocalDays(todayStart, -daysSinceMonday),
            end: addLocalDays(todayStart, 1)
        };
        const weeklySessions = filterRecordsByRange(allDatedRecords, weekRange).length;

        if (weeklySessions >= 3) {
            return `Tu constancia está subiendo: has entrenado ${weeklySessions} veces esta semana.`;
        }

        if (weeklySessions > 0) {
            return `Buen comienzo: has entrenado ${weeklySessions} ${weeklySessions === 1 ? 'vez' : 'veces'} esta semana.`;
        }

        return 'Esta semana todavía está por empezar. Tu próximo entrenamiento cuenta.';
    }

    function buildPanelMarkup(model) {
        const periodLabel = `${model.periodDays} días`;

        return `
            <section class="today-progress__summary gn-elevated-card" aria-labelledby="today-progress-title">
                <h3 id="today-progress-title" class="today-progress__title">Historial</h3>
                <p class="today-progress__subtitle">Resumen de tus últimos ${periodLabel}.</p>

                <div class="today-progress__metrics" role="list" aria-label="Resumen del periodo">
                    <div class="today-progress__metric" role="listitem" aria-label="${model.sessionCount} ${model.sessionCount === 1 ? 'sesión' : 'sesiones'}">
                        <span class="today-progress__metric-value">${model.sessionCount}</span>
                        <span class="today-progress__metric-label">Sesiones</span>
                    </div>
                    <div class="today-progress__metric" role="listitem" aria-label="Tiempo, ${escapeText(model.durationText)}">
                        <span class="today-progress__metric-value">${escapeText(model.durationText)}</span>
                        <span class="today-progress__metric-label">Tiempo</span>
                    </div>
                    <div class="today-progress__metric" role="listitem" aria-label="${escapeText(model.consistencyAriaLabel)}">
                        <span class="today-progress__metric-value">${model.consistencyPercentage} %</span>
                        <span class="today-progress__metric-label">Constancia</span>
                        <span class="today-progress__metric-detail">${escapeText(model.consistencyDetail)}</span>
                    </div>
                </div>
            </section>

            <div class="today-progress__period-selector" role="group" aria-label="Periodo del progreso">
                ${[7, 30].map(days => `
                    <button
                        type="button"
                        class="today-progress__period-button"
                        data-progress-period="${days}"
                        aria-pressed="${model.periodDays === days}"
                    >${days} días</button>
                `).join('')}
            </div>

            <section class="today-progress__motivation" aria-labelledby="today-motivation-title">
                <h3 id="today-motivation-title" class="today-section-heading">MOTIVACIÓN</h3>
                <p class="today-progress__consistency gn-elevated-card">${escapeText(model.consistencyMessage)}</p>
            </section>
        `;
    }

    function createViewModel(periodDays) {
        const now = new Date();
        const allDatedRecords = prepareDatedRecords(readHistory());
        const currentRecords = sortDatedRecordsNewestFirst(
            filterRecordsByRange(allDatedRecords, getPeriodRange(periodDays, now))
        );
        const duration = sumRecordDurations(currentRecords);
        const consistency = calculateConsistency(currentRecords, periodDays);

        return {
            periodDays,
            now,
            sessionCount: currentRecords.length,
            durationText: formatDuration(duration),
            activeDays: consistency.activeDays,
            consistencyPercentage: consistency.percentage,
            consistencyDetail: consistency.detail,
            consistencyAriaLabel: consistency.ariaLabel,
            consistencyMessage: getConsistencyMessage(allDatedRecords, now)
        };
    }

    function resolveContainer(container) {
        if (container && container.nodeType === Node.ELEMENT_NODE) return container;
        return document.getElementById('today-progress-section');
    }

    function handleContainerClick(event) {
        const container = event.currentTarget;
        const periodButton = event.target.closest('[data-progress-period]');

        if (periodButton && container.contains(periodButton)) {
            const periodDays = Number(periodButton.dataset.progressPeriod);
            if (SUPPORTED_PERIODS.has(periodDays) && periodDays !== selectedPeriodDays) {
                selectedPeriodDays = periodDays;
                refresh(container);
            }
            return;
        }
    }

    function bindContainer(container) {
        if (container.dataset.todayProgressBound === 'true') return;
        container.addEventListener('click', handleContainerClick);
        container.dataset.todayProgressBound = 'true';
    }

    function renderInto(container) {
        if (!container) return { ok: false, status: 'container-missing' };

        currentContainer = container;
        bindContainer(container);
        const viewModel = createViewModel(selectedPeriodDays);
        container.innerHTML = buildPanelMarkup(viewModel);

        return {
            ok: true,
            status: 'rendered',
            periodDays: selectedPeriodDays,
            sessionCount: viewModel.sessionCount
        };
    }

    function render(container) {
        selectedPeriodDays = DEFAULT_PERIOD_DAYS;
        return renderInto(resolveContainer(container));
    }

    function refresh(container) {
        const resolvedContainer = resolveContainer(container) ||
            (currentContainer && currentContainer.isConnected ? currentContainer : null);
        return renderInto(resolvedContainer);
    }

    window.GymNotesTodayProgress = Object.freeze({ render, refresh });
})();
