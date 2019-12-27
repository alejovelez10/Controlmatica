import React from 'react';
import {Card, CardImg, CardText, CardBody,CardTitle, CardSubtitle, Button} from 'reactstrap';
import NumberFormat from 'react-number-format';

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
            }
        }
    }

    componentDidMount(){
        fetch("/get_roles")
        .then(response => response.json())
        .then(data => {
            console.log(data)
          this.setState({
            show_btn_materiales: data.materials,
            show_btn_ordenes_compra: data.sales_orders,
          });
        });
    }

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
                console.log(data)
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
                                                <p onClick={() => this.changeState()} >{this.props.data_info.execution_state != undefined ? this.props.data_info.execution_state : "CARGANDO.."} </p>
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
                                                <option value="FACTURADO">FACTURADO</option>
                                                <option value="LEGALIZADO">LEGALIZADO</option>
                                            </select> 
                                    ) : (
                                            <React.Fragment>
                                                <p onClick={() => this.changeState("invoiced_state")} >{this.props.data_info.invoiced_state != undefined ? this.props.data_info.invoiced_state : "CARGANDO.."}</p>
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

                            <div className="col-md-12 text-center mt-5">
                                {this.state.show_btn_ordenes_compra == true && (
                                    <a 
                                        href={`/cost_centers/${this.props.data_info.id}`} 
                                        className={this.props.sales_orders_state == true ? "btn btn-secondary" : "btn btn-outline-secondary"}>Ordenes de Compras
                                    </a>
                                )}
                            </div>
                        </div> 

                    </CardBody>
                </Card>
            </React.Fragment>
        );
    }
}

export default Show;