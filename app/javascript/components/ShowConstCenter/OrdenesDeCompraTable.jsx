import React, { Component } from 'react';
import NumberFormat from "react-number-format";

class OrdenesDeCompraTable extends Component {

    date_short = (fecha) => {
        var d = new Date(fecha)
        return (d.getDate() + 1 > 9 ? "" : "0") + (d.getDate() +  1)  + "/" + (d.getMonth() +1  > 9 ? "" : "0") + (d.getMonth()  +  1) + " " + '/' + d.getFullYear()
    }

    
    render() {
        return (
            <React.Fragment>
                <div className="content-table">
                    <table
                    className="table table-hover table-bordered"
                    id="sampleTable" style={{tableLayout: "fixed"}}
                    >
                    <thead>
                        <tr className="tr-title">
                        <th style={{width: "150px"}}>Cliente</th>
                        <th style={{width: "150px"}}>Fecha de Orden</th>
                        <th style={{width: "150px"}}>Numero</th>
                        <th style={{width: "150px"}}>Valor</th>
                        <th style={{width: "450px"}}>Facturas</th>
                        <th style={{width: "200px"}}>Total Facturas</th>
                        <th style={{width: "300px"}}>Descripción</th>
                        <th style={{width: "250px"}}>Estado Centro de Costo</th>
                        <th style={{width: "120px"}}>Archivo</th>
                        
                        </tr>
                    </thead>

                    <tbody>
                        {this.props.dataSalesOrdes.length >= 1 ? (
                        this.props.dataSalesOrdes.map(accion => (
                            <tr key={accion.id}>
                            <td>{accion.cost_center.customer.name}</td>
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
                            <td><NumberFormat value={accion.sum_invoices} displayType={"text"} thousandSeparator={true} prefix={"$"}/></td>
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

export default OrdenesDeCompraTable;