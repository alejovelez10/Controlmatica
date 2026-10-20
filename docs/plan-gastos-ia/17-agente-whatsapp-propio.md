# 17 — Agente de WhatsApp propio: Controlmatica deja de depender de Taimes (octubre 2026)

Pedido del usuario del 2026-10-19: *"la IA que tenemos la vamos a hacer propia, ya no vamos a
consumir Taimes; vamos a construir nuestra propia IA que haga lo mismo que hace Taimes"*.

**Esto revierte la decisión escrita en `ESTADO.md` §1** ("todo lo que le habla a un modelo de IA
queda fuera por decisión del cliente, y lo completa Taimes"). Desde este paquete, la IA vive dentro
de este repositorio: el canal de WhatsApp, el agente que conversa y la lectura de comprobantes.

Rama: `feature/agente-whatsapp-propio`, sacada de `feature/gastos-presupuesto-ia` (858d25a).

---

## 1. Qué hacía Taimes por Controlmatica (inventario verificado en su código)

Revisado en `~/Documents/kmizen-sgi/kmizen-ai-service` y `~/Documents/kmizen-sgi/ops` el
2026-10-19. Taimes es Python/FastAPI con Pydantic AI y Gemini (`gemini-3.1-flash-lite`).

| Pieza de Taimes | Qué hace | Cómo queda aquí |
|---|---|---|
| **Asistente de Gastos** | Registra gastos por WhatsApp (foto, PDF, voz, texto), 15 tools del MCP | `Agente::Runner` + las mismas tools, en proceso |
| **Reportes de Servicio** | Registra horas, desplazamiento y viáticos sobre un centro, 9 tools | Segundo flujo del mismo agente |
| **Extractor de Comprobantes** | El botón "Extraer" del formulario web (`invoke` + `read_url`) | `ReceiptExtractionService.call_vision_model` le habla a Claude directo |
| Canal WhatsApp (Twilio) | Recibir, responder, botones, menú de agentes | Meta Cloud API directo (`Whatsapp::Client`) |
| Notas de voz | Opus → Vorbis con ffmpeg y el audio a Gemini | Fase 4: transcripción + Claude |
| Historial | Tope de 40 mensajes; corte del hilo tras cada registro; `@limpiar` | Igual (§4.4), adaptado a la regla de "solo agregar" de Claude |
| Prompts | `ops/body_gastos_controlmatica.md`, `body_reportes_servicio_controlmatica.md`, `body_extractor_comprobantes.md` | Se portan a `app/prompts/agente/` |

Lo que **no** se copia porque es de Taimes como plataforma: su propia tabla de usuarios con
contraseñas y verificación OTP (aquí manda `users.phone`, y Meta ya garantiza el remitente),
multi-empresa, medición de cobro, BigQuery, gráficos y la bandeja de "tomar la conversación".

## 2. Decisiones

| Decisión | Valor | Por qué |
|---|---|---|
| Número | **+57 318 926 2630** ("Controlmatica HK"), cuenta de WhatsApp Business `2318917928941844`, phone number ID `1282550828280577` | Confirmado por el usuario. Estaba "Pendiente": se iba a conectar con Twilio y nunca se hizo |
| Canal | **Meta Cloud API directo**, sin BSP | Menos de USD 2/mes; Twilio cobra por cada mensaje y amarra al formato de su API |
| Versión de la Graph API | `v25.0` por ENV (`WHATSAPP_GRAPH_VERSION`) | Disponible hasta jul-2028 |
| Modelo | `claude-opus-5-5` por ENV (`AGENTE_MODELO`) | El valor por defecto de la guía de Anthropic. Se mide el costo real y se decide si se baja a Sonnet 5.5 o Haiku 5.5 |
| Cliente de Claude | **HTTP directo con Faraday** | La gema oficial `anthropic` exige Ruby ≥ 3.2 y el proyecto está en 3.1.2 |
| Cola de trabajos | **GoodJob** | Funciona con Rails 6.1 + Ruby 3.1, usa el Postgres que ya existe. Sidekiq 8 exige rack ≥ 3.1 (aquí 2.2) |
| Chat web | Fuera de la primera versión | Lo usaban pocos; se agrega después |

**Pendiente aparte (no bloquea):** subir Ruby a 3.3/3.4 junto con Puma antes del 1-may-2027,
cuando Heroku deja de permitir builds en heroku-22 (la app está ahí). Entonces el cliente HTTP de
Claude se cambia por la gema oficial.

## 3. Arquitectura

```
Empleado (WhatsApp)
   │
Meta ──POST──> /webhooks/whatsapp      Webhooks::WhatsappController
                   │  firma X-Hub-Signature-256, guarda en whatsapp_messages
                   │  (wamid único), encola y responde 200 al instante
                   ▼
            Whatsapp::InboundJob        (GoodJob, un mensaje a la vez por persona)
                   ├─ Whatsapp::Identidad  → User (BSUID o teléfono; dos usuarios = nadie)
                   ├─ descarga el archivo (la URL de Meta vence a los 5 min) → S3
                   ├─ Agente::Runner       → Claude + tools de app/tools en proceso
                   └─ Whatsapp::Client     → responde (texto, botones, lista)
```

**Las tools se llaman dentro del mismo proceso** a través de `MCP::Server#handle`, no por HTTP.
Así se conservan sin cambios la validación de argumentos, la identificación estricta del actor,
`User.current`, las reglas y el presupuesto. El `server_context` lleva `actor_phone` y, si
existe, `actor_email` del usuario ya identificado.

## 4. Diseño del agente

### 4.1 La confirmación la controla el código, no el modelo

En Taimes el modelo llamaba `report_expenses_create` después de un "Sí". Aquí el modelo **no
tiene** la tool de creación. Tiene `proponer_gasto` / `proponer_reporte`: guardan un borrador en
la conversación, corren `expense_rules_validate` y la app envía el resumen con los botones
**Confirmar / Corregir / Cancelar**. Solo el botón Confirmar crea el registro, desde código, con
el borrador. Consecuencias:

- El modelo no puede crear nada sin el toque de la persona.
- El id del borrador es la llave de idempotencia: si Heroku reinicia el worker a mitad de la
  creación, el reintento no duplica.
- El borrador vence a los 15 minutos (igual que el instructivo de campo).

### 4.2 Dos huecos que se cierran por tener los dos lados

1. **Comprobante:** el archivo ya está en S3 antes de crear, así que se adjunta en el mismo paso
   (hoy, con Taimes, se crea primero y se adjunta después, y si el adjunto falla el gasto queda
   sin archivo).
2. **Reglas en texto libre que son obligatorias:** el veredicto de la lectura del comprobante
   (`policy_compliant` / `policy_findings`) viaja al crear y frena igual que en la web (adenda D
   de `ESTADO.md`, puerta 3).

### 4.3 Validaciones de reportes que pasan al servidor

El prompt de Taimes las exigía porque el servidor las dejaba pasar (probado en vivo por Taimes):
horas o valores negativos, un cliente que no es el del centro, un contacto de otro cliente y
fechas en texto libre. Aquí van en el servidor.

### 4.4 Historial: solo se agrega, nunca se edita

Claude liga cada bloque de razonamiento a la conversación exacta que lo produjo; editar o recortar
turnos anteriores invalida la conversación (400 en cuentas creadas desde el 2026-08-31). Reglas:

- `system` y `tools` se congelan al abrir la conversación (`prompt_version`). Si cambian por un
  despliegue, la próxima conversación arranca nueva.
- **Corte tras cada registro guardado** (lección de Taimes: un hilo de 20 días llegó a 125.691
  tokens en un turno): se cierra la conversación y la siguiente arranca con un resumen corto como
  primer mensaje. Es "compactación simple", compatible con la regla.
- `@limpiar`, `@olvidar`, `@borrar` y 2 horas sin escribir también abren una conversación nueva.
- Las imágenes se guardan como referencia al archivo en S3 y se reenvían en base64 con los mismos
  bytes en cada turno.
- Red de seguridad: `prefix_mismatch_behavior: "drop_block"` (beta
  `thinking-binding-controls-2026-08-01`) para degradar en vez de fallar.

### 4.5 Topes por turno (de Taimes)

12 pasos y 15 llamadas a tools por turno en Gastos; 10 y 12 en Reportes. Al pasarse, el turno se
corta con un mensaje honesto ("no pude terminar, intenta de nuevo") y queda en el log.

## 5. Fases

| Fase | Qué incluye | Cómo se prueba | Estado |
|---|---|---|---|
| **0. Meta** | App "Controlmatica IA" (ID `1642751460907407`), número registrado, token permanente, verificación del negocio, publicar la app | Mensaje real al 318 | En curso (§6) |
| **1. Canal** | GoodJob + Procfile, tablas, webhook con firma, `Whatsapp::Client`, identificación, archivo a S3, respuesta "Recibido", página `/privacidad` | Suite; mensaje real cuando el número esté registrado | — |
| **2. Agente** | Cliente de Claude, extractor propio (`call_vision_model`), `Agente::Runner`, prompts portados, borrador + botones, Reportes de Servicio, validaciones al servidor | Suite con Claude falso; gastos reales de prueba | — |
| **3. Avisos** | WhatsApp junto a los correos de aprobado/rechazado/pendiente; plantillas utility fuera de la ventana de 24 h | Aprobar un gasto desde la web | — |
| **4. Voz y casos especiales** | Transcripción de notas de voz, vinculación por BSUID (usernames de WhatsApp), escalamiento a una persona, costo por conversación | Notas de voz reales | — |
| **5. Corte** | Avisar el número nuevo (instructivo de campo), apagar Taimes, rotar `MCP_API_KEY`, borrar `TAIMES_*` | Taimes apagado | — |

## 6. Estado en Meta al 2026-10-19

- Portafolio Controlmatica **sin verificar** → tope de 2 números (por eso no se pudo pedir número
  de prueba). Verificar el negocio sube el tope a 20.
- El 318 está **"No registrado"**. El botón Registrar devolvió un error genérico y el cambio de PIN
  también: Meta no deja poner PIN a un número sin registrar. Siguiente paso: consultar su estado
  por la API y hacer `request_code` → `verify_code` → `register` con el token.
- El token permanente del usuario de sistema exige que **otro administrador lo apruebe** (David
  Londoño, gerencia@controlmatica.com.co). La primera solicitud tenía los permisos equivocados.
- El medio de pago ya existe en la cuenta.
- La app está **sin publicar**: Meta solo entrega webhooks de prueba hasta publicarla, y para
  publicar pide una URL de política de privacidad (la fase 1 agrega `/privacidad`).
- No tocar el **+57 316 505 7782**: está conectado, no es de este proyecto.

## 7. Variables de entorno

| Variable | Para qué |
|---|---|
| `WHATSAPP_TOKEN` | Token del usuario de sistema (`whatsapp_business_messaging` + `whatsapp_business_management`) |
| `WHATSAPP_PHONE_NUMBER_ID` | `1282550828280577` |
| `WHATSAPP_WABA_ID` | `2318917928941844` |
| `WHATSAPP_VERIFY_TOKEN` | Lo inventamos nosotros; Meta lo repite en el GET de alta del webhook |
| `META_APP_SECRET` | Firma de cada POST del webhook |
| `WHATSAPP_GRAPH_VERSION` | `v25.0` |
| `WHATSAPP_ENABLED` | Kill switch del canal (arranca en `false`) |
| `ANTHROPIC_API_KEY` | Fase 2 |
| `AGENTE_MODELO` | Fase 2, por defecto `claude-opus-5-5` |

`WHATSAPP_PIN` solo se usa para registrar el número; no hace falta en Heroku.

## 8. Riesgos

1. **El webhook vive en Heroku**: si la cuenta se suspende (aviso del 20-oct), el canal se cae.
2. **Usernames de WhatsApp**: desde abril de 2026 un mensaje puede llegar sin teléfono, solo con
   el BSUID. La identidad busca primero por BSUID y lo guarda en `users.whatsapp_user_id` la
   primera vez que la persona escribe con teléfono. La vinculación sin teléfono es fase 4.
3. **Límite de 1 mensaje cada 6 s a la misma persona** y orden de entrega no garantizado: un solo
   mensaje rico por paso.
4. **Política de IA de Meta**: un asistente de la empresa para sus empleados está permitido (la IA
   es auxiliar). El bot no debe funcionar como chat de propósito general y debe ofrecer hablar con
   una persona.
5. **Costo del modelo**: con Opus 5.5 (USD 4/20 por millón) un gasto puede costar varias veces lo
   que costaba con Gemini flash-lite. Se registra el uso de cada turno desde el primer día.
