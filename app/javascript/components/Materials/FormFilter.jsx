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
                    <label>Proveedor</label>
                      <select name="provider_id" 
                        className="form form-control"
                        onChange={this.props.onChangeFilter}
                        value={this.props.formValuesFilter.provider_id}
                      >
                        <option value="">Seleccione un proveedor</option>
                        {
                          this.props.providers.map(item => (
                              <React.Fragment>
                                  <option value={item.id}>{item.name}</option>
                              </React.Fragment>
                          ))
                        }
                      </select>
                </div>

                <div className="col-md-3">
                   <label>Descripcion</label>
                    <input
                      className="form form-control"
                      type="text"
                      name="description"
                      placeholder="Descripcion"
                      onChange={this.props.onChangeFilter}
                      value={this.props.formValuesFilter.description}
                    />
                </div>

                <div className="col-md-3">
                   <label>Fecha de Orden</label>
                    <input
                      className="form form-control"
                      type="date"
                      name="sales_date"
                      onChange={this.props.onChangeFilter}
                      value={this.props.formValuesFilter.sales_date}
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

                  <div className="col-md-3 imput-filter mt-3">
                    <label>Estado de compra</label>
                      <select 
                        name="estado" 
                        className="form form-control"
                        onChange={this.props.onChangeFilter}
                        value={this.props.formValuesFilter.estado}
                      >
                        <option value="">Seleccione un estado</option>
                        <option value="PROCESADO">PROCESADO</option>
                        <option value="INGRESADO TOTAL">INGRESADO TOTAL</option>
                        <option value="INGRESADO CON MAYOR VALOR EN FACTURA">INGRESADO CON MAYOR VALOR EN FACTURA</option>
                        <option value="INGRESADO PARCIAL">INGRESADO PARCIAL</option>

                      </select>
                </div>

                <div className="col-md-3 imput-filter mt-3">
                  <label>Fecha desde</label>
                    <input
                      className="form form-control"
                      type="date"
                      name="date_desde"
                      onChange={this.props.onChangeFilter}
                      value={this.props.formValuesFilter.date_desde}
                    />
                  </div>

                  <div className="col-md-3 imput-filter mt-3">
                  <label>Fecha hasta</label>
                    <input
                      className="form form-control"
                      type="date"
                      name="date_hasta"
                      onChange={this.props.onChangeFilter}
                      value={this.props.formValuesFilter.date_hasta}
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
