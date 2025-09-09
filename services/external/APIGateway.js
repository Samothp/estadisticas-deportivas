/**
 * APIGateway - Gateway inteligente para gestionar múltiples proveedores de API
 * Implementa failover automático, balanceo de carga y circuit breaker
 */
const HealthChecker = require('./HealthChecker');

class APIGateway {
    constructor(config = {}) {
        this.name = config.name || 'APIGateway';
        this.providers = new Map();
        this.defaultTimeout = config.defaultTimeout || 10000;
        this.maxRetries = config.maxRetries || 3;
        this.retryDelay = config.retryDelay || 1000;
        
        // Configurar HealthChecker
        this.healthChecker = new HealthChecker({
            checkInterval: config.healthCheckInterval || 30000,
            timeout: config.healthCheckTimeout || 5000,
            onHealthChange: (name, isHealthy, config) => this.handleHealthChange(name, isHealthy, config),
            onProviderDown: (name, config, error) => this.handleProviderDown(name, config, error),
            onProviderUp: (name, config) => this.handleProviderUp(name, config)
        });

        // Estrategias de selección de proveedor
        this.selectionStrategies = {
            priority: this.selectByPriority.bind(this),
            roundRobin: this.selectByRoundRobin.bind(this),
            leastLatency: this.selectByLeastLatency.bind(this),
            random: this.selectByRandom.bind(this)
        };
        
        this.currentStrategy = config.selectionStrategy || 'priority';
        this.roundRobinIndex = 0;
        
        // Métricas y estadísticas
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            failoverCount: 0,
            providerUsage: new Map(),
            averageResponseTime: 0,
            startTime: Date.now()
        };

        // Callbacks para eventos
        this.onFailover = config.onFailover || (() => {});
        this.onProviderError = config.onProviderError || (() => {});
        this.onRequestSuccess = config.onRequestSuccess || (() => {});

