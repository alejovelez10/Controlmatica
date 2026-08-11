# E2E con Playwright

```bash
# Primera vez
cd test/e2e
npm install
npm run install:browsers      # descarga chromium (~95 MB), una sola vez

# Uso diario (desde test/e2e)
npm run prepare:app           # db:test:prepare + webpack si hace falta + seed
npm test                      # todos los specs
npm run test:smoke            # solo el smoke, para validar el andamiaje
npm run test:budget           # un solo flujo: budget | receipt | ai | currency |
                              # accounting | permissions | pagination | rules
npm run seed                  # solo re-sembrar la BD de test
SKIP_WEBPACK=1 npm test       # sin recompilar packs (SOLO si no se toco app/javascript)
npm run report                # abre el reporte HTML de la ultima corrida
```

`npm test` levanta solo el server de test en el 3001; no hay que arrancarlo a mano.

## Tiempos reales medidos

| Paso | Tiempo |
|---|---|
| `npm install` | ~3 s |
| `npm run install:browsers` (una vez) | ~40 s, 95 MB |
| `bin/webpack` en frio (packs-test y cache borrados, 29 packs) | **6,2 s** |
| `bin/webpack` saltado por mtime | 0 s |
| `npm run test:smoke` **en frio** (`rm -rf public/packs-test tmp/cache/webpacker`) | **~20 s**, 6 tests |
| `npm run test:smoke` **en tibio** (packs ya compilados) | **~12 s**, 6 tests |

Medidos en esta maquina (M-series, `node_modules` instalado, chromium ya
descargado) con el server de test cayendose y levantandose en cada corrida. La
fila "en frio" incluye los 6,2 s de webpack: son el mismo comando, la diferencia
es solo si `prepare.js` salta la compilacion por mtime.

## Cosas que cuestan horas si no se saben

- **`config.cache_classes = true` en test**: el server NO recarga codigo. Tras
  editar un modelo o un controller hay que **matar el server** (`reuseExistingServer`
  lo reutiliza tal cual) o correr con `CI=1`.
- **`SKIP_WEBPACK=1` despues de tocar `app/javascript/` da falsos verdes**: el
  spec corre contra packs viejos. Usarlo solo si `git diff --name-only` no toca
  esa carpeta.
- **`allow_forgery_protection = false` en test**: un E2E verde **no valida CSRF**.
  Eso se prueba en el nivel de controller.
- **Nunca usar helpers `*_url` de Rails en un spec**: `config/routes.rb` fija
  `default_url_options host: "controlmatica.herokuapp.com"` y apuntarian a
  **produccion**. Siempre rutas relativas sobre `baseURL`.
- **`engines.node: "16.x"` del `package.json` de la raiz** (contrato con Heroku)
  contra el Node 22 de las maquinas de desarrollo: cualquier `yarn <script>`
  aborta con *"The engine node is incompatible with this module"*. Webpacker
  caia ahi porque resolvia el binario con `yarn bin`, cuya salida viene con
  codigos ANSI cuando stdout es una tuberia, y al no encontrar el archivo se iba
  a su plan B `yarn webpack`. Arreglado en `bin/webpack` fijando
  `WEBPACKER_NODE_MODULES_BIN_PATH`. Si vuelve a aparecer ese error, mirar ahi
  antes que nada: el sintoma es un E2E que sale con exit 1 sin correr un test.
- **`?tab=home` en la URL del centro de costos no es opcional**: sin el,
  `/cost_centers/:id` muestra el **calendario de turnos**, no la ficha con sus
  pestañas. Y la pestaña activa por defecto es *Cotizaciones*, no *Gastos*.
- **Resembrar no puede reescribir la contraseña de un usuario**: Devise guarda en
  la sesion el `authenticatable_salt`, asi que regenerar el hash invalida el
  `storageState` y el spec aterriza en la pantalla de login. El seed solo la
  asigna si `valid_password?` falla.

## Suite funcional (paquete 12)

