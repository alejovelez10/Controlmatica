# Paquete 01 — Infraestructura de pruebas (Minitest + Playwright)

## 🔴 CORRECCIONES DE AUDITORÍA (vinculantes — leer ANTES que el resto del documento)

> Estas correcciones **mandan sobre cualquier texto de este archivo** que las contradiga. Salen de
> la auditoría cruzada de los 13 documentos y están consolidadas en `00-ARQUITECTURA.md` §7.

1. **Se BORRA la Tarea 15** (`config/initializers/carrierwave.rb` con
   `config.root = Rails.root.join('tmp')`). El dueño único de ese archivo es el **paquete 03**
   (§7.2). En su lugar, este paquete solo declara la dependencia: *"el 03 deja `config.root` en
   `Rails.root.join('tmp','uploads_test')`, sobrescribible por `ENV['E2E_UPLOAD_ROOT']`"*.
   Si el 01 se mergea antes que el 03, el initializer se deja **como está hoy**.
2. **Este paquete pasa a ser dueño de `lib/tasks/permissions_gastos_ia.rake`** y de su réplica en
   `lib/tasks/create_config.rake` (movidos desde el paquete 07). Contenido exacto: el de
   `00-ARQUITECTURA.md` §4.4, idempotente, sin ningún `destroy_all`. Razón: rompe el ciclo de
   dependencias 06 ↔ 07 (§7.3). Tarea nueva **25-bis**, con dos criterios: (a) correrla dos veces
   seguidas no duplica `ModuleControl` ni `AccionModule`; (b) crea los módulos `"Presupuesto"` y
   `"Contabilidad"` con sus 5 y 4 acciones.
3. **Confirmado y reforzado: `test/fixtures/accion_modules_rols.yml` NO se crea.** El HABTM va
   inline en `rols.yml`. Los paquetes 07, 09 y 10 ya fueron corregidos para decir `rols.yml`.
   Este paquete es **dueño único** de `rols.yml`, `users.yml`, `customers.yml`, `cost_centers.yml`,
   `module_controls.yml`, `accion_modules.yml`, `parameterizations.yml` y `report_expenses.yml`;
   los demás paquetes solo **agregan etiquetas**.
4. **`test/fixtures/parameterizations.yml` lo crea este paquete** (lo pedía el 10) y usa
   **`user_id: <%= ActiveRecord::FixtureSet.identify(:admin) %>`**, nunca `user: admin`:
   `Parameterization` **no declara `belongs_to :user`**, así que la forma de asociación intenta
   escribir una columna `user` inexistente y `fixtures :all` tumba la suite entera. Se agrega la
   aserción correspondiente al test guardián `fixtures_integrity_test.rb`.
5. **Inventario completo de `test/fixtures/files/`**: este paquete lo crea de una sola vez con la
   lista de §7.12 de la arquitectura (**14 archivos** tras el cierre de la reauditoría, que le
   agregó los tres `.xlsx` de import), no con los 3 que tenía. Los paquetes 03, 06,
   10, 11 y 12 solo declaran "ya existe".
6. **`test/support/` se autocarga y este paquete es dueño de `test_helper.rb`.** Se mantiene el
   `Dir[Rails.root.join("test/support/**/*.rb")].each { |f| require f }` de la Tarea 10, y se
   documenta como **convención del proyecto** (§7.2): ningún otro paquete modifica
   `test_helper.rb` ni usa `require_relative` para cargar dobles. Los paquetes 05, 10 y 11 ya
   fueron corregidos.
7. **Este paquete es dueño único de la infraestructura Playwright** y de nada más:
   `test/e2e/package.json`, `.nvmrc`, `playwright.config.js`, `global-setup.js`, `auth.setup.js`,
   `env.js`, `db.js`, `seed-ids`, `db/seeds/e2e.rb`, `smoke.spec.js` y `test/e2e/README.md`.
   **Todos los specs funcionales son del paquete 12** (§7.2). El texto del 08 que dice "la
   infraestructura la monta el primer paquete que escriba un E2E" queda derogado.
8. **Cita por línea corregida**: la Tarea 23 cita `layouts/user.html.erb:173` para el `link_to
   report_expenses_path`; la línea real es la **172**. Regla general del proyecto: **referenciar
   por nombre de método o por símbolo**, no por número de línea.
9. **Los `data-testid` mínimos de este paquete** (`nav-gastos`, `page-report-expenses`,
   `cm-datatable`, `cm-datatable-row`) están en la tabla canónica de §7.6 y **no cambian de
   nombre**.

> Este paquete **es** el "Paquete 0 de desbloqueo" de `00-ARQUITECTURA.md` §5.1, ampliado con la
> instalación completa de Playwright. Ningún otro paquete puede escribir una sola prueba antes de
> que este esté mergeado. Se numera 01 por coherencia con la serie de paquetes; ver
> "Discrepancias con la arquitectura".

---

## Objetivo

Dejar `bin/rails test` corriendo con **0 failures / 0 errors** sobre una base de fixtures sana y
con los helpers (`as_user`, login Devise, aserciones JSON, permisos, subida de archivos) que los
11 paquetes restantes van a usar sin escribir andamiaje propio. Y dejar Playwright instalado,
configurado y validado con un smoke test que hace login y entra a Gastos, con seed determinista y
sesión reutilizable.

---

## Dependencias

| Depende de | Por qué |
|---|---|
| **Ninguno** | Es el primer paquete del proyecto. Solo depende de `00-ARQUITECTURA.md`. |

**Dependencia declarada (no bloqueante) con el paquete 03** — corrección 1 del bloque de
auditoría: `config/initializers/carrierwave.rb` es del **paquete 03**. El 03 deja
`config.root` en `Rails.root.join("tmp","uploads_test")`, sobrescribible por
`ENV['E2E_UPLOAD_ROOT']`. Como el 01 se mergea **antes** que el 03, el initializer se deja
**como está hoy** y este paquete no lo toca. Ningún test ni spec de este paquete puede afirmar
nada sobre `CarrierWave.root` ni sobre `enable_processing`.

**Paquetes que dependen de este (todos):** presupuesto, comprobante, multimoneda, contabilidad,
extracción IA, reglas, MCP, refactor de `ReportExpense.search`, permisos y export. Ninguno puede
mergear sin que este esté en `master`.

**Qué NO hace este paquete (frontera explícita, no invadir):**

- No crea `expense_budgets.yml` ni `exchange_rates.yml`: esas fixtures nacen con su migración, en
  el paquete que la crea (arquitectura §5.4.7).
- No crea `app/services/` ni ningún servicio.
- No toca `ReportExpense.search` (paquete de refactor) ni los 4 uploaders existentes
  (paquete de comprobante, §4.8).
- **No toca `config/initializers/carrierwave.rb`** (corrección 1 del bloque de auditoría; dueño
  único: paquete **03**, §7.2). El bloque `if Rails.env.test?` lo escribe el 03, no este paquete.
- **No escribe ningún spec E2E funcional**: monta la infraestructura Playwright y **solo** el
  `smoke.spec.js`. Los 9 flujos funcionales (7 specs) son del paquete **12** (§7.2 y §5.2).
- No monta CI (arquitectura §5.5: recomendación por defecto es no montarlo).
- No agrega `webmock` ni `vcr` (arquitectura §6.7).

---

## Archivos

### A crear

| Ruta | Qué se hace |
|---|---|
| `test/fixtures/rols.yml` | 5 roles (`administrador`, `gerente`, `ingeniero`, `contador`, `sin_permisos`) con el HABTM `accion_modules` inline. |
| `test/fixtures/users.yml` | **8 usuarios** con `encrypted_password` real generado por `Devise::Encryptor` en ERB (los 6 originales + `dueno_centro` y `ingeniero_sin_permisos`, que el cierre de la reauditoría trajo aquí desde el 07 y el 09). |
| `test/fixtures/customers.yml` | 2 clientes (`cliente_uno`, `cliente_dos`). |
| `test/fixtures/cost_centers.yml` | 3 centros: con viáticos, sin viáticos (`viatic_value` nil), y ajeno a otro dueño. |
| `test/fixtures/parameterizations.yml` | Parámetros del motor de reglas. **`user_id: <%= ActiveRecord::FixtureSet.identify(:admin) %>`**, nunca `user: admin` (corrección 4). Ver Tarea 8-bis. |
| `test/fixtures/accion_modules_rols.yml` | **NO se crea.** Ver Tarea 6: el HABTM se declara inline en `rols.yml`. Se documenta aquí para que nadie lo cree por su cuenta. |
| `test/support/authentication_helpers.rb` | `as_user`, `sign_in_as`, `sign_out_current`, teardown de `User.current`. |
| `test/support/permission_helpers.rb` | `grant_permission!`, `revoke_permission!`, `rol_without_permissions`. |
| `test/support/json_helpers.rb` | `json_body`, `assert_json_success`, `assert_json_error`, `assert_json_forbidden`, `assert_json_list`. |
| `test/support/upload_helpers.rb` | `upload_fixture(nombre)` sobre `fixture_file_upload`. |
| `test/fixtures/files/**` (**14 archivos**) | Inventario canónico completo de §7.12 de la arquitectura, creado de una sola vez (corrección 5): `comprobante.pdf`, `comprobante.jpg`, `comprobante.png`, `malicioso.exe`, `disfrazado.png`, `comprobante_factura.pdf`, `comprobante_factura.jpg`, `comprobante_ilegible.png`, `comprobante_iphone.heic`, `comprobante_ia.jpg`, `comprobante_ia_usd.pdf`, `gastos_legacy_11col.xlsx`, `gastos_v2_18col.xlsx`, `gastos_multimoneda.xlsx`. Los paquetes 03, 05, 06, 10, 11 y 12 solo declaran "ya existe". Detalle en la Tarea 14. |
| `test/models/fixtures_integrity_test.rb` | Test guardián: todas las fixtures cargan y todas las FKs resuelven. |
| `test/models/test_helpers_test.rb` | Test de los helpers propios de este paquete. |
| `test/integration/authentication_smoke_test.rb` | Prueba que `sign_in_as` autentica y que un endpoint JSON responde. |
| `db/seeds/e2e.rb` | Seed idempotente y determinista para Playwright. |
| `test/e2e/package.json` | `@playwright/test` + scripts npm + `engines.node: ">=18"`. |
| `test/e2e/.nvmrc` | `22`. |
| `test/e2e/playwright.config.js` | `baseURL`, `webServer`, proyectos `setup` + `chromium`, `workers: 1`. |
| `test/e2e/global-setup.js` | Precompila packs de test, prepara la BD y corre el seed E2E. |
| `test/e2e/specs/auth.setup.js` | Login por UI una vez → `storageState`. |
| `test/e2e/specs/smoke.spec.js` | Smoke: login + entrar a Gastos. |
| `test/e2e/support/env.js` | Constantes compartidas (URL base, credenciales, códigos del seed). |
| `test/e2e/support/db.js` | `reseedE2E()` — vuelve a correr el seed vía `bin/rails runner`. |
| `test/e2e/scripts/prepare.js` | `db:test:prepare` + webpack condicionado por mtime + seed (Tarea 19). |
| `test/e2e/scripts/seed.js` | Solo el seed E2E (Tarea 19). |
| `test/e2e/README.md` | 15 líneas: comandos exactos. |
| `lib/tasks/permissions_gastos_ia.rake` | **Movido desde el paquete 07** (corrección 2, §7.2 y §7.3): rake idempotente de permisos, contenido exacto de `00-ARQUITECTURA.md` §4.4. Ver Tarea 25-bis. |

