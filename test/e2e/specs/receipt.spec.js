// Escenario 4 — comprobante adjunto. Centro CM-E2E-REC-2026.
//
// Se opera desde la pestana "Gastos" del centro de costos, o sea contra
// `components/ReportExpense/FormCreate.jsx`, y NO desde el indice: el formulario
// de gasto esta duplicado (00-ARQUITECTURA 4.5) y asi la suite cubre los dos.
// Los otros escenarios usan el del indice.
//
// Los comprobantes se guardan en public/uploads/report_expense/ porque el
// webServer corre con E2E_UPLOAD_ROOT=public. Con la raiz por defecto de test
// (tmp/) el archivo se guarda en un sitio y la URL emitida apunta a otro, y la
// descarga daria 404. El global-teardown borra ese directorio al terminar.
const path = require("path");
const { test, expect } = require("@playwright/test");
const { reseedE2E } = require("../support/db");
const { cc } = require("../support/seedIds");
const { RAILS_ROOT } = require("../support/env");
const { abrirModalGastoCentro, llenarGasto, guardarGasto } = require("../support/expenseForm");

const FIXTURES = path.join(RAILS_ROOT, "test", "fixtures", "files");

// El id del gasto con comprobante viaja entre los tres primeros tests.
const creado = { conComprobante: null, urlComprobante: null };

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  reseedE2E("REC");
});

async function abrirGastosDelCentro(page) {
  await page.goto(`/cost_centers/${cc("REC")}?tab=home`);

  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/get_cost_center_report_expenses/") && r.status() === 200),
    page.locator(".cm-tab-btn", { hasText: /^\s*Gastos\s*$/ }).click(),
  ]);

  await expect(page.getByTestId("cm-datatable")).toBeVisible();
}

test.describe("escenario 4 — comprobante adjunto", () => {
  test("adjunta un comprobante PDF al crear el gasto y queda asociado", async ({ page }) => {
    await abrirGastosDelCentro(page);
    await abrirModalGastoCentro(page);

    await llenarGasto(page, {
      invoice_name: "Taxi E2E",
      invoice_date: "2026-06-16",
      identification: "900777888",
      invoice_number: "FE-E2E-REC-002",
      invoice_value: 30000,
      invoice_tax: 0,
    });

    await page.setInputFiles('[data-testid="expense-receipt-input"]', path.join(FIXTURES, "comprobante.pdf"));
    await expect(page.getByTestId("expense-receipt-name")).toContainText("comprobante.pdf");

    const { res, body } = await guardarGasto(page);

    expect(body.type).toBe("success");
    expect(body.register.receipt_file).not.toBeNull();
    expect(body.register.receipt_file.url).toContain("comprobante.pdf");

    // CONTRATO MULTIPART: si alguien revierte el formulario a JSON, el gasto se
    // crearia igual pero SIN comprobante y sin ningun error. Esta aserción lo
    // detecta aunque todo lo demas siga verde.
    expect(res.request().headers()["content-type"]).toMatch(/^multipart\/form-data; boundary=/);

    creado.conComprobante = body.register.id;
    creado.urlComprobante = body.register.receipt_file.url;
  });

  test("el comprobante se previsualiza sin salir de la pantalla", async ({ page }) => {
    await abrirGastosDelCentro(page);

    await page.getByTestId(`expense-receipt-preview-${creado.conComprobante}`).click();
    const modal = page.getByTestId("receipt-preview-modal");
    await expect(modal).toBeVisible();

    // Un PDF se previsualiza en un iframe cuyo src es la misma URL de descarga
    // del gasto: nunca la URL firmada, que caduca a los 600 s.
    const visor = modal.locator("iframe, embed, object");
    await expect(visor).toHaveCount(1);
    await expect(visor).toHaveAttribute(
      "src",
      new RegExp(`/download_receipt/report_expenses/${creado.conComprobante}`)
    );
  });

  test("el comprobante se descarga desde la tabla", async ({ page }) => {
    await abrirGastosDelCentro(page);

    const [descarga] = await Promise.all([
      page.waitForEvent("download"),
      page.getByTestId(`expense-receipt-link-${creado.conComprobante}`).click(),
    ]);

    expect(descarga.suggestedFilename()).toBe("comprobante.pdf");

    // Se comprueban los BYTES, no el nombre: un 404 con nombre correcto seria
    // indistinguible de una descarga buena si solo se mirara el filename.
    const stream = await descarga.createReadStream();
    const trozos = [];
    for await (const trozo of stream) trozos.push(trozo);
    expect(Buffer.concat(trozos).slice(0, 5).toString()).toBe("%PDF-");
  });

  test("un archivo con extension prohibida es rechazado y el gasto no se crea", async ({ page }) => {
    await abrirGastosDelCentro(page);
    await abrirModalGastoCentro(page);

    await llenarGasto(page, {
      invoice_name: "Gasto con adjunto prohibido",
      invoice_date: "2026-06-17",
      identification: "900777888",
      invoice_number: "FE-E2E-REC-003",
      invoice_value: 10000,
      invoice_tax: 0,
    });

    // Capa 1, el cliente: el .exe NI SIQUIERA se adjunta. `handleFileReceipt`
    // valida la extension contra la lista permitida antes de tocar el estado, asi
    // que no hay nada que enviar y el nombre del archivo no aparece.
    await page.setInputFiles('[data-testid="expense-receipt-input"]', path.join(FIXTURES, "malicioso.exe"));
    await expect(page.getByTestId("expense-receipt-error")).toBeVisible();
    await expect(page.getByTestId("expense-receipt-error")).toContainText(/Formato no permitido/i);
    await expect(page.getByTestId("expense-receipt-name")).toHaveCount(0);

    // Capa 2, el servidor: es la que importa, porque el cliente se puede saltar.
    // Se manda el multipart a mano con el .exe dentro.
    const r = await page.request.post("/report_expenses", {
      multipart: {
        cost_center_id: String(cc("REC")),
        user_invoice_id: "",
        invoice_name: "Gasto con adjunto prohibido",
        invoice_date: "2026-06-17",
        invoice_number: "FE-E2E-REC-003",
        invoice_value: "10000",
        invoice_tax: "0",
        invoice_total: "10000",
        receipt_file: {
          name: "malicioso.exe",
          mimeType: "application/octet-stream",
          buffer: require("fs").readFileSync(path.join(FIXTURES, "malicioso.exe")),
        },
      },
    });

    const cuerpo = await r.json();
    expect(cuerpo.type).toBe("error");
    expect(cuerpo.message.join(" ")).toMatch(/exe|extensi|formato/i);

    // Y la comprobacion de efecto: el gasto NO existe.
    const listado = await page.request.get(
      `/get_cost_center_report_expenses/${cc("REC")}?per_page=100&q=FE-E2E-REC-003`
    );
    expect((await listado.json()).total).toBe(0);
  });
});
