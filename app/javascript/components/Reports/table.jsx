import React from "react";
import SweetAlert from "sweetalert2-react";
import Swal from "sweetalert2/dist/sweetalert2.js";
import NumberFormat from 'react-number-format';
import FormCreate from '../Reports/FormCreate'
import { UncontrolledTooltip } from "reactstrap";

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
        report_execute_id: (this.props.estados.responsible == true ? "" : this.props.usuario.id),
        working_time: "",
        work_description: "",
        viatic_value: "",
        viatic_description: "",
        report_code: 0,
        displacement_hours: "",
        value_displacement_hours: "",
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
    if(this.props.estados.viatics){
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
      } else {
        console.log("los campos no se han llenado")
        this.setState({ ErrorValues: false })
        return false
      }
    }else{
      if (this.state.form.customer_id != "" &&
          this.state.form.contact_id != "" &&
          this.state.form.report_date != "" &&
          this.state.form.working_time != "" &&
          this.state.form.work_description != ""
      ) {
        console.log("los campos estan llenos")
        this.setState({ ErrorValues: true })
        return true
      } else {
        console.log("los campos no se han llenado")
        this.setState({ ErrorValues: false })
        return false
      }
    }
  }

  range(array) {
    let ids = []

    array.map((item) => (
      ids.push(item.id)
    ))

    return ids
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
    } else {
      console.log("los campos no se han llenado")
      this.setState({ ErrorValuesContact: false })
      return false

    }
  }


  MessageSucces = (name_success, type, error_message) => {
    Swal.fire({
      position: "center",
      type: type,
      html: '<p>' + error_message != undefined ? error_message : "asdasdasd" + '</p>',
      title: name_success,
      showConfirmButton: false,
      timer: 1500
    });
  }

  componentDidMount() {
    let array = []

    this.props.clientes.map((item) => (
      array.push({ label: item.name, value: item.id })
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
          array.push({ label: item.name, value: item.id })
        ))

        this.setState({
          dataContact: array
        })

      });

    fetch(`/customer_user/${selectedOption.value}`)
      .then(response => response.json())
      .then(data => {

        data.map((item) => (
          arrayCentro.push({ label: `${item.code} - (${item.description})`, value: item.id })
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

  handleChangeContact = e => {
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
          report_execute_id: (this.props.estados.responsible == true ? "" : this.props.usuario.id),
          working_time: "",
          work_description: "",
          viatic_value: "",
          viatic_description: "",
          report_code: 0,
          displacement_hours: "",
          value_displacement_hours: "",
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


  updateValues() {
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

          array.push({ label: data.register.name, value: data.register.id })

          this.setState({
            state_create: true,
            dataContact: array
          })

        });
    }
  }

  edit = modulo => {
    console.log(modulo)
    if (this.state.modeEdit === true) {
      this.setState({ modeEdit: false })
    } else {
      this.setState({ modeEdit: true })
    }

    this.toggle("edit")

    let arrayCentro = []

    fetch(`/customer_user/${modulo.customer_id}`)
      .then(response => response.json())
      .then(data => {

        console.log(data)

        data.map((item) => (
          arrayCentro.push({ label: item.code, value: item.id })
        ))

        this.setState({
          dataCostCenter: arrayCentro
        })

      });

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
        displacement_hours: modulo.displacement_hours,
        value_displacement_hours: modulo.value_displacement_hours,
      },

      selectedOption: {
        customer_id: modulo.customer_id,
        label: `${modulo.customer.name}`
      },

      selectedOptionContact: {
        contact_id: modulo.contact_id,
        label: `${modulo.contact.name}`
      },

      selectedOptionCentro: {
        cost_center_id: modulo.cost_center_id,
        label: `${modulo.cost_center.code}`
      },

    }

    )

  };

  getState = (user) => {
    if (this.props.estados.edit == true && this.props.usuario.id == user) {
      return true
    } else if (this.props.estados.edit == false && this.props.estados.edit_all) {
      return true

    } else if (this.props.estados.edit_all == true && this.props.usuario.id == user) {
      return true
    } else if (this.props.estados.edit_all) {
      return true
    } else if (this.props.estados.edit && this.props.estados.edit_all) {
      return true
    } else if (this.props.estados.edit == false && this.props.estados.edit_all == false) {
      return false
    }
  }

  getDate = (date) => {
    var d = new Date(date),
      months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'junio', 'julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[d.getMonth()] + " " + d.getDate() + " " + 'del' + " " + d.getFullYear()
  }


  render() {
    return (
      <React.Fragment>

        {this.state.modal && (
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
            estados={this.props.estados}

          />
        )}



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
                    href={`/download_file/reports/${this.props.filtering == false ? "todos" : this.range(this.props.exel_values)}.xls`}
                    target="_blank"
                  >
                    <img src="https://mybc1.s3.amazonaws.com/uploads/rseguimiento/evidencia/244/file_formats_4_csv-512.png" alt="" style={{ height: "35px" }} />
                  </a>
                )}
                {this.props.estados.create == true && (
                  <button onClick={() => this.toggle("new")} className="btn btn-secondary">Nuevo reporte</button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="content-table">

          <table className="table table-hover table-bordered" style={{ width: "2500px", maxWidth: "2500px" }} id="sampleTable">
            <thead>
              <tr className="tr-title">
                <th style={{ width: "60px" }} className="text-center">Acciones</th>
                <th style={{ width: "150px" }}>Codigo</th>
                <th style={{ width: "150px" }}>Centro de Costos</th>
                <th style={{ width: "150px" }}>Cliente</th>
                <th style={{ width: "150px" }}>Fecha de Ejecucion</th>
                <th style={{ width: "150px" }}>Responsable Ejecucion</th>
                <th style={{ width: "150px" }}>Horas Laboradas</th>
                <th style={{ width: "370px" }}>Descripcion del Trabajo</th>
                <th style={{ width: "300px" }}>Valor de los Viaticos</th>
                <th style={{ width: "150px" }}>Descripcion de Viaticos</th>
                <th style={{ width: "150px" }}>Valor del Reporte</th>
                <th style={{ width: "100px" }}>Estado</th>
                <th style={{ width: "150px" }}>Fecha de creación</th>
                <th style={{ width: "150px" }}>Ultima actualización</th>
              </tr>
            </thead>







            <tbody>
              {this.props.dataActions.length >= 1 ? (
                this.props.dataActions.map(accion => (
                  <tr key={accion.id}>
                    <td className="text-center" style={{ width: "10px" }}>
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

                            {(this.getState(accion.user_id) && accion.cost_center.execution_state != "FINALIZADO") && (
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
                    <td id={`state${accion.id}`}>
                      {accion.cost_center.code}
                      <UncontrolledTooltip
                        className="red-tooltip"
                        placement="top"
                        target={`state${accion.id}`}
                      >
                        {`${accion.cost_center.description}`}
                      </UncontrolledTooltip>
                    </td>
                    <td>
                      {accion.cost_center.customer != undefined ? accion.cost_center.customer.name : ""}
                    </td>
                    <td>{accion.report_date}</td>
                    <td>{accion.report_execute != undefined ? accion.report_execute.names : ""}</td>
                    <td>{accion.working_time}</td>
                    <td>{accion.work_description}</td>
                    <td><NumberFormat value={accion.viatic_value} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                    <td>{accion.viatic_description}</td>
                    <td><NumberFormat value={accion.total_value} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                    <td>{accion.report_sate ? "Aprobado" : "Sin Aprobar"}</td>
                    <th>
                      {this.getDate(accion.created_at)} <br />
                      {accion.user != undefined ? <React.Fragment> <b></b> {accion.user != undefined ? accion.user.names : ""} </React.Fragment> : null}
                    </th>

                    <th>
                      {this.getDate(accion.updated_at)} <br />
                      {accion.last_user_edited != undefined ? <React.Fragment> <b></b> {accion.last_user_edited != undefined ? accion.last_user_edited.names : ""} </React.Fragment> : null}
                    </th>
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
