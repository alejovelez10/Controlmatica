# Paquete 13 — Cierre: documentación, capacitación, datos y puesta en marcha

> **Paquete creado por la auditoría cruzada del plan.** Recoge los entregables que la propuesta
> vende explícitamente y que **no tenían dueño en ningún paquete**, más tres huecos operativos
> que dejaban funcionalidad construida pero inutilizable.
>
> Lectura previa obligatoria: `00-ARQUITECTURA.md` (§7 completo, en especial §7.9 runbook,
> §7.10 Tarea 0 y §7.11 alcance de este paquete) y `docs/PROPUESTA-GASTOS-PRESUPUESTO-IA.md` §5.3.
>
> **Este paquete no escribe código de negocio.** Escribe documentación, ejecuta el runbook,
> carga datos y firma actas. Su única pieza de código es una rake task de importación.

---

## Por qué existe

La auditoría encontró que la **Fase 7 del plan interno** (10 h, $750.000, *"QA, migración,
despliegue, documentación y capacitación"*) estaba **totalmente huérfana**: ninguno de los 12
paquetes tenía como entregable el manual de usuario, la guía de reglas, el instructivo de campo ni
las sesiones de capacitación. Lo único existente era `docs/TAIMES-AGENTE-GASTOS.md` (paquete 11,
dirigido a quien configura el agente, no al usuario final) y `test/e2e/README.md` (paquete 01).

Además detectó tres cosas construidas pero inservibles sin este paquete:

1. **`users.phone` se crea vacío** (paquete 11). En modo estricto —que es el default—
   `actor_user_by_phone` devuelve `nil` y **todo gasto por WhatsApp se rechaza**. Es el Riesgo #4
   del propio paquete 11 y la arquitectura §6.3 lo marca con probabilidad **Alta**.
2. **La configuración del agente dentro de Taimes no la hace nadie.** El paquete 11 dice
   textualmente *"no configura nada dentro de Taimes (no tenemos acceso); entrega la
   especificación"*. Sin este paquete, la especificación se queda en un documento.
3. **La transcripción de nota de voz** (propuesta §4.3, *"por voz: transcribe la nota de voz y
   extrae la misma información"*) no la implementa ni la verifica nadie: el 10 dice "es del
   paquete de WhatsApp" y el 11 dice "ocurre del lado Taimes". Nadie prueba que exista.

---

## Dependencias

| Depende de | Archivo | Qué necesita |
|---|---|---|
| **Todos (01–12)** | — | El sistema desplegado en staging y verde |
| **11** | `11-mcp-y-agente-whatsapp.md` | Anexo A (contrato Taimes), `docs/TAIMES-AGENTE-GASTOS.md`, las 7 tools, el script de verificación manual |
| **10** | `10-ia-extraccion-y-reglas.md` | Nombres exactos de los parámetros de `parameterizations`, sentinela `(NINGUNO)`, límite `money_value` integer |
| **04, 05, 06, 08, 09** | — | Las pantallas terminadas, para las capturas del manual |
| **Tarea 0** | `00-ARQUITECTURA.md` §7.10 | Ítems **0.7** (inventario de teléfonos) y **0.8** (acceso a la consola de Taimes) |

**Momento de ejecución**: ola 8 (la última). Pero **los ítems 0.7 y 0.8 de la Tarea 0 se levantan
al inicio del proyecto**, no aquí: si al abrir el dato resulta que no hay teléfonos, hay que
renegociar el alcance de la Parte B del paquete 11 **antes** de escribir su código.

---

## Archivos

**A crear**

| Archivo | Contenido |
|---|---|
| `docs/MANUAL-USUARIO-GASTOS.md` | Manual de usuario final de los módulos nuevos |
| `docs/GUIA-REGLAS-NEGOCIO.md` | Guía de configuración de las 5 reglas del agente |
| `docs/INSTRUCTIVO-WHATSAPP-CAMPO.md` | Instructivo de una página para personal en campo |
| `docs/RUNBOOK-DESPLIEGUE-GASTOS-IA.md` | Copia ejecutable del runbook de §7.9, con los valores reales del entorno |
| `docs/ACTA-CAPACITACION.md` | Plantilla de acta + acta firmada |
| `lib/tasks/users_phones.rake` | `rake users:import_phones[archivo.csv]`, idempotente |
| `test/lib/users_phones_rake_test.rb` | Tests de la rake task |

**A modificar**

| Archivo | Cambio |
|---|---|
| `docs/TAIMES-AGENTE-GASTOS.md` | Agregar la sección "Estado de la configuración en staging/producción" con el resultado de las tareas 5 y 6 |

---

## Tareas

### Bloque A — Datos: poblado de `users.phone`

**A1. Inventario de usuarios activos.**
Levantar la lista de usuarios que van a usar WhatsApp: `User.joins(:rol)` con su rol, correo y
estado. Entregable: hoja de cálculo con `id`, `names`, `email`, `rol`, `¿usa WhatsApp?`.
Es la salida del ítem **0.7** de la Tarea 0, ahora ejecutada.

**A2. Recolección y normalización.**
Recoger el número real de cada persona. Normalización obligatoria: **últimos 10 dígitos**, que es
exactamente lo que hace `User.normalize_phone` del paquete 11. Los formatos que hay que aceptar en
el archivo de entrada: `+57 300 123 4567`, `3001234567`, `57 300 1234567`, `(300) 123-4567`.

**A3. Detección de duplicados — es un requisito, no una validación cosmética.**
Un `phone_normalized` que aparezca **dos o más veces** significa **persona no identificada**. Regla
del paquete 11, que se conserva: ante ambigüedad se devuelve **ningún actor**, nunca "el primero".
El índice de `phone_normalized` **no es único** a propósito, para que el backfill no falle con dato
sucio. Entregable: lista de duplicados resueltos **antes** de cargar.

**A4. `rake users:import_phones[archivo.csv]`.**
- CSV con dos columnas: `email`, `phone`.
- Idempotente: correrla dos veces deja el mismo estado.
- `User.current` seteado en la primera línea (§5.3 capa 3 de la arquitectura), o los callbacks
  revientan.
- Reporta al final: cuántos actualizó, cuántos correos no encontró, cuántos teléfonos quedaron
  duplicados (y **no** los carga).
- **No sobrescribe** un teléfono existente distinto sin avisar: los lista y pide confirmación con
  `FORCE=1`.

**A5. Ejecución en staging y en producción**, con el reporte de salida guardado en el PR.

> 🔴 **Criterio de bloqueo.** Los **criterios de aceptación 27 y 28 del paquete 11** (creación de
> gasto por WhatsApp con actor resuelto por teléfono) **no se pueden dar por cumplidos** hasta que
> A5 esté ejecutado en el entorno correspondiente. Y el canal de WhatsApp **no se conecta** antes
> de A5.

### Bloque B — Configuración del agente en Taimes

**B1. Conectar el canal de WhatsApp** en staging, con el número de pruebas.

**B2. Cargar la skill "Gastos IA"** con las **7 tools** del paquete 11
(`expense_budgets_list`, `expense_budgets_available`, `exchange_rates_get`,
`expense_rules_validate`, `report_expenses_receipt_url_get`, `report_expenses_attach_receipt`,
`users_find_by_phone`), más las existentes que el guion usa. Fuente: Anexo A de
`11-mcp-y-agente-whatsapp.md` y `docs/TAIMES-AGENTE-GASTOS.md`.
Verificar que `tools/list` del MCP las devuelve todas (el paquete 11 tiene el test).

**B3. Cargar el guion**: orden obligatorio de las 10 llamadas, plantilla de confirmación explícita
y los 6 modos de fallo con el texto exacto que el agente debe decir.

**B4. Verificar la transcripción de nota de voz.**
Probar con **al menos 3 notas de voz reales** (no sintéticas), grabadas por personas distintas, en
condiciones de campo (ruido). Entregable: tabla con `nota → texto transcrito → campos extraídos →
¿correcto?`.
> ⚠️ Si Taimes **no** provee transcripción, se documenta como **no disponible** y se renegocia por
> escrito la §4.3 de la propuesta con el cliente. No se deja abierto ni se promete.

**B5. Ejecutar el script de verificación manual de aceptación del paquete 11** completo, y
**firmarlo**. Guardar el resultado en `docs/TAIMES-AGENTE-GASTOS.md`.

### Bloque C — Documentación

**C1. `docs/MANUAL-USUARIO-GASTOS.md`** — usuario final, no técnico. Secciones:
1. Presupuesto: qué es una partida, quién la asigna, cómo se lee el tablero
   asignado/gastado/disponible, por qué el disponible puede aparecer reducido de entrada
   (decisión **0.1**: los gastos históricos **sí** consumen presupuesto — hay que explicarlo).
2. Los tres estados de un gasto y por qué son independientes: aceptación operativa (`is_acepted`),
   estado presupuestal (`budget_status`, **lo escribe el sistema, nadie lo cambia a mano**) y
   aprobación contable. Incluir la tabla de §2.4 en lenguaje llano.
3. Por qué un gasto **excedido** se guarda igual y qué hacer con él.
4. Gasto con comprobante: formatos y tamaño admitidos, previsualizar, descargar, quitar.
5. Gasto en moneda extranjera: cómo se trae la tasa del día, qué significa el aviso *"no hay tasa
   para el X; se aplicó la del Y"*, y cuándo el valor en pesos pasa a `manual`.
6. Captura asistida por IA: **nunca se guarda sin confirmación**; revisar siempre los campos
   marcados con "verifique este dato".
7. Vista de Contabilidad: qué entra y qué no (**los excedidos no aparecen**), aprobación individual
   y masiva, y el caso que más tickets va a generar — *un gasto ya aprobado que pasa a excedido
   por una reducción de partida conserva su aprobación y sale de la vista por defecto; se recupera
   con el filtro "Aprobados por contabilidad"*.
8. Exportar e importar Excel. 🔴 **Advertencia destacada**: en el layout de 18 columnas, la
   columna **ID sobrescribe el registro existente**. Es destructivo por diseño.

Con capturas de las 4 pantallas nuevas.

**C2. `docs/GUIA-REGLAS-NEGOCIO.md`** — para que Controlmatica ajuste las reglas sin el proveedor.
- Las 5 reglas: antigüedad, concepto no permitido, duplicado, tope de valor, coherencia.
- Cómo se configuran desde la tabla `parameterizations`, con el **nombre exacto** de cada fila.
- 🔴 Los dos límites que hay que explicar sí o sí: `parameterizations` **no tiene ninguna columna
  de texto** (solo `name` string, `number_value` integer, `money_value` integer), por eso la lista
  de conceptos no permitidos es **una fila por palabra** con el prefijo
  `"GASTOS IA - CONCEPTO NO PERMITIDO - "`; y `money_value` es **integer**, así que los topes se
  expresan en pesos enteros.
- El sentinela `(NINGUNO)` para desactivar la regla de conceptos, y el `0` para desactivar
  cualquier regla numérica.
- Cuáles bloquean y cuáles solo advierten por defecto, y cómo cambiarlo con las filas
  `"GASTOS IA - BLOQUEA <REGLA>"`.
- 🔴 Nota comercial que va en el documento: **cualquier regla más allá de estas 5 es alcance
  nuevo** (§6.8).
- Y una línea sobre monedas: agregar una es un PR de una línea en `app/models/currency.rb` (§1.6),
  no una configuración.

**C3. `docs/INSTRUCTIVO-WHATSAPP-CAMPO.md`** — **una página**, distribuible por el mismo WhatsApp.
- Qué mandar: foto del comprobante, o nota de voz, o texto.
- Qué va a preguntar el agente y en qué orden.
- Cómo se ve la confirmación y por qué hay que responderla.
- Los 6 mensajes de error y qué hacer con cada uno, en especial *"no reconozco tu número"* → hay
  que pedirle al administrador que registre el teléfono (bloque A).
- Probado con **2 personas de campo** antes de darlo por bueno.

### Bloque D — Despliegue y capacitación

**D1. `docs/RUNBOOK-DESPLIEGUE-GASTOS-IA.md`** — copia de §7.9 con los **valores reales** del
entorno: nombre de la app de Heroku, región del bucket, valores de cada variable por entorno.
Ejecutar el runbook completo en producción:
- `heroku pg:backups:capture` antes de cada ola con migraciones;
- despliegue por olas, en el orden de §7.3;
- `rake permissions_gastos_ia:install`, `rake parameterizations_gastos_ia:install`,
  `rake gastos_ia_schema:check`, `rake storage:check`, `rake users:import_phones`;
- verificación de las **15 variables de entorno** de la tabla de §7.9 (13 filas: `AWS_ACCESS_KEY`,
  `AWS_SECRET_KEY` y `AWS_BUCKET` comparten una). 🔴 **Conteo corregido en el cierre de la
  reauditoría**: decía 11, la tabla tenía 13 variables individuales y además le faltaban
  `ECB_API_URL` y `EXCHANGE_RATE_OPEN_TIMEOUT`, que la Tarea 21 del paquete 05 sí declara. Las dos
  se agregaron a §7.9 y el total quedó en 15.

**D2. Verificar los kill switches** en staging, uno por uno (§7.9): revocar los `AccionModule` de
`"Presupuesto"` oculta la pestaña y devuelve 403; revocar los de `"Contabilidad"` saca la pantalla
del menú; `RECEIPT_EXTRACTION_ENABLED=false` apaga la extracción sin romper el registro manual;
`MCP_STRICT_EXPENSE_ACTOR=false` reactiva el fallback laxo. **Es la única estrategia de reversión
disponible después del punto de no retorno** (primer `ExpenseBudget` en producción).

**D3. Sesión de capacitación.** Agendada, realizada y con **acta firmada**
(`docs/ACTA-CAPACITACION.md`): fecha, asistentes, temas cubiertos, dudas abiertas.
Contenido mínimo: los tres estados, la decisión 0.1 (históricos consumen presupuesto), la decisión
0.2 (control sin IVA), el caso del gasto excedido que sale de la vista de contabilidad, y el uso
del agente de WhatsApp.

---

## Criterios de aceptación

1. [ ] `docs/MANUAL-USUARIO-GASTOS.md` existe, cubre las 8 secciones de C1 y tiene capturas de las
   4 pantallas nuevas.
2. [ ] Una persona ajena al proyecto ejecuta el flujo "crear partida → registrar gasto con
   comprobante → aprobarlo en contabilidad" **siguiendo solo el manual**, sin preguntar nada.
3. [ ] `docs/GUIA-REGLAS-NEGOCIO.md` existe y nombra cada fila de `parameterizations` con su
   nombre exacto, incluidos el prefijo de conceptos y el sentinela `(NINGUNO)`.
4. [ ] Una persona configura una regla nueva en staging siguiendo **solo** ese documento, y la
   regla surte efecto.
5. [ ] `docs/INSTRUCTIVO-WHATSAPP-CAMPO.md` cabe en **una página** y fue probado con 2 personas de
   campo.
6. [ ] `rake users:import_phones` es idempotente (correrla dos veces no cambia nada) y reporta
   correos no encontrados y duplicados sin cargarlos.
7. [ ] `User.where.not(phone_normalized: nil).count` en producción coincide con el inventario de
   A1, y `User.group(:phone_normalized).having("count(*) > 1").count` está **vacío**.
8. [ ] El canal de WhatsApp está conectado en staging y la skill "Gastos IA" lista las **7 tools**.
9. [ ] La transcripción de voz está probada con **3 notas reales** y documentada; o está
   documentada como no disponible **y renegociada por escrito**.
10. [ ] El script de verificación manual del paquete 11 está ejecutado y **firmado**.
11. [ ] `docs/RUNBOOK-DESPLIEGUE-GASTOS-IA.md` tiene los valores reales y fue ejecutado en
    producción, con las 5 rake tasks corridas y las **15 variables** de §7.9 verificadas.
12. [ ] Los 4 kill switches de D2 fueron probados en staging y documentados.
13. [ ] El acta de capacitación está **firmada** y guardada. **Es el criterio de cierre del
    proyecto.**

---

## Riesgos

1. **No hay teléfonos** (probabilidad **Alta**, según §6.3). Señal temprana: el inventario A1
   devuelve menos del 50 % de los usuarios con número. Mitigación: se levanta en la **Tarea 0**,
   al inicio del proyecto, no aquí — para poder renegociar el alcance de la Parte B del paquete 11
   antes de construirla.
2. **No hay acceso a la consola de Taimes.** El paquete 11 lo declara explícitamente. Sin acceso,
   el bloque B lo ejecuta el cliente siguiendo la especificación, y la responsabilidad de la
   configuración es suya. Se acuerda por escrito en el ítem **0.8** de la Tarea 0.
3. **La transcripción de voz no existe del lado Taimes.** Es una promesa comercial (§4.3) sobre
   una capacidad de terceros. Mitigación: se verifica en B4 y, si no está, se renegocia. No se
   deja implícito.
4. **La capacitación se agenda tarde y el proyecto queda "casi cerrado" para siempre.** Mitigación:
   la sesión se agenda **al inicio de la ola 7**, no al final de la 8.
5. **El manual se escribe contra pantallas que todavía cambian.** Mitigación: las capturas se
   toman después de que el paquete 12 esté verde; antes de eso se escribe el texto, no las
   imágenes.
