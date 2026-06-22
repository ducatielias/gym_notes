/**
 * MÓDULO: ia-assistant.js
 * Controla la pantalla de Asistente IA para creación de rutinas y sesiones.
 * 
 * Funcionalidades:
 * - Crear rutina con IA
 * - Crear sesión con IA
 * - Importar desde IA (JSON)
 */

// ==========================================================================
// ESTADO GLOBAL
// ==========================================================================

let iaCurrentMode = 'routine'; // 'routine' | 'session' | 'import'
let iaSelectedExercises = [];
let iaSelectedMaterials = [];

// ==========================================================================
// CONSTANTES
// ==========================================================================

const IA_MATERIALS = [
    'Barra', 'Mancuernas', 'Kettlebell', 'Bandas elásticas',
    'Máquinas', 'Peso corporal', 'Cable', 'Polea',
    'Disco', 'Fitball', 'TRX'
];

const IA_LEVELS = ['Principiante', 'Intermedio', 'Avanzado'];
const IA_DURATIONS = ['30 min', '45 min', '60 min', '90 min'];
const IA_FREQUENCIES = ['2 días', '3 días', '4 días', '5 días'];
const IA_GOALS = ['Fuerza', 'Hipertrofia', 'Resistencia', 'Definición', 'Rendimiento'];

// ==========================================================================
// FUNCIÓN PARA ABRIR LA PANTALLA DEL ASISTENTE IA
// ==========================================================================

function openIAAssistant() {
    console.log('[ia-assistant] Abriendo asistente IA');
    switchTab('ia-assistant');
    renderIAAssistant();
}

// ==========================================================================
// RENDERIZAR LA PANTALLA PRINCIPAL
// ==========================================================================

function renderIAAssistant() {
    const container = document.getElementById('ia-assistant-ui');
    if (!container) {
        console.error('[ia-assistant] Contenedor ia-assistant-ui no encontrado');
        return;
    }

    container.innerHTML = `
        <header class="ia-header">
            <div class="ia-header-top">
                <button class="btn-ia-back" onclick="goBackFromIA()">
                    <i class="fa-solid fa-chevron-left"></i> Volver
                </button>
                <h1>
                    <i class="fa-solid fa-robot"></i>
                    Asistente IA
                </h1>
                <div style="width:40px;"></div>
            </div>
            <p>Genera rutinas y sesiones de entrenamiento con la ayuda de la inteligencia artificial.</p>
        </header>

        <div class="ia-cards-grid">
            <!-- Tarjeta: Crear rutina con IA -->
            <div class="ia-card" onclick="openIAConfig('routine')">
                <div class="ia-card-header">
                    <div class="ia-card-icon ia-icon-routine">
                        <i class="fa-solid fa-layer-group"></i>
                    </div>
                    <h3 class="ia-card-title">Crear rutina con IA</h3>
                </div>
                <p class="ia-card-desc">Genera una rutina completa con múltiples sesiones según tus objetivos.</p>
                <span class="ia-card-badge ia-badge-new">Nuevo</span>
            </div>

            <!-- Tarjeta: Crear sesión con IA -->
            <div class="ia-card" onclick="openIAConfig('session')">
                <div class="ia-card-header">
                    <div class="ia-card-icon ia-icon-session">
                        <i class="fa-solid fa-dumbbell"></i>
                    </div>
                    <h3 class="ia-card-title">Crear sesión con IA</h3>
                </div>
                <p class="ia-card-desc">Genera una sesión individual de entrenamiento para un día específico.</p>
                <span class="ia-card-badge ia-badge-new">Nuevo</span>
            </div>

            <!-- Tarjeta: Importar desde IA -->
            <div class="ia-card" onclick="openIAImport()">
                <div class="ia-card-header">
                    <div class="ia-card-icon ia-icon-import">
                        <i class="fa-solid fa-file-import"></i>
                    </div>
                    <h3 class="ia-card-title">Importar desde IA</h3>
                </div>
                <p class="ia-card-desc">Pega el JSON generado por tu IA favorita para importarlo directamente.</p>
                <span class="ia-card-badge ia-badge-new">Nuevo</span>
            </div>
        </div>
    `;
}

// ==========================================================================
// FUNCIÓN PARA VOLVER A LA PANTALLA ANTERIOR
// ==========================================================================

function goBackFromIA() {
    switchTab('plan');
    renderRoutineList();
}

