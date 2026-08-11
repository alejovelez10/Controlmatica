# Paquete 04 — Dominio: partidas presupuestales y aprobacion automatica

## 🔴 CORRECCIONES DE AUDITORÍA (vinculantes — leer ANTES que el resto del documento)

> Estas correcciones **mandan sobre cualquier texto de este archivo** que las contradiga.
> Consolidadas en `00-ARQUITECTURA.md` §7.

1. **Se BORRAN las Tareas 1 y 2 (migraciones `20260401000001` y `20260401000002`).** El dueño
   único y exclusivo de las 6 migraciones es el **paquete 02** (§1, §7.2). En su lugar, este
   paquete arranca con una **precondición verificable**:
   ```ruby
   raise "Falta el paquete 02" unless ActiveRecord::Base.connection.table_exists?(:expense_budgets) &&
                                      ActiveRecord::Base.connection.column_exists?(:report_expenses, :budget_status)
   ```
2. **Dependencias reales, con los números canónicos** (§7.1): este paquete depende de
   **01** (`01-infraestructura-de-pruebas.md`), **02** (`02-migraciones-y-esquema.md`) y
   **03** (`03-deuda-tecnica-bloqueante.md`, **dependencia DURA**, ver punto 3). Las etiquetas
   "Paquete 0" y "00" quedan derogadas.
3. 🔴 **La Tarea 12.4 se REESCRIBE.** Decía "agregar una línea de `budget_status` DENTRO de
   `create_edit_register` y sumarla a la interpolación de `str`". Ese método **ya no existe**
   después del paquete 03, que lo reemplaza por el concern `RegisterAuditable`. Instrucción nueva:
   > Agregar `audit_field :budget_status` (con su etiqueta legible) más su entrada en
   > `edit_fields` de `audit_register`, **y actualizar la constante golden `HTML_EDICION` del
   > paquete 03 agregando el segmento al final, en el mismo PR.** No se toca el encabezado ni el
   > umbral mágico de 59.
4. **La Tarea 12 define además la constante que dos paquetes esperan y nadie creaba**:
   ```ruby
   # app/models/report_expense.rb
   BUDGET_STATUS_LABELS = { "sin_presupuesto" => "Sin presupuesto",
                            "aprobado"        => "Aprobado",
                            "excedido"        => "Excedido" }.freeze
   ```
   El paquete 06 borra su fallback y el 11 la consume directamente.
5. 🔴 **La Tarea 3 agrega `attr_writer :spent_amount, :available_amount` a `ExpenseBudget`**,
   además de la memoización en los lectores. Sin ellos, el `preload_amounts!` del controller del
   paquete 07 revienta con `NoMethodError` y la tabla de partidas cae en N+1.
6. 🔴 **`summary_for_center` cambia de forma.** El hash plano
   `{cost_center:, viatic_value:, assigned:, unassigned:, spent:, available:, by_user:}` **queda
   derogado**: no es lo que consumen el contrato §3 A.3, el controller del 07 ni el componente
   `BudgetSummaryBoard` del 08. Forma canónica (§7.4), con los totales **anidados**:
   ```ruby
   { cost_center: { id:, code:, viatic_value: },
     totals:      { viatic_value:, assigned:, unassigned:, spent:, available: },
     by_user:     [ { user_id:, user_name:, assigned:, spent:, available:,
                      budgets_count:, exceeded_expenses_count: } ] }
   ```
   Los tests que afirmen la forma vieja se actualizan.
7. 🔴 **Se BORRA la "Trampa #14".** Su afirmación —*"`Struct.new(:ok?)` es sintácticamente
   inválido en Ruby"*— **es falsa**: verificado con el Ruby del repo (3.1.2, fijado en el
   Gemfile), `Struct.new(:ok?, :value, :error).new(true, 1, nil).ok?` devuelve `true` sin error.
   Contradecía además al paquete 05 y llevaría a un agente a reescribir código correcto.
   Reformulación admitida, si se quiere conservar la advertencia: *"el setter `ok?=` no es válido;
   por eso se usa `keyword_init` y se define el predicado en el bloque"*. El mismo texto aparece
   como nota bajo la definición del `Result` (§Tarea 6) y también se corrige allí.
8. **`Result` canónico del proyecto** (§4.2, §7.4), idéntico para **04, 05 y 07**:
   `Struct.new(:ok, :value, :errors, keyword_init: true)` con `ok?` y `error?` en el bloque, y
   **`errors` SIEMPRE array**. `result.error` (singular) no existe en ninguno de los tres.
   🟡 **Corregido en el cierre de la reauditoría:** la redacción original decía "idéntico para 04,
   05, 07 y **10**", y el 10 nunca lo cumplió: su `ReceiptExtractionService::Result` es
   `Struct.new(:ok, :fields, :confidence, :error, :error_message, :model, :usage, keyword_init: true)`
   con `:error` **singular** como *código* de error. §4.2 lo declara **excepción documentada y
   única**, consumida solo por la acción `extract_receipt` que el propio 10 escribe. Este paquete
   no la copia ni la consume.
9. **La Tarea 15 deja de ser "documentar el cableado" y pasa a ser un CONTRATO EXIGIBLE.** El
   comentario de bloque se conserva, pero el **paquete 07 tiene ahora una tarea explícita** que lo
   implementa en `create`/`update`/`destroy` de `ReportExpensesController`, con un test de
   integración (`POST /report_expenses` con partida vigente deja `budget_status = "aprobado"`).
   Sin ese cableado, `budget_status` nunca se calculaba por la vía web y todo el proyecto mostraba
   datos falsos. **Y la tool MCP del paquete 11 usa el mismo `persist_with_evaluation!`**, no
   `save` + `evaluate!` + `reload`.
10. **Tests nuevos obligatorios** (dos huecos que la auditoría encontró):
    - `test/services/expense_budget_service_evaluate_test.rb`:
      `test_evaluate_es_idempotente` — llamar `evaluate!` dos veces seguidas sobre el mismo gasto
      produce exactamente el mismo `budget_status`, `budget_reason` y `expense_budget_id`. Lo
      exige por contrato el paquete 11.
    - `test/services/expense_budget_service_reevaluate_test.rb`:
      `test_gasto_aprobado_contablemente_empujado_a_excedido_conserva_la_aprobacion` — gasto con
      `accounting_approved: true`; reducir la partida hasta empujarlo a `excedido`; afirmar que
      `accounting_approved` **sigue true** y `accounting_approved_at` **sin cambios**. Fija la
      fila más delicada de la tabla de verdad de §2.4, que hoy no prueba nadie.
11. **Citas por línea corregidas**: la Trampa #2 cita `create_create_register:276` y
    `create_destroy_register:338`; las líneas reales de `User.current.id` son **275** y **337**.
    Regla del proyecto: referenciar por **nombre de método**, no por número de línea.
12. **`ExpenseBudget` puede usar `RegisterAuditable`** (del paquete 03) pero no está obligado; si
    escribe su auditoría a mano, mantiene `module: "Presupuesto"`.
13. **Bloqueo de merge**: este paquete **no se mergea** hasta que la **Tarea 0** (§7.10) tenga
    firmadas las decisiones **0.1** (¿los históricos consumen presupuesto?) y **0.2** (¿con o sin
    IVA?). Los defaults implementados son "sí consumen" y "sin IVA", pero la confirmación por
    escrito es **condición de merge**, no un trámite posterior: cambiarlo después de que el cliente
    vea números en pantalla es carísimo en confianza.

> Documento de trabajo para un agente autonomo. Se ejecuta **despues** de los paquetes **01**
> (infraestructura de pruebas), **02** (migraciones y esquema) y **03** (deuda tecnica
> bloqueante), segun la tabla canonica §7.1. Todo lo que aqui se decide es coherente con
> `docs/plan-gastos-ia/00-ARQUITECTURA.md`; las diferencias estan en la seccion
> **Discrepancias con la arquitectura** al final y son deliberadas.
>
> Este paquete **no toca controllers, rutas, serializers AMS, React, permisos ni MCP**. Entrega
> modelo + servicio + pruebas. Los paquetes de API/UI consumen la API publica que se define aqui.

---

## Objetivo

Dejar funcionando el nucleo de dominio del presupuesto: el modelo `ExpenseBudget` con su
validacion de tope contra `cost_centers.viatic_value`, y `ExpenseBudgetService` como unica fuente
de verdad de `asignado / gastado / disponible`, de la asignacion automatica de
`report_expenses.budget_status` y del recalculo FIFO ante cualquier movimiento de gasto o de
partida. Al terminar, crear/editar/eliminar un gasto o una partida deja el estado presupuestal de
todos los gastos afectados correcto y auditado, y dos escrituras concurrentes del mismo centro no
pueden pasarse del tope.

---

## Dependencias

| Paquete | Por que |
|---|---|
| **01 — `01-infraestructura-de-pruebas.md`** | Bloqueante duro. Sin el, `bin/rails test` no arranca (`chromedriver-helper` rompe el boot) y `fixtures :all` tumba la suite con 4 YAML rotos. Este paquete escribe ~85 tests: sin el 01 no se puede correr ni uno. Ademas aporta el helper `as_user` de §5.3 (capa 2), la guarda `current_actor_id` en `ReportExpense` (capa 1) y las **fixtures base** (`users.yml`, `cost_centers.yml`, `customers.yml`, `rols.yml` y `report_expenses.yml` sin FK colgantes), de las que dependen todas las pruebas que crean gastos. |
| **02 — `02-migraciones-y-esquema.md`** | Dueño unico y exclusivo de las 6 migraciones (§7.2). Este paquete **no crea ninguna**: consume la tabla `expense_budgets` y las columnas `expense_budget_id` / `budget_status` / `budget_reason` ya migradas, con `db/schema.rb` regenerado y `annotate` corrido. Ver "Precondicion verificable". |
| **03 — `03-deuda-tecnica-bloqueante.md`** (**dependencia DURA**) | Reemplaza los 3 metodos de auditoria de `ReportExpense` por el concern `RegisterAuditable`. La Tarea 12 de este paquete agrega `audit_field :budget_status` sobre ese concern y actualiza la constante golden `HTML_EDICION` del 03. Sin el 03 mergeado, la Tarea 12 no tiene donde escribirse. |

**Precondicion verificable** (reemplaza a las Tareas 1 y 2, retiradas por auditoria). Antes de
escribir una sola linea, el agente comprueba que el esquema del paquete 02 ya esta aplicado:

```ruby
raise "Falta el paquete 02" unless ActiveRecord::Base.connection.table_exists?(:expense_budgets) &&
                                   ActiveRecord::Base.connection.column_exists?(:report_expenses, :budget_status)
```

Si la precondicion falla, el paquete **no arranca**: no se "arregla" creando la migracion aqui.

**Este paquete NO depende de** (y no debe esperarlos): comprobante, multimoneda, contabilidad,
permisos/seeds, MCP, React.

**Paquetes que dependen de este** (para que sepan que van a encontrar hecho):
- **07 — `07-api-permisos-y-rutas.md`** consume `ExpenseBudgetService.create_budget! /
  update_budget! / destroy_budget! / available_for / summary_for_center` y el modelo
  `ExpenseBudget`, y **tiene una tarea propia y explicita** que cablea `persist_with_evaluation!`
  y `on_expense_destroyed!` en `ReportExpensesController#create/#update/#destroy` (§7.4). Este
  paquete **no** modifica el controller: publica el contrato exigible (Tarea 15).
