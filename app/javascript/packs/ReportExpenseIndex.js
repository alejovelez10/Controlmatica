import React from "react";
import WebpackerReact from "webpacker-react";
import Swal from "sweetalert2";
import Select from "react-select";
import NumberFormat from "react-number-format";
import { CmDataTable, CmPageActions } from "../generalcomponents/ui";
import { budgetStatusBadge, accountingBadge, shortDate, toNumber, budgetWarningIcon } from "../generalcomponents/expenseIndicators";
import { Modal, ModalBody } from "reactstrap";

function csrfToken() {
  var meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}

function formatDate(fecha) {
  if (!fecha) return "";
  var d = new Date(fecha);
  var months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  var minutes = d.getMinutes();
  var timeValue = d.getHours() + (minutes < 10 ? ":0" + minutes : ":" + minutes);
  return months[d.getMonth()] + " " + d.getDate() + " del " + d.getFullYear() + " / " + timeValue;
}

var EMPTY_FILTERS = {
  cost_center_id: "",
  user_invoice_id: "",
  start_date: "",
  end_date: "",
  is_acepted: "",
  budget_status: "",
  currency: "",
  accounting_approved: "",
};

var EMPTY_FORM = {
  cost_center_id: "",
  user_invoice_id: "",
  invoice_name: "",
  invoice_date: "",
  description: "",
  invoice_number: "",
  identification: "",
  invoice_type: "",
  invoice_value: "",
  invoice_tax: "",
  invoice_total: "",
  type_identification_id: "",
  payment_type_id: "",
  // Moneda. `currency` arranca en COP porque es el default de la columna y
  // porque el bloque extranjero del modal se decide por este valor.
  currency: "COP",
  foreign_value: "",
  foreign_tax: "",
  foreign_total: "",
  exchange_rate: "",
  exchange_rate_date: "",
  exchange_rate_source: "",
  // Bandera que le prohibe al servidor recalcular el COP. Viaja SIEMPRE en el
  // FormData: sin ella, cada save recalcula desde foreign_* x TRM y pisa en
  // silencio el valor que la persona ajusto a mano.
  cop_manual_override: false,
};

