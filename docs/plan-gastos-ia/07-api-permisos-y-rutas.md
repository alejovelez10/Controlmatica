# Paquete 07 — Controladores, rutas, serializers y permisos

## 🔴 CORRECCIONES DE AUDITORÍA (vinculantes — leer ANTES que el resto del documento)

> Estas correcciones **mandan sobre cualquier texto de este archivo** que las contradiga.
> Consolidadas en `00-ARQUITECTURA.md` §7.

1. 🔴 **Numeración canónica (§7.1) — tu tabla de dependencias estaba mal y llevaría a un agente a
   buscar el `ExpenseBudgetService` en el paquete de migraciones.** Lo correcto:
   **01** = infraestructura de pruebas · **02** = migraciones y esquema (**NO crea modelos ni
   servicios**) · **03** = deuda técnica, incluido el refactor de `ReportExpense.search` ·
   **04** = modelo `ExpenseBudget` + `ExpenseBudgetService` · **05** = multimoneda ·
   **06** = comprobante y contabilidad (backend). Este paquete depende de **01, 02, 03, 04, 05 y
   06**, y se cita siempre con número **y nombre de archivo**.
2. 🔴 **TAREA NUEVA (bloqueante, la corrección más importante de la auditoría): cablear
   `ExpenseBudgetService` en `ReportExpensesController`.** Nadie lo hacía: el paquete 04 declaraba
   que "el paquete de API" lo implementa, y este paquete —que ES ese paquete— solo tocaba strong
   params, filtros y un `destroy` que llama a `recalculate_cost_center`. Sin esto **`budget_status`
   nunca se calcula por la vía web**, todos los gastos quedan en `sin_presupuesto`, y el tablero
   del 08, las columnas del 09 y la vista de contabilidad del 06 muestran datos vacíos o falsos.
   Implementar literalmente el bloque "CABLEADO ESPERADO" de la Tarea 15 del paquete 04 (§7.4):
   - **create**: `ExpenseBudgetService.persist_with_evaluation!(expense, actor: current_user)`.
   - **update**: capturar `previous_cost_center_id` y `previous_user_invoice_id` **ANTES** del
     `assign_attributes`, y pasarlos como kwargs.
   - **destroy**: capturar `cost_center_id` y `user_invoice_id` **ANTES** del `destroy`, y llamar
     `on_expense_destroyed!` después; `recalculate_cost_center` sigue **después y fuera** del
     servicio.
   - **Criterio de aceptación nuevo + test de integración**: `POST /report_expenses` en un centro
     con partida vigente y cupo deja `budget_status == "aprobado"`; con cupo insuficiente deja
     `"excedido"` con `budget_reason` no vacío; sin partida, `"sin_presupuesto"`.
3. 🔴 **Firma canónica de `ExpenseBudgetService` (§7.4): este documento consumía una API que no
   existe.** Correcciones obligatorias en todo el texto:
   - Los métodos llevan **bang**: `create_budget!`, `update_budget!`, `destroy_budget!`.
   - Firmas exactas: `create_budget!(cost_center_id:, user_id:, amount:, notes: nil, actor:)` —
     **no** `create_budget(attrs:, actor:)`; `update_budget!(budget, attrs, actor:)` — `attrs`
     **posicional**; `destroy_budget!(budget, actor:)`.
   - `summary_for_center(cost_center_id)` recibe **el id**, no el objeto, y devuelve
     `{cost_center:, totals: {...}, by_user: [...]}` (totales **anidados**).
   - `Result = Struct.new(:ok, :value, :errors, keyword_init: true)` con `ok?`/`error?` en el
     bloque. **No** es posicional y **no** tiene un miembro `:ok?`.
   - `ExpenseBudget` **sí** declara `attr_writer :spent_amount, :available_amount` (ya corregido
     en el paquete 04), así que `preload_amounts!` funciona.
4. 🔴 **Claves canónicas de `@estados` de `CostCentersController#show` (§4.4).** Tu juego de
   nombres dejaba la pestaña Presupuesto **invisible para siempre**, porque el frontend lee otros.
   Las 10 claves son: `budget_module`, `budget_create`, `budget_edit`, `budget_delete`,
   `budget_show_all`, `is_center_owner`, `expense_create`, `expense_edit`, `expense_delete`,
   `expense_show_all`. Quedan **derogados** `budget_view` e `is_cost_center_owner`.
   **Este paquete es el dueño único** de ese método; el 08 y el 06 solo consumen.
5. **Se BORRA la Tarea 21 (`delete_receipt`) y su ruta `DELETE`.** Dueño único de `delete_receipt`
   y `download_receipt`: **paquete 06**, que es el dueño del uploader y de `fog_public` (§7.2).
   Tu implementación (`remove_receipt_file!` + `save`) además salta validaciones y auditoría.
6. **Se BORRA la creación del ítem de menú "Contabilidad", del helper y de la línea de
   `expense_controllers`.** Dueño único: **paquete 09** (§4.4). Nombre único del helper:
   **`authorization_accounting_expenses`** (tu `authorization_accounting` queda derogado). Regla
   de orden: **la ruta (paquete 06) antes que el ítem (paquete 09), sin excepción**.
7. **`lib/tasks/permissions_gastos_ia.rake` y su réplica en `create_config.rake` pasan al paquete
   01** (§7.2). Motivo: rompe el ciclo de dependencias 06 ↔ 07. Este paquete solo **consume** los
   módulos `"Presupuesto"` y `"Contabilidad"` ya creados.
8. **La Tarea 22 se REESCRIBE.** No crea fixtures: el dueño único de `rols.yml`, `users.yml`,
   `module_controls.yml`, `accion_modules.yml`, `customers.yml` y `cost_centers.yml` es el
   **paquete 01** (§7.2). Este paquete **agrega etiquetas** al set existente:
   `presupuesto_pleno` y `presupuesto_limitado` (roles). 🔴 **`dueno_centro` YA NO lo agrega este
   paquete** (cierre de la reauditoría): lo declara el **01** junto con
   `cost_centers(:centro_con_viaticos).user_owner = users(:dueno_centro)`, porque las dos fixtures
   son suyas y tienen que escribirse en la misma ola; aquí solo se **usa**. **No renombra**
   `sin_permisos` (que es `name: "Sin permisos"`, no `"Rol Sin Permisos"`) y **no toca** las
   etiquetas `ingeniero`, `contador`, `gerente` que usan los paquetes 03, 04, 05, 06, 10 y 11.
   🔴 **Y se elimina `test/fixtures/accion_modules_rols.yml` de la lista "A modificar"**: ese
   archivo **no existe y no se crea** — el HABTM va inline en `rols.yml` (decisión del 01).
   Crearlo duplica filas de la tabla puente e invalida el criterio "el rol administrador no tiene
   `accion_modules`" del 01.
9. **La Tarea 19 (strong params) agrega `:cop_manual_override`**, que faltaba. Sin él, el ajuste
   manual del COP que el usuario hace en el formulario **se sobrescribe en silencio en cada save**
   (regla del paquete 05, D2). Test de controller obligatorio: `POST` con
   `cop_manual_override = "1"` respeta el `invoice_value` enviado y no lo recalcula.
10. **Guard de reglas de negocio**: el `business_rules_block!` en `create`/`update` lo aporta el
    **paquete 10** sobre este mismo controller; coordinar el orden de los guards en el PR. El
    mismo control **debe existir también en el camino MCP** (paquete 11, §7.5), o la promesa
    comercial §4.6 queda incumplida.
11. **Se BORRAN los 2 specs E2E de este paquete.** Todos los specs funcionales son del **paquete
    12** (§7.2). Los 95 tests de Minitest se conservan íntegros.

> Documento de trabajo. Ejecutable por un agente autónomo sin hacer preguntas.
> Todo lo que aquí se decide sin respaldo explícito de `00-ARQUITECTURA.md` está marcado
> como **Asumido:**.

---

## Objetivo

Dejar funcionando **toda la capa HTTP** del proyecto de gastos: el `ExpenseBudgetsController` nuevo
con sus 6 endpoints y sus rutas, las acciones nuevas y modificadas de `ReportExpensesController`
(`q`, filtros de moneda / estado presupuestal / aprobación contable, strong params ampliados,
**el cableado de `ExpenseBudgetService` en `create`/`update`/`destroy`**, recálculo del centro al
borrar), los dos serializers (`ExpenseBudgetSerializer` nuevo y `ReportExpenseSerializer`
extendido) y la exposición de permisos en `@estados` de `CostCentersController#show`, más la
autorización especial por `cost_centers.user_owner_id`.

Los módulos de permisos `"Presupuesto"` y `"Contabilidad"` **no se crean aquí**: los instala el
paquete **01** con `lib/tasks/permissions_gastos_ia.rake` (§7.2). Este paquete solo los **consume**.

Al terminar: un usuario con rol sin permisos recibe **403 con cuerpo JSON** en cada endpoint nuevo,
el dueño de un centro puede administrar sus partidas sin ser administrador, y ningún campo escrito
por el servidor (`budget_status`, `accounting_approved`, …) se puede setear desde el body.

---

## Dependencias

Numeración canónica de §7.1. Se cita **número y nombre de archivo**.

| Debe estar terminado antes | Por qué |
|---|---|
| **01 — `01-infraestructura-de-pruebas.md`** (§5.1 de la arquitectura) | Sin él `bin/rails test` no arranca (`chromedriver-helper`), `fixtures :all` tumba la suite con 4 YAML rotos y no existen `Devise::Test::IntegrationHelpers` ni el helper `as_user`. **Todas** las pruebas de este paquete son de controller y necesitan `sign_in`. Además el 01 es el dueño de `lib/tasks/permissions_gastos_ia.rake`: sin esa task no existen los módulos `"Presupuesto"` ni `"Contabilidad"` que este paquete consume, ni las fixtures base. |
| **02 — `02-migraciones-y-esquema.md`** | Este paquete no crea ni una migración. Consume las columnas de `20260401000001`, `20260401000002`, `20260403000001` y `20260404000001`. El 02 **no crea modelos ni servicios**. |
| **03 — `03-deuda-tecnica-bloqueante.md`** (refactor de `ReportExpense.search`) | Invariante #6: los filtros nuevos (`currency`, `budget_status`, `accounting_approved`, `expense_budget_id`) se montan sobre la firma **de hash**. Este paquete **no** agrega un argumento 16 a la firma posicional y **no** re-hace el refactor ni sus 6 call sites. |
| **04 — `04-presupuesto-y-aprobacion.md`** (modelo `ExpenseBudget` + `ExpenseBudgetService`) | Dueño único del modelo y del servicio (§7.2). Este paquete solo los **consume**, con la firma canónica de §7.4. |
| **05 — `05-multimoneda-y-trm.md`** | Los campos `currency`, `foreign_*`, `exchange_rate*` y la regla de `cop_manual_override` (D2) que este paquete expone en el serializer, en los filtros y en los strong params. |
| **06 — `06-comprobante-y-contabilidad.md`** (migración `20260402000001` + `ReceiptUploader` + `mount_uploader :receipt_file`) | Solo para las tareas 15 (atributo `receipt_file` del serializer) y 19 (strong param `:receipt_file`). El resto del paquete es independiente y se puede mergear antes. `delete_receipt` y `download_receipt` son del 06, no de aquí. |

