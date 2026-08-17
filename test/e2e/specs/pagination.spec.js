// Escenario 9 — regresion de la paginacion de la tabla de gastos del centro de
// costos. Centro CM-E2E-PAG-2026, 57 gastos. Solo lee: no resiembra.
//
// QUE SE ESTA PROTEGIENDO, en terminos del codigo real y no de folclore:
//
// 1. `components/ShowConstCenter/ExpensesTable.jsx` arranca con
//    `meta.per_page: 100`, `packs/ReportExpenseIndex.js` con 50, y CmDataTable
//    cae a 10 si `serverMeta` llega undefined (CmDataTable.jsx: si hay
//    serverPagination pero no serverMeta, pagina EN EL CLIENTE, sin ningun error
//    visible). Cualquier fallo del fetch que deje `meta` sin actualizar
//    convierte la tabla en "solo veo las primeras filas" sin un solo mensaje.
// 2. `report_expenses_controller.rb#get_cost_center_report_expenses` usa
//    `per_page: params[:per_page] || 100` sin `.to_i` y sin el tope `.min(100)`
//    que la arquitectura exige para todos los listados.
//
// El "bug de los 50 registros" no esta documentado en ninguna parte del repo
// (se busco en los planes, en el informe de modernizacion y en el historial de
// git). Estos cuatro tests son regresion de la FAMILIA de defectos: fallan ante
// cualquiera de los dos, porque afirman simultaneamente sobre el JSON de la
// respuesta y sobre el DOM. Esa doble aserción es la que distingue "el servidor
// mando 57 y el cliente corto 50" de "el servidor pagino".
//
// 57 y no 50 ni 100: con per_page = 50 da dos paginas desparejas (50 + 7).
const { test, expect } = require("@playwright/test");
const { cc } = require("../support/seedIds");

const ENDPOINT = "/get_cost_center_report_expenses/";

// DOS TRAMPAS DE NAVEGACION, las dos verificadas en pantalla:
//
// 1. `?tab=home` NO es decorativo: `components/ConstCenter/show.jsx` decide con
//    `current_tab === "home"` si pinta la ficha con sus pestanas (Gastos,
//    Presupuesto, Materiales…) o el CALENDARIO de turnos. Sin el parametro la
//    URL cae en el calendario, no hay ninguna tabla de gastos y el
//    waitForResponse se cuelga 15 s sin decir por que.
// 2. La pestana activa por defecto NO es Gastos: `TabContentShow#getTabs`
//    antepone "Cotizaciones" cuando el centro tiene cotizaciones, y `activeTab`
//    arranca en "1".
// La pestana activa por defecto es "Cotizaciones" (el centro tiene cotizaciones),
// asi que hay que entrar a "Gastos" a mano, que es lo que hace una persona.
async function abrirGastosDelCentro(page) {
  await page.goto(`/cost_centers/${cc("PAG")}?tab=home`);

  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes(ENDPOINT) && r.status() === 200),
    page.locator(".cm-tab-btn", { hasText: /^\s*Gastos\s*$/ }).click(),
  ]);

  await expect(page.getByTestId("cm-datatable")).toBeVisible();
  return res;
}

// Devuelve el JSON de la respuesta que dispara `accion`.
async function conRespuesta(page, accion, filtro = () => true) {
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes(ENDPOINT) && r.status() === 200 && filtro(r.url())),
    accion(),
  ]);
  return { url: res.url(), body: await res.json() };
}

const refsVisibles = (page) =>
  page.locator('[data-testid^="expense-ref-"]').allTextContents();

