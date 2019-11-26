import React from 'react';
import Index from "../components/CustomerReports/index"
import WebpackerReact from 'webpacker-react';

class CustomerReports extends React.Component {
    render() {
        return (
            <React.Fragment>
                <Index usuario={this.props.usuario} estados={this.props.estados} clientes={this.props.clientes} contacts={this.props.contacts}/>
            </React.Fragment>
        );
    }
}

export default CustomerReports;

WebpackerReact.setup({ CustomerReports });