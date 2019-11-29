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
