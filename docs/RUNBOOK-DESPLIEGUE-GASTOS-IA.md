# Runbook de puesta en marcha — Gastos, presupuesto y multimoneda

**Qué es**: el orden exacto de pasos para llevar esta entrega a producción, con los valores
reales del entorno y la forma de verificar cada paso.

**Estado**: 🔴 **NO EJECUTADO.** Nada de este documento se ha corrido, ni en staging ni en
producción. Toda la entrega vive en la rama local `feature/gastos-presupuesto-ia`, sin empujar
al remoto y sin tocar ningún entorno.

---

## Convenciones de este documento

| Marca | Significado |
|---|---|
| 🟢 | Se puede ejecutar tal cual. Es idempotente o de solo lectura |
| 🟡 | Se ejecuta, pero **hay que leer la salida antes de seguir** |
| 🔴 | **REQUIERE UNA DECISIÓN HUMANA.** No lo automatice, no lo corra "a ver qué pasa" |
| ⛔ | **PUNTO DE NO RETORNO.** A partir de aquí no hay vuelta atrás por migración |

**Los entornos reales de este proyecto**, tomados de los remotos de git:

| Entorno | App de Heroku | Comando |
|---|---|---|
| Staging | `controlmatica-staging` | `heroku <cmd> -a controlmatica-staging` |
| Producción | `controlmatica` | `heroku <cmd> -a controlmatica` |

> **La regla que gobierna todo el runbook: cada paso se hace primero en `controlmatica-staging`,
> se verifica, y solo entonces se repite en `controlmatica`.** No hay ningún paso que se haga
> directo en producción.

---

## FASE 0 — Antes de tocar nada 🔴

Los cinco puntos de esta fase **los resuelve una persona**. Ninguno lo puede hacer un script y
ninguno es opcional.

### 0.1 🔴 Rotar la llave de AWS — **primero que todo**

La llave que hoy está en uso quedó expuesta en un chat y tiene **alcance de cuenta completa**:
ve 19 buckets de clientes distintos, no solo el de Controlmatica.

**Qué hay que hacer**: crear un usuario IAM nuevo, con permisos **únicamente** sobre el bucket
`controlmatica`, y reemplazar la llave en los dos entornos. La llave vieja se revoca **después**
de confirmar que la nueva funciona (paso 3.4).

**Por qué va primero**: si se despliega con la llave vieja, se agrega una superficie de riesgo
nueva (comprobantes con NIT y valores) sobre una credencial que ya está comprometida.

**Si se decide aplazarlo**, escríbase la decisión y la fecha. No se aplaza en silencio.

### 0.2 🔴 Confirmar las cinco decisiones de producto

Están implementadas con estos valores por defecto. **El cliente no las ha firmado.**

| # | Decisión | Valor aplicado | Dónde se nota |
|---|---|---|---|
| 0.1 | ¿Los gastos históricos consumen presupuesto? | **Sí** | El disponible nace reducido. Es la duda #1 de los usuarios |
| 0.2 | ¿Presupuesto con IVA o sin IVA? | **Sin IVA** | Un gasto de $119.000 consume $100.000 |
| 0.3 | Matriz de estados de aprobación | La de la arquitectura §2.4 | Los tres estados independientes |
| 0.4 | Monedas del catálogo | **COP, USD, EUR** | El selector de moneda |
| 0.5 | Reglas de negocio | **Las 5 de la propuesta**, configurables | La pantalla de Reglas de gastos |

Cambiar la 0.1 o la 0.2 **después** de que haya presupuesto en producción implica recalcular
todo. Confírmense **antes**.

### 0.3 🔴 Decidir la versión de Node

`package.json` declara `engines: node 16.x` y la máquina de desarrollo corre 22.22.0, donde
`bin/webpack` falla con `ERR_OSSL_EVP_UNSUPPORTED` salvo con
`NODE_OPTIONS=--openssl-legacy-provider`.

