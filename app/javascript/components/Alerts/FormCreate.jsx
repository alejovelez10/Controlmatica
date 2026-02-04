import React, { Component } from 'react';
import { Modal, ModalBody, ModalFooter } from 'reactstrap';

const selectStyles = {
  control: (base, state) => ({
    ...base,
    background: "#f8f9fa",
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
    return (
      <Modal
        isOpen={this.props.modal}
        toggle={this.props.toggle}
        className="modal-lg modal-dialog-centered"
        backdrop={this.props.backdrop}
      >
        <div className="cm-modal-header">
          <div className="cm-modal-title">
            <i className="fa fa-bell cm-modal-icon"></i>
            <span>{this.props.title}</span>
          </div>
          <button
            type="button"
            className="cm-modal-close"
            onClick={this.props.toggle}
          >
            <i className="fa fa-times"></i>
          </button>
        </div>

        <form onSubmit={this.handleSubmit}>
          <ModalBody className="cm-modal-body">
            {/* Name */}
            <div className="cm-form-section">
              <div className="cm-form-group">
                <label className="cm-label">
                  <i className="fa fa-tag"></i> Nombre
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
            <div className="cm-form-section">
              <div className="cm-form-grid-2">
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-check-circle" style={{ color: '#28a745' }}></i> Ingenieria Ejecucion (Max Verde)
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
                    <i className="fa fa-exclamation-circle" style={{ color: '#f5a623' }}></i> Ingenieria Ejecucion (Max Naranja)
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
            <div className="cm-form-section">
              <div className="cm-form-grid-2">
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-check-circle" style={{ color: '#28a745' }}></i> Ingenieria Costo (Max Verde)
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
                    <i className="fa fa-exclamation-circle" style={{ color: '#f5a623' }}></i> Ingenieria Costo (Max Naranja)
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
            <div className="cm-form-section">
              <div className="cm-form-grid-2">
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-check-circle" style={{ color: '#28a745' }}></i> Tablerista Ejecucion (Max Verde)
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
                    <i className="fa fa-exclamation-circle" style={{ color: '#f5a623' }}></i> Tablerista Ejecucion (Max Naranja)
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
            <div className="cm-form-section">
              <div className="cm-form-grid-2">
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-check-circle" style={{ color: '#28a745' }}></i> Tablerista Costo (Max Verde)
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
                    <i className="fa fa-exclamation-circle" style={{ color: '#f5a623' }}></i> Tablerista Costo (Max Naranja)
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
            <div className="cm-form-section">
              <div className="cm-form-grid-2">
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-check-circle" style={{ color: '#28a745' }}></i> Desplazamiento (Max Verde)
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
                    <i className="fa fa-exclamation-circle" style={{ color: '#f5a623' }}></i> Desplazamiento (Max Naranja)
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
            <div className="cm-form-section">
              <div className="cm-form-grid-2">
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-check-circle" style={{ color: '#28a745' }}></i> Materiales (Max Verde)
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
                    <i className="fa fa-exclamation-circle" style={{ color: '#f5a623' }}></i> Materiales (Max Naranja)
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
            <div className="cm-form-section">
              <div className="cm-form-grid-2">
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-check-circle" style={{ color: '#28a745' }}></i> Viaticos (Max Verde)
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
                    <i className="fa fa-exclamation-circle" style={{ color: '#f5a623' }}></i> Viaticos (Max Naranja)
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
            <div className="cm-form-section">
              <div className="cm-form-grid-2">
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-check-circle" style={{ color: '#28a745' }}></i> Total (Max Verde)
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
                    <i className="fa fa-exclamation-circle" style={{ color: '#f5a623' }}></i> Total (Max Naranja)
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
                <i className="fa fa-calendar"></i> Configuracion de horas por mes
              </span>
            </div>

            <div className="cm-form-section">
              <div className="cm-form-grid-2">
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-minus-circle"></i> Menor o igual (Valor)
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
                    <i className="fa fa-palette"></i> Color
                  </label>
                  <input
                    type="color"
                    name="color_min"
                    value={this.props.formValues.color_min}
                    onChange={this.props.onChangeForm}
                    className="cm-input cm-color-input"
                  />
                </div>
              </div>
            </div>

            <div className="cm-form-section">
              <div className="cm-form-grid-2">
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-arrows-alt-h"></i> Mayor que anterior y menor que
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
                    <i className="fa fa-palette"></i> Color
                  </label>
                  <input
                    type="color"
                    name="color_mid"
                    value={this.props.formValues.color_mid}
                    onChange={this.props.onChangeForm}
                    className="cm-input cm-color-input"
                  />
                </div>
              </div>
            </div>

            <div className="cm-form-section">
              <div className="cm-form-grid-2">
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-plus-circle"></i> Mayor o igual al valor anterior
                  </label>
                  <div className="cm-label-placeholder"></div>
                </div>
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-palette"></i> Color
                  </label>
                  <input
                    type="color"
                    name="color_max"
                    value={this.props.formValues.color_max}
                    onChange={this.props.onChangeForm}
                    className="cm-input cm-color-input"
                  />
                </div>
              </div>
            </div>

            {/* Configuracion horas por dia */}
            <div className="cm-section-divider">
              <span className="cm-section-divider-text">
                <i className="fa fa-clock"></i> Configuracion horas por dia
              </span>
            </div>

            <div className="cm-form-section">
              <div className="cm-form-grid-2">
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-minus-circle"></i> Menor o igual (Valor)
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
                    <i className="fa fa-palette"></i> Color
                  </label>
                  <input
                    type="color"
                    name="color_hour_min"
                    value={this.props.formValues.color_hour_min}
                    onChange={this.props.onChangeForm}
                    className="cm-input cm-color-input"
                  />
                </div>
              </div>
            </div>

            <div className="cm-form-section">
              <div className="cm-form-grid-2">
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-arrows-alt-h"></i> Mayor que anterior y menor que
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
                    <i className="fa fa-palette"></i> Color
                  </label>
                  <input
                    type="color"
                    name="color_hour_med"
                    value={this.props.formValues.color_hour_med}
                    onChange={this.props.onChangeForm}
                    className="cm-input cm-color-input"
                  />
                </div>
              </div>
            </div>

            <div className="cm-form-section">
              <div className="cm-form-grid-2">
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-plus-circle"></i> Mayor o igual al valor anterior
                  </label>
                  <div className="cm-label-placeholder"></div>
                </div>
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-palette"></i> Color
                  </label>
                  <input
                    type="color"
                    name="color_hour_max"
                    value={this.props.formValues.color_hour_max}
                    onChange={this.props.onChangeForm}
                    className="cm-input cm-color-input"
                  />
                </div>
              </div>
            </div>
          </ModalBody>

          <ModalFooter className="cm-modal-footer">
            <button
              type="button"
              className="cm-btn cm-btn-cancel"
              onClick={() => this.props.toggle()}
            >
              <i className="fa fa-times"></i> Cerrar
            </button>
            <button
              type="button"
              className="cm-btn cm-btn-submit"
              onClick={this.props.submitForm}
            >
              <i className="fa fa-save"></i> {this.props.nameSubmit}
            </button>
          </ModalFooter>
        </form>

        <style jsx="true">{`
          .cm-modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px 24px;
            border-bottom: 1px solid #e2e5ea;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 0.5rem 0.5rem 0 0;
          }

          .cm-modal-title {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 1.25rem;
            font-weight: 600;
            color: #fff;
          }

          .cm-modal-icon {
            font-size: 1.5rem;
            color: #fff;
          }

          .cm-modal-close {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: #fff;
            width: 32px;
            height: 32px;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
          }

          .cm-modal-close:hover {
            background: rgba(255, 255, 255, 0.3);
          }

          .cm-modal-body {
            padding: 24px;
            max-height: 60vh;
            overflow-y: auto;
          }

          .cm-form-section {
            margin-bottom: 16px;
          }

          .cm-form-grid-2 {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }

          .cm-form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
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
            font-size: 14px;
            color: #718096;
          }

          .cm-input {
            width: 100%;
            padding: 10px 14px;
            font-size: 14px;
            border: 1px solid #e2e5ea;
            border-radius: 8px;
            background: #f8f9fa;
            color: #333;
            transition: all 0.2s ease;
          }

          .cm-input:focus {
            outline: none;
            border-color: #f5a623;
            box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.15);
            background: #fff;
          }

          .cm-input:hover {
            border-color: #f5a623;
          }

          .cm-input::placeholder {
            color: #a0aec0;
          }

          .cm-color-input {
            height: 42px;
            padding: 4px;
            cursor: pointer;
          }

          .cm-label-placeholder {
            height: 42px;
          }

          .cm-section-divider {
            display: flex;
            align-items: center;
            margin: 24px 0 16px;
            border-top: 1px solid #e2e5ea;
            padding-top: 16px;
          }

          .cm-section-divider-text {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            font-weight: 600;
            color: #667eea;
          }

          .cm-section-divider-text i {
            font-size: 16px;
          }

          .cm-modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding: 16px 24px;
            border-top: 1px solid #e2e5ea;
            background: #f8f9fa;
            border-radius: 0 0 0.5rem 0.5rem;
          }

          .cm-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            font-size: 14px;
            font-weight: 500;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .cm-btn-cancel {
            background: #fff;
            color: #4a5568;
            border: 1px solid #e2e5ea;
          }

          .cm-btn-cancel:hover {
            background: #f7fafc;
            border-color: #cbd5e0;
          }

          .cm-btn-submit {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff;
          }

          .cm-btn-submit:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          }

          @media (max-width: 768px) {
            .cm-form-grid-2 {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </Modal>
    );
  }
}

export default FormCreate;
