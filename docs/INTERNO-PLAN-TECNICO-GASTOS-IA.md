# INTERNO — Plan técnico: presupuesto de viáticos, gastos multimoneda y agente de IA

> **Documento interno. No compartir con el cliente.**
> Complemento técnico de `PROPUESTA-GASTOS-PRESUPUESTO-IA.md`.
> Base: revisión del código en la rama `feature/ui-modernization`, agosto de 2026.

---

## 1. Diagnóstico del código actual

### 1.1 Los uploaders guardan en disco local, no en S3

Los cuatro uploaders terminan con almacenamiento en disco. En tres de ellos hay una línea que
intenta usar fog en producción y la siguiente la sobrescribe:

```ruby
# app/uploaders/avatar_uploader.rb:6-8  (idéntico en certificate_uploader.rb y information_uploader.rb)
storage (Rails.env.production? ? :fog : :file)   # intención
storage :file                                     # ...esta gana
```

`app/uploaders/order_uploader.rb:7` directamente declara `storage :file` sin intentarlo.

`config/initializers/carrierwave.rb` sí tiene las credenciales de fog configuradas por ENV
(`AWS_ACCESS_KEY`, `AWS_SECRET_KEY`, `AWS_BUCKET`), así que la infraestructura está a medio
camino: falta solo que los uploaders la usen.

**Impacto:** Heroku tiene filesystem efímero → todo archivo subido se pierde en el siguiente
deploy o restart de dyno. Afecta hoy a órdenes de compra, certificados, avatares y hojas de
vida.

**Acción:** corregir los cuatro uploaders (eliminar la línea que sobrescribe, dejar el
condicional por entorno) y verificar que las tres ENV vars estén pobladas en Heroku antes de
la Fase 3. Los archivos ya perdidos no son recuperables.

### 1.2 `ReportExpense.search` tiene condición de carrera entre requests

`app/models/report_expense.rb:56` construye los filtros definiendo scopes de clase **en
runtime**:

```ruby
def self.search(search1, search2, ...)
  search1.present? ? (scope :centro, -> { where(cost_center_id: search1) })
                   : (scope :centro, -> { where.not(id: nil) })
  # ...15 scopes redefinidos en cada llamada
  centro.user.name_gasto.date...
end
```

`scope` define un método de clase sobre el modelo, que es estado global compartido. Con Puma
multihilo, dos búsquedas concurrentes se pisan los filtros entre sí.

**Acción:** refactorizar a scopes estáticos o a un builder que componga relaciones sin mutar
la clase. Es prerequisito para los filtros nuevos (moneda, estado presupuestal, aprobación
contable). Estimado en Fase 5, 8 h.

`download_file` (`app/controllers/report_expenses_controller.rb:223`) y `get_report_expenses`
consumen ese mismo método; el refactor los toca a ambos.

### 1.3 Auditoría escrita a mano campo por campo

`ReportExpense#create_edit_register` (`app/models/report_expense.rb:148`) enumera cada campo
manualmente para armar el HTML del `RegisterEdit`, ~75 líneas. Hay dos métodos gemelos casi
idénticos (`create_create_register`, `create_destroy_register`).

Los ~10 campos nuevos hay que agregarlos en los tres. Vale la pena evaluar extraerlo a un
concern genérico que itere sobre una lista de campos auditables, pero **no está presupuestado
como refactor completo** — si se hace, sale de la contingencia.

### 1.4 Sin adaptador de background jobs en producción

`config/environments/production.rb:65` tiene `queue_adapter` comentado → ActiveJob corre en
`:async` (in-process, se pierde al reiniciar). Existen dos jobs (`app/jobs/`), ninguno
crítico.

**Decisión:** la consulta de TRM y el procesamiento de comprobantes **no** deben ir en el
request. Opciones: (a) Sidekiq + Redis en Heroku (costo mensual del addon), (b) hacer las
consultas de TRM síncronas con caché agresiva y timeout corto. Recomendación: (b) para el MVP,
porque la TRM se consulta una vez por moneda+fecha y luego sale de caché. Definir en Fase 0.

### 1.5 A favor

