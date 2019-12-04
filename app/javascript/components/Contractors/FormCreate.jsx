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
        <Modal isOpen={this.props.modal} toggle={this.props.toggle} className="modal-dialog-centered" backdrop={this.props.backdrop}>
          <ModalHeader className="title-modal"  toggle={this.props.toggle}><i className="fas fa-money-check-alt mr-2"></i> {this.props.titulo}</ModalHeader>
          <form onSubmit={this.props.FormSubmit}>
            <ModalBody>
              <div className="row">

              <div className="col-md-6 mb-4">
                <label>Fecha<small className="validate-label">*</small></label>
                  <input
                    type="date"
                    name="sales_date"
                    value={this.props.formValues.sales_date}
                    onChange={this.props.onChangeForm}
                    className={`form form-control ${this.props.errorValues == false && this.props.formValues.sales_date == "" ? "error-class" : ""}`}
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
                        className={`link-form`}
                        value={this.props.formAutocompleteCentro}
                      />
                  </div>
              

                                
                <div className="col-md-6 mb-4">
                <label>Horas trabajadas<small className="validate-label">*</small></label>
                  <input
                    type="text"
                    name="hours"
                    value={this.props.formValues.hours}
                    onChange={this.props.onChangeForm}
                    className={`form form-control ${this.props.errorValues == false && this.props.formValues.hours == "" ? "error-class" : ""}`}
                    placeholder="Horas trabajadas"
                  />
                </div>

                <div className="col-md-6">
                      <input
                        type="hidden"
                        name="user_execute_id"
                        value={this.props.formAutocompleteUsers.user_execute_id}
                      />
                      <label>Horas trabajadas por <small className="validate-label">*</small></label>
                      <Select
                        onChange={this.props.onChangeAutocompleteUsers}
                        options={this.props.users}
                        autoFocus={false}
                        className={`link-form`}
                        value={this.props.formAutocompleteUsers}
                      />
                  </div>


                <div className="col-md-12 mt-3">
                <label>Descripcion</label>
                  <textarea 
                    name="description"
                    className={`form form-control`}
                    value={this.props.formValues.description}
                    onChange={this.props.onChangeForm}
                    placeholder="Descripcion.."
                    rows="4"
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

