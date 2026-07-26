import React from 'react';
import { Modal, ModalBody, ModalFooter } from 'reactstrap';
import NumberFormat from 'react-number-format';
import { Button, CardBody, Card, Collapse } from 'reactstrap';

const selectStyles = {
  control: (base, state) => ({
    ...base,
    background: "#fcfcfd",
    borderColor: state.isFocused ? "#f5a623" : "#e2e5ea",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(245, 166, 35, 0.15)" : "none",
    "&:hover": { borderColor: "#f5a623" },
    borderRadius: "8px",
    padding: "2px 4px",
    fontSize: "14px",
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? "#f5a623" : state.isFocused ? "#fff3e0" : "#fff",
    color: state.isSelected ? "#fff" : "#333",
    fontSize: "14px",
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

class FormCreate extends React.Component {
  constructor(props) {
    super(props);
    this.onExited = this.onExited.bind(this);
    this.onEntered = this.onEntered.bind(this);

    this.state = {
      collapse: false,
      status: 'abrir',
      id: "",

      formUpdate: {
        invoice_date: "",
        invoice_value: "",
        number_invoice: "",
        engineering_value: "",
      }
    };
  }

  onEntered() {
    this.setState({ status: 'cerrar' });
  }

  onExited() {
    this.setState({ status: 'abrir' });
  }

  toggle = () => {
    this.setState(state => ({ collapse: !state.collapse }));
  }

  edit = (accion) => {
    this.setState({
      id: accion.id,
      formUpdate: {
        invoice_date: accion.invoice_date,
        invoice_value: accion.invoice_value,
        number_invoice: accion.number_invoice,
        engineering_value: accion.engineering_value,
      }
    })
  }

  handleChangeUpdate = e => {
    this.setState({
      formUpdate: {
        ...this.state.formUpdate,
        [e.target.name]: e.target.value
      }
    });
  };

  handleFileReceptionReport = e => {
    this.setState({
      reception_report_file: e.target.files[0]
    });
  };

  handleFileDeliveryCertificate = e => {
    this.setState({
      delivery_certificate_file: e.target.files[0]
    });
  };

  updateInfo = () => {
    const formData = new FormData();
    formData.append("invoice_date", this.state.formUpdate.invoice_date);
    formData.append("invoice_value", this.state.formUpdate.invoice_value);
    formData.append("number_invoice", this.state.formUpdate.number_invoice);
    formData.append("engineering_value", this.state.formUpdate.engineering_value);
    formData.append("delivery_certificate_file", this.state.delivery_certificate_file == undefined ? "" : this.state.delivery_certificate_file);
    formData.append("reception_report_file", this.state.reception_report_file == undefined ? "" : this.state.reception_report_file);

    fetch("/customer_invoices/" + this.state.id, {
      method: 'PATCH',
      body: formData,
      headers: {}
    }).then(res => res.json())
      .catch(error => console.error('Error:', error))
      .then(data => {
        this.props.loadInfo(this.props.accion)
        this.props.loadOrders()
        this.props.MessageSucces(data.message, data.type, data.message_error)

        this.setState({
          id: "",

          formUpdate: {
            invoice_date: "",
            invoice_value: "",
            number_invoice: "",
            engineering_value: "",
          },

          delivery_certificate_file: null,
          reception_report_file: null

        });

      });
  }

  render() {
    return (
      <div>
        <Modal isOpen={this.props.modal} toggle={() => this.props.toggle("close")} className="modal-lg modal-dialog-centered" backdrop={this.props.backdrop}>
          {/* Modern Header */}
          <div className="cm-modal-header">
            <div className="cm-modal-title">
              <i className="fas fa-file-invoice-dollar cm-modal-icon"></i>
              <span>{this.props.titulo}</span>
            </div>
            <button className="cm-modal-close" onClick={() => this.props.toggle("close")}>
              <i className="fas fa-times"></i>
            </button>
          </div>

          <ModalBody className="cm-modal-body">
            <div className="cm-form-container">
              {/* Collapsible Form Section */}
              <div className="cm-form-section">
                <Collapse
                  isOpen={this.state.collapse}
                  onEntered={this.onEntered}
                  onExited={this.onExited}
                >
                  <Card className="cm-card">
                    <CardBody>
                      <form onSubmit={this.props.FormSubmit}>
                        <div className="cm-form-grid-2">
                          <div className="cm-form-group">
                            <label className="cm-label">
                              <i className="fas fa-calendar-alt"></i> Fecha de Factura
                              <span className="cm-required">*</span>
                            </label>
                            <input
                              type="date"
                              name="invoice_date"
                              onChange={this.props.onChangeForm}
                              value={this.props.formValues.invoice_date}
                              className={`cm-input ${this.props.errorValues == false && this.props.formValues.invoice_date == "" ? "cm-input-error" : ""}`}
                              placeholder="Fecha de factura"
                            />
                          </div>

                          <div className="cm-form-group">
                            <label className="cm-label">
                              <i className="fas fa-dollar-sign"></i> Valor
                              <span className="cm-required">*</span>
                            </label>
                            <NumberFormat
                              name="invoice_value"
                              thousandSeparator={true}
                              onChange={this.props.onChangeForm}
                              value={this.props.formValues.invoice_value}
                              prefix={'$'}
                              className={`cm-input ${this.props.errorValues == false && this.props.formValues.invoice_value == "" ? "cm-input-error" : ""}`}
                              placeholder="Valor"
                            />
                          </div>

                          <div className="cm-form-group">
                            <label className="cm-label">
                              <i className="fas fa-cogs"></i> Valor de Ingenieria
                              <span className="cm-required">*</span>
                            </label>
                            <input
                              name="engineering_value"
                              type="number"
                              onChange={this.props.onChangeForm}
                              value={this.props.formValues.engineering_value}
                              className={`cm-input ${this.props.errorValues == false && this.props.formValues.engineering_value == "" ? "cm-input-error" : ""}`}
                              placeholder="Valor ingenieria"
                            />
                          </div>

                          <div className="cm-form-group">
                            <label className="cm-label">
                              <i className="fas fa-hashtag"></i> Numero de Factura
                              <span className="cm-required">*</span>
                            </label>
                            <input
                              name="number_invoice"
                              type="text"
                              onChange={this.props.onChangeForm}
                              value={this.props.formValues.number_invoice}
                              className={`cm-input ${this.props.errorValues == false && this.props.formValues.number_invoice == "" ? "cm-input-error" : ""}`}
                              placeholder="Numero de factura"
                            />
                          </div>

                          <div className="cm-form-group">
                            <label className="cm-label">
                              <i className="fas fa-file-certificate"></i> Certificado de Entrega
                            </label>
                            <input
                              type="file"
                              name="delivery_certificate_file"
                              onChange={this.props.onChangeDeliveryCertificate}
                              className="cm-input cm-input-file"
                            />
                          </div>

                          <div className="cm-form-group">
                            <label className="cm-label">
                              <i className="fas fa-file-alt"></i> Informe de Recepcion
                            </label>
                            <input
                              type="file"
                              name="reception_report_file"
                              onChange={this.props.onChangeFormReceptionReport}
                              className="cm-input cm-input-file"
                            />
                          </div>
                        </div>

                        <div className="cm-form-actions">
                          <Button onClick={this.toggle} className="cm-btn cm-btn-secondary">
                            <i className="fas fa-times"></i> Cerrar
                          </Button>
                          <button onClick={this.props.submit} className="cm-btn cm-btn-primary">
                            <i className="fas fa-save"></i> Guardar
                          </button>
                        </div>
                      </form>
                    </CardBody>
                  </Card>
                </Collapse>
              </div>

              {/* Error Alert */}
              {this.props.errorValues == false && (
                <div className="cm-alert cm-alert-error">
                  <i className="fas fa-exclamation-circle"></i>
                  <span>Debes completar todos los campos requeridos</span>
                </div>
              )}

              {/* Table Section */}
              <div className="cm-table-container">
                <table className="cm-table">
                  <thead>
                    <tr>
                      <th style={{ width: "16%" }}>Fecha</th>
                      <th style={{ width: "14%" }}>Valor</th>
                      <th style={{ width: "17%" }}>Valor Ingenieria</th>
                      <th style={{ width: "17%" }}>Numero Factura</th>
                      <th style={{ width: "15%" }} className="text-center">Cert. Entrega</th>
                      <th style={{ width: "15%" }} className="text-center">Inf. Recepcion</th>
                      {this.state.id != "" && <th>Actualizacion</th>}
                      <th style={{ width: "1%" }} className="text-center">Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {this.props.dataIncomes.length >= 1 ? (
                      this.props.dataIncomes.map(accion => (
                        <tr key={accion.id}>
                          <td>
                            {this.state.id == accion.id ? (
                              <input
                                type="date"
                                className="cm-input cm-input-sm"
                                name="invoice_date"
                                onChange={this.handleChangeUpdate}
                                value={this.state.formUpdate.invoice_date}
                              />
                            ) : (
                              <span>{accion.invoice_date}</span>
                            )}
                          </td>

                          <td>
                            {this.state.id == accion.id ? (
                              <NumberFormat
                                name="invoice_value"
                                thousandSeparator={true}
                                onChange={this.handleChangeUpdate}
                                value={this.state.formUpdate.invoice_value}
                                prefix={'$'}
                                className="cm-input cm-input-sm"
                                placeholder="Valor"
                              />
                            ) : (
                              <span><NumberFormat value={accion.invoice_value} displayType={'text'} thousandSeparator={true} prefix={'$'} /></span>
                            )}
                          </td>

                          <td>
                            {this.state.id == accion.id ? (
                              <input
                                name="engineering_value"
                                onChange={this.handleChangeUpdate}
                                value={this.state.formUpdate.engineering_value}
                                className="cm-input cm-input-sm"
                                placeholder="Valor"
                              />
                            ) : (
                              <span><NumberFormat value={accion.engineering_value} displayType={'text'} thousandSeparator={true} prefix={'$'} /></span>
                            )}
                          </td>

                          <td>
                            {this.state.id == accion.id ? (
                              <input
                                type="text"
                                name="number_invoice"
                                placeholder="Numero de factura"
                                className="cm-input cm-input-sm"
                                onChange={this.handleChangeUpdate}
                                value={this.state.formUpdate.number_invoice}
                              />
                            ) : (
                              <span>{accion.number_invoice}</span>
                            )}
                          </td>

                          <td className="text-center">
                            {this.state.id == accion.id ? (
                              <input
                                type="file"
                                name="delivery_certificate_file"
                                className="cm-input cm-input-sm cm-input-file"
                                onChange={this.handleFileDeliveryCertificate}
                              />
                            ) : (
                              <React.Fragment>
                                {accion.delivery_certificate_file.url != null ? (
                                  <a
                                    data-toggle="tooltip"
                                    data-placement="bottom"
                                    title="Descargar Archivo"
                                    target="_blank"
                                    className="cm-btn-icon cm-btn-icon-success"
                                    href={accion.delivery_certificate_file.url}
                                  >
                                    <i className="fas fa-download"></i>
                                  </a>
                                ) : (
                                  <i className="fas fa-times cm-icon-false"></i>
                                )}
                              </React.Fragment>
                            )}
                          </td>

                          <td className="text-center">
                            {this.state.id == accion.id ? (
                              <input
                                type="file"
                                name="reception_report_file"
                                className="cm-input cm-input-sm cm-input-file"
                                onChange={this.handleFileReceptionReport}
                              />
                            ) : (
                              <React.Fragment>
                                {accion.reception_report_file.url != null ? (
                                  <a
                                    data-toggle="tooltip"
                                    data-placement="bottom"
                                    title="Descargar Archivo"
                                    target="_blank"
                                    className="cm-btn-icon cm-btn-icon-success"
                                    href={accion.reception_report_file.url}
                                  >
                                    <i className="fas fa-download"></i>
                                  </a>
                                ) : (
                                  <i className="fas fa-times cm-icon-false"></i>
                                )}
                              </React.Fragment>
                            )}
                          </td>

                          {this.state.id != "" && (
                            <td style={{ width: "118px" }}>
                              {this.state.id == accion.id && (
                                <div className="cm-action-buttons">
                                  <button className="cm-btn-icon cm-btn-icon-primary" onClick={() => this.updateInfo()}>
                                    <i className="fas fa-check"></i>
                                  </button>
                                  <button className="cm-btn-icon cm-btn-icon-danger" onClick={() => this.setState({ id: "" })}>
                                    <i className="fas fa-window-close"></i>
                                  </button>
                                </div>
                              )}
                            </td>
                          )}

                          <td className="text-right" style={{ width: "10px" }}>
                            <div className="btn-group" role="group" aria-label="Button group with nested dropdown">
                              <div className="btn-group" role="group">
                                <button className="cm-btn-icon cm-btn-icon-secondary" id="btnGroupDrop1" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                  <i className="fas fa-ellipsis-v"></i>
                                </button>

                                <div className="dropdown-menu dropdown-menu-right cm-dropdown">
                                  <button onClick={() => this.edit(accion)} className="dropdown-item cm-dropdown-item">
                                    <i className="fas fa-edit"></i> Editar
                                  </button>
                                  <button onClick={() => this.props.delete(accion)} className="dropdown-item cm-dropdown-item cm-dropdown-item-danger">
                                    <i className="fas fa-trash"></i> Eliminar
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" className="text-center">
                          <div className="cm-empty-state">
                            <i className="fas fa-file-invoice cm-empty-icon"></i>
                            <h4>No hay facturas</h4>
                            <Button className="cm-btn cm-btn-primary" onClick={this.toggle}>
                              <i className="fas fa-plus"></i> Nueva Factura
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Add Invoice Button */}
              {this.props.dataIncomes.length >= 1 && (
                <div className="cm-add-button-container">
                  <Button className="cm-btn cm-btn-primary" onClick={this.toggle}>
                    <i className="fas fa-plus"></i> Nueva Factura
                  </Button>
                </div>
              )}
            </div>
          </ModalBody>

          {/* Modern Footer */}
          <ModalFooter className="cm-modal-footer">
            <button className="cm-btn cm-btn-secondary" onClick={() => this.props.toggle("close")}>
              <i className="fas fa-times"></i> Cerrar
            </button>
          </ModalFooter>
        </Modal>

        <style jsx>{`
          .cm-modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px 24px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 8px 8px 0 0;
          }

          .cm-modal-title {
            display: flex;
            align-items: center;
            gap: 12px;
            color: #fff;
            font-size: 1.25rem;
            font-weight: 600;
          }

          .cm-modal-icon {
            font-size: 1.5rem;
            opacity: 0.9;
          }

          .cm-modal-close {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: #fff;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
          }

          .cm-modal-close:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: scale(1.05);
          }

          .cm-modal-body {
            padding: 24px;
            background: #fcfcfd;
          }

          .cm-form-container {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }

          .cm-form-section {
            margin-bottom: 16px;
          }

          .cm-card {
            border: none;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          }

          .cm-form-grid-2 {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }

          .cm-form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .cm-label {
            font-size: 13px;
            font-weight: 400;
            color: #495057;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .cm-label i {
            color: #6c757d;
            width: 16px;
          }

          .cm-required {
            color: #dc3545;
            margin-left: 2px;
          }

          .cm-input {
            width: 100%;
            padding: 10px 14px;
            border: 1px solid #e2e5ea;
            border-radius: 8px;
            font-size: 14px;
            background: #fcfcfd;
            transition: all 0.2s ease;
          }

          .cm-input:focus {
            outline: none;
            border-color: #f5a623;
            box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.15);
            background: #fff;
          }

          .cm-input:hover {
            border-color: #f5a623;
          }

          .cm-input-error {
            border-color: #dc3545;
            background: #fff5f5;
          }

          .cm-input-file {
            padding: 8px;
          }

          .cm-input-sm {
            padding: 6px 10px;
            font-size: 13px;
          }

          .cm-form-actions {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
          }

          .cm-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
          }

          .cm-btn-primary {
            background: linear-gradient(135deg, #f5a623 0%, #f7b731 100%);
            color: #fff;
          }

          .cm-btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(245, 166, 35, 0.4);
          }

          .cm-btn-secondary {
            background: #fff;
            color: #495057;
            border: 1px solid #e2e5ea;
          }

          .cm-btn-secondary:hover {
            background: #fcfcfd;
            border-color: #dee2e6;
          }

          .cm-btn-icon {
            width: 32px;
            height: 32px;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
          }

          .cm-btn-icon-primary {
            background: #28a745;
            color: #fff;
          }

          .cm-btn-icon-primary:hover {
            background: #218838;
          }

          .cm-btn-icon-danger {
            background: #dc3545;
            color: #fff;
            margin-left: 8px;
          }

          .cm-btn-icon-danger:hover {
            background: #c82333;
          }

          .cm-btn-icon-secondary {
            background: #6c757d;
            color: #fff;
          }

          .cm-btn-icon-secondary:hover {
            background: #5a6268;
          }

          .cm-btn-icon-success {
            background: #28a745;
            color: #fff;
            padding: 6px 12px;
            border-radius: 6px;
            text-decoration: none;
          }

          .cm-btn-icon-success:hover {
            background: #218838;
            color: #fff;
          }

          .cm-alert {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 14px 18px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
          }

          .cm-alert-error {
            background: #fff5f5;
            color: #dc3545;
            border: 1px solid #f5c6cb;
          }

          .cm-table-container {
            background: #fff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          }

          .cm-table {
            width: 100%;
            border-collapse: collapse;
          }

          .cm-table thead {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }

          .cm-table th {
            padding: 14px 16px;
            color: #fff;
            font-weight: 600;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .cm-table td {
            padding: 14px 16px;
            border-bottom: 1px solid #e9ecef;
            vertical-align: middle;
            font-size: 14px;
            color: #495057;
          }

          .cm-table tbody tr:hover {
            background: #fcfcfd;
          }

          .cm-table tbody tr:last-child td {
            border-bottom: none;
          }

          .cm-icon-false {
            color: #dc3545;
            font-size: 16px;
          }

          .cm-action-buttons {
            display: flex;
            align-items: center;
          }

          .cm-dropdown {
            border: none;
            border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
            padding: 8px 0;
          }

          .cm-dropdown-item {
            padding: 10px 16px;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: all 0.2s ease;
          }

          .cm-dropdown-item:hover {
            background: #fcfcfd;
          }

          .cm-dropdown-item-danger {
            color: #dc3545;
          }

          .cm-dropdown-item-danger:hover {
            background: #fff5f5;
          }

          .cm-empty-state {
            padding: 40px 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
          }

          .cm-empty-icon {
            font-size: 48px;
            color: #dee2e6;
          }

          .cm-empty-state h4 {
            color: #6c757d;
            font-weight: 500;
            margin: 0;
          }

          .cm-add-button-container {
            display: flex;
            justify-content: flex-end;
          }

          .cm-modal-footer {
            padding: 16px 24px;
            background: #fff;
            border-top: 1px solid #e9ecef;
            display: flex;
            justify-content: flex-end;
          }

          @media (max-width: 768px) {
            .cm-form-grid-2 {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    );
  }
}

export default FormCreate;
