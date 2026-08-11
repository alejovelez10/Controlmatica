// Escenario 5 — captura asistida por IA. Centro CM-E2E-REC-2026.
//
// ══════════════════════════════════════════════════════════════════════════
// LOS TRES TESTS ESTAN EN `test.fixme` Y NO SE PUEDEN EJECUTAR HOY.
// No es una omision ni una prueba floja: es el estado real del sistema, y se
// deja escrito para que el reporte de Playwright diga cuantos flujos faltan en
// vez de esconderlo.
//
// Faltan DOS piezas, ninguna de este paquete:
//
// 1. NO EXISTE EL ENDPOINT. `POST /extract_receipt/report_expenses` no esta en
//    config/routes.rb ni hay accion que lo atienda. El paquete 10 lo dejo
//    "declarado y no construido" (ESTADO.md, salvedades del 10): los dos
//    formularios ya hacen el fetch, pero contra una ruta que devuelve 404.
// 2. EL BOTON NO SE PINTA. `renderExtraction()` sale por
//    `if (!receiptExtractionEnabled()) return null`, y esa bandera es
//    `window.CM_RECEIPT_EXTRACTION_ENABLED`, que el layout publica desde
//    RECEIPT_EXTRACTION_ENABLED. El kill switch arranca APAGADO porque el seam
//    `call_vision_model` levanta NotImplementedError: lo implementa el agente de
//    Taimes, que es la frontera de alcance acordada con el cliente.
//
// LO QUE SI ESTA LISTO Y PROBADO, para que nadie lo rehaga:
//   - El stub del borde de red (`config/initializers/e2e_stubs.rb`) responde a
//     `call_vision_model` con los payloads de comprobante_ia.jpg y
//     comprobante_ia_usd.pdf, y registra cada llamada en tmp/e2e/stub_calls.log.
//     Su contrato con el servicio real esta cubierto por los 11 casos de
//     test/models/e2e_stubs_test.rb, que SI corren y estan en verde.
//   - El servicio real (parseo, `fields`, `confidence`, `warnings`, mapeo de
//     errores) esta cubierto por las 49 pruebas del paquete 10.
//
// PARA ENCENDERLO cuando Taimes entregue el seam: implementar
// `call_vision_model`, agregar la ruta y la accion `extract_receipt`, poner
// RECEIPT_EXTRACTION_ENABLED=true en el webServer.env de playwright.config.js y
// cambiar los tres `test.fixme` por `test`. El cuerpo de las pruebas ya esta
// escrito contra los data-testid canonicos y contra los valores exactos que
// devuelve el stub.
// ══════════════════════════════════════════════════════════════════════════
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
  test.fixme(
    "la IA precarga los campos del comprobante y la persona corrige uno antes de guardar (PENDIENTE: falta el endpoint extract_receipt y el kill switch esta apagado)",
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

  test.fixme(
    "la extraccion no sale a internet: la llamada la atendio el stub (PENDIENTE: depende del test anterior)",
    async () => {
      const llamada = lastStubCall("ReceiptExtractionService");
      expect(llamada).not.toBeNull();
      expect(llamada.method).toBe("call_vision_model");
      expect(llamada.args.fixture).toBe("feliz_cop");
    }
  );

  test.fixme(
    "si la IA no puede leer el comprobante el registro manual sigue funcionando (PENDIENTE: falta el endpoint extract_receipt)",
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
