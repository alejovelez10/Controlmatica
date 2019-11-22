import React from 'react';
import {Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import NumberFormat from 'react-number-format';


class FormCreate extends React.Component {
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
                <label>Fecha de venta <small className="validate-label">*</small></label>
                  <input
                    type="date"
                    name="sales_date"
                    value={this.props.formValues.sales_date}
                    onChange={this.props.onChangeForm}
                    className={`form form-control ${this.props.errorValues == false && this.props.formValues.sales_date == "" ? "error-class" : ""}`}
                  />
                </div>
                
                <div className="col-md-6 mb-4">
                <label>Numero de ventas <small className="validate-label">*</small></label>
                  <input
                    type="number"
                    name="sales_number"
                    value={this.props.formValues.sales_number}
                    onChange={this.props.onChangeForm}
                    className={`form form-control ${this.props.errorValues == false && this.props.formValues.sales_number == "" ? "error-class" : ""}`}
                    placeholder="Numero de ventas"
                  />
                </div>

                <div className="col-md-12 mt-2">
                <label>Valor<small className="validate-label">*</small></label>
                  <NumberFormat 
                    name="ammount"
                    thousandSeparator={true} 
                    prefix={'$'} 
                    className={`form form-control ${this.props.errorValues == false && this.props.formValues.ammount == "" ? "error-class" : ""}`}
                    value={this.props.formValues.ammount}
                    onChange={this.props.onChangeForm}
                    placeholder="Valor"
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

