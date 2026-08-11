# Paquete 02 — Migraciones, esquema y migracion de datos historicos

## 🔴 CORRECCIONES DE AUDITORÍA (vinculantes — leer ANTES que el resto del documento)

> Estas correcciones **mandan sobre cualquier texto de este archivo** que las contradiga.
> Consolidadas en `00-ARQUITECTURA.md` §7.

1. **Este paquete es el dueño ÚNICO y EXCLUSIVO de las 6 migraciones.** Confirmado y elevado a
   regla de la arquitectura (§1). Los paquetes 04 (Tareas 1-2), 05 (Tareas 1-2) y 06 (A1, B1)
   **borraron** sus tareas de migración; en su lugar tienen una precondición de verificación.
   Nadie más escribe en `db/migrate/` salvo el paquete 11 con `20260405000001`.
2. **La convención `def up` / `def down` es obligatoria para las SIETE migraciones**, incluida la
   del paquete 11. Ninguna define `def change` (el 06 mostraba `def change` literal).
3. 🔴 **`exchange_rates` lleva `effective_date`. La decisión está TOMADA en §1.5 y este paquete la
   implementa.** La tabla tiene **6 columnas de negocio**, las **6** `NOT NULL` (+ `id`, `created_at`,
   `updated_at` = 9 columnas físicas). Cambios obligatorios aquí:
   - **Tarea 7** (`20260403000002_create_exchange_rates.rb`) crea:
     ```ruby
     t.string   :currency,       null: false
     t.date     :rate_date,      null: false
     t.date     :effective_date, null: false
     t.decimal  :rate_to_cop,    precision: 18, scale: 6, null: false
     t.string   :source,         null: false
     t.datetime :fetched_at,     null: false
     t.timestamps
     ```
     más `add_index :exchange_rates, [:currency, :rate_date], unique: true` (ya estaba) **y**
     `add_index :exchange_rates, [:currency, :effective_date], name: "index_exchange_rates_on_currency_and_effective_date"`.
   - **Criterio de aceptación 10** pasa a: *"`currency`, `rate_date`, `effective_date`,
     `rate_to_cop`, `source` y `fetched_at` son todas `NOT NULL`"* (**6** de negocio NOT NULL).
   - **Test 19** de `schema_gastos_ia_test.rb` afirma **6 columnas de negocio** (+ `id`,
     `created_at`, `updated_at`) y la existencia de los **dos** índices.
   - **Verificación 6** de `rake gastos_ia_schema:check`: *"`exchange_rates` existe con sus 6
     columnas de negocio, las 6 `NOT NULL`, y sus 2 índices"*.
   - ✅ **Aritmética corregida en el cierre de la reauditoría.** La redacción original de esta
     corrección decía *"7 columnas de negocio, 6 de ellas NOT NULL"*, lo que implicaba una séptima
     columna nullable que **ningún lugar del plan define**. El DDL de arriba —que es el mismo del
     bloque y de la Tarea 7— tiene **seis**. Queda fijado en **6 / 6**; toda mención a "7 columnas
     de negocio" en este documento o en otro está derogada.
   - Semántica, para que no se invierta: `rate_date` = fecha **solicitada** (clave de caché);
     `effective_date` = fecha de **vigencia real** publicada por la fuente. El contrato §E.1
     serializa `effective_date` como `"rate_date"` del JSON.
4. **Criterio de aceptación 1 reformulado** (lo invalidaba la migración del paquete 11):
   *"En el diff de ESTE PR hay exactamente 6 archivos nuevos en `db/migrate/` y ninguno más."*
   `20260405000001_add_phone_to_users.rb` es legítima, es del paquete 11, y ya figura en la tabla
   de §1 de la arquitectura.
5. **`rake gastos_ia_schema:check` se incorpora al runbook global** (§7.9) como verificación
   post-deploy de la ola 2, no solo como herramienta local.
6. **Estrategia de reversión**: el `db:rollback STEP=6` de este paquete solo es válido **hasta que
   exista el primer `ExpenseBudget` en producción**. A partir de ahí el mecanismo de reversión de
   los paquetes 04/06/07/09 es **revocar los `AccionModule` de `Presupuesto`/`Contabilidad`**
   (kill switch documentado en §7.9), y el remedio de datos es restaurar el backup. Este paquete
   agrega a su runbook un `heroku pg:backups:capture` **antes** de cada `db:migrate`.
7. **Fixtures**: se mantiene la decisión de diferir `expense_budgets.yml` y `exchange_rates.yml` a
   los paquetes que crean los modelos (04 y 05). Cuando el 05 cree `exchange_rates.yml`, la
   fixture **debe incluir `effective_date`**.
8. **Precondición escrita, no bifurcación**: la nota *"si heroku no está disponible para el agente,
   las tareas 13-14 se dejan como runbook"* se resuelve en la **Tarea 0** (§7.10). El resultado
   (hay acceso / no hay acceso) queda escrito antes de arrancar el paquete.

> Documento de trabajo para un agente autonomo. Lectura previa obligatoria:
> `docs/plan-gastos-ia/00-ARQUITECTURA.md` (§1 modelo de datos, §2.5 datos historicos,
> §4.1 convenciones, §5.4 fixtures). Este paquete **no escribe modelos, ni controllers, ni
> servicios, ni UI**: solo esquema, datos y verificacion.

---

## Objetivo

Dejar la base de datos de desarrollo, test, staging y produccion con el esquema completo del
proyecto de gastos/presupuesto/multimoneda/contabilidad (2 tablas nuevas, 14 columnas nuevas en
`report_expenses`, **10 indices** — 9 originales + el
`index_exchange_rates_on_currency_and_effective_date` que agrega la correccion 3 de auditoria),
con todos los gastos historicos backfilleados a
`currency = 'COP'`, `budget_status = 'sin_presupuesto'`, `accounting_approved = false` y sin
partida asociada. Al terminar, cualquier otro paquete puede escribir codigo contra esas columnas
sin tocar `db/`.

---

## Dependencias

| Depende de | Por que |
|---|---|
| **Paquete 01 — desbloqueo de la suite** (§5.1 de la arquitectura: eliminar `chromedriver-helper`, arreglar las 4 fixtures rotas, borrar los 29 tests de scaffold, ampliar `test/test_helper.rb` con `as_user` y los helpers de Devise, crear las 6 fixtures faltantes) | El criterio de aceptacion de este paquete incluye `bin/rails test` en 0 failures / 0 errors. Hoy la suite **no arranca** (falla en el boot por `chromedriver-helper`) y `maintain_test_schema!` va a abortar la corrida en cuanto exista la primera migracion pendiente. Sin el Paquete 01 no se puede escribir ni correr `test/models/schema_gastos_ia_test.rb`. |

**No depende de nada mas.** En particular **no** depende de los paquetes de Presupuesto,
Multimoneda, Comprobante ni Contabilidad: este paquete va **antes** que todos ellos.

**Paquetes que dependen de este** (para que el agente entienda por que no puede recortar
alcance): todo el que toque `ExpenseBudget`, `ExchangeRate`, `budget_status`, `receipt_file`,
`currency`, `foreign_*`, `exchange_rate*` o `accounting_*`.

**Cosas que este paquete NO hace, a proposito** (son de otros paquetes):

- `app/models/expense_budget.rb`, `app/models/exchange_rate.rb`, `app/models/currency.rb`.
- `mount_uploader :receipt_file, ReceiptUploader` en `ReportExpense`.
- `test/fixtures/expense_budgets.yml` y `test/fixtures/exchange_rates.yml` (ver
  "Discrepancias con la arquitectura", punto 5).
- Cualquier cambio a serializers, controllers, tools MCP o React mas alla del bloque
  `# == Schema Information` que regenera `annotate`.

---

## Archivos

### A crear

| Ruta | Que se hace |
|---|---|
| `db/migrate/20260401000001_create_expense_budgets.rb` | Crea la tabla `expense_budgets` (**10 columnas fisicas**: `id` + 9 de negocio/auditoria) + 3 indices. Clase `CreateExpenseBudgets`. |
| `db/migrate/20260401000002_add_budget_fields_to_report_expenses.rb` | Agrega `expense_budget_id`, `budget_status`, `budget_reason` + 2 indices. Clase `AddBudgetFieldsToReportExpenses`. |
| `db/migrate/20260402000001_add_receipt_file_to_report_expenses.rb` | Agrega `receipt_file` (string, CarrierWave). Sin indices. Clase `AddReceiptFileToReportExpenses`. |
| `db/migrate/20260403000001_add_currency_fields_to_report_expenses.rb` | Agrega las 7 columnas multimoneda + indice parcial de `currency` + indice compuesto `(invoice_number, identification)`. Clase `AddCurrencyFieldsToReportExpenses`. |
| `db/migrate/20260403000002_create_exchange_rates.rb` | Crea la tabla `exchange_rates` (**6 columnas de negocio, incluida `effective_date`, las 6 NOT NULL**) + indice **unico** `(currency, rate_date)` + indice `(currency, effective_date)`. Clase `CreateExchangeRates`. |
| `db/migrate/20260404000001_add_accounting_fields_to_report_expenses.rb` | Agrega `accounting_approved`, `accounting_approved_by_id`, `accounting_approved_at` + indice compuesto `(accounting_approved, invoice_date)`. Clase `AddAccountingFieldsToReportExpenses`. |
| `lib/tasks/verify_gastos_ia_schema.rake` | Rake task **de solo lectura** `gastos_ia_schema:check` que valida columnas, tipos, defaults, indices, backfill y ausencia de FKs. Se corre en dev, test, staging y produccion. Sale con codigo 1 si algo falla. |
| `test/models/schema_gastos_ia_test.rb` | Test Minitest del esquema y del backfill. Usa SQL crudo (`ActiveRecord::Base.connection`) porque los modelos `ExpenseBudget` y `ExchangeRate` todavia no existen. |

