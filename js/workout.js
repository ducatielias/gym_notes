/**
 * MÓDULO: workout.js
 * Gestiona el entrenamiento activo: temporizadores, editor Quill en modo edición,
 * guardado en historial y visualización del historial de la sesión.
 * Incluye botones de Formato y Ejercicios Gym.
 */

// ==================== VARIABLES GLOBALES ====================
let aw_currentWorkout = null;          // Datos del entrenamiento actual
let aw_quillInstance = null;            // Instancia de Quill para el entrenamiento
let aw_totalTimerInterval = null;
let aw_descansoTimerInterval = null;
let aw_timerTrabajoInterval = null;
let aw_totalSeconds = 0;
let aw_descansoSeconds = 60;
let aw_trabajoSeconds = 0;
let aw_descansoActivo = false;
let aw_timerActivo = false;
let aw_intervaloTimer = null;
let aw_rondasRestantes = 0;
let aw_tiempoTrabajoIntervalo = 20;
let aw_tiempoDescansoIntervalo = 10;
let aw_enPeriodoTrabajo = true;
let aw_intervaloActivo = false;
let aw_intervaloPausado = false;
let aw_tiempoActualIntervalo = 0;
let aw_estadoIntervaloPausado = {
    tiempoActual: 0,
    trabajo: 20,
    descanso: 10,
    rondasRestantes: 0,
    enPeriodoTrabajo: true,
    areaBackground: '#d4edda'
};
let aw_audioCtx = null;

// ==================== FUNCIONES AUXILIARES ====================
function formatTime(s) {
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

function initAudio() {
    if (!aw_audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) aw_audioCtx = new AudioContext();
    }
    if (aw_audioCtx && aw_audioCtx.state === 'suspended') {
        aw_audioCtx.resume();
    }
}

function reproducirSonido(tipo) {
    if (!aw_audioCtx) return;
    try {
        const osc = aw_audioCtx.createOscillator();
        const gain = aw_audioCtx.createGain();
        osc.connect(gain);
        gain.connect(aw_audioCtx.destination);
        
        if (tipo === 'fin') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, aw_audioCtx.currentTime);
            gain.gain.setValueAtTime(0.5, aw_audioCtx.currentTime);
            osc.start();
            osc.stop(aw_audioCtx.currentTime + 0.6);
        } else if (tipo === 'cambio') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(660, aw_audioCtx.currentTime);
            gain.gain.setValueAtTime(0.5, aw_audioCtx.currentTime);
            osc.start();
            osc.stop(aw_audioCtx.currentTime + 0.2);
        } else if (tipo === 'bip') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1000, aw_audioCtx.currentTime);
            gain.gain.setValueAtTime(0.3, aw_audioCtx.currentTime);
            osc.start();
            osc.stop(aw_audioCtx.currentTime + 0.1);
        }
    } catch(e) {
        console.warn('Error reproduciendo sonido:', e);
    }
}

function actualizarDisplayTotal() {
    const el = document.getElementById('aw-timer-total');
    if (el) el.innerText = formatTime(aw_totalSeconds);
}

function actualizarDisplayDescanso() {
    const el = document.getElementById('aw-timer-descanso');
    if (el) el.innerText = formatTime(aw_descansoSeconds);
}

function actualizarDisplayTrabajo() {
    const el = document.getElementById('aw-timer-trabajo');
    if (el) el.innerText = formatTime(aw_trabajoSeconds);
}

function iniciarTotalTimer() {
    if (aw_totalTimerInterval) clearInterval(aw_totalTimerInterval);
    aw_totalTimerInterval = setInterval(() => {
        aw_totalSeconds++;
        actualizarDisplayTotal();
    }, 1000);
}

function detenerTotalTimer() {
    if (aw_totalTimerInterval) {
        clearInterval(aw_totalTimerInterval);
        aw_totalTimerInterval = null;
    }
}

