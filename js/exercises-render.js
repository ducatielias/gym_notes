/**
 * MÓDULO: exercises-render.js
 * Renderizado de la página de ejercicios: lista, tarjetas, filtros y búsqueda
 * 
 * CORREGIDO: Estructura de tarjetas y renderizado de notas
 * MODIFICADO: Añadida opción "Borrar todos los ejercicios" en el menú de opciones
 * CORREGIDO: El input de búsqueda ya no pierde el foco al escribir
 * MODIFICADO: Animación de expansión con CSS Grid (solución Gemini - sin cálculos JS)
 * MODIFICADO: Orden de los elementos al expandir: botones primero, notas después
 * MODIFICADO: Notas con linkifyExerciseHTML que convierte URLs y saltos de línea
 * 
 * MODIFICADO: Header con icono de la app y título "Ejercicios" (estilo Hoy)
 */

// ==========================================================================
// RENDERIZADO PRINCIPAL
// ==========================================================================

// Guardar referencia al input de búsqueda para no perder el foco
let exercisesSearchInputRef = null;

function renderExercises() {
    const container = document.getElementById('exercises-container');
    if (!container) {
        console.error('[exercises-render] Contenedor exercises-container no encontrado');
        return;
    }

    const exercises = getExercises();
    const searchTerm = exercisesSearchTerm.toLowerCase().trim();
    const filter = exercisesFilter;

    // Aplicar filtros
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

    // ============================================================
    // 1. VERIFICAR SI EL HEADER YA EXISTE
    // ============================================================
    let header = document.querySelector('.exercises-header');
    let gridContainer = document.querySelector('.exercises-grid-container');
    let input = document.getElementById('exercisesSearchInput');

    if (!header) {
        // Si no hay header, crear la estructura completa
        container.innerHTML = `
            <header class="exercises-header gn-screen-header">
                <div class="exercises-header-top gn-screen-header__row">
                    <div class="gn-header__leading">
                        <img class="exercises-header__brand-icon"
                             src="icons/icon-192x192.png" 
                             alt="Gym Notes"
                             onerror="this.style.display='none'">
                        <h1 class="exercises-header__title">Ejercicios</h1>
                    </div>
                    <div class="gn-header-actions exercises-header__options">
                        <button class="btn-exercises-options gn-options-button" type="button" aria-label="Opciones" onclick="toggleExercisesOptionsMenu(event)" title="Opciones">
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
                            <div class="menu-divider"></div>
                            <button class="menu-item menu-delete" onclick="borrarTodosEjercicios(); closeExercisesOptionsMenu();" style="color:#ef4444;">
                                <i class="fa-solid fa-trash-can" style="color:#ef4444;"></i> Borrar todos
                            </button>
                        </div>
                    </div>
                </div>
                <div class="exercises-search-wrapper" id="exercisesSearchWrapper">
                    <i class="fa-solid fa-search icon-search"></i>
                    <input type="text" id="exercisesSearchInput" placeholder="Buscar ejercicio..." autocomplete="off" oninput="onExercisesSearch()" onfocus="onExercisesSearchFocus()">
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
            <div class="exercises-grid-container"></div>
            <input type="file" id="file-import-exercises" style="display:none" accept=".json,.txt" onchange="importExercisesFromFile(event)">
        `;
        
        // Guardar referencia al input
        input = document.getElementById('exercisesSearchInput');
        if (input) {
            input.value = exercisesSearchTerm;
            exercisesSearchInputRef = input;
        }
        
        updateClearButton();
        gridContainer = document.querySelector('.exercises-grid-container');
    } else {
        // Si el header ya existe, solo actualizar el grid container
        gridContainer = document.querySelector('.exercises-grid-container');
        if (!gridContainer) {
            gridContainer = document.createElement('div');
            gridContainer.className = 'exercises-grid-container';
            header.insertAdjacentElement('afterend', gridContainer);
        }
        
        if (input) {
            if (input.value !== exercisesSearchTerm) {
                input.value = exercisesSearchTerm;
            }
            updateClearButton();
        }
        
        const filterSelect = document.getElementById('exercisesFilterSelect');
        if (filterSelect && filterSelect.value !== filter) {
            filterSelect.value = filter;
        }
    }

    // ============================================================
    // 2. RENDERIZAR LA LISTA DE EJERCICIOS
    // ============================================================
    if (!gridContainer) {
        gridContainer = document.createElement('div');
        gridContainer.className = 'exercises-grid-container';
        if (header) {
            header.insertAdjacentElement('afterend', gridContainer);
        } else {
            container.appendChild(gridContainer);
        }
    }

    if (filtered.length === 0) {
        gridContainer.innerHTML = `
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
        let html = `<div class="exercises-grid">`;
        filtered.forEach((ex, index) => {
            const placeholderImage = getExercisePlaceholder(ex.nombre);
            const imageUrl = GymNotesSafe.getSafeImageUrl(ex.img);
            const videoUrl = GymNotesSafe.getSafeExternalUrl(ex.video);
            const imgSrc = imageUrl || placeholderImage;
            const exerciseIdAttribute = GymNotesSafe.escapeText(ex.id);
            const exerciseIdHandler = GymNotesSafe.escapeInlineHandlerArgument(ex.id);
            const imageSrcAttribute = GymNotesSafe.escapeText(imgSrc);
            const imageSrcHandler = GymNotesSafe.escapeInlineHandlerArgument(imgSrc);
            const placeholderHandler = GymNotesSafe.escapeInlineHandlerArgument(placeholderImage);
            const exerciseName = GymNotesSafe.escapeText(ex.nombre);
            const exerciseNameHandler = GymNotesSafe.escapeInlineHandlerArgument(ex.nombre);
            const exerciseGroup = GymNotesSafe.escapeText(ex.grupo || 'General');
            const videoUrlHandler = GymNotesSafe.escapeInlineHandlerArgument(videoUrl);
            const hasVideo = Boolean(videoUrl);
            
            // IMPORTANTE: Procesar las notas correctamente con linkifyExerciseHTML
            const notasProcesadas = ex.notas ? linkifyExerciseHTML(ex.notas) : 'Sin notas adicionales.';
            
            html += `
                <div class="card-exercise" id="exercise-card-${exerciseIdAttribute}">
                    <div class="card-exercise-header" onclick="toggleExerciseCard('${exerciseIdHandler}')">
                        <img class="card-exercise-thumb" src="${imageSrcAttribute}" onclick="event.stopPropagation(); openExerciseLightbox('${imageSrcHandler}')" onerror="this.src='${placeholderHandler}'" alt="${exerciseName}">
                        <div class="card-exercise-info">
                            <div class="card-exercise-group">${exerciseGroup}</div>
                            <div class="card-exercise-name">${exerciseName}</div>
                        </div>
                        <i class="fa-solid fa-chevron-down card-exercise-chevron"></i>
                    </div>
                    <div class="card-exercise-body">
                        <div class="card-exercise-inner">
                            <!-- PRIMERO: BOTONES DE ACCIÓN -->
                            <div class="card-exercise-actions">
                                <button class="btn-exercise-action btn-exercise-action-video" onclick="event.stopPropagation(); openExerciseVideo('${videoUrlHandler}')" ${!hasVideo ? 'disabled' : ''} data-tooltip="Vídeo">
                                    <i class="fa-solid fa-play"></i>
                                </button>
                                <button class="btn-exercise-action btn-exercise-action-share" onclick="event.stopPropagation(); shareExercise('${exerciseIdHandler}')" data-tooltip="Compartir">
                                    <i class="fa-solid fa-share-nodes"></i>
                                </button>
                                <button class="btn-exercise-action btn-exercise-action-history" onclick="event.stopPropagation(); showExerciseHistory('${exerciseNameHandler}')" data-tooltip="Historial">
                                    <i class="fa-solid fa-clock-rotate-left"></i>
                                </button>
                                <button class="btn-exercise-action btn-exercise-action-web" onclick="event.stopPropagation(); searchExerciseOnWeb('${exerciseNameHandler}')" data-tooltip="Buscar en web">
                                    <i class="fa-solid fa-globe"></i>
                                </button>
                                <button class="btn-exercise-action btn-exercise-action-edit" onclick="event.stopPropagation(); openExerciseModal('${exerciseIdHandler}')" data-tooltip="Editar">
                                    <i class="fa-solid fa-pen"></i>
                                </button>
                                <button class="btn-exercise-action btn-exercise-action-delete" onclick="event.stopPropagation(); deleteExercise('${exerciseIdHandler}')" data-tooltip="Eliminar">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            </div>
                            <!-- SEGUNDO: NOTAS / TÉCNICA -->
                            <div class="card-exercise-notes">${notasProcesadas}</div>
                        </div>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
        gridContainer.innerHTML = html;
    }
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
        const safeGroup = GymNotesSafe.escapeText(g);
        options += `<option value="${safeGroup}" ${selected === g ? 'selected' : ''}>${safeGroup} (${count})</option>`;
    });
    return options;
}