### A modificar

| Ruta | Que se hace |
|---|---|
| `db/schema.rb` | Regenerado por `bin/rails db:migrate`. La linea 13 pasa de `version: 2026_03_07_000001` a `version: 2026_04_04_000001`. **No se edita a mano.** |
| `app/models/report_expense.rb` | **Solo** el bloque `# == Schema Information` (lineas 1-37), regenerado por `annotate`. Ni una linea de codigo Ruby cambia en este paquete. |
| `app/serializers/report_expense_serializer.rb` | Idem: solo el bloque `# == Schema Information` (lineas 1-37). |
| `test/models/report_expense_test.rb` | Idem: solo el bloque `# == Schema Information`. |
| `test/fixtures/report_expenses.yml` | Idem: solo el bloque `# == Schema Information` de la cabecera. **No se agregan filas ni columnas nuevas a las fixtures**: los defaults de columna hacen el trabajo. |

> **Nota de propiedad (§7.2 de la arquitectura).** Los 4 archivos anotados **no son de este
> paquete**: `test/fixtures/report_expenses.yml` es del **01** (dueno unico de
> `test/fixtures/*.yml`) y las partes de codigo de `ReportExpense` (`search`, `SEARCH_KEYS`,
> metodos de auditoria) son del **03**. Este paquete **solo** deja pasar el bloque de comentario
> `# == Schema Information` que `annotate` regenera al correr `bin/rails db:migrate` en
> development (Tarea 9). Ni una linea de Ruby, YAML de datos o etiqueta de fixture cambia aqui;
> el criterio de aceptacion 6 es precisamente el que lo verifica.

---

## Tareas

Cada tarea es un commit. Los mensajes van en el estilo del repo (`feat(db): ...`,
`chore(db): ...`).

### Tarea 1 — Preflight y mediciones (sin commit de codigo; se registran en el PR)

No se escribe ni una migracion antes de tener estos cinco numeros anotados en la descripcion del
PR:

1. **Estado migratorio local limpio**:
   ```bash
   bin/rails db:migrate:status | grep -v "^   up" | head -20
   ```
   No puede haber ni una linea `down` ni una `********** NO FILE **********`. Si la hay, se
   resuelve **antes** (si no, el `db/schema.rb` regenerado en la Tarea 9 va a traer ruido ajeno
   al paquete y el PR se vuelve irrevisable).

2. **Version de PostgreSQL en los dos entornos Heroku**:
   ```bash
   heroku pg:info -a controlmatica-staging | grep -i version
   heroku pg:info -a controlmatica          | grep -i version
   ```
   - **PostgreSQL >= 11** → `ADD COLUMN ... NOT NULL DEFAULT 'COP'` es metadata-only y no
     reescribe la tabla. Se usan las migraciones tal como estan escritas abajo.
   - **PostgreSQL < 11** → el `ADD COLUMN` con default reescribe `report_expenses` entera bajo
     `ACCESS EXCLUSIVE`. En ese caso se usa la **Variante B** de la Tarea 2b.

3. **Tamano de `report_expenses` en produccion**:
   ```bash
   heroku pg:psql -a controlmatica -c "SELECT count(*) AS filas, pg_size_pretty(pg_total_relation_size('report_expenses')) AS tam FROM report_expenses;"
   ```
   Umbral de decision (**Asumido**, no esta en la arquitectura): **100.000 filas**.
   - `< 100.000` → `add_index` normal (bloquea escrituras unos segundos; aceptable).
   - `>= 100.000` → **Variante B** de la Tarea 2b (`CREATE INDEX CONCURRENTLY`).

4. **Fotografia previa de los datos que NO se pueden mover** (se guarda el output para comparar
   despues de migrar, en staging y en produccion por separado):
   ```sql
   SELECT count(*)                            AS total,
          count(*) FILTER (WHERE is_acepted)  AS aceptados,
          sum(invoice_value)                  AS suma_valor,
          sum(invoice_tax)                    AS suma_iva,
          sum(invoice_total)                  AS suma_total
   FROM report_expenses;
   ```

5. **Confirmar que no hay colision de nombres**:
   ```sql
   SELECT to_regclass('public.expense_budgets'),
          to_regclass('public.exchange_rates'),
          to_regclass('public.currencies');
   ```
   Los tres deben devolver `NULL`. Si `currencies` existiera, hay que parar: la arquitectura
   §1.6 decide que el catalogo de monedas es una **constante Ruby**, no una tabla.

**Precondicion escrita, no bifurcacion** (correccion 8 de auditoria): la **Tarea 0** (§7.10 de la
arquitectura) deja escrito **antes** de arrancar este paquete si el agente tiene acceso a `heroku`.
El agente no decide en ejecucion: lee el acta. Si el acta dice que no hay acceso, las tareas que
usan `heroku` se ejecutan como runbook escrito en el PR y las corre una persona; las demas se
completan igual.

### Tarea 2 — Convencion comun de las seis migraciones (leer antes de escribir la primera)

Todas siguen exactamente este molde. **No se usa `def change` en ninguna.**

> Correccion 2 de auditoria: la convencion `def up` / `def down` es obligatoria para las **SIETE**
> migraciones del proyecto — las 6 de este paquete **y** `20260405000001_add_phone_to_users.rb`
> del paquete 11. Este paquete escribe solo las 6 suyas; el molde de abajo es el que el 11 tambien
> debe seguir.

```ruby
class NombreDeLaMigracion < ActiveRecord::Migration[6.1]
  def up
    # ... add_column / create_table / add_index, cada uno con su guarda de idempotencia
  end

  def down
    # ... el inverso exacto, en orden inverso, cada uno con su guarda
  end
end
```

Razon (esto es lo que mas se equivoca): la convencion del repo es
`add_index ... unless index_exists?(...)`. Dentro de `def change`, un `db:rollback` ejecuta el
cuerpo con el `CommandRecorder`, pero `index_exists?` **se delega a la conexion real** y devuelve
`true` (el indice existe), asi que el `unless` salta el `add_index`, no se registra nada y
**el indice nunca se elimina**. Resultado: un rollback deja indices huerfanos y un
`db:migrate` posterior no los recrea → el `db/schema.rb` regenerado no coincide con el commit.
Con `up`/`down` explicitos el problema no existe.

**Anti-patron del repo que NO se replica:**
`db/migrate/20260218000003_add_year_expression_indexes.rb` define **`change` y `down` a la vez**.
Rails ignora `down` cuando existe `change` (`ActiveRecord::Migration#exec_migration` hace
`revert { change }`), asi que ese `down` es codigo muerto. No copiarlo.

**Guardas exactas a usar** (Rails 6.1 — `remove_column` no acepta `if_exists:` de forma fiable en
esta version, por eso se usa `column_exists?`):

| Operacion | Guarda en `up` | Guarda en `down` |
|---|---|---|
| `create_table :t` | `unless table_exists?(:t)` | `drop_table :t, if_exists: true` |
| `add_column :t, :c, ...` | `unless column_exists?(:t, :c)` | `remove_column :t, :c if column_exists?(:t, :c)` |
| `add_index :t, :c` | `unless index_exists?(:t, :c)` | `remove_index :t, name: "<nombre>" if index_exists?(:t, :c)` |
| `add_index` con `name:` o `where:` | `unless index_exists?(:t, :c, name: "<nombre>")` | `remove_index :t, name: "<nombre>" if index_exists?(:t, :c, name: "<nombre>")` |

⚠️ Para el indice **parcial** de `currency` **es obligatorio pasar `name:` a `index_exists?`**:
`index_exists?` no compara el predicado `where`, asi que sin `name:` daria `true` por el indice
equivocado (o `false` y crearia un duplicado).

### Tarea 2b — Variante B (solo si la Tarea 1 lo indica)

Se aplica **unicamente** a las migraciones `20260403000001` y `20260404000001` (las que crean
indices sobre `report_expenses`), y solo si `report_expenses >= 100.000 filas` o PostgreSQL < 11.