// ==================== TEMPORIZADORES ====================
window.iniciarDescanso = function() {
    initAudio();
    if (aw_descansoActivo) return;
    if (aw_descansoSeconds <= 0) {
        aw_descansoSeconds = 60;
        actualizarDisplayDescanso();
    }
    aw_descansoActivo = true;
    const btnPlay = document.getElementById('btn-descanso-play');
    const btnPause = document.getElementById('btn-descanso-pause');
    if (btnPlay) btnPlay.style.display = 'none';
    if (btnPause) btnPause.style.display = 'inline-flex';
    
    if (aw_descansoTimerInterval) clearInterval(aw_descansoTimerInterval);
    
    aw_descansoTimerInterval = setInterval(() => {
        aw_descansoSeconds--;
        if (aw_descansoSeconds > 0) {
            actualizarDisplayDescanso();
            if (aw_descansoSeconds <= 5) reproducirSonido('bip');
        } else if (aw_descansoSeconds === 0) {
            actualizarDisplayDescanso();
            reproducirSonido('fin');
            window.pausarDescanso();
        }
    }, 1000);
};

window.pausarDescanso = function() {
    aw_descansoActivo = false;
    if (aw_descansoTimerInterval) {
        clearInterval(aw_descansoTimerInterval);
        aw_descansoTimerInterval = null;
    }
    const btnPlay = document.getElementById('btn-descanso-play');
    const btnPause = document.getElementById('btn-descanso-pause');
    if (btnPlay) btnPlay.style.display = 'inline-flex';
    if (btnPause) btnPause.style.display = 'none';
};

window.resetearDescanso = function() {
    window.pausarDescanso();
    aw_descansoSeconds = 60;
    actualizarDisplayDescanso();
};

window.setTiempoDescanso = function(segundos) {
    if (typeof segundos !== 'number' || segundos < 1) segundos = 60;
    window.pausarDescanso();
    aw_descansoSeconds = segundos;
    actualizarDisplayDescanso();
    document.getElementById('descanso-panel').style.display = 'none';
};

window.iniciarTimer = function() {
    initAudio();
    if (aw_timerActivo || aw_intervaloActivo) return;
    
    if (aw_intervaloPausado) {
        reanudarIntervalo();
        return;
    }
    
    aw_timerActivo = true;
    const btnPlay = document.getElementById('btn-timer-play');
    const btnPause = document.getElementById('btn-timer-pause');
    if (btnPlay) btnPlay.style.display = 'none';
    if (btnPause) btnPause.style.display = 'inline-flex';
    
    if (aw_timerTrabajoInterval) clearInterval(aw_timerTrabajoInterval);
    aw_timerTrabajoInterval = setInterval(() => {
        aw_trabajoSeconds++;
        actualizarDisplayTrabajo();
    }, 1000);
};

window.pausarTimer = function() {
    if (aw_intervaloActivo) {
        pausarIntervalo();
        return;
    }
    aw_timerActivo = false;
    if (aw_timerTrabajoInterval) {
        clearInterval(aw_timerTrabajoInterval);
        aw_timerTrabajoInterval = null;
    }
    const btnPlay = document.getElementById('btn-timer-play');
    const btnPause = document.getElementById('btn-timer-pause');
    if (btnPlay) btnPlay.style.display = 'inline-flex';
    if (btnPause) btnPause.style.display = 'none';
};

window.resetearTimer = function() {
    window.pausarTimer();
    detenerIntervalo();
    aw_trabajoSeconds = 0;
    actualizarDisplayTrabajo();
};

function pausarIntervalo() {
    if (!aw_intervaloActivo || aw_intervaloPausado) return;
    
    aw_estadoIntervaloPausado.tiempoActual = aw_tiempoActualIntervalo;
    aw_estadoIntervaloPausado.trabajo = aw_tiempoTrabajoIntervalo;
    aw_estadoIntervaloPausado.descanso = aw_tiempoDescansoIntervalo;
    aw_estadoIntervaloPausado.rondasRestantes = aw_rondasRestantes;
    aw_estadoIntervaloPausado.enPeriodoTrabajo = aw_enPeriodoTrabajo;
    const area = document.getElementById('timer-trabajo-area');
    aw_estadoIntervaloPausado.areaBackground = area ? area.style.background : '#d4edda';
    
    if (aw_intervaloTimer) {
        clearInterval(aw_intervaloTimer);
        aw_intervaloTimer = null;
    }
    aw_intervaloActivo = false;
    aw_intervaloPausado = true;
    
    const btnPlay = document.getElementById('btn-timer-play');
    const btnPause = document.getElementById('btn-timer-pause');
    if (btnPlay) btnPlay.style.display = 'inline-flex';
    if (btnPause) btnPause.style.display = 'none';
}

