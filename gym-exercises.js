/**
 * MÓDULO: gym-exercises.js
 * Gestiona la página de ejercicios: CRUD, búsqueda, filtros, tarjetas,
 * importación/exportación y modal de edición.
 */

// ==========================================================================
// ESTADO Y DATOS
// ==========================================================================

let exercisesData = JSON.parse(localStorage.getItem('sharkExercises')) || { exercises: [] };
let exercisesFilter = 'Todos';
let exercisesSearchTerm = '';
let currentExerciseId = null;
let exerciseAutocompleteActive = false;

// Grupos por defecto (se expandirán con los grupos personalizados)
const DEFAULT_EXERCISE_GROUPS = [
    'Compuesto', 'Full Body', 'Trapecios', 'Hombros', 'Pectorales',
    'Dorsales', 'Espalda', 'Bíceps', 'Tríceps', 'Antebrazos',
    'Abdominales', 'Oblicuos', 'Glúteos', 'Abductores', 'Aductores',
    'Cuádriceps', 'Isquiotibiales', 'Gemelos'
];

// ==========================================================================
// FUNCIONES DE ALMACENAMIENTO
// ==========================================================================

function saveExercises() {
    localStorage.setItem('sharkExercises', JSON.stringify(exercisesData));
}

function getExercises() {
    return exercisesData.exercises || [];
}

function setExercises(exercises) {
    exercisesData.exercises = exercises;
    saveExercises();
}

function getExerciseGroups() {
    const exerciseGroups = new Set();
    getExercises().forEach(ex => {
        if (ex.grupo) exerciseGroups.add(ex.grupo);
    });
    return [...exerciseGroups].sort();
}

function getAllGroups() {
    const customGroups = getExerciseGroups();
    const allGroups = new Set([...DEFAULT_EXERCISE_GROUPS, ...customGroups]);
    return [...allGroups].sort();
}

// ==========================================================================
// GENERAR ID
// ==========================================================================

function generateExerciseId() {
    return 'ex-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
}

// ==========================================================================
// RENDERIZADO PRINCIPAL
// ==========================================================================

