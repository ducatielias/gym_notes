/**
 * MÓDULO: gym-plan.js
 * Administra el almacenamiento local, la renderización de rutinas y la
 * inyección de la interfaz limpia del editor de sesiones con menús contextuales
 * interactivos tanto para rutinas como para sesiones.
 */

let appData = JSON.parse(localStorage.getItem('sharkAppData')) || {
    routines: []
};

let currentRoutineId = null;
const planUI = document.getElementById('plan-container');

// Renderizar el listado principal de bloques de rutinas
function renderRoutineList() {
    planUI.innerHTML = `
        <header class="screen-header">
            <div class="header-nav-row">
                <h1>Mis Rutinas</h1>
                <button class="btn-header-add" onclick="createNewRoutine()" title="Nueva Rutina">
                    <i class="fa-solid fa-plus"></i>
                </button>
            </div>
        </header>
        
        <div id="routines-list" class="cards-grid">
            ${appData.routines.map((routine, index) => `
                <div class="card card-routine" onclick="openRoutine('${routine.id}')">
                    <div class="card-content">
                        <h3>${routine.name}</h3>
                        <p>${routine.sessions.length} sesiones creadas</p>
                    </div>
                    
                    <button class="btn-routine-options" onclick="toggleRoutineMenu(event, '${routine.id}')">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>

                    <div class="routine-menu-dropdown hidden" id="menu-routine-${routine.id}" onclick="event.stopPropagation()">
                        <button class="routine-menu-item" onclick="moveRoutineOrder('${routine.id}', -1)">
                            <i class="fa-solid fa-arrow-up"></i> Mover arriba
                        </button>
                        <button class="routine-menu-item" onclick="moveRoutineOrder('${routine.id}', 1)">
                            <i class="fa-solid fa-arrow-down"></i> Mover abajo
                        </button>
                        
                        <div class="routine-menu-divider"></div>
                        
                        <button class="routine-menu-item" onclick="renameRoutine('${routine.id}')">
                            <i class="fa-solid fa-pen"></i> Editar nombre
                        </button>
                        <button class="routine-menu-item" onclick="copyWholeRoutine('${routine.id}')">
                            <i class="fa-solid fa-clone"></i> Copiar rutina
                        </button>
                        <button class="routine-menu-item menu-delete" onclick="deleteRoutine('${routine.id}')">
                            <i class="fa-solid fa-trash-can"></i> Eliminar rutina
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>

        ${appData.routines.length === 0 ? `
            <div class="empty-state">
                <p>No tienes rutinas todavía.<br>Crea la primera para empezar.</p>
            </div>
        ` : ''}
    `;
}

// Abrir una rutina específica y ver sus sesiones de entrenamiento
function openRoutine(id) {
    currentRoutineId = id;
    const routine = appData.routines.find(r => r.id === id);

    planUI.innerHTML = `
        <header class="screen-header">
            <div class="header-nav-row">
                <button class="btn-back" onclick="renderRoutineList()">
                    <i class="fa-solid fa-chevron-left"></i> Volver
                </button>
                <button class="btn-header-add" onclick="createNewSession()" title="Nueva Sesión">
                    <i class="fa-solid fa-plus"></i>
                </button>
            </div>
            <h2 class="routine-detail-title">${routine.name}</h2>
        </header>

        <div id="sessions-list" class="cards-grid">
            ${routine.sessions.map((session, index) => `
                <div class="card card-session" onclick="openSessionEditor('${session.id}')">
                    <div class="card-content">
                        <h3>${session.title}</h3>
                        <p>Modificado: ${new Date(session.lastModified).toLocaleDateString()}</p>
                    </div>
                    
                    <button class="btn-session-options" onclick="toggleSessionMenu(event, '${session.id}')">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>

                    <div class="session-menu-dropdown hidden" id="menu-${session.id}" onclick="event.stopPropagation()">
                        <button class="session-menu-item" onclick="moveSessionOrder('${session.id}', -1)">
                            <i class="fa-solid fa-arrow-up"></i> Mover arriba
                        </button>
                        <button class="session-menu-item" onclick="moveSessionOrder('${session.id}', 1)">
                            <i class="fa-solid fa-arrow-down"></i> Mover abajo
                        </button>
                        
                        <div class="routine-menu-divider"></div>
                        
                        <button class="session-menu-item" onclick="copySessionToRoutine('${session.id}')">
                            <i class="fa-solid fa-clone"></i> Copiar sesión
                        </button>
                        <button class="session-menu-item" onclick="moveSessionToRoutine('${session.id}')">
                            <i class="fa-solid fa-right-from-bracket"></i> Mover sesión
                        </button>
                        <button class="session-menu-item menu-delete" onclick="deleteSession('${session.id}')">
                            <i class="fa-solid fa-trash-can"></i> Eliminar sesión
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>

        ${routine.sessions.length === 0 ? `
            <div class="empty-state">
                <p>Esta rutina no tiene sesiones.<br>¡Añade una ahora!</p>
            </div>
        ` : ''}
    `;
}

async function createNewRoutine() {
    const name = await window.showPrompt("Nombre de la nueva rutina:", "", "Nueva Rutina");
    if (!name) return;

    const newRoutine = {
        id: 'r-' + Date.now(),
        name: name,
        sessions: []
    };

    appData.routines.push(newRoutine);
    saveData();
    renderRoutineList();
}

function createNewSession() {
    const routine = appData.routines.find(r => r.id === currentRoutineId);
    if (!routine) return;

    const newSession = {
        id: 's-' + Date.now(),
        title: 'Nueva Sesión',
        content: '',
        lastModified: Date.now()
    };

    routine.sessions.push(newSession);
    saveData();
    
    // Al ser una sesión completamente nueva, la abrimos directamente en modo edición
    openSessionEditor(newSession.id, true);
}

/* ==========================================================================
   LÓGICA OPERATIVA DE MENÚS CONTEXTUALES PARA RUTINAS
   ========================================================================== */

function toggleRoutineMenu(event, routineId) {
    event.stopPropagation();
    
    const routineDropdowns = document.querySelectorAll('.routine-menu-dropdown');
    routineDropdowns.forEach(menu => {
        if (menu.id !== `menu-routine-${routineId}`) {
            menu.classList.add('hidden');
        }
    });

    const sessionDropdowns = document.querySelectorAll('.session-menu-dropdown');
    sessionDropdowns.forEach(menu => menu.classList.add('hidden'));

    const targetMenu = document.getElementById(`menu-routine-${routineId}`);
    if (targetMenu) {
        targetMenu.classList.toggle('hidden');
    }
}

function moveRoutineOrder(routineId, direction) {
    const index = appData.routines.findIndex(r => r.id === routineId);
    if (index === -1) return;

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= appData.routines.length) return;

    const [movedRoutine] = appData.routines.splice(index, 1);
    appData.routines.splice(targetIndex, 0, movedRoutine);

    saveData();
    renderRoutineList();
}

async function renameRoutine(routineId) {
    const routine = appData.routines.find(r => r.id === routineId);
    if (!routine) return;

    const newName = await window.showPrompt("Modificar nombre de la rutina:", routine.name, "Editar nombre");
    if (!newName || newName.trim() === "") return;

    routine.name = newName.trim();
    saveData();
    renderRoutineList();
}

async function copyWholeRoutine(routineId) {
    const originalRoutine = appData.routines.find(r => r.id === routineId);
    if (!originalRoutine) return;

    const clonedSessions = originalRoutine.sessions.map(session => ({
        id: 's-' + Math.floor(Math.random() * 10000000) + Date.now(),
        title: session.title,
        content: session.content,
        lastModified: Date.now()
    }));

    const clonedRoutine = {
        id: 'r-' + Date.now(),
        name: `${originalRoutine.name} (Copia)`,
        sessions: clonedSessions
    };

    appData.routines.push(clonedRoutine);
    saveData();
    
    await window.showAlert(`Rutina "${originalRoutine.name}" duplicada con éxito.`, "Completado");
    renderRoutineList();
}

async function deleteRoutine(routineId) {
    const routine = appData.routines.find(r => r.id === routineId);
    if (!routine) return;

    const confirmDelete = await window.showConfirm(`¿Estás completamente seguro de eliminar la rutina "${routine.name}" y todas sus sesiones?`, "Eliminar rutina");
    if (confirmDelete) {
        appData.routines = appData.routines.filter(r => r.id !== routineId);
        saveData();
        renderRoutineList();
    }
}

/* ==========================================================================
   LÓGICA OPERATIVA DE MENÚS CONTEXTUALES PARA SESIONES
   ========================================================================== */

function toggleSessionMenu(event, sessionId) {
    event.stopPropagation();
    
    const dropdowns = document.querySelectorAll('.session-menu-dropdown');
    dropdowns.forEach(menu => {
        if (menu.id !== `menu-${sessionId}`) {
            menu.classList.add('hidden');
        }
    });

    const routineDropdowns = document.querySelectorAll('.routine-menu-dropdown');
    routineDropdowns.forEach(menu => menu.classList.add('hidden'));

    const targetMenu = document.getElementById(`menu-${sessionId}`);
    if (targetMenu) {
        targetMenu.classList.toggle('hidden');
    }
}

document.addEventListener('click', () => {
    document.querySelectorAll('.session-menu-dropdown').forEach(m => m.classList.add('hidden'));
    document.querySelectorAll('.routine-menu-dropdown').forEach(m => m.classList.add('hidden'));
    const editorMenu = document.getElementById('editorOptionsMenu');
    if (editorMenu) {
        editorMenu.classList.add('hidden');
    }
});

function moveSessionOrder(sessionId, direction) {
    const routine = appData.routines.find(r => r.id === currentRoutineId);
    if (!routine) return;

    const index = routine.sessions.findIndex(s => s.id === sessionId);
    if (index === -1) return;

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= routine.sessions.length) return;

    const [movedSession] = routine.sessions.splice(index, 1);
    routine.sessions.splice(targetIndex, 0, movedSession);

    saveData();
    openRoutine(currentRoutineId);
}

