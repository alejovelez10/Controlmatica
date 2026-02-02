import React from "react";
import Swal from "sweetalert2/dist/sweetalert2.js";
import NumberFormat from "react-number-format";
import { CmDataTable, CmPageActions, CmModal } from "../../generalcomponents/ui";
import FormCreate from "./FormCreate";

function csrfToken() {
  var meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
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

class index extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      data: [],
      loading: true,
      searchTerm: "",
      sortKey: null,
      sortDir: "asc",
      meta: { total: 0, page: 1, per_page: 10, total_pages: 1 },
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
    var newForm = Object.assign({}, this.state.form, { cost_center_id: selectedOptionCentro.value });
    this.setState({
      selectedOptionCentro: selectedOptionCentro,
      form: newForm,
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
          type: data.type,
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
          type: data.type,
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

  renderHeaderActions = function () {
    var self = this;
    var estados = self.props.estados;
    return React.createElement(React.Fragment, null,
      estados.download_file ? React.createElement("a", {
        href: "/download_file/reports/todos.xls",
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
      estados.create ? React.createElement(CmPageActions, null,
        React.createElement("button", {
          onClick: self.openNewModal,
          className: "cm-btn cm-btn-accent cm-btn-sm"
        }, React.createElement("i", { className: "fas fa-plus" }), " Nuevo Reporte")
      ) : null,

      React.createElement(CmDataTable, {
        columns: self.columns,
        data: self.state.data,
        loading: self.state.loading,
        actions: self.renderActions,
        stickyActions: true,
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
        formAutocompleteCentro: self.state.selectedOptionCentro,
        rol: self.props.rol,
      }) : null
    );
  }
}

export default index;
