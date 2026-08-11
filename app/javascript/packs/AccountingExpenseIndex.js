import React from "react";
import WebpackerReact from "webpacker-react";
import Swal from "sweetalert2";
import Select from "react-select";
import NumberFormat from "react-number-format";
import { CmDataTable } from "../generalcomponents/ui";
import { budgetStatusBadge, accountingBadge, shortDate, toNumber } from "../generalcomponents/expenseIndicators";

// Pantalla de Contabilidad (paquete 09, bloque 4). El backend completo —las
// cinco rutas, `@estados` y el tope de la aprobacion masiva— es del paquete 06:
// aqui NO se reimplementa ninguna regla, solo se consume.
//
// Pack "gordo" con React.createElement y sin JSX, igual que ReportExpenseIndex:
// es el estilo del repo para los packs y evita depender del loader de JSX.

function csrfToken() {
  var meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}

// Espeja el tope del servidor (AccountingExpensesController::MAX_BULK). Si el
// cliente dejara mandar mas, el servidor responde un error de texto y el usuario
// pierde la seleccion de 500 casillas para nada.
var MAX_BULK = 500;

var EMPTY_FILTERS = {
  cost_center_id: "",
  user_invoice_id: "",
  start_date: "",
  end_date: "",
  accounting_approved: "",
  budget_status: "",
  currency: "",
  is_acepted: "",
  type_identification_id: "",
  payment_type_id: "",
};

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

