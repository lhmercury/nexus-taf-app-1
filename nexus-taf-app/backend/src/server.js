require('dotenv').config();

const crearApp = require('./app');
const { testConnection } = require('./config/postgres');
const { connectMongo } = require('./config/mongo');

const PORT = process.env.PORT || 4000;

async function iniciar() {
  console.log('==============================================');
  console.log(' NEXUS-TAF API — arrancando...');
  console.log(`  entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log('==============================================');

  try {
    await testConnection();
  } catch (err) {
    console.error('[server] No se pudo conectar a PostgreSQL:', err.message);
    console.error('[server] Revisa POSTGRES_URL en tu .env y que el contenedor/servicio esté corriendo.');
    process.exit(1);
  }

  try {
    await connectMongo();
  } catch (err) {
    console.error('[server] No se pudo conectar a MongoDB:', err.message);
    console.error('[server] Revisa MONGO_URL en tu .env y que el servicio esté corriendo.');
    process.exit(1);
  }

  const app = crearApp();

  app.listen(PORT, () => {
    console.log(`[server] Escuchando en http://localhost:${PORT}`);
    console.log(`[server] Salud: GET http://localhost:${PORT}/api/health`);
  });
}

iniciar();

process.on('unhandledRejection', (err) => {
  console.error('[server] Rechazo de promesa no manejado:', err);
});
