/**
 * MÓDULO: workout-timers.js
 * Controla todos los temporizadores del entrenamiento activo
 */

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