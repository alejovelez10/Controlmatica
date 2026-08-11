# Paquete 09 — Frontend: columnas nuevas, indicadores y pantalla de Contabilidad

## 🔴 CORRECCIONES DE AUDITORÍA (vinculantes — leer ANTES que el resto del documento)

> Estas correcciones **mandan sobre cualquier texto de este archivo** que las contradiga.
> Consolidadas en `00-ARQUITECTURA.md` §7.

1. 🔴 **Este paquete es el dueño ÚNICO de la pantalla de Contabilidad** (§7.2):
   `app/javascript/packs/AccountingExpenseIndex.js` y
   `app/views/accounting_expenses/index.html.erb`. El paquete **06 borró su bloque B10** y
   conserva solo el backend (B1–B9) y sus tests de controller. Motivo: este paquete es el que
   tiene la selección múltiple y el trabajo sobre `CmDataTable`.
   **Prefijo canónico de `data-testid`: `accounting-*`** (§7.6). Quedan derogados los `acc-*` del
   06.
2. 🔴 **Tu "bloqueante adicional" está RESUELTO: `ids[]` ES un filtro válido** de
   `PATCH /update_accounting_filter_values` (decisión en §C.4). El paquete 06 ya lo implementa:
   `params.permit(ids: [])`, `scope.where(id: params[:ids])`, `:ids` dentro de `FILTER_KEYS`, tope
   de 500 aplicable también a `ids[]`, y `count` = filas efectivamente actualizadas.
   **El "Plan B" de N requests secuenciales queda descartado y no se implementa**; tus criterios
   37–42 (una sola request con `ids[]`) son los válidos. La decisión ya está tomada: no hay nada
   que decidir "antes de empezar la tarea 17".
3. **Este paquete es el dueño ÚNICO del ítem de menú "Contabilidad"** (§4.4): el bloque de
   `app/views/layouts/user.html.erb` (con `data-testid="nav-contabilidad"`), la línea de
   `expense_controllers`, el branch de `controller_name_helper` y el helper — cuyo nombre único es
   **`authorization_accounting_expenses`**. Los paquetes 06 y 07 solo declaran la dependencia.
   **Regla de orden, sin excepción: la ruta antes que el ítem.** Como el 06 (dueño de la ruta) va
   en una ola anterior, este paquete **sí** puede usar `accounting_expenses_path`.
4. **Se BORRAN los 5 specs E2E de este paquete** (`accounting.spec.js` y los demás). Todos los
   specs funcionales son del **paquete 12** (§7.2), que ya escribe `accounting.spec.js` completo.
   La obligación de este paquete es **emitir los `data-testid`** de la tabla canónica §7.6.
5. **Cobertura — riesgo aceptado por escrito, con mitigación.** Este paquete tiene 46 criterios de
   aceptación, ~30 de comportamiento puramente de cliente (ciclo de vida de `selectedIds`,
   `indeterminate` por ref, `colSpan`, tope de 500, degradación sin `serverMeta`) y **no hay
   runner de JS en el repo** (§5.5). Se acepta el riesgo, con tres obligaciones:
   - **Tres escenarios negativos baratos** que este paquete **encarga al paquete 12** y que se
     agregan al contrato entre ambos: renderizar con `estados.approve = false` (sin checkboxes ni
     menú de fila), con `estados.export = false` (sin enlace de exportación), y con una respuesta
     **403** (mensaje correcto y tabla vacía).
   - **Verificación manual obligatoria antes del merge**: `grep -rn "selectable" app/javascript/`
     para confirmar que ninguna de las ~20 pantallas que comparten `CmDataTable` recibe la prop
     nueva sin quererlo (criterio 15).
   - El riesgo queda **anotado en el PR**, no en un documento aparte.
6. 🔴 **`test/fixtures/accion_modules_rols.yml` NO existe y no se crea.** Corrige tu tabla de
   dependencias: la fixture requerida es **`rols.yml`**, con el HABTM inline (decisión del paquete
   01, §7.2). Lo mismo aplica al paquete 10.
7. **Numeración canónica (§7.1)** — tu propia nota dice que las dependencias están **inferidas**.
   Las reales: **01** (infra de pruebas y `data-testid` base), **02** (esquema), **04**
   (`budget_status` y `BUDGET_STATUS_LABELS`), **05** (campos de moneda en el serializer), **06**
   (backend de contabilidad, rutas y `ids[]`), **07** (serializer extendido, filtros, whitelists de
   orden, `@estados`). Citar siempre número **y** nombre de archivo.
