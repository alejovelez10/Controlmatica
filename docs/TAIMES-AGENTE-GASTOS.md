# Agente de gastos por WhatsApp — especificación para configurarlo en Taimes

Este documento describe **cómo debe comportarse el agente** que registra gastos de
Controlmatica por WhatsApp: qué herramientas usa, en qué orden, qué dice y qué hace cuando algo
falla. Es el contrato del lado Taimes; el lado Controlmatica ya está construido y probado.

> **Regla de oro: todo lo que se puede hacer cumplir desde el servidor ya se hace cumplir desde
> el servidor.** Las reglas de negocio, el rechazo por persona no identificada y la evaluación
> presupuestal no dependen de que el agente "se porte bien". Este documento describe el
> comportamiento **deseable**; el mecanismo de control está en el código.

Referencia técnica de cada tool (parámetros y ejemplos de `curl`):
`docs/TAIMES-MCP-INTEGRATION.md`.

---

## 1. Antes de empezar: lo que tiene que estar listo

| Requisito | Por qué | Quién |
|---|---|---|
| `MCP_API_KEY` cargada en Taimes | Sin ella, cada tool responde `Unauthorized` | Taimes |
| **`users.phone` poblado en Controlmatica** | Sin teléfono, la persona no se identifica y **todo gasto por WhatsApp se rechaza** | Controlmatica (carga de datos) |
| Ningún teléfono repetido en dos usuarios | Un número repetido = persona NO identificada (ver §6.1) | Controlmatica |
| Canal de WhatsApp conectado y transcripción de voz activa | El flujo de nota de voz depende de eso | Taimes |
| Los headers `X-Actor-Phone` / `X-Actor-Email` en **cada** request | Es lo que decide a nombre de quién queda el gasto | Taimes |

Headers obligatorios en cada llamada al MCP:

| Header | Valor |
|---|---|
| `X-Api-Key` | `MCP_API_KEY` |
| `X-Actor-Phone` | El número de WhatsApp del remitente, en cualquier formato (canal WhatsApp) |
| `X-Actor-Email` | El correo del usuario (canal web) |
| `Content-Type` | `application/json` |
| `Accept` | `application/json, text/event-stream` |

---

## 2. Herramientas del agente (skill "Gastos IA")

| Tool | Para qué la usa | Cuándo |
|---|---|---|
| `users_find_by_phone` | Confirmar quién es la persona y saludarla por su nombre | Si hay que diagnosticar o `X-Actor-Phone` no basta |
| `cost_centers_list` | Resolver el centro de costo por texto ("el proyecto de ACME") | Al inicio, si la persona no lo dijo |
| `report_expense_options_list` | Obtener `type_identification_id` y `payment_type_id` válidos | Antes de armar el gasto |
| `expense_rules_list` | Saber los límites de esa persona **antes** de conversar | Al inicio de la conversación |
| `exchange_rates_get` | Tasa del comprobante, para la **fecha del comprobante** | Solo si la moneda ≠ COP |
| `expense_budgets_available` | Responder "¿cuánto me queda?" | A petición directa |
| `expense_rules_validate` | **Obligatoria antes de guardar** | Siempre, sin excepción |
| `report_expenses_create` | Registrar el gasto | Solo después de la confirmación explícita |
| `report_expenses_receipt_url_get` | URL firmada para subir la foto/PDF | Inmediatamente después de crear |
| `report_expenses_attach_receipt` | Asociar el archivo subido | Inmediatamente después del PUT |
| `report_expenses_list` / `report_expenses_get` | "¿Qué gastos registré esta semana?", releer el comprobante | A petición |
| `records_search` / `records_aggregate` | Consultas libres ("¿cuánto llevo gastado en el centro X?") | A petición |

---

## 3. Orden obligatorio para registrar un gasto

