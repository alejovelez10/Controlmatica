import React, { Component } from 'react';
import NumberFormat from "react-number-format";

class ExpensesTable extends Component {
    render() {
        return (
            <React.Fragment>
                <div className="content">
                    <table
                        className="table table-hover table-bordered"
                        id="sampleTable"
                    >
                        <thead>
                            <tr className="tr-title">

                               
                                <th style={{ width: "250px" }}>Responsable</th>
                                <th style={{ width: "250px" }}>Nombre</th>
                                <th>Fecha de factura</th>
                                <th>NIT / CEDULA</th>
                                <th style={{ width: "300px" }}>Descripcion</th>
                                <th>#Factura</th>
                                <th>Tipo</th>
                                <th>Medio de pago</th>
                                <th>Valor</th>
                                <th>IVA</th>
                                <th>Total</th>
                                <th style={{ width: "5%" }}>Estado</th>
{/*                                 <th style={{ width: "200px" }}>Creación</th>
                                <th style={{ width: "200px" }}>Ultima actualización</th> */}
                            </tr>
                        </thead>

                        <tbody>
                            {this.props.dataContractors.length >= 1 ? (
                                this.props.dataContractors.map(accion => (
                                    <tr key={accion.id}>
                                    
                                        <td>{accion.user_invoice.name}</td>
                                        <td>{accion.invoice_name}</td>
                                        <td>{accion.invoice_date}</td>
                                        <td>{accion.identification}</td>
                                        <td>{accion.description}</td>
                                        <td>{accion.invoice_number}</td>
                                        <td>{accion.type_identification != undefined ? accion.type_identification.name : ""}</td>
                                        <td>{accion.payment_type != undefined ? accion.payment_type.name : ""}</td>

                                        <td><NumberFormat value={accion.invoice_value} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                                        <td><NumberFormat value={accion.invoice_tax} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                                        <td><NumberFormat value={accion.invoice_total} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                                        <td>{accion.is_acepted ? "Aceptado" : "Creado"} </td>
                                        

                                    </tr>
                                ))
                            ) : (
                                <td colSpan="8" className="text-center">
                                    <div className="text-center mt-1 mb-1">
                                        <h4>No hay gastos</h4>
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

export default ExpensesTable;