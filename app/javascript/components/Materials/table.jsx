import React from "react";
import SweetAlert from "sweetalert2-react";
import Swal from "sweetalert2/dist/sweetalert2.js";
import FormCreate from "../Materials/FormCreate";
import ShowInfo from "../Materials/ShowInfo";
import NumberFormat from "react-number-format";
import FormIncomeDetail from "../incomeDetail/formCreate"

class table extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      modal: false,
      backdrop: "static",
      modeEdit: false,
      modalShow: false,
      isLoading: false,

      modalIncomeDetail: false,
      ErrorValuesIncome: true,
      data_incomes: [],

      action: {},
      title: "Nuevo convenio",
      id: "",
      material_id: "",

      ErrorValues: true,

      formUpdate: {
        sales_state: ""
      },

      form: {
        provider_id: "",
        sales_date: "",
        sales_number: "",
        amount: "",
        delivery_date: "",
        sales_state: "",
        description: "",
        user_id: this.props.usuario.id,
        cost_center_id: ""
      },

      formCreateIncome: {
        number: "",
        value: "",
        observation: "",
        material_id: "",
        user_id: this.props.usuario.id,
      },

      selectedOptionCentro: {
        cost_center_id: "",
        label: "Centro de costo"
      },

      dataCostCenter: []

    };

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

    this.props.cost_center.map((item) => (
      array.push({label: item.code, value: item.id})
    ))

    this.setState({
      dataCostCenter: array
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
    if (
      this.state.form.provider_id != "" &&
      this.state.form.cost_center_id != "" &&
      this.state.form.sales_date != "" &&
      this.state.form.sales_number != "" &&
      this.state.form.amount.length != 0  &&
      this.state.form.delivery_date != "" &&
      this.state.form.description != "" 
    ) {
      
      console.log("los campos estan llenos");
      this.setState({ ErrorValues: true });
      return true;
    } else {
     
      console.log("los campos no se han llenado");
      this.setState({ ErrorValues: false });
      return false;
    }
  };

  HandleClick = e => {
    if (this.validationForm() == true) {
      this.setState({ isLoading: true })
      if (this.state.modeEdit) {
        fetch("/materials/" + this.state.action.id, {
          method: "PATCH", 
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
              isLoading: false,
              form: {
                provider_id: "",
                sales_date: "",
                sales_number: "",
                amount: "",
                delivery_date: "",
                sales_state: "",
                description: "",
                user_id: this.props.usuario.id,
                ccost_center_id: ""
              },

              selectedOptionCentro: {
                cost_center_id: "",
                label: "Centro de costo"
              },
            });
          });
      } else {

        fetch("/materials", {
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
              isLoading: false,
              form: {
                provider_id: "",
                sales_date: "",
                sales_number: "",
                amount: "",
                delivery_date: "",
                sales_state: "",
                description: "",
                user_id: this.props.usuario.id,
                cost_center_id: ""
              },

              selectedOptionCentro: {
                cost_center_id: "",
                label: "Centro de costo"
              },
            });
          });

      }
    }
  };

  edit = modulo => {
    if (this.state.modeEdit === true) {
      this.setState({ modeEdit: false });
    } else {
      this.setState({ modeEdit: true });
    }

    this.toggle("edit");

    this.setState({
      action: modulo,
      title: "Editar Materiales",
      form: {
        provider_id: modulo.provider_id,
        sales_date: modulo.sales_date,
        sales_number: modulo.sales_number,
        amount: modulo.amount,
        delivery_date: modulo.delivery_date,
        sales_state: modulo.sales_state,
        description: modulo.description,
        user_id: this.props.usuario.id,
        cost_center_id: modulo.cost_center_id
      },

      selectedOptionCentro: {
        cost_center_id: modulo.cost_center_id,
        label: `${modulo.cost_center != undefined ? modulo.cost_center.code : ""}`
      },

    });
  };

  toggle(from) {
    if (from == "edit") {
      this.setState({ modeEdit: true });
    } else if (from == "new") {
      this.setState({
        modeEdit: false,
        title: "Agregar materiales",
        form: {
          provider_id: "",
          sales_date: "",
          sales_number: "",
          amount: "",
          delivery_date: "",
          sales_state: "",
          description: "",
          user_id: this.props.usuario.id,
          cost_center_id: ""
        },

        selectedOptionCentro: {
          cost_center_id: "",
          label: "Centro de costo"
        },
      });
    } else {
      if (this.state.modeEdit === true) {
        this.setState({ modeEdit: false });
      } else {
        this.setState({ modeEdit: true });
      }

      this.setState({
        ErrorValues: true
      });
    }

    this.setState(prevState => ({
      modal: !prevState.modal
    }));
  }

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
        fetch("/materials/" + id, {
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

  show = (estado, info) => {
    if (estado == "open") {
      this.setState({ modalShow: true, action: info });
    } else if (estado == "close") {
      this.setState({ modalShow: false, action: {} });
    }
  };


  /* INCOME DETAIL */

  handleChangeIncomes = e => {
    this.setState({
      formCreateIncome: {
        ...this.state.formCreateIncome,
        [e.target.name]: e.target.value
      }
    });
  };

  HandleClickIncomes = e =>{
    if (this.validationFormIncomeDetail() == true) {
      fetch("/material_invoices", {
        method: 'POST', // or 'PUT'
        body: JSON.stringify(this.state.formCreateIncome), // data can be `string` or {object}!
        headers: {
          'Content-Type': 'application/json',
        }
        
      })
        .then(res => res.json())
        .catch(error => console.error("Error:", error))
        .then(data => {
          
          this.incomeDetail(this.state.id)
          this.props.loadInfo()
          this.MessageSucces(data.message, data.type, data.message_error)

          this.setState({
            formCreateIncome: {
              date_detail: "",
              value: "",
              voucher: "",
              user_id: this.props.usuario.id,
            },
          });
        });
    }
  }

  incomeDetail = (accion) =>{
    fetch("/get_material_invoice/" + accion)
    .then(response => response.json())
    .then(data => {
      this.setState({
        data_incomes: data,
        formCreateIncome: {
          number: "",
          value: "",
          observation: "",
          material_id: accion,
          user_id: this.props.usuario.id,
        },
        id: accion,
        modalIncomeDetail: true,
        title: "Agregar Facturas"
      });
    });
  }

  updateInfoIncome = (income) =>{
    fetch("/update_load/" + income)
    .then(response => response.json())
    .then(data => {
      this.setState({
        data_incomes: data
      })
    });
  }


  showIncomeDetail = (estado) =>{
    if (estado == "open") {
      this.setState({ modalIncomeDetail: true, action: info })
    }else if(estado == "close"){
      this.setState({ modalIncomeDetail: false, action: {}, ErrorValuesIncome: true })
    }
  }

  deleteIncomes = (id) => {
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
        fetch("/material_invoices/" + id, {
          method: 'delete'
      }).then(response => response.json())
      .then(response => {

        this.incomeDetail(this.state.id)
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


  validationFormIncomeDetail = () => {
    if (this.state.formCreateIncome.number != "" &&  
        this.state.formCreateIncome.value != "" && 
        this.state.formCreateIncome.observation != "" 
        ) {
    console.log("los campos estan llenos " )
      this.setState({ ErrorValuesIncome: true })
      return true
    }else{
      console.log("los campos no se han llenado")
      this.setState({ ErrorValuesIncome: false })
      return false
      
    }
  }


  onChangeUpdateSelect = (e) =>{
    fetch("/update_state_materials/" + this.state.material_id + "/" + e.target.value, {
        method: 'POST', // or 'PUT' 
    })
    .then(res => res.json())
    .catch(error => console.error("Error:", error))
    .then(data => {    
      this.props.loadInfo();
      this.MessageSucces(data.message, data.type, data.message_error);
    
      this.setState({
        material_id: "",
      })

    });
  }


  HandleClickUpdate = (register, state) => {
    this.setState({ 
      material_id: (state == true ? register.id : "" ),
      formUpdate: {
        sales_state: (state == true ? register.sales_state : "" )
      },
    });
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
                  href={`/download_file/materials/${!this.props.filtering ? "todos.xls" : `filtro.xls?provider_id=${this.props.formFilter.provider_id}&sales_date=${this.props.formFilter.sales_date}&description=${this.props.formFilter.description}&cost_center_id=${this.props.formFilter.cost_center_id}&estado=${this.props.formFilter.estado}&date_desde=${this.props.formFilter.date_desde}&date_hasta=${this.props.formFilter.date_hasta}&sales_number=${this.props.formFilter.sales_number}`}`}
                  target="_blank"
                >
                  <img src="https://mybc1.s3.amazonaws.com/uploads/rseguimiento/evidencia/244/file_formats_4_csv-512.png" alt="" style={{height: "35px"}}/>
                </a>
              )}

              {this.props.estados.create == true && (
                <button
                  type="button"
                  onClick={() => this.toggle("new")}
                  className="btn btn-secondary"
                >
                  Agregar materiales
                </button>
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
            providers={this.props.providers}

            /* AUTOCOMPLETE CENTRO DE COSTO */

            centro={this.state.dataCostCenter}
            onChangeAutocompleteCentro={this.handleChangeAutocompleteCentro}
            formAutocompleteCentro={this.state.selectedOptionCentro}

            isLoading={this.state.isLoading}
          />
        )}

        <FormIncomeDetail
          toggle={this.showIncomeDetail}
          backdrop={this.state.backdrop}
          modal={this.state.modalIncomeDetail}
          titulo={this.state.title}
          dataIncomes={this.state.data_incomes}
          FormSubmit={this.handleSubmit}

          submit={this.HandleClickIncomes}
          delete={this.deleteIncomes}
          income={this.state.id}
          loadData={this.updateInfoIncome}
          MessageSucces={this.MessageSucces}


          onChangeForm={this.handleChangeIncomes}
          formValues={this.state.formCreateIncome}
          errorValues={this.state.ErrorValuesIncome}
          estados={this.props.estados}

          loadInfo={this.incomeDetail}
          loadMaterial={this.props.loadInfo}
          id={this.state.id}
        />

        <ShowInfo
          toggle={this.show}
          backdrop={this.state.backdrop}
          modal={this.state.modalShow}
          infoShow={this.state.action}
          titulo={"Informacion detallada"}
        />

        <div className="content-table">
          <table className="table table-hover table-bordered" style={{width:"2350px",maxWidth:"2350px"}} id="sampleTable">
            <thead>
              <tr className="tr-title">
                <th style={{ width: "1%" }} className="text-center">
                  Acciones
                </th>
                <th style={{width:"253px"}}>Centro de costo</th>
                <th style={{width:"184px"}}>Proveedor</th>

                <th style={{width:"184px"}}># Orden</th>
                <th style={{width:"184px"}}>Valor</th>
                <th style={{width:"370px"}}>Descripción</th>
                <th style={{width:"217px"}}>Fecha de Orden</th>
                <th style={{width:"217px"}}>Fecha Entrega</th>
                <th style={{width:"854px"}}>Facturas</th>
                <th style={{width:"150px"}}>Valor Facturas</th>
                <th style={{width:"184px"}}>Estado</th>
                <th style={{width: "250px"}}>Creación</th>
                <th style={{width: "250px"}}>Ultima actualización</th>
              </tr>
            </thead>

            <tbody>
              {this.props.dataActions.length >= 1 ? (
                this.props.dataActions.map(accion => (
                  <tr key={accion.id}>
                    <td>
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
                              <button
                                onClick={() => this.show("open", accion)}
                                className="dropdown-item"
                              >
                                Ver informaciom
                              </button>
                            )}  

                            {true && (
                                  <button onClick={() => this.incomeDetail(accion.id)} className="dropdown-item">
                                    Facturas
                                  </button>
                            )}

                            {(this.getState(accion.user_id) && accion.cost_center.sales_state != "CERRADO") && (
                              <button
                                onClick={() => this.edit(accion)}
                                className="dropdown-item"
                              >
                                Editar
                              </button>
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
                    <td>{accion.cost_center != undefined ? accion.cost_center.code : "" }</td>
                    <td>{accion.provider != undefined ? accion.provider.name : "" }</td>

        
                    <td>{accion.sales_number}</td>
                    <td><NumberFormat value={accion.amount} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                    <td>{accion.description}</td>
                    <td>{accion.sales_date}</td>
                    <td>{accion.delivery_date}</td>
                    <td>  
                      <table style={{tableLayout: "fixed", width:"100%"}}>
                          <tr>
                              <td style={{padding:"3px", textAlign:"left"}}>Numero de factura</td>
                              <td style={{padding:"3px", textAlign:"left"}}>Valor</td>
                              <td style={{padding:"3px", textAlign:"left"}}>Descripcion</td>
                          </tr>
                          {accion.material_invoices.map(material_invoice => (
                            <tr>
                              <td style={{padding:"5px", textAlign:"left"}}>{material_invoice.number}</td>
                              <td style={{padding:"5px", textAlign:"left"}} ><NumberFormat value={material_invoice.value} displayType={"text"} thousandSeparator={true} prefix={"$"}/></td>
                              <td style={{padding:"5px", textAlign:"left"}}>{material_invoice.observation}</td>
                            </tr>
                          ))}
                            
                      </table>
                    </td>
                   
                    <td><NumberFormat value={accion.provider_invoice_value} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>

                    <td>
                          {this.state.material_id == accion.id ? (
                            <React.Fragment>
                              <select 
                                name="estado" 
                                className="form form-control"
                                onChange={this.onChangeUpdateSelect}
                                value={this.state.formUpdate.sales_state}
                                style={{ display: "inherit", width: "90%"}}
                              >
                                <option value="">Seleccione un estado</option>
                                <option value="PROCESADO">PROCESADO</option>
                                <option value="INGRESADO TOTAL">INGRESADO TOTAL</option>
                                <option value="INGRESADO CON MAYOR VALOR EN FACTURA">INGRESADO CON MAYOR VALOR EN FACTURA</option>
                                <option value="INGRESADO PARCIAL">INGRESADO PARCIAL</option>

                              </select> 

                              <i onClick={() => this.HandleClickUpdate(accion, false)} className="fas fa-times-circle float-right"></i>
                            </React.Fragment>
                          ) : (
                            <p>{accion.sales_state} {this.props.estados.update_state == true ? <i onClick={() => this.HandleClickUpdate(accion, true)} className="fas fa-pencil-alt float-right"></i> : ""} </p>
                          )} 
                    </td>

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
                <td colSpan="10" className="text-center">
                  <div className="text-center mt-1 mb-1">
                    <h4>No hay materiales</h4>
                    {this.props.estados.create == true && (
                      <button
                        type="button"
                        onClick={() => this.toggle("new")}
                        className="btn btn-secondary mt-3 mb-3"
                      >
                        Agregar materiales
                      </button>
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
