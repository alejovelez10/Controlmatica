# 15 — Mejoras de octubre 2026 (rechazo, permisos y exportación)

Nueve mejoras pedidas el 2026-10-06. Este documento las organiza; **no las aprueba**: las
decisiones abiertas están en §3 y hay cuatro que bloquean el arranque.

Se escribió después de mapear el código real, no de memoria. Todo lo que afirma sobre el estado
actual está citado con `archivo:línea`.

---

## 1. Lo que el mapeo cambió respecto de lo pedido

Tres cosas que no se ven desde la pantalla y que reordenan el trabajo:

**(a) Editar, eliminar y aceptar NO son permisos de servidor hoy.** `create` (`:151`), `update`
(`:221`), `destroy` (`:268`), `update_state_report_expense` —aceptar— (`:116`) y la aceptación
masiva (`:185`) de `report_expenses_controller.rb` **no verifican ningún permiso**. Los botones
solo se esconden en el frontend con `estados.edit / delete / closed`. El export de Gastos
(`:487`) tampoco valida `Exportar a excel`, a diferencia del de Contabilidad (`:165`).

Consecuencia directa: **un permiso nuevo de "aceptar" no serviría de nada** mientras el endpoint
siga abierto, y el punto 9 ("el que tenga Ver todos no puede editar ni eliminar") no es quitar un
botón, es **poner el candado que falta**. Por eso se agrega una mejora **M1** que no estaba en la
lista y va primero.

**(b) No existe "interventor" en el código.** El que aprueba es el **propietario del centro de
costos** (`cost_centers.user_owner_id`, `cost_center.rb:111`), y hoy aprueba **por correo, sin
sesión y sin permiso**: la autorización es un token firmado de 7 días
(`expense_approval_token.rb`), no el sistema de roles. El rechazo tiene que viajar por ese mismo
token o queda un camino sí y ningún camino no.

**(c) El estado operativo es un booleano.** `is_acepted` (`false` = "Creado", `true` =
"Aceptado"). No hay columna de rechazo, ni acción, ni botón: el "no" del aprobador hoy es
**implícito**, y el propio correo lo dice —*"si no está de acuerdo, no haga nada"*
(`pending_approval.text.erb`). "Creado" no existe como constante: es la etiqueta de
`is_acepted == false`, calculada en seis sitios del frontend y en los dos Excel.

**Y una herencia que conviene saber antes de tocar las sumas:** viáticos y presupuesto ya no
cuadran entre sí hoy. Presupuesto cuenta **solo lo aceptado** (`expense_budget_service.rb:63`);
viáticos/AIU suman **todo**, sin ninguna condición (`application_helper.rb:621`), así que un
gasto en "Creado" ya pesa en el AIU del centro.

---

## 2. Las mejoras, en orden de ejecución

El orden no es el de la lista original: manda la dependencia. **M2 es la base de M5, M6, M7 y
M8**, así que va temprano aunque no sea la más vistosa.

| # | Mejora | Punto original | Depende de |
|---|---|---|---|
| **M1** | Candados de servidor para crear, editar, eliminar, aceptar y exportar | — (prerequisito) | — |
| **M2** | Estado de rechazo (columnas, etiqueta, filtros, Excel) | 3 (parte 1) | — |
| **M3** | Campo observaciones | 2 | comparte migración con M2 |
| **M4** | Dos permisos de aceptar: "Aceptar gasto" y "Aceptar todos los gastos" | 1 | M1 |
| **M5** | Rechazar (pantalla + correo) y correo de respuesta al responsable | 3 (parte 2) | M1, M2 |
| **M6** | Al editar, el gasto vuelve a Creado y se vuelve a avisar | 4 | M2, M5 |
| **M7** | Contabilidad rechaza, y deja de necesitar "Ver todos" | 5 | M2, M5 |
| **M8** | Un gasto rechazado no suma en viáticos ni en presupuesto | 6 | M2 |
| **M9** | Esconder el botón de subir Excel | 7 | — |
| **M10** | Exportar en Gastos: solo los seleccionados y los comprobantes | 8 | M1 |

### M1 — Candados de servidor (prerequisito)

Agregar la verificación que falta en `report_expenses_controller.rb`: `create` → `Gastos · Crear`;
`update` → `Gastos · Editar`; `destroy` → `Gastos · Eliminar`; `update_state_report_expense` y
`update_filter_values` → el permiso de aceptar que resulte de M4; `download_file` → `Gastos ·
Exportar a excel`. Mismo patrón que ya usa Contabilidad: `is_admin? || has_menu_permission?(...)`
con respuesta 403 JSON (`accounting_expenses_controller.rb:68`).

**Riesgo real y por eso va con pruebas de controller antes que nada:** si algún rol trabaja hoy
apoyado en que el endpoint está abierto, el candado se lo corta de golpe. Hay que revisar en
producción qué roles tienen `Editar`, `Eliminar` y `Aceptar gasto` **antes** de desplegar.

### M2 — Estado de rechazo

