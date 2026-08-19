const path = require('path');
const { Documento, Descarga } = require('../models/mongo');
const { streamDeLectura, existeArchivo } = require('../utils/storage');
const { registrarAuditoria, obtenerIp } = require('../utils/auditoria');

/**
 * POST /api/documents/upload
 * multipart/form-data — campo de archivo: "archivo".
 * multer ya validó tipo (PDF/PNG/JPG) y tamaño máximo antes de llegar aquí.
 */
async function subir(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo (campo "archivo").' });
  }

  const { id_proyecto, id_cliente } = req.body;
  const clienteId = req.usuario.rol === 'Cliente' ? req.usuario.id : Number(id_cliente) || req.usuario.id;

  const documento = await Documento.create({
    id_cliente: clienteId,
    id_proyecto: id_proyecto || undefined,
    nombre_archivo: req.file.filename,
    nombre_original: req.file.originalname,
    tipo_archivo: req.file.mimetype,
    ruta_almacenamiento: req.file.path,
    tamano: req.file.size,
    subido_por: req.usuario.id
  });

  await registrarAuditoria({
    idUsuario: req.usuario.id,
    tipoEvento: 'documento_cargado',
    moduloAfectado: 'cliente',
    ip: obtenerIp(req),
    detalle: `Archivo "${req.file.originalname}" (${req.file.size} bytes) cargado.`
  });

  return res.status(201).json(documento);
}

/** GET /api/documents?cliente_id=<id> — lista documentos disponibles (extensión práctica para el Portal). */
async function listar(req, res) {
  const clienteId = req.usuario.rol === 'Cliente' ? req.usuario.id : Number(req.query.cliente_id) || undefined;
  const filtro = clienteId ? { id_cliente: clienteId } : {};
  const documentos = await Documento.find(filtro).sort({ fecha_carga: -1 }).lean();
  return res.json(documentos);
}

/**
 * GET /api/documents/download/:id
 * Transmite el archivo y dos trazas de auditoría: una entrada en
 * `descargas` (evento específico del módulo) y otra en `auditorias`
 * (traza general del sistema), tal como exige el módulo de descarga
 * documentado en el proyecto.
 */
async function descargar(req, res) {
  const documento = await Documento.findById(req.params.id);
  if (!documento) {
    return res.status(404).json({ error: 'Documento no encontrado.' });
  }

  const esDueno = documento.id_cliente === req.usuario.id;
  const puedeVerCualquiera = ['Administrador', 'Directivo', 'Consultor'].includes(req.usuario.rol);
  if (!esDueno && !puedeVerCualquiera) {
    return res.status(403).json({ error: 'No tienes acceso a este documento.' });
  }

  if (!existeArchivo(documento.nombre_archivo)) {
    return res.status(410).json({ error: 'El archivo ya no está disponible en el almacenamiento.' });
  }

  await Descarga.create({
    id_documento: documento._id,
    id_usuario: req.usuario.id,
    direccion_ip: obtenerIp(req)
  });

  await registrarAuditoria({
    idUsuario: req.usuario.id,
    tipoEvento: 'documento_descargado',
    moduloAfectado: 'cliente',
    ip: obtenerIp(req),
    detalle: `Descarga de "${documento.nombre_original}".`
  });

  res.setHeader('Content-Disposition', `attachment; filename="${path.basename(documento.nombre_original)}"`);
  res.setHeader('Content-Type', documento.tipo_archivo);

  const stream = streamDeLectura(documento.nombre_archivo);
  stream.on('error', () => res.status(500).end());
  stream.pipe(res);
}

module.exports = { subir, listar, descargar };
