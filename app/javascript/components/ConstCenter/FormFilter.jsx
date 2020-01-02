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

                <div className="col-md-3">
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

                  <div className="col-md-3 imput-filter">
                    <label>Escribir cliente? <input type="checkbox" onChange={this.props.onChangeCheckBox} name="vehicle2" value={this.props.showInput == true ? false : true}/> </label>
                    {this.props.showInput == true ? (
                      <React.Fragment>
                        <input
                          className="form form-control"
                          type="text"
                          name="cliente_name"
                          placeholder="Nombre del ciente"
                          onChange={this.props.onChangeFilter}
                          value={this.props.formValuesFilter.cliente_name}
                        />
                      </React.Fragment>
                      ) : (
                      <React.Fragment>
                        <select name="customer_id" 
                          className="form form-control"
                          onChange={this.props.onChangeFilter}
                          value={this.props.formValuesFilter.customer_id}
                        >
                          <option value="">Seleccione un ingreso</option>
                          {
                            this.props.clientes.map(item => (
                                <React.Fragment>
                                    <option value={item.id}>{item.name}</option>
                                </React.Fragment>
                            ))
                          }
                        </select>
                      </React.Fragment>
                    )}  
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
                        <option value="LEGALIZADO">LEGALIZADO</option>
                        <option value="POR FACTURAR">POR FACTURAR</option>
                        <option value="PENDIENTE DE ORDEN DE COMPRA">PENDIENTE DE ORDEN DE COMPRA</option>
                    </select>
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
