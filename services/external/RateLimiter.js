/**
 * RateLimiter - Sistema avanzado de rate limiting para APIs externas
 * Gestiona límites de peticiones, quotas y colas de peticiones con prioridades
 */
class RateLimiter {
    constructor(config = {}) {
        this.name = config.name || 'DefaultLimiter';
        this.requests = config.requests || 10; // Requests por ventana
        this.window = config.window || 60000; // Ventana en ms (1 minuto)
        this.burstLimit = config.burstLimit || this.requests; // Límite de ráfaga
        
        // Estado del rate limiter
        this.requestCount = 0;
        this.windowStart = Date.now();
        this.requestHistory = []; // Historial de peticiones
        
        // Cola de peticiones
        this.queue = [];
        this.isProcessingQueue = false;
        
        // Métricas
        this.metrics = {
            totalRequests: 0,
            rejectedRequests: 0,
            queuedRequests: 0,
            averageWaitTime: 0,
            lastReset: Date.now()
        };
        
        // Configuración de alertas
        this.alertThresholds = {
            queueSize: config.maxQueueSize || 100,
            waitTime: config.maxWaitTime || 30000, // 30 segundos
            rejectionRate: config.maxRejectionRate || 0.1 // 10%
        };
        
        console.log(`RateLimiter '${this.name}' inicializado: ${this.requests} req/${this.window}ms`);
    }
    
    /**
     * Verifica si una petición puede ser procesada inmediatamente
     * @returns {Object} Resultado de la verificación
     */
    canMakeRequest() {
        const now = Date.now();
        
        // Reset window si ha pasado el tiempo
        if (now - this.windowStart >= this.window) {
            this.resetWindow();
        }
        
        // Verificar límite de ráfaga
        if (this.requestCount >= this.burstLimit) {
            return {
                allowed: false,
                reason: 'burst_limit_exceeded',
                waitTime: this.calculateWaitTime(),
                queueSize: this.queue.length
            };
        }
        
        // Verificar límite de ventana
        if (this.requestCount >= this.requests) {
            return {
                allowed: false,
                reason: 'rate_limit_exceeded',
                waitTime: this.window - (now - this.windowStart),
                queueSize: this.queue.length
            };
        }
        
        return {
            allowed: true,
            remaining: this.requests - this.requestCount - 1,
            resetTime: this.windowStart + this.window
        };
    }
    
    /**
     * Procesa una petición con rate limiting
     * @param {Function} requestFn - Función que realiza la petición
     * @param {Object} options - Opciones de la petición
     * @returns {Promise} Resultado de la petición
     */
    async processRequest(requestFn, options = {}) {
        const priority = options.priority || 'normal'; // 'high', 'normal', 'low'
        const timeout = options.timeout || 30000; // 30 segundos
        
        return new Promise((resolve, reject) => {
            const requestItem = {
                id: this.generateRequestId(),
                requestFn,
                priority,
                timeout,
                timestamp: Date.now(),
                resolve,
                reject
            };
            
            // Verificar si puede procesarse inmediatamente
            const canProcess = this.canMakeRequest();
            
            if (canProcess.allowed) {
                this.executeRequest(requestItem);
            } else {
                // Agregar a la cola
                this.addToQueue(requestItem);
                
                // Verificar alertas
                this.checkAlerts(canProcess);
            }
        });
    }
    
    /**
     * Ejecuta una petición inmediatamente
     * @param {Object} requestItem - Item de petición
     */
    async executeRequest(requestItem) {
        try {
            this.recordRequest();
            
            const startTime = Date.now();
            const result = await requestItem.requestFn();
            const duration = Date.now() - startTime;
            
            // Actualizar métricas
            this.updateMetrics(duration, true);
            
            requestItem.resolve(result);
            
            // Procesar siguiente item en cola si existe
            this.processNextInQueue();
            
        } catch (error) {
            this.updateMetrics(0, false);
            requestItem.reject(error);
            
            // Procesar siguiente item en cola
            this.processNextInQueue();
        }
    }
    
