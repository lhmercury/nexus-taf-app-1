const { Schema, model } = require('mongoose');

/**
 * Colección: descargas
 * Registro de cada evento de descarga de un documento, para trazabilidad
 * del módulo de descarga de archivos y reportes.
 */
const DescargaSchema = new Schema(
  {
    id_documento: { type: Schema.Types.ObjectId, ref: 'Documento', required: true, index: true },
    id_usuario: { type: Number, required: true },
    fecha_hora: { type: Date, default: Date.now },
    direccion_ip: { type: String, default: '' }
  },
  { collection: 'descargas' }
);

module.exports = model('Descarga', DescargaSchema);
