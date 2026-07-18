<<<<<<< HEAD
/**
 * MÓDULO: exercises-import-export.js
 * Importación y exportación de ejercicios
 * 
 * MODIFICADO: Nombres de archivo exportados: GN_Ejercicios_fecha_hora.json
 */

// ==========================================================================
// EXPORTAR EJERCICIOS
// ==========================================================================

function exportAllExercises() {
    const exercises = getExercises();
    if (exercises.length === 0) {
        window.showAlert('No hay ejercicios para exportar.', 'Exportar');
        return;
    }
    const clean = {
        tipo: 'ejercicios_export',
        ejercicios: exercises
    };
    const dataStr = JSON.stringify(clean, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GN_Ejercicios_${getExerciseTimestamp()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.showAlert('Ejercicios exportados correctamente.', 'Exportar');
}

function exportSingleExercise(exercise) {
    const clean = {
        tipo: 'ejercicio_individual',
        ejercicio: {
            id: exercise.id,
            nombre: exercise.nombre,
            grupo: exercise.grupo || '',
            img: exercise.img || '',
            video: exercise.video || '',
            notas: exercise.notas || ''
        }
    };
    const dataStr = JSON.stringify(clean, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GN_Ejercicios_${getExerciseTimestamp()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ==========================================================================
// IMPORTAR EJERCICIOS
// ==========================================================================

function importExercisesFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            let exercisesToImport = [];

            if (data.tipo === 'ejercicios_export' && Array.isArray(data.ejercicios)) {
                exercisesToImport = data.ejercicios;
            } else if (Array.isArray(data) && data.length > 0 && data[0].nombre) {
                exercisesToImport = data;
            } else if (data.ejercicio && data.ejercicio.nombre) {
                exercisesToImport = [data.ejercicio];
            } else {
                throw new Error('El archivo no tiene un formato de ejercicios válido.');
            }

            const currentExercises = getExercises();
            const existingNames = new Set(currentExercises.map(ex => ex.nombre.toLowerCase().trim()));

            const duplicates = exercisesToImport.filter(ex => 
                existingNames.has(ex.nombre.toLowerCase().trim())
            );

            if (duplicates.length > 0) {
                const action = await window.showConfirm(
                    `${duplicates.length} ejercicio(s) ya existen en tu lista. ¿Deseas sobreescribirlos?`,
                    'Ejercicios duplicados'
                );
                
                if (action) {
                    exercisesToImport.forEach(imported => {
                        const idx = currentExercises.findIndex(ex => 
                            ex.nombre.toLowerCase().trim() === imported.nombre.toLowerCase().trim()
                        );
                        if (idx >= 0) {
                            currentExercises[idx] = { ...imported, id: currentExercises[idx].id };
                        } else {
                            currentExercises.push({ ...imported, id: generateExerciseId() });
                        }
                    });
                } else {
                    exercisesToImport.forEach(imported => {
                        currentExercises.push({ ...imported, id: generateExerciseId() });
                    });
                }
            } else {
                exercisesToImport.forEach(imported => {
                    currentExercises.push({ ...imported, id: generateExerciseId() });
                });
            }

            setExercises(currentExercises);
            renderExercises();
            window.showAlert(`Se importaron ${exercisesToImport.length} ejercicios.`, 'Importación completada');

        } catch (err) {
            window.showAlert('Error al leer el archivo: ' + err.message, 'Error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ==========================================================================
// UTILIDADES
// ==========================================================================

function getExerciseTimestamp() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}`;
}

function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode('0x' + p1)));
}

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.exportAllExercises = exportAllExercises;
window.exportSingleExercise = exportSingleExercise;
=======
/**
 * MÓDULO: exercises-import-export.js
 * Importación y exportación de ejercicios
 * 
 * MODIFICADO: Nombres de archivo exportados: GN_Ejercicios_fecha_hora.json
 */

// ==========================================================================
// EXPORTAR EJERCICIOS
// ==========================================================================

function exportAllExercises() {
    const exercises = getExercises();
    if (exercises.length === 0) {
        window.showAlert('No hay ejercicios para exportar.', 'Exportar');
        return;
    }
    const clean = {
        tipo: 'ejercicios_export',
        ejercicios: exercises
    };
    const dataStr = JSON.stringify(clean, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GN_Ejercicios_${getExerciseTimestamp()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.showAlert('Ejercicios exportados correctamente.', 'Exportar');
}

function exportSingleExercise(exercise) {
    const clean = {
        tipo: 'ejercicio_individual',
        ejercicio: {
            id: exercise.id,
            nombre: exercise.nombre,
            grupo: exercise.grupo || '',
            img: exercise.img || '',
            video: exercise.video || '',
            notas: exercise.notas || ''
        }
    };
    const dataStr = JSON.stringify(clean, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GN_Ejercicios_${getExerciseTimestamp()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ==========================================================================
// IMPORTAR EJERCICIOS
// ==========================================================================

function importExercisesFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            let exercisesToImport = [];

            if (data.tipo === 'ejercicios_export' && Array.isArray(data.ejercicios)) {
                exercisesToImport = data.ejercicios;
            } else if (Array.isArray(data) && data.length > 0 && data[0].nombre) {
                exercisesToImport = data;
            } else if (data.ejercicio && data.ejercicio.nombre) {
                exercisesToImport = [data.ejercicio];
            } else {
                throw new Error('El archivo no tiene un formato de ejercicios válido.');
            }

            const currentExercises = getExercises();
            const existingNames = new Set(currentExercises.map(ex => ex.nombre.toLowerCase().trim()));

            const duplicates = exercisesToImport.filter(ex => 
                existingNames.has(ex.nombre.toLowerCase().trim())
            );

            if (duplicates.length > 0) {
                const action = await window.showConfirm(
                    `${duplicates.length} ejercicio(s) ya existen en tu lista. ¿Deseas sobreescribirlos?`,
                    'Ejercicios duplicados'
                );
                
                if (action) {
                    exercisesToImport.forEach(imported => {
                        const idx = currentExercises.findIndex(ex => 
                            ex.nombre.toLowerCase().trim() === imported.nombre.toLowerCase().trim()
                        );
                        if (idx >= 0) {
                            currentExercises[idx] = { ...imported, id: currentExercises[idx].id };
                        } else {
                            currentExercises.push({ ...imported, id: generateExerciseId() });
                        }
                    });
                } else {
                    exercisesToImport.forEach(imported => {
                        currentExercises.push({ ...imported, id: generateExerciseId() });
                    });
                }
            } else {
                exercisesToImport.forEach(imported => {
                    currentExercises.push({ ...imported, id: generateExerciseId() });
                });
            }

            setExercises(currentExercises);
            renderExercises();
            window.showAlert(`Se importaron ${exercisesToImport.length} ejercicios.`, 'Importación completada');

        } catch (err) {
            window.showAlert('Error al leer el archivo: ' + err.message, 'Error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ==========================================================================
// UTILIDADES
// ==========================================================================

function getExerciseTimestamp() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}`;
}

function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode('0x' + p1)));
}

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.exportAllExercises = exportAllExercises;
window.exportSingleExercise = exportSingleExercise;
>>>>>>> a0e06567d66fb0b2bcaca3a4ed517c8aee665a60
window.importExercisesFromFile = importExercisesFromFile;