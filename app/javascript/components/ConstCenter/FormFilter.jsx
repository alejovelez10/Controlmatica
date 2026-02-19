import React, { Component } from "react";
import Select from "react-select";

const selectStyles = {
  control: (base, state) => ({
    ...base,
    fontFamily: "'Poppins', sans-serif",
    fontSize: "13px",
    borderColor: state.isFocused ? "#2a3f53" : "#e2e5ea",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(42, 63, 83, 0.1)" : "none",
    borderRadius: "6px",
    minHeight: "38px",
    "&:hover": { borderColor: "#2a3f53" },
  }),
  placeholder: (base) => ({ ...base, color: "#9ca3af", fontSize: "13px" }),
  option: (base, state) => ({
    ...base,
    fontFamily: "'Poppins', sans-serif",
    fontSize: "13px",
    backgroundColor: state.isSelected ? "#2a3f53" : state.isFocused ? "#f5f6fa" : "#fff",
    color: state.isSelected ? "#fff" : "#212529",
  }),
};

class FormFilter extends Component {
  close = () => {
    this.props.closeFilter(true);
  };

  render() {
    const f = this.props.formValuesFilter;

    return (
      <div style={{ marginBottom: 16 }}>
        <div className="cm-dt" style={{ overflow: "visible" }}>
          <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--cm-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: 13, fontWeight: 600, color: "var(--cm-text-muted)" }}>
              <i className="fas fa-filter" style={{ marginRight: 8, opacity: 0.6 }} />
              Filtros avanzados
            </span>
            <button onClick={this.close} className="cm-dt-action-btn" title="Cerrar filtros" style={{ width: 28, height: 28 }}>
              <i className="fas fa-times" />
            </button>
          </div>

          <div style={{ padding: "16px 20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "14px 16px" }}>
              <div className="cm-form-group" style={{ marginBottom: 0 }}>
                <label className="cm-label">Fecha inicio (desde)</label>
                <input className="cm-input" type="date" name="start_date" onChange={this.props.onChangeFilter} value={f.start_date} />
              </div>

              <div className="cm-form-group" style={{ marginBottom: 0 }}>
                <label className="cm-label">Fecha inicio (hasta)</label>
                <input className="cm-input" type="date" name="end_date" onChange={this.props.onChangeFilter} value={f.end_date} />
              </div>

              <div className="cm-form-group" style={{ marginBottom: 0 }}>
                <label className="cm-label">Centro de costo</label>
                <Select
                  onChange={this.props.onChangeAutocompleteCentro}
                  onInputChange={this.props.onCostCenterInputChange}
                  options={this.props.centro}
                  isLoading={this.props.costCenterLoading}
                  isClearable
                  autoFocus={false}
                  value={this.props.formAutocompleteCentro}
                  styles={{ ...selectStyles, menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                  placeholder="Escriba 3+ letras..."
                  noOptionsMessage={() => "Escriba para buscar"}
                  menuPortalTarget={document.body}
                />
              </div>

              <div className="cm-form-group" style={{ marginBottom: 0 }}>
                <label className="cm-label">Cliente</label>
                <Select
                  options={this.props.clientes}
                  autoFocus={false}
                  onChange={this.props.onChangeAutocompleteCustomer}
                  value={this.props.formAutocompleteCustomer}
                  styles={selectStyles}
                  placeholder="Buscar..."
                  noOptionsMessage={() => "Sin resultados"}
                />
              </div>

              <div className="cm-form-group" style={{ marginBottom: 0 }}>
                <label className="cm-label">Tipo</label>
                <select className="cm-input" name="service_type" onChange={this.props.onChangeFilter} value={f.service_type} style={{ height: 38 }}>
                  <option value="">Todos</option>
                  <option value="PROYECTO">PROYECTO</option>
                  <option value="SERVICIO">SERVICIO</option>
                  <option value="VENTA">VENTA</option>
                </select>
              </div>

              <div className="cm-form-group" style={{ marginBottom: 0 }}>
                <label className="cm-label">Estado ejecucion</label>
                <select className="cm-input" name="execution_state" onChange={this.props.onChangeFilter} value={f.execution_state} style={{ height: 38 }}>
                  <option value="">Todos</option>
                  <option value="FINALIZADO">FINALIZADO</option>
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="EJECUCION">EJECUCION</option>
                </select>
              </div>

              <div className="cm-form-group" style={{ marginBottom: 0 }}>
                <label className="cm-label">Estado facturado</label>
                <select className="cm-input" name="invoiced_state" onChange={this.props.onChangeFilter} value={f.invoiced_state} style={{ height: 38 }}>
                  <option value="">Todos</option>
                  <option value="FACTURADO">FACTURADO</option>
                  <option value="FACTURADO PARCIAL">FACTURADO PARCIAL</option>
                  <option value="LEGALIZADO">LEGALIZADO</option>
                  <option value="LEGALIZADO PARCIAL">LEGALIZADO PARCIAL</option>
                  <option value="POR FACTURAR">POR FACTURAR</option>
                  <option value="PENDIENTE DE ORDEN DE COMPRA">PENDIENTE DE ORDEN DE COMPRA</option>
                  <option value="PENDIENTE DE COTIZACION">PENDIENTE DE COTIZACION</option>
                </select>
              </div>

              <div className="cm-form-group" style={{ marginBottom: 0 }}>
                <label className="cm-label"># Cotizacion</label>
                <input className="cm-input" type="text" name="quotation_number" placeholder="# Cotizacion" onChange={this.props.onChangeFilter} value={f.quotation_number} />
              </div>

              <div className="cm-form-group" style={{ marginBottom: 0, gridColumn: "1 / 3" }}>
                <label className="cm-label">Descripcion</label>
                <input className="cm-input" type="text" name="descripcion" placeholder="Buscar por descripcion..." onChange={this.props.onChangeFilter} value={f.descripcion} />
              </div>

              <div style={{ gridColumn: "3 / 5", display: "flex", alignItems: "flex-end", justifyContent: "flex-end", gap: 10 }}>
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
      </div>
    );
  }
}

export default FormFilter;
