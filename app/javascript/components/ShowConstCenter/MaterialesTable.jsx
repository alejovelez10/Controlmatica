import React, { Component } from 'react';
import NumberFormat from "react-number-format";
import FormCreate from '../Materials/FormCreate';
import Swal from "sweetalert2";
import IndexInvoice from '../incomeDetail/IndexInvoice';
import { CmDataTable } from '../../generalcomponents/ui';

function csrfToken() {
  var meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}

class MaterialesTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: [],
      loading: true,
      modal: false,
      modeEdit: false,
      modalIndexInvoice: false,
      ErrorValues: true,
      material_id: "",
      material: {},
      form: {
        provider_id: "", sales_date: "", sales_number: "", amount: "",
        delivery_date: "", sales_state: "", description: "",
        user_id: this.props.usuario.id, cost_center_id: this.props.cost_center.id,
      },
    };

    this.columns = [
      { key: "provider_name", label: "Proveedor", render: (r) => r.provider ? r.provider.name : "" },
      { key: "sales_number", label: "# Orden" },
      { key: "amount", label: "Valor", render: (r) => <NumberFormat value={r.amount} displayType="text" thousandSeparator={true} prefix="$" /> },
      { key: "description", label: "Descripción" },
      { key: "sales_date", label: "Fecha Orden" },
      { key: "delivery_date", label: "Fecha Entrega" },
      { key: "provider_invoice_value", label: "Valor Facturas", render: (r) => <NumberFormat value={r.provider_invoice_value} displayType="text" thousandSeparator={true} prefix="$" /> },
      { key: "sales_state", label: "Estado" },
    ];
  }

  componentDidMount() { this.loadData(); }

  loadData = () => {
    this.setState({ loading: true });
    fetch("/getValues/" + this.props.cost_center.id)
      .then((r) => r.json())
      .then((data) => { this.setState({ data: data.dataMateriales || [], loading: false }); });
  };

  HandleChange = (e) => { this.setState({ form: Object.assign({}, this.state.form, { [e.target.name]: e.target.value }) }); };

  toogle = (from) => {
    if (from === "new") { this.setState({ modal: true }); this.clearValues(); }
    else { this.setState({ modal: false }); this.clearValues(); }
  };

  toogleIndexInvoice = (from, material) => {
    if (from === "new") { this.setState({ modalIndexInvoice: true, material: material }); }
    else { this.setState({ modalIndexInvoice: false, material: {} }); }
  };

  clearValues = () => {
    this.setState({
      modeEdit: false, ErrorValues: true, material_id: "",
      form: Object.assign({}, this.state.form, { provider_id: "", sales_date: "", sales_number: "", amount: "", delivery_date: "", sales_state: "", description: "" }),
    });
  };

  edit = (material) => {
    this.setState({
      modal: true, material_id: material.id,
      form: Object.assign({}, this.state.form, {
        provider_id: material.provider_id, sales_date: material.sales_date,
        sales_number: material.sales_number, amount: material.amount,
        delivery_date: material.delivery_date, sales_state: material.sales_state,
        description: material.description,
      }),
    });
  };

  HandleClick = () => {
    var self = this;
    var url = this.state.material_id ? "/materials/" + this.state.material_id : "/materials";
    var method = this.state.material_id ? "PATCH" : "POST";
    fetch(url, { method: method, body: JSON.stringify(this.state.form), headers: { "X-CSRF-Token": csrfToken(), "Content-Type": "application/json" } })
      .then((r) => r.json())
      .then(() => { self.setState({ modal: false }); self.loadData(); self.clearValues(); });
  };

  delete = (id) => {
    Swal.fire({ title: "¿Estás seguro?", text: "El material será eliminado permanentemente", icon: "warning", showCancelButton: true, confirmButtonColor: "#2a3f53", cancelButtonColor: "#dc3545", confirmButtonText: "Sí, eliminar", cancelButtonText: "Cancelar" })
      .then((result) => {
        if (result.value) {
          fetch("/materials/" + id, { method: "delete", headers: { "X-CSRF-Token": csrfToken(), "Content-Type": "application/json" } })
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
        {this.props.estados.cost_center_edit && <button onClick={() => this.toogleIndexInvoice("new", row)} className="cm-dt-menu-item"><i className="fas fa-file-invoice" /> Facturas</button>}
        {this.props.estados.edit_materials && <button onClick={() => this.edit(row)} className="cm-dt-menu-item"><i className="fas fa-pen" /> Editar</button>}
        {this.props.estados.delete_materials && <button onClick={() => this.delete(row.id)} className="cm-dt-menu-item cm-dt-menu-item--danger"><i className="fas fa-trash" /> Eliminar</button>}
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
            FormSubmit={(e) => e.preventDefault()}
            titulo={this.state.material_id ? "Actualizar material" : "Crear material"}
            nameSubmit={this.state.material_id ? "Actualizar" : "Crear"}
            errorValues={this.state.ErrorValues} modeEdit={!!this.state.material_id}
            providers={this.props.providers} cost_center_id={this.props.cost_center.id}
          />
        )}
        {this.state.modalIndexInvoice && (
          <IndexInvoice toggle={this.toogleIndexInvoice} backdrop="static" modal={this.state.modalIndexInvoice} material={this.state.material} loadData={this.loadData} />
        )}
        <CmDataTable
          columns={this.columns} data={this.state.data} loading={this.state.loading}
          actions={this.renderActions} stickyActions
          searchPlaceholder="Buscar material..." emptyMessage="No hay materiales registrados"
          headerActions={this.props.estados.cost_center_edit ? <button className="cm-btn cm-btn-accent cm-btn-sm" onClick={() => this.toogle("new")}><i className="fas fa-plus" /> Nuevo Material</button> : null}
          emptyAction={this.props.estados.cost_center_edit ? <button onClick={() => this.toogle("new")} className="cm-btn cm-btn-accent cm-btn-sm" style={{ marginTop: "8px" }}><i className="fas fa-plus" /> Nuevo Material</button> : null}
        />
      </React.Fragment>
    );
  }
}

export default MaterialesTable;
