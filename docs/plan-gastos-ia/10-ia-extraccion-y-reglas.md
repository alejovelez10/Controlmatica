# Paquete 10 — IA: extraccion de comprobantes y motor de reglas de negocio

## 🔴 CORRECCIONES DE AUDITORÍA (vinculantes — leer ANTES que el resto del documento)

> Estas correcciones **mandan sobre cualquier texto de este archivo** que las contradiga.
> Consolidadas en `00-ARQUITECTURA.md` §7.

1. 🔴 **`test/fixtures/parameterizations.yml` usa `user_id`, no `user`.** El documento lo dejaba
   como duda (*"si `user:` da problemas de carga se usa `user_id`"*). No es una duda: verificado
   contra el repo, **`app/models/parameterization.rb` NO declara `belongs_to :user`** (solo tiene
   scopes y `self.search`), así que la forma de asociación hace que Rails intente insertar una
   columna `user` inexistente y lance `Fixture::FixtureError`. Con `fixtures :all` eso **tumba
   TODA la suite**, no solo los tests de este paquete. Forma definitiva, sin condicional:
   ```yaml
   user_id: <%= ActiveRecord::FixtureSet.identify(:admin) %>
   ```
   La fixture **la crea el paquete 01** (dueño único de `test/fixtures/`, §7.2) y la aserción se
   agrega a su test guardián `fixtures_integrity_test.rb`.
2. 🔴 **Seam de red canónico: `self.call_vision_model(payload)`** (§6.7, §7.2). El seam de atributo
   de clase **`ReceiptExtractionService.api_client=` se elimina** y se reemplaza por ese método
   público de clase, que es el único que abre un socket. Motivo: el initializer de stubs del
   paquete 12 (`config/initializers/e2e_stubs.rb`) hace `prepend` sobre ese nombre exacto, y con
   dos mecanismos distintos para lo mismo no se puede escribir. El doble se inyecta con
   `ReceiptExtractionService.stub(:call_vision_model, ...)`; sigue sin haber gemas nuevas.
3. **La Tarea 11 NO modifica `test/test_helper.rb`.** Dueño único: **paquete 01**, que autocarga
   `test/support/**/*.rb` con un `Dir[].each { require }` (§7.2). Se eliminan el
   `require_relative "support/fake_anthropic_client"` (redundante y causa doble carga) y el helper
   dentro de `ActiveSupport::TestCase`. **`with_fake_extractor` vive dentro del propio archivo de
   `test/support/`**, como módulo que el test incluye.
4. 🔴 **Se elimina la obligación de `RECEIPT_EXTRACTION_ENABLED: 'false'` en el `webServer.env` de
   `playwright.config.js`.** Contradecía al paquete 12, que escribe `ai-capture.spec.js` con 3
   tests que **sí** ejercitan la extracción a través del stub de `call_vision_model`. Decisión:
   **gana el stub del 12** (prueba más y no gasta tokens). `RECEIPT_EXTRACTION_ENABLED` se
   conserva como **kill switch de producción** (§7.9), no como mecanismo de test. Este paquete
   tampoco toca `playwright.config.js`: es del **paquete 01**.
5. 🔴 **Test y criterio nuevos: el timeout duro de 20 s del endpoint.** La arquitectura §D.1 lo
   exige y ninguno de los 34 criterios ni de los 19 tests lo verificaba. Agregar a
   `test/controllers/report_expenses_extract_receipt_test.rb` (🔴 **nombre corregido en el cierre de
   la reauditoría**: esta corrección citaba `report_expenses_extract_test.rb`, el nombre corto, que
   no aparece en ninguna otra parte; el canónico es el largo, que usan las 3 menciones del cuerpo,
   la tabla de archivos, §7.2 y el paquete 07):
   > `test_extract_receipt_responde_error_estandar_cuando_el_modelo_se_pasa_del_timeout` — inyectar
   > un doble de `call_vision_model` que lance la excepción de timeout del SDK (o que duerma), y
   > afirmar que el endpoint responde **HTTP 200** con `type: "error"` y el mensaje
   > `"No se pudo leer el comprobante. Complete los datos manualmente"`, **en menos de 20 s**.
   Criterio de aceptación correspondiente. Se mantiene la prohibición de `Timeout.timeout` (tu
   Riesgo 1): el corte lo hace el `timeout: 18` del cliente del SDK.
6. **Entregables de documentación**: el manual de usuario y la guía de configuración de reglas de
   negocio (propuesta §5.3) **NO son de este paquete**; son del **paquete 13** (§7.11). Este
   paquete solo garantiza que los parámetros de `parameterizations` estén documentados en el
   código (nombres exactos, sentinela `(NINGUNO)`, límite de `money_value` integer) para que el 13
   los pueda escribir sin leer el código.
7. **Numeración canónica (§7.1)**: "Paquete 0"/"Paquete 00" = **01**. Este paquete depende de
   **01**, **02**, **03** y **05** (`ExchangeRateService`, para convertir moneda en el borrador).
8. 🔴 **El guard de reglas debe existir TAMBIÉN en el camino MCP.** Tu Riesgo 6 lo identifica
   correctamente ("abrir un issue bloqueante contra el paquete MCP") y **ya está resuelto**: el
   paquete 11 (Tarea 8) llama a `ExpenseRuleService.validate` antes del save y rechaza si hay una
   violación con `blocking: true` (§7.5). `ExpenseRuleService` entra en la tabla de dependencias
   de **código** del 11, no solo en la de la tool `expense_rules_validate`.
9. **`test/fixtures/accion_modules_rols.yml` NO existe y no se crea**: corregir la tabla de
   dependencias para que diga **`rols.yml`** (HABTM inline, decisión del paquete 01).
10. **`test/fixtures/files/`**: los crea el **paquete 01** con el inventario consolidado (§7.12).
    Este paquete solo declara "ya existen": `comprobante_factura.pdf`, `comprobante_factura.jpg`,
    `comprobante_ilegible.png`, `comprobante_iphone.heic`.
11. **Precondición escrita, no bifurcación**: la Tarea 1 decía *"verificar la firma real de
    `Anthropic::Client.new`… si algo del pseudocódigo no existe con ese nombre, se usa el nombre
    real"*. Eso se resuelve **antes** de arrancar el paquete: se verifica la firma contra el SDK
    instalado y **se escribe el resultado en el PR**, no se decide a mitad de la implementación.

> Documento de trabajo para un agente autonomo. Lectura previa obligatoria:
> `docs/plan-gastos-ia/00-ARQUITECTURA.md` (§3 Bloque D, §4.1 y §4.2 convenciones de servicios,
> §5 estrategia de pruebas, §6.6 background jobs, §6.7 gemas de test, §6.8 reglas de negocio).
> Las desviaciones estan en la seccion **Discrepancias con la arquitectura** al final; ninguna se
> resuelve en silencio.
>
> Este paquete **no crea migraciones, no crea modelos ActiveRecord, no crea tools MCP y no toca
> React**. Crea dos servicios, un endpoint, una rake task de configuracion y sus pruebas.

---

## Objetivo

Dejar funcionando el nucleo de IA compartido por los dos canales (WhatsApp y formulario web):
un `ReceiptExtractionService` que recibe una imagen o un PDF y devuelve los campos estructurados
del comprobante con confianza por campo, un `ExpenseRuleService` que evalua las cinco reglas de
negocio de la propuesta §4.4 con parametros configurables desde la pantalla de Parametrizaciones
(sin desarrollo nuevo), y el endpoint `POST /extract_receipt/report_expenses` que orquesta
extraer -> convertir moneda -> evaluar reglas -> devolver el borrador con advertencias, **sin
guardar nunca**. Ademas, el guard de servidor que impide que un gasto con violacion bloqueante
entre por `POST/PATCH /report_expenses`.

---

## Dependencias

| Necesito de | Que exactamente | Por que bloquea |
|---|---|---|
| **Paquete 01 — infraestructura de pruebas** | `bin/rails test` en 0 failures / 0 errors, `Devise::Test::IntegrationHelpers` en `test_helper.rb`, helper `as_user`, autocarga de `test/support/**/*.rb`, fixtures sanas de `users`, `rols` (con el HABTM inline), `module_controls`, `accion_modules`, `cost_centers`, `report_expenses` y **`parameterizations.yml` con las filas de reglas**, mas el inventario completo de `test/fixtures/files/` (§7.12) | Sin eso no se puede escribir ni correr una sola prueba de este paquete, y `test/fixtures/files/` hoy solo tiene `.keep`. **`test/fixtures/accion_modules_rols.yml` no existe y no se crea** (correccion 9) |
| **Paquete 02 — migraciones y esquema** | Migracion `20260403000001` (`currency`, `foreign_value`, `foreign_tax`, `foreign_total`, `exchange_rate`, `exchange_rate_date`, `exchange_rate_source`) y el indice `index_report_expenses_on_invoice_number_and_identification` | La regla de duplicados consulta por `(invoice_number, identification)` y el endpoint devuelve los campos de moneda. Sin el indice la regla hace seq-scan sobre toda la tabla de gastos en cada captura |
| **Paquete 03 — deuda tecnica bloqueante** | `ReportExpense.search` + `SEARCH_KEYS` ya refactorizados y el concern de auditoria estabilizado | Orden de olas §7.3: el 10 va en la ola 3, despues de 02 y 03. Si el 03 se mergea despues, los golden de auditoria y los call sites de `search` cambian bajo los tests de este paquete |
| **Paquete 05 — Multimoneda y TRM** | `app/models/currency.rb` con `Currency::CODES` y `Currency.valid?`, y `ExchangeRateService.fetch(currency:, date:)` devolviendo un `Result` con `rate_to_cop`, `rate_date` y `source` | El paso 5 del endpoint (conversion) llama literalmente a ese servicio. **Contrato duro**: `fetch` no lanza excepcion, devuelve `Result` con `ok?` |

**Dependencias canonicas (§7.1): 01, 02, 03 y 05.** Nada mas.

**No dependo de**: presupuesto (04), comprobante y contabilidad (06), permisos nuevos (uso los de
`"Gastos"` que ya existen), frontend, export a Excel. Del 06 solo se hereda la coherencia de
formatos permitidos entre `ReceiptUploader` y la extraccion; la extraccion **no** necesita que el
archivo este guardado: opera sobre el `UploadedFile` en memoria.

**Paquetes que dependen de este:**

| Paquete | Que consume |
|---|---|
| **11 — MCP** | `ExpenseRuleService.validate` para la tool `expense_rules_validate` **y como dependencia de codigo** de `ReportExpensesCreateTool` (Tarea 8 del 11, §7.5) |
| **08 — Frontend: formularios de gasto** | El contrato JSON de `POST /extract_receipt/report_expenses` (§3 Bloque D.1 de la arquitectura), incluido `rule_violations[].blocking`. Los `data-testid` `expense-extract-*` y `expense-rule-violation` son del 08 (§7.6) |
| **12 — E2E** | El stub de `ReceiptExtractionService.call_vision_model` en `config/initializers/e2e_stubs.rb` y los 3 tests de `ai-capture.spec.js` |
| **Agente de WhatsApp** | El mismo endpoint conceptual, via la tool MCP. El agente **no** reimplementa reglas en el prompt |

**Lo que este paquete NO hace, a proposito:**

