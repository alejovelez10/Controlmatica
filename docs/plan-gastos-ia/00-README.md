# 00 — README: cómo se ejecuta este plan

> **Si eres un agente y esto es lo primero que lees, estás en el lugar correcto.**
> Lee este archivo entero, después `00-ARQUITECTURA.md` (empezando por su **§7**), y solo
> entonces el archivo de tu paquete. No empieces a escribir código hasta haber leído los tres.

> ## ⛔ Antes que nada: las tareas marcadas "RETIRADA por auditoría"
>
> **Toda tarea, criterio, escenario o riesgo marcado `RETIRADA por auditoría` /
> `RETIRADO por auditoría` se IGNORA por completo. Su dueño es OTRO paquete y ese paquete ya la
> tiene escrita.** No la implementes "por si acaso", no la reimplementes "más simple", no abras un
> bloqueo por ella: simplemente sáltala.
>
> Verás el encabezado y el número (`Tarea 12`, `Criterio 21`, `Riesgo 5`…) **conservados y
> vacíos**, con una sola línea de retirada que nombra al dueño. **Es deliberado:** no se renumeró
> nada para que las referencias cruzadas entre los 14 documentos —y las que ya están en PRs y
> commits— sigan apuntando al mismo sitio. Un hueco numerado es la señal de que ahí hubo algo y de
> quién se lo llevó.
>
> El detalle de qué salió de cada paquete y por qué está en la **§9.1 "Pasada de limpieza"** al
> final de este archivo.

---

## 1. Qué se va a construir

Controlmatica es un ERP interno en Rails 6.1 + React 16 que ya gestiona centros de costo y gastos.
Este proyecto le agrega **cuatro capacidades nuevas sobre el módulo de gastos**:

1. **Presupuesto por persona y centro de costo** ("partidas"), con tope contra el valor de viáticos
   cotizado del centro, tablero de asignado / gastado / disponible, y **aprobación presupuestal
   automática**: cada gasto queda en `aprobado`, `excedido` o `sin_presupuesto` sin que nadie
   apriete un botón.
2. **Comprobante adjunto** en el gasto (S3), con previsualización y descarga desde la tabla, más
   una **vista de Contabilidad** nueva con aprobación individual y masiva.
3. **Gastos en moneda extranjera** con conversión a pesos usando la TRM oficial del día
   (datos.gov.co) y el BCE, con caché propia y captura manual como respaldo.
4. **Captura asistida por IA**: se sube la foto o el PDF del comprobante y un modelo de visión
   precarga los campos —el usuario siempre confirma—, más un **motor de reglas de negocio** y un
   **agente de WhatsApp** (vía la plataforma Taimes y el servidor MCP propio del repo) que permite
   registrar un gasto desde el celular en campo.

Todo esto sin romper nada de lo que ya existe: `is_acepted`, `recalculate_cost_center` y los
importes en COP siguen exactamente igual.

📄 **Propuesta aprobada (lo que se le prometió al cliente):**
[`docs/PROPUESTA-GASTOS-PRESUPUESTO-IA.md`](../PROPUESTA-GASTOS-PRESUPUESTO-IA.md)
📄 Plan interno de fases y horas: [`docs/INTERNO-PLAN-TECNICO-GASTOS-IA.md`](../INTERNO-PLAN-TECNICO-GASTOS-IA.md)
📄 **Documento base, obligatorio:** [`00-ARQUITECTURA.md`](00-ARQUITECTURA.md) — y dentro de él, la
**§7** es la que resuelve todos los conflictos entre paquetes. Donde §7 contradiga a §1–§6, manda §7.

---

## 2. Índice de paquetes

| # | Título | Archivo | Depende de | ¿UI? |
|---|---|---|---|---|
| 01 | Infraestructura de pruebas (Minitest + Playwright) | [`01-infraestructura-de-pruebas.md`](01-infraestructura-de-pruebas.md) | — | Solo 4 `data-testid` base |
| 02 | Migraciones, esquema y datos históricos | [`02-migraciones-y-esquema.md`](02-migraciones-y-esquema.md) | 01 | No |
| 03 | Deuda técnica bloqueante (uploaders a S3, refactor de `search`, concern de auditoría) | [`03-deuda-tecnica-bloqueante.md`](03-deuda-tecnica-bloqueante.md) | 01 | No |
| 04 | Dominio: partidas presupuestales y aprobación automática | [`04-presupuesto-y-aprobacion.md`](04-presupuesto-y-aprobacion.md) | 01, 02, 03 | No |
| 05 | Multimoneda, TRM y servicio de tasas | [`05-multimoneda-y-trm.md`](05-multimoneda-y-trm.md) | 01, 02, 03 | No (solo backend) |
| 06 | Comprobante, contabilidad (backend) y Excel | [`06-comprobante-y-contabilidad.md`](06-comprobante-y-contabilidad.md) | 01, 02, 03, **04**, **05** | No (solo backend) |
| 07 | Controladores, rutas, serializers y permisos | [`07-api-permisos-y-rutas.md`](07-api-permisos-y-rutas.md) | 01, 02, 03, 04, 05, 06 | No |
| 08 | Frontend: pestaña Presupuesto y los dos formularios de gasto | [`08-frontend-presupuesto-y-gastos.md`](08-frontend-presupuesto-y-gastos.md) | 04, 05, 06, 07, 09, 10 | **Sí** |
| 09 | Frontend: columnas, filtros y pantalla de Contabilidad | [`09-frontend-tablas-y-contabilidad.md`](09-frontend-tablas-y-contabilidad.md) | 04, 05, 06, 07 | **Sí** |
| 10 | IA: extracción de comprobantes y motor de reglas | [`10-ia-extraccion-y-reglas.md`](10-ia-extraccion-y-reglas.md) | 01, 02, 03, 05 | No |
| 11 | MCP: tools, actor por teléfono y contrato con Taimes | [`11-mcp-y-agente-whatsapp.md`](11-mcp-y-agente-whatsapp.md) | 01, 02, 04, 05, 06, 10 | No |
| 12 | Suite E2E con Playwright | [`12-e2e-playwright.md`](12-e2e-playwright.md) | 01, 08, 09 | Consume UI |
| 13 | Cierre: documentación, capacitación, datos y puesta en marcha | [`13-cierre-documentacion-y-puesta-en-marcha.md`](13-cierre-documentacion-y-puesta-en-marcha.md) | todos | No |

**Esta numeración es la única válida.** Si en algún documento encuentras "Paquete 0", "Paquete 00",
"01 — Presupuesto" o "los números 03-06 no están fijados", son etiquetas viejas ya derogadas por
`00-ARQUITECTURA.md` §7.1. Cita siempre número **y** nombre de archivo.

---

## 3. Olas de paralelización

El grafo real de dependencias es **casi lineal**. No prometas paralelismo que el grafo no permite:
tras partir la ola 3, **ninguna ola tiene más de dos paquetes simultáneos**. Cuatro agentes a la vez
no existen en este plan.

