// Deja el arbol de trabajo como estaba antes de la corrida.
//
// La suite escribe fuera de tmp/ en un solo sitio: public/uploads/report_expense/,
// porque el webServer corre con E2E_UPLOAD_ROOT=public y es lo que hace que la
// descarga del escenario 4 no de 404. Ese directorio se borra aqui para cumplir
// el criterio del paquete 01: `git status --porcelain` limpio tras correr la
// suite.
//
// DESVIACION DELIBERADA: `tmp/e2e/` NO se borra, aunque la Tarea del plan lo
// pedia. El criterio de aceptacion 12 del propio paquete exige que
// `tmp/e2e/stub_calls.log` EXISTA despues de `npm test` y tenga al menos 5
// lineas: es la evidencia auditable de que ninguna llamada salio a internet.
// Borrarlo aqui haria imposible verificar ese criterio. El directorio esta en
// .gitignore, asi que no ensucia `git status`, y cada spec que afirma sobre el
// log lo limpia en su propio beforeAll con clearStubCalls().
const fs = require("fs");
const path = require("path");
const { RAILS_ROOT } = require("./support/env");

module.exports = async () => {
  const uploads = path.join(RAILS_ROOT, "public", "uploads", "report_expense");

  if (fs.existsSync(uploads)) {
    fs.rmSync(uploads, { recursive: true, force: true });
    console.log(`[global-teardown] borrado ${uploads}`);
  }
};
