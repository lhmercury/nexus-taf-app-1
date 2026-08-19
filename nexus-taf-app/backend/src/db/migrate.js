/**
 * Ejecuta las migraciones SQL de PostgreSQL en orden.
 * Uso: npm run migrate
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/postgres');

async function run() {
  const dir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

  if (files.length === 0) {
    console.log('[migrate] No se encontraron archivos .sql en', dir);
    return;
  }

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const sql = fs.readFileSync(fullPath, 'utf8');
    console.log(`[migrate] Aplicando ${file} ...`);
    await pool.query(sql);
    console.log(`[migrate] ${file} aplicada correctamente.`);
  }

  console.log('[migrate] Todas las migraciones se aplicaron con éxito.');
}

run()
  .catch((err) => {
    console.error('[migrate] Error aplicando migraciones:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
