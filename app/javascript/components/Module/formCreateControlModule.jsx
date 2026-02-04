import React from 'react';
import { Modal } from 'reactstrap';

class formCreateControlModule extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <Modal
        isOpen={this.props.modal}
        toggle={this.props.toggle}
        className="modal-dialog-centered cm-modal"
        backdrop={this.props.backdrop}
      >
        <div className="cm-modal-header">
          <div className="cm-modal-header-content">
            <div className="cm-modal-icon">
              <i className="fas fa-cubes"></i>
            </div>
            <div className="cm-modal-header-text">
              <h2 className="cm-modal-title">{this.props.titulo}</h2>
              <p className="cm-modal-subtitle">Configure el módulo del sistema</p>
            </div>
          </div>
          <button type="button" className="cm-modal-close" onClick={this.props.toggle}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={this.props.FormSubmit}>
          <div className="cm-modal-body">
            {this.props.errorState === true && (
              <div className="cm-alert cm-alert-danger">
                <i className="fas fa-exclamation-circle"></i>
                <span>El nombre no puede estar en blanco</span>
              </div>
            )}

            <div className="cm-form-section">
              <div className="cm-form-grid cm-form-grid-1">
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fas fa-tag"></i>
                    Nombre <span className="cm-required">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={this.props.formValues.name}
                    onChange={this.props.onChangeForm}
                    className="cm-input"
                    placeholder="Ingrese el nombre del módulo"
                    autoComplete="off"
                  />
                </div>

                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fas fa-align-left"></i>
                    Descripción
                  </label>
                  <textarea
                    name="description"
                    rows="6"
                    value={this.props.formValues.description}
                    onChange={this.props.onChangeForm}
                    className="cm-input cm-textarea"
                    placeholder="Ingrese una descripción para el módulo"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="cm-modal-footer">
            <button
              type="button"
              className="cm-btn cm-btn-secondary"
              onClick={this.props.toggle}
            >
              <i className="fas fa-times"></i>
              Cancelar
            </button>
            <button
              type="button"
              className="cm-btn cm-btn-primary"
              onClick={this.props.submit}
            >
              <i className="fas fa-save"></i>
              {this.props.nameSubmit}
            </button>
          </div>
        </form>

        <style>{`
          .cm-modal .modal-content {
            border: none;
            border-radius: 16px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            overflow: hidden;
          }

          .cm-modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 24px 28px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }

          .cm-modal-header-content {
            display: flex;
            align-items: center;
            gap: 16px;
          }

          .cm-modal-icon {
            width: 48px;
            height: 48px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
          }

          .cm-modal-header-text {
            display: flex;
            flex-direction: column;
          }

          .cm-modal-title {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
            line-height: 1.3;
          }

          .cm-modal-subtitle {
            margin: 4px 0 0 0;
            font-size: 14px;
            opacity: 0.85;
          }

          .cm-modal-close {
            background: rgba(255, 255, 255, 0.15);
            border: none;
            color: white;
            width: 36px;
            height: 36px;
            border-radius: 10px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
          }

          .cm-modal-close:hover {
            background: rgba(255, 255, 255, 0.25);
            transform: scale(1.05);
          }

          .cm-modal-body {
            padding: 28px;
            background: #f8fafc;
          }

          .cm-alert {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 14px 18px;
            border-radius: 10px;
            margin-bottom: 20px;
            font-size: 14px;
            font-weight: 500;
          }

          .cm-alert-danger {
            background: #fef2f2;
            color: #dc2626;
            border: 1px solid #fecaca;
          }

          .cm-alert-danger i {
            font-size: 16px;
          }

          .cm-form-section {
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          }

          .cm-form-grid {
            display: grid;
            gap: 20px;
          }

          .cm-form-grid-1 {
            grid-template-columns: 1fr;
          }

          .cm-form-group {
            display: flex;
            flex-direction: column;
          }

          .cm-label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            font-weight: 400;
            color: #374151;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.025em;
          }

          .cm-label i {
            color: #667eea;
            font-size: 12px;
          }

          .cm-required {
            color: #ef4444;
            font-weight: 700;
          }

          .cm-input {
            width: 100%;
            padding: 12px 16px;
            font-size: 14px;
            border: 2px solid #e5e7eb;
            border-radius: 10px;
            transition: all 0.2s ease;
            background: white;
            color: #1f2937;
          }

          .cm-input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
          }

          .cm-input::placeholder {
            color: #9ca3af;
          }

          .cm-textarea {
            resize: vertical;
            min-height: 120px;
            line-height: 1.5;
          }

          .cm-modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding: 20px 28px;
            background: white;
            border-top: 1px solid #e5e7eb;
          }

          .cm-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 24px;
            font-size: 14px;
            font-weight: 600;
            border-radius: 10px;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .cm-btn i {
            font-size: 13px;
          }

          .cm-btn-secondary {
            background: #f3f4f6;
            color: #4b5563;
          }

          .cm-btn-secondary:hover {
            background: #e5e7eb;
            color: #374151;
          }

          .cm-btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            box-shadow: 0 4px 14px rgba(102, 126, 234, 0.35);
          }

          .cm-btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.45);
          }
        `}</style>
      </Modal>
    );
  }
}

export default formCreateControlModule;
