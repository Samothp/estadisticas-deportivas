const db = require('../database');
const MetricsCalculator = require('../services/MetricsCalculator');

// Inicializar el calculador de métricas
const metricsCalculator = new MetricsCalculator(db);

/**
 * Obtiene métricas de un jugador específico
 */
exports.getPlayerMetrics = async (req, res) => {
    try {
        const { id } = req.params;
        const { startJornada, endJornada } = req.query;
        
        // Validar parámetros
        if (!id || typeof id !== 'string' || id.trim() === '') {
            return res.status(400).json({
                error: 'ID de jugador inválido',
                message: 'El ID del jugador es requerido y debe ser una cadena válida'
            });
        }
        
        // Construir rango de jornadas si se proporciona
        let jornadaRange = null;
        if (startJornada || endJornada) {
            const start = startJornada ? parseInt(startJornada) : null;
            const end = endJornada ? parseInt(endJornada) : null;
            
            if ((start && isNaN(start)) || (end && isNaN(end))) {
                return res.status(400).json({
                    error: 'Rango de jornadas inválido',
                    message: 'Las jornadas deben ser números enteros'
                });
            }
            
            if (start && end && start > end) {
                return res.status(400).json({
                    error: 'Rango de jornadas inválido',
                    message: 'La jornada de inicio no puede ser mayor que la de fin'
                });
            }
            
            jornadaRange = { start, end };
        }
        
        // Calcular métricas
        const metrics = await metricsCalculator.calculatePlayerMetrics(id.trim(), jornadaRange);
        
        res.json({
            success: true,
            data: metrics,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error obteniendo métricas de jugador:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudieron calcular las métricas del jugador',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Obtiene métricas de un equipo específico
 */
exports.getTeamMetrics = async (req, res) => {
    try {
        const { team } = req.params;
        const { startJornada, endJornada } = req.query;
        
        // Validar parámetros
        if (!team || typeof team !== 'string' || team.trim() === '') {
            return res.status(400).json({
                error: 'Nombre de equipo inválido',
                message: 'El nombre del equipo es requerido y debe ser una cadena válida'
            });
        }
        
        // Construir rango de jornadas
        let jornadaRange = null;
        if (startJornada || endJornada) {
            const start = startJornada ? parseInt(startJornada) : null;
            const end = endJornada ? parseInt(endJornada) : null;
            
            if ((start && isNaN(start)) || (end && isNaN(end))) {
                return res.status(400).json({
                    error: 'Rango de jornadas inválido',
                    message: 'Las jornadas deben ser números enteros'
                });
            }
            
            if (start && end && start > end) {
                return res.status(400).json({
                    error: 'Rango de jornadas inválido',
                    message: 'La jornada de inicio no puede ser mayor que la de fin'
                });
            }
            
            jornadaRange = { start, end };
        }
        
        // Calcular métricas
        const metrics = await metricsCalculator.calculateTeamMetrics(team.trim(), jornadaRange);
        
        res.json({
            success: true,
            data: metrics,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error obteniendo métricas de equipo:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudieron calcular las métricas del equipo',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Obtiene análisis de tendencias
 */
exports.getTrends = async (req, res) => {
    try {
        const { entityId, entityType, metric, startJornada, endJornada } = req.query;
        
        // Validar parámetros requeridos
        if (!entityId || typeof entityId !== 'string' || entityId.trim() === '') {
            return res.status(400).json({
                error: 'ID de entidad inválido',
                message: 'El ID de la entidad (jugador o equipo) es requerido'
            });
        }
        
        if (!entityType || !['player', 'team'].includes(entityType)) {
            return res.status(400).json({
                error: 'Tipo de entidad inválido',
                message: 'El tipo de entidad debe ser "player" o "team"'
            });
        }
        
        if (!metric || typeof metric !== 'string' || metric.trim() === '') {
            return res.status(400).json({
                error: 'Métrica inválida',
                message: 'La métrica a analizar es requerida'
            });
        }
        
        // Construir rango de jornadas
        let jornadaRange = null;
        if (startJornada || endJornada) {
            const start = startJornada ? parseInt(startJornada) : null;
            const end = endJornada ? parseInt(endJornada) : null;
            
            if ((start && isNaN(start)) || (end && isNaN(end))) {
                return res.status(400).json({
                    error: 'Rango de jornadas inválido',
                    message: 'Las jornadas deben ser números enteros'
                });
            }
            
            if (start && end && start > end) {
                return res.status(400).json({
                    error: 'Rango de jornadas inválido',
                    message: 'La jornada de inicio no puede ser mayor que la de fin'
                });
            }
            
            jornadaRange = { start, end };
        }
        
        // Analizar tendencias
        const trends = await metricsCalculator.analyzeTrends(
            entityId.trim(),
            entityType,
            metric.trim(),
            jornadaRange
        );
        
        res.json({
            success: true,
            data: {
                entityId: entityId.trim(),
                entityType: entityType,
                metric: metric.trim(),
                analysis: trends,
                jornadaRange: jornadaRange
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error analizando tendencias:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo realizar el análisis de tendencias',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Obtiene lista de jugadores disponibles
 */
exports.getAvailablePlayers = (req, res) => {
    const sql = "SELECT DISTINCT player FROM stats WHERE player IS NOT NULL ORDER BY player";
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error obteniendo jugadores:', err);
            return res.status(500).json({
                error: 'Error interno del servidor',
                message: 'No se pudo obtener la lista de jugadores'
            });
        }
        
        const players = rows.map(row => row.player);
        
        res.json({
            success: true,
            data: players,
            count: players.length,
            timestamp: new Date().toISOString()
        });
    });
};

/**
 * Obtiene lista de equipos disponibles
 */
exports.getAvailableTeams = (req, res) => {
    const sql = "SELECT DISTINCT team FROM stats WHERE team IS NOT NULL ORDER BY team";
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error obteniendo equipos:', err);
            return res.status(500).json({
                error: 'Error interno del servidor',
                message: 'No se pudo obtener la lista de equipos'
            });
        }
        
        const teams = rows.map(row => row.team);
        
        res.json({
            success: true,
            data: teams,
            count: teams.length,
            timestamp: new Date().toISOString()
        });
    });
};

/**
 * Obtiene métricas globales del sistema
 */
exports.getGlobalMetrics = async (req, res) => {
    try {
        const { startJornada, endJornada } = req.query;
        
        // Construir rango de jornadas
        let jornadaRange = null;
        if (startJornada || endJornada) {
            const start = startJornada ? parseInt(startJornada) : null;
            const end = endJornada ? parseInt(endJornada) : null;
            
            if ((start && isNaN(start)) || (end && isNaN(end))) {
                return res.status(400).json({
                    error: 'Rango de jornadas inválido',
                    message: 'Las jornadas deben ser números enteros'
                });
            }
            
            jornadaRange = { start, end };
        }
        
        // Obtener estadísticas globales
        const globalStats = await getGlobalStats(jornadaRange);
        
        res.json({
            success: true,
            data: globalStats,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error obteniendo métricas globales:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudieron obtener las métricas globales',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Limpia el cache de métricas
 */
exports.clearCache = (req, res) => {
    try {
        const cacheStats = metricsCalculator.getCacheStats();
        metricsCalculator.clearCache();
        
        res.json({
            success: true,
            message: 'Cache limpiado correctamente',
            previousCacheStats: cacheStats,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error limpiando cache:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo limpiar el cache'
        });
    }
};

/**
 * Obtiene estadísticas del cache
 */
exports.getCacheStats = (req, res) => {
    try {
        const cacheStats = metricsCalculator.getCacheStats();
        
        res.json({
            success: true,
            data: cacheStats,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error obteniendo estadísticas del cache:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudieron obtener las estadísticas del cache'
        });
    }
};

/**
 * Función auxiliar para obtener estadísticas globales
 * @private
 */
async function getGlobalStats(jornadaRange) {
    return new Promise((resolve, reject) => {
        let sql = "SELECT * FROM stats";
        const params = [];
        
        if (jornadaRange && jornadaRange.start && jornadaRange.end) {
            sql += " WHERE jornada BETWEEN ? AND ?";
            params.push(jornadaRange.start, jornadaRange.end);
        }
        
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            
            const stats = rows || [];
            
            // Calcular estadísticas globales
            const totalActions = stats.length;
            const totalPlayers = new Set(stats.map(s => s.player)).size;
            const totalTeams = new Set(stats.filter(s => s.team).map(s => s.team)).size;
            const totalJornadas = new Set(stats.map(s => s.jornada)).size;
            
            const goals = stats.filter(s => s.action.toLowerCase() === 'gol').length;
            const assists = stats.filter(s => s.action.toLowerCase() === 'asistencia').length;
            const yellowCards = stats.filter(s => s.action.toLowerCase() === 'tarjeta amarilla').length;
            const redCards = stats.filter(s => s.action.toLowerCase() === 'tarjeta roja').length;
            
            // Promedios
            const avgGoalsPerJornada = totalJornadas > 0 ? goals / totalJornadas : 0;
            const avgActionsPerPlayer = totalPlayers > 0 ? totalActions / totalPlayers : 0;
            
            // Distribución por tipo de acción
            const actionDistribution = {};
            stats.forEach(stat => {
                const action = stat.action;
                actionDistribution[action] = (actionDistribution[action] || 0) + 1;
            });
            
            resolve({
                totalActions,
                totalPlayers,
                totalTeams,
                totalJornadas,
                goals,
                assists,
                yellowCards,
                redCards,
                avgGoalsPerJornada: Math.round(avgGoalsPerJornada * 100) / 100,
                avgActionsPerPlayer: Math.round(avgActionsPerPlayer * 100) / 100,
                actionDistribution,
                jornadaRange
            });
        });
    });
};

/**
 * Obtiene el ranking de mejores goleadores
 */
exports.getTopPlayers = async (req, res) => {
    try {
        const { limit = 5, range = 'all' } = req.query;
        
        // Validar parámetros
        const limitNum = parseInt(limit);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
            return res.status(400).json({
                error: 'Límite inválido',
                message: 'El límite debe ser un número entre 1 y 50'
            });
        }
        
        const validRanges = ['all', 'current', 'last5'];
        if (!validRanges.includes(range)) {
            return res.status(400).json({
                error: 'Rango inválido',
                message: 'El rango debe ser: all, current, o last5'
            });
        }
        
        // Calcular ranking de goleadores
        const topPlayers = await metricsCalculator.calculateTopPlayers(limitNum, range);
        
        res.json({
            success: true,
            data: topPlayers,
            metadata: {
                limit: limitNum,
                range: range,
                timestamp: new Date().toISOString(),
                count: topPlayers.length
            }
        });
        
    } catch (error) {
        console.error('Error obteniendo top goleadores:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudieron obtener los datos de goleadores',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};