- `cost_centers.user_owner_id` (`app/models/cost_center.rb:107`) → el dueño que asigna
  partidas ya existe como dato.
- Permisos dinámicos por BD: `ModuleControl` → `AccionModule` → HABTM con `Rol`. Módulos y
  permisos nuevos son seeds, no código de autorización.
- `CmDataTable` (`app/javascript/generalcomponents/ui/CmDataTable.jsx`) ya soporta
  `serverPagination` + `serverMeta` + `onSearch`/`onSort`. Las tablas nuevas se montan sobre
  eso; referencia de uso completo en `app/javascript/packs/ReportExpenseIndex.js:885`.
- Tabs del centro de costos centralizados en
  `app/javascript/components/ShowConstCenter/TabContentShow.jsx:21-44` → agregar la pestaña
  Presupuesto es un item en `getTabs()` + un case en `renderContent()`.
- MCP ya montado y funcionando (`app/controllers/mcp_controller.rb`, tools en `app/tools/`),
  con resolución de actor por `X-Actor-Email`.

---

## 2. Modelo de datos propuesto

### 2.1 Tabla nueva: `expense_budgets` (partidas presupuestales)

| Columna | Tipo | Notas |
|---|---|---|
| `cost_center_id` | integer, index | FK |
| `user_id` | integer, index | persona a la que se le asigna |
| `amount` | decimal(15,2) | valor asignado |
| `notes` | text | |
| `created_by_id` | integer | quién la creó |
| `last_user_edited_id` | integer | consistente con el resto del sistema |
| `active` | boolean, default true | para anular sin borrar |

Índice compuesto `(cost_center_id, user_id)`.

**Validación de tope:** `SUM(amount) WHERE cost_center_id = X` ≤ `cost_centers.viatic_value`.
Ejecutar dentro de transacción con `SELECT ... FOR UPDATE` sobre el centro de costos para
evitar que dos partidas concurrentes se pasen del tope.

Nota: `cost_centers` ya tiene `sum_viatic`; revisar en Fase 0 si se reutiliza o si se deja
como está para no romper los cálculos actuales (`application_helper.rb:585` usa
`reports.sum(:viatic_value) + report_expenses.sum(:invoice_value)`).

### 2.2 Campos nuevos en `report_expenses`

| Columna | Tipo | Notas |
|---|---|---|
| `expense_budget_id` | integer, index | partida contra la que se descontó |
| `budget_approved` | boolean, default false | aprobación automática por presupuesto |
| `budget_rejection_reason` | string | "excede en $X" |
| `accounting_approved` | boolean, default false, index | aprobación de contabilidad |
| `accounting_approved_by_id` | integer | |
| `accounting_approved_at` | datetime | |
| `receipt_file` | string | CarrierWave |
| `currency` | string, default "COP", index | ISO 4217 |
| `foreign_value` | decimal(15,2) | |
| `foreign_tax` | decimal(15,2) | |
| `foreign_total` | decimal(15,2) | |
| `exchange_rate` | decimal(15,6) | TRM aplicada |
| `exchange_rate_date` | date | fecha de la tasa (= fecha del gasto) |
| `exchange_rate_source` | string | "trm_oficial" / "bce" / "manual" |

**Ojo con `is_acepted`:** ya existe y hoy es la aprobación manual. No reutilizarlo para la
aprobación presupuestal — son conceptos distintos y romper su semántica afecta los filtros y
el excel actuales. Definir en Fase 0 cómo se relacionan los tres estados
(`is_acepted` / `budget_approved` / `accounting_approved`) y cuál gobierna la vista de
contabilidad.

### 2.3 Tabla nueva: `exchange_rates` (caché)

| Columna | Tipo |
|---|---|
| `currency` | string |
| `rate_date` | date |
| `rate_to_cop` | decimal(15,6) |
| `source` | string |

Índice único `(currency, rate_date)`. Evita consultar la fuente externa dos veces para la
misma moneda y fecha.

### 2.4 Migración de datos existentes

- `currency = 'COP'` para todos los gastos actuales.
- `budget_approved` y `accounting_approved` en false; no inventar aprobaciones retroactivas.
- Sin `expense_budget_id`: los gastos previos no cuelgan de ninguna partida.

---

