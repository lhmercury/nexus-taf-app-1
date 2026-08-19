/**
 * Middleware de control de acceso por roles. Úsalo después de requireAuth:
 *   router.get('/users', requireAuth, requireRole('Administrador'), ctrl.listar);
 */
function requireRole(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autenticado.' });
    }
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        error: `Tu rol (${req.usuario.rol}) no tiene permiso para esta acción.`
      });
    }
    next();
  };
}

module.exports = requireRole;
