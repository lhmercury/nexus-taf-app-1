const { Schema, model } = require('mongoose');

/**
 * Colección: documentos
 * Metadatos de archivos cargados o descargados en el Portal del Cliente.
 * El binario vive en disco (o en un bucket S3 en producción); aquí solo
 * se guarda la referencia y la trazabilidad.
 */
const DocumentoSchema = new Schema(
  {
    // Referencia al id_usuario del cliente (PostgreSQL)
    id_cliente: { type: Number, required: true, index: true },
    id_proyecto: { type: Schema.Types.ObjectId, ref: 'Proyecto' },
    nombre_archivo: { type: String, required: true },
    nombre_original: { type: String, required: true },
    tipo_archivo: { type: String, required: true },
    ruta_almacenamiento: { type: String, required: true },
    tamano: { type: Number, required: true },
    firmado_digitalmente: { type: Boolean, default: false },
    fecha_carga: { type: Date, default: Date.now },
    estado_validacion: { type: String, enum: ['pendiente', 'validado', 'rechazado'], default: 'validado' },
    subido_por: { type: Number }
  },
  { timestamps: { createdAt: 'creado_en', updatedAt: 'actualizado_en' }, collection: 'documentos' }
);

module.exports = model('Documento', DocumentoSchema);
