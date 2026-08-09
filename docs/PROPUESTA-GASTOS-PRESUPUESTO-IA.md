# Propuesta — Control presupuestal de viáticos, gastos multimoneda y agente de IA

**Cliente:** Controlmatica
**Fecha:** agosto de 2026
**Modalidad:** precio cerrado por alcance
**Vigencia de la oferta:** 30 días

---

## 1. Resumen ejecutivo

Hoy los gastos de viáticos se registran en Controlmatica sin un control previo: cualquier
usuario carga un gasto contra un centro de costos y la verificación de si ese gasto "cabía"
en lo presupuestado ocurre después, de forma manual. Tampoco hay comprobantes adjuntos, ni
manejo de moneda extranjera, ni un circuito formal de aprobación contable.

Esta propuesta cubre dos frentes complementarios:

**A. Control presupuestal y transaccional.** El dueño del centro de costos asigna partidas de
presupuesto por persona, acotadas al valor de viáticos disponible. Cuando esa persona
registra un gasto, el sistema lo descuenta de su partida y lo aprueba automáticamente si
cabe; si se pasa, el gasto se registra igual pero queda sin aprobar. Se suma comprobante
adjunto, referencia por ID de registro, manejo de moneda extranjera con TRM, y una vista
dedicada para contabilidad con su propia aprobación.

**B. Captura de gastos con IA.** La persona en campo le envía la foto del comprobante —o una
nota de voz— al agente en WhatsApp. El agente lee el documento, extrae los datos, pregunta lo
que falte, valida contra las reglas de negocio de Controlmatica (antigüedad máxima, conceptos
no permitidos, duplicados), resuelve la TRM del día si el gasto es en otra moneda, confirma
con la persona y lo guarda en Controlmatica con el archivo adjunto. **La misma lectura
automática funciona dentro de la plataforma:** al adjuntar el comprobante en el formulario de
gasto, el sistema extrae los datos, hace la conversión de moneda si aplica y precarga los
campos para que la persona solo revise y confirme.

**Inversión total de implementación: $6.375.000 COP**, documentación y capacitación incluidas.
**Mensualidad de uso de la plataforma Taimes: $120.000 COP/mes** (ver sección 7).

---

## 2. Qué resuelve esta propuesta

| Situación actual                                                                              | Después de la implementación                                                              |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| El presupuesto de viáticos por persona no existe como dato; se controla por fuera del sistema | Cada persona tiene una partida asignada, visible y controlada dentro del centro de costos |
| Un gasto puede exceder lo presupuestado y nadie se entera hasta la revisión manual            | El sistema aprueba o marca el exceso en el momento del registro, con el motivo explícito  |
| Los soportes de gasto circulan por correo o WhatsApp, fuera del sistema                       | El comprobante queda adjunto al registro del gasto, almacenado de forma permanente        |
| Los gastos en moneda extranjera se convierten a mano, con criterio variable                   | Conversión con la TRM de la fecha del gasto, trazable y uniforme                          |
| Contabilidad revisa sobre la misma pantalla operativa, sin un circuito propio                 | Vista dedicada con solo los gastos aprobados y su propia aprobación contable              |
| Registrar un gasto exige entrar al sistema desde un computador                                | La persona lo registra por WhatsApp desde donde esté, con foto o voz                      |
| Los datos del comprobante se digitan a mano, campo por campo                                  | El sistema los extrae del comprobante y precarga el formulario; la persona solo revisa    |

---

## 3. Alcance — Parte A: Controlmatica

### 3.1 Módulo de Presupuesto de Viáticos

En lenguaje contable, el contenedor se llama **presupuesto** y cada asignación individual es
una **partida presupuestal**. La propuesta usa esa nomenclatura.

- Nueva pestaña **Presupuesto** dentro del detalle del centro de costos, visible para el
  dueño del centro y para quien tenga el permiso correspondiente.
- Formulario de creación de partida: **usuario**, **valor** y **notas**.
- Varias partidas por centro de costos, para el mismo usuario o para usuarios distintos.
- **Validación de tope:** la suma de las partidas de un centro de costos no puede superar el
  valor de viáticos del centro. El formulario muestra en vivo cuánto hay disponible y bloquea
  el guardado si se excede.
- Tablero de consumo por persona: **asignado / gastado / disponible**.
- Edición y eliminación de partidas con recálculo del consumo.
- Permisos propios (ver, crear, editar, eliminar) integrados al esquema de roles existente.
- Cada operación queda en el registro de edición.

### 3.2 Aprobación automática contra presupuesto

- Al registrar un gasto, el sistema lo compara contra la partida de esa persona en ese centro
  de costos y lo que ya lleva consumido.
- **Si cabe:** el gasto queda aprobado automáticamente.
- **Si se pasa:** el gasto se guarda igual, pero queda **sin aprobar**, con el motivo
  explícito ("excede el presupuesto disponible en $X").
