/**
 * Conexión a PostgreSQL — motor relacional de NEXUS-TAF.
 * Aquí viven: usuarios, roles, credenciales, areas_consultivas, finanzas.
 * Usamos un pool de conexiones (pg.Pool) en vez de un solo cliente para
 * soportar concurrencia real bajo carga, tal como exige el proyecto.
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
  // Un cliente inactivo del pool falló: lo registramos pero no tumbamos el proceso.
  console.error('[postgres] Error inesperado en cliente inactivo del pool:', err.message);
});

/**
 * Ejecuta una consulta parametrizada contra PostgreSQL.
 * Usar siempre placeholders ($1, $2, ...) — nunca concatenar strings —
 * para evitar inyección SQL.
 */
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  if (process.env.NODE_ENV !== 'production') {
    const ms = Date.now() - start;
    console.log(`[postgres] ${ms}ms · ${text.split('\n')[0].trim()}`);
  }
  return result;
}

async function testConnection() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.log('[postgres] Conexión establecida correctamente.');
  } finally {
    client.release();
  }
}

module.exports = { pool, query, testConnection };
