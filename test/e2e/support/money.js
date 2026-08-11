// Normalizacion de importes.
//
// POR QUE EXISTE: el mismo numero se pinta "$1.000.000", "$1,000,000" o
// "1000000" segun el locale y el NumberFormat de cada pantalla. Comparar el
// texto crudo hace que un cambio cosmetico ponga la suite en rojo. Donde se
// puede, los specs afirman sobre el JSON de la respuesta; donde hay que leer el
// DOM, pasan por aqui.

// "$1.234.567" -> 1234567 ; "$98,530.2" -> 98530.2
//
// Se descartan TODOS los separadores de miles y se conserva el ultimo separador
// decimal, sea coma o punto: es lo unico que funciona con las dos convenciones
// que conviven en el proyecto (es-CO en los helpers de Ruby, en-US en
// react-number-format).
function aNumero(texto) {
  if (texto === null || texto === undefined) return NaN;

  const limpio = String(texto).replace(/[^0-9.,-]/g, "");
  if (limpio === "" || limpio === "-") return NaN;

  const ultimaComa = limpio.lastIndexOf(",");
  const ultimoPunto = limpio.lastIndexOf(".");
  const sep = Math.max(ultimaComa, ultimoPunto);

  // Un separador con 1 o 2 digitos detras es decimal; con 3, es de miles.
  const esDecimal = sep !== -1 && limpio.length - sep - 1 !== 3;

  const entero = (esDecimal ? limpio.slice(0, sep) : limpio).replace(/[.,]/g, "");
  const decimales = esDecimal ? limpio.slice(sep + 1) : "";

  return Number(decimales ? `${entero}.${decimales}` : entero);
}

// Espera a que la fila de un registro exista en la tabla visible.
async function esperarFila(page, id) {
  const fila = page.getByTestId(`expense-ref-${id}`);
  await fila.waitFor({ state: "visible" });
  return fila;
}

module.exports = { aNumero, esperarFila };
