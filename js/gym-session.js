/**
 * MÓDULO: gym-session.js
 * Controla la inicialización de la instancia enriquecida de Quill,
 * la gestión del filtrado dinámico en el buscador de ejercicios, y las
 * animaciones de los menús colapsables de herramientas.
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
        window.quillInstance.clipboard.dangerouslyPasteHTML(initialContent);
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
            
            // Limpiamos el buscador e inyectamos los datos por defecto
            const searchInput = document.getElementById('searchExercise');
            if (searchInput) searchInput.value = "";
            renderExercisesList(obtenerListaEjerciciosPorDefecto());

            toolbarWrapper.classList.remove('open');
            toolbarWrapper.style.maxHeight = '0px';
            formatBtn.classList.remove('active');
        }
    }
}

// MODIFICADO: Obtener lista de ejercicios desde el sistema de ejercicios
function obtenerListaEjerciciosPorDefecto() {
    // Obtener ejercicios desde el sistema de ejercicios
    if (typeof window.getExerciseAutocompleteList === 'function') {
        const exercises = window.getExerciseAutocompleteList('');
        if (exercises && exercises.length > 0) {
            return exercises.map(ex => ex.nombre);
        }
    }
    
    // Fallback: lista por defecto si no hay ejercicios guardados
    return [
        "Press de Banca (Barra)", "Press Inclinado (Mancuernas)", "Aperturas en Polea",
        "Fondos en Paralelas", "Sentadillas Traseras", "Prensa de Piernas",
        "Extensión de Cuádriceps", "Peso Muerto Rumano", "Curl de Piernas",
        "Elevaciones de Gemelos", "Dominadas", "Remo con Barra",
        "Jalón al Pecho", "Remo con Mancuerna", "Press Militar (Barra)",
        "Elevaciones Laterales", "Pájaros (Hombro Posterior)", "Curl de Bíceps (Barra)",
        "Curl Martillo", "Extensiones de Tríceps (Polea)", "Press Francés"
    ];
}

// Renderizar dinámicamente los elementos LI dentro del contenedor UL buscador
function renderExercisesList(lista) {
    const listContainer = document.getElementById('exercisesList');
    if (!listContainer) return;

    if (!lista || lista.length === 0) {
        listContainer.innerHTML = `<li class="no-results">No se encontraron ejercicios</li>`;
        return;
    }

    listContainer.innerHTML = lista.map(ejercicio => `
        <li class="exercise-item" onclick="insertarEjercicioEnTexto('${ejercicio.replace(/'/g, "\\'")}')">
            ${ejercicio}
        </li>
    `).join('');
}

// MODIFICADO: Filtrar en tiempo real los ejercicios mediante la caja de entrada de texto
function filtrarEjercicios() {
    const searchInput = document.getElementById('searchExercise');
    if (!searchInput) return;

    const query = searchInput.value.toLowerCase().trim();
    
    // Usar el sistema de autocompletado de ejercicios
    if (typeof window.getExerciseAutocompleteList === 'function') {
        const exercises = window.getExerciseAutocompleteList(query);
        if (exercises && exercises.length > 0) {
            renderExercisesList(exercises.map(ex => ex.nombre));
            return;
        }
    }
    
    // Fallback: usar lista por defecto
    const todosLosEjercicios = obtenerListaEjerciciosPorDefecto();
    if (query === "") {
        renderExercisesList(todosLosEjercicios);
        return;
    }
    const filtrados = todosLosEjercicios.filter(ej => ej.toLowerCase().includes(query));
    renderExercisesList(filtrados);
}

// Insertar de manera limpia el ejercicio seleccionado en la posición actual del cursor de Quill
function insertarEjercicioEnTexto(nombreEjercicio) {
    if (!window.quillInstance) return;

    // Obtener la posición actual del foco/cursor del usuario
    const range = window.quillInstance.getSelection(true);
    
    // Inyectar el texto formateado en negrita seguido de un salto de línea
    window.quillInstance.insertText(range.index, `\n• ${nombreEjercicio}: `, { 'bold': true });
    
    // Desplazar el cursor inmediatamente al final del bloque insertado para facilitar la escritura
    window.quillInstance.setSelection(range.index + nombreEjercicio.length + 4);
    
    // Cerramos el menú elástico automáticamente tras la inserción para mejorar la usabilidad
    toggleSection('exercises');
}