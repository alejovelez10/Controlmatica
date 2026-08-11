# Acta de capacitación — Gastos, presupuesto y multimoneda

> **Estado: PLANTILLA SIN FIRMAR.** La sesión no se ha realizado.
> Este documento se completa **durante** la sesión, no después: media hora más tarde nadie
> recuerda qué preguntas quedaron abiertas, y esas preguntas son la parte más valiosa del acta.
>
> **El acta firmada es el criterio de cierre del proyecto.** Sin ella, la Fase 7 no está
> entregada, por más que el software funcione.

---

## 1. Datos de la sesión

| | |
|---|---|
| **Fecha** | ____ / ____ / 20____ |
| **Hora de inicio / fin** | ______ — ______ |
| **Modalidad** | ☐ Presencial ☐ Virtual ☐ Mixta |
| **Entorno usado** | ☐ Staging ☐ Producción |
| **Facilitador** | ___________________________________ |
| **Responsable por Controlmatica** | ___________________________________ |

---

## 2. Asistentes

| # | Nombre | Cargo / Rol en el sistema | Correo | Firma |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |
| 6 | | | | |
| 7 | | | | |
| 8 | | | | |

---

## 3. Temario cubierto

Marque solo lo que **efectivamente** se cubrió. Un tema listado y no visto es peor que un tema
ausente: nadie vuelve a él.

### 3.1 Presupuesto de viáticos

| ☐ | Tema |
|---|---|
| ☐ | Qué es una partida y cómo se relaciona con el centro de costos |
| ☐ | El tablero: las seis cifras y cómo se leen |
| ☐ | Crear, editar y anular una partida |
| ☐ | El bloqueo por tope: no se puede asignar más de lo cotizado |
| ☐ | 🔴 **Decisión 0.1 — los gastos históricos SÍ consumen presupuesto.** Por qué el disponible nace reducido |
| ☐ | 🔴 **Decisión 0.2 — el control es SIN IVA.** Un gasto de $119.000 consume $100.000 |
| ☐ | Que editar una partida reevalúa todos los gastos de esa persona en ese centro |

### 3.2 Los tres estados de un gasto

| ☐ | Tema |
|---|---|
| ☐ | Aceptación operativa, estado presupuestal y aprobación contable son **independientes** |
| ☐ | 🔴 **El estado presupuestal lo escribe el sistema. Nadie lo cambia a mano** |
| ☐ | El gasto excedido **se guarda igual**, y qué hacer con él |
| ☐ | El orden de llegada consume el cupo: gana el que entró primero |

### 3.3 Gasto con comprobante

| ☐ | Tema |
|---|---|
| ☐ | Formatos admitidos y límite de 10 MB |
| ☐ | Adjuntar, previsualizar, descargar y quitar |
| ☐ | Que el enlace al comprobante caduca (no se puede reenviar por correo) |

### 3.4 Moneda extranjera

| ☐ | Tema |
|---|---|
| ☐ | COP, USD y EUR; la tasa se trae del día de la factura |
| ☐ | El aviso *"no hay tasa para el X; se aplicó la del Y"* **no es un error** |
| ☐ | 🔴 La casilla **«Ajusté el valor en COP a mano»**: sin marcarla, el sistema recalcula y pisa el valor |

### 3.5 Contabilidad

| ☐ | Tema |
|---|---|
| ☐ | 🔴 **Los gastos excedidos NO aparecen** en la bandeja, y por qué |
| ☐ | Aprobación individual y masiva (tope de 500) |
| ☐ | 🔴 **El caso del gasto ya aprobado que vuelve a excedido**: conserva la aprobación, sale de la vista por defecto y se recupera con el filtro *«Aprobados por contabilidad»* |
| ☐ | El permiso *Ver todos*: sin él solo se ven los gastos propios |

### 3.6 Excel

| ☐ | Tema |
|---|---|
| ☐ | Exportar respeta los filtros aplicados |
| ☐ | Las 18 columnas y los dos formatos aceptados al importar |
| ☐ | 🔴 **LA COLUMNA ID SOBRESCRIBE EL REGISTRO EXISTENTE.** Es destructivo por diseño |
| ☐ | Cómo crear gastos nuevos desde un archivo exportado: **borrar la columna ID** |

