# Guía de configuración de las reglas de gastos

**Para quién es**: la persona de Controlmatica que va a ajustar las reglas de gastos **sin
depender del proveedor**. No hay que tocar código, ni base de datos, ni pedir un despliegue.

**Dónde se hace**: menú **Configuración → Reglas de gastos**.
Requiere el módulo **«Reglas de gastos»** habilitado en su rol.

---

## 0. Lo primero, en 30 segundos

Una **regla** es un conjunto de límites que se le aplica a un grupo de personas. Tiene dos
mitades y **no son intercambiables**:

| | Los tres límites **DETERMINISTAS** | Las instrucciones **SEMÁNTICAS** |
|---|---|---|
| Qué son | Antigüedad máxima, tope de valor, duplicados | Un texto libre |
| Dónde van | **Cada uno tiene su propio campo** en el formulario | El **cuadro de texto grande** del final |
| Quién las evalúa | **El sistema, siempre** | El **agente de WhatsApp**, cuando esté activo |
| Cuándo aplican | En **todos** los canales: web, WhatsApp e importación de Excel | **Solo** cuando el gasto entra conversando con el agente |

> 🔴 **La confusión que hay que evitar a toda costa**: escribir *"las facturas no pueden tener
> más de 30 días"* dentro del cuadro de texto en vez de ponerlo en el campo «Antigüedad
> máxima».
>
> **Qué pasa si lo hace**: un gasto registrado desde la web **deja de validarse por completo**
> y nadie se entera. La regla parece configurada, la pantalla la muestra, y no hace nada. Solo
> el agente de WhatsApp la aplicaría, y de forma aproximada.
>
> **La norma es simple: si el límite es un número o un sí/no, tiene campo propio. El cuadro de
> texto es solo para lo que hay que juzgar con criterio.**

Y la segunda:

> 🔴 **El multi-select de usuarios vacío significa NADIE, no «todos».**
> Ver §4. La pantalla se lo advierte de forma permanente, pero es la equivocación más cara de
> esta pantalla, así que va dos veces en este documento.

---

## 1. La pantalla

La lista de reglas tiene estas columnas:

| Columna | Qué muestra |
|---|---|
| **Nombre** | Con la etiqueta *Por defecto* si lo es |
| **Estado** | *Activa* / *Inactiva* |
| **Antigüedad máx.** | *"30 días"* o ***Sin límite*** |
| **Tope de valor** | *"$200.000"* o ***Sin tope*** |
| **Duplicados** | *Se validan* / *No se validan* |
| **Aplica a** | Los nombres de las personas, o ***Nadie*** / ***Todos (por defecto)*** |
| **Instrucciones para el agente** | El inicio del texto libre, o *—* |
| **Actualizada** | Fecha del último cambio |

Botones: **Nueva regla**, y por fila **Editar** y **Eliminar**.

---

## 2. Las cinco reglas de la propuesta y dónde vive cada una

La propuesta comprometió **cinco** reglas. Así se configuran hoy:

| # | Regla | Dónde se configura | Quién la evalúa |
|---|---|---|---|
| 1 | **Antigüedad del comprobante** | Campo **«Antigüedad máxima del comprobante»** | 🟢 El sistema, siempre |
| 2 | **Tope de valor por gasto** | Campo **«Tope de valor del comprobante»** | 🟢 El sistema, siempre |
| 3 | **Duplicados** | Casilla **«Validar duplicados»** | 🟢 El sistema, siempre |
| 4 | **Conceptos no permitidos** (licores, gastos personales, propinas…) | **Cuadro de texto** de instrucciones | 🟡 El agente de WhatsApp |
| 5 | **Coherencia entre lo declarado y el comprobante** | **Cuadro de texto** de instrucciones | 🟡 El agente de WhatsApp |

Las tres primeras son **verificables sin criterio**: una factura tiene 40 días o no los tiene.
Las dos últimas requieren interpretar (¿un almuerzo con un cliente es "gasto personal"?), y por
eso las evalúa el agente.

> 🔴 **Nota comercial, que conviene tener presente**: estas cinco reglas son las que están
> dentro del alcance contratado. **Cualquier regla adicional es alcance nuevo** y se cotiza
> aparte. No es una limitación técnica: es lo que se acordó.

---

## 3. Los campos del formulario, uno por uno

### 3.1 Nombre

Obligatorio. Ejemplos: *Regla general*, *Regla directivos*, *Regla campo Barranquilla*.

