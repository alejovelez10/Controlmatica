import React from 'react';
import Table from "../Reports/table";
import Filter from "../Reports/FormFilter"
import Pagination from "react-js-pagination";

class index extends React.Component {
    constructor(props){
        super(props)

        this.state = {
            data: [],
            show_filter: false,
            formFilter: {
              work_description: "",
              report_execute_id: "",
              date_ejecution: "",
              report_sate: "",
              cost_center_id: ""
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
      
            dataCostCenter: [],
            dataUsers: []
        }
    }

    loadData = () => {
        fetch("/get_reports")
        .then(response => response.json())
        .then(data => {
          console.log(data)
          this.setState({
            data: data.reports_paginate,
            reports_total: data.reports_total
          });
        });


      }
    
    componentDidMount() {
        this.loadData();

        let array = []
        let arrayUsers = []

        this.props.cost_centers.map((item) => (
          array.push({label: item.code, value: item.id})
        ))

        this.props.users.map((item) => (
          arrayUsers.push({label: item.names, value: item.id})
        ))
    
        this.setState({
          dataCostCenter: array,
          dataUsers: arrayUsers
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

    handleChangeAutocompleteUser = selectedOptionUser => {
      this.setState({
        selectedOptionUser,
        formFilter: {
          ...this.state.formFilter,
          report_execute_id: selectedOptionUser.value
        }
      });
    };

    showFilter = valor => {
      if (valor == true) {
        this.setState({ show_filter: false });
        this.loadData();
      } else {
        this.setState({ show_filter: true });
      }
      
      this.setState({
        formFilter: {
          work_description: "",
          report_execute_id: "",
          date_ejecution: "",
          report_sate: "",
          cost_center_id: ""
        },

        selectedOptionCentro: {
          cost_center_id: "",
          label: "Centro de costo"
        },

        selectedOptionUser :{
          report_execute_id: "",
          label: "Responsable Ejecucion",
        },
        
      })
      
    };

    handleChangeFilter = e => {
      this.setState({
        formFilter: {
          ...this.state.formFilter,
          [e.target.name]: e.target.value
        }
      });
    };

    HandleClickFilter = e => {
      fetch(`/get_reports?work_description=${this.state.formFilter.work_description != undefined ? this.state.formFilter.work_description : "" }&report_execute_id=${this.state.formFilter.report_execute_id != undefined ? this.state.formFilter.report_execute_id : ""}&date_ejecution=${this.state.formFilter.date_ejecution != undefined ? this.state.formFilter.date_ejecution : ""}&report_sate=${this.state.formFilter.report_sate != undefined ? this.state.formFilter.report_sate : ""}&cost_center_id=${this.state.formFilter.cost_center_id != undefined ? this.state.formFilter.cost_center_id : ""}`)
        .then(response => response.json())
        .then(data => {
          this.setState({
            data: data.reports_paginate,
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
          activePage: 1
        });
      });
    }
    
    handlePageChange = pageNumber => {
      this.setState({ activePage: pageNumber });
      fetch(`/get_reports?page=${pageNumber}&filter=${this.state.countPage}`) 
        .then(response => response.json())
        .then(data => {
          this.setState({ data: data.reports_paginate });
        });
       
    };


    render() {
        return (
            <React.Fragment>
              <div style={{ display: this.state.show_filter == true ? "block" : "none" }}>
          
                <Filter
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

                />
              </div>

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
                      />

                      <div className="col-md-12" style={{ marginTop: "50px" }}>
                        <div className="row">

                          <div className="col-md-9 text-left pl-0">
                              <p>
                                  Mostrando {this.state.data.length} de {this.state.reports_total}
                              </p>
                          </div>

                          <div className="col-md-3 p-0 text-right">
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
