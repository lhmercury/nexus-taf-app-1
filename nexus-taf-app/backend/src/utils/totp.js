const { authenticator } = require('otplib');

/**
 * MFA por código TOTP de un solo uso (RFC 6238) — el mismo estándar que
 * usan Google Authenticator, Authy o 1Password.
 */

// Tolerancia de ±1 paso (±30s) para absorber pequeños desfaces de reloj
// entre el servidor y el dispositivo del usuario.
authenticator.options = { window: 1 };

function generarSecreto() {
  return authenticator.generateSecret();
}

function generarOtpAuthUrl(email, secreto) {
  const issuer = process.env.TOTP_ISSUER || 'NEXUS-TAF';
  return authenticator.keyuri(email, issuer, secreto);
}

function verificarCodigo(codigo, secreto) {
  try {
    return authenticator.verify({ token: String(codigo), secret: secreto });
  } catch (err) {
    return false;
  }
}

/** Solo para desarrollo local: genera el código válido en este instante,
 * así se puede probar el flujo de MFA completo sin una app autenticadora real.
 * Se usa exclusivamente detrás de una ruta bloqueada en producción
 * (ver routes/auth.routes.js). */
function generarCodigoActual(secreto) {
  return authenticator.generate(secreto);
}

module.exports = { generarSecreto, generarOtpAuthUrl, verificarCodigo, generarCodigoActual };
