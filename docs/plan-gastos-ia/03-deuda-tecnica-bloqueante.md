# Paquete 03 — Deuda tecnica bloqueante: uploaders a S3, refactor de search, concern de auditoria

## 🔴 CORRECCIONES DE AUDITORÍA (vinculantes — leer ANTES que el resto del documento)

> Estas correcciones **mandan sobre cualquier texto de este archivo** que las contradiga.
> Consolidadas en `00-ARQUITECTURA.md` §7.

1. **Este paquete es el dueño ÚNICO de `config/initializers/carrierwave.rb` y de los 4 uploaders
   existentes** (`avatar`, `certificate`, `information`, `order`). Confirmado (era tu Discrepancia
   2) y elevado a regla de la arquitectura (§4.8, §7.2). Consecuencias ya aplicadas en los otros
   documentos: el **01 borró su Tarea 15**, el **06 borró su tarea A3** y su criterio 3 pasó a
   "verificar que el 03 lo dejó así", y el **12** solo consume la ENV.
2. **Valor único y definitivo de `config.root` en test** (había cuatro versiones incompatibles):
   ```ruby
   config.root = ENV.fetch("E2E_UPLOAD_ROOT") { Rails.root.join("tmp", "uploads_test") }
   ```
   El test `test_carrierwave_escribe_en_tmp_en_test` afirma `Rails.root.join("tmp","uploads_test")`
   **cuando la ENV está ausente**. El bloque `E2E_UPLOAD_ROOT` lo escribe **este paquete**, no el
   12; el 12 solo lo activa en su corrida (`E2E_UPLOAD_ROOT=public`) para que `/uploads/...` sea
   servible y la descarga del escenario 4 funcione.
3. **La precondición A0 deja de ser una bifurcación en tiempo de ejecución.** `AWS_ACCESS_KEY`,
   `AWS_SECRET_KEY`, `AWS_BUCKET` y la región real del bucket se verifican en la **Tarea 0**
   (§7.10, ítem 0.6) y el resultado queda **escrito** antes de arrancar. Este paquete lee ese
   resultado; ya no decide "parar o seguir" a mitad de camino. Si la Tarea 0 dejó escrito que las
   variables no están, el **Bloque A no se planifica** en esta ola.
4. **Este paquete es dependencia DURA de los paquetes 04 y 06** (antes no estaba declarado en
   ninguno de los tres). El Bloque C borra `create_edit_register`, `create_create_register` y
   `create_destroy_register` de `ReportExpense`, que son exactamente los métodos que el 04 (Tarea
   12.4) y el 06 (A4) instruían modificar. Si el 03 va después, las instrucciones de 04 y 06
   apuntan a código inexistente; si va antes sin coordinación, los 14 golden fallan.
   **Contrato con 04 y 06**: cada uno agrega su campo con
   ```ruby
   audit_field :budget_status, label: "..."   # paquete 04
   audit_field :receipt_file,  label: "..."   # paquete 06
   ```
   más su entrada en `edit_fields` de `audit_register`, **y actualiza la constante golden
   `HTML_EDICION` de este paquete agregando el segmento al final, en el mismo PR**. Los 14 tests
   golden **no se relajan ni se borran**: se extienden.
5. **Seam de red canónico** (§6.7 / §7.2): este paquete no lo produce, pero la regla lo afecta —
   ningún servicio de este proyecto expone dos mecanismos de doble de prueba. Los nombres fijados
   son `ExchangeRateService.fetch_remote` (paquete 05) y
   `ReceiptExtractionService.call_vision_model` (paquete 10).
6. **`test/fixtures/files/`**: los cuatro archivos que este paquete pedía (`sample.png`,
   `sample.pdf`, `sample.exe`, `disfrazado.png`) **los crea el paquete 01** con el inventario
   consolidado de §7.12. Aquí se usan los nombres canónicos: `comprobante.png`, `comprobante.pdf`,
   `malicioso.exe`, `disfrazado.png`. Este paquete solo declara "ya existen".
7. **`test/support/` se autocarga** (`test_helper.rb` es del paquete 01). Este paquete no lo
   modifica ni usa `require_relative`.
8. **Los 6 call sites del refactor de `search` se citan por método**, no por línea:
   `get_report_expenses`, `get_cost_center_report_expenses`, `update_filter_values` (2 usos),
   `download_file` (2 usos) en `ReportExpensesController`. Las líneas 41/84/160/162/228/234 son
   orientativas y pueden haberse desplazado.
9. **El único E2E de este paquete se borra**: todos los specs funcionales son del paquete 12
   (§7.2). Este paquete conserva sus 73 tests de Minitest, que son su verdadera red.

> Documento base obligatorio: `docs/plan-gastos-ia/00-ARQUITECTURA.md`. Este paquete no construye
> funcionalidad de negocio: retira las tres minas que los paquetes de Comprobante, Contabilidad,
> Multimoneda y Presupuesto van a pisar. Se compone de tres bloques independientes entre sí
> (**A** uploaders, **B** search, **C** auditoría) que pueden ejecutarse en paralelo y mergearse
> por separado.

---

## Objetivo

Dejar el almacenamiento de archivos apuntando de verdad a S3 en producción (hoy los 4 uploaders
terminan en `storage :file` sobre un filesystem efímero), reemplazar `ReportExpense.search` —que
define 15 scopes de clase en runtime y por eso filtra mal bajo concurrencia— por un builder con
firma de hash y red de pruebas que congele su comportamiento, y extraer los ~200 renglones de HTML
de auditoría escritos a mano de `ReportExpense` a un concern configurable, con el formato de
`RegisterEdit.description` preservado byte a byte.

---

## Dependencias

| Depende de | Por qué |
|---|---|
| **Paquete 01 — desbloqueo de la suite** (§5.1 de arquitectura: quitar `chromedriver-helper`, arreglar las 4 fixtures rotas, borrar los 29 tests de scaffold, `include Devise::Test::*`, helper `as_user`, fixtures `users.yml` / `cost_centers.yml` / `module_controls.yml` / `report_expense_options.yml` sanas, la guarda `current_actor_id` de §5.3 Capa 1, el inventario completo de `test/fixtures/files/` de §7.12 y el autoload de `test/support/**` desde `test_helper.rb`) | **Bloqueante total.** Este paquete es casi todo pruebas. Sin la suite arrancando y sin `as_user`, ningún test de aquí se puede escribir ni correr. Además `report_expenses.yml` tiene hoy FKs colgantes (`user_id: 1`, `cost_center_id: 1`, `user_invoice_id: 1` inexistentes) que revientan dentro de `create_create_register`: los tests del bloque C dependen de que esa fixture ya esté arreglada. |
| **Tarea 0 — decisiones del cliente** (§7.10, ítem 0.6: AWS_* y región real del bucket) | **Solo el Bloque A.** Es una precondición **escrita**, no una bifurcación en tiempo de ejecución: si la Tarea 0 dejó escrito que las variables no están, el Bloque A **no se planifica en esta ola**. Los bloques B y C no la necesitan. |
| Nada más | Los bloques A, B y C no dependen de ningún otro paquete funcional. |

**Quién depende de este paquete** (declarado para que nadie lo adelante). Este paquete es
**dependencia DURA** de los paquetes **04**, **05** y **06** (§7.1, §7.3 ola 2 → ola 3):

- **Paquete 06 — Comprobante y contabilidad**: no puede crear `ReceiptUploader` (§4.8) antes de que
  el bloque A deje el patrón de `storage` corregido y el initializer en su forma final. Además, el
  bloque C borra `create_edit_register` / `create_create_register` / `create_destroy_register`, que
  son exactamente los métodos que su tarea A4 instruía modificar.
- **Paquete 04 — Presupuesto**: su tarea 12.4 modificaba esos mismos tres métodos. Con el bloque C
  mergeado, agrega su campo con `audit_field :budget_status, label: "..."` más su entrada en
  `edit_fields` de `audit_register`, **y actualiza la constante golden `HTML_EDICION` de este
  paquete agregando el segmento al final, en el mismo PR**. Los 14 golden no se relajan ni se
  borran: se extienden. Lo mismo aplica al 06 con `audit_field :receipt_file`.
- **Paquetes 05 y 06**: invariante #6 — no pueden agregar filtros a `ReportExpense.search` antes
  del bloque B.
- Todo paquete que agregue columnas visibles a `report_expenses` (presupuestales, multimoneda,
  contables): el bloque C es lo que les evita escribir cada campo tres veces.

**Este paquete NO hace** (alcance de otros): crear `ReceiptUploader`, montar `receipt_file`,
crear archivos en `test/fixtures/files/` (paquete 01, §7.12), tocar `test_helper.rb` o
`test/support/**` (paquete 01), escribir specs de Playwright (paquete 12),
agregar filtros nuevos a `search`, auditar campos que todavía no existen como columnas, tocar
`ExpenseRatio.search` / `CostCenter` / `Material` / `SalesOrder` (misma patología, fuera de
alcance), corregir el typo `"Gatos"` (§6.9), montar CI (§5.5).

---

## Archivos

### Bloque A — Uploaders