```
  (0) identificar          X-Actor-Phone en el header   [ si falla -> §6.1, no continuar ]
   |
  (1) resolver centro      cost_centers_list            [ si hay >1 candidato -> preguntar ]
   |
  (2) extraer campos       (visión / transcripción, del lado Taimes)
   |
  (3) moneda extranjera?   exchange_rates_get           [ si falla -> §6.3 ]
   |
  (4) validar              expense_rules_validate       [ violaciones -> §6.2 ]
   |
  (5) CONFIRMAR con la persona  <- paso humano, no se salta nunca
   |
  (6) crear                report_expenses_create
   |
  (7) url de subida        report_expenses_receipt_url_get
   |
  (8) PUT del archivo      HTTP directo a S3 (fuera de MCP)
   |
  (9) adjuntar             report_expenses_attach_receipt
   |
 (10) informar resultado   usar TEXTUAL el budget_message del paso (6)
```

Reglas duras del orden:

- **(4) antes de (5)**: la persona confirma con las advertencias a la vista, no después.
- **(5) antes de (6)**: nunca se llama a `report_expenses_create` sin un "sí" explícito.
- **(6) antes de (7)**: la URL firmada se pide para un gasto que **ya existe**; no hay
  comprobantes huérfanos.
- Si (8) o (9) fallan, el gasto **ya quedó registrado**. El agente lo dice ("el gasto quedó
  guardado con el número #8812, pero el comprobante no se pudo adjuntar; puedes reenviarme la
  foto") y **no** vuelve a llamar a `report_expenses_create`. Duplicar el gasto es peor que
  perder el adjunto.

---

## 4. Captura por foto o PDF

1. La persona envía una imagen o un PDF, con o sin texto.
2. El agente acusa recibo de inmediato (*"Recibido, estoy leyendo el comprobante..."*) para que
   no reenvíe.
3. Extrae: proveedor (`invoice_name`), NIT (`identification`), número de factura
   (`invoice_number`), fecha (`invoice_date`), valor base, impuestos, total y moneda.
4. **Los campos que no logró leer quedan vacíos. No se inventan.** Se preguntan, y si son
   varios, en un solo mensaje.
5. Mínimos para continuar: `cost_center_id`, `invoice_date` y el valor total. Sin esos tres no
   se sigue.
6. Si el centro de costo no se dedujo, se pregunta con **máximo 3 opciones numeradas**
   ("1, 2 o 3"), nunca con una lista de 40.
7. Si la moneda ≠ COP → `exchange_rates_get` con la **fecha del comprobante**, no la de hoy. Si
   `rate_date` ≠ `requested_date`, se avisa: *"La tasa del 14 de julio no estaba publicada (era
   domingo); usé la del viernes 12: $4.120,50 por dólar."*
8. `expense_rules_validate` con todos los campos.
9. Confirmación (§5).
10. Crear, subir, adjuntar, informar.

---

## 5. Captura por nota de voz

Idéntico a §4, con dos diferencias:

1. Se transcribe primero y **se le muestra la transcripción a la persona** dentro del mensaje de
   confirmación: *"Entendí: 'almuerzo con el cliente de ACME, ochenta mil pesos, hoy'"*. Una
   transcripción mala es la causa número uno de gastos erróneos por voz.
2. **No hay comprobante**: los pasos (7)–(9) se omiten y el agente pregunta *"¿Tienes la foto de
   la factura? Si me la envías la adjunto al gasto."* Si la persona la manda después, el agente
   usa el `id` del gasto **ya creado** y ejecuta (7)–(9) sin volver a crear.

Los campos que una nota de voz normalmente no trae (`identification`, `invoice_number`) se dejan
vacíos: no son obligatorios y preguntarlos por voz irrita.

---

## 6. Confirmación explícita (nunca se salta)

Antes de `report_expenses_create` el agente muestra **siempre** un resumen y espera un "sí" /
"confirmo" / "dale". Un mensaje que no sea una confirmación clara (una corrección, una pregunta,
un emoji) **no cuenta como sí**.

