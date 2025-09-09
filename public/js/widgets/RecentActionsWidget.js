/**
 * RecentActionsWidget - Widget que muestra las últimas acciones registradas
 * Incluye filtros por tipo de acción y equipo, timestamps relativos y enlaces a detalles
 */
class RecentActionsWidget extends BaseWidget {
    constructor(config) {
        super(config);
        this.actionsData = [];
        this.availableTeams = [];
        this.availableActions = ['Gol', 'Asistencia', 'Falta', 'Tarjeta Amarilla', 'Tarjeta Roja', 'Sustitución'];
    }
    
    /**
     * Configuración por defecto del widget
     */
    getDefaultSettings() {
        return {
            ...super.getDefaultSettings(),
            title: 'Acciones Recientes',
            maxActions: 10,
            selectedTeam: '', // '' para todos los equipos
            selectedActionType: '', // '' para todos los tipos
            showTimestamps: true,
            showPlayerPhotos: true,
            autoRefresh: true,
            refreshInterval: 30000, // 30 segundos
            showJornada: true,
            showMinute: true
        };
    }
    
    /**
     * HTML personalizado para la configuración del widget
     */
    getCustomConfigHTML() {
        const teamOptions = this.availableTeams.map(team => 
            `<option value="${team}" ${this.settings.selectedTeam === team ? 'selected' : ''}>${team}</option>`
        ).join('');
        
        const actionOptions = this.availableActions.map(action => 
            `<option value="${action}" ${this.settings.selectedActionType === action ? 'selected' : ''}>${action}</option>`
        ).join('');
        
        return `
            <div class="config-group">
                <label for="widget-max-actions-${this.id}">Número de acciones:</label>
                <select id="widget-max-actions-${this.id}">
                    <option value="5" ${this.settings.maxActions === 5 ? 'selected' : ''}>5 acciones</option>
                    <option value="10" ${this.settings.maxActions === 10 ? 'selected' : ''}>10 acciones</option>
                    <option value="15" ${this.settings.maxActions === 15 ? 'selected' : ''}>15 acciones</option>
                    <option value="20" ${this.settings.maxActions === 20 ? 'selected' : ''}>20 acciones</option>
                </select>
            </div>
            <div class="config-group">
                <label for="widget-team-filter-${this.id}">Filtrar por equipo:</label>
                <select id="widget-team-filter-${this.id}">
                    <option value="" ${this.settings.selectedTeam === '' ? 'selected' : ''}>Todos los equipos</option>
                    ${teamOptions}
                </select>
            </div>
            <div class="config-group">
                <label for="widget-action-filter-${this.id}">Filtrar por acción:</label>
                <select id="widget-action-filter-${this.id}">
                    <option value="" ${this.settings.selectedActionType === '' ? 'selected' : ''}>Todas las acciones</option>
                    ${actionOptions}
                </select>
            </div>
            <div class="config-group">
                <label>
                    <input type="checkbox" id="widget-timestamps-${this.id}" ${this.settings.showTimestamps ? 'checked' : ''} />
                    Mostrar timestamps relativos
                </label>
            </div>
            <div class="config-group">
                <label>
                    <input type="checkbox" id="widget-photos-${this.id}" ${this.settings.showPlayerPhotos ? 'checked' : ''} />
                    Mostrar fotos de jugadores
                </label>
            </div>
            <div class="config-group">
                <label>
                    <input type="checkbox" id="widget-jornada-${this.id}" ${this.settings.showJornada ? 'checked' : ''} />
                    Mostrar jornada
                </label>
            </div>
            <div class="config-group">
                <label>
                    <input type="checkbox" id="widget-minute-${this.id}" ${this.settings.showMinute ? 'checked' : ''} />
                    Mostrar minuto
                </label>
            </div>
            <div class="config-group">
                <label>
                    <input type="checkbox" id="widget-auto-refresh-${this.id}" ${this.settings.autoRefresh ? 'checked' : ''} />
                    Actualización automática
                </label>
            </div>
        `;
    }
    