### A modificar

| Ruta | Qué se hace |
|---|---|
| `Gemfile` | Eliminar `gem "chromedriver-helper"` (línea del grupo `:test`). |
| `Gemfile.lock` | Regenerado por `bundle install`. |
| `test/test_helper.rb` | Cargar `test/support/**/*.rb`, incluir helpers de Devise en integración y controlador, `teardown` global de `User.current`. Sin `parallelize`. |
| `app/models/report_expense.rb` | Agregar `current_actor_id` privado y reemplazar las 5 llamadas a `User.current.id` de `edit_values`, `create_edit_register`, `create_create_register` (dos) y `create_destroy_register`. Referencia por método, no por línea (corrección 8); las líneas de la Tarea 9 son orientativas. |
| `test/fixtures/contractors.yml` | Quitar `purchase_number` y `purchase_date`; apuntar `cost_center` por etiqueta. |
| `test/fixtures/materials.yml` | Quitar `purchase_date`, `purchase_number`, `purchase_state`; `cost_center` por etiqueta. |
| `test/fixtures/expense_ratios.yml` | `cration_date` → `creation_date`; `user_report`/`user_direction` por etiqueta. |
| `test/fixtures/register_edits.yml` | Quitar `names`, `email`, `document_type`, `number_document`, `rol_id`; `user` por etiqueta. |
| `test/fixtures/module_controls.yml` | Reemplazar `MyString` por los 6 módulos reales. |
| `test/fixtures/accion_modules.yml` | Reemplazar `MyString` por las 21 acciones reales. |
| `test/fixtures/report_expense_options.yml` | `category` real (`Tipo` / `Medio de pago`) y `user` por etiqueta. |
| `test/fixtures/report_expenses.yml` | FKs por etiqueta (hoy son `1` colgantes) y valores de dinero utilizables. |
| `lib/tasks/create_config.rake` | **Movido desde el paquete 07** (corrección 2): replicar los mismos bloques de `permissions_gastos_ia.rake` con el estilo del archivo, **sin ningún `destroy_all` nuevo**. Ver Tarea 25-bis. |
| `.gitignore` | Agregar `/public/packs-test`, `/test/e2e/node_modules`, `/test/e2e/.auth`, `/test/e2e/test-results`, `/test/e2e/playwright-report`, `/test/e2e/blob-report`. |
| `app/views/layouts/user.html.erb` (`link_to report_expenses_path`) | Agregar `data-testid="nav-gastos"`. Se referencia **por símbolo, no por línea** (corrección 8). El ítem de menú de *Contabilidad* en este mismo archivo es del paquete 09; este paquete no lo toca. |
| `app/javascript/packs/ReportExpenseIndex.js` (div raíz `cm-page` del `render`) | Agregar `"data-testid": "page-report-expenses"`. Referencia por símbolo, no por número de línea. |
| `app/javascript/generalcomponents/ui/CmDataTable.jsx` | Agregar `data-testid="cm-datatable"` al div raíz `.cm-dt` y `data-testid="cm-datatable-row"` a cada `<tr>` de datos. |

### A borrar

| Ruta | Por qué |
|---|---|
| `test/controllers/sales_orders_controller_test.rb` | Scaffold: 7 tests contra un controller con `authenticate_user!`. |
| `test/controllers/customer_invoices_controller_test.rb` | Ídem, 7 tests. |
| `test/controllers/home_controller_test.rb` | Usa `home_index_path`, ruta inexistente. |
| `test/controllers/materials_controller_test.rb` | Usa `materials_index_path`, ruta inexistente. |
| `test/controllers/contractors_controller_test.rb` | Usa `contractors_index_path`, ruta inexistente. |
| `test/controllers/report_expense_options_controller_test.rb` | Usa `report_expense_options_index_path`, ruta inexistente. |
| `test/controllers/employed_performance_controller_test.rb` | Scaffold. |
| `test/controllers/commissions_controller_test.rb` | Scaffold. |
| `test/controllers/commission_relations_controller_test.rb` | Scaffold. |
| `test/mailers/alert_mailer_test.rb` | Scaffold. |
| `test/system/sales_orders_test.rb` | **Riesgo de seguridad**: usa helpers `*_url` y `routes.rb:100` fija `default_url_options host: "controlmatica.herokuapp.com"` ⇒ escribe en producción. |
| `test/system/customer_invoices_test.rb` | Ídem. |
| `test/application_system_test_case.rb` | Queda huérfano tras borrar `test/system/`; referencia `driven_by :selenium, using: :chrome`. **Asumido:** se borra; los E2E son Playwright, no Capybara. |

Los ~30 archivos `*_test.rb` restantes (stubs vacíos de scaffold, sin ningún `test "..."`) **se
dejan como están**: no aportan ruido y sirven de placeholder para los paquetes que los llenen.

---

## Tareas

Cada tarea es un commit. El orden es obligatorio: la 1 desbloquea el boot, la 2–8 la carga de
fixtures, y sin las dos no se puede correr nada.

### Bloque A — Desbloquear el boot de la suite

**Tarea 1 — Eliminar `chromedriver-helper`.**
1. En `Gemfile`, borrar la línea `gem "chromedriver-helper"` y su comentario
   (`# Easy installation and use of chromedriver to run system tests with Chrome`) del bloque
   `group :test do`. **No** tocar `capybara` ni `selenium-webdriver` (otras gemas del lock
   dependen del árbol; sacarlas es ruido innecesario).
2. `bundle install`.
3. `bin/spring stop` (Spring cachea el árbol de gemas y reproduce el error ya corregido).
4. Verificación: `bin/rails runner -e test 'puts "boot ok"'` imprime `boot ok`.

**Tarea 2 — Borrar los tests de scaffold heredados.**
1. `git rm` de los 12 archivos listados en "A borrar" + `test/application_system_test_case.rb`.
2. Verificación: `find test -name "*_test.rb" | xargs grep -l 'test "' ` no devuelve nada.

### Bloque B — Fixtures sanas

**Tarea 3 — Arreglar las 4 fixtures con columnas inexistentes.**
Columnas verificadas contra `db/schema.rb`:
- `test/fixtures/contractors.yml`: eliminar las claves `purchase_number` y `purchase_date` de
  ambos registros (`one`, `two`).
- `test/fixtures/materials.yml`: eliminar `purchase_date`, `purchase_number`, `purchase_state` de
  ambos registros.
- `test/fixtures/expense_ratios.yml`: renombrar `cration_date` → `creation_date` en ambos
  registros.
- `test/fixtures/register_edits.yml`: eliminar `names`, `email`, `document_type`,
  `number_document`, `rol_id` de ambos registros (son columnas de `users`, copiadas por error).
  Dejar `user_id` (se reemplaza por etiqueta en la Tarea 8) y `editValues`.

Verificación: `RAILS_ENV=test bin/rails runner 'ActiveRecord::FixtureSet.create_fixtures("test/fixtures", %w[contractors materials expense_ratios register_edits])'` no lanza `Fixture::FixtureError`.

**Tarea 4 — `test/fixtures/rols.yml` (crear).**
Cinco roles con el HABTM inline. Etiquetas exactas (otros paquetes las referencian):

```yaml
administrador:
  name: Administrador          # literal, case-sensitive: is_admin? compara este string
  description: Acceso total por rol, sin accion_modules asignados

gerente:
  name: Gerente
  description: Tiene TODOS los permisos por accion_modules (no es admin)
  accion_modules: gastos_ingreso, gastos_crear, gastos_editar, gastos_eliminar,
                  gastos_aceptar, gastos_exportar, gastos_ver_todos, gastos_responsable,
                  presupuesto_ingreso, presupuesto_crear, presupuesto_editar,
                  presupuesto_eliminar, presupuesto_ver_todos,
                  contabilidad_ingreso, contabilidad_aprobar, contabilidad_exportar,
                  contabilidad_ver_todos, centro_ingreso, centro_editar,
                  reportes_ingreso, tablero_ver

ingeniero:
  name: Ingeniero
  description: Solo crea y edita sus propios gastos
  accion_modules: gastos_ingreso, gastos_crear, gastos_editar, reportes_ingreso

contador:
  name: Contador
  description: Solo contabilidad
  accion_modules: contabilidad_ingreso, contabilidad_aprobar, contabilidad_ver_todos,
                  reportes_ingreso

sin_permisos:
  name: Sin permisos
  description: Rol vacio, para probar los gates de 403
```

**Decisión de diseño (Asumido):** `administrador` **no** recibe ningún `accion_module`. Así, todo
test de permiso prueba el camino real: `admin` pasa por `is_admin?` y `gerente` pasa por
`has_menu_permission?`. Si al admin se le dieran permisos, un bug en `is_admin?` quedaría oculto.

**Tarea 5 — `test/fixtures/module_controls.yml` (reescribir).**
Seis módulos con nombre real (hoy los dos registros dicen `MyString`, inservibles porque todo el
sistema busca por string literal). `user: admin` por etiqueta.

| Etiqueta | `name` |
|---|---|
| `gastos` | `Gastos` |
| `centro_costos` | `Centro de Costos` |
| `presupuesto` | `Presupuesto` |
| `contabilidad` | `Contabilidad` |
| `reportes` | `Reportes de servicios` |
| `tablero` | `Tablero de Ingenieros` |

⚠️ `Reportes de servicios` y `Tablero de Ingenieros` **son obligatorios**: `after_sign_in_path_for`
(`app/controllers/application_controller.rb:103-105`) hace `.id` sobre `ModuleControl.find_by_name`
sin guarda de nil. Sin ellos, cualquier prueba que haga login por el formulario revienta con
`NoMethodError`.