**No se tocó por cuenta propia porque `engines.node` es el contrato de build con Heroku**, y
cambiarlo cambia cómo compila producción. Las tres salidas son: fijar Node 16 con `.nvmrc`,
ampliar `engines`, o exportar la variable en los binstubs.

**Heroku hoy compila bien** con lo que hay. Esto bloquea al desarrollador local, no al deploy.

### 0.4 🔴 Recolectar los teléfonos

**Hoy hay 0 de 29 usuarios con teléfono.** Es la ruta crítica del canal de WhatsApp y no
depende del código.

Procedimiento en la FASE 6. **Sáquese el inventario ya** (`rake users:phones_report`), porque
recolectar 29 números por WhatsApp toma días, no minutos.

### 0.5 🔴 Conseguir el token de datos.gov.co

`DATOS_GOV_APP_TOKEN` es **gratis** y se saca en datos.gov.co en cinco minutos.

**Sin él las peticiones de TRM son anónimas** y Socrata estrangula por IP con HTTP 429.
Consecuencia concreta: **todo gasto en dólares terminaría pidiendo captura manual de la tasa**.
No rompe nada, pero degrada la funcionalidad justo el día del lanzamiento, que es cuando más
gente entra a la vez.

---

## FASE 1 — Preparar la rama 🟡

Nada de esto toca ningún entorno.

```bash
# 1.1  La rama tiene 155+ commits locales por delante de origin/master y NO tiene upstream.
git -C . log --oneline origin/master..HEAD | wc -l
git -C . status --porcelain          # debe salir vacio

# 1.2  Suite completa en verde, en la maquina, ANTES de subir nada.
bin/rails test

# 1.3  Suite E2E en un navegador de verdad.
cd test/e2e && npm test && cd ../..

# 1.4  El bundle de frontend compila.
NODE_OPTIONS=--openssl-legacy-provider ./bin/webpack
```

**Criterio para seguir**: 1.2 y 1.3 en verde y `git status` limpio. Las cifras de referencia
están al final de este documento.

### 1.5 🔴 Decidir cómo llega el código al remoto

Este proyecto se entregó **sin empujar nada**. Hay que decidir:

- **PR contra `master` en GitHub** (recomendado: deja el código revisado antes de producción), o
- push directo de la rama a los remotos de Heroku.

Las dos son válidas. La que **no** es válida es empujar a `heroku master` sin que nadie haya
leído el diff: son 155 commits.

---

## FASE 2 — Variables de entorno 🟡

`config/application.yml` **está en `.gitignore` y no viaja al servidor**. Todo lo que la
aplicación necesita se siembra con `heroku config:set`.

### 2.1 La tabla completa: 15 variables

| # | Variable | Valor | Obligatoria | Si falta |
|---|---|---|---|---|
| 1 | `AWS_ACCESS_KEY` | (de la llave IAM nueva, paso 0.1) | ✅ | No hay almacenamiento de archivos |
| 2 | `AWS_SECRET_KEY` | ídem | ✅ | ídem |
| 3 | `AWS_BUCKET` | `controlmatica` | ✅ | ídem |
| 4 | **`AWS_REGION`** | **`us-east-2`** | ✅ | 🔴 **Ver 2.2. Es el fallo más traicionero de todo el despliegue** |
| 5 | `TRM_API_URL` | `https://www.datos.gov.co/resource/32sa-8pi3.json` | — | Hay default en código |
| 6 | `DATOS_GOV_APP_TOKEN` | (el del paso 0.5) | Recomendada | HTTP 429: todo gasto en USD pide tasa a mano |
| 7 | `ECB_API_URL` | `https://data-api.ecb.europa.eu/service/data/EXR` | — | Hay default en código |
| 8 | `EXCHANGE_RATE_HTTP_TIMEOUT` | `5` | — | Default 5 s |
| 9 | `EXCHANGE_RATE_OPEN_TIMEOUT` | `3` | — | Default 3 s |
| 10 | `RECEIPT_EXTRACTION_MODEL` | `claude-opus-5` | — | Default en código |
| 11 | **`RECEIPT_EXTRACTION_ENABLED`** | **`false`** | ✅ | 🔴 Ver 2.3. **Debe quedar en `false`** |
| 12 | `ANTHROPIC_API_KEY` | — | ❌ **NO se setea todavía** | Ver 2.3 |
| 13 | `MCP_API_KEY` | (ya existe en los dos entornos) | ✅ | El servidor MCP responde `unauthorized` |
| 14 | `MCP_STRICT_EXPENSE_ACTOR` | `true` | ✅ | Válvula de reversión, ver 5.4 |
| 15 | `E2E_UPLOAD_ROOT` | — | ❌ **NUNCA en producción** | Es solo para la suite de pruebas |

