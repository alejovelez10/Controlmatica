import React, { Component } from 'react';
import {Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import NumberFormat from 'react-number-format';
import Select from "react-select";
import FormCreateExpenseOptionFromReporExpense from "../ReportExpenseOption/FormCreateExpenseOptionFromReporExpense"

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
                <Modal isOpen={this.props.modal} toggle={this.props.toggle} className="modal-dialog-centered modal-lg" backdrop={this.props.backdrop}>
                    <ModalHeader className="title-modal" toggle={this.props.toggle}><i className="app-menu__icon fa fa-user mr-2"></i> {this.props.title}</ModalHeader>

                        <form onSubmit={this.handleSubmit}>
                            <ModalBody>
                                <div className="row">

                                    <div className="col-md-4 mb-3">
                                        <input
                                            type="hidden"
                                            name="cost_center_id"
                                            value={this.props.selectedOptionCostCenter.cost_center_id}
                                        />                                                        
                                        <label>Centro de costo </label>
                                        <Select
                                            onChange={this.props.handleChangeAutocompleteCostCenter}
                                            options={this.props.cost_centers}
                                            autoFocus={false}
                                            className={`link-form`}
                                            value={this.props.selectedOptionCostCenter}
                                        />
                                    </div>

                                    <div className="col-md-4 mb-3">
                                        <input
                                            type="hidden"
                                            name="user_invoice_id"
                                            value={this.props.selectedOptionUser.user_invoice_id}
                                        />                                                        
                                        <label>Usuario </label>
                                        <Select
                                            onChange={this.props.handleChangeAutocompleteUser}
                                            options={this.props.users}
                                            autoFocus={false}
                                            className={`link-form`}
                                            value={this.props.selectedOptionUser}
                                        />
                                    </div>
                                    <div className="col-md-4 mb-3">
                                        <label>Fecha de factura </label>
                                        <input
                                            type="date"
                                            name="invoice_date"
                                            value={this.props.formValues.invoice_date}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control ${!this.props.errorValues && this.props.formValues.name == "" ? "error-class" : ""}`}
                                        />
                                    </div>

                                    <div className="col-md-4 mb-3 mt-3">
                                        <label>NIT / CEDULA</label>
                                        <input
                                            type="text"
                                            name="identification"
                                            value={this.props.formValues.identification}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control ${!this.props.errorValues && this.props.formValues.name == "" ? "error-class" : ""}`}
                                        />
                                    </div>


                                    <div className="col-md-8  mb-3 mt-3">
                                        <label>Nombre</label>
                                        <input
                                            type="text"
                                            name="invoice_name"
                                            value={this.props.formValues.invoice_name}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control ${!this.props.errorValues && this.props.formValues.name == "" ? "error-class" : ""}`}
                                        />
                                    </div> 


                                    <div className="col-md-12 mb-3 mt-3">
                                        <label>Descripción </label>
                                        <textarea
                                            row="4"
                                            type="text"
                                            name="description"
                                            value={this.props.formValues.description}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control ${!this.props.errorValues && this.props.formValues.name == "" ? "error-class" : ""}`}
                                        />
                                    </div>

                                   

                                  

                                    <div className="col-md-4 mt-3">
                                        <label>Tipo</label>
                                        <input
                                            type="hidden"
                                            name="type_identification_id"
                                            value={this.props.selectedOptionTypeIndentification.type_identification_id}
                                        />                                                        
                                        <Select
                                            onChange={this.props.handleChangeAutocompleteReportExpenceOptionType}
                                            options={this.props.report_expense_options_type}
                                            autoFocus={false}
                                            className={`link-form`}
                                            value={this.props.selectedOptionTypeIndentification}
                                        />
                                    </div>


                                    <div className="col-md-4 mt-3">
                                        <label>Medio de pago </label>
                                        <input
                                            type="hidden"
                                            name="payment_type_id"
                                            value={this.props.selectedOptionPaymentType.payment_type_id}
                                        />                                                        
                                        <Select
                                            onChange={this.props.handleChangeAutocompleteReportExpenceOptionPaymentType}
                                            options={this.props.report_expense_options_payment}
                                            autoFocus={false}
                                            className={`link-form`}
                                            value={this.props.selectedOptionPaymentType}
                                        />
                                    </div>
                                    <div className="col-md-4 mt-3">
                                        <label>Numero de factura </label>
                                        <input
                                            type="text"
                                            name="invoice_number"
                                            value={this.props.formValues.invoice_number}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control`}
                                        />
                                    </div>
                                    
{/*                                     <div className="col-md-12 mt-2">
                                        
                                        <FormCreateExpenseOptionFromReporExpense 
                                            setValuesReportExpenseOption={this.props.setValuesReportExpenseOption}
                                        />
                                    </div> */}
                                    <div className="col-md-12">
                                        <hr />
                                    </div>

                                    <div className="col-md-4">
                                        <label>Valor del pago </label>
                                        <NumberFormat 
                                            name="invoice_value"
                                            thousandSeparator={true} 
                                            prefix={'$'} 
                                            className={`form form-control`}
                                            value={this.props.formValues.invoice_value}
                                            onChange={this.props.onChangeFormMoney}
                                        /> 
                                    </div>

                                    <div className="col-md-4">
                                        <label>IVA</label>
                                        <NumberFormat 
                                            name="invoice_tax"
                                            thousandSeparator={true} 
                                            prefix={'$'} 
                                            className={`form form-control`}
                                            value={this.props.formValues.invoice_tax}
                                            onChange={this.props.onChangeFormMoney}
                                        /> 
                                    </div>

                                    <div className="col-md-4">
                                        <label>Total </label>
                                        <NumberFormat 
                                            thousandSeparator={true} 
                                            prefix={'$'} 
                                            className={`form form-control`}
                                            value={this.props.formValues.invoice_total}
                                            disabled
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