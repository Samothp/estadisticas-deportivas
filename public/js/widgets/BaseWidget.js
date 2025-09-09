/**
 * BaseWidget - Clase abstracta base para todos los widgets del dashboard
 * Define la interfaz común y funcionalidad compartida
 */
class BaseWidget {
    constructor(config) {
        if (this.constructor === BaseWidget) {
            throw new Error('BaseWidget es una clase abstracta y no puede ser instanciada directamente');
        }
        
        this.id = config.id;
        this.type = config.type;
        this.size = config.size || 'medium';
        this.position = config.position || { x: 0, y: 0 };
        this.settings = { ...this.getDefaultSettings(), ...config.settings };
        
        this.element = null;
        this.isLoading = false;
        this.hasError = false;
        this.data = null;
        this.refreshTimer = null;
        
        // Sistema de eventos
        this.eventBus = window.EventBus?.getInstance();
        this.eventListeners = [];
        
        this.init();
    }
    
    /**
     * Inicializa el widget
     */
    init() {
        this.createElement();
        this.setupEventListeners();
        this.setupWidgetEvents();
        this.startAutoRefresh();
        
        // Emitir evento de creación
        this.emitEvent('WIDGET_CREATED', {
            widgetId: this.id,
            widgetType: this.type
        });
    }
    
    /**
     * Crea el elemento DOM del widget
     */
    createElement() {
        this.element = document.createElement('div');
        this.element.className = `widget widget-${this.type.toLowerCase()} widget-${this.size}`;
        this.element.id = `widget-${this.id}`;
        this.element.setAttribute('data-widget-id', this.id);
        this.element.setAttribute('data-widget-type', this.type);
        
        // Estructura básica del widget
        this.element.innerHTML = `
            <div class="widget-header">
                <h3 class="widget-title">${this.settings.title || 'Widget'}</h3>
                <div class="widget-controls">
                    <button class="widget-refresh-btn" title="Actualizar">
                        <span class="icon-refresh">🔄</span>
                    </button>
                    <button class="widget-config-btn" title="Configurar">
                        <span class="icon-config">⚙️</span>
                    </button>
                    <button class="widget-remove-btn" title="Remover" style="display: none;">
                        <span class="icon-remove">❌</span>
                    </button>
                </div>
            </div>
            <div class="widget-content">
                <div class="widget-loading" style="display: none;">
                    <div class="loading-spinner"></div>
                    <span>Cargando...</span>
                </div>
                <div class="widget-error" style="display: none;">
                    <div class="error-icon">⚠️</div>
                    <div class="error-message">Error cargando datos</div>
                    <button class="error-retry-btn">Reintentar</button>
                </div>
                <div class="widget-body">
                    <!-- El contenido específico del widget se renderiza aquí -->
                </div>
            </div>
        `;
    }
    
    /**
     * Configura los event listeners del widget
     */
    setupEventListeners() {
        // Botón de refresh
        const refreshBtn = this.element.querySelector('.widget-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }
        
        // Botón de configuración
        const configBtn = this.element.querySelector('.widget-config-btn');
        if (configBtn) {
            configBtn.addEventListener('click', () => this.showConfigModal());
        }
        
        // Botón de remover
        const removeBtn = this.element.querySelector('.widget-remove-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => this.remove());
        }
        
        // Botón de reintentar en caso de error
        const retryBtn = this.element.querySelector('.error-retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => this.refresh());
        }
    }
    
    /**
     * Inicia el auto-refresh si está configurado
     */
    startAutoRefresh() {
        if (this.settings.refreshInterval && this.settings.refreshInterval > 0) {
            this.refreshTimer = setInterval(() => {
                if (!this.isLoading) {
                    this.refresh();
                }
            }, this.settings.refreshInterval);
        }
    }
    
    /**
     * Detiene el auto-refresh
     */
    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }
    
    /**
     * Muestra el estado de carga
     */
    showLoading() {
        this.isLoading = true;
        this.hasError = false;
        
        const loading = this.element.querySelector('.widget-loading');
        const error = this.element.querySelector('.widget-error');
        const body = this.element.querySelector('.widget-body');
        
        if (loading) loading.style.display = 'flex';
        if (error) error.style.display = 'none';
        if (body) body.style.opacity = '0.5';
        
        // Agregar clase de loading al botón refresh
        const refreshBtn = this.element.querySelector('.widget-refresh-btn');
        if (refreshBtn) refreshBtn.classList.add('loading');
    }
    
    /**
     * Oculta el estado de carga
     */
    hideLoading() {
        this.isLoading = false;
        
        const loading = this.element.querySelector('.widget-loading');
        const body = this.element.querySelector('.widget-body');
        
        if (loading) loading.style.display = 'none';
        if (body) body.style.opacity = '1';
        
        // Remover clase de loading del botón refresh
        const refreshBtn = this.element.querySelector('.widget-refresh-btn');
        if (refreshBtn) refreshBtn.classList.remove('loading');
    }
    
