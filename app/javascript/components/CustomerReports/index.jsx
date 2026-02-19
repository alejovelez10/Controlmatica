import React from "react";
import Swal from "sweetalert2";
import Select from "react-select";
import { CmDataTable, CmPageActions, CmModal, CmInput, CmButton } from "../../generalcomponents/ui";
import FormCreate from "../CustomerReports/FormCreate";

var EMPTY_FILTERS = {
  cost_center_id: "",
  customer_id: "",
  state: "",
  date_desde: "",
  date_hasta: "",
};

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

class index extends React.Component {
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
      filterCentro: null,
      filterCustomer: null,
      filterCostCenterOptions: [],
      filterCostCenterLoading: false,
      filterCustomerOptions: [],
      filterCustomerLoading: false,
      // Modal
      modal: false,
      modeEdit: false,
      action: {},
      title: "Nuevo Reporte de cliente",
      ErrorValues: true,
      form: {
        customer_id: "",
        cost_center_id: "",
        contact_id: "",
        report_date: "",
        description: "",
        email: "ejemplo@hotmail.com",
        report_ids: [],
        user_id: props.usuario.id,
      },
      selectedOption: { customer_id: "", label: "Buscar cliente" },
      selectedOptionContact: { contact_id: "", label: "Aprueba el Reporte" },
      selectedOptionCentro: { cost_center_id: "", label: "Centro de costo" },
      selectedOptionReports: { report_ids: "", label: "Reportes" },
      clients: [],
      dataCostCenter: [],
      dataReports: [],
      dataContact: [],
      dataReportEdit: [],
    };

    this.columns = [
      { key: "report_date", label: "Creado", width: "120px" },
      { key: "report_code", label: "Codigo", width: "160px" },
      { key: "description", label: "Descripcion", width: "280px" },
      props.estados.send_email ? {
        key: "send_approval",
        label: "Enviar para aprobación",
        width: "200px",
        sortable: false,
        render: function(row) {
          var btnText = row.report_state === "Aprobado" ? "Aprobado por el cliente" :
                        row.report_state === "Enviado al Cliente" ? "Reenviar para Aprobación" :
                        "Enviar para Aprobación";
          var disabled = row.report_state === "Aprobado";
          return React.createElement("button", {
            className: "cm-btn cm-btn-sm",
            style: { background: disabled ? "#6c757d" : "#28a745", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "4px", fontSize: "12px", cursor: disabled ? "not-allowed" : "pointer" },
            disabled: disabled,
            onClick: function() { if (!disabled) self.sendApproval(row); }
          }, btnText);
        }
      } : null,
      { key: "report_state", label: "Estado", width: "140px" },
      { key: "approve_date", label: "Fecha Aprobacion", width: "130px" },
      {
        key: "customer_name",
        label: "Cliente",
        width: "180px",
        render: function(row) { return row.customer ? row.customer.name : ""; }
      },
      {
        key: "created_at",
        label: "Creación",
        width: "180px",
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
        width: "180px",
        render: function(row) {
          return React.createElement("span", null,
            formatDate(row.updated_at),
            row.last_user_edited ? React.createElement("span", null, React.createElement("br"), row.last_user_edited.names) : null
          );
        }
      },
    ].filter(Boolean);
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

    this.setState({ loading: true });

    var url = "/get_customer_reports?page=" + p + "&per_page=" + pp;
    if (term) url += "&search=" + encodeURIComponent(term);
    if (sk) url += "&sort=" + encodeURIComponent(sk) + "&dir=" + sd;

    var filters = self.state.filters;
    Object.keys(filters).forEach(function(key) {
      if (filters[key]) url += "&" + key + "=" + encodeURIComponent(filters[key]);
    });

    fetch(url, { headers: { "X-CSRF-Token": csrfToken() } })
      .then(function(response) { return response.json(); })
      .then(function(result) {
        self.setState({
          data: result.data,
          meta: result.meta,
          loading: false
        });
      });
  }.bind(this);

  handleSearch = function(term) {
    var self = this;
    this.setState({ searchTerm: term }, function() {
      self.loadData(1, self.state.meta.per_page, term);
    });
  }.bind(this);

  handlePageChange = function(page) {
    this.loadData(page, this.state.meta.per_page);
  }.bind(this);

  handlePerPageChange = function(perPage) {
    this.loadData(1, perPage);
  }.bind(this);

  handleSort = function(key, dir) {
    var self = this;
    this.setState({ sortKey: key, sortDir: dir }, function() {
      self.loadData(1, self.state.meta.per_page, undefined, key, dir);
    });
  }.bind(this);

  // ─── Filters ───

  toggleFilters = function() {
    if (this.state.showFilters) {
      this.setState({ showFilters: false, filters: Object.assign({}, EMPTY_FILTERS), filterCentro: null, filterCustomer: null, filterCostCenterOptions: [] }, function() {
        this.loadData(1, this.state.meta.per_page);
      }.bind(this));
    } else {
      this.setState({ showFilters: true });
    }
  }.bind(this);

  handleFilterChange = function(e) {
    var newFilters = Object.assign({}, this.state.filters);
    newFilters[e.target.name] = e.target.value;
    this.setState({ filters: newFilters });
  }.bind(this);

  handleFilterCentro = function(opt) {
    var newFilters = Object.assign({}, this.state.filters, { cost_center_id: opt ? opt.value : "" });
    this.setState({ filterCentro: opt, filters: newFilters });
  }.bind(this);

  handleFilterCustomer = function(opt) {
    var newFilters = Object.assign({}, this.state.filters, { customer_id: opt ? opt.value : "" });
    this.setState({ filterCustomer: opt, filters: newFilters });
  }.bind(this);

  handleFilterCostCenterSearch = function(inputValue) {
    var self = this;
    if (!inputValue || inputValue.length < 3) { self.setState({ filterCostCenterOptions: [] }); return; }
    if (self._ccTimer) clearTimeout(self._ccTimer);
    self._ccTimer = setTimeout(function() {
      self.setState({ filterCostCenterLoading: true });
      fetch("/search_cost_centers?q=" + encodeURIComponent(inputValue), { headers: { "X-CSRF-Token": csrfToken() } })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          self.setState({
            filterCostCenterOptions: data.map(function(d) { return { value: d.id, label: d.label }; }),
            filterCostCenterLoading: false,
          });
        });
    }, 300);
  }.bind(this);

  handleFilterCustomerSearch = function(inputValue) {
    var self = this;
    if (!inputValue || inputValue.length < 2) { self.setState({ filterCustomerOptions: [] }); return; }
    if (self._customerTimer) clearTimeout(self._customerTimer);
    self._customerTimer = setTimeout(function() {
      self.setState({ filterCustomerLoading: true });
      fetch("/search_customers?q=" + encodeURIComponent(inputValue), { headers: { "X-CSRF-Token": csrfToken() } })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          self.setState({
            filterCustomerOptions: data.map(function(d) { return { value: d.value, label: d.label }; }),
            filterCustomerLoading: false,
          });
        });
    }, 300);
  }.bind(this);

  handleFormCustomerSearch = function(inputValue) {
    var self = this;
    if (!inputValue || inputValue.length < 2) { self.setState({ clients: [] }); return; }
    if (self._formCustomerTimer) clearTimeout(self._formCustomerTimer);
    self._formCustomerTimer = setTimeout(function() {
      fetch("/search_customers?q=" + encodeURIComponent(inputValue), { headers: { "X-CSRF-Token": csrfToken() } })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          self.setState({
            clients: data.map(function(d) { return { value: d.value, label: d.label }; }),
          });
        });
    }, 300);
  }.bind(this);

  applyFilters = function() {
    this.loadData(1, this.state.meta.per_page);
  }.bind(this);

  getExportUrl = function() {
    var filters = this.state.filters;
    var params = [];
    Object.keys(filters).forEach(function(key) {
      if (filters[key]) params.push(key + "=" + encodeURIComponent(filters[key]));
    });
    if (this.state.searchTerm) params.push("search=" + encodeURIComponent(this.state.searchTerm));
    return "/download_file/customer_reports.xls" + (params.length ? "?" + params.join("&") : "");
  }.bind(this);

  // ─── Send Approval ───

  sendApproval = function(row) {
    var self = this;
    Swal.fire({
      title: "¿Estás seguro?",
      text: "Al aceptar se enviará el correo al cliente",
      icon: "info",
      showCancelButton: true,
      confirmButtonColor: "#28a745",
      cancelButtonColor: "#dc3545",
      confirmButtonText: "Sí, enviar",
      cancelButtonText: "Cancelar"
    }).then(function(result) {
      if (result.value) {
        Swal.fire({ title: "Enviando...", html: "El correo se está enviando", allowOutsideClick: false, onBeforeOpen: function() { Swal.showLoading(); } });
        fetch("/enviar_aprobacion/" + row.id, { method: "GET", headers: { "X-CSRF-Token": csrfToken() } })
          .then(function(r) { return r.json(); })
          .then(function(data) {
            Swal.fire({ position: "center", type: data.type, title: data.message, showConfirmButton: false, timer: 1500 });
            self.loadData();
          });
      }
    });
  }.bind(this);

  // ─── Modal ───

  openNewModal = function() {
    this.updateValues();
    this.setState({ modal: true, modeEdit: false, title: "Nuevo Reporte de cliente", ErrorValues: true });
  }.bind(this);

  openEditModal = function(row) {
    var self = this;
    var arrayReports = (row.reports || []).map(function(r) { return { label: r.code_report, value: r.id }; });

    // Load contacts and cost centers for the customer
    if (row.customer_id) {
      fetch("/customer_cost_center/" + row.customer_id + "/customer_r")
        .then(function(r) { return r.json(); })
        .then(function(data) {
          var arrayContact = [];
          var arrayCentro = [];
          if (data.data_contact) {
            data.data_contact.forEach(function(item) { arrayContact.push({ label: item.name, value: item.id }); });
          }
          if (data.data_cost_center) {
            data.data_cost_center.forEach(function(item) { arrayCentro.push({ label: item.code, value: item.id }); });
          }
          self.setState({ dataContact: arrayContact, dataCostCenter: arrayCentro });
        });
    }

    // Load reports for the cost center
    if (row.cost_center_id) {
      fetch("/get_report_value/" + row.cost_center_id)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          var arrayReport = data.map(function(item) { return { label: item.code_report, value: item.id }; });
          self.setState({ dataReports: arrayReport });
        });
    }

    // Pre-populate cost center option for edit mode
    var costCenterOption = row.cost_center ? { value: row.cost_center.id, label: row.cost_center.code } : null;

    this.setState({
      modal: true,
      modeEdit: true,
      action: row,
      title: "Editar Reporte",
      ErrorValues: true,
      dataReportEdit: arrayReports,
      form: {
        customer_id: row.customer_id || "",
        cost_center_id: row.cost_center_id || "",
        contact_id: row.contact_id || "",
        report_date: row.report_date || "",
        description: row.description || "",
        email: row.email || "ejemplo@hotmail.com",
        report_ids: (row.reports || []).map(function(r) { return r.id; }),
        user_id: this.props.usuario.id,
      },
      selectedOption: { value: row.customer_id, label: row.customer ? row.customer.name : "" },
      selectedOptionContact: { value: row.contact_id, label: row.contact ? row.contact.name : "" },
      selectedOptionCentro: costCenterOption,
    });
  }.bind(this);

  closeModal = function() {
    this.setState({ modal: false });
  }.bind(this);

  updateValues = function() {
    this.setState({
      form: {
        customer_id: "",
        cost_center_id: "",
        contact_id: "",
        report_date: "",
        description: "",
        email: "ejemplo@hotmail.com",
        report_ids: [],
        user_id: this.props.usuario.id,
      },
      selectedOption: null,
      selectedOptionContact: null,
      selectedOptionCentro: null,
      selectedOptionReports: null,
      dataReportEdit: [],
      dataCostCenter: [],
      dataContact: [],
      dataReports: [],
    });
  }.bind(this);

  handleChange = function(e) {
    var name = e.target.name;
    var value = e.target.value;
    this.setState({
      form: Object.assign({}, this.state.form, { [name]: value })
    });
  }.bind(this);

  handleChangeAutocomplete = function(selectedOption) {
    var self = this;
    var arrayCentro = [];
    var arrayContact = [];

    if (selectedOption) {
      fetch("/customer_cost_center/" + selectedOption.value + "/customer_r")
        .then(function(r) { return r.json(); })
        .then(function(data) {
          // Cargar centros de costo del cliente
          if (data.data_cost_center) {
            data.data_cost_center.forEach(function(item) {
              arrayCentro.push({ label: item.code, value: item.id });
            });
          }
          // Cargar contactos del cliente
          if (data.data_contact) {
            data.data_contact.forEach(function(item) {
              arrayContact.push({ label: item.name, value: item.id });
            });
          }
          self.setState({
            dataCostCenter: arrayCentro,
            dataContact: arrayContact,
            selectedOptionCentro: null
          });
        });
    }

    this.setState({
      selectedOption: selectedOption,
      selectedOptionCentro: null,
      dataCostCenter: [],
      dataReports: [],
      form: Object.assign({}, this.state.form, { customer_id: selectedOption ? selectedOption.value : "", cost_center_id: "", report_ids: [] })
    });
  }.bind(this);

  handleChangeAutocompleteCentro = function(selectedOptionCentro) {
    var self = this;
    var arrayReport = [];

    if (selectedOptionCentro) {
      fetch("/get_report_value/" + selectedOptionCentro.value)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          data.forEach(function(item) { arrayReport.push({ label: item.code_report, value: item.id }); });
          self.setState({ dataReports: arrayReport });
        });
    }

    this.setState({
      selectedOptionCentro: selectedOptionCentro,
      form: Object.assign({}, this.state.form, { cost_center_id: selectedOptionCentro ? selectedOptionCentro.value : "" })
    });
  }.bind(this);

  handleChangeAutocompleteContact = function(selectedOptionContact) {
    this.setState({
      selectedOptionContact: selectedOptionContact,
      form: Object.assign({}, this.state.form, { contact_id: selectedOptionContact ? selectedOptionContact.value : "" })
    });
  }.bind(this);

  handleChangeAutocompleteReport = function(selectedOptionReport) {
    var array = (selectedOptionReport || []).map(function(item) { return item.value; });
    this.setState({
      form: Object.assign({}, this.state.form, { report_ids: array })
    });
  }.bind(this);

  handleSubmit = function() {
    var self = this;
    var form = this.state.form;
    var isEdit = this.state.modeEdit;
    var url = isEdit ? "/customer_reports/" + this.state.action.id : "/customer_reports";
    var method = isEdit ? "PATCH" : "POST";

    fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() },
      body: JSON.stringify(form)
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.type === "success") {
          self.closeModal();
          self.loadData(isEdit ? undefined : 1);
          Swal.fire({ position: "center", icon: "success", title: data.message, showConfirmButton: false, timer: 1500 });
        } else {
          Swal.fire({ position: "center", icon: "error", title: data.message, html: (data.message_error || []).join("<br>") });
        }
      });
  }.bind(this);

  // ─── Delete ───

  handleDelete = function(id) {
    var self = this;
    Swal.fire({
      title: "¿Estás seguro?",
      text: "El registro será eliminado permanentemente",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#2a3f53",
      cancelButtonColor: "#dc3545",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar"
    }).then(function(result) {
      if (result.value) {
        fetch("/customer_reports/" + id, { method: "delete", headers: { "X-CSRF-Token": csrfToken() } })
          .then(function(r) { return r.json(); })
          .then(function() {
            self.loadData();
            Swal.fire({ title: "Eliminado", text: "El registro fue eliminado con éxito", icon: "success", confirmButtonColor: "#2a3f53" });
          });
      }
    });
  }.bind(this);

  // ─── Permissions helper ───

  getStateEdit = function(userId) {
    var estados = this.props.estados;
    var currentUserId = this.props.usuario.id;
    if (estados.edit && currentUserId === userId) return true;
    if (estados.edit_all) return true;
    return false;
  }.bind(this);

  // ─── Renders ───

  openMenu = function(e) {
    e.stopPropagation();
    var btn = e.currentTarget;
    var menu = btn.nextElementSibling;
    var all = document.querySelectorAll(".cm-dt-menu-dropdown.open");
    all.forEach(function(m) { m.classList.remove("open"); });
    var rect = btn.getBoundingClientRect();
    document.body.appendChild(menu);
    menu.style.top = (rect.bottom + 4) + "px";
    menu.style.left = (rect.right - 160) + "px";
    menu.classList.add("open");
    var close = function(ev) {
      if (!menu.contains(ev.target) && !btn.contains(ev.target)) {
        menu.classList.remove("open");
        btn.parentNode.appendChild(menu);
        document.removeEventListener("click", close);
      }
    };
    document.addEventListener("click", close);
  };

  renderActions = function(row) {
    var estados = this.props.estados;
    var self = this;
    return (
      React.createElement("div", { className: "cm-dt-menu" },
        React.createElement("button", { className: "cm-dt-menu-trigger", onClick: self.openMenu },
          React.createElement("i", { className: "fas fa-ellipsis-v" })
        ),
        React.createElement("div", { className: "cm-dt-menu-dropdown" },
          self.getStateEdit(row.user_id) ? React.createElement("button", {
            onClick: function() { self.openEditModal(row); },
            className: "cm-dt-menu-item"
          }, React.createElement("i", { className: "fas fa-pen" }), " Editar") : null,
          estados.delete ? React.createElement("button", {
            onClick: function() { self.handleDelete(row.id); },
            className: "cm-dt-menu-item cm-dt-menu-item--danger"
          }, React.createElement("i", { className: "fas fa-trash" }), " Eliminar") : null,
          estados.generate_pdf ? React.createElement("a", {
            href: "/customer_pdf/" + row.id + ".pdf",
            target: "_blank",
            className: "cm-dt-menu-item"
          }, React.createElement("i", { className: "fas fa-file-pdf" }), " Generar PDF") : null
        )
      )
    );
  }.bind(this);

  renderHeaderActions = function() {
    var estados = this.props.estados;
    var self = this;
    return (
      React.createElement(React.Fragment, null,
        React.createElement("button", {
          onClick: self.toggleFilters,
          className: "cm-btn cm-btn-outline cm-btn-sm"
        }, React.createElement("i", { className: "fas fa-filter" }), self.state.showFilters ? " Cerrar filtros" : " Filtros"),
        estados.download_file ? React.createElement("a", {
          href: self.getExportUrl(),
          target: "_blank",
          className: "cm-btn cm-btn-outline cm-btn-sm"
        }, React.createElement("i", { className: "fas fa-file-excel" }), " Exportar") : null
      )
    );
  }.bind(this);

  render() {
    var self = this;
    var meta = this.state.meta;
    var estados = this.props.estados;

    return (
      React.createElement(React.Fragment, null,
        estados.create ? React.createElement(CmPageActions, { label: "Crear informe" },
          React.createElement("button", {
            onClick: self.openNewModal,
            className: "cm-btn cm-btn-accent cm-btn-sm"
          }, React.createElement("i", { className: "fas fa-plus" }), " Nuevo Informe")
        ) : null,

        self.state.showFilters ? React.createElement("div", { className: "cm-filter-panel" },
          // Header con título y botón cerrar
          React.createElement("div", { className: "cm-filter-header" },
            React.createElement("h3", { className: "cm-filter-title" },
              React.createElement("i", { className: "fas fa-filter" }), " Filtros avanzados"
            ),
            React.createElement("button", {
              type: "button",
              onClick: self.toggleFilters,
              className: "cm-filter-close"
            }, React.createElement("i", { className: "fas fa-times" }))
          ),
          React.createElement("div", { className: "cm-filter-row" },
            React.createElement("div", { className: "cm-form-group" },
              React.createElement("label", { className: "cm-label" },
                React.createElement("i", { className: "fas fa-map-marker-alt" }),
                " Centro de costo ",
                React.createElement("small", { className: "cm-label-hint" }, "(escribe al menos 3 letras)")
              ),
              React.createElement(Select, {
                options: self.state.filterCostCenterOptions,
                value: self.state.filterCentro,
                onChange: self.handleFilterCentro,
                onInputChange: self.handleFilterCostCenterSearch,
                isClearable: true,
                isLoading: self.state.filterCostCenterLoading,
                placeholder: "Centro de costos",
                noOptionsMessage: function() { return "Escriba para buscar"; },
                menuPortalTarget: document.body,
                styles: { menuPortal: function(base) { return Object.assign({}, base, { zIndex: 9999 }); } }
              })
            ),
            React.createElement("div", { className: "cm-form-group" },
              React.createElement("label", { className: "cm-label" },
                React.createElement("i", { className: "fas fa-building" }),
                " Cliente ",
                React.createElement("small", { className: "cm-label-hint" }, "(escribe al menos 2 letras)")
              ),
              React.createElement(Select, {
                options: self.state.filterCustomerOptions,
                value: self.state.filterCustomer,
                onChange: self.handleFilterCustomer,
                onInputChange: self.handleFilterCustomerSearch,
                isClearable: true,
                isLoading: self.state.filterCustomerLoading,
                placeholder: "Buscar cliente...",
                noOptionsMessage: function() { return "Escriba para buscar"; },
                filterOption: null,
                menuPortalTarget: document.body,
                styles: { menuPortal: function(base) { return Object.assign({}, base, { zIndex: 9999 }); } }
              })
            ),
            React.createElement("div", { className: "cm-form-group" },
              React.createElement("label", { className: "cm-label" },
                React.createElement("i", { className: "fas fa-flag" }),
                " Estado"
              ),
              React.createElement("select", { className: "cm-input", name: "state", value: self.state.filters.state, onChange: self.handleFilterChange },
                React.createElement("option", { value: "" }, "Todos los estados"),
                React.createElement("option", { value: "Aprobado" }, "Aprobado"),
                React.createElement("option", { value: "Enviado al Cliente" }, "Enviado al Cliente"),
                React.createElement("option", { value: "Pendiente" }, "Pendiente")
              )
            )
          ),
          React.createElement("div", { className: "cm-filter-row" },
            React.createElement("div", { className: "cm-form-group" },
              React.createElement("label", { className: "cm-label" },
                React.createElement("i", { className: "fas fa-calendar-alt" }),
                " Fecha desde"
              ),
              React.createElement("input", { className: "cm-input", type: "date", name: "date_desde", value: self.state.filters.date_desde, onChange: self.handleFilterChange })
            ),
            React.createElement("div", { className: "cm-form-group" },
              React.createElement("label", { className: "cm-label" },
                React.createElement("i", { className: "fas fa-calendar-alt" }),
                " Fecha hasta"
              ),
              React.createElement("input", { className: "cm-input", type: "date", name: "date_hasta", value: self.state.filters.date_hasta, onChange: self.handleFilterChange })
            ),
            React.createElement("div", { className: "cm-form-group", style: { display: "flex", alignItems: "flex-end", justifyContent: "flex-end", gap: "12px", gridColumn: "span 2" } },
              React.createElement("button", {
                className: "cm-btn cm-btn-outline cm-btn-sm",
                onClick: self.toggleFilters,
                style: { display: "inline-flex", alignItems: "center", gap: "6px" }
              },
                React.createElement("i", { className: "fas fa-times" }), " Limpiar"
              ),
              React.createElement("button", {
                className: "cm-btn cm-btn-accent cm-btn-sm",
                onClick: self.applyFilters,
                style: { display: "inline-flex", alignItems: "center", gap: "6px" }
              },
                React.createElement("i", { className: "fas fa-search" }), " Aplicar filtros"
              )
            )
          )
        ) : null,

        React.createElement(CmDataTable, {
          columns: self.columns,
          data: self.state.data,
          loading: self.state.loading,
          actions: self.renderActions,
          headerActions: self.renderHeaderActions(),
          onSearch: self.handleSearch,
          searchPlaceholder: "Buscar por código, descripción, cliente...",
          emptyMessage: "No hay reportes de cliente",
          emptyAction: estados.create
            ? React.createElement("button", {
                onClick: self.openNewModal,
                className: "cm-btn cm-btn-accent cm-btn-sm",
                style: { marginTop: "8px" }
              }, React.createElement("i", { className: "fas fa-plus" }), " Nuevo Informe")
            : null,
          serverPagination: true,
          serverMeta: meta,
          onSort: self.handleSort,
          onPageChange: self.handlePageChange,
          onPerPageChange: self.handlePerPageChange
        }),

        self.state.modal ? React.createElement(FormCreate, {
          toggle: self.closeModal,
          backdrop: "static",
          modal: true,
          onChangeForm: self.handleChange,
          formValues: self.state.form,
          submit: self.handleSubmit,
          FormSubmit: function(e) { e.preventDefault(); },
          titulo: self.state.title,
          nameSubmit: self.state.modeEdit ? "Actualizar" : "Crear",
          errorValues: self.state.ErrorValues,
          clientes: self.state.clients,
          onCustomerSearch: self.handleFormCustomerSearch,
          onChangeAutocomplete: self.handleChangeAutocomplete,
          formAutocomplete: self.state.selectedOption,
          costCenterOptions: self.state.dataCostCenter,
          onChangeAutocompleteCentro: self.handleChangeAutocompleteCentro,
          formAutocompleteCentro: self.state.selectedOptionCentro,
          reports: self.state.dataReports,
          onChangeAutocompleteReports: self.handleChangeAutocompleteReport,
          formAutocompleteReport: self.state.selectedOptionReports,
          contacts: self.state.dataContact,
          onChangeAutocompleteContact: self.handleChangeAutocompleteContact,
          formAutocompleteContact: self.state.selectedOptionContact,
          editValuesReport: self.state.dataReportEdit,
          estados: self.props.estados
        }) : null
      )
    );
  }
}

export default index;