## 3. Configuración del MCP para el módulo de Gastos

El servidor ya existe y auto-descubre `app/tools/*_tool.rb`. La política de exposición está en
`McpController.exposed?` (hoy solo lectura + creación) → las tools nuevas deben agregarse ahí.

### 3.1 Tools existentes a ampliar

| Tool | Cambio |
|---|---|
| `report_expenses_create` | Agregar al `input_schema`: `currency`, `foreign_value`, `foreign_tax`, `foreign_total`, `exchange_rate`, `receipt` |
| `report_expenses_list` / `_get` | Exponer los campos nuevos en `KEYS` y en el serializer |
| `cost_centers_list` | Sin cambios; ya sirve para que el agente resuelva el centro |
| `report_expense_options_list` | Sin cambios; tipos de gasto y medios de pago |
| `records_search` / `records_aggregate` | Whitelist de columnas se actualiza sola vía `column_names` |

### 3.2 Tools nuevas

| Tool | Propósito | Notas de implementación |
|---|---|---|
| `report_expenses_attach_receipt` | Subir el comprobante y asociarlo al gasto | MCP no transporta binarios bien. Opción A: base64 en el argumento (límite de tamaño, ~5 MB). Opción B: devolver una URL firmada de S3 para que el agente suba directo. **Recomendada: B** — no infla el contexto del modelo |
| `expense_budgets_available` | Presupuesto disponible por `user_id` + `cost_center_id` | Devuelve asignado / gastado / disponible. El agente lo consulta **antes** de guardar para poder advertir |
| `expense_budgets_list` | Partidas de un centro de costos | Solo lectura |
| `exchange_rates_get` | Tasa por `currency` + `date` | Pega a la caché primero; si no está, consulta fuente y guarda |
| `expense_rules_validate` | Valida un gasto candidato contra las reglas de negocio | **Debe vivir en el servidor, no en el prompt del agente.** Es la única forma de que la regla sea fuente única y de que aplique también a los gastos creados por la web |
| `users_find_by_phone` | Resuelve el usuario a partir del número de WhatsApp | Alternativa más limpia: extender el `server_context` para aceptar `X-Actor-Phone` además de `X-Actor-Email` (ver `mcp_controller.rb:25` y `ApplicationTool.actor_user`) |

### 3.3 Resolución del actor

Hoy `ApplicationTool.actor_user` resuelve por correo (`X-Actor-Email`) y cae al Administrador
si no hay match. Para WhatsApp el identificador es el teléfono.

**Decisión pendiente (Fase 0):** agregar `X-Actor-Phone` al `server_context` y resolver por
teléfono con el mismo patrón. Requiere que `users` tenga el teléfono normalizado — verificar
el estado real del dato antes de prometer la funcionalidad.

**Importante:** el fallback silencioso al Administrador es aceptable para lecturas, pero para
gastos creados por WhatsApp **no debe aplicar**: si no se identifica a la persona, el agente
tiene que rechazar el registro, no atribuirlo a un genérico.

### 3.4 Autenticación

Recordar que el conector web de claude.ai no envía headers; ya se agregó el fallback por query
param (`mcp_controller.rb`, `?api_key=`). Para Taimes se sigue usando `X-Api-Key`.

---

## 4. Desglose técnico por fase

### Fase 0 — Análisis y diseño (8 h)
Modelo de datos definitivo, semántica de los tres estados de aprobación, decisión sobre
background jobs, decisión sobre resolución de actor por teléfono, definición de las reglas de
negocio con el cliente, verificación de ENV vars de S3 en Heroku, depuración del directorio de
teléfonos.

### Fase 1 — Módulo de Presupuesto (39 h)
- Migración + modelo `ExpenseBudget` + validación de tope con bloqueo transaccional — 6 h
- Controller, rutas, serializer, endpoints (CRUD + resumen de disponible) — 8 h
- Pestaña nueva en `TabContentShow.jsx` + tabla `CmDataTable` + formulario con validación en
  vivo del disponible — 12 h
- Seeds de `ModuleControl`/`AccionModule` + guards por permiso y por `user_owner_id` — 5 h
- `RegisterEdit` para partidas (crear/editar/eliminar) — 3 h
- Tablero asignado/gastado/disponible por persona — 5 h