class AccountingExpenseIndex extends React.Component {
  constructor(props) {
    super(props);

    // `estados` puede llegar null si la accion del controller no lo armo: en JS
    // `this.props.estados.approve` sobre null lanza TypeError y la pagina queda
    // EN BLANCO, sin error de servidor y con un warning cripitco en consola.
    this.estados = props.estados || {};

    this.state = {
      data: [],
      loading: true,
      loadError: "",
      searchTerm: "",
      sortKey: null,
      sortDir: "asc",
      // per_page 50 = el default del servidor. Poner 200 aqui desalinea la
      // paginacion: el servidor topa en 100 y el frontend calcularia total_pages
      // con 200, dejando paginas enteras inalcanzables.
      meta: { total: 0, page: 1, per_page: 50, total_pages: 1 },
      showFilters: false,
      isFiltering: false,
      filters: Object.assign({}, EMPTY_FILTERS),
      filterCostCenter: null,
      filterCostCenterOptions: [],
      filterCostCenterLoading: false,
      filterUser: null,
      filterType: null,
      filterPayment: null,
      selectedIds: [],
      bulkRunning: false,
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

    // Guarda obligatoria: sin el `|| []` un render sin la prop revienta el .map
    // del select de moneda y con el, la pantalla entera.
    this.currencyOptions = props.currencies || window.CM_CURRENCIES || [];

    // TODAS las columnas se declaran AQUI, en el constructor: CmDataTable
    // congela `visibleColumns` en el suyo y no lo resincroniza nunca, asi que
    // una columna armada despues del mount no se pinta y nada lo avisa.
    this.columns = [
      { key: "id", label: "ID", width: "80px", render: function(row) {
        return React.createElement("span", { "data-testid": "accounting-ref-" + row.id, style: { fontWeight: 600, color: "#6c757d" } }, "#" + row.id);
      }},
      { key: "cost_center_code", label: "Centro de costo", width: "150px", render: function(row) { return row.cost_center ? row.cost_center.code : ""; } },
      { key: "user_invoice_name", label: "Responsable", width: "150px", render: function(row) { return row.user_invoice ? row.user_invoice.names : ""; } },
      { key: "invoice_date", label: "Fecha de factura", width: "120px" },
      { key: "invoice_name", label: "Nombre", width: "200px" },
      { key: "identification", label: "NIT / CEDULA", width: "120px" },
      { key: "invoice_number", label: "#Factura", width: "140px" },
      // type_name y payment_name van con sortable: false porque no estan en
      // AccountingExpensesController::SORT_COLUMNS. El indice de Gastos si las
      // marca sortable y es un bug preexistente (ordena por invoice_date en
      // silencio); no se replica.
      { key: "type_name", label: "Tipo", width: "160px", sortable: false, render: function(row) { return row.type_identification ? row.type_identification.name : ""; } },
      { key: "payment_name", label: "Medio de pago", width: "150px", sortable: false, render: function(row) { return row.payment_type ? row.payment_type.name : ""; } },
      { key: "currency", label: "Moneda", width: "90px", render: function(row) {
        return React.createElement("span", { "data-testid": "expense-currency-" + row.id }, row.currency || "COP");
      }},
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
      { key: "invoice_value", label: "Valor (COP)", width: "120px", render: function(row) { return React.createElement(NumberFormat, { value: row.invoice_value, displayType: "text", thousandSeparator: true, prefix: "$" }); } },
      { key: "invoice_tax", label: "IVA (COP)", width: "110px", render: function(row) { return React.createElement(NumberFormat, { value: row.invoice_tax, displayType: "text", thousandSeparator: true, prefix: "$" }); } },
      { key: "invoice_total", label: "Total (COP)", width: "120px", render: function(row) { return React.createElement(NumberFormat, { value: row.invoice_total, displayType: "text", thousandSeparator: true, prefix: "$" }); } },
      // sortable: false. La especificacion pedia sortable aqui, pero
      // AccountingExpensesController::SORT_COLUMNS —ya mergeado, y de otro
      // paquete— NO incluye `budget_status`: activarlo haria que el servidor
      // cayera al orden por defecto mientras la flecha del header cambia igual.
      // Se prefiere no ofrecer el orden a ofrecerlo mintiendo. (El indice de
      // Gastos SI lo ordena: alli EXPENSE_SORT_COLUMNS si lo lista.)
      { key: "budget_status", label: "Estado presupuestal", width: "190px", sortable: false, render: function(row) {
        var badge = budgetStatusBadge(row.budget_status);
        return React.createElement("div", { "data-testid": "expense-budget-status-" + row.id },
          React.createElement("span", { className: badge.className }, badge.label),
          row.budget_status === "excedido" && row.budget_reason
            ? React.createElement("div", { className: "cm-cell-truncate", "data-tooltip": row.budget_reason },
                React.createElement("span", { className: "cm-cell-truncate-text" }, row.budget_reason))
            : null
        );
      }},
      // Badge de SOLO LECTURA, sin lapiz: cambiar `is_acepted` es del modulo de
      // Gastos. Aqui es contexto para decidir la aprobacion contable, no una
      // accion (invariante #1: `is_acepted` no se reutiliza para nada nuevo).
      { key: "is_acepted", label: "Estado operativo", width: "140px", render: function(row) {
        var badgeStyle = row.is_acepted
          ? { background: "#d4edda", color: "#155724", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "500" }
          : { background: "#e9ecef", color: "#6c757d", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "500" };
        return React.createElement("span", { style: badgeStyle }, row.is_acepted ? "Aceptado" : "Creado");
      }},
      { key: "accounting_approved", label: "Contabilidad", width: "180px", render: function(row) {
        var badge = accountingBadge(row.accounting_approved);
        return React.createElement("div", { "data-testid": "accounting-status-" + row.id },
          React.createElement("span", { className: badge.className }, badge.label),
          row.accounting_approved
            ? React.createElement("span", { className: "cm-hint", style: { display: "block" } },
                shortDate(row.accounting_approved_at) + (row.accounting_approved_by ? " · " + row.accounting_approved_by.names : ""))
            : null
        );
      }},
    ];
  }

  componentDidMount() {
    this.loadData();
  }

  // Fuente UNICA de los parametros de filtro: la consumen loadData,
  // getExportUrl y approveFilteredAll. Duplicarla es como se produce el bug de
  // "veo 3 filas y apruebo miles".
  filterParams = function() {
    var f = this.state.filters;
    var out = [];
    if (f.cost_center_id) out.push("cost_center_id=" + f.cost_center_id);
    if (f.user_invoice_id) out.push("user_invoice_id=" + f.user_invoice_id);
    if (f.start_date) out.push("start_date=" + f.start_date);
    if (f.end_date) out.push("end_date=" + f.end_date);
    if (f.accounting_approved) out.push("accounting_approved=" + f.accounting_approved);
    if (f.budget_status) out.push("budget_status=" + f.budget_status);
    if (f.currency) out.push("currency=" + f.currency);
    if (f.is_acepted) out.push("is_acepted=" + f.is_acepted);
    if (f.type_identification_id) out.push("type_identification_id=" + f.type_identification_id);
    if (f.payment_type_id) out.push("payment_type_id=" + f.payment_type_id);
    return out;
  }.bind(this);

  loadData = function(page, perPage, searchTerm, sortKey, sortDir) {
    var self = this;
    var p = page || this.state.meta.page;
    var pp = perPage || this.state.meta.per_page;
    var term = searchTerm !== undefined ? searchTerm : this.state.searchTerm;
    var sk = sortKey !== undefined ? sortKey : this.state.sortKey;
    var sd = sortDir !== undefined ? sortDir : this.state.sortDir;

    self.setState({ loading: true, loadError: "" });

    var params = ["page=" + p, "per_page=" + pp];
    if (term) params.push("q=" + encodeURIComponent(term));
    if (sk) params.push("sort=" + sk + "&dir=" + sd);
    params = params.concat(this.filterParams());

    fetch("/get_accounting_expenses?" + params.join("&"), { headers: { "X-CSRF-Token": csrfToken() } })
      .then(function(res) {
        // El 403 se resuelve por STATUS y sin parsear el cuerpo dos veces: el
        // gate del controller responde el mismo JSON de error en las cinco
        // rutas y aqui lo unico que importa es no dejar la tabla cargando para
        // siempre.
        if (res.status === 403) {
          self.setState({
            data: [], loading: false,
            loadError: "No tiene permiso para realizar esta acción",
            meta: { total: 0, page: 1, per_page: pp, total_pages: 1 },
          });
          return null;
        }
        if (!res.ok) { throw new Error("HTTP " + res.status); }
        return res.json();
      })
      .then(function(data) {
        if (!data) return;

        var total = data.total || 0;
        // Guarda de pagina fuera de rango: al aprobar el ultimo pendiente de la
        // ultima pagina con el filtro "Pendiente", esa pagina deja de existir y
        // la tabla se quedaria vacia con la paginacion apuntando a la nada.
        var lastPage = Math.max(1, Math.ceil(total / pp));
        if (p > lastPage) { return self.loadData(lastPage, pp, term, sk, sd); }

        self.setState({
          data: data.data || [],
          meta: { total: total, page: p, per_page: pp, total_pages: lastPage },
          loading: false,
          searchTerm: term,
          sortKey: sk,
          sortDir: sd,
        });
      })
      .catch(function() {
        self.setState({
          data: [], loading: false,
          loadError: "No se pudo cargar la información. Intente de nuevo.",
        });
      });
  }.bind(this);

  // --- Ciclo de vida de la seleccion ---------------------------------------
  // Paginar, ordenar y cambiar per_page CONSERVAN la seleccion: el universo de
  // registros no cambia y el usuario esta armando un lote entre paginas. Con
  // per_page = 50, perderla al paginar hace la funcion inutil.
  handlePageChange = function(page) { this.loadData(page); }.bind(this);
  handlePerPageChange = function(pp) { this.loadData(1, pp); }.bind(this);
  handleSort = function(key, dir) { this.loadData(1, undefined, undefined, key, dir); }.bind(this);

  // Buscar SI la limpia: cambia el universo, y conservarla aprobaria registros
  // que el usuario ya no tiene delante.
  handleSearch = function(term) {
    this.setState({ selectedIds: [] }, this.loadData.bind(this, 1, undefined, term));
  }.bind(this);

  toggleFilters = function() {
    var self = this;
    var willClose = this.state.showFilters;
    this.setState({ showFilters: !this.state.showFilters }, function() {
      if (willClose) {
        self.setState({
          filters: Object.assign({}, EMPTY_FILTERS),
          filterCostCenter: null, filterUser: null, filterType: null, filterPayment: null,
          filterCostCenterOptions: [], isFiltering: false, selectedIds: [],
        }, function() { self.loadData(1); });
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
          self.setState({
            filterCostCenterOptions: data.map(function(d) { return { value: d.id, label: d.label }; }),
            filterCostCenterLoading: false,
          });
        })
        .catch(function() { self.setState({ filterCostCenterOptions: [], filterCostCenterLoading: false }); });
    }, 300);
  }.bind(this);

