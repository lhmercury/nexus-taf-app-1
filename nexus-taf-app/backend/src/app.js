const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const tasksRoutes = require('./routes/tasks.routes');
const projectsRoutes = require('./routes/projects.routes');
const documentsRoutes = require('./routes/documents.routes');
const biRoutes = require('./routes/bi.routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

function crearApp() {
  const app = express();

  // Orígenes permitidos para el frontend (separados por coma en .env)
  const origenesPermitidos = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(
    helmet({
      // El QR de MFA se sirve como data:URL embebido en el JSON de /register,
      // no como <img> cross-origin, así que no hace falta relajar más políticas.
      crossOriginResourcePolicy: { policy: 'cross-origin' }
    })
  );
  app.use(
    cors({
      origin(origin, callback) {
        // Permite herramientas sin origin (curl, Postman) y cualquier
        // origen listado explícitamente en CORS_ORIGIN.
        if (!origin || origenesPermitidos.length === 0 || origenesPermitidos.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('Origen no permitido por CORS.'));
      },
      credentials: true
    })
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', servicio: 'NEXUS-TAF API', hora: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api', usersRoutes);
  app.use('/api', tasksRoutes);
  app.use('/api', projectsRoutes);
  app.use('/api', documentsRoutes);
  app.use('/api', biRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = crearApp;
