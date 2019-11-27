import React from 'react';
import {Card, CardImg, CardText, CardBody,CardTitle, CardSubtitle, Button} from 'reactstrap';
import NumberFormat from 'react-number-format';

class Show extends React.Component {
    constructor(props){
        super(props)
    
        this.state = {
            show_btn_materiales: false,
            show_btn_ordenes_compra: false,
            show_btn_contratista: false,
        }
    }

    componentDidMount(){
        fetch("/get_roles")
        .then(response => response.json())
        .then(data => {
          this.setState({
            show_btn_materiales: data.materials,
            show_btn_ordenes_compra: data.sales_orders,
            show_btn_contratista: data.contractors,
          });
        });
    }

    render() {
        return (
            <React.Fragment>
                <Card className="card-show">
                    <CardBody className="mt-2">

                        <div className="col-md-12">
                            <div className="row">
                            <div className="col-md-12 text-center">
                                  
                                  <h5>{this.props.data_info.customer != undefined ? this.props.data_info.customer.name : "CARGANDO.."} / {this.props.data_info.service_type != undefined ? this.props.data_info.service_type : "CARGANDO.."} ({this.props.data_info.code != undefined ? this.props.data_info.code : "CARGANDO.."})</h5>
                              </div>
                            </div>
                            <hr/>
                            <div className="row">
                          
                      
                                <div className="col-md-3 text-center">
                                    <strong> Estado Ejecucion</strong> <br/>
                                    <p>{this.props.data_info.execution_state != undefined ? this.props.data_info.execution_state : "CARGANDO.."} </p>
                                </div>

                                <div className="col-md-3 text-center">
                                    <strong>Estado Facturacion</strong><br/>
                                    <p>{this.props.data_info.invoiced_state != undefined ? this.props.data_info.invoiced_state : "CARGANDO.."}</p>
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
     
                            <div className="col-md-6 mb-4">
                                <div className="col-md-12 title1 text-center">
                                    <strong>Ingenieria(Horas)</strong><br/> 
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
                         
                        
                            <div className="col-md-6 mb-4">
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
                                            <strong></strong><br/>
                                            <span>{this.props.porc_via/*<%= porc_via %>*/}%</span>
                                        </div>
                                    </div>
                                </div>

                            </div>

     
                            <div className="col-md-6">
                                <div className="col-md-12 title1 text-center">
                                    <strong>Ingenieria($)</strong><br/>
                                </div>



                                <div className="col-md-12 background-show">
                                    <div className="row">
                                        <div className="col-md-4 text-center">
                                            <strong>Ing Cotizada</strong><br/>
                                            <span><NumberFormat value={this.props.costo_en_dinero} displayType={"text"} thousandSeparator={true} prefix={"$"}/>{/*<%= number_to_currency(costo_en_dinero , precision: 0) %>*/}</span>
                                        </div>

                                        <div className="col-md-4 text-center">
                                            <strong>Ing Ejecutada</strong><br/> 
                                            <span><NumberFormat value={this.props.costo_real_en_dinero} displayType={"text"} thousandSeparator={true} prefix={"$"}/>{/*<%= number_to_currency(costo_real_en_dinero , precision: 0)%>*/}</span>
                                        </div>

                                        <div className="col-md-4 text-center">   
                                            <strong>Avance</strong><br/> 
                                            <span>{this.props.porc_eje_costo/*<%= porc_eje_costo  %>*/}%</span>
                                        </div>
                                    </div>

                                </div>

                            </div> 

                            <div className="col-md-6">
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
                                            <strong></strong><br/> 
                                            <span>{this.props.porc_fac/*<%= porc_fac %>*/}%</span>
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
                                            <strong></strong><br/> 
                                            <span>{this.props.porc_mat}%</span>
                                        </div>
                                    </div>

                                </div>

                            </div> 


                            <div className="col-md-6 mt-4">
                                <div className="col-md-12 title1 text-center">
                                    <strong>Contratistas</strong><br/>
                                </div>



                                <div className="col-md-12 background-show">
                                    <div className="row">
                                        <div className="col-md-4 text-center">
                                            <strong>Cotizado</strong><br/> 
                                            <span><NumberFormat value={this.props.data_info.hours_contractor_invoices} displayType={"text"} thousandSeparator={true} prefix={"$"}/>{/*<%= number_to_currency(@cost_center.quotation_value, precision: 0) %>*/}</span>
                                        </div>
                                        <div className="col-md-4 text-center">   
                                            <strong>Real</strong><br/> 
                                            <span><NumberFormat value={this.props.sum_contractors} displayType={"text"} thousandSeparator={true} prefix={"$"}/>{/*<%= number_to_currency(facturacion , precision: 0) %>*/}</span>
                                        </div>

                                        <div className="col-md-4 text-center">   
                                        <strong></strong><br/> 
                                            <span><NumberFormat value={this.props.sum_contractors} displayType={"text"} thousandSeparator={true} prefix={"$"}/>{/*<%= number_to_currency(facturacion , precision: 0) %>*/}</span>
                                        </div>
                                    </div>

                                </div>

                            </div> 






                            <div className="col-md-12 text-center mt-5">

                                {this.state.show_btn_ordenes_compra == true && (
                                    <a 
                                        href={`/cost_centers/${this.props.data_info.id}`} 
                                        className={this.props.sales_orders_state == true ? "btn btn-secondary" : "btn btn-outline-secondary"}>Ordenes de Compras
                                    </a>
                                )}

                                {this.state.show_btn_materiales == true && (
                                    <a 
                                        href={`/cost_centers/materials/${this.props.data_info.id}`} 
                                        className={this.props.materials_state == true ? "btn btn-secondary mr-3 ml-3" : "btn btn-outline-secondary mr-3 ml-3"}>Materiales
                                    </a>
                                )}


                                {this.state.show_btn_contratista == true && (
                                    <a 
                                        href={`/cost_centers/contractors/${this.props.data_info.id}`} 
                                        className={this.props.contractors_state == true ? "btn btn-secondary" : "btn btn-outline-secondary"}>Contratista
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