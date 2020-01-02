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
                <label>Centro de costo</label>

                <input
                        type="hidden"
                        name="cost_center_id"
                        value={this.props.formAutocompleteCentro.cost_center_id}
                      />
                      <Select
                        onChange={this.props.onChangeAutocompleteCentro}
                        options={this.props.centro}
                        autoFocus={false}
                        className={`link-form ${this.props.errorValues == false && this.props.formValues.cost_center_id == "" ? "error-class" : ""}`}
                        value={this.props.formAutocompleteCentro}
                      />
                </div>

                <div className="col-md-3 imput-filter">
                    <label>Cliente</label>
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

                <div className="col-md-3">
                <label>Estado</label>

                      <select name="state" 
                        className="form form-control"
                        onChange={this.props.onChangeFilter}
                        value={this.props.formValuesFilter.state}
                      >
                        <option value="">Seleccione un estado</option>
                        <option value="Aprobado">Aprobado</option>
                        <option value="Enviado al Cliente">Enviado al Cliente</option>

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
