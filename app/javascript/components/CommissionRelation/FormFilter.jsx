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
};

class FormFilter extends Component {
  close = () => {
    this.props.filter(false);
  };

  render() {
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
              <label className="cm-label">
                <i className="fas fa-user-tie" style={{ marginRight: 6, opacity: 0.5 }} />
                Director
              </label>
              <Select
                onChange={this.props.handleChangeAutocompleteUserDirection}
                options={this.props.users}
                value={this.props.selectedOptionUserDirection}
                styles={{ ...selectStyles, menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                placeholder="Seleccione director..."
                noOptionsMessage={() => "Sin resultados"}
                menuPortalTarget={document.body}
                isClearable
              />
            </div>

            <div className="cm-form-group" style={{ marginBottom: 0 }}>
              <label className="cm-label">
                <i className="fas fa-user" style={{ marginRight: 6, opacity: 0.5 }} />
                Empleado
              </label>
              <Select
                onChange={this.props.handleChangeAutocompleteUserReport}
                options={this.props.users}
                value={this.props.selectedOptionUserReport}
                styles={{ ...selectStyles, menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                placeholder="Seleccione empleado..."
                noOptionsMessage={() => "Sin resultados"}
                menuPortalTarget={document.body}
                isClearable
              />
            </div>

            <div className="cm-form-group" style={{ marginBottom: 0 }}>
              <label className="cm-label">
                <i className="fas fa-calendar" style={{ marginRight: 6, opacity: 0.5 }} />
                Fecha desde
              </label>
              <input
                className="cm-input"
                type="date"
                name="start_date"
                value={this.props.formValues.start_date}
                onChange={this.props.onChangeForm}
                style={{ height: 38 }}
              />
            </div>

            <div className="cm-form-group" style={{ marginBottom: 0 }}>
              <label className="cm-label">
                <i className="fas fa-calendar" style={{ marginRight: 6, opacity: 0.5 }} />
                Fecha hasta
              </label>
              <input
                className="cm-input"
                type="date"
                name="end_date"
                value={this.props.formValues.end_date}
                onChange={this.props.onChangeForm}
                style={{ height: 38 }}
              />
            </div>

            {/* Row 2 */}
            <div className="cm-form-group" style={{ marginBottom: 0 }}>
              <label className="cm-label">
                <i className="fas fa-calendar-plus" style={{ marginRight: 6, opacity: 0.5 }} />
                Fecha creación
              </label>
              <input
                className="cm-input"
                type="date"
                name="creation_date"
                value={this.props.formValues.creation_date}
                onChange={this.props.onChangeForm}
                style={{ height: 38 }}
              />
            </div>

            <div className="cm-form-group" style={{ marginBottom: 0 }}>
              <label className="cm-label">
                <i className="fas fa-building" style={{ marginRight: 6, opacity: 0.5 }} />
                Área
              </label>
              <input
                className="cm-input"
                type="text"
                name="area"
                value={this.props.formValues.area}
                onChange={this.props.onChangeForm}
                placeholder="Buscar por área..."
              />
            </div>

            <div className="cm-form-group" style={{ marginBottom: 0, gridColumn: "span 2" }}>
              <label className="cm-label">
                <i className="fas fa-comment-alt" style={{ marginRight: 6, opacity: 0.5 }} />
                Observaciones
              </label>
              <input
                className="cm-input"
                type="text"
                name="observations"
                value={this.props.formValues.observations}
                onChange={this.props.onChangeForm}
                placeholder="Buscar por observaciones..."
              />
            </div>

            {/* Botones */}
            <div style={{ gridColumn: "1 / 3" }}></div>
            <div style={{ gridColumn: "3 / 5", display: "flex", alignItems: "flex-end", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={this.props.cancelFilter} className="cm-btn cm-btn-outline cm-btn-sm" type="button">
                <i className="fas fa-eraser" /> Limpiar
              </button>
              <button onClick={() => this.props.HandleClickFilter()} className="cm-btn cm-btn-accent cm-btn-sm" type="button">
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