    /**
     * Guarda la configuración personalizada del widget
     */
    saveCustomConfig(modal) {
        const maxActionsSelect = modal.querySelector(`#widget-max-actions-${this.id}`);
        const teamFilterSelect = modal.querySelector(`#widget-team-filter-${this.id}`);
        const actionFilterSelect = modal.querySelector(`#widget-action-filter-${this.id}`);
        const timestampsCheckbox = modal.querySelector(`#widget-timestamps-${this.id}`);
        const photosCheckbox = modal.querySelector(`#widget-photos-${this.id}`);
        const jornadaCheckbox = modal.querySelector(`#widget-jornada-${this.id}`);
        const minuteCheckbox = modal.querySelector(`#widget-minute-${this.id}`);
        const autoRefreshCheckbox = modal.querySelector(`#widget-auto-refresh-${this.id}`);
        
        if (maxActionsSelect) {
            this.settings.maxActions = parseInt(maxActionsSelect.value);
        }
        
        if (teamFilterSelect) {
            this.settings.selectedTeam = teamFilterSelect.value;
        }
        
        if (actionFilterSelect) {
            this.settings.selectedActionType = actionFilterSelect.value;
        }
        
        if (timestampsCheckbox) {
            this.settings.showTimestamps = timestampsCheckbox.checked;
        }
        
        if (photosCheckbox) {
            this.settings.showPlayerPhotos = photosCheckbox.checked;
        }
        
        if (jornadaCheckbox) {
            this.settings.showJornada = jornadaCheckbox.checked;
        }
        
        if (minuteCheckbox) {
            this.settings.showMinute = minuteCheckbox.checked;
        }
        
        if (autoRefreshCheckbox) {
            const wasAutoRefresh = this.settings.autoRefresh;
            this.settings.autoRefresh = autoRefreshCheckbox.checked;
            
            // Actualizar intervalo de refresh
            if (this.settings.autoRefresh && !wasAutoRefresh) {
                this.startAutoRefresh();
            } else if (!this.settings.autoRefresh && wasAutoRefresh) {
                this.stopAutoRefresh();
            }
        }
    }
    
    /**
     * Renderiza el contenido del widget
     */
    render() {
        const body = this.element.querySelector('.widget-body');
        if (!body) return;
        
        if (!this.actionsData || this.actionsData.length === 0) {
            body.innerHTML = `
                <div class="no-data">
                    <div class="no-data-icon">📋</div>
                    <p>No hay acciones recientes disponibles</p>
                    <button class="btn btn-primary refresh-actions-btn">Actualizar</button>
                </div>
            `;
            
            // Agregar event listener al botón
            const refreshBtn = body.querySelector('.refresh-actions-btn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => this.refresh());
            }
            return;
        }
        
        const actionsHTML = this.actionsData.map((action, index) => {
            return this.renderActionItem(action, index);
        }).join('');
        
        body.innerHTML = `
            <div class="recent-actions-widget">
                <div class="actions-header">
                    <div class="actions-info">
                        <span class="actions-count">${this.actionsData.length} acciones</span>
                        ${this.getFilterSummary()}
                    </div>
                    <div class="actions-controls">
                        ${this.settings.autoRefresh ? '<span class="auto-refresh-indicator">🔄 Auto</span>' : ''}
                    </div>
                </div>
                <div class="actions-list">
                    ${actionsHTML}
                </div>
                <div class="widget-footer">
                    <small>Actualizado: ${new Date().toLocaleTimeString()}</small>
                </div>
            </div>
        `;
        
        // Configurar interacciones después del render
        this.setupActionInteractions();
    }
    
    /**
     * Renderiza un elemento de acción individual
     */
    renderActionItem(action, index) {
        const actionIcon = this.getActionIcon(action.action);
        const actionClass = this.getActionClass(action.action);
        const relativeTime = this.settings.showTimestamps ? this.getRelativeTime(action.timestamp) : '';
        
        return `
            <div class="action-item ${actionClass}" data-action-id="${action.id}">
                <div class="action-indicator">
                    <span class="action-icon">${actionIcon}</span>
                    <span class="action-number">${index + 1}</span>
                </div>
                
                ${this.settings.showPlayerPhotos ? `
                    <div class="action-player-photo">
                        <img src="data:image/svg+xml;base64,${this.generatePlayerAvatar(action.player)}" 
                             alt="${action.player}" 
                             class="player-avatar-small" />
                    </div>
                ` : ''}
                
                <div class="action-details">
                    <div class="action-main">
                        <span class="action-type">${action.action}</span>
                        <span class="action-player">${action.player}</span>
                        ${action.team ? `<span class="action-team">(${action.team})</span>` : ''}
                    </div>
                    <div class="action-meta">
                        ${this.settings.showJornada ? `<span class="action-jornada">J${action.jornada}</span>` : ''}
                        ${this.settings.showMinute ? `<span class="action-minute">${action.minute}'</span>` : ''}
                        ${this.settings.showTimestamps ? `<span class="action-time">${relativeTime}</span>` : ''}
                    </div>
                </div>
                
                <div class="action-controls">
                    <button class="action-detail-btn" title="Ver detalles">
                        <span class="icon-detail">👁️</span>
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Obtiene el icono para un tipo de acción
     */
    getActionIcon(actionType) {
        const icons = {
            'Gol': '⚽',
            'Asistencia': '🅰️',
            'Falta': '🚫',
            'Tarjeta Amarilla': '🟨',
            'Tarjeta Roja': '🟥',
            'Sustitución': '🔄'
        };
        return icons[actionType] || '📝';
    }
    
    /**
     * Obtiene la clase CSS para un tipo de acción
     */
    getActionClass(actionType) {
        const classes = {
            'Gol': 'action-goal',
            'Asistencia': 'action-assist',
            'Falta': 'action-foul',
            'Tarjeta Amarilla': 'action-yellow-card',
            'Tarjeta Roja': 'action-red-card',
            'Sustitución': 'action-substitution'
        };
        return classes[actionType] || 'action-other';
    }
    
    /**
     * Obtiene el tiempo relativo desde una fecha
     */
    getRelativeTime(timestamp) {
        if (!timestamp) return 'Hace un momento';
        
        const now = new Date();
        const actionTime = new Date(timestamp);
        const diffMs = now - actionTime;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffMins < 1) return 'Hace un momento';
        if (diffMins < 60) return `Hace ${diffMins} min`;
        if (diffHours < 24) return `Hace ${diffHours}h`;
        if (diffDays < 7) return `Hace ${diffDays}d`;
        
        return actionTime.toLocaleDateString();
    }
    
