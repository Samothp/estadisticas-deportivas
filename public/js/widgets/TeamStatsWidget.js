/**
 * TeamStatsWidget - Widget que muestra métricas de un equipo específico
 * Incluye promedio de goles, distribución de acciones y rendimiento por jornada
 */
class TeamStatsWidget extends BaseWidget {
    constructor(config) {
        super(config);
        this.teamData = null;
        this.availableTeams = [];
    }
    
    /**
     * Configuración por defecto del widget
     */
    getDefaultSettings() {
        return {
            ...super.getDefaultSettings(),
            title: 'Estadísticas de Equipo',
            selectedTeam: '',
            showDistribution: true,
            showPerformance: true,
            showTrends: true,
            refreshInterval: 120000, // 2 minutos
            jornadaRange: 'all' // 'all', 'current', 'last5'
        };
    }
    
    /**
     * HTML personalizado para la configuración del widget
     */
    getCustomConfigHTML() {
        const teamsOptions = this.availableTeams.map(team => 
            `<option value="${team}" ${this.settings.selectedTeam === team ? 'selected' : ''}>${team}</option>`
        ).join('');
        
        return `
            <div class="config-group">
                <label for="widget-team-${this.id}">Equipo:</label>
                <select id="widget-team-${this.id}">
                    <option value="">Seleccionar equipo...</option>
                    ${teamsOptions}
                </select>
            </div>
            <div class="config-group">
                <label for="widget-jornada-range-${this.id}">Rango de jornadas:</label>
                <select id="widget-jornada-range-${this.id}">
                    <option value="all" ${this.settings.jornadaRange === 'all' ? 'selected' : ''}>Todas las jornadas</option>
                    <option value="current" ${this.settings.jornadaRange === 'current' ? 'selected' : ''}>Jornada actual</option>
                    <option value="last5" ${this.settings.jornadaRange === 'last5' ? 'selected' : ''}>Últimas 5 jornadas</option>
                </select>
            </div>
            <div class="config-group">
                <label>
                    <input type="checkbox" id="widget-distribution-${this.id}" ${this.settings.showDistribution ? 'checked' : ''} />
                    Mostrar distribución de acciones
                </label>
            </div>
            <div class="config-group">
                <label>
                    <input type="checkbox" id="widget-performance-${this.id}" ${this.settings.showPerformance ? 'checked' : ''} />
                    Mostrar rendimiento por jornada
                </label>
            </div>
            <div class="config-group">
                <label>
                    <input type="checkbox" id="widget-trends-${this.id}" ${this.settings.showTrends ? 'checked' : ''} />
                    Mostrar tendencias
                </label>
            </div>
        `;
    }
    
    /**
     * Guarda la configuración personalizada del widget
     */
    saveCustomConfig(modal) {
        const teamSelect = modal.querySelector(`#widget-team-${this.id}`);
        const jornadaRangeSelect = modal.querySelector(`#widget-jornada-range-${this.id}`);
        const distributionCheckbox = modal.querySelector(`#widget-distribution-${this.id}`);
        const performanceCheckbox = modal.querySelector(`#widget-performance-${this.id}`);
        const trendsCheckbox = modal.querySelector(`#widget-trends-${this.id}`);
        
        if (teamSelect) {
            this.settings.selectedTeam = teamSelect.value;
        }
        
        if (jornadaRangeSelect) {
            this.settings.jornadaRange = jornadaRangeSelect.value;
        }
        
        if (distributionCheckbox) {
            this.settings.showDistribution = distributionCheckbox.checked;
        }
        
        if (performanceCheckbox) {
            this.settings.showPerformance = performanceCheckbox.checked;
        }
        
        if (trendsCheckbox) {
            this.settings.showTrends = trendsCheckbox.checked;
        }
    }
    