**Tarea 6 — `test/fixtures/accion_modules.yml` (reescribir).**
21 acciones con `module_control` por etiqueta y `user: admin` (`AccionModule belongs_to :user` es
**requerido**).

| Etiqueta | `name` | `module_control` |
|---|---|---|
| `gastos_ingreso` | `Ingreso al modulo` | `gastos` |
| `gastos_crear` | `Crear` | `gastos` |
| `gastos_editar` | `Editar` | `gastos` |
| `gastos_eliminar` | `Eliminar` | `gastos` |
| `gastos_aceptar` | `Aceptar gasto` | `gastos` |
| `gastos_exportar` | `Exportar a excel` | `gastos` |
| `gastos_ver_todos` | `Ver todos` | `gastos` |
| `gastos_responsable` | `Cambiar responsable` | `gastos` |
| `presupuesto_ingreso` | `Ingreso al modulo` | `presupuesto` |
| `presupuesto_crear` | `Crear` | `presupuesto` |
| `presupuesto_editar` | `Editar` | `presupuesto` |
| `presupuesto_eliminar` | `Eliminar` | `presupuesto` |
| `presupuesto_ver_todos` | `Ver todos` | `presupuesto` |
| `contabilidad_ingreso` | `Ingreso al modulo` | `contabilidad` |
| `contabilidad_aprobar` | `Aprobar` | `contabilidad` |
| `contabilidad_exportar` | `Exportar a excel` | `contabilidad` |
| `contabilidad_ver_todos` | `Ver todos` | `contabilidad` |
| `centro_ingreso` | `Ingreso al modulo` | `centro_costos` |
| `centro_editar` | `Editar` | `centro_costos` |
| `reportes_ingreso` | `Ingreso al modulo` | `reportes` |
| `tablero_ver` | `Ver tablero` | `tablero` |

**NO se crea `test/fixtures/accion_modules_rols.yml`.** El HABTM se declara inline en `rols.yml`
(Tarea 4): Rails genera las filas de la tabla puente automáticamente porque
`Rol has_and_belongs_to_many :accion_modules` (`app/models/rol.rb:19`). Una fixture de tabla suelta
obligaría a `ActiveRecord::FixtureSet.identify(:etiqueta)` a mano en cada fila, que es exactamente
el tipo de FK frágil que este paquete elimina.

**Tarea 7 — `test/fixtures/users.yml` (crear).**
Encabezado ERB único para no pagar el hash 6 veces:

```erb
<% digest = Devise::Encryptor.digest(User, "password123") %>
```

Seis usuarios; `encrypted_password: <%= digest %>` en todos. `stretches = 1` en test
(`config/initializers/devise.rb:114`), así que el costo es despreciable.

| Etiqueta | `email` | `names` | `last_names` | `rol` |
|---|---|---|---|---|
| `admin` | `admin@controlmatica.test` | `Ana` | `Ruiz` | `administrador` |
| `gerente` | `gerente@controlmatica.test` | `Beatriz` | `Gomez` | `gerente` |
| `ingeniero` | `ingeniero@controlmatica.test` | `Juan` | `Perez` | `ingeniero` |
| `ingeniero_dos` | `ingeniero2@controlmatica.test` | `Carlos` | `Lopez` | `ingeniero` |
| `contador` | `contador@controlmatica.test` | `Diana` | `Mora` | `contador` |
| `sin_permisos` | `nadie@controlmatica.test` | `Pedro` | `Nadie` | `sin_permisos` |
| `dueno_centro` | `duenocentro@controlmatica.test` | `Elena` | `Vargas` | `gerente` |
| `ingeniero_sin_permisos` | `ingsinpermisos@controlmatica.test` | `Mario` | `Cano` | `sin_permisos` |

🔴 **Las dos últimas etiquetas las agregó el cierre de la reauditoría** (§7.2), y se declaran
**aquí** aunque quien las use sea otro paquete, porque este paquete es el dueño de `users.yml`:

- **`dueno_centro`** — lo usan los tests de autorización por propiedad del **07**
  (`get_expense_budgets` / `create` / `destroy` siendo dueño del centro). **Nace aquí con
  `rol: gerente`**, que ya existe en la ola 1 (no puede nacer con `presupuesto_limitado`: ese rol
  lo declara el 07 tres olas después y la fixture apuntaría a una etiqueta inexistente). El **07,
  en su propio PR y en la misma línea**, lo pasa a `rol: presupuesto_limitado` junto con la
  declaración del rol. **Y es el `user_owner` de `centro_con_viaticos`**, valor definitivo fijado
  en §7.2: sin eso, los tests de propiedad del 07 no tienen fixture que los soporte.
- **`ingeniero_sin_permisos`** — lo usa el **09** en sus tests de 403 de la pantalla de
  Contabilidad. Es un usuario con `rol: sin_permisos`. ⚠️ El 09 **también** citaba
  `users(:contable)`: esa etiqueta **no existe y no se crea** — es un cuasi-duplicado de
  `contador`, y §7.2 fija que el 09 use `users(:contador)`.

Mismo patrón que los seis anteriores: `encrypted_password` con `Devise::Encryptor.digest`,
`document_type`, `number_document` propio, `menu: nav-sm`, sin `avatar`.

Campos adicionales en todos: `document_type: CC`, `number_document` distinto por usuario
(100000001…100000006), `menu: nav-sm`, `sign_in_count: 0`. **No** poner `avatar`.

**Tarea 8 — `customers.yml`, `cost_centers.yml` y saneo de FKs.**

`test/fixtures/customers.yml` (crear):

| Etiqueta | `name` | `code` | `nit` | `user` |
|---|---|---|---|---|
| `cliente_uno` | `ACME S.A.S` | `CLI0001` | `900123456-1` | `admin` |
| `cliente_dos` | `BETA LTDA` | `CLI0002` | `900654321-2` | `admin` |

`test/fixtures/cost_centers.yml` (crear). `CostCenter` tiene `before_create :create_code`, que las
fixtures **no** ejecutan ⇒ `code` va explícito:

| Etiqueta | `code` | `viatic_value` | `customer` | `user` | `user_owner` | Para qué |
|---|---|---|---|---|---|---|
| `centro_con_viaticos` | `CM-ACME-01-2026` | `5000000.0` | `cliente_uno` | `admin` | **`dueno_centro`** | Caso normal de presupuesto **y** caso 'soy el dueño del centro' de los tests de autorización del 07 (§7.2, valor definitivo) |
| `centro_sin_viaticos` | `CM-ACME-02-2026` | *(ausente ⇒ nil)* | `cliente_uno` | `admin` | `gerente` | Tope 0 (arquitectura §1.1) |
| `centro_ajeno` | `CM-BETA-01-2026` | `1000000.0` | `cliente_dos` | `contador` | `contador` | Guard de propiedad del dueño |

Todos con `description`, `start_date: 2026-01-15`, `end_date: 2026-12-31`,
`execution_state: EN EJECUCION`, `service_type: PROYECTO`, `engineering_value: 20000000.0`.

Saneo de FKs colgantes (hoy son enteros `1` que no existen — arquitectura §5.4.4):
- `test/fixtures/report_expenses.yml`: `user: admin`, `cost_center: centro_con_viaticos`,
  `user_invoice: ingeniero`; `invoice_name: Hotel Uno` / `Hotel Dos`;
  `invoice_value: 100000.0`, `invoice_tax: 19000.0`, `invoice_total: 119000.0`;
  `identification: 900111222`, `invoice_number: FE-001` / `FE-002`;
  `type_identification: opcion_tipo`, `payment_type: opcion_pago`.
  ⚠️ `report_expenses` tiene columnas string legacy `type_identification` y `payment_type`
  **además** de las `_id`; las asociaciones se llaman igual que las columnas string. Usar las
  claves `type_identification_id: <%= ActiveRecord::FixtureSet.identify(:opcion_tipo) %>` y
  `payment_type_id: <%= ActiveRecord::FixtureSet.identify(:opcion_pago) %>` y **borrar** las claves
  string `type_identification:` y `payment_type:` para no chocar con el resolutor de asociaciones.
- `test/fixtures/report_expense_options.yml`: etiquetas `opcion_tipo` (`name: Alimentacion`,
  `category: Tipo`) y `opcion_pago` (`name: Efectivo`, `category: Medio de pago`), `user: admin`.
  Las categorías son las que filtra `packs/ReportExpenseIndex.js:111,115`.
- `contractors.yml`, `materials.yml`, `register_edits.yml`, `expense_ratios.yml`: reemplazar
  `cost_center_id: 1` → `cost_center: centro_con_viaticos`, `user_id: 1` → `user: admin`,
  `user_report_id: 1` → `user_report: admin`, `user_direction_id: 1` → `user_direction: admin`.
  **Asumido:** las demás fixtures heredadas (`alerts`, `commissions`, `commission_relations`,
  `customer_invoices`, `material_invoices`, `notification_alerts`, `quotations`, `sales_orders`,
  `shifts`) conservan sus FKs enteras; insertan sin error porque el esquema no tiene ni un
  `add_foreign_key`, y ningún paquete de este proyecto las toca. Queda anotado como deuda.

Verificación: `RAILS_ENV=test bin/rails db:test:prepare && bin/rails test test/models`.

**Tarea 8-bis — `test/fixtures/parameterizations.yml` (crear).**
Agregada por la corrección 4 del bloque de auditoría: la pedía el paquete 10, pero el dueño único
de `test/fixtures/*.yml` es este paquete (§7.2). Es **obligatoria**: `fixtures :all` la carga.

```yaml
antiguedad:
  name: "GASTOS IA - ANTIGUEDAD MAXIMA (DIAS)"
  number_value: 30
  user_id: <%= ActiveRecord::FixtureSet.identify(:admin) %>
tope:
  name: "GASTOS IA - TOPE VALOR POR GASTO"
  money_value: 2000000
  user_id: <%= ActiveRecord::FixtureSet.identify(:admin) %>
tolerancia:
  name: "GASTOS IA - TOLERANCIA COHERENCIA (%)"
  number_value: 5
  user_id: <%= ActiveRecord::FixtureSet.identify(:admin) %>
ventana_duplicados:
  name: "GASTOS IA - VENTANA DUPLICADOS (DIAS)"
  number_value: 365
  user_id: <%= ActiveRecord::FixtureSet.identify(:admin) %>
concepto_licor:
  name: "GASTOS IA - CONCEPTO NO PERMITIDO - LICOR"
  user_id: <%= ActiveRecord::FixtureSet.identify(:admin) %>
```

