# 16 — Reglas por rol, persona y tipo de gasto, y prohibiciones (octubre 2026)

Pedido del cliente del 2026-10-14, con capturas de cuatro reglas que no funcionaban. Este
documento registra el diagnóstico, lo decidido y lo que queda para producción.

---

## 1. El problema

El cliente escribía condiciones de **quién** y de **qué tipo de gasto** en el texto para el
agente:

| Regla del cliente | Lo que pasaba |
|---|---|
| "Combustible, parqueaderos y peajes solo para German Hincapie, Julian Montoya, Johnnnatan Montoya y David Londoño" | Bloqueó a Johnnatan, que sí estaba en la lista |
| "Representación solo para administrador, comercial y administración" | El rol no se tenía en cuenta |
| "Licor, cerveza, whisky… no permitidos; excepción: representación" | Una cena de representación con vino quedaba bloqueada |
| (Validar duplicados, en todas) | El segundo viático de una persona no se dejaba cargar |

**Causa común de las tres primeras:** al pulsar "Extraer datos", el agente recibe el archivo,
el código del centro y el texto de las reglas. **Nunca** recibe quién registra, su rol ni el
tipo de gasto, que además se elige después de extraer. Adivinaba, y como las reglas estaban en
"no dejar crear", bloqueaba.

**La cuarta no es de IA:** el duplicado es mismo número de factura + mismo NIT. Un viático no
tiene factura: ponen "N/A" o la cédula, y el segundo choca con el primero.

## 2. El principio

Se separa cada cosa según **quién puede verificarla**:

- Lo que el sistema ya sabe —quién registra, su rol, el tipo de gasto— lo decide el
  **servidor**, igual por la web, por WhatsApp y por la importación.
- Lo que solo se ve en el comprobante —licor, propinas, artículos personales— lo juzga el
  **agente**, con el campo de instrucciones.

## 3. Lo construido

### Entrega 1 — campos nuevos de la regla (servidor + pantalla)

- **Aplica a:** "Solo estos roles" (como antes) o **"Todos los roles, excepto…"**
  (`applies_to_all_roles` + `excluded_rols`). La segunda incluye los roles que se creen
  después. El servidor vacía la lista que no corresponde al modo.
- **Personas excluidas** (`excluded_users`): excepciones con nombre propio, en los dos modos.
- **Tipos de gasto:** "Solo estos tipos" (`included_types`, **vacío = todos**) y "Excepto
  estos" (`excluded_types`). Gana excluir; la pantalla no deja un tipo en las dos.
- **Prohibir el gasto** (`prohibits_expense`): si la regla aplica, el gasto no se permite.
  Exige al menos un tipo. Respeta "Al incumplirse": si está marcado, no se guarda; si no, se
  guarda sin aprobar.

Resolución (`ExpenseRule.aplicables_a` + `para_gasto`):

- Las reglas de "Solo estos roles" siguen igual: si la persona tiene alguna, reemplazan a la
  regla por defecto.
- Las de **"Todos los roles" se suman siempre y no desplazan a la por defecto**. Si contaran
  como asignadas, una regla general le quitaría la regla por defecto a toda la empresa.
- Una persona excluida de su única regla específica cae a la por defecto.
- Sin tipo elegido, no aplican las reglas de "Solo estos tipos".
- **Una prohibición que se quedó sin tipos** (porque los borraron desde Parametrizaciones, con
  la FK en cascada) **deja de prohibir**, en vez de prohibirlo todo.
- Al **editar**, cambiar el tipo o el responsable choca solo con las prohibiciones, sin
  reevaluar la antigüedad de un gasto viejo.

Canales: el formulario de Gastos y el del centro de costos avisan apenas se elige el tipo
(`/validate_expense_rules` recibe `type_identification_id`). En el MCP, `expense_rules_validate`
recibe el tipo y `expense_rules_list` devuelve `prohibited_types`, `only_types` y `except_types`.

### Entrega 2 — el veredicto del agente regla por regla

- Al extraer, cada regla viaja numerada (`[Regla 12 · Sin licor]`) y el esquema pide cada
  hallazgo como `{ rule_id, reason }`. Se siguen aceptando los motivos sueltos de antes.
- Sin tipo elegido, se juzgan las reglas de **todos** los tipos de la persona; con tipo, solo
  las de ese tipo.
