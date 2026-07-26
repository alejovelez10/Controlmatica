import React from "react";
import { Modal, ModalBody } from "reactstrap";
import Select from "react-select";
import { CirclePicker } from "react-color";

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

const FormCreate = (props) => {
  const handleSubmit = (e) => {
    e.preventDefault();
  };

  const hasError = (field) => !props.errorValues && props.formValues[field] === "";

  return (
    <Modal
      isOpen={props.modal}
      toggle={props.toggle}
      className="modal-lg modal-dialog-centered"
      backdrop={props.backdrop}
    >
      <div className="cm-modal-container">
        <div className="cm-modal-header">
          <div className="cm-modal-header-content">
            <div className="cm-modal-icon">
              <i className="fas fa-clipboard-list"></i>
            </div>
            <div className="cm-modal-header-text">
              <h2 className="cm-modal-title">{props.title}</h2>
              <p className="cm-modal-subtitle">Gestionar turnos y horarios del personal</p>
            </div>
          </div>
          <button type="button" className="cm-modal-close" onClick={props.toggle}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {props.errors.length > 0 && (
          <div className="cm-alert cm-alert-warning" style={{ margin: "16px 32px 0" }}>
            <div style={{ flex: 1 }}>
              <div className="cm-alert-title">
                <i className="fas fa-exclamation-triangle"></i>
                No se pudieron crear los registros ya que los siguientes usuarios tienen conflictos:
              </div>
              <ul className="cm-alert-list">
                {props.errors.map((value, index) => (
                  <li key={index}>{value}</li>
                ))}
              </ul>
              <div className="cm-checkbox-wrapper">
                <input
                  type="checkbox"
                  id="forceSwitch"
                  checked={props.formValues.force_save}
                  onChange={(e) =>
                    props.onChangeForm({ target: { name: "force_save", value: !props.formValues.force_save } })
                  }
                />
                <label htmlFor="forceSwitch">Forzar el guardado</label>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <ModalBody className="cm-modal-body">
            <div className="cm-form-grid-2">
              <div className="cm-form-group">
                <label className="cm-label">
                  <i className="fas fa-calendar-alt"></i> Fecha inicial <span className="cm-required">*</span>
                </label>
                <input
                  type="datetime-local"
                  name="start_date"
                  value={props.formValues.start_date}
                  onChange={props.onChangeForm}
                  className={`cm-input ${hasError("start_date") ? "cm-input-error" : ""}`}
                />
              </div>

              <div className="cm-form-group">
                <label className="cm-label">
                  <i className="fas fa-calendar-check"></i> Fecha final <span className="cm-required">*</span>
                </label>
                <input
                  type="datetime-local"
                  name="end_date"
                  value={props.formValues.end_date}
                  onChange={props.onChangeForm}
                  className={`cm-input ${hasError("end_date") ? "cm-input-error" : ""}`}
                />
              </div>

              <div className="cm-form-group">
                <label className="cm-label">
                  <i className="fas fa-map-marker-alt"></i> Centro de costo <span className="cm-required">*</span>
                  {!props.fixedCostCenter && <small className="cm-label-hint">(escribe al menos 2 letras)</small>}
                </label>
                <input
                  type="hidden"
                  name="cost_center_id"
                  value={props.selectedOptionCostCenter.value || props.selectedOptionCostCenter.cost_center_id}
                />
                {props.fixedCostCenter ? (
                  <input
                    type="text"
                    className="cm-input"
                    value={props.fixedCostCenter.label}
                    disabled
                    style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
                  />
                ) : (
                  <Select
                    onChange={props.handleChangeAutocompleteCostCenter}
                    options={props.cost_centers}
                    value={props.selectedOptionCostCenter}
                    onInputChange={props.onCostCenterSearch}
                    isLoading={props.costCenterLoading}
                    placeholder="Centro de costos"
                    noOptionsMessage={() => "Escriba para buscar"}
                    styles={selectStyles}
                    menuPortalTarget={document.body}
                    className={hasError("cost_center_id") ? "cm-select-error" : ""}
                  />
                )}
              </div>

              <div className="cm-form-group">
                <label className="cm-label">
                  <i className="fas fa-heading"></i> Asunto
                </label>
                <input
                  type="text"
                  name="subject"
                  value={props.formValues.subject}
                  onChange={props.onChangeForm}
                  className="cm-input"
                  placeholder="Asunto del turno"
                />
              </div>

              {!props.modeEdit && (
                <div className="cm-form-group cm-form-full-width">
                  <label className="cm-label">
                    <i className="fas fa-users"></i> Usuarios que se les va a crear este turno
                  </label>
                  <input
                    type="hidden"
                    name="user_ids"
                    value={props.selectedOptionMulti.user_ids}
                  />
                  <Select
                    onChange={props.handleChangeAutocompleteMulti}
                    options={props.users}
                    isMulti
                    closeMenuOnSelect={false}
                    placeholder="Seleccione usuarios..."
                    name="user_ids"
                    defaultValue={props.defaultValues}
                    styles={selectStyles}
                    menuPortalTarget={document.body}
                  />
                </div>
              )}

              {props.modeEdit && (
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fas fa-user-tie"></i> Usuario responsable <span className="cm-required">*</span>
                  </label>
                  <input
                    type="hidden"
                    name="user_responsible_id"
                    value={props.selectedOptionUser.user_responsible_id}
                  />
                  <Select
                    onChange={props.handleChangeAutocompleteUser}
                    options={props.users}
                    value={props.selectedOptionUser}
                    placeholder="Seleccione responsable..."
                    styles={selectStyles}
                    menuPortalTarget={document.body}
                    className={hasError("user_responsible_id") ? "cm-select-error" : ""}
                  />
                </div>
              )}

              <div className="cm-form-group cm-form-full-width">
                <label className="cm-label">
                  <i className="fas fa-align-left"></i> Descripcion
                </label>
                <textarea
                  rows="5"
                  className="cm-textarea"
                  name="description"
                  value={props.formValues.description}
                  onChange={props.onChangeForm}
                  placeholder="Descripcion del turno..."
                />
              </div>

              {props.str_label && (
                <div className="cm-form-group cm-form-full-width">
                  <label className="cm-label">
                    <i className="fas fa-palette"></i> Color de etiqueta
                  </label>
                  <div className="cm-color-section">
                    <span
                      className="cm-label-preview"
                      style={{ backgroundColor: props.formValues.color }}
                    >
                      {props.str_label}
                    </span>
                    <div className="cm-color-picker">
                      <CirclePicker
                        color={props.formValues.color}
                        onChange={(color) =>
                          props.onChangeForm({ target: { name: "color", value: color.hex } })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {props.microsoft_auth.is_user_logged_in && (
                <div className="cm-form-group cm-form-full-width">
                  <div className="cm-microsoft-card">
                    <img
                      className="cm-microsoft-avatar"
                      alt="avatar"
                      src={props.microsoft_auth.user_avatar}
                    />
                    <div className="cm-microsoft-info">
                      <p><strong>Nombre:</strong> {props.microsoft_auth.username}</p>
                      <p><strong>Email:</strong> {props.microsoft_auth.user_email}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ModalBody>

          <div className="cm-modal-footer">
            <button type="button" className="cm-btn cm-btn-outline" onClick={props.toggle}>
              <i className="fas fa-times"></i> Cerrar
            </button>
            {props.modeEdit && (
              <button
                type="button"
                className="cm-btn cm-btn-danger"
                onClick={() => props.destroy(props.shift_id)}
              >
                <i className="fas fa-trash-alt"></i> Eliminar
              </button>
            )}
            {!props.modeEdit && (
              <button type="button" className="cm-btn cm-btn-accent" onClick={props.submitForm}>
                <i className="fas fa-save"></i> {props.nameBnt}
              </button>
            )}
          </div>
        </form>
      </div>

      <style>{`
        .cm-modal-container {
          background: #fff;
          border-radius: 16px;
          overflow: hidden;
        }

        .cm-modal-header {
          background: #fcfcfd;
          padding: 20px 32px;
          border-bottom: 1px solid #e9ecef;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
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
        }

        .cm-form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .cm-form-full-width {
          grid-column: 1 / -1;
        }

        .cm-form-group {
          margin-bottom: 0;
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
          background: #fcfcfd;
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
          align-items: flex-start;
          gap: 10px;
          padding: 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
        }

        .cm-alert-warning {
          background: #fef3cd;
          color: #856404;
          border: 1px solid #ffc107;
        }

        .cm-alert-title {
          font-weight: 600;
          margin-bottom: 8px;
        }

        .cm-alert-title i {
          margin-right: 8px;
        }

        .cm-alert-list {
          margin: 0 0 12px 20px;
          padding: 0;
          font-weight: 400;
        }

        .cm-alert-list li {
          margin-bottom: 4px;
        }

        .cm-checkbox-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .cm-checkbox-wrapper input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .cm-checkbox-wrapper label {
          font-weight: 600;
          cursor: pointer;
          margin: 0;
        }

        .cm-color-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .cm-label-preview {
          display: inline-block;
          padding: 6px 16px;
          border-radius: 20px;
          color: #fff;
          font-weight: 500;
          font-size: 13px;
          width: fit-content;
        }

        .cm-color-picker {
          margin-top: 8px;
        }

        .cm-microsoft-card {
          display: flex;
          align-items: center;
          gap: 16px;
          background: #fcfcfd;
          border: 1px solid #e9ecef;
          border-radius: 12px;
          padding: 16px;
        }

        .cm-microsoft-avatar {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #e9ecef;
        }

        .cm-microsoft-info p {
          margin: 0 0 4px 0;
          font-size: 14px;
          color: #495057;
        }

        .cm-microsoft-info p:last-child {
          margin-bottom: 0;
        }

        .cm-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 32px;
          background: #fcfcfd;
          border-top: 1px solid #e9ecef;
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
          background: #fcfcfd;
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

        .cm-btn-danger {
          background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
          color: #fff;
        }

        .cm-btn-danger:hover {
          background: linear-gradient(135deg, #c82333 0%, #bd2130 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(220, 53, 69, 0.35);
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
};

export default FormCreate;
