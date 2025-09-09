/**
 * EventHelpers - Utilidades y helpers para el sistema de eventos
 * Proporciona funciones comunes para trabajar con el EventBus
 */
class EventHelpers {
    
    /**
     * Emite un evento de actualización de estadísticas
     * @param {Object} statsData - Datos de las estadísticas
     * @param {string} action - Tipo de acción (added, updated, deleted)
     */
    static emitStatsEvent(statsData, action = 'updated') {
        const eventBus = window.EventBus?.getInstance();
        if (!eventBus) return;
        
        const eventMap = {
            'added': 'STATS_ADDED',
            'updated': 'STATS_UPDATED', 
            'deleted': 'STATS_DELETED',
            'modified': 'STATS_MODIFIED'
        };
        
        const eventName = eventMap[action] || 'STATS_UPDATED';
        
        eventBus.emit(eventName, {
            stats: statsData,
            action: action,
            timestamp: Date.now()
        });
    }
    
    /**
     * Emite un evento de cambio de filtros
     * @param {Object} filters - Filtros aplicados
     * @param {string} action - Tipo de acción (applied, cleared, saved)
     */
    static emitFiltersEvent(filters, action = 'applied') {
        const eventBus = window.EventBus?.getInstance();
        if (!eventBus) return;
        
        const eventMap = {
            'applied': 'FILTERS_APPLIED',
            'cleared': 'FILTERS_CLEARED',
            'saved': 'FILTERS_SAVED'
        };
        
        const eventName = eventMap[action] || 'FILTERS_APPLIED';
        
        eventBus.emit(eventName, {
            filters: filters,
            action: action,
            timestamp: Date.now()
        });
    }
    
    /**
     * Emite un evento de notificación
     * @param {string} message - Mensaje de la notificación
     * @param {string} type - Tipo de notificación (success, error, info, warning)
     * @param {Object} options - Opciones adicionales
     */
    static showNotification(message, type = 'info', options = {}) {
        const eventBus = window.EventBus?.getInstance();
        if (!eventBus) {
            // Fallback a console si no hay EventBus
            console.log(`[${type.toUpperCase()}] ${message}`);
            return;
        }
        
        eventBus.emit('NOTIFICATION_SHOW', {
            message: message,
            type: type,
            duration: options.duration || 3000,
            position: options.position || 'top-right',
            timestamp: Date.now()
        });
    }
    
    /**
     * Emite un evento de cambio de tema
     * @param {string} theme - Nombre del tema (light, dark)
     */
    static emitThemeChange(theme) {
        const eventBus = window.EventBus?.getInstance();
        if (!eventBus) return;
        
        eventBus.emit('DASHBOARD_THEME_CHANGED', {
            theme: theme,
            timestamp: Date.now()
        });
    }
    
    /**
     * Emite eventos de exportación
     * @param {string} status - Estado de la exportación (started, completed, failed)
     * @param {Object} data - Datos adicionales
     */
    static emitExportEvent(status, data = {}) {
        const eventBus = window.EventBus?.getInstance();
        if (!eventBus) return;
        
        const eventMap = {
            'started': 'EXPORT_STARTED',
            'completed': 'EXPORT_COMPLETED',
            'failed': 'EXPORT_FAILED'
        };
        
        const eventName = eventMap[status] || 'EXPORT_STARTED';
        
        eventBus.emit(eventName, {
            status: status,
            timestamp: Date.now(),
            ...data
        });
    }
    
    /**
     * Crea un debounced event emitter para evitar spam de eventos
     * @param {string} eventName - Nombre del evento
     * @param {number} delay - Delay en milisegundos
     * @returns {Function} Función debounced para emitir el evento
     */
    static createDebouncedEmitter(eventName, delay = 300) {
        let timeoutId = null;
        
        return function(data) {
            const eventBus = window.EventBus?.getInstance();
            if (!eventBus) return;
            
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            
            timeoutId = setTimeout(() => {
                eventBus.emit(eventName, data);
                timeoutId = null;
            }, delay);
        };
    }
    
