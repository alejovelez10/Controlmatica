import React, { Component } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import NumberFormat from 'react-number-format';
import Select from "react-select";

class FormCreate extends Component {
    handleSubmit = e => {
        e.preventDefault();
    };

    render() {
        return (
            <React.Fragment>
                <Modal isOpen={this.props.modal} toggle={this.props.toggle} className="modal-dialog-centered modal-lg" backdrop={this.props.backdrop}>
                    <ModalHeader className="title-modal" toggle={this.props.toggle}><i className="app-menu__icon fa fa-user mr-2"></i> {this.props.title}</ModalHeader>

                    <form onSubmit={this.handleSubmit}>
                        <ModalBody>
                            <div className="row">
                                <div className="col-md-4 mb-3">
                                    <input
                                        type="hidden"
                                        name="user_invoice_id"
                                        value={this.props.selectedOptionUser.user_invoice_id}
                                    />
                                    <label>Usuario facturado </label>
                                    <Select
                                        onChange={this.props.handleChangeAutocompleteUser}
                                        options={this.props.users}
                                        autoFocus={false}
                                        className={`link-form ${!this.props.errorValues && this.props.formValues.user_invoice_id == "" ? "error-class" : ""}`}
                                        value={this.props.selectedOptionUser}
                                    />
                                </div>

                                <div className="col-md-4 mb-3">
                                    <label>Fecha de comienzo </label>
                                    <input
                                        type="date"
                                        name="start_date"
                                        value={this.props.formValues.start_date}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control ${!this.props.errorValues && this.props.formValues.start_date == "" ? "error-class" : ""}`}
                                    />
                                </div>

                                <div className="col-md-4 mb-3">
                                    <label>Fecha de finalización </label>
                                    <input
                                        type="date"
                                        name="end_date"
                                        value={this.props.formValues.end_date}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control ${!this.props.errorValues && this.props.formValues.end_date == "" ? "error-class" : ""}`}
                                    />
                                </div>

                                <div className="col-md-4 mb-3">
                                    <input
                                        type="hidden"
                                        name="customer_invoice_id"
                                        value={this.props.selectedOptionCustomerInvoice.customer_invoice_id}
                                    />
                                    <label>Facturas </label>
                                    <Select
                                        onChange={this.props.handleChangeAutocompleteCustomerInvoice}
                                        options={this.props.customer_invoices}
                                        autoFocus={false}
                                        className={`link-form ${!this.props.errorValues && this.props.formValues.customer_invoice_id == "" ? "error-class" : ""}`}
                                        value={this.props.selectedOptionCustomerInvoice}
                                    />
                                </div>

                                <div className="col-md-4">
                                    <label>Horas trabajadas </label>
                                    <input
                                        type="number"
                                        name="hours_worked"
                                        value={this.props.formValues.hours_worked}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control ${!this.props.errorValues && this.props.formValues.hours_worked == "" ? "error-class" : ""}`}
                                    />
                                </div>

                                <div className="col-md-4">
                                    <label>Total </label>
                                    <input
                                        type="number"
                                        name="total_value"
                                        value={this.props.formValues.total_value}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control ${!this.props.errorValues && this.props.formValues.total_value == "" ? "error-class" : ""}`}
                                    />
                                </div>


                                <div className="col-md-12 mt-2">
                                    <textarea
                                        name="observation"
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control ${!this.props.errorValues && this.props.formValues.invoice_total == "" ? "error-class" : ""}`}
                                        value={this.props.formValues.observation}
                                        rows="8"
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