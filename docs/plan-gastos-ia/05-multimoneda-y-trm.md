# Paquete 05 — Multimoneda, TRM y servicio de tasas de cambio

## 🔴 CORRECCIONES DE AUDITORÍA (vinculantes — leer ANTES que el resto del documento)

> Estas correcciones **mandan sobre cualquier texto de este archivo** que las contradiga.
> Consolidadas en `00-ARQUITECTURA.md` §7. **Este paquete pasa a ser solo backend.**

1. **Se BORRAN las Tareas 1 y 2 (migraciones `20260403000001` y `20260403000002`).** Dueño único:
   **paquete 02** (§1, §7.2). Precondición de arranque en su lugar:
   ```ruby
   raise "Falta el paquete 02" unless ActiveRecord::Base.connection.table_exists?(:exchange_rates) &&
                                      ActiveRecord::Base.connection.column_exists?(:exchange_rates, :effective_date)
   ```
2. 🔴 **Tu Discrepancia D1 GANÓ: `effective_date` entra.** La decisión está tomada en la
   arquitectura §1.5 y la implementa el paquete 02 (7 columnas de negocio, 6 NOT NULL, más el
   índice `(currency, effective_date)`). **El "Plan B" de este documento queda descartado y no se
   implementa.** Todo el algoritmo de caché y el mapeo del contrato §E.1 se construyen sobre esa
   columna, como estaba escrito: el JSON devuelve `"rate_date" = fila.effective_date` y
   `"requested_date" = params[:date]`. La fixture `exchange_rates.yml` (que sigue siendo de este
   paquete) **debe incluir `effective_date`**.
3. 🔴 **Se BORRAN las Tareas 13 y 14 (UI de moneda extranjera).** El bloque de moneda de
   `components/ReportExpense/FormCreate.jsx`, de `ShowConstCenter/ExpensesTable.jsx` y del
   `renderModal()` de `packs/ReportExpenseIndex.js` **es del paquete 08**, dueño único de los dos
   formularios duplicados (§4.5, §7.2). Estaba especificado dos veces con diseños y `data-testid`
   incompatibles. Los nombres canónicos son los del 08 (§7.6):
   `expense-currency-select`, `expense-foreign-block`, `expense-foreign-value`,
   `expense-foreign-tax`, `expense-foreign-total`, `expense-rate`, `expense-rate-date`,
   `expense-fetch-rate-btn`, `expense-rate-loading|ok|shifted|error`, `expense-cop-preview`,
   `expense-cop-manual-toggle`. Quedan **derogados** `expense-exchange-rate`,
   `expense-exchange-rate-hint` e `expense-invoice-value`.
4. **`cop_manual_override` (tu D2) sobrevive y se cablea de verdad**, que era el agujero: hoy la UI
   nunca lo enviaba y el servidor pisaba en silencio el ajuste manual del usuario en cada save.
   - Va en los **strong params del paquete 07** (Tarea 19), que lo había omitido.
   - Lo **setea el paquete 08** en el mismo handler que marca `exchange_rate_source = "manual"`.
   - Test de controller obligatorio (paquete 07): `POST` con `cop_manual_override = "1"` respeta
     el `invoice_value` enviado y **no** lo recalcula.
5. 🔴 **Se BORRA la Tarea 18 (`app/tools/exchange_rates_get_tool.rb`) y el registro de
   `exchange_rates` en `records_search_tool.rb`.** Dueño único de `app/tools/`: **paquete 11**
   (§7.7). Los dos paquetes creaban el mismo archivo con contenidos incompatibles y el del 11
   habría reventado con `NoMethodError` contra el `Result` de este. Aquí solo queda la
   **dependencia declarada**. `KEYS` canónico de esa tool (lo escribe el 11):
   `%i[id currency rate_date effective_date rate_to_cop source fetched_at]`.
6. 🔴 **`Result` canónico y seam de red canónico** (§4.2, §6.7, §7.2). Dos cambios de nombre
   obligatorios en `ExchangeRateService`:
   - El miembro de error se llama **`errors` y es un array**, no `error` singular. Definición
     literal: `Struct.new(:ok, :value, :errors, keyword_init: true)` con `ok?`/`error?` en el
     bloque. Es lo que consumen las tools del 11 y los controllers del 07.
   - El **único método de borde de red se llama `self.fetch_remote(currency:, date:)`**, es
     público, y **la inyección por parámetro `client:` se elimina** (junto con el privado
     `resolve_remote`). Razón: el initializer de stubs del paquete 12
     (`config/initializers/e2e_stubs.rb`) hace `prepend` sobre ese nombre exacto, y con dos
     mecanismos distintos para lo mismo no se puede escribir. Los tests stubean
     `ExchangeRateService.stub(:fetch_remote, ...)`, sin gemas nuevas.