| Acción | Ruta | Qué se hace |
|---|---|---|
| MODIFICAR | `app/uploaders/avatar_uploader.rb` | Borrar la línea 8 `storage :file` que sobrescribe el condicional de la línea 6; agregar `extension_allowlist`, `content_type_allowlist`, `size_range`. |
| MODIFICAR | `app/uploaders/certificate_uploader.rb` | Borrar la línea 9 `storage :file`; agregar las tres allowlists. |
| MODIFICAR | `app/uploaders/information_uploader.rb` | Idéntico a `certificate_uploader.rb` (los dos archivos son byte a byte iguales salvo el nombre de clase). |
| MODIFICAR | `app/uploaders/order_uploader.rb` | **No tiene** condicional: reemplazar `storage :file` (línea 7) por la forma condicional; agregar las tres allowlists. |
| MODIFICAR | `config/initializers/carrierwave.rb` | Agregar `fog_region` desde ENV con default `us-east-1`, y el bloque `if Rails.env.test?` con `enable_processing = false`, `storage = :file` y `root = ENV.fetch("E2E_UPLOAD_ROOT") { Rails.root.join("tmp", "uploads_test") }`. Dueño único: este paquete (§7.2). |
| CREAR | `lib/tasks/storage_check.rake` | Tarea `rake storage:check` que verifica ENV, región real del bucket y hace un round-trip de subida/lectura/borrado. |
| CREAR | `test/uploaders/uploaders_storage_test.rb` | Tests de configuración de `storage` (runtime + estáticos sobre el código fuente). |
| CREAR | `test/uploaders/uploaders_allowlist_test.rb` | Tests de extensión / content-type / tamaño / compatibilidad con archivos legados. |

> **`test/fixtures/files/` no es de este paquete.** Los archivos `comprobante.png`,
> `comprobante.pdf`, `malicioso.exe` y `disfrazado.png` los crea el **paquete 01** con el inventario
> consolidado de §7.12. Aquí solo se consumen; ninguna fila de esta tabla los crea.

### Bloque B — `ReportExpense.search`

| Acción | Ruta | Qué se hace |
|---|---|---|
| MODIFICAR | `app/models/report_expense.rb` | Reemplazar `self.search` (líneas 56-75) por el builder con firma de hash; agregar `SEARCH_KEYS`. |
| MODIFICAR | `app/controllers/report_expenses_controller.rb` | **Solo los 6 call sites de `search`** (§7.2: el resto del controller es del paquete 07), citados por método: `get_report_expenses`, `get_cost_center_report_expenses`, `update_filter_values` (2 usos) y `download_file` (2 usos); agregar el helper privado `report_expense_search_filters` y borrar los dos bloques `has_filters` de los dos primeros métodos. |
| CREAR | `test/models/report_expense_search_test.rb` | Red de seguridad de los 15 filtros + encadenamiento + no-fuga de scopes + concurrencia. |

### Bloque C — Concern de auditoría

| Acción | Ruta | Qué se hace |
|---|---|---|
| CREAR | `app/models/concerns/register_auditable.rb` | Concern genérico: DSL `audit_field` / `audit_register`, renderizado de segmentos, escritura de `RegisterEdit`. Es el primer archivo de `app/models/concerns/` (el directorio existe vacío). |
| MODIFICAR | `app/models/report_expense.rb` | Borrar `create_edit_register` (148-222), `create_create_register` (226-285) y `create_destroy_register` (288-347); dejar `include RegisterAuditable` + 13 `audit_field` + un `audit_register`. |
| CREAR | `test/models/report_expense_audit_legacy_test.rb` | Tests golden: HTML byte a byte de creación / edición / borrado. **Se escriben antes del refactor y no se tocan después.** |
| CREAR | `test/models/report_expense_audit_concern_test.rb` | Tests del concern: rarezas del renderizado, actor, umbrales, FK colgante. |

---

## Tareas

Orden obligatorio **dentro** de cada bloque. Entre bloques no hay orden. Cada tarea es un commit.

### Bloque A — Uploaders a S3

**A0 no es código: es la lectura de una precondición ya resuelta. No es una bifurcación en tiempo
de ejecución.**

**A0. Leer el resultado escrito por la Tarea 0 (§7.10, ítem 0.6).**
La existencia de `AWS_ACCESS_KEY`, `AWS_SECRET_KEY`, `AWS_BUCKET` y la **región real del bucket**
se verifican en la **Tarea 0**, cuyo dueño es comercial / PM, y el resultado queda **escrito** antes
de que este paquete arranque. Este paquete solo lo consume:

