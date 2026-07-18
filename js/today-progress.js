/**
 * MÓDULO: today-progress.js
 * Resume el historial reciente en la pantalla Hoy sin modificar ni persistir datos.
 */

(function initializeTodayProgress() {
    'use strict';

    const DEFAULT_PERIOD_DAYS = 7;
    const SUPPORTED_PERIODS = new Set([7, 30]);
    const RECENT_RECORD_LIMIT = 3;
    const WEEKDAY_LABELS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
    const MONTH_LABELS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    const SESSION_ID_FIELDS = ['sessionId', 'session_id', 'id_sesion'];
    const STORED_VOLUME_FIELDS = ['volumen_total', 'volumenTotal', 'volumen'];

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

    function getPreviousPeriodRange(days, now) {
        const currentRange = getPeriodRange(days, now);
        return {
            start: addLocalDays(currentRange.start, -days),
            end: currentRange.start
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

    function readFirstNonNegativeNumber(source, fields) {
        if (!source || typeof source !== 'object') return null;

        for (const field of fields) {
            const numericValue = getNonNegativeNumber(source[field]);
            if (numericValue !== null) return numericValue;
        }

        return null;
    }

    function collectVolumeParts(record) {
        const exercises = Array.isArray(record.ejercicios)
            ? record.ejercicios.filter(exercise => exercise && typeof exercise === 'object' && !Array.isArray(exercise))
            : [];
        const sources = exercises.length > 0 ? exercises : [record];
        const totals = {
            weighted: 0,
            repetitions: 0,
            sets: 0,
            hasWeighted: false,
            hasRepetitions: false,
            hasSets: false
        };

        sources.forEach(source => {
            if (Array.isArray(source.series)) {
                source.series.forEach(set => {
                    if (!set || typeof set !== 'object' || Array.isArray(set)) return;

                    totals.sets += 1;
                    totals.hasSets = true;

                    const repetitions = readFirstNonNegativeNumber(set, ['repeticiones', 'reps']);
                    const weight = readFirstNonNegativeNumber(set, ['peso', 'weight']);

                    if (repetitions !== null) {
                        totals.repetitions += repetitions;
                        totals.hasRepetitions = true;
                    }

                    if (repetitions !== null && weight !== null) {
                        totals.weighted += weight * repetitions;
                        totals.hasWeighted = true;
                    }
                });
                return;
            }

            const rawSetCount = readFirstNonNegativeNumber(source, ['series', 'sets']);
            const setCount = Number.isInteger(rawSetCount) ? rawSetCount : null;
            const repetitions = readFirstNonNegativeNumber(source, ['repeticiones', 'reps']);
            const weight = readFirstNonNegativeNumber(source, ['peso', 'weight']);
            const multiplier = setCount !== null ? setCount : 1;

            if (setCount !== null) {
                totals.sets += setCount;
                totals.hasSets = true;
            }

            if (repetitions !== null) {
                totals.repetitions += repetitions * multiplier;
                totals.hasRepetitions = true;
            }

            if (repetitions !== null && weight !== null) {
                totals.weighted += weight * repetitions * multiplier;
                totals.hasWeighted = true;
            }
        });

        return totals;
    }

    function getRecordVolume(record) {
        const volumeParts = collectVolumeParts(record);

        if (volumeParts.hasWeighted && Number.isFinite(volumeParts.weighted)) {
            return { kind: 'weight-repetitions', value: volumeParts.weighted };
        }

        const storedVolume = readFirstNonNegativeNumber(record, STORED_VOLUME_FIELDS);
        if (storedVolume !== null) {
            return { kind: 'stored-volume', value: storedVolume };
        }

        if (volumeParts.hasRepetitions && Number.isFinite(volumeParts.repetitions)) {
            return { kind: 'repetitions', value: volumeParts.repetitions };
        }

        if (volumeParts.hasSets && Number.isFinite(volumeParts.sets)) {
            return { kind: 'sets', value: volumeParts.sets };
        }

        return null;
    }

    function aggregateCompatibleVolume(records) {
        if (records.length === 0) return null;

        const metrics = records.map(item => getRecordVolume(item.record));
        if (metrics.some(metric => metric === null)) return null;

        const metricKind = metrics[0].kind;
        if (metrics.some(metric => metric.kind !== metricKind)) return null;

        const value = metrics.reduce((total, metric) => total + metric.value, 0);
        return Number.isFinite(value) ? { kind: metricKind, value } : null;
    }

    function calculatePercentageChange(currentValue, previousValue) {
        if (
            !Number.isFinite(currentValue) ||
            !Number.isFinite(previousValue) ||
            previousValue <= 0
        ) {
            return null;
        }

        const percentage = Math.round(((currentValue - previousValue) / previousValue) * 100);
        return Number.isFinite(percentage) ? percentage : null;
    }

    function calculatePeriodVolumeChange(currentRecords, previousRecords) {
        const currentMetric = aggregateCompatibleVolume(currentRecords);
        const previousMetric = aggregateCompatibleVolume(previousRecords);

        if (!currentMetric || !previousMetric || currentMetric.kind !== previousMetric.kind) return null;
        return calculatePercentageChange(currentMetric.value, previousMetric.value);
    }

    function formatPercentage(value) {
        if (!Number.isFinite(value)) return '—';
        if (value > 0) return `+${value} %`;
        if (value < 0) return `−${Math.abs(value)} %`;
        return '0 %';
    }

    function getPercentageAriaLabel(value, days, prefix = 'Volumen') {
        if (!Number.isFinite(value)) {
            return `${prefix}, sin comparación fiable con los ${days} días anteriores`;
        }

        if (value > 0) return `${prefix}, ${value} por ciento más que en los ${days} días anteriores`;
        if (value < 0) return `${prefix}, ${Math.abs(value)} por ciento menos que en los ${days} días anteriores`;
        return `${prefix}, sin cambio frente a los ${days} días anteriores`;
    }

    function getSessionChangeAriaLabel(value) {
        if (value > 0) return `Volumen de esta sesión, ${value} por ciento más que la sesión anterior comparable`;
        if (value < 0) return `Volumen de esta sesión, ${Math.abs(value)} por ciento menos que la sesión anterior comparable`;
        return 'Volumen de esta sesión, sin cambio frente a la sesión anterior comparable';
    }

    function getRecordExerciseCount(record) {
        return Array.isArray(record.ejercicios) ? record.ejercicios.length : null;
    }

    function getRecordBlockCount(record) {
        if (Array.isArray(record.bloques)) return record.bloques.length;
        const blockCount = getNonNegativeNumber(record.bloques);
        return Number.isInteger(blockCount) ? blockCount : null;
    }

    function isSameLocalDay(left, right) {
        return left.getFullYear() === right.getFullYear() &&
            left.getMonth() === right.getMonth() &&
            left.getDate() === right.getDate();
    }

    function formatRelativeTrainingDate(date, now) {
        const dayLabel = isSameLocalDay(date, now) ? 'HOY' : WEEKDAY_LABELS[date.getDay()];
        const dateLabel = `${date.getDate()} ${MONTH_LABELS[date.getMonth()]}`;
        const accessibleDate = date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        return { dayLabel, dateLabel, accessibleDate };
    }

    function getRecordIdentity(record) {
        for (const field of SESSION_ID_FIELDS) {
            const identifier = String(record[field] ?? '').trim();
            if (identifier) return { kind: 'session-id', sessionId: identifier };
        }

        const sessionName = String(record.nombre_sesion ?? '').trim();
        const routineName = String(record.nombre_rutina ?? '').trim();

        if (sessionName) return { kind: 'names', sessionName, routineName };
        if (routineName) return { kind: 'routine-name', routineName };
        return null;
    }

    function hasSameRecordIdentity(record, identity) {
        if (!identity) return false;

        if (identity.kind === 'session-id') {
            return SESSION_ID_FIELDS.some(field => String(record[field] ?? '').trim() === identity.sessionId);
        }

        const sessionName = String(record.nombre_sesion ?? '').trim();
        const routineName = String(record.nombre_rutina ?? '').trim();

        if (identity.kind === 'names') {
            return sessionName === identity.sessionName && routineName === identity.routineName;
        }

        return !sessionName && routineName === identity.routineName;
    }

    function getPreviousComparableChange(item, allRecordsNewestFirst) {
        const currentIndex = allRecordsNewestFirst.indexOf(item);
        const currentMetric = getRecordVolume(item.record);
        const identity = getRecordIdentity(item.record);
        if (currentIndex < 0 || !currentMetric || !identity) return null;

        for (let index = currentIndex + 1; index < allRecordsNewestFirst.length; index += 1) {
            const candidate = allRecordsNewestFirst[index];
            if (!hasSameRecordIdentity(candidate.record, identity)) continue;

            const previousMetric = getRecordVolume(candidate.record);
            if (!previousMetric || previousMetric.kind !== currentMetric.kind) continue;

            return calculatePercentageChange(currentMetric.value, previousMetric.value);
        }

        return null;
    }

    function getRecordDetail(record) {
        const detailParts = [];
        const exerciseCount = getRecordExerciseCount(record);
        const blockCount = getRecordBlockCount(record);
        const duration = getRecordDuration(record);

        if (exerciseCount !== null && exerciseCount > 0) {
            detailParts.push(`${exerciseCount} ${exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}`);
        } else if (blockCount !== null && blockCount > 0) {
            detailParts.push(`${blockCount} ${blockCount === 1 ? 'bloque' : 'bloques'}`);
        }

        if (duration !== null) detailParts.push(formatDuration(duration));
        return detailParts.join(' · ');
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

    function buildRecentCard(item, allRecordsNewestFirst, now) {
        const record = item.record;
        const name = String(record.nombre_sesion || record.nombre_rutina || 'Entrenamiento');
        const safeName = escapeText(name);
        const dateParts = formatRelativeTrainingDate(item.date, now);
        const detail = getRecordDetail(record);
        const comparison = getPreviousComparableChange(item, allRecordsNewestFirst);
        const hasPublicDetailAction = typeof window.viewHistoryDetail === 'function' &&
            typeof record.id === 'string' && record.id.trim() !== '';
        const tagName = hasPublicDetailAction ? 'button' : 'article';
        const actionAttributes = hasPublicDetailAction
            ? ` type="button" data-history-id="${escapeText(record.id)}" aria-label="Ver detalle de ${safeName}, ${escapeText(dateParts.accessibleDate)}"`
            : '';
        const detailMarkup = detail
            ? `<span class="today-progress__recent-detail">${escapeText(detail)}</span>`
            : '';
        const badgeMarkup = Number.isFinite(comparison)
            ? `<span class="today-progress__change-badge" aria-label="${escapeText(getSessionChangeAriaLabel(comparison))}">${formatPercentage(comparison)}</span>`
            : '';

        return `
            <li class="today-progress__recent-item">
                <${tagName} class="today-progress__recent-card gn-elevated-card${hasPublicDetailAction ? ' today-progress__recent-card--interactive' : ''}"${actionAttributes}>
                    <span class="today-progress__recent-date" aria-label="${escapeText(dateParts.accessibleDate)}">
                        <span class="today-progress__recent-day">${dateParts.dayLabel}</span>
                        <span class="today-progress__recent-date-label">${dateParts.dateLabel}</span>
                    </span>
                    <span class="today-progress__recent-content">
                        <span class="today-progress__recent-name">${safeName}</span>
                        ${detailMarkup}
                    </span>
                    ${badgeMarkup}
                </${tagName}>
            </li>
        `;
    }

    function buildPanelMarkup(model) {
        const periodLabel = `${model.periodDays} días`;
        const sessionsLabel = model.sessionCount === 1 ? '1 ENTRADA' : `${model.sessionCount} ENTRADAS`;
        const recentMarkup = model.recentRecords.length > 0
            ? `<ul class="today-progress__recent-list">
                ${model.recentRecords.map(item => buildRecentCard(item, model.allRecordsNewestFirst, model.now)).join('')}
               </ul>`
            : `<div class="today-progress__empty gn-elevated-card">
                <p>Aún no hay entrenamientos en este periodo.</p>
                <p>Completa una sesión para empezar a ver tu progreso.</p>
               </div>`;

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
                    <div class="today-progress__metric" role="listitem" aria-label="${escapeText(model.volumeAriaLabel)}">
                        <span class="today-progress__metric-value">${formatPercentage(model.volumeChange)}</span>
                        <span class="today-progress__metric-label">Volumen</span>
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

            <section class="today-progress__recent" aria-labelledby="today-recent-title">
                <div class="today-progress__recent-header">
                    <h3 id="today-recent-title" class="today-section-heading">ENTRENAMIENTOS RECIENTES</h3>
                    <span class="today-progress__recent-count today-section-meta">${sessionsLabel}</span>
                </div>
                ${recentMarkup}
            </section>

            <section class="today-progress__motivation" aria-labelledby="today-motivation-title">
                <h3 id="today-motivation-title" class="today-section-heading">MOTIVACIÓN</h3>
                <p class="today-progress__consistency gn-elevated-card">${escapeText(model.consistencyMessage)}</p>
            </section>
        `;
    }

    function createViewModel(periodDays) {
        const now = new Date();
        const allDatedRecords = prepareDatedRecords(readHistory());
        const allRecordsNewestFirst = sortDatedRecordsNewestFirst(allDatedRecords);
        const currentRecords = sortDatedRecordsNewestFirst(
            filterRecordsByRange(allDatedRecords, getPeriodRange(periodDays, now))
        );
        const previousRecords = filterRecordsByRange(
            allDatedRecords,
            getPreviousPeriodRange(periodDays, now)
        );
        const duration = sumRecordDurations(currentRecords);
        const volumeChange = calculatePeriodVolumeChange(currentRecords, previousRecords);

        return {
            periodDays,
            now,
            sessionCount: currentRecords.length,
            durationText: formatDuration(duration),
            volumeChange,
            volumeAriaLabel: getPercentageAriaLabel(volumeChange, periodDays),
            recentRecords: currentRecords.slice(0, RECENT_RECORD_LIMIT),
            allRecordsNewestFirst,
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

        const historyCard = event.target.closest('[data-history-id]');
        if (
            historyCard &&
            container.contains(historyCard) &&
            typeof window.viewHistoryDetail === 'function'
        ) {
            window.viewHistoryDetail(historyCard.dataset.historyId);
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
