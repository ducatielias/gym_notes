/**
 * MÓDULO: history.js
 * PUNTO DE ENTRADA del módulo de Historial
 * Coordina la inicialización y las funciones de integración con el entrenamiento
 * 
 * MODIFICADO: Añadido botón "Editar" en el detalle del historial
 */

// ==========================================================================
// INICIALIZACIÓN
// ==========================================================================

function initHistoryPage() {
    renderHistory();
}

// ==========================================================================
// FUNCIONES DE INTEGRACIÓN CON EL ENTRENAMIENTO
// ==========================================================================

function mostrarHistorialEntrenamientoActual() {
    console.log('[mostrarHistorialEntrenamientoActual] Iniciando...');
    
    // Verificar si hay entrenamiento activo
    if (!aw_currentWorkout) {
        console.warn('[mostrarHistorialEntrenamientoActual] No hay entrenamiento activo');
        // Intentar recuperar desde el modal
        const modal = document.getElementById('active-workout');
        if (modal && modal.style.display === 'flex') {
            // Si el modal está visible pero aw_currentWorkout es null, intentamos obtener el título del modal
            const titleSpan = document.getElementById('aw-session-title');
            if (titleSpan) {
                const titleText = titleSpan.innerText;
                console.log('[mostrarHistorialEntrenamientoActual] Título desde el modal:', titleText);
                // Extraer nombre de la sesión y rutina del título
                const parts = titleText.split(' - ');
                if (parts.length === 2) {
                    const routineName = parts[0] || '';
                    const sessionTitle = parts[1] || '';
                    
                    if (sessionTitle && routineName) {
                        // Guardar origen y aplicar filtros
                        historyReturnScreen = 'workout';
                        window.historyReturnScreen = 'workout';
                        historySearchTerm = sessionTitle;
                        window.historySearchTerm = sessionTitle;
                        historyRoutineFilter = routineName;
                        window.historyRoutineFilter = routineName;
                        historyOriginalRoutineFilter = routineName;
                        window.historyOriginalRoutineFilter = routineName;
                        
                        // OCULTAR EL MODAL DE ENTRENAMIENTO
                        if (modal) {
                            modal.style.display = 'none';
                        }
                        
                        // Navegar al historial
                        switchTab('history');
                        
                        setTimeout(() => {
                            const input = document.getElementById('historySearchInput');
                            if (input) {
                                input.value = sessionTitle;
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                            const routineSelect = document.getElementById('historyRoutineFilterSelect');
                            if (routineSelect) {
                                routineSelect.value = routineName;
                            }
                            updateHistoryClearButton();
                            renderHistory();
                        }, 100);
                        return;
                    }
                }
            }
        }
        window.showAlert('No hay entrenamiento activo para mostrar el historial.', 'Aviso');
        return;
    }
    
    const sessionTitle = aw_currentWorkout.sessionTitle;
    const routineName = aw_currentWorkout.routineName;
    console.log('[mostrarHistorialEntrenamientoActual] Buscando sesión:', sessionTitle, 'en rutina:', routineName);
    
    // Guardar origen para el botón de retroceso
    historyReturnScreen = 'workout';
    window.historyReturnScreen = 'workout';
    
    // Guardar el nombre de la rutina para filtrar
    historyOriginalRoutineFilter = routineName;
    window.historyOriginalRoutineFilter = routineName;
    
    // Establecer el filtro de búsqueda por nombre de sesión
    historySearchTerm = sessionTitle;
    window.historySearchTerm = sessionTitle;
    
    // Establecer el filtro de rutina
    historyRoutineFilter = routineName;
    window.historyRoutineFilter = routineName;
    
    // ============================================================
    // SOLUCIÓN DEFINITIVA: OCULTAR EL MODAL DE ENTRENAMIENTO
    // ============================================================
    const workoutModal = document.getElementById('active-workout');
    if (workoutModal) {
        workoutModal.style.display = 'none';
        console.log('[mostrarHistorialEntrenamientoActual] Modal de entrenamiento ocultado');
    }
    // ============================================================
    
    // Navegar a la pantalla de historial
    switchTab('history');
    
    // Esperar a que el DOM se renderice y luego aplicar el filtro
    setTimeout(() => {
        const input = document.getElementById('historySearchInput');
        if (input) {
            input.value = sessionTitle;
            console.log('[mostrarHistorialEntrenamientoActual] Input actualizado:', input.value);
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        // Actualizar el select de rutinas
        const routineSelect = document.getElementById('historyRoutineFilterSelect');
        if (routineSelect) {
            routineSelect.value = routineName;
        }
        
        // Actualizar el botón de limpiar
        updateHistoryClearButton();
        
        // Renderizar el historial con los filtros aplicados
        renderHistory();
        
        console.log('[mostrarHistorialEntrenamientoActual] Filtros aplicados - Sesión:', historySearchTerm, 'Rutina:', historyRoutineFilter);
    }, 100);
}

function cerrarModalHistorialEntrenoActual() {
    console.log('[cerrarModalHistorialEntrenoActual] Cerrando modal de historial');
    
    // Limpiar los filtros
    resetHistoryFilters();
    
    // Limpiar el input visualmente
    const input = document.getElementById('historySearchInput');
    if (input) {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    // Actualizar el select de rutinas
    const routineSelect = document.getElementById('historyRoutineFilterSelect');
    if (routineSelect) {
        routineSelect.value = 'todos';
    }
    
    // Actualizar el botón de limpiar
    updateHistoryClearButton();
    
    // Renderizar el historial sin filtros
    renderHistory();
    
    console.log('[cerrarModalHistorialEntrenoActual] Filtros limpiados, historial renderizado');
}

function goBackFromHistory() {
    console.log('[goBackFromHistory] Volviendo a la pantalla anterior, origen:', historyReturnScreen);
    
    if (historyReturnScreen === 'workout') {
        // Volver al entrenamiento activo
        const modal = document.getElementById('active-workout');
        if (modal) {
            modal.style.display = 'flex';
            console.log('[goBackFromHistory] Modal de entrenamiento restaurado');
        }
        // Ocultar el menú inferior
        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav) bottomNav.classList.add('hidden-nav');
        // Limpiar los filtros
        resetHistoryFilters();
    } else if (historyReturnScreen === 'session') {
        // Volver a la sesión específica que se estaba viendo
        const sessionId = window.historySessionId;
        const routineId = window.historyRoutineId;
        
        console.log('[goBackFromHistory] Restaurando sesión - ID:', sessionId, 'Rutina ID:', routineId);
        
        // Limpiar los filtros
        resetHistoryFilters();
        
        // Volver a la pantalla de plan
        switchTab('plan');
        
        // Restaurar la rutina y abrir la sesión específica
        if (routineId && sessionId) {
            // Establecer la rutina actual
            currentRoutineId = routineId;
            // Abrir la rutina para mostrar el contexto
            openRoutine(routineId);
            // Luego abrir el editor de la sesión específica
            setTimeout(() => {
                openSessionEditor(sessionId);
            }, 150);
        } else if (currentRoutineId) {
            // Fallback: si no tenemos los IDs guardados, usar los que tenemos
            openRoutine(currentRoutineId);
        } else {
            renderRoutineList();
        }
    } else {
        // Si no hay origen, volver a la pantalla de inicio
        resetHistoryFilters();
        switchTab('today');
    }
}

// ==========================================================================
// VER DETALLES DEL HISTORIAL (pantalla completa)
// ==========================================================================

function viewHistoryDetail(id) {
    const item = getHistoryRecord(id);
    if (!item) {
        window.showAlert('Registro no encontrado.', 'Error');
        return;
    }

    historyViewingItem = item;
    
    const container = document.getElementById('history-detail-ui');
    if (!container) return;

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
    
    const contenidoEditado = item.contenido_editado || 'Sin anotaciones';
    const contenidoOriginal = item.contenido_original || 'Sin contenido original';
    const itemIdHandler = GymNotesSafe.escapeInlineHandlerArgument(item.id);
    const sessionName = GymNotesSafe.escapeText(item.nombre_sesion || 'Sesión sin título');
    const routineName = GymNotesSafe.escapeText(item.nombre_rutina || 'Sin rutina');

    container.innerHTML = `
        <div class="history-detail-container">
            <div class="history-detail-sticky-header">
                <div class="history-detail-nav-top">
                    <button class="btn-history-detail-close" onclick="closeHistoryDetail()" title="Volver">
                        <i class="fa-solid fa-chevron-left"></i>
                    </button>
                    <button class="btn-history-detail-edit" onclick="openHistoryEditFromDetail('${itemIdHandler}')" title="Editar">
                        <i class="fa-solid fa-pen"></i> Editar
                    </button>
                </div>

                <div class="history-detail-title-row">
                    <span class="history-detail-prefix">Entrenamiento</span>
                    <div class="history-detail-title">${sessionName}</div>
                    <div class="history-detail-meta">
                        <i class="fa-regular fa-calendar"></i> ${fechaFormateada} · ${horaFormateada}
                        &nbsp;·&nbsp;
                        <i class="fa-regular fa-clock"></i> ${duracionTexto}
                        &nbsp;·&nbsp;
                        <i class="fa-solid fa-dumbbell"></i> ${routineName}
                    </div>
                </div>
            </div>

            <div class="history-detail-body">
                <div class="history-detail-content">
                    ${linkifyHistoryHTML(contenidoEditado)}
                </div>
                
                ${item.contenido_original && item.contenido_original !== item.contenido_editado ? `
                    <div class="history-detail-original">
                        <div class="history-detail-original-label">
                            <i class="fa-solid fa-file-lines"></i> Contenido original de la sesión
                        </div>
                        <div class="history-detail-original-content">
                            ${linkifyHistoryHTML(contenidoOriginal)}
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    switchTab('history-detail');
}

function closeHistoryDetail() {
    historyViewingItem = null;
    switchTab('history');
    renderHistory();
}

// ==========================================================================
// FUNCIÓN PARA ABRIR EDICIÓN DESDE EL DETALLE (INTEGRACIÓN)
// ==========================================================================

function openHistoryEditFromDetail(id) {
    // Llamar a la función del módulo history-edit.js
    if (typeof window.openHistoryEdit === 'function') {
        window.openHistoryEdit(id);
    } else {
        console.error('[history.js] openHistoryEdit no está disponible');
        window.showAlert('Error: El módulo de edición no está disponible.', 'Error');
    }
}

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.initHistoryPage = initHistoryPage;
window.mostrarHistorialEntrenamientoActual = mostrarHistorialEntrenamientoActual;
window.cerrarModalHistorialEntrenoActual = cerrarModalHistorialEntrenoActual;
window.goBackFromHistory = goBackFromHistory;
window.viewHistoryDetail = viewHistoryDetail;
window.closeHistoryDetail = closeHistoryDetail;
window.openHistoryEditFromDetail = openHistoryEditFromDetail;
