import React from "react";
import SweetAlert from "sweetalert2-react";
import Swal from "sweetalert2/dist/sweetalert2.js";
import FormCreate from "../CustomerReports/FormCreate";
import NumberFormat from "react-number-format";

class table extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      title: "",
      modal: false,
      backdrop: "static",
      ErrorValues: true,
      action: {},
      id: "",

      form: {
        customer_id: "",
        cost_center_id: "",
        contact_id: "",
        report_date: "",
        description: "",
        email: "ejemplo@hotmail.com",
        report_ids: [],
        user_id: this.props.usuario.id,
      },

      selectedOption: {
        customer_id: "",
        label: "Buscar cliente"
      },

      selectedOptionContact: {
        contact_id: "",
        label: "Aprueba el Reporte"
      },

      selectedOptionCentro: {
        cost_center_id: "",
        label: "Centro de costo"
      },

      selectedOptionReports: {
        report_ids: "",
        label: "Reportes"
      },

      clients: [],
      dataCostCenter: [],
      dataReports: [],
      dataContact: [],
      dataReportEdit: []

    };

    this.toggle = this.toggle.bind(this);
  }

  handleChangeAutocomplete = selectedOption => {
    let arrayCentro = []
    let arrayContact = []

    fetch(`/customer_cost_center/${selectedOption.value}/customer_r`)
    .then(response => response.json())
    .then(data => {

      data.data_cost_center.map((item) => (
        arrayCentro.push({label: item.code, value: item.id})
      ))

      data.data_contact.map((item) => (
        arrayContact.push({label: item.name, value: item.id})
      ))
    
      this.setState({
        dataCostCenter: arrayCentro,
        dataContact: arrayContact
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

  handleChangeAutocompleteReport = selectedOptionReport => {
    let array = []
  
    selectedOptionReport.map((item) => (
      array.push(item.value)
    ))

    console.log(array)

    this.setState({
      form: {
        ...this.state.form,
        report_ids: array
      }
    })
  };

  handleChangeAutocompleteCentro = selectedOptionCentro => {
    let arrayReport = []

    fetch(`/get_report_value/${selectedOptionCentro.value}`)
    .then(response => response.json())
    .then(data => {
      
      console.log(data)

      data.map((item) => (
        arrayReport.push({label: item.code_report, value: item.id})
      ))

      this.setState({
        dataReports: arrayReport
      })
      
    });

    this.setState({
      selectedOptionCentro,
      form: {
        ...this.state.form,
        cost_center_id: selectedOptionCentro.value
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
  

  validationForm = () => {
    if (this.state.form.customer_id != "" && 
        this.state.form.contact_id != "" &&
        this.state.form.report_date != "" &&
        this.state.form.report_execute_id != "" &&
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

  componentDidMount(){
    let array = []
    //let arrayContact = []

    this.props.clientes.map((item) => (
      array.push({label: item.name, value: item.id})
    ))

    this.setState({
        clients: array
    })

  /*
    this.props.contacts.map((item) => (
      arrayContact.push({label: item.name, value: item.id})
    ))

    this.setState({
      dataContact: arrayContact
    })
  */
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

  updateValues = () => {
    this.setState({
      form: {
        customer_id: "",
        cost_center_id: "",
        contact_id: "",
        report_date: "",
        description: "",
        email: "ejemplo@hotmail.com",
        report_ids: [],
        user_id: this.props.usuario.id,
      },

      selectedOption: {
        customer_id: "",
        label: "Seleccionar cliente"
      },

      selectedOptionContact: {
        contact_id: "",
        label: "Aprueba el Reporte"
      },

      selectedOptionCentro: {
        cost_center_id: "",
        label: "Centro de costo"
      },

      selectedOptionReports: {
        report_ids: "",
        label: "Reportes"
      },

      dataReportEdit: [],

    })
  }

  HandleClick = e => {
    if (this.validationForm() == true) {
      if (this.state.modeEdit == true) {
        fetch("/customer_reports/" + this.state.action.id, {
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
            this.setState({modal: false})
          });

      } else {
        fetch("/customer_reports", {
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
            this.setState({modal: false})

          });
      }
    }
  };

  toggle(from) {
    if (from == "edit") {
      this.setState({ 
        modeEdit: true,
        ErrorValues: true,

      });
    } else if (from == "new") {
      this.setState({
        modeEdit: false,
        ErrorValues: true,
        title: "Nuevo Reporte de cliente",
      });
      this.updateValues()
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

  edit = modulo => {
    let arrayContact = []

    modulo.reports.map((item) => (
      arrayContact.push({label: item.code_report, value: item.id})
    ))

    this.setState({
      dataReportEdit: arrayContact
    })
  

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
            cost_center_id: modulo.cost_center_id,
            contact_id: modulo.contact_id,
            report_date: modulo.report_date,
            description: modulo.description,
            report_ids: modulo.report_ids,
            email: "ejemplo@hotmail.com",
            user_id: this.props.usuario.id,
          },

          selectedOption: {
            customer_id: modulo.customer_id,
            label: `${modulo.customer != undefined ? modulo.customer.name : ""}`
          },
    
          selectedOptionContact: {
            contact_id: modulo.contact_id,
            label: `${modulo.contact != undefined ? modulo.contact.name : ""}`
          },
    
          selectedOptionCentro: {
            cost_center_id: modulo.cost_center_id,
            label: `${modulo.cost_center != undefined ? modulo.cost_center.code : ""}`
          },
        
        }
        
      )
      
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
        fetch("/customer_reports/" + id, {
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


  sendReques = (accion) => {
    let timerInterval

    Swal.fire({
      title: "Estas seguro?",
      text: "Al aceptar se enviara el correo al cliente!",
      type: "info",
      showCancelButton: true,
      confirmButtonColor: "#009688",
      cancelButtonColor: "#d33",
      confirmButtonText: "Si"
    }).then(result => {
      if (result.value) {

        fetch(`/enviar_aprobacion/${accion.id}`, {
          method: "GET"
        })

        .then(response => response.json())
        .then(data => {
            this.props.loadInfo();
            this.MessageSucces(data.message, data.type, data.message_error)
      
        });

        Swal.fire({
          title: 'Enviando...',
          html: 'El correo se estan enviando, espera <b></b> unos segundos',
          timerProgressBar: true,
          onBeforeOpen: () => {
            Swal.showLoading()
          },
          onClose: () => {
            clearInterval(timerInterval)
          }
        }).then((result) => {
          if (
            result.dismiss === Swal.DismissReason.timer
          ) {
            console.log('I was closed by the timer') // eslint-disable-line
          }
        })

    
      }
    })
  }

  /*asdasd
    Swal.queue([{
      title: "Estas seguro?",
      text: "Al aceptar se enviara el correo al cliente!",
      type: "info",
      showCancelButton: true,
      confirmButtonColor: "#009688",
      cancelButtonColor: "#d33",
      confirmButtonText: "Si",
      showLoaderOnConfirm: true,
      preConfirm: () => {
        return fetch(`/enviar_aprobacion/${accion.id}`, {
          method: "GET"
        }).then(response => response.json())
          .then(data => {
            this.props.loadInfo();
            this.MessageSucces(data.message, data.type, data.message_error)
          }).catch(() => {
            Swal.insertQueueStep({
              icon: 'error',
              title: 'Unable to get your public IP'
            })
          })
      }
    }])

    asdasd
  */

  getState(accion){
    if (accion.report_state == "Aprobado") {
      return "Aprobado por el cliente"
    }else if (accion.report_state == "Enviado al Cliente"){
      return "Reenviar para Aprobaciòn"
    }else{
      return "Enviar para Aprobaciòn"
    }
  }

  getStateEdit = (user) => {
    if(this.props.estados.edit == true && this.props.usuario.id == user){
      return true
    }else if(this.props.estados.edit == false && this.props.estados.edit_all){
      return true
    }else if (this.props.estados.edit && this.props.estados.edit_all){
      return true
    }else if(this.props.estados.edit == false && this.props.estados.edit_all == false){
      return false
    }
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

          /* AUTOCOMPLETE CENTRO DE COSTO */

          centro={this.state.dataCostCenter}
          onChangeAutocompleteCentro={this.handleChangeAutocompleteCentro}
          formAutocompleteCentro={this.state.selectedOptionCentro}

          /* AUTOCOMPLETE REPORTS */

          reports={this.state.dataReports}
          onChangeAutocompleteReports={this.handleChangeAutocompleteReport}
          formAutocompleteReport={this.state.selectedOptionReports}

          /* AUTOCOMPLETE CONTACT */

          contacts={this.state.dataContact}
          onChangeAutocompleteContact={this.handleChangeAutocompleteContact}
          formAutocompleteContact={this.state.selectedOptionContact}

          editValuesReport={this.state.dataReportEdit}
          estados={this.props.estados}


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

                    {this.props.estados.download_file == true && (
                      <a
                        className=" mr-2"
                        href={`/download_file/customer_reports.xls`}
                        target="_blank"
                      >
                        <img src="https://mybc1.s3.amazonaws.com/uploads/rseguimiento/evidencia/244/file_formats_4_csv-512.png" alt="" style={{height: "35px"}}/>
                      </a>
                    )}
                    
                      {this.props.estados.create == true && (
                        <button  onClick={() => this.toggle("new")} className="btn btn-secondary">Nuevo Informe</button>
                      )}
                    </div>
                </div>
            </div>
        </div>

        <div className="content">

        <table className="table table-hover table-bordered" id="sampleTable">
          <thead>
            <tr className="tr-title">
              <th>Creado</th>
              <th>Codigo</th>
              <th>Descripcion</th>
              {this.props.estados.send_email == true && (  
                <th style={{width: "220px"}}>Enviar para aprobaciòn</th>
              )}
              <th>Estado</th>
              <th>Fecha Aprobacion</th>
              <th>Cliente</th>
              <th className="text-center">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {this.props.dataActions.length >= 1 ? (
              this.props.dataActions.map(accion => (
                <tr key={accion.id}>
                    <td>{accion.report_date}</td>
                    <td>{accion.report_code}</td>
                    <td>{accion.description}</td>

                  {this.props.estados.send_email == true && (  
                    <td> 
                      <button
                          onClick={() => this.sendReques(accion)}
                          className="btn btn-success"
                          style={{width: "220px"}}
                          disabled={accion.report_state == "Aprobado"  ? true : false }
                      >
                          {this.getState(accion)}
                      </button>
                    </td>
                  )}

                  <td>{accion.report_state}</td>
                  <td>{accion.approve_date}</td>
                  <td>{accion.customer.name}</td>


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
                          
                            {this.getStateEdit(accion.user_id) && (
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

                            {this.props.estados.generate_pdf == true && (
                              <a
                                href={`/customer_pdf/${accion.id}.pdf`}
                                className="dropdown-item"
                                target="_blank"
                              >
                                Generar pdf
                              </a>
                            )}

                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="text-center">
                  <div className="text-center mt-4 mb-4">
                    <h4>No hay registros</h4>
                      {this.props.estados.create == true && (
                        <button  onClick={() => this.toggle("new")} className="btn btn-secondary">Nuevo Informe</button>
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
