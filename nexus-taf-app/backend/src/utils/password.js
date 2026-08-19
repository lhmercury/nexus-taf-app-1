const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

async function hashPassword(passwordPlano) {
  return bcrypt.hash(passwordPlano, SALT_ROUNDS);
}

async function compararPassword(passwordPlano, passwordHash) {
  return bcrypt.compare(passwordPlano, passwordHash);
}

module.exports = { hashPassword, compararPassword };
