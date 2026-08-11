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

### Protocolo de continuación (leer si la sesión se limpió)

**Primero comprueba si quedó algo corriendo**: mira si el tablero tiene una ola en ⏳ y compárala
con `git log --oneline -15`. Si la ola en curso ya tiene sus commits, terminó; si no, o se cortó o
sigue viva. Ante la duda, **verifica el estado real corriendo la suite** antes de relanzar nada:
relanzar una ola a medio hacer duplica trabajo y genera conflictos.

**Orden de las olas** (no lo alteres, la auditoría verificó las dependencias):

```
1  → 01                    infraestructura de pruebas
2  → 02, luego 03          esquema; después deuda técnica (comparten report_expense.rb)
3a → 04, luego 05          presupuesto; después multimoneda
3b → 06, luego 10*         comprobante+contabilidad; después solo el esqueleto de extracción
4  → 07, luego 14          API y permisos; después reglas de gastos
5  → 09 y 11 en paralelo   verificados disjuntos por la auditoría
6  → 08                    frontend de presupuesto y formulario
7  → 12                    E2E
8  → 13                    cierre y documentación
```

\* Del paquete 10 **solo** el motor de reglas ya no aplica (se fue al 14) y el esqueleto del
servicio de extracción. La llamada al modelo de visión es de Taimes: ver "Frontera de alcance".

**Cómo se ejecuta cada ola**: un workflow por ola, con este ciclo por paquete —
implementar → verificar (agente independiente que corre los comandos de verdad y **no** puede
arreglar) → arreglar si quedó rojo, hasta 3 intentos → actualizar este tablero.
Reglas que se le pasan a todos los agentes: nunca `git push`, nunca tocar producción, commits
atómicos en español, respetar §7.2, y prohibido borrar pruebas o marcarlas `skip` para que pasen.

**Los gotchas verificados** (User.current en callbacks, `rails runner` que se cuelga, credenciales
de S3, etc.) están en la memoria del proyecto y en `00-ARQUITECTURA.md`. Pásalos siempre en el
prompt: sin ellos los agentes los redescubren y pierden horas.

---

## Tablero

| Ola | Paquete | Estado | Commit | Notas |
|---|---|---|---|---|
| — | Migración `users.phone` (Tarea 1 del 11, adelantada) | ✅ | `653e312` | Columna creada y aplicada en dev. **El dato no existe**: 0 de 29 usuarios |
| 1 | 01 — Infraestructura de pruebas | ✅ | `0b37a40`..`b8f46c4` | **Verde reconfirmado por una segunda verificación independiente sobre `b8f46c4`.** Minitest 42 runs / 97 assertions / 0 fallos (2,16 s con Spring; 1,96 s sin Spring); Playwright 6 passed dos veces (14,2 s y 12,9 s). Los 25 criterios verificables PASAN (el 13 está RETIRADO por auditoría); 3 salvedades son de redacción del criterio, no del software |
| 1 | Extra — Teléfono en el formulario de usuario | ✅ | `0a718cb`, `b8ef25f`, `b58927a` | Normalización + backend + campo en el formulario vivo. 24 runs / 47 assertions verdes, verificado aparte |
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
5. **Decidir la versión de Node del proyecto.** `package.json` exige `engines: node 16.x` y la
   máquina corre 22.22.0. **Corrección (ola 1, verificación final): el E2E ya NO está roto.**
   `npm run test:smoke` arranca y pasa en frío y en tibio desde `5a31c32`, porque `bin/webpack` y
   `bin/webpack-dev-server` fijan `WEBPACKER_NODE_MODULES_BIN_PATH` y así no se ejecuta el plan B
   `yarn webpack`, que era el que disparaba el chequeo de engines. Lo que sigue pendiente es solo la
   **decisión de fondo**: fijar Node 16 (`.nvmrc`) o ampliar `engines`. No se tomó por cuenta propia
   porque `engines.node: "16.x"` es el contrato de build con Heroku y cambiarlo es tocar producción.
   Mientras no se decida, el arreglo de los binstubs sostiene el desarrollo local sin riesgo.
