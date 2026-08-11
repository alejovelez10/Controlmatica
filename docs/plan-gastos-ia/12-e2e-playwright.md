# Paquete 12 — Suite E2E con Playwright: flujos completos de punta a punta

## 🔴 CORRECCIONES DE AUDITORÍA (vinculantes — leer ANTES que el resto del documento)

> Estas correcciones **mandan sobre cualquier texto de este archivo** que las contradiga.
> Consolidadas en `00-ARQUITECTURA.md` §7.

1. 🔴 **La sección "Contrato de `data-testid`" (líneas ~589-607) se REESCRIBE COMPLETA contra la
   tabla canónica de `00-ARQUITECTURA.md` §7.6.** Tal como estaba, **no tenía prácticamente
   ningún solape** con lo que emiten los paquetes dueños y los 28 tests no habrían encontrado ni
   un selector. Los nombres canónicos son los que producen los paquetes **08** y **09**.
   Traducción obligatoria de los selectores de todos los specs de este documento:

   | Nombre de este documento (derogado) | Nombre canónico §7.6 |
   |---|---|
   | `tab-presupuesto` | **`budget-tab`** |
   | `budget-new` | **`budget-new-btn`** |
   | `budget-form-user` | **`budget-user-select`** |
   | `budget-form-amount` | **`budget-amount`** |
   | `budget-form-notes` | **`budget-notes`** |
   | `budget-form-submit` | **`budget-submit`** |
   | `budget-form-error` | **`budget-server-error`** (y `budget-block-message` para el bloqueo por tope) |
   | `expense-form-user` | **`expense-user-select`** (select de responsable) |
   | `expense-form-receipt` | **`expense-receipt-input`** |
   | `expense-form-currency` | **`expense-currency-select`** |
   | `expense-form-foreign-value` | **`expense-foreign-value`** |
   | `expense-form-foreign-tax` | **`expense-foreign-tax`** |
   | `expense-form-exchange-rate` | **`expense-rate`** |
   | `expense-form-rate-date` | **`expense-rate-date`** |
   | `expense-form-rate-notice` | **`expense-rate-shifted`** (día no hábil) / `expense-rate-ok` / `expense-rate-error` |
   | `expense-form-budget-hint` | **`expense-budget-ok`** / `expense-budget-warning` / `expense-budget-none` |
   | `expense-extract-button` | **`expense-extract-btn`** |
   | `expense-extract-status` | **`expense-extract-loading`** / `expense-extract-done` / `expense-extract-error` |

   Se **conservan** tal cual (ya coincidían): `budget-panel`, `budget-row-{id}`,
   `budget-available-{id}`, `budget-summary-*`, `expense-new`, `expense-receipt-link-{id}`,
   `expense-receipt-preview-{id}`, `receipt-preview-modal`, todos los `accounting-*`,
   `expense-ref-{id}`, `expense-budget-status-{id}`, `nav-contabilidad` y los 4 del paquete 01.
   **Los dueños quedan fijados en §7.6 y ya no dicen "Presupuesto frontend"/"Comprobante"**: son
   **08** (formularios, pestaña, comprobante, moneda, extracción, previsualización) y **09**
   (columnas, filtros, Contabilidad, menú).
2. 🔴 **Este paquete es el dueño ÚNICO de todos los specs funcionales** (§7.2). Los paquetes 05,
   06, 08 y 09 **borraron los suyos**, incluidos los dos `accounting.spec.js` y los dos
   `receipt.spec.js` que colisionaban por nombre de archivo. Consecuencia: la nota *"este paquete
   NO reescribe `accounting.spec.js` del paquete 09, le agrega un describe"* **queda derogada**:
   `accounting.spec.js` es de este paquete, completo, e incorpora los 5 escenarios que el 09
   describía más los 3 propios.
   **La infraestructura** (`playwright.config.js`, `global-setup`, `auth.setup`, `env.js`, `db.js`,
   `smoke.spec.js`, `db/seeds/e2e.rb`, `package.json`, `.nvmrc`) sigue siendo del **paquete 01**;
   este paquete la consume y solo agrega `config/initializers/e2e_stubs.rb` y sus seeds acotados.
3. **Encargo del paquete 09 — 3 escenarios negativos adicionales en `accounting.spec.js`** (§7.2,
   punto 5 del 09): renderizar con `estados.approve = false` (sin checkboxes ni menú de fila), con
   `estados.export = false` (sin enlace de exportación), y con una respuesta **403** (mensaje
   correcto y tabla vacía). Compensan que el 09 no tiene runner de JS.
4. 🔴 **Tu Riesgo 16 (`download` vs `target=_blank`) está RESUELTO** (§7.8). El paquete 06 añade
   `response-content-disposition=attachment` a la URL firmada de `download_receipt`, con el nombre
   original del archivo. **E4.3 se escribe con `page.waitForEvent("download")`** y verifica los
   bytes `%PDF-`, tal como decía el criterio 26. El fallback a `waitForEvent('popup')` queda
   descartado. En la corrida E2E (storage `:file`, `E2E_UPLOAD_ROOT=public`) el controller devuelve
   la misma cabecera vía `send_file ... disposition: "attachment"`.
5. 🔴 **Los seams de red YA EXISTEN con los nombres que este paquete asume** (§6.7, §7.2). La nota
   *"si esos paquetes nombran el método de otra forma, se ajusta el nombre"* queda derogada:
   - **`ExchangeRateService.fetch_remote(currency:, date:)`** — el paquete 05 elimina su inyección
     por parámetro `client:` y su privado `resolve_remote`.
   - **`ReceiptExtractionService.call_vision_model(payload)`** — el paquete 10 elimina su seam de
     atributo de clase `api_client=`.
   `config/initializers/e2e_stubs.rb` se puede escribir sin adivinar.
6. **La IA SÍ se ejercita en E2E, con el stub de este paquete.** El paquete 10 **eliminó** su
   obligación de poner `RECEIPT_EXTRACTION_ENABLED: 'false'` en el `webServer.env`, que
   contradecía directamente a `ai-capture.spec.js`. Esa ENV queda solo como **kill switch de
   producción** (§7.9). `ai-capture.spec.js` se escribe y se ejecuta.
7. **La previsualización del comprobante existe**: `expense-receipt-preview-{id}` y
   `receipt-preview-modal` los implementa el **paquete 08** (§7.2, §7.6). **E4.2 se escribe** y ya
   no hay que renegociar la palabra "previsualización" con el cliente.
8. **La captura asistida llega al índice de gastos**: el paquete 08 absorbió el `renderModal()` de
   `packs/ReportExpenseIndex.js` (§4.5). `ai-capture.spec.js`, que corre contra el índice, tiene
   contra qué correr.
9. **`test/fixtures/files/`**: los crea el **paquete 01** con el inventario consolidado (§7.12);
   este paquete solo declara "ya existen" `comprobante_ia.jpg`, `comprobante_ia_usd.pdf` y
   `comprobante_ilegible.png` (este último compartido con el 10, mismo archivo).
10. **`E2E_UPLOAD_ROOT`**: el bloque que lo lee vive en `config/initializers/carrierwave.rb`, cuyo
    dueño único es el **paquete 03** (§4.8). Este paquete **solo fija la variable** en su corrida
    (`E2E_UPLOAD_ROOT=public`); no edita el initializer.
11. **`test.fixme()` sigue siendo la regla** si un paquete dueño no está listo — pero con el orden
    de olas de §7.3 (12 va en la ola 7, después de 08 y 09) eso debería ser la excepción, no la
    norma.

> Documento de plan. **Ningún agente escribe código de producción desde aquí**: este paquete escribe
> specs, seeds, helpers de test y un initializer de stubs **solo-test**. Los `data-testid` que la
> suite necesita los emiten los paquetes dueños de cada pantalla (ver §"Contrato de `data-testid`").

---

## Objetivo

Dejar corriendo, en verde y de forma repetible, **36 escenarios E2E** sobre Chromium que ejercitan
los nueve flujos de negocio del proyecto de punta a punta (partidas presupuestales, gasto que cabe,
gasto que se pasa, comprobante adjunto, captura asistida por IA, moneda extranjera, aprobación
contable masiva, permisos y regresión de paginación), con datos sembrados de forma determinista,
aislados por centro de costo, y **sin una sola llamada a un servicio externo**.

> **De dónde salen los 36** (correcciones 2 y 3): 28 propios + **5** que describía el paquete 09 en
> `accounting.spec.js` y que este paquete absorbe al quedar como dueño único de los specs
> funcionales (§7.2) + **3** escenarios negativos que el 09 le encarga. Con los 5 del
> `smoke.spec.js` del paquete 01, la suite completa queda en **41**.

Criterio de "terminado" en una línea: `cd test/e2e && npm test` termina en 0, dos veces seguidas,
en una máquina sin red hacia los proveedores de IA ni hacia la fuente de TRM.

---

## Dependencias

| Paquete | Qué aporta que este paquete **no puede** construir | Bloquea |
|---|---|---|
| **01 — Infraestructura de pruebas** | `test/e2e/package.json`, `playwright.config.js`, `global-setup.js`, `auth.setup.js`, `support/env.js`, `support/db.js`, `db/seeds/e2e.rb`, `test/fixtures/files/*`, la guarda `current_actor_id` en `ReportExpense`, el `.gitignore` de artefactos y los 3 `data-testid` base (`nav-gastos`, `page-report-expenses`, `cm-datatable` / `cm-datatable-row`). | **Todo.** Sin el andamiaje no hay ni un spec ejecutable. |
| **02 — Migraciones y esquema** | Las 6 migraciones. Sin ellas el seed no puede escribir `expense_budgets`, `budget_status`, `currency`, `receipt_file` ni `accounting_approved`. | Todo salvo el escenario 9. |
| **03 — Deuda técnica bloqueante** (`03-deuda-tecnica-bloqueante.md`) | `config/initializers/carrierwave.rb`, **incluido el bloque que lee `E2E_UPLOAD_ROOT`** (§7.2, corrección 10). Este paquete solo fija la variable; no edita el initializer. | Escenarios 4, 5. |
| **04 — Dominio: partidas y aprobación automática** (`04-presupuesto-y-aprobacion.md`) | El modelo `ExpenseBudget` y `ExpenseBudgetService` con la firma canónica de §7.4: validación de tope, `available_for`, `evaluate!`, `persist_with_evaluation!` y `reevaluate_center_user!`. | Escenarios 1, 2, 3, 8. |
| **05 — Multimoneda, TRM y servicio de tasas** (`05-multimoneda-y-trm.md`) | `Currency`, `ExchangeRate`, `ExchangeRateService` y su **único seam de red `fetch_remote(currency:, date:)`** (§6.7). Solo backend. | Escenario 6. |
| **06 — Comprobante, contabilidad backend y Excel** (`06-comprobante-y-contabilidad.md`) | `ReceiptUploader`, `delete_receipt` / `download_receipt` con `response-content-disposition=attachment` (§7.8), `accounting_expenses_controller.rb` completo (C.1–C.5) y el axlsx de contabilidad. | Escenarios 4, 7. |
| **07 — Controladores, rutas, serializers y permisos** (`07-api-permisos-y-rutas.md`) | `expense_budgets_controller.rb` (A.1–A.7), el **cableado presupuestal** de `create/update/destroy` (§7.4), `extract_receipt`, los strong params multipart y `@estados` del show del centro. | Escenarios 1, 2, 3, 4, 5, 6, 8. |
| **10 — IA: extracción de comprobantes y motor de reglas** (`10-ia-extraccion-y-reglas.md`) | `ReceiptExtractionService` con su **único seam de red `call_vision_model(payload)`** (§6.7) y `ExpenseRuleService`. | Escenario 5. |
| **09 — Frontend: columnas, filtros y pantalla de Contabilidad** (`09-frontend-tablas-y-contabilidad.md`) | La pantalla de Contabilidad, sus `data-testid` (`accounting-*`), `nav-contabilidad`, las columnas nuevas de las dos tablas (`expense-ref-*`, `expense-budget-status-*`, `expense-accounting-status-*`) y la selección de `CmDataTable`. **No escribe ningún spec**: `accounting.spec.js` es de este paquete, completo (corrección 2). | Escenarios 7, 8, 9. |
| **08 — Frontend: pestaña Presupuesto y formularios de gasto** (`08-frontend-presupuesto-y-gastos.md`) | La pestaña Presupuesto y su tablero, el formulario de partida, y **los dos formularios de gasto** (`FormCreate.jsx` y `renderModal()`) con comprobante, previsualización, moneda y extracción, todos con los `data-testid` de §7.6. | Escenarios 1, 2, 3, 4, 5, 6, 8. |

**Permisos:** la rake `permissions_gastos_ia:install` y los módulos `Presupuesto` y `Contabilidad`
los aporta el **paquete 01** (§7.2: la tarea se movió del 07 al 01 para romper el ciclo 06↔07).
Son insumo del escenario 8.

**Regla operativa:** este paquete es el **último** de la serie. Si un paquete dependiente no está
listo, su spec se marca `test.fixme()` con el motivo escrito en el título — **nunca** se comenta ni
se borra, para que el reporte diga cuántos flujos faltan.

---

## Archivos

### A crear

