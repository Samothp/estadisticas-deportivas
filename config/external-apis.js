/**
 * Configuración para APIs externas
 * Gestiona credenciales y configuraciones de proveedores de datos
 */

// Cargar variables de entorno
require('dotenv').config();

const config = {
    // Football-Data.org configuration
    footballData: {
        apiKey: process.env.FOOTBALL_DATA_API_KEY || 'YOUR_API_KEY_HERE',
        enabled: process.env.FOOTBALL_DATA_ENABLED !== 'false',
        priority: 1, // Proveedor principal
        rateLimit: {
            requests: process.env.NODE_ENV === 'production' ? 100 : 10, // Más requests en producción
            window: 60000 // 1 minuto
        },
        timeout: 15000,
        retryAttempts: 3,
        retryDelay: 2000
    },
    
    // API-Sports configuration (para futuro)
    apiSports: {
        apiKey: process.env.API_SPORTS_KEY || '',
        enabled: false, // Deshabilitado por ahora
        priority: 2,
        rateLimit: {
            requests: 100,
            window: 86400000 // 24 horas
        }
    },
    
    // Configuración general
    general: {
        // Proveedor por defecto
        defaultProvider: 'footballData',
        
        // Configuración de failover
        enableFailover: true,
        failoverTimeout: 30000, // 30 segundos
        
        // Configuración de cache
        cache: {
            enabled: true,
            defaultTTL: {
                teams: 24 * 60 * 60 * 1000,      // 24 horas
                players: 12 * 60 * 60 * 1000,    // 12 horas
                matches: 60 * 60 * 1000,         // 1 hora
                liveMatches: 5 * 60 * 1000,      // 5 minutos
                standings: 60 * 60 * 1000,       // 1 hora
                events: 10 * 60 * 1000           // 10 minutos
            }
        },
        
        // Configuración de sincronización
        sync: {
            enabled: true,
            intervals: {
                teams: '0 2 * * *',        // Diario a las 2 AM
                players: '0 */12 * * *',   // Cada 12 horas
                matches: '0 */6 * * *',    // Cada 6 horas
                liveMatches: '*/5 * * * *', // Cada 5 minutos (solo en días de partido)
                standings: '0 * * * *'     // Cada hora
            },
            
            // Configuración específica de LaLiga
            laliga: {
                competitionId: 'PD',
                season: '2024',
                enabled: true
            }
        },
        
        // Configuración de logging y monitoreo
        monitoring: {
            enabled: true,
            logLevel: process.env.LOG_LEVEL || 'info',
            alertThresholds: {
                errorRate: 0.1,        // 10% de errores
                responseTime: 5000,    // 5 segundos
                failureCount: 5        // 5 fallos consecutivos
            },
            
            // Configuración de alertas (para futuro)
            alerts: {
                email: {
                    enabled: false,
                    recipients: []
                },
                webhook: {
                    enabled: false,
                    url: ''
                }
            }
        }
    }
};

/**
 * Valida la configuración de APIs externas
 * @returns {Object} Resultado de la validación
 */
function validateConfig() {
    const errors = [];
    const warnings = [];
    
    // Validar Football-Data.org
    if (config.footballData.enabled) {
        if (!config.footballData.apiKey || config.footballData.apiKey === 'YOUR_API_KEY_HERE') {
            errors.push('Football-Data.org API key no configurada. Configura FOOTBALL_DATA_API_KEY en variables de entorno.');
        }
        
        if (config.footballData.rateLimit.requests > 10 && process.env.NODE_ENV !== 'production') {
            warnings.push('Rate limit alto para Football-Data.org en desarrollo. Considera usar plan de pago.');
        }
    }
    
    // Validar configuración general
    if (!config.general.cache.enabled) {
        warnings.push('Cache deshabilitado. Esto puede resultar en mayor uso de API y costos.');
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Obtiene la configuración de un proveedor específico
 * @param {string} providerName - Nombre del proveedor
 * @returns {Object|null} Configuración del proveedor
 */
function getProviderConfig(providerName) {
    const providerConfigs = {
        footballData: config.footballData,
        apiSports: config.apiSports
    };
    
    return providerConfigs[providerName] || null;
}

/**
 * Obtiene la lista de proveedores habilitados ordenados por prioridad
 * @returns {Array} Lista de proveedores habilitados
 */
function getEnabledProviders() {
    const providers = [];
    
    if (config.footballData.enabled) {
        providers.push({
            name: 'footballData',
            priority: config.footballData.priority,
            config: config.footballData
        });
    }
    
    if (config.apiSports.enabled) {
        providers.push({
            name: 'apiSports',
            priority: config.apiSports.priority,
            config: config.apiSports
        });
    }
    
    // Ordenar por prioridad (menor número = mayor prioridad)
    return providers.sort((a, b) => a.priority - b.priority);
}

/**
 * Obtiene configuración de cache para un tipo de dato
 * @param {string} dataType - Tipo de dato (teams, players, matches, etc.)
 * @returns {number} TTL en milisegundos
 */
function getCacheTTL(dataType) {
    return config.general.cache.defaultTTL[dataType] || 60 * 60 * 1000; // 1 hora por defecto
}

/**
 * Verifica si la sincronización está habilitada
 * @returns {boolean} True si está habilitada
 */
function isSyncEnabled() {
    return config.general.sync.enabled;
}

/**
 * Obtiene el intervalo de sincronización para un tipo de dato
 * @param {string} dataType - Tipo de dato
 * @returns {string} Expresión cron
 */
function getSyncInterval(dataType) {
    return config.general.sync.intervals[dataType];
}

module.exports = {
    config,
    validateConfig,
    getProviderConfig,
    getEnabledProviders,
    getCacheTTL,
    isSyncEnabled,
    getSyncInterval
};