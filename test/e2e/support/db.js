// Vuelve a dejar la BD de test en el estado semilla.
//
// Lo llaman en `test.beforeAll` los specs que MUTAN datos (crear, editar o
// borrar gastos). Los specs de solo lectura no lo necesitan: el globalSetup ya
// sembro una vez.
//
// Es sincrono a proposito: Playwright serializa los hooks y un seed a medias
// produce fallos intermitentes imposibles de atribuir.
//
// `scope` acota la siembra al centro de costo de ese spec (paquete 12): asi
// resembrar `BUD` no toca los 57 gastos de `PAG` ni los 2 del smoke del
// paquete 01.
const { seed } = require("../scripts/seed");

function reseedE2E(scope = "ALL", { silent = true } = {}) {
  // Compatibilidad con la firma del paquete 01: reseedE2E({ silent: true }).
  if (typeof scope === "object" && scope !== null) {
    return seed({ silent: scope.silent !== false, scope: "ALL" });
  }

  seed({ silent, scope });
}

module.exports = { reseedE2E };