- Si la Tarea 0 dejó escrito que alguna de las tres variables **no está** o que las credenciales no
  ven el bucket → **el Bloque A no se planifica en esta ola** (§7.10 ítem 0.6: "si falta, el Bloque
  A del 03 no arranca"). No se empieza A1 para descubrirlo a mitad de camino.
- Si la Tarea 0 dejó escrita una región distinta de `us-east-1` → ese valor es el que va en
  `AWS_REGION` (tarea A2).
- Copiar en el PR la referencia al acta de la Tarea 0 (documento y fecha), no re-ejecutar la
  verificación.

`config/initializers/carrierwave.rb` usa exactamente los nombres `AWS_ACCESS_KEY`,
`AWS_SECRET_KEY`, `AWS_BUCKET`, **no** los canónicos de AWS (`AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY`): no renombrarlos.

**A1. Corregir la declaración de `storage` en los 4 uploaders.** Un solo commit, cuatro archivos.
Estado final de la declaración, idéntico en los cuatro:

```ruby
storage(Rails.env.production? ? :fog : :file)
```

- `avatar_uploader.rb`: borrar la línea 8 (`storage :file`) y la 9 (`# storage :fog`). La línea 6
  ya tiene la forma correcta; normalizarla a la de arriba (sin espacio antes del paréntesis).
- `certificate_uploader.rb` e `information_uploader.rb`: borrar las líneas 8-10 (el comentario
  duplicado, `storage :file` y `# storage :fog`).
- `order_uploader.rb`: reemplazar la línea 7 `storage :file` por la forma condicional.
- **Después del commit, no puede quedar en `app/uploaders/` ninguna línea que haga `storage :file`
  ni `storage :fog` sin condicional.** Es lo que verifica el test estático de A6.
- No tocar `include CarrierWave::MiniMagick` ni las 5 `version` de `AvatarUploader`: cambiarlas es
  otro problema (y otro riesgo).

**A2. `fog_region` y configuración de test en el initializer.**
`config/initializers/carrierwave.rb` queda:

```ruby
CarrierWave.configure do |config|
  config.fog_credentials = {
    :provider              => "AWS",
    :aws_access_key_id     => ENV["AWS_ACCESS_KEY"],
    :aws_secret_access_key => ENV["AWS_SECRET_KEY"],
    :region                => ENV.fetch("AWS_REGION", "us-east-1")
  }
  config.fog_directory = ENV["AWS_BUCKET"]

  if Rails.env.test?
    config.enable_processing = false
    config.storage           = :file
    config.root              = ENV.fetch("E2E_UPLOAD_ROOT") { Rails.root.join("tmp", "uploads_test") }
  end
end
```

- `enable_processing = false` en test evita que cada fixture/registro con avatar dispare
  MiniMagick 5 veces (§4.8). `tmp/` ya está gitignoreado.
- **`config.root` tiene un único valor válido** (§4.8, corrección 2 del bloque de auditoría): por
  defecto `Rails.root.join("tmp", "uploads_test")`, sobrescribible por `ENV["E2E_UPLOAD_ROOT"]`.
  El bloque lo escribe **este paquete**; el paquete 12 solo lo activa en su corrida
  (`E2E_UPLOAD_ROOT=public`) para que `/uploads/...` sea servible. El test
  `test_carrierwave_escribe_en_tmp_en_test` afirma la ruta de `tmp/uploads_test` **cuando la ENV
  está ausente**.
- `AWS_REGION` se setea en Heroku (`heroku config:set AWS_REGION=<valor escrito por la Tarea 0>`)
  **solo si** la Tarea 0 (§7.10, ítem 0.6) dejó escrita una región distinta de `us-east-1`. El
  default mantiene el comportamiento actual.
- **No** tocar `fog_public` aquí: es global y rompería las URLs ya emitidas de avatares y órdenes
  de compra. La decisión de URL firmada es local a `ReceiptUploader` y pertenece al paquete de
  Comprobante (§6.5).

**A3. Allowlists de extensión, content-type y tamaño.**
CarrierWave instalado es **3.1.2** (`Gemfile.lock:141`): los métodos `extension_whitelist` /
`content_type_whitelist` **ya no existen** en esa versión. La API correcta es
`extension_allowlist` / `content_type_allowlist` / `size_range`. (El comentario `# def
extension_whitelist` que traen los 4 archivos por scaffold se borra en esta tarea.)

`avatar_uploader.rb`:

```ruby
def extension_allowlist
  %w[jpg jpeg png gif webp]
end

def content_type_allowlist
  ["image/jpeg", "image/png", "image/gif", "image/webp"]
end

def size_range
  1.byte..5.megabytes
end
```

`certificate_uploader.rb`, `information_uploader.rb`, `order_uploader.rb` (los tres iguales):

```ruby
def extension_allowlist
  %w[pdf jpg jpeg png gif webp doc docx xls xlsx]
end

def content_type_allowlist
  ["application/pdf",
   "image/jpeg", "image/png", "image/gif", "image/webp",
   "application/msword",
   "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
   "application/vnd.ms-excel",
   "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]
end

def size_range
  1.byte..10.megabytes
end
```

**Asumido:** las listas de los tres uploaders de documentos son deliberadamente permisivas
(incluyen Office) porque son certificados de entrega, informes de recepción y órdenes de compra
que el cliente hoy sube sin restricción alguna; una lista corta convertiría este paquete en una
interrupción de servicio. Si el cliente pide restringir a PDF, es un cambio de una línea después.

**A4. Tarea rake de verificación `rake storage:check`.**
`lib/tasks/storage_check.rake`, namespace `storage`, tarea `check`, sin argumentos. Debe:

1. Imprimir para cada una de `AWS_ACCESS_KEY`, `AWS_SECRET_KEY`, `AWS_BUCKET`, `AWS_REGION`:
   `PRESENTE (n chars)` o `AUSENTE`. **Nunca imprimir el valor.**
2. Imprimir `AvatarUploader.storage`, `CertificateUploader.storage`, `InformationUploader.storage`,
   `OrderUploader.storage` (deben decir `CarrierWave::Storage::Fog` en producción).
3. Si `Rails.env.production?`: conectar con `Fog::Storage`, imprimir `location` del bucket, subir
   `storage_check/<timestamp>.txt` con el contenido `"ok"`, releerlo, borrarlo, e imprimir
   `ROUND TRIP OK` o el `e.class`/`e.message` del fallo.
4. Terminar con `exit 1` si algo falló, para poder encadenarla en un release script.

**A5. Fixtures de archivo.**
> **RETIRADA por auditoría.** Dueño único: paquete 01. Ver el bloque de correcciones al inicio.

**A6. Tests del bloque A** (detallados abajo). Se escriben después de A1-A3 porque congelan la
configuración final, no la anterior.

**A7. Protocolo de verificación en Heroku (documentar en el PR, ejecutar en staging primero).**
Pasos exactos, en orden:

1. Desplegar el bloque A a staging (o a producción en ventana baja).
2. `heroku run -a <app> rake storage:check` → debe imprimir las 4 ENV presentes, los 4 uploaders
   en `CarrierWave::Storage::Fog` y `ROUND TRIP OK`.
3. Desde la UI, en un centro de costos, subir una orden de compra con archivo
   (pestaña Órdenes de compra → botón de crear → campo de archivo → guardar).
4. `heroku run -a <app> rails runner 'o = SalesOrder.where.not(order_file: nil).order(:id).last;
   puts o.id; puts o.order_file.url'` → la URL debe empezar por
   `https://<bucket>.s3.` **y no** por `/uploads/`.
5. `heroku run -a <app> bash -c 'ls -la public/uploads 2>/dev/null || echo "sin public/uploads"'`
   → no debe existir el archivo recién subido en el filesystem del dyno.
6. `heroku restart -a <app>`; esperar a que el dyno levante.
7. Recargar la pantalla y hacer clic en el archivo de la orden creada en el paso 3 → debe
   descargar (HTTP 200). **Éste es el criterio: el archivo sobrevivió al restart.**
8. Repetir 3-7 una vez más con una factura de cliente (`delivery_certificate_file`) para cubrir
   `CertificateUploader`.

**Los archivos históricos NO son recuperables.** Todo lo que se subió antes de este cambio se
guardó con `storage :file` en el filesystem del dyno, que Heroku recicla al menos una vez al día,
y `.slugignore` excluye `public/uploads/` del slug: no hay copia en el repo, no hay copia en S3,
no hay backup. Consecuencias que hay que comunicar antes de desplegar:

- Los avatares, certificados, informes y órdenes de compra subidos con anterioridad **ya están
  perdidos**; este cambio no los pierde, solo hace visible que se perdieron.
- Después del cambio, esas filas conservan el nombre de archivo en la columna, así que
  CarrierWave construirá una URL de S3 hacia un objeto que no existe: el fallo pasa de "404 del
  servidor de assets" a "404/AccessDenied de S3". Es el mismo archivo perdido con otro mensaje.
- **No prometer migración de históricos** (§6.5). Si el cliente pregunta, la única opción es
  volver a subirlos a mano.
- Recomendado en el mismo release: un `UPDATE` que limpie las columnas de archivo de las filas
  cuyo objeto no exista en S3 — **fuera de alcance de este paquete**, se anota como hallazgo.

---

### Bloque B — Refactor de `ReportExpense.search`

**B1. Red de seguridad ANTES de tocar el modelo.** Crear
`test/models/report_expense_search_test.rb` con los casos de la sección de pruebas, llamando a
`search` a través de un helper local del propio archivo de test:

```ruby
# Paso 1 (esta tarea): traduce el hash a los 15 posicionales del código viejo.
def search_for(**f)
  ReportExpense.search(f[:cost_center_id], f[:user_invoice_id], f[:invoice_name], f[:invoice_date],
                       f[:identification], f[:description], f[:invoice_number],
                       f[:type_identification_id], f[:payment_type_id], f[:invoice_value],
                       f[:invoice_tax], f[:invoice_total], f[:start_date], f[:end_date],
                       f[:is_acepted])
end
```

Correr `bin/rails test test/models/report_expense_search_test.rb`: **todos verdes salvo los tres
marcados como "falla con el código viejo"** (`test_no_hay_fuga_de_filtros_entre_hilos`,
`test_search_no_define_scopes_de_clase`, `test_invoice_name_no_string_no_revienta`). Pegar en el
commit la salida con esos tres en rojo: es la evidencia del bug de concurrencia. Este commit deja
la suite roja a propósito y **no se mergea solo**; B1..B4 van en el mismo PR.

**B2. Reescribir `self.search`.** Reemplazar `app/models/report_expense.rb:56-75` por:

```ruby
SEARCH_KEYS = %i[
  cost_center_id user_invoice_id invoice_name invoice_date identification description
  invoice_number type_identification_id payment_type_id invoice_value invoice_tax
  invoice_total start_date end_date is_acepted
].freeze

def self.search(filters = {})
  f = filters.symbolize_keys
  scope = all
  scope = scope.where(cost_center_id: f[:cost_center_id])                 if f[:cost_center_id].present?
  scope = scope.where(user_invoice_id: f[:user_invoice_id])               if f[:user_invoice_id].present?
  scope = scope.where("LOWER(invoice_name) LIKE ?", "%#{f[:invoice_name].to_s.downcase}%") if f[:invoice_name].present?
  scope = scope.where(invoice_date: f[:invoice_date])                     if f[:invoice_date].present?
  scope = scope.where(identification: f[:identification])                 if f[:identification].present?
  scope = scope.where("LOWER(description) LIKE ?", "%#{f[:description].to_s.downcase}%")   if f[:description].present?
  scope = scope.where(invoice_number: f[:invoice_number])                 if f[:invoice_number].present?
  scope = scope.where(type_identification_id: f[:type_identification_id]) if f[:type_identification_id].present?
  scope = scope.where(payment_type_id: f[:payment_type_id])               if f[:payment_type_id].present?
  scope = scope.where(invoice_value: f[:invoice_value])                   if f[:invoice_value].present?
  scope = scope.where(invoice_tax: f[:invoice_tax])                       if f[:invoice_tax].present?
  scope = scope.where(invoice_total: f[:invoice_total])                   if f[:invoice_total].present?
  scope = scope.where("invoice_date >= ?", f[:start_date])                if f[:start_date].present?
  scope = scope.where("invoice_date <= ?", f[:end_date])                  if f[:end_date].present?
  scope = scope.where(is_acepted: f[:is_acepted])                         if f[:is_acepted].present?
  scope
end
```

Reglas que no se pueden cambiar en esta tarea:

- **Mismo patrón que `CostCenter.search`** (`cost_center.rb:121-133`), que ya está bien hecho: es
  el precedente del repo, no se inventa nada.
- `scope = all` **dentro del método de clase** es lo que preserva el receptor: cuando se llama
  como `ReportExpense.where(user_invoice_id: 3).search(...)`, `ActiveRecord::Delegation` ejecuta
  el método dentro de `scoping`, y `all` devuelve el scope actual. El comportamiento de
  encadenamiento del código viejo (que también dependía de `scoping`) queda idéntico.
- `.present?` como guarda en los 15: **no cambiar a `.nil?`**. `params[:is_acepted] == "false"` es
  `present?` ⇒ el filtro se aplica y `where(is_acepted: "false")` tipa a `false`. Con `.nil?`
  cambiaría el conjunto de filtros que se activan (los `""` empezarían a filtrar) y se rompería
  la pantalla.
- Se agrega `.to_s` antes de `.downcase` en los dos LIKE. Es el único cambio de comportamiento del
  bloque: hoy un valor numérico revienta con `NoMethodError`. **Asumido** como corrección.
- `SEARCH_KEYS` es público y lo va a reutilizar `AccountingExpensesController` (otro paquete).
- **No agregar filtros nuevos aquí.** `q`, `currency`, `budget_status`, `accounting_approved` y
  `expense_budget_id` son de los paquetes de Contabilidad / Multimoneda / Presupuesto.

**B3. Actualizar los 6 call sites del controller.** En `report_expenses_controller.rb`.
**Los call sites se identifican por método, no por línea** (corrección 8 del bloque de auditoría):
los números de línea que aparecen abajo son orientativos y pueden haberse desplazado.

1. Agregar el helper privado (junto a `report_expense_params_create`, ~línea 350):

```ruby
def report_expense_search_filters
  params.permit(*ReportExpense::SEARCH_KEYS).to_h.symbolize_keys
end
```

2. `get_report_expenses` (1 uso): **borrar** el bloque `has_filters` completo y dejar
   `base_query = base_query.search(report_expense_search_filters)`. Es seguro: con hash vacío el
   builder devuelve `all`, exactamente lo que hacía el `if`.
3. `get_cost_center_report_expenses` (1 uso): idéntico, incluido el borrado de su bloque
   `has_filters`. **Ojo**: `base_query` ya trae `.where(cost_center_id: params[:id])`; el filtro
   `params[:cost_center_id]` es otro parámetro y se sigue pasando tal cual (comportamiento actual,
   no "arreglarlo").
4. `update_filter_values` (2 usos): `ReportExpense.search(report_expense_search_filters)`
   y `ReportExpense.where(user_invoice_id: current_user.id).search(report_expense_search_filters)`.
   **No** tocar la ausencia de guarda de "sin filtros": está declarada fuera de alcance (§3.9).
5. `download_file` (2 usos): mismo reemplazo.
6. Dejar intactas las dos llamadas comentadas del final del archivo (código muerto).
7. **No tocar nada más del controller**: strong params, filtros, orden y cableado presupuestal son
   del paquete 07 (§7.2).

**B4. Cerrar la red de seguridad.** Cambiar el helper del test a su forma final:

```ruby
def search_for(**f) = ReportExpense.search(f)
```

`bin/rails test test/models/report_expense_search_test.rb` → **todo verde, incluidos los tres que
antes fallaban**. Ese delta es el entregable del bloque B.

**B5. Grep de seguridad.** `grep -rn "\.centro\b\|\.name_gasto\|\.indetificacion\|\.numero_factura\|\.fdesdep\|\.fhastap" app/ lib/ db/` → sin resultados. Los 15 scopes que el código viejo
definía en runtime (`centro`, `user`, `name_gasto`, `date`, `indetificacion`, `descripcion`,
`numero_factura`, `tipo_identificacion`, `tipo_pago`, `valor_factura`, `inpuesto_factura`,
`total_factura`, `fdesdep`, `fhastap`, `estado`) dejan de existir; si alguien los usaba, se rompe
en runtime y no en boot.

---

### Bloque C — Concern de auditoría

**C1. Tests golden ANTES de tocar el modelo.** Crear
`test/models/report_expense_audit_legacy_test.rb` con los casos de la sección de pruebas y los
HTML literales de más abajo. Correr contra el código actual: **todo verde**. Este archivo es el
contrato; a partir de aquí, cualquier diferencia de un solo carácter falla.

**Las cadenas exactas que hay que congelar** (obtenidas de `report_expense.rb:148-347`), para un
gasto con `cost_center.code = "CM-ACME-01-2026"`, `user_invoice.names = "Juan Perez"`,
`type_identification.name = "Alimentación"`, `payment_type.name = "Efectivo"`,
`invoice_date = 2026-07-14`, `invoice_name = "Hotel Dann"`, `description = "Hospedaje"`,
`identification = "900123456"`, `invoice_number = "FE-4821"`, `invoice_value = 1000.0`,
`invoice_tax = 190.0`, `invoice_total = 1190.0`:

*Creación* (`type_edit: "creo"`) — una sola línea, sin saltos:

```
<p><p><strong>(SE CREO EL SIGUIENTE REGISTRO)</strong></p><p>Centro de costo: <b>CM-ACME-01-2026</b></p><p>Usuario: <b>Juan Perez</b></p> <p>Tipo de gasto: <b>Alimentación</b> </p> <p>Medio de pago: <b>Efectivo</b> </p> <p>Fecha:2026-07-14</b> </p> <p>Nombre: Hotel Dann</b></p>  <p>Descripción: Hospedaje</b></p> <p>NIT/IDENTIFICACIÓN: 900123456</b></p>  <p>Numero de factura:FE-4821</b></p>  <p>Valor: <b >1000.0</b></p> <p>IVA: <b >190.0</b>  <p>Total: <b >1190.0</b> </p> <p>NIT/IDENTIFICACIÓN: 900123456</b></p> 
```

*Borrado* (`type_edit: "elimino"`): **el mismo cuerpo y el mismo encabezado
`(SE CREO EL SIGUIENTE REGISTRO)`** — sí, el texto dice "SE CREO" al eliminar. Es el
comportamiento actual y se conserva.

*Edición* de un solo campo (`invoice_value` de `1000.0` a `2000.0`):

```
<p><p><strong>(SE EDITO EL SIGUIENTE REGISTRO)</strong></p><p>Valor: <b class='color-true'>1000.0</b> / <b class='color-false'>2000.0</b></p>
```

Rarezas que **son** el contrato (ninguna se "arregla"):

| # | Rareza | Dónde |
|---|---|---|
| 1 | Encabezado con `<p>` sin cerrar duplicado: `<p><p><strong>…</strong></p>` | creación, edición, borrado |
| 2 | El encabezado de edición mide **exactamente 59 caracteres** y el umbral es `str.length > 59` ⇒ "solo si cambió algo" | edición |
| 3 | Umbral de creación/borrado: `str.length > 5` (siempre se cumple) | creación, borrado |
| 4 | En creación/borrado, `NIT/IDENTIFICACIÓN` aparece **dos veces** | creación, borrado |
| 5 | En creación/borrado no hay separador entre "Centro de costo" y "Usuario", y sí un espacio entre todos los demás segmentos | creación, borrado |
| 6 | `</b>` huérfanos: `Fecha:`, `Nombre:`, `Descripción:`, `NIT/…:`, `Numero de factura:` abren `</b>` sin `<b>` | creación, borrado |
| 7 | `IVA` no cierra `</p>` | creación, borrado |
| 8 | `<b >` con espacio en Valor / IVA / Total | creación, borrado |
| 9 | Sin espacio tras los dos puntos en `Fecha:` y `Numero de factura:` | creación, borrado |
| 10 | `>Nombre` con `>` de sobra | edición |
| 11 | `Descripcion` sin tilde en edición, `Descripción` con tilde en creación | ambos |
| 12 | En escalares, el valor **viejo** va en `color-true` y el **nuevo** en `color-false` | edición |
| 13 | En asociaciones se hace `Klass.where(id: attr_change)` y se usa `names[1]` en `color-true` y `names[0]` en `color-false` ⇒ **el orden lo decide el id del registro, no viejo/nuevo** | edición |
| 14 | `RegisterEdit.date_update` es columna `date` y recibe `Time.now` | los tres |
| 15 | `module: "Gatos"` (typo) | los tres |
| 16 | Se usa `RegisterEdit.create` (sin `!`): si falla la validación `belongs_to :user`, no hay auditoría y nadie se entera | los tres |

**C2. Crear el concern `RegisterAuditable`.** `app/models/concerns/register_auditable.rb`.
API pública, exacta:

```ruby
module RegisterAuditable
  extend ActiveSupport::Concern

  Field = Struct.new(:key, :label, :kind, :assoc_class, :assoc_attr,
                     :create_format, :edit_format, keyword_init: true)

  DEFAULT_CREATE_FORMAT = "<p>%{label}: <b>%{value}</b></p>"
  DEFAULT_EDIT_FORMAT   = "<p>%{label}: <b class='color-true'>%{left}</b> / <b class='color-false'>%{right}</b></p>"

  included do
    class_attribute :audit_fields,  instance_writer: false, default: {}
    class_attribute :audit_options, instance_writer: false, default: nil
  end

  class_methods do
    # Declara UN campo auditable. No instala callbacks.
    #   kind: :scalar | :association
    def audit_field(key, label:, kind: :scalar, assoc_class: nil, assoc_attr: nil,
                    create_format: nil, edit_format: nil)

    # Declara el layout y instala los tres callbacks.
    def audit_register(module_name:,
                       create_header:, edit_header:,
                       create_fields:, edit_fields:,
                       create_min_length: 5, edit_min_length: 59,
                       create_joiner: " ", create_no_joiner_after: [],
                       edit_joiner: "",
                       create_type_edit: "creo",
                       destroy_type_edit: "elimino",
                       edit_type_edit: nil,
                       destroy_header: nil,          # default: create_header
                       destroy_fields: nil,          # default: create_fields
                       touch_last_user_edited: true)
  end
end
```

Comportamiento obligatorio:

1. `audit_register` instala, **en este orden**:
   `after_create :write_create_audit_register`, `before_update :write_edit_audit_register`,
   `before_destroy :write_destroy_audit_register`.
2. **Renderizado, modo creación/borrado** (`render_audit_segment(field, :create)`):
   - `:association` → se salta (devuelve `""`) si `public_send("#{key}?")` es falso; si no,
     `value = field.assoc_class.constantize.where(id: self[key]).take&.public_send(field.assoc_attr)`.
   - `:scalar` → siempre se renderiza; `value = public_send(key)`.
   - `format(field.create_format || DEFAULT_CREATE_FORMAT, label: field.label, value: value)`.
3. **Renderizado, modo edición** (`render_audit_segment(field, :edit)`):
   - devuelve `""` si `public_send("#{key}_changed?")` es falso.
   - `:association` → `names = field.assoc_class.constantize.where(id: public_send("#{key}_change")).map { |r| r.public_send(field.assoc_attr) }`; `left = names[1]`, `right = names[0]`.
   - `:scalar` → `change = public_send("#{key}_change")`; `left = change[0]`, `right = change[1]`.
   - `format(field.edit_format || DEFAULT_EDIT_FORMAT, label: field.label, left: left, right: right)`.
4. **Ensamblado**: se recorre la lista ordenada (que **admite claves repetidas**) y entre el
   segmento `i-1` y el `i` se inserta el joiner del modo, **salvo** si la clave del segmento `i-1`
   está en `create_no_joiner_after`. Los segmentos vacíos participan igual (concatenar `""` es lo
   que hace el código viejo). Al resultado se le antepone el header.
5. **Escritura**: si `str.length > min_length` del modo,
   `RegisterEdit.create(user_id: audit_actor_id, register_user_id: id, state: "pending",
   date_update: Time.now, module: <module_name>, description: str, type_edit: <type_edit del modo>)`.
   `type_edit` **no se pasa** cuando es `nil` (modo edición), para que quede el default `"edito"`
   de la columna.
6. **Actor**: el concern define `audit_actor_id` (público, sobreescribible):
   `User.current&.id || try(:user_id) || try(:user_invoice_id) || try(:last_user_edited_id)`.
   Es literalmente el `current_actor_id` de §5.3 Capa 1.
7. Si `touch_last_user_edited` y el modelo responde a `last_user_edited_id=`, el callback de
   edición hace `self.last_user_edited_id = audit_actor_id` **antes** de renderizar (igual que
   hoy: `create_edit_register` lo repite después de `edit_values`).
8. **Nada de `puts`.** Los cuatro `puts` del código viejo (`report_expense.rb:188-189, 259, 272,
   321, 334`, incluido el `puts "asfadsfasfdsfdsfdasdfadsfsadfasfsda"`) desaparecen. No afectan al
   HTML.
9. **Trampa de `format`**: un `%` literal en un `label` o en un formato revienta con
   `ArgumentError`. Ninguno de los 13 campos actuales lo tiene; el que agregue uno debe escaparlo
   como `%%`.

**C3. Declarar los 13 campos en `ReportExpense`.** Borrar los métodos 148-222, 226-285 y 288-347 y
dejar, justo debajo de las asociaciones:

```ruby
include RegisterAuditable

before_update :edit_values   # se declara ANTES de audit_register: preserva el orden de callbacks

audit_field :cost_center_id,         label: "Centro de costo", kind: :association,
            assoc_class: "CostCenter", assoc_attr: :code
audit_field :user_invoice_id,        label: "Usuario", kind: :association,
            assoc_class: "User", assoc_attr: :names
audit_field :type_identification_id, label: "Tipo de gasto", kind: :association,
            assoc_class: "ReportExpenseOption", assoc_attr: :name,
            create_format: "<p>%{label}: <b>%{value}</b> </p>"
audit_field :payment_type_id,        label: "Medio de pago", kind: :association,
            assoc_class: "ReportExpenseOption", assoc_attr: :name,
            create_format: "<p>%{label}: <b>%{value}</b> </p>"
audit_field :invoice_date,           label: "Fecha",
            create_format: "<p>%{label}:%{value}</b> </p>"
audit_field :invoice_name,           label: "Nombre",
            create_format: "<p>%{label}: %{value}</b></p> ",
            edit_format:   "<p>>%{label}: <b class='color-true'>%{left}</b> / <b class='color-false'>%{right}</b></p>"
audit_field :description,            label: "Descripción",
            create_format: "<p>%{label}: %{value}</b></p>",
            edit_format:   "<p>Descripcion: <b class='color-true'>%{left}</b> / <b class='color-false'>%{right}</b></p>"
audit_field :identification,         label: "NIT/IDENTIFICACIÓN",
            create_format: "<p>%{label}: %{value}</b></p> "
audit_field :invoice_number,         label: "Numero de factura",
            create_format: "<p>%{label}:%{value}</b></p> "
audit_field :invoice_value,          label: "Valor",
            create_format: "<p>%{label}: <b >%{value}</b></p>"
audit_field :invoice_tax,            label: "IVA",
            create_format: "<p>%{label}: <b >%{value}</b> "
audit_field :invoice_total,          label: "Total",
            create_format: "<p>%{label}: <b >%{value}</b> </p>"
audit_field :type_identification,    label: "Tipo de identificacion"   # columna string, solo edición

audit_register(
  module_name:   "Gatos",                                                     # typo intencional (§6.9)
  create_header: "<p><p><strong>(SE CREO EL SIGUIENTE REGISTRO)</strong></p>",
  edit_header:   "<p><p><strong>(SE EDITO EL SIGUIENTE REGISTRO)</strong></p>",
  create_fields: %i[cost_center_id user_invoice_id type_identification_id payment_type_id
                    invoice_date invoice_name description identification invoice_number
                    invoice_value invoice_tax invoice_total identification],
  create_no_joiner_after: %i[cost_center_id],
  edit_fields:   %i[cost_center_id user_invoice_id type_identification_id payment_type_id
                    invoice_date invoice_name description type_identification invoice_number
                    invoice_value invoice_tax invoice_total identification],
  create_min_length: 5,
  edit_min_length:   59
)
```

- `create_fields` tiene `identification` **dos veces**: es la rareza #4, no es un error de copia.
- Las listas `create_fields` y `edit_fields` **no** están en el mismo orden ni tienen los mismos
  elementos (`type_identification` solo en edición; `identification` en posición 8 en creación y
  al final en edición). Copiarlas literalmente.
- `edit_values` (líneas 52-54) se conserva; `current_actor_id` (que introduce el Paquete 01) pasa a
  ser `def current_actor_id = audit_actor_id`, privado, para no tener dos implementaciones.

**C4. Correr los golden.** `bin/rails test test/models/report_expense_audit_legacy_test.rb` →
verde sin haber tocado una sola aserción. Si hay diff, el culpable es el concern, nunca el test.

**C5. Tests del concern** (`test/models/report_expense_audit_concern_test.rb`, detallados abajo).

**C6. Verificación de tamaño.** `git diff --stat app/models/report_expense.rb` debe mostrar
**al menos 180 líneas eliminadas**. Si el modelo no adelgazó, el refactor no ocurrió.

---

## Pruebas unitarias (Minitest)

Convenciones para todos los archivos de esta sección (§5.3, §5.4): `fixtures :all` viene de
`test_helper.rb`; **toda** creación/edición/borrado de `ReportExpense` va envuelta en
`as_user(users(:admin)) { ... }`; las FKs se referencian por etiqueta de fixture, nunca por id.

### `test/uploaders/uploaders_storage_test.rb` (9 casos)

| Test | Aserción |
|---|---|
| `test_avatar_uploader_usa_file_fuera_de_produccion` | `assert_equal CarrierWave::Storage::File, AvatarUploader.storage` |
| `test_certificate_uploader_usa_file_fuera_de_produccion` | ídem con `CertificateUploader` |
| `test_information_uploader_usa_file_fuera_de_produccion` | ídem con `InformationUploader` |
| `test_order_uploader_usa_file_fuera_de_produccion` | ídem con `OrderUploader` |
| `test_ningun_uploader_declara_storage_incondicional` | Para los 4 archivos: `refute_match(/^\s*storage\s+:(file|fog)\s*$/, File.read(path), "#{path} volvió a fijar storage sin condicional")`. **Es el test que impide la regresión que causó todo esto.** |
| `test_los_cuatro_uploaders_declaran_storage_una_sola_vez` | `assert_equal 1, File.read(path).scan(/^\s*storage[\s(]/).count` para cada archivo |
| `test_los_cuatro_uploaders_declaran_la_forma_condicional` | `assert_match(/storage\(Rails\.env\.production\? \? :fog : :file\)/, File.read(path))` para cada archivo |
| `test_carrierwave_no_procesa_imagenes_en_test` | `refute CarrierWave::Uploader::Base.enable_processing` |
| `test_carrierwave_escribe_en_tmp_en_test` | **Con `E2E_UPLOAD_ROOT` ausente**: `assert_equal Rails.root.join("tmp", "uploads_test").to_s, CarrierWave.root.to_s`. El paquete 12 sobrescribe esa ENV solo en su corrida; el test no la fija |

**Nota para el agente**: no existe forma limpia de probar la rama de producción en runtime
(`Rails.env.production?` se evalúa al cargar la clase y `cache_classes = true` en test). Por eso
esa rama se cubre con los tres tests estáticos sobre el código fuente. No inventar recargas de
clases con `load`.

### `test/uploaders/uploaders_allowlist_test.rb` (12 casos)

Helper local: `def upload(name, type) = Rack::Test::UploadedFile.new(Rails.root.join("test/fixtures/files", name), type)`.
`teardown` borra `Rails.root.join("tmp/uploads_test")`.
Los archivos de `test/fixtures/files/` **ya existen**: los crea el paquete 01 con los nombres
canónicos de §7.12 (`comprobante.png`, `comprobante.pdf`, `malicioso.exe`, `disfrazado.png`).

| Test | Aserción |
|---|---|
| `test_avatar_acepta_png` | `AvatarUploader.new(User.new, :avatar).cache!(upload("comprobante.png", "image/png"))` no lanza y `uploader.file.present?` |
| `test_avatar_rechaza_extension_exe` | `assert_raises(CarrierWave::IntegrityError) { ... cache!(upload("malicioso.exe", "application/octet-stream")) }` |
| `test_avatar_rechaza_archivo_disfrazado_de_png` | `assert_raises(CarrierWave::IntegrityError)` con `disfrazado.png` (§7.12: un `.exe` renombrado a `.png`); la extensión pasa y el `content_type_allowlist` es el que corta |
| `test_avatar_rechaza_archivo_de_6_megas` | Genera un PNG de 6 MB en `Tempfile`; `assert_raises(CarrierWave::IntegrityError)` |
| `test_avatar_acepta_archivo_de_1_mega` | No lanza |
| `test_order_uploader_acepta_pdf` | `OrderUploader.new(SalesOrder.new, :order_file).cache!(upload("comprobante.pdf", "application/pdf"))` no lanza |
| `test_order_uploader_acepta_png` | No lanza |
| `test_order_uploader_rechaza_exe` | `assert_raises(CarrierWave::IntegrityError)` |
| `test_order_uploader_rechaza_archivo_de_11_megas` | `assert_raises(CarrierWave::IntegrityError)` |
| `test_certificate_uploader_rechaza_exe` | `assert_raises(CarrierWave::IntegrityError)` |
| `test_information_uploader_rechaza_exe` | `assert_raises(CarrierWave::IntegrityError)` |
| `test_registro_legado_con_extension_prohibida_sigue_siendo_valido` | Crear un `SalesOrder`, luego `SalesOrder.where(id: o.id).update_all(order_file: "viejo.rar")`, `o.reload`; `assert o.valid?` y `assert o.update(description: "x")`. **Caso de fallo crítico**: si las allowlists invalidaran filas históricas, cada edición de una orden vieja fallaría en producción. |

### `test/models/report_expense_search_test.rb` (27 casos)

`setup` crea, dentro de `as_user(users(:admin))`, un conjunto determinista de 5 gastos sobre dos
centros (`centro_a`, `centro_b`) y dos usuarios, con valores fijos y distintos entre sí. Todos los
tests afirman sobre **conjuntos de ids** (`assert_equal [g1.id, g3.id].sort, search_for(...).pluck(:id).sort`),
nunca sobre `count` solo.

| # | Test | Aserción |
|---|---|---|
| 1 | `test_filtra_por_cost_center_id` | solo los del centro pedido |
| 2 | `test_filtra_por_user_invoice_id` | solo los del responsable pedido |
| 3 | `test_filtra_por_invoice_name_like_case_insensitive` | `invoice_name: "HOTEL"` devuelve el gasto `"Hotel Dann"` (LIKE + `LOWER`) |
| 4 | `test_filtra_por_invoice_name_parcial` | `"ann"` también lo devuelve (comodines a ambos lados) |
| 5 | `test_filtra_por_invoice_date_exacta` | igualdad exacta, no rango |
| 6 | `test_filtra_por_identification_exacta` | `"9001"` **no** devuelve el de `"900123456"` (es igualdad, no LIKE) |
| 7 | `test_filtra_por_description_like_case_insensitive` | idem 3 sobre `description` |
| 8 | `test_filtra_por_invoice_number_exacto` | igualdad |
| 9 | `test_filtra_por_type_identification_id` | igualdad |
| 10 | `test_filtra_por_payment_type_id` | igualdad |
| 11 | `test_filtra_por_invoice_value_exacto` | `1000.0` devuelve solo ese |
| 12 | `test_filtra_por_invoice_tax_exacto` | igualdad |
| 13 | `test_filtra_por_invoice_total_exacto` | igualdad |
| 14 | `test_start_date_incluye_el_borde` | un gasto con `invoice_date` == `start_date` **sí** aparece (`>=`) |
| 15 | `test_end_date_incluye_el_borde` | idem con `<=` |
| 16 | `test_start_y_end_date_juntos_definen_rango_cerrado` | solo los de adentro |
| 17 | `test_filtra_por_is_acepted_true_string` | `is_acepted: "true"` devuelve solo los aceptados |
| 18 | `test_filtra_por_is_acepted_false_string` | **Caso borde**: `"false"` es `present?` ⇒ filtra a los NO aceptados; no devuelve todo |
| 19 | `test_sin_filtros_devuelve_todos` | `search_for()` == `ReportExpense.all` |
| 20 | `test_filtros_nil_y_vacios_se_ignoran` | `search_for(cost_center_id: nil, invoice_name: "")` == todos |
| 21 | `test_dos_filtros_se_combinan_con_and` | intersección, no unión |
| 22 | `test_respeta_el_scope_del_receptor` | `ReportExpense.where(user_invoice_id: u.id).search(...)` respeta **ambas** condiciones (es lo que hacen `update_filter_values` y `download_file` para el usuario sin "Ver todos") |
| 23 | `test_respeta_los_includes_del_receptor` | `assert_equal [:cost_center], ReportExpense.includes(:cost_center).search(cost_center_id: c.id).includes_values` |
| 24 | `test_devuelve_una_relation_encadenable` | `assert_kind_of ActiveRecord::Relation, r`; `r.order(:id).limit(1)` y `r.count` funcionan |
| 25 | `test_invoice_name_no_string_no_revienta` | `search_for(invoice_name: 123)` no lanza (**falla con el código viejo**) |

Y los dos que existen solo para demostrar el bug:

| # | Test | Aserción |
|---|---|---|
| 26 | `test_search_no_define_scopes_de_clase` | `antes = ReportExpense.singleton_methods.sort; search_for(cost_center_id: c.id); assert_equal antes, ReportExpense.singleton_methods.sort` y `%i[centro name_gasto indetificacion numero_factura fdesdep fhastap estado].each { \|s\| refute_respond_to ReportExpense, s }`. **Falla con el código viejo.** |
| 27 | `test_no_hay_fuga_de_filtros_entre_hilos` | Ver abajo. **Falla con el código viejo.** |

**Diseño del test de concurrencia** (`test_no_hay_fuga_de_filtros_entre_hilos`) — es el único
incómodo, así que va especificado al detalle:

```ruby
class ReportExpenseSearchConcurrencyTest < ActiveSupport::TestCase
  self.use_transactional_tests = false   # los otros hilos usan OTRA conexión y no verían los datos
  ...
end
```

- Va en **su propia clase** dentro del mismo archivo, porque desactivar las transacciones en toda
  la clase haría lentos y sucios los 26 tests anteriores.
- `setup` crea con `as_user` dos centros y 20 gastos (10 y 10) y guarda sus ids; `teardown` los
  borra explícitamente (`ReportExpense.where(id: @ids).delete_all` + los centros) — `delete_all`
  para no disparar `before_destroy`.
- 4 hilos (el pool de AR es 5, `config/database.yml`), cada uno con
  `ActiveRecord::Base.connection_pool.with_connection do ... end`; cada hilo ejecuta 100
  iteraciones de `ReportExpense.search(cost_center_id: mi_centro.id).pluck(:cost_center_id)`.
- Las violaciones **no se afirman dentro del hilo** (Minitest no captura esas aserciones): se
  empujan a un `Queue` compartido (`violaciones << [mi_centro.id, valores]` si
  `valores.uniq != [mi_centro.id]`).
- En el hilo principal: `threads.each(&:join)` y `assert violaciones.empty?, "fuga de filtros
  entre hilos: #{violaciones.size} lecturas contaminadas"`.
- `Thread.report_on_exception = false` alrededor, y un `rescue => e` por hilo que empuje la
  excepción al mismo `Queue` (con el código viejo también aparecen
  `ActiveRecord::StatementInvalid` esporádicos).
- Con el código viejo este test falla de forma **intermitente**: si pasa en la primera corrida,
  subir a 8 hilos × 300 iteraciones antes de darlo por bueno.

### `test/models/report_expense_audit_legacy_test.rb` (14 casos, golden)

`setup`: dentro de `as_user(users(:admin))`, construye un `ReportExpense` con **exactamente** los
valores del ejemplo de C1 (fixtures con `code`, `names` y `name` fijados a esos literales). Los
HTML esperados van como constantes `String` de una sola línea en el archivo de test.

| Test | Aserción |
|---|---|
| `test_html_de_creacion_es_identico_al_legado` | `assert_equal HTML_CREACION, RegisterEdit.last.description` |
| `test_atributos_del_registro_de_creacion` | `type_edit == "creo"`, `module == "Gatos"`, `state == "pending"`, `register_user_id == expense.id`, `user_id == users(:admin).id`, `date_update == Date.current` |
| `test_creacion_genera_un_solo_register_edit` | `assert_difference("RegisterEdit.count", 1) { ... }` — **caso borde**: el controller hace `create` y luego `save`, y el `save` sin cambios dispara `before_update`; el umbral 59 es lo que impide el registro fantasma |
| `test_html_de_borrado_es_identico_al_de_creacion` | mismo cuerpo y mismo encabezado `(SE CREO …)` |
| `test_atributos_del_registro_de_borrado` | `type_edit == "elimino"` |
| `test_html_de_edicion_un_solo_campo` | `assert_equal HTML_EDICION_VALOR, RegisterEdit.last.description` |
| `test_edicion_pone_el_valor_viejo_en_color_true` | `assert_includes html, "<b class='color-true'>1000.0</b>"` (rareza #12) |
| `test_edicion_de_asociacion_ordena_por_id_no_por_viejo_nuevo` | Crear dos centros donde el **nuevo** tenga id menor; afirmar que en `color-true` aparece el `code` del centro de **id mayor** (rareza #13) |
| `test_edicion_sin_cambios_no_crea_register_edit` | `assert_no_difference("RegisterEdit.count") { expense.save! }` (umbral 59) |
| `test_edicion_de_dos_campos_concatena_sin_separador` | `assert_equal HTML_EDICION_DOS_CAMPOS, ...` — verifica que entre segmentos de edición no hay espacio |
| `test_edicion_de_nombre_lleva_el_mayor_que_de_sobra` | `assert_includes html, "<p>>Nombre:"` (rareza #10) |
| `test_edicion_de_descripcion_va_sin_tilde` | `assert_includes html, "<p>Descripcion:"` y `refute_includes html, "<p>Descripción:"` (rareza #11) |
| `test_creacion_repite_nit_dos_veces` | `assert_equal 2, html.scan("NIT/IDENTIFICACIÓN").size` (rareza #4) |
| `test_creacion_con_asociaciones_nulas_omite_esos_segmentos` | Gasto sin `type_identification_id` ni `payment_type_id`: `refute_includes html, "Tipo de gasto"`, `refute_includes html, "Medio de pago"`, y el resto del HTML intacto |

> **Regla para los paquetes que vienen después:** estos 14 tests fallan a propósito cuando alguien
> agrega un campo auditado. Actualizar la constante esperada **agregando el segmento nuevo al
> final** es parte del trabajo de ese paquete. Nadie borra ni relaja estos tests.

### `test/models/report_expense_audit_concern_test.rb` (11 casos)

| Test | Aserción |
|---|---|
| `test_audit_fields_registra_los_trece_campos` | `assert_equal 13, ReportExpense.audit_fields.size` y las claves exactas |
| `test_layout_de_creacion_repite_identification` | `assert_equal 2, ReportExpense.audit_options[:create_fields].count(:identification)` |
| `test_layout_de_edicion_incluye_type_identification_y_el_de_creacion_no` | `assert_includes edit_fields, :type_identification`; `refute_includes create_fields, :type_identification` |
| `test_segmento_de_asociacion_guarda_el_nombre_legible_no_el_id` | `assert_includes segmento, cost_center.code`; `refute_includes segmento, cost_center.id.to_s` (§4.7) |
| `test_asociacion_colgante_no_revienta` | `ReportExpense.where(id: e.id).update_all(cost_center_id: 999_999)`; `e.reload.destroy` no lanza y el segmento queda `<p>Centro de costo: <b></b></p>`. **Cambio de comportamiento respecto del legado** (hoy es `NoMethodError` sobre `nil`), marcado como Asumido |
| `test_audit_actor_id_usa_user_current_cuando_existe` | dentro de `as_user(users(:admin))`, `assert_equal users(:admin).id, e.audit_actor_id` |
| `test_audit_actor_id_cae_a_user_id_cuando_no_hay_user_current` | con `User.current = nil`, `assert_equal e.user_id, e.audit_actor_id` |
| `test_sin_actor_ni_fks_no_revienta_y_no_audita` | `User.current = nil` y `user_id`/`user_invoice_id`/`last_user_edited_id` nulos: `assert_no_difference("RegisterEdit.count") { e.save! }` y el gasto **sí** queda persistido (`RegisterEdit.create` no es bang — rareza #16) |
| `test_umbral_de_edicion_es_59_y_es_el_largo_del_encabezado` | `assert_equal 59, ReportExpense.audit_options[:edit_header].length` y `assert_equal 59, ReportExpense.audit_options[:edit_min_length]` |
| `test_touch_last_user_edited_en_edicion` | tras `e.update!(invoice_value: 2.0)`, `assert_equal users(:admin).id, e.last_user_edited_id` |
| `test_el_modelo_ya_no_define_los_metodos_viejos` | `%i[create_edit_register create_create_register create_destroy_register].each { \|m\| refute_respond_to e, m }` — impide que alguien deje los métodos viejos "por si acaso" y queden dos auditorías por operación |

**Totales del paquete: 73 tests unitarios** = 9 (`uploaders_storage`) + 12 (`uploaders_allowlist`)
+ 27 (`report_expense_search`: 25 casos de filtro + 2 de demostración del bug, repartidos en dos
clases dentro del mismo archivo) + 14 (`audit_legacy`) + 11 (`audit_concern`).

---

## Pruebas E2E (Playwright)

**Este paquete no agrega superficie de usuario nueva**: no hay pantallas, ni endpoints, ni
componentes React tocados. Los tres bloques son invisibles para el usuario si están bien hechos.
Además, la infraestructura de Playwright (`playwright.config.js`, `storageState`, seeds) la monta
el **paquete 01** y los specs funcionales son del **paquete 12** (§7.2), y en `RAILS_ENV=test` el
storage es `:file` por diseño (tarea A2), así que un E2E
**no podría** ejercitar la rama de fog: probaría exactamente lo mismo que ya prueban los tests
unitarios, con 100× el costo.

**E2E-03.1 — "Subir un archivo a una orden de compra sigue funcionando"**
> **RETIRADA por auditoría.** Dueño único: paquete 12. Ver el bloque de correcciones al inicio
> (punto 9) y §7.2: todos los `test/e2e/specs/*.spec.js` funcionales son del paquete 12.

**Este paquete no escribe ningún spec de Playwright.** Su red de pruebas son los 73 tests de
Minitest de la sección anterior. Si el paquete 12 quiere un escenario de regresión de subida de
archivos, lo escribe él, en su repertorio y con sus convenciones.

La verificación de que el archivo **sobrevive un restart** es la del protocolo A7 en Heroku, no un
E2E: Playwright corre contra `RAILS_ENV=test` con storage local y no puede demostrarlo.

---

## Criterios de aceptación

Cada ítem se marca sí/no sin opinar.

**Bloque A**

1. `grep -rn "^\s*storage :file" app/uploaders/` devuelve **0 líneas**.
2. `grep -c "storage(Rails.env.production? ? :fog : :file)" app/uploaders/*.rb` devuelve `1` en los
   cuatro archivos.
3. Los cuatro uploaders definen `extension_allowlist`, `content_type_allowlist` y `size_range`
   (métodos de instancia, no constantes).
4. `grep -rn "extension_whitelist\|content_type_whitelist" app/uploaders/` devuelve **0 líneas**
   (incluidos los comentarios de scaffold).
5. `config/initializers/carrierwave.rb` fija `:region` desde `ENV.fetch("AWS_REGION", "us-east-1")`
   y, solo bajo `Rails.env.test?`, `enable_processing = false`, `storage = :file` y
   `root = ENV.fetch("E2E_UPLOAD_ROOT") { Rails.root.join("tmp", "uploads_test") }` (valor único
   de §4.8; ninguna otra variante se acepta).
6. `rake storage:check` existe, corre en local sin credenciales e imprime `AUSENTE` sin reventar.
7. El PR cita el resultado escrito por la **Tarea 0** (§7.10, ítem 0.6): las tres variables AWS
   figuran como presentes. Este paquete **no** re-ejecuta la verificación ni pega salidas de
   `heroku config`.
8. La región real del bucket es la que dejó escrita la Tarea 0 y, si no es `us-east-1`, existe la
   línea `heroku config:set AWS_REGION=<región>` ejecutada.
9. El protocolo A7 está ejecutado y su evidencia (URL de S3 del paso 4 + captura del paso 7
   después del `heroku restart`) está en el PR.
10. El PR dice explícitamente, en el cuerpo, que **los archivos históricos no son recuperables**.
11. `bin/rails test test/uploaders` → 21 tests, 0 failures, 0 errors.

**Bloque B**

12. `ReportExpense.search` acepta **un** argumento (`assert_equal 1, ReportExpense.method(:search).arity.abs` o inspección visual) y no contiene la palabra `scope`.
13. `ReportExpense::SEARCH_KEYS` existe, está congelada y tiene exactamente 15 símbolos.
14. `grep -n "\.search(" app/controllers/report_expenses_controller.rb` muestra **6** llamadas, las
    6 con `report_expense_search_filters` y ninguna con 15 argumentos.
15. Los dos bloques `has_filters` desaparecieron del controller.
16. `ReportExpense.respond_to?(:centro)` es `false` (y lo mismo para los otros 14 nombres).
17. `bin/rails test test/models/report_expense_search_test.rb` → 27 tests, 0 failures, 0 errors.
18. El commit de B1 documenta (salida pegada) que los tests 25, 26 y 27 fallaban con el código
    viejo.
19. Ninguna otra clase del repo (`ExpenseRatio`, `Material`, `SalesOrder`, `Commission`, `Report`,
    `Contractor`, `CommissionRelation`, `CustomerReport`) fue modificada.

**Bloque C**

20. `app/models/concerns/register_auditable.rb` existe y expone `audit_field`, `audit_register` y
    `audit_actor_id` con las firmas de C2.
21. `app/models/report_expense.rb` **no** contiene `create_edit_register`,
    `create_create_register` ni `create_destroy_register`.
22. `git diff --stat app/models/report_expense.rb` muestra ≥ 180 líneas eliminadas.
23. `grep -c "puts" app/models/report_expense.rb` bajó (los `puts` de los tres métodos de auditoría
    ya no están); los `puts` de `self.import` pueden quedarse (fuera de alcance).
24. `ReportExpense.audit_fields.size == 13` y `audit_options[:module_name] == "Gatos"`.
25. `bin/rails test test/models/report_expense_audit_legacy_test.rb` → 14 tests, 0 failures, y el
    archivo **no cambió** entre C1 y C4 (`git log -p` sobre ese archivo muestra un solo commit de
    creación).
26. `bin/rails test test/models/report_expense_audit_concern_test.rb` → 11 tests, 0 failures.
27. Agregar un campo auditado nuevo cuesta **una línea `audit_field` + una entrada en cada lista de
    `audit_register`**, verificable haciéndolo en una rama descartable con `is_acepted` y
    comprobando que aparece en los tres modos sin tocar ningún método.

**Global**

28. `bin/rails test` completo: 0 failures, 0 errors (el Paquete 01 dejó la suite en verde; este
    paquete no la puede romper).
29. Ningún archivo de `db/migrate/` fue creado o modificado: este paquete **no tiene migraciones**.
30. Ningún archivo de `app/javascript/` fue modificado.
31. Ningún archivo de `test/fixtures/**` (ni `.yml` ni `files/`) ni `test/test_helper.rb` ni
    `test/support/**` fue creado o modificado: son del **paquete 01** (§7.2).
32. Ningún archivo de `test/e2e/` fue creado o modificado: los specs funcionales son del
    **paquete 12** (§7.2).

---

## Riesgos y trampas

**Bloque A**

1. **Corregir los uploaders sin credenciales válidas rompe producción.** Hoy las subidas
   "funcionan" (escriben en disco y se pierden en el siguiente restart). Con `:fog` y credenciales
   malas, la subida **falla en el momento**, con excepción, y el usuario no puede guardar el
   registro. Por eso la precondición de la **Tarea 0** (§7.10, ítem 0.6) es bloqueante: si no está
   escrita y en verde, el Bloque A no se planifica.
2. **Región equivocada = subidas que fallan o redirigen.** fog-aws asume `us-east-1`; si el bucket
   está en `us-east-2` o `sa-east-1`, se obtienen `PermanentRedirect` intermitentes que parecen
   errores de red. Es la causa más probable de un "funciona en staging y no en producción".
3. **Las allowlists pueden rechazar lo que el cliente sube hoy.** Nadie sabe qué extensiones hay en
   las órdenes de compra históricas. Por eso la lista de documentos incluye Office y por eso existe
   el test `test_registro_legado_con_extension_prohibida_sigue_siendo_valido`: CarrierWave solo
   valida al **asignar** un archivo, no al leerlo, pero si alguien agregara una validación de
   modelo, cada edición de una fila vieja empezaría a fallar.
4. **`content_type_allowlist` usa marcel para sniffear el contenido real.** Un `.xlsx` generado por
   una herramienta rara puede reportarse como `application/zip` y ser rechazado pese a tener
   extensión permitida. Si aparece en producción, se agrega `application/zip` a la lista; no se
   quita la validación.
5. **`config.root` en test cambia dónde escribe CarrierWave.** Si un test asume `public/uploads`,
   falla. Y `tmp/uploads_test` hay que limpiarlo en `teardown` o la carpeta crece indefinidamente.
6. **No mover `fog_public` al initializer.** Es global; ponerlo en `false` allí invalidaría todas
   las URLs públicas ya emitidas de avatares y órdenes de compra. Va dentro de `ReceiptUploader`,
   y eso es de otro paquete.
7. **`AvatarUploader` tiene 5 `version` con MiniMagick.** Con `:fog`, cada subida de avatar pasa a
   ser **6 PUT a S3** (original + 5 versiones). Es lento pero correcto; no "optimizarlo" aquí.

**Bloque B**

8. **`scope = all` es obligatorio; `scope = where(nil)` o `scope = unscoped` NO son equivalentes.**
   `unscoped` descarta el receptor y haría que `ReportExpense.where(user_invoice_id: current_user.id).search(...)`
   devolviera los gastos de **todos** los usuarios: fuga de datos entre usuarios en
   `update_filter_values` y `download_file`. Es el error más caro posible en este bloque.
9. **`.present?` vs `.nil?`**: cambiarlo altera el conjunto de filtros activos. `"false"` es
   present, `""` no lo es. Está cubierto por los tests 18 y 20; si alguno se pone en rojo, el
   cambio está mal, no el test.
10. **El test de concurrencia necesita `use_transactional_tests = false`.** Si se deja en `true`,
    los hilos abren otra conexión, no ven los datos del `setup` y el test pasa siempre (verde
    falso). Y sin `teardown` explícito, deja basura en la BD de test que rompe los demás archivos.
11. **El bug viejo es intermitente.** Un `search` en un test aislado no lo reproduce: hacen falta
    varios hilos y muchas iteraciones. No dar por bueno "no lo pude reproducir".
12. **Los 15 scopes viejos siguen existiendo en el proceso** hasta que se recarga la clase: en
    consola, después del refactor, `ReportExpense.centro` puede seguir respondiendo si antes se
    llamó al `search` viejo. Verificar en un proceso limpio.
13. **`params.permit(*SEARCH_KEYS)` descarta lo no listado en silencio.** Si un paquete futuro
    agrega un filtro y lo olvida en `SEARCH_KEYS`, el filtro se ignora sin error y la pantalla
    "funciona" mostrando de más. Es la trampa que este bloque le hereda a los siguientes.

**Bloque C**

14. **Un solo carácter de diferencia rompe el contrato.** El HTML legado tiene espacios de sobra al
    final de segmentos (`</p> `), `</b>` huérfanos y `<b >` con espacio. Al copiar los formatos a
    los `audit_field`, el editor puede recortar espacios finales: configurar el editor para **no**
    hacer trim, o los golden fallan por razones invisibles a simple vista.
15. **Orden de callbacks.** `edit_values` debe declararse antes de `audit_register`, o el
    `before_update` de auditoría corre primero. No cambia el HTML, pero sí el orden de escritura de
    `last_user_edited_id`; no arriesgarlo.
16. **`create_create_register` es `after_create`, no `after_save`.** Si el concern lo registra como
    `after_save`, cada `update` generaría además un registro de "creación". Y el controller
    (`create` seguido de `save`) haría dos.
17. **El umbral 59 no es arbitrario**: es el largo exacto del encabezado de edición. Si alguien
    "redondea" el encabezado o el umbral, cada `save` sin cambios (que el controller hace en cada
    `create`) empieza a producir un `RegisterEdit` fantasma. Está en §4.7 y hay un test que lo fija.
18. **`format` revienta con `%` literal.** Un label futuro tipo `"% de IVA"` lanza `ArgumentError`
    dentro de un `after_create`, es decir, tumba la creación del gasto. Escapar como `%%`.
19. **`RegisterEdit.create` sin bang.** Si `audit_actor_id` devuelve `nil`, el `belongs_to :user`
    falla y la auditoría se pierde en silencio. Se conserva a propósito (cambiarlo a `create!`
    haría que un gasto no se pueda crear desde una rake task sin actor), pero hay que saberlo.
20. **La asociación colgante deja de reventar.** Con `.take&.attr`, un gasto con `cost_center_id`
    apuntando a nada ahora **se guarda** en vez de fallar dentro del callback. Es mejor, pero es un
    cambio de comportamiento: registros que antes se rechazaban ahora entran. Declarado como
    Asumido y cubierto por test.
21. **No migrar `CostCenter` al concern.** Tiene su propia variante (`user_id: User.current.id` sin
    guarda en tres sitios, id mágico `1` en dos) y está fuera de alcance por §5.3. Tocarlo
    duplicaría el tamaño del PR y el riesgo.
22. **El concern no debe volverse un mini-framework.** Su única razón de existir es que los ~10
    campos nuevos de los paquetes siguientes no se escriban tres veces. Cualquier opción que no
    necesite ninguno de los 13 campos actuales **no se agrega**.

---

## Decisiones asumidas

- **Asumido:** se usan `extension_allowlist` / `content_type_allowlist` / `size_range` (API de
  CarrierWave 3.x) y no `extension_whitelist` / `content_type_whitelist` como decía el enunciado
  del paquete: esos métodos ya no existen en la 3.1.2 instalada y declararlos sería código muerto.
- **Asumido:** listas permisivas para los tres uploaders de documentos (PDF + imágenes + Office),
  restrictivas para avatar (solo imágenes).
- **Asumido:** `AWS_REGION` con default `us-east-1` para no cambiar el comportamiento actual si el
  bucket ya está allí.
- **Asumido:** `search` **no** conserva compatibilidad con la firma posicional. Una llamada vieja
  lanza `ArgumentError` en vez de fallar en silencio, y los 6 call sites se migran en el mismo PR.
- **Asumido:** se agrega `.to_s` antes de `.downcase` en los dos filtros LIKE (hoy un no-String
  revienta).
- **Asumido:** la resolución de asociaciones en el concern usa `&.` y renderiza vacío en vez de
  lanzar `NoMethodError` cuando la FK está colgada.
- **Asumido:** los `puts` de depuración de los tres métodos de auditoría se eliminan; los de
  `ReportExpense.import` se dejan (otro alcance).
- **Asumido:** el bloque A no borra ni limpia las columnas de archivo de las filas históricas cuyo
  objeto se perdió; se documenta como hallazgo.
- **Asumido:** este paquete **no tiene E2E propios**. Los specs funcionales de Playwright son del
  paquete 12 (§7.2); la red de este paquete son sus 73 tests de Minitest.

---

## Discrepancias con la arquitectura

> **Estado tras la auditoría:** las discrepancias 1 y 2 **quedaron RESUELTAS a favor de este
> paquete** y ya están incorporadas al documento base: §4.7 fue reescrita ("`RegisterAuditable` es
> la única forma de auditar `ReportExpense`") y §4.8 + §7.2 fijan al paquete 03 como dueño único de
> `config/initializers/carrierwave.rb` y de los 4 uploaders existentes. Se conservan abajo como
> registro del razonamiento; **ya no hay ninguna acción pendiente sobre el documento base**.

1. **§4.7 dice "se mantiene el patrón existente: cada modelo escribe su propio HTML en
   `create_create_register` / `create_edit_register` / `create_destroy_register`".** Este paquete
   hace lo contrario para `ReportExpense`: extrae los tres métodos a `RegisterAuditable`.

   Por qué la arquitectura se queda corta aquí, no por qué nos desviamos en silencio: los paquetes
   de Presupuesto, Multimoneda y Contabilidad agregan entre los tres **10 columnas visibles**
   (`budget_status`, `budget_reason`, `expense_budget_id`, `currency`, `foreign_value`,
   `foreign_tax`, `foreign_total`, `exchange_rate`, `accounting_approved`, `receipt_file`).
   Con el patrón actual eso son **30 bloques de HTML escritos a mano** repartidos en tres métodos
   de un modelo que ya tiene 200 líneas de auditoría, en tres PRs distintos y por tres agentes
   distintos. La probabilidad de que los tres métodos queden desalineados es 1.

   **Lo que NO cambia respecto de §4.7**: el patrón sigue siendo "el modelo escribe su HTML en
   `RegisterEdit.description`", el typo `"Gatos"` se conserva, los nombres legibles siguen siendo
   `code`/`names`/`name`, el umbral 59 sigue siendo 59, y el formato guardado es **byte a byte el
   mismo** (14 tests golden lo garantizan). Cambia dónde vive el código, no lo que produce.

   **Alcance del cambio**: solo `ReportExpense`. `CostCenter` y los demás modelos con el mismo
   patrón **no se tocan**. `ExpenseBudget` (paquete de Presupuesto) *puede* usar el concern con
   `module_name: "Presupuesto"`, pero no está obligado: si su autor prefiere escribir los tres
   métodos a mano, el concern no se lo impide.

   **Acción pedida**: ~~actualizar §4.7 de `00-ARQUITECTURA.md`~~ — **YA HECHA por la auditoría**:
   §4.7 está reescrita y declara además que el paquete 03 es dependencia dura de 04 y 06.

2. **§4.8 decía "Los 4 uploaders existentes se corrigen en el mismo paquete" (el de Comprobante).**
   **RESUELTO por la auditoría**: §4.8 y §7.2 asignan los 4 uploaders y
   `config/initializers/carrierwave.rb` al **paquete 03** como dueño único; el 06 los quita de su
   tabla "A modificar" y su criterio 3 pasa a "verificar que el 03 los dejó así".
   `ReceiptUploader` sigue siendo del paquete 06.

3. **§4.6 muestra la firma `def self.search(filters = {})` sin listar las claves.** Este paquete
   fija `ReportExpense::SEARCH_KEYS` como la lista canónica de 15 símbolos y exige que todo filtro
   nuevo se agregue ahí. No es una desviación, es la parte que faltaba concretar.
