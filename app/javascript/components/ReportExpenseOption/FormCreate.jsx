import React, { Component } from 'react';
import { CmModal } from '../../generalcomponents/ui';

class FormCreate extends Component {
  handleSubmit = (e) => {
    e.preventDefault();
  };

  render() {
    return (
      <CmModal
        isOpen={this.props.modal}
        toggle={this.props.toggle}
        title={this.props.title}
        submitLabel={this.props.nameBnt}
        onSubmit={this.props.submitForm}
      >
        <form onSubmit={this.handleSubmit}>
          <div className="cm-form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="cm-form-group">
              <label className="cm-form-label">Nombre <span style={{ color: "#dc3545" }}>*</span></label>
              <input
                type="text"
                name="name"
                value={this.props.formValues.name}
                onChange={this.props.onChangeForm}
                className={"cm-form-input" + (!this.props.errorValues && this.props.formValues.name === "" ? " cm-form-input--error" : "")}
                placeholder="Nombre del tipo"
              />
            </div>

            <div className="cm-form-group">
              <label className="cm-form-label">Tipo <span style={{ color: "#dc3545" }}>*</span></label>
              <select
                name="category"
                value={this.props.formValues.category}
                onChange={this.props.onChangeForm}
                className={"cm-form-input" + (!this.props.errorValues && this.props.formValues.category === "" ? " cm-form-input--error" : "")}
              >
                <option value="">Selecciona un tipo</option>
                <option value="Tipo">Tipo</option>
                <option value="Medio de pago">Medio de pago</option>
              </select>
            </div>
          </div>

          {!this.props.errorValues && (
            <div className="cm-form-alert cm-form-alert--error" style={{ marginTop: "16px" }}>
              Debes completar todos los campos requeridos
            </div>
          )}
        </form>
      </CmModal>
    );
  }
}

export default FormCreate;
