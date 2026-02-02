import React, { Component } from "react";
import NumberFormat from "react-number-format";
import Swal from "sweetalert2/dist/sweetalert2.js";
import { CmModal, CmButton } from "../../generalcomponents/ui";

function csrfToken() {
  var meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}

var EMPTY_INVOICE = {
  invoice_date: "",
  invoice_value: "",
  number_invoice: "",
  delivery_certificate_file: {},
  reception_report_file: {},
  engineering_value: "",
};

var styles = {
  tableWrap: {
    overflowX: "auto",
    borderRadius: 10,
    border: "1px solid #e2e5ea",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
    fontFamily: "'Poppins', sans-serif",
  },
  th: {
    padding: "10px 14px",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: "#5a6a7e",
    background: "#f4f5f8",
    borderBottom: "2px solid #e2e5ea",
    whiteSpace: "nowrap",
    textAlign: "left",
  },
  thCenter: {
    padding: "10px 14px",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: "#5a6a7e",
    background: "#f4f5f8",
    borderBottom: "2px solid #e2e5ea",
    whiteSpace: "nowrap",
    textAlign: "center",
  },
  td: {
    padding: "10px 14px",
    borderBottom: "1px solid #f0f1f3",
    color: "#333",
    verticalAlign: "middle",
  },
  tdCenter: {
    padding: "10px 14px",
    borderBottom: "1px solid #f0f1f3",
    color: "#333",
    verticalAlign: "middle",
    textAlign: "center",
  },
  actionBtns: {
    display: "flex",
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  actionBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 30,
    border: "none",
    borderRadius: 6,
    background: "#eef0f4",
    color: "#5a6a7e",
    fontSize: 12,
    cursor: "pointer",
  },
  actionBtnDanger: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 30,
    border: "none",
    borderRadius: 6,
    background: "rgba(220,53,69,0.08)",
    color: "#dc3545",
    fontSize: 12,
    cursor: "pointer",
  },
  downloadLink: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: 6,
    color: "#2a9d8f",
    fontSize: 14,
  },
  formPanel: {
    background: "#f8f9fb",
    border: "1px solid #e8eaef",
    borderRadius: 10,
    padding: "16px 16px 12px",
    marginBottom: 20,
  },
  formHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottom: "1px solid #e8eaef",
  },
  formLabel: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#5a6a7e",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
};

