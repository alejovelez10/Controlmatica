import React from "react";
import WebpackerReact from "webpacker-react";
import Swal from "sweetalert2";
import Select from "react-select";
import NumberFormat from "react-number-format";
import { CmDataTable, CmPageActions, CmModal, CmInput, CmButton } from "../generalcomponents/ui";

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

  openMenu = function(e) {
    e.stopPropagation();
    var btn = e.currentTarget;
    var menu = btn.nextElementSibling;
    var all = document.querySelectorAll('.cm-dt-menu-dropdown.open');
    all.forEach(function(m) { m.classList.remove('open'); });
    var rect = btn.getBoundingClientRect();
    document.body.appendChild(menu);
    menu.style.top = (rect.bottom + 4) + 'px';
    menu.style.left = (rect.right - 160) + 'px';
    menu.classList.add('open');
    var close = function(ev) {
      if (!menu.contains(ev.target) && !btn.contains(ev.target)) {
        menu.classList.remove('open');
        if (btn.parentNode) btn.parentNode.appendChild(menu);
        document.removeEventListener('click', close);
      }
    };
    document.addEventListener('click', close);
  }.bind(this);

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
    var btnStyle = { display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px", fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: "500", borderRadius: "6px", cursor: "pointer", background: "#fff", color: "#6c757d", border: "1px solid #dee2e6", textDecoration: "none" };
    var btnActiveStyle = Object.assign({}, btnStyle, { background: "#f5a623", color: "#fff", borderColor: "#f5a623" });

    return React.createElement("div", { style: { display: "flex", gap: "8px" }},
      React.createElement("button", {
        onClick: self.toggleFilters,
        style: self.state.showFilters ? btnActiveStyle : btnStyle,
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
      React.createElement("div", { className: "cm-dt", style: { overflow: "visible" } },
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
        React.createElement("div", { style: { padding: "20px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" } },
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
            React.createElement("input", { type: "date", name: "start_date", className: "cm-input", value: f.start_date, onChange: self.handleFilterChange, style: { height: 38 } })
          ),
          React.createElement("div", { className: "cm-form-group", style: { marginBottom: 0 } },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-calendar", style: { marginRight: 6, opacity: 0.5 } }),
              "Fecha hasta"
            ),
            React.createElement("input", { type: "date", name: "end_date", className: "cm-input", value: f.end_date, onChange: self.handleFilterChange, style: { height: 38 } })
          ),
          // Row 2
          React.createElement("div", { className: "cm-form-group", style: { marginBottom: 0 } },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-building", style: { marginRight: 6, opacity: 0.5 } }),
              "Área"
            ),
            React.createElement("input", { type: "text", name: "area", className: "cm-input", value: f.area, onChange: self.handleFilterChange, placeholder: "Buscar por área..." })
          ),
          React.createElement("div", { style: { gridColumn: "span 2" } }),
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

    var modalTitle = React.createElement("div", { className: "cm-form-header" },
      React.createElement("div", { className: "cm-form-header-icon-wrapper" },
        React.createElement("i", { className: "fas fa-calculator" })
      ),
      React.createElement("div", null,
        React.createElement("div", { className: "cm-form-header-title" }, title),
        React.createElement("div", { className: "cm-form-header-subtitle" }, "Complete los campos para gestionar la relación de gasto")
      )
    );

    var modalFooter = React.createElement("div", { className: "cm-form-footer" },
      React.createElement(CmButton, { variant: "outline", onClick: self.closeModal },
        React.createElement("i", { className: "fas fa-times" }), " Cancelar"
      ),
      React.createElement(CmButton, { variant: "accent", onClick: self.handleSubmit },
        React.createElement("i", { className: "fas fa-save" }), isEdit ? " Actualizar" : " Crear"
      )
    );

    return React.createElement(CmModal, { isOpen: true, toggle: self.closeModal, size: "lg", title: modalTitle, footer: modalFooter },
      React.createElement("form", null,
        React.createElement("div", { className: "cm-form-grid-2" },
          // Director
          React.createElement("div", { className: "cm-form-group" },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-user-tie" }),
              " Director ", React.createElement("span", { className: "cm-required" }, "*")
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
              " Empleado ", React.createElement("span", { className: "cm-required" }, "*")
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
          )
        ),

        React.createElement("div", { className: "cm-form-grid-2" },
          // Área
          React.createElement("div", { className: "cm-form-group" },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-map-marker-alt" }),
              " Área ", React.createElement("span", { className: "cm-required" }, "*")
            ),
            React.createElement("input", { type: "text", name: "area", value: form.area || "", onChange: self.handleFormChange, placeholder: "Área", className: hasError("area") ? "cm-input cm-input-error" : "cm-input" })
          ),
          // Anticipo
          React.createElement("div", { className: "cm-form-group" },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-dollar-sign" }),
              " Anticipo ", React.createElement("span", { className: "cm-required" }, "*")
            ),
            React.createElement(NumberFormat, { name: "anticipo", thousandSeparator: true, prefix: "$", value: form.anticipo || "", onChange: self.handleFormChangeMoney, placeholder: "$0", className: hasError("anticipo") ? "cm-input cm-input-error" : "cm-input" })
          )
        ),

        React.createElement("div", { className: "cm-form-grid-2" },
          // Fecha de Creación
          React.createElement("div", { className: "cm-form-group" },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-calendar-plus" }),
              " Fecha de Creación ", React.createElement("span", { className: "cm-required" }, "*")
            ),
            React.createElement("input", { type: "date", name: "creation_date", value: form.creation_date || "", onChange: self.handleFormChange, className: hasError("creation_date") ? "cm-input cm-input-error" : "cm-input" })
          ),
          // Fecha Inicial
          React.createElement("div", { className: "cm-form-group" },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-calendar-alt" }),
              " Fecha Inicial ", React.createElement("span", { className: "cm-required" }, "*")
            ),
            React.createElement("input", { type: "date", name: "start_date", value: form.start_date || "", onChange: self.handleFormChange, className: hasError("start_date") ? "cm-input cm-input-error" : "cm-input" })
          )
        ),

        React.createElement("div", { className: "cm-form-grid-2" },
          // Fecha Final
          React.createElement("div", { className: "cm-form-group" },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-calendar-check" }),
              " Fecha Final ", React.createElement("span", { className: "cm-required" }, "*")
            ),
            React.createElement("input", { type: "date", name: "end_date", value: form.end_date || "", onChange: self.handleFormChange, className: hasError("end_date") ? "cm-input cm-input-error" : "cm-input" })
          ),
          React.createElement("div", { className: "cm-form-group" })
        ),

        // Observaciones
        React.createElement("div", { className: "cm-form-group" },
          React.createElement("label", { className: "cm-label" },
            React.createElement("i", { className: "fas fa-comment-alt" }),
            " Observaciones"
          ),
          React.createElement("textarea", { name: "observations", rows: "4", value: form.observations || "", onChange: self.handleFormChange, placeholder: "Observaciones...", className: "cm-input cm-textarea" })
        ),

        self.state.ErrorValues === false && React.createElement("div", { className: "cm-alert cm-alert-error" },
          React.createElement("i", { className: "fas fa-exclamation-circle" }),
          React.createElement("span", null, "Debe completar todos los campos requeridos")
        )
      ),

      // Estilos inline
      React.createElement("style", null, "\n        .cm-form-header { display: flex; align-items: center; gap: 16px; }\n        .cm-form-header-icon-wrapper { width: 48px; height: 48px; background: linear-gradient(135deg, #f5a623 0%, #f7b731 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; color: #fff; box-shadow: 0 4px 12px rgba(245, 166, 35, 0.3); }\n        .cm-form-header-title { font-size: 1.25rem; font-weight: 600; color: #1a1a2e; margin: 0; }\n        .cm-form-header-subtitle { font-size: 12px; color: #6c757d; margin: 2px 0 0 0; }\n        .cm-form-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }\n        @media (max-width: 768px) { .cm-form-grid-2 { grid-template-columns: 1fr; } }\n        .cm-form-group { margin-bottom: 16px; }\n        .cm-label { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 400; color: #374151; margin-bottom: 6px; }\n        .cm-label i { color: #6b7280; font-size: 13px; }\n        .cm-required { color: #dc3545; font-weight: 600; }\n        .cm-input { width: 100%; padding: 10px 14px; font-size: 14px; border: 1px solid #e2e5ea; border-radius: 8px; background: #fcfcfd; transition: all 0.2s ease; box-sizing: border-box; }\n        .cm-input:focus { outline: none; border-color: #f5a623; box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.15); background: #fff; }\n        .cm-input::placeholder { color: #9ca3af; }\n        .cm-input-error { border-color: #dc3545 !important; box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.15) !important; }\n        .cm-select-error .css-yk16xz-control, .cm-select-error .css-1pahdxg-control { border-color: #dc3545 !important; box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.15) !important; }\n        .cm-textarea { resize: vertical; min-height: 80px; }\n        .cm-alert { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 8px; font-size: 14px; margin-top: 16px; }\n        .cm-alert-error { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; }\n        .cm-alert-error i { font-size: 16px; }\n        .cm-form-footer { display: flex; justify-content: flex-end; gap: 12px; padding-top: 8px; }\n      ")
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
