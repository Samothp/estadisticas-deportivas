/**
 * DashboardManager - Gestor principal del dashboard avanzado
 * Implementa patrón singleton para gestionar widgets y layout
 */
class DashboardManager {
    constructor() {
        if (DashboardManager.instance) {
            return DashboardManager.instance;
        }
        
        this.widgets = new Map();
        this.layout = null;
        this.config = null;
        this.isEditMode = false;
        
        // Sistema de eventos
        this.eventBus = window.EventBus?.getInstance();
        this.setupEventListeners();
        
        // Sistema de drag & drop
        this.dragDropManager = window.DragDropManager?.getInstance();
        
        // Sistema de grid responsive
        this.responsiveGrid = window.ResponsiveGrid?.getInstance();
        
        DashboardManager.instance = this;
    }
    
    /**
     * Inicializa el dashboard con la configuración proporcionada
     * @param {Object} config - Configuración del dashboard
     */
    async init(config) {
        this.config = config;
        await this.loadLayout();
        await this.loadWidgets();
        this.setupEventListeners();
        console.log('Dashboard Manager inicializado correctamente');
    }
    
    /**
     * Carga el layout del dashboard desde localStorage o configuración por defecto
     */
    async loadLayout() {
        const savedLayout = localStorage.getItem('dashboard-layout');
        if (savedLayout) {
            this.layout = JSON.parse(savedLayout);
        } else {
            this.layout = this.config.defaultLayout;
        }
    }
    
    /**
     * Carga y renderiza todos los widgets configurados
     */
    async loadWidgets() {
        const container = document.getElementById('dashboard-container');
        if (!container) {
            console.error('Container del dashboard no encontrado');
            return;
        }
        
        // Inicializar sistema responsive si no está inicializado
        if (this.responsiveGrid && !this.responsiveGrid.container) {
            this.responsiveGrid.init(container, this.config.grid);
        }
        
        // Limpiar container
        container.innerHTML = '';
        
        // Crear widgets según el layout
        for (const widgetConfig of this.layout.widgets) {
            try {
                const widget = await this.createWidget(widgetConfig);
                if (widget) {
                    this.widgets.set(widgetConfig.id, widget);
                    container.appendChild(widget.element);
                    
                    // Agregar al sistema responsive
                    if (this.responsiveGrid) {
                        this.responsiveGrid.addWidget(widget.element);
                    }
                }
            } catch (error) {
                console.error(`Error creando widget ${widgetConfig.id}:`, error);
            }
        }
    }
    
    /**
     * Crea un widget usando el WidgetFactory
     * @param {Object} config - Configuración del widget
     * @returns {Object} Widget creado
     */
    async createWidget(config) {
        const WidgetFactory = window.WidgetFactory;
        if (!WidgetFactory) {
            console.error('WidgetFactory no está disponible');
            return null;
        }
        
        return WidgetFactory.create(config);
    }
    
    /**
     * Configura los event listeners del dashboard
     */
    setupEventListeners() {
        // Event listeners del DOM
        this.setupDOMEventListeners();
        
        // Event listeners del EventBus
        this.setupEventBusListeners();
    }
    
    /**
     * Configura event listeners del DOM
     */
    setupDOMEventListeners() {
        // Toggle modo edición
        const editButton = document.getElementById('dashboard-edit-btn');
        if (editButton) {
            editButton.addEventListener('click', () => this.toggleEditMode());
        }
        
        // Guardar configuración
        const saveButton = document.getElementById('dashboard-save-btn');
        if (saveButton) {
            saveButton.addEventListener('click', () => this.saveLayout());
        }
        
        // Escuchar cambios en los datos para actualizar widgets (legacy)
        document.addEventListener('statsUpdated', () => this.onStatsUpdated());
    }
    
    /**
     * Configura event listeners del EventBus
     */
    setupEventBusListeners() {
        if (!this.eventBus) {
            console.warn('DashboardManager: EventBus no disponible');
            return;
        }
        
        // Suscribirse a eventos de widgets
        this.eventBus.on('WIDGET_ERROR', (eventData) => {
            this.onWidgetError(eventData);
        });
        
        this.eventBus.on('WIDGET_CONFIG_CHANGED', (eventData) => {
            this.onWidgetConfigChanged(eventData);
        });
        
        // Suscribirse a eventos de datos
        this.eventBus.on('STATS_UPDATED', () => {
            this.onStatsUpdated();
        });
        
        this.eventBus.on('STATS_ADDED', (eventData) => {
            this.onStatsAdded(eventData);
        });
    }
    
    /**
     * Maneja errores de widgets
     * @param {Object} eventData - Datos del evento
     */
    onWidgetError(eventData) {
        console.error(`Error en widget ${eventData.data.widgetId}:`, eventData.data.error);
        this.showNotification(`Error en widget: ${eventData.data.error}`, 'error');
    }
    
