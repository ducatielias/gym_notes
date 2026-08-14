/**
 * MÓDULO: history-render.js
 * Renderizado de la página de historial: lista de entrenamientos, tarjetas, estadísticas
 * 
 * MODIFICADO: Menú de opciones simplificado: Exportar JSON, Importar Historial, Borrar todo
 * MODIFICADO: Eliminado el botón "Editar" de las tarjetas del historial
 * MODIFICADO: Cada tarjeta abre directamente el detalle sin estado expandido.
 * 
 * MODIFICADO: Header con icono de la app y título "Historial" (estilo Hoy)
 */

// ==========================================================================
// RENDERIZADO PRINCIPAL
// ==========================================================================

function formatHistoryContextDateLabel(dateKey) {
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function renderHistory() {
    const container = document.getElementById('history-container');
    if (!container) return;

    // Asegurar que historyDB esté actualizado
    const history = getHistory();
    
    const searchTerm = historySearchTerm.toLowerCase().trim();
    const filter = historyFilter;
    const routineFilter = historyRoutineFilter;
    const hasTodayDateContext = historyReturnScreen === 'today' && Boolean(historyContextDate);
    const contextualHistory = hasTodayDateContext
        ? getHistoryRecordsByDateKey(historyContextDate)
        : history;

    console.log('[renderHistory] Filtros aplicados - searchTerm:', searchTerm, 'filter:', filter, 'routineFilter:', routineFilter);
    console.log('[renderHistory] Total registros en historyDB:', history.length);
    console.log('[renderHistory] Origen (historyReturnScreen):', historyReturnScreen);

    // Aplicar filtros
    let filtered = [...contextualHistory];

    // Filtro de fecha
    if (!hasTodayDateContext && filter === 'hoy') {
        const today = new Date().toDateString();
        filtered = filtered.filter(item => new Date(item.fecha).toDateString() === today);
    } else if (!hasTodayDateContext && filter === 'semana') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = filtered.filter(item => new Date(item.fecha) >= weekAgo);
    } else if (!hasTodayDateContext && filter === 'mes') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filtered = filtered.filter(item => new Date(item.fecha) >= monthAgo);
    }

    // Búsqueda (por nombre de sesión)
    if (searchTerm) {
        filtered = filtered.filter(item =>
            item.nombre_sesion.toLowerCase().includes(searchTerm) ||
            (item.contenido_editado && item.contenido_editado.toLowerCase().includes(searchTerm)) ||
            (item.contenido_original && item.contenido_original.toLowerCase().includes(searchTerm))
        );
        console.log('[renderHistory] Registros después del filtro de búsqueda:', filtered.length);
    }

    // Filtro de rutina (AHORA SE APLICA CORRECTAMENTE)
    if (routineFilter !== 'todos') {
        filtered = filtered.filter(item => item.nombre_rutina === routineFilter);
        console.log('[renderHistory] Registros después del filtro de rutina:', filtered.length);
    }

    // Ordenar por fecha (más reciente primero)
    filtered.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    // Estadísticas
    const stats = getHistoryStats();

    // Determinar si mostrar botón de retroceso
    const showBackButton = ['workout', 'session', 'today'].includes(historyReturnScreen);
    const backButtonLabels = {
        workout: 'Volver al entrenamiento',
        session: 'Volver a la sesión',
        today: 'Volver a Hoy'
    };
    const backButtonLabel = backButtonLabels[historyReturnScreen] || 'Volver';
    const headerMode = hasTodayDateContext
        ? `today:${historyContextDate}:${contextualHistory.length}`
        : (showBackButton ? historyReturnScreen : 'default');
    const contextDateLabel = hasTodayDateContext
        ? formatHistoryContextDateLabel(historyContextDate)
        : '';
    const contextCountLabel = contextualHistory.length === 1 ? 'entrenamiento' : 'entrenamientos';
    let header = container.querySelector('.history-header');
    const shouldRenderHeader = !header || header.dataset.historyMode !== headerMode;

    // Construir HTML
    let html = '';

    // Encabezado
    if (shouldRenderHeader) {
        html += `
        <header class="history-header gn-screen-header" data-history-mode="${headerMode}">
            <div class="history-header-top gn-screen-header__row">
                <div class="gn-header__leading">
                    ${hasTodayDateContext ? `
                        <button class="gn-back-button" type="button" aria-label="${backButtonLabel}" onclick="goBackFromHistory()" title="${backButtonLabel}">
                            <i class="fa-solid fa-chevron-left"></i>
                        </button>
                        <div class="gn-header__content">
                            <h1 class="gn-header__title">Historial</h1>
                            <p class="gn-header__subtitle">
                                <time datetime="${historyContextDate}">${GymNotesSafe.escapeText(contextDateLabel)}</time>
                                · ${contextualHistory.length} ${contextCountLabel}
                            </p>
                        </div>
                    ` : showBackButton ? `
                        <button class="gn-back-button" type="button" aria-label="${backButtonLabel}" onclick="goBackFromHistory()" title="${backButtonLabel}">
                            <i class="fa-solid fa-chevron-left"></i>
                        </button>
                    ` : `
                        <img class="gn-app-icon" src="icons/icon-192x192.png"
                             alt=""
                             aria-hidden="true"
                             onerror="this.style.display='none'">
                        <h1>Historial</h1>
                    `}
                </div>
                <div class="gn-header-actions history-header__options">
                    ${hasTodayDateContext ? `
                        <button class="gn-options-button" type="button" aria-label="Ver todo el historial" onclick="showAllHistory()" title="Ver todo el historial">
                            <i class="fa-solid fa-list"></i>
                        </button>
                    ` : `
                        <button class="btn-history-options gn-options-button" type="button" aria-label="Opciones" onclick="toggleHistoryOptionsMenu(event)" title="Opciones">
                            <i class="fa-solid fa-ellipsis-vertical"></i>
                        </button>
                        <div class="history-options-menu hidden" id="historyOptionsMenu" onclick="event.stopPropagation()">
                            <button class="menu-item" onclick="document.getElementById('file-import-history').click(); closeHistoryOptionsMenu();">
                                <i class="fa-solid fa-file-import"></i> Importar Historial
                            </button>
                            <button class="menu-item" onclick="exportHistoryJSON(); closeHistoryOptionsMenu();">
                                <i class="fa-solid fa-file-export"></i> Exportar Historial
                            </button>
                            <div class="menu-divider"></div>
                            <button class="menu-item menu-delete" onclick="clearAllHistoryConfirm(); closeHistoryOptionsMenu();" style="color:#ef4444;">
                                <i class="fa-solid fa-trash-can" style="color:#ef4444;"></i> Borrar todo
                            </button>
                        </div>
                    `}
                </div>
            </div>
            
            <div class="history-search-wrapper" id="historySearchWrapper">
                <i class="fa-solid fa-search icon-search"></i>
                <input type="text" id="historySearchInput" placeholder="Buscar por nombre de sesión..." autocomplete="off" oninput="onHistorySearch()" value="${GymNotesSafe.escapeText(historySearchTerm)}">
                <button class="clear-input-btn" onclick="clearHistorySearch()">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            
            <div class="history-filter-bar">
                ${hasTodayDateContext ? '' : `
                    <select id="historyFilterSelect" onchange="onHistoryFilterChange()">
                        <option value="todos" ${filter === 'todos' ? 'selected' : ''}>Todos (${stats.total})</option>
                        <option value="hoy" ${filter === 'hoy' ? 'selected' : ''}>Hoy</option>
                        <option value="semana" ${filter === 'semana' ? 'selected' : ''}>Esta semana</option>
                        <option value="mes" ${filter === 'mes' ? 'selected' : ''}>Este mes</option>
                    </select>
                `}
                <select id="historyRoutineFilterSelect" onchange="onHistoryRoutineFilterChange()">
                    ${buildRoutineFilterOptions(routineFilter)}
                </select>
            </div>
            
            <!-- Input oculto para importar historial -->
            <input type="file" id="file-import-history" style="display:none" accept=".json,.txt" onchange="importHistoryFromFile(event)">
        </header>
        <div class="history-results-container">
    `;
    }

    // Lista de entrenamientos
    if (filtered.length === 0) {
        const emptyMessage = hasTodayDateContext && contextualHistory.length === 0
            ? 'No hay entrenamientos registrados para este día.'
            : (history.length === 0
                ? 'No hay entrenamientos registrados aún.'
                : 'No se encontraron entrenamientos con estos filtros.');
        html += `
            <div class="history-empty">
                <i class="fa-solid fa-clock-rotate-left"></i>
                <p>${emptyMessage}</p>
                ${history.length === 0 && !hasTodayDateContext ? '<p style="font-size:13px; margin-top:8px;">Finaliza un entrenamiento para que aparezca aquí.</p>' : ''}
            </div>
        `;
    } else {
        html += `<div class="history-grid">`;
        filtered.forEach(item => {
            const fecha = new Date(item.fecha);
            const fechaFormateada = fecha.toLocaleDateString('es-ES', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
            });
            const horaFormateada = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            const duracion = item.duracion_minutos || 0;
            const duracionTexto = duracion < 60 ? `${duracion} min` : `${Math.floor(duracion / 60)}h ${duracion % 60}min`;
            const historyIdAttribute = GymNotesSafe.escapeText(item.id);
            const historyIdHandler = GymNotesSafe.escapeInlineHandlerArgument(item.id);
            const sessionName = GymNotesSafe.escapeText(item.nombre_sesion || 'Sesión sin título');
            const routineName = GymNotesSafe.escapeText(item.nombre_rutina || 'Sin rutina');
            
            html += `
                <button class="card-history" id="history-card-${historyIdAttribute}" type="button" onclick="viewHistoryDetail('${historyIdHandler}')" aria-label="Abrir entrenamiento ${sessionName}, ${GymNotesSafe.escapeText(fechaFormateada)}">
                    <span class="card-history-header">
                        <span class="card-history-icon">
                            <i class="fa-solid fa-dumbbell"></i>
                        </span>
                        <span class="card-history-info">
                            <span class="card-history-date">${fechaFormateada} · ${horaFormateada}</span>
                            <span class="card-history-title">${sessionName}</span>
                            <span class="card-history-subtitle">${routineName}</span>
                        </span>
                        <span class="card-history-duration">⏱ ${duracionTexto}</span>
                    </span>
                </button>
            `;
        });
        html += `</div>`;
    }

    if (shouldRenderHeader) {
        html += `</div>`;
        container.innerHTML = html;
        header = container.querySelector('.history-header');
    } else {
        let resultsContainer = container.querySelector('.history-results-container');
        if (!resultsContainer && header) {
            resultsContainer = document.createElement('div');
            resultsContainer.className = 'history-results-container';
            header.insertAdjacentElement('afterend', resultsContainer);
        }

        if (resultsContainer) {
            resultsContainer.innerHTML = html;
        }
    }

    syncHistoryHeaderControls(header, filter, routineFilter, stats);
}

