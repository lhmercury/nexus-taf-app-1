const { verificarToken } = require('../utils/jwt');

/**
 * Exige un token de acceso completo (stage: 'full') en el header
 * Authorization: Bearer <token>. Cuelga { id, rol } en req.usuario.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'No autenticado. Falta el token de acceso.' });
  }

  try {
    const payload = verificarToken(token);

    if (payload.stage !== 'full') {
      return res.status(401).json({ error: 'El token no completó la verificación MFA.' });
    }

    req.usuario = { id: payload.sub, rol: payload.rol };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

/**
 * Igual que requireAuth pero acepta también un token de pre-autenticación
 * (stage: 'mfa_pendiente'). Se usa únicamente en /api/auth/mfa.
 */
function requirePreAuthOrAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Falta el token de la sesión de login.' });
  }

  try {
    const payload = verificarToken(token);
    req.tokenPayload = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'La sesión de login expiró. Inicia sesión de nuevo.' });
  }
}

module.exports = { requireAuth, requirePreAuthOrAuth };
