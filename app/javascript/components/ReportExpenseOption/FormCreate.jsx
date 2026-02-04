import React from "react";
import { Modal, ModalBody } from "reactstrap";
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

const categoryOptions = [
  { value: "", label: "Selecciona un tipo" },
  { value: "Tipo", label: "Tipo" },
  { value: "Medio de pago", label: "Medio de pago" },
];

const FormCreate = (props) => {
  const handleSubmit = (e) => {
    e.preventDefault();
  };

  const hasError = (field) => !props.errorValues && props.formValues[field] === "";

  const selectedCategory = categoryOptions.find(
    (opt) => opt.value === props.formValues.category
  ) || categoryOptions[0];

  const handleCategoryChange = (selected) => {
    props.onChangeForm({
      target: { name: "category", value: selected ? selected.value : "" },
    });
  };

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
              <i className="fas fa-list-alt"></i>
            </div>
            <div className="cm-modal-header-text">
              <h2 className="cm-modal-title">{props.title}</h2>
              <p className="cm-modal-subtitle">Gestionar opciones de gastos</p>
            </div>
          </div>
          <button type="button" className="cm-modal-close" onClick={props.toggle}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <ModalBody className="cm-modal-body">
            <div className="cm-form-grid-2">
              <div className="cm-form-group">
                <label className="cm-label">
                  <i className="fas fa-tag"></i> Nombre <span className="cm-required">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={props.formValues.name}
                  onChange={props.onChangeForm}
                  className={`cm-input ${hasError("name") ? "cm-input-error" : ""}`}
                  placeholder="Nombre del tipo"
                />
              </div>

              <div className="cm-form-group">
                <label className="cm-label">
                  <i className="fas fa-folder"></i> Tipo <span className="cm-required">*</span>
                </label>
                <Select
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                  options={categoryOptions}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                  placeholder="Selecciona un tipo"
                  className={hasError("category") ? "cm-select-error" : ""}
                />
              </div>
            </div>

            {!props.errorValues && (
              <div className="cm-alert cm-alert-error" style={{ marginTop: "16px" }}>
                <i className="fas fa-exclamation-circle"></i>
                <span>Debes completar todos los campos requeridos</span>
              </div>
            )}
          </ModalBody>

          <div className="cm-modal-footer">
            <button type="button" className="cm-btn cm-btn-outline" onClick={props.toggle}>
              <i className="fas fa-times"></i> Cerrar
            </button>
            <button type="button" className="cm-btn cm-btn-accent" onClick={props.submitForm}>
              <i className="fas fa-save"></i> {props.nameBnt}
            </button>
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
          background: #f8f9fa;
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

        .cm-required {
          color: #dc3545;
          font-weight: 600;
        }

        .cm-input {
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

        .cm-input:focus {
          outline: none;
          background: #fff;
          border-color: #f5a623;
          box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.15);
        }

        .cm-input-error {
          border-color: #dc3545 !important;
          background: #fff5f5 !important;
        }

        .cm-select-error .css-yk16xz-control,
        .cm-select-error .css-1pahdxg-control,
        .cm-select-error > div:first-child {
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
        }

        .cm-alert-error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .cm-alert-error i {
          font-size: 16px;
        }

        .cm-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 32px;
          background: #f8f9fa;
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
};

export default FormCreate;