function reanudarIntervalo() {
    if (!aw_intervaloPausado) return;
    
    aw_tiempoTrabajoIntervalo = aw_estadoIntervaloPausado.trabajo;
    aw_tiempoDescansoIntervalo = aw_estadoIntervaloPausado.descanso;
    aw_rondasRestantes = aw_estadoIntervaloPausado.rondasRestantes;
    aw_enPeriodoTrabajo = aw_estadoIntervaloPausado.enPeriodoTrabajo;
    aw_tiempoActualIntervalo = aw_estadoIntervaloPausado.tiempoActual;
    
    aw_intervaloActivo = true;
    aw_intervaloPausado = false;
    aw_timerActivo = false;
    
    const btnPlay = document.getElementById('btn-timer-play');
    const btnPause = document.getElementById('btn-timer-pause');
    if (btnPlay) btnPlay.style.display = 'none';
    if (btnPause) btnPause.style.display = 'inline-flex';
    
    const area = document.getElementById('timer-trabajo-area');
    if (area) area.style.background = aw_estadoIntervaloPausado.areaBackground;
    
    const actualizarDisplay = () => {
        document.getElementById('aw-timer-trabajo').innerText = formatTime(aw_tiempoActualIntervalo);
    };
    actualizarDisplay();
    
    aw_intervaloTimer = setInterval(() => {
        aw_tiempoActualIntervalo--;
        if (aw_tiempoActualIntervalo > 0) {
            actualizarDisplay();
            if (aw_tiempoActualIntervalo <= 5) reproducirSonido('bip');
        } else if (aw_tiempoActualIntervalo === 0) {
            if (aw_enPeriodoTrabajo) {
                aw_rondasRestantes--;
                if (aw_rondasRestantes > 0) {
                    if (aw_tiempoDescansoIntervalo > 0) {
                        aw_enPeriodoTrabajo = false;
                        reproducirSonido('cambio');
                        aw_tiempoActualIntervalo = aw_tiempoDescansoIntervalo;
                        if (area) area.style.background = '#ffe5e5';
                    } else {
                        reproducirSonido('cambio');
                        aw_tiempoActualIntervalo = aw_tiempoTrabajoIntervalo;
                    }
                    actualizarDisplay();
                } else {
                    actualizarDisplay();
                    detenerIntervalo();
                    reproducirSonido('fin');
                    setTimeout(() => alert('¡Intervalo completado!'), 50);
                }
            } else {
                aw_enPeriodoTrabajo = true;
                reproducirSonido('cambio');
                aw_tiempoActualIntervalo = aw_tiempoTrabajoIntervalo;
                actualizarDisplay();
                if (area) area.style.background = '#d4edda';
            }
        }
    }, 1000);
}

function detenerIntervalo() {
    if (aw_intervaloTimer) {
        clearInterval(aw_intervaloTimer);
        aw_intervaloTimer = null;
    }
    aw_intervaloActivo = false;
    aw_intervaloPausado = false;
    const btnPlay = document.getElementById('btn-timer-play');
    const btnPause = document.getElementById('btn-timer-pause');
    if (btnPlay) btnPlay.style.display = 'inline-flex';
    if (btnPause) btnPause.style.display = 'none';
    const area = document.getElementById('timer-trabajo-area');
    if (area) area.style.background = '';
}