| Ruta | Qué se hace |
|---|---|
| `config/initializers/e2e_stubs.rb` | **Único archivo fuera de `test/`.** Reemplaza el método de salida de `ExchangeRateService` y `ReceiptExtractionService` por respuestas deterministas. Doble guarda: `Rails.env.test?` **y** `ENV["E2E_STUBS"] == "1"`. Aborta el boot si el flag está puesto fuera de test. |
| `test/e2e/specs/auth-restricted.setup.js` | Dos logins más: el usuario sin permisos de Presupuesto/Contabilidad → `.auth/storageState-restricted.json`, y el `contab_limitado` (entra a Contabilidad, no aprueba ni exporta) → `.auth/storageState-contab.json` (corrección 3). |
| `test/e2e/specs/budget.spec.js` | Escenarios 1, 2 y 3 (6 tests, `mode: "serial"`). Centro `CM-E2E-BUD-2026`. |
| `test/e2e/specs/receipt.spec.js` | Escenario 4 (4 tests). Centro `CM-E2E-REC-2026`. |
| `test/e2e/specs/accounting.spec.js` | **Archivo completo, dueño único: paquete 12** (§7.2, corrección 2). Escenario 7 (3 tests propios) + los 5 escenarios que describía el paquete 09 + los 3 negativos que el 09 encarga (corrección 3) = **11 tests**. Centro `CM-E2E-ACC-2026`. |
| `test/e2e/specs/ai-capture.spec.js` | Escenario 5 (3 tests). Centro `CM-E2E-REC-2026`, gastos con prefijo `FE-E2E-IA-`. |
| `test/e2e/specs/currency.spec.js` | Escenario 6 (3 tests). Centro `CM-E2E-FX-2026`. |
| `test/e2e/specs/permissions.spec.js` | Escenario 8 (5 tests). Usa `storageState-restricted.json`. Centro `CM-E2E-PERM-2026`. |
| `test/e2e/specs/pagination.spec.js` | Escenario 9 (4 tests). Centro `CM-E2E-PAG-2026` con 57 gastos. |
| `test/e2e/support/seedIds.js` | Lee `test/e2e/.auth/seed-ids.json` sin caché y expone `ids()`, `cc(slug)`, `user(slug)`, `expense(slug)`. |
| `test/e2e/support/stubs.js` | Lee y limpia `tmp/e2e/stub_calls.log`: `readStubCalls()`, `clearStubCalls()`, `lastStubCall(service)`. |
| `test/e2e/support/expenseForm.js` | Helper único del modal de gasto: `abrirModalGasto(page)`, `elegirCentro(page, code)`, `elegirSelect(page, testid, label)`, `llenarGasto(page, attrs)`, `guardarGasto(page)`. Encapsula las trampas de `react-select` y del debounce de 3 letras. |
| `test/e2e/support/money.js` | `aNumero("$1.234.567")` → `1234567`; `esperarFila(page, id)`. |
| `test/e2e/global-teardown.js` | Borra `public/uploads/report_expense/` y `tmp/e2e/`. Referenciado desde `playwright.config.js`. |
| `test/integration/e2e_seed_test.rb` | Guarda del seed: idempotencia, alcance acotado, ids exportados. |
| `test/models/e2e_stubs_test.rb` | Contrato entre el stub y el servicio real (forma del `Result`, claves del hash). |

🔴 **Los archivos de `test/fixtures/files/` NO se crean aquí** (corrección 9, §7.2 y §7.12): el
inventario completo lo crea el **paquete 01**. Este paquete solo declara que **ya existen**
`comprobante_ia.jpg` (disparador del payload feliz en COP del stub de IA),
`comprobante_ia_usd.pdf` (payload en USD) y `comprobante_ilegible.png` (payload de error de
extracción, compartido con el paquete 10: mismo archivo), además de `comprobante.pdf` y
`malicioso.exe` que usa el escenario 4.

### A modificar

> ⚠️ Todos los archivos de esta tabla tienen **dueño único declarado en §7.2 / §5.2** y **no son de
> este paquete**: la infraestructura Playwright y `db/seeds/e2e.rb` son del **paquete 01**
> (corrección 2). Este paquete aporta **solo el delta descrito en cada fila**, coordinado con el 01
> en el mismo PR; no reescribe ni renumera nada de lo que el 01 ya puso ahí.

| Ruta | Dueño (§7.2) | Delta que aporta este paquete |
|---|---|---|
| `db/seeds/e2e.rb` | **01** | Los 6 centros de costo E2E adicionales, 5 usuarios nuevos, los roles `Ingeniero E2E` / `Limitado E2E` / `Contable E2E`, las partidas, los 57 gastos de paginación, los 12 de contabilidad, y la escritura de `test/e2e/.auth/seed-ids.json`. Acepta `E2E_SCOPE`. **No toca el scope `SMOKE` del 01.** |
| `test/e2e/playwright.config.js` | **01** | El proyecto `setup-restricted`, `globalTeardown`, y `webServer.env` con `E2E_STUBS: "1"` y `E2E_UPLOAD_ROOT: "public"`. |
| `test/e2e/package.json` | **01** | Scripts por suite (`test:budget`, `test:receipt`, `test:ai`, `test:currency`, `test:accounting`, `test:permissions`, `test:pagination`). |
| `test/e2e/README.md` | **01** | Sección "Suite funcional": qué prueba cada spec, cómo correr uno solo, cómo se stubean IA y TRM. |
| `.gitignore` | **01** (artefactos de test) | Agregar `/public/uploads/report_expense/` y `/tmp/e2e`. (`public/uploads` **no** se puede ignorar entero: tiene 78 archivos trackeados de `customer_invoice`, `sales_order` y `user`.) |

### Que este paquete **no** crea

- No crea `playwright.config.js`, `global-setup.js`, `auth.setup.js`, `support/env.js`, `support/db.js`
  ni `smoke.spec.js`: son del paquete 01.
- No crea ningún archivo de `test/fixtures/files/`: son del paquete 01 (§7.12, corrección 9).
- **No edita `config/initializers/carrierwave.rb`**: dueño único **paquete 03** (§7.2, §4.8,
  corrección 10). Este paquete solo **fija** `E2E_UPLOAD_ROOT=public` en su corrida.
- No agrega gemas. No agrega `webmock`, `vcr`, `mocha` ni `factory_bot` (convención 6 del paquete 01).
- No toca `package.json` de la raíz.

---

## Tareas

### Bloque A — Datos: seed determinista y aislado

**Tarea 1 — Ampliar `db/seeds/e2e.rb`: constantes de alcance.**

Al inicio del archivo, después del `User.current = ...` que ya exige el paquete 01, declarar:

```ruby
E2E_SCOPES = {
  "SMOKE" => { code: "CM-E2E-01-2026",   viatic: 5_000_000.0 },  # del paquete 01, NO se toca
  "BUD"   => { code: "CM-E2E-BUD-2026",  viatic: 5_000_000.0 },
  "REC"   => { code: "CM-E2E-REC-2026",  viatic: 2_000_000.0 },
  "FX"    => { code: "CM-E2E-FX-2026",   viatic: 9_000_000.0 },
  "ACC"   => { code: "CM-E2E-ACC-2026",  viatic: 4_000_000.0 },
  "PERM"  => { code: "CM-E2E-PERM-2026", viatic: 1_000_000.0 },
  "PAG"   => { code: "CM-E2E-PAG-2026",  viatic: 8_000_000.0 }
}.freeze
SCOPE = ENV.fetch("E2E_SCOPE", "ALL").upcase
```

Regla dura, verificable con `grep`: **el seed nunca escribe ni borra fuera de**
`CostCenter.where(code: E2E_SCOPES.values.map { |v| v[:code] })` y
`User.where("email LIKE '%@controlmatica.test'")`. Prohibido `destroy_all`, `delete_all` sin
`where`, y prohibido `truncate`.

**Tarea 2 — Usuarios y roles del seed.**

| Etiqueta | Email | Rol | Para qué |
|---|---|---|---|
| `owner` | `e2e@controlmatica.test` | `Administrador` | El del paquete 01. Dueño de todos los centros E2E. |
| `benef_a` | `e2e-a@controlmatica.test` | `Ingeniero E2E` | Beneficiario A de partidas. `names: "Ana"`, `last_names: "E2E"`. |
| `benef_b` | `e2e-b@controlmatica.test` | `Ingeniero E2E` | Beneficiario B. `names: "Bruno"`, `last_names: "E2E"`. |
| `benef_c` | `e2e-c@controlmatica.test` | `Ingeniero E2E` | Tercer beneficiario: el que dispara el bloqueo por tope. `names: "Carla"`, `last_names: "E2E"`. |
| `restringido` | `e2e-limitado@controlmatica.test` | `Limitado E2E` | Escenario 8. |
| `contab_limitado` | `e2e-contab@controlmatica.test` | `Contable E2E` | **Encargo del 09 (corrección 3):** entra a Contabilidad pero no puede aprobar ni exportar. E7.9–E7.11. |

Contraseña de todos: `e2e-password-123` (la de `support/env.js`).

Tres roles nuevos, **ninguno se llama `Administrador`** — y esto es la clave del escenario 8:
`app/views/layouts/user.html.erb:163` y siguientes muestran el menú si
`current_user.rol.name == "Administrador"`, saltándose los permisos; `is_admin?`
(`report_expenses_controller.rb:342-344`) hace lo mismo. **Un usuario con rol `Administrador` no
puede probar ninguna denegación.**

- `Ingeniero E2E`: acciones de `Gastos` (`Ingreso al modulo`, `Crear`, `Editar`, `Ver todos`),
  `Centro de Costos` (`Ingreso al modulo`), `Reportes de servicios` (`Ingreso al modulo`).
- `Limitado E2E`: **exactamente** `Gastos` (`Ingreso al modulo`, `Crear`) y `Centro de Costos`
  (`Ingreso al modulo`), `Reportes de servicios` (`Ingreso al modulo`).
  **Cero** acciones de `Presupuesto` y **cero** de `Contabilidad`.
- `Contable E2E` (corrección 3): `Gastos` (`Ingreso al modulo`), `Centro de Costos`
  (`Ingreso al modulo`), `Reportes de servicios` (`Ingreso al modulo`) y `Contabilidad`
  **solo `Ingreso al modulo`**. **Cero** `Aprobar` y **cero** `Exportar` de `Contabilidad`, que es
  lo que hace `@estados[:approve] == false` y `@estados[:export] == false` en el show
  (claves canónicas en §4.4). **Cero** acciones de `Presupuesto`.

⚠️ `Reportes de servicios` con `Ingreso al modulo` es obligatorio en los dos roles: sin él
`after_sign_in_path_for` (`application_controller.rb:104-124`) manda a `root_path`, que es
`home#dashboard`, y el `auth-restricted.setup.js` no puede afirmar nada estable. Con él, el destino
es `reports_path` y la aserción es `not.toHaveURL(/sign_in/)`.

⚠️ `AccionModule belongs_to :user` es requerido: todo `find_or_create_by!` de acción pasa
`a.user_id = admin.id` en el bloque.

**Tarea 3 — Centros de costo del seed.**

Por cada scope, `find_or_create_by!(code: ...)` **no funciona**: `CostCenter before_create
:create_code` sobrescribe `code`. Patrón obligatorio (heredado de la Tarea 18 del paquete 01):

```ruby
def upsert_center!(code:, viatic:, owner:, customer:)
  cc = CostCenter.find_by(code: code)
  return cc if cc
  cc = CostCenter.create!(customer_id: customer.id, user_owner_id: owner.id,
                          viatic_value: viatic, execution_state: "EN EJECUCION",
                          service_type: "PROYECTO", description: "Centro E2E #{code}")
  cc.update_column(:code, code)   # salta callbacks y validaciones a proposito
  cc.reload
end
```

Excepción: `CM-E2E-PERM-2026` lleva `viatic_value: 1_000_000.0` y **`user_owner_id` = `benef_a`**,
no el usuario restringido: el escenario 8 debe probar que ni siquiera se ve la pestaña, no que la
ve pero vacía.

**Tarea 4 — Reset transaccional acotado.**

Antes de crear nada, y solo para los centros del `SCOPE` activo (o todos si `SCOPE == "ALL"`),
con `User.current` ya seteado:

```ruby
ids = centros.map(&:id)
ReportExpense.where(cost_center_id: ids).find_each(&:destroy)   # destroy, no delete_all
ExpenseBudget.where(cost_center_id: ids).delete_all              # sin callbacks de auditoria
ExchangeRate.where(currency: %w[USD EUR]).delete_all
```

`destroy` y no `delete_all` en gastos porque `create_destroy_register` debe correr (si revienta,
el seed falla ruidosamente en vez de dejar basura). `delete_all` en partidas porque no hay nada que
auditar de un dato de prueba y `reevaluate_center_user!` sobre un centro que estamos por recrear es
trabajo perdido.

⚠️ **`CM-E2E-01-2026` (SMOKE) queda fuera de este reset salvo con `SCOPE=ALL` o `SCOPE=SMOKE`**: es
el centro del paquete 01 y su `smoke.spec.js` afirma exactamente 2 filas. Si un scope de este
paquete lo tocara, rompería el smoke ajeno.

**Tarea 5 — Datos por escenario.**

`BUD` (`CM-E2E-BUD-2026`, viáticos 5.000.000):
- Cero partidas y cero gastos. El escenario 1 las crea **por la UI**; sembrarlas haría que el test
  no probara el formulario.

`REC` (`CM-E2E-REC-2026`, viáticos 2.000.000):
- Una `ExpenseBudget` activa: `user_id` = `owner`, `amount` = 2.000.000, `notes: "Partida E2E
  comprobantes"`.
- Un gasto `FE-E2E-REC-001`, `invoice_value: 50000.0`, `invoice_tax: 9500.0`,
  `invoice_date: "2026-06-15"`, **sin** `receipt_file` (el escenario 4 lo adjunta por la UI).

`FX` (`CM-E2E-FX-2026`, viáticos 9.000.000):
- Una `ExpenseBudget` activa de 9.000.000 para `owner`.
- Cero gastos.

`ACC` (`CM-E2E-ACC-2026`, viáticos 4.000.000):
- Una `ExpenseBudget` activa de 1.000.000 para `owner`.
- **12 gastos** con `invoice_number` `FE-E2E-ACC-001` … `FE-E2E-ACC-012`, `invoice_date`
  `2026-06-01` + n días, `accounting_approved: false`, `is_acepted` alternando:
  - `001`–`008`: `budget_status: "aprobado"`, `invoice_value: 100000.0`.
  - `009`–`011`: `budget_status: "sin_presupuesto"`, `invoice_value: 100000.0`.
  - `012`: `budget_status: "excedido"`, `budget_reason: "Excede el presupuesto disponible en $200.000"`,
    `invoice_value: 1200000.0`.
  Los 12 deben quedar con esos estados **exactos**: se escriben con `update_column` después del
  `create!`, porque `budget_status` no está en strong params y el servicio lo recalcularía.
  Comentario obligatorio en el seed explicando por qué se usa `update_column` aquí y no en otro lado.

`PERM` (`CM-E2E-PERM-2026`, viáticos 1.000.000):
- Una `ExpenseBudget` activa de 400.000 para `benef_a`.
- Un gasto `FE-E2E-PERM-001` de `benef_a`.

`PAG` (`CM-E2E-PAG-2026`, viáticos 8.000.000):
- **57 gastos**, `invoice_number` `FE-E2E-PAG-001` … `FE-E2E-PAG-057`,
  `invoice_value: 10000.0 + (n * 1000)`, `invoice_date: "2026-05-01" + n.days`,
  `user_invoice_id` = `owner`, `budget_status: "sin_presupuesto"`.
  57 y no 50: con `per_page = 50` da 2 páginas desparejas (50 + 7), que es la única forma de
  distinguir "el servidor paginó" de "el cliente cortó la lista".
  Creación por lotes con `insert_all` **prohibida**: los callbacks de auditoría deben correr, es
  parte de lo que el escenario prueba indirectamente.

