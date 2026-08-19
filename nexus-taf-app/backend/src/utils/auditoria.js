const { Auditoria } = require('../models/mongo');

/**
 * Registra un evento sensible en la colección `auditorias` de MongoDB.
 * Se llama desde los controladores en cada acción que el proyecto marca
 * como trazable: login, MFA, cambios de rol, cargas y descargas de
 * documentos, creación/edición de tareas, etc.
 *
 * Nunca debe lanzar una excepción que interrumpa la operación principal:
 * si la auditoría falla, se registra el error en consola y se continúa.
 */
async function registrarAuditoria({ idUsuario = null, tipoEvento, moduloAfectado, ip = '', detalle = '' }) {
  try {
    await Auditoria.create({
      id_usuario: idUsuario,
      tipo_evento: tipoEvento,
      modulo_afectado: moduloAfectado,
      direccion_ip: ip,
      detalle_evento: detalle
    });
  } catch (err) {
    console.error('[auditoria] No se pudo registrar el evento:', err.message);
  }
}

function obtenerIp(req) {
  return (
    req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    ''
  );
}

module.exports = { registrarAuditoria, obtenerIp };