function iniciarIntervalo(config) {
    initAudio();
    detenerIntervalo();
    
    const { trabajo, descanso, rondas } = config;
    aw_rondasRestantes = rondas;
    aw_tiempoTrabajoIntervalo = trabajo;
    aw_tiempoDescansoIntervalo = descanso;
    aw_enPeriodoTrabajo = true;
    aw_intervaloActivo = true;
    aw_intervaloPausado = false;
    aw_timerActivo = false;
    
    // Fase de preparación de 5 segundos
    const area = document.getElementById('timer-trabajo-area');
    if (area) area.style.background = '#ffe5e5';
    
    let tiempoPreparacion = 5;
    aw_tiempoActualIntervalo = tiempoPreparacion;
    
    const btnPlay = document.getElementById('btn-timer-play');
    const btnPause = document.getElementById('btn-timer-pause');
    if (btnPlay) btnPlay.style.display = 'none';
    if (btnPause) btnPause.style.display = 'inline-flex';
    
    const actualizarDisplay = () => {
        document.getElementById('aw-timer-trabajo').innerText = formatTime(aw_tiempoActualIntervalo);
    };
    actualizarDisplay();
    
    aw_intervaloTimer = setInterval(() => {
        aw_tiempoActualIntervalo--;
        if (aw_tiempoActualIntervalo > 0) {
            actualizarDisplay();
            if (aw_tiempoActualIntervalo <= 3) reproducirSonido('bip');
        } else if (aw_tiempoActualIntervalo === 0) {
            clearInterval(aw_intervaloTimer);
            reproducirSonido('cambio');
            
            if (area) area.style.background = '#d4edda';
            
            aw_tiempoActualIntervalo = trabajo;
            aw_rondasRestantes = rondas;
            aw_enPeriodoTrabajo = true;
            
            actualizarDisplay();
            
            aw_intervaloTimer = setInterval(() => {
                aw_tiempoActualIntervalo--;
                if (aw_tiempoActualIntervalo > 0) {
                    actualizarDisplay();
                    if (aw_tiempoActualIntervalo <= 5) reproducirSonido('bip');
                } else if (aw_tiempoActualIntervalo === 0) {
                    if (aw_enPeriodoTrabajo) {
                        aw_rondasRestantes--;
                        if (aw_rondasRestantes > 0) {
                            if (descanso > 0) {
                                aw_enPeriodoTrabajo = false;
                                reproducirSonido('cambio');
                                aw_tiempoActualIntervalo = descanso;
                                if (area) area.style.background = '#ffe5e5';
                            } else {
                                reproducirSonido('cambio');
                                aw_tiempoActualIntervalo = trabajo;
                            }
                            actualizarDisplay();
                        } else {
                            actualizarDisplay();
                            detenerIntervalo();
                            reproducirSonido('fin');
                            setTimeout(() => alert('¡Intervalo completado!'), 50);
                        }
                    } else {
                        aw_enPeriodoTrabajo = true;
                        reproducirSonido('cambio');
                        aw_tiempoActualIntervalo = trabajo;
                        actualizarDisplay();
                        if (area) area.style.background = '#d4edda';
                    }
                }
            }, 1000);
        }
    }, 1000);
}

window.aplicarPresetTimer = function(preset) {
    if (preset === 'tabata') {
        document.getElementById('interval-trabajo').value = 20;
        document.getElementById('interval-descanso').value = 10;
        document.getElementById('interval-rondas').value = 8;
        const info = document.getElementById('timer-preset-info');
        if (info) info.innerText = 'Tabata: 20" trabajo / 10" descanso x8';
    } else if (preset === 'emom') {
        document.getElementById('interval-trabajo').value = 60;
        document.getElementById('interval-descanso').value = 0;
        document.getElementById('interval-rondas').value = 10;
        const info = document.getElementById('timer-preset-info');
        if (info) info.innerText = 'EMOM: cada minuto en punto, 10 rondas';
    }
};

window.iniciarIntervaloPersonalizado = function() {
    const trabajo = parseInt(document.getElementById('interval-trabajo').value) || 20;
    const descanso = parseInt(document.getElementById('interval-descanso').value) || 0;
    const rondas = parseInt(document.getElementById('interval-rondas').value) || 1;
    
    if (trabajo <= 0) {
        alert('El tiempo de trabajo debe ser mayor a 0');
        return;
    }
    iniciarIntervalo({ trabajo, descanso, rondas });
    document.getElementById('timer-panel').style.display = 'none';
};

// Alternar paneles de configuración de temporizadores
function togglePanel(panelId) {
    const panel = document.getElementById(panelId);
    if (panel.style.display === 'none' || panel.style.display === '') {
        document.querySelectorAll('.timer-panel').forEach(p => p.style.display = 'none');
        panel.style.display = 'flex';
    } else {
        panel.style.display = 'none';
    }
}

