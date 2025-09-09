const APIProvider = require('./APIProvider');
const RateLimiter = require('./RateLimiter');
const QuotaManager = require('./QuotaManager');

/**
 * FootballDataProvider - Implementación específica para Football-Data.org
 * Proveedor principal para datos de LaLiga en tiempo real
 */
class FootballDataProvider extends APIProvider {
    constructor(config) {
        super({
            name: 'Football-Data.org',
            baseUrl: 'https://api.football-data.org/v4',
            apiKey: config.apiKey,
            rateLimit: { requests: 10, window: 60000 }, // 10 req/min para plan gratuito
            timeout: 15000,
            ...config
        });
        
        // Inicializar rate limiter específico
        this.rateLimiter = new RateLimiter({
            name: 'FootballData-RateLimit',
            requests: 10,
            window: 60000, // 1 minuto
            burstLimit: 5, // Máximo 5 requests en ráfaga
            maxQueueSize: 50
        });
        
        // Inicializar quota manager
        this.quotaManager = new QuotaManager({
            name: 'FootballData-Quota',
            daily: 1000,    // Plan gratuito: 1000 requests/día
            monthly: 30000, // Plan gratuito: 30000 requests/mes
            perMinute: 10,
            perHour: 600,
            warningThreshold: 0.8,
            criticalThreshold: 0.95
        });
        
        // IDs específicos de Football-Data.org
        this.competitions = {
            laliga: 'PD', // Primera División
            championsLeague: 'CL',
            worldCup: 'WC'
        };
        
        // Mapeo de tipos de eventos
        this.eventTypes = {
            'GOAL': 'Gol',
            'PENALTY': 'Gol',
            'OWN_GOAL': 'Gol',
            'YELLOW_CARD': 'Tarjeta Amarilla',
            'RED_CARD': 'Tarjeta Roja',
            'SUBSTITUTION': 'Sustitución'
        };
    }
    
    /**
     * Sobrescribe makeRequest para usar rate limiting y quota management avanzados
     * @param {string} endpoint - Endpoint a consultar
     * @param {Object} options - Opciones de la petición
     * @returns {Promise<Object>} Respuesta de la API
     */
    async makeRequest(endpoint, options = {}) {
        const operation = this.getOperationFromEndpoint(endpoint);
        const priority = options.priority || 'normal';
        
        // Verificar quota antes de procesar
        const quotaCheck = this.quotaManager.checkQuota(operation, 1);
        if (!quotaCheck.allowed) {
            const error = new Error(`Quota excedida: ${quotaCheck.quotaType} (${quotaCheck.current}/${quotaCheck.limit})`);
            error.quotaInfo = quotaCheck;
            throw error;
        }
        
        // Procesar con rate limiting
        return await this.rateLimiter.processRequest(async () => {
            // Consumir quota
            this.quotaManager.consumeQuota(operation, 1);
            
            // Realizar petición usando el método padre
            return await super.makeRequest(endpoint, options);
        }, { priority });
    }
    
    /**
     * Determina el tipo de operación basado en el endpoint
     * @param {string} endpoint - Endpoint consultado
     * @returns {string} Tipo de operación
     */
    getOperationFromEndpoint(endpoint) {
        if (endpoint.includes('/teams')) return 'teams';
        if (endpoint.includes('/matches')) return 'matches';
        if (endpoint.includes('/standings')) return 'standings';
        if (endpoint.includes('/competitions')) return 'competitions';
        return 'other';
    }
    
    /**
     * Obtiene headers de autenticación para Football-Data.org
     */
    getAuthHeaders() {
        return {
            'X-Auth-Token': this.apiKey
        };
    }
    
    /**
     * Obtiene estadísticas completas del proveedor
     * @returns {Object} Estadísticas del rate limiter y quota manager
     */
    getDetailedStats() {
        return {
            provider: this.getProviderInfo(),
            health: this.getHealthStatus(),
            rateLimiter: this.rateLimiter.getStats(),
            quotaManager: this.quotaManager.getStats()
        };
    }
    
    /**
     * Obtiene equipos de LaLiga
     * @param {string} competition - Competición (por defecto LaLiga)
     * @returns {Promise<Array>} Lista de equipos
     */
    async getTeams(competition = 'PD') {
        try {
            const data = await this.makeRequest(`/competitions/${competition}/teams`);
            return this.transformTeams(data.teams || []);
        } catch (error) {
            console.error('Error obteniendo equipos:', error);
            throw new Error(`No se pudieron obtener los equipos: ${error.message}`);
        }
    }
    
    /**
     * Obtiene jugadores de un equipo específico
     * @param {string} teamId - ID del equipo en Football-Data.org
     * @returns {Promise<Array>} Lista de jugadores
     */
    async getPlayers(teamId) {
        try {
            const data = await this.makeRequest(`/teams/${teamId}`);
            return this.transformPlayers(data.squad || [], data.name);
        } catch (error) {
            console.error(`Error obteniendo jugadores del equipo ${teamId}:`, error);
            throw new Error(`No se pudieron obtener los jugadores: ${error.message}`);
        }
    }
    
