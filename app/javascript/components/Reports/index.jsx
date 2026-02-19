import React from "react";
import Swal from "sweetalert2";
import NumberFormat from "react-number-format";
import Select from "react-select";
import { CmDataTable, CmPageActions, CmModal } from "../../generalcomponents/ui";
import FormCreate from "./FormCreate";

function csrfToken() {
  var meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}

function formatDate(date) {
  if (!date) return "";
  var d = new Date(date);
  var months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  var hours = d.getHours();
  var minutes = d.getMinutes();
  var timeValue = hours + (minutes < 10 ? ":0" + minutes : ":" + minutes);
  return months[d.getMonth()] + " " + d.getDate() + " del " + d.getFullYear() + " / " + timeValue;
}

var EMPTY_FORM = {
  customer_id: "",
  contact_id: "",
  cost_center_id: "",
  report_date: "",
  report_execute_id: "",
  working_time: "",
  work_description: "",
  viatic_value: "",
  viatic_description: "",
  report_code: 0,
  displacement_hours: "",
  value_displacement_hours: "",
  user_id: "",
};

var EMPTY_CONTACT = {
  contact_name: "",
  contact_position: "",
  contact_phone: "",
  contact_email: "",
  customer_id: "",
};

var filterSelectStyles = {
  control: function (base, state) {
    return Object.assign({}, base, {
      background: "#fcfcfd",
      borderColor: state.isFocused ? "#f5a623" : "#e2e5ea",
      boxShadow: state.isFocused ? "0 0 0 3px rgba(245, 166, 35, 0.15)" : "none",
      "&:hover": { borderColor: "#f5a623" },
      borderRadius: "8px",
      padding: "2px 4px",
      fontSize: "14px",
    });
  },
  option: function (base, state) {
    return Object.assign({}, base, {
      backgroundColor: state.isSelected ? "#f5a623" : state.isFocused ? "#fff3e0" : "#fff",
      color: state.isSelected ? "#fff" : "#333",
      fontSize: "14px",
    });
  },
  menuPortal: function (base) {
    return Object.assign({}, base, { zIndex: 9999 });
  },
};

