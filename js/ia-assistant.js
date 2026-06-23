/**
 * MÓDULO: ia-assistant.js
 * Controla la pantalla de Asistente IA para creación de rutinas, sesiones y contenido multimedia.
 * 
 * FUNCIONALIDADES:
 * - 3 modos: Rutina, Sesión, Media (analizar imagen/video/texto para extraer sesión)
 * - Expandibles con checklist para Ejercicios y Material (ocultos en modo Media)
 * - Textarea normal para notas adicionales
 * - Al seleccionar Media, se ocultan: Ejercicios, Material, Nivel, Duración, Objetivo
 * - Generar prompt personalizado según el modo seleccionado
 * - Copiar prompt para usar en IA externa
 * - Pegar respuesta de IA y procesarla (para rutinas/sesiones)
 * - Guardar como rutina o sesión
 * 
 * ESTRUCTURA DEL FLUJO:
 * Configuración → Prompt → Vista Previa (solo rutinas/sesiones) → Guardado
 */

// ==========================================================================
// ESTADO GLOBAL
// ==========================================================================

let iaCurrentMode = 'routine'; // 'routine' | 'session' | 'media'
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
// NAVEGACIÓN PRINCIPAL
// ==========================================================================

function openIAAssistant() {
    console.log('[ia-assistant] Abriendo asistente IA');
    iaStep = 'config';
    iaSelectedExercises = [];
    iaSelectedMaterials = [];
    switchTab('ia-assistant');
    renderIAAssistant();
}

function renderIAAssistant() {
    const container = document.getElementById('ia-assistant-ui');
    if (!container) {
        console.error('[ia-assistant] Contenedor ia-assistant-ui no encontrado');
        return;
    }

    switch (iaStep) {
        case 'config':
            renderConfigScreen(container);
            break;
        case 'prompt':
            renderPromptScreen(container);
            break;
        case 'preview':
            renderPreviewScreen(container);
            break;
        case 'import':
            renderImportScreen(container);
            break;
        default:
            renderConfigScreen(container);
    }
}

// ==========================================================================
// FUNCIONES DE NAVEGACIÓN INTERNA
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
// PANTALLA 1: CONFIGURACIÓN
// ==========================================================================

function renderConfigScreen(container) {
    const exercises = typeof window.getExercises === 'function' ? window.getExercises() : [];

    container.innerHTML = `
        <header class="ia-header">
            <div class="ia-header-top">
                <button class="btn-ia-back" onclick="goBackFromIA()">
                    <i class="fa-solid fa-chevron-left"></i> Volver
                </button>
                <h1><i class="fa-solid fa-robot"></i> Asistente IA</h1>
                <div style="width:40px;"></div>
            </div>
            <p>Configura tus preferencias y genera un prompt para usar con tu IA favorita.</p>
        </header>

        <div class="ia-container">
            ${renderConfigTipo()}
            <div id="iaOpcionesConfigurables">
                ${renderConfigEjercicios(exercises)}
                ${renderConfigMaterial()}
                ${renderConfigNivel()}
                ${renderConfigDuracion()}
                ${renderConfigFrecuencia()}
                ${renderConfigObjetivo()}
            </div>
            ${renderConfigNotas()}
            ${renderConfigBotones()}
        </div>
    `;

    // Inicializar valores por defecto después de renderizar
    setTimeout(() => {
        const defaults = [
            { group: 'iaLevelGroup', value: 'Intermedio' },
            { group: 'iaDurationGroup', value: '60 min' },
            { group: 'iaFrequencyGroup', value: '3 días' },
            { group: 'iaGoalGroup', value: 'Hipertrofia' }
        ];
        defaults.forEach(({ group, value }) => {
            const groupEl = document.getElementById(group);
            if (groupEl) {
                const target = groupEl.querySelector(`.ia-option-btn[data-value="${value}"]`);
                if (target) {
                    target.classList.add('selected');
                    target.setAttribute('data-selected', 'true');
                }
            }
        });

        // Configurar listeners de tipo
        document.querySelectorAll('#iaTypeGroup .ia-type-btn').forEach(btn => {
            btn.addEventListener('click', function() { selectIAType(this); });
        });

        // Configurar listeners de ejercicios (checkboxes)
        document.querySelectorAll('.ia-exercise-check').forEach(cb => {
            cb.addEventListener('change', function() { toggleIAExerciseCheck(this); });
        });

        // Configurar listeners de materiales (checkboxes)
        document.querySelectorAll('.ia-material-check').forEach(cb => {
            cb.addEventListener('change', function() { toggleIAMaterialCheck(this); });
        });

        // Configurar listeners de selección única
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

        // Aplicar estado inicial según el modo
        actualizarOpcionesSegunModo(iaCurrentMode);
    }, 100);
}

