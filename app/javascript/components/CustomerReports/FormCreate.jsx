import React from "react";
import {Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import NumberFormat from 'react-number-format';
import Select from "react-select";

class FormCreate extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      option: [{ label: "nombre", value: "sdaasdadasd"}, { label: "nombre", value: "sdaasdadasd"}]
    }

    console.log(this.props.editValuesReport)

  }

  render() {
    return (
      <React.Fragment>
        <Modal returnFocusAfterClose={true} isOpen={this.props.modal} className="modal-lg modal-dialog-centered" toggle={this.props.toggle} backdrop={this.props.backdrop}>
          <ModalHeader className="title-modal" toggle={this.props.toggle}> <i className="app-menu__icon fa fa-street-view mr-2"></i> {this.props.titulo} </ModalHeader>

          <form onSubmit={this.props.FormSubmit}>
            <ModalBody>

            <div className="row">
                <div className="col-md-6">
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
                
                <div className="col-md-6">
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
                        className={`link-form ${this.props.errorValues == false && this.props.formValues.customer_id == "" ? "error-class" : ""}`}
                        value={this.props.formAutocompleteCentro}
                      />
                  </div>

                  <div className="col-md-6 mt-3 mb-3">
                      <input
                        type="hidden"
                        name="contact_id"
                        value={this.props.formAutocompleteContact.contact_id}
                      />
                      <label>Aprueba el Reporte <small className="validate-label">*</small></label>
                      <Select
                        onChange={this.props.onChangeAutocompleteContact}
                        options={this.props.contacts}
                        autoFocus={false}
                        className={`link-form ${this.props.errorValues == false && this.props.formValues.contact_id == "" ? "error-class" : ""}`}
                        value={this.props.formAutocompleteContact}
                      />
                  </div>

                  <div className="col-md-6 mt-3 mb-3">
                  <label>Fecha del reporte <small className="validate-label">*</small></label>
                    <input 
                      name="report_date"
                      type="date"
                      className={`form form-control ${this.props.errorValues == false && this.props.formValues.report_date == "" ? "error-class" : ""}`}
                      value={this.props.formValues.report_date}
                      onChange={this.props.onChangeForm}
                    /> 
                  </div>

                  <div className="col-md-12">
                    <input
                        type="hidden"
                        name="report_ids"
                        value={this.props.formAutocompleteReport.report_ids}
                      />
                      <label>Reportes <small className="validate-label">*</small></label>
                      <Select
                        onChange={this.props.onChangeAutocompleteReports}
                        isMulti
                        closeMenuOnSelect={false}
                        name="report_ids"
                        defaultValue={[this.props.editValuesReport[0], this.props.editValuesReport[1]]}
                        options={this.props.reports}
                        className="basic-multi-select"
                        classNamePrefix="select"
                      />
                  </div>


                  <div className="col-md-12 mt-4">
                  <label>Observaciones<small className="validate-label">*</small></label>
                    <textarea 
                      name="description"
                      rows="6"
                      className={`form form-control ${this.props.errorValues == false && this.props.formValues.money_value == "" ? "error-class" : ""}`}
                      value={this.props.formValues.description}
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