    /**
     * Muestra un error
     * @param {string} message - Mensaje de error
     */
    showError(message = 'Error cargando datos') {
        this.hasError = true;
        this.isLoading = false;
        
        const loading = this.element.querySelector('.widget-loading');
        const error = this.element.querySelector('.widget-error');
        const errorMessage = this.element.querySelector('.error-message');
        
        if (loading) loading.style.display = 'none';
        if (error) error.style.display = 'flex';
        if (errorMessage) errorMessage.textContent = message;
        
        console.error(`Error en widget ${this.id}:`, message);
    }
    
    /**
     * Oculta el error
     */
    hideError() {
        this.hasError = false;
        
        const error = this.element.querySelector('.widget-error');
        if (error) error.style.display = 'none';
    }
    
    /**
     * Actualiza el título del widget
     * @param {string} title - Nuevo título
     */
    updateTitle(title) {
        this.settings.title = title;
        const titleElement = this.element.querySelector('.widget-title');
        if (titleElement) {
            titleElement.textContent = title;
        }
    }
    
    /**
     * Muestra/oculta controles de edición
     * @param {boolean} show - Si mostrar los controles
     */
    toggleEditControls(show) {
        const removeBtn = this.element.querySelector('.widget-remove-btn');
        if (removeBtn) {
            removeBtn.style.display = show ? 'block' : 'none';
        }
        
        if (show) {
            this.element.classList.add('edit-mode');
        } else {
            this.element.classList.remove('edit-mode');
        }
    }
    
    /**
     * Muestra el modal de configuración del widget
     */
    showConfigModal() {
        // Implementación básica - se puede extender en widgets específicos
        const modal = this.createConfigModal();
        document.body.appendChild(modal);
        modal.style.display = 'flex';
    }
    
    /**
     * Crea el modal de configuración
     * @returns {HTMLElement} Elemento del modal
     */
    createConfigModal() {
        const modal = document.createElement('div');
        modal.className = 'widget-config-modal';
        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h4>Configurar ${this.settings.title}</h4>
                    <button class="modal-close-btn">×</button>
                </div>
                <div class="modal-body">
                    <div class="config-group">
                        <label for="widget-title-${this.id}">Título:</label>
                        <input type="text" id="widget-title-${this.id}" value="${this.settings.title}" />
                    </div>
                    <div class="config-group">
                        <label for="widget-refresh-${this.id}">Intervalo de actualización (ms):</label>
                        <input type="number" id="widget-refresh-${this.id}" value="${this.settings.refreshInterval || 30000}" min="5000" step="1000" />
                    </div>
                    ${this.getCustomConfigHTML()}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-cancel-btn">Cancelar</button>
                    <button class="btn btn-primary modal-save-btn">Guardar</button>
                </div>
            </div>
        `;
        
        // Event listeners del modal
        const closeBtn = modal.querySelector('.modal-close-btn');
        const cancelBtn = modal.querySelector('.modal-cancel-btn');
        const saveBtn = modal.querySelector('.modal-save-btn');
        const backdrop = modal.querySelector('.modal-backdrop');
        
        const closeModal = () => {
            modal.remove();
        };
        
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        backdrop.addEventListener('click', closeModal);
        
        saveBtn.addEventListener('click', () => {
            this.saveConfig(modal);
            closeModal();
        });
        
        return modal;
    }
    
    /**
     * Guarda la configuración del widget
     * @param {HTMLElement} modal - Elemento del modal
     */
    saveConfig(modal) {
        const titleInput = modal.querySelector(`#widget-title-${this.id}`);
        const refreshInput = modal.querySelector(`#widget-refresh-${this.id}`);
        
        if (titleInput) {
            this.updateTitle(titleInput.value);
        }
        
        if (refreshInput) {
            const newInterval = parseInt(refreshInput.value);
            if (newInterval !== this.settings.refreshInterval) {
                this.settings.refreshInterval = newInterval;
                this.stopAutoRefresh();
                this.startAutoRefresh();
            }
        }
        
        this.saveCustomConfig(modal);
        this.refresh();
    }
    
    /**
     * Remueve el widget del dashboard
     */
    remove() {
        if (confirm('¿Estás seguro de que quieres remover este widget?')) {
            this.stopAutoRefresh();
            const manager = window.DashboardManager?.getInstance();
            if (manager) {
                manager.removeWidget(this.id);
            }
        }
    }
    
    // Métodos abstractos que deben ser implementados por las clases hijas
    
    /**
     * Renderiza el contenido específico del widget
     * @abstract
     */
    render() {
        throw new Error('El método render() debe ser implementado por la clase hija');
    }
    
    /**
     * Actualiza los datos del widget
     * @abstract
     */
    async refresh() {
        try {
            this.showLoading();
            
            // Emitir evento de inicio de refresh
            this.emitEvent('WIDGET_REFRESHED', {
                widgetId: this.id,
                status: 'started'
            });
            
            // Llamar al método de refresh específico del widget
            await this.doRefresh();
            
            this.hideLoading();
            this.hideError();
            
            // Emitir evento de refresh completado
            this.emitEvent('WIDGET_REFRESHED', {
                widgetId: this.id,
                status: 'completed'
            });
            
        } catch (error) {
            this.hideLoading();
            this.showError(error.message || 'Error actualizando widget');
            
            // Emitir evento de error
            this.emitEvent('WIDGET_ERROR', {
                widgetId: this.id,
                error: error.message || 'Error desconocido',
                stack: error.stack
            });
        }
    }
    
