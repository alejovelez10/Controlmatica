# 00 — ARQUITECTURA (documento base)

> **Este documento es de lectura obligatoria antes de escribir cualquier paquete de trabajo del
> proyecto "Presupuesto de viáticos, gastos multimoneda y agente de IA".**
> Nada de lo que decide este archivo se re-discute en un paquete. Si un paquete necesita
> contradecir algo de aquí, el cambio se hace **en este archivo primero** y se anuncia; no se
> resuelve localmente.
>
> Documentos hermanos: `docs/PROPUESTA-GASTOS-PRESUPUESTO-IA.md` (comercial, lo que se le
> prometió al cliente) y `docs/INTERNO-PLAN-TECNICO-GASTOS-IA.md` (plan interno, fases y horas).
> Donde este archivo difiere del plan interno, **manda este archivo**; las diferencias están
> marcadas explícitamente con el texto `DIFIERE DEL PLAN INTERNO`.
>
> 🔴 **LEE PRIMERO LA §7.** Tras la auditoría cruzada de los 13 documentos se agregó la
> **§7 — Resoluciones de auditoría**, que fija de forma vinculante: la tabla canónica de los 12
> paquetes y su numeración, la matriz de propiedad exclusiva de archivos, el grafo real de
> dependencias y las olas de ejecución, la firma exacta de `ExpenseBudgetService`, las claves de
> `@estados`, la tabla única de `data-testid`, la lista de 28 claves de
> `ReportExpensesListTool::KEYS`, los seams de red para los stubs, el runbook de despliegue y la
> Tarea 0 de decisiones del cliente. **Donde la §7 contradiga a las §1–§6 de este mismo archivo,
> manda la §7**; las secciones viejas se dejaron corregidas en línea donde fue posible y marcadas
> con `CORREGIDO §7` donde no.
>
> Punto de entrada operativo (cómo lanzar los agentes, olas, git, Definition of Done):
> `00-README.md`.

---

## 0. Invariantes del proyecto

Siete reglas que ningún paquete puede romper:

1. **`report_expenses.is_acepted` no se toca.** Ni su semántica, ni sus consumidores, ni su
   default. Es la aprobación operativa manual que ya existe. Ver §2.
2. **Los importes en COP siguen siendo `float`** (`invoice_value`, `invoice_tax`,
   `invoice_total`). No se migran a decimal en este proyecto. Todo lo nuevo que sea dinero es
   `decimal`. Ver §1.6.
3. **`recalculate_cost_center` sigue sumando `report_expenses.sum(:invoice_value)`**
   (`app/helpers/application_helper.rb:585`). El valor extranjero NUNCA se guarda en
   `invoice_value`. Ver §1.3.
4. **Toda escritura sobre `ReportExpense`, `CostCenter` o `ExpenseBudget` fuera de un request
   web debe correr con `User.current` seteado.** Patrón único: `ApplicationTool.as_actor`
   (`app/tools/application_tool.rb:72-79`) o el helper de test de §5.3.
5. **Los permisos se crean con una rake task idempotente nueva.** Nunca se ejecuta
   `create_config:create` en un entorno con datos: su línea 5 es `ModuleControl.destroy_all`.
   Ver §4.4.
6. **`ReportExpense.search` se refactoriza ANTES de agregarle filtros nuevos.** El paquete de
   contabilidad depende de ese refactor; ningún paquete agrega un argumento 16 a la firma
   posicional actual. Ver §4.6.
7. **Todo campo nuevo visible en la UI se agrega en CINCO lugares o no se agrega:** migración,
   `ReportExpenseSerializer`, `ReportExpensesListTool::KEYS`, plantilla axlsx de export, y el
   mapeo posicional de `ReportExpense.import`. Ver §4.7.

---

## 1. Modelo de datos definitivo

Todas las migraciones siguen la convención del repo: timestamp sintético `AAAAMMDD0000NN`,
clase `ActiveRecord::Migration[6.1]`, `add_index ... unless index_exists?(...)`, y `bundle exec
annotate` después de cada una para regenerar el bloque `# == Schema Information` de modelos,
serializers y fixtures.

Numeración reservada para este proyecto (no usar otras):

| Migración | Contenido | **Paquete DUEÑO (único)** |
|---|---|---|
| `20260401000001` | `create_expense_budgets` | **02** |
| `20260401000002` | campos presupuestales en `report_expenses` | **02** |
| `20260402000001` | `receipt_file` en `report_expenses` | **02** |
| `20260403000001` | campos multimoneda en `report_expenses` | **02** |
| `20260403000002` | `create_exchange_rates` (**incluye `effective_date`**, ver §1.5) | **02** |
| `20260404000001` | campos de contabilidad en `report_expenses` + índices de la vista | **02** |
| `20260405000001` | `users.phone` + `users.phone_normalized` + índice | **11** |

> 🔴 **DUEÑO ÚNICO Y EXCLUSIVO (resolución de auditoría, vinculante).** El **paquete 02 es el
> único** que escribe archivos en `db/migrate/` para las seis primeras migraciones. Los paquetes
> **04, 05 y 06 NO crean ninguna migración**: sus tareas de migración fueron **eliminadas** y
> reemplazadas por la precondición *"verificar que la migración `<timestamp>` está aplicada
> (`ActiveRecord::Base.connection.column_exists?(...)`) y abortar el paquete si no lo está"*.
> La séptima (`20260405000001`) es del paquete **11** y es la **única excepción** admitida.
> Convención uniforme: **las siete definen `def up` y `def down`. Ninguna define `def change`.**
> El criterio 1 del paquete 02 se lee como: *"en el diff de ESTE PR hay exactamente 6 archivos
> nuevos en `db/migrate/` y ninguno más"* — `20260405000001` no cuenta porque no está en su PR.

Se separan en seis migraciones (y no en una) porque cada paquete debe poder desplegarse solo, y
porque `maintain_test_schema!` aborta la suite completa si hay una migración pendiente: una
migración por paquete permite que los demás paquetes sigan corriendo tests.

### 1.1 Tabla nueva: `expense_budgets` (partidas presupuestales)

```ruby
create_table :expense_budgets do |t|
  t.integer  :cost_center_id,       null: false
  t.integer  :user_id,              null: false
  t.decimal  :amount,               precision: 15, scale: 2, null: false, default: 0.0
  t.text     :notes
  t.boolean  :active,               null: false, default: true
  t.integer  :created_by_id
  t.integer  :last_user_edited_id
  t.timestamps
end

add_index :expense_budgets, [:cost_center_id, :user_id, :active],
          name: "index_expense_budgets_on_center_user_active"
add_index :expense_budgets, :cost_center_id
add_index :expense_budgets, :user_id
```

| Columna | Tipo | Null | Default | Justificación |
|---|---|---|---|---|
| `cost_center_id` | integer | no | — | Centro al que pertenece la partida. Sin FK real: el esquema **no tiene ni un `add_foreign_key`** y no vamos a introducir el primero aquí (rompería la carga de fixtures existentes y el orden de borrado). La integridad se valida en el modelo con `belongs_to` requerido. |
| `user_id` | integer | no | — | **Beneficiario** de la partida, NO el creador. Ver la advertencia de abajo. |
| `amount` | decimal(15,2) | no | 0.0 | Dinero nuevo ⇒ decimal. 15,2 alcanza para 9.999.999.999.999,99 COP. |
| `notes` | text | sí | — | Campo libre pedido en la propuesta §3.1. `text` y no `string` porque no hay límite razonable. |
| `active` | boolean | no | true | Anular sin borrar (propuesta §3.1: "edición y eliminación con recálculo"). Una partida inactiva no aporta cupo pero conserva la trazabilidad de los gastos que ya se imputaron a ella. |
| `created_by_id` | integer | sí | — | Quién la creó. |
| `last_user_edited_id` | integer | sí | — | Convención de trazabilidad del sistema; se setea en `before_update :edit_values`. |

> ⚠️ **EXCEPCIÓN DE NOMENCLATURA — leerla dos veces.** En el resto del sistema `user_id`
> significa *creador*. En `expense_budgets`, `user_id` es el **beneficiario** y el creador es
> `created_by_id`. Se eligió así porque el join de control es
> `expense_budgets.user_id = report_expenses.user_invoice_id` (el responsable del gasto), y
> nombrarlo distinto obligaría a un alias en cada consulta del servicio de consumo. **Nunca
> escribas `user_id: current_user.id` en este modelo.**

**Índices.** El compuesto `(cost_center_id, user_id, active)` es el único que importa: es
exactamente la consulta del servicio de consumo (`SUM(amount) WHERE cost_center_id = ? AND
user_id = ? AND active = true`), que corre en cada creación y edición de gasto. Los dos simples
sostienen la pestaña Presupuesto (listar por centro) y el tablero por persona.

**No hay índice único.** La propuesta (§3.1) permite explícitamente varias partidas por centro
para el mismo usuario. El cupo se controla por **agregado**, no por fila.

**Validación de tope.** `SUM(amount) de las partidas activas del centro ≤
cost_centers.viatic_value`. Se ejecuta dentro de una transacción con `SELECT ... FOR UPDATE`
sobre la fila de `cost_centers`. Comparación: `viatic_value` es `float`, `amount` es `decimal`
⇒ el servicio convierte con `cost_center.viatic_value.to_d.round(2)` antes de comparar. Si
`viatic_value` es `nil` (la columna lo permite), el tope es 0 y **no se puede crear ninguna
partida**: eso es correcto, no es un bug (un centro sin viáticos cotizados no tiene qué
repartir), y el mensaje de error debe decirlo.

**`sum_viatic` no se toca.** `cost_centers.sum_viatic` está muerta (se inicializa a 0 en
`create_code` y solo la lee el Excel de centros de costo). No se reutiliza ni se revive.

### 1.2 Campos presupuestales nuevos en `report_expenses`

```ruby
add_column :report_expenses, :expense_budget_id, :integer
add_column :report_expenses, :budget_status,     :string, null: false, default: "sin_presupuesto"
add_column :report_expenses, :budget_reason,     :string

add_index :report_expenses, :expense_budget_id unless index_exists?(...)
add_index :report_expenses, :budget_status     unless index_exists?(...)
```

| Columna | Tipo | Null | Default | Justificación |
|---|---|---|---|---|
| `expense_budget_id` | integer | sí | — | Partida a la que se imputó, **informativa**. Nullable siempre: los ~históricos y los gastos de centros sin partidas no cuelgan de ninguna. |
| `budget_status` | string | no | `"sin_presupuesto"` | Estado presupuestal. Tres valores: `sin_presupuesto`, `aprobado`, `excedido`. |
| `budget_reason` | string | sí | — | Motivo legible cuando `budget_status = "excedido"`: `"Excede el presupuesto disponible en $X"`. Vacío en los otros dos estados. |

> **DIFIERE DEL PLAN INTERNO (§2.2).** El plan proponía `budget_approved` boolean +
> `budget_rejection_reason`. Se reemplaza por `budget_status` string de tres valores porque un
> booleano confunde dos situaciones distintas: *"se evaluó y no cupo"* y *"no había nada contra
> qué evaluar"*. Con booleano, los ~gastos históricos y todo gasto de un centro sin partidas
> quedarían en `false` — indistinguibles de un exceso real — y la vista de contabilidad
> arrancaría vacía o llena de falsos rechazos. Con tres valores el problema desaparece sin
> inventar aprobaciones retroactivas (§2.5).

**Imputación.** El control de cupo es **agregado** (suma de partidas activas de
`cost_center_id` + `user_invoice_id`), pero `expense_budget_id` se llena con la partida activa
**más antigua** de ese par al momento de guardar, para trazabilidad. No hay imputación parcial
entre partidas: un gasto apunta a una sola partida o a ninguna.

**Índice de `budget_status`.** Cardinalidad 3, pero con distribución muy sesgada tras la
migración (casi todo `sin_presupuesto`); el índice sirve para el caso selectivo real
(`WHERE budget_status = 'excedido'`, la bandeja de excesos) y Postgres ignora el índice cuando
no conviene. Se mantiene simple.

### 1.3 Campos multimoneda nuevos en `report_expenses`

```ruby
add_column :report_expenses, :currency,             :string,  null: false, default: "COP"
add_column :report_expenses, :foreign_value,        :decimal, precision: 15, scale: 2
add_column :report_expenses, :foreign_tax,          :decimal, precision: 15, scale: 2
add_column :report_expenses, :foreign_total,        :decimal, precision: 15, scale: 2
add_column :report_expenses, :exchange_rate,        :decimal, precision: 18, scale: 6
add_column :report_expenses, :exchange_rate_date,   :date
add_column :report_expenses, :exchange_rate_source, :string

# Índice PARCIAL: el 99% de las filas es COP; indexar la columna entera no sirve de nada.
add_index :report_expenses, :currency,
          where: "currency <> 'COP'",
          name: "index_report_expenses_on_foreign_currency"

# Soporta la regla de duplicados del motor de reglas (mismo número de factura + tercero).
add_index :report_expenses, [:invoice_number, :identification],
          name: "index_report_expenses_on_invoice_number_and_identification"
```

| Columna | Tipo | Null | Default | Justificación |
|---|---|---|---|---|
| `currency` | string | no | `"COP"` | ISO 4217 de 3 letras. `null: false` + default hace que la migración backfillee los ~históricos en un solo paso (Postgres ≥ 11 no reescribe la tabla). |
| `foreign_value` | decimal(15,2) | sí | — | Valor tal como aparece en el comprobante. Nulo cuando `currency = "COP"`. |
| `foreign_tax` | decimal(15,2) | sí | — | Impuestos en moneda del comprobante. |
| `foreign_total` | decimal(15,2) | sí | — | Total en moneda del comprobante. |
| `exchange_rate` | decimal(18,6) | sí | — | 6 decimales cubren monedas con tasa < 1 (p. ej. CLP→COP ≈ 4,3; JPY→COP ≈ 26). 18 dígitos totales por si alguna tasa es de orden 10^5. |
| `exchange_rate_date` | date | sí | — | Fecha de la tasa aplicada. Por regla de negocio = `invoice_date`, pero se guarda aparte porque la fuente puede devolver el último hábil anterior (fines de semana y festivos). |
| `exchange_rate_source` | string | sí | — | `"trm_oficial"`, `"bce"`, `"manual"`. Auditable: distingue conversión automática de captura a mano. |

