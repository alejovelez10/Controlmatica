# Integración MCP — Controlmatica ⇄ Taimes

Guía para que **Taimes** consuma el servidor **MCP** (Model Context Protocol) de
**Controlmatica** y un agente pueda operar toda la aplicación por chat web / WhatsApp.

> Generado automáticamente desde `tools/list` del servidor. **62 tools** disponibles.
> Alcance actual: **solo lectura y creación** (list / get / create + búsqueda y agregación).
> Editar y eliminar están deshabilitados por ahora.

---

## 0. Quick start (TL;DR)

1. **Endpoint:** `POST https://<host-controlmatica>/mcp` — protocolo MCP sobre JSON-RPC 2.0.
2. **Auth:** header `X-Api-Key: <MCP_API_KEY>` en cada request.
3. **Descubrir:** `{"jsonrpc":"2.0","id":1,"method":"tools/list"}` → devuelve las 62 tools con su schema.
4. **Ejecutar:** `{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"<tool>","arguments":{...}}}`.
5. **Leer resultado:** el JSON útil viene como string en `result.content[0].text`.
6. **Regla para el agente:** casi todo se resuelve con `records_search` (buscar cualquier registro
   por cualquier campo) y `records_aggregate` (totales/conteos); usa los `*_create` para dar de alta.

---

## 1. Datos de conexión

| Campo | Valor |
|---|---|
| **Endpoint** | `POST https://<host-controlmatica>/mcp` |
| **Transporte** | Streamable HTTP (JSON-RPC 2.0), **stateless** |
| **Protocolo** | MCP (SDK oficial `mcp` de Ruby) |
| **Autenticación** | Header `X-Api-Key: <token>` en **cada** request |
| **Headers** | `Content-Type: application/json`, `Accept: application/json, text/event-stream` |

### Autenticación

Controlmatica es **single-tenant** (el multi-tenant lo maneja Taimes). La autenticación
es un **secreto compartido**: el mismo `X-Api-Key` para todas las llamadas, configurado
en Controlmatica como la variable de entorno `MCP_API_KEY`. Taimes debe enviarlo en el
header `X-Api-Key`. Sin un key válido, cada tool responde
`"Unauthorized: invalid or missing X-Api-Key"`.

---

## 2. Pasos para consumirlo desde Taimes

1. **Registrar el MCP server** (super-admin → MCP Servers): nombre `controlmatica`,
   url `https://<host-controlmatica>/mcp`, transport `streamable_http`.
2. **Asignar el server al tenant** correspondiente (auth_mode `shared`).
3. **Cargar la credencial**: el `X-Api-Key` (= `MCP_API_KEY`) como
   `integration_credential(provider='controlmatica')`.
4. **Sync tools**: botón "Sync tools" → puebla la tabla `tools` con las 62
   descubiertas. (Los grants se resuelven **por nombre de tool**, no por UUID — los UUID
   difieren entre dev/prod.)
5. **Crear skills** que granteen las tools por nombre, agrupadas por módulo (ver catálogo).
   Sugerencia de skills: "Centros de Costo", "Materiales y Compras", "Reportes",
   "Facturación", "Comisiones", "Búsqueda y Reportes" (records_search + records_aggregate).
6. **Crear el agente**, asignarle las skills y dar membership al usuario. Listo para chat.

### Agrupación de skills sugerida

| Skill | Tools a grantear |
|---|---|
| **Búsqueda y Reportes** (base, recomendada) | `records_search`, `records_aggregate` |
| **Centros de Costo** | `cost_centers_list`, `cost_centers_get`, `cost_centers_create` |
| **Clientes y Contactos** | `customers_list/get/create`, `contacts_list/get/create` |
| **Proveedores** | `providers_list/get/create` |
| **Materiales y Compras** | `materials_list/get/create`, `material_invoices_list/get/create` |
| **Contratistas** | `contractors_list/get/create` |
| **Reportes de servicio** | `reports_list/get/create`, `customer_reports_list/get/create` |
| **Facturación** | `sales_orders_list/get/create`, `customer_invoices_list/get/create` |
| **Gastos y Anticipos** | `report_expenses_list/get/create`, `expense_ratios_list/get/create`, `report_expense_options_list` |
| **Gastos IA** (WhatsApp: foto/voz → gasto) | `report_expenses_list/get/create`, `report_expenses_receipt_url_get`, `report_expenses_attach_receipt`, `expense_budgets_list`, `expense_budgets_available`, `exchange_rates_get`, `expense_rules_validate`, `expense_rules_list`, `users_find_by_phone`, `report_expense_options_list`, `cost_centers_list` |
| **Comisiones** | `commissions_list/get/create` |
| **Turnos** | `shifts_list/get/create` |
| **Catálogos** (lookup) | `users_list/get`, `rols_list`, `parameterizations_list`, `quotations_list`, `notification_alerts_list` |

> Puedes empezar con solo **"Búsqueda y Reportes"** (cubre consultas de todo el sistema) y
> sumar las skills de creación módulo por módulo.

---

## 3. Protocolo (ejemplos con curl)

**Listar tools:**
```bash
curl -sS -X POST https://<host>/mcp \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -H 'X-Api-Key: <TOKEN>' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

**Ejecutar una tool** (`method: "tools/call"`, `params.name` + `params.arguments`):
```bash
curl -sS -X POST https://<host>/mcp \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -H 'X-Api-Key: <TOKEN>' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call",
       "params":{"name":"cost_centers_list","arguments":{"limit":5}}}'
```

**Respuesta** (formato MCP): el contenido útil viene en `result.content[0].text`,
siempre como **JSON string** (nunca objetos crudos). Ej:
```json
{"jsonrpc":"2.0","id":1,"result":{"content":[{"type":"text",
  "text":"[{\"id\":10647,\"code\":\"CC-0046\", ...}]"}],"isError":false}}