- Al guardar, el servidor **suelta los hallazgos de reglas que no aplican** al tipo elegido, y
  **frena solo si la regla del hallazgo es obligatoria**. Antes, cualquier hallazgo frenaba si
  alguna regla obligatoria tenía texto. Un hallazgo sin regla sigue frenando como antes.
- La pantalla hace el mismo filtro al elegir el tipo (`generalcomponents/agentVerdict.js`, que
  usan los dos formularios) y reenvía `policy_verdict` con `judged_rule_ids`.
- **El comprobante que nadie juzgó se juzga al guardar** (`juzgar_al_guardar!`): si no se pulsó
  "Extraer", o si al guardar aplica una regla que el agente no vio (se cambió el responsable).
  Falla abierto: sin IA, con timeout o con error, el gasto se guarda como hasta hoy.

### Entrega 3 — viáticos y duplicados

`check_duplicate` ya no revisa los viáticos (`ReportExpenseOption#viatico?`) ni los números de
relleno: "N/A", "No aplica", "S/N", solo ceros, o el número igual al NIT/cédula del mismo gasto.

## 4. Cómo quedan las reglas del cliente

| Regla | Aplica a | Tipos | Efecto |
|---|---|---|---|
| Representación | Todos, excepto Administrador, Comercial y Administración | Solo: Representación | Prohibir |
| Vehículo | Todos; personas excluidas: las 4 | Solo: Combustible, Parqueaderos, Peajes | Prohibir |
| Sin licor | Todos | Excepto: Representación | Texto: "No se aceptan bebidas alcohólicas…" |

Los tres roles en representación no tienen la regla de licor; los demás no pueden cargar
representación. **El texto de las reglas de vehículo y de representación se borra**: ya lo
decide el servidor.

## 5. Puesta en producción (en este orden)

1. Deploy de esta rama a Heroku y **`heroku run rails db:migrate -a controlmatica`**
   (migración `20261014000001`).
2. **Resincronizar el catálogo MCP en Taimes** prod: `expense_rules_validate` y
   `expense_rules_list` tienen parámetros nuevos, y el agente solo ve el esquema sincronizado.
3. Actualizar el skill de Gastos en Taimes prod: `./ops/run_prod.sh
   actualizar_skill_gastos_controlmatica.py --entorno prod` (simulacro), revisar, y repetir con
   `--aplicar`. El texto (`ops/body_gastos_controlmatica.md`) ya pide mandar el tipo a la
   validación y explica las prohibiciones.
4. Actualizar el skill del **extractor** en Taimes prod: `./ops/run_prod.sh
   actualizar_body_extractor.py --entorno prod`. **Este skill es el que de verdad lee el
   comprobante en la web**: Rails le manda a Taimes solo el mensaje y el esquema, no su
   `SYSTEM_PROMPT`. El texto nuevo (`ops/body_extractor_comprobantes.md`) pide cada hallazgo
   como `{ rule_id, reason }` y explica que la regla lista lo que no se acepta. El simulacro
   va a abortar con unas 24 líneas "en la BD y NO en el archivo": son la sección vieja de
   política. Si son solo esas, repetir con `--aplicar --pisar`; si aparece otra cosa, alguien
   editó el skill por fuera y hay que traerlo al archivo primero. **Va después del paso 1**: el
   Rails viejo todavía pide los hallazgos como textos sueltos. En dev quedó aplicado y probado
   de punta a punta el 2026-10-15: cuenta con cerveza → `rule_id` de la regla del licor.
5. Reconfigurar las tres reglas del cliente como en §4.

## 6. Lo que queda abierto

- Los cambios a las listas de una regla (roles, personas, tipos) **no quedan en la auditoría
  de edición**, igual que los roles antes de esto. Las altas y bajas sí los registran completos.
- Borrar un tipo que era el único de "Solo estos tipos" de una regla **que no prohíbe** la deja
  aplicando a todos los tipos. Una prohibición, en cambio, deja de prohibir (§3).
- Juzgar al guardar suma hasta 18 s al Guardar en el peor caso (techo del invoke), solo cuando
  hay reglas con texto y nadie juzgó el comprobante.
- `db:migrate` corre `annotate` y borra comentarios escritos a mano en
  `documentation_file.rb` y `documentation_module.rb`: hay que revertirlos después de migrar.
- WhatsApp: el servidor sigue sin aplicar el veredicto semántico del agente (el agente decide);
  las prohibiciones sí las aplica el create.

*Documento escrito el 2026-10-15.*
