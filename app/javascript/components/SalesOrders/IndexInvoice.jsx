import React, { Component } from "react";
import NumberFormat from "react-number-format";
import Swal from "sweetalert2";
import { CmModal } from "../../generalcomponents/ui";

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

var tableStyles = {
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
          icon: "success",
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
      icon: "warning",
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
            Swal.fire({ title: "Eliminado", text: "La factura fue eliminada", icon: "success", confirmButtonColor: "#2a3f53" });
          }.bind(this));
      }
    }.bind(this));
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
    var close = function(ev) {
      if (!menu.contains(ev.target) && !btn.contains(ev.target)) {
        menu.classList.remove('open');
        btn.parentNode.appendChild(menu);
        document.removeEventListener('click', close);
      }
    };
    document.addEventListener('click', close);
  };

  renderForm = () => {
    var f = this.state.form;
    var isEdit = !!this.state.customer_invoice_id;

    var inputStyle = {
      width: "100%",
      padding: "10px 14px",
      border: "1px solid #e2e5ea",
      borderRadius: "8px",
      fontSize: "14px",
      background: "#fcfcfd",
      outline: "none",
      boxSizing: "border-box",
    };

    var labelStyle = {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginBottom: "6px",
      fontSize: "14px",
      fontWeight: 500,
      color: "#374151",
    };

    var labelIconStyle = { color: "#6b7280", fontSize: "12px" };

    return (
      <div style={{
        background: "#fff",
        border: "1px solid #e2e5ea",
        borderRadius: "12px",
        marginBottom: "20px",
        overflow: "hidden",
      }}>
        {/* Form Header */}
        <div style={{
          background: "#fcfcfd",
          padding: "16px 20px",
          borderBottom: "1px solid #e9ecef",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "36px",
              height: "36px",
              background: "linear-gradient(135deg, #f5a623 0%, #f7b731 100%)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(245, 166, 35, 0.3)",
            }}>
              <i className={isEdit ? "fas fa-pen" : "fas fa-plus"} style={{ color: "#fff", fontSize: "14px" }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#333" }}>
                {isEdit ? "Editar Factura" : "Nueva Factura"}
              </h3>
              <p style={{ margin: 0, fontSize: "11px", color: "#6c757d" }}>
                {isEdit ? "Modifique los datos de la factura" : "Complete los datos de la nueva factura"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={this.toggleForm}
            style={{
              width: "28px",
              height: "28px",
              border: "none",
              background: "#e9ecef",
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#6c757d",
              transition: "all 0.2s",
            }}
            onMouseOver={function(e) { e.currentTarget.style.background = "#dc3545"; e.currentTarget.style.color = "#fff"; }}
            onMouseOut={function(e) { e.currentTarget.style.background = "#e9ecef"; e.currentTarget.style.color = "#6c757d"; }}
          >
            <i className="fas fa-times" style={{ fontSize: "12px" }} />
          </button>
        </div>

        {/* Form Content */}
        <div style={{ padding: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={labelStyle}>
                <i className="fa fa-calendar-alt" style={labelIconStyle} />
                Fecha de Factura
              </label>
              <input
                type="date"
                name="invoice_date"
                value={f.invoice_date}
                onChange={this.handleChange}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>
                <i className="fa fa-dollar-sign" style={labelIconStyle} />
                Valor
              </label>
              <NumberFormat
                name="invoice_value"
                thousandSeparator={true}
                prefix={"$"}
                value={f.invoice_value}
                onChange={this.handleChange}
                placeholder="$0"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>
                <i className="fa fa-calculator" style={labelIconStyle} />
                Valor de Ingeniería
              </label>
              <NumberFormat
                name="engineering_value"
                thousandSeparator={true}
                prefix={"$"}
                value={f.engineering_value}
                onChange={this.handleChange}
                placeholder="$0"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>
                <i className="fa fa-hashtag" style={labelIconStyle} />
                Número de Factura
              </label>
              <input
                type="text"
                name="number_invoice"
                value={f.number_invoice}
                onChange={this.handleChange}
                placeholder="Ej: FAC-001"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>
                <i className="fa fa-file-certificate" style={labelIconStyle} />
                Certificado de Entrega
              </label>
              <input
                type="file"
                name="delivery_certificate_file"
                onChange={this.handleChangeFile}
                style={Object.assign({}, inputStyle, { padding: "8px 14px", cursor: "pointer" })}
              />
            </div>
            <div>
              <label style={labelStyle}>
                <i className="fa fa-file-alt" style={labelIconStyle} />
                Informe de Recepción
              </label>
              <input
                type="file"
                name="reception_report_file"
                onChange={this.handleChangeFile}
                style={Object.assign({}, inputStyle, { padding: "8px 14px", cursor: "pointer" })}
              />
            </div>
          </div>
        </div>

        {/* Form Footer */}
        <div style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "12px",
          padding: "16px 20px",
          background: "#fcfcfd",
          borderTop: "1px solid #e9ecef",
        }}>
          <button
            type="button"
            onClick={this.toggleForm}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: 500,
              borderRadius: "8px",
              cursor: "pointer",
              border: "1px solid #dee2e6",
              background: "#fff",
              color: "#6c757d",
            }}
          >
            <i className="fas fa-times" /> Cancelar
          </button>
          <button
            type="button"
            onClick={this.handleSubmit}
            disabled={this.state.saving}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: 500,
              borderRadius: "8px",
              cursor: this.state.saving ? "not-allowed" : "pointer",
              border: "none",
              background: "linear-gradient(135deg, #f5a623 0%, #f7b731 100%)",
              color: "#fff",
              opacity: this.state.saving ? 0.7 : 1,
            }}
          >
            {this.state.saving
              ? <React.Fragment><i className="fas fa-spinner fa-spin" /> Guardando...</React.Fragment>
              : <React.Fragment><i className="fas fa-save" /> {isEdit ? "Actualizar" : "Crear"}</React.Fragment>
            }
          </button>
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
      <div style={tableStyles.tableWrap}>
        <table style={tableStyles.table}>
          <thead>
            <tr>
              <th style={Object.assign({}, tableStyles.thCenter, { width: 80 })}></th>
              <th style={tableStyles.th}>Fecha</th>
              <th style={tableStyles.th}>Valor</th>
              <th style={tableStyles.th}>Ingeniería</th>
              <th style={tableStyles.th}># Factura</th>
              <th style={Object.assign({}, tableStyles.thCenter, { width: 100 })}>Cert. Entrega</th>
              <th style={Object.assign({}, tableStyles.thCenter, { width: 100 })}>Inf. Recepción</th>
            </tr>
          </thead>
          <tbody>
            {data.map(function(inv) {
              return (
                <tr key={inv.id} style={{ transition: "background 0.15s" }} onMouseEnter={function(e) { e.currentTarget.style.background = "#f9fafb"; }} onMouseLeave={function(e) { e.currentTarget.style.background = ""; }}>
                  <td style={tableStyles.tdCenter}>
                    <div className="cm-dt-menu">
                      <button className="cm-dt-menu-trigger" onClick={this.openMenu}>
                        <i className="fas fa-ellipsis-v" />
                      </button>
                      <div className="cm-dt-menu-dropdown">
                        <button onClick={this.handleEdit.bind(this, inv)} className="cm-dt-menu-item">
                          <i className="fas fa-pen" /> Editar
                        </button>
                        <button onClick={this.handleDelete.bind(this, inv.id)} className="cm-dt-menu-item cm-dt-menu-item--danger">
                          <i className="fas fa-trash" /> Eliminar
                        </button>
                      </div>
                    </div>
                  </td>
                  <td style={tableStyles.td}>{inv.invoice_date}</td>
                  <td style={tableStyles.td}>
                    <NumberFormat value={inv.invoice_value} displayType="text" thousandSeparator={true} prefix="$" />
                  </td>
                  <td style={tableStyles.td}>
                    <NumberFormat value={inv.engineering_value} displayType="text" thousandSeparator={true} prefix="$" />
                  </td>
                  <td style={tableStyles.td}>{inv.number_invoice}</td>
                  <td style={tableStyles.tdCenter}>
                    {inv.delivery_certificate_file && inv.delivery_certificate_file.url ? (
                      <a href={inv.delivery_certificate_file.url} target="_blank" style={tableStyles.downloadLink}>
                        <i className="fas fa-download" />
                      </a>
                    ) : (
                      <i className="fas fa-times" style={{ color: "#d0d4db" }} />
                    )}
                  </td>
                  <td style={tableStyles.tdCenter}>
                    {inv.reception_report_file && inv.reception_report_file.url ? (
                      <a href={inv.reception_report_file.url} target="_blank" style={tableStyles.downloadLink}>
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
        size="lg"
        footer={null}
        hideHeader={true}
      >
        <div style={{
          margin: "-20px -24px -24px -24px",
          display: "flex",
          flexDirection: "column",
          maxHeight: "85vh",
        }}>
          {/* Header */}
          <div style={{
            background: "#fcfcfd",
            padding: "20px 32px",
            borderBottom: "1px solid #e9ecef",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{
                width: "48px",
                height: "48px",
                background: "linear-gradient(135deg, #f5a623 0%, #f7b731 100%)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(245, 166, 35, 0.3)",
              }}>
                <i className="fas fa-file-invoice-dollar" style={{ color: "#fff", fontSize: "20px" }} />
              </div>
              <div>
                <h2 style={{ margin: "0 0 2px 0", fontSize: "18px", fontWeight: 600, color: "#333" }}>
                  Facturas
                </h2>
                <p style={{ margin: 0, fontSize: "12px", color: "#6c757d" }}>
                  {orderNum ? "OC " + orderNum : "Gestión de facturas de la orden"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={this.props.toggle}
              style={{
                width: "32px",
                height: "32px",
                border: "none",
                background: "#e9ecef",
                borderRadius: "50%",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6c757d",
                transition: "all 0.2s",
              }}
              onMouseOver={function(e) { e.currentTarget.style.background = "#dc3545"; e.currentTarget.style.color = "#fff"; }}
              onMouseOut={function(e) { e.currentTarget.style.background = "#e9ecef"; e.currentTarget.style.color = "#6c757d"; }}
            >
              <i className="fas fa-times" />
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: "24px 32px", flex: 1, overflowY: "auto" }}>
            {this.state.showForm && this.renderForm()}
            {this.state.isLoaded ? (
              <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: 24 }} />
                <p style={{ marginTop: 8 }}>Cargando facturas...</p>
              </div>
            ) : (
              this.renderTable()
            )}
          </div>

          {/* Footer */}
          <div style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            padding: "16px 32px",
            background: "#fcfcfd",
            borderTop: "1px solid #e9ecef",
            flexShrink: 0,
          }}>
            {!this.state.showForm && (
              <button
                type="button"
                onClick={this.toggleForm}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 20px",
                  fontSize: "14px",
                  fontWeight: 500,
                  borderRadius: "8px",
                  cursor: "pointer",
                  border: "none",
                  background: "linear-gradient(135deg, #f5a623 0%, #f7b731 100%)",
                  color: "#fff",
                }}
              >
                <i className="fas fa-plus" /> Nueva Factura
              </button>
            )}
            <button
              type="button"
              onClick={this.props.toggle}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: 500,
                borderRadius: "8px",
                cursor: "pointer",
                border: "1px solid #dee2e6",
                background: "#fff",
                color: "#6c757d",
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      </CmModal>
    );
  }
}

export default IndexInvoice;
