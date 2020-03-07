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

        formUpdate: {
          execution_state: "",
          invoiced_state: ""
        },

        id: "",
        from_state: "",

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

          displacement_hours: "0.0",
          value_displacement_hours: "0.0"
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
        this.state.form.value_displacement_hours != ""

        ) {
          console.log("los campos estan llenos")
      this.setState({ ErrorValues: true })
      return true
    }else{
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
  
          eng_hours: "",

          hour_real: this.props.hours_real,
          hour_cotizada: this.props.hours_invoices,
  
          hours_contractor: "",
          hours_contractor_real: "",
          hours_contractor_invoices: "",
  
          materials_value: "",

          viatic_value: "",
          quotation_value: "",

          displacement_hours: "",
          value_displacement_hours: "",
        },

        ErrorValues: true,
      }) 
    }
  }

  handleChange = e => {
    if (e.target.name == "service_type") {

     if (e.target.value == "VENTA"){
       
      this.setState({
        form:{
          ...this.state.form,
          eng_hours: "0.0",
          hour_real: "0.0",
          hour_cotizada: "0.0",

          hours_contractor: "0.0",
          hours_contractor_real: "0.0",
          hours_contractor_invoices: "0.0",
  
          materials_value: "",
          quotation_value: "",

          displacement_hours: "0.0",
          value_displacement_hours: "0.0",

          viatic_value: "0.0",
          service_type: e.target.value
        }
      })

     }else if (e.target.value == "SERVICIO"){

      this.setState({
        form:{
          ...this.state.form,
          eng_hours: "",
          viatic_value: "",
          quotation_value: "",

          hour_real: this.props.hours_real,
          hour_cotizada: this.props.hours_invoices,

          hours_contractor: "0.0",
          hours_contractor_real: "0.0",
          hours_contractor_invoices: "0.0",

          displacement_hours: "",
          value_displacement_hours: "",
  
          materials_value: "0.0",
          service_type: e.target.value
        }
      })

     }else if (e.target.value == "PROYECTO"){

      this.setState({
        form:{
          ...this.state.form,
          eng_hours: "",
          hour_real: this.props.hours_real,
          hour_cotizada: this.props.hours_invoices,

          hours_contractor: "",
          hours_contractor_real: "",
          hours_contractor_invoices: "",

          displacement_hours: "",
          value_displacement_hours: "",
  
          materials_value: "",

          viatic_value: "",
          quotation_value: "",
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
    if(this.state.modeEdit === true){
      this.setState({modeEdit: false})
    }else{
      this.setState({modeEdit: true})
    }

    this.toggle("edit")

    let array = []

    fetch(`/get_client/${modulo.contact_id}/centro`)
    .then(response => response.json())
    .then(data => {

      data.map((item) => (
        array.push({label: item.name, value: item.id})
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

          eng_hours: modulo.eng_hours != "" ? modulo.eng_hours : "0.0" ,
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


  get_btn(accion){
    if (accion.execution_state == "EJECUCION") {
      return <button className="btn btn-primary" onClick={() => this.updateState(accion)}>Finalizar</button> 
    }else{
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


  get_sales_orders(sales_orders){
    var acumulado = 0;
    sales_orders.forEach(element => {
        acumulado = acumulado + element.order_value 
    });
  
      return acumulado;
  }

  HandleClickUpdate = (register, state_show, from_state) => {
    this.setState({ 
      id: (state_show == true ? register.id : "" ),
      from_state: (state_show == true ? from_state : "" ),

      formUpdate: {
        execution_state: (state_show == true && from_state == "execution_state" ? register.execution_state : "" ),
        invoiced_state: (state_show == true && from_state == "invoiced_state" ? register.invoiced_state : "" )
      },
    });
  } 

  onChangeUpdateSelect = (e) =>{
    fetch("/update_cost_centers/" + this.state.id + "/" + this.state.from_state + "/" + e.target.value , {
        method: 'POST', // or 'PUT' 
    })
    .then(res => res.json())
    .catch(error => console.error("Error:", error))
    .then(data => {    
      this.props.loadInfo();
      this.MessageSucces(data.message, data.type, data.message_error);
    
      this.setState({
        id: "",
        from_state: "",

        formUpdate: {
          execution_state: "",
          invoiced_state: ""
        },
      })

    });
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
          modeEdit={this.state.modeEdit}
          

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

                          {this.props.estados.download_file == true && (
                            <a
                              className=" mr-2"
                              href={`/download_file/cost_centers/${this.props.filtering == false ? "todos" : this.range(this.props.exel_values)}.xls`}
                              target="_blank"
                            >
                              <img src="https://mybc1.s3.amazonaws.com/uploads/rseguimiento/evidencia/244/file_formats_4_csv-512.png" alt="" style={{height: "35px"}}/>
                            </a>
                          )}

                        {this.props.estados.create == true && (
                          <button  onClick={() => this.toggle("new")} className="btn btn-secondary">Nuevo centro de costo</button>
                        )}
                    </div>

                </div>
            </div>

            <div className="content-table">
            
              <table
                className="table table-hover table-bordered table-width"
                id="sampleTable" style={{tableLayout: "fixed"}}
              >
                <thead>
                  <tr className="tr-title">
                    <th style={{width: "100px"}} className="text-center">Acciones</th>
                    <th style={{width: "200px"}}>Codigo</th>
                    <th style={{width: "200px"}}>Cliente</th>
                    <th style={{width: "200px"}}>Tipo</th>
                    <th style={{width: "400px"}}>Descripcion</th>
                    {this.props.estados.ending == true && (
                      <th className="text-center" style={{ width: "100px"}}>¿Finalizo?</th>
                    )}
                    <th className="text-left" style={{ width: "250px"}}>Estado de ejecución</th>
                    <th className="text-left" style={{ width: "300px"}}>Estado facturado</th>
                    <th style={{ width: "250px"}}>Número de cotización</th>
                    <th style={{ width: "250px"}}>$ Ingeniería Cotizado</th>
                    <th style={{ width: "250px"}}>$ Ingeniería Ejecutado</th>
                    <th style={{ width: "250px"}}>$ Viaticos Cotizado</th>
                    <th style={{ width: "250px"}}>$ Viaticos Real</th>
                    <th style={{ width: "250px"}}>$ Total Legalizado</th>
                    <th style={{ width: "250px"}}>$ Total Cotizado</th>
                    
                
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

                        {this.props.estados.ending == true && (
                          <th>
                            {this.get_btn(accion)}
                          </th>
                        )}

                        <th>
                          {this.state.id == accion.id && this.state.from_state == "execution_state" ? (
                            <React.Fragment>
                                <select 
                                  name="estado" 
                                  className="form form-control"
                                  onChange={this.onChangeUpdateSelect}
                                  value={this.state.formUpdate.execution_state}
                                  style={{ display: "inherit", width: "90%"}}
                                >
                                <option value="">Seleccione un estado</option>
                                <option value="PENDIENTE">PENDIENTE</option>
                                <option value="EJECUCION">EJECUCION</option>
                                <option value="PROYECTO">PROYECTO</option>
                                <option value="SERVICIO">SERVICIO</option>
                                <option value="VENTA">VENTA</option>

                              </select> 

                              <i onClick={() => this.HandleClickUpdate(accion, false, "execution_state")} className="fas fa-times-circle float-right"></i>
                            </React.Fragment>
                          ) : (
                            <p>{accion.execution_state} {this.props.estados.update_state == true ? <i onClick={() => this.HandleClickUpdate(accion, true, "execution_state")} className="fas fa-pencil-alt float-right"></i> : ""} </p>
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
                                style={{ display: "inherit", width: "90%"}}
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
                        <th><NumberFormat value={accion.engineering_value + (accion.value_displacement_hours * accion.displacement_hours)} displayType={"text"} thousandSeparator={true} prefix={"$"}/></th>
                        <th><NumberFormat value={accion.sum_materials_costo + accion.offset_value } displayType={"text"} thousandSeparator={true} prefix={"$"}/></th>
                        <th><NumberFormat value={accion.viatic_value} displayType={"text"} thousandSeparator={true} prefix={"$"}/></th>
                        <th><NumberFormat value={accion.sum_viatic} displayType={"text"} thousandSeparator={true} prefix={"$"}/></th>
                        <th><NumberFormat value={ this.get_sales_orders(accion.sales_orders) } displayType={"text"} thousandSeparator={true} prefix={"$"}/></th>
                        <th><NumberFormat value={accion.quotation_value} displayType={"text"} thousandSeparator={true} prefix={"$"}/></th>
                
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
