import React from 'react';
import {Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import NumberFormat from 'react-number-format';
import {Button, CardBody, Card, Collapse} from 'reactstrap';
import SweetAlert from 'sweetalert2-react';
import Swal from 'sweetalert2/dist/sweetalert2.js'


class formCreate extends React.Component {
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
        number: accion.number,
        value: accion.value,
        observation: accion.observation,
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
    fetch("/material_invoices/" + this.state.id, {
      method: 'PATCH', // or 'PUT'
      body: JSON.stringify(this.state.formUpdate), // data can be `string` or {object}!
      headers: {
        'Content-Type': 'application/json',
      }
    }).then(res => res.json())
      .catch(error => console.error('Error:', error))
      .then(data => {
        console.log("updatadtstdtasdasdasdasd")
        this.props.loadInfo(this.props.id)
        this.props.loadMaterial()
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
        <Modal isOpen={this.props.modal} toggle={this.props.toggle} className="modal-lg modal-dialog-centered" backdrop={this.props.backdrop}>
          <ModalHeader className="title-modal" toggle={() => this.props.toggle("close")}><i className="fas fa-money-check-alt mr-2"></i> {this.props.titulo}</ModalHeader>
          
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
                            <label>Numero de factura <small className="validate-label">*</small></label>
                              <input
                                type="text"
                                name="number"
                                onChange={this.props.onChangeForm}
                                value={this.props.formValues.number}
                                className={`form form-control ${this.props.errorValues == false && this.props.formValues.number == "" ? "error-class" : ""}`}
                                placeholder="Numero de factura"
                              />
                            </div>
                            

                            <div className="col-md-4">
                            <label>Valor <small className="validate-label">*</small></label>
                              <NumberFormat 
                                name="value"
                                thousandSeparator={true} 
                                onChange={this.props.onChangeForm}
                                value={this.props.formValues.value}
                                prefix={'$'} 
                                className={`form form-control ${this.props.errorValues == false && this.props.formValues.value == "" ? "error-class" : ""}`}
                                placeholder="Valor"
                              /> 
                            </div>

                            <div className="col-md-4">
                            <label>Descripcion <small className="validate-label">*</small></label>
                              <input
                                type="text"
                                name="observation"
                                onChange={this.props.onChangeForm}
                                value={this.props.formValues.observation}
                                className={`form form-control ${this.props.errorValues == false  && this.props.formValues.observation == "" ? "error-class" : ""}`}
                                placeholder="Comprobante"
                              />
                            </div>

                            <div className="col-md-12 text-right mt-4">
                                <Button className="btn btn-light" onClick={this.toggle}>
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
                        <th>Numero de factura</th>
                        <th>Valor</th>
                        <th>Descripcion</th>
                        {this.state.id != "" &&
                          <th></th>
                        }

                        
                        <th className="text-center">Acciones</th>
                      </tr>
                    </thead>

                    <tbody>
                      {this.props.dataIncomes.length >= 1 ? (
                        this.props.dataIncomes.map(accion => (
                          <tr key={accion.id}>
                            <td>
                              {this.state.id == accion.id ? (
                                  <input 
                                    type="text" 
                                    className="form form-control" 
                                    name="number"
                                    onChange={this.handleChangeUpdate}
                                    value={this.state.formUpdate.number}
                                  />
                              ) : (
                                  <p>{accion.number}</p>
                                
                              )}
                            </td>

                            <td>
                            {this.state.id == accion.id ? (
                                <NumberFormat 
                                  name="value"
                                  thousandSeparator={true} 
                                  onChange={this.handleChangeUpdate}
                                  value={this.state.formUpdate.value}
                                  prefix={'$'} 
                                  className="form form-control" 
                                  placeholder="Valor"
                                /> 
                              ) : (
                                  <p><NumberFormat value={accion.value} displayType={'text'} thousandSeparator={true} prefix={'$'} /></p>
                                
                              )}

                            </td>


                            <td>
                              {this.state.id == accion.id ? (
                                    <input 
                                      type="text" 
                                      className="form form-control" 
                                      name="observation"
                                      placeholder="Descripcion"
                                      onChange={this.handleChangeUpdate}
                                      value={this.state.formUpdate.observation}
                                    />
                                ) : (
                                    <p>{accion.observation}</p>
                                  
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
                                  <button className="btn btn-light" id="btnGroupDrop1" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                  <i className="fas fa-bars"></i>
                                  </button>
                                  
                                  <div className="dropdown-menu dropdown-menu-right">

                                    {true && (
                                      <button onClick={() => this.edit(accion)} className="dropdown-item">
                                        Editar
                                      </button>
                                    )}

                                    {true && (
                                      <button onClick={() => this.props.delete(accion.id)} className="dropdown-item">
                                        Eliminar
                                      </button>
                                    )}

                                  </div>
                                </div>
                              </div>
                            </td>
                          
                          </tr>
                        ))
                      ) : (
                        <td colSpan="8" className="text-center">
                            <div className="text-center mt-3">
                              <h4>No hay Facturas</h4>
                                {true && (
                                  <Button className="btn btn-secondary mt-3" onClick={this.toggle} id="toggler" style={{ marginBottom: '1rem' }}>
                                    Nueva Factura
                                  </Button>
                                )}
                            </div>
                        </td>
                      )}
                      
                    </tbody>
                  </table>
                </div>
              </div>
                
                <div className="col-md-12 text-right">
                  {true && (
                    <React.Fragment>
                      {this.props.dataIncomes.length >= 1 &&
                        <Button className="btn btn-secondary" id="toggler" onClick={this.toggle} style={{ marginBottom: '1rem' }}>
                          Nueva Factura
                        </Button>
                      }
                    </React.Fragment>
                  )}
                </div>


                  
                </div>
              </ModalBody>


         

          <ModalFooter>
                <button className="btn btn-light" onClick={() => this.props.toggle("close")}>Cerrar</button>
          </ModalFooter>

        </Modal>
      </div>
    );
  }
}

export default formCreate;