function renderConfigTipo() {
    return `
        <div class="ia-section">
            <div class="ia-section-title">Tipo de creación</div>
            <div class="ia-option-group" id="iaTypeGroup">
                <button class="ia-option-btn ia-type-btn selected" data-mode="routine" data-group="type">
                    <i class="fa-solid fa-layer-group"></i> Rutina
                </button>
                <button class="ia-option-btn ia-type-btn" data-mode="session" data-group="type">
                    <i class="fa-solid fa-dumbbell"></i> Sesión
                </button>
                <button class="ia-option-btn ia-type-btn" data-mode="media" data-group="type">
                    <i class="fa-solid fa-image"></i> Media
                </button>
            </div>
        </div>
    `;
}

function renderConfigEjercicios(exercises) {
    const exercisesHtml = exercises.length > 0 
        ? exercises.map(ex => `
            <label class="muscle-check">
                <input type="checkbox" class="ia-exercise-check" data-id="${ex.id}">
                <span class="muscle-label">${ex.nombre}</span>
            </label>
        `).join('')
        : '<p style="font-size:13px; color:#9ca3af; padding:8px 0;">No hay ejercicios guardados. Ve a "Ejercicios" para crear algunos.</p>';

    return `
        <div id="iaEjerciciosWrapper" class="ia-section">
            <button type="button" class="ia-expand-toggle" onclick="toggleIAExpand('iaExercisesContainer', 'iaExercisesIcon')">
                <i class="fa-solid fa-chevron-right" id="iaExercisesIcon"></i>
                Ejercicios a incluir <span style="font-weight:400; color:#9ca3af; font-size:12px;">(opcional)</span>
            </button>
            <div id="iaExercisesContainer" class="ia-expand-container">
                <div class="ia-expand-content">
                    ${exercisesHtml}
                </div>
            </div>
        </div>
    `;
}

