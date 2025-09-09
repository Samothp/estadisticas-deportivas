/**
 * WidgetFactory - Factory pattern para crear widgets dinámicamente
 * Gestiona el registro y creación de diferentes tipos de widgets
 */
class WidgetFactory {
    constructor() {
        this.widgetTypes = new Map();
        this.registerDefaultWidgets();
    }
    
    /**
     * Registra los widgets por defecto del sistema
     */
    registerDefaultWidgets() {
        // Los widgets se registrarán cuando sus archivos se carguen
        // Por ahora registramos placeholders que se reemplazarán
        this.widgetTypes.set('TopPlayersWidget', null);
        this.widgetTypes.set('TeamStatsWidget', null);
        this.widgetTypes.set('TrendChartWidget', null);
        this.widgetTypes.set('RecentActionsWidget', null);
        this.widgetTypes.set('ComparisonWidget', null);
        this.widgetTypes.set('SummaryWidget', null);
    }
    
    /**
     * Registra un nuevo tipo de widget
     * @param {string} type - Nombre del tipo de widget
     * @param {Class} widgetClass - Clase del widget
     */
    register(type, widgetClass) {
        if (!type || typeof type !== 'string') {
            throw new Error('El tipo de widget debe ser un string válido');
        }
        
        if (!widgetClass || typeof widgetClass !== 'function') {
            throw new Error('La clase del widget debe ser una función constructora válida');
        }
        
        // Verificar que la clase extiende BaseWidget
        if (!this.extendsBaseWidget(widgetClass)) {
            console.warn(`La clase ${widgetClass.name} no extiende BaseWidget`);
        }
        
        this.widgetTypes.set(type, widgetClass);
        console.log(`Widget tipo '${type}' registrado correctamente`);
    }
    
    /**
     * Verifica si una clase extiende BaseWidget
     * @param {Class} widgetClass - Clase a verificar
     * @returns {boolean} True si extiende BaseWidget
     */
    extendsBaseWidget(widgetClass) {
        let currentClass = widgetClass;
        while (currentClass) {
            if (currentClass.name === 'BaseWidget') {
                return true;
            }
            currentClass = Object.getPrototypeOf(currentClass);
        }
        return false;
    }
    
    /**
     * Crea una instancia de widget del tipo especificado
     * @param {Object} config - Configuración del widget
     * @returns {Object|null} Instancia del widget o null si hay error
     */
    create(config) {
        if (!config || !config.type) {
            console.error('Configuración de widget inválida: falta el tipo');
            return null;
        }
        
        const WidgetClass = this.widgetTypes.get(config.type);
        
        if (!WidgetClass) {
            console.error(`Tipo de widget '${config.type}' no registrado`);
            return this.createFallbackWidget(config);
        }
        
        try {
            const widget = new WidgetClass(config);
            console.log(`Widget '${config.type}' creado con ID: ${config.id}`);
            return widget;
        } catch (error) {
            console.error(`Error creando widget '${config.type}':`, error);
            return this.createFallbackWidget(config);
        }
    }
    
    /**
     * Crea un widget de fallback cuando hay errores
     * @param {Object} config - Configuración original del widget
     * @returns {Object} Widget de fallback
     */
    createFallbackWidget(config) {
        return new FallbackWidget(config);
    }
    
    /**
     * Obtiene la lista de tipos de widgets disponibles
     * @returns {Array} Array con los nombres de tipos disponibles
     */
    getAvailableTypes() {
        return Array.from(this.widgetTypes.keys()).filter(type => 
            this.widgetTypes.get(type) !== null
        );
    }
    
    /**
     * Verifica si un tipo de widget está disponible
     * @param {string} type - Tipo de widget a verificar
     * @returns {boolean} True si está disponible
     */
    isTypeAvailable(type) {
        return this.widgetTypes.has(type) && this.widgetTypes.get(type) !== null;
    }
    
    /**
     * Desregistra un tipo de widget
     * @param {string} type - Tipo de widget a desregistrar
     */
    unregister(type) {
        if (this.widgetTypes.has(type)) {
            this.widgetTypes.delete(type);
            console.log(`Widget tipo '${type}' desregistrado`);
        }
    }
    
