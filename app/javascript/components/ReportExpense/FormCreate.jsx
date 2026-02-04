import React, { Component } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import NumberFormat from 'react-number-format';
import Select from "react-select";

const selectStyles = {
  control: (base, state) => ({
    ...base,
    background: "#f8f9fa",
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
      <React.Fragment>
        <Modal
          isOpen={this.props.modal}
          toggle={this.props.toggle}
          className="modal-dialog-centered modal-lg"
          backdrop={this.props.backdrop}
        >
          <ModalHeader className="cm-modal-header" toggle={this.props.toggle}>
            <i className="fa fa-receipt cm-header-icon"></i>
            {this.props.title}
          </ModalHeader>

          <form onSubmit={this.handleSubmit}>
            <ModalBody className="cm-modal-body">
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
            </ModalBody>

            <ModalFooter className="cm-modal-footer">
              <button
                type="button"
                className="cm-btn cm-btn-cancel"
                onClick={() => this.props.toggle()}
              >
                <i className="fa fa-times"></i> Cancelar
              </button>
              <button
                type="button"
                className="cm-btn cm-btn-submit"
                onClick={this.props.submitForm}
              >
                <i className="fa fa-save"></i> {this.props.nameBnt}
              </button>
            </ModalFooter>
          </form>
        </Modal>

        <style>{`
          .cm-modal-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 12px 12px 0 0;
            padding: 16px 24px;
            border-bottom: none;
          }
          .cm-modal-header .close {
            color: white;
            opacity: 0.8;
            text-shadow: none;
          }
          .cm-modal-header .close:hover {
            opacity: 1;
          }
          .cm-header-icon {
            margin-right: 10px;
            font-size: 1.2em;
          }
          .cm-modal-body {
            padding: 24px;
            background: #fff;
          }
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
            color: #4a5568;
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .cm-label i {
            color: #718096;
            font-size: 12px;
          }
          .cm-input {
            width: 100%;
            padding: 10px 14px;
            border: 1px solid #e2e5ea;
            border-radius: 8px;
            font-size: 14px;
            background: #f8f9fa;
            transition: all 0.2s ease;
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
            color: #a0aec0;
          }
          .cm-textarea {
            resize: vertical;
            min-height: 80px;
          }
          .cm-input-disabled {
            background: #edf2f7;
            cursor: not-allowed;
            color: #718096;
          }
          .cm-field-hint {
            font-size: 12px;
            color: #718096;
            margin-top: 4px;
          }
          .cm-divider {
            border: none;
            border-top: 1px solid #e2e5ea;
            margin: 20px 0;
          }
          .cm-error-message {
            background: #fff5f5;
            border: 1px solid #fc8181;
            border-radius: 8px;
            padding: 12px 16px;
            color: #c53030;
            font-size: 14px;
            margin-top: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .cm-modal-footer {
            background: #f8f9fa;
            border-top: 1px solid #e2e5ea;
            padding: 16px 24px;
            border-radius: 0 0 12px 12px;
            display: flex;
            justify-content: flex-end;
            gap: 12px;
          }
          .cm-btn {
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            border: none;
          }
          .cm-btn-cancel {
            background: #fff;
            color: #4a5568;
            border: 1px solid #e2e5ea;
          }
          .cm-btn-cancel:hover {
            background: #f7fafc;
            border-color: #cbd5e0;
          }
          .cm-btn-submit {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .cm-btn-submit:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          }
          .error-class {
            border-color: #fc8181 !important;
          }
        `}</style>
      </React.Fragment>
    );
  }
}

export default FormCreate;