    /**
     * Obtiene partidos de LaLiga
     * @param {string} competition - Competición
     * @param {string} season - Temporada (YYYY)
     * @returns {Promise<Array>} Lista de partidos
     */
    async getMatches(competition = 'PD', season = '2024') {
        try {
            const data = await this.makeRequest(`/competitions/${competition}/matches?season=${season}`);
            return this.transformMatches(data.matches || []);
        } catch (error) {
            console.error('Error obteniendo partidos:', error);
            throw new Error(`No se pudieron obtener los partidos: ${error.message}`);
        }
    }
    
    /**
     * Obtiene partidos en vivo
     * @returns {Promise<Array>} Lista de partidos en vivo
     */
    async getLiveMatches() {
        try {
            // Football-Data.org no tiene endpoint específico para live matches
            // Obtenemos partidos de hoy y filtramos por estado
            const today = new Date().toISOString().split('T')[0];
            const data = await this.makeRequest(`/competitions/PD/matches?dateFrom=${today}&dateTo=${today}`);
            
            const liveMatches = (data.matches || []).filter(match => 
                match.status === 'IN_PLAY' || match.status === 'PAUSED'
            );
            
            return this.transformMatches(liveMatches);
        } catch (error) {
            console.error('Error obteniendo partidos en vivo:', error);
            return []; // No fallar si no hay partidos en vivo
        }
    }
    
    /**
     * Obtiene eventos de un partido (limitado en Football-Data.org)
     * @param {string} matchId - ID del partido
     * @returns {Promise<Array>} Lista de eventos
     */
    async getMatchEvents(matchId) {
        try {
            const data = await this.makeRequest(`/matches/${matchId}`);
            
            // Football-Data.org tiene información limitada de eventos
            // Extraemos lo que podemos del objeto match
            const events = [];
            
            if (data.score && data.score.fullTime) {
                // Crear eventos básicos basados en el resultado
                const homeGoals = data.score.fullTime.home || 0;
                const awayGoals = data.score.fullTime.away || 0;
                
                // Generar eventos de gol simulados (sin detalles específicos)
                for (let i = 0; i < homeGoals; i++) {
                    events.push({
                        id: `${matchId}_home_goal_${i}`,
                        type: 'GOAL',
                        team: data.homeTeam,
                        minute: Math.floor(Math.random() * 90) + 1, // Minuto aleatorio
                        player: { name: 'Jugador desconocido' }
                    });
                }
                
                for (let i = 0; i < awayGoals; i++) {
                    events.push({
                        id: `${matchId}_away_goal_${i}`,
                        type: 'GOAL',
                        team: data.awayTeam,
                        minute: Math.floor(Math.random() * 90) + 1,
                        player: { name: 'Jugador desconocido' }
                    });
                }
            }
            
            return this.transformEvents(events, matchId);
        } catch (error) {
            console.error(`Error obteniendo eventos del partido ${matchId}:`, error);
            return []; // Retornar array vacío si no hay eventos
        }
    }
    
    /**
     * Obtiene la clasificación de LaLiga
     * @param {string} competition - Competición
     * @returns {Promise<Array>} Tabla de clasificación
     */
    async getStandings(competition = 'PD') {
        try {
            const data = await this.makeRequest(`/competitions/${competition}/standings`);
            return this.transformStandings(data.standings?.[0]?.table || []);
        } catch (error) {
            console.error('Error obteniendo clasificación:', error);
            throw new Error(`No se pudo obtener la clasificación: ${error.message}`);
        }
    }
    
    /**
     * Verifica la conectividad con Football-Data.org
     * @returns {Promise<boolean>} True si la conexión es exitosa
     */
    async testConnection() {
        try {
            await this.makeRequest('/competitions');
            return true;
        } catch (error) {
            console.error('Test de conexión fallido:', error);
            return false;
        }
    }

    /**
     * Test ligero para verificar respuesta de la API
     * @returns {Promise<Object>} Resultado del test ligero
     */
    async lightweightTest() {
        try {
            // Usar endpoint de competiciones que es ligero y no consume mucha quota
            const startTime = Date.now();
            const result = await this.makeRequest('/competitions', {
                timeout: 5000,
                priority: 'high' // Alta prioridad para health checks
            });
            
            const responseTime = Date.now() - startTime;
            
            return {
                success: true,
                responseTime,
                dataReceived: Array.isArray(result.competitions) ? result.competitions.length : 0,
                timestamp: Date.now(),
                endpoint: '/competitions'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                timestamp: Date.now(),
                endpoint: '/competitions'
            };
        }
    }
    
    // Métodos de transformación de datos
    
    /**
     * Transforma equipos de Football-Data.org a nuestro formato
     * @param {Array} teams - Equipos de la API
     * @returns {Array} Equipos transformados
     */
    transformTeams(teams) {
        return teams.map(team => ({
            id: team.id,
            name: team.name,
            shortName: team.shortName || team.tla,
            logo: team.crest,
            stadium: team.venue,
            founded: team.founded,
            website: team.website,
            externalId: team.id,
            provider: this.name,
            lastSynced: new Date(),
            syncStatus: 'active'
        }));
    }
    
