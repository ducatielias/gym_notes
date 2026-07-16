/**
 * MÓDULO: history-render.js
 * Renderizado de la página de historial: lista de entrenamientos, tarjetas, estadísticas
 * 
 * MODIFICADO: Menú de opciones simplificado: Exportar JSON, Importar Historial, Borrar todo
 * MODIFICADO: Eliminado el botón "Editar" de las tarjetas del historial
 * MODIFICADO: Animación de expansión mejorada (solución Gemini - sin layout thrashing)
 * 
 * MODIFICADO: Header con icono de la app y título "Historial" (estilo Hoy)
 */

// ==========================================================================
// RENDERIZADO PRINCIPAL
// ==========================================================================

function renderHistory() {
    const container = document.getElementById('history-container');
    if (!container) return;

    // Asegurar que historyDB esté actualizado
    const history = getHistory();
    
    const searchTerm = historySearchTerm.toLowerCase().trim();
    const filter = historyFilter;
    const routineFilter = historyRoutineFilter;

    console.log('[renderHistory] Filtros aplicados - searchTerm:', searchTerm, 'filter:', filter, 'routineFilter:', routineFilter);
    console.log('[renderHistory] Total registros en historyDB:', history.length);
    console.log('[renderHistory] Origen (historyReturnScreen):', historyReturnScreen);

    // Aplicar filtros
    let filtered = [...history];

    // Filtro de fecha
    if (filter === 'hoy') {
        const today = new Date().toDateString();
        filtered = filtered.filter(item => new Date(item.fecha).toDateString() === today);
    } else if (filter === 'semana') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = filtered.filter(item => new Date(item.fecha) >= weekAgo);
    } else if (filter === 'mes') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filtered = filtered.filter(item => new Date(item.fecha) >= monthAgo);
    }

    // Filtro de rutina (AHORA SE APLICA CORRECTAMENTE)
    if (routineFilter !== 'todos') {
        filtered = filtered.filter(item => item.nombre_rutina === routineFilter);
        console.log('[renderHistory] Registros después del filtro de rutina:', filtered.length);
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

    // Ordenar por fecha (más reciente primero)
    filtered.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    // Estadísticas
    const stats = getHistoryStats();

    // Determinar si mostrar botón de retroceso
    const showBackButton = historyReturnScreen === 'workout' || historyReturnScreen === 'session';
    const backButtonLabel = historyReturnScreen === 'workout' ? 'Volver al entrenamiento' : 'Volver a la sesión';
    const headerMode = showBackButton ? historyReturnScreen : 'default';
    let header = container.querySelector('.history-header');
    const shouldRenderHeader = !header || header.dataset.historyMode !== headerMode;

    // Construir HTML
    let html = '';

    // Encabezado
    if (shouldRenderHeader) {
        html += `
        <header class="history-header" data-history-mode="${headerMode}">
            <div class="history-header-top">
                <div style="display: flex; align-items: center; gap: 10px; flex:1;">
                    ${showBackButton ? `
                        <button class="btn-back" onclick="goBackFromHistory()" style="background:none; border:none; color:var(--primary-color); font-size:16px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:4px; padding:4px 0;">
                            <i class="fa-solid fa-chevron-left"></i> ${backButtonLabel}
                        </button>
                    ` : `
                        <img src="icons/icon-192x192.png" 
                             alt="Gym Notes" 
                             style="height: 32px; width: 32px; border-radius: 8px;"
                             onerror="this.style.display='none'">
                        <h1 style="font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin: 0;">Historial</h1>
                    `}
                </div>
                <div style="position:relative;">
                    <button class="btn-history-options" onclick="toggleHistoryOptionsMenu(event)" title="Opciones">
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
                <select id="historyFilterSelect" onchange="onHistoryFilterChange()">
                    <option value="todos" ${filter === 'todos' ? 'selected' : ''}>Todos (${stats.total})</option>
                    <option value="hoy" ${filter === 'hoy' ? 'selected' : ''}>Hoy</option>
                    <option value="semana" ${filter === 'semana' ? 'selected' : ''}>Esta semana</option>
                    <option value="mes" ${filter === 'mes' ? 'selected' : ''}>Este mes</option>
                </select>
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
        html += `
            <div class="history-empty">
                <i class="fa-solid fa-clock-rotate-left"></i>
                <p>${history.length === 0 ? 'No hay entrenamientos registrados aún.' : 'No se encontraron entrenamientos con estos filtros.'}</p>
                ${history.length === 0 ? '<p style="font-size:13px; margin-top:8px;">Finaliza un entrenamiento para que aparezca aquí.</p>' : ''}
            </div>
        `;
    } else {
        html += `<div class="history-grid">`;
        filtered.forEach((item, index) => {
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
            const tieneContenido = item.contenido_editado && item.contenido_editado.trim() !== '';
            const historyIdAttribute = GymNotesSafe.escapeText(item.id);
            const historyIdHandler = GymNotesSafe.escapeInlineHandlerArgument(item.id);
            const sessionName = GymNotesSafe.escapeText(item.nombre_sesion || 'Sesión sin título');
            const routineName = GymNotesSafe.escapeText(item.nombre_rutina || 'Sin rutina');
            
            html += `
                <div class="card-history" id="history-card-${historyIdAttribute}">
                    <div class="card-history-header" onclick="toggleHistoryCard('${historyIdHandler}')">
                        <div class="card-history-icon">
                            <i class="fa-solid fa-dumbbell"></i>
                        </div>
                        <div class="card-history-info">
                            <div class="card-history-date">${fechaFormateada} · ${horaFormateada}</div>
                            <div class="card-history-title">${sessionName}</div>
                            <div class="card-history-subtitle">${routineName}</div>
                        </div>
                        <div class="card-history-duration">⏱ ${duracionTexto}</div>
                        <i class="fa-solid fa-chevron-down card-history-chevron"></i>
                    </div>
                    <div class="card-history-body">
                        <div class="card-history-inner">
                            <div class="card-history-content">${tieneContenido ? linkifyHistoryHTML(item.contenido_editado) : '<em>Sin anotaciones</em>'}</div>
                            <div class="card-history-actions">
                                <button class="btn-history-action btn-history-action-view" onclick="event.stopPropagation(); viewHistoryDetail('${historyIdHandler}')">
                                    <i class="fa-solid fa-eye"></i> Ver
                                </button>
                                <button class="btn-history-action btn-history-action-share" onclick="event.stopPropagation(); shareHistoryItem('${historyIdHandler}')">
                                    <i class="fa-solid fa-share-nodes"></i> Compartir
                                </button>
                                <button class="btn-history-action btn-history-action-delete" onclick="event.stopPropagation(); deleteHistoryItem('${historyIdHandler}')">
                                    <i class="fa-solid fa-trash-can"></i> Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
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

// ==========================================================================
// TARJETAS EXPANDIBLES (VERSIÓN MEJORADA - SOLUCIÓN GEMINI)
// ==========================================================================

function toggleHistoryCard(id) {
    const card = document.getElementById(`history-card-${id}`);
    if (!card) return;

    // Cerrar otras tarjetas expandidas
    document.querySelectorAll('.card-history.expanded').forEach(el => {
        if (el.id !== `history-card-${id}`) {
            el.classList.remove('expanded');
            const body = el.querySelector('.card-history-body');
            if (body) {
                body.style.maxHeight = '0px';
                body.style.overflow = 'hidden';
            }
        }
    });

    const isExpanding = !card.classList.contains('expanded');
    const body = card.querySelector('.card-history-body');
    
    if (!body) return;

    if (isExpanding) {
        // Añadir la clase expanded primero (para que el inner se muestre)
        card.classList.add('expanded');
        
        // Forzar un reflow rápido antes de medir
        void body.offsetHeight;
        
        // Medir el scrollHeight real (el inner tiene el padding fijo)
        const height = body.scrollHeight;
        body.style.maxHeight = height + 'px';
        body.style.overflow = 'hidden';
        
        // Cuando termine la animación, remover max-height para que sea 100% responsivo
        // y permitir que el contenido crezca dinámicamente si es necesario
        const onTransitionEnd = function(e) {
            if (e.propertyName === 'max-height' && card.classList.contains('expanded')) {
                body.style.maxHeight = 'none';
                body.style.overflow = 'visible';
                body.removeEventListener('transitionend', onTransitionEnd);
            }
        };
        body.addEventListener('transitionend', onTransitionEnd);
        
    } else {
        // Si estaba en 'none', primero reasignamos la altura actual en px
        // para que haya transición al colapsar
        if (body.style.maxHeight === 'none' || !body.style.maxHeight) {
            body.style.maxHeight = body.scrollHeight + 'px';
            // Forzar un único reflow rápido antes de colapsar
            void body.offsetHeight;
        }
        
        card.classList.remove('expanded');
        
        // Usar requestAnimationFrame para asegurar que el navegador procese el cambio a 0
        requestAnimationFrame(() => {
            body.style.maxHeight = '0px';
            body.style.overflow = 'hidden';
        });
    }
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
window.toggleHistoryCard = toggleHistoryCard;
window.onHistorySearch = onHistorySearch;
window.clearHistorySearch = clearHistorySearch;
window.onHistoryFilterChange = onHistoryFilterChange;
window.onHistoryRoutineFilterChange = onHistoryRoutineFilterChange;
window.toggleHistoryOptionsMenu = toggleHistoryOptionsMenu;
window.closeHistoryOptionsMenu = closeHistoryOptionsMenu;
