import React, { Component } from 'react';
import NumberFormat from "react-number-format";

class MaterialesTable extends Component {
    render() {
        return (
            <React.Fragment>
                <div className="content-table">
                    <table className="table table-hover table-bordered table-width" id="sampleTable">
                    <thead>
                        <tr className="tr-title">
                            <th style={{width:"8%"}}>Proveedor</th>
                            <th style={{width:"6%"}}># Orden</th>
                            <th style={{width:"5%"}}>Valor</th>
                            <th style={{width:"19%"}}>Descripción</th>
                            <th style={{width:"5%"}}>Fecha de Orden</th>
                            <th style={{width:"5%"}}>Fecha Entrega</th>
                            <th style={{width:"5%"}}>Valor Facturas</th>
                            <th style={{width:"11%"}}>Estado</th>
                        </tr>
                    </thead>
        
                    <tbody>
                        {this.props.dataMateriales.length >= 1 ? (
                        this.props.dataMateriales.map(accion => (
                            <tr key={accion.id}>
                                <td>{accion.provider.name}</td>
                                <td>{accion.sales_number}</td>
                                <td><NumberFormat value={accion.amount} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                                <td>{accion.description}</td>
                                <td>{accion.sales_date}</td>
                                <td>{accion.delivery_date}</td>
                                
                                <td><NumberFormat value={accion.provider_invoice_value} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                                <td>
                                    <p>{accion.sales_state}</p>
                                </td>
                            </tr>
                        ))
                        ) : (
                        <td colSpan="10" className="text-center">
                            <div className="text-center mt-1 mb-1">
                                <h4>No hay materiales</h4>
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

export default MaterialesTable;