// ==================== FUNCIONES PRINCIPALES DEL ENTRENAMIENTO ====================
function resetAllTimersAndState() {
    if (aw_totalTimerInterval) { clearInterval(aw_totalTimerInterval); aw_totalTimerInterval = null; }
    if (aw_descansoTimerInterval) { clearInterval(aw_descansoTimerInterval); aw_descansoTimerInterval = null; }
    if (aw_timerTrabajoInterval) { clearInterval(aw_timerTrabajoInterval); aw_timerTrabajoInterval = null; }
    if (aw_intervaloTimer) { clearInterval(aw_intervaloTimer); aw_intervaloTimer = null; }
    
    aw_totalSeconds = 0;
    aw_descansoSeconds = 60;
    aw_trabajoSeconds = 0;
    aw_descansoActivo = false;
    aw_timerActivo = false;
    aw_intervaloActivo = false;
    aw_intervaloPausado = false;
    
    actualizarDisplayTotal();
    actualizarDisplayDescanso();
    actualizarDisplayTrabajo();
    
    const btnPlayDescanso = document.getElementById('btn-descanso-play');
    const btnPauseDescanso = document.getElementById('btn-descanso-pause');
    if (btnPlayDescanso) btnPlayDescanso.style.display = 'inline-flex';
    if (btnPauseDescanso) btnPauseDescanso.style.display = 'none';
    
    const btnPlayTimer = document.getElementById('btn-timer-play');
    const btnPauseTimer = document.getElementById('btn-timer-pause');
    if (btnPlayTimer) btnPlayTimer.style.display = 'inline-flex';
    if (btnPauseTimer) btnPauseTimer.style.display = 'none';
    
    const area = document.getElementById('timer-trabajo-area');
    if (area) area.style.background = '';
}

