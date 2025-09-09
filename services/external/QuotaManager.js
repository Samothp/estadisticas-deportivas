/**
 * QuotaManager - Gestión avanzada de quotas para APIs externas
 * Maneja límites diarios, mensuales y por características específicas
 */
class QuotaManager {
    constructor(config = {}) {
        this.name = config.name || 'DefaultQuota';
        
        // Configuración de quotas
        this.quotas = {
            daily: config.daily || 1000,
            monthly: config.monthly || 30000,
            perMinute: config.perMinute || 10,
            perHour: config.perHour || 600
        };
        
        // Contadores de uso
        this.usage = {
            daily: 0,
            monthly: 0,
            perMinute: 0,
            perHour: 0
        };
        
        // Timestamps de reset
        this.resetTimes = {
            daily: this.getNextDayReset(),
            monthly: this.getNextMonthReset(),
            perMinute: this.getNextMinuteReset(),
            perHour: this.getNextHourReset()
        };
        
        // Configuración de alertas
        this.alertThresholds = {
            warning: config.warningThreshold || 0.8, // 80%
            critical: config.criticalThreshold || 0.95 // 95%
        };
        
        // Historial de uso
        this.usageHistory = [];
        this.maxHistorySize = config.maxHistorySize || 1000;
        
        // Estado de alertas
        this.activeAlerts = new Set();
        
        console.log(`QuotaManager '${this.name}' inicializado con quotas:`, this.quotas);
        
        // Iniciar timers de reset automático
        this.startResetTimers();
    }
    
    /**
     * Verifica si una operación puede realizarse según las quotas
     * @param {string} operation - Tipo de operación
     * @param {number} cost - Costo en requests (por defecto 1)
     * @returns {Object} Resultado de la verificación
     */
    checkQuota(operation = 'default', cost = 1) {
        const now = Date.now();
        
        // Verificar resets automáticos
        this.checkAutoResets(now);
        
        // Verificar cada tipo de quota
        const checks = {
            perMinute: this.checkSpecificQuota('perMinute', cost),
            perHour: this.checkSpecificQuota('perHour', cost),
            daily: this.checkSpecificQuota('daily', cost),
            monthly: this.checkSpecificQuota('monthly', cost)
        };
        
        // Encontrar la quota más restrictiva
        const restrictiveCheck = Object.entries(checks)
            .find(([_, check]) => !check.allowed);
        
        if (restrictiveCheck) {
            const [quotaType, check] = restrictiveCheck;
            return {
                allowed: false,
                reason: 'quota_exceeded',
                quotaType: quotaType,
                current: check.current,
                limit: check.limit,
                resetTime: this.resetTimes[quotaType],
                timeToReset: this.resetTimes[quotaType] - now
            };
        }
        
        // Todas las quotas permiten la operación
        return {
            allowed: true,
            operation: operation,
            cost: cost,
            remaining: this.getRemainingQuotas(),
            resetTimes: { ...this.resetTimes }
        };
    }
    
    /**
     * Verifica una quota específica
     * @param {string} quotaType - Tipo de quota
     * @param {number} cost - Costo de la operación
     * @returns {Object} Resultado de la verificación
     */
    checkSpecificQuota(quotaType, cost) {
        const current = this.usage[quotaType];
        const limit = this.quotas[quotaType];
        
        return {
            allowed: (current + cost) <= limit,
            current: current,
            limit: limit,
            remaining: Math.max(0, limit - current),
            utilizationRate: current / limit
        };
    }
    
    /**
     * Consume quota para una operación
     * @param {string} operation - Tipo de operación
     * @param {number} cost - Costo en requests
     * @returns {Object} Resultado del consumo
     */
    consumeQuota(operation = 'default', cost = 1) {
        const check = this.checkQuota(operation, cost);
        
        if (!check.allowed) {
            this.recordRejection(operation, cost, check.reason);
            return check;
        }
        
        // Consumir de todas las quotas
        this.usage.perMinute += cost;
        this.usage.perHour += cost;
        this.usage.daily += cost;
        this.usage.monthly += cost;
        
        // Registrar en historial
        this.recordUsage(operation, cost);
        
        // Verificar alertas
        this.checkAlerts();
        
        console.log(`${this.name}: Quota consumida - ${operation} (costo: ${cost})`);
        
        return {
            success: true,
            operation: operation,
            cost: cost,
            remaining: this.getRemainingQuotas(),
            usage: { ...this.usage }
        };
    }
    
