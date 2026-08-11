// Helper UNICO del formulario de gasto. Lo usan los 5 specs que crean gastos.
//
// El formulario esta DUPLICADO en el proyecto (00-ARQUITECTURA 4.5):
//   - `packs/ReportExpenseIndex.js#renderModal()`   -> el del indice de Gastos
//   - `components/ReportExpense/FormCreate.jsx`     -> el de la pestana del centro
// Los dos emiten los mismos data-testid, asi que este helper sirve para ambos y
// la suite cubre los dos formularios con un solo juego de escenarios.
//
// TRES TRAMPAS VERIFICADAS EN EL CODIGO REAL, encapsuladas aqui para que ningun
// spec las vuelva a pagar:
//
// 1. Los react-select usan `menuPortalTarget: document.body`: sus opciones se
//    renderizan FUERA del modal. Buscarlas con `modal.getByText(...)` termina en
//    un timeout de 15 s sin pista. Por eso aqui se seleccionan POR TECLADO
//    (escribir + Enter), que ademas es lo que hace una persona y no depende de
//    las clases que genera emotion.
// 2. El select de centro no consulta nada hasta 3 caracteres y tiene un debounce
//    de 300 ms contra GET /search_cost_centers. Un `fill` + Enter inmediato no
//    dispara la peticion, el formulario se envia sin cost_center_id, handleSubmit
//    sale por el `if` de validacion y NO hay request: el waitForResponse se
//    cuelga.
// 3. Valor e IVA son NumberFormat con prefijo "$"; el Total es `disabled` y lo
//    calcula el componente. NUNCA se escribe.
const { expect } = require("@playwright/test");

// El boton de guardar difiere entre los dos formularios: el del indice es
// `.cm-btn-submit`; el de FormCreate es un CmButton variant="accent" dentro del
// ModalFooter de reactstrap. Se aceptan los dos.
const BOTON_GUARDAR = ".cm-modal-footer .cm-btn-submit, .modal-footer .cm-btn-accent";

// Abre el modal desde el indice de Gastos (`expense-new`, testid del paquete 09).
async function abrirModalGasto(page) {
  await page.getByTestId("expense-new").click();
  await expect(page.locator('input[name="invoice_name"]')).toBeVisible();
}

// Abre el modal desde la pestana "Gastos" del centro de costos.
//
// DESVIACION DOCUMENTADA: aqui el boton NO tiene data-testid. `expense-new`
// existe solo en el indice (CmPageActions, dueño 09); el de ExpensesTable.jsx es
// un <button> suelto en `headerActions`. La tabla canonica de 00-ARQUITECTURA
// 7.6 no declara ninguno para esta superficie, asi que se selecciona por texto en
// vez de inventar un testid nuevo.
async function abrirModalGastoCentro(page) {
  await page.locator("button", { hasText: "Nuevo Gasto" }).first().click();
  await expect(page.locator('input[name="invoice_name"]')).toBeVisible();
}

// Selecciona una opcion de un react-select por teclado. `testid` es el div
// envolvente (react-select no propaga atributos sueltos al DOM).
async function elegirSelect(page, testid, texto) {
  const caja = page.getByTestId(testid);
  const input = caja.locator("input").first();

  await caja.click();
  await input.pressSequentially(texto, { delay: 30 });
  await page.keyboard.press("Enter");
}

// Centro de costos: async, minimo 3 letras y debounce de 300 ms.
async function elegirCentro(page, code) {
  const caja = page.getByTestId("expense-cost-center-select");
  const input = caja.locator("input").first();

  await caja.click();
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/search_cost_centers") && r.status() === 200),
    input.pressSequentially(code, { delay: 30 }),
  ]);
  // La respuesta llega y react-select repinta: sin esta espera el Enter cae
  // sobre un menu todavia vacio y no selecciona nada.
  await expect(page.locator("body")).toContainText(code);
  await page.keyboard.press("Enter");
}

async function llenarGasto(page, a) {
  if (a.invoice_name) await page.fill('input[name="invoice_name"]', a.invoice_name);
  if (a.invoice_date) await page.fill('input[name="invoice_date"]', a.invoice_date);
  if (a.identification) await page.fill('input[name="identification"]', a.identification);
  if (a.invoice_number) await page.fill('input[name="invoice_number"]', a.invoice_number);
  if (a.invoice_value !== undefined) await page.fill('input[name="invoice_value"]', String(a.invoice_value));
  if (a.invoice_tax !== undefined) await page.fill('input[name="invoice_tax"]', String(a.invoice_tax));
  if (a.description) await page.fill('textarea[name="description"]', a.description);
}

// Guarda y DEVUELVE EL JSON de la respuesta. Varios escenarios afirman sobre
// register.budget_status, register.receipt_file.url o register.exchange_rate:
// mucho mas estable que leer un badge y menos fragil que consultar la BD.
async function guardarGasto(page) {
  const [res] = await Promise.all([
    page.waitForResponse(
      (r) =>
        /\/report_expenses(\/\d+)?$/.test(new URL(r.url()).pathname) &&
        ["POST", "PATCH"].includes(r.request().method())
    ),
    page.locator(BOTON_GUARDAR).click(),
  ]);

  return { res, body: await res.json() };
}

module.exports = {
  BOTON_GUARDAR,
  abrirModalGasto,
  abrirModalGastoCentro,
  elegirSelect,
  elegirCentro,
  llenarGasto,
  guardarGasto,
};
