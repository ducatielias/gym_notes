// today-dashboard.js - Calendario y entrenamiento libre para la pantalla "Hoy"

// ==========================================================================
// VARIABLES GLOBALES
// ==========================================================================

let todayCalendarDate = new Date();
let todayDashboardInitialized = false;

// ==========================================================================
// FUNCIONES AUXILIARES
// ==========================================================================

function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getHistoryDB() {
    try {
        return JSON.parse(localStorage.getItem('sharkHistory')) || [];
    } catch (e) {
        return [];
    }
}

// ==========================================================================
// RENDERIZAR CALENDARIO
// ==========================================================================

function renderTodayCalendar() {
    const container = document.getElementById('today-calendar-container');
    if (!container) return;

    const year = todayCalendarDate.getFullYear();
    const month = todayCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();
    let offset = startWeekday === 0 ? 6 : startWeekday - 1;

    // Fecha actual para resaltar el día de hoy
    const today = new Date();
    const todayKey = formatLocalDate(today);

    let daysArray = [];

    // Días del mes anterior
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = offset; i > 0; i--) {
        const d = new Date(year, month - 1, prevMonthLastDay - i + 1);
        daysArray.push({ day: prevMonthLastDay - i + 1, currentMonth: false, date: d });
    }

    // Días del mes actual
    for (let i = 1; i <= lastDay.getDate(); i++) {
        const d = new Date(year, month, i);
        daysArray.push({ day: i, currentMonth: true, date: d });
    }

    // Días del mes siguiente
    const remaining = 42 - daysArray.length;
    for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month + 1, i);
        daysArray.push({ day: i, currentMonth: false, date: d });
    }

    const weekdays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

    // Obtener historial
    const historyDB = getHistoryDB();

    let html = `
        <div class="today-calendar-header">
            <button onclick="cambiarMesToday(-1)">&lt;</button>
            <span class="today-calendar-month-year">${firstDay.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
            <button onclick="cambiarMesToday(1)">&gt;</button>
        </div>
        <div class="today-calendar-weekdays">${weekdays.map(d => `<div>${d}</div>`).join('')}</div>
        <div class="today-calendar-days">
    `;

    daysArray.forEach(dayObj => {
        const day = dayObj.day;
        const isCurrentMonth = dayObj.currentMonth;
        const dateKey = formatLocalDate(dayObj.date);
        
        // Verificar si hay entrenamiento en esta fecha
        let hasWorkout = false;
        let workoutId = null;
        if (historyDB && historyDB.length > 0) {
            const found = historyDB.find(h => {
                const hDate = new Date(h.fecha);
                return formatLocalDate(hDate) === dateKey;
            });
            if (found) {
                hasWorkout = true;
                workoutId = found.id;
            }
        }

        // Verificar si es el día de hoy
        const isToday = dateKey === todayKey;

        let additionalClass = '';
        if (!isCurrentMonth) additionalClass = ' empty';
        if (hasWorkout && isCurrentMonth) additionalClass += ' has-workout';
        if (isToday && isCurrentMonth) additionalClass += ' today';

        // Si tiene entrenamiento, añadir onclick para ir al historial
        let clickHandler = '';
        if (hasWorkout && isCurrentMonth) {
            clickHandler = `onclick="irAlHistorialDesdeCalendario('${dateKey}')"`;
        }

        html += `<div class="today-calendar-day${additionalClass}" ${clickHandler}>${day}</div>`;
    });

    html += `</div>`;
    container.innerHTML = html;
}

// ==========================================================================
// IR AL HISTORIAL DESDE EL CALENDARIO
// ==========================================================================

