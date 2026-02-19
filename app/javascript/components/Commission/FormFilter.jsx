import React, { Component } from 'react';
import NumberFormat from 'react-number-format';
import Select from "react-select";

class FormFilter extends Component {
    close = () => {
        this.props.filter(false);
    };

    render() {
        return (
            <React.Fragment>
                <div className="row">
                    <div className="col-md-12">
                        <div className="tile">

                            {/* Header con botón de cerrar */}
                            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--cm-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: 13, fontWeight: 600, color: "var(--cm-text-muted)" }}>
                                    <i className="fas fa-filter" style={{ marginRight: 8, opacity: 0.6 }} />
                                    Filtros avanzados
                                </span>
                                <button onClick={this.close} className="cm-dt-action-btn" title="Cerrar filtros" style={{ width: 28, height: 28 }}>
                                    <i className="fas fa-times" />
                                </button>
                            </div>

                            <div className="tile-body">
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

                            <div className="tile-footer" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                                <button onClick={this.props.cancelFilter} className="cm-btn cm-btn-outline cm-btn-sm" type="button">
                                    <i className="fas fa-eraser" /> Limpiar
                                </button>
                                <button onClick={() => this.props.HandleClickFilter()} className="cm-btn cm-btn-accent cm-btn-sm" type="button">
                                    <i className="fas fa-search" /> Aplicar filtros
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