async function deleteSession(sessionId) {
    const routine = appData.routines.find(r => r.id === currentRoutineId);
    if (!routine) return;

    const session = routine.sessions.find(s => s.id === sessionId);
    if (!session) return;

    const confirmDelete = await window.showConfirm(`¿Estás seguro de que deseas eliminar la sesión "${session.title}"?`, "Eliminar sesión");
    if (confirmDelete) {
        routine.sessions = routine.sessions.filter(s => s.id !== sessionId);
        saveData();
        openRoutine(currentRoutineId);
    }
}

async function copySessionToRoutine(sessionId) {
    const currentRoutine = appData.routines.find(r => r.id === currentRoutineId);
    const sessionToCopy = currentRoutine.sessions.find(s => s.id === sessionId);
    if (!sessionToCopy) return;

    // Mostrar selector visual de rutinas
    const selectedRoutine = await window.showRoutineSelector(
        appData.routines,
        currentRoutineId,
        'copy'
    );

    if (!selectedRoutine) return;

    const clonedSession = {
        id: 's-' + Date.now(),
        title: `${sessionToCopy.title} (Copia)`,
        content: sessionToCopy.content,
        lastModified: Date.now()
    };

    selectedRoutine.sessions.push(clonedSession);
    saveData();
    
    await window.showAlert(`Sesión copiada con éxito a "${selectedRoutine.name}"`, "Completado");
    openRoutine(currentRoutineId);
}

