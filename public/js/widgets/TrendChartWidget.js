/**
 * TrendChartWidget - Widget que muestra gráficos de tendencias configurables
 * Permite selección de métrica y entidad (jugador/equipo) con visualización temporal
 */
class TrendChartWidget extends BaseWidget {
    constructor(config) {
        super(config);
        this.chartInstance = null;
        this.chartData = null;
        this.availableEntities = [];
        this.availableMetrics = [
            { id: 'goals', name: 'Goles', type: 'both' },
            { id: 'assists', name: 'Asistencias', type: 'both' },
            { id: 'yellowCards', name: 'Tarjetas Amarillas', type: 'both' },
            { id: 'redCards', name: 'Tarjetas Rojas', type: 'both' },
            { id: 'fouls', name: 'Faltas', type: 'both' },
            { id: 'avgGoalsPerGame', name: 'Promedio Goles/Partido', type: 'team' }
        ];
    }
    
    /**
     * Configuración por defecto del widget
     */
    getDefaultSettings() {
        return {
            ...super.getDefaultSettings(),
            title: 'Gráfico de Tendencias',
            entityType: 'player', // 'player' o 'team'
            selectedEntity: '',
            selectedMetric: 'goals',
            chartType: 'line', // 'line', 'bar', 'area'
            showDataPoints: true,
            showTrendLine: true,
            timeRange: 'last10', // 'all', 'last5', 'last10', 'current'
            refreshInterval: 180000 // 3 minutos
        };
    }
    
    /**
     * HTML personalizado para la configuración del widget
     */
    getCustomConfigHTML() {
        const entityOptions = this.availableEntities.map(entity => 
            `<option value="${entity}" ${this.settings.selectedEntity === entity ? 'selected' : ''}>${entity}</option>`
        ).join('');
        
        const metricOptions = this.availableMetrics
            .filter(metric => metric.type === 'both' || metric.type === this.settings.entityType)
            .map(metric => 
                `<option value="${metric.id}" ${this.settings.selectedMetric === metric.id ? 'selected' : ''}>${metric.name}</option>`
            ).join('');
        
        return `
            <div class="config-group">
                <label for="widget-entity-type-${this.id}">Tipo de entidad:</label>
                <select id="widget-entity-type-${this.id}">
                    <option value="player" ${this.settings.entityType === 'player' ? 'selected' : ''}>Jugador</option>
                    <option value="team" ${this.settings.entityType === 'team' ? 'selected' : ''}>Equipo</option>
                </select>
            </div>
            <div class="config-group">
                <label for="widget-entity-${this.id}">Seleccionar ${this.settings.entityType === 'player' ? 'jugador' : 'equipo'}:</label>
                <select id="widget-entity-${this.id}">
                    <option value="">Seleccionar...</option>
                    ${entityOptions}
                </select>
            </div>
            <div class="config-group">
                <label for="widget-metric-${this.id}">Métrica:</label>
                <select id="widget-metric-${this.id}">
                    ${metricOptions}
                </select>
            </div>
            <div class="config-group">
                <label for="widget-chart-type-${this.id}">Tipo de gráfico:</label>
                <select id="widget-chart-type-${this.id}">
                    <option value="line" ${this.settings.chartType === 'line' ? 'selected' : ''}>Línea</option>
                    <option value="bar" ${this.settings.chartType === 'bar' ? 'selected' : ''}>Barras</option>
                    <option value="area" ${this.settings.chartType === 'area' ? 'selected' : ''}>Área</option>
                </select>
            </div>
            <div class="config-group">
                <label for="widget-time-range-${this.id}">Rango temporal:</label>
                <select id="widget-time-range-${this.id}">
                    <option value="all" ${this.settings.timeRange === 'all' ? 'selected' : ''}>Todas las jornadas</option>
                    <option value="last5" ${this.settings.timeRange === 'last5' ? 'selected' : ''}>Últimas 5 jornadas</option>
                    <option value="last10" ${this.settings.timeRange === 'last10' ? 'selected' : ''}>Últimas 10 jornadas</option>
                    <option value="current" ${this.settings.timeRange === 'current' ? 'selected' : ''}>Jornada actual</option>
                </select>
            </div>
            <div class="config-group">
                <label>
                    <input type="checkbox" id="widget-data-points-${this.id}" ${this.settings.showDataPoints ? 'checked' : ''} />
                    Mostrar puntos de datos
                </label>
            </div>
            <div class="config-group">
                <label>
                    <input type="checkbox" id="widget-trend-line-${this.id}" ${this.settings.showTrendLine ? 'checked' : ''} />
                    Mostrar línea de tendencia
                </label>
            </div>
        `;
    }
    