```ruby
class AddCurrencyFieldsToReportExpenses < ActiveRecord::Migration[6.1]
  disable_ddl_transaction!            # CONCURRENTLY no corre dentro de transaccion

  def up
    # ... los add_column igual que en la Variante A ...
    execute <<~SQL
      CREATE INDEX CONCURRENTLY IF NOT EXISTS index_report_expenses_on_foreign_currency
      ON report_expenses (currency) WHERE currency <> 'COP'
    SQL
    execute <<~SQL
      CREATE INDEX CONCURRENTLY IF NOT EXISTS index_report_expenses_on_invoice_number_and_identification
      ON report_expenses (invoice_number, identification)
    SQL
  end

  def down
    execute "DROP INDEX CONCURRENTLY IF EXISTS index_report_expenses_on_invoice_number_and_identification"
    execute "DROP INDEX CONCURRENTLY IF EXISTS index_report_expenses_on_foreign_currency"
    # ... los remove_column ...
  end
end
```

Y si PostgreSQL < 11, el `currency` se agrega en tres pasos en vez de uno:

```ruby
add_column :report_expenses, :currency, :string          # sin default, sin NOT NULL
ReportExpense.reset_column_information
# backfill por lotes, fuera de transaccion larga:
loop do
  updated = execute(<<~SQL).cmd_tuples
    UPDATE report_expenses SET currency = 'COP'
    WHERE id IN (SELECT id FROM report_expenses WHERE currency IS NULL LIMIT 5000)
  SQL
  break if updated.zero?
end
change_column_default :report_expenses, :currency, "COP"
change_column_null    :report_expenses, :currency, false
```

**Consecuencia de `disable_ddl_transaction!`**: si la migracion falla a la mitad, el estado queda
parcial y `schema_migrations` **no** registra la version → hay que limpiar a mano. Si un
`CREATE INDEX CONCURRENTLY` falla, deja el indice en estado `INVALID`; se detecta con
`SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;` y se resuelve con
`DROP INDEX <nombre>;` + reintento.

### Tarea 3 — `20260401000001_create_expense_budgets.rb`

Clase `CreateExpenseBudgets`. `up`:

```ruby
create_table :expense_budgets do |t|
  t.integer  :cost_center_id,      null: false
  t.integer  :user_id,             null: false
  t.decimal  :amount,              precision: 15, scale: 2, null: false, default: 0.0
  t.text     :notes
  t.boolean  :active,              null: false, default: true
  t.integer  :created_by_id
  t.integer  :last_user_edited_id
  t.timestamps
end

add_index :expense_budgets, [:cost_center_id, :user_id, :active],
          name: "index_expense_budgets_on_center_user_active"
add_index :expense_budgets, :cost_center_id
add_index :expense_budgets, :user_id
```

`down`: `drop_table :expense_budgets, if_exists: true` (los indices se van con la tabla).

Restricciones que **no** se agregan y no es un olvido:
- **Ningun `add_foreign_key`.** `db/schema.rb` no tiene ni uno en todo el proyecto; introducir el
  primero rompe el orden de borrado de fixtures y la carga de `fixtures :all`. La integridad la
  valida el modelo (paquete de Presupuesto) con `belongs_to` requerido.
- **Ningun indice unico.** La arquitectura §1.1 permite varias partidas por (centro, usuario); el
  cupo se controla por agregado.
- **Ningun `CHECK`** sobre `amount`.

⚠️ **`user_id` en esta tabla es el BENEFICIARIO, no el creador** (arquitectura §1.1). El creador
es `created_by_id`. No cambiar los nombres "para que sea consistente con el resto".

### Tarea 4 — `20260401000002_add_budget_fields_to_report_expenses.rb`

Clase `AddBudgetFieldsToReportExpenses`. `up`:

```ruby
add_column :report_expenses, :expense_budget_id, :integer
add_column :report_expenses, :budget_status,     :string, null: false, default: "sin_presupuesto"
add_column :report_expenses, :budget_reason,     :string

add_index  :report_expenses, :expense_budget_id   # index_report_expenses_on_expense_budget_id
add_index  :report_expenses, :budget_status       # index_report_expenses_on_budget_status
```

`down`: `remove_index` de los dos (por nombre) y `remove_column` de las tres, en orden inverso.

**Esta migracion ES la migracion de datos historicos de la parte presupuestal.** No lleva ningun
`UPDATE`: el `default: "sin_presupuesto"` con `null: false` backfillea las filas existentes en el
mismo `ALTER TABLE`. Arquitectura §2.5: *"No hay ningun UPDATE de datos historicos en este
proyecto"*. Si el agente escribe un `UPDATE report_expenses SET budget_status = ...`, esta
violando la arquitectura, aunque el resultado se vea igual.

Valores permitidos de `budget_status` (no hay enum de BD, la validacion vive en el modelo):
`"sin_presupuesto"`, `"aprobado"`, `"excedido"`.

### Tarea 5 — `20260402000001_add_receipt_file_to_report_expenses.rb`

Clase `AddReceiptFileToReportExpenses`. `up`:

```ruby
add_column :report_expenses, :receipt_file, :string
```

`down`: `remove_column :report_expenses, :receipt_file if column_exists?(...)`.

Sin indice (nunca se filtra por el nombre del archivo). Tipo `:string` porque es lo que espera
CarrierWave — mismo tipo que `sales_orders.order_file` (`db/schema.rb:525`) y
`customer_invoices.delivery_certificate_file` (`db/schema.rb:234`). El `mount_uploader` lo agrega
el paquete de Comprobante, **no este**.

### Tarea 6 — `20260403000001_add_currency_fields_to_report_expenses.rb`

Clase `AddCurrencyFieldsToReportExpenses`. `up` (Variante A):

```ruby
add_column :report_expenses, :currency,             :string,  null: false, default: "COP"
add_column :report_expenses, :foreign_value,        :decimal, precision: 15, scale: 2
add_column :report_expenses, :foreign_tax,          :decimal, precision: 15, scale: 2
add_column :report_expenses, :foreign_total,        :decimal, precision: 15, scale: 2
add_column :report_expenses, :exchange_rate,        :decimal, precision: 18, scale: 6
add_column :report_expenses, :exchange_rate_date,   :date
add_column :report_expenses, :exchange_rate_source, :string

add_index :report_expenses, :currency,
          where: "currency <> 'COP'",
          name: "index_report_expenses_on_foreign_currency"

add_index :report_expenses, [:invoice_number, :identification],
          name: "index_report_expenses_on_invoice_number_and_identification"
```

`down`: `remove_index` de los dos por nombre + `remove_column` de las 7, en orden inverso.

**Esta migracion ES la migracion de datos historicos de la parte multimoneda**: `null: false` +
`default: "COP"` deja los ~N gastos existentes en COP sin un solo `UPDATE`. Los seis campos
`foreign_*` / `exchange_rate*` quedan `NULL` en los historicos, que es lo correcto: no hubo
conversion.

