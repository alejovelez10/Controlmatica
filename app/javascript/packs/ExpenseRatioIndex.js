import React from "react";
import WebpackerReact from "webpacker-react";
import Swal from "sweetalert2";
import Select from "react-select";
import NumberFormat from "react-number-format";
import { CmDataTable, CmPageActions } from "../generalcomponents/ui";
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
  user_direction_id: "",
  user_report_id: "",
  start_date: "",
  end_date: "",
  area: "",
};

var EMPTY_FORM = {
  creation_date: "",
  user_report_id: "",
  start_date: "",
  end_date: "",
  area: "",
  observations: "",
  user_direction_id: "",
  anticipo: "",
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

class ExpenseRatioIndex extends React.Component {
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
      filters: Object.assign({}, EMPTY_FILTERS),
      filterUserDirection: null,
      filterUserReport: null,
      // Modal
      modal: false,
      modeEdit: false,
      editId: null,
      ErrorValues: true,
      form: Object.assign({}, EMPTY_FORM),
      selectedUserDirection: null,
      selectedUserReport: null,
    };

    this.userOptions = (props.users || []).map(function(u) {
      return { label: u.names, value: u.id };
    });

    this.columns = [
      { key: "user_direction_name", label: "Director", width: "180px", render: function(row) { return row.user_direction ? row.user_direction.names : ""; } },
      { key: "user_report_name", label: "Empleado", width: "180px", render: function(row) { return row.user_report ? row.user_report.names : ""; } },
      { key: "area", label: "Área", width: "150px" },
      { key: "creation_date", label: "Fecha Creación", width: "130px" },
      { key: "start_date", label: "Fecha Inicial", width: "130px" },
      { key: "end_date", label: "Fecha Final", width: "130px" },
      { key: "anticipo", label: "Anticipo", width: "120px", render: function(row) { return React.createElement(NumberFormat, { value: row.anticipo, displayType: "text", thousandSeparator: true, prefix: "$" }); } },
      { key: "observations", label: "Observaciones", width: "200px" },
      {
        key: "created_at",
        label: "Creación",
        width: "220px",
        render: function(row) {
          return React.createElement("span", null,
            formatDate(row.created_at),
            row.user ? React.createElement("span", null, React.createElement("br"), row.user.names) : null
          );
        }
      },
      {
        key: "updated_at",
        label: "Ultima actualización",
        width: "220px",
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

  // ─── Data Loading ───

  loadData = function(page, perPage, searchTerm, sortKey, sortDir) {
    var self = this;
    var p = page || this.state.meta.page;
    var pp = perPage || this.state.meta.per_page;
    var term = searchTerm !== undefined ? searchTerm : this.state.searchTerm;
    var sk = sortKey !== undefined ? sortKey : this.state.sortKey;
    var sd = sortDir !== undefined ? sortDir : this.state.sortDir;
    var f = this.state.filters;

    self.setState({ loading: true });

    var params = ["page=" + p, "per_page=" + pp];
    if (term) params.push("q=" + encodeURIComponent(term));
    if (sk) params.push("sort=" + sk + "&dir=" + sd);
    if (f.user_direction_id) params.push("user_direction_id=" + f.user_direction_id);
    if (f.user_report_id) params.push("user_report_id=" + f.user_report_id);
    if (f.start_date) params.push("start_date=" + f.start_date);
    if (f.end_date) params.push("end_date=" + f.end_date);
    if (f.area) params.push("area=" + encodeURIComponent(f.area));

    fetch("/get_expense_ratios?" + params.join("&"), { headers: { "X-CSRF-Token": csrfToken() } })
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

  // ─── Pagination / Search / Sort ───

  handlePageChange = function(page) { this.loadData(page); }.bind(this);
  handlePerPageChange = function(pp) { this.loadData(1, pp); }.bind(this);
  handleSearch = function(term) { this.loadData(1, undefined, term); }.bind(this);
  handleSort = function(key, dir) { this.loadData(1, undefined, undefined, key, dir); }.bind(this);

  // ─── Filters ───

  toggleFilters = function() {
    var self = this;
    var willClose = this.state.showFilters;
    this.setState({ showFilters: !this.state.showFilters }, function() {
      if (willClose) {
        self.setState({ filters: Object.assign({}, EMPTY_FILTERS), filterUserDirection: null, filterUserReport: null }, function() {
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

  applyFilters = function() { this.loadData(1); }.bind(this);

  clearFilters = function() {
    this.setState({
      filters: Object.assign({}, EMPTY_FILTERS),
      filterUserDirection: null,
      filterUserReport: null,
    }, this.loadData.bind(this, 1));
  }.bind(this);

  // ─── Modal ───

  openNewModal = function() {
    this.setState({
      modal: true,
      modeEdit: false,
      editId: null,
      ErrorValues: true,
      form: Object.assign({}, EMPTY_FORM),
      selectedUserDirection: null,
      selectedUserReport: null,
    });
  }.bind(this);

  openEditModal = function(row) {
    this.setState({
      modal: true,
      modeEdit: true,
      editId: row.id,
      ErrorValues: true,
      form: {
        creation_date: row.creation_date || "",
        user_report_id: row.user_report_id || "",
        start_date: row.start_date || "",
        end_date: row.end_date || "",
        area: row.area || "",
        observations: row.observations || "",
        user_direction_id: row.user_direction_id || "",
        anticipo: row.anticipo || "",
      },
      selectedUserDirection: row.user_direction ? { value: row.user_direction.id, label: row.user_direction.names } : null,
      selectedUserReport: row.user_report ? { value: row.user_report.id, label: row.user_report.names } : null,
    });
  }.bind(this);

  closeModal = function() { this.setState({ modal: false }); }.bind(this);

  handleFormChange = function(e) {
    var name = e.target.name;
    var value = e.target.value;
    this.setState({ form: Object.assign({}, this.state.form, { [name]: value }) });
  }.bind(this);

  handleFormChangeMoney = function(e) {
    var value = e.target.value.replace(/\$|,/g, "");
    this.setState({ form: Object.assign({}, this.state.form, { [e.target.name]: value }) });
  }.bind(this);

  // ─── Submit ───

  handleSubmit = function() {
    var self = this;
    var form = this.state.form;

    // Validation
    if (!form.creation_date || !form.user_report_id || !form.start_date || !form.end_date || !form.area || !form.user_direction_id || !form.anticipo) {
      this.setState({ ErrorValues: false });
      return;
    }

    var isEdit = this.state.modeEdit;
    var url = isEdit ? "/expense_ratios/" + this.state.editId : "/expense_ratios";
    var method = isEdit ? "PATCH" : "POST";

    fetch(url, {
      method: method,
      headers: { "X-CSRF-Token": csrfToken(), "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        self.setState({ modal: false });
        self.loadData();
        Swal.fire({ position: "center", icon: data.type || "success", title: data.success || (isEdit ? "Actualizado" : "Creado"), showConfirmButton: false, timer: 1500 });
      });
  }.bind(this);

  // ─── Delete ───

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
        fetch("/expense_ratios/" + row.id, { method: "DELETE", headers: { "X-CSRF-Token": csrfToken() } })
          .then(function(r) { return r.json(); })
          .then(function() {
            self.loadData();
            Swal.fire({ title: "Eliminado", icon: "success", timer: 1500, showConfirmButton: false });
          });
      }
    });
  }.bind(this);

  // ─── Row Actions ───

  openMenu = function(e) { window.cmOpenMenu(e); }.bind(this);

  getRowActions = function(row) {
    var self = this;
    var estados = this.props.estados;
    var hasEdit = estados.edit;
    var hasPdf = estados.pdf;
    var hasDelete = estados.delete;

    if (!hasEdit && !hasPdf && !hasDelete) return null;

    return React.createElement("div", { className: "cm-dt-menu" },
      React.createElement("button", { className: "cm-dt-menu-trigger", onClick: self.openMenu },
        React.createElement("i", { className: "fas fa-ellipsis-v" })
      ),
      React.createElement("div", { className: "cm-dt-menu-dropdown" },
        hasEdit && React.createElement("button", {
          onClick: function() { self.openEditModal(row); },
          className: "cm-dt-menu-item"
        }, React.createElement("i", { className: "fas fa-pen" }), " Editar"),
        hasPdf && React.createElement("button", {
          onClick: function() { window.open("/expense_ratio_pdf/" + row.id + ".pdf", "_blank"); },
          className: "cm-dt-menu-item"
        }, React.createElement("i", { className: "fas fa-file-pdf" }), " PDF"),
        hasDelete && React.createElement("button", {
          onClick: function() { self.handleDelete(row); },
          className: "cm-dt-menu-item cm-dt-menu-item--danger"
        }, React.createElement("i", { className: "fas fa-trash" }), " Eliminar")
      )
    );
  }.bind(this);

  renderHeaderActions = function() {
    var self = this;

    return React.createElement("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap" }},
      React.createElement("button", {
        onClick: self.toggleFilters,
        className: "cm-btn " + (self.state.showFilters ? "cm-btn-accent" : "cm-btn-outline"),
      },
        React.createElement("i", { className: "fas fa-filter" }),
        " Filtros"
      )
    );
  }.bind(this);

  // ─── Render Filters ───

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
              React.createElement("i", { className: "fas fa-user-tie", style: { marginRight: 6, opacity: 0.5 } }),
              "Director"
            ),
            React.createElement(Select, {
              options: self.userOptions,
              value: self.state.filterUserDirection,
              onChange: function(opt) { self.setState({ filterUserDirection: opt, filters: Object.assign({}, f, { user_direction_id: opt ? opt.value : "" }) }); },
              placeholder: "Seleccione director...",
              isClearable: true,
              styles: selectStyles,
              menuPortalTarget: document.body,
            })
          ),
          React.createElement("div", { className: "cm-form-group", style: { marginBottom: 0 } },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-user", style: { marginRight: 6, opacity: 0.5 } }),
              "Empleado"
            ),
            React.createElement(Select, {
              options: self.userOptions,
              value: self.state.filterUserReport,
              onChange: function(opt) { self.setState({ filterUserReport: opt, filters: Object.assign({}, f, { user_report_id: opt ? opt.value : "" }) }); },
              placeholder: "Seleccione empleado...",
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
              React.createElement("i", { className: "fas fa-building", style: { marginRight: 6, opacity: 0.5 } }),
              "Área"
            ),
            React.createElement("input", { type: "text", name: "area", className: "cm-input", value: f.area, onChange: self.handleFilterChange, placeholder: "Buscar por área..." })
          ),
          React.createElement("div", null),
          React.createElement("div", null),
          React.createElement("div", { style: { display: "flex", alignItems: "flex-end", justifyContent: "flex-end", gap: 10 } },
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

  // ─── Render Modal ───

  renderModal = function() {
    var self = this;
    var form = this.state.form;
    var isEdit = this.state.modeEdit;
    var title = isEdit ? "Editar Relación de Gasto" : "Nueva Relación de Gasto";
    var hasError = function(field) { return self.state.ErrorValues === false && !form[field]; };

    if (!this.state.modal) return null;

    return React.createElement(Modal, { isOpen: true, toggle: self.closeModal, className: "modal-dialog-centered modal-lg", backdrop: "static" },
      React.createElement("div", { className: "cm-modal-container" },
        React.createElement("div", { className: "cm-modal-header" },
          React.createElement("div", { className: "cm-modal-header-content" },
            React.createElement("div", { className: "cm-modal-icon" },
              React.createElement("i", { className: "fas fa-calculator" })
            ),
            React.createElement("div", null,
              React.createElement("h2", { className: "cm-modal-title" }, title),
              React.createElement("p", { className: "cm-modal-subtitle" }, "Complete los campos para gestionar la relación de gasto")
            )
          ),
          React.createElement("button", { type: "button", className: "cm-modal-close", onClick: self.closeModal },
            React.createElement("i", { className: "fa fa-times" })
          )
        ),
        React.createElement("form", null,
          React.createElement(ModalBody, { className: "cm-modal-body cm-modal-scroll" },
            React.createElement("div", { className: "cm-form-grid-2" },
              // Director
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  React.createElement("i", { className: "fas fa-user-tie" }),
                  " Director"
                ),
                React.createElement(Select, {
                  options: self.userOptions,
                  value: self.state.selectedUserDirection,
                  onChange: function(opt) { self.setState({ selectedUserDirection: opt, form: Object.assign({}, form, { user_direction_id: opt ? opt.value : "" }) }); },
                  placeholder: "Seleccionar director...",
                  styles: selectStyles,
                  menuPortalTarget: document.body,
                  className: hasError("user_direction_id") ? "cm-select-error" : "",
                })
              ),
              // Empleado
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  React.createElement("i", { className: "fas fa-user" }),
                  " Empleado"
                ),
                React.createElement(Select, {
                  options: self.userOptions,
                  value: self.state.selectedUserReport,
                  onChange: function(opt) { self.setState({ selectedUserReport: opt, form: Object.assign({}, form, { user_report_id: opt ? opt.value : "" }) }); },
                  placeholder: "Seleccionar empleado...",
                  styles: selectStyles,
                  menuPortalTarget: document.body,
                  className: hasError("user_report_id") ? "cm-select-error" : "",
                })
              ),
              // Área
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  React.createElement("i", { className: "fas fa-map-marker-alt" }),
                  " Área"
                ),
                React.createElement("input", { type: "text", name: "area", value: form.area || "", onChange: self.handleFormChange, placeholder: "Área", className: hasError("area") ? "cm-input cm-input-error" : "cm-input" })
              ),
              // Anticipo
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  React.createElement("i", { className: "fas fa-dollar-sign" }),
                  " Anticipo"
                ),
                React.createElement(NumberFormat, { name: "anticipo", thousandSeparator: true, prefix: "$", value: form.anticipo || "", onChange: self.handleFormChangeMoney, placeholder: "$0", className: hasError("anticipo") ? "cm-input cm-input-error" : "cm-input" })
              ),
              // Fecha de Creación
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  React.createElement("i", { className: "fas fa-calendar-plus" }),
                  " Fecha de Creación"
                ),
                React.createElement("input", { type: "date", name: "creation_date", value: form.creation_date || "", onChange: self.handleFormChange, className: hasError("creation_date") ? "cm-input cm-input-error" : "cm-input" })
              ),
              // Fecha Inicial
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  React.createElement("i", { className: "fas fa-calendar-alt" }),
                  " Fecha Inicial"
                ),
                React.createElement("input", { type: "date", name: "start_date", value: form.start_date || "", onChange: self.handleFormChange, className: hasError("start_date") ? "cm-input cm-input-error" : "cm-input" })
              ),
              // Fecha Final
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  React.createElement("i", { className: "fas fa-calendar-check" }),
                  " Fecha Final"
                ),
                React.createElement("input", { type: "date", name: "end_date", value: form.end_date || "", onChange: self.handleFormChange, className: hasError("end_date") ? "cm-input cm-input-error" : "cm-input" })
              ),
              // Observaciones
              React.createElement("div", { className: "cm-form-group cm-full-width" },
                React.createElement("label", { className: "cm-label" },
                  React.createElement("i", { className: "fas fa-comment-alt" }),
                  " Observaciones"
                ),
                React.createElement("textarea", { name: "observations", rows: "4", value: form.observations || "", onChange: self.handleFormChange, placeholder: "Observaciones...", className: "cm-input", style: { resize: "vertical", minHeight: "80px" } })
              )
            ),

            self.state.ErrorValues === false && React.createElement("div", { className: "cm-alert cm-alert-error" },
              React.createElement("i", { className: "fas fa-exclamation-circle" }),
              React.createElement("span", null, "Debe completar todos los campos requeridos")
            )
          ),
          React.createElement("div", { className: "cm-modal-footer" },
            React.createElement("button", { type: "button", className: "cm-btn cm-btn-cancel", onClick: self.closeModal },
              React.createElement("i", { className: "fa fa-times" }), " Cancelar"
            ),
            React.createElement("button", { type: "button", className: "cm-btn cm-btn-submit", onClick: self.handleSubmit },
              React.createElement("i", { className: "fa fa-save" }), isEdit ? " Actualizar" : " Crear"
            )
          )
        )
      )
    );
  }.bind(this);

  render() {
    var self = this;

    return React.createElement("div", { className: "cm-page" },
      React.createElement(CmPageActions, {
        onNew: this.props.estados.create ? this.openNewModal : null,
        label: "Crear relación",
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
        emptyMessage: "No hay relaciones de gasto registradas",
      }),

      this.renderModal()
    );
  }
}

export default ExpenseRatioIndex;
WebpackerReact.setup({ ExpenseRatioIndex });