function renderConfigMaterial() {
    return `
        <div id="iaMaterialWrapper" class="ia-section">
            <button type="button" class="ia-expand-toggle" onclick="toggleIAExpand('iaMaterialsContainer', 'iaMaterialsIcon')">
                <i class="fa-solid fa-chevron-right" id="iaMaterialsIcon"></i>
                Material disponible <span style="font-weight:400; color:#9ca3af; font-size:12px;">(opcional)</span>
            </button>
            <div id="iaMaterialsContainer" class="ia-expand-container">
                <div class="ia-expand-content ia-material-grid">
                    ${IA_MATERIALS.map(m => `
                        <label class="muscle-check">
                            <input type="checkbox" class="ia-material-check" data-value="${m}">
                            <span class="muscle-label">${m}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function renderConfigNivel() {
    return `
        <div id="iaNivelWrapper" class="ia-section">
            <div class="ia-section-title">Nivel</div>
            <div class="ia-option-group" id="iaLevelGroup">
                ${IA_LEVELS.map(l => `<button class="ia-option-btn" data-value="${l}" data-group="level">${l}</button>`).join('')}
            </div>
        </div>
    `;
}

function renderConfigDuracion() {
    return `
        <div id="iaDuracionWrapper" class="ia-section">
            <div class="ia-section-title">Duración estimada</div>
            <div class="ia-option-group" id="iaDurationGroup">
                ${IA_DURATIONS.map(d => `<button class="ia-option-btn" data-value="${d}" data-group="duration">${d}</button>`).join('')}
            </div>
        </div>
    `;
}

function renderConfigFrecuencia() {
    return `
        <div id="iaFrecuenciaWrapper" class="ia-section">
            <div class="ia-section-title" id="iaFrequencyTitle">Frecuencia semanal</div>
            <div class="ia-option-group" id="iaFrequencyGroup">
                ${IA_FREQUENCIES.map(f => `<button class="ia-option-btn" data-value="${f}" data-group="frequency">${f}</button>`).join('')}
            </div>
        </div>
    `;
}

function renderConfigObjetivo() {
    return `
        <div id="iaObjetivoWrapper" class="ia-section">
            <div class="ia-section-title">Objetivo principal</div>
            <div class="ia-option-group" id="iaGoalGroup">
                ${IA_GOALS.map(g => `<button class="ia-option-btn" data-value="${g}" data-group="goal">${g}</button>`).join('')}
            </div>
        </div>
    `;
}

function renderConfigNotas() {
    return `
        <div class="ia-section">
            <div class="ia-section-title">Contenido a analizar</div>
            <textarea id="iaNotesInput" class="ia-textarea" placeholder="Describe aquí la imagen, video o pega el texto de la rutina que quieres analizar..."></textarea>
        </div>
    `;
}

function renderConfigBotones() {
    return `
        <button onclick="generarPromptIA()" class="ia-btn ia-btn-primary">
            <i class="fa-solid fa-copy"></i> Generar prompt
        </button>
        <div class="ia-divider">o también</div>
        <button onclick="openIAImport()" class="ia-btn ia-btn-import">
            <i class="fa-solid fa-file-import"></i> Importar desde IA (JSON)
        </button>
    `;
}

// ==========================================================================
// ACTUALIZAR OPCIONES SEGÚN MODO
// ==========================================================================

function actualizarOpcionesSegunModo(mode) {
    const isMedia = mode === 'media';
    
    // Elementos a ocultar/mostrar en modo Media
    const elementos = [
        { id: 'iaEjerciciosWrapper', display: isMedia ? 'none' : '' },
        { id: 'iaMaterialWrapper', display: isMedia ? 'none' : '' },
        { id: 'iaNivelWrapper', display: isMedia ? 'none' : '' },
        { id: 'iaDuracionWrapper', display: isMedia ? 'none' : '' },
        { id: 'iaFrecuenciaWrapper', display: isMedia ? 'none' : '' },
        { id: 'iaObjetivoWrapper', display: isMedia ? 'none' : '' }
    ];
    
    elementos.forEach(({ id, display }) => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = display;
        }
    });
    
    // Gestión de frecuencia para modo session
    const frequencyTitle = document.getElementById('iaFrequencyTitle');
    const frequencyGroup = document.getElementById('iaFrequencyGroup');
    const frecuenciaWrapper = document.getElementById('iaFrecuenciaWrapper');
    
    if (mode === 'routine' && !isMedia) {
        if (frequencyTitle) frequencyTitle.style.display = '';
        if (frequencyGroup) frequencyGroup.style.display = '';
        if (frecuenciaWrapper) frecuenciaWrapper.style.display = '';
    } else {
        if (frequencyTitle) frequencyTitle.style.display = 'none';
        if (frequencyGroup) frequencyGroup.style.display = 'none';
        if (frecuenciaWrapper) frecuenciaWrapper.style.display = 'none';
    }
}

// ==========================================================================
// EXPANDIBLES
// ==========================================================================

function toggleIAExpand(containerId, iconId) {
    const container = document.getElementById(containerId);
    const icon = document.getElementById(iconId);
    
    if (!container) return;
    
    if (container.classList.contains('open')) {
        container.classList.remove('open');
        if (icon) icon.style.transform = 'rotate(0deg)';
    } else {
        container.classList.add('open');
        if (icon) icon.style.transform = 'rotate(90deg)';
    }
}

