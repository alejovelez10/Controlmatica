import React from 'react';
import Index from "../components/Reports/index";
import WebpackerReact from 'webpacker-react';

class Reports extends React.Component {
    render() {
        return (
            React.createElement(Index, {
                usuario: this.props.usuario,
                users: this.props.users,
                clientes: this.props.clientes,
                estados: this.props.estados,
                cost_centers: this.props.cost_centers,
                rol: this.props.rol,
                // Propietarios para el centro que se crea cuando el reporte va
                // sin centro (2026-10-18). Sin pasarlo, el select salia vacio
                // y no se podia guardar un reporte sin centro.
                owners: this.props.owners
            })
        );
    }
}

export default Reports;

WebpackerReact.setup({ Reports });
