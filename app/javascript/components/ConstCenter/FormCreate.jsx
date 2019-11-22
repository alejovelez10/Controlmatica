import React from "react";
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
        <Modal returnFocusAfterClose={true} isOpen={this.props.modal} className="modal-lg modal-dialog-centered" toggle={this.props.toggle} backdrop={this.props.backdrop}>
          <ModalHeader className="title-modal" toggle={this.props.toggle}> <i className="app-menu__icon fa fa-street-view mr-2"></i> {this.props.titulo} </ModalHeader>

          <form onSubmit={this.props.FormSubmit}>
            <ModalBody>

            <div className="row">
              <div className="col-md-4">
                      <input
                        type="hidden"
                        name="customer_id"
                        value={this.props.formAutocomplete.customer_id}
                      />
                      <label>Cliente <small className="validate-label">*</small></label>
                      <Select
                        onChange={this.props.onChangeAutocomplete}
                        options={this.props.clientes}
                        autoFocus={false}
                        className={`link-form ${this.props.errorValues == false && this.props.formValues.cliente == "" ? "error-class" : ""}`}
                        value={this.props.formAutocomplete}
                      />
                </div>

                  <div className="col-md-4">
                    <input
                        type="hidden"
                        name="contact_id"
                        value={this.props.formAutocompleteContact.contact_id}
                      />
                      <label>Contacto <small className="validate-label">*</small></label>
                      <Select
                        onChange={this.props.onChangeAutocompleteContact}
                        options={this.props.contacto}
                        autoFocus={false}
                        className={`link-form ${this.props.errorValues == false && this.props.formValues.cliente == "" ? "error-class" : ""}`}
                        value={this.props.formAutocompleteContact}
                      />

                  </div>

                  <div className="col-md-4">
                    <label>Tipo de Servicio <small className="validate-label">*</small></label>
                      <select name="service_type" 
                          className={`form form-control ${this.props.errorValues == false && this.props.formValues.service_type == "" ? "error-class" : ""}`}
                          value={this.props.formValues.service_type}
                          onChange={this.props.onChangeForm}
                        >
                          <option value="">Seleccione un tipo</option>
                          <option value="Venta">Venta</option>
                          <option value="Proyecto">Proyecto</option>
                      </select> 
                  </div>


                  <div className="col-md-12 mt-4">
                  <label>Descripción <small className="validate-label">*</small></label>
                    <textarea 
                      name="description"
                      className={`form form-control ${this.props.errorValues == false && this.props.formValues.description == "" ? "error-class" : ""}`}
                      value={this.props.formValues.description}
                      onChange={this.props.onChangeForm}
                      rows="5"
                      placeholder="Descripción"
                    /> 
                  </div>

                  <div className="col-md-4 mt-4">
                    <label>Fecha de inicio <small className="validate-label">*</small></label>
                      <input
                        type="date"
                        name="start_date"
                        value={this.props.formValues.start_date}
                        onChange={this.props.onChangeForm}
                        className={`form form-control ${this.props.errorValues == false && this.props.formValues.start_date == "" ? "error-class" : ""}`}
                        autoComplete="off"
                      />
                  </div>

                  <div className="col-md-4 mt-4">
                    <label>Fecha final <small className="validate-label">*</small></label>
                      <input
                        type="date"
                        name="end_date"
                        value={this.props.formValues.end_date}
                        onChange={this.props.onChangeForm}
                        className={`form form-control ${this.props.errorValues == false && this.props.formValues.end_date == "" ? "error-class" : ""}`}
                        autoComplete="off"
                      />
                  </div>

                  <div className="col-md-4 mt-4">
                  <label>Número de cotización <small className="validate-label">*</small></label>
                    <NumberFormat 
                      name="quotation_number"
                      thousandSeparator={true} 
                      prefix={'$'} 
                      className={`form form-control ${this.props.errorValues == false && this.props.formValues.quotation_number == "" ? "error-class" : ""}`}
                      value={this.props.formValues.quotation_number}
                      onChange={this.props.onChangeForm}
                      placeholder="Valor monetario"
                    /> 
                  </div>


                  <div className="col-md-4 mt-4">
                  <label>Valor cotización<small className="validate-label">*</small></label>
                    <NumberFormat 
                      name="quotation_value"
                      thousandSeparator={true} 
                      prefix={'$'} 
                      className={`form form-control ${this.props.errorValues == false && this.props.formValues.quotation_value == "" ? "error-class" : ""}`}
                      value={this.props.formValues.quotation_value}
                      onChange={this.props.onChangeForm}
                      placeholder="Valor monetario"
                    /> 
                  </div>

                  <div className="col-md-4 mt-4">
                  <label>Horas de ingeniería <small className="validate-label">*</small></label>
                    <input 
                      name="eng_hours"
                      type="number"
                      className={`form form-control ${this.props.errorValues == false && this.props.formValues.eng_hours == "" ? "error-class" : ""}`}
                      value={this.props.formValues.eng_hours}
                      onChange={this.props.onChangeForm}
                      placeholder="Valor monetario"
                    /> 
                  </div>

                  <div className="col-md-4 mt-4">
                  <label>Valor de viaticos <small className="validate-label">*</small></label>
                    <NumberFormat 
                      name="viatic_value"
                      thousandSeparator={true} 
                      prefix={'$'} 
                      className={`form form-control ${this.props.errorValues == false && this.props.formValues.viatic_value == "" ? "error-class" : ""}`}
                      value={this.props.formValues.viatic_value}
                      onChange={this.props.onChangeForm}
                      placeholder="Valor monetario"
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
