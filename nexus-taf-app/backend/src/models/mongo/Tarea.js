const { Schema, model } = require('mongoose');

/**
 * Colección: tareas
 * Unidad de trabajo del tablero Scrum. Sostiene el módulo operativo
 * (arrastrar y soltar entre "Por hacer", "En progreso" y "Hecho").
 */
const TareaSchema = new Schema(
  {
    id_sprint: { type: Schema.Types.ObjectId, ref: 'Sprint', required: true, index: true },
    titulo: { type: String, required: true, trim: true },
    descripcion: { type: String, default: '' },
    prioridad: { type: String, enum: ['baja', 'media', 'alta'], default: 'media' },
    estado: {
      type: String,
      enum: ['por_hacer', 'en_progreso', 'hecho'],
      default: 'por_hacer',
      index: true
    },
    // Referencia al id_usuario del consultor responsable (PostgreSQL)
    responsable_id: { type: Number },
    responsable_nombre: { type: String, default: '' },
    codigo: { type: String, default: '' }
  },
  { timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' }, collection: 'tareas' }
);

module.exports = model('Tarea', TareaSchema);
