// Escenario 7 — pantalla de Contabilidad. Centro CM-E2E-ACC-2026, 12 gastos
// sembrados: 8 aprobados presupuestalmente, 3 sin presupuesto y 1 excedido.
//
// ARCHIVO COMPLETO, DUEÑO UNICO: paquete 12 (00-ARQUITECTURA 7.2). No es un
// describe que se agrega a un archivo ajeno. Son 11 tests en tres bloques:
//   - 3 propios del escenario 7,
//   - 5 que describia el paquete 09 y que este absorbio al quedar como dueño
//     unico de los specs funcionales,
//   - 3 negativos que el 09 encarga para compensar que no hay runner de JS en el
//     repo y ~30 de sus criterios son comportamiento puramente de cliente.
//
// REGLA DE NEGOCIO QUE SE PRUEBA Y QUE CONTRADICE LA LECTURA LITERAL DEL BRIEF:
// la bandeja lista `aprobado` Y `sin_presupuesto`, y excluye solo `excedido`
// (00-ARQUITECTURA 2.3). Por eso el total esperado es 11 y no 8: filtrar por
// "aprobado" estricto dejaria fuera todos los gastos historicos y vaciaria la
// pantalla que se le vendio al cliente.
const { test, expect } = require("@playwright/test");
const { reseedE2E } = require("../support/db");
const { cc, expense } = require("../support/seedIds");

const CODIGO = "CM-E2E-ACC-2026";
const ENDPOINT = "/get_accounting_expenses";

test.describe.configure({ mode: "serial" });

// El filtro de centro es un react-select ASINCRONO (3+ letras, contra
// /search_cost_centers). Se selecciona por teclado, como los del formulario de
// gasto: sus opciones se portalizan a document.body.
async function filtrarPorCentro(page) {
  await page.getByTestId("accounting-filter-toggle").click();

  const caja = page.getByTestId("accounting-filter-cost-center");
  const input = caja.locator("input").first();
  await caja.click();
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/search_cost_centers") && r.status() === 200),
    input.pressSequentially(CODIGO, { delay: 30 }),
  ]);
  await expect(page.locator("body")).toContainText(CODIGO);
  await page.keyboard.press("Enter");
}

async function aplicarFiltros(page) {
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes(ENDPOINT) && r.status() === 200),
    page.getByTestId("accounting-filter-apply").click(),
  ]);
  return { url: res.url(), body: await res.json() };
}

async function abrirBandeja(page) {
  const primera = page.waitForResponse((r) => r.url().includes(ENDPOINT) && r.status() === 200);
  await page.goto("/accounting_expenses");
  await primera;
  await expect(page.getByTestId("accounting-page")).toBeVisible();
}

