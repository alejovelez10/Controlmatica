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
                                    <label>Responsable </label>
                                    <Select
                                        onChange={this.props.handleChangeAutocompleteUser}
                                        options={this.props.users}
                                        autoFocus={false}
                                        className={`link-form ${!this.props.errorValues && this.props.formValues.user_invoice_id == "" ? "error-class" : ""}`}
                                        value={this.props.selectedOptionUser}
                                        isDisabled={!this.props.estados.change_responsible}
                                    />
                                </div>

                                <div className="col-md-4 mb-3">
                                    <label>Fecha desde </label>
                                    <input
                                        type="date"
                                        name="start_date"
                                        value={this.props.formValues.start_date}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control ${!this.props.errorValues && this.props.formValues.start_date == "" ? "error-class" : ""}`}
                                    />
                                </div>

                                <div className="col-md-4 mb-3">
                                    <label>Fecha hasta </label>
                                    <input
                                        type="date"
                                        name="end_date"
                                        value={this.props.formValues.end_date}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control ${!this.props.errorValues && this.props.formValues.end_date == "" ? "error-class" : ""}`}
                                    />
                                </div>

                                {(this.props.formValues.start_date && this.props.formValues.end_date || true) && (
                                    <div className="col-md-4 mb-3">
                                        <input
                                            type="hidden"
                                            name="cost_center_id"
                                            value={this.props.selectedOptionCostCenter.cost_center_id}
                                        />
                                        <label>Centro de costos </label>
                                        <Select
                                            onChange={this.props.handleChangeAutocompleteCostCenter}
                                            options={this.props.cost_centers}
                                            autoFocus={false}
                                            className={`link-form`}
                                            value={this.props.selectedOptionCostCenter}
                                        />
                                    </div>
                                )}

                                {(this.props.customer_reports.length >= 1 || true) && (
                                    <div className="col-md-4 mb-3">
                                        <input
                                            type="hidden"
                                            name="customer_report_id"
                                            value={this.props.selectedOptionCustomerReport.customer_report_id}
                                        />
                                        <label>Reporte de cliente ddd</label>
                                        
                                        <Select
                                            onChange={this.props.handleChangeAutocompleteCustomerReport}
                                            options={this.props.customer_reports}
                                            autoFocus={false}
                                            className={`link-form ${!this.props.errorValues && this.props.formValues.customer_report_id == ""  ? "error-class" : ""}`}
                                            value={this.props.selectedOptionCustomerReport}
                                            
                                        />
                                    </div>
                                )}

                                {(this.props.customer_invoices.length >= 1 || true) && (
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
                                )}

                                <div className="col-md-4" style={{ display: this.props.estados.change_value_hour ? 'block' : 'none' }}>
                                    <label>Valor hora proyecto </label>
                                    <NumberFormat
                                        name="value_hour"
                                        thousandSeparator={true}
                                        prefix={'$'}
                                        className={`form form-control ${this.props.errorValues == false && this.props.formValues.value_hour == "" ? "error-class" : ""}`}
                                        value={this.props.formValues.value_hour}
                                        onChange={this.props.onChangeForm}

                                    />
                                </div>


                                <div className="col-md-4">
                                    <label>Horas por pagar </label>
                                    <input
                                        type="number"
                                        name="hours_worked"
                                        value={this.props.formValues.hours_worked}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control ${!this.props.errorValues && this.props.formValues.hours_worked == "" ? "error-class" : ""}`}
                                    />
                                    {this.props.state_msg_error && (
                                        <span style={{color:"red"}}>{this.props.msg_error}</span>
                                    )}
                                </div>

                                <div className="col-md-12 mt-3">
                                    <div className='alert alert-warning'>
                                        <div>Horas trabajadas en el centro de costos: <b>{this.props.formValues.hours_worked_code}</b> </div><br />
                                        <div>Horas cotizadas en el centro de costos: <b>{this.props.formValues.hours_cost}</b> </div><br /> 
                                        <div> Horas comisiónes aceptadas:  <b>{this.props.formValues.hours_paid}</b></div> <br />
                                        
                                        <div> Horas disponibles:  <b>{(this.props.formValues.hours_worked_code <= this.props.formValues.hours_cost ? this.props.formValues.hours_worked_code :  this.props.formValues.hours_cost) - this.props.formValues.hours_paid > 0 ? (this.props.formValues.hours_worked_code <= this.props.formValues.hours_cost ? this.props.formValues.hours_worked_code :  this.props.formValues.hours_cost)  - this.props.formValues.hours_paid : 0 }</b></div>
                                </div>

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
            </React.Fragment >
        );
    }
}

export default FormCreate;