- No crea `app/tools/expense_rules_validate_tool.rb` ni lo agrega a `McpController::ALWAYS_EXPOSED`
  (paquete 11).
- No crea `ExchangeRateService` ni `Currency` (paquete 05).
- No crea `ReceiptUploader` ni el `mount_uploader` (paquete 06).
- **No crea ni edita fixtures.** `test/fixtures/*.yml` y `test/fixtures/files/**` son del **paquete
  01** (§7.2, §7.12): este paquete solo declara "ya existen".
- **No toca `test/test_helper.rb`** (paquete 01) ni `test/e2e/playwright.config.js` (paquete 01).
- **No escribe el manual de usuario ni `docs/GUIA-REGLAS-NEGOCIO.md`**: son del **paquete 13**
  (§7.11). Este paquete solo deja los nombres de parametro documentados en el codigo.
- No toca `app/javascript/**` ni `app/views/**`.
- No crea migraciones. La configuracion de reglas vive en la tabla `parameterizations` que **ya
  existe** (`db/schema.rb:366-375`).
- No transcribe notas de voz (paquete de WhatsApp).

---

## Archivos

### A crear

| Ruta | Que se hace |
|---|---|
| `app/services/receipt_extraction_service.rb` | Servicio unico que habla con el modelo de vision. `extract(file, context = {})` -> `Result`. Incluye el JSON Schema de salida, el prompt del sistema, el mapeo de errores y el **seam de red canonico `self.call_vision_model(payload)`** (§6.7) |
| `app/services/expense_rule_service.rb` | Motor de reglas. `validate(attrs, exclude_expense_id: nil)` -> `Array<Violation>`. Lee su configuracion de `parameterizations`. Fuente unica de las 5 reglas |
| `lib/tasks/parameterizations_gastos_ia.rake` | Rake task idempotente que siembra las filas de `parameterizations` con los valores por defecto de las reglas. No borra nada |
| `test/support/fake_anthropic_client.rb` | Doble de prueba del modelo de vision. Cero red. Se inyecta con `ReceiptExtractionService.stub(:call_vision_model, ...)`. **Contiene tambien el modulo con `with_fake_extractor`** (no va en `test_helper.rb`). Se autocarga con el `Dir[]` que el 01 pone en `test_helper.rb` |
| `test/services/receipt_extraction_service_test.rb` | Pruebas unitarias del servicio de extraccion |
| `test/services/expense_rule_service_test.rb` | Pruebas unitarias del motor de reglas |
| `test/controllers/report_expenses_extract_receipt_test.rb` | Pruebas de integracion del endpoint D.1 y del guard de `create`/`update` |

**Archivos que este paquete NO crea aunque los use** (dueño unico: paquete 01, §7.2 y §7.12):
`test/fixtures/parameterizations.yml`, `test/fixtures/files/comprobante_factura.pdf`,
`test/fixtures/files/comprobante_factura.jpg`, `test/fixtures/files/comprobante_ilegible.png`,
`test/fixtures/files/comprobante_iphone.heic`. Este paquete solo declara que **ya existen** y
consume sus etiquetas.

### A modificar

| Ruta | Que se hace |
|---|---|
| `Gemfile` | Agregar `gem "anthropic"` (SDK oficial de Ruby) con la version resuelta pineada |
| `Gemfile.lock` | Resultado de `bundle install` |
| `config/routes.rb` | La ruta `post "extract_receipt/report_expenses", to: "report_expenses#extract_receipt"` (bloque de lineas 82-88). **Dueño de la ruta: este paquete** (§7.2 le da fila propia a `extract_receipt` + su ruta). ⚠️ En la ola 3 este bloque lo escriben **tres** paquetes: el **05** (`get_exchange_rate`, en lineas contiguas), el **06** (rutas de contabilidad y comprobante) y este. Conflicto trivial, se resuelve con rebase en el orden 05 → 06 → 10 |
| `app/controllers/report_expenses_controller.rb` | **Dueño del archivo: paquete 07 (§7.2).** Este paquete aporta el **guard de reglas** (`rule_violation_error` al inicio de `create` y `update`) **y escribe la accion `extract_receipt` completa con su helper privado `build_draft`**: §7.2 le da a `extract_receipt` **fila propia con dueño 10**, como excepcion documentada al dueño del archivo (mismo trato que `delete_receipt`/`download_receipt` del 06). Se mergea en la ola 3b y el 07 la recibe escrita en la ola 4. No se reescribe strong params, filtros, orden ni cableado presupuestal |
| `config/application.yml` | Agregar `ANTHROPIC_API_KEY`, `RECEIPT_EXTRACTION_MODEL`, `RECEIPT_EXTRACTION_ENABLED`. **Archivo gitignorado**: se documenta en el PR y en §7.9, no se commitea |

---

## Tareas

Cada tarea es un commit independiente. El orden importa: 1-2 son infraestructura, 3-6 son el motor
de reglas (no necesita red y se puede probar solo), 7-11 la extraccion, 14 el endpoint, 15 el guard.
**Las tareas 12 y 13 quedaron retiradas por la auditoria** (sus artefactos son del paquete 01); sus
numeros se conservan porque otros paquetes citan la numeracion de este documento.

### 1. Instalar el SDK de Anthropic

`bundle add anthropic` y pinear la version resuelta en el `Gemfile` (por ejemplo
`gem "anthropic", "~> 1.0"`). Correr `bundle install` y verificar que `bin/rails runner "puts
Anthropic::Client"` imprime la clase.

**Precondicion escrita, no bifurcacion en tiempo de implementacion (correccion 11).** *Antes* de
arrancar el paquete se verifica la firma real de `Anthropic::Client.new` y de
`client.messages.create` contra el gem instalado (`gem contents anthropic` o
`https://github.com/anthropics/anthropic-sdk-ruby`) y **el resultado se escribe en el PR**: los
nombres exactos de metodo y de parametro que se van a usar. El pseudocodigo de este documento se
ajusta a lo que diga esa verificacion; **no se decide a mitad de la implementacion** ni se inventan
nombres.

### 2. Declarar las variables de entorno

En `config/application.yml` (gitignorado, cargado por figaro) y en Heroku (`heroku config:set`):

| Variable | Valor por defecto si falta | Uso |
|---|---|---|
| `ANTHROPIC_API_KEY` | ninguno | Sin ella, `ReceiptExtractionService` devuelve `error: :not_configured` y **no revienta** |
| `RECEIPT_EXTRACTION_MODEL` | `"claude-opus-5"` | Permite cambiar de modelo sin desplegar codigo |
| `RECEIPT_EXTRACTION_ENABLED` | `"true"` | Kill switch. Con `"false"` el endpoint responde el error estandar de "complete los datos manualmente" sin gastar tokens |

En el PR se documenta que estas tres variables hay que sembrarlas en Heroku **antes** del deploy.

### 3. Crear `ExpenseRuleService` — esqueleto y contrato

`app/services/expense_rule_service.rb`, clase plana sin namespace, convencion §4.2:

```ruby
class ExpenseRuleService
  Violation = Struct.new(:rule, :message, :blocking, keyword_init: true) do
    def to_h = { rule: rule, message: message, blocking: blocking }
  end

  RULES = %w[antiguedad concepto_no_permitido duplicado tope_valor coherencia].freeze

  DEFAULTS = {
    "antiguedad"            => 30,        # dias
    "tope_valor"            => 2_000_000, # COP
    "coherencia"            => 5,         # % de tolerancia
    "ventana_duplicados"    => 365        # dias hacia atras
  }.freeze

  DEFAULT_BLOCKING = {
    "antiguedad"            => false,
    "concepto_no_permitido" => true,
    "duplicado"             => true,
    "tope_valor"            => true,
    "coherencia"            => false
  }.freeze

  DEFAULT_CONCEPTS = %w[LICOR LICORES AGUARDIENTE WHISKY RON CERVEZA VINO TRAGO CIGARRILLO].freeze

  def self.validate(attrs, exclude_expense_id: nil) = new(attrs, exclude_expense_id).call
  def self.blocking?(violations) = violations.any? { |v| v.blocking }
  def self.blocking_messages(violations) = violations.select(&:blocking).map(&:message)
end
```

`attrs` es un Hash con claves **simbolo** (el servicio hace `attrs.symbolize_keys` en el
constructor). Claves reconocidas:

| Clave | Tipo | Usada por |
|---|---|---|
| `:invoice_date` | `Date` o `String` `YYYY-MM-DD` | antiguedad |
| `:invoice_name` | String (proveedor) | concepto_no_permitido |
| `:description` | String | concepto_no_permitido |
| `:invoice_number` | String | duplicado |
| `:identification` | String (NIT/cedula) | duplicado |
| `:invoice_value` | Numeric (COP, sin IVA) | tope_valor |
| `:invoice_total` | Numeric (COP, con IVA) | tope_valor, coherencia |
| `:comprobante_total` | Numeric (COP, total leido del comprobante) | coherencia. **Si es `nil`, la regla no se evalua** |

Toda clave ausente o `nil` **desactiva su regla en esa llamada** (no genera violacion). Ninguna
regla puede lanzar excepcion: si el dato es basura (`invoice_date` no parseable), la regla se salta.

### 4. Configuracion de las reglas: lectura desde `parameterizations`

**Decision: la configuracion vive en la tabla `parameterizations` que ya existe, con una
convencion de nombres.** No hay tabla nueva y no hay migracion.

Justificacion en una linea: `parameterizations` ya tiene modelo, controller, rutas, permisos
(`ModuleControl "Parametrizaciones"`) y una pantalla React de CRUD completa
(`app/javascript/packs/Parameterizations.js` -> `components/Parameterizations/index`), asi que
"ajustar las reglas sin desarrollo nuevo" es literalmente cierto desde el dia uno; una tabla nueva
obligaria a controller, rutas, seeds de permisos, fixtures y una pantalla de administracion que
nadie pidio y que no esta presupuestada.

Filas reconocidas (el nombre se compara en MAYUSCULAS, con `strip`):

| `name` | Columna leida | Default si la fila no existe |
|---|---|---|
| `GASTOS IA - ANTIGUEDAD MAXIMA (DIAS)` | `number_value` | 30 |
| `GASTOS IA - TOPE VALOR POR GASTO` | `money_value` | 2000000 |
| `GASTOS IA - TOLERANCIA COHERENCIA (%)` | `number_value` | 5 |
| `GASTOS IA - VENTANA DUPLICADOS (DIAS)` | `number_value` | 365 |
| `GASTOS IA - BLOQUEA ANTIGUEDAD` | `number_value` (1/0) | 0 |
| `GASTOS IA - BLOQUEA CONCEPTO_NO_PERMITIDO` | `number_value` (1/0) | 1 |
| `GASTOS IA - BLOQUEA DUPLICADO` | `number_value` (1/0) | 1 |
| `GASTOS IA - BLOQUEA TOPE_VALOR` | `number_value` (1/0) | 1 |
| `GASTOS IA - BLOQUEA COHERENCIA` | `number_value` (1/0) | 0 |
| `GASTOS IA - CONCEPTO NO PERMITIDO - <PALABRA>` | ninguna | ver abajo |

**Lista de conceptos no permitidos (caso especial).** `parameterizations` **no tiene ninguna
columna de texto** (solo `name` string, `number_value` integer, `money_value` integer), asi que la
lista se representa **una palabra por fila**, con la palabra embebida en el `name` despues del
prefijo `GASTOS IA - CONCEPTO NO PERMITIDO - `.

