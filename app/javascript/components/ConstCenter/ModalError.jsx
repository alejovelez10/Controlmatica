import React, { Component } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import NumberFormat from 'react-number-format';
import Select from "react-select";
import ReactHtmlParser from 'react-html-parser';

class ModalError extends Component {
    render() {
        return (
            <React.Fragment>
                <Modal isOpen={this.props.modal} toggle={this.props.toggle} className="modal-dialog-centered" backdrop={this.props.backdrop}>
                    <form onSubmit={this.handleSubmit}>
                        <ModalBody>
                            <div className="row">
                                <div className="col-md-12">
                                    <h4 className="text-center">El Centro de Costos no se pudo eliminar ya que tiene los siguientes items asociados</h4>
                                </div>

                                <div className="col-md-12 mt-4">
                                    <ul>
                                        {this.props.messages.map(m => (
                                            <li>{ReactHtmlParser(m)}</li>
                                        ))}
                                    </ul>

                                    <div className="alert alert-primary mr-5 text-center w-100" role="alert">
                                        <b>Debes asignar los anteriores itemas a otro centro de costos o eliminarlos para poder eliminar el centro de costos</b>
                                    </div>
                                </div>
                            </div>
                        </ModalBody>

                        <ModalFooter>
                            <label className="btn btn-light mt-2" onClick={() => this.props.toggle()}>Cerrar</label>
                        </ModalFooter>
                    </form>
                </Modal>
            </React.Fragment>
        );
    }
}

export default ModalError;