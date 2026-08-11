// Helpers de presentacion compartidos por las tablas de gastos y la pantalla de
// Contabilidad (paquete 09, Tarea 1). DUEÑO UNICO: 09 (§7.2); el paquete 08 los
// CONSUME desde `renderModal()` y `ExpensesTable.jsx` sin modificarlos.
//
// Cuatro funciones PURAS y sin JSX a proposito: este archivo lo importa tanto un
// pack (`packs/ReportExpenseIndex.js`, `React.createElement` sin JSX) como un
// `.jsx`. Si aqui hubiera JSX, el pack seguiria compilando pero cualquier futuro
// consumidor sin loader de JSX no.

// Badge del estado presupuestal. Devuelve { label, className }.
//
// El `default` cubre null/undefined (dato viejo anterior a la migracion del
// paquete 02) y cualquier valor desconocido: pinta "—" en gris y NO lanza. Un
// throw aqui tumbaria el render de la fila entera y, con el, el de la tabla.
export function budgetStatusBadge(status) {
  switch (status) {
    case "aprobado":
      return { label: "Aprobado", className: "cm-status-badge cm-status-badge--green" };
    case "excedido":
      return { label: "Excedido", className: "cm-status-badge cm-status-badge--red" };
    case "sin_presupuesto":
      return { label: "Sin presupuesto", className: "cm-status-badge cm-status-badge--gray" };
    default:
      return { label: "—", className: "cm-status-badge cm-status-badge--gray" };
  }
}

// Badge de la aprobacion contable. Devuelve { label, className }.
//
// Se compara por veracidad y no por `=== true`: el JSON puede traer el booleano,
// pero el mismo helper se usa con valores que pasaron por un <select> ("true").
export function accountingBadge(approved) {
  if (approved) {
    return { label: "Aprobado", className: "cm-status-badge cm-status-badge--green" };
  }
  return { label: "Pendiente", className: "cm-status-badge cm-status-badge--gray" };
}

// Fecha corta de aprobacion: "2026-07-14T10:22:00Z" -> "14/07/2026". null -> "".
//
// Se parte el string ANTES de construir el Date cuando viene en formato ISO:
// `new Date("2026-07-14")` se interpreta como UTC y en Colombia (UTC-5) se
// pintaria el 13. Con el corte manual la fecha que ve el usuario es la que
// guardo el servidor.
export function shortDate(value) {
  if (!value) return "";

  var iso = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[3] + "/" + iso[2] + "/" + iso[1];

  var d = new Date(value);
  if (isNaN(d.getTime())) return "";

  var day = ("0" + d.getDate()).slice(-2);
  var month = ("0" + (d.getMonth() + 1)).slice(-2);
  return day + "/" + month + "/" + d.getFullYear();
}

// Convierte a numero los decimales que AMS serializa como STRING.
//
// "1200.50" -> 1200.5 ; null -> null ; "" -> null ; 0 -> 0
//
// Se usa SIEMPRE antes de pasar foreign_value / foreign_tax / foreign_total /
// exchange_rate a NumberFormat: con el string crudo, NumberFormat pinta
// "120.00" sin separador de miles y el usuario lee un valor equivocado.
//
// El `=== 0` explicito importa: 0 es falsy y un `if (!value) return null`
// convertiria un total de cero en "—".
export function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  var n = Number(value);
  return isNaN(n) ? null : n;
}
