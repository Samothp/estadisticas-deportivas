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
        
        // Limpiar container
        container.innerHTML = '';
        
        // Crear widgets según el layout
        for (const widgetConfig of this.layout.widgets) {
            try {
                const widget = await this.createWidget(widgetConfig);
                if (widget) {
                    this.widgets.set(widgetConfig.id, widget);
                    container.appendChild(widget.element);
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
        
        // Escuchar cambios en los datos para actualizar widgets
        document.addEventListener('statsUpdated', () => this.refreshAllWidgets());
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
    }
    
    /**
     * Habilita funcionalidad de drag & drop
     */
    enableDragAndDrop() {
        // Se implementará cuando integremos Sortable.js
        console.log('Drag & Drop habilitado');
    }
    
    /**
     * Deshabilita funcionalidad de drag & drop
     */
    disableDragAndDrop() {
        console.log('Drag & Drop deshabilitado');
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
            // Remover del DOM
            if (widget.element && widget.element.parentNode) {
                widget.element.parentNode.removeChild(widget.element);
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