- **08 — `08-frontend-presupuesto-y-gastos.md`**, a traves del 07, consume `summary_for_center` en
  `BudgetSummaryBoard` con la forma **anidada** de §7.4.
- **11 — `11-mcp-y-agente-whatsapp.md`** usa el **mismo** `persist_with_evaluation!` en su tool de
  creacion de gastos (§7.4, §7.5) y consume `ReportExpense::BUDGET_STATUS_LABELS`.
- **06 — `06-comprobante-y-contabilidad.md`** y **09 — `09-frontend-tablas-y-contabilidad.md`**
  consumen la columna `budget_status`, el invariante "un `excedido` nunca entra a la vista" y
  `BUDGET_STATUS_LABELS` (el 06 **borra su fallback**, §7.4).

---

## Archivos

### A crear

| Ruta | Que se hace |
|---|---|
| `app/models/expense_budget.rb` | Modelo: asociaciones, validaciones, scopes, `cap_violation_for`, montos calculados y los 3 callbacks de auditoria a `RegisterEdit`. |
| `app/services/expense_budget_service.rb` | **Directorio `app/services/` es nuevo** (§4.2). Clase plana con metodos de clase; toda la aritmetica y el bloqueo. |
| `test/fixtures/expense_budgets.yml` | Fixtures: partida activa con cupo, partida inactiva, partida de centro con `viatic_value` nil, y dos partidas del mismo par para probar "la mas antigua". |
| `test/models/expense_budget_test.rb` | Validaciones, scopes, tope, dependencias. |
| `test/models/expense_budget_audit_test.rb` | `RegisterEdit` de crear/editar/eliminar partida. |
| `test/services/expense_budget_service_available_test.rb` | `available_for` — los cuatro puntos de §2.6. |
| `test/services/expense_budget_service_evaluate_test.rb` | `evaluate!` y `persist_with_evaluation!` — las tres transiciones y el texto de `budget_reason`. |
| `test/services/expense_budget_service_reevaluate_test.rb` | FIFO, partida reducida bajo lo gastado, partida ampliada, eliminacion de gasto y de partida. |
| `test/services/expense_budget_service_cap_test.rb` | `create_budget!` / `update_budget!` / `destroy_budget!` y `validate_cap!`, incluido el test de `FOR UPDATE`. |
| `test/services/expense_budget_service_concurrency_test.rb` | Bloqueo. `self.use_transactional_tests = false`. |

> **Las migraciones NO estan en esta tabla y no se crean aqui.** `db/migrate/2026040*` (las 6)
> tienen un unico dueño: el **paquete 02** (§7.2). Ver "Precondicion verificable" en Dependencias.

### A modificar

| Ruta | Que se hace |
|---|---|
| `app/models/report_expense.rb` | Agregar `belongs_to :expense_budget, optional: true`; agregar la constante `BUDGET_STATUS_LABELS` (§7.4); agregar los 4 scopes de estado presupuestal; agregar la validacion de `inclusion` de `budget_status`; agregar **un solo** `audit_field :budget_status` mas su entrada en `edit_fields` de `audit_register` (concern `RegisterAuditable`, dueño: paquete 03). Nada mas. |
| `app/models/cost_center.rb` | Agregar `has_many :expense_budgets, dependent: :destroy` junto a los demas `has_many` (al lado de `has_many :report_expenses`). Nada mas. |
| `test/models/report_expense_audit_legacy_test.rb` (dueño: paquete 03) | **Solo** extender la constante golden `HTML_EDICION` agregando el segmento de `budget_status` al final, en el mismo PR de la Tarea 12. Los 14 tests golden del 03 **no se relajan ni se borran**. |

**Explicitamente NO se tocan** en este paquete: `db/migrate/**` y `db/schema.rb` (paquete 02),
`app/models/concerns/register_auditable.rb` y `ReportExpense.search` (paquete 03),
`app/controllers/report_expenses_controller.rb` (paquete 07),
`app/helpers/application_helper.rb` (`recalculate_cost_center`), `app/serializers/`,
`config/routes.rb`, `app/javascript/`, `app/tools/`, `app/models/user.rb`, y ninguna fixture
propiedad del 01 (`users.yml`, `cost_centers.yml`, `customers.yml`, `rols.yml`,
`report_expenses.yml`).

---

## Tareas

Cada tarea es un commit. El test que la cubre puede ir en el mismo commit.

### Tarea 1 — Migracion `create_expense_budgets`

> **RETIRADA por auditoría.** Dueño único: paquete 02. Ver el bloque de correcciones al inicio.

### Tarea 2 — Migracion de campos presupuestales en `report_expenses`

> **RETIRADA por auditoría.** Dueño único: paquete 02. Ver el bloque de correcciones al inicio.

### Tarea 3 — Modelo `ExpenseBudget`: asociaciones, validaciones y scopes

`app/models/expense_budget.rb`, con la cabecera `# == Schema Information` de `annotate`.

Asociaciones:
```ruby
belongs_to :cost_center
belongs_to :user                                             # BENEFICIARIO, no creador
belongs_to :created_by,        class_name: "User", optional: true
belongs_to :last_user_edited,  class_name: "User", optional: true
has_many   :report_expenses,   dependent: :nullify           # FK expense_budget_id
```

> ⚠ `belongs_to` en Rails 6.1 es **requerido por defecto**: `cost_center` y `user` sin `optional`
> generan las validaciones `:cost_center` y `:user`. Los tests afirman sobre esas claves, no sobre
> `:cost_center_id`.

> ⚠ `dependent: :nullify` usa `update_all` → **no dispara callbacks** de `ReportExpense`. Es lo
> que queremos: evita 200 `RegisterEdit` fantasma y evita que `edit_values` pise
> `last_user_edited_id` de gastos ajenos.

Validaciones:
- `validates :amount, presence: true, numericality: { greater_than: 0 }`
- `validates :notes, length: { maximum: 1000 }, allow_blank: true` — *Asumido:* 1000 caracteres; la
  columna es `text` y no hay limite de negocio definido.
- `validates :active, inclusion: { in: [true, false] }`

Scopes (nombres en español, coherentes con `CostCenter.filterCost` / `tableristas`):
```ruby
scope :activas,           -> { where(active: true) }
scope :para,              ->(cost_center_id, user_id) { where(cost_center_id: cost_center_id, user_id: user_id) }
scope :antiguas_primero,  -> { order(created_at: :asc, id: :asc) }
```
El desempate por `id` es obligatorio: dos partidas creadas en el mismo milisegundo darian orden no
determinista y el test de "imputa a la mas antigua" seria intermitente.

Metodos de instancia (los consume el `ExpenseBudgetSerializer` del paquete **07**, §4.3):
```ruby
attr_writer :spent_amount, :available_amount   # OBLIGATORIO (§7.4): lo usa preload_amounts! del 07

def assigned_amount  # SUM(amount) de las partidas ACTIVAS del par (centro, beneficiario)
def spent_amount     # gastado del PAR, definicion §2.6
def available_amount # assigned_amount - spent_amount
```
Los tres delegan en `ExpenseBudgetService` y memorizan en `@assigned_amount ||= ...` para que una
tabla paginada no dispare 3 queries por fila.

> 🔴 **Los `attr_writer` no son opcionales** (correccion de auditoria 5, §7.4). El controller del
> paquete 07 hace `preload_amounts!` inyectando los montos ya calculados en lote; sin los writers
> revienta con `NoMethodError` y la tabla de partidas cae en N+1. La memoizacion de los lectores
> debe respetar el valor inyectado (`@spent_amount ||= ...`).

> **Asumido (decidir aqui, no en los paquetes de UI 08/09):** `spent_amount` y `available_amount` de una
> **fila** de partida son magnitudes **del par (centro, beneficiario)**, no de la fila. Razon: el
> control de cupo es agregado (§1.1: "No hay indice unico… el cupo se controla por agregado") y no
> existe imputacion parcial entre partidas, asi que prorratear seria inventar un numero. Consecuencia
> que los paquetes 08/09 deben respetar: si un par tiene dos partidas, las dos filas muestran el
> **mismo** `spent`/`available`, y la columna se rotula "Gastado (persona en el centro)". Sumar esa
> columna da un total incorrecto: la tabla no debe ofrecer totalizador de esa columna.

### Tarea 4 — Validacion de tope contra `cost_centers.viatic_value`

En `ExpenseBudget`, un metodo de clase con la regla, y una validacion de instancia que lo usa. Una
sola implementacion, dos puntos de entrada.

```ruby
# Devuelve nil si no hay violacion, o el mensaje de error (String) si la hay.
# NO abre transaccion ni toma lock: el lock lo pone quien la llama (el servicio).
def self.cap_violation_for(cost_center:, amount:, active:, exclude_id: nil)
```

Algoritmo exacto:
1. Si `active` es falso, o `amount.to_d <= 0` → devolver `nil`. (Desactivar o anular una partida
   **nunca** puede fallar por tope, ni siquiera en un centro con `viatic_value` nil.)
2. `tope = cost_center&.viatic_value.to_d.round(2)` — `nil.to_d` es `0`.
3. Si `tope <= 0` → devolver
   `"El centro de costos no tiene valor de viáticos cotizado; no es posible asignar partidas"`.
4. `suma_otras = ExpenseBudget.activas.where(cost_center_id: cost_center.id).where.not(id: exclude_id).sum(:amount)`
   — **el `where.not(id: ...)` solo se aplica si `exclude_id.present?`**. Ver Riesgos, trampa #1.
5. `nueva_suma = suma_otras + amount.to_d.round(2)`.
6. Si `nueva_suma <= tope` → `nil`.
7. Si no, devolver exactamente:
   `"La suma de las partidas (#{ExpenseBudgetService.money(nueva_suma)}) supera el valor de viáticos del centro de costos (#{ExpenseBudgetService.money(tope)}). Disponible para asignar: #{ExpenseBudgetService.money([tope - suma_otras, 0].max)}"`

> **El tope es POR CENTRO, no por par.** Suma las partidas activas de **todos** los beneficiarios
> del centro (§1.1). Un test lo afirma explicitamente.

Validacion de instancia:
```ruby
validate :within_cost_center_cap

def within_cost_center_cap
  return if cost_center.blank?
  msg = self.class.cap_violation_for(cost_center: cost_center, amount: amount,
                                     active: active, exclude_id: (persisted? ? id : nil))
  errors.add(:amount, msg) if msg
end
```
Razon de tenerla en el modelo y no solo en el servicio: un `ExpenseBudget.create!` desde consola,
rake, seed o un controller futuro no puede saltarse el tope. El servicio agrega el **lock**
(serializacion), no la regla.

### Tarea 5 — Auditoria de partidas en `RegisterEdit`

> Correccion de auditoria 12: `ExpenseBudget` **puede** usar el concern `RegisterAuditable` del
> paquete 03, pero **no esta obligado**. Si escribe su auditoria a mano —como describe esta
> tarea— mantiene `module: "Presupuesto"`. Lo que **no** es opcional es la Tarea 12, que si pasa
> por el concern.

