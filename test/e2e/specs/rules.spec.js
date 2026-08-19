// Los 4 escenarios E2E del paquete 14 — reglas de gasto.
// Centro CM-E2E-RULE-2026, con una partida de 1.000.000 para Bruno E2E.
//
// POR QUE UN CENTRO Y UN BENEFICIARIO PROPIOS: una regla se asigna a una PERSONA,
// no a un centro, y afecta el `budget_status` de todos sus gastos. Colgarla de un
// beneficiario que otro spec use habria contaminado sus resultados sin que el
// fallo apuntara nunca a este archivo.
//
// LA REGLA DE NEGOCIO QUE SE PRUEBA: una violacion NUNCA impide guardar, pero
// impide que el gasto quede aprobado. El servicio deja el gasto en
// `sin_presupuesto` (no en `excedido`, que lo sacaria de la vista de
// Contabilidad) y escribe el motivo en `budget_reason`.
const { test, expect } = require("@playwright/test");
const { reseedE2E } = require("../support/db");
const { cc } = require("../support/seedIds");
const {
  abrirModalGasto,
  elegirCentro,
  elegirSelect,
  llenarGasto,
  guardarGasto,
} = require("../support/expenseForm");

const CODIGO = "CM-E2E-RULE-2026";
const REGLA = "E2E Antiguedad 30 dias";

// Fechas relativas a hoy: la regla mide la antigüedad contra Date.current, asi
// que una fecha fija dejaria de violar (o de cumplir) con el paso del tiempo y
// la suite se pondria roja sola dentro de unos meses.
function haceDias(dias) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  // El reseed borra las reglas "E2E %" de la corrida anterior: si sobrevivieran,
  // el escenario 4 encontraria ya creada la regla por defecto y fallaria por la
  // razon equivocada.
  reseedE2E("RULE");
});

async function abrirReglas(page) {
  const carga = page.waitForResponse((r) => r.url().includes("/get_expense_rules") && r.status() === 200);
  await page.goto("/expense_rules");
  await carga;
  await expect(page.getByTestId("rules-page")).toBeVisible();
}

