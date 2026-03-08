import React from "react";
import { Modal } from "reactstrap";
import CheckboxContainer from "../Rol/checkbox_container";

class FormCreate extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { modal, toggle, backdrop, titulo, formValues, onChangeForm, FormSubmit, submit, nameSubmit, checkedItems, handleChangeAccions, checkboxes, modules } = this.props;

    return (
      <Modal isOpen={modal} toggle={toggle} className="modal-lg modal-dialog-centered" backdrop={backdrop}>
        <div className="cm-modal-container">
          {/* Header */}
          <div className="cm-modal-header">
            <div className="cm-modal-header-content">
              <div className="cm-modal-icon">
                <i className="fas fa-user-tag" />
              </div>
              <div>
                <h2 className="cm-modal-title">{titulo}</h2>
                <p className="cm-modal-subtitle">Configure los permisos del rol</p>
              </div>
            </div>
            <button type="button" className="cm-modal-close" onClick={toggle}>
              <i className="fas fa-times" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={FormSubmit}>
            <div className="cm-modal-body">
              {/* Name Input */}
              <div className="cm-form-group">
                <label className="cm-label">
                  <i className="fas fa-tag" /> Nombre <span className="cm-required">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  className="cm-input"
                  value={formValues.name}
                  onChange={onChangeForm}
                  placeholder="Nombre del rol"
                  autoComplete="off"
                />
              </div>

              {/* Permissions Section */}
              <div className="cm-permissions-section">
                <div className="cm-permissions-header">
                  <div className="cm-contacts-icon">
                    <i className="fas fa-lock" />
                  </div>
                  <span style={{ fontWeight: 600, color: "#374151", fontSize: "16px" }}>
                    Permisos del rol
                  </span>
                </div>
                <div className="cm-permissions-body">
                  <CheckboxContainer
                    checkedItems={checkedItems}
                    handleChangeAccions={handleChangeAccions}
                    checkboxes={checkboxes}
                    modules={modules}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="cm-modal-footer">
              <button type="button" className="cm-btn cm-btn-cancel" onClick={toggle}>
                <i className="fas fa-times" /> Cancelar
              </button>
              <button type="submit" className="cm-btn cm-btn-submit" onClick={submit}>
                <i className="fas fa-save" /> {nameSubmit}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    );
  }
}

export default FormCreate;
