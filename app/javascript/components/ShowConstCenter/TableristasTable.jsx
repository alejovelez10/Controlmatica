import React, { Component } from 'react';

class TableristasTable extends Component {
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
                        <th style={{ width: "10%" }} >Fecha</th>
                        <th style={{ width: "7%" }} >Horas</th>
                        <th style={{ width: "16%" }} >Trabajo realizado por</th>
                        <th style={{ width: "16%" }} >Descripcion</th>
                        </tr>
                    </thead>

                    <tbody>
                        {this.props.dataContractors.length >= 1 ? (
                        this.props.dataContractors.map(accion => (
                            <tr key={accion.id}>
                            <td>{accion.sales_date}</td>                     
                            <td>{accion.hours}</td>
                            <td>{accion.user_execute != undefined ? accion.user_execute.names : ""}</td>
                            <td>{accion.description}</td>

                            
                            </tr>
                        ))
                        ) : (
                        <td colSpan="8" className="text-center">
                            <div className="text-center mt-1 mb-1">
                                <h4>No hay tableristas</h4>
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

export default TableristasTable;