### Fase 2 — Aprobación automática (24 h)
- Servicio de consumo + `SELECT FOR UPDATE` sobre la partida — 8 h
- Recálculo en edición/eliminación de gasto y en edición de partida — 6 h
- Estados, motivo de rechazo y su visualización en ambas pantallas — 5 h
- Pruebas de casos borde (concurrencia, edición que libera cupo, partida reducida por debajo
  de lo ya gastado) — 5 h

### Fase 3 — Comprobante y almacenamiento (21 h)
- `ReceiptUploader` + migración + validaciones de tipo/tamaño — 4 h
- Backend multipart en create/update, servir, descargar, borrar — 5 h
- Frontend en los puntos de captura + preview + descarga — 8 h
- **Corrección de los cuatro uploaders a fog + verificación en Heroku** — 4 h

### Fase 4 — Multimoneda y TRM (37 h)
- Migración de campos + catálogo de monedas — 7 h
- Lógica de conversión, consistencia y validaciones — 6 h
- UI del formulario (bloque condicional, cálculo en vivo) — 8 h
- `ExchangeRateService`: TRM oficial (datos.gov.co) + BCE, caché en `exchange_rates`,
  fallback manual, timeouts — 10 h
- Propagación a export/import Excel y a `recalculate_cost_center` — 6 h

### Fase 5 — Contabilidad, referencia y refactor (33 h)
- `accounting_approved` + quién/cuándo + `RegisterEdit` — 4 h
- Pantalla de contabilidad (solo aprobados) con filtros y export — 12 h
- Permisos + aprobación masiva — 6 h
- Columna de ID en tabla, filtro y export — 3 h
- **Refactor de `ReportExpense.search`** — 8 h

### Fase 6 — MCP (22 h)
Ver sección 3. Ampliar tools existentes (6 h), `attach_receipt` con URL firmada (8 h),
`expense_budgets_available` + `expense_rules_validate` (5 h), `exchange_rates_get` (3 h).

### Fase 7 — Agente de WhatsApp (74 h)
- Conexión al canal existente de Taimes + identificación por teléfono — 4 h
- Prompt, flujo conversacional, completitud, confirmación — 16 h
- Visión sobre comprobantes (extracción de campos) — 12 h
- Notas de voz → transcripción → extracción — 6 h
- Motor de reglas configurable — 12 h
- Flujo de moneda + TRM — 6 h
- Manejo de errores, ambigüedad, reintentos — 8 h
- Pruebas end-to-end con usuarios reales — 10 h

### Fase 8 — QA, migración, despliegue, documentación y capacitación (33 h)
Pruebas integrales (14 h), migración de datos (5 h), despliegue staging + producción (6 h),
documentación y capacitación (8 h). La documentación comprometida al cliente son cuatro
entregables: manual de usuario de los módulos nuevos, guía de configuración de las reglas del
agente, instructivo breve del agente de WhatsApp para campo, y las sesiones de capacitación
por perfil (grabadas).

**Total: 291 h.**

---

## 4.1 Nota comercial (interno)

El precio al cliente quedó en **$6.525.000** (87 h × $75.000/h), documentación y capacitación
incluidas.

**La estructura del argumento comercial:** el documento dice que un desarrollo convencional
de este alcance tomaría ~291 h y que, con asistencia de IA, se ejecuta en 87 h a la tarifa
normal de $75.000/h. Así la tarifa queda intacta y el descuento se explica por el método, no
por trabajo barato. Es la única forma de bajar el precio 4x sin destruir el ancla de tarifa
para trabajos futuros.

Implicaciones que conviene tener presentes:

- **El compromiso implícito es entregar 291 h de trabajo convencional en 87 h**, una
  compresión de 3,3x. Ese es el supuesto que sostiene todo el precio. Si la compresión real
  resulta menor, el proyecto se paga solo a una tarifa efectiva más baja que $75.000/h.
- **No hay contingencia.** Se eliminó el colchón del 15%. A este precio, las reglas de negocio
  por escrito y la matriz de estados de aprobación dejan de ser buenas prácticas y pasan a ser
  condición para no perder plata.