    /**
     * Obtiene el resumen de filtros aplicados
     */
    getFilterSummary() {
        const filters = [];
        
        if (this.settings.selectedTeam) {
            filters.push(`Equipo: ${this.settings.selectedTeam}`);
        }
        
        if (this.settings.selectedActionType) {
            filters.push(`Acción: ${this.settings.selectedActionType}`);
        }
        
        if (filters.length === 0) {
            return '<span class="filter-summary">Todas las acciones</span>';
        }
        
        return `<span class="filter-summary">${filters.join(' • ')}</span>`;
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
            <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="16" fill="${bgColor}"/>
                <text x="16" y="21" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="bold">
                    ${initials}
                </text>
            </svg>
        `;
        
        return btoa(svg);
    }
    
    /**
     * Configura las interacciones de las acciones
     */
    setupActionInteractions() {
        const actionItems = this.element.querySelectorAll('.action-item');
        
        actionItems.forEach(item => {
            // Click en el item completo para seleccionar
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.action-detail-btn')) {
                    this.selectAction(item);
                }
            });
            
            // Botón de detalles
            const detailBtn = item.querySelector('.action-detail-btn');
            if (detailBtn) {
                detailBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const actionId = item.dataset.actionId;
                    this.showActionDetails(actionId);
                });
            }
        });
    }
    
    /**
     * Selecciona una acción
     */
    selectAction(actionElement) {
        // Remover selección anterior
        this.element.querySelectorAll('.action-item.selected').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Agregar selección actual
        actionElement.classList.add('selected');
        
        const actionId = actionElement.dataset.actionId;
        const action = this.actionsData.find(a => a.id == actionId);
        
        if (action) {
            // Emitir evento de selección de acción
            this.emitEvent('ACTION_SELECTED', {
                action: action,
                source: 'RecentActionsWidget'
            });
        }
    }
    
    /**
     * Muestra los detalles de una acción
     */
    showActionDetails(actionId) {
        const action = this.actionsData.find(a => a.id == actionId);
        if (!action) return;
        
        // Crear modal con detalles
        const modal = document.createElement('div');
        modal.className = 'action-details-modal';
        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h4>Detalles de la Acción</h4>
                    <button class="modal-close-btn">×</button>
                </div>
                <div class="modal-body">
                    <div class="action-detail-info">
                        <div class="action-detail-header">
                            <span class="action-icon-large">${this.getActionIcon(action.action)}</span>
                            <div class="action-detail-main">
                                <h5>${action.action}</h5>
                                <p><strong>Jugador:</strong> ${action.player}</p>
                                ${action.team ? `<p><strong>Equipo:</strong> ${action.team}</p>` : ''}
                            </div>
                        </div>
                        <div class="action-detail-stats">
                            <div class="detail-stat">
                                <span class="stat-label">Jornada</span>
                                <span class="stat-value">${action.jornada}</span>
                            </div>
                            <div class="detail-stat">
                                <span class="stat-label">Minuto</span>
                                <span class="stat-value">${action.minute}'</span>
                            </div>
                            ${action.timestamp ? `
                                <div class="detail-stat">
                                    <span class="stat-label">Tiempo</span>
                                    <span class="stat-value">${this.getRelativeTime(action.timestamp)}</span>
                                </div>
                            ` : ''}
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
     * Actualiza los datos del widget
     */
    async doRefresh() {
        try {
            // Cargar equipos disponibles si no los tenemos
            if (this.availableTeams.length === 0) {
                await this.loadAvailableTeams();
            }
            
            // Construir URL con filtros
            let url = '/api/stats';
            const params = new URLSearchParams();
            
            if (this.settings.selectedTeam) {
                params.append('team', this.settings.selectedTeam);
            }
            
            if (this.settings.selectedActionType) {
                params.append('action', this.settings.selectedActionType);
            }
            
            params.append('limit', this.settings.maxActions.toString());
            params.append('orderBy', 'id');
            params.append('order', 'DESC');
            
            if (params.toString()) {
                url += '?' + params.toString();
            }
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (Array.isArray(data)) {
                // Agregar timestamps simulados para las acciones
                this.actionsData = data.map(action => ({
                    ...action,
                    timestamp: this.generateTimestamp(action.id)
                }));
                this.render();
            } else {
                throw new Error('Formato de datos inválido');
            }
            
        } catch (error) {
            console.error('Error actualizando RecentActionsWidget:', error);
            
            // Usar datos de fallback para demostración
            this.actionsData = this.getFallbackData();
            this.render();
        }
    }
    
    /**
     * Genera un timestamp simulado basado en el ID de la acción
     */
    generateTimestamp(actionId) {
        // Generar timestamp simulado (más reciente = ID más alto)
        const now = new Date();
        const minutesAgo = Math.max(1, (1000 - actionId) * 2); // Simular que acciones más nuevas tienen IDs más altos
        return new Date(now.getTime() - (minutesAgo * 60 * 1000));
    }
    
    /**
     * Obtiene datos de fallback para demostración
     */
    getFallbackData() {
        const fallbackActions = [
            { id: 1001, player: 'Carlos Rodríguez', team: 'Real Madrid', action: 'Gol', minute: 23, jornada: 12 },
            { id: 1002, player: 'Luis García', team: 'Barcelona', action: 'Asistencia', minute: 45, jornada: 12 },
            { id: 1003, player: 'Miguel Santos', team: 'Atlético Madrid', action: 'Tarjeta Amarilla', minute: 67, jornada: 12 },
            { id: 1004, player: 'Pedro Martínez', team: 'Valencia', action: 'Falta', minute: 78, jornada: 12 },
            { id: 1005, player: 'Juan López', team: 'Sevilla', action: 'Gol', minute: 89, jornada: 12 },
            { id: 1006, player: 'Antonio Ruiz', team: 'Real Betis', action: 'Sustitución', minute: 60, jornada: 11 },
            { id: 1007, player: 'Francisco Moreno', team: 'Athletic Club', action: 'Tarjeta Roja', minute: 85, jornada: 11 },
            { id: 1008, player: 'Roberto Silva', team: 'Real Sociedad', action: 'Gol', minute: 12, jornada: 11 }
        ];
        
        // Aplicar filtros si están configurados
        let filteredActions = fallbackActions;
        
        if (this.settings.selectedTeam) {
            filteredActions = filteredActions.filter(action => action.team === this.settings.selectedTeam);
        }
        
        if (this.settings.selectedActionType) {
            filteredActions = filteredActions.filter(action => action.action === this.settings.selectedActionType);
        }
        
        // Limitar al número máximo de acciones
        filteredActions = filteredActions.slice(0, this.settings.maxActions);
        
        // Agregar timestamps simulados
        return filteredActions.map(action => ({
            ...action,
            timestamp: this.generateTimestamp(action.id)
        }));
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
     * Configura eventos personalizados del widget
     */
    setupCustomEvents() {
        // Suscribirse a eventos de nuevas estadísticas
        this.subscribeToEvent('STATS_UPDATED', (eventData) => {
            if (this.settings.autoRefresh) {
                setTimeout(() => this.refresh(), 1000);
            }
        });
        
        // Suscribirse a eventos de selección de equipo
        this.subscribeToEvent('TEAM_SELECTED', (eventData) => {
            if (eventData.data.team !== this.settings.selectedTeam) {
                this.settings.selectedTeam = eventData.data.team;
                this.refresh();
            }
        });
    }
}

// Descripción del widget para el factory
RecentActionsWidget.description = 'Muestra las últimas acciones registradas con filtros y timestamps relativos';

// Registrar el widget en el factory cuando se carga
document.addEventListener('DOMContentLoaded', () => {
    console.log('Registrando RecentActionsWidget...');
    const factory = window.WidgetFactory?.getInstance();
    if (factory) {
        factory.register('RecentActionsWidget', RecentActionsWidget);
        console.log('RecentActionsWidget registrado correctamente');
    } else {
        console.error('WidgetFactory no disponible para registrar RecentActionsWidget');
    }
});

// Hacer disponible globalmente
window.RecentActionsWidget = RecentActionsWidget;