### 2.2 🔴 `AWS_REGION=us-east-2` — léase esto entero

El bucket `controlmatica` está en **`us-east-2`**. Si la variable falta, el cliente de S3 asume
`us-east-1`.

**Por qué es el fallo más difícil de diagnosticar de todo el despliegue**: no falla siempre.
S3 responde con un redirect de región que a veces el cliente sigue y a veces no, dependiendo de
la operación y del momento. El síntoma es **"a veces se sube el comprobante y a veces no"**, sin
error claro en los logs, y como el gasto sí se guarda (el comprobante es opcional), nadie lo
reporta como una falla del sistema: lo reportan como *"a mí no me deja adjuntar"*.

**Se setea aunque parezca redundante y aunque hoy "funcione".**

### 2.3 🔴 `RECEIPT_EXTRACTION_ENABLED` se queda en `false`

La lectura automática del comprobante **no está implementada de este lado**: la completa el
proveedor del asistente. El interruptor está cableado de punta a punta y probado, así que
**ponerlo en `true` hoy PINTA EL BOTÓN en el formulario y el botón no lleva a ningún lado**: la
dirección que consumiría todavía no existe.

`ANTHROPIC_API_KEY` **no se setea** mientras el interruptor esté apagado. Setearla no enciende
nada y agrega un secreto de más en el entorno.

### 2.4 Comandos

```bash
# STAGING
heroku config:set -a controlmatica-staging \
  AWS_REGION=us-east-2 \
  TRM_API_URL="https://www.datos.gov.co/resource/32sa-8pi3.json" \
  ECB_API_URL="https://data-api.ecb.europa.eu/service/data/EXR" \
  EXCHANGE_RATE_HTTP_TIMEOUT=5 \
  EXCHANGE_RATE_OPEN_TIMEOUT=3 \
  RECEIPT_EXTRACTION_MODEL=claude-opus-5 \
  RECEIPT_EXTRACTION_ENABLED=false \
  MCP_STRICT_EXPENSE_ACTOR=true

heroku config:set -a controlmatica-staging DATOS_GOV_APP_TOKEN='<el del paso 0.5>'
heroku config:set -a controlmatica-staging AWS_ACCESS_KEY='<IAM nuevo>' AWS_SECRET_KEY='<IAM nuevo>'

# PRODUCCION: identico, cambiando -a controlmatica-staging por -a controlmatica
```

### 2.5 🟢 Verificación

```bash
heroku config -a controlmatica-staging | grep -E 'AWS_|TRM_|ECB_|EXCHANGE_RATE_|RECEIPT_|MCP_'
```

**Lo que hay que ver, y son cuatro cosas concretas:**

1. `AWS_REGION` dice **`us-east-2`**, no `us-east-1` y no ausente.
2. `AWS_BUCKET` dice `controlmatica`.
3. `RECEIPT_EXTRACTION_ENABLED` dice **`false`**.
4. **`E2E_UPLOAD_ROOT` NO aparece.** Si aparece en producción, bórrela ya:
   `heroku config:unset E2E_UPLOAD_ROOT -a controlmatica`.