    /**
     * Guarda la configuración personalizada del widget
     */
    saveCustomConfig(modal) {
        const entityTypeSelect = modal.querySelector(`#widget-entity-type-${this.id}`);
        const entitySelect = modal.querySelector(`#widget-entity-${this.id}`);
        const metricSelect = modal.querySelector(`#widget-metric-${this.id}`);
        const chartTypeSelect = modal.querySelector(`#widget-chart-type-${this.id}`);
        const timeRangeSelect = modal.querySelector(`#widget-time-range-${this.id}`);
        const dataPointsCheckbox = modal.querySelector(`#widget-data-points-${this.id}`);
        const trendLineCheckbox = modal.querySelector(`#widget-trend-line-${this.id}`);
        
        if (entityTypeSelect) {
            this.settings.entityType = entityTypeSelect.value;
        }
        
        if (entitySelect) {
            this.settings.selectedEntity = entitySelect.value;
        }
        
        if (metricSelect) {
            this.settings.selectedMetric = metricSelect.value;
        }
        
        if (chartTypeSelect) {
            this.settings.chartType = chartTypeSelect.value;
        }
        
        if (timeRangeSelect) {
            this.settings.timeRange = timeRangeSelect.value;
        }
        
        if (dataPointsCheckbox) {
            this.settings.showDataPoints = dataPointsCheckbox.checked;
        }
        
        if (trendLineCheckbox) {
            this.settings.showTrendLine = trendLineCheckbox.checked;
        }
        
        // Actualizar título basado en la configuración
        const metricName = this.availableMetrics.find(m => m.id === this.settings.selectedMetric)?.name || 'Métrica';
        this.updateTitle(`${metricName} - ${this.settings.selectedEntity || 'Sin seleccionar'}`);
    }
    
    /**
     * Renderiza el contenido del widget
     */
    render() {
        const body = this.element.querySelector('.widget-body');
        if (!body) return;
        
        if (!this.settings.selectedEntity) {
            body.innerHTML = `
                <div class="no-entity-selected">
                    <div class="no-data-icon">📈</div>
                    <p>Selecciona una entidad para ver las tendencias</p>
                    <button class="btn btn-primary config-entity-btn">Configurar</button>
                </div>
            `;
            
            // Agregar event listener al botón
            const configBtn = body.querySelector('.config-entity-btn');
            if (configBtn) {
                configBtn.addEventListener('click', () => this.showConfigModal());
            }
            return;
        }
        
        if (!this.chartData) {
            body.innerHTML = `
                <div class="no-data">
                    <div class="no-data-icon">📊</div>
                    <p>No hay datos disponibles para mostrar</p>
                </div>
            `;
            return;
        }
        
        body.innerHTML = `
            <div class="trend-chart-widget">
                <div class="chart-header">
                    <div class="chart-info">
                        <h4 class="chart-title">${this.getChartTitle()}</h4>
                        <span class="chart-subtitle">${this.getChartSubtitle()}</span>
                    </div>
                    <div class="chart-stats">
                        ${this.renderQuickStats()}
                    </div>
                </div>
                <div class="chart-container">
                    <canvas id="trend-chart-${this.id}" width="400" height="200"></canvas>
                </div>
                <div class="chart-legend">
                    ${this.renderLegend()}
                </div>
                <div class="widget-footer">
                    <small>Actualizado: ${new Date().toLocaleTimeString()}</small>
                </div>
            </div>
        `;
        
        // Crear el gráfico después de que el DOM esté listo
        setTimeout(() => {
            this.createChart();
        }, 100);
    }
    
    /**
     * Obtiene el título del gráfico
     */
    getChartTitle() {
        const metricName = this.availableMetrics.find(m => m.id === this.settings.selectedMetric)?.name || 'Métrica';
        return `${metricName} - ${this.settings.selectedEntity}`;
    }
    
    /**
     * Obtiene el subtítulo del gráfico
     */
    getChartSubtitle() {
        const ranges = {
            'all': 'Todas las jornadas',
            'last5': 'Últimas 5 jornadas',
            'last10': 'Últimas 10 jornadas',
            'current': 'Jornada actual'
        };
        return ranges[this.settings.timeRange] || 'Rango personalizado';
    }
    
    /**
     * Renderiza estadísticas rápidas
     */
    renderQuickStats() {
        if (!this.chartData || !this.chartData.values) return '';
        
        const values = this.chartData.values;
        const total = values.reduce((sum, val) => sum + val, 0);
        const avg = values.length > 0 ? (total / values.length).toFixed(2) : 0;
        const max = Math.max(...values);
        const min = Math.min(...values);
        
        return `
            <div class="quick-stats">
                <div class="stat-item">
                    <span class="stat-label">Total</span>
                    <span class="stat-value">${total}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Promedio</span>
                    <span class="stat-value">${avg}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Máximo</span>
                    <span class="stat-value">${max}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Mínimo</span>
                    <span class="stat-value">${min}</span>
                </div>
            </div>
        `;
    }
    
