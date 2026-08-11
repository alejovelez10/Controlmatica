# Paquete 11 — MCP: tools nuevas, exposicion, actor por telefono y contrato con Taimes

## 🔴 CORRECCIONES DE AUDITORÍA (vinculantes — leer ANTES que el resto del documento)

> Estas correcciones **mandan sobre cualquier texto de este archivo** que las contradiga.
> Consolidadas en `00-ARQUITECTURA.md` §7.

1. 🔴 **Tu Discrepancia D1 está RESUELTA: la migración `20260405000001_add_phone_to_users.rb` es
   legítima.** Ya figura en la tabla de §1 de la arquitectura con este paquete como dueño, y el
   **criterio 1 del paquete 02 fue reformulado** a *"en el diff de ESTE PR hay exactamente 6
   archivos nuevos y ninguno más"*. Obligación: la migración usa **`def up` / `def down`**, nunca
   `def change`, igual que las otras seis.
2. 🔴 **TAREA 8 — el motor de reglas SÍ se aplica en el camino MCP.** Era un incumplimiento de la
   promesa comercial §4.6 (*"la validación es la misma sin importar por dónde entre el gasto"*):
   el guard vivía solo en `ReportExpensesController` y esta tool construía el `ReportExpense`
   directamente. Una frase en la `description` de la tool es **una instrucción de prompt, no un
   control de servidor**. Instrucción obligatoria, **antes del save**:
   ```ruby
   violations = ExpenseRuleService.validate(attrs.merge(actor: creator))
   if violations.any? { |v| v[:blocking] }
     return tool_json(type: "error",
                      message: violations.select { |v| v[:blocking] }.map { |v| v[:message] },
                      rule_violations: violations)   # NO se llama a save
   end
   ```
   - **`ExpenseRuleService` entra en la tabla de dependencias de CÓDIGO** de este paquete, no solo
     en la de la tool `expense_rules_validate`.
   - **Criterio de aceptación nuevo (35)**: un gasto con violación bloqueante es rechazado por MCP.
   - **Tests nuevos en `test/tools/report_expenses_create_tool_test.rb`**: gasto duplicado y gasto
     sobre el tope de valor dejan `ReportExpense.count` **sin cambio** y devuelven `type: "error"`.
3. 🔴 **TAREA 8 — se usa `persist_with_evaluation!`, no `save` + `evaluate!` + `reload`.** Con el
   contrato del paquete 04, **`evaluate!` asigna en memoria y NO guarda**; el `re.reload` posterior
   descartaba `budget_status`, `budget_reason` y `expense_budget_id`, dejando **todo gasto creado
   por WhatsApp en `sin_presupuesto`**. Además `evaluate!` exige correr **dentro de
   `with_center_lock`**, cosa que la tool no hacía. Instrucción correcta (§7.4):
   ```ruby
   result = ExpenseBudgetService.persist_with_evaluation!(re, actor: creator)
   ```
   Ese método toma el lock, evalúa, guarda y reevalúa: es exactamente el punto de entrada que el
   04 diseñó para esto. La idempotencia de `evaluate!` que este paquete exige por contrato ahora
   **tiene un test en el paquete 04** (`test_evaluate_es_idempotente`).
4. 🔴 **`app/tools/exchange_rates_get_tool.rb` es de ESTE paquete y de nadie más.** El paquete 05
   **borró su Tarea 18** y el registro de `exchange_rates` en `records_search_tool.rb` (§7.7).
   Contenido canónico:
   - `KEYS = %i[id currency rate_date effective_date rate_to_cop source fetched_at]` — **con
     `effective_date`**, que la decisión de §1.5 confirmó y el paquete 02 crea. Tu versión de 5
     claves queda derogada.
   - Consume **`result.errors` (array)**, que es el `Result` canónico del proyecto (§4.2). Tu
     `result.errors.join` era el correcto; el `result.error` singular del 05 fue corregido allá.
5. **`ReportExpensesListTool::KEYS`: este paquete NO la redefine entera.** Cada paquete agrega solo
   sus claves sobre la lista canónica de 28 (§7.7): este aporta `budget_status`, `budget_reason` y
   `expense_budget_id`; el **05** aporta las 7 de moneda; el **06** aporta `accounting_approved` y
   `receipt_file_url`. Criterio compartido por los tres: `KEYS.size == 28` y `KEYS.uniq == KEYS`.
6. 🔴 **El poblado de `users.phone` NO es de este paquete: es del paquete 13** (§7.11), y es
   **precondición dura de tus criterios de aceptación 27 y 28**. Este paquete crea la columna, el
   normalizador y la resolución de actor; el 13 levanta el inventario de usuarios activos, recoge
   y normaliza los teléfonos, **detecta duplicados** (un número repetido ⇒ persona NO identificada,
   se devuelve **ningún** actor) y ejecuta `rake users:import_phones`. **Sin ese poblado, en modo
   estricto TODO gasto por WhatsApp se rechaza** — es tu propio Riesgo #4, ahora con dueño.
   Si la Tarea 0 (§7.10, ítem 0.7) revela que no hay teléfonos, se renegocia el alcance de la
   Parte B **antes** de escribir código.
7. **La configuración del agente dentro de Taimes y la transcripción de voz son del paquete 13**
   (§7.11), con criterios verificables en staging: canal WhatsApp conectado, skill "Gastos IA"
   cargada con las 7 tools, **transcripción probada con al menos 3 notas de voz reales**, y el
   script de verificación manual de este paquete **ejecutado y firmado**. Este paquete entrega la
   **especificación** (Anexo A + `docs/TAIMES-AGENTE-GASTOS.md`), que es lo que declara; ya no
   queda huérfano lo que viene después.
8. **`test/support/mcp_test_helpers.rb` se autocarga**, no se carga con `require_relative`. El
   paquete 01 pone `Dir[Rails.root.join("test/support/**/*.rb")].each { |f| require f }` en
   `test_helper.rb` (§7.2), así que la intención original —no colisionar con el 01— se cumple sin
   el `require_relative`, que además provocaría doble carga.
9. **`ReportExpense::BUDGET_STATUS_LABELS` ya existe**: la define el **paquete 04** (§7.4). Este
   paquete la consume sin fallback, como ya hacía.
10. **Numeración canónica (§7.1)**: tu numeración era la correcta. Dependencias reales: **01**
    (infra de pruebas), **02** (esquema), **04** (`ExpenseBudgetService`, `BUDGET_STATUS_LABELS`),
    **05** (`ExchangeRateService`), **06** (`receipt_file`, `mount_uploader`, contabilidad) y
    **10** (`ExpenseRuleService`).

> Lectura previa obligatoria: `docs/plan-gastos-ia/00-ARQUITECTURA.md` (§1 modelo de datos,
> §3 Bloque G tools MCP, §4.1 convenciones, §5.2 nivel 2, §6.3 actor por telefono, §6.5 S3).
> Todo lo que este paquete decide sin respaldo explicito de la arquitectura va marcado como
> **Asumido:**. Las diferencias reales estan en "Discrepancias con la arquitectura" al final;
> ninguna se resuelve en silencio.
>
> Este paquete **no toca React, ni controllers web, ni vistas, ni Excel**. Solo `app/tools/`,
> `app/controllers/mcp_controller.rb`, una migracion de `users`, `app/models/user.rb`,
> dos metodos de `ReportExpense`, sus pruebas y la documentacion de integracion con Taimes.

---

## Objetivo

Al terminar, el agente de Taimes puede registrar un gasto completo por WhatsApp desde una foto o
una nota de voz: identifica a la persona por su numero de telefono (y **rechaza** si no la
identifica, sin caer nunca al Administrador generico), consulta el presupuesto disponible y la
tasa de cambio antes de guardar, valida el gasto contra el motor de reglas del servidor, sube el
comprobante a S3 por URL firmada y lo asocia al gasto, y lee de vuelta el estado presupuestal
resultante. Las 7 tools nuevas y las 3 modificadas quedan expuestas por `tools/list`, cubiertas
por pruebas (hoy la cobertura del MCP es **cero**) y documentadas como contrato para quien
configure el agente del lado Taimes.

---

## Dependencias

| Debe estar terminado antes | Que se consume exactamente | Por que bloquea |
|---|---|---|
| **Paquete 01 — infraestructura de pruebas** | `bin/rails test` en 0 failures/0 errors, `test/test_helper.rb` con `as_user` y `Devise::Test::IntegrationHelpers`, las 4 fixtures rotas arregladas, `users.yml` y `cost_centers.yml` sanas, `current_actor_id` en `ReportExpense` (Capa 1 de §5.3) | **Todas** las pruebas de este paquete crean o editan `ReportExpense`. Sin la Capa 1 y sin `as_user`, cada una revienta en `User.current.id`. Y sin la suite arrancando no se puede verificar nada. |
| **Paquete 02 — migraciones y esquema** | Las 6 migraciones aplicadas: `expense_budgets`, `exchange_rates`, y las 14 columnas nuevas de `report_expenses` (`budget_status`, `budget_reason`, `expense_budget_id`, `currency`, `foreign_*`, `exchange_rate*`, `accounting_*`, `receipt_file`) | `Mcp::Serialize.record` hace `rec.public_send(k)` **por cada key**. Si se amplia `ReportExpensesListTool::KEYS` con una columna que no existe todavia, **toda** llamada a `report_expenses_list`, `report_expenses_get`, `report_expenses_create` y `records_search(entity:"report_expenses")` responde con un `NoMethodError` 500. Es el bloqueo mas duro del paquete. |
| **Paquete 04 — presupuesto y aprobacion** | `ExpenseBudget` (modelo), `ExpenseBudgetService.available_for(cost_center_id:, user_id:, exclude_expense_id: nil)`, **`ExpenseBudgetService.persist_with_evaluation!(expense, actor:)`** (punto de entrada unico para guardar: toma el lock, evalua, guarda y reevalua, §7.4), `evaluate!` **idempotente**, constante `ReportExpense::BUDGET_STATUS_LABELS` | `expense_budgets_available` y `expense_budgets_list` son envoltorios del servicio: este paquete **no reimplementa** la aritmetica de §2.6. `report_expenses_create` guarda **a traves de `persist_with_evaluation!`** (correccion 3 del bloque de auditoria); no llama a `save` ni a `evaluate!` por su cuenta. |
| **Paquete 05 — multimoneda y TRM** | `Currency::CODES`, `ExchangeRate` (modelo, con `effective_date`), `ExchangeRateService.fetch(currency:, date:)` devolviendo `Result` con `ok?`, `value`, `errors` (array) | `exchange_rates_get` es un envoltorio de `ExchangeRateService.fetch`. El `input_schema` de `report_expenses_create` publica `Currency::CODES` en su descripcion. El 05 **no** escribe `exchange_rates_get_tool.rb`: es de este paquete (§7.7). |
| **Paquete 06 — comprobante y contabilidad** | `ReceiptUploader` con `extension_allowlist` / `content_type_allowlist` / `size_range`, `mount_uploader :receipt_file, ReceiptUploader` en `ReportExpense`, y las ENV `AWS_ACCESS_KEY` / `AWS_SECRET_KEY` / `AWS_BUCKET` verificadas en Heroku (los 4 uploaders a fog son del **03**, §7.2) | Las dos tools de comprobante montan sobre CarrierWave. Sin `mount_uploader` no existe `remote_receipt_file_url=`. Sin las ENV no hay URL firmada posible (ver el modo de degradacion en la tarea 15). Ademas el 06 aporta `accounting_approved` y `receipt_file_url` a la lista canonica de `KEYS` (§7.7). |
| **Paquete 10 — IA: extraccion y motor de reglas** | `ExpenseRuleService.validate(attrs)` devolviendo `[{rule:, message:, blocking:}]` | **Dependencia de codigo, no solo de la tool `expense_rules_validate`** (correccion 2 del bloque de auditoria): la Tarea 8 llama al servicio **dentro de `report_expenses_create`** como guard de servidor antes de guardar. Este paquete **no escribe ni una regla de negocio**: la fuente unica es el servicio (arquitectura §4.2, §7.5). |

**Contrato que este paquete EXIGE a sus dependencias** (declarado aqui para que quien lo
implemente lo sepa; no lo implementa este paquete):

1. `ExpenseBudgetService.evaluate!(expense, actor:)` es **idempotente**: llamarlo dos veces
   seguidas sobre el mismo gasto produce el mismo `budget_status` y el mismo `budget_reason`, y
   no duplica `RegisterEdit`. Este paquete **no lo llama directamente**: guarda a traves de
   `persist_with_evaluation!`, que es el punto de entrada unico del 04 (§7.4) y el que toma el
   `with_center_lock` que `evaluate!` exige. La idempotencia sigue siendo requisito porque
   `persist_with_evaluation!` evalua y reevalua; **el test que la verifica vive en el paquete 04**
   (`test_evaluate_es_idempotente`), no aqui.
2. `ExpenseBudgetService.available_for` y `ExpenseRuleService.validate` **no leen `current_user`
   ni `User.current`** (arquitectura §4.2). Si lo hicieran, el MCP los rompe.
3. `ExchangeRateService.fetch` **no lanza excepciones** hacia arriba: devuelve `Result` con
   `ok? == false` en timeout y en moneda no soportada.

**Lo que este paquete NO hace (frontera explicita, no invadir):**

- No crea `ExpenseBudgetService`, `ExchangeRateService`, `ExpenseRuleService` ni
  `ReceiptExtractionService`.
- No crea `ReceiptUploader` (paquete 06) ni corrige los 4 uploaders existentes ni
  `config/initializers/carrierwave.rb` (paquete 03, §7.2).
- No crea las migraciones de `report_expenses`, `expense_budgets` ni `exchange_rates`
  (paquete 02). **Si** crea `20260405000001_add_phone_to_users.rb`, que §7.2 le asigna como
  **unica excepcion**.
- No toca `ReportExpense.search` ni `SEARCH_KEYS` (paquete 03, §7.2) ni ningun controller web.
- No expone `update` ni `delete` de nada. La politica sigue siendo lectura + creacion + las
  acciones de dominio explicitamente listadas en `ALWAYS_EXPOSED`.
- **No puebla `users.phone`.** La columna, el normalizador y la resolucion de actor son de este
  paquete; el **inventario, la recoleccion, la deteccion de duplicados y el
  `rake users:import_phones` son del paquete 13** (§7.11), y son **precondicion dura** de los
  criterios de aceptacion 27 y 28.
- No configura nada dentro de Taimes ni verifica la transcripcion de voz: eso es del
  **paquete 13** (§7.11). Este paquete entrega la **especificacion** (Anexo A +
  `docs/TAIMES-AGENTE-GASTOS.md`) y el script de verificacion manual; el 13 lo ejecuta y lo firma.
- No crea fixtures ni archivos de `test/fixtures/`: `users.yml` y `test/fixtures/files/**` son del
  **paquete 01** (§7.2 y §7.12). Este paquete solo **agrega etiquetas** a `users.yml`.

---

## Archivos

### A crear