```

---

## 4. Búsqueda y agregación potente (lo más útil para el agente)

Además del CRUD por módulo, dos tools genéricas cubren **cualquier** entidad:

- **`records_search`** — busca por cualquier campo con operadores
  (`eq, ne, gt, gte, lt, lte, like, starts_with, ends_with, in, nin, null, between`),
  texto libre `q`, `sort`, `limit`/`offset`, `count_only` y selección de `fields`.
  ```json
  {"name":"records_search","arguments":{
    "entity":"customer_invoices",
    "filters":{"invoice_value":{"gte":1000000},"invoice_date":{"between":["2026-01-01","2026-06-30"]}},
    "sort":"-invoice_value","limit":20}}
  ```
- **`records_aggregate`** — `count/sum/avg/min/max` con `group_by`.
  ```json
  {"name":"records_aggregate","arguments":{
    "entity":"customer_invoices","metric":"sum","field":"invoice_value","group_by":"cost_center_id"}}
  ```

Entidades válidas (`entity`): cost_centers, customers, contacts, providers, materials,
contractors, reports, sales_orders, customer_invoices, material_invoices, report_expenses,
shifts, expense_ratios, customer_reports, commissions, quotations, users,
notification_alerts, parameterizations, rols, report_expense_options.

---

## 5. Notas de comportamiento

- **Escrituras:** el "actor" de la operación es la **persona real** identificada por
  `X-Actor-Phone` o `X-Actor-Email` (ver §5.1). En las tools de gasto y anticipo, si no se
  identifica a nadie la llamada se **rechaza**; ya **no** se cae al Administrador genérico.
  En las **lecturas** sí se mantiene el fallback (no hay nada que atribuir).
- **Errores de validación** se devuelven como texto `"Error: <mensajes>"` (no rompen la
  llamada). Argumentos inválidos de schema los rechaza el propio protocolo MCP.
- **Multi-tenant:** no aplica del lado Controlmatica (una sola empresa). Taimes gestiona
  la separación por tenant y credenciales.
- **Convención de nombres:** `<modulo>_<accion>` (ej. `cost_centers_create`, `reports_list`, `materials_get`).
- **Alcance actual:** por ahora se exponen solo tools de **lectura y creación** (list/get/create)
  más `records_search`/`records_aggregate` y las acciones de dominio explícitamente listadas
  (`expense_budgets_available`, `expense_rules_validate`, `report_expenses_attach_receipt`,
  `users_find_by_phone`). Las de editar/eliminar no están disponibles.

---

## 5.1 Identificación del actor (quién reporta el gasto)

Controlmatica necesita saber **a nombre de quién** queda cada gasto. Taimes lo dice con dos
headers, que se envían en **cada** request:

| Header | Valor | Cuándo |
|---|---|---|
| `X-Actor-Phone` | El número de WhatsApp del remitente, en cualquier formato (`+57 300 123 4567`, `3001234567`, `whatsapp:+573001234567`) | Canal WhatsApp |
| `X-Actor-Email` | El correo del usuario de Taimes | Canal web |

Reglas, en este orden:

1. Si llega `X-Actor-Email` y coincide con un usuario, ese es el actor.
2. Si no, se normaliza `X-Actor-Phone` (**últimos 10 dígitos**, para absorber el `+57` y el
   prefijo `whatsapp:`) y se busca en `users.phone_normalized`.
3. **Si el número está registrado en DOS usuarios, no se identifica a nadie.** Dos
   coincidencias significan cero actor, nunca "el primero": atribuirle el gasto a uno de dos
   personas que comparten línea es peor que no registrarlo.
4. Sin actor y sin `user_invoice_id` explícito, estas tools **rechazan y no crean nada**:
   `report_expenses_create`, `expense_ratios_create`, `report_expenses_attach_receipt` y
   `expense_budgets_available`. El texto de respuesta contiene *"no se pudo identificar a la
   persona que reporta"*.

Diagnóstico: `users_find_by_phone` dice si un número resuelve, no resuelve (`no_match`) o está
repetido (`ambiguous`). Es la tool que usa soporte cuando alguien reporta "el bot no me deja
registrar".

> **Precondición operativa:** `users.phone` tiene que estar **poblado**. Si está vacío, en modo
> estricto todo gasto por WhatsApp se rechaza. La carga inicial es una tarea de datos, no de
> código.

**Válvula de reversión:** `MCP_STRICT_EXPENSE_ACTOR=false` restaura el comportamiento anterior
(fallback al Administrador) **sin desplegar código**. Por defecto —variable ausente— el modo es
estricto. Existe para poder revertir en caliente si Taimes todavía no envía los headers.

---

## 5.2 Adjuntar comprobantes (3 pasos)

El binario **no viaja por MCP**: una foto de factura de 3 MB son ~4 MB de base64 dentro del
contexto del modelo. El agente pide una URL firmada, sube el archivo directo a S3 y confirma.

```bash
# 1) URL firmada (el gasto YA tiene que existir: no hay comprobantes huérfanos)
curl -sS -X POST https://<host>/mcp \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -H "X-Api-Key: $MCP_API_KEY" -H "X-Actor-Phone: +573001234567" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{
        "name":"report_expenses_receipt_url_get",
        "arguments":{"report_expense_id":8813,"filename":"factura.pdf",
                     "content_type":"application/pdf","byte_size":184320}}}'
# -> { "upload_url": "...", "upload_key": "uploads/tmp/mcp_receipts/<uuid>/factura.pdf",
#      "method":"PUT", "headers":{"Content-Type":"application/pdf"} }

# 2) PUT directo a S3, SIN cabecera de autorización y con EXACTAMENTE ese Content-Type
curl -sS -X PUT --upload-file factura.pdf \
  -H 'Content-Type: application/pdf' "<upload_url>"

# 3) Asociar el archivo al gasto
curl -sS -X POST https://<host>/mcp \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -H "X-Api-Key: $MCP_API_KEY" -H "X-Actor-Phone: +573001234567" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{
        "name":"report_expenses_attach_receipt",
        "arguments":{"report_expense_id":8813,
                     "upload_key":"uploads/tmp/mcp_receipts/<uuid>/factura.pdf"}}}'
