const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { statsCache } = require('../middleware/cacheMiddleware');

// GET con cache, POST/PUT/DELETE sin cache (invalidan automáticamente)
router.get('/stats', statsCache(), statsController.getAllStats);
router.post('/stats', statsController.createStat);
router.delete('/stats/:id', statsController.deleteStat);
router.put('/stats/:id', statsController.updateStat);

module.exports = router;

