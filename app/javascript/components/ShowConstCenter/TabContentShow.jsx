import React, { useState } from 'react';
import { TabContent, TabPane, Nav, NavItem, NavLink} from 'reactstrap';
import classnames from 'classnames';

import MaterialesTable from '../ShowConstCenter/MaterialesTable'
import OrdenesDeCompraTable from '../ShowConstCenter/OrdenesDeCompraTable'
import ReportesDeServiciosTable from '../ShowConstCenter/ReportesDeServiciosTable'
import TableristasTable from '../ShowConstCenter/TableristasTable'


const TabContentShow = (props) => {
  const [activeTab, setActiveTab] = useState('1');

  const toggle = tab => {
    if(activeTab !== tab) setActiveTab(tab);
  }
  

  return (
    <div>
      <Nav tabs>

        <NavItem>
          <NavLink
            className={classnames({ active: activeTab === '1' })}
            style={{ cursor: "pointer" }}
            onClick={() => { toggle('1'); }}
          >
            Materiales
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

        <NavItem>
          <NavLink
            className={classnames({ active: activeTab === '3' })}
            style={{ cursor: "pointer" }}
            onClick={() => { toggle('3'); }}
          >
            Reportes de servicios
          </NavLink>
        </NavItem>

        <NavItem>
          <NavLink
            className={classnames({ active: activeTab === '4' })}
            style={{ cursor: "pointer" }}
            onClick={() => { toggle('4'); }}
          >
            Tableristas
          </NavLink>
        </NavItem>

      </Nav>

      <TabContent activeTab={activeTab}>

        <TabPane tabId="1">
          <MaterialesTable dataMateriales={props.dataMateriales}/>
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

      </TabContent>
    </div>
  );
}

export default TabContentShow;