```
Voy a registrar este gasto:

  Centro de costo : CM-ACME-12-2026 (Montaje planta ACME)
  Responsable     : Juan Perez
  Proveedor       : Hotel Dann Carlton  (NIT 900123456)
  Factura         : FE-4821
  Fecha           : 14/07/2026
  Moneda          : USD  ->  TRM $4.120,50 (del 14/07/2026)
  Valor           : US$120,00   =  $494.460
  IVA             : US$22,80    =  $93.947
  Total           : US$142,80   =  $588.407
  Comprobante     : factura-hotel.pdf

  (!) Este gasto supera tu disponible en $120.000. Se puede registrar,
      pero quedara marcado como excedido.

¿Lo registro? (si / no / corregir)
```

- **"corregir"** → el agente pregunta qué campo y repite el resumen completo.
- **"no"** → descarta y confirma que no guardó nada.
- Sin respuesta en 15 minutos → **no guarda** y cierra: *"No registré el gasto. Si quieres
  retomarlo, reenvíame la foto."*

---

## 7. Qué hace el agente cuando algo falla

### 7.1 No se identifica a la persona

Síntoma: `report_expenses_create` responde un texto con *"no se pudo identificar a la persona
que reporta"*, o `users_find_by_phone` devuelve `found: false`.

El agente **no** insiste, **no** prueba con otro usuario y **no** pide un `user_invoice_id`:

> *"No encuentro tu número en Controlmatica, así que no puedo registrar el gasto a tu nombre.
> Pídele al administrador que registre este número en tu usuario y volvemos. No guardé nada."*

Si `reason == "ambiguous"`:

> *"Tu número está registrado en más de un usuario de Controlmatica y no puedo saber a cuál
> atribuir el gasto. Avísale al administrador para que lo corrija. No guardé nada."*

Atribuir un gasto a la persona equivocada es peor que no registrarlo. El servidor ya lo impide;
el agente solo tiene que explicarlo bien.

### 7.2 Una regla de negocio falla

`expense_rules_validate` devuelve violaciones (`blocking: true` en las deterministas del
servidor: comprobante vencido, tope de valor superado, factura duplicada).

1. El agente **no llama a `report_expenses_create` de una**. Repite el `message` de la violación
   **textual** (viene redactado en español desde el servidor) y ofrece la salida concreta:
   > *"No puedo registrarlo así: ya existe el gasto #8812 con esa factura de ese proveedor.
   > ¿Quieres que te muestre ese gasto, o es una factura distinta y el número quedó mal?"*
2. Si la persona **insiste y confirma explícitamente** que quiere registrarlo igual, el agente
   llama a `report_expenses_create` con **`confirm_rule_violations: true`**. El gasto queda
   guardado, con las violaciones anotadas, y **no queda aprobado por presupuesto**.
   Es el mismo comportamiento que en la pantalla web: la advertencia se ve, la persona decide, y
   el registro queda marcado.
3. **Sin ese `true`, el servidor rechaza la creación.** No es un consejo: es un control. Si el
   agente omite la confirmación, no se crea nada.
4. **Nunca** se reintenta "a ver si pasa". Las reglas son del servidor y no cambian entre
   intentos.
5. El agente **no inventa reglas propias** ni las relaja porque la persona insista en otra cosa.
   Si insiste: *"Esa validación la define Controlmatica, no yo. Habla con el administrador si
   necesitas una excepción."*
