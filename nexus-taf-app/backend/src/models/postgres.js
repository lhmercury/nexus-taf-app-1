/**
 * Capa de acceso a datos para PostgreSQL. Centraliza todas las consultas
 * parametrizadas sobre usuarios, roles, credenciales, áreas consultivas
 * y finanzas para que los controladores no escriban SQL directamente.
 */
const { query } = require('../config/postgres');

// ---------- Roles ----------
async function listarRoles() {
  const { rows } = await query('SELECT id_rol, nombre_rol, descripcion FROM roles ORDER BY id_rol');
  return rows;
}

async function obtenerRolPorNombre(nombreRol) {
  const { rows } = await query('SELECT * FROM roles WHERE nombre_rol = $1', [nombreRol]);
  return rows[0] || null;
}

// ---------- Usuarios ----------
async function crearUsuario({ nombre, apellido, email, passwordHash, idRol }) {
  const { rows } = await query(
    `INSERT INTO usuarios (nombre, apellido, email, password_hash, id_rol)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id_usuario, nombre, apellido, email, id_rol, fecha_creacion`,
    [nombre, apellido, email, passwordHash, idRol]
  );
  return rows[0];
}

async function obtenerUsuarioPorEmail(email) {
  const { rows } = await query(
    `SELECT u.*, r.nombre_rol
       FROM usuarios u
       JOIN roles r ON r.id_rol = u.id_rol
      WHERE u.email = $1`,
    [email]
  );
  return rows[0] || null;
}

async function obtenerUsuarioPorId(idUsuario) {
  const { rows } = await query(
    `SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.estado_bloqueo,
            u.fecha_creacion, u.ultimo_acceso, u.id_rol, r.nombre_rol
       FROM usuarios u
       JOIN roles r ON r.id_rol = u.id_rol
      WHERE u.id_usuario = $1`,
    [idUsuario]
  );
  return rows[0] || null;
}

async function listarUsuarios() {
  const { rows } = await query(
    `SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.estado_bloqueo,
            u.fecha_creacion, u.ultimo_acceso, u.id_rol, r.nombre_rol
       FROM usuarios u
       JOIN roles r ON r.id_rol = u.id_rol
      ORDER BY u.id_usuario`
  );
  return rows;
}

async function actualizarRolUsuario(idUsuario, idRol) {
  const { rows } = await query(
    `UPDATE usuarios SET id_rol = $2 WHERE id_usuario = $1
     RETURNING id_usuario, nombre, apellido, email, id_rol`,
    [idUsuario, idRol]
  );
  return rows[0] || null;
}

async function actualizarUltimoAcceso(idUsuario) {
  await query('UPDATE usuarios SET ultimo_acceso = now() WHERE id_usuario = $1', [idUsuario]);
}

async function fijarBloqueo(idUsuario, bloqueado) {
  await query('UPDATE usuarios SET estado_bloqueo = $2 WHERE id_usuario = $1', [idUsuario, bloqueado]);
}

// ---------- Credenciales / MFA ----------
async function crearCredencial(idUsuario, { mfaActivo = false, mfaSecret = null } = {}) {
  const { rows } = await query(
    `INSERT INTO credenciales (id_usuario, mfa_activo, mfa_secret)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [idUsuario, mfaActivo, mfaSecret]
  );
  return rows[0];
}

async function obtenerCredencialPorUsuario(idUsuario) {
  const { rows } = await query('SELECT * FROM credenciales WHERE id_usuario = $1', [idUsuario]);
  return rows[0] || null;
}

async function registrarIntentoFallido(idUsuario, intentos) {
  await query('UPDATE credenciales SET intento_fallido = $2 WHERE id_usuario = $1', [idUsuario, intentos]);
}

async function reiniciarIntentosFallidos(idUsuario) {
  await query('UPDATE credenciales SET intento_fallido = 0 WHERE id_usuario = $1', [idUsuario]);
}

async function activarMfa(idUsuario, mfaSecret) {
  await query(
    'UPDATE credenciales SET mfa_activo = TRUE, mfa_secret = $2 WHERE id_usuario = $1',
    [idUsuario, mfaSecret]
  );
}

// ---------- Áreas consultivas ----------
async function listarAreas() {
  const { rows } = await query('SELECT * FROM areas_consultivas ORDER BY id_area');
  return rows;
}

// ---------- Finanzas ----------
async function listarFinanzas({ desde, hasta } = {}) {
  const condiciones = [];
  const params = [];

  if (desde) {
    params.push(desde);
    condiciones.push(`f.fecha >= $${params.length}`);
  }
  if (hasta) {
    params.push(hasta);
    condiciones.push(`f.fecha <= $${params.length}`);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const { rows } = await query(
    `SELECT f.id_finanza, f.tipo_movimiento, f.monto, f.fecha, f.descripcion, f.categoria,
            a.id_area, a.nombre_area
       FROM finanzas f
       JOIN areas_consultivas a ON a.id_area = f.id_area
       ${where}
      ORDER BY f.fecha DESC`,
    params
  );
  return rows;
}

async function crearMovimientoFinanciero({ idArea, tipoMovimiento, monto, fecha, descripcion, categoria }) {
  const { rows } = await query(
    `INSERT INTO finanzas (id_area, tipo_movimiento, monto, fecha, descripcion, categoria)
     VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE), $5, $6)
     RETURNING *`,
    [idArea, tipoMovimiento, monto, fecha, descripcion, categoria]
  );
  return rows[0];
}

module.exports = {
  listarRoles,
  obtenerRolPorNombre,
  crearUsuario,
  obtenerUsuarioPorEmail,
  obtenerUsuarioPorId,
  listarUsuarios,
  actualizarRolUsuario,
  actualizarUltimoAcceso,
  fijarBloqueo,
  crearCredencial,
  obtenerCredencialPorUsuario,
  registrarIntentoFallido,
  reiniciarIntentosFallidos,
  activarMfa,
  listarAreas,
  listarFinanzas,
  crearMovimientoFinanciero
};
