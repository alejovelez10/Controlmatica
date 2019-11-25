import React from 'react';
import Index from "../components/Parameterizations/index"
import WebpackerReact from 'webpacker-react';

class Parameterizations extends React.Component {
    render() {
        return (
            <React.Fragment>
                <Index usuario={this.props.usuario} estados={this.props.estados} />
            </React.Fragment>
        );
    }
}

export default Parameterizations;

WebpackerReact.setup({ Parameterizations });
