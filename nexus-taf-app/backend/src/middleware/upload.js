const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { UPLOAD_DIR, asegurarCarpeta } = require('../utils/storage');

asegurarCarpeta();

const TIPOS_PERMITIDOS = ['application/pdf', 'image/png', 'image/jpeg'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const sufijo = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${sufijo}${ext}`);
  }
});

function filtroArchivo(req, file, cb) {
  if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
    return cb(new Error('Formato no permitido. Solo se aceptan PDF, PNG o JPG.'));
  }
  cb(null, true);
}

const maxMb = Number(process.env.MAX_UPLOAD_MB || 10);

const upload = multer({
  storage,
  fileFilter: filtroArchivo,
  limits: { fileSize: maxMb * 1024 * 1024 }
});

module.exports = upload;
