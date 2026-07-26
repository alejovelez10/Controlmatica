import React from 'react';
import NumberFormat from 'react-number-format';
import Select from "react-select";
import { Modal, ModalBody } from "reactstrap";

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

class FormCreate extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      costCenterInputValue: "",
      costCenterOptions: props.centro || [],
      isLoadingCostCenter: false,
    };
    this.debounceTimer = null;
  }

  componentDidUpdate(prevProps) {
    if (prevProps.centro !== this.props.centro && this.state.costCenterInputValue === "") {
      this.setState({ costCenterOptions: this.props.centro || [] });
    }
  }

  handleSubmit = (e) => {
    e.preventDefault();
  };

  handleCostCenterInputChange = (inputValue, { action }) => {
    if (action === "input-change") {
      this.setState({ costCenterInputValue: inputValue });

      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      if (inputValue.length >= 2) {
        this.setState({ isLoadingCostCenter: true });
        this.debounceTimer = setTimeout(() => {
          const filtered = (this.props.centro || []).filter((option) =>
            option.label.toLowerCase().includes(inputValue.toLowerCase())
          );
          this.setState({
            costCenterOptions: filtered,
            isLoadingCostCenter: false,
          });
        }, 300);
      } else {
        this.setState({
          costCenterOptions: [],
          isLoadingCostCenter: false,
        });
      }
    }
    return inputValue;
  };

  render() {
    const p = this.props;
    const title = p.titulo || "Orden de compra";
    const showCostCenter = p.cost_center_id === undefined;

    return (
      <React.Fragment>
        <Modal
          returnFocusAfterClose={true}
          isOpen={p.modal}
          className="modal-dialog-centered modal-lg"
          toggle={p.toggle}
          backdrop="static"
        >
          <div className="cm-modal-container">
            <div className="cm-modal-header">
              <div className="cm-modal-header-content">
                <div className="cm-modal-icon">
                  <i className="fas fa-shopping-cart"></i>
                </div>
                <div>
                  <h2 className="cm-modal-title">{title}</h2>
                  <p className="cm-modal-subtitle">Complete los datos de la nueva orden</p>
                </div>
              </div>
              <button type="button" className="cm-modal-close" onClick={p.toggle}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={this.handleSubmit}>
              <ModalBody className="cm-modal-body">
                <div className="cm-form-grid-2">
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fas fa-calendar-alt"></i> Fecha de generacion <span className="cm-required">*</span>
                    </label>
                    <input
                      type="date"
                      name="created_date"
                      value={p.formValues.created_date}
                      onChange={p.onChangeForm}
                      className={"cm-input" + (p.errorValues === false && p.formValues.created_date === "" ? " cm-input-error" : "")}
                    />
                  </div>

                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fas fa-hashtag"></i> Numero de orden <span className="cm-required">*</span>
                    </label>
                    <input
                      type="text"
                      name="order_number"
                      value={p.formValues.order_number}
                      onChange={p.onChangeForm}
                      className={"cm-input" + (p.errorValues === false && p.formValues.order_number === "" ? " cm-input-error" : "")}
                      placeholder="Numero de orden"
                    />
                  </div>

                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fas fa-dollar-sign"></i> Valor <span className="cm-required">*</span>
                    </label>
                    <NumberFormat
                      name="order_value"
                      thousandSeparator={true}
                      prefix={"$"}
                      className={"cm-input" + (p.errorValues === false && p.formValues.order_value === "" ? " cm-input-error" : "")}
                      value={p.formValues.order_value}
                      onChange={p.onChangeForm}
                      placeholder="Valor"
                    />
                  </div>

                  {showCostCenter && (
                    <div className="cm-form-group">
                      <input
                        type="hidden"
                        name="cost_center_id"
                        value={p.formAutocompleteCentro.value}
                      />
                      <label className="cm-label">
                        <i className="fas fa-building"></i> Centro de costo{" "}
                        <span className="cm-hint">(escribe al menos 2 letras)</span>
                      </label>
                      <Select
                        onChange={p.onChangeAutocompleteCentro}
                        onInputChange={this.handleCostCenterInputChange}
                        options={this.state.costCenterOptions}
                        isLoading={this.state.isLoadingCostCenter}
                        autoFocus={false}
                        className={p.errorValues === false && p.formValues.cost_center_id === "" ? "cm-select-error" : ""}
                        value={p.formAutocompleteCentro}
                        placeholder="Centro de costos"
                        styles={selectStyles}
                        menuPortalTarget={document.body}
                        noOptionsMessage={() =>
                          this.state.costCenterInputValue.length < 2
                            ? "Escribe al menos 2 letras para buscar"
                            : "No se encontraron resultados"
                        }
                      />
                    </div>
                  )}

                  <div className="cm-form-group cm-full-width">
                    <label className="cm-label">
                      <i className="fas fa-file-upload"></i> Archivo <span className="cm-required">*</span>
                    </label>
                    <input
                      type="file"
                      name="reception_report_file"
                      onChange={p.onChangehandleFileOrderFile}
                      className="cm-input cm-input-file"
                      placeholder="Comprobante"
                    />
                  </div>

                  <div className="cm-form-group cm-full-width">
                    <label className="cm-label">
                      <i className="fas fa-align-left"></i> Descripcion
                    </label>
                    <textarea
                      name="description"
                      value={p.formValues.description}
                      onChange={p.onChangeForm}
                      rows="3"
                      className="cm-input cm-textarea"
                      placeholder="Descripcion..."
                    />
                  </div>
                </div>

                {p.errorValues === false && (
                  <div className="cm-alert cm-alert-error">
                    <i className="fas fa-exclamation-circle"></i>
                    <span>Debes de completar todos los campos requeridos</span>
                  </div>
                )}
              </ModalBody>

              <div className="cm-modal-footer">
                <button type="button" className="cm-btn cm-btn-cancel" onClick={p.toggle}>
                  <i className="fas fa-times"></i> Cancelar
                </button>
                <button type="submit" className="cm-btn cm-btn-submit" onClick={p.submit} disabled={p.isLoading}>
                  {p.isLoading ? (
                    <React.Fragment>
                      <i className="fas fa-spinner fa-spin"></i> Procesando...
                    </React.Fragment>
                  ) : (
                    <React.Fragment>
                      <i className="fas fa-save"></i> {p.nameSubmit}
                    </React.Fragment>
                  )}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      </React.Fragment>
    );
  }
}

export default FormCreate;
