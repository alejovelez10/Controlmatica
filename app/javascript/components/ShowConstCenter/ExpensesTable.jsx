import React, { Component } from 'react';
import NumberFormat from "react-number-format";
import Swal from "sweetalert2/dist/sweetalert2.js";
import FormCreate from '../ReportExpense/FormCreate';
import { CmDataTable } from '../../generalcomponents/ui';

function csrfToken() {
  var meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}

class ExpensesTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      modal: false,
      modeEdit: false,
      ErrorValues: true,
      id: "",
      data: [],
      loading: true,
      report_expense_options_type: [],
      report_expense_options_payment: [],
      formCreate: {
        cost_center_id: this.props.cost_center.id,
        user_invoice_id: this.props.usuario.id,
        invoice_name: "", invoice_date: "", description: "", invoice_number: "",
        identification: "", invoice_type: "", invoice_value: "", invoice_tax: "",
        invoice_total: "", type_identification_id: "", payment_type_id: "",
      },
      selectedOptionCostCenter: { cost_center_id: "", label: "Centro de costo" },
      selectedOptionUser: { user_invoice_id: this.props.usuario.id, label: this.props.usuario.names },
      selectedOptionTypeIndentification: { type_identification_id: "", label: "" },
      selectedOptionPaymentType: { payment_type_id: "", label: "" },
    };

    this.columns = [
      { key: "user_invoice_name", label: "Responsable", render: (r) => r.user_invoice ? r.user_invoice.name : "" },
      { key: "invoice_name", label: "Nombre" },
      { key: "invoice_date", label: "Fecha factura" },
      { key: "identification", label: "NIT / Cédula" },
      { key: "description", label: "Descripción" },
      { key: "invoice_number", label: "# Factura" },
      { key: "type_identification_name", label: "Tipo", render: (r) => r.type_identification ? r.type_identification.name : "" },
      { key: "payment_type_name", label: "Medio pago", render: (r) => r.payment_type ? r.payment_type.name : "" },
      { key: "invoice_value", label: "Valor", render: (r) => <NumberFormat value={r.invoice_value} displayType="text" thousandSeparator={true} prefix="$" /> },
      { key: "invoice_tax", label: "IVA", render: (r) => <NumberFormat value={r.invoice_tax} displayType="text" thousandSeparator={true} prefix="$" /> },
      { key: "invoice_total", label: "Total", render: (r) => <NumberFormat value={r.invoice_total} displayType="text" thousandSeparator={true} prefix="$" /> },
      { key: "is_acepted", label: "Estado", render: (r) => r.is_acepted ? "Aceptado" : "Creado" },
    ];
  }

  componentDidMount() {
    this.configSelect();
    this.loadData();
  }

  configSelect = () => {
    var type = [], payment = [];
    if (this.props.report_expense_options) {
      this.props.report_expense_options.filter((i) => i.category === "Tipo").forEach((i) => { type.push({ label: i.name, value: i.id }); });
      this.props.report_expense_options.filter((i) => i.category === "Medio de pago").forEach((i) => { payment.push({ label: i.name, value: i.id }); });
    }
    this.setState({ report_expense_options_type: type, report_expense_options_payment: payment });
  };

  loadData = () => {
    this.setState({ loading: true });
    fetch("/get_cost_center_report_expenses/" + this.props.cost_center.id)
      .then((r) => r.json())
      .then((data) => { this.setState({ data: data.data, loading: false }); });
  };

  toogle = (from) => {
    if (from === "new") { this.setState({ modal: true }); }
    else { this.setState({ modal: false }); this.clearValues(); }
  };

  clearValues = () => {
    this.setState({
      modeEdit: false, ErrorValues: true,
      formCreate: Object.assign({}, this.state.formCreate, {
        invoice_name: "", invoice_date: "", identification: "", description: "",
        invoice_number: "", invoice_type: "", invoice_value: "", invoice_tax: "",
        invoice_total: "", type_identification_id: "", payment_type_id: "",
        cost_center_id: this.props.cost_center.id, user_invoice_id: this.props.usuario.id,
      }),
      selectedOptionCostCenter: { cost_center_id: "", label: "Centro de costo" },
      selectedOptionUser: { user_invoice_id: this.props.usuario.id, label: this.props.usuario.names },
      selectedOptionTypeIndentification: { type_identification_id: "", label: "" },
      selectedOptionPaymentType: { payment_type_id: "", label: "" },
    });
  };

  edit = (row) => {
    this.setState({
      modeEdit: true, modal: true, id: row.id,
      formCreate: Object.assign({}, this.state.formCreate, {
        cost_center_id: row.cost_center ? row.cost_center.id : "",
        user_invoice_id: row.user_invoice ? row.user_invoice.id : "",
        invoice_name: row.invoice_name, invoice_date: row.invoice_date,
        identification: row.identification, description: row.description,
        invoice_number: row.invoice_number, invoice_type: row.invoice_type,
        payment_type: row.payment_type, invoice_value: row.invoice_value,
        invoice_tax: row.invoice_tax, invoice_total: row.invoice_total,
        type_identification_id: row.type_identification_id, payment_type_id: row.payment_type_id,
      }),
      selectedOptionTypeIndentification: { type_identification_id: row.type_identification ? String(row.type_identification.id) : "", label: row.type_identification ? row.type_identification.name : "" },
      selectedOptionPaymentType: { payment_type_id: row.payment_type ? String(row.payment_type.id) : "", label: row.payment_type ? row.payment_type.name : "" },
      selectedOptionCostCenter: { cost_center_id: row.cost_center ? String(row.cost_center.id) : "", label: row.cost_center ? row.cost_center.code : "Centro de costo" },
      selectedOptionUser: { user_invoice_id: row.user_invoice ? String(row.user_invoice.id) : "", label: row.user_invoice ? row.user_invoice.name : "Usuario" },
    });
  };

  HandleChange = (e) => { this.setState({ formCreate: Object.assign({}, this.state.formCreate, { [e.target.name]: e.target.value }) }); };
  HandleChangeMoney = (e) => {
    var value = e.target.value.replace(/[$,]/g, '');
    this.setState({ formCreate: Object.assign({}, this.state.formCreate, { [e.target.name]: value }) }, () => {
      var total = Number(this.state.formCreate.invoice_value) + Number(this.state.formCreate.invoice_tax);
      this.setState({ formCreate: Object.assign({}, this.state.formCreate, { invoice_total: total }) });
    });
  };

  handleChangeAutocompleteCostCenter = (opt) => { this.setState({ selectedOptionCostCenter: opt, formCreate: Object.assign({}, this.state.formCreate, { cost_center_id: opt.value }) }); };
  handleChangeAutocompleteUser = (opt) => { this.setState({ selectedOptionUser: opt, formCreate: Object.assign({}, this.state.formCreate, { user_invoice_id: opt.value }) }); };
  handleChangeAutocompleteReportExpenceOptionType = (opt) => { this.setState({ selectedOptionTypeIndentification: opt, formCreate: Object.assign({}, this.state.formCreate, { type_identification_id: opt.value }) }); };
  handleChangeAutocompleteReportExpenceOptionPaymentType = (opt) => { this.setState({ selectedOptionPaymentType: opt, formCreate: Object.assign({}, this.state.formCreate, { payment_type_id: opt.value }) }); };

  HandleClick = () => {
    var self = this;
    var url = this.state.modeEdit ? "/report_expenses/" + this.state.id : "/report_expenses";
    var method = this.state.modeEdit ? "PATCH" : "POST";
    fetch(url, { method: method, body: JSON.stringify(this.state.formCreate), headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() } })
      .then((r) => r.json())
      .then((data) => {
        self.setState({ modal: false });
        self.loadData();
        self.clearValues();
        Swal.fire({ position: "center", type: "success", title: data.success || "Guardado", showConfirmButton: false, timer: 1500 });
      });
  };

  delete = (id) => {
    Swal.fire({ title: "¿Estás seguro?", text: "El gasto será eliminado permanentemente", type: "warning", showCancelButton: true, confirmButtonColor: "#2a3f53", cancelButtonColor: "#dc3545", confirmButtonText: "Sí, eliminar", cancelButtonText: "Cancelar" })
      .then((result) => {
        if (result.value) {
          fetch("/report_expenses/" + id, { method: "delete", headers: { "X-CSRF-Token": csrfToken(), "Content-Type": "application/json" } })
            .then((r) => r.json())
            .then(() => { this.loadData(); Swal.fire("Eliminado", "El gasto fue eliminado", "success"); });
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
            backdrop="static" modal={this.state.modal} toggle={this.toogle}
            title={this.state.modeEdit ? "Actualizar Gasto" : "Crear Gasto"}
            nameBnt={this.state.modeEdit ? "Actualizar" : "Añadir"}
            formValues={this.state.formCreate} submitForm={this.HandleClick}
            onChangeForm={this.HandleChange} onChangeFormMoney={this.HandleChangeMoney}
            errorValues={this.state.ErrorValues} estados={{ closed: true, create: true, delete: true, edit: true, export: true, show_user: true }}
            current_user={this.props.usuario}
            handleChangeAutocompleteCostCenter={this.handleChangeAutocompleteCostCenter} selectedOptionCostCenter={this.state.selectedOptionCostCenter}
            handleChangeAutocompleteUser={this.handleChangeAutocompleteUser} selectedOptionUser={this.state.selectedOptionUser} users={this.props.users}
            selectedOptionTypeIndentification={this.state.selectedOptionTypeIndentification}
            handleChangeAutocompleteReportExpenceOptionType={this.handleChangeAutocompleteReportExpenceOptionType}
            report_expense_options_type={this.state.report_expense_options_type}
            selectedOptionPaymentType={this.state.selectedOptionPaymentType}
            handleChangeAutocompleteReportExpenceOptionPaymentType={this.handleChangeAutocompleteReportExpenceOptionPaymentType}
            report_expense_options_payment={this.state.report_expense_options_payment}
            cost_center_id={this.props.cost_center.id}
          />
        )}
        <CmDataTable
          columns={this.columns} data={this.state.data} loading={this.state.loading}
          actions={this.renderActions} stickyActions
          searchPlaceholder="Buscar gasto..." emptyMessage="No hay gastos registrados"
          headerActions={this.props.estados.cost_center_edit ? <button className="cm-btn cm-btn-accent cm-btn-sm" onClick={() => this.toogle("new")}><i className="fas fa-plus" /> Nuevo Gasto</button> : null}
          emptyAction={this.props.estados.cost_center_edit ? <button onClick={() => this.toogle("new")} className="cm-btn cm-btn-accent cm-btn-sm" style={{ marginTop: "8px" }}><i className="fas fa-plus" /> Nuevo Gasto</button> : null}
        />
      </React.Fragment>
    );
  }
}

export default ExpensesTable;
