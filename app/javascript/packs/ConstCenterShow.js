import React from 'react';
import Index from "../components/ConstCenter/index"
import WebpackerReact from 'webpacker-react';

class ConstCenterShow extends React.Component {
    render() {
        return (
            <React.Fragment>
                <Index alerts={this.props.alerts} current_tab={this.props.current_tab} users_select={this.props.users_select} cost_center={this.props.cost_center} usuario={this.props.usuario} estados={this.props.estados} clientes={this.props.clientes} users={this.props.users} />
            </React.Fragment>
        );
    }
}

export default ConstCenterShow;

WebpackerReact.setup({ ConstCenterShow });