import React from 'react';
import Index from "../components/ConstCenter/index"
import WebpackerReact from 'webpacker-react';

class ConstCenterShow extends React.Component {
    render() {
        return (
            <React.Fragment>
                <Index cost_center={this.props.cost_center} usuario={this.props.usuario} />
            </React.Fragment>
        );
    }
}

export default ConstCenterShow;

WebpackerReact.setup({ ConstCenterShow });