    /**
     * Agrega una petición a la cola con prioridad
     * @param {Object} requestItem - Item de petición
     */
    addToQueue(requestItem) {
        // Verificar límite de cola
        if (this.queue.length >= this.alertThresholds.queueSize) {
            this.metrics.rejectedRequests++;
            requestItem.reject(new Error(`Cola llena (${this.queue.length} items). Intenta más tarde.`));
            return;
        }
        
        // Insertar según prioridad
        const priorityOrder = { 'high': 0, 'normal': 1, 'low': 2 };
        const itemPriority = priorityOrder[requestItem.priority] || 1;
        
        let insertIndex = this.queue.length;
        for (let i = 0; i < this.queue.length; i++) {
            const queuePriority = priorityOrder[this.queue[i].priority] || 1;
            if (itemPriority < queuePriority) {
                insertIndex = i;
                break;
            }
        }
        
        this.queue.splice(insertIndex, 0, requestItem);
        this.metrics.queuedRequests++;
        
        console.log(`${this.name}: Petición ${requestItem.id} agregada a cola (posición ${insertIndex + 1}/${this.queue.length})`);
        
        // Configurar timeout
        setTimeout(() => {
            this.timeoutRequest(requestItem.id);
        }, requestItem.timeout);
        
        // Iniciar procesamiento de cola si no está activo
        if (!this.isProcessingQueue) {
            this.startQueueProcessing();
        }
    }
    
    /**
     * Procesa el siguiente item en la cola
     */
    processNextInQueue() {
        if (this.queue.length === 0) {
            this.isProcessingQueue = false;
            return;
        }
        
        const canProcess = this.canMakeRequest();
        if (canProcess.allowed) {
            const nextItem = this.queue.shift();
            this.executeRequest(nextItem);
        } else {
            // Esperar hasta que se pueda procesar
            const waitTime = canProcess.waitTime || 1000;
            setTimeout(() => {
                this.processNextInQueue();
            }, Math.min(waitTime, 5000)); // Máximo 5 segundos de espera
        }
    }
    
    /**
     * Inicia el procesamiento de la cola
     */
    startQueueProcessing() {
        this.isProcessingQueue = true;
        this.processNextInQueue();
    }
    
    /**
     * Maneja timeout de peticiones en cola
     * @param {string} requestId - ID de la petición
     */
    timeoutRequest(requestId) {
        const index = this.queue.findIndex(item => item.id === requestId);
        if (index !== -1) {
            const item = this.queue.splice(index, 1)[0];
            this.metrics.rejectedRequests++;
            item.reject(new Error(`Timeout: Petición ${requestId} expiró en cola después de ${item.timeout}ms`));
        }
    }
    
    /**
     * Registra una petición realizada
     */
    recordRequest() {
        const now = Date.now();
        this.requestCount++;
        this.requestHistory.push(now);
        this.metrics.totalRequests++;
        
        // Limpiar historial antiguo (mantener solo última hora)
        const oneHourAgo = now - (60 * 60 * 1000);
        this.requestHistory = this.requestHistory.filter(time => time > oneHourAgo);
    }
    
    /**
     * Resetea la ventana de rate limiting
     */
    resetWindow() {
        console.log(`${this.name}: Reseteando ventana. Peticiones procesadas: ${this.requestCount}`);
        this.requestCount = 0;
        this.windowStart = Date.now();
    }
    
    /**
     * Calcula el tiempo de espera estimado
     * @returns {number} Tiempo de espera en ms
     */
    calculateWaitTime() {
        const now = Date.now();
        const windowReset = this.windowStart + this.window - now;
        const queueWait = this.queue.length * (this.window / this.requests);
        
        return Math.max(windowReset, queueWait);
    }
    
    /**
     * Actualiza métricas de rendimiento
     * @param {number} duration - Duración de la petición
     * @param {boolean} success - Si fue exitosa
     */
    updateMetrics(duration, success) {
        if (success) {
            // Calcular promedio de tiempo de espera
            const currentAvg = this.metrics.averageWaitTime;
            const totalSuccessful = this.metrics.totalRequests - this.metrics.rejectedRequests;
            this.metrics.averageWaitTime = ((currentAvg * (totalSuccessful - 1)) + duration) / totalSuccessful;
        }
    }
    
    /**
     * Verifica umbrales de alerta
     * @param {Object} status - Estado actual del rate limiter
     */
    checkAlerts(status) {
        const alerts = [];
        
        // Alerta de cola llena
        if (this.queue.length >= this.alertThresholds.queueSize * 0.8) {
            alerts.push({
                type: 'queue_size',
                severity: this.queue.length >= this.alertThresholds.queueSize ? 'critical' : 'warning',
                message: `Cola de peticiones al ${Math.round((this.queue.length / this.alertThresholds.queueSize) * 100)}% (${this.queue.length}/${this.alertThresholds.queueSize})`
            });
        }
        
        // Alerta de tiempo de espera alto
        const waitTime = this.calculateWaitTime();
        if (waitTime >= this.alertThresholds.waitTime) {
            alerts.push({
                type: 'wait_time',
                severity: waitTime >= this.alertThresholds.waitTime * 2 ? 'critical' : 'warning',
                message: `Tiempo de espera alto: ${Math.round(waitTime / 1000)}s`
            });
        }
        
        // Alerta de tasa de rechazo alta
        const rejectionRate = this.metrics.totalRequests > 0 ? 
            this.metrics.rejectedRequests / this.metrics.totalRequests : 0;
        
        if (rejectionRate >= this.alertThresholds.rejectionRate) {
            alerts.push({
                type: 'rejection_rate',
                severity: rejectionRate >= this.alertThresholds.rejectionRate * 2 ? 'critical' : 'warning',
                message: `Tasa de rechazo alta: ${Math.round(rejectionRate * 100)}%`
            });
        }
        
        // Emitir alertas
        if (alerts.length > 0) {
            this.emitAlerts(alerts);
        }
    }
    