6. **Corregir tres criterios de aceptación del paquete 01** (`01-infraestructura-de-pruebas.md`,
   líneas 1099-1160), que quedaron desalineados con la realidad y confundirán a quien audite después:
   el **17** pide "5 tests passed" cuando son 6 (el proyecto `setup` de Playwright cuenta), el
   **12** pide "los 11 archivos de §7.12" pero su paréntesis exige `wc -l` = 14, que es lo correcto,
   y el **21** (`grep -rn "_url" test/e2e/` debe dar 0) devuelve **2 líneas**, ambas dentro de
   comentarios de `playwright.config.js` que explican por qué no se deben usar los helpers `*_url`.
   Usos reales: cero. El criterio pasa en sustancia pero falla en la letra.
   **No se editaron por cuenta propia**: son el criterio contra el que el cliente juzga el trabajo y
   cambiarlos sin permiso parecería mover la portería. Decisión de una persona: se corrigen o se
   dejan como están con esta nota.

---

## Bitácora

### Ola 1 — Infraestructura de pruebas + teléfono (paquete 01 y tarea extra)

**Estado honesto: Minitest verde y Playwright verde, también en frío.** El paquete 01 pasa a ✅
después de `5a31c32`, `516b4fb` y `0e93f5b`, que cierran los tres hallazgos de la verificación.
La sección "Lo que quedó en rojo" se conserva más abajo, ya resuelta, porque el diagnóstico sirve.

**Qué se hizo** (28 commits atómicos, `8b3abbc..55e460a`, ninguno empujado al remoto — este párrafo
se escribió cuando iban 22 hasta `49d96ec`; los 6 restantes son los arreglos posteriores y el cierre
del tablero):

- Se desbloqueó el arranque de la suite: fuera `chromedriver-helper` (`0b37a40`) y fuera los 29
  tests de scaffold heredados que ni siquiera cargaban (`85cf0d4`).
- Fixtures reales y cargables: se quitaron columnas inexistentes (`d3731fe`), se sembraron roles,
  usuarios, módulos y acciones (`bde60b0`) y clientes, centros y parámetros, saneando todas las FKs
  colgantes (`c0ea667`). `fixtures :all` ya no revienta.
- Helpers compartidos (`as_user`, Devise, JSON, uploads) con autoload de `test/support` (`1d603b1`),
  y `ReportExpense#current_actor_id` (`36ed510`) como fallback para el gotcha de `User.current`:
  es lo que hace testeable la auditoría sin tocar el comportamiento en producción.
- 18 casos que demuestran que la infraestructura funciona (`63466b1`), permisos por rake idempotente
  (`0e768f6`), los 4 `data-testid` del contrato de E2E (`7aab00d`) y la infraestructura Playwright
  con 6 smokes (`1246b31`).
- Teléfono: normalización en el modelo (`0a718cb`), backend que lo permite y lo expone (`b8ef25f`)
  y el campo en el formulario vivo `app/javascript/components/Users/index.jsx` (`b58927a`).

**Comandos que corren la suite**

| Suite | Comando | Resultado real |
|---|---|---|
| Minitest completo | `bundle exec rails test` | ✅ 42 runs, 97 assertions, 0 failures, 0 errors, 0 skips |
| Solo teléfono | `bundle exec rails test test/models/user_phone_test.rb test/controllers/users/registrations_controller_phone_test.rb` | ✅ 24 runs, 47 assertions, 0 fallos |
| E2E smoke en frío | `cd test/e2e && npm run test:smoke` tras `rm -rf public/packs-test tmp/cache/webpacker` | ✅ 6 passed en **~21 s** (6,6 s de webpack) |
| E2E smoke en tibio | el mismo comando, corrida siguiente | ✅ 6 passed en **~12 s** |

**Cuántas pruebas hay ahora**: 42 casos Minitest repartidos en **5 archivos reales**
(`user_phone_test` 17, `fixtures_integrity_test` 8, `test_helpers_test` 7,
`registrations_controller_phone_test` 7, `authentication_smoke_test` 3) + 6 specs Playwright.

**Lo que quedó en rojo (y cómo se cerró)**

