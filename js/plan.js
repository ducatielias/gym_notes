/**
 * MÓDULO: plan.js
 * PUNTO DE ENTRADA del módulo de Plan
 * Coordina el editor de sesiones (modos Lectura / Edición)
 * 
 * MODIFICADO: El título de la sesión ahora usa textarea para mostrar
 * títulos largos completos con ajuste automático de altura.
 */

// ==========================================================================
// VARIABLES GLOBALES DEL EDITOR
// ==========================================================================

window.editingSession = null;

// ==========================================================================
// FUNCIÓN PARA AJUSTAR LA ALTURA DEL TEXTAREA DEL TÍTULO
// ==========================================================================

function ajustarAlturaTitulo() {
    const textarea = document.getElementById('sessionTitleInput');
    if (!textarea) return;
    
    // Resetear la altura para obtener el scrollHeight correcto
    textarea.style.height = 'auto';
    // Establecer la altura al scrollHeight (con un pequeño padding extra)
    textarea.style.height = (textarea.scrollHeight + 2) + 'px';
}

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
                    <textarea id="sessionTitleInput" class="session-input-field" placeholder="Nombre de la sesión (ej: Pecho y Tríceps)" autocomplete="off" readonly>${GymNotesSafe.escapeText(session.title)}</textarea>
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
    
    // ============================================================
    // AJUSTAR ALTURA DEL TEXTAREA DEL TÍTULO AUTOMÁTICAMENTE
    // ============================================================
    setTimeout(function() {
        ajustarAlturaTitulo();
        const titleInput = document.getElementById('sessionTitleInput');
        if (titleInput) {
            titleInput.addEventListener('input', ajustarAlturaTitulo);
        }
    }, 50);
}

function enableSessionEditing() {
    const actionBtn = document.getElementById('editorMainActionBtn');
    const titleInput = document.getElementById('sessionTitleInput');
    const toolsContainer = document.querySelector('.editor-tools-row');
    const editorStickyHeader = document.querySelector('.editor-sticky-header');

    if (!actionBtn || !window.quillInstance) return;

    actionBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Guardar`;
    actionBtn.onclick = saveCurrentSession;

    if (titleInput) {
        titleInput.removeAttribute('readonly');
        titleInput.focus();
        // Seleccionar todo el texto para facilitar la edición
        titleInput.select();
        // Ajustar altura después de quitar readonly
        setTimeout(ajustarAlturaTitulo, 10);
    }
    
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
    } else {
        newTitle = "Sesión sin título";
    }
    
    const newContent = window.quillInstance.getSemanticHTML();
    const newLastModified = Date.now();
    let currentHistory;
    let nextAppData;
    let nextHistory;
    let nextEditingSession;
    let actualizados = 0;

    try {
        currentHistory = getHistory();

        if (appDataPersistenceBlocked || historyDataPersistenceBlocked) {
            return {
                ok: false,
                status: 'persistence-blocked',
                key: appDataPersistenceBlocked ? APP_DATA_STORAGE_KEY : HISTORY_STORAGE_KEY,
                cause: appDataPersistenceBlocked ? appDataStorageIssue : historyDataStorageIssue,
                storageState: 'unchanged'
            };
        }

        const currentRoutine = appData.routines.find(routine => routine.id === currentRoutineId);
        const routineName = currentRoutine ? currentRoutine.name : '';
        const sessionBeingEdited = window.editingSession;

        // Mantener los estados originales intactos hasta que las dos claves se
        // hayan persistido; solo se copian la rutina y la sesión modificadas.
        nextAppData = {
            ...appData,
            routines: appData.routines.map(routine => {
                if (routine.id !== currentRoutineId) return routine;

                return {
                    ...routine,
                    sessions: routine.sessions.map(session => {
                        if (session !== sessionBeingEdited) return session;

                        nextEditingSession = {
                            ...session,
                            title: newTitle,
                            content: newContent,
                            lastModified: newLastModified
                        };
                        return nextEditingSession;
                    })
                };
            })
        };

        if (!nextEditingSession) {
            return {
                ok: false,
                status: GymNotesStorage.STATUS.INVALID_OPERATION,
                error: 'La sesión en edición ya no pertenece a la rutina actual.',
                storageState: 'unchanged'
            };
        }

        if (oldTitle !== newTitle) {
            nextHistory = currentHistory.map(record => {
                // Conserva el criterio anterior: título previo y rutina actual.
                if (record.nombre_sesion === oldTitle && record.nombre_rutina === routineName) {
                    actualizados++;
                    return { ...record, nombre_sesion: newTitle };
                }
                return record;
            });
        }

        const appDataValidation = validateAppDataStructure(nextAppData);
        if (!appDataValidation.valid) {
            return {
                ok: false,
                status: appDataValidation.status,
                key: APP_DATA_STORAGE_KEY,
                validation: appDataValidation,
                storageState: 'unchanged'
            };
        }

        if (actualizados > 0) {
            const historyValidation = validateHistoryDataStructure(nextHistory);
            if (!historyValidation.valid) {
                return {
                    ok: false,
                    status: historyValidation.status,
                    key: HISTORY_STORAGE_KEY,
                    validation: historyValidation,
                    storageState: 'unchanged'
                };
            }
        }

        const changes = [{
            key: APP_DATA_STORAGE_KEY,
            value: nextAppData,
            schema: { type: 'object', requiredKeys: ['routines'] }
        }];

        if (actualizados > 0) {
            changes.push({
                key: HISTORY_STORAGE_KEY,
                value: nextHistory,
                schema: { type: 'array' }
            });
        }

        const preparedChanges = GymNotesStorage.prepareJsonChanges(changes);
        if (!preparedChanges.ok) {
            return preparedChanges;
        }

        const persistenceResult = GymNotesStorage.applyPreparedChanges(preparedChanges);
        if (!persistenceResult.ok) {
            console.error('[saveCurrentSession] Error actualizando el historial:', persistenceResult);
            return persistenceResult;
        }

        appData.routines = nextAppData.routines;
        window.appData = appData;
        window.editingSession = nextEditingSession;

        if (actualizados > 0) {
            currentHistory.splice(0, currentHistory.length, ...nextHistory);
            window.historyDB = currentHistory;
        }
    } catch (error) {
        console.error('[saveCurrentSession] Error actualizando el historial:', error);
        return { ok: false, status: 'persistence-error', error: error instanceof Error ? error.message : String(error) };
    }

    if (oldTitle !== newTitle) {
        console.log(`[saveCurrentSession] Historial actualizado: ${actualizados} registros modificados de "${oldTitle}" a "${newTitle}"`);
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

    if (titleInput) {
        titleInput.setAttribute('readonly', 'true');
        // Ajustar altura después de poner readonly
        setTimeout(ajustarAlturaTitulo, 10);
    }
    
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
    // Limpiar los IDs guardados para el historial
    window.historySessionId = null;
    window.historyRoutineId = null;
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
window.ajustarAlturaTitulo = ajustarAlturaTitulo;
