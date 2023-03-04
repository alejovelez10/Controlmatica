import React, { useState } from 'react';
import { TabContent, TabPane, Nav, NavItem, NavLink } from 'reactstrap';
import classnames from 'classnames';

import MaterialesTable from '../ShowConstCenter/MaterialesTable';
import OrdenesDeCompraTable from '../ShowConstCenter/OrdenesDeCompraTable';
import ReportesDeServiciosTable from '../ShowConstCenter/ReportesDeServiciosTable';
import TableristasTable from '../ShowConstCenter/TableristasTable';
import ExpensesTable from '../ShowConstCenter/ExpensesTable';
import QuotationIndex from '../ConstCenter/Quotation/Index';


const TabContentShow = (props) => {
  const [activeTab, setActiveTab] = useState('1');

  const toggle = tab => {
    if (activeTab !== tab) setActiveTab(tab);
  }


  return (
    <div>


      {props.cost_center.has_many_quotes ? (
        <div>
          <Nav tabs className="mb-3">
            <NavItem>
              <NavLink
                className={classnames({ active: activeTab === '1' })}
                style={{ cursor: "pointer" }}
                onClick={() => { toggle('1'); }}
              >
                Cotizaciones
              </NavLink>
            </NavItem>

            <NavItem>
              <NavLink
                className={classnames({ active: activeTab === '2' })}
                style={{ cursor: "pointer" }}
                onClick={() => { toggle('2'); }}
              >
                Materiales
              </NavLink>
            </NavItem>

            <NavItem>
              <NavLink
                className={classnames({ active: activeTab === '3' })}
                style={{ cursor: "pointer" }}
                onClick={() => { toggle('3'); }}
              >
                Ordenes de Compra
              </NavLink>
            </NavItem>

            <NavItem>
              <NavLink
                className={classnames({ active: activeTab === '4' })}
                style={{ cursor: "pointer" }}
                onClick={() => { toggle('4'); }}
              >
                Reportes de servicios
              </NavLink>
            </NavItem>

            <NavItem>
              <NavLink
                className={classnames({ active: activeTab === '5' })}
                style={{ cursor: "pointer" }}
                onClick={() => { toggle('5'); }}
              >
                Tableristas
              </NavLink>
            </NavItem>

            <NavItem>
              <NavLink
                className={classnames({ active: activeTab === '6' })}
                style={{ cursor: "pointer" }}
                onClick={() => { toggle('6'); }}
              >
                Gastos
              </NavLink>
            </NavItem>

          </Nav>




          <TabContent activeTab={activeTab}>
            <TabPane tabId="1">
              <QuotationIndex
                cost_center_id={props.cost_center.id}
                cost_center={props.cost_center}
              />
            </TabPane>

            <TabPane tabId="2">
              <MaterialesTable dataMateriales={props.dataMateriales} />
            </TabPane>

            <TabPane tabId="3">
              <OrdenesDeCompraTable dataSalesOrdes={props.dataSalesOrdes} />
            </TabPane>

            <TabPane tabId="4">
              <ReportesDeServiciosTable dataReports={props.dataReports} />
            </TabPane>

            <TabPane tabId="5">
              <TableristasTable dataContractors={props.dataContractors} />
            </TabPane>

            <TabPane tabId="6">
              <ExpensesTable dataContractors={props.dataExpenses} />
            </TabPane>

          </TabContent>
        </div>
      ) : (
        <div>
          <Nav tabs className="mb-3">


            <NavItem>
              <NavLink
                className={classnames({ active: activeTab === '1' })}
                style={{ cursor: "pointer" }}
                onClick={() => { toggle('2'); }}
              >
                Materiales
              </NavLink>
            </NavItem>

            <NavItem>
              <NavLink
                className={classnames({ active: activeTab === '2' })}
                style={{ cursor: "pointer" }}
                onClick={() => { toggle('3'); }}
              >
                Ordenes de Compra
              </NavLink>
            </NavItem>

            <NavItem>
              <NavLink
                className={classnames({ active: activeTab === '3' })}
                style={{ cursor: "pointer" }}
                onClick={() => { toggle('4'); }}
              >
                Reportes de servicios
              </NavLink>
            </NavItem>

            <NavItem>
              <NavLink
                className={classnames({ active: activeTab === '4' })}
                style={{ cursor: "pointer" }}
                onClick={() => { toggle('5'); }}
              >
                Tableristas
              </NavLink>
            </NavItem>

            <NavItem>
              <NavLink
                className={classnames({ active: activeTab === '5' })}
                style={{ cursor: "pointer" }}
                onClick={() => { toggle('6'); }}
              >
                Gastos
              </NavLink>
            </NavItem>

          </Nav>




          <TabContent activeTab={activeTab}>


            <TabPane tabId="1">
              <MaterialesTable dataMateriales={props.dataMateriales} />
            </TabPane>

            <TabPane tabId="2">
              <OrdenesDeCompraTable dataSalesOrdes={props.dataSalesOrdes} />
            </TabPane>

            <TabPane tabId="3">
              <ReportesDeServiciosTable dataReports={props.dataReports} />
            </TabPane>

            <TabPane tabId="4">
              <TableristasTable dataContractors={props.dataContractors} />
            </TabPane>

            <TabPane tabId="5">
              <ExpensesTable dataContractors={props.dataExpenses} />
            </TabPane>

          </TabContent>
        </div>
      )}

    </div>
  );
}

export default TabContentShow;

