/**
 * MÓDULO: plan.js
 * PUNTO DE ENTRADA del módulo de Plan
 * Coordina el editor de sesiones (modos Lectura / Edición)
 */

// ==========================================================================
// VARIABLES GLOBALES DEL EDITOR
// ==========================================================================

window.editingSession = null;

// ==========================================================================
// FLUJO DE TRABAJO DEL EDITOR INTEGRAL (MODOS LECTURA / EDICIÓN)
// ==========================================================================

function openSessionEditor(sessionId, forceEditMode = false) {
    const routine = appData.routines.find(r => r.id === currentRoutineId);
    const session = routine.sessions.find(s => s.id === sessionId);

    window.editingSession = session;
    switchTab('editor');

    const editorUI = document.getElementById('session-editor-ui');
    
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

    initEditorInstance(session.content);

    const actionBtn = document.getElementById('editorMainActionBtn');

    if (forceEditMode) {
        enableSessionEditing();
    } else {
        if (window.quillInstance) {
            window.quillInstance.disable();
        }
        actionBtn.onclick = enableSessionEditing;
    }
}

function enableSessionEditing() {
    const actionBtn = document.getElementById('editorMainActionBtn');
    const titleInput = document.getElementById('sessionTitleInput');
    const toolsContainer = document.querySelector('.editor-tools-row');
    const editorStickyHeader = document.querySelector('.editor-sticky-header');

    if (!actionBtn || !window.quillInstance) return;

    actionBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Guardar`;
    actionBtn.onclick = saveCurrentSession;

    if (titleInput) titleInput.removeAttribute('disabled');
    
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
        
        const oldRow = toolsContainer;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = newToolsHtml;
        const newToolsDiv = tempDiv.firstElementChild;
        oldRow.parentNode.replaceChild(newToolsDiv, oldRow);
    }

    window.quillInstance.enable();
    window.quillInstance.focus();
}

function saveCurrentSession() {
    if (!window.editingSession || !window.quillInstance) return;
    
    const oldTitle = window.editingSession.title;
    const inputTitulo = document.getElementById('sessionTitleInput');
    let newTitle = oldTitle;
    
    if (inputTitulo && inputTitulo.value.trim() !== "") {
        newTitle = inputTitulo.value.trim();
        window.editingSession.title = newTitle;
    } else {
        window.editingSession.title = "Sesión sin título";
        newTitle = "Sesión sin título";
    }
    
    window.editingSession.content = window.quillInstance.getSemanticHTML();
    window.editingSession.lastModified = Date.now();

    // Persistimos en LocalStorage de inmediato
    saveData();
    
    // ACTUALIZAR EL HISTORIAL: Si el título de la sesión cambió, actualizar los registros del historial
    if (oldTitle !== newTitle) {
        try {
            let historyDB = JSON.parse(localStorage.getItem('sharkHistory')) || [];
            let actualizados = 0;
            
            // Buscar la rutina actual para obtener su nombre
            const routine = appData.routines.find(r => r.id === currentRoutineId);
            const routineName = routine ? routine.name : '';
            
            historyDB = historyDB.map(record => {
                // Coincidir por nombre_sesion y nombre_rutina para mayor precisión
                if (record.nombre_sesion === oldTitle && record.nombre_rutina === routineName) {
                    actualizados++;
                    return { ...record, nombre_sesion: newTitle };
                }
                return record;
            });
            
            localStorage.setItem('sharkHistory', JSON.stringify(historyDB));
            
            if (window.historyDB !== undefined) {
                window.historyDB = historyDB;
            }
            
            console.log(`[saveCurrentSession] Historial actualizado: ${actualizados} registros modificados de "${oldTitle}" a "${newTitle}"`);
        } catch (error) {
            console.error('[saveCurrentSession] Error actualizando el historial:', error);
        }
    }
    
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

// ==========================================================================
// INICIALIZACIÓN
// ==========================================================================

// Renderizar la lista de rutinas al cargar
renderRoutineList();

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.openSessionEditor = openSessionEditor;
window.enableSessionEditing = enableSessionEditing;
window.saveCurrentSession = saveCurrentSession;
window.closeEditorAndReturn = closeEditorAndReturn;