| Ruta | Que se hace |
|---|---|
| `db/migrate/20260405000001_add_phone_to_users.rb` | Agrega `users.phone` (string) y `users.phone_normalized` (string) + indice **no unico** `index_users_on_phone_normalized`. |
| `app/tools/users_find_by_phone_tool.rb` | Tool `users_find_by_phone`: resuelve un usuario por telefono en modo estricto (sin fallback). Devuelve `found:false` con motivo si no hay match o si hay ambiguedad. |
| `app/tools/expense_budgets_list_tool.rb` | Tool `expense_budgets_list`: partidas presupuestales por centro y/o persona. Define `KEYS`. Solo lectura. |
| `app/tools/expense_budgets_available_tool.rb` | Tool `expense_budgets_available`: asignado / gastado / disponible de una persona en un centro. Envoltorio de `ExpenseBudgetService.available_for`. |
| `app/tools/exchange_rates_get_tool.rb` | Tool `exchange_rates_get`: tasa por moneda + fecha. Envoltorio de `ExchangeRateService.fetch`. Define `KEYS`. |
| `app/tools/expense_rules_validate_tool.rb` | Tool `expense_rules_validate`: valida un gasto candidato contra `ExpenseRuleService` y (opcionalmente) contra el presupuesto, en una sola llamada. |
| `app/tools/report_expenses_receipt_url_get_tool.rb` | Tool `report_expenses_receipt_url_get`: emite una URL firmada `PUT` de S3 para que el agente suba el binario directo, sin pasar por el contexto del modelo. |
| `app/tools/report_expenses_attach_receipt_tool.rb` | Tool `report_expenses_attach_receipt`: confirma la subida (`upload_key`) o recibe `file_base64` como fallback, y asocia el archivo al gasto via CarrierWave. |
| `app/tools/mcp/s3_direct_upload.rb` | Modulo `Mcp::S3DirectUpload`: `configured?`, `presign_put`, `presign_get`, `head`, `delete`, `build_key`. Aisla fog-aws de las tools. |
| `test/support/mcp_test_helpers.rb` | Modulo `McpTestHelpers`: `with_mcp_key`, `ctx(...)`, `tool_text`, `tool_json`, `assert_tool_error`. **Se autocarga** por el `Dir[Rails.root.join("test/support/**/*.rb")]` que el paquete 01 pone en `test_helper.rb` (§7.2): cada test solo hace `include McpTestHelpers`, **sin `require_relative`**. |
| `test/tools/application_tool_actor_test.rb` | Resolucion de actor: correo, telefono, ambiguedad, estricto vs laxo, restauracion de `User.current`. |
| `test/tools/report_expenses_create_tool_test.rb` | Campos nuevos escribibles, campos del servidor NO escribibles, actor estricto, **guard del motor de reglas** (§7.5) y evaluacion presupuestal persistida via `persist_with_evaluation!` (§7.4). |
| `test/tools/report_expenses_read_tools_test.rb` | `report_expenses_list` / `_get`: campos nuevos presentes, `receipt_file_url`, filtros. |
| `test/tools/expense_budgets_tools_test.rb` | `expense_budgets_list` y `expense_budgets_available`. |
| `test/tools/exchange_rates_get_tool_test.rb` | Hit de cache, COP identidad, error de fuente, fecha desplazada. |
| `test/tools/expense_rules_validate_tool_test.rb` | Violaciones bloqueantes y no bloqueantes, bloque de presupuesto embebido. |
| `test/tools/report_expenses_receipt_tools_test.rb` | URL firmada, validaciones de tipo/tamano, `upload_key` ajeno rechazado, base64, idempotencia. |
| `test/tools/users_find_by_phone_tool_test.rb` | Match, sin match, ambiguo, sin campos sensibles. |
| `test/controllers/mcp_controller_exposure_test.rb` | Politica `exposed?` unitaria: las 7 nuevas expuestas, `*_update` / `*_delete` no. |
| `test/integration/mcp_protocol_test.rb` | JSON-RPC real contra `POST /mcp`: `tools/list`, `tools/call`, auth por header y por query param, `X-Actor-Phone`. |
| ~~`test/models/user_phone_test.rb`~~ | ✅ **YA CREADO** en `feature/gastos-presupuesto-ia` (17 casos, verdes). `User.normalize_phone`, el callback `set_phone_normalized` y el scope `by_normalized_phone`. Este paquete no lo reescribe; si necesita casos nuevos, los **agrega**. |
| `docs/TAIMES-AGENTE-GASTOS.md` | Especificacion del agente del lado Taimes: skills, orden de tools, flujo por foto y por voz, confirmacion, manejo de fallos. Es un **entregable al cliente** (plan interno Fase 8: "guia de configuracion de las reglas del agente"). |

**Archivos de prueba que este paquete NO crea** (dueño unico = paquete 01, §7.2 y §7.12); solo se
declaran como "ya existen" y se consumen:
`test/fixtures/files/comprobante.pdf` (~1 KB, empieza con `%PDF-`) y
`test/fixtures/files/malicioso.exe` (20 bytes, para el rechazo por extension). El nombre canonico
del archivo prohibido es **`malicioso.exe`**, no `comprobante.exe`.

### A modificar

| Ruta | Que se hace |
|---|---|
| ~~`app/models/user.rb`~~ (`normalize_phone`) | ✅ **YA HECHO** en `feature/gastos-presupuesto-ia` (ver el banner de la Tarea 2). `self.normalize_phone(raw)`, callback `before_save :set_phone_normalized` y scope `by_normalized_phone` ya estan en el modelo. Este paquete solo los **consume**. |
| ~~`app/models/report_expense.rb`~~ | **Este paquete NO lo modifica.** `receipt_file_url` (metodo publico, no columna) **ya lo creo el 06**: esta en su tabla "A modificar", el 06 es dependencia declarada de este paquete (§7.1) y §7.7 le asigna la clave 28. Aqui **solo se consume**. La condicional *"solo si el 06 no lo creo ya"* era una bifurcacion en tiempo de ejecucion —prohibida por §7.10 y por el README §8— cuya condicion **nunca puede ser verdadera**, y solo podia inducir a duplicar el metodo. |
| `app/tools/application_tool.rb` | `actor_phone`, `actor_user_by_phone`, `actor_user_strict`, `as_actor_strict`, `NO_ACTOR_MESSAGE`; `actor_user` pasa a considerar telefono antes del fallback. |
| `app/controllers/mcp_controller.rb` | `actor_phone` en `server_context`; `ALWAYS_EXPOSED` pasa de 2 a 6 nombres. |
| `app/tools/report_expenses_list_tool.rb` | `KEYS`: este paquete **agrega solo sus 3 claves** (`budget_status`, `budget_reason`, `expense_budget_id`, posiciones 17–19 de §7.7) sobre la lista canonica de 28; el **05** aporta las 7 de moneda y el **06** las 2 de comprobante/contabilidad. `input_schema` gana filtros `budget_status`, `currency`, `accounting_approved`, `date_from`, `date_to`. |
| `app/tools/report_expenses_create_tool.rb` | **Dueño unico (§7.2).** `input_schema` + `WRITABLE` con los 6 campos de moneda —el paquete **05 borro su bullet duplicado** en el cierre de la reauditoria: la excepcion de §7.7 cubre solo las claves 20–26 del *list* tool, no este archivo—; actor **estricto**; **guard de `ExpenseRuleService.validate` antes de guardar** (§7.5); persistencia via `ExpenseBudgetService.persist_with_evaluation!` (§7.4); respuesta con `budget_message`. |
| `app/tools/records_search_tool.rb` | `registry` y `enum` de `entity` ganan `expense_budgets` y `exchange_rates`. |
| `docs/TAIMES-MCP-INTEGRATION.md` | Catalogo actualizado, seccion de actor por telefono, seccion de comprobante, skill nueva "Gastos IA". |
| `db/schema.rb` | **Consecuencia mecanica de la migracion autorizada** `20260405000001_add_phone_to_users.rb` (unica excepcion que §7.2 concede a este paquete). Se regenera solo al correr `db:migrate` + `RAILS_ENV=test db:test:prepare`. §7.2 asigna el archivo al **02**, que va cinco olas antes: aqui el diff se limita a la fila de `users` y a la `version:`. Se anota en el PR. |
| `app/models/user.rb` (cabecera `annotate`) | Idem: el bloque `# == Schema Information` gana `phone`. Es el mismo archivo que este paquete ya modifica por `normalize_phone`, pero la cabecera es cambio mecanico, no de codigo (DoD punto 9). |
| `test/fixtures/users.yml` (**solo la cabecera `annotate`**) | Idem. ⚠️ El **dueño del archivo es el 01** (§7.2): este paquete **agrega etiquetas** (`telefono_repetido_a/b`, `phone` de `admin` e `ingeniero`) y deja pasar la cabecera que regenera `annotate`. **No lo reescribe.** |

---

## Tareas

Cada tarea es un commit. El orden importa: 1→4 habilitan el actor, 5→6 los campos nuevos,
7→10 las tools de consulta, 11→16 el comprobante, 17 la busqueda generica, 18→24 pruebas y
documentacion.

### Tarea 1 — Migracion `users.phone` + `users.phone_normalized`

`db/migrate/20260405000001_add_phone_to_users.rb`, clase `AddPhoneToUsers`,
`ActiveRecord::Migration[6.1]`:

```ruby
class AddPhoneToUsers < ActiveRecord::Migration[6.1]
  def up
    add_column :users, :phone, :string            unless column_exists?(:users, :phone)
    add_column :users, :phone_normalized, :string unless column_exists?(:users, :phone_normalized)

    unless index_exists?(:users, :phone_normalized, name: "index_users_on_phone_normalized")
      add_index :users, :phone_normalized, name: "index_users_on_phone_normalized"
    end
  end

  def down
    if index_exists?(:users, :phone_normalized, name: "index_users_on_phone_normalized")
      remove_index :users, name: "index_users_on_phone_normalized"
    end
    remove_column :users, :phone_normalized if column_exists?(:users, :phone_normalized)
    remove_column :users, :phone            if column_exists?(:users, :phone)
  end
end
```

- **`def up` / `def down`, nunca `def change`** (correccion 1 del bloque de auditoria): es la misma
  convencion de las seis migraciones del paquete 02, y es lo que hace reversible el `add_index`
  condicional.
- **Indice NO unico.** Asumido: dos usuarios pueden tener el mismo telefono cargado (dato sucio
  heredado). Un indice unico haria fallar la migracion o el backfill. La ambiguedad se resuelve
  en la capa de resolucion (tarea 3): dos matches ⇒ **ningun** actor, no "el primero".
- Despues: `bundle exec annotate` y `RAILS_ENV=test bin/rails db:test:prepare`.
- Actualizar la cabecera `# == Schema Information` de `app/models/user.rb`,
  `app/serializers/user_serializer.rb` (si existe) y `test/fixtures/users.yml`.

### Tarea 2 — `User.normalize_phone` + callback

> ✅ **HECHA — NO REPETIR.** Se implemento en la rama `feature/gastos-presupuesto-ia` junto con el
> pedido del cliente de habilitar el telefono en el formulario de usuario (el campo de UI necesita
> la normalizacion para que la llave sirva). Lo que ya esta en `app/models/user.rb`, exactamente
> como lo especifica esta tarea: `PHONE_MIN_DIGITS`, `PHONE_KEY_LENGTH`, `self.normalize_phone`,
> el scope `by_normalized_phone` y el callback `before_save :set_phone_normalized` (privado).
> Los tests viven en `test/models/user_phone_test.rb` (17 casos, cubren la tabla de este documento
> mas los 10 digitos exactos, el numero mas largo y el scope).
>
> **El paquete 11 NO vuelve a tocar nada de esta tarea.** Lo que sigue pendiente para el 11 son las
> fixtures de telefono (`telefono_repetido_a/b`, `phone` de `admin` e `ingeniero` en
> `test/fixtures/users.yml`) que consumen las Tareas 3 y siguientes: este trabajo **no** las creo,
> para no reescribir un archivo cuyo dueño es el paquete 01.

En `app/models/user.rb`:

```ruby
PHONE_MIN_DIGITS = 7
PHONE_KEY_LENGTH = 10

# "+57 (300) 123-4567" -> "3001234567" ; "300 12" -> nil
def self.normalize_phone(raw)
  digits = raw.to_s.gsub(/\D/, "")
  return nil if digits.length < PHONE_MIN_DIGITS

  digits.length > PHONE_KEY_LENGTH ? digits.last(PHONE_KEY_LENGTH) : digits
end

scope :by_normalized_phone, ->(key) { where(phone_normalized: key) }

before_save :set_phone_normalized

private

def set_phone_normalized
  return unless will_save_change_to_phone? || phone_normalized.blank?

  self.phone_normalized = self.class.normalize_phone(phone)
end
```

- `before_save` y no `before_validation`: `User` ya tiene `before_update :create_edit_register`
  y no hay que meterse en el orden de validaciones de Devise.
- Los ultimos 10 digitos absorben el indicativo `+57` de Colombia y el `whatsapp:` que anteponen
  algunos gateways. Un fijo de 7 digitos (`2 345 678`) se guarda tal cual.

### Tarea 3 — Resolucion de actor por telefono en `ApplicationTool`

En `app/tools/application_tool.rb`, dentro de `class << self`:

```ruby
NO_ACTOR_MESSAGE =
  "Error: no se pudo identificar a la persona que reporta. Envia X-Actor-Phone o " \
  "X-Actor-Email de un usuario registrado en Controlmatica, o indica user_invoice_id " \
  "explicitamente. El gasto NO se registro."

# Telefono del actor recibido en el server_context, ya normalizado, o nil.
def actor_phone(server_context)
  User.normalize_phone(server_context && server_context[:actor_phone])
end

# Resuelve por telefono SIN caer al Administrador. nil si no hay match o si hay
# mas de uno (ambiguedad = no identificado, nunca "el primero").
def actor_user_by_phone(server_context)
  key = actor_phone(server_context)
  return nil if key.blank?

  matches = User.by_normalized_phone(key).order(:id).limit(2).to_a
  matches.size == 1 ? matches.first : nil
end

# Actor estricto: correo primero, telefono despues, SIN fallback.
def actor_user_strict(server_context)
  actor_user_by_email(server_context) || actor_user_by_phone(server_context)
end

# Como as_actor pero aborta con NO_ACTOR_MESSAGE si no hay actor real.
def as_actor_strict(_tenant, server_context = nil)
  actor = actor_user_strict(server_context)
  return text(NO_ACTOR_MESSAGE) unless actor

  previous = User.current
  begin
    User.current = actor
    yield actor
  ensure
    User.current = previous
  end
end
```

Y `actor_user` (el laxo, para lecturas) pasa a considerar el telefono antes del fallback:

```ruby
def actor_user(_tenant = nil, server_context = nil)
  actor_user_strict(server_context) ||
    User.joins(:rol).where(rols: { name: "Administrador" }).order(:id).first ||
    User.order(:id).first
end
```

⚠️ **Trampa que hay que respetar al escribir `as_actor_strict`**: el `ensure` va en un `begin`
interno, **no** a nivel de metodo. Si se copia el `def ... ensure ... end` de `as_actor`, el
`return text(NO_ACTOR_MESSAGE)` dispara el `ensure` con `previous` todavia sin asignar y deja
`User.current = nil` para el resto del request. Hay un test para esto.

### Tarea 4 — `McpController`: `actor_phone` y `ALWAYS_EXPOSED`

En `app/controllers/mcp_controller.rb`:

```ruby
server_context: {
  api_key:     request.headers["X-Api-Key"].presence || params[:api_key],
  actor_email: request.headers["X-Actor-Email"].presence || params[:actor_email],
  # Telefono de WhatsApp del usuario que originó la conversacion en Taimes.
  # Se normaliza en ApplicationTool.actor_phone (ultimos 10 digitos).
  actor_phone: request.headers["X-Actor-Phone"].presence || params[:actor_phone],
},
```

