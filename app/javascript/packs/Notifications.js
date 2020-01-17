import React from 'react';
import Index from "../components/Notifications/index"
import WebpackerReact from 'webpacker-react';

class Notifications extends React.Component {
    render() {
        return (
            <React.Fragment>
                <Index usuario={this.props.usuario} estados={this.props.estados} />
            </React.Fragment>
        );
    }
}

export default Notifications;

WebpackerReact.setup({ Notifications });