    /**
     * Registra uso en el historial
     * @param {string} operation - Operación realizada
     * @param {number} cost - Costo de la operación
     */
    recordUsage(operation, cost) {
        const record = {
            timestamp: Date.now(),
            operation: operation,
            cost: cost,
            type: 'usage'
        };
        
        this.usageHistory.push(record);
        
        // Mantener tamaño del historial
        if (this.usageHistory.length > this.maxHistorySize) {
            this.usageHistory.shift();
        }
    }
    
    /**
     * Registra rechazo por quota
     * @param {string} operation - Operación rechazada
     * @param {number} cost - Costo de la operación
     * @param {string} reason - Razón del rechazo
     */
    recordRejection(operation, cost, reason) {
        const record = {
            timestamp: Date.now(),
            operation: operation,
            cost: cost,
            reason: reason,
            type: 'rejection'
        };
        
        this.usageHistory.push(record);
        
        console.warn(`${this.name}: Operación rechazada - ${operation} (${reason})`);
    }
    
    /**
     * Verifica resets automáticos de quotas
     * @param {number} now - Timestamp actual
     */
    checkAutoResets(now) {
        // Reset por minuto
        if (now >= this.resetTimes.perMinute) {
            this.resetQuota('perMinute');
        }
        
        // Reset por hora
        if (now >= this.resetTimes.perHour) {
            this.resetQuota('perHour');
        }
        
        // Reset diario
        if (now >= this.resetTimes.daily) {
            this.resetQuota('daily');
        }
        
        // Reset mensual
        if (now >= this.resetTimes.monthly) {
            this.resetQuota('monthly');
        }
    }
    
    /**
     * Resetea una quota específica
     * @param {string} quotaType - Tipo de quota a resetear
     */
    resetQuota(quotaType) {
        const previousUsage = this.usage[quotaType];
        this.usage[quotaType] = 0;
        
        // Actualizar tiempo de próximo reset
        switch (quotaType) {
            case 'perMinute':
                this.resetTimes.perMinute = this.getNextMinuteReset();
                break;
            case 'perHour':
                this.resetTimes.perHour = this.getNextHourReset();
                break;
            case 'daily':
                this.resetTimes.daily = this.getNextDayReset();
                break;
            case 'monthly':
                this.resetTimes.monthly = this.getNextMonthReset();
                break;
        }
        
        console.log(`${this.name}: Quota ${quotaType} reseteada (uso anterior: ${previousUsage}/${this.quotas[quotaType]})`);
        
        // Limpiar alertas relacionadas
        this.activeAlerts.delete(`${quotaType}_warning`);
        this.activeAlerts.delete(`${quotaType}_critical`);
    }
    
    /**
     * Inicia timers para resets automáticos
     */
    startResetTimers() {
        // Timer para verificar resets cada minuto
        setInterval(() => {
            this.checkAutoResets(Date.now());
        }, 60000); // Cada minuto
        
        console.log(`${this.name}: Timers de reset automático iniciados`);
    }
    
    /**
     * Verifica umbrales de alerta
     */
    checkAlerts() {
        for (const [quotaType, usage] of Object.entries(this.usage)) {
            const limit = this.quotas[quotaType];
            const utilizationRate = usage / limit;
            
            const warningKey = `${quotaType}_warning`;
            const criticalKey = `${quotaType}_critical`;
            
            // Alerta crítica (95%)
            if (utilizationRate >= this.alertThresholds.critical) {
                if (!this.activeAlerts.has(criticalKey)) {
                    this.emitAlert('critical', quotaType, utilizationRate, usage, limit);
                    this.activeAlerts.add(criticalKey);
                }
            }
            // Alerta de advertencia (80%)
            else if (utilizationRate >= this.alertThresholds.warning) {
                if (!this.activeAlerts.has(warningKey)) {
                    this.emitAlert('warning', quotaType, utilizationRate, usage, limit);
                    this.activeAlerts.add(warningKey);
                }
            }
            // Limpiar alertas si el uso baja
            else {
                this.activeAlerts.delete(warningKey);
                this.activeAlerts.delete(criticalKey);
            }
        }
    }
    
    /**
     * Emite una alerta de quota
     * @param {string} severity - Severidad de la alerta
     * @param {string} quotaType - Tipo de quota
     * @param {number} utilizationRate - Tasa de utilización
     * @param {number} usage - Uso actual
     * @param {number} limit - Límite de la quota
     */
    emitAlert(severity, quotaType, utilizationRate, usage, limit) {
        const percentage = Math.round(utilizationRate * 100);
        const timeToReset = this.resetTimes[quotaType] - Date.now();
        const resetIn = this.formatDuration(timeToReset);
        
        const message = `Quota ${quotaType} al ${percentage}% (${usage}/${limit}). Reset en: ${resetIn}`;
        
        console.warn(`${this.name} QUOTA ALERT [${severity.toUpperCase()}]: ${message}`);
        
        // Aquí se podría integrar con sistema de notificaciones
        // this.notificationService.send({ severity, quotaType, message });
    }
    