    /**
     * Crea un throttled event emitter para limitar frecuencia de eventos
     * @param {string} eventName - Nombre del evento
     * @param {number} interval - Intervalo mínimo en milisegundos
     * @returns {Function} Función throttled para emitir el evento
     */
    static createThrottledEmitter(eventName, interval = 1000) {
        let lastEmit = 0;
        
        return function(data) {
            const eventBus = window.EventBus?.getInstance();
            if (!eventBus) return;
            
            const now = Date.now();
            if (now - lastEmit >= interval) {
                eventBus.emit(eventName, data);
                lastEmit = now;
            }
        };
    }
    
    /**
     * Suscribe múltiples eventos con un solo callback
     * @param {Array} eventNames - Array de nombres de eventos
     * @param {Function} callback - Función callback
     * @param {Object} context - Contexto para el callback
     * @returns {Function} Función para desuscribirse de todos los eventos
     */
    static subscribeToMultiple(eventNames, callback, context = null) {
        const eventBus = window.EventBus?.getInstance();
        if (!eventBus) return () => {};
        
        const unsubscribeFunctions = [];
        
        for (const eventName of eventNames) {
            const unsubscribe = eventBus.on(eventName, callback, context);
            unsubscribeFunctions.push(unsubscribe);
        }
        
        // Retornar función que desuscribe todos los eventos
        return () => {
            for (const unsubscribe of unsubscribeFunctions) {
                unsubscribe();
            }
        };
    }
    
    /**
     * Crea un listener condicional que solo se ejecuta si se cumple una condición
     * @param {string} eventName - Nombre del evento
     * @param {Function} condition - Función que retorna boolean
     * @param {Function} callback - Función callback
     * @param {Object} context - Contexto para el callback
     * @returns {Function} Función para desuscribirse
     */
    static subscribeConditional(eventName, condition, callback, context = null) {
        const eventBus = window.EventBus?.getInstance();
        if (!eventBus) return () => {};
        
        const conditionalCallback = (eventData) => {
            if (condition(eventData)) {
                callback(eventData);
            }
        };
        
        return eventBus.on(eventName, conditionalCallback, context);
    }
    
    /**
     * Crea un listener que se auto-desuscribe después de N ejecuciones
     * @param {string} eventName - Nombre del evento
     * @param {number} maxExecutions - Número máximo de ejecuciones
     * @param {Function} callback - Función callback
     * @param {Object} context - Contexto para el callback
     * @returns {Function} Función para desuscribirse manualmente
     */
    static subscribeWithLimit(eventName, maxExecutions, callback, context = null) {
        const eventBus = window.EventBus?.getInstance();
        if (!eventBus) return () => {};
        
        let executionCount = 0;
        let unsubscribe = null;
        
        const limitedCallback = (eventData) => {
            executionCount++;
            callback(eventData);
            
            if (executionCount >= maxExecutions && unsubscribe) {
                unsubscribe();
            }
        };
        
        unsubscribe = eventBus.on(eventName, limitedCallback, context);
        return unsubscribe;
    }
    
    /**
     * Obtiene estadísticas de uso de eventos
     * @returns {Object} Estadísticas detalladas
     */
    static getEventStats() {
        const eventBus = window.EventBus?.getInstance();
        if (!eventBus) {
            return { error: 'EventBus no disponible' };
        }
        
        const stats = eventBus.getStats();
        const eventNames = eventBus.getEventNames();
        
        return {
            ...stats,
            eventNames: eventNames,
            predefinedEvents: Object.keys(window.EventBus.EVENTS || {}),
            timestamp: Date.now()
        };
    }
    
    /**
     * Habilita logging de eventos para debugging
     * @param {Array} eventNames - Eventos específicos a loggear (opcional)
     */
    static enableEventLogging(eventNames = null) {
        const eventBus = window.EventBus?.getInstance();
        if (!eventBus) return;
        
        eventBus.setDebugMode(true);
        
        if (eventNames && Array.isArray(eventNames)) {
            // Loggear solo eventos específicos
            for (const eventName of eventNames) {
                eventBus.on(eventName, (eventData) => {
                    console.log(`[EVENT] ${eventName}:`, eventData);
                });
            }
        }
    }
    
    /**
     * Deshabilita logging de eventos
     */
    static disableEventLogging() {
        const eventBus = window.EventBus?.getInstance();
        if (!eventBus) return;
        
        eventBus.setDebugMode(false);
    }
}

// Hacer disponible globalmente
window.EventHelpers = EventHelpers;