---

## FASE 3 — Migraciones ⛔

### 3.1 🟡 Fotografía previa (guárdese la salida)

```bash
heroku pg:info -a controlmatica-staging
heroku run -a controlmatica-staging rails runner \
  'puts "report_expenses=#{ReportExpense.count} users=#{User.count} cost_centers=#{CostCenter.count}"'
```

Se compara al final. Si `report_expenses` cambió de número por migrar, algo salió muy mal.

### 3.2 🔴 Backup ANTES de migrar — no es opcional

```bash
heroku pg:backups:capture -a controlmatica-staging
heroku pg:backups -a controlmatica-staging | head -3   # confirmar que quedo "Completed"
```

**Repetir en producción, con su propio backup.** Un backup de staging no sirve para restaurar
producción.

### 3.3 Las 9 migraciones que entran

| Versión | Qué hace |
|---|---|
| `20260401000001` | Crea la tabla de partidas presupuestales |
| `20260401000002` | Campos de presupuesto en gastos |
| `20260402000001` | Campo de comprobante en gastos |
| `20260403000001` | Campos de moneda en gastos |
| `20260403000002` | Crea la tabla de tasas de cambio |
| `20260404000001` | Campos de contabilidad en gastos |
| `20260405000001` | Teléfono en usuarios |
| `20260811000001` | Crea la tabla de reglas de gastos |
| `20260811000002` | Campo de violaciones de regla en gastos |

`db/schema.rb` queda en la versión `2026_08_11_000002`.

**Todas son aditivas**: agregan columnas, tablas e índices. Ninguna borra ni transforma datos
existentes.

```bash
git push staging feature/gastos-presupuesto-ia:master
heroku run -a controlmatica-staging rake db:migrate
```

### 3.4 🟢 Verificación del esquema

```bash
heroku run -a controlmatica-staging rake gastos_ia_schema:check
heroku run -a controlmatica-staging rake storage:check
```

`gastos_ia_schema:check` es **de solo lectura** e imprime `OK` / `FALLA` línea por línea.
**Cero `FALLA` para seguir.**

> ⚠️ Ese chequeo verifica **6** de las 9 versiones (las del esquema base). Las de teléfono y
> reglas se comprueban con las dos pantallas: el campo de teléfono en el formulario de usuario y
> el menú **Configuración → Reglas de gastos**.

`storage:check` hace un **round-trip real contra S3** (subir, leer, firmar, borrar). Es la
verificación de que `AWS_REGION` quedó bien. **Si falla, vuelva al paso 2.2 antes de seguir.**

### 3.5 🟡 Drill de reversión — **solo en staging, y solo ahora**

Es la última oportunidad de comprobar que las migraciones se revierten con datos reales.

```bash
heroku run -a controlmatica-staging rake db:rollback STEP=9
heroku run -a controlmatica-staging rake db:migrate
heroku run -a controlmatica-staging rake gastos_ia_schema:check
```

> 🔴 **Son `STEP=9`, no 6 ni 7.** Cuente las filas de la tabla del paso 3.3. Un `STEP` corto
> deja la base a medias, y un `STEP` largo se lleva por delante migraciones anteriores al
> proyecto. Si duda, revierta **por versión** en lugar de por pasos.
>
> **Este drill NO se hace en producción.** Nunca.

### 3.6 ⛔ EL PUNTO DE NO RETORNO

> **En cuanto exista la primera partida presupuestal en producción, revertir las migraciones
> deja de ser una opción**: destruiría datos de negocio. El único remedio a partir de ahí es
> **restaurar el backup de Postgres**, con la pérdida de todo lo ocurrido desde entonces.
>
> **La estrategia de reversión a partir de ese momento son los interruptores de la FASE 5, no
> el rollback.**

---

