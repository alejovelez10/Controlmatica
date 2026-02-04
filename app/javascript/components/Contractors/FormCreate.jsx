import React from "react";
import Select from "react-select";
import NumberFormat from "react-number-format";
import { CmModal, CmButton } from "../../generalcomponents/ui";

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

    return (
      <CmModal
        isOpen={p.modal}
        toggle={p.toggle}
        title={
          <div className="cm-form-header">
            <i className="fas fa-hard-hat cm-form-header-icon" />
            <span>{p.titulo}</span>
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
                  <i className="fas fa-spinner fa-spin" /> Guardando...
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
        {p.errorValues === false && (
          <div className="cm-alert cm-alert-error">
            <i className="fas fa-exclamation-circle" />
            <span>Debes completar todos los campos requeridos</span>
          </div>
        )}

        <div className="cm-form-grid-2">
          <div className="cm-form-group">
            <label className="cm-label">
              <i className="fas fa-calendar-alt" /> Fecha <span className="cm-required">*</span>
            </label>
            <input
              type="date"
              name="sales_date"
              value={p.formValues.sales_date}
              onChange={p.onChangeForm}
              className={"cm-input" + (p.errorValues === false && p.formValues.sales_date === "" ? " cm-input-error" : "")}
            />
          </div>

          <div className="cm-form-group">
            <label className="cm-label">
              <i className="fas fa-clock" /> Horas trabajadas <span className="cm-required">*</span>
            </label>
            <input
              type="text"
              name="hours"
              value={p.formValues.hours}
              onChange={p.onChangeForm}
              className={"cm-input" + (p.errorValues === false && p.formValues.hours === "" ? " cm-input-error" : "")}
              placeholder="Horas trabajadas"
            />
          </div>
        </div>

        <div className="cm-form-grid-2">
          <div className="cm-form-group">
            <label className="cm-label">
              <i className="fas fa-user" /> Realizado por <span className="cm-required">*</span>
            </label>
            <Select
              onChange={p.onChangeAutocompleteUsers}
              options={p.users}
              autoFocus={false}
              className={p.errorValues === false && p.formValues.user_execute_id === "" ? "cm-select-error" : ""}
              value={p.formAutocompleteUsers}
              placeholder="Seleccionar usuario"
              styles={selectStyles}
              menuPortalTarget={document.body}
            />
          </div>

          <div className="cm-form-group">
            <input
              type="hidden"
              name="cost_center_id"
              value={p.formAutocompleteCentro ? p.formAutocompleteCentro.value : ""}
            />
            <label className="cm-label">
              <i className="fas fa-building" /> Centro de costo{" "}
              <span className="cm-hint">(escribe al menos 2 letras)</span>{" "}
              <span className="cm-required">*</span>
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
        </div>

        <div className="cm-form-group">
          <label className="cm-label">
            <i className="fas fa-dollar-sign" /> Monto
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
            <i className="fas fa-align-left" /> Descripcion <span className="cm-required">*</span>
          </label>
          <textarea
            name="description"
            className={"cm-input cm-textarea" + (p.errorValues === false && p.formValues.description === "" ? " cm-input-error" : "")}
            value={p.formValues.description}
            onChange={p.onChangeForm}
            placeholder="Descripcion..."
            rows="4"
          />
        </div>

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
            background: #f8f9fa;
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
            margin-bottom: 16px;
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
