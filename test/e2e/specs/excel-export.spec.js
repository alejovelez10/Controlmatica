// 2026-11-03: el boton Exportar de Centros de costo, Materiales, Ordenes de
// compra y Tableristas tiene que mandar EXACTAMENTE la consulta con que acaba
// de cargar la tabla: busqueda, filtros y orden. Antes cada pantalla armaba su
// URL aparte, se le olvidaba la busqueda y el servidor reventaba con los filtros
// que faltaban ("en materiales y ocs saca error", David).
//
// Lo que este spec cuida y la suite de Ruby no puede ver: la URL que arma el
// navegador despues de buscar, ordenar y filtrar. Que la misma consulta traiga
// las mismas filas y las columnas de la pantalla lo prueba
// test/integration/exportaciones_excel_test.rb.
//
// Datos: scope EXP del seed (CM-E2E-EXP-2026), textos "E2E EXP". Solo lectura.
const { test, expect } = require("@playwright/test");

// Los parametros de una URL sin la paginacion, ordenados para comparar.
function consulta(url) {
  const u = new URL(url, "http://x");
  return [...u.searchParams.entries()]
    .filter(([k]) => k !== "page" && k !== "per_page")
    .map(([k, v]) => `${k}=${v}`)
    .sort();
}

// Corre `accion` y devuelve la consulta del request de la tabla que dispara.
async function cargaDeLaTabla(page, endpoint, accion) {
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes(`${endpoint}?`) && r.status() === 200),
    accion(),
  ]);
  return consulta(res.url());
}

// El nombre accesible trae el glifo del icono delante (" Exportar"): por
// eso regex anclada al final y no `exact`.
const botonExportar = (page) => page.getByRole("link", { name: /Exportar$/ });

async function assertExportarIgualALaTabla(page, deLaTabla) {
  const exportar = botonExportar(page);
  await expect.poll(async () => consulta(await exportar.getAttribute("href"))).toEqual(deLaTabla);
}

const MODULOS = [
  { nombre: "Centros de costo", ruta: "/cost_centers", endpoint: "/get_cost_centers",
    busqueda: "EXP", parametroBusqueda: "descripcion=EXP", columna: "Codigo",
    fecha: { campo: "start_date", valor: "2026-01-01", parametro: "date_desde=2026-01-01" } },
  { nombre: "Materiales", ruta: "/materials", endpoint: "/get_materials",
    busqueda: "E2E EXP", parametroBusqueda: "search=E2E EXP", columna: "# Orden",
    fecha: { campo: "date_desde", valor: "2026-07-24", parametro: "date_desde=2026-07-24" } },
  { nombre: "Ordenes de compra", ruta: "/sales_orders", endpoint: "/get_sales_order",
    busqueda: "E2E EXP", parametroBusqueda: "search=E2E EXP", columna: "# Orden",
    fecha: { campo: "date_desde", valor: "2024-07-23", parametro: "date_desde=2024-07-23" } },
  { nombre: "Tableristas", ruta: "/contractors", endpoint: "/get_contractors",
    busqueda: "E2E EXP", parametroBusqueda: "search=E2E EXP", columna: "Horas",
    fecha: { campo: "date_desde", valor: "2026-07-24", parametro: "date_desde=2026-07-24" } },
];

test.describe("Exportar a Excel — la misma consulta que la tabla", () => {
  for (const m of MODULOS) {
    test(`${m.nombre}: buscar, ordenar y filtrar llegan al Excel`, async ({ page }) => {
      let q = await cargaDeLaTabla(page, m.endpoint, () => page.goto(m.ruta));
      await assertExportarIgualALaTabla(page, q);

      // 1. Barra de busqueda
      const buscador = page.locator(".cm-dt-search-input");
      await buscador.fill(m.busqueda);
      q = await cargaDeLaTabla(page, m.endpoint, () => buscador.press("Enter"));
      expect(q).toContain(m.parametroBusqueda);
      await assertExportarIgualALaTabla(page, q);
      await expect(page.getByTestId("cm-datatable-row").first()).toBeVisible();

      // 2. Orden por una columna
      q = await cargaDeLaTabla(page, m.endpoint, () =>
        page.locator("th.cm-dt-sortable", { hasText: m.columna }).first().click());
      await assertExportarIgualALaTabla(page, q);

      // 3. Filtro por fecha, encima de la busqueda y el orden
      await page.getByRole("button", { name: /Filtros$/ }).click();
      await page.locator(`input[name="${m.fecha.campo}"]`).fill(m.fecha.valor);
      q = await cargaDeLaTabla(page, m.endpoint, () =>
        page.getByRole("button", { name: "Aplicar filtros" }).click());
      expect(q).toContain(m.fecha.parametro);
      expect(q).toContain(m.parametroBusqueda);
      await assertExportarIgualALaTabla(page, q);

      // 4. El archivo baja y es un .xls de verdad (firma OLE2 D0 CF 11 E0).
      const href = await botonExportar(page).getAttribute("href");
      const res = await page.request.get(href);
      expect(res.status()).toBe(200);
      const cuerpo = await res.body();
      expect(cuerpo.subarray(0, 4).toString("hex")).toBe("d0cf11e0");
    });
  }
});
