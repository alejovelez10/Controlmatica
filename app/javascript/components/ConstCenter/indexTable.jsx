import React from "react";
import { CmDataTable, CmPageActions } from "../../generalcomponents/ui";
import NumberFormat from "react-number-format";
import FormFilter from "../ConstCenter/FormFilter";
import FormCreate from "../ConstCenter/FormCreate";
import ModalError from "./ModalError";
import QuotationIndex from "./Quotation/Index";
import Swal from "sweetalert2/dist/sweetalert2.js";
import Select from "react-select";

class indexTable extends React.Component {
  constructor(props) {
    super(props);
    this.token = document.querySelector("[name='csrf-token']").content;

    this.state = {
      data: [],
      isLoaded: false,
      loading: true,
      show_filter: false,
      filtering: false,

      formFilter: {
        descripcion: "",
        customer_id: "",
        cost_center_id: "",
        execution_state: "",
        service_type: "",
        invoiced_state: "",
        start_date: "",
        end_date: "",
        quotation_number: "",
      },

      // Server pagination state
      serverMeta: {
        page: 1,
        per_page: 10,
        total: 0,
        total_pages: 1,
      },
      sortColumn: "created_at",
      sortDirection: "desc",
      searchTerm: "",

      selectedOption: {
        customer_id: "",
        label: "Buscar cliente",
      },

      clients: [],
      users: [],
      dataCostCenter: [],

      // Modal state
      modal: false,
      modalError: false,
      backdrop: "static",
      modeEdit: false,
      title: "Nuevo centro de costo",
      action: {},
      ErrorValues: true,
      isLoadingSubmit: false,
      messages: [],

      // Inline edit state
      inlineEditId: "",
      inlineEditFrom: "",
      formUpdate: {
        execution_state: "",
        invoiced_state: "",
        code: "",
      },

      // Sales state
      formUpdateSalesState: { sales_state: "" },
      cost_center_id: "",

      // Quotation modal
      quotation_cost_center_id: "",

      // Form state
      form: {
        customer_id: "",
        contact_id: "",
        service_type: "",
        user_id: this.props.usuario.id,
        description: "",
        user_owner_id: "",
        start_date: "",
        end_date: "",
        quotation_number: "0.0",
        execution_state: "PENDIENTE",
        eng_hours: "0.0",
        hour_real: this.props.hours_real,
        hour_cotizada: this.props.hours_invoices,
        hours_contractor: "0.0",
        hours_contractor_real: this.props.hours_real_contractor,
        hours_contractor_invoices: "0.0",
        materials_value: "0.0",
        viatic_value: "0.0",
        quotation_value: "0.0",
        displacement_hours: "0.0",
        value_displacement_hours: this.props.value_displacement_hours,
      },

      selectedOptionAutocomplete: {
        customer_id: "",
        label: "Seleccionar cliente",
      },
      selectedOptionContact: {
        contact_id: "",
        label: "Seleccionar Contacto",
      },
      selectedOptionUserOwner: {
        user_owner_id: "",
        label: "",
      },
      dataContact: [],

      selectedOptionCentro: {
        cost_center_id: "",
        label: "Centro de costo",
      },
    };
  }

  componentDidMount() {
    this.loadData();

    const arrayClients = this.props.clientes.map((item) => ({
      label: item.name,
      value: item.id,
    }));
    const arryUsers = this.props.users.map((item) => ({
      label: item.name,
      value: item.id,
    }));
    const arrayCostCenter = this.props.cost_center.map((item) => ({
      label: item.code,
      value: item.id,
    }));

    this.setState({
      dataCostCenter: arrayCostCenter,
      clients: arrayClients,
      users: arryUsers,
    });
  }

  // ---- Data loading ----

  buildFilterQuery = () => {
    const f = this.state.formFilter;
    if (!this.state.filtering) return "";
    return (
      `&filtering=true` +
      `&descripcion=${encodeURIComponent(f.descripcion || "")}` +
      `&customer_id=${encodeURIComponent(f.customer_id || "")}` +
      `&cost_center_id=${encodeURIComponent(f.cost_center_id || "")}` +
      `&execution_state=${encodeURIComponent(f.execution_state || "")}` +
      `&service_type=${encodeURIComponent(f.service_type || "")}` +
      `&invoiced_state=${encodeURIComponent(f.invoiced_state || "")}` +
      `&date_desde=${encodeURIComponent(f.start_date || "")}` +
      `&date_hasta=${encodeURIComponent(f.end_date || "")}` +
      `&quotation_number=${encodeURIComponent(f.quotation_number || "")}`
    );
  };