**No puede haber dos reglas ACTIVAS con el mismo nombre.** Sí puede reutilizar el nombre de
una regla inactiva: desactivar es la forma de archivar.

### 3.2 Activa

Desmarcarla **archiva** la regla: deja de aplicar, pero se conserva el histórico y la
auditoría. **Prefiera desactivar antes que eliminar.**

### 3.3 Es la regla por defecto

Marcarla hace que la regla aplique a **todo el que no tenga ninguna regla asignada
explícitamente**.

**Solo puede haber UNA regla por defecto activa a la vez.** Si intenta marcar una segunda, el
sistema se lo impide y le dice cuál es la que ya lo está.

Es la forma correcta de decir *"esto aplica a todos"*. Ver §4.

### 3.4 Antigüedad máxima del comprobante — DETERMINISTA

Un número de **días**. La factura se compara contra **la fecha de hoy**, no contra la fecha en
que se registró el gasto.

> Se mide así a propósito: si se midiera contra la fecha de registro, una factura de hace seis
> meses registrada hoy pasaría el filtro, que es exactamente lo que la regla quiere evitar.

- **Vacío = sin límite de antigüedad.** Ese es también el modo de **desactivar** esta regla.
- Si el gasto **no tiene fecha de factura**, no se evalúa. Un dato incompleto no es una
  infracción.
- El límite es **inclusivo hacia abajo**: con 30 días, una factura de exactamente 30 días
  **no** viola la regla; una de 31, sí.

Mensaje que produce: *"El comprobante tiene 40 días y el máximo son 30"*.

### 3.5 Tope de valor del comprobante — DETERMINISTA

Un monto en pesos. Se compara contra el **total del gasto** (valor + IVA).

- **Vacío = sin tope.** Es el modo de **desactivar** esta regla.
- **El tope es inclusivo**: un gasto de exactamente $200.000 con un tope de $200.000 **no**
  viola la regla. Un tope que rechaza el valor exacto es incomprensible para quien lo configura.
- Admite decimales. No hay límite práctico de magnitud.

Mensaje que produce: *"El valor supera el tope de $200.000"*.

### 3.6 Validar duplicados — DETERMINISTA

Casilla de sí/no. Marca el gasto cuando **ya existe otro** con el **mismo número de factura Y
el mismo NIT de proveedor**.

- **Los dos datos tienen que estar presentes.** Si el gasto no trae número de factura o no trae
  NIT, no se evalúa: con campos vacíos media base de datos sería "duplicada" entre sí.
- Al **editar** un gasto, el sistema no lo compara consigo mismo.
- **Desmarcarla** es el modo de desactivar esta regla.

Mensaje que produce: *"Ya existe el gasto #4312 con esa factura de ese proveedor"*.

### 3.7 Instrucciones para el agente — SEMÁNTICO

El cuadro de texto grande del final. **Escríbalo como se lo diría a una persona**:

> *"No se aceptan licores, ni gastos personales, ni propinas superiores al 10 %. Si la
> descripción no coincide con lo que muestra el comprobante, pregunta antes de registrar."*

Tres advertencias:

1. 🔴 **Aquí NO van reglas de fecha ni de monto.** Tienen sus campos propios (§3.4 y §3.5) y
   solo ahí las verifica el sistema.
2. **Solo aplica cuando el gasto entra conversando con el agente de WhatsApp.** Un gasto
   registrado desde la web **no se puede juzgar con este texto**: no hay nadie leyéndolo.
3. Es **opcional**. Una regla puede tener solo límites deterministas y funcionar perfectamente.

> ⚠️ **Estado actual**: el agente de WhatsApp todavía no está conectado, así que hoy este
> campo **se guarda y se muestra, pero no se aplica en ningún lado**. Puede dejarlo escrito
> desde ya; empezará a surtir efecto el día que el canal se conecte.

### 3.8 Usuarios a los que aplica

Ver la sección siguiente. Es lo más delicado de la pantalla.

---

## 4. 🔴 El multi-select vacío significa NADIE

**Dejar la lista de usuarios vacía NO quiere decir "aplica a todos". Quiere decir "no aplica a
nadie".**

La pantalla se lo advierte de forma **permanente** (el aviso está siempre visible, no solo
cuando la lista está vacía), y debajo le dice en texto: *"Actualmente no aplica a ninguna
persona"* o *"Aplica a N persona(s)"*. En la lista de reglas, esa regla sale con la etiqueta
amarilla **«Nadie»** en la columna *Aplica a*.