```ruby
PREFIX_CONCEPT = "GASTOS IA - CONCEPTO NO PERMITIDO - "

def forbidden_concepts
  rows = Parameterization.where("UPPER(TRIM(name)) LIKE ?", "#{PREFIX_CONCEPT}%").pluck(:name)
  return DEFAULT_CONCEPTS if rows.empty?
  rows.map { |n| n.to_s.upcase.strip.delete_prefix(PREFIX_CONCEPT).strip }
      .reject { |w| w.blank? || w == "(NINGUNO)" }
end
```

- Si **no existe ninguna fila** con el prefijo, aplica `DEFAULT_CONCEPTS`.
- Para **desactivar la regla**, se crea una sola fila `GASTOS IA - CONCEPTO NO PERMITIDO - (NINGUNO)`:
  la lista queda vacia y la regla nunca dispara.
- Para desactivar cualquier otra regla, se pone su parametro numerico en `0` (antiguedad 0 dias,
  tope 0, tolerancia 0 => regla apagada). Cada regla verifica `return if limite <= 0`.

**Sin cache.** Son dos consultas indexadas (`index_parameterizations_on_name`) por evaluacion.
`Rails.cache` no se usa: produccion no tiene `cache_store` configurado y `:file_store` por dyno
daria configuraciones distintas por proceso, que es exactamente lo que no queremos en un motor de
reglas.

**Techo de `money_value`:** es `integer` de Postgres, maximo 2.147.483.647. El tope de valor por
gasto no puede configurarse por encima de eso. **Se deja escrito como comentario en el codigo del
servicio** (junto a los nombres exactos de las filas y al sentinela `(NINGUNO)`) para que el
**paquete 13** lo traslade a `docs/GUIA-REGLAS-NEGOCIO.md` sin tener que leer el codigo; este
paquete **no escribe esa guia** (§7.11, correccion 6).

### 5. Implementar las cinco reglas

Cada regla es un metodo privado que devuelve `Violation` o `nil`. `call` las corre todas y compacta.

**5.1 `antiguedad`**
```ruby
# limite = param("ANTIGUEDAD MAXIMA (DIAS)", :number_value, 30)
# return nil if limite <= 0 || invoice_date.blank?
# dias = (Date.current - fecha).to_i
# return nil if dias <= limite
Violation.new(rule: "antiguedad", blocking: blocking?("antiguedad"),
  message: "El comprobante tiene #{dias} dias de antiguedad y el maximo permitido es #{limite}")
```
Fecha futura (`dias` negativo) **tambien es violacion**, con mensaje propio:
`"La fecha del comprobante (#{fecha}) es posterior a hoy"`, misma `rule`, siempre `blocking: true`
(una factura del futuro es un error de digitacion, no una politica).

**5.2 `concepto_no_permitido`**
```ruby
# texto = [invoice_name, description].compact.join(" ").upcase
# hit = forbidden_concepts.detect { |w| texto.include?(w) }
Violation.new(rule: "concepto_no_permitido", blocking: blocking?("concepto_no_permitido"),
  message: "El gasto menciona un concepto no permitido: #{hit.capitalize}")
```
Comparacion por `include?` sobre texto en mayusculas, **sin acentos normalizados** (las palabras
por defecto no llevan tilde). Una sola violacion aunque haya varias coincidencias: se reporta la
primera.

**5.3 `duplicado`**
```ruby
# return nil if invoice_number.blank? || identification.blank?
# ventana = param("VENTANA DUPLICADOS (DIAS)", :number_value, 365)
# scope = ReportExpense.where(invoice_number: invoice_number.to_s.strip)
# scope = scope.where("report_expenses.created_at >= ?", ventana.days.ago) if ventana > 0
# scope = scope.where.not(id: exclude_expense_id) if exclude_expense_id.present?
# dup = scope.limit(50).detect { |e| nit(e.identification) == nit(identification) }
Violation.new(rule: "duplicado", blocking: blocking?("duplicado"),
  message: "Ya existe el gasto ##{dup.id} con el mismo numero de factura y NIT")
```
`nit(str) = str.to_s.gsub(/[^0-9]/, "")` — normaliza puntos, guiones y digito de verificacion
escritos distinto. La consulta filtra por `invoice_number` exacto (prefijo del indice compuesto
`index_report_expenses_on_invoice_number_and_identification`) y la comparacion de NIT se hace en
Ruby sobre un conjunto candidato acotado con `limit(50)`; asi el indice se usa y el formato del NIT
no rompe la deteccion.

**5.4 `tope_valor`**
```ruby
# tope = param("TOPE VALOR POR GASTO", :money_value, 2_000_000)
# return nil if tope <= 0
# valor = (invoice_total.presence || invoice_value).to_d
# return nil if valor <= tope
Violation.new(rule: "tope_valor", blocking: blocking?("tope_valor"),
  message: "El valor del gasto ($#{miles(valor)}) supera el tope autorizado por gasto ($#{miles(tope)})")
```
Se compara contra `invoice_total` (con IVA) porque el tope es una politica de desembolso, no una
definicion contable; si `invoice_total` es nil o 0 se usa `invoice_value`. **Asumido.**
`miles()` es un helper privado que formatea con separador de miles `.` (formato colombiano).

**5.5 `coherencia`**
```ruby
# return nil if comprobante_total.blank? || invoice_total.blank?
# tol = param("TOLERANCIA COHERENCIA (%)", :number_value, 5)
# return nil if tol <= 0
# base = comprobante_total.to_d
# return nil if base.zero?
# diff_pct = ((invoice_total.to_d - base).abs / base * 100).round(2)
# return nil if diff_pct <= tol
Violation.new(rule: "coherencia", blocking: blocking?("coherencia"),
  message: "El valor declarado ($#{miles(invoice_total)}) difiere en #{diff_pct}% del total del comprobante ($#{miles(base)})")
```
**Solo se evalua cuando el llamador pasa `:comprobante_total`.** El guard de
`ReportExpensesController#create` **no** lo pasa (ahi no hay comprobante extraido en memoria); si lo
pasan el endpoint de captura asistida y la tool MCP. Esto es intencional y esta en Criterios de
aceptacion.

### 6. Rake task de siembra de parametros

`lib/tasks/parameterizations_gastos_ia.rake`, idempotente, **sin `destroy_all`**:

```ruby
namespace :parameterizations_gastos_ia do
  task install: :environment do
    admin = User.joins(:rol).where(rols: { name: "Administrador" }).order(:id).first
    User.current = admin  # Parameterization no tiene callbacks hoy; se setea por si acaso

    numeros = {
      "GASTOS IA - ANTIGUEDAD MAXIMA (DIAS)"   => { number_value: 30 },
      "GASTOS IA - TOLERANCIA COHERENCIA (%)"  => { number_value: 5 },
      "GASTOS IA - VENTANA DUPLICADOS (DIAS)"  => { number_value: 365 },
      "GASTOS IA - TOPE VALOR POR GASTO"       => { money_value: 2_000_000 },
      "GASTOS IA - BLOQUEA ANTIGUEDAD"            => { number_value: 0 },
      "GASTOS IA - BLOQUEA CONCEPTO_NO_PERMITIDO" => { number_value: 1 },
      "GASTOS IA - BLOQUEA DUPLICADO"             => { number_value: 1 },
      "GASTOS IA - BLOQUEA TOPE_VALOR"            => { number_value: 1 },
      "GASTOS IA - BLOQUEA COHERENCIA"            => { number_value: 0 }
    }
    numeros.each do |name, attrs|
      Parameterization.find_or_create_by!(name: name) { |p| p.assign_attributes(attrs.merge(user_id: admin&.id)) }
    end

    ExpenseRuleService::DEFAULT_CONCEPTS.each do |palabra|
      Parameterization.find_or_create_by!(name: "GASTOS IA - CONCEPTO NO PERMITIDO - #{palabra}") do |p|
        p.user_id = admin&.id
      end
    end
  end
end
```

`find_or_create_by!` sobre `name` significa que **re-ejecutar la task nunca pisa un valor que el
cliente ya ajusto**. Se deja escrito en el comentario de cabecera de la rake task; la guia para el
cliente la redacta el **paquete 13** (§7.11). La task esta en el runbook §7.9 como
`rake parameterizations_gastos_ia:install` (ola 3).

### 7. Crear el `Result` y el esqueleto de `ReceiptExtractionService`

🟡 **Este `Result` es la ÚNICA excepción documentada al `Result` canónico del proyecto** (§4.2,
cerrado en la reauditoría). El canónico —`Struct.new(:ok, :value, :errors, keyword_init: true)` con
`errors` **siempre array**— lo usan **04, 05 y 07**; la frase "idéntico para 04, 05, 07 y **10**"
que traían la corrección 8 del 04 y la corrección 6 del 05 **quedó corregida a "04, 05 y 07"**,
porque este servicio nunca la cumplió. Aquí `:error` es **singular a propósito**: es un *código*
(`:timeout`, `:unsupported_format`, `:too_large`, `:refusal`…), no un mensaje, y el mensaje va
aparte en `:error_message`. Se mantiene tal cual porque su **único consumidor es la acción
`extract_receipt`, que este mismo paquete escribe y prueba**; nadie más lo consume y **nadie lo
toma como plantilla**. Fuera de aquí, un `result.error` singular sigue siendo señal de desvío
(README §8). Si algún día otro paquete necesitara consumirlo, se alinea al canónico primero.

```ruby
class ReceiptExtractionService
  Result = Struct.new(:ok, :fields, :confidence, :error, :error_message, :model, :usage,
                      keyword_init: true) do
    def ok? = !!ok
  end

  MAX_BYTES = 5.megabytes
  SUPPORTED_IMAGE_TYPES = %w[image/jpeg image/png image/webp image/gif].freeze
  SUPPORTED_PDF_TYPE    = "application/pdf"

  ERROR_MESSAGES = {
    not_configured:     "La lectura automatica de comprobantes no esta configurada. Complete los datos manualmente",
    disabled:           "La lectura automatica de comprobantes esta deshabilitada. Complete los datos manualmente",
    unsupported_format: "El formato del archivo no se puede leer automaticamente. Adjunte un JPG, PNG o PDF, o complete los datos manualmente",
    too_large:          "El archivo supera los 5 MB permitidos para lectura automatica. Complete los datos manualmente",
    unreadable:         "No se pudo leer el comprobante. Complete los datos manualmente",
    not_an_invoice:     "El archivo adjunto no parece ser una factura o comprobante. Complete los datos manualmente",
    timeout:            "La lectura del comprobante tardo demasiado. Complete los datos manualmente",
    refusal:            "No se pudo procesar el comprobante. Complete los datos manualmente",
    provider_error:     "No se pudo leer el comprobante. Complete los datos manualmente"
  }.freeze

  def self.extract(file, context = {}) = new(file, context).call

  # SEAM DE RED CANONICO (§6.7, vinculante). Unico metodo del servicio que abre un socket.
  # Recibe el payload ya armado (los kwargs de messages.create) y devuelve el hash crudo del
  # modelo, o :refusal si el modelo se nego, o nil si no vino bloque de texto.
  # Publico a proposito: los tests de nivel 1 y el initializer de stubs del paquete 12 lo
  # reemplazan por nombre. NO recibe el cliente por parametro.
  def self.call_vision_model(payload)
    resp = vision_client.messages.create(**payload)
    return :refusal if resp.stop_reason.to_s == "refusal"
    text = Array(resp.content).find { |b| b.type.to_s == "text" }&.text
    return nil if text.blank?
    JSON.parse(text).merge("_usage" => { input_tokens: resp.usage&.input_tokens,
                                         output_tokens: resp.usage&.output_tokens })
  end

  # Privado: construir el cliente NO es un seam. Nadie lo stubea, nadie lo reemplaza.
  private_class_method def self.vision_client
    Anthropic::Client.new(
      api_key: ENV["ANTHROPIC_API_KEY"],
      timeout: 18,       # segundos; el contrato D.1 exige 20 s duros
      max_retries: 0     # el default del SDK es 2 -> 3 x 18 s = 54 s. Inaceptable
    )
  end
end
```

