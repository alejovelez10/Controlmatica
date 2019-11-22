import React from 'react';
import {Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap'; 
import NumberFormat from 'react-number-format';
class ShowInfo extends React.Component {

  constructor(props) {
    super(props);
  }

  date = (fecha) => {
    var d = new Date(fecha),
    
    months = ['Enero','Febrero','Marzo','Abril','Mayo','junio','julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
    days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    
    return months[d.getMonth()] + " " + d.getDate() + " " + 'del' + " " +d.getFullYear();
  }

  render() {
    return (
      <div>
        <Modal isOpen={this.props.modal} toggle={this.props.toggle(false)} className="modal-lg modal-dialog-centered">
          <ModalHeader className="title-modal" toggle={this.props.toggle(false)}>{this.props.titulo}</ModalHeader>

            <ModalBody>
              <div className="row">

                <div className="col-md-4 mb-4">
                    <h6 className="colorTitle">Fecha de venta</h6>
                    <p className="mb-0">{this.props.infoShow.sales_date}</p>
                </div>

                <div className="col-md-4 mb-4">
                    <h6 className="colorTitle">Numero de ordenes</h6>
                    <p className="mb-0">{this.props.infoShow.sales_number}</p>
                </div>

                <div className="col-md-4 mb-4">
                    <h6 className="colorTitle">Valor</h6>
                    <p className="mb-0"><NumberFormat value={this.props.infoShow.amount} displayType={'text'} thousandSeparator={true} prefix={'$'} /></p>
                </div>


                <div className="col-md-4 mb-4">
                    <h6 className="colorTitle">Fecha de entrega</h6>
                    <p className="mb-0">{this.props.infoShow.delivery_date}</p>
                </div>

                <div className="col-md-4 mb-4">
                    <h6 className="colorTitle">Proveedor</h6>
                    <p className="mb-0">{this.props.infoShow.provider_id}</p>
                </div>

                <div className="col-md-4 mb-4">
                    <h6 className="colorTitle">Proveedor número de factura</h6>
                    <p className="mb-0">{this.props.infoShow.provider_invoice_number}</p>
                </div>

                <div className="col-md-4 mb-4">
                    <h6 className="colorTitle">Valor de factura del proveedor</h6>
                    <p className="mb-0"><NumberFormat value={this.props.infoShow.provider_invoice_value} displayType={'text'} thousandSeparator={true} prefix={'$'} /></p>
                </div>

                <div className="col-md-12">
                    <h6 className="colorTitle">Observaciones</h6>
                    <p className="mb-0">{this.props.infoShow.description}</p>
                </div>


              </div>

              </ModalBody>


          <ModalFooter>
                <button className="btn btn-secondary" onClick={() => this.props.toggle("close")}>Cerrar</button>
          </ModalFooter>

        </Modal>

      </div>
    );
  }
}

export default ShowInfo;
