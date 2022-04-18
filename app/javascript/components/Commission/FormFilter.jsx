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
                                            className={`link-form`}
                                            value={this.props.selectedOptionUser}
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
                                            className={`link-form`}
                                            value={this.props.selectedOptionCustomerInvoice}
                                        />
                                    </div>

                                    <div className="col-md-4 mb-3">
                                        <label>Descripción </label>
                                        <input
                                            type="text"
                                            name="description"
                                            value={this.props.formValues.description}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control ${!this.props.errorValues && this.props.formValues.name == "" ? "error-class" : ""}`}
                                        />
                                    </div>

                                    <div className="col-md-4">
                                        <label>Fecha desde </label>
                                        <input
                                            type="date"
                                            name="start_date"
                                            value={this.props.formValues.start_date}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control`}
                                        />
                                    </div>

                                    <div className="col-md-4">
                                        <label>Fecha hasta </label>
                                        <input
                                            type="date"
                                            name="end_date"
                                            value={this.props.formValues.end_date}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control`}
                                        />
                                    </div>

                                    <div className="col-md-4">
                                        <label>Estado </label>
                                        <select 
                                            name="is_acepted"
                                            value={this.props.formValues.is_acepted}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control`}
                                        >
                                            <option value="">Selecciona</option>
                                            <option value="true">Aceptado</option>
                                            <option value="false">Creado</option>
                                        </select>
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