## FASE 4 — Permisos 🟡

### 4.1 Sembrar los módulos

```bash
heroku run -a controlmatica-staging rake permissions_gastos_ia:install
heroku run -a controlmatica-staging rake permissions_expense_rules:install
```

Las dos son **idempotentes y aditivas**: se pueden correr las veces que haga falta. Crean los
módulos y sus acciones, y se los asignan **al rol Administrador**.

| Módulo | Acciones |
|---|---|
| Presupuesto | Ingreso al modulo, Crear, Editar, Eliminar, Ver todos |
| Contabilidad | Ingreso al modulo, Aprobar, Exportar a excel, Ver todos |
| Reglas de gastos | Ingreso al modulo, Crear, Editar, Eliminar |

> ⛔ **NUNCA corra `rake create_config:create` en un entorno con datos.** Esa tarea **borra en
> bloque todos los módulos de control**, y como la relación con los roles es de muchos a muchos,
> se lleva por delante **todos los permisos de todos los roles**. Es irreversible. Existe solo
> para instalaciones desde cero.

### 4.2 🔴 Asignar los permisos a los roles reales — decisión humana

Las tareas anteriores dejan los módulos creados y asignados **solo al Administrador**. Quién más
entra a cada módulo **lo decide Controlmatica**, no un script.

Se hace desde **Configuración → Módulos / Roles** en la interfaz. Preguntas a resolver antes:

- ¿Quién asigna presupuesto? (módulo *Presupuesto*, acciones Crear/Editar/Eliminar)
- ¿Quién aprueba en contabilidad? (módulo *Contabilidad*, acción *Aprobar*)
- ¿Quién ve los gastos de todos y quién solo los suyos? (acción *Ver todos*, en cada módulo)
- ¿Quién configura las reglas de gastos?

> **Cuidado con *Ver todos* en Contabilidad**: sin esa acción, la persona ve **solo sus propios
> gastos** en la bandeja. Es el reporte de falla más común tras un despliegue: *"la pantalla de
> contabilidad me sale vacía"*.

### 4.3 🟢 Verificación

Entre con un usuario de cada rol y compruebe: la pestaña **Presupuesto** dentro de un centro de
costos, el menú **Contabilidad** y el menú **Configuración → Reglas de gastos**.

Un usuario **sin** el permiso que intente entrar por la dirección directa debe ser devuelto al
inicio **con el mensaje en pantalla** *"No tiene permiso para ingresar al módulo de …"*. Si el
mensaje no aparece, el despliegue no llevó el arreglo del aviso.

---

## FASE 5 — Verificar los interruptores 🟡

**Solo en staging, uno por uno.** Son la única estrategia de reversión después del punto de no
retorno (3.6), así que hay que saber que funcionan **antes** de necesitarlos.

| # | Qué apaga | Cómo | Qué debe pasar |
|---|---|---|---|
| 5.1 | **Presupuesto** | Quitarle al rol las acciones del módulo *Presupuesto* | La pestaña desaparece del centro de costos y las peticiones responden 403. **El dato queda intacto** |
| 5.2 | **Contabilidad** | Quitarle al rol las acciones del módulo *Contabilidad* | El menú desaparece y entrar por la dirección devuelve al inicio con el aviso |
| 5.3 | **Lectura de comprobante** | `heroku config:set RECEIPT_EXTRACTION_ENABLED=false` | El botón *Extraer datos del comprobante* desaparece. **El registro manual sigue funcionando igual** |
| 5.4 | **Actor estricto de WhatsApp** | `heroku config:set MCP_STRICT_EXPENSE_ACTOR=false` | Se reactiva el modo laxo anterior. **Deje esto en `true`**: en laxo, un gasto de un número desconocido se puede atribuir a quien no lo hizo |

**Multimoneda no tiene interruptor.** El valor por defecto es COP y el bloque de moneda solo
aparece si el usuario cambia el selector. Riesgo asumido y documentado.

