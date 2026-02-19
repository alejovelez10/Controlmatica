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
                    <label>Trabajadas por</label>
                      <select name="user_execute_id" 
                        className="form form-control"
                        onChange={this.props.onChangeFilter}
                        value={this.props.formValuesFilter.user_execute_id}
                      >
                        <option value="">Seleccione un trabajador</option>
                        {
                          this.props.users.map(item => (
                              <React.Fragment>
                                  <option value={item.id}>{item.names}</option>
                              </React.Fragment>
                          ))
                        }
                      </select>
                </div>

                {/*<div className="col-md-3">
                   <label>Fecha creacion</label>
                    <input
                      className="form form-control"
                      type="date"
                      name="sales_date"
                      onChange={this.props.onChangeFilter}
                      value={this.props.formValuesFilter.sales_date}
                    />
                      </div>*/}

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

                  <div className="col-md-5 imput-filter mt-3">
                  <label>Descripcion</label>
                    <input
                      className="form form-control"
                      type="text"
                      name="descripcion"
                      onChange={this.props.onChangeFilter}
                      value={this.props.formValuesFilter.descripcion}
                    />
                  </div>  
    
              
                <div className="col-md-12 mt-4">
                    <div className="row">
                      <div className="col-md-12 text-right">

                        <label onClick={this.close} className="btn btn-light float-right mr-2">Cerrar filtros</label>
                        <button onClick={this.props.onClick} className="btn btn-secondary float-right mr-3">Aplicar</button>
                        <button onClick={this.props.cancelFilter} className="cm-btn cm-btn-outline cm-btn-sm float-right mr-3" type="button">
                          <i className="fas fa-eraser" /> Limpiar
                        </button>
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
