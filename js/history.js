/**
 * MÓDULO: history.js
 * PUNTO DE ENTRADA del módulo de Historial
 * Coordina la inicialización y las funciones de integración con el entrenamiento
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
    if (!aw_currentWorkout) {
        console.log('No hay entrenamiento activo');
        return;
    }
    
    const sessionTitle = aw_currentWorkout.sessionTitle;
    console.log('[mostrarHistorialEntrenamientoActual] Buscando sesión:', sessionTitle);
    
    // Guardar origen para el botón de retroceso
    historyReturnScreen = 'workout';
    window.historyReturnScreen = 'workout';
    
    // Establecer el filtro de búsqueda
    historySearchTerm = sessionTitle;
    window.historySearchTerm = historySearchTerm;
    
    // Navegar a la pantalla de historial
    switchTab('history');
    
    // Esperar a que el DOM se renderice y luego aplicar el filtro
    setTimeout(() => {
        const input = document.getElementById('historySearchInput');
        if (input) {
            input.value = sessionTitle;
            console.log('[mostrarHistorialEntrenamientoActual] Input actualizado:', input.value);
            // Forzar el evento input para que los listeners se activen
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        // Actualizar el botón de limpiar
        updateHistoryClearButton();
        
        // Renderizar el historial con el filtro aplicado
        renderHistory();
        
        console.log('[mostrarHistorialEntrenamientoActual] Filtro aplicado:', historySearchTerm);
    }, 100);
}

function cerrarModalHistorialEntrenoActual() {
    console.log('[cerrarModalHistorialEntrenoActual] Cerrando modal de historial');
    
    // Limpiar el filtro de búsqueda
    historySearchTerm = '';
    window.historySearchTerm = '';
    historyReturnScreen = null;
    window.historyReturnScreen = null;
    
    // Limpiar el input visualmente
    const input = document.getElementById('historySearchInput');
    if (input) {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    // Actualizar el botón de limpiar
    updateHistoryClearButton();
    
    // Renderizar el historial sin filtro
    renderHistory();
    
    console.log('[cerrarModalHistorialEntrenoActual] Filtro limpiado, historial renderizado');
}

function goBackFromHistory() {
    console.log('[goBackFromHistory] Volviendo a la pantalla anterior, origen:', historyReturnScreen);
    
    if (historyReturnScreen === 'workout') {
        // Volver al entrenamiento activo
        const modal = document.getElementById('active-workout');
        if (modal) {
            modal.style.display = 'flex';
        }
        // Ocultar el menú inferior
        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav) bottomNav.classList.add('hidden-nav');
        // Limpiar el filtro para no dejar rastro
        historySearchTerm = '';
        window.historySearchTerm = '';
        historyReturnScreen = null;
        window.historyReturnScreen = null;
    } else if (historyReturnScreen === 'session') {
        // Volver a la sesión (pantalla de edición)
        historyReturnScreen = null;
        window.historyReturnScreen = null;
        // Limpiar el filtro
        historySearchTerm = '';
        window.historySearchTerm = '';
        // Volver a la pantalla de plan (donde estaba la sesión)
        switchTab('plan');
        // Reabrir la rutina actual para mostrar las sesiones
        if (currentRoutineId) {
            openRoutine(currentRoutineId);
        } else {
            renderRoutineList();
        }
    } else {
        // Si no hay origen, volver a la pantalla de inicio
        historyReturnScreen = null;
        window.historyReturnScreen = null;
        historySearchTerm = '';
        window.historySearchTerm = '';
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

    container.innerHTML = `
        <div class="history-detail-container">
            <div class="history-detail-sticky-header">
                <div class="history-detail-nav-top">
                    <button class="btn-history-detail-close" onclick="closeHistoryDetail()" title="Volver">
                        <i class="fa-solid fa-chevron-left"></i>
                    </button>
                </div>

                <div class="history-detail-title-row">
                    <span class="history-detail-prefix">Entrenamiento</span>
                    <div class="history-detail-title">${item.nombre_sesion || 'Sesión sin título'}</div>
                    <div class="history-detail-meta">
                        <i class="fa-regular fa-calendar"></i> ${fechaFormateada} · ${horaFormateada}
                        &nbsp;·&nbsp;
                        <i class="fa-regular fa-clock"></i> ${duracionTexto}
                        &nbsp;·&nbsp;
                        <i class="fa-solid fa-dumbbell"></i> ${item.nombre_rutina || 'Sin rutina'}
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
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.initHistoryPage = initHistoryPage;
window.mostrarHistorialEntrenamientoActual = mostrarHistorialEntrenamientoActual;
window.cerrarModalHistorialEntrenoActual = cerrarModalHistorialEntrenoActual;
window.goBackFromHistory = goBackFromHistory;
window.viewHistoryDetail = viewHistoryDetail;
window.closeHistoryDetail = closeHistoryDetail;