const { Schema, model } = require('mongoose');

/**
 * Colección: sprints
 * Representa un ciclo de trabajo ágil dentro de un proyecto.
 */
const SprintSchema = new Schema(
  {
    id_proyecto: { type: Schema.Types.ObjectId, ref: 'Proyecto', required: true, index: true },
    nombre_sprint: { type: String, required: true },
    fecha_inicio: { type: Date, required: true },
    fecha_fin: { type: Date, required: true },
    objetivo_sprint: { type: String, default: '' },
    velocidad_estimada: { type: Number, default: 0 },
    estado: { type: String, enum: ['activo', 'cerrado'], default: 'activo' }
  },
  { timestamps: { createdAt: 'creado_en', updatedAt: 'actualizado_en' }, collection: 'sprints' }
);

module.exports = model('Sprint', SprintSchema);