function buildRoutineFilterOptions(selected) {
    const routines = getUniqueRoutinesFromHistory();
    let options = '';
    routines.forEach(r => {
        const label = r === 'todos' ? 'Todas las rutinas' : r;
        const safeValue = GymNotesSafe.escapeText(r);
        const safeLabel = GymNotesSafe.escapeText(label);
        options += `<option value="${safeValue}" ${selected === r ? 'selected' : ''}>${safeLabel}</option>`;
    });
    return options;
}

/**
 * Mantiene sincronizados los controles fijos sin sustituir sus nodos. Asi el
 * input conserva tanto el foco como la seleccion mientras se escribe.
 */
function syncHistoryHeaderControls(header, filter, routineFilter, stats) {
    if (!header) return;

    const input = header.querySelector('#historySearchInput');
    if (input && input.value !== historySearchTerm) {
        input.value = historySearchTerm;
    }

    const dateFilterSelect = header.querySelector('#historyFilterSelect');
    if (dateFilterSelect) {
        const allRecordsOption = dateFilterSelect.querySelector('option[value="todos"]');
        const allRecordsLabel = `Todos (${stats.total})`;
        if (allRecordsOption && allRecordsOption.textContent !== allRecordsLabel) {
            allRecordsOption.textContent = allRecordsLabel;
        }

        if (dateFilterSelect.value !== filter) {
            dateFilterSelect.value = filter;
        }
    }

    const routineSelect = header.querySelector('#historyRoutineFilterSelect');
    if (routineSelect) {
        const routineOptionsKey = JSON.stringify(getUniqueRoutinesFromHistory());
        if (routineSelect.dataset.routineOptionsKey !== routineOptionsKey) {
            if (routineSelect.dataset.routineOptionsKey) {
                routineSelect.innerHTML = buildRoutineFilterOptions(routineFilter);
            }
            routineSelect.dataset.routineOptionsKey = routineOptionsKey;
        }

        if (routineSelect.value !== routineFilter) {
            routineSelect.value = routineFilter;
        }
    }

    updateHistoryClearButton();
}

