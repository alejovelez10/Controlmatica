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

const documentTypeOptions = [
  { value: "", label: "Seleccione un tipo" },
  { value: "Cédula de Ciudadanía", label: "Cédula de Ciudadanía" },
  { value: "Tarjeta de Identidad", label: "Tarjeta de Identidad" },
  { value: "Registro Civil de Nacimiento", label: "Registro Civil de Nacimiento" },
  { value: "Cedula de Extranjeria", label: "Cédula de Extranjeria" },
  { value: "Pasaporte", label: "Pasaporte" },
  { value: "Menor sin Identificación", label: "Menor sin Identificación" },
  { value: "Adulto sin Identificación", label: "Adulto sin Identificación" },
  { value: "Carnet Diplomático", label: "Carnet Diplomático" },
];

class FormCreate extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      show_password: false,
      show_password_confirmation: false,
    };
  }

  getUrl() {
    const defaultAvatar = "https://dnuba.s3.amazonaws.com/uploads/bank_image/achivo/44/user.jpeg";
    if (this.props.editState === true && this.props.formValues.avatar !== undefined) {
      return this.props.formValues.avatar;
    }
    return defaultAvatar;
  }

  getDocumentTypeValue() {
    const docType = this.props.formValues.document_type;
    return documentTypeOptions.find((opt) => opt.value === docType) || documentTypeOptions[0];
  }

  handleDocumentTypeChange = (selected) => {
    const event = {
      target: {
        name: "document_type",
        value: selected ? selected.value : "",
      },
    };
    this.props.onChangeForm(event);
  };

  render() {
    return (
      <Modal
        isOpen={this.props.modal}
        toggle={this.props.toggle}
        className="modal-lg modal-dialog-centered"
        backdrop={this.props.backdrop}
      >
        <div className="cm-modal-container">
          <div className="cm-modal-header">
            <div className="cm-modal-header-content">
              <div className="cm-modal-icon">
                <i className="fas fa-user-plus" />
              </div>
              <div>
                <h2 className="cm-modal-title">{this.props.titulo}</h2>
                <p className="cm-modal-subtitle">Gestionar información del usuario</p>
              </div>
            </div>
            <button type="button" className="cm-modal-close" onClick={this.props.toggle}>
              <i className="fas fa-times" />
            </button>
          </div>

          <form onSubmit={this.props.FormSubmit}>
            <div className="cm-modal-body">
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Avatar Section */}
                <div className="cm-avatar-section">
                  <div>
                    <img src={this.getUrl()} className="cm-avatar-img" alt="Avatar" />
                  </div>
                  <div className="cm-avatar-upload">
                    <label className="cm-label">
                      <i className="fa fa-camera"></i> Foto de perfil
                    </label>
                    <input
                      type="file"
                      name="avatar"
                      onChange={this.props.handleFileUpload}
                      className="cm-input cm-file-input"
                    />
                  </div>
                </div>

                {/* Personal Information */}
                <div className="cm-form-grid-2">
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-user"></i> Nombre y apellido <span className="cm-required">*</span>
                    </label>
                    <input
                      type="text"
                      name="names"
                      value={this.props.formValues.names}
                      onChange={this.props.onChangeForm}
                      className={`cm-input ${this.props.errorValues === false && this.props.formValues.names === "" ? "cm-input-error" : ""}`}
                      placeholder="Nombre completo"
                    />
                  </div>

                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-envelope"></i> Correo electrónico <span className="cm-required">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={this.props.formValues.email}
                      onChange={this.props.onChangeForm}
                      className={`cm-input ${this.props.errorValues === false && this.props.formValues.email === "" ? "cm-input-error" : ""}`}
                      placeholder="correo@ejemplo.com"
                    />
                  </div>

                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-id-card"></i> Tipo de documento <span className="cm-required">*</span>
                    </label>
                    <Select
                      value={this.getDocumentTypeValue()}
                      onChange={this.handleDocumentTypeChange}
                      options={documentTypeOptions}
                      styles={selectStyles}
                      menuPortalTarget={document.body}
                      placeholder="Seleccione un tipo"
                      className={this.props.errorValues === false && this.props.formValues.document_type === "" ? "cm-select-error" : ""}
                    />
                  </div>

                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-id-badge"></i> Numero de documento <span className="cm-required">*</span>
                    </label>
                    <input
                      type="number"
                      name="number_document"
                      value={this.props.formValues.number_document}
                      onChange={this.props.onChangeForm}
                      className={`cm-input ${this.props.errorValues === false && this.props.formValues.number_document === "" ? "cm-input-error" : ""}`}
                      placeholder="Documento"
                    />
                  </div>
                </div>

                {/* Role Selection */}
                <div className="cm-form-group cm-full-width">
                  <input type="hidden" name="rol_id" value={this.props.formAutocomplete.rol_id} />
                  <label className="cm-label">
                    <i className="fa fa-user-tag"></i> Rol <span className="cm-required">*</span>
                  </label>
                  <Select
                    onChange={this.props.onChangeAutocomplete}
                    options={this.props.roles}
                    autoFocus={false}
                    styles={selectStyles}
                    menuPortalTarget={document.body}
                    value={this.props.formAutocomplete}
                    placeholder="Seleccione un rol"
                    className={this.props.errorValues === false && this.props.formValues.rol_id === "" ? "cm-select-error" : ""}
                  />
                </div>

                {/* Password Section */}
                <div className="cm-form-grid-2">
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-lock"></i> Contrasena <span className="cm-required">*</span>
                    </label>
                    <div className="cm-password-wrapper">
                      <input
                        type={this.state.show_password ? "text" : "password"}
                        name="password"
                        value={this.props.formValues.password}
                        onChange={this.props.onChangeForm}
                        onBlur={this.props.onBlurPasswordConfirmation}
                        className="cm-input"
                        placeholder="Contrasena"
                      />
                      {this.props.formValues.password.length >= 1 && (
                        <button
                          type="button"
                          className="cm-password-toggle"
                          onClick={() => this.setState({ show_password: !this.state.show_password })}
                        >
                          <i className={this.state.show_password ? "fas fa-eye" : "fas fa-eye-slash"}></i>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-lock"></i> Confirmar contrasena <span className="cm-required">*</span>
                    </label>
                    <div className="cm-password-wrapper">
                      <input
                        type={this.state.show_password_confirmation ? "text" : "password"}
                        name="password_confirmation"
                        value={this.props.formValues.password_confirmation}
                        onChange={this.props.onChangeForm}
                        onBlur={this.props.onBlurPasswordConfirmation}
                        className="cm-input"
                        placeholder="Confirmar contrasena"
                      />
                      {this.props.formValues.password_confirmation.length >= 1 && (
                        <button
                          type="button"
                          className="cm-password-toggle"
                          onClick={() => this.setState({ show_password_confirmation: !this.state.show_password_confirmation })}
                        >
                          <i className={this.state.show_password_confirmation ? "fas fa-eye" : "fas fa-eye-slash"}></i>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Password Requirements Alert */}
                {this.props.formValues.password.length >= 1 && this.props.passworState === false && (
                  <div className="cm-alert cm-alert-warning">
                    <div className="cm-alert-header">
                      <i className="fa fa-exclamation-triangle"></i> Requisitos de contrasena
                    </div>
                    <ul className="cm-password-requirements">
                      <li className={this.props.formValues.password.length >= 6 ? "cm-req-met" : "cm-req-unmet"}>
                        <i className={this.props.formValues.password.length >= 6 ? "fa fa-check" : "fa fa-times"}></i>
                        Minimo 6 caracteres
                      </li>
                      <li className={/[A-Z]/.test(this.props.formValues.password) ? "cm-req-met" : "cm-req-unmet"}>
                        <i className={/[A-Z]/.test(this.props.formValues.password) ? "fa fa-check" : "fa fa-times"}></i>
                        Al menos una letra mayuscula
                      </li>
                      <li className={/[a-z]/.test(this.props.formValues.password) ? "cm-req-met" : "cm-req-unmet"}>
                        <i className={/[a-z]/.test(this.props.formValues.password) ? "fa fa-check" : "fa fa-times"}></i>
                        Una letra minuscula
                      </li>
                      <li className={/[0-9]/.test(this.props.formValues.password) ? "cm-req-met" : "cm-req-unmet"}>
                        <i className={/[0-9]/.test(this.props.formValues.password) ? "fa fa-check" : "fa fa-times"}></i>
                        Un numero
                      </li>
                    </ul>
                  </div>
                )}

                {/* Password Confirmation Alert */}
                {this.props.passworState === true &&
                  this.props.formValues.password.length >= 1 &&
                  this.props.formValues.password_confirmation.length >= 1 && (
                    <div className={`cm-alert ${this.props.passworConfirmationState ? "cm-alert-success" : "cm-alert-error"}`}>
                      <i className={this.props.passworConfirmationState ? "fa fa-check-circle" : "fa fa-times-circle"}></i>
                      {this.props.passworConfirmationState
                        ? "Contrasenas iguales"
                        : "La confirmacion de la contrasena no es igual a la contrasena"}
                    </div>
                  )}

                {/* Error Alert */}
                {this.props.errorValues === false && (
                  <div className="cm-alert cm-alert-error">
                    <i className="fa fa-exclamation-circle"></i>
                    Debes completar todos los campos requeridos
                  </div>
                )}
              </div>
            </div>

            <div className="cm-modal-footer">
              <button type="button" className="cm-btn cm-btn-cancel" onClick={this.props.toggle}>
                <i className="fa fa-times"></i> Cancelar
              </button>
              <button type="submit" className="cm-btn cm-btn-submit" onClick={this.props.submit}>
                <i className="fa fa-save"></i> {this.props.nameSubmit}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    );
  }
}

export default FormCreate;