| Spec | Escenario | Centro de costo | Resiembra | Depende de |
|---|---|---|---|---|
| `smoke.spec.js` | andamiaje | `CM-E2E-01-2026` | no | 01 |
| `budget.spec.js` | 1, 2, 3 — partidas y aprobacion automatica | `CM-E2E-BUD-2026` | si (`BUD`) | 04, 07, 08 |
| `receipt.spec.js` | 4 — comprobante adjunto | `CM-E2E-REC-2026` | si (`REC`) | 03, 06, 08 |
| `ai-capture.spec.js` | 5 — captura asistida (**en `fixme`**) | `CM-E2E-REC-2026` | si (`REC`) | 10 (sin terminar) |
| `currency.spec.js` | 6 — moneda extranjera y TRM | `CM-E2E-FX-2026` | si (`FX`) | 05, 08 |
| `accounting.spec.js` | 7 — bandeja y aprobacion contable | `CM-E2E-ACC-2026` | si (`ACC`) | 06, 09 |
| `permissions.spec.js` | 8 — denegaciones | `CM-E2E-PERM-2026` | no | 01, 07 |
| `pagination.spec.js` | 9 — regresion de paginacion | `CM-E2E-PAG-2026` | no | 03, 09 |
| `rules.spec.js` | los 4 del paquete 14 — reglas de gasto | `CM-E2E-RULE-2026` | si (`RULE`) | 14 |

**45 tests en verde y 3 en `fixme`.** Los 3 son la captura asistida por IA: no
existe la ruta `POST /extract_receipt/report_expenses` y el kill switch
`RECEIPT_EXTRACTION_ENABLED` arranca apagado, porque el seam `call_vision_model`
lo implementa el agente de Taimes. El cuerpo de las tres pruebas ya esta escrito;
cuando el seam llegue, basta con encender el flag en `webServer.env` y cambiar
`test.fixme` por `test`.

## Como se stubean la IA y la TRM

Las llamadas a `datos.gov.co` y al modelo de vision las hace **Rails**, en el
proceso del `webServer`, no el navegador: `page.route()` solo intercepta trafico
del navegador y no puede tocarlas, y WebMock solo parchea el proceso de Minitest.

`config/initializers/e2e_stubs.rb` reemplaza con `prepend` **un unico metodo por
servicio** —el borde de red— y nada mas: `ExchangeRateService.fetch_remote` y
`ReceiptExtractionService.call_vision_model`. Controller, transaccion,
persistencia, serializer y React corren de verdad. El archivo tiene doble guarda
(`RAILS_ENV=test` **y** `E2E_STUBS=1`) y aborta el boot si el flag esta puesto
fuera de test.

Cada llamada deja una linea JSON en `tmp/e2e/stub_calls.log`, que
`support/stubs.js` lee y los specs afirman: es la evidencia auditable de que no
salio trafico externo. `currency.spec.js` lo comprueba en cada corrida.

⚠️ **`reuseExistingServer` es una trampa aqui**: si ya tenias un `rails s -e test`
levantado **sin** `E2E_STUBS=1`, Playwright lo reutiliza y la suite le pegaria a
internet de verdad. Por eso el initializer añade la cabecera `X-E2E-Stubs: on` y
`global-setup.js` **aborta la corrida** si no la ve. Si te sale ese error, mata el
server (`kill $(cat tmp/pids/server-test.pid)`) y repite.

## Aislamiento

Cuatro capas: un centro de costo por spec, `workers: 1` con `fullyParallel: false`,
`reseedE2E("<SCOPE>")` en el `beforeAll` de los specs que mutan datos, y
`clearStubCalls()` en los que afirman sobre la bitacora. El seed nunca escribe ni
borra fuera de los 8 centros `CM-E2E-*` y de los 6 correos `*@controlmatica.test`.

- Los specs funcionales son del **paquete 12**; `smoke.spec.js` y toda la
  infraestructura son del **paquete 01**.
