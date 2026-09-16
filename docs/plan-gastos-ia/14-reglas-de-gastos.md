# Paquete 14 — Reglas de gastos configurables por usuario

> **Sustituye** el diseño de reglas que el paquete 10 dejaba en `parameterizations`.
> Decisión del cliente (2026-08-10): las reglas van en **tabla propia**, con registros múltiples,
> y **cada regla aplica a un conjunto de usuarios**, para poder tener reglas distintas por persona.

---

## Objetivo

Una pantalla donde se crean reglas de gasto y se asignan a usuarios. Cada regla mezcla dos
naturalezas distintas, y esa separación es la idea central del diseño:

- **Reglas deterministas** — las verifica **el código**, siempre, sin importar por dónde entre el
  gasto. Antigüedad máxima del comprobante, tope de valor, duplicados. No se le consultan a ningún
  modelo porque no hay nada que interpretar: o la factura tiene 40 días o no los tiene.
- **Regla semántica** — un texto libre que se le pasa **al agente de Taimes** para que lo aplique
  con criterio: *"no se aceptan licores, ni gastos personales, ni propinas superiores al 10%"*.
  Eso sí requiere juicio y no se puede escribir como una comparación.

La consecuencia de peso: **un gasto que entre por la web se valida con las mismas reglas
deterministas que uno que entre por WhatsApp**, porque viven en el servidor. Lo semántico solo
aplica cuando hay agente, y eso es correcto: nadie va a leerle la mente a un formulario.

---

## Dependencias

- **02** (esquema) — o la migración va aquí si el 02 ya está mergeado. Ver Tarea 1.
- **01** (infraestructura de pruebas).
- **07** para el patrón de permisos y rutas.
- El paquete **11** consume `ExpenseRuleService` en el guard de las tools MCP.
- El paquete **10** pierde su motor de reglas: aquí vive ahora. Su `ReceiptExtractionService`
  no se toca.

---

## Modelo de datos

### Tabla `expense_rules`

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `name` | string | no | "Regla general", "Regla directivos" |
| `active` | boolean | no, default `true` | Desactivar sin borrar, para no perder el histórico |
| `is_default` | boolean | no, default `false` | La que aplica a quien no tiene regla asignada |
| `max_invoice_age_days` | integer | sí | Determinista. `nil` = sin límite de antigüedad |
| `max_invoice_value` | decimal(15,2) | sí | Determinista. `nil` = sin tope |
| `check_duplicates` | boolean | no, default `true` | Determinista. Mismo `invoice_number` + `identification` |
| `agent_instructions` | text | sí | **Semántica.** Texto libre para el agente |
| `user_id` | integer | sí | Quién la creó |
| `last_user_edited_id` | integer | sí | Consistente con el resto del sistema |

Índices: `active`, `is_default`.

**Solo puede haber una regla con `is_default = true` y `active = true`.** Se valida en el modelo y
se refuerza con un índice único parcial (`WHERE is_default AND active`).

### Tabla puente `expense_rules_users`

HABTM sin modelo, igual que `accion_modules_rols` que ya existe en el repo.

| Columna | Tipo |
|---|---|
| `expense_rule_id` | integer, index |
| `user_id` | integer, index |

Índice único compuesto `(expense_rule_id, user_id)`.

---

## Resolución: qué regla aplica a quién

Esta es la parte que hay que tener clara, porque es donde se cometen los errores.

```
reglas_de(usuario) =
  reglas activas asignadas explícitamente al usuario
  ├─ si hay al menos una → esas
  └─ si no hay ninguna   → la regla default activa (si existe)
                           └─ si tampoco existe → sin restricciones
```

**Un usuario puede tener varias reglas asignadas.** Cuando eso pasa:

- **Deterministas: gana la más restrictiva.** El `max_invoice_age_days` efectivo es el **mínimo**
  de los no nulos; el `max_invoice_value` efectivo es el **mínimo** de los no nulos;
  `check_duplicates` queda activo si **alguna** lo pide.
- **Semánticas: se concatenan** todas las `agent_instructions` no vacías, en orden de `name`, cada
  una en su propio párrafo.

> **Asumido:** la más restrictiva gana. La alternativa —que la regla más específica sobrescriba a
> la general— permite que asignar una regla *afloje* un control, que es justo lo contrario de lo
> que espera quien administra. Si el cliente prefiere lo otro, es un cambio de una función.

---

## `ExpenseRuleService`

`app/services/expense_rule_service.rb`. Es el **único** lugar donde se evalúan reglas.

```ruby
# Devuelve un Result con la forma canónica del proyecto (ok?, value, errors).
ExpenseRuleService.validate(expense, user: nil)
```

- `expense` puede ser un `ReportExpense` persistido o uno nuevo sin guardar (el agente valida
  **antes** de crear). Si no se pasa `user`, se usa `expense.user_invoice`.
