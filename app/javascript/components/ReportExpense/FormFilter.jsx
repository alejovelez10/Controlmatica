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
                                        <label>Nombre </label>
                                        <Select
                                            onChange={this.props.handleChangeAutocompleteUser}
                                            options={this.props.users}
                                            autoFocus={false}
                                            className={`link-form`}
                                            value={this.props.selectedOptionUser}
                                        />
                                    </div>
{/* 
                                    <div className="col-md-3 mb-3">
                                        <label>Nombre factura </label>
                                        <input
                                            type="text"
                                            name="invoice_name"
                                            value={this.props.formValues.invoice_name}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control ${!this.props.errorValues && this.props.formValues.name == "" ? "error-class" : ""}`}
                                        />
                                    </div> */}


                                    {/* <div className="col-md-3 mb-3">
                                        <label>Fecha de factura </label>
                                        <input
                                            type="date"
                                            name="invoice_date"
                                            value={this.props.formValues.invoice_date}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control ${!this.props.errorValues && this.props.formValues.name == "" ? "error-class" : ""}`}
                                        />
                                    </div> */}


                                    <div className="col-md-3 mb-3">
                                        <label>NIT / CEDULA</label>
                                        <select 
                                            name="identification"
                                            value={this.props.formValues.identification}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control`}
                                        >
                                            <option value="">Selecciona un tipo</option>
                                            <option value="NIT">NIT</option>
                                            <option value="CC">CC</option>
                                        </select>
                                    </div>

                                    <div className="col-md-3 mb-3">
                                        <label>Descripción </label>
                                        <input
                                            type="text"
                                            name="description"
                                            value={this.props.formValues.description}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control ${!this.props.errorValues && this.props.formValues.name == "" ? "error-class" : ""}`}
                                        />
                                    </div>

                                    <div className="col-md-3 ">
                                        <label># Factura </label>
                                        <input
                                            type="number"
                                            name="invoice_number"
                                            value={this.props.formValues.invoice_number}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control`}
                                        />
                                    </div>


                                    <div className="col-md-3">
                                        <label>Tipo </label>
                                        <select 
                                            name="type_identification_id"
                                            value={this.props.formValues.type_identification_id}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control`}
                                        >
                                            <option value="">Selecciona un tipo</option>
                                            {this.props.report_expense_options.filter(item => item.category == "Tipo").map((item) => (
                                                <option value={item.id} key={item.id}>{item.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-md-3">
                                        <label>Medio de pago </label>
                                        <select 
                                            name="payment_type_id"
                                            value={this.props.formValues.payment_type_id}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control`}
                                        >
                                            <option value="">Selecciona un tipo</option>
                                            {this.props.report_expense_options.filter(item => item.category == "Medio de pago").map((item) => (
                                                <option value={item.id} key={item.id}>{item.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-md-3">
                                        <label>Fecha desde </label>
                                        <input
                                            type="date"
                                            name="start_date"
                                            value={this.props.formValues.start_date}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control`}
                                        />
                                    </div>

                                    <div className="col-md-3 mt-2">
                                        <label>Fecha hasta </label>
                                        <input
                                            type="date"
                                            name="end_date"
                                            value={this.props.formValues.end_date}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control`}
                                        />
                                    </div>
{/* 
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
                                        <label>IVA </label>
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
                                    </div> */}

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
