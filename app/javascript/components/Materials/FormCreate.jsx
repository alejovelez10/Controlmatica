import React from "react";
import NumberFormat from "react-number-format";
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
      costCenterOptions: [],
      isLoadingCostCenter: false,
      searchTimeout: null,
    };
  }

  handleCostCenterInputChange = (inputValue, { action }) => {
    if (action !== "input-change") return;

    if (this.state.searchTimeout) {
      clearTimeout(this.state.searchTimeout);
    }

    if (inputValue.length >= 3) {
      this.setState({ isLoadingCostCenter: true });
      const timeout = setTimeout(() => {
        fetch("/search_cost_centers?q=" + encodeURIComponent(inputValue))
          .then((response) => response.json())
          .then((data) => {
            this.setState({ costCenterOptions: data || [], isLoadingCostCenter: false });
          })
          .catch(() => {
            this.setState({ costCenterOptions: [], isLoadingCostCenter: false });
          });
      }, 300);
      this.setState({ searchTimeout: timeout });
    } else {
      this.setState({ costCenterOptions: [], isLoadingCostCenter: false });
    }
  };

  render() {
    const p = this.props;
    const form = p.formValues;
    const errors = p.errors || [];
    const saving = p.isLoading;
    const isNew = !p.modeEdit;
    const title = p.titulo || (isNew ? "Nuevo Material" : "Editar Material");
    const hasCostCenter = p.cost_center_id != null && p.cost_center_id !== undefined;

    const providerOptions = (p.providerOptions || p.providers || []).map((item) =>
      item.label ? item : { label: item.name, value: item.id }
    );

    if (!p.modal) return null;

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
                  <i className="fas fa-boxes"></i>
                </div>
                <div>
                  <h2 className="cm-modal-title">{title}</h2>
                  <p className="cm-modal-subtitle">Complete los datos del material</p>
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
                    <span>Debes de completar todos los campos requeridos</span>
                  </div>
                )}

                {errors.length > 0 && (
                  <div className="cm-alert cm-alert-error">
                    <ul style={{ margin: 0, paddingLeft: "20px" }}>
                      {errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="cm-form-grid-2">
                  {/* Proveedor */}
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fas fa-truck"></i> Proveedor
                    </label>
                    <Select
                      options={providerOptions}
                      value={providerOptions.find((item) => item.value === form.provider_id) || null}
                      onChange={(opt) => {
                        const e = { target: { name: "provider_id", value: opt ? opt.value : "" } };
                        p.onChangeForm(e);
                      }}
                      placeholder="Seleccione proveedor"
                      styles={selectStyles}
                      menuPortalTarget={document.body}
                      isClearable
                    />
                  </div>

                  {/* Centro de Costo */}
                  {!hasCostCenter && (
                    <div className="cm-form-group">
                      <label className="cm-label">
                        <i className="fas fa-building"></i> Centro de Costo{" "}
                        <span className="cm-hint">(escribe al menos 3 letras)</span>
                      </label>
                      <Select
                        options={this.state.costCenterOptions}
                        value={p.formAutocompleteCentro}
                        onChange={p.onChangeAutocompleteCentro}
                        onInputChange={this.handleCostCenterInputChange}
                        isLoading={this.state.isLoadingCostCenter}
                        placeholder="Centro de costos"
                        styles={selectStyles}
                        menuPortalTarget={document.body}
                        noOptionsMessage={() => "Escribe al menos 3 letras para buscar"}
                      />
                    </div>
                  )}

                  {/* Fecha de Orden */}
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fas fa-calendar-alt"></i> Fecha de Orden
                    </label>
                    <input
                      type="date"
                      name="sales_date"
                      className="cm-input"
                      value={form.sales_date || ""}
                      onChange={p.onChangeForm}
                    />
                  </div>

                  {/* Numero de Orden */}
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fas fa-hashtag"></i> Numero de Orden
                    </label>
                    <input
                      type="text"
                      name="sales_number"
                      className="cm-input"
                      placeholder="Numero de orden"
                      value={form.sales_number || ""}
                      onChange={p.onChangeForm}
                    />
                  </div>

                  {/* Valor */}
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fas fa-dollar-sign"></i> Valor
                    </label>
                    <NumberFormat
                      name="amount"
                      thousandSeparator={true}
                      prefix="$"
                      className="cm-input"
                      value={form.amount || ""}
                      onChange={p.onChangeForm}
                      placeholder="Valor"
                    />
                  </div>

                  {/* Fecha Entrega */}
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fas fa-calendar-check"></i> Fecha Entrega
                    </label>
                    <input
                      type="date"
                      name="delivery_date"
                      className="cm-input"
                      value={form.delivery_date || ""}
                      onChange={p.onChangeForm}
                    />
                  </div>

                  {/* Estado */}
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fas fa-flag"></i> Estado
                    </label>
                    <select
                      className="cm-input"
                      name="sales_state"
                      value={form.sales_state || ""}
                      onChange={p.onChangeForm}
                    >
                      <option value="">Seleccione estado</option>
                      <option value="Pendiente">Pendiente</option>
                      <option value="Parcial">Parcial</option>
                      <option value="Entregado">Entregado</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>
                  </div>

                  {/* Descripcion - full width */}
                  <div className="cm-form-group cm-full-width">
                    <label className="cm-label">
                      <i className="fas fa-align-left"></i> Descripcion
                    </label>
                    <textarea
                      className="cm-input"
                      name="description"
                      rows="3"
                      value={form.description || ""}
                      onChange={p.onChangeForm}
                      placeholder="Descripcion del material"
                      style={{ resize: "vertical", minHeight: "80px" }}
                    />
                  </div>
                </div>
              </ModalBody>

              <div className="cm-modal-footer">
                <button type="button" className="cm-btn cm-btn-cancel" onClick={p.toggle}>
                  <i className="fas fa-times"></i> Cancelar
                </button>
                <button type="button" className="cm-btn cm-btn-submit" onClick={p.submit} disabled={saving}>
                  {saving ? (
                    <span><i className="fas fa-spinner fa-spin"></i> Guardando...</span>
                  ) : (
                    <span><i className="fas fa-save"></i> {p.nameSubmit || "Guardar"}</span>
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
