import React from "react";
import SweetAlert from 'sweetalert2-react';
import Swal from 'sweetalert2/dist/sweetalert2.js'
import FormCreate from "../PurchaseOrders/FormCreate"
import Facturas from "../SalesOrders/FormCreate"
import NumberFormat from 'react-number-format';


class table extends React.Component {
  constructor(props){
    super(props)

    this.state = {

        modal: false,
        modalIncome: false,
        backdrop: "static",
        modeEdit: false,
        data_incomes: [],
        id: "",
        action: {},
        title: "Nuevo convenio",
        id: "",

        ErrorValues: true,
        ErrorValuesInvoice: true,

        form: {
            created_date: "",
            order_number: "",
            order_value: "",
            user_id: this.props.usuario.id,
            cost_center_id: this.props.cost_center.id
        },

        formUpdate: {
          created_date: "",
          order_number: "",
          order_value: "",
          user_id: this.props.usuario.id,
          cost_center_id: this.props.cost_center.id
        },


        formInvoice: {
          sales_order_id: "",
          invoice_date: "",
          invoice_value: "",
          delivery_certificate_file: {},
          reception_report_file: {},
          cost_center_id: this.props.cost_center.id
        }

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
        
        fetch("/payments/" + this.state.action.id, {
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
              form: {
                created_date: "",
                order_number: "",
                order_value: "",
                user_id: this.props.usuario.id,
                cost_center_id: this.props.cost_center.id
            }
            });

          });

      }else{
        fetch("/sales_orders", {
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
                form: {
                  created_date: "",
                  order_number: "",
                  order_value: "",
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
        title: "Nueva orden de pago",
        form: {
          created_date: "",
          order_number: "",
          order_value: "",
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
        fetch("/sales_orders/" + id, {
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

  show(estado){
    if (estado == "open") {
      this.setState({ modal: true, action: info })
    }else if(estado == "close"){
      this.setState({ modal: false, action: {}, ErrorValues: true })
    }
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
        created_date: accion.created_date,
        order_number: accion.order_number,
        order_value: accion.order_value,
        user_id: this.props.usuario.id,
        cost_center_id: this.props.cost_center.id
      }
    })
  }

  updateInfo = () => {
    fetch("/income_details/" + this.state.id, {
      method: 'PATCH', // or 'PUT'
      body: JSON.stringify(this.state.formUpdate), // data can be `string` or {object}!
      headers: {
        'Content-Type': 'application/json',
      }
    }).then(res => res.json())
      .catch(error => console.error('Error:', error))
      .then(data => {
        this.props.loadInfo()
        this.props.MessageSucces(data.message, data.type, data.message_error)

        this.setState({
          id: "",
          formUpdate: {
            created_date: "",
            order_number: "",
            order_value: "",
            user_id: this.props.usuario.id,
            cost_center_id: this.props.cost_center.id
          }
        });

      });
  }


  /* facturaaaaaaaaaaaaaaaaaaaaaaaaaaaaa datos*/



  loadTableIncome = (accion) => {
    fetch("/get_sales_order/" + accion.id)
    .then(response => response.json())
    .then(data => {
      this.setState({
        modalIncome: true,  
        action: accion, 
        title: "Facturas",
        data_incomes: data,
        formInvoice: {
          sales_order_id: accion.id
        }
      })
    });
  }

  showIncomeDetail = (estado,accion) =>{
    if (estado == "open") {
      this.loadTableIncome(accion)
    }else if(estado == "close"){
      this.setState({ modalIncome: false, action: {}, ErrorValuesIncome: true })
      console.log("closeeeeee")
    }
  }

  HandleClickInvoice = e => {
    if (this.validationFormInvoice() == true) {
    const formData = new FormData();
    formData.append("invoice_date", this.state.formInvoice.invoice_date);
    formData.append("invoice_value", this.state.formInvoice.invoice_value);
    formData.append("sales_order_id", this.state.formInvoice.sales_order_id);
    formData.append("cost_center_id", this.props.cost_center.id);
    formData.append("delivery_certificate_file", this.state.delivery_certificate_file == undefined ? "" : this.state.delivery_certificate_file);
    formData.append("reception_report_file", this.state.reception_report_file == undefined ? "" : this.state.reception_report_file);

      fetch("/customer_invoices", {
        method: "POST", // or 'PUT'
        body: formData, // data can be `string` or {object}!
        headers: {}
      })
        .then(res => res.json())
        .catch(error => console.error("Error:", error))
        .then(data => {

          this.loadTableIncome(this.state.action)

          this.MessageSucces(data.message, data.type, data.message_error)

          this.setState({
            modal: false,
            formInvoice: {
              sales_order_id: "",
              invoice_date: "",
              invoice_value: "",
              delivery_certificate_file: {},
              reception_report_file: {},
              cost_center_id: this.props.cost_center.id
            }
          });
        });
      }
  };

  handleFileReceptionReport = e => {
    this.setState({
      reception_report_file: e.target.files[0]
    });
  };

  handleFileDeliveryCertificate = e => {
    this.setState({
      delivery_certificate_file: e.target.files[0]
    });
  };

  handleChangeInvoice = e => {
    this.setState({
      formInvoice: {
        ...this.state.formInvoice,
        [e.target.name]: e.target.value
      }
    });
  };

  deleteInvoice = (accion) => {
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
        fetch("/customer_invoices/" + accion.id, {
          method: 'delete'
      }).then(response => response.json())
      .then(response => {
        this.loadTableIncome(this.state.action)
        
        Swal.fire(
          'Borrado!',
          '¡El registro fue eliminado con exito!',
          'success'
        )
      });
      }
    })

  }

  validationFormInvoice = () => {
    if (this.state.formInvoice.invoice_date != "" && 
        this.state.formInvoice.invoice_value != "" 
  
        ) {
    console.log("los campos estan llenos")
      this.setState({ ErrorValuesInvoice: true })
      return true
    }else{
      console.log("los campos no se han llenado")
      this.setState({ ErrorValuesInvoice: false })
      return false
      
    }
  }


  render() {
    return (
        <React.Fragment>

           <div className="col-md-12 p-0 mb-4">
                <div className="row">
                    <div className="col-md-8 text-left">
                      <h2>
                        <span className="badge badge-secondary">
                          Ordenes de Compra <i className="fas fa-users ml-2"></i>
                        </span>
                      </h2>
                    </div>

                    <div className="col-md-4 text-right mt-1 mb-1">      
                          <button type="button" onClick={() => this.toggle("new")} data-toggle="modal" data-target="#exampleModal" className="btn btn-secondary">Nueva orden de pago</button>
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



            <Facturas

                toggle={this.showIncomeDetail}
                backdrop={this.state.backdrop}
                modal={this.state.modalIncome}

                onChangeForm={this.handleChangeInvoice}
                formValues={this.state.formInvoice}

                submit={this.HandleClickInvoice}

                FormSubmit={this.handleSubmit}

                onChangeFormReceptionReport={this.handleFileReceptionReport}
                onChangeDeliveryCertificate={this.handleFileDeliveryCertificate}

                titulo={this.state.title}
                errorValues={this.state.ErrorValuesInvoice}
                dataIncomes={this.state.data_incomes}
                delete={this.deleteInvoice}
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
                                      name="created_date"
                                      onChange={this.handleChangeUpdate}
                                      value={this.state.formUpdate.created_date}
                                    />
                                ) : (
                                    <p>{accion.created_date}</p>
                                  
                          )}
                          
                        </td>

                        <td>
                          {this.state.id == accion.id ? (
                                    <input 
                                      type="number" 
                                      className="form form-control" 
                                      name="order_number"
                                      onChange={this.handleChangeUpdate}
                                      value={this.state.formUpdate.order_number}
                                    />
                                ) : (
                                    <p>{accion.order_number}</p>
                                  
                          )}
                        </td>
                        
                        <td>
                          {this.state.id == accion.id ? (
                                  <NumberFormat 
                                  name="order_value"
                                  thousandSeparator={true} 
                                  prefix={'$'} 
                                  className={`form form-control`}
                                  value={this.state.formUpdate.order_value}
                                  onChange={this.handleChangeUpdate}
                                  placeholder="Valor total"
                                /> 
                                ) : (
                                  <NumberFormat
                                  value={accion.order_value}
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
                                <button onClick={() => this.showIncomeDetail("open",accion)} className="dropdown-item">
                                  Gestionar
                                </button>     

                                <button onClick={() => this.editTable(accion)} className="dropdown-item">
                                  Editar
                                </button>

                                <button onClick={() => this.delete(accion.id)} className="dropdown-item">
                                  Eliminar
                                </button>

                              </div>
                            </div>
                          </div>  
                        </td>
                      
                      </tr>
                    ))
                  ) : (
                    <td colSpan="8" className="text-center">
                        <div className="text-center mt-1 mb-1">
                        <h4>Ordenes de Compra</h4>
                        <button type="button" onClick={() => this.toggle("new")} className="btn btn-secondary" data-toggle="modal" data-target="#exampleModal">Nueva orden de pago</button>
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