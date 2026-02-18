import React from 'react';
import NumberFormat from 'react-number-format';
import FormCreate from "./FormCreate";
import Swal from 'sweetalert2';
import TabContentShow from '../ShowConstCenter/TabContentShow';
import Calendar from '../Shifts/Calendar';

function csrfToken() {
  var meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}

function formatDate(date) {
  if (!date) return "—";
  var d = new Date(date);
  var months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  var h = d.getHours();
  var m = d.getMinutes();
  return d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear() + " " + (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
}

function statusBadgeClass(state) {
  if (!state) return "cm-status-badge--gray";
  var s = state.toUpperCase();
  if (s === "FINALIZADO" || s === "CERRADO" || s === "FACTURADO" || s === "LEGALIZADO") return "cm-status-badge--green";
  if (s === "EJECUCION" || s === "COMPRANDO" || s === "FACTURADO PARCIAL" || s === "LEGALIZADO PARCIAL") return "cm-status-badge--yellow";
  if (s === "PENDIENTE" || s === "SIN COMPRAS" || s === "PENDIENTE DE COTIZACION" || s === "PENDIENTE DE ORDEN DE COMPRA" || s === "POR FACTURAR") return "cm-status-badge--blue";
  return "cm-status-badge--gray";
}

// Metric card component
function pctBadgeClass(pct, inverted) {
  if (pct === "N/A" || pct === undefined) return "cm-pct-badge--gray";
  var n = parseFloat(pct);
  if (inverted) {
    if (n >= 50) return "cm-pct-badge--green";
    if (n >= 0) return "cm-pct-badge--orange";
    return "cm-pct-badge--red";
  }
  if (n <= 80) return "cm-pct-badge--green";
  if (n <= 100) return "cm-pct-badge--orange";
  return "cm-pct-badge--red";
}

function MetricCard(props) {
  var colorClass = "";
  var pct = props.percent;
  if (pct !== "N/A" && pct !== undefined) {
    var n = parseFloat(pct);
    if (props.inverted) {
      colorClass = n >= 50 ? "cm-metric-card--green" : n >= 0 ? "cm-metric-card--orange" : "cm-metric-card--red";
    } else {
      colorClass = n <= 80 ? "cm-metric-card--green" : n <= 100 ? "cm-metric-card--orange" : "cm-metric-card--red";
    }
  }

  var formatPct = function(val) {
    if (val === undefined || val === null || val === "N/A") return "N/A";
    return parseFloat(val).toFixed(1);
  };

  return (
    <div className={"cm-metric-card " + colorClass}>
      <div className="cm-metric-card-title">
        <i className={props.icon || "fas fa-chart-bar"} />
        {props.title}
      </div>
      <div className="cm-metric-card-body">
        <div className="cm-metric-item">
          <span className="cm-metric-item-label">{props.col1Label || "Cotizado"}</span>
          <span className={"cm-metric-item-value" + (props.isCurrency ? " cm-metric-item-value--currency" : "")}>
            {props.isCurrency ? (
              <NumberFormat value={props.col1} displayType="text" thousandSeparator={true} prefix="$" decimalScale={0} />
            ) : (
              props.col1 !== undefined ? props.col1 : "—"
            )}
          </span>
        </div>
        <div className="cm-metric-item">
          <span className="cm-metric-item-label">{props.col2Label || "Ejecutado"}</span>
          <span className={"cm-metric-item-value" + (props.isCurrency ? " cm-metric-item-value--currency" : "")}>
            {props.isCurrency ? (
              <NumberFormat value={props.col2} displayType="text" thousandSeparator={true} prefix="$" decimalScale={0} />
            ) : (
              props.col2 !== undefined ? props.col2 : "—"
            )}
          </span>
        </div>
        <div className="cm-metric-item">
          <span className="cm-metric-item-label">{props.col3Label || "Avance"}</span>
          <span className="cm-metric-item-value">
            {pct !== undefined ? <span className={"cm-pct-badge " + pctBadgeClass(pct, props.inverted)}>{formatPct(pct)}%</span> : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

class Show extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      state_ejecution: false,
      state_compras: false,
      invoiced_state: false,
      show_btn_update: false,

      formUpdate: {
        execution_state: this.props.data_info.execution_state,
        invoiced_state: this.props.data_info.invoiced_state,
        sales_state: this.props.data_info.sales_state,
        id: this.props.data_info.id,
      },

      dataMateriales: [],
      dataContractors: [],
      dataSalesOrdes: [],
      dataReports: [],
      dataExpenses: [],
      current_tab: this.props.current_tab,

      modal: false,
      backdrop: "static",

      form: {
        customer_id: this.props.data_info.customer_id,
        contact_id: this.props.data_info.contact_id,
        service_type: this.props.data_info.service_type,
        user_id: this.props.data_info.user_id,
        description: this.props.data_info.description,
        start_date: this.props.data_info.start_date,
        end_date: this.props.data_info.end_date,
        quotation_number: this.props.data_info.quotation_number,
        execution_state: this.props.data_info.execution_state,
        eng_hours: this.props.data_info.eng_hours,
        hour_real: this.props.data_info.hour_real,
        hour_cotizada: this.props.data_info.hour_cotizada,
        hours_contractor: this.props.data_info.hours_contractor,
        hours_contractor_real: this.props.data_info.hours_contractor_real,
        hours_contractor_invoices: this.props.data_info.hours_contractor_invoices,
        materials_value: this.props.data_info.materials_value,
        viatic_value: this.props.data_info.viatic_value,
        quotation_value: this.props.data_info.quotation_value,
        displacement_hours: this.props.data_info.displacement_hours,
        value_displacement_hours: this.props.data_info.value_displacement_hours,
        user_owner_id: this.props.data_info.user_owner_id != null ? this.props.data_info.user_owner_id : "",
      },

      selectedOption: { customer_id: "", label: "Seleccionar cliente" },
      selectedOptionUserOwner: {
        user_owner_id: this.props.data_info.user_owner != undefined ? this.props.data_info.user_owner.id : "",
        label: this.props.data_info.user_owner != undefined ? this.props.data_info.user_owner.names : "",
      },
      selectedOptionContact: { contact_id: "", label: "Seleccionar Contacto" },
      dataContact: [],
      clients: [],
      users: [],
    };
  }

  componentDidMount() {
    var arryUsers = [];
    this.props.users.map(function(item) { arryUsers.push({ label: item.name, value: item.id }); });

    var array = [];
    this.props.clientes.map(function(item) { array.push({ label: item.name, value: item.id }); });

    this.setState({ users: arryUsers, clients: array });
    this.getValues();
  }

  getValues() {
    fetch("/getValues/" + this.props.cost_center.id)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        this.setState({
          dataMateriales: data.dataMateriales,
          dataContractors: data.dataContractors,
          dataSalesOrdes: data.dataSalesOrdes,
          dataReports: data.dataReports,
          dataExpenses: data.dataExpenses,
        });
      }.bind(this));
  }

  handleChangeForm = function(e) {
    this.setState({ form: Object.assign({}, this.state.form, { [e.target.name]: e.target.value }) });
  }.bind(this);

  handleChange = function(e) {
    this.setState({ formUpdate: Object.assign({}, this.state.formUpdate, { [e.target.name]: e.target.value }) });
  }.bind(this);

  handleChangeAutocomplete = function(opt) {
    var self = this;
    fetch("/get_client/" + opt.value + "/centro")
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var arr = [];
        data.map(function(item) { arr.push({ label: item.name, value: item.id }); });
        self.setState({ dataContact: arr });
      });
    this.setState({
      selectedOption: opt,
      form: Object.assign({}, this.state.form, { customer_id: opt.value }),
    });
  }.bind(this);

  handleChangeAutocompleteContact = function(opt) {
    this.setState({
      selectedOptionContact: opt,
      form: Object.assign({}, this.state.form, { contact_id: opt.value }),
    });
  }.bind(this);

  handleChangeAutocompleteUserOwner = function(opt) {
    this.setState({
      selectedOptionUserOwner: opt,
      form: Object.assign({}, this.state.form, { user_owner_id: opt.value }),
    });
  }.bind(this);

  changeState = function(from) {
    if (from === "invoiced_state") {
      this.setState({ invoiced_state: true });
    } else if (from === "sales_state") {
      this.setState({ state_compras: true });
    } else {
      this.setState({ state_ejecution: true });
    }
    this.setState({ show_btn_update: true });
  }.bind(this);

  SubmitBnt = function(from) {
    var self = this;
    if (from === "save") {
      fetch("/cost_centers/" + this.props.data_info.id, {
        method: "PATCH",
        body: JSON.stringify(this.state.formUpdate),
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() },
      })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          self.props.loadData();
          self.setState({
            state_ejecution: false, invoiced_state: false, state_compras: false, show_btn_update: false,
            formUpdate: {
              execution_state: data.register.execution_state,
              invoiced_state: data.register.invoiced_state,
              sales_state: data.register.sales_state,
              id: data.register.id,
            },
          });
        });
    } else {
      this.setState({ state_ejecution: false, invoiced_state: false, show_btn_update: false, state_compras: false });
    }
  }.bind(this);

  HandleClick = function() {
    var self = this;
    fetch("/cost_centers/" + this.state.action.id, {
      method: "PATCH",
      body: JSON.stringify(this.state.form),
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() },
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        self.props.loadData();
        Swal.fire({ position: "center", type: data.type, title: data.message, showConfirmButton: false, timer: 1500 });
        self.setState({
          modal: false,
          selectedOption: { customer_id: "", label: "Buscar cliente" },
          selectedOptionContact: { contact_id: "", label: "Seleccionar Contacto" },
        });
      });
  }.bind(this);

  toggle = function(from) {
    if (from === "edit") {
      this.setState({ modeEdit: true });
    } else if (from === "new") {
      this.setState({ modeEdit: false, selectedOption: { customer_id: "", label: "Buscar cliente" }, selectedOptionContact: { contact_id: "", label: "Seleccionar Contacto" } });
    }
    this.setState(function(prev) { return { modal: !prev.modal }; });
  }.bind(this);

  edit = function() {
    var info = this.props.data_info;
    this.setState({
      modal: true, modeEdit: true, action: info,
      selectedOption: { value: info.customer_id, label: info.customer.name },
      selectedOptionContact: { value: info.contact.customer_id, label: info.contact.name },
      selectedOptionUserOwner: {
        user_owner_id: info.contact.user_owner_id != null ? info.contact.user_owner_id : "",
        label: info.user_owner != undefined ? info.user_owner.names : "",
      },
      form: {
        customer_id: info.customer_id, contact_id: info.contact_id, service_type: info.service_type,
        user_id: info.user_id, description: info.description, start_date: info.start_date, end_date: info.end_date,
        quotation_number: info.quotation_number, viatic_value: info.viatic_value, execution_state: "PENDIENTE",
        eng_hours: info.eng_hours || "0.0", hour_real: info.hour_real || "0.0", hour_cotizada: info.hour_cotizada || "0.0",
        hours_contractor: info.hours_contractor || "0.0", hours_contractor_real: info.hours_contractor_real || "0.0",
        hours_contractor_invoices: info.hours_contractor_invoices || "0.0",
        displacement_hours: info.displacement_hours || "0.0", value_displacement_hours: info.value_displacement_hours || "0.0",
        materials_value: info.materials_value || "0.0", viatic_value: info.viatic_value || "0.0",
        quotation_value: info.quotation_value || "0.0", has_many_quotes: info.has_many_quotes,
      },
    });
  }.bind(this);

  loadData = function() { this.props.loadData(); }.bind(this);

  alertColor = function(value, min, med, inverted) {
    if (value === "N/A" || value === undefined) return "inherit";
    var v = parseFloat(value);
    if (inverted) {
      if (v >= min) return "#28a745";
      if (v >= med) return "#f5a623";
      return "#dc3545";
    }
    if (v <= min) return "#28a745";
    if (v <= med) return "#f5a623";
    return "#dc3545";
  };

  alertBadgeClass = function(value, min, med, inverted) {
    if (value === "N/A" || value === undefined) return "cm-pct-badge--gray";
    var v = parseFloat(value);
    if (inverted) {
      if (v >= min) return "cm-pct-badge--green";
      if (v >= med) return "cm-pct-badge--orange";
      return "cm-pct-badge--red";
    }
    if (v <= min) return "cm-pct-badge--green";
    if (v <= med) return "cm-pct-badge--orange";
    return "cm-pct-badge--red";
  };

  renderStateField = function(label, stateKey, formKey, isEditing, options) {
    var info = this.props.data_info;
    var value = info[formKey] || "SIN INFORMACIÓN";

    if (isEditing) {
      return (
        <div className="cm-show-info-item">
          <span className="cm-show-info-label">{label}</span>
          <select name={formKey} className="cm-state-select" value={this.state.formUpdate[formKey]} onChange={this.handleChange}>
            <option value="">Seleccione</option>
            {options.map(function(o) { return <option key={o} value={o}>{o}</option>; })}
          </select>
        </div>
      );
    }

    var canEdit = this.props.estados.update_state;
    return (
      <div className="cm-show-info-item">
        <span className="cm-show-info-label">{label}</span>
        {canEdit ? (
          <span className={"cm-status-badge " + statusBadgeClass(value) + " cm-show-info-value--clickable"} onClick={function() { this.changeState(stateKey === "execution_state" ? undefined : stateKey); }.bind(this)}>
            {value}
          </span>
        ) : (
          <span className={"cm-status-badge " + statusBadgeClass(value)}>{value}</span>
        )}
      </div>
    );
  }.bind(this);

  getMetricCards = function() {
    var info = this.props.data_info;
    var type = info.service_type;
    var alerts = this.props.alerts && this.props.alerts[0] ? this.props.alerts[0] : {};
    var cards = [];

    if (type === "SERVICIO" || type === "PROYECTO") {
      cards.push(
        <MetricCard key="ing_eje" title="Ingeniería (Ejecución)" icon="fas fa-cogs"
          col1={info.eng_hours} col2={this.props.horas_eje} percent={this.props.porc_eje}
          alertColor={this.alertColor(this.props.porc_eje, alerts.ing_ejecucion_min, alerts.ing_costo_med)}
        />
      );
      cards.push(
        <MetricCard key="ing_cost" title="Ingeniería (Costos)" icon="fas fa-dollar-sign"
          col1Label="Cotizada" col2Label="Costo" col3Label="Margen"
          col1={this.props.costo_en_dinero} col2={this.props.costo_real_en_dinero} percent={this.props.porc_eje_costo}
          isCurrency inverted
          alertColor={this.alertColor(this.props.porc_eje_costo, alerts.ing_costo_min, alerts.ing_costo_med, true)}
        />
      );
    }

    if (type === "PROYECTO") {
      cards.push(
        <MetricCard key="tab_eje" title="Tableristas (Ejecución)" icon="fas fa-tools"
          col1={this.props.hours_contractor} col2={this.props.hours_eje_contractor} percent={this.props.porc_eje_contractor}
          alertColor={this.alertColor(this.props.porc_eje_contractor, alerts.tab_ejecucion_min, alerts.tab_ejecucion_med)}
        />
      );
      cards.push(
        <MetricCard key="tab_cost" title="Tableristas (Costos)" icon="fas fa-dollar-sign"
          col1Label="Cotizada" col2Label="Costo" col3Label="Margen"
          col1={this.props.costo_en_dinero_contractor} col2={this.props.costo_real_en_dinero_contractor} percent={this.props.porc_eje_costo_contractor}
          isCurrency inverted
          alertColor={this.alertColor(this.props.porc_eje_costo_contractor, alerts.tab_costo_min, alerts.tab_costo_med, true)}
        />
      );
    }

    if (type === "SERVICIO" || type === "PROYECTO") {
      cards.push(
        <MetricCard key="desp" title="Desplazamiento" icon="fas fa-route"
          col1={info.displacement_hours} col2={this.props.ejecutado_desplazamiento_horas}
          col3Label="Ejecución" percent={this.props.porc_desplazamiento}
          alertColor={this.alertColor(this.props.porc_desplazamiento, alerts.desp_min, alerts.desp_med)}
        />
      );
      cards.push(
        <MetricCard key="via" title="Viáticos" icon="fas fa-money-bill-wave"
          col1Label="Cotizado" col2Label="Gastado" col3Label="Avance"
          col1={this.props.via_cotizado} col2={this.props.via_real} percent={this.props.porc_via}
          isCurrency
          alertColor={this.alertColor(this.props.porc_via, alerts.via_min, alerts.via_med)}
        />
      );
    }

    if (type === "VENTA" || type === "PROYECTO") {
      cards.push(
        <MetricCard key="mat" title="Materiales" icon="fas fa-boxes"
          col1Label="Cotizados" col2Label="Comprados" col3Label="Margen"
          col1={info.materials_value} col2={this.props.sum_materials} percent={this.props.porc_mat}
          isCurrency inverted
          alertColor={this.alertColor(this.props.porc_mat, alerts.mat_min, alerts.mat_med, true)}
        />
      );
    }

    cards.push(
      <MetricCard key="fac" title="Facturación" icon="fas fa-file-invoice-dollar"
        col1Label="Cotizado" col2Label="Facturado" col3Label="Avance"
        col1={info.quotation_value} col2={this.props.facturacion} percent={this.props.porc_fac}
        isCurrency
        alertColor={this.alertColor(this.props.porc_fac, 0, 100)}
      />
    );

    return cards;
  }.bind(this);

  render() {
    var info = this.props.data_info;
    var alerts = this.props.alerts && this.props.alerts[0] ? this.props.alerts[0] : {};
    var isHome = this.props.current_tab === "home";

    return (
      <React.Fragment>
        {/* Top navigation tabs */}
        <div className="cm-show-top-tabs">
          <a className={"cm-show-top-tab" + (isHome ? " cm-show-top-tab--active" : "")}
            href={"/cost_centers/" + this.props.cost_center.id + "?tab=home"}>
            <i className="fas fa-info-circle" /> Información
          </a>
          <a className={"cm-show-top-tab" + (!isHome ? " cm-show-top-tab--active" : "")}
            href={"/cost_centers/" + this.props.cost_center.id + "?tab=calendar"}>
            <i className="fas fa-calendar-alt" /> Calendario
          </a>
        </div>

        {isHome ? (
          <React.Fragment>
            {/* Header card */}
            <div className="cm-show-header">
              <div className="cm-show-title-bar">
                <h2 className="cm-show-title">
                  {info.customer != undefined ? info.customer.name : "Cargando..."}
                  {info.code && <span className="cm-show-code">{info.code}</span>}
                  {info.service_type && <span className="cm-show-type-badge">{info.service_type}</span>}
                </h2>
                <div className="cm-show-actions">
                  {this.state.show_btn_update && (
                    <React.Fragment>
                      <button className="cm-btn cm-btn-primary cm-btn-sm" onClick={function() { this.SubmitBnt("save"); }.bind(this)}>
                        <i className="fas fa-check" /> Actualizar
                      </button>
                      <button className="cm-btn cm-btn-outline cm-btn-sm" onClick={function() { this.SubmitBnt(); }.bind(this)}>
                        <i className="fas fa-times" /> Cancelar
                      </button>
                    </React.Fragment>
                  )}
                  {this.props.estados.cost_center_edit && !this.state.show_btn_update && (
                    <button className="cm-btn cm-btn-accent cm-btn-sm" onClick={this.edit}>
                      <i className="fas fa-pen" /> Editar
                    </button>
                  )}
                </div>
              </div>

              {/* Info grid */}
              <div className="cm-show-info-grid">
                {(info.service_type === "PROYECTO" || info.service_type === "SERVICIO") &&
                  this.renderStateField("Estado Ejecución", "execution_state", "execution_state", this.state.state_ejecution,
                    ["EJECUCION", "FINALIZADO", "PENDIENTE"])
                }
                {(info.service_type === "PROYECTO" || info.service_type === "VENTA") &&
                  this.renderStateField("Estado Compras", "sales_state", "sales_state", this.state.state_compras,
                    ["SIN COMPRAS", "COMPRANDO", "CERRADO"])
                }
                {this.renderStateField("Estado Facturación", "invoiced_state", "invoiced_state", this.state.invoiced_state,
                  ["PENDIENTE DE COTIZACION", "PENDIENTE DE ORDEN DE COMPRA", "LEGALIZADO", "LEGALIZADO PARCIAL", "FACTURADO", "FACTURADO PARCIAL", "POR FACTURAR"])
                }

                <div className="cm-show-info-item">
                  <span className="cm-show-info-label">Contacto</span>
                  <span className="cm-show-info-value">{info.contact != undefined ? info.contact.name : "—"}</span>
                </div>
                <div className="cm-show-info-item">
                  <span className="cm-show-info-label">Fecha Inicio</span>
                  <span className="cm-show-info-value">{info.start_date || "—"}</span>
                </div>
                <div className="cm-show-info-item">
                  <span className="cm-show-info-label">Fecha Final</span>
                  <span className="cm-show-info-value">{info.end_date || "—"}</span>
                </div>
                <div className="cm-show-info-item">
                  <span className="cm-show-info-label">N. Cotización</span>
                  <span className="cm-show-info-value">{info.quotation_number || "—"}</span>
                </div>
                <div className="cm-show-info-item cm-show-info-item--description">
                  <span className="cm-show-info-label">Descripción</span>
                  <span className="cm-show-info-value cm-description-text" title={info.description || ""}>{info.description || "—"}</span>
                </div>
                <div className="cm-show-info-item">
                  <span className="cm-show-info-label">Propietario</span>
                  <span className="cm-show-info-value">{info.user_owner != undefined ? info.user_owner.names : "—"}</span>
                </div>
                <div className="cm-show-info-item cm-show-info-item--highlight">
                  <span className="cm-show-info-label">Margen Real</span>
                  <span className="cm-show-info-value">
                    <NumberFormat value={info.aiu} displayType="text" thousandSeparator={true} prefix="$" decimalScale={0} />
                    <span className={"cm-pct-badge " + this.alertBadgeClass(info.aiu_percent, alerts.total_min, alerts.total_med, true)}>{parseFloat(info.aiu_percent || 0).toFixed(1)}%</span>
                  </span>
                </div>
                <div className="cm-show-info-item cm-show-info-item--highlight">
                  <span className="cm-show-info-label">Margen Cotizado</span>
                  <span className="cm-show-info-value">
                    <NumberFormat value={info.aiu_real} displayType="text" thousandSeparator={true} prefix="$" decimalScale={0} />
                    <span className={"cm-pct-badge " + this.alertBadgeClass(info.aiu_percent_real, alerts.total_min, alerts.total_med, true)}>{parseFloat(info.aiu_percent_real || 0).toFixed(1)}%</span>
                  </span>
                </div>
                <div className="cm-show-info-item cm-show-info-item--audit">
                  <span className="cm-audit-row">
                    <span className="cm-audit-item">
                      <i className="fas fa-plus-circle" /> {formatDate(info.created_at)}{info.user != undefined ? " — " + info.user.names : ""}
                    </span>
                    <span className="cm-audit-separator">|</span>
                    <span className="cm-audit-item">
                      <i className="fas fa-edit" /> {formatDate(info.updated_at)}{info.last_user_edited != undefined ? " — " + info.last_user_edited.names : ""}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Metric cards */}
            {info.service_type && (
              <div className="cm-metrics-grid">
                {this.getMetricCards()}
              </div>
            )}

            {/* Edit modal */}
            {this.state.modal && (
              <FormCreate
                toggle={this.toggle}
                backdrop={this.state.backdrop}
                modal={this.state.modal}
                onChangeForm={this.handleChangeForm}
                formValues={this.state.form}
                submit={this.HandleClick}
                FormSubmit={function(e) { e.preventDefault(); }}
                titulo="Actualizar centro de costo"
                nameSubmit="Actualizar"
                errorValues={true}
                modeEdit={true}
                clientes={this.state.clients}
                onChangeAutocomplete={this.handleChangeAutocomplete}
                formAutocomplete={this.state.selectedOption}
                contacto={this.state.dataContact}
                onChangeAutocompleteContact={this.handleChangeAutocompleteContact}
                formAutocompleteContact={this.state.selectedOptionContact}
                formAutocompleteUserOwner={this.state.selectedOptionUserOwner}
                onChangeAutocompleteUserOwner={this.handleChangeAutocompleteUserOwner}
                users={this.state.users}
                estados={this.props.estados}
              />
            )}

            {/* Sub-tables */}
            <div className="cm-tabs">
              <TabContentShow
                loadData={this.loadData}
                dataMateriales={this.state.dataMateriales}
                dataContractors={this.state.dataContractors}
                dataSalesOrdes={this.state.dataSalesOrdes}
                dataReports={this.state.dataReports}
                dataExpenses={this.state.dataExpenses}
                cost_center={this.props.cost_center}
                usuario={this.props.usuario}
                providers={this.props.providers}
                users={this.state.users}
                report_expense_options={this.props.report_expense_options}
                clients={this.state.clients}
                estados={this.props.estados}
              />
            </div>
          </React.Fragment>
        ) : (
          <Calendar
            url_calendar={"/get_shifts_const_center/" + this.props.cost_center.id}
            fixedCostCenter={{ value: this.props.cost_center.id, label: this.props.cost_center.code }}
            users={this.props.users_select}
            microsoft_auth={this.props.microsoft_auth}
            current_user_name={this.props.current_user_name}
          />
        )}
      </React.Fragment>
    );
  }
}

export default Show;