function renderExercises() {
    const container = document.getElementById('exercises-container');
    if (!container) return;

    const exercises = getExercises();
    const searchTerm = exercisesSearchTerm.toLowerCase().trim();
    const filter = exercisesFilter;

    // Filtrar
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

    // Ordenar alfabéticamente
    filtered.sort((a, b) => a.nombre.localeCompare(b.nombre));

    // Construir HTML
    let html = '';

    // Encabezado
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

    // Lista de ejercicios
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

    // Actualizar estado del botón de limpieza
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
// FUNCIONES DE BÚSQUEDA Y FILTRO
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
    
    // Cerrar otras tarjetas abiertas
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
// FUNCIONES DE ACCIÓN DE EJERCICIOS
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

// Cerrar menú al hacer clic fuera
document.addEventListener('click', function() {
    const menu = document.getElementById('exercisesOptionsMenu');
    if (menu) {
        menu.classList.add('hidden');
    }
});

// ==========================================================================
// COMPARTIR EJERCICIO
// ==========================================================================

async function shareExercise(id) {
    const exercise = getExercises().find(ex => ex.id === id);
    if (!exercise) return;

    const action = await window.showExerciseShareDialog(exercise);
    
    if (action === 'file') {
        exportSingleExercise(exercise);
    } else if (action === 'share') {
        shareExerciseViaWeb(exercise);
    }
}

function exportSingleExercise(exercise) {
    const clean = {
        tipo: 'ejercicio_individual',
        ejercicio: {
            id: exercise.id,
            nombre: exercise.nombre,
            grupo: exercise.grupo || '',
            img: exercise.img || '',
            video: exercise.video || '',
            notas: exercise.notas || ''
        }
    };
    const dataStr = JSON.stringify(clean, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ejercicio_${exercise.nombre.replace(/\s+/g, '_')}_${getExerciseTimestamp()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function shareExerciseViaWeb(exercise) {
    const data = b64EncodeUnicode(JSON.stringify({
        n: exercise.nombre,
        g: exercise.grupo || '',
        i: exercise.img || '',
        v: exercise.video || '',
        t: exercise.notas || ''
    }));
    const url = `${window.location.origin}${window.location.pathname}?share-exercise=${data}`;
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: exercise.nombre,
                text: `Ejercicio: ${exercise.nombre}`,
                url: url
            });
        } catch (e) {
            // Usuario canceló
        }
    } else {
        try {
            await navigator.clipboard.writeText(url);
            window.showAlert('Enlace copiado al portapapeles.', 'Compartir');
        } catch {
            window.showAlert(`Comparte este enlace: ${url}`, 'Compartir');
        }
    }
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
// CRUD DE EJERCICIOS - MODAL A PANTALLA COMPLETA
// ==========================================================================

function openExerciseModal(id = null) {
    currentExerciseId = id;
    const modal = document.getElementById('modal-exercise');
    if (!modal) {
        console.error('Modal de ejercicio no encontrado');
        return;
    }

    const title = document.getElementById('exercise-modal-title');
    const idInput = document.getElementById('ex-id');
    const nombreInput = document.getElementById('ex-nombre');
    const grupoSelect = document.getElementById('ex-grupo');
    const imgInput = document.getElementById('ex-img');
    const videoInput = document.getElementById('ex-video');
    const notasTextarea = document.getElementById('ex-notas');

    // Populate groups
    const groups = getAllGroups();
    grupoSelect.innerHTML = groups.map(g => `<option value="${g}">${g}</option>`).join('');

    if (id) {
        const exercise = getExercises().find(ex => ex.id === id);
        if (!exercise) {
            window.showAlert('Ejercicio no encontrado.', 'Error');
            return;
        }
        title.textContent = 'Editar Ejercicio';
        idInput.value = exercise.id;
        nombreInput.value = exercise.nombre;
        grupoSelect.value = exercise.grupo || 'General';
        imgInput.value = exercise.img || '';
        videoInput.value = exercise.video || '';
        notasTextarea.value = exercise.notas || '';
    } else {
        title.textContent = 'Nuevo Ejercicio';
        idInput.value = '';
        nombreInput.value = '';
        grupoSelect.value = 'General';
        imgInput.value = '';
        videoInput.value = '';
        notasTextarea.value = '';
    }

    // Actualizar músculos
    updateExerciseMuscles(notasTextarea.value);

    // Mostrar modal a pantalla completa
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    
    // Forzar un reflow antes de añadir la clase active
    void modal.offsetWidth;
    
    modal.classList.add('active');
    
    setTimeout(() => {
        nombreInput.focus();
    }, 100);
}

function closeExerciseModal() {
    const modal = document.getElementById('modal-exercise');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.add('hidden');
        }, 200);
    }
    currentExerciseId = null;
}

function saveExercise() {
    const idInput = document.getElementById('ex-id');
    const nombreInput = document.getElementById('ex-nombre');
    const grupoSelect = document.getElementById('ex-grupo');
    const imgInput = document.getElementById('ex-img');
    const videoInput = document.getElementById('ex-video');
    const notasTextarea = document.getElementById('ex-notas');

    const nombre = nombreInput.value.trim();
    if (!nombre) {
        window.showAlert('El nombre del ejercicio es obligatorio.', 'Campos incompletos');
        return;
    }

    const id = idInput.value || generateExerciseId();
    const exercise = {
        id: id,
        nombre: nombre,
        grupo: grupoSelect.value || 'General',
        img: imgInput.value.trim() || '',
        video: videoInput.value.trim() || '',
        notas: notasTextarea.value.trim() || ''
    };

    let exercises = getExercises();
    const existingIndex = exercises.findIndex(ex => ex.id === id);
    if (existingIndex >= 0) {
        exercises[existingIndex] = exercise;
    } else {
        exercises.push(exercise);
    }

    setExercises(exercises);
    closeExerciseModal();
    renderExercises();
    window.showAlert(`Ejercicio "${exercise.nombre}" guardado correctamente.`, 'Guardado');
}

async function deleteExercise(id) {
    const exercise = getExercises().find(ex => ex.id === id);
    if (!exercise) return;

    const confirm = await window.showConfirm(
        `¿Estás seguro de eliminar el ejercicio "${exercise.nombre}"?`,
        'Eliminar ejercicio'
    );
    if (!confirm) return;

    let exercises = getExercises().filter(ex => ex.id !== id);
    setExercises(exercises);
    renderExercises();
    window.showAlert(`Ejercicio "${exercise.nombre}" eliminado.`, 'Eliminado');
}

// ==========================================================================
// MÚSCULOS IMPLICADOS - GRID DE 2 COLUMNAS
// ==========================================================================

function toggleMuscles() {
    const container = document.getElementById('musclesContainer');
    const toggle = document.querySelector('.muscles-toggle');
    if (container && toggle) {
        container.classList.toggle('open');
        toggle.classList.toggle('open');
    }
}

