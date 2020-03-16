import React, { Component } from 'react';
import NumberFormat from "react-number-format";

class ReportesDeServiciosTable extends Component {
    render() {
        return (
            <React.Fragment>
                <div className="content-table">
                    <table className="table table-hover table-bordered table-width" id="sampleTable">
                    <thead>
                        <tr className="tr-title">
                            <th style={{width: "6%"}}>Codigo</th>
                            <th style={{width: "6%"}}>Cliente</th>
                            <th style={{width: "7%"}}>Fecha de Ejecucion</th>
                            <th style={{width: "8%"}}>Responsable Ejecucion</th>
                            <th style={{width: "6%"}}>Horas Laboradas</th>
                            <th>Descripcion del Trabajo</th>
                            <th style={{width: "7%"}}>Valor de los Viaticos</th>
                            <th style={{width: "8%"}}>Descripcion de Viaticos</th>
                            <th style={{width: "6%"}}>Valor del Reporte</th>
                            <th style={{width: "5%"}}>Estado</th>
                        </tr>
                    </thead>

                        <tbody>
                            {this.props.dataReports.length >= 1 ? (
                            this.props.dataReports.map(accion => (
                                <tr key={accion.id}>
                                    <td>{accion.code_report}</td>
                                    <td>
                                        {accion.cost_center.customer.name}
                                    </td>
                                    <td>{accion.report_date}</td>
                                    <td>{accion.report_execute != undefined ? accion.report_execute.names : "" }</td>
                                    <td>{accion.working_time}</td>
                                    <td>{accion.work_description}</td>
                                    <td><NumberFormat value={accion.viatic_value} displayType={"text"} thousandSeparator={true} prefix={"$"}/></td>
                                    <td>{accion.viatic_description}</td>
                                    <td><NumberFormat value={accion.total_value} displayType={"text"} thousandSeparator={true} prefix={"$"}/></td>
                                    <td>{accion.report_sate ? "Aprobado" : "Sin Aprobar"}</td>
                                </tr>
                            ))
                            ) : (
                            <tr>
                                <td colSpan="11" className="text-center">
                                    <div className="text-center mt-4 mb-4">
                                        <h4>No hay reportes de servicios</h4>
                                    </div>
                                </td>
                            </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </React.Fragment>
        );
    }
}

export default ReportesDeServiciosTable;