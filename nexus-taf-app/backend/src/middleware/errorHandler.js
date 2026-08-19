/**
 * Middleware de manejo de errores centralizado. Cualquier `next(err)` o
 * excepción no capturada dentro de una ruta async (ver utils/asyncHandler)
 * termina aquí, con una respuesta JSON consistente para el frontend.
 */
function errorHandler(err, req, res, _next) {
  console.error('[error]', err);

  const status = err.status || 500;
  const mensaje = status === 500 ? 'Error interno del servidor.' : err.message;

  res.status(status).json({ error: mensaje });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

/** Envuelve un handler async para que sus rechazos lleguen a errorHandler. */
function asyncHandler(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

module.exports = { errorHandler, notFoundHandler, asyncHandler };
