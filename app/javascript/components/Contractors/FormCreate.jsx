import React from "react";
import Select from "react-select";
import NumberFormat from "react-number-format";
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
      costCenterOptions: [],
      isLoadingCostCenter: false,
    };
    this.debounceTimer = null;
  }

  handleCostCenterInputChange = (inputValue, { action }) => {
    if (action === "input-change") {
      this.setState({ costCenterInputValue: inputValue });

      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      if (inputValue.length >= 3) {
        this.setState({ isLoadingCostCenter: true });
        this.debounceTimer = setTimeout(() => {
          fetch("/search_cost_centers?q=" + encodeURIComponent(inputValue))
            .then((response) => response.json())
            .then((data) => {
              this.setState({
                costCenterOptions: data,
                isLoadingCostCenter: false,
              });
            })
            .catch(() => {
              this.setState({ costCenterOptions: [], isLoadingCostCenter: false });
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
    const hasError = (field) => p.errorValues === false && p.formValues[field] === "";

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
                  <i className="fas fa-tools"></i>
                </div>
                <div>
                  <h2 className="cm-modal-title">{p.titulo}</h2>
                  <p className="cm-modal-subtitle">Complete los datos del registro tablerista</p>
                </div>
              </div>
              <button type="button" className="cm-modal-close" onClick={p.toggle}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={(e) => e.preventDefault()}>
              <ModalBody className="cm-modal-body cm-modal-scroll">
                {p.errorValues === false && (
                  <div className="cm-alert cm-alert-error">
                    <i className="fas fa-exclamation-circle"></i>
                    <span>Debes completar todos los campos requeridos</span>
                  </div>
                )}

                <div className="cm-form-grid-2">
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fas fa-calendar-alt"></i> Fecha <span className="cm-required">*</span>
                    </label>
                    <input
                      type="date"
                      name="sales_date"
                      value={p.formValues.sales_date}
                      onChange={p.onChangeForm}
                      className={"cm-input" + (hasError("sales_date") ? " cm-input-error" : "")}
                    />
                  </div>

                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fas fa-clock"></i> Horas trabajadas <span className="cm-required">*</span>
                    </label>
                    <input
                      type="text"
                      name="hours"
                      value={p.formValues.hours}
                      onChange={p.onChangeForm}
                      className={"cm-input" + (hasError("hours") ? " cm-input-error" : "")}
                      placeholder="Horas trabajadas"
                    />
                  </div>

                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fas fa-user"></i> Realizado por <span className="cm-required">*</span>
                    </label>
                    <Select
                      onChange={p.onChangeAutocompleteUsers}
                      options={p.users}
                      autoFocus={false}
                      value={p.formAutocompleteUsers}
                      placeholder="Realizado por"
                      styles={{
                        ...selectStyles,
                        control: (base, state) => ({
                          ...selectStyles.control(base, state),
                          ...(p.errorValues === false && p.formValues.user_execute_id === ""
                            ? { borderColor: "#dc3545", boxShadow: "0 0 0 3px rgba(220, 53, 69, 0.15)" }
                            : {}),
                        }),
                      }}
                      menuPortalTarget={document.body}
                    />
                  </div>

                  {/* Centro de costo */}
                  {!p.cost_center_id && (
                    <div className="cm-form-group">
                      <input
                        type="hidden"
                        name="cost_center_id"
                        value={p.formAutocompleteCentro ? p.formAutocompleteCentro.value : ""}
                      />
                      <label className="cm-label">
                        <i className="fas fa-building"></i> Centro de costo{" "}
                        <span className="cm-hint">(escribe al menos 3 letras)</span>{" "}
                        <span className="cm-required">*</span>
                      </label>
                      <Select
                        onChange={p.onChangeAutocompleteCentro}
                        onInputChange={this.handleCostCenterInputChange}
                        options={this.state.costCenterOptions}
                        isLoading={this.state.isLoadingCostCenter}
                        autoFocus={false}
                        value={p.formAutocompleteCentro}
                        placeholder="Centro de costos"
                        styles={{
                          ...selectStyles,
                          control: (base, state) => ({
                            ...selectStyles.control(base, state),
                            ...(p.errorValues === false && p.formValues.cost_center_id === ""
                              ? { borderColor: "#dc3545", boxShadow: "0 0 0 3px rgba(220, 53, 69, 0.15)" }
                              : {}),
                          }),
                        }}
                        menuPortalTarget={document.body}
                        noOptionsMessage={() =>
                          this.state.costCenterInputValue.length < 3
                            ? "Escribe al menos 3 letras para buscar"
                            : "No se encontraron resultados"
                        }
                      />
                    </div>
                  )}
                </div>

                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fas fa-dollar-sign"></i> Monto
                  </label>
                  <NumberFormat
                    name="ammount"
                    value={p.formValues.ammount}
                    thousandSeparator={true}
                    prefix="$"
                    className="cm-input"
                    placeholder="$0"
                    onValueChange={(values) => {
                      const ev = { target: { name: "ammount", value: values.formattedValue } };
                      p.onChangeForm(ev);
                    }}
                  />
                </div>

                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fas fa-align-left"></i> Descripcion <span className="cm-required">*</span>
                  </label>
                  <textarea
                    name="description"
                    className={"cm-input" + (hasError("description") ? " cm-input-error" : "")}
                    value={p.formValues.description}
                    onChange={p.onChangeForm}
                    placeholder="Descripcion..."
                    rows="4"
                    style={{ resize: "vertical", minHeight: "100px" }}
                  />
                </div>
              </ModalBody>

              <div className="cm-modal-footer">
                <button type="button" className="cm-btn cm-btn-cancel" onClick={p.toggle}>
                  <i className="fas fa-times"></i> Cancelar
                </button>
                <button type="button" className="cm-btn cm-btn-submit" onClick={p.submit} disabled={p.isLoading}>
                  {p.isLoading ? (
                    <span><i className="fas fa-spinner fa-spin"></i> Guardando...</span>
                  ) : (
                    <span><i className="fas fa-save"></i> {p.nameSubmit}</span>
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