```
Ola 0  ── Tarea 0 (decisiones del cliente)
Ola 1  ── 01
Ola 2  ── 02 │ 03
Ola 3a ── 04 │ 05          ⬅ la ola 3 se parte en dos: 06 y 10 dependen de CÓDIGO de 3a
Ola 3b ── 06 │ 10
Ola 4  ── 07
Ola 5  ── 09 │ 11
Ola 6  ── 08
Ola 7  ── 12
Ola 8  ── 13
```

### Ola 0 — Tarea 0 (no es código)

**Dueño: comercial / PM, no un agente.** Ver `00-ARQUITECTURA.md` §7.10. Levanta las 8 decisiones
y verificaciones que el resto del plan asume. Puede solaparse con la ola 1, pero los ítems **0.6**
(credenciales de AWS) y **0.1/0.2** (decisiones presupuestales) tienen que estar cerrados antes de
las olas 2 y 3 respectivamente.

### Ola 1 — Paquete 01, solo

**Por qué va solo:** la suite de pruebas no arranca hoy (`chromedriver-helper` rompe el boot y
4 fixtures tienen columnas inexistentes). **Ningún otro paquete puede escribir un solo test** antes
de que este esté mergeado. Además es dueño de `test_helper.rb`, de todas las fixtures, de la
infraestructura de Playwright y —tras la auditoría— de `lib/tasks/permissions_gastos_ia.rake`.

*Conflictos posibles: ninguno, es el único.*

### Ola 2 — Paquetes 02 y 03 en paralelo

**Por qué pueden ir juntos:** tocan conjuntos de archivos **completamente disjuntos**.
- **02** escribe solo en `db/migrate/`, `db/schema.rb`, `lib/tasks/verify_gastos_ia_schema.rake`
  (namespace `gastos_ia_schema:check`) y `test/models/schema_gastos_ia_test.rb`.
- **03** escribe solo en `app/uploaders/`, `config/initializers/carrierwave.rb`,
  `ReportExpense.search` + sus 6 call sites, y `app/models/concerns/register_auditable.rb`.

⚠️ **Único punto de roce: `app/models/report_expense.rb`.** El 02 le regenera la cabecera
`# == Schema Information` con `annotate`; el 03 le borra los tres métodos de auditoría y le cambia
`search`. Son regiones distintas del archivo, pero **el 02 se mergea primero** y el 03 rebasa antes
de abrir su PR. Y `db/schema.rb` lo toca solo el 02.

### Ola 3 — se parte en 3a (04 │ 05) y 3b (06 │ 10)

🔴 **La ola 3 NO puede correr con sus cuatro paquetes a la vez.** Dos de ellos declaran
dependencias de **código**, no de datos:

- el **10** exige `Currency::CODES`, `Currency.valid?` y `ExchangeRateService.fetch(currency:,
  date:)` del **05** ("contrato duro" en su propia tabla, y su Tarea 14 los llama literalmente);
- el **06** exige `ReportExpense::BUDGET_STATUS_LABELS` del **04** (la corrección 10 le borró el
  fallback) y `Currency.valid?` del **05** (columna 13 de `import`, columnas 14–16 del Excel).

Lanzados en paralelo con el 04/05, el agente del 06 o del 10 se estrella con
`NameError: uninitialized constant` en su primera tarea. Por eso:

| Sub-ola | Paquetes | Archivos propios |
|---|---|---|
| **3a** | **04** → `app/models/expense_budget.rb`, `app/services/expense_budget_service.rb`<br>**05** → `app/services/exchange_rate_service.rb`, `exchange_rate_client.rb`, `app/models/currency.rb`, `app/models/exchange_rate.rb`, `app/controllers/exchange_rates_controller.rb` | Disjuntos salvo `report_expense.rb`, ya declarado |
| **3b** | **06** → `app/uploaders/receipt_uploader.rb`, `app/controllers/accounting_expenses_controller.rb`, `ReportExpense.import`, las dos plantillas `.axlsx`<br>**10** → `app/services/receipt_extraction_service.rb`, `app/services/expense_rule_service.rb`, `lib/tasks/parameterizations_gastos_ia.rake`, la acción `extract_receipt` | Arrancan **después** de que 3a esté mergeada |

**Orden de merge, único y vinculante: `04 → 05 → 06 → 10`** (§7.3 de la arquitectura).

⚠️ **Archivos que podrían chocar en esta ola, y la regla que lo evita:**

| Archivo | Quién lo toca | Regla |
|---|---|---|
| `app/models/report_expense.rb` | 04 (`audit_field :budget_status`, `BUDGET_STATUS_LABELS`), 05 (conversión, validación de `currency`), 06 (`mount_uploader`, scopes de contabilidad, `import`) | Cada uno agrega **su bloque al final de la región que le toca** y rebasa antes del PR. **Solo el 04 y el 06 agregan `audit_field`** (el 05 no agrega ninguno) y por tanto solo ellos actualizan el golden del 03. |
| `test/models/report_expense_audit_legacy_test.rb` (constante golden `HTML_EDICION`, dueño **03**) | 04 (`audit_field :budget_status`) y 06 (`audit_field :receipt_file`) | El test compara **byte a byte**, así que el orden importa: **el orden de los segmentos en `HTML_EDICION` = el orden de merge = `04` primero, `06` después**, y ese mismo orden se respeta en la lista de `audit_field` de `report_expense.rb`. Cada uno **agrega su segmento al final**, nunca reordena el ajeno. |
| `ReportExpense.import` | **solo el 06** (dueño único, §7.2) | El 05 **borró su Tarea 17**: sus dos reglas de moneda (`Currency.foreign?`/`Currency::DEFAULT` y `cop_manual_override = row["invoice_value"].present?`) las absorbió la tabla de mapeo de la C2 del 06. |
| `app/views/report_expenses/download_file.xlsx.axlsx` + la plantilla de contabilidad | **solo el 06** (dueño único) | El **05 va primero pero no las toca**: solo deja escrito el contrato de las columnas 14–16. La regla vieja "el 06 va primero" queda **derogada** — era al revés. |
| `app/helpers/application_helper.rb` | 05 (`get_currencies`), 06 (`budget_status_label`, `accounting_state_label`) — y el 09 en la ola 5 | Cada paquete **agrega solo sus métodos al final del helper** y rebasa antes del PR. Orden: 05 → 06. `currency_options` **no existe**: el 09 consume `get_currencies`. |
| `app/tools/report_expenses_list_tool.rb` (constante `KEYS`) | 05 (claves 20–26), 06 (claves 27–28) — dueño del archivo: **11**, ola 5 | Única excepción a "`app/tools/*` es del 11" (§7.7). **Cada uno agrega solo sus claves al final, en el orden de la tabla de §7.7, sin borrar ni reordenar las ajenas.** Orden de merge 05 → 06 → 11. Criterio compartido: `KEYS.size == 28` y `KEYS.uniq == KEYS`. Ningún otro archivo de `app/tools/` lo toca nadie fuera del 11. |
| `config/routes.rb` | 05 (`get_exchange_rate`), 06 (rutas de contabilidad, `download_receipt`), **10** (`post "extract_receipt/report_expenses"`) | **Son tres, no dos**, y el 05 y el 10 escriben en líneas contiguas (bloque 82–88). Rutas sueltas en líneas distintas: conflicto trivial de merge, se resuelve con rebase en el orden 05 → 06 → 10. |
| `app/controllers/report_expenses_controller.rb` | 06 (`delete_receipt`, `download_receipt`), 10 (guard de reglas **y la acción `extract_receipt` completa**, excepción documentada en §7.2) | **Roce real.** Los dos agregan métodos; el **07** (ola 4) es el dueño del archivo, recibe las tres acciones ya escritas y **no las reescribe**. Coordinar en el PR. |
| `app/views/layouts/user.html.erb` | **05** (solo el bloque `<script>` de `window.CM_CURRENCIES`) — el 01 ya puso `nav-gastos` y el 09 pondrá el ítem de Contabilidad en la ola 5 | No hay colisión dentro de la ola, pero **este layout renderiza TODAS las pantallas**: si el 05 lo rompe, cae el sistema entero. Quien lo toque corre la suite completa antes del PR (§7.2). |
| `config/application.yml` | 05 (`TRM_API_URL`, `DATOS_GOV_APP_TOKEN`, `EXCHANGE_RATE_HTTP_TIMEOUT`, `ECB_API_URL`, `EXCHANGE_RATE_OPEN_TIMEOUT`), 10 (`ANTHROPIC_API_KEY`, `RECEIPT_EXTRACTION_MODEL`, `RECEIPT_EXTRACTION_ENABLED`) | **El archivo está gitignorado**: no habrá conflicto de merge, pero sí sobrescritura local si dos agentes comparten checkout. Cada agente **solo AÑADE sus claves**; la tabla consolidada de `00-ARQUITECTURA.md` §7.9 es la fuente de verdad. |

