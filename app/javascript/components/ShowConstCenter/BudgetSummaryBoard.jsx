import React, { Component } from 'react';
import NumberFormat from "react-number-format";

// Tablero de la pestana Presupuesto. PRESENTACIONAL PURO: no hace fetch, no
// tiene estado propio y no calcula nada que el servidor no haya calculado ya.
// Quien pide los datos y decide cuando recargar es BudgetsTable.
//
// TODOS LOS MONTOS LLEGAN COMO STRING. `assigned`, `spent`, `available` y los
// `totals` son BigDecimal serializados por AMS ("500000.0"), asi que
// `"500000.0" + "100000.0"` en JS da "500000.0100000.0". Cualquier aritmetica
// pasa antes por `n()`.
class BudgetSummaryBoard extends Component {
  n = (v) => parseFloat(v || 0);

  // Solo para el texto de las etiquetas, no para los valores (esos van por
  // NumberFormat, que es lo que usa el resto de la aplicacion).
  renderMoney = (value, testId, style) => (
    <NumberFormat
      value={this.n(value)}
      displayType="text"
      thousandSeparator={true}
      prefix="$"
      className="cm-metric-item-value cm-metric-item-value--currency"
      data-testid={testId}
      style={style}
    />
  );

  render() {
    var summary = this.props.summary;

    // Los tres estados son EXCLUYENTES y en este orden: cargando gana sobre
    // error, y error gana sobre datos viejos. Pintar el tablero con el resumen
    // anterior mientras el nuevo falla es mostrar cifras falsas con confianza.
    if (this.props.loading) {
      return (
        <div className="cm-metrics-grid" data-testid="budget-summary-loading">
          {[0, 1, 2].map(function(i) {
            return (
              <div className="cm-metric-card" key={i}>
                <div className="cm-dt-skeleton-bar" style={{ width: "60%", height: 14, marginBottom: 10 }} />
                <div className="cm-dt-skeleton-bar" style={{ width: "85%", height: 14, marginBottom: 10 }} />
                <div className="cm-dt-skeleton-bar" style={{ width: "45%", height: 14 }} />
              </div>
            );
          })}
        </div>
      );
    }

    if (this.props.error) {
      return (
        <div className="cm-alert cm-alert-danger" data-testid="budget-summary-error">
          <i className="fas fa-exclamation-triangle" /> No se pudo cargar el resumen de presupuesto.
          <button className="cm-btn cm-btn-outline cm-btn-sm" onClick={this.props.onRetry} style={{ marginLeft: 12 }}>
            Reintentar
          </button>
        </div>
      );
    }

    if (!summary) return null;

    var totals = summary.totals || {};
    var byUser = summary.by_user || [];
    var costCenter = summary.cost_center || {};
    var self = this;

    // Los excedidos se suman en cliente porque `totals` no trae el dato: el
    // servicio lo devuelve por persona (`exceeded_expenses_count`) y sumar
    // enteros aqui no arriesga nada.
    var excedidos = byUser.reduce(function(acc, u) { return acc + (u.exceeded_expenses_count || 0); }, 0);

    var disponible = this.n(totals.available);
    var enRojo = disponible < 0;

    return (
      <div data-testid="budget-summary">
        {this.n(costCenter.viatic_value) <= 0 && (
          <div className="cm-alert cm-alert-warning" data-testid="budget-summary-no-viatic">
            <i className="fas fa-exclamation-triangle" /> Este centro de costos no tiene valor de viáticos cotizado; no es posible asignar partidas.
          </div>
        )}

        <div className="cm-metrics-grid">
          <div className="cm-metric-card cm-metric-card--blue">
            <div className="cm-metric-card-title"><i className="fas fa-wallet" /> Asignación</div>
            <div className="cm-metric-card-body">
              <div className="cm-metric-item">
                <span className="cm-metric-item-label">Cotizado</span>
                {this.renderMoney(totals.viatic_value, "budget-summary-viatic")}
              </div>
              <div className="cm-metric-item">
                <span className="cm-metric-item-label">Asignado</span>
                {this.renderMoney(totals.assigned, "budget-summary-assigned")}
              </div>
              <div className="cm-metric-item">
                <span className="cm-metric-item-label">Sin asignar</span>
                {this.renderMoney(totals.unassigned, "budget-summary-unassigned")}
              </div>
            </div>
          </div>

          <div className={"cm-metric-card " + (enRojo ? "cm-metric-card--red" : "cm-metric-card--green")}>
            <div className="cm-metric-card-title"><i className="fas fa-chart-line" /> Ejecución</div>
            <div className="cm-metric-card-body">
              <div className="cm-metric-item">
                <span className="cm-metric-item-label">Gastado</span>
                {this.renderMoney(totals.spent, "budget-summary-spent")}
              </div>
              <div className="cm-metric-item">
                <span className="cm-metric-item-label">Disponible</span>
                {this.renderMoney(totals.available, "budget-summary-available", enRojo ? { color: "#c82333" } : undefined)}
              </div>
              <div className="cm-metric-item">
                <span className="cm-metric-item-label">Excedidos</span>
                {/* Entero, no dinero: sin NumberFormat ni prefijo $. */}
                <span className="cm-metric-item-value" data-testid="budget-summary-exceeded">{excedidos}</span>
              </div>
            </div>
          </div>
        </div>

        {byUser.length === 0 ? (
          <p className="cm-text-muted" data-testid="budget-summary-empty">
            Todavía no hay partidas asignadas en este centro de costos.
          </p>
        ) : (
          <div className="cm-table-wrapper" data-testid="budget-summary-by-user">
            <table className="cm-table">
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Asignado</th>
                  <th>Gastado</th>
                  <th>Disponible</th>
                  <th>Partidas</th>
                  <th>Excedidos</th>
                </tr>
              </thead>
              <tbody>
                {byUser.map(function(u) {
                  var disp = self.n(u.available);
                  return (
                    <tr key={u.user_id} data-testid={"budget-summary-user-" + u.user_id}>
                      <td>{u.user_name || "—"}</td>
                      <td><NumberFormat value={self.n(u.assigned)} displayType="text" thousandSeparator={true} prefix="$" /></td>
                      <td><NumberFormat value={self.n(u.spent)} displayType="text" thousandSeparator={true} prefix="$" /></td>
                      <td style={disp < 0 ? { color: "#c82333" } : undefined}>
                        <NumberFormat value={disp} displayType="text" thousandSeparator={true} prefix="$" />
                      </td>
                      <td>{u.budgets_count}</td>
                      <td>{u.exceeded_expenses_count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }
}

export default BudgetSummaryBoard;
