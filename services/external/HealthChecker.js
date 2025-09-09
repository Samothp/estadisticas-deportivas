/**
 * HealthChecker - Sistema de monitoreo de salud para proveedores de API
 * Realiza health checks periódicos y mantiene estado de disponibilidad
 */
class HealthChecker {
    constructor(config = {}) {
        this.checkInterval = config.checkInterval || 30000; // 30 segundos
        this.timeout = config.timeout || 5000; // 5 segundos
        this.maxRetries = config.maxRetries || 3;
        this.providers = new Map();
        this.isRunning = false;
        this.intervalId = null;
        
        // Callbacks para eventos
        this.onHealthChange = config.onHealthChange || (() => {});
        this.onProviderDown = config.onProviderDown || (() => {});
        this.onProviderUp = config.onProviderUp || (() => {});
        
        console.log('HealthChecker inicializado con intervalo de', this.checkInterval, 'ms');
    }

    /**
     * Registra un proveedor para monitoreo
     * @param {string} name - Nombre del proveedor
     * @param {Object} provider - Instancia del proveedor
     * @param {Object} config - Configuración específica del proveedor
     */
    registerProvider(name, provider, config = {}) {
        const providerConfig = {
            provider,
            name,
            isHealthy: true,
            lastCheck: null,
            lastSuccess: null,
            lastFailure: null,
            consecutiveFailures: 0,
            totalChecks: 0,
            totalFailures: 0,
            averageResponseTime: 0,
            healthEndpoint: config.healthEndpoint || '/health',
            customHealthCheck: config.customHealthCheck || null,
            priority: config.priority || 1, // 1 = alta, 2 = media, 3 = baja
            maxConsecutiveFailures: config.maxConsecutiveFailures || 3,
            ...config
        };

        this.providers.set(name, providerConfig);
        console.log(`Proveedor ${name} registrado para health checking (prioridad: ${providerConfig.priority})`);
        
        // Realizar check inicial
        this.checkProvider(name);
    }

    /**
     * Inicia el monitoreo periódico
     */
    start() {
        if (this.isRunning) {
            console.warn('HealthChecker ya está ejecutándose');
            return;
        }

        this.isRunning = true;
        this.intervalId = setInterval(() => {
            this.checkAllProviders();
        }, this.checkInterval);

        console.log('HealthChecker iniciado');
        
        // Check inicial inmediato
        this.checkAllProviders();
    }

    /**
     * Detiene el monitoreo
     */
    stop() {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        console.log('HealthChecker detenido');
    }

    /**
     * Verifica la salud de todos los proveedores
     */
    async checkAllProviders() {
        const promises = Array.from(this.providers.keys()).map(name => 
            this.checkProvider(name).catch(error => {
                console.error(`Error en health check de ${name}:`, error.message);
            })
        );

        await Promise.allSettled(promises);
    }