  loadData = () => {
    const { serverMeta, sortColumn, sortDirection, searchTerm } = this.state;
    const filterQuery = this.buildFilterQuery();
    const searchQuery = searchTerm ? `&descripcion=${encodeURIComponent(searchTerm)}` + (!this.state.filtering ? "&filtering=true" : "") : "";

    const url =
      `/get_cost_centers?page=${serverMeta.page}&per_page=${serverMeta.per_page}` +
      `&sort_column=${sortColumn}&sort_direction=${sortDirection}` +
      filterQuery +
      searchQuery;

    this.setState({ loading: true });

    fetch(url, {
      headers: {
        "X-CSRF-Token": this.token,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        this.setState({
          data: data.cost_centers_paginate,
          serverMeta: data.meta || {
            page: serverMeta.page,
            per_page: serverMeta.per_page,
            total: data.cost_centers_total,
            total_pages: Math.ceil(data.cost_centers_total / serverMeta.per_page),
          },
          isLoaded: true,
          loading: false,
        });
      });
  };

  // ---- Server-side callbacks for CmDataTable ----

  handlePageChange = (page) => {
    this.setState(
      (prev) => ({ serverMeta: { ...prev.serverMeta, page } }),
      this.loadData
    );
  };

  handlePerPageChange = (perPage) => {
    this.setState(
      (prev) => ({
        serverMeta: { ...prev.serverMeta, per_page: perPage, page: 1 },
      }),
      this.loadData
    );
  };

  handleSort = (key, dir) => {
    this.setState(
      { sortColumn: key, sortDirection: dir },
      this.loadData
    );
  };

  handleSearch = (term) => {
    this.setState(
      (prev) => ({
        searchTerm: term,
        serverMeta: { ...prev.serverMeta, page: 1 },
      }),
      this.loadData
    );
  };

  // ---- Filter methods ----

  handleChangeFilter = (e) => {
    this.setState({
      formFilter: {
        ...this.state.formFilter,
        [e.target.name]: e.target.value,
      },
    });
  };

  handleChangeAutocompleteCustomerFilter = (selectedOption) => {
    this.setState({
      selectedOption,
      formFilter: {
        ...this.state.formFilter,
        customer_id: selectedOption.value,
      },
    });
  };

  handleChangeAutocompleteCentro = (selectedOptionCentro) => {
    this.setState({
      selectedOptionCentro,
      formFilter: {
        ...this.state.formFilter,
        cost_center_id: selectedOptionCentro.value,
      },
    });
  };

  applyFilter = () => {
    this.setState(
      (prev) => ({
        filtering: true,
        serverMeta: { ...prev.serverMeta, page: 1 },
      }),
      this.loadData
    );
  };

  showFilter = (valor) => {
    if (valor === true) {
      this.setState(
        {
          show_filter: false,
          filtering: false,
          formFilter: {
            descripcion: "",
            customer_id: "",
            cost_center_id: "",
            service_type: "",
            execution_state: "",
            invoiced_state: "",
            start_date: "",
            end_date: "",
            quotation_number: "",
          },
          selectedOption: { customer_id: "", label: "Buscar cliente" },
          selectedOptionCentro: { cost_center_id: "", label: "Centro de costo" },
        },
        this.loadData
      );
    } else {
      this.setState({ show_filter: true, filtering: true });
    }
  };

  cancelFilter = () => {
    this.setState(
      {
        formFilter: {
          descripcion: "",
          customer_id: "",
          cost_center_id: "",
          execution_state: "",
          service_type: "",
          invoiced_state: "",
          start_date: "",
          end_date: "",
          quotation_number: "",
        },
        selectedOption: { customer_id: "", label: "Buscar cliente" },
      },
      this.loadData
    );
  };

  // ---- CRUD methods ----

  messageSuccess = (title, type) => {
    Swal.fire({
      position: "center",
      type: type,
      title: title,
      showConfirmButton: false,
      timer: 1500,
    });
  };

  updateItemInState = (register) => {
    this.setState({
      data: this.state.data.map((item) =>
        item.id === register.id ? register : item
      ),
    });
  };

  // Form
  toggle = (from) => {
    if (from === "edit") {
      this.setState({ modeEdit: true });
    } else if (from === "new") {
      this.setState({
        modeEdit: false,
        selectedOptionAutocomplete: { customer_id: "", label: "Buscar cliente" },
        selectedOptionContact: { contact_id: "", label: "Seleccionar Contacto" },
      });
      this.removeValues(true);
    } else {
      if (this.state.modeEdit) {
        this.setState({ modeEdit: false });
      } else {
        this.setState({ modeEdit: true });
      }
    }

    this.setState((prevState) => ({ modal: !prevState.modal }));
  };

  removeValues = (remove) => {
    if (remove) {
      this.setState({
        form: {
          customer_id: "",
          contact_id: "",
          user_id: this.props.usuario.id,
          description: "",
          start_date: "",
          end_date: "",
          user_owner_id: "",
          quotation_number: "",
          execution_state: "PENDIENTE",
          eng_hours: "",
          hour_real: this.props.hours_real,
          hour_cotizada: this.props.hours_invoices,
          hours_contractor: "",
          hours_contractor_real: this.props.hours_real_contractor,
          hours_contractor_invoices: "",
          materials_value: "",
          viatic_value: "",
          quotation_value: "",
          displacement_hours: "",
          value_displacement_hours: this.props.value_displacement_hours,
        },
        ErrorValues: true,
      });
    }
  };

  handleChange = (e) => {
    if (e.target.name === "service_type") {
      const defaults = {
        VENTA: {
          eng_hours: "0.0",
          hour_real: "0.0",
          hour_cotizada: "0.0",
          hours_contractor: "0.0",
          hours_contractor_real: this.props.hours_real_contractor,
          hours_contractor_invoices: "0.0",
          materials_value: "",
          quotation_value: "",
          user_owner_id: "",
          displacement_hours: "0.0",
          value_displacement_hours: this.props.value_displacement_hours,
          viatic_value: "0.0",
        },
        SERVICIO: {
          eng_hours: "",
          viatic_value: "",
          quotation_value: "",
          user_owner_id: "",
          hour_real: this.props.hours_real,
          hour_cotizada: this.props.hours_invoices,
          hours_contractor: "0.0",
          hours_contractor_real: this.props.hours_real_contractor,
          hours_contractor_invoices: "0.0",
          displacement_hours: "",
          value_displacement_hours: this.props.value_displacement_hours,
          materials_value: "0.0",
        },
        PROYECTO: {
          eng_hours: "",
          hour_real: this.props.hours_real,
          hour_cotizada: this.props.hours_invoices,
          hours_contractor: "",
          hours_contractor_real: this.props.hours_real_contractor,
          hours_contractor_invoices: "",
          displacement_hours: "",
          value_displacement_hours: this.props.value_displacement_hours,
          materials_value: "",
          user_owner_id: "",
          viatic_value: "",
          quotation_value: "",
        },
      };

      this.setState({
        form: {
          ...this.state.form,
          ...defaults[e.target.value],
          service_type: e.target.value,
        },
      });
    } else {
      this.setState({
        form: { ...this.state.form, [e.target.name]: e.target.value },
      });
    }
  };

  handleSubmit = (e) => {
    e.preventDefault();
  };

  validationForm = () => {
    const f = this.state.form;
    if (
      f.customer_id !== "" &&
      f.contact_id !== "" &&
      f.service_type !== "" &&
      f.start_date !== "" &&
      f.end_date !== "" &&
      f.quotation_number !== "" &&
      f.user_owner_id !== "" &&
      f.eng_hours !== "" &&
      f.hour_real !== "" &&
      f.hour_cotizada !== "" &&
      f.hours_contractor !== "" &&
      f.hours_contractor_real !== "" &&
      f.hours_contractor_invoices !== "" &&
      f.materials_value !== "" &&
      f.viatic_value !== "" &&
      f.quotation_value !== "" &&
      f.displacement_hours !== "" &&
      (f.value_displacement_hours !== "" || f.value_displacement_hours === 0)
    ) {
      this.setState({ ErrorValues: true });
      return true;
    } else {
      this.setState({ ErrorValues: false });
      return false;
    }
  };

  HandleClick = () => {
    if (this.validationForm()) {
      this.setState({ isLoadingSubmit: true });
      const url = this.state.modeEdit
        ? `/cost_centers/${this.state.action.id}`
        : "/cost_centers";
      const method = this.state.modeEdit ? "PATCH" : "POST";

      fetch(url, {
        method,
        body: JSON.stringify(this.state.form),
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.token,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (this.state.modeEdit) {
            this.updateItemInState(data.register);
          } else {
            this.loadData();
          }
          this.messageSuccess(data.message, data.type);
          this.setState({
            modal: false,
            isLoadingSubmit: false,
            selectedOptionAutocomplete: { customer_id: "", label: "Buscar cliente" },
            selectedOptionUserOwner: { user_owner_id: "", label: "" },
            selectedOptionContact: { contact_id: "", label: "Seleccionar Contacto" },
          });
          this.removeValues(true);
        })
        .catch((error) => {
          this.setState({ isLoadingSubmit: false });
        });
    }
  };

  handleChangeAutocomplete = (selectedOption) => {
    let array = [];
    fetch(`/get_client/${selectedOption.value}/centro`, {
      headers: { "X-CSRF-Token": this.token },
    })
      .then((response) => response.json())
      .then((data) => {
        data.map((item) => array.push({ label: item.name, value: item.id }));
        this.setState({ dataContact: array });
      });

    this.setState({
      selectedOptionAutocomplete: selectedOption,
      form: { ...this.state.form, customer_id: selectedOption.value },
    });
  };

  handleChangeAutocompleteContact = (selectedOptionContact) => {
    this.setState({
      selectedOptionContact,
      form: { ...this.state.form, contact_id: selectedOptionContact.value },
    });
  };

  handleChangeAutocompleteUserOwner = (selectedOptionUserOwner) => {
    this.setState({
      selectedOptionUserOwner,
      form: { ...this.state.form, user_owner_id: selectedOptionUserOwner.value },
    });
  };

  edit = (modulo) => {
    this.toggle("edit");

    let array = [];
    fetch(`/get_client/${modulo.customer_id}/centro`, {
      headers: { "X-CSRF-Token": this.token },
    })
      .then((response) => response.json())
      .then((data) => {
        data.map((item) => array.push({ label: item.name, value: item.id }));
        this.setState({ dataContact: array });
      });

    this.setState({
      selectedOptionAutocomplete: {
        value: modulo.customer_id,
        label: modulo.customer ? modulo.customer.name : "",
      },
      selectedOptionContact: {
        value: modulo.contact ? modulo.contact.id : "",
        label: modulo.contact ? modulo.contact.name : "",
      },
      selectedOptionUserOwner: {
        user_owner_id: modulo.user_owner ? modulo.user_owner.id : null,
        label: modulo.user_owner ? modulo.user_owner.name : "",
      },
      action: modulo,
      title: "Editar Centro de costo",
      form: {
        customer_id: modulo.customer_id,
        contact_id: modulo.contact_id,
        service_type: modulo.service_type,
        user_id: this.props.usuario.id,
        description: modulo.description,
        start_date: modulo.start_date,
        end_date: modulo.end_date,
        quotation_number: modulo.quotation_number,
        viatic_value: modulo.viatic_value,
        execution_state: "PENDIENTE",
        user_owner_id: modulo.user_owner ? modulo.user_owner.id : "",
        eng_hours: modulo.eng_hours || "0.0",
        hour_real: modulo.hour_real || "0.0",
        hour_cotizada: modulo.hour_cotizada || "0.0",
        hours_contractor: modulo.hours_contractor || "0.0",
        hours_contractor_real: modulo.hours_contractor_real || "0.0",
        hours_contractor_invoices: modulo.hours_contractor_invoices || "0.0",
        displacement_hours: modulo.displacement_hours || "0.0",
        value_displacement_hours: modulo.value_displacement_hours || "0.0",
        materials_value: modulo.materials_value || "0.0",
        quotation_value: modulo.quotation_value || "0.0",
        has_many_quotes: modulo.has_many_quotes,
      },
    });
  };

  delete = (cost_center) => {
    Swal.fire({
      title: "Escribe el codigo del centro de costo para poder eliminarlo",
      input: "text",
      footer: `<p>El codigo del centro de costo es (${cost_center.code}) </p>`,
      inputAttributes: { autocapitalize: "off" },
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      confirmButtonColor: "#16aaff",
      cancelButtonText: "Cancelar",
      showLoaderOnConfirm: true,
      preConfirm: (login) => {
        if (login === cost_center.code.trim()) {
          fetch(`/cost_centers/${cost_center.id}`, {
            method: "delete",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": this.token,
            },
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.type !== "delete") {
                this.setState({ modalError: true, messages: data.message });
              } else {
                this.setState({ modalError: false, messages: [] });
                this.loadData();
              }
            });
        } else {
          Swal.showValidationMessage("El codigo no concuerda");
        }
      },
      allowOutsideClick: () => !Swal.isLoading(),
    });
  };

  updateState = (accion) => {
    Swal.fire({
      title: "Estas seguro?",
      text: "El registro sera actualizado!",
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#009688",
      cancelButtonColor: "#d33",
      confirmButtonText: "Si",
    }).then((result) => {
      if (result.value) {
        fetch(`/cost_centers/change_state_ended/${accion.id}`, {
          method: "GET",
          headers: { "X-CSRF-Token": this.token },
        })
          .then((response) => response.json())
          .then((response) => {
            this.updateItemInState(response.register);
            Swal.fire("Actualizado!", "¡El registro fue actualizado con exito!", "success");
          });
      }
    });
  };

  // Inline edit
  HandleClickUpdate = (register, state_show, from_state) => {
    this.setState({
      inlineEditId: state_show ? register.id : "",
      inlineEditFrom: state_show ? from_state : "",
      formUpdate: {
        execution_state: register.execution_state,
        invoiced_state: register.invoiced_state,
        code: register.code,
      },
    });
  };

  onChangeUpdate = (e) => {
    this.setState({
      formUpdate: { ...this.state.formUpdate, [e.target.name]: e.target.value },
    });
  };

  handleClickUpdate = (cost_center_id) => {
    fetch(`/cost_centers/${cost_center_id}`, {
      method: "PATCH",
      body: JSON.stringify(this.state.formUpdate),
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": this.token,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        this.updateItemInState(data.register);
      });
  };

  onChangeUpdateSelect = (e) => {
    fetch(`/update_cost_centers/${this.state.inlineEditId}/${this.state.inlineEditFrom}/${e.target.value}`, {
      method: "POST",
      headers: { "X-CSRF-Token": this.token },
    })
      .then((res) => res.json())
      .then((data) => {
        this.updateItemInState(data.register);
        this.messageSuccess(data.message, data.type);
        this.setState({
          inlineEditId: "",
          inlineEditFrom: "",
          formUpdate: { execution_state: "", invoiced_state: "", code: "" },
        });
      });
  };

  // Sales state
  update_sales_state = (state, cost_center_id) => {
    fetch(`/update_sales_state_cost_center/${cost_center_id}/${state}`, {
      method: "PATCH",
      headers: {
        "X-CSRF-Token": this.token,
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        this.messageSuccess(data.success, data.type);
        this.updateItemInState(data.register);
        this.setState({
          formUpdateSalesState: { sales_state: "" },
          cost_center_id: "",
        });
      });
  };

  editSalesState = (mode, cost_center) => {
    if (mode === "cerrar") {
      this.setState({
        formUpdateSalesState: { sales_state: "" },
        cost_center_id: "",
      });
    } else {
      this.setState({
        formUpdateSalesState: { sales_state: cost_center.sales_state },
        cost_center_id: cost_center.id,
      });
    }
  };

  toogleModalError = (from) => {
    this.setState({
      modalError: from === "new",
      messages: from === "new" ? this.state.messages : [],
    });
  };

  toogleModalQuotationIndex = (from) => {
    this.setState({
      quotation_cost_center_id: from === "new" ? true : "",
    });
  };

  // Helpers
  getState = (userId) => {
    const e = this.props.estados;
    if (e.edit_all) return true;
    if (e.edit && this.props.usuario.id === userId) return true;
    return false;
  };

  alertIng = (value, min, med) => {
    if (value <= min) return "green";
    if (value > min && value <= med) return "orange";
    return "red";
  };

  alertIngCosto = (value, min, med) => {
    if (value >= min) return "green";
    if (value < min && value >= med) return "orange";
    return "red";
  };

  pastelBadge = (color, label, value) => {
    const styles = {
      green: { background: "#e6f9ed", color: "#1a7a3a", border: "1px solid #b7ebc9" },
      orange: { background: "#fff4e5", color: "#b35c00", border: "1px solid #ffd9a0" },
      red: { background: "#fde8e8", color: "#c0392b", border: "1px solid #f5b7b7" },
    };
    const s = styles[color] || styles.green;
    return (
      <span style={{
        ...s,
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: 500,
        lineHeight: "20px",
        whiteSpace: "nowrap",
      }}>
        {label}: <b>{value}</b>
      </span>
    );
  };

  getDate = (date) => {
    const d = new Date(date);
    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const timeValue = hours + (minutes < 10 ? ":0" + minutes : ":" + minutes);
    return months[d.getMonth()] + " " + d.getDate() + " del " + d.getFullYear() + " / " + timeValue;
  };

  getColumns = () => {
    const estados = this.props.estados;
    const alerts = this.props.alerts;
    const cols = [
      {
        key: "code",
        label: "Codigo",
        width: "200px",
        render: (row) => {
          if (this.state.inlineEditId === row.id && this.state.inlineEditFrom === "code") {
            return (
              <React.Fragment>
                <input name="code" className="form form-control" onChange={this.onChangeUpdate} value={this.state.formUpdate.code} onBlur={() => this.handleClickUpdate(row.id)} style={{ display: "inherit", width: "90%" }} />
                <i onClick={() => this.HandleClickUpdate(row, false, "code")} className="fas fa-times-circle float-right"></i>
              </React.Fragment>
            );
          }
          return (
            <span>
              {row.code}{" "}
              {estados.edit_code && (
                <i onClick={() => this.HandleClickUpdate(row, true, "code")} className="fas fa-pencil-alt float-right"></i>
              )}
            </span>
          );
        },
      },
      {
        key: "customer_name",
        label: "Cliente",
        width: "200px",
        render: (row) => (row.customer ? row.customer.name : ""),
      },
      { key: "service_type", label: "Tipo", width: "200px" },
      { key: "description", label: "Descripcion", width: "400px" },
    ];

    if (estados.sales_state) {
      cols.push({
        key: "sales_state_action",
        label: "Cerrar compras",
        width: "170px",
        sortable: false,
        render: (row) => {
          if ((row.service_type === "PROYECTO" || row.service_type === "VENTA") && row.sales_state !== "CERRADO") {
            return (
              <button className="btn btn-primary btn-sm" onClick={() => this.update_sales_state("CERRADO", row.id)}>
                Cerrar compra
              </button>
            );
          }
          return null;
        },
      });
    }

    cols.push({
      key: "sales_state",
      label: "Estado compras",
      width: "208px",
      render: (row) => {
        if (row.service_type !== "PROYECTO" && row.service_type !== "VENTA") return null;
        if (this.state.cost_center_id === row.id) {
          return (
            <React.Fragment>
              <select name="estado" className="form form-control" onChange={(e) => this.update_sales_state(e.target.value, row.id)} value={this.state.formUpdateSalesState.sales_state} style={{ display: "inherit", width: "90%" }}>
                <option value="">Seleccione</option>
                <option value="SIN COMPRAS">SIN COMPRAS</option>
                <option value="COMPRANDO">COMPRANDO</option>
                <option value="CERRADO">CERRADO</option>
              </select>
              <i onClick={() => this.editSalesState("cerrar", {})} className="fas fa-times-circle float-right"></i>
            </React.Fragment>
          );
        }
        return (
          <span>
            {row.sales_state}{" "}
            {estados.sales_state && (
              <i onClick={() => this.editSalesState("edit", row)} className="fas fa-pencil-alt float-right"></i>
            )}
          </span>
        );
      },
    });

    if (estados.ending) {
      cols.push({
        key: "ending",
        label: "Finalizar",
        width: "100px",
        sortable: false,
        render: (row) => {
          if ((row.service_type === "PROYECTO" || row.service_type === "SERVICIO") && row.execution_state === "EJECUCION") {
            return (
              <button className="btn btn-primary btn-sm" onClick={() => this.updateState(row)}>
                Finalizar
              </button>
            );
          }
          return null;
        },
      });
    }

    cols.push({
      key: "execution_state",
      label: "Estado ejecucion",
      width: "250px",
      render: (row) => {
        if (row.service_type !== "PROYECTO" && row.service_type !== "SERVICIO") return null;
        if (this.state.inlineEditId === row.id && this.state.inlineEditFrom === "execution_state") {
          return (
            <React.Fragment>
              <select name="estado" className="form form-control" onChange={this.onChangeUpdateSelect} value={this.state.formUpdate.execution_state} style={{ display: "inherit", width: "90%" }}>
                <option value="">Seleccione</option>
                <option value="PENDIENTE">PENDIENTE</option>
                <option value="EJECUCION">EJECUCION</option>
                <option value="FINALIZADO">FINALIZADO</option>
              </select>
              <i onClick={() => this.HandleClickUpdate(row, false, "execution_state")} className="fas fa-times-circle float-right"></i>
            </React.Fragment>
          );
        }
        return (
          <span>
            {row.execution_state}{" "}
            {estados.update_state && (
              <i onClick={() => this.HandleClickUpdate(row, true, "execution_state")} className="fas fa-pencil-alt float-right"></i>
            )}
          </span>
        );
      },
    });

    cols.push({
      key: "invoiced_state",
      label: "Estado facturado",
      width: "300px",
      render: (row) => {
        if (this.state.inlineEditId === row.id && this.state.inlineEditFrom === "invoiced_state") {
          return (
            <React.Fragment>
              <select name="estado" className="form form-control" onChange={this.onChangeUpdateSelect} value={this.state.formUpdate.invoiced_state} style={{ display: "inherit", width: "90%" }}>
                <option value="">Seleccione</option>
                <option value="FACTURADO">FACTURADO</option>
                <option value="FACTURADO PARCIAL">FACTURADO PARCIAL</option>
                <option value="LEGALIZADO">LEGALIZADO</option>
                <option value="LEGALIZADO PARCIAL">LEGALIZADO PARCIAL</option>
                <option value="POR FACTURAR">POR FACTURAR</option>
                <option value="PENDIENTE DE ORDEN DE COMPRA">PENDIENTE DE ORDEN DE COMPRA</option>
                <option value="PENDIENTE DE COTIZACION">PENDIENTE DE COTIZACION</option>
              </select>
              <i onClick={() => this.HandleClickUpdate(row, false, "invoiced_state")} className="fas fa-times-circle float-right"></i>
            </React.Fragment>
          );
        }
        return (
          <span>
            {row.invoiced_state}{" "}
            {estados.update_state && (
              <i onClick={() => this.HandleClickUpdate(row, true, "invoiced_state")} className="fas fa-pencil-alt float-right"></i>
            )}
          </span>
        );
      },
    });

    cols.push({ key: "quotation_number", label: "# Cotizacion", width: "250px" });

    // Indicator columns
    cols.push({
      key: "ing_ejecucion",
      label: "Ingenieria (Ejecucion)",
      width: "250px",
      sortable: false,
      render: (row) => (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li>Cotizado: <b>{row.eng_hours}</b></li>
          <li>Ejecutado: <b>{row.ing_horas_eje}</b></li>
          <li style={{ marginTop: 4 }}>{this.pastelBadge(this.alertIng(row.ing_horas_porcentaje, alerts[0].ing_ejecucion_min, alerts[0].ing_costo_med), "Avance", `${row.ing_horas_porcentaje}%`)}</li>
        </ul>
      ),
    });

    cols.push({
      key: "ing_costos",
      label: "Ingenieria (Costos)",
      width: "250px",
      sortable: false,
      render: (row) => (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li>Cotizada: <b><NumberFormat value={row.engineering_value + (row.displacement_hours * row.value_displacement_hours)} displayType="text" thousandSeparator prefix="$" /></b></li>
          <li>Costo: <b><NumberFormat value={row.ing_costo_real} displayType="text" thousandSeparator prefix="$" /></b></li>
          <li style={{ marginTop: 4 }}>{this.pastelBadge(this.alertIngCosto(row.ing_costo_porcentaje, alerts[0].ing_costo_min, alerts[0].ing_costo_med), "Margen", `${row.ing_costo_porcentaje}%`)}</li>
        </ul>
      ),
    });

    cols.push({
      key: "tab_ejecucion",
      label: "Tableristas (Ejecucion)",
      width: "250px",
      sortable: false,
      render: (row) => (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li>Cotizado: <b>{row.hours_contractor}</b></li>
          <li>Ejecutado: <b>{row.cont_horas_eje}</b></li>
          <li style={{ marginTop: 4 }}>{this.pastelBadge(this.alertIng(row.cont_horas_porcentaje, alerts[0].tab_ejecucion_min, alerts[0].tab_ejecucion_med), "Avance", `${row.cont_horas_porcentaje}%`)}</li>
        </ul>
      ),
    });

    cols.push({
      key: "tab_costos",
      label: "Tableristas (Costos)",
      width: "250px",
      sortable: false,
      render: (row) => (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li>Cotizada: <b><NumberFormat value={row.work_force_contractor} displayType="text" thousandSeparator prefix="$" /></b></li>
          <li>Costo: <b><NumberFormat value={row.cont_costo_real} displayType="text" thousandSeparator prefix="$" /></b></li>
          <li style={{ marginTop: 4 }}>{this.pastelBadge(this.alertIngCosto(row.cont_costo_porcentaje, alerts[0].tab_costo_min, alerts[0].tab_costo_med), "Margen", `${row.cont_costo_porcentaje}%`)}</li>
        </ul>
      ),
    });

    cols.push({
      key: "desplazamiento",
      label: "Desplazamiento",
      width: "250px",
      sortable: false,
      render: (row) => (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li>Cotizado: <b>{row.displacement_hours}</b></li>
          <li>Ejecutado: <b>{row.desp_horas_eje}</b></li>
          <li style={{ marginTop: 4 }}>{this.pastelBadge(this.alertIng(row.desp_horas_porcentaje, alerts[0].desp_min, alerts[0].desp_med), "Ejecucion", `${row.desp_horas_porcentaje}%`)}</li>
        </ul>
      ),
    });

    cols.push({
      key: "materiales",
      label: "Materiales",
      width: "250px",
      sortable: false,
      render: (row) => (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li>Cotizados: <b><NumberFormat value={row.materials_value} displayType="text" thousandSeparator prefix="$" /></b></li>
          <li>Comprados: <b><NumberFormat value={row.mat_costo_real} displayType="text" thousandSeparator prefix="$" /></b></li>
          <li style={{ marginTop: 4 }}>{this.pastelBadge(this.alertIngCosto(row.mat_costo_porcentaje, alerts[0].mat_min, alerts[0].mat_med), "Margen", `${row.mat_costo_porcentaje}%`)}</li>
        </ul>
      ),
    });

    cols.push({
      key: "viaticos",
      label: "Viaticos",
      width: "250px",
      sortable: false,
      render: (row) => (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li>Cotizado: <b><NumberFormat value={row.viatic_value} displayType="text" thousandSeparator prefix="$" /></b></li>
          <li>Gastado: <b><NumberFormat value={row.viat_costo_real} displayType="text" thousandSeparator prefix="$" /></b></li>
          <li style={{ marginTop: 4 }}>{this.pastelBadge(this.alertIng(row.viat_costo_porcentaje, alerts[0].via_min, alerts[0].via_med), "Avance", `${row.viat_costo_porcentaje}%`)}</li>
        </ul>
      ),
    });

    cols.push({
      key: "facturacion",
      label: "Facturacion",
      width: "250px",
      sortable: false,
      render: (row) => (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li>Cotizado: <b><NumberFormat value={row.quotation_value} displayType="text" thousandSeparator prefix="$" /></b></li>
          <li>Facturado: <b><NumberFormat value={row.fact_real} displayType="text" thousandSeparator prefix="$" /></b></li>
          <li style={{ marginTop: 4 }}>{this.pastelBadge("green", "Avance", `${row.fact_porcentaje}%`)}</li>
        </ul>
      ),
    });

    cols.push({
      key: "aiu_actual",
      label: "Aiu/Actual",
      width: "250px",
      sortable: false,
      render: (row) => (
        <div style={{ textAlign: "center" }}>
          <div><NumberFormat value={row.aiu} displayType="text" thousandSeparator prefix="$" /></div>
          <div style={{ marginTop: 4 }}>{this.pastelBadge(this.alertIngCosto(row.aiu_percent, alerts[0].total_min, alerts[0].total_med), "AIU", `${row.aiu_percent}%`)}</div>
        </div>
      ),
    });

    cols.push({
      key: "aiu_cotizado",
      label: "Aiu/Cotizado",
      width: "250px",
      sortable: false,
      render: (row) => (
        <div style={{ textAlign: "center" }}>
          <div><NumberFormat value={row.aiu_real} displayType="text" thousandSeparator prefix="$" /></div>
          <div style={{ marginTop: 4 }}>{this.pastelBadge(this.alertIngCosto(row.aiu_percent_real, alerts[0].total_min, alerts[0].total_med), "AIU", `${row.aiu_percent_real}%`)}</div>
        </div>
      ),
    });

    cols.push({
      key: "total_legalizado",
      label: "$ Total Legalizado",
      width: "250px",
      sortable: false,
      render: (row) => <NumberFormat value={row.sales_orders_total} displayType="text" thousandSeparator prefix="$" />,
    });

    cols.push({
      key: "total_cotizado",
      label: "$ Total Cotizado",
      width: "250px",
      render: (row) => <NumberFormat value={row.quotation_value} displayType="text" thousandSeparator prefix="$" />,
    });

    cols.push({
      key: "created_at",
      label: "Creacion",
      width: "250px",
      render: (row) => (
        <span>
          {this.getDate(row.created_at)}
          {row.user && <span> {row.user.names}</span>}
        </span>
      ),
    });

    cols.push({
      key: "updated_at",
      label: "Ultima actualizacion",
      width: "267px",
      render: (row) => (
        <span>
          {this.getDate(row.updated_at)}
          {row.last_user_edited && <span> {row.last_user_edited.names}</span>}
        </span>
      ),
    });

    return cols;
  };

  render() {
    const { estados } = this.props;

    const headerActions = (
      <React.Fragment>
        <button className="cm-btn cm-btn-outline cm-btn-sm" onClick={() => this.showFilter(!this.state.show_filter ? false : true)} disabled={!this.state.isLoaded}>
          <i className={`fas ${this.state.show_filter ? "fa-times" : "fa-filter"}`} />
          {this.state.show_filter ? "Cerrar filtros" : "Filtros"}
        </button>

        {estados.download_file && (
          <a
            className="cm-btn cm-btn-outline cm-btn-sm"
            href={`/download_file/cost_centers/${
              !this.state.filtering
                ? "todos.xls"
                : `filtro.xls?descripcion=${this.state.formFilter.descripcion}&customer_id=${this.state.formFilter.customer_id || ""}&cost_center_id=${this.state.formFilter.cost_center_id || ""}&execution_state=${this.state.formFilter.execution_state}&service_type=${this.state.formFilter.service_type}&invoiced_state=${this.state.formFilter.invoiced_state}&date_desde=${this.state.formFilter.start_date}&date_hasta=${this.state.formFilter.end_date}&quotation_number=${this.state.formFilter.quotation_number}`
            }`}
            target="_blank"
          >
            <i className="fas fa-file-excel" /> Exportar
          </a>
        )}
      </React.Fragment>
    );

    return (
      <React.Fragment>
        {estados.create && (
          <CmPageActions>
            <button onClick={() => this.toggle("new")} className="cm-btn cm-btn-accent cm-btn-sm">
              <i className="fas fa-plus" /> Nuevo Centro de Costo
            </button>
          </CmPageActions>
        )}

        {this.state.modal && (
          <FormCreate
            toggle={this.toggle}
            backdrop={this.state.backdrop}
            modal={this.state.modal}
            onChangeForm={this.handleChange}
            formValues={this.state.form}
            submit={this.HandleClick}
            FormSubmit={this.handleSubmit}
            titulo={this.state.title}
            nameSubmit={this.state.modeEdit ? "Actualizar" : "Crear"}
            errorValues={this.state.ErrorValues}
            modeEdit={this.state.modeEdit}
            clientes={this.state.clients}
            onChangeAutocomplete={this.handleChangeAutocomplete}
            formAutocomplete={this.state.selectedOptionAutocomplete}
            contacto={this.state.dataContact}
            onChangeAutocompleteContact={this.handleChangeAutocompleteContact}
            formAutocompleteContact={this.state.selectedOptionContact}
            formAutocompleteUserOwner={this.state.selectedOptionUserOwner}
            onChangeAutocompleteUserOwner={this.handleChangeAutocompleteUserOwner}
            users={this.state.users}
            estados={estados}
            isLoading={this.state.isLoadingSubmit}
          />
        )}

        {this.state.modalError && (
          <ModalError
            toggle={this.toogleModalError}
            backdrop={this.state.backdrop}
            modal={this.state.modalError}
            messages={this.state.messages}
          />
        )}

        {this.state.quotation_cost_center_id && (
          <QuotationIndex
            toggle={this.toogleModalQuotationIndex}
            backdrop={this.state.backdrop}
            modal={this.state.quotation_cost_center_id ? true : false}
            cost_center_id={this.state.quotation_cost_center_id}
          />
        )}

        {this.state.show_filter && (
          <FormFilter
            onChangeFilter={this.handleChangeFilter}
            formValuesFilter={this.state.formFilter}
            onClick={this.applyFilter}
            cancelFilter={this.cancelFilter}
            closeFilter={this.showFilter}
            formAutocompleteCustomer={this.state.selectedOption}
            onChangeAutocompleteCustomer={this.handleChangeAutocompleteCustomerFilter}
            clientes={this.state.clients}
            centro={this.state.dataCostCenter}
            onChangeAutocompleteCentro={this.handleChangeAutocompleteCentro}
            formAutocompleteCentro={this.state.selectedOptionCentro}
          />
        )}

        <CmDataTable
          columns={this.getColumns()}
          data={this.state.data}
          loading={this.state.loading}
          serverPagination={true}
          serverMeta={this.state.serverMeta}
          onPageChange={this.handlePageChange}
          onPerPageChange={this.handlePerPageChange}
          onSort={this.handleSort}
          onSearch={this.handleSearch}
          searchPlaceholder="Buscar por descripcion..."
          headerActions={headerActions}
          emptyMessage="No hay centros de costo registrados"
          emptyAction={
            estados.create && (
              <button onClick={() => this.toggle("new")} className="cm-btn cm-btn-accent cm-btn-sm" style={{ marginTop: 8 }}>
                <i className="fas fa-plus" /> Nuevo Centro de Costo
              </button>
            )
          }
          stickyActions
          actions={(row) => (
            <div className="cm-dt-menu">
              <button className="cm-dt-menu-trigger" onClick={(e) => {
                e.stopPropagation();
                var btn = e.currentTarget;
                var menu = btn.nextElementSibling;
                var allMenus = document.querySelectorAll('.cm-dt-menu-dropdown.open');
                allMenus.forEach(function(m) { m.classList.remove('open'); });
                var rect = btn.getBoundingClientRect();
                document.body.appendChild(menu);
                menu.style.top = (rect.bottom + 4) + 'px';
                menu.style.left = (rect.right - 160) + 'px';
                menu.classList.add('open');
                var close = function(ev) {
                  if (!menu.contains(ev.target) && !btn.contains(ev.target)) {
                    menu.classList.remove('open');
                    btn.parentNode.appendChild(menu);
                    document.removeEventListener('click', close);
                  }
                };
                document.addEventListener('click', close);
              }}>
                <i className="fas fa-ellipsis-v" />
              </button>
              <div className="cm-dt-menu-dropdown">
                {estados.manage_module && (
                  <a href={`/cost_centers/${row.id}?tab=home`} target="_blank" className="cm-dt-menu-item">
                    <i className="fas fa-external-link-alt" /> Gestionar
                  </a>
                )}
                {this.getState(row.user_id) && (
                  <button onClick={() => this.edit(row)} className="cm-dt-menu-item">
                    <i className="fas fa-pen" /> Editar
                  </button>
                )}
                {estados.delete && (
                  <button onClick={() => this.delete(row)} className="cm-dt-menu-item cm-dt-menu-item--danger">
                    <i className="fas fa-trash" /> Eliminar
                  </button>
                )}
              </div>
            </div>
          )}
        />
      </React.Fragment>
    );
  }
}

export default indexTable;
