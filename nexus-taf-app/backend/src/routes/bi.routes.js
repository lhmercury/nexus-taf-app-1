const { Router } = require('express');
const ctrl = require('../controllers/bi.controller');
const { requireAuth } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { asyncHandler } = require('../middleware/errorHandler');

const router = Router();

router.get('/bi/reports', requireAuth, requireRole('Administrador', 'Directivo'), asyncHandler(ctrl.reportes));

module.exports = router;
