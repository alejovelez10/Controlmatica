// M10 (2026-10-09): exportar desde Gastos SOLO los seleccionados, y bajar sus
// comprobantes en un ZIP, como ya hace Contabilidad.
//
// Lo que este spec cuida y la suite de Ruby no puede ver: que los checkboxes
// se pinten, que la barra cuente bien, que las dos descargas salgan con los ids
// MARCADOS y con la pestaña, y que cambiar de pestaña limpie la seleccion. El
// contenido del Excel y del ZIP lo prueba report_expenses_export_test.rb.
const { test, expect } = require("@playwright/test");

const ENDPOINT = "/get_report_expenses";

async function abrirGastos(page) {
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes(ENDPOINT) && r.status() === 200),
    page.goto("/report_expenses"),
  ]);
  const body = await res.json();
  expect(body.data.length).toBeGreaterThan(1);
  return body.data;
}

async function marcar(page, ids) {
  for (const id of ids) {
    await page.getByTestId(`cm-dt-select-${id}`).check();
  }
}

test.describe("Gastos — exportar los seleccionados y sus comprobantes (M10)", () => {
  test("sin nada marcado no hay barra de seleccion", async ({ page }) => {
    await abrirGastos(page);

    await expect(page.getByTestId("expense-selection-bar")).toHaveCount(0);
  });

  test("la barra cuenta los marcados y el Excel baja solo esos", async ({ page }) => {
    const filas = await abrirGastos(page);
    const ids = [filas[0].id, filas[1].id];

    await marcar(page, ids);
    await expect(page.getByTestId("expense-selection-count")).toHaveText("2");

    const [descarga] = await Promise.all([
      page.waitForEvent("download"),
      page.getByTestId("expense-export-selected").click(),
    ]);

    const url = decodeURIComponent(descarga.url());
    expect(url).toContain("/download_file/report_expenses/seleccion.xlsx");
    expect(url).toContain(`ids[]=${ids[0]}`);
    expect(url).toContain(`ids[]=${ids[1]}`);
    expect(url).toContain("scope=");
    expect(descarga.suggestedFilename()).toMatch(/\.xlsx$/);
  });

  test("descargar comprobantes baja un ZIP con los marcados", async ({ page }) => {
    const filas = await abrirGastos(page);
    const ids = [filas[0].id, filas[1].id];

    await marcar(page, ids);

    const [descarga] = await Promise.all([
      page.waitForEvent("download"),
      page.getByTestId("expense-download-receipts").click(),
    ]);

    const url = decodeURIComponent(descarga.url());
    expect(url).toContain("/download_receipts/report_expenses");
    expect(url).toContain(`ids[]=${ids[0]}`);
    expect(url).toContain(`ids[]=${ids[1]}`);
    expect(descarga.suggestedFilename()).toMatch(/^comprobantes-\d{8}\.zip$/);
  });

  test("limpiar la seleccion y cambiar de pestaña la vacian", async ({ page }) => {
    const filas = await abrirGastos(page);

    await marcar(page, [filas[0].id]);
    await page.getByTestId("expense-clear-selection").click();
    await expect(page.getByTestId("expense-selection-bar")).toHaveCount(0);

    await marcar(page, [filas[0].id]);
    await expect(page.getByTestId("expense-selection-bar")).toBeVisible();

    // Los ids marcados eran de otro conjunto: exportarlos desde la otra
    // pestaña recortaria en silencio los que no caben.
    await Promise.all([
      page.waitForResponse((r) => r.url().includes(ENDPOINT) && r.url().includes("scope=mine")),
      page.getByTestId("expense-scope-mine").click(),
    ]);
    await expect(page.getByTestId("expense-selection-bar")).toHaveCount(0);
  });
});
