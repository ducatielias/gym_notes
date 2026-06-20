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
    
    // Establecer filtro para mostrar solo esta sesión
    historySearchTerm = sessionTitle;
    
    // Navegar a la pantalla de historial
    switchTab('history');
    
    // Esperar a que se renderice y luego aplicar el filtro
    setTimeout(() => {
        const input = document.getElementById('historySearchInput');
        if (input) {
            input.value = sessionTitle;
            updateHistoryClearButton();
        }
        renderHistory();
    }, 50);
}

function cerrarModalHistorialEntrenoActual() {
    // Limpiar el filtro y volver al entrenamiento
    historySearchTerm = '';
    const input = document.getElementById('historySearchInput');
    if (input) {
        input.value = '';
        updateHistoryClearButton();
    }
    // Volver al entrenamiento (si está visible)
    const modal = document.getElementById('active-workout');
    if (modal && modal.style.display !== 'none') {
        // Ya estamos en el entrenamiento, solo recargamos la vista
        renderHistory();
    } else {
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
window.viewHistoryDetail = viewHistoryDetail;
window.closeHistoryDetail = closeHistoryDetail;