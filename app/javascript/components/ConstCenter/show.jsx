import React from 'react';
import {Card, CardImg, CardText, CardBody,CardTitle, CardSubtitle, Button} from 'reactstrap';

class Show extends React.Component {
    render() {
        return (
            <React.Fragment>
                <Card className="card-show">
                    <CardBody className="mt-2">

                        <div className="col-md-12">
                            <div className="row">

                                <div class="col-md-3 text-center">
                                    <strong> Estado Ejecucion</strong> <br/>
                                    <p>{this.props.data_info.execution_state}</p>{/*<%= @cost_center.execution_state %>*/}
                                </div>

                                <div class="col-md-3 text-center">
                                    <strong>Estado Facturacion</strong><br/>
                                    <p>{this.props.data_info.invoiced_state}</p>{/*<%= @cost_center.invoiced_state %>*/}
                                </div>

                                <div class="col-md-3 text-center">
                                    <strong>Tipo</strong><br/>
                                    <p>{this.props.data_info.service_type}</p>{/*<%= @cost_center.invoiced_state %>*/}
                                </div>

                                <div class="col-md-3 text-center">
                                    <strong>Codigo</strong><br/>
                                    <p>{this.props.data_info.code}</p>{/*<%= @cost_center.invoiced_state %>*/}
                                </div>

                                <div class="col-md-3 text-center">
                                    <strong>Cliente</strong> <br/>
                                    <p>Estiven(poner cliente)</p>{/*<%= @cost_center.execution_state %>*/}
                                </div>

                                <div class="col-md-3 text-center">
                                    <strong>Contacto</strong><br/>
                                    <p>Estiven(poner cliente)</p>{/*<%= @cost_center.invoiced_state %>*/}
                                </div>

                                <div class="col-md-3 text-center">
                                    <strong>Fecha de Inicio</strong><br/>
                                    <p>23/12/1202</p>{/*<%= @cost_center.invoiced_state %>*/}
                                </div>

                                <div class="col-md-3 text-center">
                                    <strong>Fecha Final</strong><br/>
                                    <p>23/12/1202</p>{/*<%= @cost_center.invoiced_state %>*/}
                                </div>

                                <div class="col-md-3 text-center">
                                    <strong>Numero de Cotizacion</strong><br/>
                                    <p>{this.props.data_info.quotation_number}</p>{/*<%= @cost_center.invoiced_state %>*/}
                                </div>

                                <div class="col-md-3 text-center">
                                    <strong>Horas Trabajadas</strong><br/>
                                    <p>{this.props.data_info.quotation_number}</p>{/*<%= @cost_center.invoiced_state %>*/}
                                </div>

                                <div class="col-md-3 text-center">
                                    <strong>Descripción</strong><br/>
                                    <p>{this.props.data_info.description}</p>{/*<%= @cost_center.invoiced_state %>*/}
                                </div>

                            </div>
                        </div>

                        {/*<div className="col-md-12">
                            <a href="/cost_centers" className="btn btn-info">Volver</a>
                            <a href={`/cost_centers/${this.props.data_info.id}/edit`} className="btn btn-info">Editar</a>
                        </div>*/}

                        <div className="row valores">
     
                            <div className="col-md-6 mb-5">
                                <div className="col-md-12 title1 text-center">
                                    <strong>Ingenieria</strong><br/> 
                                </div>
                    
                
                            
                                <div className="col-md-12 background-show">
                         
                                    <div className="row">
                                        <div className="col-md-4 text-center">
                                            <strong>Cotizado</strong><br/> 
                                            <span>{this.props.data_info.eng_hours}{/*<%= cost_center.eng_hours %>*/} (horas)</span>
                                        </div>

                                        <div className="col-md-4 text-center">
                                            <strong>Ejecutado</strong><br/> 
                                            <span>{/*<%= horas_eje %>*/}  (horas)</span>
                                        </div>

                                        <div className="col-md-4 text-center">
                                            <strong>Avance</strong><br/> 
                                            <span>{/*<%= porc_eje %> */}%</span>
                                        </div>
                                    </div>
                            
                            
                                </div>

                            </div>
                         
                        
                            <div className="col-md-6 mb-5">
                                <div className="col-md-12 title1 text-center">
                                    <strong>Viaticos</strong><br/>
                                </div>
                        
                        
                            
                                <div className="col-md-12 background-show">
                                    <div className="row">
                                        <div className="col-md-4 text-center" >
                                            <strong>Cotizado</strong><br/>
                                            <span>0{/*<%= number_to_currency(via_cotizado , precision: 0) %>*/} </span>
                                        </div>

                                        <div className="col-md-4 text-center">   
                                            <strong>Gastado</strong><br/>
                                            <span>0{/*<%= number_to_currency(via_real, precision: 0) %>*/}</span>
                                        </div>
                                
                                        <div className="col-md-4 text-center"> 
                                            <strong></strong><br/>
                                            <span>0{/*<%= porc_via %>*/}%</span>
                                        </div>
                                    </div>
                                </div>

                            </div>

     
                            <div className="col-md-6">
                                <div className="col-md-12 title1 text-center">
                                    <strong>Costos</strong><br/>
                                </div>



                                <div className="col-md-12 background-show">
                                    <div className="row">
                                        <div className="col-md-4 text-center">
                                            <strong>Ing Cotizada</strong><br/>
                                            <span>0{/*<%= number_to_currency(costo_en_dinero , precision: 0) %>*/}</span>
                                        </div>

                                        <div className="col-md-4 text-center">
                                            <strong>Ing Ejecutada</strong><br/> 
                                            <span>0{/*<%= number_to_currency(costo_real_en_dinero , precision: 0)%>*/}</span>
                                        </div>

                                        <div className="col-md-4 text-center">   
                                            <strong>Avance</strong><br/> 
                                            <span>0{/*<%= porc_eje_costo  %>*/}%</span>
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
                                            <span>0{/*<%= number_to_currency(@cost_center.quotation_value, precision: 0) %>*/}</span>
                                        </div>

                                        <div className="col-md-4 text-center">   
                                            <strong>Facturado</strong><br/> 
                                            <span>0{/*<%= number_to_currency(facturacion , precision: 0) %>*/}</span>
                                        </div>

                                        <div className="col-md-4 text-center">   
                                            <strong></strong><br/> 
                                            <span>0{/*<%= porc_fac %>*/}%</span>
                                        </div>
                                    </div>

                                </div>

                            </div> 

                            <div className="col-md-12 text-center mt-5">
                                <a href={`/cost_centers/${this.props.data_info.id}`} className="btn btn-secondary">Ordenes de Compras</a>
                            </div>

                        </div> 
                    </CardBody>
                </Card>
            </React.Fragment>
        );
    }
}

export default Show;