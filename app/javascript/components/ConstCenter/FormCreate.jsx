import React from "react";
import {Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import NumberFormat from 'react-number-format';
import Select from "react-select";

class FormCreate extends React.Component {
  constructor(props) {
    super(props);
  }

  getChangeInput = () =>{
    if (this.props.formValues.service_type == "SERVICIO") {
      return this.services()
    }else if(this.props.formValues.service_type == "VENTA"){
      return this.sale()
    }else if(this.props.formValues.service_type == "PROYECTO"){
      return this.draft()
    }
       
        
  }

  services = () => { //servic
      return(
        <React.Fragment>
          <div className="col-md-4">
            <label>Horas ingeniería <small className="validate-label">*</small></label>

            <input 
              name="eng_hours"
              type="text"
              className={`form form-control ${this.props.errorValues == false && this.props.formValues.eng_hours == "" ? "error-class" : ""}`}
              value={this.props.formValues.eng_hours}
              onChange={this.props.onChangeForm}
              placeholder="Horas ingeniería"
            /> 
          </div>

          {this.props.estados.show_hours == true && (
            <div className="col-md-4">
              <label>Valor hora costo <small className="validate-label">*</small></label>

              <NumberFormat 
                name="hour_real"
                thousandSeparator={true} 
                prefix={'$'} 
                className={`form form-control ${this.props.errorValues == false && this.props.formValues.hour_real == "" ? "error-class" : ""}`}
                value={this.props.formValues.hour_real}
                onChange={this.props.onChangeForm}
                placeholder="Valor hora costo"
              /> 
            </div>
          )}

          <div className="col-md-4">
            <label>Hora valor cotizada<small className="validate-label">*</small></label>

            <NumberFormat 
              name="hour_cotizada"
              thousandSeparator={true} 
              prefix={'$'} 
              className={`form form-control ${this.props.errorValues == false && this.props.formValues.hour_cotizada == "" ? "error-class" : ""}`}
              value={this.props.formValues.hour_cotizada}
              onChange={this.props.onChangeForm}
              placeholder="Hora valor cotizada"
            /> 
          </div>

          {/* HR */}
            <div className="col-md-12 mt-4 mb-4">
              <hr/>
            </div>
          {/* HR */}

          <div className="col-md-6">
                  <label>Horas de desplazamiento<small className="validate-label">*</small></label>
                  <input 
                      name="displacement_hours"
                      type="number"
                      className={`form form-control ${this.props.errorValues == false && this.props.formValues.displacement_hours == "" ? "error-class" : ""}`}
                      value={this.props.formValues.displacement_hours}
                      onChange={this.props.onChangeForm}
                      placeholder="Horas de desplazamiento"
                    /> 

                    
                  </div>

                  <div className="col-md-6">
                  <label>Valor hora de desplazamiento<small className="validate-label">*</small></label>
                    <NumberFormat 
                      name="value_displacement_hours"
                      thousandSeparator={true} 
                      prefix={'$'} 
                      className={`form form-control ${this.props.errorValues == false && this.props.formValues.value_displacement_hours == "" ? "error-class" : ""}`}
                      value={this.props.formValues.value_displacement_hours}
                      onChange={this.props.onChangeForm}
                      placeholder="Valor hora de desplazamiento"
                    /> 
                  </div>
          {/* HR */}
          <div className="col-md-12 mt-4 mb-4">
              <hr/>
            </div>
          {/* HR */}
          <div className="col-md-4">
            <label>Valor Viaticos<small className="validate-label">*</small></label>
            <NumberFormat 
              name="viatic_value"
              thousandSeparator={true} 
              prefix={'$'} 
              className={`form form-control ${this.props.errorValues == false && this.props.formValues.viatic_value == "" ? "error-class" : ""}`}
              value={this.props.formValues.viatic_value}
              onChange={this.props.onChangeForm}
              placeholder="Valor Viaticos"
            /> 
          </div>

          <div className="col-md-4">
              <label>Total Cotizacion<small className="validate-label">*</small></label>

              <NumberFormat 
                name="quotation_value"
                thousandSeparator={true} 
                prefix={'$'} 
                className={`form form-control ${this.props.errorValues == false && this.props.formValues.quotation_value == "" ? "error-class" : ""}`}
                value={this.props.formValues.quotation_value}
                onChange={this.props.onChangeForm}
                placeholder="Total Cotizacion"
              /> 
            </div>
        </React.Fragment>
      )
  }

  sale = () => { //venta
      return(
        <React.Fragment>
          <div className="col-md-4">
            <label>Valor materiales <small className="validate-label">*</small></label>

            <NumberFormat 
              name="materials_value"
              thousandSeparator={true} 
              prefix={'$'} 
              className={`form form-control ${this.props.errorValues == false && this.props.formValues.materials_value == "" ? "error-class" : ""}`}
              value={this.props.formValues.materials_value}
              onChange={this.props.onChangeForm}
              placeholder="Valor materiales"
            />
             
          </div>

          {this.props.formValues.service_type == "PROYECTO" ? <div className="col-md-12 mt-4 mb-4"> <hr/> </div> : ""}


            <div className="col-md-4">
              <label>Total Cotizacion<small className="validate-label">*</small></label>

              <NumberFormat 
                name="quotation_value"
                thousandSeparator={true} 
                prefix={'$'} 
                className={`form form-control ${this.props.errorValues == false && this.props.formValues.quotation_value == "" ? "error-class" : ""}`}
                value={this.props.formValues.quotation_value}
                onChange={this.props.onChangeForm}
                placeholder="Total Cotizacion"
              /> 
            </div>

        </React.Fragment>
      )
      //cuando es venta solo muestra horas de ingeria,  Valor Viaticos Total Cotizacion, 
  }

  draft = () => { //proyecto
      return(
        <React.Fragment>
<div className="col-md-4">
                  <label>Horas ingeniería <small className="validate-label">*</small></label>
                    <input 
                      name="eng_hours"
                      type="text"
                      className={`form form-control ${this.props.errorValues == false && this.props.formValues.eng_hours == "" ? "error-class" : ""}`}
                      value={this.props.formValues.eng_hours}
                      onChange={this.props.onChangeForm}
                      placeholder="Horas ingeniería"
                    /> 
                  </div>

                {this.props.estados.show_hours == true && (
                  <div className="col-md-4">
                  <label>Valor hora costo <small className="validate-label">*</small></label>
                    <NumberFormat 
                      name="hour_real"
                      thousandSeparator={true} 
                      prefix={'$'} 
                      className={`form form-control ${this.props.errorValues == false && this.props.formValues.hour_real == "" ? "error-class" : ""}`}
                      value={this.props.formValues.hour_real}
                      onChange={this.props.onChangeForm}
                      placeholder="Valor hora costo"
                    /> 
                  </div>
                )}

                  <div className="col-md-4">
                  <label>Hora valor cotizada<small className="validate-label">*</small></label>
                    <NumberFormat 
                      name="hour_cotizada"
                      thousandSeparator={true} 
                      prefix={'$'} 
                      className={`form form-control ${this.props.errorValues == false && this.props.formValues.hour_cotizada == "" ? "error-class" : ""}`}
                      value={this.props.formValues.hour_cotizada}
                      onChange={this.props.onChangeForm}
                      placeholder="Hora valor cotizada"
                    /> 
                  </div>

                  {/* HR */}
                    <div className="col-md-12 mt-4 mb-4">
                      <hr/>
                    </div>
                  {/* HR */}

                  <div className="col-md-4">
                  <label>Horas tablerista <small className="validate-label">*</small></label>
                    <input 
                      name="hours_contractor"
                      type="text"
                      className={`form form-control ${this.props.errorValues == false && this.props.formValues.hours_contractor == "" ? "error-class" : ""}`}
                      value={this.props.formValues.hours_contractor}
                      onChange={this.props.onChangeForm}
                      placeholder="Horas tablerista"
                    /> 
                  </div>

                  {this.props.estados.show_hours == true && (
                    <div className="col-md-4">
                    <label>Valor hora Costo<small className="validate-label">*</small></label>
                      <NumberFormat 
                        name="hours_contractor_real"
                        thousandSeparator={true} 
                        prefix={'$'} 
                        className={`form form-control ${this.props.errorValues == false && this.props.formValues.hours_contractor_real == "" ? "error-class" : ""}`}
                        value={this.props.formValues.hours_contractor_real}
                        onChange={this.props.onChangeForm}
                        placeholder="Valor hora Costo"
                      /> 
                    </div>
                  )}
                

                  <div className="col-md-4">
                  <label>Valor hora cotizada<small className="validate-label">*</small></label>
                    <NumberFormat 
                      name="hours_contractor_invoices"
                      thousandSeparator={true} 
                      prefix={'$'} 
                      className={`form form-control ${this.props.errorValues == false && this.props.formValues.hours_contractor_invoices == "" ? "error-class" : ""}`}
                      value={this.props.formValues.hours_contractor_invoices}
                      onChange={this.props.onChangeForm}
                      placeholder="Valor hora cotizada"
                    /> 
                  </div>


                  {/* HR */}
                    <div className="col-md-12 mt-4 mb-4">
                      <hr/>
                    </div>
                  {/* HR */}
                  

                  <div className="col-md-6">
                  <label>Horas de desplazamiento<small className="validate-label">*</small></label>
                  <input 
                      name="displacement_hours"
                      type="number"
                      className={`form form-control ${this.props.errorValues == false && this.props.formValues.displacement_hours == "" ? "error-class" : ""}`}
                      value={this.props.formValues.displacement_hours}
                      onChange={this.props.onChangeForm}
                      placeholder="Horas de desplazamiento"
                    /> 
                  </div>
                  {this.props.estados.show_hours == true && (
                  <div className="col-md-6">
                  <label>Valor hora de desplazamiento<small className="validate-label">*</small></label>
                    <NumberFormat 
                      name="value_displacement_hours"
                      thousandSeparator={true} 
                      prefix={'$'} 
                      className={`form form-control ${this.props.errorValues == false && this.props.formValues.value_displacement_hours == "" ? "error-class" : ""}`}
                      value={this.props.formValues.value_displacement_hours}
                      onChange={this.props.onChangeForm}
                      placeholder="Valor hora de desplazamiento"
                    /> 
                  </div>
                   )}

                  {/* HR */}
                  <div className="col-md-12 mt-4 mb-4">
                     <hr/>
                  </div>
                  {/* HR */}

                  <div className="col-md-4">
                  <label>Valor materiales <small className="validate-label">*</small></label>
                    <NumberFormat 
                      name="materials_value"
                      thousandSeparator={true} 
                      prefix={'$'} 
                      className={`form form-control ${this.props.errorValues == false && this.props.formValues.materials_value == "" ? "error-class" : ""}`}
                      value={this.props.formValues.materials_value}
                      onChange={this.props.onChangeForm}
                      placeholder="Valor materiales"
                    /> 
                  </div>

                  <div className="col-md-4">
                  <label>Valor Viaticos<small className="validate-label">*</small></label>
                    <NumberFormat 
                      name="viatic_value"
                      thousandSeparator={true} 
                      prefix={'$'} 
                      className={`form form-control ${this.props.errorValues == false && this.props.formValues.viatic_value == "" ? "error-class" : ""}`}
                      value={this.props.formValues.viatic_value}
                      onChange={this.props.onChangeForm}
                      placeholder="Valor Viaticos"
                    /> 
                  </div>

                  <div className="col-md-4">
                  <label>Total Cotizacion<small className="validate-label">*</small></label>
                    <NumberFormat 
                      name="quotation_value"
                      thousandSeparator={true} 
                      prefix={'$'} 
                      className={`form form-control ${this.props.errorValues == false && this.props.formValues.quotation_value == "" ? "error-class" : ""}`}
                      value={this.props.formValues.quotation_value}
                      onChange={this.props.onChangeForm}
                      placeholder="Total Cotizacion"
                    /> 
                  </div>
        </React.Fragment>
      )
    //cuando es PROYECTO ,muestra materiales, total cotizacion, cuando es proyecto si deja todo, el show tambien 
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
                    <label>Tipo de Servicio <small className="validate-label">*</small></label>
                      <select name="service_type" 
                          className={`form form-control ${this.props.errorValues == false && this.props.formValues.service_type == "" ? "error-class" : ""}`}
                          value={this.props.formValues.service_type}
                          onChange={this.props.onChangeForm}
                          disabled={this.props.modeEdit == true ? true : false}
                        >
                          <option value="">Seleccione un tipo</option>
                          <option value="SERVICIO">SERVICIO</option>
                          <option value="VENTA">VENTA</option>
                          <option value="PROYECTO">PROYECTO</option>
                      </select> 
                  </div>


                  <div className="col-md-12 mt-4">
                  <label>Descripción</label>
                    <textarea 
                      name="description"
                      className={`form form-control`}
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
                    <input 
                      name="quotation_number"
                      className={`form form-control ${this.props.errorValues == false && this.props.formValues.quotation_number == "" ? "error-class" : ""}`}
                      value={this.props.formValues.quotation_number}
                      onChange={this.props.onChangeForm}
                      placeholder="Número de cotización"
                    /> 
                  </div>


                  {/* HR */}
                    <div className="col-md-12 mt-4 mb-4">
                      <hr/>
                    </div>
                  {/* HR */}

                  {
                    /*#venta o proyecto, los centros de costos, en materiales, en tableristas proyectos, reportes proyectos y servicios 
                    #cuando es servicio solo muestra horas ingeneria, 
                    cuando es venta solo muestra horas de ingeria,  Valor Viaticos Total Cotizacion, 
                    cuando es PROYECTO ,muestra materiales, total cotizacion, cuando es proyecto si deja todo, el show tambien 
                  */}

                {this.props.formValues.service_type != "" && (
                  <React.Fragment>
                    {this.getChangeInput()}
                  </React.Fragment>
                )}

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
