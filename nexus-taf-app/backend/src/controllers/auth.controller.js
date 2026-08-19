const QRCode = require('qrcode');
const pg = require('../models/postgres');
const { hashPassword, compararPassword } = require('../utils/password');
const { generarSecreto, generarOtpAuthUrl, verificarCodigo, generarCodigoActual } = require('../utils/totp');
const { firmarTokenAcceso, firmarTokenPreAuth, verificarToken } = require('../utils/jwt');
const { registrarAuditoria, obtenerIp } = require('../utils/auditoria');

const MAX_INTENTOS = Number(process.env.MAX_LOGIN_ATTEMPTS || 5);

/**
 * POST /api/auth/register
 * Crea el usuario en PostgreSQL, su fila de credenciales con MFA ya
 * habilitado desde el primer momento (la seguridad "se construye desde
 * el inicio", como señala el proyecto), y devuelve el material para que
 * el frontend muestre el código QR de enrolamiento.
 */
async function register(req, res) {
  const { nombre, apellido, email, password, rol } = req.body;

  if (!nombre || !apellido || !email || !password) {
    return res.status(400).json({ error: 'nombre, apellido, email y password son obligatorios.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
  }

  const existente = await pg.obtenerUsuarioPorEmail(email);
  if (existente) {
    return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
  }

  const nombreRol = rol || 'Cliente';
  const filaRol = await pg.obtenerRolPorNombre(nombreRol);
  if (!filaRol) {
    return res.status(400).json({ error: `El rol "${nombreRol}" no existe.` });
  }

  const passwordHash = await hashPassword(password);
  const usuario = await pg.crearUsuario({ nombre, apellido, email, passwordHash, idRol: filaRol.id_rol });

  const secreto = generarSecreto();
  await pg.crearCredencial(usuario.id_usuario, { mfaActivo: true, mfaSecret: secreto });

  const otpauthUrl = generarOtpAuthUrl(email, secreto);
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

  await registrarAuditoria({
    idUsuario: usuario.id_usuario,
    tipoEvento: 'registro_usuario',
    moduloAfectado: 'seguridad',
    ip: obtenerIp(req),
    detalle: `Cuenta creada para ${email} con rol ${nombreRol}.`
  });

  return res.status(201).json({
    usuario: { id: usuario.id_usuario, nombre, apellido, email, rol: nombreRol },
    mfaSetup: {
      secreto,
      otpauthUrl,
      qrDataUrl,
      instrucciones: 'Escanea el código QR con Google Authenticator, Authy o similar, o ingresa la clave manualmente. La necesitarás para iniciar sesión.'
    }
  });
}

/**
 * POST /api/auth/login
 * Primer factor: email + password. Si el usuario tiene MFA activo
 * (siempre, salvo datos heredados), no se emite el token final aquí:
 * se emite un token de pre-autenticación de corta duración que solo
 * sirve para llamar a /api/auth/mfa.
 */
async function login(req, res) {
  const { email, password } = req.body;
  const ip = obtenerIp(req);

  if (!email || !password) {
    return res.status(400).json({ error: 'email y password son obligatorios.' });
  }

  const usuario = await pg.obtenerUsuarioPorEmail(email);
  if (!usuario) {
    // Mismo mensaje que "password incorrecta" para no revelar qué correos existen.
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }

  if (usuario.estado_bloqueo) {
    await registrarAuditoria({
      idUsuario: usuario.id_usuario,
      tipoEvento: 'login_bloqueado',
      moduloAfectado: 'seguridad',
      ip,
      detalle: 'Intento de acceso a una cuenta bloqueada por intentos fallidos.'
    });
    return res.status(423).json({ error: 'Esta cuenta está bloqueada. Contacta a un administrador.' });
  }

  const credencial = await pg.obtenerCredencialPorUsuario(usuario.id_usuario);
  const passwordOk = await compararPassword(password, usuario.password_hash);

  if (!passwordOk) {
    const intentos = (credencial?.intento_fallido || 0) + 1;
    await pg.registrarIntentoFallido(usuario.id_usuario, intentos);

    if (intentos >= MAX_INTENTOS) {
      await pg.fijarBloqueo(usuario.id_usuario, true);
      await registrarAuditoria({
        idUsuario: usuario.id_usuario,
        tipoEvento: 'cuenta_bloqueada',
        moduloAfectado: 'seguridad',
        ip,
        detalle: `Cuenta bloqueada tras ${intentos} intentos fallidos.`
      });
      return res.status(423).json({ error: 'Cuenta bloqueada por demasiados intentos fallidos.' });
    }

    await registrarAuditoria({
      idUsuario: usuario.id_usuario,
      tipoEvento: 'login_fallido',
      moduloAfectado: 'seguridad',
      ip,
      detalle: `Contraseña incorrecta (intento ${intentos}/${MAX_INTENTOS}).`
    });
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }

  await pg.reiniciarIntentosFallidos(usuario.id_usuario);

  if (!credencial?.mfa_activo) {
    // Caso poco común (p. ej. datos heredados sin MFA): se emite acceso directo.
    const token = firmarTokenAcceso({ idUsuario: usuario.id_usuario, rol: usuario.nombre_rol });
    await pg.actualizarUltimoAcceso(usuario.id_usuario);
    await registrarAuditoria({
      idUsuario: usuario.id_usuario,
      tipoEvento: 'login_exitoso_sin_mfa',
      moduloAfectado: 'seguridad',
      ip
    });
    return res.json({
      mfaRequired: false,
      accessToken: token,
      usuario: { id: usuario.id_usuario, nombre: usuario.nombre, apellido: usuario.apellido, email, rol: usuario.nombre_rol }
    });
  }

  const preAuthToken = firmarTokenPreAuth({ idUsuario: usuario.id_usuario });

  await registrarAuditoria({
    idUsuario: usuario.id_usuario,
    tipoEvento: 'password_verificada',
    moduloAfectado: 'seguridad',
    ip,
    detalle: 'Primer factor verificado; en espera del código MFA.'
  });

  return res.json({ mfaRequired: true, preAuthToken });
}

/**
 * POST /api/auth/mfa
 * Segundo factor: valida el código TOTP de 6 dígitos contra el secreto
 * guardado en credenciales y, si es correcto, emite el token de acceso
 * completo con el rol del usuario.
 */
async function verifyMfa(req, res) {
  const { code } = req.body;
  const payload = req.tokenPayload;
  const ip = obtenerIp(req);

  if (!payload || payload.stage !== 'mfa_pendiente') {
    return res.status(401).json({ error: 'No hay una sesión de login pendiente de MFA.' });
  }
  if (!code) {
    return res.status(400).json({ error: 'Falta el código de verificación.' });
  }

  const usuario = await pg.obtenerUsuarioPorId(payload.sub);
  if (!usuario) {
    return res.status(401).json({ error: 'Usuario no encontrado.' });
  }

  const credencial = await pg.obtenerCredencialPorUsuario(usuario.id_usuario);
  const valido = credencial?.mfa_secret && verificarCodigo(code, credencial.mfa_secret);

  if (!valido) {
    await registrarAuditoria({
      idUsuario: usuario.id_usuario,
      tipoEvento: 'mfa_fallido',
      moduloAfectado: 'seguridad',
      ip,
      detalle: 'Código TOTP incorrecto o expirado.'
    });
    return res.status(401).json({ error: 'Código de verificación incorrecto.' });
  }

  const token = firmarTokenAcceso({ idUsuario: usuario.id_usuario, rol: usuario.nombre_rol });
  await pg.actualizarUltimoAcceso(usuario.id_usuario);

  await registrarAuditoria({
    idUsuario: usuario.id_usuario,
    tipoEvento: 'login_exitoso',
    moduloAfectado: 'seguridad',
    ip,
    detalle: 'Autenticación completa (password + MFA).'
  });

  return res.json({
    accessToken: token,
    usuario: {
      id: usuario.id_usuario,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      rol: usuario.nombre_rol
    }
  });
}

/** GET /api/auth/me — perfil del usuario autenticado, útil para que el frontend restaure sesión. */
async function me(req, res) {
  const usuario = await pg.obtenerUsuarioPorId(req.usuario.id);
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });

  return res.json({
    id: usuario.id_usuario,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    email: usuario.email,
    rol: usuario.nombre_rol,
    ultimoAcceso: usuario.ultimo_acceso
  });
}

/**
 * GET /api/auth/dev/totp/:email — SOLO DESARROLLO.
 * Devuelve el código TOTP válido en este instante para una cuenta dada,
 * para poder probar el flujo de MFA completo en local sin necesitar una
 * app autenticadora física. Se bloquea automáticamente en producción.
 */
async function devTotp(req, res) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'No encontrado.' });
  }

  const usuario = await pg.obtenerUsuarioPorEmail(req.params.email);
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });

  const credencial = await pg.obtenerCredencialPorUsuario(usuario.id_usuario);
  if (!credencial?.mfa_secret) {
    return res.status(400).json({ error: 'Este usuario no tiene MFA configurado.' });
  }

  return res.json({
    email: usuario.email,
    codigoActual: generarCodigoActual(credencial.mfa_secret),
    advertencia: 'Endpoint disponible solo en NODE_ENV distinto de "production". Elimina o protege este acceso antes de desplegar.'
  });
}

module.exports = { register, login, verifyMfa, me, devTotp };
