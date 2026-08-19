/**
 * Punto único de acceso al almacenamiento de documentos.
 *
 * Implementación actual: disco local (carpeta UPLOAD_DIR), suficiente
 * para desarrollo y para una primera puesta en producción pequeña.
 *
 * Para escalar en la nube (como prevé el proyecto: "S3, DigitalOcean
 * Spaces o volúmenes cifrados"), sustituye el cuerpo de estas dos
 * funciones por llamadas al SDK de tu proveedor — la firma de las
 * funciones (recibe/devuelve rutas y streams) no tiene que cambiar,
 * así que ningún controlador necesita tocarse.
 */
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

function asegurarCarpeta() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

function rutaAbsoluta(nombreArchivo) {
  return path.join(process.cwd(), UPLOAD_DIR, nombreArchivo);
}

function streamDeLectura(nombreArchivo) {
  return fs.createReadStream(rutaAbsoluta(nombreArchivo));
}

function existeArchivo(nombreArchivo) {
  return fs.existsSync(rutaAbsoluta(nombreArchivo));
}

module.exports = { UPLOAD_DIR, asegurarCarpeta, rutaAbsoluta, streamDeLectura, existeArchivo };
