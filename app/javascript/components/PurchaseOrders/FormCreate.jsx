import React from 'react';
import {Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import NumberFormat from 'react-number-format';


class formCreate extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <React.Fragment>
        <Modal isOpen={this.props.modal} toggle={this.props.toggle} className="modal-dialog-centered" backdrop={this.props.backdrop}>
          <ModalHeader className="title-modal"  toggle={this.props.toggle}><i className="fas fa-money-check-alt mr-2"></i> {this.props.titulo}</ModalHeader>
          <form onSubmit={this.props.FormSubmit}>
            <ModalBody>
              <div className="row">

              <div className="col-md-6 mb-4">
                <label>Fecha de generación <small className="validate-label">*</small></label>
                  <input
                    type="date"
                    name="created_date"
                    value={this.props.formValues.created_date}
                    onChange={this.props.onChangeForm}
                    className={`form form-control ${this.props.errorValues == false && this.props.formValues.created_date == "" ? "error-class" : ""}`}
                  />
                </div>
                
                <div className="col-md-6 mb-4">
                <label>Numero de orden <small className="validate-label">*</small></label>
                  <input
                    type="number"
                    name="order_number"
                    value={this.props.formValues.order_number}
                    onChange={this.props.onChangeForm}
                    className={`form form-control ${this.props.errorValues == false && this.props.formValues.order_number == "" ? "error-class" : ""}`}
                    placeholder="Numero de pago"
                  />
                </div>

                <div className="col-md-12 mt-2">
                <label>Valor<small className="validate-label">*</small></label>
                  <NumberFormat 
                    name="order_value"
                    thousandSeparator={true} 
                    prefix={'$'} 
                    className={`form form-control ${this.props.errorValues == false && this.props.formValues.order_value == "" ? "error-class" : ""}`}
                    value={this.props.formValues.order_value}
                    onChange={this.props.onChangeForm}
                    placeholder="Valor total"
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

export default formCreate;
