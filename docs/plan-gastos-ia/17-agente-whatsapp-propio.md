# 17 — Agente de WhatsApp propio: Controlmatica deja de depender de Taimes (octubre 2026)

Pedido del usuario del 2026-10-19: *"la IA que tenemos la vamos a hacer propia, ya no vamos a
consumir Taimes; vamos a construir nuestra propia IA que haga lo mismo que hace Taimes"*.

**Esto revierte la decisión escrita en `ESTADO.md` §1** ("todo lo que le habla a un modelo de IA
queda fuera por decisión del cliente, y lo completa Taimes"). Desde este paquete, la IA vive dentro
de este repositorio: el canal de WhatsApp, el agente que conversa y la lectura de comprobantes.

Rama: `feature/agente-whatsapp-propio`, sacada de `feature/gastos-presupuesto-ia` (858d25a). **No
incluye** la doble aprobación (`feature/doble-aprobacion-zip-propietario`): al fusionar las dos hay
que reconciliar `report_expense.rb` y `db/schema.rb`.

---

## 1. Qué hacía Taimes por Controlmatica (inventario verificado en su código)

Revisado en `~/Documents/kmizen-sgi/kmizen-ai-service` y `~/Documents/kmizen-sgi/ops` el
2026-10-19. Taimes es Python/FastAPI con Pydantic AI y Gemini (`gemini-3.1-flash-lite`).

| Pieza de Taimes | Qué hacía | Cómo quedó aquí |
|---|---|---|
| **Asistente de Gastos** | Gastos por WhatsApp (foto, PDF, voz, texto), 15 tools del MCP | `Agente::Turno` + las mismas tools, en proceso |
| **Reportes de Servicio** | Horas, desplazamiento y viáticos sobre un centro, 9 tools | El mismo agente, segundo flujo del prompt |
| **Extractor de Comprobantes** | El botón "Extraer" del formulario web (`invoke` + `read_url`) | `ReceiptExtractionService.call_vision_model` le habla a Claude |
| Canal WhatsApp (Twilio) | Recibir, responder, botones, menú de agentes | Meta Cloud API directo (`Whatsapp::Client`) |
| Notas de voz | Opus → Vorbis con ffmpeg y el audio a Gemini | Transcripción con OpenAI `gpt-transcribe` + Claude |
| Historial | Tope de 40 mensajes, corte tras cada registro, `@limpiar` | Corte tras cada registro, `@limpiar`, 2 h de inactividad (§4.4) |
| Prompts | `ops/body_*_controlmatica.md`, `body_extractor_comprobantes.md` | `app/prompts/agente/sistema.markdown` |

Lo que **no** se copió porque es de Taimes como plataforma: su tabla de usuarios con contraseñas y
verificación por código (aquí manda `users.phone`, y Meta garantiza el remitente), multi-empresa,
medición de cobro, BigQuery, gráficos y la bandeja para que una persona tome la conversación.

## 2. Decisiones

| Decisión | Valor | Por qué |
|---|---|---|
| Número | **+57 318 926 2630** ("Controlmatica HK"), cuenta de WhatsApp Business `2318917928941844`, phone number ID `1282550828280577` | Confirmado por el usuario. Estaba "Pendiente": se iba a conectar con Twilio y nunca se hizo |
| Canal | **Meta Cloud API directo**, sin intermediario | Menos de USD 2/mes; Twilio cobra por mensaje y amarra al formato de su API |
| Graph API | `v25.0` por ENV (`WHATSAPP_GRAPH_VERSION`) | Disponible hasta jul-2028 |
| Modelo | Agente: `claude-sonnet-5-5` (`AGENTE_MODELO`). Formulario: `claude-opus-5-5` (`RECEIPT_EXTRACTION_MODEL`) | Opus tardaba 13,8 s por respuesta del agente; Sonnet 6,1 s y Haiku 6,9 s con el mismo resultado (prueba del 2026-10-20). Se cambia sin desplegar |
| Cliente de Claude | **HTTP directo con Faraday** | La gema oficial `anthropic` exige Ruby ≥ 3.2; el proyecto está en 3.1.2 |
| Voz | OpenAI `gpt-transcribe` por HTTP (HTTParty) | Recibe el OGG de WhatsApp sin convertir; acepta términos literales; no entrena con los datos |
| Cola | **GoodJob** (Postgres) | Funciona con Rails 6.1 + Ruby 3.1; Sidekiq 8 exige rack ≥ 3.1 |
| Chat web | Fuera de esta versión | Se agrega después si hace falta |

**Pendiente aparte (no bloquea):** subir Ruby a 3.3/3.4 y Puma antes del 1-may-2027, cuando Heroku
deja de permitir builds en heroku-22 (la app está ahí). Entonces `Claude::Client` y
`Voz::Transcriptor` se cambian por las gemas oficiales.

## 3. Arquitectura

```
Empleado (WhatsApp)
   │
Meta ──POST──> /webhooks/whatsapp      Webhooks::WhatsappController
                   │  firma X-Hub-Signature-256, guarda en whatsapp_messages
                   │  (wamid único), encola y responde 200 al instante
                   ▼
            Whatsapp::InboundJob        GoodJob, un mensaje a la vez por persona
            Whatsapp::Atencion
                   ├─ "vincular <token>" → Whatsapp::Vinculo
                   ├─ Whatsapp::Identidad  → User (BSUID o teléfono; dos usuarios = nadie)
                   ├─ baja el archivo (la URL de Meta vence a los 5 min) → S3
                   └─ Agente::Turno
                        ├─ sin el modelo: @limpiar, botones del borrador, "sí" escrito
                        ├─ nota de voz → Voz::Transcriptor
                        └─ ciclo con Claude ↔ Agente::Herramientas
                              ├─ 15 tools del MCP en proceso (Agente::McpEnProceso)
                              └─ ofrecer_opciones, proponer_gasto, proponer_reporte,
                                 adjuntar_comprobante
ReportExpense (aprobado / rechazado / pendiente) → Whatsapp::Avisos → AvisoJob
```

Las tools del MCP se llaman **en proceso** con `MCP::Server#handle`, no por HTTP: así se conservan
la validación de argumentos, el actor estricto (correo y teléfono del usuario ya identificado),
`User.current`, las reglas y el presupuesto. Por eso el agente necesita `MCP_API_KEY`.

## 4. Diseño del agente

### 4.1 La confirmación la controla el código, no el modelo

El modelo **no tiene** la tool de crear. Llama `proponer_gasto` / `proponer_reporte`: el código
valida, guarda un borrador en `whatsapp_conversations.estado["borrador"]` y manda el resumen con
**Confirmar / Corregir / Cancelar**. Solo Confirmar (o un "sí" escrito con un borrador pendiente)
crea el registro, desde código. El borrador vence a los 15 minutos y su id evita duplicar si el
worker se reinicia a mitad.

### 4.2 Dos huecos que se cerraron por tener los dos lados

1. **Comprobante:** se adjunta en el mismo paso de la creación. Ya no queda un gasto creado al que
   le falló el adjunto aparte. (Sigue sin exigirse comprobante por WhatsApp: un gasto contado por
   texto se puede registrar sin foto, como antes.)
2. **Reglas en texto libre obligatorias:** `report_expenses_create` acepta `policy_compliant` y
   `policy_findings`; el agente juzga las `agent_instructions` contra la foto y el veredicto frena
   igual que en la web. Cierra la puerta 3 de la adenda D de `ESTADO.md`.

### 4.3 Reportes de servicio: el servidor ya valida

El prompt de Taimes exigía cosas que el servidor dejaba pasar (horas negativas, un cliente o un
contacto de otro cliente, fechas en texto libre). Al revisar `reports_create` el 2026-10-19 ya las
rechaza todas; no hubo que agregar nada.

### 4.4 Historial: solo se agrega, nunca se edita

Claude liga su razonamiento a la conversación exacta que lo produjo; editar o recortar turnos
invalida la conversación (400 en las cuentas nuevas). Por eso:

- `system` y `tools` quedan fijos por conversación (`prompt_version`). Si un despliegue los cambia,
  la conversación se cierra y la siguiente arranca con la versión nueva.
- **Se cierra la conversación** tras cada registro guardado, con `@limpiar`, tras 2 horas sin
  escribir, tras un rechazo del modelo o al pasarse del tope. La siguiente arranca con el último
  registro como contexto.
- Las fotos se guardan como referencia al archivo en S3 y se reenvían con los mismos bytes.
- Red de seguridad: `prefix_mismatch_behavior: "drop_block"`.

### 4.5 Topes y costo

12 llamadas al modelo y 15 llamadas a tools por turno (los de Taimes). El cache cubre el prompt, las
herramientas y el historial. Cada conversación guarda sus tokens; `bin/rails whatsapp:costos`
estima el costo de los últimos días.

## 5. Fases

| Fase | Qué incluye | Commit | Estado |
|---|---|---|---|
| 0. Meta | App "Controlmatica IA" (`1642751460907407`), número, token, verificación, publicar | — | **En curso (§6)** |
| 1. Canal | GoodJob + Procfile, tablas, webhook, `Whatsapp::Client`, identidad, archivo a S3, `/privacidad` | 5ae942f, 11f71c0 | Hecha |
| 2. Agente | Extractor con Claude, `Agente::*`, prompt portado, borrador + botones, veredicto al crear | 988e621, 43df7fa | Hecha |
| 3. Avisos | WhatsApp junto a los correos de aprobación; plantillas fuera de la ventana de 24 h | 1e783b4 | Hecha (falta crear las plantillas en Meta, §7) |
| 4. Voz y casos especiales | Transcripción, vinculación por enlace, contacto humano, tareas de registro y costos | ed4fb47 | Hecha |
| 5. Corte | Instructivo de campo, comentarios, docs; apagar Taimes y rotar `MCP_API_KEY` | este commit | Código hecho; lo operativo en §9 |

Suite al cerrar: 1646 corridas, 0 fallos (`NODE_OPTIONS=--openssl-legacy-provider TZ=UTC bin/rails test`).
**Nada probado contra Meta ni contra Claude de verdad todavía**: todo con dobles.

## 6. Estado en Meta al 2026-10-19

- Portafolio Controlmatica **sin verificar** → tope de 2 números (por eso no se pudo pedir número
  de prueba). Verificar el negocio sube el tope a 20.
- El 318 está **"No registrado"**. El botón Registrar devolvió un error genérico y el cambio de PIN
  también (Meta no deja poner PIN a un número sin registrar). Siguiente paso: las tareas
  `whatsapp:*` de §9, que muestran el error exacto.
- El token permanente del usuario de sistema exige que **otro administrador lo apruebe** (David
  Londoño, gerencia@controlmatica.com.co). La primera solicitud tenía permisos equivocados; los
  correctos son `whatsapp_business_messaging` y `whatsapp_business_management`.
- El medio de pago ya existe en la cuenta.
- La app está **sin publicar**: Meta solo entrega webhooks de prueba hasta publicarla. La URL de
  privacidad que pide es `https://controlmatica.herokuapp.com/privacidad` (revisar el texto con
  quien responda por datos personales en Controlmatica).
- No tocar el **+57 316 505 7782**: está conectado y no es de este proyecto. El webhook ignora sus
  mensajes aunque lleguen, y el cuerpo del webhook no queda en el log (`filter_parameter_logging`).

**Al 2026-10-20**, con `bin/rails whatsapp:estado`: el 318 ya está **verificado**
(`code_verification_status: VERIFIED`) con el nombre **"Controlmatica HK"** aprobado
(`AVAILABLE_WITHOUT_REVIEW`); falta solo registrarlo (`status: PENDING`). David aprobó el token del
usuario de sistema `controlmatica-bot` (no vence), pero es el de la solicitud equivocada: trae
`whatsapp_business_management` y `whatsapp_business_manage_events`, sin
`whatsapp_business_messaging`, y `whatsapp:registrar` responde `(#200) You do not have permission
to access this field`. Hay que generar otro token con los dos permisos correctos y revocar este. La
cuenta no tenía plantillas ni apps suscritas; la app Controlmatica IA ya quedó suscrita
(`whatsapp:suscribir`). El mismo día David aprobó un segundo token con
`whatsapp_business_messaging` y **el 318 quedó registrado**: `status: CONNECTED`,
`platform_type: CLOUD_API`. El PIN de verificación en dos pasos quedó en `WHATSAPP_PIN`; sin él
no se puede volver a registrar el número. El primer token se revoca.

**La trampa de las cuentas (2026-10-20, noche).** Con la app publicada, enviar daba `code 10,
subcode 2593181: You do not have the necessary permissions to send messages on behalf of this
WhatsApp Business Account` y los mensajes al 318 llegaban a Meta (doble chulito) pero nunca al
webhook. Causa: hay dos cuentas llamadas "Controlmatica". El 318 estaba **vinculado** a la ficha
del 316 dentro de la cuenta de mensajes `1019106677520170`, que tiene a **Zoho Corporation como
socio con control total** (la "otra aplicación" del 316); Meta solo deja enviar "en nombre de"
esa cuenta a la app del socio. El `2318917928941844` que se usó al principio es la ficha del 316,
no la cuenta del 318 (`GET /{phone_number_id}?fields=health_status` dice la cuenta real).
Arreglo: en Configuración del negocio → Cuentas de WhatsApp → ficha del 316 → Linked WhatsApp
accounts → ⋯ del 318 → **Unlink number → Move this number to its own WhatsApp account** (no lo
desconecta ni cambia su phone number ID). El 318 quedó en su propia cuenta **`1446442884115097`**,
sin socios: `WHATSAPP_WABA_ID` apunta ahí, la app está suscrita solo ahí y los webhooks empezaron a
llegar. Se quitó la suscripción de la app de `1019106677520170` y `2318917928941844`. Después se le
creó la cuenta de mensajes propia **"Controlmatica IA" (`1658749665964154`)** con la Mastercard del
portafolio (sin ella Meta bloquea los envíos, error 141006); esa es la cuenta que reporta
`health_status` y la que va en `WHATSAPP_WABA_ID`, con la app suscrita. Ojo: la moneda quedó en
**AED** y no se puede cambiar. La otra "Controlmatica" (`1622289719622646`) tiene a **Twilio** de
socio: no usarla. Prueba del 2026-10-20 22:15: envío `200` y los tres avisos (enviado, entregado,
leído) llegaron al webhook.

## 6.1 Permisos por rol: el agente solo registra (2026-10-20)

Decisión del usuario: **el agente no consulta nada, solo hace el proceso de creación**, y lo que
cada persona puede registrar lo decide su rol en una sección propia de la pantalla de Roles,
**"Agente de WhatsApp"** (de última, no en su lugar alfabético), con dos acciones: **Registrar
gasto** y **Registrar reporte de servicios**. Se crea con `rake permissions_agente_whatsapp:install`
(idempotente; la primera vez se la asigna solo a Administrador). Aquí Administrador **no** es un
bypass: sin la casilla no usa el agente.

- Sin ninguna de las dos: `Whatsapp::Atencion` contesta `SIN_PERMISO` y no llama al modelo.
- Con una: el modelo solo ve las herramientas de eso (`Agente::Herramientas.definiciones(permisos)`)
  y el `[Contexto]` le dice qué no puede. Se vuelve a revisar al ejecutar cada herramienta y al
  tocar Confirmar (le pueden quitar el permiso con el resumen pendiente).
- Las herramientas de consulta salieron (`report_expenses_*`, `reports_*`, `records_aggregate`,
  `expense_budgets_*`); `records_search` solo acepta `cost_centers` y `customers` (para encontrar
  el centro), y de cada respuesta el modelo recibe solo los campos que la creación usa
  (`Herramientas::CAMPOS`): nada de valor cotizado, estados de facturación, gastos del centro, NIT ni
  teléfonos.
- Viáticos de un reporte: la misma regla de la web (`ReportsController`): Administrador o
  "Reportes de servicios → Ingresar viaticos". Sin eso, un reporte con viáticos se rechaza.

## 6.2 Quien oculta su número: campo "Usuario de WhatsApp" (2026-10-22)

Con nombre de usuario en WhatsApp, Meta deja de mandar el teléfono: solo llega el BSUID
(`from_user_id`) y el usuario (`contacts[].profile.username`). Visto el 22-oct con el primer número
distinto al del administrador. En el formulario de usuarios hay un campo **Usuario de WhatsApp** al
lado del teléfono (columna `users.whatsapp_username`, normalizada sin "@" y en minúsculas, única);
con uno de los dos basta. `Whatsapp::Identidad` busca en este orden: BSUID ya ligado, teléfono,
usuario de WhatsApp, y al identificar guarda el BSUID. Dos protecciones: si ese usuario de
Controlmatica ya estaba ligado a **otro** BSUID, el nombre de usuario no basta (alguien pudo tomar
un usuario que soltó otra persona); y si el administrador cambia el teléfono o el usuario de
WhatsApp, el BSUID ligado se borra y se vuelve a ligar con el dato nuevo. Si no lo encuentra, el
aviso le dice a la persona cuál es su @usuario para que se lo pase al administrador. El enlace de
vinculación sigue funcionando como alternativa.

## 7. Plantillas para los avisos (crear en WhatsApp Manager)

Fuera de la ventana de 24 h desde el último mensaje de la persona, Meta solo deja mandar plantillas
aprobadas. Categoría **Utilidad**, idioma **Español (es)**. El texto puede cambiar; lo que no puede
cambiar es la cantidad y el orden de las variables, que salen de
`Whatsapp::Avisos.parametros_de_plantilla`.

| ENV | Nombre sugerido | Cuerpo |
|---|---|---|
| `WHATSAPP_PLANTILLA_DECISION` | `aviso_decision_gasto` | Hola {{1}}, tu gasto #{{2}} ({{3}}) fue {{4}} por {{5}}. Puedes ver el detalle en Controlmatica. |
| `WHATSAPP_PLANTILLA_PENDIENTE` | `aviso_gasto_pendiente` | Hola {{1}}, tienes un gasto por aprobar: #{{2}} de {{3}} ({{4}}) en el centro {{5}}. Revísalo en Controlmatica. |

Sin la plantilla, fuera de la ventana no se manda nada: el correo ya salió.

## 8. Variables de entorno

| Variable | Para qué | Obligatoria |
|---|---|---|
| `ANTHROPIC_API_KEY` | Agente y lectura del formulario | Sí, para la IA |
| `MCP_API_KEY` | El agente llama las tools en proceso y autorizan contra ella | Sí (ya existe) |
| `WHATSAPP_TOKEN` | Token del usuario de sistema | Sí |
| `WHATSAPP_PHONE_NUMBER_ID` | `1282550828280577` | Sí |
| `WHATSAPP_WABA_ID` | `1658749665964154`, la cuenta de mensajes del 318 (solo para `whatsapp:suscribir`) | Para activar |
| `META_APP_SECRET` | Firma de cada POST del webhook | Sí |
| `WHATSAPP_VERIFY_TOKEN` | Clave larga al azar; se repite en el panel de Meta | Sí |
| `WHATSAPP_ENABLED` | Kill switch del canal (arranca en `false`) | — |
| `WHATSAPP_NUMERO_PUBLICO` | `573189262630`, para el enlace de vinculación | Recomendada |
| `WHATSAPP_CONTACTO_HUMANO` | A quién deriva el agente ("contabilidad@… o +57 …") | Recomendada |
| `OPENAI_API_KEY` | Notas de voz; sin ella se pide escribir | Para voz |
| `WHATSAPP_AVISOS` | Avisos por WhatsApp (además de `EXPENSE_APPROVAL_EMAIL`) | — |
| `WHATSAPP_PLANTILLA_DECISION` / `_PENDIENTE` / `_IDIOMA` | §7 | — |
| `RECEIPT_EXTRACTION_ENABLED` | Botón "Extraer" del formulario web | — |
| `AGENTE_MODELO`, `AGENTE_EFFORT`, `RECEIPT_EXTRACTION_MODEL`, `TRANSCRIPCION_MODELO` | Cambiar modelos sin desplegar | — |
| `GOOD_JOB_EXECUTION_MODE`, `GOOD_JOB_MAX_THREADS` | `external` en el web cuando haya worker | — |
| `WHATSAPP_GRAPH_VERSION` | Por defecto `v25.0` | — |

`WHATSAPP_PIN` solo se usa para registrar el número (`heroku run`), no se deja en Heroku.

## 9. Puesta en marcha, en orden

1. **Heroku al día.** El aviso de suspensión del 20-oct tumba el webhook y el resto de la app.
2. **Desplegar la rama.** El Procfile nuevo corre `db:migrate` en la fase release: las migraciones
   de este paquete (GoodJob y tablas de WhatsApp) entran solas.
3. **Worker:** `heroku ps:scale worker=1` (web + worker en Basic: unos USD 14/mes) y
   `GOOD_JOB_EXECUTION_MODE=external` en el web. Sin worker, los trabajos corren dentro del web.
4. **Variables** de §8 (con `WHATSAPP_ENABLED=false` todavía).
5. **Registrar el 318**, leyendo cada respuesta antes de seguir (máximo 10 intentos en 72 h):
   ```
   heroku run bin/rails whatsapp:estado
   heroku run bin/rails "whatsapp:solicitar_codigo[SMS]"
   heroku run bin/rails "whatsapp:verificar_codigo[123456]"
   heroku run "WHATSAPP_PIN=###### bin/rails whatsapp:registrar"
   ```
6. **Webhook en la app de Meta:** URL `https://controlmatica.herokuapp.com/webhooks/whatsapp`,
   el token de `WHATSAPP_VERIFY_TOKEN`, suscribir el campo `messages`, y
   `heroku run bin/rails whatsapp:suscribir`.
7. **Publicar la app** con la URL de privacidad.
8. `heroku run rake permissions_agente_whatsapp:install` y marcar en Roles quién usa el agente (§6.1).
   Luego `WHATSAPP_ENABLED=true` y probar con un usuario real: texto, foto de un comprobante, Confirmar.
9. **Avisos:** crear las plantillas de §7, y cuando estén aprobadas, `WHATSAPP_AVISOS=true`.
10. **Corte con Taimes:** repartir el instructivo de campo con el número nuevo, apagar los agentes
    de Controlmatica en Taimes, **rotar `MCP_API_KEY`** (Taimes la tiene) y borrar las tres
    `TAIMES_*` de Heroku. Pedirle a Taimes el historial de conversaciones si se quiere conservar.

## 10. Riesgos

1. **Nada se probó contra Meta ni Claude reales.** El primer mensaje de verdad puede destapar
   diferencias de forma (un campo del webhook, un parámetro de la API). Probar con una persona
   antes de repartir el número.
2. **Usernames de WhatsApp**: un mensaje puede llegar sin teléfono. La identidad busca primero por
   BSUID; quien no se reconoce recibe el enlace de `/whatsapp/vincular` si
   `WHATSAPP_NUMERO_PUBLICO` está cargado.
3. **1 mensaje cada 6 s a la misma persona** y orden no garantizado: el agente manda un solo
   mensaje por paso.
4. **Política de IA de Meta**: un asistente de la empresa para sus empleados está permitido; el
   prompt lo limita a gastos y reportes, y `WHATSAPP_CONTACTO_HUMANO` da la salida a una persona.
5. **Costo y tiempo del modelo**: la misma conversación de prueba (ticket en MXN hasta el bloqueo
   por tope) costó unos USD 0,20 con Opus 5.5, 0,09 con Sonnet 5.5 y 0,006 con Haiku 5.5, a 13,8,
   6,1 y 6,9 s por respuesta. Los tres acertaron. El agente arranca con Sonnet; con
   `whatsapp:costos` y conversaciones reales se decide si baja a Haiku (`AGENTE_MODELO`).
6. **La política de privacidad** la escribió el desarrollo; conviene que la revise quien responda
   por datos personales en Controlmatica.
