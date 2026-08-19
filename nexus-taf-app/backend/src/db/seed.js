/**
 * Puebla ambas bases de datos con información de demostración, para que
 * la aplicación se pueda probar de punta a punta apenas termine `npm run setup`.
 * Es idempotente: se puede correr varias veces sin duplicar datos.
 *
 * Uso: npm run seed
 */
require('dotenv').config();

const { pool, query } = require('../config/postgres');
const { connectMongo, mongoose } = require('../config/mongo');
const pg = require('./../models/postgres');
const { hashPassword } = require('../utils/password');
const { generarSecreto } = require('../utils/totp');
const { Proyecto, Sprint, Hito, Tarea } = require('../models/mongo');

const USUARIOS_DEMO = [
  { nombre: 'Rosana', apellido: 'Ochoa', email: 'admin@consultorestaf.com', password: 'Admin123!', rol: 'Administrador' },
  { nombre: 'Leticia', apellido: 'Cuevas', email: 'directivo@consultorestaf.com', password: 'Directivo123!', rol: 'Directivo' },
  { nombre: 'Julián', apellido: 'Pérez', email: 'consultor@consultorestaf.com', password: 'Consultor123!', rol: 'Consultor' },
  { nombre: 'Empresa', apellido: 'XYZ, C.A.', email: 'cliente@empresa-xyz.com', password: 'Cliente123!', rol: 'Cliente' }
];

async function seedUsuarios() {
  const idsPorEmail = {};

  for (const datos of USUARIOS_DEMO) {
    const existente = await pg.obtenerUsuarioPorEmail(datos.email);

    if (existente) {
      console.log(`[seed] Usuario ya existe, se omite: ${datos.email}`);
      idsPorEmail[datos.email] = existente.id_usuario;
      continue;
    }

    const filaRol = await pg.obtenerRolPorNombre(datos.rol);
    const passwordHash = await hashPassword(datos.password);
    const usuario = await pg.crearUsuario({
      nombre: datos.nombre,
      apellido: datos.apellido,
      email: datos.email,
      passwordHash,
      idRol: filaRol.id_rol
    });

    const secreto = generarSecreto();
    await pg.crearCredencial(usuario.id_usuario, { mfaActivo: true, mfaSecret: secreto });

    idsPorEmail[datos.email] = usuario.id_usuario;
    console.log(`[seed] Usuario creado: ${datos.email} (rol ${datos.rol})`);
  }

  return idsPorEmail;
}

async function seedFinanzas() {
  const { rows: existentes } = await query('SELECT COUNT(*)::int AS n FROM finanzas');
  if (existentes[0].n > 0) {
    console.log('[seed] Ya existen movimientos financieros, se omite.');
    return;
  }

  const areas = await pg.listarAreas();
  const porNombre = Object.fromEntries(areas.map((a) => [a.nombre_area, a.id_area]));

  const movimientos = [
    { area: 'Administración', tipo: 'ingreso', monto: 32000, categoria: 'Honorarios de consultoría' },
    { area: 'Administración', tipo: 'gasto', monto: 8000, categoria: 'Operación' },
    { area: 'Educación', tipo: 'ingreso', monto: 15400, categoria: 'Talleres y formación' },
    { area: 'Educación', tipo: 'gasto', monto: 4100, categoria: 'Materiales didácticos' },
    { area: 'Ambiente', tipo: 'ingreso', monto: 2200, categoria: 'Asesoría puntual' },
    { area: 'Ambiente', tipo: 'gasto', monto: 900, categoria: 'Estudios de campo' },
    { area: 'Tecnología', tipo: 'ingreso', monto: 1800, categoria: 'Gestión de redes' },
    { area: 'Tecnología', tipo: 'gasto', monto: 600, categoria: 'Herramientas' }
  ];

  for (const m of movimientos) {
    await pg.crearMovimientoFinanciero({
      idArea: porNombre[m.area],
      tipoMovimiento: m.tipo,
      monto: m.monto,
      fecha: null,
      descripcion: m.categoria,
      categoria: m.categoria
    });
  }
  console.log(`[seed] ${movimientos.length} movimientos financieros creados.`);
}

