import React from 'react';
import Index from "../components/Materials/index";
import WebpackerReact from 'webpacker-react';

class Materials extends React.Component {
    render() {
        return (
            React.createElement(Index, {
                cost_center: this.props.cost_center,
                usuario: this.props.usuario,
                providers: this.props.providers,
                estados: this.props.estados
            })
        );
    }
}

WebpackerReact.setup({ Materials: Materials });

export default Materials;
