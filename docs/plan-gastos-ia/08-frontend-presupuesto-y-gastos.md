# Paquete 08 — Frontend: pestaña Presupuesto y formularios de gasto

<!-- Título canónico de §7.1. Antes decía "formulario de gasto extendido" (singular): desde la
     corrección 1 de la auditoría este paquete es dueño de LOS DOS formularios. -->


## 🔴 CORRECCIONES DE AUDITORÍA (vinculantes — leer ANTES que el resto del documento)

> Estas correcciones **mandan sobre cualquier texto de este archivo** que las contradiga.
> Consolidadas en `00-ARQUITECTURA.md` §7. **Este paquete crece: absorbe el modal del índice.**

1. 🔴 **ALCANCE AMPLIADO — este paquete es el dueño ÚNICO de los DOS formularios de gasto**
   (§4.5, §7.2). Se elimina el hueco que el propio documento reconocía en su **Riesgo #17** y
   **Discrepancia #7**. Concretamente, este paquete **sí toca**
   `packs/ReportExpenseIndex.js` en `EMPTY_FORM`, `handleFormChangeMoney`, `handleSubmit`
   (a `FormData`) y `renderModal()`, agregando **lo mismo** que en `FormCreate.jsx`:
   comprobante, bloque de moneda extranjera, captura asistida por IA y aviso de disponible
   presupuestal. **Motivo comercial, no técnico**: la propuesta §4.6 dice textualmente
   *"disponible en los dos puntos de captura de la plataforma: el módulo de Gastos y la pestaña de
   Gastos del centro de costos"*, y sin esto la lectura automática **no llegaba al módulo de
   Gastos**. Estimado: **+6 h** (§7.13). El `ai-capture.spec.js` del paquete 12 corre contra el
   índice de gastos y depende de esto.
   ⚠️ **Corrige la tabla de reparto (líneas ~43-51)**, que afirma que nadie toca `renderModal`:
   es falso incluso hoy — el 05 (Tarea 14) y el 06 (A7) también lo asignaban. Ahora es de este
   paquete y **solo** de este paquete.
2. 🔴 **Este paquete es dueño único del bloque de moneda extranjera** en los dos formularios.
   El paquete 05 **borró sus Tareas 13 y 14**: ahora es solo backend. Los `data-testid` canónicos
   son **los de este documento** (§7.6): `expense-currency-select`, `expense-foreign-block`,
   `expense-foreign-value`, `expense-foreign-tax`, `expense-foreign-total`, `expense-rate`,
   `expense-rate-date`, `expense-fetch-rate-btn`, `expense-rate-loading|ok|shifted|error`,
   `expense-cop-preview`. Se agrega uno que faltaba: **`expense-cop-manual-toggle`**.
3. 🔴 **`cop_manual_override` se envía de verdad** (era el agujero del paquete 05, D2). La Tarea 12
   debe **setearlo a `true` en el mismo handler que marca `exchange_rate_source = "manual"`** (el
   toggle `expense-cop-manual-toggle`) y enviarlo en el `FormData`. Sin él, el servidor recalcula y
   **pisa en silencio** el COP que el usuario ajustó a mano en cada save. El paquete 07 ya lo
   agregó a los strong params.
4. 🔴 **La Tarea 14 apunta a la URL equivocada.** Renderiza el enlace de comprobante con
   `href={r.receipt_file.url}`, que es **exactamente el bug** que el paquete 06 documenta: con
   `fog_public = false` esa URL firmada **expira a los 600 s** y la fila se rompe sola. Correcto:
   ```jsx
   href={"/download_receipt/report_expenses/" + r.id}
   ```
   y `data-testid` canónico **`expense-receipt-link-{id}`** (queda derogado
   `expense-receipt-download-{id}`).