```ruby
ALWAYS_EXPOSED = %w[
  records_search
  records_aggregate
  expense_budgets_available
  expense_rules_validate
  report_expenses_attach_receipt
  users_find_by_phone
].freeze
```

`expense_budgets_list`, `exchange_rates_get` y `report_expenses_receipt_url_get` **no** se
listan: se auto-exponen por sufijo (`_list`, `_get`, `_get`). El comentario del bloque
`ALWAYS_EXPOSED` debe decir explicitamente que aqui solo entran acciones de dominio que no
terminan en `_list` / `_get` / `_create`.

### Tarea 5 — `receipt_file_url` en `ReportExpense`

> **RETIRADA por auditoría (cierre de la reauditoría). Dueño único: paquete 06.**
> `receipt_file_url` **ya existe**: lo crea el 06 (esta en su tabla "A modificar"), que es
> dependencia declarada de este paquete (§7.1) y va tres olas antes. Este paquete **solo lo
> consume** desde `KEYS` (clave 28, §7.7). Se sustituye la condicional por la afirmacion, como se
> hizo con las demas precondiciones escritas: **nada de `grep` previo ni de "si no existe, se
> crea"**. `app/models/report_expense.rb` sale de la tabla "A modificar".

**Forma que el 06 entrega y que este paquete da por cierta** (si no coincide, es un bloqueo contra
el 06, no algo que se arregle aqui):

```ruby
# URL del comprobante (firmada si fog_public = false). nil si no hay archivo.
def receipt_file_url
  receipt_file&.url
rescue StandardError
  nil
end
```

El `rescue` existe porque con `fog_public = false` la firma requiere credenciales validas y una
excepcion de fog **dentro de un serializer** tumbaria la lista entera de gastos. Es requisito de
este paquete hacia el 06, no codigo que se escriba aqui.

### Tarea 6 — `ReportExpensesListTool::KEYS` + filtros

`app/tools/report_expenses_list_tool.rb`.

⚠️ **Este paquete NO redefine `KEYS` entera** (correccion 5 del bloque de auditoria y §7.7).
La lista canonica tiene **28** entradas y **tres paquetes la construyen sumando cada uno sus
propias claves, sin borrar ni reordenar las ajenas**:

| Posiciones | Claves | Quien las agrega |
|---|---|---|
| 1–16 | las 16 actuales, sin tocar | ya existen |
| 17–19 | `budget_status`, `budget_reason`, `expense_budget_id` | **este paquete (11)** |
| 20–26 | `currency`, `foreign_value`, `foreign_tax`, `foreign_total`, `exchange_rate`, `exchange_rate_date`, `exchange_rate_source` | **05** |
| 27–28 | `accounting_approved`, `receipt_file_url` | **06** |

Es decir, el diff de este paquete sobre `KEYS` es **solo esto**, appendeado al final de las 16
existentes y respetando el orden de §7.7:

```ruby
budget_status budget_reason expense_budget_id
```

Criterio compartido por los tres paquetes (11, 05 y 06): al terminar los tres,
`ReportExpensesListTool::KEYS.size == 28` y `KEYS.uniq == KEYS`. `receipt_file_url` (que aporta el
06) es el **unico** metodo (no columna) de la lista.

`input_schema` gana:

| Prop | Tipo | Descripcion |
|---|---|---|
| `budget_status` | string, `enum: %w[sin_presupuesto aprobado excedido]` | Filtra por estado presupuestal |
| `currency` | string | Filtra por moneda ISO 4217 |
| `accounting_approved` | boolean | Filtra por aprobacion contable |
| `date_from` / `date_to` | string `YYYY-MM-DD` | Rango sobre `invoice_date` |

Y en `self.call` se agregan los cuatro filtros con el mismo estilo de guardas que ya usa
(`scope = scope.where(...) if x`). `accounting_approved` se compara con
`ActiveModel::Type::Boolean.new.cast(accounting_approved)` **solo si no es `nil`**, o el filtro
`false` se pierde.

⚠️ Esta tarea cambia a la vez la salida de `report_expenses_list`, `report_expenses_get`,
`report_expenses_create` y `records_search(entity:"report_expenses")` (arquitectura §3 Bloque G).
Es intencional y es el motivo por el que la dependencia del paquete 02 es dura.

### Tarea 7 — `report_expenses_create`: campos de moneda

`app/tools/report_expenses_create_tool.rb`:

```ruby
WRITABLE = %i[cost_center_id user_invoice_id invoice_name invoice_number invoice_type invoice_date
              invoice_value invoice_tax invoice_total identification description
              type_identification_id payment_type_id
              currency foreign_value foreign_tax foreign_total
              exchange_rate exchange_rate_date].freeze
```

`input_schema` gana:

| Prop | Tipo | Descripcion literal |
|---|---|---|
| `currency` | string | `"Moneda ISO 4217 del comprobante. Valores validos: COP, USD, EUR. Default COP."` |
| `foreign_value` | number | `"Valor base en la moneda del comprobante (solo si currency != COP)"` |
| `foreign_tax` | number | `"Impuestos en la moneda del comprobante"` |
| `foreign_total` | number | `"Total en la moneda del comprobante"` |
| `exchange_rate` | number | `"Tasa a COP: cuantos COP vale 1 unidad de currency. Usa exchange_rates_get para obtenerla."` |
| `exchange_rate_date` | string | `"Fecha de la tasa aplicada, YYYY-MM-DD. Normalmente = invoice_date."` |

**Asumido:** `exchange_rate_source` **no** se expone en el schema. Lo escribe el servidor:
`"trm_oficial"` si `exchange_rate` coincide (`.round(6)`) con la fila de `exchange_rates` de esa
moneda+fecha, `"manual"` en cualquier otro caso, y `nil` si `currency == "COP"`. Motivo: el
campo es auditable y su valor es precisamente "de donde salio esto"; dejar que el llamador lo
declare lo vuelve inutil.

**Nunca escribibles** (no van al schema ni a `WRITABLE`, y hay un test por cada uno):
`budget_status`, `budget_reason`, `expense_budget_id`, `accounting_approved`,
`accounting_approved_by_id`, `accounting_approved_at`, `is_acepted`, `receipt_file`,
`exchange_rate_source`, `last_user_edited_id`.

La descripcion de la tool se reescribe para incluir la secuencia obligatoria del agente
(ver Anexo A): *"Antes de llamar a esta tool consulta `expense_rules_validate`. Si devuelve
alguna violacion con `blocking: true`, NO llames a esta tool."*

⚠️ Esa frase **se conserva porque ayuda al agente, pero NO es el control**: es una instruccion de
prompt. El control real es el guard de `ExpenseRuleService` que la Tarea 8 mete **dentro** de la
tool, antes del save (§7.5).

### Tarea 8 — `report_expenses_create`: actor estricto, motor de reglas y evaluacion presupuestal

Reemplazo del cuerpo de `self.call` (misma firma). Incorpora las correcciones **2** (el motor de
reglas se aplica tambien por el camino MCP, §7.5) y **3** (se guarda con
`persist_with_evaluation!`, §7.4) del bloque de auditoria:

```ruby
STRICT_ENV = "MCP_STRICT_EXPENSE_ACTOR"

def self.strict_actor?
  ENV[STRICT_ENV].to_s.downcase != "false"   # estricto por defecto
end

def self.call(cost_center_id:, server_context:, user_invoice_id: nil, **args)
  tenant = current_tenant(server_context)
  return unauthorized! unless tenant
  return not_found!("cost_center #{cost_center_id}") unless CostCenter.exists?(cost_center_id)

  actor = actor_user_strict(server_context)
  actor ||= actor_user(tenant, server_context) unless strict_actor?

  # Sin actor identificado y sin user_invoice_id explicito -> se rechaza. NUNCA Administrador.
  resolved_user_id = user_invoice_id || actor&.id
  return text(NO_ACTOR_MESSAGE) unless resolved_user_id
  return not_found!("user #{resolved_user_id}") unless User.exists?(resolved_user_id)

  creator = actor || User.find(resolved_user_id)

  previous = User.current
  begin
    User.current = creator
    attrs = args.slice(*WRITABLE).merge(cost_center_id: cost_center_id,
                                        user_invoice_id: resolved_user_id)
    attrs[:exchange_rate_source] = resolve_rate_source(attrs)

    # GUARD DE REGLAS DE NEGOCIO — antes de construir/guardar nada (§7.5).
    violations = ExpenseRuleService.validate(attrs.merge(actor: creator))
    if violations.any? { |v| v[:blocking] }
      return tool_json(type: "error",
                       message: violations.select { |v| v[:blocking] }.map { |v| v[:message] },
                       rule_violations: violations)   # NO se llama a save
    end

    re = ReportExpense.new(attrs)
    re.user_id = creator.id

    # PERSISTENCIA — punto de entrada unico del 04 (§7.4): toma el lock, evalua, guarda y reevalua.
    result = ExpenseBudgetService.persist_with_evaluation!(re, actor: creator)
    return text("Error: #{result.errors.join(', ')}") unless result.ok?

    json(Mcp::Serialize.record(re, ReportExpensesListTool::KEYS,
                               budget_message: budget_message_for(re),
                               rule_violations: violations))
  ensure
    User.current = previous
  end
end
```

Reglas embebidas y su razon:

1. **El fallback al Administrador desaparece para crear gastos** (arquitectura §6.3,
   plan interno §3.3). Si no hay correo ni telefono que resuelvan, y tampoco `user_invoice_id`
   explicito, se devuelve `NO_ACTOR_MESSAGE` y **no se crea nada**.
2. `user_invoice_id` explicito sigue funcionando aunque no haya actor: no es una atribucion
   silenciosa, alguien la nombro. En ese caso el creador (`user_id`) es esa misma persona.
3. `MCP_STRICT_EXPENSE_ACTOR=false` es la **valvula de reversion** para el rollout: restaura el
   comportamiento actual sin desplegar. Por defecto (variable ausente) el modo es estricto.
   Documentar la variable en `docs/TAIMES-MCP-INTEGRATION.md`.
4. `budget_message_for(re)` es un string en espanol listo para que el agente lo repita textual:
   - `aprobado` → `"Aprobado contra presupuesto."`
   - `excedido` → `"ATENCION: #{re.budget_reason}. El gasto quedo registrado pero excede el presupuesto."`
   - `sin_presupuesto` → `"Registrado. No hay partida presupuestal asignada para esta persona en este centro; el gasto no quedo bajo control presupuestal."`
5. `resolve_rate_source(attrs)` es un metodo privado de la tool
   (`private_class_method`) que implementa la regla de la tarea 7.
6. **El guard de `ExpenseRuleService` es un control de servidor, no una frase de prompt.** La
   propuesta §4.6 promete que *"la validacion es la misma sin importar por donde entre el gasto"*;
   hasta la auditoria ese guard vivia solo en `ReportExpensesController` y esta tool construia el
   `ReportExpense` de frente. La frase de la `description` (tarea 7) **se conserva** porque ayuda
   al agente, pero **no cuenta como control**. Con una violacion bloqueante **no se llama a
   `save`** y `ReportExpense.count` no cambia.
7. **Se guarda con `ExpenseBudgetService.persist_with_evaluation!`, nunca con `save` +
   `evaluate!` + `reload`.** Con el contrato del 04, `evaluate!` asigna en memoria y **no guarda**,
   asi que el `reload` descartaba `budget_status`, `budget_reason` y `expense_budget_id` y dejaba
   **todo gasto de WhatsApp en `sin_presupuesto`**; ademas `evaluate!` exige correr dentro de
   `with_center_lock`, cosa que la tool no hacia. `persist_with_evaluation!` devuelve un `Result`:
   se responde `text("Error: ...")` con `result.errors` cuando `!result.ok?`, y **no hay `reload`**
   (el objeto ya viene con los tres campos persistidos).

Se aplica el **mismo criterio estricto** a `expense_ratios_create_tool.rb` (anticipos), que hoy
tiene el mismo patron laxo: se cambia `as_actor` por la misma logica. Es un commit aparte dentro
de esta tarea.

### Tarea 9 — `expense_budgets_list_tool.rb`

```ruby
class ExpenseBudgetsListTool < ApplicationTool
  tool_name "expense_budgets_list"
  description "Lista las partidas presupuestales (cupos de viaticos) de un centro de costo y/o " \
              "de una persona. Cada fila trae asignado, gastado y disponible del par " \
              "(centro, persona). Solo lectura."
  input_schema(
    properties: {
      cost_center_id: { type: "integer", description: "Filtra por centro de costo" },
      user_id:        { type: "integer", description: "Filtra por persona beneficiaria de la partida" },
      only_active:    { type: "boolean", description: "Si true, solo partidas activas" },
      limit:          { type: "integer", description: "Maximo de resultados (default 50, max 200)" }
    },
    required: []
  )

  KEYS = %i[id cost_center_id user_id amount notes active created_at updated_at].freeze
end
```

- `self.call(server_context:, cost_center_id: nil, user_id: nil, only_active: nil, limit: 50)`.
- `limit = [[limit.to_i, 1].max, 200].min` (patron del repo).
- `scope = ExpenseBudget.all`, filtros con guardas, `.includes(:user, :cost_center)`,
  `.order(created_at: :desc)`.
- `only_active` se castea con `ActiveModel::Type::Boolean` **solo si no es nil**.
- `extra` por fila: `user_name` (`b.user&.names`), `cost_center_code` (`b.cost_center&.code`),
  `assigned`, `spent`, `available`.
- ⚠️ **N+1 obligatorio de evitar**: `assigned/spent/available` son del **par**
  (centro, persona), no de la fila. Se calcula **una vez por par distinto** presente en el
  resultado y se memoiza en un hash local:
  ```ruby
  cache = {}
  pair  = ->(cc, u) { cache[[cc, u]] ||= ExpenseBudgetService.available_for(cost_center_id: cc, user_id: u) }
  ```
  Sin esto, 50 filas = 100 queries agregadas.
- Los montos van como **string** (`BigDecimal#to_s`), igual que el contrato A.2 de la
  arquitectura. **Asumido:** se agrega ademas `*_cents` no — se deja solo string, y la
  descripcion de la tool advierte al agente: *"los montos son strings decimales en COP"*.

### Tarea 10 — `expense_budgets_available_tool.rb`

```ruby
tool_name "expense_budgets_available"
description "Presupuesto disponible de una persona en un centro de costo: asignado, gastado y " \
            "disponible, en COP. Consultala ANTES de registrar un gasto para poder advertir a la " \
            "persona. Si se omite user_id se usa la persona del actor (X-Actor-Phone / X-Actor-Email)."
input_schema(
  properties: {
    cost_center_id:     { type: "integer", description: "ID del centro de costo (requerido)" },
    user_id:            { type: "integer", description: "ID de la persona (opcional; por defecto el actor)" },
    exclude_expense_id: { type: "integer", description: "ID de gasto a excluir del gastado (al editar)" }
  },
  required: %w[cost_center_id]
)
```

Cuerpo:
1. `current_tenant` → `unauthorized!`.
2. `CostCenter.exists?` → `not_found!`.
3. `resolved_user_id = user_id || actor_user_strict(server_context)&.id`;
   si sigue nil → `text(NO_ACTOR_MESSAGE)`. **Aqui tambien es estricto**: devolver el
   presupuesto del Administrador a quien no se identifico es una fuga de informacion, ademas de
   un numero que induce al agente a error.
