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
  user_invoice_id: "",
  start_date: "",
  end_date: "",
  customer_invoice_id: "",
  is_acepted: "",
};

var EMPTY_FORM = {
  user_invoice_id: "",
  start_date: "",
  end_date: "",
  customer_invoice_id: "",
  observation: "",
  hours_worked: "",
  value_hour: "",
  hours_worked_code: "",
  hours_cost: "",
  hours_paid: "",
  cost_center_id: "",
  customer_report_id: "",
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

class CommissionIndex extends React.Component {
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
      filterUser: null,
      filterCustomerInvoice: null,
      // Modal
      modal: false,
      modeEdit: false,
      editId: null,
      ErrorValues: true,
      form: Object.assign({}, EMPTY_FORM, { user_invoice_id: props.current_user.id }),
      selectedUser: { value: props.current_user.id, label: props.current_user.names },
      selectedCostCenter: null,
      costCenterOptions: [],
      costCenterLoading: false,
      selectedCustomerReport: null,
      customerReportOptions: [],
      selectedCustomerInvoice: null,
      customerInvoiceOptions: [],
      engineering_value: false,
      // Error de horas
      msg_error: "",
      state_msg_error: false,
      // Estado inline edit
      editingStatusId: null,
    };

    this.userOptions = (props.users || []).map(function(u) {
      return { label: u.names, value: u.id };
    });

    this.customerInvoiceOptions = (props.customer_invoices || []).map(function(ci) {
      return { label: ci.number_invoice, value: ci.id };
    });

    // Timer para debounce de búsqueda de centros de costo
    this._costCenterSearchTimer = null;

    this.columns = [
      { key: "user_invoice_name", label: "Responsable", width: "150px", render: function(row) { return row.user_invoice ? row.user_invoice.names : ""; } },
      { key: "cost_center_code", label: "Centro de costo", width: "150px", render: function(row) { return row.cost_center ? row.cost_center.code : ""; } },
      { key: "customer_report_desc", label: "Reporte de cliente", width: "150px", render: function(row) { return row.customer_report ? row.customer_report.description : ""; } },
      { key: "start_date", label: "Fecha desde", width: "120px" },
      { key: "end_date", label: "Fecha hasta", width: "120px" },
      { key: "customer_invoice_num", label: "Factura", width: "120px", render: function(row) { return row.customer_invoice ? row.customer_invoice.number_invoice : ""; } },
      { key: "hours_worked", label: "Horas trabajadas", width: "130px", render: function(row) { return Math.round(row.hours_worked || 0); } },
    ];

    // Columna condicional: valor hora
    if (props.estados.change_value_hour) {
      this.columns.push({
        key: "value_hour", label: "Valor hora", width: "120px",
        render: function(row) { return React.createElement(NumberFormat, { value: Math.round(row.value_hour || 0), displayType: "text", thousandSeparator: true, prefix: "$", decimalScale: 0 }); }
      });
    }

    this.columns.push(
      { key: "total_value", label: "Total", width: "120px", render: function(row) { return React.createElement(NumberFormat, { value: Math.round(row.total_value || 0), displayType: "text", thousandSeparator: true, prefix: "$", decimalScale: 0 }); } },
      { key: "observation", label: "Observaciones", width: "200px" },
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

        var canEdit = (props.estados.accept_commission && !row.is_acepted) || (row.is_acepted && props.estados.edit_after_acepted);

        return React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px" }},
          React.createElement("span", { style: badgeStyle }, row.is_acepted ? "Aceptado" : "Creado"),
          canEdit && React.createElement("button", {
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
      }
    );
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

    var params = ["page=" + p, "filter=" + pp];
    if (sk) params.push("sort_key=" + sk);
    if (sd) params.push("sort_dir=" + sd);
    if (f.user_invoice_id) params.push("user_invoice_id=" + f.user_invoice_id);
    if (f.start_date) params.push("start_date=" + f.start_date);
    if (f.end_date) params.push("end_date=" + f.end_date);
    if (f.customer_invoice_id) params.push("customer_invoice_id=" + f.customer_invoice_id);
    if (f.is_acepted) params.push("is_acepted=" + f.is_acepted);

    fetch("/get_commissions?" + params.join("&"), { headers: { "X-CSRF-Token": csrfToken() } })
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
      // Si se están cerrando los filtros, limpiar y recargar datos
      if (willClose) {
        self.setState({ filters: Object.assign({}, EMPTY_FILTERS), filterUser: null, filterCustomerInvoice: null, isFiltering: false }, function() {
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

  applyFilters = function() {
    this.setState({ isFiltering: true });
    this.loadData(1);
  }.bind(this);

  clearFilters = function() {
    this.setState({ filters: Object.assign({}, EMPTY_FILTERS), filterUser: null, filterCustomerInvoice: null, isFiltering: false }, this.loadData.bind(this, 1));
  }.bind(this);

  acceptFilteredCommissions = function() {
    var self = this;
    var f = this.state.filters;
    var params = [];
    if (f.user_invoice_id) params.push("user_invoice_id=" + f.user_invoice_id);
    if (f.start_date) params.push("start_date=" + f.start_date);
    if (f.end_date) params.push("end_date=" + f.end_date);
    if (f.customer_invoice_id) params.push("customer_invoice_id=" + f.customer_invoice_id);
    if (f.is_acepted) params.push("is_acepted=" + f.is_acepted);

    fetch("/update_filter_values_commissions?" + params.join("&"), {
      method: "PATCH",
      headers: { "X-CSRF-Token": csrfToken(), "Content-Type": "application/json" },
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        self.loadData();
        Swal.fire({ position: "center", icon: data.type || "success", title: data.success || "Comisiones aceptadas", showConfirmButton: false, timer: 1500 });
      });
  }.bind(this);

  getExportUrl = function() {
    var f = this.state.filters;
    if (!this.state.isFiltering) {
      return "/download_file/commissions/todos.xlsx";
    }
    var params = [];
    if (f.user_invoice_id) params.push("user_invoice_id=" + f.user_invoice_id);
    if (f.start_date) params.push("start_date=" + f.start_date);
    if (f.end_date) params.push("end_date=" + f.end_date);
    if (f.customer_invoice_id) params.push("customer_invoice_id=" + f.customer_invoice_id);
    if (f.is_acepted) params.push("is_acepted=" + f.is_acepted);
    return "/download_file/commissions/filtro.xlsx?" + params.join("&");
  }.bind(this);

  openNewModal = function() {
    var self = this;
    this.setState({
      modal: true, modeEdit: false, editId: null, ErrorValues: true,
      form: Object.assign({}, EMPTY_FORM, { user_invoice_id: self.props.current_user.id }),
      selectedUser: { value: self.props.current_user.id, label: self.props.current_user.names },
      selectedCostCenter: null,
      costCenterOptions: [],
      costCenterLoading: false,
      selectedCustomerReport: null,
      selectedCustomerInvoice: null,
      customerReportOptions: [],
      customerInvoiceOptions: [],
      engineering_value: false,
      msg_error: "",
      state_msg_error: false,
    });
  }.bind(this);

  openEditModal = function(row) {
    var self = this;
    var costCenterOption = row.cost_center ? { value: row.cost_center.id, label: row.cost_center.code } : null;

    this.setState({
      modal: true, modeEdit: true, editId: row.id, ErrorValues: true,
      form: {
        user_invoice_id: row.user_invoice_id || "",
        start_date: row.start_date || "",
        end_date: row.end_date || "",
        customer_invoice_id: row.customer_invoice_id || "",
        observation: row.observation || "",
        hours_worked: row.hours_worked || "",
        value_hour: row.value_hour || "",
        hours_worked_code: "",
        hours_cost: "",
        hours_paid: "",
        cost_center_id: row.cost_center ? row.cost_center.id : "",
        customer_report_id: row.customer_report ? row.customer_report.id : "",
      },
      selectedUser: row.user_invoice ? { value: row.user_invoice.id, label: row.user_invoice.names } : null,
      selectedCostCenter: costCenterOption,
      costCenterOptions: costCenterOption ? [costCenterOption] : [],
      selectedCustomerReport: row.customer_report ? { value: row.customer_report.id, label: row.customer_report.description } : null,
      selectedCustomerInvoice: row.customer_invoice ? { value: row.customer_invoice.id, label: row.customer_invoice.number_invoice } : null,
      msg_error: "",
      state_msg_error: false,
    }, function() {
      if (row.cost_center) {
        self.loadCostCenterInfo(row.cost_center.id, "si", row.start_date, row.end_date, row.customer_invoice_id);
      }
    });
  }.bind(this);

  closeModal = function() { this.setState({ modal: false }); }.bind(this);

  handleFormChange = function(e) {
    var self = this;
    var name = e.target.name;
    var value = e.target.value;

    // Validación especial para hours_worked
    if (name === "hours_worked" && !this.props.estados.force_hour) {
      if (this.state.engineering_value) {
        var hoursCode = this.state.form.hours_worked_code || 0;
        var hoursCost = this.state.form.hours_cost || 0;
        var hoursPaid = this.state.form.hours_paid || 0;
        var maxHours = hoursCode >= hoursCost ? hoursCost : hoursCode;
        var available = maxHours - hoursPaid - value;

        if (available < 0) {
          this.setState({ msg_error: "No puedes pasarte de las horas", state_msg_error: true });
          return;
        } else {
          this.setState({ msg_error: "", state_msg_error: false });
        }
      } else {
        this.setState({ msg_error: "Esta factura no tiene valor de ingeniería", state_msg_error: true });
        return;
      }
    }

    this.setState({ form: Object.assign({}, this.state.form, { [name]: value }) });
  }.bind(this);

  loadCostCenterInfo = function(costCenterId, type, startDate, endDate, invoiceId) {
    var self = this;
    var formData = {
      start_date: startDate || self.state.form.start_date,
      end_date: endDate || self.state.form.end_date,
      cost_center_id: costCenterId,
      user_id: self.state.form.user_invoice_id,
      invoice_id: invoiceId,
      id: self.state.editId
    };

    fetch("/get_info_cost_center/" + costCenterId, {
      method: "POST",
      body: JSON.stringify(formData),
      headers: { "X-CSRF-Token": csrfToken(), "Content-Type": "application/json" }
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var customerReports = (data.customer_reports || []).map(function(cr) {
          return { value: cr.id, label: cr.report_code };
        });
        var customerInvoices = (data.customer_invoices || []).map(function(ci) {
          return { value: ci.id, label: ci.number_invoice };
        });

        var newState = {
          customerReportOptions: customerReports,
          customerInvoiceOptions: customerInvoices,
        };

        if (type === "si") {
          newState.engineering_value = data.engineering_value;
          newState.form = Object.assign({}, self.state.form, {
            value_hour: data.value_hour || "",
            hours_worked_code: data.hours_worked_code || 0,
            hours_paid: data.hours_paid || 0,
            hours_cost: data.hours_cost || 0,
          });
        }

        self.setState(newState);
      });
  }.bind(this);

  loadInvoiceInfo = function(invoiceId) {
    var self = this;
    fetch("/get_info_inovoice/" + invoiceId)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        self.setState({ engineering_value: data.engineering_value });
      });
  }.bind(this);

  handleCostCenterSearch = function(inputValue) {
    var self = this;

    // Limpiar timer anterior
    if (self._costCenterSearchTimer) {
      clearTimeout(self._costCenterSearchTimer);
    }

    // Si no hay suficientes caracteres, limpiar opciones
    if (!inputValue || inputValue.length < 3) {
      self.setState({ costCenterOptions: [], costCenterLoading: false });
      return;
    }

    // Debounce de 300ms
    self._costCenterSearchTimer = setTimeout(function() {
      self.setState({ costCenterLoading: true });

      fetch("/search_cost_centers?q=" + encodeURIComponent(inputValue), {
        headers: { "X-CSRF-Token": csrfToken() }
      })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          var options = (data || []).map(function(d) {
            return { value: d.id, label: d.label || d.code };
          });
          self.setState({ costCenterOptions: options, costCenterLoading: false });
        })
        .catch(function() {
          self.setState({ costCenterOptions: [], costCenterLoading: false });
        });
    }, 300);
  }.bind(this);

  handleCostCenterChange = function(opt) {
    var self = this;
    if (!opt) {
      this.setState({
        selectedCostCenter: null,
        selectedCustomerReport: null,
        selectedCustomerInvoice: null,
        customerReportOptions: [],
        customerInvoiceOptions: [],
        form: Object.assign({}, this.state.form, { cost_center_id: "", customer_report_id: "", customer_invoice_id: "", hours_worked: 0 }),
      });
      return;
    }

    this.setState({
      selectedCostCenter: opt,
      selectedCustomerReport: null,
      selectedCustomerInvoice: null,
      form: Object.assign({}, this.state.form, {
        cost_center_id: opt.value,
        customer_report_id: "",
        customer_invoice_id: "",
        hours_worked: 0,
      }),
    }, function() {
      self.loadCostCenterInfo(opt.value, "si");
    });
  }.bind(this);

  handleCustomerInvoiceChange = function(opt) {
    var self = this;
    if (!opt) {
      this.setState({
        selectedCustomerInvoice: null,
        form: Object.assign({}, this.state.form, { customer_invoice_id: "" }),
      });
      return;
    }

    this.setState({
      selectedCustomerInvoice: opt,
      form: Object.assign({}, this.state.form, { customer_invoice_id: opt.value }),
    }, function() {
      self.loadInvoiceInfo(opt.value);
    });
  }.bind(this);

  handleSubmit = function() {
    var self = this;
    var form = this.state.form;

    if (!form.user_invoice_id || !form.start_date || !form.end_date || !form.customer_invoice_id || !form.hours_worked || !form.value_hour || !form.customer_report_id) {
      this.setState({ ErrorValues: false });
      return;
    }

    var isEdit = this.state.modeEdit;
    var url = isEdit ? "/commissions/" + this.state.editId : "/commissions";
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
        fetch("/commissions/" + row.id, { method: "DELETE", headers: { "X-CSRF-Token": csrfToken() } })
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

    fetch("/update_state_commission/" + row.id + "/" + newStatus, {
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

    // Lógica de permisos original
    if (!row.is_acepted || estados.edit_after_acepted || estados.delete_after_acepted) {
      var hasEdit = (estados.edit && !row.is_acepted) || (row.is_acepted && estados.edit_after_acepted);
      var hasDelete = (estados.delete && !row.is_acepted) || (row.is_acepted && estados.delete_after_acepted);

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
              React.createElement("i", { className: "fas fa-file-invoice-dollar", style: { marginRight: 6, opacity: 0.5 } }),
              "Factura"
            ),
            React.createElement(Select, {
              options: self.customerInvoiceOptions,
              value: self.state.filterCustomerInvoice,
              onChange: function(opt) { self.setState({ filterCustomerInvoice: opt, filters: Object.assign({}, f, { customer_invoice_id: opt ? opt.value : "" }) }); },
              placeholder: "Seleccione factura...",
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
              React.createElement("option", { value: "false" }, "Creado")
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
    var title = isEdit ? "Actualizar comisión" : "Crear comisión";
    var hasError = function(field) { return self.state.ErrorValues === false && !form[field]; };

    if (!this.state.modal) return null;

    // Calcular horas disponibles
    var hoursCode = form.hours_worked_code || 0;
    var hoursCost = form.hours_cost || 0;
    var hoursPaid = form.hours_paid || 0;
    var maxHours = hoursCode >= hoursCost ? hoursCost : hoursCode;
    var availableHours = maxHours - hoursPaid;
    if (availableHours < 0) availableHours = 0;

    var modalTitle = React.createElement("div", { className: "cm-form-header" },
      React.createElement("div", { className: "cm-form-header-icon-wrapper" },
        React.createElement("i", { className: "fas fa-percentage" })
      ),
      React.createElement("div", null,
        React.createElement("div", { className: "cm-form-header-title" }, title),
        React.createElement("div", { className: "cm-form-header-subtitle" }, "Complete los campos para gestionar la comisión")
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
          // Responsable
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
              isDisabled: !self.props.estados.change_responsible,
              className: hasError("user_invoice_id") ? "cm-select-error" : "",
            })
          ),
          // Fecha desde
          React.createElement("div", { className: "cm-form-group" },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-calendar-alt" }),
              " Fecha desde ", React.createElement("span", { className: "cm-required" }, "*")
            ),
            React.createElement("input", { type: "date", name: "start_date", value: form.start_date || "", onChange: self.handleFormChange, className: hasError("start_date") ? "cm-input cm-input-error" : "cm-input" })
          )
        ),

        React.createElement("div", { className: "cm-form-grid-2" },
          // Fecha hasta
          React.createElement("div", { className: "cm-form-group" },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-calendar-check" }),
              " Fecha hasta ", React.createElement("span", { className: "cm-required" }, "*")
            ),
            React.createElement("input", { type: "date", name: "end_date", value: form.end_date || "", onChange: self.handleFormChange, className: hasError("end_date") ? "cm-input cm-input-error" : "cm-input" })
          ),
          // Centro de costos
          React.createElement("div", { className: "cm-form-group" },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-building" }),
              " Centro de costos ",
              React.createElement("span", { className: "cm-hint" }, "(3 letras)")
            ),
            React.createElement(Select, {
              options: self.state.costCenterOptions,
              value: self.state.selectedCostCenter,
              onChange: self.handleCostCenterChange,
              onInputChange: self.handleCostCenterSearch,
              isLoading: self.state.costCenterLoading,
              placeholder: "Buscar centro de costos...",
              isClearable: true,
              styles: selectStyles,
              menuPortalTarget: document.body,
              noOptionsMessage: function() { return "Escribe al menos 3 letras para buscar"; },
              loadingMessage: function() { return "Buscando..."; },
            })
          )
        ),

        React.createElement("div", { className: "cm-form-grid-2" },
          // Reporte de cliente
          React.createElement("div", { className: "cm-form-group" },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-file-alt" }),
              " Reporte de cliente ", React.createElement("span", { className: "cm-required" }, "*")
            ),
            React.createElement(Select, {
              options: self.state.customerReportOptions,
              value: self.state.selectedCustomerReport,
              onChange: function(opt) { self.setState({ selectedCustomerReport: opt, form: Object.assign({}, form, { customer_report_id: opt ? opt.value : "" }) }); },
              placeholder: "Seleccionar...",
              isClearable: true,
              styles: selectStyles,
              menuPortalTarget: document.body,
              className: hasError("customer_report_id") ? "cm-select-error" : "",
            })
          ),
          // Facturas
          React.createElement("div", { className: "cm-form-group" },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-file-invoice-dollar" }),
              " Factura ", React.createElement("span", { className: "cm-required" }, "*")
            ),
            React.createElement(Select, {
              options: self.state.customerInvoiceOptions,
              value: self.state.selectedCustomerInvoice,
              onChange: self.handleCustomerInvoiceChange,
              placeholder: "Seleccionar...",
              isClearable: true,
              styles: selectStyles,
              menuPortalTarget: document.body,
              className: hasError("customer_invoice_id") ? "cm-select-error" : "",
            })
          )
        ),

        React.createElement("div", { className: "cm-form-grid-2" },
          // Valor hora
          self.props.estados.change_value_hour && React.createElement("div", { className: "cm-form-group" },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-dollar-sign" }),
              " Valor hora proyecto ", React.createElement("span", { className: "cm-required" }, "*")
            ),
            React.createElement(NumberFormat, { name: "value_hour", thousandSeparator: true, prefix: "$", value: form.value_hour || "", onChange: self.handleFormChange, className: hasError("value_hour") ? "cm-input cm-input-error" : "cm-input" })
          ),
          // Horas por pagar
          React.createElement("div", { className: "cm-form-group" },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-clock" }),
              " Horas por pagar ", React.createElement("span", { className: "cm-required" }, "*")
            ),
            React.createElement("input", {
              type: "number",
              name: "hours_worked",
              value: form.hours_worked || "",
              onChange: self.handleFormChange,
              disabled: !form.customer_invoice_id,
              className: hasError("hours_worked") ? "cm-input cm-input-error" : "cm-input",
            }),
            self.state.state_msg_error && React.createElement("span", { className: "cm-error-message" }, self.state.msg_error)
          )
        ),

        // Card de info horas
        React.createElement("div", { className: "cm-info-card" },
          React.createElement("div", { className: "cm-info-row" },
            React.createElement("span", { className: "cm-info-label" },
              React.createElement("i", { className: "fas fa-hourglass-half" }), " Horas trabajadas en el centro de costos:"
            ),
            React.createElement("span", { className: "cm-info-value" }, form.hours_worked_code || 0)
          ),
          React.createElement("div", { className: "cm-info-row" },
            React.createElement("span", { className: "cm-info-label" },
              React.createElement("i", { className: "fas fa-calculator" }), " Horas cotizadas en el centro de costos:"
            ),
            React.createElement("span", { className: "cm-info-value" }, form.hours_cost || 0)
          ),
          React.createElement("div", { className: "cm-info-row" },
            React.createElement("span", { className: "cm-info-label" },
              React.createElement("i", { className: "fas fa-check-circle" }), " Horas comisiones creadas:"
            ),
            React.createElement("span", { className: "cm-info-value" }, form.hours_paid || 0)
          ),
          React.createElement("div", { className: "cm-info-row cm-info-highlight" },
            React.createElement("span", { className: "cm-info-label" },
              React.createElement("i", { className: "fas fa-clock" }), " Horas disponibles:"
            ),
            React.createElement("span", { className: "cm-info-value" }, availableHours)
          )
        ),

        // Observaciones
        React.createElement("div", { className: "cm-form-group", style: { marginTop: "16px" } },
          React.createElement("label", { className: "cm-label" },
            React.createElement("i", { className: "fas fa-comment-alt" }),
            " Observaciones"
          ),
          React.createElement("textarea", { name: "observation", rows: "4", value: form.observation || "", onChange: self.handleFormChange, placeholder: "Escribe tus observaciones aquí...", className: "cm-input cm-textarea" })
        ),

        self.state.ErrorValues === false && React.createElement("div", { className: "cm-alert cm-alert-error" },
          React.createElement("i", { className: "fas fa-exclamation-circle" }),
          React.createElement("span", null, "Debe completar todos los campos requeridos")
        )
      ),

      // Estilos inline
      React.createElement("style", null, "\n        .cm-form-header { display: flex; align-items: center; gap: 16px; }\n        .cm-form-header-icon-wrapper { width: 48px; height: 48px; background: linear-gradient(135deg, #f5a623 0%, #f7b731 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; color: #fff; box-shadow: 0 4px 12px rgba(245, 166, 35, 0.3); }\n        .cm-form-header-title { font-size: 1.25rem; font-weight: 600; color: #1a1a2e; margin: 0; }\n        .cm-form-header-subtitle { font-size: 12px; color: #6c757d; margin: 2px 0 0 0; }\n        .cm-form-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }\n        @media (max-width: 768px) { .cm-form-grid-2 { grid-template-columns: 1fr; } }\n        .cm-form-group { margin-bottom: 16px; }\n        .cm-label { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 400; color: #374151; margin-bottom: 6px; }\n        .cm-label i { color: #6b7280; font-size: 13px; }\n        .cm-required { color: #dc3545; font-weight: 600; }\n        .cm-input { width: 100%; padding: 10px 14px; font-size: 14px; border: 1px solid #e2e5ea; border-radius: 8px; background: #fcfcfd; transition: all 0.2s ease; box-sizing: border-box; }\n        .cm-input:focus { outline: none; border-color: #f5a623; box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.15); background: #fff; }\n        .cm-input:disabled { background: #e9ecef; cursor: not-allowed; opacity: 0.7; }\n        .cm-input::placeholder { color: #9ca3af; }\n        .cm-input-error { border-color: #dc3545 !important; box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.15) !important; }\n        .cm-select-error .css-yk16xz-control, .cm-select-error .css-1pahdxg-control { border-color: #dc3545 !important; box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.15) !important; }\n        .cm-textarea { resize: vertical; min-height: 80px; }\n        .cm-error-message { color: #dc3545; font-size: 12px; margin-top: 4px; display: block; }\n        .cm-info-card { background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%); border: 1px solid #ffcc80; border-radius: 10px; padding: 16px; margin-top: 16px; }\n        .cm-info-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255, 152, 0, 0.2); }\n        .cm-info-row:last-child { border-bottom: none; }\n        .cm-info-label { color: #6d4c00; font-size: 14px; display: flex; align-items: center; gap: 8px; }\n        .cm-info-label i { color: #f5a623; width: 16px; }\n        .cm-info-value { font-weight: 700; color: #6d4c00; font-size: 16px; }\n        .cm-info-highlight { background: rgba(245, 166, 35, 0.2); border-radius: 6px; padding: 12px !important; margin-top: 8px; }\n        .cm-info-highlight .cm-info-value { color: #e65100; font-size: 18px; }\n        .cm-alert { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 8px; font-size: 14px; margin-top: 16px; }\n        .cm-alert-error { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; }\n        .cm-alert-error i { font-size: 16px; }\n        .cm-form-footer { display: flex; justify-content: flex-end; gap: 12px; padding-top: 8px; }\n      ")
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

    // Aceptar comisiones
    if (this.state.isFiltering && this.props.estados.accept_commission) {
      buttons.push(
        React.createElement("button", {
          key: "accept",
          onClick: self.acceptFilteredCommissions,
          style: btnSuccessStyle,
        },
          React.createElement("i", { className: "fas fa-check" }),
          " Aceptar comisiones"
        )
      );
    }

    // Exportar
    if (this.props.estados.export_exel) {
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
        label: "Crear comisión",
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
        emptyMessage: "No hay comisiones registradas",
      }),

      this.renderModal()
    );
  }
}

export default CommissionIndex;
WebpackerReact.setup({ CommissionIndex });