async function moveSessionToRoutine(sessionId) {
    const currentRoutine = appData.routines.find(r => r.id === currentRoutineId);
    const sessionIndex = currentRoutine.sessions.findIndex(s => s.id === sessionId);
    if (sessionIndex === -1) return;

    const sessionToMove = currentRoutine.sessions[sessionIndex];

    // Mostrar selector visual de rutinas
    const selectedRoutine = await window.showRoutineSelector(
        appData.routines,
        currentRoutineId,
        'move'
    );

    if (!selectedRoutine) return;

    if (selectedRoutine.id === currentRoutineId) {
        await window.showAlert("No puedes mover una sesión a la misma rutina.", "Aviso");
        return;
    }

    currentRoutine.sessions.splice(sessionIndex, 1);
    sessionToMove.lastModified = Date.now();
    selectedRoutine.sessions.push(sessionToMove);

    saveData();
    
    await window.showAlert(`Sesión movida con éxito a "${selectedRoutine.name}"`, "Completado");
    openRoutine(currentRoutineId);
}

/* ==========================================================================
   FUNCIONES PARA EL MENÚ DE OPCIONES DEL EDITOR (TRES PUNTOS)
   ========================================================================== */

// Alternar el menú de opciones del editor (tres puntos)
function toggleSessionOptionsMenu(event) {
    event.stopPropagation();
    
    // Cerrar cualquier otro menú abierto de rutinas/sesiones
    document.querySelectorAll('.session-menu-dropdown').forEach(m => m.classList.add('hidden'));
    document.querySelectorAll('.routine-menu-dropdown').forEach(m => m.classList.add('hidden'));
    
    const targetMenu = document.getElementById('editorOptionsMenu');
    if (targetMenu) {
        targetMenu.classList.toggle('hidden');
    }
}

