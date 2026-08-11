import React from 'react';
import MaterialesTable from './MaterialesTable';
import OrdenesDeCompraTable from './OrdenesDeCompraTable';
import ReportesDeServiciosTable from './ReportesDeServiciosTable';
import TableristasTable from './TableristasTable';
import ExpensesTable from './ExpensesTable';
import BudgetsTable from './BudgetsTable';
import QuotationIndex from '../ConstCenter/Quotation/Index';

class TabContentShow extends React.Component {
  constructor(props) {
    super(props);
    this.state = { activeTab: '1' };
  }

  setTab = function(tab) {
    if (this.state.activeTab !== tab) {
      this.setState({ activeTab: tab });
    }
  }.bind(this);

  getTabs = function() {
    var cc = this.props.cost_center;
    var type = cc.service_type;
    var hasQuotes = cc.has_many_quotes;
    var tabs = [];
    var tabIndex = 1;

    if (hasQuotes) {
      tabs.push({ id: String(tabIndex++), label: "Cotizaciones", icon: "fas fa-file-alt", key: "quotations" });
    }
    tabs.push({ id: String(tabIndex++), label: "Gastos", icon: "fas fa-receipt", key: "expenses" });
    // La pestana de Presupuesto va DESPUES de Gastos y NUNCA antes. Los ids son
    // correlativos y `activeTab` arranca en "1": insertarla al principio le
    // quitaria el id "1" a Cotizaciones (o a Gastos) y cambiaria la pestana que
    // se abre por defecto en todos los centros. Aqui solo se corren los ids de
    // las pestanas posteriores, que nadie usa como valor inicial.
    //
    // `budget_module` se lee POR STRING LITERAL: es una de las 10 claves
    // canonicas de @estados (00-ARQUITECTURA.md §4.4) que emite el paquete 07.
    // Un nombre distinto deja esta pestana invisible para siempre sin que nada
    // falle ni avise.
    if (this.props.estados && this.props.estados.budget_module) {
      tabs.push({ id: String(tabIndex++), label: "Presupuesto", icon: "fas fa-wallet", key: "budgets" });
    }
    tabs.push({ id: String(tabIndex++), label: "Ordenes de Compra", icon: "fas fa-shopping-cart", key: "orders" });

    if (type === "SERVICIO" || type === "PROYECTO") {
      tabs.push({ id: String(tabIndex++), label: "Reportes de Servicios", icon: "fas fa-clipboard-list", key: "reports" });
    }
    if (type === "VENTA" || type === "PROYECTO") {
      tabs.push({ id: String(tabIndex++), label: "Materiales", icon: "fas fa-boxes", key: "materials" });
    }
    if (type === "PROYECTO") {
      tabs.push({ id: String(tabIndex++), label: "Tableristas", icon: "fas fa-hard-hat", key: "contractors" });
    }

    return tabs;
  }.bind(this);

  renderContent = function(tab) {
    var p = this.props;
    switch (tab.key) {
      case "quotations":
        return <QuotationIndex cost_center_id={p.cost_center.id} cost_center={p.cost_center} loadData={p.loadData} estados={p.estados} />;
      case "expenses":
        return <ExpensesTable usuario={p.usuario} cost_center={p.cost_center} dataExpenses={p.dataExpenses} users={p.users} report_expense_options={p.report_expense_options} estados={p.estados} />;
      case "budgets":
        return (
          <div data-testid="budget-panel">
            <BudgetsTable usuario={p.usuario} cost_center={p.cost_center}
                          users_select={p.users_select} estados={p.estados} />
          </div>
        );
      case "orders":
        return <OrdenesDeCompraTable usuario={p.usuario} estados={p.estados} cost_center={p.cost_center} dataSalesOrdes={p.dataSalesOrdes} />;
      case "reports":
        return <ReportesDeServiciosTable clients={p.clients} estados={p.estados} users={p.users} usuario={p.usuario} cost_center={p.cost_center} dataReports={p.dataReports} />;
      case "materials":
        return <MaterialesTable usuario={p.usuario} estados={p.estados} providers={p.providers} cost_center={p.cost_center} dataMateriales={p.dataMateriales} />;
      case "contractors":
        return <TableristasTable users={p.users} estados={p.estados} usuario={p.usuario} cost_center={p.cost_center} dataContractors={p.dataContractors} />;
      default:
        return null;
    }
  }.bind(this);

  render() {
    var tabs = this.getTabs();
    var activeTab = this.state.activeTab;
    var activeTabObj = tabs.find(function(t) { return t.id === activeTab; }) || tabs[0];
    var self = this;

    return (
      <div>
        <div className="cm-tabs-nav">
          {tabs.map(function(tab) {
            return (
              <button
                key={tab.id}
                className={"cm-tab-btn" + (activeTab === tab.id ? " cm-tab-btn--active" : "")}
                onClick={function() { self.setTab(tab.id); }}
                data-testid={tab.key === "budgets" ? "budget-tab" : undefined}
              >
                <i className={tab.icon} style={{ marginRight: 6 }} />
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="cm-tabs-content">
          {activeTabObj && this.renderContent(activeTabObj)}
        </div>
      </div>
    );
  }
}

export default TabContentShow;
