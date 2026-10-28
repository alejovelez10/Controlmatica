// CARGA DE VARIOS COMPROBANTES (2026-10-18): un ZIP, o varios archivos sueltos,
// que la pantalla de Gastos recorre uno por uno con el formulario de crear
// gasto ya lleno por la lectura del comprobante.
//
// Este modulo solo PREPARA los archivos: abre el ZIP, descarta lo que no es un
// comprobante, aplica los limites y marca los repetidos. No sabe nada del
// formulario ni del servidor.
//
// EL ZIP SE ABRE EN EL NAVEGADOR Y SIN LIBRERIAS. En el navegador porque cada
// comprobante tiene que terminar siendo un File para reusar el mismo camino del
// formulario (lectura con la IA + guardado con el archivo adjunto): mandarlo al
// servidor y traerlo de vuelta seria subir todo dos veces, y Heroku corta las
// peticiones a los 30 segundos. Sin librerias porque el formato que hace falta
// es chico —el directorio central de un ZIP y "deflate"— y el navegador ya trae
// el descompresor (DecompressionStream). El proyecto corre webpack 3, y una
// libreria nueva es una apuesta en el build de produccion que esto no necesita.

// Los mismos formatos y el mismo tope que el servidor (ReceiptUploader): lo que
// pase de aqui el servidor lo recibe.
export var EXTENSIONES = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg",
                           png: "image/png", webp: "image/webp", heic: "image/heic" };
export var TOPE_ARCHIVO = 20 * 1024 * 1024;
// Los del lote. Maximo 20 comprobantes por carga (2026-10-28, pedido del
// usuario; antes 50): se revisan uno por uno, y mas que eso se parte en varias
// cargas. Los que sobran quedan en la lista de «no entraron» con el motivo.
export var MAX_COMPROBANTES = 20;
export var TOPE_ZIP = 100 * 1024 * 1024;

export var ACCEPT_LOTE = ".zip,.pdf,.jpg,.jpeg,.png,.webp,.heic";

function extension(nombre) {
  var m = /\.([a-z0-9]+)$/i.exec(nombre || "");
  return m ? m[1].toLowerCase() : "";
}

function nombreBase(ruta) {
  var partes = String(ruta || "").split("/");
  return partes[partes.length - 1];
}

// Lo que mete el sistema operativo al comprimir y no es de nadie: la carpeta
// __MACOSX de Mac, los .DS_Store y los ocultos en general, y el Thumbs.db de
// Windows.
function esBasuraDelSistema(ruta) {
  var base = nombreBase(ruta);
  return /(^|\/)__MACOSX\//.test(ruta) || base.charAt(0) === "." || /^thumbs\.db$/i.test(base);
}

function esZip(file) {
  return extension(file.name) === "zip" || file.type === "application/zip" || file.type === "application/x-zip-compressed";
}

// => Promise<[{ ruta, blob }]>. Lanza Error con un mensaje para la persona si
// el ZIP no se puede leer.
export function leerZip(file) {
  return file.arrayBuffer().then(function(buf) {
    var dv = new DataView(buf);
    var largo = buf.byteLength;

    // Fin del directorio central: firma 0x06054b50, buscada desde el final
    // porque el ZIP puede traer un comentario de hasta 64 KB detras.
    var fin = -1;
    for (var i = largo - 22; i >= Math.max(0, largo - 22 - 65535); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { fin = i; break; }
    }
    if (fin < 0) throw new Error("El archivo no es un ZIP válido.");

    var total = dv.getUint16(fin + 10, true);
    var p = dv.getUint32(fin + 16, true);
    if (p === 0xffffffff || total === 0xffff) throw new Error("El ZIP es demasiado grande. Pártalo en varios.");

    var utf8 = new TextDecoder("utf-8");
    var entradas = [];
    for (var n = 0; n < total; n++) {
      if (p + 46 > largo || dv.getUint32(p, true) !== 0x02014b50) throw new Error("El ZIP está dañado.");
      var flags = dv.getUint16(p + 8, true);
      var metodo = dv.getUint16(p + 10, true);
      var comprimido = dv.getUint32(p + 20, true);
      var largoNombre = dv.getUint16(p + 28, true);
      var largoExtra = dv.getUint16(p + 30, true);
      var largoComentario = dv.getUint16(p + 32, true);
      var local = dv.getUint32(p + 42, true);
      var ruta = utf8.decode(new Uint8Array(buf, p + 46, largoNombre));
      entradas.push({ ruta: ruta, flags: flags, metodo: metodo, comprimido: comprimido, local: local });
      p += 46 + largoNombre + largoExtra + largoComentario;
    }

    var archivos = entradas.filter(function(e) { return !/\/$/.test(e.ruta) && !esBasuraDelSistema(e.ruta); });
    return Promise.all(archivos.map(function(e) {
      // Cifrado o con un metodo que no es "guardado" (0) ni "deflate" (8): se
      // reporta como ignorado, no rompe el lote.
      if (e.flags & 0x1) return { ruta: e.ruta, error: "está protegido con contraseña" };
      if (e.metodo !== 0 && e.metodo !== 8) return { ruta: e.ruta, error: "usa una compresión que no se puede leer" };

      var largoNombreLocal = dv.getUint16(e.local + 26, true);
      var largoExtraLocal = dv.getUint16(e.local + 28, true);
      var inicio = e.local + 30 + largoNombreLocal + largoExtraLocal;
      var datos = new Blob([new Uint8Array(buf, inicio, e.comprimido)]);
      if (e.metodo === 0) return { ruta: e.ruta, blob: datos };

      var flujo = datos.stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return new Response(flujo).blob()
        .then(function(blob) { return { ruta: e.ruta, blob: blob }; })
        .catch(function() { return { ruta: e.ruta, error: "está dañado" }; });
    }));
  });
}

