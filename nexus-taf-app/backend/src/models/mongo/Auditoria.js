const { Schema, model } = require('mongoose');

/**
 * Colección: auditorias
 * Log inmutable de eventos sensibles del sistema (login, cambios de rol,
 * cargas y descargas de documentos, etc.). Garantiza trazabilidad y no repudio.
 * No se actualiza ni se borra: solo se inserta.
 */
const AuditoriaSchema = new Schema(
  {
    id_usuario: { type: Number, default: null },
    tipo_evento: { type: String, required: true },
    modulo_afectado: { type: String, required: true },
    fecha_hora: { type: Date, default: Date.now },
    direccion_ip: { type: String, default: '' },
    detalle_evento: { type: String, default: '' }
  },
  { collection: 'auditorias' }
);

module.exports = model('Auditoria', AuditoriaSchema);
