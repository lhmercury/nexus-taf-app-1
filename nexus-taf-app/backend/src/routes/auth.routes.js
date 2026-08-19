const { Router } = require('express');
const ctrl = require('../controllers/auth.controller');
const { requireAuth, requirePreAuthOrAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = Router();

router.post('/register', asyncHandler(ctrl.register));
router.post('/login', asyncHandler(ctrl.login));
router.post('/mfa', requirePreAuthOrAuth, asyncHandler(ctrl.verifyMfa));
router.get('/me', requireAuth, asyncHandler(ctrl.me));

// Solo activo fuera de producción — ver controllers/auth.controller.js#devTotp
router.get('/dev/totp/:email', asyncHandler(ctrl.devTotp));

module.exports = router;
