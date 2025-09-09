/**
 * TopPlayersWidget - Widget que muestra el ranking de mejores goleadores
 * Muestra top 5 goleadores con fotos placeholder, equipo, goles y tendencia
 */
class TopPlayersWidget extends BaseWidget {
    constructor(config) {
        super(config);
        this.playersData = [];
    }
    
    /**
     * Configuración por defecto del widget
     */
    getDefaultSettings() {
        return {
            ...super.getDefaultSettings(),
            title: 'Top Goleadores',
            maxPlayers: 5,
            showTrends: true,
            showTeams: true,
            refreshInterval: 60000, // 1 minuto
            jornadaRange: 'all' // 'all', 'current', 'last5'
        };
    }
    
    /**
     * HTML personalizado para la configuración del widget
     */
    getCustomConfigHTML() {
        return `
            <div class="config-group">
                <label for="widget-maxplayers-${this.id}">Número de jugadores:</label>
                <select id="widget-maxplayers-${this.id}">
                    <option value="3" ${this.settings.maxPlayers === 3 ? 'selected' : ''}>Top 3</option>
                    <option value="5" ${this.settings.maxPlayers === 5 ? 'selected' : ''}>Top 5</option>
                    <option value="10" ${this.settings.maxPlayers === 10 ? 'selected' : ''}>Top 10</option>
                </select>
            </div>
            <div class="config-group">
                <label for="widget-jornada-${this.id}">Rango de jornadas:</label>
                <select id="widget-jornada-${this.id}">
                    <option value="all" ${this.settings.jornadaRange === 'all' ? 'selected' : ''}>Todas las jornadas</option>
                    <option value="current" ${this.settings.jornadaRange === 'current' ? 'selected' : ''}>Jornada actual</option>
                    <option value="last5" ${this.settings.jornadaRange === 'last5' ? 'selected' : ''}>Últimas 5 jornadas</option>
                </select>
            </div>
            <div class="config-group">
                <label>
                    <input type="checkbox" id="widget-trends-${this.id}" ${this.settings.showTrends ? 'checked' : ''} />
                    Mostrar tendencias
                </label>
            </div>
            <div class="config-group">
                <label>
                    <input type="checkbox" id="widget-teams-${this.id}" ${this.settings.showTeams ? 'checked' : ''} />
                    Mostrar equipos
                </label>
            </div>
        `;
    }
    
    /**
     * Guarda la configuración personalizada del widget
     */
    saveCustomConfig(modal) {
        const maxPlayersSelect = modal.querySelector(`#widget-maxplayers-${this.id}`);
        const jornadaSelect = modal.querySelector(`#widget-jornada-${this.id}`);
        const trendsCheckbox = modal.querySelector(`#widget-trends-${this.id}`);
        const teamsCheckbox = modal.querySelector(`#widget-teams-${this.id}`);
        
        if (maxPlayersSelect) {
            this.settings.maxPlayers = parseInt(maxPlayersSelect.value);
        }
        
        if (jornadaSelect) {
            this.settings.jornadaRange = jornadaSelect.value;
        }
        
        if (trendsCheckbox) {
            this.settings.showTrends = trendsCheckbox.checked;
        }
        
        if (teamsCheckbox) {
            this.settings.showTeams = teamsCheckbox.checked;
        }
    }
    