> `app/serializers/report_expense_serializer.rb` **ya no está en esta tabla**: la limpieza le fijó
> dueño único (**07**, ola 4). El 05 y el 06 lo borraron de su "A modificar" y solo declaran la
> dependencia y su test de contrato sobre el JSON.

### Ola 4 — Paquete 07, solo

**Por qué va solo:** es el único que toca la capa HTTP compartida —
`report_expenses_controller.rb`, `cost_centers_controller.rb#show`,
`report_expense_serializer.rb`, `routes.rb` — y consume los cuatro backends de la ola 3 a la vez.
Ponerlo en paralelo con cualquier cosa garantiza conflictos.

*Su tarea más importante es la que la auditoría añadió: **cablear
`ExpenseBudgetService.persist_with_evaluation!`** en `create`/`update`/`destroy`. Sin eso,
`budget_status` nunca se calcula por la vía web y todo lo demás muestra datos falsos.*

### Ola 5 — Paquetes 09 y 11 en paralelo

**Por qué pueden ir juntos:** cero solape. El **09** es React (`packs/`, `components/`,
`layouts/user.html.erb`, `application_helper.rb`); el **11** es `app/tools/`,
`mcp_controller.rb`, `app/models/user.rb` y una migración propia.

*Sin roces:* el 11 escribe en `app/models/report_expense.rb` (ya mergeado por olas anteriores) y
el **09 no lo toca en absoluto**. Aviso corregido: antes decía "roce menor" e inducía a creer que
había competencia por un archivo que en esta ola escribe uno solo. Ojo: **`receipt_file_url` ya
existe, lo creó el 06** (§7.7, clave 28); el 11 solo lo consume.

### Ola 6 — Paquete 08, solo

**Por qué va solo y por qué va después del 09:** los dos escriben en
`app/javascript/packs/ReportExpenseIndex.js`, y ese es **el archivo más disputado del proyecto**.
Fue una de las dos dependencias circulares que hubo que romper. Regla mecánica:

- El **09** edita **solo** el constructor (`this.columns`), el panel de filtros y
  `loadData` / `getExportUrl` / `acceptFilteredExpenses`. **Va primero.**
- El **08** edita **solo** `renderModal()`, `EMPTY_FORM` y los tres handlers del formulario.
  **Va después y rebasa.**

Además el 08 consume `expense-budget-status-{id}`, que produce el 09.

### Ola 7 — Paquete 12, solo

Necesita toda la UI en verde. Es dueño único de todos los specs funcionales.

### Ola 8 — Paquete 13, solo

Documenta, carga los teléfonos, configura el agente en Taimes y ejecuta el runbook de despliegue.
Los ítems 0.7 y 0.8 de la Tarea 0 se levantan al **inicio** del proyecto, no aquí.

---

## 4. Cómo lanzar los agentes

Un agente por paquete. **Un agente nunca toca archivos de otro paquete**: si necesita algo que no
existe, lo declara como bloqueo y para; no lo escribe "por si acaso".

### Prompt base (idéntico para todos, cambia solo el archivo)

```
Ejecuta el paquete <NN> del proyecto de gastos con IA de Controlmatica.
Tu plan está en /Users/alejomac/Documents/Ruby/Controlmatica/docs/plan-gastos-ia/<ARCHIVO>.md
Antes de escribir una sola línea de código, lee COMPLETOS y en este orden:
  1) docs/plan-gastos-ia/00-README.md
  2) docs/plan-gastos-ia/00-ARQUITECTURA.md — empezando por su §7, que es vinculante
  3) tu propio archivo de paquete, EMPEZANDO por su bloque
     "🔴 CORRECCIONES DE AUDITORÍA", que manda sobre el resto del documento.
Ejecuta solo las tareas de tu paquete. No toques archivos cuyo dueño sea otro paquete
(matriz de propiedad en 00-ARQUITECTURA.md §7.2): si te falta algo, párate y repórtalo.
Antes de dar el paquete por terminado DEBES correr las pruebas y dejarlas en verde:
  bundle exec rails test
y, si tu paquete toca UI, además:  cd test/e2e && npm test
No cierres el paquete con pruebas en rojo ni con tests pendientes de escribir.
```

### Por ola

**Ola 1** — un agente:
```
Ejecuta el paquete 01 … docs/plan-gastos-ia/01-infraestructura-de-pruebas.md   [+ prompt base]
```

**Ola 2** — dos agentes simultáneos:
```
Ejecuta el paquete 02 … docs/plan-gastos-ia/02-migraciones-y-esquema.md        [+ prompt base]
Ejecuta el paquete 03 … docs/plan-gastos-ia/03-deuda-tecnica-bloqueante.md     [+ prompt base]
```
> Aviso extra para los dos: *"`app/models/report_expense.rb` lo tocan los dos paquetes en regiones
> distintas; el 02 se mergea primero, el 03 rebasa antes de abrir su PR."*

