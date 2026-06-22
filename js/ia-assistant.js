/**
 * MÓDULO: ia-assistant.js
 * Controla la pantalla de Asistente IA para creación de rutinas y sesiones.
 * 
 * Funcionalidades:
 * - Generar prompt personalizado con opciones seleccionadas
 * - Copiar prompt para usar en IA externa
 * - Pegar respuesta de IA y procesarla
 * - Guardar como rutina o sesión
 * 
 * MODIFICADO: Sin modales - navegación entre pantallas (config → prompt → preview)
 * MODIFICADO: Limpieza automática de JSON para tolerar errores de formato
 */

// ==========================================================================
// ESTADO GLOBAL
// ==========================================================================

let iaCurrentMode = 'routine';
let iaSelectedExercises = [];
let iaSelectedMaterials = [];
let iaUltimaRespuesta = null;
let iaStep = 'config'; // 'config' | 'prompt' | 'preview' | 'import'

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
    iaStep = 'config';
    iaSelectedExercises = [];
    iaSelectedMaterials = [];
    switchTab('ia-assistant');
    renderIAAssistant();
}

// ==========================================================================
// RENDERIZAR LA PANTALLA SEGÚN EL PASO
// ==========================================================================

function renderIAAssistant() {
    const container = document.getElementById('ia-assistant-ui');
    if (!container) {
        console.error('[ia-assistant] Contenedor ia-assistant-ui no encontrado');
        return;
    }

    if (iaStep === 'config') {
        renderConfigScreen(container);
    } else if (iaStep === 'prompt') {
        renderPromptScreen(container);
    } else if (iaStep === 'preview') {
        renderPreviewScreen(container);
    } else if (iaStep === 'import') {
        renderImportScreen(container);
    }
}

// ==========================================================================
// RENDERIZAR PANTALLA DE CONFIGURACIÓN
// ==========================================================================

