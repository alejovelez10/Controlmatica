import React from "react";
import { CmModal } from "../../generalcomponents/ui";
import NumberFormat from "react-number-format";
import Select from "react-select";

const selectStyles = {
  control: (base, state) => ({
    ...base,
    fontFamily: "'Poppins', sans-serif",
    fontSize: "14px",
    borderColor: state.isFocused ? "#2a3f53" : "#e2e5ea",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(42, 63, 83, 0.1)" : "none",
    borderRadius: "6px",
    minHeight: "42px",
    "&:hover": { borderColor: "#2a3f53" },
  }),
  placeholder: (base) => ({ ...base, color: "#9ca3af" }),
  option: (base, state) => ({
    ...base,
    fontFamily: "'Poppins', sans-serif",
    fontSize: "13px",
    backgroundColor: state.isSelected ? "#2a3f53" : state.isFocused ? "#f5f6fa" : "#fff",
    color: state.isSelected ? "#fff" : "#212529",
  }),
};

class FormCreate extends React.Component {
  renderField = (label, content, required) => (
    <div className="cm-form-group">
      <label className="cm-label">
        {label} {required && <span style={{ color: "var(--cm-danger)" }}>*</span>}
      </label>
      {content}
    </div>
  );

  renderInput = (name, label, opts = {}) => {
    const { formValues, errorValues, onChangeForm, modeEdit } = this.props;
    const hasError = errorValues === false && formValues[name] === "";
    const isMoney = opts.money;
    const disabled = opts.disabled || (formValues.has_many_quotes && modeEdit);

    const inputClass = `cm-input${hasError ? " cm-input-error" : ""}`;

    const input = isMoney ? (
      <NumberFormat
        name={name}
        thousandSeparator={true}
        prefix="$"
        className={inputClass}
        value={formValues[name]}
        onChange={onChangeForm}
        placeholder={opts.placeholder || label}
        disabled={disabled}
      />
    ) : (
      <input
        name={name}
        type={opts.type || "text"}
        className={inputClass}
        value={formValues[name]}
        onChange={onChangeForm}
        placeholder={opts.placeholder || label}
        disabled={disabled}
      />
    );

    return this.renderField(label, input, opts.required !== false);
  };

  renderSelect = (name, label, options, props) => {
    const { formValues, errorValues, onChangeForm, modeEdit } = this.props;
    const hasError = errorValues === false && formValues[name] === "";

    return this.renderField(
      label,
      <select
        name={name}
        className={`cm-input${hasError ? " cm-input-error" : ""}`}
        value={formValues[name]}
        onChange={onChangeForm}
        disabled={(props && props.disabled) || false}
      >
        <option value="">Seleccione...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>,
      true
    );
  };

  renderAutocomplete = (label, value, onChange, options) => {
    const hasError = this.props.errorValues === false && (!value || !value.value);
    return this.renderField(
      label,
      <Select
        onChange={onChange}
        options={options}
        value={value}
        styles={selectStyles}
        placeholder="Buscar..."
        noOptionsMessage={() => "Sin resultados"}
        className={hasError ? "cm-select-error" : ""}
      />,
      true
    );
  };

  sectionDivider = (title) => (
    <div style={{ gridColumn: "1 / -1", margin: "8px 0 4px" }}>
      {title && (
        <div style={{
          fontSize: "12px",
          fontWeight: 600,
          color: "var(--cm-text-light)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: 8,
        }}>
          <i className="fas fa-chevron-right" style={{ fontSize: 9, marginRight: 6 }} />
          {title}
        </div>
      )}
      <hr style={{ margin: 0, borderColor: "var(--cm-border)" }} />
    </div>
  );

