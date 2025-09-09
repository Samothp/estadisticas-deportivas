/**
 * ComparisonChart - Gráfico de barras comparativo para múltiples entidades
 * Permite comparar hasta 5 jugadores o equipos simultáneamente con métricas normalizadas
 */
class ComparisonChart {
    constructor(container, data, options = {}) {
        this.container = container;
        this.data = data;
        this.options = this.mergeDefaultOptions(options);
        this.chart = null;
        this.chartType = 'bar'; // 'bar' o 'horizontal'
        this.showNormalized = false;
        this.originalData = JSON.parse(JSON.stringify(data));
        
        this.init();
    }
    
    /**
     * Inicializa el gráfico de comparación
     */
    init() {
        try {
            this.createWrapper();
            this.processData();
            this.createChart();
            this.setupControls();
            
            console.log('ComparisonChart: Inicializado correctamente');
        } catch (error) {
            console.error('Error inicializando ComparisonChart:', error);
            this.showError(error.message);
        }
    }
    
    /**
     * Combina opciones por defecto con las proporcionadas
     */
    mergeDefaultOptions(options) {
        const defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: options.horizontal ? 'y' : 'x',
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                title: {
                    display: true,
                    text: options.title || 'Comparación de Rendimiento',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    position: options.horizontal ? 'right' : 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        generateLabels: (chart) => {
                            return this.generateCustomLegend(chart);
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#ffffff',
                    borderWidth: 1,
                    cornerRadius: 6,
                    callbacks: {
                        title: (context) => {
                            const entity = context[0].label;
                            return `${entity}`;
                        },
                        label: (context) => {
                            const metric = context.dataset.label;
                            const value = context.parsed[options.horizontal ? 'x' : 'y'];
                            const originalValue = this.getOriginalValue(context);
                            
                            let label = `${metric}: ${this.formatValue(value)}`;
                            
                            if (this.showNormalized && originalValue !== value) {
                                label += ` (Original: ${this.formatValue(originalValue)})`;
                            }
                            
                            return label;
                        },
                        afterBody: (context) => {
                            const entityIndex = context[0].dataIndex;
                            const entity = this.data.labels[entityIndex];
                            const additionalInfo = this.getEntityInfo(entity);
                            
                            return additionalInfo;
                        }
                    }
                }
            },
            scales: this.createScalesConfig(options),
            animation: {
                duration: 800,
                easing: 'easeInOutQuart'
            },
            // Opciones específicas del comparison chart
            comparison: {
                maxEntities: options.maxEntities || 5,
                allowNormalization: options.allowNormalization !== false,
                showPercentages: options.showPercentages || false,
                colorScheme: options.colorScheme || 'default'
            }
        };
        
