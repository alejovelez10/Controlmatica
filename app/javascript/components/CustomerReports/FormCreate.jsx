import React from "react";
import {Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import NumberFormat from 'react-number-format';

class FormCreate extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <React.Fragment>
        <Modal returnFocusAfterClose={true} isOpen={this.props.modal} className="modal-lg modal-dialog-centered" toggle={this.props.toggle} backdrop={this.props.backdrop}>
          <ModalHeader className="title-modal" toggle={this.props.toggle}> <i className="app-menu__icon fa fa-street-view mr-2"></i> {this.props.titulo} </ModalHeader>

          <form onSubmit={this.props.FormSubmit}>
            <ModalBody>

            <div className="row">
                <div className="col-md-4">
                  <label>Nombre de Cliente <small className="validate-label">*</small></label>

                    <input
                      type="text"
                      name="name"
                      value={this.props.formValues.name}
                      onChange={this.props.onChangeForm}
                      className={`form form-control ${this.props.errorValues == false && this.props.formValues.name == "" ? "error-class" : ""}`}
                      autoComplete="off"
                      placeholder="Nombre"
                    />

                </div>

                <div className="col-md-4">
                  <label>Centro de costos <small className="validate-label">*</small></label>
                    <NumberFormat 
                      name="money_value"
                      thousandSeparator={true} 
                      prefix={'$'} 
                      className={`form form-control ${this.props.errorValues == false && this.props.formValues.money_value == "" ? "error-class" : ""}`}
                      value={this.props.formValues.money_value}
                      onChange={this.props.onChangeForm}
                      placeholder="Valor monetario"
                    /> 
                  </div>

                  <div className="col-md-4">
                  <label>Aprueba el Reporte <small className="validate-label">*</small></label>
                    <NumberFormat 
                      name="money_value"
                      thousandSeparator={true} 
                      prefix={'$'} 
                      className={`form form-control ${this.props.errorValues == false && this.props.formValues.money_value == "" ? "error-class" : ""}`}
                      value={this.props.formValues.money_value}
                      onChange={this.props.onChangeForm}
                      placeholder="Valor monetario"
                    /> 
                  </div>

                  <div className="col-md-4">
                  <label>Fecha del reporte <small className="validate-label">*</small></label>
                    <NumberFormat 
                      name="money_value"
                      thousandSeparator={true} 
                      prefix={'$'} 
                      className={`form form-control ${this.props.errorValues == false && this.props.formValues.money_value == "" ? "error-class" : ""}`}
                      value={this.props.formValues.money_value}
                      onChange={this.props.onChangeForm}
                      placeholder="Valor monetario"
                    /> 
                  </div>

                  <div className="col-md-4">
                  <label>Reportes<small className="validate-label">*</small></label>
                    <NumberFormat 
                      name="money_value"
                      thousandSeparator={true} 
                      prefix={'$'} 
                      className={`form form-control ${this.props.errorValues == false && this.props.formValues.money_value == "" ? "error-class" : ""}`}
                      value={this.props.formValues.money_value}
                      onChange={this.props.onChangeForm}
                      placeholder="Valor monetario"
                    /> 
                  </div>


                  <div className="col-md-12 mt-4">
                  <label>Observaciones<small className="validate-label">*</small></label>
                    <textarea 
                      name="Observaciones"
                      className={`form form-control ${this.props.errorValues == false && this.props.formValues.money_value == "" ? "error-class" : ""}`}
                      value={this.props.formValues.money_value}
                      onChange={this.props.onChangeForm}
                      placeholder="Observaciones"
                    /> 
                  </div>

            </div>

              {this.props.errorValues == false && (
                  <div className="col-md-12 p-0 mt-4">
                    <div className="alert alert-danger" role="alert">
                      <b>Debes de completar todos los campos requeridos</b>
                    </div>
                  </div>
              )}

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