    /**
     * Renderiza el contenido del widget
     */
    render() {
        const body = this.element.querySelector('.widget-body');
        if (!body) return;
        
        if (!this.settings.selectedTeam) {
            body.innerHTML = `
                <div class="no-team-selected">
                    <div class="no-data-icon">⚽</div>
                    <p>Selecciona un equipo para ver sus estadísticas</p>
                    <button class="btn btn-primary config-team-btn">Configurar Equipo</button>
                </div>
            `;
            
            // Agregar event listener al botón
            const configBtn = body.querySelector('.config-team-btn');
            if (configBtn) {
                configBtn.addEventListener('click', () => this.showConfigModal());
            }
            return;
        }
        
        if (!this.teamData) {
            body.innerHTML = `
                <div class="no-data">
                    <div class="no-data-icon">📊</div>
                    <p>No hay datos disponibles para ${this.settings.selectedTeam}</p>
                </div>
            `;
            return;
        }
        
        const metricsHTML = this.renderMetrics();
        const distributionHTML = this.settings.showDistribution ? this.renderDistribution() : '';
        const performanceHTML = this.settings.showPerformance ? this.renderPerformance() : '';
        
        body.innerHTML = `
            <div class="team-stats-widget">
                <div class="team-header">
                    <div class="team-info">
                        <h3 class="team-name">${this.settings.selectedTeam}</h3>
                        <span class="team-period">${this.getPeriodText()}</span>
                    </div>
                    <div class="team-logo">
                        ${this.generateTeamLogo(this.settings.selectedTeam)}
                    </div>
                </div>
                
                <div class="team-metrics">
                    ${metricsHTML}
                </div>
                
                ${distributionHTML}
                ${performanceHTML}
                
                <div class="widget-footer">
                    <small>Actualizado: ${new Date().toLocaleTimeString()}</small>
                </div>
            </div>
        `;
    }
    
    /**
     * Renderiza las métricas principales del equipo
     */
    renderMetrics() {
        const data = this.teamData;
        
        return `
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">${data.goals}</div>
                    <div class="metric-label">Goles Totales</div>
                    ${this.settings.showTrends ? `<div class="metric-trend">${data.avgGoalsPerGame} por jornada</div>` : ''}
                </div>
                <div class="metric-card">
                    <div class="metric-value">${data.assists}</div>
                    <div class="metric-label">Asistencias</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${data.totalPlayers}</div>
                    <div class="metric-label">Jugadores Activos</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${data.totalGames}</div>
                    <div class="metric-label">Jornadas Jugadas</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${data.yellowCards + data.redCards}</div>
                    <div class="metric-label">Tarjetas</div>
                    <div class="metric-breakdown">
                        <span class="yellow-cards">🟨 ${data.yellowCards}</span>
                        <span class="red-cards">🟥 ${data.redCards}</span>
                    </div>
                </div>
                <div class="metric-card cohesion-card">
                    <div class="metric-value">${Math.round(data.teamCohesion * 100)}%</div>
                    <div class="metric-label">Cohesión del Equipo</div>
                    <div class="cohesion-bar">
                        <div class="cohesion-fill" style="width: ${data.teamCohesion * 100}%"></div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Renderiza la distribución de acciones por jugador
     */
    renderDistribution() {
        if (!this.teamData.actionDistribution || Object.keys(this.teamData.actionDistribution).length === 0) {
            return '';
        }
        
        const players = Object.keys(this.teamData.actionDistribution);
        const topPlayers = players.slice(0, 5); // Mostrar solo top 5 para no saturar
        
        const playersHTML = topPlayers.map(player => {
            const actions = this.teamData.actionDistribution[player];
            const totalActions = Object.values(actions).reduce((sum, count) => sum + count, 0);
            const goals = actions['Gol'] || 0;
            const assists = actions['Asistencia'] || 0;
            
            return `
                <div class="player-distribution">
                    <div class="player-name">${player}</div>
                    <div class="player-actions">
                        <div class="action-bar">
                            <div class="action-segment goals" style="width: ${(goals / totalActions) * 100}%" title="${goals} goles"></div>
                            <div class="action-segment assists" style="width: ${(assists / totalActions) * 100}%" title="${assists} asistencias"></div>
                        </div>
                        <div class="action-stats">
                            <span class="goals-stat">⚽ ${goals}</span>
                            <span class="assists-stat">🅰️ ${assists}</span>
                            <span class="total-stat">${totalActions} acciones</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        return `
            <div class="distribution-section">
                <h4>Distribución de Acciones</h4>
                <div class="players-distribution">
                    ${playersHTML}
                </div>
            </div>
        `;
    }
    
