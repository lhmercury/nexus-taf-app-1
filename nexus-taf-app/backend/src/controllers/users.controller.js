const pg = require('../models/postgres');
const { registrarAuditoria, obtenerIp } = require('../utils/auditoria');

/** GET /api/users — Panel de administración de roles (solo Administrador). */
async function listar(req, res) {
  const usuarios = await pg.listarUsuarios();
  return res.json(
    usuarios.map((u) => ({
      id: u.id_usuario,
      nombre: u.nombre,
      apellido: u.apellido,
      email: u.email,
      rol: u.nombre_rol,
      idRol: u.id_rol,
      bloqueado: u.estado_bloqueo,
      ultimoAcceso: u.ultimo_acceso
    }))
  );
}

/** GET /api/roles — catálogo de roles disponibles, para poblar el <select> del panel. */
async function listarRoles(req, res) {
  const roles = await pg.listarRoles();
  return res.json(roles);
}

/** PUT /api/users/:id/role — Asignar o cambiar el rol de un usuario (solo Administrador). */
async function actualizarRol(req, res) {
  const { id } = req.params;
  const { rol } = req.body;

  if (!rol) {
    return res.status(400).json({ error: 'Debes indicar el nombre del rol destino.' });
  }

  const filaRol = await pg.obtenerRolPorNombre(rol);
  if (!filaRol) {
    return res.status(400).json({ error: `El rol "${rol}" no existe.` });
  }

  const usuarioPrevio = await pg.obtenerUsuarioPorId(id);
  if (!usuarioPrevio) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  const actualizado = await pg.actualizarRolUsuario(id, filaRol.id_rol);

  await registrarAuditoria({
    idUsuario: req.usuario.id,
    tipoEvento: 'cambio_rol',
    moduloAfectado: 'seguridad',
    ip: obtenerIp(req),
    detalle: `Usuario #${id} (${usuarioPrevio.email}): ${usuarioPrevio.nombre_rol} → ${rol}.`
  });

  return res.json({
    id: actualizado.id_usuario,
    nombre: actualizado.nombre,
    apellido: actualizado.apellido,
    email: actualizado.email,
    rol
  });
}

module.exports = { listar, listarRoles, actualizarRol };
