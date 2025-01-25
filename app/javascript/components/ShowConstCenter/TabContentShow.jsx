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
                Gastos
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


            {(props.cost_center.service_type == "SERVICIO" || props.cost_center.service_type == "PROYECTO") && (
              <NavItem>
                <NavLink
                  className={classnames({ active: activeTab === '4' })}
                  style={{ cursor: "pointer" }}
                  onClick={() => { toggle('4'); }}
                >
                  Reportes de servicios
                </NavLink>
              </NavItem>
            )}




            {(props.cost_center.service_type == "VENTA" || props.cost_center.service_type == "PROYECTO") && (
              <NavItem>
                <NavLink
                  className={classnames({ active: activeTab === '5' })}
                  style={{ cursor: "pointer" }}
                  onClick={() => { toggle('5'); }}
                >
                  Materiales
                </NavLink>
              </NavItem>
            )}

            {(props.cost_center.service_type == "PROYECTO") && (
              <NavItem>
                <NavLink
                  className={classnames({ active: activeTab === '6' })}
                  style={{ cursor: "pointer" }}
                  onClick={() => { toggle('6'); }}
                >
                  Tableristas
                </NavLink>
              </NavItem>

            )}

          </Nav>




          <TabContent activeTab={activeTab}>
            <TabPane tabId="1">
              <QuotationIndex
                cost_center_id={props.cost_center.id}
                cost_center={props.cost_center}
                loadData={props.loadData}
                estados={props.estados}
              />
            </TabPane>

            <TabPane tabId="2">
              <ExpensesTable
                usuario={props.usuario}
                cost_center={props.cost_center}
                dataExpenses={props.dataExpenses}
                users={props.users}
                report_expense_options={props.report_expense_options}
                estados={props.estados}
              />
            </TabPane>

            <TabPane tabId="3">
              <OrdenesDeCompraTable usuario={props.usuario} estados={props.estados} cost_center={props.cost_center} dataSalesOrdes={props.dataSalesOrdes} />
            </TabPane>

            {(props.cost_center.service_type == "SERVICIO" || props.cost_center.service_type == "PROYECTO") && (
              <TabPane tabId="4">
                <ReportesDeServiciosTable clients={props.clients} estados={props.estados} users={props.users} usuario={props.usuario} cost_center={props.cost_center} dataReports={props.dataReports} />
              </TabPane>
            )}

            {(props.cost_center.service_type == "VENTA" || props.cost_center.service_type == "PROYECTO") && (

              <TabPane tabId="5">
                <MaterialesTable usuario={props.usuario} estados={props.estados} providers={props.providers} cost_center={props.cost_center} dataMateriales={props.dataMateriales} />
              </TabPane>

            )}
            {(props.cost_center.service_type == "PROYECTO") && (
              <TabPane tabId="6">
                <TableristasTable users={props.users} estados={props.estados} usuario={props.usuario} cost_center={props.cost_center} dataContractors={props.dataContractors} />
              </TabPane>

            )}

          </TabContent>
        </div>
      ) : (
        <div>
          <Nav tabs className="mb-3">
            <NavItem>
              <NavLink
                className={classnames({ active: activeTab === '1' })}
                style={{ cursor: "pointer" }}
                onClick={() => { toggle('1'); }}
              >
                Gastos
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={classnames({ active: activeTab === '2' })}
                style={{ cursor: "pointer" }}
                onClick={() => { toggle('2'); }}
              >
                Ordenes de Compra
              </NavLink>
            </NavItem>

            {(props.cost_center.service_type == "SERVICIO" || props.cost_center.service_type == "PROYECTO") && (
              <NavItem>
                <NavLink
                  className={classnames({ active: activeTab === '3' })}
                  style={{ cursor: "pointer" }}
                  onClick={() => { toggle('3'); }}
                >
                  Reportes de servicios
                </NavLink>
              </NavItem>
            )}

            {(props.cost_center.service_type == "VENTA" || props.cost_center.service_type == "PROYECTO") && (
              <NavItem>
                <NavLink
                  className={classnames({ active: activeTab === '4' })}
                  style={{ cursor: "pointer" }}
                  onClick={() => { toggle('4'); }}
                >
                  Materiales
                </NavLink>
              </NavItem>
            )}

            {(props.cost_center.service_type == "PROYECTO") && (
              <NavItem>
                <NavLink
                  className={classnames({ active: activeTab === '5' })}
                  style={{ cursor: "pointer" }}
                  onClick={() => { toggle('5'); }}
                >
                  Tableristas
                </NavLink>
              </NavItem>
            )}


          </Nav>




          <TabContent activeTab={activeTab}>
            <TabPane tabId="1">
              <ExpensesTable
                usuario={props.usuario}
                cost_center={props.cost_center}
                dataExpenses={props.dataExpenses}
                users={props.users}
                report_expense_options={props.report_expense_options}
              />
            </TabPane>
            <TabPane tabId="2">
              <OrdenesDeCompraTable usuario={props.usuario} estados={props.estados} cost_center={props.cost_center} dataSalesOrdes={props.dataSalesOrdes} />
            </TabPane>


            {(props.cost_center.service_type == "SERVICIO" || props.cost_center.service_type == "PROYECTO") && (
              <TabPane tabId="3">
                <ReportesDeServiciosTable users={props.users} clients={props.clients} estados={props.estados} usuario={props.usuario} cost_center={props.cost_center} dataReports={props.dataReports} />
              </TabPane>

            )}


            {(props.cost_center.service_type == "PROYECTO" || props.cost_center.service_type == "VENTA") && (
              <TabPane tabId="4">
                <MaterialesTable providers={props.providers} estados={props.estados} usuario={props.usuario} cost_center={props.cost_center} dataMateriales={props.dataMateriales} />
              </TabPane>
            )}


            {(props.cost_center.service_type == "PROYECTO") && (
              <TabPane tabId="5">
                <TableristasTable users={props.users} estados={props.estados} usuario={props.usuario} cost_center={props.cost_center} dataContractors={props.dataContractors} />
              </TabPane>
            )}


          </TabContent>
        </div>
      )}

    </div>
  );
}

export default TabContentShow;

