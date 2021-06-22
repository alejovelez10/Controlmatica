import React, { Component } from 'react';
import NumberFormat from 'react-number-format';
import Select from "react-select";

class FormFilter extends Component {
    render() {
        return (
            <React.Fragment>
                <div className="row">
                    <div className="col-md-12">
                        <div className="tile">

                            <div className="tile-body">
                                <div className="row">

                                    <div className="col-md-3 mb-3">
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

                                    <div className="col-md-3 mb-3">
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

                                    <div className="col-md-3 mb-3">
                                        <label>Nombre factura </label>
                                        <input
                                            type="text"
                                            name="invoice_name"
                                            value={this.props.formValues.invoice_name}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control ${!this.props.errorValues && this.props.formValues.name == "" ? "error-class" : ""}`}
                                        />
                                    </div>


                                    <div className="col-md-3 mb-3">
                                        <label>Fecha de factura </label>
                                        <input
                                            type="date"
                                            name="invoice_date"
                                            value={this.props.formValues.invoice_date}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control ${!this.props.errorValues && this.props.formValues.name == "" ? "error-class" : ""}`}
                                        />
                                    </div>


                                    <div className="col-md-3 mb-3">
                                        <label>NIT / CEDULA</label>
                                        <select 
                                            name="type_identification"
                                            value={this.props.formValues.type_identification}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control`}
                                        >
                                            <option value="">Selecciona un tipo</option>
                                            <option value="NIT">NIT</option>
                                            <option value="CC">CC</option>
                                        </select>
                                    </div>

                                    <div className="col-md-3 mb-3">
                                        <label>Descripcion </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={this.props.formValues.name}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control ${!this.props.errorValues && this.props.formValues.name == "" ? "error-class" : ""}`}
                                        />
                                    </div>

                                    <div className="col-md-3 ">
                                        <label>Numero de factura </label>
                                        <input
                                            type="number"
                                            name="invoice_number"
                                            value={this.props.formValues.invoice_number}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control`}
                                        />
                                    </div>


                                    <div className="col-md-3">
                                        <label>Tipo de factura </label>
                                        <select 
                                            name="invoice_type"
                                            value={this.props.formValues.invoice_type}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control`}
                                        >
                                            <option value="">Selecciona un tipo</option>
                                            <option value="V1">V1</option>
                                            <option value="V2">V2</option>
                                        </select>
                                    </div>

                                    <div className="col-md-3">
                                        <label>Tipo de pago </label>
                                        <select 
                                            name="payment_type"
                                            value={this.props.formValues.payment_type}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control`}
                                        >
                                            <option value="">Selecciona un tipo</option>
                                            <option value="V1">V1</option>
                                            <option value="V2">V2</option>
                                        </select>
                                    </div>

                                    <div className="col-md-3">
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

                                    <div className="col-md-3">
                                        <label>Impuesto a la factura </label>
                                        <NumberFormat 
                                            name="invoice_tax"
                                            thousandSeparator={true} 
                                            prefix={'$'} 
                                            className={`form form-control`}
                                            value={this.props.formValues.invoice_tax}
                                            onChange={this.props.onChangeFormMoney}
                                        /> 
                                    </div>

                                    <div className="col-md-3">
                                        <label>Total </label>
                                        <NumberFormat 
                                            name="invoice_total"
                                            thousandSeparator={true} 
                                            prefix={'$'} 
                                            className={`form form-control`}
                                            value={this.props.formValues.invoice_total}
                                            onChange={this.props.onChangeFormMoney}
                                        /> 
                                    </div>

                                </div>
                            </div>

                            <div className="tile-footer">
                                <button
                                    className="btn btn-secondary mr-3"
                                    onClick={() => this.props.HandleClickFilter()}
                                >
                                    Aplicar
                                </button>

                                <button
                                    className="btn btn-danger"
                                    onClick={() => this.props.filter(false)}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </React.Fragment>
        );
    }
}

export default FormFilter;