class IndexInvoice extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoaded: true,
      showForm: false,
      customer_invoice_id: "",
      data: [],
      saving: false,
      form: Object.assign({}, EMPTY_INVOICE, {
        sales_order_id: props.sales_order.id,
        cost_center_id: props.sales_order.cost_center_id,
      }),
    };
  }

  componentDidMount() {
    this.loadData();
  }

  loadData = () => {
    fetch("/get_sales_order_invoice/" + this.props.sales_order.id, {
      method: "GET",
      headers: {
        "X-CSRF-Token": csrfToken(),
        "Content-Type": "application/json",
      },
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        this.setState({ data: data.sales_orders, isLoaded: false });
      }.bind(this));
  };

  clearForm = () => {
    this.setState({
      customer_invoice_id: "",
      form: Object.assign({}, EMPTY_INVOICE, {
        sales_order_id: this.props.sales_order.id,
        cost_center_id: this.props.sales_order.cost_center_id,
      }),
    });
  };

  handleChange = (e) => {
    var form = Object.assign({}, this.state.form);
    form[e.target.name] = e.target.value;
    this.setState({ form: form });
  };

  handleChangeFile = (e) => {
    var form = Object.assign({}, this.state.form);
    form[e.target.name] = e.target.files[0];
    this.setState({ form: form });
  };

  toggleForm = () => {
    if (this.state.showForm) {
      this.clearForm();
    }
    this.setState({ showForm: !this.state.showForm });
  };

  handleSubmit = () => {
    var formData = new FormData();
    formData.append("sales_order_id", this.props.sales_order.id);
    formData.append("invoice_date", this.state.form.invoice_date);
    formData.append("invoice_value", this.state.form.invoice_value);
    formData.append("number_invoice", this.state.form.number_invoice);
    formData.append("delivery_certificate_file", this.state.form.delivery_certificate_file);
    formData.append("reception_report_file", this.state.form.reception_report_file);
    formData.append("cost_center_id", this.state.form.cost_center_id);
    formData.append("engineering_value", this.state.form.engineering_value);

    var isEdit = !!this.state.customer_invoice_id;
    var url = isEdit ? "/customer_invoices/" + this.state.customer_invoice_id : "/customer_invoices";
    var method = isEdit ? "PATCH" : "POST";

    this.setState({ saving: true });

    fetch(url, { method: method, body: formData, headers: { "X-CSRF-Token": csrfToken() } })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        this.props.loadData();
        this.loadData();
        this.setState({ showForm: false, saving: false });
        this.clearForm();
        Swal.fire({
          position: "center",
          type: "success",
          title: isEdit ? "Factura actualizada" : "Factura creada",
          showConfirmButton: false,
          timer: 1500,
        });
      }.bind(this))
      .catch(function(err) {
        console.error("Error:", err);
        this.setState({ saving: false });
      }.bind(this));
  };

  handleEdit = (invoice) => {
    this.setState({
      customer_invoice_id: invoice.id,
      showForm: true,
      form: Object.assign({}, this.state.form, {
        invoice_date: invoice.invoice_date || "",
        invoice_value: invoice.invoice_value || "",
        number_invoice: invoice.number_invoice || "",
        delivery_certificate_file: invoice.delivery_certificate_file || {},
        reception_report_file: invoice.reception_report_file || {},
        engineering_value: invoice.engineering_value || "",
      }),
    });
  };

  handleDelete = (id) => {
    Swal.fire({
      title: "¿Estás seguro?",
      text: "La factura será eliminada permanentemente",
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#2a3f53",
      cancelButtonColor: "#dc3545",
      confirmButtonText: "Si, eliminar",
      cancelButtonText: "Cancelar",
    }).then(function(result) {
      if (result.value) {
        fetch("/customer_invoices/" + id, {
          method: "delete",
          headers: { "X-CSRF-Token": csrfToken(), "Content-Type": "application/json" },
        })
          .then(function(r) { return r.json(); })
          .then(function() {
            this.props.loadData();
            this.setState({ data: this.state.data.filter(function(e) { return e.id !== id; }) });
            Swal.fire("Eliminado", "La factura fue eliminada", "success");
          }.bind(this));
      }
    }.bind(this));
  };

  renderForm = () => {
    var f = this.state.form;
    var isEdit = !!this.state.customer_invoice_id;

    return (
      <div style={styles.formPanel}>
        <div style={styles.formHeader}>
          <h6 style={{ margin: 0, fontWeight: 600, color: "#2a3f54" }}>
            <i className={isEdit ? "fas fa-pen" : "fas fa-plus"} style={{ marginRight: 8 }} />
            {isEdit ? "Editar Factura" : "Nueva Factura"}
          </h6>
          <button className="cm-btn cm-btn-outline cm-btn-sm" onClick={this.toggleForm} style={{ padding: "4px 12px" }}>
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="row" style={{ padding: "0 4px" }}>
          <div className="col-md-6 mb-3">
            <label style={styles.formLabel}>Fecha de Factura</label>
            <input type="date" name="invoice_date" className="form form-control" value={f.invoice_date} onChange={this.handleChange} />
          </div>
          <div className="col-md-6 mb-3">
            <label style={styles.formLabel}>Valor</label>
            <NumberFormat name="invoice_value" thousandSeparator={true} prefix={"$"} className="form form-control" value={f.invoice_value} onChange={this.handleChange} placeholder="$0" />
          </div>
          <div className="col-md-6 mb-3">
            <label style={styles.formLabel}>Valor de ingeniería</label>
            <NumberFormat name="engineering_value" thousandSeparator={true} prefix={"$"} className="form form-control" value={f.engineering_value} onChange={this.handleChange} placeholder="$0" />
          </div>
          <div className="col-md-6 mb-3">
            <label style={styles.formLabel}>Numero de factura</label>
            <input type="text" name="number_invoice" className="form form-control" value={f.number_invoice} onChange={this.handleChange} placeholder="Ej: FAC-001" />
          </div>
          <div className="col-md-6 mb-3">
            <label style={styles.formLabel}>Certificado de entrega</label>
            <input type="file" name="delivery_certificate_file" className="form form-control" onChange={this.handleChangeFile} />
          </div>
          <div className="col-md-6 mb-3">
            <label style={styles.formLabel}>Informe de recepción</label>
            <input type="file" name="reception_report_file" className="form form-control" onChange={this.handleChangeFile} />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "0 4px", marginTop: 4 }}>
          <CmButton variant="outline" onClick={this.toggleForm}>Cancelar</CmButton>
          <CmButton variant="accent" onClick={this.handleSubmit} disabled={this.state.saving}>
            {this.state.saving
              ? <React.Fragment><i className="fas fa-spinner fa-spin" /> Guardando...</React.Fragment>
              : <React.Fragment><i className="fas fa-save" /> {isEdit ? "Actualizar" : "Crear"}</React.Fragment>
            }
          </CmButton>
        </div>
      </div>
    );
  };

  renderTable = () => {
    var data = this.state.data;

    if (data.length === 0) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px", textAlign: "center" }}>
          <i className="fas fa-file-invoice" style={{ fontSize: 36, color: "#d0d4db", marginBottom: 10 }} />
          <p style={{ color: "#999", margin: 0, fontSize: 14 }}>No hay facturas registradas</p>
        </div>
      );
    }

    return (
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={Object.assign({}, styles.thCenter, { width: 80 })}></th>
              <th style={styles.th}>Fecha</th>
              <th style={styles.th}>Valor</th>
              <th style={styles.th}>Ingeniería</th>
              <th style={styles.th}># Factura</th>
              <th style={Object.assign({}, styles.thCenter, { width: 100 })}>Cert. Entrega</th>
              <th style={Object.assign({}, styles.thCenter, { width: 100 })}>Inf. Recepción</th>
            </tr>
          </thead>
          <tbody>
            {data.map(function(inv) {
              return (
                <tr key={inv.id} style={{ transition: "background 0.15s" }} onMouseEnter={function(e) { e.currentTarget.style.background = "#f9fafb"; }} onMouseLeave={function(e) { e.currentTarget.style.background = ""; }}>
                  <td style={styles.tdCenter}>
                    <div style={styles.actionBtns}>
                      <button style={styles.actionBtn} onClick={this.handleEdit.bind(this, inv)} title="Editar">
                        <i className="fas fa-pen" />
                      </button>
                      <button style={styles.actionBtnDanger} onClick={this.handleDelete.bind(this, inv.id)} title="Eliminar">
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  </td>
                  <td style={styles.td}>{inv.invoice_date}</td>
                  <td style={styles.td}>
                    <NumberFormat value={inv.invoice_value} displayType="text" thousandSeparator={true} prefix="$" />
                  </td>
                  <td style={styles.td}>
                    <NumberFormat value={inv.engineering_value} displayType="text" thousandSeparator={true} prefix="$" />
                  </td>
                  <td style={styles.td}>{inv.number_invoice}</td>
                  <td style={styles.tdCenter}>
                    {inv.delivery_certificate_file && inv.delivery_certificate_file.url ? (
                      <a href={inv.delivery_certificate_file.url} target="_blank" style={styles.downloadLink}>
                        <i className="fas fa-download" />
                      </a>
                    ) : (
                      <i className="fas fa-times" style={{ color: "#d0d4db" }} />
                    )}
                  </td>
                  <td style={styles.tdCenter}>
                    {inv.reception_report_file && inv.reception_report_file.url ? (
                      <a href={inv.reception_report_file.url} target="_blank" style={styles.downloadLink}>
                        <i className="fas fa-download" />
                      </a>
                    ) : (
                      <i className="fas fa-times" style={{ color: "#d0d4db" }} />
                    )}
                  </td>
                </tr>
              );
            }.bind(this))}
          </tbody>
        </table>
      </div>
    );
  };

  render() {
    var orderNum = this.props.sales_order.order_number || "";

    return (
      <CmModal
        isOpen={this.props.modal}
        toggle={this.props.toggle}
        title={
          <span>
            <i className="fas fa-file-invoice" style={{ marginRight: 8 }} />
            Facturas
            {orderNum ? <span style={{ fontWeight: 400, fontSize: 14, marginLeft: 8, opacity: 0.7 }}>— OC {orderNum}</span> : null}
          </span>
        }
        size="lg"
        footer={
          <React.Fragment>
            {!this.state.showForm && (
              <CmButton variant="accent" onClick={this.toggleForm}>
                <i className="fas fa-plus" /> Nueva Factura
              </CmButton>
            )}
            <CmButton variant="outline" onClick={this.props.toggle}>Cerrar</CmButton>
          </React.Fragment>
        }
      >
        {this.state.showForm && this.renderForm()}
        {this.state.isLoaded ? (
          <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: 24 }} />
            <p style={{ marginTop: 8 }}>Cargando facturas...</p>
          </div>
        ) : (
          this.renderTable()
        )}
      </CmModal>
    );
  }
}

export default IndexInvoice;
