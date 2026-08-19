/**
 * Conexión a MongoDB — motor documental de NEXUS-TAF.
 * Aquí viven: proyectos, sprints, hitos, tareas, documentos, auditorias, descargas.
 */
const mongoose = require('mongoose');

async function connectMongo() {
  mongoose.set('strictQuery', true);

  await mongoose.connect(process.env.MONGO_URL, {
    serverSelectionTimeoutMS: 8000
  });

  console.log('[mongo] Conexión establecida correctamente.');

  mongoose.connection.on('error', (err) => {
    console.error('[mongo] Error de conexión:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[mongo] Conexión perdida. Mongoose reintentará automáticamente.');
  });
}

module.exports = { connectMongo, mongoose };