window.iniciarEntrenamiento = function(sessionData) {
    // Limpiar estados previos
    resetAllTimersAndState();
    
    // Destruir instancia anterior de Quill si existe
    if (aw_quillInstance) {
        aw_quillInstance = null;
    }
    
    // Guardar datos del entrenamiento actual (copia del contenido)
    aw_currentWorkout = {
        id: 'w-' + Date.now(),
        sessionId: sessionData.id,
        sessionTitle: sessionData.title,
        sessionContent: sessionData.content, // Copia del contenido original
        routineName: sessionData.routineName,
        fecha: new Date().toISOString(),
        duracion_minutos: 0
    };
    
    // Actualizar título en el modal (usando textContent, no innerHTML)
    const titleSpan = document.getElementById('aw-session-title');
    if (titleSpan) {
        titleSpan.textContent = `${aw_currentWorkout.routineName} - ${aw_currentWorkout.sessionTitle}`;
        console.log('[iniciarEntrenamiento] Título actualizado:', titleSpan.textContent);
    } else {
        console.warn('[iniciarEntrenamiento] No se encontró el elemento aw-session-title');
    }
    
    // --- CORRECCIÓN: Mostrar el modal ANTES de inicializar Quill ---
    const modal = document.getElementById('active-workout');
    if (modal) {
        modal.style.display = 'flex';
        console.log('[iniciarEntrenamiento] Modal mostrado');
    }
    
    // Limpiar y preparar el contenedor del editor (ahora el modal está visible)
    const container = document.getElementById('aw-editor-container');
    if (!container) {
        console.error('[iniciarEntrenamiento] Contenedor aw-editor-container no encontrado');
        return;
    }
    
    // Crear el elemento donde se montará Quill (solo el contenido del editor, NO el header)
    container.innerHTML = '<div id="aw-quill-editor" style="height: 100%;"></div>';
    
    // Esperar a que el DOM se actualice antes de inicializar Quill y enlazar eventos
    setTimeout(() => {
        // Inicializar Quill en modo edición (sin toolbar fija, usará la del contenedor expandible)
        aw_quillInstance = new Quill('#aw-quill-editor', {
            theme: 'snow',
            modules: {
                toolbar: '#aw-toolbar-container'  // Enlazado al contenedor de herramientas del entrenamiento
            },
            placeholder: 'Anota aquí tus series, repeticiones, sensaciones...'
        });
        
        // Cargar el contenido original (copia)
        if (aw_currentWorkout.sessionContent) {
            aw_quillInstance.clipboard.dangerouslyPasteHTML(aw_currentWorkout.sessionContent);
        }
        
        // Habilitar edición
        aw_quillInstance.enable();
        aw_quillInstance.focus();
        
        console.log('[iniciarEntrenamiento] Quill inicializado correctamente');
        
        // ============================================================
        // SOLUCIÓN DEFINITIVA: Enlazar el botón de historial por JS
        // ============================================================
        const historyBtn = document.querySelector('.aw-history-btn');
        if (historyBtn) {
            // Eliminar listeners previos
            historyBtn.onclick = null;
            // Asignar directamente la función global
            historyBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('[Workout] Botón de historial pulsado (click enlazado por JS)');
                // Verificar que aw_currentWorkout existe
                if (!aw_currentWorkout) {
                    console.warn('[Workout] aw_currentWorkout es null, intentando recuperar...');
                    // Intentar recuperar el título desde el DOM
                    const titleSpan2 = document.getElementById('aw-session-title');
                    if (titleSpan2 && titleSpan2.textContent) {
                        const titleText = titleSpan2.textContent;
                        const parts = titleText.split(' - ');
                        if (parts.length === 2) {
                            // Reconstruir aw_currentWorkout temporalmente
                            aw_currentWorkout = {
                                sessionTitle: parts[1] || 'Sesión',
                                routineName: parts[0] || 'Rutina'
                            };
                            console.log('[Workout] aw_currentWorkout reconstruido:', aw_currentWorkout);
                        }
                    }
                }
                // Llamar a la función global
                if (typeof window.mostrarHistorialEntrenamientoActual === 'function') {
                    window.mostrarHistorialEntrenamientoActual();
                } else {
                    console.error('[Workout] window.mostrarHistorialEntrenamientoActual no es una función');
                    alert('Error: La función de historial no está disponible.');
                }
            };
            console.log('[Workout] Evento de historial enlazado correctamente al botón.');
        } else {
            console.warn('[Workout] No se encontró el botón .aw-history-btn para enlazar el evento');
        }
        // ============================================================
        
    }, 100);
    
    // Configurar listeners para los paneles de temporizadores
    const timerDescansoArea = document.getElementById('timer-descanso-area');
    const timerTrabajoArea = document.getElementById('timer-trabajo-area');
    if (timerDescansoArea) {
        timerDescansoArea.onclick = (e) => {
            if (!e.target.closest('button')) togglePanel('descanso-panel');
        };
    }
    if (timerTrabajoArea) {
        timerTrabajoArea.onclick = (e) => {
            if (!e.target.closest('button')) togglePanel('timer-panel');
        };
    }
    
    // Ocultar paneles al inicio
    const descansoPanel = document.getElementById('descanso-panel');
    const timerPanel = document.getElementById('timer-panel');
    if (descansoPanel) descansoPanel.style.display = 'none';
    if (timerPanel) timerPanel.style.display = 'none';
    
    // Iniciar temporizador total
    iniciarTotalTimer();
};

