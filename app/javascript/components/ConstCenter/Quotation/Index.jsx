import React, { Component } from 'react';
import FormCreate from './FormCreate';
import Swal from 'sweetalert2';
import NumberFormat from 'react-number-format';
import { CmDataTable } from '../../../generalcomponents/ui';

function csrfToken() {
  var meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}

class Index extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: [],
      loading: true,
      modal: false,
      modeEdit: false,
      quotation_id: "",
      form: {
        cost_center_id: this.props.cost_center_id,
        description: "",
        quotation_number: "",
        eng_hours: "",
        hour_real: 50000,
        hour_cotizada: 80000,
        hours_contractor: "",
        hours_contractor_real: 50000,
        hours_contractor_invoices: "",
        displacement_hours: "",
        value_displacement_hours: 50000,
        materials_value: "",
        viatic_value: "",
        quotation_value: "",
      },
    };

    this.columns = [
      { key: "description", label: "Descripción" },
      { key: "quotation_number", label: "N. Cotización" },
      { key: "eng_hours", label: "Hora Ing." },
      { key: "hour_real", label: "Valor hora costo", render: (r) => <NumberFormat value={r.hour_real} displayType="text" thousandSeparator={true} prefix="$" /> },
      { key: "ingenieria_total_costo", label: "Total Ing. costo", render: (r) => <NumberFormat value={r.ingenieria_total_costo} displayType="text" thousandSeparator={true} prefix="$" /> },
      { key: "hour_cotizada", label: "Valor hora cotizada", render: (r) => <NumberFormat value={r.hour_cotizada} displayType="text" thousandSeparator={true} prefix="$" /> },
      { key: "engineering_value", label: "Total Ing. cotizada", render: (r) => <NumberFormat value={r.engineering_value} displayType="text" thousandSeparator={true} prefix="$" /> },
      { key: "hours_contractor", label: "Hora Tab." },
      { key: "hours_contractor_real", label: "V. hora costo Tab.", render: (r) => <NumberFormat value={r.hours_contractor_real} displayType="text" thousandSeparator={true} prefix="$" /> },
      { key: "contractor_total_costo", label: "Total Tab. costo", render: (r) => <NumberFormat value={r.contractor_total_costo} displayType="text" thousandSeparator={true} prefix="$" /> },
      { key: "hours_contractor_invoices", label: "V. hora cot. Tab.", render: (r) => <NumberFormat value={r.hours_contractor_invoices} displayType="text" thousandSeparator={true} prefix="$" /> },
      { key: "work_force_contractor", label: "Total Tab. cotizado", render: (r) => <NumberFormat value={r.work_force_contractor} displayType="text" thousandSeparator={true} prefix="$" /> },
      { key: "displacement_hours", label: "Horas desp." },
      { key: "value_displacement_hours", label: "V. hora desp.", render: (r) => <NumberFormat value={r.value_displacement_hours} displayType="text" thousandSeparator={true} prefix="$" /> },
      { key: "offset_value", label: "Total desp.", render: (r) => <NumberFormat value={r.offset_value} displayType="text" thousandSeparator={true} prefix="$" /> },
      { key: "materials_value", label: "Materiales", render: (r) => <NumberFormat value={r.materials_value} displayType="text" thousandSeparator={true} prefix="$" /> },
      { key: "viatic_value", label: "Viáticos", render: (r) => <NumberFormat value={r.viatic_value} displayType="text" thousandSeparator={true} prefix="$" /> },
      { key: "quotation_value", label: "Total Cotización", render: (r) => <NumberFormat value={r.quotation_value} displayType="text" thousandSeparator={true} prefix="$" /> },
    ];
  }

  componentDidMount() { this.loadData(); }

  loadData = () => {
    this.setState({ loading: true });
    fetch("/get_quotations/" + this.props.cost_center_id)
      .then((r) => r.json())
      .then((data) => { this.setState({ data: data.data, loading: false }); });
  };

  HandleChange = (e) => {
    this.setState({ form: Object.assign({}, this.state.form, { [e.target.name]: e.target.value }) });
  };

  HandleChangeMoney = (e) => {
    var value = e.target.value.replace(/[$,]/g, '');
    this.setState({ form: Object.assign({}, this.state.form, { [e.target.name]: value }) });
  };

  toogle = (from) => {
    if (from === "new") { this.setState({ modal: true }); this.clearValues(); }
    else { this.setState({ modal: false }); this.clearValues(); }
  };

  clearValues = () => {
    this.setState({
      modeEdit: false, quotation_id: "",
      form: Object.assign({}, this.state.form, {
        description: "", quotation_number: "", eng_hours: "", hour_real: 50000, hour_cotizada: 80000,
        hours_contractor: "", hours_contractor_real: 50000, hours_contractor_invoices: "",
        displacement_hours: "", value_displacement_hours: 50000, materials_value: "", viatic_value: "", quotation_value: "",
      }),
    });
  };

  edit = (q) => {
    this.setState({
      modal: true, modeEdit: true, quotation_id: q.id,
      form: Object.assign({}, this.state.form, {
        description: q.description, quotation_number: q.quotation_number, eng_hours: q.eng_hours,
        hour_real: q.hour_real, hour_cotizada: q.hour_cotizada, hours_contractor: q.hours_contractor,
        hours_contractor_real: q.hours_contractor_real, hours_contractor_invoices: q.hours_contractor_invoices,
        displacement_hours: q.displacement_hours, value_displacement_hours: q.value_displacement_hours,
        materials_value: q.materials_value, viatic_value: q.viatic_value, quotation_value: q.quotation_value,
      }),
    });
  };

  HandleClick = () => {
    var self = this;
    var url = this.state.modeEdit ? "/quotations/" + this.state.quotation_id : "/quotations";
    var method = this.state.modeEdit ? "PATCH" : "POST";
    fetch(url, { method: method, body: JSON.stringify(this.state.form), headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() } })
      .then((r) => r.json())
      .then((data) => {
        self.setState({ modal: false });
        self.loadData();
        self.clearValues();
        if (self.props.loadData) self.props.loadData();
      });
  };

  delete = (id) => {
    Swal.fire({ title: "¿Estás seguro?", text: "La cotización será eliminada permanentemente", icon: "warning", showCancelButton: true, confirmButtonColor: "#2a3f53", cancelButtonColor: "#dc3545", confirmButtonText: "Sí, eliminar", cancelButtonText: "Cancelar" })
      .then((result) => {
        if (result.value) {
          fetch("/quotations/" + id, { method: "delete", headers: { "X-CSRF-Token": csrfToken() } })
            .then((r) => r.json())
            .then(() => { this.loadData(); Swal.fire({ title: "Eliminado", text: "La cotización fue eliminada", icon: "success", confirmButtonColor: "#2a3f53" }); });
        }
      });
  };

  openMenu = (e) => {
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
    var close = function(ev) { if (!menu.contains(ev.target) && !btn.contains(ev.target)) { menu.classList.remove('open'); btn.parentNode.appendChild(menu); document.removeEventListener('click', close); } };
    document.addEventListener('click', close);
  };

  renderActions = (row) => {
    return (
      <div className="cm-dt-menu">
        <button className="cm-dt-menu-trigger" onClick={this.openMenu}><i className="fas fa-ellipsis-v" /></button>
        <div className="cm-dt-menu-dropdown">
          {this.props.estados.cost_center_edit && (
            <button onClick={() => this.edit(row)} className="cm-dt-menu-item"><i className="fas fa-pen" /> Editar</button>
          )}
          {this.props.estados.cost_center_edit && (
            <button onClick={() => this.delete(row.id)} className="cm-dt-menu-item cm-dt-menu-item--danger"><i className="fas fa-trash" /> Eliminar</button>
          )}
        </div>
      </div>
    );
  };

  render() {
    return (
      <React.Fragment>
        {this.state.modal && (
          <FormCreate
            backdrop="static" modal={this.state.modal} toggle={this.toogle}
            title={this.state.modeEdit ? "Actualizar cotización" : "Crear cotización"}
            nameBnt={this.state.modeEdit ? "Actualizar" : "Crear"}
            formValues={this.state.form} onChangeForm={this.HandleChange}
            handleChangeMoney={this.HandleChangeMoney} submitForm={this.HandleClick}
            errorValues={true} cost_center={this.props.cost_center}
          />
        )}
        <CmDataTable
          columns={this.columns}
          data={this.state.data}
          loading={this.state.loading}
          actions={this.renderActions}
          stickyActions
          searchPlaceholder="Buscar cotización..."
          emptyMessage="No hay cotizaciones registradas"
          headerActions={
            this.props.estados.cost_center_edit ? (
              <button className="cm-btn cm-btn-accent cm-btn-sm" onClick={() => this.toogle("new")}>
                <i className="fas fa-plus" /> Nueva Cotización
              </button>
            ) : null
          }
          emptyAction={
            this.props.estados.cost_center_edit ? (
              <button onClick={() => this.toogle("new")} className="cm-btn cm-btn-accent cm-btn-sm" style={{ marginTop: "8px" }}>
                <i className="fas fa-plus" /> Nueva Cotización
              </button>
            ) : null
          }
        />
      </React.Fragment>
    );
  }
}

export default Index;
