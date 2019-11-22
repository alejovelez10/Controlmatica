import React from "react";
import Index from "../components/Module/Index"
import WebpackerReact from 'webpacker-react';

 
class ModuleControlindex extends React.Component {
  
 
  render() {
  
    return (
         <Index usuario={this.props.current_user} estados={this.props.estados} />
    );
  }
}

export default ModuleControlindex;

WebpackerReact.setup({ ModuleControlindex });
