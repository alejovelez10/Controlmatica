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
          quotation_number: "0.0",
          execution_state: "PENDIENTE",

          eng_hours: "0.0",
          hour_real: this.props.hours_real,
          hour_cotizada: this.props.hours_invoices,


          hours_contractor: "0.0",
          hours_contractor_real: "0.0",
          hours_contractor_invoices: "0.0",

          materials_value: "0.0",
          viatic_value: "0.0",
          quotation_value: "0.0",
        },

        selectedOption: {
          customer_id: "",
          label: "Seleccionar cliente"
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
    if (this.state.form.customer_id != "" && 
        this.state.form.contact_id != "" && 
        this.state.form.service_type != "" && 
        this.state.form.start_date != "" && 
        this.state.form.end_date != "" &&
        this.state.form.quotation_number != "" &&


        this.state.form.eng_hours != "" && 
        this.state.form.hour_real != "" &&
        this.state.form.hour_cotizada != "" &&

        this.state.form.hours_contractor != "" && 
        this.state.form.hours_contractor_real != "" &&
        this.state.form.hours_contractor_invoices != "" &&

        this.state.form.materials_value != "" && 
        this.state.form.viatic_value != "" &&
        this.state.form.quotation_value != ""

        
        
        //servicios 

      

        


        /*
          eng_hours
          hour_real
          hour_cotizada
          viatic_value
          quotation_value
        */

        //VENTA 

        /*
          materials_value
          quotation_value
        */

        //PROYECTO 

        /*
          eng_hours
          hour_real
          hour_cotizada
          hours_contractor
          hours_contractor_real
          hours_contractor_invoices
          materials_value
          viatic_value
          quotation_value
        */


        ) {
          console.log("los campos estan llenos")
      this.setState({ ErrorValues: true })
      return true
    }else{
      console.log("los campos no se han llenado")
      console.log(this.state.form)
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

  removeValues = (remove) => {
    if (remove) {
      console.log("removeValues")
      this.setState({
        form: {
          customer_id: "",
          contact_id: "",
          user_id: this.props.usuario.id,
          description: "",
          start_date: "",
          end_date: "",
          quotation_number: "",
          execution_state: "PENDIENTE",
  
          eng_hours: (this.state.form.service_type == "SERVICIO" || this.state.form.service_type == "PROYECTO"  || this.state.form.service_type == "VENTA"  ? "" : "0.0"),

          hour_real: (this.state.form.service_type == "PROYECTO" ? "" : this.props.hours_real),
          hour_cotizada: (this.state.form.service_type == "PROYECTO" ? "" : this.props.hours_invoices),
  
          hours_contractor: (this.state.form.service_type == "PROYECTO" || this.state.form.service_type == "VENTA" ? "" : "0.0"),
          hours_contractor_real: (this.state.form.service_type == "PROYECTO" || this.state.form.service_type == "VENTA" ? "" : "0.0"),
          hours_contractor_invoices: (this.state.form.service_type == "PROYECTO" || this.state.form.service_type == "VENTA" ? "" : "0.0"),
  
          materials_value: (this.state.form.service_type == "VENTA" || this.state.form.service_type == "PROYECTO" ? "" : "0.0"),

          viatic_value: (this.state.form.service_type == "SERVICIO" || this.state.form.service_type == "PROYECTO" ? "" : "0.0"),
          quotation_value: (this.state.form.service_type == "SERVICIO" || this.state.form.service_type == "VENTA" || this.state.form.service_type == "PROYECTO" ? "" : "0.0")

        }
      }) 

      console.log(this.state.form)
    }
  }

        /*

        hours_contractor: ""
hours_contractor_invoices: ""
hours_contractor_real: ""
materials_value: ""



          eng_hours
          hour_real
          hour_cotizada

          hours_contractor
          hours_contractor_real
          hours_contractor_invoices

          materials_value
          viatic_value
          quotation_value
        */

  handleChange = e => {
    if (e.target.name == "service_type") {

     if (e.target.value == "VENTA"){
      this.setState({
        form:{
          ...this.state.form,
         eng_hours: '10',
         hour_real: '40',
         service_type: e.target.value
        }
      })
     }
    }else{

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
      if (this.state.modeEdit == true) {
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
            this.props.loadInfo();
            this.MessageSucces(data.message, data.type, data.message_error);

            this.setState({
              modal: false,
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

            this.props.loadInfo();
            this.removeValues(true)
            this.MessageSucces(data.message, data.type, data.message_error);

            this.setState({
              modal: false,
              selectedOption: {
                customer_id: "",
                label: "Buscar cliente"
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
        this.props.loadInfo()
        
        Swal.fire(
          'Actualizado!',
          '¡El registro fue actualizado con exito!',
          'success'
        )
      });
      }
    })

  }

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

  edit = modulo => {
    console.log(modulo)
    if(this.state.modeEdit === true){
      this.setState({modeEdit: false})
    }else{
      this.setState({modeEdit: true})
    }

    this.toggle("edit")

      this.setState({
        selectedOption: {
          value: modulo.customer_id,
          label: modulo.customer.name
        },
        selectedOptionContact: {
          value: modulo.contact.customer_id,
          label: modulo.contact.name
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

          eng_hours: modulo.eng_hours != undefined ? modulo.eng_hours : "" ,
          hour_real: modulo.hour_real != undefined ? modulo.hour_real : "",
          hour_cotizada: modulo.hour_cotizada != undefined ? modulo.hour_cotizada : "",


          hours_contractor: modulo.hours_contractor != undefined ? modulo.hours_contractor : "",
          hours_contractor_real: modulo.hours_contractor_real != undefined ? modulo.hours_contractor_real : "",
          hours_contractor_invoices: modulo.hours_contractor_invoices != undefined ? modulo.hours_contractor_invoices : "",

          materials_value: modulo.materials_value != undefined ? modulo.materials_value : "",
          viatic_value: modulo.viatic_value != undefined ? modulo.viatic_value : "",
          quotation_value: modulo.quotation_value != undefined ? modulo.quotation_value : "",


        },
        
        }
        
      )
      
  };


  get_btn(accion){
    if (accion.execution_state == "FINALIZADO" && accion.invoiced_state == "FACTURADO") {
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

                        {this.props.estados.create == true && (
                          <button  onClick={() => this.toggle("new")} className="btn btn-secondary">Nuevo centro de costo</button>
                        )}
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
                    <th>Tipo</th>
                    <th>Descripcion</th>
                    <th>Número de cotización</th>
                    <th>$ Ingeniería Cotizado</th>
                    <th>$ Ingeniería Ejecutado</th>
                    <th>$ Viaticos Cotizado</th>
                    <th>$ Viaticos Real</th>
                    {this.props.estados.ending == true && (
                      <th className="text-center" style={{ width: "2%"}}>¿Finalizo?</th>
                    )}
                    <th className="text-center" style={{ width: "6%"}}>Estado de ejecución</th>
                    <th className="text-center" style={{ width: "11%"}}>Estado facturado</th>
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

                                {this.props.estados.manage_module == true && (
                                  <a href={`/cost_centers/${accion.id}`} target="_blank" className="dropdown-item">
                                    Gestionar
                                  </a>    
                                )}

                                {this.props.estados.edit == true && (
                                  <button onClick={() => this.edit(accion)} className="dropdown-item">
                                    Editar
                                  </button>
                                )}

                                {this.props.estados.delete == true && (
                                  <button onClick={() => this.delete(accion.id)} className="dropdown-item">
                                    Eliminar
                                  </button>
                                )}

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
                        <th><NumberFormat value={accion.sum_executed} displayType={"text"} thousandSeparator={true} prefix={"$"}/></th>
                        <th><NumberFormat value={accion.viatic_value} displayType={"text"} thousandSeparator={true} prefix={"$"}/></th>
                        <th><NumberFormat value={accion.sum_viatic} displayType={"text"} thousandSeparator={true} prefix={"$"}/></th>

                        {this.props.estados.ending == true && (
                          <th>
                            {this.get_btn(accion)}
                          </th>
                        )}

                        <th className="text-center">{accion.execution_state}</th>
                        <th className="text-center">{accion.invoiced_state}</th>                      
                      </tr>
                    ))
                  ) : (
                    <tr>
                    <td colSpan="13" className="text-center">
                        <div className="text-center mt-1 mb-1">
                        <h4>No hay registros</h4>
                        {this.props.estados.create == true && (
                          <button  onClick={() => this.toggle("new")} className="btn btn-secondary">Nuevo centro de costo</button>
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
