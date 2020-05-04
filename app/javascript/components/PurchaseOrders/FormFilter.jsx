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
                  <label>Fecha desde</label>
                    <input
                      className="form form-control"
                      type="date"
                      name="date_desde"
                      onChange={this.props.onChangeFilter}
                      value={this.props.formValuesFilter.date_desde}
                    />
                  </div>

                  <div className="col-md-3 imput-filter">
                  <label>Fecha hasta</label>
                    <input
                      className="form form-control"
                      type="date"
                      name="date_hasta"
                      onChange={this.props.onChangeFilter}
                      value={this.props.formValuesFilter.date_hasta}
                    />
                  </div>

                  <div className="col-md-3 imput-filter">
                  <label>Numero</label>
                    <input
                      className="form form-control"
                      type="text"
                      name="number_order"
                      placeholder="Numero de orden"
                      onChange={this.props.onChangeFilter}
                      value={this.props.formValuesFilter.number_order}
                    />
                  </div>
                  
                  <div className="col-md-3">
                      <input
                        type="hidden"
                        name="cost_center_id"
                        value={this.props.formAutocompleteCentro.cost_center_id}
                      />
                      <label>Centro de costo </label>
                      <Select
                        onChange={this.props.onChangeAutocompleteCentro}
                        options={this.props.centro}
                        autoFocus={false}
                        className={`link-form ${this.props.errorValues == false && this.props.formValues.cost_center_id == "" ? "error-class" : ""}`}
                        value={this.props.formAutocompleteCentro}
                      />
                  </div>

                  <div className="col-md-3 imput-filter mt-3">
                  <label>Estado de centro de costo</label>
                    <select 
                        name="state" 
                        className="form form-control"
                        onChange={this.props.onChangeFilter}
                        value={this.props.formValuesFilter.state}
                    >   
                        <option value="">Seleccione un estado</option>
                        <option value="LEGALIZADO">LEGALIZADO</option>
                        <option value="FACTURADO">FACTURADO</option>
                        <option value="FACTURADO PARCIAL">FACTURADO PARCIAL</option>
                        <option value="PENDIENTE DE ORDEN DE COMPRA">PENDIENTE DE ORDEN DE COMPRA</option>
                        <option value="PENDIENTE DE COTIZACION">PENDIENTE DE COTIZACION</option>
                        <option value="LEGALIZADO PARCIAL">LEGALIZADO PARCIAL</option>
                    </select>
                  </div>

                  <div className="col-md-3 imput-filter mt-3">
                  <label>Descripción</label>
                    <input
                      className="form form-control"
                      type="text"
                      name="description"
                      placeholder="Descripción..."
                      onChange={this.props.onChangeFilter}
                      value={this.props.formValuesFilter.description}
                    />
                  </div>

                  <div className="col-md-3 imput-filter mt-3">
                    <label>Clientes</label>
                      <input
                        type="hidden"
                        name="customer"
                        value={this.props.formAutocompleteCustomer.customer}
                      />
                      <Select
                        options={this.props.clientes}
                        autoFocus={false}
                        className={`link-form`}
                        onChange={this.props.onChangeAutocompleteCustomer}
                        value={this.props.formAutocompleteCustomer}
                      />
                  </div>

                  <div className="col-md-3 mt-3">
                  <label>Numero de factura</label>
                    <input
                      className="form form-control"
                      type="text"
                      name="number_invoice"
                      placeholder="Numero de factura"
                      onChange={this.props.onChangeFilter}
                      value={this.props.formValuesFilter.number_invoice}
                    />
                  </div>

                  <div className="col-md-3 mt-3">
                  <label>Numero de cotización</label>
                    <input
                      className="form form-control"
                      type="text"
                      name="quotation_number"
                      placeholder="Numero de cotización"
                      onChange={this.props.onChangeFilter}
                      value={this.props.formValuesFilter.quotation_number}
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