**Para que una regla aplique a todo el mundo, marque «Es la regla por defecto»** (§3.3). Esa
es la única forma.

### 4.1 Cómo decide el sistema qué regla le toca a una persona

Es una cadena de tres pasos, en este orden exacto:

```
1. ¿Esta persona está asignada explícitamente a alguna regla ACTIVA?
   SÍ  → se le aplican TODAS esas reglas (y la regla por defecto NO entra)
   NO  ↓
2. ¿Existe una regla ACTIVA marcada como "por defecto"?
   SÍ  → se le aplica esa
   NO  ↓
3. No se le aplica ninguna regla. Sin restricciones.
```

Consecuencia útil: **asignarle a alguien una regla propia lo saca de la regla por defecto**.
Es la forma de dar excepciones.

### 4.2 Cuando una persona tiene varias reglas: gana la más restrictiva

Si a alguien le tocan dos o más reglas, el sistema las combina así:

| Campo | Cómo se combina |
|---|---|
| Antigüedad máxima | **El número más pequeño** de los que estén puestos. *Sin límite* nunca gana a un número |
| Tope de valor | **El monto más pequeño** de los que estén puestos. *Sin tope* nunca gana a un número |
| Validar duplicados | Activo **si alguna** de las reglas lo pide |
| Instrucciones para el agente | Se **concatenan todas**, en orden alfabético del nombre de la regla |

**Ejemplo.** *Regla general*: 30 días, tope $500.000, duplicados sí. *Regla directivos*: sin
límite de días, tope $2.000.000, duplicados no. A alguien que tenga las dos le queda:
**30 días, tope $500.000, duplicados sí**.

> 🔴 **Léalo con cuidado: asignarle una regla adicional a alguien NUNCA le AFLOJA un control.**
> Si lo que quiere es darle a un directivo un tope más alto, **no le agregue** una regla
> permisiva: **quítele** la restrictiva y déjele solo la suya, o sáquelo de la lista de la
> restrictiva.
>
> Se eligió así porque la alternativa —que la regla más específica pisara a la general—
> permitiría relajar un control por descuido, que es justo lo contrario de lo que espera quien
> administra.

---

## 5. Qué pasa cuando un gasto viola una regla

Lo primero que hay que entender:

> **Una violación de regla NUNCA impide guardar el gasto.**

Es la misma filosofía que el presupuesto: bloquear a alguien que está en campo, con la factura
en la mano y el dinero ya gastado, no deshace el gasto — solo consigue que no lo reporte.

Lo que **sí** hace la violación:

1. El gasto **no puede quedar en estado presupuestal «Aprobado»**. Queda en *Sin presupuesto*,
   aunque tuviera cupo de sobra, y el cambio de estado sí queda en la auditoría del gasto.
2. El detalle de qué regla se incumplió **se guarda dentro del gasto**.
3. Si entró por WhatsApp, el agente **avisa y pide confirmación explícita** antes de registrarlo.
   La persona puede insistir y el gasto se crea, pero sin quedar aprobado.

Consecuencia práctica para contabilidad: un gasto que viola una regla **no se aprueba solo**.
Alguien tiene que mirarlo.

> ⚠️ 🔴 **Limitación conocida, y hay que saberla porque afecta el uso diario**: hoy **el motivo
> no se muestra en ninguna pantalla**. La columna de estado presupuestal solo pinta el motivo
> cuando el estado es *Excedido*; un gasto que quedó en *Sin presupuesto* **por una regla**
> muestra la etiqueta sin decir cuál regla lo marcó ni por qué. El dato está guardado en el
> gasto, pero no llega a la interfaz.
>
> **Mientras esto no se cierre, la forma de saberlo es deducirlo**: si un gasto tiene partida
> con cupo y aun así salió *Sin presupuesto*, fue una regla. Compare el gasto con los límites
> que le aplican a esa persona (§4.1). Está anotado como pendiente del proyecto y es un cambio
> pequeño.

---

## 6. Cómo desactivar cada cosa (tabla de referencia rápida)

| Quiero… | Cómo |
|---|---|
| Desactivar el control de antigüedad | Dejar **vacío** el campo de días |
| Desactivar el tope de valor | Dejar **vacío** el campo de monto |
| Desactivar el control de duplicados | **Desmarcar** la casilla |
| Desactivar las instrucciones semánticas | **Vaciar** el cuadro de texto |
| Desactivar una regla entera | **Desmarcar «Activa»** (la archiva, conserva el histórico) |
| Que una regla no aplique a nadie por ahora | Vaciar la lista de usuarios **y** desmarcar «Es la regla por defecto» |
| Que una regla aplique a todos | Marcar **«Es la regla por defecto»** |
| Sacar a una persona de la regla general | Asignarle **su propia regla** (aunque sea sin límites) |
| Eliminar el sistema de reglas por completo | Desactivar **todas** las reglas. Sin reglas activas, ningún gasto se evalúa |

