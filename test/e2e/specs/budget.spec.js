// Escenarios 1, 2 y 3 — partidas presupuestales y aprobacion automatica.
// Centro CM-E2E-BUD-2026 (viaticos 5.000.000), sin partidas ni gastos al
// empezar: las partidas se crean POR LA UI, porque sembrarlas haria que el test
// no probara el formulario.
//
// `mode: "serial"`: los seis tests encadenan estado a proposito (dos partidas,
// el bloqueo de la tercera, un gasto que cabe y otro que se pasa). Es el unico
// spec donde el orden es parte de lo que se prueba.
const { test, expect } = require("@playwright/test");
const { reseedE2E } = require("../support/db");
const { cc, user } = require("../support/seedIds");
const { aNumero } = require("../support/money");
const {
  abrirModalGasto,
  elegirCentro,
  elegirSelect,
  llenarGasto,
  guardarGasto,
} = require("../support/expenseForm");

const CODIGO = "CM-E2E-BUD-2026";

// Ids que los tests se pasan entre si. No se leen de seed-ids.json porque los
// crea la propia UI: ese es el punto del escenario.
const creado = { partidaAna: null, partidaBruno: null, gastoCabe: null, gastoExcede: null };

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  reseedE2E("BUD");
});

// `?tab=home` y el click en la pestana: sin lo primero la URL cae en el
// calendario de turnos, y la pestana activa por defecto es "Cotizaciones".
async function abrirPestanaPresupuesto(page) {
  await page.goto(`/cost_centers/${cc("BUD")}?tab=home`);

  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/get_expense_budgets/") && r.status() === 200),
    page.getByTestId("budget-tab").click(),
  ]);

  await expect(page.getByTestId("budget-panel")).toBeVisible();
  await expect(page.getByTestId("budget-summary")).toBeVisible();
}

async function crearPartida(page, { beneficiario, monto, notas }) {
  await page.getByTestId("budget-new-btn").click();
  await elegirSelect(page, "budget-user-select", beneficiario);
  await page.fill('[data-testid="budget-amount"]', String(monto));
  await page.fill('[data-testid="budget-notes"]', notas);
}

const importe = async (page, testid) => aNumero(await page.getByTestId(testid).textContent());

test.describe("escenario 1 — partidas presupuestales", () => {
  test("el dueño del centro crea una partida para Ana y el tablero la refleja", async ({ page }) => {
    await abrirPestanaPresupuesto(page);

    expect(await importe(page, "budget-summary-viatic")).toBe(5000000);
    expect(await importe(page, "budget-summary-assigned")).toBe(0);

    await crearPartida(page, { beneficiario: "Ana", monto: 3000000, notas: "Viaticos Ana semana 1" });

    const [res] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().endsWith("/expense_budgets") && r.request().method() === "POST"
      ),
      page.getByTestId("budget-submit").click(),
    ]);

    const body = await res.json();
    expect(body.type).toBe("success");
    creado.partidaAna = body.register.id;

    expect(await importe(page, "budget-summary-assigned")).toBe(3000000);
    expect(await importe(page, "budget-summary-unassigned")).toBe(2000000);

    await expect(page.getByTestId(`budget-row-${creado.partidaAna}`)).toBeVisible();
    // Nada gastado todavia: el disponible de la partida es su monto entero.
    expect(await importe(page, `budget-available-${creado.partidaAna}`)).toBe(3000000);
  });

  test("crea una segunda partida para Bruno y el disponible del centro baja", async ({ page }) => {
    await abrirPestanaPresupuesto(page);
    await crearPartida(page, { beneficiario: "Bruno", monto: 1500000, notas: "Viaticos Bruno semana 1" });

    const [res] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().endsWith("/expense_budgets") && r.request().method() === "POST"
      ),
      page.getByTestId("budget-submit").click(),
    ]);

    const body = await res.json();
    expect(body.type).toBe("success");
    creado.partidaBruno = body.register.id;

    expect(await importe(page, "budget-summary-assigned")).toBe(4500000);
    expect(await importe(page, "budget-summary-unassigned")).toBe(500000);
    // Se cuentan las FILAS de la tabla y no `[data-testid^="budget-row-"]`: ese
    // prefijo tambien casa con budget-row-menu-{id}, budget-row-edit-{id} y
    // budget-row-delete-{id}, asi que dos partidas darian ocho coincidencias.
    await expect(page.getByTestId("budget-panel").getByTestId("cm-datatable-row")).toHaveCount(2);
  });

  test("la tercera partida se bloquea por exceder el valor de viaticos y el sistema dice cuanto queda", async ({ page }) => {
    await abrirPestanaPresupuesto(page);
    await crearPartida(page, { beneficiario: "Carla", monto: 1000000, notas: "Viaticos Carla" });

    // EL BLOQUEO ES DE LAS DOS CAPAS, y por eso este test las comprueba las dos.
    //
    // Capa 1, el cliente: `BudgetsTable#blockReason()` deja el boton DESHABILITADO
    // y pinta `budget-block-message` con lo que queda por asignar. El plan
    // esperaba aqui un POST con `type: "error"`, pero ese POST no existe: la UI
    // no deja llegar. Esperar la respuesta habria colgado el test 15 s.
    await expect(page.getByTestId("budget-block-message")).toBeVisible();
    expect(aNumero(await page.getByTestId("budget-block-message").textContent())).toBe(500000);
    await expect(page.getByTestId("budget-submit")).toBeDisabled();

    // Capa 2, el servidor: es la que de verdad protege el dato, asi que se
    // ejercita por API saltandose la UI. Si algun dia alguien quita el guard del
    // cliente, esta mitad sigue en pie.
    const r = await page.request.post("/expense_budgets", {
      data: { cost_center_id: cc("BUD"), user_id: user("benef_c"), amount: 1000000, active: true },
      headers: { "Content-Type": "application/json" },
    });

    // `type: "error"` con HTTP 200 es la convencion del proyecto.
    expect(r.status()).toBe(200);
    const cuerpo = await r.json();
    expect(cuerpo.type).toBe("error");
    expect(cuerpo.message[0]).toContain("supera el valor de viáticos");
    expect(cuerpo.message[0]).toContain("500.000");

    // Y lo que de verdad importa: NADA se guardo.
    await expect(page.getByTestId("budget-summary-assigned")).toBeVisible();
    expect(await importe(page, "budget-summary-assigned")).toBe(4500000);
    // Se cuentan las FILAS de la tabla y no `[data-testid^="budget-row-"]`: ese
    // prefijo tambien casa con budget-row-menu-{id}, budget-row-edit-{id} y
    // budget-row-delete-{id}, asi que dos partidas darian ocho coincidencias.
    await expect(page.getByTestId("budget-panel").getByTestId("cm-datatable-row")).toHaveCount(2);
  });
});

