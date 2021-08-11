import React, { Component } from 'react';
import {Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import NumberFormat from 'react-number-format';
import Select from "react-select";

class FormCreate extends Component {

    constructor(props){
        super(props)
    }

    handleSubmit = e => {
        e.preventDefault();
    };

    render() {
        return (
            <React.Fragment>
                <Modal isOpen={this.props.modal} toggle={this.props.toggle} className="modal-dialog-centered" backdrop={this.props.backdrop}>
                    <ModalHeader className="title-modal" toggle={this.props.toggle}><i className="app-menu__icon fa fa-user mr-2"></i> {this.props.title}</ModalHeader>

                        <form onSubmit={this.handleSubmit}>
                            <ModalBody>
                                <div className="row">
                                    <div className="col-md-6">
                                        <label>Nombre</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={this.props.formValues.name}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control ${!this.props.errorValues && this.props.formValues.name == "" ? "error-class" : ""}`}
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label>Tipo</label>
                                        <select 
                                            name="category"
                                            value={this.props.formValues.category}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control`}
                                        >
                                            <option value="">Selecciona un tipo</option>
                                            <option value="Tipo">Tipo</option>
                                            <option value="Medio de pago">Medio de pago</option>
                                        </select>
                                    </div>


                                    {!this.props.errorValues && (
                                        <div className="col-md-12 mt-4">
                                            <div className="alert alert-danger" role="alert">
                                                <b>Debes de completar todos los campos requerios</b>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            </ModalBody>

                            <ModalFooter>
                                <label className="btn btn-light mt-2" onClick={() => this.props.toggle()}>Cerrar</label>
                                <button className="btn btn-secondary"
                                    onClick={this.props.submitForm}
                                    style={{ color: "#ffff" }}
                                >
                                    {this.props.nameBnt}
                                </button>
                            </ModalFooter>
                        </form>
                </Modal>
            </React.Fragment>
        );
    }
}

export default FormCreate;