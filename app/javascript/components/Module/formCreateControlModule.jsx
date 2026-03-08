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
        className="modal-lg modal-dialog-centered"
        backdrop={this.props.backdrop}
      >
        <div className="cm-modal-container">
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

              <div>
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
                    className="cm-input"
                    placeholder="Ingrese una descripción para el módulo"
                    style={{ resize: 'vertical', minHeight: '120px' }}
                  />
                </div>
              </div>
            </div>

            <div className="cm-modal-footer">
              <button
                type="button"
                className="cm-btn cm-btn-cancel"
                onClick={this.props.toggle}
              >
                <i className="fas fa-times"></i>
                Cancelar
              </button>
              <button
                type="button"
                className="cm-btn cm-btn-submit"
                onClick={this.props.submit}
              >
                <i className="fas fa-save"></i>
                {this.props.nameSubmit}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    );
  }
}

export default formCreateControlModule;
