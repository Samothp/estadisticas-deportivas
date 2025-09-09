/**
 * AdvancedChartEngine - Motor de gráficos avanzados para el dashboard
 * Extiende Chart.js con tipos de gráficos personalizados y funcionalidades avanzadas
 */
class AdvancedChartEngine {
    constructor() {
        this.chartTypes = new Map();
        this.defaultTheme = 'light';
        this.globalOptions = {};
        this.activeCharts = new Map();
        
        this.initializeEngine();
        this.registerDefaultChartTypes();
    }
    
    /**
     * Inicializa el motor de gráficos
     */
    initializeEngine() {
        // Verificar que Chart.js esté disponible
        if (typeof Chart === 'undefined') {
            console.error('AdvancedChartEngine: Chart.js no está disponible');
            return;
        }
        
        // Configurar opciones globales por defecto
        this.globalOptions = {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#ffffff',
                    borderWidth: 1,
                    cornerRadius: 6,
                    displayColors: true,
                    callbacks: {
                        title: (context) => {
                            return context[0].label || '';
                        },
                        label: (context) => {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y || context.parsed;
                            return `${label}: ${this.formatValue(value)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        maxRotation: 45
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            animation: {
                duration: 750,
                easing: 'easeInOutQuart'
            }
        };
        
        // Aplicar tema por defecto
        this.applyTheme(this.defaultTheme);
        
        console.log('AdvancedChartEngine: Inicializado correctamente');
    }
    
    /**
     * Registra los tipos de gráficos por defecto
     */
    registerDefaultChartTypes() {
        // Los tipos específicos se registrarán cuando se carguen sus archivos
        this.chartTypes.set('timeline', null);
        this.chartTypes.set('comparison', null);
        this.chartTypes.set('heatmap', null);
        this.chartTypes.set('scatter', null);
        this.chartTypes.set('performance', null);
    }
    
    /**
     * Registra un nuevo tipo de gráfico
     * @param {string} type - Tipo de gráfico
     * @param {Class} chartClass - Clase del gráfico
     */
    registerChartType(type, chartClass) {
        if (!type || typeof type !== 'string') {
            throw new Error('El tipo de gráfico debe ser un string válido');
        }
        
        if (!chartClass || typeof chartClass !== 'function') {
            throw new Error('La clase del gráfico debe ser una función constructora válida');
        }
        
        this.chartTypes.set(type, chartClass);
        console.log(`AdvancedChartEngine: Tipo '${type}' registrado`);
    }
    
    /**
     * Crea un gráfico del tipo especificado
     * @param {string} type - Tipo de gráfico
     * @param {HTMLElement|string} container - Container del gráfico
     * @param {Object} data - Datos del gráfico
     * @param {Object} options - Opciones del gráfico
     * @returns {Object} Instancia del gráfico
     */
    createChart(type, container, data, options = {}) {
        try {
            // Obtener elemento del container
            const element = typeof container === 'string' 
                ? document.getElementById(container) 
                : container;
                
            if (!element) {
                throw new Error(`Container no encontrado: ${container}`);
            }
            
            // Verificar si el tipo está registrado
            const ChartClass = this.chartTypes.get(type);
            
            if (!ChartClass) {
                console.warn(`Tipo de gráfico '${type}' no registrado, usando gráfico básico`);
                return this.createBasicChart(type, element, data, options);
            }
            
            // Combinar opciones con las globales
            const mergedOptions = this.mergeOptions(options);
            
            // Crear instancia del gráfico
            const chartInstance = new ChartClass(element, data, mergedOptions);
            
            // Registrar el gráfico activo
            const chartId = this.generateChartId();
            this.activeCharts.set(chartId, {
                instance: chartInstance,
                type: type,
                container: element,
                data: data,
                options: mergedOptions
            });
            
            // Agregar ID al elemento para referencia
            element.setAttribute('data-chart-id', chartId);
            
            console.log(`AdvancedChartEngine: Gráfico '${type}' creado con ID: ${chartId}`);
            
            return {
                id: chartId,
                instance: chartInstance,
                update: (newData) => this.updateChart(chartId, newData),
                destroy: () => this.destroyChart(chartId),
                export: (format) => this.exportChart(chartId, format)
            };
            
        } catch (error) {
            console.error('Error creando gráfico:', error);
            return this.createErrorChart(container, error.message);
        }
    }
    
    /**
     * Crea un gráfico básico usando Chart.js estándar
     * @private
     */
    createBasicChart(type, container, data, options) {
        // Mapear tipos personalizados a tipos básicos de Chart.js
        const typeMapping = {
            'timeline': 'line',
            'comparison': 'bar',
            'performance': 'radar',
            'scatter': 'scatter'
        };
        
        const chartType = typeMapping[type] || 'bar';
        const canvas = this.createCanvas(container);
        const ctx = canvas.getContext('2d');
        
        const mergedOptions = this.mergeOptions(options);
        
        const chart = new Chart(ctx, {
            type: chartType,
            data: data,
            options: mergedOptions
        });
        
        const chartId = this.generateChartId();
        this.activeCharts.set(chartId, {
            instance: chart,
            type: type,
            container: container,
            data: data,
            options: mergedOptions
        });
        
        container.setAttribute('data-chart-id', chartId);
        
        return {
            id: chartId,
            instance: chart,
            update: (newData) => this.updateChart(chartId, newData),
            destroy: () => this.destroyChart(chartId),
            export: (format) => this.exportChart(chartId, format)
        };
    }
    
    /**
     * Crea un gráfico de error cuando falla la creación
     * @private
     */
    createErrorChart(container, errorMessage) {
        const element = typeof container === 'string' 
            ? document.getElementById(container) 
            : container;
            
        if (element) {
            element.innerHTML = `
                <div class="chart-error">
                    <div class="error-icon">⚠️</div>
                    <h4>Error en el gráfico</h4>
                    <p>${errorMessage}</p>
                    <button onclick="location.reload()" class="retry-btn">Reintentar</button>
                </div>
            `;
        }
        
        return {
            id: 'error',
            instance: null,
            update: () => {},
            destroy: () => {},
            export: () => null
        };
    }
    
    /**
     * Crea un canvas dentro del container
     * @private
     */
    createCanvas(container) {
        // Limpiar container
        container.innerHTML = '';
        
        // Crear canvas
        const canvas = document.createElement('canvas');
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        
        container.appendChild(canvas);
        return canvas;
    }
    
    /**
     * Combina opciones con las globales
     * @private
     */
    mergeOptions(options) {
        return this.deepMerge(this.globalOptions, options);
    }
    
    /**
     * Realiza un merge profundo de objetos
     * @private
     */
    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }
    
    /**
     * Actualiza un gráfico existente
     * @param {string} chartId - ID del gráfico
     * @param {Object} newData - Nuevos datos
     */
    updateChart(chartId, newData) {
        const chartInfo = this.activeCharts.get(chartId);
        
        if (!chartInfo) {
            console.warn(`Gráfico con ID ${chartId} no encontrado`);
            return;
        }
        
        try {
            if (chartInfo.instance && chartInfo.instance.update) {
                // Actualizar datos
                chartInfo.data = newData;
                chartInfo.instance.data = newData;
                chartInfo.instance.update('active');
                
                console.log(`Gráfico ${chartId} actualizado`);
            }
        } catch (error) {
            console.error(`Error actualizando gráfico ${chartId}:`, error);
        }
    }
    
    /**
     * Destruye un gráfico
     * @param {string} chartId - ID del gráfico
     */
    destroyChart(chartId) {
        const chartInfo = this.activeCharts.get(chartId);
        
        if (!chartInfo) {
            return;
        }
        
        try {
            if (chartInfo.instance && chartInfo.instance.destroy) {
                chartInfo.instance.destroy();
            }
            
            // Limpiar container
            if (chartInfo.container) {
                chartInfo.container.innerHTML = '';
                chartInfo.container.removeAttribute('data-chart-id');
            }
            
            // Remover de la lista de gráficos activos
            this.activeCharts.delete(chartId);
            
            console.log(`Gráfico ${chartId} destruido`);
        } catch (error) {
            console.error(`Error destruyendo gráfico ${chartId}:`, error);
        }
    }
    
    /**
     * Exporta un gráfico a imagen
     * @param {string} chartId - ID del gráfico
     * @param {string} format - Formato de exportación ('png', 'jpeg')
     * @returns {string} Data URL de la imagen
     */
    exportChart(chartId, format = 'png') {
        const chartInfo = this.activeCharts.get(chartId);
        
        if (!chartInfo || !chartInfo.instance) {
            console.warn(`Gráfico ${chartId} no disponible para exportación`);
            return null;
        }
        
        try {
            if (chartInfo.instance.toBase64Image) {
                return chartInfo.instance.toBase64Image(`image/${format}`, 1.0);
            }
            
            // Fallback para gráficos personalizados
            const canvas = chartInfo.container.querySelector('canvas');
            if (canvas) {
                return canvas.toDataURL(`image/${format}`, 1.0);
            }
            
            return null;
        } catch (error) {
            console.error(`Error exportando gráfico ${chartId}:`, error);
            return null;
        }
    }
    
    /**
     * Aplica un tema a todos los gráficos
     * @param {string} theme - Nombre del tema ('light', 'dark')
     */
    applyTheme(theme) {
        this.defaultTheme = theme;
        
        const themes = {
            light: {
                backgroundColor: '#ffffff',
                textColor: '#333333',
                gridColor: 'rgba(0, 0, 0, 0.1)',
                colors: ['#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1']
            },
            dark: {
                backgroundColor: '#2d3748',
                textColor: '#ffffff',
                gridColor: 'rgba(255, 255, 255, 0.1)',
                colors: ['#4299e1', '#48bb78', '#ed8936', '#f56565', '#38b2ac', '#9f7aea']
            }
        };
        
        const themeConfig = themes[theme] || themes.light;
        
        // Actualizar opciones globales
        this.globalOptions.plugins.legend.labels.color = themeConfig.textColor;
        this.globalOptions.scales.x.grid.color = themeConfig.gridColor;
        this.globalOptions.scales.y.grid.color = themeConfig.gridColor;
        this.globalOptions.scales.x.ticks.color = themeConfig.textColor;
        this.globalOptions.scales.y.ticks.color = themeConfig.textColor;
        
        // Actualizar gráficos existentes
        for (const [chartId, chartInfo] of this.activeCharts) {
            this.updateChartTheme(chartId, themeConfig);
        }
        
        console.log(`AdvancedChartEngine: Tema '${theme}' aplicado`);
    }
    
    /**
     * Actualiza el tema de un gráfico específico
     * @private
     */
    updateChartTheme(chartId, themeConfig) {
        const chartInfo = this.activeCharts.get(chartId);
        
        if (!chartInfo || !chartInfo.instance) {
            return;
        }
        
        try {
            // Actualizar colores del dataset
            if (chartInfo.instance.data && chartInfo.instance.data.datasets) {
                chartInfo.instance.data.datasets.forEach((dataset, index) => {
                    const colorIndex = index % themeConfig.colors.length;
                    dataset.backgroundColor = themeConfig.colors[colorIndex];
                    dataset.borderColor = themeConfig.colors[colorIndex];
                });
            }
            
            // Actualizar opciones
            if (chartInfo.instance.options) {
                const options = chartInfo.instance.options;
                
                if (options.plugins && options.plugins.legend) {
                    options.plugins.legend.labels.color = themeConfig.textColor;
                }
                
                if (options.scales) {
                    Object.keys(options.scales).forEach(scaleKey => {
                        const scale = options.scales[scaleKey];
                        if (scale.grid) scale.grid.color = themeConfig.gridColor;
                        if (scale.ticks) scale.ticks.color = themeConfig.textColor;
                    });
                }
            }
            
            chartInfo.instance.update('none');
        } catch (error) {
            console.error(`Error actualizando tema del gráfico ${chartId}:`, error);
        }
    }
    
    /**
     * Formatea un valor para mostrar en tooltips
     * @private
     */
    formatValue(value) {
        if (typeof value === 'number') {
            return value.toLocaleString();
        }
        return value;
    }
    
    /**
     * Genera un ID único para gráficos
     * @private
     */
    generateChartId() {
        return `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Obtiene información de todos los gráficos activos
     * @returns {Array} Lista de gráficos activos
     */
    getActiveCharts() {
        const charts = [];
        
        for (const [id, info] of this.activeCharts) {
            charts.push({
                id: id,
                type: info.type,
                hasData: !!(info.data && info.data.datasets && info.data.datasets.length > 0)
            });
        }
        
        return charts;
    }
    
    /**
     * Destruye todos los gráficos activos
     */
    destroyAllCharts() {
        const chartIds = Array.from(this.activeCharts.keys());
        
        chartIds.forEach(id => {
            this.destroyChart(id);
        });
        
        console.log(`AdvancedChartEngine: ${chartIds.length} gráficos destruidos`);
    }
    
    /**
     * Obtiene estadísticas del motor de gráficos
     * @returns {Object} Estadísticas
     */
    getStats() {
        return {
            activeCharts: this.activeCharts.size,
            registeredTypes: Array.from(this.chartTypes.keys()),
            currentTheme: this.defaultTheme,
            chartsList: this.getActiveCharts()
        };
    }
}

// Instancia singleton del motor de gráficos
let chartEngineInstance = null;

/**
 * Obtiene la instancia singleton del AdvancedChartEngine
 * @returns {AdvancedChartEngine} Instancia del motor
 */
AdvancedChartEngine.getInstance = function() {
    if (!chartEngineInstance) {
        chartEngineInstance = new AdvancedChartEngine();
    }
    return chartEngineInstance;
};

// Hacer disponible globalmente
window.AdvancedChartEngine = AdvancedChartEngine;