import React from "react";
import SweetAlert from 'sweetalert2-react';
import Swal from 'sweetalert2/dist/sweetalert2.js'
import FormCreate from "../Contractors/FormCreate"
import NumberFormat from 'react-number-format';


class table extends React.Component {
  constructor(props){
    super(props)

    this.state = {

        modal: false,
        backdrop: "static",
        modeEdit: false,
        isLoading: false,
        action: {},
        title: "",
        id: "",

        ErrorValues: true,

        form: {
          sales_number: "",
          sales_date: "",
          ammount: "",
          description: "",
          hours: "",
          user_id: this.props.usuario.id,
          cost_center_id: "",
          user_execute_id: "",
        },

        selectedOptionCentro: {
          cost_center_id: "",
          label: "Centro de costo"
        },

        selectedOptionUsers: {
          user_execute_id: "",
          label: "Horas trabajadas por"
        },

        dataCostCenter: [],
        dataUsers: []


    }

    this.toggle = this.toggle.bind(this);
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

    range(array) {
      let ids = []
  
      array.map((item) => (
        ids.push(item.id)
      ))
  
      return ids
    }

  
    componentDidMount(){
      let array = []
      let arrayUsers = []

      this.props.cost_center.map((item) => (
        array.push({label: item.code, value: item.id})
      ))

      this.props.users.map((item) => (
        arrayUsers.push({label: item.names, value: item.id})
      ))

      this.setState({
        dataCostCenter: array,
        dataUsers: arrayUsers
      })
    }

    handleChangeAutocompleteCentro = selectedOptionCentro => {
      this.setState({
        selectedOptionCentro,
        form: {
          ...this.state.form,
          cost_center_id: selectedOptionCentro.value
        }
      });
    };

    handleChangeAutocompleteUsers = selectedOptionUsers => {
      this.setState({
        selectedOptionUsers,
        form: {
          ...this.state.form,
          user_execute_id: selectedOptionUsers.value
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

  validationForm = () => {
    if (this.state.form.sales_date != "" && 
        this.state.form.cost_center_id != "" &&
        this.state.form.hours != "" &&
        this.state.form.user_execute_id != "" &&
        this.state.form.description != "" 
  
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

  HandleClick = e => {
    if (this.validationForm() == true) {
      this.setState({ isLoading: true })
      if(this.state.modeEdit){
        
        fetch("/contractors/" + this.state.action.id, {
          method: 'PATCH', // or 'PUT'
          body: JSON.stringify(this.state.form), // data can be `string` or {object}!
          headers: {
            'Content-Type': 'application/json',
          }
        }).then(res => res.json())
          .catch(error => console.error('Error:', error))
          .then(data => {
            this.props.loadInfo()
            this.MessageSucces(data.message, data.type, data.message_error)

            this.setState({
              modal: false,
              isLoading: false,
              form: {
                sales_number: "",
                sales_date: "",
                ammount: "",
                description: "",
                hours: "",
                user_id: this.props.usuario.id,
                cost_center_id: "",
                user_execute_id: "",
            },

            selectedOptionCentro: {
              cost_center_id: "",
              label: "Centro de costo"
            },
    
            selectedOptionUsers: {
              user_execute_id: "",
              label: "Horas trabajadas por"
            },
            });

          });

      }else{
        fetch("/contractors", {
          method: 'POST', // or 'PUT'
          body: JSON.stringify(this.state.form), // data can be `string` or {object}!
          headers: {
            'Content-Type': 'application/json',
          }
          
        })
          .then(res => res.json())
          .catch(error => console.error("Error:", error))
          .then(data => {
            this.props.loadInfo()
            this.MessageSucces(data.message, data.type, data.message_error)

            this.setState({
              modal: false,
              isLoading: false,

              form: {
                  sales_number: "",
                  sales_date: "",
                  ammount: "",
                  description: "",
                  hours: "",
                  user_id: this.props.usuario.id,
                  cost_center_id: "",
                  user_execute_id: "",
              },

              selectedOptionCentro: {
                cost_center_id: "",
                label: "Centro de costo"
              },
      
              selectedOptionUsers: {
                user_execute_id: "",
                label: "Horas trabajadas por"
              },
            });
          });
      }
    } 
  };


  edit = modulo => {
    if(this.state.modeEdit === true){
      this.setState({modeEdit: false})
    }else{
      this.setState({modeEdit: true})
    }

    this.toggle("edit")

      this.setState({
        action: modulo,
        title: "Editar tablerista",
        form:{
            sales_number: modulo.sales_number,
            sales_date: modulo.sales_date,
            ammount: modulo.ammount,
            description: modulo.description,
            hours: modulo.hours,
            user_id: this.props.usuario.id,
            cost_center_id: modulo.cost_center_id,
            user_execute_id: modulo.user_execute_id,
        },

        selectedOptionCentro: {
          cost_center_id: modulo.cost_center_id,
          label: `${modulo.cost_center != undefined ? modulo.cost_center.code : "Centro de costo"}`
        },

        selectedOptionUsers: {
          user_execute_id: modulo.user_execute_id,
          label: `${modulo.user_execute != undefined ? modulo.user_execute.names : "Horas trabajadas por"}`
        },
          
        }
        
      )
      
  };


  toggle(from) {
    if(from == "edit"){
      this.setState({modeEdit: true})
      
    }else if(from == "new"){

      this.setState({
        modeEdit: false,
        isLoading: false,
        title: "Agregar tablerista",
        form: {
          sales_number: "",
          sales_date: "",
          ammount: "",
          description: "",
          hours: "",
          user_id: this.props.usuario.id,
          cost_center_id: "",
          user_execute_id: "",
      }
      })

    }else{
      if(this.state.modeEdit === true){
        this.setState({modeEdit: false})
      }else{
        this.setState({modeEdit: true})
      }

      this.setState({
        ErrorValues: true
      })

    }

    this.setState(prevState => ({
      modal: !prevState.modal
    }));
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
        fetch("/contractors/" + id, {
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


  getState = (user) => {
    if(this.props.estados.edit == true && this.props.usuario.id == user){
      return true
    }else if(this.props.estados.edit == false && this.props.estados.edit_all){
      return true

    }else if(this.props.estados.edit_all == true && this.props.usuario.id == user){
      return true
    }else if(this.props.estados.edit_all){
      return true
    }else if (this.props.estados.edit && this.props.estados.edit_all){
      return true
    }else if(this.props.estados.edit == false && this.props.estados.edit_all == false){
      return false
    }
  }
  /* asd*/

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



  render() {
    return (
        <React.Fragment>

           <div className="col-md-12 p-0 mb-4">
                <div className="row">
                    <div className="col-md-8 text-left">
                      <h2>
                        <span className="badge badge-secondary">
 
                        </span>
                      </h2>
                    </div>

                    <div className="col-md-4 text-right mt-1 mb-1">
                    <button
                      className="btn btn-light mr-3"
                      onClick={this.props.show}
                      disabled={this.props.dataActions.length >= 1 ? false : true}
                    >
                      Filtros <i className="fas fa-search ml-2"></i>
                    </button>

                      {this.props.estados.download_file && (
                        <a
                          className=" mr-2"
                          href={`/download_file/contractors/${!this.props.filtering ? "todos.xls" : `filtro.xls?user_execute_id=${this.props.formFilter.user_execute_id}&sales_date=${this.props.formFilter.sales_date}&cost_center_id=${this.props.formFilter.cost_center_id}&date_desde=${this.props.formFilter.date_desde}&date_hasta=${this.props.formFilter.date_hasta}&descripcion=${this.props.formFilter.descripcion}`}`}
                          target="_blank"
                        >
                              <img src="https://mybc1.s3.amazonaws.com/uploads/rseguimiento/evidencia/244/file_formats_4_csv-512.png" alt="" style={{height: "35px"}}/>
                        </a>
                      )}

                      {this.props.estados.create && (      
                        <button type="button" onClick={() => this.toggle("new")} className="btn btn-secondary">Agregar tablerista</button>
                      )}
                    </div>

                </div>
            </div>
            
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

                  /* AUTOCOMPLETE CENTRO DE COSTO */

                  centro={this.state.dataCostCenter}
                  onChangeAutocompleteCentro={this.handleChangeAutocompleteCentro}
                  formAutocompleteCentro={this.state.selectedOptionCentro}

                  /* AUTOCOMPLETE USERS */

                  users={this.state.dataUsers}
                  onChangeAutocompleteUsers={this.handleChangeAutocompleteUsers}
                  formAutocompleteUsers={this.state.selectedOptionUsers}

                  isLoading={this.state.isLoading}
              />
            )}

            <div className="content-table">
            
              <table
                className="table table-hover table-bordered"
                style={{  tableLayout: "fixed", width: "1400px", maxWidth: "1400px" , minWidth: "100%"}}
                id="sampleTable"
              >
                <thead>
                  <tr className="tr-title">
                  <th style={{ width: "100px" }} className="text-left">Acciones</th>
                    <th style={{ width: "150px" }} >Fecha</th>
                    <th style={{ width: "200px" }} >Centro de costo</th>
                    <th style={{ width: "100px" }} >Horas</th>
                    <th style={{ width: "200px" }} >Trabajo realizado por</th>
                    <th style={{ width: "400px" }} >Descripcion</th>
                    <th style={{width: "200px"}}>Creación</th>
                    <th style={{width: "200px"}}>Ultima actualización</th>
                    
                  </tr>
                </thead>

                <tbody>
                  {this.props.dataActions.length >= 1 ? (
                    this.props.dataActions.map(accion => (
                      <tr key={accion.id}>
                         <th>   
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
                                {(this.getState(accion.user_id) && accion.cost_center.execution_state != "FINALIZADO") &&(   
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
                        </th>
                        <td>{accion.sales_date}</td>
                        <td>{accion.cost_center != undefined ? accion.cost_center.code : ""}</td>                        
                        <td>{accion.hours}</td>
                        <td>{accion.user_execute != undefined ? accion.user_execute.names : ""}</td>
                        <td>{accion.description}</td>
                        <th>
                                                        {this.getDate(accion.created_at)} <br />
                                                        {accion.user != undefined ? <React.Fragment> <b></b> {accion.user != undefined ? accion.user.names : ""} </React.Fragment> : null}
                                                    </th>

                                                    <th>
                                                        {this.getDate(accion.updated_at)} <br />
                                                        {accion.last_user_edited != undefined ? <React.Fragment> <b></b> {accion.last_user_edited != undefined ? accion.last_user_edited.names : ""} </React.Fragment> : null }
                                                    </th>
  
                       
                      
                      </tr>
                    ))
                  ) : (
                    <td colSpan="8" className="text-center">
                        <div className="text-center mt-1 mb-1">
                        <h4>No hay tableristas</h4>
                          {this.props.estados.create == true && (  
                            <button type="button" onClick={() => this.toggle("new")} className="btn btn-secondary mt-3 mb-3">Agregar tablerista</button>
                          )}
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

export default table;