  applyFilters = function() {
    this.setState({ isFiltering: true, selectedIds: [] }, this.loadData.bind(this, 1));
  }.bind(this);

  clearFilters = function() {
    this.setState({
      filters: Object.assign({}, EMPTY_FILTERS),
      filterCostCenter: null, filterUser: null, filterType: null, filterPayment: null,
      filterCostCenterOptions: [], isFiltering: false, selectedIds: [],
    }, this.loadData.bind(this, 1));
  }.bind(this);

  toggleRow = function(row) {
    var ids = this.state.selectedIds.slice();
    var i = ids.indexOf(row.id);
    if (i === -1) { ids.push(row.id); } else { ids.splice(i, 1); }
    this.setState({ selectedIds: ids });
  }.bind(this);

  // `rows` son SOLO las filas de la pagina actual: el checkbox del encabezado
  // nunca alcanza el resultado completo del filtro. Para eso esta el boton
  // explicito de aprobar el filtro entero, que ademas pasa por la guarda del
  // servidor.
  toggleAllPage = function(rows, checked) {
    var ids = this.state.selectedIds.slice();
    rows.forEach(function(r) {
      var i = ids.indexOf(r.id);
      if (checked && i === -1) { ids.push(r.id); }
      if (!checked && i !== -1) { ids.splice(i, 1); }
    });
    this.setState({ selectedIds: ids });
  }.bind(this);

