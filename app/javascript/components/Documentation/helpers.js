// Utilidades de la pantalla de Documentacion. Viven aparte porque las usan la
// tarjeta, el formulario y la pagina, y copiarlas tres veces es la forma
// segura de que el tamaño se muestre distinto en cada lugar.

export function csrfToken() {
  var meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}

// Mismo formato que ReportExpense/FormCreate.jsx (coma decimal).
export function pesoLegible(bytes) {
  var n = Number(bytes);
  if (!n || n <= 0) return "—";
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return Math.round(n / 1024) + " KB";
  return (n / (1024 * 1024)).toFixed(1).replace(".", ",") + " MB";
}

var MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// Fecha corta ("16 sep 2026"): en la tarjeta no cabe la hora y no aporta.
export function fechaCorta(fecha) {
  if (!fecha) return "";
  var d = new Date(fecha);
  if (isNaN(d.getTime())) return "";
  return d.getDate() + " " + MESES[d.getMonth()] + " " + d.getFullYear();
}

export function extensionDe(nombre) {
  var partes = String(nombre || "").split(".");
  return partes.length > 1 ? partes.pop().toLowerCase() : "";
}

// Icono y color por tipo. El color ayuda a encontrar "el Excel" en una lista
// larga sin leer los nombres; se usan los colores con que la gente ya asocia
// cada programa.
var TIPOS = {
  pdf:   { icon: "fas fa-file-pdf",        tone: "pdf",     label: "PDF" },
  doc:   { icon: "fas fa-file-word",       tone: "word",    label: "Word" },
  docx:  { icon: "fas fa-file-word",       tone: "word",    label: "Word" },
  xls:   { icon: "fas fa-file-excel",      tone: "excel",   label: "Excel" },
  xlsx:  { icon: "fas fa-file-excel",      tone: "excel",   label: "Excel" },
  csv:   { icon: "fas fa-file-csv",        tone: "excel",   label: "CSV" },
  ppt:   { icon: "fas fa-file-powerpoint", tone: "ppt",     label: "PowerPoint" },
  pptx:  { icon: "fas fa-file-powerpoint", tone: "ppt",     label: "PowerPoint" },
  txt:   { icon: "fas fa-file-alt",        tone: "text",    label: "Texto" },
  jpg:   { icon: "fas fa-file-image",      tone: "image",   label: "Imagen" },
  jpeg:  { icon: "fas fa-file-image",      tone: "image",   label: "Imagen" },
  png:   { icon: "fas fa-file-image",      tone: "image",   label: "Imagen" },
  webp:  { icon: "fas fa-file-image",      tone: "image",   label: "Imagen" },
  zip:   { icon: "fas fa-file-archive",    tone: "archive", label: "ZIP" },
};

export function tipoDeArchivo(nombre) {
  return TIPOS[extensionDe(nombre)] || { icon: "fas fa-file", tone: "text", label: "Archivo" };
}

// Junta los mensajes del servidor en una lista presentable.
export function mensajesServidor(mensajes) {
  return (Array.isArray(mensajes) ? mensajes : [mensajes]).filter(Boolean);
}

// Sin tildes y en minuscula, para que el buscador encuentre "guia" en "Guía".
export function normalizar(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}
