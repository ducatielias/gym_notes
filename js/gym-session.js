/**
 * MÓDULO: gym-session.js
 * Controla la inicialización de la instancia enriquecida de Quill,
 * la gestión del filtrado dinámico en el buscador de ejercicios, y las
 * animaciones de los menús colapsables de herramientas.
 * 
 * MODIFICADO: La lista de ejercicios ahora muestra SOLO los ejercicios
 * guardados en la base de datos, con su imagen correspondiente.
 * Eliminados los ejercicios predefinidos.
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

// Obtener lista de ejercicios SOLO desde la base de datos
function obtenerListaEjerciciosDesdeBD() {
    // Obtener ejercicios desde el sistema de ejercicios
    if (typeof window.getExerciseAutocompleteList === 'function') {
        const exercises = window.getExerciseAutocompleteList('');
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

    // Obtener la URL de la imagen o usar un placeholder
    listContainer.innerHTML = lista.map(ejercicio => {
        const imgSrc = ejercicio.img || getPlaceholderImage(ejercicio.nombre);
        const nombreEscapado = ejercicio.nombre.replace(/'/g, "\\'");
        
        return `
            <li class="exercise-item" onclick="insertarEjercicioEnTexto('${nombreEscapado}')">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <img src="${imgSrc}" 
                         style="width: 32px; height: 32px; border-radius: 8px; object-fit: cover; background: #f3f4f6; flex-shrink: 0;" 
                         onerror="this.src='${getPlaceholderImage(ejercicio.nombre)}'"
                         alt="${ejercicio.nombre}">
                    <span>${ejercicio.nombre}</span>
                </div>
            </li>
        `;
    }).join('');
}

// Función para obtener imagen placeholder
function getPlaceholderImage(text) {
    return 'data:image/svg+xml,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
            <rect width="32" height="32" fill="#f3f4f6" rx="8"/>
            <text x="16" y="20" font-family="Arial" font-size="16" text-anchor="middle" fill="#9ca3af">💪</text>
        </svg>
    `);
}

// MODIFICADO: Filtrar en tiempo real los ejercicios mediante la caja de entrada de texto
function filtrarEjercicios() {
    const searchInput = document.getElementById('searchExercise');
    if (!searchInput) return;

    const query = searchInput.value.toLowerCase().trim();
    
    // Usar el sistema de autocompletado de ejercicios SOLO de la base de datos
    if (typeof window.getExerciseAutocompleteList === 'function') {
        const exercises = window.getExerciseAutocompleteList(query);
        if (exercises && exercises.length > 0) {
            renderExercisesList(exercises);
            return;
        }
    }
    
    // Si no hay ejercicios en la base de datos o no hay coincidencias
    renderExercisesList([]);
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