**Ola 3a** — dos agentes simultáneos:
```
Ejecuta el paquete 04 … docs/plan-gastos-ia/04-presupuesto-y-aprobacion.md     [+ prompt base]
Ejecuta el paquete 05 … docs/plan-gastos-ia/05-multimoneda-y-trm.md            [+ prompt base]
```
> Aviso extra para los dos: *"comparten `app/models/report_expense.rb`. Agrega solo tu bloque y
> rebasa antes del PR. Solo el 04 agrega un `audit_field` (`:budget_status`) y por tanto solo él
> actualiza la constante golden `HTML_EDICION` del paquete 03, en el mismo PR y **antes** de que
> lo haga el 06. Orden de merge: 04 → 05. El 05 además toca `app/views/layouts/user.html.erb`
> (solo el bloque `<script>` de `window.CM_CURRENCIES`): ese layout renderiza TODAS las
> pantallas, así que corre la suite completa antes del PR."*

**Ola 3b** — dos agentes simultáneos, **solo cuando 3a esté mergeada**:
```
Ejecuta el paquete 06 … docs/plan-gastos-ia/06-comprobante-y-contabilidad.md   [+ prompt base]
Ejecuta el paquete 10 … docs/plan-gastos-ia/10-ia-extraccion-y-reglas.md       [+ prompt base]
```
> Aviso extra para los dos: *"no arranques si el 04 y el 05 no están mergeados: el 06 necesita
> `ReportExpense::BUDGET_STATUS_LABELS` (04) y `Currency.valid?` (05), y el 10 necesita
> `Currency::CODES` y `ExchangeRateService.fetch` (05). Comparten `config/routes.rb` con el 05 ya
> mergeado —tres paquetes en total, en líneas contiguas— y `app/controllers/report_expenses_controller.rb`.
> El **06** es dueño único de `ReportExpense.import` y de las dos plantillas axlsx (18 columnas),
> agrega `audit_field :receipt_file` **después** del `:budget_status` del 04 y actualiza el golden
> `HTML_EDICION` del 03. El **10** es dueño de la acción `extract_receipt` completa (excepción
> documentada de §7.2) y se la entrega escrita al 07. Sobre `app/tools/report_expenses_list_tool.rb`
> el 06 agrega **solo** las claves 27–28 de `KEYS`; nada más de `app/tools/`."*

**Ola 4** — un agente:
```
Ejecuta el paquete 07 … docs/plan-gastos-ia/07-api-permisos-y-rutas.md         [+ prompt base]
```
> Aviso extra: *"tu tarea bloqueante es el cableado de `ExpenseBudgetService.persist_with_evaluation!`
> en create/update/destroy (§7.4). No cierres el paquete sin el test de integración que afirma
> `budget_status == 'aprobado'`."*

**Ola 5** — dos agentes simultáneos:
```
Ejecuta el paquete 09 … docs/plan-gastos-ia/09-frontend-tablas-y-contabilidad.md  [+ prompt base]
Ejecuta el paquete 11 … docs/plan-gastos-ia/11-mcp-y-agente-whatsapp.md           [+ prompt base]
```

**Ola 6** — un agente:
```
Ejecuta el paquete 08 … docs/plan-gastos-ia/08-frontend-presupuesto-y-gastos.md   [+ prompt base]
```
> Aviso extra: *"en `packs/ReportExpenseIndex.js` edita SOLO `renderModal()`, `EMPTY_FORM` y los
> tres handlers del formulario. El constructor y los filtros son del paquete 09, ya mergeado."*

**Ola 7** — un agente:
```
Ejecuta el paquete 12 … docs/plan-gastos-ia/12-e2e-playwright.md                  [+ prompt base]
```
> Aviso extra: *"los `data-testid` canónicos están en `00-ARQUITECTURA.md` §7.6. La tabla de
> contrato de tu propio documento está DEROGADA; usa la tabla de traducción del punto 1 de tus
> correcciones de auditoría."*

**Ola 8** — un agente (o una persona):
```
Ejecuta el paquete 13 … docs/plan-gastos-ia/13-cierre-documentacion-y-puesta-en-marcha.md
                                                                                  [+ prompt base]
```

---

## 5. Definition of Done (común a todos los paquetes)

Un paquete **no está terminado** hasta que las 9 casillas están marcadas. No hay excepciones ni
"lo dejo anotado como deuda".

1. **Todas las tareas del paquete están implementadas**, incluidas las que agregó el bloque
   "🔴 CORRECCIONES DE AUDITORÍA".
2. **Todos los tests del paquete están escritos** — con el nombre y la aserción que el documento
   especifica — **y en verde**.
3. **La suite existente no se rompió.** `bundle exec rails test` da **0 failures / 0 errors**.
   ⚠️ Con `fixtures :all`, una fixture rota tumba la suite entera: si tocaste un YAML, corre
   `bundle exec rails test test/models` **completo**, no solo tu archivo.
4. **Auditoría en `RegisterEdit` donde aplique.** Toda escritura de negocio nueva deja su registro.
   Si agregaste un campo auditable a `ReportExpense`, es un `audit_field` en el concern
   `RegisterAuditable` **más** la actualización de la constante golden del paquete 03, en el mismo
   PR. Recuerda: el typo `module: "Gatos"` **se conserva** en gastos; `ExpenseBudget` usa
   `"Presupuesto"` y la aprobación contable `"Contabilidad"`.
5. **Permisos configurados.** Todo endpoint nuevo verifica permiso **en el servidor** y tiene un
   test que autentica un usuario **sin** ese permiso y afirma **403**. Los módulos y acciones se
   crean con `rake permissions_gastos_ia:install` (idempotente, paquete 01). **Nunca**
   `rake create_config:create` en un entorno con datos.
6. **Strong params blindados.** `budget_status`, `budget_reason`, `expense_budget_id`,
   `accounting_approved`, `accounting_approved_by_id` y `accounting_approved_at` **no** se pueden
   setear desde el body: un test de mass-assignment por cada uno.
7. **`User.current` seteado en todo test que escriba.** Los callbacks de `ReportExpense` lo exigen.
   Patrón: `as_user(users(:admin)) { ... }`. Es la causa número uno de fallos.
8. **Los `data-testid` de tu paquete existen** y coinciden **exactamente** con
   `00-ARQUITECTURA.md` §7.6. Si necesitas uno nuevo, lo agregas a §7.6 en el mismo PR.
9. **`annotate` regenerado** en modelos, serializers y fixtures afectados por una migración, y
   `RAILS_ENV=test bundle exec rails db:test:prepare` corrido después de cada una.

### Comandos exactos

```bash
# --- Minitest ---
bundle exec rails test                                    # suite completa — DEBE dar 0 failures / 0 errors
bundle exec rails test test/models                        # solo unitarios (obligatorio si tocaste fixtures)
bundle exec rails test test/models/expense_budget_test.rb # un archivo
bundle exec rails test test/models/expense_budget_test.rb:42
RAILS_ENV=test bundle exec rails db:test:prepare          # OBLIGATORIO tras cada migración
bin/spring stop                                           # si algo se comporta raro tras un bundle install

# --- Playwright (primera vez, una sola vez) ---
cd test/e2e && npm install && npm run install:browsers

# --- Playwright (uso diario) ---
cd test/e2e
npm run prepare:app          # db:test:prepare + webpack si hace falta + seed E2E
npm test                     # todos los flujos
npm run test:smoke           # solo el smoke, para validar el andamiaje
SKIP_WEBPACK=1 npm test      # sin recompilar packs (SOLO si no tocaste app/javascript)
npm run report               # reporte HTML de la última corrida
```