**No existe `api_client=` ni `reset_api_client!`** (correccion 2): el seam de atributo de clase se
elimina y se reemplaza por `self.call_vision_model(payload)`, que es el nombre exacto sobre el que
el paquete 12 hace `prepend` en `config/initializers/e2e_stubs.rb`. Dos mecanismos para lo mismo
harian imposible escribir ese initializer.

**`max_retries: 0` no es negociable.** Con el default (2), un timeout se reintenta dos veces y el
request de Rails se queda 54 segundos colgado ocupando 1 de los 5 hilos de Puma.

### 8. Implementar `build_source` — normalizacion del archivo

Acepta cualquier objeto que responda a `#read` y `#content_type` (`ActionDispatch::Http::UploadedFile`,
`Rack::Test::UploadedFile`, un `CarrierWave::Uploader`), o un Hash `{ data:, media_type:, filename: }`.

Reglas y orden de verificacion (el primero que falla corta):

1. `ENV["RECEIPT_EXTRACTION_ENABLED"] == "false"` -> `:disabled`.
2. `ENV["ANTHROPIC_API_KEY"].blank?` -> `:not_configured`.
3. `file.blank?` -> `:unsupported_format`.
4. `bytes.bytesize > MAX_BYTES` -> `:too_large`.
5. `content_type` no esta en `SUPPORTED_IMAGE_TYPES + [SUPPORTED_PDF_TYPE]` -> `:unsupported_format`.
6. Si el `content_type` llega vacio o generico (`application/octet-stream`), se deduce por la
   extension del `original_filename` con `Rack::Mime.mime_type(File.extname(name))`.

**HEIC se rechaza explicitamente con `:unsupported_format`.** La API de vision no acepta
`image/heic` (solo jpeg/png/webp/gif), y convertirlo exigiria MiniMagick + ImageMagick en CI, que la
arquitectura §4.8 decidio evitar. El archivo **si se puede adjuntar** al gasto (el
`ReceiptUploader` lo permite): lo unico que no se hace es leerlo automaticamente. **Asumido**; ver
Riesgos punto 4.

El bloque de contenido que se manda al modelo:

```ruby
# PDF
{ type: "document", source: { type: "base64", media_type: "application/pdf", data: Base64.strict_encode64(bytes) } }
# Imagen
{ type: "image",    source: { type: "base64", media_type: ct,                 data: Base64.strict_encode64(bytes) } }
```

`Base64.strict_encode64` (sin saltos de linea) es obligatorio: `encode64` mete `\n` cada 60
caracteres y la API rechaza el payload.

### 9. Definir el JSON Schema de salida y el prompt

**Salida estructurada, no texto libre.** Se usa `output_config: { format: { type: "json_schema",
schema: SCHEMA } }`, soportado por `claude-opus-5`.

```ruby
SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: %w[is_invoice unreadable provider_name identification invoice_number invoice_date
               currency value tax total description confidence],
  properties: {
    is_invoice:     { type: "boolean" },
    unreadable:     { type: "boolean" },
    provider_name:  { type: %w[string null] },
    identification: { type: %w[string null] },
    invoice_number: { type: %w[string null] },
    invoice_date:   { type: %w[string null] },   # YYYY-MM-DD
    currency:       { type: %w[string null] },   # ISO 4217, 3 letras
    value:          { type: %w[number null] },   # base, sin impuestos, en la moneda del documento
    tax:            { type: %w[number null] },
    total:          { type: %w[number null] },
    description:    { type: %w[string null] },
    confidence: {
      type: "object", additionalProperties: false,
      required: %w[provider_name identification invoice_number invoice_date currency value tax total],
      properties: %w[provider_name identification invoice_number invoice_date currency value tax total]
        .index_with { { type: "number" } }
    }
  }
}.freeze
```

Prompt del sistema (constante `SYSTEM_PROMPT`, en espanol, literal):

```
Eres un extractor de datos de comprobantes de gasto para una empresa colombiana.
Lees una imagen o un PDF de una factura, recibo, tiquete o cuenta de cobro y devuelves
UNICAMENTE los campos que puedes leer en el documento.

Reglas estrictas:
- Nunca inventes un dato. Si un campo no aparece o no lo puedes leer con seguridad, devuelvelo en null.
- identification es el NIT o la cedula de QUIEN EMITE el comprobante (el proveedor), no la del cliente.
- invoice_date en formato YYYY-MM-DD. Si el documento usa DD/MM/AAAA, conviertelo. Ante ambiguedad
  entre DD/MM y MM/DD, asume DD/MM (formato colombiano).
- value es la base gravable (sin impuestos), tax es el total de impuestos, total es el valor a pagar.
  Los tres en la moneda del documento, sin simbolos ni separadores de miles.
- currency es el codigo ISO 4217 de 3 letras. Si el documento no indica moneda, asume COP.
- description es una frase corta (maximo 120 caracteres) de que se compro.
- is_invoice en false si el archivo no es un comprobante de gasto.
- unreadable en true si el documento esta demasiado borroso, cortado u oscuro para leerlo.
- confidence: un numero entre 0 y 1 por campo, que refleje que tan seguro estas de HABER LEIDO
  ese valor en el documento. 0 para los campos que devolviste en null.
```

Parametros de la llamada:

El payload se arma en una instancia y se manda al seam de clase `call_vision_model`:

```ruby
payload = {
  model: ENV.fetch("RECEIPT_EXTRACTION_MODEL", "claude-opus-5"),
  max_tokens: 2048,
  system: SYSTEM_PROMPT,
  output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
  messages: [{ role: "user", content: [documento, { type: "text", text: user_hint }] }]
}
raw = self.class.call_vision_model(payload)
```

- **Modelo por defecto `claude-opus-5`.** Justificacion: es el modelo actual de la familia Claude 5,
  soporta vision de alta resolucion (2576 px en el lado largo, que es lo que necesita un tiquete
  fotografiado con el celular), soporta salida estructurada por JSON Schema y acepta PDF nativo sin
  convertir a imagen. `RECEIPT_EXTRACTION_MODEL` permite bajar a `claude-haiku-4-5-20251001` si el
  cliente decide priorizar costo sobre precision — esa es una decision del cliente, no del agente
  que implementa, y por eso es ENV y no constante.
- **`effort: "low"`**: la extraccion de campos de una factura no requiere razonamiento profundo y el
  presupuesto de latencia es de 20 s.
- **No se pasa `thinking: { type: "disabled" }`.** En `claude-opus-5` deshabilitar el pensamiento
  tiene modos de falla conocidos (fuga de etiquetas internas en la respuesta visible); bajar `effort`
  ya da el ahorro de latencia sin ese riesgo.
- `user_hint` se arma con el contexto: si `context[:cost_center_code]` viene, se agrega
  `"El gasto se imputa al centro de costos #{code}."`. Si no hay contexto, es
  `"Extrae los datos de este comprobante."`.

### 10. Parseo de la respuesta y mapeo de errores

```ruby
raw = self.class.call_vision_model(payload)   # unico punto de red (§6.7)
return failure(:refusal)        if raw == :refusal
return failure(:provider_error) if raw.blank?
```

El `JSON.parse`, la deteccion de `stop_reason == "refusal"` y la busqueda del bloque de texto viven
**dentro** de `call_vision_model` (tarea 7), para que el doble del test y el stub del paquete 12
tengan que devolver solo el hash del modelo y no una respuesta del SDK entera.

`rescue` explicito y exhaustivo, **sin reintentos**:

| Excepcion | `error` |
|---|---|
| `Anthropic::Errors::APIConnectionError` | `:timeout` |
| `Anthropic::Errors::RateLimitError` | `:provider_error` |
| `Anthropic::Errors::APIStatusError` | `:provider_error` |
| `JSON::ParserError` | `:provider_error` |
| `StandardError` | `:provider_error` + `Rails.logger.error` con la clase y el mensaje |

Nunca se propaga una excepcion fuera de `extract`. Ese es el contrato.

Post-proceso del hash `raw`:

1. `return failure(:unreadable)` si `raw["unreadable"]`.
2. `return failure(:not_an_invoice)` si `raw["is_invoice"] == false`.
3. **Umbrales de confianza** (constantes `CONFIDENCE_DROP = 0.30`, `CONFIDENCE_WARN = 0.60`):
   - campo con `confidence < 0.30` -> se fuerza a `nil` (mejor vacio que inventado);
   - campo con `0.30 <= confidence < 0.60` -> se conserva y se marca en `low_confidence` para que
     el endpoint lo convierta en advertencia.
4. Normalizacion:
   - `invoice_date` -> `Date.parse` dentro de un `rescue nil`; si no parsea, el campo va a `nil`.
   - `currency` -> `.to_s.upcase.strip`; si no cumple `Currency.valid?`, se fuerza a `"COP"` y se
     agrega el campo a `low_confidence`.
   - `identification` -> `gsub(/[^0-9]/, "")`; si queda vacio, `nil`.
   - `value`/`tax`/`total` -> `BigDecimal` via `.to_s.to_d`; negativos -> `nil`.
   - Si `total` es `nil` pero hay `value` y `tax`, `total = value + tax`. Si `value` es `nil` pero
     hay `total` y `tax`, `value = total - tax`. Nunca al reves con signos negativos.
5. `Result.new(ok: true, fields: {...}, confidence: {...}, model: payload[:model], usage: raw["_usage"])`.
   `"_usage"` es la unica clave de metadatos que agrega el seam; `usage` queda en `nil` cuando el
   seam esta doblado y eso no rompe ninguna asercion.

Claves de `fields` (todas presentes, valor `nil` cuando no se detecto): `provider_name`,
`identification`, `invoice_number`, `invoice_date` (`Date`), `currency`, `value`, `tax`, `total`,
`description`, `low_confidence` (`Array<String>`).

### 11. Crear el doble de prueba `FakeAnthropicClient`

`test/support/fake_anthropic_client.rb`. Cero red, cero gemas nuevas (la arquitectura §6.7 decidio
no agregar WebMock).