⚠️ **`user_id:` y nunca `user: admin`.** `app/models/parameterization.rb` **no declara
`belongs_to :user`** (solo scopes y `self.search`), así que la forma de asociación hace que Rails
intente escribir una columna `user` inexistente y lance `Fixture::FixtureError`; con
`fixtures :all` eso tumba **toda** la suite. La aserción correspondiente se agrega al test
guardián `fixtures_integrity_test.rb`.

Los valores de los parámetros son los del paquete 10, que es su consumidor; este paquete no
decide reglas de negocio, solo garantiza que la fixture cargue. El 10 **agrega etiquetas** si
necesita más, sin reescribir las existentes.

### Bloque C — Guarda de `User.current` en el modelo

**Tarea 9 — `current_actor_id` en `ReportExpense`.**
En `app/models/report_expense.rb`, agregar al final de la clase:

```ruby
private

# Actor de auditoria. User.current solo existe dentro de un request web
# (ApplicationController#set_current_user); en tests, jobs, rake tasks, consola y
# MCP es nil y las 5 llamadas directas a User.current.id reventaban con NoMethodError.
def current_actor_id
  User.current&.id || user_id || user_invoice_id || last_user_edited_id
end
```

Reemplazar exactamente estas 5 ocurrencias de `User.current.id` por `current_actor_id`:

| Línea actual | Método |
|---|---|
| 53 | `edit_values` — `self.last_user_edited_id = User.current.id` |
| 149 | `create_edit_register` — `self.last_user_edited_id = User.current.id` |
| 214 | `create_create_register` — `user_id: User.current.id` |
| 275 | `create_create_register` (segundo `RegisterEdit`) — `user_id: User.current.id` |
| 337 | `create_destroy_register` — `user_id: User.current.id` |

`create_create_register` es `after_create`, así que `current_actor_id` ya tiene `user_id` /
`user_invoice_id` disponibles. **No se toca `CostCenter`** (arquitectura §5.3, capa 1): sus
llamadas sin guarda (`cost_center.rb:264, 312, 360`) se cubren con `as_user` en los tests.

⚠️ **Frontera con el paquete 03.** §7.2 le da al 03 el concern `RegisterAuditable` y los 3 métodos
de auditoría de `ReportExpense`, además de `ReportExpense.search`. Esta tarea **no** los reescribe:
solo introduce `current_actor_id` (capa 1 de §5.3, que la arquitectura asigna explícitamente a este
paquete) y sustituye las 5 llamadas a `User.current.id`. Cuando el 03 extraiga el concern,
`current_actor_id` pasa a ser `def current_actor_id = audit_actor_id`; ese cambio lo hace **el 03**,
no este paquete.

⚠️ El método se agrega **bajo `private`**; verificar que no queda ningún callback declarado
después del `private` que dependa de ser público (los callbacks funcionan igual siendo privados).
Y verificar que `report_expense.rb` no tenía ya un `private` con otro contenido debajo.

### Bloque D — Helpers de Minitest

**Tarea 10 — `test/test_helper.rb` (reescribir).**

```ruby
ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

Dir[Rails.root.join("test/support/**/*.rb")].sort.each { |file| require file }

class ActiveSupport::TestCase
  fixtures :all
  # SIN parallelize: la suite corre en serie mientras ReportExpense.search siga
  # definiendo scopes de clase en runtime (arquitectura, invariante #6).

  include AuthenticationHelpers
  include PermissionHelpers
  include JsonHelpers
  include UploadHelpers

  teardown do
    User.current = nil   # Thread.current[:user] sobrevive entre tests del mismo hilo
  end
end

class ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers
end

class ActionController::TestCase
  include Devise::Test::ControllerHelpers
end
```

**Tarea 11 — `test/support/authentication_helpers.rb`.**

```ruby
module AuthenticationHelpers
  # Ejecuta el bloque con User.current seteado. OBLIGATORIO alrededor de todo
  # create/update/destroy de ReportExpense, CostCenter, ExpenseBudget, Material,
  # Contractor, Report y User: sus callbacks leen User.current.
  # Firma: as_user(user) { ... } -> devuelve lo que devuelva el bloque.
  def as_user(user)
    previous = User.current
    User.current = user
    yield user
  ensure
    User.current = previous
  end

  # Devise + User.current de una sola vez, para tests de integración.
  # Firma: sign_in_as(user) -> user
  def sign_in_as(user)
    sign_in user           # Devise::Test::IntegrationHelpers (via Warden, no pasa
                           # por after_sign_in_path_for)
    User.current = user
    user
  end

  def sign_out_current
    sign_out :user
    User.current = nil
  end

  # Contraseña unica de todas las fixtures de usuario.
  FIXTURE_PASSWORD = "password123".freeze
end
```

⚠️ Documentar en el propio archivo, como comentario: `sign_in_as` **no** ejercita
`after_sign_in_path_for`. Un test que quiera probar el login real debe hacer
`post user_session_path, params: { user: { email: ..., password: FIXTURE_PASSWORD } }` — y para
eso los `ModuleControl` `Reportes de servicios` y `Tablero de Ingenieros` de la Tarea 5 son
imprescindibles.

**Tarea 12 — `test/support/permission_helpers.rb`.**

```ruby
module PermissionHelpers
  # Agrega un permiso a un rol en caliente. Idempotente.
  # Firma: grant_permission!(rol, "Presupuesto", "Crear") -> AccionModule
  def grant_permission!(rol, module_name, action_name)
    mc = ModuleControl.find_by!(name: module_name)
    am = AccionModule.find_or_create_by!(name: action_name, module_control_id: mc.id) do |a|
      a.user_id = users(:admin).id
    end
    rol.accion_modules << am unless rol.accion_modules.include?(am)
    am
  end

  # Firma: revoke_permission!(rol, "Presupuesto", "Crear") -> void
  def revoke_permission!(rol, module_name, action_name)
    mc = ModuleControl.find_by(name: module_name)
    return if mc.nil?
    am = AccionModule.find_by(name: action_name, module_control_id: mc.id)
    return if am.nil?
    rol.accion_modules.delete(am)
  end

  # Usuario garantizado sin ningun permiso y sin rol Administrador.
  # Firma: user_without_permissions -> User
  def user_without_permissions
    users(:sin_permisos)
  end
end
```

⚠️ `menu_permissions` (`app/helpers/application_helper.rb:296-308`) memoiza en
`@_menu_permissions` **por instancia de controller**, es decir por request. Cambiar permisos entre
dos requests del mismo test funciona; cambiarlos y esperar efecto dentro del mismo request, no.
Escribirlo como comentario en el helper.

**Tarea 13 — `test/support/json_helpers.rb`.**
Aserciones alineadas con los contratos de arquitectura §3.

```ruby
module JsonHelpers
  # Firma: json_body -> Hash con claves String
  def json_body
    @json_body ||= JSON.parse(response.body)
  end

  # { success:, type: "success", register: {...} }
  # Firma: assert_json_success(mensaje: nil) -> Hash (el "register")
  def assert_json_success(mensaje: nil)
    assert_response :success
    assert_equal "success", json_body["type"], "Se esperaba type=success, body: #{response.body}"
    assert_equal mensaje, json_body["success"] if mensaje
    json_body["register"]
  end

  # { success: "¡Ocurrió un error!", type: "error", message: [...] } con HTTP 200
  # Firma: assert_json_error(incluye: nil) -> Array de mensajes
  def assert_json_error(incluye: nil)
    assert_response :success
    assert_equal "error", json_body["type"]
    assert_kind_of Array, json_body["message"]
    assert(json_body["message"].any? { |m| m.include?(incluye) }, ...) if incluye
    json_body["message"]
  end

  # { type: "error", message: [...] } con HTTP 403
  def assert_json_forbidden
    assert_response :forbidden
    assert_equal "error", json_body["type"]
  end

  # { data: [...], total: N }
  # Firma: assert_json_list(total: nil) -> Array
  def assert_json_list(total: nil)
    assert_response :success
    assert_kind_of Array, json_body["data"]
    assert_equal total, json_body["total"] if total
    json_body["data"]
  end
end
```

⚠️ `@json_body` se memoiza; si un test hace dos requests debe llamar
`@json_body = nil` entre medio. **Decisión (Asumido):** en vez de memoizar, `json_body` parsea
siempre y no cachea — es un test, el costo es cero y el bug de memoización es real. Implementar
sin `||=`.

**Tarea 14 — `test/support/upload_helpers.rb` y archivos de fixture.**

```ruby
module UploadHelpers
  # Firma: upload_fixture("comprobante.pdf") -> Rack::Test::UploadedFile
  def upload_fixture(nombre)
    tipo = { ".pdf" => "application/pdf", ".jpg" => "image/jpeg",
             ".png" => "image/png", ".heic" => "image/heic",
             ".exe" => "application/octet-stream" }
           .fetch(File.extname(nombre))
    fixture_file_upload(Rails.root.join("test/fixtures/files", nombre), tipo)
  end
end
```

Crear el **inventario completo de `test/fixtures/files/`: los 14 archivos de §7.12 de la
arquitectura**, de una sola vez (corrección 5 del bloque de auditoría). Seis paquetes creaban
archivos con nombres y tamaños divergentes y el segundo en llegar sobrescribía los del primero;
a partir de aquí los paquetes 03, 06, 10, 11 y 12 solo declaran "ya existe".

| Archivo | Contenido / tamaño | Quién lo usa |
|---|---|---|
| `comprobante.pdf` | PDF válido de ~1 KB, empieza con `%PDF-` (cabecera `%PDF-1.4`, un objeto Catalog, un Pages vacío, `%%EOF`). Debe abrir en un visor; si no, el test de content-type miente. | 01, 06, 11, 12 |
| `comprobante.jpg` | JPEG válido de ~1 KB (bytes `FF D8 FF ...`). | 01, 06 |
| `comprobante.png` | PNG válido de ~1 KB. | 03 |
| `malicioso.exe` | 20 bytes cualquiera, extensión prohibida. Prueba `extension_allowlist`. | 01, 06, 11 |
| `disfrazado.png` | El `.exe` renombrado a `.png` (content-type engañoso). | 03, 06 |
| `comprobante_factura.pdf` | Factura legible con NIT y número. | 10 |
| `comprobante_factura.jpg` | Ídem, fotografiada. | 10 |
| `comprobante_ilegible.png` | Imagen sin texto. | 10, 12 |
| `comprobante_iphone.heic` | HEIC, para el rechazo `:unsupported_format`. | 10 |
| `comprobante_ia.jpg` | El que el stub del 12 reconoce como factura COP. | 12 |
| `comprobante_ia_usd.pdf` | El que el stub del 12 reconoce como factura USD. | 12 |
| `gastos_legacy_11col.xlsx` | Excel de importación con el layout **viejo de 11 columnas** (el de hoy), para el test de no-regresión de `ReportExpense.import`. | 06 |
| `gastos_v2_18col.xlsx` | Excel con el layout **nuevo de 18 columnas**, `ID` en la primera y 13=`Moneda`, 14=`Valor extranjero`, 15=`TRM`. | 06 |
| `gastos_multimoneda.xlsx` | 18 columnas, con filas en **USD** y **EUR** y una con `invoice_value` diligenciado (dispara `cop_manual_override`). | 05, 06 |

