/**
 * MÓDULO: gym-session.js
 * Controla la inicialización de la instancia enriquecida de Quill,
 * la gestión del filtrado dinámico en el buscador de ejercicios, y las
 * animaciones de los menús colapsables de herramientas.
 * 
 * MODIFICADO: Los ejercicios insertados usan formato nativo de Quill
 * y se detectan por texto para abrir el visor.
 * 
 * MODIFICADO: Ahora muestra TODOS los ejercicios sin límite de 8.
 */

window.quillInstance = null;

// Inicializar la instancia nativa del editor enriquecido Quill
function initEditorInstance(initialContent) {
    // Evitar duplicidades si la instancia ya existía previamente
    if (window.quillInstance) {
        window.quillInstance = null;
    }

    window.quillInstance = new Quill('#editor-instance', {
        theme: 'snow',
        modules: {
            toolbar: '#toolbar-container' // Enlazado al contenedor inyectado
        },
        placeholder: 'Escribe aquí tu rutina, series, repeticiones o anotaciones de la sesión...'
    });

    // Inyectar el contenido semántico o HTML almacenado previamente
    if (initialContent) {
        window.quillInstance.clipboard.dangerouslyPasteHTML(GymNotesSafe.sanitizeRichHtml(initialContent));
    }
    
    // Asegurar que el listener global está configurado
    if (typeof window.configurarListenerGlobalEjercicios === 'function') {
        window.configurarListenerGlobalEjercicios();
    }
}

// Controlar la conmutación y animación elástica de las barras secundarias
function toggleSection(type) {
    const toolbarWrapper = document.getElementById('toolbarWrapper');
    const exercisesWrapper = document.getElementById('exercisesWrapper');
    const formatBtn = document.getElementById('formatBtn');
    const exercisesBtn = document.getElementById('exercisesBtn');

    if (!toolbarWrapper || !exercisesWrapper || !formatBtn || !exercisesBtn) return;

    // Caso A: Click en el botón de Formato
    if (type === 'format') {
        if (toolbarWrapper.classList.contains('open')) {
            // Si ya estaba abierto, simplemente lo cerramos
            toolbarWrapper.classList.remove('open');
            toolbarWrapper.style.maxHeight = '0px';
            formatBtn.classList.remove('active');
        } else {
            // Abrimos formato y nos aseguramos de colapsar ejercicios si estuviera abierto
            toolbarWrapper.classList.add('open');
            toolbarWrapper.style.maxHeight = '240px';
            formatBtn.classList.add('active');

            exercisesWrapper.classList.remove('open');
            exercisesWrapper.style.maxHeight = '0px';
            exercisesBtn.classList.remove('active');
        }
    }

    // Caso B: Click en el botón de Ejercicios Gym
    if (type === 'exercises') {
        if (exercisesWrapper.classList.contains('open')) {
            // Si ya estaba abierto, simplemente lo cerramos
            exercisesWrapper.classList.remove('open');
            exercisesWrapper.style.maxHeight = '0px';
            exercisesBtn.classList.remove('active');
        } else {
            // Abrimos ejercicios, cargamos el listado inicial y colapsamos formato
            exercisesWrapper.classList.add('open');
            exercisesWrapper.style.maxHeight = '240px';
            exercisesBtn.classList.add('active');
            
            // Limpiamos el buscador e inyectamos los datos de la base de datos
            const searchInput = document.getElementById('searchExercise');
            if (searchInput) searchInput.value = "";
            renderExercisesList(obtenerListaEjerciciosDesdeBD());
            
            // Cargar ejercicios de la base de datos
            cargarEjerciciosDesdeBD();

            toolbarWrapper.classList.remove('open');
            toolbarWrapper.style.maxHeight = '0px';
            formatBtn.classList.remove('active');
        }
    }
}

// Obtener lista de ejercicios SOLO desde la base de datos (SIN LÍMITE)
function obtenerListaEjerciciosDesdeBD() {
    // Obtener ejercicios desde el sistema de ejercicios
    if (typeof window.getExercises === 'function') {
        const exercises = window.getExercises();
        if (exercises && exercises.length > 0) {
            return exercises;
        }
    }
    
    // Si no hay ejercicios en la base de datos, devolver array vacío
    return [];
}

// Cargar ejercicios desde la base de datos
function cargarEjerciciosDesdeBD() {
    const exercises = obtenerListaEjerciciosDesdeBD();
    renderExercisesList(exercises);
}

