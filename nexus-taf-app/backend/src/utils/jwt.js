const jwt = require('jsonwebtoken');

/**
 * Emite el token de acceso completo, una vez superadas contraseña + MFA.
 * Contiene el id de usuario y su rol, que es lo que consultan los
 * middlewares de autorización en cada endpoint protegido.
 */
function firmarTokenAcceso({ idUsuario, rol }) {
  return jwt.sign(
    { sub: idUsuario, rol, stage: 'full' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

/**
 * Emite un token de corta duración tras validar solo la contraseña.
 * El cliente debe intercambiarlo por un token completo en /api/auth/mfa
 * enviando el código TOTP. No sirve para acceder a ningún otro endpoint.
 */
function firmarTokenPreAuth({ idUsuario }) {
  return jwt.sign(
    { sub: idUsuario, stage: 'mfa_pendiente' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_PREAUTH_EXPIRES_IN || '5m' }
  );
}

function verificarToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { firmarTokenAcceso, firmarTokenPreAuth, verificarToken };
