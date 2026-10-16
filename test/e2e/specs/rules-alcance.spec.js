// Reglas por rol, persona y tipo de gasto, y prohibiciones (2026-10-14).
//
// El caso real que lo motivo: "los gastos de representacion solo los pueden
// cargar administrador, comercial y administracion". Escrito como texto para el
// agente no funcionaba —el agente solo ve el comprobante, no quien registra ni
// el tipo—; ahora es una regla de "Todos los roles, excepto…" + "Solo estos
// tipos" + "Prohibir el gasto", y la decide el servidor.
//
// Mismo centro y beneficiario que rules.spec.js (CM-E2E-RULE-2026, Bruno E2E):
// el reseed de ese scope borra las reglas "E2E %", asi que este archivo no deja
// rastro para el otro.
const path = require("path");
const { test, expect } = require("@playwright/test");
const { reseedE2E } = require("../support/db");
const { RAILS_ROOT } = require("../support/env");
const {
  abrirModalGasto,
  elegirCentro,
  elegirSelect,
  llenarGasto,
  guardarGasto,
} = require("../support/expenseForm");

const CODIGO = "CM-E2E-RULE-2026";
const REGLA = "E2E Representacion restringida";
const TIPO_PROHIBIDO = "Representacion E2E";

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  reseedE2E("RULE");
});

async function abrirReglas(page) {
  const carga = page.waitForResponse((r) => r.url().includes("/get_expense_rules") && r.status() === 200);
  await page.goto("/expense_rules");
  await carga;
  await expect(page.getByTestId("rules-page")).toBeVisible();
}

// Abre el gasto en el centro de la regla, con Bruno (rol Ingeniero E2E) de
// responsable, y elige el tipo esperando la validacion en vivo que dispara.
async function gastoDeBrunoConTipo(page, tipo) {
  await page.goto("/report_expenses");
  await abrirModalGasto(page);
  await elegirCentro(page, CODIGO);
  await elegirSelect(page, "expense-user-select", "Bruno E2E");

  // Solo la validacion que ya trae tipo: elegir al responsable tambien dispara
  // una, con el tipo vacio, y puede llegar tarde.
  const validacion = page.waitForResponse((r) => {
    if (!r.url().includes("/validate_expense_rules")) return false;
    try {
      return !!JSON.parse(r.request().postData() || "{}").type_identification_id;
    } catch (e) {
      return false;
    }
  });
  await elegirSelect(page, "expense-type-select", tipo);
  return (await validacion).json();
}