// Renderizar dinámicamente los elementos LI dentro del contenedor UL buscador
function renderExercisesList(lista) {
    const listContainer = document.getElementById('exercisesList');
    if (!listContainer) return;

    if (!lista || lista.length === 0) {
        listContainer.innerHTML = `<li class="no-results">No hay ejercicios guardados. <br>Ve a la pestaña "Ejercicios" para crear uno.</li>`;
        return;
    }

    // Las miniaturas reales se conservan; los ejercicios sin imagen usan un marcador CSS local.
    listContainer.innerHTML = lista.map(ejercicio => {
        const imgSrc = GymNotesSafe.getSafeImageUrl(ejercicio.img);
        const exerciseName = GymNotesSafe.escapeText(ejercicio.nombre);
        const exerciseNameHandler = GymNotesSafe.escapeInlineHandlerArgument(ejercicio.nombre);
        const exerciseIdHandler = GymNotesSafe.escapeInlineHandlerArgument(ejercicio.id);
        const imageSrcAttribute = imgSrc ? GymNotesSafe.escapeText(imgSrc) : '';
        const exerciseMarker = imageSrcAttribute
            ? `<img class="session-exercise-marker session-exercise-marker--image" src="${imageSrcAttribute}" alt="${exerciseName}">`
            : `<span class="session-exercise-marker session-exercise-marker--fallback" aria-hidden="true"><i class="fa-solid fa-dumbbell"></i></span>`;
        
        return `
            <li class="exercise-item" onclick="insertarEjercicioEnTexto('${exerciseNameHandler}', '${exerciseIdHandler}')">
                <div class="session-exercise-item__content">
                    ${exerciseMarker}
                    <span class="session-exercise-item__name">${exerciseName}</span>
                </div>
            </li>
        `;
    }).join('');

    // Una imagen rota debe conservar el mismo marcador plano que un ejercicio sin miniatura.
    listContainer.querySelectorAll('.session-exercise-marker--image').forEach((image) => {
        image.addEventListener('error', () => replaceExerciseImageWithMarker(image), { once: true });

        if (image.complete && image.naturalWidth === 0) {
            replaceExerciseImageWithMarker(image);
        }
    });
}

/**
 * Sustituye una miniatura fallida por el mismo indicador plano usado sin imagen.
 * Solo resuelve la presentación de la lista; no altera el ejercicio seleccionado.
 */
function replaceExerciseImageWithMarker(image) {
    if (!image.isConnected) return;

    const marker = document.createElement('span');
    marker.className = 'session-exercise-marker session-exercise-marker--fallback';
    marker.setAttribute('aria-hidden', 'true');

    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-dumbbell';
    marker.appendChild(icon);

    image.replaceWith(marker);
}

// Filtrar en tiempo real los ejercicios mediante la caja de entrada de texto
function filtrarEjercicios() {
    const searchInput = document.getElementById('searchExercise');
    if (!searchInput) return;

    const query = searchInput.value.toLowerCase().trim();
    
    // Usar el sistema de ejercicios SOLO de la base de datos
    if (typeof window.getExercises === 'function') {
        const exercises = window.getExercises();
        let filtered = exercises;
        
        if (query) {
            filtered = exercises.filter(ex => 
                ex.nombre.toLowerCase().includes(query) ||
                (ex.grupo && ex.grupo.toLowerCase().includes(query))
            );
        }
        
        if (filtered && filtered.length > 0) {
            renderExercisesList(filtered);
            return;
        }
    }
    
    // Si no hay ejercicios en la base de datos o no hay coincidencias
    renderExercisesList([]);
}

// Insertar de manera limpia el ejercicio seleccionado en la posición actual del cursor de Quill
// MODIFICADO: Usa el formato nativo de Quill (negrita + subrayado).
function insertarEjercicioEnTexto(nombreEjercicio, ejercicioId) {
    if (!window.quillInstance) {
        console.warn('[gym-session] Quill no está inicializado');
        return;
    }

    // Obtener la posición actual del foco/cursor del usuario
    const range = window.quillInstance.getSelection(true);
    if (!range) {
        console.warn('[gym-session] No se pudo obtener la selección de Quill');
        return;
    }
    
    // Asegurar que tenemos un ID válido (guardamos el ID para futuras referencias)
    const id = ejercicioId || nombreEjercicio;
    console.log('[gym-session] Insertando ejercicio:', nombreEjercicio, 'ID:', id);
    
    // El texto hereda el color principal del editor; el azul se reserva para enlaces reales.
    window.quillInstance.insertText(range.index, `${nombreEjercicio}`, {
        'bold': true,
        'underline': false
    });
    
    // Desplazar el cursor al final del bloque insertado
    const newRange = window.quillInstance.getSelection();
    if (newRange) {
        window.quillInstance.setSelection(newRange.index, 0);
    }
    
    // Cerramos el menú elástico automáticamente tras la inserción
    toggleSection('exercises');
    
    console.log('[gym-session] Ejercicio insertado correctamente');
}

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.initEditorInstance = initEditorInstance;
window.toggleSection = toggleSection;
window.filtrarEjercicios = filtrarEjercicios;
window.insertarEjercicioEnTexto = insertarEjercicioEnTexto;
window.obtenerListaEjerciciosDesdeBD = obtenerListaEjerciciosDesdeBD;
window.cargarEjerciciosDesdeBD = cargarEjerciciosDesdeBD;
window.renderExercisesList = renderExercisesList;