function renderConfigScreen(container) {
    let exercises = [];
    if (typeof window.getExercises === 'function') {
        exercises = window.getExercises();
    }

    let exercisesHtml = '';
    if (exercises.length > 0) {
        exercisesHtml = exercises.map(ex => `
            <span class="ia-exercise-chip" data-id="${ex.id}">
                ${ex.nombre}
            </span>
        `).join('');
    } else {
        exercisesHtml = '<p style="font-size:13px; color:#9ca3af;">No hay ejercicios guardados. Ve a "Ejercicios" para crear algunos.</p>';
    }

    const materialsHtml = IA_MATERIALS.map(m => `
        <button class="ia-option-btn" data-value="${m}" data-group="materials">
            ${m}
        </button>
    `).join('');

    const levelsHtml = IA_LEVELS.map(l => `
        <button class="ia-option-btn" data-value="${l}" data-group="level">
            ${l}
        </button>
    `).join('');

    const durationsHtml = IA_DURATIONS.map(d => `
        <button class="ia-option-btn" data-value="${d}" data-group="duration">
            ${d}
        </button>
    `).join('');

    const frequenciesHtml = IA_FREQUENCIES.map(f => `
        <button class="ia-option-btn" data-value="${f}" data-group="frequency">
            ${f}
        </button>
    `).join('');

    const goalsHtml = IA_GOALS.map(g => `
        <button class="ia-option-btn" data-value="${g}" data-group="goal">
            ${g}
        </button>
    `).join('');

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
            <p>Configura tus preferencias y genera un prompt para usar con tu IA favorita.</p>
        </header>

        <div class="ia-cards-grid">
            <div class="ia-card" style="cursor:default; padding: 20px 24px;">
                <!-- Tipo de creación -->
                <div class="ia-section-title" style="margin-top:0;">Tipo de creación</div>
                <div class="ia-option-group" id="iaTypeGroup">
                    <button class="ia-option-btn ia-type-btn selected" data-mode="routine" data-group="type">
                        <i class="fa-solid fa-layer-group"></i> Rutina
                    </button>
                    <button class="ia-option-btn ia-type-btn" data-mode="session" data-group="type">
                        <i class="fa-solid fa-dumbbell"></i> Sesión
                    </button>
                </div>

                <!-- Ejercicios -->
                <div class="ia-section-title">Ejercicios a incluir <span style="font-weight:400; color:#9ca3af; font-size:12px;">(opcional)</span></div>
                <div class="ia-exercise-select" id="iaExerciseSelect">
                    ${exercisesHtml}
                </div>

                <!-- Material -->
                <div class="ia-section-title">Material disponible <span style="font-weight:400; color:#9ca3af; font-size:12px;">(opcional)</span></div>
                <div class="ia-option-group" id="iaMaterialsGroup">
                    ${materialsHtml}
                </div>

                <!-- Nivel -->
                <div class="ia-section-title">Nivel</div>
                <div class="ia-option-group" id="iaLevelGroup">
                    ${levelsHtml}
                </div>

                <!-- Duración -->
                <div class="ia-section-title">Duración estimada</div>
                <div class="ia-option-group" id="iaDurationGroup">
                    ${durationsHtml}
                </div>

                <!-- Frecuencia -->
                <div class="ia-section-title" id="iaFrequencyTitle">Frecuencia semanal</div>
                <div class="ia-option-group" id="iaFrequencyGroup">
                    ${frequenciesHtml}
                </div>

                <!-- Objetivo -->
                <div class="ia-section-title">Objetivo principal</div>
                <div class="ia-option-group" id="iaGoalGroup">
                    ${goalsHtml}
                </div>

                <!-- Notas -->
                <div class="ia-section-title">Notas adicionales</div>
                <textarea id="iaNotesInput" placeholder="Ej: Quiero enfocarme en pectoral y tríceps, evitar ejercicios que carguen la espalda baja..."></textarea>

                <button class="ia-btn ia-btn-primary" id="iaGeneratePromptBtn" style="width:100%; margin-top:16px; padding:14px; border:none; border-radius:14px; font-size:15px; font-weight:700; cursor:pointer; background:var(--accent-color, #ccff00); color:var(--primary-color, #000000);">
                    <i class="fa-solid fa-copy"></i> Generar prompt
                </button>

                <div style="margin-top:12px; text-align:center; border-top:1px solid #f3f4f6; padding-top:12px;">
                    <span style="font-size:13px; color:#9ca3af;">O también</span>
                    <button onclick="openIAImport()" style="display:block; width:100%; margin-top:8px; padding:12px; border:1.5px dashed #e5e7eb; border-radius:12px; background:transparent; font-size:14px; font-weight:600; color:#4b5563; cursor:pointer;">
                        <i class="fa-solid fa-file-import"></i> Importar desde IA (JSON)
                    </button>
                </div>
            </div>
        </div>
    `;

    // ============================================================
    // CONFIGURAR EVENT LISTENERS
    // ============================================================

    document.getElementById('iaGeneratePromptBtn').addEventListener('click', function() {
        generarPromptIA();
    });

    // Tipo
    document.querySelectorAll('#iaTypeGroup .ia-type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            selectIAType(this);
        });
    });

    // Ejercicios
    document.querySelectorAll('.ia-exercise-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            toggleIAExercise(this.dataset.id);
        });
    });

    // Materiales
    document.querySelectorAll('#iaMaterialsGroup .ia-option-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            toggleIAMaterial(this.dataset.value);
        });
    });

    // Nivel, Duración, Frecuencia, Objetivo
    document.querySelectorAll('#iaLevelGroup .ia-option-btn, #iaDurationGroup .ia-option-btn, #iaFrequencyGroup .ia-option-btn, #iaGoalGroup .ia-option-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const group = this.parentElement;
            group.querySelectorAll('.ia-option-btn').forEach(b => {
                b.classList.remove('selected');
                b.removeAttribute('data-selected');
            });
            this.classList.add('selected');
            this.setAttribute('data-selected', 'true');
        });
    });

    // ============================================================
    // ESTABLECER VALORES POR DEFECTO
    // ============================================================

    setTimeout(() => {
        const defaults = [
            { group: 'iaLevelGroup', value: 'Intermedio' },
            { group: 'iaDurationGroup', value: '60 min' },
            { group: 'iaFrequencyGroup', value: '3 días' },
            { group: 'iaGoalGroup', value: 'Hipertrofia' }
        ];

        defaults.forEach(({ group, value }) => {
            const containerEl = document.getElementById(group);
            if (containerEl) {
                const btns = containerEl.querySelectorAll('.ia-option-btn');
                btns.forEach(b => {
                    b.classList.remove('selected');
                    b.removeAttribute('data-selected');
                });
                const target = containerEl.querySelector(`.ia-option-btn[data-value="${value}"]`);
                if (target) {
                    target.classList.add('selected');
                    target.setAttribute('data-selected', 'true');
                }
            }
        });
    }, 100);
}

// ==========================================================================
// RENDERIZAR PANTALLA DE PROMPT
// ==========================================================================

function renderPromptScreen(container) {
    const params = window._iaPromptParams;
    if (!params) {
        iaStep = 'config';
        renderIAAssistant();
        return;
    }

    const isRoutine = params.mode === 'routine';
    
    let prompt = `Actúa como un entrenador personal experto. Créame ${isRoutine ? 'una rutina de entrenamiento' : 'una sesión de entrenamiento'} de gimnasio.\n\n`;
    
    prompt += `📋 REQUISITOS:\n`;
    prompt += `- Tipo: ${isRoutine ? 'Rutina completa' : 'Sesión individual'}\n`;
    prompt += `- Nivel: ${params.level || 'Intermedio'}\n`;
    prompt += `- Duración: ${params.duration || '60 min'}\n`;
    prompt += `- Objetivo: ${params.goal || 'Hipertrofia'}\n`;
    
    if (isRoutine && params.frequency) {
        prompt += `- Frecuencia semanal: ${params.frequency}\n`;
    }
    
    if (params.materials.length > 0) {
        prompt += `- Material disponible: ${params.materials.join(', ')}\n`;
    }
    
    if (params.exercises.length > 0) {
        prompt += `- Ejercicios a incluir: ${params.exercises.join(', ')}\n`;
    }
    
    if (params.notes) {
        prompt += `- Notas adicionales: ${params.notes}\n`;
    }
    
    prompt += `\n📤 FORMATO DE RESPUESTA:\n`;
    prompt += `Debes devolverme ÚNICAMENTE un objeto JSON válido con el siguiente formato:\n\n`;
    prompt += `{\n`;
    prompt += `  "nombre": "Nombre de la ${isRoutine ? 'Rutina' : 'Sesión'}",\n`;
    prompt += `  "sessions": [\n`;
    if (isRoutine) {
        prompt += `    {\n`;
        prompt += `      "title": "Título de la sesión",\n`;
        prompt += `      "content": "<b>Ejercicio</b><br>(x4) 8-12 repeticiones\\n\\n<b>Ejercicio 2</b><br>(x3) 10-12 repeticiones"\n`;
        prompt += `    }\n`;
    } else {
        prompt += `    {\n`;
        prompt += `      "title": "Sesión",\n`;
        prompt += `      "content": "<b>Ejercicio</b><br>(x4) 8-12 repeticiones\\n\\n<b>Ejercicio 2</b><br>(x3) 10-12 repeticiones"\n`;
        prompt += `    }\n`;
    }
    prompt += `  ]\n`;
    prompt += `}\n`;
    
    prompt += `\n⚠️ IMPORTANTE:\n`;
    prompt += `- No incluyas texto adicional, solo el JSON.\n`;
    prompt += `- Escapa los saltos de línea como \\n dentro de las cadenas.\n`;
    prompt += `- No uses caracteres especiales no escapados.\n`;
    prompt += `- Asegúrate de que todas las comillas sean dobles (").`;

    container.innerHTML = `
        <header class="ia-header">
            <div class="ia-header-top">
                <button class="btn-ia-back" onclick="goBackToConfig()">
                    <i class="fa-solid fa-chevron-left"></i> Volver
                </button>
                <h1>
                    <i class="fa-solid fa-robot"></i>
                    Asistente IA
                </h1>
                <div style="width:40px;"></div>
            </div>
            <p>Copia el prompt, pégalo en tu IA favorita y pega la respuesta abajo.</p>
        </header>

        <div class="ia-cards-grid">
            <div class="ia-card" style="cursor:default; padding: 20px 24px;">
                <div style="margin-bottom:12px;">
                    <label style="font-size:13px; font-weight:600; color:#374151; display:block; margin-bottom:6px;">📋 Prompt generado:</label>
                    <textarea id="iaPromptTextarea" style="width:100%; min-height:150px; padding:12px; border-radius:12px; border:1px solid #e5e7eb; font-size:13px; font-family:monospace; outline:none; background:#f9fafb; resize:vertical; box-sizing:border-box;" readonly>${prompt.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
                    <button id="copiarPromptBtn2" style="margin-top:8px; padding:8px 16px; background:var(--accent-color, #ccff00); color:var(--primary-color, #000000); border:none; border-radius:8px; font-weight:600; cursor:pointer; font-size:13px;">
                        <i class="fa-solid fa-copy"></i> Copiar prompt
                    </button>
                </div>

                <div style="border-top:1px solid #f3f4f6; padding-top:16px; margin-top:8px;">
                    <label style="font-size:13px; font-weight:600; color:#374151; display:block; margin-bottom:6px;">📥 Pega aquí la respuesta de tu IA (JSON):</label>
                    <textarea id="iaRespuestaTextarea2" style="width:100%; min-height:120px; padding:12px; border-radius:12px; border:1px solid #e5e7eb; font-size:13px; font-family:monospace; outline:none; background:#fafafa; resize:vertical; box-sizing:border-box;" placeholder='Pega aquí el JSON que te devuelva la IA...'></textarea>
                    <button id="procesarRespuestaBtn2" style="margin-top:8px; width:100%; padding:12px; background:var(--accent-color, #ccff00); color:var(--primary-color, #000000); border:none; border-radius:12px; font-weight:700; cursor:pointer; font-size:14px;">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> Procesar respuesta
                    </button>
                </div>
            </div>
        </div>
    `;

    // Event listeners
    document.getElementById('copiarPromptBtn2').addEventListener('click', function() {
        const textarea = document.getElementById('iaPromptTextarea');
        if (textarea) {
            const text = textarea.value;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(() => {
                    window.showAlert('✅ Prompt copiado al portapapeles', 'Copiado');
                }).catch(() => {
                    textarea.select();
                    document.execCommand('copy');
                    window.showAlert('✅ Prompt copiado al portapapeles', 'Copiado');
                });
            } else {
                textarea.select();
                document.execCommand('copy');
                window.showAlert('✅ Prompt copiado al portapapeles', 'Copiado');
            }
        }
    });

    document.getElementById('procesarRespuestaBtn2').addEventListener('click', function() {
        procesarRespuestaDesdePantalla();
    });
}

