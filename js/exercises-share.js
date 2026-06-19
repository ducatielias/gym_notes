/**
 * MÓDULO: exercises-share.js
 * Compartir ejercicios individuales
 */

// ==========================================================================
// COMPARTIR EJERCICIO
// ==========================================================================

async function shareExercise(id) {
    const exercise = getExercises().find(ex => ex.id === id);
    if (!exercise) return;

    const action = await window.showExerciseShareDialog(exercise);
    
    if (action === 'file') {
        exportSingleExercise(exercise);
    } else if (action === 'share') {
        shareExerciseViaWeb(exercise);
    }
}

async function shareExerciseViaWeb(exercise) {
    const data = b64EncodeUnicode(JSON.stringify({
        n: exercise.nombre,
        g: exercise.grupo || '',
        i: exercise.img || '',
        v: exercise.video || '',
        t: exercise.notas || ''
    }));
    const url = `${window.location.origin}${window.location.pathname}?share-exercise=${data}`;
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: exercise.nombre,
                text: `Ejercicio: ${exercise.nombre}`,
                url: url
            });
        } catch (e) {
            // Usuario canceló
        }
    } else {
        try {
            await navigator.clipboard.writeText(url);
            window.showAlert('Enlace copiado al portapapeles.', 'Compartir');
        } catch {
            window.showAlert(`Comparte este enlace: ${url}`, 'Compartir');
        }
    }
}

// ==========================================================================
// DIALOGO DE COMPARTIR
// ==========================================================================

window.showExerciseShareDialog = function(exercise) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'exercise-share-dialog';
        overlay.style.display = 'flex';
        overlay.style.zIndex = '3000';
        
        overlay.innerHTML = `
            <div class="modal-container" style="max-width: 300px;">
                <div class="modal-header">
                    <span class="modal-icon"><i class="fa-solid fa-share-nodes"></i></span>
                    <h3>Compartir ejercicio</h3>
                </div>
                <div class="modal-body">
                    <p style="font-weight: 600; margin-bottom: 16px;">"${exercise.nombre}"</p>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <button id="share-file-btn" class="modal-btn modal-btn-primary" style="width: 100%; text-align: center;">
                            <i class="fa-solid fa-file-export"></i> Guardar archivo
                        </button>
                        <button id="share-link-btn" class="modal-btn" style="width: 100%; text-align: center; background: #e3f2fd; color: #0d47a1;">
                            <i class="fa-solid fa-link"></i> Compartir enlace
                        </button>
                        <button id="share-cancel-btn" class="modal-btn modal-btn-secondary" style="width: 100%; text-align: center;">
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        document.getElementById('share-file-btn').onclick = () => {
            overlay.remove();
            resolve('file');
        };
        
        document.getElementById('share-link-btn').onclick = () => {
            overlay.remove();
            resolve('share');
        };
        
        document.getElementById('share-cancel-btn').onclick = () => {
            overlay.remove();
            resolve(null);
        };
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                resolve(null);
            }
        });
    });
};

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.shareExercise = shareExercise;
window.shareExerciseViaWeb = shareExerciseViaWeb;