// ==========================================================================
// ABRIR CONFIGURACIÓN DEL ASISTENTE IA
// ==========================================================================

function openIAConfig(mode) {
    console.log('[ia-assistant] Abriendo configuración para modo:', mode);
    iaCurrentMode = mode;

    // Obtener ejercicios de la base de datos
    let exercises = [];
    if (typeof window.getExercises === 'function') {
        exercises = window.getExercises();
    }

    const modal = document.getElementById('iaConfigModal');
    if (!modal) {
        console.error('[ia-assistant] Modal de configuración no encontrado');
        return;
    }

    const title = mode === 'routine' ? 'Crear rutina con IA' : 'Crear sesión con IA';
    const icon = mode === 'routine' ? 'fa-layer-group' : 'fa-dumbbell';

    // Construir lista de ejercicios
    let exercisesHtml = '';
    if (exercises.length > 0) {
        exercisesHtml = exercises.map(ex => `
            <span class="ia-exercise-chip" data-id="${ex.id}" onclick="toggleIAExercise('${ex.id}')">
                ${ex.nombre}
            </span>
        `).join('');
    } else {
        exercisesHtml = '<p style="font-size:13px; color:#9ca3af;">No hay ejercicios guardados. Ve a "Ejercicios" para crear algunos.</p>';
    }

    // Construir materiales
    const materialsHtml = IA_MATERIALS.map(m => `
        <button class="ia-option-btn" data-value="${m}" onclick="toggleIAMaterial('${m}')">
            ${m}
        </button>
    `).join('');

    // Construir niveles
    const levelsHtml = IA_LEVELS.map(l => `
        <button class="ia-option-btn" data-value="${l}" onclick="selectIAOption(this, 'ia-level')">
            ${l}
        </button>
    `).join('');

    // Construir duraciones
    const durationsHtml = IA_DURATIONS.map(d => `
        <button class="ia-option-btn" data-value="${d}" onclick="selectIAOption(this, 'ia-duration')">
            ${d}
        </button>
    `).join('');

    // Construir frecuencias
    const frequenciesHtml = IA_FREQUENCIES.map(f => `
        <button class="ia-option-btn" data-value="${f}" onclick="selectIAOption(this, 'ia-frequency')">
            ${f}
        </button>
    `).join('');

    // Construir objetivos
    const goalsHtml = IA_GOALS.map(g => `
        <button class="ia-option-btn" data-value="${g}" onclick="selectIAOption(this, 'ia-goal')">
            ${g}
        </button>
    `).join('');

    modal.innerHTML = `
        <div class="ia-config-container">
            <div class="ia-config-header">
                <h2>
                    <i class="fa-solid ${icon}" style="color:var(--accent-color);"></i>
                    ${title}
                </h2>
                <button class="ia-config-close" onclick="closeIAConfig()">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div class="ia-config-body">
                <!-- Modo de creación -->
                <div class="ia-section-title">Modo de creación</div>
                <div class="ia-option-group">
                    <button class="ia-option-btn ia-mode-btn selected" data-mode="ia" onclick="selectIAMode(this)">
                        <i class="fa-solid fa-brain"></i> IA
                    </button>
                    <button class="ia-option-btn ia-mode-btn" data-mode="image" onclick="selectIAMode(this)">
                        <i class="fa-solid fa-image"></i> Imagen
                    </button>
                    <button class="ia-option-btn ia-mode-btn" data-mode="video" onclick="selectIAMode(this)">
                        <i class="fa-solid fa-video"></i> Vídeo
                    </button>
                </div>

                <!-- Modo IA: Ejercicios a incluir -->
                <div class="ia-section-title">Ejercicios a incluir</div>
                <div class="ia-exercise-select" id="iaExerciseSelect">
                    ${exercisesHtml}
                </div>

                <!-- Modo IA: Material disponible -->
                <div class="ia-section-title">Material disponible</div>
                <div class="ia-option-group" id="iaMaterialsGroup">
                    ${materialsHtml}
                </div>

                <!-- Modo IA: Nivel -->
                <div class="ia-section-title">Nivel</div>
                <div class="ia-option-group" id="iaLevelGroup">
                    ${levelsHtml}
                </div>

                <!-- Modo IA: Duración estimada -->
                <div class="ia-section-title">Duración estimada</div>
                <div class="ia-option-group" id="iaDurationGroup">
                    ${durationsHtml}
                </div>

                ${mode === 'routine' ? `
                    <!-- Modo IA: Frecuencia semanal (solo para rutinas) -->
                    <div class="ia-section-title">Frecuencia semanal</div>
                    <div class="ia-option-group" id="iaFrequencyGroup">
                        ${frequenciesHtml}
                    </div>
                ` : ''}

                <!-- Modo IA: Objetivo -->
                <div class="ia-section-title">Objetivo principal</div>
                <div class="ia-option-group" id="iaGoalGroup">
                    ${goalsHtml}
                </div>

                <!-- Modo IA: Notas adicionales -->
                <div class="ia-section-title">Notas adicionales</div>
                <textarea id="iaNotesInput" placeholder="Ej: Quiero enfocarme en pectoral y tríceps, evitar ejercicios que carguen la espalda baja..."></textarea>

                <!-- Modo Imagen/Vídeo: Input de archivo (oculto) -->
                <input type="file" id="iaFileInput" style="display:none" accept="image/*,video/*">
            </div>

            <div class="ia-config-footer">
                <button class="ia-btn ia-btn-secondary" onclick="closeIAConfig()">
                    Cancelar
                </button>
                <button class="ia-btn ia-btn-primary" onclick="generateIA()">
                    <i class="fa-solid fa-wand-magic-sparkles"></i> Generar
                </button>
            </div>
        </div>
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Seleccionar por defecto el nivel Intermedio
    setTimeout(() => {
        const defaultLevel = document.querySelector('#iaLevelGroup .ia-option-btn[data-value="Intermedio"]');
        if (defaultLevel) defaultLevel.classList.add('selected');

        const defaultDuration = document.querySelector('#iaDurationGroup .ia-option-btn[data-value="60 min"]');
        if (defaultDuration) defaultDuration.classList.add('selected');

        if (mode === 'routine') {
            const defaultFrequency = document.querySelector('#iaFrequencyGroup .ia-option-btn[data-value="3 días"]');
            if (defaultFrequency) defaultFrequency.classList.add('selected');
        }

        const defaultGoal = document.querySelector('#iaGoalGroup .ia-option-btn[data-value="Hipertrofia"]');
        if (defaultGoal) defaultGoal.classList.add('selected');
    }, 50);

    // Resetear selecciones
    iaSelectedExercises = [];
    iaSelectedMaterials = [];
}

// ==========================================================================
// CERRAR CONFIGURACIÓN DEL ASISTENTE IA
// ==========================================================================

function closeIAConfig() {
    const modal = document.getElementById('iaConfigModal');
    if (modal) {
        modal.classList.remove('active');
        modal.innerHTML = '';
    }
    document.body.style.overflow = '';
}

// ==========================================================================
// FUNCIONES DE SELECCIÓN
// ==========================================================================

function selectIAMode(element) {
    document.querySelectorAll('.ia-mode-btn').forEach(btn => btn.classList.remove('selected'));
    element.classList.add('selected');
    
    const mode = element.dataset.mode;
    console.log('[ia-assistant] Modo seleccionado:', mode);
    
    // Mostrar/ocultar elementos según el modo
    const iaSections = document.querySelectorAll('.ia-section-title');
    const iaGroups = document.querySelectorAll('#iaExerciseSelect, #iaMaterialsGroup, #iaLevelGroup, #iaDurationGroup, #iaFrequencyGroup, #iaGoalGroup');
    const notesInput = document.getElementById('iaNotesInput');
    
    if (mode === 'ia') {
        iaSections.forEach(el => el.style.display = '');
        iaGroups.forEach(el => el.style.display = '');
        if (notesInput) notesInput.style.display = '';
    } else {
        // Modo imagen o vídeo - ocultar configuraciones de IA
        iaSections.forEach(el => el.style.display = 'none');
        iaGroups.forEach(el => el.style.display = 'none');
        if (notesInput) notesInput.style.display = 'none';
        
        // Mostrar input de archivo
        const fileInput = document.getElementById('iaFileInput');
        if (fileInput) {
            fileInput.style.display = 'block';
            fileInput.click();
        }
    }
}

function toggleIAExercise(id) {
    const chip = document.querySelector(`.ia-exercise-chip[data-id="${id}"]`);
    if (!chip) return;

    chip.classList.toggle('selected');
    
    if (chip.classList.contains('selected')) {
        if (!iaSelectedExercises.includes(id)) {
            iaSelectedExercises.push(id);
        }
    } else {
        iaSelectedExercises = iaSelectedExercises.filter(exId => exId !== id);
    }
    
    console.log('[ia-assistant] Ejercicios seleccionados:', iaSelectedExercises);
}

function toggleIAMaterial(material) {
    const btn = document.querySelector(`#iaMaterialsGroup .ia-option-btn[data-value="${material}"]`);
    if (!btn) return;

    btn.classList.toggle('selected');
    
    if (btn.classList.contains('selected')) {
        if (!iaSelectedMaterials.includes(material)) {
            iaSelectedMaterials.push(material);
        }
    } else {
        iaSelectedMaterials = iaSelectedMaterials.filter(m => m !== material);
    }
    
    console.log('[ia-assistant] Materiales seleccionados:', iaSelectedMaterials);
}

