# Registrar un gasto por WhatsApp — instructivo de campo

> ⏳ **DISPONIBLE CUANDO TAIMES COMPLETE LA EXTRACCIÓN.**
> El canal todavía no está conectado. **No reparta esta hoja aún**: guárdela y entréguela el
> día que se anuncie el número. Mientras tanto los gastos se registran por el sistema, como
> siempre.

---

## 1. Qué mandar

Guarde el número en su celular y mándele **una** de estas tres cosas:

| | |
|---|---|
| 📷 **Una foto del comprobante** | Lo más rápido y lo más confiable. La factura completa, derecha y con buena luz |
| 🎤 **Una nota de voz** | *"Almuerzo con el cliente de ACME, ochenta mil pesos, hoy"* |
| ⌨️ **Un mensaje de texto** | Lo mismo, escrito |

También puede mandar la foto **y** un audio o texto explicando: entre las dos cosas se
completan mejor los datos.

**Si tiene la factura, mándela.** Sin foto el gasto se registra igual, pero después alguien va
a tener que pedírsela.

---

## 2. Qué le va a preguntar el asistente, y en qué orden

1. **Le confirma que recibió** su mensaje: *"Recibido, estoy leyendo el comprobante…"*.
   **No reenvíe** el mensaje mientras tanto.
2. **Le pregunta el centro de costos** si no lo pudo deducir, con dos o tres opciones
   numeradas. Responda con el número.
3. **Le pregunta solo los datos que le faltan**, todos en un mismo mensaje. Si no logró leer
   algo del comprobante, **no se lo inventa**: se lo pregunta.
4. **Le muestra el resumen completo** y le pregunta si lo registra.
5. Cuando usted confirma, **lo guarda y le da el número del gasto**.

Los mínimos para poder registrar son tres: **centro de costos, fecha y valor total**. Sin esos
tres no se puede seguir.

---

## 3. La confirmación: **léala y respóndala**

Antes de guardar nada, el asistente le manda algo así:

```
Voy a registrar este gasto:

  Centro de costo : CM-ACME-12-2026 (Montaje planta ACME)
  Proveedor       : Hotel Dann Carlton  (NIT 900123456)
  Factura         : FE-4821
  Fecha           : 14/07/2026
  Total           : $588.407
  Comprobante     : factura-hotel.pdf

¿Lo registro? (si / no / corregir)
```

- **«sí»** → lo guarda y le responde con el número del gasto.
- **«corregir»** → le pregunta qué dato está mal y le vuelve a mostrar el resumen.
- **«no»** → no guarda nada.

🔴 **Hay que responder.** Un emoji, una pregunta o una corrección **no cuentan como sí**.
Si no contesta en **15 minutos**, el asistente **descarta el gasto** y no guarda nada. Tendrá
que volver a mandar la foto.

🔴 **Revise el valor y la fecha antes de decir que sí.** Es el único momento en que corregir
cuesta un segundo.

