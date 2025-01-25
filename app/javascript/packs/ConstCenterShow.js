import React from 'react';
import Index from "../components/ConstCenter/index"
import WebpackerReact from 'webpacker-react';

class ConstCenterShow extends React.Component {
    render() {
        return (
            <React.Fragment>
                <Index
                    microsoft_auth={this.props.microsoft_auth}
                    current_user_name={this.props.current_user_name}
                    alerts={this.props.alerts}
                    current_tab={this.props.current_tab}
                    users_select={this.props.users_select}
                    cost_center={this.props.cost_center}
                    usuario={this.props.usuario}
                    estados={this.props.estados}
                    clientes={this.props.clientes}
                    users={this.props.users}
                    providers={this.props.providers}
                    report_expense_options={this.props.report_expense_options}
                />
            </React.Fragment>
        );
    }
}

export default ConstCenterShow;

WebpackerReact.setup({ ConstCenterShow });