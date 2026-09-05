// Helpers de presentacion compartidos por las tablas de gastos y la pantalla de
// Contabilidad (paquete 09, Tarea 1). DUEÑO UNICO: 09 (§7.2); el paquete 08 los
// CONSUME desde `renderModal()` y `ExpensesTable.jsx` sin modificarlos.
//
// Funciones PURAS y sin JSX a proposito: este archivo lo importa tanto un pack
// (`packs/ReportExpenseIndex.js`, `React.createElement` sin JSX) como un `.jsx`.
// Si aqui hubiera JSX, el pack seguiria compilando pero cualquier futuro
// consumidor sin loader de JSX no. `budgetWarningIcon` devuelve un elemento de
// React, pero lo arma con `createElement`, que es justamente lo que la regla
// permite: la restriccion es sobre la SINTAXIS, no sobre devolver markup.

import React from "react";

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

// --- Aviso presupuestal --------------------------------------------------
//
// EL ESTADO PRESUPUESTAL YA NO ES UNA COLUMNA. Se decidio que la pildora
// (Aprobado / Sin presupuesto / Excedido) no le aporta al usuario una tercera
// columna de estado, asi que se oculta en las tres tablas y `budget_status`
// pasa a manejar dos cosas invisibles: la aceptacion automatica del gasto
// (`ReportExpense#auto_accept_if_within_budget`) y este aviso.
//
// EL AVISO ES EL UNICO SITIO DONDE SE PUEDE LEER `budget_reason`. Antes el
// motivo se guardaba y no lo mostraba nadie: las tres tablas lo pintaban bajo
// la condicion `budget_status === "excedido"`, de modo que el motivo de las
// reglas de gasto —que deja el gasto en `sin_presupuesto`, no en `excedido`—
// no se veia NUNCA, en ninguna pantalla. Aqui se muestra siempre que exista.
//
// => String con el motivo, o null si el gasto esta aprobado y no hay nada que
//    advertir.
export function budgetWarning(row) {
  if (!row) return null;

  switch (row.budget_status) {
    case "excedido":
      // El fallback cubre la fila que quedo excedida antes de que el servicio
      // escribiera motivos; hoy `budget_reason` siempre viene.
      return row.budget_reason || "Se pasó del presupuesto asignado";
    case "sin_presupuesto":
      // DOS CAUSAS DISTINTAS bajo el mismo estado: no hay partida para el par
      // (centro, responsable), o el gasto incumplio una regla y
      // `apply_expense_rules` lo bajo de `aprobado`. Se distinguen por si hay
      // motivo escrito: solo el segundo caso lo trae.
      return row.budget_reason || "No tiene presupuesto asignado";
    default:
      // `aprobado`, y tambien null/undefined (dato anterior a la migracion del
      // paquete 02). No se alarma por un dato viejo.
      return null;
  }
}

// El `!` que acompaña al estado del gasto. Devuelve null cuando no hay nada que
// advertir, para que el llamador lo pueda meter directo en un array de hijos.
//
// Vive AQUI y no en cada tabla porque son tres pantallas —Gastos, la pestaña del
// centro de costos y Contabilidad— y la senal tiene que leerse igual en las
// tres. Esa fue exactamente la falla del motivo que este aviso viene a corregir.
export function budgetWarningIcon(row) {
  if (!row) return null;

  // UN GASTO ACEPTADO NO LLEVA AVISO, aunque el motivo siga ahi. El triangulo
  // responde "¿esto necesita que alguien lo mire?", y en cuanto el gasto esta
  // aceptado —solo, porque cabia en el presupuesto, o a mano, porque una persona
  // lo reviso y lo dio por bueno— la respuesta es no. Pintarlo igual producia
  // filas que se contradicen a si mismas: "Aceptado" con una advertencia al
  // lado, sin nada que hacer al respecto.
  //
  // El motivo NO se pierde: `budgetWarning` lo sigue devolviendo y
  // `budget_reason` sigue en la base y en el JSON. Lo que se decide aqui es solo
  // cuando vale la pena interrumpir al que lee la tabla.
  if (row.is_acepted) return null;

  var motivo = budgetWarning(row);
  if (!motivo) return null;

  return React.createElement("i", {
    className: "fas fa-exclamation-triangle cm-warn-icon",
    "data-tooltip": motivo,
    // `title` ademas del tooltip de CSS: el ::after no existe para un lector de
    // pantalla ni sobrevive a un scroll horizontal con overflow hidden.
    title: motivo,
    "data-testid": "expense-budget-warning-" + (row.id || ""),
  });
}

// --- Comprobante ----------------------------------------------------------

// Decide si el comprobante se puede PINTAR en un modal o hay que entregarselo al
// navegador. La PISTA puede ser un nombre o una URL: el serializer de
// CarrierWave emite solo `{ url: ... }` —NO hay `name`—, y ese fue un bug real:
// `p.name` llegaba undefined, se montaba un <iframe> sobre una respuesta con
// Content-Disposition: attachment y el modal salia en blanco.
//
// Se recorta la query porque la URL firmada de S3 la lleva pegada detras.
//
// VIVE AQUI y no en cada tabla porque las dos pantallas que muestran
// comprobantes —Gastos y la pestaña del centro de costos— tienen que decidir lo
// mismo para el mismo archivo.
export function esComprobanteImagen(pista) {
  var limpia = String(pista || "").split("?")[0].split("#")[0].toLowerCase();
  return /\.(jpe?g|png|webp|heic|gif)$/.test(limpia);
}