El archivo de 10,5 MB (rechazo por tamaño) **no se commitea**: se genera con `Tempfile` dentro del
test, como decide el paquete 06.

**Tarea 15 — RETIRADA.**
> **RETIRADA por auditoría.** Dueño único: paquete 03. Ver el bloque de correcciones al inicio.

### Bloque E — Playwright

**Tarea 16 — `test/e2e/package.json` (crear).**

```json
{
  "name": "controlmatica-e2e",
  "private": true,
  "version": "1.0.0",
  "engines": { "node": ">=18" },
  "devDependencies": { "@playwright/test": "^1.49.0" },
  "scripts": {
    "install:browsers": "playwright install --with-deps chromium",
    "prepare:app":      "node ./scripts/prepare.js",
    "seed":             "node ./scripts/seed.js",
    "test":             "playwright test",
    "test:smoke":       "playwright test specs/smoke.spec.js",
    "test:headed":      "playwright test --headed",
    "test:ui":          "playwright test --ui",
    "report":           "playwright show-report"
  }
}
```

**Resolución del conflicto de `engines.node`** (el punto que el brief pide resolver
explícitamente): el `package.json` de la **raíz** declara `engines.node: "16.x"` y lo consume el
buildpack de Node de Heroku. **No se toca.** Playwright vive en un `package.json` separado, dentro
de `test/`, que:
1. `.slugignore` ya excluye entero (`test/` está en la línea 3) ⇒ Heroku ni lo ve;
2. tiene su propio `engines.node: ">=18"` y su propio `.nvmrc` con `22`, que es lo que corre el
   desarrollador local;
3. nunca se instala con el `npm install` de la raíz, porque no es un workspace (la raíz **no**
   declara `workspaces` y no debe declararlos).

Consecuencia operativa: `npm ci` en la raíz sigue sin descargar navegadores; el build de Heroku no
cambia en un byte. **Prohibido** agregar `@playwright/test` a `package.json` de la raíz o convertir
el repo en monorepo npm.

**Tarea 17 — `test/e2e/support/env.js` (crear).** Constantes compartidas, sin lógica:

```js
module.exports = {
  BASE_URL: process.env.E2E_BASE_URL || "http://127.0.0.1:3001",
  RAILS_ROOT: require("path").resolve(__dirname, "../../.."),
  USER: { email: "e2e@controlmatica.test", password: "e2e-password-123" },
  SEED: {
    costCenterCode: "CM-E2E-01-2026",
    customerName:   "CLIENTE E2E S.A.S",
    beneficiario:   "Ingeniero E2E",
  },
};
```

**Tarea 18 — `db/seeds/e2e.rb` (crear).** Idempotente, determinista, **cero `rand` y cero
`.sample`**. Estructura obligatoria:

1. `User.current = User.joins(:rol).where(rols: { name: "Administrador" }).order(:id).first ||
   User.order(:id).first` **en la primera línea** — y si no hay ninguno, crear primero el admin y
   asignarlo. Sin esto, cualquier `create` revienta.
2. `Rol.find_or_create_by!(name: "Administrador")`.
3. `ModuleControl.find_or_create_by!(name: n) { |m| m.user_id = admin.id }` para los 6 módulos de
   la Tarea 5, más sus `AccionModule.find_or_create_by!(name:, module_control_id:) { |a|
   a.user_id = admin.id }` (los 21 de la Tarea 6), más el HABTM con el rol Administrador
   (`rol.accion_modules << am unless rol.accion_modules.include?(am)`).
   ⚠️ `Reportes de servicios` y `Tablero de Ingenieros` no son opcionales: sin ellos el login por
   formulario —que es exactamente lo que hace el E2E— revienta.
4. Usuario `e2e@controlmatica.test` con password `e2e-password-123`, `names: "Ingeniero"`,
   `last_names: "E2E"`, `rol` = Administrador. `find_or_initialize_by(email:)` + asignar password
   siempre (para que un cambio de password en `env.js` se propague).
5. `Customer` `CLIENTE E2E S.A.S` (`code: "CLI-E2E"`).
6. `CostCenter` con `code: "CM-E2E-01-2026"`, `viatic_value: 5_000_000.0`,
   `user_owner_id` = usuario E2E, `execution_state: "EN EJECUCION"`, `service_type: "PROYECTO"`.
   ⚠️ `before_create :create_code` **sobrescribe** `code`: hay que crear el registro y luego
   `update_column(:code, "CM-E2E-01-2026")` para dejarlo determinista, o buscarlo por
   `user_owner_id` + `customer_id`. **Asumido:** se usa `update_column` (salta callbacks y
   validaciones a propósito).
7. `ReportExpenseOption`: `Alimentacion` (`category: "Tipo"`) y `Efectivo`
   (`category: "Medio de pago"`).
8. **Reset de datos transaccionales**: antes de crear, borrar los `ReportExpense` del centro E2E
   (`ReportExpense.where(cost_center_id: centro.id).find_each(&:destroy)` — `destroy`, no
   `delete_all`, para que corran los callbacks con `User.current` ya seteado). Después crear 2
   gastos semilla deterministas (`invoice_number: "FE-E2E-001"` / `"FE-E2E-002"`,
   `invoice_value: 100000.0` / `200000.0`, `invoice_date: "2026-06-01"`).
9. Imprimir un resumen (`puts`) con los ids creados: el `globalSetup` lo vuelca al log de
   Playwright y sirve para depurar.

El seed **nunca** toca datos fuera del centro `CM-E2E-01-2026` y del usuario
`e2e@controlmatica.test`.

**Tarea 19 — `test/e2e/scripts/prepare.js` y `seed.js` (crear).**
`prepare.js` ejecuta en orden, con `child_process.execFileSync`, `cwd: RAILS_ROOT`, `stdio:
"inherit"` y `env: { ...process.env, RAILS_ENV: "test" }`:

1. `bin/rails db:test:prepare`
2. `bin/webpack` con `RAILS_ENV=test NODE_ENV=development`
   — **este es el paso lento (1–3 min la primera vez, 29 packs)**. Se salta si
   `process.env.SKIP_WEBPACK === "1"` **o** si `public/packs-test/manifest.json` existe y su
   `mtime` es más reciente que el archivo más reciente de `app/javascript/`. Implementar esa
   comparación de mtime; es la diferencia entre 8 s y 3 min por corrida.
3. `bin/rails runner db/seeds/e2e.rb`

`seed.js` ejecuta solo el paso 3. `support/db.js` exporta `reseedE2E()` que llama a `seed.js` de
forma síncrona; los specs que mutan datos lo invocan en `test.beforeAll`.

**Tarea 20 — `test/e2e/playwright.config.js` (crear).**

```js
const { defineConfig, devices } = require("@playwright/test");
const { BASE_URL, RAILS_ROOT } = require("./support/env");

module.exports = defineConfig({
  testDir: "./specs",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,                       // una sola BD de test compartida
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: require.resolve("./global-setup.js"),
  use: {
    baseURL: BASE_URL,              // NUNCA helpers *_url de Rails: routes.rb:100 fija
                                    // default_url_options host controlmatica.herokuapp.com
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
    command: "bin/rails server -b 127.0.0.1 -p 3001 -e test",
    cwd: RAILS_ROOT,
    url: BASE_URL,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
    env: { RAILS_ENV: "test" },
  },
});
```