test.describe("Contabilidad — bandeja, aprobacion masiva y guarda de filtros (paquete 12)", () => {
  test.beforeAll(() => {
    reseedE2E("ACC");
  });

  test("la bandeja de contabilidad no muestra los gastos excedidos", async ({ page }) => {
    await abrirBandeja(page);
    await filtrarPorCentro(page);
    const { body } = await aplicarFiltros(page);

    // 12 sembrados - 1 excedido.
    expect(body.total).toBe(11);
    expect(body.data.every((e) => e.budget_status !== "excedido")).toBeTruthy();
    await expect(page.getByTestId(`accounting-ref-${expense("ACC_EXCEDIDO")}`)).toHaveCount(0);

    // REFUERZO IMPRESCINDIBLE: que no aparezca en la primera pagina no prueba
    // que este excluido. Que no aparezca BUSCANDOLO por su numero, si.
    const [busqueda] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(ENDPOINT) && r.url().includes("q=FE-E2E-ACC-012")),
      (async () => {
        await page.locator(".cm-dt-search-input").fill("FE-E2E-ACC-012");
        await page.locator(".cm-dt-search-input").press("Enter");
      })(),
    ]);

    expect((await busqueda.json()).total).toBe(0);
    await expect(page.locator(".cm-dt-empty")).toBeVisible();
  });

  test("aprueba en masa el filtro y los aprobados salen de la bandeja de pendientes", async ({ page }) => {
    await abrirBandeja(page);
    await filtrarPorCentro(page);
    await page.getByTestId("accounting-filter-approved").selectOption("false");

    // 10 por pagina y no 50: el boton "aprobar los N del filtro completo" solo
    // se pinta cuando la pagina entera esta seleccionada Y el filtro tiene MAS
    // registros que la pagina. Con las 11 filas en una sola pagina no habria
    // nada que distinguir entre "la seleccion" y "el filtro", que es justo lo
    // que este test separa.
    await aplicarFiltros(page);
    await Promise.all([
      page.waitForResponse((r) => r.url().includes(ENDPOINT) && r.url().includes("per_page=10")),
      page.locator(".cm-dt-per-page select").selectOption("10"),
    ]);

    await page.getByTestId("cm-dt-select-all").check();
    await expect(page.getByTestId("accounting-selection-count")).toHaveText("10");

    const [req, res] = await Promise.all([
      page.waitForRequest((r) => r.url().includes("/update_accounting_filter_values")),
      page.waitForResponse((r) => r.url().includes("/update_accounting_filter_values")),
      (async () => {
        await page.getByTestId("accounting-approve-filter").click();
        await page.locator(".swal2-confirm").click();
      })(),
    ]);

    expect(req.method()).toBe("PATCH");
    const body = await res.json();
    expect(body.type).toBe("success");
    expect(body.count).toBe(11);
    await expect(page.locator(".swal2-title")).toContainText("11");

    // La mitad que de verdad falla en integracion: la bandeja de pendientes
    // queda VACIA tras el refresco automatico.
    await expect(page.getByTestId("cm-datatable-row")).toHaveCount(0);
    await expect(page.locator(".cm-dt-empty")).toBeVisible();

    // Y al pedir los aprobados vuelven los 11, con quien aprobo.
    await page.getByTestId("accounting-filter-approved").selectOption("true");
    const aprobados = await aplicarFiltros(page);
    expect(aprobados.body.total).toBe(11);

    const primero = aprobados.body.data[0].id;
    await expect(page.getByTestId(`accounting-status-${primero}`)).toContainText("Aprobado");
    // Y QUIEN aprobo: el usuario de la sesion es e2e@controlmatica.test, cuyo
    // `names` es "Ingeniero" (la columna pinta names, no el correo).
    await expect(page.getByTestId(`accounting-status-${primero}`)).toContainText("Ingeniero");

    // REGLA DE NEGOCIO 2.3: el excedido SIGUE sin aprobar y el servidor se niega
    // a aprobarlo aunque se le pida directamente.
    const sinExcedido = await page.request.get(
      `${ENDPOINT}?cost_center_id=${cc("ACC")}&accounting_approved=true&per_page=100`
    );
    const idsAprobados = (await sinExcedido.json()).data.map((e) => e.id);
    expect(idsAprobados).not.toContain(expense("ACC_EXCEDIDO"));

    const rechazo = await page.request.patch(
      `/update_accounting_state/${expense("ACC_EXCEDIDO")}/true`
    );
    const cuerpo = await rechazo.json();
    expect(cuerpo.type).toBe("error");
    expect(cuerpo.message[0]).toContain("excede el presupuesto");
  });

  test("la aprobacion masiva sin ningun filtro se rechaza y no toca la base", async ({ page }) => {
    // El test mas barato de la suite y el que evita el incidente mas caro:
    // report_expenses_controller#update_filter_values aprueba la tabla entera
    // con el body vacio, y este endpoint NO puede repetir ese patron.
    await abrirBandeja(page);

    const antes = await page.request.get(
      `${ENDPOINT}?cost_center_id=${cc("ACC")}&accounting_approved=true&per_page=100`
    );
    const totalAntes = (await antes.json()).total;

    const r = await page.request.patch("/update_accounting_filter_values", { data: {} });
    expect(r.status()).toBe(200);
    const cuerpo = await r.json();
    expect(cuerpo.type).toBe("error");
    expect(cuerpo.message[0]).toContain("al menos un filtro");

    const despues = await page.request.get(
      `${ENDPOINT}?cost_center_id=${cc("ACC")}&accounting_approved=true&per_page=100`
    );
    expect((await despues.json()).total).toBe(totalAntes);
  });
});

