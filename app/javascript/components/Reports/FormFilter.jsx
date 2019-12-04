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
                   <label>Descripcion del trabajo</label>
                    <input
                      className="form form-control"
                      type="text"
                      name="work_description"
                      placeholder="Descripcion del trabajo"
                      onChange={this.props.onChangeFilter}
                      value={this.props.formValuesFilter.work_description}
                    />
                  </div>

                  <div className="col-md-3 imput-filter">
                    <label>Responsable Ejecucion</label>
                      <select name="report_execute_id" 
                        className="form form-control"
                        onChange={this.props.onChangeFilter}
                        value={this.props.formValuesFilter.report_execute_id}
                      >
                        <option value="">Seleccione un ingreso</option>
                        {
                          this.props.users.map(item => (
                              <React.Fragment>
                                  <option value={item.id}>{item.names}</option>
                              </React.Fragment>
                          ))
                        }
                      </select>
                    </div>

                
                  
                  <div className="col-md-3 imput-filter">
                  <label>Fecha de inicio</label>
                    <input
                      className="form form-control"
                      type="date"
                      name="date_ejecution"
                      onChange={this.props.onChangeFilter}
                      value={this.props.formValuesFilter.date_ejecution}
                    />
                  </div>

                  <div className="col-md-3 imput-filter">
                  <label>Estado de reporte</label>
                    <select 
                        name="report_sate" 
                        className="form form-control"
                        onChange={this.props.onChangeFilter}
                        value={this.props.formValuesFilter.report_sate}
                    >   
                        <option value="">Seleccione un estado</option>
                        <option value="Aprobado">Aprobado</option>
                        <option value="Si Aprobado">Si Aprobado</option>
                    </select>
                  </div>
                  
                  <div className="col-md-3 imput-filter mt-3">
                    <label>Centro de costo</label>
                      <select name="cost_center_id" 
                        className="form form-control"
                        onChange={this.props.onChangeFilter}
                        value={this.props.formValuesFilter.cost_center_id}
                      >
                        <option value="">Seleccione un ingreso</option>
                        {
                          this.props.cost_centers.map(item => (
                              <React.Fragment>
                                  <option value={item.id}>{item.code}</option>
                              </React.Fragment>
                          ))
                        }
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