test.describe("paginacion de la tabla de gastos del centro de costos", () => {
  test("la primera pagina trae exactamente per_page filas del servidor, no del cliente", async ({ page }) => {
    await abrirGastosDelCentro(page);

    const { url, body } = await conRespuesta(
      page,
      () => page.locator(".cm-dt-per-page select").selectOption("50"),
      (u) => u.includes("per_page=50")
    );

    expect(url).toContain("per_page=50");
    expect(url).toContain("page=1");
    expect(body.data.length).toBe(50);
    expect(body.total).toBe(57);

    await expect(page.getByTestId("cm-datatable-row")).toHaveCount(50);
    await expect(page.locator(".cm-dt-info")).toHaveText("Mostrando 1 - 50 de 57 registros");
    await expect(page.locator(".cm-dt-page-info")).toHaveText("1 / 2");
  });

  test("la segunda pagina trae las 7 restantes y ninguna fila se repite", async ({ page }) => {
    await abrirGastosDelCentro(page);
    await conRespuesta(
      page,
      () => page.locator(".cm-dt-per-page select").selectOption("50"),
      (u) => u.includes("per_page=50")
    );

    const primeraPagina = await refsVisibles(page);
    expect(primeraPagina.length).toBe(50);

    const { url, body } = await conRespuesta(
      page,
      () => page.locator(".cm-dt-page-btn", { hasText: "›" }).click(),
      (u) => u.includes("page=2")
    );

    expect(url).toContain("page=2");
    expect(url).toContain("per_page=50");
    expect(body.data.length).toBe(7);

    await expect(page.getByTestId("cm-datatable-row")).toHaveCount(7);
    await expect(page.locator(".cm-dt-info")).toHaveText("Mostrando 51 - 57 de 57 registros");

    // La aserción que detecta el off-by-one de pagina, que haria que la segunda
    // pagina repitiera filas de la primera.
    const segundaPagina = await refsVisibles(page);
    const union = new Set([...primeraPagina, ...segundaPagina]);
    expect(union.size).toBe(57);
  });

  test("cambiar a 100 por pagina trae los 57 en una sola pagina", async ({ page }) => {
    await abrirGastosDelCentro(page);

    // Se pasa por 50 primero: la tabla arranca en 100 y seleccionar el valor que
    // ya esta puesto no dispara onChange, con lo que el waitForResponse se
    // colgaria 15 s.
    await conRespuesta(
      page,
      () => page.locator(".cm-dt-per-page select").selectOption("50"),
      (u) => u.includes("per_page=50")
    );

    const { url, body } = await conRespuesta(
      page,
      () => page.locator(".cm-dt-per-page select").selectOption("100"),
      (u) => u.includes("per_page=100")
    );

    expect(url).toContain("per_page=100");
    expect(url).toContain("page=1");
    expect(body.data.length).toBe(57);

    await expect(page.getByTestId("cm-datatable-row")).toHaveCount(57);
    await expect(page.locator(".cm-dt-page-info")).toHaveText("1 / 1");
    await expect(page.locator(".cm-dt-page-btn", { hasText: "›" })).toBeDisabled();
    await expect(page.locator(".cm-dt-page-btn", { hasText: "»" })).toBeDisabled();
  });

  test("la busqueda pagina en el servidor y no filtra solo la pagina visible", async ({ page }) => {
    await abrirGastosDelCentro(page);

    await conRespuesta(
      page,
      () => page.locator(".cm-dt-per-page select").selectOption("10"),
      (u) => u.includes("per_page=10")
    );

    // CORRECCION AL PLAN: el prefijo tiene que ser "FE-E2E-PAG-00" y no
    // "FE-E2E-PAG-0". Los numeros se siembran con %03d, asi que 001..057 TODOS
    // empiezan por 0 y el prefijo corto devolveria los 57. Con dos ceros
    // coinciden exactamente 001..009, que son los 9 que el criterio pide.
    const { url, body } = await conRespuesta(
      page,
      async () => {
        await page.locator(".cm-dt-search-input").fill("FE-E2E-PAG-00");
        await page.locator(".cm-dt-search-input").press("Enter");
      },
      (u) => u.includes("q=FE-E2E-PAG-00")
    );

    expect(url).toContain("page=1");
    expect(body.total).toBe(9);

    // Si CmDataTable filtrara localmente (getProcessedData con onSearch puesto),
    // aqui saldrian 0 o 1 filas segun la pagina que estuviera cargada.
    await expect(page.getByTestId("cm-datatable-row")).toHaveCount(9);
    await expect(page.locator(".cm-dt-page-info")).toHaveText("1 / 1");
  });
});
