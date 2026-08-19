const { Tarea, Sprint } = require('../models/mongo');
const { registrarAuditoria, obtenerIp } = require('../utils/auditoria');

const ESTADOS_VALIDOS = ['por_hacer', 'en_progreso', 'hecho'];

/**
 * GET /api/tasks?sprint=<id>
 * Si no se indica sprint, devuelve las tareas del sprint activo más reciente.
 */
async function listar(req, res) {
  let { sprint } = req.query;

  if (!sprint) {
    const activo = await Sprint.findOne({ estado: 'activo' }).sort({ fecha_inicio: -1 });
    sprint = activo?._id;
  }

  const filtro = sprint ? { id_sprint: sprint } : {};
  const tareas = await Tarea.find(filtro).sort({ fecha_actualizacion: -1 }).lean();

  return res.json({ sprintId: sprint || null, tareas });
}

/** POST /api/tasks — crear una tarjeta nueva en el tablero. */
async function crear(req, res) {
  const { id_sprint, titulo, descripcion, prioridad, responsable_nombre, codigo } = req.body;

  if (!id_sprint || !titulo) {
    return res.status(400).json({ error: 'id_sprint y titulo son obligatorios.' });
  }

  const sprint = await Sprint.findById(id_sprint);
  if (!sprint) {
    return res.status(404).json({ error: 'El sprint indicado no existe.' });
  }

  const tarea = await Tarea.create({
    id_sprint,
    titulo,
    descripcion: descripcion || '',
    prioridad: prioridad || 'media',
    responsable_id: req.usuario.id,
    responsable_nombre: responsable_nombre || '',
    codigo: codigo || ''
  });

  await registrarAuditoria({
    idUsuario: req.usuario.id,
    tipoEvento: 'tarea_creada',
    moduloAfectado: 'operativo',
    ip: obtenerIp(req),
    detalle: `Tarea "${titulo}" creada en sprint ${id_sprint}.`
  });

  return res.status(201).json(tarea);
}

/**
 * PATCH /api/tasks/:id
 * Actualiza estado y/o campos de una tarea. Es lo que persiste el
 * arrastrar-y-soltar del tablero Scrum en tiempo real.
 */
async function actualizar(req, res) {
  const { id } = req.params;
  const cambios = {};

  if (req.body.estado !== undefined) {
    if (!ESTADOS_VALIDOS.includes(req.body.estado)) {
      return res.status(400).json({ error: `estado debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}` });
    }
    cambios.estado = req.body.estado;
  }
  for (const campo of ['titulo', 'descripcion', 'prioridad', 'responsable_nombre']) {
    if (req.body[campo] !== undefined) cambios[campo] = req.body[campo];
  }

  const tarea = await Tarea.findByIdAndUpdate(id, cambios, { new: true });
  if (!tarea) {
    return res.status(404).json({ error: 'Tarea no encontrada.' });
  }

  await registrarAuditoria({
    idUsuario: req.usuario.id,
    tipoEvento: 'tarea_actualizada',
    moduloAfectado: 'operativo',
    ip: obtenerIp(req),
    detalle: `Tarea ${id} actualizada: ${JSON.stringify(cambios)}.`
  });

  return res.json(tarea);
}

/** DELETE /api/tasks/:id — extensión práctica para poder limpiar tarjetas de prueba. */
async function eliminar(req, res) {
  const eliminada = await Tarea.findByIdAndDelete(req.params.id);
  if (!eliminada) {
    return res.status(404).json({ error: 'Tarea no encontrada.' });
  }
  return res.status(204).send();
}

module.exports = { listar, crear, actualizar, eliminar };
