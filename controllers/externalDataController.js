const ExternalDataManager = require('../services/external/ExternalDataManager');
const { getProviderConfig, validateConfig } = require('../config/external-apis');

/**
 * Controlador para gestionar datos externos con failover automático
 */

// Instancia del manager principal
let externalDataManager = null;
let isInitialized = false;

/**
 * Inicializa el ExternalDataManager con todos los proveedores
 */
async function initializeManager() {
    if (!externalDataManager) {
        externalDataManager = new ExternalDataManager({
            selectionStrategy: 'priority',
            maxRetries: 2,
            retryDelay: 1000,
            healthCheckInterval: 30000
        });
    }
    
    if (!isInitialized) {
        const footballDataConfig = getProviderConfig('footballData');
        
        if (footballDataConfig && footballDataConfig.enabled) {
            await externalDataManager.initialize({
                footballData: footballDataConfig
            });
            isInitialized = true;
        }
    }
    
    return externalDataManager;
}

/**
 * Obtiene el estado de salud completo del sistema con failover
 */
exports.getHealthStatus = async (req, res) => {
    try {
        const validation = validateConfig();
        const manager = await initializeManager();
        
        const health = await manager.getHealthStatus();
        const stats = manager.getStats();
        
        const status = {
            timestamp: new Date().toISOString(),
            configValid: validation.isValid,
            errors: validation.errors,
            warnings: validation.warnings,
            system: health,
            statistics: stats
        };
        
        res.json({
            success: true,
            data: status
        });
        
    } catch (error) {
        console.error('Error obteniendo estado de salud del sistema:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Prueba la conectividad del sistema completo con health checks
 */
exports.testConnection = async (req, res) => {
    try {
        const manager = await initializeManager();
        
        if (!manager || !manager.isInitialized) {
            return res.status(400).json({
                success: false,
                error: 'Sistema no inicializado',
                message: 'ExternalDataManager no está configurado. Verifica la configuración.',
                timestamp: new Date().toISOString()
            });
        }
        
        // Forzar health check de todos los proveedores
        const healthResults = await manager.gateway.forceHealthCheck();
        const healthyProviders = healthResults.filter(result => result.isHealthy);
        
        if (healthyProviders.length > 0) {
            res.json({
                success: true,
                message: `Conexión exitosa - ${healthyProviders.length} proveedor(es) disponible(s)`,
                healthyProviders: healthyProviders.length,
                totalProviders: healthResults.length,
                providers: healthResults,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(503).json({
                success: false,
                error: 'Sin proveedores disponibles',
                message: 'No hay proveedores saludables disponibles',
                providers: healthResults,
                timestamp: new Date().toISOString()
            });
        }
        
    } catch (error) {
        console.error('Error probando conectividad del sistema:', error);
        res.status(500).json({
            success: false,
            error: 'Error de conectividad',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Obtiene equipos de LaLiga con failover automático
 */
exports.getExternalTeams = async (req, res) => {
    try {
        const { forceRefresh } = req.query;
        const manager = await initializeManager();
        
        if (!manager || !manager.isInitialized) {
            return res.status(400).json({
                success: false,
                error: 'Sistema no inicializado',
                timestamp: new Date().toISOString()
            });
        }
        
        const teams = await manager.getTeams({
            forceRefresh: forceRefresh === 'true'
        });
        
        const stats = manager.getStats();
        
        res.json({
            success: true,
            data: teams,
            metadata: {
                source: 'ExternalDataManager',
                competition: 'LaLiga',
                timestamp: new Date().toISOString(),
                count: teams.length,
                cache: {
                    hitRate: stats.manager.cacheHitRate,
                    totalRequests: stats.manager.totalRequests
                },
                gateway: {
                    providersHealthy: stats.gateway.providersHealthy,
                    successRate: stats.gateway.successRate
                }
            }
        });
        
    } catch (error) {
        console.error('Error obteniendo equipos externos:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo equipos',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Obtiene jugadores de un equipo específico con failover automático
 */
exports.getExternalPlayers = async (req, res) => {
    try {
        const { teamId } = req.params;
        const { forceRefresh } = req.query;
        
        if (!teamId) {
            return res.status(400).json({
                success: false,
                error: 'ID de equipo requerido',
                timestamp: new Date().toISOString()
            });
        }
        
        const manager = await initializeManager();
        
        if (!manager || !manager.isInitialized) {
            return res.status(400).json({
                success: false,
                error: 'Sistema no inicializado',
                timestamp: new Date().toISOString()
            });
        }
        
        const players = await manager.getTeamPlayers(parseInt(teamId), {
            forceRefresh: forceRefresh === 'true'
        });
        
        const stats = manager.getStats();
        
        res.json({
            success: true,
            data: players,
            metadata: {
                source: 'ExternalDataManager',
                teamId: parseInt(teamId),
                timestamp: new Date().toISOString(),
                count: players.length,
                cache: {
                    hitRate: stats.manager.cacheHitRate,
                    totalRequests: stats.manager.totalRequests
                },
                gateway: {
                    providersHealthy: stats.gateway.providersHealthy,
                    successRate: stats.gateway.successRate
                }
            }
        });
        
    } catch (error) {
        console.error(`Error obteniendo jugadores del equipo ${req.params.teamId}:`, error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo jugadores',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Obtiene partidos de LaLiga con failover automático
 */
exports.getExternalMatches = async (req, res) => {
    try {
        const { matchday, status, dateFrom, dateTo, forceRefresh } = req.query;
        const manager = await initializeManager();
        
        if (!manager || !manager.isInitialized) {
            return res.status(400).json({
                success: false,
                error: 'Sistema no inicializado',
                timestamp: new Date().toISOString()
            });
        }
        
        const matches = await manager.getMatches({
            matchday: matchday ? parseInt(matchday) : undefined,
            status,
            dateFrom,
            dateTo,
            forceRefresh: forceRefresh === 'true'
        });
        
        const stats = manager.getStats();
        
        res.json({
            success: true,
            data: matches,
            metadata: {
                source: 'ExternalDataManager',
                competition: 'LaLiga',
                timestamp: new Date().toISOString(),
                count: matches.length,
                filters: { matchday, status, dateFrom, dateTo },
                cache: {
                    hitRate: stats.manager.cacheHitRate,
                    totalRequests: stats.manager.totalRequests
                },
                gateway: {
                    providersHealthy: stats.gateway.providersHealthy,
                    successRate: stats.gateway.successRate
                }
            }
        });
        
    } catch (error) {
        console.error('Error obteniendo partidos externos:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo partidos',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Obtiene partidos en vivo con alta prioridad y failover automático
 */
exports.getLiveMatches = async (req, res) => {
    try {
        const manager = await initializeManager();
        
        if (!manager || !manager.isInitialized) {
            return res.status(400).json({
                success: false,
                error: 'Sistema no inicializado',
                timestamp: new Date().toISOString()
            });
        }
        
        const liveMatches = await manager.getLiveMatches();
        
        res.json({
            success: true,
            data: liveMatches,
            metadata: {
                source: 'ExternalDataManager',
                timestamp: new Date().toISOString(),
                count: liveMatches.length,
                isLive: liveMatches.length > 0,
                priority: 'high'
            }
        });
        
    } catch (error) {
        console.error('Error obteniendo partidos en vivo:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo partidos en vivo',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Obtiene la clasificación de LaLiga con failover automático
 */
exports.getExternalStandings = async (req, res) => {
    try {
        const { forceRefresh } = req.query;
        const manager = await initializeManager();
        
        if (!manager || !manager.isInitialized) {
            return res.status(400).json({
                success: false,
                error: 'Sistema no inicializado',
                timestamp: new Date().toISOString()
            });
        }
        
        const standings = await manager.getStandings({
            forceRefresh: forceRefresh === 'true'
        });
        
        const stats = manager.getStats();
        
        res.json({
            success: true,
            data: standings,
            metadata: {
                source: 'ExternalDataManager',
                competition: 'LaLiga',
                timestamp: new Date().toISOString(),
                count: standings.length,
                cache: {
                    hitRate: stats.manager.cacheHitRate,
                    totalRequests: stats.manager.totalRequests
                },
                gateway: {
                    providersHealthy: stats.gateway.providersHealthy,
                    successRate: stats.gateway.successRate
                }
            }
        });
        
    } catch (error) {
        console.error('Error obteniendo clasificación externa:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo clasificación',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Fuerza un refresh de datos específicos
 */
exports.forceRefresh = async (req, res) => {
    try {
        const { dataType } = req.params;
        const validTypes = ['teams', 'matches', 'standings', 'all'];
        
        if (!validTypes.includes(dataType)) {
            return res.status(400).json({
                success: false,
                error: `Tipo de dato inválido. Válidos: ${validTypes.join(', ')}`,
                timestamp: new Date().toISOString()
            });
        }
        
        const manager = await initializeManager();
        
        if (!manager || !manager.isInitialized) {
            return res.status(400).json({
                success: false,
                error: 'Sistema no inicializado',
                timestamp: new Date().toISOString()
            });
        }
        
        console.log(`Forzando refresh de ${dataType}...`);
        
        const result = await manager.forceRefresh(dataType, req.query);
        
        res.json({
            success: true,
            message: `Refresh de ${dataType} completado`,
            data: result,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error en force refresh:', error);
        res.status(500).json({
            success: false,
            error: 'Error forzando refresh de datos',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Obtiene información detallada del sistema y proveedores
 */
exports.getProvidersInfo = async (req, res) => {
    try {
        const manager = await initializeManager();
        
        if (!manager || !manager.isInitialized) {
            return res.status(400).json({
                success: false,
                error: 'Sistema no inicializado',
                timestamp: new Date().toISOString()
            });
        }
        
        const health = await manager.getHealthStatus();
        const stats = manager.getStats();
        
        res.json({
            success: true,
            data: {
                system: {
                    name: 'ExternalDataManager',
                    initialized: manager.isInitialized,
                    strategy: stats.gateway.currentStrategy,
                    uptime: stats.gateway.uptime
                },
                providers: health.providers,
                gateway: {
                    totalProviders: stats.gateway.providersRegistered,
                    healthyProviders: stats.gateway.providersHealthy,
                    successRate: stats.gateway.successRate,
                    totalRequests: stats.gateway.totalRequests,
                    failoverCount: stats.gateway.failoverCount
                },
                cache: {
                    size: stats.cache.size,
                    hitRate: stats.cache.hitRate,
                    config: stats.cache.config
                }
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error obteniendo información del sistema:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Limpia el cache del sistema
 */
exports.clearCache = async (req, res) => {
    try {
        const manager = await initializeManager();
        
        if (!manager || !manager.isInitialized) {
            return res.status(400).json({
                success: false,
                error: 'Sistema no inicializado',
                timestamp: new Date().toISOString()
            });
        }
        
        manager.clearCache();
        
        res.json({
            success: true,
            message: 'Cache limpiado correctamente',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error limpiando cache:', error);
        res.status(500).json({
            success: false,
            error: 'Error limpiando cache',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Obtiene estadísticas detalladas del sistema
 */
exports.getStats = async (req, res) => {
    try {
        const manager = await initializeManager();
        
        if (!manager || !manager.isInitialized) {
            return res.status(400).json({
                success: false,
                error: 'Sistema no inicializado',
                timestamp: new Date().toISOString()
            });
        }
        
        const stats = manager.getStats();
        
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo estadísticas del sistema',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};