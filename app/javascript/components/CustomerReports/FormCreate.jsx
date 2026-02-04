import React from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "reactstrap";
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
  multiValue: (base) => ({
    ...base,
    backgroundColor: "#fff3e0",
    borderRadius: "4px",
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: "#e09520",
    fontWeight: 500,
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: "#e09520",
    "&:hover": { backgroundColor: "#f5a623", color: "#fff" },
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

class FormCreate extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    const { props } = this;
    const hasError = (field) => props.errorValues === false && !props.formValues[field];

    return (
      <Modal
        returnFocusAfterClose={true}
        isOpen={props.modal}
        className="modal-lg modal-dialog-centered"
        toggle={props.toggle}
        backdrop={props.backdrop}
      >
        <div className="cm-modal-container">
          <div className="cm-modal-header">
            <div className="cm-modal-header-content">
              <div className="cm-modal-icon">
                <i className="fas fa-file-alt"></i>
              </div>
              <div className="cm-modal-header-text">
                <h2 className="cm-modal-title">{props.titulo}</h2>
                <p className="cm-modal-subtitle">Complete los campos para gestionar el reporte de cliente</p>
              </div>
            </div>
            <button type="button" className="cm-modal-close" onClick={props.toggle}>
              <i className="fas fa-times"></i>
            </button>
          </div>

          <form onSubmit={props.FormSubmit}>
            <ModalBody className="cm-modal-body">
              <div className="cm-form-section">
                <div className="cm-form-grid-2">
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fas fa-building"></i> Cliente <span className="cm-required">*</span>
                    </label>
                    <Select
                      onChange={props.onChangeAutocomplete}
                      options={props.clientes}
                      value={props.formAutocomplete}
                      placeholder="Seleccione un cliente..."
                      styles={selectStyles}
                      menuPortalTarget={document.body}
                      className={hasError("customer_id") ? "cm-select-error" : ""}
                    />
                  </div>

                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fas fa-map-marker-alt"></i> Centro de costo <span className="cm-required">*</span>
                      <small className="cm-label-hint">(escribe al menos 2 letras)</small>
                    </label>
                    <Select
                      onChange={props.onChangeAutocompleteCentro}
                      options={props.costCenterOptions}
                      value={props.formAutocompleteCentro}
                      onInputChange={props.onCostCenterSearch}
                      isLoading={props.costCenterLoading}
                      placeholder="Centro de costos"
                      isDisabled={!props.formValues.customer_id}
                      noOptionsMessage={() => "Escriba para buscar"}
                      styles={selectStyles}
                      menuPortalTarget={document.body}
                      className={hasError("cost_center_id") ? "cm-select-error" : ""}
                    />
                  </div>
                </div>

                <div className="cm-form-grid-2">
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fas fa-user-check"></i> Aprueba el Reporte <span className="cm-required">*</span>
                    </label>
                    <Select
                      onChange={props.onChangeAutocompleteContact}
                      options={props.contacts}
                      value={props.formAutocompleteContact}
                      placeholder="Seleccione contacto..."
                      styles={selectStyles}
                      menuPortalTarget={document.body}
                      className={hasError("contact_id") ? "cm-select-error" : ""}
                    />
                  </div>

                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fas fa-calendar-alt"></i> Fecha del reporte <span className="cm-required">*</span>
                    </label>
                    <input
                      name="report_date"
                      type="date"
                      className={`cm-input ${hasError("report_date") ? "cm-input-error" : ""}`}
                      value={props.formValues.report_date}
                      onChange={props.onChangeForm}
                    />
                  </div>
                </div>
              </div>

              <div className="cm-form-section">
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fas fa-file-invoice"></i> Reportes <span className="cm-required">*</span>
                  </label>
                  <Select
                    onChange={props.onChangeAutocompleteReports}
                    isMulti
                    closeMenuOnSelect={false}
                    name="report_ids"
                    defaultValue={props.editValuesReport}
                    options={props.reports}
                    placeholder="Seleccione los reportes..."
                    styles={selectStyles}
                    menuPortalTarget={document.body}
                    noOptionsMessage={() => "Seleccione primero un centro de costo"}
                  />
                </div>
              </div>

              <div className="cm-form-section">
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fas fa-pencil-alt"></i> Descripción / Observaciones
                  </label>
                  <textarea
                    name="description"
                    rows="4"
                    className={`cm-textarea ${hasError("description") ? "cm-input-error" : ""}`}
                    value={props.formValues.description}
                    onChange={props.onChangeForm}
                    placeholder="Escriba las observaciones del reporte..."
                  />
                </div>
              </div>

              {props.errorValues === false && (
                <div className="cm-alert cm-alert-error">
                  <i className="fas fa-exclamation-circle"></i>
                  <span>Debe completar todos los campos requeridos</span>
                </div>
              )}
            </ModalBody>

            <div className="cm-modal-footer">
              <button type="button" className="cm-btn cm-btn-outline" onClick={props.toggle}>
                <i className="fas fa-times"></i> Cancelar
              </button>
              <button type="button" className="cm-btn cm-btn-accent" onClick={props.submit}>
                <i className={props.nameSubmit === "Crear" ? "fas fa-plus" : "fas fa-save"}></i> {props.nameSubmit}
              </button>
            </div>
          </form>
        </div>

        <style>{`
          .cm-modal-container {
            background: #fff;
            border-radius: 16px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            max-height: 90vh;
          }

          .cm-modal-header {
            background: #f8f9fa;
            padding: 20px 32px;
            border-bottom: 1px solid #e9ecef;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-shrink: 0;
          }

          .cm-modal-header-content {
            display: flex;
            align-items: center;
            gap: 16px;
          }

          .cm-modal-header-text {
            text-align: left;
          }

          .cm-modal-icon {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #f5a623 0%, #f7b731 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            color: #fff;
            box-shadow: 0 4px 12px rgba(245, 166, 35, 0.3);
            flex-shrink: 0;
          }

          .cm-modal-title {
            font-family: 'Poppins', sans-serif;
            font-size: 18px;
            font-weight: 600;
            color: #333;
            margin: 0 0 2px 0;
          }

          .cm-modal-subtitle {
            font-size: 12px;
            color: #6c757d;
            margin: 0;
          }

          .cm-modal-close {
            width: 32px;
            height: 32px;
            border: none;
            background: #e9ecef;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #6c757d;
            transition: all 0.2s;
            flex-shrink: 0;
          }

          .cm-modal-close:hover {
            background: #dc3545;
            color: #fff;
          }

          .cm-modal-body {
            padding: 24px 32px !important;
            flex: 1;
            overflow-y: auto;
          }

          .cm-modal-body::-webkit-scrollbar {
            width: 8px;
          }

          .cm-modal-body::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
          }

          .cm-modal-body::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 4px;
          }

          .cm-modal-body::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
          }

          .cm-form-section {
            margin-bottom: 8px;
          }

          .cm-form-section:last-of-type {
            margin-bottom: 0;
          }

          .cm-form-grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }

          .cm-form-group {
            margin-bottom: 16px;
          }

          .cm-label {
            display: block;
            font-family: 'Poppins', sans-serif;
            font-size: 13px;
            font-weight: 400;
            color: #495057;
            margin-bottom: 6px;
          }

          .cm-label i {
            color: #6c757d;
            margin-right: 6px;
            width: 14px;
          }

          .cm-label-hint {
            font-size: 11px;
            font-weight: 400;
            color: #9ca3af;
            margin-left: 6px;
          }

          .cm-required {
            color: #dc3545;
            font-weight: 600;
          }

          .cm-input,
          .cm-textarea {
            width: 100%;
            padding: 10px 14px;
            font-family: 'Poppins', sans-serif;
            font-size: 14px;
            color: #333;
            background: #f8f9fa;
            border: 1px solid #e2e5ea;
            border-radius: 8px;
            transition: all 0.2s ease;
            box-sizing: border-box;
          }

          .cm-input:focus,
          .cm-textarea:focus {
            outline: none;
            background: #fff;
            border-color: #f5a623;
            box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.15);
          }

          .cm-textarea {
            resize: vertical;
            min-height: 100px;
          }

          .cm-input-error {
            border-color: #dc3545 !important;
            background: #fff5f5 !important;
          }

          .cm-select-error .css-yk16xz-control,
          .cm-select-error .css-1pahdxg-control {
            border-color: #dc3545 !important;
            background: #fff5f5 !important;
          }

          .cm-alert {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            margin-top: 16px;
          }

          .cm-alert-error {
            background: #fee2e2;
            color: #dc2626;
            border: 1px solid #fecaca;
          }

          .cm-alert i {
            font-size: 16px;
          }

          .cm-modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding: 16px 32px;
            background: #f8f9fa;
            border-top: 1px solid #e9ecef;
            flex-shrink: 0;
          }

          .cm-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            font-family: 'Poppins', sans-serif;
            font-size: 14px;
            font-weight: 500;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
          }

          .cm-btn-outline {
            background: #fff;
            color: #6c757d;
            border: 1px solid #dee2e6;
          }

          .cm-btn-outline:hover {
            background: #f8f9fa;
            border-color: #adb5bd;
          }

          .cm-btn-accent {
            background: linear-gradient(135deg, #f5a623 0%, #f7b731 100%);
            color: #fff;
          }

          .cm-btn-accent:hover {
            background: linear-gradient(135deg, #e09520 0%, #e5a82a 100%);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(245, 166, 35, 0.35);
          }

          @media (max-width: 768px) {
            .cm-form-grid-2 {
              grid-template-columns: 1fr;
            }

            .cm-modal-header,
            .cm-modal-body,
            .cm-modal-footer {
              padding-left: 20px !important;
              padding-right: 20px !important;
            }
          }
        `}</style>
      </Modal>
    );
  }
}

export default FormCreate;