function updateExerciseMuscles(notas) {
    const container = document.getElementById('musclesCheckboxes');
    if (!container) return;

    const groups = getAllGroups();
    const selectedMuscles = extractMusclesFromNotes(notas);

    container.innerHTML = `
        <div class="muscles-grid">
            ${groups.map(g => `
                <label class="muscle-check">
                    <input type="checkbox" value="${g}" ${selectedMuscles.includes(g) ? 'checked' : ''}>
                    <span class="muscle-label">${g}</span>
                </label>
            `).join('')}
        </div>
    `;

    container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', function() {
            const notasTextarea = document.getElementById('ex-notas');
            if (!notasTextarea) return;
            
            const selected = Array.from(container.querySelectorAll('input[type="checkbox"]:checked'))
                .map(cb => cb.value);
            
            const nuevasNotas = updateNotesWithMuscles(notasTextarea.value, selected);
            notasTextarea.value = nuevasNotas;
            notasTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        });
    });
}

function extractMusclesFromNotes(notas) {
    if (!notas) return [];
    const regex = /^Músculos implicados:\s*(.+)$/im;
    const match = notas.match(regex);
    if (match && match[1]) {
        return match[1].split(',').map(s => s.trim()).filter(s => s.length > 0);
    }
    return [];
}

function updateNotesWithMuscles(notasOriginal, listaMusculos) {
    const lineaMusculos = `Músculos implicados: ${listaMusculos.join(', ')}`;
    if (!notasOriginal || notasOriginal.trim() === '') {
        return lineaMusculos;
    }
    const regex = /^Músculos implicados:.*$/im;
    if (regex.test(notasOriginal)) {
        return notasOriginal.replace(regex, lineaMusculos);
    } else {
        return notasOriginal.trim() + '\n\n' + lineaMusculos;
    }
}

// ==========================================================================
// OPCIONES DE EJERCICIOS (Importar / Exportar)
// ==========================================================================

function openExerciseOptions() {
    if (typeof window.abrirOpcionesEjercicios === 'function') {
        window.abrirOpcionesEjercicios();
        return;
    }
    
    window.showAlert(
        'Opciones de ejercicios:\n\n' +
        '• Añadir ejercicio (botón +)\n' +
        '• Editar desde cada tarjeta\n' +
        '• Eliminar desde cada tarjeta\n' +
        '• Compartir desde cada tarjeta',
        'Opciones'
    );
}

function exportAllExercises() {
    const exercises = getExercises();
    if (exercises.length === 0) {
        window.showAlert('No hay ejercicios para exportar.', 'Exportar');
        return;
    }
    const clean = {
        tipo: 'ejercicios_export',
        ejercicios: exercises
    };
    const dataStr = JSON.stringify(clean, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ejercicios_Export_${getExerciseTimestamp()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.showAlert('Ejercicios exportados correctamente.', 'Exportar');
}

function importExercisesFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            let exercisesToImport = [];

            if (data.tipo === 'ejercicios_export' && Array.isArray(data.ejercicios)) {
                exercisesToImport = data.ejercicios;
            } else if (Array.isArray(data) && data.length > 0 && data[0].nombre) {
                exercisesToImport = data;
            } else if (data.ejercicio && data.ejercicio.nombre) {
                exercisesToImport = [data.ejercicio];
            } else {
                throw new Error('El archivo no tiene un formato de ejercicios válido.');
            }

            const currentExercises = getExercises();
            const existingNames = new Set(currentExercises.map(ex => ex.nombre.toLowerCase().trim()));

            const duplicates = exercisesToImport.filter(ex => 
                existingNames.has(ex.nombre.toLowerCase().trim())
            );

            if (duplicates.length > 0) {
                const action = await window.showConfirm(
                    `${duplicates.length} ejercicio(s) ya existen en tu lista. ¿Deseas sobreescribirlos?`,
                    'Ejercicios duplicados'
                );
                
                if (action) {
                    exercisesToImport.forEach(imported => {
                        const idx = currentExercises.findIndex(ex => 
                            ex.nombre.toLowerCase().trim() === imported.nombre.toLowerCase().trim()
                        );
                        if (idx >= 0) {
                            currentExercises[idx] = { ...imported, id: currentExercises[idx].id };
                        } else {
                            currentExercises.push({ ...imported, id: generateExerciseId() });
                        }
                    });
                } else {
                    exercisesToImport.forEach(imported => {
                        currentExercises.push({ ...imported, id: generateExerciseId() });
                    });
                }
            } else {
                exercisesToImport.forEach(imported => {
                    currentExercises.push({ ...imported, id: generateExerciseId() });
                });
            }

            setExercises(currentExercises);
            renderExercises();
            window.showAlert(`Se importaron ${exercisesToImport.length} ejercicios.`, 'Importación completada');

        } catch (err) {
            window.showAlert('Error al leer el archivo: ' + err.message, 'Error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function getExerciseTimestamp() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}`;
}

function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode('0x' + p1)));
}