// Manejar la opción "Historial"
async function handleSessionHistory() {
    const session = window.editingSession;
    if (session) {
        await window.showAlert(`Historial de modificaciones de "${session.title}"\n\nÚltima modificación: ${new Date(session.lastModified).toLocaleString()}`, "Historial");
    }
    // Cerrar el menú
    const menu = document.getElementById('editorOptionsMenu');
    if (menu) menu.classList.add('hidden');
}

// Manejar la opción "Compartir"
async function handleSessionShare() {
    const session = window.editingSession;
    if (session) {
        await window.showAlert(`Compartir sesión: "${session.title}"\n\n(La funcionalidad de compartir estará disponible próximamente)`, "Compartir");
    }
    // Cerrar el menú
    const menu = document.getElementById('editorOptionsMenu');
    if (menu) menu.classList.add('hidden');
}

// Manejar el inicio de sesión (botón "Iniciar sesión") - INICIA EL ENTRENAMIENTO
async function startSessionTracking() {
    const session = window.editingSession;
    if (session) {
        const routine = appData.routines.find(r => r.id === currentRoutineId);
        if (routine) {
            // Pasamos una COPIA del contenido para no modificar el original
            iniciarEntrenamiento({
                id: session.id,
                title: session.title,
                content: session.content, // Se clonará dentro de workout.js
                routineName: routine.name
            });
        } else {
            await window.showAlert("No se pudo iniciar el entrenamiento.", "Error");
        }
    }
}

/* ==========================================================================
   FLUJO DE TRABAJO DEL EDITOR INTEGRAL (MODOS LECTURA / EDICIÓN)
   ========================================================================== */