// Espejo exacto de components/ShowConstCenter/ExpensesTable.jsx. Los dos
// formularios de gasto de la plataforma son del mismo paquete y todo campo nuevo
// va DOS veces; si uno se queda atras, el usuario ve columnas de moneda y estado
// presupuestal que no puede llenar desde esta pantalla.
// Sin `violations`: LAS REGLAS YA NO SE EVALUAN EN LA EXTRACCION. Se informan al
// guardar, que es el unico punto por el que pasan tanto el gasto leido del
// comprobante como el escrito a mano.
// El mensaje de una regla lo escribe un administrador en la tabla de reglas y se
// pinta con `html:` en SweetAlert, asi que se escapa. No es paranoia: el nombre
// del proveedor y el numero de factura entran en el texto del duplicado.
function escaparHtml(texto) {
  return String(texto).replace(/[&<>"']/g, function(c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

var EXTRACTION_VACIA = { status: "idle", message: null, filled: [], confidence: {}, warnings: [] };
var EXCHANGE_VACIO = { status: "idle", message: null, rate_date: null, requested_date: null, source: null };
var DISPONIBLE_VACIO = { loading: false, error: null, has_budget: false, assigned: "0.0", spent: "0.0", available: "0.0" };

// Decide si el comprobante se puede pintar en pantalla.
//
// La PISTA puede ser un nombre de archivo o una URL: el serializer de
// CarrierWave solo emite `{ url: ... }` —NO hay `name`, y ese fue justo el
// bug: `p.name` llegaba undefined, la deteccion daba falso, se montaba un
// <iframe> sobre una respuesta con Content-Disposition: attachment y el modal
// salia en blanco. La URL si trae la extension, asi que sirve de pista.
//
// Se recorta la query porque la URL firmada de S3 llega con `?X-Amz-...`
// pegado detras de la extension.
function esComprobanteImagen(pista) {
  var limpia = String(pista || "").split("?")[0].split("#")[0].toLowerCase();
  return /\.(jpe?g|png|webp|heic|gif)$/.test(limpia);
}

var EXTENSIONES_COMPROBANTE = ["jpg", "jpeg", "png", "pdf", "webp", "heic"];
var TAMANO_MAXIMO_COMPROBANTE = 20 * 1024 * 1024;

// Nombres legibles de los campos que devuelve la extraccion. Son las claves DEL
// SERVICIO (provider_name, value…), no las del formulario, porque asi llega la
// matriz `confidence`. Espeja EXTRACTION_FIELD_LABELS de
// report_expenses_controller.rb: si alla se agrega un campo, aqui tambien.
var ETIQUETAS_EXTRACCION = {
  provider_name: "el nombre del proveedor",
  identification: "el NIT o cédula",
  invoice_number: "el número de factura",
  invoice_date: "la fecha de la factura",
  currency: "la moneda",
  value: "el valor",
  tax: "los impuestos",
  total: "el total",
  description: "la descripción",
};

// Peso del comprobante para la zona de arrastre. Se corta en MB porque el tope
// son 20 MB: no hay nada que decir por encima de eso.
function pesoLegible(bytes) {
  var n = Number(bytes);
  if (!n || n <= 0) return "Archivo listo";
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return Math.round(n / 1024) + " KB";
  return (n / (1024 * 1024)).toFixed(1).replace(".", ",") + " MB";
}

// Columnas que NO se pintan hoy, por decision de producto (2026-08-18).
//
// Se ocultan aqui en vez de borrarse porque el dato sigue existiendo de punta a
// punta —el servicio lo calcula, el serializer lo emite y el FILTRO "Estado
// presupuestal" de esta misma pantalla lo sigue usando—, y volver a mostrarlas
// es quitar la clave de este objeto, no reescribir un render.
//
// 🔴 Consecuencia medida: al ocultar `budget_status` desaparece del DOM el
// `data-testid="expense-budget-status-<id>"`, del que dependian 4 aserciones de
// navegador (budget.spec.js x2, rules.spec.js x2). Esas pruebas verifican el
// MISMO hecho contra la respuesta del servidor (`body.register.budget_status`),
// que es donde vive la regla; lo que se perdio es la comprobacion de que el
// badge se pinta. Si la columna vuelve, las aserciones vuelven con ella.
var COLUMNAS_OCULTAS = { budget_status: true };

// Estado del comprobante y de sus dos acompanantes, para resetearlo de una sola
// vez al abrir el modal. Que este junto no es cosmetico: olvidar uno solo de
// estos campos hace que el comprobante del gasto anterior se suba al siguiente.
function estadoComprobanteVacio() {
  return {
    receiptFile: null,
    receiptFileName: "",
    receiptSize: 0,
    receiptDragging: false,
    receiptExistingId: null,
    // La URL del comprobante YA GUARDADO. Se necesita aparte de
    // `receiptFileName` —que solo se llena cuando el usuario acaba de elegir
    // un archivo— para saber si lo adjuntado es una imagen al EDITAR un gasto.
    receiptExistingUrl: "",
    // Violaciones de reglas del gasto EN CURSO. Se llenan al adjuntar el
    // comprobante; el Guardar las vuelve a validar en el servidor, que es quien
    // manda. Esto solo adelanta el aviso.
    ruleViolations: [],
    receiptError: null,
    extraction: Object.assign({}, EXTRACTION_VACIA),
    exchange: Object.assign({}, EXCHANGE_VACIO),
    budgetAvailability: Object.assign({}, DISPONIBLE_VACIO),
  };
}

// KILL SWITCH de la captura asistida. Arranca APAGADO: el endpoint
// POST /extract_receipt/report_expenses todavia no existe (la llamada al modelo
// de vision la completa Taimes). Encenderlo es una linea en layouts/user.html.erb,
// archivo con dueno por bloque, asi que no se escribe desde aqui.
function receiptExtractionEnabled() {
  return window.CM_RECEIPT_EXTRACTION_ENABLED === true;
}

var selectStyles = {
  control: function(base, state) {
    return Object.assign({}, base, {
      background: "#fcfcfd",
      borderColor: state.isFocused ? "#f5a623" : "#e2e5ea",
      boxShadow: state.isFocused ? "0 0 0 3px rgba(245, 166, 35, 0.15)" : "none",
      borderRadius: "8px",
      padding: "2px 4px",
      fontSize: "14px",
    });
  },
  option: function(base, state) {
    return Object.assign({}, base, {
      backgroundColor: state.isSelected ? "#f5a623" : state.isFocused ? "#fff3e0" : "#fff",
      color: state.isSelected ? "#fff" : "#333",
      fontSize: "14px",
    });
  },
  menuPortal: function(base) { return Object.assign({}, base, { zIndex: 9999 }); },
};

class ReportExpenseIndex extends React.Component {
  constructor(props) {
    super(props);
    var self = this;

    this.state = {
      data: [],
      loading: true,
      searchTerm: "",
      sortKey: null,
      sortDir: "asc",
      meta: { total: 0, page: 1, per_page: 50, total_pages: 1 },
      // Filters
      showFilters: false,
      isFiltering: false,
      filters: Object.assign({}, EMPTY_FILTERS),
      filterCostCenter: null,
      filterCostCenterOptions: [],
      filterCostCenterLoading: false,
      filterUser: null,
      // Modal
      modal: false,
      modalImport: false,
      importFileName: "",
      importSize: 0,
      importDragging: false,
      importing: false,
      modeEdit: false,
      editId: null,
      ErrorValues: true,
      form: Object.assign({}, EMPTY_FORM, { user_invoice_id: props.current_user.id }),
      selectedCostCenter: null,
      formCostCenterOptions: [],
      formCostCenterLoading: false,
      selectedUser: { value: props.current_user.id, label: props.current_user.names },
      selectedType: null,
      selectedPayment: null,
      // Estado inline edit
      editingStatusId: null,
      // Copy hint
      copyMessage: "",
    };

    this.userOptions = (props.users || []).map(function(u) {
      return { label: u.names, value: u.id };
    });

    this.typeOptions = (props.report_expense_options || []).filter(function(o) { return o.category === "Tipo"; }).map(function(o) {
      return { label: o.name, value: o.id };
    });

    this.paymentOptions = (props.report_expense_options || []).filter(function(o) { return o.category === "Medio de pago"; }).map(function(o) {
      return { label: o.name, value: o.id };
    });

    // Triple guarda obligatoria. La prop la pasa la vista con `get_currencies`
    // (helper del paquete 05), pero si la vista se renderiza sin ella el
    // fallback es window.CM_CURRENCIES —la fuente unica del layout— y, si
    // tampoco esta, un array vacio. Sin el `|| []`, el `.map` del select de
    // moneda revienta el render COMPLETO de la pantalla de Gastos: no se cae un
    // filtro, se cae la tabla entera.
    this.currencyOptions = props.currencies || window.CM_CURRENCIES || [];

    // ORDEN POR RELEVANCIA (2026-08-18). La tabla mide ~2.900px y el viewport
    // util son ~1.300px, asi que SIEMPRE hay scroll horizontal: lo unico que se
    // puede decidir es que se ve sin arrastrar la barra. Las 9 primeras son las
    // que caben en una pantalla y son las que el usuario mira a diario
    // —referencia, cuando, de quien, cuanto y en que estado va—; el resto es
    // detalle de la factura y auditoria, que se consulta cuando ya se encontro
    // la fila. Antes el Total caia en la posicion 13 y habia que hacer scroll
    // para ver la plata, que es justo el dato por el que se entra a esta
    // pantalla.
    this.columns = [
      // El ID de referencia va PRIMERO: es lo que el usuario copia al chat de
      // soporte y lo que el buscador acepta desde que C.2/F.1 metieron
      // `id::text` en el LIKE.
      { key: "id", label: "ID", width: "80px", render: function(row) {
        return React.createElement("span", { "data-testid": "expense-ref-" + row.id, style: { fontWeight: 600, color: "#6c757d" } }, "#" + row.id);
      }},
      { key: "invoice_date", label: "Fecha de factura", width: "120px" },
      { key: "cost_center_code", label: "Centro de costo", width: "150px", render: function(row) { return row.cost_center ? row.cost_center.code : ""; } },
      { key: "user_invoice_name", label: "Responsable", width: "150px", render: function(row) { return row.user_invoice ? row.user_invoice.names : ""; } },
      { key: "invoice_name", label: "Nombre", width: "200px" },
      // decimalScale: 2 NO es cosmetico. `invoice_value/tax/total` son columnas
      // `float` en Postgres (db/schema.rb:504-506), asi que la aritmetica del
      // gasto guarda ruido de coma flotante EN LA BASE: hay filas con
      // 1006416.3200000001 guardado. El peso tiene dos decimales y punto, de modo
      // que todo lo que venga detras es ruido por definicion y se corta al
      // pintar. Esto arregla las 5.011 filas que ya existen; la causa raiz —el
      // tipo de la columna— sigue ahi y no se toca desde el frontend.
      { key: "invoice_total", label: "Total", width: "120px", render: function(row) { return React.createElement(NumberFormat, { value: row.invoice_total, displayType: "text", thousandSeparator: true, decimalScale: 2, prefix: "$" }); } },
      // El motivo del exceso va SIEMPRE dentro de .cm-cell-truncate con
      // data-tooltip: `budget_reason` lo escribe el servicio de presupuesto y
      // puede traer el nombre del centro, el cupo y lo disponible en una sola
      // frase; suelto, esa celda estira la tabla y rompe el scroll horizontal.
      { key: "budget_status", label: "Estado presupuestal", width: "190px", render: function(row) {
        var badge = budgetStatusBadge(row.budget_status);
        return React.createElement("div", { "data-testid": "expense-budget-status-" + row.id },
          React.createElement("span", { className: badge.className }, badge.label),
          row.budget_status === "excedido" && row.budget_reason
            ? React.createElement("div", { className: "cm-cell-truncate", "data-tooltip": row.budget_reason },
                React.createElement("span", { className: "cm-cell-truncate-text" }, row.budget_reason))
            : null
        );
      }},
      // EL DESPLEGABLE VA DIRECTO, sin el lapiz que antes lo precedia. Cambiar
      // el estado eran dos clics (lapiz -> select) y el lapiz no decia que iba a
      // pasar al pulsarlo. Con el select a la vista el estado se lee y se cambia
      // en el mismo gesto, y de paso desaparece la equis de cancelar: no hay
      // nada que cancelar si nunca se entro en un modo.
      //
      // `editingStatusId` y sus dos metodos quedan vivos a proposito: la tabla
      // del centro de costos todavia usa el patron viejo.
      { key: "is_acepted", label: "Estado", width: "150px", sortable: false, render: function(row) {
        // Sin permiso de cierre el estado es SOLO LECTURA. Antes esto se notaba
        // porque no aparecia el lapiz; ahora hay que pintar la pildora, o el
        // usuario sin permiso veria un desplegable que el servidor le rechaza.
        // EL `!` ACOMPAÑA AL ESTADO EN LAS DOS RAMAS. Es la senal de que el
        // gasto se paso del presupuesto o no tiene partida, y su tooltip es el
        // unico sitio donde se lee el motivo. Va envuelto en un flex para que
        // el icono no empuje la pildora ni el desplegable.
        var aviso = budgetWarningIcon(row);

        if (!props.estados.closed) {
          return React.createElement("div", { className: "cm-status-cell" },
            React.createElement("span", {
              className: "cm-status-pill" + (row.is_acepted ? " cm-status-pill--ok" : ""),
              "data-testid": "expense-status-" + row.id,
            }, row.is_acepted ? "Aceptado" : "Creado"),
            aviso
          );
        }

        return React.createElement("div", { className: "cm-status-cell" },
        React.createElement("select", {
          className: "cm-status-select" + (row.is_acepted ? " cm-status-select--ok" : ""),
          value: row.is_acepted ? "true" : "false",
          onChange: function(e) { self.updateStatus(e, row); },
          // stopPropagation SIGUE SIENDO OBLIGATORIO: el clic en la fila abre el
          // detalle, y sin esto elegir un estado abriria el modal encima.
          onClick: function(e) { e.stopPropagation(); },
          "data-testid": "expense-status-select-" + row.id,
        },
          React.createElement("option", { value: "true" }, "Aceptado"),
          React.createElement("option", { value: "false" }, "Creado")
        ),
          aviso
        );
      }},
      { key: "accounting_approved", label: "Contabilidad", width: "170px", render: function(row) {
        var badge = accountingBadge(row.accounting_approved);
        return React.createElement("div", { "data-testid": "expense-accounting-status-" + row.id },
          React.createElement("span", { className: badge.className }, badge.label),
          row.accounting_approved
            ? React.createElement("span", { className: "cm-hint", style: { display: "block" } },
                shortDate(row.accounting_approved_at) + (row.accounting_approved_by ? " · " + row.accounting_approved_by.names : ""))
            : null
        );
      }},
      // El destino es SIEMPRE /download_receipt/report_expenses/:id y nunca
      // `row.receipt_file.url`: esa es la URL firmada de S3 y expira a los 600
      // segundos, asi que una tabla abierta desde hace diez minutos entregaria
      // 403 al hacer clic.
      //
      // UN SOLO CONTROL, no dos. Habia una descarga y un ojo, pero la eleccion
      // entre mirar y guardar no la hace el usuario: la hace el archivo. Una
      // foto se mira en el modal —y desde ahi se descarga—; un PDF se lo queda
      // el navegador, que ya sabe mostrarlo, imprimirlo y guardarlo.
      { key: "receipt_file", label: "Comprobante", width: "120px", sortable: false, render: function(row) {
        // Guion centrado y NO una equis: la equis se lee como "fallo" o como un
        // boton de quitar. Aqui no hay error ni accion, solo ausencia de dato,
        // que es lo que dice un guion en el resto de la tabla.
        if (!row.receipt_file || !row.receipt_file.url) {
          return React.createElement("div", { className: "cm-celda-vacia" }, "—");
        }

        // CON ETIQUETA, no solo un icono. Un boton mudo obliga a adivinar o a
        // parar el raton encima; con dos letras se sabe sin tocarlo. Y el verbo
        // cambia con el archivo, porque no hacen lo mismo: la imagen se VE aqui
        // dentro, el resto se ABRE en una pestana del navegador.
        //
        // Iconos de FontAwesome 5 (layouts/user.html.erb carga la 5.15.4):
        // `fa-receipt` y `fa-external-link-alt` existen ahi. Ojo con los nombres
        // de la 6 —`fa-file-arrow-down`, `fa-arrow-up-right-from-square`—: no
        // fallan, simplemente no pintan nada.
        var imagen = esComprobanteImagen(row.receipt_file.url);
        return React.createElement("div", { style: { display: "flex", justifyContent: "center" } },
          React.createElement("button", {
            type: "button",
            className: "cm-btn cm-btn-outline cm-btn-sm",
            title: imagen ? "Ver el comprobante" : "Abrir el comprobante en otra pestaña",
            onClick: function(e) { e.stopPropagation(); self.abrirComprobante(row.id, row.receipt_file.url); },
            "data-testid": "expense-receipt-preview-" + row.id
          },
            React.createElement("i", { className: imagen ? "fas fa-receipt" : "fas fa-external-link-alt" }),
            imagen ? " Ver" : " Abrir"
          )
        );
      }},

      // --- A partir de aqui hay que arrastrar la barra: detalle de la factura,
      // --- desglose del monto y auditoria. Se consulta cuando ya se encontro la
      // --- fila, no para encontrarla.
      { key: "type_name", label: "Tipo", width: "180px", render: function(row) { return row.type_identification ? row.type_identification.name : ""; } },
      { key: "payment_name", label: "Medio de pago", width: "150px", render: function(row) { return row.payment_type ? row.payment_type.name : ""; } },
      { key: "invoice_value", label: "Valor", width: "100px", render: function(row) { return React.createElement(NumberFormat, { value: row.invoice_value, displayType: "text", thousandSeparator: true, decimalScale: 2, prefix: "$" }); } },
      { key: "invoice_tax", label: "IVA", width: "100px", render: function(row) { return React.createElement(NumberFormat, { value: row.invoice_tax, displayType: "text", thousandSeparator: true, decimalScale: 2, prefix: "$" }); } },
      { key: "currency", label: "Moneda", width: "90px", render: function(row) {
        return React.createElement("span", { "data-testid": "expense-currency-" + row.id }, row.currency || "COP");
      }},
      // sortable: false A PROPOSITO. `foreign_total` NO esta en
      // EXPENSE_SORT_COLUMNS (F.1): con sortable true el servidor cae al `else`
      // y ordena por created_at, pero la flecha del header cambia igual. El
      // usuario ve una tabla reordenada por el criterio equivocado y nada avisa.
      { key: "foreign_total", label: "Valor extranjero", width: "150px", sortable: false, render: function(row) {
        var total = toNumber(row.foreign_total);
        if (row.currency === "COP" || total === null) return "—";

        var rate = toNumber(row.exchange_rate);
        return React.createElement("span", null,
          React.createElement(NumberFormat, { value: total, displayType: "text", thousandSeparator: true, decimalScale: 2, suffix: " " + row.currency }),
          rate !== null
            ? React.createElement("span", { className: "cm-hint", style: { display: "block" } },
                "TRM ",
                React.createElement(NumberFormat, { value: rate, displayType: "text", thousandSeparator: true, decimalScale: 6 }))
            : null
        );
      }},
      { key: "description", label: "Descripcion", width: "200px" },
      { key: "identification", label: "NIT / CEDULA", width: "120px" },
      { key: "invoice_number", label: "#Factura", width: "140px" },
      {
        key: "created_at", label: "Creación", width: "220px",
        render: function(row) {
          return React.createElement("span", null,
            formatDate(row.created_at),
            row.user ? React.createElement("span", null, React.createElement("br"), row.user.names) : null
          );
        }
      },
      {
        key: "updated_at", label: "Ultima actualización", width: "220px",
        render: function(row) {
          return React.createElement("span", null,
            formatDate(row.updated_at),
            row.last_user_edited ? React.createElement("span", null, React.createElement("br"), row.last_user_edited.names) : null
          );
        }
      },
    ].filter(function(c) { return !COLUMNAS_OCULTAS[c.key]; });
  }

  componentDidMount() {
    this.loadData();
  }

  componentWillUnmount() {
    // El debounce del disponible presupuestal sobrevive al desmontaje y su
    // callback hace setState: sin este clear, React avisa por consola y el
    // fetch sale igual con el formulario ya cerrado.
    if (this._availTimer) clearTimeout(this._availTimer);
  }

  // UNICA fuente de los parametros de filtro. Antes la lista estaba copiada en
  // cuatro sitios (loadData, acceptFilteredExpenses, getExportUrl y
  // EMPTY_FILTERS) y agregar un filtro en tres de los cuatro produce el peor bug
  // del modulo: el usuario ve tres filas filtradas, hace clic en "Aceptar
  // gastos" y el servidor acepta miles porque el PATCH salio sin el filtro.
  filterParams = function() {
    var f = this.state.filters;
    var out = [];
    if (f.cost_center_id) out.push("cost_center_id=" + f.cost_center_id);
    if (f.user_invoice_id) out.push("user_invoice_id=" + f.user_invoice_id);
    if (f.start_date) out.push("start_date=" + f.start_date);
    if (f.end_date) out.push("end_date=" + f.end_date);
    if (f.is_acepted) out.push("is_acepted=" + f.is_acepted);
    if (f.budget_status) out.push("budget_status=" + f.budget_status);
    if (f.currency) out.push("currency=" + f.currency);
    if (f.accounting_approved) out.push("accounting_approved=" + f.accounting_approved);
    return out;
  }.bind(this);

  loadData = function(page, perPage, searchTerm, sortKey, sortDir) {
    var self = this;
    var p = page || this.state.meta.page;
    var pp = perPage || this.state.meta.per_page;
    var term = searchTerm !== undefined ? searchTerm : this.state.searchTerm;
    var sk = sortKey !== undefined ? sortKey : this.state.sortKey;
    var sd = sortDir !== undefined ? sortDir : this.state.sortDir;

    self.setState({ loading: true });

    var params = ["page=" + p, "per_page=" + pp];
    if (term) params.push("q=" + encodeURIComponent(term));
    if (sk) params.push("sort=" + sk + "&dir=" + sd);
    params = params.concat(this.filterParams());

    fetch("/get_report_expenses?" + params.join("&"), { headers: { "X-CSRF-Token": csrfToken() } })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        self.setState({
          data: data.data || [],
          meta: { total: data.total || 0, page: p, per_page: pp, total_pages: Math.ceil((data.total || 0) / pp) },
          loading: false,
          searchTerm: term,
          sortKey: sk,
          sortDir: sd,
        });
      });
  }.bind(this);

  handlePageChange = function(page) { this.loadData(page); }.bind(this);
  handlePerPageChange = function(pp) { this.loadData(1, pp); }.bind(this);
  handleSearch = function(term) { this.loadData(1, undefined, term); }.bind(this);
  handleSort = function(key, dir) { this.loadData(1, undefined, undefined, key, dir); }.bind(this);

  toggleFilters = function() {
    var self = this;
    var willClose = this.state.showFilters;
    this.setState({ showFilters: !this.state.showFilters }, function() {
      if (willClose) {
        self.setState({ filters: Object.assign({}, EMPTY_FILTERS), filterCostCenter: null, filterUser: null, filterCostCenterOptions: [], isFiltering: false }, function() {
          self.loadData(1);
        });
      }
    });
  }.bind(this);

  handleFilterChange = function(e) {
    var f = Object.assign({}, this.state.filters);
    f[e.target.name] = e.target.value;
    this.setState({ filters: f });
  }.bind(this);

  handleFilterCostCenterSearch = function(inputValue) {
    var self = this;
    if (!inputValue || inputValue.length < 3) { self.setState({ filterCostCenterOptions: [] }); return; }
    if (self._filterCcTimer) clearTimeout(self._filterCcTimer);
    self._filterCcTimer = setTimeout(function() {
      self.setState({ filterCostCenterLoading: true });
      fetch("/search_cost_centers?q=" + encodeURIComponent(inputValue), { headers: { "X-CSRF-Token": csrfToken() } })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          self.setState({ filterCostCenterOptions: data.map(function(d) { return { value: d.id, label: d.label }; }), filterCostCenterLoading: false });
        });
    }, 300);
  }.bind(this);

  applyFilters = function() {
    this.setState({ isFiltering: true });
    this.loadData(1);
  }.bind(this);

  clearFilters = function() {
    this.setState({ filters: Object.assign({}, EMPTY_FILTERS), filterCostCenter: null, filterUser: null, filterCostCenterOptions: [], isFiltering: false }, this.loadData.bind(this, 1));
  }.bind(this);

  // La confirmacion es el UNICO freno de esta accion: /update_filter_values NO
  // verifica en el servidor que hubiera filtros (deuda documentada en §3.9, que
  // este proyecto no corrige). Con los tres filtros nuevos el riesgo sube: si el
  // backend todavia no soportara uno de ellos, el usuario veria tres filas y
  // aceptaria miles. El conteo del texto sale de meta.total —el total del filtro
  // que el servidor ya devolvio— y no del largo de la pagina.
  acceptFilteredExpenses = function() {
    var self = this;
    var params = this.filterParams();

    Swal.fire({
      title: "¿Aceptar " + this.state.meta.total + " gastos?",
      text: "Se marcarán como Aceptados todos los gastos que coinciden con el filtro actual, no solo los de esta página.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#2a3f53",
      cancelButtonColor: "#dc3545",
      confirmButtonText: "Sí, aceptar",
      cancelButtonText: "Cancelar",
    }).then(function(result) {
      if (!result.value) return;

      fetch("/update_filter_values?" + params.join("&"), {
        method: "PATCH",
        headers: { "X-CSRF-Token": csrfToken(), "Content-Type": "application/json" },
      })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          self.loadData();
          Swal.fire({ position: "center", icon: data.type || "success", title: data.success || "Gastos aceptados", showConfirmButton: false, timer: 1500 });
        });
    });
  }.bind(this);

  openImportModal = function() { this.setState({ modalImport: true }); }.bind(this);
  closeImportModal = function() { this.aceptarArchivoImport(null); this.setState({ modalImport: false }); }.bind(this);

  getExportUrl = function() {
    if (!this.state.isFiltering) {
      return "/download_file/report_expenses/todos.xlsx";
    }
    return "/download_file/report_expenses/filtro.xlsx?" + this.filterParams().join("&");
  }.bind(this);

  openNewModal = function() {
    var self = this;
    // El estado del comprobante se limpia AL ABRIR y no solo al cerrar: si el
    // usuario edito antes un gasto con PDF, sin esto el archivo anterior se
    // subiria al gasto nuevo sin que nada lo advierta.
    this.setState(Object.assign({
      modal: true, modeEdit: false, editId: null, ErrorValues: true, saving: false,
      form: Object.assign({}, EMPTY_FORM, { user_invoice_id: self.props.current_user.id }),
      selectedCostCenter: null, formCostCenterOptions: [],
      selectedUser: { value: self.props.current_user.id, label: self.props.current_user.names },
      selectedType: null, selectedPayment: null,
      selectedCurrency: self.currencyOption("COP"),
    }, estadoComprobanteVacio()));
  }.bind(this);

  openEditModal = function(row) {
    var self = this;
    var costCenterOption = row.cost_center ? { value: row.cost_center.id, label: row.cost_center.code } : null;
    var moneda = row.currency || "COP";

    this.setState(Object.assign({
      modal: true, modeEdit: true, editId: row.id, ErrorValues: true, saving: false,
      form: {
        cost_center_id: row.cost_center_id || "",
        user_invoice_id: row.user_invoice_id || "",
        invoice_name: row.invoice_name || "",
        invoice_date: row.invoice_date || "",
        description: row.description || "",
        invoice_number: row.invoice_number || "",
        identification: row.identification || "",
        invoice_type: row.invoice_type || "",
        invoice_value: row.invoice_value || "",
        invoice_tax: row.invoice_tax || "",
        invoice_total: row.invoice_total || "",
        type_identification_id: row.type_identification_id || "",
        payment_type_id: row.payment_type_id || "",
        currency: moneda,
        foreign_value: row.foreign_value || "",
        foreign_tax: row.foreign_tax || "",
        foreign_total: row.foreign_total || "",
        exchange_rate: row.exchange_rate || "",
        exchange_rate_date: row.exchange_rate_date || "",
        exchange_rate_source: row.exchange_rate_source || "",
        cop_manual_override: !!row.cop_manual_override,
      },
      selectedCostCenter: costCenterOption,
      formCostCenterOptions: costCenterOption ? [costCenterOption] : [],
      selectedUser: row.user_invoice ? { value: row.user_invoice.id, label: row.user_invoice.names } : null,
      selectedType: row.type_identification ? { value: row.type_identification.id, label: row.type_identification.name } : null,
      selectedPayment: row.payment_type ? { value: row.payment_type.id, label: row.payment_type.name } : null,
      selectedCurrency: self.currencyOption(moneda),
    }, estadoComprobanteVacio(), {
      // Se guarda el ID DEL GASTO, nunca `row.receipt_file.url`: esa URL esta
      // firmada y caduca a los 600 s. El destino se arma siempre contra
      // /download_receipt/report_expenses/:id.
      receiptExistingId: row.receipt_file && row.receipt_file.url ? row.id : null,
      receiptExistingUrl: row.receipt_file && row.receipt_file.url ? row.receipt_file.url : "",
    }));

    this.loadBudgetAvailability(row.user_invoice_id, row.id);
  }.bind(this);

  currencyOption = function(code) {
    var encontrada = (this.currencyOptions || []).filter(function(o) { return o.value === code; })[0];
    return encontrada || { value: code, label: code };
  }.bind(this);

  closeModal = function() { this.setState({ modal: false }); }.bind(this);

  handleFormChange = function(e) {
    var self = this;
    var name = e.target.name;
    var value = e.target.value;
    this.setState({ form: Object.assign({}, this.state.form, { [name]: value }) }, function() {
      // La TRM depende de la fecha de la factura: cambiarla con moneda
      // extranjera obliga a volver a consultar, o se guardaria la tasa de otro
      // dia.
      if (name === "invoice_date" && self.state.form.currency !== "COP") self.fetchExchangeRate();
    });
  }.bind(this);

  // Los TRES campos en COP. Siguen editables con moneda extranjera (§1.3), y si
  // el usuario los toca se marcan LAS DOS banderas: sin `cop_manual_override` el
  // servidor recalcula desde foreign_* x TRM y pisa el ajuste en silencio.
  handleFormChangeMoney = function(e) {
    var self = this;
    var value = e.target.value.replace(/\$|,/g, "");
    var newForm = Object.assign({}, this.state.form, { [e.target.name]: value });
    if (newForm.currency && newForm.currency !== "COP") {
      newForm.cop_manual_override = true;
      newForm.exchange_rate_source = "manual";
    }
    // Redondeado a dos: sumar dos floats da 119000.11999999999 y ese numero
    // es el que viajaba al servidor. El modelo lo vuelve a redondear (es el
    // guardian de los cuatro canales); aqui se hace ademas para que el usuario
    // vea el mismo numero que se va a guardar.
    var total = Math.round(((Number(newForm.invoice_value) || 0) + (Number(newForm.invoice_tax) || 0)) * 100) / 100;
    newForm.invoice_total = total;
    this.setState({ form: newForm }, self.refreshBudgetAvailability);
  }.bind(this);

  // --- Moneda extranjera -----------------------------------------------------

  handleChangeCurrency = function(opt) {
    var self = this;
    var code = opt ? opt.value : "COP";
    var f = Object.assign({}, this.state.form, { currency: code });
    if (code === "COP") {
      // Volver a COP limpia TODO lo extranjero: un foreign_value colgando con
      // currency COP haria que la tabla y los exportables muestren un valor
      // extranjero de una moneda que ya no es.
      f.foreign_value = ""; f.foreign_tax = ""; f.foreign_total = "";
      f.exchange_rate = ""; f.exchange_rate_date = ""; f.exchange_rate_source = "";
      f.cop_manual_override = false;
    }
    this.setState(
      { selectedCurrency: opt, form: f, exchange: Object.assign({}, EXCHANGE_VACIO) },
      code === "COP" ? undefined : self.fetchExchangeRate
    );
  }.bind(this);

  handleFormChangeForeignMoney = function(e) {
    var self = this;
    var v = e.target.value.replace(/\$|,/g, "");
    this.setState({ form: Object.assign({}, this.state.form, { [e.target.name]: v }) }, self.recomputeConversion);
  }.bind(this);

  handleChangeRate = function(e) {
    var self = this;
    var v = e.target.value.replace(/\$|,/g, "");
    this.setState({ form: Object.assign({}, this.state.form, { exchange_rate: v, exchange_rate_source: "manual" }) }, self.recomputeConversion);
  }.bind(this);

  handleToggleCopManual = function(e) {
    var on = !!e.target.checked;
    var self = this;
    // Recalcular DESPUES de cambiar la bandera, en los dos sentidos: al
    // desmarcarla hay que devolver los COP a lo que dice la TRM (antes se
    // quedaban con el valor manual hasta que el usuario tocara otro campo), y al
    // marcarla hay que refrescar igual el total extranjero, que no depende de la
    // tasa.
    this.setState({ form: Object.assign({}, this.state.form, {
      cop_manual_override: on,
      exchange_rate_source: on ? "manual" : this.state.form.exchange_rate_source,
    }) }, self.recomputeConversion);
  }.bind(this);

  // INVARIANTE: invoice_value / invoice_tax / invoice_total SIEMPRE en COP. El
  // valor extranjero jamas se escribe en esos tres campos; si se rompe,
  // recalculate_cost_center corrompe el % de viaticos de todos los centros en
  // silencio.
  recomputeConversion = function() {
    var self = this;
    var f = this.state.form;
    if (f.currency === "COP") return;

    var rate = parseFloat(f.exchange_rate) || 0;
    var fv = parseFloat(f.foreign_value) || 0;
    var ft = parseFloat(f.foreign_tax) || 0;
    var round2 = function(x) { return Math.round(x * 100) / 100; };

    // EL TOTAL EXTRANJERO SE CALCULA SIEMPRE. Es aritmetica dentro de la misma
    // moneda (valor + impuesto): no depende de la TRM ni del ajuste manual del
    // COP. Antes vivia dentro del early return de `cop_manual_override`, asi que
    // marcar la casilla dejaba el campo "Total en USD" vacio o desactualizado
    // aunque el usuario siguiera editando el valor y el impuesto.
    var cambios = { foreign_total: round2(fv + ft) };

    // Lo unico que protege la casilla son los tres campos en COP.
    if (!f.cop_manual_override) {
      cambios.invoice_value = round2(fv * rate);
      cambios.invoice_tax = round2(ft * rate);
      // El round2 EXTERIOR no sobra. Sumar dos numeros ya redondeados vuelve a
      // producir binario sucio: 314414 + 59738.66 da 374152.66000000003 en JS, y
      // ese valor se pinta tal cual en el campo Total y viaja asi en el
      // FormData. Verificado en pantalla contra USD 100 + 19 con TRM 3.144,14.
      cambios.invoice_total = round2(round2(fv * rate) + round2(ft * rate));
    }

    this.setState({ form: Object.assign({}, this.state.form, cambios) },
                  self.refreshBudgetAvailability);
  }.bind(this);

  fetchExchangeRate = function() {
    var self = this;
    var f = this.state.form;
    if (f.currency === "COP") return;

    // ANTES ESTO ERA UN `return` MUDO. Sin fecha del gasto el boton no hacia
    // nada: ni spinner, ni error, ni mensaje. Desde fuera se veia como un boton
    // roto. La TRM se pide SIEMPRE para una fecha concreta, asi que sin ella no
    // hay consulta posible; lo que faltaba era decirlo.
    if (!f.invoice_date) {
      this.setState({ exchange: { status: "error", requested_date: null, rate_date: null, source: null,
        message: "Indique primero la fecha del gasto: la TRM se consulta para esa fecha." } });
      return;
    }

    this.setState({ exchange: { status: "loading", message: null, rate_date: null, requested_date: f.invoice_date, source: null } });

    fetch("/get_exchange_rate?currency=" + encodeURIComponent(f.currency) + "&date=" + encodeURIComponent(f.invoice_date),
          { headers: { "X-CSRF-Token": csrfToken() } })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.type === "error") {
          // NO se inventa una tasa: el usuario la escribe a mano y el guardado
          // no se bloquea.
          self.setState({ exchange: { status: "error", message: (d.message || []).join(" "), rate_date: null, requested_date: f.invoice_date, source: null } });
          return;
        }
        self.setState({
          form: Object.assign({}, self.state.form, {
            exchange_rate: d.rate_to_cop, exchange_rate_date: d.rate_date, exchange_rate_source: d.source,
          }),
          exchange: { status: "ok", message: null, rate_date: d.rate_date, requested_date: d.requested_date, source: d.source },
        }, self.recomputeConversion);
      })
      .catch(function() {
        self.setState({ exchange: { status: "error", message: "No se pudo consultar la tasa. Ingrésela manualmente.", rate_date: null, requested_date: f.invoice_date, source: null } });
      });
  }.bind(this);

  // --- Comprobante -----------------------------------------------------------

  handleFileReceipt = function(e) {
    this.aceptarComprobante(e.target.files && e.target.files[0]);
  }.bind(this);

  // UNICA puerta de entrada del comprobante: la usan el selector de archivos y
  // el arrastre. Estaba escrita dentro de handleFileReceipt y el arrastre habria
  // duplicado las dos validaciones —que es justo como se termina aceptando por
  // arrastre un archivo que el boton rechaza.
  aceptarComprobante = function(file) {
    var vacio = { receiptFile: null, receiptFileName: "", receiptSize: 0 };
    if (!file) { this.setState(Object.assign({}, vacio, { receiptError: null })); return; }

    var ext = (file.name.split(".").pop() || "").toLowerCase();
    if (EXTENSIONES_COMPROBANTE.indexOf(ext) === -1) {
      this.setState(Object.assign({}, vacio, { receiptError: "Formato no permitido. Use JPG, PNG, WEBP, HEIC o PDF." }));
      return;
    }
    if (file.size > TAMANO_MAXIMO_COMPROBANTE) {
      this.setState(Object.assign({}, vacio, { receiptError: "El archivo supera los 20 MB permitidos." }));
      return;
    }
    this.setState({ receiptFile: file, receiptFileName: file.name, receiptSize: file.size, receiptError: null },
                  this.validarReglas);
  }.bind(this);

  // Evalua las reglas de gasto contra lo que hay AHORA en el formulario.
  //
  // Se dispara al adjuntar el comprobante porque ese es el momento en que la
  // persona tiene la factura delante: enterarse ahi de que tiene 90 dias, o de
  // que supera el tope, le permite arreglarlo o desistir antes de llenar el
  // resto. Al pulsar Guardar se vuelve a validar EN EL SERVIDOR, que es quien
  // rechaza; esto no sustituye nada, solo adelanta el aviso.
  //
  // Delega en /validate_expense_rules, que corre el MISMO ExpenseRuleService
  // que la validacion del modelo. Evaluar las reglas aqui en JavaScript las
  // dejaria contradiciendose con el servidor en cuanto una cambiara, y la de
  // duplicados ni siquiera es evaluable sin consultar la base.
  validarReglas = function() {
    var self = this;
    var f = this.state.form;
    if (!f.user_invoice_id) return;

    fetch("/validate_expense_rules", {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken(), "Content-Type": "application/json" },
      body: JSON.stringify({
        id: self.state.modeEdit ? self.state.editId : null,
        user_invoice_id: f.user_invoice_id,
        cost_center_id: f.cost_center_id,
        invoice_date: f.invoice_date,
        invoice_number: f.invoice_number,
        identification: f.identification,
        invoice_value: f.invoice_value,
        invoice_tax: f.invoice_tax,
        invoice_total: f.invoice_total,
      }),
    })
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(data) {
        // Un fallo del chequeo NO puede estorbar: el servidor valida igual al
        // guardar. Se limpia el aviso y ya.
        self.setState({ ruleViolations: (data && data.violations) || [] });
      })
      .catch(function() { self.setState({ ruleViolations: [] }); });
  }.bind(this);

  // --- Arrastrar y soltar ----------------------------------------------------
  //
  // preventDefault en dragOver es OBLIGATORIO: sin el, el navegador no considera
  // la zona un destino valido, nunca dispara drop y ABRE EL ARCHIVO en la
  // pestana, perdiendo el formulario a medio llenar.
  handleReceiptDragOver = function(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!this.state.receiptDragging) this.setState({ receiptDragging: true });
  }.bind(this);

  handleReceiptDragLeave = function(e) {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ receiptDragging: false });
  }.bind(this);

  handleReceiptDrop = function(e) {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ receiptDragging: false });
    var dt = e.dataTransfer;
    // Solo el primero: el gasto tiene UN comprobante, y aceptar en silencio el
    // ultimo de tres arrastrados es peor que ignorar los otros dos.
    this.aceptarComprobante(dt && dt.files && dt.files[0]);
  }.bind(this);

  abrirSelectorComprobante = function() {
    if (this._receiptInput) this._receiptInput.click();
  }.bind(this);

  handleDeleteReceipt = function() {
    var self = this;
    if (!this.state.modeEdit || !this.state.receiptExistingId) return;

    Swal.fire({
      title: "¿Quitar el comprobante?",
      text: "El archivo se eliminará del gasto.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#2a3f53",
      cancelButtonColor: "#dc3545",
      confirmButtonText: "Sí, quitar",
      cancelButtonText: "Cancelar",
    }).then(function(result) {
      if (!result.value) return;
      fetch("/delete_receipt/report_expenses/" + self.state.editId, {
        method: "DELETE",
        headers: { "X-CSRF-Token": csrfToken(), "Content-Type": "application/json" },
      })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.type !== "success") {
            Swal.fire({ icon: "error", title: "No se pudo quitar el comprobante", text: (data.message || []).join(" "), confirmButtonColor: "#2a3f53" });
            return;
          }
          self.setState({ receiptExistingId: null, receiptExistingUrl: "" });
          self.loadData();
        })
        .catch(function() {
          Swal.fire({ icon: "error", title: "No se pudo quitar el comprobante", confirmButtonColor: "#2a3f53" });
        });
    });
  }.bind(this);

  // openReceiptPreview / closeReceiptPreview los define ESTE paquete y viven
  // FUERA del constructor: la columna "Comprobante" de this.columns (paquete 09)
  // llama a openReceiptPreview(id) por nombre. Renombrarlos obliga a actualizar
  // la Tarea 2 del 09 en el mismo PR.
  // UNICO punto de entrada al comprobante desde la tabla y desde el formulario.
  //
  // Imagen -> modal (se puede mirar sin salir de la pantalla).
  // Cualquier otra cosa (PDF, etc.) -> descarga directa, SIN modal: un visor
  // de PDF embebido no aporta nada sobre el del navegador, y abrir un modal
  // para que el usuario tenga que pulsar "Descargar" es un clic de mas.
  abrirComprobante = function(id, pista) {
    if (esComprobanteImagen(pista)) { this.openReceiptPreview(id, pista); return; }
    window.open("/download_receipt/report_expenses/" + id, "_blank", "noopener");
  }.bind(this);

  openReceiptPreview = function(id, name) {
    this.setState({ receiptPreview: { open: true, id: id, name: name || "" }, receiptPreviewError: false });
  }.bind(this);

  closeReceiptPreview = function() {
    this.setState({ receiptPreview: { open: false, id: null, name: "" }, receiptPreviewError: false });
  }.bind(this);

  // --- Captura asistida ------------------------------------------------------

  handleExtract = function() {
    var self = this;
    if (!(this.state.receiptFile instanceof File)) {
      this.setState({ extraction: Object.assign({}, EXTRACTION_VACIA, { status: "error", message: "Primero seleccione el archivo del comprobante." }) });
      return;
    }

    var fd = new FormData();
    fd.append("file", this.state.receiptFile);
    if (this.state.form.cost_center_id) fd.append("cost_center_id", this.state.form.cost_center_id);

    this.setState({ extraction: Object.assign({}, EXTRACTION_VACIA, { status: "loading" }) });

    fetch("/extract_receipt/report_expenses", { method: "POST", body: fd, headers: { "X-CSRF-Token": csrfToken() } })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.type === "error") {
          // El registro manual NUNCA se bloquea por un fallo de la lectura.
          self.setState({ extraction: Object.assign({}, EXTRACTION_VACIA, { status: "error", message: (d.message || []).join(" ") }) });
          return;
        }
        // WHITELIST de 15 claves. `budget_status`, `accounting_*`,
        // `expense_budget_id`, `is_acepted`, `cost_center_id` y
        // `user_invoice_id` no se sobreescriben jamas desde la extraccion.
        var allowed = ["invoice_name", "identification", "invoice_number", "invoice_date", "description",
                       "currency", "foreign_value", "foreign_tax", "foreign_total",
                       "exchange_rate", "exchange_rate_date", "exchange_rate_source",
                       "invoice_value", "invoice_tax", "invoice_total"];
        var f = Object.assign({}, self.state.form);
        var filled = [];
        allowed.forEach(function(k) {
          var v = d.fields ? d.fields[k] : null;
          // null deja el input VACIO: no se rellena con "—", "N/A" ni con el
          // valor previo.
          if (v === null || v === undefined || v === "") return;
          f[k] = v; filled.push(k);
        });

        var newState = {
          form: f,
          extraction: { status: "done", message: null, filled: filled,
                        confidence: d.confidence || {}, warnings: d.warnings || [] },
        };
        if (f.currency && f.currency !== "COP") newState.selectedCurrency = self.currencyOption(f.currency);
        // NADA SE GUARDA SOLO: la extraccion precarga y la persona pulsa Guardar.
        self.setState(newState);
      })
      .catch(function() {
        self.setState({ extraction: Object.assign({}, EXTRACTION_VACIA, { status: "error", message: "No se pudo leer el comprobante. Complete los datos manualmente." }) });
      });
  }.bind(this);

  // --- Disponible presupuestal (informativo, nunca bloquea) ------------------

  refreshBudgetAvailability = function() {
    this.loadBudgetAvailability(this.state.form.user_invoice_id, this.state.modeEdit ? this.state.editId : null);
  }.bind(this);

  loadBudgetAvailability = function(userId, excludeExpenseId) {
    var self = this;
    if (this._availTimer) clearTimeout(this._availTimer);

    if (!userId || !this.state.form.cost_center_id) {
      this.setState({ budgetAvailability: Object.assign({}, DISPONIBLE_VACIO) });
      return;
    }

    this.setState({ budgetAvailability: Object.assign({}, this.state.budgetAvailability || DISPONIBLE_VACIO, { loading: true, error: null }) });

    this._availTimer = setTimeout(function() {
      var qs = "cost_center_id=" + self.state.form.cost_center_id + "&user_id=" + userId;
      // exclude_expense_id en modo edicion: sin el, el gasto que se esta
      // editando se cuenta a si mismo y el disponible sale rebajado dos veces.
      if (excludeExpenseId) qs += "&exclude_expense_id=" + excludeExpenseId;

      fetch("/get_expense_budget_available?" + qs, { headers: { "X-CSRF-Token": csrfToken() } })
        .then(function(r) { return r.json(); })
        .then(function(d) {
          if (d.type === "error") {
            self.setState({ budgetAvailability: Object.assign({}, DISPONIBLE_VACIO, { error: (d.message || []).join(" ") }) });
            return;
          }
          self.setState({ budgetAvailability: { loading: false, error: null, has_budget: !!d.has_budget, assigned: d.assigned, spent: d.spent, available: d.available } });
        })
        .catch(function() {
          self.setState({ budgetAvailability: Object.assign({}, DISPONIBLE_VACIO, { error: "No se pudo consultar el disponible" }) });
        });
    }, 400);
  }.bind(this);

  handleFormCostCenterSearch = function(inputValue) {
    var self = this;
    if (!inputValue || inputValue.length < 3) { self.setState({ formCostCenterOptions: [] }); return; }
    if (self._formCcTimer) clearTimeout(self._formCcTimer);
    self._formCcTimer = setTimeout(function() {
      self.setState({ formCostCenterLoading: true });
      fetch("/search_cost_centers?q=" + encodeURIComponent(inputValue) + "&exclude_finalized=true", { headers: { "X-CSRF-Token": csrfToken() } })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          self.setState({ formCostCenterOptions: data.map(function(d) { return { value: d.id, label: d.label }; }), formCostCenterLoading: false });
        });
    }, 300);
  }.bind(this);

  handleSubmit = function() {
    var self = this;
    var form = this.state.form;

    if (!form.cost_center_id || !form.user_invoice_id || !form.invoice_name || !form.invoice_date) {
      this.setState({ ErrorValues: false });
      return;
    }

    // COMPROBANTE OBLIGATORIO AL CREAR. El servidor tambien lo rechaza (es el
    // guardian de verdad); aqui se corta antes para no gastarle a la persona
    // una subida y un viaje al servidor por algo que se ve desde el formulario.
    // Al EDITAR no se exige: los ~7.000 gastos historicos no tienen comprobante
    // y con esto no se podrian ni tocar.
    if (this.estados.receipt_required && !this.state.modeEdit && !(this.state.receiptFile instanceof File)) {
      this.setState({ receiptError: "Adjunte el comprobante: es obligatorio." });
      return;
    }

    var isEdit = this.state.modeEdit;
    var url = isEdit ? "/report_expenses/" + this.state.editId : "/report_expenses";
    var method = isEdit ? "PATCH" : "POST";

    // FormData y no JSON, porque ahora el gasto puede llevar un archivo.
    // `fd.append(k, "")` para los vacios: FormData convierte undefined en el
    // string "undefined", que un to_f en el servidor lee como 0.0.
    var fd = new FormData();
    ["cost_center_id", "user_invoice_id", "invoice_name", "invoice_date", "description", "invoice_number",
     "identification", "invoice_type", "invoice_value", "invoice_tax", "invoice_total",
     "type_identification_id", "payment_type_id",
     "currency", "foreign_value", "foreign_tax", "foreign_total",
     "exchange_rate", "exchange_rate_date", "exchange_rate_source", "cop_manual_override"
    ].forEach(function(k) { fd.append(k, form[k] === null || form[k] === undefined ? "" : form[k]); });

    // Solo si es un File: hacer el append siempre manda el string
    // "[object Object]" cuando no hay archivo.
    if (this.state.receiptFile instanceof File) fd.append("receipt_file", this.state.receiptFile);

    this.setState({ saving: true });

    // NUNCA se fija Content-Type con FormData: el navegador tiene que escribir
    // el boundary. Si se pone a mano, Rails recibe el body como basura y el
    // gasto se crea SIN comprobante y sin error visible.
    fetch(url, { method: method, headers: { "X-CSRF-Token": csrfToken() }, body: fd })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        // `type === "error"` con HTTP 200 es la convencion del proyecto: el
        // modal no se cierra y el mensaje del servidor se muestra tal cual.
        if (data.type === "error") {
          self.setState({ saving: false });

          // LAS REGLAS DE GASTO SON DURAS: el servidor RECHAZA el gasto y este
          // modal se queda abierto con los datos puestos, para corregir sin
          // volver a escribirlo todo. Se separa del error generico porque no es
          // un fallo del sistema sino una decision de negocio, y el usuario
          // necesita leer QUE regla incumplio, no "ocurrió un error".
          var violaciones = data.rule_violations || [];
          if (violaciones.length > 0) {
            Swal.fire({
              icon: "warning",
              title: "No se puede guardar: incumple las reglas de gasto",
              html: "<ul style=\"text-align:left;margin:8px auto;max-width:26em\">" +
                    violaciones.map(function(v) { return "<li>" + escaparHtml(v.message || "") + "</li>"; }).join("") +
                    "</ul>",
              confirmButtonColor: "#2a3f53",
              confirmButtonText: "Corregir",
            });
            return;
          }

          Swal.fire({ icon: "error", title: "¡Ocurrió un error!", text: (data.message || []).join(" "), confirmButtonColor: "#2a3f53" });
          return;
        }
        self.setState({ modal: false, saving: false });
        self.loadData();

        Swal.fire({ position: "center", icon: "success", title: data.success || (isEdit ? "Actualizado" : "Creado"), showConfirmButton: false, timer: 1500 });
      })
      .catch(function() {
        self.setState({ saving: false });
        Swal.fire({ icon: "error", title: "No se pudo guardar el gasto", confirmButtonColor: "#2a3f53" });
      });
  }.bind(this);

  handleDelete = function(row) {
    var self = this;
    Swal.fire({
      title: "¿Estás seguro?",
      text: "El registro será eliminado permanentemente",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#2a3f53",
      cancelButtonColor: "#dc3545",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    }).then(function(result) {
      if (result.value) {
        fetch("/report_expenses/" + row.id, { method: "DELETE", headers: { "X-CSRF-Token": csrfToken() } })
          .then(function(r) { return r.json(); })
          .then(function() {
            self.loadData();
            Swal.fire({ title: "Eliminado", icon: "success", timer: 1500, showConfirmButton: false });
          });
      }
    });
  }.bind(this);

  openStatusEdit = function(rowId) {
    this.setState({ editingStatusId: rowId });
  }.bind(this);

  closeStatusEdit = function() {
    this.setState({ editingStatusId: null });
  }.bind(this);

  updateStatus = function(e, row) {
    var self = this;
    var newStatus = e.target.value;
    var statusText = newStatus === "true" ? "Aceptado" : "Creado";

    fetch("/update_state_report_expense/" + row.id + "/" + newStatus, {
      method: "PATCH",
      headers: { "X-CSRF-Token": csrfToken(), "Content-Type": "application/json" },
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        self.setState({ editingStatusId: null });
        self.loadData();
      });
  }.bind(this);

  openMenu = function(e) { window.cmOpenMenu(e); }.bind(this);

  getRowActions = function(row) {
    var self = this;
    var estados = this.props.estados;

    // Solo mostrar acciones si no está aceptado o si tiene permiso closed
    if (!row.is_acepted || estados.closed) {
      var hasEdit = estados.edit && row.cost_center && row.cost_center.execution_state !== "FINALIZADO";
      var hasDelete = estados.delete;

      if (!hasEdit && !hasDelete) return null;

      return React.createElement("div", { className: "cm-dt-menu" },
        React.createElement("button", { className: "cm-dt-menu-trigger", onClick: self.openMenu },
          React.createElement("i", { className: "fas fa-ellipsis-v" })
        ),
        React.createElement("div", { className: "cm-dt-menu-dropdown" },
          hasEdit && React.createElement("button", {
            onClick: function() { self.openEditModal(row); },
            className: "cm-dt-menu-item"
          }, React.createElement("i", { className: "fas fa-pen" }), " Editar"),
          hasDelete && React.createElement("button", {
            onClick: function() { self.handleDelete(row); },
            className: "cm-dt-menu-item cm-dt-menu-item--danger"
          }, React.createElement("i", { className: "fas fa-trash" }), " Eliminar")
        )
      );
    }
    return null;
  }.bind(this);

  renderFilters = function() {
    var self = this;
    var f = this.state.filters;

    return React.createElement("div", { style: { marginBottom: 16 } },
      React.createElement("div", { className: "cm-filter-panel" },
        // Header con botón cerrar
        React.createElement("div", { style: { padding: "14px 20px", borderBottom: "1px solid var(--cm-border)", display: "flex", alignItems: "center", justifyContent: "space-between" } },
          React.createElement("span", { style: { fontFamily: "'Poppins', sans-serif", fontSize: 13, fontWeight: 600, color: "var(--cm-text-muted)" } },
            React.createElement("i", { className: "fas fa-filter", style: { marginRight: 8, opacity: 0.6 } }),
            "Filtros avanzados"
          ),
          React.createElement("button", { onClick: self.toggleFilters, className: "cm-dt-action-btn", title: "Cerrar filtros", style: { width: 28, height: 28 } },
            React.createElement("i", { className: "fas fa-times" })
          )
        ),
        // Content - Grid de 4 columnas
        React.createElement("div", { className: "cm-filter-grid" },
          // Row 1
          React.createElement("div", { className: "cm-form-group", style: { marginBottom: 0 } },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-building", style: { marginRight: 6, opacity: 0.5 } }),
              "Centro de costo",
              React.createElement("span", { className: "cm-hint", style: { marginLeft: 4 } }, "(3+ letras)")
            ),
            React.createElement(Select, {
              options: self.state.filterCostCenterOptions,
              value: self.state.filterCostCenter,
              onChange: function(opt) { self.setState({ filterCostCenter: opt, filters: Object.assign({}, f, { cost_center_id: opt ? opt.value : "" }) }); },
              onInputChange: self.handleFilterCostCenterSearch,
              isLoading: self.state.filterCostCenterLoading,
              placeholder: "Buscar centro...",
              isClearable: true,
              noOptionsMessage: function() { return "Escribe al menos 3 letras"; },
              styles: selectStyles,
              menuPortalTarget: document.body,
            })
          ),
          React.createElement("div", { className: "cm-form-group", style: { marginBottom: 0 } },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-user", style: { marginRight: 6, opacity: 0.5 } }),
              "Responsable"
            ),
            React.createElement(Select, {
              options: self.userOptions,
              value: self.state.filterUser,
              onChange: function(opt) { self.setState({ filterUser: opt, filters: Object.assign({}, f, { user_invoice_id: opt ? opt.value : "" }) }); },
              placeholder: "Seleccione responsable...",
              isClearable: true,
              styles: selectStyles,
              menuPortalTarget: document.body,
            })
          ),
          React.createElement("div", { className: "cm-form-group", style: { marginBottom: 0 } },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-calendar", style: { marginRight: 6, opacity: 0.5 } }),
              "Fecha desde"
            ),
            React.createElement("input", { type: "date", name: "start_date", className: "cm-input", value: f.start_date, onChange: self.handleFilterChange })
          ),
          React.createElement("div", { className: "cm-form-group", style: { marginBottom: 0 } },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-calendar", style: { marginRight: 6, opacity: 0.5 } }),
              "Fecha hasta"
            ),
            React.createElement("input", { type: "date", name: "end_date", className: "cm-input", value: f.end_date, onChange: self.handleFilterChange })
          ),
          // Row 2
          React.createElement("div", { className: "cm-form-group", style: { marginBottom: 0 } },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-flag", style: { marginRight: 6, opacity: 0.5 } }),
              "Estado"
            ),
            React.createElement("select", { name: "is_acepted", className: "cm-input", value: f.is_acepted, onChange: self.handleFilterChange },
              React.createElement("option", { value: "" }, "Todos"),
              React.createElement("option", { value: "true" }, "Aceptado"),
              React.createElement("option", { value: "false" }, "No aceptado")
            )
          ),
          React.createElement("div", { className: "cm-form-group", style: { marginBottom: 0 } },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-coins", style: { marginRight: 6, opacity: 0.5 } }),
              "Estado presupuestal"
            ),
            React.createElement("select", { name: "budget_status", className: "cm-input", value: f.budget_status, onChange: self.handleFilterChange, "data-testid": "filter-budget-status" },
              React.createElement("option", { value: "" }, "Todos"),
              React.createElement("option", { value: "aprobado" }, "Aprobado"),
              React.createElement("option", { value: "excedido" }, "Excedido"),
              React.createElement("option", { value: "sin_presupuesto" }, "Sin presupuesto")
            )
          ),
          React.createElement("div", { className: "cm-form-group", style: { marginBottom: 0 } },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-money-bill-wave", style: { marginRight: 6, opacity: 0.5 } }),
              "Moneda"
            ),
            React.createElement("select", { name: "currency", className: "cm-input", value: f.currency, onChange: self.handleFilterChange, "data-testid": "filter-currency" },
              [React.createElement("option", { key: "", value: "" }, "Todas")].concat(
                self.currencyOptions.map(function(c) {
                  return React.createElement("option", { key: c.value, value: c.value }, c.label);
                })
              )
            )
          ),
          // Fila 3
          React.createElement("div", { className: "cm-form-group", style: { marginBottom: 0 } },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-file-invoice-dollar", style: { marginRight: 6, opacity: 0.5 } }),
              "Estado contable"
            ),
            React.createElement("select", { name: "accounting_approved", className: "cm-input", value: f.accounting_approved, onChange: self.handleFilterChange, "data-testid": "filter-accounting-approved" },
              React.createElement("option", { value: "" }, "Todos"),
              React.createElement("option", { value: "true" }, "Contabilizado"),
              React.createElement("option", { value: "false" }, "No contabilizado")
            )
          ),
          React.createElement("div", { style: { gridColumn: "1 / -1", display: "flex", alignItems: "flex-end", justifyContent: "flex-end", gap: 10 } },
            React.createElement("button", { className: "cm-btn cm-btn-outline cm-btn-sm", type: "button", onClick: self.clearFilters },
              React.createElement("i", { className: "fas fa-eraser" }), " Limpiar"
            ),
            React.createElement("button", { className: "cm-btn cm-btn-accent cm-btn-sm", type: "button", onClick: self.applyFilters },
              React.createElement("i", { className: "fas fa-search" }), " Aplicar filtros"
            )
          )
        )
      )
    );
  }.bind(this);

  // Aviso de disponible presupuestal. INFORMATIVO: nunca deshabilita Guardar.
  // Un gasto que excede el cupo se guarda igual y queda marcado como "Excedido"
  // (§2.1); bloquearlo aqui seria un defecto, no una mejora.
  renderBudgetHint = function() {
    var a = this.state.budgetAvailability;
    if (!a || a.loading || a.error) return null;

    if (!a.has_budget) {
      return React.createElement("div", { className: "cm-field-hint", "data-testid": "expense-budget-none" },
        "Esta persona no tiene presupuesto asignado en este centro de costos.");
    }

    var disponible = parseFloat(a.available || 0);
    var valor = parseFloat(this.state.form.invoice_value || 0);

    if (valor <= disponible) {
      return React.createElement("div", { className: "cm-field-hint", "data-testid": "expense-budget-ok" },
        "Disponible: ",
        React.createElement(NumberFormat, { value: disponible, displayType: "text", thousandSeparator: true, prefix: "$" }));
    }

    return React.createElement("div", { className: "cm-alert cm-alert-warning", "data-testid": "expense-budget-warning" },
      "Este gasto excede el disponible en ",
      React.createElement(NumberFormat, { value: valor - disponible, displayType: "text", thousandSeparator: true, prefix: "$" }),
      ". Se guardará marcado como ",
      React.createElement("strong", null, "Excedido"), ".");
  }.bind(this);

  // Estados de la consulta de TRM. Un fallo es ADVERTENCIA, no bloqueo: la
  // persona escribe la tasa a mano y `exchange_rate_source` pasa a "manual".
  renderRateStatus = function() {
    var e = this.state.exchange || EXCHANGE_VACIO;
    var f = this.state.form;

    // EL ERROR VA PRIMERO. Con la tasa escrita a mano, `exchange_rate_source` es
    // "manual", y esa rama devolvia antes de llegar aqui: el aviso de por que
    // fallo la consulta quedaba tapado por el texto "Tasa ingresada manualmente"
    // y el usuario no veia nada al pulsar el boton.
    if (e.status === "error") {
      return React.createElement("div", { className: "cm-alert cm-alert-warning", "data-testid": "expense-rate-error" }, e.message);
    }
    if (e.status === "loading") {
      return React.createElement("div", { className: "cm-field-hint", "data-testid": "expense-rate-loading" },
        React.createElement("i", { className: "fa fa-spinner fa-spin" }), " Consultando la tasa…");
    }
    if (f.exchange_rate_source === "manual") {
      return React.createElement("div", { className: "cm-field-hint" }, "Tasa ingresada manualmente");
    }
    if (e.status === "ok" && e.rate_date !== e.requested_date) {
      return React.createElement("div", { className: "cm-alert cm-alert-warning", "data-testid": "expense-rate-shifted" },
        "No hay tasa para el " + e.requested_date + "; se aplicó la del " + e.rate_date + ".");
    }
    if (e.status === "ok") {
      return React.createElement("div", { className: "cm-field-hint", "data-testid": "expense-rate-ok" },
        "Tasa de " + e.rate_date + " (" + e.source + ")");
    }
    return null;
  }.bind(this);

  renderForeignBlock = function() {
    var self = this;
    var f = this.state.form;
    if (!f || !f.currency || f.currency === "COP") return null;

    return React.createElement("div", { className: "cm-budget-foreign", "data-testid": "expense-foreign-block" },
      React.createElement("div", { className: "cm-form-grid-2" },
        React.createElement("div", { className: "cm-form-group" },
          React.createElement("label", { className: "cm-label" },
            "Valor en " + f.currency),
          React.createElement(NumberFormat, { name: "foreign_value", thousandSeparator: true, className: "cm-input",
            value: f.foreign_value || "", onChange: self.handleFormChangeForeignMoney, placeholder: "0",
            "data-testid": "expense-foreign-value" })
        ),
        React.createElement("div", { className: "cm-form-group" },
          React.createElement("label", { className: "cm-label" },
            "IVA en " + f.currency),
          React.createElement(NumberFormat, { name: "foreign_tax", thousandSeparator: true, className: "cm-input",
            value: f.foreign_tax || "", onChange: self.handleFormChangeForeignMoney, placeholder: "0",
            "data-testid": "expense-foreign-tax" })
        ),
        React.createElement("div", { className: "cm-form-group" },
          React.createElement("label", { className: "cm-label" },
            "Total en " + f.currency),
          React.createElement(NumberFormat, { thousandSeparator: true, className: "cm-input", disabled: true,
            style: { background: "#e9ecef" }, value: f.foreign_total || "",
            "data-testid": "expense-foreign-total" })
        ),
        React.createElement("div", { className: "cm-form-group" },
          React.createElement("label", { className: "cm-label" },
            "TRM"),
          React.createElement(NumberFormat, { name: "exchange_rate", thousandSeparator: true, decimalScale: 6,
            className: "cm-input", value: f.exchange_rate || "", onChange: self.handleChangeRate, placeholder: "0",
            "data-testid": "expense-rate" })
        ),
        React.createElement("div", { className: "cm-form-group" },
          React.createElement("label", { className: "cm-label" },
            "Fecha de la tasa"),
          React.createElement("input", { type: "date", name: "exchange_rate_date", className: "cm-input",
            disabled: true, readOnly: true, style: { background: "#e9ecef" }, value: f.exchange_rate_date || "",
            "data-testid": "expense-rate-date" })
        ),
        React.createElement("div", { className: "cm-form-group" },
          React.createElement("label", { className: "cm-label" }, " "),
          React.createElement("button", { type: "button", className: "cm-btn cm-btn-outline cm-btn-sm",
            onClick: self.fetchExchangeRate, "data-testid": "expense-fetch-rate-btn" },
            "Consultar TRM")
        )
      ),

      self.renderRateStatus(),

      React.createElement("div", { className: "cm-info-row", "data-testid": "expense-cop-preview" },
        React.createElement("span", { className: "cm-info-label" }, "Equivalente en COP"),
        React.createElement(NumberFormat, { value: f.invoice_total || 0, displayType: "text",
          thousandSeparator: true, prefix: "$", className: "cm-info-value" })
      ),

      // Marcar esta casilla escribe LAS DOS banderas. Sin `cop_manual_override`
      // el servidor recalcula el COP en cada save y pisa el ajuste en silencio.
      React.createElement("label", { className: "cm-label", style: { marginTop: 8 } },
        React.createElement("input", { type: "checkbox", checked: !!f.cop_manual_override,
          onChange: self.handleToggleCopManual, "data-testid": "expense-cop-manual-toggle" }),
        " Ajusté el valor en COP a mano (no recalcular)")
    );
  }.bind(this);

  renderExtraction = function() {
    var self = this;
    // KILL SWITCH: sin el flag el boton no se pinta. El endpoint de extraccion
    // lo completa Taimes; mientras tanto el formulario se llena a mano.
    if (!receiptExtractionEnabled()) return null;

    var x = this.state.extraction || EXTRACTION_VACIA;

    // TODOS los avisos van a UNA sola lista. Antes cada tipo abria su propia
    // caja de alerta con su propio borde y su propio margen de 16px: una
    // extraccion normal (un warning de tasa + dos reglas + tres campos dudosos)
    // apilaba SEIS cajas debajo del boton y empujaba el formulario fuera de la
    // pantalla, justo cuando lo que hay que hacer es revisar los campos de
    // arriba.
    var avisos = [];

    (x.warnings || []).forEach(function(w, i) {
      avisos.push({ key: "w" + i, tono: "warn", texto: w });
    });

    // SOLO la franja 0,60–0,80. Por debajo de 0,60 el servidor ya manda su
    // propio aviso redactado (CONFIDENCE_WARN en receipt_extraction_service.rb),
    // asi que pintar todo lo menor que 0,80 mostraba el MISMO campo dos veces:
    // una con texto entendible y otra con la clave cruda ("provider_name").
    Object.keys(x.confidence || {}).forEach(function(k) {
      var c = x.confidence[k];
      if (!(c >= 0.6 && c < 0.8)) return;
      avisos.push({
        key: "c" + k,
        tono: "info",
        texto: "Revise " + (ETIQUETAS_EXTRACCION[k] || k) + ": la lectura no es del todo segura.",
        testid: "expense-low-confidence-" + k,
      });
    });

    return React.createElement("div", { className: "cm-extract" },
      React.createElement("button", {
        type: "button", className: "cm-btn cm-btn-pastel cm-btn-pastel--blue cm-btn-sm",
        onClick: self.handleExtract,
        disabled: !self.state.receiptFileName || x.status === "loading",
        "data-testid": "expense-extract-btn",
      }, React.createElement("i", { className: "fa fa-magic" }), " Extraer datos del comprobante"),

      // La barra indeterminada existe porque la espera llega a 20 s y un spinner
      // quieto tanto rato se lee como "se colgo".
      x.status === "loading"
        ? React.createElement("div", { className: "cm-extract-progress", "data-testid": "expense-extract-loading" },
            React.createElement("div", { className: "cm-extract-progress-bar" }),
            React.createElement("span", { className: "cm-extract-progress-text" },
              React.createElement("i", { className: "fa fa-spinner fa-spin" }),
              " Leyendo el comprobante… Esto puede tardar hasta 20 segundos."))
        : null,

      x.status === "error"
        ? React.createElement("div", { className: "cm-extract-note cm-extract-note--warn", "data-testid": "expense-extract-error" },
            React.createElement("i", { className: "fa fa-exclamation-triangle cm-extract-note-icon" }),
            React.createElement("span", null, (x.message || "") + " Complete los datos manualmente."))
        : null,

      x.status === "done"
        ? React.createElement("div", { className: "cm-extract-result" },
            React.createElement("div", { className: "cm-extract-head", "data-testid": "expense-extract-done" },
              React.createElement("i", { className: "fa fa-check-circle cm-extract-head-icon" }),
              React.createElement("span", null,
                "Se precargaron " + x.filled.length + " campos. ",
                React.createElement("strong", null, "Revíselos antes de guardar."))),

            avisos.length > 0
              ? React.createElement("ul", { className: "cm-extract-notes", "data-testid": "expense-extract-warnings" },
                  avisos.map(function(a) {
                    return React.createElement("li", {
                        key: a.key,
                        className: "cm-extract-note cm-extract-note--" + a.tono,
                        "data-testid": a.testid,
                      },
                      React.createElement("i", {
                        className: "cm-extract-note-icon fa " + (a.tono === "info" ? "fa-info-circle" : "fa-exclamation-triangle"),
                      }),
                      React.createElement("span", null, a.texto));
                  }))
              : null)
        : null
    );
  }.bind(this);

  renderReceiptBlock = function() {
    var self = this;

    return React.createElement("div", { className: "cm-form-group", style: { marginTop: 12 } },
      React.createElement("label", { className: "cm-label" },
        "Comprobante",
        // El asterisco sigue al flag EXPENSE_RECEIPT_REQUIRED: marcarlo mientras
        // el flag esta apagado seria mentirle a la persona.
        self.estados.receipt_required
          ? React.createElement("span", { className: "cm-required" }, " *")
          : null),

      // ZONA DE ARRASTRE. Reemplaza al `<input type="file">` nativo, que en cada
      // navegador se pinta distinto ("Choose File" en ingles aunque la app este
      // en espanol) y no admite soltar el archivo encima, que es como llega la
      // foto de la factura desde el escritorio.
      //
      // El input sigue existiendo y conserva su data-testid: esta oculto por CSS
      // pero presente en el DOM, que es lo unico que necesitan `setInputFiles`
      // de Playwright y los lectores de pantalla.
      React.createElement("div", {
          className: "cm-dropzone"
            + (self.state.receiptDragging ? " cm-dropzone--active" : "")
            + (self.state.receiptFileName ? " cm-dropzone--filled" : ""),
          onDragOver: self.handleReceiptDragOver,
          onDragEnter: self.handleReceiptDragOver,
          onDragLeave: self.handleReceiptDragLeave,
          onDrop: self.handleReceiptDrop,
          onClick: self.abrirSelectorComprobante,
          onKeyDown: function(e) {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); self.abrirSelectorComprobante(); }
          },
          role: "button",
          tabIndex: 0,
          "data-testid": "expense-receipt-dropzone",
        },
        React.createElement("input", {
          type: "file", className: "cm-dropzone-input",
          ref: function(el) { self._receiptInput = el; },
          accept: ".jpg,.jpeg,.png,.webp,.heic,.pdf,image/*,application/pdf",
          onChange: self.handleFileReceipt,
          // Sin esto el clic del input vuelve a burbujear al div, que llama otra
          // vez a input.click(): el selector de archivos se abre en bucle.
          onClick: function(e) { e.stopPropagation(); },
          "data-testid": "expense-receipt-input",
        }),

        self.state.receiptFileName
          ? React.createElement("div", { className: "cm-dropzone-file", "data-testid": "expense-receipt-name" },
              React.createElement("i", { className: "fa fa-file-invoice cm-dropzone-file-icon" }),
              React.createElement("div", { className: "cm-dropzone-file-body" },
                React.createElement("span", { className: "cm-dropzone-file-name" }, self.state.receiptFileName),
                React.createElement("span", { className: "cm-dropzone-file-meta" },
                  pesoLegible(self.state.receiptSize) + " · Haga clic o suelte otro archivo para reemplazarlo")),
              React.createElement("button", {
                type: "button", className: "cm-dropzone-clear", title: "Quitar el archivo",
                onClick: function(e) { e.stopPropagation(); self.aceptarComprobante(null); },
                "data-testid": "expense-receipt-clear",
              }, React.createElement("i", { className: "fa fa-times" })))
          : React.createElement("div", { className: "cm-dropzone-empty" },
              React.createElement("i", { className: "fa fa-cloud-upload-alt cm-dropzone-icon" }),
              React.createElement("span", { className: "cm-dropzone-title" },
                "Arrastre aquí su comprobante"),
              React.createElement("span", { className: "cm-dropzone-hint" },
                "o haga clic para buscarlo · JPG, PNG, WEBP, HEIC o PDF · hasta 20 MB"))
      ),

      self.state.receiptExistingId
        ? React.createElement("div", { className: "cm-field-hint", style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
            // El destino es SIEMPRE /download_receipt/report_expenses/:id: la
            // URL firmada de S3 caduca a los 600 s.
            React.createElement("a", { href: "/download_receipt/report_expenses/" + self.state.receiptExistingId, target: "_blank", rel: "noopener noreferrer" },
              React.createElement("i", { className: "fa fa-download" }), " Ver comprobante actual"),
            React.createElement("button", { type: "button", className: "cm-btn cm-btn-outline cm-btn-sm",
              // La pista es el archivo recien elegido si lo hay, y si no la URL
              // del ya guardado: al editar, `receiptFileName` esta vacio.
              onClick: function() { self.abrirComprobante(self.state.receiptExistingId, self.state.receiptFileName || self.state.receiptExistingUrl); } },
              React.createElement("i", { className: "fa fa-eye" }), " Previsualizar"),
            self.state.modeEdit
              ? React.createElement("button", { type: "button", className: "cm-btn cm-btn-outline cm-btn-sm",
                  onClick: self.handleDeleteReceipt, "data-testid": "expense-receipt-delete" },
                  React.createElement("i", { className: "fa fa-trash" }), " Quitar")
              : null
          )
        : null,

      self.state.receiptError
        ? React.createElement("div", { className: "cm-alert cm-alert-danger", "data-testid": "expense-receipt-error" }, self.state.receiptError)
        : null,

      // Reglas incumplidas, evaluadas al adjuntar. Es un AVISO, no un bloqueo:
      // quien rechaza es el servidor al guardar. Pintarlo aqui le da a la
      // persona la oportunidad de corregir con la factura todavia en la mano.
      self.state.ruleViolations.length > 0
        ? React.createElement("div", { className: "cm-alert cm-alert-warning", "data-testid": "expense-rule-violations" },
            React.createElement("div", null,
              React.createElement("i", { className: "fa fa-exclamation-triangle" }),
              " Este gasto incumple las reglas y será rechazado al guardar:"),
            React.createElement("ul", { style: { margin: "6px 0 0", paddingLeft: 18 } },
              self.state.ruleViolations.map(function(v, i) {
                return React.createElement("li", { key: i }, v.message);
              })
            )
          )
        : null,

      self.renderExtraction()
    );
  }.bind(this);

  // Modal de previsualizacion. SIEMPRE contra /download_receipt/report_expenses/:id,
  // nunca contra la URL firmada. Si no carga (403, archivo borrado) degrada a un
  // aviso: la previsualizacion nunca bloquea la descarga.
  renderReceiptPreview = function() {
    var self = this;
    var p = this.state.receiptPreview;
    if (!p || !p.open) return null;

    // `?disposition=inline` para PINTAR. Sin el, el endpoint responde con
    // Content-Disposition: attachment y la vista previa sale VACIA: ese era el
    // sintoma. La descarga usa la misma ruta sin el parametro, donde el default
    // sigue forzando el guardado.
    var src = "/download_receipt/report_expenses/" + p.id + "?disposition=inline";
    var descarga = "/download_receipt/report_expenses/" + p.id;


    return React.createElement(Modal, { isOpen: true, toggle: self.closeReceiptPreview, className: "modal-dialog-centered modal-lg" },
      React.createElement("div", { className: "cm-modal-container" },
        React.createElement("div", { className: "cm-modal-header" },
          React.createElement("div", { className: "cm-modal-header-content" },
            React.createElement("div", { className: "cm-modal-icon" }, React.createElement("i", { className: "fas fa-file" })),
            React.createElement("div", null,
              React.createElement("h2", { className: "cm-modal-title" }, "Comprobante del gasto #" + p.id),
              React.createElement("p", { className: "cm-modal-subtitle" }, "Previsualización del archivo adjunto")
            )
          ),
          React.createElement("button", { type: "button", className: "cm-modal-close", onClick: self.closeReceiptPreview },
            React.createElement("i", { className: "fa fa-times" })
          )
        ),
        React.createElement(ModalBody, { className: "cm-modal-body" },
          React.createElement("div", { "data-testid": "receipt-preview-modal" },
            self.state.receiptPreviewError
              ? React.createElement("div", { className: "cm-alert cm-alert-warning" },
                  React.createElement("i", { className: "fa fa-exclamation-triangle" }),
                  " No se pudo previsualizar el comprobante. ",
                  React.createElement("a", { href: descarga, target: "_blank", rel: "noopener noreferrer" }, "Descargarlo"),
                  ".")
              // Solo <img>: `abrirComprobante` ya desvio a descarga todo lo que
              // no sea imagen, asi que el <iframe> para PDF sobra. Era ademas
              // el que dejaba el modal en blanco.
              : React.createElement("img", { src: src, alt: "Comprobante",
                  style: { maxWidth: "100%", display: "block", margin: "0 auto" },
                  onError: function() { self.setState({ receiptPreviewError: true }); } })
          )
        ),
        React.createElement("div", { className: "cm-modal-footer", style: { justifyContent: "space-between" } },
          // VUELVE "Descargar". El comentario anterior era cierto mientras la
          // fila tenia dos controles —un enlace de descarga y un ojo—; ahora
          // tiene uno solo, asi que este modal es el UNICO sitio desde donde se
          // puede guardar la imagen.
          //
          // Sin `?disposition=inline`: el default del endpoint fuerza el
          // guardado, que es justo lo que se quiere aqui.
          React.createElement("a", {
            href: descarga, target: "_blank", rel: "noopener noreferrer",
            className: "cm-btn cm-btn-outline",
            "data-testid": "receipt-preview-download",
          }, React.createElement("i", { className: "fa fa-download" }), " Descargar"),
          React.createElement("button", { type: "button", className: "cm-btn cm-btn-submit", onClick: self.closeReceiptPreview },
            React.createElement("i", { className: "fa fa-times" }), " Cerrar")
        )
      )
    );
  }.bind(this);

  renderModal = function() {
    var self = this;
    var form = this.state.form;
    var isEdit = this.state.modeEdit;
    var title = isEdit ? "Editar Gasto" : "Nuevo Gasto";
    var hasError = function(field) { return self.state.ErrorValues === false && !form[field]; };

    if (!this.state.modal) return null;

    return React.createElement(Modal, { isOpen: true, toggle: self.closeModal, className: "modal-dialog-centered modal-lg", backdrop: "static" },
      React.createElement("div", { className: "cm-modal-container" },
        React.createElement("div", { className: "cm-modal-header" },
          React.createElement("div", { className: "cm-modal-header-content" },
            React.createElement("div", null,
              React.createElement("h2", { className: "cm-modal-title" }, title),
              React.createElement("p", { className: "cm-modal-subtitle" }, "Complete los campos para gestionar el gasto")
            )
          ),
          React.createElement("button", { type: "button", className: "cm-modal-close", onClick: self.closeModal },
            React.createElement("i", { className: "fa fa-times" })
          )
        ),
        React.createElement("form", null,
          React.createElement(ModalBody, { className: "cm-modal-body cm-modal-scroll" },
            // EL COMPROBANTE VA PRIMERO. Es el campo que manda: al adjuntarlo se
            // evaluan las reglas contra lo que ya haya en el formulario, y con
            // EXPENSE_RECEIPT_REQUIRED encendido sin el no se guarda. Pedirlo de
            // ultimo invitaba a llenar diez campos para enterarse al final de que
            // la factura no servia.
            self.renderReceiptBlock(),

            self.state.copyMessage ? React.createElement("div", { className: "alert alert-warning", style: { marginBottom: "12px" } }, self.state.copyMessage) : null,
            React.createElement("div", { className: "cm-form-grid-2" },
              // Centro de costo. El data-testid va en un DIV envolvente:
              // react-select no propaga atributos sueltos al DOM.
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  "Centro de costo ", React.createElement("span", { className: "cm-hint" }, "(3 letras)")
                ),
                React.createElement("div", { "data-testid": "expense-cost-center-select" },
                  React.createElement(Select, {
                    options: self.state.formCostCenterOptions,
                    value: self.state.selectedCostCenter,
                    onChange: function(opt) {
                      self.setState({ selectedCostCenter: opt, form: Object.assign({}, form, { cost_center_id: opt ? opt.value : "" }) },
                                    self.refreshBudgetAvailability);
                    },
                    onInputChange: self.handleFormCostCenterSearch,
                    isLoading: self.state.formCostCenterLoading,
                    placeholder: "Buscar centro de costo...",
                    noOptionsMessage: function() { return "Escribe al menos 3 letras"; },
                    styles: selectStyles,
                    menuPortalTarget: document.body,
                    className: hasError("cost_center_id") ? "cm-select-error" : "",
                  })
                )
              ),
              // Usuario
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  "Responsable"
                ),
                React.createElement("div", { "data-testid": "expense-user-select" },
                  React.createElement(Select, {
                    options: self.userOptions,
                    value: self.state.selectedUser,
                    onChange: function(opt) {
                      self.setState({ selectedUser: opt, form: Object.assign({}, form, { user_invoice_id: opt ? opt.value : "" }) }, function() {
                        self.loadBudgetAvailability(opt ? opt.value : null, self.state.modeEdit ? self.state.editId : null);
                      });
                    },
                    placeholder: "Seleccionar...",
                    styles: selectStyles,
                    menuPortalTarget: document.body,
                    className: hasError("user_invoice_id") ? "cm-select-error" : "",
                  })
                ),
                self.renderBudgetHint()
              ),
              // Moneda. Visible SIEMPRE, tambien en COP: es lo que le dice al
              // usuario en que moneda esta el gasto. El sub-bloque extranjero es
              // el condicional.
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  "Moneda"
                ),
                React.createElement("div", { "data-testid": "expense-currency-select" },
                  React.createElement(Select, {
                    options: self.currencyOptions,
                    value: self.state.selectedCurrency || self.currencyOption(form.currency || "COP"),
                    onChange: self.handleChangeCurrency,
                    placeholder: "Moneda...",
                    styles: selectStyles,
                    menuPortalTarget: document.body,
                  })
                )
              ),
              // Nombre
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  "Nombre"
                ),
                React.createElement("input", { type: "text", name: "invoice_name", value: form.invoice_name || "", onChange: self.handleFormChange, placeholder: "Nombre del gasto", className: hasError("invoice_name") ? "cm-input cm-input-error" : "cm-input" })
              ),
              // Fecha
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  "Fecha de factura"
                ),
                React.createElement("input", { type: "date", name: "invoice_date", value: form.invoice_date || "", onChange: self.handleFormChange, className: hasError("invoice_date") ? "cm-input cm-input-error" : "cm-input" })
              ),
              // NIT/Cedula
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  "NIT / Cédula"
                ),
                React.createElement("input", { type: "text", name: "identification", value: form.identification || "", onChange: self.handleFormChange, placeholder: "NIT o cédula", className: "cm-input" })
              ),
              // # Factura
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  "# Factura"
                ),
                React.createElement("input", { type: "text", name: "invoice_number", value: form.invoice_number || "", onChange: self.handleFormChange, placeholder: "Número de factura", className: "cm-input" })
              ),
              // Tipo
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  "Tipo"
                ),
                React.createElement(Select, {
                  options: self.typeOptions,
                  value: self.state.selectedType,
                  onChange: function(opt) { self.setState({ selectedType: opt, form: Object.assign({}, form, { type_identification_id: opt ? opt.value : "" }) }); },
                  placeholder: "Seleccionar tipo...",
                  isClearable: true,
                  styles: selectStyles,
                  menuPortalTarget: document.body,
                }),
                self.state.selectedType && self.state.selectedType.label ? React.createElement("div", {
                  className: "cm-field-hint cm-field-hint--copyable",
                  onClick: function() { navigator.clipboard.writeText(self.state.selectedType.label); self.setState({ copyMessage: "Tipo copiado" }); setTimeout(function() { self.setState({ copyMessage: "" }); }, 2000); }
                }, self.state.selectedType.label) : null
              ),
              // Medio de pago
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  "Medio de pago"
                ),
                React.createElement(Select, {
                  options: self.paymentOptions,
                  value: self.state.selectedPayment,
                  onChange: function(opt) { self.setState({ selectedPayment: opt, form: Object.assign({}, form, { payment_type_id: opt ? opt.value : "" }) }); },
                  placeholder: "Seleccionar...",
                  isClearable: true,
                  styles: selectStyles,
                  menuPortalTarget: document.body,
                }),
                self.state.selectedPayment && self.state.selectedPayment.label ? React.createElement("div", {
                  className: "cm-field-hint cm-field-hint--copyable",
                  onClick: function() { navigator.clipboard.writeText(self.state.selectedPayment.label); self.setState({ copyMessage: "Medio de pago copiado" }); setTimeout(function() { self.setState({ copyMessage: "" }); }, 2000); }
                }, self.state.selectedPayment.label) : null
              ),
              // Valor
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  "Valor"
                ),
                React.createElement(NumberFormat, { name: "invoice_value", thousandSeparator: true, prefix: "$", value: form.invoice_value || "", onChange: self.handleFormChangeMoney, placeholder: "$0", className: "cm-input" })
              ),
              // IVA
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  "IVA"
                ),
                React.createElement(NumberFormat, { name: "invoice_tax", thousandSeparator: true, prefix: "$", value: form.invoice_tax || "", onChange: self.handleFormChangeMoney, placeholder: "$0", className: "cm-input" })
              ),
              // Total
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  "Total"
                ),
                React.createElement(NumberFormat, { name: "invoice_total", thousandSeparator: true, prefix: "$", value: form.invoice_total || "", displayType: "input", className: "cm-input", disabled: true, style: { background: "#e9ecef" } })
              ),
              // Descripcion
              React.createElement("div", { className: "cm-form-group cm-full-width" },
                React.createElement("label", { className: "cm-label" },
                  "Descripción"
                ),
                React.createElement("textarea", { name: "description", rows: "3", value: form.description || "", onChange: self.handleFormChange, placeholder: "Descripción del gasto...", className: "cm-input", style: { resize: "vertical", minHeight: "80px" } })
              )
            ),

            self.renderForeignBlock(),
            self.renderReceiptBlock(),

            self.state.ErrorValues === false && React.createElement("div", { className: "cm-alert cm-alert-error" },
              React.createElement("i", { className: "fas fa-exclamation-circle" }),
              React.createElement("span", null, "Debe completar todos los campos requeridos")
            )
          ),
          React.createElement("div", { className: "cm-modal-footer" },
            React.createElement("button", { type: "button", className: "cm-btn cm-btn-cancel", onClick: self.closeModal },
              "Cancelar"
            ),
            React.createElement("button", { type: "button", className: "cm-btn cm-btn-submit", onClick: self.handleSubmit, disabled: !!self.state.saving },
              self.state.saving
                ? React.createElement("span", null, React.createElement("i", { className: "fa fa-spinner fa-spin" }), " Guardando…")
                : isEdit ? "Actualizar" : "Crear"
            )
          )
        )
      )
    );
  }.bind(this);

  // Punto UNICO por el que entra un archivo al modal de importar: lo usan el
  // selector, el arrastre y el boton de quitar. Tenerlo suelto en tres sitios es
  // como se produce el estado a medias (nombre puesto y archivo no, o al reves).
  aceptarArchivoImport = function(archivo) {
    this._importFile = archivo || null;
    this.setState({
      importFileName: archivo ? archivo.name : "",
      importSize: archivo ? archivo.size : 0,
      importDragging: false,
    });
    // El input se limpia para que elegir DOS VECES el mismo archivo vuelva a
    // disparar onChange (el navegador no lo emite si el value no cambia).
    if (!archivo && this._importInput) this._importInput.value = "";
  }.bind(this);

  handleImportDragOver = function(e) {
    e.preventDefault();
    if (!this.state.importDragging) this.setState({ importDragging: true });
  }.bind(this);

  handleImportDragLeave = function(e) {
    e.preventDefault();
    // `relatedTarget` dentro de la zona significa que se paso a un hijo, no que
    // se salio: sin esta guarda el borde parpadea al mover el mouse por dentro.
    if (e.currentTarget.contains(e.relatedTarget)) return;
    this.setState({ importDragging: false });
  }.bind(this);

  handleImportDrop = function(e) {
    e.preventDefault();
    var archivo = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (archivo) this.aceptarArchivoImport(archivo);
    else this.setState({ importDragging: false });
  }.bind(this);

  handleImportSubmit = function(e) {
    e.preventDefault();
    var self = this;

    var archivo = self._importFile;
    if (!archivo) return;

    var fd = new FormData();
    fd.append("file", archivo);

    self.setState({ importing: true });

    fetch("/upload_file/report_expenses", {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken() },
      body: fd,
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        self.setState({ importing: false });

        if (data.type === "error") {
          Swal.fire({ icon: "error", title: "No se pudo importar",
                      text: (data.message || []).join(" "), confirmButtonColor: "#2a3f53" });
          return;
        }

        // `data.data` es [filas_ok, filas_con_error]. Las filas malas se listan
        // por NUMERO DE FILA DEL EXCEL, que es lo unico que le sirve a quien
        // tiene que corregirlas.
        var fallidas = (data.data && data.data[1]) || [];
        self.aceptarArchivoImport(null);
        self.setState({ modalImport: false });
        self.loadData();

        if (fallidas.length > 0) {
          Swal.fire({
            icon: "warning",
            title: "Importado con errores",
            html: "<p>" + escaparHtml(data.success || "") + "</p>" +
                  "<p class=\"cm-hint\">Revise las filas: " + fallidas.join(", ") + "</p>",
            confirmButtonColor: "#2a3f53",
          });
          return;
        }

        Swal.fire({ position: "center", icon: "success", title: data.success || "Importado",
                    showConfirmButton: false, timer: 2500 });
      })
      .catch(function() {
        self.setState({ importing: false });
        Swal.fire({ icon: "error", title: "No se pudo importar el archivo", confirmButtonColor: "#2a3f53" });
      });
  }.bind(this);

  renderImportModal = function() {
    var self = this;
    if (!this.state.modalImport) return null;

    return React.createElement(Modal, { isOpen: true, toggle: self.closeImportModal, className: "modal-dialog-centered", backdrop: "static" },
      React.createElement("div", { className: "cm-modal-container" },
        React.createElement("div", { className: "cm-modal-header" },
          React.createElement("div", { className: "cm-modal-header-content" },
            React.createElement("div", { className: "cm-modal-icon" },
              React.createElement("i", { className: "fas fa-file-import" })
            ),
            React.createElement("div", null,
              React.createElement("h2", { className: "cm-modal-title" }, "Importar archivo"),
              React.createElement("p", { className: "cm-modal-subtitle" }, "Suba un archivo Excel para importar gastos")
            )
          ),
          React.createElement("button", { type: "button", className: "cm-modal-close", onClick: self.closeImportModal },
            React.createElement("i", { className: "fa fa-times" })
          )
        ),
        React.createElement("form", {
          // `onSubmit` y no un POST nativo del formulario: con el POST nativo el
          // navegador ABANDONA la pagina y pinta el JSON crudo de la respuesta,
          // tanto al importar bien como al fallar. Con fetch, el resultado se
          // cuenta en el mismo modal y la tabla se refresca sola.
          onSubmit: self.handleImportSubmit,
        },
          React.createElement(ModalBody, { className: "cm-modal-body" },
            // LA PLANTILLA VA ARRIBA DEL SELECTOR, no debajo: es el primer paso,
            // no una nota al pie. Quien abre este modal sin plantilla sube un
            // archivo con las columnas en otro orden y los datos entran al campo
            // equivocado sin un solo error.
            // LA ZONA DE ARRASTRE, la misma del comprobante en el formulario de
            // gastos (.cm-dropzone). El `<input type="file">` nativo se pinta
            // distinto en cada navegador —"Choose File" en ingles aunque la app
            // este en castellano— y no admite soltar el archivo encima. El input
            // sigue en el DOM, oculto por CSS: es lo que necesitan Playwright y
            // los lectores de pantalla.
            React.createElement("div", {
                className: "cm-dropzone"
                  + (self.state.importDragging ? " cm-dropzone--active" : "")
                  + (self.state.importFileName ? " cm-dropzone--filled" : ""),
                onDragOver: self.handleImportDragOver,
                onDragEnter: self.handleImportDragOver,
                onDragLeave: self.handleImportDragLeave,
                onDrop: self.handleImportDrop,
                onClick: function() { if (self._importInput) self._importInput.click(); },
                onKeyDown: function(e) {
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (self._importInput) self._importInput.click(); }
                },
                role: "button",
                tabIndex: 0,
                "data-testid": "expense-import-dropzone",
              },
              React.createElement("input", {
                type: "file", className: "cm-dropzone-input",
                ref: function(el) { self._importInput = el; },
                accept: ".xlsx,.xls",
                onChange: function(e) { self.aceptarArchivoImport(e.target.files[0]); },
                // Sin esto el clic del input vuelve a burbujear al div, que llama
                // otra vez a input.click(): el selector se abre en bucle.
                onClick: function(e) { e.stopPropagation(); },
                "data-testid": "expense-import-file",
              }),

              self.state.importFileName
                ? React.createElement("div", { className: "cm-dropzone-file", "data-testid": "expense-import-name" },
                    React.createElement("i", { className: "fa fa-file-excel cm-dropzone-file-icon" }),
                    React.createElement("div", { className: "cm-dropzone-file-body" },
                      React.createElement("span", { className: "cm-dropzone-file-name" }, self.state.importFileName),
                      React.createElement("span", { className: "cm-dropzone-file-meta" },
                        pesoLegible(self.state.importSize) + " · Haga clic o suelte otro archivo para reemplazarlo")),
                    React.createElement("button", {
                      type: "button", className: "cm-dropzone-clear", title: "Quitar el archivo",
                      onClick: function(e) { e.stopPropagation(); self.aceptarArchivoImport(null); },
                      "data-testid": "expense-import-clear",
                    }, React.createElement("i", { className: "fa fa-times" })))
                : React.createElement("div", { className: "cm-dropzone-empty" },
                    React.createElement("i", { className: "fa fa-cloud-upload-alt cm-dropzone-icon" }),
                    React.createElement("span", { className: "cm-dropzone-title" },
                      "Arrastre aquí su archivo de Excel"),
                    React.createElement("span", { className: "cm-dropzone-hint" },
                      "o haga clic para buscarlo · XLSX o XLS"))
            ),

            // La plantilla, al pie y en una sola linea: es una ayuda, no el
            // asunto del modal. Antes ocupaba un bloque destacado ARRIBA del
            // selector y le robaba el protagonismo a lo que se viene a hacer
            // aqui, que es subir un archivo.
            React.createElement("div", { className: "cm-field-hint", style: { marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" } },
              React.createElement("span", null,
                "Una fila con errores no detiene el archivo: las demás se importan."),
              React.createElement("a", {
                href: "/import_template/report_expenses",
                "data-testid": "expense-import-template",
              }, React.createElement("i", { className: "fas fa-file-excel" }), " Descargar plantilla")
            )
          ),
          React.createElement("div", { className: "cm-modal-footer" },
            React.createElement("button", { type: "button", className: "cm-btn cm-btn-cancel", onClick: self.closeImportModal },
              React.createElement("i", { className: "fa fa-times" }), " Cancelar"
            ),
            React.createElement("button", {
              type: "submit",
              className: "cm-btn cm-btn-submit",
              disabled: !self.state.importFileName || self.state.importing,
              "data-testid": "expense-import-submit",
            },
              React.createElement("i", { className: "fas fa-upload" }),
              self.state.importing ? " Subiendo..." : " Subir plantilla"
            )
          )
        )
      )
    );
  }.bind(this);

  renderHeaderActions = function() {
    var self = this;

    var buttons = [];

    // Filtros
    buttons.push(
      React.createElement("button", {
        key: "filter",
        onClick: self.toggleFilters,
        className: "cm-btn " + (self.state.showFilters ? "cm-btn-accent" : "cm-btn-outline"),
      },
        React.createElement("i", { className: "fas fa-filter" }),
        " Filtros"
      )
    );

    // Aceptar gastos (solo cuando hay filtros activos y tiene permiso closed)
    if (this.state.isFiltering && this.props.estados.closed) {
      buttons.push(
        React.createElement("button", {
          key: "accept",
          onClick: self.acceptFilteredExpenses,
          className: "cm-btn cm-btn-success",
        },
          React.createElement("i", { className: "fas fa-check" }),
          " Aceptar gastos"
        )
      );
    }

    // Importar. Va con `estados.import` —que el servidor calcula como "es
    // administrador"— y no con `estados.create`: crear un gasto por el
    // formulario y crear 300 por un Excel no son el mismo permiso. El import
    // salta el formulario, el presupuesto y las reglas de gasto.
    if (this.props.estados.import) {
      buttons.push(
        React.createElement("button", {
          key: "import",
          onClick: self.openImportModal,
          className: "cm-btn cm-btn-outline",
        },
          React.createElement("i", { className: "fas fa-file-import" }),
          " Importar"
        )
      );
    }

    // Exportar
    if (this.props.estados.export) {
      buttons.push(
        React.createElement("a", {
          key: "export",
          href: self.getExportUrl(),
          target: "_blank",
          className: "cm-btn cm-btn-outline",
        },
          React.createElement("i", { className: "fas fa-file-excel" }),
          " Exportar"
        )
      );
    }

    return React.createElement("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap" }}, buttons);
  }.bind(this);

  render() {
    return React.createElement("div", { className: "cm-page", "data-testid": "page-report-expenses" },
      React.createElement(CmPageActions, {
        onNew: this.props.estados.create ? this.openNewModal : null,
        label: "Crear gasto",
        testId: "expense-new",
      }),

      this.state.showFilters && this.renderFilters(),

      React.createElement(CmDataTable, {
        columns: this.columns,
        data: this.state.data,
        loading: this.state.loading,
        serverPagination: true,
        serverMeta: this.state.meta,
        onSort: this.handleSort,
        onPageChange: this.handlePageChange,
        onPerPageChange: this.handlePerPageChange,
        onSearch: this.handleSearch,
        actions: this.getRowActions,
        headerActions: this.renderHeaderActions(),
        emptyMessage: "No hay gastos registrados",
      }),

      this.renderModal(),
      this.renderImportModal(),
      this.renderReceiptPreview()
    );
  }
}

export default ReportExpenseIndex;
WebpackerReact.setup({ ReportExpenseIndex });
