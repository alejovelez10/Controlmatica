// Informe «Incumplen reglas» de Gastos (2026-10-25).
//
// El recorrido por la pantalla: la regla con la casilla de cotejo a la vista,
// un gasto que se guarda incumpliendo su tope, la pestaña que lo muestra con la
// regla y la razon, y la aprobacion desde ahi mismo, que lo pasa de
// "Pendientes" a "Aprobados" con quien lo aprobo. Aprobar no lo saca del
// informe.
//
// Mismo centro y beneficiario que los otros specs de reglas (CM-E2E-RULE-2026,
// Bruno E2E): el reseed de ese scope borra las reglas "E2E %".
const { test, expect } = require("@playwright/test");
const { reseedE2E } = require("../support/db");
const {
  abrirModalGasto,
  elegirCentro,
  elegirSelect,
  llenarGasto,
  guardarGasto,
} = require("../support/expenseForm");

const CODIGO = "CM-E2E-RULE-2026";
const REGLA = "E2E Informe tope 50 mil";
const NUMERO = "FE-E2E-INFORME-001";

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  reseedE2E("RULE");
});

let gastoId = null;

async function abrirInforme(page, query) {
  const carga = page.waitForResponse((r) => r.url().includes("/get_report_expenses") &&
                                            r.url().includes("scope=rule_hits") && r.status() === 200);
  await page.goto("/report_expenses?scope=rule_hits" + (query || ""));
  await carga;
}

test.describe("informe de reglas incumplidas", () => {
  test("la regla deja guardar y tiene a la vista la casilla de cotejar el comprobante", async ({ page }) => {
    const carga = page.waitForResponse((r) => r.url().includes("/get_expense_rules") && r.status() === 200);
    await page.goto("/expense_rules");
    await carga;

    await page.getByTestId("rule-new-btn").click();
    await page.fill('[data-testid="rule-name"]', REGLA);
    await page.getByTestId("rule-check-duplicates").uncheck();
    await page.getByTestId("rule-roles-mode-todos").check();
    await page.fill('[data-testid="rule-max-value"]', "50000");
    await page.getByTestId("rule-mandatory").uncheck();

    await expect(page.getByTestId("rule-cross-check-receipt")).not.toBeChecked();
    await expect(page.getByTestId("rule-cross-check-hint")).toContainText("queda pendiente de aprobación");
    await page.screenshot({ path: "test-results/rule-hits-regla.png", fullPage: true });

    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith("/expense_rules") && r.request().method() === "POST"),
      page.getByTestId("rule-submit").click(),
    ]);
    const body = await res.json();
    expect(body.type).toBe("success");
    expect(body.register.cross_check_receipt).toBe(false);
  });

  test("el gasto que incumple el tope se guarda y aparece en la pestaña con la regla y la razon", async ({ page }) => {
    await page.goto("/report_expenses");
    await abrirModalGasto(page);
    await elegirCentro(page, CODIGO);
    await elegirSelect(page, "expense-user-select", "Bruno E2E");
    await llenarGasto(page, {
      invoice_name: "Hotel del informe", invoice_date: new Date().toISOString().slice(0, 10),
      identification: "900777999", invoice_number: NUMERO, invoice_value: 80000, invoice_tax: 0,
    });
    const { body } = await guardarGasto(page);
    expect(body.type).toBe("success");
    gastoId = body.register.id;

    await abrirInforme(page);
    await expect(page.getByTestId("expense-scope-rule_hits")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("rule-hits-state")).toHaveValue("pendientes");
    // Plegado: la regla con cuantas razones tiene; «Ver detalle» las despliega.
    const reglas = page.getByTestId(`expense-rule-hits-${gastoId}`);
    await expect(reglas).toContainText(REGLA + "(1)");
    await expect(page.getByTestId(`expense-rule-hits-detail-${gastoId}`)).toHaveCount(0);
    await page.screenshot({ path: "test-results/rule-hits-pendientes.png", fullPage: true });

    await page.getByTestId(`expense-rule-hits-toggle-${gastoId}`).click();
    await expect(page.getByTestId(`expense-rule-hits-detail-${gastoId}`)).toContainText("El valor supera el tope de $50.000");
    await expect(page.getByTestId(`expense-rule-hits-toggle-${gastoId}`)).toContainText("Ocultar");
    await expect(page.getByTestId(`expense-rule-decision-${gastoId}`)).toContainText("Pendiente de aprobación");
    await page.screenshot({ path: "test-results/rule-hits-detalle.png", fullPage: true });
  });

  test("se filtra por la regla", async ({ page }) => {
    await abrirInforme(page);
    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/get_report_expenses") && r.url().includes("rule_id=")),
      page.getByTestId("rule-hits-rule").selectOption({ label: REGLA }),
    ]);
    const ids = (await res.json()).data.map((g) => g.id);
    expect(ids).toEqual([gastoId]);
  });

  test("aprobarlo desde la pestaña lo pasa a Aprobados con quien lo aprobo", async ({ page }) => {
    await abrirInforme(page);
    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/update_state_report_expense/${gastoId}/`)),
      page.getByTestId(`expense-status-select-${gastoId}`).selectOption("aceptado"),
    ]);
    expect((await res.json()).type).toBe("success");

    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/get_report_expenses") && r.url().includes("rule_state=aprobados")),
      page.getByTestId("rule-hits-state").selectOption("aprobados"),
    ]);
    await expect(page.getByTestId(`expense-rule-hits-${gastoId}`)).toContainText(REGLA);
    await expect(page.getByTestId(`expense-rule-decision-${gastoId}`)).toContainText("Aprobado por");
    await page.screenshot({ path: "test-results/rule-hits-aprobados.png", fullPage: true });
  });
});
