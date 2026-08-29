// Escenario 8 — permisos. Corre en el proyecto `chromium-restricted`, con la
// sesion de e2e-limitado@controlmatica.test (rol "Limitado E2E").
//
// POR QUE EL ROL IMPORTA MAS QUE EL USUARIO: layouts/user.html.erb y el
// `is_admin?` de los controladores chequean `rol.name == "Administrador"` ANTES
// que los permisos. Con un usuario administrador estas cinco pruebas pasarian
// por accidente sin probar absolutamente nada. El rol "Limitado E2E" tiene
// exactamente Gastos (Ingreso al modulo, Crear), Centro de Costos (Ingreso al
// modulo) y Reportes de servicios (Ingreso al modulo): CERO Presupuesto y CERO
// Contabilidad. `test/integration/e2e_seed_test.rb` lo afirma explicitamente.
//
// El centro CM-E2E-PERM-2026 pertenece a benef_a y NO al usuario restringido: la
// prueba debe ser "no ve la pestana", no "la ve pero vacia".
//
// No resiembra: solo lee.
const { test, expect } = require("@playwright/test");
const { cc, expense, user } = require("../support/seedIds");
// BASE_URL y no "http://127.0.0.1:3001" a mano: el puerto lo decide
// `support/env` (E2E_BASE_URL). Con el literal, estos dos contextos salian a
// pedirle JSON a lo que hubiera en el 3001 —en esta maquina, otra aplicacion— y
// el spec fallaba con un error de parseo que no tiene nada que ver con permisos.
const { BASE_URL } = require("../support/env");

const OWNER_STATE = "./.auth/storageState.json";

test.describe("permisos de presupuesto y contabilidad", () => {
  test("un usuario sin permiso de presupuesto no ve la pestaña Presupuesto de gastos", async ({ page }) => {
    await page.goto(`/cost_centers/${cc("PERM")}?tab=home`);

    // Control positivo: la pagina cargo y sus pestanas se pintaron. Sin esto, un
    // 500 daria el mismo toHaveCount(0) y la prueba pasaria por la razon
    // equivocada.
    await expect(page.locator(".cm-tab-btn", { hasText: /^\s*Gastos\s*$/ })).toBeVisible();

    await expect(page.getByTestId("budget-tab")).toHaveCount(0);
    await expect(page.getByTestId("budget-panel")).toHaveCount(0);
  });

  test("un usuario sin permiso de presupuesto recibe 403 al listar partidas por URL directa", async ({ page }) => {
    const r = await page.request.get(`/get_expense_budgets/${cc("PERM")}`);

    expect(r.status()).toBe(403);
    const cuerpo = await r.json();
    expect(cuerpo.type).toBe("error");
    expect(cuerpo.message[0]).toContain("No tiene permiso");
  });

  test("un usuario sin permiso de presupuesto recibe 403 al crear una partida por API", async ({ page, playwright }) => {
    const r = await page.request.post("/expense_budgets", {
      data: { cost_center_id: cc("PERM"), user_id: user("restringido"), amount: 100000 },
    });

    expect(r.status()).toBe(403);

    // Un 403 que igual escribio es PEOR que no tener el gate: se comprueba el
    // efecto con la sesion del dueño, que si puede leer las partidas del centro.
    const contextoDueno = await playwright.request.newContext({
      baseURL: page.context()._options?.baseURL || BASE_URL,
      storageState: OWNER_STATE,
    });
    const lectura = await contextoDueno.get(`/get_expense_budgets/${cc("PERM")}`);
    expect(lectura.status()).toBe(200);
    expect((await lectura.json()).total).toBe(1);
    await contextoDueno.dispose();
  });

  test("un usuario sin permiso de contabilidad no ve el menu ni entra a la pantalla", async ({ page }) => {
    await page.goto("/report_expenses");
    await expect(page.getByTestId("nav-contabilidad")).toHaveCount(0);

    await page.goto("/accounting_expenses");

    // require_accounting_module! redirige a root_path.
    await expect(page).toHaveURL(/\/$/);
    // Y la pantalla de Contabilidad NO se monto: el redirect es real, no un
    // render con la tabla vacia.
    await expect(page.getByTestId("accounting-page")).toHaveCount(0);

    // HALLAZGO, y por eso esta prueba no afirma sobre el mensaje: el controlador
    // hace `redirect_to root_path, alert: "No tiene permiso..."` pero NINGUN
    // layout de la aplicacion pinta `flash`. `grep -rn flash app/views/layouts`
    // no devuelve una sola linea. El usuario es expulsado sin explicacion.
    // Afirmar aqui sobre ".alert, .toast" seria afirmar sobre algo que la
    // aplicacion no emite, y arreglar el layout no le corresponde a este
    // paquete. Queda anotado como pendiente para el 13.
    //
    // La denegacion SI se comprueba, por la via que el servidor responde de
    // verdad: el endpoint de datos devuelve 403 con su mensaje.
    const r = await page.request.get("/get_accounting_expenses");
    expect(r.status()).toBe(403);
    expect((await r.json()).message[0]).toContain("No tiene permiso");
  });

  test("un usuario sin permiso de contabilidad recibe 403 al aprobar un gasto por API", async ({ page, playwright }) => {
    const r = await page.request.patch(`/update_accounting_state/${expense("PERM_001")}/true`);
    expect(r.status()).toBe(403);

    const contextoDueno = await playwright.request.newContext({
      baseURL: BASE_URL,
      storageState: OWNER_STATE,
    });
    const lectura = await contextoDueno.get(
      `/get_accounting_expenses?cost_center_id=${cc("PERM")}&per_page=50`
    );
    const cuerpo = await lectura.json();
    const gasto = cuerpo.data.find((e) => e.id === expense("PERM_001"));

    expect(gasto).toBeTruthy();
    expect(gasto.accounting_approved).toBe(false);
    await contextoDueno.dispose();
  });
});
