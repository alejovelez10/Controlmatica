import React, { Component } from "react";
import Select from "react-select"

class FormFilter extends Component {
  constructor(props){
    super(props)
    this.state = {
      show_btn: false
    }
  }

  handleSubmit = (e) => {
      e.preventDefault();
      this.setState({
        show_btn: true
      })
  }

  close = () =>{
    this.props.closeFilter(true)
    this.setState({
      show_btn: false
    })
  }

  render() {
    return (
      <div className="row">
        <div className="col-md-12">
          <div className="tile">
            <div className="tile-body">
              <form onSubmit={this.handleSubmit}>
                <div className="row">
                <div className="col-md-3 imput-filter">
                  <label>Fecha Inicio (desde)</label>
                    <input
                      className="form form-control"
                      type="date"
                      name="start_date"
                      onChange={this.props.onChangeFilter}
                      value={this.props.formValuesFilter.start_date}
                    />
                  </div>

                  <div className="col-md-3 imput-filter">
                  <label>Fecha Inicio (desde)</label>
                    <input
                      className="form form-control"
                      type="date"
                      name="end_date"
                      onChange={this.props.onChangeFilter}
                      value={this.props.formValuesFilter.date_hasta}
                    />
                  </div>


                <div className="col-md-3">
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

                  <div className="col-md-3 imput-filter">
                    <label>Clientes</label>
                      <input
                        type="hidden"
                        name="customer_id"
                        value={this.props.formAutocompleteCustomer.customer_id}
                      />
                      <Select
                        options={this.props.clientes}
                        autoFocus={false}
                        className={`link-form`}
                        onChange={this.props.onChangeAutocompleteCustomer}
                        value={this.props.formAutocompleteCustomer}
                      />
                    </div>
                    </div>
                 
                    <div className="row mt-3">
           

          

                  <div className="col-md-3 imput-filter">
                  <label>Tipo</label>
                    <select 
                        name="service_type" 
                        className="form form-control"
                        onChange={ this.props.onChangeFilter }
                        value={ this.props.formValuesFilter.service_type }
                        >   
                        <option value="">Seleccione un estado</option>
                        <option value="PROYECTO">PROYECTO</option>
                        <option value="SERVICIO">SERVICIO</option>
                        <option value="VENTA">VENTA</option>
                    </select>
                  </div>
                  <div className="col-md-3 imput-filter">
                  <label>Estado de ejecución</label>
                    <select 
                        name="execution_state" 
                        className="form form-control"
                        onChange={this.props.onChangeFilter}
                        value={this.props.formValuesFilter.execution_state}
                    >   
                        <option value="">Seleccione un estado</option>
                        <option value="FINALIZADO">FINALIZADO</option>
                        <option value="PENDIENTE">PENDIENTE</option>
                        <option value="EJECUCION">EJECUCION</option>
                    </select>
                  </div>

                  <div className="col-md-3 imput-filter">
                  <label>Estado facturado</label>
                    <select 
                        name="invoiced_state" 
                        className="form form-control"
                        onChange={this.props.onChangeFilter}
                        value={this.props.formValuesFilter.invoiced_state}
                    >   
                        <option value="">Seleccione un estado</option>
                        <option value="FACTURADO">FACTURADO</option>
                        <option value="FACTURADO PARCIAL">FACTURADO PARCIAL</option>
                        <option value="LEGALIZADO">LEGALIZADO</option>
                        <option value="LEGALIZADO PARCIAL">LEGALIZADO PARCIAL</option>
                        <option value="POR FACTURAR">POR FACTURAR</option>
                        <option value="PENDIENTE DE ORDEN DE COMPRA">PENDIENTE DE ORDEN DE COMPRA</option>
                        <option value="PENDIENTE DE COTIZACION">PENDIENTE DE COTIZACION</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                   <label># Cotización</label>
                    <input
                      className="form form-control"
                      type="text"
                      name="quotation_number"
                      placeholder="# Cotización"
                      onChange={this.props.onChangeFilter}
                      value={this.props.formValuesFilter.quotation_number}
                    />
                  </div>
                  </div>
                  
                  <div className="row mt-3">
             

                  <div className="col-md-6">
                   <label>Descripcion</label>
                    <input
                      className="form form-control"
                      type="text"
                      name="descripcion"
                      placeholder="Descripcion"
                      onChange={this.props.onChangeFilter}
                      value={this.props.formValuesFilter.descripcion}
                    />
                  </div>


        



              
                <div className="col-md-12 mt-4">
                    <div className="row">
                      <div className="col-md-12 text-right">
                        
                        <label onClick={this.close} className="btn btn-light float-right mr-2">Cerrar filtros</label>
                        <button onClick={this.props.onClick} className="btn btn-secondary float-right mr-3">Aplicar</button>
                      </div>
                    </div>
                </div>

                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default FormFilter;