```

Detalles que evitan horas perdidas:

- El `Content-Type` del PUT debe ser **byte a byte** el que se firmó, o S3 responde
  `403 SignatureDoesNotMatch` y el mensaje no explica nada.
- La URL firmada dura **15 minutos**. Máximo **10 MB**. Extensiones: jpg, jpeg, png, webp,
  heic, pdf.
- Solo se aceptan `upload_key` emitidas por `report_expenses_receipt_url_get`. Cualquier otra
  ruta del bucket se rechaza: es un control de seguridad, no un formato.
- Alternativa sin S3 (o archivos pequeños): `file_base64` + `filename` + `content_type`,
  máximo 4 MB codificados. Si llegan los dos, gana `upload_key`.
- **Camino recomendado para el agente de WhatsApp de Taimes (2026-08-17): `file_url`.** El
  agente no puede hacer un PUT a S3; lo que sí tiene es la URL firmada de Google Cloud Storage
  que mintea su tool `get_attachment_url` **en el mismo turno**. Se la pasa en `file_url`
  (junto con `filename`) y el servidor la descarga: solo se aceptan hosts
  `storage.googleapis.com` / `storage.cloud.google.com` (allowlist, SSRF), https, sin
  redirects, máximo 10 MB. Precedencia: `upload_key` > `file_url` > `file_base64`. Si la URL
  expiró, el error le pide al agente mintear una nueva con `get_attachment_url`.
- `receipt_file_url` es una URL **firmada y de corta duración**. El agente no debe guardarla ni
  reenviarla de conversaciones viejas: cuando la necesite, vuelve a llamar a
  `report_expenses_get`.

---

## 6. Playbook del agente (petición → tools)

Ejemplos de cómo un agente resuelve peticiones típicas del chat:

| El usuario pide… | Tool(s) a usar | Ejemplo de `arguments` |
|---|---|---|
| "Busca el centro de costo CC-0099" | `records_search` | `{"entity":"cost_centers","filters":{"code":"CC-0099"}}` |
| "¿Cuánto llevamos facturado este año?" | `records_aggregate` | `{"entity":"customer_invoices","metric":"sum","field":"invoice_value","filters":{"invoice_date":{"gte":"2026-01-01"}}}` |
| "Facturación por centro de costo" | `records_aggregate` | `{"entity":"customer_invoices","metric":"sum","field":"invoice_value","group_by":"cost_center_id"}` |
| "¿Cuántos proyectos hay en ejecución?" | `records_aggregate` | `{"entity":"cost_centers","metric":"count","group_by":"execution_state"}` |
| "Muéstrame el cliente con NIT 805757055" | `records_search` | `{"entity":"customers","filters":{"nit":"805757055"}}` |
| "Detalle del centro de costo 10647" | `cost_centers_get` | `{"id":10647}` |
| "Crea un cliente llamado ACME" | `customers_create` | `{"name":"ACME"}` |
| "Registra una compra de $500.000 al proveedor 204 en el centro 10647" | `materials_create` | `{"cost_center_id":10647,"provider_id":204,"amount":500000}` |
| "Crea un reporte de servicio hoy en el centro 10647" | `reports_create` | `{"cost_center_id":10647,"customer_id":88,"report_execute_id":1,"report_date":"2026-07-14"}` |
| "Lista los últimos 10 gastos del centro 10647" | `report_expenses_list` | `{"cost_center_id":10647,"limit":10}` |

**Patrón recomendado:** para *encontrar* algo → `records_search`; para *números/totales* →
`records_aggregate`; para *ver el detalle completo* de un registro → `<modulo>_get`; para *dar de
alta* → `<modulo>_create`. Antes de crear, usa las tools de lookup (`users_list`, `providers_list`,
`report_expense_options_list`, etc.) para obtener los IDs válidos.

---

## 7. Catálogo completo de tools (62)

> Los parámetros `server_context` son internos (no se envían): la autenticación va por el
> header `X-Api-Key`. Cada tool recibe únicamente los parámetros listados en `arguments`.

### Búsqueda y agregación genérica (recomendado para el agente)

#### `records_aggregate`

Calcula agregados sobre cualquier módulo. Parámetros:
- entity: el módulo (mismos que records_search).
- metric: count | sum | avg | min | max.
- field: columna numérica sobre la que se calcula (requerida salvo en count).
- group_by: columna por la que agrupar (opcional). Si se da, devuelve un array
  [{group: <valor>, value: <agregado>}, ...] ordenado desc por valor.
- filters / q: mismos filtros y operadores que records_search.
- limit: máximo de grupos a devolver (default 100).
Ej: entity="customer_invoices", metric="sum", field="invoice_value", group_by="cost_center_id".
Ej: entity="cost_centers", metric="count", group_by="execution_state".

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `entity` | string | ✔ | Módulo (ver records_search) |
| `metric` | enum(count, sum, avg, min, max) | ✔ | count \| sum \| avg \| min \| max |
| `field` | string |  | Columna numérica a agregar (requerida salvo en count) |
| `group_by` | string |  | Columna por la que agrupar (opcional) |
| `filters` | object |  | Filtros (mismos operadores que records_search) |
| `q` | string |  | Texto libre |
| `limit` | integer |  | Máximo de grupos (default 100, máx 500) |

#### `records_search`

Búsqueda potente de registros en cualquier módulo. Parámetros:
- entity: el módulo (ver enum).
- filters: objeto campo:condición. La condición puede ser un valor simple (texto = LIKE
  parcial; id/número/fecha/booleano = exacto), un array (IN), o un objeto de operadores:
  eq, ne/not, gt, gte, lt, lte, like, starts_with, ends_with, in, nin, null (bool),
  between [a,b]. Ej: {"invoice_value":{"gte":100000},"invoice_date":{"between":["2026-01-01","2026-06-30"]}}.
- q: texto libre; busca en TODAS las columnas de texto de la entidad.
- sort: campo(s) de orden. "campo" asc, "-campo" desc, o lista "-created_at,name".
- limit (default 50, máx 500) y offset para paginar.
- count_only: si true, devuelve solo {count: N} (no trae registros).
- fields: array de columnas a devolver (por defecto un set representativo por entidad).
Ej: entity="cost_centers", filters={"code":"CC-0099"}; entity="customer_invoices",
filters={"invoice_value":{"gte":1000000}}, sort="-invoice_value".

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `entity` | enum(cost_centers, customers, contacts, providers, materials, contractors, reports, sales_orders, customer_invoices, material_invoices, report_expenses, shifts, expense_ratios, customer_reports, commissions, quotations, users, notification_alerts, parameterizations, rols, report_expense_options, expense_budgets, exchange_rates) | ✔ | Módulo a buscar |
| `filters` | object |  | Campo:condición (valor, array=IN, u objeto de operadores) |
| `q` | string |  | Texto libre sobre todas las columnas de texto |
| `sort` | string |  | Orden: "campo", "-campo" (desc), o lista separada por comas |
| `limit` | integer |  | Máximo de resultados (default 50, máx 500) |
| `offset` | integer |  | Desplazamiento para paginación (default 0) |
| `count_only` | boolean |  | Si true, devuelve solo {count: N} |
| `fields` | array<string> |  | Columnas a devolver (opcional) |


### Centros de Costo (proyectos/servicios)

#### `cost_centers_create`

Crea un centro de costo (proyecto/servicio). Requiere customer_id, description y service_type. Los campos numéricos son opcionales (default 0). Devuelve el registro creado o los errores de validación. Usa customers_list para obtener customer_id válidos.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `customer_id` | integer | ✔ | ID del cliente (requerido) |
| `description` | string | ✔ | Descripción del proyecto/servicio |
| `service_type` | string | ✔ | PROYECTO o SERVICIO |
| `contact_id` | integer |  | ID del contacto (opcional) |
| `quotation_number` | string |  | Número de cotización (opcional) |
| `start_date` | string |  | Fecha inicio YYYY-MM-DD (opcional) |
| `end_date` | string |  | Fecha fin YYYY-MM-DD (opcional) |
| `eng_hours` | number |  | Horas de ingeniería (default 0) |
| `hour_real` | number |  | Valor hora costo (default 0) |
| `hour_cotizada` | number |  | Valor hora cotizada (default 0) |
| `hours_contractor` | number |  | Horas tablerista/contratista (default 0) |
| `hours_contractor_real` | number |  | Valor hora contratista costo (default 0) |
| `hours_contractor_invoices` | number |  | Valor hora contratista cotizada (default 0) |
| `displacement_hours` | number |  | Horas de desplazamiento (default 0) |
| `materials_value` | number |  | Valor de materiales (default 0) |
| `viatic_value` | number |  | Valor viáticos (default 0) |

#### `cost_centers_get`

Obtiene el detalle de un centro de costo por su ID, incluyendo métricas (horas, valores) y conteos de reportes, materiales, contratistas, órdenes y facturas.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `id` | integer | ✔ | ID del centro de costo |

#### `cost_centers_list`

Lista centros de costo (proyectos/servicios) con filtros opcionales: descripción, cliente, estado de ejecución, estado de facturación, tipo de servicio, rango de fechas de inicio y número de cotización. Devuelve hasta `limit` resultados.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `description` | string |  | Texto a buscar en la descripción |
| `customer_id` | integer |  | ID del cliente |
| `execution_state` | string |  | Estado de ejecución (ej. EN EJECUCION, FINALIZADO) |
| `invoiced_state` | string |  | Estado de facturación |
| `service_type` | string |  | Tipo (PROYECTO / SERVICIO) |
| `date_from` | string |  | Fecha de inicio desde (YYYY-MM-DD) |
| `date_to` | string |  | Fecha de inicio hasta (YYYY-MM-DD) |
| `quotation_number` | string |  | Número de cotización |
| `limit` | integer |  | Máximo de resultados (default 50, máx 200) |


### Clientes

#### `customers_create`

Crea un cliente. Requiere name. Devuelve el cliente creado o errores de validación.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `name` | string | ✔ | Nombre / razón social (requerido) |
| `client` | string |  | Nombre comercial (opcional) |
| `code` | string |  | Código del cliente (opcional) |
| `nit` | string |  | NIT (opcional) |
| `phone` | string |  | Teléfono (opcional) |
| `email` | string |  | Email (opcional) |
| `web` | string |  | Sitio web (opcional) |
| `address` | string |  | Dirección (opcional) |

#### `customers_get`

Obtiene un cliente por ID, con sus contactos y conteo de proyectos/reportes.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `id` | integer | ✔ | ID del cliente |

#### `customers_list`

Lista clientes. Filtro opcional `q` (busca en nombre/código/nit/email). Devuelve hasta `limit` resultados (default 50, máx 200).

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `q` | string |  | Texto a buscar (nombre, código, nit, email) |
| `limit` | integer |  | Máximo de resultados (default 50, máx 200) |


### Contactos

#### `contacts_create`

Crea un contacto. Requiere name. Asócialo a un cliente (customer_id) y/o proveedor (provider_id).

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `name` | string | ✔ | Nombre del contacto (requerido) |
| `email` | string |  | Email (opcional) |
| `phone` | string |  | Teléfono (opcional) |
| `position` | string |  | Cargo (opcional) |
| `customer_id` | integer |  | ID del cliente (opcional) |
| `provider_id` | integer |  | ID del proveedor (opcional) |

#### `contacts_get`

Obtiene un contacto por ID.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `id` | integer | ✔ | ID del contacto |

#### `contacts_list`

Lista contactos. Filtros opcionales: customer_id, provider_id, q (nombre/email). Devuelve hasta `limit` resultados.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `customer_id` | integer |  | Filtra por cliente |
| `provider_id` | integer |  | Filtra por proveedor |
| `q` | string |  | Texto en nombre o email |
| `limit` | integer |  | Máximo de resultados (default 50, máx 200) |


### Proveedores

#### `providers_create`

Crea un proveedor. Requiere name. Devuelve el proveedor creado o errores.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `name` | string | ✔ | Nombre / razón social (requerido) |
| `nit` | string |  | NIT (opcional) |
| `phone` | string |  | Teléfono (opcional) |
| `email` | string |  | Email (opcional) |
| `web` | string |  | Sitio web (opcional) |
| `address` | string |  | Dirección (opcional) |

#### `providers_get`

Obtiene un proveedor por ID, con sus contactos.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `id` | integer | ✔ | ID del proveedor |

#### `providers_list`

Lista proveedores. Filtro opcional `q` (nombre/nit/email). Devuelve hasta `limit` resultados.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `q` | string |  | Texto a buscar |
| `limit` | integer |  | Máximo de resultados (default 50, máx 200) |


### Materiales / Compras

#### `materials_create`

Crea un material/compra en un centro de costo. Requiere cost_center_id y provider_id. amount default 0. Recalcula automáticamente los totales del centro de costo.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `cost_center_id` | integer | ✔ | ID del centro de costo (requerido) |
| `provider_id` | integer | ✔ | ID del proveedor (requerido) |
| `amount` | number |  | Valor de la compra (default 0) |
| `sales_number` | string |  | Número de orden (opcional) |
| `sales_date` | string |  | Fecha de orden YYYY-MM-DD (opcional) |
| `delivery_date` | string |  | Fecha estimada de entrega YYYY-MM-DD (opcional) |
| `description` | string |  | Descripción (opcional) |
| `sales_state` | string |  | Estado de compra (opcional) |

#### `materials_get`

Obtiene un material/compra por ID, con sus facturas de proveedor.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `id` | integer | ✔ | ID del material |

#### `materials_list`

Lista materiales/compras. Filtros opcionales: cost_center_id, provider_id, q (descripción), sales_state. Devuelve hasta `limit` resultados.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `cost_center_id` | integer |  | Filtra por centro de costo |
| `provider_id` | integer |  | Filtra por proveedor |
| `q` | string |  | Texto en la descripción |
| `sales_state` | string |  | Estado de compra |
| `limit` | integer |  | Máximo de resultados (default 50, máx 200) |


### Contratistas / Tableristas (horas)

#### `contractors_create`

Registra horas de contratista/tablerista en un centro de costo. Requiere cost_center_id, user_execute_id y hours. El valor (ammount) se calcula como horas × valor hora del centro.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `cost_center_id` | integer | ✔ | ID del centro de costo (requerido) |
| `user_execute_id` | integer | ✔ | ID del usuario que ejecuta las horas (requerido) |
| `hours` | number | ✔ | Horas trabajadas (requerido) |
| `sales_number` | string |  | Número/consecutivo (opcional) |
| `sales_date` | string |  | Fecha YYYY-MM-DD (opcional) |
| `description` | string |  | Descripción (opcional) |

#### `contractors_get`

Obtiene un registro de contratista/tablerista por ID.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `id` | integer | ✔ | ID del registro de contratista |

#### `contractors_list`

Lista registros de contratistas/tableristas (horas). Filtros opcionales: cost_center_id, user_execute_id, q (descripción). Devuelve hasta `limit` resultados.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `cost_center_id` | integer |  | Filtra por centro de costo |
| `user_execute_id` | integer |  | Filtra por usuario que ejecuta las horas |
| `q` | string |  | Texto en la descripción |
| `limit` | integer |  | Máximo de resultados (default 50, máx 200) |


### Reportes de servicio

#### `reports_create`

Crea un reporte de servicio en un centro de costo. Requiere cost_center_id, customer_id, report_execute_id y report_date (YYYY-MM-DD). working_value/total_value se calculan a partir de working_time × valor hora del centro. viatic_value y displacement_hours default 0.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `cost_center_id` | integer | ✔ | ID del centro de costo (requerido) |
| `customer_id` | integer | ✔ | ID del cliente (requerido) |
| `report_execute_id` | integer | ✔ | ID del usuario que ejecuta (requerido) |
| `report_date` | string | ✔ | Fecha del reporte YYYY-MM-DD (requerido) |
| `contact_id` | integer |  | ID del contacto (opcional) |
| `working_time` | number |  | Horas trabajadas (default 0) |
| `displacement_hours` | number |  | Horas de desplazamiento (default 0) |
| `viatic_value` | number |  | Valor viáticos (default 0) |
| `work_description` | string |  | Descripción del trabajo (opcional) |
| `viatic_description` | string |  | Descripción de viáticos (opcional) |

#### `reports_get`

Obtiene un reporte de servicio por ID.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `id` | integer | ✔ | ID del reporte |

#### `reports_list`

Lista reportes de servicio. Filtros opcionales: cost_center_id, customer_id, report_execute_id, q (descripción de trabajo). Devuelve hasta `limit` resultados.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `cost_center_id` | integer |  | Filtra por centro de costo |
| `customer_id` | integer |  | Filtra por cliente |
| `report_execute_id` | integer |  | Filtra por usuario que ejecuta |
| `q` | string |  | Texto en la descripción del trabajo |
| `limit` | integer |  | Máximo de resultados (default 50, máx 200) |


### Órdenes de compra/venta

#### `sales_orders_create`

Crea una orden de compra/venta en un centro de costo. Requiere cost_center_id. order_value default 0. Recalcula el estado de facturación del centro de costo.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `cost_center_id` | integer | ✔ | ID del centro de costo (requerido) |
| `order_number` | string |  | Número de orden (opcional) |
| `order_value` | number |  | Valor de la orden (default 0) |
| `created_date` | string |  | Fecha de la orden YYYY-MM-DD (opcional) |
| `state` | string |  | Estado (opcional) |
| `description` | string |  | Descripción (opcional) |

#### `sales_orders_get`

Obtiene una orden de compra/venta por ID, con sus facturas de cliente.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `id` | integer | ✔ | ID de la orden |

#### `sales_orders_list`

Lista órdenes de compra/venta. Filtros opcionales: cost_center_id, state, q (número/descripción). Devuelve hasta `limit` resultados.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `cost_center_id` | integer |  | Filtra por centro de costo |
| `state` | string |  | Estado de la orden |
| `q` | string |  | Texto en número de orden o descripción |
| `limit` | integer |  | Máximo de resultados (default 50, máx 200) |


### Facturas de cliente

#### `customer_invoices_create`

Crea una factura de cliente contra una orden. Requiere cost_center_id, sales_order_id e invoice_value. Recalcula el estado de facturación del centro de costo.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `cost_center_id` | integer | ✔ | ID del centro de costo (requerido) |
| `sales_order_id` | integer | ✔ | ID de la orden (requerido) |
| `invoice_value` | number | ✔ | Valor de la factura (requerido) |
| `engineering_value` | number |  | Valor de ingeniería (default 0) |
| `invoice_date` | string |  | Fecha de la factura YYYY-MM-DD (opcional) |
| `number_invoice` | string |  | Número de factura (opcional) |
| `invoice_state` | string |  | Estado (opcional) |

#### `customer_invoices_get`

Obtiene una factura de cliente por ID.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `id` | integer | ✔ | ID de la factura |

#### `customer_invoices_list`

Lista facturas de cliente. Filtros opcionales: cost_center_id, sales_order_id, invoice_state. Devuelve hasta `limit` resultados.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `cost_center_id` | integer |  | Filtra por centro de costo |
| `sales_order_id` | integer |  | Filtra por orden |
| `invoice_state` | string |  | Estado de la factura |
| `limit` | integer |  | Máximo de resultados (default 50, máx 200) |


### Facturas de proveedor (materiales)

#### `material_invoices_create`

Registra una factura de proveedor sobre un material. Requiere material_id y value. Actualiza el valor facturado del material.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `material_id` | integer | ✔ | ID del material (requerido) |
| `value` | number | ✔ | Valor de la factura (requerido) |
| `number` | string |  | Número de factura (opcional) |
| `observation` | string |  | Observación (opcional) |

#### `material_invoices_get`

Obtiene una factura de proveedor (de material) por ID.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `id` | integer | ✔ | ID de la factura de material |

#### `material_invoices_list`

Lista facturas de proveedor asociadas a materiales. Filtro opcional material_id. Devuelve hasta `limit` resultados.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `material_id` | integer |  | Filtra por material |
| `limit` | integer |  | Máximo de resultados (default 50, máx 200) |


### Gastos / Legalizaciones

#### `report_expenses_create`

Registra un gasto/legalización en un centro de costo. Requiere cost_center_id. El gasto queda
SIEMPRE a nombre de la persona identificada por `X-Actor-Phone` o `X-Actor-Email`; si no se
identifica a nadie y no se indica `user_invoice_id` explícito, la tool **rechaza y no registra
nada**. Antes de llamarla, valida con `expense_rules_validate`.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `cost_center_id` | integer | ✔ | ID del centro de costo (requerido) |
| `user_invoice_id` | integer |  | ID del usuario que reporta (por defecto, la persona del teléfono o correo) |
| `invoice_name` | string |  | Nombre/proveedor de la factura (opcional) |
| `invoice_number` | string |  | Número de factura (opcional) |
| `invoice_type` | string |  | Tipo de factura (opcional) |
| `invoice_date` | string |  | Fecha de la factura YYYY-MM-DD (opcional) |
| `invoice_value` | number |  | Valor base en COP (opcional) |
| `invoice_tax` | number |  | IVA en COP (opcional) |
| `invoice_total` | number |  | Total en COP (opcional) |
| `identification` | string |  | NIT/identificación (opcional) |
| `description` | string |  | Descripción (opcional) |
| `type_identification_id` | integer |  | ID de opción tipo de identificación (opcional) |
| `payment_type_id` | integer |  | ID de opción tipo de pago (opcional) |
| `currency` | string |  | Moneda ISO 4217. Válidas: COP, USD, EUR. Default COP |
| `foreign_value` | number |  | Valor base en la moneda del comprobante (solo si currency ≠ COP) |
| `foreign_tax` | number |  | Impuestos en la moneda del comprobante |
| `foreign_total` | number |  | Total en la moneda del comprobante |
| `exchange_rate` | number |  | Cuántos COP vale 1 unidad de `currency`. Pídela con `exchange_rates_get` |
| `exchange_rate_date` | string |  | Fecha de la tasa aplicada, YYYY-MM-DD. Normalmente = invoice_date |
| `confirm_rule_violations` | boolean |  | Solo `true` DESPUÉS de mostrarle las violaciones a la persona y de que confirme registrar igual |

**Campos que escribe el servidor y NO se pueden enviar** (se ignoran si llegan):
`budget_status`, `budget_reason`, `expense_budget_id`, `exchange_rate_source`,
`accounting_approved`, `accounting_approved_by_id`, `accounting_approved_at`, `is_acepted`,
`receipt_file`, `last_user_edited_id`, `rule_violations`.

La respuesta trae además `budget_message` (texto ya redactado en español sobre el resultado
presupuestal: repítelo tal cual) y `rule_violations`.

#### `report_expenses_get`

Obtiene un gasto/legalización por ID.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `id` | integer | ✔ | ID del gasto |

#### `report_expenses_list`

Lista gastos/legalizaciones de un centro de costo. Devuelve hasta `limit` resultados.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `cost_center_id` | integer |  | Filtra por centro de costo |
| `user_invoice_id` | integer |  | Filtra por usuario que reporta el gasto |
| `q` | string |  | Texto en nombre o descripción |
| `budget_status` | enum(sin_presupuesto, aprobado, excedido) |  | Estado presupuestal |
| `currency` | string |  | Moneda ISO 4217 del comprobante |
| `accounting_approved` | boolean |  | Filtra por aprobación contable |
| `date_from` | string |  | Fecha de factura desde, YYYY-MM-DD |
| `date_to` | string |  | Fecha de factura hasta, YYYY-MM-DD |
| `limit` | integer |  | Máximo de resultados (default 50, máx 200) |

Cada fila trae 28 campos, entre ellos `budget_status`, `budget_reason`, `expense_budget_id`,
los 7 de moneda, `accounting_approved` y `receipt_file_url`.


### Gastos IA (presupuesto, moneda, reglas y comprobantes)

> Estas 8 tools son las que usa el agente de WhatsApp. El orden de llamada y los guiones de
> conversación están en **`docs/TAIMES-AGENTE-GASTOS.md`**.

#### `users_find_by_phone`

Identifica a una persona por su teléfono (cualquier formato). Devuelve `found:false` con
`reason` = `invalid_phone` | `no_match` | `ambiguous`. **Nunca asumas una persona si `found` es
false.**

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `phone` | string | ✔ | Número de teléfono en cualquier formato |

#### `expense_budgets_available`

Presupuesto disponible de una persona en un centro: asignado, gastado y disponible, en COP.
Si se omite `user_id` usa la persona del actor. Usa el campo `message` tal cual: ya viene
formateado en pesos.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `cost_center_id` | integer | ✔ | ID del centro de costo |
| `user_id` | integer |  | ID de la persona (por defecto, el actor) |
| `exclude_expense_id` | integer |  | Gasto a excluir del gastado (al editar) |

#### `expense_budgets_list`

Partidas presupuestales de un centro y/o de una persona. Cada fila trae `assigned`, `spent` y
`available` del par (centro, persona). Los montos son strings decimales en COP.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `cost_center_id` | integer |  | Filtra por centro de costo |
| `user_id` | integer |  | Filtra por persona beneficiaria |
| `only_active` | boolean |  | Si true, solo partidas activas |
| `limit` | integer |  | Máximo de resultados (default 50, máx 200) |

#### `exchange_rates_get`

Tasa de cambio a COP para una moneda y una fecha. Si la fuente no tiene esa fecha devuelve la
del último día hábil anterior y lo indica en `rate_date` (distinto de `requested_date`).
**Si no hay tasa devuelve `Error:` — no inventes una tasa, pídesela a la persona.**

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `currency` | string | ✔ | Código ISO 4217. Válidos: COP, USD, EUR |
| `date` | string | ✔ | Fecha YYYY-MM-DD (normalmente la del comprobante) |

#### `expense_rules_validate`

Valida un gasto candidato contra las reglas de negocio y, opcionalmente, contra el presupuesto.
**No guarda nada.** Llámala siempre antes de `report_expenses_create`. Devuelve `ok`,
`blocking_count`, `warning_count`, `violations[]`, `agent_instructions`, `applied_rules` y
`budget`.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `cost_center_id` | integer | ✔ | ID del centro de costo |
| `user_invoice_id` | integer |  | Persona responsable (por defecto, el actor) |
| `invoice_name` / `identification` / `invoice_number` / `invoice_date` | string |  | Datos del comprobante |
| `invoice_value` / `invoice_tax` / `invoice_total` | number |  | Valores en COP |
| `currency` / `foreign_value` / `foreign_tax` / `foreign_total` / `exchange_rate` | — |  | Igual que en `report_expenses_create` |
| `description` | string |  | Descripción del gasto |
| `exclude_expense_id` | integer |  | Gasto que se está editando |
| `include_budget` | boolean |  | Incluir el bloque de presupuesto (default true) |

#### `expense_rules_list`

Reglas de gasto aplicables a una persona, con los límites ya resueltos (antigüedad máxima, tope
de valor, validación de duplicados) y las instrucciones en texto libre que escribió el
administrador. **El servidor no evalúa el texto: lo aplica el agente.**

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `user_id` | integer |  | ID de la persona (por defecto, el actor) |

#### `report_expenses_receipt_url_get`

Paso 1 de 2 del comprobante: URL firmada de S3 para subir el archivo con un PUT directo.
Ver §5.2.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `report_expense_id` | integer | ✔ | ID del gasto (tiene que existir) |
| `filename` | string | ✔ | Nombre con extensión: jpg, jpeg, png, webp, heic o pdf |
| `content_type` | string | ✔ | image/jpeg, image/png, image/webp, image/heic o application/pdf |
| `byte_size` | integer |  | Tamaño en bytes (máx 10485760) |

#### `report_expenses_attach_receipt`

Asocia al gasto su comprobante. Tres modos, en orden de precedencia: `upload_key` (flujo PUT de
§5.2), `file_url` (URL https firmada de GCS emitida por `get_attachment_url` en el mismo turno;
el servidor la descarga, máx 10 MB) y `file_base64` (máx 4 MB codificados, requiere `filename`
y `content_type`). Reemplaza el comprobante anterior.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `report_expense_id` | integer | ✔ | ID del gasto |
| `upload_key` | string |  | Clave devuelta por `report_expenses_receipt_url_get` |
| `file_url` | string |  | URL https firmada de storage.googleapis.com o storage.cloud.google.com (`get_attachment_url`); máx 10 MB |
| `file_base64` | string |  | Contenido del archivo en base64 |
| `filename` | string |  | Nombre del archivo (requerido con file_base64; recomendado con file_url) |
| `content_type` | string |  | MIME (requerido con file_base64; con file_url se deduce si falta) |


### Turnos / Agenda

#### `shifts_create`

Crea un turno/agenda. Requiere user_id, cost_center_id, start_date y end_date (datetime ISO8601).

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `user_id` | integer | ✔ | ID del usuario asignado (requerido) |
| `cost_center_id` | integer | ✔ | ID del centro de costo (requerido) |
| `start_date` | string | ✔ | Inicio (YYYY-MM-DD HH:MM o ISO8601) (requerido) |
| `end_date` | string | ✔ | Fin (YYYY-MM-DD HH:MM o ISO8601) (requerido) |
| `user_responsible_id` | integer |  | ID del usuario responsable (opcional) |
| `subject` | string |  | Asunto/título (opcional) |
| `description` | string |  | Descripción (opcional) |
| `color` | string |  | Color para el calendario (opcional) |

#### `shifts_get`

Obtiene un turno por ID.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `id` | integer | ✔ | ID del turno |

#### `shifts_list`

Lista turnos/agenda. Filtros opcionales: cost_center_id, user_id, y rango de fechas (date_from/date_to) por superposición. Devuelve hasta `limit` resultados.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `cost_center_id` | integer |  | Filtra por centro de costo |
| `user_id` | integer |  | Filtra por usuario asignado |
| `date_from` | string |  | Inicio del rango (YYYY-MM-DD) |
| `date_to` | string |  | Fin del rango (YYYY-MM-DD) |
| `limit` | integer |  | Máximo de resultados (default 50, máx 200) |


### Relaciones de gastos / Anticipos

#### `expense_ratios_create`

Crea una relación de gastos / anticipo. Requiere user_report_id y user_direction_id.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `user_report_id` | integer | ✔ | ID del usuario que reporta (requerido) |
| `user_direction_id` | integer | ✔ | ID del usuario de dirección (requerido) |
| `area` | string |  | Área (opcional) |
| `start_date` | string |  | Fecha inicio YYYY-MM-DD (opcional) |
| `end_date` | string |  | Fecha fin YYYY-MM-DD (opcional) |
| `creation_date` | string |  | Fecha de creación YYYY-MM-DD (opcional) |
| `observations` | string |  | Observaciones (opcional) |
| `anticipo` | number |  | Valor del anticipo (opcional) |

#### `expense_ratios_get`

Obtiene una relación de gastos / anticipo por ID.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `id` | integer | ✔ | ID de la relación de gastos |

#### `expense_ratios_list`

Lista relaciones de gastos / anticipos. Filtros opcionales: user_report_id, area. Devuelve hasta `limit` resultados.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `user_report_id` | integer |  | Filtra por usuario que reporta |
| `area` | string |  | Área |
| `limit` | integer |  | Máximo de resultados (default 50, máx 200) |


### Informes de cliente

#### `customer_reports_create`

Crea un informe de cliente (para aprobación) sobre un centro de costo. Requiere cost_center_id. Genera automáticamente token y código. Opcionalmente asocia reportes de servicio con report_ids.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `cost_center_id` | integer | ✔ | ID del centro de costo (requerido) |
| `customer_id` | integer |  | ID del cliente (opcional) |
| `contact_id` | integer |  | ID del contacto (opcional) |
| `report_date` | string |  | Fecha del informe YYYY-MM-DD (opcional) |
| `description` | string |  | Descripción (opcional) |
| `email` | string |  | Email de envío (opcional) |
| `report_ids` | array<integer> |  | IDs de reportes de servicio a incluir (opcional) |

#### `customer_reports_get`

Obtiene un informe de cliente por ID, con los IDs de reportes de servicio incluidos.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `id` | integer | ✔ | ID del informe de cliente |

#### `customer_reports_list`

Lista informes de cliente (los que se envían a aprobación). Filtros opcionales: cost_center_id, customer_id, report_state. Devuelve hasta `limit` resultados.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `cost_center_id` | integer |  | Filtra por centro de costo |
| `customer_id` | integer |  | Filtra por cliente |
| `report_state` | string |  | Estado del informe |
| `limit` | integer |  | Máximo de resultados (default 50, máx 200) |


### Comisiones

#### `commissions_create`

Crea una comisión. Requiere user_id, user_invoice_id, customer_invoice_id y cost_center_id. El total se calcula como value_hour × hours_worked × (% de comisión parametrizado).

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `user_id` | integer | ✔ | ID del usuario de la comisión (requerido) |
| `user_invoice_id` | integer | ✔ | ID del usuario que factura (requerido) |
| `customer_invoice_id` | integer | ✔ | ID de la factura de cliente (requerido) |
| `cost_center_id` | integer | ✔ | ID del centro de costo (requerido) |
| `value_hour` | number |  | Valor hora (default 0) |
| `hours_worked` | number |  | Horas trabajadas (default 0) |
| `start_date` | string |  | Fecha inicio YYYY-MM-DD (opcional) |
| `end_date` | string |  | Fecha fin YYYY-MM-DD (opcional) |
| `observation` | string |  | Observación (opcional) |
| `customer_report_id` | integer |  | ID del informe de cliente (opcional) |

#### `commissions_get`

Obtiene una comisión por ID.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `id` | integer | ✔ | ID de la comisión |

#### `commissions_list`

Lista comisiones. Filtros opcionales: cost_center_id, user_id, is_acepted. Devuelve hasta `limit` resultados.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `cost_center_id` | integer |  | Filtra por centro de costo |
| `user_id` | integer |  | Filtra por usuario de la comisión |
| `is_acepted` | boolean |  | Filtra por aceptadas/no aceptadas |
| `limit` | integer |  | Máximo de resultados (default 50, máx 200) |


### Cotizaciones (solo lectura)

#### `quotations_list`

Lista cotizaciones. Filtro opcional cost_center_id. Devuelve hasta `limit` resultados. (Las cotizaciones se gestionan desde el centro de costo; esta tool es de solo lectura.)

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `cost_center_id` | integer |  | Filtra por centro de costo |
| `limit` | integer |  | Máximo de resultados (default 50, máx 200) |


### Usuarios (solo lectura, sin credenciales)

#### `users_get`

Obtiene un usuario por ID (sin credenciales), con su rol.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `id` | integer | ✔ | ID del usuario |

#### `users_list`

Lista usuarios del sistema (sin credenciales). Filtro opcional `q` (nombre/email) y rol_id. Útil para obtener IDs de usuarios (ej. report_execute_id, user_execute_id).

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `q` | string |  | Texto en nombre, apellidos o email |
| `rol_id` | integer |  | Filtra por rol |
| `limit` | integer |  | Máximo de resultados (default 50, máx 200) |


### Roles (solo lectura)

#### `rols_list`

Lista los roles del sistema (id, nombre, descripción).

_Sin parámetros._


### Parametrizaciones

#### `parameterizations_list`

Lista parámetros de configuración del sistema (valores de hora, porcentajes, etc.). Filtro opcional `q` por nombre.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `q` | string |  | Texto en el nombre del parámetro |


### Alertas / Notificaciones (solo lectura)

#### `notification_alerts_list`

Lista alertas/notificaciones (desviaciones de costo por módulo). Filtros opcionales: cost_center_id, state (booleano), module. Devuelve hasta `limit` resultados.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `cost_center_id` | integer |  | Filtra por centro de costo |
| `state` | boolean |  | Filtra por estado (leída/no leída) |
| `module` | string |  | Filtra por módulo |
| `limit` | integer |  | Máximo de resultados (default 50, máx 200) |


### Opciones de gasto (lookup)

#### `report_expense_options_list`

Lista las opciones (tipos de identificación y tipos de pago) usadas en los gastos/legalizaciones. Filtro opcional `category`. Úsala para obtener type_identification_id y payment_type_id válidos.

| Parámetro | Tipo | Req. | Descripción |
|---|---|:--:|---|
| `category` | string |  | Filtra por categoría (ej. tipo de identificación / pago) |

