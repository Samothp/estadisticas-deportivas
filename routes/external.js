const express = require('express');
const router = express.Router();
const externalDataController = require('../controllers/externalDataController');

// Rutas de estado y monitoreo
router.get('/health', externalDataController.getHealthStatus);
router.get('/test-connection', externalDataController.testConnection);
router.get('/providers', externalDataController.getProvidersInfo);

// Rutas de datos externos
router.get('/teams', externalDataController.getExternalTeams);
router.get('/teams/:teamId/players', externalDataController.getExternalPlayers);
router.get('/matches', externalDataController.getExternalMatches);
router.get('/matches/live', externalDataController.getLiveMatches);
router.get('/standings', externalDataController.getExternalStandings);

// Rutas de administración
router.post('/providers/:provider/reset-circuit-breaker', externalDataController.resetCircuitBreaker);

module.exports = router;