test.describe("Contabilidad — flujo canonico y seleccion multiple", () => {
  test.beforeAll(() => {
    // Se resiembra: el bloque anterior dejo los 11 aprobados y estos cinco tests
    // necesitan la bandeja de pendientes llena otra vez.
    reseedE2E("ACC");
  });

  test("aprobar un gasto desde la bandeja lo saca de la lista de pendientes", async ({ page }) => {
    await abrirBandeja(page);
    await filtrarPorCentro(page);
    await page.getByTestId("accounting-filter-approved").selectOption("false");
    const { body } = await aplicarFiltros(page);

    const id = body.data[0].id;
    await page.getByTestId(`accounting-row-menu-${id}`).click();

    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/update_accounting_state/${id}/true`)),
      page.getByTestId(`accounting-approve-${id}`).click(),
    ]);

    expect(res.request().method()).toBe("PATCH");
    expect((await res.json()).type).toBe("success");

    // Con el filtro "Pendiente" aplicado, la fila desaparece de la bandeja.
    await expect(page.getByTestId(`accounting-ref-${id}`)).toHaveCount(0);

    // Y con el filtro "Aprobado" vuelve, ya marcada. El panel de filtros SIGUE
    // ABIERTO: `applyFilters` no lo cierra, y volver a pulsar el toggle no lo
    // reabre sino que lo cierra Y BORRA todos los filtros (`toggleFilters` limpia
    // al cerrar).
    await page.getByTestId("accounting-filter-approved").selectOption("true");
    await aplicarFiltros(page);
    await expect(page.getByTestId(`accounting-status-${id}`)).toContainText("Aprobado");
  });

  test("desaprobar un gasto lo devuelve a pendientes", async ({ page }) => {
    await abrirBandeja(page);
    await filtrarPorCentro(page);
    await page.getByTestId("accounting-filter-approved").selectOption("true");
    const { body } = await aplicarFiltros(page);

    expect(body.total).toBe(1);
    const id = body.data[0].id;

    await page.getByTestId(`accounting-row-menu-${id}`).click();
    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/update_accounting_state/${id}/false`)),
      page.getByTestId(`accounting-unapprove-${id}`).click(),
    ]);
    expect((await res.json()).type).toBe("success");

    await page.getByTestId("accounting-filter-approved").selectOption("false");
    const pendientes = await aplicarFiltros(page);

    expect(pendientes.body.total).toBe(11);
    await expect(page.getByTestId(`accounting-ref-${id}`)).toBeVisible();
  });

  test("la aprobacion masiva por seleccion manda un solo request con ids[]", async ({ page }) => {
    await abrirBandeja(page);
    await filtrarPorCentro(page);
    await page.getByTestId("accounting-filter-approved").selectOption("false");
    await aplicarFiltros(page);

    // Se cuentan TODAS las peticiones al endpoint de lote: el defecto que este
    // test vigila es que se dispare una por fila seleccionada, sin atomicidad y
    // con estado intermedio si la cuarta falla.
    const peticiones = [];
    page.on("request", (r) => {
      if (r.url().includes("/update_accounting_filter_values")) peticiones.push(r.url());
    });

    const filas = await page.getByTestId("cm-datatable-row").count();
    expect(filas).toBe(11);

    await page.getByTestId("cm-dt-select-all").check();
    await expect(page.getByTestId("accounting-selection-count")).toHaveText("11");

    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/update_accounting_filter_values")),
      (async () => {
        await page.getByTestId("accounting-approve-selected").click();
        await page.locator(".swal2-confirm").click();
      })(),
    ]);

    const body = await res.json();
    expect(body.type).toBe("success");
    expect(body.count).toBe(11);

    expect(peticiones.length).toBe(1);
    expect((peticiones[0].match(/ids%5B%5D=|ids\[\]=/g) || []).length).toBe(11);
  });

  test("los filtros de la bandeja se aplican y se limpian sin recargar la pagina", async ({ page }) => {
    await abrirBandeja(page);
    const navegaciones = [];
    page.on("framenavigated", (f) => navegaciones.push(f.url()));

    await filtrarPorCentro(page);
    const conFiltro = await aplicarFiltros(page);
    expect(conFiltro.url).toContain(`cost_center_id=${cc("ACC")}`);
    expect(conFiltro.body.total).toBe(11);

    const [limpio] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(ENDPOINT) && r.status() === 200),
      page.getByTestId("accounting-filter-clear").click(),
    ]);

    // Sin filtro de centro la bandeja trae ademas los gastos de los otros
    // centros E2E, asi que el total solo puede ser MAYOR.
    expect(limpio.url()).not.toContain("cost_center_id=");
    expect((await limpio.json()).total).toBeGreaterThan(11);

    // Y nada de esto recargo la pagina.
    expect(navegaciones.length).toBe(0);
  });

  test("la exportacion a Excel arrastra los filtros aplicados", async ({ page }) => {
    await abrirBandeja(page);
    await filtrarPorCentro(page);
    const { url } = await aplicarFiltros(page);

    const enlace = page.getByTestId("accounting-export");
    await expect(enlace).toBeVisible();
    const href = await enlace.getAttribute("href");

    expect(href).toContain("/download_file/accounting_expenses/");
    // Los mismos parametros que la ultima consulta de la tabla: el export
    // exporta lo que se ve, no la tabla entera.
    expect(href).toContain(`cost_center_id=${cc("ACC")}`);
    expect(url).toContain(`cost_center_id=${cc("ACC")}`);
  });
});

