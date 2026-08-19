// Escenario 5 — captura asistida por IA. Centro CM-E2E-REC-2026.
//
// ACTIVO desde 2026-08-17: el seam `call_vision_model` esta implementado (llama
// al agente extractor de Taimes) y la ruta `POST /extract_receipt/report_expenses`
// existe. En esta corrida NADA sale a internet:
//   - el webServer corre con RECEIPT_EXTRACTION_ENABLED=true y TAIMES_* dummies
//     (playwright.config.js) para que el boton se pinte y `configured?` pase;
//   - el prepend de config/initializers/e2e_stubs.rb atiende `call_vision_model`
//     ANTES de que el seam real abra un socket, eligiendo la fixture por el
//     digesto del base64 del payload, y registra cada llamada en
//     tmp/e2e/stub_calls.log (contrato cubierto por test/models/e2e_stubs_test.rb).
const path = require("path");
const { test, expect } = require("@playwright/test");
const { reseedE2E } = require("../support/db");
const { RAILS_ROOT } = require("../support/env");
const { clearStubCalls, lastStubCall } = require("../support/stubs");
const {
  abrirModalGasto,
  elegirCentro,
  elegirSelect,
  llenarGasto,
  guardarGasto,
} = require("../support/expenseForm");

const FIXTURES = path.join(RAILS_ROOT, "test", "fixtures", "files");
const CODIGO = "CM-E2E-REC-2026";

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  reseedE2E("REC");
  clearStubCalls();
});

test.describe("escenario 5 — captura asistida por IA", () => {
  test(
    "la IA precarga los campos del comprobante y la persona corrige uno antes de guardar",
    async ({ page }) => {
      await page.goto("/report_expenses");
      await abrirModalGasto(page);
      await elegirCentro(page, CODIGO);
      await elegirSelect(page, "expense-user-select", "Ana E2E");

      await page.setInputFiles(
        '[data-testid="expense-receipt-input"]',
        path.join(FIXTURES, "comprobante_ia.jpg")
      );

      const [res] = await Promise.all([
        page.waitForResponse((r) => r.url().includes("/extract_receipt/report_expenses")),
        page.getByTestId("expense-extract-btn").click(),
      ]);
      expect((await res.json()).type).toBe("success");

      // 1) La IA precargo los campos con los valores EXACTOS del stub.
      await expect(page.locator('input[name="invoice_name"]')).toHaveValue("HOTEL DANN CARLTON E2E");
      await expect(page.locator('input[name="identification"]')).toHaveValue("900123456");
      await expect(page.locator('input[name="invoice_number"]')).toHaveValue("FE-E2E-IA-001");
      await expect(page.locator('input[name="invoice_date"]')).toHaveValue("2026-06-15");

      // 2) La persona CORRIGE un campo.
      await page.fill('input[name="invoice_number"]', "FE-E2E-IA-999");

      // 3) Guarda: gana la correccion humana, sobrevive lo demas y el archivo
      // queda adjunto. Ese ultimo punto es el error clasico de esta pantalla:
      // que la extraccion consuma el input[type=file] y el gasto se guarde sin
      // comprobante.
      const { body } = await guardarGasto(page);
      expect(body.register.invoice_number).toBe("FE-E2E-IA-999");
      expect(body.register.invoice_name).toBe("HOTEL DANN CARLTON E2E");
      expect(body.register.receipt_file).not.toBeNull();
    }
  );

  test(
    "la extraccion no sale a internet: la llamada la atendio el stub",
    async () => {
      const llamada = lastStubCall("ReceiptExtractionService");
      expect(llamada).not.toBeNull();
      expect(llamada.method).toBe("call_vision_model");
      expect(llamada.args.fixture).toBe("feliz_cop");
    }
  );

  test(
    "si la IA no puede leer el comprobante el registro manual sigue funcionando",
    async ({ page }) => {
      await page.goto("/report_expenses");
      await abrirModalGasto(page);
      await elegirCentro(page, CODIGO);
      await elegirSelect(page, "expense-user-select", "Ana E2E");

      await page.setInputFiles(
        '[data-testid="expense-receipt-input"]',
        path.join(FIXTURES, "comprobante_ilegible.png")
      );

      const [res] = await Promise.all([
        page.waitForResponse((r) => r.url().includes("/extract_receipt/report_expenses")),
        page.getByTestId("expense-extract-btn").click(),
      ]);
      expect((await res.json()).type).toBe("error");

      await expect(page.getByTestId("expense-extract-error")).toContainText("Complete los datos manualmente");
      // Los inputs quedan VACIOS: nunca con basura inventada.
      await expect(page.locator('input[name="invoice_name"]')).toHaveValue("");
      await expect(page.locator('input[name="invoice_number"]')).toHaveValue("");

      // Una extraccion fallida jamas bloquea el registro manual.
      await llenarGasto(page, {
        invoice_name: "Comprobante ilegible a mano",
        invoice_date: "2026-06-18",
        identification: "900123456",
        invoice_number: "FE-E2E-IA-002",
        invoice_value: 50000,
        invoice_tax: 0,
      });

      const { body } = await guardarGasto(page);
      expect(body.type).toBe("success");
    }
  );
});