**Tarea 6 — Exportar `seed-ids.json`.**

Al final del seed, escribir `test/e2e/.auth/seed-ids.json` (crear el directorio si no existe) con
la forma **exacta** (el paquete 09 ya lo asume):

```json
{
  "generated_at": "2026-08-10T10:00:00-05:00",
  "scope": "ALL",
  "users":      { "owner": 12, "benef_a": 13, "benef_b": 14, "benef_c": 15, "restringido": 16,
                  "contab_limitado": 17 },
  "cost_centers": { "SMOKE": 340, "BUD": 341, "REC": 342, "FX": 343, "ACC": 344, "PERM": 345, "PAG": 346 },
  "budgets":    { "REC": 7, "FX": 8, "ACC": 9, "PERM": 10 },
  "expenses": {
    "REC_001": 8801,
    "ACC": [8810, 8811, "…los 12 en orden 001..012"],
    "ACC_EXCEDIDO": 8821,
    "PERM_001": 8822,
    "PAG": ["…los 57 en orden 001..057"]
  }
}
```

Escritura con `File.write(path, JSON.pretty_generate(payload))`. Si `SCOPE != "ALL"`, se **funde**
con el archivo existente (leer, `deep_merge`, escribir) para no borrar los ids de los scopes que no
se resembraron.

`.auth/` ya está en `.gitignore` por el paquete 01, así que el archivo no se trackea. Además,
`puts` de un resumen (el `globalSetup` lo vuelca al log).

**Tarea 7 — `test/e2e/support/seedIds.js`.**

```js
const fs = require("fs");
const path = require("path");
const FILE = path.resolve(__dirname, "../.auth/seed-ids.json");

function ids() {                       // SIN cache: el seed puede reescribirlo entre specs
  if (!fs.existsSync(FILE)) {
    throw new Error("Falta test/e2e/.auth/seed-ids.json. Corre: npm run prepare:app");
  }
  return JSON.parse(fs.readFileSync(FILE, "utf8"));
}
const cc      = (slug) => ids().cost_centers[slug];
const user    = (slug) => ids().users[slug];
const expense = (slug) => ids().expenses[slug];
module.exports = { ids, cc, user, expense };
```

**Prohibido memoizar.** Los specs que llaman `reseedE2E()` en `beforeAll` obtienen ids nuevos; una
caché de módulo devolvería los viejos y el fallo sería un timeout de 15 s sin explicación.

---

### Bloque B — Stubs de IA y de tasas de cambio (el punto que el brief exige resolver)

**Tarea 8 — Por qué `page.route()` NO sirve, y qué se hace en su lugar.**

Las llamadas a la fuente de TRM y al modelo de visión las hace **Rails**, en el proceso del
`webServer`, no el navegador. `page.route()` solo intercepta tráfico del navegador ⇒ es incapaz de
tocarlas. Y `WebMock` tampoco: además de estar prohibido (convención 6 del paquete 01), solo
parchea el proceso de Minitest, no un servidor Puma separado.

**Mecanismo adoptado: un initializer solo-test que reemplaza el método de salida de cada servicio.**

Se reemplaza **únicamente el borde de red**, no el servicio entero. Todo lo demás —controller,
strong params, transacción, `evaluate!`, persistencia, serializer, React— corre de verdad. Un stub
del servicio completo haría verde un E2E que no prueba nada.

**Tarea 9 — `config/initializers/e2e_stubs.rb`.**

Estructura obligatoria:

```ruby
# Stubs de red SOLO para la suite E2E de Playwright.
# Doble guarda: entorno de test Y flag explicito. Nunca se carga en dev ni en produccion.
if ENV["E2E_STUBS"] == "1"
  raise "E2E_STUBS=1 fuera de RAILS_ENV=test" unless Rails.env.test?

  module E2eStubs
    LOG = Rails.root.join("tmp", "e2e", "stub_calls.log")

    def self.record!(service, method, args, result_kind)
      FileUtils.mkdir_p(LOG.dirname)
      File.open(LOG, "a") do |f|
        f.puts({ at: Time.current.iso8601, service: service, method: method,
                 args: args, result: result_kind }.to_json)
      end
    end
  end

  module E2eStubs::ExchangeRate
    # Firma canonica de §6.7 (seam de red del paquete 05). Mismo tipo de retorno
    # que el metodo real. Si el 05 cambia la firma, este archivo revienta en boot:
    # es intencional.
    def fetch_remote(currency:, date:)
      ...
    end
  end
  ExchangeRateService.singleton_class.prepend(E2eStubs::ExchangeRate)

  module E2eStubs::ReceiptExtraction
    # Firma canonica de §6.7 (seam de red del paquete 10): UN argumento posicional.
    def call_vision_model(payload)
      ...
    end
  end
  ReceiptExtractionService.singleton_class.prepend(E2eStubs::ReceiptExtraction)

  Rails.logger.warn("[E2E] Stubs de IA y TRM ACTIVOS. Ninguna llamada externa saldra.")
end
```

Puntos no negociables:
1. `prepend` sobre el `singleton_class`, no `define_method` ni alias. Si el método real desaparece o
   cambia de aridad, `super` no existe y el boot falla — que es exactamente lo que queremos.
2. **El stub es una función pura de sus argumentos.** Cero variables de entorno para elegir
   respuesta, cero contadores globales, cero orden de llamada. Razón: cambiar de payload no puede
   exigir reiniciar el `webServer` (con `cache_classes = true` eso cuesta minuto y medio por corrida).
3. Toda llamada se registra en `tmp/e2e/stub_calls.log`, una línea JSON por llamada. Es la **prueba
   verificable** de que no salió tráfico externo: los specs afirman contra ese archivo.
4. `ReceiptExtractionService` **no** se stubea entero: solo `call_vision_model`. El parseo, el
   armado del hash `fields`, las `confidence`, las `warnings` y la llamada a `ExpenseRuleService`
   siguen siendo código real.

**Tarea 10 — Tabla de respuestas del stub de TRM.**

Selector: `(currency, date)`. Nada más.

| `currency` | `date` | Devuelve | Nota |
|---|---|---|---|
| `COP` | cualquiera | `rate_to_cop: 1.0`, `source: "identity"`, `rate_date == date` | **No se registra en el log**: el servicio real tampoco debe salir a la red para COP. |
| `USD` | `2026-06-15` (lunes) | `4321.500000`, `source: "trm_oficial"`, `rate_date: 2026-06-15` | Caso feliz del escenario 6. |
| `USD` | `2026-06-13` (sábado) | `4310.000000`, `source: "trm_oficial"`, **`rate_date: 2026-06-12`** | Fin de semana: el hábil anterior es el viernes 12. Prueba que la UI avisa la diferencia. |
| `EUR` | `2026-06-15` | `4680.250000`, `source: "bce"` | Segunda moneda del catálogo. |
| `USD` | `2026-01-01` | `Result` con `ok? == false` y `error: "sin_tasa"` | Fuerza el camino de captura manual. |
| cualquier otro par | — | `Result` con `ok? == false`, `error: "sin_tasa"` | Nunca inventa un número. |

Las fechas están verificadas: 2026-06-15 es lunes, 2026-06-13 sábado, 2026-06-12 viernes.

**Tarea 11 — Tabla de respuestas del stub de extracción por IA.**

Selector: **el nombre original del archivo subido**, que el stub lee del `payload` que recibe
(`call_vision_model(payload)`, firma canónica de §6.7; la clave exacta del payload la fija el
paquete 10). Nada más.

| Archivo | Devuelve |
|---|---|
| `comprobante_ia.jpg` | `invoice_name: "HOTEL DANN CARLTON E2E"`, `identification: "900123456"`, `invoice_number: "FE-E2E-IA-001"`, `invoice_date: "2026-06-15"`, `currency: "COP"`, `invoice_value: 250000.0`, `invoice_tax: 47500.0`, `invoice_total: 297500.0`; `confidence: { invoice_number: 0.94, invoice_date: 0.71, identification: 0.55 }`; `warnings: []` |
| `comprobante_ia_usd.pdf` | Igual pero `currency: "USD"`, `foreign_value: "120.00"`, `foreign_tax: "22.80"`, `foreign_total: "142.80"`, `exchange_rate: "4321.500000"`, `exchange_rate_date: "2026-06-15"`, `exchange_rate_source: "trm_oficial"`, y los COP derivados **calculados por el servicio real**, no escritos por el stub |
| `comprobante_ilegible.png` | Payload vacío → el servicio real responde `{ type: "error", message: ["No se pudo leer el comprobante. Complete los datos manualmente"] }` |
| cualquier otro | Igual que `comprobante_ilegible.png` |

