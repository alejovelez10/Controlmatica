// Arma un ZIP en memoria para los specs de carga de varios comprobantes.
//
// Sin dependencias, con el mismo formato que escribe cualquier compresor:
// cabeceras locales, directorio central y fin de directorio. Cada entrada puede
// ir comprimida ("deflate", lo normal) o guardada tal cual (`store: true`, lo
// que hacen algunos compresores con archivos que ya vienen comprimidos, como
// un PDF): el lector del navegador tiene que entender los dos.
const zlib = require("zlib");

function crc32(buf) {
  let crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    let c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// entradas: [{ name, data: Buffer, store?: true }]
function crearZip(entradas) {
  const partes = [];
  const centrales = [];
  let offset = 0;

  for (const e of entradas) {
    const nombre = Buffer.from(e.name, "utf8");
    const datos = e.store ? e.data : zlib.deflateRawSync(e.data);
    const metodo = e.store ? 0 : 8;
    const crc = crc32(e.data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // nombre en UTF-8
    local.writeUInt16LE(metodo, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(datos.length, 18);
    local.writeUInt32LE(e.data.length, 22);
    local.writeUInt16LE(nombre.length, 26);
    partes.push(local, nombre, datos);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(metodo, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(datos.length, 20);
    central.writeUInt32LE(e.data.length, 24);
    central.writeUInt16LE(nombre.length, 28);
    central.writeUInt32LE(offset, 42);
    centrales.push(central, nombre);

    offset += 30 + nombre.length + datos.length;
  }

  const directorio = Buffer.concat(centrales);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(entradas.length, 8);
  fin.writeUInt16LE(entradas.length, 10);
  fin.writeUInt32LE(directorio.length, 12);
  fin.writeUInt32LE(offset, 16);

  return Buffer.concat([...partes, directorio, fin]);
}

module.exports = { crearZip };
