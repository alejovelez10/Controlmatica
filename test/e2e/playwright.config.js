const { defineConfig, devices } = require("@playwright/test");
const { BASE_URL, RAILS_ROOT } = require("./support/env");

module.exports = defineConfig({
  testDir: "./specs",
  timeout: 60_000,
  expect: { timeout: 10_000 },

  // workers: 1 y fullyParallel: false NO son negociables mientras
  // ReportExpense.search defina scopes de CLASE en runtime (arquitectura,
  // invariante 6) y mientras todos los specs compartan una sola BD de test.
  // Dos workers creando gastos contra el mismo centro se pisan y producen
  // fallos intermitentes indistinguibles de bugs reales.
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: require.resolve("./global-setup.js"),

  use: {
    // SIEMPRE baseURL, NUNCA los helpers *_url de Rails: config/routes.rb fija
    // default_url_options host "controlmatica.herokuapp.com" y un *_url apuntaria
    // a PRODUCCION.
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 15_000,
  },

  projects: [
    { name: "setup", testMatch: /.*\.setup\.js/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "./.auth/storageState.json" },
      dependencies: ["setup"],
    },
  ],

  webServer: {
    // -P con pidfile propio: sin el, `bin/rails server` usa tmp/pids/server.pid,
    // que es el MISMO del servidor de desarrollo. Si el desarrollador tiene su
    // `rails s` de siempre corriendo en el 3000, el server de test aborta con
    // "A server is already running" aunque el puerto 3001 este libre.
    // prepare.js va AQUI, encadenado antes del server, y no en globalSetup.
    // Motivo verificado contra Playwright 1.62: el webServer arranca ANTES que
    // el globalSetup, al reves de lo que se suponia. Con prepare en globalSetup
    // pasaban dos cosas, las dos fatales:
    //   1. db:test:prepare hace DROP DATABASE y el server de test ya tenia la
    //      conexion abierta => PG::ObjectInUse.
    //   2. webpacker.yml tiene compile: true en test, asi que el primer request
    //      disparaba la compilacion de 29 packs dentro del timeout del server.
    command:
      "node test/e2e/scripts/prepare.js && " +
      "bin/rails server -b 127.0.0.1 -p 3001 -e test -P tmp/pids/server-test.pid",
    cwd: RAILS_ROOT,
    url: BASE_URL,
    timeout: 180_000,
    // TRAMPA: config.cache_classes = true en test. El server NO recarga codigo.
    // Tras editar un modelo o un controller hay que MATAR el server, porque
    // reuseExistingServer lo reutiliza tal cual.
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
    env: { RAILS_ENV: "test" },
  },
});
