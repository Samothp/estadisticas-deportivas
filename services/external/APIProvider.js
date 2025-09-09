/**
 * APIProvider - Clase base abstracta para proveedores de API externos
 * Define la interfaz común para todos los proveedores de datos de fútbol
 */
class APIProvider {
    constructor(config) {
        if (this.constructor === APIProvider) {
            throw new Error('APIProvider es una clase abstracta y no puede ser instanciada directamente');
        }
        
        this.name = config.name;
        this.baseUrl = config.baseUrl;
        this.apiKey = config.apiKey;
        this.rateLimit = config.rateLimit || { requests: 100, window: 60000 }; // 100 req/min por defecto
        this.timeout = config.timeout || 10000; // 10 segundos
        
        // Rate limiting
        this.requestCount = 0;
        this.windowStart = Date.now();
        
        // Circuit breaker
        this.isHealthy = true;
        this.failureCount = 0;
        this.lastFailure = null;
        this.circuitBreakerThreshold = 5;
        this.circuitBreakerTimeout = 60000; // 1 minuto
        
        console.log(`Inicializado proveedor ${this.name}`);
    }
    
    /**
     * Realiza una petición HTTP con rate limiting y circuit breaker
     * @param {string} endpoint - Endpoint relativo a la base URL
     * @param {Object} options - Opciones adicionales para la petición
     * @returns {Promise<Object>} Respuesta de la API
     */
    async makeRequest(endpoint, options = {}) {
        // Verificar circuit breaker
        if (!this.isHealthy) {
            if (Date.now() - this.lastFailure < this.circuitBreakerTimeout) {
                throw new Error(`Proveedor ${this.name} no disponible (circuit breaker activo)`);
            } else {
                // Intentar recuperación
                this.isHealthy = true;
                this.failureCount = 0;
                console.log(`Intentando recuperación del proveedor ${this.name}`);
            }
        }
        
        // Verificar rate limiting
        await this.checkRateLimit();
        
        try {
            const url = `${this.baseUrl}${endpoint}`;
            const requestOptions = {
                method: options.method || 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeaders(),
                    ...options.headers
                },
                timeout: this.timeout,
                ...options
            };
            
            console.log(`${this.name}: Realizando petición a ${url}`);
            
            const response = await fetch(url, requestOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Marcar como exitoso
            this.failureCount = 0;
            this.requestCount++;
            
            // Agregar metadata del proveedor
            if (Array.isArray(data)) {
                data.forEach(item => item._provider = this.name);
            } else if (typeof data === 'object' && data !== null) {
                data._provider = this.name;
                if (data.teams) data.teams.forEach(item => item._provider = this.name);
                if (data.matches) data.matches.forEach(item => item._provider = this.name);
                if (data.players) data.players.forEach(item => item._provider = this.name);
            }
            
            return data;
            
        } catch (error) {
            this.handleRequestError(error);
            throw error;
        }
    }
    
