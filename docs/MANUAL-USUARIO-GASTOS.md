# Manual de usuario — Presupuesto de viáticos y gastos

**Para quién es**: personas que asignan presupuesto, registran gastos o los revisan en
contabilidad. No hace falta saber nada de sistemas para leerlo.

**Qué cubre**: las cuatro cosas nuevas del sistema — el **presupuesto de viáticos**, el
**gasto con comprobante adjunto**, el **gasto en moneda extranjera** y la **pantalla de
Contabilidad** — más el Excel de exportación e importación.

> Si algo de lo que aquí se describe no aparece en su pantalla, casi siempre es un tema de
> **permisos**, no un error: el sistema oculta lo que su rol no puede usar. Pídaselo al
> administrador antes de reportar una falla.

---

## Índice

1. [El presupuesto de viáticos](#1-el-presupuesto-de-viáticos)
2. [Los tres estados de un gasto](#2-los-tres-estados-de-un-gasto-y-por-qué-son-independientes)
3. [El gasto excedido](#3-el-gasto-excedido-se-guarda-igual)
4. [Adjuntar el comprobante](#4-adjuntar-el-comprobante)
5. [Gastos en moneda extranjera](#5-gastos-en-moneda-extranjera)
6. [Captura asistida del comprobante](#6-captura-asistida-del-comprobante)
7. [La pantalla de Contabilidad](#7-la-pantalla-de-contabilidad)
8. [Exportar e importar Excel](#8-exportar-e-importar-excel)
9. [Preguntas que se repiten](#9-preguntas-que-se-repiten)

---

## 1. El presupuesto de viáticos

### 1.1 Qué es una partida

Una **partida** es el cupo de viáticos que una persona tiene asignado dentro de **un centro
de costos**. Se lee así:

> *"A Juan Pérez se le asignaron $2.000.000 de viáticos en el centro de costos CC-104."*

Tres cosas que conviene tener claras desde el principio:

- La partida vive **dentro de un centro de costos**. La misma persona puede tener una partida
  en un centro y ninguna en otro. Son cupos independientes; no se prestan entre sí.
- Una persona puede tener **varias partidas** en el mismo centro (por ejemplo, una ampliación
  aprobada en mitad del proyecto). El sistema suma todas las partidas activas de esa persona
  en ese centro para saber cuánto tiene.
- La suma de todas las partidas de un centro **no puede superar el valor de viáticos cotizado**
  para ese centro. Si intenta asignar más, el botón de guardar se deshabilita y aparece el
  motivo. No es un descuido: es el tope que se le cotizó al cliente.

### 1.2 Quién la asigna

Quien tenga el módulo **Presupuesto** habilitado en su rol. Típicamente el gerente de
proyecto o el administrador. Sin ese permiso la pestaña **Presupuesto** ni siquiera aparece
dentro del centro de costos.

### 1.3 Dónde se ve

Entre a **Centros de costo → (abra el centro) → pestaña Presupuesto**.

La pestaña tiene tres partes:

**a) El tablero**, con dos tarjetas y seis cifras:

| Tarjeta | Cifra | Qué significa |
|---|---|---|
| **Asignación** | Cotizado | El valor de viáticos que trae el centro de costos. Es el techo de todo |
| | Asignado | La suma de todas las partidas activas del centro |
| | Sin asignar | Cotizado − Asignado |
| | Gastado sin partida | Lo aceptado que ninguna partida cubre. Solo aparece si hay algo |
| | Disponible para asignar | Sin asignar − Gastado sin partida. **Es el tope real de una partida nueva**. Solo aparece si hay gasto sin partida |
| **Ejecución** | Gastado | La suma de los gastos del centro que **sí** consumen presupuesto |
| | Disponible | Asignado − Gastado. **Si sale en rojo, está en negativo** |
| | Excedidos | Cuántos gastos del centro quedaron marcados como excedidos |

> **Si el centro de costos no tiene valor de viáticos cotizado**, el tablero se lo advierte y
> **no se puede asignar ninguna partida**. Primero hay que cotizar los viáticos del centro.

**b) La tabla por persona**, con las mismas cifras desglosadas: asignado, gastado, disponible,
cuántas partidas tiene y cuántos gastos excedidos.

Aparecen ahí **también las personas que gastaron en el centro sin tener partida asignada**. Es
a propósito: ese es justamente el caso que hay que ver.

**c) La tabla de partidas**, donde se crean, editan y anulan.

### 1.4 Por qué el disponible puede aparecer reducido desde el primer día

Esta es la pregunta número uno cuando alguien abre la pestaña por primera vez, así que va
antes que ninguna otra:

> 🔴 **Los gastos que ya estaban registrados en el sistema ANTES de que existiera el
> presupuesto también consumen la partida.**

Es decir: usted asigna $2.000.000 a una persona, entra al tablero y ve $1.350.000 disponibles.
No hay ningún error. Esa persona ya tenía $650.000 en gastos registrados en ese centro de
costos, y el sistema los está descontando.

**Se decidió así por una razón concreta**: si los gastos históricos no consumieran presupuesto,
el cupo del primer mes sería ficticio y el control no serviría para nada hasta el mes siguiente.

**Qué hacer si le estorba**: no hay una perilla para apagarlo. Lo que se hace es asignar la
partida **por el monto que falta**, no por el monto total del periodo. Si esa política no es la
que quiere Controlmatica, hay que decirlo: es una decisión que se puede cambiar, pero se cambia
en el sistema, no gasto por gasto.

### 1.5 Con IVA o sin IVA

El presupuesto se controla contra el **valor del gasto SIN IVA**.

Un gasto de $119.000 ($100.000 + $19.000 de IVA) consume **$100.000** de la partida. El IVA se
registra y se exporta, pero no descuenta cupo.

### 1.6 Crear una partida

1. Pestaña **Presupuesto** → botón **Nueva partida**.
2. Elija el **beneficiario** (la persona a la que se le asigna).
3. Escriba el **monto**.
4. Guardar.

Mientras escribe el monto, el formulario le va diciendo cuánto queda **disponible para
asignar** en el centro. Si se pasa del tope, **el botón Guardar se deshabilita** y aparece el
mensaje con el excedente exacto. Si asigna exactamente lo que queda disponible, sí se puede
guardar.

> 🔴 **Lo que ya se gastó sin partida que lo cubra también sale del cotizado.** Un gasto
> aceptado consume presupuesto aunque la persona no tuviera partida asignada: esa plata ya
> salió y no se puede volver a repartir.
>
> Ejemplo: centro con $1.010.750 cotizados, $0 repartido en partidas y $312.392 en gastos ya
> aceptados de alguien sin partida. Lo máximo que puede asignar es **$698.358**.
>
> **Los gastos que todavía nadie ha aceptado no reservan nada**: para Controlmatica siguen
> siendo plata libre y no bajan el disponible. Empiezan a pesar cuando alguien los acepta.

El sistema nunca cuenta dos veces la misma plata: si una persona tiene $400.000 de partida y
$300.000 gastados dentro de ella, el centro tiene comprometidos $400.000, no $700.000. Lo que
se suma es lo mayor de los dos, persona por persona. Y el cupo que le sobra a una persona no
cubre lo que otra gastó de más, porque las partidas no se prestan entre beneficiarios.

Bajar el monto de una partida que ya existe siempre se puede, aunque el gasto sin partida haya
dejado el disponible por debajo de lo ya repartido. Lo que se bloquea es subirla.

### 1.7 Editar y anular una partida

- **Editar** cambia el monto. Al hacerlo, el sistema **vuelve a evaluar todos los gastos** de
  esa persona en ese centro, del más antiguo al más reciente. Consecuencia importante: **subir
  una partida puede rescatar gastos que estaban excedidos, y bajarla puede empujar a excedido
  gastos que estaban aprobados**. Es correcto y es intencional.
- **Anular** desactiva la partida sin borrarla: deja de contar para el cupo, pero se conserva
  el histórico y la auditoría de quién la creó y quién la anuló.

Todo movimiento de partida queda registrado en la auditoría del sistema, con el valor anterior
y el nuevo.

---

## 2. Los tres estados de un gasto (y por qué son independientes)

Un gasto tiene **tres estados que no se miran entre sí**. Confundirlos es el origen de casi
todas las dudas, así que vale la pena leerlo despacio.

| # | Estado | Valores | ¿Quién lo cambia? |
|---|---|---|---|
| 1 | **Aceptación operativa** | Creado / Aceptado | Una persona, desde la lista de gastos |
| 2 | **Estado presupuestal** | Sin presupuesto / Aprobado / Excedido | 🔴 **El sistema. Nadie lo cambia a mano** |
| 3 | **Aprobación contable** | Pendiente / Aprobado | Contabilidad, desde su propia pantalla |

### 2.1 Aceptación operativa

Es el visto bueno de quien supervisa el gasto en campo: *"sí, este gasto lo hizo esta persona
y estaba autorizado"*. Se cambia desde la lista de gastos, uno por uno o de forma masiva.

No tiene ninguna relación con el presupuesto ni con contabilidad.

### 2.2 Estado presupuestal

Lo calcula el sistema **cada vez que un gasto se crea, se edita o se borra**, y cada vez que
se toca una partida. Sus tres valores:

- **Aprobado** — había partida y el gasto cabía en el disponible.
- **Excedido** — había partida, pero el gasto **no cabía**. El mensaje dice por cuánto se pasó.
- **Sin presupuesto** — no había ninguna partida contra la cual evaluarlo (esa persona no tiene
  partida en ese centro), o al gasto le falta el centro o el responsable.

> 🔴 **Este estado no se edita.** No hay ningún campo en ningún formulario que lo cambie, y si
> alguien intenta forzarlo desde afuera el sistema lo ignora y vuelve a calcularlo. Es
> deliberado: es la única forma de que la cifra del tablero sea confiable.

**El orden de llegada importa.** El disponible se consume por orden de registro. Si dos gastos
compiten por el último pedazo de cupo, gana el que entró primero.

### 2.3 Aprobación contable

Es el visto bueno del área contable, y es lo último que ocurre. Vive en la pantalla de
Contabilidad y guarda quién aprobó y cuándo.

### 2.4 Las combinaciones que se ven en la práctica

| Aceptación | Presupuestal | Contable | Cómo leerlo |
|---|---|---|---|
| Creado | Sin presupuesto | Pendiente | Gasto recién registrado de alguien sin partida. Normal |
| Creado | Aprobado | Pendiente | Registrado y con cupo. Falta el visto bueno operativo |
| Aceptado | Aprobado | Pendiente | Listo para que contabilidad lo revise |
| Aceptado | Aprobado | Aprobado | Cerrado |
| Aceptado | **Excedido** | Pendiente | Se pasó del cupo. **No aparece en la pantalla de Contabilidad** |
| Aceptado | **Excedido** | Aprobado | Estaba aprobado y una reducción de partida lo empujó a excedido. Ver §7.4 |
| Creado | Aprobado | Aprobado | Contabilidad aprobó algo que operaciones todavía no aceptó. Posible, pero conviene revisarlo |

---

## 3. El gasto excedido se guarda igual

**Un gasto que se pasa del presupuesto SE GUARDA.** El sistema no lo rechaza, no lo borra y no
le pide que lo corrija.

La razón es práctica: la persona que registra el gasto suele estar en campo, con la factura en
la mano y el dinero ya gastado. Bloquearla no deshace el gasto — solo consigue que no lo
reporte, y entonces el gasto existe igual pero nadie lo ve.

Lo que sí hace el excedido:

- El gasto queda marcado **Excedido**, con el mensaje *"Excede el presupuesto disponible en
  $X"*.
- **Sale de la pantalla de Contabilidad** (ver §7.2), así que no se puede aprobar sin resolverlo.
- Suma en el contador de **Excedidos** del tablero de presupuesto.

**Qué hacer con un gasto excedido**, en orden:

1. **Verifique que el gasto sea correcto.** A veces el excedido es un valor mal digitado.
2. **Verifique que esté en el centro de costos correcto** y a nombre del responsable correcto.
   Un gasto en el centro equivocado consume el cupo equivocado.
3. Si el gasto es legítimo, **amplíe la partida** de esa persona en ese centro. En cuanto
   guarde la ampliación, el sistema vuelve a evaluar los gastos y el excedido pasa a
   **Aprobado** solo. No hay que tocar el gasto.
4. Si no se va a ampliar la partida, el gasto se queda excedido. Es información válida: dice
   que se gastó por encima de lo presupuestado.

---

## 4. Adjuntar el comprobante

Cada gasto admite **un archivo** de comprobante (la factura, el recibo, la foto del tirilla).

### 4.1 Qué se puede subir

| | |
|---|---|
| **Formatos** | JPG, JPEG, PNG, WEBP, HEIC (fotos de iPhone) y PDF |
| **Tamaño** | Entre 1 byte y **10 MB** |

Si el archivo no cumple, el sistema lo rechaza al guardar y le dice por qué. **Un archivo de
0 bytes también se rechaza**: es el caso en que uno cree que adjuntó algo y no adjuntó nada.

> Los archivos que no están en la lista se rechazan **por extensión y también por contenido**.
> Renombrar un archivo para colarlo no funciona.

### 4.2 Cómo se adjunta

En el formulario de gasto (tanto el del listado general de Gastos como el de la pestaña de
gastos del centro de costos) hay un campo **Comprobante**. Seleccione el archivo y guarde el
gasto. El comprobante viaja con el gasto: no hay un paso de "subir" aparte.

### 4.3 Previsualizar, descargar y quitar

En la tabla de gastos, la fila del gasto trae un enlace al comprobante:

- **Previsualizar**: abre una ventana con el documento sin salir de la pantalla.
- **Descargar**: baja el archivo a su computador.
- **Quitar**: en el formulario de edición del gasto hay un botón para eliminar el comprobante
  actual. Se borra al guardar.

> ⚠️ **Si al previsualizar el archivo se le descarga en vez de mostrarse**, no es un error de
> su navegador. Los comprobantes se entregan siempre como descarga por seguridad, y algunos
> navegadores no los pintan dentro de la ventana. En ese caso la ventana le muestra el aviso
> *"No se pudo previsualizar el comprobante. Intente descargarlo"* y el enlace de descarga
> siempre funciona.

### 4.4 Sobre la privacidad de los comprobantes

Una factura tiene NIT, valores y nombre de proveedor, así que **el enlace al comprobante no es
público ni permanente**: se genera en el momento del clic y caduca a los pocos minutos. No
sirve copiar la dirección y mandarla por correo — hay que entrar al sistema.

---

## 5. Gastos en moneda extranjera

### 5.1 Monedas disponibles

**COP (peso colombiano), USD (dólar) y EUR (euro).** COP es el valor por defecto y, mientras
no cambie el selector de moneda, el formulario se comporta exactamente como siempre.

Agregar una moneda nueva al catálogo **no es una configuración**: hay que pedirlo como un
cambio al sistema. Es rápido, pero no lo puede hacer un administrador desde la pantalla.

### 5.2 Cómo se registra

Al elegir USD o EUR aparece un bloque nuevo con:

| Campo | Qué escribir |
|---|---|
| **Valor en USD / EUR** | El valor del gasto, sin IVA, en la moneda de la factura |
| **IVA en USD / EUR** | El IVA, en la moneda de la factura |
| **Total en USD / EUR** | Se calcula solo. No se escribe |
| **TRM** | La tasa. **El sistema la trae sola** — ver abajo |
| **Fecha de la tasa** | Se llena sola con la fecha de la tasa que se aplicó |
| **Equivalente en COP** | Se calcula solo: total en moneda × TRM |

### 5.3 De dónde sale la tasa

El sistema consulta la tasa oficial del **día de la factura** (no del día en que usted registra
el gasto). Para el dólar consulta la TRM oficial colombiana; para el euro, la tasa del Banco
Central Europeo.

También hay un botón **Recalcular** que vuelve a pedir la TRM y convierte el valor a COP. Si falta la fecha de la factura o el valor en la moneda extranjera, el formulario le dice cuál falta. Si cambia la moneda después de escribir el valor, el valor se conserva y se recalcula con la nueva moneda.

Debajo del bloque aparece el estado de la consulta:

| Lo que dice | Qué significa |
|---|---|
| *Consultando la tasa…* | Está buscándola. Tarda un par de segundos |
| *Tasa de 2026-08-11 (…)* | Encontró la tasa exacta del día de la factura. Todo bien |
| **🟡 *No hay tasa para el 2026-08-09; se aplicó la del 2026-08-08*** | Ver abajo |
| *Tasa ingresada manualmente* | La escribió usted, no el sistema |

### 5.4 El aviso *"no hay tasa para el X; se aplicó la del Y"*

**No es un error y no hay que corregirlo.** Significa que el día de la factura era **sábado,
domingo o festivo**, y esos días no se publica tasa oficial. El sistema aplica la última tasa
publicada antes de esa fecha, que es exactamente lo que hace la norma contable.

El aviso está ahí para que usted lo sepa, no para que haga algo. Si el desfase le parece
demasiado grande (por ejemplo, una semana), revise que la fecha de la factura esté bien escrita.

### 5.5 Cuándo el valor en pesos pasa a ser "manual"

Hay dos formas de que el valor quede en modo manual:

1. **La consulta de la tasa falla** (sin internet, la fuente caída, o el día pedido es futuro).
   El sistema **no inventa** una tasa: le pide que la escriba usted. En cuanto la escribe, el
   gasto queda marcado como tasa manual.
2. **Usted ajusta el equivalente en COP a mano.** Debajo del bloque hay una casilla:
   **«Ajusté el valor en COP a mano (no recalcular)»**.

> 🔴 **Si ajusta el valor en pesos a mano, MARQUE esa casilla.** Sin marcarla, el sistema
> recalcula el equivalente en cada guardado (valor extranjero × TRM) y **pisa en silencio** lo
> que usted escribió. Con la casilla marcada, respeta su cifra y no la vuelve a tocar.

Un gasto con tasa manual es perfectamente válido y se aprueba igual. Solo queda anotado de
dónde salió la tasa, para la auditoría.

---

## 6. Captura asistida del comprobante

La captura asistida lee la foto del comprobante y **precarga** los campos del gasto (proveedor,
NIT, número de factura, fecha, valores) para no tener que digitarlos.

### 6.1 Estado actual

> ⚠️ **La captura asistida NO está disponible todavía.** El botón *"Extraer datos del
> comprobante"* no aparece en el formulario. La parte que lee la imagen la completa el
> proveedor del asistente y se activará después.
>
> Mientras tanto **el sistema funciona igual**: el gasto se llena a mano, como se ha hecho
> siempre. No falta nada más.

### 6.2 Cómo funcionará cuando se encienda

Esto es lo que hay que saber el día que aparezca el botón:

1. Se adjunta el comprobante **primero**. Sin archivo adjunto, el botón está deshabilitado.
2. Se pulsa **Extraer datos del comprobante**. Tarda hasta unos 20 segundos.
3. El sistema precarga los campos que reconoció y avisa: *"Se precargaron N campos.
   **Revíselos antes de guardar**"*.

> 🔴 **Nunca se guarda nada sin su confirmación.** La captura **llena el formulario**; no crea
> el gasto. Usted revisa, corrige lo que esté mal y pulsa Guardar. Si cierra sin guardar, no
> pasa nada.

4. Los campos de los que el sistema no está seguro salen marcados con
   **«Verifique este dato: …»**. **Reviselos siempre**: un número de factura mal leído se
   convierte en un duplicado que nadie detecta.
5. Si el comprobante está borroso o no se puede leer, aparece el aviso correspondiente y el
   texto *"Complete los datos manualmente"*. No es una falla: es un comprobante ilegible.

---

## 7. La pantalla de Contabilidad

Menú **Contabilidad**. Solo aparece si su rol tiene ese módulo habilitado.

### 7.1 Qué es

La bandeja de trabajo del área contable: la lista de gastos pendientes de aprobación contable,
con sus filtros, la aprobación individual, la aprobación masiva y la exportación a Excel.

### 7.2 Qué entra y qué NO entra

| | |
|---|---|
| **Sí entran** | Los gastos con estado presupuestal **Aprobado** y **Sin presupuesto** |
| 🔴 **NO entran** | Los gastos **Excedidos** |

**Los excedidos no aparecen a propósito.** La idea es que contabilidad no apruebe algo que
todavía tiene un problema de presupuesto sin resolver. Si le falta un gasto en la bandeja,
**revise primero si está excedido** (se ve en la lista de Gastos): esa es la explicación en
nueve de cada diez casos.

Para que aparezca: amplíe la partida (§3) o corrija el gasto. En cuanto deje de estar excedido,
entra a la bandeja solo.

Además, si su rol no tiene el permiso **Ver todos** dentro de Contabilidad, solo verá **sus
propios gastos**. No es un error de la pantalla.

### 7.3 Cómo se aprueba

**Uno por uno**: el botón de aprobar en la fila del gasto.

**Varios a la vez**:
1. Marque la casilla de las filas que quiere aprobar (o la casilla del encabezado, que
   selecciona todas las de la página).
2. Pulse **Aprobar seleccionados**.
3. El sistema le pide confirmación diciéndole **cuántos** gastos va a aprobar. Léalo: es la
   última oportunidad de darse cuenta de que seleccionó de más.

> El máximo por operación masiva es de **500 gastos**. Si necesita más, hágalo en dos tandas.
> El límite existe para que la operación no se quede colgada a mitad de camino.
>
> La aprobación masiva **nunca toca un gasto excedido**, aunque estuviera seleccionado.

Al aprobar, el sistema guarda **quién aprobó y en qué fecha**. Esa información se ve en la
tabla y sale en el Excel.

### 7.4 El caso que más preguntas va a generar

Léalo antes de que le pase:

> **Un gasto que contabilidad YA aprobó puede pasar a Excedido más tarde**, si alguien reduce
> o anula la partida de esa persona. Cuando eso ocurre:
>
> - **el gasto conserva su aprobación contable** (no se le quita nada);
> - pero **desaparece de la vista por defecto**, porque los excedidos no entran;
> - y se recupera aplicando el filtro **«Aprobados por contabilidad»**.

Es decir: si le falta un gasto que usted recuerda haber aprobado, **filtre por «Aprobados por
contabilidad»** y ahí está. No se perdió y no se desaprobó.

### 7.5 Filtros disponibles

Centro de costos, responsable, rango de fechas de factura, estado de aprobación contable,
aceptación operativa, moneda, estado presupuestal, tipo de documento y medio de pago; más un
buscador de texto que mira nombre del proveedor, descripción, número de factura, NIT y número
del gasto.

---

## 8. Exportar e importar Excel

### 8.1 Exportar

Botón **Exportar a Excel**, tanto en la lista de Gastos como en Contabilidad. **El archivo
respeta los filtros que tenga puestos**: si filtró por un centro de costos, exporta ese centro.

El archivo trae **18 columnas**, en este orden:

| # | Columna | # | Columna |
|---|---|---|---|
| 1 | **ID** | 10 | Medio de pago |
| 2 | Centro de costo | 11 | Estado operativo |
| 3 | Responsable | 12 | Estado presupuestal |
| 4 | Fecha de factura | 13 | Motivo presupuestal |
| 5 | Nombre (proveedor) | 14 | Moneda |
| 6 | NIT / CEDULA | 15 | Valor extranjero |
| 7 | Descripcion | 16 | TRM |
| 8 | Numero de factura | 17 | Valor del pago (COP) |
| 9 | Tipo | 18 | IVA (COP) |

El archivo que baja de Gastos y el que baja de Contabilidad son **idénticos en estructura**, así
que cualquiera de los dos se puede volver a importar.

### 8.2 Importar

Botón **Importar** en la lista de Gastos. El sistema acepta **dos formatos**:

- el **nuevo de 18 columnas** (el que acaba de exportar), y
- el **viejo de 11 columnas**, para no invalidar los archivos históricos.

El sistema detecta solo cuál de los dos es. Al terminar le dice cuántas filas entraron y
**cuáles fallaron, con el número de fila**. Una fila mala no aborta el archivo: las demás se
importan igual.

Los centros de costo, responsables, tipos y medios de pago se buscan **por su nombre o código
tal como aparece en el sistema**. Si no coinciden, esos campos quedan vacíos.

### 8.3 🔴 ADVERTENCIA: la columna ID sobrescribe el gasto existente

Esta es la parte más importante de la sección y es **destructiva por diseño**:

> **En el formato de 18 columnas, si la columna ID trae el número de un gasto que ya existe,
> la importación NO crea un gasto nuevo: SOBRESCRIBE ese gasto con los datos del archivo.**
>
> Los datos anteriores de ese gasto **se pierden**.

Se hizo así a propósito: es lo que permite exportar, corregir 50 gastos en Excel y volver a
subirlos sin duplicarlos. Pero significa que:

- **Antes de importar, mire la columna ID.** Si tiene números y usted esperaba crear gastos
  nuevos, va a pisar 50 gastos existentes.
- **Para crear gastos nuevos a partir de un archivo exportado, BORRE el contenido de la
  columna ID** (deje el encabezado). Con la columna vacía, todas las filas se crean nuevas.
- **Nunca importe un archivo con IDs que no salieron de este sistema.** Un ID inventado que
  coincida con un gasto real lo sobrescribe.
- El formato viejo de 11 columnas **no tiene columna ID**, así que **siempre crea**. Nunca
  sobrescribe.

**Recomendación práctica**: antes de una importación grande, exporte primero el mismo conjunto
de gastos y guarde ese archivo. Es su copia de seguridad.

### 8.4 Qué pasa con el presupuesto al importar

Los gastos importados **se evalúan contra el presupuesto igual que los registrados a mano**.
Un archivo de 200 gastos puede dejar varios en estado Excedido. Revise el tablero de
presupuesto después de una importación grande.

---

## 9. Preguntas que se repiten

**«Asigné la partida y el disponible ya sale reducido.»**
Correcto. Los gastos que esa persona ya tenía registrados en ese centro consumen la partida.
Ver §1.4.

**«El gasto quedó Excedido, ¿lo borro y lo vuelvo a crear?»**
No. Borrarlo y recrearlo da exactamente el mismo resultado, porque el cálculo depende del cupo,
no del gasto. Amplíe la partida o corrija el centro de costos. Ver §3.

**«¿Puedo cambiar el estado presupuestal a mano?»**
No, y no es una limitación de permisos: el campo no existe en ningún formulario. Lo calcula el
sistema. Ver §2.2.

**«El gasto no aparece en Contabilidad.»**
Casi siempre está **Excedido** (§7.2). Si no, revise si usted tiene el permiso *Ver todos*: sin
él solo ve sus propios gastos.

**«Aprobé un gasto y ya no lo encuentro.»**
Alguien redujo la partida y el gasto pasó a excedido. Sigue aprobado. Filtre por **«Aprobados
por contabilidad»**. Ver §7.4.

**«El sistema puso una tasa de otro día.»**
El día de la factura era fin de semana o festivo y no hay tasa publicada. Es correcto. Ver §5.4.

**«Escribí el valor en pesos y al guardar se cambió solo.»**
Falta marcar la casilla **«Ajusté el valor en COP a mano (no recalcular)»**. Ver §5.5.

**«No veo la pestaña Presupuesto / el menú Contabilidad / el menú Reglas de gastos.»**
Su rol no tiene ese módulo habilitado. Es un permiso, no una falla. Desde que se corrigió el
aviso del sistema, al intentar entrar por la dirección directa aparece en pantalla el mensaje
*"No tiene permiso para ingresar al módulo de …"*.

**«Importé un Excel y desaparecieron gastos.»**
No desaparecieron: se sobrescribieron. La columna ID pisa el gasto existente. Ver §8.3.

---

## Estado de este documento

| | |
|---|---|
| Versión | 1.0 |
| Corresponde a | La entrega de agosto de 2026 (presupuesto, comprobante, multimoneda, contabilidad y reglas de gastos) |
| Capturas de pantalla | **Pendientes.** El texto está escrito contra las pantallas ya terminadas y verificadas en navegador; las imágenes se toman en la sesión de capacitación, sobre el ambiente real y con datos reales, para que coincidan con lo que el usuario ve |
| Lo que NO cubre | La captura asistida en funcionamiento (§6) y el agente de WhatsApp, que tiene su propio instructivo de una página |