function irAlHistorialDesdeCalendario(dateKey) {
    console.log('[today-dashboard] Buscando entrenamientos para la fecha:', dateKey);
    
    // Obtener el historial
    const historyDB = getHistoryDB();
    
    // Buscar todos los entrenamientos en esa fecha
    const entrenamientos = historyDB.filter(h => {
        const hDate = new Date(h.fecha);
        return formatLocalDate(hDate) === dateKey;
    });
    
    if (entrenamientos.length === 0) {
        console.warn('[today-dashboard] No hay entrenamientos en esta fecha');
        return;
    }
    
    console.log('[today-dashboard] Entrenamientos encontrados:', entrenamientos.length);
    
    // Cambiar a la pestaña de historial
    if (typeof window.switchTab === 'function') {
        window.switchTab('history');
    } else {
        // Fallback: cambiar directamente
        const historyScreen = document.getElementById('screen-history');
        if (historyScreen) {
            document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
            historyScreen.classList.remove('hidden');
        }
    }
    
    // Esperar a que el historial se renderice y luego expandir las tarjetas
    setTimeout(function() {
        // Obtener el contenedor de scroll del historial
        const historyContainer = document.getElementById('history-container');
        if (!historyContainer) {
            console.warn('[today-dashboard] history-container no encontrado');
            return;
        }
        
        // Obtener el contenedor de la pantalla (para el scroll)
        const historyScreen = document.getElementById('screen-history');
        if (!historyScreen) {
            console.warn('[today-dashboard] screen-history no encontrado');
            return;
        }
        
        // Array para almacenar las tarjetas encontradas
        let tarjetasEncontradas = [];
        
        // Recorrer todos los entrenamientos encontrados
        entrenamientos.forEach(entreno => {
            // Buscar la tarjeta por ID
            const cardId = entreno.id;
            const card = document.getElementById(`history-card-${cardId}`);
            
            if (card) {
                console.log('[today-dashboard] Expandiendo tarjeta:', cardId);
                tarjetasEncontradas.push(card);
            } else {
                // Intentar buscar por nombre de sesión como fallback
                const sessionTitle = entreno.nombre_sesion || entreno.nombre_rutina || '';
                if (sessionTitle) {
                    const allCards = document.querySelectorAll('.card-history');
                    allCards.forEach(c => {
                        const titleEl = c.querySelector('.card-history-title');
                        if (titleEl && titleEl.textContent === sessionTitle) {
                            console.log('[today-dashboard] Encontrada tarjeta por título:', sessionTitle);
                            tarjetasEncontradas.push(c);
                        }
                    });
                }
            }
        });
        
        // Si no se encontraron tarjetas, salir
        if (tarjetasEncontradas.length === 0) {
            console.warn('[today-dashboard] No se encontraron tarjetas para expandir');
            return;
        }
        
        // Expandir todas las tarjetas encontradas
        tarjetasEncontradas.forEach(card => {
            if (!card.classList.contains('expanded')) {
                card.classList.add('expanded');
                const body = card.querySelector('.card-history-body');
                if (body) {
                    body.style.maxHeight = body.scrollHeight + 60 + 'px';
                }
            }
        });
        
        // Usar scrollIntoView para la primera tarjeta
        const primeraTarjeta = tarjetasEncontradas[0];
        
        // Forzar un reflow para que las posiciones sean correctas
        void primeraTarjeta.offsetHeight;
        
        // Scroll a la tarjeta usando scrollIntoView
        primeraTarjeta.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
        });
        
    }, 500);
}

// ==========================================================================
// CAMBIAR MES
// ==========================================================================

function cambiarMesToday(delta) {
    todayCalendarDate.setMonth(todayCalendarDate.getMonth() + delta);
    renderTodayCalendar();
}

// ==========================================================================
// RENDERIZAR DASHBOARD DE "HOY"
// ==========================================================================

function renderTodayDashboard() {
    console.log('[today-dashboard] Renderizando dashboard...');
    
    const container = document.getElementById('screen-today');
    if (!container) {
        console.error('[today-dashboard] Contenedor screen-today no encontrado');
        return;
    }

    // Obtener el header existente
    const existingHeader = container.querySelector('.screen-header');
    const emptyState = container.querySelector('.empty-state');

    // Ocultar el empty state si existe (en lugar de eliminarlo)
    if (emptyState) {
        emptyState.style.display = 'none';
    }

    // Crear o actualizar el contenido del dashboard
    let dashboardContent = document.getElementById('today-dashboard-content');
    
    if (!dashboardContent) {
        // Si no existe, crearlo
        dashboardContent = document.createElement('div');
        dashboardContent.id = 'today-dashboard-content';
        
        // Insertar después del header o al principio
        if (existingHeader) {
            existingHeader.insertAdjacentElement('afterend', dashboardContent);
        } else {
            container.prepend(dashboardContent);
        }
    }

    // Obtener historial para ver si hay datos
    const historyDB = getHistoryDB();

    // Renderizar el contenido - PRIMERO EL BOTÓN, LUEGO EL CALENDARIO, LUEGO BOTONES DE IMPORTAR/EXPORTAR
    dashboardContent.innerHTML = `
        <!-- Botón Entrenamiento Libre -->
        <button class="btn-today-entrenamiento-libre" onclick="iniciarEntrenamientoLibreToday()">
            <i class="fa-solid fa-plus-circle"></i> Entrenamiento Libre
        </button>
        
        <!-- Calendario -->
        <div class="today-calendar-container" id="today-calendar-container"></div>
        
        <!-- Botones de Importar/Exportar Datos -->
        <div class="today-data-buttons-row">
            <button class="btn-today-data btn-today-data-import" onclick="openImportDataModal()">
                <i class="fa-solid fa-file-import"></i> Importar datos
            </button>
            <button class="btn-today-data btn-today-data-export" onclick="openExportDataModal()">
                <i class="fa-solid fa-file-export"></i> Exportar datos
            </button>
        </div>
        
        ${historyDB.length === 0 ? `
            <div class="today-empty-state">
                <i class="fa-solid fa-dumbbell"></i>
                <p>No tienes entrenamientos registrados aún.</p>
                <p style="font-size:13px; margin-top:4px;">Finaliza un entrenamiento para que aparezca en el calendario.</p>
            </div>
        ` : ''}
    `;

    renderTodayCalendar();
    
    console.log('[today-dashboard] Dashboard renderizado correctamente');
}

// ==========================================================================
// ENTRENAMIENTO LIBRE
// ==========================================================================