    /**
     * Renderiza la leyenda del gráfico
     */
    renderLegend() {
        const trendDirection = this.calculateTrend();
        const trendIcon = trendDirection > 0 ? '📈' : trendDirection < 0 ? '📉' : '➡️';
        const trendText = trendDirection > 0 ? 'Tendencia al alza' : trendDirection < 0 ? 'Tendencia a la baja' : 'Tendencia estable';
        
        return `
            <div class="chart-legend-items">
                <div class="legend-item">
                    <span class="legend-color" style="background-color: #007bff;"></span>
                    <span class="legend-text">Datos actuales</span>
                </div>
                ${this.settings.showTrendLine ? `
                    <div class="legend-item">
                        <span class="legend-color trend-line" style="background-color: #ff6b6b;"></span>
                        <span class="legend-text">Línea de tendencia</span>
                    </div>
                ` : ''}
                <div class="legend-item trend-indicator">
                    <span class="trend-icon">${trendIcon}</span>
                    <span class="trend-text">${trendText}</span>
                </div>
            </div>
        `;
    }
    
    /**
     * Calcula la tendencia de los datos
     */
    calculateTrend() {
        if (!this.chartData || !this.chartData.values || this.chartData.values.length < 2) {
            return 0;
        }
        
        const values = this.chartData.values;
        const n = values.length;
        const firstHalf = values.slice(0, Math.floor(n / 2));
        const secondHalf = values.slice(Math.floor(n / 2));
        
        const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
        
        return secondAvg - firstAvg;
    }
    
    /**
     * Crea el gráfico usando Chart.js
     */
    createChart() {
        const canvas = document.getElementById(`trend-chart-${this.id}`);
        if (!canvas || !this.chartData) return;
        
        // Destruir gráfico anterior si existe
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }
        
        const ctx = canvas.getContext('2d');
        
