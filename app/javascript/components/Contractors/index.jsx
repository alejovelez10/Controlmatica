import React from "react";
import Swal from "sweetalert2/dist/sweetalert2.js";
import { CmDataTable, CmPageActions, CmModal, CmInput, CmButton } from "../../generalcomponents/ui";
import FormCreate from "./FormCreate";

function csrfToken() {
  var meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}

var EMPTY_FORM = {
  sales_date: "",
  hours: "",
  description: "",
  ammount: "",
  cost_center_id: "",
  user_execute_id: "",
};

class index extends React.Component {
  constructor(props) {
    super(props);

    var dataCostCenter = [];
    if (props.cost_center) {
      props.cost_center.forEach(function (item) {
        dataCostCenter.push({ label: item.code, value: item.id });
      });
    }

    var dataUsers = [];
    if (props.users) {
      props.users.forEach(function (item) {
        dataUsers.push({ label: item.names, value: item.id });
      });
    }

    this.state = {
      data: [],
      loading: true,
      searchTerm: "",
      sortKey: null,
      sortDir: "asc",
      meta: { total: 0, page: 1, per_page: 10, total_pages: 1 },
      // Modal
      modalOpen: false,
      modalMode: "new",
      editId: null,
      form: Object.assign({}, EMPTY_FORM),
      errorValues: true,
      saving: false,
      // Selects
      dataCostCenter: dataCostCenter,
      dataUsers: dataUsers,
      selectedOptionCentro: { value: "", label: "Centro de costo" },
      selectedOptionUsers: { value: "", label: "Realizado por" },
    };

    this.columns = [
      { key: "sales_date", label: "Fecha", width: "120px" },
      {
        key: "cost_center_code",
        label: "Centro de Costo",
        width: "160px",
        render: function (r) {
          return r.cost_center ? r.cost_center.code : "";
        },
      },
      { key: "hours", label: "Horas", width: "80px" },
      {
        key: "user_execute_name",
        label: "Realizado por",
        width: "180px",
        render: function (r) {
          return r.user_execute ? r.user_execute.names : "";
        },
      },
      { key: "description", label: "Descripción", width: "300px" },
    ];
  }

