import React from 'react';
import MaterialesTable from './MaterialesTable';
import OrdenesDeCompraTable from './OrdenesDeCompraTable';
import ReportesDeServiciosTable from './ReportesDeServiciosTable';
import TableristasTable from './TableristasTable';
import ExpensesTable from './ExpensesTable';
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
