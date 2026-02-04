import React from "react";
import { Modal, ModalBody } from "reactstrap";
import CheckboxContainer from "../Rol/checkbox_container";

class FormCreate extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { modal, toggle, backdrop, titulo, formValues, onChangeForm, FormSubmit, submit, nameSubmit, checkedItems, handleChangeAccions, checkboxes, modules } = this.props;

    return (
      <Modal
        isOpen={modal}
        toggle={toggle}
        className="modal-lg modal-dialog-centered"
        backdrop={backdrop}
      >
        <div className="cm-modal-container">
          <div className="cm-modal-header">
            <div className="cm-modal-header-content">
              <div className="cm-modal-icon">
                <i className="fas fa-user-shield"></i>
              </div>
              <div className="cm-modal-header-text">
                <h2 className="cm-modal-title">{titulo}</h2>
                <p className="cm-modal-subtitle">Configure los permisos del rol</p>
              </div>
            </div>
            <button type="button" className="cm-modal-close" onClick={toggle}>
              <i className="fas fa-times"></i>
            </button>
          </div>

          <form onSubmit={FormSubmit}>
            <ModalBody className="cm-modal-body">
              <div className="cm-form-section">
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fas fa-tag"></i> Nombre <span className="cm-required">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formValues.name}
                    onChange={onChangeForm}
                    className="cm-input"
                    autoComplete="off"
                    placeholder="Nombre del rol"
                  />
                </div>
              </div>

              <div className="cm-permissions-section">
                <div className="cm-permissions-header">
                  <i className="fas fa-lock"></i>
                  <span>Permisos del rol</span>
                </div>
                <div className="cm-permissions-container">
                  <CheckboxContainer
                    checkedItems={checkedItems}
                    handleChangeAccions={handleChangeAccions}
                    checkboxes={checkboxes}
                    modules={modules}
                  />
                </div>
              </div>
            </ModalBody>

            <div className="cm-modal-footer">
              <button type="button" className="cm-btn cm-btn-outline" onClick={toggle}>
                <i className="fas fa-times"></i> Cancelar
              </button>
              <button type="submit" className="cm-btn cm-btn-accent" onClick={submit}>
                <i className="fas fa-save"></i> {nameSubmit}
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

          .cm-form-section {
            margin-bottom: 24px;
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

          .cm-input::placeholder {
            color: #adb5bd;
          }

          .cm-permissions-section {
            background: #f8f9fa;
            border-radius: 12px;
            border: 1px solid #e9ecef;
            overflow: hidden;
          }

          .cm-permissions-header {
            background: #fff;
            padding: 14px 20px;
            border-bottom: 1px solid #e9ecef;
            font-family: 'Poppins', sans-serif;
            font-size: 14px;
            font-weight: 600;
            color: #495057;
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .cm-permissions-header i {
            color: #f5a623;
          }

          .cm-permissions-container {
            padding: 20px;
            max-height: 400px;
            overflow-y: auto;
          }

          .cm-permissions-container::-webkit-scrollbar {
            width: 6px;
          }

          .cm-permissions-container::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 3px;
          }

          .cm-permissions-container::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 3px;
          }

          .cm-permissions-container::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
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
            .cm-modal-header,
            .cm-modal-body,
            .cm-modal-footer {
              padding-left: 20px !important;
              padding-right: 20px !important;
            }

            .cm-permissions-container {
              max-height: 300px;
            }
          }
        `}</style>
      </Modal>
    );
  }
}

export default FormCreate;