// Abrir una sesión creada en modo Lectura por defecto (forceEditMode = true para nuevas sesiones)
function openSessionEditor(sessionId, forceEditMode = false) {
    const routine = appData.routines.find(r => r.id === currentRoutineId);
    const session = routine.sessions.find(s => s.id === sessionId);

    window.editingSession = session;
    switchTab('editor');

    const editorUI = document.getElementById('session-editor-ui');
    
    // Contenedores elásticos correctamente anidados bajo el panel fijo
    editorUI.innerHTML = `
        <div class="editor-container">
            <div class="editor-sticky-header">
                <div class="editor-nav-top">
                    <button class="btn-nav-close" onclick="closeEditorAndReturn()" title="Cancelar">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                    
                    <button class="btn-nav-save" id="editorMainActionBtn">
                        <i class="fa-solid fa-pen"></i> Editar
                    </button>
                </div>

                <div class="editor-title-row">
                    <span class="session-label-prefix">Sesión:</span>
                    <input type="text" id="sessionTitleInput" class="session-input-field" value="${session.title.replace(/"/g, '&quot;')}" placeholder="Nombre de la sesión (ej: Pecho y Tríceps)" autocomplete="off" disabled>
                </div>

                ${forceEditMode ? `
                <div class="editor-tools-selectors" id="editorToolsSelectorsBar">
                    <button class="btn-tool-toggle" id="formatBtn" data-type="format" onclick="toggleSection('format')">
                        <i class="fa-solid fa-sliders"></i> Formato
                    </button>
                    <button class="btn-tool-toggle" id="exercisesBtn" data-type="exercises" onclick="toggleSection('exercises')">
                        <i class="fa-solid fa-dumbbell"></i> Ejercicios Gym
                    </button>
                </div>
                ` : `
                <div class="editor-tools-row">
                    <div class="editor-tools-selectors" id="editorToolsSelectorsBar">
                        <button class="btn-start-session" id="startSessionBtn" onclick="startSessionTracking()">
                            <i class="fa-solid fa-play"></i> Iniciar sesión
                        </button>
                    </div>
                    <div class="editor-options-wrapper">
                        <button class="btn-options-dots" id="editorOptionsBtn" onclick="toggleSessionOptionsMenu(event)">
                            <i class="fa-solid fa-ellipsis-vertical"></i>
                        </button>
                        <div class="editor-options-dropdown hidden" id="editorOptionsMenu" onclick="event.stopPropagation()">
                            <button class="editor-option-item" onclick="handleSessionHistory()">
                                <i class="fa-solid fa-clock-rotate-left"></i> Historial
                            </button>
                            <button class="editor-option-item" onclick="handleSessionShare()">
                                <i class="fa-solid fa-share-nodes"></i> Compartir
                            </button>
                        </div>
                    </div>
                </div>
                `}

                <div class="expandable-wrapper" id="toolbarWrapper">
                    <div id="toolbar-container">
                        <span class="ql-formats">
                            <button class="ql-bold"></button>
                            <button class="ql-italic"></button>
                            <button class="ql-underline"></button>
                        </span>
                        <span class="ql-formats">
                            <button class="ql-list" value="ordered"></button>
                            <button class="ql-list" value="bullet"></button>
                        </span>
                    </div>
                </div>

                <div class="expandable-wrapper" id="exercisesWrapper">
                    <div class="exercises-content">
                        <input type="search" class="search-input" id="searchExercise" placeholder="Busca un ejercicio..." oninput="filtrarEjercicios()" onsearch="filtrarEjercicios()">
                        <ul class="exercises-list" id="exercisesList"></ul>
                    </div>
                </div>
            </div>

            <div id="editor-instance"></div>
        </div>
    `;

    // Inicializamos la instancia Quill con el contenido original de la sesión
    initEditorInstance(session.content);

    const actionBtn = document.getElementById('editorMainActionBtn');

    if (forceEditMode) {
        // Si se fuerza el modo edición (caso de sesiones recién creadas)
        enableSessionEditing();
    } else {
        // Modo Lectura inicial: Bloqueamos la edición nativa de Quill inmediatamente
        if (window.quillInstance) {
            window.quillInstance.disable();
        }
        // Enlazamos el botón para activar la edición al pulsarlo
        actionBtn.onclick = enableSessionEditing;
    }
}

