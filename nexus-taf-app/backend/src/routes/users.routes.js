const { Router } = require('express');
const ctrl = require('../controllers/users.controller');
const { requireAuth } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { asyncHandler } = require('../middleware/errorHandler');

const router = Router();

router.get('/users', requireAuth, requireRole('Administrador'), asyncHandler(ctrl.listar));
router.put('/users/:id/role', requireAuth, requireRole('Administrador'), asyncHandler(ctrl.actualizarRol));
router.get('/roles', requireAuth, requireRole('Administrador'), asyncHandler(ctrl.listarRoles));

module.exports = router;
