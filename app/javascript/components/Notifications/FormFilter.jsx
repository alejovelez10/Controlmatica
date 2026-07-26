import React, { Component } from "react";

class FormFilter extends Component {
  constructor(props) {
    super(props);
    this.state = {
      show_btn: false
    };
  }

  handleSubmit = (e) => {
    e.preventDefault();
    this.setState({
      show_btn: true
    });
  };

  close = () => {
    this.props.closeFilter(true);
    this.setState({
      show_btn: false
    });
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
              <label className="cm-label">Fecha hasta</label>
              <input
                className="cm-input"
                type="date"
                name="date_hasta"
                onChange={this.props.onChangeFilter}
                value={f.date_hasta}
                style={{ height: 38 }}
              />
            </div>

            <div className="cm-form-group" style={{ marginBottom: 0 }}>
              <label className="cm-label">Numero</label>
              <input
                className="cm-input"
                type="number"
                name="number_order"
                placeholder="Numero de orden"
                onChange={this.props.onChangeFilter}
                value={f.number_order}
                style={{ height: 38 }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "flex-end", gap: 10 }}>
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
