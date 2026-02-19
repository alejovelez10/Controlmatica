import React from "react";
import WebpackerReact from "webpacker-react";
import Swal from "sweetalert2";
import Select from "react-select";
import NumberFormat from "react-number-format";
import { CmDataTable, CmPageActions, CmModal, CmButton } from "../generalcomponents/ui";

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

    this.columns = [
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
    if (f.cost_center_id) params.push("cost_center_id=" + f.cost_center_id);
    if (f.user_invoice_id) params.push("user_invoice_id=" + f.user_invoice_id);
    if (f.start_date) params.push("start_date=" + f.start_date);
    if (f.end_date) params.push("end_date=" + f.end_date);
    if (f.is_acepted) params.push("is_acepted=" + f.is_acepted);

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

  acceptFilteredExpenses = function() {
    var self = this;
    var f = this.state.filters;
    var params = [];
    if (f.cost_center_id) params.push("cost_center_id=" + f.cost_center_id);
    if (f.user_invoice_id) params.push("user_invoice_id=" + f.user_invoice_id);
    if (f.start_date) params.push("start_date=" + f.start_date);
    if (f.end_date) params.push("end_date=" + f.end_date);
    if (f.is_acepted) params.push("is_acepted=" + f.is_acepted);

    fetch("/update_filter_values?" + params.join("&"), {
      method: "PATCH",
      headers: { "X-CSRF-Token": csrfToken(), "Content-Type": "application/json" },
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        self.loadData();
        Swal.fire({ position: "center", icon: data.type || "success", title: data.success || "Gastos aceptados", showConfirmButton: false, timer: 1500 });
      });
  }.bind(this);

  openImportModal = function() { this.setState({ modalImport: true }); }.bind(this);
  closeImportModal = function() { this.setState({ modalImport: false }); }.bind(this);

  getExportUrl = function() {
    var f = this.state.filters;
    if (!this.state.isFiltering) {
      return "/download_file/report_expenses/todos.xlsx";
    }
    var params = [];
    if (f.cost_center_id) params.push("cost_center_id=" + f.cost_center_id);
    if (f.user_invoice_id) params.push("user_invoice_id=" + f.user_invoice_id);
    if (f.start_date) params.push("start_date=" + f.start_date);
    if (f.end_date) params.push("end_date=" + f.end_date);
    if (f.is_acepted) params.push("is_acepted=" + f.is_acepted);
    return "/download_file/report_expenses/filtro.xlsx?" + params.join("&");
  }.bind(this);

  openNewModal = function() {
    var self = this;
    this.setState({
      modal: true, modeEdit: false, editId: null, ErrorValues: true,
      form: Object.assign({}, EMPTY_FORM, { user_invoice_id: self.props.current_user.id }),
      selectedCostCenter: null, formCostCenterOptions: [],
      selectedUser: { value: self.props.current_user.id, label: self.props.current_user.names },
      selectedType: null, selectedPayment: null,
    });
  }.bind(this);

  openEditModal = function(row) {
    var costCenterOption = row.cost_center ? { value: row.cost_center.id, label: row.cost_center.code } : null;
    this.setState({
      modal: true, modeEdit: true, editId: row.id, ErrorValues: true,
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
      },
      selectedCostCenter: costCenterOption,
      formCostCenterOptions: costCenterOption ? [costCenterOption] : [],
      selectedUser: row.user_invoice ? { value: row.user_invoice.id, label: row.user_invoice.names } : null,
      selectedType: row.type_identification ? { value: row.type_identification.id, label: row.type_identification.name } : null,
      selectedPayment: row.payment_type ? { value: row.payment_type.id, label: row.payment_type.name } : null,
    });
  }.bind(this);

  closeModal = function() { this.setState({ modal: false }); }.bind(this);

  handleFormChange = function(e) {
    var name = e.target.name;
    var value = e.target.value;
    this.setState({ form: Object.assign({}, this.state.form, { [name]: value }) });
  }.bind(this);

  handleFormChangeMoney = function(e) {
    var self = this;
    var value = e.target.value.replace(/\$|,/g, "");
    var newForm = Object.assign({}, this.state.form, { [e.target.name]: value });
    var total = (Number(newForm.invoice_value) || 0) + (Number(newForm.invoice_tax) || 0);
    newForm.invoice_total = total;
    this.setState({ form: newForm });
  }.bind(this);

  handleFormCostCenterSearch = function(inputValue) {
    var self = this;
    if (!inputValue || inputValue.length < 3) { self.setState({ formCostCenterOptions: [] }); return; }
    if (self._formCcTimer) clearTimeout(self._formCcTimer);
    self._formCcTimer = setTimeout(function() {
      self.setState({ formCostCenterLoading: true });
      fetch("/search_cost_centers?q=" + encodeURIComponent(inputValue), { headers: { "X-CSRF-Token": csrfToken() } })
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
              React.createElement("i", { className: "fas fa-building", style: { marginRight: 6, opacity: 0.5 } }),
              "Centro de costo",
              React.createElement("span", { style: { fontSize: 10, color: "#9ca3af", marginLeft: 4 } }, "(3+ letras)")
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
              React.createElement("i", { className: "fas fa-flag", style: { marginRight: 6, opacity: 0.5 } }),
              "Estado"
            ),
            React.createElement("select", { name: "is_acepted", className: "cm-input", value: f.is_acepted, onChange: self.handleFilterChange, style: { height: 38 } },
              React.createElement("option", { value: "" }, "Todos"),
              React.createElement("option", { value: "true" }, "Aceptado"),
              React.createElement("option", { value: "false" }, "No aceptado")
            )
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

  renderModal = function() {
    var self = this;
    var form = this.state.form;
    var isEdit = this.state.modeEdit;
    var title = isEdit ? "Editar Gasto" : "Nuevo Gasto";
    var hasError = function(field) { return self.state.ErrorValues === false && !form[field]; };

    if (!this.state.modal) return null;

    var modalTitle = React.createElement("div", { className: "cm-form-header" },
      React.createElement("div", { className: "cm-form-header-icon-wrapper" },
        React.createElement("i", { className: "fas fa-receipt" })
      ),
      React.createElement("div", null,
        React.createElement("div", { className: "cm-form-header-title" }, title),
        React.createElement("div", { className: "cm-form-header-subtitle" }, "Complete los campos para gestionar el gasto")
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
          // Centro de costo
          React.createElement("div", { className: "cm-form-group" },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-building" }),
              " Centro de costo ", React.createElement("span", { className: "cm-required" }, "*"),
              React.createElement("span", { className: "cm-hint" }, " (3 letras)")
            ),
            React.createElement(Select, {
              options: self.state.formCostCenterOptions,
              value: self.state.selectedCostCenter,
              onChange: function(opt) { self.setState({ selectedCostCenter: opt, form: Object.assign({}, form, { cost_center_id: opt ? opt.value : "" }) }); },
              onInputChange: self.handleFormCostCenterSearch,
              isLoading: self.state.formCostCenterLoading,
              placeholder: "Buscar centro de costo...",
              noOptionsMessage: function() { return "Escribe al menos 3 letras"; },
              styles: selectStyles,
              menuPortalTarget: document.body,
              className: hasError("cost_center_id") ? "cm-select-error" : "",
            })
          ),
          // Usuario
          React.createElement("div", { className: "cm-form-group" },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-user" }),
              " Responsable ", React.createElement("span", { className: "cm-required" }, "*")
            ),
            React.createElement(Select, {
              options: self.userOptions,
              value: self.state.selectedUser,
              onChange: function(opt) { self.setState({ selectedUser: opt, form: Object.assign({}, form, { user_invoice_id: opt ? opt.value : "" }) }); },
              placeholder: "Seleccionar...",
              styles: selectStyles,
              menuPortalTarget: document.body,
              className: hasError("user_invoice_id") ? "cm-select-error" : "",
            })
          )
        ),

        React.createElement("div", { className: "cm-form-grid-2" },
          // Nombre
          React.createElement("div", { className: "cm-form-group" },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-file-alt" }),
              " Nombre ", React.createElement("span", { className: "cm-required" }, "*")
            ),
            React.createElement("input", { type: "text", name: "invoice_name", value: form.invoice_name || "", onChange: self.handleFormChange, placeholder: "Nombre del gasto", className: hasError("invoice_name") ? "cm-input cm-input-error" : "cm-input" })
          ),
          // Fecha
          React.createElement("div", { className: "cm-form-group" },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-calendar-alt" }),
              " Fecha de factura ", React.createElement("span", { className: "cm-required" }, "*")
            ),
            React.createElement("input", { type: "date", name: "invoice_date", value: form.invoice_date || "", onChange: self.handleFormChange, className: hasError("invoice_date") ? "cm-input cm-input-error" : "cm-input" })
          )
        ),

        React.createElement("div", { className: "cm-form-grid-2" },
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
          )
        ),

        React.createElement("div", { className: "cm-form-grid-2" },
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
            })
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
            })
          )
        ),

        React.createElement("div", { className: "cm-form-grid-2" },
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
          )
        ),

        React.createElement("div", { className: "cm-form-grid-2" },
          // Total
          React.createElement("div", { className: "cm-form-group" },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-calculator" }),
              " Total"
            ),
            React.createElement(NumberFormat, { name: "invoice_total", thousandSeparator: true, prefix: "$", value: form.invoice_total || "", displayType: "input", className: "cm-input", disabled: true, style: { background: "#e9ecef" } })
          ),
          React.createElement("div", { className: "cm-form-group" })
        ),

        // Descripcion
        React.createElement("div", { className: "cm-form-group" },
          React.createElement("label", { className: "cm-label" },
            React.createElement("i", { className: "fas fa-align-left" }),
            " Descripción"
          ),
          React.createElement("textarea", { name: "description", rows: "3", value: form.description || "", onChange: self.handleFormChange, placeholder: "Descripción del gasto...", className: "cm-input cm-textarea" })
        ),

        self.state.ErrorValues === false && React.createElement("div", { className: "cm-alert cm-alert-error" },
          React.createElement("i", { className: "fas fa-exclamation-circle" }),
          React.createElement("span", null, "Debe completar todos los campos requeridos")
        )
      ),

      // Estilos inline
      React.createElement("style", null, "\n        .cm-form-header { display: flex; align-items: center; gap: 16px; }\n        .cm-form-header-icon-wrapper { width: 48px; height: 48px; background: linear-gradient(135deg, #f5a623 0%, #f7b731 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; color: #fff; box-shadow: 0 4px 12px rgba(245, 166, 35, 0.3); }\n        .cm-form-header-title { font-size: 1.25rem; font-weight: 600; color: #1a1a2e; margin: 0; }\n        .cm-form-header-subtitle { font-size: 12px; color: #6c757d; margin: 2px 0 0 0; }\n        .cm-form-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }\n        @media (max-width: 768px) { .cm-form-grid-2 { grid-template-columns: 1fr; } }\n        .cm-form-group { margin-bottom: 16px; }\n        .cm-label { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 400; color: #374151; margin-bottom: 6px; }\n        .cm-label i { color: #6b7280; font-size: 13px; }\n        .cm-required { color: #dc3545; font-weight: 600; }\n        .cm-hint { font-size: 11px; color: #9ca3af; font-weight: 400; }\n        .cm-input { width: 100%; padding: 10px 14px; font-size: 14px; border: 1px solid #e2e5ea; border-radius: 8px; background: #fcfcfd; transition: all 0.2s ease; box-sizing: border-box; }\n        .cm-input:focus { outline: none; border-color: #f5a623; box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.15); background: #fff; }\n        .cm-input::placeholder { color: #9ca3af; }\n        .cm-input-error { border-color: #dc3545 !important; box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.15) !important; }\n        .cm-select-error .css-yk16xz-control, .cm-select-error .css-1pahdxg-control { border-color: #dc3545 !important; box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.15) !important; }\n        .cm-textarea { resize: vertical; min-height: 80px; }\n        .cm-alert { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 8px; font-size: 14px; margin-top: 16px; }\n        .cm-alert-error { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; }\n        .cm-alert-error i { font-size: 16px; }\n        .cm-form-footer { display: flex; justify-content: flex-end; gap: 12px; padding-top: 8px; }\n      ")
    );
  }.bind(this);

  renderImportModal = function() {
    var self = this;
    if (!this.state.modalImport) return null;

    return React.createElement(CmModal, { isOpen: true, toggle: self.closeImportModal, size: "md", hideHeader: true, footer: null },
      React.createElement("div", { style: { background: "#fcfcfd", padding: "20px 32px", borderBottom: "1px solid #e9ecef", display: "flex", alignItems: "center", justifyContent: "space-between" }},
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "16px" }},
          React.createElement("div", { style: { width: "48px", height: "48px", background: "linear-gradient(135deg, #f5a623 0%, #f7b731 100%)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", color: "#fff", boxShadow: "0 4px 12px rgba(245, 166, 35, 0.3)" }},
            React.createElement("i", { className: "fas fa-file-import" })
          ),
          React.createElement("div", null,
            React.createElement("h2", { style: { fontFamily: "'Poppins', sans-serif", fontSize: "18px", fontWeight: "600", color: "#333", margin: "0 0 2px 0" }}, "Importar archivo"),
            React.createElement("p", { style: { fontSize: "12px", color: "#6c757d", margin: "0" }}, "Suba un archivo Excel para importar gastos")
          )
        ),
        React.createElement("button", { onClick: self.closeImportModal, style: { width: "32px", height: "32px", border: "none", background: "#e9ecef", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6c757d" }},
          React.createElement("i", { className: "fas fa-times" })
        )
      ),
      React.createElement("div", { style: { padding: "24px 32px" }},
        React.createElement("form", { action: "/upload_file/report_expenses", method: "POST", encType: "multipart/form-data" },
          React.createElement("input", { type: "hidden", name: "authenticity_token", value: csrfToken() }),
          React.createElement("div", { style: { marginBottom: "16px" }},
            React.createElement("label", { style: { fontSize: "13px", fontWeight: "400", color: "#495057", marginBottom: "6px", display: "block" }},
              React.createElement("i", { className: "fas fa-file-excel", style: { color: "#6c757d", marginRight: "6px" }}),
              "Seleccionar archivo"
            ),
            React.createElement("input", { type: "file", name: "file", accept: ".xlsx,.xls", className: "cm-input", style: { padding: "8px" } })
          ),
          React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: "12px" }},
            React.createElement("button", { type: "button", onClick: self.closeImportModal, style: { display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 20px", fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: "500", borderRadius: "8px", cursor: "pointer", background: "#fff", color: "#6c757d", border: "1px solid #dee2e6" }},
              React.createElement("i", { className: "fas fa-times" }), " Cancelar"
            ),
            React.createElement("button", { type: "submit", style: { display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 20px", fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: "500", borderRadius: "8px", cursor: "pointer", background: "linear-gradient(135deg, #f5a623 0%, #f7b731 100%)", color: "#fff", border: "none" }},
              React.createElement("i", { className: "fas fa-upload" }), " Subir"
            )
          )
        )
      )
    );
  }.bind(this);

  renderHeaderActions = function() {
    var self = this;
    var btnStyle = { display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px", fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: "500", borderRadius: "6px", cursor: "pointer", background: "#fff", color: "#6c757d", border: "1px solid #dee2e6", textDecoration: "none" };
    var btnActiveStyle = Object.assign({}, btnStyle, { background: "#f5a623", color: "#fff", borderColor: "#f5a623" });
    var btnSuccessStyle = Object.assign({}, btnStyle, { background: "#28a745", color: "#fff", borderColor: "#28a745" });

    var buttons = [];

    // Filtros
    buttons.push(
      React.createElement("button", {
        key: "filter",
        onClick: self.toggleFilters,
        style: self.state.showFilters ? btnActiveStyle : btnStyle,
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
          style: btnSuccessStyle,
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
          style: btnStyle,
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
          style: btnStyle,
        },
          React.createElement("i", { className: "fas fa-file-excel" }),
          " Exportar"
        )
      );
    }

    return React.createElement("div", { style: { display: "flex", gap: "8px" }}, buttons);
  }.bind(this);

  render() {
    return React.createElement("div", { className: "cm-page" },
      React.createElement(CmPageActions, {
        onNew: this.props.estados.create ? this.openNewModal : null,
        label: "Crear gasto",
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
      this.renderImportModal()
    );
  }
}

export default ReportExpenseIndex;
WebpackerReact.setup({ ReportExpenseIndex });