**No se tocan `invoice_value`, `invoice_tax` ni `invoice_total`.** Siguen siendo `float`
(invariante #2 de la arquitectura) y siguen estando en COP (invariante #3). Cualquier intento de
"aprovechar la migracion" para pasarlos a `decimal` rompe `recalculate_cost_center`
(`app/helpers/application_helper.rb:585`) y corrompe el porcentaje de viaticos de todos los
centros de costo.

**Nota sobre el indice `(invoice_number, identification)`**: sirve a la regla de duplicados del
motor de reglas, no a multimoneda; se deja aqui porque la arquitectura §1.3 lo ubica en esta
migracion. Verificado contra `db/schema.rb`: hoy **no existe** ningun indice sobre
`invoice_number` ni sobre `identification` en `report_expenses`.

### Tarea 7 — `20260403000002_create_exchange_rates.rb`

Clase `CreateExchangeRates`. `up`:

```ruby
create_table :exchange_rates do |t|
  t.string   :currency,       null: false
  t.date     :rate_date,      null: false   # fecha SOLICITADA — clave de cache
  t.date     :effective_date, null: false   # vigencia REAL publicada por la fuente
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

🔴 **`effective_date` es OBLIGATORIA** (decisión cerrada en arquitectura §1.5). Sin ella no hay
cache-hit para fechas no habiles — la TRM publica `vigenciadesde`/`vigenciahasta` y la del viernes
rige sabado y domingo — y el contrato §E.1 no puede reportar `rate_date != requested_date`. El
"Plan B" del paquete 05 queda descartado. **6 columnas de negocio, las 6 NOT NULL** (9 fisicas
con `id` y los timestamps).

`down`: `drop_table :exchange_rates, if_exists: true`.

El **unique** no es decorativo: es el mecanismo de serializacion de la cache de TRM con 5 hilos
de Puma (arquitectura §1.5). Si el agente lo crea sin `unique: true`, la Fase 4 pierde su unica
garantia y `find_or_create_by!` deja duplicados silenciosos. Es el punto que mas hay que
verificar de esta migracion.

`rate_to_cop` es `decimal(18,6)` — la arquitectura §1.5 lo fija asi (el plan interno decia 15,6;
**manda la arquitectura**).

### Tarea 8 — `20260404000001_add_accounting_fields_to_report_expenses.rb`

Clase `AddAccountingFieldsToReportExpenses`. `up`:

```ruby
add_column :report_expenses, :accounting_approved,       :boolean, null: false, default: false
add_column :report_expenses, :accounting_approved_by_id, :integer
add_column :report_expenses, :accounting_approved_at,    :datetime

add_index :report_expenses, [:accounting_approved, :invoice_date],
          name: "index_report_expenses_on_accounting_approved_and_date"
```

`down`: `remove_index` por nombre + `remove_column` de las 3 en orden inverso.

**Esta migracion ES la migracion de datos historicos de la parte contable**: `default: false` deja
todos los gastos existentes sin aprobar. No se inventan aprobaciones retroactivas.

⚠️ **`is_acepted` no se toca en ninguna de las seis migraciones.** Ni su default, ni su tipo, ni
su indice `index_report_expenses_on_is_acepted`, ni sus valores. Es la aceptacion operativa que ya
existe (invariante #1). Si el diff de este paquete menciona `is_acepted` en algun lugar que no sea
un test de "sigue intacto", esta mal.

### Tarea 9 — Migrar en desarrollo, regenerar `db/schema.rb` y las anotaciones

```bash
bin/rails db:migrate                 # RAILS_ENV=development, obligatorio
```

`bin/rails db:migrate` en **development** dispara `annotate` automaticamente
(`lib/tasks/auto_annotate_models.rake` hace `Annotate.load_tasks` bajo
`if Rails.env.development?`, con `skip_on_db_migrate => 'false'`). Con esa configuracion
(`exclude_tests: 'false'`, `exclude_fixtures: 'false'`, `exclude_serializers: 'false'`,
`show_indexes: 'true'`, `position_in_class: 'before'`) se regeneran exactamente cuatro archivos:

- `app/models/report_expense.rb`
- `app/serializers/report_expense_serializer.rb`
- `test/models/report_expense_test.rb`
- `test/fixtures/report_expenses.yml`

⚠️ **Trampa**: si el agente corre `RAILS_ENV=test bin/rails db:migrate` o `RAILS_ENV=production`,
`annotate` **no** se ejecuta (el `if Rails.env.development?` del rake) y el PR queda con las
anotaciones desactualizadas. Correr siempre en development.

⚠️ **No usar el binario `bundle exec annotate` suelto**: no hay `.annotaterc` en el repo, asi que
el binario usa sus propios defaults y produce un bloque con formato distinto (posicion, indices,
comentarios) → diff gigante y ruidoso. La unica via es `bin/rails db:migrate` en development, o
`bundle exec rake annotate_models` (que si carga `set_annotation_options`).

Verificacion del diff antes de commitear:

```bash
git diff --stat
# esperado exactamente: db/schema.rb + los 4 archivos de arriba
git diff app/ test/ | grep -v "^[+-]#" | grep "^[+-]" | grep -v "^[+-][+-]"
# esperado: vacio. Si sale algo, annotate toco codigo real -> revertir y revisar.
```

Chequeo de contenido esperado en `db/schema.rb`:
- `ActiveRecord::Schema.define(version: 2026_04_04_000001)`
- `create_table "expense_budgets"` con `t.decimal "amount", precision: 15, scale: 2, default: "0.0", null: false`
- `create_table "exchange_rates"` con `t.date "effective_date", null: false`, `t.index [...], name: "index_exchange_rates_on_currency_and_rate_date", unique: true` y `t.index [...], name: "index_exchange_rates_on_currency_and_effective_date"`
- en `create_table "report_expenses"`: 14 columnas nuevas y **5** indices nuevos, con
  `t.index ["currency"], name: "index_report_expenses_on_foreign_currency", where: "((currency)::text <> 'COP'::text)"`
- **cero** `add_foreign_key` en todo el archivo.

Commit: `chore(db): regenerar schema.rb y anotaciones tras migraciones de gastos IA`.

### Tarea 10 — Preparar el esquema de test y verificar que la suite sigue verde

```bash
RAILS_ENV=test bin/rails db:test:prepare
bin/rails test
```

Obligatorio despues de **cada** migracion nueva: `maintain_test_schema!`
(`test/test_helper.rb` via `rails/test_help`) aborta la corrida completa con `exit 1` si detecta
una migracion pendiente en la base de test. Criterio: **0 failures, 0 errors** (el mismo criterio
de salida del Paquete 01).

Sin commit propio (no cambia archivos), salvo que haya que ajustar algo.

### Tarea 11 — `test/models/schema_gastos_ia_test.rb`

Ver la seccion "Pruebas unitarias". Commit propio.

### Tarea 12 — `lib/tasks/verify_gastos_ia_schema.rake`

Task de **solo lectura**, idempotente, ejecutable en cualquier entorno.

> Correccion 5 de auditoria: `rake gastos_ia_schema:check` **no es solo una herramienta local**.
> Queda incorporada al **runbook global de despliegue** (§7.9 de la arquitectura) como
> verificacion post-deploy obligatoria de la **ola 2**, junto a `rake storage:check` del 03.

```ruby
namespace :gastos_ia_schema do
  desc "Verifica el esquema y el backfill del proyecto de gastos/presupuesto/multimoneda"
  task check: :environment do
    conn    = ActiveRecord::Base.connection
    fallos  = []
    ok      = ->(msg) { puts "  OK   #{msg}" }
    falla   = ->(msg) { fallos << msg; puts "  FALLA #{msg}" }
    # ... 10 bloques de verificacion, ver la lista de abajo ...
    abort("\n#{fallos.size} verificacion(es) fallaron") if fallos.any?
    puts "\nEsquema de gastos IA verificado correctamente."
  end
end
```

Las **10 verificaciones** que debe implementar, con su consulta y su valor esperado:

| # | Verifica | Consulta | Esperado |
|---|---|---|---|
| 1 | Las 6 migraciones aplicadas | `SELECT version FROM schema_migrations WHERE version IN ('20260401000001','20260401000002','20260402000001','20260403000001','20260403000002','20260404000001')` | 6 filas |
| 2 | Las 14 columnas nuevas de `report_expenses` con tipo, nullabilidad y default | `information_schema.columns` | 14 filas; `currency` → `character varying`, `NO`, `'COP'::character varying`; `budget_status` → `NO`, `'sin_presupuesto'::character varying`; `accounting_approved` → `boolean`, `NO`, `false`; `exchange_rate` → `numeric`, `numeric_precision 18`, `numeric_scale 6`; `foreign_value/tax/total` → `numeric(15,2)` |
| 3 | Backfill de historicos | ver SQL "Consulta de backfill" abajo | todos los contadores en 0 |
| 4 | Los 3 campos de dinero viejos siguen en float | `information_schema.columns` sobre `invoice_value, invoice_tax, invoice_total` | 3 filas, todas `double precision` |
| 5 | `expense_budgets` existe con sus **10 columnas** (`id` + 9) y `amount numeric(15,2) NOT NULL DEFAULT 0.0`, `active boolean NOT NULL DEFAULT true` | `information_schema.columns` | 9 columnas (`id`, `cost_center_id`, `user_id`, `amount`, `notes`, `active`, `created_by_id`, `last_user_edited_id`, `created_at`, `updated_at` = 10 con `id`) |
| 6 | `exchange_rates` existe con sus **6 columnas de negocio** (`currency`, `rate_date`, `effective_date`, `rate_to_cop`, `source`, `fetched_at` + `id`/timestamps), **las 6 `NOT NULL`** | `information_schema.columns` | ok |
| 7 | Los **10** indices existen con el nombre exacto (los 9 originales + `index_exchange_rates_on_currency_and_effective_date`) | `pg_indexes` | **10** filas |
| 8 | El indice de `currency` es **parcial** | `SELECT indexdef FROM pg_indexes WHERE indexname='index_report_expenses_on_foreign_currency'` | el `indexdef` contiene `WHERE ((currency)::text <> 'COP'::text)` |
| 9 | El indice de `exchange_rates` es **UNIQUE** | `SELECT indexdef FROM pg_indexes WHERE indexname='index_exchange_rates_on_currency_and_rate_date'` | el `indexdef` empieza con `CREATE UNIQUE INDEX` |
| 10 | No se introdujo ninguna FK ni la tabla `currencies` | `SELECT count(*) FROM pg_constraint WHERE contype='f' AND conrelid::regclass::text IN ('report_expenses','expense_budgets','exchange_rates')` y `SELECT to_regclass('public.currencies')` | `0` y `NULL` |

**Consulta de backfill** (verificacion 3, es la que prueba la "migracion de datos historicos"):

```sql
SELECT count(*)                                                  AS total,
       count(*) FILTER (WHERE currency IS NULL)                  AS currency_nulos,
       count(*) FILTER (WHERE currency <> 'COP')                 AS currency_no_cop,
       count(*) FILTER (WHERE budget_status IS NULL)             AS estado_nulo,
       count(*) FILTER (WHERE budget_status <> 'sin_presupuesto') AS estado_no_default,
       count(*) FILTER (WHERE budget_reason IS NOT NULL)         AS con_motivo,
       count(*) FILTER (WHERE expense_budget_id IS NOT NULL)     AS con_partida,
       count(*) FILTER (WHERE accounting_approved)               AS contab_aprobados,
       count(*) FILTER (WHERE accounting_approved_by_id IS NOT NULL) AS contab_con_actor,
       count(*) FILTER (WHERE accounting_approved_at IS NOT NULL)    AS contab_con_fecha,
       count(*) FILTER (WHERE receipt_file IS NOT NULL)          AS con_comprobante,
       count(*) FILTER (WHERE foreign_value IS NOT NULL
                           OR foreign_tax IS NOT NULL
                           OR foreign_total IS NOT NULL
                           OR exchange_rate IS NOT NULL
                           OR exchange_rate_date IS NOT NULL
                           OR exchange_rate_source IS NOT NULL)  AS con_multimoneda
FROM report_expenses;
```

Todo lo que no sea `total` debe dar **0** inmediatamente despues de migrar. (En produccion, dias
despues de que otros paquetes esten en uso, dejaran de ser 0 — la task es un chequeo **post
migracion**, y su docstring debe decirlo.)

Commit: `chore(db): rake gastos_ia_schema:check para verificar esquema y backfill`.

### Tarea 13 — Drill de rollback en local (sin commit)

```bash
bin/rails db:rollback STEP=6
bin/rails db:migrate:status | grep 202604      # las 6 en 'down'
psql -c "SELECT to_regclass('public.expense_budgets'), to_regclass('public.exchange_rates');"  # NULL, NULL
psql -c "SELECT count(*) FROM pg_indexes WHERE indexname IN ('index_report_expenses_on_foreign_currency','index_report_expenses_on_budget_status','index_report_expenses_on_expense_budget_id','index_report_expenses_on_accounting_approved_and_date','index_report_expenses_on_invoice_number_and_identification');"  # 0

bin/rails db:migrate
git diff --exit-code db/schema.rb              # debe salir 0: el schema regenerado es identico
```

El `git diff --exit-code db/schema.rb` en 0 es la prueba de que los `down` estan bien escritos.
Si sale distinto de 0, hay un `remove_index` o `remove_column` faltante.

### Tarea 14 — Staging

```bash
git push staging feature/gastos-ia-esquema:master        # remote 'staging' -> controlmatica-staging
heroku pg:backups:capture -a controlmatica-staging
heroku run rake db:migrate -a controlmatica-staging
heroku run rake gastos_ia_schema:check -a controlmatica-staging
```

Y despues, en staging **y solo en staging**, el drill de rollback contra datos reales:

```bash
heroku run rake db:rollback STEP=6 -a controlmatica-staging
heroku run rake gastos_ia_schema:check -a controlmatica-staging   # debe FALLAR (esto es lo que se busca)
heroku run rake db:migrate -a controlmatica-staging
heroku run rake gastos_ia_schema:check -a controlmatica-staging   # debe pasar
```

Ademas, comparar la fotografia de la Tarea 1 punto 4 **antes y despues**: `total`, `aceptados`,
`suma_valor`, `suma_iva` y `suma_total` tienen que ser **identicos**. Si `suma_valor` cambia, algo
toco los importes y hay que abortar.

Smoke manual en staging (5 minutos, sin codigo nuevo desplegado todavia): abrir el modulo de
Gastos, listar, filtrar, exportar el Excel y editar un gasto. Todo debe seguir funcionando igual —
este paquete no cambia ni una linea de codigo de aplicacion, asi que cualquier regresion aqui es
un problema de esquema.

### Tarea 15 — Produccion

Orden obligatorio y no negociable:

```bash
heroku pg:backups:capture -a controlmatica                       # 1. backup ANTES
heroku pg:psql -a controlmatica -c "<fotografia de la Tarea 1.4>"  # 2. fotografia previa
git push heroku feature/gastos-ia-esquema:master                  # 3. deploy del codigo (sin cambios funcionales)
heroku run "PGOPTIONS='-c lock_timeout=5000' rake db:migrate" -a controlmatica   # 4. migrar
heroku run rake gastos_ia_schema:check -a controlmatica          # 5. verificar
heroku pg:psql -a controlmatica -c "<fotografia de nuevo>"       # 6. comparar
```

- **No hay `Procfile` ni release phase en el repo** (verificado): las migraciones **no** corren
  solas en el deploy. Hay que ejecutarlas a mano y a nadie se le puede olvidar.
- El `PGOPTIONS='-c lock_timeout=5000'` hace que, si una consulta larga esta bloqueando la tabla,
  el `ALTER TABLE` **falle en 5 segundos** en vez de encolarse y bloquear toda la aplicacion
  detras suyo. Si falla por timeout: se reintenta en horario de baja carga. **No se sube el
  timeout.**
- Este paquete se puede desplegar en cualquier momento porque **no despliega codigo que lea las
  columnas nuevas**. Los paquetes siguientes **no** se pueden desplegar antes que estas
  migraciones: el codigo consultaria columnas inexistentes.

Rollback de emergencia en produccion: `heroku run rake db:rollback STEP=6 -a controlmatica`
revierte el esquema, **pero destruye los datos** de `expense_budgets` y `exchange_rates` y las 14
columnas de `report_expenses`. Es seguro **solo** mientras ningun paquete posterior este en
produccion escribiendo esos campos.

🔴 **Punto de no retorno (correccion 6 de auditoria, §7.9 de la arquitectura)**: en cuanto exista
**el primer `ExpenseBudget` en produccion**, el `db:rollback STEP=6` deja de ser una opcion. A
partir de ahi:

- el mecanismo de reversion de los paquetes 04/06/07/09 es **revocar los `AccionModule` de los
  modulos `Presupuesto` / `Contabilidad`** (kill switch documentado en §7.9), que apaga la
  funcionalidad sin tocar el esquema ni el dato;
- el unico remedio de datos es **restaurar el backup** (`heroku pg:backups:restore`).

Por eso este paquete ejecuta `heroku pg:backups:capture` **antes de cada `db:migrate`**, en
staging (Tarea 14) y en produccion (Tarea 15).

---

## Pruebas unitarias (Minitest)

### `test/models/schema_gastos_ia_test.rb`

Clase `SchemaGastosIaTest < ActiveSupport::TestCase`.

**Restriccion de implementacion**: `ExpenseBudget` y `ExchangeRate` **no existen como modelo** en
este paquete → se prueba con `ActiveRecord::Base.connection` y SQL crudo. Helper local:

```ruby
setup do
  @conn = ActiveRecord::Base.connection
end

def col(tabla, nombre)
  @conn.columns(tabla).find { |c| c.name == nombre }
end

def indice(tabla, nombre)
  @conn.indexes(tabla).find { |i| i.name == nombre }
end

def indexdef(nombre)
  @conn.select_value("SELECT indexdef FROM pg_indexes WHERE indexname = #{@conn.quote(nombre)}")
end
```

Las inserciones crudas van dentro del rollback automatico de la transaccion del test
(`use_transactional_tests` esta activo por defecto), asi que no ensucian nada.

| # | Nombre del test | Asercion |
|---|---|---|
| 1 | `test "expense_budgets existe con las 10 columnas esperadas"` | `@conn.table_exists?("expense_budgets")` y `@conn.columns("expense_budgets").map(&:name).sort == %w[active amount cost_center_id created_at created_by_id id last_user_edited_id notes updated_at user_id]` |
| 2 | `test "expense_budgets.amount es decimal 15,2 not null default 0"` | `col("expense_budgets","amount")` → `type == :decimal`, `precision == 15`, `scale == 2`, `null == false`, `default.to_d == 0` |
| 3 | `test "expense_budgets.active es boolean not null default true"` | `type == :boolean`, `null == false`, `default == "true"` |
| 4 | `test "expense_budgets.cost_center_id y user_id son not null"` | ambos `null == false` |
| 5 | `test "expense_budgets tiene los 3 indices con nombre exacto"` | `indice(...)` no nil para `index_expense_budgets_on_center_user_active` (columnas `["cost_center_id","user_id","active"]`, `unique == false`), `index_expense_budgets_on_cost_center_id`, `index_expense_budgets_on_user_id` |
| 6 | `test "insertar expense_budget sin cost_center_id levanta NotNullViolation"` | `assert_raises(ActiveRecord::NotNullViolation) { @conn.execute("INSERT INTO expense_budgets (user_id, amount, active, created_at, updated_at) VALUES (1, 100, true, now(), now())") }` — **caso de fallo** |
| 7 | `test "expense_budget insertado sin amount toma el default 0.0"` | INSERT solo con `cost_center_id`, `user_id`, `active`, timestamps → `SELECT amount` devuelve `0.0` — **caso borde** |
| 8 | `test "amount con mas de 2 decimales se redondea a 2"` | INSERT con `amount = 100.006` → `100.01`; INSERT con `100.004` → `100.00` — **caso borde** |
| 9 | `test "amount con 14 enteros entra y con 15 revienta"` | `99999999999999.99` entra; `999999999999999.99` levanta `ActiveRecord::StatementInvalid` (`numeric field overflow`) — **caso de fallo** |
| 10 | `test "report_expenses tiene las 3 columnas presupuestales"` | `expense_budget_id` → `:integer`, `null == true`; `budget_status` → `:string`, `null == false`, `default == "sin_presupuesto"`; `budget_reason` → `:string`, `null == true` |
| 11 | `test "todos los gastos existentes quedan en sin_presupuesto y sin partida"` | `ReportExpense.where.not(budget_status: "sin_presupuesto").count == 0`, `ReportExpense.where.not(expense_budget_id: nil).count == 0`, `ReportExpense.where.not(budget_reason: nil).count == 0` (sobre las fixtures cargadas) — **prueba del backfill** |
| 12 | `test "report_expenses.receipt_file es string nullable sin indice"` | `col(...).type == :string`, `null == true`, y `@conn.indexes("report_expenses").none? { |i| i.columns.include?("receipt_file") }` |
| 13 | `test "report_expenses tiene las 7 columnas multimoneda con precision correcta"` | `currency` → `:string`, `null == false`, `default == "COP"`; `foreign_value/foreign_tax/foreign_total` → `:decimal`, `(15,2)`, nullable; `exchange_rate` → `:decimal`, `(18,6)`, nullable; `exchange_rate_date` → `:date`; `exchange_rate_source` → `:string` |
| 14 | `test "todos los gastos existentes quedan en COP y sin datos de conversion"` | `ReportExpense.where.not(currency: "COP").count == 0`, `ReportExpense.where.not(exchange_rate: nil).count == 0`, `ReportExpense.where.not(foreign_value: nil).count == 0` — **prueba del backfill** |
| 15 | `test "insertar un gasto con currency NULL explicito levanta NotNullViolation"` | `assert_raises(ActiveRecord::NotNullViolation) { @conn.execute("UPDATE report_expenses SET currency = NULL WHERE id = #{ReportExpense.first.id}") }` — **caso de fallo** |
| 16 | `test "exchange_rate conserva 6 decimales"` | UPDATE de un gasto con `exchange_rate = 4120.500001` → al releer, `BigDecimal("4120.500001")` — **caso borde de precision** |
| 17 | `test "el indice de currency es parcial sobre currency distinto de COP"` | `indexdef("index_report_expenses_on_foreign_currency")` incluye `"WHERE"` y `"'COP'"` |
| 18 | `test "existe el indice compuesto invoice_number identification"` | `indice("report_expenses","index_report_expenses_on_invoice_number_and_identification").columns == ["invoice_number","identification"]` (orden incluido) |
| 19 | `test "exchange_rates existe con sus 6 columnas de negocio y sus 2 indices"` | (correccion 3 de auditoria) columnas de negocio `currency`, `rate_date`, **`effective_date`**, `rate_to_cop`, `source`, `fetched_at` — **las 6** con `null == false` — mas `id`, `created_at`, `updated_at`; `rate_to_cop` `:decimal (18,6)`; `effective_date` `:date`. Y afirma la existencia de **los dos** indices: `index_exchange_rates_on_currency_and_rate_date` e `index_exchange_rates_on_currency_and_effective_date` |
| 20 | `test "el indice de exchange_rates es unico sobre currency y rate_date"` | `indice(...).unique == true` y `.columns == ["currency","rate_date"]` |
| 21 | `test "dos tasas con la misma moneda y fecha levantan RecordNotUnique"` | insertar **dos veces** `INSERT INTO exchange_rates (currency, rate_date, effective_date, rate_to_cop, source, fetched_at, created_at, updated_at) VALUES ('USD','2026-07-14','2026-07-14',4120.5,'trm_oficial',now(),now(),now())` → `assert_raises(ActiveRecord::RecordNotUnique)` — **caso de fallo, es el que justifica el indice**. ⚠️ Los **8 valores y la lista explicita de columnas son obligatorios**: `effective_date` es NOT NULL (correccion 3), asi que el INSERT de 7 valores de la version anterior moria con `ActiveRecord::NotNullViolation` en la **primera** insercion y el `assert_raises` nunca se cumplia. Nombrar las columnas hace que un cambio futuro de esquema falle al leer el test, no en runtime |
| 22 | `test "misma moneda con fechas distintas si convive"` | el **mismo INSERT de 8 valores con la lista de columnas explicita** del test 21, dos veces: `('USD','2026-07-14','2026-07-14',...)` y `('USD','2026-07-15','2026-07-15',...)`; las dos filas insertan — **caso borde complementario del 21** |
| 23 | `test "report_expenses tiene las 3 columnas contables"` | `accounting_approved` → `:boolean`, `null == false`, `default == "false"`; `accounting_approved_by_id` → `:integer` nullable; `accounting_approved_at` → `:datetime` nullable |
| 24 | `test "ningun gasto existente quedo aprobado por contabilidad"` | `ReportExpense.where(accounting_approved: true).count == 0` y `where.not(accounting_approved_at: nil).count == 0` — **prueba del backfill** |
| 25 | `test "existe el indice compuesto accounting_approved invoice_date"` | `indice(...).columns == ["accounting_approved","invoice_date"]` |
| 26 | `test "is_acepted quedo intacto"` | `col("report_expenses","is_acepted")` → `:boolean`, `default == "false"`, `null == true` (**nullable, como estaba**), y sigue existiendo `index_report_expenses_on_is_acepted` — **invariante #1** |
| 27 | `test "los tres campos de dinero en COP siguen siendo float"` | `col(...,"invoice_value").type == :float` para los tres — **invariante #2** |
| 28 | `test "no se introdujo ninguna foreign key"` | `@conn.foreign_keys("expense_budgets").empty?`, `@conn.foreign_keys("exchange_rates").empty?`, `@conn.foreign_keys("report_expenses").empty?` |
| 29 | `test "el catalogo de monedas no es una tabla"` | `refute @conn.table_exists?("currencies")` — arquitectura §1.6 |
| 30 | `test "todos los nombres de indice nuevos caben en el limite de 63 de postgres"` | los **10** nombres tienen `length <= 63` |
| 31 | `test "un ReportExpense nuevo nace con los defaults del proyecto"` | `re = ReportExpense.new` → `re.budget_status == "sin_presupuesto"`, `re.currency == "COP"`, `re.accounting_approved == false`, `re.expense_budget_id.nil?`, `re.receipt_file.nil?` — sin tocar la BD, sin callbacks |
| 32 | `test "un ReportExpense guardado persiste los defaults"` | dentro de `as_user(users(:admin)) { ... }` (helper del Paquete 01, **obligatorio**: los callbacks `edit_values` / `create_create_register` hacen `User.current.id`), crear un gasto valido y releerlo desde la BD afirmando los mismos 5 defaults |
| 33 | `test "las 6 migraciones del proyecto estan aplicadas"` | `versiones = @conn.select_values("SELECT version FROM schema_migrations")`; las 6 constantes `%w[20260401000001 20260401000002 20260402000001 20260403000001 20260403000002 20260404000001]` estan todas incluidas |

**Total: 33 casos.** Once de ellos (6, 8, 9, 15, 16, 21, 22, 26, 27, 28, 29) son casos borde o de
fallo, no camino feliz.

### Que NO se prueba aqui

- Validaciones de modelo (`inclusion` de `budget_status`, tope de `amount`): no hay modelo todavia
  → paquetes de Presupuesto y Multimoneda.
- Aritmetica de conversion y de disponible: nivel 1 de los paquetes de servicios (arquitectura
  §5.2).
- Contratos JSON: nivel 2 de los paquetes de controllers.

---

## Pruebas E2E (Playwright)

**No aplica.** Este paquete no agrega ni modifica una sola linea de UI: no hay ruta, ni pantalla,
ni componente React, ni campo de formulario que un navegador pueda tocar. **Todos los specs
funcionales son del paquete 12** (§7.2); la infraestructura de Playwright, del **01**. (La frase
anterior —"los cinco flujos E2E pertenecen a los paquetes de Presupuesto, Comprobante y
Contabilidad"— quedo derogada: esos paquetes ya no escriben ni un spec, y los flujos son nueve, no
cinco.)

Lo que si se exige, y es manual (Tarea 14): smoke de no-regresion en staging sobre las pantallas
existentes de Gastos y del show de Centro de Costos — listar, filtrar, exportar Excel, crear y
editar un gasto. Objetivo: detectar que agregar 14 columnas no rompio el `SELECT *` implicito de
ningun serializer, export axlsx ni import posicional existente.

---

## Criterios de aceptacion

Un revisor marca si/no en cada item, sin opinar.

**Archivos y forma**

1. [ ] **En el diff de ESTE PR** hay exactamente **6** archivos nuevos en `db/migrate/` con los
   timestamps `20260401000001`, `20260401000002`, `20260402000001`, `20260403000001`,
   `20260403000002`, `20260404000001` y ninguno mas.
   *(Reformulado por auditoria: `20260405000001_add_phone_to_users.rb` es legitima, es del paquete
   11 y esta declarada en la tabla de §1 de la arquitectura. No cuenta porque no esta en este PR.)*
2. [ ] Las 6 clases heredan de `ActiveRecord::Migration[6.1]`.
3. [ ] Las 6 definen `def up` y `def down`. **Ninguna** define `def change`.
4. [ ] Cada `add_column` / `add_index` / `create_table` de los `up` tiene su guarda de
   idempotencia (`column_exists?` / `index_exists?` / `table_exists?`), y cada `down` deshace
   todo lo que hace su `up`, en orden inverso.
5. [ ] Los `index_exists?` del indice parcial de `currency` y del compuesto
   `(invoice_number, identification)` pasan `name:`.
6. [ ] `git diff` sobre `app/` y `test/` **solo** toca lineas que empiezan con `#` (bloques de
   `annotate`). Cero cambios de codigo Ruby, JS o YAML de datos.
