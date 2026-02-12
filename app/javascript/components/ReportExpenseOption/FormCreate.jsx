import React from "react";
import { Modal, ModalBody } from "reactstrap";
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

  // Inline styles
  const styles = {
    modalContainer: {
      background: "#fff",
      borderRadius: "16px",
      overflow: "hidden",
    },
    header: {
      background: "#fcfcfd",
      padding: "20px 32px",
      borderBottom: "1px solid #e9ecef",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerContent: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
    },
    iconCircle: {
      width: "48px",
      height: "48px",
      background: "linear-gradient(135deg, #f5a623 0%, #f7b731 100%)",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 4px 12px rgba(245, 166, 35, 0.3)",
      flexShrink: 0,
    },
    iconStyle: {
      color: "#fff",
      fontSize: "20px",
    },
    headerText: {
      textAlign: "left",
    },
    title: {
      fontFamily: "'Poppins', sans-serif",
      fontSize: "18px",
      fontWeight: 600,
      color: "#333",
      margin: "0 0 2px 0",
    },
    subtitle: {
      fontSize: "12px",
      color: "#6c757d",
      margin: 0,
    },
    closeButton: {
      width: "32px",
      height: "32px",
      border: "none",
      background: "#e9ecef",
      borderRadius: "50%",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#6c757d",
      transition: "all 0.2s",
      flexShrink: 0,
    },
    body: {
      padding: "24px 32px",
    },
    formGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "16px",
    },
    formGroup: {
      marginBottom: 0,
    },
    label: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontFamily: "'Poppins', sans-serif",
      fontSize: "14px",
      fontWeight: 500,
      color: "#374151",
      marginBottom: "6px",
    },
    labelIcon: {
      color: "#6b7280",
      fontSize: "12px",
    },
    required: {
      color: "#dc3545",
      fontWeight: 600,
    },
    input: {
      width: "100%",
      padding: "10px 14px",
      fontFamily: "'Poppins', sans-serif",
      fontSize: "14px",
      color: "#333",
      background: "#fcfcfd",
      border: "1px solid #e2e5ea",
      borderRadius: "8px",
      transition: "all 0.2s ease",
      boxSizing: "border-box",
      outline: "none",
    },
    inputError: {
      borderColor: "#dc3545",
      background: "#fff5f5",
    },
    alert: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "12px 16px",
      borderRadius: "8px",
      fontSize: "13px",
      fontWeight: 500,
      marginTop: "16px",
      background: "#f8d7da",
      color: "#721c24",
      border: "1px solid #f5c6cb",
    },
    alertIcon: {
      fontSize: "16px",
    },
    footer: {
      display: "flex",
      justifyContent: "flex-end",
      gap: "12px",
      padding: "16px 32px",
      background: "#fcfcfd",
      borderTop: "1px solid #e9ecef",
    },
    btnBase: {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      padding: "10px 20px",
      fontFamily: "'Poppins', sans-serif",
      fontSize: "14px",
      fontWeight: 500,
      borderRadius: "8px",
      cursor: "pointer",
      transition: "all 0.2s ease",
      border: "none",
    },
    btnOutline: {
      background: "#fff",
      color: "#6c757d",
      border: "1px solid #dee2e6",
    },
    btnAccent: {
      background: "linear-gradient(135deg, #f5a623 0%, #f7b731 100%)",
      color: "#fff",
    },
  };

  return (
    <Modal
      isOpen={props.modal}
      toggle={props.toggle}
      className="modal-lg modal-dialog-centered"
      backdrop={props.backdrop}
    >
      <div style={styles.modalContainer}>
        {/* Custom Header */}
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.iconCircle}>
              <i className="fas fa-coins" style={styles.iconStyle} />
            </div>
            <div style={styles.headerText}>
              <h2 style={styles.title}>{props.title}</h2>
              <p style={styles.subtitle}>Gestionar opciones de gastos</p>
            </div>
          </div>
          <button
            type="button"
            style={styles.closeButton}
            onClick={props.toggle}
            onMouseOver={(e) => { e.currentTarget.style.background = "#dc3545"; e.currentTarget.style.color = "#fff"; }}
            onMouseOut={(e) => { e.currentTarget.style.background = "#e9ecef"; e.currentTarget.style.color = "#6c757d"; }}
          >
            <i className="fas fa-times" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Body */}
          <div style={styles.body}>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <i className="fas fa-tag" style={styles.labelIcon} />
                  Nombre
                  <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={props.formValues.name}
                  onChange={props.onChangeForm}
                  style={{
                    ...styles.input,
                    ...(hasError("name") ? styles.inputError : {}),
                  }}
                  placeholder="Nombre del tipo"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <i className="fas fa-folder" style={styles.labelIcon} />
                  Tipo
                  <span style={styles.required}>*</span>
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
              <div style={styles.alert}>
                <i className="fas fa-exclamation-circle" style={styles.alertIcon} />
                <span>Debes completar todos los campos requeridos</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <button
              type="button"
              style={{ ...styles.btnBase, ...styles.btnOutline }}
              onClick={props.toggle}
              onMouseOver={(e) => { e.currentTarget.style.background = "#fcfcfd"; e.currentTarget.style.borderColor = "#adb5bd"; }}
              onMouseOut={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#dee2e6"; }}
            >
              <i className="fas fa-times" /> Cerrar
            </button>
            <button
              type="button"
              style={{ ...styles.btnBase, ...styles.btnAccent }}
              onClick={props.submitForm}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, #e09520 0%, #e5a82a 100%)";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(245, 166, 35, 0.35)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, #f5a623 0%, #f7b731 100%)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <i className="fas fa-save" /> {props.nameBnt}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default FormCreate;
