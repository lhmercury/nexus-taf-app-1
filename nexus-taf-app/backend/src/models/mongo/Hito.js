const { Schema, model } = require('mongoose');

/**
 * Colección: hitos
 * Entregables o avances importantes de un proyecto. Es lo que alimenta
 * la línea de tiempo que ve el cliente en el Portal.
 */
const HitoSchema = new Schema(
  {
    id_proyecto: { type: Schema.Types.ObjectId, ref: 'Proyecto', required: true, index: true },
    nombre_hito: { type: String, required: true },
    descripcion: { type: String, default: '' },
    porcentaje_avance: { type: Number, min: 0, max: 100, default: 0 },
    fecha_estimacion: { type: Date },
    estado: { type: String, enum: ['pendiente', 'en_progreso', 'alcanzado'], default: 'pendiente' },
    orden: { type: Number, default: 0 }
  },
  { timestamps: { createdAt: 'creado_en', updatedAt: 'actualizado_en' }, collection: 'hitos' }
);

module.exports = model('Hito', HitoSchema);