  getServiceFields = () => {
    const type = this.props.formValues.service_type;
    if (!type) return null;

    return (
      <React.Fragment>
        {(type === "SERVICIO" || type === "PROYECTO") && (
          <React.Fragment>
            {this.sectionDivider("Ingenieria")}
            {this.renderInput("eng_hours", "Horas ingenieria")}
            {this.props.estados.show_hours && this.renderInput("hour_real", "Valor hora costo", { money: true })}
            {this.renderInput("hour_cotizada", "Hora valor cotizada", { money: true })}
          </React.Fragment>
        )}

        {type === "PROYECTO" && (
          <React.Fragment>
            {this.sectionDivider("Tableristas")}
            {this.renderInput("hours_contractor", "Horas tablerista")}
            {this.props.estados.show_hours && this.renderInput("hours_contractor_real", "Valor hora costo", { money: true })}
            {this.renderInput("hours_contractor_invoices", "Valor hora cotizada", { money: true })}
          </React.Fragment>
        )}

        {(type === "SERVICIO" || type === "PROYECTO") && (
          <React.Fragment>
            {this.sectionDivider("Desplazamiento")}
            {this.renderInput("displacement_hours", "Horas de desplazamiento", { type: "number" })}
            {(type === "SERVICIO" || this.props.estados.show_hours) && this.renderInput("value_displacement_hours", "Valor hora desplazamiento", { money: true })}
          </React.Fragment>
        )}

        {this.sectionDivider("Valores")}

        {(type === "VENTA" || type === "PROYECTO") && this.renderInput("materials_value", "Valor materiales", { money: true })}
        {(type === "SERVICIO" || type === "PROYECTO") && this.renderInput("viatic_value", "Valor viaticos", { money: true })}
        {this.renderInput("quotation_value", "Total cotizacion", { money: true })}
      </React.Fragment>
    );
  };

  render() {
    const { modal, toggle, titulo, submit, FormSubmit, isLoading, nameSubmit, errorValues } = this.props;
    const isEdit = this.props.modeEdit;
    const icon = isEdit ? "fas fa-edit" : "fas fa-folder-plus";

    const footer = (
      <React.Fragment>
        <button className="cm-btn cm-btn-outline" onClick={() => toggle()}>
          Cancelar
        </button>
        <button className="cm-btn cm-btn-accent" onClick={submit} disabled={isLoading}>
          {isLoading ? (
            <React.Fragment><i className="fas fa-spinner fa-spin" /> Procesando...</React.Fragment>
          ) : (
            <React.Fragment><i className="fas fa-save" /> {nameSubmit}</React.Fragment>
          )}
        </button>
      </React.Fragment>
    );

    return (
      <CmModal
        isOpen={modal}
        toggle={() => toggle()}
        title={<span><i className={icon} style={{ marginRight: 8 }} />{titulo}</span>}
        size="lg"
        footer={footer}
      >
        <form onSubmit={FormSubmit}>
          <div className="cm-form-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
            {this.renderAutocomplete(
              "Cliente",
              this.props.formAutocomplete,
              this.props.onChangeAutocomplete,
              this.props.clientes
            )}
            {this.renderAutocomplete(
              "Contacto",
              this.props.formAutocompleteContact,
              this.props.onChangeAutocompleteContact,
              this.props.contacto
            )}
            {this.renderSelect(
              "service_type",
              "Tipo de Servicio",
              [
                { value: "SERVICIO", label: "SERVICIO" },
                { value: "VENTA", label: "VENTA" },
                { value: "PROYECTO", label: "PROYECTO" },
              ],
              { disabled: isEdit }
            )}

            <div className="cm-form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="cm-label">Descripcion</label>
              <textarea
                name="description"
                className="cm-input"
                value={this.props.formValues.description}
                onChange={this.props.onChangeForm}
                rows="3"
                placeholder="Descripcion del centro de costo"
                style={{ resize: "vertical" }}
              />
            </div>

            {this.renderInput("start_date", "Fecha de inicio", { type: "date" })}
            {this.renderInput("end_date", "Fecha final", { type: "date" })}
            {this.renderInput("quotation_number", "Numero de cotizacion")}

            {this.renderAutocomplete(
              "Propietario",
              this.props.formAutocompleteUserOwner,
              this.props.onChangeAutocompleteUserOwner,
              this.props.users
            )}

            {this.getServiceFields()}
          </div>

          {errorValues === false && (
            <div className="cm-form-errors" style={{ marginTop: 16 }}>
              <ul>
                <li>Debes completar todos los campos requeridos</li>
              </ul>
            </div>
          )}
        </form>
      </CmModal>
    );
  }
}

export default FormCreate;
