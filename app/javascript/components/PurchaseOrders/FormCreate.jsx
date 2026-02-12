import React from 'react';
import NumberFormat from 'react-number-format';
import Select from "react-select";
import { CmModal, CmButton } from "../../generalcomponents/ui";

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
      <CmModal
        isOpen={p.modal}
        toggle={p.toggle}
        title={
          <div className="cm-form-header">
            <i className="fas fa-shopping-cart cm-form-header-icon" />
            <span>{title}</span>
          </div>
        }
        size="lg"
        footer={
          <div className="cm-form-footer">
            <CmButton variant="outline" onClick={p.toggle}>
              <i className="fas fa-times" /> Cancelar
            </CmButton>
            <CmButton variant="accent" onClick={p.submit} disabled={p.isLoading}>
              {p.isLoading ? (
                <span>
                  <i className="fas fa-spinner fa-spin" /> Creando...
                </span>
              ) : (
                <span>
                  <i className="fas fa-save" /> {p.nameSubmit}
                </span>
              )}
            </CmButton>
          </div>
        }
      >
        <form onSubmit={this.handleSubmit}>
          <div className="cm-form-grid-2">
            <div className="cm-form-group">
              <label className="cm-label">
                <i className="fas fa-calendar-alt" /> Fecha de generacion <span className="cm-required">*</span>
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
                <i className="fas fa-hashtag" /> Numero de orden <span className="cm-required">*</span>
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
          </div>

          <div className={showCostCenter ? "cm-form-grid-2" : ""}>
            <div className="cm-form-group">
              <label className="cm-label">
                <i className="fas fa-dollar-sign" /> Valor <span className="cm-required">*</span>
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
                  <i className="fas fa-building" /> Centro de costo{" "}
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
          </div>

          <div className="cm-form-group">
            <label className="cm-label">
              <i className="fas fa-file-upload" /> Archivo <span className="cm-required">*</span>
            </label>
            <input
              type="file"
              name="reception_report_file"
              onChange={p.onChangehandleFileOrderFile}
              className="cm-input cm-input-file"
              placeholder="Comprobante"
            />
          </div>

          <div className="cm-form-group">
            <label className="cm-label">
              <i className="fas fa-align-left" /> Descripcion
            </label>
            <textarea
              name="description"
              value={p.formValues.description}
              onChange={p.onChangeForm}
              rows="4"
              className="cm-input cm-textarea"
              placeholder="Descripcion..."
            />
          </div>

          {p.errorValues === false && (
            <div className="cm-alert cm-alert-error">
              <i className="fas fa-exclamation-circle" />
              <span>Debes de completar todos los campos requeridos</span>
            </div>
          )}
        </form>

        <style>{`
          .cm-form-header {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 1.25rem;
            font-weight: 600;
            color: #1a1a2e;
          }
          .cm-form-header-icon {
            color: #f5a623;
            font-size: 1.3rem;
          }
          .cm-form-grid-2 {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }
          @media (max-width: 768px) {
            .cm-form-grid-2 {
              grid-template-columns: 1fr;
            }
          }
          .cm-form-group {
            margin-bottom: 16px;
          }
          .cm-label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            font-weight: 400;
            color: #374151;
            margin-bottom: 6px;
          }
          .cm-label i {
            color: #6b7280;
            font-size: 13px;
          }
          .cm-required {
            color: #dc3545;
            font-weight: 600;
          }
          .cm-hint {
            font-size: 11px;
            color: #9ca3af;
            font-weight: 400;
          }
          .cm-input {
            width: 100%;
            padding: 10px 14px;
            font-size: 14px;
            border: 1px solid #e2e5ea;
            border-radius: 8px;
            background: #fcfcfd;
            transition: all 0.2s ease;
            box-sizing: border-box;
          }
          .cm-input:focus {
            outline: none;
            border-color: #f5a623;
            box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.15);
            background: #fff;
          }
          .cm-input::placeholder {
            color: #9ca3af;
          }
          .cm-input-error {
            border-color: #dc3545 !important;
            box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.15) !important;
          }
          .cm-select-error .css-yk16xz-control,
          .cm-select-error .css-1pahdxg-control {
            border-color: #dc3545 !important;
            box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.15) !important;
          }
          .cm-input-file {
            padding: 8px 14px;
            cursor: pointer;
          }
          .cm-textarea {
            resize: vertical;
            min-height: 100px;
          }
          .cm-alert {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            margin-top: 16px;
          }
          .cm-alert-error {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #dc2626;
          }
          .cm-alert-error i {
            font-size: 16px;
          }
          .cm-form-footer {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding-top: 8px;
          }
        `}</style>
      </CmModal>
    );
  }
}

export default FormCreate;
