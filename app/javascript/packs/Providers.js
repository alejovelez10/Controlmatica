import React from 'react';
import Index from "../components/Providers/index"
import WebpackerReact from 'webpacker-react';

class Providers extends React.Component {
    render() {
        return (
            <React.Fragment>
                <Index usuario={this.props.usuario} />
            </React.Fragment>
        );
    }
}

export default Providers;

WebpackerReact.setup({ Providers });