    /**
     * Renderiza el contenido del widget
     */
    render() {
        console.log('TopPlayersWidget: Renderizando con datos:', this.playersData);
        const body = this.element.querySelector('.widget-body');
        if (!body) return;
        
        if (!this.playersData || this.playersData.length === 0) {
            body.innerHTML = `
                <div class="no-data">
                    <div class="no-data-icon">⚽</div>
                    <p>No hay datos de goleadores disponibles</p>
                </div>
            `;
            return;
        }
        
        const playersHTML = this.playersData.map((player, index) => {
            const position = index + 1;
            const positionClass = position <= 3 ? `position-${position}` : 'position-other';
            const trendIcon = this.getTrendIcon(player.trend);
            const trendClass = this.getTrendClass(player.trend);
            
            return `
                <div class="player-item ${positionClass}" data-player="${player.name}">
                    <div class="player-position">
                        <span class="position-number">${position}</span>
                        ${position === 1 ? '<span class="crown">👑</span>' : ''}
                    </div>
                    <div class="player-avatar">
                        <img src="data:image/svg+xml;base64,${this.generatePlayerAvatar(player.name)}" 
                             alt="${player.name}" 
                             class="avatar-img" />
                    </div>
                    <div class="player-info">
                        <div class="player-name">${player.name}</div>
                        ${this.settings.showTeams ? `<div class="player-team">${player.team}</div>` : ''}
                        <div class="player-stats">
                            <span class="goals-count">${player.goals} goles</span>
                            <span class="goals-per-game">(${player.goalsPerGame} por partido)</span>
                        </div>
                    </div>
                    <div class="player-metrics">
                        <div class="goals-total">${player.goals}</div>
                        ${this.settings.showTrends ? `
                            <div class="trend-indicator ${trendClass}" title="${this.getTrendText(player.trend)}">
                                ${trendIcon}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        body.innerHTML = `
            <div class="top-players-widget">
                <div class="players-list">
                    ${playersHTML}
                </div>
                <div class="widget-footer">
                    <small>Actualizado: ${new Date().toLocaleTimeString()}</small>
                </div>
            </div>
        `;
        
        // Configurar interacciones después del render
        this.setupInteractionsAfterRender();
    }
    
    /**
     * Actualiza los datos del widget
     */
    async doRefresh() {
        try {
            console.log('TopPlayersWidget: Iniciando refresh...');
            const url = `/api/metrics/top-players?limit=${this.settings.maxPlayers}&range=${this.settings.jornadaRange}`;
            console.log('TopPlayersWidget: URL:', url);
            
            // Obtener datos de goleadores desde la API
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('TopPlayersWidget: Datos recibidos:', data);
            
            if (data.success) {
                this.playersData = data.data;
                console.log('TopPlayersWidget: playersData asignado:', this.playersData);
                this.render();
            } else {
                throw new Error(data.message || 'Error obteniendo datos de jugadores');
            }
            
        } catch (error) {
            console.error('Error actualizando TopPlayersWidget:', error);
            
            // Si hay error, usar datos de fallback para demostración
            console.log('TopPlayersWidget: Usando datos de fallback');
            this.playersData = await this.getFallbackData();
            console.log('TopPlayersWidget: Fallback data:', this.playersData);
            this.render();
        }
    }
    
    /**
     * Obtiene datos de fallback para demostración
     */
    async getFallbackData() {
        // Simular datos mientras se implementa la API completa
        return [
            {
                name: 'Carlos Rodríguez',
                team: 'Real Madrid',
                goals: 15,
                goalsPerGame: 1.25,
                trend: 'improving'
            },
            {
                name: 'Luis García',
                team: 'Barcelona',
                goals: 12,
                goalsPerGame: 1.09,
                trend: 'stable'
            },
            {
                name: 'Miguel Santos',
                team: 'Atlético Madrid',
                goals: 10,
                goalsPerGame: 0.91,
                trend: 'declining'
            },
            {
                name: 'Pedro Martínez',
                team: 'Valencia',
                goals: 9,
                goalsPerGame: 0.82,
                trend: 'improving'
            },
            {
                name: 'Juan López',
                team: 'Sevilla',
                goals: 8,
                goalsPerGame: 0.73,
                trend: 'stable'
            }
        ].slice(0, this.settings.maxPlayers);
    }
    
    /**
     * Genera un avatar SVG para el jugador
     */
    generatePlayerAvatar(playerName) {
        const initials = playerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
        const colorIndex = playerName.length % colors.length;
        const bgColor = colors[colorIndex];
        
        const svg = `
            <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="20" fill="${bgColor}"/>
                <text x="20" y="26" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14" font-weight="bold">
                    ${initials}
                </text>
            </svg>
        `;
        
        return btoa(svg);
    }
    
    /**
     * Obtiene el icono de tendencia
     */
    getTrendIcon(trend) {
        switch (trend) {
            case 'improving':
                return '📈';
            case 'declining':
                return '📉';
            case 'stable':
            default:
                return '➡️';
        }
    }
    
    /**
     * Obtiene la clase CSS de tendencia
     */
    getTrendClass(trend) {
        switch (trend) {
            case 'improving':
                return 'trend-up';
            case 'declining':
                return 'trend-down';
            case 'stable':
            default:
                return 'trend-stable';
        }
    }
    
    /**
     * Obtiene el texto descriptivo de la tendencia
     */
    getTrendText(trend) {
        switch (trend) {
            case 'improving':
                return 'Tendencia al alza';
            case 'declining':
                return 'Tendencia a la baja';
            case 'stable':
            default:
                return 'Tendencia estable';
        }
    }
    
    /**
     * Configura eventos personalizados del widget
     */
    setupCustomEvents() {
        // Suscribirse a eventos específicos de estadísticas de goles
        this.subscribeToEvent('GOAL_SCORED', (eventData) => {
            // Actualizar inmediatamente cuando se anota un gol
            setTimeout(() => this.refresh(), 1000);
        });
        
        // Suscribirse a cambios de jornada
        this.subscribeToEvent('JORNADA_CHANGED', (eventData) => {
            if (this.settings.jornadaRange === 'current') {
                this.refresh();
            }
        });
    }
    
    /**
     * Maneja clics en jugadores para mostrar detalles
     */
    setupPlayerInteractions() {
        const playerItems = this.element.querySelectorAll('.player-item');
        
        playerItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const playerName = item.dataset.player;
                this.showPlayerDetails(playerName);
            });
            
            // Agregar efecto hover
            item.addEventListener('mouseenter', () => {
                item.classList.add('hovered');
            });
            
            item.addEventListener('mouseleave', () => {
                item.classList.remove('hovered');
            });
        });
    }
    
    /**
     * Muestra detalles del jugador seleccionado
     */
    showPlayerDetails(playerName) {
        const player = this.playersData.find(p => p.name === playerName);
        if (!player) return;
        
        // Emitir evento para que otros widgets puedan reaccionar
        this.emitEvent('PLAYER_SELECTED', {
            player: player,
            source: 'TopPlayersWidget'
        });
        
        // Mostrar modal con detalles (implementación básica)
        const modal = document.createElement('div');
        modal.className = 'player-details-modal';
        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h4>Detalles de ${player.name}</h4>
                    <button class="modal-close-btn">×</button>
                </div>
                <div class="modal-body">
                    <div class="player-detail-info">
                        <img src="data:image/svg+xml;base64,${this.generatePlayerAvatar(player.name)}" 
                             alt="${player.name}" class="player-detail-avatar" />
                        <div class="player-detail-stats">
                            <h5>${player.name}</h5>
                            <p><strong>Equipo:</strong> ${player.team}</p>
                            <p><strong>Goles totales:</strong> ${player.goals}</p>
                            <p><strong>Goles por partido:</strong> ${player.goalsPerGame}</p>
                            <p><strong>Tendencia:</strong> ${this.getTrendText(player.trend)} ${this.getTrendIcon(player.trend)}</p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary modal-close-btn">Cerrar</button>
                </div>
            </div>
        `;
        
        // Event listeners del modal
        const closeButtons = modal.querySelectorAll('.modal-close-btn');
        const backdrop = modal.querySelector('.modal-backdrop');
        
        const closeModal = () => modal.remove();
        
        closeButtons.forEach(btn => btn.addEventListener('click', closeModal));
        backdrop.addEventListener('click', closeModal);
        
        document.body.appendChild(modal);
        modal.style.display = 'flex';
    }
    
    /**
     * Configura las interacciones después del render
     */
    setupInteractionsAfterRender() {
        // Configurar interacciones después del render
        setTimeout(() => {
            this.setupPlayerInteractions();
        }, 100);
    }
}

// Descripción del widget para el factory
TopPlayersWidget.description = 'Muestra el ranking de mejores goleadores con estadísticas y tendencias';

// Registrar el widget en el factory cuando se carga
document.addEventListener('DOMContentLoaded', () => {
    console.log('Registrando TopPlayersWidget...');
    const factory = window.WidgetFactory?.getInstance();
    if (factory) {
        factory.register('TopPlayersWidget', TopPlayersWidget);
        console.log('TopPlayersWidget registrado correctamente');
    } else {
        console.error('WidgetFactory no disponible para registrar TopPlayersWidget');
    }
});

// Hacer disponible globalmente
window.TopPlayersWidget = TopPlayersWidget;