  componentDidMount() {
    this.loadData();
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

    var url = "/get_contractors?page=" + p + "&per_page=" + pp;
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

  // ─── Modal ───

  openNewModal = function () {
    this.setState({
      modalOpen: true,
      modalMode: "new",
      editId: null,
      form: Object.assign({}, EMPTY_FORM),
      selectedOptionCentro: { value: "", label: "Centro de costo" },
      selectedOptionUsers: { value: "", label: "Realizado por" },
      errorValues: true,
      saving: false,
    });
  }.bind(this);

  openEditModal = function (row) {
    this.setState({
      modalOpen: true,
      modalMode: "edit",
      editId: row.id,
      errorValues: true,
      saving: false,
      form: {
        sales_date: row.sales_date || "",
        hours: row.hours || "",
        description: row.description || "",
        ammount: row.ammount || "",
        cost_center_id: row.cost_center_id || "",
        user_execute_id: row.user_execute_id || "",
      },
      selectedOptionCentro: {
        value: row.cost_center_id || "",
        label: row.cost_center ? row.cost_center.code : "Centro de costo",
      },
      selectedOptionUsers: {
        value: row.user_execute_id || "",
        label: row.user_execute ? row.user_execute.names : "Realizado por",
      },
    });
  }.bind(this);

  closeModal = function () {
    this.setState({ modalOpen: false });
  }.bind(this);

  // ─── Form Handling ───

  handleFormChange = function (e) {
    var newForm = Object.assign({}, this.state.form);
    newForm[e.target.name] = e.target.value;
    this.setState({ form: newForm });
  }.bind(this);

  handleChangeAutocompleteCentro = function (selected) {
    var newForm = Object.assign({}, this.state.form);
    newForm.cost_center_id = selected.value;
    this.setState({
      selectedOptionCentro: selected,
      form: newForm,
    });
  }.bind(this);

  handleChangeAutocompleteUsers = function (selected) {
    var newForm = Object.assign({}, this.state.form);
    newForm.user_execute_id = selected.value;
    this.setState({
      selectedOptionUsers: selected,
      form: newForm,
    });
  }.bind(this);

  // ─── Validation ───

  validationForm = function () {
    var form = this.state.form;
    if (
      form.sales_date !== "" &&
      form.cost_center_id !== "" &&
      form.hours !== "" &&
      form.user_execute_id !== "" &&
      form.description !== ""
    ) {
      this.setState({ errorValues: true });
      return true;
    } else {
      this.setState({ errorValues: false });
      return false;
    }
  }.bind(this);

  // ─── Submit ───

  handleSubmit = function () {
    var self = this;
    if (!self.validationForm()) return;

    self.setState({ saving: true });

    var isNew = self.state.modalMode === "new";
    var url = isNew ? "/contractors" : "/contractors/" + self.state.editId;
    var method = isNew ? "POST" : "PATCH";

    var body = Object.assign({}, self.state.form);
    body.user_id = self.props.usuario.id;

    fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() },
      body: JSON.stringify(body),
    })
      .then(function (res) { return res.json(); })
      .catch(function (error) { console.error("Error:", error); })
      .then(function (data) {
        if (data.type === "success") {
          self.closeModal();
          self.loadData(isNew ? 1 : undefined);
          Swal.fire({
            position: "center",
            type: "success",
            title: data.message,
            showConfirmButton: false,
            timer: 1500,
          });
        } else {
          Swal.fire({
            position: "center",
            type: "error",
            title: data.message,
            html: data.message_error ? "<p>" + data.message_error.join(", ") + "</p>" : "",
            showConfirmButton: true,
          });
          self.setState({ saving: false });
        }
      });
  }.bind(this);

  // ─── Delete ───

  deleteRecord = function (id) {
    var self = this;
    Swal.fire({
      title: "¿Estás seguro?",
      text: "El registro será eliminado permanentemente",
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#2a3f53",
      cancelButtonColor: "#dc3545",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    }).then(function (result) {
      if (result.value) {
        fetch("/contractors/" + id, { method: "delete", headers: { "X-CSRF-Token": csrfToken() } })
          .then(function (response) { return response.json(); })
          .then(function () {
            self.loadData();
            Swal.fire("Eliminado", "El registro fue eliminado con éxito", "success");
          });
      }
    });
  }.bind(this);

  // ─── Permission Check ───

  getState = function (row) {
    var estados = this.props.estados;
    var userId = this.props.usuario.id;
    var rowUserId = row.user ? row.user.id : null;

    if (estados.edit_all) return true;
    if (estados.edit && userId === rowUserId) return true;
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
  };

  renderActions = function (row) {
    var self = this;
    var estados = self.props.estados;
    var canEdit = self.getState(row);
    var isFinalizado = row.cost_center && row.cost_center.execution_state === "FINALIZADO";

    return (
      React.createElement("div", { className: "cm-dt-menu" },
        React.createElement("button", { className: "cm-dt-menu-trigger", onClick: self.openMenu },
          React.createElement("i", { className: "fas fa-ellipsis-v" })
        ),
        React.createElement("div", { className: "cm-dt-menu-dropdown" },
          canEdit && !isFinalizado ? React.createElement("button", {
            onClick: function () { self.openEditModal(row); },
            className: "cm-dt-menu-item"
          }, React.createElement("i", { className: "fas fa-pen" }), " Editar") : null,
          estados.delete ? React.createElement("button", {
            onClick: function () { self.deleteRecord(row.id); },
            className: "cm-dt-menu-item cm-dt-menu-item--danger"
          }, React.createElement("i", { className: "fas fa-trash" }), " Eliminar") : null
        )
      )
    );
  }.bind(this);

  renderHeaderActions = function () {
    var self = this;
    var estados = self.props.estados;
    return (
      React.createElement(React.Fragment, null,
        estados.download_file ? React.createElement("a", {
          href: "/download_file/contractors/todos.xls",
          target: "_blank",
          className: "cm-btn cm-btn-outline cm-btn-sm"
        }, React.createElement("i", { className: "fas fa-file-excel" }), " Exportar") : null
      )
    );
  }.bind(this);

  render() {
    var self = this;
    var meta = self.state.meta;
    var estados = self.props.estados;

    return (
      React.createElement(React.Fragment, null,
        estados.create ? React.createElement(CmPageActions, null,
          React.createElement("button", {
            onClick: self.openNewModal,
            className: "cm-btn cm-btn-accent cm-btn-sm"
          }, React.createElement("i", { className: "fas fa-plus" }), " Nuevo Registro")
        ) : null,

        React.createElement(CmDataTable, {
          columns: self.columns,
          data: self.state.data,
          loading: self.state.loading,
          actions: self.renderActions,
          headerActions: self.renderHeaderActions(),
          onSearch: self.handleSearch,
          searchPlaceholder: "Buscar por descripción o centro de costo...",
          emptyMessage: "No hay registros de tablerista",
          emptyAction: estados.create ? React.createElement("button", {
            onClick: self.openNewModal,
            className: "cm-btn cm-btn-accent cm-btn-sm",
            style: { marginTop: "8px" }
          }, React.createElement("i", { className: "fas fa-plus" }), " Nuevo Registro") : null,
          serverPagination: true,
          serverMeta: meta,
          onSort: self.handleSort,
          onPageChange: self.handlePageChange,
          onPerPageChange: self.handlePerPageChange,
        }),

        self.state.modalOpen ? React.createElement(FormCreate, {
          modal: self.state.modalOpen,
          toggle: self.closeModal,
          titulo: self.state.modalMode === "new" ? "Nuevo Registro Tablerista" : "Editar Registro Tablerista",
          nameSubmit: self.state.modalMode === "new" ? "Crear" : "Actualizar",
          onChangeForm: self.handleFormChange,
          formValues: self.state.form,
          submit: self.handleSubmit,
          errorValues: self.state.errorValues,
          isLoading: self.state.saving,
          centro: self.state.dataCostCenter,
          onChangeAutocompleteCentro: self.handleChangeAutocompleteCentro,
          formAutocompleteCentro: self.state.selectedOptionCentro,
          users: self.state.dataUsers,
          onChangeAutocompleteUsers: self.handleChangeAutocompleteUsers,
          formAutocompleteUsers: self.state.selectedOptionUsers,
        }) : null
      )
    );
  }
}

export default index;
