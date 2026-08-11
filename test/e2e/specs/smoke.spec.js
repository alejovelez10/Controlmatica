// Smoke del andamiaje E2E. Valida, ANTES de que 11 paquetes construyan encima,
// que: el server de test esta arriba, los packs estan compilados, el seed cargo,
// la sesion persiste y los data-testid existen.
//
// Este es el UNICO spec del paquete 01. Los 9 flujos funcionales son del
// paquete 12 y de nadie mas.
//
// TRAMPAS YA CONOCIDAS, para los paquetes que escriban specs despues:
//  - Los 4 react-select del modal de gasto usan menuPortalTarget: document.body.
//    Sus opciones se renderizan FUERA del modal => buscarlas con
//    page.getByText(...), NUNCA con modal.getByText(...).
//  - El select de centro de costo no muestra nada hasta 3 caracteres (dispara
//    GET /shifts/search_cost_centers): hay que await page.waitForResponse(...)
//    antes de presionar Enter.
//  - config.cache_classes = true en test: el webServer NO recarga codigo. Tras
//    editar un modelo o un controller hay que matar el servidor
//    (reuseExistingServer lo reutiliza) o correr con CI=1.
//  - allow_forgery_protection = false en test => UN E2E VERDE NO VALIDA CSRF.
//    El paso de JSON a FormData con X-CSRF-Token se prueba en el nivel 2
//    (controller), no aqui.
const { test, expect } = require("@playwright/test");
const { SEED } = require("../support/env");

// nav-gastos vive DENTRO del treeview "Control de gastos", que en
// layouts/user.html.erb solo nace con is-expanded cuando el controller actual es
// uno de los de gastos. En cualquier otra pantalla esta plegado y, aunque
// Playwright lo considera "visible" (tiene caja), el <li> de "Centros de costos"
// intercepta el click. Hay que desplegarlo primero, que es lo que hace un
// usuario de verdad.
async function abrirMenuGastos(page) {
  await page.locator('a[data-toggle="treeview"]', { hasText: "Control de gastos" }).click();
  await expect(page.locator("li.treeview.is-expanded")).toBeVisible();
}

test.describe("smoke del andamiaje", () => {
  test("la sesion persistida funciona", async ({ page }) => {
    await page.goto("/");
    await expect(page).not.toHaveURL(/sign_in/);
  });

  test("el menu lateral tiene el enlace a Gastos", async ({ page }) => {
    await page.goto("/");
    await abrirMenuGastos(page);

    const enlace = page.getByTestId("nav-gastos");
    await expect(enlace).toBeVisible();
    await expect(enlace).toContainText("Gastos");
    await expect(enlace).toHaveAttribute("href", "/report_expenses");
  });

  test("entrar a Gastos monta el pack de React", async ({ page }) => {
    await page.goto("/");
    await abrirMenuGastos(page);
    await page.getByTestId("nav-gastos").click();

    await expect(page).toHaveURL(/\/report_expenses$/);

    // Si webpacker no compilo, este div NUNCA aparece: el pack no carga y
    // WebpackerReact.setup no corre.
    await expect(page.getByTestId("page-report-expenses")).toBeVisible();
  });

  test("la tabla se llena desde el endpoint, no desde el HTML", async ({ page }) => {
    const respuesta = page.waitForResponse(
      (r) => r.url().includes("/get_report_expenses") && r.status() === 200
    );

    await page.goto("/report_expenses");
    await respuesta;

    await expect(page.getByTestId("cm-datatable")).toBeVisible();
    await expect(page.getByTestId("cm-datatable-row")).toHaveCount(2);
    await expect(page.getByText(SEED.invoiceNumbers[0])).toBeVisible();
  });
});

test.describe("sin sesion", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("/report_expenses manda al login", async ({ page }) => {
    // Detecta que allow_forgery_protection = false no este desactivando ademas
    // la autenticacion.
    await page.goto("/report_expenses");

    await expect(page).toHaveURL(/sign_in/);
    await expect(page.locator("#user_email")).toBeVisible();
  });
});