        const chartConfig = {
            type: this.settings.chartType === 'area' ? 'line' : this.settings.chartType,
            data: {
                labels: this.chartData.labels,
                datasets: [{
                    label: this.getChartTitle(),
                    data: this.chartData.values,
                    borderColor: '#007bff',
                    backgroundColor: this.settings.chartType === 'area' ? 'rgba(0, 123, 255, 0.1)' : 'rgba(0, 123, 255, 0.8)',
                    fill: this.settings.chartType === 'area',
                    tension: 0.4,
                    pointRadius: this.settings.showDataPoints ? 4 : 0,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#007bff',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: (context) => {
                                return `Jornada ${context[0].label}`;
                            },
                            label: (context) => {
                                const metricName = this.availableMetrics.find(m => m.id === this.settings.selectedMetric)?.name || 'Valor';
                                return `${metricName}: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Jornada'
                        },
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: this.availableMetrics.find(m => m.id === this.settings.selectedMetric)?.name || 'Valor'
                        },
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        };
        
        // Agregar línea de tendencia si está habilitada
        if (this.settings.showTrendLine && this.chartData.values.length > 1) {
            const trendLine = this.calculateTrendLine();
            chartConfig.data.datasets.push({
                label: 'Tendencia',
                data: trendLine,
                borderColor: '#ff6b6b',
                backgroundColor: 'transparent',
                borderDash: [5, 5],
                pointRadius: 0,
                tension: 0
            });
        }
        
        this.chartInstance = new Chart(ctx, chartConfig);
    }
    
    /**
     * Calcula la línea de tendencia usando regresión lineal simple
     */
    calculateTrendLine() {
        const values = this.chartData.values;
        const n = values.length;
        
        // Calcular regresión lineal
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        
        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += values[i];
            sumXY += i * values[i];
            sumXX += i * i;
        }
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        // Generar puntos de la línea de tendencia
        return values.map((_, index) => slope * index + intercept);
    }
    
    /**
     * Actualiza los datos del widget
     */
    async doRefresh() {
        try {
            // Cargar entidades disponibles si no las tenemos
            if (this.availableEntities.length === 0) {
                await this.loadAvailableEntities();
            }
            
            // Si no hay entidad seleccionada, solo renderizar
            if (!this.settings.selectedEntity) {
                this.render();
                return;
            }
            
            // Obtener datos de tendencias
            const endpoint = this.settings.entityType === 'player' ? 'player' : 'team';
            const entityParam = encodeURIComponent(this.settings.selectedEntity);
            let url = `/api/metrics/${endpoint}/${entityParam}`;
            
            // Agregar parámetros de consulta
            const params = new URLSearchParams({
                metric: this.settings.selectedMetric,
                range: this.settings.timeRange
            });
            
            url += '?' + params.toString();
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.chartData = this.processChartData(data.data);
                this.render();
            } else {
                throw new Error(data.message || 'Error obteniendo datos de tendencias');
            }
            
        } catch (error) {
            console.error('Error actualizando TrendChartWidget:', error);
            
            // Usar datos de fallback para demostración
            this.chartData = this.getFallbackChartData();
            this.render();
        }
    }
    
    /**
     * Procesa los datos recibidos de la API para el gráfico
     */
    processChartData(apiData) {
        // Procesar datos según el tipo de métrica y entidad
        // Esto dependerá de la estructura exacta de los datos de la API
        
        // Por ahora, generar datos de ejemplo basados en la configuración
        return this.getFallbackChartData();
    }
    
    /**
     * Obtiene datos de fallback para demostración
     */
    getFallbackChartData() {
        const jornadas = [];
        const values = [];
        
        // Generar datos según el rango temporal
        let numJornadas = 10;
        switch (this.settings.timeRange) {
            case 'last5':
                numJornadas = 5;
                break;
            case 'last10':
                numJornadas = 10;
                break;
            case 'current':
                numJornadas = 1;
                break;
            case 'all':
                numJornadas = 15;
                break;
        }
        
        // Generar datos simulados basados en la métrica
        const baseValue = this.getBaseValueForMetric(this.settings.selectedMetric);
        
        for (let i = 1; i <= numJornadas; i++) {
            jornadas.push(i.toString());
            
            // Generar valor con algo de variación y tendencia
            const trend = (i / numJornadas) * 0.3; // Ligera tendencia al alza
            const variation = (Math.random() - 0.5) * 0.4; // Variación aleatoria
            const value = Math.max(0, Math.round(baseValue * (1 + trend + variation)));
            
            values.push(value);
        }
        
        return {
            labels: jornadas,
            values: values
        };
    }
    
    /**
     * Obtiene el valor base para una métrica específica
     */
    getBaseValueForMetric(metric) {
        const baseValues = {
            'goals': 2,
            'assists': 1,
            'yellowCards': 1,
            'redCards': 0.2,
            'fouls': 3,
            'avgGoalsPerGame': 1.5
        };
        
        return baseValues[metric] || 1;
    }
    
    /**
     * Carga las entidades disponibles (jugadores o equipos)
     */
    async loadAvailableEntities() {
        try {
            const endpoint = this.settings.entityType === 'player' ? 'players' : 'teams';
            const response = await fetch(`/api/metrics/${endpoint}`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.availableEntities = data.data;
                }
            }
        } catch (error) {
            console.error('Error cargando entidades:', error);
            // Usar entidades de fallback
            if (this.settings.entityType === 'player') {
                this.availableEntities = ['Carlos Rodríguez', 'Luis García', 'Miguel Santos', 'Pedro Martínez'];
            } else {
                this.availableEntities = ['Real Madrid', 'Barcelona', 'Atlético Madrid', 'Valencia'];
            }
        }
    }
    
    /**
     * Configura eventos personalizados del widget
     */
    setupCustomEvents() {
        // Suscribirse a eventos de selección de entidades desde otros widgets
        this.subscribeToEvent('PLAYER_SELECTED', (eventData) => {
            if (this.settings.entityType === 'player' && eventData.data.player.name !== this.settings.selectedEntity) {
                this.settings.selectedEntity = eventData.data.player.name;
                this.updateTitle(`${this.settings.selectedMetric} - ${eventData.data.player.name}`);
                this.refresh();
            }
        });
        
        this.subscribeToEvent('TEAM_SELECTED', (eventData) => {
            if (this.settings.entityType === 'team' && eventData.data.team !== this.settings.selectedEntity) {
                this.settings.selectedEntity = eventData.data.team;
                this.updateTitle(`${this.settings.selectedMetric} - ${eventData.data.team}`);
                this.refresh();
            }
        });
    }
}

// Descripción del widget para el factory
TrendChartWidget.description = 'Muestra gráficos de tendencias configurables para jugadores y equipos con diferentes métricas';

// Registrar el widget en el factory cuando se carga
document.addEventListener('DOMContentLoaded', () => {
    console.log('Registrando TrendChartWidget...');
    const factory = window.WidgetFactory?.getInstance();
    if (factory) {
        factory.register('TrendChartWidget', TrendChartWidget);
        console.log('TrendChartWidget registrado correctamente');
    } else {
        console.error('WidgetFactory no disponible para registrar TrendChartWidget');
    }
});

// Hacer disponible globalmente
window.TrendChartWidget = TrendChartWidget;