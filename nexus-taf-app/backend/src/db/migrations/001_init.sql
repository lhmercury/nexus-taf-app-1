-- ============================================================
-- NEXUS-TAF · Migración inicial de PostgreSQL
-- Motor relacional: usuarios, roles, credenciales, áreas consultivas, finanzas.
-- Corresponde al subsistema SQL del Modelo Entidad-Relación documentado
-- en el proyecto NEXUS-TAF (autenticación, autorización y datos críticos).
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
  id_rol        SERIAL PRIMARY KEY,
  nombre_rol    VARCHAR(50) UNIQUE NOT NULL,
  descripcion   TEXT
);

CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario      SERIAL PRIMARY KEY,
  nombre          VARCHAR(100) NOT NULL,
  apellido        VARCHAR(100) NOT NULL,
  email           VARCHAR(150) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  estado_bloqueo  BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_creacion  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_acceso   TIMESTAMPTZ,
  id_rol          INTEGER NOT NULL REFERENCES roles(id_rol) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS credenciales (
  id_credencial     SERIAL PRIMARY KEY,
  id_usuario        INTEGER UNIQUE NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  mfa_activo        BOOLEAN NOT NULL DEFAULT FALSE,
  mfa_secret        VARCHAR(64),
  intento_fallido   INTEGER NOT NULL DEFAULT 0,
  ultimo_otp        VARCHAR(6),
  expiracion_otp    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS areas_consultivas (
  id_area       SERIAL PRIMARY KEY,
  nombre_area   VARCHAR(100) UNIQUE NOT NULL,
  estatus       VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estatus IN ('activo', 'inactivo'))
);

CREATE TABLE IF NOT EXISTS finanzas (
  id_finanza        SERIAL PRIMARY KEY,
  id_area           INTEGER NOT NULL REFERENCES areas_consultivas(id_area) ON DELETE RESTRICT,
  tipo_movimiento   VARCHAR(20) NOT NULL CHECK (tipo_movimiento IN ('ingreso', 'gasto')),
  monto             NUMERIC(12,2) NOT NULL CHECK (monto >= 0),
  fecha             DATE NOT NULL DEFAULT CURRENT_DATE,
  descripcion       TEXT,
  categoria         VARCHAR(50)
);

-- Índices de apoyo para las consultas más frecuentes del sistema
CREATE INDEX IF NOT EXISTS idx_usuarios_email       ON usuarios (email);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol          ON usuarios (id_rol);
CREATE INDEX IF NOT EXISTS idx_finanzas_area_fecha    ON finanzas (id_area, fecha);

-- Catálogo inicial de roles (idempotente)
INSERT INTO roles (nombre_rol, descripcion) VALUES
  ('Administrador', 'Control total del sistema: usuarios, roles y configuración.'),
  ('Directivo',      'Visualiza reportes ejecutivos e indicadores de negocio (BI).'),
  ('Consultor',      'Gestiona tareas, sprints y expedientes de sus proyectos asignados.'),
  ('Cliente',        'Accede al portal para dar seguimiento a su propia consultoría.')
ON CONFLICT (nombre_rol) DO NOTHING;

-- Catálogo inicial de áreas consultivas (según el catálogo vigente de Consultores TAF)
INSERT INTO areas_consultivas (nombre_area, estatus) VALUES
  ('Administración', 'activo'),
  ('Educación',       'activo'),
  ('Ambiente',        'inactivo'),
  ('Tecnología',      'inactivo')
ON CONFLICT (nombre_area) DO NOTHING;
