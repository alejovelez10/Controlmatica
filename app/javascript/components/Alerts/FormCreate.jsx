import React, { Component } from 'react';
import { Modal } from 'reactstrap';

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

class FormCreate extends Component {
  constructor(props) {
    super(props);
    this.state = {
      color_min: false,
      color_mid: false,
      color_max: false,
      color_hour_min: false,
      color_hour_med: false,
      color_hour_max: false,
    };
  }

  handleSubmit = (e) => {
    e.preventDefault();
  };

  render() {
    const isEdit = this.props.title && this.props.title.toLowerCase().includes('editar');

    return (
      <Modal
        isOpen={this.props.modal}
        toggle={this.props.toggle}
        className="modal-lg modal-dialog-centered"
        backdrop={this.props.backdrop}
      >
        <div className="cm-modal-container">
          {/* Header */}
          <div className="cm-modal-header">
            <div className="cm-modal-header-content">
              <div className="cm-modal-icon">
                <i className="fa fa-bell" />
              </div>
              <div>
                <h2 className="cm-modal-title">{this.props.title}</h2>
                <p className="cm-modal-subtitle">
                  {isEdit ? "Modifique los parametros de la alerta" : "Configure los parametros de la nueva alerta"}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="cm-modal-close"
              onClick={this.props.toggle}
            >
              <i className="fa fa-times" />
            </button>
          </div>

          <form onSubmit={this.handleSubmit}>
            {/* Body */}
            <div className="cm-modal-body">
              {/* Name */}
              <div className="cm-form-group" style={{ marginBottom: '16px' }}>
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-tag" /> Nombre
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={this.props.formValues.name}
                    onChange={this.props.onChangeForm}
                    className="cm-input"
                    placeholder="Nombre de la alerta"
                  />
                </div>
              </div>

              {/* Ingenieria Ejecucion */}
              <div className="cm-form-group" style={{ marginBottom: '16px' }}>
                <div className="cm-form-grid-2">
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-check-circle" style={{ color: '#28a745' }} /> Ingenieria Ejecucion (Max Verde)
                    </label>
                    <input
                      type="number"
                      name="ing_ejecucion_min"
                      value={this.props.formValues.ing_ejecucion_min}
                      onChange={this.props.onChangeForm}
                      className="cm-input"
                      placeholder="Valor maximo verde"
                    />
                  </div>
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-exclamation-circle" style={{ color: '#f5a623' }} /> Ingenieria Ejecucion (Max Naranja)
                    </label>
                    <input
                      type="number"
                      name="ing_ejecucion_med"
                      value={this.props.formValues.ing_ejecucion_med}
                      onChange={this.props.onChangeForm}
                      className="cm-input"
                      placeholder="Valor maximo naranja"
                    />
                  </div>
                </div>
              </div>

              {/* Ingenieria Costo */}
              <div className="cm-form-group" style={{ marginBottom: '16px' }}>
                <div className="cm-form-grid-2">
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-check-circle" style={{ color: '#28a745' }} /> Ingenieria Costo (Max Verde)
                    </label>
                    <input
                      type="number"
                      name="ing_costo_min"
                      value={this.props.formValues.ing_costo_min}
                      onChange={this.props.onChangeForm}
                      className="cm-input"
                      placeholder="Valor maximo verde"
                    />
                  </div>
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-exclamation-circle" style={{ color: '#f5a623' }} /> Ingenieria Costo (Max Naranja)
                    </label>
                    <input
                      type="number"
                      name="ing_costo_med"
                      value={this.props.formValues.ing_costo_med}
                      onChange={this.props.onChangeForm}
                      className="cm-input"
                      placeholder="Valor maximo naranja"
                    />
                  </div>
                </div>
              </div>

              {/* Tablerista Ejecucion */}
              <div className="cm-form-group" style={{ marginBottom: '16px' }}>
                <div className="cm-form-grid-2">
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-check-circle" style={{ color: '#28a745' }} /> Tablerista Ejecucion (Max Verde)
                    </label>
                    <input
                      type="number"
                      name="tab_ejecucion_min"
                      value={this.props.formValues.tab_ejecucion_min}
                      onChange={this.props.onChangeForm}
                      className="cm-input"
                      placeholder="Valor maximo verde"
                    />
                  </div>
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-exclamation-circle" style={{ color: '#f5a623' }} /> Tablerista Ejecucion (Max Naranja)
                    </label>
                    <input
                      type="number"
                      name="tab_ejecucion_med"
                      value={this.props.formValues.tab_ejecucion_med}
                      onChange={this.props.onChangeForm}
                      className="cm-input"
                      placeholder="Valor maximo naranja"
                    />
                  </div>
                </div>
              </div>

              {/* Tablerista Costo */}
              <div className="cm-form-group" style={{ marginBottom: '16px' }}>
                <div className="cm-form-grid-2">
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-check-circle" style={{ color: '#28a745' }} /> Tablerista Costo (Max Verde)
                    </label>
                    <input
                      type="number"
                      name="tab_costo_min"
                      value={this.props.formValues.tab_costo_min}
                      onChange={this.props.onChangeForm}
                      className="cm-input"
                      placeholder="Valor maximo verde"
                    />
                  </div>
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-exclamation-circle" style={{ color: '#f5a623' }} /> Tablerista Costo (Max Naranja)
                    </label>
                    <input
                      type="number"
                      name="tab_costo_med"
                      value={this.props.formValues.tab_costo_med}
                      onChange={this.props.onChangeForm}
                      className="cm-input"
                      placeholder="Valor maximo naranja"
                    />
                  </div>
                </div>
              </div>

              {/* Desplazamiento */}
              <div className="cm-form-group" style={{ marginBottom: '16px' }}>
                <div className="cm-form-grid-2">
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-check-circle" style={{ color: '#28a745' }} /> Desplazamiento (Max Verde)
                    </label>
                    <input
                      type="number"
                      name="desp_min"
                      value={this.props.formValues.desp_min}
                      onChange={this.props.onChangeForm}
                      className="cm-input"
                      placeholder="Valor maximo verde"
                    />
                  </div>
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-exclamation-circle" style={{ color: '#f5a623' }} /> Desplazamiento (Max Naranja)
                    </label>
                    <input
                      type="number"
                      name="desp_med"
                      value={this.props.formValues.desp_med}
                      onChange={this.props.onChangeForm}
                      className="cm-input"
                      placeholder="Valor maximo naranja"
                    />
                  </div>
                </div>
              </div>

              {/* Materiales */}
              <div className="cm-form-group" style={{ marginBottom: '16px' }}>
                <div className="cm-form-grid-2">
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-check-circle" style={{ color: '#28a745' }} /> Materiales (Max Verde)
                    </label>
                    <input
                      type="number"
                      name="mat_min"
                      value={this.props.formValues.mat_min}
                      onChange={this.props.onChangeForm}
                      className="cm-input"
                      placeholder="Valor maximo verde"
                    />
                  </div>
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-exclamation-circle" style={{ color: '#f5a623' }} /> Materiales (Max Naranja)
                    </label>
                    <input
                      type="number"
                      name="mat_med"
                      value={this.props.formValues.mat_med}
                      onChange={this.props.onChangeForm}
                      className="cm-input"
                      placeholder="Valor maximo naranja"
                    />
                  </div>
                </div>
              </div>

              {/* Viaticos */}
              <div className="cm-form-group" style={{ marginBottom: '16px' }}>
                <div className="cm-form-grid-2">
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-check-circle" style={{ color: '#28a745' }} /> Viaticos (Max Verde)
                    </label>
                    <input
                      type="number"
                      name="via_min"
                      value={this.props.formValues.via_min}
                      onChange={this.props.onChangeForm}
                      className="cm-input"
                      placeholder="Valor maximo verde"
                    />
                  </div>
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-exclamation-circle" style={{ color: '#f5a623' }} /> Viaticos (Max Naranja)
                    </label>
                    <input
                      type="number"
                      name="via_med"
                      value={this.props.formValues.via_med}
                      onChange={this.props.onChangeForm}
                      className="cm-input"
                      placeholder="Valor maximo naranja"
                    />
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="cm-form-group" style={{ marginBottom: '16px' }}>
                <div className="cm-form-grid-2">
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-check-circle" style={{ color: '#28a745' }} /> Total (Max Verde)
                    </label>
                    <input
                      type="number"
                      name="total_min"
                      value={this.props.formValues.total_min}
                      onChange={this.props.onChangeForm}
                      className="cm-input"
                      placeholder="Valor maximo verde"
                    />
                  </div>
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-exclamation-circle" style={{ color: '#f5a623' }} /> Total (Max Naranja)
                    </label>
                    <input
                      type="number"
                      name="total_med"
                      value={this.props.formValues.total_med}
                      onChange={this.props.onChangeForm}
                      className="cm-input"
                      placeholder="Valor maximo naranja"
                    />
                  </div>
                </div>
              </div>

              {/* Configuracion de horas por mes */}
              <div className="cm-section-divider">
                <span className="cm-section-divider-text">
                  <i className="fa fa-calendar" /> Configuracion de horas por mes
                </span>
              </div>

              <div className="cm-form-group" style={{ marginBottom: '16px' }}>
                <div className="cm-form-grid-2">
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-minus-circle" /> Menor o igual (Valor)
                    </label>
                    <input
                      type="number"
                      name="alert_min"
                      value={this.props.formValues.alert_min}
                      onChange={this.props.onChangeForm}
                      className="cm-input"
                      placeholder="Valor"
                    />
                  </div>
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-palette" /> Color
                    </label>
                    <input
                      type="color"
                      name="color_min"
                      value={this.props.formValues.color_min}
                      onChange={this.props.onChangeForm}
                      className="cm-color-input"
                    />
                  </div>
                </div>
              </div>

              <div className="cm-form-group" style={{ marginBottom: '16px' }}>
                <div className="cm-form-grid-2">
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-arrows-alt-h" /> Mayor que anterior y menor que
                    </label>
                    <input
                      type="number"
                      name="alert_med"
                      value={this.props.formValues.alert_med}
                      onChange={this.props.onChangeForm}
                      className="cm-input"
                      placeholder="Valor"
                    />
                  </div>
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-palette" /> Color
                    </label>
                    <input
                      type="color"
                      name="color_mid"
                      value={this.props.formValues.color_mid}
                      onChange={this.props.onChangeForm}
                      className="cm-color-input"
                    />
                  </div>
                </div>
              </div>

              <div className="cm-form-group" style={{ marginBottom: '16px' }}>
                <div className="cm-form-grid-2">
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-plus-circle" /> Mayor o igual al valor anterior
                    </label>
                    <div style={{ height: "42px" }}></div>
                  </div>
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-palette" /> Color
                    </label>
                    <input
                      type="color"
                      name="color_max"
                      value={this.props.formValues.color_max}
                      onChange={this.props.onChangeForm}
                      className="cm-color-input"
                    />
                  </div>
                </div>
              </div>

              {/* Configuracion horas por dia */}
              <div className="cm-section-divider">
                <span className="cm-section-divider-text">
                  <i className="fa fa-clock" /> Configuracion horas por dia
                </span>
              </div>

              <div className="cm-form-group" style={{ marginBottom: '16px' }}>
                <div className="cm-form-grid-2">
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-minus-circle" /> Menor o igual (Valor)
                    </label>
                    <input
                      type="number"
                      name="alert_hour_min"
                      value={this.props.formValues.alert_hour_min}
                      onChange={this.props.onChangeForm}
                      className="cm-input"
                      placeholder="Valor"
                    />
                  </div>
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-palette" /> Color
                    </label>
                    <input
                      type="color"
                      name="color_hour_min"
                      value={this.props.formValues.color_hour_min}
                      onChange={this.props.onChangeForm}
                      className="cm-color-input"
                    />
                  </div>
                </div>
              </div>

              <div className="cm-form-group" style={{ marginBottom: '16px' }}>
                <div className="cm-form-grid-2">
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-arrows-alt-h" /> Mayor que anterior y menor que
                    </label>
                    <input
                      type="number"
                      name="alert_hour_med"
                      value={this.props.formValues.alert_hour_med}
                      onChange={this.props.onChangeForm}
                      className="cm-input"
                      placeholder="Valor"
                    />
                  </div>
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-palette" /> Color
                    </label>
                    <input
                      type="color"
                      name="color_hour_med"
                      value={this.props.formValues.color_hour_med}
                      onChange={this.props.onChangeForm}
                      className="cm-color-input"
                    />
                  </div>
                </div>
              </div>

              <div className="cm-form-group" style={{ marginBottom: '16px' }}>
                <div className="cm-form-grid-2">
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-plus-circle" /> Mayor o igual al valor anterior
                    </label>
                    <div style={{ height: "42px" }}></div>
                  </div>
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-palette" /> Color
                    </label>
                    <input
                      type="color"
                      name="color_hour_max"
                      value={this.props.formValues.color_hour_max}
                      onChange={this.props.onChangeForm}
                      className="cm-color-input"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="cm-modal-footer">
              <button
                type="button"
                className="cm-btn cm-btn-cancel"
                onClick={() => this.props.toggle()}
              >
                <i className="fa fa-times" /> Cerrar
              </button>
              <button
                type="button"
                className="cm-btn cm-btn-submit"
                onClick={this.props.submitForm}
              >
                <i className="fa fa-save" /> {this.props.nameSubmit}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    );
  }
}

export default FormCreate;