test.describe("reglas por rol, persona y tipo de gasto", () => {
  test("un administrador prohibe un tipo para todos los roles menos el suyo", async ({ page }) => {
    await abrirReglas(page);

    await page.getByTestId("rule-new-btn").click();
    await page.fill('[data-testid="rule-name"]', REGLA);
    await page.getByTestId("rule-check-duplicates").uncheck();

    await page.getByTestId("rule-roles-mode-todos").check();
    await expect(page.getByTestId("rule-roles-todos-hint")).toContainText("se suma");
    await elegirSelect(page, "rule-excluded-roles-select", "Administrador");

    // Sin tipos el boton no deja guardar: prohibir sin tipos seria prohibir todo.
    await page.getByTestId("rule-prohibits-expense").check();
    await expect(page.getByTestId("rule-block-message")).toContainText("Solo estos tipos");
    await expect(page.getByTestId("rule-submit")).toBeDisabled();

    await elegirSelect(page, "rule-included-types-select", TIPO_PROHIBIDO);
    await expect(page.getByTestId("rule-block-message")).toHaveCount(0);

    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith("/expense_rules") && r.request().method() === "POST"),
      page.getByTestId("rule-submit").click(),
    ]);
    const body = await res.json();
    expect(body.type).toBe("success");
    expect(body.register.applies_to_all_roles).toBe(true);
    expect(body.register.prohibits_expense).toBe(true);

    const id = body.register.id;
    await expect(page.getByTestId(`rule-roles-${id}`)).toContainText("Todos los roles, excepto Administrador");
    await expect(page.getByTestId(`rule-prohibits-${id}`)).toBeVisible();
    await expect(page.getByTestId(`rule-types-${id}`)).toContainText(TIPO_PROHIBIDO);
  });

  test("el formulario avisa al elegir el tipo prohibido y no deja guardar", async ({ page }) => {
    const validacion = await gastoDeBrunoConTipo(page, TIPO_PROHIBIDO);

    expect(validacion.blocking_violations.map((v) => v.code)).toContain("expense_prohibited");
    await expect(page.getByTestId("expense-rule-violations")).toContainText("No tiene permitido");

    await llenarGasto(page, {
      invoice_name: "Restaurante con cliente",
      invoice_date: new Date().toISOString().slice(0, 10),
      identification: "900555666",
      invoice_number: "FE-E2E-PROH-001",
      invoice_value: 80000,
      invoice_tax: 0,
    });
    const { body } = await guardarGasto(page);

    expect(body.type).toBe("error");
    expect(body.message.join(" ")).toContain(TIPO_PROHIBIDO);
    expect(body.message.join(" ")).toContain(REGLA);
  });

  test("otro tipo de gasto pasa sin aviso", async ({ page }) => {
    const validacion = await gastoDeBrunoConTipo(page, "Alimentacion");

    expect(validacion.violations.map((v) => v.code)).not.toContain("expense_prohibited");
    await expect(page.getByTestId("expense-rule-violations")).toHaveCount(0);
  });

  // "Sin licor, excepto en Representacion". El agente lee ANTES de que se
  // elija el tipo y devuelve cada hallazgo con su regla; la pantalla esconde el
  // aviso cuando el tipo elegido queda fuera de esa regla, y el servidor hace
  // el mismo filtro al guardar. La lectura se simula en el navegador: lo que se
  // prueba aqui es la pantalla, no el modelo.
  test("el aviso del licor desaparece al elegir representacion y vuelve con otro tipo", async ({ page }) => {
    await abrirReglas(page);
    const regla = await page.evaluate(async (tipoNombre) => {
      const props = JSON.parse(document.querySelector("[data-react-class='ExpenseRuleIndex']").dataset.reactProps);
      const tipo = props.tipos.find((t) => t.label === tipoNombre);
      const csrf = document.querySelector('meta[name="csrf-token"]').content;
      const res = await fetch("/expense_rules", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ name: "E2E Sin licor", active: true, applies_to_all_roles: true, mandatory: true,
                               check_duplicates: false, agent_instructions: "No se aceptan bebidas alcohólicas.",
                               excluded_type_ids: [tipo.value] }),
      });
      return { id: (await res.json()).register.id, tipoId: tipo.value };
    }, TIPO_PROHIBIDO);

    await page.route("**/extract_receipt/report_expenses", (route) => route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        type: "success", fields: {}, confidence: {}, warnings: [],
        policy: {
          compliant: false, blocking: true, findings: ["Incluye cerveza"],
          findings_detail: [{ rule_id: regla.id, message: "Incluye cerveza" }],
          judged_rule_ids: [regla.id],
          rules: [{ id: regla.id, name: "E2E Sin licor", mandatory: true,
                    included_type_ids: [], excluded_type_ids: [regla.tipoId] }],
        },
      }),
    }));

    await page.goto("/report_expenses");
    await abrirModalGasto(page);
    await elegirCentro(page, CODIGO);
    await elegirSelect(page, "expense-user-select", "Bruno E2E");
    await page.setInputFiles('[data-testid="expense-receipt-input"]',
                             path.join(RAILS_ROOT, "test", "fixtures", "files", "comprobante_ia.jpg"));
    await page.getByTestId("expense-extract-btn").click();

    const aviso = page.getByTestId("expense-policy-verdict");
    await expect(aviso).toContainText("no se podrá guardar");
    await expect(page.getByTestId("expense-policy-finding-0")).toContainText("Incluye cerveza");

    await elegirSelect(page, "expense-type-select", TIPO_PROHIBIDO);
    await expect(aviso).toHaveCount(0);

    await elegirSelect(page, "expense-type-select", "Alimentacion");
    await expect(aviso).toContainText("no se podrá guardar");

    // Y el servidor, con el veredicto que reenvio la pantalla, frena el de
    // alimentacion por la regla del licor.
    await llenarGasto(page, {
      invoice_name: "Bar del centro",
      invoice_date: new Date().toISOString().slice(0, 10),
      identification: "900777888",
      invoice_number: "FE-E2E-LIC-001",
      invoice_value: 50000,
      invoice_tax: 0,
    });
    const { res, body } = await guardarGasto(page);
    expect(res.request().postData()).toContain("policy_verdict");
    expect(body.type).toBe("error");
    expect(body.message.join(" ")).toContain("Incluye cerveza");
  });
});
