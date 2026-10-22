// Doble aprobacion de gastos (2026-10-18).
//
// Una regla que deja guardar pide, para los gastos que la incumplen, una
// SEGUNDA aprobacion de un cargo antes de llegar a Contabilidad. El recorrido
// completo por la pantalla: configurar la regla, registrar el gasto, primera
// firma (administrador E2E), intento de segunda firma de la misma persona,
// segunda firma de alguien del cargo (Bruno, en otra sesion) y rechazo desde
// Contabilidad, que lo deja "Rechazado" igual que a uno de una sola firma.
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
const REGLA = "E2E Doble aprobacion por monto";
const NUMERO = "FE-E2E-DOBLE-001";

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  reseedE2E("RULE");
});

let gastoId = null;

async function filaDelGasto(page, scope) {
  const carga = page.waitForResponse((r) => r.url().includes("/get_report_expenses") && r.status() === 200);
  await page.goto("/report_expenses" + (scope ? "?scope=" + scope : ""));
  await carga;
}

async function cambiarEstado(page, id, estado) {
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes(`/update_state_report_expense/${id}/`)),
    page.getByTestId(`expense-status-select-${id}`).selectOption(estado),
  ]);
  return res.json();
}

test.describe("doble aprobacion", () => {
  test("la regla pide una segunda aprobacion de un cargo, solo si deja guardar", async ({ page }) => {
    const carga = page.waitForResponse((r) => r.url().includes("/get_expense_rules") && r.status() === 200);
    await page.goto("/expense_rules");
    await carga;

    await page.getByTestId("rule-new-btn").click();
    await page.fill('[data-testid="rule-name"]', REGLA);
    await page.getByTestId("rule-check-duplicates").uncheck();
    await page.getByTestId("rule-roles-mode-todos").check();
    await page.fill('[data-testid="rule-max-value"]', "50000");

    // Con «Impedir guardar» marcado (lo de fabrica) la doble aprobacion no se
    // puede pedir: el gasto no llegaria a guardarse.
    await expect(page.getByTestId("rule-second-approval")).toBeDisabled();
    await expect(page.getByTestId("rule-second-approval-disabled-hint")).toBeVisible();

    await page.getByTestId("rule-mandatory").uncheck();
    await page.getByTestId("rule-second-approval").check();
    await expect(page.getByTestId("rule-block-message")).toContainText("Elija el cargo o la persona");

    await elegirSelect(page, "rule-second-approver-rol-select", "Ingeniero E2E");
    await expect(page.getByTestId("rule-block-message")).toHaveCount(0);
    await expect(page.getByTestId("rule-second-approval-hint")).toContainText("solo pasa a Contabilidad");

    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith("/expense_rules") && r.request().method() === "POST"),
      page.getByTestId("rule-submit").click(),
    ]);
    const body = await res.json();
    expect(body.type).toBe("success");
    expect(body.register.requires_second_approval).toBe(true);
    await expect(page.getByTestId(`rule-second-approval-${body.register.id}`)).toContainText("Cargo: Ingeniero E2E");
  });

  test("el gasto que la incumple se guarda en Creado", async ({ page }) => {
    await page.goto("/report_expenses");
    await abrirModalGasto(page);
    await elegirCentro(page, CODIGO);
    await elegirSelect(page, "expense-user-select", "Bruno E2E");
    await llenarGasto(page, {
      invoice_name: "Hotel de la comision", invoice_date: new Date().toISOString().slice(0, 10),
      identification: "900777888", invoice_number: NUMERO, invoice_value: 80000, invoice_tax: 0,
    });
    const { body } = await guardarGasto(page);

    expect(body.type).toBe("success");
    gastoId = body.register.id;
    expect(body.register.operational_state).toBe("creado");
    expect(body.register.double_approval.approvers).toContain("Cargo: Ingeniero E2E");
  });

  test("la primera aprobacion lo deja pendiente, y quien la dio no puede dar la segunda", async ({ page }) => {
    await filaDelGasto(page, "all");

    const primera = await cambiarEstado(page, gastoId, "aceptado");
    expect(primera.type).toBe("success");
    await expect(page.locator(".swal2-title")).toContainText("Primera aprobación registrada");
    await page.locator(".swal2-confirm").click();
    await expect(page.getByTestId(`expense-status-select-${gastoId}`)).toHaveValue("pendiente_segunda");

    const segunda = await cambiarEstado(page, gastoId, "aceptado");
    expect(segunda.type).toBe("error");
    await expect(page.locator(".swal2-html-container")).toContainText("Usted dio la primera aprobación");
  });

  test("alguien del cargo la ve en su pestaña y da la segunda aprobacion", async ({ browser }) => {
    const contexto = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await contexto.newPage();
    await page.goto("/users/sign_in");
    await page.fill("#user_email", "e2e-b@controlmatica.test");
    await page.fill("#user_password", "e2e-password-123");
    await page.click('input[value="Ingresar"]');
    await expect(page).not.toHaveURL(/sign_in/);

    await filaDelGasto(page, "second_approval");
    await expect(page.getByTestId("expense-scope-second_approval")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId(`expense-status-select-${gastoId}`)).toHaveValue("pendiente_segunda");

    const segunda = await cambiarEstado(page, gastoId, "aceptado");
    expect(segunda.type).toBe("success");
    expect(segunda.register.operational_state).toBe("aceptado");
    await contexto.close();
  });

  test("Contabilidad lo rechaza y queda Rechazado, como uno de una sola aprobacion", async ({ page }) => {
    const carga = page.waitForResponse((r) => r.url().includes("/get_accounting_expenses") && r.status() === 200);
    await page.goto("/accounting_expenses");
    await carga;

    const select = page.getByTestId(`accounting-approve-select-${gastoId}`);
    await expect(select.locator('option[value="rechazar"]')).toHaveText("Rechazar gasto…");
    await select.selectOption("rechazar");
    await expect(page.locator(".swal2-title")).toContainText("Rechazar este gasto");

    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/reject_accounting_expense/${gastoId}`)),
      page.locator(".swal2-confirm").click(),
    ]);
    expect((await res.json()).success).toBe("El gasto fue rechazado y salió de Contabilidad");

    await filaDelGasto(page, "all");
    await expect(page.getByTestId(`expense-status-select-${gastoId}`)).toHaveValue("rechazado");
  });
});