class index extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      data: [],
      loading: true,
      searchTerm: "",
      sortKey: null,
      sortDir: "asc",
      meta: { total: 0, page: 1, per_page: 50, total_pages: 1 },
      // Filters
      showFilters: false,
      filters: {
        work_description: "",
        report_execute_id: "",
        date_ejecution: "",
        report_sate: "",
        cost_center_id: "",
        customer_id: "",
        date_desde: "",
        date_hasta: "",
        code_report: "",
      },
      costCenterOptions: [],
      costCenterLoading: false,
      // Modal
      modalOpen: false,
      modeEdit: false,
      editId: null,
      form: Object.assign({}, EMPTY_FORM, {
        report_execute_id: props.estados.responsible ? "" : props.usuario.id,
        user_id: props.usuario.id,
      }),
      formContact: Object.assign({}, EMPTY_CONTACT),
      state_create: false,
      ErrorValues: true,
      ErrorValuesContact: true,
      saving: false,
      // Autocomplete selections
      selectedOption: { value: "", label: "Buscar cliente" },
      selectedOptionContact: { value: "", label: "Seleccionar Contacto" },
      selectedOptionCentro: { value: "", label: "Centro de costo" },
      dataContact: [],
      dataCostCenter: [],
      clients: [],
    };

    this.columns = [
      { key: "code_report", label: "Codigo", width: "130px" },
      {
        key: "cost_center_code",
        label: "Centro de Costos",
        width: "150px",
        sortable: false,
        render: function (r) {
          return r.cost_center ? r.cost_center.code : "";
        },
      },
      {
        key: "customer_name",
        label: "Cliente",
        width: "150px",
        sortable: false,
        render: function (r) {
          return r.cost_center && r.cost_center.customer ? r.cost_center.customer.name : "";
        },
      },
      { key: "report_date", label: "Fecha Ejecucion", width: "130px" },
      {
        key: "report_execute_name",
        label: "Responsable",
        width: "150px",
        sortable: false,
        render: function (r) {
          return r.report_execute ? r.report_execute.names : "";
        },
      },
      { key: "working_time", label: "Horas", width: "80px" },
      { key: "work_description", label: "Descripcion", width: "300px" },
      {
        key: "viatic_value",
        label: "Viaticos",
        width: "130px",
        render: function (r) {
          return React.createElement(NumberFormat, {
            value: r.viatic_value,
            displayType: "text",
            thousandSeparator: true,
            prefix: "$",
          });
        },
      },
      {
        key: "total_value",
        label: "Valor Reporte",
        width: "130px",
        render: function (r) {
          return React.createElement(NumberFormat, {
            value: r.total_value,
            displayType: "text",
            thousandSeparator: true,
            prefix: "$",
          });
        },
      },
      {
        key: "report_sate",
        label: "Estado",
        width: "110px",
        sortable: false,
        render: function (r) {
          return r.report_sate ? "Aprobado" : "Sin Aprobar";
        },
      },
      {
        key: "created_at",
        label: "Fecha de creación",
        width: "180px",
        sortable: false,
        render: function (r) {
          return React.createElement("div", null,
            React.createElement("div", null, formatDate(r.created_at)),
            React.createElement("div", { style: { fontSize: "12px", color: "#6b7280" } }, r.user ? r.user.names : "")
          );
        },
      },
      {
        key: "updated_at",
        label: "Ultima actualización",
        width: "180px",
        sortable: false,
        render: function (r) {
          return React.createElement("div", null,
            React.createElement("div", null, formatDate(r.updated_at)),
            React.createElement("div", { style: { fontSize: "12px", color: "#6b7280" } }, r.last_user_edited ? r.last_user_edited.names : (r.user ? r.user.names : ""))
          );
        },
      },
    ];
  }

  componentDidMount() {
    var self = this;
    var array = [];
    this.props.clientes.map(function (item) {
      array.push({ label: item.name, value: item.id });
    });
    self.setState({ clients: array });
    self.loadData();
  }

  // ─── Data Loading ───

  loadData = function (page, perPage, searchTerm, sortKey, sortDir) {
    var self = this;
    var p = page || self.state.meta.page;
    var pp = perPage || self.state.meta.per_page;
    var term = searchTerm !== undefined ? searchTerm : self.state.searchTerm;
    var sk = sortKey !== undefined ? sortKey : self.state.sortKey;
    var sd = sortDir !== undefined ? sortDir : self.state.sortDir;

    self.setState({ loading: true });

    var url = "/get_reports?page=" + p + "&per_page=" + pp;
    if (term) url += "&search=" + encodeURIComponent(term);
    if (sk) url += "&sort=" + encodeURIComponent(sk) + "&dir=" + sd;

    var filters = self.state.filters;
    Object.keys(filters).forEach(function (key) {
      if (filters[key]) url += "&" + key + "=" + encodeURIComponent(filters[key]);
    });

    fetch(url, { headers: { "X-CSRF-Token": csrfToken() } })
      .then(function (response) { return response.json(); })
      .then(function (result) {
        self.setState({
          data: result.data,
          meta: result.meta,
          loading: false,
        });
      });
  }.bind(this);

  handleSearch = function (term) {
    var self = this;
    self.setState({ searchTerm: term }, function () {
      self.loadData(1, self.state.meta.per_page, term);
    });
  }.bind(this);

  handlePageChange = function (page) {
    this.loadData(page, this.state.meta.per_page);
  }.bind(this);

  handlePerPageChange = function (perPage) {
    this.loadData(1, perPage);
  }.bind(this);

  handleSort = function (key, dir) {
    var self = this;
    self.setState({ sortKey: key, sortDir: dir }, function () {
      self.loadData(1, self.state.meta.per_page, undefined, key, dir);
    });
  }.bind(this);

  // ─── Filters ───

  toggleFilters = function () {
    var self = this;
    var willClose = this.state.showFilters;
    this.setState({ showFilters: !this.state.showFilters }, function () {
      if (willClose) {
        self.setState({
          filters: {
            work_description: "",
            report_execute_id: "",
            date_ejecution: "",
            report_sate: "",
            cost_center_id: "",
            customer_id: "",
            date_desde: "",
            date_hasta: "",
            code_report: "",
          },
          costCenterOptions: [],
        }, function () {
          self.loadData(1);
        });
      }
    });
  }.bind(this);

  handleFilterChange = function (e) {
    var newFilters = Object.assign({}, this.state.filters);
    newFilters[e.target.name] = e.target.value;
    this.setState({ filters: newFilters });
  }.bind(this);

  handleFilterSelectChange = function (name, option) {
    var newFilters = Object.assign({}, this.state.filters);
    newFilters[name] = option ? option.value : "";
    this.setState({ filters: newFilters });
  }.bind(this);

  handleCostCenterSearch = function (inputValue) {
    var self = this;
    if (!inputValue || inputValue.length < 3) {
      self.setState({ costCenterOptions: [] });
      return;
    }
    if (self._ccSearchTimer) clearTimeout(self._ccSearchTimer);
    self._ccSearchTimer = setTimeout(function () {
      self.setState({ costCenterLoading: true });
      fetch("/search_cost_centers?q=" + encodeURIComponent(inputValue), {
        headers: { "X-CSRF-Token": csrfToken() },
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          self.setState({
            costCenterOptions: data.map(function (d) { return { value: d.id, label: d.label }; }),
            costCenterLoading: false,
          });
        });
    }, 300);
  }.bind(this);

  // Búsqueda de centro de costo para el formulario de creación
  handleFormCostCenterSearch = function (inputValue) {
    var self = this;
    if (!inputValue || inputValue.length < 3) {
      self.setState({ dataCostCenter: [] });
      return;
    }
    if (self._formCcSearchTimer) clearTimeout(self._formCcSearchTimer);
    self._formCcSearchTimer = setTimeout(function () {
      fetch("/search_cost_centers?q=" + encodeURIComponent(inputValue), {
        headers: { "X-CSRF-Token": csrfToken() },
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          self.setState({
            dataCostCenter: data.map(function (d) { return { value: d.id, label: d.label }; }),
          });
        });
    }, 300);
  }.bind(this);

  applyFilters = function () {
    this.loadData(1, this.state.meta.per_page);
  }.bind(this);

  clearFilters = function () {
    var self = this;
    self.setState({
      filters: {
        work_description: "",
        report_execute_id: "",
        date_ejecution: "",
        report_sate: "",
        cost_center_id: "",
        customer_id: "",
        date_desde: "",
        date_hasta: "",
        code_report: "",
      },
      costCenterOptions: [],
    }, function () {
      self.loadData(1, self.state.meta.per_page);
    });
  }.bind(this);

  // ─── Validation ───

  validationForm = function () {
    var form = this.state.form;
    if (this.props.estados.viatics) {
      if (
        form.customer_id != "" &&
        form.contact_id != "" &&
        form.report_date != "" &&
        form.working_time != "" &&
        form.work_description != "" &&
        form.viatic_value != ""
      ) {
        this.setState({ ErrorValues: true });
        return true;
      } else {
        this.setState({ ErrorValues: false });
        return false;
      }
    } else {
      if (
        form.customer_id != "" &&
        form.contact_id != "" &&
        form.report_date != "" &&
        form.working_time != "" &&
        form.work_description != ""
      ) {
        this.setState({ ErrorValues: true });
        return true;
      } else {
        this.setState({ ErrorValues: false });
        return false;
      }
    }
  }.bind(this);

  validationFormContact = function () {
    var fc = this.state.formContact;
    if (
      fc.contact_name != "" &&
      fc.contact_position != "" &&
      fc.contact_phone != "" &&
      fc.contact_email != "" &&
      this.state.form.customer_id != ""
    ) {
      this.setState({ ErrorValuesContact: true });
      return true;
    } else {
      this.setState({ ErrorValuesContact: false });
      return false;
    }
  }.bind(this);

  // ─── Modal ───

  openNewModal = function () {
    this.setState({
      modalOpen: true,
      modeEdit: false,
      editId: null,
      ErrorValues: true,
      ErrorValuesContact: true,
      state_create: false,
      saving: false,
      form: Object.assign({}, EMPTY_FORM, {
        report_execute_id: this.props.estados.responsible ? "" : this.props.usuario.id,
        user_id: this.props.usuario.id,
      }),
      formContact: Object.assign({}, EMPTY_CONTACT),
      selectedOption: { value: "", label: "Buscar cliente" },
      selectedOptionContact: { value: "", label: "Seleccionar Contacto" },
      selectedOptionCentro: { value: "", label: "Centro de costo" },
      dataContact: [],
      dataCostCenter: [],
    });
  }.bind(this);

  openEditModal = function (report) {
    var self = this;
    var arrayCentro = [];

    fetch("/customer_user/" + report.customer_id)
      .then(function (response) { return response.json(); })
      .then(function (data) {
        data.map(function (item) {
          arrayCentro.push({ label: item.code, value: item.id });
        });
        self.setState({ dataCostCenter: arrayCentro });
      });

    this.setState({
      modalOpen: true,
      modeEdit: true,
      editId: report.id,
      ErrorValues: true,
      ErrorValuesContact: true,
      saving: false,
      form: {
        customer_id: report.customer_id,
        contact_id: report.contact_id,
        cost_center_id: report.cost_center_id,
        report_date: report.report_date,
        report_execute_id: report.report_execute_id,
        working_time: report.working_time,
        work_description: report.work_description,
        viatic_value: report.viatic_value,
        viatic_description: report.viatic_description,
        report_code: report.report_code,
        user_id: self.props.usuario.id,
        displacement_hours: report.displacement_hours,
        value_displacement_hours: report.value_displacement_hours,
      },
      selectedOption: {
        value: report.customer_id,
        label: report.customer ? report.customer.name : "Buscar cliente",
      },
      selectedOptionContact: {
        value: report.contact_id,
        label: report.contact ? report.contact.name : "Seleccionar Contacto",
      },
      selectedOptionCentro: {
        value: report.cost_center_id,
        label: report.cost_center ? report.cost_center.code : "Centro de costo",
      },
    });
  }.bind(this);

  closeModal = function () {
    this.setState({ modalOpen: false });
  }.bind(this);

  // ─── Form Handlers ───

  handleFormChange = function (e) {
    var newForm = Object.assign({}, this.state.form);
    newForm[e.target.name] = e.target.value;
    this.setState({ form: newForm });
  }.bind(this);

  handleContactFormChange = function (e) {
    var newForm = Object.assign({}, this.state.formContact);
    newForm[e.target.name] = e.target.value;
    this.setState({ formContact: newForm });
  }.bind(this);

  handleChangeAutocomplete = function (selectedOption) {
    var self = this;
    var array = [];
    var arrayCentro = [];

    fetch("/get_client/" + selectedOption.value)
      .then(function (response) { return response.json(); })
      .then(function (data) {
        data.map(function (item) {
          array.push({ label: item.name, value: item.id });
        });
        self.setState({ dataContact: array });
      });

    fetch("/customer_user/" + selectedOption.value)
      .then(function (response) { return response.json(); })
      .then(function (data) {
        data.map(function (item) {
          arrayCentro.push({ label: item.code + " - (" + item.description + ")", value: item.id });
        });
        self.setState({ dataCostCenter: arrayCentro });
      });

    var newForm = Object.assign({}, this.state.form, { customer_id: selectedOption.value });
    var newContactForm = Object.assign({}, this.state.formContact, { customer_id: selectedOption.value });
    this.setState({
      selectedOption: selectedOption,
      form: newForm,
      formContact: newContactForm,
    });
  }.bind(this);

  handleChangeAutocompleteContact = function (selectedOptionContact) {
    var newForm = Object.assign({}, this.state.form, { contact_id: selectedOptionContact.value });
    this.setState({
      selectedOptionContact: selectedOptionContact,
      form: newForm,
    });
  }.bind(this);

  handleChangeAutocompleteCentro = function (selectedOptionCentro) {
    var self = this;
    if (!selectedOptionCentro) {
      self.setState({
        selectedOptionCentro: { value: "", label: "Centro de costo" },
        selectedOption: { value: "", label: "Buscar cliente" },
        selectedOptionContact: { value: "", label: "Seleccionar Contacto" },
        dataContact: [],
        form: Object.assign({}, self.state.form, { cost_center_id: "", customer_id: "", contact_id: "" }),
      });
      return;
    }

    // Cargar datos del centro de costo para auto-llenar cliente, contacto y responsable
    fetch("/get_cost_center_details/" + selectedOptionCentro.value)
      .then(function (response) { return response.json(); })
      .then(function (costCenter) {
        var newForm = Object.assign({}, self.state.form, {
          cost_center_id: selectedOptionCentro.value,
          customer_id: costCenter.customer_id || "",
          contact_id: costCenter.contact_id || "",
          report_execute_id: costCenter.user_owner_id || self.state.form.report_execute_id,
        });

        // Actualizar cliente seleccionado
        var customerOption = { value: "", label: "Buscar cliente" };
        if (costCenter.customer) {
          customerOption = { value: costCenter.customer.id, label: costCenter.customer.name };
        }

        // Actualizar contacto seleccionado
        var contactOption = { value: "", label: "Seleccionar Contacto" };
        if (costCenter.contact) {
          contactOption = { value: costCenter.contact.id, label: costCenter.contact.name };
        }

        // Cargar lista de contactos del cliente
        if (costCenter.customer_id) {
          fetch("/get_client/" + costCenter.customer_id)
            .then(function (response) { return response.json(); })
            .then(function (data) {
              var contacts = data.map(function (item) {
                return { label: item.name, value: item.id };
              });
              self.setState({ dataContact: contacts });
            });
        }

        self.setState({
          selectedOptionCentro: selectedOptionCentro,
          selectedOption: customerOption,
          selectedOptionContact: contactOption,
          form: newForm,
          formContact: Object.assign({}, self.state.formContact, { customer_id: costCenter.customer_id || "" }),
        });
      });
  }.bind(this);

  // ─── Submit ───

  handleSubmit = function () {
    var self = this;
    if (self.validationForm() !== true) return;

    self.setState({ saving: true });

    var url, method;
    if (self.state.modeEdit) {
      url = "/reports/" + self.state.editId;
      method = "PATCH";
    } else {
      url = "/reports";
      method = "POST";
    }

    fetch(url, {
      method: method,
      body: JSON.stringify(self.state.form),
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() },
    })
      .then(function (res) { return res.json(); })
      .catch(function (error) { console.error("Error:", error); })
      .then(function (data) {
        self.setState({ modalOpen: false, saving: false });
        Swal.fire({
          position: "center",
          icon: data.type,
          title: data.message,
          showConfirmButton: false,
          timer: 1500,
        });
        self.loadData(self.state.modeEdit ? undefined : 1);
      });
  }.bind(this);

  // ─── Contact Create ───

  handleSubmitContact = function () {
    var self = this;
    var array = [];
    if (self.validationFormContact() !== true) return;

    fetch("/create_contact", {
      method: "POST",
      body: JSON.stringify(self.state.formContact),
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() },
    })
      .then(function (res) { return res.json(); })
      .catch(function (error) { console.error("Error:", error); })
      .then(function (data) {
        Swal.fire({
          position: "center",
          icon: data.type,
          title: data.message,
          showConfirmButton: false,
          timer: 1500,
        });
        array.push({ label: data.register.name, value: data.register.id });
        self.setState({ state_create: true, dataContact: array });
      });
  }.bind(this);

  // ─── Delete ───

  handleDelete = function (report) {
    var self = this;
    Swal.fire({
      title: "Escribe el codigo del reporte para poder eliminarlo",
      input: "text",
      footer: "<p>El codigo del reporte es (" + report.code_report + ") </p>",
      inputAttributes: { autocapitalize: "off" },
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      confirmButtonColor: "#16aaff",
      cancelButtonText: "Cancelar",
      showLoaderOnConfirm: true,
      preConfirm: function (login) {
        if (login == report.code_report.trim()) {
          return fetch("/reports/" + report.id, {
            method: "delete",
            headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() },
          }).then(function (res) { return res.json(); });
        } else {
          Swal.showValidationMessage("El codigo no concuerda");
        }
      },
      allowOutsideClick: function () { return !Swal.isLoading(); },
    }).then(function (result) {
      if (result.value) {
        self.loadData();
      }
    });
  }.bind(this);

  // ─── Permission Helper ───

  getEditState = function (report) {
    var estados = this.props.estados;
    var userId = this.props.usuario.id;

    if (estados.edit_all) return true;
    if (estados.edit && userId == report.user_id) return true;
    return false;
  }.bind(this);

  // ─── Renders ───

  openMenu = function (e) {
    e.stopPropagation();
    var btn = e.currentTarget;
    var menu = btn.nextElementSibling;
    var all = document.querySelectorAll(".cm-dt-menu-dropdown.open");
    all.forEach(function (m) { m.classList.remove("open"); });
    var rect = btn.getBoundingClientRect();
    document.body.appendChild(menu);
    menu.style.top = (rect.bottom + 4) + "px";
    menu.style.left = (rect.right - 160) + "px";
    menu.classList.add("open");
    var close = function (ev) {
      if (!menu.contains(ev.target) && !btn.contains(ev.target)) {
        menu.classList.remove("open");
        btn.parentNode.appendChild(menu);
        document.removeEventListener("click", close);
      }
    };
    document.addEventListener("click", close);
  }.bind(this);

  renderActions = function (row) {
    var self = this;
    var estados = self.props.estados;
    var canEdit = self.getEditState(row) && row.cost_center && row.cost_center.execution_state != "FINALIZADO";

    return React.createElement("div", { className: "cm-dt-menu" },
      React.createElement("button", { className: "cm-dt-menu-trigger", onClick: self.openMenu },
        React.createElement("i", { className: "fas fa-ellipsis-v" })
      ),
      React.createElement("div", { className: "cm-dt-menu-dropdown" },
        canEdit ? React.createElement("button", {
          onClick: function () { self.openEditModal(row); },
          className: "cm-dt-menu-item"
        }, React.createElement("i", { className: "fas fa-pen" }), " Editar") : null,
        estados.delete ? React.createElement("button", {
          onClick: function () { self.handleDelete(row); },
          className: "cm-dt-menu-item cm-dt-menu-item--danger"
        }, React.createElement("i", { className: "fas fa-trash" }), " Eliminar") : null
      )
    );
  }.bind(this);

  getExportUrl = function () {
    var filters = this.state.filters;
    var hasFilters = Object.keys(filters).some(function (k) { return filters[k]; });
    if (!hasFilters) return "/download_file/reports/todos.xls";
    var url = "/download_file/reports/filtro.xls?";
    var parts = [];
    Object.keys(filters).forEach(function (key) {
      if (filters[key]) parts.push(key + "=" + encodeURIComponent(filters[key]));
    });
    return url + parts.join("&");
  }.bind(this);

  renderHeaderActions = function () {
    var self = this;
    var estados = self.props.estados;
    return React.createElement(React.Fragment, null,
      React.createElement("button", {
        onClick: self.toggleFilters,
        className: "cm-btn cm-btn-outline cm-btn-sm" + (self.state.showFilters ? " active" : "")
      }, React.createElement("i", { className: "fas fa-filter" }), " Filtros"),
      estados.download_file ? React.createElement("a", {
        href: self.getExportUrl(),
        target: "_blank",
        className: "cm-btn cm-btn-outline cm-btn-sm"
      }, React.createElement("i", { className: "fas fa-file-excel" }), " Exportar") : null
    );
  }.bind(this);

  render() {
    var self = this;
    var estados = self.props.estados;
    var meta = self.state.meta;

    return React.createElement(React.Fragment, null,
      estados.create ? React.createElement(CmPageActions, { label: "Crear reporte" },
        React.createElement("button", {
          onClick: self.openNewModal,
          className: "cm-btn cm-btn-accent cm-btn-sm"
        }, React.createElement("i", { className: "fas fa-plus" }), " Nuevo Reporte")
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
        // Row 1: Descripcion | Responsable Ejecucion | Fecha de inicio | Estado de reporte
        React.createElement("div", { className: "cm-filter-row" },
          React.createElement("div", { className: "cm-form-group" },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-file-alt" }), " Descripción del trabajo"
            ),
            React.createElement("input", {
              type: "text", className: "cm-input", name: "work_description",
              value: self.state.filters.work_description, onChange: self.handleFilterChange,
              placeholder: "Buscar por descripción..."
            })
          ),
          React.createElement("div", { className: "cm-form-group" },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-user" }), " Responsable"
            ),
            React.createElement("select", {
              className: "cm-input", name: "report_execute_id",
              value: self.state.filters.report_execute_id, onChange: self.handleFilterChange
            },
              React.createElement("option", { value: "" }, "Seleccione responsable..."),
              self.props.users.map(function (u) {
                return React.createElement("option", { key: u.id, value: u.id }, u.names);
              })
            )
          ),
          React.createElement("div", { className: "cm-form-group" },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-calendar-check" }), " Fecha ejecución"
            ),
            React.createElement("input", {
              type: "date", className: "cm-input", name: "date_ejecution",
              value: self.state.filters.date_ejecution, onChange: self.handleFilterChange
            })
          ),
          React.createElement("div", { className: "cm-form-group" },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-flag" }), " Estado"
            ),
            React.createElement("select", {
              className: "cm-input", name: "report_sate",
              value: self.state.filters.report_sate, onChange: self.handleFilterChange
            },
              React.createElement("option", { value: "" }, "Seleccione estado..."),
              React.createElement("option", { value: "true" }, "Aprobado"),
              React.createElement("option", { value: "false" }, "Sin Aprobar")
            )
          )
        ),
        // Row 2: Centro de costo | Clientes | Fecha desde | Fecha hasta
        React.createElement("div", { className: "cm-filter-row" },
          React.createElement("div", { className: "cm-form-group" },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-map-marker-alt" }), " Centro de costo ",
              React.createElement("small", { className: "cm-label-hint" }, "(escribe 3+ letras)")
            ),
            React.createElement(Select, {
              placeholder: "Buscar centro de costo...",
              options: self.state.costCenterOptions,
              isLoading: self.state.costCenterLoading,
              onInputChange: self.handleCostCenterSearch,
              onChange: function (opt) { self.handleFilterSelectChange("cost_center_id", opt); },
              isClearable: true,
              value: self.state.costCenterOptions.find(function (o) { return o.value == self.state.filters.cost_center_id; }) || null,
              noOptionsMessage: function () { return "Escriba 3+ letras para buscar"; },
              filterOption: null,
              menuPortalTarget: document.body,
              styles: filterSelectStyles
            })
          ),
          React.createElement("div", { className: "cm-form-group" },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-building" }), " Cliente"
            ),
            React.createElement(Select, {
              placeholder: "Seleccione cliente...",
              options: self.state.clients,
              onChange: function (opt) { self.handleFilterSelectChange("customer_id", opt); },
              isClearable: true,
              value: self.state.clients.find(function (o) { return o.value == self.state.filters.customer_id; }) || null,
              menuPortalTarget: document.body,
              styles: filterSelectStyles
            })
          ),
          React.createElement("div", { className: "cm-form-group" },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-calendar-alt" }), " Fecha desde"
            ),
            React.createElement("input", {
              type: "date", className: "cm-input", name: "date_desde",
              value: self.state.filters.date_desde, onChange: self.handleFilterChange
            })
          ),
          React.createElement("div", { className: "cm-form-group" },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-calendar-alt" }), " Fecha hasta"
            ),
            React.createElement("input", {
              type: "date", className: "cm-input", name: "date_hasta",
              value: self.state.filters.date_hasta, onChange: self.handleFilterChange
            })
          )
        ),
        // Row 3: Busqueda por codigo | Buttons
        React.createElement("div", { className: "cm-filter-row", style: { gridTemplateColumns: "1fr 1fr" } },
          React.createElement("div", { className: "cm-form-group" },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-barcode" }), " Código de reporte"
            ),
            React.createElement("input", {
              type: "text", className: "cm-input", name: "code_report",
              value: self.state.filters.code_report, onChange: self.handleFilterChange,
              placeholder: "Buscar por código..."
            })
          ),
          React.createElement("div", { className: "cm-form-group", style: { display: "flex", alignItems: "flex-end", justifyContent: "flex-end", gap: "8px" } },
            React.createElement("button", {
              type: "button", onClick: self.clearFilters, className: "cm-btn cm-btn-outline cm-btn-sm"
            }, React.createElement("i", { className: "fas fa-eraser" }), " Limpiar"),
            React.createElement("button", {
              type: "button", onClick: self.applyFilters, className: "cm-btn cm-btn-accent cm-btn-sm"
            }, React.createElement("i", { className: "fas fa-search" }), " Aplicar filtros")
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
        searchPlaceholder: "Buscar por descripcion o codigo...",
        emptyMessage: "No hay reportes registrados",
        emptyAction: estados.create ? React.createElement("button", {
          onClick: self.openNewModal,
          className: "cm-btn cm-btn-accent cm-btn-sm",
          style: { marginTop: "8px" }
        }, React.createElement("i", { className: "fas fa-plus" }), " Nuevo Reporte") : null,
        serverPagination: true,
        serverMeta: meta,
        onSort: self.handleSort,
        onPageChange: self.handlePageChange,
        onPerPageChange: self.handlePerPageChange,
      }),

      self.state.modalOpen ? React.createElement(FormCreate, {
        modal: self.state.modalOpen,
        toggle: self.closeModal,
        titulo: self.state.modeEdit ? "Editar Reporte" : "Nuevo Reporte",
        nameSubmit: self.state.modeEdit ? "Actualizar" : "Crear",
        onChangeForm: self.handleFormChange,
        formValues: self.state.form,
        submit: self.handleSubmit,
        errorValues: self.state.ErrorValues,
        users: self.props.users,
        estados: estados,
        isLoading: self.state.saving,
        // Contact
        formContactValues: self.state.formContact,
        onChangeFormContact: self.handleContactFormChange,
        FormSubmitContact: self.handleSubmitContact,
        create_state: self.state.state_create,
        errorValuesContact: self.state.ErrorValuesContact,
        // Autocomplete cliente
        clientes: self.state.clients,
        onChangeAutocomplete: self.handleChangeAutocomplete,
        formAutocomplete: self.state.selectedOption,
        // Autocomplete contacto
        contacto: self.state.dataContact,
        onChangeAutocompleteContact: self.handleChangeAutocompleteContact,
        formAutocompleteContact: self.state.selectedOptionContact,
        // Autocomplete centro de costo
        centro: self.state.dataCostCenter,
        onChangeAutocompleteCentro: self.handleChangeAutocompleteCentro,
        onSearchCentro: self.handleFormCostCenterSearch,
        formAutocompleteCentro: self.state.selectedOptionCentro,
        rol: self.props.rol,
      }) : null
    );
  }
}

export default index;