function selectIAOption(element, groupId) {
    const group = document.getElementById(groupId);
    if (!group) return;

    group.querySelectorAll('.ia-option-btn').forEach(btn => btn.classList.remove('selected'));
    element.classList.add('selected');
}

function getIASelectedValue(groupId) {
    const group = document.getElementById(groupId);
    if (!group) return null;

    const selected = group.querySelector('.ia-option-btn.selected');
    return selected ? selected.dataset.value : null;
}

function getIASelectedValues(groupId) {
    const group = document.getElementById(groupId);
    if (!group) return [];

    return Array.from(group.querySelectorAll('.ia-option-btn.selected')).map(btn => btn.dataset.value);
}

// ==========================================================================
// GENERAR CON IA
// ==========================================================================

function generateIA() {
    console.log('[ia-assistant] Generando contenido con IA...');
    
    const mode = document.querySelector('.ia-mode-btn.selected');
    const modeType = mode ? mode.dataset.mode : 'ia';
    
    if (modeType !== 'ia') {
        // Modo imagen/video - manejar archivo
        const fileInput = document.getElementById('iaFileInput');
        if (fileInput && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            console.log('[ia-assistant] Archivo seleccionado:', file.name, file.type);
            // Aquí se procesaría el archivo con la IA
            window.showAlert(`📤 Procesando ${file.name}...\n\nLa funcionalidad de análisis de imagen/vídeo con IA estará disponible próximamente.`, 'Procesando');
            closeIAConfig();
            return;
        } else {
            window.showAlert('Por favor, selecciona una imagen o vídeo.', 'Aviso');
            return;
        }
    }
    
    // Modo IA - recoger parámetros
    const level = getIASelectedValue('iaLevelGroup') || 'Intermedio';
    const duration = getIASelectedValue('iaDurationGroup') || '60 min';
    const goal = getIASelectedValue('iaGoalGroup') || 'Hipertrofia';
    const frequency = iaCurrentMode === 'routine' ? getIASelectedValue('iaFrequencyGroup') || '3 días' : null;
    const notes = document.getElementById('iaNotesInput')?.value?.trim() || '';
    
    // Obtener nombres de ejercicios seleccionados
    let exercisesNames = [];
    if (typeof window.getExercises === 'function') {
        const allExercises = window.getExercises();
        exercisesNames = iaSelectedExercises
            .map(id => allExercises.find(ex => ex.id === id))
            .filter(ex => ex)
            .map(ex => ex.nombre);
    }
    
    const params = {
        mode: iaCurrentMode,
        level,
        duration,
        goal,
        frequency,
        notes,
        exercises: exercisesNames,
        materials: iaSelectedMaterials
    };
    
    console.log('[ia-assistant] Parámetros de generación:', params);
    
    // Mostrar loading
    const generateBtn = document.querySelector('.ia-btn-primary');
    if (generateBtn) {
        generateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generando...';
        generateBtn.disabled = true;
    }
    
    // Simular generación (esto será reemplazado por la llamada real a la IA)
    setTimeout(() => {
        // Generar contenido simulado
        const generatedContent = generateSimulatedContent(params);
        
        // Restaurar botón
        if (generateBtn) {
            generateBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generar';
            generateBtn.disabled = false;
        }
        
        // Mostrar resultado
        showIAResult(generatedContent, params);
        
    }, 1500);
}