En `ExpenseBudget`:
```ruby
before_update  :edit_values
after_create   :create_create_register
before_update  :create_edit_register
before_destroy :create_destroy_register

private

def current_actor_id
  User.current&.id || created_by_id || last_user_edited_id || user_id
end

def edit_values
  self.last_user_edited_id = current_actor_id
end
```

Reglas de los tres registros (§4.7):
- `module: "Presupuesto"` — **sin** el typo `"Gatos"`; ese typo solo se conserva en `ReportExpense`.
- `user_id: current_actor_id` — si es `nil`, **no se crea el `RegisterEdit`** y no se lanza
  excepcion (`RegisterEdit belongs_to :user` es requerido y reventaria).
- `register_user_id: self.user_id` (el **beneficiario**). *Asumido:* se usa el beneficiario y no
  `self.id`; `register_user` es `class_name: "User"`, asi que el `register_user_id: self.id` de
  `ReportExpense` es un bug preexistente que no se replica.
- `state: "pending"`, `date_update: Time.now`, `type_edit:` `"creo"` / (default `"edito"`) /
  `"elimino"`.

Contenido HTML, siguiendo el estilo del repo:
- Crear / eliminar: `"<p>Centro de costo: <b>#{cost_center.code}</b></p>"`,
  `"<p>Beneficiario: <b>#{user.names}</b></p>"`, `"<p>Valor: <b>#{ExpenseBudgetService.money(amount)}</b></p>"`,
  `"<p>Notas: <b>#{notes}</b></p>"`, `"<p>Estado: <b>#{active ? "Activa" : "Inactiva"}</b></p>"`,
  precedido de `"<p><strong>(SE CREO LA SIGUIENTE PARTIDA)</strong></p>"` /
  `"<p><strong>(SE ELIMINO LA SIGUIENTE PARTIDA)</strong></p>"`. Se escriben **siempre**.
- Editar: se arma un `partes = []` y se hace `partes << ...` solo por los campos con
  `*_changed?` entre `amount`, `notes`, `active`. **Si `partes.empty?`, no se crea nada.** Formato
  por campo:
  `"<p>Valor: <b class='color-true'>#{nuevo}</b> / <b class='color-false'>#{anterior}</b></p>"`,
  donde `anterior = amount_change[0]` y `nuevo = amount_change[1]`.

> ⚠ **No se copia el umbral magico 59** de la auditoria legada de `ReportExpense` (hoy dentro del
> concern `RegisterAuditable`, paquete 03). Ese numero existe porque el encabezado alli mide
> exactamente 59 caracteres; aqui se usa `partes.empty?`, que es explicito. §4.7 prohibe tocar el
> umbral de `ReportExpense`, no obliga a heredarlo en codigo nuevo.

> ⚠ **`*_change` devuelve `[anterior, nuevo]`.** La auditoria legada de `ReportExpense` los usa de
> forma inconsistente (para `cost_center_id` toma `names[1]` como nuevo, para `invoice_date` toma
> `[0]`). Codigo nuevo: `[1]` es el nuevo y va en `color-true`.

### Tarea 6 — Esqueleto de `ExpenseBudgetService`

Crear `app/services/` (directorio nuevo; Zeitwerk lo autocarga sin configurar nada) y
`app/services/expense_budget_service.rb`.

```ruby
class ExpenseBudgetService
  STATUS_SIN_PRESUPUESTO = "sin_presupuesto"
  STATUS_APROBADO        = "aprobado"
  STATUS_EXCEDIDO        = "excedido"
  MANAGED_STATUSES       = [STATUS_APROBADO, STATUS_EXCEDIDO].freeze

  LOCK_TIMEOUT_MS = 5_000

  # §2.6 decision 1: se suma invoice_value (SIN IVA), nunca invoice_total.
  # Cast a numeric + ROUND por fila: evita la deriva de sumar floats.
  SPENT_EXPR = Arel.sql("ROUND(CAST(report_expenses.invoice_value AS numeric), 2)")

  Result = Struct.new(:ok, :value, :errors, keyword_init: true) do
    def ok?    = ok
    def error? = !ok
  end

  def self.money(value) # -> "$3.700.000" / "$50.000,50"
end
```

`money`: `ActiveSupport::NumberHelper.number_to_currency(v, unit: "$", delimiter: ".",
separator: ",", precision: (v.frac.zero? ? 0 : 2), format: "%u%n")` con `v = value.to_d.round(2)`.
Los tests afirman el string exacto; no se puede cambiar sin actualizarlos.

> El miembro del Struct se llama `ok`, no `ok?`, **por convencion del proyecto** (§4.2), no porque
> `Struct.new(:ok?)` sea invalido — **si es valido en Ruby 3.1**; lo invalido es el setter `ok?=`.
> El predicado se define en el bloque. **`errors` es SIEMPRE un array**, nunca `:error` singular.

Helper privado de bloqueo (`private_class_method`):
```ruby
def self.with_center_lock(*cost_center_ids, lock_timeout_ms: LOCK_TIMEOUT_MS)
  ids = cost_center_ids.compact.map(&:to_i).uniq.sort   # ORDEN ASCENDENTE OBLIGATORIO
  ActiveRecord::Base.transaction do
    ActiveRecord::Base.connection.execute("SET LOCAL lock_timeout = '#{lock_timeout_ms}ms'")
    ids.each { |id| CostCenter.lock.find(id) }          # SELECT ... FOR UPDATE, una fila a la vez
    yield
  end
rescue ActiveRecord::LockWaitTimeout
  Result.new(ok: false, value: nil,
             errors: ["El centro de costos está siendo actualizado por otra operación. Intente nuevamente"])
rescue ActiveRecord::RecordNotFound
  Result.new(ok: false, value: nil, errors: ["El centro de costos no existe"])
end
```
Tres decisiones que **no se pueden cambiar**:
1. **La fila que se bloquea es `cost_centers`, no `expense_budgets`.** Es el unico punto de
   serializacion que cubre los cuatro casos: (a) dos partidas simultaneas contra el mismo tope,
   (b) dos gastos simultaneos contra la misma partida, (c) un gasto y una edicion de partida a la
   vez, y (d) **dos gastos cuando todavia no existe ninguna partida** — caso en el que no hay
   ninguna fila de `expense_budgets` que bloquear.
2. **Se bloquea de a una fila y en orden de `id` ascendente.** Cuando un gasto se mueve de centro
   hay que bloquear dos centros; sin orden fijo, dos requests inversos producen deadlock. No se usa
   `CostCenter.lock.where(id: [...]).order(:id).to_a`: Postgres puede tomar los locks en orden de
   scan, antes del sort.
3. **Nada de HTTP, ni subida de archivos, ni `recalculate_cost_center` dentro del bloque.** Puma
   tiene 5 hilos y el pool de AR es 5 (`config/database.yml`): una transaccion larga con lock
   agota el pool.

### Tarea 7 — `available_for`

```ruby
def self.available_for(cost_center_id:, user_id:, exclude_expense_id: nil)
  # => { has_budget: true/false, assigned: BigDecimal, spent: BigDecimal, available: BigDecimal }
end
```
1. Si `cost_center_id` o `user_id` estan en blanco → `{has_budget: false, assigned: 0, spent: 0, available: 0}` (BigDecimals).
2. `assigned = ExpenseBudget.activas.para(cc, u).sum(:amount)` → ya es `BigDecimal` (columna decimal).
3. `has_budget = ExpenseBudget.activas.para(cc, u).exists?` — **`exists?`, no `assigned > 0`**: una
   partida activa de $0 no deberia existir (la validacion lo impide) pero el flag debe reflejar
   "hay partida", no "hay plata".
4. `spent`:
   ```ruby
   scope = ReportExpense.where(cost_center_id: cc, user_invoice_id: u)
                        .where.not(budget_status: STATUS_EXCEDIDO)
   scope = scope.where.not(id: exclude_expense_id) if exclude_expense_id.present?
   spent = scope.sum(SPENT_EXPR).to_d.round(2)
   ```
5. `available = (assigned - spent).round(2)` — **puede ser negativo** y se devuelve negativo. El
   paquete 08 decide como pintarlo; el dominio no miente.
6. **No abre transaccion ni toma lock.** Es una lectura; los llamadores que necesiten consistencia
   (el servicio) ya estan dentro del lock.

Los cuatro puntos de §2.6 que este metodo materializa y que los tests afirman uno por uno:
`invoice_value` y no `invoice_total`; todo en COP; los `excedido` **no** cuentan; los
`sin_presupuesto` **si** cuentan.

Ademas, un metodo de conveniencia para el `BudgetSummaryBoard` del **paquete 08** (via el 07;
lectura pura, sin lock):
```ruby
def self.summary_for_center(cost_center_id)
  # CORREGIDO POR AUDITORIA — forma canonica §7.4 / contrato §3 A.3, totales ANIDADOS:
  # => { cost_center: { id:, code:, viatic_value: },
  #      totals:      { viatic_value:, assigned:, unassigned:, spent:, available: },
  #      by_user:     [ { user_id:, user_name:, assigned:, spent:, available:,
  #                       budgets_count:, exceeded_expenses_count: } ] }
end
```
`unassigned = viatic_value.to_d.round(2) - assigned_total`. `by_user` sale de un `group(:user_id)`
sobre `expense_budgets` unido a un `group(:user_invoice_id)` sobre `report_expenses`; **dos queries
agrupadas, no un bucle con N queries**, y `exceeded_expenses_count` sale de una tercera query
agrupada filtrando `budget_status = 'excedido'`.

### Tarea 8 — `evaluate!` (evaluacion de un gasto, en memoria)

```ruby
# Asigna budget_status / budget_reason / expense_budget_id EN MEMORIA. No guarda. No abre
# transaccion. Debe invocarse DENTRO de with_center_lock. Devuelve el propio expense.
def self.evaluate!(expense, actor: nil)
```
1. Si `expense.cost_center_id` o `expense.user_invoice_id` estan en blanco → `sin_presupuesto`,
   `budget_reason = nil`, `expense_budget_id = nil`. Return. (No revienta: `ReportExpense.import`
   puede dejarlos nulos.)
2. `budget = ExpenseBudget.activas.para(cc, u).antiguas_primero.first`.
   Si `budget.nil?` → `sin_presupuesto`, reason `nil`, id `nil`. Return.
3. `disp = available_for(cost_center_id: cc, user_id: u, exclude_expense_id: expense.id)[:available]`.
   `expense.id` es `nil` en un registro nuevo y `available_for` ya ignora el `exclude` en blanco.
4. `valor = [expense.invoice_value.to_d.round(2), 0].max` (un `invoice_value` negativo se trata
   como 0; es dato invalido, no un credito).
5. Si `valor <= 0 || valor <= disp` → `budget_status = "aprobado"`, `budget_reason = nil`,
   `expense_budget_id = budget.id`.
6. Si no → `budget_status = "excedido"`,
   `budget_reason = "Excede el presupuesto disponible en #{money(valor - disp)}"`,
   `expense_budget_id = budget.id`.

**Texto exacto de `budget_reason`** (los tests lo afirman con `assert_equal`):
`"Excede el presupuesto disponible en $50.000"` — sin punto final, con el monto formateado por
`money`. Cuando `disp` es negativo el exceso incluye el saldo en rojo: con `disp = -10.000` y
`valor = 40.000`, el mensaje dice `$50.000`.

Nota: `expense_budget_id` se llena **tambien** en `excedido` (§1.2: es informativo y da
trazabilidad de contra que partida se evaluo).

