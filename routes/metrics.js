const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metricsController');
const { metricsCache, cacheStatsMiddleware, clearCacheMiddleware } = require('../middleware/cacheMiddleware');

// Rutas para métricas de jugadores (con cache)
router.get('/players', metricsCache(15 * 60 * 1000), metricsController.getAvailablePlayers); // 15 min cache
router.get('/player/:id', metricsCache(10 * 60 * 1000), metricsController.getPlayerMetrics); // 10 min cache

// Rutas para métricas de equipos (con cache)
router.get('/teams', metricsCache(15 * 60 * 1000), metricsController.getAvailableTeams); // 15 min cache
router.get('/team/:team', metricsCache(10 * 60 * 1000), metricsController.getTeamMetrics); // 10 min cache

// Rutas para análisis de tendencias (con cache largo)
router.get('/trends', metricsCache(20 * 60 * 1000), metricsController.getTrends); // 20 min cache

// Rutas para métricas globales (con cache)
router.get('/global', metricsCache(5 * 60 * 1000), metricsController.getGlobalMetrics); // 5 min cache

// Rutas para gestión de cache (sin cache)
router.get('/cache/stats', cacheStatsMiddleware, (req, res) => {
    // Combinar estadísticas del cache middleware y del metrics calculator
    const middlewareStats = req.cacheStats;
    const calculatorStats = metricsController.getCacheStats;
    
    res.json({
        success: true,
        data: {
            middleware: middlewareStats,
            calculator: calculatorStats ? calculatorStats : null
        },
        timestamp: new Date().toISOString()
    });
});

router.delete('/cache', clearCacheMiddleware, (req, res) => {
    // También limpiar cache del metrics calculator
    try {
        metricsController.clearCache(req, { 
            json: () => {} // Mock response para evitar doble respuesta
        });
    } catch (error) {
        console.warn('Error limpiando cache del calculator:', error.message);
    }
    
    res.json({
        success: true,
        data: req.cacheResult,
        timestamp: new Date().toISOString()
    });
});

module.exports = router;