7. [ ] `db/schema.rb` declara `version: 2026_04_04_000001`.

**Esquema**

8. [ ] `expense_budgets` tiene exactamente **10 columnas**: `id, cost_center_id, user_id, amount,
   notes, active, created_by_id, last_user_edited_id, created_at, updated_at` (9 de negocio y
   auditoria + `id`). Es el mismo numero que afirma el test 1 y el que debe decir el criterio 1
   del paquete 04.
9. [ ] `expense_budgets.amount` es `numeric(15,2) NOT NULL DEFAULT 0.0` y `active` es
   `boolean NOT NULL DEFAULT true`; `cost_center_id` y `user_id` son `NOT NULL`.
10. [ ] `exchange_rates` tiene `currency, rate_date, effective_date, rate_to_cop, source, fetched_at` todas
    `NOT NULL`, y `rate_to_cop` es `numeric(18,6)`.
11. [ ] `report_expenses` gano exactamente **14** columnas: `expense_budget_id, budget_status,
    budget_reason, receipt_file, currency, foreign_value, foreign_tax, foreign_total,
    exchange_rate, exchange_rate_date, exchange_rate_source, accounting_approved,
    accounting_approved_by_id, accounting_approved_at`.
12. [ ] `budget_status` es `NOT NULL DEFAULT 'sin_presupuesto'`; `currency` es
    `NOT NULL DEFAULT 'COP'`; `accounting_approved` es `NOT NULL DEFAULT false`. Las otras 11 son
    nullable y sin default.