---

## 7. Cómo comprobar que una regla nueva funciona

Cinco minutos, sin ayuda de nadie:

1. Cree una regla llamada *Prueba*, con **Tope de valor = $1.000** y asígnesela **a usted
   mismo**. Guarde.
2. Verifique en la lista que la columna *Aplica a* muestra **su nombre**, no «Nadie».
3. Registre un gasto suyo por **$50.000**.
4. El gasto **se guarda** (eso es correcto) y queda en estado presupuestal **Sin presupuesto**,
   aunque tenga partida con cupo. Ese es el efecto de la regla. *(Recuerde la limitación de §5:
   la pantalla no le va a decir cuál regla fue.)*
5. **Desactive** la regla *Prueba*. Edite el gasto sin cambiar nada y guárdelo: ahora sí queda
   **Aprobado**. Ese ida y vuelta es la comprobación de que la regla era la causa.

Si el paso 4 no ocurre, revise en este orden: (a) la regla está **Activa**; (b) usted está en
la lista de usuarios o la regla es la **por defecto**; (c) no hay otra regla suya con un tope
más alto que **no** sea la que está mirando — recuerde que gana la más restrictiva y no la más
reciente.

---

## 8. Preguntas frecuentes

**«Configuré la regla y no pasa nada.»**
Nueve de cada diez veces es la lista de usuarios vacía sin marcar «Es la regla por defecto».
Ver §4.

**«Escribí la regla de los 30 días en el cuadro de texto y no funciona.»**
Correcto: ese cuadro solo lo lee el agente de WhatsApp, y hoy ni siquiera está conectado. La
antigüedad tiene **campo propio**. Ver §0 y §3.4.

**«Le puse una regla con tope alto a un directivo y le sigue aplicando el tope bajo.»**
Gana la más restrictiva. Hay que **quitarlo** de la regla restrictiva, no agregarle una
permisiva. Ver §4.2.

**«¿Puedo tener dos reglas por defecto?»**
No. El sistema lo impide y le dice cuál es la que ya está marcada.

**«Necesito una regla que hoy no existe (por ejemplo, por centro de costos o por categoría).»**
Está fuera del alcance contratado. Se cotiza aparte. Ver §2.

**«¿Puedo agregar una moneda nueva?»**
No desde ninguna pantalla. Agregar una moneda al catálogo (hoy: COP, USD, EUR) es un cambio
pequeño en el sistema, de una sola línea, pero requiere un despliegue. No es una configuración.

**«¿Las reglas aplican a los gastos que ya estaban registrados?»**
No de forma retroactiva. Se evalúan cuando el gasto se crea o se edita. Si quiere reevaluar
gastos viejos, hay que editarlos y guardarlos.

**«¿Dónde queda el registro de quién cambió una regla?»**
En la auditoría del sistema, bajo el módulo *Reglas de gastos*, con el valor anterior y el
nuevo de cada campo.

---

## Anexo — Nota para quien mantenga este documento

Este apartado es el único con detalle técnico, y está aquí porque la especificación original
del proyecto describía otra cosa y alguien lo va a comparar:

> **La configuración de las reglas NO vive en la tabla `parameterizations`.** La especificación
> del paquete 10 lo planteaba así, con una fila por palabra prohibida, un prefijo
> `"GASTOS IA - CONCEPTO NO PERMITIDO - "` y un sentinela `(NINGUNO)` para desactivar. **Nada
> de eso existe en el sistema entregado**, y no hay ninguna tarea rake
> `parameterizations_gastos_ia:install`.
>
> El diseño final lo aporta el paquete 14: una **tabla propia de reglas** con su pantalla de
> administración, campos tipados y asignación por persona. Es estrictamente mejor que la
> alternativa —`parameterizations` solo tiene `nombre`, un entero y un monto entero, así que no
> podía guardar ni una lista de conceptos ni un texto libre— y además permite reglas distintas
> para personas distintas, que con `parameterizations` era imposible.
>
> **Cualquier instrucción que mencione `parameterizations`, el prefijo de conceptos o el
> sentinela `(NINGUNO)` está obsoleta.** Manda este documento.