- Devuelve:

```ruby
{
  ok: true/false,
  violations: [                       # solo deterministas
    { rule: "Regla general", code: "invoice_too_old",
      message: "El comprobante tiene 45 días y el máximo son 30" }
  ],
  agent_instructions: "…texto concatenado…",  # para que el agente lo aplique
  applied_rules: ["Regla general"]
}
```

### Códigos de violación (deterministas)

| `code` | Cuándo | Mensaje |
|---|---|---|
| `invoice_too_old` | `invoice_date` anterior a `hoy - max_invoice_age_days` | "El comprobante tiene N días y el máximo son M" |
| `invoice_value_exceeded` | `invoice_total` > `max_invoice_value` | "El valor supera el tope de $X" |
| `duplicate_invoice` | Existe otro gasto con el mismo `invoice_number` **e** `identification`, distinto id | "Ya existe el gasto #N con esa factura de ese proveedor" |

Notas de implementación que evitan errores tontos:

- **`invoice_date` nula → no se evalúa la antigüedad.** No se inventa una fecha ni se rechaza.
- La antigüedad se mide contra `Date.current`, no contra `created_at`: lo que importa es qué tan
  vieja es la factura hoy, no cuándo se registró.
- El chequeo de duplicados **excluye el propio registro** (`where.not(id: expense.id)` cuando ya
  está persistido), o al editar un gasto se acusaría a sí mismo.
- Duplicado **solo** cuando `invoice_number` **e** `identification` están ambos presentes. Con
  campos vacíos, media base de datos sería "duplicada".

---

## Efecto de las violaciones

**Las reglas NO bloquean el registro del gasto.** Es la misma filosofía que la aprobación
presupuestal: el gasto se guarda siempre, pero queda marcado. Bloquear al usuario en campo, con la
factura en la mano, solo consigue que no reporte.

- Web: el formulario muestra las violaciones como advertencia; el usuario puede guardar igual.
- MCP / agente: la tool devuelve las violaciones para que el agente se las diga a la persona y
  pida confirmación antes de guardar.
- El gasto que viola una regla **no puede quedar aprobado automáticamente** por presupuesto:
  `budget_status` se fuerza a no aprobado y el motivo incluye la violación.

---

## Tareas

**1. Migración `create_expense_rules`** — las dos tablas, índices, y el índice único parcial de
`is_default`. `up`/`down`, nunca `change`, igual que el resto del proyecto.

**2. Modelo `ExpenseRule`** (`app/models/expense_rule.rb`):
- `has_and_belongs_to_many :users`, `belongs_to :user, optional: true`,
  `belongs_to :last_user_edited, class_name: "User", optional: true`.
- Validaciones: `name` presente y único entre activas; `max_invoice_age_days` y
  `max_invoice_value` positivos si están presentes; solo una default activa.
- `scope :activas`, `scope :para_usuario(user)`.
- `self.aplicables_a(user)` que implementa la resolución de arriba.
- Auditoría con el concern `RegisterAuditable` del paquete 03, módulo `"Reglas de gastos"`.

**3. `ExpenseRuleService`** con la firma y el `Result` de arriba.

**4. Enganche en la creación/edición de gastos** — en el mismo punto donde el paquete 07 cablea
`ExpenseBudgetService`. Las violaciones se guardan para poder mostrarlas: agregar a
`report_expenses` la columna `rule_violations` (jsonb, default `[]`).

**5. Controlador, rutas y permisos** — `ExpenseRulesController` con CRUD, siguiendo el estilo de
`config/routes.rb`. Módulo de permisos nuevo `"Reglas de gastos"` con acciones Ingreso al modulo /
Crear / Editar / Eliminar, creado con el mismo mecanismo que usa el paquete 07 para los suyos.