        return this.deepMerge(defaultOptions, options);
    }
    
    /**
     * Crea la configuración de escalas
     */
    createScalesConfig(options) {
        const isHorizontal = options.horizontal;
        
        const scales = {};
        
        // Escala de categorías (entidades)
        scales[isHorizontal ? 'y' : 'x'] = {
            type: 'category',
            title: {
                display: true,
                text: options.entityLabel || 'Entidades'
            },
            grid: {
                display: false
            },
            ticks: {
                maxRotation: isHorizontal ? 0 : 45,
                callback: function(value, index) {
                    const label = this.getLabelForValue(value);
                    return label.length > 15 ? label.substring(0, 12) + '...' : label;
                }
            }
        };
        
        // Escala de valores (métricas)
        scales[isHorizontal ? 'x' : 'y'] = {
            type: 'linear',
            beginAtZero: true,
            title: {
                display: true,
                text: options.valueLabel || 'Valor'
            },
            grid: {
                display: true,
                color: 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
                callback: (value) => this.formatValue(value)
            }
        };
        
        return scales;
    }
    
    /**
     * Crea el wrapper con controles
     */
    createWrapper() {
        this.container.innerHTML = '';
        
        const wrapper = document.createElement('div');
        wrapper.className = 'comparison-chart-wrapper';
        
        // Crear controles
        const controls = this.createControls();
        wrapper.appendChild(controls);
        
        // Crear canvas
        const canvas = document.createElement('canvas');
        canvas.style.width = '100%';
        canvas.style.height = 'calc(100% - 50px)';
        
        wrapper.appendChild(canvas);
        this.container.appendChild(wrapper);
        
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }
    
    /**
     * Crea controles del gráfico
     */
    createControls() {
        const controls = document.createElement('div');
        controls.className = 'comparison-controls';
        
        const controlsHTML = `
            <div class="comparison-toggles">
                <button class="comparison-toggle ${this.chartType === 'bar' ? 'active' : ''}" 
                        data-type="bar" title="Barras Verticales">📊</button>
                <button class="comparison-toggle ${this.chartType === 'horizontal' ? 'active' : ''}" 
                        data-type="horizontal" title="Barras Horizontales">📈</button>
                ${this.options.comparison.allowNormalization ? `
                    <button class="comparison-toggle ${this.showNormalized ? 'active' : ''}" 
                            data-action="normalize" title="Normalizar Datos">⚖️</button>
                ` : ''}
                <button class="comparison-toggle" data-action="export" title="Exportar">💾</button>
            </div>
            <div class="comparison-info">
                <span class="entity-count">${this.data.labels ? this.data.labels.length : 0} entidades</span>
            </div>
        `;
        
        controls.innerHTML = controlsHTML;
        
        // Event listeners
        controls.addEventListener('click', (e) => {
            const button = e.target.closest('.comparison-toggle');
            if (!button) return;
            
            const type = button.dataset.type;
            const action = button.dataset.action;
            
            if (type) {
                this.changeChartType(type);
            } else if (action) {
                this.handleAction(action);
            }
        });
        
        return controls;
    }
    
    /**
     * Procesa los datos para el gráfico
     */
    processData() {
        if (!this.data || !this.data.datasets) {
            throw new Error('Datos inválidos para ComparisonChart');
        }
        
        // Limitar número de entidades
        if (this.data.labels && this.data.labels.length > this.options.comparison.maxEntities) {
            console.warn(`Limitando a ${this.options.comparison.maxEntities} entidades`);
            this.data.labels = this.data.labels.slice(0, this.options.comparison.maxEntities);
            
            this.data.datasets.forEach(dataset => {
                if (dataset.data) {
                    dataset.data = dataset.data.slice(0, this.options.comparison.maxEntities);
                }
            });
        }
        
        // Configurar colores y estilos
        this.data.datasets.forEach((dataset, index) => {
            this.configureDatasetStyle(dataset, index);
        });
        
        // Aplicar normalización si está activada
        if (this.showNormalized) {
            this.applyNormalization();
        }
    }
    
    /**
     * Configura el estilo de un dataset
     */
    configureDatasetStyle(dataset, index) {
        const colorSchemes = {
            default: ['#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1'],
            pastel: ['#a8dadc', '#457b9d', '#1d3557', '#f1faee', '#e63946', '#2a9d8f'],
            vibrant: ['#ff006e', '#8338ec', '#3a86ff', '#06ffa5', '#ffbe0b', '#fb5607']
        };
        
        const colors = colorSchemes[this.options.comparison.colorScheme] || colorSchemes.default;
        const baseColor = colors[index % colors.length];
        
        // Configurar colores
        dataset.backgroundColor = dataset.backgroundColor || this.addAlpha(baseColor, 0.8);
        dataset.borderColor = dataset.borderColor || baseColor;
        dataset.borderWidth = dataset.borderWidth || 2;
        
        // Configurar hover
        dataset.hoverBackgroundColor = baseColor;
        dataset.hoverBorderColor = this.darkenColor(baseColor, 0.2);
        dataset.hoverBorderWidth = 3;
        
        // Configurar barRadius si es soportado
        if (this.chartType === 'bar') {
            dataset.borderRadius = 4;
            dataset.borderSkipped = false;
        }
    }
    
    /**
     * Aplica normalización a los datos
     */
    applyNormalization() {
        this.data.datasets.forEach(dataset => {
            if (!dataset.data || dataset.data.length === 0) return;
            
            const values = dataset.data.filter(v => typeof v === 'number');
            if (values.length === 0) return;
            
            const max = Math.max(...values);
            const min = Math.min(...values);
            const range = max - min;
            
            if (range === 0) return;
            
            // Normalizar a escala 0-100
            dataset.data = dataset.data.map(value => {
                if (typeof value !== 'number') return value;
                return Math.round(((value - min) / range) * 100);
            });
            
            // Marcar como normalizado
            dataset.normalized = true;
        });
    }
    
    /**
     * Restaura los datos originales
     */
    restoreOriginalData() {
        this.data = JSON.parse(JSON.stringify(this.originalData));
        this.processData();
    }
    
    /**
     * Crea el gráfico Chart.js
     */
    createChart() {
        const chartType = this.chartType === 'horizontal' ? 'bar' : 'bar';
        
        this.chart = new Chart(this.ctx, {
            type: chartType,
            data: this.data,
            options: this.options
        });
    }
    
    /**
     * Configura controles adicionales
     */
    setupControls() {
        // Los controles ya están configurados en createControls()
    }
    
    /**
     * Cambia el tipo de gráfico
     */
    changeChartType(newType) {
        if (newType === this.chartType) return;
        
        this.chartType = newType;
        
        // Actualizar opciones
        this.options.indexAxis = newType === 'horizontal' ? 'y' : 'x';
        this.options.plugins.legend.position = newType === 'horizontal' ? 'right' : 'top';
        this.options.scales = this.createScalesConfig({ horizontal: newType === 'horizontal' });
        
        // Recrear gráfico
        if (this.chart) {
            this.chart.destroy();
        }
        
        this.createChart();
        this.updateControlsState();
    }
    
    /**
     * Maneja acciones de los controles
     */
    handleAction(action) {
        switch (action) {
            case 'normalize':
                this.toggleNormalization();
                break;
            case 'export':
                this.exportChart();
                break;
        }
    }
    
    /**
     * Alterna la normalización de datos
     */
    toggleNormalization() {
        this.showNormalized = !this.showNormalized;
        
        if (this.showNormalized) {
            this.applyNormalization();
        } else {
            this.restoreOriginalData();
        }
        
        if (this.chart) {
            this.chart.data = this.data;
            this.chart.update();
        }
        
        this.updateControlsState();
    }
    
    /**
     * Actualiza el estado visual de los controles
     */
    updateControlsState() {
        const controls = this.container.querySelectorAll('.comparison-toggle');
        
        controls.forEach(control => {
            const type = control.dataset.type;
            const action = control.dataset.action;
            
            control.classList.remove('active');
            
            if (type === this.chartType) {
                control.classList.add('active');
            } else if (action === 'normalize' && this.showNormalized) {
                control.classList.add('active');
            }
        });
    }
    
    /**
     * Genera leyenda personalizada
     */
    generateCustomLegend(chart) {
        const original = Chart.defaults.plugins.legend.labels.generateLabels(chart);
        
        return original.map(item => {
            const dataset = chart.data.datasets[item.datasetIndex];
            
            if (dataset.normalized) {
                item.text += ' (Normalizado)';
            }
            
            return item;
        });
    }
    
    /**
     * Obtiene el valor original antes de normalización
     */
    getOriginalValue(context) {
        const datasetIndex = context.datasetIndex;
        const dataIndex = context.dataIndex;
        
        const originalDataset = this.originalData.datasets[datasetIndex];
        if (originalDataset && originalDataset.data) {
            return originalDataset.data[dataIndex];
        }
        
        return context.parsed[this.options.indexAxis === 'y' ? 'x' : 'y'];
    }
    
    /**
     * Obtiene información adicional de una entidad
     */
    getEntityInfo(entity) {
        // Esta información podría venir de los datos originales
        // Por ahora retornamos información básica
        const info = [];
        
        if (this.data.entityInfo && this.data.entityInfo[entity]) {
            const entityData = this.data.entityInfo[entity];
            
            if (entityData.totalGames) {
                info.push(`Partidos: ${entityData.totalGames}`);
            }
            if (entityData.efficiency) {
                info.push(`Eficiencia: ${(entityData.efficiency * 100).toFixed(1)}%`);
            }
        }
        
        return info;
    }
    
    /**
     * Exporta el gráfico
     */
    exportChart() {
        if (!this.chart) return;
        
        try {
            const dataURL = this.chart.toBase64Image('image/png', 1.0);
            
            // Crear enlace de descarga
            const link = document.createElement('a');
            link.download = `comparison-chart-${Date.now()}.png`;
            link.href = dataURL;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('ComparisonChart: Gráfico exportado');
        } catch (error) {
            console.error('Error exportando gráfico:', error);
        }
    }
    
    /**
     * Actualiza los datos del gráfico
     */
    update(newData) {
        if (!this.chart) return;
        
        this.data = newData;
        this.originalData = JSON.parse(JSON.stringify(newData));
        this.processData();
        
        this.chart.data = this.data;
        this.chart.update();
        
        // Actualizar contador de entidades
        const entityCount = this.container.querySelector('.entity-count');
        if (entityCount) {
            entityCount.textContent = `${this.data.labels ? this.data.labels.length : 0} entidades`;
        }
    }
    
    /**
     * Destruye el gráfico
     */
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
    
    /**
     * Exporta el gráfico como imagen
     */
    toBase64Image(type = 'image/png', quality = 1.0) {
        if (!this.chart) return null;
        
        return this.chart.toBase64Image(type, quality);
    }
    
    /**
     * Añade transparencia a un color
     */
    addAlpha(color, alpha) {
        if (color.startsWith('#')) {
            const hex = color.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        
        return color;
    }
    
    /**
     * Oscurece un color
     */
    darkenColor(color, amount) {
        if (color.startsWith('#')) {
            const hex = color.replace('#', '');
            const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - Math.round(255 * amount));
            const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - Math.round(255 * amount));
            const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - Math.round(255 * amount));
            
            return `rgb(${r}, ${g}, ${b})`;
        }
        
        return color;
    }
    
    /**
     * Formatea un valor para mostrar
     */
    formatValue(value) {
        if (typeof value === 'number') {
            if (this.showNormalized) {
                return `${value}%`;
            }
            return value % 1 === 0 ? value.toString() : value.toFixed(2);
        }
        return value;
    }
    
    /**
     * Muestra un error en el container
     */
    showError(message) {
        this.container.innerHTML = `
            <div class="chart-error">
                <div class="error-icon">📊❌</div>
                <h4>Error en Comparison Chart</h4>
                <p>${message}</p>
            </div>
        `;
    }
    
    /**
     * Merge profundo de objetos
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
}

// Registrar el tipo de gráfico en el motor
document.addEventListener('DOMContentLoaded', () => {
    const engine = window.AdvancedChartEngine?.getInstance();
    if (engine) {
        engine.registerChartType('comparison', ComparisonChart);
        console.log('ComparisonChart registrado en AdvancedChartEngine');
    }
});

// Hacer disponible globalmente
window.ComparisonChart = ComparisonChart;