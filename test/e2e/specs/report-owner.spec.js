// Propietario del centro que se crea desde un reporte de servicio (2026-10-22).
//
// Sin centro, guardar el reporte crea uno y el servidor exige su propietario
// (Report#propietario_del_centro_nuevo). El pack Reports.js no le pasaba la
// lista `owners` al componente: el select salia vacio y ningun reporte sin
// centro se podia guardar. El administrador E2E tiene «Puede ser propietario».
const { test, expect } = require("@playwright/test");

test("el reporte sin centro ofrece propietarios para el centro nuevo", async ({ page }) => {
  await page.goto("/reports");
  await page.locator("button", { hasText: "Nuevo Reporte" }).first().click();

  const caja = page.getByTestId("report-owner-select");
  await expect(caja).toBeVisible();
  await caja.click();

  // react-select con menuPortalTarget: las opciones se pintan en document.body.
  // No se espera un nombre: la base de test trae tambien los usuarios de los
  // fixtures, y basta con que la lista no llegue vacia.
  await expect(page.locator('[id*="-option-"]').first()).toBeVisible();
  await expect(page.getByText("Nadie tiene el permiso «Puede ser propietario»")).toHaveCount(0);
});
