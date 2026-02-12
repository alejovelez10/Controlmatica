import React from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "reactstrap";
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
        <ModalHeader className="cm-modal-header" toggle={this.props.toggle}>
          <i className="fa fa-user-plus cm-header-icon"></i>
          {this.props.titulo}
        </ModalHeader>

        <form onSubmit={this.props.FormSubmit}>
          <ModalBody className="cm-modal-body">
            <div className="cm-form-layout">
              {/* Avatar Section */}
              <div className="cm-avatar-section">
                <div className="cm-avatar-container">
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
              <div className="cm-form-group cm-form-full">
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
          </ModalBody>

          <ModalFooter className="cm-modal-footer">
            <button type="button" className="cm-btn cm-btn-secondary" onClick={this.props.toggle}>
              <i className="fa fa-times"></i> Cancelar
            </button>
            <button type="submit" className="cm-btn cm-btn-primary" onClick={this.props.submit}>
              <i className="fa fa-save"></i> {this.props.nameSubmit}
            </button>
          </ModalFooter>
        </form>

        <style>{`
          .cm-modal-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 8px 8px 0 0;
            padding: 16px 20px;
            display: flex;
            align-items: center;
            gap: 12px;
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
            font-size: 20px;
            margin-right: 10px;
          }
          .cm-modal-body {
            padding: 24px;
            background: #fafbfc;
          }
          .cm-form-layout {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }
          .cm-avatar-section {
            display: flex;
            align-items: center;
            gap: 20px;
            padding: 16px;
            background: white;
            border-radius: 12px;
            border: 1px solid #e2e5ea;
          }
          .cm-avatar-container {
            flex-shrink: 0;
          }
          .cm-avatar-img {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid #667eea;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          }
          .cm-avatar-upload {
            flex: 1;
          }
          .cm-file-input {
            padding: 8px !important;
          }
          .cm-form-grid-2 {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }
          @media (max-width: 768px) {
            .cm-form-grid-2 {
              grid-template-columns: 1fr;
            }
          }
          .cm-form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .cm-form-full {
            grid-column: 1 / -1;
          }
          .cm-label {
            font-size: 13px;
            font-weight: 400;
            color: #4a5568;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .cm-label i {
            color: #667eea;
            width: 16px;
          }
          .cm-required {
            color: #e53e3e;
          }
          .cm-input {
            width: 100%;
            padding: 10px 14px;
            border: 1px solid #e2e5ea;
            border-radius: 8px;
            font-size: 14px;
            background: #fcfcfd;
            transition: all 0.2s ease;
          }
          .cm-input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
            background: white;
          }
          .cm-input::placeholder {
            color: #a0aec0;
          }
          .cm-input-error {
            border-color: #e53e3e !important;
            box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.15) !important;
          }
          .cm-select-error > div {
            border-color: #e53e3e !important;
            box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.15) !important;
          }
          .cm-password-wrapper {
            position: relative;
          }
          .cm-password-wrapper .cm-input {
            padding-right: 45px;
          }
          .cm-password-toggle {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: #718096;
            cursor: pointer;
            padding: 4px;
            transition: color 0.2s ease;
          }
          .cm-password-toggle:hover {
            color: #667eea;
          }
          .cm-alert {
            padding: 14px 16px;
            border-radius: 8px;
            font-size: 14px;
            display: flex;
            align-items: flex-start;
            gap: 10px;
          }
          .cm-alert i {
            margin-top: 2px;
          }
          .cm-alert-error {
            background: #fed7d7;
            color: #c53030;
            border: 1px solid #fc8181;
          }
          .cm-alert-success {
            background: #c6f6d5;
            color: #276749;
            border: 1px solid #68d391;
          }
          .cm-alert-warning {
            background: #fefcbf;
            color: #975a16;
            border: 1px solid #f6e05e;
            flex-direction: column;
          }
          .cm-alert-header {
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
          }
          .cm-password-requirements {
            list-style: none;
            padding: 0;
            margin: 0;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 6px;
          }
          @media (max-width: 768px) {
            .cm-password-requirements {
              grid-template-columns: 1fr;
            }
          }
          .cm-password-requirements li {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
          }
          .cm-req-met {
            color: #276749;
          }
          .cm-req-met i {
            color: #38a169;
          }
          .cm-req-unmet {
            color: #c53030;
          }
          .cm-req-unmet i {
            color: #e53e3e;
          }
          .cm-modal-footer {
            background: #f7fafc;
            border-top: 1px solid #e2e5ea;
            padding: 16px 20px;
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            border-radius: 0 0 8px 8px;
          }
          .cm-btn {
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
          }
          .cm-btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .cm-btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          }
          .cm-btn-secondary {
            background: white;
            color: #4a5568;
            border: 1px solid #e2e5ea;
          }
          .cm-btn-secondary:hover {
            background: #f7fafc;
            border-color: #cbd5e0;
          }
        `}</style>
      </Modal>
    );
  }
}

export default FormCreate;
