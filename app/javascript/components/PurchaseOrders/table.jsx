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
            order_file: {},
            user_id: this.props.usuario.id,
            cost_center_id: "",
            description: "",
        },


        formInvoice: {
          sales_order_id: "",
          invoice_date: "",
          invoice_value: "",
          number_invoice: "",
          delivery_certificate_file: {},
          reception_report_file: {},
          cost_center_id: ""
        },

        dataCostCenter: [],

        selectedOptionCentro: {
          cost_center_id: "",
          label: "Centro de costo"
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

  date = (fecha) => {
      var d = new Date(fecha),
      months = ['Enero','Febrero','Marzo','Abril','Mayo','junio','julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      return months[d.getMonth()] + " " + d.getDate() + " " + 'del' + " " +d.getFullYear()
  }

  date_short = (fecha) => {
    var d = new Date(fecha)
    return (d.getDate() + 1 > 9 ? "" : "0") + (d.getDate() +  1)  + "/" + (d.getMonth() +1  > 9 ? "" : "0") + (d.getMonth()  +  1) + " " + '/' + d.getFullYear()
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

  componentDidMount() {
    let array = []

    this.props.cost_centers.map((item) => (
      array.push({label: item.code, value: item.id})
    ))

    this.setState({
      dataCostCenter: array,
    })
  }

  handleChangeAutocompleteCentro = selectedOptionCentro => {
    console.log(selectedOptionCentro.value)
    this.setState({
      selectedOptionCentro,
      form: {
        ...this.state.form,
        cost_center_id: selectedOptionCentro.value
      }
    });
  };

  HandleClick = e => {
    const formData = new FormData();
    formData.append("created_date", this.state.form.created_date);
    formData.append("order_number", this.state.form.order_number);
    formData.append("order_value", this.state.form.order_value);
    formData.append("order_file", this.state.order_file == undefined ? "" : this.state.order_file);
    formData.append("user_id", this.props.usuario.id);
    formData.append("cost_center_id", this.state.form.cost_center_id);
    formData.append("description", this.state.form.description);

    if (this.validationForm() == true) {
      if (this.state.modeEdit == true) {
        fetch("/sales_orders/" + this.state.action.id, {
          method: "PATCH", 
          body: formData, // data can be `string` or {object}!
          headers: {}
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
                  cost_center_id: "",
                  description: ""
              },

              selectedOptionCentro: {
                cost_center_id: "",
                label: "Centro de costo"
              },
            });

          });
      } else {
        fetch("/sales_orders", {
          method: "POST", // or 'PUT'
          body: formData, // data can be `string` or {object}!
          headers: {}
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
                cost_center_id: "",
                description: ""
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



  toggle(from) {
    if(from == "edit"){
      this.setState({modeEdit: true})
      
    }else if(from == "new"){

      this.setState({
        modeEdit: false ,
        title: "Orden de compra",
        form: {
          created_date: "",
          order_number: "",
          order_value: "",
          user_id: this.props.usuario.id,
          cost_center_id: "",
          description: ""
        },

        selectedOptionCentro: {
          cost_center_id: "",
          label: "Centro de costo"
        },
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

  edit = modulo => {
    console.log(modulo)
    if(this.state.modeEdit === true){
      this.setState({modeEdit: false})
    }else{
      this.setState({modeEdit: true})
    }

    this.toggle("edit")

      this.setState({

        selectedOptionCentro: {
          cost_center_id: modulo.cost_center_id,
          label: `${modulo.cost_center.code}`
        },

        action: modulo,
        title: "Editar orden de compra",

        form: {
          created_date: modulo.created_date,
          order_number: modulo.order_number,
          order_value: modulo.order_value,
          order_file: {},
          user_id: modulo.user_id,
          cost_center_id: modulo.cost_center_id,
          description: modulo.description,
        },
        
        }
        
      )
      
  };


  /* facturaaaaaaaaaaaaaaaaaaaaaaaaaaaaa datos*/



  loadTableIncome = (accion) => {
    fetch("/get_sales_order_invoice/" + accion.id)
    .then(response => response.json())
    .then(data => {
      console.log(data.sales_orders)

      this.setState({
        modalIncome: true,  
        action: accion, 
        title: "Facturas",
        data_incomes: data.sales_orders,
        formInvoice: {
          sales_order_id: accion.id,
          cost_center_id: accion.cost_center_id
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
    formData.append("number_invoice", this.state.formInvoice.number_invoice);
    formData.append("cost_center_id", this.state.formInvoice.cost_center_id);
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
          this.props.loadInfo()
          this.MessageSucces(data.message, data.type, data.message_error)

          this.setState({
            modal: false,
            formInvoice: {
              sales_order_id: "",
              invoice_date: "",
              number_invoice: "",
              invoice_value: "",
              cost_center_id: ""
            },

            delivery_certificate_file: null,
            reception_report_file: null,
            
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

  handleFileOrderFile = e => {
    this.setState({
      order_file: e.target.files[0]
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

                        <a
                          className=" mr-2"
                          href={`/download_file/sales_orders.xls`}
                          target="_blank"
                        >
                          <img src="https://mybc1.s3.amazonaws.com/uploads/rseguimiento/evidencia/244/file_formats_4_csv-512.png" alt="" style={{height: "35px"}}/>
                        </a>

                        {this.props.estados.create == true && (     
                          <button type="button" onClick={() => this.toggle("new")} className="btn btn-secondary">Orden de compra</button>
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

                onChangehandleFileOrderFile={this.handleFileOrderFile}

                /* AUTOCOMPLETE CENTRO DE COSTO */
                centro={this.state.dataCostCenter}
                onChangeAutocompleteCentro={this.handleChangeAutocompleteCentro}
                formAutocompleteCentro={this.state.selectedOptionCentro}
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

                loadInfo={this.loadTableIncome}

                accion={this.state.action}
                MessageSucces={this.MessageSucces}
                loadOrders={this.props.loadInfo}
            /> 

          
            <div className="content-table">
            
              <table
                className="table table-hover table-bordered"
                id="sampleTable" style={{tableLayout: "fixed"}}
              >
                <thead>
                  <tr className="tr-title">
                  <th style={{width: "90px"}} className="text-center">Acciones</th>
                    <th style={{width: "150px"}}>Centro de costo</th>
                    <th style={{width: "150px"}}>Fecha de Orden</th>
                    <th style={{width: "150px"}}>Numero</th>
                    <th style={{width: "150px"}}>Valor</th>
                    <th style={{width: "400px"}}>Facturas</th>
                    <th style={{width: "300px"}}>Descripción</th>
                    <th style={{width: "250px"}}>Estado</th>
                    <th style={{width: "120px"}}>Archivo</th>
                    
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

                                {true && (
                                  <button onClick={() => this.showIncomeDetail("open",accion)} className="dropdown-item">
                                    Facturas
                                  </button>     
                                )}
                                
                                {true && (
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
                        <td>{accion.cost_center.code}</td>
                        <td><p>{accion.created_date}</p></td>
                        <td><p>{accion.order_number}</p></td>
                        <td><NumberFormat value={accion.order_value} displayType={"text"} thousandSeparator={true} prefix={"$"}/></td>
                        <td>  
                          <table style={{tableLayout: "fixed", width:"100%"}}>
                          <tr>
                                <td style={{padding:"0px", textAlign:"center"}}>Numero</td>
                                <td style={{padding:"0px", textAlign:"center"}}>Fecha</td>
                                <td style={{padding:"0px", textAlign:"center"}}>Valor</td>
                              </tr>
                          {accion.customer_invoices.map(customer => (
                              <tr>
                                <td style={{padding:"5px", textAlign:"center"}}>{customer.number_invoice}</td>
                                <td style={{padding:"5px", textAlign:"center"}}>{this.date_short(customer.invoice_date)}</td>
                                <td style={{padding:"5px", textAlign:"center"}} ><NumberFormat value={customer.invoice_value} displayType={"text"} thousandSeparator={true} prefix={"$"}/></td>
                              </tr>
                          ))}
                          </table>
                        </td>
                        <th>{accion.description}</th>
                        <th>{accion.cost_center.invoiced_state}</th>

                        <td>
                                <React.Fragment>
                                  {accion.order_file.url != null ? (
                                          <a data-toggle="tooltip" data-placement="bottom" title="" target="_blank" className="btn" href={accion.order_file.url} data-original-title="Descargar Archivo" >
                                            <i className="fas fa-download"></i>
                                          </a>
                                        ) : (
                                          <i className="fas fa-times color-false"></i>
                                  )}
                                </React.Fragment>
                        </td>
  
                  
                      
                      </tr>
                    ))
                  ) : (
                    <td colSpan="8" className="text-center">
                        <div className="text-center mt-1 mb-1">
                        <h4>Ordenes de Compra</h4>
                          {this.props.estados.create == true && (
                            <button type="button" onClick={() => this.toggle("new")} className="btn btn-secondary">Orden de compra</button>
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
