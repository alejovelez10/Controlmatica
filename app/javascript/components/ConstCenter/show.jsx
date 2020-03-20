import React from 'react';
import {Card, CardImg, CardText, CardBody,CardTitle, CardSubtitle, Button} from 'reactstrap';
import NumberFormat from 'react-number-format';
import FormCreate from "./FormCreate";
import SweetAlert from 'sweetalert2-react';
import Swal from 'sweetalert2/dist/sweetalert2.js';
import TabContentShow from '../ShowConstCenter/TabContentShow'

class Show extends React.Component {
    constructor(props){
        super(props)
    
        this.state = {
            show_btn_materiales: false,
            show_btn_ordenes_compra: false,
            state_ejecution: false,
            invoiced_state: false,
            show_btn_update: false,

            formUpdate: {
                execution_state: this.props.data_info.execution_state,
                invoiced_state: this.props.data_info.invoiced_state,
                id: this.props.data_info.id,
            },

            dataMateriales: [],
            dataContractors: [],
            dataSalesOrdes: [],
            dataReports: [],

            title: "Nuevo centro de costo",
            ErrorValues: true,
            modal: false,
            backdrop: "static",

            form: {
                customer_id: this.props.data_info.customer_id,
                contact_id: this.props.data_info.contact_id,
                service_type: this.props.data_info.service_type,
                user_id: this.props.data_info.user_id,
                description: this.props.data_info.description,
                start_date: this.props.data_info.start_date,
                end_date: this.props.data_info.end_date,
                quotation_number: this.props.data_info.quotation_number,
                execution_state: this.props.data_info.execution_state,
      
                eng_hours: this.props.data_info.eng_hours,
                hour_real: this.props.data_info.hour_real,
                hour_cotizada: this.props.data_info.hour_cotizada,
      
      
                hours_contractor: this.props.data_info.hours_contractor,
                hours_contractor_real: this.props.data_info.hours_contractor_real,
                hours_contractor_invoices: this.props.data_info.hours_contractor_invoices,
      
                materials_value: this.props.data_info.materials_value,
                viatic_value: this.props.data_info.viatic_value,
                quotation_value: this.props.data_info.quotation_value,
      
                displacement_hours: this.props.data_info.displacement_hours,
                value_displacement_hours: this.props.data_info.value_displacement_hours,
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

    handleChangeForm = e => {
          this.setState({
            form: {
              ...this.state.form,
              [e.target.name]: e.target.value
            }
          });
    };

    HandleClick = e => {
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
                this.props.loadData()
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

      };

    componentDidMount(){
        fetch("/get_roles")
        .then(response => response.json())
        .then(data => {
          this.setState({
            show_btn_materiales: data.materials,
            show_btn_ordenes_compra: data.sales_orders,
          });
        });

        let array = []

        this.props.clientes.map((item) => (
          array.push({label: item.name, value: item.id})
        ))
    
        this.setState({
            clients: array
        })

        setTimeout(() => {
            this.getValues()
        },1000)
    }

    getValues(){
        fetch(`/getValues/${this.props.data_info.id}`)
        .then(response => response.json())
        .then(data => {
          this.setState({
            dataMateriales: data.dataMateriales,
            dataContractors: data.dataContractors,
            dataSalesOrdes: data.dataSalesOrdes,
            dataReports: data.dataReports,
          });
        });
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

    toggle = (from) => {
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

    
        }
    
        this.setState(prevState => ({
          modal: !prevState.modal
        }));
    }

    edit = modulo => {
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
              user_id: modulo.user_id,
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
    
    handleSubmit = e => {
       e.preventDefault();
    };

    handleChange = e => {
        this.setState({
          formUpdate: {
            ...this.state.formUpdate,
            [e.target.name]: e.target.value
          },
        });
    };


    getCards(){
        if (this.props.data_info.service_type == "SERVICIO") {
            return this.getServices()
        }else if(this.props.data_info.service_type == "VENTA"){
            return this.getSale()
        }else if(this.props.data_info.service_type == "PROYECTO"){
            return this.getDraft()
        }
    }

    changeState = (from) =>{
        if (from == "invoiced_state") {
            this.setState({
                invoiced_state: true,
            });   
        }else{
            this.setState({
                state_ejecution: true
            });   
        }

        this.setState({
            show_btn_update: true
        });  
    }

    SubmitBnt = (from) =>{
        if (from == "save") {

            fetch("/cost_centers/" + this.props.data_info.id, {
                method: "PATCH", // or 'PUT'
                body: JSON.stringify(this.state.formUpdate), // data can be `string` or {object}!
                headers: {
                  "Content-Type": "application/json"
                }
              })
                .then(res => res.json())
                .catch(error => console.error("Error:", error))
                .then(data => {
                this.props.loadData()
                  this.setState({
                    state_ejecution: false,
                    invoiced_state: false,
                    show_btn_update: false,
                    formUpdate: {
                        execution_state: data.register.execution_state,
                        invoiced_state: data.register.invoiced_state,
                        id: data.register.id,
                    }
                  });   
      
                });


        }else{
            this.setState({
                state_ejecution: false,
                invoiced_state: false,
                show_btn_update: false
            });   
        }
    }

    getServices = () => {
        return(
            <React.Fragment>
                <div className="col-md-6 mb-4">
                    <div className="col-md-12 title1 text-center">
                        <strong>Ingenieria(Ejecución)</strong><br/> 
                    </div>
                                                
                    <div className="col-md-12 background-show"> 
                        <div className="row">
                            <div className="col-md-4 text-center">
                                <strong>Cotizado</strong><br/> 
                                    <span>{this.props.data_info.eng_hours}{/*<%= cost_center.eng_hours %>*/} </span>
                            </div>

                            <div className="col-md-4 text-center">
                                <strong>Ejecutado</strong><br/> 
                                <span>{this.props.horas_eje/*<%= horas_eje %> */} </span>
                            </div>

                            <div className="col-md-4 text-center">
                                <strong>Avance</strong><br/> 
                                <span>{this.props.porc_eje/*<%= porc_eje %> */}%</span>
                            </div>
                        </div>
                            
                            
                    </div>
                </div>
                         
                <div className="col-md-6">
                    <div className="col-md-12 title1 text-center">
                        <strong>Ingenieria(Costos)</strong><br/>
                    </div>

                    <div className="col-md-12 background-show">
                        <div className="row">

                            <div className="col-md-4 text-center">
                                <strong>Ing Cotizada</strong><br/>
                                <span><NumberFormat value={this.props.costo_en_dinero} displayType={"text"} thousandSeparator={true} prefix={"$"}/>{/*<%= number_to_currency(costo_en_dinero , precision: 0) %>*/}</span>
                            </div>

                            <div className="col-md-4 text-center">
                                <strong>Ing costo</strong><br/> 
                                <span><NumberFormat value={this.props.costo_real_en_dinero} displayType={"text"} thousandSeparator={true} prefix={"$"}/>{/*<%= number_to_currency(costo_real_en_dinero , precision: 0)%>*/}</span>
                            </div>

                            <div className="col-md-4 text-center">   
                                <strong>Margen</strong><br/> 
                                <span>{this.props.porc_eje_costo/*<%= porc_eje_costo  %>*/}%</span>
                            </div>
                        </div>
                    </div>
                </div> 

                <div className="col-md-6 mt-4">
                    <div className="col-md-12 title1 text-center">
                        <strong>Desplazamiento</strong><br/>
                    </div>

                    <div className="col-md-12 background-show">
                        <div className="row">

                            <div className="col-md-4 text-center">
                                <strong>Cotizado</strong><br/> 
                                <span>{this.props.data_info.displacement_hours}</span>
                            </div>

                            <div className="col-md-4 text-center">   
                                <strong>Ejecutado</strong><br/> 
                                <span>{this.props.ejecutado_desplazamiento_horas}</span>
                            </div>

                            <div className="col-md-4 text-center">   
                                <strong>Ejecucion</strong><br/> 
                                <span>{this.props.porc_desplazamiento}%</span>
                            </div>

                        </div>
                    </div>
                </div> 

                <div className="col-md-6 mt-4">
                    <div className="col-md-12 title1 text-center">
                        <strong>Viaticos</strong><br/>
                    </div>
                                
                    <div className="col-md-12 background-show">
                        <div className="row">

                            <div className="col-md-4 text-center" >
                                <strong>Cotizado</strong><br/>
                                <span><NumberFormat value={this.props.via_cotizado} displayType={"text"} thousandSeparator={true} prefix={"$"}/></span>
                            </div>

                            <div className="col-md-4 text-center">   
                                <strong>Gastado</strong><br/>
                                <span><NumberFormat value={this.props.via_real} displayType={"text"} thousandSeparator={true} prefix={"$"}/></span>
                            </div>
                                
                            <div className="col-md-4 text-center"> 
                                <strong>Avance</strong><br/>
                                <span>{this.props.porc_via/*<%= porc_via %>*/}%</span>
                            </div>

                        </div>
                    </div>
                </div>

                <div className="col-md-6 mt-4">
                    <div className="col-md-12 title1 text-center">
                        <strong>Facturacion</strong><br/>
                    </div>

                    <div className="col-md-12 background-show">
                        <div className="row">

                            <div className="col-md-4 text-center">
                                <strong>Cotizado</strong><br/> 
                                <span><NumberFormat value={this.props.data_info.quotation_value} displayType={"text"} thousandSeparator={true} prefix={"$"}/>{/*<%= number_to_currency(@cost_center.quotation_value, precision: 0) %>*/}</span>
                            </div>

                            <div className="col-md-4 text-center">   
                                <strong>Facturado</strong><br/> 
                                <span><NumberFormat value={this.props.facturacion} displayType={"text"} thousandSeparator={true} prefix={"$"}/>{/*<%= number_to_currency(facturacion , precision: 0) %>*/}</span>
                            </div>

                            <div className="col-md-4 text-center">   
                                <strong>Avance</strong><br/> 
                                <span>{this.props.porc_fac/*<%= porc_fac %>*/}%</span>
                            </div>

                        </div>
                    </div>
                </div>
            </React.Fragment>
        )
    }

    getSale = () => {
        return(
            <React.Fragment>
                                <div className="col-md-6 mt-4">
                    <div className="col-md-12 title1 text-center">
                        <strong>Materiales</strong><br/>
                    </div>

                    <div className="col-md-12 background-show">
                        <div className="row">

                            <div className="col-md-4 text-center">
                                <strong>Cotizados</strong><br/> 
                                <span><NumberFormat value={this.props.data_info.materials_value} displayType={"text"} thousandSeparator={true} prefix={"$"}/>{/*<%= number_to_currency(@cost_center.quotation_value, precision: 0) %>*/}</span>
                            </div>

                            <div className="col-md-4 text-center">   
                                <strong>Comprados</strong><br/> 
                                <span><NumberFormat value={this.props.sum_materials} displayType={"text"} thousandSeparator={true} prefix={"$"}/>{/*<%= number_to_currency(facturacion , precision: 0) %>*/}</span>
                            </div>

                            <div className="col-md-4 text-center">   
                                <strong>Margen</strong><br/> 
                                <span>{this.props.porc_mat}%</span>
                            </div>

                        </div>
                    </div>
                </div>

                <div className="col-md-6 mt-4">
                    <div className="col-md-12 title1 text-center">
                        <strong>Facturacion</strong><br/>
                    </div>

                    <div className="col-md-12 background-show">
                        <div className="row">

                            <div className="col-md-4 text-center">
                                <strong>Cotizado</strong><br/> 
                                <span><NumberFormat value={this.props.data_info.quotation_value} displayType={"text"} thousandSeparator={true} prefix={"$"}/>{/*<%= number_to_currency(@cost_center.quotation_value, precision: 0) %>*/}</span>
                            </div>

                            <div className="col-md-4 text-center">   
                                <strong>Facturado</strong><br/> 
                                <span><NumberFormat value={this.props.facturacion} displayType={"text"} thousandSeparator={true} prefix={"$"}/>{/*<%= number_to_currency(facturacion , precision: 0) %>*/}</span>
                            </div>

                            <div className="col-md-4 text-center">   
                                <strong>Avance</strong><br/> 
                                <span>{this.props.porc_fac/*<%= porc_fac %>*/}%</span>
                            </div>

                        </div>
                    </div>
                </div>


            </React.Fragment>
        )
    }

    getDraft = () => {
        return(
            <React.Fragment>

                <div className="col-md-6 mb-4">
                    <div className="col-md-12 title1 text-center">
                        <strong>Ingenieria(Ejecución)</strong><br/> 
                    </div>
                                                
                    <div className="col-md-12 background-show"> 
                        <div className="row">
                            <div className="col-md-4 text-center">
                                <strong>Cotizado</strong><br/> 
                                    <span>{this.props.data_info.eng_hours}{/*<%= cost_center.eng_hours %>*/} </span>
                            </div>

                            <div className="col-md-4 text-center">
                                <strong>Ejecutado</strong><br/> 
                                <span>{this.props.horas_eje/*<%= horas_eje %> */} </span>
                            </div>

                            <div className="col-md-4 text-center">
                                <strong>Avance</strong><br/> 
                                <span>{this.props.porc_eje/*<%= porc_eje %> */}%</span>
                            </div>
                        </div>
                            
                            
                    </div>
                </div>
                         
                <div className="col-md-6">
                    <div className="col-md-12 title1 text-center">
                        <strong>Ingenieria(Costos)</strong><br/>
                    </div>

                    <div className="col-md-12 background-show">
                        <div className="row">

                            <div className="col-md-4 text-center">
                                <strong>Ing Cotizada</strong><br/>
                                <span><NumberFormat value={this.props.costo_en_dinero} displayType={"text"} thousandSeparator={true} prefix={"$"}/>{/*<%= number_to_currency(costo_en_dinero , precision: 0) %>*/}</span>
                            </div>

                            <div className="col-md-4 text-center">
                                <strong>Ing costo</strong><br/> 
                                <span><NumberFormat value={this.props.costo_real_en_dinero} displayType={"text"} thousandSeparator={true} prefix={"$"}/>{/*<%= number_to_currency(costo_real_en_dinero , precision: 0)%>*/}</span>
                            </div>

                            <div className="col-md-4 text-center">   
                                <strong>Margen</strong><br/> 
                                <span>{this.props.porc_eje_costo/*<%= porc_eje_costo  %>*/}%</span>
                            </div>
                        </div>
                    </div>
                </div> 

                <div className="col-md-6">
                    <div className="col-md-12 title1 text-center">
                        <strong>Tableristas(Ejecución)</strong><br/>
                    </div>
                                
                    <div className="col-md-12 background-show">
                        <div className="row">

                            <div className="col-md-4 text-center">
                                <strong>Cotizado</strong><br/> 
                                <span>{this.props.hours_contractor}</span>
                            </div>

                            <div className="col-md-4 text-center">   
                                <strong>Ejecutado</strong><br/> 
                                <span>{this.props.hours_eje_contractor}</span>
                            </div>

                            <div className="col-md-4 text-center">   
                                <strong>Avance</strong><br/> 
                                <span>{this.props.porc_eje_contractor}</span>
                            </div>

                        </div>
                    </div>
                </div> 

                <div className="col-md-6">
                    <div className="col-md-12 title1 text-center">
                        <strong>Tableristas(Costos)</strong><br/>
                    </div>

                    <div className="col-md-12 background-show">
                        <div className="row">

                            <div className="col-md-4 text-center">
                                <strong>Tab Cotizada</strong><br/>
                                <span><NumberFormat value={this.props.costo_en_dinero_contractor} displayType={"text"} thousandSeparator={true} prefix={"$"}/>{/*<%= number_to_currency(costo_en_dinero , precision: 0) %>*/}</span>
                            </div>

                            <div className="col-md-4 text-center">
                                <strong>Tab costo</strong><br/> 
                                <span><NumberFormat value={this.props.costo_real_en_dinero_contractor} displayType={"text"} thousandSeparator={true} prefix={"$"}/>{/*<%= number_to_currency(costo_real_en_dinero , precision: 0)%>*/}</span>
                            </div>

                            <div className="col-md-4 text-center">   
                                <strong>Margen</strong><br/> 
                                <span>{this.props.porc_eje_costo_contractor}%</span>
                            </div>

                        </div>
                    </div>
                </div> 
                <div className="col-md-6 mt-4">
                    <div className="col-md-12 title1 text-center">
                        <strong>Desplazamiento</strong><br/>
                    </div>

                    <div className="col-md-12 background-show">
                        <div className="row">

                            <div className="col-md-4 text-center">
                                <strong>Cotizado</strong><br/> 
                                <span>{this.props.data_info.displacement_hours}</span>
                            </div>

                            <div className="col-md-4 text-center">   
                                <strong>Ejecutado</strong><br/> 
                                <span>{this.props.ejecutado_desplazamiento_horas}</span>
                            </div>

                            <div className="col-md-4 text-center">   
                                <strong>Ejecucion</strong><br/> 
                                <span>{this.props.porc_desplazamiento}%</span>
                            </div>

                        </div>
                    </div>
                </div> 
                        
                <div className="col-md-6 mt-4">
                    <div className="col-md-12 title1 text-center">
                        <strong>Materiales</strong><br/>
                    </div>

                    <div className="col-md-12 background-show">
                        <div className="row">

                            <div className="col-md-4 text-center">
                                <strong>Cotizados</strong><br/> 
                                <span><NumberFormat value={this.props.data_info.materials_value} displayType={"text"} thousandSeparator={true} prefix={"$"}/>{/*<%= number_to_currency(@cost_center.quotation_value, precision: 0) %>*/}</span>
                            </div>

                            <div className="col-md-4 text-center">   
                                <strong>Comprados</strong><br/> 
                                <span><NumberFormat value={this.props.sum_materials} displayType={"text"} thousandSeparator={true} prefix={"$"}/>{/*<%= number_to_currency(facturacion , precision: 0) %>*/}</span>
                            </div>

                            <div className="col-md-4 text-center">   
                                <strong>Margen</strong><br/> 
                                <span>{this.props.porc_mat}%</span>
                            </div>

                        </div>
                    </div>
                </div> 

                <div className="col-md-6 mt-4">
                    <div className="col-md-12 title1 text-center">
                        <strong>Viaticos</strong><br/>
                    </div>
                                
                    <div className="col-md-12 background-show">
                        <div className="row">

                            <div className="col-md-4 text-center" >
                                <strong>Cotizado</strong><br/>
                                <span><NumberFormat value={this.props.via_cotizado} displayType={"text"} thousandSeparator={true} prefix={"$"}/></span>
                            </div>

                            <div className="col-md-4 text-center">   
                                <strong>Gastado</strong><br/>
                                <span><NumberFormat value={this.props.via_real} displayType={"text"} thousandSeparator={true} prefix={"$"}/></span>
                            </div>
                                
                            <div className="col-md-4 text-center"> 
                                <strong>Avance</strong><br/>
                                <span>{this.props.porc_via/*<%= porc_via %>*/}%</span>
                            </div>

                        </div>
                    </div>
                </div>

                <div className="col-md-6 mt-4">
                    <div className="col-md-12 title1 text-center">
                        <strong>Facturacion</strong><br/>
                    </div>

                    <div className="col-md-12 background-show">
                        <div className="row">

                            <div className="col-md-4 text-center">
                                <strong>Cotizado</strong><br/> 
                                <span><NumberFormat value={this.props.data_info.quotation_value} displayType={"text"} thousandSeparator={true} prefix={"$"}/>{/*<%= number_to_currency(@cost_center.quotation_value, precision: 0) %>*/}</span>
                            </div>

                            <div className="col-md-4 text-center">   
                                <strong>Facturado</strong><br/> 
                                <span><NumberFormat value={this.props.facturacion} displayType={"text"} thousandSeparator={true} prefix={"$"}/>{/*<%= number_to_currency(facturacion , precision: 0) %>*/}</span>
                            </div>

                            <div className="col-md-4 text-center">   
                                <strong>Avance</strong><br/> 
                                <span>{this.props.porc_fac/*<%= porc_fac %>*/}%</span>
                            </div>

                        </div>
                    </div>
                </div>
                
            </React.Fragment>
        )
    }

    render() {
        return (
            <React.Fragment>
                <Card className="card-show">
                    <CardBody className="mt-2">

                        <div className="col-md-12">
                            <div className="row">
                                <div className="col-md-12 text-center">
                                    <h5>
                                        {this.props.data_info.customer != undefined ? this.props.data_info.customer.name : "CARGANDO.."} / {this.props.data_info.service_type != undefined ? this.props.data_info.service_type : "CARGANDO.."} ({this.props.data_info.code != undefined ? this.props.data_info.code : "CARGANDO.."}) 

                                        {this.state.show_btn_update == true && (
                                            <React.Fragment>
                                                <button className="btn btn-danger float-right" onClick={() => this.SubmitBnt()}><i className="fas fa-window-close"></i></button>
                                                <button className="btn btn-secondary float-right mr-2" onClick={() => this.SubmitBnt("save")}>Actualizar</button>
                                            </React.Fragment>
                                        )}

                                    </h5>
                              </div>
                            </div>

                            <hr/>
                            <div className="row">
                          
                      
                                <div className="col-md-3 text-center mb-3">
                                    <strong> Estado Ejecucion</strong> <br/>
                                        {this.state.state_ejecution == true ? (
                                            <select 
                                                name="execution_state" 
                                                className={`form form-control`}
                                                value={this.state.formUpdate.execution_state}
                                                onChange={this.handleChange}
                                            >
                                                <option value="">Seleccione un tipo</option>
                                                <option value="EJECUCION">EJECUCION</option>
                                                <option value="FINALIZADO">FINALIZADO</option>
                                                <option value="PENDIENTE">PENDIENTE</option>
                                            </select> 
                                        ) : (
                                            <React.Fragment>
                                                {this.props.estados.update_state == true ? (
                                                    <p onClick={() => this.changeState()} >{this.props.data_info.execution_state != undefined ? this.props.data_info.execution_state : "CARGANDO.."} </p>
                                                ) : (
                                                    <p>{this.props.data_info.execution_state != undefined ? this.props.data_info.execution_state : "CARGANDO.."}</p>
                                                )}
                                            </React.Fragment>
                                        )}
                                </div>

                                <div className="col-md-3 text-center">
                                    <strong>Estado Facturacion</strong><br/>
                                    {this.state.invoiced_state == true ? (
                                            <select 
                                                name="invoiced_state" 
                                                className={`form form-control`}
                                                value={this.state.formUpdate.invoiced_state}
                                                onChange={this.handleChange}
                                            >
                                                <option value="">Seleccione un tipo</option>
                                                <option value="PENDIENTE DE COTIZACION">PENDIENTE DE COTIZACION</option>
                                                <option value="PENDIENTE DE ORDEN DE COMPRA">PENDIENTE DE ORDEN DE COMPRA</option>
                                                <option value="LEGALIZADO">LEGALIZADO</option>
                                                <option value="LEGALIZADO PARCIAL">LEGALIZADO PARCIAL</option>
                                                <option value="FACTURADO">FACTURADO</option>
                                                <option value="FACTURADO PARCIAL">FACTURADO PARCIAL</option>
                                                <option value="POR FACTURAR">POR FACTURAR</option>
                                          
                                            </select> 
                                    ) : (
                                            <React.Fragment>
                                                {this.props.estados.update_state == true ? (
                                                    <p onClick={() => this.changeState("invoiced_state")} >{this.props.data_info.invoiced_state != undefined ? this.props.data_info.invoiced_state : "CARGANDO.."}</p>
                                                ) : (
                                                    <p>{this.props.data_info.invoiced_state != undefined ? this.props.data_info.invoiced_state : "CARGANDO.."}</p>
                                                )}
                                            </React.Fragment>
                                    )}
                                </div>

                                <div className="col-md-3 text-center">
                                    <strong>Contacto</strong><br/>
                                    <p>{this.props.data_info.contact != undefined ? this.props.data_info.contact.name : "CARGANDO.."}</p>
                                </div>

                                <div className="col-md-3 text-center">
                                    <strong>Fecha de Inicio</strong><br/>
                                    <p>{this.props.data_info.start_date != undefined ? this.props.data_info.start_date : "CARGANDO.."}</p>
                                </div>

                                <div className="col-md-3 text-center">
                                    <strong>Fecha Final</strong><br/>
                                    <p>{this.props.data_info.end_date != undefined ? this.props.data_info.end_date : "CARGANDO.."}</p>
                                </div>

                                <div className="col-md-3 text-center">
                                    <strong>Numero de Cotizacion</strong><br/>
                                    <p>{this.props.data_info.quotation_number != undefined ? this.props.data_info.quotation_number : "CARGANDO.."}</p>
                                </div>

                                <div className="col-md-3 text-center">
                                    <strong>Descripción</strong><br/>
                                    <p>{this.props.data_info.description != undefined ? this.props.data_info.description : "CARGANDO.."}</p>
                                </div>

                            </div>
                        </div>

                        {/*<div className="col-md-12">
                            <a href="/cost_centers" className="btn btn-info">Volver</a>
                            <a href={`/cost_centers/${this.props.data_info.id}/edit`} className="btn btn-info">Editar</a>
                        </div>*/}

                        <div className="row valores">
                            {this.props.data_info.service_type != "" && (
                                <React.Fragment>
                                    {this.getCards()}
                                </React.Fragment>
                            )}

                            <FormCreate
                                toggle={this.toggle}
                                backdrop={this.state.backdrop}
                                modal={this.state.modal}
                                onChangeForm={this.handleChangeForm}
                                formValues={this.state.form}
                                submit={this.HandleClick}
                                FormSubmit={this.handleSubmit}

                                titulo={this.state.title}
                                nameSubmit={true ? "Actualizar" : "Crear"}
                                errorValues={this.state.ErrorValues}
                                modeEdit={true}
                                

                                /* AUTOCOMPLETE CLIENTE */

                                clientes={this.state.clients}
                                onChangeAutocomplete={this.handleChangeAutocomplete}
                                formAutocomplete={this.state.selectedOption}

                                /* AUTOCOMPLETE CONTACTO */

                                contacto={this.state.dataContact}
                                onChangeAutocompleteContact={this.handleChangeAutocompleteContact}
                                formAutocompleteContact={this.state.selectedOptionContact}

                                estados={this.props.estados}
                                
                            />

                            <div className="col-md-12 text-center mt-5">
                                <button onClick={() => this.edit(this.props.data_info)} className="btn btn-secondary">
                                    Editar información
                                </button>
                            </div>
                        </div> 

                    </CardBody>
                </Card>

                <Card className="mt-3">
                    <CardBody>
                        <TabContentShow dataMateriales={this.state.dataMateriales} dataContractors={this.state.dataContractors} dataSalesOrdes={this.state.dataSalesOrdes} dataReports={this.state.dataReports} />
                    </CardBody>
                </Card>


            </React.Fragment>
        );
    }
}

export default Show;