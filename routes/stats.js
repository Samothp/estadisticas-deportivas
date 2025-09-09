const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

router.get('/stats', statsController.getAllStats);
router.post('/stats', statsController.createStat);
router.delete('/stats/:id', statsController.deleteStat);
router.put('/stats/:id', statsController.updateStat);

module.exports = router;