test.describe("Contabilidad — negativos de permisos y de render", () => {
  // Sesion del rol "Contable E2E": entra a Contabilidad pero NO tiene "Aprobar"
  // ni "Exportar a excel". Es lo que hace que @estados[:approve] y
  // @estados[:export] lleguen en false, que es lo que estos tres comprueban.
  test.use({ storageState: "./.auth/storageState-contab.json" });

  test.beforeAll(() => {
    reseedE2E("ACC");
  });

  test("sin permiso de aprobar no hay columna de seleccion ni menu de fila", async ({ page }) => {
    await abrirBandeja(page);
    await filtrarPorCentro(page);
    const { body } = await aplicarFiltros(page);

    // Control positivo: la tabla TIENE datos. Sin esto, un 500 daria los mismos
    // toHaveCount(0) y el test pasaria por la razon equivocada.
    expect(body.total).toBe(11);
    await expect(page.getByTestId(`accounting-ref-${body.data[0].id}`)).toBeVisible();

    await expect(page.locator(".cm-dt-select-header")).toHaveCount(0);
    await expect(page.getByTestId("cm-dt-select-all")).toHaveCount(0);
    await expect(page.getByTestId(`accounting-row-menu-${body.data[0].id}`)).toHaveCount(0);
    await expect(page.getByTestId("accounting-approve-selected")).toHaveCount(0);
    await expect(page.getByTestId("accounting-approve-filter")).toHaveCount(0);
  });

  test("sin permiso de exportar no aparece el enlace de exportacion", async ({ page }) => {
    await abrirBandeja(page);
    await filtrarPorCentro(page);
    const { body } = await aplicarFiltros(page);

    await expect(page.getByTestId(`accounting-ref-${body.data[0].id}`)).toBeVisible();
    await expect(page.getByTestId("accounting-export")).toHaveCount(0);
  });

  test("una respuesta 403 deja la tabla vacia y muestra el mensaje correcto", async ({ page }) => {
    // UNICA EXCEPCION AUTORIZADA a "page.route() no sirve para esta suite": aqui
    // no se intercepta trafico SALIENTE de Rails, sino la respuesta del propio
    // servidor al navegador, que es justo lo que page.route() si puede hacer.
    await page.route("**/get_accounting_expenses*", (ruta) =>
      ruta.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ type: "error", message: ["No tiene permiso para realizar esta acción"] }),
      })
    );

    await page.goto("/accounting_expenses");
    await expect(page.getByTestId("accounting-page")).toBeVisible();

    await expect(page.getByTestId("cm-datatable-row")).toHaveCount(0);
    await expect(page.locator(".cm-dt-empty")).toBeVisible();
    await expect(page.getByText("No tiene permiso para realizar esta acción")).toBeVisible();
  });
});