### Tarea 9 — `persist_with_evaluation!` y `on_expense_destroyed!`

```ruby
def self.persist_with_evaluation!(expense, actor:, previous_cost_center_id: nil, previous_user_invoice_id: nil)
  # => Result(ok:, value: expense recargado, errors: expense.errors.full_messages)
end
```
1. `with_center_lock(expense.cost_center_id, previous_cost_center_id) do`
2. `with_actor(actor) { evaluate!(expense, actor: actor); saved = expense.save }`
   — `with_actor` es un helper privado que hace `User.current = actor` con `ensure` de
   restauracion (§5.3 capa 3). Es imprescindible: los callbacks de `ReportExpense` leen
   `User.current`.
3. Si `!saved` → `Result.new(ok: false, value: expense, errors: expense.errors.full_messages)`.
4. `perform_reevaluation(previous_cost_center_id, previous_user_invoice_id)` si el par cambio.
5. `perform_reevaluation(expense.cost_center_id, expense.user_invoice_id)`.
6. `expense.reload` (el paso 5 escribe con `update_columns` y el objeto en memoria queda viejo).
7. `Result.new(ok: true, value: expense, errors: [])`.

> **Por que se corre el FIFO completo tambien en el create**, si §2.7 dice que en el create solo se
> evalua el gasto nuevo: porque el resultado es identico y elimina una rama de codigo. Prueba: el
> gasto recien creado es el ultimo en orden `created_at ASC`, asi que el FIFO le asigna el cupo
> sobrante — exactamente lo que calculo `evaluate!` — y ningun gasto anterior cambia de estado
> porque su `running` acumulado no depende de los posteriores. El costo es una query extra sobre
> decenas de filas.

```ruby
def self.on_expense_destroyed!(cost_center_id:, user_id:, actor: nil)
  # => Result(ok:, value: <cantidad de gastos que cambiaron de estado>, errors: [])
end
```
Toma el lock del centro y corre `perform_reevaluation`. Se llama **despues** de que el gasto ya
fue destruido. Libera cupo: los `excedido` que ahora caben vuelven a `aprobado`.

> El **paquete 07** debe llamarlo en `ReportExpensesController#destroy` **capturando
> `cost_center_id` y `user_invoice_id` ANTES del `destroy`** (despues el objeto ya no sirve).

### Tarea 10 — `reevaluate_center_user!` y `perform_reevaluation` (FIFO)

```ruby
def self.reevaluate_center_user!(cost_center_id:, user_id:, actor: nil)
  with_center_lock(cost_center_id) { perform_reevaluation(cost_center_id, user_id) }
end

private_class_method def self.perform_reevaluation(cost_center_id, user_id)
  # => Result(ok: true, value: <cantidad de filas modificadas>, errors: [])
end
```
`perform_reevaluation` **asume que el lock ya esta tomado** y **no abre transaccion propia**. Es la
unica forma de que `create_budget!` y `persist_with_evaluation!` la reusen sin anidar
transacciones ni volver a pedir el mismo lock.

Algoritmo, exacto:
1. Si `cost_center_id` o `user_id` en blanco → `Result(ok: true, value: 0, errors: [])`.
2. `assigned = ExpenseBudget.activas.para(cc, u).sum(:amount)`.
3. `budget = ExpenseBudget.activas.para(cc, u).antiguas_primero.first` (puede ser `nil`).
4. `running = BigDecimal(0)`, `changed = 0`.
5. Recorrer `ReportExpense.where(cost_center_id: cc, user_invoice_id: u).order(created_at: :asc, id: :asc)`
   en `find_each`… **no**: `find_each` ignora el `order`. Usar `.each` sobre la relacion ordenada
   (son decenas de filas por persona, §2.7).
6. Por cada gasto `e`:
   - `valor = [e.invoice_value.to_d.round(2), 0].max`
   - **Si `MANAGED_STATUSES.exclude?(e.budget_status)`** (es decir, es `sin_presupuesto`):
     `running += valor` y `next`. **Nunca se le cambia el estado.** Ver Discrepancia D2.
   - Si `budget.nil?` → destino `[sin_presupuesto, nil, nil]` y `running += valor`.
   - Si `valor <= 0 || running + valor <= assigned` → destino `[aprobado, nil, budget.id]`,
     `running += valor`.
   - Si no → destino
     `[excedido, "Excede el presupuesto disponible en #{money(running + valor - assigned)}", budget.id]`,
     y `running` **no** se incrementa (§2.6 decision 3).
   - Si `[e.budget_status, e.budget_reason, e.expense_budget_id] != destino`:
     `e.update_columns(budget_status: ..., budget_reason: ..., expense_budget_id: ..., updated_at: Time.current)`
     y `changed += 1`.
7. `Result.new(ok: true, value: changed, errors: [])`.

Por que `update_columns` y no `update`:
- Salta validaciones y **callbacks**, es decir no dispara `edit_values` (que pisaria
  `last_user_edited_id` con el actor equivocado) ni la auditoria de edicion del concern
  `RegisterAuditable` (que generaria un `RegisterEdit` por cada gasto tocado). §4.7 es explicito: *"el reevaluo masivo por edicion de
  partida escribe un solo `RegisterEdit` de la partida, no uno por cada gasto tocado"*.
- Se escribe solo cuando el destino difiere del estado actual → el reevaluo es **idempotente** y no
  produce ruido en `updated_at`.
- `updated_at: Time.current` se pasa a mano porque `update_columns` no lo toca solo. *Asumido:* si
  se bumpea, porque la pantalla de contabilidad ordena por fecha y el registro efectivamente cambio.

### Tarea 11 — `create_budget!`, `update_budget!`, `destroy_budget!`

Los tres devuelven `Result`. Los tres toman el lock del centro y, tras escribir, corren
`perform_reevaluation` del par afectado.

```ruby
def self.create_budget!(cost_center_id:, user_id:, amount:, notes: nil, actor:)
```
1. `with_center_lock(cost_center_id) do`
2. `budget = ExpenseBudget.new(cost_center_id:, user_id:, amount:, notes:, active: true, created_by_id: actor&.id)`
   — **jamas `user_id: actor.id`**: `user_id` es el beneficiario (§1.1).
3. `with_actor(actor) { budget.save }`. La validacion de tope corre **dentro** del lock: ese es el
   punto entero del bloqueo.
4. Si guardo: `perform_reevaluation(cost_center_id, user_id)` y
   `Result(ok: true, value: budget, errors: [])` — **`errors` siempre array**, nunca `nil` (§7.4).
5. Si no: `Result(ok: false, value: budget, errors: budget.errors.full_messages)`.

```ruby
def self.update_budget!(budget, attrs, actor:)
```
- Si `attrs` trae `cost_center_id` o `user_id` con un valor distinto al actual → `Result(ok: false,
  errors: ["No se puede cambiar el centro de costos ni el beneficiario de una partida; anule esta y cree otra"])`
  **sin escribir nada** (§A.6).
- Solo se aplican `attrs.slice(:amount, :notes, :active)`.
- Lock del centro, `with_actor(actor) { budget.update(permitidos) }`, y si guardo,
  `perform_reevaluation(budget.cost_center_id, budget.user_id)`.
- **Reducir `amount` por debajo de lo ya gastado se permite** (§A.6, caso borde obligatorio): la
  validacion de tope solo mira hacia arriba. Los gastos que ya no caben pasan a `excedido` en el
  reevaluo. **No se bloquea la edicion.**

```ruby
def self.destroy_budget!(budget, actor:)
```
- Captura `cc = budget.cost_center_id`, `u = budget.user_id` **antes** de destruir.
- Lock del centro, `with_actor(actor) { budget.destroy }` (dispara la auditoria de eliminacion y el
  `dependent: :nullify` que deja `expense_budget_id = NULL` en los gastos que apuntaban a ella).
- `perform_reevaluation(cc, u)` — reasigna `expense_budget_id` a la siguiente partida activa si
  queda alguna, o deja todo en `sin_presupuesto` si no queda ninguna.

Y el que la arquitectura nombra en §4.2, como envoltorio publico y sin lock (para que un controller
pueda pre-validar y mostrar el mensaje antes de intentar guardar):
```ruby
def self.validate_cap!(budget)   # => nil | String  (delega en ExpenseBudget.cap_violation_for)
```

### Tarea 12 — `ReportExpense`: asociacion, constantes, scopes y auditoria de `budget_status`

En `app/models/report_expense.rb`, cambios quirurgicos:

1. `belongs_to :expense_budget, optional: true` junto a los demas `belongs_to`, **y** la constante
   de etiquetas legibles que 🔴 la auditoria (correccion 4, §7.4) asigna a esta tarea: dos paquetes
   la esperaban y **ninguno la creaba**.
   ```ruby
   # app/models/report_expense.rb
   BUDGET_STATUS_LABELS = { "sin_presupuesto" => "Sin presupuesto",
                            "aprobado"        => "Aprobado",
                            "excedido"        => "Excedido" }.freeze
   ```
   El paquete 06 **borra su fallback** ("si no existe se crea aqui") y el 11 la consume directo.
2. Scopes:
   ```ruby
   scope :presupuesto_aprobado,  -> { where(budget_status: "aprobado") }
   scope :presupuesto_excedido,  -> { where(budget_status: "excedido") }
   scope :sin_presupuesto,       -> { where(budget_status: "sin_presupuesto") }
   scope :no_excedidos,          -> { where.not(budget_status: "excedido") }
   ```
   `no_excedidos` es la base literal de la vista de contabilidad (§2.3); se define aqui para que el
   paquete **06** (contabilidad) no la reescriba.
3. `validates :budget_status, inclusion: { in: %w[sin_presupuesto aprobado excedido] }`.
4. 🔴 **REESCRITA por auditoria (correccion 3).** La instruccion original —*"agregar una linea de
   `budget_status` DENTRO de `create_edit_register` y sumarla a la interpolacion de `str`"*— apunta
   a un metodo que **ya no existe**: el paquete 03 (dependencia dura) borra
   `create_edit_register` / `create_create_register` / `create_destroy_register` de `ReportExpense`
   y los reemplaza por el concern `RegisterAuditable`. Instruccion vigente:
   ```ruby
   audit_field :budget_status, label: "Estado presupuestal"   # paquete 04
   ```
   mas su entrada en la lista `edit_fields` de `audit_register`, **y actualizar la constante golden
   `HTML_EDICION` del paquete 03 agregando el segmento al final, en el mismo PR.** Los 14 tests
   golden del 03 **no se relajan ni se borran**: se extienden.
   **No se toca el encabezado** `"<p><p><strong>(SE EDITO EL SIGUIENTE REGISTRO)</strong></p>"`
   **ni el umbral magico de 59** (§4.7): siguen viviendo dentro del concern del 03 y son suyos.
5. **`budget_status` solo entra en `edit_fields`**, no en las listas de creacion ni de eliminacion
   de `audit_register`. *Asumido:* en la creacion el estado siempre se setea y auditarlo es ruido;
   en la eliminacion el registro desaparece.

**Nada mas se toca en este archivo.** En particular, `self.search` / `SEARCH_KEYS` quedan como los
dejo el **paquete 03**, su dueño unico (§7.2), y `self.import` tampoco se toca (los campos
presupuestales no son importables).