    /**
     * Verifica la salud de un proveedor específico
     * @param {string} name - Nombre del proveedor
     * @returns {Promise<Object>} Resultado del health check
     */
    async checkProvider(name) {
        const config = this.providers.get(name);
        if (!config) {
            throw new Error(`Proveedor ${name} no encontrado`);
        }

        const startTime = Date.now();
        let isHealthy = false;
        let error = null;

        try {
            // Usar health check personalizado si está disponible
            if (config.customHealthCheck) {
                isHealthy = await config.customHealthCheck(config.provider);
            } else {
                // Health check por defecto usando el método getHealthStatus
                const healthStatus = config.provider.getHealthStatus();
                isHealthy = healthStatus.isHealthy && config.provider.isHealthy;
                
                // Verificar también conectividad básica si es posible
                if (isHealthy && config.provider.makeRequest) {
                    try {
                        // Intentar una petición simple para verificar conectividad
                        await Promise.race([
                            config.provider.makeRequest(config.healthEndpoint, { 
                                method: 'GET',
                                priority: 'high',
                                cost: 0 // No consumir quota para health checks
                            }),
                            new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('Health check timeout')), this.timeout)
                            )
                        ]);
                    } catch (healthError) {
                        // Si falla la petición de health, marcar como no saludable
                        isHealthy = false;
                        error = healthError;
                    }
                }
            }
        } catch (checkError) {
            isHealthy = false;
            error = checkError;
        }

        const responseTime = Date.now() - startTime;
        const wasHealthy = config.isHealthy;

        // Actualizar estadísticas
        config.lastCheck = Date.now();
        config.totalChecks++;
        
        // Actualizar tiempo de respuesta promedio
        if (config.averageResponseTime === 0) {
            config.averageResponseTime = responseTime;
        } else {
            config.averageResponseTime = (config.averageResponseTime * 0.8) + (responseTime * 0.2);
        }

        if (isHealthy) {
            config.lastSuccess = Date.now();
            config.consecutiveFailures = 0;
            
            // Si estaba down y ahora está up, notificar
            if (!wasHealthy) {
                console.log(`✅ Proveedor ${name} recuperado (${responseTime}ms)`);
                this.onProviderUp(name, config);
            }
        } else {
            config.lastFailure = Date.now();
            config.consecutiveFailures++;
            config.totalFailures++;
            
            console.warn(`❌ Health check falló para ${name}: ${error?.message || 'Unknown error'} (${responseTime}ms)`);
            
            // Si supera el límite de fallos consecutivos, marcar como no saludable
            if (config.consecutiveFailures >= config.maxConsecutiveFailures && wasHealthy) {
                console.error(`🚨 Proveedor ${name} marcado como no saludable después de ${config.consecutiveFailures} fallos consecutivos`);
                this.onProviderDown(name, config, error);
            }
        }

        // Actualizar estado de salud
        const newHealthy = config.consecutiveFailures < config.maxConsecutiveFailures;
        if (config.isHealthy !== newHealthy) {
            config.isHealthy = newHealthy;
            this.onHealthChange(name, newHealthy, config);
        }

        const result = {
            name,
            isHealthy: config.isHealthy,
            responseTime,
            error: error?.message || null,
            consecutiveFailures: config.consecutiveFailures,
            lastCheck: config.lastCheck
        };

        return result;
    }

    /**
     * Obtiene el estado de salud de un proveedor
     * @param {string} name - Nombre del proveedor
     * @returns {Object} Estado de salud
     */
    getProviderHealth(name) {
        const config = this.providers.get(name);
        if (!config) {
            return null;
        }

        return {
            name: config.name,
            isHealthy: config.isHealthy,
            priority: config.priority,
            lastCheck: config.lastCheck,
            lastSuccess: config.lastSuccess,
            lastFailure: config.lastFailure,
            consecutiveFailures: config.consecutiveFailures,
            totalChecks: config.totalChecks,
            totalFailures: config.totalFailures,
            successRate: config.totalChecks > 0 ? 
                ((config.totalChecks - config.totalFailures) / config.totalChecks * 100).toFixed(2) : 0,
            averageResponseTime: Math.round(config.averageResponseTime),
            uptime: this.calculateUptime(config)
        };
    }

    /**
     * Obtiene todos los proveedores saludables ordenados por prioridad
     * @returns {Array} Lista de proveedores saludables
     */
    getHealthyProviders() {
        return Array.from(this.providers.entries())
            .filter(([_, config]) => config.isHealthy)
            .sort(([_, a], [__, b]) => a.priority - b.priority)
            .map(([name, config]) => ({
                name,
                priority: config.priority,
                provider: config.provider,
                averageResponseTime: config.averageResponseTime,
                successRate: config.totalChecks > 0 ? 
                    ((config.totalChecks - config.totalFailures) / config.totalChecks * 100) : 100
            }));
    }

    /**
     * Obtiene el mejor proveedor disponible
     * @returns {Object|null} Mejor proveedor o null si ninguno está disponible
     */
    getBestProvider() {
        const healthyProviders = this.getHealthyProviders();
        return healthyProviders.length > 0 ? healthyProviders[0] : null;
    }

    /**
     * Obtiene estadísticas generales de salud
     * @returns {Object} Estadísticas generales
     */
    getOverallHealth() {
        const providers = Array.from(this.providers.values());
        const totalProviders = providers.length;
        const healthyProviders = providers.filter(p => p.isHealthy).length;
        const totalChecks = providers.reduce((sum, p) => sum + p.totalChecks, 0);
        const totalFailures = providers.reduce((sum, p) => sum + p.totalFailures, 0);

        return {
            totalProviders,
            healthyProviders,
            unhealthyProviders: totalProviders - healthyProviders,
            overallHealthPercentage: totalProviders > 0 ? 
                (healthyProviders / totalProviders * 100).toFixed(2) : 0,
            totalChecks,
            totalFailures,
            overallSuccessRate: totalChecks > 0 ? 
                ((totalChecks - totalFailures) / totalChecks * 100).toFixed(2) : 0,
            averageResponseTime: this.calculateOverallAverageResponseTime(),
            isRunning: this.isRunning,
            checkInterval: this.checkInterval
        };
    }

    /**
     * Calcula el uptime de un proveedor
     * @param {Object} config - Configuración del proveedor
     * @returns {number} Porcentaje de uptime
     */
    calculateUptime(config) {
        if (config.totalChecks === 0) return 100;
        const successfulChecks = config.totalChecks - config.totalFailures;
        return (successfulChecks / config.totalChecks * 100).toFixed(2);
    }

    /**
     * Calcula el tiempo de respuesta promedio general
     * @returns {number} Tiempo promedio en ms
     */
    calculateOverallAverageResponseTime() {
        const providers = Array.from(this.providers.values());
        if (providers.length === 0) return 0;
        
        const totalResponseTime = providers.reduce((sum, p) => sum + p.averageResponseTime, 0);
        return Math.round(totalResponseTime / providers.length);
    }

    /**
     * Fuerza un health check inmediato de todos los proveedores
     * @returns {Promise<Array>} Resultados de los health checks
     */
    async forceHealthCheck() {
        console.log('Forzando health check de todos los proveedores...');
        const results = [];
        
        for (const name of this.providers.keys()) {
            try {
                const result = await this.checkProvider(name);
                results.push(result);
            } catch (error) {
                results.push({
                    name,
                    isHealthy: false,
                    error: error.message,
                    forced: true
                });
            }
        }
        
        return results;
    }

    /**
     * Actualiza la configuración de un proveedor
     * @param {string} name - Nombre del proveedor
     * @param {Object} newConfig - Nueva configuración
     */
    updateProviderConfig(name, newConfig) {
        const config = this.providers.get(name);
        if (!config) {
            throw new Error(`Proveedor ${name} no encontrado`);
        }

        Object.assign(config, newConfig);
        console.log(`Configuración actualizada para proveedor ${name}`);
    }

    /**
     * Elimina un proveedor del monitoreo
     * @param {string} name - Nombre del proveedor
     */
    unregisterProvider(name) {
        if (this.providers.delete(name)) {
            console.log(`Proveedor ${name} eliminado del health checking`);
        }
    }
}

module.exports = HealthChecker;