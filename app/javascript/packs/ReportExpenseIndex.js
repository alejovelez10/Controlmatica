import React from "react";
import WebpackerReact from "webpacker-react";
import Swal from "sweetalert2";
import Select from "react-select";
import NumberFormat from "react-number-format";
import { CmDataTable, CmPageActions } from "../generalcomponents/ui";
import { budgetStatusBadge, accountingBadge, shortDate, toNumber } from "../generalcomponents/expenseIndicators";
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
var EXTRACTION_VACIA = { status: "idle", message: null, filled: [], confidence: {}, warnings: [], violations: [] };
var EXCHANGE_VACIO = { status: "idle", message: null, rate_date: null, requested_date: null, source: null };
var DISPONIBLE_VACIO = { loading: false, error: null, has_budget: false, assigned: "0.0", spent: "0.0", available: "0.0" };

var EXTENSIONES_COMPROBANTE = ["jpg", "jpeg", "png", "pdf", "webp", "heic"];
var TAMANO_MAXIMO_COMPROBANTE = 10 * 1024 * 1024;

// Estado del comprobante y de sus dos acompanantes, para resetearlo de una sola
// vez al abrir el modal. Que este junto no es cosmetico: olvidar uno solo de
// estos campos hace que el comprobante del gasto anterior se suba al siguiente.
function estadoComprobanteVacio() {
  return {
    receiptFile: null,
    receiptFileName: "",
    receiptExistingId: null,
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

    this.columns = [
      // El ID de referencia va PRIMERO: es lo que el usuario copia al chat de
      // soporte y lo que el buscador acepta desde que C.2/F.1 metieron
      // `id::text` en el LIKE.
      { key: "id", label: "ID", width: "80px", render: function(row) {
        return React.createElement("span", { "data-testid": "expense-ref-" + row.id, style: { fontWeight: 600, color: "#6c757d" } }, "#" + row.id);
      }},
      { key: "cost_center_code", label: "Centro de costo", width: "150px", render: function(row) { return row.cost_center ? row.cost_center.code : ""; } },
      { key: "user_invoice_name", label: "Responsable", width: "150px", render: function(row) { return row.user_invoice ? row.user_invoice.names : ""; } },
      { key: "invoice_name", label: "Nombre", width: "200px" },
      { key: "invoice_date", label: "Fecha de factura", width: "120px" },
      { key: "identification", label: "NIT / CEDULA", width: "120px" },
      { key: "description", label: "Descripcion", width: "200px" },
      { key: "invoice_number", label: "#Factura", width: "140px" },
      { key: "type_name", label: "Tipo", width: "180px", render: function(row) { return row.type_identification ? row.type_identification.name : ""; } },
      { key: "payment_name", label: "Medio de pago", width: "150px", render: function(row) { return row.payment_type ? row.payment_type.name : ""; } },
      { key: "invoice_value", label: "Valor", width: "100px", render: function(row) { return React.createElement(NumberFormat, { value: row.invoice_value, displayType: "text", thousandSeparator: true, prefix: "$" }); } },
      { key: "invoice_tax", label: "IVA", width: "100px", render: function(row) { return React.createElement(NumberFormat, { value: row.invoice_tax, displayType: "text", thousandSeparator: true, prefix: "$" }); } },
      { key: "invoice_total", label: "Total", width: "100px", render: function(row) { return React.createElement(NumberFormat, { value: row.invoice_total, displayType: "text", thousandSeparator: true, prefix: "$" }); } },
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
          React.createElement(NumberFormat, { value: total, displayType: "text", thousandSeparator: true, suffix: " " + row.currency }),
          rate !== null
            ? React.createElement("span", { className: "cm-hint", style: { display: "block" } },
                "TRM ",
                React.createElement(NumberFormat, { value: rate, displayType: "text", thousandSeparator: true }))
            : null
        );
      }},
      { key: "is_acepted", label: "Estado", width: "150px", sortable: false, render: function(row) {
        var isEditing = self.state.editingStatusId === row.id;

        if (isEditing) {
          return React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "6px" }},
            React.createElement("select", {
              value: row.is_acepted ? "true" : "false",
              onChange: function(e) { self.updateStatus(e, row); },
              onClick: function(e) { e.stopPropagation(); },
              className: "cm-input",
              style: { padding: "4px 8px", fontSize: "12px", minWidth: "90px" }
            },
              React.createElement("option", { value: "true" }, "Aceptado"),
              React.createElement("option", { value: "false" }, "Creado")
            ),
            React.createElement("button", {
              onClick: function(e) { e.stopPropagation(); self.closeStatusEdit(); },
              style: { background: "none", border: "none", cursor: "pointer", color: "#dc3545", padding: "2px" }
            }, React.createElement("i", { className: "fas fa-times", style: { fontSize: "12px" }}))
          );
        }

        var badgeStyle = row.is_acepted
          ? { background: "#d4edda", color: "#155724", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "500" }
          : { background: "#e9ecef", color: "#6c757d", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "500" };

        return React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px" }},
          React.createElement("span", { style: badgeStyle }, row.is_acepted ? "Aceptado" : "Creado"),
          props.estados.closed && React.createElement("button", {
            onClick: function(e) { e.stopPropagation(); self.openStatusEdit(row.id); },
            style: { background: "none", border: "none", cursor: "pointer", color: "#6c757d", padding: "4px" }
          }, React.createElement("i", { className: "fas fa-pen", style: { fontSize: "12px" }}))
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
      // El enlace apunta SIEMPRE a /download_receipt/report_expenses/:id y nunca
      // a `row.receipt_file.url`: esa es la URL firmada de S3 y expira a los 600
      // segundos, asi que una tabla abierta desde hace diez minutos entregaria
      // 403 al hacer clic.
      //
      // `openReceiptPreview` lo define el paquete 08 FUERA del constructor. Este
      // paquete se mergea antes, asi que hasta entonces el boton existe y el
      // metodo no; esta anotado en el PR y no se implementa aqui "por si acaso"
      // para no dejar dos definiciones del mismo modal.
      { key: "receipt_file", label: "Comprobante", width: "120px", sortable: false, render: function(row) {
        if (!row.receipt_file || !row.receipt_file.url) return "—";

        return React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "6px" } },
          React.createElement("a", {
            href: "/download_receipt/report_expenses/" + row.id,
            target: "_blank",
            rel: "noopener noreferrer",
            title: "Descargar comprobante",
            "data-testid": "expense-receipt-link-" + row.id
          }, React.createElement("i", { className: "fas fa-download" })),
          React.createElement("button", {
            type: "button",
            className: "cm-btn cm-btn-outline cm-btn-sm",
            title: "Previsualizar comprobante",
            onClick: function() { self.openReceiptPreview(row.id); },
            "data-testid": "expense-receipt-preview-" + row.id
          }, React.createElement("i", { className: "fas fa-eye" }))
        );
      }},
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
    ];
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
  closeImportModal = function() { this.setState({ modalImport: false }); }.bind(this);

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
    var total = (Number(newForm.invoice_value) || 0) + (Number(newForm.invoice_tax) || 0);
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
    this.setState({ form: Object.assign({}, this.state.form, {
      cop_manual_override: on,
      exchange_rate_source: on ? "manual" : this.state.form.exchange_rate_source,
    }) });
  }.bind(this);

  // INVARIANTE: invoice_value / invoice_tax / invoice_total SIEMPRE en COP. El
  // valor extranjero jamas se escribe en esos tres campos; si se rompe,
  // recalculate_cost_center corrompe el % de viaticos de todos los centros en
  // silencio.
  recomputeConversion = function() {
    var self = this;
    var f = this.state.form;
    if (f.currency === "COP") return;
    if (f.cop_manual_override) return;   // el usuario fijo el COP a mano: no se pisa

    var rate = parseFloat(f.exchange_rate) || 0;
    var fv = parseFloat(f.foreign_value) || 0;
    var ft = parseFloat(f.foreign_tax) || 0;
    var round2 = function(x) { return Math.round(x * 100) / 100; };

    this.setState({ form: Object.assign({}, this.state.form, {
      foreign_total: round2(fv + ft),
      invoice_value: round2(fv * rate),
      invoice_tax: round2(ft * rate),
      // El round2 EXTERIOR no sobra. Sumar dos numeros ya redondeados vuelve a
      // producir binario sucio: 314414 + 59738.66 da 374152.66000000003 en JS, y
      // ese valor se pinta tal cual en el campo Total y viaja asi en el
      // FormData. Verificado en pantalla contra USD 100 + 19 con TRM 3.144,14.
      invoice_total: round2(round2(fv * rate) + round2(ft * rate)),
    }) }, self.refreshBudgetAvailability);
  }.bind(this);

  fetchExchangeRate = function() {
    var self = this;
    var f = this.state.form;
    if (f.currency === "COP" || !f.invoice_date) return;

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
    var file = e.target.files && e.target.files[0];
    if (!file) { this.setState({ receiptFile: null, receiptFileName: "", receiptError: null }); return; }

    var ext = (file.name.split(".").pop() || "").toLowerCase();
    if (EXTENSIONES_COMPROBANTE.indexOf(ext) === -1) {
      this.setState({ receiptFile: null, receiptFileName: "", receiptError: "Formato no permitido. Use JPG, PNG, WEBP, HEIC o PDF." });
      return;
    }
    if (file.size > TAMANO_MAXIMO_COMPROBANTE) {
      this.setState({ receiptFile: null, receiptFileName: "", receiptError: "El archivo supera los 10 MB permitidos." });
      return;
    }
    this.setState({ receiptFile: file, receiptFileName: file.name, receiptError: null });
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
          self.setState({ receiptExistingId: null });
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
                        confidence: d.confidence || {}, warnings: d.warnings || [],
                        violations: d.rule_violations || [] },
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
              "Aprobado por contabilidad"
            ),
            React.createElement("select", { name: "accounting_approved", className: "cm-input", value: f.accounting_approved, onChange: self.handleFilterChange, "data-testid": "filter-accounting-approved" },
              React.createElement("option", { value: "" }, "Todos"),
              React.createElement("option", { value: "true" }, "Aprobado"),
              React.createElement("option", { value: "false" }, "Pendiente")
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

    if (f.exchange_rate_source === "manual" && e.status !== "loading") {
      return React.createElement("div", { className: "cm-field-hint" }, "Tasa ingresada manualmente");
    }
    if (e.status === "loading") {
      return React.createElement("div", { className: "cm-field-hint", "data-testid": "expense-rate-loading" },
        React.createElement("i", { className: "fa fa-spinner fa-spin" }), " Consultando la tasa…");
    }
    if (e.status === "error") {
      return React.createElement("div", { className: "cm-alert cm-alert-warning", "data-testid": "expense-rate-error" }, e.message);
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
            React.createElement("i", { className: "fas fa-money-bill" }), " Valor en " + f.currency),
          React.createElement(NumberFormat, { name: "foreign_value", thousandSeparator: true, className: "cm-input",
            value: f.foreign_value || "", onChange: self.handleFormChangeForeignMoney, placeholder: "0",
            "data-testid": "expense-foreign-value" })
        ),
        React.createElement("div", { className: "cm-form-group" },
          React.createElement("label", { className: "cm-label" },
            React.createElement("i", { className: "fas fa-percent" }), " IVA en " + f.currency),
          React.createElement(NumberFormat, { name: "foreign_tax", thousandSeparator: true, className: "cm-input",
            value: f.foreign_tax || "", onChange: self.handleFormChangeForeignMoney, placeholder: "0",
            "data-testid": "expense-foreign-tax" })
        ),
        React.createElement("div", { className: "cm-form-group" },
          React.createElement("label", { className: "cm-label" },
            React.createElement("i", { className: "fas fa-calculator" }), " Total en " + f.currency),
          React.createElement(NumberFormat, { thousandSeparator: true, className: "cm-input", disabled: true,
            style: { background: "#e9ecef" }, value: f.foreign_total || "",
            "data-testid": "expense-foreign-total" })
        ),
        React.createElement("div", { className: "cm-form-group" },
          React.createElement("label", { className: "cm-label" },
            React.createElement("i", { className: "fas fa-exchange-alt" }), " TRM"),
          React.createElement(NumberFormat, { name: "exchange_rate", thousandSeparator: true, decimalScale: 6,
            className: "cm-input", value: f.exchange_rate || "", onChange: self.handleChangeRate, placeholder: "0",
            "data-testid": "expense-rate" })
        ),
        React.createElement("div", { className: "cm-form-group" },
          React.createElement("label", { className: "cm-label" },
            React.createElement("i", { className: "fas fa-calendar-alt" }), " Fecha de la tasa"),
          React.createElement("input", { type: "date", name: "exchange_rate_date", className: "cm-input",
            disabled: true, readOnly: true, style: { background: "#e9ecef" }, value: f.exchange_rate_date || "",
            "data-testid": "expense-rate-date" })
        ),
        React.createElement("div", { className: "cm-form-group" },
          React.createElement("label", { className: "cm-label" }, " "),
          React.createElement("button", { type: "button", className: "cm-btn cm-btn-outline cm-btn-sm",
            onClick: self.fetchExchangeRate, "data-testid": "expense-fetch-rate-btn" },
            React.createElement("i", { className: "fa fa-sync" }), " Consultar TRM")
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

    return React.createElement("div", { style: { marginTop: 8 } },
      React.createElement("button", {
        type: "button", className: "cm-btn cm-btn-pastel cm-btn-pastel--blue cm-btn-sm",
        onClick: self.handleExtract,
        disabled: !self.state.receiptFileName || x.status === "loading",
        "data-testid": "expense-extract-btn",
      }, React.createElement("i", { className: "fa fa-magic" }), " Extraer datos del comprobante"),

      x.status === "loading" ? React.createElement("div", { className: "cm-alert cm-alert-info", "data-testid": "expense-extract-loading" },
        React.createElement("i", { className: "fa fa-spinner fa-spin" }), " Leyendo el comprobante… Esto puede tardar hasta 20 segundos.") : null,

      x.status === "error" ? React.createElement("div", { className: "cm-alert cm-alert-warning", "data-testid": "expense-extract-error" },
        (x.message || "") + " Complete los datos manualmente.") : null,

      x.status === "done" ? React.createElement("div", null,
        React.createElement("div", { className: "cm-alert cm-alert-success", "data-testid": "expense-extract-done" },
          "Se precargaron " + x.filled.length + " campos. ",
          React.createElement("strong", null, "Revíselos antes de guardar.")),
        (x.warnings || []).length > 0
          ? React.createElement("div", { className: "cm-alert cm-alert-warning", "data-testid": "expense-extract-warnings" }, x.warnings.join(" "))
          : null,
        // Una violacion blocking:true INFORMA pero no deshabilita Guardar: la
        // puerta de bloqueo es del servidor.
        (x.violations || []).map(function(v, i) {
          return React.createElement("div", {
            key: i,
            className: v.blocking ? "cm-alert cm-alert-danger" : "cm-alert cm-alert-warning",
            "data-testid": "expense-rule-violation",
          }, v.message || v.rule || "");
        }),
        Object.keys(x.confidence || {}).filter(function(k) { return x.confidence[k] < 0.8; }).map(function(k) {
          return React.createElement("div", { key: k, className: "cm-field-hint", "data-testid": "expense-low-confidence-" + k },
            React.createElement("i", { className: "fa fa-exclamation-triangle" }), " Verifique este dato: " + k);
        })
      ) : null
    );
  }.bind(this);

  renderReceiptBlock = function() {
    var self = this;

    return React.createElement("div", { className: "cm-form-group", style: { marginTop: 12 } },
      React.createElement("label", { className: "cm-label" },
        React.createElement("i", { className: "fas fa-paperclip" }), " Comprobante"),
      // La clase que existe es .cm-file-input (design_system.css:1741);
      // .cm-input-file NO existe.
      React.createElement("input", {
        type: "file", className: "cm-input cm-file-input",
        accept: ".jpg,.jpeg,.png,.webp,.heic,.pdf,image/*,application/pdf",
        onChange: self.handleFileReceipt,
        "data-testid": "expense-receipt-input",
      }),

      self.state.receiptFileName
        ? React.createElement("div", { className: "cm-field-hint", "data-testid": "expense-receipt-name" },
            React.createElement("i", { className: "fa fa-file" }), " " + self.state.receiptFileName)
        : null,

      self.state.receiptExistingId
        ? React.createElement("div", { className: "cm-field-hint", style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
            // El destino es SIEMPRE /download_receipt/report_expenses/:id: la
            // URL firmada de S3 caduca a los 600 s.
            React.createElement("a", { href: "/download_receipt/report_expenses/" + self.state.receiptExistingId, target: "_blank", rel: "noopener noreferrer" },
              React.createElement("i", { className: "fa fa-download" }), " Ver comprobante actual"),
            React.createElement("button", { type: "button", className: "cm-btn cm-btn-outline cm-btn-sm",
              onClick: function() { self.openReceiptPreview(self.state.receiptExistingId, self.state.receiptFileName); } },
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

    var src = "/download_receipt/report_expenses/" + p.id;
    // <img> solo cuando el nombre dice claramente que es una imagen. En
    // cualquier otro caso —incluido "no se conoce el nombre", que es lo normal
    // desde la tabla porque el serializer solo expone `url`— se usa <iframe>,
    // que sirve para PDF y para imagen.
    var esImagen = /\.(jpe?g|png|webp|heic|gif)$/.test((p.name || "").toLowerCase());

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
                  " No se pudo previsualizar el comprobante. Intente descargarlo.")
              : esImagen
                ? React.createElement("img", { src: src, alt: "Comprobante", style: { maxWidth: "100%" },
                    onError: function() { self.setState({ receiptPreviewError: true }); } })
                : React.createElement("iframe", { src: src, title: "Comprobante", style: { width: "100%", height: "70vh", border: 0 },
                    onError: function() { self.setState({ receiptPreviewError: true }); } })
          )
        ),
        React.createElement("div", { className: "cm-modal-footer" },
          // Sin data-testid: `expense-receipt-link-{id}` ya lo emite la fila de
          // la tabla (columna del paquete 09). Repetirlo aqui daria dos nodos
          // con el mismo selector justo con el modal abierto.
          React.createElement("a", { className: "cm-btn cm-btn-cancel", href: src, target: "_blank", rel: "noopener noreferrer" },
            React.createElement("i", { className: "fa fa-download" }), " Descargar"),
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
            React.createElement("div", { className: "cm-modal-icon" },
              React.createElement("i", { className: "fas fa-receipt" })
            ),
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
            self.state.copyMessage ? React.createElement("div", { className: "alert alert-warning", style: { marginBottom: "12px" } }, self.state.copyMessage) : null,
            React.createElement("div", { className: "cm-form-grid-2" },
              // Centro de costo. El data-testid va en un DIV envolvente:
              // react-select no propaga atributos sueltos al DOM.
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  React.createElement("i", { className: "fas fa-building" }),
                  " Centro de costo ", React.createElement("span", { className: "cm-hint" }, "(3 letras)")
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
                  React.createElement("i", { className: "fas fa-user" }),
                  " Responsable"
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
                  React.createElement("i", { className: "fas fa-coins" }),
                  " Moneda"
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
                  React.createElement("i", { className: "fas fa-file-alt" }),
                  " Nombre"
                ),
                React.createElement("input", { type: "text", name: "invoice_name", value: form.invoice_name || "", onChange: self.handleFormChange, placeholder: "Nombre del gasto", className: hasError("invoice_name") ? "cm-input cm-input-error" : "cm-input" })
              ),
              // Fecha
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  React.createElement("i", { className: "fas fa-calendar-alt" }),
                  " Fecha de factura"
                ),
                React.createElement("input", { type: "date", name: "invoice_date", value: form.invoice_date || "", onChange: self.handleFormChange, className: hasError("invoice_date") ? "cm-input cm-input-error" : "cm-input" })
              ),
              // NIT/Cedula
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  React.createElement("i", { className: "fas fa-id-card" }),
                  " NIT / Cédula"
                ),
                React.createElement("input", { type: "text", name: "identification", value: form.identification || "", onChange: self.handleFormChange, placeholder: "NIT o cédula", className: "cm-input" })
              ),
              // # Factura
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  React.createElement("i", { className: "fas fa-hashtag" }),
                  " # Factura"
                ),
                React.createElement("input", { type: "text", name: "invoice_number", value: form.invoice_number || "", onChange: self.handleFormChange, placeholder: "Número de factura", className: "cm-input" })
              ),
              // Tipo
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  React.createElement("i", { className: "fas fa-tag" }),
                  " Tipo"
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
                }, React.createElement("i", { className: "fas fa-copy" }), " ", self.state.selectedType.label) : null
              ),
              // Medio de pago
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  React.createElement("i", { className: "fas fa-credit-card" }),
                  " Medio de pago"
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
                }, React.createElement("i", { className: "fas fa-copy" }), " ", self.state.selectedPayment.label) : null
              ),
              // Valor
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  React.createElement("i", { className: "fas fa-dollar-sign" }),
                  " Valor"
                ),
                React.createElement(NumberFormat, { name: "invoice_value", thousandSeparator: true, prefix: "$", value: form.invoice_value || "", onChange: self.handleFormChangeMoney, placeholder: "$0", className: "cm-input" })
              ),
              // IVA
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  React.createElement("i", { className: "fas fa-percent" }),
                  " IVA"
                ),
                React.createElement(NumberFormat, { name: "invoice_tax", thousandSeparator: true, prefix: "$", value: form.invoice_tax || "", onChange: self.handleFormChangeMoney, placeholder: "$0", className: "cm-input" })
              ),
              // Total
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  React.createElement("i", { className: "fas fa-calculator" }),
                  " Total"
                ),
                React.createElement(NumberFormat, { name: "invoice_total", thousandSeparator: true, prefix: "$", value: form.invoice_total || "", displayType: "input", className: "cm-input", disabled: true, style: { background: "#e9ecef" } })
              ),
              // Descripcion
              React.createElement("div", { className: "cm-form-group cm-full-width" },
                React.createElement("label", { className: "cm-label" },
                  React.createElement("i", { className: "fas fa-align-left" }),
                  " Descripción"
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
              React.createElement("i", { className: "fa fa-times" }), " Cancelar"
            ),
            React.createElement("button", { type: "button", className: "cm-btn cm-btn-submit", onClick: self.handleSubmit, disabled: !!self.state.saving },
              self.state.saving
                ? React.createElement("span", null, React.createElement("i", { className: "fa fa-spinner fa-spin" }), " Guardando…")
                : React.createElement("span", null, React.createElement("i", { className: "fa fa-save" }), isEdit ? " Actualizar" : " Crear")
            )
          )
        )
      )
    );
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
        React.createElement("form", { action: "/upload_file/report_expenses", method: "POST", encType: "multipart/form-data" },
          React.createElement(ModalBody, { className: "cm-modal-body" },
            React.createElement("input", { type: "hidden", name: "authenticity_token", value: csrfToken() }),
            React.createElement("div", { className: "cm-form-group" },
              React.createElement("label", { className: "cm-label" },
                React.createElement("i", { className: "fas fa-file-excel" }),
                " Seleccionar archivo"
              ),
              React.createElement("input", { type: "file", name: "file", accept: ".xlsx,.xls", className: "cm-input", style: { padding: "8px" } })
            )
          ),
          React.createElement("div", { className: "cm-modal-footer" },
            React.createElement("button", { type: "button", className: "cm-btn cm-btn-cancel", onClick: self.closeImportModal },
              React.createElement("i", { className: "fa fa-times" }), " Cancelar"
            ),
            React.createElement("button", { type: "submit", className: "cm-btn cm-btn-submit" },
              React.createElement("i", { className: "fas fa-upload" }), " Subir"
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

    // Importar
    if (this.props.estados.create) {
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
