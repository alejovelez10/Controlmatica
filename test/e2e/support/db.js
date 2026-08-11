// Vuelve a dejar la BD de test en el estado semilla.
//
// Lo llaman en `test.beforeAll` los specs que MUTAN datos (crear, editar o
// borrar gastos). Los specs de solo lectura no lo necesitan: el globalSetup ya
// sembro una vez.
//
// Es sincrono a proposito: Playwright serializa los hooks y un seed a medias
// produce fallos intermitentes imposibles de atribuir.
const { seed } = require("../scripts/seed");

function reseedE2E({ silent = true } = {}) {
  seed({ silent });
}

module.exports = { reseedE2E };