### Tarea 13 — `CostCenter`: `has_many :expense_budgets`

Una linea en `app/models/cost_center.rb`, junto a `has_many :report_expenses, dependent: :destroy`
(se referencia por **nombre de asociacion**, no por numero de linea — correccion de auditoria 11):
```ruby
has_many :expense_budgets, dependent: :destroy
```
`dependent: :destroy` y no `:delete_all` para que la auditoria de eliminacion de cada partida
quede registrada. El `current_actor_id` con fallback evita que reviente cuando el centro se borra
desde consola.

### Tarea 14 — Fixtures `expense_budgets.yml`

> **Propiedad.** §7.2 asigna al paquete 01 las fixtures base (`rols`, `users`, `customers`,
> `cost_centers`, `module_controls`, `accion_modules`, `parameterizations`, `report_expenses`).
> `expense_budgets.yml` **no** esta en esa lista: el 01 declara explicitamente que no la crea y la
> correccion 7 del paquete 02 la difiere al paquete que crea el modelo, es decir **este**. Por eso
> sigue viva esta tarea. Este paquete **no reescribe ni renombra** ninguna etiqueta de las fixtures
> del 01; solo las referencia.

Con cabecera `# == Schema Information` de `annotate`. Etiquetas semanticas, **todas las FK por
etiqueta** (`cost_center: centro_con_viaticos`), nunca por id (§5.4 punto 4):

| Etiqueta | Contenido |
|---|---|
| `activa_ingeniero` | `cost_center: centro_con_viaticos`, `user: ingeniero`, `amount: 500000.0`, `active: true`, `created_by: admin` |
| `activa_ingeniero_segunda` | mismo par que la anterior, `amount: 200000.0`, `created_at` posterior — para probar "imputa a la mas antigua" |
| `inactiva_ingeniero` | mismo par, `amount: 900000.0`, `active: false` — no aporta cupo |
| `activa_otro_usuario` | mismo centro, `user: contador`, `amount: 300000.0` — para probar que el tope es por centro |
| `centro_sin_viaticos` | `cost_center: centro_sin_viaticos` (con `viatic_value: nil`), `amount: 100000.0` — **debe insertarse aunque viole el tope**, porque las fixtures se cargan con `insert` crudo y no ejecutan validaciones; sirve para probar que la validacion se dispara al *guardar*, no al *leer* |

`created_at` explicito y distinto en las partidas del mismo par (`2026-01-01 08:00:00` /
`2026-02-01 08:00:00`) para que `antiguas_primero` sea determinista.

Cerrar la tarea corriendo `bin/rails test test/models` **completo**, no solo el archivo propio: una
fixture rota tumba toda la suite (§5.4 punto 1).

### Tarea 15 — Publicar el CONTRATO DE CABLEADO (sin tocar el controller)

🔴 **REESCRITA por auditoria (correccion 9).** Esta tarea dejo de ser "documentar el cableado" y
pasa a ser un **contrato exigible**. El comentario de bloque se conserva —es la fuente literal que
copian los consumidores— pero ahora tiene contraparte obligatoria en otros dos paquetes:

- El **paquete 07** tiene una tarea explicita que lo implementa en `create` / `update` / `destroy`
  de `ReportExpensesController`, con test de integracion (`POST /report_expenses` con partida
  vigente deja `budget_status = "aprobado"`). Sin ese cableado, `budget_status` **nunca** se
  calcula por la via web y el tablero del 08, las columnas del 09 y la vista de contabilidad del
  06 muestran datos falsos.
- El **paquete 11** usa el **mismo** `persist_with_evaluation!` en su tool MCP de creacion de
  gastos. El `save` + `evaluate!` + `reload` que describia queda derogado: pierde los tres valores
  en el `reload` y deja en `sin_presupuesto` todo gasto creado por WhatsApp (§7.4).

Este paquete sigue **sin** modificar el controller ni las tools: solo publica el contrato al final
de `app/services/expense_budget_service.rb`, literal:

```ruby
# CABLEADO OBLIGATORIO (lo implementa el paquete 07; el 11 usa el mismo punto de entrada):
#
#   create:  expense = ReportExpense.new(report_expense_params_create)
#            result  = ExpenseBudgetService.persist_with_evaluation!(expense, actor: current_user)
#
#   update:  prev_cc = @report_expense.cost_center_id
#            prev_u  = @report_expense.user_invoice_id
#            @report_expense.assign_attributes(report_expense_params_update)
#            result  = ExpenseBudgetService.persist_with_evaluation!(
#                        @report_expense, actor: current_user,
#                        previous_cost_center_id: prev_cc, previous_user_invoice_id: prev_u)
#
#   destroy: cc = @report_expense.cost_center_id; u = @report_expense.user_invoice_id
#            @report_expense.destroy
#            ExpenseBudgetService.on_expense_destroyed!(cost_center_id: cc, user_id: u, actor: current_user)
#
#   recalculate_cost_center(...) se sigue llamando en el controller, DESPUES y FUERA del
#   servicio: es un helper de controller que depende de la ivar @cost_center y no puede vivir
#   dentro de una transaccion con lock.
```

---

## Pruebas unitarias (Minitest)

Total: **85 tests** en 7 archivos (21 + 8 + 11 + 15 + 16 + 10 + 4), incluidos los **2 tests nuevos
obligatorios** de la correccion de auditoria 10. Todo test que cree/edite/borre un gasto, un centro
o una partida va envuelto en `as_user(users(:admin)) { ... }` (§5.3 capa 2).

### `test/models/expense_budget_test.rb` (21 tests)

| Test | Asercion |
|---|---|
| `test_requiere_cost_center` | `ExpenseBudget.new(user:, amount: 1)` invalido; `assert_includes budget.errors.attribute_names, :cost_center` |
| `test_requiere_user_beneficiario` | Invalido sin `user`; error en `:user` |
| `test_requiere_amount` | `amount: nil` invalido, error en `:amount` |
| `test_amount_cero_es_invalido` | `amount: 0` invalido con mensaje de `greater_than` |
| `test_amount_negativo_es_invalido` | `amount: -1` invalido |
| `test_active_por_defecto_true` | `ExpenseBudget.new.active == true` (default de columna; requiere el esquema del **paquete 02** ya aplicado en la base de test — ver Precondicion verificable) |
| `test_notes_opcional` | `notes: nil` valido |
| `test_notes_supera_1000_caracteres` | `"x" * 1001` invalido |
| `test_scope_activas_excluye_inactivas` | `ExpenseBudget.activas` no incluye `expense_budgets(:inactiva_ingeniero)` |
| `test_scope_para_filtra_por_centro_y_usuario` | `.para(cc.id, u.id).count == 3` con las fixtures |
| `test_scope_antiguas_primero_ordena_por_created_at` | `.antiguas_primero.first == expense_budgets(:activa_ingeniero)` |
| `test_tope_cabe_justo` | Centro con `viatic_value: 1_000_000`, ya asignados 600.000; una partida de 400.000 es **valida** |
| `test_tope_se_pasa_por_un_peso` | Misma situacion, 400.001 → **invalida** |
| `test_tope_mensaje_exacto` | `assert_equal "La suma de las partidas ($1.000.001) supera el valor de viáticos del centro de costos ($1.000.000). Disponible para asignar: $400.000", budget.errors[:amount].first` |
| `test_tope_viatic_value_nil` | Centro con `viatic_value: nil` → invalido con `"El centro de costos no tiene valor de viáticos cotizado; no es posible asignar partidas"` |
| `test_tope_viatic_value_cero` | Mismo mensaje que el anterior |
| `test_tope_excluye_la_propia_partida_al_editar` | Partida de 500.000 en centro de 500.000; editarla a 500.000 (sin cambio real) y a 499.999 son **validas**; a 500.001 invalida |
| `test_tope_ignora_partidas_inactivas` | Con `inactiva_ingeniero` de 900.000 presente, una nueva que llene el cupo restante es valida |
| `test_tope_suma_partidas_de_otros_usuarios_del_mismo_centro` | Con `activa_otro_usuario` de 300.000, el cupo disponible del centro baja para **todos**; una partida del ingeniero que ignore esos 300.000 es invalida |
| `test_desactivar_partida_en_centro_sin_viaticos_es_valido` | `centro_sin_viaticos` fixture, `update(active: false)` → `assert budget.valid?`. Caso borde: desactivar nunca falla por tope |
| `test_destruir_partida_deja_expense_budget_id_nulo` | Gasto con `expense_budget_id` apuntando a la partida; tras `budget.destroy`, `expense.reload.expense_budget_id.nil?` |

### `test/models/expense_budget_audit_test.rb` (8 tests)

| Test | Asercion |
|---|---|
| `test_crear_partida_genera_register_edit` | `assert_difference("RegisterEdit.count", 1)`; el ultimo tiene `module == "Presupuesto"`, `type_edit == "creo"`, `user_id == admin.id`, `register_user_id == beneficiario.id` |
| `test_crear_partida_registra_valor_y_beneficiario` | `description` incluye `"$500.000"` y `users(:ingeniero).names` |
| `test_editar_amount_genera_register_con_anterior_y_nuevo` | `description` incluye el valor nuevo dentro de `color-true` y el anterior dentro de `color-false`, en ese orden |
| `test_editar_active_genera_register` | `description` incluye `"Estado:"`, `"Inactiva"` y `"Activa"` |
| `test_guardar_sin_cambios_no_genera_register` | `budget.save` sin modificar nada → `assert_no_difference("RegisterEdit.count")` |
| `test_eliminar_partida_genera_register_elimino` | `type_edit == "elimino"`, `module == "Presupuesto"` |
| `test_sin_user_current_usa_created_by_como_actor` | `as_user(nil) { budget.update!(amount: 1000) }` → el `RegisterEdit` queda con `user_id == created_by_id`, sin excepcion |
| `test_sin_ningun_actor_no_crea_register_ni_revienta` | Partida con `created_by_id`, `last_user_edited_id` y `user_id` todos nil no es construible (user es requerido) ⇒ el test fuerza `User.current = nil` y `created_by_id = nil` y afirma que se guarda igual y que el `RegisterEdit` se crea con `user_id == user_id` del beneficiario (fallback final) |

### `test/services/expense_budget_service_available_test.rb` (11 tests)

| Test | Asercion |
|---|---|
| `test_sin_partidas_devuelve_has_budget_false` | `has_budget == false` y `assigned/spent/available` en `BigDecimal(0)` |
| `test_suma_solo_partidas_activas` | Con activa 500.000 + inactiva 900.000 → `assigned == 500_000` |
| `test_suma_invoice_value_y_no_invoice_total` | Gasto con `invoice_value: 100_000, invoice_tax: 19_000, invoice_total: 119_000` → `spent == 100_000` |
| `test_excluye_los_excedidos_del_gastado` | Gasto `excedido` de 80.000 no aparece en `spent` |
| `test_incluye_los_sin_presupuesto_del_gastado` | Gasto historico `sin_presupuesto` de 80.000 **si** aparece en `spent` |
| `test_incluye_los_aprobados_del_gastado` | idem con `aprobado` |
| `test_respeta_exclude_expense_id` | Con `exclude_expense_id` del unico gasto, `spent == 0` |
| `test_exclude_expense_id_nil_no_filtra_nada` | Con `exclude_expense_id: nil`, `spent` es igual que sin el parametro. **Trampa #1**: si el codigo hace `where.not(id: nil)` este test da `spent == 0` y falla |
| `test_no_mezcla_otros_usuarios_ni_otros_centros` | Gastos de otro `user_invoice_id` y de otro `cost_center_id` no suman |
| `test_devuelve_bigdecimal` | `assert_kind_of BigDecimal, result[:spent]` (los tres montos) |
| `test_disponible_negativo_cuando_lo_gastado_supera_lo_asignado` | `assigned 100_000`, `spent 150_000` → `available == BigDecimal("-50000.0")` |

