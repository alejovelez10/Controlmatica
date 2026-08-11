# Paquete 06 — Comprobante adjunto, vista de contabilidad y export/import Excel

## 🔴 CORRECCIONES DE AUDITORÍA (vinculantes — leer ANTES que el resto del documento)

> Estas correcciones **mandan sobre cualquier texto de este archivo** que las contradiga.
> Consolidadas en `00-ARQUITECTURA.md` §7. **Este paquete pasa a ser solo backend.**

1. **Se BORRAN las tareas A1 y B1 (migraciones `20260402000001` y `20260404000001`).** Dueño
   único: **paquete 02** (§1, §7.2). Además, la A1 mostraba `def change` literal, prohibido por la
   convención. Precondición de arranque en su lugar:
   ```ruby
   raise "Falta el paquete 02" unless ActiveRecord::Base.connection.column_exists?(:report_expenses, :receipt_file) &&
                                      ActiveRecord::Base.connection.column_exists?(:report_expenses, :accounting_approved)
   ```
2. **Se BORRA la tarea A3 (corrección de los 4 uploaders existentes + `carrierwave.rb`).** Dueño
   único: **paquete 03** (§4.8, §7.2). Este paquete conserva **solo `ReceiptUploader`**. Se quitan
   de la tabla "A modificar" las cuatro filas de uploaders y la del initializer, y el **criterio 3**
   pasa a: *"verificar que el paquete 03 dejó `grep -c 'storage :file' app/uploaders/*.rb` en 0"*.
   La condicionalidad *"SOLO si la precondición de ENV se cumplió"* desaparece: eso se decide en la
   **Tarea 0** (§7.10, ítem 0.6).
3. **Se BORRA la tarea A9 (`.cm-input-file` en el design system).** Tres errores en una tarea:
   (a) la ruta `app/javascript/stylesheets/design_system.css` **no existe** — el archivo real es
   `app/assets/stylesheets/design_system.css`; (b) la clase que existe se llama **`.cm-file-input`**
   (`design_system.css:1741`); (c) el paquete 08 prohíbe agregar CSS por este motivo (su criterio
   42). **Se usa `.cm-file-input` y no se agrega CSS.** La arquitectura §4.5 ya fue corregida.
4. 🔴 **Se BORRA el bloque B10 (pack `AccountingExpenseIndex.js` + vista + su E2E).** Dueño único
   de la pantalla de Contabilidad: **paquete 09** (§7.2), que es el que tiene la selección
   múltiple y el trabajo sobre `CmDataTable`. Es lo que tu propia Discrepancia D5 contemplaba.
   Este paquete conserva **B1–B9: backend completo + tests de controller**, que es donde está su
   valor. Prefijo de `data-testid` canónico: **`accounting-*`**; quedan derogados `acc-id-{id}`,
   `acc-approve-btn-{id}`, `acc-toggle-filters`, `acc-bulk-approve`, `acc-export`.
5. 🔴 **B8 acepta `ids[]` como filtro válido** (decisión tomada en §C.4, era el hueco que dejaba
   sin backend la aprobación masiva por selección vendida en la propuesta §3.6):
   - `params.permit(ids: [])` además de los escalares;
   - `scope = scope.where(id: params[:ids]) if params[:ids].present?`;
   - **`:ids` entra en `FILTER_KEYS`** y cuenta como filtro para la guarda de "al menos un filtro";
   - el tope de 500 se mantiene **y aplica también a `ids[]`**;
   - `count` de la respuesta = filas **efectivamente actualizadas**, no ids recibidos;
   - **test obligatorio**: un `ids[]` que contiene un `excedido` **no lo aprueba** y el `count` lo
     refleja.
   El "Plan B" de N requests secuenciales del paquete 09 queda descartado.
6. 🔴 **La tarea A4 se REESCRIBE.** Instruía modificar `create_edit_register`, método que el
   **paquete 03** elimina y reemplaza por el concern `RegisterAuditable`. **El 03 es dependencia
   DURA de este paquete.** Instrucción nueva: agregar `audit_field :receipt_file` más su entrada
   en `edit_fields` de `audit_register`, **y actualizar la constante golden `HTML_EDICION` del
   paquete 03 en el mismo PR**.
7. **`download_receipt` fuerza la descarga** (contrato con el paquete 12, §7.8). `redirect_to
   receipt_file.url` a secas **navega** en Chromium en vez de descargar, y colgaba el test E4.3
   durante 60 s. Se añade el parámetro a la URL firmada:
   ```ruby
   url = @report_expense.receipt_file.url(
     query: { "response-content-disposition" =>
                "attachment; filename=\"#{@report_expense.receipt_file.file.filename}\"" })
   redirect_to url
   ```
   En el entorno E2E (storage `:file`) el equivalente es `send_file ... disposition: "attachment"`.
8. **`delete_receipt` y `download_receipt` son de ESTE paquete, con esta implementación.** El
   paquete 07 **borró su Tarea 21** y su ruta `DELETE`. Implementación canónica:
   `@report_expense.remove_receipt_file = true` + `save` (no `remove_receipt_file!`), porque el
   segundo salta las validaciones y la auditoría. `data-testid` canónico del enlace de fila:
   **`expense-receipt-link-{id}`** (queda derogado `expense-receipt-download-{id}` del 08).