13. [ ] `exchange_rate` es `numeric(18,6)`; `foreign_value`, `foreign_tax` y `foreign_total` son
    `numeric(15,2)`.
14. [ ] Existen los **10** indices nuevos con estos nombres exactos (9 originales + el de
    `effective_date`, correccion 3 de auditoria):
    `index_expense_budgets_on_center_user_active`, `index_expense_budgets_on_cost_center_id`,
    `index_expense_budgets_on_user_id`, `index_report_expenses_on_expense_budget_id`,
    `index_report_expenses_on_budget_status`, `index_report_expenses_on_foreign_currency`,
    `index_report_expenses_on_invoice_number_and_identification`,
    `index_exchange_rates_on_currency_and_rate_date`,
    `index_exchange_rates_on_currency_and_effective_date`,
    `index_report_expenses_on_accounting_approved_and_date`.
15. [ ] `index_report_expenses_on_foreign_currency` es **parcial** (`WHERE currency <> 'COP'`).
16. [ ] `index_exchange_rates_on_currency_and_rate_date` es **UNIQUE**.
17. [ ] `db/schema.rb` no contiene ni un `add_foreign_key`.
18. [ ] No existe la tabla `currencies`.

**Invariantes que no se rompieron**

19. [ ] `invoice_value`, `invoice_tax` e `invoice_total` siguen siendo `float`.
20. [ ] `is_acepted` conserva tipo, default `false`, nullabilidad e indice, y ninguna migracion lo
    menciona.
