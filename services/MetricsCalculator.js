/**
 * MetricsCalculator - Servicio para cálculo de métricas avanzadas
 * Maneja cálculos de estadísticas por jugador, equipo y análisis de tendencias
 */
class MetricsCalculator {
    constructor(database) {
        this.db = database;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
    }
    
    /**
     * Calcula métricas por jugador
     * @param {string} playerId - Nombre del jugador
     * @param {Object} jornadaRange - Rango de jornadas {start, end}
     * @returns {Promise<Object>} Métricas del jugador
     */
    async calculatePlayerMetrics(playerId, jornadaRange = null) {
        const cacheKey = `player_${playerId}_${JSON.stringify(jornadaRange)}`;
        
        // Verificar cache
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }
        
        try {
            // Obtener estadísticas del jugador
            const stats = await this.getPlayerStats(playerId, jornadaRange);
            
            if (stats.length === 0) {
                return this.getEmptyPlayerMetrics(playerId);
            }
            
            // Calcular métricas básicas
            const totalGames = this.getTotalGames(stats);
            const goals = stats.filter(s => s.action.toLowerCase() === 'gol').length;
            const assists = stats.filter(s => s.action.toLowerCase() === 'asistencia').length;
            const yellowCards = stats.filter(s => s.action.toLowerCase() === 'tarjeta amarilla').length;
            const redCards = stats.filter(s => s.action.toLowerCase() === 'tarjeta roja').length;
            const fouls = stats.filter(s => s.action.toLowerCase() === 'falta').length;
            
            // Calcular promedios
            const goalsPerGame = totalGames > 0 ? (goals / totalGames) : 0;
            const assistsPerGame = totalGames > 0 ? (assists / totalGames) : 0;
            const disciplinaryActionsPerGame = totalGames > 0 ? ((yellowCards + redCards) / totalGames) : 0;
            
            // Calcular eficiencia (acciones positivas vs negativas)
            const positiveActions = goals + assists;
            const negativeActions = yellowCards + redCards + fouls;
            const totalActions = positiveActions + negativeActions;
            const efficiency = totalActions > 0 ? (positiveActions / totalActions) : 0;
            
            // Analizar tendencia
            const trend = this.analyzeTrend(stats, 'gol');
            
            // Calcular minutos jugados estimados
            const totalMinutesPlayed = this.estimateMinutesPlayed(stats);
            
            const metrics = {
                playerId: playerId,
                totalGames: totalGames,
                totalActions: stats.length,
                
                // Métricas de goles
                goals: goals,
                goalsPerGame: Math.round(goalsPerGame * 100) / 100,
                
                // Métricas de asistencias
                assists: assists,
                assistsPerGame: Math.round(assistsPerGame * 100) / 100,
                
                // Métricas disciplinarias
                yellowCards: yellowCards,
                redCards: redCards,
                fouls: fouls,
                disciplinaryActionsPerGame: Math.round(disciplinaryActionsPerGame * 100) / 100,
                
                // Métricas calculadas
                efficiency: Math.round(efficiency * 100) / 100,
                totalMinutesPlayed: totalMinutesPlayed,
                
                // Análisis de tendencia
                trend: trend,
                
                // Metadatos
                jornadaRange: jornadaRange,
                calculatedAt: new Date().toISOString(),
                
                // Métricas adicionales
                goalsPerMinute: totalMinutesPlayed > 0 ? Math.round((goals / totalMinutesPlayed) * 90 * 100) / 100 : 0,
                assistsPerMinute: totalMinutesPlayed > 0 ? Math.round((assists / totalMinutesPlayed) * 90 * 100) / 100 : 0
            };
            
            // Guardar en cache
            this.cache.set(cacheKey, {
                data: metrics,
                timestamp: Date.now()
            });
            
            return metrics;
            
        } catch (error) {
            console.error('Error calculando métricas de jugador:', error);
            throw new Error(`Error calculando métricas para jugador ${playerId}: ${error.message}`);
        }
    }
    
    /**
     * Calcula métricas por equipo
     * @param {string} teamId - Nombre del equipo
     * @param {Object} jornadaRange - Rango de jornadas {start, end}
     * @returns {Promise<Object>} Métricas del equipo
     */
    async calculateTeamMetrics(teamId, jornadaRange = null) {
        const cacheKey = `team_${teamId}_${JSON.stringify(jornadaRange)}`;
        
        // Verificar cache
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }
        
        try {
            // Obtener estadísticas del equipo
            const stats = await this.getTeamStats(teamId, jornadaRange);
            
            if (stats.length === 0) {
                return this.getEmptyTeamMetrics(teamId);
            }
            
            // Calcular métricas básicas
            const totalGames = this.getTotalGames(stats);
            const goals = stats.filter(s => s.action.toLowerCase() === 'gol').length;
            const assists = stats.filter(s => s.action.toLowerCase() === 'asistencia').length;
            const yellowCards = stats.filter(s => s.action.toLowerCase() === 'tarjeta amarilla').length;
            const redCards = stats.filter(s => s.action.toLowerCase() === 'tarjeta roja').length;
            
            // Promedio de goles por jornada
            const avgGoalsPerGame = totalGames > 0 ? (goals / totalGames) : 0;
            
            // Distribución de acciones por jugador
            const actionDistribution = this.calculateActionDistribution(stats);
            
            // Rendimiento por jornada
            const performanceByJornada = await this.calculatePerformanceByJornada(stats, jornadaRange);
            
            // Top performers del equipo
            const topPerformers = await this.getTopPerformers(teamId, jornadaRange);
            
            // Cohesión del equipo (métrica calculada basada en distribución de acciones)
            const teamCohesion = this.calculateTeamCohesion(actionDistribution);
            
            const metrics = {
                teamId: teamId,
                totalGames: totalGames,
                totalActions: stats.length,
                totalPlayers: new Set(stats.map(s => s.player)).size,
                
                // Métricas básicas
                goals: goals,
                assists: assists,
                yellowCards: yellowCards,
                redCards: redCards,
                
                // Promedios
                avgGoalsPerGame: Math.round(avgGoalsPerGame * 100) / 100,
                
                // Distribución y análisis
                actionDistribution: actionDistribution,
                performanceByJornada: performanceByJornada,
                topPerformers: topPerformers,
                teamCohesion: Math.round(teamCohesion * 100) / 100,
                
                // Metadatos
                jornadaRange: jornadaRange,
                calculatedAt: new Date().toISOString()
            };
            
            // Guardar en cache
            this.cache.set(cacheKey, {
                data: metrics,
                timestamp: Date.now()
            });
            
            return metrics;
            
        } catch (error) {
            console.error('Error calculando métricas de equipo:', error);
            throw new Error(`Error calculando métricas para equipo ${teamId}: ${error.message}`);
        }
    }
    
    /**
     * Analiza tendencias de una métrica específica
     * @param {string} entityId - ID de la entidad (jugador o equipo)
     * @param {string} entityType - Tipo de entidad ('player' o 'team')
     * @param {string} metric - Métrica a analizar ('gol', 'asistencia', etc.)
     * @param {Object} jornadaRange - Rango de jornadas
     * @returns {Promise<Object>} Análisis de tendencias
     */
    async analyzeTrends(entityId, entityType, metric, jornadaRange = null) {
        try {
            let stats;
            if (entityType === 'player') {
                stats = await this.getPlayerStats(entityId, jornadaRange);
            } else {
                stats = await this.getTeamStats(entityId, jornadaRange);
            }
            
            // Filtrar por métrica específica
            const metricStats = stats.filter(s => 
                s.action.toLowerCase() === metric.toLowerCase()
            );
            
            if (metricStats.length < 2) {
                return {
                    direction: 'stable',
                    strength: 0,
                    confidence: 0,
                    projectedNext: 0,
                    significantChanges: []
                };
            }
            
            // Agrupar por jornada
            const byJornada = this.groupByJornada(metricStats);
            const jornadas = Object.keys(byJornada).sort((a, b) => parseInt(a) - parseInt(b));
            
            if (jornadas.length < 2) {
                return {
                    direction: 'stable',
                    strength: 0,
                    confidence: 0,
                    projectedNext: 0,
                    significantChanges: []
                };
            }
            
            // Calcular tendencia
            const values = jornadas.map(j => byJornada[j].length);
            const trend = this.calculateLinearTrend(values);
            
            // Detectar cambios significativos (>20%)
            const significantChanges = this.detectSignificantChanges(values, jornadas);
            
            return {
                direction: trend.direction,
                strength: Math.abs(trend.slope),
                confidence: trend.rSquared,
                projectedNext: Math.max(0, trend.projectedNext),
                significantChanges: significantChanges,
                dataPoints: values.length,
                jornadaRange: jornadas
            };
            
        } catch (error) {
            console.error('Error analizando tendencias:', error);
            throw new Error(`Error analizando tendencias: ${error.message}`);
        }
    }
    
    /**
     * Obtiene estadísticas de un jugador
     * @private
     */
    async getPlayerStats(playerId, jornadaRange) {
        return new Promise((resolve, reject) => {
            let sql = "SELECT * FROM stats WHERE player = ?";
            const params = [playerId];
            
            if (jornadaRange && jornadaRange.start && jornadaRange.end) {
                sql += " AND jornada BETWEEN ? AND ?";
                params.push(jornadaRange.start, jornadaRange.end);
            }
            
            sql += " ORDER BY jornada, minute";
            
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }
    
    /**
     * Obtiene estadísticas de un equipo
     * @private
     */
    async getTeamStats(teamId, jornadaRange) {
        return new Promise((resolve, reject) => {
            let sql = "SELECT * FROM stats WHERE team = ?";
            const params = [teamId];
            
            if (jornadaRange && jornadaRange.start && jornadaRange.end) {
                sql += " AND jornada BETWEEN ? AND ?";
                params.push(jornadaRange.start, jornadaRange.end);
            }
            
            sql += " ORDER BY jornada, minute";
            
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }
    
    /**
     * Calcula el número total de juegos únicos
     * @private
     */
    getTotalGames(stats) {
        const uniqueGames = new Set(stats.map(s => s.jornada));
        return uniqueGames.size;
    }
    
    /**
     * Analiza la tendencia de una métrica específica
     * @private
     */
    analyzeTrend(stats, metric) {
        const metricStats = stats.filter(s => 
            s.action.toLowerCase() === metric.toLowerCase()
        );
        
        if (metricStats.length < 3) {
            return 'stable';
        }
        
        // Agrupar por jornada y contar
        const byJornada = this.groupByJornada(metricStats);
        const jornadas = Object.keys(byJornada).sort((a, b) => parseInt(a) - parseInt(b));
        const values = jornadas.map(j => byJornada[j].length);
        
        if (values.length < 3) {
            return 'stable';
        }
        
        // Calcular tendencia simple
        const firstHalf = values.slice(0, Math.floor(values.length / 2));
        const secondHalf = values.slice(Math.ceil(values.length / 2));
        
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        
        const change = (secondAvg - firstAvg) / firstAvg;
        
        if (change > 0.2) return 'improving';
        if (change < -0.2) return 'declining';
        return 'stable';
    }
    
    /**
     * Estima los minutos jugados basado en las acciones
     * @private
     */
    estimateMinutesPlayed(stats) {
        if (stats.length === 0) return 0;
        
        // Agrupar por jornada
        const byJornada = this.groupByJornada(stats);
        const jornadas = Object.keys(byJornada);
        
        // Estimar 90 minutos por jornada (puede ser refinado)
        return jornadas.length * 90;
    }
    
    /**
     * Agrupa estadísticas por jornada
     * @private
     */
    groupByJornada(stats) {
        return stats.reduce((acc, stat) => {
            const jornada = stat.jornada;
            if (!acc[jornada]) {
                acc[jornada] = [];
            }
            acc[jornada].push(stat);
            return acc;
        }, {});
    }
    
    /**
     * Calcula la distribución de acciones por jugador
     * @private
     */
    calculateActionDistribution(stats) {
        const distribution = {};
        
        stats.forEach(stat => {
            const player = stat.player;
            const action = stat.action;
            
            if (!distribution[player]) {
                distribution[player] = {};
            }
            
            if (!distribution[player][action]) {
                distribution[player][action] = 0;
            }
            
            distribution[player][action]++;
        });
        
        return distribution;
    }
    
    /**
     * Calcula el rendimiento por jornada
     * @private
     */
    async calculatePerformanceByJornada(stats, jornadaRange) {
        const byJornada = this.groupByJornada(stats);
        const performance = {};
        
        Object.keys(byJornada).forEach(jornada => {
            const jornadaStats = byJornada[jornada];
            const goals = jornadaStats.filter(s => s.action.toLowerCase() === 'gol').length;
            const assists = jornadaStats.filter(s => s.action.toLowerCase() === 'asistencia').length;
            const cards = jornadaStats.filter(s => 
                s.action.toLowerCase().includes('tarjeta')
            ).length;
            
            performance[jornada] = {
                goals: goals,
                assists: assists,
                cards: cards,
                totalActions: jornadaStats.length,
                score: goals * 3 + assists * 2 - cards * 1 // Puntuación simple
            };
        });
        
        return performance;
    }
    
    /**
     * Obtiene los mejores jugadores del equipo
     * @private
     */
    async getTopPerformers(teamId, jornadaRange) {
        const stats = await this.getTeamStats(teamId, jornadaRange);
        const playerStats = {};
        
        // Agrupar por jugador
        stats.forEach(stat => {
            const player = stat.player;
            if (!playerStats[player]) {
                playerStats[player] = {
                    goals: 0,
                    assists: 0,
                    cards: 0,
                    totalActions: 0
                };
            }
            
            playerStats[player].totalActions++;
            
            switch (stat.action.toLowerCase()) {
                case 'gol':
                    playerStats[player].goals++;
                    break;
                case 'asistencia':
                    playerStats[player].assists++;
                    break;
                case 'tarjeta amarilla':
                case 'tarjeta roja':
                    playerStats[player].cards++;
                    break;
            }
        });
        
        // Calcular puntuación y ordenar
        const performers = Object.keys(playerStats).map(player => {
            const stats = playerStats[player];
            const score = stats.goals * 3 + stats.assists * 2 - stats.cards * 1;
            
            return {
                player: player,
                ...stats,
                score: score
            };
        });
        
        return performers.sort((a, b) => b.score - a.score).slice(0, 5);
    }
    
    /**
     * Calcula la cohesión del equipo
     * @private
     */
    calculateTeamCohesion(actionDistribution) {
        const players = Object.keys(actionDistribution);
        if (players.length < 2) return 0;
        
        // Calcular distribución de acciones
        const totalActions = players.reduce((sum, player) => {
            return sum + Object.values(actionDistribution[player]).reduce((a, b) => a + b, 0);
        }, 0);
        
        // Calcular índice de Gini invertido (más equitativo = más cohesión)
        const playerTotals = players.map(player => 
            Object.values(actionDistribution[player]).reduce((a, b) => a + b, 0)
        );
        
        const mean = totalActions / players.length;
        const variance = playerTotals.reduce((sum, total) => 
            sum + Math.pow(total - mean, 2), 0
        ) / players.length;
        
        const coefficient = Math.sqrt(variance) / mean;
        
        // Convertir a índice de cohesión (0-1, donde 1 es máxima cohesión)
        return Math.max(0, 1 - coefficient);
    }
    
    /**
     * Calcula tendencia lineal
     * @private
     */
    calculateLinearTrend(values) {
        const n = values.length;
        const x = Array.from({length: n}, (_, i) => i);
        
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = values.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        // Calcular R²
        const yMean = sumY / n;
        const ssRes = values.reduce((sum, yi, i) => {
            const predicted = slope * x[i] + intercept;
            return sum + Math.pow(yi - predicted, 2);
        }, 0);
        const ssTot = values.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
        const rSquared = 1 - (ssRes / ssTot);
        
        return {
            slope: slope,
            intercept: intercept,
            rSquared: Math.max(0, rSquared),
            direction: slope > 0.1 ? 'up' : slope < -0.1 ? 'down' : 'stable',
            projectedNext: slope * n + intercept
        };
    }
    
    /**
     * Detecta cambios significativos
     * @private
     */
    detectSignificantChanges(values, jornadas) {
        const changes = [];
        
        for (let i = 1; i < values.length; i++) {
            const prev = values[i - 1];
            const curr = values[i];
            
            if (prev > 0) {
                const change = (curr - prev) / prev;
                if (Math.abs(change) > 0.2) {
                    changes.push({
                        jornada: parseInt(jornadas[i]),
                        change: Math.round(change * 100),
                        type: change > 0 ? 'improvement' : 'decline',
                        from: prev,
                        to: curr
                    });
                }
            }
        }
        
        return changes;
    }
    
    /**
     * Retorna métricas vacías para jugador
     * @private
     */
    getEmptyPlayerMetrics(playerId) {
        return {
            playerId: playerId,
            totalGames: 0,
            totalActions: 0,
            goals: 0,
            goalsPerGame: 0,
            assists: 0,
            assistsPerGame: 0,
            yellowCards: 0,
            redCards: 0,
            fouls: 0,
            disciplinaryActionsPerGame: 0,
            efficiency: 0,
            totalMinutesPlayed: 0,
            trend: 'stable',
            goalsPerMinute: 0,
            assistsPerMinute: 0,
            calculatedAt: new Date().toISOString()
        };
    }
    
    /**
     * Retorna métricas vacías para equipo
     * @private
     */
    getEmptyTeamMetrics(teamId) {
        return {
            teamId: teamId,
            totalGames: 0,
            totalActions: 0,
            totalPlayers: 0,
            goals: 0,
            assists: 0,
            yellowCards: 0,
            redCards: 0,
            avgGoalsPerGame: 0,
            actionDistribution: {},
            performanceByJornada: {},
            topPerformers: [],
            teamCohesion: 0,
            calculatedAt: new Date().toISOString()
        };
    }
    
    /**
     * Limpia el cache de métricas
     */
    clearCache() {
        this.cache.clear();
        console.log('MetricsCalculator: Cache limpiado');
    }
    
    /**
     * Obtiene estadísticas del cache
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            timeout: this.cacheTimeout,
            keys: Array.from(this.cache.keys())
        };
    }
    
    /**
     * Calcula el ranking de mejores goleadores
     * @param {number} limit - Número máximo de jugadores a retornar
     * @param {string} range - Rango de jornadas ('all', 'current', 'last5')
     * @returns {Promise<Array>} Array de jugadores ordenados por goles
     */
    async calculateTopPlayers(limit = 5, range = 'all') {
        const cacheKey = `top_players_${limit}_${range}`;
        
        // Verificar cache
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }
        
        try {
            // Determinar rango de jornadas
            let jornadaRange = null;
            if (range === 'current') {
                const currentJornada = await this.getCurrentJornada();
                jornadaRange = { start: currentJornada, end: currentJornada };
            } else if (range === 'last5') {
                const currentJornada = await this.getCurrentJornada();
                jornadaRange = { 
                    start: Math.max(1, currentJornada - 4), 
                    end: currentJornada 
                };
            }
            
            // Obtener todas las estadísticas de goles
            const goalStats = await this.getGoalStats(jornadaRange);
            
            // Agrupar por jugador y calcular métricas
            const playerGoals = new Map();
            
            for (const stat of goalStats) {
                const playerName = stat.player;
                
                if (!playerGoals.has(playerName)) {
                    playerGoals.set(playerName, {
                        name: playerName,
                        team: stat.team,
                        goals: 0,
                        games: new Set(),
                        jornadas: new Set()
                    });
                }
                
                const player = playerGoals.get(playerName);
                player.goals++;
                player.jornadas.add(stat.jornada);
                
                // Contar juegos únicos (por jornada)
                player.games.add(stat.jornada);
            }
            
            // Convertir a array y calcular métricas adicionales
            const playersArray = Array.from(playerGoals.values()).map(player => {
                const totalGames = player.games.size;
                const goalsPerGame = totalGames > 0 ? (player.goals / totalGames) : 0;
                
                // Calcular tendencia (comparar últimas 3 jornadas vs anteriores)
                const trend = this.calculatePlayerTrend(player.name, Array.from(player.jornadas));
                
                return {
                    name: player.name,
                    team: player.team,
                    goals: player.goals,
                    games: totalGames,
                    goalsPerGame: Math.round(goalsPerGame * 100) / 100,
                    trend: trend
                };
            });
            
            // Ordenar por goles (descendente) y luego por goles por partido
            playersArray.sort((a, b) => {
                if (b.goals !== a.goals) {
                    return b.goals - a.goals;
                }
                return b.goalsPerGame - a.goalsPerGame;
            });
            
            // Limitar resultados
            const topPlayers = playersArray.slice(0, limit);
            
            // Guardar en cache
            this.cache.set(cacheKey, {
                data: topPlayers,
                timestamp: Date.now()
            });
            
            return topPlayers;
            
        } catch (error) {
            console.error('Error calculando top goleadores:', error);
            throw new Error('No se pudieron calcular las estadísticas de goleadores');
        }
    }
    
    /**
     * Obtiene estadísticas de goles filtradas por rango de jornadas
     * @param {Object} jornadaRange - Rango de jornadas
     * @returns {Promise<Array>} Estadísticas de goles
     */
    async getGoalStats(jornadaRange = null) {
        return new Promise((resolve, reject) => {
            let query = "SELECT * FROM stats WHERE LOWER(action) = 'gol'";
            const params = [];
            
            if (jornadaRange) {
                if (jornadaRange.start && jornadaRange.end) {
                    query += " AND jornada BETWEEN ? AND ?";
                    params.push(jornadaRange.start, jornadaRange.end);
                } else if (jornadaRange.start) {
                    query += " AND jornada >= ?";
                    params.push(jornadaRange.start);
                } else if (jornadaRange.end) {
                    query += " AND jornada <= ?";
                    params.push(jornadaRange.end);
                }
            }
            
            query += " ORDER BY jornada DESC, id DESC";
            
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }
    
    /**
     * Obtiene la jornada actual (la más alta en la base de datos)
     * @returns {Promise<number>} Número de jornada actual
     */
    async getCurrentJornada() {
        return new Promise((resolve, reject) => {
            const query = "SELECT MAX(jornada) as maxJornada FROM stats";
            
            this.db.get(query, [], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row?.maxJornada || 1);
                }
            });
        });
    }
    
    /**
     * Calcula la tendencia de un jugador basada en sus jornadas
     * @param {string} playerName - Nombre del jugador
     * @param {Array} jornadas - Array de jornadas donde anotó
     * @returns {string} Tendencia: 'improving', 'declining', 'stable'
     */
    calculatePlayerTrend(playerName, jornadas) {
        if (jornadas.length < 3) {
            return 'stable'; // No hay suficientes datos
        }
        
        // Ordenar jornadas
        jornadas.sort((a, b) => a - b);
        
        // Dividir en dos mitades para comparar
        const midPoint = Math.floor(jornadas.length / 2);
        const firstHalf = jornadas.slice(0, midPoint);
        const secondHalf = jornadas.slice(midPoint);
        
        // Calcular frecuencia de goles por jornada en cada mitad
        const firstHalfFreq = firstHalf.length / (Math.max(...firstHalf) - Math.min(...firstHalf) + 1);
        const secondHalfFreq = secondHalf.length / (Math.max(...secondHalf) - Math.min(...secondHalf) + 1);
        
        // Determinar tendencia
        const improvement = (secondHalfFreq - firstHalfFreq) / firstHalfFreq;
        
        if (improvement > 0.2) {
            return 'improving';
        } else if (improvement < -0.2) {
            return 'declining';
        } else {
            return 'stable';
        }
    }}


module.exports = MetricsCalculator;