import React, { Component } from 'react';
import NumberFormat from "react-number-format";
import { CmModal } from '../../generalcomponents/ui';

// Tablero de la pestana Presupuesto. PRESENTACIONAL PURO: no hace fetch, no
// tiene estado propio y no calcula nada que el servidor no haya calculado ya.
// Quien pide los datos y decide cuando recargar es BudgetsTable.
//
// El detalle por persona ya NO se pinta en linea: vive en un modal que abre el
// boton "Resumen" de la barra de acciones de la tabla general. La apertura la
// controla BudgetsTable por props (`showByUser` / `onCloseByUser`) para que este
// componente siga sin estado propio. El modal NO pide datos: reusa el mismo
// `summary` que ya alimenta las tarjetas, asi que abrirlo y cerrarlo no dispara
// ni una peticion.
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

  // Contenido del modal. Las clases son las de CmDataTable
  // (`cm-dt-table-wrapper` + `cm-dt-table`, datatable.css:188 y 213) y NO las de
  // `cm-table`, cuyo thead es oscuro (design_system.css:276): dentro del modal
  // esta tabla tiene que leerse igual que la tabla general de partidas. No se
  // agrega CSS nuevo: las dos clases ya existen y traen encabezado claro,
  // sticky, hover y separadores.
  //
  // Sin `cm-dt-sortable` a proposito: aqui no hay ordenamiento, y pintar la
  // flecha de orden prometeria algo que no ocurre al hacer click.
  renderByUser = (byUser) => {
    var self = this;

    if (byUser.length === 0) {
      return (
        <p className="cm-text-muted" data-testid="budget-summary-empty">
          Todavía no hay partidas asignadas en este centro de costos.
        </p>
      );
    }

    return (
      // `maxHeight` para que el scroll ocurra DENTRO del wrapper y no en el
      // cuerpo del modal: asi el thead sticky de `.cm-dt-table` (datatable.css:220)
      // sigue haciendo lo suyo y el pie del modal no se va de la vista.
      <div className="cm-dt-table-wrapper" data-testid="budget-summary-by-user"
           style={{ maxHeight: "60vh" }}>
        <table className="cm-dt-table">
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
    );
  };

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
              {/* Solo cuando hay gastos aceptados que ninguna partida cubre:
                  si no, "Disponible para asignar" repetiria la cifra de arriba
                  y "Gastado sin partida" seria un cero. */}
              {this.n(totals.uncovered) > 0 && (
                <div className="cm-metric-item">
                  <span className="cm-metric-item-label">Gastado sin partida</span>
                  {this.renderMoney(totals.uncovered, "budget-summary-uncovered")}
                </div>
              )}
              {this.n(totals.uncovered) > 0 && (
                <div className="cm-metric-item">
                  <span className="cm-metric-item-label">Disponible para asignar</span>
                  {this.renderMoney(totals.assignable, "budget-summary-assignable")}
                </div>
              )}
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

        {/* El modal solo se monta cuando esta abierto: cerrado no cuesta nada y
            al abrirlo se pinta con el `summary` ya cargado, sin fetch. */}
        {this.props.showByUser && (
          <CmModal
            isOpen={true}
            toggle={this.props.onCloseByUser}
            title={<span><i className="fas fa-users" /> Resumen por persona</span>}
            size="lg"
            footer={
              <button className="cm-btn cm-btn-outline" onClick={this.props.onCloseByUser}
                      data-testid="budget-summary-modal-close">
                Cerrar
              </button>
            }
          >
            {/* El data-testid va aqui y no en CmModal: CmModal solo reenvia las
                props que declara (CmModal.jsx:7) y cualquier otra se pierde. */}
            <div data-testid="budget-summary-modal">
              {this.renderByUser(byUser)}
            </div>
          </CmModal>
        )}
      </div>
    );
  }
}

export default BudgetSummaryBoard;
