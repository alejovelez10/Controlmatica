import React from "react";
import SweetAlert from 'sweetalert2-react';
import Swal from 'sweetalert2/dist/sweetalert2.js'
import NumberFormat from 'react-number-format';
import FormCreate from "../ConstCenter/FormCreate";


class tableIndex extends React.Component {
  constructor(props){
    super(props)

    this.state = {
        action: {},
        title: "Nuevo centro de costo",
        modeEdit: false,
        ErrorValues: true,
        modal: false,
        backdrop: "static",
        form: {
          customer_id: "",
          contact_id: "",
          service_type: "",
          user_id: this.props.usuario.id,
          description: "",
          start_date: "",
          end_date: "",
          quotation_number: "",
          quotation_value: "",
          eng_hours: "",
          viatic_value: "",
          execution_state: "PENDIENTE",
        },

        selectedOption: {
          customer_id: "",
          label: "Buscar cliente"
        },

        selectedOptionContact: {
          contact_id: "",
          label: "Seleccionar Contacto"
        },

        dataContact: [],
        clients: []
    }

    this.toggle = this.toggle.bind(this);

  }

  validationForm = () => {
    if (this.state.form.name != "" && 
        this.state.form.money_value != "" 
        ) {
          console.log("los campos estan llenos")
      this.setState({ ErrorValues: true })
      return true
    }else{
      console.log("los campos no se han llenado")
      this.setState({ ErrorValues: false })
      return false
      
    }
  }

  MessageSucces = (name_success, type, error_message) => {
    Swal.fire({
    position: "center",
    type: type,
    html: '<p>'  + error_message !=  undefined ? error_message : "asdasdasd"  +  '</p>',
    title: name_success,
    showConfirmButton: false,
    timer: 1500
    });
  } 


  componentDidMount(){
    let array = []

    this.props.clientes.map((item) => (
      array.push({label: item.name, value: item.id})
    ))

    this.setState({
        clients: array
    })
  
  }


  handleChangeAutocomplete = selectedOption => {
    let array = []

    fetch(`/get_client/${selectedOption.value}/centro`)
    .then(response => response.json())
    .then(data => {
      console.log(data)

      data.map((item) => (
        array.push({label: item.name, value: item.id})
      ))

      this.setState({
        dataContact: array
      })
    });

    this.setState({
      selectedOption,
      form: {
        ...this.state.form,
        customer_id: selectedOption.value
      }
    });
  };

  handleChangeAutocompleteContact = selectedOptionContact => {
    this.setState({
      selectedOptionContact,
      form: {
        ...this.state.form,
        contact_id: selectedOptionContact.value
      }
    });
  };


  handleSubmit = e => {
    e.preventDefault();
  };

  handleChange = e => {
    this.setState({
      form: {
        ...this.state.form,
        [e.target.name]: e.target.value
      }
    });
  };

  toggle(from) {
    if (from == "edit") {
      this.setState({ modeEdit: true });
    } else if (from == "new") {
      this.setState({
        modeEdit: false,
        form: {
          customer_id: "",
          contact_id: "",
          service_type: "",
          description: "",
          start_date: "",
          end_date: "",
          quotation_number: "",
          quotation_value: "",
          eng_hours: "",
          viatic_value: "",
          user_id: this.props.usuario.id,
          execution_state: "PENDIENTE",
        }
      });
    } else {
      this.setState({ stateSearch: false });
      if (this.state.modeEdit === true) {
        this.setState({ modeEdit: false });
      } else {
        this.setState({ modeEdit: true });
      }

    }

    this.setState(prevState => ({
      modal: !prevState.modal
    }));
  }

  HandleClick = e => {
    if (this.validationForm() == true) {
      if (this.state.modeEdit == true) {
        fetch("/payments/" + this.state.action.id, {
          method: "PATCH", // or 'PUT'
          body: JSON.stringify(this.state.form), // data can be `string` or {object}!
          headers: {
            "Content-Type": "application/json"
          }
        })
          .then(res => res.json())
          .catch(error => console.error("Error:", error))
          .then(data => {
            this.props.loadInfo();
            this.MessageSucces(data.message, data.type, data.message_error);

            this.setState({
              modal: false,
              form: {
                customer_id: "",
                contact_id: "",
                service_type: "",
                user_id: this.props.usuario.id,
                description: "",
                start_date: "",
                end_date: "",
                quotation_number: "",
                quotation_value: "",
                eng_hours: "",
                viatic_value: "",
                execution_state: "PENDIENTE",
              },
            });
          });

      } else {
        fetch("/cost_centers", {
          method: "POST", // or 'PUT'
          body: JSON.stringify(this.state.form), // data can be `string` or {object}!
          headers: {
            "Content-Type": "application/json"
          }
        })
          .then(res => res.json())
          .catch(error => console.error("Error:", error))
          .then(data => {
            this.props.loadInfo();

            this.MessageSucces(data.message, data.type, data.message_error);

            this.setState({
              modal: false,
              form: {
                customer_id: "",
                contact_id: "",
                service_type: "",
                user_id: this.props.usuario.id,
                description: "",
                start_date: "",
                end_date: "",
                quotation_number: "",
                quotation_value: "",
                eng_hours: "",
                viatic_value: "",
                execution_state: "PENDIENTE",
              },
            });
          });
      }
    }
  };