**Después de probar cada uno, DEVUÉLVALO a su estado normal.** Y anote en el acta de despliegue
que los cuatro se probaron.

---

## FASE 6 — Teléfonos y canal de WhatsApp 🔴

> **Esta fase entera es opcional para el resto del sistema.** Todo lo anterior funciona sin
> ella. Sin ella, lo único que no existe es el canal de WhatsApp.

### 6.1 🟢 Inventario

```bash
heroku run -a controlmatica-staging rake users:phones_report
```

Imprime cuántos usuarios tienen número, qué llaves están repetidas y el desglose por rol.
**Punto de partida esperado hoy: 0 usuarios con teléfono.**

### 6.2 🔴 Recolección — trabajo humano, días de calendario

Arme un archivo con dos columnas, `email` y `phone`:

```csv
email,phone
juan.perez@controlmatica.com.co,+57 300 123 4567
maria.gomez@controlmatica.com.co,3009876543
```

Se aceptan todos los formatos usuales (`+57 300 123 4567`, `3001234567`, `57 300 1234567`,
`(300) 123-4501`): el sistema normaliza a los últimos 10 dígitos.

> 🔴 **Un número repetido significa PERSONA NO IDENTIFICADA.** Si dos personas comparten línea
> (el clásico jefe/asistente), el asistente **no puede saber a quién atribuir el gasto** y
> rechaza los dos. Hay que resolverlo **antes** de cargar: una línea, una persona.

### 6.3 🟡 Carga

```bash
# Prueba en seco: cargue primero en staging y lea el reporte entero
heroku run -a controlmatica-staging rake "users:import_phones[telefonos.csv]"
```

La tarea es **idempotente** (correrla dos veces no cambia nada) y reporta: cuántos actualizó,
cuántos correos no encontró, cuántos teléfonos eran ilegibles, **cuántos quedaron duplicados —y
esos NO los carga—** y cuáles ya tenían otro número.

**Si aparecen conflictos** (el usuario ya tiene un número distinto), revise cuál es el bueno.
Solo entonces:

```bash
FORCE=1 heroku run -a controlmatica-staging rake "users:import_phones[telefonos.csv]"
```

`FORCE=1` sobrescribe los distintos. **No relaja la regla de duplicados**: eso no se fuerza
nunca.

### 6.4 🟢 Verificación

```bash
heroku run -a controlmatica-staging rake users:phones_report
```

- El número de usuarios con teléfono coincide con el inventario del paso 6.1.
- **La lista de llaves repetidas está vacía.** Si no lo está, el asistente no reconocerá a esas
  personas y hay que resolverlo antes de conectar el canal.

### 6.5 🔴 Conectar el canal — NO ANTES DE 6.4

> **El canal de WhatsApp no se conecta hasta que 6.4 salga limpio.** Con la tabla vacía o con
> duplicados sin resolver, **todo gasto por WhatsApp se rechaza** y el lanzamiento se lee como
> "el asistente no funciona".

Lo que falta de este lado del sistema: **nada**. Las herramientas están construidas, probadas y
expuestas. Lo que falta es **del lado del proveedor del asistente**:

1. Conectar el canal de WhatsApp con el número de pruebas.
2. Cargar la habilidad "Gastos IA" con las 7 herramientas nuevas y las existentes que usa el
   guion. La especificación completa está en `docs/TAIMES-AGENTE-GASTOS.md`.
3. Cargar el guion: el orden obligatorio de las 10 llamadas, la plantilla de confirmación
   explícita y los 6 modos de fallo con su texto exacto.
4. **Verificar la transcripción de nota de voz con al menos 3 notas reales**, grabadas por
   personas distintas y en condiciones de campo. Si el proveedor **no** ofrece transcripción, se
   documenta como **no disponible** y se renegocia por escrito el punto correspondiente de la
   propuesta. **No se deja abierto ni se promete.**
