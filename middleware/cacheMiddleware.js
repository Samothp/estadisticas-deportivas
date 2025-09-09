/**
 * Cache Middleware - Middleware para gestión de cache de respuestas API
 * Implementa cache en memoria con TTL y invalidación automática
 */

class CacheManager {
    constructor() {
        this.cache = new Map();
        this.defaultTTL = 5 * 60 * 1000; // 5 minutos por defecto
        this.maxSize = 100; // Máximo 100 entradas
        this.hitCount = 0;
        this.missCount = 0;
        
        // Limpiar cache expirado cada minuto
        setInterval(() => {
            this.cleanExpiredEntries();
        }, 60 * 1000);
    }
    
    /**
     * Genera una clave de cache basada en la request
     */
    generateKey(req) {
        const { method, originalUrl, query, params } = req;
        const keyData = {
            method,
            url: originalUrl,
            query: query || {},
            params: params || {}
        };
        
        return `${method}:${originalUrl}:${JSON.stringify(keyData)}`;
    }
    
    /**
     * Obtiene un valor del cache
     */
    get(key) {
        const entry = this.cache.get(key);
        
        if (!entry) {
            this.missCount++;
            return null;
        }
        
        // Verificar si ha expirado
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            this.missCount++;
            return null;
        }
        
        // Actualizar último acceso
        entry.lastAccessed = Date.now();
        this.hitCount++;
        
        return entry.data;
    }
    
    /**
     * Guarda un valor en el cache
     */
    set(key, data, ttl = null) {
        // Verificar límite de tamaño
        if (this.cache.size >= this.maxSize) {
            this.evictLRU();
        }
        
        const actualTTL = ttl || this.defaultTTL;
        const entry = {
            data: data,
            createdAt: Date.now(),
            lastAccessed: Date.now(),
            expiresAt: Date.now() + actualTTL,
            ttl: actualTTL
        };
        
        this.cache.set(key, entry);
    }
    
    /**
     * Elimina entradas expiradas
     */
    cleanExpiredEntries() {
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`Cache: Limpiadas ${cleanedCount} entradas expiradas`);
        }
    }
    
    /**
     * Elimina la entrada menos recientemente usada (LRU)
     */
    evictLRU() {
        let oldestKey = null;
        let oldestTime = Date.now();
        
        for (const [key, entry] of this.cache.entries()) {
            if (entry.lastAccessed < oldestTime) {
                oldestTime = entry.lastAccessed;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.cache.delete(oldestKey);
            console.log(`Cache: Eliminada entrada LRU: ${oldestKey}`);
        }
    }
    
    /**
     * Invalida cache por patrón
     */
    invalidatePattern(pattern) {
        let invalidatedCount = 0;
        
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
                invalidatedCount++;
            }
        }
        
        console.log(`Cache: Invalidadas ${invalidatedCount} entradas con patrón: ${pattern}`);
        return invalidatedCount;
    }
    
    /**
     * Limpia todo el cache
     */
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        this.hitCount = 0;
        this.missCount = 0;
        console.log(`Cache: Limpiadas ${size} entradas`);
    }
    
    /**
     * Obtiene estadísticas del cache
     */
    getStats() {
        const totalRequests = this.hitCount + this.missCount;
        const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;
        
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hitCount: this.hitCount,
            missCount: this.missCount,
            hitRate: Math.round(hitRate * 100) / 100,
            defaultTTL: this.defaultTTL,
            entries: Array.from(this.cache.keys())
        };
    }
    
    /**
     * Configura el tamaño máximo del cache
     */
    setMaxSize(size) {
        this.maxSize = size;
        
        // Si el cache actual es mayor, eliminar entradas LRU
        while (this.cache.size > this.maxSize) {
            this.evictLRU();
        }
    }
    
    /**
     * Configura el TTL por defecto
     */
    setDefaultTTL(ttl) {
        this.defaultTTL = ttl;
    }
}

// Instancia singleton del cache manager
const cacheManager = new CacheManager();

/**
 * Middleware de cache para respuestas API
 * @param {Object} options - Opciones de configuración
 * @returns {Function} Middleware function
 */
function cacheMiddleware(options = {}) {
    const {
        ttl = null,
        skipCache = false,
        cacheKey = null,
        invalidatePatterns = []
    } = options;
    
    return (req, res, next) => {
        // Saltar cache si está deshabilitado o es una request que modifica datos
        if (skipCache || ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
            // Si es una request que modifica datos, invalidar cache relacionado
            if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
                // Invalidar cache de métricas cuando se modifican estadísticas
                if (req.originalUrl.includes('/api/stats')) {
                    cacheManager.invalidatePattern('/api/metrics');
                }
                
                // Invalidar patrones específicos
                invalidatePatterns.forEach(pattern => {
                    cacheManager.invalidatePattern(pattern);
                });
            }
            
            return next();
        }
        
        // Generar clave de cache
        const key = cacheKey || cacheManager.generateKey(req);
        
        // Intentar obtener del cache
        const cachedResponse = cacheManager.get(key);
        
        if (cachedResponse) {
            // Agregar headers de cache
            res.set({
                'X-Cache': 'HIT',
                'X-Cache-Key': key,
                'Cache-Control': 'public, max-age=300'
            });
            
            return res.json(cachedResponse);
        }
        
        // Interceptar la respuesta para guardarla en cache
        const originalJson = res.json;
        
        res.json = function(data) {
            // Solo cachear respuestas exitosas
            if (res.statusCode >= 200 && res.statusCode < 300) {
                cacheManager.set(key, data, ttl);
                
                // Agregar headers de cache
                res.set({
                    'X-Cache': 'MISS',
                    'X-Cache-Key': key,
                    'Cache-Control': 'public, max-age=300'
                });
            }
            
            // Llamar al método original
            return originalJson.call(this, data);
        };
        
        next();
    };
}

/**
 * Middleware específico para métricas con TTL largo
 */
function metricsCache(ttl = 10 * 60 * 1000) { // 10 minutos por defecto
    return cacheMiddleware({
        ttl: ttl,
        invalidatePatterns: ['/api/metrics']
    });
}

/**
 * Middleware para estadísticas con invalidación automática
 */
function statsCache() {
    return cacheMiddleware({
        ttl: 2 * 60 * 1000, // 2 minutos
        invalidatePatterns: ['/api/stats']
    });
}

/**
 * Obtiene el manager de cache (para uso interno)
 */
function getCacheManager() {
    return cacheManager;
}

/**
 * Middleware para obtener estadísticas del cache
 */
function cacheStatsMiddleware(req, res, next) {
    req.cacheStats = cacheManager.getStats();
    next();
}

/**
 * Middleware para limpiar cache
 */
function clearCacheMiddleware(req, res, next) {
    const { pattern } = req.query;
    
    if (pattern) {
        const invalidatedCount = cacheManager.invalidatePattern(pattern);
        req.cacheResult = {
            action: 'pattern_invalidation',
            pattern: pattern,
            invalidatedCount: invalidatedCount
        };
    } else {
        cacheManager.clear();
        req.cacheResult = {
            action: 'full_clear',
            message: 'Cache completamente limpiado'
        };
    }
    
    next();
}

module.exports = {
    cacheMiddleware,
    metricsCache,
    statsCache,
    getCacheManager,
    cacheStatsMiddleware,
    clearCacheMiddleware
};