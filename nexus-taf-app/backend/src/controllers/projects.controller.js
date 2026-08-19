const { Proyecto, Hito } = require('../models/mongo');

/**
 * GET /api/projects/:id/status
 * Devuelve el proyecto, sus hitos ordenados y el porcentaje de avance
 * general (promedio de los hitos), tal como lo consume el Portal del
 * Cliente para pintar la línea de tiempo.
 *
 * Un Cliente solo puede consultar sus propios proyectos; Admin,
 * Directivo y Consultor pueden consultar cualquiera.
 */
async function estado(req, res) {
  const { id } = req.params;

  const proyecto = await Proyecto.findById(id).lean();
  if (!proyecto) {
    return res.status(404).json({ error: 'Proyecto no encontrado.' });
  }

  const esDueno = proyecto.cliente_id === req.usuario.id;
  const puedeVerCualquiera = ['Administrador', 'Directivo', 'Consultor'].includes(req.usuario.rol);

  if (!esDueno && !puedeVerCualquiera) {
    return res.status(403).json({ error: 'No tienes acceso a este proyecto.' });
  }

  const hitos = await Hito.find({ id_proyecto: id }).sort({ orden: 1, fecha_estimacion: 1 }).lean();

  const avancePromedio = hitos.length
    ? Math.round(hitos.reduce((sum, h) => sum + (h.porcentaje_avance || 0), 0) / hitos.length)
    : 0;

  return res.json({ proyecto, hitos, avancePromedio });
}

/** GET /api/projects?cliente_id=<id> — lista los proyectos de un cliente (para poblar el selector del portal). */
async function listarPorCliente(req, res) {
  const clienteId = req.usuario.rol === 'Cliente' ? req.usuario.id : Number(req.query.cliente_id) || req.usuario.id;
  const proyectos = await Proyecto.find({ cliente_id: clienteId }).sort({ createdAt: -1 }).lean();
  return res.json(proyectos);
}

module.exports = { estado, listarPorCliente };