**Semáforo antes de cada despliegue a staging** (no hay CI en este repo):
`bundle exec rails test` en verde **y** `cd test/e2e && npm test` en verde.

---

## 6. Convenciones de git

### Una rama por paquete

```
feature/gastos-ia-01-infra-pruebas
feature/gastos-ia-02-migraciones
feature/gastos-ia-03-deuda-tecnica
feature/gastos-ia-04-presupuesto
feature/gastos-ia-05-multimoneda
feature/gastos-ia-06-comprobante-contabilidad
feature/gastos-ia-07-api-permisos
feature/gastos-ia-08-frontend-presupuesto
feature/gastos-ia-09-frontend-tablas
feature/gastos-ia-10-ia-reglas
feature/gastos-ia-11-mcp-whatsapp
feature/gastos-ia-12-e2e
feature/gastos-ia-13-cierre
```

Todas salen de la rama de integración del proyecto, no de `master` directamente:
**`feature/gastos-presupuesto-ia`** es la rama madre; `master` recibe el conjunto al final.

### Commits atómicos

- **Un commit por tarea del documento.** Los paquetes están escritos con tareas commiteables a
  propósito; respétalo.
- Mensaje: `<paquete>: <qué hace>` — p. ej. `04: ExpenseBudgetService.evaluate! con las tres transiciones`.
- **Un commit nunca deja la suite en rojo.** Si una tarea necesita dos pasos para no romper nada,
  son dos commits, no uno grande.
- Las migraciones van en su propio commit, separadas del código que las usa.

### Orden de integración (a `feature/gastos-presupuesto-ia`)

Se mergea **en el orden de las olas**, y dentro de una ola en el orden que dice la tabla de
conflictos:

```
01  →  02 → 03  →  04 → 05 → 06 → 10  →  07  →  09 → 11  →  08  →  12  →  13
```

Reglas duras:
1. **Ningún paquete de una ola posterior se mergea antes que uno de la anterior.**
2. Dentro de la ola 2: **02 antes que 03** (por `report_expense.rb` y `db/schema.rb`).
3. Dentro de la ola 3: **`04 → 05 → 06 → 10`**, que es exactamente la secuencia de arriba.
   El 06 consume del 04 (`BUDGET_STATUS_LABELS`) y del 05 (`Currency`), y el 10 consume del 05
   (`Currency`, `ExchangeRateService`). La regla anterior —*"06 antes que 05, por las plantillas
   axlsx"*— **era al revés y queda derogada**: el 06 es el dueño de las plantillas y de
   `ReportExpense.import`, y necesita al 05 mergeado para que sus columnas 13–16 compilen. El 05
   **no toca ni verifica** las plantillas. Mismo orden para `application_helper.rb`, para las
   claves de `ReportExpensesListTool::KEYS` y para los segmentos del golden `HTML_EDICION`.
4. Dentro de la ola 5–6: **09 antes que 08**, sin excepción (por `ReportExpenseIndex.js`).
5. **La ruta antes que el ítem de menú**: `accounting_expenses` (paquete 06) se mergea antes que el
   ítem de "Contabilidad" en `layouts/user.html.erb` (paquete 09). Si se invierte, el layout —que
   renderiza **todas** las pantallas— cae con `NameError` y el sistema entero queda abajo.
6. **Rebase, no merge commit**, dentro de la rama madre. Antes de abrir un PR, rebasa sobre la
   punta actual y vuelve a correr `bundle exec rails test`.
7. **`heroku pg:backups:capture` antes de desplegar cualquier ola con migraciones.**

---

## 7. Decisiones pendientes del cliente

Ninguna bloquea el arranque: todas tienen un **valor por defecto ya asumido** en el plan. Pero dos
de ellas **bloquean el merge del paquete 04**, porque cambiarlas después de que el cliente vea
números en pantalla es carísimo en confianza. Detalle completo en `00-ARQUITECTURA.md` §7.10.

| # | Qué hay que confirmar | Valor por defecto asumido | Bloquea |
|---|---|---|---|
| 0.1 | ¿Los gastos históricos consumen presupuesto? (§6.1) | **Sí lo consumen.** El disponible de una persona aparece reducido desde el primer día. La alternativa permitiría duplicar el gasto real del centro. Se explica en la capacitación. | **Merge del 04** |
| 0.2 | ¿El presupuesto se controla con IVA o sin IVA? (§6.2) | **Sin IVA** (`invoice_value`), igual que `recalculate_cost_center` y `get_show_center`. Tener dos verdades del "gastado" en la misma pantalla es inaceptable. | **Merge del 04** |
| 0.3 | Matriz de estados de §2 (los tres estados independientes) | La tabla de verdad de §2.4. **Es la que gobierna la pantalla que el cliente va a usar todos los días.** | Merge del 04 |
| 0.4 | ¿Qué monedas entran al catálogo? (§6.4) | **COP, USD, EUR.** Agregar una es un PR de una línea. | Merge del 05 |
| 0.5 | Reglas de negocio por escrito (§6.8) | **Las 5 de la propuesta**, parametrizables desde `parameterizations`. ⚠️ **Cualquier regla adicional es alcance nuevo.** | Merge del 10 |
| 0.6 | ~~`AWS_ACCESS_KEY` / `AWS_SECRET_KEY` / `AWS_BUCKET` + región real del bucket (§6.5)~~ | ✅ **RESUELTO 2026-08-10.** Ver "Acta de la Tarea 0" abajo. | ~~Arranque del 03~~ — **desbloqueado** |
| 0.7 | ¿Existen teléfonos de los usuarios? (§6.3) | ⚠️ **RESPONDIDO 2026-08-10, y la respuesta es NO.** Ver "Acta del teléfono" abajo. La columna ya existe (migración aplicada), pero **el dato no existe y nunca existió**. Recolectarlo es un trabajo de campo, no una consulta. | **Arranque del 13** |
| 0.8 | ¿Hay acceso a la consola de Taimes para configurar el agente? | **Sin default.** Si no lo hay, el cliente ejecuta la configuración siguiendo la especificación y la responsabilidad es suya. Se acuerda por escrito. | Arranque del 13 |

### Acta de la Tarea 0 — verificación de S3 (2026-08-10)

El paquete 03 (tarea **A0**) debe *leer* este resultado, no volver a ejecutar la verificación.

| Variable | Valor confirmado |
|---|---|
| `AWS_BUCKET` | **`controlmatica`** ⚠️ ojo: **no** `contromatica`; ese nombre no existe en la cuenta |
| `AWS_REGION` | **`us-east-2`** — confirmado con `get_bucket_location` contra el bucket real |
| `AWS_ACCESS_KEY` / `AWS_SECRET_KEY` | Presentes y válidas. Cargadas en `config/application.yml` (gitignoreado) para desarrollo |

