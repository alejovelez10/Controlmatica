import React, { Component } from 'react';
import { Modal, ModalBody, ModalFooter } from 'reactstrap';

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

// Inline styles
const styles = {
  modalContainer: {
    display: "flex",
    flexDirection: "column",
    maxHeight: "90vh"
  },
  header: {
    background: "#fcfcfd",
    padding: "20px 32px",
    borderBottom: "1px solid #e9ecef",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
    borderRadius: "0.5rem 0.5rem 0 0"
  },
  headerContent: {
    display: "flex",
    alignItems: "center",
    gap: "16px"
  },
  iconCircle: {
    width: "48px",
    height: "48px",
    background: "linear-gradient(135deg, #f5a623 0%, #f7b731 100%)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(245, 166, 35, 0.3)"
  },
  iconStyle: {
    color: "#fff",
    fontSize: "20px"
  },
  title: {
    margin: "0 0 2px 0",
    fontSize: "18px",
    fontWeight: 600,
    color: "#333"
  },
  subtitle: {
    margin: 0,
    fontSize: "12px",
    color: "#6c757d"
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
    transition: "all 0.2s"
  },
  body: {
    padding: "24px 32px",
    flex: 1,
    overflowY: "auto",
    maxHeight: "60vh"
  },
  formSection: {
    marginBottom: "16px"
  },
  formGrid2: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "16px"
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "6px",
    fontSize: "14px",
    fontWeight: 500,
    color: "#6b7280"
  },
  labelIcon: {
    color: "#6b7280",
    fontSize: "12px"
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #e2e5ea",
    borderRadius: "8px",
    fontSize: "14px",
    background: "#fcfcfd",
    transition: "all 0.2s",
    outline: "none",
    color: "#333"
  },
  colorInput: {
    width: "100%",
    height: "42px",
    padding: "4px",
    border: "1px solid #e2e5ea",
    borderRadius: "8px",
    background: "#fcfcfd",
    cursor: "pointer"
  },
  labelPlaceholder: {
    height: "42px"
  },
  sectionDivider: {
    display: "flex",
    alignItems: "center",
    margin: "24px 0 16px",
    borderTop: "1px solid #e2e5ea",
    paddingTop: "16px"
  },
  sectionDividerText: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    fontWeight: 600,
    color: "#f5a623"
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    padding: "16px 32px",
    background: "#fcfcfd",
    borderTop: "1px solid #e9ecef",
    flexShrink: 0,
    borderRadius: "0 0 0.5rem 0.5rem"
  },
  btnCancel: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: 500,
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    border: "1px solid #dee2e6",
    background: "#fff",
    color: "#6c757d"
  },
  btnSubmit: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: 500,
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    border: "none",
    background: "linear-gradient(135deg, #f5a623 0%, #f7b731 100%)",
    color: "#fff"
  }
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
        <div style={styles.modalContainer}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.headerContent}>
              <div style={styles.iconCircle}>
                <i className="fa fa-bell" style={styles.iconStyle} />
              </div>
              <div>
                <h2 style={styles.title}>{this.props.title}</h2>
                <p style={styles.subtitle}>
                  {isEdit ? "Modifique los parametros de la alerta" : "Configure los parametros de la nueva alerta"}
                </p>
              </div>
            </div>
            <button
              type="button"
              style={styles.closeButton}
              onClick={this.props.toggle}
              onMouseOver={(e) => { e.currentTarget.style.background = "#dc3545"; e.currentTarget.style.color = "#fff"; }}
              onMouseOut={(e) => { e.currentTarget.style.background = "#e9ecef"; e.currentTarget.style.color = "#6c757d"; }}
            >
              <i className="fa fa-times" />
            </button>
          </div>

          <form onSubmit={this.handleSubmit}>
            {/* Body */}
            <div style={styles.body}>
              {/* Name */}
              <div style={styles.formSection}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <i className="fa fa-tag" style={styles.labelIcon} /> Nombre
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={this.props.formValues.name}
                    onChange={this.props.onChangeForm}
                    style={styles.input}
                    placeholder="Nombre de la alerta"
                  />
                </div>
              </div>

              {/* Ingenieria Ejecucion */}
              <div style={styles.formSection}>
                <div style={styles.formGrid2}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <i className="fa fa-check-circle" style={{ ...styles.labelIcon, color: '#28a745' }} /> Ingenieria Ejecucion (Max Verde)
                    </label>
                    <input
                      type="number"
                      name="ing_ejecucion_min"
                      value={this.props.formValues.ing_ejecucion_min}
                      onChange={this.props.onChangeForm}
                      style={styles.input}
                      placeholder="Valor maximo verde"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <i className="fa fa-exclamation-circle" style={{ ...styles.labelIcon, color: '#f5a623' }} /> Ingenieria Ejecucion (Max Naranja)
                    </label>
                    <input
                      type="number"
                      name="ing_ejecucion_med"
                      value={this.props.formValues.ing_ejecucion_med}
                      onChange={this.props.onChangeForm}
                      style={styles.input}
                      placeholder="Valor maximo naranja"
                    />
                  </div>
                </div>
              </div>

              {/* Ingenieria Costo */}
              <div style={styles.formSection}>
                <div style={styles.formGrid2}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <i className="fa fa-check-circle" style={{ ...styles.labelIcon, color: '#28a745' }} /> Ingenieria Costo (Max Verde)
                    </label>
                    <input
                      type="number"
                      name="ing_costo_min"
                      value={this.props.formValues.ing_costo_min}
                      onChange={this.props.onChangeForm}
                      style={styles.input}
                      placeholder="Valor maximo verde"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <i className="fa fa-exclamation-circle" style={{ ...styles.labelIcon, color: '#f5a623' }} /> Ingenieria Costo (Max Naranja)
                    </label>
                    <input
                      type="number"
                      name="ing_costo_med"
                      value={this.props.formValues.ing_costo_med}
                      onChange={this.props.onChangeForm}
                      style={styles.input}
                      placeholder="Valor maximo naranja"
                    />
                  </div>
                </div>
              </div>

              {/* Tablerista Ejecucion */}
              <div style={styles.formSection}>
                <div style={styles.formGrid2}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <i className="fa fa-check-circle" style={{ ...styles.labelIcon, color: '#28a745' }} /> Tablerista Ejecucion (Max Verde)
                    </label>
                    <input
                      type="number"
                      name="tab_ejecucion_min"
                      value={this.props.formValues.tab_ejecucion_min}
                      onChange={this.props.onChangeForm}
                      style={styles.input}
                      placeholder="Valor maximo verde"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <i className="fa fa-exclamation-circle" style={{ ...styles.labelIcon, color: '#f5a623' }} /> Tablerista Ejecucion (Max Naranja)
                    </label>
                    <input
                      type="number"
                      name="tab_ejecucion_med"
                      value={this.props.formValues.tab_ejecucion_med}
                      onChange={this.props.onChangeForm}
                      style={styles.input}
                      placeholder="Valor maximo naranja"
                    />
                  </div>
                </div>
              </div>

              {/* Tablerista Costo */}
              <div style={styles.formSection}>
                <div style={styles.formGrid2}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <i className="fa fa-check-circle" style={{ ...styles.labelIcon, color: '#28a745' }} /> Tablerista Costo (Max Verde)
                    </label>
                    <input
                      type="number"
                      name="tab_costo_min"
                      value={this.props.formValues.tab_costo_min}
                      onChange={this.props.onChangeForm}
                      style={styles.input}
                      placeholder="Valor maximo verde"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <i className="fa fa-exclamation-circle" style={{ ...styles.labelIcon, color: '#f5a623' }} /> Tablerista Costo (Max Naranja)
                    </label>
                    <input
                      type="number"
                      name="tab_costo_med"
                      value={this.props.formValues.tab_costo_med}
                      onChange={this.props.onChangeForm}
                      style={styles.input}
                      placeholder="Valor maximo naranja"
                    />
                  </div>
                </div>
              </div>

              {/* Desplazamiento */}
              <div style={styles.formSection}>
                <div style={styles.formGrid2}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <i className="fa fa-check-circle" style={{ ...styles.labelIcon, color: '#28a745' }} /> Desplazamiento (Max Verde)
                    </label>
                    <input
                      type="number"
                      name="desp_min"
                      value={this.props.formValues.desp_min}
                      onChange={this.props.onChangeForm}
                      style={styles.input}
                      placeholder="Valor maximo verde"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <i className="fa fa-exclamation-circle" style={{ ...styles.labelIcon, color: '#f5a623' }} /> Desplazamiento (Max Naranja)
                    </label>
                    <input
                      type="number"
                      name="desp_med"
                      value={this.props.formValues.desp_med}
                      onChange={this.props.onChangeForm}
                      style={styles.input}
                      placeholder="Valor maximo naranja"
                    />
                  </div>
                </div>
              </div>

              {/* Materiales */}
              <div style={styles.formSection}>
                <div style={styles.formGrid2}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <i className="fa fa-check-circle" style={{ ...styles.labelIcon, color: '#28a745' }} /> Materiales (Max Verde)
                    </label>
                    <input
                      type="number"
                      name="mat_min"
                      value={this.props.formValues.mat_min}
                      onChange={this.props.onChangeForm}
                      style={styles.input}
                      placeholder="Valor maximo verde"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <i className="fa fa-exclamation-circle" style={{ ...styles.labelIcon, color: '#f5a623' }} /> Materiales (Max Naranja)
                    </label>
                    <input
                      type="number"
                      name="mat_med"
                      value={this.props.formValues.mat_med}
                      onChange={this.props.onChangeForm}
                      style={styles.input}
                      placeholder="Valor maximo naranja"
                    />
                  </div>
                </div>
              </div>

              {/* Viaticos */}
              <div style={styles.formSection}>
                <div style={styles.formGrid2}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <i className="fa fa-check-circle" style={{ ...styles.labelIcon, color: '#28a745' }} /> Viaticos (Max Verde)
                    </label>
                    <input
                      type="number"
                      name="via_min"
                      value={this.props.formValues.via_min}
                      onChange={this.props.onChangeForm}
                      style={styles.input}
                      placeholder="Valor maximo verde"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <i className="fa fa-exclamation-circle" style={{ ...styles.labelIcon, color: '#f5a623' }} /> Viaticos (Max Naranja)
                    </label>
                    <input
                      type="number"
                      name="via_med"
                      value={this.props.formValues.via_med}
                      onChange={this.props.onChangeForm}
                      style={styles.input}
                      placeholder="Valor maximo naranja"
                    />
                  </div>
                </div>
              </div>

              {/* Total */}
              <div style={styles.formSection}>
                <div style={styles.formGrid2}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <i className="fa fa-check-circle" style={{ ...styles.labelIcon, color: '#28a745' }} /> Total (Max Verde)
                    </label>
                    <input
                      type="number"
                      name="total_min"
                      value={this.props.formValues.total_min}
                      onChange={this.props.onChangeForm}
                      style={styles.input}
                      placeholder="Valor maximo verde"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <i className="fa fa-exclamation-circle" style={{ ...styles.labelIcon, color: '#f5a623' }} /> Total (Max Naranja)
                    </label>
                    <input
                      type="number"
                      name="total_med"
                      value={this.props.formValues.total_med}
                      onChange={this.props.onChangeForm}
                      style={styles.input}
                      placeholder="Valor maximo naranja"
                    />
                  </div>
                </div>
              </div>

              {/* Configuracion de horas por mes */}
              <div style={styles.sectionDivider}>
                <span style={styles.sectionDividerText}>
                  <i className="fa fa-calendar" /> Configuracion de horas por mes
                </span>
              </div>

              <div style={styles.formSection}>
                <div style={styles.formGrid2}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <i className="fa fa-minus-circle" style={styles.labelIcon} /> Menor o igual (Valor)
                    </label>
                    <input
                      type="number"
                      name="alert_min"
                      value={this.props.formValues.alert_min}
                      onChange={this.props.onChangeForm}
                      style={styles.input}
                      placeholder="Valor"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <i className="fa fa-palette" style={styles.labelIcon} /> Color
                    </label>
                    <input
                      type="color"
                      name="color_min"
                      value={this.props.formValues.color_min}
                      onChange={this.props.onChangeForm}
                      style={styles.colorInput}
                    />
                  </div>
                </div>
              </div>

              <div style={styles.formSection}>
                <div style={styles.formGrid2}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <i className="fa fa-arrows-alt-h" style={styles.labelIcon} /> Mayor que anterior y menor que
                    </label>
                    <input
                      type="number"
                      name="alert_med"
                      value={this.props.formValues.alert_med}
                      onChange={this.props.onChangeForm}
                      style={styles.input}
                      placeholder="Valor"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <i className="fa fa-palette" style={styles.labelIcon} /> Color
                    </label>
                    <input
                      type="color"
                      name="color_mid"
                      value={this.props.formValues.color_mid}
                      onChange={this.props.onChangeForm}
                      style={styles.colorInput}
                    />
                  </div>
                </div>
              </div>

              <div style={styles.formSection}>
                <div style={styles.formGrid2}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <i className="fa fa-plus-circle" style={styles.labelIcon} /> Mayor o igual al valor anterior
                    </label>
                    <div style={styles.labelPlaceholder}></div>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <i className="fa fa-palette" style={styles.labelIcon} /> Color
                    </label>
                    <input
                      type="color"
                      name="color_max"
                      value={this.props.formValues.color_max}
                      onChange={this.props.onChangeForm}
                      style={styles.colorInput}
                    />
                  </div>
                </div>
              </div>

              {/* Configuracion horas por dia */}
              <div style={styles.sectionDivider}>
                <span style={styles.sectionDividerText}>
                  <i className="fa fa-clock" /> Configuracion horas por dia
                </span>
              </div>

              <div style={styles.formSection}>
                <div style={styles.formGrid2}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <i className="fa fa-minus-circle" style={styles.labelIcon} /> Menor o igual (Valor)
                    </label>
                    <input
                      type="number"
                      name="alert_hour_min"
                      value={this.props.formValues.alert_hour_min}
                      onChange={this.props.onChangeForm}
                      style={styles.input}
                      placeholder="Valor"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <i className="fa fa-palette" style={styles.labelIcon} /> Color
                    </label>
                    <input
                      type="color"
                      name="color_hour_min"
                      value={this.props.formValues.color_hour_min}
                      onChange={this.props.onChangeForm}
                      style={styles.colorInput}
                    />
                  </div>
                </div>
              </div>

              <div style={styles.formSection}>
                <div style={styles.formGrid2}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <i className="fa fa-arrows-alt-h" style={styles.labelIcon} /> Mayor que anterior y menor que
                    </label>
                    <input
                      type="number"
                      name="alert_hour_med"
                      value={this.props.formValues.alert_hour_med}
                      onChange={this.props.onChangeForm}
                      style={styles.input}
                      placeholder="Valor"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <i className="fa fa-palette" style={styles.labelIcon} /> Color
                    </label>
                    <input
                      type="color"
                      name="color_hour_med"
                      value={this.props.formValues.color_hour_med}
                      onChange={this.props.onChangeForm}
                      style={styles.colorInput}
                    />
                  </div>
                </div>
              </div>

              <div style={styles.formSection}>
                <div style={styles.formGrid2}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <i className="fa fa-plus-circle" style={styles.labelIcon} /> Mayor o igual al valor anterior
                    </label>
                    <div style={styles.labelPlaceholder}></div>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <i className="fa fa-palette" style={styles.labelIcon} /> Color
                    </label>
                    <input
                      type="color"
                      name="color_hour_max"
                      value={this.props.formValues.color_hour_max}
                      onChange={this.props.onChangeForm}
                      style={styles.colorInput}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={styles.footer}>
              <button
                type="button"
                style={styles.btnCancel}
                onClick={() => this.props.toggle()}
              >
                <i className="fa fa-times" /> Cerrar
              </button>
              <button
                type="button"
                style={styles.btnSubmit}
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
