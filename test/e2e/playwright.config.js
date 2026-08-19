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
  globalTeardown: require.resolve("./global-teardown.js"),

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
    // El testMatch del proyecto `setup` esta CERRADO a auth.setup.js a
    // proposito. Con el generico /.*\.setup\.js/ del paquete 01, este proyecto
    // ejecutaria tambien auth-restricted.setup.js y sobrescribiria
    // storageState.json con la sesion del usuario limitado: TODA la suite
    // correria como usuario restringido y fallaria en cascada de forma
    // incomprensible. Es la trampa mas dificil de diagnosticar del paquete.
    { name: "setup", testMatch: /auth\.setup\.js/ },
    { name: "setup-restricted", testMatch: /auth-restricted\.setup\.js/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "./.auth/storageState.json" },
      dependencies: ["setup", "setup-restricted"],
      testIgnore: /permissions\.spec\.js/,
    },
    {
      name: "chromium-restricted",
      use: { ...devices["Desktop Chrome"], storageState: "./.auth/storageState-restricted.json" },
      dependencies: ["setup", "setup-restricted"],
      testMatch: /permissions\.spec\.js/,
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
    env: {
      RAILS_ENV: "test",
      // E2E_STUBS enciende config/initializers/e2e_stubs.rb: ninguna llamada a
      // datos.gov.co ni al modelo de vision sale de esta maquina.
      E2E_STUBS: "1",
      // E2E_UPLOAD_ROOT lo LEE config/initializers/carrierwave.rb (dueño:
      // paquete 03). Sin el, CarrierWave guarda en tmp/uploads pero emite URLs
      // /uploads/..., que Rails sirve desde public/ => la descarga del
      // escenario 4 daria 404.
      E2E_UPLOAD_ROOT: "public",
      // Captura asistida (escenario 5). El kill switch tiene que estar
      // ENCENDIDO para que el boton se pinte, y las TAIMES_* son DUMMIES
      // obligatorias: sin ellas `ReceiptExtractionService.configured?` da falso
      // y el servicio corta en :not_configured ANTES de llegar al seam que el
      // stub E2E reemplaza. Ningun request sale a Taimes: el prepend de
      // e2e_stubs.rb atiende call_vision_model.
      RECEIPT_EXTRACTION_ENABLED: "true",
      TAIMES_INVOKE_URL: "http://e2e.invalid",
      TAIMES_AGENT_ID: "e2e-extractor",
      TAIMES_API_KEY: "kmz_e2e",
    },
  },
});
