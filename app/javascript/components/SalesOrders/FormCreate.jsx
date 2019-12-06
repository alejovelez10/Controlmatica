import React from 'react';
import {Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import NumberFormat from 'react-number-format';
import {Button, CardBody, Card, Collapse} from 'reactstrap';
import SweetAlert from 'sweetalert2-react';
import Swal from 'sweetalert2/dist/sweetalert2.js'


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
        date_detail: "",
        value: "",
        voucher: "",
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

  edit = (accion) =>{
    this.setState({
      id: accion.id,
      formUpdate: {
        date_detail: accion.date_detail,
        value: accion.value,
        voucher: accion.voucher,
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


  updateInfo = () => {
    fetch("/income_details/" + this.state.id, {
      method: 'PATCH', // or 'PUT'
      body: JSON.stringify(this.state.formUpdate), // data can be `string` or {object}!
      headers: {
        'Content-Type': 'application/json',
      }
    }).then(res => res.json())
      .catch(error => console.error('Error:', error))
      .then(data => {
        this.props.loadData(this.props.income)
        this.props.MessageSucces(data.message, data.type, data.message_error)

        this.setState({
          id: "",
          formUpdate: {
            date_detail: "",
            value: "",
            voucher: "",
          }
        });

      });
  }

  

  

  render() {
    return (
      <div>
        <Modal isOpen={this.props.modal} toggle={() => this.props.toggle("close")} className="modal-lg modal-dialog-centered" backdrop={this.props.backdrop}>
          <ModalHeader className="title-modal"  toggle={() => this.props.toggle("close")}><i className="fas fa-money-check-alt mr-2"></i> {this.props.titulo}</ModalHeader>
          
            <ModalBody>
              <div className="row">
            

                <div className="col-md-12 mb-3">
                <Collapse
                  isOpen={this.state.collapse}
                  onEntered={this.onEntered}
                  onExited={this.onExited}
                >
                    <Card>
                      <CardBody>
                        <form onSubmit={this.props.FormSubmit}>
                          <div className="row">

                            <div className="col-md-4">
                            <label>Fecha de Factura<small className="validate-label">*</small></label>
                              <input
                                type="date"
                                name="invoice_date"
                                onChange={this.props.onChangeForm}
                                value={this.props.formValues.invoice_date}
                                className={`form form-control ${this.props.errorValues == false && this.props.formValues.invoice_date == "" ? "error-class" : ""}`}
                                placeholder="Fecha de finalizacion"
                              />
                            </div>
                            

                            <div className="col-md-4">
                            <label>Valor <small className="validate-label">*</small></label>
                              <NumberFormat 
                                name="invoice_value"
                                thousandSeparator={true} 
                                onChange={this.props.onChangeForm}
                                value={this.props.formValues.invoice_value}
                                prefix={'$'} 
                                className={`form form-control ${this.props.errorValues == false && this.props.formValues.invoice_value == "" ? "error-class" : ""}`}
                                placeholder="Valor"
                              /> 
                            </div>

                            <div className="col-md-4">
                            <label>Numero de factura <small className="validate-label">*</small></label>
                              <input 
                                name="number_invoice"
                                type="text"
                                onChange={this.props.onChangeForm}
                                value={this.props.formValues.number_invoice}
                                className={`form form-control ${this.props.errorValues == false && this.props.formValues.number_invoice == "" ? "error-class" : ""}`}
                                placeholder="Numero de factura"
                              /> 
                            </div>

                            

                            <div className="col-md-6 mt-4">
                            <label>Archivo de certificado de entrega <small className="validate-label">*</small></label>
                              <input
                                type="file"
                                name="delivery_certificate_file"
                                onChange={this.props.onChangeDeliveryCertificate}
                                className={`form form-control`}
                                placeholder="Comprobante"
                              />
                            </div>


                            <div className="col-md-6 mt-4">
                            <label>Archivo de informe de recepción <small className="validate-label">*</small></label>
                              <input
                                type="file"
                                name="reception_report_file"
                                onChange={this.props.onChangeFormReceptionReport}
                                className={`form form-control`}
                                placeholder="Comprobante"
                              />
                            </div>

                            <div className="col-md-12 text-right mt-4">
                                <Button onClick={this.toggle} id="toggler">
                                  Cerrar
                                </Button>
                                <button onClick={this.props.submit} className="btn btn-secondary ml-3">Guardar</button>
                            </div>

                          </div>

                          
                        </form>
                      </CardBody>
                    </Card>
                  </Collapse>
                </div>

                {this.props.errorValues == false && (
                  <div className="col-md-12">
                    <div className="alert alert-danger" role="alert">
                      <b>Debes de completar todos los campos requeridos</b>
                    </div>
                  </div>
                )}

                <div className="col-md-12">
                  <div className="content">
                    <table
                    className="table table-hover table-bordered"
                    id="sampleTable"
                  >
                    <thead>
                      <tr>
                        <th style={{ width: "13%" }}>Fecha</th>
                        <th style={{ width: "13%" }}>Valor</th>
                        <th style={{ width: "21%" }}>Numero de factura</th>
                        <th style={{ width: "12%" }} className="text-center">Certificado de entrega</th>
                        <th style={{ width: "14%" }} className="text-center">Informe de recepción</th>
                        {this.state.id != "" &&
                          <th></th>
                        }

                        
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
                                    className="form form-control" 
                                    name="invoice_date"
                                    onChange={this.handleChangeUpdate}
                                    value={this.state.formUpdate.invoice_date}
                                  />
                              ) : (
                                  <p>{accion.invoice_date}</p>
                                
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
                                  className="form form-control" 
                                  placeholder="Valor"
                                /> 
                              ) : (
                                  <p><NumberFormat value={accion.invoice_value} displayType={'text'} thousandSeparator={true} prefix={'$'} /></p>
                                
                              )}

                            </td>

                            <td>
                              <p>{accion.number_invoice}</p>
                            </td>


                            <td className="text-center">
                                    {accion.delivery_certificate_file.url != null ? (
                                        <a data-toggle="tooltip" data-placement="bottom" title="" target="_blank" className="btn" href={accion.delivery_certificate_file.url} data-original-title="Descargar Archivo" >
                                          <i className="fas fa-download"></i>
                                        </a>
                                    ) : (
                                      <i className="fas fa-times color-false"></i>
                                    )}
                            </td>

                            <td className="text-center">
                                    {accion.reception_report_file.url != null ? (
                                        <a data-toggle="tooltip" data-placement="bottom" title="" target="_blank" className="btn" href={accion.reception_report_file.url} data-original-title="Descargar Archivo" >
                                          <i className="fas fa-download"></i>
                                        </a>
                                    ) : (
                                      <i className="fas fa-times color-false"></i>
                                    )}
                            </td>

                            {this.state.id != "" &&
                              <td style={{width: "118px"}}>
                                {this.state.id == accion.id && (
                                      <React.Fragment>
                                        <button className="btn btn-primary" onClick={() => this.updateInfo()}>
                                          <i className="fas fa-check"></i>
                                        </button>
                                        <button className="btn btn-danger ml-2" onClick={() => this.setState({ id: ""})}>
                                            <i className="fas fa-window-close"></i>
                                        </button>
                                      </React.Fragment>
                                )}
                              </td>
                            }

                            <td className="text-right" style={{ width: "10px"}}>          
                              <div className="btn-group" role="group" aria-label="Button group with nested dropdown">
                                <div className="btn-group" role="group">
                                  <button className="btn btn-secondary" id="btnGroupDrop1" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                  <i className="fas fa-bars"></i>
                                  </button>
                                  
                                  <div className="dropdown-menu dropdown-menu-right">

                                      <button onClick={() => this.edit(accion)} className="dropdown-item">
                                        Editar
                                      </button>

                                      <button onClick={() => this.props.delete(accion)} className="dropdown-item">
                                        Eliminar
                                      </button>

                                  </div>
                                </div>
                              </div>
                            </td>
                          
                          </tr>
                        ))
                      ) : (
                        <td colSpan="8" className="text-center">
                            <div className="text-center mt-3">
                              <h4>No hay facturas</h4>
                                  <Button className="btn btn-secondary mt-3" onClick={this.toggle} id="toggler" style={{ marginBottom: '1rem' }}>
                                    Nueva factura
                                  </Button>
                            </div>
                        </td>
                      )}
                      
                    </tbody>
                  </table>
                </div>
              </div>
                
                <div className="col-md-12 text-right">
                    <React.Fragment>
                      {this.props.dataIncomes.length >= 1 &&
                        <Button className="btn btn-secondary" id="toggler" onClick={this.toggle} style={{ marginBottom: '1rem' }}>
                          Nueva factura
                        </Button>
                      }
                    </React.Fragment>
                </div>


                  
                </div>
              </ModalBody>


         

          <ModalFooter>
                <button className="btn btn-secondary" onClick={() => this.props.toggle("close")}>Cerrar</button>
          </ModalFooter>

        </Modal>
      </div>
    );
  }
}

export default FormCreate;