- Las fases más expuestas a que la compresión no se dé son la **4** (integración con fuentes
  externas de TRM: el trabajo es de infraestructura y de verificar contra el mundo real, no de
  escribir código) y la **7 interna / 6 comercial** (afinar el comportamiento del agente es
  iterativo y depende de pruebas con usuarios reales, que corren a velocidad humana).
- El cronograma comprometido es de **6 a 8 semanas**. Con 87 h de trabajo efectivo, la
  restricción no es la capacidad sino los tiempos de validación del cliente.
- **Estructura de fases del documento comercial** (7 fases, 87 h) ≠ estructura de este plan
  (9 fases, 291 h). La Fase 0 de análisis se absorbió en la Fase 1 comercial, y las internas 6
  y 7 (integración + agente) se fusionaron en la Fase 6 comercial. **El desglose interno de
  9 fases y 291 h sigue siendo el que gobierna la ejecución**; las 87 h son la proyección con
  IA que se le facturó al cliente.

### Equivalencia de fases

| Comercial | Interna | h convencional | h con IA | Valor |
|---|---|---:|---:|---:|
| 1 | 0 + 1 | 47 | 14 | $1.050.000 |
| 2 | 2 | 24 | 7 | $525.000 |
| 3 | 3 | 21 | 6 | $450.000 |
| 4 | 4 | 37 | 11 | $825.000 |
| 5 | 5 | 33 | 10 | $750.000 |
| 6 | 6 + 7 | 96 | 29 | $2.175.000 |
| 7 | 8 | 33 | 10 | $750.000 |
| | | **291** | **87** | **$6.525.000** |
- Desapareció el colchón del 15% de contingencia. A este precio **no hay margen para alcance
  mal delimitado**: las reglas de negocio por escrito y la matriz de estados de aprobación
  dejan de ser buenas prácticas y pasan a ser condición para no perder plata.
- El cronograma se comprimió de 12–14 a **6–8 semanas** para ser coherente con el precio y con
  el método. Es un compromiso real frente al cliente, no solo una cifra de venta.
- Las fases más expuestas a que la IA no comprima tanto como se espera son la **4**
  (integración con fuentes externas de TRM, donde el trabajo es de infraestructura y no de
  escribir código) y la **7** (afinar el comportamiento del agente, que es iterativo y depende
  de pruebas con usuarios reales).

---

## 5. Riesgos técnicos

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| El refactor de `search` rompe filtros o el Excel existentes | Media | Cubrir con pruebas los filtros actuales **antes** de tocar; el módulo tiene 42 archivos de test pero cobertura desconocida en gastos |
| `create_edit_register` se vuelve inmanejable con 10 campos más | Alta | Evaluar el concern genérico; si se hace, sale de contingencia |
| Las ENV vars de S3 no están pobladas en Heroku | Media | Verificar en Fase 0, antes de comprometer la Fase 3 |
| `users` no tiene teléfonos normalizados | Alta | Verificar el dato real en Fase 0; si está mal, la depuración puede exceder lo presupuestado |
| Base64 del comprobante infla el contexto del agente y encarece los tokens | Alta | Por eso la URL firmada es la opción recomendada |
| La semántica de `is_acepted` se cruza con los estados nuevos | Media | Definir la matriz de estados en Fase 0 y no reutilizar el campo |
| Sin cola de jobs, un timeout de la fuente de TRM degrada el request | Media | Timeout corto + caché + fallback manual; revisar Sidekiq si aparece dolor real |

---

## 6. Checklist previo a comprometer la propuesta

- [ ] Verificar `AWS_ACCESS_KEY`, `AWS_SECRET_KEY`, `AWS_BUCKET` en Heroku producción
- [ ] Verificar estado real del campo teléfono en `users` (cuántos poblados, formato)
- [ ] Confirmar volumen mensual de gastos (dimensiona la mensualidad y el costo de tokens)
- [ ] Confirmar qué monedas aparecen de verdad en la operación
- [ ] Obtener del cliente las reglas de negocio por escrito
- [ ] Definir la matriz de estados de aprobación
- [ ] Confirmar si la mensualidad de Taimes es por empresa o por usuario