  clearSelection = function() { this.setState({ selectedIds: [] }); }.bind(this);

  openMenu = function(e) { window.cmOpenMenu(e); }.bind(this);

  // Aprobacion individual. Conserva la seleccion: es una accion independiente
  // del lote que el usuario este armando.
  updateAccountingState = function(row, state) {
    var self = this;

    fetch("/update_accounting_state/" + row.id + "/" + state, {
      method: "PATCH",
      headers: { "X-CSRF-Token": csrfToken(), "Content-Type": "application/json" },
    })
      .then(function(res) {
        if (res.status === 403) {
          Swal.fire({ icon: "error", title: "¡Ocurrió un error!",
                      text: "No tiene permiso para realizar esta acción", confirmButtonColor: "#2a3f53" });
          return null;
        }
        return res.json();
      })
      .then(function(data) {
        if (!data) return;

        // El motivo del rechazo viaja SOLO en message[0]: C.3 rechaza aprobar un
        // gasto excedido y un recalculo entre el loadData y el clic puede haber
        // cambiado el estado. Un Swal generico dejaria al contador sin saber por
        // que no pudo aprobar.
        if (data.type === "error") {
          Swal.fire({ icon: "error", title: data.success || "¡Ocurrió un error!",
                      text: (data.message && data.message[0]) || "", confirmButtonColor: "#2a3f53" });
        } else {
          self.loadData();
          Swal.fire({ position: "center", icon: "success", title: data.success,
                      showConfirmButton: false, timer: 1500 });
        }
      })
      .catch(function() {
        Swal.fire({ icon: "error", title: "¡Ocurrió un error!",
                    text: "No se pudo actualizar el gasto", confirmButtonColor: "#2a3f53" });
      });
  }.bind(this);

