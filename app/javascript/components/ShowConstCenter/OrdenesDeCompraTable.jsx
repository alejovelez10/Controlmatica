import React, { Component } from 'react';
import NumberFormat from "react-number-format";
import FormCreate from '../PurchaseOrders/FormCreate';
import Swal from "sweetalert2";
import IndexInvoice from '../SalesOrders/IndexInvoice';
import { CmDataTable } from '../../generalcomponents/ui';

function csrfToken() {
  var meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}

class OrdenesDeCompraTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: [],
      loading: true,
      modal: false,
      modalIndexInvoice: false,
      modeEdit: false,
      ErrorValues: true,
      purchase_order_id: "",
      sales_order: {},
      form: {
        created_date: "", order_number: "", order_value: "", order_file: {},
        user_id: this.props.usuario.id, description: "", cost_center_id: this.props.cost_center.id,
      },
    };

    this.columns = [
      { key: "customer_name", label: "Cliente", render: (r) => r.cost_center && r.cost_center.customer ? r.cost_center.customer.name : "" },
      { key: "created_date", label: "Fecha Orden" },
      { key: "order_number", label: "Número" },
      { key: "order_value", label: "Valor", render: (r) => <NumberFormat value={r.order_value} displayType="text" thousandSeparator={true} prefix="$" /> },
      { key: "sum_invoices", label: "Total Facturas", render: (r) => <NumberFormat value={r.sum_invoices} displayType="text" thousandSeparator={true} prefix="$" /> },
      { key: "description", label: "Descripción" },
      { key: "invoiced_state", label: "Estado CC", render: (r) => r.cost_center ? r.cost_center.invoiced_state : "" },
      { key: "order_file", label: "Archivo", sortable: false, render: (r) => r.order_file && r.order_file.url ? <a href={r.order_file.url} target="_blank" className="cm-btn cm-btn-outline cm-btn-sm"><i className="fas fa-download" /></a> : <i className="fas fa-times" style={{ color: "#ccc" }} /> },
    ];
  }

  componentDidMount() { this.loadData(); }

  loadData = () => {
    this.setState({ loading: true });
    fetch("/getValues/" + this.props.cost_center.id)
      .then((r) => r.json())
      .then((data) => { this.setState({ data: data.dataSalesOrdes || [], loading: false }); });
  };

  HandleChange = (e) => { this.setState({ form: Object.assign({}, this.state.form, { [e.target.name]: e.target.value }) }); };

  handleFileOrderFile = (e) => { this.setState({ form: Object.assign({}, this.state.form, { order_file: e.target.files[0] }) }); };

  toogle = (from) => {
    if (from === "new") { this.setState({ modal: true }); this.clearValues(); }
    else { this.setState({ modal: false }); this.clearValues(); }
  };

  toogleIndexInvoice = (from, sales_order) => {
    if (from === "new") { this.setState({ modalIndexInvoice: true, sales_order: sales_order }); }
    else { this.setState({ modalIndexInvoice: false, sales_order: {} }); }
  };

  clearValues = () => {
    this.setState({ modeEdit: false, ErrorValues: true, purchase_order_id: "", form: Object.assign({}, this.state.form, { created_date: "", order_number: "", order_value: "", order_file: {}, description: "" }) });
  };

  edit = (order) => {
    this.setState({
      modal: true, purchase_order_id: order.id,
      form: Object.assign({}, this.state.form, { created_date: order.created_date, order_number: order.order_number, order_value: order.order_value, description: order.description }),
    });
  };

  HandleClick = () => {
    var self = this;
    var formData = new FormData();
    formData.append("created_date", this.state.form.created_date);
    formData.append("order_number", this.state.form.order_number);
    formData.append("order_value", this.state.form.order_value);
    formData.append("order_file", this.state.form.order_file);
    formData.append("user_id", this.props.usuario.id);
    formData.append("cost_center_id", this.props.cost_center.id);
    formData.append("description", this.state.form.description);

    var url = this.state.purchase_order_id ? "/sales_orders/" + this.state.purchase_order_id : "/sales_orders";
    var method = this.state.purchase_order_id ? "PATCH" : "POST";
    fetch(url, { method: method, body: formData, headers: { "X-CSRF-Token": csrfToken() } })
      .then((r) => r.json())
      .then(() => { self.setState({ modal: false }); self.loadData(); self.clearValues(); });
  };

  delete = (id) => {
    Swal.fire({ title: "¿Estás seguro?", text: "La orden será eliminada permanentemente", icon: "warning", showCancelButton: true, confirmButtonColor: "#2a3f53", cancelButtonColor: "#dc3545", confirmButtonText: "Sí, eliminar", cancelButtonText: "Cancelar" })
      .then((result) => {
        if (result.value) {
          fetch("/sales_orders/" + id, { method: "delete", headers: { "X-CSRF-Token": csrfToken(), "Content-Type": "application/json" } })
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
            titulo={this.state.purchase_order_id ? "Actualizar" : "Crear"}
            nameSubmit={this.state.purchase_order_id ? "Actualizar" : "Crear"}
            errorValues={this.state.ErrorValues} modeEdit={!!this.state.purchase_order_id}
            onChangehandleFileOrderFile={this.handleFileOrderFile} cost_center_id={this.props.cost_center.id}
          />
        )}
        {this.state.modalIndexInvoice && (
          <IndexInvoice toggle={this.toogleIndexInvoice} backdrop="static" modal={this.state.modalIndexInvoice} sales_order={this.state.sales_order} loadData={this.loadData} />
        )}
        <CmDataTable
          columns={this.columns} data={this.state.data} loading={this.state.loading}
          actions={this.renderActions} stickyActions
          searchPlaceholder="Buscar orden..." emptyMessage="No hay órdenes de compra"
          headerActions={this.props.estados.cost_center_edit ? <button className="cm-btn cm-btn-accent cm-btn-sm" onClick={() => this.toogle("new")}><i className="fas fa-plus" /> Nueva Orden</button> : null}
          emptyAction={this.props.estados.cost_center_edit ? <button onClick={() => this.toogle("new")} className="cm-btn cm-btn-accent cm-btn-sm" style={{ marginTop: "8px" }}><i className="fas fa-plus" /> Nueva Orden</button> : null}
        />
      </React.Fragment>
    );
  }
}

export default OrdenesDeCompraTable;
