import React from 'react';
import Table from "../Reports/table";
import Filter from "../Reports/FormFilter"
import Pagination from "react-js-pagination";

class index extends React.Component {
    constructor(props){
        super(props)

        this.state = {
            data: [],
            exel_values: [],
            show_filter: false,
            formFilter: {
              work_description: "",
              report_execute_id: "",
              date_ejecution: "",
              report_sate: "",
              cost_center_id: "",
              customer_id: "",
              date_desde: "",
              date_hasta: "",
              code_report: "",
            },

            activePage: 1,
            reports_total: 0, 
            countPage: 10,

            selectedOptionCentro: {
              cost_center_id: "",
              label: "Centro de costo"
            },

            selectedOptionUser :{
              report_execute_id: "",
              label: "Responsable Ejecucion",
            },

            selectedOption: {
              customer_id: "",
              label: "Buscar cliente"
            },

            selectedOptionCodeReport: {
              code_report: "",
              label: "Buscar por codigo"
            },

            filtering: false,
      
            dataCostCenter: [],
            dataUsers: [],
            clients: [],
            array_reports: []
        }
    }

    loadData = () => {
        fetch("/get_reports")
        .then(response => response.json())
        .then(data => {
          this.setState({
            data: data.reports_paginate,
            reports_total: data.reports_total,
            exel_values: data.reports_total,
          });
        });


      }

    //add items
    updateData = (data) => {
      this.setState({
        data: [...this.state.data, data].reverse(),
      })
    }

    //add update
    updateItem = report => {
        this.setState({
            data: this.state.data.map(item => {
            if (report.id === item.id) {
              return { ...item, 
                code_report: report.code_report,
                contact: report.contact,
                contact_email: report.contact_email,
                contact_id: report.contact_id,
                contact_name: report.contact_name,
                contact_phone: report.contact_phone,
                contact_position: report.contact_position,
                cost_center: report.cost_center,
                cost_center_id: report.cost_center_id,
                count: report.count,
                created_at: report.created_at,
                customer: report.customer,
                customer_id: report.customer_id,
                customer_name: report.customer_name,
                displacement_hours: report.displacement_hours,
                last_user_edited: report.last_user_edited,
                last_user_edited_id: report.last_user_edited_id,
                report_code: report.report_code,
                report_date: report.report_date,
                report_execute: report.report_execute,
                report_execute_id: report.report_execute_id,
                report_sate: report.report_sate,
                total_value: report.total_value,
                update_user: report.update_user,
                updated_at: report.updated_at,
                user: report.user,
                user_id: report.user_id,
                value_displacement_hours: report.value_displacement_hours,
                viatic_description: report.viatic_description,
                viatic_value: report.viatic_value,
                work_description: report.work_description,
                working_time: report.working_time,
                working_value: report.working_value,
              }
            }
            return item;
          })
        });
    }
    
    componentDidMount() {
        this.loadData();

        let array = []
        let arrayUsers = []
        let arrayClients = []
        let array_reports = []

        this.props.cost_centers.map((item) => (
          array.push({label: item.code, value: item.id})
        ))

        this.props.users.map((item) => (
          arrayUsers.push({label: item.names, value: item.id})
        ))

        this.props.clientes.map((item) => (
          arrayClients.push({label: item.name, value: item.id})
        ))

        this.props.reports.map((item) => (
          array_reports.push({label: item.code_report, value: item.id})
        ))
    
        this.setState({
          dataCostCenter: array,
          dataUsers: arrayUsers,
          clients: arrayClients,
          array_reports: array_reports
        })

        
    }

    handleChangeAutocompleteCentro = selectedOptionCentro => {
      this.setState({
        selectedOptionCentro,
        formFilter: {
          ...this.state.formFilter,
          cost_center_id: selectedOptionCentro.value
        }
      });
    };

    handleChangeAutocompleteCodeReport = selectedOptionCodeReport => {
      this.setState({
        selectedOptionCodeReport,
        formFilter: {
          ...this.state.formFilter,
          code_report: selectedOptionCodeReport.value
        }
      });
    };

    handleChangeAutocompleteUser = selectedOptionUser => {
      this.setState({
        selectedOptionUser,
        formFilter: {
          ...this.state.formFilter,
          report_execute_id: selectedOptionUser.value
        }
      });
    };

    handleChangeAutocompleteCustomer = selectedOption => {
      this.setState({
        selectedOption,
        formFilter: {
          ...this.state.formFilter,
          customer_id: selectedOption.value
        }
      });
    };

    showFilter = valor => {
      if (valor == true) {
        this.setState({ show_filter: false, filtering: false  });
        this.loadData();
      } else {
        this.setState({ show_filter: true, filtering: true });
      }
      
      this.setState({
        formFilter: {
          work_description: "",
          report_execute_id: "",
          date_ejecution: "",
          report_sate: "",
          cost_center_id: "",
          date_desde: "",
          date_hasta: "",
          code_report: "",
        },

        selectedOptionCentro: {
          cost_center_id: "",
          label: "Centro de costo"
        },

        selectedOptionUser :{
          report_execute_id: "",
          label: "Responsable Ejecucion",
        },

        selectedOption: {
          customer_id: "",
          label: "Buscar cliente"
        },

        selectedOptionCodeReport: {
          code_report: "",
          label: "Buscar por codigo"
        }

      })
      
    };

    handleChangeFilter = e => {
      this.setState({
        formFilter: {
          ...this.state.formFilter,
          [e.target.name]: e.target.value
        },
      });
    };

