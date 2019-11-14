import React from 'react';
import Index from "../components/Customers/index"
import WebpackerReact from 'webpacker-react';

class Customers extends React.Component {
    render() {
        return (
            <React.Fragment>
                <Index usuario={this.props.usuario} />
            </React.Fragment>
        );
    }
}

export default Customers;

WebpackerReact.setup({ Customers });