> Resuelto en `5a31c32`, `516b4fb` y `0e93f5b`. Se deja el diagnóstico porque la causa real no era
> la que se sospechaba y volver a buscarla cuesta horas.
>
> **La causa no era el `engines` a secas.** Webpacker 5.4.4 resuelve el binario con `` `yarn bin` ``
> (`lib/webpacker/runner.rb:13`) y yarn 1.22 antepone a esa salida la secuencia ANSI `\e[2K\e[1G`
> cuando su stdout es una tubería y no una terminal — justo el caso del `webServer` de Playwright,
> y por eso `bin/webpack` lanzado a mano sí compilaba. Con la ruta ensuciada, el `File.exist?` del
> runner da falso y webpacker cae a su plan B, `yarn webpack`; **es ese plan B** el que dispara el
> chequeo de engines y muere. El arreglo fija `WEBPACKER_NODE_MODULES_BIN_PATH` en `bin/webpack` y
> `bin/webpack-dev-server`, con lo que ni se ejecuta `yarn bin` ni existe el plan B.
> **`engines.node: "16.x"` del `package.json` de la raíz se deja intacto**: es el contrato de build
> con Heroku y tocarlo sí sería tocar producción. Va en los binstubs y no en `prepare.js` porque el
> compilador on-demand de webpacker (`compile: true` en test) también ejecuta `./bin/webpack`.
> Un tercer hallazgo, el criterio 13-bis, era un falso positivo de forma: la única aparición de la
> cadena prohibida en `parameterizations.yml` estaba dentro del comentario que la prohíbe. Se
> describe con palabras y el test guardián ahora también exige que no aparezca literal.

1. ~~**`npm run test:smoke` falla en frío, 2 de 2 veces, sin ejecutar un solo test.**~~ Moría en el
   paso 2/3 de `test/e2e/scripts/prepare.js` al llamar `bin/webpack`:
   `error Controlmatica@1.19.0: The engine "node" is incompatible with this module. Expected version "16.x". Got "22.22.0"`
   → `Process from config.webServer was not able to start. Exit code: 1`.
   Los 6 specs en sí son correctos (validan `nav-gastos`, `page-report-expenses`, `cm-datatable`,
   `cm-datatable-row` y el redirect a login sin sesión); lo que estaba roto era el arranque.
   **Arreglado en `5a31c32`** (ver el recuadro de arriba: la causa era el `yarn bin` de webpacker,
   no el `engines` por sí solo). El E2E vuelve a ser ejecutable con un solo comando.
2. ~~**`test/e2e/README.md` y el cuerpo del commit `1246b31` mienten sobre los tiempos.**~~
   Documentaban `bin/webpack` en frío = 6,4 s y `npm run test:smoke` completo ≈ 12 s con 6 tests,
   extrapolando un tiempo medido en tibio al escenario en frío. **Corregido en `0e93f5b`**: la tabla
   tiene ahora dos filas separadas, frío (~20 s) y tibio (~12 s), medidas de nuevo. El cuerpo del
   commit `1246b31` no se puede reescribir sin alterar la historia; queda corregido aquí y en el
   README, que es lo que la gente lee.

**Lo frágil**

- **La cobertura es real pero angosta**: 30 de los 35 archivos `*_test.rb` siguen siendo stubs
  vacíos de scaffold (0 casos) — todo `test/controllers` salvo el del teléfono, todo `test/models`
  salvo `user_phone` / `fixtures_integrity` / `test_helpers`, y todo `test/jobs` y `test/mailers`.
  Que la suite esté "verde" **no** significa que el sistema esté probado.
- El E2E depende de que `public/packs-test` esté compilado. Es artefacto gitignoreado, así que
  cualquier máquina nueva empieza en frío: son ~8 s extra por corrida, ya no un fallo.
- `FormCreate.jsx` y `table.jsx` de Usuarios son **código muerto**: el pack monta
  `components/Users/index`. Si alguien edita los muertos, no verá ningún cambio.

**Higiene**: `git status --porcelain` vacío, los 22 commits en español con el POR QUÉ en el cuerpo y
el trailer `Co-Authored-By`. `git branch -r --contains HEAD` vacío y la rama sin upstream: **nada
salió al remoto**. No se tocó producción.

---

