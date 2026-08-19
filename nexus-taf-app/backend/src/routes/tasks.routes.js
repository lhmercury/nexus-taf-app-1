const { Router } = require('express');
const ctrl = require('../controllers/tasks.controller');
const { requireAuth } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { asyncHandler } = require('../middleware/errorHandler');

const router = Router();

const PUEDE_GESTIONAR = ['Administrador', 'Consultor'];
const PUEDE_VER = ['Administrador', 'Consultor', 'Directivo'];

router.get('/tasks', requireAuth, requireRole(...PUEDE_VER), asyncHandler(ctrl.listar));
router.post('/tasks', requireAuth, requireRole(...PUEDE_GESTIONAR), asyncHandler(ctrl.crear));
router.patch('/tasks/:id', requireAuth, requireRole(...PUEDE_GESTIONAR), asyncHandler(ctrl.actualizar));
router.delete('/tasks/:id', requireAuth, requireRole(...PUEDE_GESTIONAR), asyncHandler(ctrl.eliminar));

module.exports = router;
