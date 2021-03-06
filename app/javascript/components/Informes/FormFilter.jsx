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

                <div className="col-md-6">
                      <input
                        type="hidden"
                        name="cost_center_id"
                        value={this.props.formAutocompleteCentro.cost_center_id}
                      />
                      <label>Centro de costo (<input type="radio" onChange={this.props.handleChangeCheckCentro} checked={this.props.formValuesFilter.centro_incluido == "Excluidos"} value="Excluidos" /> Excluidos <input type="radio" onChange={this.props.handleChangeCheckCentro} checked={this.props.formValuesFilter.centro_incluido == "Incluidos" ? true : false} value="Incluidos" /> Incluidos) <small className="validate-label">*</small></label>
                      <Select
                        onChange={this.props.onChangeAutocompleteCentro}
                        options={this.props.centro}
                        isMulti
                        closeMenuOnSelect={false}
                        autoFocus={false}
                        className={`link-form`}
                        classNamePrefix="select"
                        name="cost_center_id"
                      />
                  </div>

                  {/*this.props.formValuesFilter.cliente_incluido*/}
                  {/*this.props.formValuesFilter.centro_incluido*/}

                  <div className="col-md-6 mt-2 imput-filter">
                    <label>Clientes (<input type="radio" onChange={this.props.handleChangeCheckClientes} checked={this.props.formValuesFilter.cliente_incluido == "Excluidos"} value="Excluidos" /> Excluidos <input type="radio" onChange={this.props.handleChangeCheckClientes} checked={this.props.formValuesFilter.cliente_incluido == "Incluidos"} value="Incluidos"/> Incluidos)</label>
                      <input
                        type="hidden"
                        name="customer_id"
                        value={this.props.formAutocompleteCustomer.customer_id}
                      />
                      <Select
                        onChange={this.props.onChangeAutocompleteCustomer}
                        options={this.props.clientes}
                        isMulti
                        closeMenuOnSelect={false}
                        autoFocus={false}
                        className={`link-form`}
                        classNamePrefix="select"
                        name="customer_id"
                      />
                    </div>
                  </div>
                 
                <div className="row mt-3">

                    <div className="col-md-4 imput-filter">
                      <label>Tipo</label>
                        <input
                          type="hidden"
                          name="service_type"
                          value={this.props.formAutocompleteType.service_type}
                        />
                        <Select
                          onChange={this.props.onChangeAutocompleteType}
                          options={this.props.dataType}
                          isMulti
                          closeMenuOnSelect={false}
                          autoFocus={false}
                          className={`link-form`}
                          classNamePrefix="select"
                          name="service_type"
                        />

                        {/*<select 
                            name="service_type" 
                            className="form form-control"
                            onChange={ this.props.onChangeFilter }
                            value={ this.props.formValuesFilter.service_type }
                            >   
                            <option value="">Seleccione un estado</option>
                            <option value="PROYECTO">PROYECTO</option>
                            <option value="SERVICIO">SERVICIO</option>
                            <option value="VENTA">VENTA</option>
                        </select>*/}
                    </div>

                    <div className="col-md-4 imput-filter">
                      <label>Estado de ejecución</label>
                        <input
                          type="hidden"
                          name="execution_state"
                          value={this.props.formAutocompleteEjecucion.execution_state}
                        />
                        <Select
                          onChange={this.props.onChangeAutocompleteEjecucion}
                          options={this.props.dataEjecucion}
                          isMulti
                          closeMenuOnSelect={false}
                          autoFocus={false}
                          className={`link-form`}
                          classNamePrefix="select"
                          name="execution_state"
                        />

                        {/*<select 
                            name="execution_state" 
                            className="form form-control"
                            onChange={this.props.onChangeFilter}
                            value={this.props.formValuesFilter.execution_state}
                        >   
                            <option value="">Seleccione un estado</option>
                            <option value="FINALIZADO">FINALIZADO</option>
                            <option value="PENDIENTE">PENDIENTE</option>
                            <option value="EJECUCION">EJECUCION</option>
                        </select>*/}
                    </div>


                    <div className="col-md-4 imput-filter">
                      <label>Estado facturado</label>

                        <input
                          type="hidden"
                          name="invoiced_state"
                          value={this.props.formAutocompleteFacturado.invoiced_state}
                        />
                        <Select
                          onChange={this.props.onChangeAutocompleteFacturado}
                          options={this.props.dataFacturado}
                          isMulti
                          closeMenuOnSelect={false}
                          autoFocus={false}
                          className={`link-form`}
                          classNamePrefix="select"
                          name="invoiced_state"
                        />
                      
                      {/*<select 
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
                      </select>*/}
                    </div>

                </div>
                
              
                <div className="col-md-12 mt-4">
                    <div className="row">
                      <div className="col-md-12 text-right">
                        
                        <label onClick={this.close} className="btn btn-light float-right mr-2">Cerrar filtros</label>
                        <button onClick={this.props.onClick} className="btn btn-secondary float-right mr-3">Aplicar</button>
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