```ruby
class FakeAnthropicClient
  attr_reader :calls

  # respuesta: Hash que el seam devuelve como hash crudo del modelo, o una Exception (clase o
  # instancia) que se lanza, o el simbolo :refusal, o nil (sin bloque de texto).
  def initialize(respuesta)
    @respuesta = respuesta
    @calls = []
  end

  # Misma firma que ReceiptExtractionService.call_vision_model(payload).
  def call(payload)
    @calls << payload
    raise @respuesta if @respuesta.is_a?(Exception) || (@respuesta.is_a?(Class) && @respuesta <= Exception)
    @respuesta
  end
end

# El helper vive AQUI, no en test_helper.rb (dueño unico: paquete 01, §7.2).
module WithFakeExtractor
  def with_fake_extractor(respuesta)
    fake = FakeAnthropicClient.new(respuesta)
    ReceiptExtractionService.stub(:call_vision_model, ->(payload) { fake.call(payload) }) do
      yield fake
    end
  end
end
```

El test lo usa con `include WithFakeExtractor` en la clase de prueba. El archivo **se autocarga**
con el `Dir[Rails.root.join("test/support/**/*.rb")].each { |f| require f }` que el paquete 01 pone
en `test_helper.rb`: **este paquete no agrega ningun `require_relative` y no toca `test_helper.rb`**
(correccion 3). `Minitest::Mock#stub` es parte de Minitest: cero gemas nuevas, coherente con §6.7.

`fake.calls` guarda los payloads que recibio el seam, asi que las aserciones de "que se le mando al
modelo" (`calls.first[:messages]`, `calls.first[:model]`) y las de "no se llamo" (`calls.empty?`)
siguen funcionando igual.

### 12. Crear los archivos de ejemplo en `test/fixtures/files/`

> **RETIRADA por auditoría.** Dueño único: paquete 01. Ver el bloque de correcciones al inicio.

### 13. Crear el fixture `test/fixtures/parameterizations.yml`

> **RETIRADA por auditoría.** Dueño único: paquete 01. Ver el bloque de correcciones al inicio.

### 14. Endpoint `POST /extract_receipt/report_expenses`

> ✅ **Dueño de ESTA accion: este paquete** (cierre de la reauditoria). §7.2 tenia
> `extract_receipt` dentro de la fila del **07**, pero el 07 lo declaraba fuera de alcance en su
> propio documento: la matriz nombraba a un dueño que se declaraba no-dueño y el endpoint no lo
> escribia nadie —o lo escribian dos—. Ahora `extract_receipt` + su ruta +
> `test/controllers/report_expenses_extract_receipt_test.rb` tienen **fila propia en §7.2 con dueño
> 10**, como **excepcion documentada** al dueño del archivo (`report_expenses_controller.rb` sigue
> siendo del 07 para todo lo demas). Este paquete la diseña, la implementa con su helper
> `build_draft`, la prueba con sus 16 casos y es dueño de los criterios 20–26 y 29.1; la mergea en
> la **ola 3b** y el 07 (ola 4) la recibe escrita y **no la reescribe**. Lo mismo vale para la
> linea de `config/routes.rb`.

Ruta en `config/routes.rb`, junto al bloque de lineas 82-88:
```ruby
post "extract_receipt/report_expenses", to: "report_expenses#extract_receipt"
```

Accion en `ReportExpensesController`:

```ruby
def extract_receipt
  unless is_admin? || has_menu_permission?("Gastos", "Crear")
    return render json: { type: "error", message: ["No tiene permiso para realizar esta accion"] },
                  status: :forbidden
  end
  if params[:file].blank?
    return render json: { type: "error", message: ["Debe adjuntar un comprobante"] }
  end

  center = CostCenter.find_by(id: params[:cost_center_id])
  result = ReceiptExtractionService.extract(params[:file], cost_center_code: center&.code)
  unless result.ok?
    return render json: { type: "error", message: [result.error_message] }
  end

  fields, warnings = build_draft(result)                       # privado, paso de conversion
  violations = ExpenseRuleService.validate(
    invoice_date:      fields[:invoice_date],
    invoice_name:      fields[:invoice_name],
    description:       fields[:description],
    invoice_number:    fields[:invoice_number],
    identification:    fields[:identification],
    invoice_value:     fields[:invoice_value],
    invoice_total:     fields[:invoice_total],
    comprobante_total: fields[:invoice_total]
  )

  render json: { type: "success", fields: fields, confidence: result.confidence,
                 warnings: warnings, rule_violations: violations.map(&:to_h) }
end
```

`build_draft(result)` (privado) hace la conversion de moneda y arma las advertencias:

- Si `currency == "COP"`: `invoice_value/tax/total = value/tax/total`, los `foreign_*` en `nil`,
  `exchange_rate` en `nil`, `exchange_rate_source` en `nil`.