// ==========================================================================
// INTEGRACIÓN CON EL EDITOR DE SESIONES
// ==========================================================================

function getExerciseListForEditor() {
    return getExercises().map(ex => ex.nombre);
}

function getExerciseSuggestions(searchTerm) {
    const exercises = getExercises();
    const term = searchTerm.toLowerCase().trim();
    if (!term) return exercises.slice(0, 8);
    
    return exercises
        .filter(ex => 
            ex.nombre.toLowerCase().includes(term) ||
            (ex.grupo && ex.grupo.toLowerCase().includes(term))
        )
        .slice(0, 8);
}

function insertExerciseIntoEditor(exerciseName, editorInstance) {
    if (!editorInstance || typeof editorInstance.insertText !== 'function') return;
    
    const range = editorInstance.getSelection(true);
    const text = `\n• ${exerciseName}: `;
    editorInstance.insertText(range.index, text, { 'bold': true });
    editorInstance.setSelection(range.index + exerciseName.length + 4);
}

// ==========================================================================
// INICIALIZACIÓN
// ==========================================================================

function initExercisesPage() {
    renderExercises();

    const input = document.getElementById('exercisesSearchInput');
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                clearExercisesSearch();
            }
        });
    }
}

// ==========================================================================
// DIALOGO DE COMPARTIR (integrado con modal personalizado)
// ==========================================================================

window.showExerciseShareDialog = function(exercise) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'exercise-share-dialog';
        overlay.style.display = 'flex';
        overlay.style.zIndex = '3000';
        
        overlay.innerHTML = `
            <div class="modal-container" style="max-width: 300px;">
                <div class="modal-header">
                    <span class="modal-icon"><i class="fa-solid fa-share-nodes"></i></span>
                    <h3>Compartir ejercicio</h3>
                </div>
                <div class="modal-body">
                    <p style="font-weight: 600; margin-bottom: 16px;">"${exercise.nombre}"</p>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <button id="share-file-btn" class="modal-btn modal-btn-primary" style="width: 100%; text-align: center;">
                            <i class="fa-solid fa-file-export"></i> Guardar archivo
                        </button>
                        <button id="share-link-btn" class="modal-btn" style="width: 100%; text-align: center; background: #e3f2fd; color: #0d47a1;">
                            <i class="fa-solid fa-link"></i> Compartir enlace
                        </button>
                        <button id="share-cancel-btn" class="modal-btn modal-btn-secondary" style="width: 100%; text-align: center;">
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        document.getElementById('share-file-btn').onclick = () => {
            overlay.remove();
            resolve('file');
        };
        
        document.getElementById('share-link-btn').onclick = () => {
            overlay.remove();
            resolve('share');
        };
        
        document.getElementById('share-cancel-btn').onclick = () => {
            overlay.remove();
            resolve(null);
        };
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                resolve(null);
            }
        });
    });
};

// ==========================================================================
// FUNCIONES PARA EL BOTÓN "EJERCICIOS GYM" DEL EDITOR
// ==========================================================================

window.getExerciseAutocompleteList = function(searchTerm) {
    const exercises = getExercises();
    const term = searchTerm.toLowerCase().trim();
    if (!term) return exercises.slice(0, 8);
    
    return exercises
        .filter(ex => 
            ex.nombre.toLowerCase().includes(term) ||
            (ex.grupo && ex.grupo.toLowerCase().includes(term))
        )
        .slice(0, 8);
};

window.insertExerciseFromAutocomplete = function(exerciseName, editorInstance) {
    if (!editorInstance || typeof editorInstance.insertText !== 'function') return;
    
    const range = editorInstance.getSelection(true);
    const text = `\n• ${exerciseName}: `;
    editorInstance.insertText(range.index, text, { 'bold': true });
    editorInstance.setSelection(range.index + exerciseName.length + 4);
};