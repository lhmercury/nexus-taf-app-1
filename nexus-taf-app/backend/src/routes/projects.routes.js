const { Router } = require('express');
const ctrl = require('../controllers/projects.controller');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = Router();

// Todos los roles autenticados pueden entrar: el controlador filtra por
// dueño real cuando el usuario es Cliente.
router.get('/projects', requireAuth, asyncHandler(ctrl.listarPorCliente));
router.get('/projects/:id/status', requireAuth, asyncHandler(ctrl.estado));

module.exports = router;
