import React from 'react';
import Index from "../components/ConstCenter/indexTable"
import WebpackerReact from 'webpacker-react';

class ConstCenter extends React.Component {
    render() {
        return (
            <React.Fragment>
                <Index alerts={this.props.alerts} users={this.props.users} usuario={this.props.usuario} clientes={this.props.clientes} cost_center={this.props.cost_center} estados={this.props.estados} hours_real={this.props.hours_real} hours_invoices={this.props.hours_invoices} hours_real_contractor={this.props.hours_real_contractor} value_displacement_hours={this.props.value_displacement_hours} />
            </React.Fragment>
        );
    }
}




export default ConstCenter;

WebpackerReact.setup({ ConstCenter });