- Si `currency != "COP"`: `foreign_value/tax/total = value/tax/total` y se llama
  `ExchangeRateService.fetch(currency: fields[:currency], date: fields[:invoice_date] || Date.current)`.
  - `ok?` -> `exchange_rate = rate_to_cop`, `exchange_rate_date = rate_date`,
    `exchange_rate_source = source`, y `invoice_* = (foreign_* * rate).round(2).to_f`
    (**invariante #3: los COP siempre se calculan multiplicando, nunca al reves**).
    Si `rate_date != invoice_date`, warning:
    `"La tasa aplicada es la del #{rate_date} (ultimo dia habil disponible)"`.
  - `!ok?` -> `invoice_*` en `nil`, `exchange_rate` en `nil`, y warning:
    `"No se pudo obtener la tasa de #{currency} para el #{fecha}. Ingresela manualmente"`.
- Advertencias adicionales, en este orden:
  1. Un warning por cada campo en `result.fields[:low_confidence]`:
     `"Verifique el campo #{etiqueta}: la lectura no es confiable"`, con `etiqueta` sacada de una
     constante `FIELD_LABELS` (`invoice_number` -> `"numero de factura"`, etc.).
  2. Si la antiguedad esta entre el 80% y el 100% del limite, no hay warning (eso es la regla, no
     una advertencia duplicada).

**Nunca guarda nada.** La accion no instancia `ReportExpense`, no llama `save`, no llama
`recalculate_cost_center`.

**CSRF:** `verify_authenticity_token` **si aplica** a esta accion (el `skip_before_action` existente
solo cubre `:upload_file`). El frontend debe mandar el header `X-CSRF-Token` junto al `FormData`
(arquitectura §4.5). **No agregar `extract_receipt` al `skip_before_action`.**

### 15. Guard de reglas en `create` y `update`

En `ReportExpensesController`, antes de construir el registro:

```ruby
def create
  if (msgs = rule_violation_error(report_expense_params_create)).present?
    return render json: { success: "El Registro No se creo!", type: "error", message: msgs }
  end
  # ... cuerpo actual sin cambios
end

def update
  if (msgs = rule_violation_error(report_expense_params_update, exclude: @report_expense.id)).present?
    return render json: { success: "El Registro No se actualizo!", type: "error", message: msgs }
  end
  # ... cuerpo actual sin cambios
end

private

def rule_violation_error(attrs, exclude: nil)
  ExpenseRuleService.blocking_messages(
    ExpenseRuleService.validate(attrs.to_h.symbolize_keys, exclude_expense_id: exclude)
  )
end
```

Se elige el **guard en el controller** y **no** una `validate` de modelo por tres razones concretas:

1. `update_filter_values` (`report_expenses_controller.rb:165`) hace
   `report_expenses.update(is_acepted: true)` sobre una relacion completa: una validacion de modelo
   haria fallar en silencio la aceptacion masiva de todos los gastos que violen alguna regla.
2. `ReportExpense.import` (importacion masiva desde Excel) crea cientos de registros historicos que
   por definicion violan la regla de antiguedad.
3. `recalculate_cost_center` y los reevaluos de presupuesto tocan gastos existentes.

El guard en el controller aplica exactamente donde se necesita: la captura de un gasto nuevo o su
edicion manual. **La tool MCP `report_expenses_create` no pasa por aqui**, y eso **ya esta resuelto
por la auditoria**: el paquete 11 (Tarea 8) llama a `ExpenseRuleService.validate` antes del save y
rechaza si hay una violacion con `blocking: true` (§7.5). No hay que abrir ningun issue: es criterio
de aceptacion del 11 y `ExpenseRuleService` figura en su tabla de dependencias de codigo.

---

## Pruebas unitarias (Minitest)

Todas las pruebas que crean o editan un `ReportExpense` van envueltas en
`as_user(users(:admin)) { ... }` (arquitectura §5.3): los callbacks de `ReportExpense` llaman
`User.current.id`.

Las fixtures que usan estas pruebas (`parameterizations.yml`, `report_expenses.yml`, `users.yml`,
`rols.yml` y los archivos de `test/fixtures/files/`) **las crea el paquete 01**: aqui solo se
consumen sus etiquetas.

### `test/services/expense_rule_service_test.rb` (33 casos)

Regla de antiguedad (`GASTOS IA - ANTIGUEDAD MAXIMA (DIAS)` = 30 por fixture del 01):

1. `test_antiguedad_dentro_del_limite_no_genera_violacion` — `invoice_date: 10.days.ago` -> `validate` devuelve `[]`.
2. `test_antiguedad_exactamente_en_el_limite_no_genera_violacion` — `30.days.ago` -> `[]` (borde: `<=`).
3. `test_antiguedad_un_dia_pasada_genera_violacion` — `31.days.ago` -> una violacion con `rule == "antiguedad"` y `message` que incluye `"31 dias"` y `"30"`.
4. `test_antiguedad_no_bloquea_por_defecto` — la violacion de 3 tiene `blocking == false`.
5. `test_antiguedad_bloquea_si_el_parametro_lo_dice` — crear `Parameterization` `"GASTOS IA - BLOQUEA ANTIGUEDAD"` con `number_value: 1` -> `blocking == true`.
6. `test_antiguedad_cero_desactiva_la_regla` — poner el parametro en 0 -> `invoice_date: 5.years.ago` devuelve `[]`.
7. `test_fecha_futura_siempre_bloquea` — `invoice_date: 1.day.from_now` -> violacion `rule == "antiguedad"`, `blocking == true`, mensaje que incluye `"posterior a hoy"`.
8. `test_invoice_date_nil_no_evalua_antiguedad` — sin la clave -> `[]`.
9. `test_invoice_date_basura_no_revienta` — `invoice_date: "no-es-fecha"` -> `[]` y ninguna excepcion.

Regla de concepto no permitido:

10. `test_concepto_no_permitido_detecta_en_invoice_name` — `invoice_name: "Licorera La 33"` -> violacion `rule == "concepto_no_permitido"`, `blocking == true`, mensaje con `"Licor"`.
11. `test_concepto_no_permitido_detecta_en_description` — `description: "compra de WHISKY para el cliente"` -> violacion.
12. `test_concepto_no_permitido_es_case_insensitive` — `description: "aguardiente"` (con fila `AGUARDIENTE` sembrada) -> violacion.
13. `test_concepto_permitido_no_genera_violacion` — `invoice_name: "Hotel Dann Carlton"`, `description: "alojamiento"` -> `[]`.
14. `test_lista_por_defecto_cuando_no_hay_filas` — borrar todas las filas con el prefijo -> `description: "ron"` genera violacion (aplica `DEFAULT_CONCEPTS`).
15. `test_sentinela_ninguno_desactiva_la_regla` — dejar solo la fila `"... - (NINGUNO)"` -> `description: "licor"` devuelve `[]`.

Regla de duplicados:

16. `test_duplicado_mismo_numero_y_nit_genera_violacion` — crear un gasto con `invoice_number: "FE-4821"`, `identification: "900123456"` dentro de `as_user`; evaluar los mismos datos -> violacion `rule == "duplicado"`, `blocking == true`, mensaje que incluye el `id` del gasto existente.
17. `test_duplicado_ignora_formato_del_nit` — el gasto guardado tiene `identification: "900.123.456-7"` y se evalua `"9001234567"` -> violacion (normalizacion a solo digitos).
18. `test_duplicado_distinto_nit_no_genera_violacion` — mismo `invoice_number`, NIT distinto -> `[]`.
19. `test_duplicado_excluye_el_propio_gasto_al_editar` — `exclude_expense_id:` con el id del gasto existente -> `[]`.
20. `test_duplicado_fuera_de_la_ventana_no_genera_violacion` — poner `VENTANA DUPLICADOS (DIAS)` en 1 y forzar `created_at: 10.days.ago` en el gasto existente (via `update_column`, para no disparar callbacks) -> `[]`.
21. `test_duplicado_sin_invoice_number_no_evalua` — `invoice_number: nil` -> `[]`.

Regla de tope de valor:

22. `test_tope_valor_por_debajo_no_genera_violacion` — `invoice_total: 1_999_999` -> `[]`.
23. `test_tope_valor_excedido_por_un_peso_genera_violacion_bloqueante` — `invoice_total: 2_000_001` -> violacion `rule == "tope_valor"`, `blocking == true`, mensaje con `"2.000.000"`.
24. `test_tope_valor_usa_invoice_value_si_no_hay_total` — `invoice_total: nil`, `invoice_value: 3_000_000` -> violacion.

Regla de coherencia:

25. `test_coherencia_dentro_de_tolerancia_no_genera_violacion` — `comprobante_total: 100_000`, `invoice_total: 104_000` (4% < 5%) -> `[]`.
26. `test_coherencia_fuera_de_tolerancia_genera_advertencia` — `comprobante_total: 100_000`, `invoice_total: 130_000` -> violacion `rule == "coherencia"`, `blocking == false`, mensaje con `"30.0%"`.
27. `test_coherencia_no_se_evalua_sin_comprobante_total` — sin la clave `:comprobante_total` -> `[]` aunque `invoice_total` sea disparatado.
28. `test_coherencia_comprobante_total_cero_no_divide_por_cero` — `comprobante_total: 0` -> `[]` y ninguna excepcion.

Transversales:

29. `test_validate_devuelve_array_vacio_con_attrs_vacio` — `validate({})` -> `[]`.
30. `test_violation_to_h_tiene_las_tres_claves_del_contrato` — `to_h.keys.sort == [:blocking, :message, :rule]`.
31. `test_blocking_predicado_y_mensajes` — con una violacion bloqueante y una no, `ExpenseRuleService.blocking?` es `true` y `blocking_messages` tiene exactamente un elemento.
32. `test_varias_reglas_a_la_vez_devuelven_varias_violaciones` — gasto viejo + licor + sobre tope -> 3 violaciones, todas con `rule` distinto.
33. `test_attrs_con_claves_string_funciona_igual` — `validate("invoice_total" => 3_000_000)` -> misma violacion que con simbolo.

### `test/services/receipt_extraction_service_test.rb` (24 casos)

Todas usan `with_fake_extractor` (modulo de `test/support/fake_anthropic_client.rb`), que stubea
`ReceiptExtractionService.call_vision_model`. **Ningun test construye un `Anthropic::Client`.**

Camino feliz:

1. `test_extrae_todos_los_campos_de_un_pdf` — doble con payload completo; `fixture_file_upload("comprobante_factura.pdf", "application/pdf")` -> `ok?`, y `fields[:provider_name]`, `[:identification]`, `[:invoice_number]`, `[:currency]`, `[:total]` con los valores del payload.
2. `test_invoice_date_se_devuelve_como_Date` — payload `"2026-07-14"` -> `fields[:invoice_date].is_a?(Date)` y `== Date.new(2026, 7, 14)`.
3. `test_valores_se_devuelven_como_BigDecimal` — `fields[:total].is_a?(BigDecimal)`.
4. `test_identification_se_normaliza_a_solo_digitos` — payload `"900.123.456-7"` -> `"9001234567"`.
5. `test_manda_bloque_document_para_pdf` — inspeccionar `fake.calls.first[:messages]` (el payload que recibio el seam): el primer bloque de contenido tiene `type: "document"` y `media_type: "application/pdf"`.
6. `test_manda_bloque_image_para_jpg` — con `comprobante_factura.jpg` -> primer bloque `type: "image"`, `media_type: "image/jpeg"`.
7. `test_base64_no_tiene_saltos_de_linea` — `refute_includes(data, "\n")` sobre el `data` enviado.
8. `test_usa_el_modelo_de_la_variable_de_entorno` — con `ENV["RECEIPT_EXTRACTION_MODEL"] = "claude-haiku-4-5-20251001"` -> `fake.calls.first[:model]` es ese valor.
9. `test_el_seam_de_red_es_call_vision_model` — `assert_respond_to ReceiptExtractionService, :call_vision_model` y `refute_respond_to ReceiptExtractionService, :api_client=` (el seam viejo no puede volver). El `timeout: 18` / `max_retries: 0` del cliente real se verifica por lectura de codigo y queda como criterio 7, no como test: construir el cliente real en un test abriria la puerta a que alguien lo llame.

Confianza:

10. `test_campo_con_confianza_muy_baja_se_anula` — `confidence.invoice_number = 0.10` -> `fields[:invoice_number]` es `nil` y `"invoice_number"` esta en `fields[:low_confidence]`.
11. `test_campo_con_confianza_media_se_conserva_y_se_marca` — `confidence.invoice_date = 0.45` -> el campo conserva su valor **y** aparece en `low_confidence`.
12. `test_campo_con_confianza_alta_no_se_marca` — `0.95` -> no aparece en `low_confidence`.

Fallos y bordes:

13. `test_documento_ilegible_devuelve_error_unreadable` — payload `unreadable: true` -> `refute result.ok?`, `error == :unreadable`, `error_message` incluye `"Complete los datos manualmente"`.
14. `test_no_es_factura_devuelve_error_not_an_invoice` — payload `is_invoice: false` -> `error == :not_an_invoice`.
15. `test_formato_heic_se_rechaza_sin_llamar_al_modelo` — `comprobante_iphone.heic` (fixture del 01) -> `error == :unsupported_format` **y** `fake.calls.empty?` (no se gastan tokens).
16. `test_archivo_de_mas_de_5mb_se_rechaza_sin_llamar_al_modelo` — archivo temporal de 6 MB -> `error == :too_large` y `fake.calls.empty?`. **El archivo grande no se commitea**: se genera con `Tempfile`/`File.binwrite(tmp, "0" * 6.megabytes)` en el `setup` y se borra en el `teardown` (§7.12).
17. `test_sin_api_key_devuelve_not_configured_y_no_revienta` — `ENV["ANTHROPIC_API_KEY"] = nil` -> `error == :not_configured`, sin excepcion.
18. `test_kill_switch_apagado_devuelve_disabled` — `ENV["RECEIPT_EXTRACTION_ENABLED"] = "false"` -> `error == :disabled` y `fake.calls.empty?`.
19. `test_timeout_del_proveedor_devuelve_error_no_excepcion` — doble que lanza `Anthropic::Errors::APIConnectionError` -> `error == :timeout` y **no** se propaga la excepcion.
20. `test_error_5xx_del_proveedor_devuelve_provider_error` — doble que lanza `Anthropic::Errors::APIStatusError`.
21. `test_json_malformado_devuelve_provider_error` — doble que lanza `JSON::ParserError` (el `JSON.parse` vive dentro de `call_vision_model`) -> `error == :provider_error`. Variante: doble que devuelve `nil` (sin bloque de texto) -> tambien `:provider_error`.
22. `test_stop_reason_refusal_devuelve_refusal` — doble que devuelve `:refusal` -> `error == :refusal`.
23. `test_moneda_invalida_se_fuerza_a_cop_y_se_marca` — payload `currency: "XYZ"` -> `fields[:currency] == "COP"` y `"currency"` en `low_confidence`.
24. `test_total_se_calcula_cuando_falta_pero_hay_value_y_tax` — payload `total: nil, value: 100, tax: 19` -> `fields[:total] == 119`.

### `test/controllers/report_expenses_extract_receipt_test.rb` (16 casos)

Todos con `sign_in users(:admin)` o el usuario correspondiente, y `as_user` donde se creen gastos.

1. `test_extract_receipt_sin_permiso_devuelve_403` — usuario con rol sin `"Gastos" / "Crear"` -> `assert_response :forbidden` y `json["message"].first` incluye `"No tiene permiso"`.
2. `test_extract_receipt_sin_archivo_devuelve_error` — POST sin `file` -> `json["type"] == "error"`, mensaje `"Debe adjuntar un comprobante"`, y `assert_response :success` (HTTP 200, coherente con el resto del sistema).
3. `test_extract_receipt_cop_devuelve_los_campos_en_pesos` — doble con `currency: "COP"`, `total: 500000` -> `json["type"] == "success"`, `fields["invoice_value"]` poblado, `fields["foreign_value"]` en `null`, `fields["exchange_rate"]` en `null`.
4. `test_extract_receipt_moneda_extranjera_convierte_a_cop` — doble de extraccion con `currency: "USD"`, `value: 120.0`; `ExchangeRateService.stub(:fetch, ok_result(rate: 4120.5))` -> `fields["foreign_value"] == "120.0"`, `fields["invoice_value"] == 494460.0`, `fields["exchange_rate_source"] == "trm_oficial"`.
5. `test_extract_receipt_sin_tasa_deja_cop_en_nulo_y_advierte` — `ExchangeRateService.stub(:fetch, error_result)` -> `fields["invoice_value"]` en `null` y un `warnings` que incluye `"Ingresela manualmente"`.
6. `test_extract_receipt_tasa_de_otra_fecha_genera_advertencia` — `rate_date != invoice_date` -> warning con `"ultimo dia habil"`.
7. `test_extract_receipt_devuelve_rule_violations_con_blocking` — sembrar un gasto duplicado y hacer que el doble extraiga el mismo `invoice_number` + NIT -> `json["rule_violations"].first["rule"] == "duplicado"` y `["blocking"] == true`.
8. `test_extract_receipt_devuelve_confidence_por_campo` — `json["confidence"]["invoice_number"]` es un numero.
9. `test_extract_receipt_no_crea_ningun_gasto` — `assert_no_difference("ReportExpense.count") { post ... }`. **Este es el test mas importante del paquete.**
10. `test_extract_receipt_con_extraccion_fallida_devuelve_error_no_500` — doble que lanza -> `assert_response :success`, `json["type"] == "error"`.
11. `test_extract_receipt_acepta_pdf_via_multipart` — `fixture_file_upload("comprobante_factura.pdf", "application/pdf")` -> 200 y `type == "success"`.
12. `test_create_bloquea_gasto_con_violacion_bloqueante` — crear un gasto con `invoice_total: 5_000_000` (sobre tope) -> `json["type"] == "error"`, mensaje con `"tope autorizado"`, y `assert_no_difference("ReportExpense.count")`.
13. `test_create_permite_gasto_con_violacion_no_bloqueante` — gasto de `60.days.ago` (antiguedad, no bloqueante por defecto) -> `json["type"] == "success"` y `assert_difference("ReportExpense.count", 1)`.
14. `test_update_excluye_el_propio_gasto_del_chequeo_de_duplicados` — editar un gasto sin cambiarle `invoice_number` ni `identification` -> se guarda (no se detecta a si mismo como duplicado).
15. `test_update_filter_values_sigue_funcionando_con_gastos_que_violan_reglas` — sembrar un gasto que viola tope y llamar `PATCH /update_filter_values` -> `is_acepted` queda en `true` (el guard **no** aplica ahi; regresion del punto 1 de la tarea 15).
16. `test_extract_receipt_responde_error_estandar_cuando_el_modelo_se_pasa_del_timeout` (**nuevo, correccion 5**) — inyectar un doble de `call_vision_model` que lance la excepcion de timeout del SDK (o que duerma) y afirmar que el endpoint responde **HTTP 200** con `type: "error"` y el mensaje `"No se pudo leer el comprobante. Complete los datos manualmente"`, **en menos de 20 s** (medir con `Process.clock_gettime(Process::CLOCK_MONOTONIC)` alrededor del `post`). El corte lo hace el `timeout: 18` del cliente del SDK; **sigue prohibido `Timeout.timeout`** (Riesgo 1).

---

## Pruebas E2E (Playwright)

Este paquete **no crea superficie de usuario propia** y **no escribe ni modifica nada dentro de
`test/e2e/`**: los specs funcionales son del **paquete 12** y la infraestructura de Playwright
(incluido `playwright.config.js`) es del **paquete 01** (§7.2). El boton "Leer comprobante" y el
pintado de advertencias en el modal son del **paquete 08**.

Lo que si se entrega es el **contrato que el E2E del 12 va a necesitar**, para que lo implemente sin
adivinar. Cuando el 12 escriba `ai-capture.spec.js`, esto es lo que este paquete garantiza del lado
servidor:

- `POST /extract_receipt/report_expenses` responde `200` con `Content-Type: application/json` y las
  claves `type`, `fields`, `confidence`, `warnings`, `rule_violations`.
- **El seam que el 12 stubea es `ReceiptExtractionService.call_vision_model`** (§6.7), por `prepend`
  sobre el `singleton_class` en `config/initializers/e2e_stubs.rb`. Con ese stub los 3 tests de
  `ai-capture.spec.js` **si ejercitan** la extraccion completa, sin red y sin gastar tokens.
- **`RECEIPT_EXTRACTION_ENABLED` NO se pone en `false` en el entorno E2E** (correccion 4): gana el
  stub del 12, que prueba mas. La variable queda como **kill switch de produccion** (§7.9), no como
  mecanismo de test. Este paquete **no toca `test/e2e/playwright.config.js`**.
- Para completitud del contrato: si alguien pone `RECEIPT_EXTRACTION_ENABLED=false` en cualquier
  entorno, el endpoint responde
  `{"type":"error","message":["La lectura automatica de comprobantes esta deshabilitada. Complete los datos manualmente"]}`
  y el modal debe seguir siendo usable. Es el comportamiento del kill switch, no una precondicion de
  las pruebas.
- El guard de reglas se puede ejercitar sin IA: registrar un gasto con valor por encima del tope
  siembra el texto `"supera el tope autorizado por gasto"` en el `Swal` de error. Si el 12 quiere un
  flujo dedicado a eso, es decision suya; este paquete no agrega specs.

---

## Criterios de aceptacion

Cada item se marca si/no sin opinar.

**Servicio de extraccion**

1. `app/services/receipt_extraction_service.rb` existe y define `self.extract(file, context = {})`.
2. `ReceiptExtractionService.extract` **nunca** lanza una excepcion: existe un test que le inyecta un
   doble que lanza y afirma que devuelve un `Result` con `ok? == false`.
3. `Result` responde a `ok?`, `fields`, `confidence`, `error`, `error_message`, `model`, `usage`.
4. `fields` contiene siempre las 10 claves documentadas, con `nil` en las no detectadas.
5. Un archivo `.heic` y un archivo de mas de 5 MB devuelven error **sin** hacer ninguna llamada al
   modelo (verificado por `fake.calls.empty?`).
6. Sin `ANTHROPIC_API_KEY` el servicio devuelve `error: :not_configured` y el endpoint responde 200
   con `type: "error"`. Ningun 500.
7. El cliente real se construye con `timeout: 18` y `max_retries: 0`, dentro de un metodo de clase
   **privado** (`vision_client`), no expuesto como seam.
8. **El unico seam de red es `ReceiptExtractionService.call_vision_model(payload)`** (§6.7), es
   publico y es el unico metodo que abre un socket. **No existe `api_client=` ni `reset_api_client!`**
   (verificable: `grep -rn "api_client" app/` no devuelve nada; en `test/` solo aparece en el
   `refute_respond_to` del caso 9, que existe justamente para que no vuelva) y **ningun test toca la red**
   (`grep -rn "Anthropic::Client.new" test/` no devuelve nada).
9. El modelo por defecto es `claude-opus-5` y es sobreescribible por `RECEIPT_EXTRACTION_MODEL`.
10. La llamada usa salida estructurada (`output_config.format` con `json_schema`), no parseo de
    texto libre.

**Motor de reglas**

11. `app/services/expense_rule_service.rb` existe y define `self.validate(attrs, exclude_expense_id: nil)`
    que devuelve un `Array`.
12. Cada elemento del array responde a `to_h` y produce exactamente `{rule:, message:, blocking:}`.
13. Las cinco reglas de la propuesta §4.4 estan implementadas y cada una tiene al menos un test que
    la dispara y uno que no.
14. Los cuatro parametros numericos y las cinco banderas de bloqueo se leen de `parameterizations`;
    existe un test que cambia una fila y ve cambiar el resultado.
15. La lista de conceptos no permitidos se lee de filas con el prefijo
    `GASTOS IA - CONCEPTO NO PERMITIDO - ` y cae a `DEFAULT_CONCEPTS` cuando no hay ninguna.
16. `rake parameterizations_gastos_ia:install` corre dos veces seguidas sin crear filas duplicadas y
    sin pisar un valor modificado a mano (verificable: cambiar un valor, re-correr, comprobar que
    sigue cambiado).
17. **No hay ninguna migracion nueva en `db/migrate/` en este PR.**
18. La regla de coherencia **no** se evalua cuando falta `:comprobante_total`.
19. `ExpenseRuleService.validate` no lanza excepcion con `attrs` vacio, con claves string, ni con
    fechas o numeros basura.

**Endpoint y guard**

20. `POST /extract_receipt/report_expenses` esta en `config/routes.rb`.
21. Sin el permiso `"Gastos" / "Crear"` responde **403** con la forma estandar de error de permiso.
22. Existe el test `assert_no_difference("ReportExpense.count")` sobre el endpoint y pasa.
23. La respuesta de exito trae las cinco claves del contrato D.1: `type`, `fields`, `confidence`,
    `warnings`, `rule_violations`.
24. Con moneda distinta de COP, `invoice_value` se calcula como `(foreign_value * exchange_rate).round(2).to_f`
    y `foreign_value` conserva el valor del comprobante (invariante #3).
25. Si `ExchangeRateService.fetch` falla, `invoice_*` quedan en `nil` y hay un warning; **no** se
    inventa una tasa.
26. `extract_receipt` **no** esta en el `skip_before_action :verify_authenticity_token`.
27. `POST /report_expenses` con una violacion bloqueante no crea el registro y devuelve
    `type: "error"` con el mensaje de la regla.
28. `POST /report_expenses` con una violacion **no** bloqueante si crea el registro.
29. `PATCH /update_filter_values` sigue aceptando gastos que violan reglas (el guard no lo alcanza).
29.1. **(nuevo, correccion 5)** Cuando el modelo se pasa del tiempo, el endpoint responde **HTTP 200**
    con `type: "error"` y el mensaje `"No se pudo leer el comprobante. Complete los datos
    manualmente"` **en menos de 20 s** (contrato §D.1). Existe el test
    `test_extract_receipt_responde_error_estandar_cuando_el_modelo_se_pasa_del_timeout` y **no hay
    ningun `Timeout.timeout` en el diff**: el corte lo hace el `timeout: 18` del cliente del SDK.

**Transversales**

30. `bin/rails test` corre con **0 failures y 0 errors**.
31. **RETIRADO por auditoría.** La fixture `parameterizations.yml` la crea el paquete 01, que la
    verifica en su test guardián `fixtures_integrity_test.rb` (con `user_id:`, nunca `user:`).
32. **RETIRADO por auditoría.** El inventario de `test/fixtures/files/` es del paquete 01 (§7.12).
33. `Gemfile` declara `gem "anthropic"` con version pineada y `Gemfile.lock` esta actualizado.
34. Ningun archivo de `app/javascript/`, `app/views/`, `app/models/`, `db/`, `app/tools/`,
    `test/fixtures/`, `test/e2e/` ni `test/test_helper.rb` aparece en el diff del PR. Lo unico que
    este paquete toca de `app/controllers/report_expenses_controller.rb` es el guard de reglas y la
    accion `extract_receipt` —de la que **es dueño** por fila propia en §7.2—, coordinadas con el
    paquete 07 en el PR.

---

## Riesgos y trampas

1. **`max_retries` del SDK.** El default es 2. Con `timeout: 18` eso son hasta 54 segundos de un
   hilo de Puma bloqueado (Puma tiene 5 hilos, `config/puma.rb:8`). Tres capturas simultaneas con
   la API caida dejan la aplicacion entera sin capacidad de atender. **`max_retries: 0` es
   obligatorio.** No usar `Timeout.timeout` de Ruby como red de seguridad: interrumpe hilos en
   puntos arbitrarios y puede dejar la conexion de ActiveRecord en estado inconsistente.

2. **`Base64.encode64` vs `strict_encode64`.** `encode64` inserta `\n` cada 60 caracteres y la API
   rechaza el payload con un 400 que no dice nada util. Es el error mas comun al implementar esto.

3. **Costo por token de las imagenes.** Un comprobante fotografiado a resolucion completa puede
   costar hasta ~4.800 tokens de entrada en la familia Claude 5. Con volumen alto eso se nota. **No
   se implementa reduccion de resolucion en este paquete** (exigiria MiniMagick, que la arquitectura
   §4.8 decidio no meter en el camino critico). Se anota como palanca disponible: si el costo real
   duele, reducir el lado largo a 1568 px antes de mandar es un cambio localizado en
   `build_source`. Medir antes de optimizar.

4. **HEIC.** iPhone puede subir `.heic` desde Safari. El `ReceiptUploader` lo acepta como adjunto
   pero la API de vision **no** lo soporta. El usuario vera "el formato no se puede leer
   automaticamente" y tendra que digitar. Por WhatsApp esto no pasa (WhatsApp convierte a JPEG).
   Si al cliente le molesta, la salida es MiniMagick (ya esta en el `Gemfile` y ImageMagick esta en
   el `Aptfile`), pero es alcance nuevo.

5. **La confianza que reporta el modelo es auto-reportada, no calibrada.** Un `0.94` no significa
   "94% de probabilidad de estar bien". Sirve para ordenar campos por sospecha y para decidir cual
   resaltar; **no sirve como garantia**. Por eso la persona siempre confirma y por eso el umbral de
   anulacion (0.30) es conservador. No presentarle al cliente estos numeros como una metrica de
   exactitud.

6. **El agujero del MCP — YA CERRADO por la auditoria (§7.5).** El guard de reglas vive en
   `ReportExpensesController` y la tool `report_expenses_create` construye el `ReportExpense`
   directamente, sin pasar por ahi. Eso habria dejado a WhatsApp esquivando las cinco reglas. **Ya
   esta resuelto**: el paquete 11, Tarea 8, llama a `ExpenseRuleService.validate` antes del save y
   rechaza con `type: "error"` si hay una violacion `blocking: true`, con test obligatorio en
   `test/tools/report_expenses_create_tool_test.rb`. **No hay que abrir ningun issue**; lo que si
   hay que hacer es no romper la firma de `validate` ni la de `Violation#to_h`, porque el 11 depende
   de ellas como dependencia de codigo.

7. **Conflicto de merge en `report_expenses_controller.rb` — mitigado por §7.2.** El archivo tiene
   **un solo dueño: el paquete 07** (strong params, filtros, orden, cableado presupuestal y la
   accion `extract_receipt`). Este paquete aporta el guard al comienzo de `create` y `update` y le
   entrega al 07 el codigo de `extract_receipt`. El 07 va en la ola 4 y este paquete en la ola 3
   (§7.3): **este paquete mergea primero y el 07 integra sobre lo que encuentre**. No reescribir
   regiones ajenas del archivo.

8. **Fixture que tumba la suite (riesgo del paquete 01, no de este).** `test/fixtures/parameterizations.yml`
   es nueva y `fixtures :all` la cargara en **todos** los tests del proyecto. `Parameterization` **no
   declara `belongs_to :user`**, asi que la forma `user: admin` lanza `Fixture::FixtureError` y tumba
   la suite entera con un error que no menciona parametrizaciones (§5.4.1). **La forma correcta es
   `user_id: <%= ActiveRecord::FixtureSet.identify(:admin) %>`**, sin condicionales. La fixture y esa
   asercion son del **paquete 01** (correccion 1); este paquete solo la consume y corre
   `bin/rails test` completo antes de mergear.

9. **La regla de duplicados sin el indice es un seq-scan.** Si este paquete se mergea antes que la
   migracion `20260403000001` del Paquete 02, cada creacion de gasto barre `report_expenses`
   completa. No mergear antes.

10. **`ExpenseRuleService` consulta la BD en cada `validate`.** Dos queries indexadas. Es
    despreciable en el flujo de captura, pero **no llamarlo dentro de un bucle** (por ejemplo, en el
    reevaluo masivo de presupuesto o en `ReportExpense.import`). Si alguna vez hace falta, se pasa
    la configuracion resuelta por parametro; no se agrega cache global.

11. **`money_value` es `integer`.** Un tope de valor por encima de 2.147.483.647 no se puede
    configurar. Con COP eso son ~2.147 millones por gasto; suficiente, pero hay que decirlo. Este
    paquete lo deja escrito en el codigo (comentario del servicio y de la rake task) y el **paquete
    13** lo lleva a `docs/GUIA-REGLAS-NEGOCIO.md` (§7.11), en vez de que alguien lo descubra
    guardando y viendo un error de Postgres.

12. **Extraer nunca puede bloquear registrar.** Si el servicio de extraccion falla por cualquier
    motivo, el usuario tiene que poder seguir digitando el gasto a mano. Cualquier implementacion
    que devuelva un 500, que deje el modal en estado de carga permanente o que impida el submit
    incumple el contrato D.1 y la promesa comercial §4.6.

13. **`ANTHROPIC_API_KEY` en logs.** No loguear el objeto cliente ni los kwargs completos de la
    llamada. En el `rescue` generico se loguea `e.class` y `e.message`, nunca el request. Y
    `config/application.yml` esta gitignorado: la clave no puede entrar al repo.

---

## Discrepancias con la arquitectura

**D1. Donde se configuran las reglas: `parameterizations` no puede guardar listas de texto.**

La arquitectura §6.8 recomienda "valores por defecto parametrizables desde la tabla
`parameterizations` (que ya existe)". Correcto para los cuatro parametros numericos. Pero
`parameterizations` tiene exactamente tres columnas de datos (`name` string, `number_value` integer,
`money_value` integer) — **ninguna de texto** — y una de las cinco reglas es una *lista de palabras*
("conceptos no permitidos, ej. licores"). No cabe.

Se resuelve **sin migracion**, con una fila por palabra y la palabra embebida en el `name`
(`GASTOS IA - CONCEPTO NO PERMITIDO - LICOR`). Es feo de leer en la tabla, pero:
- no toca `db/` ni la numeracion de migraciones reservada de §1 (que no tiene un hueco asignado a
  este paquete);
- funciona con la pantalla de Parametrizaciones existente sin tocar ni una linea de React
  (`parameterization_params` ya permite `:name`);
- cumple literalmente "parametrizables sin desarrollo nuevo".

**Alternativa descartada, para que quede escrita:** `add_column :parameterizations, :text_value, :text`
con una migracion `20260405000001`, mas `annotate` sobre el modelo, mas la fixture, mas
`parameterization_params`, mas exponer el campo en `components/Parameterizations/index`. Es mas
limpio en el dato y mas caro en alcance: toca `db/` (territorio del Paquete 02) y React (territorio
del Paquete 09). Si el dueno de la arquitectura prefiere esa via, **el cambio se hace en
`00-ARQUITECTURA.md` §1 agregando la migracion a la tabla de numeracion reservada**, y este paquete
se ajusta en una tarea de 30 minutos.

**D2. La arquitectura no dice donde se *aplican* las reglas en el flujo web.**

§3 Bloque D.1 define el endpoint de captura asistida, y §4.2 define `ExpenseRuleService` como
"fuente unica de las reglas: la usan el controller web, el endpoint de extraccion y la tool MCP".
Pero ni §2 (matriz de estados) ni §3 Bloque B.1 (`POST /report_expenses` modificado) mencionan el
punto de aplicacion ni que pasa cuando una regla se viola al guardar.

Este paquete lo resuelve con un **guard en `ReportExpensesController#create` y `#update`** que
devuelve la forma de error estandar de §3 cuando hay una violacion `blocking`. Se descarta la
validacion a nivel de modelo porque romperia `update_filter_values` (que hace `.update` sobre una
relacion entera) y `ReportExpense.import` (historicos que violan antiguedad por definicion). Ver la
justificacion completa en la tarea 15.

Consecuencia que hay que aceptar por escrito: **no existe un estado persistido de "viola reglas"**.
Un gasto que entra hoy con reglas permisivas y manana infringe una regla nueva no se marca en
ninguna parte. Eso es coherente con §2 (que fija exactamente tres estados y dice que ninguno mas
existe), pero significa que las reglas son un control *de entrada*, no un atributo del gasto. Si el
cliente quiere una bandeja de "gastos que violan reglas", es alcance nuevo con columna nueva.

**D3. Clasificacion bloqueante/advertencia no esta en la arquitectura.**

§3 D.1 muestra `rule_violations[].blocking` en el JSON pero no dice que regla es cual. Se decide
aqui (antiguedad y coherencia advierten; concepto, duplicado y tope bloquean) y **se hace
configurable** con una fila `GASTOS IA - BLOQUEA <REGLA>` para que el cliente lo mueva sin
desarrollo. Si esto contradice lo que el cliente pida por escrito (§6.8, "reglas por escrito"), solo
cambian valores en `parameterizations`, no codigo.

**D4. Coherencia declarado vs comprobante solo aplica donde hay comprobante extraido.**

La propuesta §4.4 la lista como una de las cinco reglas sin decir cuando se evalua. Como el total
del comprobante no se persiste en ninguna columna (§1 no crea una), la regla solo puede evaluarse en
el momento en que el valor extraido esta en memoria: el endpoint de captura asistida y la tool MCP.
El guard de `create` no la evalua. Es una limitacion real del modelo de datos, no una omision de
implementacion, y hay que decirsela al cliente en la capacitacion.

**D5. `RECEIPT_EXTRACTION_ENABLED` en el `webServer` de Playwright.**

> **RETIRADA por auditoría.** Este paquete **no toca `test/e2e/playwright.config.js`** (dueño único:
> paquete 01) y **no exige `RECEIPT_EXTRACTION_ENABLED=false` en el entorno E2E**: gana el stub de
> `call_vision_model` del paquete 12. Ver la corrección 4 del bloque al inicio.

---

## Objeciones a la auditoría

Ninguna corrección se revoca. Las tres ambigüedades del bloque vinculante **quedaron cerradas por
la reauditoría**; se conserva el registro con la resolución de cada una.

**O1. ✅ CERRADA. El nombre canónico es `test/controllers/report_expenses_extract_receipt_test.rb`.**
La corrección 5 mandaba agregar el test de timeout a `report_expenses_extract_test.rb` (nombre
corto), mientras la tabla de archivos y las 3 menciones del cuerpo —y el 07 en su discrepancia 3—
usan el largo. Se corrigió **la corrección 5**, que era la única aparición del nombre corto, para
que cite el largo. No hay `git mv` ni riesgo de terminar con dos archivos de test para el mismo
endpoint. El caso 16 sigue donde está.

**O2. ✅ CERRADA a favor de este paquete: `extract_receipt` es del 10.** §7.2 lo listaba bajo el
dueño 07 y dejaba al 10 "solo el guard de reglas", pero el 07 lo ponía en su lista de "lo que este
paquete NO hace" y concluía que se mantenía fuera de alcance: la matriz nombraba a un dueño que se
declaraba **no-dueño**, así que el endpoint no lo escribía nadie o lo escribían dos. **Resolución:**
`extract_receipt` **salió de la fila del 07** y tiene **fila propia en §7.2 con dueño 10** —la
acción, su ruta, el helper `build_draft` y los 16 tests de
`test/controllers/report_expenses_extract_receipt_test.rb`, más los criterios 20–26 y 29.1—, como
**excepción documentada** al dueño del archivo, igual que `delete_receipt`/`download_receipt` del
06. Este paquete lo mergea en la ola 3b y el 07 (ola 4) lo recibe escrito y no lo reescribe. Se
eligió esta opción, de una línea, en vez de mover la Tarea 14 y los 16 tests al 07, que este mismo
documento advertía que "no es una edición cosmética".

**O3. `test/support/**` en §7.2 vs. la nota de §7.2.** La fila de la matriz da `test/support/**` al
paquete 01, pero la nota inmediatamente posterior ("Dobles de prueba") dice que los paquetes 05, 10
y 11 ponen ahí sus dobles y sus helpers (`with_fake_extractor` por nombre) y que lo único del 01 es
la autocarga en `test_helper.rb`. ✅ **CERRADA como se pedía.** La fila de la matriz ya no da todo `test/support/**` al 01: ahora
dice **"reparto — el 01 pone el autoload en `test_helper.rb` y es dueño de la convención; los
paquetes 05, 10 y 11 crean ahí sus propios dobles y helpers, un archivo por paquete, y no tocan
`test_helper.rb`"**. Este paquete crea `test/support/fake_anthropic_client.rb` con el doble y el
módulo `WithFakeExtractor`, y no toca `test_helper.rb`.
