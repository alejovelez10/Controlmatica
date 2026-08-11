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
| 1 | 01 — Infraestructura de pruebas | ✅ | `0b37a40`..`0e93f5b` | Minitest **verde** (42 runs, 97 assertions, 0 fallos) y Playwright **verde también en frío** (6 passed, ~21 s) tras `5a31c32` |
| 1 | Extra — Teléfono en el formulario de usuario | ✅ | `0a718cb`, `b8ef25f`, `b58927a` | Normalización + backend + campo en el formulario vivo. 24 pruebas verdes |
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
   máquina corre 22.22.0: por eso `npm run test:smoke` no arranca (ver Bitácora, ola 1). Hay que
   elegir entre fijar Node 16 (`.nvmrc`) o ampliar `engines`; es un cambio que afecta también al
   build de despliegue, así que no se tomó por cuenta propia.

---

## Bitácora

### Ola 1 — Infraestructura de pruebas + teléfono (paquete 01 y tarea extra)

**Estado honesto: Minitest verde y Playwright verde, también en frío.** El paquete 01 pasa a ✅
después de `5a31c32`, `516b4fb` y `0e93f5b`, que cierran los tres hallazgos de la verificación.
La sección "Lo que quedó en rojo" se conserva más abajo, ya resuelta, porque el diagnóstico sirve.

**Qué se hizo** (22 commits atómicos, `8b3abbc..49d96ec`, ninguno empujado al remoto):

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