// ==================== FUNCIÓN FINALIZAR ENTRENAMIENTO ====================
window.finalizarEntrenamiento = async function() {
    if (!aw_currentWorkout) {
        alert('No hay entrenamiento activo.');
        return;
    }
    
    // Usar modal personalizado en lugar de confirm nativo
    if (!await window.showConfirm('¿Terminar entrenamiento y guardar las anotaciones?', 'Finalizar entrenamiento')) return;
    
    // Detener todos los temporizadores
    detenerTotalTimer();
    window.pausarDescanso();
    window.pausarTimer();
    detenerIntervalo();
    
    // Obtener el contenido editado del Quill
    let contenidoEditado = '';
    if (aw_quillInstance) {
        contenidoEditado = aw_quillInstance.getSemanticHTML();
    }
    
    // Calcular duración en minutos
    const duracionMinutos = Math.floor(aw_totalSeconds / 60);
    
    // Crear registro de historial
    const historyRecord = {
        id: aw_currentWorkout.id,
        fecha: aw_currentWorkout.fecha,
        nombre_rutina: aw_currentWorkout.routineName,
        nombre_sesion: aw_currentWorkout.sessionTitle,
        contenido_original: aw_currentWorkout.sessionContent,
        contenido_editado: contenidoEditado,
        duracion_minutos: duracionMinutos,
        timestamp_fin: new Date().toISOString()
    };
    
    // Guardar en historyDB usando la función de history-state.js
    try {
        if (typeof window.addHistoryRecord === 'function') {
            window.addHistoryRecord(historyRecord);
            console.log('[workout.js] Historial guardado correctamente mediante addHistoryRecord');
        } else {
            // Fallback: guardar directamente en localStorage
            console.warn('[workout.js] addHistoryRecord no disponible, usando fallback');
            let historyDB = JSON.parse(localStorage.getItem('sharkHistory')) || [];
            historyDB.unshift(historyRecord);
            localStorage.setItem('sharkHistory', JSON.stringify(historyDB));
            // Intentar actualizar window.historyDB
            if (window.historyDB !== undefined) {
                window.historyDB = historyDB;
            }
        }
    } catch (error) {
        console.error('[workout.js] Error guardando historial:', error);
        // Fallback de emergencia
        let historyDB = JSON.parse(localStorage.getItem('sharkHistory')) || [];
        historyDB.unshift(historyRecord);
        localStorage.setItem('sharkHistory', JSON.stringify(historyDB));
    }
    
    // Cerrar el modal de entrenamiento
    const modal = document.getElementById('active-workout');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // LIMPIAR FILTROS Y NAVEGAR AL HISTORIAL NORMAL (SIN FILTRO, SIN BOTÓN DE RETROCESO)
    // Limpiar todos los filtros
    if (typeof window.resetHistoryFilters === 'function') {
        window.resetHistoryFilters();
    } else {
        historySearchTerm = '';
        window.historySearchTerm = '';
        historyRoutineFilter = 'todos';
        window.historyRoutineFilter = 'todos';
        historyReturnScreen = null;
        window.historyReturnScreen = null;
    }
    
    // Navegar al historial normal
    switchTab('history');
    
    // Renderizar el historial después de un breve delay
    setTimeout(() => {
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
        updateHistoryClearButton();
        renderHistory();
    }, 100);
    
    // Mostrar mensaje de éxito
    if (typeof window.showAlert === 'function') {
        await window.showAlert(`Entrenamiento guardado en el historial.\nDuración: ${duracionMinutos} minutos`, "Entrenamiento completado");
    } else {
        alert(`Entrenamiento guardado. Duración: ${duracionMinutos} minutos`);
    }
    
    // Limpiar variables
    aw_currentWorkout = null;
    aw_quillInstance = null;
};