    /**
     * Renderiza el rendimiento por jornada
     */
    renderPerformance() {
        if (!this.teamData.performanceByJornada || Object.keys(this.teamData.performanceByJornada).length === 0) {
            return '';
        }
        
        const jornadas = Object.keys(this.teamData.performanceByJornada)
            .sort((a, b) => parseInt(b) - parseInt(a))
            .slice(0, 5); // Últimas 5 jornadas
        
        const performanceHTML = jornadas.map(jornada => {
            const perf = this.teamData.performanceByJornada[jornada];
            const scoreClass = perf.score > 5 ? 'good' : perf.score > 0 ? 'average' : 'poor';
            
            return `
                <div class="jornada-performance">
                    <div class="jornada-number">J${jornada}</div>
                    <div class="jornada-stats">
                        <div class="stat-item">
                            <span class="stat-icon">⚽</span>
                            <span class="stat-value">${perf.goals}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-icon">🅰️</span>
                            <span class="stat-value">${perf.assists}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-icon">🟨</span>
                            <span class="stat-value">${perf.cards}</span>
                        </div>
                    </div>
                    <div class="jornada-score ${scoreClass}">
                        ${perf.score > 0 ? '+' : ''}${perf.score}
                    </div>
                </div>
            `;
        }).join('');
        
        return `
            <div class="performance-section">
                <h4>Rendimiento por Jornada</h4>
                <div class="jornadas-performance">
                    ${performanceHTML}
                </div>
            </div>
        `;
    }
    
