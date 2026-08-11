// Sesiones de los dos usuarios que NO tienen permisos plenos.
//
// Los dos van en el MISMO archivo a proposito: asi el proyecto
// `setup-restricted` los cubre con un solo testMatch y no hace falta un tercer
// proyecto.
//
// Ninguno de los dos roles se llama "Administrador", y eso es lo que hace que
// los escenarios de denegacion prueben algo: layouts/user.html.erb y el
// is_admin? de los controladores chequean el nombre del rol ANTES que los
// permisos.
const { test: setup, expect } = require("@playwright/test");

setup("autenticar usuario restringido", async ({ page }) => {
  await page.goto("/users/sign_in");
  await page.fill("#user_email", "e2e-limitado@controlmatica.test");
  await page.fill("#user_password", "e2e-password-123");
  await page.click('input[value="Ingresar"]');

  await expect(page).not.toHaveURL(/sign_in/);
  await page.context().storageState({ path: "./.auth/storageState-restricted.json" });
});

// Encargo del paquete 09 (E7.9-E7.11 de accounting.spec.js): entra a
// Contabilidad pero no puede aprobar ni exportar.
setup("autenticar contable sin aprobar ni exportar", async ({ page }) => {
  await page.goto("/users/sign_in");
  await page.fill("#user_email", "e2e-contab@controlmatica.test");
  await page.fill("#user_password", "e2e-password-123");
  await page.click('input[value="Ingresar"]');

  await expect(page).not.toHaveURL(/sign_in/);
  await page.context().storageState({ path: "./.auth/storageState-contab.json" });
});
