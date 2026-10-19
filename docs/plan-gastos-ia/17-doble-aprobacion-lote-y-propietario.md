# 17 — Doble aprobación, carga de varios comprobantes y propietario del centro (2026-10-18)

Tres funcionalidades cotizadas el 2026-10-17 y hechas el 2026-10-18. Pedido del usuario para la
primera: **aditiva**, que nada de lo aprobado ni de lo que ya está en camino cambie.

## 1. Doble aprobación

**Qué hace.** Una regla que deja guardar puede marcar «Pedir una segunda aprobación» y elegir quién la
da: un **cargo** (rol) o una **persona**. Un gasto que incumple esa regla, al recibir la aprobación de
siempre, queda en **Pendiente 2ª aprobación** (`operational_state = "pendiente_segunda"`), fuera de
Contabilidad y sin consumir presupuesto. Cuando alguien del cargo (o la persona) lo aprueba, queda
**Aceptado** y pasa a Contabilidad.

**Por qué es aditiva.**
- La regla guarda `requires_second_approval` en `false` por defecto: ninguna regla de hoy la pide.
- El gasto guarda la **foto** de las reglas que pidieron segunda aprobación (`second_approval_rules`,
  `[]` por defecto). Solo se saca al crear el gasto o cuando una persona lo edita
  (`marcar_si_recalcula_la_segunda`, antes del redondeo). Aprobar, rechazar o contabilizar un gasto
  viejo **no** la saca. Así, configurar la doble aprobación después no le cambia el circuito a los
  gastos que ya están en camino ni a los aprobados.
- El paso de primera a segunda firma lo hace el modelo (`ReportExpense#resolver_doble_aprobacion`),
  así que el desplegable, el «Aceptar gastos» masivo y el enlace del correo siguen pidiendo
  «Aceptado» como siempre.

**Decisiones tomadas** (las recomendadas en la cotización, a falta de respuesta del cliente):
1. La misma persona no da las dos aprobaciones.
2. Si varias reglas piden segundos aprobadores distintos, basta con uno de ellos.
3. **Si Contabilidad rechaza, queda «Rechazado», con una o con dos aprobaciones** (pedido del usuario,
   2026-10-18). Se probó primero devolverlo a «Creado» y el usuario lo descartó: «la idea es que
   cualquiera de las dos quede rechazado». Al rechazarse pierde las firmas.
4. Si rechaza el segundo aprobador, también queda «Rechazado», con motivo y correo al responsable.
5. «Pendiente 2ª aprobación» no consume presupuesto: solo «Aceptado».
6. Orden fijo: primero la aprobación de siempre, después la segunda.
7. Lo que encontró la IA sobrevive a una edición sin comprobante nuevo (`ia_reasons` de la foto).

**Dónde se ve.** Reglas: sección «Doble aprobación» en el formulario y columna en la tabla. Gastos:
estado ámbar «Pendiente 2ª» con el detalle en el tooltip, pestaña «Por aprobar (2ª)» para quien una
regla nombra, filtro por el estado nuevo. Contabilidad no cambia: «Rechazar gasto…» para todos.
Correo nuevo `pending_second_approval`, con un
enlace firmado **a nombre del aprobador** (`ExpenseApprovalToken.generate_segunda`): el del dueño del
centro no sirve para la segunda firma.

## 2. Carga de varios comprobantes (ZIP)

Botón «Subir varios» en Gastos (permiso Crear). Acepta un ZIP o varios archivos sueltos. El ZIP se
abre **en el navegador, sin librerías** (`generalcomponents/receiptBatch.js`): directorio central +
`DecompressionStream("deflate-raw")`. Se descartan carpetas, `__MACOSX`, ocultos, lo que no es
PDF/imagen, lo de más de 20 MB y los **repetidos byte a byte** (antes de gastar una lectura de IA).
Máximo 50 por lote y 100 MB por ZIP.

Recorrido: paso de inicio (archivos ignorados y datos comunes: centro, responsable, tipo, medio de
pago) → el formulario de crear gasto de siempre, un comprobante a la vez, ya lleno por la IA (lee dos
por adelantado) → «Guardar y siguiente» / «Omitir» → resumen con lo que quedó sin registrar. Cada
gasto se guarda por el mismo `handleSubmit`: reglas, presupuesto, comprobante y correos igual que uno
solo. Cerrar con pendientes pide confirmación (también al cerrar la pestaña).

No incluidos (opcionales de la cotización): retomar subiendo el mismo ZIP, lote guardado en el
servidor, lote en la pantalla del centro de costos, lectura del XML de la DIAN.

## 3. Propietario del centro creado desde un reporte de servicio

Un reporte sin centro de costos crea uno (`Report#coste_center_verify`). Antes quedaba como propietario
quien hizo el reporte; ahora el formulario pide «Propietario del centro de costos que se va a crear»,
entre las personas con «Puede ser propietario», y el modelo lo exige (`propietario_del_centro_nuevo`).
En producción había 23 centros creados así (2026-10-17); el listado para corregirlos es el opcional que
no se hizo.

## Para producción

1. Desplegar.
2. `heroku run -a controlmatica bin/rails db:migrate` (migración `20261018000001`, solo agrega
   columnas; no hay Procfile, así que no corre sola).
3. Nada más: sin reglas con doble aprobación, todo sigue igual. Para usarla, marcarla en la regla.

## Pruebas

- `test/models/report_expense_doble_aprobacion_test.rb` (22), incluidas las de «no cambia nada».
- `test/controllers/report_expenses_doble_aprobacion_controller_test.rb` (15): tabla, masivo, pestaña,
  enlace del correo, rechazo de Contabilidad.
- `test/models/report_propietario_del_centro_test.rb` (4) y
  `test/controllers/reports_propietario_controller_test.rb` (2).
- E2E: `specs/double-approval.spec.js` (5) y `specs/batch-upload.spec.js` (2).