7. **Se BORRAN los 3 specs E2E de este paquete** (`expense-foreign-currency.spec.js` y el "sexto
   flujo"). Todos los specs funcionales son del **paquete 12** (`currency.spec.js`); este paquete
   solo debe garantizar que el backend responda (§7.2).
8. **`test/support/`**: se elimina el `require_relative` desde cada test. Los dobles se autocargan
   (`test_helper.rb` es del paquete 01, §7.2). Este paquete no toca `test_helper.rb` — lo cual ya
   era su intención, pero por el mecanismo correcto.
9. **Tarea 16 (plantilla axlsx de 18 columnas): se elimina el lambda defensivo.** Deja de ser
   "si ya tiene 18 columnas solo verificar, si no llevarlo a 18, y el último borra el lambda".
   🔴 **ORDEN CORREGIDO EN EL CIERRE DE LA REAUDITORÍA — es al revés de lo que decía esta misma
   corrección.** La versión anterior fijaba *"el paquete 06 va ANTES que el 05"*, pero el **06
   consume de este paquete**: su C2 usa `Currency.valid?` y las columnas 14–16 de su plantilla leen
   `currency`/`foreign_value`/`exchange_rate`. Si el 06 fuera primero, su `import` revienta con
   `NameError: uninitialized constant Currency`. **Orden vinculante (§7.3): la ola 3 se parte en
   3a (04 │ 05) y 3b (06 │ 10), y el merge va `04 → 05 → 06 → 10`. El 05 va ANTES que el 06.**
   Consecuencia para la Tarea 16: este paquete **no escribe NI VERIFICA** las plantillas axlsx —
   cuando corre, todavía tienen 12 columnas y verificar 18 fallaría siempre. Solo deja escrito el
   **contrato de las columnas 14–16** que el 06 implementa y verifica. El lambda defensivo queda
   eliminado igual.
10. **Numeración canónica** (§7.1): lo que este documento llama "01 — Presupuesto" es el
    **paquete 04** (`04-presupuesto-y-aprobacion.md`); el desbloqueo de pruebas es el **01**; las
    migraciones son el **02**; el refactor de `search` es el **03**. Reescribir la tabla de
    Dependencias con esos números **y el nombre del archivo**.

> Documento de trabajo para un agente autónomo. Todo lo que aquí se decide es coherente con
> `docs/plan-gastos-ia/00-ARQUITECTURA.md`. Las desviaciones están aisladas en la sección
> **Discrepancias con la arquitectura** y ninguna se aplica en silencio. Tras la auditoría, **D1
> quedó aceptada e incorporada a la arquitectura, D2 sobrevive repartida entre 05/07/08 y D3 quedó
> retirada** (los specs funcionales son del paquete 12).

---

## Objetivo

Que un gasto se pueda registrar en moneda extranjera con su valor tal cual aparece en el
comprobante, y que el sistema resuelva solo la tasa de la **fecha del gasto** (TRM oficial de
datos.gov.co para USD, cruce vía Banco Central Europeo para el resto), guarde en
`invoice_value/invoice_tax/invoice_total` **siempre pesos**, permita ajustar el peso o la tasa a
mano cuando la fuente no responde, y no altere en nada el número que `recalculate_cost_center`
suma para la ejecución del centro de costos.

---

## Dependencias

Numeración canónica de §7.1. Este paquete es el **05** y depende de **01, 02 y 03**.

| Paquete | Por qué se necesita antes | ¿Bloqueante? |
|---|---|---|
| **01 — Infraestructura de pruebas** (`01-infraestructura-de-pruebas.md`) | Sin él `bin/rails test` no arranca (`chromedriver-helper` + 4 fixtures rotas) y **no se puede escribir un solo test** de este paquete. Además la Capa 1 (`current_actor_id` en `ReportExpense`) es la que evita que todo test que cree un gasto reviente en `User.current.id`. Es también el dueño de `test_helper.rb`, `test/support/**` y `test/fixtures/files/**`. | **Sí, duro** |
| **02 — Migraciones, esquema y datos históricos** (`02-migraciones-y-esquema.md`) | Dueño único de las 6 migraciones, incluidas las 7 columnas de moneda en `report_expenses` y la tabla `exchange_rates` con `effective_date` (§1.5, §7.2). Este paquete **no crea ninguna migración**; verifica la precondición del bloque de correcciones y sigue. | **Sí, duro** |
| **03 — Deuda técnica bloqueante** (`03-deuda-tecnica-bloqueante.md`) | Dueño de `ReportExpense.search` + `SEARCH_KEYS` + los 6 call sites y del concern de auditoría. Este paquete **NO** agrega el filtro `currency` a `get_report_expenses` (invariante #6): ese filtro es de §F.1 y entra después del refactor. | **Sí** (por §7.3) |
| **04 — Presupuesto y aprobación** (`04-presupuesto-y-aprobacion.md`) | Solo por convivencia de archivos: comparte `ReportExpenseSerializer` y `ReportExpensesListTool::KEYS`. No hay dependencia lógica: este paquete **no lee ni escribe `budget_status`**. | No |
| **06 — Comprobante, contabilidad y Excel** (`06-comprobante-y-contabilidad.md`) | **Va ANTES que el 05 en la misma ola 3** (corrección 9). Es el dueño de llevar las dos plantillas axlsx a 18 columnas; este paquete solo **verifica** las columnas de moneda. | No, pero **el 06 va primero** |

Consumidores aguas abajo (no son dependencias de este paquete): el **07** cablea los strong params
de moneda y `cop_manual_override`; el **08** escribe toda la UI de moneda; el **11** escribe
`exchange_rates_get_tool.rb` sobre el `Result` canónico de aquí; el **12** escribe
`currency.spec.js` y `config/initializers/e2e_stubs.rb` haciendo `prepend` sobre `fetch_remote`.

**Precondición de arranque:** el `raise` del punto 1 del bloque de correcciones (tabla
`exchange_rates` con `effective_date` ya migrada por el 02). Si no pasa, este paquete no arranca.

Nada de este paquete depende del paquete de extracción con IA. El endpoint
`POST /extract_receipt` (§D.1, paquete 10) **consume** `ExchangeRateService` pero no al revés.

---

## Discrepancias con la arquitectura

Tres, todas declaradas. **La auditoría ya las resolvió**: D1 aceptada (§1.5), D2 aceptada pero
repartida entre 05/07/08, D3 **retirada**. Se conserva el texto como registro de por qué.

### D1. `exchange_rates` necesita una columna más: `effective_date` (date, not null) — ✅ ACEPTADA

**Qué dice la arquitectura.** §1.5 fija seis columnas y el índice único `(currency, rate_date)`.
§1.3 dice que `report_expenses.exchange_rate_date` "se guarda aparte porque la fuente puede
devolver el último hábil anterior". §E.1 exige que la respuesta distinga `rate_date` de
`requested_date`.

**Por qué no cierra.** Con una sola columna de fecha hay que elegir una de dos cosas y se pierde
la otra:

- Si `rate_date` = **día hábil de la fuente**, entonces pedir la tasa de un sábado nunca da un
  *cache hit* (no existe fila con `rate_date = sábado`) ⇒ **cada consulta de una fecha no hábil
  pega a la red otra vez**, para siempre. Con 5 hilos de Puma y sin `cache_store` en producción
  (§1.5), eso es exactamente lo que la tabla existía para evitar.
- Si `rate_date` = **día al que aplica** (el pedido), la caché es exacta pero se pierde el dato de
  qué día hábil produjo la tasa ⇒ §E.1 no puede reportar `rate_date != requested_date` al releer
  de caché, y `report_expenses.exchange_rate_date` deja de tener de dónde salir.

**Cambio aceptado (aditivo, no rompe nada).** La columna

```ruby
t.date :effective_date, null: false
```

**está incorporada a §1.5 y la crea el paquete 02** (7 columnas de negocio, 6 NOT NULL, más el
índice `(currency, effective_date)`). Este paquete no la migra: la consume. Semántica fijada:

| Columna | Significado | Ejemplo (se pide sábado 18-jul-2026) |
|---|---|---|
| `rate_date` | Día al que **aplica** la tasa. Es la clave de caché y el lado del índice único. | `2026-07-18` |
| `effective_date` | Día hábil que **publicó** la tasa. | `2026-07-17` |

El índice único `(currency, rate_date)` **no cambia**. Ninguna otra sección de la arquitectura se
ve afectada. Mapeo hacia los contratos ya publicados:

| Campo JSON de §E.1 | Origen |
|---|---|
| `requested_date` | el parámetro `date` de la petición |
| `rate_date` | `exchange_rates.effective_date` ← **ojo con el cruce de nombres** |
| `rate_to_cop` | `exchange_rates.rate_to_cop` |
| `source` | `exchange_rates.source` |
| `cached` | `true` si la fila ya existía antes de esta petición |

Y `report_expenses.exchange_rate_date` guarda **`effective_date`**, que es lo que §1.3 describe.

**Plan B: DESCARTADO por la auditoría** (corrección 2, §1.5). No se implementa, no se evalúa y no
se menciona en el PR. El algoritmo de caché y el mapeo del contrato §E.1 se construyen siempre
sobre `effective_date`.

### D2. Un parámetro virtual nuevo: `cop_manual_override` — ✅ ACEPTADA (repartida)

> **Reparto tras la auditoría** (corrección 4): el `attr_accessor` y la regla determinista del
> modelo son de **este paquete**; el permiso en `report_expense_params_create/update` es del
> **paquete 07** (su Tarea 19) y su test de controller también; quien lo **envía** desde la UI es
> el **paquete 08**, en el mismo handler que marca `exchange_rate_source = "manual"`.

**Qué dice la arquitectura.** §1.3: *"El usuario puede ajustar el COP a mano después de la
conversión; en ese caso `exchange_rate_source` pasa a `"manual"`"*. §B.1 lista los strong params
nuevos y no incluye ninguno para señalar ese ajuste.

**Por qué no cierra.** El servidor tiene que decidir, en cada `save`, si recalcula
`invoice_value = foreign_value × exchange_rate` (y pisa lo que mandó el cliente) o si respeta lo
que mandó el cliente. Inferirlo comparando el valor recibido contra el calculado es no
determinista: si el usuario ajusta a un número que casualmente coincide, o si el redondeo del
navegador difiere en un centavo, el servidor adivina mal y borra el ajuste del usuario o lo
inventa.

**Cambio propuesto.** `attr_accessor :cop_manual_override` en `ReportExpense` (**virtual, no es
columna, no hay migración**), permitido en `report_expense_params_create` y
`report_expense_params_update` **por el paquete 07**. Regla determinista (esta sí es de aquí):

- `cop_manual_override` truthy (`"1"`, `"true"`, `true`) ⇒ el servidor **no recalcula** los COP y
  fuerza `exchange_rate_source = "manual"`.
- en cualquier otro caso ⇒ el servidor **recalcula** los COP desde `foreign_* × exchange_rate` y
  pisa lo que haya llegado. El servidor siempre tiene la última palabra.

Se agrega a la lista de §B.1 como parámetro permitido **en el paquete 07**. **Sigue prohibido**
permitir `budget_status`, `budget_reason`, `expense_budget_id`, `accounting_approved`,
`accounting_approved_by_id` y `accounting_approved_at`.

### D3. Un sexto flujo E2E

> **RETIRADA por auditoría.** Dueño único: paquete 12. Ver el bloque de correcciones al inicio.

---

## Decisiones asumidas

Cada una es firme; el agente no debe re-discutirlas.

1. **Asumido:** día no hábil ⇒ **se usa la tasa del último día hábil anterior**, nunca la del
   siguiente ni un promedio. Tres razones: (a) es la convención de la propia fuente — la TRM
   publica `vigenciadesde`/`vigenciahasta` y la del viernes rige sábado y domingo; (b) es la
   regla contable colombiana para causar una operación en pesos (TRM vigente en la fecha de la
   operación); (c) la tasa del siguiente hábil no existe todavía cuando el gasto se registra el
   mismo día, así que sería imposible de aplicar la mitad de las veces.
2. **Asumido:** fecha futura (`> hoy`) ⇒ `Result` de error, nunca se devuelve la última conocida.
   "Hoy" se calcula en `America/Bogota` (ver trampa T7), no en UTC.
3. **Asumido:** ventana máxima de tolerancia `MAX_STALE_DAYS = 10` días. Si el día hábil más
   cercano está a más de 10 días de la fecha pedida, el servicio falla y pide captura manual.
   10 cubre el puente festivo colombiano más largo (4 días) con margen; más allá de eso ya no es
   "la tasa del día" y afirmarlo sería mentir en un documento contable.
4. **Asumido:** `foreign_total` en blanco ⇒ se completa con `foreign_value + foreign_tax` antes de
   validar (espeja lo que hoy hacen los dos formularios y `ReportExpense.import:125`).
5. **Asumido:** `invoice_total = to_cop(foreign_total)`, **no** `invoice_value + invoice_tax`. La
   diferencia máxima por redondeo es de **un centavo de peso**, ningún cálculo del centro de
   costos usa `invoice_total` (§2.6 e invariante #3 usan `invoice_value`) y el total en pesos que
   contabilidad quiere ver es la conversión del total del comprobante. Hay un test que fija la
   tolerancia en 0.01.
6. **Asumido:** cambiar la moneda a `COP` **limpia** `foreign_value`, `foreign_tax`,
   `foreign_total`, `exchange_rate`, `exchange_rate_date` y `exchange_rate_source` (los pone a
   `nil`) y deja los COP tal como estén. Dejar residuos de moneda extranjera en un gasto en pesos
   produce filas del Excel que se leen como conversiones falsas.
7. **Asumido:** `exchange_rates` **no** genera `RegisterEdit` ni tiene callbacks de auditoría. Es
   una caché de un dato público, no un registro de negocio. Esto también la exime del gotcha de
   `User.current`.
8. **Asumido:** el catálogo de monedas llega al navegador como **global de layout**
   (`window.CM_CURRENCIES`), no como prop. Llegar por props al formulario de la pestaña del
   centro exige atravesar seis archivos (`show.html.erb` → `packs/ConstCenterShow.js` →
   `components/ConstCenter/index.jsx` → `components/ConstCenter/show.jsx` →
   `ShowConstCenter/TabContentShow.jsx` → `ShowConstCenter/ExpensesTable.jsx` →
   `ReportExpense/FormCreate.jsx`), seis archivos que otros paquetes también están tocando. El
   repo ya usa este patrón (`window.cmOpenMenu` en `layouts/user.html.erb:1275-1315`).
9. **Fijado por la auditoría (corrección 6, §6.7):** el doble de prueba **no se inyecta por
   parámetro `client:`** — ese mecanismo queda eliminado. El único seam de red es el método
   público `ExchangeRateService.fetch_remote(currency:, date:)`, y los tests lo reemplazan con
   `ExchangeRateService.stub(:fetch_remote, ->(**){ ... })`, **sin agregar ninguna gema**. Es el
   mismo punto sobre el que el paquete 12 hace `prepend` en `config/initializers/e2e_stubs.rb`.
   Los tests de controller siguen usando `stub` sobre `ExchangeRateService.fetch`.
10. **Asumido:** el paquete **no** agrega filtros a `get_report_expenses` (invariante #6). Solo
    columnas, serialización y export.

---

## Archivos

### A crear

> Las dos migraciones (`20260403000001`, `20260403000002`) **salieron de este paquete**: dueño
> único **02** (§7.2). El `app/tools/exchange_rates_get_tool.rb` salió al **11** (§7.7). El
> `test/support/fake_exchange_rate_client.rb` salió al **01** (dueño de `test/support/**`, §7.2) y
> además quedó sin uso al eliminarse la inyección por `client:`. Los specs E2E salieron al **12**.

| Ruta | Qué se hace |
|---|---|
| `app/models/currency.rb` | Catálogo congelado `CATALOG`/`CODES`/`DEFAULT` + `options` + `valid?` + `find`. Clase sin tabla. |
| `app/models/exchange_rate.rb` | Modelo de la caché: validaciones, `SOURCES`, scopes `applicable_on` y `latest_before`. Sin callbacks de auditoría. |
| `app/services/exchange_rate_client.rb` | Única clase que abre sockets. `trm_cop_per_usd(date:)` y `ecb_units_per_eur(currency:, date:)`. Parsers puros como métodos de clase. **Se instancia solo dentro de `ExchangeRateService.fetch_remote`**, nunca se inyecta. |
| `app/services/exchange_rate_service.rb` | Orquestador: caché → fuente → persistencia → fallback. `Result` canónico (`ok`, `value`, `errors`) y seam público `fetch_remote(currency:, date:)` (§6.7). Nunca levanta excepción de red. |
| `app/controllers/exchange_rates_controller.rb` | `get_exchange_rate` (contrato §E.1). |
| `test/fixtures/exchange_rates.yml` | 4 filas con `effective_date`: USD hábil, USD alias de fin de semana, EUR, y una vieja para el test de fallback. **Sigue siendo de este paquete** (corrección 2). |
| `test/models/currency_test.rb` | — |
| `test/models/exchange_rate_test.rb` | — |
| `test/models/report_expense_currency_test.rb` | — |
| `test/models/report_expense_import_currency_test.rb` | — |
| `test/services/exchange_rate_client_test.rb` | Solo parsers, sin red. |
| `test/services/exchange_rate_service_test.rb` | — |
| `test/helpers/application_helper_currency_test.rb` | No-regresión de `recalculate_cost_center`. |
| `test/controllers/exchange_rates_controller_test.rb` | — |

### A modificar

> Salieron de esta tabla por §7.2: `app/controllers/report_expenses_controller.rb` (**07**),
> `components/ReportExpense/FormCreate.jsx` y `packs/ReportExpenseIndex.js` (**08**),
> `ShowConstCenter/ExpensesTable.jsx` y todo `this.columns` (**08/09**),
> `app/views/report_expenses/download_file.xlsx.axlsx` (**06**, corrección 9) y
> `app/tools/records_search_tool.rb` (**11**, corrección 5).
>
> 🔴 **Salieron además en el cierre de la reauditoría** (los tres, por dueño único en §7.2):
> `app/serializers/report_expense_serializer.rb` → **07** (lo reclamaban 05, 06 y 07 a la vez, y
> los 13 atributos del 07 son exactamente la unión del trabajo de los otros dos);
> `app/tools/report_expenses_create_tool.rb` → **11** (la excepción de §7.7 cubre solo las claves
> 20–26 del *list* tool, no el *create* tool); y **`ReportExpense.import`** → **06** (fila propia
> en §7.2; ver la Tarea 17). De `app/models/report_expense.rb` este paquete conserva solo su
> región de conversión y validación de moneda.

| Ruta | Qué se hace |
|---|---|
| `app/models/report_expense.rb` | `attr_accessor :cop_manual_override`; `before_validation :normalize_currency, :backfill_foreign_total, :apply_currency_conversion`; validaciones de moneda; `self.to_cop`; `foreign_currency?`. **No se toca `import` (es del 06, ver Tarea 17), ni `search` (03), ni `create_*_register`, ni el umbral 59.** |
| `config/routes.rb` | `get "get_exchange_rate", to: "exchange_rates#get_exchange_rate"` junto a las rutas de gastos (línea ~88). ⚠️ **Tres paquetes** escriben en este bloque en la ola 3: 05, 06 y **10** (`post "extract_receipt/report_expenses"`, en líneas contiguas). Rebase en el orden 05 → 06 → 10. |
| `app/views/layouts/user.html.erb` | Una línea: `window.CM_CURRENCIES = <%= raw get_currencies.to_json %>;` dentro del bloque `<script>` existente. §7.2 reparte este archivo **por bloque**: `nav-gastos` es del **01** y el ítem de menú *Contabilidad* + `expense_controllers` + `controller_name_helper` + `authorization_accounting_expenses` son del **09**; no tocarlos. Es la **fuente única** del catálogo de monedas del frontend (§4.5): llega a los dos formularios y a las dos tablas, y **deroga** la prop `currencies` que el 08 bajaba por `cost_centers/show.html.erb`. ⚠️ Este layout renderiza **todas** las pantallas: correr `bundle exec rails test` completo antes del PR. |
| `app/tools/report_expenses_list_tool.rb` | `KEYS` += las 7 claves de moneda (posiciones 20–26 de §7.7), sin borrar ni reordenar las ajenas. **Único archivo de `app/tools/` que este paquete toca.** |
| `app/helpers/application_helper.rb` | `get_currencies` (Tarea 12) y **un comentario** encima de `:585` fijando el invariante #3. Cero cambios de comportamiento en `recalculate_cost_center`. ⚠️ **Archivo repartido por método (§7.2)**: el 06 agrega `budget_status_label`/`accounting_state_label` y el 09 `authorization_accounting_expenses`/`controller_name_helper`. Cada uno **agrega solo sus métodos al final** y rebasa; orden 05 → 06 → 09. El nombre del helper de catálogo es `get_currencies` y **no** `currency_options`: el 09 lo consume tal cual. |
| `config/application.yml` | (gitignoreado, **no se versiona**) variables nuevas documentadas en la Tarea 21. Solo se AÑADEN claves; la tabla de §7.9 es la fuente de verdad. |

**Dependencia declarada sobre el serializer (ya no se escribe aquí).** El **07** agrega los 7
atributos de moneda a `app/serializers/report_expense_serializer.rb`. Este paquete conserva
únicamente su **test de contrato** sobre el JSON (que las 7 claves salgan con el tipo correcto) y,
si cambia un nombre de campo, actualiza la tarea del 07 en el mismo PR.

---

## Tareas

Cada tarea es un commit. El orden importa: 3→4→5 son prerrequisito del resto. **Antes de la
Tarea 3 se corre la precondición de arranque** del punto 1 del bloque de correcciones: si
`exchange_rates` o `exchange_rates.effective_date` no existen, el paquete 02 todavía no está
mergeado y este paquete no arranca.

### 1. Migración de campos de moneda en `report_expenses`

> **RETIRADA por auditoría.** Dueño único: paquete 02. Ver el bloque de correcciones al inicio.

### 2. Migración `create_exchange_rates`

> **RETIRADA por auditoría.** Dueño único: paquete 02. Ver el bloque de correcciones al inicio.

### 3. `app/models/currency.rb`

Copiar textualmente §1.6 y agregar dos utilidades que el resto del paquete usa:

```ruby
class Currency
  CATALOG = [
    { code: "COP", name: "Peso colombiano", symbol: "$",   decimals: 2 },
    { code: "USD", name: "Dólar",           symbol: "US$", decimals: 2 },
    { code: "EUR", name: "Euro",            symbol: "€",   decimals: 2 }
  ].freeze

  CODES   = CATALOG.map { |c| c[:code] }.freeze
  DEFAULT = "COP"

  def self.options
    CATALOG.map { |c| { label: "#{c[:code]} — #{c[:name]}", value: c[:code] } }
  end

  def self.valid?(code) = CODES.include?(normalize(code))
  def self.find(code)   = CATALOG.find { |c| c[:code] == normalize(code) }
  def self.normalize(code) = code.to_s.strip.upcase
  def self.foreign?(code)  = valid?(code) && normalize(code) != DEFAULT
end
```

Verificado: no existe ninguna clase `Currency` en `app/models/` ni gema `money` en el `Gemfile`;
el nombre está libre.

### 4. `app/models/exchange_rate.rb`

```ruby
class ExchangeRate < ApplicationRecord
  SOURCES = %w[trm_oficial bce manual].freeze

  validates :currency,    presence: true, inclusion: { in: Currency::CODES }
  validates :rate_date,   presence: true, uniqueness: { scope: :currency }
  validates :effective_date, presence: true
  validates :rate_to_cop, presence: true, numericality: { greater_than: 0 }
  validates :source,      presence: true, inclusion: { in: SOURCES }
  validates :fetched_at,  presence: true

  validate  :effective_not_after_rate_date

  scope :applicable_on, ->(currency, date) { where(currency: currency, rate_date: date) }
  scope :latest_before, ->(currency, date, window) {
    where(currency: currency)
      .where(rate_date: (date - window)..date)
      .order(rate_date: :desc)
  }

  def stale_for?(date) = rate_date != date.to_date

  private

  def effective_not_after_rate_date
    return if effective_date.blank? || rate_date.blank?
    errors.add(:effective_date, "no puede ser posterior a la fecha de aplicación") if effective_date > rate_date
  end
end
```

Sin `belongs_to`, sin `RegisterEdit`, sin `User.current` (decisión asumida 7).
`bundle exec annotate` después.

### 5. Fixture `test/fixtures/exchange_rates.yml`

Cabecera `# == Schema Information` de `annotate`. Etiquetas semánticas:

```yaml
usd_habil:          { currency: USD, rate_date: 2026-07-17, effective_date: 2026-07-17, rate_to_cop: 4120.500000, source: trm_oficial, fetched_at: 2026-07-17 08:00:00 }
usd_fin_de_semana:  { currency: USD, rate_date: 2026-07-18, effective_date: 2026-07-17, rate_to_cop: 4120.500000, source: trm_oficial, fetched_at: 2026-07-18 09:00:00 }
eur_habil:          { currency: EUR, rate_date: 2026-07-17, effective_date: 2026-07-17, rate_to_cop: 4480.250000, source: bce,         fetched_at: 2026-07-17 08:00:00 }
usd_vieja:          { currency: USD, rate_date: 2026-07-01, effective_date: 2026-07-01, rate_to_cop: 4050.000000, source: trm_oficial, fetched_at: 2026-07-01 08:00:00 }
```

Correr `bin/rails test test/models` **completo** después de agregarla (§5.4.1: una fixture rota
tumba toda la suite).

### 6. `app/services/exchange_rate_client.rb` — la única clase que abre sockets

Directorio `app/services/` es nuevo (§4.2); Zeitwerk lo autocarga sin configurar nada.

> **Sin inyección.** Esta clase se instancia **solo** dentro de
> `ExchangeRateService.fetch_remote` (corrección 6, §6.7). No se pasa por parámetro `client:` a
> ningún método, ni en producción ni en los tests: el seam de prueba es `fetch_remote`.

```ruby
require "httparty"
require "csv"

class ExchangeRateClient
  Quote = Struct.new(:rate, :effective_date, :valid_until, keyword_init: true)

  TRM_URL_DEFAULT = "https://www.datos.gov.co/resource/32sa-8pi3.json"
  ECB_URL_DEFAULT = "https://data-api.ecb.europa.eu/service/data/EXR"
  LOOKBACK_DAYS   = 10

  def open_timeout = (ENV["EXCHANGE_RATE_OPEN_TIMEOUT"] || 3).to_i
  def read_timeout = (ENV["EXCHANGE_RATE_HTTP_TIMEOUT"] || 5).to_i

  # COP por 1 USD, vigente en `date`. nil si la fuente no responde o no cubre la fecha.
  def trm_cop_per_usd(date:) ... end

  # Unidades de `currency` por 1 EUR (serie EXR D.<currency>.EUR.SP00.A del BCE).
  # Devuelve Quote con rate = 1 y effective_date = date cuando currency == "EUR".
  def ecb_units_per_eur(currency:, date:) ... end

  # --- parsers puros, sin red: son el punto de prueba real ---
  def self.parse_trm(body, upto:) ... end          # -> Quote | nil
  def self.parse_ecb_csv(body, upto:) ... end      # -> Quote | nil
end
```

**Detalle de `trm_cop_per_usd`.** Dataset Socrata `32sa-8pi3`
("Tasa de Cambio Representativa del Mercado — TRM", www.datos.gov.co). Petición:

```ruby
HTTParty.get(
  ENV["TRM_API_URL"].presence || TRM_URL_DEFAULT,
  query: {
    "$where" => "vigenciadesde <= '#{date.strftime('%Y-%m-%d')}T23:59:59.000'",
    "$order" => "vigenciadesde DESC",
    "$limit" => 1
  }.merge(ENV["DATOS_GOV_APP_TOKEN"].present? ? { "$$app_token" => ENV["DATOS_GOV_APP_TOKEN"] } : {}),
  headers: { "Accept" => "application/json" },
  open_timeout: open_timeout, timeout: read_timeout
)
```

Fila típica de respuesta:
`{"valor":"4120.50","unidad":"COP","vigenciadesde":"2026-07-17T00:00:00.000","vigenciahasta":"2026-07-19T00:00:00.000"}`

`parse_trm(body, upto:)`:
1. `JSON.parse(body)`; si no es Array o está vacío ⇒ `nil`.
2. `rate = BigDecimal(row["valor"].to_s)`; si `<= 0` ⇒ `nil`. **Nunca `to_f`.**
3. `effective = Date.parse(row["vigenciadesde"])`, `valid_until = Date.parse(row["vigenciahasta"])`.
4. `nil` si `effective > upto` (la fuente devolvió algo del futuro) o si
   `(upto - effective).to_i > LOOKBACK_DAYS`.
5. `Quote.new(rate:, effective_date: effective, valid_until: [valid_until, upto].max)`.

**Detalle de `ecb_units_per_eur`.** Portal de datos del BCE, SDMX, **sin API key**. Se pide
`format=csvdata` (no `jsondata`: SDMX-JSON obliga a reconstruir el eje temporal desde
`structure.dimensions.observation`, cinco veces más código para el mismo dato):

```
GET {ECB_URL}/D.{CURRENCY}.EUR.SP00.A?startPeriod={date - LOOKBACK_DAYS}&endPeriod={date}&format=csvdata&detail=dataonly
```

`parse_ecb_csv(body, upto:)`:
1. `CSV.parse(body, headers: true)`; localizar columnas **por nombre** (`TIME_PERIOD`,
   `OBS_VALUE`), nunca por posición.
2. Filtrar filas con `OBS_VALUE` presente y numérico y `TIME_PERIOD <= upto`.
3. Tomar la de `TIME_PERIOD` **máximo**; `nil` si no queda ninguna o si
   `(upto - effective).to_i > LOOKBACK_DAYS`.
4. `Quote.new(rate: BigDecimal(obs), effective_date: Date.parse(time_period), valid_until: upto)`.

Atajo obligatorio: `currency == "EUR"` ⇒ devolver `Quote.new(rate: BigDecimal("1"),
effective_date: date, valid_until: date)` **sin pegarle a la red** (la serie D.EUR.EUR no existe:
devolvería 404).

**Rescue único y explícito** en los dos métodos de red, en este orden y sin reintentos:

```ruby
rescue HTTParty::Error, Net::OpenTimeout, Net::ReadTimeout, Timeout::Error,
       SocketError, Errno::ECONNREFUSED, Errno::ECONNRESET, OpenSSL::SSL::SSLError,
       JSON::ParserError, CSV::MalformedCSVError, ArgumentError => e
  Rails.logger.warn("[ExchangeRateClient] #{e.class}: #{e.message}")
  nil
end
```

`ArgumentError` está para `BigDecimal("")` y `Date.parse("")`. Además: `return nil unless
response.code.to_i == 200` antes de parsear (el BCE responde **404 cuando la ventana no tiene
observaciones**, y Socrata responde **429** cuando estrangula peticiones anónimas).

### 7. `app/services/exchange_rate_service.rb`

**Contrato canónico fijado por la auditoría** (corrección 6, §4.2, §6.7, §7.2). El miembro de
error se llama **`errors` y es un array**; el único método de borde de red se llama
**`fetch_remote`**, es público y **no recibe el cliente por parámetro**.

```ruby
class ExchangeRateService
  Result = Struct.new(:ok, :value, :errors, keyword_init: true) do
    def ok?    = ok
    def error? = !ok
  end

  Rate   = Struct.new(:currency, :requested_date, :rate_date, :rate_to_cop,
                      :source, :cached, :stale, keyword_init: true)

  MAX_STALE_DAYS = 10
  BOGOTA         = "America/Bogota"

  def self.call(currency:, date:) = fetch(currency: currency, date: date)

  def self.fetch(currency:, date:) ... end

  # ÚNICO seam de red (§6.7). Público a propósito: el paquete 12 le hace `prepend` en
  # config/initializers/e2e_stubs.rb y los tests de nivel 1 lo reemplazan con `stub`.
  # Devuelve Result: value = ExchangeRateClient::Quote + source, errors = array de strings.
  def self.fetch_remote(currency:, date:) ... end

  def self.record_manual(currency:, date:, rate:) ... end
  def self.today = Time.find_zone(BOGOTA).today
end
```

Todo constructor de `Result` va con `keyword_init`: `Result.new(ok: true, value: rate, errors: [])`
y `Result.new(ok: false, value: nil, errors: ["..."])`. **Nunca `result.error` en singular**: lo
consumen las tools del 11 y los controllers del 07 como array.

`fetch` — algoritmo exacto, en este orden:

1. `code = Currency.normalize(currency)`. Si `!Currency.valid?(code)` ⇒
   `Result.new(ok: false, value: nil, errors: ["Moneda no soportada: #{currency}"])`.
2. `d = date.to_date` dentro de `begin/rescue ArgumentError, TypeError, NoMethodError` ⇒ error
   `"Fecha inválida"`.
3. `code == Currency::DEFAULT` ⇒ `Result.new(ok: true, errors: [], value: Rate.new(currency: "COP",
   requested_date: d, rate_date: d, rate_to_cop: BigDecimal("1"), source: "identity",
   cached: true, stale: false))`. **Sin consultar la base ni la red** (contrato §E.1).
4. `d > today` ⇒ error `"No existe tasa para una fecha futura"`.
5. **Caché exacta:** `row = ExchangeRate.applicable_on(code, d).first`. Si existe ⇒ `Result` ok
   con `rate_date: row.effective_date`, `cached: true`, `stale: row.stale_for?(d)`. **Cero HTTP.**
6. **Fuente:** `remote = fetch_remote(currency: code, date: d)` (el seam de §6.7, abajo). Si
   `!remote.ok?` ⇒ paso 8.
7. **Persistir y devolver:** `quote, source = remote.value.values_at(:quote, :source)` y
   `persist_range!(code, quote, source)` (abajo) ⇒ `Result` ok con `cached: false`,
   `rate_date: quote.effective_date`, `stale: quote.effective_date != d`.
8. **Fallback por caída de la fuente:** `row = ExchangeRate.latest_before(code, d,
   MAX_STALE_DAYS).first`. Si existe ⇒ `Result` ok con `cached: true`, **`stale: true`** y
   `rate_date: row.effective_date`. Si no existe ⇒
   `Result.new(ok: false, value: nil, errors: ["No se pudo obtener la tasa para #{code} del #{d}. Ingrésela manualmente"])`
   — el texto exacto de §E.1.

`self.fetch_remote(currency:, date:)` — **público**, único seam de red, sin parámetro `client:`;
instancia `ExchangeRateClient` él mismo y devuelve un `Result` cuyo `value` lleva el `Quote` y el
`source`, o `ok: false` con `errors` si la fuente no responde:

```
code   = Currency.normalize(currency)
d      = date.to_date
client = ExchangeRateClient.new            # NO llega por parámetro (§6.7)
down   = ->(msg) { Result.new(ok: false, value: nil, errors: [msg]) }

trm = client.trm_cop_per_usd(date: d)      # COP por 1 USD
return down.("fuente TRM no disponible") if trm.nil?

if code == "USD"
  rate       = trm.rate
  source     = "trm_oficial"
  effective  = trm.effective_date
  valid_until= trm.valid_until
else
  x_per_eur   = client.ecb_units_per_eur(currency: code, date: d)   # unidades de X por 1 EUR
  usd_per_eur = client.ecb_units_per_eur(currency: "USD", date: d)  # USD por 1 EUR
  return down.("fuente BCE no disponible") if x_per_eur.nil? || usd_per_eur.nil? || x_per_eur.rate <= 0

  usd_per_unit = usd_per_eur.rate / x_per_eur.rate                  # USD por 1 X
  rate         = (usd_per_unit * trm.rate).round(6)
  source       = "bce"
  effective    = [trm.effective_date, x_per_eur.effective_date, usd_per_eur.effective_date].min
  valid_until  = d
end
return down.("tasa no positiva") if rate <= 0

Result.new(ok: true, errors: [],
           value: { quote: ExchangeRateClient::Quote.new(rate: rate,
                                                         effective_date: effective,
                                                         valid_until: valid_until),
                    source: source })
```

> Dirección de las series del BCE: `EXR D.<CURRENCY>.EUR.SP00.A` es **unidades de CURRENCY por
> 1 EUR**, no al revés. Invertirla es el error más caro de este paquete: con EUR daría una tasa
> de ~0.0002 COP y nadie lo nota hasta el cierre contable. Hay un test que fija la dirección.
> Para `EUR` el cruce se reduce a `1 (USD/EUR) × TRM`, porque `x_per_eur.rate == 1`.

`persist_range!(code, quote, source)` — el corazón de la caché:

- Rango a escribir: `(quote.effective_date..[quote.valid_until, d].max)`, recortado a
  **como máximo `MAX_STALE_DAYS + 1` días** y nunca más allá de `today`.
- Una fila por día del rango: `rate_date = día`, `effective_date = quote.effective_date`,
  `rate_to_cop = rate`, `source`, `fetched_at = Time.current`.
- Escritura idempotente **fila por fila y con savepoint propio**:

```ruby
def self.upsert_row!(attrs)
  ActiveRecord::Base.transaction(requires_new: true) { ExchangeRate.create!(attrs) }
rescue ActiveRecord::RecordNotUnique, ActiveRecord::RecordInvalid
  ExchangeRate.applicable_on(attrs[:currency], attrs[:rate_date]).first
end
```

  `requires_new: true` es **obligatorio**: en PostgreSQL, un `RecordNotUnique` rescatado dentro de
  una transacción sin savepoint deja la transacción en estado abortado y todo lo que siga falla
  con `PG::InFailedSqlTransaction`. Con 5 hilos de Puma (§1.5) esa carrera es real.

`record_manual(currency:, date:, rate:)` — persiste una tasa capturada a mano con
`source: "manual"`, `effective_date = rate_date = date`, usando el mismo `upsert_row!`; si ya
existe una fila para esa moneda+fecha la **actualiza** (la captura manual pisa la automática, no
al revés). Se usa desde el endpoint de moneda solo si en el futuro se decide persistirla; en este
paquete el ajuste manual vive en el gasto (`report_expenses.exchange_rate`) y `record_manual` se
entrega implementada y probada pero **no cableada a ningún controller**.

Reglas transversales del servicio (§4.2): sin `User.current`, sin `current_user`, **jamás dentro
de una transacción con `lock`** (§2.7), cero reintentos, retorno siempre `Result`.

### 8. Conversión en `ReportExpense`

En `app/models/report_expense.rb`, **arriba de los callbacks existentes** y sin tocarlos:

```ruby
mount_uploader ... # (no existe aún; lo agrega el paquete 06)

attr_accessor :cop_manual_override

before_validation :normalize_currency
before_validation :backfill_foreign_total
before_validation :apply_currency_conversion

validates :currency, presence: true, inclusion: { in: Currency::CODES,
          message: "no es una moneda soportada" }
validates :exchange_rate, numericality: { greater_than: 0 }, allow_nil: true
validates :foreign_value, :foreign_tax, :foreign_total,
          numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
validates :exchange_rate_source, inclusion: { in: ExchangeRate::SOURCES }, allow_nil: true
validate  :foreign_fields_required_when_foreign_currency

def self.to_cop(amount, rate)
  return nil if amount.nil? || rate.nil?
  (amount.to_d * rate.to_d).round(2).to_f     # round ANTES de to_f. invoice_* es float (invariante #2)
end

def foreign_currency? = Currency.foreign?(currency)
def cop_manual_override? = ActiveModel::Type::Boolean.new.cast(cop_manual_override).present?
```

Privados:

```ruby
def normalize_currency
  self.currency = Currency.normalize(currency).presence || Currency::DEFAULT
end

def backfill_foreign_total
  return unless foreign_currency?
  self.exchange_rate_date ||= invoice_date
  self.foreign_total ||= (foreign_value.to_d + foreign_tax.to_d) if foreign_value.present?
end

def apply_currency_conversion
  unless foreign_currency?
    self.foreign_value = self.foreign_tax = self.foreign_total = nil
    self.exchange_rate = self.exchange_rate_date = self.exchange_rate_source = nil
    return
  end
  return if exchange_rate.blank?

  if cop_manual_override?
    self.exchange_rate_source = "manual"
    return                                   # el servidor respeta los COP del cliente
  end

  self.invoice_value = self.class.to_cop(foreign_value, exchange_rate)
  self.invoice_tax   = self.class.to_cop(foreign_tax,   exchange_rate)
  self.invoice_total = self.class.to_cop(foreign_total, exchange_rate)
end

def foreign_fields_required_when_foreign_currency
  return unless foreign_currency?
  errors.add(:foreign_value,  "es obligatorio cuando la moneda no es COP") if foreign_value.blank?
  errors.add(:exchange_rate,  "es obligatoria cuando la moneda no es COP") if exchange_rate.blank?
end
```

**No se toca** `edit_values`, `create_edit_register` (ni su encabezado ni el umbral `> 59`),
`create_create_register`, `create_destroy_register` ni `self.search`. §4.7 es explícito: agregar
líneas al HTML de auditoría cambia la longitud del string y hace aparecer registros fantasma.
La moneda **no** entra al HTML de `RegisterEdit` en este paquete.

### 9. Strong params

> **RETIRADA por auditoría.** Dueño único: paquete 07 (su Tarea 19). Ver el bloque de correcciones
> al inicio.

### 10. Serializer

> **RETIRADA por auditoría (cierre de la reauditoría). Dueño único: paquete 07.**
> `app/serializers/report_expense_serializer.rb` lo reclamaban **tres** paquetes a la vez —este con
> +7 atributos de moneda, el 06 con los 3 contables + `belongs_to :accounting_approved_by`, y el 07
> con "13 atributos nuevos", que es exactamente la unión de los otros dos—, y el archivo no estaba
> ni en la tabla de conflictos de la ola 3 ni en §7.2. **Ahora tiene fila propia con dueño 07**, que
> va solo en su ola.

**Lo que queda aquí es la dependencia declarada y el test de contrato.** El 07 agrega a
`attributes` `:currency, :foreign_value, :foreign_tax, :foreign_total, :exchange_rate,
:exchange_rate_date, :exchange_rate_source`. Ninguno colisiona con una asociación (§4.3 ⚠️:
`payment_type` ya tiene esa patología preexistente; no agregar otra). Los `decimal` se serializan
como **string** (`"4120.5"`): el frontend hace `parseFloat` antes de `NumberFormat`. Si este
paquete renombra un campo, actualiza la Tarea 15 del 07 en el mismo PR.

### 11. `ExchangeRatesController` + ruta

`config/routes.rb`, junto a las rutas de gastos (~línea 88), estilo suelto del archivo:

```ruby
get "get_exchange_rate", to: "exchange_rates#get_exchange_rate"
```

```ruby
class ExchangeRatesController < ApplicationController
  before_action :authenticate_user!     # §E.1: nada más

  def get_exchange_rate
    result = ExchangeRateService.fetch(currency: params[:currency], date: params[:date])

    if result.ok?
      r = result.value
      render json: {
        type: "success", currency: r.currency,
        rate_date: r.rate_date, requested_date: r.requested_date,
        rate_to_cop: r.rate_to_cop, source: r.source,
        cached: r.cached, stale: r.stale
      }
    else
      render json: {
        type: "error", currency: Currency.normalize(params[:currency]),
        requested_date: params[:date], message: result.errors   # ya es Array (corrección 6)
      }
    end
  end
end
```

Ambos casos responden **HTTP 200** (§3, el frontend discrimina por `type`). `stale` es el campo
aditivo de D1/D-fallback.

### 12. Catálogo de monedas en el navegador

- `app/helpers/application_helper.rb`: `def get_currencies = Currency.options` (junto a
  `get_users`/`get_report_expense_options`, ~línea 174).
- `app/views/layouts/user.html.erb`: dentro del bloque `<script>` que ya define `window.cmOpenMenu`
  (`:1275-1315`), una línea:
  `window.CM_CURRENCIES = <%= raw get_currencies.to_json %>;`
Con eso termina la responsabilidad de este paquete: **publicar el global**. El helper local
defensivo dentro de cada formulario
(`function currencyOptions() { return (window.CM_CURRENCIES && window.CM_CURRENCIES.length) ? window.CM_CURRENCIES : [{ label: "COP — Peso colombiano", value: "COP" }]; }`)
lo escribe el **paquete 08**, dueño único de los dos formularios (§7.2). Aquí no se toca JSX.

### 13. Formulario A — `components/ReportExpense/FormCreate.jsx` + `ExpensesTable.jsx`

> **RETIRADA por auditoría.** Dueño único: paquete 08. Ver el bloque de correcciones al inicio.

### 14. Formulario B — `packs/ReportExpenseIndex.js`

> **RETIRADA por auditoría.** Dueño único: paquete 08. Ver el bloque de correcciones al inicio.

### 15. Columna en las dos tablas y en el detalle

> **RETIRADA por auditoría.** Dueño único: paquete 09. Ver el bloque de correcciones al inicio.

### 16. Export a Excel — **solo verificación** de las columnas de moneda

> **Alcance recortado a CONTRATO por la auditoría (corrección 9, con el orden ya corregido).**
> El **05 va ANTES que el 06** (§7.3, orden de merge `04 → 05 → 06 → 10`), y el **06 es el dueño
> único** de las dos plantillas axlsx y de llevarlas a 18 columnas. Este paquete **no escribe ni
> verifica** `app/views/report_expenses/download_file.xlsx.axlsx`: cuando corre, la plantilla
> todavía tiene 12 columnas y cualquier aserción sobre 18 fallaría. **Lo único que entrega aquí es
> el contrato de abajo**, que el 06 implementa y prueba, y que su criterio de aceptación verifica.
> **El lambda defensivo queda eliminado**: no se escribe, no se borra después, no se menciona.
> El criterio 25 de este paquete queda como criterio **del 06**, no de este.

Layout final de 18 columnas (fijado por §C.5 y §F.3), con los índices que usa la Tarea 17:

| # | Índice | Encabezado | Origen |
|---|---|---|---|
| 1 | 0 | `ID` | `task.id` |
| 2 | 1 | `Centro de costo` | `task.cost_center&.code` |
| 3 | 2 | `Responsable` | `task.user_invoice&.names` |
| 4 | 3 | `Fecha de factura` | `task.invoice_date` |
| 5 | 4 | `Nombre` | `task.invoice_name` |
| 6 | 5 | `NIT / CEDULA` | `task.identification` |
| 7 | 6 | `Descripcion` | `task.description` |
| 8 | 7 | `Numero de factura` | `task.invoice_number` |
| 9 | 8 | `Tipo` | `task.type_identification&.name` |
| 10 | 9 | `Medio de pago` | `task.payment_type&.name` |
| 11 | 10 | `Estado` | `task.is_acepted ? "Aceptado" : "Creado"` |
| 12 | 11 | `Estado presupuestal` | *(paquete 06)* |
| 13 | 12 | `Motivo presupuestal` | *(paquete 06)* |
| 14 | 13 | **`Moneda`** | `task.currency` |
| 15 | 14 | **`Valor extranjero`** | `task.foreign_value` |
| 16 | 15 | **`TRM`** | `task.exchange_rate` |
| 17 | 16 | `Valor del pago` | `task.invoice_value` |
| 18 | 17 | `IVA` | `task.invoice_tax` |

`app/views/report_expenses/download_file.xlsx.axlsx` lo lleva a estas 18 columnas **el paquete
06**, que se mergea **después** de este; `sheet.column_widths` debe listar **18** anchos (hoy lista
11 para 12 columnas: el 06 no replica el bug). Cuando este paquete corre, el archivo **todavía
tiene 12 columnas y eso es lo esperado**: no es señal de que falte nada, no se espera y no se
escribe. La verificación de las 18 columnas es criterio de aceptación **del 06**.

### 17. Import de Excel — mapeo posicional

> **RETIRADA por auditoría (cierre de la reauditoría). Dueño único: paquete 06.**
> `ReportExpense.import` —la detección de layout y **las 18 posiciones del `header`**— es una fila
> propia de §7.2 con dueño **06**. Los dos paquetes instruían escribir el mismo bloque con
> semánticas incompatibles (el 06 reescribe `self.import` completo con `Currency.valid?`; este
> reclamaba `header[13..15]` y un bloque de asignación distinto con `Currency.foreign?`,
> `Currency::DEFAULT` y `cop_manual_override`), y el segundo en mergear borraba en silencio el
> trabajo del primero. `app/models/report_expense.rb` **sale de la tabla "A modificar" de este
> paquete en lo que toca a `import`**.

**Lo único que queda aquí es la dependencia declarada.** Las dos reglas que solo estaban escritas
en este paquete **las absorbió la tabla de mapeo de la tarea C2 del 06**, literalmente:

```ruby
report_expense.currency = row["currency"].presence || Currency::DEFAULT
if Currency.foreign?(report_expense.currency)
  # ... foreign_value / exchange_rate / exchange_rate_date / exchange_rate_source = "manual"
  report_expense.cop_manual_override = row["invoice_value"].present?
end
```

Semántica que este paquete le exige al 06 y que su test de import debe afirmar: si el Excel trae la
columna 17 (`Valor del pago`) con valor, se respeta como verdad y `cop_manual_override` queda en
`true` —es la columna que alimenta el centro de costos y quien importa suele traer los pesos ya
cuadrados con contabilidad—; si viene vacía, el modelo calcula desde `foreign_value ×
exchange_rate`. Si este paquete cambia `Currency::DEFAULT` o `Currency.foreign?`, actualiza la C2
del 06 en el mismo PR.

La trampa de `header[0] = "id"` (que convierte la importación en un *upsert* capaz de pisar gastos
existentes) también es del **06**, que es quien introduce la columna `ID` en la plantilla. Este
paquete no la toca.

### 18. Tool MCP `exchange_rates_get`

> **RETIRADA por auditoría.** Dueño único: paquete 11 (también el registro de `exchange_rates` en
> `records_search_tool.rb`). Ver el bloque de correcciones al inicio.

**Lo único que queda aquí es la dependencia declarada:** el 11 escribe
`app/tools/exchange_rates_get_tool.rb` **sobre el `Result` canónico de la Tarea 7**
(`result.errors`, array — nunca `result.error`), con
`KEYS = %i[id currency rate_date effective_date rate_to_cop source fetched_at]` (§7.7). Si este
paquete cambia la firma de `ExchangeRateService`, actualiza §7.7 en el mismo PR.

### 19. Ampliar las tools de gastos

Excepción explícita —y **única**— al dueño único de `app/tools/`: §7.7 asigna las claves
**20–26** de `ReportExpensesListTool::KEYS` a este paquete, y **nada más de `app/tools/`**. Se agregan **solo** esas, en ese orden, sin borrar
ni reordenar las ajenas (17–19 son del 11; 27–28 del 06). Criterio compartido: `KEYS.size == 28` y
`KEYS.uniq == KEYS`.

- `app/tools/report_expenses_list_tool.rb`: `KEYS` += `:currency, :foreign_value, :foreign_tax,
  :foreign_total, :exchange_rate, :exchange_rate_date, :exchange_rate_source`. Cambia a la vez la
  salida de `_list`, `_get`, `_create` y de `records_search` (§G). **Verificar con Taimes antes de
  mergear.**
> **`app/tools/report_expenses_create_tool.rb`: RETIRADO de este paquete por la reauditoría.**
> Dueño único **11** (su Tarea 7). La excepción de §7.7 cubre **solo** las claves 20–26 de
> `ReportExpensesListTool::KEYS`, **no** el create tool; los dos paquetes mandaban agregar
> exactamente los mismos 6 campos de moneda al `input_schema` y a `WRITABLE`, y el archivo sale de
> la tabla "A modificar" de este paquete. Lo que este paquete le exige al 11 y queda como
> dependencia declarada: `currency` (string, con la lista de códigos en la `description` — §1.6: no
> hay tool `currencies_list`), `foreign_value`, `foreign_tax`, `foreign_total` (number),
> `exchange_rate` (number) y `exchange_rate_date` (string `YYYY-MM-DD`); y **no** se agregan
> `exchange_rate_source` (lo pone el servidor: `"manual"` si el agente manda la tasa, o el de la
> fuente si la resuelve el servicio), `cop_manual_override` (el agente no ajusta pesos a mano) ni
> nada de presupuesto/contabilidad.

> **Riesgo de merge:** `KEYS` es el mismo array que amplían los paquetes **11** (claves 17–19) y
> **06** (claves 27–28). El orden de las claves está fijado en §7.7: resolver el conflicto a mano
> respetando ese orden, sin borrar claves ajenas.

### 20. No-regresión de `recalculate_cost_center`

Cero cambios funcionales (invariante #3). Únicamente, en `app/helpers/application_helper.rb`
encima de la línea 585, un comentario:

```ruby
# INVARIANTE (00-ARQUITECTURA §1.3 / invariante #3): invoice_value SIEMPRE está en COP.
# Los valores en moneda extranjera viven en foreign_* y NUNCA entran a esta suma.
```

Todo el valor de esta tarea está en el test de `test/helpers/application_helper_currency_test.rb`.

### 21. Configuración y variables de entorno

Documentar en `config/application.yml` (gitignoreado — hay que avisar a quien despliega) y en
Heroku (`heroku config:set`):

| Variable | Default en código | Para qué |
|---|---|---|
| `TRM_API_URL` | `https://www.datos.gov.co/resource/32sa-8pi3.json` | Permite mover el dataset sin desplegar. |
| `DATOS_GOV_APP_TOKEN` | *(vacío)* | Token de Socrata. **Opcional pero recomendado**: sin él las peticiones son anónimas y datos.gov.co estrangula por IP (HTTP 429). Se obtiene gratis en datos.gov.co. |
| `ECB_API_URL` | `https://data-api.ecb.europa.eu/service/data/EXR` | — |
| `EXCHANGE_RATE_HTTP_TIMEOUT` | `5` | Timeout de lectura (§4.2). |
| `EXCHANGE_RATE_OPEN_TIMEOUT` | `3` | Timeout de conexión (§4.2). |

Las **cinco** están en la tabla consolidada de `00-ARQUITECTURA.md` §7.9 (`ECB_API_URL` y
`EXCHANGE_RATE_OPEN_TIMEOUT` se le agregaron en el cierre de la reauditoría: faltaban). Esa tabla
—15 variables en 13 filas— es la fuente de verdad y la que verifica el criterio 11 del paquete 13.
`config/application.yml` **no se versiona**: este paquete solo **AÑADE** sus claves a la copia
local, nunca reescribe el archivo (en la misma ola el 10 añade las suyas).

Antes de escribir el cliente, verificar que el dataset sigue vivo:
`curl 'https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1'`. Si cambió el id, ajustar el
default **y** dejarlo en la variable.

---

## Pruebas unitarias (Minitest)

Todo test que cree o edite un gasto se envuelve en `as_user(users(:admin)) { ... }` (§5.3, Capa 2).
Ningún test de este paquete toca la red.

### Cómo se stubea la fuente (corrección 6 / §6.7)

**No hay `FakeExchangeRateClient` ni parámetro `client:`.** El único seam es el método público
`ExchangeRateService.fetch_remote(currency:, date:)`, y cada test lo reemplaza con `stub`, sin
gemas nuevas:

```ruby
quote = ExchangeRateClient::Quote.new(rate: BigDecimal("4120.5"),
                                      effective_date: Date.new(2026, 8, 7),
                                      valid_until:    Date.new(2026, 8, 9))
ok    = ExchangeRateService::Result.new(ok: true, errors: [],
                                        value: { quote: quote, source: "trm_oficial" })

ExchangeRateService.stub(:fetch_remote, ->(**) { ok }) do
  # ... aserciones
end
```

Para afirmar "**no se consultó la fuente**" se stubea con un lambda que hace fallar el test:
`ExchangeRateService.stub(:fetch_remote, ->(**) { flunk "no debió consultar la fuente" }) { ... }`.
Para simular la caída: `->(**) { ExchangeRateService::Result.new(ok: false, value: nil,
errors: ["fuente TRM no disponible"]) }`.

Si algún doble compartido llegara a hacer falta, vive en `test/support/` y **se autocarga**
(el `Dir[...].each { |f| require f }` de `test_helper.rb`, que es del **paquete 01**, §7.2).
**Este paquete no escribe `test/support/**` ni `test_helper.rb`, y no usa `require_relative`.**

### `test/models/currency_test.rb` — 5 casos

| Test | Aserción |
|---|---|
| `test "CODES contiene COP USD EUR y esta congelado"` | `Currency::CODES == %w[COP USD EUR]` y `CODES.frozen?`. |
| `test "valid? normaliza minusculas y espacios"` | `Currency.valid?(" usd ")` es `true`; `Currency.valid?("XXX")` es `false`; `Currency.valid?(nil)` es `false`. |
| `test "foreign? distingue COP de las demas"` | `foreign?("COP")` false, `foreign?("usd")` true, `foreign?("ZZZ")` false. |
| `test "options devuelve label y value para react-select"` | 3 elementos; el primero es `{label: "COP — Peso colombiano", value: "COP"}`; todas las claves son `:label`/`:value`. |
| `test "find devuelve el simbolo de la moneda"` | `Currency.find("eur")[:symbol] == "€"`; `Currency.find("XXX")` es `nil`. |

### `test/models/exchange_rate_test.rb` — 7 casos

| Test | Aserción |
|---|---|
| `test "es valida con todos los campos"` | `exchange_rates(:usd_habil).valid?`. |
| `test "rechaza moneda fuera del catalogo"` | `currency: "XXX"` ⇒ inválida, error en `:currency`. |
| `test "rechaza source fuera de SOURCES"` | `source: "google"` ⇒ inválida. |
| `test "rechaza rate_to_cop cero o negativa"` | dos aserciones: `0` y `-1` inválidas. |
| `test "rechaza effective_date posterior a rate_date"` | `effective_date = rate_date + 1` ⇒ inválida con el mensaje "no puede ser posterior a la fecha de aplicación". |
| `test "el indice unico impide duplicar moneda y fecha"` | `assert_raises(ActiveRecord::RecordNotUnique) { ExchangeRate.insert!(...) }` con la misma `(currency, rate_date)` — **usar `insert!` para saltar la validación de unicidad y ejercitar el índice de verdad**. |
| `test "stale_for? es true solo cuando rate_date difiere"` | `usd_fin_de_semana.stale_for?(Date.new(2026,7,18))` es `false` (aplica ese día) y `usd_habil.stale_for?(Date.new(2026,7,18))` es `true`. |

### `test/services/exchange_rate_client_test.rb` — 9 casos (parsers puros, sin red)

| Test | Aserción |
|---|---|
| `test "parse_trm lee valor y vigencias"` | Con el JSON literal `[{"valor":"4120.50",...,"vigenciadesde":"2026-07-17T00:00:00.000","vigenciahasta":"2026-07-19T00:00:00.000"}]` y `upto: 2026-07-18`: `rate == BigDecimal("4120.5")`, `effective_date == 2026-07-17`, y `rate.is_a?(BigDecimal)`. |
| `test "parse_trm devuelve nil con arreglo vacio"` | `parse_trm("[]", upto:)` es `nil`. |
| `test "parse_trm devuelve nil con JSON invalido"` | `parse_trm("<html>503</html>", upto:)` es `nil`, sin excepción. |
| `test "parse_trm devuelve nil si la vigencia es futura"` | `vigenciadesde` posterior a `upto` ⇒ `nil`. |
| `test "parse_trm devuelve nil si excede LOOKBACK_DAYS"` | `vigenciadesde` 40 días antes ⇒ `nil`. |
| `test "parse_ecb_csv toma la ultima observacion no vacia"` | CSV con 3 filas (una con `OBS_VALUE` vacío): devuelve la de `TIME_PERIOD` mayor con valor; `effective_date` correcto. |
| `test "parse_ecb_csv ubica columnas por nombre y no por posicion"` | Mismo CSV con las columnas en otro orden ⇒ mismo resultado. |
| `test "parse_ecb_csv ignora observaciones posteriores a upto"` | CSV con una fila del día siguiente ⇒ se ignora. |
| `test "parse_ecb_csv devuelve nil con cuerpo vacio o basura"` | `""` y `"no soy csv\x00"` ⇒ `nil`, sin excepción. |

### `test/services/exchange_rate_service_test.rb` — 16 casos

| Test | Aserción |
|---|---|
| `test "COP devuelve 1.0 sin tocar base ni red"` | `rate_to_cop == BigDecimal("1")`, `source == "identity"`; `fetch_remote` stubeado con `flunk` **no se invoca**; `assert_no_difference("ExchangeRate.count")`. |
| `test "moneda invalida devuelve Result de error"` | `ok?` false, `errors` es un **Array** y su primer elemento menciona la moneda; `fetch_remote` no se invoca. |
| `test "fecha invalida devuelve Result de error"` | `date: "no-es-fecha"` ⇒ `ok?` false, sin excepción. |
| `test "fecha futura devuelve Result de error"` | `date: Date.current + 5` ⇒ `ok?` false, `errors.first` dice "futura"; `fetch_remote` no se invoca. |
| `test "hit de cache no consulta la fuente"` | Con `exchange_rates(:usd_habil)` y `date: 2026-07-17`: `cached == true`, `rate_to_cop == 4120.5`, `fetch_remote` no se invoca, `assert_no_difference("ExchangeRate.count")`. |
| `test "miss persiste la tasa y la devuelve"` | `fetch_remote` stubeado con TRM del 2026-08-03: `ok?`, `cached == false`, `assert_difference("ExchangeRate.count", 1)`, la fila tiene `source == "trm_oficial"` y `fetched_at` presente. |
| `test "fin de semana usa el habil anterior y lo reporta"` | Stub devuelve `effective_date 2026-08-07 (vie)`, `valid_until 2026-08-09 (dom)`; se pide `2026-08-08`: `rate_date == 2026-08-07`, `stale == true`, `requested_date == 2026-08-08`. |
| `test "el rango de vigencia se persiste dia por dia"` | Mismo caso: `assert_difference("ExchangeRate.count", 3)` (vie, sáb, dom) y las tres filas comparten `effective_date` y `rate_to_cop`. |
| `test "segunda consulta del domingo sale de cache"` | Tras el test anterior, una segunda llamada con `fetch_remote` stubeado con `flunk` devuelve `cached == true` **sin invocarlo**. **Este es el test que justifica D1.** |
| `test "EUR cruza BCE con TRM en la direccion correcta"` | `fetch_remote` se deja pasar y se stubean los métodos de `ExchangeRateClient` (TRM 4000, `ecb_units_per_eur("USD").rate = 1.10` USD por EUR; `"EUR"` no se consulta). Resultado `rate_to_cop == BigDecimal("4400.0")` y `source == "bce"`. |
| `test "EUR con TRM caida devuelve error y no persiste"` | `fetch_remote` devuelve `Result` con `ok?` false ⇒ `ok?` false; `assert_no_difference("ExchangeRate.count")`. |
| `test "timeout de la fuente devuelve Result no excepcion"` | `fetch_remote` devuelve `Result` fallido (el cliente ya rescató): `ok?` false, `errors == ["No se pudo obtener la tasa para USD del 2026-08-20. Ingrésela manualmente"]`. |
| `test "fuente caida cae a la tasa cacheada mas reciente dentro de la ventana"` | Con `usd_vieja` (2026-07-01) y `date: 2026-07-05`, `fetch_remote` fallido: `ok?` true, `cached` true, `stale` true, `rate_date == 2026-07-01`. |
| `test "fuente caida sin nada dentro de la ventana falla"` | `date: 2026-09-30` (a más de `MAX_STALE_DAYS` de `usd_vieja`): `ok?` false. |
| `test "dos hilos que resuelven la misma moneda y fecha dejan una sola fila"` | Dos `Thread` con `ActiveRecord::Base.connection_pool.with_connection`, ambos bajo el mismo stub de `fetch_remote`; ambos `ok?`; `ExchangeRate.where(currency: "USD", rate_date: d).count == 1`; **y ninguno levanta `PG::InFailedSqlTransaction`** (es el test del savepoint). |
| `test "record_manual pisa la tasa automatica de esa fecha"` | Sobre `usd_habil`: `record_manual` con 4200 ⇒ la fila queda en `4200` con `source == "manual"`, `ExchangeRate.count` sin cambio. |

### `test/models/report_expense_currency_test.rb` — 14 casos

Todos dentro de `as_user(users(:admin))`.

| Test | Aserción |
|---|---|
| `test "por defecto la moneda es COP"` | Un gasto creado sin `currency` queda en `"COP"`. |
| `test "la moneda se normaliza a mayusculas"` | `currency: " usd "` ⇒ `"USD"` guardado. |
| `test "rechaza moneda fuera del catalogo"` | `currency: "ARS"` ⇒ inválido, error en `:currency`. |
| `test "to_cop redondea a dos decimales y devuelve float"` | `ReportExpense.to_cop(BigDecimal("120"), BigDecimal("4120.5")) == 494460.0` y `.is_a?(Float)`. |
| `test "to_cop redondea medio centavo hacia arriba"` | `to_cop(BigDecimal("1"), BigDecimal("0.005")) == 0.01`. |
| `test "to_cop con nil devuelve nil"` | dos aserciones (`amount` nil, `rate` nil). |
| `test "convierte los tres montos a COP al guardar"` | USD, `foreign_value 120`, `foreign_tax 22.80`, `exchange_rate 4120.5` ⇒ `invoice_value 494460.0`, `invoice_tax 93947.4`, `invoice_total 588407.4`. |
| `test "foreign_total se completa con value mas tax"` | `foreign_total` no enviado ⇒ queda en `142.80`. |
| `test "invoice_total no se aleja mas de un centavo de la suma de los COP"` | `assert_in_delta invoice_value + invoice_tax, invoice_total, 0.01` (decisión asumida 5). |
| `test "el servidor pisa los COP que manda el cliente"` | Se crea con `invoice_value: 1` y sin `cop_manual_override` ⇒ queda `494460.0`. |
| `test "cop_manual_override respeta los COP y marca la fuente manual"` | `cop_manual_override: "1"`, `invoice_value: 500000` ⇒ queda `500000.0` y `exchange_rate_source == "manual"`. |
| `test "pasar a COP limpia los campos extranjeros"` | Gasto en USD editado a `currency: "COP"` ⇒ los 6 campos quedan `nil` y los COP intactos. |
| `test "moneda extranjera sin foreign_value es invalida"` | error en `:foreign_value` con el mensaje "es obligatorio cuando la moneda no es COP". |
| `test "moneda extranjera sin exchange_rate es invalida"` | error en `:exchange_rate`. |

Caso borde adicional dentro del mismo archivo:
`test "exchange_rate_date se completa con invoice_date"` ⇒ al no enviarlo, queda igual a
`invoice_date`.

### `test/models/report_expense_import_currency_test.rb` — 4 casos

Archivo de ejemplo en `test/fixtures/files/gastos_multimoneda.xlsx`. `test/fixtures/files/**` es del
**paquete 01** (§7.2) y ese archivo **ya está en el inventario canónico de §7.12** (18 columnas,
filas en USD y EUR, y una con `invoice_value` diligenciado para disparar `cop_manual_override`):
este paquete **solo lo consume**, no lo crea ni lo genera con `Tempfile`. ⚠️ El comportamiento que
estos 4 casos afirman lo implementa `ReportExpense.import`, **cuyo dueño único es el paquete 06**
(Tarea 17 y §7.2); el 06 se mergea **después** de este, así que estos tests se escriben aquí como
**contrato** y se corren en verde recién con el 06 mergeado. Si al correrlos antes fallan, no es un
defecto de este paquete: es la señal de que el 06 aún no está.

| Test | Aserción |
|---|---|
| `test "importa moneda valor extranjero y TRM"` | El gasto importado tiene `currency "USD"`, `foreign_value 120.0`, `exchange_rate 4120.5`. |
| `test "una fila sin moneda queda en COP"` | `currency == "COP"` y `foreign_value` `nil`. |
| `test "si el excel trae el valor en pesos se respeta"` | Fila con COP y extranjero: `invoice_value` es el del Excel, `exchange_rate_source == "manual"`. |
| `test "si el excel no trae el valor en pesos se calcula"` | Columna 16 vacía ⇒ `invoice_value == foreign_value * exchange_rate`. |

### `test/helpers/application_helper_currency_test.rb` — 3 casos

`include ApplicationHelper` en la clase de test.

| Test | Aserción |
|---|---|
| `test "recalculate_cost_center suma los pesos y no la moneda extranjera"` | Un gasto COP de 100000 + uno USD de 120 @ 4120.5 en el mismo centro ⇒ `cost_center.reload.viat_costo_real == 100000.0 + 494460.0` (más `reports.sum(:viatic_value)`). **Falla si alguien guardó el extranjero en `invoice_value`.** |
| `test "viat_costo_porcentaje usa el valor en pesos"` | Con `viatic_value` 1_000_000 y el gasto USD anterior: `viat_costo_porcentaje == 49.4`. |
| `test "get_show_center suma lo mismo que recalculate_cost_center"` | `@cost_center.report_expenses.sum(:invoice_value)` (línea `cost_centers_controller.rb:211`) coincide con el `viat_costo_real` menos los reportes. Dos verdades del gastado = bug. |

### `test/controllers/exchange_rates_controller_test.rb` — 8 casos

`include Devise::Test::IntegrationHelpers` (lo agrega el paquete 01).

| Test | Aserción |
|---|---|
| `test "sin autenticar redirige al login"` | `get get_exchange_rate_path...` sin `sign_in` ⇒ `assert_redirected_to new_user_session_path`. |
| `test "COP responde 1.0 sin consultar"` | `type == "success"`, `rate_to_cop == "1.0"`, `source == "identity"`. |
| `test "devuelve la forma exacta del contrato E.1"` | Con `ExchangeRateService.stub(:fetch, ok_result)`: el JSON tiene **exactamente** las claves `type, currency, rate_date, requested_date, rate_to_cop, source, cached, stale`. |
| `test "rate_date puede diferir de requested_date"` | Result *stale*: `rate_date != requested_date` en la respuesta. |
| `test "error de fuente responde 200 con type error"` | `assert_response :success` y `type == "error"`, `message` es un **Array** con el texto de §E.1. |
| `test "moneda faltante responde type error"` | Sin `currency` ⇒ `type == "error"`. |
| `test "moneda no soportada responde type error"` | `currency=ARS` ⇒ `type == "error"`, sin excepción 500. |
| `test "nunca devuelve una tasa inventada cuando falla"` | En el caso de error, el body **no** contiene la clave `rate_to_cop`. |

### `test/controllers/report_expenses_currency_test.rb`

> **RETIRADO por auditoría.** Dueño único: paquete 07 (dueño de
> `report_expenses_controller.rb` y de sus strong params, §7.2). El test obligatorio de
> `cop_manual_override` por `POST` es suyo (corrección 4). La cobertura de la conversión y de la
> limpieza al volver a COP se conserva a nivel de modelo en
> `test/models/report_expense_currency_test.rb`.

### `test/integration/exchange_rates_get_tool_test.rb`

> **RETIRADO por auditoría.** Dueño único: paquete 11 (dueño de `app/tools/**`, §7.2/§7.7).

**Total: 66 casos Minitest en 8 archivos.**

---

## Pruebas E2E (Playwright)

> **RETIRADAS por auditoría (corrección 7).** Los tres specs de este paquete
> (`expense-foreign-currency.spec.js` — E2E-6 — y los escenarios E2E-7 y E2E-8) **se borran**.
> Todos los specs funcionales son del **paquete 12**, que los reúne en `currency.spec.js` (§7.2).
> Este paquete **no crea ni toca `test/e2e/`**.
>
> Lo único que este paquete debe garantizar es que **el backend responda**: `GET
> /get_exchange_rate` con el contrato §E.1, y una fila de `exchange_rates` sembrable para que el
> E2E del 12 no dependa de datos.gov.co. La siembra vive en `db/seeds/e2e.rb`, que es del
> **paquete 01**; el stub de red del E2E vive en `config/initializers/e2e_stubs.rb`, que es del
> **paquete 12** y hace `prepend` sobre `ExchangeRateService.fetch_remote` (§6.7).

---

## Criterios de aceptación

Marcables con sí/no, sin opinión. **La numeración no cambia**: los criterios que la auditoría
retiró conservan su número y quedan marcados, porque otros documentos los citan.

**Datos** — los criterios 1–4 pasan a ser **precondición**, no entregable: los produce el
paquete 02 (§7.2). Este paquete los **verifica antes de arrancar** con el `raise` del punto 1 del
bloque de correcciones, y si fallan **no empieza**.

1. *(Precondición, la cumple el 02)* `db/schema.rb` muestra las 7 columnas nuevas en
   `report_expenses` y la tabla `exchange_rates` con `effective_date`.
2. *(Precondición, la cumple el 02)* El índice `index_report_expenses_on_foreign_currency` existe
   y es **parcial** (`WHERE currency <> 'COP'`).
3. *(Precondición, la cumple el 02)* El índice `index_exchange_rates_on_currency_and_rate_date`
   existe y es **único**.
4. *(Precondición, la cumple el 02)* `SELECT COUNT(*) FROM report_expenses WHERE currency <> 'COP'`
   devuelve **0** inmediatamente después de migrar (ningún `UPDATE` histórico, §2.5).
5. Los bloques `# == Schema Information` de `report_expense.rb`, `exchange_rate.rb` y de
   `exchange_rates.yml` están regenerados con `annotate`. (El de
   `report_expense_serializer.rb` **ya no es de este paquete**: el archivo es del 07.)

**Servicio**

6. `ExchangeRateService.fetch(currency: "COP", date: Date.current)` devuelve `1.0`, `source
   "identity"`, **sin** ninguna consulta a `exchange_rates` ni a la red.
7. Un *hit* de caché no invoca `fetch_remote` (verificable con el stub que hace `flunk`).
8. Con la fuente caída y sin nada cacheado, `fetch` devuelve `Result#ok? == false` con
   `errors` **Array** no vacío, y **no levanta ninguna excepción**.
9. Con la fuente caída y una tasa cacheada dentro de 10 días, devuelve esa tasa con `stale == true`
   y `rate_date` distinto de `requested_date`.
10. Pedir dos veces la tasa de un domingo produce **una sola** llamada a la fuente.
11. Ningún método del servicio referencia `User.current`, `current_user` ni `session`
    (`grep -n "User.current\|current_user" app/services/` no devuelve nada).
12. `grep -n "retry\|rescue => e" app/services/exchange_rate_client.rb` no muestra reintentos ni
    rescates genéricos: solo la lista explícita de excepciones.
12b. **Contrato canónico (corrección 6):** `ExchangeRateService::Result.members == [:ok, :value,
    :errors]`, responde `ok?`/`error?`, `ExchangeRateService.respond_to?(:fetch_remote)` es `true`
    y `grep -n "client:" app/services/exchange_rate_service.rb` **no devuelve nada** (la inyección
    por parámetro quedó eliminada, y el 12 le hace `prepend` a ese nombre exacto).

**Modelo**

13. Un gasto en USD con `foreign_value 120` y `exchange_rate 4120.5` queda con
    `invoice_value == 494460.0`.
14. `invoice_value`, `invoice_tax` e `invoice_total` de **todos** los gastos siguen siendo `float`
    y siempre en COP.
15. Enviar `invoice_value` distinto del calculado sin `cop_manual_override` no cambia el resultado
    (el servidor pisa).
16. Con `cop_manual_override`, el valor enviado se respeta y `exchange_rate_source == "manual"`.
17. Cambiar la moneda a COP deja los 6 campos de moneda extranjera en `NULL`.
18. `ReportExpense.search` tiene la **misma firma** que antes de este paquete
    (`git diff` sobre el método está vacío).
19. `create_edit_register`, `create_create_register` y `create_destroy_register` están sin cambios
    (encabezado y umbral `> 59` intactos).

**Contratos**

20. `GET /get_exchange_rate?currency=USD&date=<hábil>` devuelve las 8 claves de §E.1 + `stale`, con
    HTTP 200.
21. El mismo endpoint sin autenticar redirige al login.
22. En el caso de error, la respuesta **no** trae `rate_to_cop` y `message` es un **Array**
    (viene de `result.errors`).
23. ~~`POST /report_expenses` con `budget_status` o `accounting_approved` en el body no los
    graba.~~ **RETIRADO por auditoría** — lo verifica el **paquete 07**, dueño de los strong
    params (corrección 4, §7.2).
24. ~~`ReportExpenseSerializer` emite los 7 campos de moneda en cada fila.~~ **RETIRADO por
    auditoría (cierre)** — `app/serializers/report_expense_serializer.rb` tiene **dueño único 07**
    (§7.2). Aquí queda solo el **test de contrato** sobre el JSON de `GET /get_report_expenses`,
    que corre en verde con el 07 mergeado.

**Excel y MCP**

25. ~~El Excel de gastos tiene 18 columnas y las posiciones 14/15/16 son `Moneda`, `Valor
    extranjero`, `TRM`.~~ **RETIRADO por auditoría (cierre)** — es criterio del **paquete 06**,
    dueño único de las dos plantillas, que se mergea **después** de este (orden `04 → 05 → 06 →
    10`). Cuando este paquete corre, la plantilla todavía tiene 12 columnas y eso es lo esperado.
    Este paquete solo entrega el contrato de las columnas 14–16 (Tarea 16).
26. ~~Importar el Excel exportado reproduce moneda, valor extranjero y TRM del original.~~
    **RETIRADO por auditoría (cierre)** — `ReportExpense.import` es del **06** (Tarea 17, §7.2).
    Los 4 casos de `report_expense_import_currency_test.rb` se conservan aquí como contrato y los
    verifica el 06.
27. ~~`tools/list` del MCP incluye `exchange_rates_get`.~~ **RETIRADO por auditoría** — lo
    verifica el **paquete 11** (corrección 5, §7.7).
28. ~~`records_search` con `{"entity":"exchange_rates"}` responde.~~ **RETIRADO por auditoría** —
    el registro en `records_search_tool.rb` lo hace y lo verifica el **paquete 11**.
29. `report_expenses_get` de un gasto en USD devuelve los 7 campos nuevos, y
    `ReportExpensesListTool::KEYS.size == 28` con `KEYS.uniq == KEYS` (§7.7).

**Pruebas**

30. `bin/rails test` termina con **0 failures y 0 errors**, incluyendo los 66 casos nuevos.
31. `bin/rails test` corre **sin conexión a internet** (desconectar la red y volver a correr).
32. ~~El E2E-6 pasa contra el servidor local.~~ **RETIRADO por auditoría** — los specs
    funcionales son del **paquete 12** (`currency.spec.js`, corrección 7).

---

## Riesgos y trampas

**T1 — Guardar el valor extranjero en `invoice_value`.** Es el único error que corrompe datos en
silencio y a escala: `recalculate_cost_center` (`application_helper.rb:585`) actualiza 23 columnas
de `cost_centers` de una, y un `viat_costo_real` mal calculado se propaga a `aiu`, `aiu_percent`,
`aiu_real` y `aiu_percent_real`. No hay validación que lo detecte; el test del criterio 13 y el de
`test/helpers/` son la única red.

**T2 — Invertir la dirección de la serie del BCE.** `EXR D.USD.EUR.SP00.A` son **USD por 1 EUR**.
Si se interpreta al revés, EUR queda a ~3.700 COP en vez de ~4.500 y nadie lo nota hasta el cierre.
La fórmula correcta es `COP_por_X = (USD_por_EUR / X_por_EUR) × TRM`, y para EUR se reduce a
`USD_por_EUR × TRM`.

**T3 — `float` en la aritmética.** `120 * 4120.5` en `Float` da `494459.99999999994`. Toda la
conversión se hace en `BigDecimal` y solo el último paso hace `.round(2).to_f`. Prohibido
`to_f` antes del `round`. En el cliente HTTP, `BigDecimal(str)`, nunca `str.to_f`.

**T4 — `BigDecimal#to_s` es científico.** `BigDecimal("4120.5").to_s` ⇒ `"0.41205e4"`. En JSON no
se nota (ActiveSupport lo formatea bien: verificado, sale `"4120.5"`), pero **sí** se nota al
interpolar en un mensaje de error o en la tool MCP. Usar `.to_s("F")` en todo string.

**T5 — Transacción envenenada por `RecordNotUnique`.** En PostgreSQL, rescatar un error de índice
único dentro de una transacción **sin savepoint** deja la transacción abortada y todo lo que sigue
falla con `PG::InFailedSqlTransaction`. Cada `create!` de `exchange_rates` va en
`transaction(requires_new: true)`.

**T6 — HTTP dentro de la transacción del gasto.** §2.7 y §4.2 son explícitos: la evaluación
presupuestal corre en una transacción con `CostCenter.lock`, el pool de AR es 5 y Puma tiene 5
hilos. Si `ExchangeRateService` se llama desde ahí adentro, una caída de datos.gov.co con timeout
de 5 s bloquea el pool completo. **La tasa se resuelve en el controller/frontend, antes de abrir
la transacción**, y llega al modelo ya como número.

**T7 — La zona horaria del servidor es UTC.** No hay `config.time_zone` en `config/application.rb`
⇒ Rails usa UTC. En Bogotá (UTC-5), a las 19:05 hora local `Date.today` en el servidor ya es
**mañana**, y pedir la TRM de "hoy" caería en la validación de fecha futura. Por eso
`ExchangeRateService.today` usa `Time.find_zone("America/Bogota").today`. No sustituirlo por
`Date.current`.

**T8 — Socrata estrangula peticiones anónimas.** Sin `$$app_token`, datos.gov.co responde **429**
bajo carga y el cliente devuelve `nil` ⇒ todo gasto en USD pide captura manual. Verificar el
`response.code` antes de parsear y configurar `DATOS_GOV_APP_TOKEN` antes de salir a producción.

**T9 — El dataset puede moverse.** El id `32sa-8pi3` está vigente hoy, pero es un dato de un portal
público. Está detrás de `TRM_API_URL` justamente para poder cambiarlo sin desplegar. Verificarlo
con `curl` antes de escribir el cliente y otra vez antes de desplegar.

> **T10, T11 y T12 ya no son riesgos de este paquete** (es solo backend tras la auditoría): se
> conservan como **traspaso al paquete 08** (formularios) y al **09** (`this.columns`), que son sus
> dueños. Este paquete no toca JSX.

**T10 — El formulario está duplicado.** *(riesgo del 08.)*
`components/ReportExpense/FormCreate.jsx` y el `renderModal()` de `packs/ReportExpenseIndex.js` no
comparten una línea (§4.5, §6.10). Implementar solo uno deja la mitad de los usuarios sin poder
registrar en moneda extranjera. `components/ReportExpense/Index.jsx`, `FormFilter.jsx` y
`FormImportFile.jsx` son **código muerto**: modificarlos no tiene ningún efecto.

**T11 — `this.columns` fuera del constructor.** *(riesgo del 09.)* `CmDataTable` congela
`visibleColumns` en su propio constructor y no lo resincroniza: la columna "Moneda" definida
después del mount **nunca se pinta** y el bug se ve como "el backend no manda el campo".

**T12 — `data-testid` en `react-select`.** *(riesgo del 08.)* El componente no reenvía atributos
arbitrarios al DOM: hay que envolverlo en un `<div data-testid=...>`. Y como usa
`menuPortalTarget: document.body`, las opciones viven **fuera** del modal: un `modal.getByText()`
nunca las encuentra. Los nombres canónicos son los de §7.6 (`expense-currency-select`,
`expense-foreign-value`, `expense-rate`, …); `expense-exchange-rate`,
`expense-exchange-rate-hint` e `expense-invoice-value` quedan **derogados**.

**T13 — Conflictos de merge con los otros paquetes.** Dos archivos compartidos siguen en riesgo
para este paquete: `ReportExpenseSerializer` (con 04 y 06) y `ReportExpensesListTool::KEYS` (con 11
y 06, orden fijado en §7.7). `report_expense_params_*` pasó al **07** y
`download_file.xlsx.axlsx` al **06**: ya no se tocan aquí. Resolver a mano, sin borrar claves
ajenas, y correr `bin/rails test` completo después de cada rebase.

**T14 — `maintain_test_schema!` y `fixtures :all`.** Después de cada migración,
`RAILS_ENV=test bin/rails db:test:prepare` o la suite entera aborta con `exit 1`. Y una fixture
nueva mal formada tumba **todos** los tests, no solo los propios: correr `bin/rails test
test/models` completo antes de mergear `exchange_rates.yml` (§5.4).

**T15 — La columna `ID` del Excel cambia la semántica del import.** No es de este paquete, pero si
otro pone `header[0] = "id"`, `ReportExpense.import` deja de ser "solo crear" y pasa a pisar gastos
existentes por id. Dejarlo escrito en el PR.

---

## Objeciones a la auditoría

Ninguna corrección del bloque 🔴 se revoca. Los **tres puntos ambiguos** que quedaron abiertos
fueron cerrados por la reauditoría; se conservan aquí con su resolución para dejar el rastro:

1. ✅ **§7.2 vs §7.7 — `ReportExpensesListTool::KEYS` (Tarea 19). CERRADO a favor de §7.7.** §7.2
   asignaba **todo** `app/tools/*` al **11** mientras §7.7 asignaba las claves 20–26 a este
   paquete. La fila de §7.2 quedó reescrita: *"dueño 11; única excepción, la de §7.7: el 05 agrega
   las claves 20–26 y el 06 las 27–28 de `ReportExpensesListTool::KEYS`, nada más"*. La Tarea 19
   **se conserva acotada al list tool**. 🔴 **Pero `app/tools/report_expenses_create_tool.rb` SALIÓ
   de este paquete**: la excepción de §7.7 nunca lo cubrió, y el 11 (su Tarea 7) mandaba agregar
   exactamente los mismos 6 campos. Su bullet y su fila de "A modificar" están retirados.
2. ✅ **`test/fixtures/exchange_rates.yml`. CERRADO a favor de este paquete.** §7.2 ya no tiene la
   fila general `test/fixtures/*.yml → 01`: enumera los **8** archivos del 01 y agrega una fila
   propia `test/fixtures/exchange_rates.yml → 05` (y otra para `expense_budgets.yml → 04`), con la
   razón técnica del diferimiento. Debe incluir `effective_date` (§1.5).
3. ✅ **`test/fixtures/files/gastos_multimoneda.xlsx`. CERRADO: entra al inventario del 01.** Está
   agregado a §7.12 junto con `gastos_legacy_11col.xlsx` y `gastos_v2_18col.xlsx` (que necesita el
   06), con dueño **01** y contenido especificado: 18 columnas, filas en USD y EUR y una con
   `invoice_value` diligenciado para disparar `cop_manual_override`. **La instrucción de generarlo
   con `Tempfile` dentro del test queda derogada**: el archivo se commitea y este paquete solo lo
   consume.

**Archivos que §7.2 asigna a este paquete: los cuatro están cubiertos** —
`app/services/exchange_rate_service.rb` (Tarea 7), `app/services/exchange_rate_client.rb`
(Tarea 6), `app/models/currency.rb` (Tarea 3) y `app/models/exchange_rate.rb` (Tarea 4). **No hay
faltantes.**
