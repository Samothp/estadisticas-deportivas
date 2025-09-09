/**
 * TimelineChart - Gráfico de líneas temporal con funcionalidades avanzadas
 * Muestra la evolución de métricas a lo largo del tiempo con zoom y marcadores
 */
class TimelineChart {
    constructor(container, data, options = {}) {
        this.container = container;
        this.data = data;
        this.options = this.mergeDefaultOptions(options);
        this.chart = null;
        this.zoomLevel = 1;
        this.panOffset = 0;
        
        this.init();
    }
    
    /**
     * Inicializa el gráfico timeline
     */
    init() {
        try {
            this.createCanvas();
            this.processData();
            this.createChart();
            this.setupInteractions();
            
            console.log('TimelineChart: Inicializado correctamente');
        } catch (error) {
            console.error('Error inicializando TimelineChart:', error);
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
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                title: {
                    display: true,
                    text: options.title || 'Evolución Temporal',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
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
                    callbacks: {
                        title: (context) => {
                            return `Jornada ${context[0].label}`;
                        },
                        label: (context) => {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            return `${label}: ${this.formatValue(value)}`;
                        },
                        afterBody: (context) => {
                            // Mostrar información adicional si está disponible
                            const dataPoint = context[0];
                            const rawData = this.data.datasets[dataPoint.datasetIndex].rawData;
                            
                            if (rawData && rawData[dataPoint.dataIndex]) {
                                const info = rawData[dataPoint.dataIndex];
                                const additional = [];
                                
                                if (info.trend) {
                                    additional.push(`Tendencia: ${this.getTrendText(info.trend)}`);
                                }
                                if (info.change !== undefined) {
                                    additional.push(`Cambio: ${info.change > 0 ? '+' : ''}${info.change}%`);
                                }
                                
                                return additional;
                            }
                            
                            return [];
                        }
                    }
                },
                // Plugin personalizado para marcadores de eventos
                annotation: {
                    annotations: this.createEventMarkers()
                }
            },
            scales: {
                x: {
                    type: 'category',
                    title: {
                        display: true,
                        text: 'Jornadas'
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        maxRotation: 45,
                        callback: function(value, index) {
                            return `J${this.getLabelForValue(value)}`;
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: options.yAxisLabel || 'Valor'
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        callback: (value) => this.formatValue(value)
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            },
            // Opciones específicas del timeline
            timeline: {
                showTrendLines: options.showTrendLines !== false,
                showEventMarkers: options.showEventMarkers !== false,
                enableZoom: options.enableZoom !== false,
                smoothLines: options.smoothLines !== false
            }
        };
        
        return this.deepMerge(defaultOptions, options);
    }
    
    /**
     * Crea el canvas para el gráfico
     */
    createCanvas() {
        this.container.innerHTML = '';
        
        // Crear wrapper para controles
        const wrapper = document.createElement('div');
        wrapper.className = 'timeline-chart-wrapper';
        
        // Crear controles de zoom si están habilitados
        if (this.options.timeline.enableZoom) {
            const controls = this.createZoomControls();
            wrapper.appendChild(controls);
        }
        
        // Crear canvas
        const canvas = document.createElement('canvas');
        canvas.style.width = '100%';
        canvas.style.height = 'calc(100% - 40px)';
        
        wrapper.appendChild(canvas);
        this.container.appendChild(wrapper);
        
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }
    
    /**
     * Crea controles de zoom
     */
    createZoomControls() {
        const controls = document.createElement('div');
        controls.className = 'timeline-controls';
        controls.innerHTML = `
            <div class="zoom-controls">
                <button class="zoom-btn zoom-in" title="Acercar">🔍+</button>
                <button class="zoom-btn zoom-out" title="Alejar">🔍-</button>
                <button class="zoom-btn zoom-reset" title="Restablecer">⌂</button>
                <span class="zoom-level">Zoom: ${Math.round(this.zoomLevel * 100)}%</span>
            </div>
        `;
        
        // Event listeners para controles
        controls.querySelector('.zoom-in').addEventListener('click', () => this.zoomIn());
        controls.querySelector('.zoom-out').addEventListener('click', () => this.zoomOut());
        controls.querySelector('.zoom-reset').addEventListener('click', () => this.resetZoom());
        
        return controls;
    }
    
    /**
     * Procesa los datos para el gráfico timeline
     */
    processData() {
        if (!this.data || !this.data.datasets) {
            throw new Error('Datos inválidos para TimelineChart');
        }
        
        // Procesar cada dataset
        this.data.datasets.forEach((dataset, index) => {
            // Configurar colores si no están definidos
            if (!dataset.borderColor) {
                dataset.borderColor = this.getColorForIndex(index);
            }
            if (!dataset.backgroundColor) {
                dataset.backgroundColor = this.getColorForIndex(index, 0.1);
            }
            
            // Configurar estilo de línea
            dataset.fill = dataset.fill !== false;
            dataset.tension = this.options.timeline.smoothLines ? 0.4 : 0;
            dataset.pointRadius = 4;
            dataset.pointHoverRadius = 6;
            dataset.borderWidth = 2;
            
            // Agregar línea de tendencia si está habilitada
            if (this.options.timeline.showTrendLines && dataset.data.length > 2) {
                this.addTrendLine(dataset, index);
            }
        });
    }
    
    /**
     * Agrega línea de tendencia a un dataset
     */
    addTrendLine(dataset, datasetIndex) {
        const trendData = this.calculateTrendLine(dataset.data);
        
        if (trendData && trendData.length > 0) {
            // Crear dataset para la línea de tendencia
            const trendDataset = {
                label: `${dataset.label} (Tendencia)`,
                data: trendData,
                borderColor: dataset.borderColor,
                backgroundColor: 'transparent',
                borderDash: [5, 5],
                borderWidth: 1,
                pointRadius: 0,
                pointHoverRadius: 0,
                fill: false,
                tension: 0,
                order: dataset.order ? dataset.order + 0.1 : datasetIndex + 0.1
            };
            
            this.data.datasets.push(trendDataset);
        }
    }
    
    /**
     * Calcula la línea de tendencia usando regresión lineal
     */
    calculateTrendLine(data) {
        if (!data || data.length < 2) return null;
        
        const n = data.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        
        data.forEach((value, index) => {
            const x = index;
            const y = typeof value === 'object' ? value.y : value;
            
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumXX += x * x;
        });
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        // Generar puntos de la línea de tendencia
        return data.map((_, index) => ({
            x: index,
            y: slope * index + intercept
        }));
    }
    
    /**
     * Crea marcadores de eventos significativos
     */
    createEventMarkers() {
        const markers = [];
        
        if (!this.options.timeline.showEventMarkers) {
            return markers;
        }
        
        // Buscar eventos significativos en los datos
        this.data.datasets.forEach(dataset => {
            if (dataset.events) {
                dataset.events.forEach(event => {
                    markers.push({
                        type: 'line',
                        xMin: event.x,
                        xMax: event.x,
                        borderColor: event.color || '#ff6b6b',
                        borderWidth: 2,
                        borderDash: [3, 3],
                        label: {
                            content: event.label,
                            enabled: true,
                            position: 'top'
                        }
                    });
                });
            }
        });
        
        return markers;
    }
    
    /**
     * Crea el gráfico Chart.js
     */
    createChart() {
        this.chart = new Chart(this.ctx, {
            type: 'line',
            data: this.data,
            options: this.options
        });
    }
    
    /**
     * Configura interacciones adicionales
     */
    setupInteractions() {
        if (!this.options.timeline.enableZoom) return;
        
        // Zoom con rueda del mouse
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            if (e.deltaY < 0) {
                this.zoomIn();
            } else {
                this.zoomOut();
            }
        });
        
        // Pan con arrastre del mouse
        let isPanning = false;
        let lastX = 0;
        
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.ctrlKey) {
                isPanning = true;
                lastX = e.clientX;
                this.canvas.style.cursor = 'grabbing';
            }
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (isPanning) {
                const deltaX = e.clientX - lastX;
                this.pan(deltaX);
                lastX = e.clientX;
            }
        });
        
        this.canvas.addEventListener('mouseup', () => {
            isPanning = false;
            this.canvas.style.cursor = 'default';
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            isPanning = false;
            this.canvas.style.cursor = 'default';
        });
    }
    
    /**
     * Zoom in
     */
    zoomIn() {
        this.zoomLevel = Math.min(this.zoomLevel * 1.2, 5);
        this.applyZoom();
    }
    
    /**
     * Zoom out
     */
    zoomOut() {
        this.zoomLevel = Math.max(this.zoomLevel / 1.2, 0.5);
        this.applyZoom();
    }
    
    /**
     * Reset zoom
     */
    resetZoom() {
        this.zoomLevel = 1;
        this.panOffset = 0;
        this.applyZoom();
    }
    
    /**
     * Aplica el zoom actual
     */
    applyZoom() {
        if (!this.chart) return;
        
        // Actualizar escala X
        const xScale = this.chart.scales.x;
        if (xScale) {
            const totalLabels = this.data.labels.length;
            const visibleLabels = Math.max(Math.floor(totalLabels / this.zoomLevel), 3);
            
            const startIndex = Math.max(0, Math.floor(this.panOffset));
            const endIndex = Math.min(totalLabels - 1, startIndex + visibleLabels);
            
            xScale.options.min = startIndex;
            xScale.options.max = endIndex;
        }
        
        this.chart.update('none');
        this.updateZoomDisplay();
    }
    
    /**
     * Pan horizontal
     */
    pan(deltaX) {
        const sensitivity = 0.01;
        this.panOffset += deltaX * sensitivity * this.zoomLevel;
        
        const maxOffset = Math.max(0, this.data.labels.length - Math.floor(this.data.labels.length / this.zoomLevel));
        this.panOffset = Math.max(0, Math.min(this.panOffset, maxOffset));
        
        this.applyZoom();
    }
    
    /**
     * Actualiza la visualización del nivel de zoom
     */
    updateZoomDisplay() {
        const zoomDisplay = this.container.querySelector('.zoom-level');
        if (zoomDisplay) {
            zoomDisplay.textContent = `Zoom: ${Math.round(this.zoomLevel * 100)}%`;
        }
    }
    
    /**
     * Actualiza los datos del gráfico
     */
    update(newData) {
        if (!this.chart) return;
        
        this.data = newData;
        this.processData();
        
        this.chart.data = this.data;
        this.chart.update();
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
     * Obtiene color para un índice específico
     */
    getColorForIndex(index, alpha = 1) {
        const colors = [
            '#007bff', '#28a745', '#ffc107', '#dc3545', 
            '#17a2b8', '#6f42c1', '#fd7e14', '#20c997'
        ];
        
        const color = colors[index % colors.length];
        
        if (alpha < 1) {
            // Convertir hex a rgba
            const hex = color.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        
        return color;
    }
    
    /**
     * Formatea un valor para mostrar
     */
    formatValue(value) {
        if (typeof value === 'number') {
            return value % 1 === 0 ? value.toString() : value.toFixed(2);
        }
        return value;
    }
    
    /**
     * Obtiene texto descriptivo de tendencia
     */
    getTrendText(trend) {
        const trendMap = {
            'up': '↗️ Mejorando',
            'down': '↘️ Declinando',
            'stable': '➡️ Estable',
            'improving': '📈 Mejorando',
            'declining': '📉 Declinando'
        };
        
        return trendMap[trend] || trend;
    }
    
    /**
     * Muestra un error en el container
     */
    showError(message) {
        this.container.innerHTML = `
            <div class="timeline-error">
                <div class="error-icon">📊❌</div>
                <h4>Error en Timeline Chart</h4>
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
        engine.registerChartType('timeline', TimelineChart);
        console.log('TimelineChart registrado en AdvancedChartEngine');
    }
});

// Hacer disponible globalmente
window.TimelineChart = TimelineChart;