async function seedProyectoOperativo(idsPorEmail) {
  const clienteId = idsPorEmail['cliente@empresa-xyz.com'];
  const consultorId = idsPorEmail['consultor@consultorestaf.com'];

  let proyecto = await Proyecto.findOne({ cliente_id: clienteId, nombre_proyecto: 'Constitución de empresa · Empresa XYZ' });

  if (proyecto) {
    console.log('[seed] Proyecto de demostración ya existe, se omite.');
    return;
  }

  proyecto = await Proyecto.create({
    nombre_proyecto: 'Constitución de empresa · Empresa XYZ',
    descripcion: 'Acompañamiento integral para la constitución legal y puesta en marcha administrativa de Empresa XYZ, C.A.',
    cliente_id: clienteId,
    area: 'Administración',
    estado: 'en_progreso'
  });

  await Hito.insertMany([
    { id_proyecto: proyecto._id, nombre_hito: 'Diagnóstico inicial', porcentaje_avance: 100, estado: 'alcanzado', orden: 1 },
    { id_proyecto: proyecto._id, nombre_hito: 'Elaboración de expediente', porcentaje_avance: 100, estado: 'alcanzado', orden: 2 },
    { id_proyecto: proyecto._id, nombre_hito: 'Radicación ante el registro', porcentaje_avance: 40, estado: 'en_progreso', orden: 3 },
    { id_proyecto: proyecto._id, nombre_hito: 'Entrega de certificado', porcentaje_avance: 0, estado: 'pendiente', orden: 4 }
  ]);

  const hoy = new Date();
  const inicioSprint = new Date(hoy);
  inicioSprint.setDate(hoy.getDate() - 6);
  const finSprint = new Date(hoy);
  finSprint.setDate(hoy.getDate() + 8);

  const sprint = await Sprint.create({
    id_proyecto: proyecto._id,
    nombre_sprint: 'Sprint 2 · Módulo Operativo',
    fecha_inicio: inicioSprint,
    fecha_fin: finSprint,
    objetivo_sprint: 'Completar la radicación del expediente y preparar la entrega del certificado.',
    estado: 'activo'
  });

  await Tarea.insertMany([
    {
      id_sprint: sprint._id,
      titulo: 'Frontend de autenticación MFA',
      estado: 'hecho',
      prioridad: 'alta',
      codigo: 'TS01-07',
      responsable_id: consultorId,
      responsable_nombre: 'Julián Pérez'
    },
    {
      id_sprint: sprint._id,
      titulo: 'Esquema de base de datos híbrida',
      estado: 'hecho',
      prioridad: 'alta',
      codigo: 'TS01-02',
      responsable_id: consultorId,
      responsable_nombre: 'Julián Pérez'
    },
    {
      id_sprint: sprint._id,
      titulo: 'Integración de firma digital',
      estado: 'en_progreso',
      prioridad: 'alta',
      codigo: 'TS02-02',
      responsable_id: consultorId,
      responsable_nombre: 'Julián Pérez'
    },
    {
      id_sprint: sprint._id,
      titulo: 'Diseño de formulario de hitos',
      estado: 'por_hacer',
      prioridad: 'media',
      codigo: 'TS03-04',
      responsable_id: consultorId,
      responsable_nombre: 'Julián Pérez'
    },
    {
      id_sprint: sprint._id,
      titulo: 'Validación de carga de archivos',
      estado: 'por_hacer',
      prioridad: 'media',
      codigo: 'TS03-06',
      responsable_id: consultorId,
      responsable_nombre: 'Julián Pérez'
    }
  ]);

  console.log('[seed] Proyecto, sprint, hitos y tareas de demostración creados.');
}

async function run() {
  await connectMongo();

  const idsPorEmail = await seedUsuarios();
  await seedFinanzas();
  await seedProyectoOperativo(idsPorEmail);

  console.log('\n[seed] Listo. Credenciales de demostración (todas con MFA activo):');
  for (const u of USUARIOS_DEMO) {
    console.log(`   · ${u.rol.padEnd(14)} ${u.email.padEnd(28)} contraseña: ${u.password}`);
  }
  console.log('\n[seed] Para obtener el código MFA vigente de cualquiera de estas cuentas en desarrollo:');
  console.log('   GET /api/auth/dev/totp/:email   (deshabilitado automáticamente en producción)\n');
}

run()
  .catch((err) => {
    console.error('[seed] Error poblando la base de datos:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
    await mongoose.disconnect();
  });
