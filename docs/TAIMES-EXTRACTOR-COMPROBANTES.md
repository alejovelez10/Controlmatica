# Agente "Extractor de Comprobantes" — qué cambia para aplicar las reglas desde la web

**Para quién es**: quien configura el agente extractor en Taimes.

**Qué pide este documento**: que el agente, además de leer los campos del comprobante, **juzgue
el comprobante contra las instrucciones de la regla de gasto** y devuelva su veredicto en dos
campos nuevos.

**Por qué**: hasta ahora las `agent_instructions` —el texto libre que el administrador escribe en
la regla ("no se aceptan licores, ni propinas superiores al 10%")— solo las veía el agente de
WhatsApp. El mismo comprobante se juzgaba por un canal y por el otro no. Desde el 2026-10-03 la
web se las manda al extractor cuando la persona pulsa **Extraer datos del comprobante**.

---

## 1. Lo que cambia en la petición

El endpoint y la autenticación no cambian
(`POST {TAIMES_INVOKE_URL}/api/public/agents/{TAIMES_AGENT_ID}/invoke`, header `X-API-Key`).

Lo único nuevo es que el mensaje del usuario puede traer un bloque al final:

```
Extrae los datos de este comprobante. El gasto se imputa al centro de costos CC-0042.

Instrucciones de la politica de gasto:
No se aceptan licores, ni gastos personales, ni propinas superiores al 10%
```

El bloque **solo aparece si la persona responsable del gasto tiene alguna regla con
instrucciones**. Si no hay ninguna, el mensaje llega como siempre y no hay nada que juzgar.

Cuando la persona tiene varias reglas, sus instrucciones llegan concatenadas en un solo bloque,
separadas por una línea en blanco.

## 2. Lo que se espera en la respuesta

Dos campos nuevos, **opcionales**, junto a los que ya devuelve (`datos` con las 9 claves y
`confidence`):

| Campo | Tipo | Qué significa |
|---|---|---|
| `policy_compliant` | `true` / `false` / `null` | `true`: el comprobante cumple las instrucciones. `false`: las incumple. `null`: no se pudo juzgar, o no venían instrucciones |
| `policy_findings` | lista de textos | Un motivo corto por cada incumplimiento, citando lo que se vio en el documento. Vacía si cumple |

Ejemplo de un incumplimiento:

```json
{
  "policy_compliant": false,
  "policy_findings": ["La cuenta incluye una botella de vino por $85.000",
                      "La propina es del 15% del consumo"]
}
```

## 3. Las dos reglas que importan

🔴 **Ante la duda, `null`.** Un `false` puede **impedir que la persona registre el gasto** (ver
abajo), con la factura en la mano y en campo. Si el documento no alcanza para juzgar la
instrucción, el valor correcto es `null`, no `false`.

🔴 **Cada motivo, uno por elemento.** Controlmatica pinta `policy_findings` como una lista y
guarda cada motivo por separado en la auditoría del gasto. Un solo texto con todo pegado se lee
mal y no se puede filtrar después.

Si el agente todavía no implementa esto, no hay que hacer nada: los campos ausentes se tratan
como `null` y el comportamiento es el de siempre.

## 4. Qué hace Controlmatica con el veredicto

1. Lo muestra en el formulario, debajo del botón, junto a los avisos de confianza.
2. Lo manda de vuelta al guardar el gasto, y ahí el servidor lo aplica:
   - Si **alguna regla con instrucciones está marcada como Obligatoria**, el gasto **no se
     guarda** y la persona ve los motivos para corregir.
   - Si todas son blandas, el gasto se guarda, los motivos quedan anotados en la auditoría y el
     gasto no queda aprobado.
3. Un gasto escrito a mano, sin pasar por la lectura del comprobante, no tiene veredicto y se
   registra igual. Esto es deliberado: el servidor no sabe juzgar texto libre y no puede frenar
   un gasto por una pregunta que nadie hizo.

## 5. Cómo probarlo

1. En Controlmatica, cree una regla con instrucciones y asígnela al rol de la persona de prueba.
2. Marque la regla como **Obligatoria** si quiere probar el bloqueo.
3. En el formulario de gasto adjunte un comprobante que incumpla la instrucción y pulse
   **Extraer datos del comprobante**.
4. Debe aparecer el aviso con los motivos, y al pulsar Guardar el gasto debe rechazarse con esos
   mismos motivos.

Del lado de Controlmatica esto está cubierto por
`test/services/receipt_extraction_service_test.rb` (lo que se manda y lo que se lee),
`test/controllers/report_expenses_extract_receipt_test.rb` (el endpoint) y
`test/controllers/report_expenses_budget_wiring_test.rb` (el bloqueo al guardar).