⚠️ `workers: 1` y `fullyParallel: false` **no son negociables** mientras
`ReportExpense.search` defina scopes de clase en runtime (arquitectura, invariante #6) y mientras
todos los specs compartan la misma BD de test.

**Tarea 21 — `test/e2e/global-setup.js` (crear).**
Llama a `scripts/prepare.js` (mismo módulo, exportado como función) **antes** de que Playwright
levante el `webServer`. Motivo: si el webpack se dispara con el primer request, `webServer.timeout`
de 180 s se agota compilando 29 packs (`config/webpacker.yml` tiene `compile: true` en test) y
Playwright aborta la corrida completa sin un solo test ejecutado.

**Tarea 22 — `test/e2e/specs/auth.setup.js` (crear).**
Login por UI, una sola vez, y persistencia de sesión:

```js
const { test: setup, expect } = require("@playwright/test");
const { USER } = require("../support/env");

setup("autenticar", async ({ page }) => {
  await page.goto("/users/sign_in");
  await page.fill("#user_email", USER.email);
  await page.fill("#user_password", USER.password);
  await page.click('input[value="Ingresar"]');
  await expect(page).not.toHaveURL(/sign_in/);
  await page.context().storageState({ path: "./.auth/storageState.json" });
});
```

Selectores verificados contra `app/views/devise/sessions/new.html.erb`: `f.email_field :email` con
`as: :user` genera `id="user_email"`; `f.password_field :password` genera `id="user_password"`;
`f.submit "Ingresar"` genera `<input type="submit" value="Ingresar">`.

⚠️ El destino tras el login lo decide `after_sign_in_path_for` y **no es determinista** entre
entornos: con `Ver tablero` presente va a `dashboard_ing_path?tab=home`, si no a `reports_path`, y
si no a `root_path`. Por eso la aserción es `not.toHaveURL(/sign_in/)` y no una URL concreta.

**Tarea 23 — `data-testid` mínimos para el andamiaje.**
Tres atributos, cero cambios de comportamiento. Son el **contrato compartido** que los demás
paquetes van a extender:
- `app/views/layouts/user.html.erb`, en el **`link_to report_expenses_path`** del treeview
  "Control de gastos": agregar `data: { testid: "nav-gastos" }`.
  ⚠️ Corrección 8: la versión anterior citaba `user.html.erb:173`; la línea real es la **172**.
  Regla general del proyecto: **referenciar por nombre de método o por símbolo, nunca por número
  de línea** — por eso aquí ya no aparece ningún número.
- `app/javascript/packs/ReportExpenseIndex.js`, **div raíz `cm-page` del `render`**: pasa a
  `{ className: "cm-page", "data-testid": "page-report-expenses" }`.
- `app/javascript/generalcomponents/ui/CmDataTable.jsx`: `data-testid="cm-datatable"` en el div
  raíz `.cm-dt` (línea del render real, no la del esqueleto `cm-dt--skeleton`) y
  `data-testid="cm-datatable-row"` en cada `<tr>` de datos.

Tras tocar JS hay que recompilar (`SKIP_WEBPACK` no debe usarse en ese commit).

⚠️ **Solo estos cuatro `data-testid`** (§7.6, corrección 9): `nav-gastos`, `page-report-expenses`,
`cm-datatable`, `cm-datatable-row`, y **no cambian de nombre**. El resto de la superficie de esos
mismos archivos es ajena: `renderModal()` de `packs/ReportExpenseIndex.js` y `FormCreate.jsx` son
del **08**; `this.columns`/filtros de las tablas y los testids de selección de `CmDataTable`
(`cm-dt-select-all`, `cm-dt-select-{id}`) son del **09**; el ítem de menú *Contabilidad* de
`layouts/user.html.erb` también es del **09**.

**Tarea 24 — `test/e2e/specs/smoke.spec.js` (crear).** Ver sección "Pruebas E2E".

**Tarea 25 — `.gitignore` y `test/e2e/README.md`.**
Agregar a `.gitignore`:
```
/public/packs-test
/test/e2e/node_modules
/test/e2e/.auth
/test/e2e/test-results
/test/e2e/playwright-report
/test/e2e/blob-report
```
`README.md` con los comandos exactos de la sección "Convenciones".

### Bloque F — Permisos (movido desde el paquete 07)

**Tarea 25-bis — `lib/tasks/permissions_gastos_ia.rake` y su réplica en `create_config.rake`.**
Tarea **nueva**, creada por la corrección 2 del bloque de auditoría. Razón: el 06 necesitaba la
rake task que creaba el 07, y el 07 necesitaba el uploader del 06 ⇒ ciclo 06 ↔ 07 (§7.3). Se
rompe moviendo la rake task a este paquete, que es prerrequisito de ambos.

1. Crear `lib/tasks/permissions_gastos_ia.rake` con el **contenido exacto de
   `00-ARQUITECTURA.md` §4.4**: `namespace :permissions_gastos_ia` + `task install: :environment`,
   `User.current = admin` en la primera línea (los callbacks lo exigen), `Rol.find_by(name:
   "Administrador")` literal y case-sensitive, y el hash:
   - `"Presupuesto"` → `["Ingreso al modulo", "Crear", "Editar", "Eliminar", "Ver todos"]`
   - `"Contabilidad"` → `["Ingreso al modulo", "Aprobar", "Exportar a excel", "Ver todos"]`

   Todo con `find_or_create_by!` (`AccionModule belongs_to :user` es **requerido**: pasar
   `user_id`) y el HABTM con `rol_admin.accion_modules << am unless ...include?(am)`.
   **Prohibido cualquier `destroy_all`.**
2. Replicar los mismos bloques en `lib/tasks/create_config.rake`, con el estilo del archivo
   (`ModuleControl.create` + `AccionModule.create`), para que una instalación desde cero también
   los tenga. **No se agrega ni se ejecuta ningún `destroy_all`**: el `ModuleControl.destroy_all`
   que ya existe en ese archivo es la razón por la que `rake create_config:create` nunca se corre
   en un entorno con datos (§4.4).

Criterios de la tarea (los dos que fija la corrección 2):
(a) `rake permissions_gastos_ia:install` corrida **dos veces seguidas** no duplica ni un
`ModuleControl` ni un `AccionModule`;
(b) crea los módulos `"Presupuesto"` y `"Contabilidad"` con sus **5** y **4** acciones.

⚠️ Esto **no** cambia las fixtures: `module_controls.yml` y `accion_modules.yml` (Tareas 5 y 6)
siguen siendo la verdad del entorno de test; la rake task es para staging y producción.

---

## Convenciones (obligatorias para los 11 paquetes siguientes)

### Dónde va cada test

| Qué se prueba | Carpeta | Nombre del archivo | Clase base |
|---|---|---|---|
| Modelo (validaciones, callbacks, métodos) | `test/models/` | `<modelo_singular>_test.rb` | `ActiveSupport::TestCase` |
| Servicio de `app/services/` | `test/services/` | `<servicio>_test.rb` | `ActiveSupport::TestCase` |
| Endpoint HTTP (contrato JSON, permisos, strong params) | `test/controllers/` | `<controller>_test.rb` | `ActionDispatch::IntegrationTest` |
| Flujo multi-request o MCP | `test/integration/` | `<flujo>_test.rb` | `ActionDispatch::IntegrationTest` |
| Uploader | `test/models/` | `<uploader>_test.rb` | `ActiveSupport::TestCase` |
| E2E | `test/e2e/specs/` | `<flujo>.spec.js` | Playwright |

`test/services/` **no existe todavía**: lo crea el primer paquete que escriba un servicio, junto
con el servicio. Este paquete no lo crea vacío.

### Cómo se nombra un test

Formato: `test "<sujeto> <verbo en presente> <resultado esperado>"`, en español, minúsculas.
Ejemplos válidos:
- `test "evaluate! marca excedido cuando el gasto no cabe en la partida"`
- `test "POST /expense_budgets responde 403 si el usuario no tiene el permiso Crear"`
- `test "available_for excluye los gastos con budget_status excedido"`

Prohibido: `test "should get index"`, `test "the truth"`, nombres en inglés.

### Reglas que ningún test puede romper

1. **Todo `create`/`update`/`destroy` de `ReportExpense`, `CostCenter`, `ExpenseBudget`,
   `Material`, `Contractor`, `Report` o `User` va envuelto en `as_user(users(:admin)) { ... }`.**
   Es la causa número uno de tests rojos.
2. **Fixtures referenciadas por etiqueta**, nunca por id: `users(:admin)`, no `User.find(1)`.
3. **Antes de mergear una fixture nueva**, correr `bin/rails test test/models` **completo**: con
   `fixtures :all`, un YAML roto tumba la suite entera, no solo su propio test.
4. **Después de cada migración**, `RAILS_ENV=test bin/rails db:test:prepare` — si no,
   `maintain_test_schema!` aborta con `exit 1`.
5. **No agregar `parallelize`** a `test_helper.rb`.
6. **No agregar gemas de test** (`webmock`, `vcr`, `mocha`, `factory_bot`). Los stubs se hacen con
   `Object#stub` de Minitest: `ExchangeRateService.stub(:fetch_remote, resultado) { ... }`.
7. **`test/test_helper.rb` es del paquete 01 y ningún otro paquete lo modifica** (corrección 6,
   §7.2). `test/support/**/*.rb` **se autocarga** con el `Dir[...].each { |f| require f }` de la
   Tarea 10: está **prohibido** el `require_relative` para cargar dobles, y los helpers de
   conveniencia (`with_fake_extractor`, helpers de MCP, etc.) viven dentro del propio archivo de
   `test/support/`, como módulo que el test incluye.
8. **Los specs E2E funcionales son del paquete 12.** Ningún otro paquete crea archivos en
   `test/e2e/specs/` (el único que existe antes del 12 es el `smoke.spec.js` de este paquete). La
   obligación E2E de los demás paquetes es **emitir los `data-testid`** de §7.6.

### Comandos exactos

```bash
# --- Minitest ---
bundle exec rails test                        # suite completa (models + controllers + integration)
bundle exec rails test test/models            # solo unitarios
bundle exec rails test test/models/expense_budget_test.rb          # un archivo
bundle exec rails test test/models/expense_budget_test.rb:42       # un test por linea
RAILS_ENV=test bundle exec rails db:test:prepare                   # tras cada migracion

# --- Playwright (primera vez) ---
cd test/e2e
npm install
npm run install:browsers      # descarga chromium (~150 MB), una sola vez

# --- Playwright (uso diario) ---
cd test/e2e
npm run prepare:app           # db:test:prepare + webpack (si hace falta) + seed
npm test                      # todos los specs presentes (al mergear el 01, solo el smoke)
npm run test:smoke            # solo el smoke, para validar el andamiaje
SKIP_WEBPACK=1 npm test       # sin recompilar packs (SOLO si no se toco app/javascript)
npm run report                # abre el reporte HTML de la ultima corrida
```

**Semáforo antes de cada despliegue a staging** (arquitectura §5.5): `bundle exec rails test` en
verde **y** `npm test` en `test/e2e` en verde. No hay CI.

---

## Pruebas unitarias (Minitest)

Este paquete escribe **3 archivos de test / 18 casos** (17 originales + el caso de
`parameterizations.yml` que exige la corrección 4). Su función es demostrar que la
infraestructura funciona; no prueba lógica de negocio (no existe todavía).

### `test/models/fixtures_integrity_test.rb` — 8 casos

Es el test guardián de `fixtures :all`. Si un paquete futuro rompe un YAML, este falla primero y
con un mensaje legible en vez de un `NoMethodError` críptico.

| Test | Aserción |
|---|---|
| `test "todas las fixtures cargan sin error"` | Recorre `Dir[Rails.root.join("test/fixtures/*.yml")]`, deriva el modelo con `File.basename(f, ".yml").classify.safe_constantize` y afirma `model.count > 0` para cada uno que resuelva a un modelo. Falla nombrando el YAML. |
| `test "ninguna columna de fixture es inexistente en el esquema"` | Para cada YAML con modelo: parsea las claves de primer nivel de cada registro y afirma que cada clave está en `model.column_names`, o en `model.reflect_on_all_associations.map(&:name).map(&:to_s)`. **Este es el test que habría atajado las 4 fixtures rotas.** |
| `test "las FKs de report_expenses apuntan a registros existentes"` | `ReportExpense.find_each` y afirma `CostCenter.exists?(cost_center_id)`, `User.exists?(user_invoice_id)`, `User.exists?(user_id)`. |
| `test "los usuarios de fixture autentican con la contrasena de fixture"` | `assert users(:admin).valid_password?(AuthenticationHelpers::FIXTURE_PASSWORD)` para los **8** usuarios. Caso de fallo: si alguien cambia `stretches` o el ERB, esto lo detecta. |
| `test "el rol Administrador se llama exactamente Administrador"` | `assert_equal "Administrador", rols(:administrador).name`. Case-sensitive a propósito: `is_admin?` compara string literal y `db/seeds_staging.rb` siembra `"ADMINISTRADOR"` (que nunca es admin). |
| `test "existen los ModuleControl que exige after_sign_in_path_for"` | `assert ModuleControl.exists?(name: "Reportes de servicios")` y `"Tablero de Ingenieros"`. Sin ellos el login real revienta con `NoMethodError`. |
| `test "el rol administrador no tiene accion_modules asignados"` | `assert_empty rols(:administrador).accion_modules`. Blinda la decisión de diseño de la Tarea 4: si alguien se los agrega, los tests de permisos dejan de probar lo que creen probar. |
| `test "parameterizations.yml asocia por user_id y no por asociacion"` | **Corrección 4.** `assert_equal users(:admin).id, parameterizations(:antiguedad).user_id` **y** `refute_includes File.read(Rails.root.join("test/fixtures/parameterizations.yml")), "user: admin"` — `Parameterization` no declara `belongs_to :user`, así que la forma de asociación tumbaría `fixtures :all` entero. |

### `test/models/test_helpers_test.rb` — 7 casos

| Test | Aserción |
|---|---|
| `test "as_user setea User.current durante el bloque"` | Dentro del bloque `assert_equal users(:admin), User.current`. |
| `test "as_user restaura el valor previo al salir"` | `User.current = users(:gerente)`; `as_user(users(:admin)) {}`; `assert_equal users(:gerente), User.current`. |
| `test "as_user restaura User.current aunque el bloque lance"` | `assert_raises(RuntimeError) { as_user(users(:admin)) { raise "boom" } }` y luego `assert_nil User.current`. **Caso de fallo, no camino feliz.** |
| `test "crear un ReportExpense dentro de as_user no revienta y deja RegisterEdit"` | `as_user(users(:admin)) { ReportExpense.create!(...) }`; afirma que el registro existe y que `RegisterEdit.where(module: "Gatos").count` aumentó en 1 (el typo se conserva a propósito, arquitectura §4.7). |
| `test "crear un ReportExpense sin User.current usa el fallback current_actor_id"` | Con `User.current = nil`, `ReportExpense.create!(user_id: users(:admin).id, ...)` **no lanza** y el `RegisterEdit` generado tiene `user_id == users(:admin).id`. Este test es el que valida la Tarea 9. |
| `test "grant_permission! agrega el permiso y revoke_permission! lo quita"` | `grant_permission!(rols(:ingeniero), "Presupuesto", "Crear")` → `assert rols(:ingeniero).reload.accion_modules.exists?(name: "Crear", module_control_id: ...)`; luego `revoke_permission!` → `assert_not`. Y `grant_permission!` dos veces no duplica (`assert_equal 1, count`). |
| `test "upload_fixture devuelve un UploadedFile con el content type correcto"` | `assert_equal "application/pdf", upload_fixture("comprobante.pdf").content_type` y `"application/octet-stream"` para `malicioso.exe`. |

### `test/integration/authentication_smoke_test.rb` — 3 casos

| Test | Aserción |
|---|---|
| `test "sign_in_as autentica y deja User.current seteado"` | `sign_in_as(users(:admin))`; `get report_expenses_path`; `assert_response :success`. |
| `test "un endpoint JSON responde la forma data/total con el usuario autenticado"` | `sign_in_as(users(:admin))`; `get get_report_expenses_path, params: { page: 1, per_page: 10 }`; `assert_json_list` devuelve un Array y `json_body["total"]` es Integer. Valida de paso los helpers JSON contra el contrato real de arquitectura §3. |
| `test "sin autenticar, un endpoint protegido redirige al login"` | Sin `sign_in_as`: `get get_report_expenses_path`; `assert_redirected_to new_user_session_path`. **Caso de fallo.** |

⚠️ Este último test documenta un hecho incómodo: los endpoints existentes **redirigen** (302) en
vez de devolver 401/403 JSON. Los endpoints **nuevos** sí devuelven 403 con cuerpo JSON
(arquitectura §3). Los paquetes no deben copiar el patrón viejo.

---

## Pruebas E2E (Playwright)

Este paquete escribe **1 spec / 4 escenarios** (el smoke) **y nada más** (corrección 7). Los **9
flujos funcionales** de arquitectura §5.2, repartidos en 7 specs y 28 tests, son del **paquete
12** y de nadie más; los paquetes 05, 06, 08 y 09 ya borraron los suyos. La frase del paquete 08
—"la infraestructura la monta el primer paquete que escriba un E2E"— queda **derogada**: la monta
este paquete, completa, antes que nadie.

### `test/e2e/specs/smoke.spec.js`

Objetivo: validar el andamiaje (server de test arriba, packs compilados, seed cargado, sesión
persistida, `data-testid` presentes) **antes** de que 11 paquetes construyan encima.

| # | Escenario | Pasos y selectores exactos |
|---|---|---|
| 1 | **La sesión persistida funciona** | `page.goto("/")` → `expect(page).not.toHaveURL(/sign_in/)`. Verifica que `storageState.json` del proyecto `setup` se cargó. |
| 2 | **El menú lateral tiene el enlace a Gastos** | `page.getByTestId("nav-gastos")` → `toBeVisible()`; `toContainText("Gastos")`; `toHaveAttribute("href", "/report_expenses")`. |
| 3 | **Entrar a Gastos monta el pack de React** | Click en `[data-testid="nav-gastos"]` → `expect(page).toHaveURL(/\/report_expenses$/)` → `expect(page.getByTestId("page-report-expenses")).toBeVisible()`. Esto prueba que **webpacker compiló** (si no, el div nunca aparece porque el pack no carga) y que `WebpackerReact.setup` corrió. |
| 4 | **La tabla se llena desde el endpoint, no desde el HTML** | Espera la respuesta de red: `page.waitForResponse(r => r.url().includes("/get_report_expenses") && r.status() === 200)`; luego `expect(page.getByTestId("cm-datatable")).toBeVisible()` y `expect(page.getByTestId("cm-datatable-row")).toHaveCount(2)` (los 2 gastos semilla `FE-E2E-001` y `FE-E2E-002` del seed). Además `expect(page.getByText("FE-E2E-001")).toBeVisible()`. |

Escenario negativo incluido en el mismo archivo, en un `test.describe` con
`test.use({ storageState: { cookies: [], origins: [] } })`:

| # | Escenario | Aserción |
|---|---|---|
| 5 | **Sin sesión, `/report_expenses` manda al login** | `page.goto("/report_expenses")` → `expect(page).toHaveURL(/sign_in/)` y `expect(page.locator("#user_email")).toBeVisible()`. Detecta que `allow_forgery_protection = false` no está desactivando también la autenticación. |

**Trampas ya conocidas que el spec debe evitar** (documentar como comentario en el archivo, para
los paquetes siguientes):
- Los 4 `react-select` del modal de gasto usan `menuPortalTarget: document.body`: sus opciones se
  renderizan **fuera** del modal ⇒ buscarlas con `page.getByText(...)`, nunca con
  `modal.getByText(...)`.
- El select de centro de costo no muestra nada hasta 3 caracteres (dispara
  `GET /shifts/search_cost_centers`): hay que `await page.waitForResponse(...)` antes de presionar
  Enter.
- `config.cache_classes = true` en test: el `webServer` **no recarga código**. Tras editar un
  modelo o un controller hay que matar el servidor (`reuseExistingServer` lo reutiliza) o correr
  con `CI=1`.
- `allow_forgery_protection = false` en test ⇒ **un E2E verde no valida CSRF**. El paso de JSON a
  `FormData` con `X-CSRF-Token` se prueba en el nivel 2 (controller), no aquí.

---

## Criterios de aceptación

Verificables con sí/no, sin opinión:

**Minitest**
1. `bundle exec rails runner -e test 'puts 1'` imprime `1` (el boot no falla).
2. `grep -c chromedriver-helper Gemfile` devuelve `0`.
3. `bundle exec rails test` termina con **0 failures, 0 errors, 0 skips**.
4. `bundle exec rails test` reporta **18 o más** `assertions` en al menos 18 `runs` (17 originales
   + el caso de `parameterizations.yml` de la corrección 4).
5. `find test -name "*_test.rb" | xargs grep -l 'should get index'` no devuelve nada.
6. No existe `test/system/` ni `test/application_system_test_case.rb`.
7. Existen y cargan: `test/fixtures/rols.yml`, `users.yml`, `customers.yml`, `cost_centers.yml`.
8. `test/fixtures/module_controls.yml` y `accion_modules.yml` **no contienen** el string `MyString`.
9. `ReportExpense.create!` con `User.current = nil` no lanza excepción (probado por
   `test_helpers_test.rb`).
10. `grep -n "User.current.id" app/models/report_expense.rb` devuelve **0 líneas**.
11. `test_helper.rb` **no contiene** la palabra `parallelize`.
12. Existen los **11** archivos de `test/fixtures/files/` que lista §7.12 de la arquitectura
    (`ls test/fixtures/files | wc -l` devuelve `14`) y `comprobante.pdf` abre en un visor de PDF.
13. **RETIRADO por auditoría** (corrección 1). `config/initializers/carrierwave.rb` es del
    paquete **03** y este paquete no lo toca; el criterio de `enable_processing` /
    `tmp/uploads_test` se verifica en el 03. El número se conserva para no romper las referencias
    cruzadas de otros documentos.
13-bis. `test/fixtures/parameterizations.yml` existe, carga con `fixtures :all` y **no contiene**
    la cadena `user: admin` (usa `user_id:` con `FixtureSet.identify`).

**Playwright**
14. `test/e2e/package.json` existe; `package.json` de la **raíz** no contiene la cadena
    `playwright` y su `engines.node` sigue siendo `"16.x"`.
15. `cd test/e2e && npm install && npm run install:browsers` termina en 0.
16. `cd test/e2e && npm run prepare:app` termina en 0 y deja
    `public/packs-test/manifest.json` en disco.
17. `cd test/e2e && npm run test:smoke` termina en 0 con **5 tests passed** (4 del describe
    autenticado + 1 sin sesión), en una máquina donde el servidor de test no estaba corriendo
    (el `webServer` lo levanta solo).
18. Una segunda corrida de `npm run test:smoke` inmediatamente después vuelve a pasar (el seed es
    idempotente y el reset de datos transaccionales funciona).
19. `test/e2e/.auth/storageState.json` se genera y **no** está trackeado por git
    (`git check-ignore test/e2e/.auth/storageState.json` devuelve la ruta).
20. `git status --porcelain` después de una corrida completa está limpio (nada de
    `test-results/`, `playwright-report/`, `node_modules/` ni `public/packs-test/` sin ignorar).
21. `grep -rn "_url" test/e2e/` no devuelve ningún uso de helpers de ruta de Rails.
22. `data-testid` presentes en el HTML servido: `nav-gastos`, `page-report-expenses`,
    `cm-datatable`, `cm-datatable-row`.

**Documentación**
23. `test/e2e/README.md` existe y sus comandos, copiados y pegados, funcionan.

**Permisos (Tarea 25-bis, corrección 2)**
24. `rake permissions_gastos_ia:install` corrida **dos veces seguidas** deja los mismos conteos:
    `ModuleControl.count` y `AccionModule.count` no cambian en la segunda corrida, y
    `Rol.find_by(name: "Administrador").accion_modules.count` tampoco.
25. Tras correrla existen `ModuleControl` `"Presupuesto"` (con **5** `AccionModule`) y
    `"Contabilidad"` (con **4**), con los nombres literales de `00-ARQUITECTURA.md` §4.4.
26. `grep -n "destroy_all" lib/tasks/permissions_gastos_ia.rake` no devuelve nada, y
    `lib/tasks/create_config.rake` no gana ningún `destroy_all` nuevo respecto de `master`.

---

## Riesgos y trampas

| # | Riesgo | Qué pasa si el agente no lo cuida | Mitigación |
|---|---|---|---|
| 1 | **`bin/spring` cachea el árbol de gemas** | Tras quitar `chromedriver-helper`, `bin/rails test` sigue reventando con `undefined method 'driver_path='` y el agente cree que no funcionó. | `bin/spring stop` inmediatamente después de `bundle install`. Está en la Tarea 1 por esto. |
| 2 | **`fixtures :all` con un YAML roto tumba TODA la suite** | Un `expense_budgets.yml` mal escrito en el paquete 3 pone en rojo los 60 tests de los paquetes 1 y 2, y se pierde media hora buscando dónde. | `fixtures_integrity_test.rb` falla primero con el nombre del archivo. Regla 3 de convenciones. |
| 3 | **`db/schema.rb` no tiene ni un `add_foreign_key`** | Una fixture con FK colgante **inserta sin error** y el test falla mucho después con `NoMethodError: undefined method 'id' for nil` dentro de `create_create_register`. | Todas las FKs por etiqueta (Tarea 8) + test de integridad de FKs. |
| 4 | **`CostCenter before_create :create_code` sobrescribe `code`** | El seed E2E crea el centro con `code: "CM-E2E-01-2026"` y el callback lo reemplaza; el spec busca un código que no existe y falla con un timeout de 15 s sin explicación. | `update_column(:code, ...)` después del create, explícito en la Tarea 18. |
| 5 | **`after_sign_in_path_for` revienta sin `Reportes de servicios` / `Tablero de Ingenieros`** | El `auth.setup.js` falla con un 500 y **los 5 tests dependientes se saltan**, así que el reporte dice "5 skipped" en vez de "1 failed". | Ambos `ModuleControl` en fixtures (Tarea 5) y en el seed E2E (Tarea 18), con test guardián. |
| 6 | **Webpacker compila en el primer request** (`compile: true` en test, 29 packs) | `webServer.timeout: 180000` se agota compilando y Playwright aborta la corrida entera sin ejecutar un test. Peor: pasa solo en máquinas frías, así que "a mí me funciona". | `globalSetup` precompila **antes** de levantar el server (Tarea 21). El check de mtime evita pagarlo cada vez. |
| 7 | **`SKIP_WEBPACK=1` usado tras tocar JS** | El E2E corre contra packs viejos y falla o —peor— pasa contra código que ya no existe. | Documentado en el README y en el propio script: `SKIP_WEBPACK` solo si `git diff --name-only` no toca `app/javascript/`. |
| 8 | **`test/system/*.rb` con helpers `*_url` + `routes.rb:100`** | `default_url_options host: "controlmatica.herokuapp.com"` ⇒ correr `rails test:system` **crea, edita y borra datos reales en producción**. | Borrar los 2 archivos (Tarea 2). Es la razón de seguridad, no de limpieza. Y `grep -rn "_url" test/e2e/` como criterio de aceptación 21. |
| 9 | **`User.current` es `Thread.current[:user]` y sobrevive entre tests** | Un test que setea `User.current` y no lo limpia hace pasar (o fallar) al siguiente por accidente, con dependencia de orden alfabético. Minitest randomiza el orden ⇒ falla intermitente. | `teardown { User.current = nil }` global en `test_helper.rb` + `ensure` dentro de `as_user`. |
| 10 | **`menu_permissions` memoiza por request** | Un test que hace `grant_permission!` y espera efecto dentro del mismo request ve el permiso viejo y el agente concluye que el helper está roto. | Comentado en `permission_helpers.rb`; los tests hacen la petición **después** de otorgar. |
| 11 | **`config/database.yml` está gitignorado** | Un agente que trabaje en un checkout limpio no tiene BD y todo falla en el boot. | Verificar `config/database.yml` y `config/application.yml` antes de la Tarea 1; si faltan, generarlos desde el entorno local. Es también el bloqueo #1 para montar CI (arquitectura §5.5). |
| 12 | **Agregar Playwright a la raíz** | El buildpack de Node de Heroku instala devDependencies y descarga ~500 MB de navegadores en cada build; además `engines.node: "16.x"` es incompatible con Playwright ≥ 1.20 y el build revienta. | `test/e2e/package.json` separado. Criterio de aceptación 14 lo verifica automáticamente. |
| 13 | **`workers > 1` en Playwright** | Los specs comparten una sola BD de test: dos workers creando gastos contra el mismo centro se pisan y producen fallos intermitentes indistinguibles de bugs reales. | `workers: 1`, `fullyParallel: false`, no negociable. |
| 14 | **`cache_classes = true` en el server de test** | Se edita un modelo, se vuelve a correr el E2E con `reuseExistingServer: true` y el cambio no surte efecto. Horas perdidas. | Documentado en el spec y en el README: matar el server entre cambios de Ruby. |
| 15 | **El `private` de la Tarea 9** | Si `report_expense.rb` ya tenía métodos públicos declarados después del punto donde se inserta `private`, se vuelven privados y alguna llamada externa revienta en runtime, no en test. | Insertar `current_actor_id` **al final del archivo**, verificando qué queda debajo. `bundle exec rails test` completo tras el commit. |
| 16 | **Colisión de claves en `report_expenses.yml`** | La tabla tiene columnas string `type_identification` y `payment_type` **y además** `type_identification_id` / `payment_type_id`, y las asociaciones se llaman igual que las columnas string. Poner `type_identification: opcion_tipo` hace que Rails intente resolver una asociación cuyo nombre choca con una columna y falle de forma confusa. | Usar `type_identification_id: <%= ActiveRecord::FixtureSet.identify(:opcion_tipo) %>` y borrar las claves string (Tarea 8). |
| 17 | **`json_body` memoizado** | Un test con dos requests asierta sobre el cuerpo del primero creyendo que es el segundo. Falso verde. | `json_body` parsea siempre, sin `||=` (Tarea 13). |

---

## Discrepancias con la arquitectura

1. **Numeración.** `00-ARQUITECTURA.md` §5.1 llama a este trabajo "Paquete 0". El brief lo numera
   01. **Son el mismo paquete**; se adopta 01 por coherencia con la serie de 12. No hay Paquete 0.

2. **Ubicación de los E2E.** El brief propone `e2e/` en la raíz; la arquitectura (§4.1 y §5.2)
   fija `test/e2e/`. **Se sigue la arquitectura**, y la razón es sustantiva, no estética:
   `.slugignore` ya excluye `test/` entero, así que Playwright y sus 500 MB de navegadores quedan
   fuera del slug de Heroku sin agregar una línea. Un `e2e/` en la raíz habría que excluirlo a
   mano y cualquiera que edite `.slugignore` puede romperlo sin darse cuenta.

3. **`test/fixtures/accion_modules_rols.yml`.** La arquitectura §5.1.5 lo lista entre las
   6 fixtures faltantes ("HABTM sin modelo: fixture de tabla suelta"). **Este paquete no lo crea**
   y usa el HABTM inline de `rols.yml`. Razón: una fixture de tabla suelta no resuelve etiquetas y
   obliga a `ActiveRecord::FixtureSet.identify(:etiqueta)` escrito a mano en cada fila — es
   exactamente la clase de FK frágil que la §5.4.4 manda eliminar. `Rol
   has_and_belongs_to_many :accion_modules` (`app/models/rol.rb:19`) hace que Rails genere las
   filas de la tabla puente solo. El resultado en la BD es idéntico; el mantenimiento no.

4. **Borrado de `test/application_system_test_case.rb`.** La arquitectura manda borrar los tests
   de sistema pero no menciona su clase base. Se borra también: queda huérfana y su
   `driven_by :selenium, using: :chrome` es justo lo que se está desmontando. Si algún paquete
   futuro quisiera Capybara, la regenera con `rails g`.

Ninguna de las cuatro cambia una decisión de dato, de contrato ni de estado. No requieren
modificar `00-ARQUITECTURA.md`.

---

## Decisiones asumidas (resumen)

- **Asumido:** el rol `administrador` de fixtures **no** tiene `accion_modules`, para que los
  tests de permisos distingan el camino `is_admin?` del camino `has_menu_permission?`.
- **Asumido:** contraseña única de todas las fixtures de usuario: `password123`
  (`AuthenticationHelpers::FIXTURE_PASSWORD`). Usuario E2E: `e2e-password-123`.
- **Asumido:** se borra `test/application_system_test_case.rb` junto con `test/system/`.
- **Asumido:** `capybara` y `selenium-webdriver` **se dejan** en el `Gemfile`; solo se quita
  `chromedriver-helper`, que es lo único que rompe el boot. Sacar las otras dos es ruido con
  riesgo de tocar el lock sin necesidad.
- **Asumido:** las fixtures heredadas que este proyecto no toca (`alerts`, `commissions`,
  `commission_relations`, `customer_invoices`, `material_invoices`, `notification_alerts`,
  `quotations`, `sales_orders`, `shifts`) conservan sus FKs enteras colgantes. Se anota como deuda.
- **Asumido:** `json_body` no memoiza.
- **Asumido:** el seed E2E usa `update_column(:code, ...)` para sortear
  `CostCenter#create_code`.
- **Asumido:** el reset entre corridas de E2E es "borrar y recrear los `ReportExpense` del centro
  `CM-E2E-01-2026`", no truncar tablas. Truncar rompería a cualquiera que tenga datos en su BD de
  test local.
- **Asumido:** `test/services/` lo crea el primer paquete que escriba un servicio; este no lo crea
  vacío.
