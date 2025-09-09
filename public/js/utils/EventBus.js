/**
 * EventBus - Sistema de eventos centralizado para comunicación entre widgets
 * Implementa patrón Observer para desacoplar componentes
 */
class EventBus {
    constructor() {
        this.events = new Map();
        this.onceEvents = new Map();
        this.debugMode = false;
    }
    
    /**
     * Suscribe un listener a un evento
     * @param {string} eventName - Nombre del evento
     * @param {Function} callback - Función callback
     * @param {Object} context - Contexto para el callback (opcional)
     * @returns {Function} Función para desuscribirse
     */
    on(eventName, callback, context = null) {
        if (!eventName || typeof callback !== 'function') {
            throw new Error('EventName y callback son requeridos');
        }
        
        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }
        
        const listener = {
            callback,
            context,
            id: this.generateId()
        };
        
        this.events.get(eventName).push(listener);
        
        if (this.debugMode) {
            console.log(`EventBus: Listener agregado para '${eventName}'`, listener.id);
        }
        
        // Retornar función para desuscribirse
        return () => this.off(eventName, listener.id);
    }
    
    /**
     * Suscribe un listener que se ejecuta solo una vez
     * @param {string} eventName - Nombre del evento
     * @param {Function} callback - Función callback
     * @param {Object} context - Contexto para el callback (opcional)
     * @returns {Function} Función para desuscribirse
     */
    once(eventName, callback, context = null) {
        if (!eventName || typeof callback !== 'function') {
            throw new Error('EventName y callback son requeridos');
        }
        
        if (!this.onceEvents.has(eventName)) {
            this.onceEvents.set(eventName, []);
        }
        
        const listener = {
            callback,
            context,
            id: this.generateId()
        };
        
        this.onceEvents.get(eventName).push(listener);
        
        if (this.debugMode) {
            console.log(`EventBus: Listener 'once' agregado para '${eventName}'`, listener.id);
        }
        
        // Retornar función para desuscribirse
        return () => this.offOnce(eventName, listener.id);
    }
    
    /**
     * Emite un evento a todos los listeners suscritos
     * @param {string} eventName - Nombre del evento
     * @param {*} data - Datos del evento
     * @param {Object} options - Opciones adicionales
     */
    emit(eventName, data = null, options = {}) {
        if (!eventName) {
            throw new Error('EventName es requerido');
        }
        
        const eventData = {
            name: eventName,
            data,
            timestamp: Date.now(),
            source: options.source || 'unknown'
        };
        
        if (this.debugMode) {
            console.log(`EventBus: Emitiendo evento '${eventName}'`, eventData);
        }
        
        // Ejecutar listeners normales
        this.executeListeners(eventName, eventData);
        
        // Ejecutar listeners 'once' y removerlos
        this.executeOnceListeners(eventName, eventData);
    }
    
    /**
     * Ejecuta listeners normales
     * @param {string} eventName - Nombre del evento
     * @param {Object} eventData - Datos del evento
     */
    executeListeners(eventName, eventData) {
        const listeners = this.events.get(eventName);
        if (!listeners || listeners.length === 0) {
            return;
        }
        
        // Crear copia para evitar problemas si se modifican durante la ejecución
        const listenersToExecute = [...listeners];
        
        for (const listener of listenersToExecute) {
            try {
                if (listener.context) {
                    listener.callback.call(listener.context, eventData);
                } else {
                    listener.callback(eventData);
                }
            } catch (error) {
                console.error(`Error ejecutando listener para '${eventName}':`, error);
            }
        }
    }
    
    /**
     * Ejecuta listeners 'once' y los remueve
     * @param {string} eventName - Nombre del evento
     * @param {Object} eventData - Datos del evento
     */
    executeOnceListeners(eventName, eventData) {
        const listeners = this.onceEvents.get(eventName);
        if (!listeners || listeners.length === 0) {
            return;
        }
        
        // Crear copia y limpiar la lista original
        const listenersToExecute = [...listeners];
        this.onceEvents.set(eventName, []);
        
        for (const listener of listenersToExecute) {
            try {
                if (listener.context) {
                    listener.callback.call(listener.context, eventData);
                } else {
                    listener.callback(eventData);
                }
            } catch (error) {
                console.error(`Error ejecutando listener 'once' para '${eventName}':`, error);
            }
        }
    }
    
    /**
     * Desuscribe un listener de un evento
     * @param {string} eventName - Nombre del evento
     * @param {string} listenerId - ID del listener (opcional)
     */
    off(eventName, listenerId = null) {
        if (!eventName) {
            return;
        }
        
        const listeners = this.events.get(eventName);
        if (!listeners) {
            return;
        }
        
        if (listenerId) {
            // Remover listener específico
            const index = listeners.findIndex(l => l.id === listenerId);
            if (index !== -1) {
                listeners.splice(index, 1);
                if (this.debugMode) {
                    console.log(`EventBus: Listener removido para '${eventName}'`, listenerId);
                }
            }
        } else {
            // Remover todos los listeners del evento
            this.events.set(eventName, []);
            if (this.debugMode) {
                console.log(`EventBus: Todos los listeners removidos para '${eventName}'`);
            }
        }
        
        // Limpiar el evento si no tiene listeners
        if (listeners.length === 0) {
            this.events.delete(eventName);
        }
    }
    
    /**
     * Desuscribe un listener 'once' de un evento
     * @param {string} eventName - Nombre del evento
     * @param {string} listenerId - ID del listener
     */
    offOnce(eventName, listenerId) {
        if (!eventName || !listenerId) {
            return;
        }
        
        const listeners = this.onceEvents.get(eventName);
        if (!listeners) {
            return;
        }
        
        const index = listeners.findIndex(l => l.id === listenerId);
        if (index !== -1) {
            listeners.splice(index, 1);
            if (this.debugMode) {
                console.log(`EventBus: Listener 'once' removido para '${eventName}'`, listenerId);
            }
        }
        
        // Limpiar el evento si no tiene listeners
        if (listeners.length === 0) {
            this.onceEvents.delete(eventName);
        }
    }
    
    /**
     * Obtiene el número de listeners para un evento
     * @param {string} eventName - Nombre del evento
     * @returns {number} Número de listeners
     */
    listenerCount(eventName) {
        const normalListeners = this.events.get(eventName) || [];
        const onceListeners = this.onceEvents.get(eventName) || [];
        return normalListeners.length + onceListeners.length;
    }
    
    /**
     * Obtiene todos los nombres de eventos registrados
     * @returns {Array} Array de nombres de eventos
     */
    getEventNames() {
        const normalEvents = Array.from(this.events.keys());
        const onceEvents = Array.from(this.onceEvents.keys());
        return [...new Set([...normalEvents, ...onceEvents])];
    }
    
    /**
     * Limpia todos los listeners
     */
    clear() {
        this.events.clear();
        this.onceEvents.clear();
        
        if (this.debugMode) {
            console.log('EventBus: Todos los listeners limpiados');
        }
    }
    
    /**
     * Habilita/deshabilita modo debug
     * @param {boolean} enabled - Si habilitar debug
     */
    setDebugMode(enabled) {
        this.debugMode = !!enabled;
        console.log(`EventBus: Modo debug ${enabled ? 'habilitado' : 'deshabilitado'}`);
    }
    
    /**
     * Genera un ID único para listeners
     * @returns {string} ID único
     */
    generateId() {
        return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Obtiene estadísticas del EventBus
     * @returns {Object} Estadísticas
     */
    getStats() {
        const eventNames = this.getEventNames();
        const stats = {
            totalEvents: eventNames.length,
            totalListeners: 0,
            events: {}
        };
        
        for (const eventName of eventNames) {
            const count = this.listenerCount(eventName);
            stats.events[eventName] = count;
            stats.totalListeners += count;
        }
        
        return stats;
    }
}

