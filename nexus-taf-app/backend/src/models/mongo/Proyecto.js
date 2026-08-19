const { Schema, model } = require('mongoose');

/**
 * Colección: proyectos
 * Representa cada consultoría o expediente atendido por Consultores TAF.
 */
const ProyectoSchema = new Schema(
  {
    nombre_proyecto: { type: String, required: true, trim: true },
    descripcion: { type: String, default: '' },
    // Referencia al id_usuario del cliente en PostgreSQL (relación entre motores híbridos)
    cliente_id: { type: Number, required: true, index: true },
    area: { type: String, default: 'Administración' },
    fecha_inicio: { type: Date, default: Date.now },
    fecha_fin_estimada: { type: Date },
    estado: {
      type: String,
      enum: ['planificado', 'en_progreso', 'en_revision', 'completado'],
      default: 'planificado'
    }
  },
  { timestamps: { createdAt: 'creado_en', updatedAt: 'actualizado_en' }, collection: 'proyectos' }
);

module.exports = model('Proyecto', ProyectoSchema);