21. [ ] `cost_centers.sum_viatic` y `cost_centers.viatic_value` no fueron tocados.
22. [ ] Ninguna migracion contiene la palabra `UPDATE` sobre `report_expenses` (salvo el backfill
    por lotes de la Variante B, si y solo si la Tarea 1 la justifico y el PR lo documenta).

**Datos historicos**

23. [ ] Tras migrar: `SELECT count(*) FROM report_expenses WHERE currency <> 'COP' OR currency IS NULL` = **0**.
24. [ ] Tras migrar: `SELECT count(*) FROM report_expenses WHERE budget_status <> 'sin_presupuesto'` = **0**.
25. [ ] Tras migrar: `SELECT count(*) FROM report_expenses WHERE expense_budget_id IS NOT NULL OR budget_reason IS NOT NULL` = **0**.
26. [ ] Tras migrar: `SELECT count(*) FROM report_expenses WHERE accounting_approved OR accounting_approved_at IS NOT NULL OR accounting_approved_by_id IS NOT NULL` = **0**.
27. [ ] Tras migrar: `SELECT count(*) FROM report_expenses WHERE receipt_file IS NOT NULL OR foreign_value IS NOT NULL OR exchange_rate IS NOT NULL` = **0**.
28. [ ] `total`, `count(is_acepted)`, `sum(invoice_value)`, `sum(invoice_tax)` y
    `sum(invoice_total)` son **identicos** antes y despues de migrar, en staging y en produccion.
29. [ ] `expense_budgets` y `exchange_rates` quedan con **0 filas** tras migrar.

**Ejecucion**

30. [ ] `bin/rails db:rollback STEP=6 && bin/rails db:migrate && git diff --exit-code db/schema.rb`
    sale con codigo **0**.
31. [ ] `RAILS_ENV=test bin/rails db:test:prepare && bin/rails test` da **0 failures, 0 errors**.
32. [ ] `bin/rails test test/models/schema_gastos_ia_test.rb` corre los **33** casos en verde.
33. [ ] `rake gastos_ia_schema:check` pasa en desarrollo, en test, en staging y en produccion.
34. [ ] Los 4 archivos anotados (`app/models/report_expense.rb`,
    `app/serializers/report_expense_serializer.rb`, `test/models/report_expense_test.rb`,
    `test/fixtures/report_expenses.yml`) muestran las 14 columnas nuevas y los **5** indices nuevos
    de `report_expenses` en su bloque `# == Schema Information`.
35. [ ] La descripcion del PR incluye los 5 numeros de la Tarea 1 (estado migratorio, version de
    PG en ambos entornos, filas de `report_expenses` en produccion, fotografia previa, ausencia de
    colisiones) y dice explicitamente si se uso Variante A o Variante B.

---

## Riesgos y trampas

1. **`change` + `unless index_exists?` = rollback roto.** Es la trampa numero uno de este paquete
   y por eso la Tarea 2 prohibe `change`. Sintoma: `db:rollback` "funciona", pero
   `pg_indexes` sigue mostrando los indices y el siguiente `db:migrate` no los recrea (ya estan)
   → el `db/schema.rb` regenerado difiere del commit y nadie entiende por que.

2. **Correr `db:migrate` fuera de development deja las anotaciones sin regenerar.**
   `lib/tasks/auto_annotate_models.rake:4` envuelve todo en `if Rails.env.development?`. Un PR con
   `db/schema.rb` actualizado y los 4 bloques `# == Schema Information` viejos es un PR
   incompleto que va a generar conflictos con los paquetes siguientes.

3. **`bundle exec annotate` suelto reescribe con otro formato.** No hay `.annotaterc`; las
   opciones (`show_indexes`, `position_in_class`, `with_comment`, `classified_sort`) viven solo
   dentro del `Annotate.set_defaults` del rake. Usar el binario produce un diff de cientos de
   lineas en archivos que no tocamos.

4. **`db/schema.rb` arrastra la deriva de la base local.** Si la base de desarrollo tiene columnas
   o indices que no vienen de `db/migrate/` (cosa probable en este repo), el `schema.rb`
   regenerado los va a incluir y se van a colar en produccion via `db:schema:load`. Por eso la
   Tarea 1 exige `db:migrate:status` limpio y la Tarea 9 exige revisar el `git diff --stat`.

5. **`ADD COLUMN ... NOT NULL DEFAULT` reescribe la tabla en PostgreSQL < 11.** Con
   `report_expenses` grande eso es un `ACCESS EXCLUSIVE` de minutos = caida de la aplicacion. Por
   eso la Tarea 1 verifica `pg:info` **antes** de escribir la migracion. No asumir que Heroku
   siempre da PG 13+.

6. **`CREATE INDEX` normal bloquea las escrituras de `report_expenses`.** Un `SHARE lock` durante
   la construccion. Sobre una tabla de 500k filas y 5 hilos de Puma, eso son requests colgados y
   timeouts de router en Heroku (H12). Mitigacion: umbral de la Tarea 1 + Variante B.

7. **`disable_ddl_transaction!` no es gratis.** Si la migracion de la Variante B falla a la mitad,
   `schema_migrations` no registra la version y el estado queda mezclado: hay que limpiar a mano
   antes de reintentar. Y un `CREATE INDEX CONCURRENTLY` fallido deja un indice `INVALID` que
   ocupa espacio, no se usa y **si** bloquea futuros intentos con el mismo nombre.

8. **No hay release phase.** No hay `Procfile` en el repo (verificado). `git push heroku` **no**
   migra. Si se despliega un paquete posterior sin haber corrido `db:migrate`, produccion revienta
   con `PG::UndefinedColumn` en cada request de gastos. La secuencia de la Tarea 15 es obligatoria
   y el orden importa.