⚠️ El stub **no** devuelve `invoice_value` en COP para el caso USD: eso lo calcula el servicio real
con `(foreign_value * exchange_rate).round(2)` (invariante #3 de la arquitectura). Si el stub lo
devolviera, el escenario 5 dejaría de probar la conversión.

**Tarea 12 — `test/e2e/support/stubs.js`.**

```js
const fs = require("fs");
const path = require("path");
const { RAILS_ROOT } = require("./env");
const LOG = path.join(RAILS_ROOT, "tmp", "e2e", "stub_calls.log");

const clearStubCalls = () => { if (fs.existsSync(LOG)) fs.unlinkSync(LOG); };
const readStubCalls  = () => (fs.existsSync(LOG)
  ? fs.readFileSync(LOG, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse)
  : []);
const lastStubCall = (service) =>
  readStubCalls().filter((c) => c.service === service).slice(-1)[0] || null;

module.exports = { clearStubCalls, readStubCalls, lastStubCall };
```

Playwright corre en Node **en la misma máquina** que el `webServer`, así que leer el archivo es
legítimo y síncrono. Es la única lectura de filesystem que la suite hace.

**Tarea 13 — Cablear el flag en `playwright.config.js`.**

```js
webServer: {
  command: "bin/rails server -b 127.0.0.1 -p 3001 -e test",
  cwd: RAILS_ROOT,
  url: BASE_URL,
  timeout: 180_000,
  reuseExistingServer: !process.env.CI,
  stdout: "pipe",
  stderr: "pipe",
  env: { RAILS_ENV: "test", E2E_STUBS: "1", E2E_UPLOAD_ROOT: "public" },
},
globalTeardown: require.resolve("./global-teardown.js"),
```

⚠️ `reuseExistingServer: true` es una trampa aquí: si el desarrollador ya tenía un
`rails s -e test` levantado **sin** `E2E_STUBS=1`, Playwright lo reutiliza y la suite intenta salir
a internet. Mitigación obligatoria: `global-setup.js` (paquete 01) hace `GET /` y aborta la corrida
con un mensaje explícito si el header de respuesta `X-E2E-Stubs` no viene en `on`. Ese header lo
agrega el mismo initializer con un `ActionDispatch` middleware de dos líneas, dentro del bloque
guardado. **Sin este chequeo, el modo "a mí me pasa" es indistinguible del modo real.**

---

### Bloque C — Almacenamiento de comprobantes en E2E

**Tarea 14 — Raíz de CarrierWave para E2E: fijar `E2E_UPLOAD_ROOT`, no editar el initializer.**

🔴 **La edición de `config/initializers/carrierwave.rb` queda RETIRADA de este paquete por
auditoría** (corrección 10). Dueño único de ese archivo —**incluido el bloque que lee
`E2E_UPLOAD_ROOT`**— es el **paquete 03** (§7.2, §4.8). Este paquete **solo fija la variable** en
su corrida (`E2E_UPLOAD_ROOT=public` en `webServer.env`, Tarea 13) y la declara como dependencia.

Por qué existe esa variable, para que nadie la quite: con la configuración de test del initializer
(`config.root = Rails.root.join("tmp")`), el archivo se guarda en `tmp/uploads/...` pero la URL que
emite CarrierWave es `/uploads/...`, que Rails sirve desde `public/` ⇒ **la descarga del escenario 4
daría 404**. Con `E2E_UPLOAD_ROOT=public` el paquete 03 conmuta la raíz a `Rails.root.join("public")`.

Consecuencias, todas atendidas y **todas dentro del alcance de este paquete**:
- Los E2E dejan archivos en `public/uploads/report_expense/receipt_file/<id>/`.
- `git ls-files public/uploads/report_expense` devuelve **0** hoy (verificado) ⇒ se puede ignorar
  ese subárbol sin afectar los 78 archivos trackeados de `customer_invoice`, `sales_order` y `user`.
- `.gitignore` recibe `/public/uploads/report_expense/`.
- `global-teardown.js` borra el directorio al final de la corrida (criterio de aceptación del
  paquete 01: `git status --porcelain` limpio tras correr la suite).
- Minitest sigue escribiendo en `tmp/` (sin `E2E_UPLOAD_ROOT`), como el paquete 01 previó.

---

### Bloque D — Sesiones de los usuarios sin permisos plenos

**Tarea 15 — `test/e2e/specs/auth-restricted.setup.js`.**

```js
const { test: setup, expect } = require("@playwright/test");

setup("autenticar usuario restringido", async ({ page }) => {
  await page.goto("/users/sign_in");
  await page.fill("#user_email", "e2e-limitado@controlmatica.test");
  await page.fill("#user_password", "e2e-password-123");
  await page.click('input[value="Ingresar"]');
  await expect(page).not.toHaveURL(/sign_in/);
  await page.context().storageState({ path: "./.auth/storageState-restricted.json" });
});

// Corrección 3: sesión del encargo del paquete 09 (E7.9-E7.11 de accounting.spec.js).
setup("autenticar contable sin aprobar ni exportar", async ({ page }) => {
  await page.goto("/users/sign_in");
  await page.fill("#user_email", "e2e-contab@controlmatica.test");
  await page.fill("#user_password", "e2e-password-123");
  await page.click('input[value="Ingresar"]');
  await expect(page).not.toHaveURL(/sign_in/);
  await page.context().storageState({ path: "./.auth/storageState-contab.json" });
});
```

Los dos van en el **mismo archivo** a propósito: así el proyecto `setup-restricted` de la Tarea 16
los cubre con su `testMatch` actual y no hace falta un tercer proyecto.

**Tarea 16 — Proyectos en `playwright.config.js`.**

```js
projects: [
  { name: "setup",            testMatch: /auth\.setup\.js/ },
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
```

⚠️ El `testMatch: /.*\.setup\.js/` genérico del paquete 01 hay que **cerrarlo** a `auth.setup.js`, o
el proyecto `setup` ejecuta también el restringido y sobrescribe el `storageState` equivocado.
`workers: 1` y `fullyParallel: false` se mantienen.

---

### Bloque E — Helper del formulario de gasto (una sola vez, para los 6 specs que lo usan)

**Tarea 17 — `test/e2e/support/expenseForm.js`.**

Encapsula tres trampas verificadas en el código real
(`app/javascript/packs/ReportExpenseIndex.js:364-376, 577-763`):

1. Los 4 `react-select` usan `menuPortalTarget: document.body` ⇒ las opciones viven **fuera** del
   modal. Búsquedas siempre en `page`, nunca en el locator del modal.
2. El select de centro no consulta hasta **3 caracteres** y tiene **debounce de 300 ms** contra
   `GET /search_cost_centers?q=...&exclude_finalized=true`. Hay que esperar la respuesta.
3. Valor e IVA son `NumberFormat` con `prefix="$"` y `thousandSeparator`; el Total es
   `disabled` y lo calcula el componente ⇒ **nunca se escribe**.

```js
async function elegirCentro(page, code) {
  // §7.6: el paquete 08 envuelve el react-select del centro en un div con este testid.
  const input = page.getByTestId("expense-cost-center-select").locator("input").first();
  await input.click();
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/search_cost_centers") && r.status() === 200),
    input.type(code.slice(0, 6), { delay: 40 }),   // >3 caracteres, respeta el debounce
  ]);
  await page.getByText(code, { exact: false }).first().click();   // page, NO modal
}

async function elegirSelect(page, testid, label) {
  await page.getByTestId(testid).click();
  await page.getByText(label, { exact: true }).first().click();
}

async function llenarGasto(page, a) {
  if (a.invoice_name)   await page.fill('input[name="invoice_name"]', a.invoice_name);
  if (a.invoice_date)   await page.fill('input[name="invoice_date"]', a.invoice_date);
  if (a.identification) await page.fill('input[name="identification"]', a.identification);
  if (a.invoice_number) await page.fill('input[name="invoice_number"]', a.invoice_number);
  if (a.invoice_value)  await page.fill('input[name="invoice_value"]', String(a.invoice_value));
  if (a.invoice_tax)    await page.fill('input[name="invoice_tax"]', String(a.invoice_tax));
  if (a.description)    await page.fill('textarea[name="description"]', a.description);
}

async function guardarGasto(page) {
  const [res] = await Promise.all([
    page.waitForResponse((r) => /\/report_expenses(\/\d+)?$/.test(new URL(r.url()).pathname)
                             && ["POST", "PATCH"].includes(r.request().method())),
    page.locator(".cm-btn-submit").click(),
  ]);
  return res.json();
}
```

`guardarGasto` **devuelve el JSON de la respuesta**. Varios escenarios afirman sobre
`register.budget_status`, `register.receipt_file.url` o `register.exchange_rate` — mucho más estable
que leer un badge y menos frágil que consultar la BD.

---

### Bloque F — Los specs

Tareas 18 a 24: una por archivo. El contenido concreto de cada escenario está en la sección
"Pruebas E2E (Playwright)" — es el cuerpo del paquete y no se repite aquí.

⚠️ **`accounting.spec.js` se escribe COMPLETO en este paquete** (corrección 2): no es un `describe`
que se agrega a un archivo ajeno. Los siete specs funcionales son de este paquete y de nadie más
(§7.2).

**Tarea 25 — Scripts de `test/e2e/package.json`.**

```json
"test:budget":      "playwright test specs/budget.spec.js",
"test:receipt":     "playwright test specs/receipt.spec.js",
"test:ai":          "playwright test specs/ai-capture.spec.js",
"test:currency":    "playwright test specs/currency.spec.js",
"test:accounting":  "playwright test specs/accounting.spec.js",
"test:permissions": "playwright test specs/permissions.spec.js",
"test:pagination":  "playwright test specs/pagination.spec.js"
```

**Tarea 26 — `test/e2e/README.md`.** Agregar: tabla spec → escenario → centro de costo → paquete del
que depende; cómo funcionan los stubs; y la advertencia de `reuseExistingServer`.

---

## Contrato de `data-testid` (lo que este paquete EXIGE a los demás)

Ningún selector de esta suite depende de texto traducible ni de clases internas de `CmDataTable`,
salvo los cuatro que el propio componente ya expone (`.cm-dt-per-page select`, `.cm-dt-page-btn`,
`.cm-dt-page-info`, `.cm-dt-footer`) y que están verificados en
`app/javascript/generalcomponents/ui/CmDataTable.jsx:355-395`.

🔴 **TABLA DEROGADA POR LA AUDITORÍA — NO USAR LOS NOMBRES DE ESTA SECCIÓN.**

La tabla que estaba aquí no coincidía con lo que emiten los paquetes dueños y **ningún spec habría
encontrado un selector**. La **fuente única y vigente es `00-ARQUITECTURA.md` §7.6**, cuyos
nombres son los que producen los paquetes **08** (pestaña Presupuesto, los dos formularios de
gasto, comprobante, moneda, extracción, previsualización) y **09** (columnas, filtros, pantalla de
Contabilidad, menú).

La tabla de traducción `nombre viejo → nombre canónico`, que hay que aplicar a **todos los
selectores de todos los specs de este documento**, está en el bloque
"🔴 CORRECCIONES DE AUDITORÍA" del inicio de este archivo, punto 1.

Regla que **sí** se conserva: si un paquete dueño necesita otro nombre, actualiza **§7.6 y el
spec en el mismo PR**; no se aceptan selectores por texto ni por clase interna como reemplazo.

✅ **`accounting-filter-cost-center` YA está en §7.6, con dueño 09** (cierre de la reauditoría).
Es el select de centro de costo del panel de filtros de Contabilidad, que **E7.1, E7.2 y E7.7**
necesitan para acotarse a `CM-E2E-ACC-2026`; era el único hueco conocido del contrato y ahora está
en la fila "Contabilidad" junto al resto de los `accounting-filter-*`, con la instrucción de
envolver el `react-select` en un `<div data-testid>` escrita en la Tarea 14 del 09. **No queda
ningún testid que estos specs usen y §7.6 no declare.**

⚠️ Recordatorio de la arquitectura §4.5: el formulario de gasto está **duplicado** en
`components/ReportExpense/FormCreate.jsx` y en `renderModal()` de `packs/ReportExpenseIndex.js`.
Todo `data-testid` de esa lista va **dos veces**. Los escenarios 2, 3, 5 y 6 usan el índice; el 4
usa la pestaña del centro. Es a propósito: así una sola suite cubre los dos formularios.

---

## Aislamiento entre escenarios

Cuatro capas, todas obligatorias:

1. **Un centro de costo por spec.** Ningún spec lee ni escribe fuera de su `CM-E2E-<SLUG>-2026`.
   Todos los filtros de tabla arrancan filtrando por ese centro. Consecuencia: el orden de ejecución
   de los archivos es irrelevante y un fallo no contamina a los demás.
2. **`workers: 1`, `fullyParallel: false`** (heredado del paquete 01, no negociable mientras
   `ReportExpense.search` defina scopes de clase en runtime — invariante #6 de la arquitectura).
   Dentro de cada archivo, `test.describe.configure({ mode: "serial" })` en los que encadenan estado
   (budget, receipt, ai-capture, accounting); los demás son independientes.
3. **`reseedE2E(SCOPE)` en `test.beforeAll` de cada spec que muta datos.** Firma nueva:
   `reseedE2E(scope = "ALL")` ejecuta `E2E_SCOPE=<scope> bin/rails runner db/seeds/e2e.rb`.
   Cuesta ~6 s de boot de Rails por llamada; con 5 specs son 30 s, aceptable frente a la alternativa
   (fallos intermitentes). Los specs que **solo leen** (`permissions`, `pagination`) no resiembran.
4. **`clearStubCalls()` en `beforeAll`** de los specs que afirman sobre `stub_calls.log`
   (ai-capture, currency).

Aislamiento respecto al desarrollador: el seed nunca sale de los 7 centros `CM-E2E-*` ni de los
correos `*@controlmatica.test`. Un `git grep` de `destroy_all` / `delete_all` sin `where` en
`db/seeds/e2e.rb` es criterio de rechazo.

---

## Pruebas unitarias (Minitest)

Dos archivos. No duplican lógica de negocio (eso vive en los paquetes dueños): protegen **la
infraestructura de este paquete**, que es lo único que no tiene otra red de seguridad.

### `test/integration/e2e_seed_test.rb` — 7 casos

Todos envueltos en `as_user(users(:admin)) { ... }` y ejecutando el seed con
`load Rails.root.join("db/seeds/e2e.rb")`.

| Test | Aserción |
|---|---|
| `test "el seed e2e es idempotente y no duplica registros"` | Ejecutarlo **dos veces**; `CostCenter.where("code LIKE 'CM-E2E-%'").count == 7`, `User.where("email LIKE '%@controlmatica.test'").count == 6`, `ReportExpense.where(cost_center_id: <PAG>).count == 57` en ambas corridas. |
| `test "el seed e2e no toca datos fuera de su alcance"` | Contar `CostCenter.where.not("code LIKE 'CM-E2E-%'").count`, `User.where.not("email LIKE '%@controlmatica.test'").count` y `ReportExpense.count` de fixtures **antes y después**; los tres números no cambian. Este es el test que impide que alguien meta un `delete_all` en el seed. |
| `test "el seed e2e fija los codigos de centro pese al callback create_code"` | `CostCenter.find_by(code: "CM-E2E-PAG-2026")` no es nil para los 7 códigos. Cubre la trampa de `before_create :create_code`. |
| `test "el seed e2e deja 12 gastos de contabilidad con los estados exactos"` | En el centro `ACC`: 8 `aprobado`, 3 `sin_presupuesto`, 1 `excedido`; los 12 con `accounting_approved == false`; el `excedido` con `budget_reason` no vacío. |
| `test "el seed e2e crea el rol Limitado E2E sin permisos de Presupuesto ni Contabilidad"` | `Rol.find_by(name: "Limitado E2E")` existe; `rol.accion_modules.joins(:module_control).where(module_controls: { name: ["Presupuesto", "Contabilidad"] }).count == 0`; y `rol.name != "Administrador"`. |
| `test "el seed e2e crea el rol Contable E2E que entra a Contabilidad pero no aprueba ni exporta"` (corrección 3) | `Rol.find_by(name: "Contable E2E")` existe; tiene **exactamente 1** acción del módulo `Contabilidad` y es `Ingreso al modulo`; **cero** acciones de `Presupuesto`; y `rol.name != "Administrador"`. Sin esto, E7.9 y E7.10 pasarían por la razón equivocada. |
| `test "el seed e2e exporta seed-ids.json con todas las claves"` | El archivo existe; `JSON.parse` tiene `users`, `cost_centers`, `budgets`, `expenses`; `expenses["PAG"].length == 57`; `expenses["ACC"].length == 12`; todos los valores son `Integer` positivos. |

Caso de fallo cubierto: si `E2E_SCOPE` trae un valor desconocido (`E2E_SCOPE=NOEXISTE`), el seed
debe **abortar con `abort`** y no escribir nada. Se prueba con
`assert_raises(SystemExit) { ... }` en el mismo archivo (octavo caso si se prefiere separarlo).

### `test/models/e2e_stubs_test.rb` — 7 casos

El initializer no se carga en la suite de Minitest (no hay `E2E_STUBS`), así que estos tests hacen
`load Rails.root.join("config/initializers/e2e_stubs.rb")` con `ENV["E2E_STUBS"] = "1"` en `setup` y
lo restauran en `teardown`. **Este es el test más valioso del paquete**: un stub que se desincroniza
del servicio real produce 36 E2E verdes que no prueban nada.

| Test | Aserción |
|---|---|
| `test "el initializer de stubs aborta si E2E_STUBS esta activo fuera de test"` | Con `Rails.env` forzado a `"production"` (`Rails.stub(:env, ActiveSupport::StringInquirer.new("production")) { ... }`), `assert_raises(RuntimeError) { load ... }`. |
| `test "el initializer de stubs no se carga sin el flag"` | Con `ENV["E2E_STUBS"] = nil`, tras `load`, `refute ExchangeRateService.singleton_class.ancestors.map(&:to_s).any? { \|m\| m.include?("E2eStubs") }`. |
| `test "el stub de tasas conserva la firma del metodo real"` | `ExchangeRateService.method(:fetch_remote).parameters` es igual **antes y después** del `prepend`. Detecta el día en que Multimoneda cambie la firma. |
| `test "el stub de tasas devuelve el mismo tipo de Result que el real"` | El objeto devuelto responde a `ok?`, `value` y `error`, y su clase es la misma constante `Result` que declara `ExchangeRateService`. |
| `test "el stub de tasas devuelve el habil anterior para un sabado"` | `fetch_remote(currency: "USD", date: Date.new(2026,6,13)).value[:rate_date] == Date.new(2026,6,12)` y `rate_to_cop == BigDecimal("4310.0")`. |
| `test "el stub de tasas falla sin excepcion para una fecha sin tasa"` | `r = fetch_remote(currency: "USD", date: Date.new(2026,1,1))`; `refute r.ok?`; `assert_equal "sin_tasa", r.error`; **no** lanza excepción. |
| `test "el stub de extraccion registra la llamada en stub_calls.log"` | Tras una llamada, la última línea del log parsea como JSON con `service == "ReceiptExtractionService"`. Y para `currency: "COP"` de tasas, el log **no** crece (COP no consulta nada). |

Además, un caso borde explícito: `test "el stub de extraccion devuelve vacio para un archivo desconocido"`
→ `call_vision_model(payload_de("otro.pdf"))` devuelve el hash vacío que el servicio real
traduce al mensaje de error, y **no** lanza. (`payload_de` arma el `payload` de §6.7 con ese nombre
de archivo; la forma del payload la fija el paquete 10.)

**Total Minitest de este paquete: 14 casos** (7 + 7; el `SystemExit` va como aserción dentro del
primer archivo).

---

## Pruebas E2E (Playwright)

Convenciones de toda la suite:
- `baseURL` `http://127.0.0.1:3001`. **Cero helpers `*_url` de Rails** (`config/routes.rb:100` fija
  `default_url_options host: "controlmatica.herokuapp.com"` — un `*_url` en un test es una petición
  a producción).
- Toda mutación se espera con `page.waitForResponse`, nunca con `waitForTimeout`.
- Los ids salen de `seedIds.js`, nunca hardcodeados.
- Los importes se comparan como número: `aNumero(await loc.textContent())`, para no depender del
  separador de miles.

---

### `budget.spec.js` — Escenarios 1, 2 y 3 · centro `CM-E2E-BUD-2026` · `mode: "serial"` · 6 tests

`beforeAll`: `reseedE2E("BUD")`. Viáticos del centro: **5.000.000**. Cero partidas al empezar.

#### E1.1 — `test "el dueño del centro crea una partida para Ana y el tablero la refleja"`

```js
await page.goto(`/cost_centers/${cc("BUD")}`);
await page.getByTestId("budget-tab").click();
await expect(page.getByTestId("budget-panel")).toBeVisible();
await expect(page.getByTestId("budget-summary-viatic")).toContainText("5.000.000");
await expect(page.getByTestId("budget-summary-assigned")).toContainText("0");

await page.getByTestId("budget-new-btn").click();
await elegirSelect(page, "budget-user-select", "Ana E2E");        // react-select: se busca en page
await page.fill('[data-testid="budget-amount"]', "3000000");
await page.fill('[data-testid="budget-notes"]', "Viaticos Ana semana 1");
const [res] = await Promise.all([
  page.waitForResponse((r) => r.url().endsWith("/expense_budgets") && r.request().method() === "POST"),
  page.getByTestId("budget-submit").click(),
]);
const body = await res.json();
expect(body.type).toBe("success");
```

Aserciones: `budget-summary-assigned` → `3.000.000`; `budget-summary-unassigned` → `2.000.000`;
existe `budget-row-<body.register.id>`; `budget-available-<id>` → `3.000.000` (nada gastado aún).

#### E1.2 — `test "crea una segunda partida para Bruno y el disponible del centro baja"`

Igual, `1.500.000` para "Bruno E2E". Aserciones: `assigned` → `4.500.000`,
`unassigned` → **`500.000`**, y `getByTestId("cm-datatable-row")` dentro de `budget-panel` → 2 filas.

#### E1.3 — `test "la tercera partida se bloquea por exceder el valor de viaticos y el sistema dice cuanto queda"`

Intento de `1.000.000` para "Carla E2E" (total sería 5.500.000 > 5.000.000).

```js
const [res] = await Promise.all([
  page.waitForResponse((r) => r.url().endsWith("/expense_budgets")),
  page.getByTestId("budget-submit").click(),
]);
const body = await res.json();
expect(body.type).toBe("error");
expect(body.message[0]).toContain("supera el valor de viáticos");
expect(body.message[0]).toContain("500.000");            // disponible para asignar

await expect(page.getByTestId("budget-server-error")).toBeVisible();
await expect(page.getByTestId("budget-server-error")).toContainText("500.000");
await expect(page.getByTestId("budget-summary-assigned")).toContainText("4.500.000");  // NO cambió
await expect(page.locator('[data-testid^="budget-row-"]')).toHaveCount(2);             // sigue en 2
```

Las tres últimas líneas son la parte que de verdad importa: no basta con ver el mensaje, hay que
comprobar que **nada se guardó**.

#### E2 — `test "un gasto que cabe en la partida queda aprobado automaticamente"`

Se registra desde el índice de gastos, como responsable **Ana** (el `owner` tiene permiso
`Gastos / Cambiar responsable`), por `1.000.000`, contra `CM-E2E-BUD-2026`.

```js
await page.goto("/report_expenses");
await page.getByTestId("expense-new").click();
await elegirCentro(page, "CM-E2E-BUD-2026");
await elegirSelect(page, "expense-user-select", "Ana E2E");
await llenarGasto(page, { invoice_name: "Hotel Ana", invoice_date: "2026-06-15",
                          identification: "900111222", invoice_number: "FE-E2E-BUD-001",
                          invoice_value: 1000000, invoice_tax: 190000 });
await expect(page.getByTestId("expense-budget-warning")).toContainText("3.000.000");  // disponible en vivo
const data = await guardarGasto(page);
expect(data.register.budget_status).toBe("aprobado");
expect(data.register.budget_reason == null || data.register.budget_reason === "").toBeTruthy();
```

Y en la tabla, tras el `loadData` que dispara el componente:
`expect(page.getByTestId(\`expense-budget-status-${data.register.id}\`)).toContainText("Aprobado")`.
Vuelta a la pestaña Presupuesto: `budget-available-<id_partida_ana>` → `2.000.000`
(3.000.000 − 1.000.000, sin IVA, por §2.6.1).

#### E3 — `test "un gasto que se pasa del disponible se guarda igual pero queda excedido con el motivo visible"`

Segundo gasto de Ana por `2.500.000` (disponible: 2.000.000 ⇒ se pasa por 500.000).

```js
const data = await guardarGasto(page);
expect(data.register.budget_status).toBe("excedido");
expect(data.register.budget_reason).toContain("500.000");
expect(data.register.id).toBeGreaterThan(0);                 // SE GUARDO
```

En la tabla: `expense-budget-status-<id>` contiene `"Excedido"` **y** contiene
`"Excede el presupuesto"`. En la pestaña Presupuesto, `budget-available-<id_partida_ana>` sigue en
`2.000.000` — los `excedido` no consumen cupo (§2.6.3). Esta última aserción es la que detecta la
regresión más cara del proyecto.

---

### `receipt.spec.js` — Escenario 4 · centro `CM-E2E-REC-2026` · `mode: "serial"` · 4 tests

`beforeAll`: `reseedE2E("REC")`. Se opera desde **la pestaña de gastos del centro de costos**
(`components/ReportExpense/FormCreate.jsx`), no desde el índice: así la suite cubre el otro
formulario duplicado.

#### E4.1 — `test "adjunta un comprobante PDF al crear el gasto y queda asociado"`

```js
await page.goto(`/cost_centers/${cc("REC")}`);
await page.locator(".cm-tab-btn", { hasText: "Gastos" }).click();
await page.getByTestId("expense-new").click();
await llenarGasto(page, { invoice_name: "Taxi E2E", invoice_date: "2026-06-16",
                          invoice_number: "FE-E2E-REC-002", invoice_value: 30000, invoice_tax: 0 });
await page.setInputFiles('[data-testid="expense-receipt-input"]',
                         path.join(RAILS_ROOT, "test/fixtures/files/comprobante.pdf"));
const data = await guardarGasto(page);
expect(data.register.receipt_file).not.toBeNull();
expect(data.register.receipt_file.url).toContain("comprobante.pdf");
```

Aserción extra de contrato multipart: la petición capturada tiene
`request().headers()["content-type"]` que **empieza por `multipart/form-data; boundary=`**. Si
alguien revierte el cambio a JSON, este test lo detecta aunque el gasto se cree igual.

#### E4.2 — `test "el comprobante se previsualiza sin salir de la pantalla"`

Click en `expense-receipt-preview-<id>` → `receipt-preview-modal` visible → el modal contiene un
`iframe`/`embed`/`object` cuyo `src` termina en `.pdf` y coincide con `register.receipt_file.url`.

#### E4.3 — `test "el comprobante se descarga desde la tabla"`

```js
const [download] = await Promise.all([
  page.waitForEvent("download"),
  page.getByTestId(`expense-receipt-link-${id}`).click(),
]);
expect(download.suggestedFilename()).toBe("comprobante.pdf");
const stream = await download.createReadStream();
// el PDF minimo del paquete 01 empieza por "%PDF-"
expect(buffer.slice(0, 5).toString()).toBe("%PDF-");
```

🔴 **El fallback a `page.waitForEvent("popup")` queda RETIRADO por auditoría** (corrección 4, §7.8).
La decisión ya está tomada y es vinculante: el paquete 06 añade
`response-content-disposition=attachment` a la URL firmada de `download_receipt` con el nombre
original del archivo, y en la corrida E2E (storage `:file`, `E2E_UPLOAD_ROOT=public`) el controller
devuelve la misma cabecera vía `send_file ... disposition: "attachment"`. **E4.3 se escribe con
`page.waitForEvent("download")` y verifica los bytes `%PDF-`**, sin bifurcación.

#### E4.4 — `test "un archivo con extension prohibida es rechazado y el gasto no se crea"`

`setInputFiles` con `test/fixtures/files/malicioso.exe`; `guardarGasto` devuelve
`type === "error"` y `message` menciona la extensión; `ReportExpense` con
`invoice_number: "FE-E2E-REC-003"` **no aparece** en la tabla tras recargar.

---

### `ai-capture.spec.js` — Escenario 5 · centro `CM-E2E-REC-2026` · `mode: "serial"` · 3 tests

`beforeAll`: `reseedE2E("REC")` + `clearStubCalls()`.

#### E5.1 — `test "la IA precarga los campos del comprobante y la persona corrige uno antes de guardar"`

```js
await page.goto("/report_expenses");
await page.getByTestId("expense-new").click();
await elegirCentro(page, "CM-E2E-REC-2026");
await page.setInputFiles('[data-testid="expense-receipt-input"]',
                         path.join(RAILS_ROOT, "test/fixtures/files/comprobante_ia.jpg"));

const [res] = await Promise.all([
  page.waitForResponse((r) => r.url().includes("/extract_receipt/report_expenses")),
  page.getByTestId("expense-extract-btn").click(),
]);
expect((await res.json()).type).toBe("success");

// 1) La IA precargo los campos, con los valores EXACTOS del stub
await expect(page.locator('input[name="invoice_name"]')).toHaveValue("HOTEL DANN CARLTON E2E");
await expect(page.locator('input[name="identification"]')).toHaveValue("900123456");
await expect(page.locator('input[name="invoice_number"]')).toHaveValue("FE-E2E-IA-001");
await expect(page.locator('input[name="invoice_date"]')).toHaveValue("2026-06-15");
await expect(page.locator('input[name="invoice_value"]')).toHaveValue("$250,000");

// 2) La persona CORRIGE un campo
await page.fill('input[name="invoice_number"]', "FE-E2E-IA-999");

// 3) Guarda
const data = await guardarGasto(page);
expect(data.register.invoice_number).toBe("FE-E2E-IA-999");    // gano la correccion humana
expect(data.register.invoice_name).toBe("HOTEL DANN CARLTON E2E"); // lo demas sobrevivio
expect(data.register.receipt_file).not.toBeNull();             // el archivo quedo adjunto
```

Ese último `expect` es deliberado: el error clásico de esta pantalla es que la extracción consuma el
`input[type=file]` y el gasto se guarde sin comprobante.

#### E5.2 — `test "la extraccion no sale a internet: la llamada la atendio el stub"`

```js
const call = lastStubCall("ReceiptExtractionService");
expect(call).not.toBeNull();
expect(call.method).toBe("call_vision_model");
expect(call.args.filename).toBe("comprobante_ia.jpg");
```

Este es el test que hace verificable la promesa "no se le pega a servicios externos".

#### E5.3 — `test "si la IA no puede leer el comprobante el registro manual sigue funcionando"`

Subir `comprobante_ilegible.png` → la respuesta es `{ type: "error" }`;
`expense-extract-done` muestra el mensaje "Complete los datos manualmente"; **los inputs quedan
vacíos** (`toHaveValue("")` en `invoice_name` y `invoice_number`, no con basura inventada); se llena
todo a mano y `guardarGasto` devuelve `type: "success"`. Una extracción fallida nunca bloquea.

---

### `currency.spec.js` — Escenario 6 · centro `CM-E2E-FX-2026` · 3 tests

`beforeAll`: `reseedE2E("FX")` + `clearStubCalls()`.

#### E6.1 — `test "un gasto en dolares trae la tasa de la fecha y calcula los pesos"`

```js
await elegirCentro(page, "CM-E2E-FX-2026");
await page.fill('input[name="invoice_date"]', "2026-06-15");
const [rate] = await Promise.all([
  page.waitForResponse((r) => r.url().includes("/get_exchange_rate")),
  elegirSelect(page, "expense-currency-select", "USD — Dólar"),
]);
const rb = await rate.json();
expect(rb.type).toBe("success");
expect(rb.rate_to_cop).toBe("4321.500000");
expect(rb.rate_date).toBe("2026-06-15");

await expect(page.getByTestId("expense-rate")).toHaveValue("4321.5");
await page.fill('[data-testid="expense-foreign-value"]', "120");
await page.fill('[data-testid="expense-foreign-tax"]', "22.80");

// 120 * 4321.5 = 518580.00 ; 22.80 * 4321.5 = 98530.20
await expect(page.locator('input[name="invoice_value"]')).toHaveValue("$518,580");
await expect(page.locator('input[name="invoice_tax"]')).toHaveValue("$98,530.2");

const data = await guardarGasto(page);
expect(data.register.currency).toBe("USD");
expect(data.register.foreign_value).toBe("120.0");
expect(Number(data.register.invoice_value)).toBeCloseTo(518580.0, 2);
expect(data.register.exchange_rate_source).toBe("trm_oficial");
```

Y la prueba de que no salió tráfico: `lastStubCall("ExchangeRateService").args.currency === "USD"`.

#### E6.2 — `test "para una fecha de fin de semana el sistema avisa que usa el habil anterior"`

Fecha `2026-06-13` (sábado). La respuesta trae `requested_date: "2026-06-13"` y
`rate_date: "2026-06-12"`; `expense-rate-shifted` es visible y contiene `"12/06/2026"` (o
`"2026-06-12"`, según formato del paquete de Multimoneda — el spec afirma con un regex que acepte
ambos y lo documenta como tal); `expense-rate` → `4310`.

#### E6.3 — `test "sin tasa disponible el sistema no inventa un valor y permite capturarla a mano"`

Fecha `2026-01-01`. Respuesta `type: "error"` con el mensaje "Ingrésela manualmente";
`expense-rate` queda **vacío** (`toHaveValue("")`), no en `0` ni en la tasa de otra
fecha. Se escribe `4000` a mano, se pone `foreign_value: 100`, se guarda, y
`data.register.exchange_rate_source === "manual"` con `invoice_value == 400000.0`.

---

### `accounting.spec.js` — Escenario 7 · centro `CM-E2E-ACC-2026` · **archivo completo de este paquete** · 11 tests

🔴 **Dueño único: paquete 12** (§7.2, corrección 2). El archivo **no se extiende, se escribe
entero**. La nota derogada *"este paquete NO reescribe `accounting.spec.js` del paquete 09, le
agrega un describe"* ya no aplica: el 09 borró sus specs y su única obligación E2E es emitir los
`data-testid` de §7.6.

Contenido del archivo, en tres `describe`, `mode: "serial"`, `beforeAll` con `reseedE2E("ACC")`:

| `describe` | Tests | Origen |
|---|---|---|
| `"Contabilidad — bandeja, aprobacion masiva y guarda de filtros (paquete 12)"` | E7.1–E7.3 | Escenario 7 del brief de este paquete |
| `"Contabilidad — flujo canonico y seleccion multiple"` | E7.4–E7.8 | Los **5** escenarios que describía el paquete 09, absorbidos (corrección 2) |
| `"Contabilidad — negativos de permisos y de render"` | E7.9–E7.11 | Los **3** escenarios negativos que el 09 **encarga** (corrección 3) |

#### E7.1 — `test "la bandeja de contabilidad no muestra los gastos excedidos"`

```js
await page.goto("/accounting_expenses");
await expect(page.getByTestId("accounting-page")).toBeVisible();
await page.getByTestId("accounting-filter-toggle").click();
await elegirSelect(page, "accounting-filter-cost-center", "CM-E2E-ACC-2026");
const [res] = await Promise.all([
  page.waitForResponse((r) => r.url().includes("/get_accounting_expenses") && r.status() === 200),
  page.getByTestId("accounting-filter-apply").click(),
]);
const body = await res.json();
expect(body.total).toBe(11);                                  // 12 sembrados - 1 excedido
expect(body.data.every((e) => e.budget_status !== "excedido")).toBeTruthy();
await expect(page.getByTestId(`accounting-ref-${expense("ACC_EXCEDIDO")}`)).toHaveCount(0);
```

Refuerzo por búsqueda directa: escribir `FE-E2E-ACC-012` en `.cm-dt-search-input` + Enter → la tabla
queda vacía (`.cm-dt-empty` visible). Que no aparezca en la primera página no prueba que esté
excluido; que no aparezca buscándolo por su número, sí.

#### E7.2 — `test "aprueba en masa el filtro y los aprobados salen de la bandeja de pendientes"`

Con el filtro por centro `ACC` **y** `accounting-filter-approved = "false"` aplicados:

```js
const [req, res] = await Promise.all([
  page.waitForRequest((r) => r.url().includes("/update_accounting_filter_values")),
  page.waitForResponse((r) => r.url().includes("/update_accounting_filter_values")),
  page.getByTestId("accounting-approve-filter").click().then(() => page.locator(".swal2-confirm").click()),
]);
expect(req.method()).toBe("PATCH");
const body = await res.json();
expect(body.type).toBe("success");
expect(body.count).toBe(11);
await expect(page.locator(".swal2-title")).toContainText("11");
```

Y la mitad que de verdad falla en integración: tras el refresco automático de la tabla,
`page.getByTestId("cm-datatable-row")` dentro de la bandeja → **0 filas** y `.cm-dt-empty` visible;
al cambiar `accounting-filter-approved` a `"true"` y aplicar, vuelven las 11 y
`accounting-status-<primer_id>` contiene `"Aprobado"` y `"E2E"` (quién aprobó).

Y la regla de negocio del §2.3: el `excedido` **sigue sin aprobar** —
`page.request.get('/get_accounting_expenses?...&accounting_approved=true')` no lo devuelve, y un
`PATCH /update_accounting_state/<ACC_EXCEDIDO>/true` responde
`{ type: "error", message: ["No se puede aprobar contablemente un gasto que excede el presupuesto"] }`.

#### E7.3 — `test "la aprobacion masiva sin ningun filtro se rechaza y no toca la base"`

Llamada por API con la sesión del navegador (sin pasar por la UI, porque la UI esconde el botón):

```js
const before = await page.request.get(`/get_accounting_expenses?cost_center_id=${cc("ACC")}&accounting_approved=true`);
const antes = (await before.json()).total;

const r = await page.request.patch("/update_accounting_filter_values", { data: {} });
expect(r.status()).toBe(200);
expect((await r.json()).type).toBe("error");
expect((await r.json()).message[0]).toContain("al menos un filtro");

const after = await page.request.get(`/get_accounting_expenses?cost_center_id=${cc("ACC")}&accounting_approved=true`);
expect((await after.json()).total).toBe(antes);
```

Corrige explícitamente el patrón de `report_expenses_controller.rb:155-178` (que hoy aprueba la
tabla entera con el body vacío). Es el test más barato de la suite y el que evita el incidente más
caro.

#### E7.4 a E7.8 — los 5 escenarios absorbidos del paquete 09

`describe "Contabilidad — flujo canonico y seleccion multiple"`. Son los 5 que el paquete 09
describía y que la auditoría trasladó a este archivo (corrección 2). Superficies, todas de §7.6 y
todas emitidas por el 09:

| # | Test | Anclas |
|---|---|---|
| E7.4 | `test "aprobar un gasto desde la bandeja lo saca de la lista de pendientes"` — es el **flujo canónico 5** de `00-ARQUITECTURA.md` §5.2. | `accounting-row-menu-{id}` → `accounting-approve-{id}`; `PATCH /update_accounting_state/:id/true`; con `accounting-filter-approved = "false"` aplicado, la fila desaparece y `accounting-status-{id}` pasa a "Aprobado" al filtrar por `"true"`. |
| E7.5 | `test "desaprobar un gasto lo devuelve a pendientes"` | `accounting-unapprove-{id}`; `PATCH /update_accounting_state/:id/false`; la fila vuelve a la bandeja de pendientes. |
| E7.6 | `test "la aprobacion masiva por seleccion manda un solo request con ids[]"` — es la **D1 del 09**: una sola request con `ids[]`, no una por fila. | `cm-dt-select-{id}` / `cm-dt-select-all`, `accounting-selection-bar`, `accounting-selection-count`, `accounting-approve-selected`; se cuenta con `page.on("request")` que salió **exactamente una** petición. |
| E7.7 | `test "los filtros de la bandeja se aplican y se limpian sin recargar la pagina"` | `accounting-filter-toggle`, `accounting-filter-approved`, `accounting-filter-apply`, `accounting-filter-clear`; cada aplicación dispara `GET /get_accounting_expenses` con los parámetros en la query. |
| E7.8 | `test "la exportacion a Excel arrastra los filtros aplicados"` | `accounting-export`; la URL de `GET /download_file/accounting_expenses/:type` (C.5) contiene los mismos parámetros que el último `get_accounting_expenses`. |

⚠️ **Traspaso pendiente.** El detalle escenario a escenario de estos 5 vivía en el documento del
paquete 09, que los retiró al perder la propiedad. Lo de arriba está reconstruido contra §5.2
(flujo canónico 5), §7.6 (los `accounting-*` que el 09 debe emitir) y la D1 del 09. Si el traspaso
del 09 aporta el detalle original, se ajusta el contenido de cada test **sin cambiar el conteo ni
la numeración**.

#### E7.9 a E7.11 — los 3 escenarios negativos que encarga el paquete 09

`describe "Contabilidad — negativos de permisos y de render"`, con
`test.use({ storageState: "./.auth/storageState-contab.json" })` (usuario `contab_limitado`, rol
`Contable E2E`: entra a Contabilidad pero **no** tiene `Aprobar` ni `Exportar`).

Son el encargo de la corrección 3, la mitigación del riesgo de cobertura que el 09 aceptó por
escrito: ~30 de sus 46 criterios son comportamiento puramente de cliente y **no hay runner de JS en
el repo** (§5.5).

| # | Test | Aserciones |
|---|---|---|
| E7.9 | `test "sin permiso de aprobar no hay columna de seleccion ni menu de fila"` (`estados.approve = false`) | `accounting-page` visible y la tabla con datos (control positivo); `page.locator(".cm-dt-select-header")` → `toHaveCount(0)`; `cm-dt-select-all` → `toHaveCount(0)`; `accounting-row-menu-{id}` → `toHaveCount(0)`; `accounting-approve-selected` y `accounting-approve-filter` → `toHaveCount(0)`. |
| E7.10 | `test "sin permiso de exportar no aparece el enlace de exportacion"` (`estados.export = false`) | `accounting-export` → `toHaveCount(0)`, con la tabla renderizada igual (control positivo sobre `accounting-ref-{id}`). |
| E7.11 | `test "una respuesta 403 deja la tabla vacia y muestra el mensaje correcto"` | `page.route("**/get_accounting_expenses*", r => r.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ type: "error", message: ["No tiene permiso para realizar esta acción"] }) }))`; la tabla queda vacía (`.cm-dt-empty` visible, `cm-datatable-row` → 0) y el mensaje "No tiene permiso para realizar esta acción" es visible. **Única excepción autorizada a "`page.route()` no sirve"** (Tarea 8): aquí no se intercepta tráfico saliente de Rails, sino la respuesta del propio servidor al navegador, que es justo lo que `page.route()` sí puede hacer. |

---

### `permissions.spec.js` — Escenario 8 · proyecto `chromium-restricted` · 5 tests

Sesión: `e2e-limitado@controlmatica.test`, rol `Limitado E2E` (**no** `Administrador` — si lo fuera,
`layouts/user.html.erb:163` y `is_admin?` le darían todo y el spec sería un falso verde).
No resiembra: solo lee.

| # | Test | Aserciones |
|---|---|---|
| 8.1 | `test "un usuario sin permiso de presupuesto no ve la pestaña Presupuesto"` | `page.goto('/cost_centers/' + cc("PERM"))`; `expect(page.getByTestId("budget-tab")).toHaveCount(0)`; y control positivo: `expect(page.locator(".cm-tab-btn", { hasText: "Gastos" })).toBeVisible()` — la página cargó, simplemente no tiene esa pestaña. |
| 8.2 | `test "un usuario sin permiso de presupuesto recibe 403 al listar partidas por URL directa"` | `const r = await page.request.get('/get_expense_budgets/' + cc("PERM"))`; `expect(r.status()).toBe(403)`; `expect((await r.json()).message[0]).toContain("No tiene permiso")`. |
| 8.3 | `test "un usuario sin permiso de presupuesto recibe 403 al crear una partida por API"` | `page.request.post('/expense_budgets', { data: { cost_center_id: cc("PERM"), user_id: user("restringido"), amount: 100000 } })` → 403; y comprobación de efecto: con la sesión del **owner** (`request.newContext({ storageState: './.auth/storageState.json' })`), `GET /get_expense_budgets/<PERM>` sigue devolviendo `total: 1`. Un 403 que igual escribió es peor que no tener el gate. |
| 8.4 | `test "un usuario sin permiso de contabilidad no ve el menu ni entra a la pantalla"` | `expect(page.getByTestId("nav-contabilidad")).toHaveCount(0)`; `page.goto('/accounting_expenses')` → `expect(page).toHaveURL(/\/$/)` (redirect a root por §C.1) y `expect(page.locator(".alert, .toast")).toContainText(/permiso/i)`. 🔴 **Se eliminó `[data-testid='flash']` del selector** (cierre de la reauditoría): ese `data-testid` **no existe en §7.6 y no lo emite ningún paquete**, así que era un nombre inventado fuera de la tabla canónica —dentro de un `OR` no rompía el test, pero violaba la regla igual—. Si algún día hace falta un testid para el flash, se agrega a §7.6 con dueño explícito antes de usarlo. |
| 8.5 | `test "un usuario sin permiso de contabilidad recibe 403 al aprobar un gasto por API"` | `page.request.patch('/update_accounting_state/' + expense("PERM_001") + '/true')` → 403; luego, con la sesión del owner, `GET /get_accounting_expenses?...` muestra ese gasto con `accounting_approved: false`. |

⚠️ El paquete 09 debe emitir `data-testid="nav-contabilidad"` **y** el ítem debe estar condicionado
por `authorization_contabilidad || current_user.rol.name == "Administrador"` siguiendo el patrón del
layout. Si se condiciona solo por rol admin, 8.4 pasa por la razón equivocada.

---

### `pagination.spec.js` — Escenario 9 · centro `CM-E2E-PAG-2026` (57 gastos) · 4 tests

Regresión de la paginación de la tabla de gastos del centro de costos. No resiembra: solo lee.

**Qué se está protegiendo, en términos de código real** (lo hallado al leer el repo, no folclore):

1. `app/javascript/components/ShowConstCenter/ExpensesTable.jsx:22` arranca con
   `meta.per_page: 100`, mientras `packs/ReportExpenseIndex.js:79` arranca con `50` y
   `CmDataTable` cae a **10** si `serverMeta` llega `undefined`
   (`CmDataTable.jsx:221-240`: `if (serverPagination && serverMeta) ... else` → paginación de
   cliente, **sin error visible**). Cualquier fallo del `fetch` que deje `meta` sin actualizar
   convierte la tabla en "solo veo las primeras filas" sin un solo mensaje.
2. `report_expenses_controller.rb:116` usa `per_page: params[:per_page] || 100` **sin `.to_i` y sin
   el tope `.min(100)`** que la arquitectura §3 exige para todos los listados. Un `per_page` que el
   servidor ignore o recorte produce exactamente el síntoma "la tabla muestra N registros y ya".

**Asumido:** el "bug de los 50 registros" es un miembro de esa familia (cliente y servidor en
desacuerdo sobre `per_page`, o caída silenciosa a paginación de cliente). Los 4 tests de abajo no
dependen de cuál fue exactamente: fallan ante cualquiera de los dos y quedan como red permanente.

| # | Test | Aserciones |
|---|---|---|
| 9.1 | `test "la primera pagina trae exactamente per_page filas del servidor, no del cliente"` | Ir a `/cost_centers/<PAG>` → pestaña Gastos → `.cm-dt-per-page select` → `selectOption("50")`. Capturar la respuesta de `/get_cost_center_report_expenses/`: la URL contiene `per_page=50` y `page=1`; `body.data.length === 50`; `body.total === 57`. En el DOM: `getByTestId("cm-datatable-row")` → **50**; `.cm-dt-info` → `"Mostrando 1 - 50 de 57 registros"`; `.cm-dt-page-info` → `"1 / 2"`. La doble aserción (JSON **y** DOM) es la que distingue "el servidor mandó 57 y el cliente cortó 50" de "el servidor paginó". |
| 9.2 | `test "la segunda pagina trae las 7 restantes y ninguna fila se repite"` | Click en `.cm-dt-page-btn` con texto `›`, esperando la respuesta. URL contiene `page=2&per_page=50`; `body.data.length === 7`; filas en DOM → **7**; `.cm-dt-info` → `"Mostrando 51 - 57 de 57 registros"`. Recolectar los textos de `[data-testid^="expense-ref-"]` de ambas páginas: la unión tiene **57 elementos distintos** (`new Set(...).size === 57`). Esta es la aserción que detecta el off-by-one de página que hace que la 2ª página repita filas de la 1ª. |
| 9.3 | `test "cambiar a 100 por pagina trae los 57 en una sola pagina"` | `selectOption("100")` → URL con `per_page=100&page=1`; `body.data.length === 57`; filas → 57; `.cm-dt-page-info` → `"1 / 1"`; los botones `›` y `»` con `toBeDisabled()`. |
| 9.4 | `test "la busqueda pagina en el servidor y no filtra solo la pagina visible"` | Con `per_page=10`, escribir `FE-E2E-PAG-0` en `.cm-dt-search-input` + Enter. URL contiene `q=FE-E2E-PAG-0` y `page=1`; `body.total === 9` (001..009); filas → 9; `.cm-dt-page-info` → `"1 / 1"`. Detecta la regresión de `CmDataTable.getProcessedData()` filtrando localmente cuando `onSearch` existe (`CmDataTable.jsx:94-110`), que daría 0 o 1 filas según la página. |

⚠️ Los 57 gastos hacen que este spec sea el más lento (≈25 s). Va **último** por nombre de archivo
para que un fallo temprano de otro spec se vea antes.

---

### Resumen de la suite

| Spec | Escenarios del brief | Tests | Centro | Resiembra | Proyecto |
|---|---|---|---|---|---|
| `smoke.spec.js` (paquete 01) | — | 5 | `SMOKE` | no | chromium |
| `budget.spec.js` | 1, 2, 3 | 6 | `BUD` | sí (`BUD`) | chromium |
| `receipt.spec.js` | 4 | 4 | `REC` | sí (`REC`) | chromium |
| `ai-capture.spec.js` | 5 | 3 | `REC` | sí (`REC`) | chromium |
| `currency.spec.js` | 6 | 3 | `FX` | sí (`FX`) | chromium |
| `accounting.spec.js` (**completo**, dueño 12) | 7 | **11** (3 propios + 5 absorbidos del 09 + 3 del encargo) | `ACC` | sí (`ACC`) | chromium (E7.9–E7.11 con `storageState-contab.json`) |
| `permissions.spec.js` | 8 | 5 | `PERM` | no | chromium-restricted |
| `pagination.spec.js` | 9 | 4 | `PAG` | no | chromium |

**Tests E2E que agrega este paquete: 36** (28 propios + 5 absorbidos del paquete 09 + 3 del encargo
del 09). Total de la suite tras este paquete: **41**.

---

## Criterios de aceptación

Cada ítem se marca sí/no sin opinar.

**Infraestructura**
1. `cd test/e2e && npm test` termina con código 0 y **41 passed, 0 failed, 0 skipped** (o con los
   `fixme` declarados y contados, si algún paquete dependiente no está listo).
2. Una **segunda** corrida inmediata de `npm test` vuelve a pasar sin intervención manual.
3. `git status --porcelain` después de una corrida completa está limpio.
4. `git grep -n "_url" test/e2e/specs test/e2e/support` no devuelve ningún helper de ruta de Rails.
5. `git grep -nE "waitForTimeout|sleep\(" test/e2e/specs` devuelve **0 líneas**.
6. `git grep -nE "\b[0-9]{3,}\b" test/e2e/specs | grep -v "2026\|timeout\|per_page\|toHaveCount"`
   no muestra ids de registro hardcodeados: todos vienen de `seedIds.js`.
7. `test/e2e/playwright.config.js` declara `workers: 1` y `fullyParallel: false`.
8. El `package.json` de la **raíz** sigue sin la cadena `playwright` y con `engines.node: "16.x"`.

**Stubs (no se le pega a servicios externos)**
9. `grep -c "E2E_STUBS" config/initializers/e2e_stubs.rb` ≥ 2 (la guarda de flag y la de entorno).
10. `RAILS_ENV=production E2E_STUBS=1 bin/rails runner 'puts 1'` **aborta** con el mensaje
    "E2E_STUBS=1 fuera de RAILS_ENV=test".
11. `RAILS_ENV=test bin/rails runner 'puts ExchangeRateService.singleton_class.ancestors.map(&:to_s).grep(/E2eStubs/).size'`
    imprime `0` (sin el flag, el stub no existe).
12. Tras `npm test`, `tmp/e2e/stub_calls.log` existe y tiene **al menos 5** líneas, todas JSON
    válido, con `service` ∈ {`ExchangeRateService`, `ReceiptExtractionService`}.
13. Ninguna línea del log tiene `currency: "COP"` (COP nunca consulta).
14. La suite completa pasa con el tráfico saliente hacia el proveedor de IA y la fuente de TRM
    bloqueado (verificable con `/etc/hosts` apuntando esos dominios a `127.0.0.2`, o desconectando
    la red tras `npm install`).
15. `bundle exec rails test test/models/e2e_stubs_test.rb` pasa con 0 failures.

**Seed y aislamiento**
16. `bundle exec rails test test/integration/e2e_seed_test.rb` pasa con 0 failures.
17. `git grep -nE "destroy_all|delete_all" db/seeds/e2e.rb` — toda ocurrencia va precedida de un
    `where` acotado a `CM-E2E-*` o a `%@controlmatica.test`. Cero ocurrencias sin `where`.
18. `RAILS_ENV=test bin/rails runner db/seeds/e2e.rb` deja
    `test/e2e/.auth/seed-ids.json` con `expenses.PAG.length == 57` y `expenses.ACC.length == 12`.
19. `E2E_SCOPE=BUD RAILS_ENV=test bin/rails runner db/seeds/e2e.rb` **no** modifica
    `ReportExpense.where(cost_center_id: <id de CM-E2E-01-2026>).count`, que sigue en 2.
20. `git check-ignore test/e2e/.auth/seed-ids.json` devuelve la ruta.

**Comprobantes**
21. `git check-ignore public/uploads/report_expense/` devuelve la ruta, y
    `git ls-files public/uploads | wc -l` sigue siendo **78**.
22. Tras `npm test`, `public/uploads/report_expense/` **no existe** (lo borró el `globalTeardown`).

**Cobertura de los nueve flujos del brief**
23. Existe al menos un test que afirma `body.type === "error"` y `message` con el disponible al
    crear la tercera partida, **y** que el conteo de partidas no cambió. (Flujo 1)
24. Existe al menos un test que afirma `register.budget_status === "aprobado"` tras crear un gasto
    que cabe. (Flujo 2)
25. Existe al menos un test que afirma `register.budget_status === "excedido"`,
    `register.id > 0` y `budget_reason` con el monto excedido. (Flujo 3)
26. Existe al menos un test que descarga el comprobante y verifica los bytes `%PDF-`. (Flujo 4)
27. Existe al menos un test que verifica precarga por IA, corrección humana de **un** campo y
    persistencia de ambos. (Flujo 5)
28. Existe al menos un test que verifica `rate_to_cop === "4321.500000"` y
    `invoice_value ≈ foreign_value * rate`. (Flujo 6)
29. Existe al menos un test que verifica que la bandeja no trae `excedido`, que la aprobación masiva
    devuelve `count: 11` y que la bandeja de pendientes queda vacía. (Flujo 7)
30. Existe al menos un test con `toHaveCount(0)` sobre `budget-tab` y otro con `status() === 403`
    sobre `/get_expense_budgets/:id`, ambos con un usuario cuyo rol **no** es `Administrador`. (Flujo 8)
31. Existen los 4 tests de paginación y el que compara `new Set(ids).size === 57`. (Flujo 9)

**Propiedad de archivos y encargos (correcciones de auditoría)**
32. `test/e2e/specs/accounting.spec.js` lo escribe **este** paquete, completo, y tiene **11 tests**
    en tres `describe`. No existe ningún `describe` de accounting en ningún otro paquete.
    (Corrección 2)
33. Los 3 negativos encargados por el 09 existen y pasan: `toHaveCount(0)` sobre
    `.cm-dt-select-header` y `accounting-row-menu-*` con `estados.approve = false`; `toHaveCount(0)`
    sobre `accounting-export` con `estados.export = false`; y el de la respuesta **403** con la
    tabla vacía y el mensaje correcto. Los tres corren con `storageState-contab.json`, cuyo rol
    `Contable E2E` **no** es `Administrador`. (Corrección 3)
34. El PR de este paquete **no toca** `config/initializers/carrierwave.rb` ni ningún archivo de
    `test/fixtures/files/`: `git diff --name-only <base>..<head>` no los lista.
    (Correcciones 9 y 10)
35. `git grep -n "waitForEvent(\"popup\")" test/e2e` devuelve **0 líneas**: el fallback de descarga
    quedó derogado por §7.8. (Corrección 4)

---

## Riesgos y trampas

| # | Riesgo | Qué pasa si el agente implementa sin cuidado | Mitigación |
|---|---|---|---|
| 1 | **`reuseExistingServer: true` con un server sin `E2E_STUBS`** | Playwright reutiliza el `rails s -e test` que el desarrollador ya tenía y la suite **sale a internet de verdad**: falla en CI, pasa en local, o peor, gasta créditos del proveedor de IA. | Header `X-E2E-Stubs: on` + verificación en `global-setup.js` que aborta la corrida (Tarea 13). No es opcional. |
| 2 | **Probar permisos con un usuario `Administrador`** | `layouts/user.html.erb:163` y `is_admin?` (`report_expenses_controller.rb:342`) chequean `rol.name == "Administrador"` **antes** que los permisos ⇒ el escenario 8 pasaría por accidente y no probaría nada. | Rol `Limitado E2E` dedicado, y aserción explícita en `e2e_seed_test.rb` de que `rol.name != "Administrador"`. |
| 3 | **`CarrierWave root = tmp` en test** | El archivo se guarda en `tmp/uploads/...` pero la URL emitida es `/uploads/...`, que Rails sirve desde `public/` ⇒ la descarga del escenario 4 da **404** y el agente pierde una hora creyendo que el uploader está mal montado. | `E2E_UPLOAD_ROOT=public` en el `webServer.env` (Tarea 13) + `.gitignore` acotado + `globalTeardown`. **El bloque que lee la variable es del paquete 03** (§7.2, corrección 10): si no está, se reclama al 03, no se parchea aquí. |
| 4 | **Ignorar `public/uploads` entero en `.gitignore`** | Hay **78 archivos trackeados** ahí (`customer_invoice`, `sales_order`, `user`); ignorar el directorio los deja en un limbo y el primer `git add -A` de otro los borra del índice. | Ignorar solo `/public/uploads/report_expense/`, que hoy tiene 0 archivos trackeados (verificado). |
| 5 | **`react-select` con `menuPortalTarget: document.body`** | Las opciones se renderizan **fuera** del modal; `modal.getByText(...)` no las encuentra y el test muere con un timeout de 15 s sin pista. | Todo helper de select busca en `page`, encapsulado en `support/expenseForm.js`. Prohibido escribir un `getByText` de opción fuera de ese helper. |
| 6 | **El select de centro de costo con debounce de 300 ms y mínimo de 3 letras** | `fill` + `Enter` inmediato no dispara `GET /search_cost_centers` (`ReportExpenseIndex.js:364-376`) y el formulario se envía sin `cost_center_id` → `handleSubmit` sale por el `if` de validación y **no hay request**: `waitForResponse` se cuelga. | `type()` con `delay` + `Promise.all` con `waitForResponse` (Tarea 17). |
| 7 | **`cache_classes = true` en test** | Se cambia el initializer de stubs o un modelo y el `webServer` reutilizado sigue con el código viejo. "A mí me funciona" garantizado. | Documentado en el README; ante cualquier cambio de Ruby, matar el server o correr con `CI=1`. |
| 8 | **`allow_forgery_protection = false` en test** | Un E2E verde **no valida** CSRF: el paso de JSON a `FormData` con `X-CSRF-Token` puede estar roto en producción con la suite en verde. | Se cubre en nivel 2 (controller), no aquí. Anotado en el README para que nadie asuma cobertura que no existe. |
| 9 | **Memoizar `seed-ids.json`** | Un spec que resiembra en `beforeAll` lee ids viejos; los locators no encuentran nada y el fallo parece un bug de la aplicación. | `seedIds.js` lee el archivo en cada llamada, sin caché (Tarea 7). Está escrito como prohibición explícita. |
| 10 | **Tocar `CM-E2E-01-2026` desde este paquete** | El `smoke.spec.js` del paquete 01 afirma **exactamente 2 filas**; sembrar un gasto más ahí lo pone en rojo y el agente busca el bug en el paquete equivocado. | El reset transaccional excluye el scope `SMOKE` salvo con `E2E_SCOPE=ALL` o `SMOKE`. Criterio de aceptación 19. |
| 11 | **`insert_all` para los 57 gastos de paginación** | Salta `after_create :create_create_register` ⇒ el seed es más rápido pero deja el sistema en un estado que nunca ocurre en producción, y de paso oculta que los callbacks revientan sin `User.current`. | Creación una por una con `User.current` seteado. Prohibido `insert_all` en el seed. |
| 12 | **Stub del servicio completo en vez del borde de red** | 36 tests verdes que no ejecutan ni el controller ni `evaluate!` ni el serializer. El peor resultado posible: confianza sin cobertura. | `prepend` sobre **un solo método de salida** por servicio (`fetch_remote`, `call_vision_model`), con test de contrato de firma (`e2e_stubs_test.rb`). |
| 13 | **Stub que elige respuesta por variable de entorno** | Cada payload nuevo exige reiniciar el `webServer` (90 s con `cache_classes`), y dos specs que necesitan payloads distintos se vuelven incompatibles en la misma corrida. | El stub es función pura de sus argumentos: nombre de archivo para IA, `(currency, date)` para tasas. |
| 14 | **Afirmar el importe leyendo el badge formateado** | `"$1.000.000"` vs `"$1,000,000"` vs `"1000000"` según locale y `NumberFormat`; el test se rompe con un cambio cosmético. | `aNumero()` de `support/money.js` normaliza; y donde se puede, se afirma sobre el **JSON de la respuesta**, no sobre el DOM. |
| 15 | **`testMatch: /.*\.setup\.js/` sin cerrar** | El proyecto `setup` ejecuta también `auth-restricted.setup.js` y sobrescribe `storageState.json` con la sesión restringida ⇒ **toda la suite** corre como usuario limitado y falla en cascada de forma incomprensible. | `testMatch: /auth\.setup\.js/` exacto (Tarea 16). Es la trampa más difícil de diagnosticar de este paquete. |
| 16 | ~~**`waitForEvent("download")` contra un ancla sin `download`**~~ **RESUELTO por auditoría (§7.8, corrección 4).** | — | El paquete 06 añade `response-content-disposition=attachment` a la URL firmada de `download_receipt` y, en E2E, `send_file ... disposition: "attachment"`. E4.3 usa `waitForEvent("download")` sin fallback. Ya no hay nada que decidir. |
| 17 | **`budget_status` sembrado con `update` normal** | Los strong params no lo permiten y `evaluate!` lo recalcularía: los 12 gastos de contabilidad quedarían todos en `sin_presupuesto` y E7.1 afirmaría `total: 12` en vez de 11. | `update_column` explícito y comentado en el seed (Tarea 5). |
| 18 | **57 gastos con `per_page` sin tope en el servidor** | `report_expenses_controller.rb:116` acepta `per_page=100000`; un spec descuidado que pida todo de una vez oculta justo el bug que 9.1 busca. | Los specs de paginación piden 50, 100 y 10 — nunca un número que anule la paginación. |

---

## Discrepancias con la arquitectura

### D1 — La arquitectura fija "exactamente cinco flujos" E2E; este paquete deja 41 tests

🔴 **Resuelta por la auditoría**: §5.2 (nivel 3) ya fue **actualizada** y ahora dice "Nueve flujos,
un solo dueño", con el paquete 12 como dueño único de todos los specs funcionales. Se conserva el
razonamiento de costo porque sigue siendo la justificación del número.

`00-ARQUITECTURA.md` §5.2 decía originalmente que el E2E se limitaba a cinco flujos "porque cada uno
cuesta minutos de ejecución y mantenimiento". El brief de este paquete pide **nueve** escenarios y
la suite resultante son 41 tests (36 de este paquete + 5 del smoke del paquete 01).

**No es una contradicción real, pero hay que decirlo en voz alta.** El costo dominante de un E2E en
este proyecto no es el test: es levantar el `webServer` (hasta 180 s la primera vez, por los 29
packs de webpacker) y el `storageState`. Ambos se pagan **una vez por corrida**, no por test. Los 41
tests comparten los dos. El costo marginal real es el `reseedE2E` (~6 s × 5 specs) más el tiempo de
navegador (~2–4 s por test) ⇒ estimado de suite completa: **5 a 8 minutos**.

Los cinco flujos de §5.2 siguen ahí, uno a uno: (1) y (2) → `budget.spec.js` E1.1–E1.3; (3) →
E2 y E3; (4) → `receipt.spec.js`; (5) → `accounting.spec.js`. Lo que se agrega —IA, moneda,
permisos, paginación— son los cuatro que §5.2 no contemplaba antes de la auditoría. **`00-ARQUITECTURA.md`
§5.2 ya quedó actualizado en ese sentido** ("Nueve flujos, un solo dueño"); este documento no
propone ningún cambio adicional.

### D2 — Ownership de `accounting.spec.js` — **RESUELTA por la auditoría**

🔴 La resolución anterior de este documento (*"este paquete NO reescribe ese archivo, le agrega un
`describe`"*) **queda derogada** (corrección 2, §7.2). Los paquetes 05, 06, 08 y 09 borraron sus
specs E2E; **el dueño único de `test/e2e/specs/*.spec.js` funcionales es el paquete 12**. Ya no hay
colisión de nombre de archivo que negociar: `accounting.spec.js` —igual que `receipt.spec.js`— lo
escribe este paquete, completo.

Consecuencia práctica, ya reflejada en el cuerpo: el archivo tiene **11 tests** = los 3 propios del
escenario 7 (exclusión de `excedido`, masiva **por filtro**, guarda de "sin filtros") + los **5**
escenarios que describía el 09 (entre ellos el flujo canónico 5 y la masiva por selección de
`ids[]`, su D1) + los **3** negativos que el 09 encarga (corrección 3). No queda ningún comentario
del tipo `// El paquete 09 agrega aqui su describe`.

### D3 — El brief dice "ve solo aprobados"; la arquitectura dice `budget_status <> 'excedido'`

El brief del escenario 7 dice que contabilidad "ve solo aprobados". La arquitectura §2.3 es
explícita y razonada en sentido distinto: la bandeja lista `aprobado` **y** `sin_presupuesto`,
excluyendo solo `excedido`, porque filtrar por `aprobado` estricto dejaría fuera todos los gastos
históricos y vaciaría la pantalla vendida al cliente.

**Se sigue la arquitectura.** El escenario se implementa como "no muestra los excedidos" y el seed
`ACC` incluye a propósito 3 gastos `sin_presupuesto` que **sí** deben aparecer (por eso el total
esperado es 11 y no 8). Si se hubiera seguido la literalidad del brief, el test afirmaría `total: 8`
y quedaría enfrentado con el paquete de Contabilidad backend.

### D4 — El "bug de los 50 registros" no está documentado en ninguna parte del repo

Se buscó en `docs/INTERNO-PLAN-TECNICO-GASTOS-IA.md`, en la propuesta, en `00-ARQUITECTURA.md`, en
`INFORME_MODERNIZACION.md` y en el historial de git: **no hay ninguna descripción del defecto**. Lo
que sí existe en el código son dos causas plausibles y verificables, documentadas arriba en el
spec 9: el desacuerdo cliente/servidor sobre `per_page` (`ExpensesTable.jsx:22` = 100,
`ReportExpenseIndex.js:79` = 50, `CmDataTable.jsx:15` = 10) y la ausencia del tope
`[(params[:per_page] || N).to_i, 100].min` en `report_expenses_controller.rb:116`, que la
arquitectura §3 exige para todos los listados.

**Asumido:** los cuatro tests de `pagination.spec.js` se escriben como regresión de la **familia**
de defectos, no de un defecto concreto, afirmando simultáneamente sobre el JSON de la respuesta y
sobre el DOM. Si el agente que implemente el paquete encuentra el reporte original del bug y resulta
ser otro, **agrega un quinto test**; no reemplaza estos cuatro.

### D5 — Se toca un archivo fuera de `test/`

`config/initializers/e2e_stubs.rb` vive en `config/`, no en `test/`. La arquitectura §4.1 no prevé
esta ubicación. Se justifica porque **es la única forma de interceptar tráfico saliente de un
proceso Rails separado** sin agregar WebMock (prohibido por la convención 6 del paquete 01) y sin
contaminar los servicios reales con condicionales de entorno. El archivo tiene doble guarda, aborta
el boot si se activa fuera de test, y no se carga en absoluto sin `E2E_STUBS=1`.

🔴 **La "segunda excepción menor" queda RETIRADA** (corrección 10): este paquete **no** extiende
`config/initializers/carrierwave.rb`. El bloque `if Rails.env.test?` con `config.root` condicionada
a `E2E_UPLOAD_ROOT` es del **paquete 03**, dueño único del archivo (§7.2, §4.8). Este paquete solo
fija la variable en su corrida y la declara como dependencia; sin ese bloque del 03, el escenario 4
es imposible y se reclama al 03, no se parchea aquí.

---

## Decisiones asumidas (resumen)

- **Decidido, ya no asumido (corrección 5, §6.7):** los stubs se implementan con `prepend` sobre el
  `singleton_class` del servicio, reemplazando **un solo método de salida** por servicio, con estos
  nombres y firmas exactos y no otros: **`ExchangeRateService.fetch_remote(currency:, date:)`** y
  **`ReceiptExtractionService.call_vision_model(payload)`**. La frase *"si esos paquetes nombran el
  método de otra forma, se ajusta el nombre"* **queda derogada**: el 05 elimina su inyección por
  parámetro `client:` y su privado `resolve_remote`, y el 10 elimina su seam de atributo de clase
  `api_client=`. Regla que se conserva: **un método, el del borde de red, y ninguno más**.
- **Asumido:** el stub elige respuesta por el nombre del archivo subido (IA) y por `(currency, date)`
  (tasas). Cero variables de entorno de selección.
- **Asumido:** las llamadas stubeadas se registran en `tmp/e2e/stub_calls.log`, una línea JSON por
  llamada, y los specs lo leen desde Node. Es la evidencia de que no salió tráfico externo.
- **Asumido:** siete centros de costo E2E (`CM-E2E-{01,BUD,REC,FX,ACC,PERM,PAG}-2026`), uno por
  spec, como mecanismo primario de aislamiento.
- **Asumido:** seis usuarios `*@controlmatica.test` y tres roles nuevos (`Ingeniero E2E`,
  `Limitado E2E` y `Contable E2E`, este último exigido por el encargo del 09), ninguno llamado
  `Administrador`.
- **Asumido:** 57 gastos en el centro de paginación (no 50 ni 100) para forzar dos páginas
  desparejas con `per_page = 50`.
- **Asumido:** los 12 gastos de contabilidad se siembran con `update_column(:budget_status, ...)`,
  única excepción a "el servicio escribe el estado", y comentada como tal en el seed.
- **Asumido:** `E2E_UPLOAD_ROOT=public` solo para la corrida de Playwright; Minitest sigue
  escribiendo en `tmp/`. El bloque que **lee** la variable lo escribe el paquete 03, dueño único de
  `config/initializers/carrierwave.rb` (corrección 10).
- **Asumido:** `.gitignore` recibe `/public/uploads/report_expense/` y `/tmp/e2e`, nunca
  `/public/uploads` entero.
- **Decidido, ya no asumido (corrección 1):** los nombres de `data-testid` son los de la **tabla
  canónica `00-ARQUITECTURA.md` §7.6**, producidos por los paquetes 08 y 09. La tabla que este
  documento traía quedó derogada. El paquete dueño puede renombrar un testid, pero actualiza **§7.6
  y el spec en el mismo PR**.
- **Asumido:** `permissions.spec.js` corre en un proyecto Playwright aparte
  (`chromium-restricted`) con su propio `storageState`, en vez de `test.use()` por describe: así el
  reporte separa visualmente los fallos de permisos de los funcionales.
- **Asumido:** los specs que solo leen (`permissions`, `pagination`) no llaman `reseedE2E`, para
  ahorrar ~12 s por corrida.
- **Asumido:** si un paquete dependiente no está listo, su spec se marca `test.fixme()` con el
  motivo en el título; nunca se comenta ni se borra.

---

## Objeciones a la auditoría

Ninguna corrección se revoca. De los tres puntos que quedaron abiertos, **la reauditoría cerró el
primero** y añadió un cuarto que este documento venía marcando como el único hueco del contrato.

1. ✅ **Propiedad de `db/seeds/e2e.rb`: CERRADA. El archivo lo escribe el 01; la especificación es
   de este paquete.** §7.2 asignaba `db/seeds/e2e.rb` al **01** mientras la corrección 2 decía que
   este paquete aporta "sus seeds acotados", y sin esos seeds (7 centros, 6 usuarios, 3 roles,
   57 + 12 gastos, `seed-ids.json`) ningún spec tendría datos. **Resolución escrita en §7.2:** la
   fila dice ahora *"`db/seeds/e2e.rb` + `seed-ids.json` → **01**: el 01 escribe el archivo y todo
   su contenido siguiendo la especificación de las Tareas 1–6, 13, 16, 25 y 26 del paquete 12, que
   es quien la redacta; se coordinan en el mismo PR; el 12 no escribe el archivo"*. Con eso "un
   archivo, un dueño" y "sus seeds acotados" dejan de contradecirse: **lo acotado es la
   especificación, no el archivo.** Las Tareas 1–6, 13, 16, 25 y 26 se conservan tal cual, con el
   dueño anotado en cada fila. Lo único que este paquete escribe por su cuenta en esa capa es
   `config/initializers/e2e_stubs.rb` (§7.2).

2. **El encargo del 09 (corrección 3) no era ejecutable con los roles que este documento tenía.**
   Renderizar con `estados.approve = false` y `estados.export = false` exige una sesión que entre a
   Contabilidad **sin** las acciones `Aprobar` ni `Exportar`. Ni `Ingeniero E2E` ni `Limitado E2E`
   sirven (el segundo ni siquiera entra a la pantalla). Se agregó el usuario `contab_limitado` con
   el rol `Contable E2E` y su `storageState-contab.json`. **No es un cambio de decisión: es lo
   mínimo para que la corrección 3 se pueda escribir.**
3. **El detalle de los 5 escenarios absorbidos del 09 se perdió en el traspaso.** La corrección 2
   ordena incorporarlos, pero el documento del 09 los retiró y no quedó su descripción escenario a
   escenario en ninguna parte del plan. E7.4–E7.8 están reconstruidos contra §5.2 (flujo canónico
   5), §7.6 (los `accounting-*` que el 09 debe emitir) y la D1 del 09. **Si existe el texto
   original, se ajusta el contenido sin cambiar el conteo ni la numeración.**

4. ✅ **`accounting-filter-cost-center`: CERRADO. Lo emite el 09.** Era "el único hueco conocido del
   contrato" que este documento marcaba: los escenarios **E7.1, E7.2 y E7.7** hacen
   `elegirSelect(page, "accounting-filter-cost-center", "CM-E2E-ACC-2026")` para acotar el test al
   centro E2E, la Tarea 14 del 09 definía ese campo como un `react-select` async **sin
   `data-testid`**, y §7.6 no lo listaba: tres tests sin selector. Ahora está en la fila
   **"Contabilidad"** de §7.6 con dueño **09**, y la Tarea 14 del 09 manda envolver el `<Select>` en
   un `<div data-testid="accounting-filter-cost-center">`. Los tres escenarios se escriben tal como
   están.

5. ⚪ **Cobertura declarada, para que nadie la busque aquí.** `expense-accounting-status-{id}`,
   `cm-dt-select-all` y `cm-dt-select-{id}` **no los ejercita ningún spec de este paquete**: la
   reauditoría los documentó en §7.6 como **cubiertos por verificación manual del 09**, no como un
   encargo pendiente para el 12. Y el selector del escenario 8.4 perdió `[data-testid='flash']`:
   ese nombre no existía en §7.6 ni lo emitía nadie.