// ==========================================================================
// BÚSQUEDA Y FILTRO
// ==========================================================================

function onExercisesSearch() {
    const input = document.getElementById('exercisesSearchInput');
    if (input) {
        exercisesSearchTerm = input.value;
    }
    updateClearButton();
    renderExercises();
}

function onExercisesSearchFocus() {
    const input = document.getElementById('exercisesSearchInput');
    if (input) {
        exercisesSearchInputRef = input;
    }
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
// TARJETAS EXPANDIBLES (VERSIÓN CSS GRID - SIN CÁLCULOS DE ALTURA)
// ==========================================================================

function toggleExerciseCard(id) {
    const card = document.getElementById(`exercise-card-${id}`);
    if (!card) return;
    
    // Cerrar otras tarjetas expandidas
    document.querySelectorAll('.card-exercise.expanded').forEach(el => {
        if (el.id !== `exercise-card-${id}`) {
            el.classList.remove('expanded');
        }
    });

    // Alternar la clase en la tarjeta actual (CSS Grid hace el resto)
    card.classList.toggle('expanded');
}

// ==========================================================================
// FUNCIONES AUXILIARES DE EJERCICIOS
// ==========================================================================

function getExercisePlaceholder(text) {
    const safeText = GymNotesSafe.escapeText(String(text ?? '').substring(0, 20));
    return GymNotesSafe.createInternalSvgPlaceholder(`
        <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
            <rect width="100" height="100" fill="#f3f4f6"/>
            <text x="50" y="50" font-family="Arial" font-size="32" text-anchor="middle" dy=".3em" fill="#9ca3af">💪</text>
            <text x="50" y="72" font-family="Arial" font-size="10" text-anchor="middle" fill="#9ca3af">${safeText}</text>
        </svg>
    `);
}

function linkifyExerciseHTML(html) {
    if (!html) return 'Sin notas adicionales.';

    return GymNotesSafe.sanitizeRichHtml(String(html).replace(/\n/g, '<br>'), { linkify: true });
}

function openExerciseLightbox(src) {
    const safeSource = GymNotesSafe.getSafeImageUrl(src);
    if (!safeSource) return;

    if (typeof window.openLightbox === 'function') {
        window.openLightbox(safeSource);
    } else {
        window.open(safeSource, '_blank');
    }
}

function openExerciseVideo(url) {
    const safeUrl = GymNotesSafe.getSafeExternalUrl(url);
    if (!safeUrl) {
        window.showAlert('Este ejercicio no tiene vídeo asociado.', 'Sin vídeo');
        return;
    }
    if (typeof window.verVideo === 'function') {
        window.verVideo(safeUrl);
    } else {
        window.open(safeUrl, '_blank');
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
// BORRAR TODOS LOS EJERCICIOS
// ==========================================================================

async function borrarTodosEjercicios() {
    const exercises = getExercises();
    if (exercises.length === 0) {
        window.showAlert('No hay ejercicios para borrar.', 'Aviso');
        return;
    }

    const confirm = await window.showConfirm(
        `¿Estás seguro de que quieres eliminar TODOS los ${exercises.length} ejercicios?\n\n⚠️ Esta acción no se puede deshacer.`,
        'Borrar todos los ejercicios'
    );
    
    if (!confirm) return;

    setExercises([]);
    renderExercises();
    window.showAlert(`Se han eliminado todos los ejercicios.`, 'Eliminado');
}

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
window.onExercisesSearchFocus = onExercisesSearchFocus;
window.clearExercisesSearch = clearExercisesSearch;
window.onExercisesFilterChange = onExercisesFilterChange;
window.toggleExerciseCard = toggleExerciseCard;
window.toggleExercisesOptionsMenu = toggleExercisesOptionsMenu;
window.closeExercisesOptionsMenu = closeExercisesOptionsMenu;
window.showExerciseHistory = showExerciseHistory;
window.openExerciseLightbox = openExerciseLightbox;
window.openExerciseVideo = openExerciseVideo;
window.searchExerciseOnWeb = searchExerciseOnWeb;
window.borrarTodosEjercicios = borrarTodosEjercicios;
