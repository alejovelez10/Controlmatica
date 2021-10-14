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

                                    <div className="col-md-6 mb-3">
                                        <input
                                            type="hidden"
                                            name="user_direction_id"
                                            value={this.props.selectedOptionUserDirection.user_direction_id}
                                        />                                                        
                                        <label>Nombre director </label>
                                        <Select
                                            onChange={this.props.handleChangeAutocompleteUserDirection}
                                            options={this.props.users}
                                            autoFocus={false}
                                            className={`link-form ${!this.props.errorValues && this.props.formValues.user_direction_id == "" ? "error-class" : ""}`}
                                            value={this.props.selectedOptionUserDirection}
                                        />
                                    </div>

                                    <div className="col-md-6 mb-3">
                                        <input
                                            type="hidden"
                                            name="user_report_id"
                                            value={this.props.selectedOptionUserReport.user_report_id}
                                        />                                                        
                                        <label>Nombre del empleado </label>
                                        <Select
                                            onChange={this.props.handleChangeAutocompleteUserReport}
                                            options={this.props.users}
                                            autoFocus={false}
                                            className={`link-form ${!this.props.errorValues && this.props.formValues.user_report_id == "" ? "error-class" : ""}`}
                                            value={this.props.selectedOptionUserReport}
                                        />
                                    </div>

                                    <div className="col-md-12">
                                        <label>Observaciones </label>
                                        <textarea
                                            type="text"
                                            name="observations"
                                            rows="6"
                                            value={this.props.formValues.observations}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control mb-3 ${!this.props.errorValues && this.props.formValues.observations == "" ? "error-class" : ""}`}
                                        />
                                    </div>

                                    <div className="col-md-6 mb-3">
                                        <label>Fecha inicial </label>
                                        <input
                                            type="date"
                                            name="start_date"
                                            value={this.props.formValues.start_date}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control ${!this.props.errorValues && this.props.formValues.start_date == "" ? "error-class" : ""}`}
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label>Fecha final </label>
                                        <input
                                            type="date"
                                            name="end_date"
                                            value={this.props.formValues.end_date}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control ${!this.props.errorValues && this.props.formValues.end_date == "" ? "error-class" : ""}`}
                                        />
                                    </div>

                                    <div className="col-md-6 mb-3">
                                        <label>Fecha de creación </label>
                                        <input
                                            type="date"
                                            name="creation_date"
                                            value={this.props.formValues.creation_date}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control ${!this.props.errorValues && this.props.formValues.creation_date == "" ? "error-class" : ""}`}
                                        />
                                    </div>

                                    <div className="col-md-6 mb-3">
                                        <label>Area </label>
                                        <input
                                            type="text"
                                            name="area"
                                            value={this.props.formValues.area}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control ${!this.props.errorValues && this.props.formValues.area == "" ? "error-class" : ""}`}
                                        />
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