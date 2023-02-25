import React from "react";
import SweetAlert from 'sweetalert2-react';
import Swal from 'sweetalert2/dist/sweetalert2.js'
import NumberFormat from 'react-number-format';
import FormCreate from "../ConstCenter/FormCreate";
import ModalError from "./ModalError";
import QuotationIndex from './Quotation/Index';


class tableIndex extends React.Component {
  constructor(props) {
    super(props)
    this.token = document.querySelector("[name='csrf-token']").content;

    this.state = {
      action: {},
      title: "Nuevo centro de costo",
      modeEdit: false,
      ErrorValues: true,
      modal: false,
      backdrop: "static",
      isLoading: false,

      modalError: false,
      messages: [],

      formUpdate: {
        execution_state: "",
        invoiced_state: "",
        code: "",
      },

      formUpdateSalesState: {
        sales_state: "",
      },

      cost_center_id: "",
      quotation_cost_center_id: "",

      id: "",
      from_state: "",

      form: {
        customer_id: "",
        contact_id: "",
        service_type: "",
        user_id: this.props.usuario.id,
        description: "",
        user_owner_id: "",
        start_date: "",
        end_date: "",
        quotation_number: "0.0",
        execution_state: "PENDIENTE",

        eng_hours: "0.0",
        hour_real: this.props.hours_real,
        hour_cotizada: this.props.hours_invoices,



        hours_contractor: "0.0",
        hours_contractor_real: this.props.hours_real_contractor,
        hours_contractor_invoices: "0.0",

        materials_value: "0.0",
        viatic_value: "0.0",
        quotation_value: "0.0",

        displacement_hours: "0.0",
        value_displacement_hours: this.props.value_displacement_hours
      },

      selectedOption: {
        customer_id: "",
        label: "Seleccionar cliente"
      },

      selectedOptionContact: {
        contact_id: "",
        label: "Seleccionar Contacto"
      },

      selectedOptionUserOwner: {
        user_owner_id: "",
        label: ""
      },

      dataContact: [],
      users: [],
      clients: []
    }

    this.toggle = this.toggle.bind(this);

  }

  range(array) {
    let ids = []

    array.map((item) => (
      ids.push(item.id)
    ))

    return ids
  }

