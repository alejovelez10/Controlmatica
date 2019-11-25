import React from "react";
import Index from "../components/Rol/index"
import WebpackerReact from 'webpacker-react';

 
class Rols extends React.Component {
  
 
  render() {
    return (
         <Index usuario={this.props.current_user} estados={this.props.estados}/>
    );
  }
}

export default Rols;

WebpackerReact.setup({ Rols });