// ==========================================================================
// GENERAR CONTENIDO SIMULADO (TEMPORAL)
// ==========================================================================

function generateSimulatedContent(params) {
    const isRoutine = params.mode === 'routine';
    const exercises = params.exercises.length > 0 ? params.exercises : ['Press banca', 'Dominadas', 'Sentadillas'];
    const goal = params.goal || 'Hipertrofia';
    const level = params.level || 'Intermedio';
    
    let sessions = [];
    
    if (isRoutine) {
        const days = params.frequency ? parseInt(params.frequency) : 3;
        const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        
        for (let i = 0; i < days && i < dayNames.length; i++) {
            const day = dayNames[i];
            const exCount = Math.min(4 + Math.floor(Math.random() * 3), exercises.length);
            const shuffled = [...exercises].sort(() => Math.random() - 0.5);
            const selected = shuffled.slice(0, exCount);
            
            let content = `<b>📋 Entrenamiento de ${goal}</b><br><br>`;
            content += `<b>Nivel:</b> ${level}<br>`;
            content += `<b>Material:</b> ${params.materials.length > 0 ? params.materials.join(', ') : 'Básico'}<br>`;
            content += `<b>Duración:</b> ${params.duration || '60 min'}<br><br>`;
            content += `<b>Ejercicios:</b><br>`;
            
            selected.forEach((ex, idx) => {
                const reps = Math.floor(Math.random() * 5) + 8;
                const sets = Math.floor(Math.random() * 3) + 3;
                content += `&nbsp;&nbsp;${idx + 1}. <strong style="color:#2563eb;">${ex}</strong> &nbsp; (${sets}x ${reps}-${reps+4} repeticiones)<br>`;
            });
            
            if (params.notes) {
                content += `<br><b>Notas:</b> ${params.notes}`;
            }
            
            sessions.push({
                title: `Sesión ${i + 1} - ${day}`,
                content: content
            });
        }
    } else {
        // Sesión individual
        const exCount = Math.min(5 + Math.floor(Math.random() * 3), exercises.length);
        const shuffled = [...exercises].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, exCount);
        
        let content = `<b>📋 Sesión de ${goal}</b><br><br>`;
        content += `<b>Nivel:</b> ${level}<br>`;
        content += `<b>Material:</b> ${params.materials.length > 0 ? params.materials.join(', ') : 'Básico'}<br>`;
        content += `<b>Duración:</b> ${params.duration || '60 min'}<br><br>`;
        content += `<b>Ejercicios:</b><br>`;
        
        selected.forEach((ex, idx) => {
            const reps = Math.floor(Math.random() * 5) + 8;
            const sets = Math.floor(Math.random() * 3) + 3;
            content += `&nbsp;&nbsp;${idx + 1}. <strong style="color:#2563eb;">${ex}</strong> &nbsp; (${sets}x ${reps}-${reps+4} repeticiones)<br>`;
        });
        
        if (params.notes) {
            content += `<br><b>Notas:</b> ${params.notes}`;
        }
    }
    
    return {
        nombre: isRoutine ? `Rutina de ${goal}` : `Sesión de ${goal}`,
        sessions: isRoutine ? sessions : [{ title: `Sesión de ${goal}`, content: sessions.length > 0 ? sessions[0].content : '' }]
    };
}