**6. Frontend** — pantalla bajo Configuración, con `CmDataTable` y un formulario que tenga:
- nombre, activa, es la regla por defecto;
- **antigüedad máxima en días** (numérico) y **tope de valor** (moneda), ambos vacíos = sin límite;
- **validar duplicados** (switch);
- **instrucciones para el agente** (textarea, con la ayuda: *"esto se le pasa al agente de WhatsApp
  para que lo interprete; escríbelo como se lo dirías a una persona"*);
- **usuarios a los que aplica**: multi-select. Dejarlo vacío no significa "todos" — significa
  "ninguno", y hay que decirlo en la interfaz, porque es la confusión obvia. Para "todos" está el
  switch de regla por defecto.

Componentes de clase React 16, como el resto del repo.

**7. Tool MCP `expense_rules_for_user`** (dueño del archivo: paquete 11, coordinar) que devuelve
las reglas aplicables a un usuario: los límites deterministas ya resueltos y el texto semántico,
para que el agente lo tenga antes de conversar.

---

## Pruebas unitarias

`test/models/expense_rule_test.rb`
1. Nombre obligatorio.
2. No se pueden tener dos reglas default activas.
3. Sí se puede tener una default activa y otra default inactiva.
4. `max_invoice_age_days` negativo es inválido.
5. `aplicables_a` devuelve las asignadas cuando el usuario tiene.
6. `aplicables_a` cae a la default cuando el usuario no tiene ninguna.
7. `aplicables_a` devuelve vacío cuando no hay asignadas ni default.
8. `aplicables_a` ignora las inactivas.

`test/services/expense_rule_service_test.rb`
9. Comprobante dentro del plazo → sin violaciones.
10. Comprobante vencido → violación `invoice_too_old` con los días reales en el mensaje.
11. `invoice_date` nula → no evalúa antigüedad, no revienta.
12. Valor por encima del tope → `invoice_value_exceeded`.
13. Valor exactamente igual al tope → **no** viola (el tope es inclusivo).
14. Duplicado con mismo número y NIT → `duplicate_invoice`.
15. Mismo número pero distinto NIT → no es duplicado.
16. Al editar un gasto, no se acusa a sí mismo de duplicado.
17. `invoice_number` vacío → no se evalúa duplicados.
18. `check_duplicates = false` → no se evalúa aunque haya duplicado.
19. Dos reglas con antigüedades 30 y 15 → aplica 15 (la más restrictiva).
20. Dos reglas, una con tope nulo y otra con tope → aplica el que existe.
21. `check_duplicates` activo si alguna de las reglas lo pide.
22. Las `agent_instructions` de varias reglas se concatenan en orden de nombre.
23. Usuario sin reglas y sin default → `ok: true`, sin violaciones.
24. Un gasto con violación no queda aprobado por presupuesto aunque quepa en la partida.

`test/controllers/expense_rules_controller_test.rb`
25. Sin permiso no se entra al módulo.
26. Con permiso de sólo lectura no se puede crear.
27. Crear una regla asignando usuarios persiste la relación.
28. Editar quita y agrega usuarios correctamente.
29. Crear una segunda regla por defecto falla con mensaje claro.
30. Toda operación deja registro en `RegisterEdit`.

---

## Pruebas E2E (Playwright)

1. Un administrador crea una regla con 30 días de antigüedad y se la asigna a un usuario.
2. Ese usuario registra un gasto con factura de hace 45 días → se guarda, aparece la advertencia
   con el motivo, y el gasto **no** queda aprobado.
3. El mismo usuario registra un gasto de hace 5 días que cabe en su partida → aprobado, sin
   advertencias.
4. Se intenta crear una segunda regla por defecto → la interfaz lo impide con un mensaje entendible.

---

## Criterios de aceptación

- [ ] Se pueden crear varias reglas y asignar cada una a varios usuarios.
- [ ] Un usuario con dos reglas queda sujeto a la más restrictiva de cada límite.
- [ ] Un usuario sin reglas asignadas queda sujeto a la regla por defecto, si existe.
- [ ] Las tres reglas deterministas se evalúan **en el servidor**, y aplican igual a un gasto
      creado por la web que a uno creado por MCP.
- [ ] El texto semántico no se evalúa en el servidor: se expone para que lo aplique el agente.
- [ ] Cada regla decide qué pasa al incumplirse (`mandatory`, 2026-09-15): si es obligatoria, el
      gasto **no se guarda** —igual por la web que por MCP, y sin confirmación que lo permita—;
      si no lo es, el gasto se guarda, la violación queda anotada y **no queda aprobado**.
      *(Este criterio decía «una violación nunca impide guardar»: fue cierto hasta la adenda A.2,
      que las volvió todas duras, y ahora depende de la regla. Ver ESTADO.md §C.1.)*
- [ ] Todas las operaciones sobre reglas quedan en el registro de edición.
- [ ] Las 30 pruebas unitarias y los 4 escenarios E2E pasan.

---

## Riesgos y trampas

1. **El multi-select vacío.** Quien administre va a asumir que "sin usuarios" significa "todos".
   Significa lo contrario. Hay que decirlo en la interfaz, no en un manual.
2. **La antigüedad se mide contra `Date.current`.** Si se mide contra `created_at`, un gasto viejo
   registrado tarde pasa el filtro, que es exactamente el fraude que la regla quiere evitar.
3. **El duplicado que se acusa a sí mismo.** Al editar, si no se excluye el propio `id`, todo gasto
   editado se marca como duplicado.
4. **Reglas deterministas en el prompt del agente.** Si alguna se le pasa al modelo como texto, un
   gasto por la web deja de validarse y aparece la asimetría entre canales. Lo determinista se
   queda en el servidor, siempre.
