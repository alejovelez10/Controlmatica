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
                        className={`link-form ${this.props.errorValues == false && this.props.formValues.customer_id == "" ? "error-class" : ""}`}
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
                        className={`link-form ${this.props.errorValues == false && this.props.formValues.contact_id == "" ? "error-class" : ""}`}
                        value={this.props.formAutocompleteContact}
                      />
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
                        className={`link-form`}
                        value={this.props.formAutocompleteCentro}
                      />
                  </div>

                  <div className="col-md-4 mt-4">
                    <label>Fecha del reporte <small className="validate-label">*</small></label>
                      <input
                        type="date"
                        name="report_date"
                        value={this.props.formValues.report_date}
                        onChange={this.props.onChangeForm}
                        className={`form form-control ${this.props.errorValues == false && this.props.formValues.report_date == "" ? "error-class" : ""}`}
                        autoComplete="off"
                      />
                  </div>

                  <div className="col-md-4 mt-4">
                    <label>Responsable de Ejecucion</label>

                    <select 
                      name="report_execute_id" 
                      value={this.props.formValues.report_execute_id}
                      onChange={this.props.onChangeForm}
                      className={`form form-control ${this.props.errorValues == false && this.props.formValues.report_execute_id == "" ? "error-class" : ""}`}
                    >
                      <option value="">Seleccione un nombre</option>
                      {
                        this.props.users.map(item => (
                            <React.Fragment>
                                <option value={item.id}>{item.names}</option>
                            </React.Fragment>
                        ))
                      }
                  </select> 
                </div>
                
                
                  <div className="col-md-4 mt-4 text-center">
                    {this.props.create_state == false && (
                        <a data-toggle="collapse" href="#collapseExample" aria-expanded="false" aria-controls="collapseExample">
                            Si no tiene contacto ingresalo manualmente
                        </a>
                    )}
                  </div>

                  {this.props.create_state == false && (
                    <div className="collapse col-md-12" id="collapseExample">
                        <div className="row">

                            <div className="col-md-12 mt-4">
                                <hr/>
                            </div>

                            <div className="col-md-4 mt-4">
                                <label>Nombre del Contacto</label>
                                <input 
                                name="contact_name"
                                type="text"
                                className={`form form-control ${this.props.errorValuesContact == false && this.props.formContactValues.contact_name == "" ? "error-class" : ""}`}
                                value={this.props.formContactValues.contact_name}
                                onChange={this.props.onChangeFormContact}
                                placeholder="Nombre del Contacto"
                                /> 
                            </div>

                            <div className="col-md-4 mt-4">
                                <label>Cargo del Contacto</label>
                                <input 
                                name="contact_position"
                                type="text"
                                className={`form form-control ${this.props.errorValuesContact == false && this.props.formContactValues.contact_position == "" ? "error-class" : ""}`}
                                value={this.props.formContactValues.contact_position}
                                onChange={this.props.onChangeFormContact}
                                placeholder="Cargo del Contacto"
                                /> 
                            </div>

                            <div className="col-md-4 mt-4">
                                <label>Telefono del Contacto</label>
                                <input 
                                name="contact_phone"
                                type="number"
                                className={`form form-control ${this.props.errorValuesContact == false && this.props.formContactValues.contact_phone == "" ? "error-class" : ""}`}
                                value={this.props.formContactValues.contact_phone}
                                onChange={this.props.onChangeFormContact}
                                placeholder="Telefono del Contacto"
                                /> 
                            </div>

                            <div className="col-md-4 mt-4">
                                <label>Email del Contacto</label>

                                <input 
                                    name="contact_email"
                                    type="email"
                                    className={`form form-control ${this.props.errorValuesContact == false && this.props.formContactValues.contact_email == "" ? "error-class" : ""}`}
                                    value={this.props.formContactValues.contact_email}
                                    onChange={this.props.onChangeFormContact}
                                    placeholder="Email del Contacto"
                                /> 

                            </div>

                            <div className="col-md-8 text-right">
                                <label className="btn btn-secondary mt-5 mb-0" onClick={this.props.FormSubmitContact}>{this.props.nameSubmit}</label>
                            </div>

                        </div>
                    </div>
                  )}

                  
                  <div className="col-md-12 mt-4">
                    <hr/>
                  </div>

                  
                  <div className="col-md-4 mt-4">
                  <label>Tiempo de Trabajo (Horas)<small className="validate-label">*</small></label>
                    <input 
                      name="working_time"
                      type="number"
                      className={`form form-control ${this.props.errorValues == false && this.props.formValues.working_time == "" ? "error-class" : ""}`}
                      value={this.props.formValues.working_time}
                      onChange={this.props.onChangeForm}
                      placeholder="Valor monetario"
                    /> 
                  </div>

                  <div className="col-md-8 mt-4">
                  <label>Descripcion del trabajo</label>
                    <textarea 
                      name="work_description"
                      className={`form form-control ${this.props.errorValues == false && this.props.formValues.work_description == "" ? "error-class" : ""}`}
                      value={this.props.formValues.work_description}
                      onChange={this.props.onChangeForm}
                      rows="5"
                      placeholder="Descripcion del trabajo"
                    /> 
                  </div>

                  <div className="col-md-12 mt-4">
                    <hr/>
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
                      placeholder="Valor de viaticos"
                    /> 
                  </div>

                  <div className="col-md-8 mt-4">
                  <label>Descripcion viaticos</label>
                    <textarea 
                      name="viatic_description"
                      className={`form form-control`}
                      value={this.props.formValues.viatic_description}
                      onChange={this.props.onChangeForm}
                      rows="5"
                      placeholder="Descripcion viaticos"
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