Tercer estado operativo: **Creado / Aceptado / Rechazado**. La forma propuesta (decisión D1, §3)
es **no** convertir `is_acepted` en un enum, sino agregar `rejected_at`, `rejected_by_id` y
`rejection_reason`, dejando "Rechazado" = `is_acepted == false AND rejected_at IS NOT NULL`.

Por qué así: `is_acepted: true` es la condición que gobierna el consumo de presupuesto
(`expense_budget_service.rb:63`), el FIFO (`:409`) y la base del scope de Contabilidad
(`accounting_expenses_controller.rb:355`). Un enum obliga a reescribir los tres y las seis
etiquetas del frontend; esto no toca ninguna semántica existente y **regala M8 para presupuesto**
(un rechazado tiene `is_acepted == false`, así que ya no consume cupo sin escribir una línea).

Alcance: migración, `estado_operativo` en el modelo con su etiqueta, la píldora y el desplegable
de la tabla (`ReportExpenseIndex.js:366` y `:378-383`), el filtro de Estado (`:1509` y
`FormFilter.jsx:205`), las tablas de Contabilidad (`AccountingExpenseIndex.js:215`) y del centro
(`ExpensesTable.jsx:151`), y la columna "Estado operativo" de los dos Excel.

### M3 — Campo observaciones

Columna `observations` tipo `text` (el precedente del repo para esto es `t.text`, y
`description` ya es `text`). Va en los dos formularios web, en el Excel y en el import. Comparte
migración con M2 para no correr dos veces en producción. **Decisión D2:** quién lo escribe.

### M4 — Dos permisos de aceptar

Hoy existe uno solo: `Gastos · Aceptar gasto`. La propuesta es que **ese se quede significando
"los de los centros a mi cargo"** y se cree `Gastos · Aceptar todos los gastos`. Se sigue la
plantilla del renombre de permisos de septiembre (`20260918000001`): migración de **dato**,
acotada al módulo por subconsulta, idempotente, `up`/`down` simétricos, y **código y migración en
el mismo commit** —con la migración corrida y el código viejo, nadie podría aceptar nada—.

El alcance del "a mi cargo" ya existe y está probado: `apply_expense_scope` con
`scope == "owned_centers"` (`report_expenses_controller.rb:777`). **Decisión D3:** a qué roles se
les da el permiso nuevo al migrar.

### M5 — Rechazar y avisar el resultado

Tres piezas:

1. **Rechazar desde la pantalla:** el desplegable de estado pasa a tener tres opciones; el
   backend escribe `rejected_at`, `rejected_by_id`, `rejection_reason` y fuerza
   `is_acepted: false`, y después reevalúa el par (`reevaluate_center_user!`) igual que hoy hace
   aceptar (`report_expenses_controller.rb:131`).
2. **Rechazar desde el correo:** un `POST` nuevo en `expense_approvals_controller.rb` con el
   **mismo token** y la misma mecánica de dos pasos (el GET solo pinta, porque los antivirus de
   correo visitan los enlaces y un GET mutante rechazaría solo). Idempotente, como el de aprobar.
3. **Correo de respuesta al responsable** (`user_invoice`), con el estado y el motivo. Es un
   mailer nuevo; hoy solo existe `pending_approval`. Se cuelga del **mismo interruptor**
   `EXPENSE_APPROVAL_EMAIL`, que sigue apagado en producción.

### M6 — Editar devuelve el gasto a Creado

Al editar, `rejected_at` y `is_acepted` vuelven a cero y se vuelve a avisar al dueño del centro.
**Decisión D4**, que es la que más puede doler: qué cuenta como "editar". Sin un recorte, un
admin que corrige 300 filas dispara 300 correos, y un gasto ya **contabilizado** se devolvería a
Creado por un cambio de descripción.

### M7 — Contabilidad rechaza y ve todo

Dos cambios, los dos en `accounting_expenses_controller.rb`:

- Quien tenga `Contabilidad · Contabilizar` puede **rechazar**, con el mismo recálculo de M5.
- Se **retira** el recorte por persona `scope.where(user_invoice_id: current_user.id) unless
  ver_todos?` (`:359`): quien entra al módulo ve todo lo aceptado. El permiso `Contabilidad · Ver
  todos` queda sin uso —hay que decidir si se borra o se deja inerte—.

Efecto que conviene tener claro: la base del scope de Contabilidad es `is_acepted: true` (`:355`),
así que **un gasto rechazado desaparece de Contabilidad**. Es coherente, pero significa que quien
rechaza por error lo pierde de vista desde esa pantalla.

### M8 — Un gasto rechazado no suma

- **Presupuesto: ya queda resuelto por M2** (`consumidores` filtra `is_acepted: true`).
- **Viáticos: hay que tocarlo.** `application_helper.rb:621` suma `invoice_value` de **todos** los
  gastos del centro, sin condición, y de ahí se propaga a `aiu`, `aiu_percent`, `aiu_real`,
  `aiu_percent_real` y `total_expenses`, que se **persisten** en `cost_centers`. Se excluyen los
  rechazados y se recalculan los centros afectados.

**Lo que esto NO hace, y es deliberado:** los gastos en "Creado" siguen sumando en viáticos. Es
el comportamiento de hoy y cambiarlo mueve el AIU de todos los centros. Si se quiere, es otra
mejora con su propia decisión.