4. `User.exists?` → `not_found!`.
5. `result = ExpenseBudgetService.available_for(cost_center_id:, user_id:, exclude_expense_id:)`.
6. Respuesta JSON, alineada con el contrato A.4 de la arquitectura mas tres campos extra:

```json
{ "cost_center_id": 340, "cost_center_code": "CM-ACME-12-2026",
  "user_id": 7, "user_name": "Juan Perez",
  "has_budget": true, "currency": "COP",
  "assigned": "500000.0", "spent": "180000.0", "available": "320000.0",
  "message": "Disponible $320.000 de $500.000 asignados." }
```

**Asumido:** `message` es texto en espanol pre-formateado con separadores de miles, para que el
agente no formatee dinero por su cuenta (los LLM meten comas y puntos al azar en COP). Con
`has_budget: false` el mensaje es `"Esta persona no tiene presupuesto asignado en este centro de
costo."` y los tres montos van en `"0.0"` — **nunca** "disponible $0", que el agente lee como
rechazo.

### Tarea 11 — `exchange_rates_get_tool.rb`

**Dueño unico = este paquete** (§7.7, correccion 4 del bloque de auditoria). El paquete 05
**borro su Tarea 18** y solo declara la dependencia de `ExchangeRateService`.

```ruby
tool_name "exchange_rates_get"
description "Tasa de cambio a pesos colombianos (COP) para una moneda y una fecha. Devuelve " \
            "cuantos COP vale 1 unidad de la moneda. Si la fuente no tiene esa fecha devuelve la " \
            "del ultimo dia habil anterior y lo indica en rate_date. Si no hay tasa, devuelve " \
            "error: NO inventes una tasa, pidesela a la persona."
input_schema(
  properties: {
    currency: { type: "string", description: "Codigo ISO 4217. Validos: COP, USD, EUR" },
    date:     { type: "string", description: "Fecha YYYY-MM-DD (normalmente la fecha del comprobante)" }
  },
  required: %w[currency date]
)
KEYS = %i[id currency rate_date effective_date rate_to_cop source fetched_at].freeze
```

⚠️ **Contenido canonico de `KEYS`: esas 7 claves, con `id` y con `effective_date`** (§7.7). La
version de 5 claves de este documento **queda derogada**: `effective_date` la confirmo la decision
de §1.5 y la crea el paquete 02, y `records_search(entity: "exchange_rates")` reutiliza esta misma
constante (tarea 17), asi que omitirla dejaba la entidad sin su campo de vigencia.

- Valida `Currency.valid?(currency)` → `text("Error: moneda no soportada. Validas: #{Currency::CODES.join(', ')}")`.
- Valida `Date.iso8601(date)` con `rescue ArgumentError` → `text("Error: fecha invalida, usa YYYY-MM-DD")`.
- `currency.upcase == "COP"` → responde `{"currency":"COP","rate_to_cop":"1.0","source":"identity","rate_date":<date>,"requested_date":<date>,"cached":true}` **sin tocar la red ni la tabla**.
- Delega en `ExchangeRateService.fetch(currency:, date:)`. `result.ok?` → JSON de exito con
  `requested_date` y `rate_date` separados; `!result.ok?` → `text("Error: " + result.errors.join(", "))`.
- ⚠️ **No** se envuelve en `as_actor`: es lectura pura y `fetch` puede escribir en
  `exchange_rates`, cuyo modelo es nuevo y **no** tiene los callbacks de `User.current`. Si el
  paquete de multimoneda le agregara auditoria, esta tool tendria que envolverse; queda anotado
  en Riesgos.

### Tarea 12 — `expense_rules_validate_tool.rb`

```ruby
tool_name "expense_rules_validate"
description "Valida un gasto candidato contra las reglas de negocio de Controlmatica (antiguedad " \
            "del comprobante, conceptos no permitidos, duplicados, tope por gasto, coherencia de " \
            "valores) y, opcionalmente, contra el presupuesto disponible. NO guarda nada. " \
            "Llamala SIEMPRE antes de report_expenses_create. Si alguna violacion trae " \
            "blocking: true, no registres el gasto: explicale el motivo a la persona."
```

`input_schema` — los mismos nombres de campo que `report_expenses_create` para que el agente
pueda reenviar el mismo objeto sin renombrar nada:
`cost_center_id` (requerido), `user_invoice_id`, `invoice_name`, `identification`,
`invoice_number`, `invoice_date`, `invoice_value`, `invoice_tax`, `invoice_total`, `currency`,
`foreign_value`, `foreign_tax`, `foreign_total`, `exchange_rate`, `description`,
`exclude_expense_id`, `include_budget` (boolean, default `true`).

Cuerpo:
1. Auth + `CostCenter.exists?`.
2. `user_invoice_id ||= actor_user_strict(server_context)&.id` (aqui **no** se rechaza si falta:
   validar sin persona sigue siendo util; simplemente el bloque `budget` viene en `null`).
3. `violations = ExpenseRuleService.validate(attrs)` — array de `{rule:, message:, blocking:}`.
4. Si `include_budget` y hay `user_invoice_id`: `budget = ExpenseBudgetService.available_for(...)`
   y se agrega una violacion **no bloqueante** `{rule: "presupuesto", blocking: false, message:
   "Este gasto supera el disponible en $X. Se puede registrar, pero quedara marcado como
   excedido."}` cuando `invoice_value.to_d > available`.
5. Respuesta:

```json
{ "ok": false, "blocking_count": 1, "warning_count": 1,
  "violations": [
    {"rule":"duplicado","message":"Ya existe el gasto #8812 con el mismo numero de factura y NIT","blocking":true},
    {"rule":"presupuesto","message":"Este gasto supera el disponible en $120.000...","blocking":false}
  ],
  "budget": { "has_budget": true, "assigned": "500000.0", "spent": "180000.0", "available": "320000.0" } }
```

**Asumido:** que el presupuesto viaje dentro de esta tool (y no solo en
`expense_budgets_available`) es deliberado: reduce a **una** la llamada obligatoria antes de
guardar y elimina el fallo mas probable del agente, que es saltarse el chequeo de presupuesto
porque "ya valido las reglas". La tool de presupuesto sigue existiendo para la pregunta directa
("¿cuanto me queda?").

`ok` es `blocking_count.zero?`, **no** `violations.empty?`.

### Tarea 13 — `Mcp::S3DirectUpload`

`app/tools/mcp/s3_direct_upload.rb`, modulo sin estado. Es la unica pieza del paquete que habla
con fog-aws (`fog-aws 3.31.0`, ya en el Gemfile; **no** hay `aws-sdk-s3`).

```ruby
module Mcp
  module S3DirectUpload
    PREFIX      = "uploads/tmp/mcp_receipts"
    TTL_SECONDS = 900          # 15 min: suficiente para un adjunto de WhatsApp, corto para una URL publica
    MAX_BYTES   = 10 * 1024 * 1024

    def self.configured?
      ENV["AWS_BUCKET"].present? && ENV["AWS_ACCESS_KEY"].present? && ENV["AWS_SECRET_KEY"].present?
    end

    def self.bucket     = ENV["AWS_BUCKET"]
    def self.connection = Fog::Storage.new(CarrierWave::Uploader::Base.fog_credentials)

    # "uploads/tmp/mcp_receipts/<uuid>/<nombre-saneado>"
    def self.build_key(filename)
      safe = File.basename(filename.to_s).gsub(/[^A-Za-z0-9._-]/, "_").last(120)
      safe = "comprobante" if safe.blank? || safe.start_with?(".")
      "#{PREFIX}/#{SecureRandom.uuid}/#{safe}"
    end

    # Solo aceptamos claves que emitimos nosotros.
    def self.own_key?(key)
      key.to_s.match?(%r{\A#{Regexp.escape(PREFIX)}/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}\z})
    end

    def self.presign_put(key, content_type)
      connection.put_object_url(bucket, key, (Time.now + TTL_SECONDS).to_i,
                                { "Content-Type" => content_type })
    end

    def self.presign_get(key)
      connection.get_object_url(bucket, key, (Time.now + TTL_SECONDS).to_i)
    end

    def self.head(key)      # => { content_length:, content_type: } o nil
    def self.delete(key)    # best effort, rescata StandardError
  end
end
```

- `put_object_url` / `get_object_url` son API de `Fog::Storage::AWS::Real` y estan en
  fog-aws 3.31. **No** se usa `Fog::Storage.new` en cada llamada dentro de un bucle.
- `own_key?` es la defensa contra que el agente mande un `upload_key` arbitrario
  (`"uploads/user/avatar/1/foto.jpg"`) y termine adjuntando el avatar de otro usuario como
  comprobante. **Es un control de seguridad, no una validacion cosmetica.**
- `head` y `delete` rescatan `Excon::Error`, `Fog::Errors::Error` y `StandardError` y devuelven
  `nil` / `false`. Ninguna excepcion de red sale de este modulo.

### Tarea 14 — `report_expenses_receipt_url_get_tool.rb`

```ruby
tool_name "report_expenses_receipt_url_get"
description "Paso 1 de 2 para adjuntar un comprobante. Devuelve una URL firmada de S3 para subir " \
            "el archivo con un PUT directo (no envies el binario por MCP). Luego llama a " \
            "report_expenses_attach_receipt con el upload_key que devuelve esta tool."
input_schema(
  properties: {
    report_expense_id: { type: "integer", description: "ID del gasto (requerido)" },
    filename:          { type: "string",  description: "Nombre del archivo con extension: jpg, jpeg, png, webp, heic o pdf" },
    content_type:      { type: "string",  description: "MIME: image/jpeg, image/png, image/webp, image/heic o application/pdf" },
    byte_size:         { type: "integer", description: "Tamano en bytes (max 10485760)" }
  },
  required: %w[report_expense_id filename content_type]
)
```

Cuerpo, en orden:
1. Auth.
2. `ReportExpense.find_by(id:)` → `not_found!`.
3. `Mcp::S3DirectUpload.configured?` → si no, `text("Error: el almacenamiento de archivos no esta configurado en este entorno. Usa report_expenses_attach_receipt con file_base64.")`.
4. Extension: `File.extname(filename).delete(".").downcase` debe estar en
   `ReceiptUploader.new.extension_allowlist` → si no, error con la lista.
5. Content type en `ReceiptUploader.new.content_type_allowlist` → si no, error con la lista.
   **Se leen del uploader, no se duplican**: una sola fuente de verdad (arquitectura §4.8).
6. `byte_size` presente y `> MAX_BYTES` → error con el maximo en MB.
7. `key = build_key(filename)`; `url = presign_put(key, content_type)`.
8. Respuesta:

```json
{ "upload_url": "https://<bucket>.s3.amazonaws.com/uploads/tmp/mcp_receipts/<uuid>/factura.pdf?X-Amz-...",
  "upload_key": "uploads/tmp/mcp_receipts/<uuid>/factura.pdf",
  "method": "PUT",
  "headers": { "Content-Type": "application/pdf" },
  "expires_in_seconds": 900,
  "max_bytes": 10485760,
  "next_step": "Sube el archivo con PUT a upload_url usando exactamente ese header Content-Type, sin cabecera de autorizacion. Despues llama a report_expenses_attach_receipt con report_expense_id y upload_key." }
```

⚠️ El `Content-Type` del PUT debe ser **byte a byte** el que se firmo, o S3 devuelve 403
`SignatureDoesNotMatch`. Va explicito en `headers` y en `next_step` por eso.

### Tarea 15 — `report_expenses_attach_receipt_tool.rb`

```ruby
tool_name "report_expenses_attach_receipt"
description "Paso 2 de 2: asocia al gasto el comprobante ya subido (upload_key de " \
            "report_expenses_receipt_url_get). Alternativa para archivos pequenos: file_base64 " \
            "(max 4 MB codificados). Reemplaza el comprobante anterior si el gasto ya tenia uno."
input_schema(
  properties: {
    report_expense_id: { type: "integer", description: "ID del gasto (requerido)" },
    upload_key:        { type: "string",  description: "Clave devuelta por report_expenses_receipt_url_get" },
    file_base64:       { type: "string",  description: "Contenido del archivo en base64 (solo si no usas upload_key; max 4 MB)" },
    filename:          { type: "string",  description: "Nombre del archivo (requerido con file_base64)" },
    content_type:      { type: "string",  description: "MIME (requerido con file_base64)" }
  },
  required: %w[report_expense_id]
)
```

**Modo A — `upload_key` (el recomendado, y el unico que se usa en produccion):**

1. Auth; `ReportExpense.find_by(id:)` → `not_found!`.
2. `Mcp::S3DirectUpload.own_key?(upload_key)` → si no,
   `text("Error: upload_key invalida. Obtenla con report_expenses_receipt_url_get.")`.
3. `meta = Mcp::S3DirectUpload.head(upload_key)` → `nil` ⇒
   `text("Error: no se encontro el archivo subido. Vuelve a pedir la URL y sube el archivo antes de adjuntar.")`.
4. `meta[:content_length] > MAX_BYTES` ⇒ error de tamano.
5. `as_actor_strict(tenant, server_context)` — si no hay actor, aborta con `NO_ACTOR_MESSAGE`.
   Adjuntar un comprobante es una **edicion** del gasto: dispara `edit_values` y
   `create_edit_register`, que escriben `last_user_edited_id`. Atribuirla al Administrador
   generico es exactamente lo que este paquete viene a eliminar.
6. Dentro del bloque:
   ```ruby
   re.remote_receipt_file_url = Mcp::S3DirectUpload.presign_get(upload_key)
   if re.save
     Mcp::S3DirectUpload.delete(upload_key)   # limpieza best-effort del temporal
     json(Mcp::Serialize.record(re.reload, ReportExpensesListTool::KEYS))
   else
     text("Error: #{re.errors.full_messages.join(', ')}")
   end
   ```
   `remote_receipt_file_url=` hace que CarrierWave **descargue** el temporal y lo re-almacene en
   `store_dir` definitivo, aplicando de nuevo `extension_allowlist`, `content_type_allowlist` y
   `size_range`. Es decir: la validacion final la hace el uploader, no la tool.
7. El `delete` del temporal **no** debe abortar la respuesta si falla (objeto huerfano en S3 es
   preferible a decirle al agente que fallo algo que si funciono).

**Modo B — `file_base64` (fallback; entornos sin S3 y pruebas):**

1. Requiere `filename` y `content_type`; si falta alguno → error explicito.
2. `Base64.strict_decode64(file_base64)` con `rescue ArgumentError` → `text("Error: file_base64 no es base64 valido")`.
3. `file_base64.bytesize > 4 * 1024 * 1024` → error **antes** de decodificar
   (el objetivo es no inflar memoria ni el contexto del modelo).
4. Se envuelve en `CarrierWave::SanitizedFile` sobre un `Tempfile`, se asigna a
   `re.receipt_file = ...` dentro de `as_actor_strict`, y se borra el `Tempfile` en un `ensure`.

**Si llegan `upload_key` y `file_base64` a la vez**: gana `upload_key` y se ignora el base64
(el modo A ya subio el binario; procesar los dos duplicaria trabajo). Documentado en la
descripcion de la tool.

**Idempotencia**: adjuntar dos veces la misma `upload_key` sobre el mismo gasto es un error
esperable (el temporal ya se borro en el primer intento) y responde con el mensaje del paso 3,
no con una excepcion.

### Tarea 16 — `users_find_by_phone_tool.rb`

