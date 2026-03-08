import React from "react";
import { Modal } from "reactstrap";
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
              <i className="fas fa-coins" />
            </div>
            <div>
              <h2 className="cm-modal-title">{props.title}</h2>
              <p className="cm-modal-subtitle">Gestionar opciones de gastos</p>
            </div>
          </div>
          <button type="button" className="cm-modal-close" onClick={props.toggle}>
            <i className="fas fa-times" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="cm-modal-body">
            <div className="cm-form-grid-2">
              <div className="cm-form-group">
                <label className="cm-label">
                  <i className="fas fa-tag" /> Nombre
                  <span className="cm-required">*</span>
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
                  <i className="fas fa-folder" /> Tipo
                  <span className="cm-required">*</span>
                </label>
                <Select
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                  options={categoryOptions}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                  placeholder="Selecciona un tipo"
                />
              </div>
            </div>

            {!props.errorValues && (
              <div className="cm-alert cm-alert-danger">
                <i className="fas fa-exclamation-circle" />
                <span>Debes completar todos los campos requeridos</span>
              </div>
            )}
          </div>

          <div className="cm-modal-footer">
            <button type="button" className="cm-btn cm-btn-cancel" onClick={props.toggle}>
              <i className="fas fa-times" /> Cerrar
            </button>
            <button type="button" className="cm-btn cm-btn-submit" onClick={props.submitForm}>
              <i className="fas fa-save" /> {props.nameBnt}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default FormCreate;