test.describe("escenarios 2 y 3 — gastos contra la partida", () => {
  test("un gasto que cabe en la partida queda aprobado automaticamente", async ({ page }) => {
    await page.goto("/report_expenses");
    await abrirModalGasto(page);

    await elegirCentro(page, CODIGO);
    await elegirSelect(page, "expense-user-select", "Ana");

    // El disponible en vivo llega por GET /get_expense_budget_available con 400 ms
    // de debounce: sin esperarlo, el hint todavia no existe.
    await expect(page.getByTestId("expense-budget-ok")).toBeVisible();
    expect(aNumero(await page.getByTestId("expense-budget-ok").textContent())).toBe(3000000);

    await llenarGasto(page, {
      invoice_name: "Hotel Ana",
      invoice_date: "2026-06-15",
      identification: "900111222",
      invoice_number: "FE-E2E-BUD-001",
      invoice_value: 1000000,
      invoice_tax: 190000,
    });

    const { body } = await guardarGasto(page);
    expect(body.type).toBe("success");
    expect(body.register.budget_status).toBe("aprobado");
    expect(body.register.budget_reason == null || body.register.budget_reason === "").toBeTruthy();
    creado.gastoCabe = body.register.id;

    await expect(page.getByTestId(`expense-budget-status-${creado.gastoCabe}`)).toContainText("Aprobado");
  });

  test("un gasto que se pasa del disponible se guarda igual pero queda excedido con el motivo visible", async ({ page }) => {
    await page.goto("/report_expenses");
    await abrirModalGasto(page);

    await elegirCentro(page, CODIGO);
    await elegirSelect(page, "expense-user-select", "Ana");

    // Disponible tras el gasto anterior: 3.000.000 - 1.000.000 = 2.000.000.
    await expect(page.getByTestId("expense-budget-ok")).toBeVisible();
    expect(aNumero(await page.getByTestId("expense-budget-ok").textContent())).toBe(2000000);

    await llenarGasto(page, {
      invoice_name: "Hotel Ana dos",
      invoice_date: "2026-06-16",
      identification: "900111222",
      invoice_number: "FE-E2E-BUD-002",
      invoice_value: 2500000,
      invoice_tax: 0,
    });

    // El aviso en vivo cambia de "ok" a "warning" en cuanto el valor supera el
    // disponible, y dice por cuanto se pasa: 2.500.000 - 2.000.000.
    await expect(page.getByTestId("expense-budget-warning")).toBeVisible();
    expect(aNumero(await page.getByTestId("expense-budget-warning").textContent())).toBe(500000);

    const { body } = await guardarGasto(page);
    expect(body.type).toBe("success");
    expect(body.register.budget_status).toBe("excedido");
    expect(body.register.budget_reason).toContain("500.000");
    // SE GUARDO: exceder el cupo marca el gasto, no lo rechaza.
    expect(body.register.id).toBeGreaterThan(0);
    creado.gastoExcede = body.register.id;

    const badge = page.getByTestId(`expense-budget-status-${creado.gastoExcede}`);
    await expect(badge).toContainText("Excedido");
    await expect(badge).toContainText("Excede el presupuesto");
  });

  test("los gastos excedidos no consumen cupo de la partida", async ({ page }) => {
    // La aserción que detecta la regresion mas cara del proyecto: si un excedido
    // descontara cupo, el disponible caeria a -500.000 y todos los gastos
    // siguientes de Ana quedarian marcados como excedidos contra un cupo que en
    // realidad esta libre.
    await abrirPestanaPresupuesto(page);

    expect(await importe(page, `budget-available-${creado.partidaAna}`)).toBe(2000000);
    expect(await importe(page, "budget-summary-spent")).toBe(1000000);
    // El tablero cuenta el excedido como tal, aunque no consuma cupo.
    await expect(page.getByTestId("budget-summary-exceeded")).toHaveText("1");
  });
});