```ruby
tool_name "users_find_by_phone"
description "Identifica a una persona de Controlmatica por su numero de telefono (acepta " \
            "cualquier formato: +57 300 123 4567, 3001234567, whatsapp:+573001234567). " \
            "Devuelve found:false si no hay match o si el numero esta repetido en dos usuarios. " \
            "NUNCA asumas una persona si found es false."
input_schema(
  properties: { phone: { type: "string", description: "Numero de telefono en cualquier formato" } },
  required: %w[phone]
)
KEYS = %i[id names last_names email rol_id].freeze
```

- Normaliza con `User.normalize_phone`; si devuelve `nil` →
  `{"found":false,"reason":"invalid_phone","message":"El numero no tiene suficientes digitos."}`.
- `matches = User.by_normalized_phone(key).order(:id).limit(2).to_a`:
  - 0 → `{"found":false,"reason":"no_match","message":"No hay ningun usuario de Controlmatica con ese telefono. Pidele a la persona que se identifique con su correo o contacta al administrador para que registre su numero."}`
  - 2 → `{"found":false,"reason":"ambiguous","message":"Ese telefono esta registrado en mas de un usuario. No es posible atribuir el gasto."}`
  - 1 → `{"found":true,"user":{...KEYS..., "rol_name": ...}}`
- ⚠️ **`KEYS` es una allowlist explicita y corta a proposito.** `users` contiene
  `encrypted_password`, `reset_password_token`, `current_sign_in_ip` y `last_sign_in_ip`.
  Ninguno puede aparecer aqui. (La fuga preexistente de `records_search` con `fields` esta
  documentada en la arquitectura §3 Bloque G y este paquete **no la empeora**: no agrega
  entidades sensibles nuevas.)

### Tarea 17 — `records_search`: entidades nuevas

En `app/tools/records_search_tool.rb`:

```ruby
"expense_budgets" => [ExpenseBudget, ExpenseBudgetsListTool::KEYS],
"exchange_rates"  => [ExchangeRate,  ExchangeRatesGetTool::KEYS],
```

y las dos cadenas agregadas al `enum` de `entity` en el `input_schema` (**si no se agregan al
enum, el propio protocolo MCP rechaza el argumento antes de llegar a la tool**).

`records_aggregate` **no requiere cambios**: reutiliza `RecordsSearchTool.registry` y su
`input_schema` no tiene `enum` de entidad (verificado en `records_aggregate_tool.rb:22-31`).
Actualizar solo el texto de la descripcion de ambas tools con las dos entidades nuevas.

### Tarea 18 — Helpers de prueba de tools

`test/support/mcp_test_helpers.rb` (no es `*_test.rb`, el runner no lo ejecuta):

```ruby
module McpTestHelpers
  VALID_KEY = "test-mcp-key-0123456789"

  def with_mcp_key(key = VALID_KEY)
    previous = ENV["MCP_API_KEY"]
    ENV["MCP_API_KEY"] = key
    yield
  ensure
    ENV["MCP_API_KEY"] = previous
  end

  def ctx(api_key: VALID_KEY, actor_email: nil, actor_phone: nil)
    { api_key: api_key, actor_email: actor_email, actor_phone: actor_phone }
  end

  # La API de MCP::Tool::Response se abstrae aqui: si cambia con la gema, se toca UN archivo.
  def tool_text(response)
    content = response.respond_to?(:content) ? response.content : response[:content]
    first = content.first
    (first[:text] || first["text"]).to_s
  end

  def tool_json(response) = JSON.parse(tool_text(response))

  def assert_tool_error(response, fragment)
    assert_includes tool_text(response), fragment
  end
end
```

Cada test de tool empieza con:
```ruby
require "test_helper"

class XTest < ActiveSupport::TestCase
  include McpTestHelpers
end
```

⚠️ **Sin `require_relative`** (correccion 8 del bloque de auditoria). El paquete 01 pone
`Dir[Rails.root.join("test/support/**/*.rb")].each { |f| require f }` en `test_helper.rb` (§7.2),
asi que el modulo **se autocarga**: el `require_relative "../support/mcp_test_helpers"` que este
documento pedia queda derogado porque provocaria doble carga. La intencion original —no colisionar
con el paquete 01, dueno de `test_helper.rb`— se cumple igual: este paquete **no toca**
`test_helper.rb`, solo crea su archivo en `test/support/`.

Etiquetas de fixtures que este paquete **agrega** a los archivos del paquete 01 (dueño unico de
`test/fixtures/*.yml`, §7.2 — se agregan etiquetas, no se reescribe ni se renombra nada existente):
- `test/fixtures/users.yml`: `phone` y `phone_normalized` en `admin` e `ingeniero`; dos usuarios
  nuevos `telefono_repetido_a` y `telefono_repetido_b` con **el mismo** `phone_normalized`
  (`"3009999999"`), y uno sin telefono.

Archivos binarios de prueba: **ya existen, los crea el paquete 01** (§7.12). Este paquete consume
`test/fixtures/files/comprobante.pdf` y `test/fixtures/files/malicioso.exe`; **no los crea ni los
sobrescribe**.

### Tareas 19–23 — Pruebas

Una tarea por archivo de test, en el orden de la seccion "Pruebas unitarias".
No se mergea ninguna tool sin su test en el mismo commit o en el inmediatamente siguiente.

### Tarea 24 — Documentacion de integracion

1. `docs/TAIMES-MCP-INTEGRATION.md`:
   - Regenerar el catalogo desde el servidor real, **no a mano**:
     ```bash
     curl -sS -X POST http://localhost:3000/mcp \
       -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
       -H "X-Api-Key: $MCP_API_KEY" \
       -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq '.result.tools | length'
     ```
     y actualizar el conteo del encabezado (hoy dice 54; con las 7 nuevas debe dar 61 — **usar el
     numero que devuelva el servidor, no el de este documento**).
   - Seccion nueva **"Identificacion del actor"**: `X-Actor-Email`, `X-Actor-Phone`, la regla
     estricta para `report_expenses_create` / `expense_ratios_create` /
     `report_expenses_attach_receipt`, y la variable `MCP_STRICT_EXPENSE_ACTOR`.
   - Seccion nueva **"Adjuntar comprobantes"** con el flujo de 3 pasos y un ejemplo de `curl`
     completo (tool → PUT a S3 → tool).
   - Corregir la nota de §5 que hoy dice *"el actor de la operacion es el usuario con rol
     Administrador; no se recibe usuario por request"*: **ya no es cierto** y es justo lo que
     este paquete cambia.
   - Skill nueva sugerida en la tabla de agrupacion: **"Gastos IA"** con
     `report_expenses_list/get/create`, `report_expenses_receipt_url_get`,
     `report_expenses_attach_receipt`, `expense_budgets_list`, `expense_budgets_available`,
     `exchange_rates_get`, `expense_rules_validate`, `users_find_by_phone`,
     `report_expense_options_list`, `cost_centers_list`.
2. `docs/TAIMES-AGENTE-GASTOS.md`: el Anexo A de este documento, publicado como archivo propio
   (es entregable al cliente). No se duplica contenido: se mueve.

---

## Pruebas unitarias (Minitest)

**Punto de partida real: hoy no existe NI UN test de tools MCP.** `test/` no tiene directorio
`tools/`. Este paquete lo crea. `bin/rails test` recoge `test/**/*_test.rb`, asi que
`test/tools/` entra sin configurar nada.

