import React from "react";
import Index from "../components/PurchaseOrders/index"
import WebpackerReact from 'webpacker-react';

class SalesOrders extends React.Component {
  
 
  render() {
    return (
         <Index usuario={this.props.usuario} estados={this.props.estados} cost_centers={this.props.cost_centers} clientes={this.props.clientes}/>
    );
  }
}

export default SalesOrders;

WebpackerReact.setup({ SalesOrders });
