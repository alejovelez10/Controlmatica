import React from 'react';
import {Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import NumberFormat from 'react-number-format';
import Select from "react-select";

class FormCreate extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <React.Fragment>
        <Modal isOpen={this.props.modal} toggle={this.props.toggle} className="modal-lg modal-dialog-centered" backdrop={this.props.backdrop}>
          <ModalHeader className="title-modal"  toggle={this.props.toggle}><i className="fas fa-money-check-alt mr-2"></i> {this.props.titulo}</ModalHeader>
          <form onSubmit={this.props.FormSubmit}>
            <ModalBody>
              <div className="row">

              <div className="col-md-4 mb-4">
                  <label>Proveedor</label>
                  <select 
                      name="provider_id" 
                      className={`form form-control ${this.props.errorValues == false && this.props.formValues.provider_id == "" ? "error-class" : ""}`}
                      value={this.props.formValues.provider_id}
                      onChange={this.props.onChangeForm}
                    >
                      <option value="">Seleccione un nombre</option>
                      {
                        this.props.providers.map(item => (
                            <React.Fragment>
                                <option value={item.id}>{item.name}</option>
                            </React.Fragment>
                        ))
                      }
                  </select> 
                </div>


              <div className="col-md-4">
                      <input
                        type="hidden"
                        name="cost_center_id"
                        value={this.props.formAutocompleteCentro.cost_center_id}
                      />
                      <label>Centro de costo <small className="validate-label">*</small></label>
                      <Select
                        onChange={this.props.onChangeAutocompleteCentro}
                        options={this.props.centro}
                        autoFocus={false}
                        className={`link-form ${this.props.errorValues == false && this.props.formValues.cost_center_id == "" ? "error-class" : ""}`}
                        value={this.props.formAutocompleteCentro}
                      />
                  </div>

              <div className="col-md-4 mb-4">
                <label>Fecha de orden <small className="validate-label">*</small></label>
                  <input
                    type="date"
                    name="sales_date"
                    value={this.props.formValues.sales_date}
                    onChange={this.props.onChangeForm}
                    className={`form form-control ${this.props.errorValues == false && this.props.formValues.sales_date == "" ? "error-class" : ""}`}
                  />
                </div>
                
                <div className="col-md-4 mb-4">
                <label>Numero de orden <small className="validate-label">*</small></label>
                  <input
                    type="text"
                    name="sales_number"
                    value={this.props.formValues.sales_number}
                    onChange={this.props.onChangeForm}
                    className={`form form-control ${this.props.errorValues == false && this.props.formValues.sales_number == "" ? "error-class" : ""}`}
                    placeholder="Numero de orden"
                  />
                </div>

                <div className="col-md-4 mb-4">
                <label>Valor<small className="validate-label">*</small></label>
                  <NumberFormat 
                    name="amount"
                    thousandSeparator={true} 
                    prefix={'$'} 
                    className={`form form-control ${this.props.errorValues == false && this.props.formValues.amount == "" ? "error-class" : ""}`}
                    value={this.props.formValues.amount}
                    onChange={this.props.onChangeForm}
                    placeholder="Valor"
                  /> 
                </div>

                <div className="col-md-4 mb-4">
                <label>Fecha estimada de entrega <small className="validate-label">*</small></label>
                  <input
                    type="date"
                    name="delivery_date"
                    value={this.props.formValues.delivery_date}
                    onChange={this.props.onChangeForm}
                    className={`form form-control ${this.props.errorValues == false && this.props.formValues.delivery_date == "" ? "error-class" : ""}`}
                  />
                </div>
              
                

                <div className="col-md-12">
                <label>Descripcion</label>
                  <textarea
                    name="description"
                    rows="5"
                    value={this.props.formValues.description}
                    onChange={this.props.onChangeForm}
                    className={`form form-control ${this.props.errorValues == false && this.props.formValues.description == "" ? "error-class" : ""}`}
                  />
                </div>



                {this.props.errorValues == false && (
                  <div className="col-md-12 mt-2">
                    <div className="alert alert-danger" role="alert">
                      <b>Debes de completar todos los campos requeridos</b>
                    </div>
                  </div>
                )}
  

                


              </div>

              </ModalBody>


         

          <ModalFooter>
                <button className="btn btn-light" onClick={this.props.toggle}>Cerrar</button>
                <button className="btn btn-secondary" onClick={this.props.submit}>{this.props.nameSubmit}</button>
          </ModalFooter>

          </form>

        </Modal>
      </React.Fragment>
    );
  }
}

export default FormCreate;

