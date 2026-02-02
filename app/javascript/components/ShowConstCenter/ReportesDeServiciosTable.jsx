import React, { Component } from 'react';
import NumberFormat from "react-number-format";
import Swal from "sweetalert2/dist/sweetalert2.js";
import FormCreate from '../Reports/FormCreate';
import { CmDataTable } from '../../generalcomponents/ui';

function csrfToken() {
  var meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}

class ReportesDeServiciosTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: [],
      loading: true,
      modal: false,
      modeEdit: false,
      ErrorValues: true,
      report_id: "",
      form: {
        customer_id: "", contact_id: "", report_date: "", working_time: "",
        work_description: "", viatic_value: "", viatic_description: "",
        report_code: 0, displacement_hours: "", value_displacement_hours: "",
        cost_center_id: this.props.cost_center.id,
        report_execute_id: this.props.usuario.id, user_id: this.props.usuario.id,
      },
      formContact: { contact_name: "", contact_position: "", contact_phone: "", contact_email: "", customer_id: "" },
      selectedOption: { customer_id: "", label: "Buscar cliente" },
      selectedOptionContact: { contact_id: "", label: "Seleccionar Contacto" },
      selectedOptionCentro: { cost_center_id: "", label: "Centro de costo" },
      dataContact: [],
      users: [],
      dataCostCenter: [],
    };

    this.columns = [
      { key: "code_report", label: "Código" },
      { key: "customer_name", label: "Cliente", render: (r) => r.cost_center && r.cost_center.customer ? r.cost_center.customer.name : "" },
      { key: "report_date", label: "Fecha Ejecución" },
      { key: "report_execute_name", label: "Responsable", render: (r) => r.report_execute ? r.report_execute.names : "" },
      { key: "working_time", label: "Horas" },
      { key: "work_description", label: "Descripción Trabajo" },
      { key: "viatic_value", label: "Viáticos", render: (r) => <NumberFormat value={r.viatic_value} displayType="text" thousandSeparator={true} prefix="$" /> },
      { key: "viatic_description", label: "Desc. Viáticos" },
      { key: "total_value", label: "Valor Reporte", render: (r) => <NumberFormat value={r.total_value} displayType="text" thousandSeparator={true} prefix="$" /> },
      { key: "report_sate", label: "Estado", render: (r) => r.report_sate ? "Aprobado" : "Sin Aprobar" },
    ];
  }

  componentDidMount() {
    this.configSelect();
    this.loadData();
  }

  configSelect = () => {
    var array = [];
    if (this.props.users) { this.props.users.forEach((item) => { array.push({ names: item.label, id: item.value }); }); }
    this.setState({ users: array });
  };

  loadData = () => {
    this.setState({ loading: true });
    fetch("/getValues/" + this.props.cost_center.id)
      .then((r) => r.json())
      .then((data) => { this.setState({ data: data.dataReports || [], loading: false }); });
  };

  HandleChange = (e) => { this.setState({ form: Object.assign({}, this.state.form, { [e.target.name]: e.target.value }) }); };

  toogle = (from) => {
    if (from === "new") { this.setState({ modal: true }); this.clearValues(); }
    else { this.setState({ modal: false }); this.clearValues(); }
  };

  clearValues = () => {
    this.setState({
      modeEdit: false, ErrorValues: true, report_id: "",
      form: Object.assign({}, this.state.form, {
        customer_id: "", contact_id: "", report_date: "", working_time: "",
        work_description: "", viatic_value: "", viatic_description: "",
        report_code: 0, displacement_hours: "", value_displacement_hours: "",
      }),
      selectedOption: { customer_id: "", label: "Buscar cliente" },
      selectedOptionContact: { contact_id: "", label: "Seleccionar Contacto" },
      selectedOptionCentro: { cost_center_id: "", label: "Centro de costo" },
    });
  };

  edit = (report) => {
    this.setState({
      modal: true, report_id: report.id,
      form: Object.assign({}, this.state.form, {
        customer_id: report.customer_id, contact_id: report.contact_id,
        report_date: report.report_date, report_execute_id: report.report_execute_id,
        working_time: report.working_time, work_description: report.work_description,
        viatic_value: report.viatic_value, viatic_description: report.viatic_description,
        report_code: report.report_code, displacement_hours: report.displacement_hours,
        value_displacement_hours: report.value_displacement_hours,
      }),
      selectedOption: { customer_id: report.customer_id, label: report.customer ? report.customer.name : "" },
      selectedOptionContact: { contact_id: report.contact_id, label: report.contact ? report.contact.name : "" },
    });
  };

  HandleClick = () => {
    var self = this;
    var url = this.state.report_id ? "/reports/" + this.state.report_id : "/reports";
    var method = this.state.report_id ? "PATCH" : "POST";
    fetch(url, { method: method, body: JSON.stringify(this.state.form), headers: { "X-CSRF-Token": csrfToken(), "Content-Type": "application/json" } })
      .then((r) => r.json())
      .then(() => { self.setState({ modal: false }); self.loadData(); self.clearValues(); });
  };

  handleChangeAutocomplete = (opt) => {
    var self = this;
    fetch("/get_client/" + opt.value)
      .then((r) => r.json())
      .then((data) => {
        var arr = [];
        data.forEach((item) => { arr.push({ label: item.name, value: item.id }); });
        self.setState({ dataContact: arr });
      });
    fetch("/customer_user/" + opt.value)
      .then((r) => r.json())
      .then((data) => {
        var arr = [];
        data.forEach((item) => { arr.push({ label: item.code + " - (" + item.description + ")", value: item.id }); });
        self.setState({ dataCostCenter: arr });
      });
    this.setState({ selectedOption: opt, form: Object.assign({}, this.state.form, { customer_id: opt.value }), formContact: Object.assign({}, this.state.formContact, { customer_id: opt.value }) });
  };

  handleChangeAutocompleteContact = (opt) => { this.setState({ selectedOptionContact: opt, form: Object.assign({}, this.state.form, { contact_id: opt.value }) }); };

  delete = (id) => {
    Swal.fire({ title: "¿Estás seguro?", text: "El reporte será eliminado permanentemente", type: "warning", showCancelButton: true, confirmButtonColor: "#2a3f53", cancelButtonColor: "#dc3545", confirmButtonText: "Sí, eliminar", cancelButtonText: "Cancelar" })
      .then((result) => {
        if (result.value) {
          fetch("/reports/" + id, { method: "delete", headers: { "X-CSRF-Token": csrfToken(), "Content-Type": "application/json" } })
            .then((r) => r.json())
            .then(() => { this.loadData(); });
        }
      });
  };

  openMenu = (e) => {
    e.stopPropagation();
    var btn = e.currentTarget; var menu = btn.nextElementSibling;
    document.querySelectorAll('.cm-dt-menu-dropdown.open').forEach(function(m) { m.classList.remove('open'); });
    var rect = btn.getBoundingClientRect();
    document.body.appendChild(menu);
    menu.style.top = (rect.bottom + 4) + 'px'; menu.style.left = (rect.right - 160) + 'px';
    menu.classList.add('open');
    var close = function(ev) { if (!menu.contains(ev.target) && !btn.contains(ev.target)) { menu.classList.remove('open'); btn.parentNode.appendChild(menu); document.removeEventListener('click', close); } };
    document.addEventListener('click', close);
  };

  renderActions = (row) => (
    <div className="cm-dt-menu">
      <button className="cm-dt-menu-trigger" onClick={this.openMenu}><i className="fas fa-ellipsis-v" /></button>
      <div className="cm-dt-menu-dropdown">
        {this.props.estados.cost_center_edit && <button onClick={() => this.edit(row)} className="cm-dt-menu-item"><i className="fas fa-pen" /> Editar</button>}
        {this.props.estados.cost_center_edit && <button onClick={() => this.delete(row.id)} className="cm-dt-menu-item cm-dt-menu-item--danger"><i className="fas fa-trash" /> Eliminar</button>}
      </div>
    </div>
  );

  render() {
    var estados = { create: true, delete: true, download_file: true, edit: true, edit_all: true, responsible: true, viatics: true };
    return (
      <React.Fragment>
        {this.state.modal && (
          <FormCreate
            toggle={this.toogle} backdrop="static" modal={this.state.modal}
            onChangeForm={this.HandleChange} formValues={this.state.form} submit={this.HandleClick}
            titulo={this.state.report_id ? "Actualizar reporte" : "Crear reporte"}
            nameSubmit={this.state.report_id ? "Actualizar" : "Crear"}
            errorValues={this.state.ErrorValues} users={this.state.users}
            formContactValues={this.state.formContact}
            clientes={this.props.clients} onChangeAutocomplete={this.handleChangeAutocomplete} formAutocomplete={this.state.selectedOption}
            contacto={this.state.dataContact} onChangeAutocompleteContact={this.handleChangeAutocompleteContact} formAutocompleteContact={this.state.selectedOptionContact}
            centro={this.state.dataCostCenter} estados={estados}
            cost_center_id={this.props.cost_center.id}
          />
        )}
        <CmDataTable
          columns={this.columns} data={this.state.data} loading={this.state.loading}
          actions={this.renderActions} stickyActions
          searchPlaceholder="Buscar reporte..." emptyMessage="No hay reportes de servicios"
          headerActions={this.props.estados.cost_center_edit ? <button className="cm-btn cm-btn-accent cm-btn-sm" onClick={() => this.toogle("new")}><i className="fas fa-plus" /> Nuevo Reporte</button> : null}
          emptyAction={this.props.estados.cost_center_edit ? <button onClick={() => this.toogle("new")} className="cm-btn cm-btn-accent cm-btn-sm" style={{ marginTop: "8px" }}><i className="fas fa-plus" /> Nuevo Reporte</button> : null}
        />
      </React.Fragment>
    );
  }
}

export default ReportesDeServiciosTable;