    /**
     * Obtiene quotas restantes
     * @returns {Object} Quotas restantes
     */
    getRemainingQuotas() {
        const remaining = {};
        
        for (const [quotaType, limit] of Object.entries(this.quotas)) {
            const usage = this.usage[quotaType];
            remaining[quotaType] = {
                remaining: Math.max(0, limit - usage),
                limit: limit,
                used: usage,
                utilizationRate: usage / limit
            };
        }
        
        return remaining;
    }
    
    /**
     * Obtiene estadísticas completas de quotas
     * @returns {Object} Estadísticas completas
     */
    getStats() {
        const now = Date.now();
        
        return {
            name: this.name,
            quotas: { ...this.quotas },
            usage: { ...this.usage },
            remaining: this.getRemainingQuotas(),
            resetTimes: {
                perMinute: {
                    resetTime: this.resetTimes.perMinute,
                    timeToReset: Math.max(0, this.resetTimes.perMinute - now)
                },
                perHour: {
                    resetTime: this.resetTimes.perHour,
                    timeToReset: Math.max(0, this.resetTimes.perHour - now)
                },
                daily: {
                    resetTime: this.resetTimes.daily,
                    timeToReset: Math.max(0, this.resetTimes.daily - now)
                },
                monthly: {
                    resetTime: this.resetTimes.monthly,
                    timeToReset: Math.max(0, this.resetTimes.monthly - now)
                }
            },
            alerts: {
                active: Array.from(this.activeAlerts),
                thresholds: { ...this.alertThresholds }
            },
            history: {
                totalRecords: this.usageHistory.length,
                recentUsage: this.getRecentUsage(),
                rejectionRate: this.getRejectionRate()
            }
        };
    }
    
    /**
     * Obtiene uso reciente (última hora)
     * @returns {Object} Estadísticas de uso reciente
     */
    getRecentUsage() {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        const recentRecords = this.usageHistory.filter(record => record.timestamp > oneHourAgo);
        
        const usage = recentRecords.filter(r => r.type === 'usage');
        const rejections = recentRecords.filter(r => r.type === 'rejection');
        
        return {
            totalRequests: usage.length,
            totalRejections: rejections.length,
            totalCost: usage.reduce((sum, r) => sum + r.cost, 0),
            operationBreakdown: this.getOperationBreakdown(usage)
        };
    }
    
    /**
     * Obtiene desglose por tipo de operación
     * @param {Array} records - Registros a analizar
     * @returns {Object} Desglose por operación
     */
    getOperationBreakdown(records) {
        const breakdown = {};
        
        for (const record of records) {
            if (!breakdown[record.operation]) {
                breakdown[record.operation] = { count: 0, totalCost: 0 };
            }
            breakdown[record.operation].count++;
            breakdown[record.operation].totalCost += record.cost;
        }
        
        return breakdown;
    }
    
    /**
     * Calcula tasa de rechazo
     * @returns {number} Tasa de rechazo (0-1)
     */
    getRejectionRate() {
        if (this.usageHistory.length === 0) return 0;
        
        const rejections = this.usageHistory.filter(r => r.type === 'rejection').length;
        return rejections / this.usageHistory.length;
    }
    
    // Métodos de utilidad para calcular próximos resets
    
    getNextMinuteReset() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 
                       now.getHours(), now.getMinutes() + 1, 0, 0).getTime();
    }
    
    getNextHourReset() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 
                       now.getHours() + 1, 0, 0, 0).getTime();
    }
    
    getNextDayReset() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 
                       0, 0, 0, 0).getTime();
    }
    
    getNextMonthReset() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 1, 
                       0, 0, 0, 0).getTime();
    }
    
    /**
     * Formatea duración en texto legible
     * @param {number} ms - Milisegundos
     * @returns {string} Duración formateada
     */
    formatDuration(ms) {
        if (ms < 60000) return `${Math.round(ms / 1000)}s`;
        if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
        if (ms < 86400000) return `${Math.round(ms / 3600000)}h`;
        return `${Math.round(ms / 86400000)}d`;
    }
}

module.exports = QuotaManager;