### M9 — Esconder el botón de subir Excel

`estados.import` deja de pintarse (`ReportExpenseIndex.js:2464`). El endpoint sigue existiendo y
sigue siendo solo de administrador (`report_expenses_controller.rb:470`), así que esconder el
botón no abre nada. Hay que mirar también el componente viejo `FormImportFile.jsx`.

### M10 — Exportación en Gastos

- **Solo los seleccionados:** el backend de Contabilidad ya sabe recibir `ids[]`
  (`accounting_expenses_controller.rb:361`); el de Gastos no lee `ids` en absoluto. Se agrega, y
  el frontend los manda. Hoy el export **ignora la selección a propósito** y exporta el filtro
  (`AccountingExpenseIndex.js:655`): eso cambia, así que el botón tiene que decir qué va a bajar.
- **Comprobantes:** se replica el ZIP que ya existe en Contabilidad
  (`download_receipts/accounting_expenses`, `:197`): armado en memoria con `rubyzip` (ya está en
  el `Gemfile:103`), tope de 500, `FALTANTES.txt` para los gastos sin comprobante, nombres
  saneados para Windows. **No se copia y pega:** se extrae a un lugar común y lo usan las dos
  pantallas, porque dos ZIP que divergen es exactamente el problema que ya tienen los dos
  `.xlsx.axlsx`, que son "copias byte a byte" por obligación.
- Las dos vistas de Excel **ya son idénticas** (18 columnas), así que "exportar como
  contabilidad" no requiere tocar columnas.

---

## 3. Decisiones abiertas

Las cuatro primeras **bloquean el arranque** de su mejora.

| # | Decisión | Default propuesto | Bloquea |
|---|---|---|---|
| **D1** | ¿El rechazo es columna nueva (`rejected_at`) o `is_acepted` pasa a ser un enum de tres valores? | **Columna nueva.** No toca la semántica de `is_acepted`, que gobierna presupuesto, FIFO y Contabilidad, y resuelve M8 para presupuesto sin escribir código. | M2 |
| **D2** | ¿Quién escribe "observaciones": el que registra el gasto, o es el motivo de rechazo del aprobador? | **Dos campos distintos.** `observations` libre para quien registra; `rejection_reason` lo escribe quien rechaza. Mezclarlos deja al aprobador pisando lo que escribió el otro. | M3 |
| **D3** | Al migrar los permisos, ¿quién recibe "Aceptar todos los gastos"? | **Solo Administrador** (que ya se salta todos los permisos). A quien tenga hoy `Aceptar gasto` + `Ver todos` se le queda el alcance recortado a sus centros, y hay que avisarle. | M4 |
| **D4** | ¿Qué edición devuelve el gasto a "Creado"? | **Solo si cambia un campo que importa** (valor, IVA, total, fecha, número de factura, NIT, centro, responsable, tipo) y **solo si el gasto no está contabilizado**. Corregir una descripción no debería reabrir una aprobación ni mandar un correo. | M6 |
| D5 | ¿El rechazo en Contabilidad también desaceptar, o es un estado contable aparte? | **Desacepta**, y por eso sale de la pantalla de Contabilidad. | M7 |
| D6 | `Contabilidad · Ver todos` queda sin uso tras M7: ¿se borra el permiso o se deja inerte? | **Se deja inerte** y se anota. Borrarlo es una migración de dato más por un permiso que no estorba. | M7 |
| D7 | ¿Los gastos en "Creado" deberían dejar de sumar en viáticos, como los rechazados? | **No se toca ahora.** Mueve el AIU de todos los centros; es mejora aparte. | — |
| D8 | ¿El import de Excel se esconde solo, o también se bloquea el endpoint? | **Solo se esconde.** El endpoint ya es de administrador y el import es la vía de la carga histórica. | M9 |

---

## 4. Riesgos encontrados que NO están en la lista de las nueve

Se registran porque el mapeo los encontró, no porque se vayan a hacer.

1. **`accion_modules_controller.rb` y `rols_controller.rb` no verifican que el usuario sea
   administrador** —solo que tenga sesión— y además se saltan el token CSRF en
   `create/update/destroy`. Hoy cualquier usuario con cuenta podría crear acciones o reasignarse
   los permisos de su rol. **Es más grave que cualquiera de las nueve mejoras** y además vuelve
   decorativo todo M1 y M4: no sirve poner candados en Gastos si cualquiera puede repartirse las
   llaves. Pendiente de decisión del cliente.
2. `update_state_report_expense` no recalcula los indicadores del centro
   (`report_expenses_controller.rb:116-136`), así que aceptar o desaceptar no mueve viáticos ni
   AIU. Con M8 esto hay que revisarlo o el número queda viejo hasta la próxima edición.
3. El token de aprobación **no se invalida al usarse** y dura 7 días
   (`expense_approval_token.rb`). Con M5, el mismo token sirve para aprobar y para rechazar: hay
   que decidir si el primer uso lo cierra.

*Documento escrito el 2026-10-06. Ninguna mejora implementada todavía.*
