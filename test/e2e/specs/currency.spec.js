// Escenario 6 — gasto en moneda extranjera con su tasa. Centro CM-E2E-FX-2026.
//
// NINGUNA DE LAS TRES PRUEBAS SALE A INTERNET. La consulta de TRM la hace Rails,
// no el navegador, asi que `page.route()` no puede tocarla: el borde de red
// (`ExchangeRateService.fetch_remote`) lo reemplaza
// config/initializers/e2e_stubs.rb, que ademas deja una linea JSON por llamada
// en tmp/e2e/stub_calls.log. Los tests afirman contra ese log: es la evidencia
// verificable de que no salio trafico.
//
// Todo lo demas corre de verdad: el controller, la cache de ExchangeRate, la
// persistencia del rango de vigencia, el serializer y la conversion del modelo.
const { test, expect } = require("@playwright/test");
const { reseedE2E } = require("../support/db");
const { aNumero } = require("../support/money");
const { clearStubCalls, lastStubCall } = require("../support/stubs");
const {
  abrirModalGasto,
  elegirCentro,
  elegirSelect,
  llenarGasto,
  guardarGasto,
} = require("../support/expenseForm");

const CODIGO = "CM-E2E-FX-2026";

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  // El reseed borra las tasas cacheadas de USD y EUR. Sin eso, la segunda
  // corrida cortaria en la cache de ExchangeRate y el stub no se ejercitaria:
  // el test pasaria sin probar el camino que dice probar.
  reseedE2E("FX");
  clearStubCalls();
});

// La consulta de TRM se dispara al elegir moneda, y solo si ya hay fecha.
async function abrirGastoEnMoneda(page, { fecha, moneda }) {
  await page.goto("/report_expenses");
  await abrirModalGasto(page);

  await elegirCentro(page, CODIGO);
  await elegirSelect(page, "expense-user-select", "Ana E2E");
  await page.fill('input[name="invoice_date"]', fecha);

  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/get_exchange_rate")),
    elegirSelect(page, "expense-currency-select", moneda),
  ]);

  return res.json();
}

test.describe("escenario 6 — moneda extranjera", () => {
  test("un gasto en dolares trae la tasa de la fecha y calcula los pesos", async ({ page }) => {
    const tasa = await abrirGastoEnMoneda(page, { fecha: "2026-06-15", moneda: "USD" });

    expect(tasa.type).toBe("success");
    // El plan pedia la cadena "4321.500000"; el endpoint serializa el BigDecimal
    // como "4321.5". Se compara el NUMERO para no atar la prueba a la
    // representacion, que es exactamente lo que la regla de importes de esta
    // suite manda hacer.
    expect(Number(tasa.rate_to_cop)).toBe(4321.5);
    expect(tasa.rate_date).toBe("2026-06-15");
    expect(tasa.source).toBe("trm_oficial");

    await expect(page.getByTestId("expense-rate")).toHaveValue("4,321.5");
    await expect(page.getByTestId("expense-rate-ok")).toBeVisible();

    await page.fill('[data-testid="expense-foreign-value"]', "120");
    await page.fill('[data-testid="expense-foreign-tax"]', "22.80");

    // 120 * 4321,5 = 518.580,00 y 22,80 * 4321,5 = 98.530,20. El calculo lo hace
    // el componente en vivo; el servidor lo vuelve a hacer al guardar.
    expect(aNumero(await page.locator('input[name="invoice_value"]').inputValue())).toBe(518580);
    expect(aNumero(await page.locator('input[name="invoice_tax"]').inputValue())).toBeCloseTo(98530.2, 2);

    await llenarGasto(page, {
      invoice_name: "Hotel Miami",
      identification: "900444555",
      invoice_number: "FE-E2E-FX-001",
    });

    const { body } = await guardarGasto(page);
    expect(body.type).toBe("success");
    expect(body.register.currency).toBe("USD");
    expect(Number(body.register.foreign_value)).toBe(120);
    expect(Number(body.register.invoice_value)).toBeCloseTo(518580.0, 2);
    expect(body.register.exchange_rate_source).toBe("trm_oficial");

    // La prueba de que no salio trafico: la atendio el stub.
    const llamada = lastStubCall("ExchangeRateService");
    expect(llamada).not.toBeNull();
    expect(llamada.method).toBe("fetch_remote");
    expect(llamada.args.currency).toBe("USD");
  });

  test("para una fecha de fin de semana el sistema avisa que usa el habil anterior", async ({ page }) => {
    // 2026-06-13 es sabado; el habil anterior es el viernes 12.
    const tasa = await abrirGastoEnMoneda(page, { fecha: "2026-06-13", moneda: "USD" });

    expect(tasa.type).toBe("success");
    expect(tasa.requested_date).toBe("2026-06-13");
    expect(tasa.rate_date).toBe("2026-06-12");

    const aviso = page.getByTestId("expense-rate-shifted");
    await expect(aviso).toBeVisible();
    // El formato de la fecha en el aviso lo decide el paquete 08; se acepta
    // cualquiera de las dos convenciones para no atar el test a un cambio
    // cosmetico.
    await expect(aviso).toHaveText(/(2026-06-12|12\/06\/2026)/);

    expect(aNumero(await page.getByTestId("expense-rate").inputValue())).toBe(4310);
  });

  test("sin tasa disponible el sistema no inventa un valor y permite capturarla a mano", async ({ page }) => {
    const tasa = await abrirGastoEnMoneda(page, { fecha: "2026-01-01", moneda: "USD" });

    expect(tasa.type).toBe("error");
    expect(tasa.message.join(" ")).toContain("Ingrésela manualmente");

    await expect(page.getByTestId("expense-rate-error")).toBeVisible();
    // NO se inventa nada: ni 0 ni la tasa de otra fecha.
    await expect(page.getByTestId("expense-rate")).toHaveValue("");

    await page.fill('[data-testid="expense-rate"]', "4000");
    await page.fill('[data-testid="expense-foreign-value"]', "100");

    await llenarGasto(page, {
      invoice_name: "Hotel sin tasa",
      identification: "900444555",
      invoice_number: "FE-E2E-FX-003",
    });

    const { body } = await guardarGasto(page);
    expect(body.type).toBe("success");
    expect(body.register.exchange_rate_source).toBe("manual");
    expect(Number(body.register.invoice_value)).toBeCloseTo(400000.0, 2);
  });
});