### Ola 1 — Verificación final independiente (cierre)

Un verificador que **no puede arreglar nada** volvió a correr todo desde cero y a comprobar los
criterios uno por uno. **Resultado: VERDE CONFIRMADO. Ningún fallo.** El paquete 01 queda ✅ en
`0b37a40..55e460a` (HEAD `55e460a`).

**Qué se construyó en la ola** (resumen de lo que existe hoy, no de lo que se prometió):

- Infraestructura Minitest: `test/support/` con 4 helpers (`authentication_helpers.rb`,
  `json_helpers.rb`, `permission_helpers.rb`, `upload_helpers.rb`) y autoload; 22 fixtures saneadas
  que cargan con `fixtures :all`; 14 archivos reales en `test/fixtures/files` (PDF, JPEG, PNG, HEIC,
  3 XLSX y 2 archivos con MIME mentiroso a propósito, verificados con `file`).
- `ReportExpense#current_actor_id`: 0 apariciones de `User.current.id` en el modelo, 5 usos del
  fallback (líneas 53, 149, 214, 275, 337; definido en la 385). Es el que desactiva el gotcha.
- `lib/tasks/permissions_gastos_ia.rake`: idempotente de verdad, sin ningún `destroy_all`.
- Infraestructura Playwright completa en `test/e2e/` con su propio `package.json` (engines `>=18`),
  aislado del `package.json` de la raíz.
- Teléfono de usuario: modelo, backend y campo en el formulario vivo.

**Cuántas pruebas hay y cuánto tardan**

| Suite | Resultado literal | Tiempo |
|---|---|---|
| Minitest completo | `42 runs, 97 assertions, 0 failures, 0 errors, 0 skips` | **2,19 s** (19,2 runs/s) |
| Subconjunto de teléfono | `24 runs, 47 assertions, 0 failures, 0 errors, 0 skips` | — |
| Playwright en tibio | `6 passed` | **12,8 s** |
| Playwright en frío (tras borrar `public/packs-test` y `tmp/cache/webpacker`) | `6 passed` | **19,8 s** (20,18 s de reloj) |

Total: **42 casos Minitest + 6 specs Playwright**. El E2E se corrió tres veces seguidas
(tibio → frío → tibio) y las tres dieron verde: el seed es idempotente.

**Lo frágil, pendiente o asumido — sin adornos**

1. **La suite verde NO significa que el sistema esté probado.** 30 de los 35 archivos `*_test.rb`
   siguen siendo stubs de scaffold con **0 casos**: todo `test/controllers` salvo el del teléfono,
   todo `test/models` salvo `user_phone` / `fixtures_integrity` / `test_helpers`, y **todo**
   `test/jobs` y `test/mailers`. Los 42 casos que sí existen son sustantivos (prueban el `ensure` de
   `as_user` ante excepción, la idempotencia de `grant_permission!`, el content-type de las subidas),
   pero cubren la infraestructura, no el negocio. El negocio lo cubren las olas siguientes.
2. **`bundle exec rails runner` sigue tardando ~40 s.** No se cuelga (eso quedó cerrado), pero es
   lento: para consultar la base sigue siendo mejor `psql` directo.
3. **El E2E depende de un artefacto gitignoreado** (`public/packs-test`). Cualquier máquina nueva
   arranca en frío: ~7 s extra por corrida. Ya no es un fallo, es un costo.
4. **`FormCreate.jsx` y `table.jsx` de Usuarios son código muerto.** El pack monta
   `components/Users/index`. Quien edite los muertos no verá ningún cambio en pantalla.
5. **Asumido**: el criterio 15 (chromium descargado para Playwright) se dio por bueno de forma
   indirecta — las dos corridas de Playwright ejecutaron, luego el navegador está. No se repitió la
   descarga de ~95 MB.

**Tres salvedades documentales.** Ninguna rompe nada, pero el documento del paquete quedó
desactualizado respecto del código; el desfase es del texto, no del software:

- El **criterio 17** exige "5 tests passed" y la realidad son **6**: el proyecto `setup` de
  Playwright cuenta como test. Redacción vieja, no un fallo.