// Eventos predefinidos del sistema
EventBus.EVENTS = {
    // Eventos de datos
    STATS_UPDATED: 'stats:updated',
    STATS_ADDED: 'stats:added',
    STATS_DELETED: 'stats:deleted',
    STATS_MODIFIED: 'stats:modified',
    
    // Eventos de widgets
    WIDGET_CREATED: 'widget:created',
    WIDGET_DESTROYED: 'widget:destroyed',
    WIDGET_REFRESHED: 'widget:refreshed',
    WIDGET_ERROR: 'widget:error',
    WIDGET_CONFIG_CHANGED: 'widget:config_changed',
    
    // Eventos de dashboard
    DASHBOARD_LAYOUT_CHANGED: 'dashboard:layout_changed',
    DASHBOARD_THEME_CHANGED: 'dashboard:theme_changed',
    DASHBOARD_MODE_CHANGED: 'dashboard:mode_changed',
    
    // Eventos de filtros
    FILTERS_APPLIED: 'filters:applied',
    FILTERS_CLEARED: 'filters:cleared',
    FILTERS_SAVED: 'filters:saved',
    
    // Eventos de exportación
    EXPORT_STARTED: 'export:started',
    EXPORT_COMPLETED: 'export:completed',
    EXPORT_FAILED: 'export:failed',
    
    // Eventos de notificaciones
    NOTIFICATION_SHOW: 'notification:show',
    NOTIFICATION_HIDE: 'notification:hide',
    
    // Eventos de métricas
    METRICS_CALCULATED: 'metrics:calculated',
    TRENDS_ANALYZED: 'trends:analyzed'
};

// Instancia singleton del EventBus
let eventBusInstance = null;

/**
 * Obtiene la instancia singleton del EventBus
 * @returns {EventBus} Instancia del EventBus
 */
EventBus.getInstance = function() {
    if (!eventBusInstance) {
        eventBusInstance = new EventBus();
    }
    return eventBusInstance;
};

// Hacer disponible globalmente
window.EventBus = EventBus;