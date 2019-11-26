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
        action: {},
        title: "",
        id: "",

        ErrorValues: true,

        form: {
          sales_number: "",
          sales_date: "",
          ammount: "",
          user_id: this.props.usuario.id,
          cost_center_id: this.props.cost_center.id
        },

        formUpdate: {
          sales_number: "",
          sales_date: "",
          ammount: "",
          user_id: this.props.usuario.id,
          cost_center_id: this.props.cost_center.id
        },


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
    if (this.state.form.created_date != "" && 
        this.state.form.order_number != "" &&
        this.state.form.order_value != "" 
  
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
      if(this.state.modeEdit == true){
        
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
            this.props.loadShow()
            this.MessageSucces(data.message, data.type, data.message_error)

            this.setState({
              modal: false,
              form: {
                sales_number: "",
                sales_date: "",
                ammount: "",
                user_id: this.props.usuario.id,
                cost_center_id: this.props.cost_center.id
            }
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
            this.props.loadShow()

            this.MessageSucces(data.message, data.type, data.message_error)

            this.setState({
              modal: false,
                form: {
                  sales_number: "",
                  sales_date: "",
                  ammount: "",
                  user_id: this.props.usuario.id,
                  cost_center_id: this.props.cost_center.id
              }
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
        title: "Editar pago",
        form:{
            voucher_outflow: modulo.voucher_outflow,
            payment_date: modulo.payment_date,
            payment_number: modulo.payment_number,
            value_paid: modulo.value_paid,
            user_id: this.props.usuario.id,
            cost_center_id: this.props.cost_center.id
          }
          
        }
        
      )
      
  };


  toggle(from) {
    if(from == "edit"){
      this.setState({modeEdit: true})
      
    }else if(from == "new"){

      this.setState({
        modeEdit: false ,
        title: "Agregar contratista",
        form: {
          sales_number: "",
          sales_date: "",
          ammount: "",
          user_id: this.props.usuario.id,
          cost_center_id: this.props.cost_center.id
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
        this.props.loadShow()
        
        Swal.fire(
          'Borrado!',
          '¡El registro fue eliminado con exito!',
          'success'
        )
      });
      }
    })

  }


  handleChangeUpdate = e => {
    this.setState({
      formUpdate: {
        ...this.state.formUpdate,
        [e.target.name]: e.target.value
      }
    });
  };

  editTable = (accion) =>{
    this.setState({
      id: accion.id,
      formUpdate: {
        sales_number: accion.sales_number,
        sales_date: accion.sales_date,
        ammount: accion.ammount,
        user_id: this.props.usuario.id,
        cost_center_id: this.props.cost_center.id
      }
    })
  }

  updateInfo = () => {
    fetch("/contractors/" + this.state.id, {
      method: 'PATCH', // or 'PUT'
      body: JSON.stringify(this.state.formUpdate), // data can be `string` or {object}!
      headers: {
        'Content-Type': 'application/json',
      }
    }).then(res => res.json())
      .catch(error => console.error('Error:', error))
      .then(data => {
        this.props.loadInfo()

        this.setState({
          id: "",
          formUpdate: {
            sales_number: "",
            sales_date: "",
            ammount: "",
            user_id: this.props.usuario.id,
            cost_center_id: this.props.cost_center.id
          }
        });

      });
  }


  render() {
    return (
        <React.Fragment>

           <div className="col-md-12 p-0 mb-4">
                <div className="row">
                    <div className="col-md-8 text-left">
                      <h2>
                        <span className="badge badge-secondary">
                            Contratistas <i className="fas fa-users ml-2"></i>
                        </span>
                      </h2>
                    </div>

                    <div className="col-md-4 text-right mt-1 mb-1">
                      {this.props.estados.create == true && (      
                        <button type="button" onClick={() => this.toggle("new")} className="btn btn-secondary">Agregar contratistas</button>
                      )}
                    </div>

                </div>
            </div>

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
            />

            <div className="content">
            
              <table
                className="table table-hover table-bordered"
                id="sampleTable"
              >
                <thead>
                  <tr className="tr-title">
                    <th>Fecha de Generacion</th>
                    <th>Numero</th>
                    <th>Valor</th>
                     {this.state.id != "" &&
                          <th></th>
                      }
                    <th style={{width: "60px"}} className="text-center">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {this.props.dataActions.length >= 1 ? (
                    this.props.dataActions.map(accion => (
                      <tr key={accion.id}>
                        <td>
                          {this.state.id == accion.id ? (
                                    <input 
                                      type="date" 
                                      className="form form-control" 
                                      name="sales_date"
                                      onChange={this.handleChangeUpdate}
                                      value={this.state.formUpdate.sales_date}
                                    />
                                ) : (
                                    <p>{accion.sales_date}</p>
                                  
                          )}
                          
                        </td>

                        <td>
                          {this.state.id == accion.id ? (
                                    <input 
                                      type="number" 
                                      className="form form-control" 
                                      name="sales_number"
                                      onChange={this.handleChangeUpdate}
                                      value={this.state.formUpdate.sales_number}
                                    />
                                ) : (
                                    <p>{accion.sales_number}</p>
                                  
                          )}
                        </td>
                        
                        <td>
                          {this.state.id == accion.id ? (
                                  <NumberFormat 
                                  name="ammount"
                                  thousandSeparator={true} 
                                  prefix={'$'} 
                                  className={`form form-control`}
                                  value={this.state.formUpdate.ammount}
                                  onChange={this.handleChangeUpdate}
                                  placeholder="Valor total"
                                /> 
                                ) : (
                                  <NumberFormat
                                  value={accion.ammount}
                                  displayType={"text"}
                                  thousandSeparator={true}
                                  prefix={"$"}
                                />
                                  
                          )}

                        </td>

                          {this.state.id != "" &&
                              <td style={{width: "118px"}}>
                                {this.state.id == accion.id && (
                                      <React.Fragment>
                                        <button className="btn btn-secondary" onClick={() => this.updateInfo()}>
                                          <i className="fas fa-check"></i>
                                        </button>
                                        <button className="btn btn-danger ml-2" onClick={() => this.setState({ id: ""})}>
                                          <i className="fas fa-times"></i>
                                        </button>
                                      </React.Fragment>
                                )}
                              </td>
                          }
  
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
                                {this.props.estados.edit == true && (   
                                  <button onClick={() => this.editTable(accion)} className="dropdown-item">
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
                      
                      </tr>
                    ))
                  ) : (
                    <td colSpan="8" className="text-center">
                        <div className="text-center mt-1 mb-1">
                        <h4>No hay contratistas</h4>
                          {this.props.estados.create == true && (  
                            <button type="button" onClick={() => this.toggle("new")} className="btn btn-secondary mt-3 mb-3">Agregar contratistas</button>
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
