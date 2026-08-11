// Deja la BD en el estado semilla antes de la primera prueba.
//
// POR QUE AQUI SOLO VA EL SEED Y NO EL prepare COMPLETO:
// en Playwright 1.62 el `webServer` arranca ANTES que el `globalSetup` (al reves
// de lo que suponia el diseno original). Poner db:test:prepare aqui reventaba
// con PG::ObjectInUse, porque db:test:purge hace DROP DATABASE y el server de
// test ya tenia la conexion abierta. Por eso el prepare completo (BD + packs +
// seed) va encadenado en `webServer.command`, que corre antes de que el server
// escuche, y aqui queda solo el reseed.
//
// El reseed de aqui SI hace falta aunque el prepare ya haya sembrado: cuando
// reuseExistingServer reutiliza un server que ya estaba arriba, el
// webServer.command no corre y esta es la unica siembra de la corrida.
const { reseedE2E } = require("./support/db");

module.exports = async () => {
  console.log("[global-setup] reseed E2E");
  reseedE2E({ silent: true });
};