  getRowActions = function(row) {
    var self = this;
    if (!this.estados.approve) return null;

    var approved = !!row.accounting_approved;

    // El dropdown tiene que ser el HERMANO INMEDIATO del trigger:
    // window.cmOpenMenu (layouts/user.html.erb) lo busca con nextElementSibling.
    // Un Fragment que renderice un nodo o un `condicion && ...` en medio deja el
    // menu sin abrir y sin error.
    return React.createElement("div", { className: "cm-dt-menu" },
      React.createElement("button", {
        className: "cm-dt-menu-trigger",
        onClick: self.openMenu,
        "data-testid": "accounting-row-menu-" + row.id
      }, React.createElement("i", { className: "fas fa-ellipsis-v" })),
      React.createElement("div", { className: "cm-dt-menu-dropdown" },
        approved
          ? React.createElement("button", {
              onClick: function() { self.updateAccountingState(row, "false"); },
              className: "cm-dt-menu-item cm-dt-menu-item--danger",
              "data-testid": "accounting-unapprove-" + row.id
            }, React.createElement("i", { className: "fas fa-undo" }), " Desaprobar")
          : React.createElement("button", {
              onClick: function() { self.updateAccountingState(row, "true"); },
              className: "cm-dt-menu-item",
              "data-testid": "accounting-approve-" + row.id
            }, React.createElement("i", { className: "fas fa-check" }), " Aprobar")
      )
    );
  }.bind(this);

  // Aprobacion por seleccion multiple: UNA sola request con un ids[] por cada
  // id. El backend acepta `ids[]` como filtro valido (§C.4) y aplica el mismo
  // tope de 500; N requests secuenciales quedaron descartadas por auditoria
  // (sin atomicidad y con estado intermedio si la cuarta falla).
  approveSelected = function() {
    var self = this;
    var ids = this.state.selectedIds.slice();
    var n = ids.length;
    if (n === 0 || n > MAX_BULK) return;

    Swal.fire({
      title: "¿Aprobar " + n + " gastos?",
      text: "Quedarán marcados como aprobados por contabilidad, con su nombre y la fecha de hoy.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#2a3f53",
      cancelButtonColor: "#dc3545",
      confirmButtonText: "Sí, aprobar",
      cancelButtonText: "Cancelar",
    }).then(function(result) {
      if (!result.value) return;

      self.setState({ bulkRunning: true });
      var params = ids.map(function(id) { return "ids[]=" + id; });
      self.runBulk("/update_accounting_filter_values?" + params.join("&"));
    });
  }.bind(this);

  approveFilteredAll = function() {
    var self = this;
    var params = this.filterParams();

    Swal.fire({
      title: "¿Aprobar " + this.state.meta.total + " gastos?",
      text: "Se aprobarán TODOS los gastos que coinciden con el filtro, no solo los de esta página.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#2a3f53",
      cancelButtonColor: "#dc3545",
      confirmButtonText: "Sí, aprobar",
      cancelButtonText: "Cancelar",
    }).then(function(result) {
      if (!result.value) return;

      self.setState({ bulkRunning: true });
      self.runBulk("/update_accounting_filter_values?" + params.join("&"));
    });
  }.bind(this);

  // Camino comun de los dos lotes. `bulkRunning: false` se restablece en los
  // TRES caminos (exito, error y excepcion de red): dejarlo en true con un fallo
  // de red congela el boton y obliga a recargar perdiendo la seleccion.
  runBulk = function(url) {
    var self = this;

    fetch(url, {
      method: "PATCH",
      headers: { "X-CSRF-Token": csrfToken(), "Content-Type": "application/json" },
    })
      .then(function(res) {
        if (res.status === 403) {
          self.setState({ bulkRunning: false });
          Swal.fire({ icon: "error", title: "¡Ocurrió un error!",
                      text: "No tiene permiso para realizar esta acción", confirmButtonColor: "#2a3f53" });
          return null;
        }
        return res.json();
      })
      .then(function(data) {
        if (!data) return;

        if (data.type === "error") {
          // La seleccion se CONSERVA: el usuario afina el filtro o reduce el
          // lote sin volver a marcar cincuenta casillas.
          self.setState({ bulkRunning: false });
          Swal.fire({ icon: "error", title: data.success || "¡Ocurrió un error!",
                      text: (data.message && data.message[0]) || "", confirmButtonColor: "#2a3f53" });
          return;
        }

        // Se muestra `data.success` TAL CUAL: el `count` del servidor puede ser
        // menor que lo seleccionado (registros borrados o que pasaron a
        // excedido entre el marcado y el envio). Contar en el cliente afirmaria
        // un numero falso.
        self.setState({ bulkRunning: false, selectedIds: [] }, function() { self.loadData(); });
        Swal.fire({ position: "center", icon: "success", title: data.success,
                    showConfirmButton: false, timer: 2000 });
      })
      .catch(function() {
        self.setState({ bulkRunning: false });
        Swal.fire({ icon: "error", title: "¡Ocurrió un error!",
                    text: "No se pudo completar la aprobación masiva", confirmButtonColor: "#2a3f53" });
      });
  }.bind(this);

