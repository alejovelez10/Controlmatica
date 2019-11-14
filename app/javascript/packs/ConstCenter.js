import React from 'react';
import Index from "../components/ConstCenter/indexTable"
import WebpackerReact from 'webpacker-react';

class ConstCenter extends React.Component {
    render() {
        return (
            <React.Fragment>
                <Index usuario={this.props.usuario} />
            </React.Fragment>
        );
    }
}

export default ConstCenter;

WebpackerReact.setup({ ConstCenter });