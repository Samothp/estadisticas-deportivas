/**
 * HeatmapChart - Gráfico de mapa de calor para visualizar intensidad de actividad
 * Muestra la intensidad de actividad por jugador y minuto con escala de colores
 */
class HeatmapChart {
    constructor(container, data, options = {}) {
        this.container = container;
        this.data = data;
        this.options = this.mergeDefaultOptions(options);
        this.chart = null;
        this.colorScale = null;
        this.cellSize = { width: 0, height: 0 };
        this.hoveredCell = null;
        
        this.init();
    }
    
    /**
     * Inicializa el gráfico heatmap
     */
    init() {
        try {
            this.createWrapper();
            this.processData();
            this.calculateColorScale();
            this.createChart();
            this.setupInteractions();
            
            console.log('HeatmapChart: Inicializado correctamente');
        } catch (error) {
            console.error('Error inicializando HeatmapChart:', error);
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
            plugins: {
                title: {
                    display: true,
                    text: options.title || 'Mapa de Calor de Actividad',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    display: false // Usaremos leyenda personalizada
                },
                tooltip: {
                    enabled: false // Usaremos tooltip personalizado
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: options.xAxisLabel || 'Minutos del Partido'
                    },
                    min: 0,
                    max: 90,
                    ticks: {
                        stepSize: 15,
                        callback: (value) => `${value}'`
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                y: {
                    type: 'category',
                    title: {
                        display: true,
                        text: options.yAxisLabel || 'Jugadores'
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            animation: {
                duration: 600,
                easing: 'easeInOutQuart'
            },
            // Opciones específicas del heatmap
            heatmap: {
                colorScheme: options.colorScheme || 'blue',
                showValues: options.showValues !== false,
                cellPadding: options.cellPadding || 1,
                minIntensity: options.minIntensity || 0,
                maxIntensity: options.maxIntensity || null, // Se calcula automáticamente
                timeInterval: options.timeInterval || 5, // Intervalos de 5 minutos
                showGrid: options.showGrid !== false
            }
        };
        
        return this.deepMerge(defaultOptions, options);
    }
    
    /**
     * Crea el wrapper con leyenda
     */
    createWrapper() {
        this.container.innerHTML = '';
        
        const wrapper = document.createElement('div');
        wrapper.className = 'heatmap-chart-wrapper';
        
        // Crear canvas
        const canvas = document.createElement('canvas');
        canvas.style.width = '100%';
        canvas.style.height = 'calc(100% - 60px)';
        
        // Crear leyenda
        const legend = this.createLegend();
        
        wrapper.appendChild(canvas);
        wrapper.appendChild(legend);
        this.container.appendChild(wrapper);
        
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Crear tooltip personalizado
        this.createTooltip();
    }
    
    /**
     * Crea la leyenda del heatmap
     */
    createLegend() {
        const legend = document.createElement('div');
        legend.className = 'heatmap-legend';
        
        legend.innerHTML = `
            <div class="heatmap-scale">
                <span class="heatmap-scale-label">Intensidad:</span>
                <div class="heatmap-scale-bar"></div>
                <div class="heatmap-labels">
                    <span>Baja</span>
                    <span>Media</span>
                    <span>Alta</span>
                </div>
            </div>
            <div class="heatmap-info">
                <span class="cell-count">0 celdas</span>
                <span class="max-intensity">Máx: 0</span>
            </div>
        `;
        
        return legend;
    }
    
    /**
     * Crea tooltip personalizado
     */
    createTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'heatmap-tooltip';
        this.tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            pointer-events: none;
            z-index: 1000;
            display: none;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;
        
        document.body.appendChild(this.tooltip);
    }
    
    /**
     * Procesa los datos para el heatmap
     */
    processData() {
        if (!this.data || !Array.isArray(this.data)) {
            throw new Error('Datos inválidos para HeatmapChart');
        }
        
        // Crear matriz de intensidad
        this.intensityMatrix = this.createIntensityMatrix();
        
        // Obtener jugadores únicos
        this.players = [...new Set(this.data.map(d => d.player))].sort();
        
        // Crear intervalos de tiempo
        this.timeIntervals = this.createTimeIntervals();
        
        // Calcular estadísticas
        this.calculateStats();
    }
    
    /**
     * Crea la matriz de intensidad
     */
    createIntensityMatrix() {
        const matrix = {};
        
        // Inicializar matriz
        this.data.forEach(item => {
            if (!matrix[item.player]) {
                matrix[item.player] = {};
            }
        });
        
        // Contar actividad por jugador y intervalo de tiempo
        this.data.forEach(item => {
            const timeInterval = Math.floor(item.minute / this.options.heatmap.timeInterval) * this.options.heatmap.timeInterval;
            
            if (!matrix[item.player][timeInterval]) {
                matrix[item.player][timeInterval] = 0;
            }
            
            matrix[item.player][timeInterval]++;
        });
        
        return matrix;
    }
    
    /**
     * Crea intervalos de tiempo
     */
    createTimeIntervals() {
        const intervals = [];
        const interval = this.options.heatmap.timeInterval;
        
        for (let i = 0; i <= 90; i += interval) {
            intervals.push(i);
        }
        
        return intervals;
    }
    
    /**
     * Calcula estadísticas del heatmap
     */
    calculateStats() {
        let maxIntensity = 0;
        let totalCells = 0;
        
        Object.keys(this.intensityMatrix).forEach(player => {
            Object.keys(this.intensityMatrix[player]).forEach(time => {
                const intensity = this.intensityMatrix[player][time];
                maxIntensity = Math.max(maxIntensity, intensity);
                totalCells++;
            });
        });
        
        this.maxIntensity = this.options.heatmap.maxIntensity || maxIntensity;
        this.totalCells = totalCells;
        
        // Actualizar leyenda
        this.updateLegendInfo();
    }
    
    /**
     * Calcula la escala de colores
     */
    calculateColorScale() {
        const schemes = {
            blue: ['#e3f2fd', '#bbdefb', '#90caf9', '#64b5f6', '#42a5f5', '#2196f3', '#1976d2', '#1565c0', '#0d47a1'],
            red: ['#ffebee', '#ffcdd2', '#ef9a9a', '#e57373', '#ef5350', '#f44336', '#e53935', '#d32f2f', '#b71c1c'],
            green: ['#e8f5e8', '#c8e6c9', '#a5d6a7', '#81c784', '#66bb6a', '#4caf50', '#43a047', '#388e3c', '#2e7d32'],
            orange: ['#fff3e0', '#ffe0b2', '#ffcc80', '#ffb74d', '#ffa726', '#ff9800', '#fb8c00', '#f57c00', '#e65100'],
            purple: ['#f3e5f5', '#e1bee7', '#ce93d8', '#ba68c8', '#ab47bc', '#9c27b0', '#8e24aa', '#7b1fa2', '#6a1b9a']
        };
        
        this.colorScale = schemes[this.options.heatmap.colorScheme] || schemes.blue;
    }
    
    /**
     * Obtiene color basado en intensidad
     */
    getColorForIntensity(intensity) {
        if (intensity === 0) {
            return '#f5f5f5'; // Color para celdas vacías
        }
        
        const normalizedIntensity = Math.min(intensity / this.maxIntensity, 1);
        const colorIndex = Math.floor(normalizedIntensity * (this.colorScale.length - 1));
        
        return this.colorScale[colorIndex];
    }
    
    /**
     * Crea el gráfico usando canvas personalizado
     */
    createChart() {
        // Configurar tamaño del canvas
        this.resizeCanvas();
        
        // Dibujar el heatmap
        this.drawHeatmap();
        
        // Configurar redibujado en resize
        window.addEventListener('resize', () => {
            setTimeout(() => {
                this.resizeCanvas();
                this.drawHeatmap();
            }, 100);
        });
    }
    
    /**
     * Redimensiona el canvas
     */
    resizeCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        
        this.ctx.scale(dpr, dpr);
        
        // Calcular tamaño de celdas
        const padding = 40;
        const availableWidth = rect.width - padding * 2;
        const availableHeight = rect.height - padding * 2;
        
        this.cellSize.width = availableWidth / this.timeIntervals.length;
        this.cellSize.height = availableHeight / this.players.length;
        
        this.chartArea = {
            x: padding,
            y: padding,
            width: availableWidth,
            height: availableHeight
        };
    }
    
    /**
     * Dibuja el heatmap
     */
    drawHeatmap() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Dibujar título
        this.drawTitle();
        
        // Dibujar ejes
        this.drawAxes();
        
        // Dibujar celdas
        this.drawCells();
        
        // Dibujar grid si está habilitado
        if (this.options.heatmap.showGrid) {
            this.drawGrid();
        }
    }
    
    /**
     * Dibuja el título
     */
    drawTitle() {
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillStyle = '#333';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            this.options.plugins.title.text,
            this.canvas.width / 2 / (window.devicePixelRatio || 1),
            20
        );
    }
    
