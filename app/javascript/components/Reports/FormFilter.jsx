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
  constructor(props) {
    super(props);
    this.state = {
      show_btn: false,
      reports: [],
    };
  }

  close = () => {
    this.props.closeFilter(true);
    this.setState({ show_btn: false });
  };

  componentDidMount = () => {
    let array = [];
    this.props.data.map((item) => array.push({ label: item.code_report, value: item.code_report }));
    this.setState({ reports: array });
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
              <label className="cm-label">
                <i className="fas fa-file-alt" style={{ marginRight: 6, opacity: 0.5 }} />
                Descripción del trabajo
              </label>
              <input
                className="cm-input"
                type="text"
                name="work_description"
                placeholder="Buscar por descripción..."
                onChange={this.props.onChangeFilter}
                value={f.work_description}
              />
            </div>

            <div className="cm-form-group" style={{ marginBottom: 0 }}>
              <label className="cm-label">
                <i className="fas fa-user" style={{ marginRight: 6, opacity: 0.5 }} />
                Responsable
              </label>
              <Select
                onChange={this.props.onChangeAutocompleteUser}
                options={this.props.users}
                value={this.props.formAutocompleteUser}
                styles={{ ...selectStyles, menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                placeholder="Seleccione responsable..."
                noOptionsMessage={() => "Sin resultados"}
                menuPortalTarget={document.body}
                isClearable
              />
            </div>

            <div className="cm-form-group" style={{ marginBottom: 0 }}>
              <label className="cm-label">
                <i className="fas fa-calendar" style={{ marginRight: 6, opacity: 0.5 }} />
                Fecha ejecución
              </label>
              <input
                className="cm-input"
                type="date"
                name="date_ejecution"
                onChange={this.props.onChangeFilter}
                value={f.date_ejecution}
                style={{ height: 38 }}
              />
            </div>

            <div className="cm-form-group" style={{ marginBottom: 0 }}>
              <label className="cm-label">
                <i className="fas fa-flag" style={{ marginRight: 6, opacity: 0.5 }} />
                Estado
              </label>
              <select
                className="cm-input"
                name="report_sate"
                onChange={this.props.onChangeFilter}
                value={f.report_sate}
                style={{ height: 38 }}
              >
                <option value="">Seleccione estado...</option>
                <option value="Aprobado">Aprobado</option>
                <option value="Si Aprobado">Sin Aprobar</option>
              </select>
            </div>

            {/* Row 2 */}
            <div className="cm-form-group" style={{ marginBottom: 0 }}>
              <label className="cm-label">
                <i className="fas fa-map-marker-alt" style={{ marginRight: 6, opacity: 0.5 }} />
                Centro de costo
                <span style={{ fontSize: 10, color: "#9ca3af", marginLeft: 4 }}>(escribe 3+ letras)</span>
              </label>
              <Select
                onChange={this.props.onChangeAutocompleteCentro}
                options={this.props.centro}
                value={this.props.formAutocompleteCentro}
                styles={{ ...selectStyles, menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                placeholder="Buscar centro de costo..."
                noOptionsMessage={() => "Sin resultados"}
                menuPortalTarget={document.body}
                isClearable
              />
            </div>

            <div className="cm-form-group" style={{ marginBottom: 0 }}>
              <label className="cm-label">
                <i className="fas fa-building" style={{ marginRight: 6, opacity: 0.5 }} />
                Cliente
              </label>
              <Select
                onChange={this.props.onChangeAutocompleteCustomer}
                options={this.props.clientes}
                value={this.props.formAutocompleteCustomer}
                styles={{ ...selectStyles, menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                placeholder="Seleccione cliente..."
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
                name="date_desde"
                onChange={this.props.onChangeFilter}
                value={f.date_desde}
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
                name="date_hasta"
                onChange={this.props.onChangeFilter}
                value={f.date_hasta}
                style={{ height: 38 }}
              />
            </div>

            {/* Row 3 */}
            <div className="cm-form-group" style={{ marginBottom: 0, gridColumn: "span 2" }}>
              <label className="cm-label">
                <i className="fas fa-barcode" style={{ marginRight: 6, opacity: 0.5 }} />
                Código de reporte
              </label>
              <input
                className="cm-input"
                type="text"
                name="code_report"
                placeholder="Buscar por código..."
                onChange={this.props.onChangeFilter}
                value={f.code_report}
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
