// Carga de varios comprobantes en un ZIP (2026-10-18).
//
// El ZIP se abre en el navegador; cada comprobante se lee con la IA (el stub
// E2E responde por el contenido del archivo) y se recorre en el formulario de
// crear gasto, ya lleno. Lo que se afirma:
//   * lo que no es un comprobante, las carpetas del sistema y los repetidos se
//     quedan fuera ANTES de leer nada;
//   * no hay pantalla de inicio (2026-11-09): abre de una el primer
//     comprobante, y cada uno pide su centro y su responsable;
//   * guardar pasa solo al siguiente, con el archivo adjunto;
//   * omitir deja el comprobante en el resumen para registrarlo despues.
const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");
const { reseedE2E } = require("../support/db");
const { RAILS_ROOT } = require("../support/env");
const { crearZip } = require("../support/zip");
const { elegirSelect, elegirCentro } = require("../support/expenseForm");

const CODIGO = "CM-E2E-RULE-2026";
const ARCHIVOS = path.join(RAILS_ROOT, "test", "fixtures", "files");

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  reseedE2E("RULE");
});

function zipDePrueba() {
  const jpg = fs.readFileSync(path.join(ARCHIVOS, "comprobante_ia.jpg"));
  const pdf = fs.readFileSync(path.join(ARCHIVOS, "comprobante_ia_usd.pdf"));
  return crearZip([
    { name: "facturas/", data: Buffer.alloc(0), store: true },
    { name: "facturas/hotel.jpg", data: jpg },
    // Guardado sin comprimir, como hacen algunos compresores con un PDF.
    { name: "facturas/vuelo.pdf", data: pdf, store: true },
    { name: "facturas/copia del hotel.jpg", data: jpg },
    { name: "facturas/notas.txt", data: Buffer.from("no es un comprobante") },
    { name: "__MACOSX/facturas/._hotel.jpg", data: Buffer.from("basura de Mac") },
  ]);
}

test("un ZIP se recorre comprobante por comprobante hasta el resumen", async ({ page }) => {
  await page.goto("/report_expenses");
  await page.getByTestId("expense-batch-input").setInputFiles({
    name: "facturas.zip", mimeType: "application/zip", buffer: zipDePrueba(),
  });

  // Sin pantalla de inicio: abre de una el comprobante 1 de 2. Fuera el
  // repetido y el .txt, avisados en la barra; las carpetas y la basura de Mac
  // ni se mencionan.
  await expect(page.getByTestId("batch-title")).toHaveText("Comprobante 1 de 2");
  await expect(page.getByTestId("batch-start-step")).toHaveCount(0);
  const ignorados = page.getByTestId("batch-ignored");
  await expect(ignorados).toContainText("2 archivos no se cargaron");
  await expect(ignorados).toContainText("copia del hotel.jpg: es el mismo archivo que hotel.jpg");
  await expect(ignorados).toContainText("notas.txt: no es PDF ni imagen");
  await expect(ignorados).not.toContainText("._hotel");

  // La lectura de la IA llega sola; el centro y el responsable se piden aqui.
  await expect(page.locator('input[name="invoice_number"]')).toHaveValue("FE-E2E-IA-001");
  await elegirCentro(page, CODIGO);
  await elegirSelect(page, "expense-user-select", "Bruno E2E");

  const [res] = await Promise.all([
    page.waitForResponse((r) => new URL(r.url()).pathname === "/report_expenses" && r.request().method() === "POST"),
    page.getByTestId("batch-save").click(),
  ]);
  const body = await res.json();
  expect(body.type).toBe("success");
  expect(body.register.invoice_number).toBe("FE-E2E-IA-001");
  expect(body.register.receipt_file && body.register.receipt_file.url).toBeTruthy();
  expect(body.register.user_invoice.names).toBe("Bruno E2E");

  // Pasa solo al 2 y el avance lo cuenta. El 2 pide sus datos otra vez: no
  // hereda el centro ni el responsable del 1.
  await expect(page.getByTestId("batch-title")).toHaveText("Comprobante 2 de 2");
  await expect(page.getByTestId("expense-cost-center-select")).not.toContainText(CODIGO);
  await expect(page.getByTestId("expense-user-select")).not.toContainText("Bruno E2E");
  await expect(page.getByTestId("batch-progress")).toHaveText("1 de 2 guardados");
  await expect(page.getByTestId("batch-item-0")).toHaveAttribute("data-estado", "guardado");

  // Se omite: queda en el resumen para registrarlo despues.
  await page.getByTestId("batch-skip").click();
  await expect(page.getByTestId("batch-summary")).toBeVisible();
  await expect(page.getByTestId("batch-summary-saved")).toHaveText("1");
  await expect(page.getByTestId("batch-summary")).toContainText("vuelo.pdf");
});

test("un archivo que no es ZIP ni comprobante no abre el lote", async ({ page }) => {
  await page.goto("/report_expenses");
  await page.getByTestId("expense-batch-input").setInputFiles({
    name: "planilla.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from("no es un comprobante"),
  });

  await expect(page.locator(".swal2-title")).toHaveText("No hay comprobantes para registrar");
  await expect(page.locator(".swal2-html-container")).toContainText("planilla.xlsx");
  await expect(page.getByTestId("batch-modal")).toHaveCount(0);
});