  // El export IGNORA la seleccion a proposito: exporta el resultado del filtro.
  // Nunca lleva ids[].
  getExportUrl = function() {
    if (!this.state.isFiltering) return "/download_file/accounting_expenses/todos.xlsx";
    return "/download_file/accounting_expenses/filtro.xlsx?" + this.filterParams().join("&");
  }.bind(this);

  renderFilters = function() {
    var self = this;
    var f = this.state.filters;

    return React.createElement("div", { style: { marginBottom: 16 } },
      React.createElement("div", { className: "cm-filter-panel" },
        React.createElement("div", { style: { padding: "14px 20px", borderBottom: "1px solid var(--cm-border)", display: "flex", alignItems: "center", justifyContent: "space-between" } },
          React.createElement("span", { style: { fontFamily: "'Poppins', sans-serif", fontSize: 13, fontWeight: 600, color: "var(--cm-text-muted)" } },
            React.createElement("i", { className: "fas fa-filter", style: { marginRight: 8, opacity: 0.6 } }),
            "Filtros avanzados"
          ),
          React.createElement("button", { onClick: self.toggleFilters, className: "cm-dt-action-btn", title: "Cerrar filtros", style: { width: 28, height: 28 } },
            React.createElement("i", { className: "fas fa-times" })
          )
        ),
        React.createElement("div", { className: "cm-filter-grid" },
          // Fila 1
          React.createElement("div", { className: "cm-form-group", style: { marginBottom: 0 } },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-building", style: { marginRight: 6, opacity: 0.5 } }),
              "Centro de costo",
              React.createElement("span", { className: "cm-hint", style: { marginLeft: 4 } }, "(3+ letras)")
            ),
            // El data-testid va en el DIV envolvente y no en el <Select>:
            // react-select no reenvia atributos arbitrarios al DOM. Es el mismo
            // patron de expense-user-select / expense-cost-center-select.
            React.createElement("div", { "data-testid": "accounting-filter-cost-center" },
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
            )
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
          // Fila 2
          React.createElement("div", { className: "cm-form-group", style: { marginBottom: 0 } },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-file-invoice-dollar", style: { marginRight: 6, opacity: 0.5 } }),
              "Aprobado por contabilidad"
            ),
            React.createElement("select", { name: "accounting_approved", className: "cm-input", value: f.accounting_approved, onChange: self.handleFilterChange, "data-testid": "accounting-filter-approved" },
              React.createElement("option", { value: "" }, "Todos"),
              React.createElement("option", { value: "true" }, "Aprobado"),
              React.createElement("option", { value: "false" }, "Pendiente")
            )
          ),
          React.createElement("div", { className: "cm-form-group", style: { marginBottom: 0 } },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-coins", style: { marginRight: 6, opacity: 0.5 } }),
              "Estado presupuestal"
            ),
            // SIN la opcion "Excedido": §2.3 fija que esta vista no lista los
            // excedidos, asi que ofrecerla devolveria siempre 0 resultados y
            // pareceria un fallo del filtro.
            React.createElement("select", { name: "budget_status", className: "cm-input", value: f.budget_status, onChange: self.handleFilterChange },
              React.createElement("option", { value: "" }, "Todos"),
              React.createElement("option", { value: "aprobado" }, "Aprobado"),
              React.createElement("option", { value: "sin_presupuesto" }, "Sin presupuesto")
            )
          ),
          React.createElement("div", { className: "cm-form-group", style: { marginBottom: 0 } },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-money-bill-wave", style: { marginRight: 6, opacity: 0.5 } }),
              "Moneda"
            ),
            React.createElement("select", { name: "currency", className: "cm-input", value: f.currency, onChange: self.handleFilterChange },
              [React.createElement("option", { key: "", value: "" }, "Todas")].concat(
                self.currencyOptions.map(function(c) {
                  return React.createElement("option", { key: c.value, value: c.value }, c.label);
                })
              )
            )
          ),
          React.createElement("div", { className: "cm-form-group", style: { marginBottom: 0 } },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-flag", style: { marginRight: 6, opacity: 0.5 } }),
              "Estado operativo"
            ),
            React.createElement("select", { name: "is_acepted", className: "cm-input", value: f.is_acepted, onChange: self.handleFilterChange },
              React.createElement("option", { value: "" }, "Todos"),
              React.createElement("option", { value: "true" }, "Aceptado"),
              React.createElement("option", { value: "false" }, "No aceptado")
            )
          ),
          // Fila 3
          React.createElement("div", { className: "cm-form-group", style: { marginBottom: 0 } },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-tag", style: { marginRight: 6, opacity: 0.5 } }),
              "Tipo"
            ),
            React.createElement(Select, {
              options: self.typeOptions,
              value: self.state.filterType,
              onChange: function(opt) { self.setState({ filterType: opt, filters: Object.assign({}, f, { type_identification_id: opt ? opt.value : "" }) }); },
              placeholder: "Seleccionar tipo...",
              isClearable: true,
              styles: selectStyles,
              menuPortalTarget: document.body,
            })
          ),
          React.createElement("div", { className: "cm-form-group", style: { marginBottom: 0 } },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-credit-card", style: { marginRight: 6, opacity: 0.5 } }),
              "Medio de pago"
            ),
            React.createElement(Select, {
              options: self.paymentOptions,
              value: self.state.filterPayment,
              onChange: function(opt) { self.setState({ filterPayment: opt, filters: Object.assign({}, f, { payment_type_id: opt ? opt.value : "" }) }); },
              placeholder: "Seleccionar...",
              isClearable: true,
              styles: selectStyles,
              menuPortalTarget: document.body,
            })
          ),
          React.createElement("div", { style: { gridColumn: "1 / -1", display: "flex", alignItems: "flex-end", justifyContent: "flex-end", gap: 10 } },
            React.createElement("button", { className: "cm-btn cm-btn-outline cm-btn-sm", type: "button", onClick: self.clearFilters, "data-testid": "accounting-filter-clear" },
              React.createElement("i", { className: "fas fa-eraser" }), " Limpiar"
            ),
            React.createElement("button", { className: "cm-btn cm-btn-accent cm-btn-sm", type: "button", onClick: self.applyFilters, "data-testid": "accounting-filter-apply" },
              React.createElement("i", { className: "fas fa-search" }), " Aplicar filtros"
            )
          )
        )
      )
    );
  }.bind(this);

  renderSelectionBar = function() {
    var self = this;
    var ids = this.state.selectedIds;
    var n = ids.length;
    if (n === 0) return null;

    var overLimit = n > MAX_BULK;
    var rows = this.state.data;
    var allPageSelected = rows.length > 0 && rows.every(function(r) { return ids.indexOf(r.id) !== -1; });
    // El boton del filtro completo SOLO aparece con filtro aplicado: C.4 rechaza
    // en el servidor las llamadas sin ningun filtro, y ofrecer un boton que
    // siempre falla es peor que no ofrecerlo.
    var showFilterButton = allPageSelected && this.state.isFiltering && this.state.meta.total > n;

    return React.createElement("div", { className: "cm-dt-selection-bar", "data-testid": "accounting-selection-bar" },
      React.createElement("span", null,
        React.createElement("strong", { "data-testid": "accounting-selection-count" }, String(n)),
        " seleccionados"
      ),
      React.createElement("button", {
        type: "button",
        className: "cm-btn cm-btn-success cm-btn-sm",
        onClick: self.approveSelected,
        disabled: self.state.bulkRunning || overLimit,
        "data-testid": "accounting-approve-selected"
      }, React.createElement("i", { className: "fas fa-check-double" }), " Aprobar seleccionados (" + n + ")"),
      React.createElement("button", {
        type: "button",
        className: "cm-btn cm-btn-outline cm-btn-sm",
        onClick: self.clearSelection,
        "data-testid": "accounting-clear-selection"
      }, React.createElement("i", { className: "fas fa-times" }), " Limpiar selección"),
      showFilterButton
        ? React.createElement("button", {
            type: "button",
            className: "cm-btn cm-btn-outline cm-btn-sm",
            onClick: self.approveFilteredAll,
            disabled: self.state.bulkRunning,
            "data-testid": "accounting-approve-filter"
          }, React.createElement("i", { className: "fas fa-layer-group" }), " Aprobar los " + self.state.meta.total + " del filtro completo")
        : null,
      overLimit
        ? React.createElement("span", { className: "cm-hint", style: { color: "#dc3545", width: "100%" } },
            "Máximo " + MAX_BULK + " por operación. Reduzca la selección.")
        : null
    );
  }.bind(this);

  renderHeaderActions = function() {
    var self = this;
    var buttons = [];

    buttons.push(
      React.createElement("button", {
        key: "filter",
        onClick: self.toggleFilters,
        className: "cm-btn " + (self.state.showFilters ? "cm-btn-accent" : "cm-btn-outline"),
        "data-testid": "accounting-filter-toggle",
      }, React.createElement("i", { className: "fas fa-filter" }), " Filtros")
    );

    if (this.estados.export) {
      buttons.push(
        React.createElement("a", {
          key: "export",
          href: self.getExportUrl(),
          target: "_blank",
          rel: "noopener noreferrer",
          className: "cm-btn cm-btn-outline",
          title: "Exporta el resultado del filtro, no la selección",
          "data-testid": "accounting-export",
        }, React.createElement("i", { className: "fas fa-file-excel" }), " Exportar")
      );
    }

    return React.createElement("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap" } }, buttons);
  }.bind(this);

  render() {
    return React.createElement("div", { className: "cm-page", "data-testid": "accounting-page" },
      this.state.showFilters && this.renderFilters(),

      this.state.loadError
        ? React.createElement("div", { className: "cm-alert cm-alert-error", style: { marginBottom: 12 } },
            React.createElement("i", { className: "fas fa-exclamation-circle" }),
            React.createElement("span", null, this.state.loadError))
        : null,

      this.renderSelectionBar(),

      React.createElement(CmDataTable, {
        columns: this.columns,
        data: this.state.data,
        loading: this.state.loading,
        // Las DOS props son obligatorias: si serverMeta llegara undefined,
        // CmDataTable cae a paginacion de cliente SIN error y muestra 10 filas
        // de las 50 que trajo el servidor.
        serverPagination: true,
        serverMeta: this.state.meta,
        onSort: this.handleSort,
        onPageChange: this.handlePageChange,
        onPerPageChange: this.handlePerPageChange,
        onSearch: this.handleSearch,
        // Los checkboxes van atados al permiso de aprobar: sin el, no hay nada
        // que hacer con una seleccion.
        selectable: !!this.estados.approve,
        selectedIds: this.state.selectedIds,
        onToggleRow: this.toggleRow,
        onToggleAllPage: this.toggleAllPage,
        actions: this.getRowActions,
        headerActions: this.renderHeaderActions(),
        searchPlaceholder: "Buscar por ID, nombre, NIT o # de factura...",
        emptyMessage: "No hay gastos para aprobar",
      })
    );
  }
}

export default AccountingExpenseIndex;
WebpackerReact.setup({ AccountingExpenseIndex });