    HandleClickFilter = e => {
      fetch(`/get_reports?work_description=${this.state.formFilter.work_description != undefined ? this.state.formFilter.work_description : "" }&report_execute_id=${this.state.formFilter.report_execute_id != undefined ? this.state.formFilter.report_execute_id : ""}&date_ejecution=${this.state.formFilter.date_ejecution != undefined ? this.state.formFilter.date_ejecution : ""}&report_sate=${this.state.formFilter.report_sate != undefined ? this.state.formFilter.report_sate : ""}&cost_center_id=${this.state.formFilter.cost_center_id != undefined ? this.state.formFilter.cost_center_id : ""}&customer_id=${this.state.formFilter.customer_id != undefined ? this.state.formFilter.customer_id : ""}&date_desde=${this.state.formFilter.date_desde}&date_hasta=${this.state.formFilter.date_hasta}&code_report=${this.state.formFilter.code_report}&filtering=${this.state.filtering}`)
        .then(response => response.json())
        .then(data => {
          this.setState({
            data: data.reports_paginate,
            reports_total: data.reports_total,
            exel_values: data.reports_total,
            activePage: 1
          });
      });
    };

    change = e => {
      this.setState({
        countPage: e.target.value,
        activePage: this.state.countPage
      });
      fetch("/get_reports?filter=" + e.target.value)
      .then(response => response.json())
      .then(data => {
        this.setState({
          data: data.reports_paginate,
          reports_total: data.reports_total,
          exel_values: data.reports_total,
          activePage: 1
        });
      });
    }
    
    handlePageChange = pageNumber => {
      this.setState({ activePage: pageNumber });
      fetch(`/get_reports?page=${pageNumber}&filter=${this.state.countPage}&filtering=${this.state.filtering}&work_description=${this.state.filtering == true ? this.state.formFilter.work_description : "" }&report_execute_id=${this.state.filtering == true ? this.state.formFilter.report_execute_id : ""}&date_ejecution=${this.state.filtering == true ? this.state.formFilter.date_ejecution : ""}&report_sate=${this.state.filtering == true ? this.state.formFilter.report_sate : ""}&cost_center_id=${this.state.filtering == true ? this.state.formFilter.cost_center_id : ""}&customer_id=${this.state.filtering == true && this.state.formFilter.customer_id != undefined  ? this.state.formFilter.customer_id : ""}&date_desde=${this.state.formFilter.date_desde}&date_hasta=${this.state.formFilter.date_hasta}&code_report=${this.state.formFilter.code_report}`) 
        .then(response => response.json())
        .then(data => {
          this.setState({ 
            data: data.reports_paginate,
            reports_total: data.reports_total,
            exel_values: data.reports_total,
          });
        });
       
    };

    /*
    asdasdasd
    */


    render() {
        return (
            <React.Fragment>
              {this.state.show_filter && (
                <Filter
                  array_reports={this.state.array_reports}
                  onChangeFilter={this.handleChangeFilter}
                  formValuesFilter={this.state.formFilter}
                  onClick={this.HandleClickFilter}
                  cancelFilter={this.cancelFilter}
                  closeFilter={this.showFilter}
                  
                  cost_centers={this.props.cost_centers}

                  /* AUTOCOMPLETE CENTRO DE COSTO */
                  centro={this.state.dataCostCenter}
                  onChangeAutocompleteCentro={this.handleChangeAutocompleteCentro}
                  formAutocompleteCentro={this.state.selectedOptionCentro}

                  /* AUTOCOMPLETE CENTRO DE USERS */
                  users={this.state.dataUsers}
                  onChangeAutocompleteUser={this.handleChangeAutocompleteUser}
                  formAutocompleteUser={this.state.selectedOptionUser}

                  /* AUTOCOMPLETE CENTRO DE CUSTOMERS */
                  formAutocompleteCustomer={this.state.selectedOption}
                  onChangeAutocompleteCustomer={this.handleChangeAutocompleteCustomer}
                  clientes={this.state.clients}

                  data={this.state.data} 
                  handleChangeAutocompleteCodeReport={this.handleChangeAutocompleteCodeReport}
                  selectedOptionCodeReport={this.state.selectedOptionCodeReport}

                />
              )}

              <div className="row">
                <div className="col-md-12">
                  <div className="card card-table">
                    <div className="card-body">
      
                      <Table 
                        dataActions={this.state.data} 
                        loadInfo={this.loadData}
                        usuario={this.props.usuario}
                        show={this.showFilter}
                        clientes={this.props.clientes}
                        users={this.props.users}
                        estados={this.props.estados}
                        rol={this.props.rol}
                        exel_values={this.state.exel_values}
                        filtering={this.state.filtering}

                        updateData={this.updateData}
                        updateItem={this.updateItem}
                        formFilter={this.state.formFilter}
                      />

                      <div className="col-md-12" style={{ marginTop: "50px" }}>
                        <div className="row">

                          <div className="col-md-7 text-left pl-0">
                              <p>
                                  Mostrando {this.state.data.length} de {this.state.reports_total}
                              </p>
                          </div>

                          <div className="col-md-5 p-0 text-right">
                            <Pagination
                              hideNavigation
                              activePage={this.state.activePage}
                              itemsCountPerPage={this.state.countPage}
                              itemClass="page-item"
                              innerClass="pagination"
                              linkClass="page-link"
                              totalItemsCount={this.state.reports_total}
                              pageRangeDisplayed={this.state.countPage}
                              onChange={this.handlePageChange}
                            />
                          </div>

                        </div>
                      </div>   
                    
      
                    </div>
                  </div>
                </div>
              </div>

            </React.Fragment>

        )
      
    }
}

export default index;