// Función quirúrgica para conmutar el editor a Modo Edición
function enableSessionEditing() {
    const actionBtn = document.getElementById('editorMainActionBtn');
    const titleInput = document.getElementById('sessionTitleInput');
    const toolsContainer = document.querySelector('.editor-tools-row');
    const editorStickyHeader = document.querySelector('.editor-sticky-header');

    if (!actionBtn || !window.quillInstance) return;

    actionBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Guardar`;
    
    // Cambiar la acción del clic para que ahora guarde los datos
    actionBtn.onclick = saveCurrentSession;

    // Desbloquear los elementos interactivos del DOM e inputs
    if (titleInput) titleInput.removeAttribute('disabled');
    
    // Reemplazar toda la fila de herramientas por los botones de formato y ejercicios
    if (toolsContainer && editorStickyHeader) {
        const newToolsHtml = `
            <div class="editor-tools-selectors" id="editorToolsSelectorsBar">
                <button class="btn-tool-toggle" id="formatBtn" data-type="format" onclick="toggleSection('format')">
                    <i class="fa-solid fa-sliders"></i> Formato
                </button>
                <button class="btn-tool-toggle" id="exercisesBtn" data-type="exercises" onclick="toggleSection('exercises')">
                    <i class="fa-solid fa-dumbbell"></i> Ejercicios Gym
                </button>
            </div>
        `;
        
        // Reemplazar el contenido del contenedor padre
        const oldRow = toolsContainer;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = newToolsHtml;
        const newToolsDiv = tempDiv.firstElementChild;
        oldRow.parentNode.replaceChild(newToolsDiv, oldRow);
    }

    // Desbloquear el editor de texto enriquecido Quill de forma nativa
    window.quillInstance.enable();
    window.quillInstance.focus();
}

// Guardar los datos de la sesión modificada y retornar AUTOMÁTICAMENTE a Modo Lectura
function saveCurrentSession() {
    if (!window.editingSession || !window.quillInstance) return;
    
    const inputTitulo = document.getElementById('sessionTitleInput');
    if (inputTitulo && inputTitulo.value.trim() !== "") {
        window.editingSession.title = inputTitulo.value.trim();
    } else {
        window.editingSession.title = "Sesión sin título";
    }
    
    window.editingSession.content = window.quillInstance.getSemanticHTML();
    window.editingSession.lastModified = Date.now();

    // Persistimos en LocalStorage de inmediato
    saveData();
    
    // Aseguramos el cierre de cualquier menú colapsable que estuviera abierto
    const activeBtn = document.querySelector('.btn-tool-toggle.active');
    if (activeBtn) {
        const type = activeBtn.getAttribute('data-type');
        toggleSection(type);
    }

    // RETORNO DE INTERFAZ A MODO LECTURA SIN CERRAR LA PANTALLA
    const actionBtn = document.getElementById('editorMainActionBtn');
    const titleInput = document.getElementById('sessionTitleInput');
    const editorStickyHeader = document.querySelector('.editor-sticky-header');

    if (actionBtn) {
        actionBtn.innerHTML = `<i class="fa-solid fa-pen"></i> Editar`;
        actionBtn.onclick = enableSessionEditing;
    }

    if (titleInput) titleInput.setAttribute('disabled', 'true');
    
    // Restaurar la estructura del modo lectura con el botón de tres puntos (sin bloqueo)
    if (editorStickyHeader) {
        const oldToolsSelectors = document.getElementById('editorToolsSelectorsBar');
        if (oldToolsSelectors) {
            const newToolsHtml = `
                <div class="editor-tools-row">
                    <div class="editor-tools-selectors" id="editorToolsSelectorsBar">
                        <button class="btn-start-session" id="startSessionBtn" onclick="startSessionTracking()">
                            <i class="fa-solid fa-play"></i> Iniciar sesión
                        </button>
                    </div>
                    <div class="editor-options-wrapper">
                        <button class="btn-options-dots" id="editorOptionsBtn" onclick="toggleSessionOptionsMenu(event)">
                            <i class="fa-solid fa-ellipsis-vertical"></i>
                        </button>
                        <div class="editor-options-dropdown hidden" id="editorOptionsMenu" onclick="event.stopPropagation()">
                            <button class="editor-option-item" onclick="handleSessionHistory()">
                                <i class="fa-solid fa-clock-rotate-left"></i> Historial
                            </button>
                            <button class="editor-option-item" onclick="handleSessionShare()">
                                <i class="fa-solid fa-share-nodes"></i> Compartir
                            </button>
                        </div>
                    </div>
                </div>
            `;
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = newToolsHtml;
            const newToolsRow = tempDiv.firstElementChild;
            oldToolsSelectors.parentNode.replaceChild(newToolsRow, oldToolsSelectors);
        }
    }

    if (window.quillInstance) {
        window.quillInstance.disable();
    }
}

function closeEditorAndReturn() {
    switchTab('plan');
    openRoutine(currentRoutineId);
}

function saveData() {
    localStorage.setItem('sharkAppData', JSON.stringify(appData));
}

renderRoutineList();