        console.log(`APIGateway ${this.name} inicializado con estrategia: ${this.currentStrategy}`);
    }

    /**
     * Registra un proveedor en el gateway
     * @param {string} name - Nombre del proveedor
     * @param {Object} provider - Instancia del proveedor
     * @param {Object} config - Configuración del proveedor
     */
    registerProvider(name, provider, config = {}) {
        const providerConfig = {
            name,
            provider,
            priority: config.priority || 1,
            weight: config.weight || 1,
            maxConcurrentRequests: config.maxConcurrentRequests || 10,
            currentRequests: 0,
            isEnabled: config.isEnabled !== false,
            tags: config.tags || [],
            capabilities: config.capabilities || [],
            ...config
        };

        this.providers.set(name, providerConfig);
        this.stats.providerUsage.set(name, {
            requests: 0,
            successes: 0,
            failures: 0,
            averageResponseTime: 0,
            lastUsed: null
        });

        // Registrar en HealthChecker
        this.healthChecker.registerProvider(name, provider, {
            priority: providerConfig.priority,
            customHealthCheck: config.customHealthCheck,
            maxConsecutiveFailures: config.maxConsecutiveFailures || 3
        });

        console.log(`Proveedor ${name} registrado en APIGateway (prioridad: ${providerConfig.priority})`);
    }

    /**
     * Inicia el gateway y el monitoreo de salud
     */
    start() {
        this.healthChecker.start();
        console.log(`APIGateway ${this.name} iniciado`);
    }

    /**
     * Detiene el gateway
     */
    stop() {
        this.healthChecker.stop();
        console.log(`APIGateway ${this.name} detenido`);
    }

    /**
     * Realiza una petición a través del gateway con failover automático
     * @param {string} method - Método de la petición (ej: 'getTeams', 'getMatches')
     * @param {Array} args - Argumentos para el método
     * @param {Object} options - Opciones de la petición
     * @returns {Promise<Object>} Resultado de la petición
     */
    async request(method, args = [], options = {}) {
        const requestId = this.generateRequestId();
        const startTime = Date.now();
        
        this.stats.totalRequests++;
        
        console.log(`${this.name}: Iniciando petición ${requestId} - ${method}(${args.length} args)`);

        let lastError = null;
        let attemptCount = 0;
        const maxAttempts = Math.min(this.maxRetries + 1, this.getAvailableProvidersCount());

        while (attemptCount < maxAttempts) {
            attemptCount++;
            
            try {
                // Seleccionar proveedor
                const selectedProvider = this.selectProvider(options);
                if (!selectedProvider) {
                    throw new Error('No hay proveedores disponibles');
                }

                const providerName = selectedProvider.name;
                const provider = selectedProvider.provider;

                console.log(`${this.name}: Intento ${attemptCount}/${maxAttempts} usando proveedor ${providerName}`);

                // Verificar límite de concurrencia
                if (selectedProvider.currentRequests >= selectedProvider.maxConcurrentRequests) {
                    throw new Error(`Proveedor ${providerName} ha alcanzado el límite de concurrencia`);
                }

                // Incrementar contador de peticiones concurrentes
                selectedProvider.currentRequests++;

                try {
                    // Realizar la petición
                    const result = await this.executeRequest(provider, method, args, {
                        ...options,
                        timeout: options.timeout || this.defaultTimeout,
                        requestId,
                        providerName
                    });

                    // Petición exitosa
                    const responseTime = Date.now() - startTime;
                    this.recordSuccess(providerName, responseTime, requestId);
                    
                    console.log(`${this.name}: Petición ${requestId} exitosa con ${providerName} (${responseTime}ms)`);
                    
                    return {
                        data: result,
                        provider: providerName,
                        responseTime,
                        requestId,
                        attempts: attemptCount
                    };

                } finally {
                    // Decrementar contador de peticiones concurrentes
                    selectedProvider.currentRequests--;
                }

            } catch (error) {
                lastError = error;
                const errorMessage = error.message || 'Unknown error';
                
                console.warn(`${this.name}: Intento ${attemptCount} falló: ${errorMessage}`);
                
                // Registrar error del proveedor si se pudo seleccionar uno
                if (error.providerName) {
                    this.recordFailure(error.providerName, error, requestId);
                    this.onProviderError(error.providerName, error, requestId);
                }

                // Si no es el último intento, esperar antes del siguiente
                if (attemptCount < maxAttempts) {
                    const delay = this.calculateRetryDelay(attemptCount);
                    console.log(`${this.name}: Esperando ${delay}ms antes del siguiente intento...`);
                    await this.sleep(delay);
                    
                    this.stats.failoverCount++;
                    this.onFailover(attemptCount, lastError, requestId);
                }
            }
        }

        // Todos los intentos fallaron
        this.stats.failedRequests++;
        const totalTime = Date.now() - startTime;
        
        console.error(`${this.name}: Petición ${requestId} falló después de ${attemptCount} intentos (${totalTime}ms)`);
        
        throw new Error(`Petición falló después de ${attemptCount} intentos. Último error: ${lastError?.message || 'Unknown error'}`);
    }

    /**
     * Ejecuta una petición en un proveedor específico
     * @param {Object} provider - Proveedor a usar
     * @param {string} method - Método a ejecutar
     * @param {Array} args - Argumentos del método
     * @param {Object} options - Opciones de la petición
     * @returns {Promise<Object>} Resultado de la petición
     */
    async executeRequest(provider, method, args, options) {
        // Verificar que el proveedor tenga el método
        if (typeof provider[method] !== 'function') {
            const error = new Error(`Método ${method} no disponible en proveedor ${options.providerName}`);
            error.providerName = options.providerName;
            throw error;
        }

        try {
            // Ejecutar con timeout
            const result = await Promise.race([
                provider[method](...args),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Request timeout')), options.timeout)
                )
            ]);

            return result;

        } catch (error) {
            // Agregar información del proveedor al error
            error.providerName = options.providerName;
            error.requestId = options.requestId;
            throw error;
        }
    }

    /**
     * Selecciona un proveedor según la estrategia configurada
     * @param {Object} options - Opciones de selección
     * @returns {Object|null} Proveedor seleccionado
     */
    selectProvider(options = {}) {
        // Filtrar proveedores disponibles
        const availableProviders = this.getAvailableProviders(options);
        
        if (availableProviders.length === 0) {
            return null;
        }

        // Aplicar estrategia de selección
        const strategy = options.strategy || this.currentStrategy;
        const selectionFunction = this.selectionStrategies[strategy] || this.selectionStrategies.priority;
        
        return selectionFunction(availableProviders, options);
    }

    /**
     * Obtiene proveedores disponibles según criterios
     * @param {Object} options - Opciones de filtrado
     * @returns {Array} Lista de proveedores disponibles
     */
    getAvailableProviders(options = {}) {
        const healthyProviders = this.healthChecker.getHealthyProviders();
        
        return healthyProviders
            .map(hp => ({
                ...this.providers.get(hp.name),
                healthInfo: hp
            }))
            .filter(provider => {
                // Filtrar por habilitado
                if (!provider.isEnabled) return false;
                
                // Filtrar por tags si se especifican
                if (options.tags && options.tags.length > 0) {
                    const hasRequiredTags = options.tags.every(tag => 
                        provider.tags.includes(tag)
                    );
                    if (!hasRequiredTags) return false;
                }
                
                // Filtrar por capacidades si se especifican
                if (options.capabilities && options.capabilities.length > 0) {
                    const hasRequiredCapabilities = options.capabilities.every(cap => 
                        provider.capabilities.includes(cap)
                    );
                    if (!hasRequiredCapabilities) return false;
                }
                
                return true;
            });
    }

    /**
     * Estrategia de selección por prioridad
     * @param {Array} providers - Proveedores disponibles
     * @returns {Object} Proveedor seleccionado
     */
    selectByPriority(providers) {
        return providers.sort((a, b) => a.priority - b.priority)[0];
    }

    /**
     * Estrategia de selección round-robin
     * @param {Array} providers - Proveedores disponibles
     * @returns {Object} Proveedor seleccionado
     */
    selectByRoundRobin(providers) {
        if (providers.length === 0) return null;
        
        const provider = providers[this.roundRobinIndex % providers.length];
        this.roundRobinIndex = (this.roundRobinIndex + 1) % providers.length;
        
        return provider;
    }

    /**
     * Estrategia de selección por menor latencia
     * @param {Array} providers - Proveedores disponibles
     * @returns {Object} Proveedor seleccionado
     */
    selectByLeastLatency(providers) {
        return providers.sort((a, b) => 
            a.healthInfo.averageResponseTime - b.healthInfo.averageResponseTime
        )[0];
    }

    /**
     * Estrategia de selección aleatoria
     * @param {Array} providers - Proveedores disponibles
     * @returns {Object} Proveedor seleccionado
     */
    selectByRandom(providers) {
        const randomIndex = Math.floor(Math.random() * providers.length);
        return providers[randomIndex];
    }

    /**
     * Registra una petición exitosa
     * @param {string} providerName - Nombre del proveedor
     * @param {number} responseTime - Tiempo de respuesta
     * @param {string} requestId - ID de la petición
     */
    recordSuccess(providerName, responseTime, requestId) {
        this.stats.successfulRequests++;
        
        // Actualizar tiempo de respuesta promedio
        if (this.stats.averageResponseTime === 0) {
            this.stats.averageResponseTime = responseTime;
        } else {
            this.stats.averageResponseTime = (this.stats.averageResponseTime * 0.9) + (responseTime * 0.1);
        }

        // Actualizar estadísticas del proveedor
        const providerStats = this.stats.providerUsage.get(providerName);
        if (providerStats) {
            providerStats.requests++;
            providerStats.successes++;
            providerStats.lastUsed = Date.now();
            
            if (providerStats.averageResponseTime === 0) {
                providerStats.averageResponseTime = responseTime;
            } else {
                providerStats.averageResponseTime = (providerStats.averageResponseTime * 0.9) + (responseTime * 0.1);
            }
        }

        this.onRequestSuccess(providerName, responseTime, requestId);
    }

    /**
     * Registra una petición fallida
     * @param {string} providerName - Nombre del proveedor
     * @param {Error} error - Error ocurrido
     * @param {string} requestId - ID de la petición
     */
    recordFailure(providerName, error, requestId) {
        const providerStats = this.stats.providerUsage.get(providerName);
        if (providerStats) {
            providerStats.requests++;
            providerStats.failures++;
        }
    }

    /**
     * Calcula el delay para el siguiente intento
     * @param {number} attemptNumber - Número del intento
     * @returns {number} Delay en milisegundos
     */
    calculateRetryDelay(attemptNumber) {
        // Exponential backoff con jitter
        const baseDelay = this.retryDelay * Math.pow(2, attemptNumber - 1);
        const jitter = Math.random() * 0.1 * baseDelay;
        return Math.min(baseDelay + jitter, 10000); // Máximo 10 segundos
    }

    /**
     * Obtiene el número de proveedores disponibles
     * @returns {number} Número de proveedores disponibles
     */
    getAvailableProvidersCount() {
        return this.healthChecker.getHealthyProviders().length;
    }

    /**
     * Maneja cambios en el estado de salud de proveedores
     * @param {string} name - Nombre del proveedor
     * @param {boolean} isHealthy - Estado de salud
     * @param {Object} config - Configuración del proveedor
     */
    handleHealthChange(name, isHealthy, config) {
        console.log(`${this.name}: Cambio de salud en proveedor ${name}: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
    }

    /**
     * Maneja cuando un proveedor se marca como down
     * @param {string} name - Nombre del proveedor
     * @param {Object} config - Configuración del proveedor
     * @param {Error} error - Error que causó el down
     */
    handleProviderDown(name, config, error) {
        console.error(`${this.name}: Proveedor ${name} marcado como DOWN: ${error?.message || 'Unknown error'}`);
    }

    /**
     * Maneja cuando un proveedor se recupera
     * @param {string} name - Nombre del proveedor
     * @param {Object} config - Configuración del proveedor
     */
    handleProviderUp(name, config) {
        console.log(`${this.name}: Proveedor ${name} recuperado y disponible`);
    }

    /**
     * Obtiene estadísticas del gateway
     * @returns {Object} Estadísticas detalladas
     */
    getStats() {
        const uptime = Date.now() - this.stats.startTime;
        const successRate = this.stats.totalRequests > 0 ? 
            (this.stats.successfulRequests / this.stats.totalRequests * 100).toFixed(2) : 0;

        return {
            name: this.name,
            uptime,
            totalRequests: this.stats.totalRequests,
            successfulRequests: this.stats.successfulRequests,
            failedRequests: this.stats.failedRequests,
            successRate: parseFloat(successRate),
            failoverCount: this.stats.failoverCount,
            averageResponseTime: Math.round(this.stats.averageResponseTime),
            currentStrategy: this.currentStrategy,
            providersRegistered: this.providers.size,
            providersHealthy: this.healthChecker.getHealthyProviders().length,
            providerUsage: Object.fromEntries(this.stats.providerUsage),
            healthChecker: this.healthChecker.getOverallHealth()
        };
    }

    /**
     * Cambia la estrategia de selección de proveedores
     * @param {string} strategy - Nueva estrategia
     */
    setSelectionStrategy(strategy) {
        if (!this.selectionStrategies[strategy]) {
            throw new Error(`Estrategia ${strategy} no válida. Disponibles: ${Object.keys(this.selectionStrategies).join(', ')}`);
        }
        
        this.currentStrategy = strategy;
        console.log(`${this.name}: Estrategia cambiada a ${strategy}`);
    }

    /**
     * Habilita o deshabilita un proveedor
     * @param {string} name - Nombre del proveedor
     * @param {boolean} enabled - Estado deseado
     */
    setProviderEnabled(name, enabled) {
        const provider = this.providers.get(name);
        if (!provider) {
            throw new Error(`Proveedor ${name} no encontrado`);
        }
        
        provider.isEnabled = enabled;
        console.log(`${this.name}: Proveedor ${name} ${enabled ? 'habilitado' : 'deshabilitado'}`);
    }

    /**
     * Genera un ID único para la petición
     * @returns {string} ID de la petición
     */
    generateRequestId() {
        return `gw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Función de sleep
     * @param {number} ms - Milisegundos a esperar
     * @returns {Promise} Promise que se resuelve después del tiempo especificado
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Fuerza un health check de todos los proveedores
     * @returns {Promise<Array>} Resultados de los health checks
     */
    async forceHealthCheck() {
        return await this.healthChecker.forceHealthCheck();
    }
}

module.exports = APIGateway;