9. **La previsualización del comprobante SÍ se construye** (propuesta §3.3, "previsualización y
   descarga desde la tabla"). El modal (`receipt-preview-modal` + `expense-receipt-preview-{id}`)
   lo implementa el **paquete 08** sobre la URL de `download_receipt`; este paquete solo garantiza
   que el endpoint responda un `Content-Type` visualizable. Ya no hay que renegociar la palabra
   "previsualización" con el cliente.
10. **`ReportExpense::BUDGET_STATUS_LABELS`: se BORRA el fallback** ("si no existe se crea aquí").
    La define el **paquete 04** (§7.4). Este paquete la consume.
11. **`ReportExpensesListTool::KEYS`**: este paquete aporta **solo** `accounting_approved` y
    `receipt_file_url` (posiciones 27 y 28 de la lista canónica de 28, §7.7). No redefine la lista
    ni toca las claves ajenas. Y **no toca `app/tools/`** más allá de eso: el dueño es el 11.
12. **Se BORRAN los 2 specs E2E de este paquete** (`receipt.spec.js`, `accounting.spec.js`).
    Todos los specs funcionales son del **paquete 12** (§7.2); los dos tenían además el mismo
    nombre de archivo que los del 12 y del 09.
13. **Test nuevo obligatorio** (hueco de la tabla de verdad §2.4): `get_accounting_expenses`
    **no** devuelve por defecto un gasto con `accounting_approved: true` que fue empujado a
    `excedido` por un recálculo, **pero sí** lo devuelve con el filtro "Aprobados por contabilidad".
14. **Numeración canónica** (§7.1): tus dependencias declaradas por nombre se resuelven así —
    "Paquete 0 de desbloqueo" = **01**; "paquete de Presupuesto" = **04** (y la rake de permisos
    ahora es del **01**); "Multimoneda" = **05**; "refactor de `search`" = **03**; "E2E/seeds" =
    **01** (infra) y **12** (specs).
15. **`test/fixtures/files/`**: los crea el **paquete 01** con el inventario consolidado (§7.12).
    Este paquete solo declara "ya existen" y usa los nombres canónicos.

> Documento de ejecución. Se lee después de `00-ARQUITECTURA.md`, no en vez de él.
> Todo lo que aquí se decide y no está en la arquitectura va marcado como **Asumido:**.
> Las diferencias con la arquitectura están en la sección "Discrepancias con la arquitectura"
> al final; ninguna se resolvió en silencio.

---

## Objetivo

Al terminar este paquete un gasto puede llevar un comprobante adjunto (subir, ver, descargar,
reemplazar, borrar) que sobrevive a un deploy de Heroku; existe el **backend completo** de la
pantalla de Contabilidad —endpoints que listan los gastos no excedidos, los aprueban uno a uno o
en masa con registro de quién y cuándo, y exportan a Excel—; y tanto el Excel de Gastos como el de
Contabilidad salen con 18 columnas —incluida el **ID de registro** como referencia contable— sin
que la importación se rompa con los archivos viejos que los usuarios ya tienen guardados.

⚠️ **Este paquete es solo backend** (corrección de auditoría, §7.1). La pantalla React de
Contabilidad, el ítem del menú lateral y los formularios de gasto los construyen los paquetes
**09** y **08**; los specs E2E, el **12**; las migraciones, el **02**.

---

## Dependencias

Numeración canónica de §7.1 (corrección 14 del bloque). Dependencias duras: **01, 02 y 03**.

| Depende de | Por qué |
|---|---|
| **01 — Infraestructura de pruebas** (`01-infraestructura-de-pruebas.md`) | Sin `chromedriver-helper` eliminado, las 4 fixtures rotas arregladas, `Devise::Test::IntegrationHelpers` y el helper `as_user`, no se puede escribir **ni un solo** test de este paquete. Además la Capa 1 (`current_actor_id` en `ReportExpense`) es indispensable: `ReportExpense.import` y todo test que cree gastos revientan en `User.current.id`. El 01 también crea `test/fixtures/**` (incluido `test/fixtures/files/`, §7.12) y `lib/tasks/permissions_gastos_ia.rake` con el bloque `"Contabilidad"`. |
| **02 — Migraciones y esquema** (`02-migraciones-y-esquema.md`) | Dueño único de **las 6 migraciones** (§7.2): `receipt_file`, `accounting_approved*` + su índice, `budget_status` / `budget_reason` / `expense_budget_id`, y las columnas multimoneda. Este paquete **no crea ninguna migración**; solo verifica la precondición de arranque de abajo. |
| **03 — Deuda técnica bloqueante** (`03-deuda-tecnica-bloqueante.md`) — **dependencia DURA** | Dueño de `config/initializers/carrierwave.rb`, de los 4 uploaders existentes y del concern `RegisterAuditable`, que **reemplaza a `create_edit_register`**. La tarea A4 de este paquete usa `audit_field :receipt_file` sobre ese concern y actualiza la constante golden `HTML_EDICION` del 03 en el mismo PR (corrección 6). También es dueño del refactor de `ReportExpense.search` (invariante #6), del que este paquete **no** depende: la pantalla de Contabilidad arma su propio scope en el controller. |
| **04 — Presupuesto** (consumo, misma ola) | La vista de contabilidad **es** `where.not(budget_status: "excedido")` (§2.3) y el Excel exporta "Estado presupuestal" y "Motivo presupuestal". La constante `ReportExpense::BUDGET_STATUS_LABELS` la define el **04** (§7.4); aquí solo se consume, **sin fallback** (corrección 10). |
| **05 — Multimoneda** (consumo, misma ola) | Las columnas 14–16 del Excel (Moneda, Valor extranjero, TRM) y el filtro `currency` leen esas columnas. El import las escribe. |

**No depende de** (y no debe esperarlos): el **10** (extracción asistida, `extract_receipt`), el
**11** (tools MCP nuevas), el **08** (tablero de presupuesto), el **09** (pantalla React de
Contabilidad) ni el **12** (specs E2E).

**Precondición de arranque (corrección 1).** Antes de la primera tarea, verificar que el paquete
02 ya aplicó su esquema:

```ruby
raise "Falta el paquete 02" unless ActiveRecord::Base.connection.column_exists?(:report_expenses, :receipt_file) &&
                                   ActiveRecord::Base.connection.column_exists?(:report_expenses, :accounting_approved)
```

Las credenciales de S3 (`AWS_ACCESS_KEY`, `AWS_SECRET_KEY`, `AWS_BUCKET` y la región del bucket)
**ya no son una bifurcación de este paquete**: se verifican en la **Tarea 0** (§7.10, ítem 0.6) y
bloquean el arranque del **03**, no el de este documento (§4.8, §6.5).

---

## Archivos

### A crear

| Ruta | Qué se hace |
|---|---|
| `app/uploaders/receipt_uploader.rb` | `ReceiptUploader` con `extension_allowlist`, `content_type_allowlist`, `size_range`, `fog_public = false`, sin versiones ni MiniMagick. |
| `app/controllers/accounting_expenses_controller.rb` | Controller nuevo: `index`, `get_accounting_expenses`, `update_accounting_state`, `update_accounting_filter_values`, `download_file`. |
| `app/views/accounting_expenses/download_file.xlsx.axlsx` | Plantilla axlsx de 18 columnas con `column_widths` de 18 valores. |
| `test/models/receipt_uploader_test.rb` | Tests del uploader. |
| `test/models/report_expense_import_test.rb` | Tests de `ReportExpense.import` (layout v1 y v2). |
| `test/models/report_expense_accounting_test.rb` | Tests de scopes y helpers de contabilidad en el modelo. |
| `test/controllers/report_expenses_receipt_test.rb` | Tests multipart de create/update, `delete_receipt`, `download_receipt`, mass-assignment. |
| `test/controllers/accounting_expenses_controller_test.rb` | Tests de los 5 endpoints de contabilidad, con sus gates de permiso. |
| `test/integration/report_expenses_export_test.rb` | Tests de las dos plantillas axlsx (encabezados y contenido). |

**Retirados de esta tabla por la auditoría** (§7.2 — *un archivo, un dueño*): las dos migraciones
`20260402000001` y `20260404000001` (dueño **02**); `app/views/accounting_expenses/index.html.erb`
y `app/javascript/packs/AccountingExpenseIndex.js` (dueño **09**); todo
`test/fixtures/files/*` — `comprobante.pdf`, `comprobante.jpg`, `malicioso.exe`,
`gastos_legacy_11col.xlsx`, `gastos_v2_18col.xlsx` — (dueño **01**, §7.12: aquí solo se declara
que **ya existen** y se usan los nombres canónicos); y los dos specs
`test/e2e/specs/receipt.spec.js` y `test/e2e/specs/accounting.spec.js` (dueño **12**).

### A modificar

| Ruta | Qué se hace |
|---|---|
| `app/models/report_expense.rb` | `mount_uploader :receipt_file, ReceiptUploader`; `belongs_to :accounting_approved_by`; scopes `accounting_visible` / `accounting_pending`; métodos `receipt_file_url`, `accounting_state_label`; `audit_field :receipt_file` sobre el concern `RegisterAuditable` del **03** (+ su entrada en `edit_fields`); reescritura de `self.import` con detección de layout. |
| `app/controllers/report_expenses_controller.rb` | **Solo** las acciones `delete_receipt` y `download_receipt` con su `before_action :report_expense_find` (§7.2: el resto del archivo es del **07**). |
| `config/routes.rb` | 7 rutas nuevas (5 de contabilidad, 2 de comprobante). ⚠️ En la ola 3 lo escriben **tres** paquetes: 05 (`get_exchange_rate`), este, y **10** (`post "extract_receipt/report_expenses"`). Rebase en el orden 05 → 06 → 10. |
| `config/locales/en.yml` | Claves `errors.messages.*` de CarrierWave con texto en español (el `default_locale` del repo es `:en`). |
| `app/views/report_expenses/download_file.xlsx.axlsx` | De 12 a 18 columnas, `ID` primera, `column_widths` con 18 valores. |
| `app/helpers/application_helper.rb` | **Solo** `budget_status_label(value)` y `accounting_state_label(value)` para las plantillas axlsx. ⚠️ **Archivo repartido por método (§7.2)**: `get_currencies` es del **05** (que se mergea antes) y `authorization_accounting_expenses` / `controller_name_helper` son del **09**. Se **agregan los dos métodos al final del helper** y se rebasa antes del PR; orden 05 → 06 → 09. |
| `app/tools/report_expenses_list_tool.rb` | Agregar a `KEYS` **solo** `accounting_approved` y `receipt_file_url`, posiciones 27 y 28 de §7.7 (los demás campos los agregan el **05** y el **11**). |

**Retirados de esta tabla por la auditoría** (§7.2): `app/uploaders/{avatar,certificate,information,order}_uploader.rb`
y `config/initializers/carrierwave.rb` (dueño **03**);
`app/javascript/packs/ReportExpenseIndex.js` y
`app/javascript/components/ShowConstCenter/ExpensesTable.jsx` (columnas y filtros → **09**;
`renderModal()` → **08**); `app/javascript/components/ReportExpense/FormCreate.jsx` (dueño **08**);
`app/javascript/stylesheets/design_system.css` (ruta inexistente; la clase real es
`.cm-file-input` en `app/assets/stylesheets/design_system.css` y **no se agrega CSS**, criterio 42
del **08**); `app/views/layouts/user.html.erb` y `authorization_accounting_expenses` (dueño **09**);
`lib/tasks/permissions_gastos_ia.rake` y `lib/tasks/create_config.rake` (dueño **01**, movidos allí
para romper el ciclo 06↔07); `db/seeds/e2e.rb` (dueño **01**).

---

## Tareas

Cada tarea es un commit. El orden importa: A (comprobante) → B (contabilidad) → C (Excel), porque
el Excel exporta columnas que las tareas A y B exponen en el modelo y el serializer.

**Numeración congelada.** Las tareas retiradas por la auditoría **conservan su número y su
encabezado** porque otros documentos del plan las citan (p. ej. "el bloque B10 del 06"). Un
encabezado seguido de la línea *"RETIRADA por auditoría"* significa **no hacer nada aquí**: el
trabajo es de otro paquete.

### Bloque A — Comprobante adjunto

**A1. Migración del comprobante.**
> **RETIRADA por auditoría.** Dueño único: paquete 02. Ver el bloque de correcciones al inicio.

**A2. `ReceiptUploader` + mensajes de error en español.**
Crear `app/uploaders/receipt_uploader.rb` **exactamente** así (sin la línea `storage :file` que
tienen los otros cuatro):

```ruby
class ReceiptUploader < CarrierWave::Uploader::Base
  storage(Rails.env.production? ? :fog : :file)

  self.fog_public = false

  def store_dir
    "uploads/#{model.class.to_s.underscore}/#{mounted_as}/#{model.id}"
  end

  def extension_allowlist
    %w[jpg jpeg png pdf webp heic]
  end

  def content_type_allowlist
    ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"]
  end

  def size_range
    1.byte..10.megabytes
  end
end
```

En `config/locales/en.yml` (el `default_locale` del repo es `:en`; se sobrescriben las claves
inglesas con texto español, **no** se crea un `es.yml` que nadie cargaría) agregar bajo `en:`:

```yaml
  errors:
    messages:
      extension_allowlist_error: "No se permiten archivos %{extension}. Tipos permitidos: %{allowed_types}"
      content_type_allowlist_error: "No se permiten archivos de tipo %{content_type}. Tipos permitidos: %{allowed_types}"
      max_size_error: "El archivo es demasiado grande (máximo %{max_size})"
      min_size_error: "El archivo está vacío"
      carrierwave_integrity_error: "El archivo no es un tipo permitido"
      carrierwave_processing_error: "No se pudo procesar el archivo"
```

`carrierwave 3.1.2` (confirmado en `Gemfile.lock:141`) usa la API `*_allowlist`; el
`extension_whitelist` comentado en los 4 uploaders viejos es la API deprecada y no se copia.

**A3. Corregir los 4 uploaders existentes a fog.**
> **RETIRADA por auditoría.** Dueño único: paquete 03. Ver el bloque de correcciones al inicio.

**A4. Montar el uploader en el modelo.**
En `app/models/report_expense.rb`, debajo de los `belongs_to`:
```ruby
mount_uploader :receipt_file, ReceiptUploader
```
`mount_uploader` instala por sí solo el `after_destroy :remove_receipt_file!`: **no hay que
escribir código de borrado al destruir el gasto** (sí hay que probarlo, ver U1.7).

Agregar el método público:
```ruby
def receipt_file_url
  receipt_file.present? ? receipt_file.url : nil
end
```

Auditoría (**reescrita por la corrección 6**): `create_edit_register` **ya no existe** — el paquete
03 lo reemplazó por el concern `RegisterAuditable`. Aquí se declara el campo sobre ese concern:

```ruby
audit_field :receipt_file
```

y se agrega su entrada correspondiente en `edit_fields` de `audit_register`, siguiendo literalmente
la firma que publica el 03. **En el mismo PR** hay que actualizar la constante golden
`HTML_EDICION` del paquete 03, que fija el HTML esperado del registro de edición: si no se
actualiza, el test golden del 03 se pone rojo.
⚠️ No se toca el encabezado del registro ni el umbral de longitud del concern (§4.7 arquitectura);
el typo `module: "Gatos"` es del 03 y tampoco se toca desde aquí.

**A5. Backend del comprobante: borrado y descarga.**
En `app/controllers/report_expenses_controller.rb` este paquete aporta **solo estas dos acciones**
(§7.2: el archivo es del paquete 07 — strong params, filtros, orden y cableado presupuestal son
suyos). Los strong params `:receipt_file` / `:remove_receipt_file` los agrega el **07**; aquí solo
se consumen.
- Agregar a `before_action :report_expense_find` las acciones `:delete_receipt, :download_receipt`.
- Acción nueva:

```ruby
def delete_receipt
  unless is_admin? || has_menu_permission?("Gastos", "Editar")
    return render json: { type: "error", message: ["No tiene permiso para realizar esta acción"] }, status: :forbidden
  end
  if @report_expense.receipt_file.blank?
    return render json: { success: "¡Ocurrió un error!", type: "error", message: ["El gasto no tiene comprobante adjunto"] }
  end
  @report_expense.remove_receipt_file = true
  if @report_expense.save
    render json: { success: "¡El comprobante fue eliminado!", type: "success",
                   register: ActiveModelSerializers::SerializableResource.new(@report_expense, each_serializer: ReportExpenseSerializer) }
  else
    render json: { success: "¡Ocurrió un error!", type: "error", message: @report_expense.errors.full_messages }
  end
end

def download_receipt
  unless is_admin? || has_menu_permission?("Gastos", "Ver todos") || @report_expense.user_invoice_id == current_user.id
    return render json: { type: "error", message: ["No tiene permiso para realizar esta acción"] }, status: :forbidden
  end
  return render json: { type: "error", message: ["El gasto no tiene comprobante adjunto"] }, status: :not_found if @report_expense.receipt_file.blank?

  # CORREGIDO POR AUDITORIA (correccion 7, §7.8): la descarga se FUERZA.
  url = @report_expense.receipt_file.url(
    query: { "response-content-disposition" =>
               "attachment; filename=\"#{@report_expense.receipt_file.file.filename}\"" })
  redirect_to url
end
```

`download_receipt` firma la URL **en el momento del clic** y redirige; ver "Discrepancias" §D3
para la justificación de por qué existe este endpoint aunque la arquitectura dijera que no hacía
falta.

🔴 **Contrato con el paquete 12 (§7.8), obligatorio.** `redirect_to receipt_file.url` **a secas
navega** en Chromium en vez de descargar (la URL firmada de S3 no lleva `Content-Disposition`) y
colgaba el test E4.3 durante 60 s. Por eso va el parámetro `response-content-disposition` de
arriba. En el entorno E2E (storage `:file`, `E2E_UPLOAD_ROOT=public`) el equivalente es
`send_file ... disposition: "attachment"`, que devuelve la misma cabecera.
**Rails 6.1 no acepta `allow_other_host:`** — no se agrega (se documenta solo para quien migre a
Rails 7).

Rutas en `config/routes.rb`, junto a las de gastos (después de la línea 88):
```ruby
delete "delete_receipt/report_expenses/:id", to: "report_expenses#delete_receipt"
get    "download_receipt/report_expenses/:id", to: "report_expenses#download_receipt"
```

**A6. Serializer.**
> **RETIRADA por auditoría (cierre de la reauditoría). Dueño único: paquete 07.**
> `app/serializers/report_expense_serializer.rb` lo reclamaban **tres** paquetes a la vez (05 con
> +7 atributos de moneda, este con `:receipt_file`/`:accounting_approved`/`:accounting_approved_at`
> + `belongs_to :accounting_approved_by`, y el 07 con "13 atributos nuevos", que es exactamente la
> unión de los otros dos). §7.2 le fija **dueño único 07**, que va solo en su ola.

**Lo que queda aquí es la dependencia declarada y su test de contrato.** El 07 agrega a
`attributes` `:receipt_file`, `:accounting_approved` y `:accounting_approved_at`, y
`belongs_to :accounting_approved_by, serializer: UserSerializer`. AMS serializa el uploader como
`{"url": "..."}` — mismo shape que `order_file` en `sales_order_serializer.rb:30`, que el frontend
ya consume en `OrdenesDeCompraTable.jsx:64`. ⚠️ Ningún atributo nuevo puede llamarse igual que una
asociación (el serializer ya arrastra la colisión `payment_type`); `receipt_file` no lo es. Este
paquete conserva únicamente el **test de contrato** sobre el JSON, que corre en verde con el 07
mergeado.

**A7. Frontend — índice de gastos (`app/javascript/packs/ReportExpenseIndex.js`).**
> **RETIRADA por auditoría.** Dueño único: paquete 09 (`this.columns` y filtros de las dos tablas
> de gastos) y paquete 08 (`renderModal()`). Ver el bloque de correcciones al inicio.

**A8. Frontend — pestaña del centro de costo.**
> **RETIRADA por auditoría.** Dueño único: paquete 09 (`ExpensesTable.jsx`, columnas y `estados`)
> y paquete 08 (`components/ReportExpense/FormCreate.jsx`). Ver el bloque de correcciones al inicio.

**A9. `.cm-input-file` en el design system.**
> **RETIRADA por auditoría.** Dueño único: paquete 08. Ver el bloque de correcciones al inicio.

### Bloque B — Contabilidad

**B1. Migración de contabilidad.**
> **RETIRADA por auditoría.** Dueño único: paquete 02. Ver el bloque de correcciones al inicio.

**B2. Modelo.**
En `app/models/report_expense.rb`:
```ruby
belongs_to :accounting_approved_by, class_name: "User", optional: true

scope :accounting_visible, -> { where.not(budget_status: "excedido") }
scope :accounting_pending, -> { accounting_visible.where(accounting_approved: false) }

def accounting_state_label
  accounting_approved ? "Aprobado" : "Pendiente"
end
```
`accounting_visible` es **la única** definición de la base de la vista de contabilidad; ni el
controller ni la plantilla axlsx pueden reescribir ese `where`. **Única excepción, la de la
corrección 13 / §2.3**: en las *lecturas* (`get_accounting_expenses` y `download_file`), cuando
llega el filtro `accounting_approved=true`, la base se amplía para recuperar los gastos que una
persona ya aprobó y un recálculo posterior empujó a `excedido`. Está declarada una sola vez, en
`filtered_scope` (B6), y **no** aplica a la aprobación masiva.

🔴 **`ReportExpense::BUDGET_STATUS_LABELS` NO se define aquí** (corrección 10). La define el
**paquete 04** (§7.4, su Tarea 12). Este paquete la **consume sin fallback**: si al implementar
esta tarea la constante no existe todavía, se espera al 04; no se crea "por si acaso".

**B3. Serializer.**
> **RETIRADA por auditoría (cierre de la reauditoría). Dueño único: paquete 07.** Ver A6: los tres
> atributos contables y el `belongs_to :accounting_approved_by` los escribe el 07 en su ola. Aquí
> queda el test de contrato sobre el JSON.

**B4. Permisos, helper y menú.**
> **RETIRADA por auditoría.** Dueño único: paquete 01 (`lib/tasks/permissions_gastos_ia.rake` y su
> réplica en `lib/tasks/create_config.rake`, movidos allí para romper el ciclo 06↔07) y paquete 09
> (ítem "Contabilidad" en `app/views/layouts/user.html.erb`, `expense_controllers` y
> `authorization_accounting_expenses`). Ver el bloque de correcciones al inicio.

**B5. Controller de contabilidad — esqueleto, rutas y `index`.**
Rutas en `config/routes.rb`, en bloque, después de las de gastos:
```ruby
get   "accounting_expenses",                     to: "accounting_expenses#index"
get   "get_accounting_expenses",                 to: "accounting_expenses#get_accounting_expenses"
patch "update_accounting_state/:id/:state",      to: "accounting_expenses#update_accounting_state"
patch "update_accounting_filter_values",         to: "accounting_expenses#update_accounting_filter_values"
get   "download_file/accounting_expenses/:type", to: "accounting_expenses#download_file"
```

`app/controllers/accounting_expenses_controller.rb`:
```ruby
class AccountingExpensesController < ApplicationController
  before_action :authenticate_user!
  before_action :require_accounting_module!
  include ApplicationHelper

  MAX_BULK = 500
  SORT_COLUMNS = %w[id invoice_name invoice_date identification invoice_number invoice_value
                    invoice_tax invoice_total currency is_acepted accounting_approved
                    accounting_approved_at created_at updated_at].freeze

  def index
    @estados = {
      approve:  is_admin? || has_menu_permission?("Contabilidad", "Aprobar"),
      export:   is_admin? || has_menu_permission?("Contabilidad", "Exportar a excel"),
      show_all: is_admin? || has_menu_permission?("Contabilidad", "Ver todos")
    }
  end

  private

  def is_admin?
    @_is_admin ||= current_user.rol.name == "Administrador"
  end

  def require_accounting_module!
    return if is_admin? || has_menu_permission?("Contabilidad")
    if request.format.json? || request.path.start_with?("/get_", "/update_", "/download_file")
      render json: { type: "error", message: ["No tiene permiso para realizar esta acción"] }, status: :forbidden
    else
      redirect_to root_path, alert: "No tiene permiso para ingresar al módulo de Contabilidad"
    end
  end
end
```
⚠️ **La vista `app/views/accounting_expenses/index.html.erb` NO la crea este paquete** (§7.2:
dueño **09**, junto con el pack `AccountingExpenseIndex.js`). Este paquete entrega la acción
`index` con su `@estados` y la ruta que la publica; el 09 escribe el ERB que monta el pack y
consume ese `@estados`. Hasta que el 09 mergee, `GET /accounting_expenses` no tiene plantilla: es
esperado y **no** se resuelve creando un ERB provisional aquí.

**B6. `GET /get_accounting_expenses`.**
Método privado `filtered_scope` (lo comparten `get_accounting_expenses`,
`update_accounting_filter_values` y `download_file` — una sola definición, cero duplicación):

```ruby
# `include_approved_exceeded:` solo lo usan las lecturas (get_accounting_expenses y download_file).
# La aprobacion masiva lo deja en false para no tocar NUNCA un excedido.
def filtered_scope(include_approved_exceeded: false)
  base = if include_approved_exceeded && params[:accounting_approved].to_s == "true"
           # CORRECCION 13 / §2.3: un gasto ya aprobado por contabilidad que un recalculo empujo a
           # `excedido` sale de la vista por defecto, pero se recupera con el filtro "Aprobados".
           ReportExpense.where("report_expenses.budget_status <> ? OR report_expenses.accounting_approved = ?", "excedido", true)
         else
           ReportExpense.accounting_visible
         end
  scope = base.includes(:cost_center, :user_invoice, :type_identification, :payment_type,
                        :last_user_edited, :user, :accounting_approved_by, :expense_budget)
  scope = scope.where(user_invoice_id: current_user.id) unless is_admin? || has_menu_permission?("Contabilidad", "Ver todos")

  # CORREGIDO POR AUDITORIA (correccion 5, §C.4): `ids[]` es un filtro valido.
  scope = scope.where(id: params[:ids])                                        if params[:ids].present?
  scope = scope.where(cost_center_id: params[:cost_center_id])                 if params[:cost_center_id].present?
  scope = scope.where(user_invoice_id: params[:user_invoice_id])               if params[:user_invoice_id].present?
  scope = scope.where("report_expenses.invoice_date >= ?", params[:start_date]) if params[:start_date].present?
  scope = scope.where("report_expenses.invoice_date <= ?", params[:end_date])   if params[:end_date].present?
  scope = scope.where(accounting_approved: params[:accounting_approved])        if params[:accounting_approved].present?
  scope = scope.where(is_acepted: params[:is_acepted])                          if params[:is_acepted].present?
  scope = scope.where(currency: params[:currency])                              if params[:currency].present?
  scope = scope.where(budget_status: params[:budget_status])                    if params[:budget_status].present?
  scope = scope.where(type_identification_id: params[:type_identification_id])  if params[:type_identification_id].present?
  scope = scope.where(payment_type_id: params[:payment_type_id])                if params[:payment_type_id].present?

  if params[:q].present?
    t = "%#{params[:q].to_s.downcase}%"
    scope = scope.where(
      "LOWER(report_expenses.invoice_name) LIKE :t OR LOWER(report_expenses.description) LIKE :t OR " \
      "LOWER(report_expenses.invoice_number) LIKE :t OR LOWER(report_expenses.identification) LIKE :t OR " \
      "CAST(report_expenses.id AS TEXT) LIKE :t", t: t
    )
  end
  scope
end
```
⚠️ **No se llama a `ReportExpense.search`.** Ese método define scopes de clase en runtime
(`report_expense.rb:56-75`) y es una condición de carrera entre requests (invariante #6). El
scope de esta pantalla se compone aquí y no muta la clase.

`get_accounting_expenses` (llama a `filtered_scope(include_approved_exceeded: true)`):
- `total = filtered_scope(include_approved_exceeded: true).count` **antes** de paginar.
- `per_page = [(params[:per_page] || 50).to_i, 100].min`.
- Los `strong params` de esta acción y de la masiva permiten `ids: []` además de los escalares:
  `params.permit(ids: [])` (corrección 5).
- `dir = params[:dir] == "asc" ? "ASC" : "DESC"`; si `SORT_COLUMNS.include?(params[:sort])` →
  `order(Arel.sql("report_expenses.#{params[:sort]} #{dir}"))`; si `params[:sort] == "cost_center_code"`
  → `joins(:cost_center).order(Arel.sql("cost_centers.code #{dir}"))`; si `"user_invoice_name"` →
  `joins(:user_invoice).order(Arel.sql("users.names #{dir}"))`; si no → `order(invoice_date: :desc)`.
- Render: `{ data: ActiveModelSerializers::SerializableResource.new(rows, each_serializer: ReportExpenseSerializer), total: total }`.

**B7. `PATCH /update_accounting_state/:id/:state`.**
```ruby
def update_accounting_state
  return forbidden! unless is_admin? || has_menu_permission?("Contabilidad", "Aprobar")
  expense = ReportExpense.find(params[:id])
  approve = params[:state].to_s == "true"

  if approve && expense.budget_status == "excedido"
    return render json: { success: "¡Ocurrió un error!", type: "error",
                          message: ["No se puede aprobar contablemente un gasto que excede el presupuesto"] }
  end

  ok = expense.update(
    accounting_approved: approve,
    accounting_approved_by_id: approve ? current_user.id : nil,
    accounting_approved_at: approve ? Time.now : nil
  )
  return render json: { success: "¡Ocurrió un error!", type: "error", message: expense.errors.full_messages } unless ok

  RegisterEdit.create(
    user_id: current_user.id, register_user_id: expense.id, state: "pending",
    date_update: Time.now, module: "Contabilidad", type_edit: "edito",
    description: "<p><strong>(APROBACIÓN CONTABLE)</strong></p><p>Gasto #{expense.id}: <b>#{expense.accounting_state_label}</b> por #{current_user.names}</p>"
  )

  render json: { success: approve ? "¡El gasto fue aprobado por contabilidad!" : "¡Se retiró la aprobación contable!",
                 type: "success",
                 register: ActiveModelSerializers::SerializableResource.new(expense, each_serializer: ReportExpenseSerializer) }
end
```
El `RegisterEdit` se escribe **explícitamente aquí**, no a través del concern `RegisterAuditable`
del paquete 03: los campos de contabilidad **no** se declaran como `audit_field` porque el texto
generado quedaría por debajo del umbral de longitud del concern y no registraría nada, y
declararlos obligaría a tocar ese umbral (§4.7), que es del 03. Módulo `"Contabilidad"`, sin el
typo `"Gatos"`.

Helper privado: `def forbidden!; render json: { type: "error", message: ["No tiene permiso para realizar esta acción"] }, status: :forbidden; end`.

**B8. `PATCH /update_accounting_filter_values` (aprobación masiva).**
```ruby
# CORREGIDO POR AUDITORIA (§C.4): `ids` es un FILTRO VALIDO. Es lo que da backend a la
# aprobacion por seleccion multiple del paquete 09 (propuesta §3.6).
FILTER_KEYS = %i[cost_center_id user_invoice_id start_date end_date is_acepted currency
                 budget_status type_identification_id payment_type_id q ids].freeze

def update_accounting_filter_values
  return forbidden! unless is_admin? || has_menu_permission?("Contabilidad", "Aprobar")

  unless FILTER_KEYS.any? { |k| params[k].present? }
    return render json: { success: "¡Ocurrió un error!", type: "error",
                          message: ["Debe aplicar al menos un filtro antes de aprobar masivamente"] }
  end

  ids = filtered_scope.where(accounting_approved: false).limit(MAX_BULK + 1).pluck(:id)
  if ids.size > MAX_BULK
    return render json: { success: "¡Ocurrió un error!", type: "error",
                          message: ["El filtro devuelve más de #{MAX_BULK} gastos. Afine el filtro antes de aprobar masivamente"] }
  end

  now = Time.now
  count = ReportExpense.where(id: ids).update_all(
    accounting_approved: true, accounting_approved_by_id: current_user.id,
    accounting_approved_at: now, last_user_edited_id: current_user.id, updated_at: now
  )

  RegisterEdit.create(user_id: current_user.id, register_user_id: current_user.id, state: "pending",
                      date_update: now, module: "Contabilidad", type_edit: "edito",
                      description: "<p><strong>(APROBACIÓN CONTABLE MASIVA)</strong></p><p>#{count} gastos aprobados por #{current_user.names}</p>")

  render json: { success: "#{count} gastos aprobados por contabilidad", type: "success", count: count }
end
```
🔴 **`ids[]` — obligatorio (auditoría, §C.4).** La línea
`scope = scope.where(id: params[:ids]) if params[:ids].present?` **ya está en la definición
canónica de `filtered_scope` de B6**; aquí no se duplica. Los strong params permiten
`params.permit(ids: [])`. Reglas:
- Esta acción llama a `filtered_scope` **sin** `include_approved_exceeded` (queda en `false`), para
  que la excepción de lectura de la corrección 13 no abra la puerta a aprobar un `excedido`.
- `:ids` **cuenta como filtro** para la guarda de arriba (por eso está en `FILTER_KEYS`).
- El tope `MAX_BULK` (500) **aplica también a `ids[]`**: más de 500 ids ⇒ el mismo error.
- `count` es el de filas **efectivamente actualizadas** (lo devuelve `update_all`), **no** el de
  ids recibidos: un `ids[]` con un `excedido` o un ya aprobado no lo cuenta.
- **Test obligatorio**: `ids[]` que contiene un `excedido` **no lo aprueba** (`filtered_scope` ya
  lo excluye vía `accounting_visible`) y el `count` de la respuesta lo refleja.

Decisiones explícitas:
- `accounting_approved` **no** cuenta como filtro para la guarda: es el estado objetivo, no un
  recorte; aceptarlo dejaría pasar `accounting_approved=false` (= toda la tabla) y reproduciría
  exactamente el bug de `report_expenses_controller.rb:155-178`.
- `update_all` y no `relation.update`: evita 500 `RegisterEdit` fantasma y 500 rondas de
  callbacks. Escribe `last_user_edited_id` y `updated_at` a mano porque `update_all` no dispara
  `edit_values` ni `touch`.
- `.limit(MAX_BULK + 1)` para detectar el desborde con una sola query sin traer 10.000 ids.
- `filtered_scope` ya excluye `excedido` (`accounting_visible`): **nunca** se aprueba un excedido
  en masa.

**B9. `GET /download_file/accounting_expenses/:type` + plantilla axlsx.**
```ruby
def download_file
  return forbidden! unless is_admin? || has_menu_permission?("Contabilidad", "Exportar a excel")
  @items = if params[:type] == "filtro"
             filtered_scope(include_approved_exceeded: true).order(invoice_date: :desc)
           else
             ReportExpense.accounting_visible
                          .includes(:cost_center, :user_invoice, :type_identification, :payment_type, :accounting_approved_by)
                          .then { |s| (is_admin? || has_menu_permission?("Contabilidad", "Ver todos")) ? s : s.where(user_invoice_id: current_user.id) }
                          .order(invoice_date: :desc)
           end
  render xlsx: "Contabilidad de gastos", template: "accounting_expenses/download_file.xlsx.axlsx"
end
```

`app/views/accounting_expenses/download_file.xlsx.axlsx` — **18 columnas, 18 anchos** (el de
gastos hoy declara 11 anchos para 12 columnas; **no replicar ese bug**):

```ruby
wb = xlsx_package.workbook

wb.add_worksheet(name: "Items") do |sheet|
  sheet.add_row ["ID", "Centro de costo", "Responsable", "Fecha de factura", "Nombre",
                 "NIT / CEDULA", "Descripcion", "Numero de factura", "Tipo", "Medio de pago",
                 "Estado operativo", "Estado presupuestal", "Motivo presupuestal", "Moneda",
                 "Valor extranjero", "TRM", "Valor del pago (COP)", "IVA (COP)"]
  @items.each do |task|
    sheet.add_row [
      task.id,
      task.cost_center.present? ? task.cost_center.code : "",
      task.user_invoice.present? ? task.user_invoice.names : "",
      task.invoice_date,
      task.invoice_name,
      task.identification,
      task.description,
      task.invoice_number,
      task.type_identification.present? ? task.type_identification.name : "",
      task.payment_type.present? ? task.payment_type.name : "",
      task.is_acepted ? "Aceptado" : "Creado",
      budget_status_label(task.budget_status),
      task.budget_reason,
      task.currency,
      task.foreign_value,
      task.exchange_rate,
      task.invoice_value,
      task.invoice_tax
    ]
  end
  sheet.column_widths 10, 20, 30, 20, 20, 20, 40, 20, 25, 25, 18, 20, 40, 10, 18, 15, 20, 20
end
```
⚠️ `task.user_invoice.names` **sin** el `present?` revienta el export completo con
`NoMethodError` cuando un gasto tiene `user_invoice_id` colgante — que es exactamente lo que hoy
hace `report_expenses/download_file.xlsx.axlsx:8`. Se corrige en las dos plantillas.

Helpers en `app/helpers/application_helper.rb`:
```ruby
def budget_status_label(value)
  ReportExpense::BUDGET_STATUS_LABELS[value.to_s] || value.to_s
end
```

**B10. Pack `AccountingExpenseIndex.js`.**
> **RETIRADA por auditoría.** Dueño único: paquete 09. Ver el bloque de correcciones al inicio.

**B11. Seed E2E.**
> **RETIRADA por auditoría.** Dueño único: paquete 01. Ver el bloque de correcciones al inicio.

### Bloque C — Excel

**C1. `report_expenses/download_file.xlsx.axlsx` a 18 columnas.**
Se reescribe con **exactamente los mismos 18 encabezados y el mismo orden** que la plantilla de
contabilidad (C1 y B9 deben ser copias byte a byte salvo el nombre del archivo), incluidos los 18
`column_widths` y las guardas `present?` sobre `user_invoice`. Que las dos plantillas sean
idénticas no es casual: es lo que permite que **un solo** mapeo de import lea los dos archivos.

**C2. `ReportExpense.import` — detección de layout y mapeo de 18 posiciones.**
Se reescribe `self.import(file, user)` (`report_expense.rb:77-142`) conservando la firma, el
retorno `[success_records, fail_records]` y el uso de `Roo`, pero con detección de layout:

```ruby
LEGACY_HEADER_KEYS = %w[cost_center_id user_invoice_id invoice_date invoice_name identification
                        description invoice_number type_identification_id payment_type_id
                        invoice_value invoice_tax].freeze

V2_HEADER_KEYS = %w[id cost_center_id user_invoice_id invoice_date invoice_name identification
                    description invoice_number type_identification_id payment_type_id
                    _estado_operativo _budget_status _budget_reason currency foreign_value
                    exchange_rate invoice_value invoice_tax].freeze

def self.detect_layout(raw_header)
  first = raw_header[0].to_s.strip.downcase
  (raw_header.compact.length >= 18 && first == "id") ? :v2 : :v1
end
```

Reglas del mapeo, obligatorias:

| Pos | Encabezado | Campo | Import |
|---:|---|---|---|
| 0 | ID | `id` | Llave de actualización: `find_by(id:) \|\| new`. Vacío ⇒ crea. |
| 1 | Centro de costo | `cost_center_id` | Resuelve por `code` (`LOWER(TRIM(code))`). |
| 2 | Responsable | `user_invoice_id` + `user_id` | Resuelve por `names`. |
| 3 | Fecha de factura | `invoice_date` | Directo. |
| 4 | Nombre | `invoice_name` | Directo. |
| 5 | NIT / CEDULA | `identification` | Directo. |
| 6 | Descripcion | `description` | Directo. |
| 7 | Numero de factura | `invoice_number` | Directo. |
| 8 | Tipo | `type_identification_id` | Resuelve por `ReportExpenseOption.name`. |
| 9 | Medio de pago | `payment_type_id` | Resuelve por `ReportExpenseOption.name`. |
| 10 | Estado operativo | `is_acepted` | **IGNORADO.** |
| 11 | Estado presupuestal | `budget_status` | **IGNORADO** — lo escribe solo el sistema (§2.1). |
| 12 | Motivo presupuestal | `budget_reason` | **IGNORADO.** |
| 13 | Moneda | `currency` | `row["currency"].presence \|\| Currency::DEFAULT`, y se conserva **solo si `Currency.valid?`**; si no, `Currency::DEFAULT` (`"COP"`). |
| 14 | Valor extranjero | `foreign_value` | `to_d` si presente **y `Currency.foreign?(currency)`**; si no, `nil`. |
| 15 | TRM | `exchange_rate` | `to_d` si presente **y `Currency.foreign?(currency)`**; además `exchange_rate_date = invoice_date` y `exchange_rate_source = "manual"` (el Excel no trae procedencia). |
| 16 | Valor del pago (COP) | `invoice_value` | `to_f`. **Nunca** se recalcula desde `foreign_value` (invariante #3). Además, si `Currency.foreign?(currency)`, **`report_expense.cop_manual_override = row["invoice_value"].present?`**: si el Excel trae los pesos, se respetan como verdad; si viene vacío, el modelo calcula desde `foreign_value × exchange_rate`. |
| 17 | IVA (COP) | `invoice_tax` | `to_f`. |
| — | — | `invoice_total` | Calculado: `invoice_value + invoice_tax` (comportamiento actual, se conserva). |

En layout `:v1` el mapeo es el actual (`report_expense.rb:84-94`, 11 posiciones, sin `id` ⇒
siempre `new`, sin moneda) y se comporta **exactamente igual que hoy**.

🔴 **Dueño único de `ReportExpense.import`: este paquete (fila propia en §7.2).** El paquete 05
traía una Tarea 17 que escribía **el mismo bloque** con semántica incompatible (reclamaba
`header[13..15]` y su propio bloque de asignación); **esa tarea está RETIRADA** y sus dos reglas
—`Currency.foreign?` / `Currency::DEFAULT` y `cop_manual_override`— quedaron **absorbidas en las
filas 13–16 de la tabla de arriba**, que es ahora el único lugar del plan donde están escritas. El
05 se mergea **antes** que este paquete (orden `04 → 05 → 06 → 10`, §7.3), así que `Currency` ya
existe cuando este código corre. Los 4 casos de `test/models/report_expense_import_currency_test.rb`
del 05 son el contrato que este mapeo debe satisfacer.

Reglas adicionales:
- **Quitar los 8 `puts` de depuración** del método (líneas 81, 102-116, 134, 137) y reemplazarlos
  por `Rails.logger.debug`. Hoy inundan el log de producción con los datos de cada factura.
- El `rescue => e` por fila se conserva: una fila mala no aborta el archivo.
- `report_expense.save!` sigue disparando los callbacks; corre dentro del request de
  `upload_file` (`User.current` seteado) y en test dentro de `as_user`.
- **Asumido:** en layout `:v2` con `id` presente y encontrado, la fila **actualiza** el registro
  existente. Es lo que el código actual ya intenta (`find_by(id: row["id"]) || new`) y nunca
  logra porque hoy `header[0]` se pisa con `"cost_center_id"`. Se documenta en el manual de
  usuario: *"si borra la columna ID, el archivo crea gastos nuevos; si la conserva, los
  actualiza"*.

**C3. `id` ordenable en la pantalla de Gastos.**
> **RETIRADA por auditoría.** Dueño único: paquete 07 (§7.2 — `report_expenses_controller.rb`:
> strong params, filtros y orden; de este paquete solo salen `delete_receipt` y `download_receipt`).
> Ver el bloque de correcciones al inicio.

**C4. MCP: `KEYS`.**
En `app/tools/report_expenses_list_tool.rb:17-19` agregar a `KEYS` **solo dos**:
`accounting_approved` y `receipt_file_url` (método del modelo creado en A4, no columna),
**posiciones 27 y 28 de la lista canónica de 28** (§7.7). No se redefine la lista, no se reordena y
no se tocan las claves ajenas: las 17–19 las agrega el **11**, las 20–26 el **05**. El resto de
`app/tools/` es del **11** (§7.2) y **no se toca**.
⚠️ `KEYS` cambia a la vez la salida de `report_expenses_list`, `_get` y `_create`.
✅ **Conflicto §7.2 vs §7.7 CERRADO por la reauditoría a favor de §7.7.** La fila de `app/tools/*`
de §7.2 quedó reescrita —*"dueño 11; única excepción, la de §7.7: el 05 agrega las claves 20–26 y
el 06 las 27–28, nada más"*— y **la frase "06 borra su C4" está eliminada de §7.2**. C4 se ejecuta
tal como está aquí: si se hubiera borrado, `KEYS.size == 28` (criterio compartido por 05, 06 y 11)
habría sido inalcanzable por dos claves.

---

## Pruebas unitarias (Minitest)

Todas las que crean, editan o borran un gasto van envueltas en `as_user(users(:admin)) { ... }`
(helper del **paquete 01**). Sin eso, el registro de creación revienta con
`NoMethodError: undefined method 'id' for nil`.

**Fixtures: dueño único = paquete 01** (§7.2). Este paquete **no crea ni reescribe** ningún `.yml`
ni ningún archivo de `test/fixtures/files/`; solo **declara que ya existen** y usa los nombres
canónicos. Las etiquetas que consume de `test/fixtures/report_expenses.yml` son
`gasto_aprobado` (`budget_status: aprobado`), `gasto_sin_presupuesto`, `gasto_excedido`
(`budget_status: excedido`) y `gasto_con_comprobante`; los archivos que consume de
`test/fixtures/files/` son `comprobante.pdf`, `comprobante.jpg`, `malicioso.exe`,
`disfrazado.png`, `gastos_legacy_11col.xlsx` y `gastos_v2_18col.xlsx`. Si alguna etiqueta o
archivo falta cuando se implemente este paquete, **se pide al 01**, no se agrega aquí.
✅ Los dos `.xlsx` **ya están en el inventario canónico de §7.12** con dueño **01** (se le
agregaron en el cierre de la reauditoría, junto con `gastos_multimoneda.xlsx` del 05): este
paquete solo los consume.

### `test/models/receipt_uploader_test.rb`

| Test | Aserción |
|---|---|
| `test "acepta un pdf"` | `expense.receipt_file = fixture_file_upload("comprobante.pdf", "application/pdf")`; `assert expense.save`; `assert_match(/comprobante\.pdf\z/, expense.receipt_file.path)` |
| `test "acepta un jpg"` | Ídem con `comprobante.jpg`, `image/jpeg`. |
| `test "rechaza extension no permitida"` | Con `malicioso.exe`: `refute expense.save`; `assert_includes expense.errors[:receipt_file].join, "No se permiten archivos exe"` |
| `test "rechaza content type que no coincide con la extension"` | Copiar `malicioso.exe` a un tmp llamado `factura.pdf` y subirlo: `refute expense.save`, error de `content_type_allowlist`. Es el caso que la extensión sola no atrapa. |
| `test "rechaza archivo mayor a 10 MB"` | Generar un `Tempfile` de 10.5 MB con extensión `.pdf` **en el test** (no se commitea un binario de 10 MB): `refute expense.save`; `assert_includes expense.errors[:receipt_file].join, "demasiado grande"` |
| `test "rechaza archivo vacio"` | `Tempfile` de 0 bytes `.pdf`: `refute expense.save` (`size_range` empieza en `1.byte`). |
| `test "store_dir usa el id del gasto"` | `assert_equal "uploads/report_expense/receipt_file/#{expense.id}", ReceiptUploader.new(expense, :receipt_file).store_dir` |
| `test "en entorno test el storage es file"` | `assert_equal CarrierWave::Storage::File, ReceiptUploader.storage` |
| `test "borra el archivo del disco al destruir el gasto"` | Guardar path, `expense.destroy`, `refute File.exist?(path)`. Verifica el `after_destroy` que instala `mount_uploader`. |
| `test "fog_public es false"` | `refute ReceiptUploader.fog_public` — protege §6.5: si alguien lo vuelve público, las facturas quedan en URL adivinable y permanente. |
| `test "reemplazar el comprobante borra el anterior"` | Subir pdf, guardar `old_path`, subir jpg, `save`, `refute File.exist?(old_path)`. |

### `test/models/report_expense_accounting_test.rb`

| Test | Aserción |
|---|---|
| `test "accounting_visible excluye excedido"` | `refute_includes ReportExpense.accounting_visible, report_expenses(:gasto_excedido)` |
| `test "accounting_visible incluye sin_presupuesto y aprobado"` | Los dos `assert_includes`. Es la garantía de §2.3 de que la pantalla no arranca vacía. |
| `test "accounting_pending excluye los ya aprobados"` | Aprobar uno y verificar que sale del scope. |
| `test "accounting_state_label"` | `"Pendiente"` con false, `"Aprobado"` con true. |
| `test "receipt_file_url es nil sin comprobante"` | `assert_nil report_expenses(:one).receipt_file_url` |
| `test "receipt_file_url devuelve la url con comprobante"` | `assert_match(/comprobante\.pdf/, expense.receipt_file_url)` |
| `test "el default de accounting_approved es false"` | `refute ReportExpense.new.accounting_approved` |
| `test "editar el comprobante deja RegisterEdit"` | `as_user` + subir comprobante sobre un gasto existente ⇒ `assert_difference "RegisterEdit.count", 1` y `assert_match "Comprobante", RegisterEdit.last.description` |

### `test/models/report_expense_import_test.rb`

| Test | Aserción |
|---|---|
| `test "archivo legacy de 11 columnas sigue importando"` | Con `gastos_legacy_11col.xlsx`: `assert_difference "ReportExpense.count", 2`; el primer gasto tiene el `invoice_value` de la columna 9 del archivo viejo. **Es el test de no-regresión más importante del paquete.** |
| `test "archivo legacy no escribe currency distinto de COP"` | `assert_equal "COP", ReportExpense.last.currency` |
| `test "detect_layout distingue v1 de v2"` | `assert_equal :v1, ReportExpense.detect_layout(["Centro de costo", ...])` y `:v2` con el encabezado de 18 que empieza en `"ID"`. |
| `test "archivo v2 crea gastos con moneda y trm"` | `currency == "USD"`, `foreign_value == 120.0.to_d`, `exchange_rate == 4120.5.to_d`, `exchange_rate_source == "manual"`, `exchange_rate_date == invoice_date`. |
| `test "archivo v2 respeta el invoice_value del archivo y no lo recalcula"` | Con `foreign_value=120`, `exchange_rate=4120.5` y `Valor del pago (COP)=494460`, `assert_equal 494460.0, expense.invoice_value` — **no** `120*4120.5` recalculado. Invariante #3. |
| `test "archivo v2 con id existente actualiza y no duplica"` | `assert_no_difference "ReportExpense.count"` y el `invoice_name` cambió. |
| `test "archivo v2 ignora estado presupuestal"` | Fila con `Estado presupuestal = "Aprobado"` sobre un gasto que estaba en `sin_presupuesto`: `assert_equal "sin_presupuesto", expense.reload.budget_status`. Es la prueba de que el import no puede fabricar aprobaciones presupuestales. |
| `test "archivo v2 ignora estado operativo"` | Fila con `"Aceptado"`: `refute expense.reload.is_acepted`. |
| `test "archivo v2 no escribe accounting_approved"` | `refute expense.reload.accounting_approved` aunque el archivo traiga columnas extra. |
| `test "moneda invalida cae a COP"` | Fila con `"XYZ"` ⇒ `assert_equal "COP", expense.currency`. |
| `test "fila con centro inexistente va a fail_records"` | `success, fail = ReportExpense.import(...)`; `assert_equal [3], fail` (la fila 3 del archivo). |
| `test "import corre sin User.current en consola"` | **Sin** `as_user`: `assert_nothing_raised { ReportExpense.import(...) }`. Verifica la Capa 1 (`current_actor_id`) del paquete 01. |
| `test "una fila mala no aborta las demas"` | 3 filas, la 2 con centro inexistente ⇒ `success.length == 2`. |

### `test/controllers/report_expenses_receipt_test.rb`

Con `include Devise::Test::IntegrationHelpers` y `sign_in users(:admin)`.

| Test | Aserción |
|---|---|
| `test "POST multipart con pdf adjunta el comprobante"` | `post report_expenses_path, params: { ..., receipt_file: fixture_file_upload("comprobante.pdf", "application/pdf") }`; `json["type"] == "success"`; `json["register"]["receipt_file"]["url"]` presente. |
| `test "POST sin archivo sigue funcionando con JSON"` | `post ..., as: :json` sin `receipt_file` ⇒ `success`. **Retrocompatibilidad**: el endpoint no puede exigir multipart. |
| `test "POST con exe no crea el gasto"` | `assert_no_difference "ReportExpense.count"`; `json["type"] == "error"`; `json["message"].join` contiene `"No se permiten archivos exe"`. |
| `test "PATCH multipart reemplaza el comprobante"` | El `url` cambia y el archivo anterior ya no existe en disco. |
| `test "PATCH no puede setear accounting_approved"` | `patch ..., params: { accounting_approved: true }`; `refute expense.reload.accounting_approved`. |
| `test "PATCH no puede setear accounting_approved_by_id"` | `assert_nil expense.reload.accounting_approved_by_id`. |
| `test "PATCH no puede setear budget_status"` | `assert_equal "sin_presupuesto", expense.reload.budget_status`. |
| `test "DELETE delete_receipt sin permiso responde 403"` | Usuario con rol sin `"Gastos"/"Editar"`; `assert_response :forbidden`; `json["message"].first == "No tiene permiso para realizar esta acción"`. |
| `test "DELETE delete_receipt sobre gasto sin comprobante responde error"` | `json["type"] == "error"`, mensaje `"El gasto no tiene comprobante adjunto"`, HTTP 200. |
| `test "DELETE delete_receipt borra el archivo"` | `assert_nil expense.reload.receipt_file_url`; `refute File.exist?(old_path)`. |
| `test "DELETE delete_receipt deja RegisterEdit"` | `assert_difference "RegisterEdit.count", 1`. |
| `test "GET download_receipt redirige a la url del archivo"` | `assert_response :redirect`. |
| 🔴 `test "GET download_receipt fuerza la descarga"` | **Corrección 7 / §7.8.** La URL del redirect (o la cabecera del `send_file` en el entorno de archivo) lleva `response-content-disposition` / `Content-Disposition` con `attachment` y el nombre original del archivo. Sin esto el test E4.3 del paquete 12 se cuelga 60 s. |
| `test "GET download_receipt de otro usuario sin Ver todos responde 403"` | Gate de acceso al binario. |
| `test "GET download_receipt sin comprobante responde 404"` | `assert_response :not_found`. |
| `test "destruir el gasto borra el comprobante"` | `delete report_expense_path(expense)`; `refute File.exist?(path)`. |

### `test/controllers/accounting_expenses_controller_test.rb`

| Test | Aserción |
|---|---|
| `test "index sin permiso redirige a root"` | `assert_redirected_to root_path`; `flash[:alert]` presente. |
| `test "index con permiso responde 200 y arma estados"` | `assert_response :success`; `assert_equal({approve:, export:, show_all:}.keys.sort, assigns(:estados).keys.sort)`. |
| `test "get_accounting_expenses devuelve data y total"` | `json.keys.sort == ["data","total"]`. |
| `test "get_accounting_expenses nunca devuelve un excedido"` | `refute_includes json["data"].map { \|r\| r["id"] }, report_expenses(:gasto_excedido).id`. **Test central de §2.3.** |
| 🔴 `test "un aprobado empujado a excedido no sale por defecto"` | **Corrección 13** (hueco de la tabla de verdad §2.4). Gasto con `accounting_approved: true` que un recálculo dejó en `budget_status: "excedido"`: sin filtros **no** aparece en `json["data"]`. |
| 🔴 `test "un aprobado empujado a excedido sí sale con el filtro Aprobados por contabilidad"` | Mismo gasto con `params: { accounting_approved: "true" }` ⇒ **sí** aparece. Es la segunda mitad de la corrección 13 y lo que §2.3 promete: *"se recupera con el filtro Aprobados por contabilidad"*. |
| `test "get_accounting_expenses incluye sin_presupuesto"` | El histórico aparece. Sin esto la pantalla vendida al cliente sale vacía. |
| `test "get_accounting_expenses expone los campos nuevos"` | La primera fila tiene las claves `accounting_approved`, `accounting_approved_at`, `receipt_file`, `budget_status`, `currency`. |
| `test "sin Ver todos solo devuelve los gastos propios"` | Todas las filas tienen `user_invoice_id == current_user.id`. |
| `test "q busca por id de registro"` | `get get_accounting_expenses_path, params: { q: expense.id.to_s }` ⇒ la fila aparece. Requisito de §3.4 de la propuesta. |
| `test "q busca por numero de factura"` | Ídem con `invoice_number`. |
| `test "sort no permitido no revienta y ordena por invoice_date"` | `sort: "encrypted_password; DROP TABLE"` ⇒ `assert_response :success` y el orden es por `invoice_date DESC`. Test de inyección en el `Arel.sql`. |
| `test "per_page tope en 100"` | `per_page: 500` ⇒ `json["data"].length <= 100`. |
| `test "get_accounting_expenses sin permiso de modulo responde 403"` | `assert_response :forbidden`. |
| `test "update_accounting_state sin permiso Aprobar responde 403"` | Usuario con `"Ingreso al modulo"` pero sin `"Aprobar"`. |
| `test "update_accounting_state true setea by_id y at"` | `assert_equal users(:admin).id, e.accounting_approved_by_id`; `assert_not_nil e.accounting_approved_at`. |
| `test "update_accounting_state false limpia by_id y at"` | Los dos `assert_nil`. |
| `test "update_accounting_state sobre un excedido responde error"` | `json["type"] == "error"`; mensaje exacto `"No se puede aprobar contablemente un gasto que excede el presupuesto"`; `refute e.reload.accounting_approved`. |
| `test "update_accounting_state deja RegisterEdit del modulo Contabilidad"` | `assert_equal "Contabilidad", RegisterEdit.last.module` (y **no** `"Gatos"`). |
| `test "update_accounting_filter_values sin filtros no aprueba nada"` | `json["type"] == "error"`; `assert_equal 0, ReportExpense.where(accounting_approved: true).count`. **El test que corrige el bug de `report_expenses_controller.rb:155-178`.** |
| `test "update_accounting_filter_values con accounting_approved como unico parametro no cuenta como filtro"` | Error; nada aprobado. Caso borde no obvio. |
| `test "update_accounting_filter_values con filtro aprueba y devuelve el conteo"` | `json["count"] == 2`; `json["success"] == "2 gastos aprobados por contabilidad"`. |
| `test "update_accounting_filter_values nunca aprueba un excedido"` | Con un filtro que lo abarcaría: `refute report_expenses(:gasto_excedido).reload.accounting_approved`. |
| `test "update_accounting_filter_values con mas de 500 responde error"` | Stub de `MAX_BULK` a 1 (o crear 2 gastos y `stub_const` equivalente): `json["type"] == "error"` y nada aprobado. |
| 🔴 `test "ids[] cuenta como filtro y aprueba solo esos gastos"` | **Corrección 5.** `params: { ids: [a.id, b.id] }` sin ningún otro filtro ⇒ **no** devuelve el error de "al menos un filtro"; `json["count"] == 2` y un tercer gasto queda sin aprobar. |
| 🔴 `test "ids[] con un excedido no lo aprueba y el count lo refleja"` | **Test obligatorio de la corrección 5.** `params: { ids: [gasto_ok.id, gasto_excedido.id] }` ⇒ `json["count"] == 1` y `refute report_expenses(:gasto_excedido).reload.accounting_approved`. `filtered_scope` lo excluye vía `accounting_visible` porque esta acción **no** usa `include_approved_exceeded`. |
| 🔴 `test "ids[] con mas de MAX_BULK responde error"` | El tope de 500 aplica también a `ids[]`: mismo mensaje de error y nada aprobado. |
| `test "update_accounting_filter_values escribe un solo RegisterEdit"` | `assert_difference "RegisterEdit.count", 1` aprobando 3 gastos. Regla de §4.7. |
| `test "update_accounting_filter_values sin permiso Aprobar responde 403"` | — |
| `test "download_file sin permiso Exportar responde 403"` | — |
| `test "download_file con permiso responde xlsx"` | `assert_response :success`; `assert_equal "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", response.media_type`. |

### `test/integration/report_expenses_export_test.rb`

Se lee el xlsx generado con `Roo::Excelx.new` sobre un `Tempfile` con `response.body`.

| Test | Aserción |
|---|---|
| `test "el export de gastos tiene 18 encabezados en el orden acordado"` | `assert_equal ["ID","Centro de costo",...,"IVA (COP)"], sheet.row(1)` |
| `test "el export de gastos trae el id en la primera columna"` | `assert_equal expense.id, sheet.row(2)[0]` |
| `test "el export de contabilidad tiene los mismos 18 encabezados"` | `assert_equal` contra el mismo array literal. Garantiza que un archivo exportado desde cualquiera de las dos pantallas es importable. |
| `test "el export de contabilidad no incluye excedidos"` | Con `type = "todos"` (y con `"filtro"` sin `accounting_approved=true`): ninguna fila con el id del `gasto_excedido`. La excepción de la corrección 13 solo aplica al filtro "Aprobados por contabilidad". |
| `test "el export no revienta con user_invoice colgante"` | Gasto con `user_invoice_id` inexistente ⇒ `assert_response :success` y la celda de Responsable vacía. Hoy esto tumba el export. |
| `test "el export traduce budget_status a etiqueta legible"` | Celda 11 == `"Sin presupuesto"`, no `"sin_presupuesto"`. |
| `test "roundtrip export-import no duplica"` | Exportar, reimportar el archivo generado: `assert_no_difference "ReportExpense.count"`. **Cierra el círculo del invariante #7.** |

---

## Pruebas E2E (Playwright)

> **RETIRADAS por auditoría.** Los dos specs de este paquete —`test/e2e/specs/receipt.spec.js`
> ("Adjuntar un comprobante y descargarlo") y `test/e2e/specs/accounting.spec.js` ("Aprobar un
> gasto desde Contabilidad")— **no se escriben aquí**. Dueño único de todos los specs funcionales:
> **paquete 12** (§7.2); además los dos colisionaban en nombre de archivo con los del 12 y los del
> 09. La infraestructura Playwright (`playwright.config.js`, `global-setup`, `auth.setup`,
> `db/seeds/e2e.rb`) es del **paquete 01**. Ver el bloque de correcciones al inicio.

Lo único que este paquete le debe al 12 es un **contrato de servidor**, no un spec:

- `download_receipt` **fuerza la descarga** con `response-content-disposition=attachment` y el
  nombre original del archivo (§7.8, corrección 7), para que `page.waitForEvent("download")` del
  escenario E4.3 no se cuelgue 60 s.
- El endpoint responde un `Content-Type` **visualizable** (`application/pdf`, `image/*`) para que
  el modal de previsualización del **08** (`receipt-preview-modal`,
  `expense-receipt-preview-{id}`) pueda montarse sobre la misma URL (corrección 9).
- `data-testid` canónicos que el backend habilita pero **no emite**: `expense-receipt-link-{id}`
  (paquete 08) y el prefijo `accounting-*` del paquete 09. Quedan **derogados** `acc-id-{id}`,
  `acc-approve-btn-{id}`, `acc-toggle-filters`, `acc-bulk-approve`, `acc-export` y
  `expense-receipt-download-{id}` (§7.6).

⚠️ `allow_forgery_protection = false` en test: un E2E verde **no valida** el manejo de CSRF. Los
gates de permiso y el CSRF de este paquete se prueban en los tests de controller, no en E2E.

---

## Criterios de aceptación

Verificables con sí/no, sin opinión.

**Comprobante**
1. **(precondición, no entregable)** `db/schema.rb` tiene `report_expenses.receipt_file` (string) y
   las tres columnas `accounting_approved*`, más el índice
   `index_report_expenses_on_accounting_approved_and_date`. **Las crea el paquete 02**; aquí se
   verifica antes de arrancar (ver "Dependencias").
2. `app/uploaders/receipt_uploader.rb` existe, declara `extension_allowlist`,
   `content_type_allowlist`, `size_range` y `self.fog_public = false`, y **no** contiene la cadena
   `storage :file` en una línea posterior al condicional.
3. **(corrección 2)** Verificar que el **paquete 03** dejó
   `grep -c "storage :file" app/uploaders/*.rb` en **0**. Es una verificación de la dependencia, no
   trabajo de este paquete: los 4 uploaders viejos y `config/initializers/carrierwave.rb` son
   suyos.
4. `ReportExpense` tiene `mount_uploader :receipt_file, ReceiptUploader`.
5. `POST /report_expenses` con `multipart/form-data` y un PDF devuelve `type: "success"` y
   `register.receipt_file.url` no nulo.
6. `POST /report_expenses` con un `.exe` devuelve `type: "error"`, no crea el gasto, y el mensaje
   está **en español**.
7. `DELETE /delete_receipt/report_expenses/:id` sin `"Gastos"/"Editar"` devuelve **HTTP 403**.
8. Destruir un gasto con comprobante borra el archivo del almacenamiento.
9. **RETIRADO por auditoría.** Dueño único: paquete 08 (formularios de gasto). Ver el bloque de
   correcciones al inicio.
10. **RETIRADO por auditoría.** Dueño único: paquete 09 (`ExpensesTable.jsx`). Ver el bloque de
    correcciones al inicio.

**Contabilidad**
11. `/accounting_expenses` sin el permiso `"Contabilidad"/"Ingreso al modulo"` redirige a root; con
    él responde 200.
12. `GET /get_accounting_expenses` devuelve `{data, total}` y **cero** registros con
    `budget_status = "excedido"` con cualquier combinación de filtros, **con una única excepción
    (corrección 13 / §2.3)**: con el filtro `accounting_approved=true` sí aparecen los gastos que
    una persona ya había aprobado y un recálculo posterior empujó a `excedido`.
13. `GET /get_accounting_expenses?q=<id>` devuelve el gasto de ese id.
14. `PATCH /update_accounting_state/:id/true` sobre un `excedido` devuelve `type: "error"` y el
    gasto sigue en `accounting_approved = false`.
15. Aprobar setea `accounting_approved_by_id` y `accounting_approved_at`; desaprobar los deja en
    `nil`.
16. Cada aprobación individual deja **un** `RegisterEdit` con `module: "Contabilidad"`.
17. `PATCH /update_accounting_filter_values` **sin filtros** devuelve error y
    `ReportExpense.where(accounting_approved: true).count` no cambia.
18. Una aprobación masiva de N gastos deja **un solo** `RegisterEdit`, no N.
19. Los tres endpoints de escritura y el de export devuelven **HTTP 403** (no 200) cuando falta el
    permiso.
20. **RETIRADO por auditoría.** Dueño único: paquete 01 (`lib/tasks/permissions_gastos_ia.rake` y
    su réplica en `create_config.rake`). Ver el bloque de correcciones al inicio.
21. **RETIRADO por auditoría.** Dueño único: paquete 09 (ítem "Contabilidad" en el menú lateral).
    Ver el bloque de correcciones al inicio.

**Excel**
22. `app/views/report_expenses/download_file.xlsx.axlsx` y
    `app/views/accounting_expenses/download_file.xlsx.axlsx` producen **exactamente los mismos 18
    encabezados en el mismo orden**, con `"ID"` primero.
23. Las dos plantillas llaman `sheet.column_widths` con **18** argumentos.
24. Un archivo con el encabezado viejo de 11 columnas se importa con el mismo resultado que antes
    de este paquete (test de no-regresión verde).
25. Un archivo exportado con las 18 columnas se reimporta sin crear duplicados.
26. La importación **no** escribe `budget_status`, `budget_reason`, `is_acepted`,
    `accounting_approved` ni `accounting_approved_by_id`, aunque el archivo traiga esas columnas.
27. La importación no recalcula `invoice_value` a partir de `foreign_value * exchange_rate`.
28. `ReportExpense.import` no contiene ningún `puts`.
29. **RETIRADO por auditoría.** Dueño único: paquete 07 (`direct_columns` de
    `report_expenses_controller.rb`). Ver el bloque de correcciones al inicio.
30. `ReportExpensesListTool::KEYS` incluye `accounting_approved` y `receipt_file_url` en las
    posiciones 27 y 28, y este paquete **no agregó ninguna otra clave** (§7.7).

**Global**
31. `bin/rails test` corre con **0 failures y 0 errors** sobre las fixtures del paquete 01, sin que
    este paquete haya editado ningún `.yml` de `test/fixtures/`.
32. **RETIRADO por auditoría.** Dueño único: paquete 12 (todos los specs E2E funcionales). Ver el
    bloque de correcciones al inicio.
33. El bloque `# == Schema Information` de `app/models/report_expense.rb` refleja las columnas
    nuevas. `bundle exec annotate` lo corre el **paquete 02** junto con sus migraciones; aquí solo
    se verifica. (El de `report_expense_serializer.rb` **ya no es de este paquete**: el archivo es
    del 07.)
34. **(corrección 6)** La constante golden `HTML_EDICION` del paquete 03 quedó actualizada con la
    línea de `receipt_file` **en el mismo PR**, y el test golden del 03 sigue verde.
35. **(corrección 7 / §7.8)** `GET /download_receipt/report_expenses/:id` responde con
    `Content-Disposition: attachment` (o el parámetro `response-content-disposition` en la URL
    firmada) y el nombre original del archivo.
36. **(corrección 5)** `PATCH /update_accounting_filter_values` acepta `ids[]` como filtro válido,
    respeta el tope de 500 también para `ids[]`, y su `count` es el de filas efectivamente
    actualizadas.

37. [ ] **(cierre de la reauditoría)** `ReportExpense.import` sobre `gastos_multimoneda.xlsx` deja
    una fila USD con `foreign_value` y `exchange_rate` poblados, `exchange_rate_source == "manual"`
    y **`cop_manual_override == true` cuando la columna 17 (`Valor del pago`) viene diligenciada**,
    `false` cuando viene vacía. Son las dos reglas que el paquete 05 aportaba en su Tarea 17
    (retirada) y que este paquete absorbió en la tabla de mapeo de C2: los 4 casos de
    `test/models/report_expense_import_currency_test.rb` del 05 pasan en verde con este paquete
    mergeado.
38. [ ] `grep -n "report_expense_serializer" <diff del paquete>` no devuelve nada: el archivo es del
    **07** (§7.2); aquí solo queda el test de contrato sobre el JSON.

---

## Riesgos y trampas

1. **`storage :file` sin credenciales de S3 rompe lo que hoy funciona.** Riesgo **heredado al
   paquete 03**, que es el dueño de los 4 uploaders viejos y del initializer: sin las ENV de AWS,
   corregirlos hace fallar en producción todas las subidas de avatares, certificados, hojas de vida
   y órdenes de compra. La verificación de `heroku config` es la **Tarea 0**, ítem 0.6 (§7.10), y
   bloquea el arranque del 03, no el de este paquete. Aquí solo se comprueba el resultado
   (criterio 3).

2. **`fog_public = false` genera URLs firmadas con 600 s de expiración.** El serializer emite
   `receipt_file.url` en el momento de renderizar la lista; si el usuario deja la pantalla abierta
   11 minutos, todos los enlaces de la tabla devuelven 403 de S3. Por eso la tabla apunta a
   `/download_receipt/report_expenses/:id` (firma fresca en el clic) y **no** a
   `row.receipt_file.url` directamente. **Esto es un contrato hacia los paquetes 08 y 09**, que son
   los que pintan la columna: si alguien "simplifica" copiando el patrón de
   `OrdenesDeCompraTable.jsx:64`, reintroduce el bug. Va escrito aquí porque el que conoce la causa
   es este paquete, no el que escribe la columna.

3. **`fog_public` en el initializer es global.** Ponerlo ahí (en vez de dentro de
   `ReceiptUploader`) volvería privadas también las URLs de avatares y órdenes de compra ya
   emitidas y las rompería todas a la vez.

4. **RETIRADO** (era el riesgo del paso a `FormData` en los dos formularios de gasto). Los dos
   archivos son de los paquetes 08 y 09; el riesgo se traslada con la tarea.

5. **RETIRADO** (era la guarda `form[k] == null ? "" : form[k]` de la tarea A7.4, hoy del 08).

6. **RETIRADO** (era `CmDataTable` congelando `visibleColumns`; las columnas son del 09).

7. **RETIRADO** (era `serverPagination` sin `serverMeta` en el pack de contabilidad, hoy del 09).
   Lo que sí sigue siendo de este paquete es **entregar `total` en la respuesta de
   `get_accounting_expenses`**: sin ese campo el 09 no puede armar `serverMeta`.

8. **El golden `HTML_EDICION` del paquete 03 es frágil por diseño.** `audit_field :receipt_file`
   cambia el HTML del registro de edición; si no se actualiza la constante golden del 03 **en el
   mismo PR** (corrección 6), su test se pone rojo y parece un fallo del 03. No se toca ni el
   encabezado del registro ni el umbral de longitud del concern (§4.7): cambiar cualquiera de los
   dos hace aparecer un `RegisterEdit` fantasma en **cada** creación de gasto.

9. **Los campos de contabilidad NO van en el concern de auditoría.** Si se agregan como
   `audit_field`, el texto de una aprobación queda por debajo del umbral de longitud y no se
   registra nada — pero el implementador creerá que sí. La auditoría contable se escribe
   explícitamente en el controller de este paquete con `module: "Contabilidad"`.

10. **`update_all` no dispara callbacks.** En la aprobación masiva es lo que queremos (un solo
    `RegisterEdit`), pero por eso hay que escribir `last_user_edited_id` y `updated_at` a mano en
    el mismo hash. Olvidarlos deja los registros con la fecha de actualización vieja y sin
    trazabilidad de quién los tocó.

11. **La guarda de "al menos un filtro" es la razón de existir del endpoint masivo.** Si el
    implementador acepta `accounting_approved` como filtro válido, `accounting_approved=false`
    aprueba la tabla entera de un clic — exactamente el bug de
    `report_expenses_controller.rb:155-178` que este paquete está para no repetir.

12. **`ReportExpense.search` no se toca ni se llama desde el controller de contabilidad.** Define
    scopes de clase en runtime (estado global compartido) y con 5 hilos de Puma dos búsquedas
    concurrentes se pisan los filtros. Reutilizarlo "para no duplicar" reintroduce una condición
    de carrera en la pantalla más sensible del proyecto.

13. **El import y el export ya están desalineados hoy** (ver Discrepancia D2). Un implementador que
    asuma que "el export es el formato de import" y solo corra las posiciones va a romper los
    archivos legacy de los usuarios. La detección de layout es obligatoria; no es paranoia.

14. **Habilitar la actualización por `id` en el import es destructivo por diseño.** Un usuario que
    exporte, edite mal y reimporte sobrescribe gastos existentes. Va documentado en el manual y el
    Excel de export debe llevar la columna ID con ancho 10 y visible, no oculta.

15. **`task.user_invoice.names` sin guarda tumba el export completo.** Una sola FK colgante
    (`db/schema.rb` **no tiene ni un `add_foreign_key`**) convierte el export en un 500. Las dos
    plantillas llevan `present?`.

16. **`fixtures :all` + un YAML mal escrito tumba TODA la suite,** no solo el test que lo usa. Las
    fixtures son del **paquete 01** (§7.2): este paquete **no las edita**. Si un test de aquí
    necesita una etiqueta que no existe, se pide al 01 — agregarla "rápido" en este PR es
    exactamente la colisión que la auditoría vino a cerrar. Y hay que correr `bin/rails test`
    completo, no solo los archivos propios.

17. **Los tests de tamaño y de content-type necesitan archivos reales.** El archivo de 10,5 MB
    **no se commitea**: se genera con `Tempfile` dentro del test (§7.12 lo recoge como decisión de
    este paquete). El de content-type engañoso usa `disfrazado.png` del inventario del 01, o se
    construye en el test copiando `malicioso.exe` a un nombre `.pdf`; en ningún caso se agrega un
    binario nuevo a `test/fixtures/files/`.

18. **`RAILS_ENV=test bin/rails db:test:prepare` después de las migraciones del paquete 02.** Sin
    eso `maintain_test_schema!` aborta la suite entera con `exit 1` y el error no menciona la
    migración que falta. Es lo primero que hay que descartar si los tests de aquí no arrancan.

19. **`enable_processing = false` en test es obligatorio.** Lo configura el **paquete 03** en
    `config/initializers/carrierwave.rb`. Sin él, cada fixture con avatar invoca ImageMagick cinco
    veces (las 5 `version` de `AvatarUploader`) y la suite se vuelve inusable: si los tests de este
    paquete van lentísimos, el problema está allá.

20. **Conflicto de merge garantizado en 5 archivos.** `report_expense.rb`,
    `application_helper.rb`, `report_expenses_controller.rb`, `config/routes.rb` y
    `report_expenses_list_tool.rb` los tocan además los paquetes 03, 04, 05, 07, 09, 10 y 11. Este
    paquete agrega **solo sus propios campos/métodos** en cada uno y resuelve conflictos sumando,
    nunca reemplazando bloques ajenos. Orden de merge de la ola 3: `04 → 05 → 06 → 10`.
    (`report_expense_serializer.rb` **salió** de esta lista: dueño único 07.)

21. **`redirect_to ..., allow_other_host: true` no existe en Rails 6.1.** El argumento se agregó en
    Rails 7. En `download_receipt` va `redirect_to url` a secas, sobre la URL firmada que ya lleva
    `response-content-disposition` (corrección 7).

22. **Quitar el `response-content-disposition` "porque funciona igual" cuelga el E2E del 12
    durante 60 s.** Es el contrato §7.8 y no es negociable desde este paquete: `redirect_to
    receipt_file.url` a secas **navega** en Chromium en vez de descargar, y `waitForEvent
    ("download")` nunca resuelve.

---

## Discrepancias con la arquitectura

**D1 — La importación NO puede mapear las 18 posiciones a 18 campos.**
`00-ARQUITECTURA.md` §F.3 dice: *"hay que extender el mapeo posicional de `ReportExpense.import`
(`report_expense.rb:84-94`, índices 0..10 → 0..17)"*. Se extiende a 18 posiciones, pero **cinco de
ellas son de solo lectura**: `ID` (es llave, no atributo), `Estado operativo` (`is_acepted`),
`Estado presupuestal` (`budget_status`) y `Motivo presupuestal` (`budget_reason`). Escribirlas
violaría el §2.1 —*"`budget_status`… lo escribe únicamente el servicio de consumo. No existe
ninguna acción de UI ni ningún endpoint que lo cambie a mano"*— y permitiría fabricar aprobaciones
presupuestales desde un Excel. El mapeo tiene 18 posiciones y **13 campos escribibles**. No es un
desvío del diseño, es la única lectura de §F.3 compatible con §2.1.

**D2 — El export y el import ya están desalineados HOY; el desalineamiento no lo introduce este
paquete.**
§F.3 advierte que sin tocar el import *"la importación queda desalineada en silencio"*. Verificado
en el código: el export actual (`download_file.xlsx.axlsx:5`) tiene 12 columnas con `"Estado"` en
la posición 9, mientras que el import (`report_expense.rb:84-94`) espera `invoice_value` en la
posición 9. **El archivo que hoy exporta la aplicación ya no se puede reimportar.** Por eso la
solución no es "un mapeo posicional actualizado" sino **detección de layout** (`detect_layout`):
solo así los archivos legacy de 11 columnas que los usuarios tienen guardados siguen funcionando y
los archivos nuevos de 18 también. Asumido: se soportan dos layouts, no uno.

**D3 — Se agrega un endpoint de descarga del comprobante, que §B.2 decía que no hacía falta.**
§B.2 dice: *"Descarga: no hay endpoint. Se usa la URL de CarrierWave que el serializer expone como
`receipt_file.url`, igual que `order_file`"*. Eso es incompatible con la recomendación de §6.5 de
poner `self.fog_public = false`: con `fog_public = false`, `receipt_file.url` es una URL firmada
que expira a los 600 s y se genera **en el momento de serializar la lista**, no en el del clic. La
propia §6.5 lo anticipa (*"hay que verificar que el frontend la pida en el momento de hacer clic y
no la cachee"*) pero no propone cómo. Se agrega
`GET /download_receipt/report_expenses/:id` que verifica permiso y hace `redirect_to` a una URL
recién firmada. Ventajas: enlaces que nunca vencen desde el punto de vista del usuario, y un gate
de permiso real sobre el binario (con la URL directa, cualquiera con el enlace lo abre). Rails no
sirve el archivo: sigue siendo un redirect a S3. Si se decide revertir a `fog_public = true`, este
endpoint puede eliminarse sin tocar nada más.
**Resuelta por la auditoría a favor de este documento** (§7.8): el endpoint existe, es de este
paquete, y además **fuerza la descarga** con `response-content-disposition=attachment` (corrección
7). La §B.2 de la arquitectura queda derogada en ese punto, igual que la Tarea 21 y la ruta
`DELETE` que el paquete 07 borró.

**D4 — El campo `Total (COP)` no está en las 18 columnas y eso es correcto, no un olvido.**
El export actual de 12 columnas tampoco lo tiene (`Valor del pago` + `IVA`, sin total), y el import
lo calcula (`invoice_total = invoice_value + invoice_tax`). Se deja igual para no introducir una
columna que el import tendría que ignorar. Se anota por si un revisor cuenta columnas contra la
propuesta comercial.

**D5 — RESUELTA por la auditoría: el pack `AccountingExpenseIndex.js` NO es de este paquete.**
Este documento asumía que sí, porque la arquitectura lo listaba en §4.1 (*"Pack React →
`AccountingExpenseIndex.js`"*) sin asignarlo. **La resolución §7.2 se lo da al paquete 09**, que es
el que tiene la selección múltiple y el trabajo sobre `CmDataTable`; es la salida que esta misma
discrepancia contemplaba (*"si otro paquete reclama el pack, este entrega igual el backend completo
y los tests de controller"*). Consecuencias ya aplicadas en el cuerpo: **B10 y la vista
`index.html.erb` retiradas**, prefijo de `data-testid` canónico `accounting-*` y derogados los
`acc-*`. Este paquete entrega el backend (B2–B9) y sus tests de controller.

**D6 — `AccountingExpensesController` no usa `ReportExpense.search` y por eso NO depende del
refactor del invariante #6.**
§4.6 dice que ningún paquete agrega filtros a `search` antes del refactor. Este paquete no le
agrega ni uno: compone su propio scope en `filtered_scope`, que es exactamente lo que el refactor
va a hacer en el modelo. Consecuencia deliberada: el backend de contabilidad se puede desplegar
**antes** que el refactor. La única pieza que sí quedaba bloqueada era el filtro por ID en la
pantalla de Gastos (§F.1), que la auditoría trasladó al paquete 07 junto con el resto de
`report_expenses_controller.rb` (tarea C3 retirada).
⚠️ Ojo: el paquete 03 **sí** es dependencia dura de este documento, pero por el concern
`RegisterAuditable` (corrección 6) y por los uploaders/initializer, no por el refactor de `search`.

---

## Objeciones a la auditoría

Ninguna corrección se revocó. De las cuatro cosas que quedaron abiertas, **la reauditoría cerró
tres**; la cuarta se deja como está, con la implementación mínima ya escrita.

1. ✅ **§7.2 vs §7.7 sobre la tarea C4. CERRADO a favor de §7.7: C4 se ejecuta.** La fila de
   `app/tools/*` de §7.2 quedó reescrita —*"dueño 11; única excepción, la de §7.7: el 05 agrega las
   claves 20–26 y el 06 las 27–28 de `ReportExpensesListTool::KEYS`, nada más"*— y **la frase "06
   borra su C4" fue eliminada**. C4 se conserva acotada a las claves 27 (`accounting_approved`) y
   28 (`receipt_file_url`), `app/tools/report_expenses_list_tool.rb` sigue en "A modificar" y el
   criterio 30 sigue vivo. Si se hubiera ejecutado la versión anterior de §7.2, `KEYS.size == 28`
   —criterio compartido por 05, 06 y 11— habría sido inalcanzable. El ⚠️ que marcaba el conflicto
   dentro de C4 se borró: ya no tiene objeto.

2. ✅ **§7.12 ya incluye los dos Excel de fixture. CERRADO.** `gastos_legacy_11col.xlsx`
   (encabezado viejo de 11 columnas) y `gastos_v2_18col.xlsx` (encabezado nuevo de 18) están en el
   inventario canónico con dueño **01**, junto con `gastos_multimoneda.xlsx` del 05. Este paquete
   los **consume**; sigue sin crear nada en `test/fixtures/files/`. Con eso,
   `test/models/report_expense_import_test.rb` —incluido el test de no-regresión de archivos
   legacy— ya se puede escribir.

3. ✅ **Los strong params `:receipt_file` / `:remove_receipt_file` ya tienen dueño. CERRADO: los
   agrega el 07.** La fila de `report_expenses_controller.rb` en §7.2 lo dice ahora de forma
   explícita (*"el 07 sí agrega `:receipt_file` y `:remove_receipt_file` a los strong params de
   `create`/`update`"*) y la Tarea 19 del paquete 07 los lleva en su lista de `permit`. Sin eso,
   `POST /report_expenses` multipart no guardaba el comprobante y los criterios 5 y 6 de este
   paquete eran inalcanzables. La tarea A5 sigue sin escribirlos.

4. **La corrección 13 obliga a una excepción en `filtered_scope` que la auditoría no describió.**
   El test exigido (*"`get_accounting_expenses` no devuelve por defecto un gasto aprobado que un
   recálculo empujó a `excedido`, **pero sí** lo devuelve con el filtro «Aprobados por
   contabilidad»"*) es imposible con el `accounting_visible` que la B2 declara como *"la única
   definición de la base de la vista"*: ese scope excluye `excedido` siempre. Se implementó la
   excepción **mínima** que satisface §2.3 y la corrección 13 sin abrir la puerta a aprobar
   excedidos: el parámetro `include_approved_exceeded:` de `filtered_scope`, activo **solo** en las
   dos lecturas (`get_accounting_expenses` y `download_file`) y **nunca** en la aprobación masiva.
   El criterio 12 se ajustó en consecuencia. Si la auditoría prefiere otra forma (una vista
   separada, un scope `accounting_recoverable`), hay que decirlo aquí antes de implementar.
