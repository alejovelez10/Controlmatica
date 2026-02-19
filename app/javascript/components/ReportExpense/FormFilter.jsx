import React, { Component } from 'react';
import NumberFormat from 'react-number-format';
import Select from "react-select";

const selectStyles = {
  control: (base, state) => ({
    ...base,
    fontFamily: "'Poppins', sans-serif",
    fontSize: "13px",
    borderColor: state.isFocused ? "#f5a623" : "#e2e5ea",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(245, 166, 35, 0.15)" : "none",
    borderRadius: "6px",
    minHeight: "38px",
    "&:hover": { borderColor: "#f5a623" },
  }),
  placeholder: (base) => ({ ...base, color: "#9ca3af", fontSize: "13px" }),
  option: (base, state) => ({
    ...base,
    fontFamily: "'Poppins', sans-serif",
    fontSize: "13px",
    backgroundColor: state.isSelected ? "#f5a623" : state.isFocused ? "#fef7ec" : "#fff",
    color: state.isSelected ? "#fff" : "#212529",
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

class FormFilter extends Component {
    close = () => {
        this.props.filter(false);
    };

    render() {
        return (
            <div style={{ marginBottom: 16 }}>
                <div className="cm-dt" style={{ overflow: "visible" }}>
                    {/* Header */}
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--cm-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: 13, fontWeight: 600, color: "var(--cm-text-muted)" }}>
                            <i className="fas fa-filter" style={{ marginRight: 8, opacity: 0.6 }} />
                            Filtros avanzados
                        </span>
                        <button onClick={this.close} className="cm-dt-action-btn" title="Cerrar filtros" style={{ width: 28, height: 28 }}>
                            <i className="fas fa-times" />
                        </button>
                    </div>

                    {/* Content - Grid de 4 columnas */}
                    <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>

                        {/* Row 1 */}
                        <div className="cm-form-group" style={{ marginBottom: 0 }}>
                            <label className="cm-label">Centro de costo</label>
                            <input
                                type="hidden"
                                name="cost_center_id"
                                value={this.props.selectedOptionCostCenter.cost_center_id}
                            />
                            <Select
                                onChange={this.props.handleChangeAutocompleteCostCenter}
                                options={this.props.cost_centers}
                                autoFocus={false}
                                value={this.props.selectedOptionCostCenter}
                                styles={selectStyles}
                                placeholder="Seleccione..."
                                noOptionsMessage={() => "Sin resultados"}
                                menuPortalTarget={document.body}
                            />
                        </div>

                        <div className="cm-form-group" style={{ marginBottom: 0 }}>
                            <label className="cm-label">Nombre</label>
                            <input
                                type="hidden"
                                name="user_invoice_id"
                                value={this.props.selectedOptionUser.user_invoice_id}
                            />
                            <Select
                                onChange={this.props.handleChangeAutocompleteUser}
                                options={this.props.users}
                                autoFocus={false}
                                value={this.props.selectedOptionUser}
                                styles={selectStyles}
                                placeholder="Seleccione..."
                                noOptionsMessage={() => "Sin resultados"}
                                menuPortalTarget={document.body}
                            />
                        </div>

                        <div className="cm-form-group" style={{ marginBottom: 0 }}>
                            <label className="cm-label">Nombre factura</label>
                            <input
                                type="text"
                                name="invoice_name"
                                value={this.props.formValues.invoice_name}
                                onChange={this.props.onChangeForm}
                                className="cm-input"
                                style={{ height: 38 }}
                            />
                        </div>

                        <div className="cm-form-group" style={{ marginBottom: 0 }}>
                            <label className="cm-label">NIT / CEDULA</label>
                            <input
                                type="text"
                                name="identification"
                                value={this.props.formValues.identification}
                                onChange={this.props.onChangeForm}
                                className="cm-input"
                                style={{ height: 38 }}
                            />
                        </div>

                        {/* Row 2 */}
                        <div className="cm-form-group" style={{ marginBottom: 0 }}>
                            <label className="cm-label">Descripcion</label>
                            <input
                                type="text"
                                name="description"
                                value={this.props.formValues.description}
                                onChange={this.props.onChangeForm}
                                className="cm-input"
                                style={{ height: 38 }}
                            />
                        </div>

                        <div className="cm-form-group" style={{ marginBottom: 0 }}>
                            <label className="cm-label"># Factura</label>
                            <input
                                type="text"
                                name="invoice_number"
                                value={this.props.formValues.invoice_number}
                                onChange={this.props.onChangeForm}
                                className="cm-input"
                                style={{ height: 38 }}
                            />
                        </div>

                        <div className="cm-form-group" style={{ marginBottom: 0 }}>
                            <label className="cm-label">Tipo</label>
                            <select
                                name="type_identification_id"
                                value={this.props.formValues.type_identification_id}
                                onChange={this.props.onChangeForm}
                                className="cm-input"
                                style={{ height: 38 }}
                            >
                                <option value="">Selecciona un tipo</option>
                                {this.props.report_expense_options.filter(item => item.category == "Tipo").map((item) => (
                                    <option value={item.id} key={item.id}>{item.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="cm-form-group" style={{ marginBottom: 0 }}>
                            <label className="cm-label">Medio de pago</label>
                            <select
                                name="payment_type_id"
                                value={this.props.formValues.payment_type_id}
                                onChange={this.props.onChangeForm}
                                className="cm-input"
                                style={{ height: 38 }}
                            >
                                <option value="">Selecciona un tipo</option>
                                {this.props.report_expense_options.filter(item => item.category == "Medio de pago").map((item) => (
                                    <option value={item.id} key={item.id}>{item.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Row 3 */}
                        <div className="cm-form-group" style={{ marginBottom: 0 }}>
                            <label className="cm-label">Fecha desde</label>
                            <input
                                type="date"
                                name="start_date"
                                value={this.props.formValues.start_date}
                                onChange={this.props.onChangeForm}
                                className="cm-input"
                                style={{ height: 38 }}
                            />
                        </div>

                        <div className="cm-form-group" style={{ marginBottom: 0 }}>
                            <label className="cm-label">Fecha hasta</label>
                            <input
                                type="date"
                                name="end_date"
                                value={this.props.formValues.end_date}
                                onChange={this.props.onChangeForm}
                                className="cm-input"
                                style={{ height: 38 }}
                            />
                        </div>

                        <div className="cm-form-group" style={{ marginBottom: 0 }}>
                            <label className="cm-label">Estado</label>
                            <select
                                name="is_acepted"
                                value={this.props.formValues.is_acepted}
                                onChange={this.props.onChangeForm}
                                className="cm-input"
                                style={{ height: 38 }}
                            >
                                <option value="">Selecciona</option>
                                <option value="true">Aceptado</option>
                                <option value="false">Creado</option>
                            </select>
                        </div>

                        {/* Buttons */}
                        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "flex-end", gap: 10 }}>
                            <button onClick={this.props.cancelFilter} className="cm-btn cm-btn-outline cm-btn-sm" type="button">
                                <i className="fas fa-eraser" /> Limpiar
                            </button>
                            <button onClick={this.props.HandleClickFilter} className="cm-btn cm-btn-accent cm-btn-sm" type="button">
                                <i className="fas fa-search" /> Aplicar filtros
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default FormFilter;