**Regla de oro de la conversión (invariante #3).** `invoice_value`, `invoice_tax` e
`invoice_total` **siempre están en COP**. Se calculan como
`(foreign_* * exchange_rate).round(2).to_f`. Nunca al revés. El usuario puede ajustar el COP a
mano después de la conversión; en ese caso `exchange_rate_source` pasa a `"manual"`.
Si esto se rompe, `recalculate_cost_center` (`application_helper.rb:585`) corrompe el porcentaje
de viáticos de **todos** los centros de costo en silencio.

### 1.4 Campos de contabilidad nuevos en `report_expenses`

```ruby
add_column :report_expenses, :accounting_approved,       :boolean, null: false, default: false
add_column :report_expenses, :accounting_approved_by_id, :integer
add_column :report_expenses, :accounting_approved_at,    :datetime

# Índice de la pantalla de contabilidad: filtra por estado y ordena por fecha de factura.
add_index :report_expenses, [:accounting_approved, :invoice_date],
          name: "index_report_expenses_on_accounting_approved_and_date"
```

| Columna | Tipo | Null | Default | Justificación |
|---|---|---|---|---|
| `accounting_approved` | boolean | no | false | Aquí SÍ es booleano: contabilidad aprueba o no aprueba, no hay tercer estado. |
| `accounting_approved_by_id` | integer | sí | — | Quién aprobó (propuesta §3.6: "con registro de quién y cuándo"). |
| `accounting_approved_at` | datetime | sí | — | Cuándo. Se limpia (`nil`) al desaprobar. |

El índice es compuesto y no simple porque la pantalla de contabilidad **siempre** filtra por
`accounting_approved` y **siempre** ordena por `invoice_date DESC`; el compuesto cubre las dos
cosas de una.

### 1.5 Tabla nueva: `exchange_rates` (caché de tasas)

> 🔴 **DECISIÓN TOMADA (auditoría, vinculante): `effective_date` ENTRA.** La tabla tiene **7
> columnas de negocio**, no 6. Se acepta el argumento del paquete 05 (D1): sin `effective_date`
> no hay cache-hit para fechas no hábiles — la TRM publica `vigenciadesde`/`vigenciahasta` y la
> del viernes rige sábado y domingo — y §E.1 no puede reportar `rate_date != requested_date`.
> El **Plan B del paquete 05 queda descartado y no se implementa**. Consecuencia obligatoria: el
> paquete 02 crea las 7 columnas, su test 19, su criterio 10 y la verificación 6 de
> `gastos_ia_schema:check` dicen **7 columnas / 6 de negocio NOT NULL**.

```ruby
create_table :exchange_rates do |t|
  t.string   :currency,       null: false
  t.date     :rate_date,      null: false   # fecha SOLICITADA que resuelve a esta tasa
  t.date     :effective_date, null: false   # fecha de vigencia real publicada por la fuente
  t.decimal  :rate_to_cop,    precision: 18, scale: 6, null: false
  t.string   :source,         null: false
  t.datetime :fetched_at,     null: false
  t.timestamps
end

add_index :exchange_rates, [:currency, :rate_date], unique: true,
          name: "index_exchange_rates_on_currency_and_rate_date"
add_index :exchange_rates, [:currency, :effective_date],
          name: "index_exchange_rates_on_currency_and_effective_date"
```

| Columna | Tipo | Null | Justificación |
|---|---|---|---|
| `currency` | string | no | Código ISO 4217. |
| `rate_date` | date | no | Fecha **solicitada** que resuelve a esta tasa. Es la clave de caché: pedir el sábado 12 escribe una fila con `rate_date = 12`. |
| `effective_date` | date | no | Fecha de **vigencia real** publicada por la fuente (el viernes 11, en el ejemplo). Es la que §E.1 devuelve como `rate_date` del JSON y la que el frontend compara contra `requested_date` para mostrar el aviso "no hay tasa para el X; se aplicó la del Y". Para `source = "manual"` e `"identity"`, `effective_date == rate_date`. |
| `rate_to_cop` | decimal(18,6) | no | Siempre expresada como "cuántos COP vale 1 unidad de `currency`". Una sola dirección, sin ambigüedad. |
| `source` | string | no | `"trm_oficial"` / `"bce"` / `"manual"`. |
| `fetched_at` | datetime | no | Cuándo se consultó la fuente. Permite revalidar tasas viejas sin borrar la fila. |

⚠️ **Mapeo al contrato §E.1** (para que nadie lo invierta): el JSON devuelve
`"rate_date": <fila.effective_date>` y `"requested_date": <params[:date]>`. La columna
`rate_date` de la tabla **no** se serializa; es clave de caché, no dato de negocio.

**El índice único `(currency, rate_date)` es la pieza central de la Fase 4.** `Rails.cache` NO
sirve como caché de TRM: producción no tiene `cache_store` configurado
(`config/environments/production.rb:62` está comentado) ⇒ Rails usa `:file_store` sobre
`tmp/cache`, que en Heroku es por-dyno y efímero. **Esta tabla es la única fuente de verdad de
la caché.** `Rails.cache` se puede usar como capa L1 opcional, nunca como única.

Escritura idempotente obligatoria: `find_or_create_by!(currency:, rate_date:)` o
`insert_all(..., unique_by: :index_exchange_rates_on_currency_and_rate_date)`. Con 5 hilos de
Puma (`config/puma.rb:8`), dos requests pueden consultar la misma moneda+fecha a la vez; el
índice único convierte la carrera en un `RecordNotUnique` que se rescata releyendo.

### 1.6 Catálogo de monedas: **constante Ruby, no tabla**

**Decisión: constante congelada en `app/models/currency.rb` (clase sin tabla).**

Justificación en una línea: son ~3–6 monedas que cambian una vez cada varios años, no requieren
CRUD, y una tabla arrastraría controller, rutas, permisos, seeds, fixtures y una pantalla de
administración que nadie pidió y que no está presupuestada.

```ruby
# app/models/currency.rb
class Currency
  CATALOG = [
    { code: "COP", name: "Peso colombiano", symbol: "$",  decimals: 2 },
    { code: "USD", name: "Dólar",           symbol: "US$", decimals: 2 },
    { code: "EUR", name: "Euro",            symbol: "€",  decimals: 2 }
  ].freeze

  CODES = CATALOG.map { |c| c[:code] }.freeze
  DEFAULT = "COP"

  def self.options   # forma {label:, value:} lista para react-select
    CATALOG.map { |c| { label: "#{c[:code]} — #{c[:name]}", value: c[:code] } }
  end

  def self.valid?(code) = CODES.include?(code.to_s.upcase)
end
```

Consecuencias que los paquetes deben respetar:
- La validación en `ReportExpense` es `validates :currency, inclusion: { in: Currency::CODES }`.
- El select del formulario se alimenta de un helper que devuelve `Currency.options`; **no** hay
  endpoint de catálogo de monedas y **no** hay tool MCP `currencies_list` (el agente recibe la
  lista en la descripción del `input_schema`).
- Agregar una moneda es un PR de una línea + redeploy. Está documentado como tal en la guía de
  configuración prometida al cliente.
- La lista definitiva es una **decisión abierta** (§6.4).

### 1.7 Resumen de tipos: por qué decimal en lo nuevo y float en lo viejo

`report_expenses` queda con tipos mixtos: `invoice_value` float, `foreign_value` decimal. Es
deliberado. Migrar las tres columnas COP a decimal implicaría tocar `recalculate_cost_center`
(23 columnas float en un solo `update`), los 20+ campos float de `cost_centers`, el export
axlsx, el import posicional y los serializers — un refactor que no está presupuestado y que
puede corromper la ejecución de todos los centros de costo. Lo nuevo nace bien; lo viejo se deja
como está. Regla operativa: **toda comparación entre un float existente y un decimal nuevo se
hace convirtiendo el float con `.to_d.round(2)`**, nunca al revés.

---

## 2. Matriz de estados de aprobación

**Esta es la decisión más importante del proyecto.** Hay tres estados y son independientes entre
sí; ninguno es prerrequisito de otro a nivel de dato.

### 2.1 Definición de cada estado

| Estado | Columna | Tipo | Quién lo cambia | Cuándo | Reversible |
|---|---|---|---|---|---|
| **Aceptación operativa** | `is_acepted` | boolean, default false | Persona con permiso `Gastos / Aceptar gasto` | Manualmente, cuando revisa el gasto | Sí, en ambos sentidos |
| **Estado presupuestal** | `budget_status` | string, default `sin_presupuesto` | **El sistema. Nadie más.** | Automáticamente en cada create/update/destroy de gasto y en cada create/update/destroy de partida | Sí, pero solo recalculando |
| **Aprobación contable** | `accounting_approved` | boolean, default false | Persona con permiso `Contabilidad / Aprobar` | Manualmente, individual o masivo | Sí, en ambos sentidos |

**`is_acepted` — aceptación operativa.** Existe hoy. Significa "alguien de operación revisó este
gasto y lo da por bueno". La cambian `update_state_report_expense` y `update_filter_values`, se
filtra con el argumento 15 de `ReportExpense.search`, se exporta como columna "Estado"
(`Aceptado`/`Creado`) y se pinta como badge editable en el índice
(`ReportExpenseIndex.js:141-183`). **Ningún paquete de este proyecto modifica su semántica, su
default, sus consumidores ni su etiqueta en la UI.** Lo único que sí se corrige es el agujero de
permisos de §3.9.

**`budget_status` — estado presupuestal.** Lo escribe únicamente el servicio de consumo. **No
existe ninguna acción de UI ni ningún endpoint que lo cambie a mano.** Sus tres valores:

- `sin_presupuesto` — no había ninguna partida activa para (centro, responsable) en el momento de
  evaluar. No es un rechazo: es "esto no estaba bajo control presupuestal". Es el valor de todos
  los gastos históricos y de todo gasto en un centro donde nadie asignó partidas.
- `aprobado` — había partida y el gasto cabía en el disponible. `budget_reason` vacío.
- `excedido` — había partida y el gasto no cabía. El gasto **se guarda igual** (requisito
  explícito de la propuesta §3.2) y `budget_reason` explica cuánto se pasó.

**`accounting_approved` — aprobación contable.** Nuevo. Significa "contabilidad causó este
gasto". Terminal en el flujo de negocio, pero reversible por si hubo error.

### 2.2 Orden y flujo

```
                    ┌──────────────────────────────────────────────┐
   Se crea/edita    │  ExpenseBudgetService.evaluate!(gasto)        │
   un gasto  ─────► │  (automático, síncrono, dentro de la misma    │
                    │   transacción del save)                       │
                    └──────────────────┬───────────────────────────┘
                                       ▼
                     budget_status ∈ {sin_presupuesto | aprobado | excedido}
                                       │
              ┌────────────────────────┼────────────────────────┐
              ▼                        ▼                        ▼
     is_acepted (operación)   [nada, opcional]        accounting_approved
     manual, opcional,                                (contabilidad)
     en cualquier momento                             manual, en cualquier momento
                                                      SOLO si el gasto es visible
                                                      en la vista de contabilidad (§2.3)
```

Puntos clave del orden:

1. `budget_status` **siempre se evalúa primero y siempre automáticamente**, porque es el único
   que depende del estado de la base y no de una persona.
2. `is_acepted` y `accounting_approved` son **independientes entre sí**. Un gasto puede estar
   aprobado por contabilidad sin estar aceptado por operación, y viceversa. Forzar una
   dependencia entre ambos bloquearía el circuito contable con los miles de gastos históricos
   que nunca fueron "aceptados".
3. `accounting_approved` **no puede pasar a true si el gasto no es visible en la vista de
   contabilidad** — esa es la única regla de precedencia real, y se valida en el servidor
   (**§3 Bloque C.3**: "aprobar un gasto con `budget_status = 'excedido'` devuelve error"), no
   solo escondiendo el botón. *(Corregida la referencia rota a "§3.11", sección inexistente.)*

### 2.3 Cuál gobierna la vista de contabilidad

**Decisión: la vista de contabilidad lista `budget_status <> 'excedido'`. Nada más.**

Es decir: entran los `aprobado` y los `sin_presupuesto`; se excluyen los `excedido`.
`is_acepted` **no** interviene en el filtro de entrada.

Justificación en una línea: la propuesta pide "únicamente los gastos aprobados", y el único
estado que representa un rechazo real es `excedido` — usar `is_acepted` como puerta dejaría
fuera todos los gastos históricos y todo gasto de un centro sin partidas, vaciando la pantalla
que le vendimos al cliente.

Detalles operativos:
- `is_acepted` sí aparece como **columna y como filtro opcional** en la pantalla de
  contabilidad, para que el perfil contable pueda priorizar. Simplemente no es prerrequisito.
- Un gasto en `excedido` que luego se corrige (se amplía la partida o se baja el valor) pasa a
  `aprobado` en el recálculo y aparece automáticamente en la vista.
- Si un gasto **ya aprobado por contabilidad** pasa a `excedido` por un recálculo (p. ej. alguien
  redujo la partida por debajo de lo ya gastado), el gasto **conserva
  `accounting_approved = true`** y sale de la vista por defecto; se recupera con el filtro
  "Aprobados por contabilidad". Nunca se desaprueba automáticamente algo que una persona aprobó:
  eso destruiría el registro de auditoría contable.

### 2.4 Combinaciones válidas (tabla de verdad)

| `budget_status` | `is_acepted` | `accounting_approved` | ¿Válido? | Lectura |
|---|---|---|---|---|
| `sin_presupuesto` | false | false | Sí | Gasto histórico o de centro sin partidas, sin revisar |
| `sin_presupuesto` | true | true | Sí | Histórico revisado y causado |
| `aprobado` | false | false | Sí | Estado normal recién creado con partida |
| `aprobado` | true | true | Sí | Flujo feliz completo |
| `aprobado` | false | true | Sí | Contabilidad causó sin que operación aceptara. Permitido a propósito |
| `excedido` | cualquiera | false | Sí | Exceso pendiente de resolución |
| `excedido` | cualquiera | true | Sí, pero solo por recálculo posterior | Ver §2.3. **No se puede alcanzar desde la UI**: el endpoint rechaza aprobar un `excedido` |

### 2.5 Qué pasa con los gastos históricos

La migración `20260401000002` deja a **todos** los gastos existentes en:

- `budget_status = "sin_presupuesto"` (por el default de la columna, sin UPDATE masivo)
- `budget_reason = NULL`
- `expense_budget_id = NULL`
- `accounting_approved = false`, `accounting_approved_by_id = NULL`, `accounting_approved_at = NULL`
- `currency = "COP"` (por el default)
- `is_acepted` **intacto**, con el valor que ya tenía

**No hay ningún `UPDATE` de datos históricos en este proyecto.** Todo se resuelve con defaults de
columna. Consecuencias asumidas y aceptadas:

- Los históricos **sí** aparecen en la vista de contabilidad (son `sin_presupuesto`, no
  `excedido`). Es lo que el cliente espera: contabilidad tiene que poder causar lo viejo.
- Los históricos **nunca** consumen partidas presupuestales: no cuelgan de ninguna. Si el cliente
  quisiera "cargar el consumo pasado" a las partidas nuevas, es alcance nuevo (§6.1).
- El tablero asignado/gastado/disponible **sí** cuenta los gastos históricos como gastado, porque
  el "gastado" se calcula por `(cost_center_id, user_invoice_id)`, no por `expense_budget_id`.
  Ver §2.6 — esto es intencional y hay que explicárselo al cliente.

### 2.6 Definición exacta de "gastado" y "disponible"

Una sola definición para todo el proyecto. Cualquier paquete que calcule esto de otra forma está
mal.

```
asignado(centro, usuario)   = SUM(expense_budgets.amount)
                              WHERE cost_center_id = centro
                                AND user_id        = usuario
                                AND active         = true

gastado(centro, usuario)    = SUM(report_expenses.invoice_value)
                              WHERE cost_center_id  = centro
                                AND user_invoice_id = usuario
                                AND budget_status  <> 'excedido'
                                AND id             <> <el gasto que se está evaluando, si aplica>

disponible(centro, usuario) = asignado - gastado
```

Cuatro decisiones embebidas, cada una con su razón:

1. **Se suma `invoice_value`, no `invoice_total`.** Es decir, **sin IVA**, exactamente igual que
   `recalculate_cost_center` (`application_helper.rb:585`) y que `get_show_center`
   (`cost_centers_controller.rb:211`). Tener dos definiciones de "gastado" en el mismo sistema es
   inaceptable; se alinea con la que ya existe. (Cambiar a `invoice_total` es §6.2.)
2. **Se cuenta en COP.** Siempre. Por el invariante #3, `invoice_value` ya está en COP.
3. **Los `excedido` no cuentan como gastado.** Si contaran, un exceso consumiría cupo que nunca
   se le autorizó y arrastraría a todos los gastos siguientes al mismo estado.
4. **Los `sin_presupuesto` SÍ cuentan como gastado.** Incluye los históricos. Razón: si no
   contaran, el dueño del centro asignaría partidas sobre un disponible ficticio que ignora lo ya
   ejecutado.

### 2.7 Cuándo se dispara el recálculo

| Evento | Qué se recalcula | Dónde vive |
|---|---|---|
| `POST /report_expenses` | `budget_status` del gasto nuevo | `ExpenseBudgetService.evaluate!` dentro de la transacción del create |
| `PATCH /report_expenses/:id` | `budget_status` del gasto editado | ídem, en el update |
| `DELETE /report_expenses/:id` | Nada del gasto (se va), pero **sí** `recalculate_cost_center` — hoy no se llama y es un bug preexistente que este proyecto corrige | Controller `destroy` |
| `POST /expense_budgets` | `budget_status` de **todos** los gastos `excedido` de ese (centro, usuario): puede que ahora quepan | `ExpenseBudgetService.reevaluate_center_user!` |
| `PATCH /expense_budgets/:id` (cambia `amount` o `active`) | `budget_status` de **todos** los gastos de ese (centro, usuario) | ídem |
| `DELETE /expense_budgets/:id` | ídem | ídem |

El reevalúo masivo es síncrono y ordenado por `created_at ASC` (FIFO: los gastos más viejos
tienen prioridad sobre el cupo). Con volúmenes de decenas de gastos por persona esto es
milisegundos; si aparece dolor real, se mueve a job (§6.6).

**Concurrencia.** Toda evaluación corre dentro de `ActiveRecord::Base.transaction` con
`CostCenter.lock.find(id)` (`SELECT ... FOR UPDATE`) al inicio. Es el punto de serialización: dos
gastos simultáneos del mismo centro se ordenan y no pueden pasarse del tope. Puma tiene 5 hilos y
el pool de AR es 5 (`config/database.yml`) ⇒ **las transacciones con lock deben ser cortísimas**:
nada de llamadas HTTP (TRM) ni de subida de archivos dentro del lock.

---

## 3. Contratos de API

Convenciones que aplican a **todos** los endpoints de esta sección:

- **Rutas**: se declaran sueltas en `config/routes.rb` con la forma
  `verbo "path", to: "controller#accion"`, siguiendo el estilo del archivo (no `member`/
  `collection` dentro de `resources`). Los `resources` van con `:except => [:show, :new, :edit]`.
- **Strong params**: `params.permit(...)` **plano**, sin `params.require(:modelo)`.
- **Respuesta de éxito de escritura**:
  `{ success: "<mensaje en español>", type: "success", register: <serializado> }`, HTTP 200.
- **Respuesta de error de validación**:
  `{ success: "¡Ocurrió un error!", type: "error", message: ["..."] }`, HTTP 200 (coherente con
  lo existente; el frontend discrimina por `type`).
- **Respuesta de error de permiso**:
  `{ type: "error", message: ["No tiene permiso para realizar esta acción"] }`, **HTTP 403**.
  Los endpoints nuevos SÍ verifican permiso en el servidor (los viejos no lo hacían: ver §3.9).
- **Listados paginados**: `{ data: <SerializableResource>, total: N }` — se mantiene la forma de
  gastos (`total`, no `meta`) para que `CmDataTable` reciba lo mismo en todas las pantallas de
  este proyecto.
- **Paginación**: `will_paginate`, `per_page = [(params[:per_page] || N).to_i, 100].min`.
- **Orden**: whitelist de columnas + `Arel.sql("tabla.columna #{dir}")`,
  `dir = params[:dir] == "asc" ? "ASC" : "DESC"`.

### Bloque A — Presupuesto (partidas)

#### A.1 `resources :expense_budgets, :except => [:show, :new, :edit, :index]`

```ruby
# config/routes.rb
resources :expense_budgets, :except => [:show, :new, :edit, :index]
get   "get_expense_budgets/:cost_center_id",       to: "expense_budgets#get_expense_budgets"
get   "get_expense_budget_summary/:cost_center_id", to: "expense_budgets#get_expense_budget_summary"
get   "get_expense_budget_available",              to: "expense_budgets#get_expense_budget_available"
```

#### A.2 `GET /get_expense_budgets/:cost_center_id`

Lista paginada de partidas del centro. Alimenta la tabla de la pestaña Presupuesto.

- **Params**: `page`, `per_page` (default 50, tope 100), `q` (LIKE sobre `notes` y sobre
  `users.names`), `sort` ∈ `{amount, created_at, updated_at, active, user_name}`, `dir`,
  `only_active` (`"true"`/`"false"`, default sin filtrar).
- **Permiso**: `is_admin? || has_menu_permission?("Presupuesto", "Ingreso al modulo")`.
  Además: si NO tiene `"Ver todos"`, se filtra `where(user_id: current_user.id)` salvo que sea
  el `user_owner_id` del centro.
- **Éxito 200**:
```json
{ "data": [ { "id": 12, "cost_center_id": 340, "user_id": 7,
              "user": { "id": 7, "names": "Juan Perez" },
              "amount": "500000.0", "notes": "Viáticos semana 1", "active": true,
              "spent": "180000.0", "available": "320000.0",
              "created_by": { "id": 3, "names": "Ana Ruiz" },
              "last_user_edited": { "id": 3, "names": "Ana Ruiz" },
              "created_at": "...", "updated_at": "..." } ],
  "total": 4 }
```
- **Error 403**: forma estándar de permiso.

#### A.3 `GET /get_expense_budget_summary/:cost_center_id`

Tablero asignado / gastado / disponible del centro y por persona (propuesta §3.1).

- **Params**: ninguno.
- **Permiso**: igual que A.2.
- **Éxito 200**:
```json
{ "cost_center": { "id": 340, "code": "CM-ACME-12-2026",
                   "viatic_value": 5000000.0 },
  "totals": { "viatic_value": "5000000.0", "assigned": "3200000.0",
              "unassigned": "1800000.0", "spent": "1150000.0",
              "available": "2050000.0" },
  "by_user": [ { "user_id": 7, "user_name": "Juan Perez",
                 "assigned": "500000.0", "spent": "180000.0",
                 "available": "320000.0", "budgets_count": 2,
                 "exceeded_expenses_count": 1 } ] }
```
`unassigned` = `viatic_value - assigned`: es el número que el formulario muestra en vivo.
Todos los montos son **strings** (serialización de `BigDecimal`); el frontend los pasa por
`parseFloat` antes de `NumberFormat`.

#### A.4 `GET /get_expense_budget_available`

Disponible de una persona en un centro. Lo consumen el formulario de gasto (validación en vivo),
la pantalla de partidas y la tool MCP `expense_budgets_available`.

- **Params**: `cost_center_id` (requerido), `user_id` (requerido),
  `exclude_expense_id` (opcional — al editar un gasto, para no contarlo contra sí mismo).
- **Permiso**: `authenticate_user!` y nada más. Es información que el usuario necesita para
  poder registrar su propio gasto; restringirla rompería el flujo.
- **Éxito 200**:
```json
{ "cost_center_id": 340, "user_id": 7, "has_budget": true,
  "assigned": "500000.0", "spent": "180000.0", "available": "320000.0" }
```
Con `has_budget: false`, los tres montos van en `"0.0"` y el frontend/agente muestra
"sin presupuesto asignado" (no "disponible $0", que se lee como rechazo).
- **Error 200 con `type: "error"`** si falta un parámetro requerido.

#### A.5 `POST /expense_budgets`

- **Body** (JSON plano): `cost_center_id`, `user_id`, `amount`, `notes`.
- **Permiso**: `is_admin? || has_menu_permission?("Presupuesto", "Crear")` **y además** ser
  `cost_center.user_owner_id` o tener `"Ver todos"` del módulo Presupuesto. La propuesta dice
  "el dueño del centro asigna partidas" — el guard de propiedad es de negocio, no cosmético.
- **Éxito 200**: `{ success: "¡La partida fue creada con exito!", type: "success", register: {...} }`
  (mismo shape de A.2, un objeto).
- **Error de tope 200**:
```json
{ "success": "¡Ocurrió un error!", "type": "error",
  "message": ["La suma de las partidas ($3.700.000) supera el valor de viáticos del centro de costos ($3.500.000). Disponible para asignar: $300.000"] }
```
- **Error si `viatic_value` es nil o 0**:
  `["El centro de costos no tiene valor de viáticos cotizado; no es posible asignar partidas"]`.
- Efecto colateral: reevalúa `budget_status` de los gastos de ese (centro, usuario) — §2.7.

#### A.6 `PATCH /expense_budgets/:id`

- **Body**: `amount`, `notes`, `active`. `cost_center_id` y `user_id` **no son editables** (si
  hay que cambiarlos, se anula la partida y se crea otra: preserva la trazabilidad de los gastos
  ya imputados).
- **Permiso**: `"Presupuesto" / "Editar"` + propiedad del centro.
- **Éxito / error**: igual que A.5. El chequeo de tope excluye la propia partida de la suma.
- **Caso borde obligatorio**: reducir `amount` por debajo de lo ya gastado **se permite** y los
  gastos que ya no caben pasan a `excedido` con su `budget_reason`. No se bloquea la edición.

#### A.7 `DELETE /expense_budgets/:id`

- **Permiso**: `"Presupuesto" / "Eliminar"` + propiedad del centro.
- **Éxito 200**: `{ success: "¡La partida fue eliminada!", type: "delete" }`.
- Los gastos que apuntaban a la partida quedan con `expense_budget_id = NULL` y se reevalúan.
- Deja `RegisterEdit` con `type_edit: "elimino"`, módulo `"Presupuesto"`.

### Bloque B — Comprobante adjunto

#### B.1 `POST /report_expenses` y `PATCH /report_expenses/:id` — **MODIFICADOS**

Las rutas no cambian (`resources :report_expenses, :except => [:show, :new, :edit]`, ya existe).
Lo que cambia es el **content type**: de `application/json` a `multipart/form-data`.

- **Cambio obligatorio en frontend, en DOS archivos que no comparten código**:
  `app/javascript/packs/ReportExpenseIndex.js:378-402` (`handleSubmit`) y
  `app/javascript/components/ShowConstCenter/ExpensesTable.jsx:162-176` (`HandleClick`).
  Ambos pasan a `FormData` con `append` campo por campo, y **se elimina el header
  `Content-Type`** (el navegador debe poner el boundary). Patrón de referencia:
  `OrdenesDeCompraTable.jsx:102-118`.
- **Strong params**: se agregan a `report_expense_params_create` y `report_expense_params_update`
  (`report_expenses_controller.rb:350-357`): `:receipt_file, :currency, :foreign_value,
  :foreign_tax, :foreign_total, :exchange_rate, :exchange_rate_date, :exchange_rate_source`.
  **`budget_status`, `budget_reason`, `expense_budget_id`, `accounting_approved`,
  `accounting_approved_by_id` y `accounting_approved_at` NO se permiten jamás**: los escribe el
  servidor.
- **Respuesta**: la misma de hoy; `register` ahora incluye `receipt_file: { url: "..." }` (o
  `null`), `budget_status`, `budget_reason` y los campos de moneda.

#### B.2 `DELETE /delete_receipt/report_expenses/:id`

```ruby
delete "delete_receipt/report_expenses/:id", to: "report_expenses#delete_receipt"
```

- **Permiso**: `is_admin? || has_menu_permission?("Gastos", "Editar")`.
- **Éxito 200**: `{ success: "¡El comprobante fue eliminado!", type: "success", register: {...} }`.
- **Error 200** si el gasto no tiene comprobante:
  `{ success: "¡Ocurrió un error!", type: "error", message: ["El gasto no tiene comprobante adjunto"] }`.
- Queda en `RegisterEdit` como edición.

**Descarga**: no hay endpoint. Se usa la URL de CarrierWave que el serializer expone como
`receipt_file.url`, igual que `order_file` (`OrdenesDeCompraTable.jsx:64`). Ver §6.5 sobre URL
firmada.

### Bloque C — Contabilidad

```ruby
get   "accounting_expenses",                        to: "accounting_expenses#index"
get   "get_accounting_expenses",                    to: "accounting_expenses#get_accounting_expenses"
patch "update_accounting_state/:id/:state",         to: "accounting_expenses#update_accounting_state"
patch "update_accounting_filter_values",            to: "accounting_expenses#update_accounting_filter_values"
get   "download_file/accounting_expenses/:type",    to: "accounting_expenses#download_file"
```

Controller nuevo: `app/controllers/accounting_expenses_controller.rb`. **No se reutiliza
`ReportExpensesController`**: su `download_file` está tras el gate `Gastos / Ver todos` y su
`index` arma un `@estados` con otras claves; mezclarlos obligaría a condicionales en seis
métodos.

#### C.1 `GET /accounting_expenses` (HTML)

Monta el pack `AccountingExpenseIndex`. Arma:
```ruby
@estados = {
  approve: is_admin? || has_menu_permission?("Contabilidad", "Aprobar"),
  export:  is_admin? || has_menu_permission?("Contabilidad", "Exportar a excel"),
  show_all: is_admin? || has_menu_permission?("Contabilidad", "Ver todos")
}
```
- **Permiso de entrada**: `has_menu_permission?("Contabilidad")` (acción por defecto
  `"Ingreso al modulo"`), o admin. Sin él, redirect a root con flash.

#### C.2 `GET /get_accounting_expenses`

- **Base fija e inamovible**: `ReportExpense.where.not(budget_status: "excedido")` (§2.3).
- **Params**: `page`, `per_page` (default 50, tope 100), `q` (LIKE sobre `invoice_name`,
  `description`, `invoice_number`, `identification`, y **sobre `id::text`** para la búsqueda por
  número de registro de la propuesta §3.4), `sort` ∈ `{id, invoice_name, invoice_date,
  identification, invoice_number, invoice_value, invoice_tax, invoice_total, currency,
  is_acepted, accounting_approved, accounting_approved_at, created_at, updated_at,
  cost_center_code, user_invoice_name}`, `dir`, y filtros: `cost_center_id`, `user_invoice_id`,
  `start_date`, `end_date`, `accounting_approved`, `is_acepted`, `currency`, `budget_status`,
  `type_identification_id`, `payment_type_id`.
- **Permiso**: `Contabilidad / Ingreso al modulo`. Si no tiene `"Ver todos"`, se filtra
  `where(user_invoice_id: current_user.id)`.
- **Éxito 200**: `{ data: [ReportExpenseSerializer], total: N }`.
- Debe usar `.includes(:cost_center, :user_invoice, :type_identification, :payment_type,
  :last_user_edited, :user, :accounting_approved_by, :expense_budget)`.

#### C.3 `PATCH /update_accounting_state/:id/:state`

`:state` ∈ `{"true","false"}`.

- **Permiso**: `is_admin? || has_menu_permission?("Contabilidad", "Aprobar")` → **403 si no**.
- **Regla de negocio**: aprobar un gasto con `budget_status = "excedido"` devuelve
  `{ type: "error", message: ["No se puede aprobar contablemente un gasto que excede el presupuesto"] }`.
- Al aprobar: `accounting_approved_by_id = current_user.id`, `accounting_approved_at = Time.now`.
  Al desaprobar: ambos a `nil`.
- **Éxito 200**: `{ success: "¡El gasto fue aprobado por contabilidad!", type: "success", register: {...} }`.
- Genera `RegisterEdit` (módulo `"Contabilidad"`).

#### C.4 `PATCH /update_accounting_filter_values` (aprobación masiva)

- **Permiso**: `Contabilidad / Aprobar` → 403 si no.
- **GUARDA OBLIGATORIA**: si NO llega **ningún** filtro, responde
  `{ type: "error", message: ["Debe aplicar al menos un filtro antes de aprobar masivamente"] }`
  y no toca nada. Esto corrige explícitamente el patrón de
  `report_expenses_controller.rb:155-178`, que hoy aprueba la tabla entera cuando llega vacío.
- 🔴 **`ids[]` ES UN FILTRO VÁLIDO (decisión de auditoría, vinculante).** Es lo que da backend a
  la aprobación por selección múltiple vendida en la propuesta §3.6 y construida por el paquete
  09. Obligaciones para el paquete 06, que es el dueño del endpoint:
  - `params.permit(ids: [])` además de los filtros escalares;
  - `scope = scope.where(id: params[:ids]) if params[:ids].present?`;
  - `:ids` **cuenta como filtro** para la guarda de arriba (`FILTER_KEYS` lo incluye);
  - se mantiene el tope de 500 **y se aplica también a `ids[]`** (más de 500 ids ⇒ error);
  - `count` de la respuesta es el de filas **efectivamente actualizadas**, no el de ids recibidos:
    un `ids[]` que incluya un `excedido` o un ya aprobado no lo cuenta;
  - test obligatorio: `ids[]` que contiene un `excedido` **no lo aprueba** y el `count` lo refleja.
  El "Plan B" de N requests secuenciales del paquete 09 **queda descartado y no se implementa**.
- **Tope**: máximo 500 registros por llamada; si el filtro devuelve más, responde con el conteo y
  pide afinar el filtro.
- Excluye siempre los `excedido`.
- **Éxito 200**: `{ success: "37 gastos aprobados por contabilidad", type: "success", count: 37 }`.

#### C.5 `GET /download_file/accounting_expenses/:type`

`:type` ∈ `{"todos", "filtro"}`, con extensión `.xlsx` en la URL
(`/download_file/accounting_expenses/filtro.xlsx?...`), igual que gastos.

- **Permiso**: `Contabilidad / Exportar a excel` → 403.
- Plantilla nueva: `app/views/accounting_expenses/download_file.xlsx.axlsx`.
- Columnas (18): `ID`, Centro de costo, Responsable, Fecha de factura, Nombre, NIT/CEDULA,
  Descripción, Número de factura, Tipo, Medio de pago, Estado operativo, Estado presupuestal,
  Motivo presupuestal, Moneda, Valor extranjero, TRM, Valor del pago (COP), IVA (COP).
  `sheet.column_widths` debe listar **18** anchos (el de gastos hoy lista 11 para 12 columnas —
  no replicar el bug).

### Bloque D — Extracción asistida (IA en la plataforma)

#### D.1 `POST /extract_receipt/report_expenses`

```ruby
post "extract_receipt/report_expenses", to: "report_expenses#extract_receipt"
```

Recibe el comprobante, devuelve campos sugeridos. **No crea nada.** El usuario siempre confirma
(propuesta §4.6: "Nunca se guarda sin confirmación").

- **Content-Type**: `multipart/form-data`.
- **Params**: `file` (requerido, imagen o PDF), `cost_center_id` (opcional, para contextualizar
  reglas y presupuesto).
- **Permiso**: `is_admin? || has_menu_permission?("Gastos", "Crear")`.
- **Éxito 200**:
```json
{ "type": "success",
  "fields": { "invoice_name": "Hotel Dann Carlton",
              "identification": "900123456",
              "invoice_number": "FE-4821",
              "invoice_date": "2026-07-14",
              "currency": "USD",
              "foreign_value": "120.00", "foreign_tax": "22.80", "foreign_total": "142.80",
              "exchange_rate": "4120.500000", "exchange_rate_date": "2026-07-14",
              "exchange_rate_source": "trm_oficial",
              "invoice_value": 494460.0, "invoice_tax": 93947.4, "invoice_total": 588407.4 },
  "confidence": { "invoice_number": 0.94, "invoice_date": 0.71 },
  "warnings": ["La fecha del comprobante tiene 45 días de antigüedad"],
  "rule_violations": [ { "rule": "duplicado",
                         "message": "Ya existe el gasto #8812 con el mismo número de factura y NIT",
                         "blocking": true } ] }
```
- Campos no detectados vienen en `null`; el frontend deja el input vacío, **nunca inventa**.
- **Error 200**: `{ type: "error", message: ["No se pudo leer el comprobante. Complete los datos manualmente"] }`.
  La extracción que falla **nunca** bloquea el registro manual.
- **Timeout duro de 20 s** en el servidor; agotado, responde el error de arriba.

### Bloque E — Tasas de cambio

#### E.1 `GET /get_exchange_rate`

```ruby
get "get_exchange_rate", to: "exchange_rates#get_exchange_rate"
```

- **Params**: `currency` (requerido, ISO 4217), `date` (requerido, `YYYY-MM-DD`).
- **Permiso**: `authenticate_user!` solamente.
- **Éxito 200**:
```json
{ "type": "success", "currency": "USD", "rate_date": "2026-07-14",
  "requested_date": "2026-07-14", "rate_to_cop": "4120.500000",
  "source": "trm_oficial", "cached": true }
```
`rate_date` puede diferir de `requested_date` (fin de semana ⇒ último hábil anterior); el
frontend muestra la diferencia.
- **Sin tasa disponible 200**:
```json
{ "type": "error", "currency": "USD", "requested_date": "2026-07-14",
  "message": ["No se pudo obtener la tasa para USD del 2026-07-14. Ingrésela manualmente"] }
```
Nunca se devuelve un valor inventado ni la tasa de otra fecha sin decirlo.
- `currency = "COP"` devuelve `rate_to_cop: "1.0"`, `source: "identity"`, sin consultar nada.

### Bloque F — Endpoints existentes modificados

#### F.1 `GET /get_report_expenses` — **MODIFICADO**

- **Se implementa `params[:q]`**, que hoy el frontend envía (`ReportExpenseIndex.js:203`) y el
  controller ignora: LIKE sobre `invoice_name`, `description`, `invoice_number`,
  `identification` y `id::text`. Es un bug de UX ya en producción.
- Filtros nuevos: `currency`, `budget_status`, `accounting_approved`, `expense_budget_id`.
- Whitelist de orden ampliada con `id`, `currency`, `budget_status`, `accounting_approved`.
  **Recordatorio**: `type_name` y `payment_name` siguen sin estar en la whitelist y por eso
  ordenan por `created_at` en silencio; si se agrega una columna ordenable nueva, va en la
  whitelist de **ambos** métodos (`get_report_expenses` y `get_cost_center_report_expenses`).
- Estos filtros **entran después** del refactor de `ReportExpense.search` (invariante #6).

#### F.2 `GET /get_cost_center_report_expenses/:id` — **MODIFICADO**

Los campos nuevos aparecen en el serializer, que es compartido. Se agregan a la whitelist de
orden `id`, `currency`, `budget_status`. Recordatorio: la pestaña de gastos del centro carga los
gastos por **dos** caminos (`CostCentersController#getValues` sin paginar y este endpoint) —
cualquier campo nuevo debe verse en ambos.

#### F.3 `GET /download_file/report_expenses/:type` — **MODIFICADO**

`app/views/report_expenses/download_file.xlsx.axlsx` pasa de 12 a **18 columnas**, con `ID` como
primera. `sheet.column_widths` debe listar 18. **Y en el mismo PR** hay que extender el mapeo
posicional de `ReportExpense.import` (`report_expense.rb:84-94`, índices 0..10 → 0..17) o la
importación queda desalineada en silencio.

### Bloque G — Tools MCP

Reglas duras del servidor MCP que condicionan esta lista:
- La exposición se decide por el **nombre del archivo**, no por `tool_name`
  (`mcp_controller.rb:55-59`): solo pasan los sufijos `_list`, `_get`, `_create` más
  `ALWAYS_EXPOSED`.
- Toda escritura va dentro de `as_actor(tenant, server_context)` — con **los dos** argumentos.
- Ampliar `ReportExpensesListTool::KEYS` cambia a la vez la salida de `_list`, `_get`, `_create`
  y de `records_search`. Verificar con Taimes antes de mergear.

| Tool | Archivo | ¿Se auto-expone? | Acción requerida |
|---|---|---|---|
| `report_expenses_create` (existente) | `report_expenses_create_tool.rb` | Sí | Agregar al `input_schema` y a `WRITABLE`: `currency`, `foreign_value`, `foreign_tax`, `foreign_total`, `exchange_rate`, `exchange_rate_date`. **No** agregar `budget_status` ni `accounting_*`. |
| `report_expenses_list` / `_get` (existentes) | — | Sí | Agregar a `KEYS`: `budget_status`, `budget_reason`, `expense_budget_id`, `currency`, `foreign_value`, `foreign_tax`, `foreign_total`, `exchange_rate`, `exchange_rate_date`, `exchange_rate_source`, `accounting_approved`, `receipt_file_url` (método del modelo, no columna). |
| `expense_budgets_list` | `expense_budgets_list_tool.rb` | **Sí** (sufijo `_list`) | Solo crear el archivo. |
| `exchange_rates_get` | `exchange_rates_get_tool.rb` | **Sí** (sufijo `_get`) | Solo crear el archivo. |
| `expense_budgets_available` | `expense_budgets_available_tool.rb` | **NO** | Agregar `"expense_budgets_available"` a `McpController::ALWAYS_EXPOSED` (`mcp_controller.rb:74`). |
| `expense_rules_validate` | `expense_rules_validate_tool.rb` | **NO** | Agregar a `ALWAYS_EXPOSED`. |
| `report_expenses_attach_receipt` | `report_expenses_attach_receipt_tool.rb` | **NO** | Agregar a `ALWAYS_EXPOSED`. |
| `users_find_by_phone` | `users_find_by_phone_tool.rb` | **NO** | Agregar a `ALWAYS_EXPOSED`. Depende de §6.3. |

`records_search` / `records_aggregate`: agregar `"expense_budgets"` y `"exchange_rates"` al
`registry` (`records_search_tool.rb:44-68`) **y** al `enum` de `entity` del `input_schema`
(`:27-30`), o el propio protocolo rechaza el argumento.

⚠️ **Fuga de credenciales preexistente que este proyecto NO debe empeorar**: el parámetro
`fields` de `records_search` filtra solo contra `model.column_names`, así que
`{"entity":"users","fields":["encrypted_password"]}` los devuelve. No agregar entidades nuevas
con columnas sensibles sin denylist. Está anotado como riesgo, no como alcance.

### 3.9 Deuda de permisos que este proyecto corrige (y la que no)

**Se corrige** (porque los endpoints nuevos la heredarían):
- `update_accounting_state` y `update_accounting_filter_values` verifican permiso en el servidor.
- `update_accounting_filter_values` rechaza la ejecución sin filtros.

**NO se corrige** (fuera de alcance, se documenta como hallazgo):
- `PATCH /update_state_report_expense/:id/:state` no verifica ningún permiso: cualquier usuario
  autenticado puede cambiar `is_acepted` de cualquier gasto.
- `PATCH /update_filter_values` sin filtros aprueba la tabla completa.

Si el cliente aprueba corregirlos, es un paquete aparte de 2 h.

---

## 4. Convenciones obligatorias

### 4.1 Dónde va cada tipo de archivo

| Tipo | Ruta | Nombre |
|---|---|---|
| Migración | `db/migrate/` | `AAAAMMDD0000NN_<snake_case>.rb`, clase `ActiveRecord::Migration[6.1]` |
| Modelo | `app/models/` | `expense_budget.rb`, `exchange_rate.rb`, `currency.rb` |
| Controller | `app/controllers/` | `expense_budgets_controller.rb`, `accounting_expenses_controller.rb`, `exchange_rates_controller.rb` |
| Serializer AMS | `app/serializers/` | `expense_budget_serializer.rb` |
| **Servicio** | `app/services/` **(directorio nuevo)** | `expense_budget_service.rb`, `exchange_rate_service.rb`, `expense_rule_service.rb`, `receipt_extraction_service.rb` |
| Uploader | `app/uploaders/` | `receipt_uploader.rb` |
| Tool MCP | `app/tools/` | `<recurso>_<accion>_tool.rb` |
| Serializer MCP | `app/tools/mcp/` | `expense_budget_serializer.rb` (namespaced `Mcp::`) |
| Pack React | `app/javascript/packs/` | `AccountingExpenseIndex.js` |
| Componente React | `app/javascript/components/ShowConstCenter/` | `BudgetsTable.jsx`, `BudgetFormCreate.jsx` |
| Plantilla Excel | `app/views/<controller>/` | `download_file.xlsx.axlsx` |
| Seed de permisos | `lib/tasks/` | `permissions_gastos_ia.rake` |
| Seed E2E | `db/seeds/` | `e2e.rb` |
| Test | `test/{models,controllers,services,integration}/` | `<recurso>_test.rb` |
| E2E Playwright | `test/e2e/` | `specs/*.spec.js` |

### 4.2 Servicios: `app/services/`, clases planas, `.call`

**Decisión: se crea `app/services/` (hoy no existe) con clases planas `<Nombre>Service` y un
único punto de entrada `self.call(...)`.**

Justificación en una línea: no hay ningún patrón previo que copiar — el único cliente HTTP del
repo (`GraphHelper`) es exactamente lo que no hay que replicar (sin timeout, sin rescue, `raise`
de String) — y Zeitwerk ya autocarga todo `app/*`, así que el directorio nuevo funciona sin
configurar nada.

Reglas:
- **Sin namespaces nuevos.** `ExpenseBudgetService`, no `Expenses::BudgetService`. El repo no usa
  namespaces en `app/` salvo `Api::V1` y `Mcp::`; introducir uno más es ruido.
- **Método de clase `self.call`** como puerta única, coherente con `ApplicationTool.call`.
  Métodos auxiliares privados con `private_class_method` o instancia interna.
- **El actor siempre entra por parámetro.** Ningún servicio lee `current_user` ni depende de
  `User.current`. Firma tipo: `ExpenseBudgetService.evaluate!(report_expense, actor:)`.
  Razón: `recalculate_cost_center` ya cometió ese error y por eso no se puede llamar desde un
  job, una rake task ni el MCP.
- **Nada de HTTP dentro de una transacción con lock.** `ExchangeRateService` se resuelve
  **antes** de abrir la transacción del gasto.
- **Cliente HTTP**: `HTTParty` (ya está en el Gemfile) con `timeout: 5`, `open_timeout: 3`,
  un `rescue` explícito de `HTTParty::Error, Net::OpenTimeout, Net::ReadTimeout, SocketError,
  JSON::ParserError`, **cero reintentos síncronos**, y retorno de un objeto `Result`, nunca una
  excepción de String.
- 🔴 **`Result` CANÓNICO Y ÚNICO (auditoría, vinculante).** Los paquetes 04, 05, 07 y 10 definían
  cuatro formas distintas (`:error` singular vs `:errors` plural, posicional vs `keyword_init`),
  y las tools MCP del 11 consumían la contraria a la que producía el 05. **Todos los servicios de
  este proyecto usan literalmente esta definición, copiada tal cual:**
  ```ruby
  Result = Struct.new(:ok, :value, :errors, keyword_init: true) do
    def ok?    = ok
    def error? = !ok
  end
  ```
  - El miembro de error se llama **`errors` y es SIEMPRE un array de strings**, incluso cuando hay
    uno solo. `result.error` (singular) **no existe**; quien lo consuma revienta con `NoMethodError`.
  - Se construye siempre con keywords: `Result.new(ok: false, value: nil, errors: ["..."])`.
  - Aclaración para quien lea la "Trampa #14" del paquete 04: **`Struct.new(:ok?, ...)` SÍ es
    válido en Ruby 3.1** (verificado con el Ruby del repo). Lo que no es válido es el *setter*
    `ok?=`. Se usa `:ok` + predicado en el bloque por comodidad, no por obligación sintáctica.
  - 🟡 **Única excepción documentada: `ReceiptExtractionService::Result`.** El paquete 10 define
    `Struct.new(:ok, :fields, :confidence, :error, :error_message, :model, :usage,
    keyword_init: true)` con `ok?` y **`:error` singular** (que ahí es un *código* de error —
    `:timeout`, `:unsupported_format`, `:refusal`—, no un mensaje). Se mantiene tal cual porque su
    único consumidor es la acción `extract_receipt`, que el propio 10 escribe y prueba. **Nadie
    más lo consume y nadie lo toma como plantilla.** La frase "`Result` idéntico para 04, 05, 07 y
    10" que traía la corrección 8 del paquete 04 y la corrección 6 del 05 queda corregida a
    **"idéntico para 04, 05 y 07"**. Fuera de esta excepción, `result.error` singular sigue siendo
    una señal de desvío (README §8).
- **Retorno uniforme**: los servicios devuelven ese `Result`, no booleanos sueltos. Los
  controllers traducen `Result` a la forma JSON del §3.
- La firma exacta de los 11 métodos públicos de `ExpenseBudgetService` está en **§7.4** y es
  vinculante para el productor (04) y para todos sus consumidores (07, 08, 11).

Servicios de este proyecto y su responsabilidad única:

| Servicio | Responsabilidad |
|---|---|
| `ExpenseBudgetService` | `available_for(cost_center_id:, user_id:, exclude_expense_id: nil)`, `evaluate!(expense, actor:)`, `reevaluate_center_user!(cost_center_id:, user_id:, actor:)`, `validate_cap!(budget)` |
| `ExchangeRateService` | `fetch(currency:, date:)` → lee `exchange_rates`, si no está consulta la fuente, guarda y devuelve `Result` |
| `ExpenseRuleService` | `validate(attrs)` → array de violaciones `{rule:, message:, blocking:}`. **Fuente única de las reglas**: la usan el controller web, el endpoint de extracción y la tool MCP |
| `ReceiptExtractionService` | `extract(file, context)` → hash de campos + confianzas. Único punto que habla con el modelo de visión |

### 4.3 Serializers

Dos familias, no mezclar:

**AMS (`app/serializers/`)** — para las respuestas de los controllers:
```ruby
class ExpenseBudgetSerializer < ActiveModel::Serializer
  attributes :id, :cost_center_id, :user_id, :amount, :notes, :active,
             :spent, :available, :created_at, :updated_at
  belongs_to :user,             serializer: UserSerializer
  belongs_to :created_by,       serializer: UserSerializer
  belongs_to :last_user_edited, serializer: UserSerializer

  def spent     = object.spent_amount     # método del modelo, no query en el serializer
  def available = object.available_amount
end
```
- Los campos calculados se resuelven en el **modelo** o se precargan en el controller; nunca una
  query dentro del serializer (N+1 garantizado en una tabla paginada).
- Bloque `# == Schema Information` de `annotate` al inicio del archivo.

**`ReportExpenseSerializer` — modificación**: se agregan `:id` ya está, y se suman
`:budget_status, :budget_reason, :expense_budget_id, :accounting_approved,
:accounting_approved_at, :receipt_file, :currency, :foreign_value, :foreign_tax, :foreign_total,
:exchange_rate, :exchange_rate_date, :exchange_rate_source` más
`belongs_to :accounting_approved_by, serializer: UserSerializer`.
⚠️ Ese serializer ya tiene una colisión preexistente (`attributes :payment_type` +
`belongs_to :payment_type`). **No agregar más colisiones**: ningún atributo nuevo puede llamarse
igual que una asociación.

**MCP (`app/tools/mcp/`)** — namespaced `Mcp::`, con `self.summary(rec)` y
`self.full(rec) = summary.merge(...)`. Los campos de asociación entran por el tercer parámetro
`extra` de `Mcp::Serialize.record`, no dentro de `KEYS`.

### 4.4 Permisos: cómo agregarlos sin romper los existentes

**Regla absoluta: nunca ejecutar `rake create_config:create` en un entorno con datos.** Su línea
5 es `ModuleControl.destroy_all` y, siendo HABTM con `Rol`, borra todos los módulos, todas las
acciones y **todos los permisos asignados a todos los roles**.

Procedimiento en dos pasos, obligatorio:

**Paso 1 — rake task nueva e idempotente** `lib/tasks/permissions_gastos_ia.rake`:
```ruby
namespace :permissions_gastos_ia do
  task install: :environment do
    admin = User.joins(:rol).where(rols: { name: "Administrador" }).order(:id).first
    User.current = admin                       # los callbacks lo exigen
    rol_admin = Rol.find_by(name: "Administrador")   # literal, case-sensitive

    {
      "Presupuesto"  => ["Ingreso al modulo", "Crear", "Editar", "Eliminar", "Ver todos"],
      "Contabilidad" => ["Ingreso al modulo", "Aprobar", "Exportar a excel", "Ver todos"]
    }.each do |module_name, actions|
      mc = ModuleControl.find_or_create_by!(name: module_name) { |m| m.user_id = admin.id }
      actions.each do |action_name|
        am = AccionModule.find_or_create_by!(name: action_name, module_control_id: mc.id) do |a|
          a.user_id = admin.id                 # belongs_to :user es REQUERIDO en AccionModule
        end
        rol_admin.accion_modules << am unless rol_admin.accion_modules.include?(am)
      end
    end
  end
end
```

**Paso 2 — replicar los mismos bloques en `lib/tasks/create_config.rake`**, con el estilo del
archivo (`ModuleControl.create` + `AccionModule.create`), para que una instalación desde cero
también los tenga. Si solo se hace el paso 1, los entornos nuevos quedan sin los módulos.

Nombres exactos (case-sensitive; el sistema busca por string literal):
- Módulos nuevos: `"Presupuesto"`, `"Contabilidad"`.
- Módulos existentes que se tocan: `"Gastos"` (**sin acciones nuevas** — el comprobante y la
  moneda van bajo `"Crear"`/`"Editar"` que ya existen) y `"Centro de Costos"` (sin cambios).
- Rol admin: `"Administrador"` con mayúscula inicial. `db/seeds_staging.rb` siembra
  `"ADMINISTRADOR"` en mayúsculas y esos usuarios **nunca** son admin
  (`report_expenses_controller.rb:343`).

**Lectura de permisos en código**: siempre
`is_admin? || has_menu_permission?("<Módulo>", "<Acción>")` (memoizado, 1 query). Nunca consultar
`ModuleControl`/`AccionModule` a mano en un controller. Los flags se exponen a React en `@estados`
(hash de símbolos → boolean).

**`@estados` del centro de costos**: `CostCentersController#show` hoy **no incluye ninguna clave
de permisos de Gastos ni de Presupuesto**.

🔴 **CLAVES CANÓNICAS (auditoría, vinculante).** Los paquetes 07 y 08 definían dos juegos de
nombres incompatibles; con el del 07 la pestaña Presupuesto **nunca aparecía** y los tres botones
quedaban ocultos siempre, porque el frontend lee `budget_module` e `is_center_owner`. Se fija
**un solo juego de 10 claves**, que es el que consume React:

```ruby
# app/controllers/cost_centers_controller.rb#show  — DUEÑO ÚNICO: paquete 07
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

- Nombres prohibidos por ser variantes de los de arriba: `budget_view`, `is_cost_center_owner`.
- **Solo el paquete 07 toca `cost_centers_controller.rb#show`.** El 08 y el 06 los consumen.
- Los cuatro `expense_*` existen para que el 08 pueda eliminar el `estados` **hardcodeado en
  `true`** que `ExpensesTable.jsx:211` pasa hoy a `FormCreate`. Ese hardcode lo borra el **08**.
- Los flags son cosméticos: el servidor revalida siempre.

**Ítem de menú "Contabilidad" y su helper — dueño único: paquete 09.** Tres paquetes (06, 07, 09)
reclamaban el mismo bloque de `app/views/layouts/user.html.erb` y `expense_controllers`, con dos
nombres de helper distintos. Resolución:
- **Nombre único del helper: `authorization_accounting_expenses`** (en `application_helper.rb`).
  El nombre `authorization_accounting` **no se usa**.
- El **paquete 09** escribe: el helper, el ítem de menú dentro del treeview "Control de gastos"
  (con `data-testid="nav-contabilidad"`), la línea de `expense_controllers` y el branch de
  `controller_name_helper`. El 06 y el 07 solo **declaran la dependencia**.
- **Regla de orden, sin excepción: la ruta antes que el ítem.** `layouts/user.html.erb` renderiza
  TODAS las pantallas; si el ítem se mergea antes de que exista `accounting_expenses_path`, el
  sistema entero cae con `NameError`. Como el paquete 06 (dueño de la ruta) va en una ola anterior
  al 09, el 09 **sí** puede usar el helper `accounting_expenses_path`. Si por alguna razón el 09
  se adelantara al 06, usa la cadena literal `"/accounting_expenses"`.

### 4.5 Componentes React

**Estilo por ubicación** (respetar el archivo que se toca):
- Pantalla index nueva y autocontenida (Contabilidad) → **pack gordo** en
  `app/javascript/packs/`, con `React.createElement` (sin JSX), métodos declarados como
  `nombre = function () {...}.bind(this)`, y `WebpackerReact.setup({ X })` al final. Referencia:
  `packs/ReportExpenseIndex.js`.
- Tabla embebida en el show del centro de costos (Presupuesto) → **componente JSX** en
  `app/javascript/components/ShowConstCenter/`, métodos como arrow properties
  (`loadData = () => {}`). Referencia: `ExpensesTable.jsx`.

**Reglas transversales:**
- Componentes de **clase**. Cero hooks (única excepción del repo: `packs/Shifts.jsx`, no imitar).
- **`this.columns` se define en el CONSTRUCTOR, completo.** `CmDataTable` congela
  `visibleColumns` en su propio constructor y no lo resincroniza: una columna calculada después
  del mount **nunca se pinta**.
- `CmDataTable` en modo servidor exige **las dos** props: `serverPagination` **y** `serverMeta`
  con `{total, page, per_page, total_pages}`. Si `serverMeta` llega `undefined`, cae a
  paginación de cliente **sin error** y muestra 10 filas.
- `onSearch` es obligatorio si hay `serverPagination`, o la caja de búsqueda filtra localmente
  solo la página visible.
- `stickyActions` es prop muerta (declarada, nunca usada). Da igual pasarla.
- Menú de acciones por fila: markup `cm-dt-menu` + `cm-dt-menu-trigger` + `cm-dt-menu-dropdown`
  con `onClick={this.openMenu}` → `window.cmOpenMenu(e)` (definido en
  `layouts/user.html.erb:1275-1315`). El dropdown debe ser el **hermano inmediato** del trigger.
- Dinero: `NumberFormat` con `thousandSeparator` y `prefix="$"`; el handler limpia con
  `.replace(/[$,]/g, "")`.
- Selects: `react-select` v3 con `menuPortalTarget: document.body` y el objeto `selectStyles`
  copiado (naranja `#f5a623`).
- CSRF: helper local `csrfToken()` + header `"X-CSRF-Token"` en todo fetch mutante.
  **Con `FormData` nunca se pone `Content-Type`.**
- Feedback: `Swal.fire` (SweetAlert2), con los colores del repo
  (`confirmButtonColor: "#2a3f53"`, `cancelButtonColor: "#dc3545"`).
- Clases CSS: usar las `cm-*` de `design_system.css` / `datatable.css`. **No** definir reglas
  globales nuevas dentro de un `<style>` inline de componente (el de
  `ReportExpense/FormCreate.jsx:402-512` ya pisa `.cm-input` y `.cm-label` globalmente cuando el
  modal se monta).
  🔴 **CORREGIDO (auditoría).** La versión anterior de este párrafo decía que `.cm-input-file`
  "no existe" y mandaba agregarla. Es al revés y la ruta también estaba mal:
  - El archivo real es **`app/assets/stylesheets/design_system.css`**. El directorio
    `app/javascript/stylesheets/` **no existe** en este repo.
  - La clase que existe se llama **`.cm-file-input`** (`design_system.css:1741`), no
    `.cm-input-file`.
  - **No se agrega CSS nuevo para el input de archivo**: se usa `.cm-file-input`. Cualquier
    paquete que traiga una tarea de "crear `.cm-input-file`" la borra (afecta al 06 A9).
- **`data-testid` obligatorio en todo elemento nuevo que un E2E vaya a tocar.** El repo tiene 3
  en total; sin esto Playwright depende de texto y de clases internas.

**El formulario de gasto vive DUPLICADO en dos archivos que no comparten código:**
`app/javascript/components/ReportExpense/FormCreate.jsx` (pestaña del centro) y
`renderModal()` dentro de `app/javascript/packs/ReportExpenseIndex.js:577-763` (índice).
**Todo campo nuevo se agrega DOS veces**, y el cálculo del total también
(`ExpensesTable.HandleChangeMoney:149` vs `ReportExpenseIndex.handleFormChangeMoney:355`).
Unificarlos NO está en alcance.

🔴 **DUEÑO ÚNICO DE LOS DOS FORMULARIOS: paquete 08 (auditoría, vinculante).** Los paquetes 05,
06 y 08 escribían el mismo bloque de moneda / comprobante / extracción en los mismos archivos con
selectores distintos, y el 08 declaraba a la vez que el modal del índice "no lo toca nadie" — con
lo cual la captura asistida por IA **no llegaba al módulo de Gastos** e incumplía la propuesta
§4.6 ("disponible en los dos puntos de captura"). Reparto definitivo del frontend de gastos:

| Archivo | Dueño único | Contenido |
|---|---|---|
| `components/ReportExpense/FormCreate.jsx` | **08** | comprobante, bloque de moneda extranjera, captura asistida, aviso de disponible presupuestal |
| `packs/ReportExpenseIndex.js` → `renderModal()`, `EMPTY_FORM`, `handleFormChangeMoney`, `handleSubmit` (a `FormData`) | **08** | **lo mismo, las dos veces** (~6 h adicionales, ya no es un hueco de alcance) |
| `components/ShowConstCenter/ExpensesTable.jsx` → columnas nuevas y filtros | **09** | 5 columnas nuevas, filtros, selección |
| `packs/ReportExpenseIndex.js` → `this.columns`, panel de filtros, `filterParams()` | **09** | ídem |
| `packs/AccountingExpenseIndex.js` + `views/accounting_expenses/index.html.erb` | **09** | pantalla de Contabilidad completa |
| `app/javascript/generalcomponents/expenseIndicators.js` | **09** | `budgetStatusBadge`, `accountingBadge`; el 08 lo **importa**, no lo crea |
| Modal de previsualización de comprobante (`receipt-preview-modal`) + los métodos `openReceiptPreview(id)` / `closeReceiptPreview()` | **08** | iframe/img sobre `/download_receipt/report_expenses/:id`. Viven **fuera del constructor**, así que no chocan con el 09 |
| Columna "Comprobante" (`receipt_file`) de las **dos** tablas | **09** en `packs/ReportExpenseIndex.js` (vive en `this.columns`) y en `ExpensesTable.jsx` | Renderiza `expense-receipt-link-{id}` (enlace a `/download_receipt/report_expenses/:id`) y el botón `expense-receipt-preview-{id}` que llama a `this.openReceiptPreview(id)` — el método que define el 08 |

🔴 **Columna de comprobante: quién la escribe (auditoría de cierre).** La corrección 5 del 08
obligaba a poner `expense-receipt-preview-{id}` y `expense-receipt-link-{id}` "en las dos tablas",
pero la corrección 11 (y esta §4.5, y la fila `this.columns` de §7.2) le prohíben al 08 tocar el
constructor. Era imposible cumplir las dos. **Resolución: la columna la emite el 09** (es una
sexta columna nueva de su Tarea 2, junto a `id`, `budget_status`, `currency`, `foreign_total` y
`accounting_approved`), invocando el `openReceiptPreview(id)` **que define el 08**. El 08 conserva
solo el modal y los dos métodos. Ningún paquete edita región ajena.

🔴 **Catálogo de monedas en el frontend: fuente ÚNICA `window.CM_CURRENCIES`.** Lo declara el
**05** en el bloque `<script>` de `layouts/user.html.erb` (`raw get_currencies.to_json`) y llega a
**los dos formularios** y a las dos tablas, incluido el modal del índice de Gastos, que por props
no recibiría nada. **La prop `currencies: Currency.options` que el 08 bajaba desde
`app/views/cost_centers/show.html.erb` queda derogada**: el 08 borra esa instrucción de su Tarea 12
y `cost_centers/show.html.erb` sale de su tabla "A modificar" (con eso deja de ser un archivo sin
dueño). El helper es `get_currencies` (05); **`currency_options` no existe** y el 09 no lo crea.

Regla mecánica para evitar colisiones dentro de `packs/ReportExpenseIndex.js`, que es el único
archivo que tocan **dos** paquetes: el **08 solo edita dentro de `renderModal()`, de los tres
handlers del formulario y del bloque del modal de previsualización**; el **09 solo edita el
constructor (`this.columns`), el panel de filtros y
`loadData`/`getExportUrl`/`acceptFilteredExpenses`**. El 09 se mergea **antes** que el 08.

`components/ReportExpense/Index.jsx`, `FormFilter.jsx` y `FormImportFile.jsx` son **código
muerto** (ningún pack los importa). Modificarlos no tiene efecto. No perder tiempo ahí.

### 4.6 Refactor de `ReportExpense.search`

Prerrequisito de los filtros nuevos (invariante #6). Se reescribe con el patrón que ya usa
`CostCenter.search` (`cost_center.rb:121-133`):

```ruby
def self.search(filters = {})
  scope = all
  scope = scope.where(cost_center_id: filters[:cost_center_id]) if filters[:cost_center_id].present?
  # ... una línea por filtro, sin definir scopes de clase
  scope
end
```

- **La firma pasa de 15 posicionales a un hash.** Toca 6 call sites:
  `report_expenses_controller.rb:41, :84, :160, :162, :228, :234`.
- `ExpenseRatio.search` tiene la misma patología pero **no está en alcance**.
- Antes de tocarla hay que tener tests de los 15 filtros actuales (§5.2). Sin ellos, el refactor
  es una apuesta.

### 4.7 Auditoría (`RegisterEdit`)

🔴 **ACTUALIZADO (auditoría).** El párrafo original decía "cada modelo escribe su propio HTML a
mano en `create_create_register` / `create_edit_register` / `create_destroy_register`". Eso ya no
es cierto para `ReportExpense`: el **paquete 03 (Bloque C)** reemplaza esos tres métodos por el
concern `RegisterAuditable` con el DSL `audit_field` / `audit_register`, y fija el HTML resultante
con 14 tests golden byte a byte. Reglas que se derivan:

- **`RegisterAuditable` es la única forma de auditar `ReportExpense`.** Ningún paquete escribe
  HTML de auditoría a mano dentro de `ReportExpense`.
- **Agregar un campo auditable = agregar una declaración `audit_field` + su entrada en
  `edit_fields` de `audit_register`, y actualizar la constante golden del paquete 03 en el MISMO
  PR.** Aplica a `budget_status` (paquete 04) y a `receipt_file` (paquete 06).
- **El paquete 03 es dependencia dura de 04 y de 06.** Si 04 o 06 se ejecutan antes que 03, sus
  instrucciones apuntan a código que ya no existe.
- Los demás modelos (`CostCenter`, `ExpenseBudget`, …) conservan el patrón manual; `ExpenseBudget`
  **puede** usar el concern pero no está obligado.

El resto de esta sección sigue vigente:

- **El typo `module: "Gatos"`** (`report_expense.rb:218, :279, :341`) **se conserva tal cual** en
  los campos nuevos de gastos. Corregirlo obligaría a migrar los históricos y a tocar los filtros
  de la pantalla de notificaciones. Se documenta como deuda, no se arregla aquí.
- `ExpenseBudget` usa `module: "Presupuesto"` (sin typo, es nuevo).
- La aprobación contable usa `module: "Contabilidad"`.
- Auditoría de FKs: se guarda el **nombre legible**, no el id (CostCenter por `code`, User por
  `names`, ReportExpenseOption por `name`).
- ⚠️ **Número mágico**: `create_edit_register` guarda solo `if str.length > 59`, y 59 es
  exactamente la longitud del encabezado constante. Al agregar campos nuevos al método **no se
  toca ni el encabezado ni el umbral**, o empiezan a aparecer registros de auditoría fantasma en
  cada creación (por el doble `save` de `create`).
- `budget_status` **sí** se audita cuando cambia (es información contable relevante), pero el
  reevalúo masivo por edición de partida escribe **un solo** `RegisterEdit` de la partida, no uno
  por cada gasto tocado.

### 4.8 Uploader del comprobante

```ruby
# app/uploaders/receipt_uploader.rb
class ReceiptUploader < CarrierWave::Uploader::Base
  storage(Rails.env.production? ? :fog : :file)   # SIN la línea que lo sobrescribe

  def store_dir
    "uploads/#{model.class.to_s.underscore}/#{mounted_as}/#{model.id}"
  end

  def extension_allowlist    = %w[jpg jpeg png pdf webp heic]
  def content_type_allowlist = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"]
  def size_range             = 1.byte..10.megabytes
end
```

- **API nueva**: `extension_allowlist` / `content_type_allowlist` / `size_range`. El
  `extension_whitelist` comentado en los 4 uploaders existentes emite deprecation en
  CarrierWave 3.1.2.
- **Sin versiones ni MiniMagick**: no se necesitan miniaturas y evita depender de ImageMagick en
  CI.
- Montaje: `mount_uploader :receipt_file, ReceiptUploader` en `ReportExpense`.
- 🔴 **PROPIEDAD CORREGIDA (auditoría).** Cuatro paquetes se disputaban
  `config/initializers/carrierwave.rb` y los 4 uploaders existentes, con contenidos mutuamente
  excluyentes. Resolución vinculante:

  | Artefacto | **Dueño único** | Los demás |
  |---|---|---|
  | `config/initializers/carrierwave.rb` (completo: `fog_region`, `enable_processing`, `config.root` de test, bloque `E2E_UPLOAD_ROOT`) | **03** | 01, 06 y 12 solo **declaran la dependencia**. La tarea 15 del 01 y la A3 del 06 se **borran**. |
  | `avatar_uploader.rb`, `certificate_uploader.rb`, `information_uploader.rb`, `order_uploader.rb` | **03** (Bloque A) | 06 los quita de su tabla "A modificar" y su criterio 3 pasa a "verificar que el 03 los dejó así". |
  | `receipt_uploader.rb` (nuevo) | **06** | — |

  **Valor único de `config.root` en test (no re-discutir):**
  `Rails.root.join("tmp", "uploads_test")` por defecto, sobrescribible por
  `ENV["E2E_UPLOAD_ROOT"]` (que la corrida E2E del paquete 12 fija en `public`, para que
  `/uploads/...` sea servible y la descarga del escenario 4 funcione). El test estático
  `test_carrierwave_escribe_en_tmp_en_test` del 03 afirma esa ruta exacta cuando la ENV está
  ausente.
- **Precondición dura del Bloque A del 03**: `AWS_ACCESS_KEY`, `AWS_SECRET_KEY`, `AWS_BUCKET` y la
  región real del bucket verificadas en Heroku (§6.5). Ya **no** es una bifurcación en tiempo de
  ejecución: se verifica en la **Tarea 0** (§7.10) y el resultado queda escrito antes de arrancar.
- `CarrierWave.configure { |c| c.enable_processing = false }` para el entorno test, en el mismo
  initializer del 03, o cada fixture con avatar invoca ImageMagick 5 veces.

---

## 5. Estrategia de pruebas

### 5.0 Punto de partida real

**La suite no arranca.** `bin/rails test` aborta en el boot con
`undefined method 'driver_path=' for Selenium::WebDriver::Chrome` porque `chromedriver-helper
2.1.1` (abandonada desde 2019) es incompatible con `selenium-webdriver 4.32.0`. Y aunque
arrancara, `fixtures :all` (`test_helper.rb:7`) carga 17 YAML de los cuales **4 tienen columnas
inexistentes** y tumban cualquier test, incluso uno que no las use.

Por eso hay un **Paquete 0 de desbloqueo** que va antes que todo lo demás y sin el cual ningún
otro paquete puede escribir un solo test.

### 5.1 Paquete 0 — desbloqueo (prerrequisito de todo)

1. **Eliminar `gem "chromedriver-helper"`** de `Gemfile:138` + `bundle install`. No hace falta
   reemplazo: `selenium-webdriver >= 4.6` trae Selenium Manager. Después, `bin/spring stop`.
2. **Arreglar las 4 fixtures rotas** (columnas que no existen en la BD):
   - `contractors.yml` — quitar `purchase_number`, `purchase_date` (líneas 30, 31, 36, 37)
   - `materials.yml` — quitar `purchase_date`, `purchase_number`, `purchase_state`
   - `expense_ratios.yml` — `cration_date` → `creation_date` (líneas 27, 36)
   - `register_edits.yml` — quitar `names`, `email`, `document_type`, `number_document`,
     `rol_id` (son columnas de `users`, copiadas por error)
3. **Borrar los 29 tests de scaffold heredados** (12 archivos): 4 usan helpers de ruta que no
   existen (`home_index_path`, `materials_index_path`, `contractors_index_path`,
   `report_expense_options_index_path`) y el resto afirma redirects contra controllers con
   `authenticate_user!`. Dejarlos convierte la suite en ruido permanente.
   ⚠️ `test/system/sales_orders_test.rb` y `customer_invoices_test.rb` usan helpers `*_url`, y
   `config/routes.rb:100` tiene `default_url_options :host => "controlmatica.herokuapp.com"` →
   **correr `bin/rails test:system` hoy puede crear/editar/borrar datos reales en producción.**
   Borrarlos es también una medida de seguridad.
4. **Ampliar `test/test_helper.rb`**: `include Devise::Test::IntegrationHelpers` (integration) y
   `Devise::Test::ControllerHelpers` (controller) — hoy no están en ninguna parte del repo — más
   el helper `as_user` de §5.3.
5. **Crear las 6 fixtures faltantes críticas**: `rols.yml`, `users.yml`, `customers.yml`,
   `cost_centers.yml`, `module_controls.yml` (corregir los `MyString`), `accion_modules_rols.yml`
   (HABTM sin modelo: fixture de tabla suelta).

Criterio de salida del Paquete 0: `bin/rails test` corre, da 0 failures y 0 errors.

### 5.2 La pirámide para ESTE proyecto

```
                    ┌───────────────────────────┐
                    │  E2E Playwright — 5 flujos │   lento, frágil, caro
                    └───────────────────────────┘
              ┌─────────────────────────────────────┐
              │  Integración/Controller — ~35 tests  │   contratos JSON y permisos
              └─────────────────────────────────────┘
        ┌───────────────────────────────────────────────┐
        │  Unitario Minitest — ~60 tests                 │   la aritmética del dinero
        └───────────────────────────────────────────────┘
```

#### Nivel 1 — Unitario (`test/models/`, `test/services/`). Aquí vive el valor.

Todo lo que es **aritmética de dinero y transición de estados** se prueba aquí, sin HTTP:

- `ExpenseBudget`: validación de tope (cabe justo, se pasa por 1 peso, `viatic_value` nil,
  `viatic_value` 0, edición que excluye la propia partida de la suma, partida inactiva que no
  aporta cupo).
- `ExpenseBudgetService.available_for`: los cuatro puntos de §2.6 — que suma `invoice_value` y no
  `invoice_total`, que excluye `excedido`, que **incluye** `sin_presupuesto`, que respeta
  `exclude_expense_id`.
- `ExpenseBudgetService.evaluate!`: las tres transiciones (`sin_presupuesto` cuando no hay
  partida, `aprobado` cuando cabe, `excedido` cuando no) y el texto exacto de `budget_reason`.
- `reevaluate_center_user!`: FIFO por `created_at`; reducir una partida por debajo de lo gastado
  empuja a `excedido` a los más nuevos, no a los más viejos.
- **Concurrencia**: un test que abre dos hilos creando gastos contra la misma partida y verifica
  que no se pasan del tope. Es el único test que justifica el `SELECT FOR UPDATE` y hay que
  escribirlo aunque sea incómodo (`ActiveRecord::Base.connection_pool` con
  `with_connection` por hilo).
- `ExchangeRateService`: hit de caché sin HTTP, miss que persiste, timeout que devuelve
  `Result` con error (no excepción), fin de semana que devuelve el hábil anterior con
  `rate_date != requested_date`, `COP` que devuelve 1.0 sin tocar la red, y la carrera de dos
  escrituras simultáneas contra el índice único. **La fuente externa se stubea siempre**
  (`WebMock` no está en el Gemfile ⇒ se stubea el método del servicio, no HTTParty; agregar
  WebMock es una decisión abierta §6.7).
- `ExpenseRuleService`: una prueba por regla (antigüedad, concepto no permitido, duplicado, tope,
  coherencia declarado vs comprobante).
- `Currency`: validación de código, `options`.
- Conversión: `(foreign_value * exchange_rate).round(2)` y que `invoice_value` queda en COP.
- `ReceiptUploader`: extensión rechazada, content-type rechazado, tamaño excedido.

#### Nivel 2 — Controller / Integración (`test/controllers/`, `test/integration/`)

Un test por **contrato** de §3, con foco en tres cosas y nada más:

1. **Forma del JSON**: que devuelve `{data:, total:}` o `{success:, type:, register:}`, y que los
   campos nuevos están presentes. No se re-prueba la aritmética (ya está en el nivel 1).
2. **Gate de permiso**: cada endpoint nuevo tiene un test que autentica un usuario **sin** el
   permiso y afirma 403. Este es el test que más veces va a salvar el proyecto.
3. **Strong params**: que `budget_status`, `accounting_approved` y `accounting_approved_by_id`
   **no** se pueden setear desde el body. Un test explícito de mass-assignment por cada uno.

Más los específicos:
- `update_accounting_filter_values` **sin filtros** → error, y `ReportExpense.where(accounting_approved: true).count` sigue en 0.
- `update_accounting_state` sobre un `excedido` → error.
- `get_accounting_expenses` nunca devuelve un `excedido`.
- Subida multipart: `POST /report_expenses` con `fixture_file_upload` de un PDF y de un `.exe`
  (rechazado). Los archivos de ejemplo van en `test/fixtures/files/` (hoy solo tiene `.keep`).
- Los 15 filtros actuales de `ReportExpense.search` **antes** del refactor (red de seguridad del
  invariante #6).
- Tools MCP: `report_expenses_create` con `X-Actor-Email` que resuelve al usuario correcto,
  `expense_budgets_available` sin API key → `unauthorized!`, y una llamada a `tools/list` que
  afirme que las 4 tools de `ALWAYS_EXPOSED` aparecen. Hoy la cobertura del MCP es **cero**.

#### Nivel 3 — E2E Playwright (`test/e2e/`). Nueve flujos, un solo dueño.

🔴 **ACTUALIZADO (auditoría).** Esta sección decía "exactamente cinco flujos" y quedó superada:
el paquete 12 escribe 28 tests en 7 specs cubriendo nueve flujos, y cinco paquetes distintos
estaban escribiendo specs con nombres de archivo repetidos. Resolución vinculante:

- **Propiedad de la infraestructura E2E → paquete 01**, y solo él: `test/e2e/package.json`,
  `playwright.config.js`, `global-setup.js`, `auth.setup.js`, `env.js`, `db.js`,
  `db/seeds/e2e.rb`, `smoke.spec.js`, `test/e2e/README.md`, `.nvmrc`.
- **Propiedad de TODOS los specs funcionales → paquete 12**, y solo él. Los paquetes **05, 06,
  08 y 09 borran sus specs E2E**; su única obligación E2E es **emitir los `data-testid`** de la
  tabla canónica de §7.6.
- Los cinco flujos originales siguen siendo el núcleo obligatorio; el 12 agrega cuatro más:

| # | Flujo | Spec (dueño: 12) |
|---|---|---|
| 1 | Crear una partida desde la pestaña Presupuesto y verla en el tablero asignado/disponible | `budget.spec.js` |
| 2 | Crear una partida que excede el tope y ver el mensaje de bloqueo con el disponible correcto | `budget.spec.js` |
| 3 | Gasto que **cabe** → badge "Aprobado"; gasto que **no cabe** → badge "Excedido" con motivo | `budget.spec.js` |
| 4 | Adjuntar un comprobante (PDF), previsualizarlo y descargarlo desde la tabla | `receipt.spec.js` |
| 5 | Aprobar un gasto desde Contabilidad y verificar que sale de la lista de pendientes | `accounting.spec.js` |
| 6 | Gasto en moneda extranjera con tasa del día (y aviso de día no hábil) | `currency.spec.js` |
| 7 | Captura asistida por IA con corrección humana antes de guardar | `ai-capture.spec.js` |
| 8 | Permisos negados en UI y por URL directa | `permissions.spec.js` |
| 9 | Regresión de paginación con 57 registros | `pagination.spec.js` |

**Instalación** (decidido, no re-discutir):
- `@playwright/test` va en **`test/e2e/package.json`**, no en la raíz. Razón: `test/` ya está en
  `.slugignore`, mientras que ponerlo en la raíz haría que el buildpack de Node de Heroku
  instalara devDeps y descargara ~500 MB de navegadores en cada build. Además `package.json:33`
  declara `engines.node: "16.x"` y Playwright exige ≥ 18.
- `playwright.config.js` con `baseURL` explícita a `http://127.0.0.1:3001`. **Nunca** usar
  helpers `*_url` de Rails (apuntan a producción por `default_url_options`).
- `webServer`: `RAILS_ENV=test bin/rails server -b 127.0.0.1 -p 3001`, `timeout: 180000`,
  `reuseExistingServer: !process.env.CI`. **Precompilar antes** con
  `RAILS_ENV=test NODE_ENV=development ./bin/webpack`: webpacker en test tiene `compile: true` y
  el primer request compila 29 packs (puede pasar de 2 minutos y hacer timeout el `webServer`).
- **Login**: un `setup project` que hace login una vez y guarda `storageState` en
  `test/e2e/.auth/storageState.json` (agregar a `.gitignore`); los demás proyectos con
  `dependencies: ['setup']`.
  Selectores del formulario: `#user_email`, `#user_password`, `input[value="Ingresar"]`.
- **`cache_classes = true` en test**: el server no recarga código. Editar un modelo entre
  corridas no surte efecto hasta reiniciar el `webServer`.
- **`allow_forgery_protection = false` en test**: un E2E verde **no valida** el manejo de CSRF.
  El paso de JSON a `FormData` con `X-CSRF-Token` se prueba en el nivel 2, no aquí.

**Trampa de react-select**: los 4 selects del modal de gasto usan
`menuPortalTarget: document.body` ⇒ las opciones se renderizan **fuera** del modal y un
`modal.getByText(...)` no las encuentra; hay que buscar en `page` completo. Y el select de centro
de costo no muestra nada hasta escribir 3 caracteres (dispara `GET /search_cost_centers`): un
`fill` + `Enter` inmediato falla, hay que esperar la respuesta de red.

**Seeds E2E**: `db/seeds/e2e.rb` idempotente (`find_or_create_by!`, valores fijos, cero `rand` ni
`.sample`), ejecutado en `globalSetup` con `RAILS_ENV=test bin/rails runner db/seeds/e2e.rb`.
Debe crear, con `User.current` seteado:
- `Rol "Administrador"` (literal, mayúscula inicial)
- `ModuleControl "Reportes de servicios"` y `"Tablero de Ingenieros"` — **sin estos dos el login
  revienta con NoMethodError** en `after_sign_in_path_for`
  (`application_controller.rb:103-124` hace `.id` sobre el resultado de `find_by_name` sin
  verificar nil). Ningún seed del repo los crea hoy.
- `ModuleControl "Gastos"`, `"Centro de Costos"`, `"Presupuesto"`, `"Contabilidad"` con sus
  `AccionModule` (⚠️ `AccionModule belongs_to :user` es **requerido**: pasar `user_id`) y el HABTM
  con el rol.
- Usuario `e2e@controlmatica.test` con contraseña fija y ese rol.
- `Customer`, `CostCenter` con `viatic_value` fijo, `ReportExpenseOption` de tipo y de medio de
  pago, y 2–3 `ReportExpense` semilla.

### 5.3 El gotcha de `User.current`: solución definitiva

`User.current` es `Thread.current[:user]` y solo lo setea `ApplicationController#set_current_user`
(`application_controller.rb:100-102`). Los callbacks de `ReportExpense` (`edit_values:53`,
`create_edit_register:149`, `create_create_register:214/276`, `create_destroy_register:338`)
hacen `User.current.id` **sin guarda de nil** ⇒ revientan en tests, jobs, rake tasks, consola y
MCP. `CostCenter` sí tiene la guarda en dos de tres sitios. Son **37 puntos** en total en el repo.

**Solución en tres capas, todas obligatorias:**

**Capa 1 — guarda en el modelo (se aplica en el Paquete 0).** Se agrega un método privado en
`ReportExpense` y se reemplazan las 5 llamadas directas:
```ruby
private

def current_actor_id
  User.current&.id || user_id || user_invoice_id || last_user_edited_id
end
```
Justificación: no cambia el comportamiento en ningún request web (ahí `User.current` siempre
existe), elimina el bloqueo #1 de las pruebas, y el fallback atribuye la auditoría a un usuario
**real y relacionado con el registro**, no al id mágico `1` que usa `CostCenter`.
**No se cambia `CostCenter`**: su guarda existente funciona y tocarla está fuera de alcance.

**Capa 2 — helper de test** en `test/test_helper.rb`:
```ruby
class ActiveSupport::TestCase
  fixtures :all

  def as_user(user)
    previous = User.current
    User.current = user
    yield
  ensure
    User.current = previous
  end
end
```
Todo test que cree/edite/borre un gasto, un centro, una partida, un reporte, un material, un
contratista o un usuario se envuelve en `as_user(users(:admin)) { ... }`. Es el mismo patrón de
`ApplicationTool.as_actor`.

**Capa 3 — servicios sin `User.current`.** Los servicios de §4.2 reciben `actor:` por parámetro y
no leen `User.current`. Si un servicio necesita disparar callbacks que sí lo leen, envuelve él
mismo: `User.current = actor` con `ensure` de restauración.

**Y para jobs (si aparecen, §6.6)**: ActiveJob corre en `:async`, es decir en **otro hilo** ⇒
`Thread.current[:user]` **no se propaga**. Todo job que escriba debe setear `User.current` en la
primera línea de `perform`.

### 5.4 Fixtures nuevas sin romper `fixtures :all`

**Decisión: se mantiene `fixtures :all`.** Cambiar a fixtures por test obligaría a tocar todos los
archivos y a razonar sobre dependencias entre 17 YAML; con la suite en cero, el costo no se
justifica.

Consecuencias que cada paquete debe respetar:

1. **Una fixture rota tumba TODA la suite**, no solo el test que la usa. Antes de mergear un YAML
   nuevo hay que correr `bin/rails test test/models` completo, no solo el archivo propio.
2. **Cabecera `# == Schema Information`** de `annotate` en cada YAML nuevo, y regenerarla tras
   cada migración.
3. **Etiquetas `one:` / `two:`** para lo genérico (patrón scaffold de los 17 existentes) y
   etiquetas semánticas (`admin:`, `ingeniero:`, `centro_con_viaticos:`) para lo que un test
   referencia por nombre. Referenciar siempre por etiqueta (`users(:admin)`), nunca por id.
4. **`db/schema.rb` no tiene ni un `add_foreign_key`** ⇒ una fixture con FK colgante **inserta sin
   error** y el test falla mucho después con un `NoMethodError` críptico dentro de
   `create_create_register`. `report_expenses.yml` tiene hoy exactamente ese problema
   (`user_id: 1`, `cost_center_id: 1`, `user_invoice_id: 1` inexistentes) y hay que arreglarlo:
   toda FK de fixture debe apuntar a otra fixture por etiqueta (`cost_center: centro_uno`).
5. **`users.yml` necesita `encrypted_password` válido.** Devise usa `stretches = 1` en test
   (`devise.rb:114`), así que generarlo es barato:
   `<%= Devise::Encryptor.digest(User, "password123") %>` en ERB dentro del YAML.
6. **`module_controls.yml` y `accion_modules.yml` traen `name: MyString`** — inservibles, porque
   todo el sistema de permisos busca por string literal. Hay que ponerles los nombres reales.
7. **Fixtures nuevas de este proyecto**: `expense_budgets.yml`, `exchange_rates.yml`.
   `expense_budgets.yml` debe incluir al menos: una partida activa con cupo, una inactiva, y una
   de un centro con `viatic_value` nil.
8. **`RAILS_ENV=test bin/rails db:test:prepare` después de cada migración**, o
   `maintain_test_schema!` aborta la suite con `exit 1`.
9. **Sin `parallelize`** en `test_helper.rb`. No agregarlo: la suite en serie evita la condición
   de carrera de `ReportExpense.search` mientras el refactor no esté hecho.

### 5.5 CI

**No existe CI de ningún tipo** (no hay `.github/`, `.circleci`, `.travis.yml`, `Procfile` ni
`app.json`). Montarlo **no está en el alcance presupuestado**, pero si se decide hacerlo, dos
bloqueos conocidos:
- `config/database.yml` y `config/application.yml` están **gitignorados y no trackeados**: un
  runner que haga checkout no los tiene. Hay que generarlos en el job o migrar a `DATABASE_URL`.
- ImageMagick está en `Aptfile` (para Heroku) pero un runner de GitHub Actions hay que
  aprovisionarlo aparte. Con `enable_processing = false` en test (§4.8), deja de ser necesario.

Recomendación por defecto: **sin CI en este proyecto**; el semáforo es `bin/rails test` local
más los 5 E2E antes de cada despliegue a staging.

---

## 6. Decisiones abiertas

Ninguna de estas bloquea el arranque: cada una tiene una **recomendación por defecto** que se
ejecuta salvo indicación contraria. Se listan por orden de riesgo.

### 6.1 ¿Los gastos históricos consumen presupuesto?

- **Qué falta**: confirmación del cliente.
- **Contexto**: por §2.6, los históricos (`sin_presupuesto`) **sí** cuentan como gastado en el
  disponible de la persona, pero **no** cuelgan de ninguna partida. Si el cliente asigna una
  partida a alguien que ya tiene gastos del mes, el disponible aparecerá reducido de entrada.
- **Recomendación por defecto**: **dejarlo así** y explicárselo al cliente en la capacitación
  ("la partida controla el saldo del centro, no solo lo que se registre de aquí en adelante").
  La alternativa —arrancar el consumo desde cero— permitiría duplicar el gasto real del centro.
- **Si el cliente quiere lo contrario**: se agrega un filtro por `created_at >= partida.created_at`
  en `spent`. Es un cambio de una línea en `ExpenseBudgetService`, pero cambia el número que ve
  todo el mundo: hay que decidirlo **antes** del paquete de presupuesto.

### 6.2 ¿El presupuesto se controla contra el valor sin IVA o con IVA?

- **Qué falta**: confirmación del cliente (es una definición contable, no técnica).
- **Contexto**: hoy el sistema tiene una sola verdad del "gastado" y es **sin IVA**
  (`invoice_value`), tanto en `recalculate_cost_center:585` como en `get_show_center:211`.
- **Recomendación por defecto**: **sin IVA (`invoice_value`)**, para no crear dos verdades
  distintas del gastado en la misma pantalla.
- **Impacto si cambia**: una constante en `ExpenseBudgetService` y todos los tests del nivel 1.
  Cambiarlo **después** de que el cliente vea números en pantalla es carísimo en confianza.

### 6.3 Resolución del actor por teléfono (WhatsApp)

- **Qué falta**: la tabla `users` **no tiene ninguna columna de teléfono** (verificado en
  `db/schema.rb:576-602`). No es "verificar el dato": el dato no existe.
- **Alcance real**: migración `add_column :users, :phone, :string` + `phone_normalized` (solo
  dígitos, últimos 10) + índice, más el poblado y depuración de ~N usuarios, más
  `actor_phone` en `server_context` (`mcp_controller.rb:20-33`), más `actor_user_by_phone` y un
  `as_actor_strict` en `ApplicationTool`.
- **Recomendación por defecto**: **modo estricto y sin fallback**. Si el teléfono no resuelve a
  un usuario, el agente **rechaza el registro** y pide que la persona se identifique. El fallback
  silencioso al Administrador que hace `ApplicationTool.actor_user:52-53` es inaceptable para
  crear gastos. El primitivo estricto `actor_user_by_email` ya existe y hoy es código muerto:
  se le hace la gemela de teléfono.
- **Riesgo**: el plan interno ya lo marca como probabilidad **Alta** de exceder lo presupuestado.
  Si al abrir el dato resulta que no hay teléfonos, hay que renegociar el alcance de esa parte
  antes de escribir código.

### 6.4 Qué monedas entran al catálogo

- **Qué falta**: confirmación del cliente sobre qué monedas aparecen de verdad en la operación.
- **Recomendación por defecto**: arrancar con **COP, USD, EUR**. Agregar una es un PR de una
  línea (§1.6).
- **Y de qué fuente sale cada una**: TRM oficial de datos.gov.co para USD (es la única que
  publica el gobierno colombiano); BCE para EUR (vía USD como puente o cruce directo). Si el
  cliente pide una moneda que ninguna fuente cubre, se resuelve con captura manual
  (`exchange_rate_source: "manual"`), que ya está contemplada.

### 6.5 Almacenamiento de comprobantes en S3

- **Qué falta**: verificar en producción que `AWS_ACCESS_KEY`, `AWS_SECRET_KEY` y `AWS_BUCKET`
  estén pobladas, y **en qué región está el bucket** (`config/initializers/carrierwave.rb` no
  fija `fog_region` y fog-aws asume `us-east-1`; si el bucket está en otra región las subidas
  fallan o redirigen).
- **Recomendación por defecto**: verificar con `heroku config -a <app>` **antes** de empezar el
  paquete de comprobante. Si las variables no están, ese paquete no arranca: corregir los
  uploaders a fog sin credenciales rompe las subidas que hoy funcionan (mal, pero funcionan).
- **Visibilidad del archivo**: `fog_public` no está configurado ⇒ default `true` ⇒ URL pública,
  permanente y adivinable. Para una factura eso es discutible.
  **Recomendación por defecto**: `self.fog_public = false` **dentro de `ReceiptUploader`**, nunca
  en el initializer (es global y rompería las URLs ya emitidas de avatares y órdenes de compra).
  Con eso, `receipt_file.url` devuelve una URL firmada con expiración de 600 s por defecto — hay
  que verificar que el frontend la pida en el momento de hacer clic y no la cachee.
- **No prometer migración de comprobantes históricos**: `.slugignore` excluye `public/uploads/` y
  el filesystem de Heroku es efímero; los archivos ya subidos con `storage :file` son
  irrecuperables.

### 6.6 Background jobs para TRM y extracción

- **Qué falta**: nada que verificar; es una decisión de arquitectura.
- **Contexto**: no hay `queue_adapter` en ningún entorno ⇒ ActiveJob corre en `:async`
  (in-process, se pierde al reiniciar el dyno). No hay Redis (la gema está comentada en el
  Gemfile).
- **Recomendación por defecto**: **todo síncrono**, con timeout corto (5 s HTTP / 20 s
  extracción), caché en `exchange_rates` y fallback manual. Razón: la TRM se consulta una vez por
  moneda+fecha y después sale de la tabla; introducir Sidekiq + addon de Redis agrega costo
  mensual y una pieza de infraestructura para resolver un problema que todavía no existe.
- **Disparador para reconsiderar**: si el p95 del `POST /report_expenses` con moneda extranjera
  supera 3 s en producción, se evalúa Sidekiq. No antes.

### 6.7 Herramientas de test que no están instaladas

- **Qué falta**: decidir si se agregan `webmock`/`vcr` (para stubear la fuente de TRM) y si se
  monta CI.
- **Recomendación por defecto**: **no agregar gemas de test**. La fuente externa se stubea
  reemplazando el método público del servicio en el test, que es suficiente para los 6 casos del
  nivel 1 y no agrega dependencias a un Gemfile que ya tiene un `axlsx` pinneado a un ref de git.
- **Reconsiderar** solo si aparecen más de dos integraciones HTTP salientes.

🔴 **SEAMS DE RED CANÓNICOS (auditoría, vinculante).** El paquete 12 hace `prepend` sobre el
`singleton_class` de cada servicio en `config/initializers/e2e_stubs.rb`, y los tests de nivel 1
stubean el mismo punto. Para que eso se pueda escribir, cada servicio expone **un único método de
clase de borde de red, con este nombre exacto y no otro**:

| Servicio | Método de borde (nombre obligatorio) | Firma | Dueño |
|---|---|---|---|
| `ExchangeRateService` | **`self.fetch_remote(currency:, date:)`** | devuelve `Result` (`ok?`, `value`, `errors`) | 05 |
| `ReceiptExtractionService` | **`self.call_vision_model(payload)`** | devuelve el hash crudo del modelo | 10 |

Reglas: el método es **público** (aunque no se documente como API), es el **único** que abre un
socket, y **no recibe el cliente por parámetro**. La inyección por parámetro `client:` del 05 y el
seam de atributo de clase `api_client=` del 10 **se eliminan** y se reemplazan por estos dos
métodos: dos mecanismos distintos para lo mismo obligan al 12 a adivinar. Los dobles de test se
construyen con `Service.stub(:fetch_remote, ->(**){ ... })`, sin gemas nuevas.

### 6.8 Reglas de negocio del motor

- **Qué falta**: las reglas por escrito del cliente (antigüedad máxima en días, lista de
  conceptos no permitidos, tope de valor por gasto, tolerancia de coherencia declarado vs
  comprobante).
- **Recomendación por defecto**: implementar el **motor** con las 5 reglas de la propuesta §4.4 y
  valores por defecto parametrizables desde la tabla `parameterizations` (que ya existe y ya se
  usa para "HORA HOMBRE COSTO" y similares), no hardcodeados. Así el paquete arranca sin esperar
  al cliente y los valores se ajustan después sin desplegar.
- **Riesgo comercial**: el plan interno es explícito en que a este precio **no hay contingencia**
  y que las reglas por escrito "dejan de ser buena práctica y pasan a ser condición para no
  perder plata". Si a la fecha de arranque del paquete no hay reglas escritas, se implementan las
  5 por defecto y **cualquier regla adicional es alcance nuevo**.

### 6.9 Corregir el typo `"Gatos"` en la auditoría

- **Recomendación por defecto**: **no corregirlo**. Los filtros de la pantalla de notificaciones
  dependen de ese string y corregirlo obliga a migrar los `RegisterEdit` históricos. Los campos
  nuevos se auditan con el mismo `"Gatos"`. Documentado como deuda técnica, no como bug abierto.

### 6.10 Los dos formularios de gasto duplicados

- **Recomendación por defecto**: **no unificarlos**. Agregar los campos nuevos dos veces cuesta
  menos que unificar `components/ReportExpense/FormCreate.jsx` con el `renderModal()` embebido en
  `packs/ReportExpenseIndex.js`, y unificarlos arriesga las dos pantallas a la vez. Se anota como
  deuda con estimado propio (~8 h) para un proyecto futuro.

---

## Anexo — Checklist de arranque

Movido y convertido en tarea con dueño: ver **§7.10 — Tarea 0**. Ya no es un checklist sin
responsable; es la puerta de entrada del proyecto y bloquea el merge del paquete 04.

---

# 7. Resoluciones de auditoría (vinculante)

> Esta sección se agregó tras la auditoría cruzada de los 13 documentos del plan. Resuelve los
> conflictos de propiedad, contrato y numeración entre paquetes. **Manda sobre las §1–§6 de este
> archivo y sobre cualquier paquete.** Ningún paquete puede inventar un nombre, una firma o un
> dueño que contradiga lo de aquí sin actualizar esta sección **en el mismo PR**.

## 7.1 Tabla canónica de los 12 paquetes

Esta es la **única** numeración válida. Toda tabla de "Dependencias" de cualquier paquete se cita
con estos números **y además con el nombre del archivo**. Las etiquetas viejas `"Paquete 0"`,
`"Paquete 00"`, `"01 — Presupuesto"`, `"02 = migraciones + modelo + servicio"` y
`"los números 03-06 no están fijados"` **son erróneas y quedan derogadas**.

| # | Título | Archivo | Depende de | ¿UI? |
|---|---|---|---|---|
| 01 | Infraestructura de pruebas (Minitest + Playwright) | `01-infraestructura-de-pruebas.md` | — | Solo `data-testid` mínimos |
| 02 | Migraciones, esquema y datos históricos | `02-migraciones-y-esquema.md` | 01 | No |
| 03 | Deuda técnica bloqueante (uploaders, `search`, auditoría) | `03-deuda-tecnica-bloqueante.md` | 01 | No |
| 04 | Dominio: partidas presupuestales y aprobación automática | `04-presupuesto-y-aprobacion.md` | 01, 02, 03 | No |
| 05 | Multimoneda, TRM y servicio de tasas | `05-multimoneda-y-trm.md` | 01, 02, 03 | No (**solo backend**) |
| 06 | Comprobante, contabilidad (backend) y Excel | `06-comprobante-y-contabilidad.md` | 01, 02, 03, **04**, **05** | No (**solo backend**) |
| 07 | Controladores, rutas, serializers y permisos | `07-api-permisos-y-rutas.md` | 01, 02, 03, 04, 05, 06 | No |
| 08 | Frontend: pestaña Presupuesto y formularios de gasto | `08-frontend-presupuesto-y-gastos.md` | 04, 05, 06, 07, 09, 10 | **Sí** |
| 09 | Frontend: columnas, filtros y pantalla de Contabilidad | `09-frontend-tablas-y-contabilidad.md` | 04, 05, 06, 07 | **Sí** |
| 10 | IA: extracción de comprobantes y motor de reglas | `10-ia-extraccion-y-reglas.md` | 01, 02, 03, 05 | No |
| 11 | MCP: tools, actor por teléfono y contrato con Taimes | `11-mcp-y-agente-whatsapp.md` | 01, 02, 04, 05, 06, 10 | No |
| 12 | Suite E2E con Playwright | `12-e2e-playwright.md` | 01, 08, 09 | Consume UI |
| 13 | Cierre: documentación, capacitación, datos y puesta en marcha | `13-cierre-documentacion-y-puesta-en-marcha.md` | todos | No |

> El **paquete 13 es nuevo** (creado por la auditoría) y absorbe los entregables vendidos que no
> tenían dueño: manual de usuario, guía de configuración de reglas, instructivo de WhatsApp,
> sesiones de capacitación, poblado de `users.phone`, configuración del agente dentro de Taimes y
> verificación de la transcripción de voz. Ver §7.11.

## 7.2 Matriz de propiedad exclusiva de archivos

Regla: **un archivo, un dueño.** Si un paquete necesita algo de un archivo ajeno, lo declara como
dependencia y espera; nunca lo escribe "por si acaso".

| Archivo / artefacto | Dueño único | Notas de la resolución |
|---|---|---|
| `db/migrate/2026040*` (las 6) | **02** | 04, 05 y 06 borran sus tareas de migración |
| `db/migrate/20260405000001_add_phone_to_users.rb` | **11** | única excepción, ya está en la tabla de §1. **Consecuencias mecánicas autorizadas**: el 11 regenera `db/schema.rb` (fila de `users` + `version:`; el archivo es del 02, que va cinco olas antes) y las cabeceras `annotate` de `app/models/user.rb` y `test/fixtures/users.yml`. Se anota en su PR |
| `config/initializers/carrierwave.rb` | **03** | 01 borra su Tarea 15; 06 borra su A3; 12 solo consume `E2E_UPLOAD_ROOT` |
| `app/uploaders/{avatar,certificate,information,order}_uploader.rb` | **03** | 06 los quita de "A modificar" |
| `app/uploaders/receipt_uploader.rb` | **06** | — |
| `app/models/concerns/register_auditable.rb` + los 3 métodos de auditoría de `ReportExpense` | **03** | 04 y 06 agregan `audit_field` y actualizan los golden del 03 |
| `ReportExpense.search` + `SEARCH_KEYS` + los 6 call sites | **03** | — |
| `app/models/expense_budget.rb`, `app/services/expense_budget_service.rb` | **04** | firma canónica en §7.4 |
| `app/services/exchange_rate_service.rb`, `exchange_rate_client.rb`, `app/models/{currency,exchange_rate}.rb` | **05** | — |
| `app/services/{receipt_extraction_service,expense_rule_service}.rb` | **10** | `ReceiptExtractionService::Result` es la **única excepción documentada** al `Result` canónico (ver §4.2) |
| `ReportExpense.import` (detección de layout + las 18 posiciones del `header`) | **06** | Dueño único. El 05 **borra su Tarea 17** y el 06 absorbe sus dos reglas de moneda (`Currency.foreign?`/`Currency::DEFAULT` y `cop_manual_override = row["invoice_value"].present?`) dentro de la tabla de mapeo de su C2 |
| `app/serializers/report_expense_serializer.rb` | **07** | **Dueño único del archivo completo** (los 13 atributos nuevos + `belongs_to :accounting_approved_by` + `receipt_file`). El **05** y el **06 borran esa fila de su tabla "A modificar"**: solo declaran la dependencia y su test de contrato sobre el JSON |
| `app/helpers/application_helper.rb` | **reparto por método** | `get_currencies` → **05**; `budget_status_label(value)` y `accounting_state_label(value)` (plantillas axlsx) → **06**; `authorization_accounting_expenses` y `controller_name_helper` → **09**. Cada paquete **agrega solo sus métodos al final del helper** y rebasa antes del PR. Orden intra-ola 3: **05 → 06** (§7.3). `currency_options` **no existe**: el 09 consume `get_currencies` del 05, no crea nada |
| `app/controllers/report_expenses_controller.rb` (strong params, filtros, orden, **cableado presupuestal**) | **07** | 06 aporta solo `delete_receipt`/`download_receipt`; 10 aporta el guard de reglas **y la acción `extract_receipt` completa** (excepción documentada, ver la fila siguiente). El 07 **sí** agrega `:receipt_file` y `:remove_receipt_file` a los strong params de `create`/`update` (sin ellos el POST multipart del 06 no guarda el comprobante) |
| `app/controllers/report_expenses_controller.rb#extract_receipt` + su ruta + `test/controllers/report_expenses_extract_receipt_test.rb` | **10** | **Excepción documentada al dueño del archivo.** El 10 la diseña, la implementa (con su helper `build_draft`), la prueba (16 casos) y es dueño de los criterios 20–26 y 29.1. Se mergea en la **ola 3b**; el 07 (ola 4) la recibe ya escrita y no la reescribe. Mismo tratamiento que `delete_receipt`/`download_receipt` del 06 |
| `app/controllers/accounting_expenses_controller.rb` + rutas + axlsx de contabilidad | **06** | backend completo |
| `app/javascript/packs/AccountingExpenseIndex.js` + `app/views/accounting_expenses/index.html.erb` | **09** | 06 **borra su bloque B10** |
| `app/controllers/expense_budgets_controller.rb` + `expense_budget_serializer.rb` + rutas | **07** | — |
| `app/controllers/cost_centers_controller.rb#show` (`@estados`) | **07** | claves canónicas en §4.4 |
| `app/views/layouts/user.html.erb` | **reparto por bloque** | `data-testid="nav-gastos"` en el `link_to report_expenses_path` → **01**; el bloque `<script>` con `window.CM_CURRENCIES = <%= raw get_currencies.to_json %>` → **05**; ítem de menú "Contabilidad" + `expense_controllers` + `controller_name_helper` + `authorization_accounting_expenses` → **09**. Es el layout de **todas** las pantallas: quien lo toque corre la suite completa antes del PR |
| `components/ReportExpense/FormCreate.jsx` + `renderModal()` de `packs/ReportExpenseIndex.js` | **08** | ver §4.5 |
| `this.columns` / filtros de las dos tablas de gastos | **09** | ver §4.5 |
| `app/javascript/generalcomponents/expenseIndicators.js` | **09** | archivo nuevo compartido (`budgetStatusBadge`, `accountingBadge`); el **08 lo consume** desde `renderModal()` y `ExpensesTable.jsx`, no lo crea |
| `app/tools/*` (todas las tools, `records_search`, `mcp_controller.rb`) | **11** | 05 borra su Tarea 18 (`exchange_rates_get_tool`) y su bullet de `report_expenses_create_tool.rb`. **Única excepción, la de §7.7**: sobre `report_expenses_list_tool.rb` el **05 agrega las claves 20–26** y el **06 las 27–28** de `KEYS`, nada más. Ningún otro archivo de `app/tools/` lo toca nadie fuera del 11 |
| `lib/tasks/permissions_gastos_ia.rake` + réplica en `create_config.rake` | **01** | **movido desde el 07** para romper el ciclo 06↔07 |
| `lib/tasks/parameterizations_gastos_ia.rake` | **10** | — |
| `test/test_helper.rb` y `test/fixtures/files/**` | **01** | ver §7.12 |
| `test/fixtures/{rols,users,customers,cost_centers,module_controls,accion_modules,parameterizations,report_expenses}.yml` (los 8) | **01** | los demás paquetes **agregan etiquetas**, no reescriben |
| `test/fixtures/expense_budgets.yml` | **04** | la difiere el 02 (corrección 7): sin `app/models/expense_budget.rb` Rails no resuelve las etiquetas de asociación |
| `test/fixtures/exchange_rates.yml` | **05** | ídem; debe incluir `effective_date` (§1.5) |
| `test/support/**` | **reparto** | el **01** pone el autoload en `test_helper.rb` y es dueño de la convención; los paquetes **05, 10 y 11 crean ahí sus propios dobles y helpers** (`fake_anthropic_client.rb` + `WithFakeExtractor`, `mcp_test_helpers.rb`), un archivo por paquete, y **no tocan `test_helper.rb`** |
| `test/controllers/cost_centers_controller_test.rb` | **08** | test de **consumo**: blinda las 10 claves de `@estados` (§4.4) que el frontend lee por string. El 07, dueño del código, **no crea este archivo** |
| Infraestructura Playwright (`playwright.config.js`, `global-setup`, `auth.setup`, `env.js`, `db.js`, `smoke.spec.js`) | **01** | — |
| `db/seeds/e2e.rb` + `seed-ids.json` | **01** | El 01 escribe el archivo y **todo su contenido** (7 centros, 6 usuarios `@controlmatica.test`, 3 roles E2E, 57+12 gastos) siguiendo la especificación de las **Tareas 1–6, 13, 16, 25 y 26 del paquete 12**, que es quien la redacta. Se coordinan **en el mismo PR**; el 12 no escribe el archivo |
| `test/e2e/specs/*.spec.js` funcionales | **12** | 05, 06, 08 y 09 borran los suyos |
| `config/initializers/e2e_stubs.rb` | **12** | usa los seams de §6.7 |

### Fixtures: dueño único = paquete 01

`rols.yml`, `users.yml`, `customers.yml`, `cost_centers.yml`, `module_controls.yml`,
`accion_modules.yml`, `parameterizations.yml`, `report_expenses.yml` y el contenido de
`test/fixtures/files/` **los define el paquete 01**. Los demás paquetes **agregan etiquetas** a
esos archivos; no los reescriben ni cambian las etiquetas existentes.

- **`test/fixtures/accion_modules_rols.yml` NO EXISTE y no se crea.** El HABTM se declara inline
  en `rols.yml` (decisión del 01, punto 3 de sus Discrepancias). Los paquetes **07, 09 y 10**
  corrigen sus tablas para decir `rols.yml`. Crearlo duplica filas de la tabla puente e invalida
  el criterio "el rol administrador no tiene `accion_modules`" del 01.
- Etiquetas de rol/usuario canónicas (del 01): roles `administrador`, `gerente`, `ingeniero`,
  `contador`, `sin_permisos`; usuarios `admin`, `ingeniero`, `contador`. El paquete 07 **agrega**
  `presupuesto_pleno` y `presupuesto_limitado` a `rols.yml`; **no renombra nada** y **no cambia**
  `sin_permisos` (`name: "Sin permisos"`, no `"Rol Sin Permisos"`).
- **`dueno_centro` lo crea el 01, no el 07** (cierra la Discrepancia 2 del 07). El 01 es dueño de
  `users.yml` **y** de `cost_centers.yml`, así que escribe las dos mitades del par en la misma
  ola y ninguna fixture referencia una etiqueta que aún no existe:
  **valor definitivo → `cost_centers(:centro_con_viaticos).user_owner = users(:dueno_centro)`**
  (y `centro_ajeno.user_owner` sigue siendo `contador`). Sin esto, los tests de autorización por
  propiedad del 07 (`get_expense_budgets` / `create` / `destroy` siendo dueño) no tienen fixture
  que los soporte. El usuario **nace con `rol: gerente`** (el único que existe en la ola 1) y el
  **07 lo pasa a `presupuesto_limitado`** en el mismo PR en que declara ese rol; el 07 **no lo
  declara**, solo cambia esa línea.
- **Etiquetas que ningún paquete inventa por su cuenta** (cierra la observación del 09):
  `users(:contable)` **no existe y no se crea** — se usa `users(:contador)`, la canónica del 01.
  `users(:ingeniero_sin_permisos)` **sí** es etiqueta nueva: la **agrega el paquete 09** a
  `users.yml` (usuario con `rol: sin_permisos`), y con eso queda listada aquí como manda la regla
  de "no inventar etiquetas sin actualizar §7.2 en el mismo PR".
- **Dobles de prueba**: todo doble va en `test/support/` y **se autocarga** con el
  `Dir[Rails.root.join("test/support/**/*.rb")].each { |f| require f }` que el 01 pone en
  `test_helper.rb`. Los paquetes **05, 10 y 11 borran sus `require_relative`** y **no modifican
  `test_helper.rb`**; los helpers de conveniencia (`with_fake_extractor`, helpers de MCP) viven
  dentro del propio archivo de `test/support/`, como módulo que el test incluye.

## 7.3 Grafo real de dependencias y olas

El grafo es **casi lineal**; no prometer paralelismo que no existe. Tras partir la ola 3 en **3a**
y **3b** (ver abajo), **ninguna ola tiene más de dos paquetes simultáneos**. Aristas reales:

```
01 ──┬─► 02 ──┬─► 04 ──┐
     └─► 03 ──┤        ├─► 07 ──┬─► 09 ──┬─► 08 ──► 12 ──► 13
              ├─► 05 ──┤        │        │         ▲
              └─► 06 ──┘        └────────┘         │
                     └─► 10 ─────────────────► 08 ─┘
                     └─► 11 ───────────────────────► 13
```

**Ciclos detectados y cómo se rompieron** (los dos eran reales y bloqueantes):

1. **06 ↔ 07.** El 06 necesitaba `lib/tasks/permissions_gastos_ia.rake`, que creaba el 07; el 07
   necesitaba `mount_uploader :receipt_file`, que creaba el 06. **Roto moviendo la rake task de
   permisos al paquete 01**, que es prerrequisito de ambos. Queda 06 → 07, sin vuelta.
2. **08 ↔ 09.** El 08 consumía `expense-budget-status-{id}` que produce el 09, y el 09 consumía el
   serializer extendido de 05/07. **Roto declarando que 09 se mergea antes que 08.**

Olas de ejecución (ver `00-README.md` para los prompts de lanzamiento):

| Ola | Paquetes | Por qué pueden ir juntos |
|---|---|---|
| 0 | **Tarea 0** (§7.10) | Decisiones del cliente; no es código |
| 1 | **01** | Nadie puede escribir un test antes |
| 2 | **02**, **03** | Tocan conjuntos disjuntos: 02 solo `db/migrate` + rake de verificación; 03 solo `app/uploaders`, `ReportExpense.search` y el concern de auditoría |
| **3a** | **04**, **05** | Disjuntos salvo `report_expense.rb`, ya declarado. **Ninguno depende del otro** |
| **3b** | **06**, **10** | Ambos dependen de código de 3a y **no pueden lanzarse a la vez que él** |
| 4 | **07** | Único que toca la capa HTTP compartida |
| 5 | **09**, **11** | 09 es React de tablas; 11 es `app/tools/`. Cero solape |
| 6 | **08** | Necesita los testids del 09 y el endpoint de extracción del 10 |
| 7 | **12** | Necesita toda la UI en verde |
| 8 | **13** | Documenta y pone en marcha lo que ya existe |

### La ola 3 se parte en dos sub-olas (vinculante)

La ola 3 **no podía correr con sus cuatro paquetes en paralelo**: dos de ellos declaran
dependencias de **código**, no de datos, contra los otros dos.

- El **10** depende **duro** del **05**: su tabla de dependencias exige `Currency::CODES`,
  `Currency.valid?` y `ExchangeRateService.fetch(currency:, date:)` ("contrato duro") y su Tarea 14
  los llama literalmente. Lanzado en paralelo, se para en su primera tarea con `NameError`.
- El **06** depende del **04** (`ReportExpense::BUDGET_STATUS_LABELS`, cuyo fallback le borró la
  corrección 10, usado en `budget_status_label` para el axlsx) y del **05** (`Currency.valid?` en
  la columna 13 de `ReportExpense.import` y `currency`/`foreign_value`/`exchange_rate` en las
  columnas 14–16 del Excel).

```
Ola 3a ── 04 │ 05      (en paralelo)
Ola 3b ── 06 │ 10      (en paralelo, después de que 3a esté mergeada)
```

**Orden de merge intra-ola 3, único y vinculante: `04 → 05 → 06 → 10`.** De aquí se derivan, sin
excepción:

| Artefacto compartido | Orden fijado | Por qué |
|---|---|---|
| `app/views/report_expenses/download_file.xlsx.axlsx` (y la plantilla de contabilidad) | **05 antes que 06**; el **06 es el dueño** y el único que las lleva a 18 columnas | Sus columnas 14–16 leen `currency`/`foreign_value`/`exchange_rate` y su `budget_status_label` usa la constante del 04: si el 06 fuera primero, revienta |
| `app/helpers/application_helper.rb` | 05 (`get_currencies`) → 06 (los dos `*_label`) → 09 | Cada uno agrega **solo sus métodos al final** |
| `ReportExpense.import` | **dueño único 06**, después del 05 | El 06 escribe las 18 posiciones **incluidas** las dos reglas que aportaba el 05 (`Currency.foreign?`/`Currency::DEFAULT` y `cop_manual_override`) |
| `app/models/report_expense.rb` — lista de `audit_field` y golden `HTML_EDICION` del 03 | `audit_field :budget_status` (04) **antes** que `audit_field :receipt_file` (06) | El golden es byte a byte: el orden de los segmentos del HTML es el orden de declaración |

> ⚠️ **La regla "06 antes que 05 (por las plantillas axlsx)" que circulaba en el README §6 y en la
> corrección 9 del paquete 05 queda DEROGADA.** Era exactamente al revés: el 06 consume del 05, no
> al contrario. El 05 **no toca ni verifica** las plantillas axlsx; solo deja escrito el contrato
> de las columnas 14–16 que el 06 implementa y verifica.

## 7.4 Contrato canónico de `ExpenseBudgetService`

Productor: **04**. Consumidores: **07** (controllers), **08** (a través de 07), **11** (tools MCP).
Los tres copian esta firma **literalmente**. Toda variante previa (sin `!`, `attrs:` en vez de
kwargs, `summary_for_center(cost_center)` con objeto, `Result` posicional) queda derogada.

```ruby
class ExpenseBudgetService
  LOCK_TIMEOUT_MS = 5_000

  Result = Struct.new(:ok, :value, :errors, keyword_init: true) do
    def ok?    = ok
    def error? = !ok
  end

  # --- Lectura (sin lock) -------------------------------------------------
  def self.available_for(cost_center_id:, user_id:, exclude_expense_id: nil) # => Hash
  def self.summary_for_center(cost_center_id)                                # => Hash, ver abajo

  # --- Evaluación --------------------------------------------------------
  # Asigna budget_status / budget_reason / expense_budget_id EN MEMORIA. NO guarda.
  # DEBE invocarse dentro de with_center_lock. Idempotente. Devuelve el propio expense.
  def self.evaluate!(expense, actor: nil)

  # Punto de entrada ÚNICO para guardar un gasto: toma el lock, evalúa, guarda y reevalúa.
  def self.persist_with_evaluation!(expense, actor:,
                                    previous_cost_center_id: nil,
                                    previous_user_invoice_id: nil)           # => Result
  def self.on_expense_destroyed!(cost_center_id:, user_id:, actor: nil)      # => Result
  def self.reevaluate_center_user!(cost_center_id:, user_id:, actor: nil)    # => Result

  # --- CRUD de partidas (todos con bang, todos devuelven Result) ----------
  def self.create_budget!(cost_center_id:, user_id:, amount:, notes: nil, actor:)  # => Result
  def self.update_budget!(budget, attrs, actor:)                                   # => Result
  def self.destroy_budget!(budget, actor:)                                         # => Result
  def self.validate_cap!(budget)                                                   # => nil | String

  private_class_method def self.with_center_lock(*cost_center_ids, lock_timeout_ms: LOCK_TIMEOUT_MS)
end
```

**Forma exacta de `summary_for_center`** — es la del contrato §3 A.3 y la que consume
`BudgetSummaryBoard` del 08. El hash plano que el 04 describía originalmente
(`{cost_center:, viatic_value:, assigned:, ...}`) **queda derogado**: los totales van anidados en
`totals:`.

```ruby
{
  cost_center: { id:, code:, viatic_value: },
  totals:      { viatic_value:, assigned:, unassigned:, spent:, available: },
  by_user:     [ { user_id:, user_name:, assigned:, spent:, available:,
                   budgets_count:, exceeded_expenses_count: } ]
}
```

**`ExpenseBudget` — obligaciones adicionales del modelo (04):**
- `attr_writer :spent_amount, :available_amount` **declarados explícitamente**, además de la
  memoización en los métodos lectores. Sin ellos, el `preload_amounts!` del controller del 07
  revienta con `NoMethodError` y la tabla de partidas cae en N+1.
- `ReportExpense::BUDGET_STATUS_LABELS` se define **en el paquete 04** (Tarea 12), no en el 06:
  ```ruby
  BUDGET_STATUS_LABELS = { "sin_presupuesto" => "Sin presupuesto",
                           "aprobado"        => "Aprobado",
                           "excedido"        => "Excedido" }.freeze
  ```
  El 06 **borra su fallback** ("si no existe se crea aquí") y el 11 la consume sin fallback.

**Cableado obligatorio (lo implementa el 07, no el 04).** Esta es la corrección más importante de
toda la auditoría: sin ella `budget_status` **nunca se calcula por la vía web** y todo el tablero
del 08, las columnas del 09 y la vista de contabilidad del 06 muestran datos falsos.

```ruby
# app/controllers/report_expenses_controller.rb   — DUEÑO: paquete 07
# create
expense = ReportExpense.new(report_expense_params_create)
result  = ExpenseBudgetService.persist_with_evaluation!(expense, actor: current_user)

# update  — capturar ANTES del assign_attributes
prev_cc = @report_expense.cost_center_id
prev_u  = @report_expense.user_invoice_id
@report_expense.assign_attributes(report_expense_params_update)
result  = ExpenseBudgetService.persist_with_evaluation!(
            @report_expense, actor: current_user,
            previous_cost_center_id: prev_cc, previous_user_invoice_id: prev_u)

# destroy — capturar ANTES del destroy
cc = @report_expense.cost_center_id
u  = @report_expense.user_invoice_id
@report_expense.destroy
ExpenseBudgetService.on_expense_destroyed!(cost_center_id: cc, user_id: u, actor: current_user)
# recalculate_cost_center(...) se sigue llamando DESPUÉS y FUERA del servicio.
```

**Y en el camino MCP (paquete 11, Tarea 8): se usa el MISMO punto de entrada.** El
`re.save` + `evaluate!` + `re.reload` que el 11 describía **pierde los tres valores en el reload**
(porque `evaluate!` no guarda) y deja en `sin_presupuesto` todo gasto creado por WhatsApp. Se
reemplaza por `ExpenseBudgetService.persist_with_evaluation!(re, actor: creator)`.

## 7.5 Reglas de negocio: mismo control por web y por MCP

La propuesta §4.6 promete textualmente: *"Se aplican las mismas reglas de negocio que en WhatsApp:
la validación es la misma sin importar por dónde entre el gasto"*. Hoy el guard vive solo en
`ReportExpensesController#create/#update` y `ReportExpensesCreateTool` construye el `ReportExpense`
sin pasar por ahí; el único "control" en MCP era una frase en la `description` de la tool, es decir
**una instrucción de prompt, no un control de servidor**.

**Vinculante para el paquete 11, Tarea 8** (y criterio de aceptación nuevo):

```ruby
violations = ExpenseRuleService.validate(attrs.merge(actor: creator))
if violations.any? { |v| v[:blocking] }
  return tool_json(type: "error",
                   message: violations.select { |v| v[:blocking] }.map { |v| v[:message] },
                   rule_violations: violations)   # NO se llama a save
end
result = ExpenseBudgetService.persist_with_evaluation!(re, actor: creator)
```

- `ExpenseRuleService` entra en la tabla de **dependencias de código** del paquete 11, no solo en
  la de la tool `expense_rules_validate`.
- Test obligatorio en `test/tools/report_expenses_create_tool_test.rb`: un gasto duplicado y uno
  sobre el tope de valor dejan `ReportExpense.count` **sin cambio** y devuelven `type: "error"`.
- La frase de la `description` se conserva (ayuda al agente), pero **no cuenta como control**.

## 7.6 Tabla canónica de `data-testid`

**Fuente única.** Los nombres son los que producen los paquetes dueños (08 y 09); el "Contrato de
`data-testid`" del paquete 12 se **reescribe contra esta tabla** — su versión anterior no tenía
prácticamente ningún solape con lo que los dueños emiten y sus 28 tests no habrían encontrado ni
un selector. Ningún paquete inventa un nombre nuevo sin actualizar esta tabla en el mismo PR.

| Superficie | `data-testid` | Dueño |
|---|---|---|
| Navegación y base | `nav-gastos`, `page-report-expenses`, `cm-datatable`, `cm-datatable-row` | 01 |
| Navegación Contabilidad | `nav-contabilidad` | 09 |
| Pestaña Presupuesto | `budget-tab`, `budget-panel` | 08 |
| Tablero | `budget-summary`, `budget-summary-loading`, `budget-summary-error`, `budget-summary-empty`, `budget-summary-no-viatic`, `budget-summary-viatic`, `budget-summary-assigned`, `budget-summary-unassigned`, `budget-summary-spent`, `budget-summary-available`, `budget-summary-exceeded`, `budget-summary-by-user`, `budget-summary-user-{id}` | 08 |
| Tabla de partidas | `budget-new-btn`, `budget-filter-active`, `budget-table-error`, `budget-row-{id}`, `budget-available-{id}`, `budget-row-menu-{id}`, `budget-row-edit-{id}`, `budget-row-delete-{id}` | 08 |
| Formulario de partida | `budget-user-select`, `budget-amount`, `budget-notes`, `budget-active`, `budget-live-panel`, `budget-live-limit`, `budget-live-available`, `budget-block-message`, `budget-server-error`, `budget-submit` | 08 |
| Gasto — botón nuevo | `expense-new` | 09 |
| Gasto — comprobante | `expense-receipt-input`, `expense-receipt-name`, `expense-receipt-delete`, `expense-receipt-error` | 08 |
| Gasto — comprobante en fila (`ExpensesTable.jsx`) | `expense-receipt-link-{id}`, `expense-receipt-preview-{id}` | 08 |
| Gasto — comprobante en fila (columna `receipt_file` del índice de Gastos, `this.columns`) | `expense-receipt-link-{id}`, `expense-receipt-preview-{id}` | **09** (ver §4.5: la columna vive en el constructor, que es del 09) |
| Modal de previsualización | `receipt-preview-modal` | 08 (vive fuera del constructor) |
| Gasto — extracción IA | `expense-extract-btn`, `expense-extract-loading`, `expense-extract-done`, `expense-extract-warnings`, `expense-extract-error`, `expense-rule-violation`, `expense-low-confidence-{campo}` | 08 |
| Gasto — moneda | `expense-currency-select`, `expense-foreign-block`, `expense-foreign-value`, `expense-foreign-tax`, `expense-foreign-total`, `expense-rate`, `expense-rate-date`, `expense-fetch-rate-btn`, `expense-rate-loading`, `expense-rate-ok`, `expense-rate-shifted`, `expense-rate-error`, `expense-cop-preview`, `expense-cop-manual-toggle` | 08 |
| Gasto — selects existentes | `expense-user-select` (responsable), `expense-cost-center-select` (centro de costo) — envolver el `react-select` en un `<div data-testid>` | 08 |
| Gasto — presupuesto en vivo | `expense-budget-none`, `expense-budget-ok`, `expense-budget-warning` | 08 |
| Tablas de gastos | `expense-ref-{id}`, `expense-budget-status-{id}`, `expense-accounting-status-{id}`, `expense-currency-{id}` | 09 |
| Filtros del módulo de Gastos | `filter-budget-status`, `filter-currency`, `filter-accounting-approved` | 09 |
| Contabilidad | `accounting-page`, `accounting-filter-toggle`, `accounting-filter-approved`, `accounting-filter-cost-center`, `accounting-filter-clear`, `accounting-filter-apply`, `accounting-ref-{id}`, `accounting-status-{id}`, `accounting-row-menu-{id}`, `accounting-approve-{id}`, `accounting-unapprove-{id}`, `accounting-selection-bar`, `accounting-selection-count`, `accounting-approve-selected`, `accounting-clear-selection`, `accounting-approve-filter`, `accounting-export` | 09 |
| Selección en `CmDataTable` | `cm-dt-select-all`, `cm-dt-select-{id}` | 09 |

**Nombres derogados** (aparecían en 12, 05 o 06 y **no se usan**): `tab-presupuesto`,
`budget-new`, `budget-form-user`, `budget-form-amount`, `budget-form-submit`,
`expense-form-receipt`, `expense-form-currency`, `expense-form-foreign-value`,
`expense-form-exchange-rate`, `expense-form-rate-notice`, `expense-form-budget-hint`,
`expense-extract-button`, `expense-extract-status`, `expense-receipt-download-{id}`,
`expense-exchange-rate`, `expense-exchange-rate-hint`, `expense-invoice-value`, `acc-id-{id}`,
`acc-approve-btn-{id}`, `acc-toggle-filters`, `acc-bulk-approve`, `acc-export`,
`menu-contabilidad` (el canónico es `nav-contabilidad`), `flash` (el spec 8.4 del 12 lo borra de
su selector y se queda con `.alert, .toast`).

> `filter-accounting-approved` **salió de la lista de derogados**: no era un alias de
> `accounting-filter-approved` (el de la pantalla de Contabilidad, vigente) sino el filtro **nuevo
> del módulo de Gastos** de la Tarea 5 del 09, junto con `filter-budget-status` y
> `filter-currency`. Los tres quedan vigentes en la fila "Filtros del módulo de Gastos".

Recordatorio: como el formulario de gasto está duplicado, **todos los `expense-*` de formulario
van dos veces** (en `FormCreate.jsx` y en `renderModal()`), los dos del paquete 08.

**Cobertura E2E declarada.** `expense-accounting-status-{id}`, `cm-dt-select-all` y
`cm-dt-select-{id}` **no los ejercita ningún spec del 12**: quedan cubiertos por **verificación
manual** del 09 (grep + revisión en pantalla, anotada en su PR). Se documenta aquí para que nadie
los dé por probados.

## 7.7 `ReportExpensesListTool::KEYS` — lista final canónica (28)

Hoy tiene 16. Tres paquetes (05, 06, 11) la reescribían sin orden fijado. **Cada paquete agrega
SOLO sus propias claves, en este orden, sin borrar ni reordenar las ajenas.** Criterio de
aceptación compartido por los tres: `KEYS.size == 28` y `KEYS.uniq == KEYS`.

| # | Clave | Origen |
|---|---|---|
| 1–16 | las 16 actuales, sin tocar | hoy |
| 17 | `budget_status` | 04/07 (columna), la agrega **11** |
| 18 | `budget_reason` | la agrega **11** |
| 19 | `expense_budget_id` | la agrega **11** |
| 20 | `currency` | la agrega **05** |
| 21 | `foreign_value` | **05** |
| 22 | `foreign_tax` | **05** |
| 23 | `foreign_total` | **05** |
| 24 | `exchange_rate` | **05** |
| 25 | `exchange_rate_date` | **05** |
| 26 | `exchange_rate_source` | **05** |
| 27 | `accounting_approved` | **06** |
| 28 | `receipt_file_url` (método del modelo, no columna) | **06** |

`exchange_rates_get_tool.rb`: **dueño único = paquete 11**. El 05 **borra su Tarea 18** y solo
declara la dependencia. `KEYS` de esa tool = `%i[id currency rate_date effective_date rate_to_cop
source fetched_at]`, y consume `result.errors` (array), nunca `result.error`. El registro de
`exchange_rates` y `expense_budgets` en `records_search_tool.rb` lo hace **solo el 11**.

## 7.8 Contrato entre Comprobante (06) y E2E (12): descarga

Decisión pendiente que colgaba el test E4.3 durante 60 s. `redirect_to receipt_file.url` a secas
**navega** en Chromium, no descarga, porque la URL firmada de S3 no lleva `Content-Disposition`.

**Resolución: el paquete 06 añade `response-content-disposition=attachment` a los parámetros de la
URL firmada** en `download_receipt`, con el nombre original del archivo:

```ruby
url = @report_expense.receipt_file.url(
  query: { "response-content-disposition" =>
             "attachment; filename=\"#{@report_expense.receipt_file.file.filename}\"" })
redirect_to url
```

Con eso el test del 12 usa `page.waitForEvent("download")` y verifica los bytes `%PDF-`. En el
entorno E2E (storage `:file`, `E2E_UPLOAD_ROOT=public`) el controller devuelve la misma cabecera
con `send_file ... disposition: "attachment"`. El fallback a `waitForEvent('popup')` queda
descartado.

## 7.9 Runbook único de despliegue

Criterio de cierre de la Fase 7. Nadie lo tenía: el único runbook era el del paquete 02 y cubría
solo su propio esquema.

### Orden de despliegue

Se despliega **por olas**, en el mismo orden de §7.3, y **nunca** un paquete de una ola posterior
antes que uno de la anterior. Cada ola: `staging → verificación → producción`.
Puntos de sincronización obligatorios: después de la ola 2 (esquema aplicado) y después de la
ola 4 (API completa), se corre la suite entera en staging antes de seguir.

### Variables de entorno (tabla consolidada)

`config/application.yml` está **gitignorado**: las variables se siembran con
`heroku config:set -a <app>` y se documentan aquí, no en el código.

| Variable | Paquete | staging | producción | Si falta |
|---|---|---|---|---|
| `AWS_ACCESS_KEY`, `AWS_SECRET_KEY`, `AWS_BUCKET` | 03 | ya existen | ya existen | **Bloquea la ola 2**: el Bloque A del 03 no arranca |
| `AWS_REGION` | 03 | región real del bucket | ídem | default `us-east-1`; si el bucket está en otra, las subidas fallan o redirigen |
| `TRM_API_URL` | 05 | `https://www.datos.gov.co/resource/32sa-8pi3.json` | ídem | El servicio devuelve `Result` con error y se captura la tasa a mano |
| `DATOS_GOV_APP_TOKEN` | 05 | opcional | recomendado | Sin token, Socrata aplica rate limit anónimo |
| `ECB_API_URL` | 05 | endpoint del BCE para EUR | ídem | default en código; sin él, EUR solo se captura a mano |
| `EXCHANGE_RATE_HTTP_TIMEOUT` | 05 | `5` | `5` | default 5 s (timeout de lectura) |
| `EXCHANGE_RATE_OPEN_TIMEOUT` | 05 | `3` | `3` | default 3 s (timeout de apertura de conexión) |
| `ANTHROPIC_API_KEY` | 10 | **requerida** | **requerida** | La extracción responde el error estándar; el registro manual sigue funcionando |
| `RECEIPT_EXTRACTION_MODEL` | 10 | `claude-opus-5` | `claude-opus-5` | default en código |
| `RECEIPT_EXTRACTION_ENABLED` | 10 | `true` | `true` | **kill switch de IA**: `false` apaga la extracción sin desplegar |
| `MCP_API_KEY` | 11 (ya existe) | ya existe | ya existe | El MCP responde `unauthorized!` |
| `MCP_STRICT_EXPENSE_ACTOR` | 11 | `true` | `true` | **válvula de reversión**: `false` reactiva el fallback laxo al Administrador |
| `E2E_UPLOAD_ROOT` | 03/12 | solo en la corrida E2E | **nunca** | Solo test |

**Total: 15 variables individuales** en 13 filas (`AWS_ACCESS_KEY`, `AWS_SECRET_KEY` y `AWS_BUCKET`
comparten fila). Es el número que verifica el criterio 11 del paquete 13.

`config/application.yml` **no se versiona** (está en `.gitignore`). Cada paquete **solo AÑADE sus
claves** a la copia local; nunca reescribe el archivo ni borra claves ajenas. Si dos agentes
trabajan sobre el mismo checkout (ola 3: el 05 con `TRM_API_URL`/`DATOS_GOV_APP_TOKEN`/
`EXCHANGE_RATE_*` y el 10 con `ANTHROPIC_API_KEY`/`RECEIPT_EXTRACTION_*`), el riesgo es
sobrescritura local, no conflicto de merge. **Esta tabla es la fuente de verdad**, no el archivo.

### Rake tasks post-deploy (idempotentes, se corren en staging y en producción)

```bash
heroku run -a <app> rake permissions_gastos_ia:install       # ola 1 (paquete 01)
heroku run -a <app> rake parameterizations_gastos_ia:install # ola 3 (paquete 10)
heroku run -a <app> rake gastos_ia_schema:check              # ola 2, solo lectura, verifica el esquema
heroku run -a <app> rake users:import_phones[archivo.csv]    # ola 8 (paquete 13), antes de conectar WhatsApp
heroku run -a <app> rake storage:check                       # ola 2 (paquete 03), round-trip a S3
```

**Nunca** `rake create_config:create` en un entorno con datos (§4.4).

### Reversión: kill switches por paquete y punto de no retorno

| Paquete | Cómo se apaga sin desplegar |
|---|---|
| 04, 07, 08 (Presupuesto) | **Revocar los `AccionModule` del módulo `"Presupuesto"`** de todos los roles. Oculta la pestaña y los endpoints devuelven 403. El dato queda intacto. |
| 06, 09 (Contabilidad) | Revocar los `AccionModule` del módulo `"Contabilidad"`. La pantalla desaparece del menú y `accounting_expenses#index` redirige. |
| 10 (IA) | `RECEIPT_EXTRACTION_ENABLED=false` |
| 11 (MCP estricto) | `MCP_STRICT_EXPENSE_ACTOR=false` |
| 05 (Multimoneda) | No tiene switch: el default de `currency` es `COP` y el bloque de moneda solo aparece si el usuario cambia el select. Riesgo aceptado. |
| 02 (esquema) | `db:rollback STEP=6` **solo mientras nadie haya creado una partida**. |

🔴 **PUNTO DE NO RETORNO.** En cuanto exista **el primer `ExpenseBudget` en producción**, el
rollback de migraciones deja de ser una opción (destruiría datos de negocio) y el único remedio es
**restaurar el backup de Postgres** (`heroku pg:backups:capture` antes de cada despliegue de ola).
A partir de ahí la estrategia de reversión es **el kill switch de permisos**, no el rollback.

## 7.10 Tarea 0 — decisiones del cliente (con dueño y fecha)

Deja de ser un checklist anónimo. **Dueño: comercial / PM.** Entregable: **un acta de decisión
firmada por el cliente**, guardada en `docs/` y citada en el PR del paquete 04.

| # | Decisión / verificación | Ref. | Valor por defecto si no hay respuesta | Bloquea |
|---|---|---|---|---|
| 0.1 | ¿Los gastos históricos consumen presupuesto? | §6.1 | **Sí, lo consumen** (se explica en la capacitación) | **Merge del 04** |
| 0.2 | ¿El presupuesto se controla con o sin IVA? | §6.2 | **Sin IVA (`invoice_value`)** | **Merge del 04** |
| 0.3 | Matriz de estados §2 revisada y aceptada | §2 | La de §2.4 | Merge del 04 |
| 0.4 | Monedas del catálogo | §6.4 | **COP, USD, EUR** | Merge del 05 |
| 0.5 | Reglas de negocio por escrito | §6.8 | **Las 5 por defecto**; cualquier regla adicional es alcance nuevo | Merge del 10 |
| 0.6 | `heroku config`: AWS_* + región real del bucket | §6.5 | — (no hay default: **si falta, el Bloque A del 03 no arranca**) | **Arranque del 03** |
| 0.7 | Estado real de los teléfonos en `users`: inventario cuantificado | §6.3 | — (**si no hay teléfonos, se renegocia el alcance de la Parte B del 11**) | **Arranque del 13** |
| 0.8 | Acceso a la consola de Taimes para configurar el agente | §7.11 | — | Arranque del 13 |

Las verificaciones 0.6 y 0.7 son **precondiciones escritas**, no bifurcaciones en tiempo de
ejecución: los paquetes 03, 05, 06 y 10 **borran** sus instrucciones del tipo *"si X existe hacer
A, si no hacer B"* y las reemplazan por *"la Tarea 0 dejó escrito que X vale V"*.

## 7.11 Paquete 13 — cierre, documentación y puesta en marcha

Creado por la auditoría. Cubre la Fase 7 vendida en la propuesta §5.3 ($750.000) y tres huecos
operativos que no tenían dueño. Archivo: `13-cierre-documentacion-y-puesta-en-marcha.md`.

| Entregable | Criterio de aceptación verificable |
|---|---|
| `docs/MANUAL-USUARIO-GASTOS.md` — presupuesto, gasto con comprobante, moneda extranjera, vista de contabilidad, import/export Excel (incluida la advertencia de que la columna ID **sobrescribe** el registro) | Existe, tiene capturas de las 4 pantallas y lo revisa una persona ajena al proyecto sin preguntar nada |
| `docs/GUIA-REGLAS-NEGOCIO.md` — cómo se configuran las 5 reglas desde `parameterizations`, incluido el límite de `money_value` (integer) y el sentinela `(NINGUNO)` | Una persona configura una regla en staging siguiendo solo el documento |
| `docs/INSTRUCTIVO-WHATSAPP-CAMPO.md` — instructivo de una página para el personal en campo | Probado con 2 personas de campo |
| Poblado de `users.phone` | Inventario de usuarios activos, recolección, normalización, **detección de duplicados** (un número repetido ⇒ persona NO identificada) y carga con `rake users:import_phones`. **Precondición de los criterios 27/28 del paquete 11**: sin esto, `actor_user_by_phone` devuelve `nil` y en modo estricto **todo** gasto por WhatsApp se rechaza |
| Configuración del agente dentro de Taimes | Canal WhatsApp conectado en staging, skill "Gastos IA" cargada con las 7 tools, y el script de verificación manual del paquete 11 **ejecutado y firmado** |
| Transcripción de nota de voz | Probada en staging con **al menos 3 notas de voz reales**; si Taimes no la provee, se documenta como no disponible y se renegocia la §4.3 de la propuesta |
| Sesiones de capacitación | Agendadas y realizadas, con **acta firmada**. Es criterio de cierre del proyecto |
| Runbook §7.9 ejecutado | Producción con las variables sembradas y las rake tasks corridas |

## 7.12 Inventario canónico de `test/fixtures/files/`

Seis paquetes creaban archivos con nombres y tamaños divergentes; el segundo en llegar sobrescribía
los del primero. **El paquete 01 crea todo el inventario de una vez**; los demás solo declaran
"ya existe".

| Archivo | Tamaño / contenido | Lo usan |
|---|---|---|
| `comprobante.pdf` | ~1 KB, PDF válido, empieza con `%PDF-` | 01, 06, 11, 12 |
| `comprobante.jpg` | ~1 KB, JPEG válido | 01, 06 |
| `comprobante.png` | ~1 KB, PNG válido | 03 |
| `malicioso.exe` | 20 bytes | 01, 06, 11 |
| `disfrazado.png` | `.exe` renombrado a `.png` (content-type engañoso) | 03, 06 |
| `comprobante_factura.pdf` | factura legible con NIT y número | 10 |
| `comprobante_factura.jpg` | ídem, fotografiada | 10 |
| `comprobante_ilegible.png` | imagen sin texto | 10, 12 |
| `comprobante_iphone.heic` | HEIC, para el rechazo `:unsupported_format` | 10 |
| `comprobante_ia.jpg` | el que el stub del 12 reconoce como factura COP | 12 |
| `comprobante_ia_usd.pdf` | el que el stub del 12 reconoce como factura USD | 12 |
| `gastos_legacy_11col.xlsx` | Excel de importación con el layout **viejo de 11 columnas** | 06 (test de no-regresión de `import`) |
| `gastos_v2_18col.xlsx` | Excel con el layout **nuevo de 18 columnas** (incluye 13=Moneda, 14=Valor extranjero, 15=TRM) | 06 |
| `gastos_multimoneda.xlsx` | 18 columnas, con filas en USD y EUR y una con `invoice_value` diligenciado (dispara `cop_manual_override`) | 05 (test de import de moneda), 06 |

Los tres `.xlsx` **los crea el 01 y se commitean** (antes el 05 los generaba con `Tempfile` dentro
del test justamente porque no estaban en este inventario; esa instrucción queda derogada).

El archivo de 10,5 MB (rechazo por tamaño) **no se commitea**: se genera con `Tempfile` dentro del
test, como ya decide el paquete 06.

## 7.13 Cambios de alcance derivados (impacto en horas)

Para que nadie descubra esto a mitad de camino:

| Cambio | Paquete | Δ |
|---|---|---|
| `renderModal()` de `packs/ReportExpenseIndex.js` (moneda + comprobante + extracción + aviso presupuestal) | 08 | **+6 h** |
| Modal de previsualización de comprobante en las dos tablas | 08 | **+3 h** |
| Cableado presupuestal en `create/update/destroy` + su test de integración | 07 | **+3 h** |
| `ids[]` en la aprobación masiva + test | 06 | +1 h |
| Guard de `ExpenseRuleService` en la tool de creación + 2 tests | 11 | +2 h |
| Paquete 13 completo | 13 | **cubierto por la Fase 7 ya vendida ($750.000)** |
| Migraciones que salen de 04, 05 y 06 | 04/05/06 | −4 h (van al 02, que ya las tenía) |
| Specs E2E que salen de 05, 06, 08 y 09 | — | −8 h (van al 12, que ya los tenía) |
