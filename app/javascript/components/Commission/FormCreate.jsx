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
  handleSubmit = e => {
    e.preventDefault();
  };

  render() {
    const availableHours = (this.props.formValues.hours_worked_code <= this.props.formValues.hours_cost
      ? this.props.formValues.hours_worked_code
      : this.props.formValues.hours_cost) - this.props.formValues.hours_paid;

    return (
      <Modal
        isOpen={this.props.modal}
        toggle={this.props.toggle}
        className="modal-dialog-centered modal-lg"
        backdrop={this.props.backdrop}
      >
        <form onSubmit={this.handleSubmit}>
          <ModalHeader className="cm-modal-header" toggle={this.props.toggle}>
            <i className="fa fa-percentage cm-header-icon"></i>
            {this.props.title}
          </ModalHeader>

          <ModalBody className="cm-modal-body">
            <div className="cm-form-grid-2">
              <div className="cm-form-group">
                <input
                  type="hidden"
                  name="user_invoice_id"
                  value={this.props.selectedOptionUser.user_invoice_id}
                />
                <label className="cm-label">
                  <i className="fa fa-user"></i> Responsable
                </label>
                <Select
                  onChange={this.props.handleChangeAutocompleteUser}
                  options={this.props.users}
                  autoFocus={false}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                  className={!this.props.errorValues && this.props.formValues.user_invoice_id == "" ? "cm-select-error" : ""}
                  value={this.props.selectedOptionUser}
                  isDisabled={!this.props.estados.change_responsible}
                  placeholder="Seleccionar..."
                />
              </div>

              <div className="cm-form-group">
                <label className="cm-label">
                  <i className="fa fa-calendar-alt"></i> Fecha desde
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={this.props.formValues.start_date}
                  onChange={this.props.onChangeForm}
                  className={`cm-input ${!this.props.errorValues && this.props.formValues.start_date == "" ? "cm-input-error" : ""}`}
                />
              </div>

              <div className="cm-form-group">
                <label className="cm-label">
                  <i className="fa fa-calendar-check"></i> Fecha hasta
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={this.props.formValues.end_date}
                  onChange={this.props.onChangeForm}
                  className={`cm-input ${!this.props.errorValues && this.props.formValues.end_date == "" ? "cm-input-error" : ""}`}
                />
              </div>

              {(this.props.formValues.start_date && this.props.formValues.end_date || true) && (
                <div className="cm-form-group">
                  <input
                    type="hidden"
                    name="cost_center_id"
                    value={this.props.selectedOptionCostCenter.cost_center_id}
                  />
                  <label className="cm-label">
                    <i className="fa fa-building"></i> Centro de costos
                  </label>
                  <Select
                    onChange={this.props.handleChangeAutocompleteCostCenter}
                    options={this.props.costCenterOptions || this.props.cost_centers}
                    onInputChange={this.props.onCostCenterSearch}
                    isLoading={this.props.costCenterLoading}
                    autoFocus={false}
                    styles={selectStyles}
                    menuPortalTarget={document.body}
                    value={this.props.selectedOptionCostCenter}
                    placeholder="Buscar centro de costos..."
                    noOptionsMessage={() => "Escribe para buscar..."}
                    loadingMessage={() => "Buscando..."}
                  />
                </div>
              )}

              {(this.props.customer_reports.length >= 1 || true) && (
                <div className="cm-form-group">
                  <input
                    type="hidden"
                    name="customer_report_id"
                    value={this.props.selectedOptionCustomerReport.customer_report_id}
                  />
                  <label className="cm-label">
                    <i className="fa fa-file-alt"></i> Reporte de cliente
                  </label>
                  <Select
                    onChange={this.props.handleChangeAutocompleteCustomerReport}
                    options={this.props.customer_reports}
                    autoFocus={false}
                    styles={selectStyles}
                    menuPortalTarget={document.body}
                    className={!this.props.errorValues && this.props.formValues.customer_report_id == "" ? "cm-select-error" : ""}
                    value={this.props.selectedOptionCustomerReport}
                    placeholder="Seleccionar..."
                  />
                </div>
              )}

              {(this.props.customer_invoices.length >= 1 || true) && (
                <div className="cm-form-group">
                  <input
                    type="hidden"
                    name="customer_invoice_id"
                    value={this.props.selectedOptionCustomerInvoice.customer_invoice_id}
                  />
                  <label className="cm-label">
                    <i className="fa fa-file-invoice-dollar"></i> Facturas
                  </label>
                  <Select
                    onChange={this.props.handleChangeAutocompleteCustomerInvoice}
                    options={this.props.customer_invoices}
                    autoFocus={false}
                    styles={selectStyles}
                    menuPortalTarget={document.body}
                    className={!this.props.errorValues && this.props.formValues.customer_invoice_id == "" ? "cm-select-error" : ""}
                    value={this.props.selectedOptionCustomerInvoice}
                    placeholder="Seleccionar..."
                  />
                </div>
              )}

              {this.props.estados.change_value_hour && (
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-dollar-sign"></i> Valor hora proyecto
                  </label>
                  <NumberFormat
                    name="value_hour"
                    thousandSeparator={true}
                    prefix={'$'}
                    className={`cm-input ${this.props.errorValues == false && this.props.formValues.value_hour == "" ? "cm-input-error" : ""}`}
                    value={this.props.formValues.value_hour}
                    onChange={this.props.onChangeForm}
                  />
                </div>
              )}

              <div className="cm-form-group">
                <label className="cm-label">
                  <i className="fa fa-clock"></i> Horas por pagar
                </label>
                <input
                  type="number"
                  name="hours_worked"
                  value={this.props.formValues.hours_worked}
                  onChange={this.props.onChangeForm}
                  className={`cm-input ${!this.props.errorValues && this.props.formValues.hours_worked == "" ? "cm-input-error" : ""}`}
                  disabled={this.props.formValues.customer_invoice_id == ""}
                />
                {this.props.state_msg_error && (
                  <span className="cm-error-message">{this.props.msg_error}</span>
                )}
              </div>
            </div>

            <div className="cm-info-card">
              <div className="cm-info-row">
                <span className="cm-info-label">
                  <i className="fa fa-hourglass-half"></i> Horas trabajadas en el centro de costos:
                </span>
                <span className="cm-info-value">{this.props.formValues.hours_worked_code}</span>
              </div>
              <div className="cm-info-row">
                <span className="cm-info-label">
                  <i className="fa fa-calculator"></i> Horas cotizadas en el centro de costos:
                </span>
                <span className="cm-info-value">{this.props.formValues.hours_cost}</span>
              </div>
              <div className="cm-info-row">
                <span className="cm-info-label">
                  <i className="fa fa-check-circle"></i> Horas comisiones creadas:
                </span>
                <span className="cm-info-value">{this.props.formValues.hours_paid}</span>
              </div>
              <div className="cm-info-row cm-info-highlight">
                <span className="cm-info-label">
                  <i className="fa fa-clock"></i> Horas disponibles:
                </span>
                <span className="cm-info-value">{availableHours > 0 ? availableHours : 0}</span>
              </div>
            </div>

            <div className="cm-form-group cm-form-group-full">
              <label className="cm-label">
                <i className="fa fa-comment-alt"></i> Observaciones
              </label>
              <textarea
                name="observation"
                onChange={this.props.onChangeForm}
                className="cm-input cm-textarea"
                value={this.props.formValues.observation}
                rows="5"
                placeholder="Escribe tus observaciones aqui..."
              />
            </div>

            {!this.props.errorValues && (
              <div className="cm-alert cm-alert-error">
                <i className="fa fa-exclamation-triangle"></i>
                <span>Debes completar todos los campos requeridos</span>
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

        <style>{`
          .cm-modal-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff;
            border-radius: 8px 8px 0 0;
            padding: 1rem 1.5rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }
          .cm-modal-header .close {
            color: #fff;
            opacity: 0.8;
            text-shadow: none;
          }
          .cm-modal-header .close:hover {
            opacity: 1;
          }
          .cm-header-icon {
            font-size: 1.25rem;
            margin-right: 0.5rem;
          }
          .cm-modal-body {
            padding: 1.5rem;
            background: #fafbfc;
          }
          .cm-form-grid-2 {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }
          @media (max-width: 768px) {
            .cm-form-grid-2 {
              grid-template-columns: 1fr;
            }
          }
          .cm-form-group {
            display: flex;
            flex-direction: column;
            gap: 0.375rem;
          }
          .cm-form-group-full {
            grid-column: 1 / -1;
            margin-top: 1rem;
          }
          .cm-label {
            font-size: 0.875rem;
            font-weight: 400;
            color: #495057;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          .cm-label i {
            color: #667eea;
            font-size: 0.8rem;
            width: 16px;
          }
          .cm-input {
            background: #f8f9fa;
            border: 1px solid #e2e5ea;
            border-radius: 8px;
            padding: 0.625rem 0.875rem;
            font-size: 14px;
            transition: all 0.2s ease;
            width: 100%;
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
          .cm-input:disabled {
            background: #e9ecef;
            cursor: not-allowed;
            opacity: 0.7;
          }
          .cm-input-error {
            border-color: #dc3545 !important;
            box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.15) !important;
          }
          .cm-select-error .css-yk16xz-control,
          .cm-select-error .css-1pahdxg-control {
            border-color: #dc3545 !important;
            box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.15) !important;
          }
          .cm-textarea {
            resize: vertical;
            min-height: 100px;
          }
          .cm-error-message {
            color: #dc3545;
            font-size: 0.8rem;
            margin-top: 0.25rem;
          }
          .cm-info-card {
            background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
            border: 1px solid #ffcc80;
            border-radius: 10px;
            padding: 1rem;
            margin-top: 1.5rem;
            grid-column: 1 / -1;
          }
          .cm-info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 0;
            border-bottom: 1px solid rgba(255, 152, 0, 0.2);
          }
          .cm-info-row:last-child {
            border-bottom: none;
          }
          .cm-info-label {
            color: #6d4c00;
            font-size: 0.875rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          .cm-info-label i {
            color: #f5a623;
            width: 16px;
          }
          .cm-info-value {
            font-weight: 700;
            color: #6d4c00;
            font-size: 1rem;
          }
          .cm-info-highlight {
            background: rgba(245, 166, 35, 0.2);
            border-radius: 6px;
            padding: 0.75rem !important;
            margin-top: 0.5rem;
          }
          .cm-info-highlight .cm-info-value {
            color: #e65100;
            font-size: 1.125rem;
          }
          .cm-alert {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1rem;
            border-radius: 8px;
            margin-top: 1rem;
            grid-column: 1 / -1;
          }
          .cm-alert-error {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #dc2626;
          }
          .cm-alert i {
            font-size: 1.125rem;
          }
          .cm-modal-footer {
            background: #f8f9fa;
            border-top: 1px solid #e9ecef;
            padding: 1rem 1.5rem;
            display: flex;
            justify-content: flex-end;
            gap: 0.75rem;
            border-radius: 0 0 8px 8px;
          }
          .cm-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.625rem 1.25rem;
            border-radius: 8px;
            font-size: 0.875rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
          }
          .cm-btn-cancel {
            background: #fff;
            color: #6b7280;
            border: 1px solid #d1d5db;
          }
          .cm-btn-cancel:hover {
            background: #f3f4f6;
            border-color: #9ca3af;
          }
          .cm-btn-submit {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff;
            box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
          }
          .cm-btn-submit:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4);
          }
          .cm-btn-submit:active {
            transform: translateY(0);
          }
        `}</style>
      </Modal>
    );
  }
}

export default FormCreate;
