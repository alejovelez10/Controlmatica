// Deja la BD en el estado semilla antes de la primera prueba y comprueba que el
// servidor contra el que vamos a correr TIENE los stubs de red activos.
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
const { BASE_URL } = require("./support/env");

// RIESGO 1 DEL PAQUETE 12, y no es teorico: con `reuseExistingServer: true`,
// Playwright reutiliza el `rails s -e test` que el desarrollador ya tuviera
// levantado. Si ese server arranco SIN E2E_STUBS=1, la suite le pega de verdad a
// datos.gov.co y al proveedor de IA: falla en CI, pasa en local, o peor, gasta
// creditos. La cabecera la pone config/initializers/e2e_stubs.rb dentro de su
// bloque guardado, asi que su ausencia significa exactamente "este server no
// tiene los stubs".
async function verificarStubs() {
  const respuesta = await fetch(BASE_URL, { redirect: "manual" });
  const cabecera = respuesta.headers.get("x-e2e-stubs");

  if (cabecera !== "on") {
    throw new Error(
      [
        "El servidor de " + BASE_URL + " NO tiene los stubs de red activos",
        "(falta la cabecera X-E2E-Stubs: on).",
        "",
        "Casi seguro Playwright reutilizo un `rails s -e test` que ya tenias",
        "levantado sin E2E_STUBS=1. Matalo y vuelve a correr la suite:",
        "  kill $(cat tmp/pids/server-test.pid) 2>/dev/null",
        "",
        "Correr asi le pegaria de verdad a datos.gov.co y al proveedor de IA.",
      ].join("\n")
    );
  }
}

module.exports = async () => {
  await verificarStubs();
  console.log("[global-setup] stubs de red verificados (X-E2E-Stubs: on)");
  console.log("[global-setup] reseed E2E");
  reseedE2E("ALL");
};