**Si mandó nota de voz**, el resumen le muestra además **lo que entendió** (*"Entendí: 'almuerzo
con el cliente de ACME, ochenta mil pesos, hoy'"*). Léalo: una transcripción mal entendida es
la causa número uno de gastos con el valor equivocado.

---

## 4. Los seis mensajes que puede recibir, y qué hacer con cada uno

### 4.1 🔴 *«No encuentro tu número en Controlmatica»*

> *"No encuentro tu número en Controlmatica, así que no puedo registrar el gasto a tu nombre.
> Pídele al administrador que registre este número en tu usuario y volvemos. No guardé nada."*

**Qué pasó**: su celular no está registrado en su usuario del sistema.
**Qué hacer**: 👉 **pídale al administrador que registre su número**. Dígale desde qué número
está escribiendo. Es un minuto de trabajo y hay que hacerlo **una sola vez**.
**Mientras tanto**: registre el gasto por el sistema. **El asistente no guardó nada.**

Variante: *«Tu número está registrado en más de un usuario»*. Es el mismo trámite: el
administrador tiene que dejar ese número en **una sola** persona.

> El asistente **nunca** va a registrar un gasto a nombre de otra persona por si acaso.
> Atribuirlo mal es peor que no registrarlo.

### 4.2 ⚠️ *«No puedo registrarlo así: …»* (una regla de la empresa)

Por ejemplo: *"ya existe el gasto #8812 con esa factura de ese proveedor"*, *"el comprobante
tiene 40 días y el máximo son 30"* o *"el valor supera el tope de $200.000"*.

**Qué hacer**:
- Si fue un error suyo (número de factura mal escrito, factura repetida), **corríjalo**.
- Si el gasto es legítimo y quiere registrarlo igual, **dígalo explícitamente**: *"sí, regístralo
  igual"*. Se guarda, queda marcado y **no queda aprobado** automáticamente. Alguien lo revisará.
- **No insista pidiéndole al asistente que haga una excepción.** Esas reglas las define
  Controlmatica, no él. Las excepciones se piden al administrador.

### 4.3 ⚠️ *«No pude obtener la tasa del dólar / del euro»*

**Qué hacer**: si sabe a qué tasa se liquidó, dígasela y la usa. Si no, dígale que lo registre
**en pesos**, con el valor que le cobraron.

El asistente **nunca** convierte "a ojo" ni usa una tasa de otro día sin avisarle.

### 4.4 ℹ️ *«Excede el presupuesto disponible en $X»*

**Esto NO es un error y el gasto SÍ se registra.** Solo le está avisando que se pasó del cupo
asignado.

**Qué hacer**: dígale que sí. Después, **avísele al responsable del centro de costos** para que
amplíe su partida. Mientras siga excedido, contabilidad no lo puede causar.

Variante: *«No tienes una partida presupuestal asignada en este centro»*. Tampoco es un error:
el gasto queda registrado, simplemente no está bajo control de presupuesto.

### 4.5 ⚠️ *«El gasto quedó guardado con el número #8813, pero el comprobante no se pudo
adjuntar»*

**El gasto YA existe.** No lo vuelva a mandar: se duplicaría.

**Qué hacer**: reenvíe **solo la foto** cuando el asistente se la pida, y él la adjunta al gasto
que ya creó. Si la foto se rechaza, mándela en **JPG, PNG o PDF** y de **menos de 10 MB** (una
foto normal del celular pesa mucho menos).

### 4.6 ⚠️ *«El enlace de la factura ya no sirve»*

Los enlaces a los comprobantes **caducan a los pocos minutos**, a propósito: son documentos con
NIT y valores.

**Qué hacer**: pídasela otra vez (*"mándame la factura del gasto 8813"*) y le genera un enlace
nuevo.

---

## 5. Cinco cosas que conviene saber

1. **Un mensaje, un gasto.** No mande cinco facturas en una sola foto.
2. **La foto derecha y completa.** Que se vean el NIT, el número de factura, la fecha y el total.
3. **El asistente nunca guarda sin que usted diga que sí.** Si dudó, dijo «no» o no contestó,
   no hay nada guardado.
4. **Si algo salió mal después de guardar**, se corrige en el sistema, no por WhatsApp.
   Apunte el número del gasto que le dio el asistente.
5. **El asistente no aprueba nada.** Registra. La aceptación y la aprobación contable siguen
   haciéndose como siempre.

---

## 6. Si algo no funciona

| Síntoma | A quién |
|---|---|
| *"No encuentro tu número"* | **Al administrador del sistema** — que registre su celular |
| Le aplican reglas que no le corresponden | **Al administrador del sistema** |
| El presupuesto no le alcanza | **Al responsable del centro de costos** |
| El asistente no contesta | **A soporte** |

---

*Controlmatica — v1.0. Guarde esta hoja: aplica desde el día en que se anuncie el número.*