// ==========================================================================
// MOSTRAR RESULTADO DE IA
// ==========================================================================

function showIAResult(result, params) {
    closeIAConfig();
    
    const isRoutine = params.mode === 'routine';
    
    // Construir mensaje con el resultado
    let mensaje = `🤖 ${isRoutine ? 'Rutina' : 'Sesión'} generada por IA\n\n`;
    mensaje += `📋 ${result.nombre}\n`;
    mensaje += `📊 Nivel: ${params.level || 'Intermedio'}\n`;
    mensaje += `⏱ Duración: ${params.duration || '60 min'}\n`;
    
    if (isRoutine && params.frequency) {
        mensaje += `📅 Frecuencia: ${params.frequency}\n`;
    }
    
    if (params.materials.length > 0) {
        mensaje += `🏋️ Material: ${params.materials.join(', ')}\n`;
    }
    
    mensaje += `\n---\n\n`;
    
    if (isRoutine) {
        result.sessions.forEach((session, idx) => {
            mensaje += `📌 ${session.title}\n`;
            // Extraer texto plano del HTML
            const plainText = session.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            mensaje += `${plainText}\n\n`;
        });
    } else {
        const plainText = result.sessions[0]?.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || '';
        mensaje += `${plainText}`;
    }
    
    // Mostrar resultado en un modal
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'ia-result-modal';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '4000';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    overlay.style.backdropFilter = 'blur(4px)';
    overlay.style.webkitBackdropFilter = 'blur(4px)';
    
    overlay.innerHTML = `
        <div class="modal-container" style="max-width: 420px; width: 90%; max-height: 80vh; display: flex; flex-direction: column;">
            <div class="modal-header">
                <span class="modal-icon"><i class="fa-solid fa-robot" style="color:var(--accent-color);"></i></span>
                <h3 style="margin:0; font-size:18px; font-weight:700;">${isRoutine ? 'Rutina' : 'Sesión'} generada</h3>
            </div>
            <div class="modal-body" style="flex:1; overflow-y:auto; padding: 16px 20px;">
                <p style="font-size:14px; color:#6b7280; margin-bottom:12px;">Revisa el contenido generado y decide qué hacer:</p>
                <div style="background:#f9fafb; border-radius:12px; padding:14px; border:1px solid #e5e7eb; max-height:200px; overflow-y:auto; font-size:13px; line-height:1.6; white-space:pre-wrap; word-break:break-word; color:#374151;">
                    ${mensaje}
                </div>
            </div>
            <div class="modal-footer" style="padding:16px 20px 20px; display:flex; gap:12px; border-top:1px solid #f3f4f6; flex-wrap:wrap;">
                <button onclick="cerrarResultadoIA()" class="modal-btn modal-btn-secondary" style="flex:1; padding:12px; border:none; border-radius:12px; font-size:14px; font-weight:600; cursor:pointer; background:#f3f4f6; color:#4b5563;">
                    Cancelar
                </button>
                <button onclick="guardarResultadoIA()" class="modal-btn modal-btn-primary" style="flex:2; padding:12px; border:none; border-radius:12px; font-size:14px; font-weight:600; cursor:pointer; background:var(--accent-color, #ccff00); color:var(--primary-color, #000000);">
                    <i class="fa-solid fa-floppy-disk"></i> Guardar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Guardar resultado para usar después
    window._iaLastResult = {
        result: result,
        params: params,
        isRoutine: isRoutine
    };
}

function cerrarResultadoIA() {
    const modal = document.getElementById('ia-result-modal');
    if (modal) {
        modal.remove();
    }
    window._iaLastResult = null;
}

function guardarResultadoIA() {
    const data = window._iaLastResult;
    if (!data) {
        window.showAlert('No hay datos para guardar.', 'Error');
        return;
    }
    
    cerrarResultadoIA();
    
    if (data.isRoutine) {
        // Guardar como rutina
        guardarRutinaIA(data.result, data.params);
    } else {
        // Guardar como sesión
        guardarSesionIA(data.result, data.params);
    }
}

function guardarRutinaIA(result, params) {
    // Buscar una rutina existente o crear una nueva
    const routineName = result.nombre || `Rutina de ${params.goal || 'IA'}`;
    
    // Verificar si ya existe una rutina con ese nombre
    let existingRoutine = appData.routines.find(r => r.name === routineName);
    
    if (existingRoutine) {
        // Preguntar si sobrescribir
        window.showConfirm(
            `Ya existe una rutina con el nombre "${routineName}". ¿Quieres sobrescribirla?`,
            'Rutina existente'
        ).then(confirm => {
            if (confirm) {
                // Sobrescribir
                existingRoutine.sessions = result.sessions.map(session => ({
                    id: 's-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
                    title: session.title || 'Sesión sin título',
                    content: session.content || '',
                    lastModified: Date.now(),
                    createdAt: Date.now()
                }));
                saveData();
                window.showAlert(`Rutina "${routineName}" actualizada correctamente.`, 'Guardado');
                renderRoutineList();
            }
        });
        return;
    }
    
    // Crear nueva rutina
    const newRoutine = {
        id: 'r-' + Date.now(),
        name: routineName,
        sessions: result.sessions.map(session => ({
            id: 's-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            title: session.title || 'Sesión sin título',
            content: session.content || '',
            lastModified: Date.now(),
            createdAt: Date.now()
        }))
    };
    
    appData.routines.push(newRoutine);
    saveData();
    renderRoutineList();
    window.showAlert(`Rutina "${routineName}" creada con ${newRoutine.sessions.length} sesiones.`, 'Guardado');
}

function guardarSesionIA(result, params) {
    // Preguntar en qué rutina guardar
    const routines = appData.routines.map(r => ({ id: r.id, name: r.name }));
    
    if (routines.length === 0) {
        // No hay rutinas, crear una
        window.showPrompt('No hay rutinas disponibles. ¿En qué rutina quieres guardar la sesión? (Se creará una nueva)', '', 'Nueva rutina')
            .then(routineName => {
                if (!routineName) return;
                
                const newRoutine = {
                    id: 'r-' + Date.now(),
                    name: routineName,
                    sessions: [{
                        id: 's-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
                        title: result.nombre || `Sesión de ${params.goal || 'IA'}`,
                        content: result.sessions[0]?.content || '',
                        lastModified: Date.now(),
                        createdAt: Date.now()
                    }]
                };
                
                appData.routines.push(newRoutine);
                saveData();
                renderRoutineList();
                window.showAlert(`Sesión guardada en la rutina "${routineName}".`, 'Guardado');
            });
        return;
    }
    
    // Mostrar selector de rutinas
    window.showRoutineSelector(
        appData.routines,
        null,
        'copy'
    ).then(selectedRoutine => {
        if (!selectedRoutine) return;
        
        const newSession = {
            id: 's-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            title: result.nombre || `Sesión de ${params.goal || 'IA'}`,
            content: result.sessions[0]?.content || '',
            lastModified: Date.now(),
            createdAt: Date.now()
        };
        
        selectedRoutine.sessions.push(newSession);
        saveData();
        renderRoutineList();
        window.showAlert(`Sesión guardada en la rutina "${selectedRoutine.name}".`, 'Guardado');
    });
}

// ==========================================================================
// IMPORTAR DESDE IA (JSON)
// ==========================================================================

function openIAImport() {
    console.log('[ia-assistant] Abriendo importación desde IA');
    
    const modal = document.getElementById('iaConfigModal');
    if (!modal) {
        console.error('[ia-assistant] Modal de configuración no encontrado');
        return;
    }

    modal.innerHTML = `
        <div class="ia-config-container">
            <div class="ia-config-header">
                <h2>
                    <i class="fa-solid fa-file-import" style="color:var(--accent-color);"></i>
                    Importar desde IA
                </h2>
                <button class="ia-config-close" onclick="closeIAConfig()">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div class="ia-config-body">
                <p style="font-size:14px; color:#6b7280; margin-bottom:16px;">
                    Pega el JSON generado por tu IA favorita (ChatGPT, Claude, etc.) siguiendo el formato de sesiones.
                </p>
                
                <label for="iaImportTextarea">JSON de la sesión/rutina</label>
                <textarea id="iaImportTextarea" class="ia-import-textarea" placeholder='{
  "nombre": "Sesión de Pecho y Tríceps",
  "sessions": [
    {
      "title": "Día 1 - Empuje",
      "content": "<b>Press banca</b><br>(x4) 8-12r\\n\\n<b>Press inclinado</b><br>(x3) 10-12r"
    }
  ]
}'></textarea>
                
                <div style="margin-top:12px; padding:12px; background:#f3f4f6; border-radius:12px; font-size:13px; color:#6b7280;">
                    <strong>Formato esperado:</strong><br>
                    <code style="font-size:12px; background:#fff; padding:8px; border-radius:6px; display:block; margin-top:4px; white-space:pre-wrap;">
{
  "nombre": "Nombre de la rutina/sesión",
  "sessions": [
    {
      "title": "Título de la sesión",
      "content": "&lt;b&gt;Ejercicio&lt;/b&gt;&lt;br&gt;Detalles..."
    }
  ]
}
                    </code>
                </div>
            </div>

            <div class="ia-config-footer">
                <button class="ia-btn ia-btn-secondary" onclick="closeIAConfig()">
                    Cancelar
                </button>
                <button class="ia-btn ia-btn-primary" onclick="processIAImport()">
                    <i class="fa-solid fa-file-import"></i> Importar
                </button>
            </div>
        </div>
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function processIAImport() {
    const textarea = document.getElementById('iaImportTextarea');
    if (!textarea) return;
    
    const jsonText = textarea.value.trim();
    if (!jsonText) {
        window.showAlert('Por favor, pega el JSON generado por la IA.', 'Aviso');
        return;
    }
    
    try {
        const data = JSON.parse(jsonText);
        
        // Validar estructura
        if (!data.sessions || !Array.isArray(data.sessions) || data.sessions.length === 0) {
            window.showAlert('El JSON debe contener un array "sessions" con al menos una sesión.', 'Error de formato');
            return;
        }
        
        // Validar cada sesión
        let hasErrors = false;
        data.sessions.forEach((session, index) => {
            if (!session.title || !session.content) {
                window.showAlert(`La sesión ${index + 1} no tiene "title" o "content".`, 'Error de formato');
                hasErrors = true;
            }
        });
        
        if (hasErrors) return;
        
        // Confirmar importación
        const nombre = data.nombre || 'Importación desde IA';
        const sesionesCount = data.sessions.length;
        
        window.showConfirm(
            `¿Importar "${nombre}" con ${sesionesCount} sesión(es)?`,
            'Confirmar importación'
        ).then(confirm => {
            if (!confirm) return;
            
            // Cerrar modal
            closeIAConfig();
            
            // Determinar si es rutina o sesión
            if (sesionesCount > 1) {
                // Es una rutina
                const newRoutine = {
                    id: 'r-' + Date.now(),
                    name: nombre,
                    sessions: data.sessions.map(session => ({
                        id: 's-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
                        title: session.title || 'Sesión sin título',
                        content: session.content || '',
                        lastModified: Date.now(),
                        createdAt: Date.now()
                    }))
                };
                
                appData.routines.push(newRoutine);
                saveData();
                renderRoutineList();
                window.showAlert(`Rutina "${nombre}" importada con ${sesionesCount} sesiones.`, 'Importación completada');
            } else {
                // Es una sesión individual
                const session = data.sessions[0];
                
                // Preguntar en qué rutina guardar
                const routines = appData.routines.map(r => ({ id: r.id, name: r.name }));
                
                if (routines.length === 0) {
                    window.showPrompt('No hay rutinas disponibles. ¿En qué rutina quieres guardar la sesión? (Se creará una nueva)', '', 'Nueva rutina')
                        .then(routineName => {
                            if (!routineName) return;
                            
                            const newRoutine = {
                                id: 'r-' + Date.now(),
                                name: routineName,
                                sessions: [{
                                    id: 's-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
                                    title: session.title || nombre || 'Sesión importada',
                                    content: session.content || '',
                                    lastModified: Date.now(),
                                    createdAt: Date.now()
                                }]
                            };
                            
                            appData.routines.push(newRoutine);
                            saveData();
                            renderRoutineList();
                            window.showAlert(`Sesión importada en la rutina "${routineName}".`, 'Importación completada');
                        });
                    return;
                }
                
                window.showRoutineSelector(
                    appData.routines,
                    null,
                    'copy'
                ).then(selectedRoutine => {
                    if (!selectedRoutine) return;
                    
                    const newSession = {
                        id: 's-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
                        title: session.title || nombre || 'Sesión importada',
                        content: session.content || '',
                        lastModified: Date.now(),
                        createdAt: Date.now()
                    };
                    
                    selectedRoutine.sessions.push(newSession);
                    saveData();
                    renderRoutineList();
                    window.showAlert(`Sesión importada en la rutina "${selectedRoutine.name}".`, 'Importación completada');
                });
            }
        });
        
    } catch (error) {
        window.showAlert('Error al parsear el JSON: ' + error.message, 'Error');
    }
}

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.openIAAssistant = openIAAssistant;
window.renderIAAssistant = renderIAAssistant;
window.goBackFromIA = goBackFromIA;
window.openIAConfig = openIAConfig;
window.closeIAConfig = closeIAConfig;
window.selectIAMode = selectIAMode;
window.toggleIAExercise = toggleIAExercise;
window.toggleIAMaterial = toggleIAMaterial;
window.selectIAOption = selectIAOption;
window.getIASelectedValue = getIASelectedValue;
window.getIASelectedValues = getIASelectedValues;
window.generateIA = generateIA;
window.showIAResult = showIAResult;
window.cerrarResultadoIA = cerrarResultadoIA;
window.guardarResultadoIA = guardarResultadoIA;
window.guardarRutinaIA = guardarRutinaIA;
window.guardarSesionIA = guardarSesionIA;
window.openIAImport = openIAImport;
window.processIAImport = processIAImport;