### Lo que este paquete NO hace (es de otros)

- `AccountingExpensesController` completo y sus 5 rutas (Bloque C de §3) — **paquete 06**.
- `ReportExpensesController#extract_receipt` (Bloque D), su ruta, su helper `build_draft` y sus 16
  tests en `test/controllers/report_expenses_extract_receipt_test.rb` — **paquete 10**, y el guard
  `business_rules_block!` de `create`/`update` — también del 10.
  ✅ **Discrepancia 3 CERRADA por la reauditoría.** §7.2 listaba `extract_receipt` bajo el dueño 07
  mientras este documento lo declaraba fuera de alcance y el 10 lo escribía entero: la matriz
  nombraba a un dueño que se declaraba no-dueño. **`extract_receipt` salió de la fila del 07 y
  tiene fila propia en §7.2 con dueño 10**, como excepción documentada al dueño del archivo —el
  mismo tratamiento que `delete_receipt`/`download_receipt` del 06. El 10 la mergea en la ola 3 y
  este paquete (ola 4) **la recibe ya escrita y no la reescribe**. El guard se monta sobre este
  mismo controller: **coordinar el orden de los guards en el PR** (corrección 10). El mismo control
  debe existir en el camino MCP (paquete 11, §7.5).
- `ReportExpensesController#delete_receipt` y `#download_receipt` + sus rutas — **paquete 06**
  (§7.2), que es el dueño del uploader y de `fog_public`.
- El ítem de menú "Contabilidad", el helper `authorization_accounting_expenses`, la línea de
  `expense_controllers` y el branch de `controller_name_helper` — **paquete 09** (§4.4). Regla de
  orden: **la ruta (06) antes que el ítem (09), sin excepción**.
- `lib/tasks/permissions_gastos_ia.rake` y su réplica en `lib/tasks/create_config.rake` —
  **paquete 01** (§7.2). Aquí solo se consumen los módulos ya creados.
- `ExchangeRatesController#get_exchange_rate` (Bloque E) — depende de `ExchangeRateService`.
- Cualquier componente React, plantilla `.xlsx.axlsx` o `ReportExpense.import`.
- Las tools MCP (Bloque G).
- Todos los specs E2E funcionales (`test/e2e/specs/*.spec.js`) — **paquete 12** (§7.2).

### Contrato que este paquete CONSUME del paquete 04

El controller **no abre transacciones ni locks** (regla de §4.2: el `SELECT … FOR UPDATE` vive en el
servicio, y el controller solo traduce `Result` a JSON). El dueño único de
`app/services/expense_budget_service.rb` es el **paquete 04** (§7.2): **este paquete no crea ni
modifica el servicio**; si al empezar falta un método, se reclama al 04, no se escribe aquí.

Firma canónica (§7.4, copiada **literalmente**; toda variante previa queda derogada):

```ruby
# Result = Struct.new(:ok, :value, :errors, keyword_init: true) do
#   def ok?    = ok
#   def error? = !ok
# end
ExpenseBudgetService.create_budget!(cost_center_id:, user_id:, amount:, notes: nil, actor:)  # => Result
ExpenseBudgetService.update_budget!(budget, attrs, actor:)   # attrs POSICIONAL: {amount:, notes:, active:}
ExpenseBudgetService.destroy_budget!(budget, actor:)         # => Result
ExpenseBudgetService.available_for(cost_center_id:, user_id:, exclude_expense_id: nil)
#   => { has_budget: true/false, assigned: BigDecimal, spent: BigDecimal, available: BigDecimal }
ExpenseBudgetService.summary_for_center(cost_center_id)      # EL ID, no el objeto
#   => { cost_center: {id:, code:, viatic_value:},
#        totals: {viatic_value:, assigned:, unassigned:, spent:, available:},
#        by_user: [{user_id:, user_name:, assigned:, spent:, available:, budgets_count:, exceeded_expenses_count:}] }

# Cableado del gasto (tarea 23) — punto de entrada ÚNICO para guardar un ReportExpense:
ExpenseBudgetService.persist_with_evaluation!(expense, actor:,
                                              previous_cost_center_id: nil,
                                              previous_user_invoice_id: nil)  # => Result
ExpenseBudgetService.on_expense_destroyed!(cost_center_id:, user_id:, actor: nil)  # => Result
```

⚠️ Los tres métodos de CRUD llevan **bang**. `Result` es `keyword_init` y expone `ok?`/`error?` como
métodos del bloque: **no** es posicional y **no** tiene un miembro `:ok?`.

Del modelo `ExpenseBudget` (paquete 04) se consume además:

```ruby
belongs_to :cost_center
belongs_to :user                                  # BENEFICIARIO (ver la excepción de nomenclatura de §1.1)
belongs_to :created_by,        class_name: "User", optional: true
belongs_to :last_user_edited,  class_name: "User", optional: true

attr_writer :spent_amount, :available_amount      # para que el controller precargue y evite N+1
def spent_amount     = @spent_amount     ||= ExpenseBudgetService.available_for(cost_center_id: cost_center_id, user_id: user_id)[:spent]
def available_amount = @available_amount ||= ExpenseBudgetService.available_for(cost_center_id: cost_center_id, user_id: user_id)[:available]
```

---

## Discrepancias con la arquitectura