function linkifyHistoryHTML(html) {
    if (!html) return 'Sin anotaciones.';
    return GymNotesSafe.sanitizeRichHtml(String(html).replace(/\n/g, '<br>'), { linkify: true });
}

/**
 * Prepara contenido persistido para el viewer de Historial sin mezclar el
 * tratamiento de HTML semántico con el de texto plano legacy.
 *
 * La clasificación se realiza en un template desconectado: interpreta la
 * estructura, pero no inserta ni ejecuta el contenido en el documento visible.
 * Ambos caminos terminan siempre en el sanitizador compartido.
 */
function prepareHistoryContent(rawContent) {
    const source = String(rawContent ?? '');
    const template = document.createElement('template');
    template.innerHTML = source;

    const isRich = Array.from(template.content.childNodes).some(node =>
        node.nodeType === Node.ELEMENT_NODE
    );
    const sourceHtml = isRich
        ? source
        : GymNotesSafe.textToHtml(source);

    return {
        html: GymNotesSafe.sanitizeRichHtml(sourceHtml, { linkify: true }),
        variant: isRich ? 'rich' : 'plain'
    };
}

// ==========================================================================
// BÚSQUEDA Y FILTROS
// ==========================================================================

function onHistorySearch() {
    const input = document.getElementById('historySearchInput');
    historySearchTerm = input ? input.value : '';
    window.historySearchTerm = historySearchTerm;
    updateHistoryClearButton();
    renderHistory();
}