Verificación ejecutada con **`fog-aws`**, que es la misma librería que usará CarrierWave, así que
prueba la ruta real y no una aproximación. Los 7 chequeos pasaron: autenticar, ubicar el bucket,
confirmar región, subir un objeto, leerlo íntegro, generar URL firmada de 600 s y borrarlo.

**Consecuencia para la tarea A2 del paquete 03:** el default `us-east-1` del
`ENV.fetch("AWS_REGION", "us-east-1")` **nunca debe activarse**. `AWS_REGION=us-east-2` tiene que
estar seteada en Heroku *antes* de mergear el paquete 03; si el default se aplica, fog firma contra
la región equivocada y las subidas fallan de forma intermitente, que es el peor modo de fallo posible.

### Acta del teléfono (2026-08-10)

Lo hecho:

- La migración **`20260405000001_add_phone_to_users.rb`** (Tarea 1 del paquete 11) está **creada y
  aplicada en desarrollo**, tal como la especifica el paquete: `phone`, `phone_normalized` e índice
  **no único** `index_users_on_phone_normalized`, con `up`/`down` en vez de `change`. `db/schema.rb`
  quedó en la versión `2026_04_05_000001` y `annotate` actualizó `user.rb` y `user_serializer.rb`.
  **El paquete 11 ya no crea esta migración**: la lee como hecha y sigue por su Tarea 2
  (`User.normalize_phone` y el callback).

Lo encontrado, que es lo importante:

| Medición (BD de desarrollo) | Resultado |
|---|---|
| Usuarios totales | 29 |
| Con `phone` poblado | **0** |
| Otras columnas donde pudiera estar el teléfono | **ninguna** |

**No es que el dato esté vacío: es que nunca hubo dónde guardarlo.** La tabla `users` no tenía —ni
tiene en otro nombre— ningún campo de teléfono, celular o contacto. Por lo tanto el número de nadie
está en el sistema, y poblarlo **no es una consulta ni una migración de datos: es recolección de
campo**, persona por persona.

Consecuencias que hay que aceptar antes de arrancar el paquete 13:

1. El poblado de `users.phone` (§7.11, dueño: paquete 13) pasa de ser una tarea técnica menor a
   depender de que alguien del cliente **junte los números y los valide**. Es la ruta crítica de
   todo el canal de WhatsApp.
2. Mientras `phone_normalized` esté vacío, `actor_user_by_phone` devuelve `nil` y, en modo estricto,
   **todo gasto que entre por WhatsApp se rechaza**. El agente no falla: rechaza, que es correcto
   pero inservible.
3. Sigue viva la renegociación del alcance de la Parte B del paquete 11 prevista en §7.10. La
   captura asistida desde la plataforma (paquete 10) **no depende de esto** y entrega valor sola.

Otras decisiones ya **tomadas** por la arquitectura y que no hay que volver a discutir: catálogo de
monedas como constante Ruby y no como tabla (§1.6); todo síncrono, sin Sidekiq ni Redis (§6.6);
sin gemas de test nuevas y sin CI (§6.7, §5.5); no se corrige el typo `"Gatos"` (§6.9); no se
unifican los dos formularios de gasto duplicados (§6.10); `effective_date` **sí** entra en
`exchange_rates` (§1.5); `ids[]` **sí** es filtro válido de la aprobación masiva (§C.4).

---

## 8. Riesgos del plan y señales tempranas de desvío

### Riesgos

| # | Riesgo | Señal temprana de que está pasando | Qué hacer |
|---|---|---|---|
| 1 | **El grafo es casi lineal**: cuatro olas tienen paralelismo real y **ninguna admite más de dos agentes a la vez** (la ola 3 se partió en 3a y 3b porque el 06 y el 10 dependen de código del 04/05). Si se planificó calendario asumiendo 12 paquetes en paralelo, el cronograma está mal desde el día uno. | El plan de fechas asume **más de 2 agentes** trabajando a la vez, o los cuatro paquetes de la ola 3 lanzados juntos. | Replanificar con las **10 olas** de §3 (0, 1, 2, 3a, 3b, 4, 5, 6, 7, 8). No hay atajo. |
| 2 | **`packs/ReportExpenseIndex.js` es un cuello de botella**: lo tocan el 08 y el 09, y era una dependencia circular. | Un PR del 08 con conflictos en el constructor o en `loadData`. | Es señal de que el 08 salió de su región. Revertir y aplicar la regla mecánica de §3 ola 6. |
| 3 | **`budget_status` sale en `sin_presupuesto` para todo.** Era el bloqueante número uno: nadie cableaba el servicio en el controller. | Después de la ola 4, un `POST /report_expenses` en un centro con partida deja `budget_status = "sin_presupuesto"`. | El paquete 07 no implementó su tarea de cableado (§7.4). No avanzar a la ola 5 hasta arreglarlo. |
| 4 | **Los `data-testid` divergen otra vez** y la suite E2E no encuentra nada. | Un spec del 12 falla con "locator resolved to 0 elements" en el primer `getByTestId`. | Es §7.6 desactualizada. Quien renombró actualiza tabla y spec en el mismo PR. |
| 5 | **Una fixture rota tumba toda la suite**, no solo el test que la usa. | `bundle exec rails test` falla con un error críptico en tests que nada tienen que ver con lo que tocaste. | Corre `bundle exec rails test test/models` y mira el guardián `fixtures_integrity_test.rb`. |
| 6 | **`User.current` nil** en cualquier escritura fuera de un request web. | `NoMethodError: undefined method 'id' for nil` dentro de `create_create_register` o de un callback. | Falta `as_user(users(:admin)) { ... }`. Es la causa número uno de fallos de test. |
| 7 | **No hay teléfonos de usuarios** (probabilidad **Alta** según §6.3) y la mitad de la Parte B del 11 queda inservible. | El inventario del ítem 0.7 devuelve menos del 50 % de usuarios con número. | Renegociar el alcance de la Parte B **antes** de construirla, no después. |
| 8 | **Los archivos históricos de `public/uploads` son irrecuperables.** `.slugignore` los excluye y el filesystem de Heroku es efímero. | Alguien promete "migrar los comprobantes viejos". | No se promete. Está documentado como pérdida asumida. |
| 9 | **Punto de no retorno del rollback.** En cuanto exista el primer `ExpenseBudget` en producción, `db:rollback` deja de ser opción. | Se propone un rollback de migraciones después de la ola 3 en producción. | El mecanismo es el **kill switch de permisos** (§7.9), no el rollback. Y hay backup previo. |
| 10 | **Sin CI**: el único semáforo es que alguien corra los comandos. | Un PR mergeado sin evidencia de `bundle exec rails test` en verde. | Exigir la salida de la suite pegada en el PR. Es la única red que hay. |
| 11 | **Reglas de negocio sin escribir del cliente.** El plan interno es explícito: a este precio no hay contingencia. | Llega el arranque del 10 sin el documento del ítem 0.5. | Se implementan las 5 por defecto y **cualquier regla adicional es alcance nuevo**, por escrito. |
| 12 | **La capacitación se agenda al final y el proyecto queda "casi cerrado" para siempre.** | Ola 7 terminada y ninguna fecha de capacitación agendada. | Agendar la sesión al **inicio** de la ola 7. El acta firmada es el criterio de cierre. |