- Recálculo consistente al editar o eliminar un gasto, y al modificar una partida.
- Garantía de que dos gastos registrados al mismo tiempo no puedan pasarse del tope
  aprovechando la simultaneidad.
- Estado y motivo visibles tanto en el módulo de Gastos como en el centro de costos.

### 3.3 Comprobante adjunto

- Campo de archivo en el formulario de gasto (imagen o PDF), con validación de tipo y tamaño.
- Disponible en los tres puntos de captura: módulo de Gastos, pestaña del centro de costos y
  agente de WhatsApp.
- Previsualización y descarga desde la tabla.
- Al adjuntar el comprobante, el sistema **extrae los datos automáticamente y precarga el
  formulario** (ver 4.6).

### 3.4 Referencia por número de registro

- Columna con el número de registro del gasto (ID), visible en la tabla, exportable a Excel y
  buscable

### 3.5 Multimoneda y TRM

| Campo                                | Moneda           | Descripción                                                                          |
| ------------------------------------ | ---------------- | ------------------------------------------------------------------------------------ |
| Valor / IVA / Total                  | COP              | Siempre en pesos, como hoy. Son los que alimentan los cálculos del centro de costos. |
| Valor / Impuestos / Total extranjero | Moneda del gasto | Los valores tal como aparecen en el comprobante.                                     |
| Moneda                               | —                | Catálogo de monedas.                                                                 |
| TRM                                  | —                | Tasa de la moneda para la **fecha del gasto**.                                       |

- Cálculo automático de los valores en pesos a partir del valor extranjero y la TRM, con
  posibilidad de ajuste manual.
- Consulta automática de la tasa, sin que la persona tenga que buscarla, y captura manual
  como respaldo si la fuente no responde.
- Los campos nuevos se propagan a la exportación e importación de Excel y a los cálculos de
  ejecución del centro de costos.

### 3.6 Vista y aprobación de Contabilidad

- Pantalla dedicada que lista **únicamente los gastos aprobados**, con sus filtros propios y
  exportación a Excel.
- Campo nuevo **aprobado por contabilidad**, con registro de quién y cuándo.
- Aprobación individual y masiva.
- Permiso propio, de modo que el perfil de contabilidad vea solo esta pantalla.
- Toda aprobación queda en el registro de edición.

### 3.7 Transversal

- Migración de los gastos históricos al nuevo esquema, sin pérdida de información.
- Actualización de la exportación e importación de Excel con los campos nuevos.
- Trazabilidad completa: todo movimiento de presupuesto, gasto y aprobación queda registrado
  con usuario y fecha.

---

## 4. Alcance — Parte B: Inteligencia artificial aplicada a los gastos

### 4.1 Configuración de la integración de Controlmatica con el agente

Configuración del servidor MCP de Controlmatica para el módulo de Gastos, con las
herramientas que el agente necesita para operar:

- Registro de gastos con todos los campos nuevos (presupuesto, moneda, TRM, contabilidad).
- Carga del comprobante y su asociación al gasto.
- Consulta del presupuesto disponible por persona y centro de costos, para poder advertir
  antes de guardar.
- Consulta de la tasa de cambio por moneda y fecha.
- Consulta de catálogos: centros de costos, tipos de gasto y medios de pago.
- Identificación de la persona a partir de su número de teléfono, para que el gasto quede
  atribuido a quien realmente lo reporta.

### 4.2 Canal de WhatsApp

El agente opera sobre el **canal de WhatsApp de Taimes**. Controlmatica no requiere tramitar
su propia cuenta de WhatsApp Business ni pasar por verificación con Meta, lo que elimina
semanas de trámite y el costo de habilitación.

> Implicación a tener en cuenta: los mensajes salen del número de Taimes, no de un número
> propio de Controlmatica. Si más adelante se quiere número y marca propios, se tramita como
> un servicio adicional.

### 4.3 Agente de captura de gastos

- **Por foto o PDF:** el agente lee el comprobante y extrae proveedor, NIT, número de
  factura, fecha, valor, impuestos, total y moneda.
- **Por voz:** transcribe la nota de voz y extrae la misma información.
- **Conversación de completitud:** si falta un dato obligatorio, lo pregunta en vez de
  inventarlo.
- **Confirmación explícita:** muestra el resumen y solo guarda cuando la persona confirma.
- Guarda el gasto y **adjunta el archivo original** al registro.
- Informa el resultado: si quedó aprobado contra presupuesto o no, y por qué.

### 4.4 Motor de reglas de negocio

Validación configurable antes de guardar. Se implementa el motor y se cargan las reglas
iniciales que defina Controlmatica:

- Antigüedad máxima del comprobante.
- Conceptos no permitidos (ej. licores).
- Detección de duplicados (mismo número de factura y proveedor).
- Tope de valor por gasto.
- Coherencia entre el valor declarado y el que muestra el comprobante.