- El **criterio 12** dice "los 11 archivos de §7.12" pero su propio paréntesis exige que `wc -l` dé
  **14**, que es lo que da. El criterio se contradice a sí mismo.
- El **pendiente #5** de este mismo archivo afirmaba que "`npm run test:smoke` no arranca". Eso era
  **falso** desde `5a31c32`. Ya está corregido arriba: quien leyera solo la lista de pendientes
  concluiría que el E2E está roto cuando no lo está.

**Higiene git verificada**: rama `feature/gastos-presupuesto-ia`, HEAD `55e460a`,
`git status --porcelain` **vacío después de todas las corridas**. `git branch -r --contains HEAD`
vacío y "no upstream configured": **nada salió al remoto**. Los 28 commits del plan llevan el
trailer `Co-Authored-By`; los 3 sin trailer (`62f8f6b`, `45d8f3e`, `eecf7fe`) son preexistentes de
la rama base `feature/ui-modernization`. Commits atómicos: mediana de 1–4 archivos; los mayores son
`85cf0d4` (14, borrado de stubs), `1246b31` (14, Playwright) y `c4ef970`/`8b3abbc` (16 y 15, solo
documentación).

**No se tocó producción.** Las únicas escrituras fueron el rake corrido en `RAILS_ENV=test` (base
`controlmatica_test`, desechable, la reinicia `db:test:prepare`) y el borrado/recompilado de
`public/packs-test`, artefacto gitignoreado.

---

### Ola 1 — Segunda verificación independiente sobre `b8f46c4` (cierre definitivo)

Se volvió a verificar la ola completa sobre el HEAD actual, con un verificador que **no puede
arreglar nada** y que corrió cada comando él mismo: **ninguna cifra de esta sección viene de la
documentación**. **Resultado: VERDE CONFIRMADO. Nada falló.**

**Alcance deducido, no dado.** El encargo llegó sin decir qué ola verificar. Se dedujo del repo:
este tablero y `git log` muestran que lo único implementado es la ola 1 (paquete 01 + la tarea extra
del teléfono) y que los paquetes 02..14 siguen en ⬜. `b8f46c4` es un commit solo de documentación
que cierra la ola. Se verificó, por tanto: suite Minitest, E2E, existencia real de los archivos
prometidos, los criterios de aceptación del paquete 01 e higiene de git.

**Qué se construyó en la ola** — lo mismo que ya describe la sección anterior; esta entrada no añade
código, añade evidencia. Confirmado archivo por archivo: `test/support/` con sus 4 helpers,
22 fixtures YAML, 14 archivos en `test/fixtures/files` (comprobados con `file`: PDF 1.4 reales,
JPEG, PNG, HEIC, 3 XLSX y 2 con MIME mentiroso a propósito, que `file` reporta como `data`),
`lib/tasks/permissions_gastos_ia.rake`, y `test/e2e/` con 12 archivos trackeados y `package.json`
propio (`engines >= 18`). **Todos existen.**

**Cuántas pruebas hay y cuánto tardan** (Minitest corrido dos veces, la segunda con Spring detenido
para descartar caché; Playwright dos veces seguidas con reseed en ambas):

| Suite | Comando | Resultado literal | Tiempo |
|---|---|---|---|
| Minitest (con Spring) | `bin/rails test` | `42 runs, 97 assertions, 0 failures, 0 errors, 0 skips` | **2,158 s** (19,47 runs/s) |
| Minitest (sin Spring) | `bin/spring stop` + `DISABLE_SPRING=1 bundle exec rails test` | idéntico | **1,957 s** |
| Playwright, 1ª corrida | `cd test/e2e && npm run test:smoke` | `6 passed` | **14,2 s** |
| Playwright, 2ª corrida | el mismo comando | `6 passed` | **12,9 s** |

Total hoy: **42 casos Minitest + 6 specs Playwright**. La salida de Minitest queda limpia salvo dos
warnings preexistentes e inocuos (`PG::Coder` deprecado, `axlsx_rails` renombrado) y el HTML que los
callbacks de auditoría de `ReportExpense` imprimen a stdout.