5. Ejecutar y **firmar** el guion de verificación manual de `docs/TAIMES-AGENTE-GASTOS.md` §9.

Solo después: repartir `docs/INSTRUCTIVO-WHATSAPP-CAMPO.md` al personal de campo.

---

## FASE 7 — Producción ⛔

**Se ejecuta cuando staging lleva al menos unos días en uso real sin sorpresas.**

Repita, en este orden, cambiando `-a controlmatica-staging` por `-a controlmatica`:

| Paso | Fase | ¿Distinto en producción? |
|---|---|---|
| 1 | 2.4 — variables | No. **Mismos valores.** Compruebe `AWS_REGION=us-east-2` |
| 2 | 3.2 — **backup propio** | 🔴 Sí: producción necesita **su** backup |
| 3 | 3.3 — desplegar y migrar | No |
| 4 | 3.4 — `gastos_ia_schema:check` + `storage:check` | No |
| 5 | — **3.5 (drill de rollback) SE OMITE** | ⛔ **Sí. En producción NUNCA** |
| 6 | 4.1 — permisos | No |
| 7 | 4.2 — asignación a roles 🔴 | Sí: los roles reales |
| 8 | 6.3 — teléfonos | Sí: el archivo definitivo |

```bash
heroku pg:backups:capture -a controlmatica
git push heroku feature/gastos-presupuesto-ia:master
heroku run -a controlmatica rake db:migrate
heroku run -a controlmatica rake gastos_ia_schema:check
heroku run -a controlmatica rake storage:check
heroku run -a controlmatica rake permissions_gastos_ia:install
heroku run -a controlmatica rake permissions_expense_rules:install
heroku restart -a controlmatica
```

### 7.1 🟡 `heroku restart` después de cambiar variables

Las variables de entorno **no las recogen los procesos que ya estaban corriendo**. Después de
cualquier `heroku config:set`, un `heroku restart`. Sin él, la mitad de los procesos usa los
valores viejos y el sistema se comporta de forma distinta según a qué proceso le toque cada
petición — que es exactamente el fallo intermitente del paso 2.2 con otro disfraz.

### 7.2 🟢 Prueba de humo en producción (5 minutos)

1. Entrar y ver el menú completo.
2. Abrir un centro de costos → pestaña **Presupuesto** → el tablero pinta las seis cifras.
3. **Crear una partida** de prueba. ⛔ *Esto cruza el punto de no retorno (3.6).*
4. Registrar un gasto contra esa partida, **con comprobante adjunto**.
5. **Descargar el comprobante** — esta es la verificación real de que S3 quedó bien.
6. Registrar un gasto en **USD** y comprobar que trae la tasa sola.
7. Abrir **Contabilidad** y aprobar el gasto.
8. Exportar el Excel y comprobar que trae **18 columnas**.
9. Abrir **Configuración → Reglas de gastos**.

### 7.3 🟡 Comparación final

```bash
heroku run -a controlmatica rails runner \
  'puts "report_expenses=#{ReportExpense.count} users=#{User.count} cost_centers=#{CostCenter.count}"'
```

Contra la fotografía del paso 3.1: **el número de gastos, usuarios y centros no cambió** (salvo
los que se crearon en la prueba de humo).

---

## FASE 8 — Cierre 🔴

### 8.1 Sesión de capacitación con acta firmada

**Es el criterio de cierre del proyecto.** Plantilla en `docs/ACTA-CAPACITACION.md`.

Contenido mínimo, y ninguno es negociable:

- Los **tres estados** de un gasto y por qué son independientes.
- **Los gastos históricos consumen presupuesto** (decisión 0.1). Es lo primero que van a
  preguntar.
- **Control sin IVA** (decisión 0.2).
- **El gasto excedido sale de la vista de contabilidad**, y el caso del gasto ya aprobado que
  vuelve a excedido.
