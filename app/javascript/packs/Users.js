import React from "react";
import WebpackerReact from 'webpacker-react';
import Index from '../components/Users/index';

 
class Users extends React.Component {
  
 
  render() {
  
    return (
       <Index rols={this.props.rol} estados={this.props.estados}/>
    );
  }
}
export default Users;

WebpackerReact.setup({ Users });
