// today-dashboard.js - Calendario y entrenamiento libre para la pantalla "Hoy"
// MODIFICADO: Se añade icono de la app en el header, antes del título.
// MODIFICADO: Asegurado line-height:1 en el título para alinear con el icono.

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

    const today = new Date();
    const todayKey = formatLocalDate(today);

    let daysArray = [];

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = offset; i > 0; i--) {
        const d = new Date(year, month - 1, prevMonthLastDay - i + 1);
        daysArray.push({ day: prevMonthLastDay - i + 1, currentMonth: false, date: d });
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
        const d = new Date(year, month, i);
        daysArray.push({ day: i, currentMonth: true, date: d });
    }

    const remaining = 42 - daysArray.length;
    for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month + 1, i);
        daysArray.push({ day: i, currentMonth: false, date: d });
    }

    const weekdays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
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

        const isToday = dateKey === todayKey;

        let additionalClass = '';
        if (!isCurrentMonth) additionalClass = ' empty';
        if (hasWorkout && isCurrentMonth) additionalClass += ' has-workout';
        if (isToday && isCurrentMonth) additionalClass += ' today';

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
    
    const historyDB = getHistoryDB();
    const entrenamientos = historyDB.filter(h => {
        const hDate = new Date(h.fecha);
        return formatLocalDate(hDate) === dateKey;
    });
    
    if (entrenamientos.length === 0) {
        console.warn('[today-dashboard] No hay entrenamientos en esta fecha');
        return;
    }
    
    console.log('[today-dashboard] Entrenamientos encontrados:', entrenamientos.length);
    
    if (typeof window.switchTab === 'function') {
        window.switchTab('history');
    } else {
        const historyScreen = document.getElementById('screen-history');
        if (historyScreen) {
            document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
            historyScreen.classList.remove('hidden');
        }
    }
    
    setTimeout(function() {
        const historyContainer = document.getElementById('history-container');
        if (!historyContainer) {
            console.warn('[today-dashboard] history-container no encontrado');
            return;
        }
        
        const historyScreen = document.getElementById('screen-history');
        if (!historyScreen) {
            console.warn('[today-dashboard] screen-history no encontrado');
            return;
        }
        
        let tarjetasEncontradas = [];
        
        entrenamientos.forEach(entreno => {
            const cardId = entreno.id;
            const card = document.getElementById(`history-card-${cardId}`);
            if (card) {
                console.log('[today-dashboard] Expandiendo tarjeta:', cardId);
                tarjetasEncontradas.push(card);
            } else {
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
        
        if (tarjetasEncontradas.length === 0) {
            console.warn('[today-dashboard] No se encontraron tarjetas para expandir');
            return;
        }
        
        tarjetasEncontradas.forEach(card => {
            if (!card.classList.contains('expanded')) {
                card.classList.add('expanded');
                const body = card.querySelector('.card-history-body');
                if (body) {
                    body.style.maxHeight = body.scrollHeight + 60 + 'px';
                }
            }
        });
        
        const primeraTarjeta = tarjetasEncontradas[0];
        void primeraTarjeta.offsetHeight;
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
// MANEJAR SALIDA DE LA APP (CON CONFIRMACIÓN)
// ==========================================================================

async function handleSalirApp() {
    const confirmado = await window.showConfirm(
        '¿Estás seguro de que quieres salir de Gym Notes?',
        'Salir de la app'
    );
    if (confirmado) {
        try {
            window.close();
        } catch (e) {
            document.body.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:100vh; font-size:24px; color:#374151;">👋 ¡Hasta luego!</div>';
        }
    }
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

    // Crear o actualizar el header con el botón de opciones
    let header = container.querySelector('.screen-header');
    if (!header) {
        header = document.createElement('header');
        header.className = 'screen-header';
        container.prepend(header);
    }

    // Añadir el botón de opciones y el menú si no existen
    let optionsBtn = header.querySelector('.btn-today-options');
    if (!optionsBtn) {
        header.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="icons/icon-192x192.png" 
                         alt="Gym Notes" 
                         style="height: 32px; width: 32px; border-radius: 8px;"
                         onerror="this.style.display='none'">
                    <h1 style="font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin: 0; line-height: 1;">Gym Notes</h1>
                </div>
                <div style="position: relative;">
                    <button class="btn-today-options" style="background: none; border: none; color: #9ca3af; font-size: 20px; padding: 8px 10px; cursor: pointer; border-radius: 50%; transition: background 0.15s ease, color 0.15s ease;">
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                    <div class="today-options-menu hidden" style="position: absolute; top: 45px; right: 0; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 14px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); width: 160px; z-index: 200; display: flex; flex-direction: column; padding: 6px;">
                        <button class="today-menu-item" data-action="salir" style="background: none; border: none; padding: 10px 12px; text-align: left; font-size: 14px; font-weight: 600; color: #ef4444; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 10px; width: 100%;">
                            <i class="fa-solid fa-right-from-bracket" style="color: #ef4444;"></i> Salir
                        </button>
                    </div>
                </div>
            </div>
        `;
        // Asignar eventos
        const btn = header.querySelector('.btn-today-options');
        const menu = header.querySelector('.today-options-menu');
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('hidden');
        });
        document.addEventListener('click', () => {
            menu.classList.add('hidden');
        });
        const salirBtn = header.querySelector('.today-menu-item[data-action="salir"]');
        salirBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.add('hidden');
            handleSalirApp();
        });
    }

    // Ocultar el empty state si existe
    const emptyState = container.querySelector('.empty-state');
    if (emptyState) emptyState.style.display = 'none';

    // Crear o actualizar el contenido del dashboard
    let dashboardContent = document.getElementById('today-dashboard-content');
    if (!dashboardContent) {
        dashboardContent = document.createElement('div');
        dashboardContent.id = 'today-dashboard-content';
        if (header) {
            header.insertAdjacentElement('afterend', dashboardContent);
        } else {
            container.prepend(dashboardContent);
        }
    }

    const historyDB = getHistoryDB();

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
    
    if (typeof window.iniciarEntrenamiento === 'function') {
        const sessionData = {
            id: 'free-' + Date.now(),
            title: 'Entrenamiento Libre',
            content: '<p>💪 Entrenamiento libre - Anota aquí tus ejercicios</p>',
            routineName: 'Entrenamiento Libre'
        };
        window.iniciarEntrenamiento(sessionData);
    } else {
        const modal = document.getElementById('active-workout');
        if (modal) {
            const titleSpan = document.getElementById('aw-session-title');
            if (titleSpan) {
                titleSpan.textContent = 'Entrenamiento Libre';
            }
            modal.style.display = 'flex';
            if (typeof window.inicializarEditorEntrenamiento === 'function') {
                setTimeout(function() {
                    window.inicializarEditorEntrenamiento();
                }, 100);
            }
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
    const todayScreen = document.getElementById('screen-today');
    if (todayScreen && !todayScreen.classList.contains('hidden')) {
        renderTodayDashboard();
        todayDashboardInitialized = true;
    }
}

// ==========================================================================
// INICIALIZACIÓN
// ==========================================================================

function setupSwitchTabHook() {
    if (typeof window.switchTab === 'function') {
        const originalSwitchTab = window.switchTab;
        window.switchTab = function(tabId) {
            originalSwitchTab.call(this, tabId);
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
    setupSwitchTabHook();
    setupVisibilityObserver();
    setTimeout(function() {
        const todayScreen = document.getElementById('screen-today');
        if (todayScreen && !todayScreen.classList.contains('hidden')) {
            console.log('[today-dashboard] screen-today visible al cargar');
            renderTodayDashboard();
            todayDashboardInitialized = true;
        }
    }, 200);
});

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
window.initTodayDashboard = initTodayDashboard;
window.handleSalirApp = handleSalirApp;
window.todayCalendarDate = todayCalendarDate;