9. **`maintain_test_schema!` aborta la suite entera.** En cuanto exista la primera migracion
   pendiente en la base de test, `bin/rails test` sale con `exit 1` antes de correr un solo test —
   y el mensaje no es obvio. Se resuelve con `RAILS_ENV=test bin/rails db:test:prepare` despues de
   cada migracion (Tarea 10). Con seis migraciones, es el error mas probable de aparecer.

10. **El agente va a querer "aprovechar" para crear los modelos.** No. Sin `app/models/
    expense_budget.rb` este paquete no puede escribir `test/fixtures/expense_budgets.yml`, y esa
    es la razon tecnica (no una preferencia) por la que las fixtures se difieren — ver
    Discrepancias, punto 5. Crear el modelo aqui invade el paquete de Presupuesto y duplica el
    trabajo de `annotate`.

11. **El agente va a querer escribir un `UPDATE` de backfill.** Con `null: false` + `default`, el
    `ALTER TABLE` ya deja las filas correctas. Un `UPDATE` adicional sobre `report_expenses`
    completo es un lock innecesario, viola la arquitectura §2.5 y no cambia el resultado.

12. **El agente va a querer agregar un `CHECK` sobre `currency`.** No se agrega. La arquitectura
    §1.6 decide que agregar una moneda es "un PR de una linea + redeploy"; un `CHECK` obligaria a
    una migracion por cada moneda nueva. La validacion vive en
    `validates :currency, inclusion: { in: Currency::CODES }` (paquete de Multimoneda).

13. **El agente va a querer agregar `add_foreign_key`.** No se agrega ninguna. El esquema entero
    no tiene ni una, `fixtures :all` carga y borra en orden alfabetico, y la primera FK real
    tumbaria la suite completa por violacion de integridad al truncar.

14. **`index_exists?` ignora el predicado `where`.** Sin `name:`, el guard del indice parcial de
    `currency` responde por el indice equivocado. Es un bug silencioso: la migracion "pasa" y el
    indice no queda.

15. **Nombres de indice > 63 caracteres.** PostgreSQL los trunca en silencio y el
    `index_exists?(..., name:)` de la siguiente corrida no lo encuentra → duplicados. El mas largo
    de este paquete es `index_report_expenses_on_invoice_number_and_identification` (58); queda
    margen, pero cualquier renombre hay que contarlo (criterio 30 del test).

16. **El indice de `budget_status` parece inutil y no lo es.** Cardinalidad 3 y distribucion
    totalmente sesgada tras la migracion (100% `sin_presupuesto`). No borrarlo "por optimizar":
    sirve al caso selectivo `WHERE budget_status = 'excedido'` (bandeja de excesos) y Postgres lo
    ignora solo cuando no conviene. Arquitectura §1.2.

17. **`user_id` de `expense_budgets` es el beneficiario.** Un agente que "corrija" el nombre a
    `beneficiary_id`, o que agregue un `user_id` con semantica de creador, rompe el join central
    del proyecto (`expense_budgets.user_id = report_expenses.user_invoice_id`) y obliga a alias en
    cada consulta.

18. **Rollback destructivo.** `db:rollback STEP=6` borra `expense_budgets`, `exchange_rates` y las
    14 columnas con todo su contenido. Es seguro mientras ningun paquete posterior este en
    produccion; despues de eso, el unico remedio es `heroku pg:backups:restore`. Documentarlo en
    el PR.

---

## Discrepancias con la arquitectura

Ninguna contradice una decision de `00-ARQUITECTURA.md`; son precisiones que el documento no
resolvio y que este paquete cierra. Se listan para que queden explicitas.

1. **`def up` / `def down` en vez de `def change`.** La arquitectura §1 fija la convencion
   `add_index ... unless index_exists?(...)` pero no dice como se revierte. Con `change`, esa
   convencion **hace irreversible la migracion en la practica** (el guard salta el `add_index` al
   revertir y el indice queda huerfano). Se conserva la convencion de la guarda y se agrega
   `up`/`down` explicitos. Es la unica forma de cumplir el encargo "especifica como revertir cada
   una".
   **Resuelto por la auditoria (correccion 2):** aplica a las **SIETE** migraciones del proyecto —
   las 6 de este paquete y `20260405000001_add_phone_to_users.rb` del paquete 11 —, no al resto
   del repo.

2. **Nombres de clase y de archivo de las migraciones.** La arquitectura da los timestamps y el
   contenido, no los nombres. Se fijan aqui:
   `CreateExpenseBudgets`, `AddBudgetFieldsToReportExpenses`, `AddReceiptFileToReportExpenses`,
   `AddCurrencyFieldsToReportExpenses`, `CreateExchangeRates`,
   `AddAccountingFieldsToReportExpenses`. **Asumido**, pero no negociable una vez mergeado: el
   nombre del archivo forma parte del identificador de la migracion.

3. **Umbral de 100.000 filas y Variante B (`CONCURRENTLY` + `lock_timeout`).** La arquitectura no
   dice nada sobre el impacto operativo de crear indices sobre `report_expenses` en produccion.
   No se cambia el esquema resultante — es identico en ambas variantes —, solo el **como** se
   aplica. **Asumido:** umbral 100k; hay precedente en el repo
   (`db/migrate/20260218000003_add_year_expression_indexes.rb` usa `disable_ddl_transaction!` y
   `CREATE INDEX CONCURRENTLY`).

4. **Catalogo de monedas: se verifica que NO se cree tabla.** La arquitectura §1.6 decide
   constante Ruby en `app/models/currency.rb`. Este paquete no crea ese archivo (es codigo, va
   con el paquete de Multimoneda) y en cambio **prueba y verifica** que la tabla `currencies` no
   exista (test 29, criterio 18, verificacion 10 de la rake). Es la unica forma de que la
   decision quede blindada desde el esquema. Tampoco se agrega un `CHECK` de dominio sobre
   `report_expenses.currency`, por la misma razon (ver Riesgos 12).

5. **`test/fixtures/expense_budgets.yml` y `exchange_rates.yml` se difieren.** La arquitectura
   §5.4.7 los lista como "fixtures nuevas de este proyecto" sin asignarles paquete. Se difieren a
   los paquetes que crean `ExpenseBudget` y `ExchangeRate`, por una razon tecnica concreta: sin
   clase de modelo, Rails no resuelve las etiquetas de asociacion (`cost_center: centro_uno` se
   intentaria insertar como columna `cost_center` y falla) y el accessor
   `expense_budgets(:etiqueta)` no se puede construir. Habria que escribirlas con
   `<%= ActiveRecord::FixtureSet.identify(:etiqueta) %>` y reescribirlas completas al llegar el
   modelo. **Asumido:** los tests de este paquete usan SQL crudo dentro de la transaccion del
   test, que no necesita fixtures.
   **Confirmado por la auditoria (correccion 7):** se mantiene el diferimiento a los paquetes 04 y
   05. Cuando el **05** cree `test/fixtures/exchange_rates.yml`, la fixture **debe incluir
   `effective_date`**.

6. **`ADD COLUMN` en tres pasos si PG < 11.** La arquitectura §1.3 afirma que
   "`null: false` + default hace que la migracion backfillee los ~historicos en un solo paso
   (Postgres >= 11 no reescribe la tabla)". Es correcto **si** la premisa se cumple; el paquete
   agrega la verificacion explicita de la premisa (Tarea 1.2) y el plan alterno si no se cumple.
   En ese caso alterno **si** hay un `UPDATE` por lotes, que es la unica excepcion admitida al
   "no hay ningun UPDATE de datos historicos" de §2.5, y debe quedar documentada en el PR
   (criterio 22).

---

## Objeciones a la auditoria

Ninguna correccion se revoca: el bloque del inicio manda y el cuerpo ya quedo alineado con el.
Estas dos observaciones se dejan escritas para que el auditor las resuelva; no habilitan a nadie a
apartarse del bloque.

1. ✅ **RESUELTA en el cierre de la reauditoria — el numero correcto es 6.** El conteo "7 columnas
   de negocio" de `exchange_rates` no cuadraba con el `create_table` que la misma correccion 3
   dicta: el DDL vinculante define `currency`, `rate_date`, `effective_date`, `rate_to_cop`,
   `source` y `fetched_at` — **seis** columnas de negocio, las seis `NOT NULL` — mas `id`,
   `created_at` y `updated_at` (**9 columnas fisicas**). No falta ninguna columna: la septima
   nullable no existia en ningun lugar del plan. **Todo el documento quedo alineado en 6 / 6**
   (correccion 3, tabla "A crear", Tarea 7, verificacion 6 de la rake, test 19 y criterio 10) y
   toda mencion a "7 columnas de negocio" queda derogada. La verdad operativa sigue siendo el DDL
   de la Tarea 7, que es identico al del bloque de correcciones.

2. **La correccion 8 cita "las tareas 13-14" como las que dependen de `heroku`.** En este
   documento la Tarea 13 es el drill de rollback **local** (no usa `heroku`) y las que si lo usan
   son la **14** (staging) y la **15** (produccion). No se renumero nada: el texto de la Tarea 1
   se reescribio hablando de "las tareas que usan `heroku`" para no propagar la referencia
   equivocada ni romper las referencias cruzadas de otros paquetes.
