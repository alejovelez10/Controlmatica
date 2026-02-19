import React, { Component } from 'react';
import NumberFormat from 'react-number-format';
import Select from "react-select";
import { CmModal, CmButton } from "../../generalcomponents/ui";

const selectStyles = {
  control: (base, state) => ({
    ...base,
    background: "#fcfcfd",
    borderColor: state.isFocused ? "#f5a623" : "#e2e5ea",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(245, 166, 35, 0.15)" : "none",
    "&:hover": { borderColor: "#f5a623" },
    borderRadius: "8px",
    padding: "2px 4px",
    fontSize: "14px",
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? "#f5a623" : state.isFocused ? "#fff3e0" : "#fff",
    color: state.isSelected ? "#fff" : "#333",
    fontSize: "14px",
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

class FormCreate extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showMessage: false,
      message: "",
      costCenterInputValue: "",
    };
    this.debounceTimer = null;
  }

  handleSubmit = (e) => {
    e.preventDefault();
  };

  copyQuestion = (value, name) => {
    this.setState({
      showMessage: true,
      message: name,
    });
    setTimeout(() => {
      this.setState({ showMessage: false });
    }, 2000);
    navigator.clipboard.writeText(value);
  };

  handleCostCenterInputChange = (inputValue, { action }) => {
    if (action === "input-change") {
      this.setState({ costCenterInputValue: inputValue });
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      if (inputValue.length >= 2 && this.props.onCostCenterSearch) {
        this.debounceTimer = setTimeout(() => {
          this.props.onCostCenterSearch(inputValue);
        }, 300);
      }
    }
  };

  componentWillUnmount() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }

  render() {
    const costCenterOptions = this.props.costCenterOptions || this.props.cost_centers || [];
    const costCenterLoading = this.props.costCenterLoading || false;

    return (
      <CmModal
        isOpen={this.props.modal}
        toggle={this.props.toggle}
        size="lg"
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <i className="fa fa-receipt" style={{ color: "#f5a623" }}></i>
            {this.props.title}
          </div>
        }
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <CmButton variant="outline" onClick={() => this.props.toggle()}>
              <i className="fa fa-times"></i> Cancelar
            </CmButton>
            <CmButton variant="accent" onClick={this.props.submitForm}>
              <i className="fa fa-save"></i> {this.props.nameBnt}
            </CmButton>
          </div>
        }
      >
        <form onSubmit={this.handleSubmit}>
              {this.state.showMessage && (
                <div className="alert alert-warning mb-3">
                  {this.state.message} copiado
                </div>
              )}

              <div className="cm-form-grid-2">
                {this.props.cost_center_id === undefined && (
                  <div className="cm-form-group">
                    <input
                      type="hidden"
                      name="cost_center_id"
                      value={this.props.selectedOptionCostCenter.cost_center_id}
                    />
                    <label className="cm-label">
                      <i className="fa fa-building"></i> Centro de costo
                    </label>
                    <Select
                      onChange={this.props.handleChangeAutocompleteCostCenter}
                      options={costCenterOptions}
                      autoFocus={false}
                      styles={selectStyles}
                      menuPortalTarget={document.body}
                      className={`${
                        !this.props.errorValues &&
                        this.props.formValues.cost_center_id === ""
                          ? "error-class"
                          : ""
                      }`}
                      value={this.props.selectedOptionCostCenter}
                      onInputChange={this.handleCostCenterInputChange}
                      inputValue={this.state.costCenterInputValue}
                      isLoading={costCenterLoading}
                      placeholder="Buscar centro de costo..."
                      noOptionsMessage={() =>
                        this.state.costCenterInputValue.length < 2
                          ? "Escribe al menos 2 caracteres"
                          : "Sin resultados"
                      }
                    />
                  </div>
                )}

                <div className="cm-form-group">
                  <input
                    type="hidden"
                    name="user_invoice_id"
                    value={this.props.selectedOptionUser.user_invoice_id}
                  />
                  <label className="cm-label">
                    <i className="fa fa-user"></i> Usuario
                  </label>
                  <Select
                    onChange={this.props.handleChangeAutocompleteUser}
                    options={this.props.users}
                    autoFocus={false}
                    styles={selectStyles}
                    menuPortalTarget={document.body}
                    className={`${
                      !this.props.errorValues &&
                      this.props.formValues.user_invoice_id === ""
                        ? "error-class"
                        : ""
                    }`}
                    value={this.props.selectedOptionUser}
                    isDisabled={!this.props.estados.show_user}
                    placeholder="Seleccionar usuario..."
                  />
                </div>

                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-calendar"></i> Fecha de factura
                  </label>
                  <input
                    type="date"
                    name="invoice_date"
                    value={this.props.formValues.invoice_date}
                    onChange={this.props.onChangeForm}
                    className={`cm-input ${
                      !this.props.errorValues &&
                      this.props.formValues.invoice_date === ""
                        ? "error-class"
                        : ""
                    }`}
                  />
                </div>

                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-id-card"></i> NIT / Cedula
                  </label>
                  <input
                    type="text"
                    name="identification"
                    value={this.props.formValues.identification}
                    onChange={this.props.onChangeForm}
                    className={`cm-input ${
                      !this.props.errorValues &&
                      this.props.formValues.name === ""
                        ? "error-class"
                        : ""
                    }`}
                    placeholder="Ingrese NIT o cedula"
                  />
                </div>
              </div>

              <div className="cm-form-grid-1">
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-user-circle"></i> Nombre
                  </label>
                  <input
                    type="text"
                    name="invoice_name"
                    value={this.props.formValues.invoice_name}
                    onChange={this.props.onChangeForm}
                    className={`cm-input ${
                      !this.props.errorValues &&
                      this.props.formValues.name === ""
                        ? "error-class"
                        : ""
                    }`}
                    placeholder="Nombre del proveedor o tercero"
                  />
                </div>

                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-align-left"></i> Descripcion
                  </label>
                  <textarea
                    rows="3"
                    name="description"
                    value={this.props.formValues.description}
                    onChange={this.props.onChangeForm}
                    className={`cm-input cm-textarea ${
                      !this.props.errorValues &&
                      this.props.formValues.description === ""
                        ? "error-class"
                        : ""
                    }`}
                    placeholder="Descripcion del gasto"
                  />
                </div>
              </div>

              <div className="cm-form-grid-3">
                <div className="cm-form-group">
                  <input
                    type="hidden"
                    name="type_identification_id"
                    value={this.props.selectedOptionTypeIndentification.type_identification_id}
                  />
                  <label className="cm-label">
                    <i className="fa fa-tag"></i> Tipo
                  </label>
                  <Select
                    onChange={this.props.handleChangeAutocompleteReportExpenceOptionType}
                    options={this.props.report_expense_options_type}
                    autoFocus={false}
                    styles={selectStyles}
                    menuPortalTarget={document.body}
                    className={`${
                      !this.props.errorValues &&
                      this.props.formValues.type_identification_id === ""
                        ? "error-class"
                        : ""
                    }`}
                    value={this.props.selectedOptionTypeIndentification}
                    placeholder="Seleccionar tipo..."
                  />
                  <div className="cm-field-hint">
                    {this.props.selectedOptionTypeIndentification.label}
                  </div>
                </div>

                <div className="cm-form-group">
                  <input
                    type="hidden"
                    name="payment_type_id"
                    value={this.props.selectedOptionPaymentType.payment_type_id}
                  />
                  <label className="cm-label">
                    <i className="fa fa-credit-card"></i> Medio de pago
                  </label>
                  <Select
                    onChange={this.props.handleChangeAutocompleteReportExpenceOptionPaymentType}
                    options={this.props.report_expense_options_payment}
                    autoFocus={false}
                    styles={selectStyles}
                    menuPortalTarget={document.body}
                    className={`${
                      !this.props.errorValues &&
                      this.props.formValues.payment_type_id === ""
                        ? "error-class"
                        : ""
                    }`}
                    value={this.props.selectedOptionPaymentType}
                    placeholder="Seleccionar medio..."
                  />
                  <div className="cm-field-hint">
                    {this.props.selectedOptionPaymentType.label}
                  </div>
                </div>

                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-file-invoice"></i> Numero de factura
                  </label>
                  <input
                    type="text"
                    name="invoice_number"
                    value={this.props.formValues.invoice_number}
                    onChange={this.props.onChangeForm}
                    className={`cm-input ${
                      !this.props.errorValues &&
                      this.props.formValues.invoice_number === ""
                        ? "error-class"
                        : ""
                    }`}
                    placeholder="Numero de factura"
                  />
                </div>
              </div>

              <hr className="cm-divider" />

              <div className="cm-form-grid-3">
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-dollar-sign"></i> Valor del pago
                  </label>
                  <NumberFormat
                    name="invoice_value"
                    thousandSeparator={true}
                    prefix={"$"}
                    className={`cm-input ${
                      !this.props.errorValues &&
                      this.props.formValues.invoice_value === ""
                        ? "error-class"
                        : ""
                    }`}
                    value={this.props.formValues.invoice_value}
                    onChange={this.props.onChangeFormMoney}
                    placeholder="$0"
                  />
                </div>

                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-percent"></i> IVA
                  </label>
                  <NumberFormat
                    name="invoice_tax"
                    thousandSeparator={true}
                    prefix={"$"}
                    className={`cm-input ${
                      !this.props.errorValues &&
                      (!this.props.formValues.invoice_tax ||
                        this.props.formValues.invoice_tax !== "") &&
                      this.props.formValues.invoice_tax !== 0
                        ? "error-class"
                        : ""
                    }`}
                    value={this.props.formValues.invoice_tax}
                    onChange={this.props.onChangeFormMoney}
                    placeholder="$0"
                  />
                </div>

                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-calculator"></i> Total
                  </label>
                  <NumberFormat
                    thousandSeparator={true}
                    prefix={"$"}
                    className={`cm-input cm-input-disabled ${
                      !this.props.errorValues &&
                      this.props.formValues.invoice_total === ""
                        ? "error-class"
                        : ""
                    }`}
                    value={this.props.formValues.invoice_total}
                    disabled
                  />
                </div>
              </div>

              {!this.props.errorValues && (
                <div className="cm-error-message">
                  <i className="fa fa-exclamation-circle"></i>
                  Debes completar todos los campos requeridos
                </div>
              )}
        </form>

        <style>{`
          .cm-form-grid-1 {
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px;
            margin-bottom: 16px;
          }
          .cm-form-grid-2 {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin-bottom: 16px;
          }
          .cm-form-grid-3 {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-bottom: 16px;
          }
          @media (max-width: 768px) {
            .cm-form-grid-2,
            .cm-form-grid-3 {
              grid-template-columns: 1fr;
            }
          }
          .cm-form-group {
            display: flex;
            flex-direction: column;
          }
          .cm-label {
            font-size: 13px;
            font-weight: 400;
            color: #374151;
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .cm-label i {
            color: #6b7280;
            font-size: 12px;
          }
          .cm-input {
            width: 100%;
            padding: 10px 14px;
            border: 1px solid #e2e5ea;
            border-radius: 8px;
            font-size: 14px;
            background: #fcfcfd;
            transition: all 0.2s ease;
            box-sizing: border-box;
          }
          .cm-input:focus {
            outline: none;
            border-color: #f5a623;
            box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.15);
            background: #fff;
          }
          .cm-input:hover {
            border-color: #f5a623;
          }
          .cm-input::placeholder {
            color: #9ca3af;
          }
          .cm-textarea {
            resize: vertical;
            min-height: 80px;
          }
          .cm-input-disabled {
            background: #edf2f7;
            cursor: not-allowed;
            color: #6b7280;
          }
          .cm-field-hint {
            font-size: 12px;
            color: #6b7280;
            margin-top: 4px;
          }
          .cm-divider {
            border: none;
            border-top: 1px solid #e2e5ea;
            margin: 20px 0;
          }
          .cm-error-message {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 12px 16px;
            color: #dc2626;
            font-size: 14px;
            margin-top: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .error-class {
            border-color: #dc3545 !important;
            box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.15) !important;
          }
        `}</style>
      </CmModal>
    );
  }
}

export default FormCreate;
