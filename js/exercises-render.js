/**
 * MÓDULO: exercises-render.js
 * Renderizado de la página de ejercicios: lista, tarjetas, filtros y búsqueda
 */

// ==========================================================================
// RENDERIZADO PRINCIPAL
// ==========================================================================

function renderExercises() {
    const container = document.getElementById('exercises-container');
    if (!container) return;

    const exercises = getExercises();
    const searchTerm = exercisesSearchTerm.toLowerCase().trim();
    const filter = exercisesFilter;

    let filtered = exercises;
    if (filter !== 'Todos') {
        filtered = filtered.filter(ex => ex.grupo === filter);
    }
    if (searchTerm) {
        filtered = filtered.filter(ex => 
            ex.nombre.toLowerCase().includes(searchTerm) ||
            (ex.grupo && ex.grupo.toLowerCase().includes(searchTerm)) ||
            (ex.notas && ex.notas.toLowerCase().includes(searchTerm))
        );
    }

    filtered.sort((a, b) => a.nombre.localeCompare(b.nombre));

    let html = '';

    html += `
        <header class="exercises-header">
            <div class="exercises-header-top">
                <h1>Ejercicios</h1>
                <div style="position:relative;">
                    <button class="btn-exercises-options" onclick="toggleExercisesOptionsMenu(event)" title="Opciones">
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                    <div class="exercises-options-menu hidden" id="exercisesOptionsMenu" onclick="event.stopPropagation()">
                        <button class="menu-item" onclick="openExerciseModal(); closeExercisesOptionsMenu();">
                            <i class="fa-solid fa-plus"></i> Añadir ejercicio
                        </button>
                        <div class="menu-divider"></div>
                        <button class="menu-item" onclick="document.getElementById('file-import-exercises').click(); closeExercisesOptionsMenu();">
                            <i class="fa-solid fa-file-import"></i> Importar ejercicios
                        </button>
                        <button class="menu-item" onclick="exportAllExercises(); closeExercisesOptionsMenu();">
                            <i class="fa-solid fa-file-export"></i> Exportar ejercicios
                        </button>
                    </div>
                </div>
            </div>
            <div class="exercises-search-wrapper" id="exercisesSearchWrapper">
                <i class="fa-solid fa-search icon-search"></i>
                <input type="text" id="exercisesSearchInput" placeholder="Buscar ejercicio..." autocomplete="off" oninput="onExercisesSearch()">
                <button class="clear-input-btn" onclick="clearExercisesSearch()">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="exercises-filter-bar">
                <select id="exercisesFilterSelect" onchange="onExercisesFilterChange()">
                    ${buildFilterOptions(filter)}
                </select>
            </div>
        </header>
        <input type="file" id="file-import-exercises" style="display:none" accept=".json,.txt" onchange="importExercisesFromFile(event)">
    `;

    if (filtered.length === 0) {
        html += `
            <div class="exercises-empty">
                <i class="fa-solid fa-dumbbell"></i>
                <p>${exercises.length === 0 ? 'No tienes ejercicios guardados.' : 'No se encontraron ejercicios.'}</p>
                ${exercises.length === 0 ? `
                    <button class="btn-empty-add" onclick="openExerciseModal()">
                        <i class="fa-solid fa-plus"></i> Crear primer ejercicio
                    </button>
                ` : `
                    <button class="btn-empty-add" onclick="openExerciseModal()">
                        <i class="fa-solid fa-plus"></i> Añadir ejercicio
                    </button>
                `}
            </div>
        `;
    } else {
        html += `<div class="exercises-grid">`;
        filtered.forEach((ex, index) => {
            const imgSrc = ex.img || getExercisePlaceholder(ex.nombre);
            const nombreEscapado = ex.nombre.replace(/'/g, "\\'");
            const hasVideo = ex.video && ex.video.trim() !== '';
            
            html += `
                <div class="card-exercise" id="exercise-card-${ex.id}">
                    <div class="card-exercise-header" onclick="toggleExerciseCard('${ex.id}')">
                        <img class="card-exercise-thumb" src="${imgSrc}" onclick="event.stopPropagation(); openExerciseLightbox('${imgSrc}')" onerror="this.src='${getExercisePlaceholder(ex.nombre)}'" alt="${ex.nombre}">
                        <div class="card-exercise-info">
                            <div class="card-exercise-group">${ex.grupo || 'General'}</div>
                            <div class="card-exercise-name">${ex.nombre}</div>
                        </div>
                        <i class="fa-solid fa-chevron-down card-exercise-chevron"></i>
                    </div>
                    <div class="card-exercise-body">
                        <div class="card-exercise-notes">${linkifyExerciseHTML(ex.notas || 'Sin notas adicionales.')}</div>
                        <div class="card-exercise-actions">
                            <button class="btn-exercise-action btn-exercise-action-video" onclick="event.stopPropagation(); openExerciseVideo('${ex.video || ''}')" ${!hasVideo ? 'disabled' : ''} data-tooltip="Vídeo">
                                <i class="fa-solid fa-play"></i>
                            </button>
                            <button class="btn-exercise-action btn-exercise-action-share" onclick="event.stopPropagation(); shareExercise('${ex.id}')" data-tooltip="Compartir">
                                <i class="fa-solid fa-share-nodes"></i>
                            </button>
                            <button class="btn-exercise-action btn-exercise-action-history" onclick="event.stopPropagation(); showExerciseHistory('${nombreEscapado}')" data-tooltip="Historial">
                                <i class="fa-solid fa-clock-rotate-left"></i>
                            </button>
                            <button class="btn-exercise-action btn-exercise-action-web" onclick="event.stopPropagation(); searchExerciseOnWeb('${nombreEscapado}')" data-tooltip="Buscar en web">
                                <i class="fa-solid fa-globe"></i>
                            </button>
                            <button class="btn-exercise-action btn-exercise-action-edit" onclick="event.stopPropagation(); openExerciseModal('${ex.id}')" data-tooltip="Editar">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="btn-exercise-action btn-exercise-action-delete" onclick="event.stopPropagation(); deleteExercise('${ex.id}')" data-tooltip="Eliminar">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    }

    container.innerHTML = html;
    updateClearButton();
}

function buildFilterOptions(selected) {
    const groups = getAllGroups();
    const exercises = getExercises();
    const groupCount = {};
    exercises.forEach(ex => {
        const g = ex.grupo || 'General';
        groupCount[g] = (groupCount[g] || 0) + 1;
    });

    let options = `<option value="Todos" ${selected === 'Todos' ? 'selected' : ''}>Todos los grupos (${exercises.length})</option>`;
    groups.forEach(g => {
        const count = groupCount[g] || 0;
        options += `<option value="${g}" ${selected === g ? 'selected' : ''}>${g} (${count})</option>`;
    });
    return options;
}

// ==========================================================================
// BÚSQUEDA Y FILTRO
// ==========================================================================

function onExercisesSearch() {
    const input = document.getElementById('exercisesSearchInput');
    exercisesSearchTerm = input ? input.value : '';
    updateClearButton();
    renderExercises();
}

function clearExercisesSearch() {
    const input = document.getElementById('exercisesSearchInput');
    if (input) {
        input.value = '';
        exercisesSearchTerm = '';
        updateClearButton();
        renderExercises();
        input.focus();
    }
}

function updateClearButton() {
    const wrapper = document.getElementById('exercisesSearchWrapper');
    const input = document.getElementById('exercisesSearchInput');
    if (wrapper && input) {
        if (input.value && input.value.trim() !== '') {
            wrapper.classList.add('has-value');
        } else {
            wrapper.classList.remove('has-value');
        }
    }
}

function onExercisesFilterChange() {
    const select = document.getElementById('exercisesFilterSelect');
    exercisesFilter = select ? select.value : 'Todos';
    renderExercises();
}

// ==========================================================================
// TARJETAS EXPANDIBLES
// ==========================================================================

function toggleExerciseCard(id) {
    const card = document.getElementById(`exercise-card-${id}`);
    if (!card) return;
    
    document.querySelectorAll('.card-exercise.expanded').forEach(el => {
        if (el.id !== `exercise-card-${id}`) {
            el.classList.remove('expanded');
            const body = el.querySelector('.card-exercise-body');
            if (body) body.style.maxHeight = null;
        }
    });

    const isExpanding = !card.classList.contains('expanded');
    if (isExpanding) {
        card.classList.add('expanded');
        const body = card.querySelector('.card-exercise-body');
        if (body) {
            body.style.maxHeight = body.scrollHeight + 40 + 'px';
        }
    } else {
        card.classList.remove('expanded');
        const body = card.querySelector('.card-exercise-body');
        if (body) body.style.maxHeight = null;
    }
}

// ==========================================================================
// FUNCIONES AUXILIARES DE EJERCICIOS
// ==========================================================================

function getExercisePlaceholder(text) {
    return 'data:image/svg+xml,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
            <rect width="100" height="100" fill="#f3f4f6"/>
            <text x="50" y="50" font-family="Arial" font-size="32" text-anchor="middle" dy=".3em" fill="#9ca3af">💪</text>
            <text x="50" y="72" font-family="Arial" font-size="10" text-anchor="middle" fill="#9ca3af">${text.substring(0, 20)}</text>
        </svg>
    `);
}

function linkifyExerciseHTML(html) {
    if (!html) return 'Sin notas adicionales.';
    const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return html.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}

function openExerciseLightbox(src) {
    if (typeof window.openLightbox === 'function') {
        window.openLightbox(src);
    } else {
        window.open(src, '_blank');
    }
}

function openExerciseVideo(url) {
    if (!url || url.trim() === '') {
        window.showAlert('Este ejercicio no tiene vídeo asociado.', 'Sin vídeo');
        return;
    }
    if (typeof window.verVideo === 'function') {
        window.verVideo(url);
    } else {
        window.open(url, '_blank');
    }
}

function searchExerciseOnWeb(nombre) {
    const query = encodeURIComponent(`${nombre} ejercicio gimnasio técnica`);
    window.open(`https://www.google.com/search?q=${query}`, '_blank');
}

// ==========================================================================
// MENÚ DE OPCIONES (tres puntos)
// ==========================================================================

function toggleExercisesOptionsMenu(event) {
    event.stopPropagation();
    const menu = document.getElementById('exercisesOptionsMenu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
}

function closeExercisesOptionsMenu() {
    const menu = document.getElementById('exercisesOptionsMenu');
    if (menu) {
        menu.classList.add('hidden');
    }
}

document.addEventListener('click', function() {
    const menu = document.getElementById('exercisesOptionsMenu');
    if (menu) {
        menu.classList.add('hidden');
    }
});

// ==========================================================================
// HISTORIAL DEL EJERCICIO
// ==========================================================================

function showExerciseHistory(nombreEjercicio) {
    const routines = appData.routines || [];
    const registros = [];
    
    routines.forEach(routine => {
        routine.sessions.forEach(session => {
            if (session.content && session.content.includes(nombreEjercicio)) {
                registros.push({
                    fecha: session.lastModified || Date.now(),
                    rutina: routine.name,
                    sesion: session.title,
                    contenido: session.content
                });
            }
        });
    });

    if (window.historyDB && Array.isArray(window.historyDB)) {
        window.historyDB.forEach(h => {
            if (h.ejercicios && Array.isArray(h.ejercicios)) {
                h.ejercicios.forEach(ex => {
                    if (ex.nombre && ex.nombre.includes(nombreEjercicio)) {
                        registros.push({
                            fecha: h.fecha || Date.now(),
                            rutina: h.nombre_rutina || 'Entrenamiento',
                            sesion: 'Historial',
                            contenido: ex.notas_entreno || ''
                        });
                    }
                });
            }
        });
    }

    registros.sort((a, b) => b.fecha - a.fecha);

    if (registros.length === 0) {
        window.showAlert(`No hay registros de "${nombreEjercicio}" en el historial.`, 'Historial');
        return;
    }

    let mensaje = `📋 Historial de "${nombreEjercicio}"\n\n`;
    registros.slice(0, 10).forEach(r => {
        const fecha = new Date(r.fecha).toLocaleDateString('es-ES');
        mensaje += `📅 ${fecha} | ${r.rutina} - ${r.sesion}\n`;
        if (r.contenido) {
            const textoLimpio = r.contenido.replace(/<[^>]*>/g, ' ').substring(0, 100);
            mensaje += `   ${textoLimpio}${r.contenido.length > 100 ? '...' : ''}\n`;
        }
        mensaje += '\n';
    });

    if (registros.length > 10) {
        mensaje += `... y ${registros.length - 10} registros más.`;
    }

    window.showAlert(mensaje, 'Historial del ejercicio');
}

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.renderExercises = renderExercises;
window.onExercisesSearch = onExercisesSearch;
window.clearExercisesSearch = clearExercisesSearch;
window.onExercisesFilterChange = onExercisesFilterChange;
window.toggleExerciseCard = toggleExerciseCard;
window.toggleExercisesOptionsMenu = toggleExercisesOptionsMenu;
window.closeExercisesOptionsMenu = closeExercisesOptionsMenu;
window.showExerciseHistory = showExerciseHistory;
window.openExerciseLightbox = openExerciseLightbox;
window.openExerciseVideo = openExerciseVideo;
window.searchExerciseOnWeb = searchExerciseOnWeb;