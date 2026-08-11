// Lectura de la bitacora que escribe config/initializers/e2e_stubs.rb.
//
// Es la EVIDENCIA VERIFICABLE de que la suite no le pego a ningun servicio
// externo: cada llamada al borde de red deja una linea JSON, y los specs
// afirman contra ella.
//
// Playwright corre en Node en la MISMA maquina que el webServer, asi que leer el
// archivo es legitimo y sincrono. Es la unica lectura de filesystem de la suite.
const fs = require("fs");
const path = require("path");
const { RAILS_ROOT } = require("./env");

const LOG = path.join(RAILS_ROOT, "tmp", "e2e", "stub_calls.log");

const clearStubCalls = () => {
  if (fs.existsSync(LOG)) fs.unlinkSync(LOG);
};

const readStubCalls = () =>
  fs.existsSync(LOG)
    ? fs
        .readFileSync(LOG, "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line))
    : [];

const lastStubCall = (service) =>
  readStubCalls().filter((c) => c.service === service).slice(-1)[0] || null;

module.exports = { LOG, clearStubCalls, readStubCalls, lastStubCall };