5. **TAREA NUEVA — modal de previsualización de comprobante** (propuesta §3.3, "previsualización y
   descarga desde la tabla"): no lo implementaba nadie y el paquete 12 escribe el test E4.2.
   `expense-receipt-preview-{id}` (botón en la fila) + `receipt-preview-modal` (contenedor con
   `<iframe>`/`<img>` sobre `/download_receipt/report_expenses/:id`), en **las dos tablas**.
   Estimado: **+3 h** (§7.13).
6. **Claves canónicas de `@estados` (§4.4)**: `budget_module`, `budget_create`, `budget_edit`,
   `budget_delete`, `budget_show_all`, **`is_center_owner`**, `expense_create`, `expense_edit`,
   `expense_delete`, `expense_show_all`. Son las que este documento ya usaba y **ganaron**; el
   paquete 07 (dueño único de `cost_centers_controller.rb#show`) fue corregido para emitirlas.
   Las cuatro `expense_*` son las que permiten borrar el `estados` **hardcodeado en `true`** de
   `ExpensesTable.jsx:211`, y ese borrado es **de este paquete**.
7. **Tu Discrepancia 1 y tu criterio 42 GANARON**: la clase de input de archivo es
   **`.cm-file-input`** (`app/assets/stylesheets/design_system.css:1741`) y **no se agrega CSS**.
   El paquete 06 borró su tarea A9 y la arquitectura §4.5 fue corregida (decía lo contrario, y con
   una ruta de archivo que no existe).
8. **Se BORRAN los 4 specs Playwright de este paquete** (`presupuesto-crear-partida.spec.js`,
   `presupuesto-excede-tope.spec.js`, `gasto-estado-presupuestal.spec.js`,
   `gasto-comprobante.spec.js`). Todos los specs funcionales son del **paquete 12** (§7.2), que ya
   los escribe en `budget.spec.js` y `receipt.spec.js`. La obligación de este paquete es **emitir
   los `data-testid`** de la tabla canónica §7.6.
9. **Tu Discrepancia 8 queda derogada**: la infraestructura de Playwright **NO la monta "el primer
   paquete que escriba un E2E"**. Es del **paquete 01**, y ya está (§7.2).
10. **Numeración canónica (§7.1)**: la frase *"los números de comprobante, multimoneda e IA (03-06)
    no están fijados"* queda derogada. Este paquete depende de **04** (presupuesto), **05**
    (multimoneda, backend), **06** (comprobante, backend), **07** (API y `@estados`), **09**
    (columnas y `expense-budget-status-{id}`) y **10** (endpoint de extracción). **El 09 se mergea
    ANTES que el 08** (§7.3), así que `expense-budget-status-{id}` ya existe cuando este paquete
    llega: la nota de "fallo esperado" de la Tarea 15 deja de aplicar.
11. **Regla anticolisión en `packs/ReportExpenseIndex.js`**, único archivo que tocan dos paquetes:
    este paquete edita **solo** `renderModal()`, `EMPTY_FORM` y los tres handlers del formulario.
    El **09** edita **solo** el constructor (`this.columns`), el panel de filtros y
    `loadData`/`getExportUrl`/`acceptFilteredExpenses`.

> Documento de trabajo para un agente autónomo. Todo lo que dice `00-ARQUITECTURA.md` manda sobre
> este archivo. Las decisiones que este paquete tomó por su cuenta van marcadas con **Asumido:**.

---

## Objetivo

Queda funcionando la pestaña **Presupuesto** dentro del detalle del centro de costos (tablero
asignado/gastado/disponible + tabla de partidas + alta/edición/anulación con validación en vivo del
disponible que **bloquea** el guardado antes de llegar al servidor), y **los dos formularios de
gasto de la plataforma** —el de esa misma pantalla (`FormCreate.jsx`) y el del módulo de Gastos
(`renderModal()` de `packs/ReportExpenseIndex.js`)— quedan extendidos con **comprobante adjunto**,
**bloque de moneda extranjera con conversión en vivo**, **captura asistida** (subir comprobante →
precargar campos → la persona corrige → guarda) y **aviso de disponible presupuestal**, más el
**modal de previsualización del comprobante** en las dos tablas.
Ningún dato nuevo se inventa en el cliente: el servidor sigue siendo la autoridad de todo cálculo.

---

## Dependencias

Numeración **canónica** de §7.1 (la nota "los números 03–06 no están fijados" queda **derogada** por
la corrección 10 del bloque de auditoría). Este paquete depende de **04, 05, 06, 07, 09 y 10**:

| Debe estar terminado antes | Por qué |
|---|---|
| **04 — `04-presupuesto-y-aprobacion.md`** (`ExpenseBudget`, `ExpenseBudgetService` con la firma canónica de §7.4, `BUDGET_STATUS_LABELS`) | Sin el modelo y el servicio no existen ni las partidas ni `budget_status` ni el resumen que pinta el tablero. |
| **05 — `05-multimoneda-y-trm.md`** (`Currency`, `ExchangeRateService`, `GET /get_exchange_rate`) — **solo backend** | El bloque condicional de moneda necesita el catálogo y el endpoint de TRM. El bloque de UI es de **este** paquete (corrección 2). |
| **06 — `06-comprobante-y-contabilidad.md`** (`ReceiptUploader` + `mount_uploader :receipt_file`, `GET /download_receipt/report_expenses/:id` con `Content-Disposition`, §7.8) — **solo backend** | El `<input type="file">` sin uploader detrás sube a la nada; el enlace de la fila y el modal de previsualización apuntan a `/download_receipt/report_expenses/:id`. |
| **07 — `07-api-permisos-y-rutas.md`** | Produce literalmente todo lo que esta pestaña consume: `ExpenseBudgetsController` (A.2–A.7), `ExpenseBudgetSerializer`, `ReportExpenseSerializer` extendido (`receipt_file`, `budget_status`, `currency`, `foreign_*`), strong params multipart (incluido `cop_manual_override`), `DELETE /delete_receipt/report_expenses/:id`, el cableado presupuestal de `create/update/destroy` y **el `@estados` de `cost_centers_controller.rb#show` con las 10 claves canónicas de §4.4**. |
| **09 — `09-frontend-tablas-y-contabilidad.md`** | Dueño de `this.columns` y de los filtros de las dos tablas de gastos, y de `expense-budget-status-{id}`. **El 09 se mergea ANTES que el 08** (§7.3): cuando este paquete llega, ese `data-testid` ya existe. |
| **10 — `10-ia-extraccion-y-reglas.md`** (`POST /extract_receipt/report_expenses`, `ReceiptExtractionService`, `ExpenseRuleService`) | El botón de captura asistida es un cliente de ese endpoint; sin él el botón no existe. |

Prerrequisitos transitivos (vienen por las olas 1–2 de §7.3, no se declaran como trabajo de este
paquete): **01** (infraestructura Minitest + Playwright, fixtures, `test/fixtures/files/**` y la rake
`permissions_gastos_ia:install`) y **02** (migraciones y esquema). Sin la rake de permisos ejecutada,
`load_permissions` devuelve todo `false` y la pestaña nunca se muestra a un no-admin.

**Este paquete NO depende de** el paquete 11 (tools MCP) ni del 13.

### Reparto con el Paquete 09 (mismo archivo, distinto bloque) — LEER ANTES DE TOCAR NADA

`app/javascript/components/ShowConstCenter/ExpensesTable.jsx` lo modifican **los dos paquetes**.
El reparto es por bloque y no se negocia:

| Bloque de `ExpensesTable.jsx` | Dueño |
|---|---|
| `this.columns` → columnas `id`, `budget_status`, `currency`, `foreign_total`, `accounting_approved` | **Paquete 09** |
| `this.columns` → columna `receipt_file` ("Comprobante") | **Paquete 08 (este)** |
| `this.state`, `formCreate`, todos los handlers, `HandleClick`, `clearValues`, `edit`, el `<FormCreate ...>` del render y el prop `estados` de la línea 211 | **Paquete 08 (este)** |
| `packs/ReportExpenseIndex.js` — constructor (`this.columns`), panel de filtros, `loadData` / `getExportUrl` / `acceptFilteredExpenses` | **Paquete 09** |
| `packs/ReportExpenseIndex.js` — `renderModal()`, `EMPTY_FORM`, `handleFormChangeMoney`, `handleSubmit` | **Paquete 08 (este)** — corrección 1 del bloque de auditoría (§4.5, §7.2). La casilla "NADIE" queda derogada. |
| `generalcomponents/ui/CmDataTable.jsx` (props `selectable`/`selectedIds`/…) | **Paquete 09** |

Consecuencias operativas:
- Este paquete **no** define los badges de `budget_status` ni el `data-testid`
  `expense-budget-status-{id}`: los produce el 09. El paquete **12** los consume en sus specs.
  Como **el 09 se mergea antes que el 08** (§7.3), ese `data-testid` ya existe cuando este paquete
  se escribe.
- Si los dos paquetes se mergean en paralelo, el conflicto de git cae exactamente sobre el array
  `this.columns`. Resolución: **conservar ambos lados**, columna de comprobante al final.

**Duplicación del modal de gasto** (§4.5 y §6.10): este paquete es dueño de **los dos** formularios
—`components/ReportExpense/FormCreate.jsx` (pestaña del centro de costos) y el espejo de
`renderModal()` dentro de `packs/ReportExpenseIndex.js` (índice de Gastos)—. Todo campo nuevo se
agrega **dos veces**. Ver la corrección 1 del bloque de auditoría y la Tarea 17.

---

## Archivos

### A crear

| Ruta | Qué se hace |
|---|---|
| `app/javascript/components/ShowConstCenter/BudgetsTable.jsx` | Contenedor de la pestaña Presupuesto: estado, fetch de partidas y de resumen, `CmDataTable` server-side, acciones de fila, orquestación del modal. |
| `app/javascript/components/ShowConstCenter/BudgetSummaryBoard.jsx` | Tablero presentacional (sin fetch propio): tarjetas Cotizado / Asignado / Sin asignar / Gastado / Disponible / Excedidos + tabla por persona. Estados carga / error / vacío. |
| `app/javascript/components/ShowConstCenter/BudgetFormCreate.jsx` | Modal presentacional de partida: beneficiario, valor, notas, activa, panel de disponible en vivo y bloqueo del botón Guardar. |
| `test/controllers/cost_centers_controller_test.rb` | Test **de consumo**: verifica que el `@estados` que emite el paquete 07 trae las 10 claves canónicas que estos componentes leen. No implementa el controller (dueño: 07). |
| `test/integration/cost_center_show_props_test.rb` | Test de que `show.html.erb` entrega a React las props que los componentes nuevos consumen. |
| `test/integration/budget_tab_contract_test.rb` | Contrato JSON que la tabla y el tablero leen (claves exactas), como red contra deriva del backend. |
| `test/integration/expense_form_multipart_test.rb` | Contrato de que el gasto se puede crear/editar por `multipart/form-data` (lo que ahora envía el formulario). |

> **Los 4 specs Playwright de este paquete quedaron BORRADOS por la auditoría** (corrección 8).
> `presupuesto-crear-partida.spec.js`, `presupuesto-excede-tope.spec.js`,
> `gasto-estado-presupuestal.spec.js` y `gasto-comprobante.spec.js` **no se crean aquí**: todos los
> specs funcionales son del **paquete 12** (§7.2), que ya los escribe en `budget.spec.js` y
> `receipt.spec.js`. La obligación de este paquete es **emitir los `data-testid`** de la tabla
> canónica §7.6 (Tarea 15).

### A modificar

| Ruta | Qué se hace |
|---|---|
| `app/javascript/components/ShowConstCenter/TabContentShow.jsx` | Agregar la pestaña `"Presupuesto"` (condicionada a permiso) y su `case "budgets"` en `renderContent`. Propagar `users_select`. |
| `app/javascript/components/ConstCenter/show.jsx:602-617` | Pasar `users_select={this.props.users_select}` a `TabContentShow` (hoy solo llega al `Calendar`, línea 625). |
| `app/javascript/components/ShowConstCenter/ExpensesTable.jsx` | Estado y handlers nuevos (archivo, extracción, moneda, TRM, disponible, `cop_manual_override`), `HandleClick` a `FormData`, **una sola** columna nueva (`receipt_file`, con enlace + botón de previsualización), eliminar el `estados` hardcodeado de la línea 211. ⚠️ Archivo compartido con el Paquete 09 — ver el reparto en Dependencias. |
| `app/javascript/components/ReportExpense/FormCreate.jsx` | Bloques nuevos: comprobante + captura asistida, moneda extranjera condicional, panel informativo de presupuesto. Sin tocar el `<style>` global salvo lo indicado en la tarea 14. |
| `app/javascript/packs/ReportExpenseIndex.js` | **Solo** `renderModal()`, `EMPTY_FORM`, `handleFormChangeMoney` y `handleSubmit` (a `FormData`): el mismo comprobante, bloque de moneda extranjera, captura asistida y aviso de disponible presupuestal que `FormCreate.jsx` (corrección 1, Tarea 17). ⚠️ El constructor, el panel de filtros y `loadData`/`getExportUrl`/`acceptFilteredExpenses` son del **Paquete 09** y no se tocan. |
| ~~`app/views/cost_centers/show.html.erb`~~ | **RETIRADA de esta tabla por el cierre de la reauditoría.** La fuente única del catálogo de monedas es `window.CM_CURRENCIES` (§4.5), que declara el **05** en `layouts/user.html.erb` y llega a los dos formularios. La prop `currencies: Currency.options` queda derogada y este archivo —que no estaba en §7.2 ni lo reclamaba nadie— sale del alcance del paquete. |
| `app/assets/stylesheets/design_system.css` | Agregar únicamente las clases `cm-budget-*` listadas en la tarea 14 (no se toca ninguna regla existente). |

> **`app/controllers/cost_centers_controller.rb` (`show` / `@estados`) NO se toca en este paquete.**
> Dueño único: **paquete 07** (§7.2 y §4.4, corrección 6). Este paquete solo **consume** las 10
> claves canónicas. La antigua fila de esta tabla y la Tarea 1 quedaron retiradas.

---

## Tareas

Cada tarea es un commit. El orden importa: 2–4 dejan la pestaña visible y con datos; 5–9 la vuelven
operable; 10–13 extienden el gasto de la pestaña; 14–15 cierran estilos, permisos y `data-testid`;
17–18 replican el formulario en el índice de Gastos y agregan la previsualización del comprobante;
la 16 (compilación) se corre **al final**, cuando los dos formularios ya están completos.
**La Tarea 1 quedó retirada por la auditoría; su número no se reutiliza.**

---

### Tarea 1 — `@estados` del centro de costos con permisos de Presupuesto y Gastos

> **RETIRADA por auditoría.** Dueño único: paquete 07. Ver el bloque de correcciones al inicio.

---

### Tarea 2 — Propagar `users_select` hasta la pestaña

**Problema real, verificado:** `TabContentShow` recibe `users={this.state.users}`
(`ConstCenter/show.jsx:597,614`), que se arma en `show.jsx:165` a partir de `this.props.users` =
`get_users_json` (`application_helper.rb:189-197`), y **ese helper filtra
`rols.name = "Administrador" OR "Comercial"`**. El beneficiario de una partida es típicamente un
ingeniero: con esa lista el select saldría vacío o incompleto.

1. En `ConstCenter/show.jsx`, dentro del `<TabContentShow ... />` (línea 602), agregar la prop
   `users_select={this.props.users_select}` (ya existe en `this.props`, se usa en la línea 625).
2. En `TabContentShow.jsx`, `renderContent`, pasar `users_select={p.users_select}` al nuevo
   `BudgetsTable`.

`get_users_select` (`application_helper.rb:212-220`) devuelve `[{value, label}]` — el shape que
`react-select` espera, sin transformación adicional.

---

### Tarea 3 — `BudgetSummaryBoard.jsx` (presentacional, sin fetch)

Componente de **clase**, sin hooks, sin estado propio.

**Props:**

| Prop | Tipo | Uso |
|---|---|---|
| `summary` | objeto o `null` | Respuesta cruda de A.3 (`{cost_center, totals, by_user}`). |
| `loading` | bool | Muestra el esqueleto. |
| `error` | string o `null` | Muestra el bloque de error. |
| `onRetry` | func | Botón "Reintentar" del bloque de error. |

**Método `n = (v) => parseFloat(v || 0)`** — todos los montos llegan como **string** (§3 A.3); nunca
se hace aritmética sin `parseFloat`.

**Render (tres estados excluyentes, en este orden):**

1. `loading === true` →
   ```jsx
   <div className="cm-metrics-grid" data-testid="budget-summary-loading">
     <div className="cm-metric-card"><div className="cm-dt-skeleton-bar" style={{width:"60%",height:14}} /> …</div>
     …2 tarjetas…
   </div>
   ```
2. `error` truthy →
   ```jsx
   <div className="cm-alert cm-alert-danger" data-testid="budget-summary-error">
     <i className="fas fa-exclamation-triangle" /> No se pudo cargar el resumen de presupuesto.
     <button className="cm-btn cm-btn-outline cm-btn-sm" onClick={this.props.onRetry}>Reintentar</button>
   </div>
   ```
3. `summary` presente → el tablero.

**Tablero** — `<div className="cm-metrics-grid" data-testid="budget-summary">` con dos
`cm-metric-card` de tres `cm-metric-item` cada una (la grilla de `cm-metric-card-body` es de 3
columnas, `design_system.css:1029`):

| Tarjeta | Item 1 | Item 2 | Item 3 |
|---|---|---|---|
| `cm-metric-card cm-metric-card--blue` — título `"Asignación"` (icono `fas fa-wallet`) | `Cotizado` = `totals.viatic_value`, `data-testid="budget-summary-viatic"` | `Asignado` = `totals.assigned`, `data-testid="budget-summary-assigned"` | `Sin asignar` = `totals.unassigned`, `data-testid="budget-summary-unassigned"` |
| `cm-metric-card cm-metric-card--green` — título `"Ejecución"` (icono `fas fa-chart-line`) | `Gastado` = `totals.spent`, `data-testid="budget-summary-spent"` | `Disponible` = `totals.available`, `data-testid="budget-summary-available"` | `Excedidos` = suma de `by_user[].exceeded_expenses_count`, `data-testid="budget-summary-exceeded"` |

Cada valor de dinero:
`<NumberFormat value={n(x)} displayType="text" thousandSeparator prefix="$" className="cm-metric-item-value cm-metric-item-value--currency" />`.
`Excedidos` es un entero, sin `NumberFormat`.

Si `n(totals.available) < 0`, la tarjeta de Ejecución usa `cm-metric-card--red` en vez de
`--green` y el valor de `Disponible` lleva `style={{ color: "#c82333" }}`.

**Tabla por persona** — debajo de las tarjetas, `<table className="cm-table">` envuelta en
`<div className="cm-table-wrapper" data-testid="budget-summary-by-user">`, columnas:
`Persona | Asignado | Gastado | Disponible | Partidas | Excedidos`. Cada `<tr>` lleva
`data-testid={"budget-summary-user-" + u.user_id}`.

- Si `summary.by_user.length === 0` → en lugar de la tabla,
  `<p className="cm-text-muted" data-testid="budget-summary-empty">Todavía no hay partidas asignadas en este centro de costos.</p>`
- Si `n(summary.cost_center.viatic_value) <= 0` → arriba de todo,
  `<div className="cm-alert cm-alert-warning" data-testid="budget-summary-no-viatic">Este centro de costos no tiene valor de viáticos cotizado; no es posible asignar partidas.</div>`

---

### Tarea 4 — `BudgetsTable.jsx`: esqueleto, carga de datos y tabla

Componente de **clase** (estilo `ExpensesTable.jsx`: métodos como arrow properties). Helper local
`csrfToken()` copiado tal cual de `ExpensesTable.jsx:7-10`.

**Props:** `cost_center` (objeto), `usuario` (current_user), `users_select` (array `{value,label}`),
`estados` (las 10 claves canónicas de §4.4 que emite el paquete 07).

**`this.state` inicial:**

```js
{
  data: [], loading: true, error: null,
  meta: { total: 0, page: 1, per_page: 50, total_pages: 1 },
  searchTerm: "", sortKey: null, sortDir: "desc", onlyActive: "",
  summary: null, summaryLoading: true, summaryError: null,
  modal: false, modeEdit: false, id: "", saving: false, formError: null, errorValues: true,
  original: null,                       // fila que se está editando, para el cálculo del tope
  formCreate: { cost_center_id: this.props.cost_center.id, user_id: "", amount: "", notes: "", active: true },
  selectedOptionUser: null,
  availability: { loading: false, error: null, has_budget: false, assigned: "0.0", spent: "0.0", available: "0.0" }
}
```

**`this.columns` — se declara COMPLETO en el constructor** (§4.5: `CmDataTable` congela
`visibleColumns` en su propio constructor, línea 16; una columna añadida después del mount no se
pinta nunca).

| `key` | `label` | `sortable` | `render` |
|---|---|---|---|
| `user_name` | `Beneficiario` | por defecto (true) | `<span data-testid={"budget-row-" + r.id}>{r.user ? r.user.names : "—"}</span>` — es el ancla de fila de §7.6; si `CmDataTable` no permite poner `data-testid` en el `<tr>`, va en la primera celda |
| `amount` | `Asignado` | true | `NumberFormat` prefijo `$` sobre `parseFloat(r.amount)` |
| `spent` | `Gastado` | **`false`** | `NumberFormat` sobre `parseFloat(r.spent)` |
| `available` | `Disponible` | **`false`** | `NumberFormat` sobre `parseFloat(r.available)`, en rojo `#c82333` si es negativo, envuelto en `<span data-testid={"budget-available-" + r.id}>` (§7.6) |
| `notes` | `Notas` | **`false`** | `<div className="cm-cell-truncate" data-tooltip={r.notes \|\| ""}><span className="cm-cell-truncate-text">{r.notes \|\| "—"}</span></div>` |
| `active` | `Estado` | true | `r.active ? <span className="cm-badge cm-badge-success">Activa</span> : <span className="cm-badge cm-badge-danger">Anulada</span>` |
| `created_by_name` | `Creada por` | **`false`** | `r.created_by ? r.created_by.names : "—"` |
| `updated_at` | `Actualizada` | true | `formatDate(r.updated_at)` (copiar el helper de `ReportExpenseIndex.js:14-21`) |

⚠️ **`sortable: false` no es cosmético.** La whitelist de orden de A.2 es
`{amount, created_at, updated_at, active, user_name}`. Cualquier otra `key` que llegue al servidor se
ignora en silencio y el usuario ve una flecha de orden que no ordena.

**`loadData(page, perPage, searchTerm, sortKey, sortDir)`** — misma firma y misma corrección de
página fuera de rango que `ExpensesTable.loadData` (líneas 71-100), sobre
`GET /get_expense_budgets/{cost_center.id}` con params `page`, `per_page`, `q`, `sort`, `dir`,
`only_active`. Diferencias obligatorias respecto del original:

- `.then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })` y un
  `.catch(() => this.setState({ loading: false, error: "No se pudieron cargar las partidas" }))`.
  `ExpensesTable.loadData` **no tiene `catch`** y por eso una caída de red deja la tabla en esqueleto
  para siempre: no replicar ese bug.
- Si la respuesta trae `type === "error"` (403 formateado), se guarda
  `error: data.message.join(" ")` y `data: []`.

**`loadSummary()`** — `GET /get_expense_budget_summary/{cost_center.id}`, setea
`summary/summaryLoading/summaryError`. Con `catch` propio; el fallo del resumen **no** debe impedir
que la tabla se pinte, ni al revés.

**`componentDidMount()`** → `this.loadData(); this.loadSummary();`

Handlers de tabla, idénticos en forma a `ExpensesTable:102-105`:
`handlePageChange`, `handlePerPageChange`, `handleSearch`, `handleSort`.
Más `handleOnlyActiveChange(e)` → guarda `onlyActive` y recarga desde la página 1.

**Render:**

```jsx
<React.Fragment>
  <BudgetSummaryBoard summary={...} loading={...} error={...} onRetry={this.loadSummary} />
  {this.state.modal && <BudgetFormCreate ... />}
  {this.state.error && <div className="cm-alert cm-alert-danger" data-testid="budget-table-error">{this.state.error}</div>}
  <CmDataTable
    columns={this.columns} data={this.state.data} loading={this.state.loading}
    serverPagination serverMeta={this.state.meta}
    onPageChange={...} onPerPageChange={...} onSearch={...} onSort={...}
    actions={this.renderActions}
    searchPlaceholder="Buscar por beneficiario o nota..."
    emptyMessage="No hay partidas presupuestales en este centro de costos"
    headerActions={this.renderHeaderActions()}
    emptyAction={this.canCreate() ? <button data-testid="budget-new-btn" …>Nueva partida</button> : null}
  />
</React.Fragment>
```

`serverMeta` es obligatorio junto con `serverPagination`: si llega `undefined`, `CmDataTable:222` cae
a paginación de cliente **sin error** y muestra 10 filas de la página actual.

`renderHeaderActions()` devuelve un `<div>` con el select de `only_active`
(`<select className="cm-state-select" data-testid="budget-filter-active">` con opciones
`""` → "Todas", `"true"` → "Solo activas", `"false"` → "Solo anuladas") y el botón
`data-testid="budget-new-btn"` — este último solo si `this.canCreate()`.

`canCreate() { var e = this.props.estados; return !!(e.budget_create && (e.is_center_owner || e.budget_show_all)); }`
(regla de negocio de A.5, replicada en cliente solo para esconder el botón; el servidor la vuelve a
verificar).
`canEdit()` y `canDelete()` idénticos con `budget_edit` / `budget_delete`.

---

### Tarea 5 — Pestaña "Presupuesto" en `TabContentShow.jsx`

1. `import BudgetsTable from './BudgetsTable';`
2. En `getTabs()`, **inmediatamente después** del `tabs.push` de Gastos (línea 31):
   ```js
   if (this.props.estados.budget_module) {
     tabs.push({ id: String(tabIndex++), label: "Presupuesto", icon: "fas fa-wallet", key: "budgets" });
   }
   ```
   El `tabIndex` es correlativo y ya se autogestiona; no hay ids fijos que romper.
3. En `renderContent()`, nuevo `case`:
   ```jsx
   case "budgets":
     return <div data-testid="budget-panel">
              <BudgetsTable usuario={p.usuario} cost_center={p.cost_center}
                            users_select={p.users_select} estados={p.estados} />
            </div>;
   ```
   El `<button>` de la pestaña lleva `data-testid="budget-tab"` y el contenedor del `case`
   `data-testid="budget-panel"` (§7.6; los dos son de este paquete).

**Trampa:** `this.state.activeTab` arranca en `"1"` y `render()` hace
`tabs.find(t => t.id === activeTab) || tabs[0]`. Como la pestaña nueva se inserta al final del bloque
condicional, los ids de las pestañas existentes **no cambian** para un mismo centro de costos. No
introducir la pestaña antes de Gastos: correría los ids y cambiaría la pestaña activa por defecto de
los centros con cotizaciones.

---

### Tarea 6 — `BudgetFormCreate.jsx` (modal presentacional)

Componente de **clase**, sin estado propio salvo el que no sale del modal. Usa `CmModal` (`size="md"`)
+ `CmButton`, y el objeto `selectStyles` copiado literalmente de `ReportExpense/FormCreate.jsx:6-24`
(naranja `#f5a623`, `menuPortal` z-index 9999).

**Props:**

| Prop | Tipo | Uso |
|---|---|---|
| `modal` | bool | `isOpen` de `CmModal` |
| `toggle` | func | Cierre |
| `title` | string | `"Nueva partida"` / `"Editar partida"` |
| `nameBnt` | string | `"Crear"` / `"Actualizar"` |
| `modeEdit` | bool | Deshabilita el select de beneficiario y muestra el switch `active` |
| `formValues` | objeto | `{ user_id, amount, notes, active }` |
| `users` | array | `users_select` |
| `selectedOptionUser` | objeto o `null` | Valor del `react-select` |
| `onChangeUser` | func(opt) | |
| `onChangeForm` | func(e) | `notes` |
| `onChangeMoney` | func(e) | `amount` |
| `onToggleActive` | func(e) | checkbox `active` |
| `submitForm` | func | |
| `saving` | bool | Spinner y `disabled` en el botón |
| `limite` | number | Máximo asignable (ver tarea 7) |
| `viaticValue` | number | Cotizado del centro |
| `availability` | objeto | Respuesta de A.4 para el beneficiario elegido |
| `blockReason` | string o `null` | Motivo de bloqueo, calculado por el padre |
| `serverError` | string o `null` | Mensaje `message[]` del servidor |

**Estructura del formulario** (grillas `cm-form-grid-2` / `cm-form-grid-1`, que ya existen en
`design_system.css:438-449`):

1. **Beneficiario** — `cm-form-group` + `<label className="cm-label"><i className="fa fa-user" /> Beneficiario</label>` +
   `<Select options={users} value={selectedOptionUser} onChange={onChangeUser} styles={selectStyles} menuPortalTarget={document.body} isDisabled={modeEdit} placeholder="Seleccionar persona..." className={blockReason && !formValues.user_id ? "cm-select-error" : ""} />`.
   Envolver en `<div data-testid="budget-user-select">` (react-select no propaga atributos sueltos).
   Si `modeEdit`, debajo: `<div className="cm-field-hint">El beneficiario no se puede cambiar. Anule la partida y cree otra.</div>` (regla de A.6).
2. **Valor asignado** — `NumberFormat name="amount" thousandSeparator prefix="$" className="cm-input" value={formValues.amount} onChange={onChangeMoney} placeholder="$0" data-testid="budget-amount"`.
3. **Notas** — `<textarea name="notes" rows="3" className="cm-input cm-textarea" data-testid="budget-notes" />`.
4. **Activa** (solo `modeEdit`) —
   `<label className="cm-label"><input type="checkbox" checked={!!formValues.active} onChange={onToggleActive} data-testid="budget-active" /> Partida activa</label>`
   + hint: `"Una partida anulada no aporta cupo, pero conserva la trazabilidad de los gastos ya imputados."`
5. **Panel de disponible en vivo** — `<div className="cm-budget-live" data-testid="budget-live-panel">` con tres filas `cm-info-row`:
   - `Cotizado del centro` → `viaticValue`
   - `Disponible para asignar` → `limite`, `data-testid="budget-live-limit"`
   - `Disponible actual de la persona` → si `availability.loading` → `"Calculando..."`; si `availability.error` → `"No disponible"`; si `!availability.has_budget` → `"Sin presupuesto asignado"` (nunca `"$0"`, §3 A.4); si no → `NumberFormat` de `availability.available`, `data-testid="budget-live-available"`.
6. **Bloque de bloqueo** — si `blockReason`:
   ```jsx
   <div className="cm-alert cm-alert-danger" data-testid="budget-block-message">
     <i className="fa fa-exclamation-circle" /> {blockReason}
   </div>
   ```
7. **Bloque de error del servidor** — si `serverError`:
   `<div className="cm-alert cm-alert-danger" data-testid="budget-server-error">{serverError}</div>`

**Footer** de `CmModal`:

```jsx
<div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
  <CmButton variant="outline" onClick={toggle}><i className="fa fa-times" /> Cancelar</CmButton>
  <CmButton variant="accent" onClick={submitForm} disabled={saving || !!blockReason}
            data-testid="budget-submit">
    {saving ? <span><i className="fa fa-spinner fa-spin" /> Guardando…</span>
            : <span><i className="fa fa-save" /> {nameBnt}</span>}
  </CmButton>
</div>
```

⚠️ `CmButton` debe soportar `disabled` y `data-testid`; verificar antes de escribir el componente y,
si no los reenvía, usar `<button className="cm-btn cm-btn-accent">` directo en vez de parchear
`CmButton` (es compartido por toda la app).

**No se define ni un `<style>` global dentro de este componente.** Las clases `cm-budget-*` van a
`design_system.css` (tarea 14).

---

### Tarea 7 — Validación en vivo del disponible que bloquea el guardado

Vive en `BudgetsTable.jsx` (el padre calcula, el modal solo muestra).

**Método `assignableLimit()`** — devuelve el máximo que esta partida puede tomar:

```js
assignableLimit = () => {
  var s = this.state.summary;
  if (!s) return null;                                   // aún cargando → no se bloquea por tope
  var unassigned = parseFloat(s.totals.unassigned || 0);
  var o = this.state.original;
  // Al editar, la partida ya está contada dentro de `assigned`: se le devuelve su propio monto.
  if (this.state.modeEdit && o && o.active) unassigned += parseFloat(o.amount || 0);
  return Math.round(unassigned * 100) / 100;
};
```

**Método `blockReason()`** — devuelve `null` o el string exacto a mostrar. Se evalúa en cada render:

| Orden | Condición | Mensaje devuelto |
|---|---|---|
| 1 | `parseFloat(summary.cost_center.viatic_value \|\| 0) <= 0` | `"El centro de costos no tiene valor de viáticos cotizado; no es posible asignar partidas"` |
| 2 | `!formCreate.user_id` | `"Seleccione el beneficiario de la partida"` |
| 3 | `formCreate.amount === "" \|\| isNaN(parseFloat(formCreate.amount))` | `"Ingrese el valor de la partida"` |
| 4 | `parseFloat(formCreate.amount) <= 0` | `"El valor de la partida debe ser mayor a cero"` |
| 5 | `formCreate.active !== false && limit !== null && parseFloat(formCreate.amount) > limit + 0.005` | `"El valor supera lo disponible para asignar en este centro. Disponible: $" + format(limit)` |
| — | en cualquier otro caso | `null` |

Notas obligatorias:

- **La tolerancia `+ 0.005` no es opcional.** `unassigned` viaja como string de un `BigDecimal(15,2)`
  pero `viatic_value` es un `float` en la base (§1.7): la resta del servidor puede devolver
  `1799999.9999999998`. Sin tolerancia, asignar el disponible exacto se bloquea.
- **Una partida marcada como inactiva no consume cupo** → la regla 5 se salta cuando
  `formCreate.active === false`.
- `limit === null` (resumen aún cargando o caído) → **no se bloquea por tope**; el servidor sigue
  siendo la autoridad y devolverá el error de A.5 si no cabe. Bloquear con información incompleta
  produce falsos negativos que el usuario no puede resolver.
- El bloqueo es **solo del formulario de partida**. En el formulario de gasto el exceso es
  informativo y nunca impide guardar (§2.1: el gasto excedido se guarda igual).

**`format(x)`** = `x.toLocaleString("es-CO", { maximumFractionDigits: 0 })` para el texto del mensaje
(los `NumberFormat` se usan en los valores, no dentro de strings).

**Disponible de la persona (`GET /get_expense_budget_available`)** — se pide con debounce de 400 ms
cada vez que cambia `formCreate.user_id`, y una vez al abrir el modal en modo edición:

```js
loadAvailability = (userId) => {
  if (this._availTimer) clearTimeout(this._availTimer);
  if (!userId) { this.setState({ availability: { loading:false, error:null, has_budget:false, assigned:"0.0", spent:"0.0", available:"0.0" } }); return; }
  this.setState({ availability: Object.assign({}, this.state.availability, { loading: true, error: null }) });
  this._availTimer = setTimeout(() => {
    var qs = "cost_center_id=" + this.props.cost_center.id + "&user_id=" + userId;
    if (this.state.modeEdit) { /* no aplica: exclude_expense_id es de gastos, no de partidas */ }
    fetch("/get_expense_budget_available?" + qs, { headers: { "X-CSRF-Token": csrfToken() } })
      .then(r => r.json())
      .then(d => this.setState({ availability: { loading:false, error:null, has_budget: !!d.has_budget, assigned: d.assigned, spent: d.spent, available: d.available } }))
      .catch(() => this.setState({ availability: Object.assign({}, this.state.availability, { loading:false, error:"No se pudo consultar el disponible" }) }));
  }, 400);
};
```

`componentWillUnmount()` debe limpiar `this._availTimer` (patrón de
`ReportExpense/FormCreate.jsx:66-70`).

---

### Tarea 8 — Alta, edición y anulación de partidas

En `BudgetsTable.jsx`:

**`openNew()`** → `modal:true, modeEdit:false, id:"", original:null, formError:null, saving:false,
formCreate:{cost_center_id, user_id:"", amount:"", notes:"", active:true}, selectedOptionUser:null` y
`loadAvailability(null)`.

**`edit(row)`** → `modal:true, modeEdit:true, id:row.id, original:row,
formCreate:{cost_center_id, user_id:row.user_id, amount:String(row.amount), notes:row.notes || "", active:row.active}`,
`selectedOptionUser:{ value:row.user_id, label: row.user ? row.user.names : "" }`, y
`loadAvailability(row.user_id)`.

**`HandleChangeMoney(e)`** → `value = e.target.value.replace(/[$,]/g, "")` antes de guardar (patrón de
`ExpensesTable:149-155`).

**`submit()`**:

```js
submit = () => {
  if (this.blockReason()) return;                 // cinturón: el botón ya está disabled
  var isEdit = this.state.modeEdit;
  var url = isEdit ? "/expense_budgets/" + this.state.id : "/expense_budgets";
  var body = isEdit
    ? { amount: this.state.formCreate.amount, notes: this.state.formCreate.notes, active: this.state.formCreate.active }
    : this.state.formCreate;                       // cost_center_id, user_id, amount, notes
  this.setState({ saving: true, formError: null });
  fetch(url, { method: isEdit ? "PATCH" : "POST",
               headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() },
               body: JSON.stringify(body) })
    .then(r => r.json())
    .then(data => {
      if (data.type === "error") {
        this.setState({ saving: false, formError: (data.message || []).join(" ") });
        return;                                    // el modal NO se cierra
      }
      this.setState({ modal: false, saving: false });
      this.loadData(isEdit ? undefined : 1);
      this.loadSummary();
      Swal.fire({ position: "center", icon: "success", title: data.success, showConfirmButton: false, timer: 1500 });
    })
    .catch(() => this.setState({ saving: false, formError: "No se pudo guardar la partida. Intente de nuevo." }));
};
```

⚠️ **`data.type === "error"` con HTTP 200 es la convención del proyecto (§3).** `ExpensesTable`
(línea 168-175) hoy ignora el `type` y muestra "Guardado" aunque el servidor haya fallado. **No
replicar ese bug**: la respuesta se discrimina siempre por `type`.

⚠️ **El JSON va plano** (`params.permit(...)` sin `require`, §3). Nada de `{ expense_budget: {...} }`.

**`destroy(row)`** — `Swal.fire` de confirmación con los colores del repo
(`confirmButtonColor:"#2a3f53"`, `cancelButtonColor:"#dc3545"`), texto
`"Los gastos imputados a esta partida quedarán sin partida y se reevaluarán."`; al confirmar,
`DELETE /expense_budgets/{id}` con `X-CSRF-Token`, y al volver `loadData()` **y** `loadSummary()`.

**`renderActions(row)`** — markup exacto del menú (§4.5): el dropdown es hermano inmediato del
trigger, y `onClick={this.openMenu}` con `openMenu = (e) => window.cmOpenMenu(e)`
(`layouts/user.html.erb:1275`):

```jsx
<div className="cm-dt-menu">
  <button className="cm-dt-menu-trigger" onClick={this.openMenu} data-testid={"budget-row-menu-" + row.id}>
    <i className="fas fa-ellipsis-v" />
  </button>
  <div className="cm-dt-menu-dropdown">
    {this.canEdit()   && <button className="cm-dt-menu-item" onClick={() => this.edit(row)} data-testid={"budget-row-edit-" + row.id}><i className="fas fa-pen" /> Editar</button>}
    {this.canDelete() && <button className="cm-dt-menu-item cm-dt-menu-item--danger" onClick={() => this.destroy(row)} data-testid={"budget-row-delete-" + row.id}><i className="fas fa-trash" /> Eliminar</button>}
  </div>
</div>
```

**Después de cualquier escritura de partida se recarga SIEMPRE el resumen**, porque A.5/A.6/A.7
reevalúan `budget_status` de los gastos del par (centro, usuario) (§2.7) y eso cambia `spent`,
`available` y `exceeded_expenses_count`.

---

### Tarea 9 — Estados de carga, error y vacío de la pestaña Presupuesto (cierre)

Checklist que la pestaña debe cumplir después de las tareas 3–8. Cada renglón es verificable:

| Pantalla | Cargando | Error | Vacío |
|---|---|---|---|
| Tablero | esqueleto `budget-summary-loading` (3 barras) | `cm-alert-danger` `budget-summary-error` + botón Reintentar | `budget-summary-empty` ("Todavía no hay partidas asignadas…") / `budget-summary-no-viatic` si el centro no tiene viáticos |
| Tabla | esqueleto propio de `CmDataTable` (`loading` prop) | `cm-alert-danger` `budget-table-error` **encima** de la tabla, la tabla queda vacía | `emptyMessage` "No hay partidas presupuestales en este centro de costos" + `emptyAction` "Nueva partida" (solo si `canCreate()`) |
| Modal | botón con `fa-spinner fa-spin` y `disabled` mientras `saving` | `budget-server-error` dentro del modal, **el modal no se cierra** | n/a |
| Disponible en vivo | `"Calculando..."` | `"No disponible"` | `"Sin presupuesto asignado"` cuando `has_budget === false` |

---

### Tarea 10 — Comprobante en el formulario de gasto

**En `ExpensesTable.jsx`** (estado y handlers):

1. Agregar al `state`: `receiptFile: null`, `receiptFileName: ""`, `receiptExistingId: null`,
   `receiptError: null`, `saving: false`.
2. `handleFileReceipt = (e) => {...}` — toma `e.target.files[0]`; valida en cliente **antes** de
   guardarlo (espejo del uploader, §4.8):
   - extensión en `["jpg","jpeg","png","pdf","webp","heic"]` → si no,
     `receiptError: "Formato no permitido. Use JPG, PNG, WEBP, HEIC o PDF."` y no se guarda el archivo.
   - `file.size <= 10 * 1024 * 1024` → si no,
     `receiptError: "El archivo supera los 10 MB permitidos."`
   - en caso válido: `receiptFile: file, receiptFileName: file.name, receiptError: null`.
3. `clearValues()` y `toogle("new")` deben resetear los cinco campos nuevos, o el comprobante del
   gasto anterior se sube al siguiente. **Este es el error más probable de esta tarea.**
4. `edit(row)` guarda `receiptExistingId: row.receipt_file && row.receipt_file.url ? row.id : null`
   y `receiptFile: null` (el archivo existente no se re-sube).
   ⚠️ **Nunca se guarda `row.receipt_file.url`** (corrección 4 del bloque de auditoría): con
   `fog_public = false` esa URL firmada expira a los 600 s. Lo que se guarda es el **id** y el enlace
   se arma siempre contra `/download_receipt/report_expenses/:id`.
5. `handleDeleteReceipt = () => {...}` — solo en modo edición y con `receiptExistingId`:
   `Swal.fire` de confirmación → `DELETE /delete_receipt/report_expenses/{this.state.id}` con
   `X-CSRF-Token` → si `type === "success"`, `receiptExistingId: null` y `this.loadData()`.

**En `ReportExpense/FormCreate.jsx`** (UI), bloque nuevo después del `<hr className="cm-divider" />`
de la línea 330, con título de sección:

```jsx
<div className="cm-form-grid-1">
  <div className="cm-form-group">
    <label className="cm-label"><i className="fa fa-paperclip" /> Comprobante</label>
    <input type="file" className="cm-input cm-file-input"
           accept=".jpg,.jpeg,.png,.webp,.heic,.pdf,image/*,application/pdf"
           onChange={this.props.onChangeFile}
           data-testid="expense-receipt-input" />
    {this.props.receiptFileName ? <div className="cm-field-hint" data-testid="expense-receipt-name"><i className="fa fa-file" /> {this.props.receiptFileName}</div> : null}
    {this.props.receiptExistingId ? (
      <div className="cm-field-hint">
        <a href={"/download_receipt/report_expenses/" + this.props.receiptExistingId} target="_blank" rel="noopener noreferrer" data-testid={"expense-receipt-link-" + this.props.receiptExistingId}><i className="fa fa-download" /> Ver comprobante actual</a>
        <button type="button" className="cm-btn cm-btn-outline cm-btn-sm" onClick={this.props.onPreviewReceipt} data-testid={"expense-receipt-preview-" + this.props.receiptExistingId}><i className="fa fa-eye" /> Previsualizar</button>
        {this.props.onDeleteReceipt ? <button type="button" className="cm-btn cm-btn-outline cm-btn-sm" onClick={this.props.onDeleteReceipt} data-testid="expense-receipt-delete"><i className="fa fa-trash" /> Quitar</button> : null}
      </div>
    ) : null}
    {this.props.receiptError ? <div className="cm-alert cm-alert-danger" data-testid="expense-receipt-error">{this.props.receiptError}</div> : null}
  </div>
</div>
```

**La clase correcta es `cm-file-input`** (`design_system.css:1741`), **no** `cm-input-file`: la
arquitectura §4.5 la nombra al revés. No hay que agregar CSS para esto.

---

### Tarea 11 — Envío por `FormData` (`HandleClick` de `ExpensesTable.jsx`)

Reemplazar por completo `HandleClick` (líneas 162-176). Patrón de referencia:
`OrdenesDeCompraTable.jsx:102-118`.

```js
HandleClick = () => {
  var f = this.state.formCreate;
  if (!f.cost_center_id || !f.user_invoice_id || !f.invoice_name || !f.invoice_date) {
    this.setState({ ErrorValues: false });
    return;
  }
  var fd = new FormData();
  ["cost_center_id","user_invoice_id","invoice_name","invoice_date","description","invoice_number",
   "identification","invoice_type","invoice_value","invoice_tax","invoice_total",
   "type_identification_id","payment_type_id",
   "currency","foreign_value","foreign_tax","foreign_total",
   "exchange_rate","exchange_rate_date","exchange_rate_source","cop_manual_override"
  ].forEach(function(k) { fd.append(k, f[k] === null || f[k] === undefined ? "" : f[k]); });
  if (this.state.receiptFile instanceof File) fd.append("receipt_file", this.state.receiptFile);

  var isEdit = this.state.modeEdit;
  var url = isEdit ? "/report_expenses/" + this.state.id : "/report_expenses";
  this.setState({ saving: true });
  fetch(url, { method: isEdit ? "PATCH" : "POST", body: fd, headers: { "X-CSRF-Token": csrfToken() } })
    .then(r => r.json())
    .then(data => {
      if (data.type === "error") {
        this.setState({ saving: false });
        Swal.fire({ icon: "error", title: "¡Ocurrió un error!", text: (data.message || []).join(" "), confirmButtonColor: "#2a3f53" });
        return;
      }
      this.setState({ modal: false, saving: false });
      this.loadData(isEdit ? undefined : 1);
      this.clearValues();
      Swal.fire({ position: "center", icon: "success", title: data.success || "Guardado", showConfirmButton: false, timer: 1500 });
    })
    .catch(() => { this.setState({ saving: false }); Swal.fire({ icon: "error", title: "No se pudo guardar el gasto", confirmButtonColor: "#2a3f53" }); });
};
```

Cinco reglas duras:

0. **`cop_manual_override` viaja siempre** (corrección 3 del bloque de auditoría). Es la bandera que
   le dice al servidor "no recalcules el COP". Sin ella, cada save recalcula desde
   `foreign_* × exchange_rate` y **pisa en silencio** el COP que el usuario ajustó a mano. El
   paquete 07 ya la tiene en los strong params y el 05 la expone como `attr_accessor` del modelo.
1. **Nunca se pone el header `Content-Type` con `FormData`.** El navegador tiene que escribir el
   `boundary`; si se fija a mano, Rails recibe el body como basura y el archivo se pierde en silencio.
2. `X-CSRF-Token` **sí** va (§4.5).
3. `fd.append(k, "")` para los campos vacíos: `FormData` convierte `undefined` en el string
   `"undefined"`, que un `to_f` en el servidor lee como `0.0`.
4. `receipt_file` se agrega **solo si es un `File`**. `OrdenesDeCompraTable.jsx:108` hace
   `formData.append("order_file", this.state.form.order_file)` con `order_file` inicializado en `{}`,
   y por eso manda el string `"[object Object]"` cuando no hay archivo. No copiar ese error.

Además, en el render (línea 205-222), pasar `submitForm={this.HandleClick}` y `saving={this.state.saving}`
al `FormCreate`, y que el botón del footer se deshabilite mientras `saving`.

---

### Tarea 12 — Bloque condicional de moneda extranjera con cálculo en vivo

**Estado (en `ExpensesTable.jsx`)** — agregar a `formCreate`:
`currency: "COP", foreign_value: "", foreign_tax: "", foreign_total: "", exchange_rate: "",
exchange_rate_date: "", exchange_rate_source: "", cop_manual_override: false`; y al `state`:
`selectedOptionCurrency: { value: "COP", label: "COP — Peso colombiano" }`,
`exchange: { status: "idle", message: null, rate_date: null, requested_date: null, source: null }`.

**Catálogo: fuente ÚNICA `window.CM_CURRENCIES`** (§4.5, cierre de la reauditoría). Lo declara el
**paquete 05** en el bloque `<script>` de `layouts/user.html.erb`
(`window.CM_CURRENCIES = <%= raw get_currencies.to_json %>;`), así que llega **a los dos
formularios** —incluido el modal del índice de Gastos de la Tarea 17, que por props no recibiría
nada— y a las dos tablas. Se lee así, en los dos sitios:

```js
const currencyOptions = (window.CM_CURRENCIES || [{ value: "COP", label: "COP — Peso colombiano" }]);
```

🔴 **La entrega por props queda DEROGADA**: nada de `currencies: Currency.options` en
`cost_centers/show.html.erb`, ni de bajarla por `show.jsx` → `TabContentShow` → `ExpensesTable` →
`FormCreate`. Había dos mecanismos vivos para el mismo dato y ninguna corrección había elegido.
Sigue valiendo el motivo original: agregar una moneda es un PR de una línea (§1.6), solo que la
línea está en `Currency::CODES`, no en una vista. El fallback a COP se conserva.

**Handlers:**

```js
handleChangeCurrency = (opt) => {
  var code = opt ? opt.value : "COP";
  var f = Object.assign({}, this.state.formCreate, { currency: code });
  if (code === "COP") {                       // volver a COP limpia todo lo extranjero
    f.foreign_value = ""; f.foreign_tax = ""; f.foreign_total = "";
    f.exchange_rate = ""; f.exchange_rate_date = ""; f.exchange_rate_source = "";
    f.cop_manual_override = false;
  }
  this.setState({ selectedOptionCurrency: opt, formCreate: f,
                  exchange: { status: "idle", message: null, rate_date: null, requested_date: null, source: null } },
                 code === "COP" ? undefined : this.fetchExchangeRate);
};

HandleChangeForeignMoney = (e) => {
  var v = e.target.value.replace(/[$,]/g, "");
  this.setState({ formCreate: Object.assign({}, this.state.formCreate, { [e.target.name]: v }) }, this.recomputeConversion);
};

handleChangeRate = (e) => {                    // TRM editada a mano
  var v = e.target.value.replace(/[$,]/g, "");
  this.setState({ formCreate: Object.assign({}, this.state.formCreate, { exchange_rate: v, exchange_rate_source: "manual" }) }, this.recomputeConversion);
};

// 🔴 Corrección 3 del bloque de auditoría: el toggle `expense-cop-manual-toggle` marca a la vez
// `exchange_rate_source = "manual"` y `cop_manual_override = true`. Sin el segundo, el servidor
// recalcula el COP en cada save y pisa en silencio lo que el usuario ajustó a mano.
handleToggleCopManual = (e) => {
  var on = !!e.target.checked;
  this.setState({ formCreate: Object.assign({}, this.state.formCreate, {
    cop_manual_override: on,
    exchange_rate_source: on ? "manual" : this.state.formCreate.exchange_rate_source
  }) });
};

recomputeConversion = () => {
  var f = this.state.formCreate;
  if (f.currency === "COP") return;
  if (f.cop_manual_override) return;            // el usuario fijó el COP a mano: no se pisa
  var rate = parseFloat(f.exchange_rate) || 0;
  var fv = parseFloat(f.foreign_value) || 0;
  var ft = parseFloat(f.foreign_tax) || 0;
  var round2 = (x) => Math.round(x * 100) / 100;
  this.setState({ formCreate: Object.assign({}, this.state.formCreate, {
    foreign_total: round2(fv + ft),
    invoice_value: round2(fv * rate),
    invoice_tax:   round2(ft * rate),
    invoice_total: round2(fv * rate) + round2(ft * rate)
  }) });
};
```

**Invariante #3, en el cliente:** `invoice_value` / `invoice_tax` / `invoice_total` **siempre en COP**.
El valor extranjero jamás se escribe en esos tres campos. Si esto se rompe,
`recalculate_cost_center` corrompe el % de viáticos de todos los centros en silencio
(`application_helper.rb:585`).

**Consulta de TRM:**

```js
fetchExchangeRate = () => {
  var f = this.state.formCreate;
  if (f.currency === "COP" || !f.invoice_date) return;
  this.setState({ exchange: { status: "loading", message: null, rate_date: null, requested_date: f.invoice_date, source: null } });
  fetch("/get_exchange_rate?currency=" + encodeURIComponent(f.currency) + "&date=" + encodeURIComponent(f.invoice_date),
        { headers: { "X-CSRF-Token": csrfToken() } })
    .then(r => r.json())
    .then(d => {
      if (d.type === "error") {
        this.setState({ exchange: { status: "error", message: (d.message || []).join(" "), rate_date: null, requested_date: f.invoice_date, source: null } });
        return;                                 // NO se inventa tasa: el usuario la escribe a mano
      }
      this.setState({ formCreate: Object.assign({}, this.state.formCreate, {
        exchange_rate: d.rate_to_cop, exchange_rate_date: d.rate_date, exchange_rate_source: d.source
      }), exchange: { status: "ok", message: null, rate_date: d.rate_date, requested_date: d.requested_date, source: d.source } },
      this.recomputeConversion);
    })
    .catch(() => this.setState({ exchange: { status: "error", message: "No se pudo consultar la tasa. Ingrésela manualmente.", rate_date: null, requested_date: f.invoice_date, source: null } }));
};
```

`fetchExchangeRate` también se dispara cuando cambia `invoice_date` y la moneda ≠ COP (envolver el
`HandleChange` existente de la línea 148 para detectar `e.target.name === "invoice_date"`).

**UI en `FormCreate.jsx`** — el select de moneda va **siempre** visible, envuelto en
`<div data-testid="expense-currency-select">`, en la misma `cm-form-grid-3` del dinero (queda:
Moneda | Valor del pago | IVA, y Total abajo). El sub-bloque extranjero se renderiza **solo** si
`this.props.formValues.currency !== "COP"`:

```jsx
{this.props.formValues.currency !== "COP" && (
  <div className="cm-budget-foreign" data-testid="expense-foreign-block">
    <div className="cm-form-grid-3">
      <NumberFormat name="foreign_value" … data-testid="expense-foreign-value" />   {/* label: Valor en {currency} */}
      <NumberFormat name="foreign_tax"   … data-testid="expense-foreign-tax" />     {/* label: IVA en {currency} */}
      <NumberFormat value={formValues.foreign_total} disabled className="cm-input cm-input-disabled" data-testid="expense-foreign-total" />
    </div>
    <div className="cm-form-grid-3">
      <NumberFormat name="exchange_rate" onChange={onChangeRate} decimalScale={6} data-testid="expense-rate" />  {/* label: TRM */}
      <input type="date" name="exchange_rate_date" disabled value={formValues.exchange_rate_date || ""} data-testid="expense-rate-date" />
      <button type="button" className="cm-btn cm-btn-outline cm-btn-sm" onClick={onFetchRate} data-testid="expense-fetch-rate-btn">
        <i className="fa fa-sync" /> Consultar TRM
      </button>
    </div>
    {/* estados de la consulta */}
    …
    <div className="cm-info-row" data-testid="expense-cop-preview">
      <span className="cm-info-label">Equivalente en COP</span>
      <NumberFormat value={formValues.invoice_total} displayType="text" thousandSeparator prefix="$" className="cm-info-value" />
    </div>
    <label className="cm-label">
      <input type="checkbox" checked={!!formValues.cop_manual_override}
             onChange={onToggleCopManual} data-testid="expense-cop-manual-toggle" />
      Ajusté el valor en COP a mano (no recalcular)
    </label>
  </div>
)}
```

Estados de la consulta de TRM, dentro del bloque:

| `exchange.status` | Qué se pinta |
|---|---|
| `"idle"` | nada |
| `"loading"` | `<div className="cm-field-hint" data-testid="expense-rate-loading"><i className="fa fa-spinner fa-spin" /> Consultando la tasa…</div>` |
| `"ok"` y `rate_date === requested_date` | `<div className="cm-field-hint" data-testid="expense-rate-ok">Tasa de {rate_date} ({source})</div>` |
| `"ok"` y `rate_date !== requested_date` | `<div className="cm-alert cm-alert-warning" data-testid="expense-rate-shifted">No hay tasa para el {requested_date}; se aplicó la del {rate_date}.</div>` |
| `"error"` | `<div className="cm-alert cm-alert-warning" data-testid="expense-rate-error">{message}</div>` — **advertencia, no bloqueo**: el usuario escribe la TRM a mano y `exchange_rate_source` pasa a `"manual"`. |

Cuando el usuario edita la TRM a mano, el hint muestra `"Tasa ingresada manualmente"`.

**Los tres campos en COP siguen editables** cuando la moneda es extranjera (§1.3: "el usuario puede
ajustar el COP a mano después de la conversión"); si el usuario los toca, `exchange_rate_source` pasa
a `"manual"` **y `cop_manual_override` a `true`** (corrección 3), exactamente igual que si hubiera
marcado el toggle `expense-cop-manual-toggle`. Los dos caminos escriben las dos banderas en el mismo
handler; nunca una sin la otra.

---

### Tarea 13 — Captura asistida (`POST /extract_receipt/report_expenses`)

**Estado nuevo** en `ExpensesTable.jsx`:

```js
extraction: { status: "idle", message: null, filled: [], confidence: {}, warnings: [], violations: [] }
// status ∈ "idle" | "loading" | "done" | "error"
```

**Handler:**

```js
handleExtract = () => {
  if (!(this.state.receiptFile instanceof File)) {
    this.setState({ extraction: { status: "error", message: "Primero seleccione el archivo del comprobante.", filled: [], confidence: {}, warnings: [], violations: [] } });
    return;
  }
  var fd = new FormData();
  fd.append("file", this.state.receiptFile);
  fd.append("cost_center_id", this.props.cost_center.id);
  this.setState({ extraction: { status: "loading", message: null, filled: [], confidence: {}, warnings: [], violations: [] } });

  fetch("/extract_receipt/report_expenses", { method: "POST", body: fd, headers: { "X-CSRF-Token": csrfToken() } })
    .then(r => r.json())
    .then(d => {
      if (d.type === "error") {
        this.setState({ extraction: { status: "error", message: (d.message || []).join(" "), filled: [], confidence: {}, warnings: [], violations: [] } });
        return;                                   // el registro manual NUNCA se bloquea
      }
      var allowed = ["invoice_name","identification","invoice_number","invoice_date","description",
                     "currency","foreign_value","foreign_tax","foreign_total",
                     "exchange_rate","exchange_rate_date","exchange_rate_source",
                     "invoice_value","invoice_tax","invoice_total"];
      var f = Object.assign({}, this.state.formCreate);
      var filled = [];
      allowed.forEach(function(k) {
        var v = d.fields ? d.fields[k] : null;
        if (v === null || v === undefined || v === "") return;   // null ⇒ se deja vacío, no se inventa
        f[k] = v; filled.push(k);
      });
      var newState = { formCreate: f, extraction: { status: "done", message: null, filled: filled,
                       confidence: d.confidence || {}, warnings: d.warnings || [], violations: d.rule_violations || [] } };
      if (f.currency && f.currency !== "COP") {
        newState.selectedOptionCurrency = { value: f.currency, label: f.currency };
      }
      this.setState(newState);
    })
    .catch(() => this.setState({ extraction: { status: "error", message: "No se pudo leer el comprobante. Complete los datos manualmente.", filled: [], confidence: {}, warnings: [], violations: [] } }));
};
```

Reglas duras:

1. **Whitelist de campos.** Solo se precargan las 15 claves de `allowed`. `budget_status`,
   `accounting_*`, `expense_budget_id`, `is_acepted`, `cost_center_id` y `user_invoice_id`
   **jamás** se sobreescriben desde la respuesta de extracción, aunque el servidor las mandara.
2. **`null` deja el input vacío.** Nunca se rellena con `"—"`, `"N/A"` ni con el valor anterior
   (contrato D.1: "Campos no detectados vienen en `null`; el frontend deja el input vacío, nunca
   inventa").
3. **Nada se guarda solo.** La extracción precarga; el guardado sigue siendo el botón del footer
   (propuesta §4.6). No hay auto-submit bajo ninguna condición.
4. **El fallo nunca bloquea.** `status === "error"` muestra un aviso y deja el formulario 100 %
   operable a mano.
5. **`type_identification_id` y `payment_type_id` no se autocompletan**, porque son FKs a
   `ReportExpenseOption` y el contrato D.1 no las devuelve. Si un día las devolviera, habría que
   validar que el id exista en `report_expense_options_type` antes de setearlo.

**UI en `FormCreate.jsx`**, dentro del bloque de comprobante, debajo del input de archivo:

```jsx
<button type="button" className="cm-btn cm-btn-pastel cm-btn-pastel--blue cm-btn-sm"
        onClick={this.props.onExtract}
        disabled={!this.props.receiptFileName || this.props.extraction.status === "loading"}
        data-testid="expense-extract-btn">
  <i className="fa fa-magic" /> Extraer datos del comprobante
</button>
```

Estados visuales (excluyentes):

| `extraction.status` | Bloque |
|---|---|
| `"idle"` | nada |
| `"loading"` | `<div className="cm-alert cm-alert-info" data-testid="expense-extract-loading"><i className="fa fa-spinner fa-spin" /> Leyendo el comprobante… Esto puede tardar hasta 20 segundos.</div>` |
| `"done"` | `<div className="cm-alert cm-alert-success" data-testid="expense-extract-done">Se precargaron {filled.length} campos. <strong>Revíselos antes de guardar.</strong></div>` + lista de `warnings` en `cm-alert-warning` (`data-testid="expense-extract-warnings"`) + lista de `violations` (ver abajo) |
| `"error"` | `<div className="cm-alert cm-alert-warning" data-testid="expense-extract-error">{message} Complete los datos manualmente.</div>` |

`rule_violations`: una fila por violación, `data-testid="expense-rule-violation"`, con
`cm-alert-danger` si `blocking === true` y `cm-alert-warning` si no. **Una violación `blocking: true`
NO deshabilita el botón Guardar** en esta pantalla: la puerta de bloqueo es del servidor (paquete de
reglas); el frontend informa. **Asumido:** si el cliente pide bloqueo en cliente, es cambio de una
línea (`disabled={hasBlockingViolation}`) y se decide con el paquete de reglas, no aquí.

Campos con `confidence[k] < 0.8` llevan debajo
`<div className="cm-field-hint" data-testid={"expense-low-confidence-" + k}><i className="fa fa-exclamation-triangle" /> Verifique este dato</div>`.

**Panel informativo de presupuesto** (misma pantalla, bloque aparte): `ExpensesTable` consulta
`GET /get_expense_budget_available?cost_center_id=…&user_id={user_invoice_id}` (+
`exclude_expense_id={id}` en modo edición) con debounce de 400 ms al abrir el modal y al cambiar el
responsable. `FormCreate` lo pinta:

- `has_budget === false` → `<div className="cm-field-hint" data-testid="expense-budget-none">Esta persona no tiene presupuesto asignado en este centro de costos.</div>`
- `has_budget === true` y `parseFloat(invoice_value) <= parseFloat(available)` →
  `<div className="cm-field-hint" data-testid="expense-budget-ok">Disponible: <NumberFormat …/></div>`
- `has_budget === true` y excede →
  `<div className="cm-alert cm-alert-warning" data-testid="expense-budget-warning">Este gasto excede el disponible en ${exceso}. Se guardará marcado como <strong>Excedido</strong>.</div>`

**Nunca deshabilita el botón Guardar** (§2.1: el gasto excedido se guarda igual, es requisito
explícito de la propuesta §3.2).

---

### Tarea 14 — Columna de comprobante, permisos reales y CSS

1. **`ExpensesTable.this.columns`** — agregar en el **constructor** (nunca después) **una sola
   columna**, al final del array:
   ```jsx
   { key: "receipt_file", label: "Comprobante", sortable: false,
     render: (r) => r.receipt_file && r.receipt_file.url
       ? <React.Fragment>
           <a href={"/download_receipt/report_expenses/" + r.id}
              target="_blank" rel="noopener noreferrer"
              className="cm-btn cm-btn-outline cm-btn-sm"
              data-testid={"expense-receipt-link-" + r.id}><i className="fas fa-download" /></a>
           <button type="button" className="cm-btn cm-btn-outline cm-btn-sm"
                   onClick={() => this.openReceiptPreview(r.id)}
                   data-testid={"expense-receipt-preview-" + r.id}><i className="fas fa-eye" /></button>
         </React.Fragment>
       : <i className="fas fa-times" style={{ color: "#ccc" }} /> }
   ```
   🔴 **Corrección 4 del bloque de auditoría.** El `href` **nunca** es `r.receipt_file.url`: con
   `fog_public = false` esa URL firmada **expira a los 600 s** y la fila se rompe sola. Siempre
   `/download_receipt/report_expenses/:id` (ruta del paquete 06, §7.8, que además fija
   `Content-Disposition: attachment`). El `data-testid` canónico es **`expense-receipt-link-{id}`**;
   **`expense-receipt-download-{id}` queda derogado** (§7.6).
   `sortable: false` obligatorio: no es una columna real y ninguna whitelist la acepta. El botón de
   previsualización y su modal son de la **Tarea 18**.

   ⚠️ **`id`, `budget_status`, `currency`, `foreign_total` y `accounting_approved` NO se agregan
   aquí**: son del Paquete 09 (ver el reparto en Dependencias). Duplicarlas produce columnas
   repetidas y `key` colisionadas en `visibleColumns`.
2. **Quitar el `estados` hardcodeado** de `ExpensesTable.jsx:211`. Reemplazar por:
   ```jsx
   estados={{
     closed: true,
     create: this.props.estados.expense_create,
     edit:   this.props.estados.expense_edit,
     delete: this.props.estados.expense_delete,
     export: true,
     show_user: this.props.estados.expense_show_all === true
   }}
   ```
   `show_user` gobierna `isDisabled` del select de Usuario (`FormCreate.jsx:164`): quien no tenga
   `Gastos / Ver todos` solo puede registrar gastos a su propio nombre.
3. **CSS** — agregar al final de `design_system.css`, sin tocar ninguna regla existente:
   ```css
   .cm-budget-live { background:#f8fafc; border:1px solid var(--cm-border); border-radius:var(--cm-radius); padding:12px 14px; margin-top:12px; }
   .cm-budget-live .cm-info-row { padding:4px 0; }
   .cm-budget-foreign { background:#fffaf2; border:1px solid #f3d9ae; border-radius:var(--cm-radius); padding:12px 14px; margin-bottom:16px; }
   ```
   **Prohibido** agregar estas reglas dentro del `<style>` inline de `FormCreate.jsx:402-512`: ese
   bloque ya pisa `.cm-input` y `.cm-label` globalmente cuando el modal se monta (§4.5) y crecer ahí
   agrava el problema.
4. **`data-testid` en el input de archivo del modal ya existe** (tarea 10). Verificar que todos los
   `data-testid` de la tabla siguiente estén puestos antes de cerrar la tarea.
5. **Envolver los dos `react-select` que ya existían** en el formulario de gasto, porque §7.6 los
   asigna a este paquete y hoy no tienen ancla: el de Usuario responsable (`FormCreate.jsx:164`) en
   `<div data-testid="expense-user-select">` y el de Centro de costo en
   `<div data-testid="expense-cost-center-select">`. Solo se agrega el `<div>` envolvente; **no se
   toca** ni el `isDisabled`, ni las opciones, ni el `onChange`. Van también en `renderModal()`
   (Tarea 17).

---

### Tarea 15 — Inventario de `data-testid` (contrato con los E2E del paquete 12)

El repo tiene **3 `data-testid` en total** hoy; los specs del paquete 12 no pueden depender de texto
ni de clases internas de `react-select`. **Emitir estos `data-testid` es la obligación E2E de este
paquete** (corrección 8: los specs los escribe el 12, no este documento). La lista es la tabla
canónica **§7.6** de `00-ARQUITECTURA.md`; toda la fila "Dueño = 08" de esa tabla está aquí:

| Superficie | `data-testid` |
|---|---|
| Pestaña | `budget-tab` (el `<button>` de la pestaña en `TabContentShow`), `budget-panel` (contenedor del `case "budgets"`) |
| Tablero | `budget-summary`, `budget-summary-loading`, `budget-summary-error`, `budget-summary-empty`, `budget-summary-no-viatic`, `budget-summary-viatic`, `budget-summary-assigned`, `budget-summary-unassigned`, `budget-summary-spent`, `budget-summary-available`, `budget-summary-exceeded`, `budget-summary-by-user`, `budget-summary-user-{id}` |
| Tabla partidas | `budget-new-btn`, `budget-filter-active`, `budget-table-error`, `budget-row-{id}` (el `<tr>`), `budget-available-{id}` (celda Disponible), `budget-row-menu-{id}`, `budget-row-edit-{id}`, `budget-row-delete-{id}` |
| Modal partida | `budget-user-select`, `budget-amount`, `budget-notes`, `budget-active`, `budget-live-panel`, `budget-live-limit`, `budget-live-available`, `budget-block-message`, `budget-server-error`, `budget-submit` |
| Gasto — comprobante (formulario) | `expense-receipt-input`, `expense-receipt-name`, `expense-receipt-delete`, `expense-receipt-error` |
| Gasto — comprobante (fila de tabla) | `expense-receipt-link-{id}`, `expense-receipt-preview-{id}` — **solo en `ExpensesTable.jsx`**; los de la tabla del índice de Gastos los emite el **09** desde su columna `receipt_file` (§7.6, cierre de la reauditoría) — y `receipt-preview-modal` (contenedor, en los dos packs, fuera del constructor) |
| Gasto — extracción | `expense-extract-btn`, `expense-extract-loading`, `expense-extract-done`, `expense-extract-warnings`, `expense-extract-error`, `expense-rule-violation`, `expense-low-confidence-{campo}` |
| Gasto — moneda | `expense-currency-select`, `expense-foreign-block`, `expense-foreign-value`, `expense-foreign-tax`, `expense-foreign-total`, `expense-rate`, `expense-rate-date`, `expense-fetch-rate-btn`, `expense-rate-loading`, `expense-rate-ok`, `expense-rate-shifted`, `expense-rate-error`, `expense-cop-preview`, `expense-cop-manual-toggle` |
| Gasto — selects existentes | `expense-user-select` (responsable), `expense-cost-center-select` (centro de costo) |
| Gasto — presupuesto | `expense-budget-none`, `expense-budget-ok`, `expense-budget-warning` |

**Derogados, no se emiten** (§7.6): `expense-receipt-download-{id}` (reemplazado por
`expense-receipt-link-{id}`, corrección 4) y `expense-receipt-link` sin sufijo de id.

En `react-select` el `data-testid` va en un `<div>` envolvente, no como prop del `<Select>`.

⚠️ **Todos los `expense-*` de formulario van DOS veces** (§7.6): en `FormCreate.jsx` y en
`renderModal()` de `packs/ReportExpenseIndex.js`. Los dos son de este paquete (Tarea 17).

**`expense-budget-status-{id}` NO está en esta lista**: lo crea el Paquete 09 sobre la columna
`budget_status`, y **el 09 se mergea antes que el 08** (§7.3, corrección 10), así que ya existe
cuando este paquete llega. La antigua nota de "fallo esperado" **queda derogada**.

---

### Tarea 16 — Verificación de compilación

`RAILS_ENV=development NODE_ENV=development ./bin/webpack` debe terminar en 0 sin warnings nuevos.
Webpacker 3.5 + React 16: **cero hooks**, cero sintaxis de clase que Babel del repo no soporte
(campos de clase con arrow ya se usan en `ExpensesTable.jsx`, es seguro). No agregar dependencias a
`package.json`: todo lo que este paquete usa (`react-select` v3, `react-number-format`,
`sweetalert2`, `reactstrap`) ya está instalado.

Se corre **después de la Tarea 18**, cuando los dos formularios ya están completos.

---

### Tarea 17 — Espejo del formulario en `packs/ReportExpenseIndex.js` (corrección 1, +6 h)

🔴 **Tarea NUEVA creada por la auditoría.** Cierra el hueco que este documento reconocía en su
Riesgo #17 y su Discrepancia #7: sin ella la captura asistida por IA **no llega al módulo de
Gastos** y se incumple la propuesta §4.6 (*"disponible en los dos puntos de captura de la
plataforma"*). El `ai-capture.spec.js` del paquete 12 corre contra el índice de gastos.

**Regla anticolisión (corrección 11, §4.5):** en este archivo el paquete 08 edita **solo**
`renderModal()`, `EMPTY_FORM` y los tres handlers del formulario. El constructor (`this.columns`),
el panel de filtros y `loadData`/`getExportUrl`/`acceptFilteredExpenses` son del **paquete 09**, que
además **se mergea antes**. Nada fuera de esos cuatro bloques se toca.

Se replica **lo mismo** que en `FormCreate.jsx` / `ExpensesTable.jsx`, con los **mismos**
`data-testid` de la Tarea 15 (van dos veces, §7.6) y respetando el estilo del pack
(`React.createElement`, sin JSX, métodos como `nombre = function () {...}.bind(this)`, §4.5):

| Bloque del pack | Qué se replica | Tarea de referencia |
|---|---|---|
| `EMPTY_FORM` (`:31-44`) | `currency: "COP"`, los seis campos `foreign_*`/`exchange_*`, `cop_manual_override: false`, y el reset de `receiptFile`/`receiptFileName`/`receiptExistingId`/`extraction`/`exchange` | Tareas 10.1, 10.3, 12, 13 |
| `handleFormChangeMoney` (`:355`) | `HandleChangeForeignMoney`, `handleChangeRate`, `handleToggleCopManual`, `recomputeConversion`, `fetchExchangeRate` | Tarea 12 |
| `handleSubmit` (`:378-402`) | Paso de `JSON.stringify` a **`FormData`**, con las mismas cinco reglas duras (sin `Content-Type`, `X-CSRF-Token`, `""` para vacíos, `receipt_file` solo si es `File`, `cop_manual_override` siempre) | Tarea 11 |
| `renderModal()` (`:577-763`) | Bloque de comprobante + botón de captura asistida y sus cuatro estados, bloque condicional de moneda extranjera con sus cinco estados de TRM, toggle `expense-cop-manual-toggle` y aviso de disponible presupuestal (`expense-budget-none/ok/warning`) | Tareas 10, 12, 13 |

**Invariantes que no cambian por estar en el otro archivo:** `invoice_value`/`invoice_tax`/
`invoice_total` siempre en COP; la extracción precarga solo las 15 claves de la whitelist y nunca
auto-envía; el gasto excedido **se guarda igual**; una violación `blocking: true` informa pero no
deshabilita Guardar.

---

### Tarea 18 — Modal de previsualización de comprobante (corrección 5, +3 h)

🔴 **Tarea NUEVA creada por la auditoría.** La propuesta §3.3 promete *"previsualización y descarga
desde la tabla"* y no lo implementaba nadie; el paquete 12 escribe el test E4.2 contra esto.

1. Botón por fila `expense-receipt-preview-{id}` (icono `fa-eye`), al lado del enlace de descarga
   de la columna Comprobante. Solo se pinta si `r.receipt_file && r.receipt_file.url`.
   🔴 **Alcance acotado por el cierre de la reauditoría: este paquete lo emite SOLO en
   `ExpensesTable.jsx`** (Tarea 14.1). En el **índice de Gastos** la columna "Comprobante"
   (`receipt_file`) es la **sexta columna nueva de la Tarea 2 del paquete 09**, porque vive en
   `this.columns` —el constructor de `packs/ReportExpenseIndex.js`, que §4.5 y §7.2 asignan al 09—.
   El 09 renderiza ahí `expense-receipt-link-{id}` y `expense-receipt-preview-{id}` **llamando a
   `this.openReceiptPreview(id)`, que define este paquete** en el punto 3. Era la contradicción
   entre la corrección 5 ("en las dos tablas") y la corrección 11 ("no toques el constructor"), y
   se resolvió por reparto, no por excepción: **ningún paquete edita región ajena.**
2. Contenedor `receipt-preview-modal`: `CmModal` (`size="lg"`) con
   `<iframe src={"/download_receipt/report_expenses/" + id}>` para PDF y `<img>` para imagen,
   decidido por la extensión del nombre del archivo. **Siempre contra
   `/download_receipt/report_expenses/:id`**, nunca contra la URL firmada (corrección 4).
3. Footer del modal: enlace "Descargar" a la misma ruta (`expense-receipt-link-{id}`) y botón
   Cerrar. **`openReceiptPreview(id)` y `closeReceiptPreview()` los define ESTE paquete en los dos
   componentes** —`ExpensesTable.jsx` y `packs/ReportExpenseIndex.js`—, **fuera del constructor**,
   así que no chocan con la región del 09. Son la única superficie que el 09 consume: su columna
   `receipt_file` los llama por nombre. Si se renombran, se actualiza la Tarea 2 del 09 en el mismo
   PR.
4. Estado de fallo: si el `<iframe>`/`<img>` no carga (403 por permiso, archivo borrado), el modal
   muestra `cm-alert-warning` con *"No se pudo previsualizar el comprobante. Intente descargarlo."*
   La previsualización **nunca** bloquea la descarga.

✅ **Ya no hay ambigüedad.** §4.5 y §7.6 reparten así el índice de Gastos: la **columna** (con sus
dos `data-testid`) es del **09**; el **modal y los dos métodos**, de este paquete. El 09 se mergea
antes, así que cuando este paquete llega la columna ya existe y solo hay que definir los métodos
que invoca.

---

## Pruebas unitarias (Minitest)

No hay runner de JS en el repo y montarlo no está presupuestado (§5.5). Por eso el nivel unitario de
este paquete **prueba el contrato servidor↔frontend**: las props que la vista entrega y las claves
JSON que los componentes leen. Si el backend cambia una clave, estos tests fallan antes que el
usuario lo note.

Todos los tests que creen/editen gastos, centros o partidas se envuelven en
`as_user(users(:admin)) { ... }` (§5.3, capa 2). Sin eso, `create_create_register` revienta con
`NoMethodError` sobre `User.current`.

### `test/controllers/cost_centers_controller_test.rb`

⚠️ **Este paquete NO implementa `cost_centers_controller.rb#show`** (dueño único: paquete 07, §7.2 y
§4.4). Estos cinco casos son **tests de consumo**: blindan que el `@estados` que emite el 07 trae
exactamente las 10 claves canónicas que `TabContentShow`, `BudgetsTable` y `ExpensesTable` leen por
string. Si el 07 renombra una, la pestaña desaparece en silencio y estos tests lo delatan.

| Test | Aserción |
|---|---|
| `test "show expone las claves de presupuesto en estados para un admin"` | `sign_in users(:admin)`; `get cost_center_path(cost_centers(:centro_con_viaticos))`; `assert_response :success`; `assigns(:estados)` incluye las claves `:budget_module, :budget_create, :budget_edit, :budget_delete, :budget_show_all, :is_center_owner, :expense_create, :expense_edit, :expense_delete, :expense_show_all` y todas las `budget_*`/`expense_*` son `true`. |
| `test "show deja budget_module en false para un rol sin el modulo Presupuesto"` | Usuario con rol `"Ingeniero"` sin `AccionModule` de Presupuesto → `assigns(:estados)[:budget_module] == false` y `[:budget_create] == false`. |
| `test "show marca is_center_owner true solo para el dueno del centro"` | Con `user_owner_id == current_user.id` → `true`; con otro dueño → `false`. |
| `test "show no altera las claves de estados preexistentes"` | `assigns(:estados)` sigue conteniendo `:cost_center_edit, :update_state, :show_hours, :create_materials, :edit_materials, :edit_all_materials, :delete_materials, :update_state_materials, :download_file_materials`. Caso de regresión: el `merge` de §4.4 que hace el paquete 07 no debe pisar el hash existente. |
| `test "show responde 200 aunque el ModuleControl Presupuesto no exista"` | `ModuleControl.where(name: "Presupuesto").destroy_all` (con `User.current` seteado) → `assert_response :success` y `assigns(:estados)[:budget_module] == false`. `load_permissions:587` ya devuelve `false` cuando `find_by_name` es `nil`; el test blinda ese camino. |

### `test/integration/cost_center_show_props_test.rb`

| Test | Aserción |
|---|---|
| `test "la vista entrega users_select con todos los usuarios"` | `get cost_center_path(...)`; parsear el `data-react-props` del `react_component`; `props["users_select"].size == User.count`; cada elemento tiene claves `"value"` y `"label"`. Blinda la tarea 2: `users` (`get_users_json`) solo trae Administrador/Comercial. |
| `test "la vista entrega el catalogo de monedas"` | `props["currencies"]` es un array cuyo primer elemento es `{"label" => "COP — Peso colombiano", "value" => "COP"}` y su tamaño == `Currency::CODES.size`. |
| `test "la vista entrega estados con las claves de presupuesto"` | `props["estados"]` incluye las 10 claves nuevas como booleanos. |
| `test "usuario sin permiso de Presupuesto recibe budget_module false"` | Mismo assert con un usuario sin el permiso. |

### `test/integration/budget_tab_contract_test.rb`

Contrato de A.2 / A.3 / A.4 tal como los leen `BudgetsTable` y `BudgetSummaryBoard`.

| Test | Aserción |
|---|---|
| `test "get_expense_budgets devuelve las claves que pinta la tabla"` | Cada fila tiene exactamente disponibles: `id, cost_center_id, user_id, amount, notes, active, spent, available, created_at, updated_at`, y `user`/`created_by` con la clave `names` (no `name` — `UserSerializer` expone `:id, :names`). Y `body["total"]` es Integer (no `meta`). |
| `test "get_expense_budgets devuelve amount, spent y available como strings parseables"` | `Float(row["amount"])`, `Float(row["spent"])`, `Float(row["available"])` no lanzan. Blinda `parseFloat` del frontend contra un cambio a Integer/Float en el serializer. |
| `test "get_expense_budgets respeta only_active"` | Con `only_active=true` no aparece la partida `expense_budgets(:inactiva)`. |
| `test "get_expense_budgets ignora un sort fuera de whitelist sin error"` | `?sort=spent&dir=asc` → 200 y mismo `total`. Justifica los `sortable: false` de la tarea 4. |
| `test "get_expense_budget_summary devuelve totals y by_user con las claves del tablero"` | `totals` tiene `viatic_value, assigned, unassigned, spent, available`; cada `by_user` tiene `user_id, user_name, assigned, spent, available, budgets_count, exceeded_expenses_count`. |
| `test "get_expense_budget_summary de un centro sin viaticos devuelve viatic_value 0 y by_user vacio"` | Caso borde que dispara `budget-summary-no-viatic`. |
| `test "get_expense_budget_available sin partida devuelve has_budget false y montos en cero"` | `has_budget == false` y los tres montos `"0.0"`. Es el caso que el frontend traduce a "Sin presupuesto asignado" y **no** a "$0". |
| `test "get_expense_budget_available sin cost_center_id devuelve type error"` | `body["type"] == "error"` y HTTP 200 (no 500). El frontend cae al estado "No disponible". |
| `test "get_expense_budgets responde 403 a un usuario sin permiso"` | `assert_response :forbidden` y `body["type"] == "error"`. Es el caso que la tabla pinta como `budget-table-error`. |

### `test/integration/expense_form_multipart_test.rb`

Contrato del envío que la tarea 11 introduce.

| Test | Aserción |
|---|---|
| `test "crea un gasto enviado como multipart form data"` | `as_user(users(:admin)) { post report_expenses_path, params: {…, receipt_file: fixture_file_upload("comprobante.pdf", "application/pdf")} }` sin `as: :json` → `body["type"] == "success"` y `ReportExpense.last.receipt_file.url` presente. |
| `test "crea un gasto multipart sin archivo adjunto"` | Sin `receipt_file` → `type == "success"` y `receipt_file` nulo en `register`. Blinda la regla 4 de la tarea 11 (no mandar `"[object Object]"`). |
| `test "los campos vacios enviados como string vacio no rompen el create"` | `foreign_value: "", exchange_rate: "", currency: ""` → `type == "success"` y `currency == "COP"` (default de columna). Blinda la regla 3 de la tarea 11. |
| `test "el register de la respuesta trae las claves que la tabla pinta"` | `register` incluye `budget_status`, `budget_reason`, `currency` y `receipt_file`. |
| `test "un archivo .exe es rechazado"` | `fixture_file_upload("malicioso.exe", "application/octet-stream")` → `body["type"] == "error"` y `ReportExpense.count` no cambia. |
| `test "no se puede setear budget_status por mass assignment"` | `post` con `budget_status: "aprobado"` → el registro creado queda en `"sin_presupuesto"` (o el que decida el servicio), **nunca** el enviado. |
| `test "no se puede setear accounting_approved por mass assignment"` | Igual, `accounting_approved == false`. |
| `test "actualiza un gasto por multipart conservando el comprobante existente"` | `PATCH` sin `receipt_file` sobre un gasto que ya lo tiene → la URL del comprobante no cambia. Caso borde que rompe si el controller hace `update` con `receipt_file: nil`. |

**Archivos de apoyo**: `test/fixtures/files/comprobante.pdf` y `test/fixtures/files/malicioso.exe`
**ya existen** — los crea el **paquete 01**, dueño único de `test/fixtures/files/**` (§7.2 y §7.12).
Este paquete solo los **consume**; no los crea ni los sobrescribe.

**Total: 26 tests unitarios/de integración.**

---

## Pruebas E2E (Playwright)

> **RETIRADA por auditoría (corrección 8).** Este paquete **no escribe ningún spec de Playwright**.
> Los cuatro que tenía —`presupuesto-crear-partida.spec.js`, `presupuesto-excede-tope.spec.js`,
> `gasto-estado-presupuestal.spec.js` y `gasto-comprobante.spec.js`— quedan **borrados**: todos los
> specs funcionales son del **paquete 12** (§7.2), que ya los cubre en `budget.spec.js`,
> `receipt.spec.js` y `ai-capture.spec.js`.
>
> La infraestructura de Playwright (`test/e2e/package.json`, `playwright.config.js`, `global-setup`,
> `auth.setup`, `env.js`, `db.js`, `smoke.spec.js` y `db/seeds/e2e.rb`) es del **paquete 01** y ya
> está (corrección 9). La antigua Discrepancia 8 —"la monta el primer paquete que escriba un E2E"—
> **queda derogada**.

**Lo que este paquete SÍ debe a los E2E** (es su única obligación en este nivel):

1. **Emitir los `data-testid`** de la Tarea 15, que son los de la tabla canónica §7.6. Si falta uno,
   el spec del 12 no encuentra el selector y falla ahí, no en el 12.
2. **Respetar la trampa de `react-select`** (§5.2): con `menuPortalTarget: document.body` las
   opciones se renderizan **fuera** del modal, así que el `data-testid` va en un `<div>` envolvente
   y el 12 las busca en `page`, nunca en el locator del modal.
3. **Declarar al paquete 12 los datos que sus specs necesitan** de `db/seeds/e2e.rb` (dueño: 01):
   un centro con `viatic_value = 5_000_000.0` y `user_owner_id` = el usuario E2E, sin partidas al
   arrancar, y el rol E2E con las cinco acciones de `"Presupuesto"`. Este paquete **no edita el
   seed**; lo pide.

**Total: 0 specs E2E en este paquete.**

---

## Criterios de aceptación

Cada ítem se marca sí/no sin opinar.

**Pestaña Presupuesto**

1. [ ] La pestaña `"Presupuesto"` aparece en el detalle del centro de costos para un admin y **no**
   aparece para un usuario sin `Presupuesto / Ingreso al modulo`.
2. [ ] La pestaña se agrega **después** de "Gastos" y las pestañas preexistentes conservan sus ids
   (un centro con cotizaciones sigue abriendo en la misma pestaña por defecto que antes).
3. [ ] El tablero muestra los seis números (`viatic_value`, `assigned`, `unassigned`, `spent`,
   `available`, excedidos) con formato `$1.234.567`.
4. [ ] Con el resumen cargando se ve `budget-summary-loading`; con el endpoint caído se ve
   `budget-summary-error` con botón Reintentar que vuelve a pedir el resumen.
5. [ ] Con cero partidas se ve `budget-summary-empty` y el `emptyMessage` de la tabla; con
   `viatic_value` nulo o 0 se ve `budget-summary-no-viatic`.
6. [ ] `this.columns` de `BudgetsTable` está declarado **completo en el constructor**; ninguna
   columna se añade en `componentDidMount` ni en un `setState`.
7. [ ] Las columnas `spent`, `available`, `notes` y `created_by_name` tienen `sortable: false`.
8. [ ] `CmDataTable` recibe `serverPagination` **y** `serverMeta` con las cuatro claves, y `onSearch`,
   `onSort`, `onPageChange`, `onPerPageChange`.
9. [ ] `loadData` y `loadSummary` tienen `.catch` y pintan el estado de error (no se quedan en
   esqueleto).
10. [ ] El menú de fila usa `cm-dt-menu` / `cm-dt-menu-trigger` / `cm-dt-menu-dropdown` con el
    dropdown como hermano inmediato del trigger y `window.cmOpenMenu`.

**Validación en vivo de la partida**

11. [ ] Con `amount` mayor que el disponible para asignar, `budget-block-message` es visible y
    `budget-submit` está `disabled`; no se emite ningún `POST /expense_budgets`.
12. [ ] Al editar una partida activa, el propio monto de la partida se devuelve al límite (se puede
    guardar la misma partida sin cambios sin que se bloquee).
13. [ ] Con la partida marcada como inactiva no se aplica la regla de tope.
14. [ ] Asignar exactamente el disponible (hasta el último peso) **no** se bloquea (tolerancia
    `0.005`).
15. [ ] Con el resumen aún cargando o caído (`limit === null`) el formulario **no** bloquea por tope.
16. [ ] `has_budget: false` se muestra como `"Sin presupuesto asignado"` y nunca como `"$0"`.
17. [ ] Un error del servidor (`type: "error"`) se pinta en `budget-server-error` y el modal **no** se
    cierra.
18. [ ] Después de crear, editar o eliminar una partida se recarga la tabla **y** el resumen.
19. [ ] El cuerpo de `POST /expense_budgets` es JSON **plano** (sin `{ expense_budget: {...} }`) y
    lleva `X-CSRF-Token`.
20. [ ] `PATCH /expense_budgets/:id` **no** envía `cost_center_id` ni `user_id`.

**Formulario de gasto**

21. [ ] `HandleClick` envía `FormData` y **no** setea el header `Content-Type`.
22. [ ] `receipt_file` se agrega al `FormData` solo si es una instancia de `File`.
23. [ ] Todos los campos de texto se envían como `""` cuando están vacíos (nunca `"undefined"`).
24. [ ] `clearValues()` resetea `receiptFile`, `receiptFileName`, `receiptExistingId`, `extraction`,
    `exchange`, los siete campos de moneda y `cop_manual_override`; abrir "Nuevo Gasto" tras editar
    uno con comprobante no arrastra el archivo anterior.
25. [ ] El select de Moneda es visible siempre; el bloque `expense-foreign-block` solo aparece cuando
    `currency !== "COP"` y desaparece (limpiando los siete campos) al volver a COP.
26. [ ] `invoice_value`, `invoice_tax` e `invoice_total` **siempre** contienen COP; el valor
    extranjero nunca se escribe en ellos.
27. [ ] `foreign_total` se recalcula como `foreign_value + foreign_tax` y es de solo lectura.
28. [ ] Si `GET /get_exchange_rate` devuelve `rate_date != requested_date`, se muestra
    `expense-rate-shifted` con ambas fechas.
29. [ ] Si `GET /get_exchange_rate` falla, se muestra `expense-rate-error`, el campo TRM queda
    editable y **el guardado no se bloquea**.
30. [ ] Editar la TRM a mano deja `exchange_rate_source = "manual"`; marcar
    `expense-cop-manual-toggle` (o editar los tres campos en COP) deja además
    `cop_manual_override = true`, y ese campo **viaja en el `FormData`** de todo save.
31. [ ] `expense-extract-btn` está deshabilitado sin archivo y mientras `status === "loading"`.
32. [ ] La extracción solo escribe las 15 claves de la whitelist; un `budget_status` o
    `accounting_approved` en la respuesta se ignora.
33. [ ] Un campo `null` en `fields` deja el input **vacío** (no se rellena con placeholder ni con el
    valor previo).
34. [ ] Tras una extracción exitosa el formulario **no** se envía solo: hace falta pulsar Guardar.
35. [ ] Una extracción fallida muestra `expense-extract-error` y el formulario sigue 100 % editable.
36. [ ] Los `warnings` y las `rule_violations` se muestran; una violación `blocking: true` **no**
    deshabilita Guardar.
37. [ ] `expense-budget-warning` aparece cuando el gasto excede el disponible y el botón Guardar
    **sigue habilitado**.
38. [ ] La tabla de gastos muestra la columna **Comprobante** (enlace de descarga + botón de
    previsualización, o icono de ausencia), declarada en el constructor y con `sortable: false`; y
    **no** se agregaron aquí las columnas `id`, `budget_status`, `currency`, `foreign_total` ni
    `accounting_approved` (son del Paquete 09). Ver también el criterio 47.
39. [ ] El `estados` hardcodeado de `ExpensesTable.jsx:211` ya no existe; los flags salen de
    `this.props.estados`.

**Transversal**

40. [ ] Todos los componentes nuevos son de **clase**; `grep -n "useState\|useEffect\|useMemo"` sobre
    **todos** los archivos de React que este paquete crea o modifica (los 3 `Budget*.jsx` nuevos,
    `TabContentShow.jsx`, `ConstCenter/show.jsx`, `ExpensesTable.jsx`, `ReportExpense/FormCreate.jsx`
    y `packs/ReportExpenseIndex.js`) devuelve 0 líneas.
41. [ ] No se agregó ninguna regla CSS dentro del `<style>` inline de `FormCreate.jsx`; las tres
    clases `cm-budget-*` están en `design_system.css`.
42. [ ] La clase usada para el input de archivo es `cm-file-input` (existe) y no `cm-input-file` (no
    existe).
43. [ ] Los 60+ `data-testid` de la tarea 15 están presentes, **con los nombres de §7.6** y **dos
    veces** los `expense-*` de formulario (en `FormCreate.jsx` y en `renderModal()`).
44. [ ] `./bin/webpack` compila sin errores y `package.json` no cambió.
45. [ ] `bin/rails test test/controllers test/integration` corre con 0 failures y 0 errors.
46. [ ] **RETIRADO por auditoría (corrección 8).** Este paquete no escribe specs de Playwright; los
    escribe el paquete 12. El criterio equivalente aquí es el 43 (emitir los `data-testid`).

**Alcance ampliado por la auditoría**

47. [ ] El enlace del comprobante apunta a `/download_receipt/report_expenses/{id}` y **nunca** a
    `r.receipt_file.url`; `grep -rn "expense-receipt-download" app/javascript` devuelve 0 líneas y
    `grep -rn "receipt_file.url" app/javascript` solo aparece como condición de existencia, nunca
    como `href`.
48. [ ] `app/controllers/cost_centers_controller.rb` **no aparece en el diff** de este paquete
    (dueño: 07).
49. [ ] `packs/ReportExpenseIndex.js` tiene comprobante, bloque de moneda extranjera, captura
    asistida y aviso de disponible presupuestal; su `handleSubmit` envía `FormData` sin
    `Content-Type`; y el diff de este paquete sobre ese archivo **no toca** el constructor, el panel
    de filtros ni `loadData`/`getExportUrl`/`acceptFilteredExpenses` (son del 09).
50. [ ] `receipt-preview-modal` abre desde `expense-receipt-preview-{id}` en las dos tablas, muestra
    el PDF/imagen contra `/download_receipt/report_expenses/{id}` y degrada a aviso si no carga.
    En el índice de Gastos el **botón lo emite el 09** (columna `receipt_file` de su Tarea 2): lo
    que verifica este criterio ahí es que `this.openReceiptPreview(id)` exista, esté enlazado y
    abra el modal. Si el botón no está, el bloqueado es el 09, no este paquete.

---

## Riesgos y trampas

1. **`this.columns` fuera del constructor mata columnas en silencio.** `CmDataTable` copia
   `props.columns.map(c => c.key)` a `state.visibleColumns` **en su propio constructor**
   (`CmDataTable.jsx:16`) y nunca lo resincroniza. Una columna calculada en `componentDidMount` o
   dependiente de un `estados` que llega después no se pinta y no hay error en consola.
2. **`serverMeta` faltante degrada a paginación de cliente sin avisar.** `CmDataTable.jsx:222` exige
   `serverPagination && serverMeta`; si `serverMeta` es `undefined` el componente pagina localmente
   los 50 registros de la página actual mostrando 10, y el usuario cree que solo hay 10 partidas.
3. **Columnas ordenables que no ordenan.** `CmDataTable` hace toda columna ordenable salvo
   `sortable: false`, y la whitelist del servidor (A.2) solo acepta cinco claves. Sin los
   `sortable: false` de la tarea 4, el usuario hace clic, la flecha cambia y los datos no.
4. **`Content-Type` en un `FormData` destruye la subida.** Si el agente copia el header del
   `HandleClick` viejo (`ExpensesTable.jsx:166`), el navegador no escribe el `boundary`, Rails recibe
   un body ilegible y **el gasto se crea sin comprobante y sin error visible**.
5. **`clearValues()` incompleto = comprobante cruzado.** Es el bug más probable de todo el paquete:
   crear un gasto con PDF, cerrar, abrir "Nuevo Gasto" y guardar sube el PDF del gasto anterior al
   nuevo. La tarea 10.3 lo cubre; verificarlo a mano además del E2E del paquete 12. **Y dos veces**:
   el mismo reset va en `EMPTY_FORM` de `packs/ReportExpenseIndex.js` (Tarea 17).
6. **`data.type` ignorado.** El `.then` actual de `ExpensesTable:168-175` muestra "Guardado" pase lo
   que pase. Todos los `fetch` nuevos deben discriminar por `type` (§3: los errores de validación son
   **HTTP 200**).
7. **`.catch` ausente = esqueleto eterno.** `ExpensesTable.loadData` no lo tiene; copiarlo tal cual
   reproduce el problema en la pestaña nueva.
8. **`users` ≠ `users_select`.** `get_users_json` filtra a `Administrador` y `Comercial`
   (`application_helper.rb:190`). Si el agente reutiliza `props.users` para el select de beneficiario,
   la mitad de la plantilla no aparecerá y nadie lo notará hasta producción.
9. **`user_id` en `expense_budgets` es el BENEFICIARIO, no el creador** (§1.1). Escribir
   `user_id: current_user.id` desde el frontend rompe todo el control de cupo. El formulario **siempre**
   toma el `user_id` del select.
10. **Aritmética con strings.** `amount`, `spent`, `available` y todos los `totals` llegan como string
    (`BigDecimal` serializado). `"500000.0" + "100000.0"` en JS es `"500000.0100000.0"`. Siempre
    `parseFloat` primero.
11. **Float vs decimal en el tope.** `unassigned = viatic_value(float) - assigned(decimal)` puede
    devolver `1799999.9999999998`. Sin la tolerancia `0.005` de la tarea 7, asignar el disponible
    exacto es imposible y el usuario no entiende por qué.
12. **Bloquear el gasto excedido es un defecto, no una mejora.** El paquete bloquea la **partida**
    (tope del centro) e **informa** en el gasto. Invertirlo contradice la propuesta §3.2 y §2.1.
13. **`react-select` portaliza el menú.** `menuPortalTarget: document.body`: los `data-testid` deben ir
    en un `<div>` envolvente, y en Playwright las opciones se buscan en `page`, no en el modal. El
    select de centro de costo además exige 3 caracteres y una espera de red (`/search_cost_centers`).
14. **El `<style>` de `FormCreate.jsx:402-512` es global.** Define `.cm-input`, `.cm-label`,
    `.cm-form-grid-*` sin scope y pisa `design_system.css` mientras el modal está montado. Ampliarlo
    empeora un problema existente; las clases nuevas van al stylesheet.
15. **`.cm-input-file` no existe; `.cm-file-input` sí.** La arquitectura §4.5 nombra la clase al revés.
    Usar la que existe (`design_system.css:1741`) y no agregar CSS por este motivo.
16. **URL firmada con expiración — RESUELTO por la corrección 4.** Si §6.5 se resuelve con
    `fog_public = false`, `receipt_file.url` caduca en 600 s. Por eso **ningún `href` de este paquete
    usa esa URL**: todos apuntan a `/download_receipt/report_expenses/:id` (paquete 06, §7.8), que
    resuelve la firma en el momento del clic y además fuerza `Content-Disposition: attachment`.
    `receipt_file.url` solo se usa como **condición de existencia** (`r.receipt_file && ...url`),
    nunca como destino. Tampoco se cachea en `localStorage` ni en estado que sobreviva a `loadData`.
17. **El espejo de `packs/ReportExpenseIndex.js` — YA NO ES UN AGUJERO** (corrección 1). Este
    paquete es el dueño único de los dos formularios y la Tarea 17 lo implementa (+6 h, §7.13). Lo
    que queda como **riesgo de ejecución**, no de alcance: es el único archivo que tocan dos
    paquetes, así que la regla anticolisión de la corrección 11 no es negociable — el 08 edita solo
    `renderModal()` (`:577-763`), `EMPTY_FORM` (`:31-44`), `handleFormChangeMoney` (`:355`) y
    `handleSubmit` (`:378-402`); el 09 solo el constructor, los filtros y
    `loadData`/`getExportUrl`/`acceptFilteredExpenses`. Si el índice queda a medias, el usuario ve
    columnas de moneda y estado presupuestal que no puede llenar desde esa pantalla, y el
    `ai-capture.spec.js` del 12 falla.
18. **Conflicto de git garantizado en `ExpensesTable.jsx` con el Paquete 09.** Los dos paquetes
    escriben en `this.columns` y el 09 además toca `CmDataTable.jsx`. Mergear sin leer el reparto de
    Dependencias termina en columnas duplicadas o en la columna de comprobante borrada. Resolución
    del conflicto: **conservar ambos lados**.
19. **`data-testid` compartidos.** `expense-budget-status-{id}` lo define el 09 y lo consumen los
    specs del **paquete 12**. Si el 09 lo renombra, esos specs se caen. La fuente única es la tabla
    **§7.6**: ningún paquete inventa ni renombra un `data-testid` sin actualizarla en el mismo PR.
20. **Tocar `CmButton` es tocar toda la app.** Si no reenvía `disabled`/`data-testid`, usar `<button>`
    directo en el footer del modal en vez de modificar el componente compartido.
21. **`report_expense_options` llega por props del servidor y no se recarga.** Si la extracción
    sugiriera un tipo o medio de pago, habría que validar el id contra las listas ya cargadas; por eso
    la tarea 13 los excluye de la precarga.
22. **Sin CI (§5.5)**, el único semáforo de este paquete es `bin/rails test` local (26 casos) más el
    `./bin/webpack`. La suite E2E la corre el **paquete 12** sobre la UI ya mergeada; si este
    paquete no emite un `data-testid` de §7.6, el fallo aparece allá y vuelve como retrabajo.
    Correr los dos semáforos antes de cada despliegue a staging es parte del paquete, no opcional.

---

## Discrepancias con la arquitectura

Ninguna de estas cambia una decisión del documento base; son correcciones de detalle verificadas en
el repo. Se listan para que `00-ARQUITECTURA.md` se actualice. **La auditoría ya resolvió las
discrepancias 1, 3, 6, 7 y 8**; se conserva su numeración y se marca el desenlace.

1. ✅ **RESUELTA a favor de este paquete (corrección 7).** §4.5 — nombre de la clase CSS del input de
   archivo. El documento decía que `.cm-input-file` no existe y que "si el input de archivo la
   necesita, se agrega a `design_system.css`". La clase que existe y que ya se usa para el avatar es
   **`.cm-file-input`** (`design_system.css:1741`). Este paquete la reutiliza y **no** agrega CSS por
   ese motivo. §4.5 fue corregida y el paquete 06 borró su tarea A9.
2. **§4.5 / §3 A.2 — `users` disponible en la pestaña.** El documento no menciona qué lista de
   usuarios alimenta el select de beneficiario. La que llega hoy a los componentes de
   `ShowConstCenter` es `get_users_json`, filtrada a `Administrador` y `Comercial`
   (`application_helper.rb:190`), inservible para asignar partidas a ingenieros. Este paquete propaga
   `users_select` (`get_users_select`, todos los usuarios, `application_helper.rb:212-220`) como
   prop nueva. Es un requisito faltante del documento base, no una desviación.
3. ✅ **RESUELTA a favor de este paquete (corrección 6).** §4.4 — dónde se calcula la propiedad del
   centro. El documento definía `@estados` con `budget_perms` pero sin la propiedad del centro, que
   A.5/A.6/A.7 sí exigen ("ser `cost_center.user_owner_id` o tener `Ver todos`"). La clave
   **`is_center_owner`** entró en el juego canónico de 10 claves de §4.4, y **la escribe el paquete
   07**, no este. Este paquete solo la lee para esconder el botón. **La regla sigue verificándose en
   el servidor**; el flag es solo cosmético.
4. **§3 A.2 — orden por columnas calculadas.** La whitelist de `sort` no incluye `spent` ni
   `available`, que sí son columnas visibles de la tabla. No se pide ampliarla (implicaría ordenar por
   una expresión agregada); se resuelve marcándolas `sortable: false`. Queda anotado por si el cliente
   pide ordenar por disponible: es alcance nuevo con impacto en la consulta de A.2.
5. **§3 D.1 — `type_identification_id` y `payment_type_id` no se extraen.** El contrato no los
   devuelve, así que el formulario los deja siempre en manos de la persona. Si el paquete de IA
   decidiera devolverlos, este frontend debe validarlos contra las opciones ya cargadas antes de
   setearlos — no está implementado.
6. ✅ **INCORPORADA a la arquitectura.** El documento base no repartía `ExpensesTable.jsx` entre
   paquetes. El reparto por bloque que este documento proponía **subió a `00-ARQUITECTURA.md` §4.5 y
   §7.2** como regla vinculante: columnas y filtros de las dos tablas de gastos → **09**; los dos
   formularios de gasto → **08**. Ya no vive solo en un paquete.
7. ✅ **RESUELTA (corrección 1).** `packs/ReportExpenseIndex.js` **ya tiene dueño para su modal: este
   paquete**. §4.5 fija el reparto y §7.13 contabiliza las **+6 h**. Se implementa en la Tarea 17.
   Ya no hace falta ninguna decisión pendiente ni backlog.
8. ⛔ **DEROGADA (corrección 9).** Decía que la infraestructura de Playwright la monta "el primer
   paquete que escriba un E2E". Es del **paquete 01** (§7.2) y ya está. Además este paquete **no
   escribe ningún spec**: los cinco flujos funcionales son del **paquete 12** (corrección 8).

---

## Objeciones a la auditoría

Ninguna corrección se revoca ni se ignora: el bloque del inicio manda. Esto es lo que quedó sin
cerrar y hay que resolver **antes** de empezar la Tarea 18, con el dueño del paquete 09.

1. ✅ **CERRADA. La columna del índice es del 09; el modal y los métodos, de este paquete.**
   La corrección 5 obligaba a poner `expense-receipt-preview-{id}` y `expense-receipt-link-{id}`
   **"en las dos tablas"**, y la columna del índice vive en el **constructor** (`this.columns`) de
   `packs/ReportExpenseIndex.js`, que la corrección 11 —y §4.5, y la fila "`this.columns` / filtros
   de las dos tablas de gastos → 09" de §7.2— le prohíben tocar a este paquete. Era imposible
   cumplir las dos, y en el módulo de Gastos no quedaba columna de comprobante en absoluto (la
   Tarea 2 del 09 listaba 4 columnas y ninguna era esa). **Resolución adoptada —la que este mismo
   documento proponía—:** el **09** agrega una **sexta columna `receipt_file` ("Comprobante")** a
   su Tarea 2, que renderiza el enlace `expense-receipt-link-{id}` y el botón
   `expense-receipt-preview-{id}` invocando `this.openReceiptPreview(id)`; **este paquete conserva
   solo** la definición de `openReceiptPreview` / `closeReceiptPreview` y el modal
   `receipt-preview-modal`, que viven fuera del constructor. Está escrito en §4.5 y en §7.6, y en
   la Tarea 2 del 09. En `ExpensesTable.jsx` nunca hubo ambigüedad: esa columna sigue siendo de
   este paquete.

2. ✅ **`test/controllers/cost_centers_controller_test.rb`: CERRADA. Es de este paquete.** Al
   retirarse la Tarea 1, el código de `@estados` pasó al **07**, pero el 07 no declaraba ese archivo
   de test y §7.2 no lo asignaba a nadie. **§7.2 tiene ahora fila propia: dueño 08, "test de
   consumo"**, precisamente porque lo que blinda son las 10 claves que el frontend lee **por
   string**. El 07, dueño del código, **no crea este archivo**.

3. ✅ **Entrega del catálogo de monedas: CERRADA. Gana `window.CM_CURRENCIES`.** Había dos
   mecanismos vivos —props desde `cost_centers/show.html.erb` (este paquete) y el global del
   paquete 05 en `layouts/user.html.erb`— y ninguna corrección había elegido. §4.5 fija ahora la
   **fuente única: `window.CM_CURRENCIES`**, precisamente porque el modal del índice de Gastos
   (Tarea 17) **no recibe props** y con el mecanismo anterior se quedaba sin catálogo. La prop
   `currencies` sale de la Tarea 12 y `app/views/cost_centers/show.html.erb` sale de la tabla "A
   modificar" (con eso, además, deja de ser un archivo sin dueño en §7.2). El fallback
   `[{ value: "COP", label: "COP — Peso colombiano" }]` se conserva.