    /**
     * Verifica y aplica rate limiting
     */
    async checkRateLimit() {
        const now = Date.now();
        
        // Reset window si ha pasado el tiempo
        if (now - this.windowStart >= this.rateLimit.window) {
            this.requestCount = 0;
            this.windowStart = now;
        }
        
        // Verificar si hemos excedido el límite
        if (this.requestCount >= this.rateLimit.requests) {
            const waitTime = this.rateLimit.window - (now - this.windowStart);
            console.warn(`${this.name}: Rate limit alcanzado, esperando ${waitTime}ms`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            
            // Reset después de esperar
            this.requestCount = 0;
            this.windowStart = Date.now();
        }
    }
    
    /**
     * Maneja errores de peticiones y circuit breaker
     * @param {Error} error - Error ocurrido
     */
    handleRequestError(error) {
        this.failureCount++;
        this.lastFailure = Date.now();
        
        console.error(`${this.name}: Error en petición (${this.failureCount}/${this.circuitBreakerThreshold}):`, error.message);
        
        // Activar circuit breaker si se alcanza el umbral
        if (this.failureCount >= this.circuitBreakerThreshold) {
            this.isHealthy = false;
            console.error(`${this.name}: Circuit breaker activado debido a múltiples fallos`);
        }
    }
    
    /**
     * Obtiene el estado de salud del proveedor
     * @returns {Object} Estado de salud
     */
    getHealthStatus() {
        return {
            name: this.name,
            isHealthy: this.isHealthy,
            failureCount: this.failureCount,
            lastFailure: this.lastFailure,
            requestCount: this.requestCount,
            windowStart: this.windowStart,
            rateLimit: this.rateLimit
        };
    }

    /**
     * Realiza un health check básico del proveedor
     * @returns {Promise<boolean>} True si el proveedor está saludable
     */
    async healthCheck() {
        try {
            // Verificar circuit breaker
            if (!this.isHealthy) {
                return false;
            }

            // Verificar rate limiting básico
            const now = Date.now();
            const timeSinceWindowStart = now - this.windowStart;
            const currentUsage = timeSinceWindowStart < this.rateLimit.window ? 
                (this.requestCount / this.rateLimit.requests) * 100 : 0;
            
            if (currentUsage > 95) {
                return false; // Rate limit casi al límite
            }

            return true;
        } catch (error) {
            console.error(`Health check falló para ${this.name}:`, error.message);
            return false;
        }
    }

    /**
     * Test de conectividad básica
     * @returns {Promise<Object>} Resultado del test de conectividad
     */
    async testConnectivity() {
        try {
            // Intentar una petición muy básica o ping
            const startTime = Date.now();
            
            // Si el proveedor tiene un endpoint de health, usarlo
            if (this.healthEndpoint) {
                await this.makeRequest(this.healthEndpoint, { 
                    method: 'GET',
                    timeout: 5000
                });
            } else {
                // Test básico de conectividad usando headers
                const response = await fetch(this.baseUrl, {
                    method: 'HEAD',
                    headers: this.getAuthHeaders(),
                    timeout: 5000
                });
                
                if (!response.ok && response.status !== 404) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }

            const responseTime = Date.now() - startTime;
            
            return {
                success: true,
                responseTime,
                timestamp: Date.now()
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                timestamp: Date.now()
            };
        }
    }

    /**
     * Test ligero para verificar respuesta de la API
     * @returns {Promise<Object>} Resultado del test ligero
     */
    async lightweightTest() {
        // Este método debe ser implementado por cada proveedor específico
        // con un endpoint que consuma pocos recursos
        throw new Error('lightweightTest debe ser implementado por el proveedor específico');
    }
    
    /**
     * Resetea el circuit breaker manualmente
     */
    resetCircuitBreaker() {
        this.isHealthy = true;
        this.failureCount = 0;
        this.lastFailure = null;
        console.log(`${this.name}: Circuit breaker reseteado manualmente`);
    }
    
    // Métodos abstractos que deben ser implementados por las clases hijas
    
    /**
     * Obtiene headers de autenticación específicos del proveedor
     * @abstract
     * @returns {Object} Headers de autenticación
     */
    getAuthHeaders() {
        throw new Error('El método getAuthHeaders() debe ser implementado por la clase hija');
    }
    
    /**
     * Obtiene equipos de una competición
     * @abstract
     * @param {string} competition - ID de la competición
     * @returns {Promise<Array>} Lista de equipos
     */
    async getTeams(competition) {
        throw new Error('El método getTeams() debe ser implementado por la clase hija');
    }
    
    /**
     * Obtiene jugadores de un equipo
     * @abstract
     * @param {string} teamId - ID del equipo
     * @returns {Promise<Array>} Lista de jugadores
     */
    async getPlayers(teamId) {
        throw new Error('El método getPlayers() debe ser implementado por la clase hija');
    }
    
    /**
     * Obtiene partidos de una competición
     * @abstract
     * @param {string} competition - ID de la competición
     * @param {string} season - Temporada
     * @returns {Promise<Array>} Lista de partidos
     */
    async getMatches(competition, season) {
        throw new Error('El método getMatches() debe ser implementado por la clase hija');
    }
    
    /**
     * Obtiene eventos de un partido específico
     * @abstract
     * @param {string} matchId - ID del partido
     * @returns {Promise<Array>} Lista de eventos del partido
     */
    async getMatchEvents(matchId) {
        throw new Error('El método getMatchEvents() debe ser implementado por la clase hija');
    }
    
    /**
     * Obtiene la clasificación de una competición
     * @abstract
     * @param {string} competition - ID de la competición
     * @returns {Promise<Array>} Tabla de clasificación
     */
    async getStandings(competition) {
        throw new Error('El método getStandings() debe ser implementado por la clase hija');
    }
    
    /**
     * Obtiene partidos en vivo
     * @abstract
     * @returns {Promise<Array>} Lista de partidos en vivo
     */
    async getLiveMatches() {
        throw new Error('El método getLiveMatches() debe ser implementado por la clase hija');
    }
    
    /**
     * Verifica la conectividad con la API
     * @abstract
     * @returns {Promise<boolean>} True si la conexión es exitosa
     */
    async testConnection() {
        throw new Error('El método testConnection() debe ser implementado por la clase hija');
    }
}

module.exports = APIProvider;