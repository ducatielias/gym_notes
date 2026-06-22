/**
 * MÓDULO: back-handler.js
 * Controla el comportamiento del botón de retroceso físico/gestual en teléfonos
 * 
 * Esta funcionalidad previene que el usuario salga accidentalmente de la aplicación
 * al presionar el botón de retroceso en dispositivos móviles.
 * 
 * MODIFICADO: Ahora deshabilita completamente el botón de retroceso,
 * manteniendo al usuario siempre dentro de la aplicación.
 */

// ==========================================================================
// CONFIGURACIÓN DEL CONTROL DE RETROCESO
// ==========================================================================

function initBackHandler() {
    console.log('[back-handler] Inicializando control de retroceso...');
    
    // Añadir un estado al historial para crear un punto de anclaje
    // Esto evita que el usuario salga de la app con el botón de retroceso
    if (window.history && window.history.pushState) {
        // Crear un estado base en el historial
        const stateObj = { 
            app: 'gym-notes',
            timestamp: Date.now(),
            preventBack: true
        };
        
        // Reemplazar el estado actual con nuestro estado personalizado
        history.replaceState(stateObj, '', location.href);
        
        // Añadir un estado adicional para que siempre haya un estado previo
        // que evite la salida de la app
        const extraState = {
            app: 'gym-notes',
            preventBack: true,
            extra: true
        };
        history.pushState(extraState, '', location.href);
        
        // Configurar el listener de popstate (evento que se dispara al presionar retroceso)
        window.addEventListener('popstate', handleBackEvent);
        
        console.log('[back-handler] Control de retroceso configurado correctamente');
    } else {
        console.warn('[back-handler] API History no soportada en este navegador');
    }
}

// ==========================================================================
// MANEJADOR DEL EVENTO DE RETROCESO
// ==========================================================================

function handleBackEvent(event) {
    console.log('[back-handler] Evento popstate detectado (botón de retroceso)');
    
    // Prevenir el comportamiento por defecto
    event.preventDefault();
    
    // Verificar si el estado contiene nuestra marca de prevención
    const state = event.state;
    
    // Si el estado no es nuestro o no tiene la marca preventBack,
    // lo reemplazamos con nuestro estado para mantener el control
    if (!state || state.app !== 'gym-notes' || !state.preventBack) {
        console.log('[back-handler] Estado no controlado, restaurando control...');
        const newState = {
            app: 'gym-notes',
            timestamp: Date.now(),
            preventBack: true
        };
        history.replaceState(newState, '', location.href);
        return;
    }
    
    // Si estamos en una pantalla interna, podemos permitir navegación interna
    // Pero como hemos desactivado completamente el retroceso, solo mantenemos el estado
    console.log('[back-handler] Botón de retroceso desactivado - permaneciendo en la app');
    
    // IMPORTANTE: Volver a añadir un estado al historial para que el retroceso
    // siga sin funcionar en el siguiente intento
    const keepState = {
        app: 'gym-notes',
        timestamp: Date.now(),
        preventBack: true,
        keep: true
    };
    history.pushState(keepState, '', location.href);
}

// ==========================================================================
// FUNCIÓN PARA FORZAR LA LIMPIEZA DEL HISTORIAL (SI ES NECESARIO)
// ==========================================================================

function resetBackHandler() {
    console.log('[back-handler] Reiniciando control de retroceso...');
    
    // Limpiar el listener existente
    window.removeEventListener('popstate', handleBackEvent);
    
    // Reconfigurar el control
    initBackHandler();
}

// ==========================================================================
// FUNCIÓN PARA PERMITIR SALIR DE LA APP (SOLO SI ES ESTRICTAMENTE NECESARIO)
// ==========================================================================

function allowBackNavigation() {
    console.log('[back-handler] Permitir navegación hacia atrás (salir de la app)');
    
    // Remover el listener de popstate temporalmente
    window.removeEventListener('popstate', handleBackEvent);
    
    // Permitir la navegación hacia atrás nativa
    // Esto se puede usar en casos muy específicos si se necesita
    setTimeout(() => {
        // Reconfigurar el control después de un breve momento
        // Si el usuario realmente quiere salir, el navegador manejará la navegación
        if (document.visibilityState === 'visible') {
            // Si la página sigue visible, reconfiguremos el control
            initBackHandler();
        }
    }, 100);
}

// ==========================================================================
// EXPOSICIÓN GLOBAL
// ==========================================================================

window.initBackHandler = initBackHandler;
window.resetBackHandler = resetBackHandler;
window.allowBackNavigation = allowBackNavigation;

// ==========================================================================
// INICIALIZACIÓN AUTOMÁTICA
// ==========================================================================

// Inicializar el control de retroceso cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBackHandler);
} else {
    initBackHandler();
}

// También inicializar cuando la página esté completamente cargada
// Por si acaso el DOMContentLoaded se ejecutó antes de que este script se cargara
if (document.readyState === 'complete') {
    initBackHandler();
}

console.log('[back-handler] Módulo cargado correctamente');