    /**
     * Emite alertas del sistema
     * @param {Array} alerts - Lista de alertas
     */
    emitAlerts(alerts) {
        for (const alert of alerts) {
            console.warn(`${this.name} ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
            
            // Aquí se podría integrar con sistema de notificaciones
            // this.notificationService.send(alert);
        }
    }
    
    /**
     * Genera un ID único para peticiones
     * @returns {string} ID único
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Obtiene estadísticas del rate limiter
     * @returns {Object} Estadísticas completas
     */
    getStats() {
        const now = Date.now();
        const rejectionRate = this.metrics.totalRequests > 0 ? 
            this.metrics.rejectedRequests / this.metrics.totalRequests : 0;
        
        return {
            name: this.name,
            config: {
                requests: this.requests,
                window: this.window,
                burstLimit: this.burstLimit
            },
            current: {
                requestCount: this.requestCount,
                remaining: this.requests - this.requestCount,
                windowStart: this.windowStart,
                windowEnd: this.windowStart + this.window,
                timeToReset: Math.max(0, (this.windowStart + this.window) - now)
            },
            queue: {
                size: this.queue.length,
                maxSize: this.alertThresholds.queueSize,
                estimatedWaitTime: this.calculateWaitTime(),
                priorities: this.getQueuePriorities()
            },
            metrics: {
                ...this.metrics,
                rejectionRate: rejectionRate,
                successRate: 1 - rejectionRate,
                requestsPerMinute: this.getRequestsPerMinute()
            },
            alerts: this.getActiveAlerts()
        };
    }
    
    /**
     * Obtiene distribución de prioridades en cola
     * @returns {Object} Distribución de prioridades
     */
    getQueuePriorities() {
        const priorities = { high: 0, normal: 0, low: 0 };
        for (const item of this.queue) {
            priorities[item.priority] = (priorities[item.priority] || 0) + 1;
        }
        return priorities;
    }
    
    /**
     * Calcula peticiones por minuto basado en historial
     * @returns {number} Peticiones por minuto
     */
    getRequestsPerMinute() {
        const oneMinuteAgo = Date.now() - 60000;
        const recentRequests = this.requestHistory.filter(time => time > oneMinuteAgo);
        return recentRequests.length;
    }
    
    /**
     * Obtiene alertas activas
     * @returns {Array} Lista de alertas activas
     */
    getActiveAlerts() {
        const alerts = [];
        const stats = this.getStats();
        
        if (stats.queue.size >= this.alertThresholds.queueSize * 0.8) {
            alerts.push('queue_size');
        }
        
        if (stats.queue.estimatedWaitTime >= this.alertThresholds.waitTime) {
            alerts.push('wait_time');
        }
        
        if (stats.metrics.rejectionRate >= this.alertThresholds.rejectionRate) {
            alerts.push('rejection_rate');
        }
        
        return alerts;
    }
    
    /**
     * Resetea todas las métricas
     */
    resetMetrics() {
        this.metrics = {
            totalRequests: 0,
            rejectedRequests: 0,
            queuedRequests: 0,
            averageWaitTime: 0,
            lastReset: Date.now()
        };
        
        this.requestHistory = [];
        console.log(`${this.name}: Métricas reseteadas`);
    }
    
    /**
     * Limpia la cola de peticiones
     * @param {string} reason - Razón de la limpieza
     */
    clearQueue(reason = 'manual_clear') {
        const clearedCount = this.queue.length;
        
        // Rechazar todas las peticiones en cola
        for (const item of this.queue) {
            item.reject(new Error(`Cola limpiada: ${reason}`));
        }
        
        this.queue = [];
        this.isProcessingQueue = false;
        
        console.log(`${this.name}: Cola limpiada (${clearedCount} peticiones rechazadas). Razón: ${reason}`);
    }
}

module.exports = RateLimiter;