### `test/services/expense_budget_service_evaluate_test.rb` (15 tests)

| Test | Asercion |
|---|---|
| `test_sin_partida_queda_sin_presupuesto` | `budget_status == "sin_presupuesto"`, `budget_reason.nil?`, `expense_budget_id.nil?` |
| `test_cabe_queda_aprobado` | `budget_status == "aprobado"`, `budget_reason.nil?` |
| `test_cabe_justo_queda_aprobado` | Asignado 500.000, gasto de exactamente 500.000 → `aprobado` |
| `test_se_pasa_por_un_peso_queda_excedido` | Gasto de 500.001 → `excedido` |
| `test_el_gasto_excedido_se_guarda_igual` | `assert expense.persisted?` y `assert result.ok?` — requisito explicito de la propuesta §3.2 |
| `test_texto_exacto_de_budget_reason` | `assert_equal "Excede el presupuesto disponible en $50.000", expense.budget_reason` |
| `test_budget_reason_con_decimales` | Exceso de 50.000,50 → `"Excede el presupuesto disponible en $50.000,50"` |
| `test_imputa_a_la_partida_activa_mas_antigua` | Con dos partidas activas del par, `expense_budget_id == expense_budgets(:activa_ingeniero).id` |
| `test_excedido_tambien_guarda_expense_budget_id` | `excedido` con `expense_budget_id` no nulo |
| `test_partida_inactiva_no_da_cupo` | Solo `inactiva_ingeniero` presente → `sin_presupuesto` |
| `test_gasto_de_valor_cero_queda_aprobado_y_no_consume` | `invoice_value: 0` con partida → `aprobado`; el `available` posterior no cambia |
| `test_gasto_sin_cost_center_o_sin_user_invoice_no_revienta` | `evaluate!` sobre un gasto con `user_invoice_id = nil` → `sin_presupuesto`, sin excepcion |
| `test_editar_gasto_no_se_cuenta_contra_si_mismo` | Asignado 200.000, gasto existente `aprobado` de 100.000; subirlo a 150.000 → sigue `aprobado` (si se contara a si mismo, 100.000 + 150.000 > 200.000 y quedaria `excedido`) |
| `test_persist_devuelve_result_error_si_el_gasto_es_invalido` | Gasto sin `cost_center` (requerido) → `result.error?`, `result.errors.any?`, `ReportExpense.count` sin cambio |
| 🔴 `test_evaluate_es_idempotente` | **Nuevo, obligatorio (correccion 10).** Llamar `evaluate!` dos veces seguidas sobre el mismo gasto produce exactamente el mismo `budget_status`, el mismo `budget_reason` y el mismo `expense_budget_id`. Lo exige por contrato el paquete 11 (§7.4: "Idempotente") |

### `test/services/expense_budget_service_reevaluate_test.rb` (16 tests)

