const { Router } = require('express');
const ctrl = require('../controllers/documents.controller');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { asyncHandler } = require('../middleware/errorHandler');

const router = Router();

router.get('/documents', requireAuth, asyncHandler(ctrl.listar));
router.post('/documents/upload', requireAuth, upload.single('archivo'), asyncHandler(ctrl.subir));
router.get('/documents/download/:id', requireAuth, asyncHandler(ctrl.descargar));

module.exports = router;