### 3.7 Reglas de gastos

| ☐ | Tema |
|---|---|
| ☐ | Los tres límites deterministas tienen campo propio; el texto libre lo lee el asistente |
| ☐ | 🔴 **El multi-select vacío significa NADIE**, no "todos" |
| ☐ | Gana la más restrictiva: agregar una regla nunca afloja un control |
| ☐ | Una violación no impide guardar, pero impide que quede aprobado |

### 3.8 Asistente de WhatsApp

| ☐ | Tema |
|---|---|
| ☐ | ☐ **No se cubrió: el canal todavía no está conectado** |
| ☐ | Qué mandar y qué pregunta el asistente |
| ☐ | La confirmación hay que responderla; a los 15 minutos descarta |
| ☐ | *"No encuentro tu número"* → pedirle al administrador que lo registre |

---

## 4. Ejercicio práctico

Cada asistente debe hacerlo **con sus propias manos**, no verlo hacer:

| ☐ | Paso | Quién lo hizo |
|---|---|---|
| ☐ | Crear una partida presupuestal | |
| ☐ | Registrar un gasto **con comprobante adjunto** | |
| ☐ | Provocar un gasto **excedido** y ver el mensaje | |
| ☐ | Ampliar la partida y ver cómo el excedido pasa a aprobado **solo** | |
| ☐ | Registrar un gasto en **USD** | |
| ☐ | Aprobarlo en **Contabilidad** | |
| ☐ | Exportar el Excel | |

---

## 5. Dudas abiertas

**La sección más importante del acta.** Anote **todo** lo que quedó sin respuesta, aunque
parezca menor.

| # | Duda / solicitud | Planteada por | Responsable | Fecha compromiso |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

---

## 6. Decisiones confirmadas en la sesión

Estas cinco se implementaron **por defecto** porque no hubo respuesta a tiempo. La sesión es la
oportunidad de confirmarlas o pedir que se cambien.

| # | Decisión | Valor aplicado | ☐ Confirma | ☐ Pide cambio |
|---|---|---|---|---|
| 0.1 | Los gastos históricos consumen presupuesto | **Sí** | ☐ | ☐ |
| 0.2 | El presupuesto se controla sin IVA | **Sin IVA** | ☐ | ☐ |
| 0.3 | Matriz de estados de aprobación | La entregada | ☐ | ☐ |
| 0.4 | Monedas del catálogo | **COP, USD, EUR** | ☐ | ☐ |
| 0.5 | Reglas de negocio | **Las 5 de la propuesta** | ☐ | ☐ |

> ⚠️ Cambiar la 0.1 o la 0.2 **después** de que haya presupuesto en producción obliga a
> recalcular el estado presupuestal de todos los gastos. Es el momento de decidirlo.

**Alcance**: se deja constancia de que **cualquier regla de negocio más allá de las 5
entregadas es alcance nuevo** y se cotiza aparte.

Observaciones: ______________________________________________________________________
____________________________________________________________________________________

---

## 7. Material entregado

| ☐ | Documento |
|---|---|
| ☐ | Manual de usuario (`MANUAL-USUARIO-GASTOS.md`) |
| ☐ | Guía de configuración de reglas (`GUIA-REGLAS-NEGOCIO.md`) |
| ☐ | Instructivo de WhatsApp — **solo si el canal ya está conectado** |
| ☐ | Runbook de puesta en marcha (`RUNBOOK-DESPLIEGUE-GASTOS-IA.md`) — al equipo técnico |

---

## 8. Firmas

**Por el proveedor**

Nombre: _______________________________  Firma: _______________________  Fecha: ___________

**Por Controlmatica**

Nombre: _______________________________  Firma: _______________________  Fecha: ___________

---

> Con este acta firmada se da por cerrada la Fase 7 (QA, migración, despliegue, documentación y
> capacitación) y, con ella, el proyecto.
