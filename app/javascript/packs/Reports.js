import React from 'react';
import Index from "../components/Reports/index"
import WebpackerReact from 'webpacker-react';

class Reports extends React.Component {
    render() {
        return (
            <React.Fragment>
                <Index usuario={this.props.usuario} reports={this.props.reports} users={this.props.users} clientes={this.props.clientes} estados={this.props.estados} cost_centers={this.props.cost_centers} rol={this.props.rol}  />
            </React.Fragment>
        );
    }
}

export default Reports;

WebpackerReact.setup({ Reports });