// ==========================================================================
// LÓGICA DE SELECCIÓN
// ==========================================================================

function selectIAType(element) {
    document.querySelectorAll('#iaTypeGroup .ia-type-btn').forEach(btn => {
        btn.classList.remove('selected');
        btn.removeAttribute('data-selected');
    });
    element.classList.add('selected');
    element.setAttribute('data-selected', 'true');
    
    iaCurrentMode = element.dataset.mode;
    
    // Actualizar opciones según el modo seleccionado
    actualizarOpcionesSegunModo(iaCurrentMode);
}

function toggleIAExerciseCheck(checkbox) {
    const id = checkbox.dataset.id;
    if (checkbox.checked) {
        if (!iaSelectedExercises.includes(id)) iaSelectedExercises.push(id);
    } else {
        iaSelectedExercises = iaSelectedExercises.filter(exId => exId !== id);
    }
}

function toggleIAMaterialCheck(checkbox) {
    const material = checkbox.dataset.value;
    if (checkbox.checked) {
        if (!iaSelectedMaterials.includes(material)) iaSelectedMaterials.push(material);
    } else {
        iaSelectedMaterials = iaSelectedMaterials.filter(m => m !== material);
    }
}

function getIASelectedValue(groupId) {
    const group = document.getElementById(groupId);
    if (!group) return null;

    const selected = group.querySelector('.ia-option-btn.selected, .ia-option-btn[data-selected="true"]');
    if (selected) return selected.dataset.value;
    
    const firstBtn = group.querySelector('.ia-option-btn');
    return firstBtn ? firstBtn.dataset.value : null;
}

// ==========================================================================
// GENERACIÓN DEL PROMPT (SEGÚN MODO)
// ==========================================================================