function clearHistorySearch() {
    const input = document.getElementById('historySearchInput');
    if (input) {
        input.value = '';
        historySearchTerm = '';
        window.historySearchTerm = '';
        updateHistoryClearButton();
        renderHistory();
        input.focus();
    }
}

function updateHistoryClearButton() {
    const wrapper = document.getElementById('historySearchWrapper');
    const input = document.getElementById('historySearchInput');
    if (wrapper && input) {
        if (input.value && input.value.trim() !== '') {
            wrapper.classList.add('has-value');
        } else {
            wrapper.classList.remove('has-value');
        }
    }
}

function onHistoryFilterChange() {
    const select = document.getElementById('historyFilterSelect');
    historyFilter = select ? select.value : 'todos';
    window.historyFilter = historyFilter;
    renderHistory();
}

function onHistoryRoutineFilterChange() {
    const select = document.getElementById('historyRoutineFilterSelect');
    historyRoutineFilter = select ? select.value : 'todos';
    window.historyRoutineFilter = historyRoutineFilter;
    renderHistory();
}

// ==========================================================================
// MENÚ DE OPCIONES (tres puntos)
// ==========================================================================

function toggleHistoryOptionsMenu(event) {
    event.stopPropagation();
    const menu = document.getElementById('historyOptionsMenu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
}

function closeHistoryOptionsMenu() {
    const menu = document.getElementById('historyOptionsMenu');
    if (menu) {
        menu.classList.add('hidden');
    }
}

document.addEventListener('click', function() {
    const menu = document.getElementById('historyOptionsMenu');
    if (menu) {
        menu.classList.add('hidden');
    }
});

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.renderHistory = renderHistory;
window.onHistorySearch = onHistorySearch;
window.clearHistorySearch = clearHistorySearch;
window.onHistoryFilterChange = onHistoryFilterChange;
window.onHistoryRoutineFilterChange = onHistoryRoutineFilterChange;
window.toggleHistoryOptionsMenu = toggleHistoryOptionsMenu;
window.closeHistoryOptionsMenu = closeHistoryOptionsMenu;
