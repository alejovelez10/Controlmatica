// Login por UI UNA sola vez. El resto de los specs reusa la sesion via
// storageState, en vez de pagar un login por test.
//
// Selectores verificados contra app/views/devise/sessions/new.html.erb:
//   f.email_field :email     -> id="user_email"
//   f.password_field :password -> id="user_password"
//   f.submit "Ingresar"      -> <input type="submit" value="Ingresar">
const { test: setup, expect } = require("@playwright/test");
const { USER } = require("../support/env");

setup("autenticar", async ({ page }) => {
  await page.goto("/users/sign_in");

  await page.fill("#user_email", USER.email);
  await page.fill("#user_password", USER.password);
  await page.click('input[value="Ingresar"]');

  // El destino lo decide ApplicationController#after_sign_in_path_for y NO es
  // determinista entre entornos: con "Ver tablero" presente va a
  // dashboard_ing_path?tab=home, si no a reports_path, y si no a root_path.
  // Por eso se asierta "ya no estoy en el login" y no una URL concreta.
  await expect(page).not.toHaveURL(/sign_in/);

  await page.context().storageState({ path: "./.auth/storageState.json" });
});