**Las pruebas son reales, no clases vacías.** Se leyeron los 42 nombres uno por uno, repartidos en
5 archivos (`user_phone_test` 17, `fixtures_integrity_test` 8, `test_helpers_test` 7,
`registrations_controller_phone_test` 7, `authentication_smoke_test` 3). Prueban el `ensure` de
`as_user` ante excepción, el fallback `current_actor_id` con `User.current = nil`, la idempotencia
de `grant_permission!`, el content-type de las subidas y las FKs de las fixtures.

**Criterios de aceptación: los 25 verificables PASAN** (el 13 está RETIRADO por auditoría).
Entre otros: `rails runner -e test` responde en 1,95 s y **no se cuelga**; `chromedriver-helper` = 0;
`User.current.id` = 0 en `report_expense.rb` con 5 usos del fallback; no existe `test/system`;
`MyString` = 0; `parallelize` = 0; el `package.json` de la raíz sigue sin `playwright` y con
`engines.node: "16.x"` intacto; `.gitignore:49` cubre `/test/e2e/.auth`; los 4 `data-testid` están
en `layouts/user.html.erb`, `packs/ReportExpenseIndex.js` y `ui/CmDataTable.jsx` y el E2E los
encuentra servidos; el rake corrido **dos veces** da `ModuleControl=6 AccionModule=21
permisos_admin=21` idéntico en ambas, con Presupuesto en 5 acciones y Contabilidad en 4, y sin
ningún `destroy_all`.

**Lo frágil, pendiente o asumido — sin adornos**

1. **Verde no es lo mismo que probado.** 30 de los 35 archivos `*_test.rb` siguen siendo stubs de
   scaffold con **0 casos**: todo `test/controllers` salvo el del teléfono, todo `test/models` salvo
   `user_phone` / `fixtures_integrity` / `test_helpers`, y **todo** `test/jobs` y `test/mailers`.
   Los 42 casos cubren la infraestructura de pruebas, **no la lógica de negocio**. El negocio no
   está implementado todavía: los paquetes 02 a 14 están **todos** pendientes.
2. **Asumido, y es lo único no comprobado de frente**: el criterio 15 (chromium descargado). No se
   repitió `npm run install:browsers` (~95 MB); se da el navegador por presente de forma
   **indirecta**, porque dos corridas de Playwright lo ejecutaron.
3. Siguen vigentes las fragilidades ya anotadas arriba: el E2E depende de `public/packs-test`, que
   es artefacto gitignoreado (cualquier máquina nueva arranca en frío), y `FormCreate.jsx` /
   `table.jsx` de Usuarios son código muerto — el pack monta `components/Users/index`.

**Tres salvedades de forma, ninguna es un fallo.** Ya estaban confesadas en este archivo y quedan
confirmadas: el criterio **17** pide "5 tests passed" y son 6 (el proyecto `setup` de Playwright
cuenta); el **12** se contradice a sí mismo ("los 11 archivos" contra un `wc -l` = 14, que es lo que
da); y el **21** devuelve 2 líneas que están **en comentarios** de `playwright.config.js` explicando
por qué no usar helpers `*_url` — usos reales: cero. Los tres son desfases del texto del criterio,
no del software, y su corrección es **decisión de una persona** (pendiente #6).

**Higiene git verificada**: rama `feature/gastos-presupuesto-ia`, HEAD `b8f46c4`,
`git status --porcelain` **vacío antes y después** de correr suite, E2E y el rake.
`git branch -r --contains HEAD` vacío y "no upstream configured": **nada salió al remoto**.
32 commits sobre `master`; los 29 del plan llevan el trailer `Co-Authored-By: Claude Opus 5`; los 3
sin trailer (`62f8f6b`, `45d8f3e`, `eecf7fe`) son preexistentes de la rama base
`feature/ui-modernization`. Commits atómicos: mediana de 1–4 archivos; los mayores son `c4ef970`
(16, solo docs), `8b3abbc` (15, solo docs), `85cf0d4` (14, borrado de stubs) y `1246b31`
(14, Playwright completo).

**No se tocó producción.** Las únicas escrituras fueron el rake en `RAILS_ENV=test` (base
`controlmatica_test`, desechable) y `public/packs-test`, artefacto gitignoreado.