    /**
     * Maneja cambios de configuración de widgets
     * @param {Object} eventData - Datos del evento
     */
    onWidgetConfigChanged(eventData) {
        // Actualizar layout si es necesario
        this.updateWidgetInLayout(eventData.data.widgetId, eventData.data.config);
    }
    
    /**
     * Maneja actualizaciones de estadísticas
     */
    onStatsUpdated() {
        this.refreshAllWidgets();
        
        // Emitir evento para que otros componentes puedan reaccionar
        if (this.eventBus) {
            this.eventBus.emit('DASHBOARD_STATS_REFRESHED', {
                timestamp: Date.now(),
                widgetCount: this.widgets.size
            });
        }
    }
    
    /**
     * Maneja nuevas estadísticas agregadas
     * @param {Object} eventData - Datos del evento
     */
    onStatsAdded(eventData) {
        // Actualizar widgets relevantes inmediatamente
        this.refreshRelevantWidgets(eventData.data);
    }
    
    /**
     * Alterna entre modo visualización y edición
     */
    toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        const container = document.getElementById('dashboard-container');
        
        if (this.isEditMode) {
            container.classList.add('edit-mode');
            this.enableDragAndDrop();
        } else {
            container.classList.remove('edit-mode');
            this.disableDragAndDrop();
        }
        
        // Actualizar UI de botones
        this.updateEditModeUI();
        
        // Actualizar widgets para mostrar/ocultar controles de edición
        for (const [id, widget] of this.widgets) {
            if (widget.toggleEditControls) {
                widget.toggleEditControls(this.isEditMode);
            }
        }
        