    /**
     * Obtiene información sobre un tipo de widget
     * @param {string} type - Tipo de widget
     * @returns {Object|null} Información del widget o null
     */
    getWidgetInfo(type) {
        const WidgetClass = this.widgetTypes.get(type);
        if (!WidgetClass) {
            return null;
        }
        
        return {
            type: type,
            name: WidgetClass.name,
            available: true,
            description: WidgetClass.description || 'Sin descripción disponible'
        };
    }
    
    /**
     * Crea múltiples widgets desde una configuración
     * @param {Array} configs - Array de configuraciones de widgets
     * @returns {Array} Array de widgets creados
     */
    createMultiple(configs) {
        if (!Array.isArray(configs)) {
            console.error('La configuración debe ser un array');
            return [];
        }
        
        const widgets = [];
        for (const config of configs) {
            const widget = this.create(config);
            if (widget) {
                widgets.push(widget);
            }
        }
        
        return widgets;
    }
    
    /**
     * Valida la configuración de un widget
     * @param {Object} config - Configuración a validar
     * @returns {Object} Resultado de la validación
     */
    validateConfig(config) {
        const result = {
            valid: true,
            errors: [],
            warnings: []
        };
        
        // Validaciones básicas
        if (!config) {
            result.valid = false;
            result.errors.push('Configuración no proporcionada');
            return result;
        }
        
        if (!config.id) {
            result.valid = false;
            result.errors.push('ID del widget es requerido');
        }
        
        if (!config.type) {
            result.valid = false;
            result.errors.push('Tipo del widget es requerido');
        }
        
        if (config.type && !this.isTypeAvailable(config.type)) {
            result.valid = false;
            result.errors.push(`Tipo de widget '${config.type}' no está disponible`);
        }
        
        // Validar tamaño
        const validSizes = ['small', 'medium', 'large', 'xlarge'];
        if (config.size && !validSizes.includes(config.size)) {
            result.warnings.push(`Tamaño '${config.size}' no es válido, se usará 'medium'`);
        }
        
        // Validar posición
        if (config.position) {
            if (typeof config.position.x !== 'number' || typeof config.position.y !== 'number') {
                result.warnings.push('Posición inválida, se usará posición por defecto');
            }
        }
        
        return result;
    }
}

/**
 * FallbackWidget - Widget que se muestra cuando hay errores
 */
class FallbackWidget extends BaseWidget {
    constructor(config) {
        super({
            ...config,
            type: 'FallbackWidget'
        });
        this.originalType = config.type;
    }
    
    getDefaultSettings() {
        return {
            ...super.getDefaultSettings(),
            title: `Error: ${this.originalType || 'Widget desconocido'}`
        };
    }
    
    render() {
        const body = this.element.querySelector('.widget-body');
        if (body) {
            body.innerHTML = `
                <div class="fallback-widget">
                    <div class="fallback-icon">⚠️</div>
                    <h4>Widget no disponible</h4>
                    <p>El widget de tipo '${this.originalType}' no pudo ser cargado.</p>
                    <p>Posibles causas:</p>
                    <ul>
                        <li>El tipo de widget no está registrado</li>
                        <li>Error en la clase del widget</li>
                        <li>Dependencias faltantes</li>
                    </ul>
                    <button class="btn btn-primary" onclick="this.closest('.widget').querySelector('.widget-refresh-btn').click()">
                        Reintentar
                    </button>
                </div>
            `;
        }
    }
    
    async refresh() {
        // Intentar recrear el widget original
        const manager = window.DashboardManager?.getInstance();
        if (manager) {
            const factory = window.WidgetFactory?.getInstance();
            if (factory && factory.isTypeAvailable(this.originalType)) {
                // El tipo ahora está disponible, intentar reemplazar
                console.log(`Reintentando crear widget ${this.originalType}`);
                manager.removeWidget(this.id);
                
                const newConfig = {
                    id: this.id,
                    type: this.originalType,
                    size: this.size,
                    position: this.position,
                    settings: this.settings
                };
                
                await manager.addWidget(newConfig);
                return;
            }
        }
        
        // Si no se puede recrear, solo actualizar la vista
        this.render();
    }
}

// Instancia singleton del factory
let factoryInstance = null;

/**
 * Obtiene la instancia singleton del WidgetFactory
 * @returns {WidgetFactory} Instancia del factory
 */
WidgetFactory.getInstance = function() {
    if (!factoryInstance) {
        factoryInstance = new WidgetFactory();
    }
    return factoryInstance;
};

// Hacer disponible globalmente
window.WidgetFactory = WidgetFactory;
window.FallbackWidget = FallbackWidget;