function huella(file) {
  if (!(window.crypto && window.crypto.subtle)) return Promise.resolve(null);
  return file.arrayBuffer()
    .then(function(buf) { return window.crypto.subtle.digest("SHA-256", buf); })
    .then(function(h) { return Array.from(new Uint8Array(h)).map(function(b) { return ("0" + b.toString(16)).slice(-2); }).join(""); })
    .catch(function() { return null; });
}

// Prepara el lote a partir de lo que eligio la persona (ZIPs y archivos
// sueltos, mezclados).
//
// => Promise<{ items: [{ id, name, file }], ignorados: [{ name, motivo }] }>
//
// Los REPETIDOS (mismo contenido byte a byte) se ignoran ANTES de leerlos:
// cada lectura es una llamada a la IA, y el mismo PDF dos veces en el ZIP es
// el caso mas comun de "lo subi dos veces".
export function prepararLote(archivos) {
  var ignorados = [];
  var lista = Array.prototype.slice.call(archivos || []);

  return Promise.all(lista.map(function(f) {
    if (!esZip(f)) return [{ ruta: f.name, blob: f }];
    if (f.size > TOPE_ZIP) {
      ignorados.push({ name: f.name, motivo: "el ZIP pesa más de 100 MB; pártalo en varios" });
      return [];
    }
    return leerZip(f).catch(function(e) {
      ignorados.push({ name: f.name, motivo: e.message || "no se pudo abrir" });
      return [];
    });
  })).then(function(grupos) {
    var candidatos = [];
    grupos.forEach(function(g) { candidatos = candidatos.concat(g); });

    var validos = [];
    candidatos.forEach(function(c) {
      var nombre = nombreBase(c.ruta);
      var tipo = EXTENSIONES[extension(nombre)];
      if (c.error) return ignorados.push({ name: nombre, motivo: c.error });
      if (!tipo) return ignorados.push({ name: nombre, motivo: "no es PDF ni imagen" });
      if (!c.blob.size) return ignorados.push({ name: nombre, motivo: "está vacío" });
      if (c.blob.size > TOPE_ARCHIVO) return ignorados.push({ name: nombre, motivo: "pesa más de 20 MB" });
      validos.push(new File([c.blob], nombre, { type: tipo }));
    });

    return Promise.all(validos.map(huella)).then(function(huellas) {
      var vistos = {};
      var items = [];
      validos.forEach(function(file, i) {
        var h = huellas[i];
        if (h && vistos[h]) return ignorados.push({ name: file.name, motivo: "es el mismo archivo que " + vistos[h] });
        if (h) vistos[h] = file.name;
        if (items.length >= MAX_COMPROBANTES) {
          return ignorados.push({ name: file.name, motivo: "la carga masiva admite " + MAX_COMPROBANTES + " comprobantes; súbalo en otra carga" });
        }
        items.push({ id: "c" + i, name: file.name, file: file });
      });
      return { items: items, ignorados: ignorados };
    });
  });
}