    /**
     * Dibuja los ejes
     */
    drawAxes() {
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#666';
        
        // Eje X (tiempo)
        this.ctx.textAlign = 'center';
        this.timeIntervals.forEach((time, index) => {
            const x = this.chartArea.x + (index + 0.5) * this.cellSize.width;
            const y = this.chartArea.y + this.chartArea.height + 15;
            
            if (index % 3 === 0) { // Mostrar cada 3 intervalos para evitar solapamiento
                this.ctx.fillText(`${time}'`, x, y);
            }
        });
        
        // Eje Y (jugadores)
        this.ctx.textAlign = 'right';
        this.players.forEach((player, index) => {
            const x = this.chartArea.x - 10;
            const y = this.chartArea.y + (index + 0.5) * this.cellSize.height + 4;
            
            // Truncar nombres largos
            const displayName = player.length > 12 ? player.substring(0, 10) + '...' : player;
            this.ctx.fillText(displayName, x, y);
        });
    }
    
    /**
     * Dibuja las celdas del heatmap
     */
    drawCells() {
        this.players.forEach((player, playerIndex) => {
            this.timeIntervals.forEach((time, timeIndex) => {
                const intensity = this.intensityMatrix[player] && this.intensityMatrix[player][time] || 0;
                const color = this.getColorForIntensity(intensity);
                
                const x = this.chartArea.x + timeIndex * this.cellSize.width;
                const y = this.chartArea.y + playerIndex * this.cellSize.height;
                const width = this.cellSize.width - this.options.heatmap.cellPadding;
                const height = this.cellSize.height - this.options.heatmap.cellPadding;
                
                // Dibujar celda
                this.ctx.fillStyle = color;
                this.ctx.fillRect(x, y, width, height);
                
                // Dibujar borde si es la celda hover
                if (this.hoveredCell && 
                    this.hoveredCell.player === player && 
                    this.hoveredCell.time === time) {
                    this.ctx.strokeStyle = '#333';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(x, y, width, height);
                }
                
                // Dibujar valor si está habilitado y hay intensidad
                if (this.options.heatmap.showValues && intensity > 0) {
                    this.ctx.fillStyle = intensity > this.maxIntensity * 0.5 ? 'white' : 'black';
                    this.ctx.font = '10px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText(
                        intensity.toString(),
                        x + width / 2,
                        y + height / 2 + 3
                    );
                }
            });
        });
    }
    
    /**
     * Dibuja la grilla
     */
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.lineWidth = 1;
        
        // Líneas verticales
        for (let i = 0; i <= this.timeIntervals.length; i++) {
            const x = this.chartArea.x + i * this.cellSize.width;
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.chartArea.y);
            this.ctx.lineTo(x, this.chartArea.y + this.chartArea.height);
            this.ctx.stroke();
        }
        
        // Líneas horizontales
        for (let i = 0; i <= this.players.length; i++) {
            const y = this.chartArea.y + i * this.cellSize.height;
            this.ctx.beginPath();
            this.ctx.moveTo(this.chartArea.x, y);
            this.ctx.lineTo(this.chartArea.x + this.chartArea.width, y);
            this.ctx.stroke();
        }
    }
    
    /**
     * Configura interacciones del mouse
     */
    setupInteractions() {
        this.canvas.addEventListener('mousemove', (e) => {
            this.handleMouseMove(e);
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            this.hideTooltip();
            this.hoveredCell = null;
            this.drawHeatmap();
        });
        
        this.canvas.addEventListener('click', (e) => {
            this.handleClick(e);
        });
    }
    
    /**
     * Maneja el movimiento del mouse
     */
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const cell = this.getCellAtPosition(x, y);
        
        if (cell) {
            if (!this.hoveredCell || 
                this.hoveredCell.player !== cell.player || 
                this.hoveredCell.time !== cell.time) {
                
                this.hoveredCell = cell;
                this.showTooltip(e, cell);
                this.drawHeatmap();
            }
        } else {
            if (this.hoveredCell) {
                this.hoveredCell = null;
                this.hideTooltip();
                this.drawHeatmap();
            }
        }
    }
    
    /**
     * Obtiene la celda en una posición específica
     */
    getCellAtPosition(x, y) {
        if (x < this.chartArea.x || x > this.chartArea.x + this.chartArea.width ||
            y < this.chartArea.y || y > this.chartArea.y + this.chartArea.height) {
            return null;
        }
        
        const timeIndex = Math.floor((x - this.chartArea.x) / this.cellSize.width);
        const playerIndex = Math.floor((y - this.chartArea.y) / this.cellSize.height);
        
        if (timeIndex >= 0 && timeIndex < this.timeIntervals.length &&
            playerIndex >= 0 && playerIndex < this.players.length) {
            
            const time = this.timeIntervals[timeIndex];
            const player = this.players[playerIndex];
            const intensity = this.intensityMatrix[player] && this.intensityMatrix[player][time] || 0;
            
            return { player, time, intensity, timeIndex, playerIndex };
        }
        
        return null;
    }
    
    /**
     * Muestra el tooltip
     */
    showTooltip(e, cell) {
        const content = `
            <strong>${cell.player}</strong><br>
            Minuto: ${cell.time}-${cell.time + this.options.heatmap.timeInterval}<br>
            Actividad: ${cell.intensity} eventos
        `;
        
        this.tooltip.innerHTML = content;
        this.tooltip.style.display = 'block';
        this.tooltip.style.left = (e.pageX + 10) + 'px';
        this.tooltip.style.top = (e.pageY - 10) + 'px';
    }
    
    /**
     * Oculta el tooltip
     */
    hideTooltip() {
        this.tooltip.style.display = 'none';
    }
    
    /**
     * Maneja clicks en el heatmap
     */
    handleClick(e) {
        const cell = this.getCellAtPosition(
            e.clientX - this.canvas.getBoundingClientRect().left,
            e.clientY - this.canvas.getBoundingClientRect().top
        );
        
        if (cell && cell.intensity > 0) {
            // Emitir evento personalizado para drill-down
            const event = new CustomEvent('heatmapCellClick', {
                detail: cell
            });
            this.container.dispatchEvent(event);
        }
    }
    
    /**
     * Actualiza información de la leyenda
     */
    updateLegendInfo() {
        const cellCount = this.container.querySelector('.cell-count');
        const maxIntensity = this.container.querySelector('.max-intensity');
        
        if (cellCount) {
            cellCount.textContent = `${this.totalCells} celdas`;
        }
        
        if (maxIntensity) {
            maxIntensity.textContent = `Máx: ${this.maxIntensity}`;
        }
    }
    
    /**
     * Actualiza los datos del heatmap
     */
    update(newData) {
        this.data = newData;
        this.processData();
        this.calculateColorScale();
        this.drawHeatmap();
    }
    
    /**
     * Destruye el heatmap
     */
    destroy() {
        if (this.tooltip && this.tooltip.parentNode) {
            this.tooltip.parentNode.removeChild(this.tooltip);
        }
        
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        window.removeEventListener('resize', this.resizeCanvas);
    }
    
    /**
     * Exporta el heatmap como imagen
     */
    toBase64Image(type = 'image/png', quality = 1.0) {
        return this.canvas.toDataURL(type, quality);
    }
    
    /**
     * Muestra un error en el container
     */
    showError(message) {
        this.container.innerHTML = `
            <div class="chart-error">
                <div class="error-icon">🔥❌</div>
                <h4>Error en Heatmap Chart</h4>
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
        engine.registerChartType('heatmap', HeatmapChart);
        console.log('HeatmapChart registrado en AdvancedChartEngine');
    }
});

// Hacer disponible globalmente
window.HeatmapChart = HeatmapChart;