8. **Catálogo de monedas: el helper se llama `get_currencies` y lo crea el 05.**
   🔴 **Corregido en el cierre de la reauditoría:** la regla anterior ("crear `currency_options`
   solo si el 05 no lo creó, con grep previo") era una **bifurcación en tiempo de ejecución** —que
   §7.10 y el README §8 prohíben— y además con el nombre equivocado: el 05 crea **`get_currencies`**,
   no `currency_options`, así que el grep nunca lo habría encontrado y este paquete habría creado un
   helper duplicado del mismo catálogo. **Afirmación, no condicional: `get_currencies` ya existe, lo
   creó el 05 (ola 3a); este paquete solo lo CONSUME.** Sin grep y sin creación condicional.
9. **Este paquete se mergea ANTES que el 08** (§7.3). Es la forma en que se rompió el ciclo
   08 ↔ 09: el 08 consume `expense-budget-status-{id}`, que produce este paquete.
   Regla anticolisión en `packs/ReportExpenseIndex.js`: este paquete edita **solo** el constructor
   (`this.columns`), el panel de filtros y `loadData`/`getExportUrl`/`acceptFilteredExpenses`; el
   **08** edita **solo** `renderModal()`, `EMPTY_FORM` y los tres handlers del formulario.

> Coherente con `docs/plan-gastos-ia/00-ARQUITECTURA.md`. Las desviaciones están en la sección
> **Discrepancias con la arquitectura** al final; ninguna se resuelve en silencio.
> Este paquete es **solo frontend + su cableado Rails mínimo** (vista, ruta de menú, helpers de
> layout). No crea controllers de datos, no crea migraciones, no crea servicios.

---

## Objetivo

Que las dos tablas de gastos que ya existen (módulo de Gastos y pestaña del centro de costos)
muestren ID de referencia, estado presupuestal con su motivo, moneda con valores extranjeros y
aprobación contable; que el panel de filtros del módulo de Gastos filtre por esos tres estados
nuevos; y que exista una pantalla de **Contabilidad** enlazada desde el menú, con paginación de
servidor, filtros propios, aprobación individual, aprobación por selección múltiple y export a
Excel.

---

## Dependencias

Este paquete pinta datos y llama endpoints que **otros paquetes producen**. No puede mergearse
antes que ellos, pero **sí puede escribirse y revisarse en paralelo**.

Numeración canónica de §7.1 (corrección 7): las dependencias reales son **01, 02, 04, 05, 06 y
07**, citadas siempre con número **y** nombre de archivo.

| Necesito de | Qué exactamente | Por qué bloquea |
|---|---|---|
| **01** — `01-infraestructura-de-pruebas.md` | `bin/rails test` corriendo, `Devise::Test::IntegrationHelpers` en `test_helper.rb`, fixtures de `users`, **`rols` (con el HABTM de acciones inline)**, `module_controls`, `accion_modules`, `cost_centers`, `report_expenses` sanas; los `data-testid` base (`cm-datatable`, `cm-datatable-row`, `nav-gastos`); y `lib/tasks/permissions_gastos_ia.rake` ejecutado con `ModuleControl "Contabilidad"` + `"Ingreso al modulo"`, `"Aprobar"`, `"Exportar a excel"`, `"Ver todos"` | Sin eso no se puede escribir ni un test de vista/menú; y sin el módulo en BD, `has_menu_permission?("Contabilidad")` es `nil` y el ítem de menú nunca aparece |
| **02** — `02-migraciones-y-esquema.md` | Las migraciones `20260401000002` (`budget_status`, `budget_reason`, `expense_budget_id`), `20260403000001` (campos de moneda) y las de contabilidad (`accounting_approved*`) | Sin las columnas no hay dato que pintar |
| **04** — `04-presupuesto-y-aprobacion.md` | `budget_status` / `budget_reason` calculados de verdad y `ReportExpense::BUDGET_STATUS_LABELS` | Sin el cálculo, la columna de estado presupuestal muestra datos falsos |
| **05** — `05-multimoneda-y-trm.md` | `Currency::CATALOG`, `Currency.options` y el helper `get_currencies` (dueño del catálogo de monedas; **no** `currency_options`, que no existe), más `window.CM_CURRENCIES` en el layout (§4.5). Los 7 campos de moneda en el JSON los expone el **07**, dueño único de `ReportExpenseSerializer` | Sin ellos las columnas de moneda quedan vacías y el select de filtro por moneda queda mudo |
| **06** — `06-comprobante-y-contabilidad.md` | `AccountingExpensesController` completo con las 5 rutas del Bloque C, `@estados` con `approve`/`export`/`show_all`, plantilla `download_file.xlsx.axlsx`, `accounting_approved*` en el serializer, `belongs_to :accounting_approved_by` y **`ids[]` aceptado como filtro válido en `PATCH /update_accounting_filter_values`** (§C.4, ya resuelto: ver corrección 2) | Es el backend literal de la pantalla nueva y el contrato de la aprobación por selección múltiple |
| **07** — `07-api-permisos-y-rutas.md` | `params[:q]` en `get_report_expenses` (F.1), filtros `currency`, `budget_status`, `accounting_approved`, whitelist de orden ampliada con `id`, `currency`, `budget_status`, `accounting_approved` en `get_report_expenses` **y** con `id`, `currency`, `budget_status` en `get_cost_center_report_expenses` (F.2), serializer extendido y `@estados` | Sin la whitelist, hacer clic en el header de una columna nueva ordena por `created_at` **en silencio** |

**No dependo de**: comprobante adjunto, extracción con IA, tools MCP, agente de WhatsApp.

---

## Archivos

### Crear

| Ruta | Qué se hace |
|---|---|
| `app/javascript/packs/AccountingExpenseIndex.js` | Pack gordo (estilo `ReportExpenseIndex.js`, `React.createElement`, sin JSX) con la pantalla completa de Contabilidad |
| `app/views/accounting_expenses/index.html.erb` | Dos líneas: `javascript_pack_tag` + `react_component` con las props de la pantalla |
| `test/controllers/accounting_expenses_view_test.rb` | Tests de render de la vista y del gate de entrada al módulo (solo la superficie que crea este paquete) |
| `test/helpers/application_helper_menu_test.rb` | Tests de `authorization_accounting_expenses` y `controller_name_helper` |
| `app/javascript/generalcomponents/expenseIndicators.js` | **Faltaba en esta tabla** (lo crea la Tarea 1): `budgetStatusBadge`, `accountingBadge` y los helpers de formato de las columnas. Archivo **nuevo y compartido**: §7.2 le fija dueño **09**, y el **08 lo importa** desde `renderModal()` y `ExpensesTable.jsx` sin modificarlo |
| `test/integration/expense_menu_test.rb` | **Faltaba en esta tabla** (lo exige el criterio 43): render del ítem de menú "Contabilidad" según permisos |

> **Retirado de esta tabla por auditoría (corrección 4):** `test/e2e/specs/accounting.spec.js`.
> Todos los specs E2E funcionales son del **paquete 12** (`12-e2e-playwright.md`, §7.2).

### Modificar

| Ruta | Qué se hace |
|---|---|
| `app/javascript/packs/ReportExpenseIndex.js` | **6 columnas nuevas** en `this.columns` (constructor) —`id`, `budget_status`, `currency`, `foreign_total`, `accounting_approved` y **`receipt_file`**, esta última agregada por el cierre de la reauditoría (§4.5)—, `data-testid="expense-new"` en el botón "Nuevo gasto" del `headerActions`, 3 filtros nuevos, helper `filterParams()`, confirmación en `acceptFilteredExpenses`. **Regla anticolisión (corrección 9): solo el constructor, el panel de filtros y `loadData`/`getExportUrl`/`acceptFilteredExpenses`. `renderModal()`, `EMPTY_FORM` y los tres handlers del formulario son del paquete 08** |
| `app/javascript/components/ShowConstCenter/ExpensesTable.jsx` | Las mismas **5** columnas en `this.columns` (constructor), en JSX. **Sin `receipt_file`**: en ese archivo la columna de comprobante es del **08**, que sí es su dueño |
| `app/javascript/generalcomponents/ui/CmDataTable.jsx` | Columna de selección **opt-in** vía props nuevas `selectable` / `selectedIds` / `onToggleRow` / `onToggleAllPage` / `rowKey`. Aditivo puro |
| `app/views/layouts/user.html.erb` | Ítem de menú "Contabilidad" (con `data-testid="nav-contabilidad"`, §7.6) dentro del treeview "Control de gastos"; `accounting_expenses` agregado a `expense_controllers` (línea 59) y a la condición del treeview (línea 163). **Dueño único: este paquete** (corrección 3); 06 y 07 solo declaran la dependencia |
| `app/helpers/application_helper.rb` | **Solo** `authorization_accounting_expenses` y el branch de `controller_name_helper` para `accounting_expenses/index`. ⚠️ **Archivo repartido por método (§7.2)**: `get_currencies` es del **05** y `budget_status_label`/`accounting_state_label` del **06**, los dos ya mergeados. Se **agregan los propios al final** y se rebasa. **`currency_options` no se crea**: no existe y no debe existir. |
| `app/assets/stylesheets/datatable.css` | Reglas `.cm-dt-select-cell`, `.cm-dt-select-header`, `.cm-dt-selection-bar` |
| `app/views/report_expenses/index.html.erb` | **Faltaba en esta tabla** (lo edita la Tarea 5.4): la prop `currencies: get_currencies` del `react_component`. Ningún otro paquete lo reclama en §7.2 |

**No se toca**: `app/javascript/components/ReportExpense/FormCreate.jsx` ni `renderModal()` /
`EMPTY_FORM` / los handlers del formulario de `packs/ReportExpenseIndex.js` (**son del paquete 08**,
§7.2), `Index.jsx` / `FormFilter.jsx` / `FormImportFile.jsx` de `components/ReportExpense/`
(**código muerto**, §4.5 — modificarlos no tiene efecto), `config/routes.rb` y
`app/controllers/accounting_expenses_controller.rb` (las 5 rutas del Bloque C y el controller los
declara el **paquete 06**), y `test/e2e/specs/*.spec.js` (**paquete 12**).

---

## Tareas

Cada tarea es un commit independiente. Los números indican orden obligatorio solo donde hay
dependencia real.

---

### Bloque 1 — Columnas nuevas en las dos tablas

**Tarea 1. Helper de presentación compartido para los estados nuevos.**

Crear `app/javascript/generalcomponents/expenseIndicators.js` con **cuatro funciones puras**,
sin JSX, importables desde un pack y desde un `.jsx`:

```js
// Devuelve { label, className } para el badge de estado presupuestal.
export function budgetStatusBadge(status)
//   "aprobado"        -> { label: "Aprobado",        className: "cm-status-badge cm-status-badge--green" }
//   "excedido"        -> { label: "Excedido",        className: "cm-status-badge cm-status-badge--red" }
//   "sin_presupuesto" -> { label: "Sin presupuesto", className: "cm-status-badge cm-status-badge--gray" }
//   null/undefined/otro -> { label: "—",             className: "cm-status-badge cm-status-badge--gray" }

// Devuelve { label, className } para el badge de aprobación contable.
export function accountingBadge(approved)
//   true  -> { label: "Aprobado",  className: "cm-status-badge cm-status-badge--green" }
//   false -> { label: "Pendiente", className: "cm-status-badge cm-status-badge--gray" }

// Formatea la fecha corta de aprobación. "2026-07-14T10:22:00Z" -> "14/07/2026". null -> "".
export function shortDate(value)

// Convierte los decimales serializados como string por AMS a número.
// "1200.50" -> 1200.5 ; null -> null ; "" -> null ; 0 -> 0
export function toNumber(value)
```

Regla: `toNumber` se usa **siempre** antes de pasar `foreign_value` / `foreign_tax` /
`foreign_total` / `exchange_rate` a `NumberFormat`. AMS serializa `decimal` como **string**
(`"120.00"`), y pasarlo crudo pinta `120.00` sin separador de miles.

**Tarea 2. Columnas nuevas en `packs/ReportExpenseIndex.js`.**

En el **constructor**, dentro de `this.columns` (§4.5: `CmDataTable` congela `visibleColumns` en
su propio constructor; una columna calculada después del mount nunca se pinta). Orden final del
array y posición exacta:

| # | `key` | `label` | `width` | `sortable` | Posición |
|---|---|---|---|---|---|
| 1 | `id` | `"ID"` | `"80px"` | `true` | **primera**, antes de `cost_center_code` |
| … | (columnas actuales sin cambios) | | | | |
| 13 | `budget_status` | `"Estado presupuestal"` | `"190px"` | `true` | inmediatamente después de `invoice_total` |
| 14 | `currency` | `"Moneda"` | `"90px"` | `true` | después de `budget_status` |
| 15 | `foreign_total` | `"Valor extranjero"` | `"150px"` | **`false`** | después de `currency` |
| 16 | `accounting_approved` | `"Contabilidad"` | `"170px"` | `true` | inmediatamente después de `is_acepted` |
| 17 | `receipt_file` | `"Comprobante"` | `"120px"` | **`false`** | inmediatamente después de `accounting_approved` |

Renders exactos:

- **`id`**: `React.createElement("span", { "data-testid": "expense-ref-" + row.id, style: { fontWeight: 600, color: "#6c757d" } }, "#" + row.id)`.
- **`budget_status`**: badge con `budgetStatusBadge(row.budget_status)`; cuando
  `row.budget_status === "excedido"` **y** `row.budget_reason` está presente, se agrega debajo
  un `div` con `className: "cm-cell-truncate"`, `"data-tooltip": row.budget_reason` y dentro un
  `span.cm-cell-truncate-text` con el mismo texto. El contenedor lleva
  `"data-testid": "expense-budget-status-" + row.id`.
- **`currency`**: texto plano `row.currency || "COP"`, `"data-testid": "expense-currency-" + row.id`.
- **`foreign_total`**: si `row.currency === "COP"` o `toNumber(row.foreign_total) === null`,
  renderiza `"—"`. Si no, `NumberFormat` con
  `{ value: toNumber(row.foreign_total), displayType: "text", thousandSeparator: true, suffix: " " + row.currency }`
  y, debajo, un `span.cm-hint` con `"TRM " + NumberFormat(toNumber(row.exchange_rate))` cuando
  `exchange_rate` está presente. **`sortable: false`**: `foreign_total` no está en la whitelist
  de orden de F.1 y hacer clic ordenaría por `created_at` sin avisar.
- **`accounting_approved`**: badge con `accountingBadge(row.accounting_approved)`; si es `true`,
  segunda línea `span.cm-hint` con
  `shortDate(row.accounting_approved_at) + (row.accounting_approved_by ? " · " + row.accounting_approved_by.names : "")`.
  Contenedor con `"data-testid": "expense-accounting-status-" + row.id`.

- **`receipt_file`** 🔴 **columna NUEVA del cierre de la reauditoría** (§4.5 y §7.6). Si
  `!row.receipt_file || !row.receipt_file.url`, renderiza `"—"`. Si hay archivo, renderiza **dos**
  elementos en la misma celda:
  1. el **enlace de descarga**, `React.createElement("a", { href: "/download_receipt/report_expenses/" + row.id, target: "_blank", rel: "noopener noreferrer", "data-testid": "expense-receipt-link-" + row.id }, React.createElement("i", { className: "fas fa-download" }))`
     — **siempre contra `/download_receipt/report_expenses/:id`**, nunca contra la URL firmada de
     S3, que expira a 600 s (corrección 4 del paquete 08);
  2. el **botón de previsualización**,
     `React.createElement("button", { type: "button", className: "cm-btn cm-btn-outline cm-btn-sm", onClick: function () { self.openReceiptPreview(row.id); }, "data-testid": "expense-receipt-preview-" + row.id }, React.createElement("i", { className: "fas fa-eye" }))`.
  ⚠️ **`openReceiptPreview(id)` / `closeReceiptPreview()` y el modal `receipt-preview-modal` los
  define el paquete 08**, fuera del constructor (§4.5): este paquete **solo los invoca**. El 09 se
  mergea **antes** que el 08, así que al terminar esta tarea el botón existe y el método todavía
  no; **es lo esperado y no se implementa aquí "por si acaso"**. Se anota en el PR.

  *Por qué esta columna es del 09 y no del 08:* la corrección 5 del 08 le obligaba a emitir los dos
  `data-testid` "en las dos tablas", pero la columna del índice vive en `this.columns` —el
  constructor de este pack, que §7.2 y §4.5 asignan a este paquete—, y la corrección 11 le prohíbe
  al 08 tocarlo. Resultado: en el módulo de Gastos no había columna de comprobante y los dos
  testids no los emitía nadie. La reauditoría lo repartió: **columna aquí, modal y métodos allá.**

**No se toca** la columna `is_acepted` (badge editable de aceptación operativa, líneas 132-165):
invariante #1 de la arquitectura.

**Tarea 2 bis (una línea, mismo commit). `data-testid="expense-new"` en el botón "Nuevo gasto".**
§7.6 asigna `expense-new` a este paquete y **ninguna tarea lo emitía**: el paquete 12 lo usa tres
veces (`page.getByTestId("expense-new").click()` en E2, E4.1 y E5.1) para abrir el modal, así que
sin él **tres escenarios no arrancan**. Se agrega el atributo al botón "Nuevo gasto" del
`headerActions` / `CmPageActions` de `packs/ReportExpenseIndex.js`. No cambia comportamiento, no
toca `renderModal()` (del 08) y no requiere cambio en §7.6, que ya lo asignaba aquí.

**Tarea 3. Las mismas columnas en `components/ShowConstCenter/ExpensesTable.jsx`.**

Mismo contenido, en JSX, en el **constructor**. Diferencias obligatorias respecto a la tarea 2,
porque `get_cost_center_report_expenses` tiene otra whitelist de orden (F.2 solo agrega `id`,
`currency`, `budget_status`):

- `accounting_approved` → **`sortable: false`**.
- `foreign_total` → **`sortable: false`**.
- `id`, `currency`, `budget_status` → `sortable` por defecto (true).

Los `data-testid` usan el mismo prefijo `expense-*` que en la tarea 2: son la misma entidad y los
E2E no distinguen la pantalla por el testid sino por la URL.

⚠️ **La columna `receipt_file` NO se replica aquí.** En `ExpensesTable.jsx` la columna de
comprobante —con los mismos dos `data-testid`— es del **paquete 08** (su Tarea 14.1), que sí es
dueño de ese archivo. Este paquete la emite **solo** en `packs/ReportExpenseIndex.js`, donde vive
en el constructor. Son 5 columnas aquí y 6 allá; no es un descuido.

---

### Bloque 2 — Filtros nuevos en el módulo de Gastos

**Tarea 4. Extraer `filterParams()` en `packs/ReportExpenseIndex.js`.**

Hoy la lista de filtros está **copiada cuatro veces**: `loadData` (líneas 205-209),
`acceptFilteredExpenses` (275-279), `getExportUrl` (301-305) y `EMPTY_FILTERS` (23-29). Agregar
tres filtros sin unificar garantiza que uno de los cuatro quede desincronizado.

Refactor **sin cambio funcional**, commit propio y previo a la tarea 5:

```js
filterParams = function () {
  var f = this.state.filters;
  var out = [];
  if (f.cost_center_id)      out.push("cost_center_id=" + f.cost_center_id);
  if (f.user_invoice_id)     out.push("user_invoice_id=" + f.user_invoice_id);
  if (f.start_date)          out.push("start_date=" + f.start_date);
  if (f.end_date)            out.push("end_date=" + f.end_date);
  if (f.is_acepted)          out.push("is_acepted=" + f.is_acepted);
  return out;
}.bind(this);
```

`loadData`, `acceptFilteredExpenses` y `getExportUrl` pasan a hacer
`params = params.concat(this.filterParams())`.

**Tarea 5. Tres filtros nuevos en el panel.**

1. `EMPTY_FILTERS` gana tres claves con valor `""`: `budget_status`, `currency`,
   `accounting_approved`.
2. `filterParams()` gana tres líneas con el mismo patrón.
3. `renderFilters()`: la fila 2 hoy tiene el select de `is_acepted` y **tres `div` vacíos de
   relleno** (líneas 562-563 y el bloque de botones). Se reemplazan los dos primeros `div`
   vacíos y se agrega una fila 3:

| Campo | `name` | Control | Opciones (`value` → texto) | `data-testid` |
|---|---|---|---|---|
| Estado presupuestal | `budget_status` | `<select className="cm-input">` | `""`→"Todos", `"aprobado"`→"Aprobado", `"excedido"`→"Excedido", `"sin_presupuesto"`→"Sin presupuesto" | `filter-budget-status` |
| Moneda | `currency` | `<select className="cm-input">` | `""`→"Todas" + una `option` por cada `{label, value}` de `this.props.currencies` | `filter-currency` |
| Aprobado por contabilidad | `accounting_approved` | `<select className="cm-input">` | `""`→"Todos", `"true"`→"Aprobado", `"false"`→"Pendiente" | `filter-accounting-approved` |

Los tres usan `onChange: self.handleFilterChange` (ya existe y es genérico por `e.target.name`).
Los íconos de label siguen el patrón del archivo: `fa-coins` (presupuestal), `fa-money-bill-wave`
(moneda), `fa-file-invoice-dollar` (contabilidad).

4. `app/views/report_expenses/index.html.erb` pasa una prop nueva:
   `currencies: get_currencies` (el helper del **05**, ya mergeado; **no** `currency_options`, que
   no existe). En `ReportExpenseIndex`, `this.props.currencies || window.CM_CURRENCIES || []`
   (guarda obligatoria: sin ella, si la prop llega `undefined` el `.map` revienta el render
   completo de la pantalla). `window.CM_CURRENCIES` es la fuente única de §4.5 y la declara el 05
   en el layout.

**Tarea 6. Confirmación antes de la aceptación operativa masiva.**

`acceptFilteredExpenses` dispara `PATCH /update_filter_values` **sin ninguna confirmación**, y ese
endpoint no verifica filtros en el servidor (§3.9: se documenta, no se corrige). Al agregar
filtros nuevos al panel, el riesgo sube: un usuario filtra por `budget_status=excedido`, ve 3
filas, hace clic en "Aceptar gastos" y —si el backend todavía no soporta ese filtro— acepta miles.

Antes del `fetch`, insertar:

```js
Swal.fire({
  title: "¿Aceptar " + this.state.meta.total + " gastos?",
  text: "Se marcarán como Aceptados todos los gastos que coinciden con el filtro actual, no solo los de esta página.",
  icon: "warning",
  showCancelButton: true,
  confirmButtonColor: "#2a3f53",
  cancelButtonColor: "#dc3545",
  confirmButtonText: "Sí, aceptar",
  cancelButtonText: "Cancelar",
})
```

y el `fetch` solo corre dentro de `.then(function (result) { if (result.value) { ... } })`.
**Asumido:** el texto usa `meta.total` (el total del filtro que el servidor ya devolvió), no el
conteo de la página.

---

### Bloque 3 — Selección múltiple en `CmDataTable` (aditivo)

**Tarea 7. Props nuevas en `CmDataTable`, opt-in y sin efecto si no se pasan.**

`CmDataTable` lo usan ~20 pantallas. La regla es: **si `selectable` no viene, el DOM renderizado
debe ser byte-idéntico al de hoy.**

Props nuevas (todas opcionales, agregar a `propTypes`):

| Prop | Tipo | Default | Significado |
|---|---|---|---|
| `selectable` | `bool` | `false` | Activa la columna de checkboxes |
| `selectedIds` | `arrayOf(number)` | `[]` | Ids seleccionados. **Estado controlado**: `CmDataTable` no guarda selección propia |
| `onToggleRow` | `func` | — | `(row) => void`. Se llama al hacer clic en el checkbox de una fila |
| `onToggleAllPage` | `func` | — | `(rows, checked) => void`. `rows` son **solo las filas de la página actual** |
| `rowKey` | `string` | `"id"` | Campo del que sale el id de selección |

Implementación:

- En `<thead>`: **antes** del `<th>` de `actions`, si `selectable`, un `<th className="cm-dt-select-header" style={{width: 42}}>` con un `<input type="checkbox">` cuyo:
  - `checked` = `rows.length > 0 && rows.every(r => selectedIds.includes(r[rowKey]))`
  - `onChange` = `(e) => onToggleAllPage(rows, e.target.checked)`
  - `data-testid="cm-dt-select-all"`
  - `title` = `"Seleccionar los " + rows.length + " de esta página"`
  - **`indeterminate` se setea por ref, no por atributo** — React no lo soporta como prop:
    ```jsx
    ref={(el) => { if (el) { el.indeterminate = someSelected && !allSelected; } }}
    ```
- En cada `<tr>`: `<td className="cm-dt-select-cell">` con checkbox
  `checked={selectedIds.includes(row[rowKey])}`, `onChange={() => onToggleRow(row)}`,
  `onClick={(e) => e.stopPropagation()}` y `data-testid={"cm-dt-select-" + row[rowKey]}`.
- En la fila vacía: `colSpan` pasa a `visibleCols.length + (actions ? 1 : 0) + (selectable ? 1 : 0)`.
- En `renderSkeleton`: una columna de skeleton extra si `selectable`.

**Tarea 8. CSS de la selección en `datatable.css`.**

Tres reglas nuevas, sin tocar las existentes:

```css
.cm-dt-select-header,
.cm-dt-select-cell { width: 42px; text-align: center; padding: 8px 4px; }
.cm-dt-select-cell input[type="checkbox"] { cursor: pointer; width: 15px; height: 15px; accent-color: #f5a623; }
.cm-dt-selection-bar {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 10px 16px; margin-bottom: 12px;
  background: rgba(245, 166, 35, 0.08);
  border: 1px solid rgba(245, 166, 35, 0.35);
  border-radius: var(--cm-radius);
  font-family: "Poppins", sans-serif; font-size: 13px;
}
```

---

### Bloque 4 — Pantalla de Contabilidad

**Tarea 9. Vista Rails.**

`app/views/accounting_expenses/index.html.erb`, exactamente dos líneas, patrón de
`report_expenses/index.html.erb`:

```erb
<%= javascript_pack_tag 'AccountingExpenseIndex' %>
<%= react_component('AccountingExpenseIndex', current_user: get_current_user, estados: @estados, users: get_users, report_expense_options: get_report_expense_options, currencies: get_currencies) %>
```

**Registro del pack**: no hay ninguno que hacer. `config/webpacker.yml` declara
`source_entry_path: packs` ⇒ webpacker 3.5 toma **cada archivo de `app/javascript/packs/` como
un entry automáticamente**. El único requisito es que el archivo termine con
`WebpackerReact.setup({ AccountingExpenseIndex });` — sin esa línea `react_component` no
encuentra el componente y la página queda en blanco sin error de servidor.

**Tarea 10. Helpers de `application_helper.rb`.**

1. `authorization_accounting_expenses`, junto a `authorization_report_expenses` (línea 405):
   ```ruby
   def authorization_accounting_expenses
     has_menu_permission?("Contabilidad")
   end
   ```
2. Branch en `controller_name_helper` (línea 2), después del branch de `report_expenses`
   `indicators_expenses` (línea 37-38). **Si no se agrega, el encabezado de la página dice
   literalmente "Proyectos"** (el `else` de la línea 53):
   ```ruby
   elsif controller == "accounting_expenses" && action == "index"
     card = "<h1>" + " <i class='fas fa-file-invoice-dollar'></i> Contabilidad " + "</h1>" + "<p>" + "Aprobación contable de gastos" + "</p>"
   ```
3. ~~`currency_options`~~ — **RETIRADO por el cierre de la reauditoría. No se crea nada.** El
   helper del catálogo se llama **`get_currencies`** y lo escribe el **paquete 05**
   (`05-multimoneda-y-trm.md`, Tarea 12), que se mergea en la ola 3a. Este paquete **lo consume tal
   cual**, sin grep y sin creación condicional. Donde este documento decía `currency_options`, se
   lee **`get_currencies`**.

**Tarea 11. Ítem de menú.**

`app/views/layouts/user.html.erb`, tres ediciones:

1. Línea 59: `<% expense_controllers = %w[report_expenses expense_ratios accounting_expenses] %>`
   (sin esto el treeview no queda `is-expanded` al estar en la pantalla).
2. Línea 163, condición de apertura del treeview "Control de gastos":
   `<% if authorization_report_expenses || authorization_expense_ratios || authorization_accounting_expenses || current_user.rol.name == "Administrador" %>`
3. Nuevo `<li>` **después** del de "Relación de gastos" (que termina en la línea 184), dentro del
   mismo `<ul class="treeview-menu">`:
   ```erb
   <% if authorization_accounting_expenses || current_user.rol.name == "Administrador" %>
     <li>
       <%= link_to accounting_expenses_path, class: "app-menu__item #{'active' if controller_name == 'accounting_expenses'}", data: { testid: "nav-contabilidad" } do %>
         <i class="app-menu__icon fas fa-file-invoice-dollar"></i><span class="app-menu__label">Contabilidad</span>
       <% end -%>
     </li>
   <% end %>
   ```
   `accounting_expenses_path` es el helper que Rails genera solo a partir de
   `get "accounting_expenses", to: "accounting_expenses#index"` (ruta del Bloque C, la declara el
   **paquete 06**, `06-comprobante-y-contabilidad.md`). **Si esa ruta no está mergeada, el layout completo revienta con
   `NoMethodError` en TODAS las pantallas** — por eso la tarea 11 va después de la ruta, nunca
   antes.

**Tarea 12. Esqueleto del pack `AccountingExpenseIndex.js`.**

Copiar la estructura de `packs/ReportExpenseIndex.js` (§4.5: pack gordo, `React.createElement`
sin JSX, métodos como `nombre = function () {}.bind(this)`, helper local `csrfToken()`, objeto
`selectStyles` copiado, `formatDate` copiado). Estado inicial:

```js
this.state = {
  data: [], loading: true, searchTerm: "",
  sortKey: null, sortDir: "asc",
  meta: { total: 0, page: 1, per_page: 50, total_pages: 1 },
  showFilters: false, isFiltering: false,
  filters: Object.assign({}, EMPTY_FILTERS),
  filterCostCenter: null, filterCostCenterOptions: [], filterCostCenterLoading: false,
  filterUser: null,
  selectedIds: [],
  bulkRunning: false,
};
```

con

```js
var EMPTY_FILTERS = {
  cost_center_id: "", user_invoice_id: "", start_date: "", end_date: "",
  accounting_approved: "", budget_status: "", currency: "", is_acepted: "",
  type_identification_id: "", payment_type_id: "",
};
```

`loadData(page, perPage, searchTerm, sortKey, sortDir)` idéntico en forma al de
`ReportExpenseIndex` pero contra `GET /get_accounting_expenses`, con
`per_page` por defecto **50** y `meta.total_pages = Math.ceil(total / pp)`.
`serverPagination: true` + `serverMeta: this.state.meta` — **ambas props son obligatorias**: si
`serverMeta` llega `undefined`, `CmDataTable` cae a paginación de cliente **sin error** y muestra
10 filas de la página actual (§4.5).

Guarda de página fuera de rango, copiada de `ExpensesTable.jsx:88-90` (al aprobar el último
pendiente de la última página con filtro `accounting_approved=false`, la página deja de existir):

```js
var lastPage = Math.max(1, Math.ceil(total / pp));
if (p > lastPage) { return this.loadData(lastPage, pp, term, sk, sd); }
```

**Tarea 13. Columnas de la tabla de Contabilidad.**

En el **constructor**, `this.columns` completo, en este orden:

| `key` | `label` | `width` | `sortable` | Render |
|---|---|---|---|---|
| `id` | `"ID"` | `"80px"` | `true` | `"#" + row.id`, `data-testid={"accounting-ref-" + row.id}` |
| `cost_center_code` | `"Centro de costo"` | `"150px"` | `true` | `row.cost_center ? row.cost_center.code : ""` |
| `user_invoice_name` | `"Responsable"` | `"150px"` | `true` | `row.user_invoice ? row.user_invoice.names : ""` |
| `invoice_date` | `"Fecha de factura"` | `"120px"` | `true` | directo |
| `invoice_name` | `"Nombre"` | `"200px"` | `true` | directo |
| `identification` | `"NIT / CEDULA"` | `"120px"` | `true` | directo |
| `invoice_number` | `"#Factura"` | `"140px"` | `true` | directo |
| `type_name` | `"Tipo"` | `"160px"` | **`false`** | `row.type_identification ? row.type_identification.name : ""` |
| `payment_name` | `"Medio de pago"` | `"150px"` | **`false`** | `row.payment_type ? row.payment_type.name : ""` |
| `currency` | `"Moneda"` | `"90px"` | `true` | `row.currency \|\| "COP"` |
| `foreign_total` | `"Valor extranjero"` | `"150px"` | **`false`** | igual que la tarea 2 |
| `invoice_value` | `"Valor (COP)"` | `"120px"` | `true` | `NumberFormat` `$` |
| `invoice_tax` | `"IVA (COP)"` | `"110px"` | `true` | `NumberFormat` `$` |
| `invoice_total` | `"Total (COP)"` | `"120px"` | `true` | `NumberFormat` `$` |
| `budget_status` | `"Estado presupuestal"` | `"190px"` | `true` | igual que la tarea 2 |
| `is_acepted` | `"Estado operativo"` | `"140px"` | `true` | badge **de solo lectura**: `"Aceptado"` verde / `"Creado"` gris. **Sin lápiz de edición**: cambiar `is_acepted` es del módulo de Gastos, no de Contabilidad |
| `accounting_approved` | `"Contabilidad"` | `"180px"` | `true` | igual que la tarea 2, `data-testid={"accounting-status-" + row.id}` |

`type_name` y `payment_name` van con `sortable: false` porque **no están en la whitelist de orden
de C.2** (§F.1 lo señala como bug preexistente en gastos: ordenan por `created_at` en silencio).
No se replica el bug.

**Tarea 14. Panel de filtros propio.**

`renderFilters()` con el mismo markup `cm-filter-panel` / `cm-filter-grid` de
`ReportExpenseIndex.js:487-574`. Diez campos, en tres filas de cuatro:

| Campo | `name` | Control | Notas |
|---|---|---|---|
| Centro de costo | `cost_center_id` | `react-select` async | `GET /search_cost_centers?q=`, mínimo 3 caracteres, debounce 300 ms, `menuPortalTarget: document.body`, `selectStyles`. 🔴 **Envolver el `<Select>` en un `<div data-testid="accounting-filter-cost-center">`** (§7.6, agregado por el cierre de la reauditoría). En `react-select` el testid no puede ir como prop del `<Select>`; va en el div envolvente, igual que `expense-user-select` / `expense-cost-center-select` del 08. **Sin esto, tres escenarios del paquete 12 (E7.1, E7.2 y E7.7) no tienen selector**: usan `elegirSelect(page, "accounting-filter-cost-center", "CM-E2E-ACC-2026")` para acotar el test al centro E2E. Era el único hueco conocido del contrato de `data-testid`. |
| Responsable | `user_invoice_id` | `react-select` | de `this.props.users` |
| Fecha desde | `start_date` | `input[type=date]` | |
| Fecha hasta | `end_date` | `input[type=date]` | |
| Aprobado por contabilidad | `accounting_approved` | `select` | `""`/`"true"`/`"false"` → Todos / Aprobado / Pendiente. `data-testid="accounting-filter-approved"` |
| Estado presupuestal | `budget_status` | `select` | `""`/`"aprobado"`/`"sin_presupuesto"`. **La opción `"excedido"` NO existe**: §2.3 fija que la vista nunca los lista, ofrecerla devolvería siempre 0 resultados |
| Moneda | `currency` | `select` | de `this.props.currencies` (con guarda a `window.CM_CURRENCIES`, §4.5) |
| Estado operativo | `is_acepted` | `select` | `""`/`"true"`/`"false"` → Todos / Aceptado / No aceptado |
| Tipo | `type_identification_id` | `react-select` | de `report_expense_options` con `category === "Tipo"` |
| Medio de pago | `payment_type_id` | `react-select` | de `report_expense_options` con `category === "Medio de pago"` |

Botones: "Limpiar" (`data-testid="accounting-filter-clear"`) y "Aplicar filtros"
(`data-testid="accounting-filter-apply"`), mismas clases `cm-btn cm-btn-outline cm-btn-sm` /
`cm-btn cm-btn-accent cm-btn-sm`. El toggle del panel va en `headerActions` con
`data-testid="accounting-filter-toggle"`.

`filterParams()` idéntico en concepto al de la tarea 4, con las 10 claves.
`applyFilters()` y `clearFilters()` **limpian la selección** (ver tarea 16).

**Tarea 15. Acciones de fila (aprobación individual).**

`getRowActions(row)` con el markup obligatorio de menú (§4.5): `div.cm-dt-menu` >
`button.cm-dt-menu-trigger` con `onClick: this.openMenu` (→ `window.cmOpenMenu(e)`, definido en
`layouts/user.html.erb:1275-1315`) + `div.cm-dt-menu-dropdown` como **hermano inmediato** del
trigger.

- Si `!this.props.estados.approve` → `return null` (sin menú).
- Un solo ítem, según `row.accounting_approved`:
  - `false` → "Aprobar", `className: "cm-dt-menu-item"`, ícono `fa-check`,
    `data-testid={"accounting-approve-" + row.id}`
  - `true` → "Desaprobar", `className: "cm-dt-menu-item cm-dt-menu-item--danger"`, ícono
    `fa-undo`, `data-testid={"accounting-unapprove-" + row.id}`
- Trigger con `data-testid={"accounting-row-menu-" + row.id}`.

`updateAccountingState(row, state)`:

```js
fetch("/update_accounting_state/" + row.id + "/" + state, {
  method: "PATCH",
  headers: { "X-CSRF-Token": csrfToken(), "Content-Type": "application/json" },
})
```

Manejo de respuesta — **distinto del de `ReportExpenseIndex`, que ignora `message`**:

```js
if (data.type === "error") {
  Swal.fire({ icon: "error", title: data.success || "¡Ocurrió un error!",
              text: (data.message && data.message[0]) || "", confirmButtonColor: "#2a3f53" });
} else {
  self.loadData();
  Swal.fire({ position: "center", icon: "success", title: data.success,
              showConfirmButton: false, timer: 1500 });
}
```

Esto importa: C.3 rechaza aprobar un `excedido` y el motivo viaja **solo** en `message[0]`. Un
gasto puede pasar a `excedido` por un recálculo entre el `loadData` y el clic.

Además: `if (res.status === 403)` → Swal de error con
`"No tiene permiso para realizar esta acción"` **sin** parsear el cuerpo dos veces.

**Tarea 16. Selección múltiple: estado y reglas.**

Handlers en el pack:

```js
toggleRow = function (row) {
  var ids = this.state.selectedIds.slice();
  var i = ids.indexOf(row.id);
  if (i === -1) { ids.push(row.id); } else { ids.splice(i, 1); }
  this.setState({ selectedIds: ids });
}.bind(this);

toggleAllPage = function (rows, checked) {
  var ids = this.state.selectedIds.slice();
  rows.forEach(function (r) {
    var i = ids.indexOf(r.id);
    if (checked && i === -1) { ids.push(r.id); }
    if (!checked && i !== -1) { ids.splice(i, 1); }
  });
  this.setState({ selectedIds: ids });
}.bind(this);

clearSelection = function () { this.setState({ selectedIds: [] }); }.bind(this);
```

**Reglas de ciclo de vida de la selección — esto es el corazón del paquete:**

| Evento | ¿Qué pasa con `selectedIds`? | Razón |
|---|---|---|
| Cambiar de página (`onPageChange`) | **Se conserva** | El universo no cambió; el usuario está armando un lote entre páginas. Perderla al paginar hace la función inútil con `per_page = 50` |
| Cambiar `per_page` (`onPerPageChange`) | **Se conserva** | Ídem |
| Ordenar (`onSort`) | **Se conserva** | Ídem: reordenar no saca ni mete registros del universo |
| Buscar / cancelar búsqueda (`onSearch`) | **Se limpia** | Cambia el universo; conservarla aprobaría registros que el usuario ya no ve |
| Aplicar filtros (`applyFilters`) | **Se limpia** | Ídem |
| Limpiar filtros (`clearFilters`) | **Se limpia** | Ídem |
| Cerrar el panel de filtros (`toggleFilters` al cerrar, que resetea filtros) | **Se limpia** | Ídem |
| Aprobación masiva con éxito | **Se limpia** | El lote ya se procesó |
| Aprobación masiva con error | **Se conserva** | Para reintentar sin volver a marcar 50 casillas |
| Aprobación individual desde el menú de fila | **Se conserva** | Acción independiente del lote |
| Recargar la página del navegador | Se pierde | Solo vive en memoria del componente. **No se persiste** en `sessionStorage` ni en la URL |

**Semántica del "seleccionar todo" — decisión cerrada:**

> El checkbox del encabezado significa **"los N registros de ESTA página"**, nunca el resultado
> completo del filtro.

Razones: (a) `CmDataTable` en modo servidor solo conoce las filas de la página; para seleccionar
el resultado completo habría que traer hasta 100 000 ids al navegador; (b) un checkbox que
selecciona invisiblemente 4 000 registros y luego un botón "Aprobar seleccionados" es el camino
directo a una aprobación masiva accidental irreversible en la práctica.

Su `title` lo dice literalmente: `"Seleccionar los " + rows.length + " de esta página"`.

Para actuar sobre el resultado completo hay un botón **distinto y explícito** (tarea 17), que
además pasa por el servidor y por la guarda de C.4.

**Tarea 17. Barra de selección y aprobación masiva.**

`renderSelectionBar()` — se renderiza **encima** de la `CmDataTable`, solo si
`this.state.selectedIds.length > 0`, en un `div.cm-dt-selection-bar` con
`data-testid="accounting-selection-bar"`:

1. Texto: `<strong>N</strong> seleccionados` con
   `data-testid="accounting-selection-count"` (el número, solo, para que el E2E del paquete 12 lo lea).
2. Botón **"Aprobar seleccionados (N)"**, `cm-btn cm-btn-success cm-btn-sm`,
   `data-testid="accounting-approve-selected"`. Deshabilitado cuando
   `this.state.bulkRunning === true` o `selectedIds.length > 500`.
   Si supera 500, debajo un `span.cm-hint` en rojo:
   `"Máximo 500 por operación. Reduzca la selección."` (espeja el tope del servidor de C.4).
3. Botón **"Limpiar selección"**, `cm-btn cm-btn-outline cm-btn-sm`,
   `data-testid="accounting-clear-selection"`.
4. **Solo cuando** todas las filas de la página están seleccionadas
   **y** `this.state.meta.total > this.state.selectedIds.length`
   **y** `this.state.isFiltering === true`: un botón secundario
   `"Aprobar los " + meta.total + " del filtro completo"`,
   `cm-btn cm-btn-outline cm-btn-sm`, `data-testid="accounting-approve-filter"`.
   **Si `isFiltering` es false, el botón NO se renderiza**: C.4 rechaza en el servidor las
   llamadas sin filtro, y ofrecer un botón que siempre falla es peor que no ofrecerlo.

`approveSelected()`:

```js
Swal.fire({
  title: "¿Aprobar " + n + " gastos?",
  text: "Quedarán marcados como aprobados por contabilidad, con su nombre y la fecha de hoy.",
  icon: "question", showCancelButton: true,
  confirmButtonColor: "#2a3f53", cancelButtonColor: "#dc3545",
  confirmButtonText: "Sí, aprobar", cancelButtonText: "Cancelar",
}).then(function (result) {
  if (!result.value) return;
  self.setState({ bulkRunning: true });
  var params = self.state.selectedIds.map(function (id) { return "ids[]=" + id; });
  fetch("/update_accounting_filter_values?" + params.join("&"), {
    method: "PATCH",
    headers: { "X-CSRF-Token": csrfToken(), "Content-Type": "application/json" },
  })
  ...
});
```

Respuesta esperada: `{ success: "37 gastos aprobados por contabilidad", type: "success", count: 37 }`.
Al éxito: `clearSelection()`, `loadData()` y Swal de éxito con `data.success`.
Al error (`type === "error"` o HTTP 403): Swal de error con `data.message[0]`, `bulkRunning: false`
y **selección conservada**.
`ensure`-equivalente: `bulkRunning: false` en ambos caminos y también en el `.catch`.

`approveFilteredAll()`: idéntico, pero los params son `this.filterParams()` (los del filtro
aplicado) en vez de los `ids[]`, y el texto del Swal dice
`"Se aprobarán TODOS los gastos que coinciden con el filtro, no solo los de esta página."`.

**Tarea 18. Export.**

`getExportUrl()`:

```js
if (!this.state.isFiltering) return "/download_file/accounting_expenses/todos.xlsx";
return "/download_file/accounting_expenses/filtro.xlsx?" + this.filterParams().join("&");
```

Se renderiza como `<a target="_blank" className="cm-btn cm-btn-outline">` en `headerActions`,
**solo si `this.props.estados.export`**, con `data-testid="accounting-export"`.
El export **ignora la selección múltiple**: exporta el filtro, no lo marcado. Se dice
explícitamente en el `title` del enlace: `"Exporta el resultado del filtro, no la selección"`.

**Tarea 19. `render()` del pack.**

```js
React.createElement("div", { className: "cm-page", "data-testid": "accounting-page" },
  this.state.showFilters && this.renderFilters(),
  this.renderSelectionBar(),
  React.createElement(CmDataTable, {
    columns: this.columns,
    data: this.state.data,
    loading: this.state.loading,
    serverPagination: true,
    serverMeta: this.state.meta,
    onSort: this.handleSort,
    onPageChange: this.handlePageChange,
    onPerPageChange: this.handlePerPageChange,
    onSearch: this.handleSearch,
    selectable: !!this.props.estados.approve,
    selectedIds: this.state.selectedIds,
    onToggleRow: this.toggleRow,
    onToggleAllPage: this.toggleAllPage,
    actions: this.getRowActions,
    headerActions: this.renderHeaderActions(),
    searchPlaceholder: "Buscar por ID, nombre, NIT o # de factura...",
    emptyMessage: "No hay gastos para aprobar",
  })
)
```

Notas: **no** se usa `CmPageActions` (esta pantalla no crea nada, no hay botón "Nuevo").
`selectable` va atado al permiso `approve`: sin permiso de aprobar, los checkboxes no aparecen.
El `searchPlaceholder` menciona el ID porque C.2 incluye `id::text` en el `LIKE`.

Última línea del archivo:
```js
export default AccountingExpenseIndex;
WebpackerReact.setup({ AccountingExpenseIndex });
```

---

## Pruebas unitarias (Minitest)

Alcance realista: Minitest **no ejecuta React**. Lo que sí se prueba aquí es la superficie Ruby
que crea este paquete —vista, helpers y menú—; el comportamiento de las tablas y de la selección
múltiple se cubre en la suite E2E del **paquete 12** (`12-e2e-playwright.md`), que este paquete
**no escribe** (corrección 4). No se agrega ninguna gema de test (§6.7).

Todo test que cree o edite un `ReportExpense` va envuelto en `as_user(users(:admin)) { ... }`
(§5.3, gotcha #1 confirmado).

### `test/controllers/accounting_expenses_view_test.rb`

`class AccountingExpensesViewTest < ActionDispatch::IntegrationTest`, con
`include Devise::Test::IntegrationHelpers`.

| Test | Aserción |
|---|---|
| `test "sin sesion redirige a login"` | `get accounting_expenses_path` → `assert_redirected_to new_user_session_path` |
| `test "usuario con permiso Contabilidad ve la pantalla"` | `sign_in users(:contador)`; `get accounting_expenses_path` → `assert_response :success` y `assert_select "div[data-react-class=?]", "AccountingExpenseIndex"` |
| `test "la vista monta el pack correcto"` | mismo request → `assert_match "AccountingExpenseIndex", response.body` y `assert_no_match "ReportExpenseIndex", response.body` |
| `test "usuario sin permiso Contabilidad no entra"` | `sign_in users(:ingeniero_sin_permisos)`; `get accounting_expenses_path` → `assert_redirected_to root_path` (gate de C.1; si el **paquete 06** eligió `:forbidden`, se ajusta la aserción, **no** el guard) |
| `test "las props incluyen estados y currencies"` | parsear `data-react-props` con `JSON.parse` → `assert props["estados"].key?("approve")`, `assert props["estados"].key?("export")`, `assert props["currencies"].is_a?(Array)` |
| `test "currencies trae label y value"` | `props["currencies"].first.keys.sort == ["label", "value"]` — es lo que `react-select` exige; si el helper devuelve `["COP","USD"]` el filtro de moneda queda mudo |
| `test "admin entra aunque el rol no tenga el permiso explicito"` | `sign_in users(:admin)` (rol `"Administrador"`) → `assert_response :success` |

**Caso de fallo obligatorio:** `test "props no filtra estados cuando estados es nil"` — si
`@estados` llegara `nil`, `props["estados"]` es `null` y en JS `this.props.estados.approve`
revienta el render entero. Se afirma `assert_not_nil props["estados"]`.

### `test/helpers/application_helper_menu_test.rb`

`class ApplicationHelperMenuTest < ActionView::TestCase`, `tests ApplicationHelper`.

| Test | Aserción |
|---|---|
| `test "controller_name_helper devuelve el titulo de Contabilidad"` | `controller_name_helper("accounting_expenses", "index")` incluye `"Contabilidad"` y **no** incluye `"Proyectos"` |
| `test "controller_name_helper de Gastos no cambio"` | `controller_name_helper("report_expenses", "index")` sigue incluyendo `"Control de gastos"` (regresión: el branch nuevo se inserta en la cadena `elsif`) |
| `test "authorization_accounting_expenses true con el permiso"` | stub de `current_user` con rol que tiene `ModuleControl "Contabilidad"` + `AccionModule "Ingreso al modulo"` → `assert authorization_accounting_expenses` |
| `test "authorization_accounting_expenses false sin el permiso"` | rol sin el módulo → `assert_not authorization_accounting_expenses` (ojo: `has_menu_permission?` devuelve `nil`, no `false`; usar `assert_not`, no `assert_equal false`) |
| `test "authorization_accounting_expenses false si tiene el modulo sin la accion de ingreso"` | rol con `"Contabilidad"` pero solo `"Exportar a excel"` → `assert_not` |

### `test/integration/expense_menu_test.rb`

Menú del layout. `ActionDispatch::IntegrationTest`.

| Test | Aserción |
|---|---|
| `test "el menu muestra Contabilidad con permiso"` | `sign_in users(:contador)`; `get report_expenses_path` → `assert_select "a[href=?]", "/accounting_expenses", 1` |
| `test "el menu oculta Contabilidad sin permiso"` | `sign_in users(:ingeniero_sin_permisos)`; `get root_path` → `assert_select "a[href=?]", "/accounting_expenses", 0` |
| `test "el treeview de gastos queda expandido en Contabilidad"` | `sign_in users(:contador)`; `get accounting_expenses_path` → `assert_select "li.treeview.is-expanded"` presente |
| `test "el admin ve Contabilidad en el menu"` | `sign_in users(:admin)` → `assert_select "a[href=?]", "/accounting_expenses", 1` |
| `test "el menu sigue mostrando Gastos y Relacion de gastos"` | regresión de la edición de la línea 163 → ambos `assert_select` en 1 |

### Fixtures requeridas (se coordinan con el paquete 01)

**Dueño único de `test/fixtures/*.yml`: paquete 01** (§7.2). Este paquete solo **agrega etiquetas**;
no reescribe archivos ni renombra las etiquetas existentes del 01 (`admin`, `ingeniero`, `contador`,
roles `administrador`, `gerente`, `ingeniero`, `contador`, `sin_permisos`). 🔴 **Cerrado por la reauditoría: ya no se decide en tiempo de ejecución cuál etiqueta usar.** Cada
una de las de abajo dice explícitamente si es canónica del 01 o si la agrega este paquete.

- 🔴 **`users(:contable)` NO EXISTE Y NO SE CREA** (cierre de la reauditoría, §7.2). Era un
  cuasi-duplicado de la etiqueta canónica del 01. **Donde este documento diga `users(:contable)`, se
  lee `users(:contador)`**, cuyo rol `contador` debe tener el `ModuleControl "Contabilidad"` con las
  acciones `"Ingreso al modulo"`, `"Aprobar"` y `"Exportar a excel"`, declaradas con el **HABTM
  inline en `rols.yml`**. Si al rol `contador` del 01 le falta alguna acción, **este paquete la
  agrega** a `accion_modules.yml` / `rols.yml`; no crea un usuario nuevo.
- `users(:ingeniero_sin_permisos)` — 🔴 **etiqueta NUEVA, y la agrega ESTE paquete** a `users.yml`
  (usuario con `rol: sin_permisos`, sin `"Contabilidad"` ni `"Gastos"`). Ya está listada en el
  párrafo de etiquetas canónicas de §7.2, como manda la regla de no inventar etiquetas sin
  actualizar la matriz en el mismo PR.
- `users(:admin)` — rol `"Administrador"` (literal, mayúscula inicial; `"ADMINISTRADOR"` **no**
  cuenta como admin, ver `report_expenses_controller.rb:343`).

🔴 **`test/fixtures/accion_modules_rols.yml` NO existe y no se crea** (corrección 6, §7.2): el HABTM
va inline en `rols.yml`. Si el paquete 01 no creó las etiquetas de arriba, **este paquete las
agrega** a `users.yml` / `rols.yml` / `module_controls.yml` / `accion_modules.yml` y corre
`bin/rails test test/models` completo antes de mergear (§5.4 regla 1: una fixture rota tumba
**toda** la suite, no solo el test que la usa).

---

## Pruebas E2E (Playwright)

> **RETIRADA por auditoría (corrección 4).** Dueño único de `test/e2e/specs/*.spec.js` funcionales:
> **paquete 12** (`12-e2e-playwright.md`, §7.2). Este paquete **no escribe ningún spec E2E**: ni
> `accounting.spec.js` —que el 12 ya escribe completo— ni los cinco escenarios que este documento
> describía. Ver el bloque de correcciones al inicio.

Lo que sigue siendo obligación de este paquete (correcciones 4 y 5):

1. **Emitir los `data-testid` de la tabla canónica §7.6** en todo lo que produce: `nav-contabilidad`;
   `expense-ref-{id}`, `expense-budget-status-{id}` y `expense-accounting-status-{id}` en las dos
   tablas de gastos; los `accounting-*` de la pantalla de Contabilidad (`accounting-page`,
   `accounting-filter-toggle`, `accounting-filter-approved`, `accounting-filter-clear`,
   `accounting-filter-apply`, `accounting-ref-{id}`, `accounting-status-{id}`,
   `accounting-row-menu-{id}`, `accounting-approve-{id}`, `accounting-unapprove-{id}`,
   `accounting-selection-bar`, `accounting-selection-count`, `accounting-approve-selected`,
   `accounting-clear-selection`, `accounting-approve-filter`, `accounting-export`); y
   `cm-dt-select-all` / `cm-dt-select-{id}` en `CmDataTable`. Sin ellos los specs del 12 no tienen
   dónde agarrarse.

2. **Contrato con el paquete 12 — tres escenarios negativos encargados** (mitigación del riesgo de
   cobertura aceptado en la corrección 5: ~30 de los 46 criterios son comportamiento puramente de
   cliente y **no hay runner de JS en el repo**, §5.5):
   - renderizar con `estados.approve = false` → sin columna de checkboxes y sin menú de fila;
   - renderizar con `estados.export = false` → sin enlace de exportación;
   - una respuesta **403** → mensaje "No tiene permiso para realizar esta acción" y tabla vacía.

3. **Verificación manual obligatoria antes del merge**: `grep -rn "selectable" app/javascript/` para
   confirmar que ninguna de las ~20 pantallas que comparten `CmDataTable` recibe la prop nueva sin
   quererlo (criterio 15).

4. El riesgo de cobertura queda **anotado en el PR**, no en un documento aparte.

**Insumo que se entrega al paquete 12 (no se implementa aquí).** La precondición de datos que el
flujo canónico 5 de §5.2 necesita —usuario con `"Contabilidad"` completo y **al menos 12 gastos**
con `budget_status` variado (≥ 8 `sin_presupuesto` o `aprobado`, ≥ 1 `excedido`), todos con
`accounting_approved = false`, para que con `per_page = 10` haya dos páginas reales— se comunica al
dueño de `db/seeds/e2e.rb` (**paquete 01**, §7.2) y de los specs (**paquete 12**). Este paquete no
edita seeds ni `playwright.config.js`.

### Trampas de E2E ya conocidas (insumo para el paquete 12; aquí no se escriben specs)

- Los `react-select` del panel usan `menuPortalTarget: document.body`: las opciones se renderizan
  **fuera** del panel; buscarlas en `page`, no dentro del contenedor del filtro.
- El select de centro de costo no muestra nada hasta escribir **3 caracteres** y dispara
  `GET /search_cost_centers` con debounce de 300 ms: `fill` + `Enter` inmediato falla; esperar la
  respuesta de red.
- `allow_forgery_protection = false` en test ⇒ un E2E verde **no valida** CSRF.
- `cache_classes = true` en test ⇒ editar el pack entre corridas exige recompilar con
  `RAILS_ENV=test NODE_ENV=development ./bin/webpack` y reiniciar el `webServer`.
- Con 30 packs, el primer request de webpacker en test puede pasar de 2 minutos: **precompilar
  siempre** antes de la suite.

---

## Criterios de aceptación

Cada ítem se marca sí/no sin opinar.

**Columnas**

1. `packs/ReportExpenseIndex.js` define `id`, `budget_status`, `currency`, `foreign_total` y
   `accounting_approved` **dentro del constructor**, en `this.columns`. `grep -n "this.columns"` no
   muestra ninguna asignación fuera del constructor.
2. En `ReportExpenseIndex.js`, `foreign_total` tiene `sortable: false`.
3. En `ExpensesTable.jsx`, `foreign_total` **y** `accounting_approved` tienen `sortable: false`.
4. Un gasto con `currency: "COP"` muestra `"—"` en la columna "Valor extranjero" en las dos tablas.
5. Un gasto con `budget_status: "excedido"` muestra el badge rojo "Excedido" **y** el texto de
   `budget_reason` en las dos tablas.
6. Un gasto con `budget_status: null` (dato viejo antes de la migración) muestra `"—"` gris y **no
   lanza excepción** en consola.
7. `foreign_total` llegando como string `"120.00"` se pinta con separador de miles.
8. La columna `is_acepted` del módulo de Gastos conserva su badge editable y su lápiz.

**Filtros de Gastos**

9. `EMPTY_FILTERS` tiene exactamente 8 claves: las 5 de hoy más `budget_status`, `currency`,
   `accounting_approved`.
10. Existe un único `filterParams()` y `loadData`, `getExportUrl` y `acceptFilteredExpenses` lo
    usan los tres. `grep -c "cost_center_id=" packs/ReportExpenseIndex.js` devuelve **1**.
11. Aplicar el filtro de estado presupuestal produce una request con `budget_status=` en la query.
12. La URL de export con filtros activos contiene los tres parámetros nuevos.
13. "Aceptar gastos" abre un Swal de confirmación con el conteo de `meta.total` antes de disparar
    el PATCH.
14. Con `this.props.currencies === undefined`, la pantalla de Gastos renderiza sin error.

**CmDataTable**

15. `grep -rn "selectable" app/javascript/` devuelve ocurrencias solo en `CmDataTable.jsx` y en
    `AccountingExpenseIndex.js`. Ninguna otra pantalla la pasa.
16. Sin `selectable`, `CmDataTable` no renderiza ningún `<th class="cm-dt-select-header">` ni
    `<td class="cm-dt-select-cell">`.
17. El `colSpan` de la fila vacía suma la columna de selección cuando `selectable` es true.
18. El checkbox del encabezado queda en `indeterminate` cuando hay selección parcial en la página
    (asignado por `ref`, no por atributo).

**Pantalla de Contabilidad**

19. `GET /accounting_expenses` con permiso renderiza `data-react-class="AccountingExpenseIndex"`.
20. El pack termina con `WebpackerReact.setup({ AccountingExpenseIndex });`.
21. `./bin/webpack` compila sin error y produce un bundle cuyo nombre empieza por
    `AccountingExpenseIndex`.
22. La tabla pasa `serverPagination: true` **y** `serverMeta` con las cuatro claves
    `{total, page, per_page, total_pages}`.
23. El encabezado de la página dice "Contabilidad", no "Proyectos".
24. El ítem "Contabilidad" aparece en el treeview "Control de gastos" para un rol con el permiso y
    **no** aparece para uno sin él.
25. Estando en `/accounting_expenses`, el treeview "Control de gastos" tiene la clase
    `is-expanded`.
26. El panel de filtros **no** ofrece la opción "Excedido" en estado presupuestal.
27. Sin `estados.approve`, no se renderiza ni la columna de checkboxes ni el menú de fila.
28. Sin `estados.export`, no se renderiza el enlace de export.
29. Una respuesta `{type: "error", message: ["..."]}` de `update_accounting_state` muestra
    `message[0]` en el Swal (no un genérico).
30. Un HTTP 403 muestra "No tiene permiso para realizar esta acción".

**Selección múltiple**

31. Cambiar de página conserva `selectedIds`; el contador de la barra no cambia.
32. Cambiar `per_page` conserva `selectedIds`.
33. Ordenar por una columna conserva `selectedIds`.
34. Aplicar filtros, limpiar filtros o buscar dejan `selectedIds` en `[]` y ocultan la barra.
35. El checkbox del encabezado marca **solo** las filas de la página visible; el contador sube
    exactamente en el número de filas de esa página.
36. El `title` del checkbox del encabezado contiene la palabra "página".
37. Con más de 500 seleccionados, "Aprobar seleccionados" está `disabled` y se muestra el aviso.
38. "Aprobar seleccionados" dispara **una sola** request `PATCH /update_accounting_filter_values`
    con un `ids[]=` por cada id seleccionado.
39. El botón "Aprobar los N del filtro completo" solo se renderiza cuando hay filtro aplicado
    (`isFiltering`), toda la página está marcada y `meta.total > selectedIds.length`.
40. Tras un lote exitoso: barra oculta, tabla recargada, Swal con `data.success`.
41. Tras un lote fallido: barra visible con el mismo conteo y `bulkRunning` de vuelta en false.
42. El export ignora la selección: su URL nunca contiene `ids[]`.

**Pruebas**

43. `bin/rails test test/controllers/accounting_expenses_view_test.rb test/helpers/application_helper_menu_test.rb test/integration/expense_menu_test.rb` → 0 failures, 0 errors.
44. `bin/rails test` completo sigue en 0 failures / 0 errors (regresión de fixtures).
45. **RETIRADO por auditoría.** Dueño único de los specs E2E: paquete 12. Ver el bloque de
    correcciones al inicio.
46. Toda superficie que este paquete produce emite los `data-testid` de la tabla canónica §7.6:
    `nav-contabilidad`, `expense-ref-{id}`, `expense-budget-status-{id}`,
    `expense-accounting-status-{id}`, **`expense-currency-{id}`**, **`expense-new`**, los tres
    `filter-*` del panel de Gastos (`filter-budget-status`, `filter-currency`,
    `filter-accounting-approved`), los **17** `accounting-*` —incluido
    **`accounting-filter-cost-center`**— y `cm-dt-select-all` / `cm-dt-select-{id}`.
    `grep -rn "data-testid"` sobre los archivos tocados los muestra todos y ninguno inventa un
    nombre fuera de §7.6.

**Añadidos por el cierre de la reauditoría** (numeración nueva, sin tocar la anterior)

47. [ ] La columna `receipt_file` ("Comprobante") existe en `this.columns` de
    `packs/ReportExpenseIndex.js`, renderiza `expense-receipt-link-{id}` apuntando a
    `/download_receipt/report_expenses/{id}` (**nunca** a la URL firmada de S3) y
    `expense-receipt-preview-{id}` invocando `this.openReceiptPreview(id)`; con
    `receipt_file` nulo pinta `"—"`. **No** se replica en `ExpensesTable.jsx` (esa es del 08).
48. [ ] El botón "Nuevo gasto" del `headerActions` de `packs/ReportExpenseIndex.js` lleva
    `data-testid="expense-new"`.
49. [ ] El campo "Centro de costo" del panel de filtros de Contabilidad está envuelto en un
    `<div data-testid="accounting-filter-cost-center">` y
    `page.getByTestId("accounting-filter-cost-center")` resuelve a exactamente 1 elemento.
50. [ ] `grep -rn "def currency_options" app/` no devuelve nada: el helper del catálogo es
    `get_currencies`, del paquete 05, y este paquete solo lo consume.
51. [ ] `grep -rn "users(:contable)" test/` no devuelve nada; los tests usan `users(:contador)`.
    `users(:ingeniero_sin_permisos)` está declarado en `test/fixtures/users.yml` y
    `bin/rails test test/models` completo sigue en verde.

---

## Riesgos y trampas

1. **`this.columns` fuera del constructor = columna invisible.** `CmDataTable` calcula
   `visibleColumns: props.columns.map(c => c.key)` en **su** constructor y no lo resincroniza
   nunca. Si un agente arma las columnas en `componentDidMount` o en `render` "para usar
   `props.currencies`", la columna nueva **jamás se pinta** y no hay error en consola. Toda la
   información que una columna necesita debe estar disponible en el constructor o resolverse
   dentro del `render` de esa columna.

2. **`serverMeta` faltante degrada en silencio.** Si `serverMeta` llega `undefined`,
   `CmDataTable` cae a paginación de cliente **sin lanzar nada** y muestra 10 filas de las 50 que
   trajo el servidor. El síntoma que reporta el usuario es "la tabla no muestra todos los
   registros", no "falta una prop".

3. **Whitelist de orden: el bug más difícil de ver.** Hacer una columna `sortable` cuya `key` no
   esté en la whitelist del controller hace que el servidor caiga al `else` y ordene por
   `created_at DESC`. La tabla se reordena visiblemente, la flecha del header cambia, y el orden
   es el equivocado. Por eso `foreign_total`, `type_name` y `payment_name` van con
   `sortable: false` explícito. **Antes de poner `sortable: true` en cualquier columna nueva hay
   que confirmar la `key` en `direct_columns` del controller correspondiente.**

4. **Los cuatro sitios de filtros de `ReportExpenseIndex.js`.** `loadData`, `getExportUrl`,
   `acceptFilteredExpenses` y `EMPTY_FILTERS`. Agregar un filtro en tres de los cuatro produce el
   peor bug posible del módulo: el usuario ve 3 filas filtradas, hace clic en "Aceptar gastos" y
   el servidor acepta miles porque `acceptFilteredExpenses` no mandó el filtro. Por eso la tarea 4
   (extraer `filterParams`) es **previa y en commit separado** a la tarea 5.

5. **`update_filter_values` no valida filtros en el servidor** (§3.9: se documenta, no se
   corrige). El único freno es el Swal de confirmación de la tarea 6. No quitarlo "porque molesta".

6. **`CmDataTable` es compartido por ~20 pantallas.** Cualquier cambio que no esté detrás de
   `if (selectable)` rompe Materiales, Tableristas, Turnos, Órdenes de compra y todo lo demás a la
   vez. La verificación es el criterio 15 + abrir tres pantallas no relacionadas después del
   cambio.

7. **`indeterminate` no es un atributo de React.** `<input indeterminate={true} />` se ignora en
   silencio; hay que asignarlo sobre el nodo con `ref`.

8. **Decimales que llegan como string.** AMS serializa `decimal` como `"120.00"`. Pasar eso a
   `NumberFormat` sin `toNumber` pinta el valor sin separadores. Y ordenar en cliente sobre esos
   strings sería lexicográfico (`"9.00" > "120.00"`) — no ocurre porque el orden es de servidor,
   pero **no activar `sortable` client-side sobre columnas decimal**.

9. **`props.estados` puede llegar sin claves.** En Ruby, `has_menu_permission?` devuelve `nil`
   cuando el módulo no existe; en JSON viaja como `null`, que en JS es falsy — eso está bien. Lo
   que revienta es `@estados` entero en `nil`: `this.props.estados.approve` lanza
   `TypeError: Cannot read property 'approve' of null` y la página queda en blanco. Usar siempre
   `(this.props.estados || {}).approve`.

10. **El link del menú antes que la ruta = caída total del sitio.** `accounting_expenses_path` se
    evalúa en `layouts/user.html.erb`, que renderiza **todas** las pantallas. Si la tarea 11 se
    mergea antes de que exista la ruta del Bloque C, cada página del sistema devuelve
    `NoMethodError: undefined method 'accounting_expenses_path'`. La tarea 11 va **después** de la
    ruta, sin excepción.

11. **`WebpackerReact.setup` olvidado.** El pack compila, la vista renderiza el `<div>` y no pasa
    nada. Sin error en la consola de Rails y con un warning críptico en la del navegador.

12. **N+1 en la columna de contabilidad.** `accounting_approved_by.names` dispara una query por
    fila si el controller no hizo `.includes(:accounting_approved_by)`. C.2 lo exige; F.2 (tabla
    del centro de costos) **no lo menciona** — ver *Discrepancias* §D2. Con 100 filas por página
    son 100 queries extra.

13. **`budget_reason` largo rompe el ancho de la tabla.** Va siempre dentro de
    `.cm-cell-truncate` + `data-tooltip`, nunca suelto.

14. **`window.cmOpenMenu` y el hermano inmediato.** El dropdown debe ser el **siguiente hermano**
    del `.cm-dt-menu-trigger`. Si se interpone un `React.Fragment` que renderiza un nodo, o un
    `{condicion && ...}` que devuelve `false` en medio, el menú no abre y no hay error.

15. **`per_page` de la pantalla de Contabilidad.** Default 50 y tope 100 en el servidor. Poner
    `per_page: 200` en el estado inicial hace que el servidor devuelva 100 mientras el frontend
    calcula `total_pages` con 200: la paginación queda desalineada y páginas enteras se vuelven
    inalcanzables.

16. **La selección puede referirse a registros que ya no existen.** Entre marcar y aprobar, otro
    usuario puede borrar un gasto o un recálculo puede pasarlo a `excedido`. El servidor responde
    con un `count` menor que `selectedIds.length`. El frontend **muestra el `count` del servidor**,
    no el conteo local: `Swal` con `data.success` tal cual viene. Nunca afirmar "37 aprobados"
    contando en el cliente.

17. **No reutilizar `is_acepted` para nada nuevo.** Invariante #1. En Contabilidad es una columna
    de solo lectura y un filtro; no lleva lápiz ni acción.

---

## Discrepancias con la arquitectura

### D1 — `update_accounting_filter_values` necesita aceptar `ids[]` — ✅ **RESUELTA**

> **RESUELTA por auditoría (corrección 2).** `ids[]` **es** un filtro válido de
> `PATCH /update_accounting_filter_values` (decisión en §C.4) y el **paquete 06** ya lo implementa:
> `params.permit(ids: [])`, `scope.where(id: params[:ids])`, `:ids` dentro de `FILTER_KEYS`, tope de
> 500 aplicable también a `ids[]`, y `count` = filas efectivamente actualizadas. Se conserva el
> texto de abajo solo como registro del porqué. **El "Plan B" de N requests secuenciales queda
> descartado y no se implementa**; no hay nada que decidir antes de la tarea 17.

**Qué dice la arquitectura.** §C.4 define la aprobación masiva **solo por filtros**
(`cost_center_id`, fechas, etc.), con una guarda que rechaza la llamada si no llega ningún filtro,
y un tope de 500.

**Por qué no alcanza.** El alcance aprobado de esta pantalla pide explícitamente "aprobación
individual y masiva **con selección múltiple**". Una selección múltiple no es un filtro: el usuario
marca 7 casillas sueltas de dos páginas distintas. Con el contrato actual, las únicas salidas son
(a) disparar 7 `PATCH /update_accounting_state/:id/true` en secuencia —7 requests, 7 transacciones,
7 `RegisterEdit`, sin atomicidad, y con un estado intermedio si la 4ª falla—, o (b) no implementar
la función.

**Cambio pedido al paquete 06 y ya aceptado** (una línea de params y una de scope):

- `params.permit(ids: [])` y, si `params[:ids].present?`, `scope = scope.where(id: params[:ids])`.
- **`ids` cuenta como filtro** para efectos de la guarda de C.4 (una lista explícita de registros
  es lo opuesto a "aprobar todo").
- El tope de 500 se aplica igual.
- El `count` de la respuesta es el número de filas **efectivamente actualizadas**, que puede ser
  menor que `ids.length` (registros borrados o que pasaron a `excedido` entre el marcado y el
  envío).

**Plan B — RETIRADO por auditoría (corrección 2).** Las llamadas secuenciales a
`PATCH /update_accounting_state/:id/true` **no se implementan**. La tarea 17 usa una sola request
con `ids[]`, y los criterios 37–42 son los válidos.

### D2 — `get_cost_center_report_expenses` debería precargar `accounting_approved_by`

§C.2 exige `.includes(..., :accounting_approved_by, :expense_budget)` para la pantalla de
Contabilidad, pero §F.2 (endpoint de la pestaña del centro de costos) solo habla de los campos del
serializer. Como este paquete agrega la columna "Contabilidad" **también** a esa tabla, ese
endpoint necesita el mismo `.includes(:accounting_approved_by)`. Se pide al **paquete 07**
(`07-api-permisos-y-rutas.md`), dueño de los endpoints y sus filtros. Si no llega, la columna
funciona igual pero con N+1 (hasta 100 queries por página).

### D3 — Un spec E2E con 5 escenarios donde §5.2 asigna 1 flujo

> **RETIRADA por auditoría (corrección 4).** La discrepancia desaparece porque este paquete ya no
> escribe ningún spec E2E: dueño único de `test/e2e/specs/*.spec.js` es el **paquete 12** (§7.2).
> La cobertura de la lógica de cliente se resuelve con los tres escenarios negativos encargados al
> 12 y el riesgo aceptado de la corrección 5. Ver el bloque de correcciones al inicio.

### D4 — "Indicadores" se interpreta como indicadores de estado, no como tablero de KPIs

El título del paquete dice "columnas nuevas, indicadores y pantalla de Contabilidad". **Asumido:**
"indicadores" son los badges de estado presupuestal y de aprobación contable en las tablas, más la
barra de selección. **No** se construye una fila de `cm-metric-card` con totales agregados
(aprobado / pendiente / monto), porque eso exigiría un endpoint de agregados que ningún paquete
tiene en su alcance y que §3 no contrata. Si se quiere, es alcance nuevo: un
`GET /get_accounting_summary` más una fila de tarjetas, estimado aparte.

---

## Decisiones asumidas (resumen)

- **Asumido:** el checkbox del encabezado selecciona la página, no el resultado del filtro; para el
  resultado completo hay un botón separado que solo aparece con filtro aplicado.
- **Asumido:** la selección sobrevive a paginar/ordenar/cambiar `per_page` y muere al
  filtrar/buscar. No se persiste entre recargas.
- **Asumido:** la pantalla de Contabilidad no permite editar `is_acepted` (columna de solo lectura).
- **Asumido:** el filtro de estado presupuestal de Contabilidad no ofrece "Excedido".
- **Asumido:** el export exporta el filtro, nunca la selección.
- **Asumido:** el ícono del módulo es `fas fa-file-invoice-dollar` y el ítem se llama
  "Contabilidad" (no "Aprobación contable").
- **Asumido:** `per_page` inicial de Contabilidad = 50, alineado con el default del servidor.
- **Asumido:** los `data-testid` usan prefijo `expense-*` en las tablas de gastos y `accounting-*`
  en la pantalla nueva; los de la columna de selección son genéricos (`cm-dt-select-*`) porque los
  emite `CmDataTable`.
- **Asumido:** se agrega confirmación al botón "Aceptar gastos" existente, aunque hoy no la tenga.
- ⛔ **DEROGADO:** *"`currency_options` solo se crea si el paquete 05 no lo definió antes"*. Era una
  bifurcación en runtime y con el nombre equivocado. El helper es **`get_currencies`**, del **05**,
  y aquí solo se consume. El catálogo del frontend, además, llega por **`window.CM_CURRENCIES`**
  (§4.5), que declara el 05 en el layout.

---

## Objeciones a la auditoría

Ninguna corrección del bloque inicial se revoca. **Los dos puntos que quedaban abiertos los cerró
la reauditoría**, y se agregaron tres artefactos que §7.6 asignaba a este paquete y ninguna tarea
emitía. Se conserva el registro:

1. ✅ **`filter-accounting-approved`: CERRADO. Sale de "derogados" y los tres `filter-*` entran a
   §7.6 con dueño 09.** El diagnóstico era correcto: ese `data-testid` **no** es un alias de
   `accounting-filter-approved` (el de la pantalla de Contabilidad, vigente), sino el del **filtro
   nuevo del módulo de Gastos** de la Tarea 5, junto con `filter-budget-status` y `filter-currency`,
   que §7.6 ni listaba ni derogaba. Era una colisión de nombres al redactar la tabla. §7.6 tiene
   ahora una fila propia —**"Filtros del módulo de Gastos: `filter-budget-status`,
   `filter-currency`, `filter-accounting-approved` | 09"**— y los tres salieron de la lista de
   derogados. La Tarea 5 se ejecuta tal cual estaba y el 12 ya tiene selector estable para
   "filtrar gastos por estado presupuestal".

2. ✅ **`expense-new`: CERRADO. Lo emite este paquete, Tarea 2 bis.** §7.6 ya lo asignaba aquí y
   ninguna tarea lo emitía; el 12 lo usa **tres veces** (E2, E4.1 y E5.1) para abrir el modal, así
   que sin él tres escenarios no arrancan. Como la regla anticolisión le da al 08 solo
   `renderModal()`, `EMPTY_FORM` y los handlers, el `headerActions`/`CmPageActions` donde vive el
   botón cae de este lado. **Se agrega `data-testid="expense-new"` al botón "Nuevo gasto"** — una
   línea, sin cambio funcional y sin tocar §7.6, que ya lo asignaba aquí.

3. ✅ **`expense-currency-{id}`: CERRADO. Agregado a §7.6.** Este paquete emite
   `data-testid="expense-currency-" + row.id` en la columna Moneda de las dos tablas, y ese nombre
   no estaba en la tabla canónica (que solo concedía `expense-ref-{id}`,
   `expense-budget-status-{id}` y `expense-accounting-status-{id}`), lo que violaba la regla de "no
   inventar un nombre sin actualizar §7.6 en el mismo PR". Ya está en la fila **"Tablas de gastos"**
   con dueño 09. El nombre del cuerpo no cambia.

4. ✅ **`accounting-filter-cost-center`: CERRADO. Agregado a §7.6 y a la Tarea 14.** Los specs
   E7.1, E7.2 y E7.7 del paquete 12 lo usan para acotar los tests al centro E2E y **nadie lo
   emitía**: el campo "Centro de costo" del panel de filtros de Contabilidad era un `react-select`
   async sin `data-testid`. Era "el único hueco conocido del contrato" que el propio 12 marcaba.
   Ahora está en la fila **"Contabilidad"** de §7.6 (dueño 09) y la Tarea 14 manda envolver el
   `<Select>` en un `<div data-testid="accounting-filter-cost-center">`.

5. ✅ **Columna "Comprobante" del índice de Gastos: CERRADA. Es de este paquete.** No existía en
   ningún lado: la Tarea 2 listaba 4 columnas nuevas y ninguna era esa, el 08 tenía prohibido tocar
   `this.columns`, y §7.6 le asignaba al 08 dos testids que en esa tabla no podía emitir. Se agregó
   como **sexta columna `receipt_file`** de la Tarea 2, que renderiza `expense-receipt-link-{id}` y
   `expense-receipt-preview-{id}` invocando `this.openReceiptPreview(id)` —el método que define el
   08, fuera del constructor—. Escrito en §4.5 y en §7.6.

6. ✅ **Etiquetas de fixture: CERRADAS por escrito.** `users(:contable)` **no existe y no se crea**:
   se usa `users(:contador)`, la canónica del 01. `users(:ingeniero_sin_permisos)` **sí** es
   etiqueta nueva y **la agrega este paquete** a `users.yml`; ya está listada en el párrafo de
   etiquetas canónicas de §7.2. Se acabó el "si ya existe con nombre canónico del 01 se reutiliza
   esa", que dejaba al agente decidiendo en tiempo de ejecución.

7. ✅ **Helper del catálogo de monedas: CERRADO.** No se crea `currency_options` (no existe y el
   grep previo nunca lo habría encontrado): el helper es **`get_currencies`**, del paquete 05, y
   aquí solo se consume. El catálogo del frontend llega además por `window.CM_CURRENCIES` (§4.5).

8. ✅ **Incoherencias internas de las tablas de archivos: CERRADAS.** Ya figuran en "Crear"
   `app/javascript/generalcomponents/expenseIndicators.js` (que crea la Tarea 1 y §7.2 asigna a
   este paquete, con el 08 como consumidor) y `test/integration/expense_menu_test.rb` (que exige el
   criterio 43); y en "Modificar", `app/views/report_expenses/index.html.erb` (que edita la
   Tarea 5.4). Ningún otro paquete los reclama.

9. ⚪ **Cobertura E2E declarada, no un pendiente.** El paquete 12 **no ejercita**
   `expense-accounting-status-{id}`, `cm-dt-select-all` ni `cm-dt-select-{id}`. Se decidió
   documentarlos como **cubiertos por verificación manual** de este paquete (grep + revisión en
   pantalla, anotada en el PR) en vez de encargar tres escenarios más. Está escrito en §7.6.