    /**
     * Método de refresh específico que debe implementar cada widget
     * @abstract
     */
    async doRefresh() {
        throw new Error('El método doRefresh() debe ser implementado por la clase hija');
    }
    
    /**
     * Obtiene la configuración por defecto del widget
     * @abstract
     * @returns {Object} Configuración por defecto
     */
    getDefaultSettings() {
        return {
            title: 'Widget',
            refreshInterval: 30000
        };
    }
    
    /**
     * Obtiene HTML personalizado para la configuración del widget
     * @returns {string} HTML de configuración personalizada
     */
    getCustomConfigHTML() {
        return '';
    }
    
    /**
     * Guarda configuración personalizada del widget
     * @param {HTMLElement} modal - Elemento del modal
     */
    saveCustomConfig(modal) {
        // Implementar en clases hijas si es necesario
    }
    
    /**
     * Configura los eventos específicos del widget
     */
    setupWidgetEvents() {
        if (!this.eventBus) {
            console.warn(`Widget ${this.id}: EventBus no disponible`);
            return;
        }
        
        // Suscribirse a eventos globales relevantes
        this.subscribeToEvent('STATS_UPDATED', (eventData) => {
            if (!this.isLoading) {
                this.onStatsUpdated(eventData);
            }
        });
        
        this.subscribeToEvent('DASHBOARD_THEME_CHANGED', (eventData) => {
            this.onThemeChanged(eventData);
        });
        
        this.subscribeToEvent('FILTERS_APPLIED', (eventData) => {
            this.onFiltersApplied(eventData);
        });
        
        // Permitir que widgets específicos se suscriban a eventos adicionales
        this.setupCustomEvents();
    }
    
    /**
     * Suscribe el widget a un evento del EventBus
     * @param {string} eventName - Nombre del evento
     * @param {Function} callback - Función callback
     */
    subscribeToEvent(eventName, callback) {
        if (!this.eventBus) {
            return;
        }
        
        const unsubscribe = this.eventBus.on(eventName, callback, this);
        this.eventListeners.push({
            eventName,
            unsubscribe
        });
    }
    
    /**
     * Suscribe el widget a un evento que se ejecuta solo una vez
     * @param {string} eventName - Nombre del evento
     * @param {Function} callback - Función callback
     */
    subscribeOnce(eventName, callback) {
        if (!this.eventBus) {
            return;
        }
        
        const unsubscribe = this.eventBus.once(eventName, callback, this);
        this.eventListeners.push({
            eventName,
            unsubscribe
        });
    }
    
    /**
     * Emite un evento desde el widget
     * @param {string} eventName - Nombre del evento (puede usar EventBus.EVENTS)
     * @param {*} data - Datos del evento
     */
    emitEvent(eventName, data = null) {
        if (!this.eventBus) {
            return;
        }
        
        // Usar constantes predefinidas si están disponibles
        const fullEventName = window.EventBus.EVENTS[eventName] || eventName;
        
        this.eventBus.emit(fullEventName, data, {
            source: `widget:${this.id}`,
            widgetType: this.type
        });
    }
    
    /**
     * Maneja actualizaciones de estadísticas
     * @param {Object} eventData - Datos del evento
     */
    onStatsUpdated(eventData) {
        // Implementación por defecto - puede ser sobrescrita
        if (this.settings.autoRefreshOnStatsUpdate !== false) {
            this.refresh();
        }
    }
    
    /**
     * Maneja cambios de tema
     * @param {Object} eventData - Datos del evento
     */
    onThemeChanged(eventData) {
        // Implementación por defecto - puede ser sobrescrita
        console.log(`Widget ${this.id}: Tema cambiado a ${eventData.data.theme}`);
    }
    
    /**
     * Maneja aplicación de filtros
     * @param {Object} eventData - Datos del evento
     */
    onFiltersApplied(eventData) {
        // Implementación por defecto - puede ser sobrescrita
        if (this.settings.respondToFilters !== false) {
            this.refresh();
        }
    }
    
    /**
     * Permite a widgets específicos configurar eventos personalizados
     * Debe ser implementado por clases hijas si necesitan eventos específicos
     */
    setupCustomEvents() {
        // Implementar en clases hijas si es necesario
    }
    
    /**
     * Desuscribe todos los eventos del widget
     */
    unsubscribeAllEvents() {
        for (const listener of this.eventListeners) {
            if (listener.unsubscribe) {
                listener.unsubscribe();
            }
        }
        this.eventListeners = [];
    }
    
    /**
     * Destruye el widget y limpia recursos
     */
    destroy() {
        // Emitir evento de destrucción
        this.emitEvent('WIDGET_DESTROYED', {
            widgetId: this.id,
            widgetType: this.type
        });
        
        // Limpiar eventos
        this.unsubscribeAllEvents();
        
        // Limpiar timers
        this.stopAutoRefresh();
        
        // Remover del DOM
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

// Hacer disponible globalmente
window.BaseWidget = BaseWidget;