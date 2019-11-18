import React from 'react';
import Index from "../components/Reports/index"
import WebpackerReact from 'webpacker-react';

class Reports extends React.Component {
    render() {
        return (
            <React.Fragment>
                <Index usuario={this.props.usuario} users={this.props.users}  />
            </React.Fragment>
        );
    }
}

export default Reports;

WebpackerReact.setup({ Reports });