  delete = (id) => {
    Swal.fire({
      title: 'Estas seguro?',
      text: "El registro sera eliminado para siempre!",
      type: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#009688',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Si'
    }).then((result) => {
      if (result.value) {
        fetch("/cost_centers/" + id, {
          method: 'delete'
      }).then(response => response.json())
      .then(response => {
        this.props.loadInfo()
        
        Swal.fire(
          'Borrado!',
          '¡El registro fue eliminado con exito!',
          'success'
        )
      });
      }
    })

  }

  render() {
    return (
        <React.Fragment>

        <FormCreate
          toggle={this.toggle}
          backdrop={this.state.backdrop}
          modal={this.state.modal}
          onChangeForm={this.handleChange}
          formValues={this.state.form}
          submit={this.HandleClick}
          FormSubmit={this.handleSubmit}
          titulo={this.state.title}
          nameSubmit={this.state.modeEdit == true ? "Actualizar" : "Crear"}
          errorValues={this.state.ErrorValues}
          

          /* AUTOCOMPLETE CLIENTE */

          clientes={this.state.clients}
          onChangeAutocomplete={this.handleChangeAutocomplete}
          formAutocomplete={this.state.selectedOption}

           /* AUTOCOMPLETE CONTACTO */

          contacto={this.state.dataContact}
          onChangeAutocompleteContact={this.handleChangeAutocompleteContact}
          formAutocompleteContact={this.state.selectedOptionContact}

          
        />

           <div className="col-md-12 p-0 mb-4">
                <div className="row">
                    <div className="col-md-8 text-left">
                        
                    </div>

                    <div className="col-md-4 text-right mt-1 mb-1">      
                          <button
                            className="btn btn-light mr-3"
                            onClick={this.props.show}
                            disabled={this.props.dataActions.length >= 1 ? false : true}
                          >
                            Filtros <i className="fas fa-search ml-2"></i>
                          </button>
                          <button  onClick={() => this.toggle("new")} className="btn btn-secondary">Nuevo centro de costo</button>
                    </div>

                </div>
            </div>

            <div className="content-table">
            
              <table
                className="table table-hover table-bordered table-width"
                id="sampleTable"
              >
                <thead>
                  <tr className="tr-title">
                    <th style={{width: "60px"}} className="text-center">Acciones</th>
                    <th>Codigo</th>
                    <th>Cliente</th>
                    <th>Tipo de Servicio</th>
                    <th>Descripcion</th>
                    <th>Número de cotización</th>
                    <th>$ Ingeniería Cotizado</th>
                    <th>$ Ingeniería Ejecutado</th>
                    <th>$ Viaticos Cotizado</th>
                    <th>$ Viaticos Real</th>
                    <th>¿Finalizo?</th>
                    <th>Estado de ejecución</th>
                    <th>Estado facturado</th>
                  </tr>
                </thead>

                <tbody>
                  {this.props.dataActions.length >= 1 ? (
                    this.props.dataActions.map(accion => (
                      <tr key={accion.id}>
                      <td className="text-center" style={{ width: "10px"}}>   
                        <div
                            className="btn-group"
                            role="group"
                            aria-label="Button group with nested dropdown"
                          >
                            <div className="btn-group" role="group">
                              <button
                                className="btn btn-secondary"
                                id="btnGroupDrop1"
                                type="button"
                                data-toggle="dropdown"
                                aria-haspopup="true"
                                aria-expanded="false"
                              >
                                <i className="fas fa-bars"></i>
                              </button>
                              <div className="dropdown-menu dropdown-menu-right">
                                <a href={`/cost_centers/${accion.id}`} target="_blank" className="dropdown-item">
                                  Gestionar
                                </a>    

                                <a href={`/cost_centers/${accion.id}/edit`} className="dropdown-item">
                                  Editar
                                </a>

                                <button onClick={() => this.delete(accion.id)} className="dropdown-item">
                                  Eliminar
                                </button>

                              </div>
                            </div>
                          </div>  
                        </td>
                        <th>{accion.code}</th>
                        <th>{accion.customer != undefined ? accion.customer.name : ""}</th>
                        <th>{accion.service_type}</th>
                        <th>{accion.description}</th>
                        <th>{accion.quotation_number}</th>
                        <th><NumberFormat value={accion.engineering_value} displayType={"text"} thousandSeparator={true} prefix={"$"}/></th>
                        <th>{accion.id}</th>
                        <th><NumberFormat value={accion.viatic_value} displayType={"text"} thousandSeparator={true} prefix={"$"}/></th>
                        <th>{accion.id}</th>
                        <th>
                          {accion.execution_state == "EJECUCION" ? (
                            <button>Finalizar</button>
                          ) : (
                            <button>Finalizado</button>
                          )}
                        </th>
                        <th>{accion.execution_state}</th>
                        <th>{accion.invoiced_state}</th>                      
                      </tr>
                    ))
                  ) : (
                    <td colSpan="8" className="text-center">
                        <div className="text-center mt-1 mb-1">
                        <h4>No hay registros</h4>
                        <button  onClick={() => this.toggle("new")} className="btn btn-secondary">Nuevo centro de costo</button>
                        </div>
                    </td>
                  )}
                  
                </tbody>

              </table>
            </div>
          </React.Fragment>

    );
  }
}

export default tableIndex;