1. **RESUELTA por la auditoría.** La discrepancia original ("§4.2 lista solo 4 métodos de
   `ExpenseBudgetService` y ninguno sirve como puerta de entrada para crear/editar/borrar una
   partida") ya no existe: **§7.4 fija el contrato completo y canónico** del servicio, con
   `create_budget!`, `update_budget!`, `destroy_budget!`, `summary_for_center`,
   `persist_with_evaluation!` y `on_expense_destroyed!`. El productor es el **paquete 04**; este
   paquete solo consume. `validate_cap!` y `reevaluate_center_user!` quedan como internos del
   servicio.

2. **§3 A.4 (`get_expense_budget_available`) exige solo `authenticate_user!`.** Eso deja que
   cualquier usuario autenticado consulte el presupuesto asignado, gastado y disponible de
   **cualquier otra persona** en **cualquier** centro, iterando `user_id`. La justificación del
   documento (el usuario necesita el dato para registrar su propio gasto) solo cubre el caso
   `user_id == current_user.id`. **No me desvío** — se implementa tal cual lo dice §3 — pero queda
   anotado como hallazgo de seguridad para que el cliente decida. La mitigación de una línea, si se
   aprueba, es: `return deny! unless params[:user_id].to_i == current_user.id || is_admin? ||
   has_menu_permission?("Presupuesto", "Ver todos")`.

3. **§4.1 no lista `test/serializers/`** entre los directorios de test. Este paquete lo crea, porque
   la forma exacta de `receipt_file` (objeto vs `null`) y la ausencia de colisiones atributo/asociación
   son propiedades del serializer, no del controller, y probarlas vía HTTP obliga a montar un gasto
   completo. `bin/rails test` recoge `test/**/*_test.rb`, así que no requiere configuración.

4. **§3 A.3 no dice qué pasa con `totals` cuando el usuario no tiene `"Ver todos"` ni es dueño.**
   **Asumido:** `totals` se devuelve completo (es información del centro de costos, que ese usuario
   ya ve en la pestaña de resumen) y `by_user` se filtra a su propia fila.

5. **§3 no define orden entre el chequeo de permiso de módulo y la existencia del centro de costos.**
   **Asumido:** el orden es (1) permiso de acción del módulo, (2) existencia del centro, (3) propiedad
   del centro. Así un usuario sin permiso recibe 403 y no puede usar el endpoint como oráculo de
   existencia de centros.

---

## Archivos

### A crear

| Ruta | Qué se hace |
|---|---|
| `app/controllers/expense_budgets_controller.rb` | Controller nuevo: `get_expense_budgets`, `get_expense_budget_summary`, `get_expense_budget_available`, `create`, `update`, `destroy` + guards privados. |
| `app/serializers/expense_budget_serializer.rb` | Serializer AMS de partidas con `spent` y `available` precargados. |
| `test/controllers/expense_budgets_controller_test.rb` | 55 casos de controller, incluidos los de permiso denegado. |
| `test/controllers/report_expenses_budget_wiring_test.rb` | 6 casos de integración del cableado presupuestal en `create`/`update`/`destroy` (tarea 23). |
| `test/serializers/report_expense_serializer_test.rb` | Forma del serializer de gasto (campos nuevos, `receipt_file` null, sin colisiones). |
| `test/serializers/expense_budget_serializer_test.rb` | Forma del serializer de partida. |

### A modificar

| Ruta | Qué se hace |
|---|---|
| `config/routes.rb` | 3 rutas sueltas de presupuesto + `resources :expense_budgets`. |
| `app/controllers/report_expenses_controller.rb` | `report_expense_filters` privado, `q` implementado, filtros nuevos, whitelist de orden ampliada, strong params ampliados, **cableado de `ExpenseBudgetService` en `create`/`update`/`destroy`**, `destroy` con `recalculate_cost_center`. |
| `app/serializers/report_expense_serializer.rb` | **DUEÑO ÚNICO del archivo completo** (§7.2, fila nueva del cierre de la reauditoría). 13 atributos nuevos + `belongs_to :accounting_approved_by` + método `receipt_file`. Los 7 de moneda venían del **05** y los 3 contables + el `belongs_to` del **06**: los dos borraron esa fila de su "A modificar" y conservan solo su test de contrato, porque los 13 de aquí son exactamente la unión de su trabajo y el segundo en mergear sobrescribía al primero. |
| `app/controllers/cost_centers_controller.rb` | `show`: las **10 claves canónicas** de `@estados` (§4.4). Dueño único. |
| `test/controllers/report_expenses_controller_test.rb` | Hoy es un stub vacío; se llena con 22 casos. |
| `test/fixtures/rols.yml` | **Agrega** las etiquetas `presupuesto_pleno` y `presupuesto_limitado` (con su HABTM inline). Dueño del archivo: paquete 01. |
| ~~`test/fixtures/users.yml`~~ | **RETIRADA de esta tabla por la reauditoría.** La etiqueta `dueno_centro` la declara el **01** (§7.2), junto con el `user_owner` de `centro_con_viaticos`. Este paquete solo la consume. |
| `test/fixtures/module_controls.yml` | **Consume** las filas `"Gastos"`, `"Presupuesto"` y `"Contabilidad"` del paquete 01; solo agrega si falta alguna acción propia. |
| `test/fixtures/accion_modules.yml` | **Agrega** las acciones que este paquete referencia por nombre y que el 01 no haya definido. |

---

## Tareas

Cada tarea es un commit. El orden es el de ejecución.

### Bloque 1 — Permisos (tareas 1 a 5)

**1. Crear `lib/tasks/permissions_gastos_ia.rake`.**

> **RETIRADA por auditoría.** Dueño único: paquete 01. Ver el bloque de correcciones al inicio.

**2. Replicar los dos bloques en `lib/tasks/create_config.rake`.**

> **RETIRADA por auditoría.** Dueño único: paquete 01. Ver el bloque de correcciones al inicio.

**3. Agregar el helper de autorización en `app/helpers/application_helper.rb`.**

> **RETIRADA por auditoría.** Dueño único: paquete 09. Ver el bloque de correcciones al inicio.

**4. Enganchar el ítem "Contabilidad" al menú lateral en `app/views/layouts/user.html.erb`.**

> **RETIRADA por auditoría.** Dueño único: paquete 09. Ver el bloque de correcciones al inicio.

**5. Agregar los permisos a `@estados` en `CostCentersController#show`**
(`app/controllers/cost_centers_controller.rb:168-185`). **Este paquete es el dueño único de este
método**; el 08 y el 06 solo consumen.

Las **10 claves canónicas** de §4.4, literales (el frontend lee exactamente estos nombres):

```ruby
@estados = @estados.merge(
  budget_module:    is_admin? || has_menu_permission?("Presupuesto", "Ingreso al modulo"),
  budget_create:    is_admin? || has_menu_permission?("Presupuesto", "Crear"),
  budget_edit:      is_admin? || has_menu_permission?("Presupuesto", "Editar"),
  budget_delete:    is_admin? || has_menu_permission?("Presupuesto", "Eliminar"),
  budget_show_all:  is_admin? || has_menu_permission?("Presupuesto", "Ver todos"),
  is_center_owner:  @cost_center.user_owner_id == current_user.id,
  expense_create:   is_admin? || has_menu_permission?("Gastos", "Crear"),
  expense_edit:     is_admin? || has_menu_permission?("Gastos", "Editar"),
  expense_delete:   is_admin? || has_menu_permission?("Gastos", "Eliminar"),
  expense_show_all: is_admin? || has_menu_permission?("Gastos", "Ver todos")
)
```

- Nombres **prohibidos** por ser variantes derogadas: `budget_view`, `is_cost_center_owner`.
  Con ellos la pestaña Presupuesto **nunca aparece**.
- Si `CostCentersController` no tiene `is_admin?`, se agrega el mismo helper privado memoizado de
  `ReportExpensesController#is_admin?` (`:342`). El patrón de lectura de permisos es siempre
  `is_admin? || has_menu_permission?("<Módulo>", "<Acción>")` (§4.4).
- `is_center_owner` es indispensable: sin él el frontend no distingue "puede administrar partidas
  por ser dueño" de "puede por permiso global", y mostraría botones que el servidor rechaza con 403.
- Los cuatro `expense_*` existen para que el 08 pueda borrar el `estados` hardcodeado en `true` de
  `ExpensesTable.jsx:211`. Ese hardcode lo borra el **08**, no este paquete.
- Los flags son cosméticos: el servidor revalida siempre.
- El módulo Presupuesto **no tiene ítem de menú**; vive como pestaña del centro de costos y se
  gobierna por estas claves.

### Bloque 2 — Rutas (tarea 6)

**6. `config/routes.rb`.** Agregar, inmediatamente después de la línea 88
(`get "get_report_expenses", …`), respetando el estilo suelto del archivo:

```ruby
# Presupuesto de viáticos (partidas)
resources :expense_budgets, :except => [:show, :new, :edit, :index]
get "get_expense_budgets/:cost_center_id",        to: "expense_budgets#get_expense_budgets"
get "get_expense_budget_summary/:cost_center_id", to: "expense_budgets#get_expense_budget_summary"
get "get_expense_budget_available",               to: "expense_budgets#get_expense_budget_available"
```

Las rutas `delete_receipt` y `download_receipt` **no se declaran aquí**: son del paquete 06 (§7.2).

Verificación de la tarea: `bin/rails routes | grep expense_budget` lista 6 rutas y ninguna es
`GET /expense_budgets` (el `index` está excluido a propósito: lo reemplaza
`get_expense_budgets/:cost_center_id`).

### Bloque 3 — Serializer de partidas (tarea 7)

**7. Crear `app/serializers/expense_budget_serializer.rb`.**

```ruby
# (bloque `# == Schema Information` de annotate arriba, generado con `bundle exec annotate`)
class ExpenseBudgetSerializer < ActiveModel::Serializer
  attributes :id, :cost_center_id, :user_id, :amount, :notes, :active,
             :spent, :available, :created_at, :updated_at

  belongs_to :user,             serializer: UserSerializer
  belongs_to :created_by,       serializer: UserSerializer
  belongs_to :last_user_edited, serializer: UserSerializer

  def spent     = object.spent_amount
  def available = object.available_amount
end
```

- `UserSerializer` ya expone exactamente `:id, :names` → la salida coincide con §3 A.2 sin trabajo extra.
- **Cero queries dentro del serializer.** `spent_amount`/`available_amount` los precarga el controller
  (tarea 9). El fallback del modelo existe solo para el caso de un objeto suelto (`create`/`update`).
- `amount`, `spent` y `available` son `BigDecimal` ⇒ AMS los serializa como **string** (`"500000.0"`).
  Es lo que dice el contrato; el frontend hace `parseFloat`. No convertir a float aquí.

### Bloque 4 — `ExpenseBudgetsController` (tareas 8 a 14)

**8. Crear el esqueleto del controller con los guards privados.**

```ruby
class ExpenseBudgetsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_expense_budget, only: [:update, :destroy]
  include ApplicationHelper

  private

  # Memoizado, mismo patrón que ReportExpensesController#is_admin? (:342)
  def is_admin?
    @_is_admin ||= current_user.rol.name == "Administrador"
  end

  def budget_permission?(action = "Ingreso al modulo")
    is_admin? || has_menu_permission?("Presupuesto", action)
  end

  # Autorización especial de negocio: el dueño del centro administra sus partidas
  def owner_or_show_all?(cost_center)
    is_admin? ||
      cost_center.user_owner_id == current_user.id ||
      has_menu_permission?("Presupuesto", "Ver todos")
  end

  def deny!(message = "No tiene permiso para realizar esta acción")
    render json: { type: "error", message: [message] }, status: :forbidden
  end

  def validation_error(messages)
    render json: { success: "¡Ocurrió un error!", type: "error", message: Array(messages) }
  end

  def set_expense_budget
    @expense_budget = ExpenseBudget.find(params[:id])
  end

  def page_size(default)
    [[(params[:per_page] || default).to_i, 1].max, 100].min
  end

  def sort_dir
    params[:dir] == "asc" ? "ASC" : "DESC"
  end

  # El frontend manda "$1,000,000" desde NumberFormat; se limpia aquí también por defensa
  def normalized_amount
    raw = params[:amount]
    return nil if raw.nil?
    raw.is_a?(Numeric) ? raw : raw.to_s.gsub(/[$,\s]/, "")
  end

  def expense_budget_params_create
    { cost_center_id: params[:cost_center_id],
      user_id:        params[:user_id],          # BENEFICIARIO. NUNCA current_user.id
      amount:         normalized_amount,
      notes:          params[:notes] }
  end

  def expense_budget_params_update
    { amount: normalized_amount, notes: params[:notes], active: params[:active] }.compact
  end
end
```

⚠️ **`expense_budget_params_create` no lleva `reverse_merge(user_id: current_user.id)`.** Es el error
que la excepción de nomenclatura de §1.1 pide leer dos veces: en esta tabla `user_id` es el
beneficiario y el creador va en `created_by_id`, que lo pone el servicio a partir de `actor:`.

**9. Implementar `get_expense_budgets`.**

```ruby
def get_expense_budgets
  cost_center = CostCenter.find_by(id: params[:cost_center_id])
  return deny! unless budget_permission?
  return validation_error(["El centro de costos no existe"]) if cost_center.nil?

  scope = ExpenseBudget.includes(:user, :created_by, :last_user_edited)
                       .where(cost_center_id: cost_center.id)

  unless is_admin? || has_menu_permission?("Presupuesto", "Ver todos") ||
         cost_center.user_owner_id == current_user.id
    scope = scope.where(user_id: current_user.id)
  end

  scope = scope.where(active: params[:only_active] == "true") if params[:only_active].present?

  needs_user_join = params[:q].present? || params[:sort] == "user_name"
  if needs_user_join
    scope = scope.joins("INNER JOIN users AS beneficiaries ON beneficiaries.id = expense_budgets.user_id")
  end

  if params[:q].present?
    term = "%#{params[:q].to_s.downcase.strip}%"
    scope = scope.where("LOWER(expense_budgets.notes) LIKE :t OR LOWER(beneficiaries.names) LIKE :t", t: term)
  end

  total = scope.count

  scope = if %w[amount created_at updated_at active].include?(params[:sort])
      scope.order(Arel.sql("expense_budgets.#{params[:sort]} #{sort_dir}"))
    elsif params[:sort] == "user_name"
      scope.order(Arel.sql("beneficiaries.names #{sort_dir}"))
    else
      scope.order(created_at: :desc)
    end

  budgets = scope.paginate(page: params[:page], per_page: page_size(50))
  preload_amounts!(budgets)

  render json: {
    data: ActiveModelSerializers::SerializableResource.new(budgets, each_serializer: ExpenseBudgetSerializer),
    total: total
  }
end
```

Y el precargado que evita el N+1 (privado):

```ruby
def preload_amounts!(budgets)
  return if budgets.empty?
  center_ids = budgets.map(&:cost_center_id).uniq
  user_ids   = budgets.map(&:user_id).uniq

  assigned = ExpenseBudget.where(cost_center_id: center_ids, user_id: user_ids, active: true)
                          .group(:cost_center_id, :user_id).sum(:amount)
  spent = ReportExpense.where(cost_center_id: center_ids, user_invoice_id: user_ids)
                       .where.not(budget_status: "excedido")
                       .group(:cost_center_id, :user_invoice_id).sum(:invoice_value)

  budgets.each do |b|
    key = [b.cost_center_id, b.user_id]
    s = (spent[key] || 0).to_d.round(2)                 # invariante #7: float viejo -> .to_d.round(2)
    a = (assigned[key] || 0).to_d.round(2)
    b.spent_amount     = s
    b.available_amount = (a - s)
  end
end
```

Notas obligatorias para quien implemente:
- **El alias `beneficiaries` es indispensable.** `joins(:user)` combinado con
  `includes(:user, :created_by, :last_user_edited)` (tres asociaciones a `users`) hace que Rails
  aliasee las tablas de forma impredecible y `ORDER BY users.names` deja de resolver a lo que se cree.
- El `INNER JOIN` se aplica **una sola vez** (bandera `needs_user_join`); aplicarlo dos veces revienta
  con `table name "beneficiaries" specified more than once`.
- `total` se calcula **antes** de paginar y **después** de aplicar filtros y join.
- `available` es del **par (centro, usuario)**, no de la fila: todas las partidas del mismo par
  muestran el mismo `available`. Es lo que define §2.6 y es intencional.
- Las dos consultas de `preload_amounts!` usan producto cartesiano de ids (traen filas de más) y
  luego indexan por par exacto. Es correcto y son 2 queries fijas, no N.

**10. Implementar `get_expense_budget_summary`.**

```ruby
def get_expense_budget_summary
  cost_center = CostCenter.find_by(id: params[:cost_center_id])
  return deny! unless budget_permission?
  return validation_error(["El centro de costos no existe"]) if cost_center.nil?

  summary = ExpenseBudgetService.summary_for_center(cost_center.id)   # EL ID, no el objeto (§7.4)
  by_user = summary[:by_user]

  unless is_admin? || has_menu_permission?("Presupuesto", "Ver todos") ||
         cost_center.user_owner_id == current_user.id
    by_user = by_user.select { |row| row[:user_id] == current_user.id }
  end

  render json: {
    cost_center: summary[:cost_center],   # {id:, code:, viatic_value:} — lo arma el servicio
    totals:      summary[:totals],        # totales ANIDADOS, no planos
    by_user:     by_user
  }
end
```

**11. Implementar `get_expense_budget_available`.** Único endpoint sin permiso de módulo (§3 A.4).

```ruby
def get_expense_budget_available
  if params[:cost_center_id].blank? || params[:user_id].blank?
    return validation_error(["Debe indicar el centro de costos y el responsable"])
  end

  result = ExpenseBudgetService.available_for(
    cost_center_id:     params[:cost_center_id],
    user_id:            params[:user_id],
    exclude_expense_id: params[:exclude_expense_id].presence
  )

  render json: {
    cost_center_id: params[:cost_center_id].to_i,
    user_id:        params[:user_id].to_i,
    has_budget:     result[:has_budget],
    assigned:       result[:assigned],
    spent:          result[:spent],
    available:      result[:available]
  }
end
```

Con `has_budget: false` los tres montos van en `"0.0"` (los produce el servicio así), nunca en `nil`.

**12. Implementar `create`.**

```ruby
def create
  return deny! unless budget_permission?("Crear")

  cost_center = CostCenter.find_by(id: params[:cost_center_id])
  return validation_error(["El centro de costos no existe"]) if cost_center.nil?
  return deny!("Solo el responsable del centro de costos puede administrar sus partidas") unless owner_or_show_all?(cost_center)

  result = ExpenseBudgetService.create_budget!(**expense_budget_params_create, actor: current_user)

  if result.ok?
    render json: { success: "¡La partida fue creada con exito!", type: "success",
                   register: ActiveModelSerializers::SerializableResource.new(result.value, serializer: ExpenseBudgetSerializer) }
  else
    validation_error(result.errors)
  end
end
```

El orden de los tres guards es el de la discrepancia 5 y **no se altera**.
`create_budget!` recibe **kwargs sueltos** (`cost_center_id:, user_id:, amount:, notes:, actor:`),
por eso el `**` sobre el hash de `expense_budget_params_create`. No existe un parámetro `attrs:`.

**13. Implementar `update`.**

```ruby
def update
  return deny! unless budget_permission?("Editar")
  return deny!("Solo el responsable del centro de costos puede administrar sus partidas") unless owner_or_show_all?(@expense_budget.cost_center)

  result = ExpenseBudgetService.update_budget!(@expense_budget, expense_budget_params_update, actor: current_user)

  if result.ok?
    render json: { success: "¡La partida fue actualizada con exito!", type: "success",
                   register: ActiveModelSerializers::SerializableResource.new(result.value, serializer: ExpenseBudgetSerializer) }
  else
    validation_error(result.errors)
  end
end
```

`attrs` es **posicional** en `update_budget!` (§7.4): no hay `attrs:`.

`cost_center_id` y `user_id` **no aparecen** en `expense_budget_params_update` (§3 A.6): si llegan en
el body se ignoran en silencio. Hay un test explícito de eso.

**14. Implementar `destroy`.**

```ruby
def destroy
  return deny! unless budget_permission?("Eliminar")
  return deny!("Solo el responsable del centro de costos puede administrar sus partidas") unless owner_or_show_all?(@expense_budget.cost_center)

  result = ExpenseBudgetService.destroy_budget!(@expense_budget, actor: current_user)

  if result.ok?
    render json: { success: "¡La partida fue eliminada!", type: "delete" }
  else
    validation_error(result.errors)
  end
end
```

`type: "delete"` (no `"success"`) es lo que dice §3 A.7 y es lo que el frontend usa para sacar la fila
de la tabla sin recargar.

### Bloque 5 — `ReportExpenseSerializer` (tarea 15)

**15. Extender `app/serializers/report_expense_serializer.rb`.**

Lista final de `attributes` (se agregan 13 al final de la línea 40, sin reordenar los existentes):

```ruby
attributes :id, :invoice_name, :invoice_date, :identification, :description, :invoice_number,
           :invoice_type, :payment_type, :invoice_value, :invoice_tax, :invoice_total,
           :cost_center_id, :user_invoice_id, :user_invoice, :type_identification_id,
           :payment_type_id, :updated_at, :is_acepted, :created_at,
           :budget_status, :budget_reason, :expense_budget_id,
           :accounting_approved, :accounting_approved_at,
           :receipt_file, :currency, :foreign_value, :foreign_tax, :foreign_total,
           :exchange_rate, :exchange_rate_date, :exchange_rate_source

belongs_to :accounting_approved_by, serializer: UserSerializer

def receipt_file
  return nil unless object.receipt_file.present?
  { url: object.receipt_file.url }
end
```

Reglas duras:
- **NO se agrega `belongs_to :expense_budget`.** Colisionaría conceptualmente con el atributo
  `expense_budget_id` y el archivo ya arrastra una colisión preexistente
  (`attributes :payment_type` + `belongs_to :payment_type`) que §4.3 prohíbe empeorar. Si la UI
  necesita el nombre de la partida, se resuelve en el paquete de UI con `notes` traído aparte.
- El método `receipt_file` es obligatorio: sin él, CarrierWave serializa `{"url": null}` cuando no hay
  archivo, y el contrato de §B.1 dice `null`.
- `foreign_*` y `exchange_rate` son `BigDecimal` ⇒ salen como string. Correcto, no convertir.
- Regenerar el bloque `# == Schema Information` con `bundle exec annotate` en el mismo commit.

### Bloque 6 — `ReportExpensesController` (tareas 16 a 21)

**16. Extraer `report_expense_filters` y reescribir `get_report_expenses`.**

Privado:

```ruby
def report_expense_filters
  params.permit(:cost_center_id, :user_invoice_id, :invoice_name, :invoice_date, :identification,
                :description, :invoice_number, :type_identification_id, :payment_type_id,
                :invoice_value, :invoice_tax, :invoice_total, :start_date, :end_date, :is_acepted,
                :currency, :budget_status, :accounting_approved, :expense_budget_id)
        .to_h.symbolize_keys.reject { |_k, v| v.blank? }
end

def apply_free_text(scope)
  return scope if params[:q].blank?
  term = "%#{params[:q].to_s.downcase.strip}%"
  scope.where(
    "LOWER(report_expenses.invoice_name) LIKE :t OR LOWER(report_expenses.description) LIKE :t OR " \
    "LOWER(report_expenses.invoice_number) LIKE :t OR LOWER(report_expenses.identification) LIKE :t OR " \
    "CAST(report_expenses.id AS TEXT) LIKE :t",
    t: term
  )
end

EXPENSE_SORT_COLUMNS = %w[id invoice_name invoice_date identification description invoice_number
                          invoice_value invoice_tax invoice_total is_acepted currency
                          budget_status accounting_approved created_at updated_at].freeze
```

En `get_report_expenses`:
- `includes` pasa a `.includes(:cost_center, :user_invoice, :type_identification, :payment_type, :last_user_edited, :user, :accounting_approved_by)`.
- **Se elimina el bloque `has_filters`** (líneas 34-45) y se reemplaza por
  `base_query = base_query.search(report_expense_filters)` incondicional. Tras el refactor del
  paquete 03, `search({})` devuelve `all`; el guard manual era un parche de la firma posicional y
  ahora es una fuente de bugs (cada filtro nuevo había que acordarse de agregarlo a la condición).
- `base_query = apply_free_text(base_query)` justo después.
- La whitelist de orden pasa a `EXPENSE_SORT_COLUMNS`. Los casos `cost_center_code` y
  `user_invoice_name` se mantienen tal cual.
- No se toca el gate `show_all` ni el `where(user_invoice_id: current_user.id)`.

⚠️ `reject { |_k, v| v.blank? }`: los strings `"false"` **no** son blank, así que
`is_acepted=false` y `accounting_approved=false` siguen llegando al filtro. Verificado con un test.

**17. `get_cost_center_report_expenses`.** Mismos cambios: `includes` con
`:accounting_approved_by`, `search(report_expense_filters)`, `apply_free_text` (reemplaza el bloque
`q` de las líneas 91-98 y le agrega `id::text`), y whitelist `EXPENSE_SORT_COLUMNS`. Se conserva el
`per_page` default de 100 y el `where(cost_center_id: params[:id])`.

**18. `download_file`.** Reemplazar las 3 llamadas a `ReportExpense.search(...)` posicionales por
`ReportExpense.search(report_expense_filters)` (y la variante con
`.where(user_invoice_id: current_user.id)`). Sin cambios de permiso: sigue gobernado por
`Gastos / Ver todos`. **No se toca la plantilla axlsx** (es de otro paquete).

**19. Strong params.** En `report_expense_params_create` (línea 352) y
`report_expense_params_update` (línea 356), agregar a la lista de `permit`:

```
:receipt_file, :remove_receipt_file, :currency, :foreign_value, :foreign_tax, :foreign_total,
:exchange_rate, :exchange_rate_date, :exchange_rate_source, :cop_manual_override
```

🔴 **`:receipt_file` y `:remove_receipt_file` son obligatorios y son de ESTE paquete** (cierre de
la reauditoría, §7.2). El paquete 06 los soltó al quedarse solo con `delete_receipt` /
`download_receipt`, y durante un tiempo no los reclamó nadie: sin ellos `POST /report_expenses` con
`multipart/form-data` **no guarda el comprobante** y los criterios 5 y 6 del paquete 06 son
inalcanzables. `remove_receipt_file` es el flag de CarrierWave que permite quitar el archivo desde
el formulario del 08 sin pasar por `delete_receipt`. Test de controller obligatorio: `POST`
multipart con un `comprobante.pdf` deja `report_expense.receipt_file.present?` en `true`.

🔴 **`:cop_manual_override` es obligatorio.** Sin él, el ajuste manual del COP que el usuario hace en
el formulario **se sobrescribe en silencio en cada save** (regla D2 del paquete 05). Test de
controller obligatorio: `POST` con `cop_manual_override = "1"` respeta el `invoice_value` enviado y
no lo recalcula.

**Prohibido agregar**, ni ahora ni nunca: `:budget_status`, `:budget_reason`, `:expense_budget_id`,
`:accounting_approved`, `:accounting_approved_by_id`, `:accounting_approved_at`. Los escribe el
servidor. Hay 6 tests de mass-assignment, uno por campo.

**20. `destroy` de gasto: reevaluar el presupuesto y recalcular el centro.** Corrige el bug
preexistente de §2.7. Es la parte `destroy` del cableado de la tarea 23.

```ruby
def destroy
  cost_center_id  = @report_expense.cost_center_id     # capturar ANTES de destruir
  user_invoice_id = @report_expense.user_invoice_id    # ídem
  if @report_expense.destroy
    ExpenseBudgetService.on_expense_destroyed!(cost_center_id: cost_center_id,
                                               user_id: user_invoice_id,
                                               actor: current_user)
    recalculate_cost_center(cost_center_id, "reportes")   # DESPUÉS y FUERA del servicio
    render :json => { success: "El Registro fue eliminado con exito!", type: "success" }
  end
end
```

Los dos ids se capturan antes porque después del `destroy` el objeto sigue en memoria pero depender
de eso es frágil, y porque `recalculate_cost_center` hace `CostCenter.find(cost)` y reventaría con
`nil`. `recalculate_cost_center` **no** entra al servicio: lee `current_user` (ver Riesgo 4).

**21. Acción `delete_receipt`.**

> **RETIRADA por auditoría.** Dueño único: paquete 06. Ver el bloque de correcciones al inicio.

### Bloque 7 — Fixtures de permisos (tarea 22)

**22. Agregar etiquetas a las fixtures para poder probar los 403.** **Reescrita por la auditoría.**
El **dueño único** de `rols.yml`, `users.yml`, `module_controls.yml`, `accion_modules.yml`,
`customers.yml` y `cost_centers.yml` es el **paquete 01** (§7.2). Este paquete **no crea ningún
archivo de fixtures y no reescribe ninguno**: solo **agrega tres etiquetas** al set existente.

Etiquetas que agrega este paquete:

| Archivo | Etiqueta nueva | Contenido |
|---|---|---|
| `test/fixtures/rols.yml` | `presupuesto_pleno` | Todas las acciones de `"Presupuesto"` **+ `"Ver todos"`**. HABTM **inline** en `rols.yml`. |
| `test/fixtures/rols.yml` | `presupuesto_limitado` | `"Ingreso al modulo"`, `"Crear"`, `"Editar"`, `"Eliminar"`, **SIN `"Ver todos"`**. HABTM inline. |
| ~~`test/fixtures/users.yml`~~ | ~~`dueno_centro`~~ | **RETIRADA por la reauditoría: la escribe el 01.** Especificación que este paquete le entrega al 01: rol `presupuesto_limitado`; mismo patrón de los seis usuarios del 01 (`encrypted_password` con `Devise::Encryptor.digest`, `document_type`, `number_document` propio, `menu: nav-sm`, sin `avatar`); y `cost_centers(:centro_con_viaticos).user_owner: dueno_centro`. |

Reglas duras de esta tarea:

- **`test/fixtures/accion_modules_rols.yml` NO EXISTE y no se crea.** El HABTM va **inline en
  `rols.yml`** (decisión del 01). Crearlo duplica filas de la tabla puente e invalida el criterio
  "el rol administrador no tiene `accion_modules`" del 01.
- **No se renombra `sin_permisos`**: su `name` es `"Sin permisos"` (no `"Rol Sin Permisos"`).
- **No se tocan** las etiquetas `administrador`, `ingeniero`, `contador`, `gerente` ni los usuarios
  `admin`, `ingeniero`, `contador`: las usan los paquetes 03, 04, 05, 06, 10 y 11.
- **No se toca `cost_centers.yml`.** Los tres centros (`centro_con_viaticos` con
  `viatic_value: 5000000.0`, `centro_sin_viaticos` con `viatic_value` nil, `centro_ajeno`) y sus
  `user_owner` los define el 01; aquí solo se consumen. ✅ El desajuste que había entre
  `dueno_centro` y el `user_owner` de `centro_con_viaticos` **está cerrado**: §7.2 fija
  `centro_con_viaticos.user_owner = users(:dueno_centro)` y le da al **01** la declaración de las
  dos mitades. Ver "Objeciones a la auditoría" (punto 2).
- `module_controls.yml` y `accion_modules.yml`: se consumen los módulos `"Gastos"`, `"Presupuesto"`
  y `"Contabilidad"` con sus acciones. Si falta alguna acción que este paquete referencia por
  nombre, se **agrega** una fila con `user: admin` (`belongs_to :user` es requerido); no se
  reescribe el archivo.

Después de esta tarea: `bin/rails test test/models` completo debe seguir en verde (§5.4 punto 1: una
fixture rota tumba toda la suite, no solo su test).

### Bloque 8 — Cableado presupuestal en `ReportExpensesController` (tarea 23)

**23. 🔴 Cablear `ExpenseBudgetService` en `create`, `update` y `destroy`.** **TAREA NUEVA de la
auditoría, bloqueante y la más importante del paquete.** Nadie lo hacía: el 04 declaraba que "el
paquete de API" lo implementa, y este paquete —que ES ese paquete— solo tocaba strong params,
filtros y `destroy`. Sin esto **`budget_status` nunca se calcula por la vía web**, todos los gastos
quedan en `sin_presupuesto`, y el tablero del 08, las columnas del 09 y la vista de contabilidad del
06 muestran datos vacíos o falsos.

Se implementa **literalmente** el bloque "CABLEADO ESPERADO" de §7.4 (Tarea 15 del paquete 04):

```ruby
# create
expense = ReportExpense.new(report_expense_params_create)
result  = ExpenseBudgetService.persist_with_evaluation!(expense, actor: current_user)

# update — capturar ANTES del assign_attributes
prev_cc = @report_expense.cost_center_id
prev_u  = @report_expense.user_invoice_id
@report_expense.assign_attributes(report_expense_params_update)
result  = ExpenseBudgetService.persist_with_evaluation!(
            @report_expense, actor: current_user,
            previous_cost_center_id: prev_cc, previous_user_invoice_id: prev_u)

# destroy — ver tarea 20 (captura de ids + on_expense_destroyed! + recalculate_cost_center después)
```

Reglas duras:

- `persist_with_evaluation!` es el **punto de entrada único** para guardar un gasto: toma el lock,
  evalúa, guarda y reevalúa. El controller **no** llama a `evaluate!` ni hace `save` por su cuenta,
  y **no** abre transacciones ni locks (§4.2).
- Los dos `previous_*` se capturan **antes** del `assign_attributes`; si se leen después ya cambiaron
  y el centro/usuario viejo nunca se reevalúa.
- El guard `business_rules_block!` que el **paquete 10** monta sobre `create`/`update` va **antes**
  de esta llamada (si hay violaciones bloqueantes no se guarda nada). El orden de los guards se
  coordina en el PR con el 10. El mismo control debe existir en el camino MCP (paquete 11, §7.5).
- `recalculate_cost_center` se sigue llamando **después y fuera** del servicio.
- ⚠️ El `create` actual hace `ReportExpense.create(...)` y después `.save` (doble escritura, Riesgo
  9). Al cablear, la creación pasa por `persist_with_evaluation!`; **no se "arregla" el doble save
  en este paquete** más allá de lo que exige el cableado.

Criterio de aceptación de la tarea (nuevo, criterio 27): `POST /report_expenses` en un centro con
partida vigente y cupo deja `budget_status == "aprobado"`; con cupo insuficiente deja `"excedido"`
con `budget_reason` no vacío; sin partida, `"sin_presupuesto"`.

---

## Pruebas unitarias (Minitest)

Todos los tests de controller son `ActionDispatch::IntegrationTest` con
`Devise::Test::IntegrationHelpers` (lo agrega el paquete 01) y envuelven toda escritura en
`as_user(users(:admin)) { ... }`.

### `test/controllers/expense_budgets_controller_test.rb`

`get_expense_budgets`:

| Test | Aserción |
|---|---|
| `test "get_expense_budgets devuelve data y total con la forma del contrato"` | 200; el JSON tiene exactamente las claves `data` y `total`; `data[0]` tiene `id, cost_center_id, user_id, user, amount, notes, active, spent, available, created_by, last_user_edited, created_at, updated_at`; `data[0]["user"].keys == ["id","names"]`. |
| `test "get_expense_budgets sin permiso del modulo responde 403"` | `sign_in users(:sin_permisos)` → `assert_response :forbidden`; body `{"type"=>"error"}` y `message` es un Array con 1 string. |
| `test "get_expense_budgets sin Ver todos y sin ser dueño solo devuelve sus propias partidas"` | `sign_in users(:limitado)` → todos los `data[i]["user_id"] == users(:limitado).id`; y `total` refleja ese conteo, no el del centro. |
| `test "get_expense_budgets siendo dueño del centro sin Ver todos devuelve todas las partidas"` | `sign_in users(:dueno_centro)` sobre `centro_con_viaticos` → aparece la partida de otro usuario. |
| `test "get_expense_budgets con Ver todos devuelve todas las partidas del centro"` | `sign_in users(:pleno)` → mismo conteo que admin. |
| `test "get_expense_budgets tope per_page en 100"` | `per_page=500` → `data.size <= 100`. |
| `test "get_expense_budgets per_page invalido no revienta"` | `per_page=0` y `per_page=abc` → 200 y `data.size >= 1`. |
| `test "get_expense_budgets ordena por user_name sin colisión de alias"` | `sort=user_name&dir=asc` → 200 y `data.map{|r| r["user"]["names"]}` está ordenado ascendente. **Este test existe para atrapar el `ORDER BY users.names` ambiguo.** |
| `test "get_expense_budgets ordena por amount desc por defecto de dir"` | `sort=amount` sin `dir` → primer `amount` es el mayor. |
| `test "get_expense_budgets con sort desconocido cae a created_at desc"` | `sort=drop_table` → 200 (no 500) y el orden es por `created_at` descendente. |
| `test "get_expense_budgets q filtra por notes"` | `q` con un fragmento de `notes` → `total == 1`. |
| `test "get_expense_budgets q filtra por nombre del beneficiario"` | `q` con un fragmento de `users.names` → devuelve solo las de esa persona. |
| `test "get_expense_budgets q y sort user_name juntos no duplican el join"` | `q=x&sort=user_name` → 200 (sin `PG::DuplicateAlias`). |
| `test "get_expense_budgets only_active true excluye inactivas"` | ninguna fila con `active == false`. |
| `test "get_expense_budgets only_active false devuelve solo inactivas"` | todas con `active == false`. |
| `test "get_expense_budgets con centro inexistente responde type error"` | `cost_center_id=999999` → 200 con `type == "error"`. |
| `test "get_expense_budgets no hace una query por fila"` | Suscribirse a `sql.active_record`, contar; con 5 partidas en la respuesta el conteo debe ser `< 15`. Caso de fallo que atrapa: `spent`/`available` resueltos dentro del serializer. |

`get_expense_budget_summary`:

| Test | Aserción |
|---|---|
| `test "get_expense_budget_summary devuelve cost_center totals y by_user"` | 200; claves `cost_center`, `totals`, `by_user`; `totals` tiene `viatic_value, assigned, unassigned, spent, available`. |
| `test "get_expense_budget_summary unassigned es viatic_value menos assigned"` | `totals["unassigned"].to_d == totals["viatic_value"].to_d - totals["assigned"].to_d`. |
| `test "get_expense_budget_summary sin permiso 403"` | `users(:sin_permisos)` → 403. |
| `test "get_expense_budget_summary sin Ver todos filtra by_user a la propia fila"` | `users(:limitado)` → `by_user.size == 1` y `by_user[0]["user_id"] == users(:limitado).id`, pero `totals` sigue completo. |

`get_expense_budget_available`:

| Test | Aserción |
|---|---|
| `test "get_expense_budget_available devuelve has_budget true con montos"` | 200; `has_budget == true`; `assigned`, `spent`, `available` presentes. |
| `test "get_expense_budget_available devuelve has_budget false y ceros"` | par sin partidas → `has_budget == false` y los tres montos `== "0.0"` (**no** `nil`). |
| `test "get_expense_budget_available respeta exclude_expense_id"` | con `exclude_expense_id` del gasto → `available` sube exactamente el `invoice_value` de ese gasto. |
| `test "get_expense_budget_available sin cost_center_id responde type error"` | 200 con `type == "error"` (no 400, no 500). |
| `test "get_expense_budget_available sin user_id responde type error"` | ídem. |
| `test "get_expense_budget_available es accesible sin permisos de Presupuesto"` | `users(:sin_permisos)` → **200**. Documenta la decisión de §3 A.4; si alguien "endurece" el endpoint, este test falla y obliga a revisar el contrato. |
| `test "get_expense_budget_available sin sesion redirige al login"` | sin `sign_in` → `assert_redirected_to new_user_session_path`. |

`create`:

| Test | Aserción |
|---|---|
| `test "create crea la partida y responde register serializado"` | `ExpenseBudget.count` +1; `type == "success"`; `register["id"]` presente. |
| `test "create asigna created_by_id al usuario de la sesion"` | `ExpenseBudget.last.created_by_id == users(:pleno).id`. |
| `test "create usa el user_id del body como beneficiario y no el de la sesion"` | Enviar `user_id: users(:limitado).id` estando logueado como `pleno` → `ExpenseBudget.last.user_id == users(:limitado).id`. **Es el test que protege la excepción de nomenclatura de §1.1.** |
| `test "create sin permiso Crear responde 403 y no crea"` | `users(:sin_permisos)` → 403 y `ExpenseBudget.count` sin cambio. |
| `test "create sin ser dueño y sin Ver todos responde 403"` | `users(:limitado)` sobre un centro cuyo `user_owner_id` es otro → 403 con el mensaje "Solo el responsable del centro de costos…". |
| `test "create siendo dueño del centro sin Ver todos crea"` | `users(:dueno_centro)` sobre `centro_con_viaticos` → 200 y count +1. |
| `test "create verifica el permiso antes que la existencia del centro"` | `users(:sin_permisos)` + `cost_center_id=999999` → **403**, no el error de "no existe". |
| `test "create con centro inexistente responde type error"` | `users(:pleno)` + `cost_center_id=999999` → 200 con `type == "error"`. |
| `test "create que supera el tope responde error con el disponible"` | `message.first` contiene `"supera el valor de viáticos"`; count sin cambio. |
| `test "create sobre centro con viatic_value nil responde el mensaje correcto"` | `message.first` contiene `"no tiene valor de viáticos cotizado"`. |
| `test "create acepta amount con formato de moneda"` | `amount: "$1,000,000"` → `ExpenseBudget.last.amount == 1_000_000`. |
| `test "create ignora created_by_id y last_user_edited_id del body"` | Enviarlos con ids ajenos → `created_by_id` sigue siendo el de la sesión. |
| `test "create ignora active del body"` | `active: false` en el body → la partida nace `active == true`. |
| `test "create sin sesion redirige al login"` | 302. |

`update`:

| Test | Aserción |
|---|---|
| `test "update cambia amount y notes"` | valores nuevos persistidos; `type == "success"`. |
| `test "update no permite cambiar cost_center_id"` | enviar otro centro → `reload.cost_center_id` sin cambio y respuesta 200. |
| `test "update no permite cambiar user_id"` | ídem con el beneficiario. |
| `test "update sin permiso Editar responde 403"` | 403 y `reload.amount` sin cambio. |
| `test "update sin ser dueño y sin Ver todos responde 403"` | 403. |
| `test "update reduciendo amount por debajo de lo gastado se permite"` | 200 y al menos un `ReportExpense` del par queda en `budget_status == "excedido"` (verifica que el reevalúo del servicio se invocó desde el controller). |
| `test "update active false responde exito"` | 200 y `reload.active == false`. |
| `test "update con id inexistente responde 404"` | `ExpenseBudget.find` levanta `RecordNotFound` → `assert_response :not_found` (comportamiento por defecto de Rails; se documenta, no se captura). |

`destroy`:

| Test | Aserción |
|---|---|
| `test "destroy elimina y responde type delete"` | `type == "delete"`; count −1. |
| `test "destroy sin permiso Eliminar responde 403 y no elimina"` | 403 y count sin cambio. |
| `test "destroy sin ser dueño responde 403"` | 403. |
| `test "destroy deja los gastos imputados con expense_budget_id nil"` | el gasto que apuntaba a la partida queda con `expense_budget_id == nil` tras `reload`. |

Transversal:

| Test | Aserción |
|---|---|
| `test "todos los endpoints exigen autenticacion"` | Loop sobre los 6 endpoints sin `sign_in` → cada uno `assert_response :redirect`. |

### `test/controllers/report_expenses_controller_test.rb`

| Test | Aserción |
|---|---|
| `test "get_report_expenses implementa q sobre los campos de texto"` | 4 sub-aserciones: `q` con fragmento de `invoice_name`, de `description`, de `invoice_number` y de `identification` devuelve el gasto esperado. Hoy `q` se ignora: sin el fix, las 4 devuelven la tabla completa. |
| `test "get_report_expenses q busca por id del registro"` | `q` con el id exacto → `total == 1` y `data[0]["id"]` coincide. |
| `test "get_report_expenses filtra por currency"` | `currency=USD` → todos los resultados con `currency == "USD"`. |
| `test "get_report_expenses filtra por budget_status"` | `budget_status=excedido` → solo excedidos. |
| `test "get_report_expenses filtra por accounting_approved false"` | `accounting_approved=false` → ninguno aprobado. **El caso `"false"` es el que rompe si alguien usa `.reject(&:blank?)` sobre booleanos.** |
| `test "get_report_expenses filtra por expense_budget_id"` | solo los imputados a esa partida. |
| `test "get_report_expenses sin ningun filtro devuelve todos"` | `total == ReportExpense.count` (verifica que `search({})` no filtra a cero tras eliminar `has_filters`). |
| `test "get_report_expenses ordena por las columnas nuevas"` | 4 sub-aserciones: `sort=id`, `sort=currency`, `sort=budget_status`, `sort=accounting_approved` → 200 y orden correcto. |
| `test "get_report_expenses sin Ver todos solo devuelve los del responsable"` | regresión: `users(:limitado)` → todos con `user_invoice_id == users(:limitado).id`. |
| `test "get_report_expenses expone los campos nuevos en el serializer"` | `data[0]` contiene las 13 claves nuevas + `accounting_approved_by`. |
| `test "get_cost_center_report_expenses acepta las columnas de orden nuevas"` | `sort=budget_status` → 200. |
| `test "get_cost_center_report_expenses q busca por id"` | `total == 1`. |
| `test "create no permite setear budget_status"` | body con `budget_status: "aprobado"` → el registro queda en el valor que puso el servicio, nunca en el del body. |
| `test "create no permite setear budget_reason"` | `budget_reason` del body ignorado. |
| `test "create no permite setear expense_budget_id"` | ignorado. |
| `test "create no permite setear accounting_approved"` | `ReportExpense.last.accounting_approved == false`. |
| `test "create no permite setear accounting_approved_by_id"` | queda `nil`. |
| `test "create no permite setear accounting_approved_at"` | queda `nil`. |
| `test "update no permite setear budget_status ni accounting_approved"` | ambos sin cambio tras el PATCH. |
| `test "create acepta currency y los campos foreign"` | persisten `currency`, `foreign_value`, `foreign_tax`, `foreign_total`, `exchange_rate`, `exchange_rate_date`, `exchange_rate_source`. |
| `test "create con cop_manual_override respeta el invoice_value enviado"` | `POST` con `cop_manual_override = "1"` → `ReportExpense.last.invoice_value` es el del body, sin recalcular (regla D2 del paquete 05). |
| `test "destroy recalcula el centro de costos"` | `cost_center.reload.viat_costo_real` baja exactamente el `invoice_value` del gasto borrado. Requiere que exista una fixture de `Alert` (`recalculate_cost_center` con `"reportes"` hace `Alert.last` sin guarda de nil). |

### `test/serializers/report_expense_serializer_test.rb`

| Test | Aserción |
|---|---|
| `test "receipt_file es nil cuando no hay comprobante"` | `hash[:receipt_file].nil?` — **no** `{url: nil}`. |
| `test "receipt_file devuelve un hash con url cuando hay comprobante"` | `hash[:receipt_file][:url]` es un String no vacío. |
| `test "expone los 13 campos nuevos"` | `assert_equal [], esperados - hash.keys`. |
| `test "no hay atributos que colisionen con asociaciones nuevas"` | Ningún nombre de `belongs_to` nuevo aparece en `attributes` (protege la regla de §4.3). |
| `test "los decimales se serializan como string"` | `hash[:foreign_value].is_a?(String)`. |
| `test "accounting_approved_by serializa solo id y names"` | `hash[:accounting_approved_by].keys == [:id, :names]`; y es `nil` cuando nadie aprobó. |

### `test/serializers/expense_budget_serializer_test.rb`

| Test | Aserción |
|---|---|
| `test "expone las claves del contrato A.2"` | conjunto exacto de claves. |
| `test "spent y available salen del precargado y no consultan"` | Asignar `spent_amount`/`available_amount` a mano y verificar que el serializer los devuelve sin ejecutar SQL (contar `sql.active_record`). |
| `test "user created_by y last_user_edited usan UserSerializer"` | cada uno con claves `[:id, :names]`. |
| `test "last_user_edited nil no revienta"` | partida recién creada → `hash[:last_user_edited].nil?`. |

### `test/controllers/report_expenses_budget_wiring_test.rb` (tarea 23)

Integración del cableado presupuestal. Es la prueba de la corrección más importante de la auditoría.

| Test | Aserción |
|---|---|
| `test "create en centro con partida y cupo deja budget_status aprobado"` | `POST /report_expenses` → `ReportExpense.last.budget_status == "aprobado"` y `expense_budget_id` apunta a la partida. |
| `test "create con cupo insuficiente deja excedido con budget_reason"` | `budget_status == "excedido"` y `budget_reason` no vacío. |
| `test "create sin partida deja sin_presupuesto"` | `budget_status == "sin_presupuesto"`. |
| `test "update que cambia de centro reevalua el centro anterior"` | Mover el gasto a otro centro → el par (centro viejo, usuario) queda reevaluado; verifica que `previous_cost_center_id` se capturó **antes** del `assign_attributes`. |
| `test "update que cambia de responsable reevalua al responsable anterior"` | ídem con `previous_user_invoice_id`. |
| `test "destroy libera el cupo del par centro-usuario"` | Tras borrar un gasto excedido, otro gasto del mismo par vuelve a `"aprobado"` (efecto de `on_expense_destroyed!`). |

---

## Pruebas E2E (Playwright)

> **RETIRADAS por auditoría.** Todos los specs funcionales (`test/e2e/specs/*.spec.js`) son del
> **paquete 12** (§7.2). Este paquete no aporta specs ni aserciones E2E propias, y **no se
> compromete con ningún `data-testid`**: el ítem de menú de Contabilidad y su
> `data-testid="nav-contabilidad"` son del **paquete 09** (§7.6). Los **93 tests de Minitest**
> (55 + 22 + 6 + 6 + 4) se conservan; ver "Objeciones a la auditoría" (punto 1) por el conteo de 95.

---

## Criterios de aceptación

Verificables con sí/no, sin opinión:

1. `bin/rails routes | grep -c expense_budget` devuelve **6**, y `GET /expense_budgets` (index) **no** aparece.
2. **RETIRADO por auditoría** (`delete_receipt` es del paquete 06).
3. **RETIRADO por auditoría** (la rake task es del paquete 01).
4. **RETIRADO por auditoría** (la rake task es del paquete 01).
5. **RETIRADO por auditoría** (`create_config.rake` es del paquete 01).
6. Un usuario con rol sin permisos recibe **HTTP 403** con cuerpo `{"type":"error","message":[...]}` en: `get_expense_budgets`, `get_expense_budget_summary`, `POST /expense_budgets`, `PATCH /expense_budgets/:id` y `DELETE /expense_budgets/:id`. Cinco endpoints, cinco 403.
7. `get_expense_budget_available` responde **200** a ese mismo usuario (decisión de §3 A.4, documentada como hallazgo).
8. El dueño del centro (`cost_centers.user_owner_id == current_user.id`) puede crear, editar y eliminar partidas de **ese** centro sin tener `"Ver todos"`, y recibe 403 en un centro ajeno.
9. `grep -n "budget_status\|accounting_approved\|expense_budget_id" app/controllers/report_expenses_controller.rb` no muestra ninguna de esas cadenas dentro de `report_expense_params_create` ni de `report_expense_params_update`.
10. `POST /report_expenses` con `budget_status`, `budget_reason`, `expense_budget_id`, `accounting_approved`, `accounting_approved_by_id` y `accounting_approved_at` en el body no persiste ninguno de los seis.
11. `GET /get_report_expenses?q=<id>` devuelve `total == 1`; `GET /get_report_expenses?q=<fragmento de invoice_name>` devuelve solo los que coinciden.
12. `GET /get_report_expenses` sin ningún parámetro devuelve `total == ReportExpense.count` (para un admin).
13. `GET /get_report_expenses?sort=id&dir=asc` responde 200 y el primer `id` es el menor.
14. La respuesta de `GET /get_report_expenses` incluye, en cada elemento de `data`, las 13 claves nuevas y `accounting_approved_by`.
15. `receipt_file` es `null` (no `{"url":null}`) para un gasto sin comprobante.
16. `app/serializers/report_expense_serializer.rb` **no** contiene `belongs_to :expense_budget`.
17. `DELETE /report_expenses/:id` modifica `cost_centers.viat_costo_real` del centro del gasto.
18. `GET /get_expense_budgets/:cost_center_id?sort=user_name` responde 200 (sin error de alias) y ordena por nombre del beneficiario.
19. `GET /get_expense_budgets/:cost_center_id?q=x&sort=user_name` responde 200 (sin `PG::DuplicateAlias`).
20. `GET /get_expense_budgets/:cost_center_id?per_page=500` devuelve como máximo 100 filas.
21. Serializar 5 partidas ejecuta menos de 15 queries SQL en total.
22. `CostCentersController#show` expone en `@estados` **las 10 claves canónicas de §4.4**: `budget_module`, `budget_create`, `budget_edit`, `budget_delete`, `budget_show_all`, `is_center_owner`, `expense_create`, `expense_edit`, `expense_delete`, `expense_show_all`. Y **no** aparecen `budget_view` ni `is_cost_center_owner` (derogados).
23. **RETIRADO por auditoría** (el ítem de menú "Contabilidad" y su helper son del paquete 09).
24. `bin/rails test test/controllers test/serializers` → **0 failures, 0 errors**.
25. `bin/rails test` completo (toda la suite) sigue en 0 failures / 0 errors tras las etiquetas nuevas de fixtures.
26. Ningún archivo de este paquete contiene una migración, un componente React, una plantilla `.axlsx`, una rake task ni un spec de Playwright.
27. **Cableado presupuestal (tarea 23):** `POST /report_expenses` en un centro con partida vigente y cupo deja `budget_status == "aprobado"`; con cupo insuficiente, `"excedido"` con `budget_reason` no vacío; sin partida, `"sin_presupuesto"`. Ningún gasto creado por la vía web queda en `sin_presupuesto` cuando existe partida con cupo.
28. `grep -n "create_budget\|update_budget\|destroy_budget\|summary_for_center" app/controllers/expense_budgets_controller.rb` muestra **solo** llamadas con bang y con la firma de §7.4 (`create_budget!` con kwargs, `update_budget!` con `attrs` posicional, `summary_for_center` con el **id**).
29. `grep -rn "delete_receipt\|permissions_gastos_ia\|authorization_accounting" <diff del paquete>` no devuelve nada: esos artefactos son de los paquetes 06, 01 y 09.

**Añadidos por el cierre de la reauditoría** (numeración nueva, sin tocar la anterior)

30. [ ] `report_expense_params_create` y `report_expense_params_update` permiten `:receipt_file` y
    `:remove_receipt_file`, y un `POST /report_expenses` multipart con `comprobante.pdf` deja
    `report_expense.receipt_file.present? == true`. Sin esto, el comprobante del paquete 06 **no se
    guarda por la vía web** y sus criterios 5 y 6 son inalcanzables.
31. [ ] `app/serializers/report_expense_serializer.rb` aparece en el diff de **este** paquete y de
    ningún otro: es dueño único del archivo (§7.2). Los 13 atributos incluyen los 7 de moneda (que
    antes reclamaba el 05) y los 3 contables + `belongs_to :accounting_approved_by` (que antes
    reclamaba el 06).
32. [ ] `grep -n "extract_receipt" <diff del paquete>` no devuelve nada: la acción, su ruta y sus 16
    tests son del **paquete 10** (§7.2, excepción documentada) y llegan mergeados desde la ola 3b.
33. [ ] `test/fixtures/users.yml` no aparece en el diff salvo por el cambio de una línea:
    `dueno_centro` pasa de `rol: gerente` a `rol: presupuesto_limitado`. La etiqueta y el
    `user_owner` de `centro_con_viaticos` los declaró el **01**.

---

## Riesgos y trampas

1. **`user_id` en `expense_budgets` es el BENEFICIARIO.** Si el agente escribe el
   `reverse_merge(user_id: current_user.id)` que usa `report_expense_params_create:351`, toda partida
   creada por un administrador se asigna a sí mismo, el control de cupo se calcula contra la persona
   equivocada y el error es **silencioso**: la partida se crea, la pantalla se ve bien y los números
   están mal. Hay un test dedicado a esto; no borrarlo.

2. **`ORDER BY users.names` con tres asociaciones a `users`.** `ExpenseBudget` tiene `user`,
   `created_by` y `last_user_edited`, las tres a `users`. Si se usa `includes(...)` + `joins(:user)`,
   Rails aliasea las tablas y el `ORDER BY users.names` puede terminar ordenando por el creador o
   fallando con `PG::UndefinedTable`. Por eso el join es literal con alias `beneficiaries`.
   Y aplicarlo dos veces (por `q` y por `sort`) da `PG::DuplicateAlias`: la bandera `needs_user_join`
   no es cosmética.

3. **`spent` y `available` en el serializer = N+1 garantizado.** Cada uno es un `SUM`; con 50 filas por
   página son 100 queries. El `preload_amounts!` es obligatorio, y el test que cuenta queries es lo
   único que impide que alguien "simplifique" el controller devolviendo el fallback del modelo.

4. **`recalculate_cost_center(id, "reportes")` hace `Alert.last` sin guarda de nil y
   `current_user.id`.** En el `destroy` del gasto (tarea 20) eso significa: (a) el test necesita una
   fixture de `Alert` o revienta con `NoMethodError` en `alert.ing_costo_med`; (b) la llamada **no**
   se puede mover a un servicio ni a un job sin refactor, porque lee `current_user`. Se deja en el
   controller, que es donde `current_user` existe.

5. **El `has_filters` de `get_report_expenses` es una trampa de mantenimiento.** Si se agregan los
   filtros nuevos a `search` pero no a la condición `has_filters` (líneas 34-38), `?currency=USD`
   **se ignora en silencio** y la pantalla muestra todo. Por eso se elimina el bloque entero en vez de
   agregarle 4 condiciones más. Verificar que el paquete 03 dejó `search({})` devolviendo `all` y no
   `none`; si devuelve `none`, la pantalla de gastos queda vacía en producción.

6. **`reject { |_k, v| v.blank? }` y los booleanos.** Los query params llegan como String, así que
   `"false"` sobrevive. Pero si alguien "mejora" `report_expense_filters` convirtiendo a booleano
   antes del reject, `accounting_approved=false` desaparece del hash y el filtro deja de funcionar.
   El test de `accounting_approved=false` es la red.

7. **`CAST(report_expenses.id AS TEXT) LIKE '%3%'` hace sequential scan** y además matchea ids que
   contienen el dígito, no solo el exacto. Es lo que pide la propuesta §3.4 ("búsqueda por número de
   registro") y con el volumen actual no duele, pero **no** convertir el `q` en un `WHERE id = ?`:
   rompería la búsqueda por texto cuando el término es numérico y aparece en `invoice_number`.

8. **`update_state_report_expense` sigue sin verificar permisos.** §3.9 lo deja explícitamente fuera de
   alcance. Es tentador arreglarlo mientras se toca el controller: **no hacerlo en este paquete**.
   Aparece en la lista de hallazgos, no en el diff.

9. **`create` de gasto hace `ReportExpense.create(...)` y después `.save` (doble escritura).**
   Está mal, genera un `RegisterEdit` de edición espurio junto al de creación, y §4.7 depende de ese
   comportamiento (el umbral mágico de 59 caracteres). La tarea 23 **solo** cambia el punto de
   guardado (`ReportExpense.new` + `persist_with_evaluation!`, que es el punto de entrada único de
   §7.4); **nada más de ese flujo se toca**, y hay que verificar en el PR que el conteo de
   `RegisterEdit` por creación no cambia respecto de master.

10. **`PATCH /expense_budgets/:id` con `cost_center_id` o `user_id` en el body responde 200 y los
    ignora.** Un frontend que asuma que los cambió mostrará datos desincronizados hasta el refresh.
    Es lo que dice §3 A.6 (no editables), pero conviene que el paquete de UI ni siquiera los envíe.

11. **El 403 con cuerpo JSON.** Todo `fetch` del repo hace `.then(r => r.json())` sin mirar el status;
    con 403 eso funciona porque el cuerpo es JSON válido. Si alguien "mejora" el `deny!` devolviendo
    `head :forbidden` (sin cuerpo), **todas** las pantallas nuevas revientan con
    `SyntaxError: Unexpected end of JSON input` en vez de mostrar el mensaje. El cuerpo es obligatorio.

12. **Nunca ejecutar `rake create_config:create` en un entorno con datos.** Su línea 5 es
    `ModuleControl.destroy_all` y borra los permisos de todos los roles del sistema. Este paquete no
    toca ese archivo (es del 01), pero la regla sigue valiendo al desplegar.

13. **`AccionModule belongs_to :user` es requerido** (sin `optional: true`). Toda etiqueta que este
    paquete agregue a `accion_modules.yml` necesita `user: admin`, o la fixture revienta con
    `RecordInvalid` y tumba la suite entera.

14. **El cableado presupuestal es silencioso si falta.** Si la tarea 23 no se implementa, nada falla:
    los gastos se crean, la pantalla se ve bien y **todos** quedan en `sin_presupuesto`. El error solo
    aparece tres paquetes después, en el tablero del 08 y en las columnas del 09. Los 6 tests de
    `report_expenses_budget_wiring_test.rb` y el criterio 27 son la única red.

15. **Orden de mergeo con el paquete 06 (comprobante).** Las tareas 15 (atributo `receipt_file` del
    serializer) y 19 (strong param `:receipt_file`) fallan con
    `NoMethodError: undefined method 'receipt_file'` si `mount_uploader` no está. Si el 06 se atrasa,
    esas dos tareas se sacan a un commit aparte y el resto del paquete se mergea igual.

16. **Firma del servicio.** El servicio lo escribe el paquete 04 y su firma es la de §7.4. Llamar a
    `create_budget` sin bang, pasar `attrs:` como kwarg a `update_budget!`, mandarle el **objeto**
    `CostCenter` a `summary_for_center` o leer `result.ok?` como si `Result` fuera posicional
    revienta con `NoMethodError`/`ArgumentError` en tiempo de ejecución, no de carga: los tests de
    controller son los que lo atrapan.

---

## Objeciones a la auditoría

Ninguna corrección se revoca; las tres son **observaciones** para que quien coordine el plan las
resuelva antes de lanzar la ola 4.

1. **El conteo "los 95 tests de Minitest se conservan íntegros" (corrección 11) ya no cuadra.**
   Es cierto dentro del alcance de esa corrección (borrar los specs E2E no toca Minitest), pero las
   correcciones 5 y 7 sí borran tests: los 3 de `delete_receipt` (van al 06) y los 6 de la rake task
   (van al 01). Con la corrección 9 (+1 de `cop_manual_override`) y la corrección 2 (+6 del cableado)
   el total queda en **93**: 55 + 22 + 6 + 6 + 4. Este documento usa 93.

2. ✅ **La etiqueta `dueno_centro`: CERRADA por la reauditoría. La crea el 01, no este paquete.**
   El problema era real: la corrección 8 le prohíbe a este paquete tocar `cost_centers.yml`, y el
   01 definía `centro_con_viaticos` con `user_owner: gerente`, de modo que los tests de
   autorización por propiedad (`get_expense_budgets` / `create` / `destroy` siendo dueño) se
   quedaban sin fixture. **Valor definitivo escrito en §7.2:**
   `cost_centers(:centro_con_viaticos).user_owner = users(:dueno_centro)`, y **el usuario
   `dueno_centro` lo declara el paquete 01**, que es dueño de las dos fixtures y las escribe en la
   misma ola (si lo declarara este paquete, `cost_centers.yml` referenciaría en la ola 1 una
   etiqueta que solo existe en la ola 4). `centro_ajeno.user_owner` sigue siendo `contador`.
   **Consecuencia para la Tarea 22 de este paquete:** agrega a `rols.yml` solo `presupuesto_pleno`
   y `presupuesto_limitado`; **ya no agrega `dueno_centro` a `users.yml`**, solo lo **usa**.

3. ✅ **`extract_receipt`: CERRADO. Es del paquete 10 y este paquete no lo escribe.** §7.2 lo
   listaba bajo el dueño 07 mientras este documento lo declaraba fuera de alcance y el 10 lo
   escribía entero (acción, ruta, helper `build_draft`, 16 tests y los criterios 20–26 y 29.1): la
   matriz nombraba a un dueño que se declaraba no-dueño, así que el endpoint no lo escribía nadie o
   lo escribían dos. **Resolución aplicada:** `extract_receipt` **salió de la fila del 07** y tiene
   fila propia en §7.2 con **dueño 10**, como excepción documentada al dueño del archivo —el mismo
   tratamiento que `delete_receipt`/`download_receipt` del 06—. Se eligió esta opción (una línea de
   cambio) frente a mover al 07 la Tarea 14, los 16 tests y los criterios 20–26, que el propio 10
   advertía que "no es una edición cosmética". El 10 la mergea en la ola 3; este paquete la recibe
   escrita en la ola 4 y **no la reescribe**.
