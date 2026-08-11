# ESTADO DE LA IMPLEMENTACIÓN

> Documento vivo. Se actualiza al terminar cada ola.
> **Rama de trabajo: `feature/gastos-presupuesto-ia`** (creada desde `feature/ui-modernization`).
> Nada se ha empujado al remoto ni desplegado. Todo es local y reversible.

---

## Cómo retomar esto después de un `/clear`

1. Lee este archivo primero.
2. Lee `00-README.md` (olas, definition of done) y `00-ARQUITECTURA.md` §7 (correcciones vinculantes,
   matriz de propiedad de archivos).
3. El paquete que sigue es el primero de la tabla de abajo que no esté en ✅.
4. Su especificación está en `NN-<nombre>.md`. Ejecuta **solo** las tareas de ese paquete y respeta
   la matriz de propiedad §7.2: si un archivo es de otro paquete, no lo toques.

---

## Tablero

| Ola | Paquete | Estado | Commit | Notas |
|---|---|---|---|---|
| — | Migración `users.phone` (Tarea 1 del 11, adelantada) | ✅ | `653e312` | Columna creada y aplicada en dev. **El dato no existe**: 0 de 29 usuarios |
| 1 | 01 — Infraestructura de pruebas | ⏳ | — | Minitest + Playwright desde cero |
| 1 | Extra — Teléfono en el formulario de usuario | ⏳ | — | Pedido explícito del cliente |
| 2 | 02 — Migraciones y esquema | ⬜ | — | |
| 2 | 03 — Deuda técnica bloqueante | ⬜ | — | Uploaders a S3, refactor de `search`, concern de auditoría |
| 3a | 04 — Presupuesto y aprobación | ⬜ | — | |
| 3a | 05 — Multimoneda y TRM | ⬜ | — | |
| 3b | 06 — Comprobante y contabilidad | ⬜ | — | |
| 3b | 10 — IA: extracción y reglas | ⬜ | — | |
| 4 | 07 — API, permisos y rutas | ⬜ | — | |
| 5 | 09 — Frontend: tablas y contabilidad | ⬜ | — | |
| 5 | 11 — MCP y contrato con Taimes | ⬜ | — | Sin la Tarea 1, ya hecha |
| 6 | 08 — Frontend: presupuesto y formulario | ⬜ | — | |
| 7 | 12 — Suite E2E Playwright | ⬜ | — | |
| 4 | 14 — Reglas de gastos configurables | ⬜ | — | **Nuevo**, pedido del cliente. Sustituye el motor de reglas del 10 |
| 8 | 13 — Cierre, documentación y puesta en marcha | ⬜ | — | |

Leyenda: ⬜ pendiente · ⏳ en curso · ✅ terminado y probado · ⚠️ terminado con salvedades

---

## Decisiones tomadas por defecto (el cliente estaba dormido)

Todas salen de `00-ARQUITECTURA.md` §7.10, que ya traía el valor por defecto razonado.
**Si alguna no le gusta al cliente, se cambia — pero hay que decírselo, no dejarlo pasar.**

| # | Decisión | Valor aplicado |
|---|---|---|
| 0.1 | ¿Los gastos históricos consumen presupuesto? | **Sí** |
| 0.2 | ¿Presupuesto con IVA o sin IVA? | **Sin IVA** (`invoice_value`) |
| 0.3 | Matriz de estados de aprobación | La tabla de verdad de §2.4 |
| 0.4 | Monedas del catálogo | **COP, USD, EUR** |
| 0.5 | Reglas de negocio | **Las 5 de la propuesta**, parametrizables |
| 0.6 | Credenciales S3 | ✅ Verificadas. Bucket `controlmatica`, región `us-east-2` |
| 0.7 | Teléfonos de usuarios | ✅ Respondido: **no existen**. Columna creada; el dato hay que recolectarlo |
| 0.8 | Acceso a la consola de Taimes | No se necesitó: la parte de Taimes queda fuera por decisión del cliente |

---

## Frontera de alcance: qué es "IA" y qué no

**Decisión del cliente (2026-08-10): todo lo que hable con un modelo lo hace Taimes.** Su agente
entrará después al código de Controlmatica y lo implementará, siempre que se le deje el contrato
escrito y el hueco listo. Aquí se hace **todo lo demás**.

| Componente | ¿Lo hago yo? | Por qué |
|---|---|---|
| `ReceiptExtractionService#call_vision_model` | ❌ **No** — es de Taimes | Es la única pieza que le habla a un modelo de visión |
| Esqueleto de `ReceiptExtractionService` (contrato, `Result`, JSON Schema de salida, mapeo de errores, seam) | ✅ Sí | Le deja el hueco exacto a Taimes: rellenar un método, no rediseñar |
| `ExpenseRuleService` (antigüedad, licores, duplicados, topes) | ✅ Sí | **No es IA**: son reglas de negocio en Ruby plano. El MCP y el formulario dependen de él |
| Endpoint de captura asistida + botón en el formulario | ✅ Sí, **detrás de `RECEIPT_EXTRACTION_ENABLED=false`** | Queda construido y apagado; se enciende cuando Taimes complete la extracción |
| Herramientas MCP, actor por teléfono, política de exposición | ✅ Sí | Es fontanería Ruby, no IA. Es justamente "lo escrito" por donde entra el agente |
| Agente de WhatsApp (conversación, voz, prompts) | ❌ No — es de Taimes | Vive fuera de este repo |
| Especificación del contrato para el agente | ✅ Sí | El paquete 11 la deja escrita |

Consecuencia: **el paquete 10 se parte**. Se implementa el motor de reglas y el esqueleto del
servicio; la llamada al modelo queda como `NotImplementedError` documentado, con el flag apagado.
Nada más del sistema se rompe por eso: sin extracción, el formulario simplemente se llena a mano.

## Lo que NO se va a hacer esta noche

- **Todo lo que hable con un modelo de IA** (ver la tabla de arriba). Es de Taimes.
- **Desplegar a Heroku ni tocar producción.** Requiere aprobación explícita.
- **Setear las config vars de Heroku** (`AWS_REGION=us-east-2` entre otras). Queda documentado como
  paso manual en el paquete 13.

---

## Pendientes que requieren a una persona

1. **Rotar la llave de AWS.** Quedó expuesta en un chat y tiene alcance de cuenta completa: ve 19
   buckets de clientes distintos. Lo correcto es un usuario IAM limitado al bucket `controlmatica`.
2. **`heroku config:set AWS_REGION=us-east-2`** antes de mergear el paquete 03, o las subidas fallan
   de forma intermitente.
3. **Recolectar los teléfonos** de los usuarios. Es la ruta crítica del canal de WhatsApp.
4. **Confirmar las decisiones 0.1 a 0.5** de la tabla de arriba.

---

## Bitácora

*(se llena al cerrar cada ola)*
