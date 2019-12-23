import React from "react";
import SweetAlert from "sweetalert2-react";
import Swal from "sweetalert2/dist/sweetalert2.js";
import NumberFormat from 'react-number-format';
import FormCreate from '../Reports/FormCreate'

class table extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
          action: {},
          title: "Nuevo reporte",
          modeEdit: false,
          ErrorValues: true,
          ErrorValuesContact: true,
          modal: false,
          backdrop: "static",

          state_create: false,

          form: {
            customer_id: "",
            contact_id: "",
            cost_center_id: "",
            report_date: "",
            report_execute_id: (this.props.rol.name != "Ingeniero" ? "" : this.props.usuario.id),
            working_time: "",
            work_description: "",
            viatic_value: "",
            viatic_description: "",
            report_code: 0,
            user_id: this.props.usuario.id,
          },

          formContact: {
            contact_name: "",
            contact_position: "",
            contact_phone: "",
            contact_email: "",
            customer_id: "",
          },

          selectedOption: {
            customer_id: "",
            label: "Buscar cliente"
          },
  
          selectedOptionContact: {
            contact_id: "",
            label: "Seleccionar Contacto"
          },

          selectedOptionCentro: {
            cost_center_id: "",
            label: "Centro de costo"
          },

          dataContact: [],
          clients: [],
          dataCostCenter: []
        }

        this.toggle = this.toggle.bind(this);
    }

  validationForm = () => {
    if (this.state.form.customer_id != "" && 
        this.state.form.contact_id != "" &&
        this.state.form.report_date != "" &&
        this.state.form.working_time != "" &&
        this.state.form.work_description != "" &&
        this.state.form.viatic_value != "" 
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

  validationFormContact = () => {
    if (this.state.formContact.contact_name != "" && 
        this.state.formContact.contact_position != "" &&
        this.state.formContact.contact_phone != "" &&
        this.state.formContact.contact_email != "" &&
        this.state.form.customer_id != ""
        ) {
      console.log("los campos estan llenos")
      this.setState({ ErrorValuesContact: true })
      return true
    }else{
      console.log("los campos no se han llenado")
      this.setState({ ErrorValuesContact: false })
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
    let arrayCentro = []

    fetch(`/get_client/${selectedOption.value}`)
    .then(response => response.json())
    .then(data => {

      data.map((item) => (
        array.push({label: item.name, value: item.id})
      ))

      this.setState({
        dataContact: array
      })

    });

    fetch(`/customer_user/${selectedOption.value}`)
    .then(response => response.json())
    .then(data => {

      data.map((item) => (
        arrayCentro.push({label: item.code, value: item.id})
      ))

      this.setState({
        dataCostCenter: arrayCentro
      })
      
    });

    this.setState({
      selectedOption,
      form: {
        ...this.state.form,
        customer_id: selectedOption.value
      },

      formContact: {
        ...this.state.formContact,
        customer_id: selectedOption.value
      },


    });
  };

  handleChangeAutocompleteContact = selectedOptionContact => {
    console.log("hola soy contact");
    this.setState({
      selectedOptionContact,
      form: {
        ...this.state.form,
        contact_id: selectedOptionContact.value
      }
    });
  };

  handleChangeAutocompleteCentro = selectedOptionCentro => {
    console.log("hola soy center");
    this.setState({
      selectedOptionCentro,
      form: {
        ...this.state.form,
        cost_center_id: selectedOptionCentro.value
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

  handleChangeContact = e =>{
    this.setState({
      formContact: {
        ...this.state.formContact,
        [e.target.name]: e.target.value
      }
    });
  }

  toggle(from) {
    if (from == "edit") {
      this.setState({ 
        modeEdit: true,
        ErrorValuesContact: true,
        ErrorValues: true,

      });
    } else if (from == "new") {
      this.setState({
        modeEdit: false,
        ErrorValuesContact: true,
        ErrorValues: true,
        state_create: false,
        form: {
          customer_id: "",
          contact_id: "",
          cost_center_id: "",
          report_date: "",
          report_execute_id: "",
          working_time: "",
          work_description: "",
          viatic_value: "",
          viatic_description: "",
          report_code: 0,
          user_id: this.props.usuario.id,
        },

        formContact: {
          contact_name: "",
          contact_position: "",
          contact_phone: "",
          contact_email: "",
          customer_id: "",
        },
  
        selectedOption: {
          customer_id: "",
          label: "Buscar cliente"
        },

        selectedOptionContact: {
          contact_id: "",
          label: "Seleccionar Contacto"
        },

        selectedOptionCentro: {
          cost_center_id: "",
          label: "Centro de costo"
        },

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


  updateValues(){
    this.setState({
      modal: false,

      formContact: {
        contact_name: "",
        contact_position: "",
        contact_phone: "",
        contact_email: "",
        customer_id: "",
      },

      selectedOption: {
        customer_id: "",
        label: "Buscar cliente"
      },

      selectedOptionContact: {
        contact_id: "",
        label: "Seleccionar Contacto"
      },

      selectedOptionCentro: {
        cost_center_id: "",
        label: "Centro de costo"
      },
      
    });
  }

  HandleClick = e => {
    if (this.validationForm() == true) {
      if (this.state.modeEdit == true) {
        fetch("/reports/" + this.state.action.id, {
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
            this.updateValues()
            this.MessageSucces(data.message, data.type, data.message_error);
          });

      } else {
        fetch("/reports", {
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
            this.updateValues()
            this.MessageSucces(data.message, data.type, data.message_error);

          });
      }
    }
  };


  delete = id => {
    Swal.fire({
      title: "Estas seguro?",
      text: "El registro sera eliminado para siempre!",
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#009688",
      cancelButtonColor: "#d33",
      confirmButtonText: "Si"
    }).then(result => {
      if (result.value) {
        fetch("/reports/" + id, {
          method: "delete"
        })
          .then(response => response.json())
          .then(response => {
            this.props.loadInfo();

            Swal.fire(
              "Borrado!",
              "¡El registro fue eliminado con exito!",
              "success"
            );
          });
      }
    });
  };

  HandleClickContact = () => {
    let array = []

    if (this.validationFormContact() == true) {
      fetch("/create_contact", {
        method: 'POST', // or 'PUT'
        body: JSON.stringify(this.state.formContact), // data can be `string` or {object}!
        headers: {
          'Content-Type': 'application/json',
        }
      }).then(res => res.json())
        .catch(error => console.error('Error:', error))
        .then(data => {
          this.MessageSucces(data.message, data.type, data.message_error)

          array.push({label: data.register.name, value: data.register.id})

          this.setState({ 
            state_create: true,
            dataContact: array
          })
        
        });
    }
  }

  edit = modulo => {
    console.log(modulo)
    if(this.state.modeEdit === true){
      this.setState({modeEdit: false})
    }else{
      this.setState({modeEdit: true})
    }

    this.toggle("edit")

      this.setState({
        action: modulo,
        title: "Editar Reporte",
        form: {
          customer_id: modulo.customer_id,
          contact_id: modulo.contact_id,
          cost_center_id: modulo.cost_center_id,
          report_date: modulo.report_date,
          report_execute_id: modulo.report_execute_id,
          working_time: modulo.working_time,
          work_description: modulo.work_description,
          viatic_value: modulo.viatic_value,
          viatic_description: modulo.viatic_description,
          report_code: modulo.report_code,
          user_id: this.props.usuario.id,
        },

        selectedOption: {
          customer_id: modulo.customer_id,
          label: `${modulo.customer.name}`
        },

        selectedOptionContact: {
          contact_id: modulo.contact_id,
          label: `${modulo.contact.name}`
        },
        
        }
        
      )
      
  };



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
          users={this.props.users}

          /* CONTACT FORM */
          
          formContactValues={this.state.formContact}
          FormSubmitContact={this.HandleClickContact}
          create_state={this.state.state_create}
          errorValuesContact={this.state.ErrorValuesContact}
          onChangeFormContact={this.handleChangeContact}

          /* AUTOCOMPLETE CLIENTE */

          clientes={this.state.clients}
          onChangeAutocomplete={this.handleChangeAutocomplete}
          formAutocomplete={this.state.selectedOption}

           /* AUTOCOMPLETE CONTACTO */

          contacto={this.state.dataContact}
          onChangeAutocompleteContact={this.handleChangeAutocompleteContact}
          formAutocompleteContact={this.state.selectedOptionContact}

          /* AUTOCOMPLETE CENTRO DE COSTO */

          centro={this.state.dataCostCenter}
          onChangeAutocompleteCentro={this.handleChangeAutocompleteCentro}
          formAutocompleteCentro={this.state.selectedOptionCentro}

          rol={this.props.rol}

        />


        <div className="row mb-4">
            <div className="col-md-12">
                <div className="row">
                    <div className="col-md-8">

                    </div>

                    <div className="col-md-4 text-right">
                    <button
                      className="btn btn-light mr-3"
                      onClick={this.props.show}
                      disabled={this.props.dataActions.length >= 1 ? false : true}
                    >
                      Filtros <i className="fas fa-search ml-2"></i>
                    </button>
                      {this.props.estados.create == true && (
                        <button  onClick={() => this.toggle("new")} className="btn btn-secondary">Nuevo reporte</button>
                      )}
                    </div>
                </div>
            </div>
        </div>

        <div className="content-table">

        <table className="table table-hover table-bordered table-width" id="sampleTable">
          <thead>
            <tr className="tr-title">
              <th className="text-center">Acciones</th>
              <th style={{width: "6%"}}>Codigo</th>
              <th style={{width: "6%"}}>Centro de Costos</th>
              <th style={{width: "7%"}}>Fecha de Ejecucion</th>
              <th style={{width: "8%"}}>Responsable Ejecucion</th>
              <th style={{width: "6%"}}>Horas Laboradas</th>
              <th>Descripcion del Trabajo</th>
              <th style={{width: "7%"}}>Valor de los Viaticos</th>
              <th style={{width: "8%"}}>Descripcion de Viaticos</th>
              <th style={{width: "6%"}}>Valor del Reporte</th>
              <th style={{width: "5%"}}>Estado</th>
            </tr>
          </thead>

          <tbody>
            {this.props.dataActions.length >= 1 ? (
              this.props.dataActions.map(accion => (
                <tr key={accion.id}>
                  <td className="text-right" style={{ width: "10px" }}>
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

                          {this.props.estados.edit == true && (
                            <a
                              onClick={() => this.edit(accion)}
                              className="dropdown-item"
                            >
                              Editar
                            </a>
                          )}

                          {this.props.estados.delete == true && (
                            <button
                              onClick={() => this.delete(accion.id)}
                              className="dropdown-item"
                            >
                              Eliminar
                            </button>
                          )}

                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{accion.code_report}</td>
                  <td>{accion.cost_center.code}</td>
                  <td>{accion.report_date}</td>
                  <td>{accion.report_execute != undefined ? accion.report_execute.names : "" }</td>
                  <td>{accion.working_time}</td>
                  <td>{accion.work_description}</td>
                  <td><NumberFormat value={accion.viatic_value} displayType={"text"} thousandSeparator={true} prefix={"$"}/></td>
                  <td>{accion.viatic_description}</td>
                  <td><NumberFormat value={accion.total_value} displayType={"text"} thousandSeparator={true} prefix={"$"}/></td>
                  <td>{accion.report_sate ? "Aprobado" : "Sin Aprobar"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="11" className="text-center">
                  <div className="text-center mt-4 mb-4">
                    <h4>No hay registros</h4>
                    {this.props.estados.create == true && (
                      <button onClick={() => this.toggle("new")} className="btn btn-secondary">Nuevo reporte</button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        </div>
      </React.Fragment>
    );
  }
}

export default table;