| Test | Asercion |
|---|---|
| `test_fifo_los_mas_viejos_conservan_el_cupo` | Asignado 100.000; tres gastos de 60.000 creados en orden → el 1ro `aprobado`, el 2do y 3ro `excedido` |
| `test_reducir_partida_bajo_lo_gastado_empuja_a_excedido_a_los_mas_nuevos` | Asignado 200.000 con dos gastos `aprobado` de 100.000; `update_budget!(amount: 100_000)` → el mas viejo sigue `aprobado`, el mas nuevo pasa a `excedido`. **Y `result.ok?` es true**: reducir no se bloquea |
| `test_reducir_partida_bajo_lo_gastado_no_bloquea_la_edicion` | `assert result.ok?` y `budget.reload.amount == 100_000` |
| `test_ampliar_partida_recupera_excedidos` | Un `excedido` de 60.000; ampliar la partida → pasa a `aprobado` y `budget_reason` queda `nil` |
| `test_desactivar_partida_deja_los_gestionados_en_sin_presupuesto` | `update_budget!(active: false)` → los `aprobado`/`excedido` del par pasan a `sin_presupuesto` con `expense_budget_id` nulo |
| `test_eliminar_partida_nulifica_y_reevalua` | `destroy_budget!` → `expense_budget_id` nulo en los gastos y estado `sin_presupuesto` |
| `test_eliminar_una_de_dos_partidas_reimputa_a_la_que_queda` | Con dos partidas activas, borrar la mas antigua deja `expense_budget_id` apuntando a la segunda |
| `test_sin_presupuesto_nunca_cambia_de_estado_en_el_reevaluo` | Gasto historico `sin_presupuesto`; crear una partida que lo cubriria → **sigue** `sin_presupuesto` (Discrepancia D2) |
| `test_sin_presupuesto_si_consume_cupo_en_el_reevaluo` | Asignado 100.000, historico `sin_presupuesto` de 80.000 mas antiguo, gasto gestionado de 50.000 → el gestionado queda `excedido` con `"...en $30.000"` |
| `test_reevaluo_escribe_un_solo_register_edit` | `assert_difference("RegisterEdit.count", 1) { update_budget!(...) }` con 5 gastos afectados. Es el de la partida, no uno por gasto (§4.7) |
| `test_reevaluo_no_pisa_last_user_edited_id_de_los_gastos` | `last_user_edited_id` de los gastos igual antes y despues |
| `test_reevaluo_no_toca_is_acepted_ni_accounting_approved` | Los dos valores intactos tras el reevaluo (invariante #1) |
| `test_reevaluo_es_idempotente` | Correrlo dos veces: la segunda devuelve `value == 0` y ningun `updated_at` cambia |
| `test_editar_gasto_cambiando_de_centro_reevalua_ambos_pares` | Gasto que se mueve del centro A al B: en A un `excedido` vuelve a `aprobado`, y en B el gasto movido se evalua contra la partida de B |
| 🔴 `test_gasto_aprobado_contablemente_empujado_a_excedido_conserva_la_aprobacion` | **Nuevo, obligatorio (correccion 10).** Gasto con `accounting_approved: true`; reducir la partida hasta empujarlo a `excedido`; afirmar que `accounting_approved` **sigue true** y que `accounting_approved_at` queda **sin cambios**. Fija la fila mas delicada de la tabla de verdad de §2.4, que hoy no prueba nadie |

Mas, en el mismo archivo, el caso de eliminacion de gasto:
- `test_on_expense_destroyed_libera_cupo` — dos gastos, el 2do `excedido`; destruir el 1ro y llamar
  `on_expense_destroyed!` → el 2do pasa a `aprobado`.

### `test/services/expense_budget_service_cap_test.rb` (10 tests)

| Test | Asercion |
|---|---|
| `test_create_budget_ok` | `result.ok?`, `result.value.persisted?`, `created_by_id == actor.id`, `user_id == beneficiario.id` (**no** el actor) |
| `test_create_budget_supera_tope` | `result.error?`, `result.errors.first` igual al string exacto de §A.5, y `ExpenseBudget.count` sin cambio |
| `test_create_budget_centro_sin_viaticos` | `result.errors.first == "El centro de costos no tiene valor de viáticos cotizado; no es posible asignar partidas"` |
| `test_update_budget_rechaza_cambio_de_cost_center_id` | `result.error?` con el mensaje de §A.6 y `budget.reload.cost_center_id` sin cambio |
| `test_update_budget_rechaza_cambio_de_user_id` | idem |
| `test_update_budget_ignora_claves_no_permitidas` | Pasar `created_by_id` en `attrs` no lo modifica |
| `test_destroy_budget_ok` | `result.ok?` y `ExpenseBudget.exists?(id)` falso |
| `test_validate_cap_devuelve_nil_cuando_cabe` | `assert_nil ExpenseBudgetService.validate_cap!(budget)` |
| `test_create_budget_emite_select_for_update_sobre_cost_centers` | Con `ActiveSupport::Notifications.subscribe("sql.active_record")` capturar los SQL de la llamada y `assert sqls.any? { \|s\| s =~ /FOR UPDATE/ && s =~ /cost_centers/ }`. **Determinista y barato: es el guardian real de que el lock no se borre en un refactor** |
| `test_persist_with_evaluation_emite_select_for_update` | Igual, sobre el camino del gasto |

### `test/services/expense_budget_service_concurrency_test.rb` (4 tests)

```ruby
class ExpenseBudgetServiceConcurrencyTest < ActiveSupport::TestCase
  self.use_transactional_tests = false      # OBLIGATORIO: ver abajo
```

**Por que `use_transactional_tests = false`.** Por defecto Minitest envuelve cada test en una
transaccion que nunca se commitea. Un segundo hilo usa **otra conexion** y por tanto **no ve** los
datos creados por el test: cualquier prueba de concurrencia dentro de la transaccion de test
mide otra cosa. Costo: hay que limpiar a mano. `setup` y `teardown` hacen
`ReportExpense.delete_all` y `ExpenseBudget.delete_all` (`delete_all`, no `destroy_all`: sin
callbacks, sin `User.current`, sin `RegisterEdit`).

| Test | Que hace y que afirma |
|---|---|
| `test_el_lock_bloquea_a_una_segunda_conexion` | **El test determinista, el que importa.** Hilo A abre `ActiveRecord::Base.transaction`, hace `CostCenter.lock.find(cc.id)`, avisa por un `Queue` y se queda esperando. El hilo principal, en `connection_pool.with_connection`, abre su propia transaccion con `SET LOCAL lock_timeout = '300ms'` e intenta `CostCenter.lock.find(cc.id)`: `assert_raises(ActiveRecord::LockWaitTimeout) { ... }`. Luego libera A. Prueba que el `FOR UPDATE` cae **sobre la fila correcta** y que efectivamente bloquea. No depende de ninguna carrera |
| `test_dos_gastos_simultaneos_no_superan_el_tope` | Partida de 100.000. Dos hilos, cada uno con `connection_pool.with_connection`, crean un gasto de 60.000; barrera de arranque con dos `Queue` (`ready`/`go`) para que empiecen a la vez. `join`. Afirma: exactamente 1 `aprobado` y 1 `excedido`, y `ReportExpense.presupuesto_aprobado.sum(:invoice_value) <= 100_000`. Se repite el cuerpo **10 veces** en un bucle |
| `test_dos_partidas_simultaneas_no_superan_viatic_value` | Centro con `viatic_value: 100_000`, sin partidas. Dos hilos crean cada uno una partida de 60.000 con `create_budget!`. Afirma: exactamente un `result.ok?` y uno con error, y `ExpenseBudget.activas.where(cost_center_id: cc.id).sum(:amount) <= 100_000` |
| `test_lock_timeout_devuelve_result_con_error_y_no_excepcion` | Con la fila bloqueada por otro hilo, `create_budget!` devuelve `Result` con `errors == ["El centro de costos está siendo actualizado por otra operación. Intente nuevamente"]` y **no** propaga la excepcion. (Requiere bajar `LOCK_TIMEOUT_MS` para el test: se hace con `ExpenseBudgetService.stub_const`… que no existe en Minitest ⇒ **se implementa leyendo el timeout de una constante que el test reasigna con `silence_warnings { ExpenseBudgetService::LOCK_TIMEOUT_MS = 300 }`**, o mas limpio: el helper acepta `lock_timeout_ms:` como kwarg con default `LOCK_TIMEOUT_MS`. **Decidido: kwarg**) |

**Honestidad sobre las limitaciones de estos tests** (leer antes de confiar en el verde):

1. `test_dos_gastos_simultaneos...` es **corroborativo, no probatorio**. Aun con la barrera, el
   planificador puede ejecutar los dos hilos en serie y el test pasa **igual si se borra el
   `FOR UPDATE`** — porque sin lock las dos transacciones pueden aun asi no solaparse. Por eso las
   10 repeticiones, y por eso **no es el test que defiende el invariante**.
2. El test que defiende el invariante es `test_el_lock_bloquea_a_una_segunda_conexion` (prueba que
   el lock existe y sobre que fila) mas `test_create_budget_emite_select_for_update_sobre_cost_centers`
   (prueba que el camino de escritura lo toma). Juntos son deterministas. Si alguien borra el lock,
   esos dos fallan siempre; el de los dos hilos falla a veces.
3. **No se prueba el nivel de aislamiento de Postgres.** Se asume `READ COMMITTED` (el default). Con
   `SERIALIZABLE` habria que rescatar `ActiveRecord::SerializationFailure`; no se cambia el
   aislamiento en este proyecto.
4. `use_transactional_tests = false` **deja datos si un test revienta a mitad**. El `teardown` corre
   igual (Minitest lo garantiza salvo un `exit!`), pero si aparece contaminacion entre corridas, la
   solucion es `bin/rails db:test:prepare`, no debuggear el test.
5. Este archivo es el **unico** con `use_transactional_tests = false`. No propagar el patron: hace
   la suite mas lenta y frágil.

**Alternativa evaluada y descartada:** simular la concurrencia con un `stub` que intercale las dos
evaluaciones dentro de un solo hilo. Se descarto porque prueba la logica del algoritmo (que ya
cubren los tests de FIFO) y **no** prueba que exista el `FOR UPDATE`, que es justo lo unico que la
concurrencia real puede romper.

---

## Pruebas E2E (Playwright)

**No aplica a este paquete.** No tiene superficie de usuario: no hay rutas, ni controllers, ni
componentes React. Este paquete **no escribe ni un solo spec** en `test/e2e/specs/`: todos los
specs funcionales tienen un unico dueño, el **paquete 12** (§7.2), y la infraestructura Playwright
es del **01**. Los `data-testid` canonicos estan en §7.6 y los definen los paquetes de UI.

Los dos flujos E2E de §5.2 que **dependen** de este dominio (el 2, "crear una partida que excede el
tope y ver el mensaje de bloqueo con el disponible correcto", y el 3, "registrar un gasto que cabe
→ badge Aprobado; otro que no cabe → badge Excedido con el motivo") los escribe el **paquete 12**.
Lo que este paquete les debe garantizar es que **los strings que esos E2E van a buscar en pantalla
salen del dominio y estan congelados por test unitario**:

- `"La suma de las partidas ($X) supera el valor de viáticos del centro de costos ($Y). Disponible para asignar: $Z"`
- `"Excede el presupuesto disponible en $X"`
- `"El centro de costos no tiene valor de viáticos cotizado; no es posible asignar partidas"`

Si un paquete de UI (08 / 09) necesita cambiar alguno de esos textos, se cambia **aqui** y se
actualizan los tests unitarios; no se duplica el texto en el frontend.

---

## Criterios de aceptacion

Verificables con si/no, sin opinar:

1. **PRECONDICION (la entrega el paquete 02, no este):** `db/schema.rb` contiene la tabla
   `expense_budgets` con sus **10 columnas** (`id` + las 9 de negocio/auditoria) y los 3 indices
   de §1.1. El agente lo verifica con el
   `raise "Falta el paquete 02"` de la seccion Dependencias **antes de escribir codigo**, y
   `git diff --stat` de este paquete **no toca `db/migrate/` ni `db/schema.rb`**.
2. **PRECONDICION (paquete 02):** `db/schema.rb` contiene `expense_budget_id`, `budget_status`
   (default `"sin_presupuesto"`, `null: false`) y `budget_reason` en `report_expenses`, con sus 2
   indices.
3. `bin/rails test` corre con **0 failures y 0 errors** (incluye toda la suite, no solo los archivos
   nuevos).
4. Existe `app/services/expense_budget_service.rb` y responde a: `available_for`,
   `summary_for_center`, `evaluate!`, `persist_with_evaluation!`, `on_expense_destroyed!`,
   `reevaluate_center_user!`, `create_budget!`, `update_budget!`, `destroy_budget!`,
   `validate_cap!`, `money`.
5. `grep -rn "invoice_total" app/services/expense_budget_service.rb` no devuelve nada (el gastado es
   sin IVA, §2.6 decision 1).
6. `grep -rn "User.current" app/services/expense_budget_service.rb` solo aparece dentro del helper
   `with_actor` (§4.2: el actor entra por parametro).
7. `grep -rn "recalculate_cost_center\|HTTParty\|Net::HTTP" app/services/expense_budget_service.rb`
   no devuelve nada (nada lento dentro del lock).
8. Los 5 archivos de `test/services/` y los 2 de `test/models/` existen y suman **85 tests** con
   `bin/rails test test/services test/models/expense_budget_test.rb test/models/expense_budget_audit_test.rb`.
   Entre ellos estan, con esos nombres exactos, los dos de la correccion 10:
   `test_evaluate_es_idempotente` y
   `test_gasto_aprobado_contablemente_empujado_a_excedido_conserva_la_aprobacion`.
9. `test_create_budget_emite_select_for_update_sobre_cost_centers` pasa, y falla si se quita el
   `CostCenter.lock.find` del servicio (verificarlo comentando la linea una vez).
10. `test_el_lock_bloquea_a_una_segunda_conexion` pasa en menos de 3 s.
11. Crear una partida cuya suma con las activas del **centro** (no del par) supera `viatic_value` es
    rechazado, y el mensaje contiene los tres montos formateados con separador de miles `.`.
12. Crear una partida en un centro con `viatic_value` nil o 0 es rechazado con el mensaje de "sin
    valor de viáticos cotizado".
13. `update_budget!` con `amount` por debajo de lo ya gastado **retorna `ok?` true**, guarda, y deja
    en `excedido` a los gastos mas nuevos que ya no caben (nunca a los mas viejos).
14. Un gasto historico con `budget_status = "sin_presupuesto"` **conserva ese estado** despues de
    crear, editar o eliminar cualquier partida de su par, y sigue contando en `spent`.
15. Un reevaluo masivo que cambia 5 gastos genera **exactamente 1** `RegisterEdit` (el de la
    partida) y **0** cambios en `last_user_edited_id`, `is_acepted` y `accounting_approved` de esos
    gastos.
16. Crear, editar y eliminar una partida genera un `RegisterEdit` con `module == "Presupuesto"` y
    `type_edit` en `{"creo", "edito", "elimino"}`; guardar una partida sin cambios genera 0.
17. `ExpenseBudget.create!(...)` desde consola, **sin pasar por el servicio**, sigue rechazando una
    partida que supera el tope (la regla vive en el modelo).
18. `grep -n "user_id: actor" app/services/expense_budget_service.rb` no devuelve nada; `created_by_id`
    es el unico campo que recibe el actor.
19. `db/migrate/`, `db/schema.rb`, `app/controllers/`, `config/routes.rb`, `app/serializers/`,
    `app/javascript/`, `app/tools/` y `test/e2e/` no tienen cambios en el diff del paquete
    (`git diff --stat` lo confirma).
20. `ReportExpense.search`, `SEARCH_KEYS` y `ReportExpense.import` no tienen cambios en el diff
    (dueño del `search`: paquete 03; invariantes #6 y #7 se respetan por omision).
21. `bundle exec annotate` corrio sobre los archivos **propios**: `app/models/expense_budget.rb` y
    `test/fixtures/expense_budgets.yml` tienen la cabecera `# == Schema Information` actualizada.
    Las cabeceras de `app/models/report_expense.rb` y `test/fixtures/report_expenses.yml` ya las
    dejo el paquete 02 y **no** se regeneran aqui.
22. `ReportExpense::BUDGET_STATUS_LABELS` existe, esta congelada y tiene exactamente las 3 claves
    `sin_presupuesto` / `aprobado` / `excedido` (§7.4). Ningun otro paquete la define.
23. `ReportExpense.audit_fields` incluye `:budget_status`, la constante golden `HTML_EDICION` de
    `test/models/report_expense_audit_legacy_test.rb` (paquete 03) trae el segmento nuevo al final,
    y los **14 tests golden del 03 siguen en verde** — en el mismo PR.
24. `ExpenseBudget.new.respond_to?(:spent_amount=)` y `:available_amount=` son `true` (§7.4).
25. `ExpenseBudgetService.summary_for_center(id)` devuelve las 3 claves de primer nivel
    `cost_center` / `totals` / `by_user`, con los totales **anidados** en `totals` (§7.4). La forma
    plana anterior no aparece en ningun test ni en ningun comentario.
26. **Condicion de merge (correccion 13).** El PR cita el acta de la **Tarea 0** (§7.10) con las
    decisiones **0.1** ("los historicos consumen presupuesto") y **0.2** ("sin IVA,
    `invoice_value`") **firmadas por el cliente**. Los defaults ya estan implementados, pero sin la
    firma escrita este paquete **no se mergea**.

---

## Riesgos y trampas

**Trampa #1 — `where.not(id: nil)` no filtra nada, filtra TODO.** En SQL, `id <> NULL` es `NULL`,
es decir falso para toda fila: `scope.where.not(id: nil)` devuelve **cero** registros. Aparece en
dos lugares de este paquete: `available_for(exclude_expense_id:)` cuando el gasto es nuevo (id nil)
y `cap_violation_for(exclude_id:)` cuando la partida es nueva. **Siempre condicionar el
`where.not` con `.present?`.** Sintoma si se cae: todo gasto queda `aprobado` porque `spent` da 0.
Hay un test dedicado (`test_exclude_expense_id_nil_no_filtra_nada`).

**Trampa #2 — `User.current` es `nil` fuera de un request.** `ReportExpense` tiene 5 llamadas a
`User.current.id` sin guarda, repartidas en `edit_values`, `create_edit_register` (dos),
`create_create_register` y `create_destroy_register`. **Se referencian por nombre de metodo, no por
numero de linea** (regla del proyecto, correccion de auditoria 11: las citas originales
`create_create_register:276` y `create_destroy_register:338` estaban corridas en uno — las lineas
reales eran **275** y **337** —, y despues del paquete 03 esos metodos ya viven en el concern
`RegisterAuditable`). El **paquete 01** pone la guarda `current_actor_id`; si por alguna razon no
esta, **todo** test que guarde un gasto revienta con `NoMethodError on nil`. El servicio se protege
por su lado con `with_actor`, pero no reemplaza la guarda del modelo.

**Trampa #3 — sumar floats.** `invoice_value` es `float` (invariante #2). `SUM` de floats en
Postgres acumula error: 3 gastos de 33.333,33 pueden dar 99.999,98999999999. Un test de "cabe
justo" falla por 2 centesimos si no se redondea. **Obligatorio** usar `SPENT_EXPR`
(`ROUND(CAST(... AS numeric), 2)` **por fila**, no sobre la suma) y `.to_d.round(2)` en cada valor
individual. Nunca comparar un float con un BigDecimal sin convertir; nunca convertir el decimal a
float para comparar (§1.7: el float se convierte con `.to_d.round(2)`, jamas al reves).

**Trampa #4 — `viatic_value` puede ser `nil`.** La columna lo permite y hay centros asi en
produccion. `nil.to_d` es `0` y el flujo correcto es rechazar la creacion de partidas con un
mensaje claro (§1.1). Pero `nil.to_d` **revienta** si alguien escribe `cost_center.viatic_value.to_d`
sobre un `cost_center` nil: usar `cost_center&.viatic_value.to_d`.

**Trampa #5 — el reevaluo con `update` en vez de `update_columns`.** Si un agente "mejora" el codigo
usando `update` o `update!`, cada gasto tocado dispara `edit_values` (pisa `last_user_edited_id` con
el actor equivocado) y la auditoria de edicion del concern `RegisterAuditable` del paquete 03
(crea un `RegisterEdit` por gasto). Con 40 gastos, una
edicion de partida ensucia la pantalla de notificaciones con 41 registros. §4.7 lo prohibe
explicitamente. Hay un test (`test_reevaluo_escribe_un_solo_register_edit`).

**Trampa #6 — anidar transacciones y volver a pedir el lock.** `ActiveRecord::Base.transaction`
anidada **no** crea savepoint por defecto: un `raise ActiveRecord::Rollback` interno no revierte
nada del padre. Por eso `perform_reevaluation` es privado, no abre transaccion y asume el lock
tomado. Si alguien lo hace publico y lo llama suelto, corre sin lock y la concurrencia se rompe en
silencio.

**Trampa #7 — deadlock al mover un gasto de centro.** Dos requests que muevan gastos en direcciones
opuestas (A→B y B→A) se bloquean mutuamente si cada uno toma los locks en el orden en que aparecen
sus parametros. **Siempre ordenar los ids ascendentemente antes de bloquear**, y bloquear de a una
fila (Postgres puede tomar locks en orden de scan, no de `ORDER BY`).

**Trampa #8 — el pool de conexiones es 5.** `config/database.yml` fija `pool: 5` y Puma corre 5
hilos (`config/puma.rb:8`). Una transaccion con lock que espere HTTP o I/O deja un hilo colgado y
puede agotar el pool. El `lock_timeout` de 5 s es la red de seguridad; no se sube.

**Trampa #9 — `use_transactional_tests = false` contamina.** El archivo de concurrencia inserta
filas reales. Si el `teardown` no limpia (`delete_all`, no `destroy_all`), los tests de otros
archivos empiezan a ver partidas fantasma y fallan de forma incomprensible. Y si se usa
`destroy_all`, los callbacks de auditoria corren sin `User.current` y el propio teardown revienta.

**Trampa #10 — `belongs_to` requerido cambia la clave del error.** En Rails 6.1,
`belongs_to :cost_center` sin `optional` produce el error en `:cost_center`, no en `:cost_center_id`.
Un test que afirme `errors[:cost_center_id]` pasa vacio y da falso verde.

**Trampa #11 — el default de `active` no existe en `ExpenseBudget.new` si la migracion no corrio.**
`test_active_por_defecto_true` falla con `nil` si el esquema del **paquete 02** no esta aplicado en
la base de test (`RAILS_ENV=test bin/rails db:test:prepare` despues de sus migraciones). Es el
sintoma tipico de haber arrancado sin verificar la **Precondicion** de Dependencias. La solucion
**no** es crear la migracion aqui: es esperar al 02.

**Trampa #12 — `fixtures :all` y la fixture nueva.** `expense_budgets.yml` se carga en **todos** los
tests de la suite. Si tiene una FK colgante o una columna inexistente, tumba tests que no tienen
nada que ver (§5.4 punto 1). Correr `bin/rails test` completo antes de commitear la Tarea 14, no
solo el archivo propio.

**Trampa #13 — `find_each` ignora el `order`.** El FIFO depende de `created_at ASC`. `find_each`
fuerza orden por `id` y batching; con `id` autoincremental suele coincidir, pero no si hay
`created_at` seteado a mano (las fixtures lo hacen). Usar `.each` sobre la relacion ordenada.

**Trampa #14 — RETIRADA por auditoría.** Su afirmacion (*"`Struct.new(:ok?)` es sintacticamente
invalido en Ruby"*) era **falsa** y contradecia al paquete 05. Reformulacion admitida, unica que
queda en pie: *el setter `ok?=` no es valido; por eso el `Result` canonico usa `:ok` +
`keyword_init: true` y define el predicado en el bloque* (§4.2, §7.4). Ver el bloque de
correcciones al inicio.

**Riesgo de producto — reducir una partida "desaparece" gastos de la vista de contabilidad.**
Bajar `amount` empuja gastos a `excedido`, y §2.3 excluye los `excedido` de la pantalla de
contabilidad. Un gasto ya aprobado contablemente **conserva `accounting_approved = true`** (§2.3) y
solo se recupera con el filtro correspondiente. No es un bug de este paquete, pero es el escenario
que mas va a generar tickets: hay que decirlo en la capacitacion.

**Riesgo de rendimiento.** El reevaluo es O(gastos del par) y corre **en cada** create/update/destroy
de gasto. Con decenas de gastos por persona son milisegundos (§2.7). Si un par llega a miles de
gastos (p. ej. un centro de varios años con un solo responsable), el `POST /report_expenses` se
degrada dentro de un lock. **Disparador para reconsiderar**: si `perform_reevaluation` supera 200 ms
en produccion, se acota el recorrido a los gastos con `budget_status IN ('aprobado','excedido')`
mas la suma agregada de los `sin_presupuesto` — el algoritmo lo permite sin cambiar resultados,
pero no se implementa ahora porque complica la lectura sin necesidad demostrada.

---

## Discrepancias con la arquitectura

Cuatro puntos donde este paquete **precisa o extiende** `00-ARQUITECTURA.md`. Ninguno la contradice
en una decision tomada; los tres primeros cubren huecos que la arquitectura no resuelve y el cuarto
elige entre dos lecturas posibles.

**D1 — §2.7 no reevalua el par al ELIMINAR un gasto.** La tabla de §2.7 dice que `DELETE
/report_expenses/:id` solo dispara `recalculate_cost_center`. Pero eliminar un gasto **libera
cupo**: un gasto posterior en `excedido` puede pasar a caber. Si no se reevalua, queda marcado como
excedido para siempre y desaparece de la vista de contabilidad sin razon. Se agrega
`on_expense_destroyed!`. Igual razonamiento para el `PATCH` que **baja** el valor de un gasto o lo
mueve de centro: §2.7 solo menciona recalcular "el gasto editado", y aqui se reevalua todo el par
(y el par de origen si cambio de centro/responsable).

**D2 — §2.7 dice que al crear una partida se reevaluan "todos los gastos `excedido` de ese (centro,
usuario)"; al editarla, "todos los gastos".** Tomado literal, editar una partida convertiria a
`aprobado` (o peor, a `excedido`) a los gastos historicos que hoy estan en `sin_presupuesto` — y un
historico que pase a `excedido` **sale de la vista de contabilidad** (§2.3), que es exactamente lo
que §2.5 se propuso evitar ("no hay ningun UPDATE de datos historicos", "los historicos si aparecen
en la vista de contabilidad"). Regla adoptada, que reconcilia las tres secciones:

> **El reevaluo FIFO solo escribe sobre gastos cuyo `budget_status` actual sea `aprobado` o
> `excedido`. Un `sin_presupuesto` consume cupo pero nunca cambia de estado por un reevaluo.**
> Un gasto sale de `sin_presupuesto` unicamente cuando **el propio gasto** se crea o se edita y
> pasa por `evaluate!`.

Con esta regla, el caso que §2.7 nombra (crear partida → recuperar los `excedido`) funciona igual, y
los otros dos casos dejan de tener el efecto colateral. Si el cliente pidiera lo contrario ("al
asignar una partida, adoptar los gastos previos del mes"), es un cambio de una condicion en
`perform_reevaluation` **y** una decision de negocio equivalente a la §6.1, que hay que tomar antes
de que nadie vea numeros en pantalla.

**D3 — §A.2 devuelve `spent` y `available` por fila de partida, pero §1.1 dice que el cupo se
controla por agregado y permite varias partidas por par.** Los dos no son compatibles sin inventar
un prorrateo. Se resuelve definiendo `spent_amount` / `available_amount` como magnitudes **del par**
(ver Tarea 3), con la consecuencia de UI documentada. La alternativa —prorratear proporcionalmente
al `amount` de cada partida— se descarta porque produce numeros que no corresponden a ninguna
transaccion real y que no cuadran con `expense_budget_id`.

**D4 — §4.2 define `validate_cap!(budget)` como metodo del servicio.** Se implementa asi (envoltorio
publico), pero la **regla** vive en `ExpenseBudget.cap_violation_for` + una validacion de modelo,
para que una escritura que no pase por el servicio (consola, seed, rake, un controller futuro)
tampoco pueda superar el tope. El servicio aporta el **lock**, no la regla. Es un refuerzo, no una
desviacion.

**Nota menor:** la arquitectura no fija `lock_timeout`. Se agrega uno de 5 s porque sin el, con
`pool: 5`, un lock retenido cuelga hilos de Puma indefinidamente. Si se considera intrusivo, se
quita cambiando una constante — pero entonces el test
`test_lock_timeout_devuelve_result_con_error_y_no_excepcion` se elimina con el.

---

## Objeciones a la auditoría

Ninguna correccion del bloque inicial se revoca ni se considera equivocada. Se anota **un unico
punto ambiguo**, para que quien mantenga §7 lo precise; mientras tanto este documento adopta la
lectura conservadora descrita abajo y **no** cambia nada por su cuenta.

1. **Propiedad de `test/fixtures/expense_budgets.yml`.** §7.2 tiene una fila general
   `test/fixtures/*.yml → dueño 01`, pero la sub-seccion "Fixtures: dueño único = paquete 01"
   enumera solo 8 archivos y **no** incluye `expense_budgets.yml`. Ademas el paquete 01 declara
   explicitamente que **no** la crea, y la correccion 7 del paquete 02 la **difiere al paquete que
   crea el modelo** (04) por una razon tecnica: sin `app/models/expense_budget.rb` Rails no
   resuelve las etiquetas de asociacion (`cost_center: centro_con_viaticos`).
   ✅ **RESUELTA en el cierre de la reauditoria, tal como se sugirio.** §7.2 ya no tiene la fila
   general `test/fixtures/*.yml`: ahora enumera **los 8 archivos del 01** y agrega dos filas
   propias, `test/fixtures/expense_budgets.yml → 04` y `test/fixtures/exchange_rates.yml → 05`,
   con la razon tecnica del diferimiento escrita. **La Tarea 14 sigue viva en el paquete 04** y ya
   no depende de una lectura: esta en la matriz.