### Señales de que un paquete concreto se está desviando

Cualquiera de estas exige parar y revisar **antes** de seguir escribiendo:

- El agente **crea un archivo que la matriz §7.2 asigna a otro paquete**. Es el síntoma más
  frecuente y el más caro: el segundo en llegar sobrescribe al primero.
- El agente **escribe una migración** y no es el 02 (ni el 11 con `20260405000001`).
- El agente **inventa un `data-testid`** que no está en §7.6.
- El agente **inventa una firma de servicio** distinta de §7.4 — sobre todo `create_budget` sin
  bang, `summary_for_center` con totales planos, o un `Result` con `:error` singular.
  *Única excepción admitida y documentada:* `ReceiptExtractionService::Result` del paquete 10, que
  sí usa `:error` singular como **código** de error (§4.2). Nadie más lo copia.
- El agente **implementa una tarea marcada "RETIRADA por auditoría"**. Es trabajo duplicado que
  además pisa al dueño real. Ver el aviso del principio de este archivo y la §9.1.
- El agente **decide algo en tiempo de ejecución** que la Tarea 0 debía haber cerrado ("si existe
  X hago A, si no hago B").
- El agente **relaja o borra un test** en vez de arreglar el código — en particular los 14 golden
  de auditoría del paquete 03 o el guardián de fixtures del 01.
- El agente **marca un test como `skip` o `test.fixme()`** sin dejar el motivo y el paquete del que
  depende en el título.
- El agente **cierra el paquete sin correr las pruebas**, o con "solo faltan unos tests".
- El agente **toca `is_acepted`**, `recalculate_cost_center` o migra los importes COP a decimal:
  son invariantes del proyecto (§0).
- El agente **ejecuta `rake create_config:create`** en un entorno con datos. Su línea 5 es
  `ModuleControl.destroy_all` y borra **todos los permisos de todos los roles**.

---

## 9. Cómo se aplicó la auditoría (para trazabilidad)

Los 13 documentos del plan se escribieron en paralelo por agentes distintos y después se
auditaron de forma cruzada. La auditoría encontró **13 hallazgos bloqueantes, 24 importantes y
9 menores**, casi todos de la misma familia: dos o más paquetes reclamando el mismo archivo, o
un productor y un consumidor con contratos incompatibles.

**Todos los hallazgos se aplicaron.** Ninguno se descartó por considerarlo equivocado. Mecanismo:

1. **`00-ARQUITECTURA.md` es la fuente de verdad**, y se le agregó la **§7 — Resoluciones de
   auditoría** con las tablas canónicas (paquetes, propiedad de archivos, grafo, firma de
   `ExpenseBudgetService`, `@estados`, `data-testid`, `KEYS` del MCP, seams de red, runbook de
   despliegue, Tarea 0). Además se corrigieron en línea las secciones §1, §1.5, §2.2, §4.2, §4.4,
   §4.5, §4.7, §4.8, §5.2, §6.7 y §C.4, que habían quedado superadas por decisiones de los
   paquetes.
2. **Cada paquete (01–12) recibió un bloque `🔴 CORRECCIONES DE AUDITORÍA` al inicio de su
   archivo**, que enumera exactamente qué tareas se borran, cuáles se reescriben y cuáles se
   agregan, con el motivo. **Ese bloque manda sobre el resto del documento.** Se eligió este
   formato en vez de reescribir 15.000 líneas porque un agente lee de arriba abajo y así ve la
   corrección antes que el texto corregido, y porque deja el rastro de qué cambió y por qué.
3. **Donde el texto viejo era activamente peligroso** —no solo desactualizado— se corrigió también
   en el lugar donde estaba: la tabla de `data-testid` del paquete 12 (derogada in situ), la
   "Trampa #14" del 04 (afirmaba algo falso sobre Ruby), la migración de `exchange_rates` del 02,
   el `FILTER_KEYS` del 06 y la forma de `summary_for_center` del 04.
4. **Se creó el paquete 13**, que no existía, para los entregables vendidos en la propuesta §5.3
   que estaban huérfanos (manual, guía de reglas, instructivo de campo, capacitación) y para tres
   huecos operativos: el poblado de `users.phone`, la configuración del agente en Taimes y la
   verificación de la transcripción de voz.

**Dos matices sobre cómo se aplicaron dos hallazgos concretos**, por si alguien compara con el
texto original de la auditoría:

- La auditoría pedía añadir tres escenarios negativos a `accounting.spec.js` para compensar la baja
  densidad de pruebas del paquete 09. Como otro hallazgo declaró al **paquete 12 dueño único de
  todos los specs**, esos tres escenarios se asignaron al 12 **como encargo explícito del 09**, no
  al 09. El efecto es el mismo; el dueño del archivo, no.
- La auditoría dejaba abierto si la previsualización del comprobante era del 06 o del 08, o si se
  eliminaba del alcance. Se asignó al **08**, que es el dueño de las dos tablas y de los dos
  formularios, y **no se renegocia** la palabra "previsualización" con el cliente: se construye.

**Impacto en horas**, consolidado en `00-ARQUITECTURA.md` §7.13: **+15 h** de trabajo nuevo
(sobre todo el modal del índice de gastos y el cableado presupuestal, que eran huecos reales) y
**−12 h** de trabajo duplicado que se eliminó (migraciones y specs que estaban escritos por dos y
hasta cuatro paquetes a la vez). El paquete 13 queda cubierto por la Fase 7 ya vendida.

---

## 9.1 Pasada de limpieza (qué se retiró de cada paquete y por qué)

Después de aplicar las correcciones, cada documento se recorrió una segunda vez para **ejecutar**
lo que el bloque `🔴 CORRECCIONES DE AUDITORÍA` ordenaba borrar, y una tercera (reauditoría) para
cerrar los conflictos que sobrevivieron. Esta subsección existe para que **quien abra un paquete y
encuentre un hueco numerado sepa en un vistazo qué había ahí y quién se lo llevó.**

**Cómo se marcó, y por qué así:**

- El **encabezado y el número se conservan** (`### Tarea 12`, `Criterio 21`, `Riesgo 5`,
  `Escenario E2E-03.1`…) y el cuerpo se reemplaza por **una sola línea**:
  `RETIRADA por auditoría. Dueño único: paquete NN.`
- **No se renumeró nada.** Los 14 documentos se citan entre sí por número de tarea, y §7.2/§7.6 de
  la arquitectura también. Renumerar habría invalidado cientos de referencias cruzadas para
  ahorrar unos huecos cosméticos.
- Las tablas "A crear" / "A modificar" del paquete pierden la fila correspondiente y ganan, debajo,
  una nota de **quién es el dueño** del archivo que salió.
- Los criterios de aceptación asociados se marcan `RETIRADO por auditoría` **conservando su
  número**, para que los conteos de los otros paquetes no se rompan.

### Qué salió de cada paquete

| Paquete | Qué se retiró | A quién pasó, y por qué |
|---|---|---|
| **01** — infraestructura de pruebas | Tarea 15 (bloque solo-test de CarrierWave) y su criterio 13 | **03**, dueño único de `config/initializers/carrierwave.rb`. Un solo valor de `config.root`, no dos |
| **02** — migraciones | Nada de archivos. Se retiró la **bifurcación en runtime** de heroku ("si no está disponible, se deja como runbook") | La precondición la escribe la **Tarea 0** (§7.10). Prohibido decidir en tiempo de ejecución |
| **03** — deuda técnica | Las 4 filas "crear" de `test/fixtures/files/` (Tarea A5) y el escenario E2E-03.1 | Los archivos de fixtures al **01** (§7.12); el spec al **12**, dueño único de todos los specs funcionales |
| **04** — presupuesto | Tareas 1 y 2 (migraciones `20260401000001/2`), `db/schema.rb`, `report_expenses.yml` | Migraciones y esquema al **02**; la fixture al **01**. En su lugar, una precondición verificable con `table_exists?` |
| **05** — multimoneda | Tareas 1 y 2 (migraciones), 9 (strong params), 13 y 14 (UI de moneda), 15 (columna Moneda), 17 (`ReportExpense.import`), 18 (`exchange_rates_get_tool`), los 3 specs E2E, el `FakeExchangeRateClient` | 02 (migraciones), 07 (controller), 08 (formularios), 09 (tablas), **06 (`import`, con las dos reglas de moneda del 05 absorbidas en su C2)**, 11 (tools), 12 (specs), 01 (`test/support/**`). Del bloque de tools solo conserva las claves 20–26 de `KEYS` |
| **06** — comprobante y contabilidad | Tareas A1 y B1 (migraciones), A3 (uploaders + carrierwave), A7/A8/A9 (frontend de gastos), B4 (permisos y menú), B10 (pack de Contabilidad), B11 (seed E2E), C3 (`id` en `direct_columns`), los 2 specs E2E, los 5 archivos de `test/fixtures/files/` | 02, 03, 08/09, 01, 12, 07. **Conserva su C4** acotada a las claves 27–28 de `KEYS`: la reauditoría resolvió la contradicción §7.2 ↔ §7.7 a favor de §7.7 y borró de §7.2 la frase "06 borra su C4" |
| **07** — API, permisos y rutas | Tareas 1 y 2 (rake de permisos), 3 y 4 (menú y helper de Contabilidad), 21 (`delete_receipt`), los 2 specs E2E | 01 (rake, para romper el ciclo 06↔07), 09 (menú), 06 (`delete_receipt`), 12 (specs). **Gana** el cableado presupuestal (Tarea 23) y la propiedad única del serializer |
| **08** — frontend presupuesto y gastos | Tarea 1 (`@estados` en `cost_centers_controller#show`), los 4 specs Playwright, la prop `currencies` de `cost_centers/show.html.erb`, y la columna "Comprobante" de la tabla del índice | 07 (`@estados`), 12 (specs), **05** (`window.CM_CURRENCIES` es la fuente única), **09** (la columna vive en `this.columns`). **Gana** la Tarea 17 (réplica del modal, +6 h) y la 18 (previsualización, +3 h) |
| **09** — frontend tablas y contabilidad | Los 5 escenarios de `accounting.spec.js` y su criterio 45 | **12**, dueño único de los specs. Los 5 escenarios se le entregaron como **encargo explícito**, junto con 3 negativos más. **Gana** la 6.ª columna `receipt_file`, `expense-new`, `accounting-filter-cost-center` y `expense-currency-{id}` |
| **10** — IA y reglas | Tareas 12 y 13 (`test/fixtures/files/*` y `parameterizations.yml`), la fila `test/test_helper.rb`, la obligación sobre `webServer.env` del E2E | **01** (fixtures y `test_helper.rb`), **12** (E2E). **Conserva**, como excepción documentada en §7.2, la acción `extract_receipt` completa con sus 16 tests y los criterios 20–26 y 29.1 |
| **11** — MCP y WhatsApp | Las dos filas de `test/fixtures/files/`, el `require_relative` del helper de tests, y la redefinición completa de `KEYS` | 01. De `KEYS` solo agrega sus 3 claves (17–19) sobre la lista canónica de §7.7. **Gana** el guard de `ExpenseRuleService` (§7.5) y `persist_with_evaluation!` (§7.4) |
| **12** — E2E Playwright | La premisa de que `accounting.spec.js` era del 09, las 3 filas de `test/fixtures/files/`, y la edición de `config/initializers/carrierwave.rb` | 01 (fixtures e infraestructura), 03 (carrierwave). **Gana** `accounting.spec.js` entero (11 tests), el usuario `contab_limitado` y los escenarios E7.9–E7.11 |
| **13** — cierre | Nada: es el paquete nuevo que la auditoría creó | — |

### Lo que la reauditoría cerró encima de la limpieza

Nueve conflictos sobrevivieron a la primera pasada porque **§7.2 no tenía fila contra la cual
compararlos**. Se cerraron así, todos en `00-ARQUITECTURA.md`:

| Qué estaba sin dueño o con dos | Resolución |
|---|---|
| `app/serializers/report_expense_serializer.rb` (lo reclamaban 05, 06 y 07) | Fila nueva en §7.2 → **dueño único 07**, que va solo en su ola |
| `app/helpers/application_helper.rb` (05, 06 y 09) | Fila nueva en §7.2 con **reparto por método** y orden 05 → 06 → 09 |
| `ReportExpense.import` (05 y 06, con semánticas incompatibles) | Fila nueva en §7.2 → **06**, que absorbe las dos reglas del 05 |
| `app/views/layouts/user.html.erb` (01, 05 y 09) | Fila de §7.2 reescrita como **reparto por bloque** |
| `report_expenses_create_tool.rb` (05 y 11) y `report_expenses_list_tool.rb` (05, 06 y 11) | §7.2 corregida: `app/tools/*` es del **11**, con la **única** excepción de §7.7 (claves 20–26 del 05, 27–28 del 06) sobre el list tool. El 05 borró su bullet del create tool |
| `extract_receipt` (§7.2 lo daba al 07, que se declaraba fuera de alcance, y el 10 lo escribía) | Fila propia en §7.2 → **excepción documentada del 10**, mergeada en la ola 3 y recibida por el 07 |
| La ola 3 corriendo en paralelo con dependencias de código internas | Partida en **3a (04 │ 05)** y **3b (06 │ 10)**, con orden de merge `04 → 05 → 06 → 10` |
| El orden `05` vs `06` (el §6 decía una cosa y la regla dura 3 la contraria) | **05 antes que 06**, sin ambigüedad, en §7.3, en el §4 y en el §6 de este archivo |
| Los `data-testid` que nadie emitía (`expense-new`, `accounting-filter-cost-center`) o que nadie declaraba (`expense-currency-{id}`, los tres `filter-*`) | Agregados a §7.6 con dueño **09**, y la instrucción de emitirlos escrita en las tareas del 09 |
