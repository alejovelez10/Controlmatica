import React from "react";
import Show from "../components/Module/show";
import WebpackerReact from 'webpacker-react';


class ModuleControlShow extends React.Component {
  
  render() {
  
    return (
         <Show modulo={this.props.modulo} usuario={this.props.usuario} />
    );
  }
  
}

export default ModuleControlShow;

WebpackerReact.setup({ ModuleControlShow });