function generarPromptIA() {
    console.log('[ia-assistant] Generando prompt...');
    
    const mode = iaCurrentMode || 'routine';
    const level = getIASelectedValue('iaLevelGroup') || 'Intermedio';
    const duration = getIASelectedValue('iaDurationGroup') || '60 min';
    const goal = getIASelectedValue('iaGoalGroup') || 'Hipertrofia';
    const frequency = mode === 'routine' ? (getIASelectedValue('iaFrequencyGroup') || '3 días') : null;
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
        mode: mode,
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

function generarPromptTexto(params) {
    const mode = params.mode;
    const isRoutine = mode === 'routine';
    const isSession = mode === 'session';
    const isMedia = mode === 'media';
    
    let prompt = '';
    
    // ============================================================
    // MODO RUTINA / SESIÓN
    // ============================================================
    if (isRoutine || isSession) {
        prompt = `Actúa como un entrenador personal experto. Créame ${isRoutine ? 'una rutina de entrenamiento' : 'una sesión de entrenamiento'} de gimnasio.\n\n`;
        
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
    }
    
    // ============================================================
    // MODO MEDIA (Analizar imagen, video o texto)
    // ============================================================
    if (isMedia) {
        const contenido = params.notes || '';
        
        prompt = `Actúa como un analista experto en entrenamiento de gimnasio.\n\n`;
        prompt += `🎯 OBJETIVO:\n`;
        prompt += `A partir del contenido que el usuario te proporciona, debes ANALIZAR y EXTRAER la rutina o sesión de entrenamiento que contiene.\n\n`;
        prompt += `📥 TIPO DE CONTENIDO:\n`;
        prompt += `El usuario te proporcionará UNO de estos tipos de contenido:\n`;
        prompt += `- 📷 Una IMAGEN: describe la imagen (ejercicios que se ven, material, técnica, etc.)\n`;
        prompt += `- 🎬 Un VIDEO: describe lo que se ve en el video (ejercicios, series, repeticiones, etc.)\n`;
        prompt += `- 📄 Un TEXTO: pega directamente el texto de una rutina o sesión\n\n`;
        prompt += `📝 CONTENIDO A ANALIZAR:\n`;
        if (contenido) {
            prompt += `${contenido}\n\n`;
        } else {
            prompt += `[El usuario pegará aquí la descripción de la imagen, video o el texto de la rutina]\n\n`;
        }
        prompt += `📤 FORMATO DE RESPUESTA:\n`;
        prompt += `Debes analizar el contenido y devolverme ÚNICAMENTE un objeto JSON válido con la rutina o sesión extraída:\n\n`;
        prompt += `{\n`;
        prompt += `  "nombre": "Nombre de la rutina o sesión extraída",\n`;
        prompt += `  "tipo": "rutina" o "sesion",\n`;
        prompt += `  "sessions": [\n`;
        prompt += `    {\n`;
        prompt += `      "title": "Título de la sesión",\n`;
        prompt += `      "content": "<b>Ejercicio</b><br>(x4) 8-12 repeticiones\\n\\n<b>Ejercicio 2</b><br>(x3) 10-12 repeticiones"\n`;
        prompt += `    }\n`;
        prompt += `  ]\n`;
        prompt += `}\n\n`;
        prompt += `⚠️ IMPORTANTE:\n`;
        prompt += `- Si el contenido es una imagen o video, describe lo que ves y extrae la información.\n`;
        prompt += `- Si el contenido es texto, analiza el formato y conviértelo al formato JSON.\n`;
        prompt += `- No incluyas texto adicional, solo el JSON.\n`;
        prompt += `- Escapa los saltos de línea como \\n dentro de las cadenas.\n`;
        prompt += `- Asegúrate de que todas las comillas sean dobles (").`;
    }
    
    return prompt;
}

// ==========================================================================
// PANTALLA 2: PROMPT
// ==========================================================================

function renderPromptScreen(container) {
    const params = window._iaPromptParams;
    if (!params) {
        iaStep = 'config';
        renderIAAssistant();
        return;
    }

    const prompt = generarPromptTexto(params);
    const isMedia = params.mode === 'media';

    container.innerHTML = `
        <header class="ia-header">
            <div class="ia-header-top">
                <button class="btn-ia-back" onclick="goBackToConfig()">
                    <i class="fa-solid fa-chevron-left"></i> Volver
                </button>
                <h1><i class="fa-solid fa-robot"></i> Asistente IA</h1>
                <div style="width:40px;"></div>
            </div>
            <p>Copia el prompt, pégalo en tu IA favorita y pega la respuesta abajo.</p>
        </header>

        <div class="ia-container">
            <div class="ia-section">
                <div style="margin-bottom:12px;">
                    <div class="ia-section-title">📋 Prompt generado</div>
                    <textarea id="iaPromptTextarea" class="ia-prompt-textarea" readonly>${escapeHtml(prompt)}</textarea>
                    <button onclick="copiarPrompt()" style="margin-top:8px; padding:8px 16px; background:var(--accent-color, #ccff00); color:var(--primary-color, #000000); border:none; border-radius:8px; font-weight:600; cursor:pointer; font-size:13px;">
                        <i class="fa-solid fa-copy"></i> Copiar prompt
                    </button>
                </div>

                <div style="border-top:1px solid #f3f4f6; padding-top:16px; margin-top:8px;">
                    <div class="ia-section-title">📥 Pega aquí la respuesta de tu IA</div>
                    <textarea id="iaRespuestaTextarea" class="ia-prompt-textarea" style="min-height:120px; background:#fafafa;" placeholder='Pega aquí el JSON que te devuelva la IA...'></textarea>
                    <button onclick="${isMedia ? 'procesarRespuestaMedia()' : 'procesarRespuestaDesdePantalla()'}" style="margin-top:8px; width:100%; padding:12px; background:var(--accent-color, #ccff00); color:var(--primary-color, #000000); border:none; border-radius:12px; font-weight:700; cursor:pointer; font-size:14px;">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> Procesar respuesta
                    </button>
                </div>
            </div>
        </div>
    `;
}

function copiarPrompt() {
    const textarea = document.getElementById('iaPromptTextarea');
    if (!textarea) return;
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

// ==========================================================================
// PROCESAMIENTO DE RESPUESTA (CON LIMPIEZA DE JSON)
// ==========================================================================

function limpiarYParsearJSON(texto) {
    let jsonText = texto.trim();
    
    // Buscar un bloque JSON (entre llaves)
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonText = jsonMatch[0];
    
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
    
    // Limpiar caracteres de control (manteniendo saltos de línea)
    jsonText = jsonText.replace(/[\x00-\x1f\x7f-\x9f]/g, function(match) {
        if (match === '\n') return '\\n';
        if (match === '\r') return '\\r';
        if (match === '\t') return '\\t';
        return ' ';
    });
    
    return JSON.parse(jsonText);
}

function procesarRespuestaDesdePantalla() {
    const textarea = document.getElementById('iaRespuestaTextarea');
    if (!textarea) return;
    
    const jsonText = textarea.value.trim();
    if (!jsonText) {
        window.showAlert('Por favor, pega la respuesta JSON de tu IA.', 'Aviso');
        return;
    }
    
    try {
        let data = limpiarYParsearJSON(jsonText);
        
        // Si el JSON tiene una propiedad "respuesta" anidada
        if (data.respuesta && typeof data.respuesta === 'string') {
            try {
                data = limpiarYParsearJSON(data.respuesta);
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

function procesarRespuestaMedia() {
    const textarea = document.getElementById('iaRespuestaTextarea');
    if (!textarea) return;
    
    const jsonText = textarea.value.trim();
    if (!jsonText) {
        window.showAlert('Por favor, pega la respuesta JSON de tu IA.', 'Aviso');
        return;
    }
    
    try {
        let data = limpiarYParsearJSON(jsonText);
        
        // Si el JSON tiene una propiedad "respuesta" anidada
        if (data.respuesta && typeof data.respuesta === 'string') {
            try {
                data = limpiarYParsearJSON(data.respuesta);
            } catch (e) {}
        }
        
        // Validar estructura para Media
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
        
        // Mostrar resultado en un alert
        const nombre = data.nombre || 'Sesión extraída';
        const sesionesCount = data.sessions.length;
        let previewText = `📋 ${nombre}\n📊 ${sesionesCount} sesión(es)\n\n`;
        data.sessions.forEach((session, idx) => {
            const plainText = session.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            previewText += `📌 ${session.title}\n${plainText.substring(0, 200)}${plainText.length > 200 ? '...' : ''}\n\n`;
        });
        
        window.showAlert(previewText, '📥 Contenido extraído');
        
        // Preguntar si quiere guardar la sesión
        window.showConfirm(
            `¿Quieres guardar "${nombre}" como una nueva sesión?`,
            'Guardar sesión'
        ).then(confirm => {
            if (confirm) {
                // Guardar como sesión
                const params = window._iaPromptParams || { mode: 'media' };
                guardarSesionIA(data, params);
            }
        });
        
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
// PANTALLA 3: VISTA PREVIA (SOLO PARA RUTINAS/SESIONES)
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
    
    let previewText = `📋 ${nombre}\n📊 ${sesionesCount} sesión(es)\n\n`;
    result.sessions.forEach((session, idx) => {
        const plainText = session.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        previewText += `📌 ${session.title}\n${plainText.substring(0, 200)}${plainText.length > 200 ? '...' : ''}\n\n`;
    });

    container.innerHTML = `
        <header class="ia-header">
            <div class="ia-header-top">
                <button class="btn-ia-back" onclick="goBackToPrompt()">
                    <i class="fa-solid fa-chevron-left"></i> Volver
                </button>
                <h1><i class="fa-solid fa-robot"></i> Asistente IA</h1>
                <div style="width:40px;"></div>
            </div>
            <p>Revisa el contenido generado y decide qué hacer.</p>
        </header>

        <div class="ia-container">
            <div class="ia-section">
                <div class="ia-section-title">📄 Vista previa</div>
                <div class="ia-preview-content">${previewText}</div>

                <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px;">
                    <span class="ia-preview-badge">${isRoutine ? '📋 Rutina' : '📝 Sesión'}</span>
                    <span class="ia-preview-badge">📄 ${sesionesCount} sesión(es)</span>
                </div>

                <div class="ia-preview-actions">
                    <button onclick="cancelarPreview()" class="ia-btn ia-btn-secondary">Cancelar</button>
                    <button onclick="guardarDesdePreview()" class="ia-btn ia-btn-primary">
                        <i class="fa-solid fa-floppy-disk"></i> Guardar
                    </button>
                </div>
            </div>
        </div>
    `;
}

function cancelarPreview() {
    iaStep = 'prompt';
    window._iaPreviewData = null;
    renderIAAssistant();
}

// ==========================================================================
// PANTALLA 4: IMPORTACIÓN DIRECTA
// ==========================================================================

function renderImportScreen(container) {
    container.innerHTML = `
        <header class="ia-header">
            <div class="ia-header-top">
                <button class="btn-ia-back" onclick="goBackToConfig()">
                    <i class="fa-solid fa-chevron-left"></i> Volver
                </button>
                <h1><i class="fa-solid fa-file-import"></i> Importar desde IA</h1>
                <div style="width:40px;"></div>
            </div>
            <p>Pega directamente el JSON generado por tu IA favorita.</p>
        </header>

        <div class="ia-container">
            <div class="ia-section">
                <p style="font-size:14px; color:#6b7280; margin-bottom:16px;">
                    Pega el JSON generado por tu IA favorita (ChatGPT, Claude, etc.) siguiendo el formato de sesiones.
                </p>
                <div class="ia-section-title">JSON de la sesión/rutina</div>
                <textarea id="iaImportTextarea" class="ia-import-json" placeholder='{
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
                    <code class="ia-code-block" style="display:block; margin-top:4px; background:#fff; padding:8px; border-radius:6px; white-space:pre-wrap;">
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
                <button onclick="processIAImportDesdePantalla()" class="ia-btn ia-btn-primary" style="margin-top:16px;">
                    <i class="fa-solid fa-file-import"></i> Importar
                </button>
            </div>
        </div>
    `;
}

// ==========================================================================
// PROCESAMIENTO DE IMPORTACIÓN DIRECTA
// ==========================================================================

function openIAImport() {
    console.log('[ia-assistant] Abriendo importación desde IA');
    iaStep = 'import';
    renderIAAssistant();
}

function processIAImportDesdePantalla() {
    const textarea = document.getElementById('iaImportTextarea');
    if (!textarea) return;
    
    const jsonText = textarea.value.trim();
    if (!jsonText) {
        window.showAlert('Por favor, pega el JSON generado por la IA.', 'Aviso');
        return;
    }
    
    try {
        const data = limpiarYParsearJSON(jsonText);
        
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
// GUARDADO DESDE VISTA PREVIA
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
// UTILIDADES
// ==========================================================================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
window.toggleIAExerciseCheck = toggleIAExerciseCheck;
window.toggleIAMaterialCheck = toggleIAMaterialCheck;
window.getIASelectedValue = getIASelectedValue;
window.generarPromptIA = generarPromptIA;
window.generarPromptTexto = generarPromptTexto;
window.copiarPrompt = copiarPrompt;
window.procesarRespuestaDesdePantalla = procesarRespuestaDesdePantalla;
window.procesarRespuestaMedia = procesarRespuestaMedia;
window.limpiarYParsearJSON = limpiarYParsearJSON;
window.guardarDesdePreview = guardarDesdePreview;
window.cancelarPreview = cancelarPreview;
window.guardarRutinaIA = guardarRutinaIA;
window.guardarSesionIA = guardarSesionIA;
window.processIAImportDesdePantalla = processIAImportDesdePantalla;
window.toggleIAExpand = toggleIAExpand;
window.actualizarOpcionesSegunModo = actualizarOpcionesSegunModo;