        // Emitir evento de cambio de modo
        this.emitEvent('DASHBOARD_MODE_CHANGED', {
            editMode: this.isEditMode,
            timestamp: Date.now()
        });
    }
    
    /**
     * Habilita funcionalidad de drag & drop
     */
    enableDragAndDrop() {
        if (this.dragDropManager) {
            const container = document.getElementById('dashboard-container');
            this.dragDropManager.enable(container);
            console.log('Drag & Drop habilitado');
        } else {
            console.warn('DragDropManager no disponible');
        }
    }
    
    /**
     * Deshabilita funcionalidad de drag & drop
     */
    disableDragAndDrop() {
        if (this.dragDropManager) {
            this.dragDropManager.disable();
            console.log('Drag & Drop deshabilitado');
        }
    }
    
    /**
     * Actualiza la UI según el modo actual
     */
    updateEditModeUI() {
        const editButton = document.getElementById('dashboard-edit-btn');
        const saveButton = document.getElementById('dashboard-save-btn');
        
        if (editButton) {
            editButton.textContent = this.isEditMode ? 'Finalizar Edición' : 'Editar Dashboard';
            editButton.classList.toggle('active', this.isEditMode);
        }
        
        if (saveButton) {
            saveButton.style.display = this.isEditMode ? 'inline-block' : 'none';
        }
    }
    
    /**
     * Guarda el layout actual en localStorage
     */
    saveLayout() {
        try {
            localStorage.setItem('dashboard-layout', JSON.stringify(this.layout));
            console.log('Layout guardado correctamente');
            
            // Mostrar notificación de éxito
            this.showNotification('Configuración guardada correctamente', 'success');
        } catch (error) {
            console.error('Error guardando layout:', error);
            this.showNotification('Error guardando configuración', 'error');
        }
    }
    
    /**
     * Refresca todos los widgets con datos actualizados
     */
    async refreshAllWidgets() {
        for (const [id, widget] of this.widgets) {
            try {
                if (widget.refresh) {
                    await widget.refresh();
                }
            } catch (error) {
                console.error(`Error refrescando widget ${id}:`, error);
            }
        }
    }
    
    /**
     * Agrega un nuevo widget al dashboard
     * @param {Object} config - Configuración del widget
     */
    async addWidget(config) {
        const widget = await this.createWidget(config);
        if (widget) {
            this.widgets.set(config.id, widget);
            this.layout.widgets.push(config);
            
            const container = document.getElementById('dashboard-container');
            container.appendChild(widget.element);
            
            // Agregar al sistema de drag & drop si está habilitado
            if (this.dragDropManager && this.isEditMode) {
                this.dragDropManager.addWidget(widget.element);
            }
            
            console.log(`Widget ${config.id} agregado correctamente`);
        }
    }
    
    /**
     * Remueve un widget del dashboard
     * @param {string} widgetId - ID del widget a remover
     */
    removeWidget(widgetId) {
        const widget = this.widgets.get(widgetId);
        if (widget) {
            // Remover del sistema de drag & drop
            if (this.dragDropManager && widget.element) {
                this.dragDropManager.removeWidget(widget.element);
            }
            
            // Remover del DOM
            if (widget.element && widget.element.parentNode) {
                widget.element.parentNode.removeChild(widget.element);
            }
            
            // Destruir el widget
            if (widget.destroy) {
                widget.destroy();
            }
            
            // Remover del Map
            this.widgets.delete(widgetId);
            
            // Remover del layout
            this.layout.widgets = this.layout.widgets.filter(w => w.id !== widgetId);
            
            console.log(`Widget ${widgetId} removido correctamente`);
        }
    }
    
    /**
     * Muestra una notificación al usuario
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo de notificación (success, error, info)
     */
    showNotification(message, type = 'info') {
        // Implementación básica de notificaciones
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto-remover después de 3 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
    
    /**
     * Actualiza un widget específico en el layout
     * @param {string} widgetId - ID del widget
     * @param {Object} config - Nueva configuración
     */
    updateWidgetInLayout(widgetId, config) {
        const widgetConfig = this.layout.widgets.find(w => w.id === widgetId);
        if (widgetConfig) {
            Object.assign(widgetConfig, config);
            this.saveLayout();
        }
    }
    
    /**
     * Refresca widgets relevantes basado en los datos actualizados
     * @param {Object} statsData - Datos de las estadísticas
     */
    refreshRelevantWidgets(statsData) {
        // Determinar qué widgets necesitan actualización basado en los datos
        for (const [id, widget] of this.widgets) {
            if (this.isWidgetRelevant(widget, statsData)) {
                widget.refresh();
            }
        }
    }
    
    /**
     * Determina si un widget es relevante para ciertos datos
     * @param {Object} widget - Widget a evaluar
     * @param {Object} statsData - Datos de estadísticas
     * @returns {boolean} True si es relevante
     */
    isWidgetRelevant(widget, statsData) {
        // Lógica básica - puede ser extendida
        if (!statsData) return false;
        
        // Si el widget tiene configuración de equipo/jugador específico
        if (widget.settings.selectedTeam && statsData.team) {
            return widget.settings.selectedTeam === statsData.team;
        }
        
        if (widget.settings.selectedPlayer && statsData.player) {
            return widget.settings.selectedPlayer === statsData.player;
        }
        
        // Por defecto, todos los widgets son relevantes
        return true;
    }
    
    /**
     * Emite un evento desde el dashboard
     * @param {string} eventName - Nombre del evento
     * @param {*} data - Datos del evento
     */
    emitEvent(eventName, data = null) {
        if (!this.eventBus) {
            return;
        }
        
        const fullEventName = window.EventBus.EVENTS[eventName] || eventName;
        this.eventBus.emit(fullEventName, data, {
            source: 'dashboard-manager'
        });
    }
    
    /**
     * Actualiza la posición de un widget después del drag & drop
     * @param {string} widgetId - ID del widget
     * @param {number} newPosition - Nueva posición
     */
    updateWidgetPosition(widgetId, newPosition) {
        const widgetConfig = this.layout.widgets.find(w => w.id === widgetId);
        if (!widgetConfig) return;
        
        // Remover de la posición actual
        const currentIndex = this.layout.widgets.indexOf(widgetConfig);
        this.layout.widgets.splice(currentIndex, 1);
        
        // Insertar en la nueva posición
        this.layout.widgets.splice(newPosition, 0, widgetConfig);
        
        // Actualizar posiciones en el layout
        this.layout.widgets.forEach((widget, index) => {
            widget.position = { x: index % 4, y: Math.floor(index / 4) };
        });
        
        // Guardar layout
        this.saveLayout();
        
        // Emitir evento
        this.emitEvent('DASHBOARD_LAYOUT_CHANGED', {
            widgetId: widgetId,
            newPosition: newPosition,
            layout: this.layout
        });
        
        console.log(`Widget ${widgetId} movido a posición ${newPosition}`);
    }
    
    /**
     * Obtiene estadísticas del dashboard
     * @returns {Object} Estadísticas del dashboard
     */
    getDashboardStats() {
        const stats = {
            widgetCount: this.widgets.size,
            editMode: this.isEditMode,
            layout: this.layout ? this.layout.widgets.length : 0,
            eventBusStats: this.eventBus ? this.eventBus.getStats() : null,
            dragDropState: this.dragDropManager ? this.dragDropManager.getState() : null
        };
        
        return stats;
    }
    
    /**
     * Obtiene la instancia singleton del DashboardManager
     * @returns {DashboardManager} Instancia del manager
     */
    static getInstance() {
        if (!DashboardManager.instance) {
            DashboardManager.instance = new DashboardManager();
        }
        return DashboardManager.instance;
    }
}

// Hacer disponible globalmente
window.DashboardManager = DashboardManager;