  validationForm = () => {
    if (this.state.form.customer_id != "" &&
      this.state.form.contact_id != "" &&
      this.state.form.service_type != "" &&
      this.state.form.start_date != "" &&
      this.state.form.end_date != "" &&
      this.state.form.quotation_number != "" &&
      this.state.form.user_owner_id != "" &&
      this.state.form.eng_hours != "" &&
      this.state.form.hour_real != "" &&
      this.state.form.hour_cotizada != "" &&

      this.state.form.hours_contractor != "" &&
      this.state.form.hours_contractor_real != "" &&
      this.state.form.hours_contractor_invoices != "" &&

      this.state.form.materials_value != "" &&
      this.state.form.viatic_value != "" &&
      this.state.form.quotation_value != "" &&

      this.state.form.displacement_hours != "" &&
      (this.state.form.value_displacement_hours != "" || this.state.form.value_displacement_hours == 0)

    ) {
      console.log("los campos estan llenos")
      this.setState({ ErrorValues: true })
      return true
    } else {
      console.log(this.state.form)
      console.log("los campos no se han llenado")
      this.setState({ ErrorValues: false })
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

    fetch(`/get_client/${selectedOption.value}/centro`)
      .then(response => response.json())
      .then(data => {

        data.map((item) => (
          array.push({ label: item.name, value: item.id })
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

  handleChangeAutocompleteUserOwner = (selectedOptionUserOwner) => {
    this.setState({
      selectedOptionUserOwner,
      form: {
        ...this.state.form,
        user_owner_id: selectedOptionUserOwner.value
      }
    });
  }


  handleSubmit = e => {
    e.preventDefault();
  };

  removeValues = (remove) => {
    if (remove) {
      this.setState({
        form: {
          customer_id: "",
          contact_id: "",
          user_id: this.props.usuario.id,
          description: "",
          start_date: "",
          end_date: "",
          user_owner_id: "",
          quotation_number: "",
          execution_state: "PENDIENTE",

          eng_hours: "",

          hour_real: this.props.hours_real,
          hour_cotizada: this.props.hours_invoices,

          hours_contractor: "",
          hours_contractor_real: this.props.hours_real_contractor,
          hours_contractor_invoices: "",

          materials_value: "",

          viatic_value: "",
          quotation_value: "",

          displacement_hours: "",
          value_displacement_hours: this.props.value_displacement_hours,
        },

        ErrorValues: true,
      })
    }
  }

  handleChange = e => {
    if (e.target.name == "service_type") {

      if (e.target.value == "VENTA") {

        this.setState({
          form: {
            ...this.state.form,
            eng_hours: "0.0",
            hour_real: "0.0",
            hour_cotizada: "0.0",

            hours_contractor: "0.0",
            hours_contractor_real: this.props.hours_real_contractor,
            hours_contractor_invoices: "0.0",

            materials_value: "",
            quotation_value: "",
            user_owner_id: "",

            displacement_hours: "0.0",
            value_displacement_hours: this.props.value_displacement_hours,

            viatic_value: "0.0",
            service_type: e.target.value
          }
        })

      } else if (e.target.value == "SERVICIO") {

        this.setState({
          form: {
            ...this.state.form,
            eng_hours: "",
            viatic_value: "",
            quotation_value: "",
            user_owner_id: "",

            hour_real: this.props.hours_real,
            hour_cotizada: this.props.hours_invoices,

            hours_contractor: "0.0",
            hours_contractor_real: this.props.hours_real_contractor,
            hours_contractor_invoices: "0.0",

            displacement_hours: "",
            value_displacement_hours: this.props.value_displacement_hours,

            materials_value: "0.0",
            service_type: e.target.value
          }
        })

      } else if (e.target.value == "PROYECTO") {

        this.setState({
          form: {
            ...this.state.form,
            eng_hours: "",
            hour_real: this.props.hours_real,
            hour_cotizada: this.props.hours_invoices,

            hours_contractor: "",
            hours_contractor_real: this.props.hours_real_contractor,
            hours_contractor_invoices: "",

            displacement_hours: "",
            value_displacement_hours: this.props.value_displacement_hours,

            materials_value: "",
            user_owner_id: "",

            viatic_value: "",
            quotation_value: "",
            service_type: e.target.value
          }
        })

      }

    } else {

      this.setState({

        form: {
          ...this.state.form,
          [e.target.name]: e.target.value
        }
      });

    }

  };


  toggle(from) {
    if (from == "edit") {
      this.setState({ modeEdit: true });
    } else if (from == "new") {
      this.setState({
        modeEdit: false,
        selectedOption: {
          customer_id: "",
          label: "Buscar cliente"
        },

        selectedOptionContact: {
          contact_id: "",
          label: "Seleccionar Contacto"
        },
      });

      this.removeValues(true)
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
      this.setState({ isLoading: true })
      if (this.state.modeEdit) {
        fetch("/cost_centers/" + this.state.action.id, {
          method: "PATCH", // or 'PUT'
          body: JSON.stringify(this.state.form), // data can be `string` or {object}!
          headers: {
            "Content-Type": "application/json"
          }
        })
          .then(res => res.json())
          .catch(error => console.error("Error:", error))
          .then(data => {
            this.props.updateItem(data.register)
            this.MessageSucces(data.message, data.type, data.message_error);

            this.setState({
              modal: false,
              isLoading: false,
              selectedOption: {
                customer_id: "",
                label: "Buscar cliente"
              },

              selectedOptionUserOwner: {
                user_owner_id: "",
                label: ""
              },

              selectedOptionContact: {
                contact_id: "",
                label: "Seleccionar Contacto"
              },
            });

            this.removeValues(true)
          });

      } else {
        fetch("/cost_centers", {
          method: "POST", // 
          body: JSON.stringify(this.state.form), // data can be `string` or {object}!
          headers: {
            "Content-Type": "application/json"
          }
        })
          .then(res => res.json())
          .catch(error => console.error("Error:", error))
          .then(data => {

            this.props.updateData(data.register)
            this.removeValues(true)
            this.MessageSucces(data.message, data.type, data.message_error);

            this.setState({
              modal: false,
              isLoading: false,
              selectedOption: {
                customer_id: "",
                label: "Buscar cliente"
              },

              selectedOptionUserOwner: {
                user_owner_id: "",
                label: ""
              },

              selectedOptionContact: {
                contact_id: "",
                label: "Seleccionar Contacto"
              },
            });


          });
      }
    }
  };

  updateState = (accion) => {
    Swal.fire({
      title: 'Estas seguro?',
      text: "El registro sera actualizado!",
      type: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#009688',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Si'
    }).then((result) => {
      if (result.value) {
        fetch("/cost_centers/change_state_ended/" + accion.id, {
          method: 'GET'
        }).then(response => response.json())
          .then(response => {
            this.props.updateItem(response.register)

            Swal.fire(
              'Actualizado!',
              '¡El registro fue actualizado con exito!',
              'success'
            )
          });
      }
    })

  }

  delete = (cost_center) => {
    Swal.fire({
        title: 'Escribe el codigo del centro de costo para poder eliminarlo',
        input: 'text',
        footer: `<p>El codigo del centro de costo es (${cost_center.code}) </p>`,

        inputAttributes: {
            autocapitalize: 'off'
        },

        showCancelButton: true,
        confirmButtonText: 'Eliminar',
        confirmButtonColor: '#16aaff',
        cancelButtonText: "Cancelar",
        showLoaderOnConfirm: true,
        preConfirm: (login) => {
            if (login == cost_center.code.trim()) {
                  fetch(`/cost_centers/${cost_center.id}`, {
                    method: "delete", // or 'PUT'
                    headers: {
                      "Content-Type": "application/json"
                    }
                  })
                  .then(res => res.json())
                  .catch(error => console.error("Error:", error))
                  .then(data => {
                      if(data.type != "delete"){
                        this.setState({
                          modalError: true,
                          messages: data.message
                        })
                      }else{
                        this.setState({
                          modalError: false,
                          messages: []
                        })
                        this.props.loadInfo()
                      }
                      
                  });
            } else {
              Swal.showValidationMessage("El codigo no concuerda")
            }
        },

        allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
        if (result.value) {

        }
    })
  }


  toogleModalError = (from) => {
    if (from == "new") {
        this.setState({ modalError: true })
    } else {
        this.setState({ modalError: false, messages: [] })
    }
  }


  edit = modulo => {
    if (this.state.modeEdit === true) {
      this.setState({ modeEdit: false })
    } else {
      this.setState({ modeEdit: true })
    }

    this.toggle("edit")

    let array = []

    fetch(`/get_client/${modulo.contact_id}/centro`)
      .then(response => response.json())
      .then(data => {

        data.map((item) => (
          array.push({ label: item.name, value: item.id })
        ))

        this.setState({
          dataContact: array
        })

      });

    this.setState({

      selectedOption: {
        value: modulo.customer_id,
        label: modulo.customer.name
      },

      selectedOptionContact: {
        value: modulo.contact.customer_id,
        label: modulo.contact.name
      },

      selectedOptionUserOwner: {
        user_owner_id: modulo.user_owner.id,
        label: modulo.user_owner.name,
      },

      action: modulo,
      title: "Editar Centro de costo",

      form: {
        customer_id: modulo.customer_id,
        contact_id: modulo.contact_id,
        service_type: modulo.service_type,
        user_id: this.props.usuario.id,
        description: modulo.description,
        start_date: modulo.start_date,
        end_date: modulo.end_date,
        quotation_number: modulo.quotation_number,
        viatic_value: modulo.viatic_value,
        execution_state: "PENDIENTE",
        user_owner_id: modulo.user_owner.id,

        eng_hours: modulo.eng_hours != "" ? modulo.eng_hours : "0.0",
        hour_real: modulo.hour_real != "" ? modulo.hour_real : "0.0",
        hour_cotizada: modulo.hour_cotizada != "" ? modulo.hour_cotizada : "0.0",


        hours_contractor: modulo.hours_contractor != "" ? modulo.hours_contractor : "0.0",
        hours_contractor_real: modulo.hours_contractor_real != "" ? modulo.hours_contractor_real : "0.0",
        hours_contractor_invoices: modulo.hours_contractor_invoices != "" ? modulo.hours_contractor_invoices : "0.0",

        displacement_hours: modulo.displacement_hours != "" ? modulo.displacement_hours : "0.0",
        value_displacement_hours: modulo.value_displacement_hours != "" ? modulo.value_displacement_hours : "0.0",

        materials_value: modulo.materials_value != "" ? modulo.materials_value : "0.0",
        viatic_value: modulo.viatic_value != "" ? modulo.viatic_value : "0.0",
        quotation_value: modulo.quotation_value != "" ? modulo.quotation_value : "0.0",
      },

    }

    )

  };


  get_btn(accion) {
    if (accion.execution_state == "EJECUCION") {
      return <button className="btn btn-primary" onClick={() => this.updateState(accion)}>Finalizar</button>
    } else {
      return ""
    }

    /*
    }else if (accion.execution_state == "FINALIZADO" && accion.invoiced_state == "FACTURADO") {
      return ""  

    }else if(accion.execution_state == "FINALIZADO" && accion.invoiced_state == "PENDIENTE DE COTIZACION"){
      return ""

    }else if(accion.execution_state == "EJECUCION" && accion.invoiced_state == "PENDIENTE DE ORDEN DE COMPRA"){
      return <button className="btn btn-primary" onClick={() => this.updateState(accion)}>Finalizar</button> 

    }else if(accion.execution_state == "FINALIZADO" && accion.invoiced_state == "LEGALIZADO"){
      return ""

    }else if(accion.execution_state == "EJECUCION" && accion.invoiced_state == "PENDIENTE DE COTIZACION"){
      return <button className="btn btn-primary" onClick={() => this.updateState(accion)}>Finalizar</button> 

    }else if(accion.execution_state == "FINALIZADO" && accion.invoiced_state == "POR FACTURAR"){
      return ""
    }

    */
  }


  get_sales_orders(sales_orders) {
    var acumulado = 0;
    sales_orders.forEach(element => {
      acumulado = acumulado + element.order_value
    });

    return acumulado;
  }

  HandleClickUpdate = (register, state_show, from_state) => {
    this.setState({
      id: (state_show ? register.id : ""),
      from_state: (state_show ? from_state : ""),

      formUpdate: {
        execution_state: register.execution_state,
        invoiced_state: register.invoiced_state,
        code: register.code,
      },
    });
  }

  onChangeUpdate = (e) => {
    this.setState({
      formUpdate: {
        ...this.state.formUpdate,
        [e.target.name]: e.target.value
      }
    });
  }

  handleClickUpdate = (cost_center_id) => {
    fetch(`/cost_centers/${cost_center_id}`, {
      method: "PATCH", // or 'PUT'
      body: JSON.stringify(this.state.formUpdate), // data can be `string` or {object}!
      headers: {
        "Content-Type": "application/json"
      }
    })
      .then(res => res.json())
      .catch(error => console.error("Error:", error))
      .then(data => {
        this.props.updateItem(data.register)
      });
  }

  onChangeUpdateSelect = (e) => {
    fetch("/update_cost_centers/" + this.state.id + "/" + this.state.from_state + "/" + e.target.value, {
      method: 'POST', // or 'PUT' 
    })
      .then(res => res.json())
      .catch(error => console.error("Error:", error))
      .then(data => {
        this.props.updateItem(data.register)
        this.MessageSucces(data.message, data.type, data.message_error);

        this.setState({
          id: "",
          from_state: "",

          formUpdate: {
            execution_state: "",
            invoiced_state: "",
            code: "",
          },
        })

      });
  }


  alertIng = (value, value2, value3) => {
    if (value <= value2) {
      return "green"
    } else if (value > value2 && value <= value3) {

      return "orange"
    }
    else {

      return "red"
    }
  }

  alertIngCosto = (value, value2, value3) => {
    if (value >= value2) {
      return "green"
    } else if (value < value2 && value >= value3) {

      return "orange"
    }
    else {

      return "red"
    }
  }

  getDate = (date) => {
    var d = new Date(date),
    months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'junio', 'julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const hoursAndMinutes = d.getHours() + ':' + d.getMinutes();

    var time = hoursAndMinutes; // your input
    
    time = time.split(':'); // convert to array

    // fetch
    var hours = Number(time[0]);
    var minutes = Number(time[1]);
    var seconds = Number(time[2]);

    // calculate
    var timeValue = hours;
    
       /*  if (hours > 0 && hours <= 12) {
          timeValue= "" + hours;
        } else if (hours > 12) {
          timeValue= "" + (hours - 12);
        } else if (hours == 0) {
          timeValue= "12";
        } */
    
    timeValue += (minutes < 10) ? ":0" + minutes : ":" + minutes;  // get minutes
    //timeValue += (hours >= 12) ? " PM" : " AM";  // get AM/PM

    return months[d.getMonth()] + " " + d.getDate() + " " + 'del' + " " + d.getFullYear() + " / " + timeValue
  }


  getState = (user) => {
    if (this.props.estados.edit && this.props.usuario.id == user) {
      return true
    } else if (this.props.estados.edit == false && this.props.estados.edit_all) {
      return true

    } else if (this.props.estados.edit_all && this.props.usuario.id == user) {
      return true
    } else if (this.props.estados.edit_all) {
      return true
    } else if (this.props.estados.edit && this.props.estados.edit_all) {
      return true
    } else if (this.props.estados.edit == false && this.props.estados.edit_all == false) {
      return false
    }
  }


  messageSuccess = (response) => {
    Swal.fire({
      position: "center",
      type: `${response.type}`,
      title: `${response.success}`,
      showConfirmButton: false,
      timer: 1500,
    });
  };

  update_sales_state = (e, cost_center) => {
    fetch(`/update_sales_state_cost_center/${cost_center}/${e}`, {
      method: 'PATCH', // or 'PUT'
      headers: {
        "X-CSRF-Token": this.token,
        "Content-Type": "application/json"
      }
    })

      .then(res => res.json())
      .catch(error => console.error("Error:", error))
      .then(data => {
        this.messageSuccess(data)
        this.props.updateItem(data.register)
        this.setState({
          formUpdateSalesState: {
            sales_state: "",
          },

          cost_center_id: "",
        })
      });
  }

  editSalesState = (mode, cost_center) => {
    if (mode == "cerrar") {
      this.setState({
        formUpdateSalesState: {
          sales_state: "",
        },

        cost_center_id: "",
      })
    } else {
      this.setState({
        formUpdateSalesState: {
          sales_state: cost_center.sales_state,
        },

        cost_center_id: cost_center.id,
      })
    }
  }

  setQuotationCostCenter = (cost_center_id) => {
    this.setState({
      quotation_cost_center_id: cost_center_id
    })
  }

  toogleModalQuotationIndex = (from) => {
    if (from == "new") {
        this.setState({ quotation_cost_center_id: true })
    } else {
        this.setState({ quotation_cost_center_id: "" })
    }
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
            nameSubmit={this.state.modeEdit ? "Actualizar" : "Crear"}
            errorValues={this.state.ErrorValues}
            modeEdit={this.state.modeEdit}


            /* AUTOCOMPLETE CLIENTE */

            clientes={this.state.clients}
            onChangeAutocomplete={this.handleChangeAutocomplete}
            formAutocomplete={this.state.selectedOption}

            /* AUTOCOMPLETE CONTACTO */

            contacto={this.state.dataContact}
            onChangeAutocompleteContact={this.handleChangeAutocompleteContact}
            formAutocompleteContact={this.state.selectedOptionContact}

            /* AUTOCOMPLETE USERS */

            formAutocompleteUserOwner={this.state.selectedOptionUserOwner}
            onChangeAutocompleteUserOwner={this.handleChangeAutocompleteUserOwner}
            users={this.props.users}

            /* ESTADOS */

            estados={this.props.estados}
            isLoading={this.state.isLoading}
          />
        )}

        {this.state.modalError && (
          <ModalError
            toggle={this.toogleModalError}
            backdrop={this.state.backdrop}
            modal={this.state.modalError}
            messages={this.state.messages}
          /> 
        )}

        {this.state.quotation_cost_center_id && (
          <QuotationIndex
            toggle={this.toogleModalQuotationIndex}
            backdrop={this.state.backdrop}
            modal={this.state.quotation_cost_center_id ? true : false}
            cost_center_id={this.state.quotation_cost_center_id}
          /> 
        )}

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

              {this.props.estados.download_file == true && (
                <a
                  className=" mr-2"
                  href={`/download_file/cost_centers/${!this.props.filtering ? "todos.xls" : `filtro.xls?descripcion=${this.props.formFilter.descripcion}&customer_id=${this.props.formFilter.customer_id != undefined ? this.props.formFilter.customer_id : ""}&cost_center_id=${this.props.formFilter.cost_center_id != undefined ? this.props.formFilter.cost_center_id : ""}&execution_state=${this.props.formFilter.execution_state}&service_type=${this.props.formFilter.service_type}&invoiced_state=${this.props.formFilter.invoiced_state}&date_desde=${this.props.formFilter.start_date}&date_hasta=${this.props.formFilter.end_date}&quotation_number=${this.props.formFilter.quotation_number}`}`}
                  target="_blank"
                >
                  <img src="https://mybc1.s3.amazonaws.com/uploads/rseguimiento/evidencia/244/file_formats_4_csv-512.png" alt="" style={{ height: "35px" }} />
                </a>
              )}

              {this.props.estados.create && (
                <button onClick={() => this.toggle("new")} className="btn btn-secondary">Nuevo centro de costo</button>
              )}
            </div>

          </div>
        </div>

        <div className="content-table">

          <table
            className="table table-hover table-bordered table-width"
            id="sampleTable" style={{ tableLayout: "fixed" }}
          >
            <thead>
              <tr className="tr-title">
                <th style={{ width: "100px" }} className="text-center">Acciones</th>
                <th style={{ width: "200px" }}>Codigo</th>
                <th style={{ width: "200px" }}>Cliente</th>
                <th style={{ width: "200px" }}>Tipo</th>
                <th style={{ width: "400px" }}>Descripcion</th>

                {this.props.estados.sales_state && (
                  <th className="text-center" style={{ width: "170px" }}>¿Finalizo compras?</th>
                )}

                <th className="text-center" style={{ width: "208px" }}>Estado de compras</th>

                {this.props.estados.ending && (
                  <th className="text-center" style={{ width: "100px" }}>¿Finalizo?</th>
                )}

                <th className="text-left" style={{ width: "250px" }}>Estado de ejecución</th>
                <th className="text-left" style={{ width: "300px" }}>Estado facturado</th>
                <th style={{ width: "250px" }}>Número de cotización</th>

                <th style={{ width: "250px" }}>Ingenieria(Ejecución)</th>
                <th style={{ width: "250px" }}>Ingenieria(Costos)</th>
                <th style={{ width: "250px" }}>Tableristas(Ejecución)</th>
                <th style={{ width: "250px" }}>Tableristas(Costos)</th>
                <th style={{ width: "250px" }}>Desplazamiento</th>
                <th style={{ width: "250px" }}>Materiales</th>
                <th style={{ width: "250px" }}>Viaticos</th>
                <th style={{ width: "250px" }}>Facturacion</th>
                <th style={{ width: "250px" }}>Aiu/Actual</th>
                <th style={{ width: "250px" }}>Aiu/Actual Cotizado </th>


                <th style={{ width: "250px" }}>$ Total Legalizado</th>
                <th style={{ width: "250px" }}>$ Total Cotizado</th>
                <th style={{ width: "250px" }}>Creación</th>
                <th style={{ width: "267px" }}>Ultima actualización</th>


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

                            {this.props.estados.manage_module && (
                              <a href={`/cost_centers/${accion.id}?tab=home`} target="_blank" className="dropdown-item">
                                Gestionar
                              </a>
                            )}

                            {/* {this.props.estados.edit == true && (accion.user_id == this.props.usuario.id || this.props.usuario.rol_id != 5 )  && ( */}

                            {this.getState(accion.user_id) && (
                              <button onClick={() => this.edit(accion)} className="dropdown-item">
                                Editar
                              </button>
                            )}

                            {this.props.estados.delete && (
                              <button onClick={() => this.delete(accion)} className="dropdown-item">
                                Eliminar
                              </button>
                            )}

                            {false && (
                              <button onClick={() => this.setQuotationCostCenter(accion.id)} className="dropdown-item">
                                Cotizaciones
                              </button>
                            )}

                          </div>
                        </div>
                      </div>
                    </td>
                    <th>
                      {this.state.id == accion.id && this.state.from_state == "code" ? (
                        <React.Fragment>
                          <input
                            name="code"
                            className="form form-control"
                            onChange={this.onChangeUpdate}
                            value={this.state.formUpdate.code}
                            onBlur={() => this.handleClickUpdate(accion.id)}
                            style={{ display: "inherit", width: "90%" }}
                          />

                          <i onClick={() => this.HandleClickUpdate(accion, false, "code")} className="fas fa-times-circle float-right"></i>
                        </React.Fragment>
                      ) : (
                        <p>{accion.code} {this.props.estados.edit_code ? <i onClick={() => this.HandleClickUpdate(accion, true, "code")} className="fas fa-pencil-alt float-right"></i> : null} </p>
                      )}
                    </th>
                    <th>{accion.customer != undefined ? accion.customer.name : ""}</th>
                    <th>{accion.service_type}</th>
                    <th>{accion.description}</th>

                    {this.props.estados.sales_state && (
                      <th>
                        {(accion.service_type == "PROYECTO" || accion.service_type == "VENTA") && (
                          <React.Fragment>
                            {accion.sales_state != "CERRADO" && (
                              <button className="btn btn-primary" onClick={() => this.update_sales_state("CERRADO", accion.id)}>Cerrar compra</button>
                            )}
                          </React.Fragment>
                        )}

                      </th>
                    )}

                    <th>
                      {(accion.service_type == "PROYECTO" || accion.service_type == "VENTA") && (
                        <React.Fragment>
                          {this.state.cost_center_id == accion.id ? (
                            <React.Fragment>
                              <select
                                name="estado"
                                className="form form-control"
                                onChange={(e) => this.update_sales_state(e.target.value, accion.id)}
                                value={this.state.formUpdateSalesState.sales_state}
                                style={{ display: "inherit", width: "90%" }}
                              >
                                <option value="">Seleccione un estado</option>
                                <option value="SIN COMPRAS">SIN COMPRAS</option>
                                <option value="COMPRANDO">COMPRANDO</option>
                                <option value="CERRADO">CERRADO</option>

                              </select>

                              <i onClick={() => this.editSalesState("cerrar", {})} className="fas fa-times-circle float-right"></i>
                            </React.Fragment>
                          ) : (
                            <p>{accion.sales_state} {this.props.estados.sales_state ? <i onClick={() => this.editSalesState("edit", accion)} className="fas fa-pencil-alt float-right"></i> : null} </p>
                          )}
                        </React.Fragment>
                      )}
                    </th>

                    {this.props.estados.ending && (
                      <th>
                        {(accion.service_type == "PROYECTO" || accion.service_type == "SERVICIO") && (
                          <React.Fragment>
                            {this.get_btn(accion)}
                          </React.Fragment>
                        )}
                      </th>
                    )}

                    <th>
                      {(accion.service_type == "PROYECTO" || accion.service_type == "SERVICIO") && (
                        <React.Fragment>
                          {this.state.id == accion.id && this.state.from_state == "execution_state" ? (
                            <React.Fragment>
                              <select
                                name="estado"
                                className="form form-control"
                                onChange={this.onChangeUpdateSelect}
                                value={this.state.formUpdate.execution_state}
                                style={{ display: "inherit", width: "90%" }}
                              >
                                <option value="">Seleccione un estado</option>
                                <option value="PENDIENTE">PENDIENTE</option>
                                <option value="EJECUCION">EJECUCION</option>
                                <option value="FINALIZADO">FINALIZADO</option>

                              </select>

                              <i onClick={() => this.HandleClickUpdate(accion, false, "execution_state")} className="fas fa-times-circle float-right"></i>
                            </React.Fragment>
                          ) : (
                            <p>{accion.execution_state} {this.props.estados.update_state ? <i onClick={() => this.HandleClickUpdate(accion, true, "execution_state")} className="fas fa-pencil-alt float-right"></i> : ""} </p>
                          )}
                        </React.Fragment>
                      )}
                    </th>

                    <th>
                      {this.state.id == accion.id && this.state.from_state == "invoiced_state" ? (
                        <React.Fragment>
                          <select
                            name="estado"
                            className="form form-control"
                            onChange={this.onChangeUpdateSelect}
                            value={this.state.formUpdate.invoiced_state}
                            style={{ display: "inherit", width: "90%" }}
                          >
                            <option value="">Seleccione un estado</option>
                            <option value="FACTURADO">FACTURADO</option>
                            <option value="FACTURADO PARCIAL">FACTURADO PARCIAL</option>
                            <option value="LEGALIZADO">LEGALIZADO</option>
                            <option value="LEGALIZADO PARCIAL">LEGALIZADO PARCIAL</option>
                            <option value="POR FACTURAR">POR FACTURAR</option>
                            <option value="PENDIENTE DE ORDEN DE COMPRA">PENDIENTE DE ORDEN DE COMPRA</option>
                            <option value="PENDIENTE DE COTIZACION">PENDIENTE DE COTIZACION</option>

                          </select>

                          <i onClick={() => this.HandleClickUpdate(accion, false, "invoiced_state")} className="fas fa-times-circle float-right"></i>
                        </React.Fragment>
                      ) : (
                        <p>{accion.invoiced_state} {this.props.estados.update_state == true ? <i onClick={() => this.HandleClickUpdate(accion, true, "invoiced_state")} className="fas fa-pencil-alt float-right"></i> : ""} </p>
                      )}
                    </th>

                    <th>{accion.quotation_number}</th>

                    {/*
                        <th><NumberFormat value={accion.engineering_value + (accion.value_displacement_hours * accion.displacement_hours)} displayType={"text"} thousandSeparator={true} prefix={"$"}/></th>
                        <th><NumberFormat value={accion.sum_materials_costo + accion.offset_value } displayType={"text"} thousandSeparator={true} prefix={"$"}/></th>
                        <th><NumberFormat value={accion.viatic_value} displayType={"text"} thousandSeparator={true} prefix={"$"}/></th>
                        <th><NumberFormat value={accion.sum_viatic} displayType={"text"} thousandSeparator={true} prefix={"$"}/></th>
                        */}

                    <th>
                      <ul>
                        <li>Cotizado: <b>{accion.eng_hours}</b> </li>
                        <li>Ejecutado: <b>{accion.ing_horas_eje}</b> </li>
                        <li>Avance: <b style={{ color: this.alertIng(accion.ing_horas_porcentaje, this.props.alerts[0].ing_ejecucion_min, this.props.alerts[0].ing_costo_med) }}>{accion.ing_horas_porcentaje}%</b> </li>

                      </ul>
                    </th>

                    <th>
                      <ul>
                        <li>Ing Cotizada: <b><NumberFormat value={accion.ing_costo_cotizado} displayType={"text"} thousandSeparator={true} prefix={"$"} /></b> </li>
                        <li>Ing costo: <b><NumberFormat value={accion.ing_costo_real} displayType={"text"} thousandSeparator={true} prefix={"$"} /></b> </li>
                        <li>Margen: <b style={{ color: this.alertIngCosto(accion.ing_costo_porcentaje, this.props.alerts[0].ing_costo_min, this.props.alerts[0].ing_costo_med) }}>{accion.ing_costo_porcentaje}%</b> </li>
                      </ul>
                    </th>

                    <th>
                      <ul>
                        <li>Cotizado: <b>{accion.hours_contractor}</b> </li>
                        <li>Ejecutado: <b>{accion.cont_horas_eje}</b> </li>
                        <li>Avance: <b style={{ color: this.alertIng(accion.cont_horas_porcentaje, this.props.alerts[0].tab_ejecucion_min, this.props.alerts[0].tab_ejecucion_med) }}>{accion.cont_horas_porcentaje}%</b> </li>

                      </ul>
                    </th>

                    <th>
                      <ul>
                        <li>Tab Cotizada: <b><NumberFormat value={accion.cont_costo_cotizado} displayType={"text"} thousandSeparator={true} prefix={"$"} /></b> </li>
                        <li>Tab costo: <b><NumberFormat value={accion.cont_costo_real} displayType={"text"} thousandSeparator={true} prefix={"$"} /></b> </li>
                        <li>Margen: <b style={{ color: this.alertIngCosto(accion.cont_costo_porcentaje, this.props.alerts[0].tab_costo_min, this.props.alerts[0].tab_costo_med) }}>{accion.cont_costo_porcentaje}%</b> </li>

                      </ul>
                    </th>

                    <th>
                      <ul>
                        <li>Cotizado: <b>{accion.displacement_hours}</b></li>
                        <li>Ejecutado: <b>{accion.desp_horas_eje}</b> </li>
                        <li>Ejecucion: <b style={{ color: this.alertIng(accion.desp_horas_porcentaje, this.props.alerts[0].desp_min, this.props.alerts[0].desp_med) }}>{accion.desp_horas_porcentaje}%</b> </li>

                      </ul>
                    </th>

                    <th>
                      <ul>
                        <li>Cotizados: <b><NumberFormat value={accion.materials_value} displayType={"text"} thousandSeparator={true} prefix={"$"} /></b>  </li>
                        <li>Comprados: <b><NumberFormat value={accion.mat_costo_real} displayType={"text"} thousandSeparator={true} prefix={"$"} /></b> </li>
                        <li>Margen: <b style={{ color: this.alertIngCosto(accion.mat_costo_porcentaje, this.props.alerts[0].mat_min, this.props.alerts[0].mat_med) }}>{accion.mat_costo_porcentaje}%</b> </li>

                      </ul>
                    </th>

                    <th>
                      <ul>
                        <li>Cotizado: <b><NumberFormat value={accion.viatic_value} displayType={"text"} thousandSeparator={true} prefix={"$"} /></b> </li>
                        <li>Gastado: <b><NumberFormat value={accion.viat_costo_real} displayType={"text"} thousandSeparator={true} prefix={"$"} /></b> </li>
                        <li>Avance: <b style={{ color: this.alertIng(accion.viat_costo_porcentaje, this.props.alerts[0].via_min, this.props.alerts[0].via_med) }}>{accion.viat_costo_porcentaje}%</b> </li>


                      </ul>
                    </th>

                    <th>
                      <ul>
                        <li>Cotizado: <b><NumberFormat value={accion.quotation_value} displayType={"text"} thousandSeparator={true} prefix={"$"} /></b> </li>
                        <li>Facturado: <b><NumberFormat value={accion.fact_real} displayType={"text"} thousandSeparator={true} prefix={"$"} /></b> </li>
                        <li>Avance: <b>{accion.fact_porcentaje}%</b> </li>
                      </ul>
                    </th>
                    <th style={{ textAlign: "center" }}><NumberFormat value={accion.aiu} displayType={"text"} thousandSeparator={true} prefix={"$"} />
                      <div style={{ color: this.alertIngCosto(accion.aiu_percent, this.props.alerts[0].total_min, this.props.alerts[0].total_med) }}>{accion.aiu_percent}%</div>
                    </th>
                    <th style={{ textAlign: "center" }}><NumberFormat value={accion.aiu_real} displayType={"text"} thousandSeparator={true} prefix={"$"} />
                      <div style={{ color: this.alertIngCosto(accion.aiu_percent_real, this.props.alerts[0].total_min, this.props.alerts[0].total_med) }}>{accion.aiu_percent_real}%</div>
                    </th>
                    <th><NumberFormat value={this.get_sales_orders(accion.sales_orders)} displayType={"text"} thousandSeparator={true} prefix={"$"} /></th>
                    <th><NumberFormat value={accion.quotation_value} displayType={"text"} thousandSeparator={true} prefix={"$"} /></th>
                    <th>
                      {this.getDate(accion.created_at)} <br />
                      {accion.user != undefined ? <React.Fragment> <b> </b> {accion.user != undefined ? accion.user.names : ""} </React.Fragment> : null}
                    </th>

                    <th>
                      {this.getDate(accion.updated_at)} <br />
                      {accion.last_user_edited != undefined ? <React.Fragment> <b> </b> {accion.last_user_edited != undefined ? accion.last_user_edited.names : ""} </React.Fragment> : null}
                    </th>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="13" className="text-center">
                    <div className="text-center mt-1 mb-1">
                      <h4>No hay registros</h4>
                      {this.props.estados.create == true && (
                        <button onClick={() => this.toggle("new")} className="btn btn-secondary">Nuevo centro de costo</button>
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

export default tableIndex;