test.describe("escenarios del paquete 14 — reglas de gasto", () => {
  test("un administrador crea una regla de 30 dias y se la asigna a un usuario", async ({ page }) => {
    await abrirReglas(page);

    await page.getByTestId("rule-new-btn").click();
    await page.fill('[data-testid="rule-name"]', REGLA);
    await page.fill('[data-testid="rule-max-age"]', "30");
    // Sin control de duplicados: este escenario prueba la antigüedad, y dejarlo
    // encendido añadiria una segunda violacion que enturbiaria la aserción.
    await page.getByTestId("rule-check-duplicates").uncheck();
    await elegirSelect(page, "rule-users-select", "Bruno E2E");

    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith("/expense_rules") && r.request().method() === "POST"),
      page.getByTestId("rule-submit").click(),
    ]);

    const body = await res.json();
    expect(body.type).toBe("success");
    expect(body.register.max_invoice_age_days).toBe(30);

    const id = body.register.id;
    await expect(page.getByTestId(`rule-row-${id}`)).toContainText(REGLA);
    await expect(page.getByTestId(`rule-users-${id}`)).toContainText("Bruno E2E");
  });

  test("un gasto con factura de hace 45 dias se guarda pero no queda aprobado", async ({ page }) => {
    await page.goto("/report_expenses");
    await abrirModalGasto(page);

    await elegirCentro(page, CODIGO);
    await elegirSelect(page, "expense-user-select", "Bruno E2E");
    await expect(page.getByTestId("expense-budget-ok")).toBeVisible();

    await llenarGasto(page, {
      invoice_name: "Factura vieja de Bruno",
      invoice_date: haceDias(45),
      identification: "900333444",
      invoice_number: "FE-E2E-RULE-001",
      invoice_value: 100000,
      invoice_tax: 0,
    });

    const { body } = await guardarGasto(page);

    // SE GUARDA: una violacion nunca bloquea el registro.
    expect(body.type).toBe("success");
    expect(body.register.id).toBeGreaterThan(0);

    // Y NO QUEDA APROBADO, aunque cabia de sobra en la partida de 1.000.000.
    expect(body.register.budget_status).not.toBe("aprobado");
    expect(body.register.budget_status).toBe("sin_presupuesto");
    expect(body.register.budget_reason).toContain("reglas de gasto");
    expect(body.register.budget_reason).toMatch(/antig|dias|días/i);

    // HALLAZGO: `rule_violations` NO lo expone ReportExpenseSerializer, asi que
    // el detalle estructurado de la violacion (codigo, regla, mensaje) no llega
    // al navegador: solo la frase resumida de `budget_reason`, truncada a 250
    // caracteres. La prueba afirma sobre lo que el sistema SI entrega hoy.

    // La columna "Estado presupuestal" se OCULTO de la tabla de Gastos por
    // decision de producto (2026-08-18, COLUMNAS_OCULTAS en
    // packs/ReportExpenseIndex.js): ya no hay badge que mirar, y con el se fue
    // el hallazgo que estaba anotado aqui (la columna pintaba el estado pero no
    // el motivo cuando era "sin_presupuesto"). Lo que importa —que la regla
    // impide la aprobacion y deja el motivo— lo afirman las cuatro lineas de
    // arriba contra la respuesta del servidor. Si la columna vuelve, vuelve esta
    // asercion y vuelve el hallazgo.
  });

  test("un gasto de hace 5 dias que cabe en la partida queda aprobado y sin advertencias", async ({ page }) => {
    await page.goto("/report_expenses");
    await abrirModalGasto(page);

    await elegirCentro(page, CODIGO);
    await elegirSelect(page, "expense-user-select", "Bruno E2E");
    await expect(page.getByTestId("expense-budget-ok")).toBeVisible();

    await llenarGasto(page, {
      invoice_name: "Factura reciente de Bruno",
      invoice_date: haceDias(5),
      identification: "900333444",
      invoice_number: "FE-E2E-RULE-002",
      invoice_value: 200000,
      invoice_tax: 0,
    });

    const { body } = await guardarGasto(page);

    expect(body.type).toBe("success");
    expect(body.register.budget_status).toBe("aprobado");
    expect(body.register.budget_reason == null || body.register.budget_reason === "").toBeTruthy();
    // Sin badge que mirar: la columna "Estado presupuestal" esta oculta (ver el
    // test de la regla de antiguedad). Las dos lineas de arriba afirman la regla.
  });

  test("una segunda regla por defecto se rechaza con un mensaje entendible", async ({ page }) => {
    await abrirReglas(page);

    // La primera regla por defecto se crea sin limites: una regla por defecto
    // aplica a TODA persona sin reglas propias, asi que ponerle topes aqui
    // cambiaria el resultado de los demas specs.
    await page.getByTestId("rule-new-btn").click();
    await page.fill('[data-testid="rule-name"]', "E2E Regla por defecto");
    await page.getByTestId("rule-check-duplicates").uncheck();
    await page.getByTestId("rule-is-default").check();

    const [primera] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith("/expense_rules") && r.request().method() === "POST"),
      page.getByTestId("rule-submit").click(),
    ]);
    expect((await primera.json()).type).toBe("success");

    // La segunda choca contra la validacion del modelo (y contra el indice unico
    // parcial de Postgres, que es el cinturon de seguridad de abajo).
    await page.getByTestId("rule-new-btn").click();
    await page.fill('[data-testid="rule-name"]', "E2E Segunda por defecto");
    await page.getByTestId("rule-check-duplicates").uncheck();
    await page.getByTestId("rule-is-default").check();

    const [segunda] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith("/expense_rules") && r.request().method() === "POST"),
      page.getByTestId("rule-submit").click(),
    ]);

    const cuerpo = await segunda.json();
    expect(cuerpo.type).toBe("error");
    expect(cuerpo.message.join(" ")).toContain("regla por defecto");

    // El mensaje se ve en el formulario, que NO se cierra.
    await expect(page.getByTestId("rule-server-error")).toBeVisible();
    await expect(page.getByTestId("rule-server-error")).toContainText("regla por defecto");

    // Y no se guardo: sigue habiendo una sola regla por defecto.
    const listado = await page.request.get("/get_expense_rules");
    const reglas = (await listado.json()).data.filter((r) => r.is_default && r.active);
    expect(reglas.length).toBe(1);
  });
});