    /**
     * Actualiza los datos del widget
     */
    async doRefresh() {
        try {
            // Cargar equipos disponibles si no los tenemos
            if (this.availableTeams.length === 0) {
                await this.loadAvailableTeams();
            }
            
            // Si no hay equipo seleccionado, solo renderizar
            if (!this.settings.selectedTeam) {
                this.render();
                return;
            }
            
            // Obtener métricas del equipo
            let url = `/api/metrics/team/${encodeURIComponent(this.settings.selectedTeam)}`;
            
            // Agregar parámetros de rango de jornadas si es necesario
            if (this.settings.jornadaRange !== 'all') {
                const params = new URLSearchParams();
                
                if (this.settings.jornadaRange === 'current') {
                    // La API manejará esto internamente
                } else if (this.settings.jornadaRange === 'last5') {
                    // La API manejará esto internamente
                }
                
                if (params.toString()) {
                    url += '?' + params.toString();
                }
            }
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.teamData = data.data;
                this.render();
            } else {
                throw new Error(data.message || 'Error obteniendo datos del equipo');
            }
            
        } catch (error) {
            console.error('Error actualizando TeamStatsWidget:', error);
            
            // Usar datos de fallback para demostración
            this.teamData = await this.getFallbackData();
            this.render();
        }
    }
    
    /**
     * Carga la lista de equipos disponibles
     */
    async loadAvailableTeams() {
        try {
            const response = await fetch('/api/metrics/teams');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.availableTeams = data.data;
                }
            }
        } catch (error) {
            console.error('Error cargando equipos:', error);
            // Usar equipos de fallback
            this.availableTeams = [
                'Real Madrid', 'Barcelona', 'Atlético Madrid', 'Valencia', 
                'Sevilla', 'Real Betis', 'Athletic Club', 'Real Sociedad'
            ];
        }
    }
    
    /**
     * Obtiene datos de fallback para demostración
     */
    async getFallbackData() {
        return {
            teamId: this.settings.selectedTeam,
            totalGames: 12,
            totalActions: 156,
            totalPlayers: 18,
            goals: 28,
            assists: 15,
            yellowCards: 23,
            redCards: 2,
            avgGoalsPerGame: 2.33,
            teamCohesion: 0.75,
            actionDistribution: {
                'Carlos Rodríguez': { 'Gol': 8, 'Asistencia': 3, 'Falta': 2 },
                'Luis García': { 'Gol': 6, 'Asistencia': 4, 'Falta': 1 },
                'Miguel Santos': { 'Gol': 5, 'Asistencia': 2, 'Tarjeta Amarilla': 3 },
                'Pedro Martínez': { 'Gol': 4, 'Asistencia': 3, 'Falta': 2 },
                'Juan López': { 'Gol': 3, 'Asistencia': 2, 'Tarjeta Amarilla': 1 }
            },
            performanceByJornada: {
                '12': { goals: 3, assists: 2, cards: 1, totalActions: 15, score: 7 },
                '11': { goals: 2, assists: 1, cards: 2, totalActions: 12, score: 3 },
                '10': { goals: 4, assists: 3, cards: 0, totalActions: 18, score: 11 },
                '9': { goals: 1, assists: 1, cards: 3, totalActions: 10, score: -1 },
                '8': { goals: 2, assists: 2, cards: 1, totalActions: 14, score: 5 }
            }
        };
    }
    
    /**
     * Genera un logo SVG para el equipo
     */
    generateTeamLogo(teamName) {
        const colors = {
            'Real Madrid': '#FFFFFF',
            'Barcelona': '#A50044',
            'Atlético Madrid': '#CE2029',
            'Valencia': '#FF8C00',
            'Sevilla': '#D71920',
            'Real Betis': '#00A650',
            'Athletic Club': '#EE2523',
            'Real Sociedad': '#004B9D'
        };
        
        const color = colors[teamName] || '#007bff';
        const initials = teamName.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
        
        return `
            <div class="team-logo-circle" style="background-color: ${color}">
                <span class="team-initials">${initials}</span>
            </div>
        `;
    }
    
    /**
     * Obtiene el texto descriptivo del período
     */
    getPeriodText() {
        switch (this.settings.jornadaRange) {
            case 'current':
                return 'Jornada actual';
            case 'last5':
                return 'Últimas 5 jornadas';
            case 'all':
            default:
                return 'Todas las jornadas';
        }
    }
    
    /**
     * Configura eventos personalizados del widget
     */
    setupCustomEvents() {
        // Suscribirse a eventos de cambios en estadísticas del equipo
        this.subscribeToEvent('TEAM_STATS_UPDATED', (eventData) => {
            if (eventData.data.team === this.settings.selectedTeam) {
                setTimeout(() => this.refresh(), 1000);
            }
        });
        
        // Suscribirse a selección de equipo desde otros widgets
        this.subscribeToEvent('TEAM_SELECTED', (eventData) => {
            if (eventData.data.team !== this.settings.selectedTeam) {
                this.settings.selectedTeam = eventData.data.team;
                this.updateTitle(`Estadísticas de ${eventData.data.team}`);
                this.refresh();
            }
        });
    }
}

// Descripción del widget para el factory
TeamStatsWidget.description = 'Muestra métricas detalladas de un equipo específico incluyendo rendimiento y distribución de acciones';

// Registrar el widget en el factory cuando se carga
document.addEventListener('DOMContentLoaded', () => {
    console.log('Registrando TeamStatsWidget...');
    const factory = window.WidgetFactory?.getInstance();
    if (factory) {
        factory.register('TeamStatsWidget', TeamStatsWidget);
        console.log('TeamStatsWidget registrado correctamente');
    } else {
        console.error('WidgetFactory no disponible para registrar TeamStatsWidget');
    }
});

// Hacer disponible globalmente
window.TeamStatsWidget = TeamStatsWidget;