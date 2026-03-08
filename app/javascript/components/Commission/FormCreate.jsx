import React, { Component } from 'react';
import { Modal, ModalBody } from 'reactstrap';
import NumberFormat from 'react-number-format';
import Select from "react-select";

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
  handleSubmit = e => {
    e.preventDefault();
  };

  render() {
    const availableHours = (this.props.formValues.hours_worked_code <= this.props.formValues.hours_cost
      ? this.props.formValues.hours_worked_code
      : this.props.formValues.hours_cost) - this.props.formValues.hours_paid;

    return (
      <React.Fragment>
        <Modal
          isOpen={this.props.modal}
          toggle={this.props.toggle}
          className="modal-dialog-centered modal-lg"
          backdrop={this.props.backdrop}
        >
          <div className="cm-modal-container">
            <div className="cm-modal-header">
              <div className="cm-modal-header-content">
                <div className="cm-modal-icon">
                  <i className="fa fa-percentage"></i>
                </div>
                <div>
                  <h2 className="cm-modal-title">{this.props.title}</h2>
                  <p className="cm-modal-subtitle">Complete los datos de la comision</p>
                </div>
              </div>
              <button type="button" className="cm-modal-close" onClick={() => this.props.toggle()}>
                <i className="fa fa-times"></i>
              </button>
            </div>

            <form onSubmit={this.handleSubmit}>
              <ModalBody className="cm-modal-body cm-modal-scroll">
                <div className="cm-form-grid-2">
                  <div className="cm-form-group">
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
                      className={"cm-input" + (!this.props.errorValues && this.props.formValues.start_date == "" ? " cm-input-error" : "")}
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
                      className={"cm-input" + (!this.props.errorValues && this.props.formValues.end_date == "" ? " cm-input-error" : "")}
                    />
                  </div>

                  <div className="cm-form-group">
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

                  <div className="cm-form-group">
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

                  <div className="cm-form-group">
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

                  {this.props.estados.change_value_hour && (
                    <div className="cm-form-group">
                      <label className="cm-label">
                        <i className="fa fa-dollar-sign"></i> Valor hora proyecto
                      </label>
                      <NumberFormat
                        name="value_hour"
                        thousandSeparator={true}
                        prefix={'$'}
                        className={"cm-input" + (this.props.errorValues == false && this.props.formValues.value_hour == "" ? " cm-input-error" : "")}
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
                      className={"cm-input" + (!this.props.errorValues && this.props.formValues.hours_worked == "" ? " cm-input-error" : "")}
                      disabled={this.props.formValues.customer_invoice_id == ""}
                    />
                    {this.props.state_msg_error && (
                      <span style={{ color: "#dc3545", fontSize: "12px", marginTop: "4px" }}>{this.props.msg_error}</span>
                    )}
                  </div>
                </div>

                <div style={{ background: "linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)", border: "1px solid #ffcc80", borderRadius: "10px", padding: "16px", marginTop: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255, 152, 0, 0.2)", fontSize: "14px", color: "#6d4c00" }}>
                    <span><i className="fa fa-hourglass-half" style={{ color: "#f5a623", marginRight: "8px" }}></i> Horas trabajadas en el centro de costos:</span>
                    <strong>{this.props.formValues.hours_worked_code}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255, 152, 0, 0.2)", fontSize: "14px", color: "#6d4c00" }}>
                    <span><i className="fa fa-calculator" style={{ color: "#f5a623", marginRight: "8px" }}></i> Horas cotizadas en el centro de costos:</span>
                    <strong>{this.props.formValues.hours_cost}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255, 152, 0, 0.2)", fontSize: "14px", color: "#6d4c00" }}>
                    <span><i className="fa fa-check-circle" style={{ color: "#f5a623", marginRight: "8px" }}></i> Horas comisiones creadas:</span>
                    <strong>{this.props.formValues.hours_paid}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px", marginTop: "8px", background: "rgba(245, 166, 35, 0.2)", borderRadius: "6px", fontSize: "14px", color: "#e65100" }}>
                    <span><i className="fa fa-clock" style={{ marginRight: "8px" }}></i> Horas disponibles:</span>
                    <strong style={{ fontSize: "16px" }}>{availableHours > 0 ? availableHours : 0}</strong>
                  </div>
                </div>

                <div className="cm-form-group" style={{ marginTop: "16px" }}>
                  <label className="cm-label">
                    <i className="fa fa-comment-alt"></i> Observaciones
                  </label>
                  <textarea
                    name="observation"
                    onChange={this.props.onChangeForm}
                    className="cm-input"
                    value={this.props.formValues.observation}
                    rows="4"
                    placeholder="Escribe tus observaciones aqui..."
                    style={{ resize: "vertical", minHeight: "80px" }}
                  />
                </div>

                {!this.props.errorValues && (
                  <div className="cm-alert cm-alert-error">
                    <i className="fa fa-exclamation-triangle"></i>
                    <span>Debes completar todos los campos requeridos</span>
                  </div>
                )}
              </ModalBody>

              <div className="cm-modal-footer">
                <button type="button" className="cm-btn cm-btn-cancel" onClick={() => this.props.toggle()}>
                  <i className="fa fa-times"></i> Cancelar
                </button>
                <button type="button" className="cm-btn cm-btn-submit" onClick={this.props.submitForm}>
                  <i className="fa fa-save"></i> {this.props.nameBnt}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      </React.Fragment>
    );
  }
}

export default FormCreate;