- **La columna ID del Excel sobrescribe** el registro existente.
- El uso del asistente de WhatsApp, si el canal ya está conectado.

### 8.2 Rotar la llave vieja de AWS

Ahora sí: **revoque la llave del paso 0.1**, ya con la nueva funcionando y verificada.

### 8.3 Entregar la documentación

| Documento | A quién |
|---|---|
| `docs/MANUAL-USUARIO-GASTOS.md` | Todos los usuarios |
| `docs/GUIA-REGLAS-NEGOCIO.md` | Quien administre las reglas |
| `docs/INSTRUCTIVO-WHATSAPP-CAMPO.md` | Personal de campo — **solo cuando el canal esté conectado** |
| Este runbook | Quien mantenga el sistema |

---

## Anexo A — Qué hacer si algo sale mal

| Síntoma | Causa más probable | Qué hacer |
|---|---|---|
| Los comprobantes se suben "a veces" | `AWS_REGION` ausente o mal | Paso 2.2 + `heroku restart` |
| `storage:check` falla | Credenciales o región | Paso 2.2. **No siga hasta resolverlo** |
| Todo gasto en USD pide la tasa a mano | Sin `DATOS_GOV_APP_TOKEN` (HTTP 429) | Paso 0.5 |
| La pestaña Presupuesto no aparece | Permisos del rol | Paso 4.2 |
| Contabilidad sale vacía para alguien | Le falta la acción *Ver todos* | Paso 4.2 |
| Falta un gasto en Contabilidad | Está **excedido** (no entran) | Manual de usuario §7.2 |
| Todo gasto por WhatsApp se rechaza | Teléfonos sin cargar | FASE 6 |
| Aparece un botón "Extraer datos del comprobante" que no hace nada | Alguien puso `RECEIPT_EXTRACTION_ENABLED=true` | Vuelva a `false` + `heroku restart` |
| Error de constante no inicializada tras el deploy | Procesos viejos sin reiniciar | `heroku restart` |
| Hay que revertir y **NO hay partidas creadas** | — | `rake db:rollback STEP=9` |
| Hay que revertir y **SÍ hay partidas creadas** | ⛔ Punto de no retorno | **NO revierta la migración.** Use los interruptores (FASE 5). Si hay corrupción de datos, restaure el backup |

---

## Anexo B — Cifras de referencia

Medidas en la máquina de desarrollo al cierre del proyecto. Sirven para saber si algo se rompió
en el camino.

| Qué | Resultado |
|---|---|
| `bin/rails test` | Ver la sección "Cierre" de `docs/plan-gastos-ia/ESTADO.md` |
| `cd test/e2e && npm test` | ídem |
| Migraciones del proyecto | **9** |
| Versión de `db/schema.rb` | `2026_08_11_000002` |
| Variables de entorno | **15** |
| Tareas de mantenimiento | 5: `permissions_gastos_ia:install`, `permissions_expense_rules:install`, `gastos_ia_schema:check`, `storage:check`, `users:import_phones` |
| Columnas del Excel | **18** |

---

## Anexo C — Lo que este runbook NO cubre

Con nombre propio, para que nadie lo dé por hecho:

1. **La configuración del asistente dentro de la plataforma del proveedor** (paso 6.5). No
   tenemos acceso a esa consola. La especificación está entregada; la ejecución y su
   responsabilidad son de quien la opere.
2. **La transcripción de nota de voz.** Es una capacidad de un tercero. Se verifica en 6.5.4 y,
   si no existe, **se renegocia por escrito**.
3. **La lectura automática del comprobante.** El interruptor y la interfaz están construidos y
   apagados; la pieza que lee la imagen la completa el proveedor.
4. **La migración de comprobantes históricos.** No hay: los archivos que se subieron antes de
   que existiera almacenamiento en S3 fueron a disco efímero y **no son recuperables**. Los
   comprobantes empiezan a existir desde este despliegue.