function iniciarEntrenamientoLibreToday() {
    console.log('[today-dashboard] Iniciando entrenamiento libre');
    
    // Verificar si existe la función de entrenamiento
    if (typeof window.iniciarEntrenamiento === 'function') {
        // Crear un objeto de sesión temporal para entrenamiento libre
        const sessionData = {
            id: 'free-' + Date.now(),
            title: 'Entrenamiento Libre',
            content: '<p>💪 Entrenamiento libre - Anota aquí tus ejercicios</p>',
            routineName: 'Entrenamiento Libre'
        };
        
        // Llamar a la función existente
        window.iniciarEntrenamiento(sessionData);
    } else {
        // Fallback: Mostrar el modal de entrenamiento directamente
        const modal = document.getElementById('active-workout');
        if (modal) {
            // Configurar el título
            const titleSpan = document.getElementById('aw-session-title');
            if (titleSpan) {
                titleSpan.textContent = 'Entrenamiento Libre';
            }
            
            // Mostrar el modal
            modal.style.display = 'flex';
            
            // Inicializar el editor si existe la función
            if (typeof window.inicializarEditorEntrenamiento === 'function') {
                setTimeout(function() {
                    window.inicializarEditorEntrenamiento();
                }, 100);
            }
            
            // Iniciar temporizador total
            if (typeof window.iniciarTotalTimer === 'function') {
                window.iniciarTotalTimer();
            }
        } else {
            alert('No se pudo iniciar el entrenamiento. El modal no está disponible.');
        }
    }
}

// ==========================================================================
// FUNCIÓN PARA INICIALIZAR EL DASHBOARD DESDE switchTab
// ==========================================================================

function initTodayDashboard() {
    // Verificar si la pantalla "today" está visible
    const todayScreen = document.getElementById('screen-today');
    if (todayScreen && !todayScreen.classList.contains('hidden')) {
        renderTodayDashboard();
        todayDashboardInitialized = true;
    }
}

// ==========================================================================
// INICIALIZACIÓN
// ==========================================================================

// Función para sobrescribir switchTab si no existe o para añadir el hook
function setupSwitchTabHook() {
    // Si existe switchTab, lo envolvemos
    if (typeof window.switchTab === 'function') {
        const originalSwitchTab = window.switchTab;
        window.switchTab = function(tabId) {
            // Llamar a la función original
            originalSwitchTab.call(this, tabId);
            
            // Si es la pestaña "today", renderizar el dashboard después de un breve delay
            if (tabId === 'today') {
                setTimeout(function() {
                    renderTodayDashboard();
                }, 100);
            }
        };
        console.log('[today-dashboard] switchTab hook configurado');
    } else {
        console.warn('[today-dashboard] switchTab no existe, se usará el observer');
    }
}

// Configurar MutationObserver para detectar cuando la pantalla "today" se hace visible
function setupVisibilityObserver() {
    const todayScreen = document.getElementById('screen-today');
    if (!todayScreen) {
        console.warn('[today-dashboard] screen-today no encontrado para el observer');
        return;
    }

    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const target = mutation.target;
                if (target.id === 'screen-today') {
                    const isHidden = target.classList.contains('hidden');
                    if (!isHidden && !todayDashboardInitialized) {
                        console.log('[today-dashboard] screen-today se hizo visible (observer)');
                        renderTodayDashboard();
                        todayDashboardInitialized = true;
                    } else if (!isHidden) {
                        // Si ya está inicializado, solo renderizar de nuevo
                        renderTodayDashboard();
                    }
                }
            }
        });
    });

    observer.observe(todayScreen, { attributes: true, attributeFilter: ['class'] });
    console.log('[today-dashboard] Observer configurado para screen-today');
}

// ==========================================================================
// INICIALIZAR AL CARGAR EL DOM
// ==========================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('[today-dashboard] DOMContentLoaded - Inicializando...');
    
    // Configurar el hook de switchTab
    setupSwitchTabHook();
    
    // Configurar el observer para detectar cambios de visibilidad
    setupVisibilityObserver();
    
    // Verificar si la pantalla "today" ya está visible al cargar
    setTimeout(function() {
        const todayScreen = document.getElementById('screen-today');
        if (todayScreen && !todayScreen.classList.contains('hidden')) {
            console.log('[today-dashboard] screen-today visible al cargar');
            renderTodayDashboard();
            todayDashboardInitialized = true;
        }
    }, 200);
});

// También ejecutar cuando el script se carga (por si el DOM ya está listo)
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('[today-dashboard] Script cargado en estado:', document.readyState);
    setTimeout(function() {
        const todayScreen = document.getElementById('screen-today');
        if (todayScreen && !todayScreen.classList.contains('hidden')) {
            renderTodayDashboard();
            todayDashboardInitialized = true;
        }
    }, 100);
}

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.renderTodayDashboard = renderTodayDashboard;
window.renderTodayCalendar = renderTodayCalendar;
window.cambiarMesToday = cambiarMesToday;
window.iniciarEntrenamientoLibreToday = iniciarEntrenamientoLibreToday;
window.irAlHistorialDesdeCalendario = irAlHistorialDesdeCalendario;
window.todayCalendarDate = todayCalendarDate;
window.initTodayDashboard = initTodayDashboard;