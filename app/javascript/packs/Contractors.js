import React from 'react';
import Index from "../components/Contractors/index"
import WebpackerReact from 'webpacker-react';

class Contractors extends React.Component {
    render() {
        return (
            <React.Fragment>
                <Index cost_center={this.props.cost_center} users={this.props.users} usuario={this.props.usuario} estados={this.props.estados} />
            </React.Fragment>
        );
    }
}

export default Contractors;

WebpackerReact.setup({ Contractors });