Todo test que cree o edite un `ReportExpense` va envuelto en `as_user(users(:admin))` **o** deja
que la tool setee `User.current` — pero el `setup` nunca puede crear un gasto fuera de
`as_user` (gotcha #1 del proyecto).

### `test/models/user_phone_test.rb`

| Test | Asercion |
|---|---|
| `test "normalize_phone toma los ultimos 10 digitos"` | `User.normalize_phone("+57 300 123 4567") == "3001234567"` |
| `test "normalize_phone acepta el prefijo whatsapp"` | `User.normalize_phone("whatsapp:+573001234567") == "3001234567"` |
| `test "normalize_phone limpia parentesis y guiones"` | `User.normalize_phone("(300) 123-4567") == "3001234567"` |
| `test "normalize_phone deja los fijos de 7 digitos completos"` | `User.normalize_phone("2345678") == "2345678"` |
| `test "normalize_phone devuelve nil con menos de 7 digitos"` | `assert_nil User.normalize_phone("30012")` |
| `test "normalize_phone devuelve nil con nil y con vacio"` | `assert_nil` para `nil`, `""`, `"abc"` |
| `test "el callback llena phone_normalized al guardar"` | `as_user(users(:admin)) { u.update!(phone: "+57 301 000 0000") }`; `u.reload.phone_normalized == "3010000000"` |
| `test "cambiar el telefono recalcula phone_normalized"` | dos updates seguidos; el segundo valor manda |
| `test "borrar el telefono deja phone_normalized en nil"` | `u.update!(phone: nil)`; `assert_nil u.reload.phone_normalized` |

### `test/tools/application_tool_actor_test.rb`

| Test | Asercion |
|---|---|
| `test "current_tenant rechaza api key vacia"` | `assert_nil ApplicationTool.current_tenant(ctx(api_key: ""))` |
| `test "current_tenant rechaza api key incorrecta"` | `with_mcp_key { assert_nil ApplicationTool.current_tenant(ctx(api_key: "otra")) }` |
| `test "current_tenant acepta la api key correcta"` | devuelve `:controlmatica` |
| `test "current_tenant es nil si MCP_API_KEY no esta seteada"` | con `ENV["MCP_API_KEY"] = nil`, `assert_nil` (evita que un entorno sin config quede abierto) |
| `test "actor_user_by_phone resuelve por telefono normalizado"` | `ctx(actor_phone: "+57 300 123 4567")` → `users(:ingeniero)` |
| `test "actor_user_by_phone acepta formato de gateway"` | `"whatsapp:+573001234567"` resuelve al mismo usuario |
| `test "actor_user_by_phone devuelve nil si el telefono esta repetido"` | con las 2 fixtures de telefono repetido → `assert_nil` |
| `test "actor_user_by_phone devuelve nil sin match"` | `"+57 322 000 0000"` → `assert_nil` |
| `test "actor_user_by_phone devuelve nil sin telefono en el contexto"` | `ctx()` → `assert_nil` |
| `test "actor_user_strict prefiere el correo sobre el telefono"` | contexto con correo de `admin` y telefono de `ingeniero` → devuelve `admin` |
| `test "actor_user_strict NO cae al Administrador"` | correo y telefono inexistentes → `assert_nil` |
| `test "actor_user laxo si cae al Administrador"` | mismo contexto → devuelve `users(:admin)` (comportamiento de lectura preservado) |
| `test "actor_user laxo resuelve por telefono antes del fallback"` | contexto solo con telefono valido → `users(:ingeniero)`, no `admin` |
| `test "as_actor_strict setea y restaura User.current"` | dentro del bloque `User.current == ingeniero`; despues del bloque vuelve al valor previo |
| `test "as_actor_strict no ejecuta el bloque sin actor y devuelve el mensaje"` | una variable `ejecutado` sigue en `false`; el texto incluye `"no se pudo identificar"` |
| `test "as_actor_strict sin actor NO ensucia User.current"` | se setea `User.current = users(:admin)` antes; tras la llamada fallida sigue siendo `users(:admin)` y **no** `nil`. **Este es el test del bug del `ensure` a nivel de metodo.** |
| `test "as_actor_strict restaura User.current si el bloque lanza"` | `assert_raises(RuntimeError) { ... raise ... }`; `User.current` vuelve al previo |

### `test/tools/report_expenses_create_tool_test.rb`

| Test | Asercion |
|---|---|
| `test "sin api key devuelve unauthorized"` | texto incluye `"Unauthorized"`; `ReportExpense.count` no cambia |
| `test "centro de costo inexistente devuelve not found"` | texto incluye `"Not found: cost_center"` |
| `test "crea el gasto atribuido al usuario del telefono"` | `user_invoice_id == users(:ingeniero).id` y `user_id == users(:ingeniero).id` |
| `test "crea el gasto atribuido al usuario del correo"` | idem con `actor_email` |
| `test "sin actor identificado NO crea el gasto"` | contexto sin correo ni telefono validos y sin `user_invoice_id`; texto incluye `"no se pudo identificar"`; `assert_no_difference("ReportExpense.count")` |
| `test "sin actor pero con user_invoice_id explicito si crea"` | se crea y `user_id == user_invoice_id` |
| `test "sin actor NUNCA atribuye al Administrador"` | tras el intento fallido, `ReportExpense.where(user_invoice_id: users(:admin).id).count` no aumento |
| `test "MCP_STRICT_EXPENSE_ACTOR=false restaura el fallback"` | con la ENV en `"false"` y sin actor, se crea y `user_invoice_id == users(:admin).id` |
| `test "escribe los campos de moneda"` | `currency=="USD"`, `foreign_value==120.0.to_d`, `exchange_rate==4120.5.to_d`, `exchange_rate_date` = la fecha enviada |
| `test "exchange_rate_source queda en trm_oficial si la tasa coincide con la cacheada"` | con `exchange_rates(:usd_hoy)` cargada y la misma tasa → `"trm_oficial"` |
| `test "exchange_rate_source queda en manual si la tasa no coincide"` | tasa distinta → `"manual"` |
| `test "exchange_rate_source queda nil en COP"` | `assert_nil re.exchange_rate_source` |
| `test "no se puede setear budget_status desde los argumentos"` | se llama con `budget_status: "aprobado"` sobre un centro sin partidas; `re.budget_status == "sin_presupuesto"` |
| `test "no se puede setear accounting_approved desde los argumentos"` | `assert_equal false, re.accounting_approved` |
| `test "no se puede setear is_acepted desde los argumentos"` | `assert_equal false, re.is_acepted` |
| `test "no se puede setear receipt_file desde los argumentos"` | `assert_nil re.receipt_file.file` |
| `test "no se puede setear expense_budget_id desde los argumentos"` | queda con el valor que le puso el servicio, no con el enviado |
| `test "guarda con persist_with_evaluation! y devuelve budget_status aprobado"` | con partida de 500.000 y gasto de 100.000 → JSON `budget_status == "aprobado"`. Verifica ademas que el valor **quedo persistido** (`re.reload.budget_status == "aprobado"`): es el test que atrapa la regresion de `save` + `evaluate!` + `reload`, que dejaba todo en `sin_presupuesto` |
| `test "un gasto duplicado es rechazado por el motor de reglas"` | stub de `ExpenseRuleService.validate` con una violacion `blocking: true` de regla `"duplicado"` → `assert_no_difference("ReportExpense.count")`, la respuesta trae `type: "error"` y `rule_violations` |
| `test "un gasto sobre el tope de valor es rechazado por el motor de reglas"` | idem con la regla de tope → `ReportExpense.count` sin cambio y `type: "error"` |
| `test "una violacion NO bloqueante deja crear el gasto"` | `blocking: false` → el gasto se crea y `rule_violations` viaja en la respuesta |
| `test "devuelve budget_status excedido con su mensaje"` | gasto de 900.000 contra partida de 500.000 → `"excedido"` y `budget_message` incluye `"ATENCION"` |
| `test "devuelve sin_presupuesto cuando no hay partida"` | `budget_message` incluye `"No hay partida presupuestal"` |
| `test "el JSON de respuesta trae las 28 keys"` | `tool_json(res).keys` cubre `ReportExpensesListTool::KEYS` mas `budget_message` |
| `test "errores de validacion vuelven como texto Error"` | forzando un `user_invoice_id` inexistente → `"Not found: user"` |
| `test "restaura User.current despues de crear"` | `assert_nil User.current` al final si estaba nil antes |

### `test/tools/report_expenses_read_tools_test.rb`

| Test | Asercion |
|---|---|
| `test "list devuelve los campos presupuestales y de moneda"` | la primera fila tiene las claves `budget_status`, `currency`, `exchange_rate`, `accounting_approved` |
| `test "list no revienta con gastos historicos"` | gasto sin moneda extranjera: `foreign_value` viene `null`, no error |
| `test "receipt_file_url es null si no hay comprobante"` | `assert_nil fila["receipt_file_url"]` |
| `test "filtra por budget_status"` | crea un `excedido` y un `aprobado`; `budget_status:"excedido"` devuelve 1 |
| `test "filtra por currency"` | idem con `"USD"` |
| `test "filtra por accounting_approved false"` | devuelve los no aprobados (verifica que `false` no se pierde por el `if`) |
| `test "filtra por rango de fechas"` | `date_from`/`date_to` acotan por `invoice_date` |
| `test "limit se topa en 200"` | `limit: 5000` no lanza y la consulta usa 200 |
| `test "get devuelve las mismas keys que list"` | `tool_json(get).keys.sort == ReportExpensesListTool::KEYS.map(&:to_s).sort` |
| `test "get de un id inexistente devuelve not found"` | texto incluye `"Not found: report_expense"` |
| `test "records_search sobre report_expenses no revienta con las keys nuevas"` | `RecordsSearchTool.call(entity: "report_expenses", ...)` responde JSON valido. **Es el test que atrapa el `NoMethodError` si una columna no existe.** |

### `test/tools/expense_budgets_tools_test.rb`

| Test | Asercion |
|---|---|
| `test "list devuelve las partidas del centro"` | 2 filas para `cost_centers(:centro_con_viaticos)` |
| `test "list filtra por user_id"` | 1 fila |
| `test "list con only_active true excluye las inactivas"` | la partida inactiva no aparece |
| `test "list con only_active false no filtra"` | aparecen ambas (verifica el cast de `false`) |
| `test "list trae assigned spent available por fila"` | los tres campos presentes y coherentes con `ExpenseBudgetService.available_for` |
| `test "list calcula el par una sola vez"` | con `ExpenseBudgetService.stub(:available_for, ...)` contando invocaciones: 2 partidas del mismo par ⇒ **1** llamada |
| `test "list respeta el limite maximo de 200"` | sin excepcion |
| `test "available devuelve asignado gastado y disponible"` | los tres como strings; `available == assigned - spent` |
| `test "available usa el actor si se omite user_id"` | con `actor_phone` de `ingeniero` responde `user_id == ingeniero.id` |
| `test "available sin user_id y sin actor devuelve el mensaje de identificacion"` | texto incluye `"no se pudo identificar"` |
| `test "available con has_budget false devuelve montos en cero y mensaje explicito"` | `has_budget == false`, `available == "0.0"`, `message` incluye `"no tiene presupuesto asignado"` y **no** incluye `"$0"` |
| `test "available respeta exclude_expense_id"` | excluir el gasto sube el disponible en su `invoice_value` |
| `test "available con centro inexistente devuelve not found"` | `"Not found: cost_center"` |
| `test "available sin api key devuelve unauthorized"` | `"Unauthorized"` |

### `test/tools/exchange_rates_get_tool_test.rb`

Se stubea `ExchangeRateService.fetch` (arquitectura §6.7: **no** se agrega WebMock).

| Test | Asercion |
|---|---|
| `test "COP devuelve 1.0 sin consultar el servicio"` | con `ExchangeRateService.stub(:fetch, ->(*) { flunk "no debio llamarse" })`, responde `rate_to_cop == "1.0"`, `source == "identity"` |
| `test "devuelve la tasa cuando el servicio responde ok"` | `rate_to_cop == "4120.500000"`, `cached` presente |
| `test "distingue requested_date de rate_date"` | pidiendo un domingo, `rate_date` = viernes y ambos campos vienen en el JSON |
| `test "moneda invalida devuelve error con la lista de validas"` | texto incluye `"USD"` y `"EUR"` |
| `test "fecha invalida devuelve error"` | `"14/07/2026"` → texto incluye `"YYYY-MM-DD"` |
| `test "cuando el servicio falla devuelve error y no inventa tasa"` | `Result` con `ok? == false` → el texto empieza con `"Error:"` y **no** contiene ningun numero de tasa |
| `test "sin api key devuelve unauthorized"` | `"Unauthorized"` |

### `test/tools/expense_rules_validate_tool_test.rb`

| Test | Asercion |
|---|---|
| `test "sin violaciones devuelve ok true"` | `ok == true`, `blocking_count == 0` |
| `test "una violacion bloqueante deja ok en false"` | stub de `ExpenseRuleService.validate` con `blocking: true` → `ok == false`, `blocking_count == 1` |
| `test "una violacion no bloqueante deja ok en true"` | `ok == true`, `warning_count == 1` |
| `test "no persiste nada"` | `assert_no_difference("ReportExpense.count")` |
| `test "incluye el bloque de presupuesto por defecto"` | `json["budget"]["available"]` presente |
| `test "include_budget false omite el bloque"` | `assert_nil json["budget"]` |
| `test "agrega la advertencia de presupuesto cuando el valor supera el disponible"` | existe una violacion con `rule == "presupuesto"` y `blocking == false` |
| `test "sin user_invoice_id ni actor el bloque budget viene null y no falla"` | `ok` calculado igual, `budget` en `null` |
| `test "usa el actor cuando se omite user_invoice_id"` | el bloque `budget` corresponde al usuario del telefono |

### `test/tools/report_expenses_receipt_tools_test.rb`

Se stubea `Mcp::S3DirectUpload` (no hay red en la suite).

| Test | Asercion |
|---|---|
| `test "url_get devuelve upload_url y upload_key"` | con `configured?` stubeado a `true`, el JSON trae `upload_url`, `upload_key`, `method == "PUT"` y `headers["Content-Type"]` |
| `test "url_get rechaza una extension no permitida"` | `filename: "virus.exe"` → texto incluye `"pdf"` (la lista permitida) |
| `test "url_get rechaza un content type no permitido"` | `"application/x-msdownload"` → error |
| `test "url_get rechaza un tamano mayor a 10 MB"` | `byte_size: 11_000_000` → error que menciona el maximo |
| `test "url_get sin S3 configurado sugiere file_base64"` | `configured?` en `false` → texto incluye `"file_base64"` |
| `test "url_get con gasto inexistente devuelve not found"` | `"Not found: report_expense"` |
| `test "build_key sanea el nombre del archivo"` | `Mcp::S3DirectUpload.build_key("../../etc/pas swd.pdf")` no contiene `..` ni `/` fuera del prefijo, y `own_key?` lo acepta |
| `test "own_key? rechaza una clave de otro directorio"` | `own_key?("uploads/user/avatar/1/foto.jpg") == false` |
| `test "own_key? rechaza una clave sin uuid"` | `own_key?("uploads/tmp/mcp_receipts/x/a.pdf") == false` |
| `test "attach con upload_key ajena es rechazado"` | texto incluye `"upload_key invalida"` y el gasto sigue sin comprobante |
| `test "attach con upload_key inexistente en S3 pide reintentar"` | `head` stubeado a `nil` → texto incluye `"Vuelve a pedir la URL"` |
| `test "attach por upload_key asocia el archivo"` | `head` y `presign_get` stubeados a un `file://` de `test/fixtures/files/comprobante.pdf`; `re.reload.receipt_file.file` no es nil |
| `test "attach borra el temporal despues de asociar"` | contador del stub de `delete` == 1 |
| `test "attach sigue respondiendo exito si el borrado del temporal falla"` | `delete` stubeado a `raise`; la respuesta es JSON de exito |
| `test "attach por base64 asocia el archivo"` | `Base64.strict_encode64(File.binread(...))` → `receipt_file` presente |
| `test "attach por base64 rechaza base64 invalido"` | `"no-es-base64!!"` → `"base64"` en el mensaje |
| `test "attach por base64 rechaza mayor a 4 MB"` | string de 5 MB → error de tamano, sin decodificar |
| `test "attach por base64 rechaza extension prohibida"` | `test/fixtures/files/malicioso.exe` (del paquete 01, §7.12) → el uploader rechaza; el texto empieza con `"Error:"` |
| `test "attach sin actor identificado no adjunta"` | `assert_nil re.reload.receipt_file.file`; texto incluye `"no se pudo identificar"` |
| `test "attach registra last_user_edited_id del actor"` | `re.reload.last_user_edited_id == users(:ingeniero).id` |
| `test "attach con upload_key y file_base64 a la vez usa upload_key"` | el contador del stub de `head` == 1 (se tomo el camino A) |
| `test "attach reemplaza el comprobante existente"` | tras dos adjuntos, `receipt_file.file.filename` es el del segundo |

### `test/controllers/mcp_controller_exposure_test.rb`

| Test | Asercion |
|---|---|
| `test "las 7 tools nuevas quedan expuestas"` | por cada nombre de `%w[expense_budgets_list expense_budgets_available exchange_rates_get expense_rules_validate report_expenses_receipt_url_get report_expenses_attach_receipt users_find_by_phone]`, `assert McpController.exposed?(nombre)` |
| `test "las tools de update y delete siguen ocultas"` | `refute McpController.exposed?("report_expenses_update")` y `"report_expenses_delete"`, `"cost_centers_delete"`, `"cost_centers_change_execution_state"` |
| `test "MCP_ENABLE_WRITES=all expone todo"` | con la ENV, `exposed?("report_expenses_delete") == true` |
| `test "mcp_tools registra las clases nuevas"` | `McpController.mcp_tools` incluye `ExpenseBudgetsAvailableTool`, `ExpenseRulesValidateTool`, `ReportExpensesAttachReceiptTool`, `UsersFindByPhoneTool`, `ExpenseBudgetsListTool`, `ExchangeRatesGetTool`, `ReportExpensesReceiptUrlGetTool` |
| `test "mcp_tools no incluye ApplicationTool"` | `refute_includes McpController.mcp_tools, ApplicationTool` |
| `test "cada archivo de tool constantiza"` | recorre `Dir[app/tools/*_tool.rb]` y hace `constantize` de cada uno: atrapa un nombre de archivo que no case con la clase (el auto-descubrimiento revienta el endpoint entero) |
| `test "ALWAYS_EXPOSED no contiene nombres que ya se auto-exponen"` | ningun elemento termina en `_list`, `_get` ni `_create` (higiene: evita listas redundantes que se desincronizan) |

### `test/integration/mcp_protocol_test.rb`

`class McpProtocolTest < ActionDispatch::IntegrationTest`. ⚠️ **Todas** las llamadas llevan
`"Accept" => "application/json, text/event-stream"` o el transporte Streamable HTTP responde 406.

| Test | Asercion |
|---|---|
| `test "tools/list expone las tools nuevas"` | `POST /mcp` con `{"method":"tools/list"}` y `X-Api-Key` valido; los 7 nombres estan en `json["result"]["tools"].map { _1["name"] }` |
| `test "tools/list no expone update ni delete"` | ningun nombre termina en `_update` ni `_delete` |
| `test "tools/call sin api key responde Unauthorized"` | `expense_budgets_available` sin header → el texto del content incluye `"Unauthorized"` |
| `test "tools/call con api key por query param funciona"` | `POST /mcp?api_key=...` responde el JSON de datos (fallback documentado en `mcp_controller.rb:23-26`) |
| `test "X-Actor-Phone atribuye el gasto a la persona correcta"` | `tools/call` de `report_expenses_create` con el header; el ultimo `ReportExpense` tiene `user_invoice_id == users(:ingeniero).id` |
| `test "sin X-Actor-Phone ni X-Actor-Email el gasto se rechaza"` | `assert_no_difference("ReportExpense.count")`; el texto incluye `"no se pudo identificar"` |
| `test "el schema de report_expenses_create publica los campos de moneda"` | en `tools/list`, `inputSchema.properties` de esa tool contiene `currency`, `foreign_value`, `exchange_rate`, `exchange_rate_date` |
| `test "el schema de report_expenses_create NO publica budget_status"` | `refute_includes` de `budget_status`, `accounting_approved`, `is_acepted`, `receipt_file` |
| `test "records_search acepta entity expense_budgets"` | responde JSON con partidas, no `"Not found: entity"` |
| `test "records_search acepta entity exchange_rates"` | idem |

---

## Pruebas E2E (Playwright)

**No aplica: este paquete no tiene superficie de usuario.** El MCP es un endpoint JSON-RPC
consumido por Taimes; no hay pantalla, ni formulario, ni selector que un navegador pueda tocar.
La superficie de usuario de la captura asistida (subir comprobante desde la web y precargar
campos) es del **paquete 08**, no de este.

Se declara explicitamente para que nadie "complete" el paquete agregando un flujo E2E: la
arquitectura (§5.2 nivel 3, actualizada por la auditoria) fija **nueve** flujos de navegador,
**todos con dueño unico = paquete 12**, y ninguno es del MCP. Ademas §7.2 asigna
`test/e2e/specs/*.spec.js` funcionales al **12** y la infraestructura Playwright al **01**: este
paquete **no escribe ni un spec**. La cobertura equivalente aqui es
`test/integration/mcp_protocol_test.rb`, que ejercita el stack HTTP real (rutas,
`skip_forgery_protection`, headers, transporte, serializacion) sin el costo de un navegador.

**Verificacion manual de aceptacion contra un entorno real** (no automatizable en CI; el script lo
**escribe este paquete** y vive en el PR, no en el repo, pero quien lo **ejecuta y lo firma es el
paquete 13**, §7.11, y requiere que el 13 ya haya poblado `users.phone`):

1. `tools/list` contra staging → los 7 nombres nuevos aparecen.
2. `report_expenses_receipt_url_get` → `PUT` con `curl --upload-file` a la `upload_url` →
   HTTP 200 de S3.
3. `report_expenses_attach_receipt` con la `upload_key` → el gasto queda con `receipt_file_url`
   y ese link **descarga el archivo** desde un navegador limpio.
4. Reiniciar el dyno de Heroku y volver a descargar: el archivo sigue ahi (es la prueba de que
   no quedo en el filesystem efimero).

---

## Criterios de aceptacion

Cada item se marca si/no sin opinar.

**Esquema y modelo**
1. `db/schema.rb` tiene `users.phone`, `users.phone_normalized` y el indice `index_users_on_phone_normalized`.
2. `User.normalize_phone("+57 300 123 4567")` devuelve `"3001234567"` en consola.
3. `User.normalize_phone("30012")` devuelve `nil`.

**Actor**
4. `ApplicationTool.actor_user_strict({actor_phone: "<telefono inexistente>"})` devuelve `nil`.
5. `ApplicationTool.actor_user_strict` con un telefono registrado en **dos** usuarios devuelve `nil`.
6. `POST /mcp` de `report_expenses_create` sin `X-Actor-Email` ni `X-Actor-Phone` y sin
   `user_invoice_id` responde un texto que contiene `"no se pudo identificar"` y **no** crea
   ninguna fila en `report_expenses`.
7. Ninguna fila de `report_expenses` creada por MCP en la prueba anterior tiene
   `user_invoice_id` del Administrador.
8. `MCP_STRICT_EXPENSE_ACTOR=false` restaura el comportamiento anterior (documentado en
   `docs/TAIMES-MCP-INTEGRATION.md`).
9. Tras una llamada fallida por falta de actor, `User.current` conserva su valor previo.

**Exposicion**
10. `tools/list` devuelve, como minimo, estos 7 nombres: `expense_budgets_list`,
    `expense_budgets_available`, `exchange_rates_get`, `expense_rules_validate`,
    `report_expenses_receipt_url_get`, `report_expenses_attach_receipt`, `users_find_by_phone`.
11. `tools/list` **no** devuelve ningun nombre terminado en `_update` ni en `_delete`
    (con `MCP_ENABLE_WRITES` sin setear).
12. `McpController::ALWAYS_EXPOSED` tiene exactamente 6 elementos y ninguno termina en
    `_list` / `_get` / `_create`.

**Campos**
13. `ReportExpensesListTool::KEYS.size == 28` y `KEYS.uniq == KEYS` (criterio **compartido** con
    los paquetes 05 y 06, §7.7: cada uno agrega solo sus claves). El diff de **este** paquete
    agrega `budget_status`, `budget_reason` y `expense_budget_id` en las posiciones 17–19 y **no
    toca ni reordena** las 16 existentes ni las de 05 y 06.
14. `report_expenses_get` de un gasto historico responde JSON valido con `currency: "COP"` y
    `budget_status: "sin_presupuesto"` (no lanza).
15. El `inputSchema` de `report_expenses_create` en `tools/list` contiene `currency`,
    `foreign_value`, `foreign_tax`, `foreign_total`, `exchange_rate`, `exchange_rate_date`.
16. Ese mismo `inputSchema` **no** contiene `budget_status`, `budget_reason`,
    `expense_budget_id`, `accounting_approved`, `accounting_approved_by_id`,
    `accounting_approved_at`, `is_acepted`, `receipt_file` ni `exchange_rate_source`.
17. Llamar a `report_expenses_create` con `budget_status: "aprobado"` sobre un centro sin
    partidas produce un gasto con `budget_status == "sin_presupuesto"`.

**Comportamiento de las tools**
18. `expense_budgets_available` de una persona sin partidas responde `has_budget: false`,
    los tres montos en `"0.0"` y un `message` que no contiene `"$0"`.
19. `exchange_rates_get` con `currency: "COP"` responde `rate_to_cop: "1.0"` y
    `source: "identity"`.
20. `exchange_rates_get` cuando el servicio falla responde un texto que empieza con `"Error:"` y
    no contiene ningun numero de tasa.
21. `expense_rules_validate` con una violacion bloqueante responde `ok: false`; con solo
    advertencias responde `ok: true`.
22. `expense_rules_validate` no crea, edita ni borra ninguna fila (`ReportExpense.count` estable).
23. `users_find_by_phone` de un numero repetido responde `found: false` con
    `reason: "ambiguous"`.
24. La respuesta de `users_find_by_phone` no contiene `encrypted_password`,
    `reset_password_token`, `current_sign_in_ip` ni `last_sign_in_ip`.

**Comprobante**
25. `report_expenses_receipt_url_get` con `filename: "x.exe"` responde error y **no** emite URL.
26. `report_expenses_attach_receipt` con `upload_key: "uploads/user/avatar/1/foto.jpg"` responde
    error y el gasto sigue sin comprobante.
27. En staging: URL firmada → `PUT` → `attach_receipt` → `report_expenses_get` devuelve
    `receipt_file_url` no nulo, y esa URL descarga el archivo.
28. Tras `heroku restart`, la URL del punto 27 sigue descargando el archivo.

> ⚠️ **Precondicion dura de 27 y 28** (correccion 6 del bloque de auditoria, §7.11): el poblado de
> `users.phone` es del **paquete 13** (inventario, recoleccion, normalizacion, deteccion de
> duplicados y `rake users:import_phones`). Sin ese poblado, en modo estricto **todo** gasto por
> WhatsApp se rechaza y estos dos criterios no se pueden verificar de punta a punta. Si la Tarea 0
> (§7.10, item 0.7) revela que no hay telefonos, se renegocia el alcance de la Parte B **antes**
> de escribir codigo.

**Busqueda generica**
29. `records_search` con `entity: "expense_budgets"` y con `entity: "exchange_rates"` responde
    datos (no `"Not found: entity"`).
30. El `enum` de `entity` en el `inputSchema` de `records_search` incluye las dos entidades nuevas.

**Pruebas y documentacion**
31. `bin/rails test test/tools test/integration/mcp_protocol_test.rb test/controllers/mcp_controller_exposure_test.rb test/models/user_phone_test.rb` corre con **0 failures y 0 errors**.
32. `bin/rails test` completo sigue en 0 failures / 0 errors (las fixtures nuevas de `users.yml`
    no rompen la suite).
33. `docs/TAIMES-MCP-INTEGRATION.md` tiene el conteo de tools regenerado desde `tools/list`, la
    seccion de actor por telefono, la seccion de comprobante y **ya no** afirma que el actor
    siempre es el Administrador.
34. `docs/TAIMES-AGENTE-GASTOS.md` existe y contiene: tabla de skills, secuencia de tools,
    guion de captura por foto, guion por voz, texto de confirmacion, y que hacer ante regla
    bloqueante / presupuesto insuficiente / persona no identificada.

**Reglas de negocio y presupuesto por el camino MCP** *(criterios agregados por la auditoria)*

35. Un gasto con una violacion **bloqueante** de `ExpenseRuleService` es **rechazado por MCP**:
    `report_expenses_create` responde `type: "error"` con los mensajes de las violaciones y
    `ReportExpense.count` **no cambia** (§7.5). El control esta en el codigo de la tool, no en la
    `description`.
36. Un gasto creado por MCP contra una partida con cupo queda con `budget_status == "aprobado"`
    **persistido en la base** (`re.reload.budget_status`), no solo en la respuesta JSON — es la
    verificacion de que se uso `persist_with_evaluation!` y no `save` + `evaluate!` + `reload`
    (§7.4).
37. `ExchangeRatesGetTool::KEYS` tiene exactamente las 7 claves de §7.7, incluidas `id` y
    `effective_date`.
38. `db/migrate/20260405000001_add_phone_to_users.rb` define `def up` y `def down`, y **no**
    `def change`; `bin/rails db:rollback STEP=1` la revierte sin error.
39. Ningun archivo de `test/tools/` ni de `test/integration/` contiene `require_relative` hacia
    `test/support/`: el helper se autocarga (§7.2).

---

## Riesgos y trampas

1. **`Mcp::Serialize.record` hace `public_send` por cada key y no perdona.** Si se amplia
   `ReportExpensesListTool::KEYS` antes de que las migraciones del paquete 02 esten aplicadas en
   ese entorno, **todas** las tools de gastos y `records_search(entity:"report_expenses")`
   responden un error 500. Y como el despliegue de Heroku corre `db:migrate` en `release`, una
   ventana de segundos entre el deploy del codigo y la migracion basta para romperlo. Mitigacion:
   este paquete se despliega **despues** del 02, verificado con
   `bin/rails db:migrate:status | grep 202604`.
2. **El `ensure` a nivel de metodo de `as_actor` es una trampa activa.** Copiarlo en
   `as_actor_strict` (que tiene un `return` temprano) deja `User.current = nil` **para todo el
   resto del request** — y como Puma reusa hilos, potencialmente para el request siguiente del
   mismo hilo. El sintoma es un `NoMethodError` en `User.current.id` en una tool que no tiene
   nada que ver. Hay un test dedicado (`"as_actor_strict sin actor NO ensucia User.current"`).
3. **El modo estricto rompe la integracion en produccion si Taimes no manda headers.** Hoy
   `report_expenses_create` funciona sin `X-Actor-Email` porque cae al Administrador. Al mergear
   esto, esas llamadas empiezan a fallar. **Antes de desplegar hay que confirmar con Taimes que
   envia `X-Actor-Email` o `X-Actor-Phone` en el canal de gastos**, y `MCP_STRICT_EXPENSE_ACTOR`
   existe precisamente para revertir sin desplegar. No se despliega un viernes.
4. **`users` no tiene telefonos: la funcionalidad no sirve hasta que alguien los cargue.** La
   migracion crea la columna vacia. Si nadie llena `users.phone`, `actor_user_by_phone` siempre
   devuelve `nil` y **todo** gasto por WhatsApp se rechaza. El plan interno marca este riesgo
   como probabilidad **Alta**. La carga de datos es una tarea operativa (no de codigo) que debe
   ocurrir **antes** de conectar el canal, y `users_find_by_phone` existe para que soporte pueda
   diagnosticarla. 🔴 **Este riesgo ya tiene dueño: el paquete 13** (§7.11) — inventario de
   usuarios activos, recoleccion, normalizacion, **deteccion de duplicados** (numero repetido ⇒
   persona NO identificada, ningun actor) y `rake users:import_phones`, en la ola 8, antes de
   conectar WhatsApp. Y la Tarea 0 (§7.10, item 0.7) cuantifica el estado real de los telefonos
   **antes** de que este paquete arranque; si no hay telefonos, se renegocia el alcance de la
   Parte B.
5. **Telefono duplicado = persona no identificada, no "la primera".** La resolucion devuelve
   `nil` con dos matches. Si el cliente tiene dos usuarios con el mismo numero (pasa: jefe y
   asistente), esas personas no pueden usar WhatsApp hasta que se depure el dato. Es
   intencional; documentarlo en la capacitacion.
6. **`Content-Type` de la URL firmada.** S3 firma el `Content-Type`; si el agente sube con otro
   (o sin el), devuelve 403 `SignatureDoesNotMatch` y el mensaje de S3 no explica nada. Por eso
   la tool devuelve `headers` explicitos y el texto `next_step`.
7. **`fog_public = false` (recomendacion §6.5) hace que `receipt_file.url` sea una URL firmada
   con expiracion de 600 s.** Guardarla en el historial del chat de WhatsApp la vuelve inutil a
   los 10 minutos. El agente **no** debe cachear ni reenviar esa URL: debe pedirla de nuevo con
   `report_expenses_get` cuando la necesite. Va en la especificacion del agente.
8. **`Fog::Storage.new` no es gratis.** Instanciar la conexion dentro de un bucle de 50 filas
   agrega latencia y sockets. `Mcp::S3DirectUpload.connection` no memoiza a proposito (evita
   sostener un socket muerto entre requests de Puma), asi que **ninguna tool debe llamarlo mas
   de una vez por invocacion**.
9. **`upload_key` sin validar es un agujero de seguridad real.** Sin `own_key?`, un agente (o
   quien tenga el `MCP_API_KEY`) puede adjuntar como comprobante cualquier objeto del bucket:
   avatares, hojas de vida, ordenes de compra. La regex de `own_key?` es un control de
   seguridad, no una validacion de formato: no se relaja para "que funcione".
10. **N+1 en `expense_budgets_list`.** `spent`/`available` son del par (centro, persona), no de
    la partida. Sin la memoizacion por par, 50 filas disparan 100 agregaciones. Hay un test que
    cuenta invocaciones de `available_for`.
11. **`accounting_approved: false` se pierde con un `if` ingenuo.** `scope = scope.where(...) if
    accounting_approved` descarta el filtro `false`. Hay que comparar contra `nil`. Aplica igual
    a `only_active` de `expense_budgets_list`.
12. **`records_aggregate` no tiene enum de entidad**, asi que hereda las entidades nuevas
    automaticamente al tocar `RecordsSearchTool.registry` — pero `@registry ||=` se memoiza a
    nivel de clase: en desarrollo con `cache_classes = false`, editar el registry y no reiniciar
    da resultados viejos. No es un bug de produccion; es una perdida de tiempo depurando.
13. **`records_search` con `fields` sigue permitiendo leer cualquier columna**, incluida
    `users.encrypted_password` (fuga preexistente, arquitectura §3 Bloque G). Este paquete
    **no la arregla** (fuera de alcance) y **no la empeora**: `expense_budgets` y
    `exchange_rates` no tienen columnas sensibles. Si alguien agrega otra entidad, revisar esto
    antes.
14. **`ExchangeRateService.fetch` hace HTTP.** `exchange_rates_get` **nunca** debe llamarse
    dentro de una transaccion con lock (arquitectura §2.7: "nada de llamadas HTTP dentro del
    lock"). Como es una tool independiente esto se cumple solo, pero si alguien decide llamarla
    desde dentro de `report_expenses_create` para "resolver la tasa automaticamente", introduce
    exactamente ese problema. **No hacerlo**: el agente pide la tasa primero y la envia como
    argumento.
15. **`ReportExpense` tiene `before_update :create_edit_register` con el umbral magico de 59
    caracteres** (arquitectura §4.7). Adjuntar un comprobante es un `update` y por lo tanto
    genera auditoria. El concern de auditoria y sus 3 metodos son del **paquete 03** (§7.2); el
    **06** solo agrega su `audit_field :receipt_file`. Si ese `audit_field` existe, cada adjunto
    deja un `RegisterEdit`; si no, no deja ninguno. Ninguna de las dos cosas es responsabilidad de
    este paquete, pero el test `"attach registra last_user_edited_id del actor"` falla si
    `edit_values` no corre.
16. **La suite corre en serie a proposito** (arquitectura §5.4.9). No agregar `parallelize` para
    "acelerar los tests de tools": `ReportExpense.search` sigue definiendo scopes de clase en
    runtime hasta que entre el **paquete 03**, su dueño unico (§7.2).
17. **La API de `MCP::Tool::Response` puede cambiar entre versiones de la gema `mcp`** (hoy
    `0.22.0`, pinneada como `~> 0.22`). Los tests acceden al contenido **solo** a traves de
    `tool_text` / `tool_json` de `McpTestHelpers`: si la gema cambia, se toca un archivo.
18. **Nadie puede probar el lado Taimes desde este repo.** El Anexo A es una especificacion, no
    codigo verificable. El riesgo residual (que el agente se salte la confirmacion, o que
    invente una tasa) se mitiga con: `expense_rules_validate` en el servidor, el rechazo
    estricto del actor, y `budget_message` pre-redactado. Todo lo que se pueda hacer cumplir
    desde el servidor, se hace desde el servidor; el prompt es la ultima linea, no la primera.

---

## Discrepancias con la arquitectura

**D1 — Migracion `20260405000001` fuera de la numeracion reservada. ✅ RESUELTA por la auditoria.**
La arquitectura §1 listaba seis migraciones "y no usar otras", y el paquete 02 exigia "esas seis y
ninguna mas", mientras §6.3 exige `add_column :users, :phone` y ningun paquete la reservaba.
**Resolucion vinculante (§7.2 + correccion 1 del bloque de auditoria):** la migracion
`20260405000001_add_phone_to_users.rb` es **legitima y de dueño unico = paquete 11**, ya figura en
la tabla de §1, y el **criterio 1 del paquete 02 fue reformulado** a *"en el diff de ESE PR hay
exactamente 6 archivos nuevos y ninguno mas"*. Unica obligacion derivada: la migracion usa
**`def up` / `def down`**, nunca `def change`, igual que las otras seis (aplicado en la Tarea 1).
No queda accion pendiente para el dueño de la arquitectura.

**D2 — Se parte `report_expenses_attach_receipt` en dos tools.** La arquitectura §3 Bloque G
lista una sola tool y `ALWAYS_EXPOSED` con 4 nombres nuevos. Aqui son dos tools
(`report_expenses_receipt_url_get` + `report_expenses_attach_receipt`) y `ALWAYS_EXPOSED` crece a
6 elementos (la segunda se auto-expone por sufijo `_get`). Motivo: el flujo de URL firmada que la
propia arquitectura recomienda (§6.5, plan interno §3.2 "Opcion B") **es de dos pasos por
naturaleza** — emitir credencial y confirmar subida son dos momentos distintos separados por un
`PUT` que ocurre fuera de MCP. Meter los dos en una tool obliga a un parametro-modo y a un
`input_schema` que miente sobre lo que hace. Es una ampliacion, no una contradiccion.

**D3 — `exchange_rate_source` no se expone en el `input_schema` de `report_expenses_create`.**
La arquitectura §3 Bloque G dice "agregar al `input_schema` y a `WRITABLE`: `currency`,
`foreign_value`, `foreign_tax`, `foreign_total`, `exchange_rate`, `exchange_rate_date`" — y no
menciona `exchange_rate_source` ni en un sentido ni en otro. Aqui se decide explicitamente que lo
escribe el servidor (`trm_oficial` / `manual` / `nil`), porque el campo existe para auditar el
origen del dato y su valor deja de significar algo si el llamador lo declara. No contradice la
arquitectura; cierra un hueco que dejo abierto.

**D4 — `expense_rules_validate` devuelve tambien el presupuesto.** La arquitectura describe la
tool como "valida un gasto candidato contra las reglas de negocio". Aqui devuelve ademas el
bloque `budget` (controlado por `include_budget`, default `true`) y agrega una violacion **no
bloqueante** cuando el valor excede el disponible. Motivo: reduce a una sola la llamada
obligatoria antes de guardar y elimina el modo de fallo mas probable del agente. La tool
`expense_budgets_available` sigue existiendo sin cambios de contrato.

**D5 — El modo estricto se extiende a `expense_ratios_create` y a
`report_expenses_attach_receipt`.** La arquitectura §6.3 y el plan interno §3.3 hablan de "gastos
creados por WhatsApp". Aqui se aplica el mismo criterio a los anticipos (`expense_ratios_create`,
que hoy tiene identico patron laxo) y a adjuntar comprobante (que es un `update` y escribe
`last_user_edited_id`). La razon es la misma en los tres casos: atribuir a un Administrador
generico un acto que una persona real ejecuto destruye la trazabilidad. Las **lecturas** siguen
con el fallback laxo, tal como dice el plan interno ("aceptable para lecturas").

**D6 — La cobertura E2E de este paquete es de integracion Minitest, no Playwright.** La
arquitectura §5.2 nivel 2 pide, literalmente, "Tools MCP: `report_expenses_create` con
`X-Actor-Email`..., `expense_budgets_available` sin API key → `unauthorized!`, y una llamada a
`tools/list` que afirme que las 4 tools de `ALWAYS_EXPOSED` aparecen". Se cumple y se amplia
(son 7 tools y 6 elementos en `ALWAYS_EXPOSED`). **No se agrega ningun flujo Playwright**: los
nueve flujos de §5.2 nivel 3 y todos los `test/e2e/specs/*.spec.js` funcionales son del
**paquete 12** (§7.2).

---

## Anexo A — Especificacion del agente de gastos en Taimes (contrato del otro lado)

> Este anexo **no es codigo de este repo**. Es la especificacion que debe seguir quien configure
> el agente dentro de Taimes. Se publica ademas como `docs/TAIMES-AGENTE-GASTOS.md` (tarea 24).
> Regla de oro: **todo lo que se puede hacer cumplir desde el servidor ya se hace cumplir desde
> el servidor.** Este documento describe el comportamiento deseable, no el mecanismo de control.

### A.1 Herramientas que el agente necesita (skill "Gastos IA")

| Tool | Para que la usa el agente | Cuando |
|---|---|---|
| `users_find_by_phone` | Confirmar quien es la persona y saludarla por su nombre | Solo si `X-Actor-Phone` no basta o si hay que diagnosticar |
| `cost_centers_list` | Resolver el centro de costo por texto ("el proyecto de ACME") | Al inicio, si la persona no lo dijo |
| `report_expense_options_list` | Obtener `type_identification_id` y `payment_type_id` validos | Antes de armar el gasto |
| `exchange_rates_get` | Tasa de la moneda del comprobante para la fecha del comprobante | Solo si la moneda != COP |
| `expense_budgets_available` | Responder "¿cuanto me queda?" | A peticion directa |
| `expense_rules_validate` | **Obligatoria antes de guardar** | Siempre, sin excepcion |
| `report_expenses_create` | Registrar el gasto | Solo despues de la confirmacion explicita |
| `report_expenses_receipt_url_get` | Obtener URL firmada para subir la foto/PDF | Inmediatamente despues de crear |
| `report_expenses_attach_receipt` | Asociar el archivo subido | Inmediatamente despues del `PUT` |
| `report_expenses_list` / `report_expenses_get` | "¿que gastos registre esta semana?", releer el comprobante | A peticion |
| `records_search` / `records_aggregate` | Consultas libres ("¿cuanto llevo gastado en el centro X?") | A peticion |

Headers que Taimes debe enviar en **cada** request al MCP:

| Header | Valor | Obligatorio |
|---|---|---|
| `X-Api-Key` | `MCP_API_KEY` | Si |
| `X-Actor-Phone` | El numero de WhatsApp del remitente, en cualquier formato | Si, en el canal de WhatsApp |
| `X-Actor-Email` | El correo del usuario de Taimes | Si, en el canal web |
| `Content-Type` | `application/json` | Si |
| `Accept` | `application/json, text/event-stream` | Si |

### A.2 Orden obligatorio de llamadas para registrar un gasto

```
  (0) identificar          X-Actor-Phone en el header   [ si falla -> A.6.1, no continuar ]
   ↓
  (1) resolver centro      cost_centers_list            [ si hay >1 candidato -> preguntar ]
   ↓
  (2) extraer campos       (vision / transcripcion, del lado Taimes)
   ↓
  (3) moneda extranjera?   exchange_rates_get           [ si falla -> A.6.3 ]
   ↓
  (4) validar              expense_rules_validate       [ blocking -> A.6.2, no continuar ]
   ↓
  (5) CONFIRMAR con la persona  ← paso humano, no se salta nunca
   ↓
  (6) crear                report_expenses_create
   ↓
  (7) url de subida        report_expenses_receipt_url_get
   ↓
  (8) PUT del archivo      HTTP directo a S3 (fuera de MCP)
   ↓
  (9) adjuntar             report_expenses_attach_receipt
   ↓
 (10) informar resultado   usar textual el budget_message del paso (6)
```

Reglas duras del orden:

- **(4) antes de (5)**: la persona confirma con las advertencias a la vista, no despues.
- **(5) antes de (6)**: nunca se llama a `report_expenses_create` sin un "si" explicito.
- **(6) antes de (7)**: la URL firmada se pide para un gasto que **ya existe**; no hay
  comprobantes huerfanos.
- Si (8) o (9) fallan, el gasto **ya quedo registrado**: el agente lo dice ("el gasto quedo
  guardado con el numero #8812, pero el comprobante no se pudo adjuntar; puedes reenviarme la
  foto") y **no** vuelve a llamar a `report_expenses_create`. Duplicar el gasto es peor que
  perder el adjunto.

### A.3 Flujo conversacional — captura por foto o PDF

1. La persona envia una imagen o un PDF, con o sin texto.
2. El agente responde de inmediato con un acuse corto (`"Recibido, estoy leyendo el
   comprobante..."`) para que el usuario no reenvie.
3. Extrae: proveedor (`invoice_name`), NIT (`identification`), numero de factura
   (`invoice_number`), fecha (`invoice_date`), valor base, impuestos, total y moneda.
4. **Campos que no logro leer quedan vacios. No se inventan.** Se preguntan uno por uno, en un
   solo mensaje si son varios.
5. Campos obligatorios minimos antes de continuar: `cost_center_id`, `invoice_date` y el valor
   total. Sin esos tres no se sigue.
6. Si el centro de costo no se dedujo del comprobante ni del historial, se pregunta con maximo
   3 opciones de `cost_centers_list` numeradas ("1, 2 o 3"), nunca con una lista de 40.
7. Si la moneda != COP → `exchange_rates_get` con la **fecha del comprobante** (no la de hoy).
   Si `rate_date != requested_date`, se le avisa: *"La tasa del 14 de julio no estaba publicada
   (era domingo); use la del viernes 12: $4.120,50 por dolar."*
8. `expense_rules_validate` con todos los campos.
9. Confirmacion (A.5).
10. Crear, subir, adjuntar, informar.

### A.4 Flujo conversacional — nota de voz

Identico a A.3 con dos diferencias:

1. Se transcribe primero y **se le muestra la transcripcion a la persona** en el mensaje de
   confirmacion (*"Entendi: 'almuerzo con el cliente de ACME, ochenta mil pesos, hoy'"*). Una
   transcripcion mala es la causa numero uno de gastos erroneos por voz.
2. **No hay comprobante**: los pasos (7)–(9) se omiten, y el agente pregunta explicitamente
   *"¿Tienes la foto de la factura? Si me la envias la adjunto al gasto."* Si la persona la
   envia despues, el agente usa el `id` del gasto ya creado y ejecuta (7)–(9) sin volver a crear.

Los campos que una nota de voz normalmente **no** trae (`identification`, `invoice_number`) se
dejan vacios: no son obligatorios en Controlmatica y preguntarlos por voz irrita.

### A.5 Confirmacion explicita (nunca se salta)

Antes de `report_expenses_create` el agente muestra **siempre** un resumen con este formato y
espera un "si" / "confirmo" / "dale". Un mensaje que no sea una confirmacion clara (una
correccion, una pregunta, un emoji) **no cuenta como si**.

```
Voy a registrar este gasto:

  Centro de costo : CM-ACME-12-2026 (Montaje planta ACME)
  Responsable     : Juan Perez
  Proveedor       : Hotel Dann Carlton  (NIT 900123456)
  Factura         : FE-4821
  Fecha           : 14/07/2026
  Moneda          : USD  →  TRM $4.120,50 (del 14/07/2026)
  Valor           : US$120,00   =  $494.460
  IVA             : US$22,80    =  $93.947
  Total           : US$142,80   =  $588.407
  Comprobante     : factura-hotel.pdf

  ⚠ Este gasto supera tu disponible en $120.000. Se puede registrar,
    pero quedara marcado como excedido.

¿Lo registro? (si / no / corregir)
```

- Si la persona dice **"corregir"**, el agente pregunta que campo y repite el resumen completo.
- Si la persona dice **"no"**, el agente descarta y confirma que no guardo nada.
- Si la persona no responde en 15 minutos, el agente **no guarda** y cierra: *"No registre el
  gasto. Si quieres retomarlo, reenviame la foto."*

### A.6 Que hace el agente cuando algo falla

#### A.6.1 No se identifica a la persona

Sintoma: `report_expenses_create` devuelve un texto con *"no se pudo identificar a la persona
que reporta"*, o `users_find_by_phone` devuelve `found: false`.

El agente **no** insiste, **no** prueba con otro usuario y **no** pide un `user_invoice_id`:

> *"No encuentro tu numero en Controlmatica, asi que no puedo registrar el gasto a tu nombre.
> Pidele al administrador que registre este numero en tu usuario y volvemos. No guarde nada."*

Si `reason == "ambiguous"`:

> *"Tu numero esta registrado en mas de un usuario de Controlmatica y no puedo saber a cual
> atribuir el gasto. Avisale al administrador para que lo corrija. No guarde nada."*

Motivo: atribuir un gasto a la persona equivocada es peor que no registrarlo. El servidor ya lo
impide; el agente solo tiene que explicarlo bien.

#### A.6.2 Una regla de negocio falla

`expense_rules_validate` devuelve violaciones.

- **`blocking: true`** → el agente **no llama a `report_expenses_create`**. Repite el `message`
  de la violacion textual (viene redactado en espanol desde el servidor) y ofrece la salida
  concreta:
  > *"No puedo registrarlo: ya existe el gasto #8812 con el mismo numero de factura y el mismo
  > NIT. ¿Quieres que te muestre ese gasto, o es una factura distinta y el numero quedo mal?"*
- **`blocking: false`** → se muestra como advertencia **dentro del resumen de confirmacion**
  (bloque `⚠` de A.5), y la persona decide.
- **Nunca** se reintenta la creacion "a ver si pasa". Las reglas son del servidor y no cambian
  entre intentos.
- El agente **no inventa reglas propias** ni las relaja porque la persona insista. Si la persona
  insiste, la respuesta es: *"Esa validacion la define Controlmatica, no yo. Habla con el
  administrador si necesitas una excepcion."*

#### A.6.3 No hay tasa de cambio

`exchange_rates_get` devuelve `Error:`.

> *"No pude obtener la tasa del euro para el 14 de julio. ¿Sabes a que tasa se liquido? Si me la
> das la uso; si no, registramos el gasto en pesos con el valor que te cobraron."*

**Prohibido**: usar la tasa de otro dia sin decirlo, usar una tasa "de memoria" del modelo, o
convertir a ojo. Si la persona da la tasa, se envia en `exchange_rate` y el servidor la marca
como `manual` automaticamente.

#### A.6.4 El presupuesto no alcanza

Esto **no es un error**: el gasto se registra igual (requisito de la propuesta §3.2). El agente:

1. Lo advierte **antes** de guardar, en el bloque `⚠` del resumen, con el monto exacto del
   exceso.
2. Si la persona confirma, guarda y repite **textual** el `budget_message` que devuelve
   `report_expenses_create`:
   > *"Listo, quedo registrado con el numero #8813. ATENCION: Excede el presupuesto disponible
   > en $120.000. El gasto quedo registrado pero excede el presupuesto."*
3. Agrega la consecuencia practica: *"Contabilidad no podra causarlo mientras siga excedido.
   Habla con el responsable del centro de costo para que amplie tu partida."*
4. Si `has_budget: false`, el mensaje es distinto y **no alarmista**:
   > *"Quedo registrado. No tienes una partida presupuestal asignada en este centro, asi que
   > este gasto no queda bajo control presupuestal."*

#### A.6.5 El comprobante no se pudo adjuntar

Ver A.2: el gasto ya existe. El agente informa el numero del gasto, dice que el comprobante
falto, y ofrece reintentar solo el adjunto. **Nunca** recrea el gasto.

#### A.6.6 La URL del comprobante expiro

`receipt_file_url` es una URL firmada de corta duracion. El agente **no la guarda ni la reenvia
de conversaciones anteriores**: cuando la persona pide "mandame la factura del gasto 8813", el
agente llama a `report_expenses_get` **en ese momento** y usa la URL fresca.

### A.7 Cosas que el agente NO debe hacer nunca

1. Guardar un gasto sin confirmacion explicita.
2. Inventar un dato que no leyo (proveedor, NIT, numero de factura, tasa de cambio).
3. Atribuir un gasto a alguien distinto de quien escribe.
4. Reintentar `report_expenses_create` tras un fallo de adjunto o de red sin verificar antes con
   `report_expenses_list` si el gasto ya quedo creado.
5. Formatear cifras en COP por su cuenta cuando el servidor ya devolvio un `message` formateado.
6. Relajar una regla de negocio, ni proponerle a la persona como saltarsela.
7. Exponer ids internos como si fueran informacion util ("el gasto 8813" si, "user_invoice_id 7"
   no).
8. Llamar a `records_search` con `fields` sobre `users` (hay columnas sensibles; usar
   `users_find_by_phone` o `users_list`).