Las reglas quedan parametrizables, para poder ajustarlas sin desarrollo nuevo.

### 4.5 Manejo de moneda por el agente

- Detecta la moneda del comprobante.
- Si no es COP, consulta la tasa de esa moneda **para la fecha del gasto** y completa los
  valores en pesos automáticamente.
- Si la fuente no tiene esa moneda o esa fecha, lo informa y pide la tasa a la persona en vez
  de asumir un valor.

### 4.6 Captura asistida desde la plataforma

La misma inteligencia del agente queda disponible **dentro de Controlmatica**, no solo por
WhatsApp. Quien prefiera trabajar desde el computador obtiene exactamente el mismo beneficio.

- La persona adjunta el comprobante en el formulario de gasto y el sistema **lee el documento
  y precarga los campos**: proveedor, NIT, número de factura, fecha, valor, impuestos, total
  y moneda.
- Si el comprobante está en moneda extranjera, **consulta la tasa de la fecha del gasto y
  completa la conversión a pesos** automáticamente, sin que la persona tenga que buscarla.
- Se aplican **las mismas reglas de negocio** que en WhatsApp (antigüedad, conceptos no
  permitidos, duplicados, topes): la validación es la misma sin importar por dónde entre el
  gasto.
- La persona revisa lo extraído, corrige lo que necesite y guarda. **Nunca se guarda sin
  confirmación**; la IA precarga, la persona decide.
- Disponible en los dos puntos de captura de la plataforma: el módulo de Gastos y la pestaña
  de Gastos del centro de costos.

El resultado es que digitar un gasto campo por campo deja de ser necesario en cualquiera de
los tres canales.

---

## 5. Inversión

Tarifa de ingeniería: **$75.000 COP/hora**.

| Fase | Entregable                                                  |  Horas |          Valor |
| ---- | ----------------------------------------------------------- | -----: | -------------: |
| 1    | Desarrollo módulo de Presupuesto de viáticos                |     20 |     $1.500.000 |
| 2    | Aprobación automática contra presupuesto                    |      7 |       $525.000 |
| 3    | Comprobante adjunto y almacenamiento permanente             |      6 |       $450.000 |
| 4    | Multimoneda y TRM                                           |     12 |       $900.000 |
| 5    | Vista y aprobación de contabilidad, referencia por registro |     10 |       $750.000 |
| 6    | Agente de WhatsApp y captura asistida en la plataforma      |     20 |     $1.500.000 |
| 7    | QA, migración, despliegue, documentación y capacitación     |     10 |       $750.000 |
|      | **Total implementación**                                    | **85** | **$6.375.000** |

Valores en pesos colombianos, antes de IVA. **Precio cerrado:** si la implementación toma más
horas de las previstas dentro del alcance acordado, el sobrecosto no se traslada al cliente.

### 5.3 Documentación y capacitación (incluidas)

- **Manual de usuario** de los módulos nuevos: presupuesto, gastos con comprobante y moneda
  extranjera, y vista de contabilidad.
- **Guía de configuración** de las reglas de negocio del agente, para que Controlmatica pueda
  ajustarlas sin depender del proveedor.
- **Instructivo de uso del agente de WhatsApp** para el personal en campo, en formato breve y
  distribuible por el mismo canal.
- **Sesiones de capacitación** Se hara una capacitacion para el uso del nuevo modulo

---

## 7. Modelo recurrente

### 7.1 Uso de la plataforma Taimes

El desarrollo y la configuración del agente están incluidos en el precio cerrado; el **uso de
la plataforma** se factura mensualmente:

**$120.000 COP/mes**, incluye hasta **1000 gastos desde wp por mes**.

Comprende:

- Disponibilidad y operación del agente de WhatsApp.
- Monitoreo y atención de incidentes en horario hábil.
- Ajustes menores de reglas de negocio y de comportamiento del agente, sin desarrollo nuevo.
- Actualizaciones de la plataforma.

Condiciones: facturación mensual, contrato inicial a 12 meses. Si el volumen supera de forma
sostenida los 600 gastos mensuales, se revisa el valor de común acuerdo. La mensualidad
empieza a facturarse desde la puesta en producción del agente, no antes.

### 7.2 Costos de terceros

| Concepto                                                 | Quién lo asume     | Observación                                                     |
| -------------------------------------------------------- | ------------------ | --------------------------------------------------------------- |
| Canal de WhatsApp                                        | Incluido           | Se usa el canal de Taimes; sin costo ni trámite adicional       |
| Consumo de modelos de IA (lectura de comprobantes y voz) | **Controlmatica**  | Se factura por consumo real, según volumen de gastos procesados |
| Tasas de cambio                                          | Sin costo previsto | Ver 7.3                                                         |
