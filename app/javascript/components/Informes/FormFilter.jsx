import React, { Component } from "react";
import Select from "react-select";

const selectStyles = {
  control: (base, state) => ({
    ...base,
    fontFamily: "'Poppins', sans-serif",
    fontSize: "13px",
    borderColor: state.isFocused ? "#f5a623" : "#e2e5ea",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(245, 166, 35, 0.15)" : "none",
    borderRadius: "6px",
    minHeight: "38px",
    "&:hover": { borderColor: "#f5a623" },
  }),
  placeholder: (base) => ({ ...base, color: "#9ca3af", fontSize: "13px" }),
  option: (base, state) => ({
    ...base,
    fontFamily: "'Poppins', sans-serif",
    fontSize: "13px",
    backgroundColor: state.isSelected ? "#f5a623" : state.isFocused ? "#fef7ec" : "#fff",
    color: state.isSelected ? "#fff" : "#212529",
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: "#fef7ec",
    borderRadius: "4px",
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: "#f5a623",
    fontWeight: 500,
    fontSize: "12px",
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: "#f5a623",
    "&:hover": { backgroundColor: "#f5a623", color: "#fff" },
  }),
};

const ToggleButtons = ({ value, options, onChange, name }) => (
  <span style={{ display: "inline-flex", marginLeft: 8, gap: 2 }}>
    {options.map((opt) => (
      <label
        key={opt.value}
        style={{
          display: "flex",
          alignItems: "center",
          padding: "2px 8px",
          borderRadius: 4,
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 500,
          fontFamily: "'Poppins', sans-serif",
          backgroundColor: value === opt.value ? "#f5a623" : "#f8f9fa",
          color: value === opt.value ? "#fff" : "#6c757d",
          border: `1px solid ${value === opt.value ? "#f5a623" : "#e2e5ea"}`,
          transition: "all 0.15s",
        }}
      >
        <input
          type="radio"
          name={name}
          value={opt.value}
          checked={value === opt.value}
          onChange={onChange}
          style={{ display: "none" }}
        />
        {opt.label}
      </label>
    ))}
  </span>
);

class FormFilter extends Component {
  close = () => {
    this.props.closeFilter(true);
  };

  render() {
    const f = this.props.formValuesFilter;

    return (
      <div style={{ marginBottom: 16 }}>
        <div className="cm-dt" style={{ overflow: "visible" }}>
          {/* Header */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--cm-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: 13, fontWeight: 600, color: "var(--cm-text-muted)" }}>
              <i className="fas fa-filter" style={{ marginRight: 8, opacity: 0.6 }} />
              Filtros avanzados
            </span>
            <button onClick={this.close} className="cm-dt-action-btn" title="Cerrar filtros" style={{ width: 28, height: 28 }}>
              <i className="fas fa-times" />
            </button>
          </div>

          {/* Content - Grid de 4 columnas */}
          <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>

            {/* Row 1 */}
            <div className="cm-form-group" style={{ marginBottom: 0 }}>
              <label className="cm-label">Fecha desde</label>
              <input className="cm-input" type="date" name="start_date" onChange={this.props.onChangeFilter} value={f.start_date} style={{ height: 38 }} />
            </div>

            <div className="cm-form-group" style={{ marginBottom: 0 }}>
              <label className="cm-label">Fecha hasta</label>
              <input className="cm-input" type="date" name="end_date" onChange={this.props.onChangeFilter} value={f.date_hasta} style={{ height: 38 }} />
            </div>

            <div className="cm-form-group" style={{ marginBottom: 0 }}>
              <label className="cm-label">Tipo</label>
              <Select
                onChange={this.props.onChangeAutocompleteType}
                options={this.props.dataType}
                isMulti
                closeMenuOnSelect={false}
                styles={{ ...selectStyles, menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                placeholder="Todos..."
                noOptionsMessage={() => "Sin resultados"}
                menuPortalTarget={document.body}
              />
            </div>

            <div className="cm-form-group" style={{ marginBottom: 0 }}>
              <label className="cm-label">Estado ejecucion</label>
              <Select
                onChange={this.props.onChangeAutocompleteEjecucion}
                options={this.props.dataEjecucion}
                isMulti
                closeMenuOnSelect={false}
                styles={{ ...selectStyles, menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                placeholder="Todos..."
                noOptionsMessage={() => "Sin resultados"}
                menuPortalTarget={document.body}
              />
            </div>

            {/* Row 2 */}
            <div className="cm-form-group" style={{ marginBottom: 0, gridColumn: "span 2" }}>
              <label className="cm-label">
                Centro de costo
                <ToggleButtons
                  name="centro_incluido"
                  value={f.centro_incluido}
                  options={[
                    { value: "Incluidos", label: "Incluir" },
                    { value: "Excluidos", label: "Excluir" },
                  ]}
                  onChange={this.props.handleChangeCheckCentro}
                />
              </label>
              <Select
                onChange={this.props.onChangeAutocompleteCentro}
                options={this.props.centro}
                isMulti
                closeMenuOnSelect={false}
                styles={{ ...selectStyles, menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                placeholder="Seleccione centros de costo..."
                noOptionsMessage={() => "Sin resultados"}
                menuPortalTarget={document.body}
              />
            </div>

            <div className="cm-form-group" style={{ marginBottom: 0, gridColumn: "span 2" }}>
              <label className="cm-label">
                Clientes
                <ToggleButtons
                  name="cliente_incluido"
                  value={f.cliente_incluido}
                  options={[
                    { value: "Incluidos", label: "Incluir" },
                    { value: "Excluidos", label: "Excluir" },
                  ]}
                  onChange={this.props.handleChangeCheckClientes}
                />
              </label>
              <Select
                onChange={this.props.onChangeAutocompleteCustomer}
                options={this.props.clientes}
                isMulti
                closeMenuOnSelect={false}
                styles={{ ...selectStyles, menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                placeholder="Seleccione clientes..."
                noOptionsMessage={() => "Sin resultados"}
                menuPortalTarget={document.body}
              />
            </div>

            {/* Row 3 */}
            <div className="cm-form-group" style={{ marginBottom: 0, gridColumn: "span 2" }}>
              <label className="cm-label">Estado facturado</label>
              <Select
                onChange={this.props.onChangeAutocompleteFacturado}
                options={this.props.dataFacturado}
                isMulti
                closeMenuOnSelect={false}
                styles={{ ...selectStyles, menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                placeholder="Todos..."
                noOptionsMessage={() => "Sin resultados"}
                menuPortalTarget={document.body}
              />
            </div>

            <div style={{ gridColumn: "span 2", display: "flex", alignItems: "flex-end", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={this.props.cancelFilter} className="cm-btn cm-btn-outline cm-btn-sm" type="button">
                <i className="fas fa-eraser" /> Limpiar
              </button>
              <button onClick={this.props.onClick} className="cm-btn cm-btn-accent cm-btn-sm" type="button">
                <i className="fas fa-search" /> Aplicar filtros
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default FormFilter;
