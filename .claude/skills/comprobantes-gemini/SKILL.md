---
name: comprobantes-gemini
description: Genera imágenes realistas de comprobantes de gasto (tiquetes POS, facturas electrónicas, recibos de app, recibos de talonario) con Gemini, en las monedas de Controlmatica (COP, USD, EUR, MXN, DOP, CRC, HNL), con montos, tipos de gasto, medios de pago y capturas variados. Cada imagen trae un .json con los valores esperados. Úsalo cuando pidan imágenes, fotos o comprobantes de prueba para gastos, para probar la carga del comprobante, la extracción con IA o la multimoneda.
---

# Comprobantes de gasto con Gemini

`scripts/generar.py` arma **el texto completo del recibo**, línea por línea, como
lo imprime de verdad ese tipo de comercio en ese país. Gemini solo lo dibuja.
Así los números salen coherentes y el documento no parece hecho a propósito.

Qué imita, según la moneda (el país sale de la moneda):

| Moneda | País | Documento fiscal | Impuestos y recargos |
|---|---|---|---|
| COP | Colombia | Documento equivalente POS / factura electrónica, resolución DIAN, CUDE/CUFE, QR | IVA 19 %; restaurantes INC 8 % + propina voluntaria; combustible, peajes y droguería sin IVA |
| USD | EE. UU. | Ticket con store #, server/table, línea TIP en restaurantes | Sales tax 7 %; hotel: state + occupancy |
| EUR | España | Factura simplificada, tabla base/cuota, VERI\*FACTU | IVA 10 % hostelería, 4 % farmacia, 21 % resto; precios con IVA incluido |
| MXN | México | Ticket con "para facturar…" (gasolinera: permiso CRE, bomba, Web ID) / CFDI 4.0 con UUID | IVA 16 % incluido |
| DOP | Rep. Dominicana | e-NCF E32 (consumo) o E31 (crédito fiscal), código de seguridad | ITBIS 18 %; restaurantes y hoteles + 10 % Ley |
| CRC | Costa Rica | Tiquete/factura electrónica con clave de 50 dígitos y consecutivo | IVA 13 % incluido; restaurantes + 10 % servicio; farmacia 2 % |
| HNL | Honduras | CAI, rango autorizado, fecha límite de emisión, "LA FACTURA ES BENEFICIO DE TODOS" | ISV 15 %; hotel + 4 % turismo |

**El medio de pago nunca aparece como "Forma de pago: TARJETA DE CREDITO".** Se
ve como en un recibo real:
- **Efectivo:** "EFECTIVO / CAMBIO" con el billete entregado.
- **Tarjeta:** el bloque del datáfono (franquicia, últimos 4 dígitos, aprobación, RRN, cuotas; en EE. UU. chip, AID y auth code).
- **Crédito a proveedores:** solo en facturas, con las condiciones de cada país ("Forma de pago: Crédito" + vencimiento en Colombia, "PPD / 99 Por definir" en México, "Condición de venta: Crédito" en Costa Rica, "Net 30" en EE. UU.).

Salida en `~/Desktop/comprobantes-gastos/` (se cambia con `--out`): `<MONEDA>_<tipo>_<documento>_<timestamp>.jpg` (o `.png`)
más su `.json`. El `.json` trae total, subtotal, base, impuestos, recargos,
ítems, fecha, hora, medio de pago, el texto exacto y el prompt. Es la **verdad
esperada** para comparar contra la extracción.

## Cómo correrlo

Desde la raíz del repo:

```bash
S=.claude/skills/comprobantes-gemini/scripts/generar.py

python3 $S -n 6                                          # todo al azar
python3 $S --moneda USD --tipo hotel --monto 412.37
python3 $S --moneda COP --tipo combustible --medio tarjeta --captura foto
python3 $S -n 4 --moneda DOP --tipo restaurante --captura borroso
python3 $S --moneda MXN --tipo aseo --medio credito      # sale como CFDI con PPD
python3 $S -n 3 --seed 42 --dry-run                      # solo ver los textos, sin llamar a Gemini
```

Convierte lo que pide el usuario en opciones y deja al azar lo que no diga. Para
cubrir todas las monedas, recórrelas con un `for`; varias llamadas pueden ir en
paralelo con `&` y `wait`.

| Opción | Valores |
|---|---|
| `--moneda` | `COP USD EUR MXN DOP CRC HNL` |
| `--tipo` | `taxi restaurante parqueadero peaje combustible aereo hotel dotacion representacion papeleria aseo ferreteria farmacia celular reparacion` |
| `--medio` | `tarjeta efectivo credito` |
| `--documento` | `ticket factura app manuscrito`. Por defecto elige uno que ese comercio emita de verdad: un peaje no da factura carta y un taxi no da tiquete POS. Si fuerzas uno raro, el script avisa |
| `--captura` | `plano foto borroso pantalla` (`app` siempre es `pantalla`) |
| `--monto` | total exacto; el script ajusta los precios para que cuadre |
| `--fecha` | `YYYY-MM-DD` (por defecto, algún día de los últimos 60) |
| `--sin-impuesto`, `--extra`, `-n`, `--seed`, `--out`, `--model` | Ver `--help`. El modelo por defecto es `gemini-3.1-flash-image` (`GEMINI_IMAGE_MODEL`). `gemini-3-pro-image` también sirve; `gemini-2.5-flash-image` revuelve los textos largos, no lo uses |

Para agregar un tipo, un país o un producto, edita `TIPOS`, `PAISES`,
`COMBUSTIBLES` o `impuestos_de()` en el script. `PAISES` debe coincidir con
`app/models/currency.rb`.

## Credenciales

1. `GEMINI_API_KEY` (o `GOOGLE_API_KEY`) exportada en `~/.zshrc` → Gemini Developer API.
2. Si no hay llave → Vertex AI con las credenciales de gcloud y el proyecto de `gcloud config`.

Si la llave está en `~/.zshrc` pero el script no la ve, revisa que la línea
empiece con `export`. Si se agregó durante la sesión, corre el script con
`zsh -ic '...'`.

## Al terminar

- Muéstrale al usuario una o dos imágenes con `Read`.
- El modelo de imagen **a veces cambia dígitos o letras**. Si la imagen va a
  servir para validar la extracción, mira que el total dibujado sea igual al
  del `.json`. Si no, genérala otra vez o borra el par.
- Comercios, NIT/RFC/RNC/RTN, CAI, CUFE y claves son inventados. No pidas
  marcas reales en `--extra`. Estas imágenes son solo para pruebas.
