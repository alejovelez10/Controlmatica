import React, { Component } from 'react';
import FormCreate from '../Contractors/FormCreate';
import Swal from "sweetalert2";
import { CmDataTable } from '../../generalcomponents/ui';

function csrfToken() {
  var meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}

class TableristasTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: [],
      loading: true,
      modal: false,
      modeEdit: false,
      ErrorValues: true,
      contractor_id: "",
      form: {
        sales_number: "", sales_date: "", ammount: "", description: "", hours: "",
        user_id: this.props.usuario.id, cost_center_id: this.props.cost_center.id,
        user_execute_id: "",
      },
      selectedOptionUsers: { user_execute_id: "", label: "Horas trabajadas por" },
    };

    this.columns = [
      { key: "sales_date", label: "Fecha" },
      { key: "hours", label: "Horas" },
      { key: "user_execute_name", label: "Trabajo realizado por", render: (r) => r.user_execute ? r.user_execute.names : "" },
      { key: "description", label: "Descripción" },
    ];
  }

  componentDidMount() { this.loadData(); }

  loadData = () => {
    this.setState({ loading: true });
    fetch("/getValues/" + this.props.cost_center.id)
      .then((r) => r.json())
      .then((data) => { this.setState({ data: data.dataContractors || [], loading: false }); });
  };

  HandleChange = (e) => { this.setState({ form: Object.assign({}, this.state.form, { [e.target.name]: e.target.value }) }); };

  handleChangeAutocompleteUsers = (opt) => {
    this.setState({ selectedOptionUsers: opt, form: Object.assign({}, this.state.form, { user_execute_id: opt.value }) });
  };

  toogle = (from) => {
    if (from === "new") { this.setState({ modal: true }); this.clearValues(); }
    else { this.setState({ modal: false }); this.clearValues(); }
  };

  clearValues = () => {
    this.setState({
      modeEdit: false, ErrorValues: true, contractor_id: "",
      form: Object.assign({}, this.state.form, { sales_number: "", sales_date: "", ammount: "", description: "", hours: "", user_execute_id: "" }),
      selectedOptionUsers: { user_execute_id: "", label: "Horas trabajadas por" },
    });
  };

  edit = (contractor) => {
    this.setState({
      modal: true, contractor_id: contractor.id,
      form: Object.assign({}, this.state.form, {
        sales_number: contractor.sales_number, sales_date: contractor.sales_date,
        ammount: contractor.ammount, description: contractor.description,
        hours: contractor.hours, user_execute_id: contractor.user_execute ? contractor.user_execute.id : "",
      }),
      selectedOptionUsers: {
        user_execute_id: contractor.user_execute_id,
        label: contractor.user_execute ? contractor.user_execute.names : "Horas trabajadas por",
      },
    });
  };

  HandleClick = () => {
    var self = this;
    var url = this.state.contractor_id ? "/contractors/" + this.state.contractor_id : "/contractors";
    var method = this.state.contractor_id ? "PATCH" : "POST";
    fetch(url, { method: method, body: JSON.stringify(this.state.form), headers: { "X-CSRF-Token": csrfToken(), "Content-Type": "application/json" } })
      .then((r) => r.json())
      .then(() => { self.setState({ modal: false }); self.loadData(); self.clearValues(); });
  };

  delete = (id) => {
    Swal.fire({ title: "¿Estás seguro?", text: "El tablerista será eliminado permanentemente", icon: "warning", showCancelButton: true, confirmButtonColor: "#2a3f53", cancelButtonColor: "#dc3545", confirmButtonText: "Sí, eliminar", cancelButtonText: "Cancelar" })
      .then((result) => {
        if (result.value) {
          fetch("/contractors/" + id, { method: "delete", headers: { "X-CSRF-Token": csrfToken(), "Content-Type": "application/json" } })
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
    return (
      <React.Fragment>
        {this.state.modal && (
          <FormCreate
            toggle={this.toogle} backdrop="static" modal={this.state.modal}
            onChangeForm={this.HandleChange} formValues={this.state.form} submit={this.HandleClick}
            titulo={this.state.contractor_id ? "Actualizar tablerista" : "Crear tablerista"}
            nameSubmit={this.state.contractor_id ? "Actualizar" : "Crear"}
            errorValues={this.state.ErrorValues} modeEdit={!!this.state.contractor_id}
            users={this.props.users} onChangeAutocompleteUsers={this.handleChangeAutocompleteUsers}
            formAutocompleteUsers={this.state.selectedOptionUsers}
            cost_center_id={this.props.cost_center.id}
          />
        )}
        <CmDataTable
          columns={this.columns} data={this.state.data} loading={this.state.loading}
          actions={this.renderActions} stickyActions
          searchPlaceholder="Buscar tablerista..." emptyMessage="No hay tableristas registrados"
          headerActions={this.props.estados.cost_center_edit ? <button className="cm-btn cm-btn-accent cm-btn-sm" onClick={() => this.toogle("new")}><i className="fas fa-plus" /> Nuevo Tablerista</button> : null}
          emptyAction={this.props.estados.cost_center_edit ? <button onClick={() => this.toogle("new")} className="cm-btn cm-btn-accent cm-btn-sm" style={{ marginTop: "8px" }}><i className="fas fa-plus" /> Nuevo Tablerista</button> : null}
        />
      </React.Fragment>
    );
  }
}

export default TableristasTable;