// ==========================================================================
// RENDERIZAR PANTALLA DE VISTA PREVIA
// ==========================================================================

function renderPreviewScreen(container) {
    const data = window._iaPreviewData;
    if (!data) {
        iaStep = 'config';
        renderIAAssistant();
        return;
    }

    const { data: result, params } = data;
    const isRoutine = params.mode === 'routine';
    const nombre = result.nombre || (isRoutine ? 'Rutina generada' : 'Sesión generada');
    const sesionesCount = result.sessions.length;
    
    let previewText = `📋 ${nombre}\n`;
    previewText += `📊 ${sesionesCount} sesión(es)\n\n`;
    
    result.sessions.forEach((session, idx) => {
        previewText += `📌 ${session.title}\n`;
        const plainText = session.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        previewText += `${plainText.substring(0, 200)}${plainText.length > 200 ? '...' : ''}\n\n`;
    });

    container.innerHTML = `
        <header class="ia-header">
            <div class="ia-header-top">
                <button class="btn-ia-back" onclick="goBackToPrompt()">
                    <i class="fa-solid fa-chevron-left"></i> Volver
                </button>
                <h1>
                    <i class="fa-solid fa-robot"></i>
                    Asistente IA
                </h1>
                <div style="width:40px;"></div>
            </div>
            <p>Revisa el contenido generado y decide qué hacer.</p>
        </header>

        <div class="ia-cards-grid">
            <div class="ia-card" style="cursor:default; padding: 20px 24px;">
                <div style="margin-bottom:12px;">
                    <label style="font-size:13px; font-weight:600; color:#374151; display:block; margin-bottom:6px;">📄 Vista previa:</label>
                    <div style="background:#f9fafb; border-radius:12px; padding:14px; border:1px solid #e5e7eb; max-height:300px; overflow-y:auto; font-size:13px; line-height:1.6; white-space:pre-wrap; word-break:break-word; color:#374151;">
                        ${previewText}
                    </div>
                </div>

                <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
                    <span style="font-size:12px; color:#9ca3af; background:#f3f4f6; padding:4px 12px; border-radius:12px;">
                        ${isRoutine ? '📋 Rutina' : '📝 Sesión'}
                    </span>
                    <span style="font-size:12px; color:#9ca3af; background:#f3f4f6; padding:4px 12px; border-radius:12px;">
                        📄 ${sesionesCount} sesión(es)
                    </span>
                </div>

                <div style="display:flex; gap:12px; margin-top:16px; border-top:1px solid #f3f4f6; padding-top:16px;">
                    <button id="cancelarPreviewBtn2" style="flex:1; padding:12px; border:none; border-radius:12px; font-size:14px; font-weight:600; cursor:pointer; background:#f3f4f6; color:#4b5563;">
                        Cancelar
                    </button>
                    <button id="guardarPreviewBtn2" style="flex:2; padding:12px; border:none; border-radius:12px; font-size:14px; font-weight:600; cursor:pointer; background:var(--accent-color, #ccff00); color:var(--primary-color, #000000);">
                        <i class="fa-solid fa-floppy-disk"></i> Guardar
                    </button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('cancelarPreviewBtn2').addEventListener('click', function() {
        iaStep = 'prompt';
        window._iaPreviewData = null;
        renderIAAssistant();
    });

    document.getElementById('guardarPreviewBtn2').addEventListener('click', function() {
        guardarDesdePreview();
    });
}

// ==========================================================================
// RENDERIZAR PANTALLA DE IMPORTACIÓN
// ==========================================================================

function renderImportScreen(container) {
    container.innerHTML = `
        <header class="ia-header">
            <div class="ia-header-top">
                <button class="btn-ia-back" onclick="goBackToConfig()">
                    <i class="fa-solid fa-chevron-left"></i> Volver
                </button>
                <h1>
                    <i class="fa-solid fa-file-import"></i>
                    Importar desde IA
                </h1>
                <div style="width:40px;"></div>
            </div>
            <p>Pega directamente el JSON generado por tu IA favorita.</p>
        </header>

        <div class="ia-cards-grid">
            <div class="ia-card" style="cursor:default; padding: 20px 24px;">
                <p style="font-size:14px; color:#6b7280; margin-bottom:16px;">
                    Pega el JSON generado por tu IA favorita (ChatGPT, Claude, etc.) siguiendo el formato de sesiones.
                </p>
                
                <label style="font-size:13px; font-weight:600; color:#374151; display:block; margin-bottom:6px;">JSON de la sesión/rutina</label>
                <textarea id="iaImportTextarea2" style="width:100%; min-height:150px; padding:12px; border-radius:12px; border:1px solid #e5e7eb; font-size:13px; font-family:monospace; outline:none; background:#fafafa; resize:vertical; box-sizing:border-box;" placeholder='{
  "nombre": "Sesión de Pecho y Tríceps",
  "sessions": [
    {
      "title": "Día 1 - Empuje",
      "content": "<b>Press banca</b><br>(x4) 8-12r"
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

                <button id="iaImportProcessBtn2" style="margin-top:16px; width:100%; padding:14px; background:var(--accent-color, #ccff00); color:var(--primary-color, #000000); border:none; border-radius:12px; font-weight:700; cursor:pointer; font-size:15px;">
                    <i class="fa-solid fa-file-import"></i> Importar
                </button>
            </div>
        </div>
    `;

    document.getElementById('iaImportProcessBtn2').addEventListener('click', function() {
        processIAImportDesdePantalla();
    });
}

// ==========================================================================
// FUNCIONES DE NAVEGACIÓN
// ==========================================================================

function goBackFromIA() {
    iaStep = 'config';
    window._iaPromptParams = null;
    window._iaPreviewData = null;
    switchTab('plan');
    renderRoutineList();
}

function goBackToConfig() {
    iaStep = 'config';
    window._iaPromptParams = null;
    window._iaPreviewData = null;
    renderIAAssistant();
}

function goBackToPrompt() {
    iaStep = 'prompt';
    window._iaPreviewData = null;
    renderIAAssistant();
}

// ==========================================================================
// FUNCIONES DE SELECCIÓN
// ==========================================================================

function selectIAType(element) {
    document.querySelectorAll('#iaTypeGroup .ia-type-btn').forEach(btn => {
        btn.classList.remove('selected');
        btn.removeAttribute('data-selected');
    });
    element.classList.add('selected');
    element.setAttribute('data-selected', 'true');
    
    const mode = element.dataset.mode;
    iaCurrentMode = mode;
    
    const frequencyTitle = document.getElementById('iaFrequencyTitle');
    const frequencyGroup = document.getElementById('iaFrequencyGroup');
    
    if (mode === 'routine') {
        if (frequencyTitle) frequencyTitle.style.display = '';
        if (frequencyGroup) frequencyGroup.style.display = '';
    } else {
        if (frequencyTitle) frequencyTitle.style.display = 'none';
        if (frequencyGroup) frequencyGroup.style.display = 'none';
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
}

function getIASelectedValue(groupId) {
    const group = document.getElementById(groupId);
    if (!group) return null;

    const selected = group.querySelector('.ia-option-btn.selected, .ia-option-btn[data-selected="true"]');
    if (selected) {
        return selected.dataset.value;
    }
    
    const firstBtn = group.querySelector('.ia-option-btn');
    return firstBtn ? firstBtn.dataset.value : null;
}

// ==========================================================================
// GENERAR PROMPT
// ==========================================================================

function generarPromptIA() {
    console.log('[ia-assistant] Generando prompt...');
    
    const type = iaCurrentMode || 'routine';
    const level = getIASelectedValue('iaLevelGroup') || 'Intermedio';
    const duration = getIASelectedValue('iaDurationGroup') || '60 min';
    const goal = getIASelectedValue('iaGoalGroup') || 'Hipertrofia';
    const frequency = type === 'routine' ? (getIASelectedValue('iaFrequencyGroup') || '3 días') : null;
    const notes = document.getElementById('iaNotesInput')?.value?.trim() || '';
    
    let exercisesNames = [];
    if (typeof window.getExercises === 'function') {
        const allExercises = window.getExercises();
        exercisesNames = iaSelectedExercises
            .map(id => allExercises.find(ex => ex.id === id))
            .filter(ex => ex)
            .map(ex => ex.nombre);
    }
    
    const params = {
        mode: type,
        level,
        duration,
        goal,
        frequency,
        notes,
        exercises: exercisesNames,
        materials: iaSelectedMaterials
    };
    
    console.log('[ia-assistant] Parámetros:', params);
    
    iaStep = 'prompt';
    window._iaPromptParams = params;
    renderIAAssistant();
}

// ==========================================================================
// PROCESAR RESPUESTA DESDE LA PANTALLA (CON LIMPIEZA DE JSON)
// ==========================================================================

function procesarRespuestaDesdePantalla() {
    const textarea = document.getElementById('iaRespuestaTextarea2');
    if (!textarea) return;
    
    let jsonText = textarea.value.trim();
    if (!jsonText) {
        window.showAlert('Por favor, pega la respuesta JSON de tu IA.', 'Aviso');
        return;
    }
    
    try {
        // ============================================================
        // 1. INTENTAR EXTRAER SOLO EL JSON
        // ============================================================
        
        // Buscar un bloque JSON (entre llaves)
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonText = jsonMatch[0];
        }
        
        // Si no tiene llaves al inicio, intentar buscar después del primer {
        if (!jsonText.startsWith('{')) {
            const startIndex = jsonText.indexOf('{');
            if (startIndex !== -1) {
                const endIndex = jsonText.lastIndexOf('}');
                if (endIndex !== -1 && endIndex > startIndex) {
                    jsonText = jsonText.substring(startIndex, endIndex + 1);
                }
            }
        }
        
        // ============================================================
        // 2. LIMPIAR CARACTERES DE CONTROL
        // ============================================================
        
        // Eliminar caracteres de control no permitidos en JSON
        // Pero mantener los saltos de línea dentro de las cadenas
        jsonText = jsonText.replace(/[\x00-\x1f\x7f-\x9f]/g, function(match) {
            // Si es un salto de línea, mantenerlo como \n
            if (match === '\n') return '\\n';
            if (match === '\r') return '\\r';
            if (match === '\t') return '\\t';
            // Para otros caracteres de control, reemplazar con espacio
            return ' ';
        });
        
        // ============================================================
        // 3. PARSEAR EL JSON
        // ============================================================
        
        let data = JSON.parse(jsonText);
        
        // Si el JSON tiene una propiedad "respuesta" anidada
        if (data.respuesta && typeof data.respuesta === 'string') {
            try {
                data = JSON.parse(data.respuesta);
            } catch (e) {}
        }
        
        // Validar estructura
        if (!data.sessions || !Array.isArray(data.sessions) || data.sessions.length === 0) {
            window.showAlert('El JSON debe contener un array "sessions" con al menos una sesión.', 'Error de formato');
            return;
        }
        
        let hasErrors = false;
        data.sessions.forEach((session, index) => {
            if (!session.title || !session.content) {
                window.showAlert(`La sesión ${index + 1} no tiene "title" o "content".`, 'Error de formato');
                hasErrors = true;
            }
        });
        
        if (hasErrors) return;
        
        const params = window._iaPromptParams || { mode: 'routine' };
        
        iaStep = 'preview';
        window._iaPreviewData = { data, params };
        renderIAAssistant();
        
    } catch (error) {
        console.error('[ia-assistant] Error parsing JSON:', error);
        console.log('[ia-assistant] Texto recibido:', jsonText.substring(0, 500) + '...');
        
        window.showAlert(
            'Error al parsear el JSON: ' + error.message + 
            '\n\nAsegúrate de que la respuesta sea un JSON válido.' +
            '\n\n💡 Tips:' +
            '\n- La IA solo debe devolver el JSON, sin texto adicional' +
            '\n- Los saltos de línea deben ser \\n dentro de las cadenas' +
            '\n- Revisa que no haya comas extrañas al final',
            'Error'
        );
    }
}

// ==========================================================================
// GUARDAR DESDE VISTA PREVIA
// ==========================================================================

function guardarDesdePreview() {
    const data = window._iaPreviewData;
    if (!data) {
        window.showAlert('No hay datos para guardar.', 'Error');
        return;
    }

    const { data: result, params } = data;
    const isRoutine = params.mode === 'routine';
    
    if (isRoutine) {
        guardarRutinaIA(result, params);
    } else {
        guardarSesionIA(result, params);
    }
}

// ==========================================================================
// GUARDAR RUTINA O SESIÓN
// ==========================================================================

function guardarRutinaIA(result, params) {
    const routineName = result.nombre || `Rutina de ${params.goal || 'IA'}`;
    
    let existingRoutine = appData.routines.find(r => r.name === routineName);
    
    if (existingRoutine) {
        window.showConfirm(
            `Ya existe una rutina con el nombre "${routineName}". ¿Quieres sobrescribirla?`,
            'Rutina existente'
        ).then(confirm => {
            if (confirm) {
                existingRoutine.sessions = result.sessions.map(session => ({
                    id: 's-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
                    title: session.title || 'Sesión sin título',
                    content: session.content || '',
                    lastModified: Date.now(),
                    createdAt: Date.now()
                }));
                saveData();
                window.showAlert(`Rutina "${routineName}" actualizada correctamente.`, 'Guardado');
                iaStep = 'config';
                window._iaPromptParams = null;
                window._iaPreviewData = null;
                renderIAAssistant();
                renderRoutineList();
            }
        });
        return;
    }
    
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
    window.showAlert(`Rutina "${routineName}" creada con ${newRoutine.sessions.length} sesiones.`, 'Guardado');
    iaStep = 'config';
    window._iaPromptParams = null;
    window._iaPreviewData = null;
    renderIAAssistant();
    renderRoutineList();
}

function guardarSesionIA(result, params) {
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
                        title: result.nombre || `Sesión de ${params.goal || 'IA'}`,
                        content: result.sessions[0]?.content || '',
                        lastModified: Date.now(),
                        createdAt: Date.now()
                    }]
                };
                
                appData.routines.push(newRoutine);
                saveData();
                window.showAlert(`Sesión guardada en la rutina "${routineName}".`, 'Guardado');
                iaStep = 'config';
                window._iaPromptParams = null;
                window._iaPreviewData = null;
                renderIAAssistant();
                renderRoutineList();
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
            title: result.nombre || `Sesión de ${params.goal || 'IA'}`,
            content: result.sessions[0]?.content || '',
            lastModified: Date.now(),
            createdAt: Date.now()
        };
        
        selectedRoutine.sessions.push(newSession);
        saveData();
        window.showAlert(`Sesión guardada en la rutina "${selectedRoutine.name}".`, 'Guardado');
        iaStep = 'config';
        window._iaPromptParams = null;
        window._iaPreviewData = null;
        renderIAAssistant();
        renderRoutineList();
    });
}

// ==========================================================================
// IMPORTAR DESDE IA (JSON Directo)
// ==========================================================================

function openIAImport() {
    console.log('[ia-assistant] Abriendo importación desde IA');
    iaStep = 'import';
    renderIAAssistant();
}

function processIAImportDesdePantalla() {
    const textarea = document.getElementById('iaImportTextarea2');
    if (!textarea) return;
    
    const jsonText = textarea.value.trim();
    if (!jsonText) {
        window.showAlert('Por favor, pega el JSON generado por la IA.', 'Aviso');
        return;
    }
    
    try {
        // ============================================================
        // LIMPIEZA DE JSON TAMBIÉN PARA IMPORTACIÓN
        // ============================================================
        
        let cleanJsonText = jsonText;
        
        // Buscar un bloque JSON (entre llaves)
        const jsonMatch = cleanJsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleanJsonText = jsonMatch[0];
        }
        
        if (!cleanJsonText.startsWith('{')) {
            const startIndex = cleanJsonText.indexOf('{');
            if (startIndex !== -1) {
                const endIndex = cleanJsonText.lastIndexOf('}');
                if (endIndex !== -1 && endIndex > startIndex) {
                    cleanJsonText = cleanJsonText.substring(startIndex, endIndex + 1);
                }
            }
        }
        
        // Limpiar caracteres de control
        cleanJsonText = cleanJsonText.replace(/[\x00-\x1f\x7f-\x9f]/g, function(match) {
            if (match === '\n') return '\\n';
            if (match === '\r') return '\\r';
            if (match === '\t') return '\\t';
            return ' ';
        });
        
        const data = JSON.parse(cleanJsonText);
        
        if (!data.sessions || !Array.isArray(data.sessions) || data.sessions.length === 0) {
            window.showAlert('El JSON debe contener un array "sessions" con al menos una sesión.', 'Error de formato');
            return;
        }
        
        let hasErrors = false;
        data.sessions.forEach((session, index) => {
            if (!session.title || !session.content) {
                window.showAlert(`La sesión ${index + 1} no tiene "title" o "content".`, 'Error de formato');
                hasErrors = true;
            }
        });
        
        if (hasErrors) return;
        
        const nombre = data.nombre || 'Importación desde IA';
        const sesionesCount = data.sessions.length;
        
        window.showConfirm(
            `¿Importar "${nombre}" con ${sesionesCount} sesión(es)?`,
            'Confirmar importación'
        ).then(confirm => {
            if (!confirm) return;
            
            if (sesionesCount > 1) {
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
                window.showAlert(`Rutina "${nombre}" importada con ${sesionesCount} sesiones.`, 'Importación completada');
                iaStep = 'config';
                renderIAAssistant();
                renderRoutineList();
            } else {
                const session = data.sessions[0];
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
                            window.showAlert(`Sesión importada en la rutina "${routineName}".`, 'Importación completada');
                            iaStep = 'config';
                            renderIAAssistant();
                            renderRoutineList();
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
                    window.showAlert(`Sesión importada en la rutina "${selectedRoutine.name}".`, 'Importación completada');
                    iaStep = 'config';
                    renderIAAssistant();
                    renderRoutineList();
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
window.goBackToConfig = goBackToConfig;
window.goBackToPrompt = goBackToPrompt;
window.openIAImport = openIAImport;
window.selectIAType = selectIAType;
window.toggleIAExercise = toggleIAExercise;
window.toggleIAMaterial = toggleIAMaterial;
window.getIASelectedValue = getIASelectedValue;
window.generarPromptIA = generarPromptIA;
window.procesarRespuestaDesdePantalla = procesarRespuestaDesdePantalla;
window.guardarDesdePreview = guardarDesdePreview;
window.guardarRutinaIA = guardarRutinaIA;
window.guardarSesionIA = guardarSesionIA;
window.processIAImportDesdePantalla = processIAImportDesdePantalla;