window.cerrarEntrenamiento = async function() {
    if (aw_currentWorkout) {
        if (typeof window.showConfirm === 'function') {
            const confirmar = await window.showConfirm("¿Cerrar sin guardar? Se perderán las anotaciones.", "Cancelar entrenamiento");
            if (!confirmar) return;
        } else {
            if (!confirm("¿Cerrar sin guardar? Se perderán las anotaciones.")) return;
        }
    }
    
    // Detener todos los temporizadores
    detenerTotalTimer();
    window.pausarDescanso();
    window.pausarTimer();
    detenerIntervalo();
    
    // Cerrar modal
    const modal = document.getElementById('active-workout');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // LIMPIAR FILTROS Y NAVEGAR AL HISTORIAL NORMAL (SIN FILTRO, SIN BOTÓN DE RETROCESO)
    // Limpiar todos los filtros
    if (typeof window.resetHistoryFilters === 'function') {
        window.resetHistoryFilters();
    } else {
        historySearchTerm = '';
        window.historySearchTerm = '';
        historyRoutineFilter = 'todos';
        window.historyRoutineFilter = 'todos';
        historyReturnScreen = null;
        window.historyReturnScreen = null;
    }
    
    // Navegar al historial normal
    switchTab('history');
    
    // Renderizar el historial después de un breve delay
    setTimeout(() => {
        const input = document.getElementById('historySearchInput');
        if (input) {
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const routineSelect = document.getElementById('historyRoutineFilterSelect');
        if (routineSelect) {
            routineSelect.value = 'todos';
        }
        updateHistoryClearButton();
        renderHistory();
    }, 100);
    
    aw_currentWorkout = null;
    aw_quillInstance = null;
    
    console.log('[cerrarEntrenamiento] Entrenamiento cerrado correctamente');
};

// ==================== FUNCIONES PARA BOTONES DE FORMATO Y EJERCICIOS (entrenamiento) ====================

// Lista de ejercicios por defecto (copia de gym-session.js)
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

// Renderizar la lista de ejercicios dentro del entrenamiento
function renderExercisesListEntrenamiento(lista) {
    const listContainer = document.getElementById('aw-exercises-list');
    if (!listContainer) return;

    if (lista.length === 0) {
        listContainer.innerHTML = `<li class="no-results">No se encontraron ejercicios</li>`;
        return;
    }

    listContainer.innerHTML = lista.map(ejercicio => `
        <li class="exercise-item" onclick="insertarEjercicioEnEntrenamiento('${ejercicio.replace(/'/g, "\\'")}')">
            ${ejercicio}
        </li>
    `).join('');
}

// Filtrar ejercicios en tiempo real (entrenamiento)
function filtrarEjerciciosEntrenamiento() {
    const searchInput = document.getElementById('aw-search-exercise');
    if (!searchInput) return;

    const query = searchInput.value.toLowerCase().trim();
    
    // Usar el sistema de autocompletado de ejercicios
    if (typeof window.getExerciseAutocompleteList === 'function') {
        const exercises = window.getExerciseAutocompleteList(query);
        if (exercises && exercises.length > 0) {
            renderExercisesListEntrenamiento(exercises.map(ex => ex.nombre));
            return;
        }
    }
    
    // Fallback: usar lista por defecto
    const todosLosEjercicios = obtenerListaEjerciciosPorDefecto();
    if (query === "") {
        renderExercisesListEntrenamiento(todosLosEjercicios);
        return;
    }
    const filtrados = todosLosEjercicios.filter(ej => ej.toLowerCase().includes(query));
    renderExercisesListEntrenamiento(filtrados);
}

// Insertar el ejercicio seleccionado en el editor del entrenamiento
function insertarEjercicioEnEntrenamiento(nombreEjercicio) {
    if (!aw_quillInstance) return;

    // Obtener la posición actual del cursor
    const range = aw_quillInstance.getSelection(true);
    
    // Insertar el texto formateado en negrita seguido de un salto de línea
    aw_quillInstance.insertText(range.index, `\n• ${nombreEjercicio}: `, { 'bold': true });
    
    // Desplazar el cursor al final del bloque insertado
    aw_quillInstance.setSelection(range.index + nombreEjercicio.length + 4);
    
    // Cerrar el panel de ejercicios automáticamente
    toggleSectionEntrenamiento('exercises');
}

// Controlar la conmutación de los paneles de formato y ejercicios (entrenamiento)
window.toggleSectionEntrenamiento = function(type) {
    const toolbarWrapper = document.getElementById('aw-toolbar-wrapper');
    const exercisesWrapper = document.getElementById('aw-exercises-wrapper');
    const formatBtn = document.getElementById('aw-format-btn');
    const exercisesBtn = document.getElementById('aw-exercises-btn');

    if (!toolbarWrapper || !exercisesWrapper || !formatBtn || !exercisesBtn) return;

    // Caso A: Click en el botón de Formato
    if (type === 'format') {
        if (toolbarWrapper.classList.contains('open')) {
            toolbarWrapper.classList.remove('open');
            toolbarWrapper.style.maxHeight = '0px';
            formatBtn.classList.remove('active');
        } else {
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
            exercisesWrapper.classList.remove('open');
            exercisesWrapper.style.maxHeight = '0px';
            exercisesBtn.classList.remove('active');
        } else {
            exercisesWrapper.classList.add('open');
            exercisesWrapper.style.maxHeight = '240px';
            exercisesBtn.classList.add('active');
            
            // Limpiar buscador y cargar lista por defecto
            const searchInput = document.getElementById('aw-search-exercise');
            if (searchInput) searchInput.value = "";
            renderExercisesListEntrenamiento(obtenerListaEjerciciosPorDefecto());

            toolbarWrapper.classList.remove('open');
            toolbarWrapper.style.maxHeight = '0px';
            formatBtn.classList.remove('active');
        }
    }
};