    /**
     * Transforma jugadores de Football-Data.org a nuestro formato
     * @param {Array} players - Jugadores de la API
     * @param {string} teamName - Nombre del equipo
     * @returns {Array} Jugadores transformados
     */
    transformPlayers(players, teamName) {
        return players.map(player => ({
            id: player.id,
            name: player.name,
            team: teamName,
            position: player.position,
            shirtNumber: player.shirtNumber,
            dateOfBirth: player.dateOfBirth,
            nationality: player.nationality,
            externalId: player.id,
            provider: this.name,
            lastSynced: new Date(),
            isActive: true
        }));
    }
    
    /**
     * Transforma partidos de Football-Data.org a nuestro formato
     * @param {Array} matches - Partidos de la API
     * @returns {Array} Partidos transformados
     */
    transformMatches(matches) {
        return matches.map((match, index) => ({
            id: match.id,
            homeTeam: match.homeTeam?.name,
            awayTeam: match.awayTeam?.name,
            date: new Date(match.utcDate),
            status: this.mapMatchStatus(match.status),
            homeScore: match.score?.fullTime?.home || 0,
            awayScore: match.score?.fullTime?.away || 0,
            jornada: match.matchday || this.calculateJornada(match.utcDate),
            stadium: match.venue,
            referee: match.referees?.[0]?.name,
            externalId: match.id,
            provider: this.name,
            isLive: match.status === 'IN_PLAY' || match.status === 'PAUSED',
            lastEventSync: new Date()
        }));
    }
    
    /**
     * Transforma eventos de partido a nuestro formato
     * @param {Array} events - Eventos de la API
     * @param {string} matchId - ID del partido
     * @returns {Array} Eventos transformados
     */
    transformEvents(events, matchId) {
        return events.map(event => ({
            id: event.id,
            matchId: matchId,
            player: event.player?.name || 'Jugador desconocido',
            team: event.team?.name,
            action: this.eventTypes[event.type] || 'Otra',
            minute: event.minute || 0,
            timestamp: new Date(),
            metadata: {
                externalId: event.id,
                provider: this.name,
                originalType: event.type
            }
        }));
    }
    
    /**
     * Transforma clasificación a nuestro formato
     * @param {Array} standings - Clasificación de la API
     * @returns {Array} Clasificación transformada
     */
    transformStandings(standings) {
        return standings.map(entry => ({
            position: entry.position,
            team: entry.team?.name,
            points: entry.points,
            playedGames: entry.playedGames,
            won: entry.won,
            draw: entry.draw,
            lost: entry.lost,
            goalsFor: entry.goalsFor,
            goalsAgainst: entry.goalsAgainst,
            goalDifference: entry.goalDifference,
            externalTeamId: entry.team?.id,
            provider: this.name
        }));
    }
    
    /**
     * Mapea estados de partido de Football-Data.org a nuestro formato
     * @param {string} status - Estado de la API
     * @returns {string} Estado mapeado
     */
    mapMatchStatus(status) {
        const statusMap = {
            'SCHEDULED': 'scheduled',
            'TIMED': 'scheduled',
            'IN_PLAY': 'live',
            'PAUSED': 'live',
            'FINISHED': 'finished',
            'POSTPONED': 'postponed',
            'CANCELLED': 'cancelled',
            'SUSPENDED': 'postponed'
        };
        
        return statusMap[status] || 'scheduled';
    }
    
    /**
     * Calcula la jornada basada en la fecha (fallback)
     * @param {string} date - Fecha del partido
     * @returns {number} Número de jornada estimado
     */
    calculateJornada(date) {
        // Lógica simple para estimar jornada basada en fecha
        // La temporada 2024-25 empezó aproximadamente en agosto 2024
        const matchDate = new Date(date);
        const seasonStart = new Date('2024-08-15');
        const weeksDiff = Math.floor((matchDate - seasonStart) / (7 * 24 * 60 * 60 * 1000));
        
        return Math.max(1, Math.min(38, Math.floor(weeksDiff / 1) + 1));
    }
    
    /**
     * Obtiene información de la API y límites
     * @returns {Object} Información del proveedor
     */
    getProviderInfo() {
        return {
            name: this.name,
            baseUrl: this.baseUrl,
            competitions: this.competitions,
            rateLimit: this.rateLimit,
            features: {
                teams: true,
                players: true,
                matches: true,
                liveMatches: true,
                standings: true,
                detailedEvents: false, // Limitado en plan gratuito
                realTimeUpdates: false
            },
            limitations: [
                'Plan gratuito: 10 requests por minuto',
                'Eventos de partido limitados',
                'No hay actualizaciones en tiempo real',
                'Datos históricos limitados'
            ]
        };
    }
}

module.exports = FootballDataProvider;