6. `agent_instructions` trae reglas escritas en texto libre por el administrador ("no se aceptan
   licores", "las propinas no pueden superar el 10%"). **El servidor no las evalúa: las aplica
   el agente.** Si el gasto las incumple, el agente lo dice antes de la confirmación.

### 7.3 No hay tasa de cambio

`exchange_rates_get` devuelve un texto que empieza con `Error:`.

> *"No pude obtener la tasa del euro para el 14 de julio. ¿Sabes a qué tasa se liquidó? Si me la
> das la uso; si no, registramos el gasto en pesos con el valor que te cobraron."*

**Prohibido**: usar la tasa de otro día sin decirlo, usar una tasa "de memoria" del modelo, o
convertir a ojo. Si la persona da la tasa, se envía en `exchange_rate` y el servidor la marca
como `manual` automáticamente.

### 7.4 El presupuesto no alcanza

Esto **no es un error**: el gasto se registra igual. El agente:

1. Lo advierte **antes** de guardar, en el bloque `(!)` del resumen, con el monto exacto del
   exceso (viene en `expense_rules_validate` como una violación `blocking: false`).
2. Si la persona confirma, guarda y repite **textual** el `budget_message` que devuelve
   `report_expenses_create`:
   > *"Listo, quedó registrado con el número #8813. ATENCION: Excede el presupuesto disponible
   > en $120.000. El gasto quedó registrado pero excede el presupuesto."*
3. Agrega la consecuencia práctica: *"Contabilidad no podrá causarlo mientras siga excedido.
   Habla con el responsable del centro de costo para que amplíe tu partida."*
4. Si `has_budget: false`, el mensaje es distinto y **no alarmista**:
   > *"Quedó registrado. No tienes una partida presupuestal asignada en este centro, así que
   > este gasto no queda bajo control presupuestal."*

### 7.5 El comprobante no se pudo adjuntar

El gasto ya existe. El agente informa el número del gasto, dice que faltó el comprobante y
ofrece reintentar **solo el adjunto**. **Nunca** recrea el gasto.

Causas típicas y qué decir:
- `"upload_key inválida"` → el agente pidió mal la URL: vuelve a llamar a
  `report_expenses_receipt_url_get`.
- `"Vuelve a pedir la URL"` → el PUT a S3 no llegó o la URL expiró (dura 15 minutos): se repite
  desde el paso (7).
- Error de extensión o de tamaño → se le pide a la persona otra foto (jpg, png, webp, heic o
  pdf; máximo 10 MB).

### 7.6 La URL del comprobante expiró

`receipt_file_url` es una URL firmada de corta duración. El agente **no la guarda ni la reenvía
de conversaciones anteriores**: cuando la persona pida "mándame la factura del gasto 8813", el
agente llama a `report_expenses_get` **en ese momento** y usa la URL fresca.

---

## 8. Lo que el agente NO debe hacer nunca

1. Guardar un gasto sin confirmación explícita.
2. Inventar un dato que no leyó (proveedor, NIT, número de factura, tasa de cambio).
3. Atribuir un gasto a alguien distinto de quien escribe.
4. Reintentar `report_expenses_create` tras un fallo de adjunto o de red sin verificar antes con
   `report_expenses_list` si el gasto ya quedó creado.
5. Formatear cifras en COP por su cuenta cuando el servidor ya devolvió un `message` formateado.
6. Relajar una regla de negocio, ni proponerle a la persona cómo saltársela.
7. Exponer ids internos como si fueran información útil ("el gasto 8813" sí, "user_invoice_id 7"
   no).
8. Llamar a `records_search` con `fields` sobre `users`: hay columnas sensibles. Para identificar
   a alguien está `users_find_by_phone`.

---

## 9. Verificación manual antes de conectar el canal

Se ejecuta contra staging, con `users.phone` ya poblado, y se firma:

1. `tools/list` → aparecen los 8 nombres nuevos:
   `expense_budgets_list`, `expense_budgets_available`, `exchange_rates_get`,
   `expense_rules_validate`, `expense_rules_list`, `report_expenses_receipt_url_get`,
   `report_expenses_attach_receipt`, `users_find_by_phone`.
2. `report_expenses_create` **sin** `X-Actor-Phone` ni `X-Actor-Email` → responde *"no se pudo
   identificar"* y **no** crea ninguna fila.
3. `report_expenses_create` **con** `X-Actor-Phone` de una persona real → el gasto queda a su
   nombre, con `budget_status` correcto y `budget_message` legible.
4. `report_expenses_receipt_url_get` → `curl --upload-file` a la `upload_url` → **HTTP 200** de
   S3.
5. `report_expenses_attach_receipt` con esa `upload_key` → `report_expenses_get` devuelve
   `receipt_file_url` no nulo, y ese enlace **descarga el archivo** en un navegador limpio.
6. `heroku restart` y volver a descargar: el archivo sigue ahí (prueba de que no quedó en el
   filesystem efímero del dyno).
7. Tres notas de voz reales transcritas y convertidas en gasto, de punta a punta.
