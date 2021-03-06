import React from 'react';
import Table from "../CustomerReports/table";
import Filter from "../CustomerReports/FormFilter"
import Pagination from "react-js-pagination";

class index extends React.Component {
    constructor(props){
        super(props)

        this.state = {
            data: [],
            show_filter: false,
            formFilter: {
              cost_center_id: "",
              customer_id: "",
              state: "",
              date_desde: "",
              date_hasta: "",
            },

            activePage: 1,
            customer_reports_total: 0, 
            countPage: 10,

            dataCostCenter: [],
            clients: [],

            selectedOptionCentro: {
              cost_center_id: "",
              label: "Centro de costo"
            },
    
            selectedOption :{
              customer_id: "",
              label: "Buscar cliente",
            },

        }
    }

    loadData = () => {
        fetch("/get_customer_reports")
        .then(response => response.json())
        .then(data => {
          console.log(data)
          this.setState({
            data: data.customer_reports_paginate,
            customer_reports_total: data.customer_reports_total
          });
        });


      }
    
    componentDidMount() {
        this.loadData();

        let array = []
        let arrayCustomers = []

        this.props.cost_center.map((item) => (
          array.push({label: item.code, value: item.id})
        ))

        this.props.clientes.map((item) => (
          arrayCustomers.push({label: item.name, value: item.id})
        ))
    
        this.setState({
          dataCostCenter: array,
          clients: arrayCustomers
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

    handleChangeAutocompleteCustomer = selectedOption => {
      this.setState({
        selectedOption,
        formFilter: {
          ...this.state.formFilter,
          customer_id: selectedOption.value
        }
      });
    };

    showFilter = (valor) => {
      if (valor == true) {
        this.setState({ show_filter: false });
      }else{
        this.setState({ show_filter: true });
      }
  
      this.setState({
        formFilter: {
          cost_center_id: "",
          customer_id: "",
          state: "",
          date_desde: "",
          date_hasta: "",
        },
        
        selectedOptionCentro: {
          cost_center_id: "",
          label: "Centro de costo"
        },

        selectedOption :{
          customer_id: "",
          label: "Buscar cliente",
        },

      })
  
  
      this.loadData();
    }

    handleChangeFilter = e => {
      this.setState({
        formFilter: {
          ...this.state.formFilter,
          [e.target.name]: e.target.value
        }
      });
    };
  
    HandleClickFilter = e => {
      fetch(`/get_customer_reports?cost_center_id=${this.state.formFilter.cost_center_id}&customer_id=${this.state.formFilter.customer_id}&state=${this.state.formFilter.state}&date_desde=${this.state.formFilter.date_desde}&date_hasta=${this.state.formFilter.date_hasta}`)
        .then(response => response.json())
        .then(data => {
          this.setState({
            data: data.customer_reports_paginate,
          });
        });
     
    };

    change = e => {
      this.setState({
        countPage: e.target.value,
        activePage: this.state.countPage
      });
      fetch("/get_customer_reports?filter=" + e.target.value)
      .then(response => response.json())
      .then(data => {
        this.setState({
          data: data.customer_reports_paginate,
          customer_reports_total: data.customer_reports_total,
          activePage: 1
        });
      });
    }
    
    handlePageChange = pageNumber => {
      this.setState({ activePage: pageNumber });
      fetch(`/get_customer_reports?page=${pageNumber}&filter=${this.state.countPage}`) 
        .then(response => response.json())
        .then(data => {
          this.setState({ data: data.customer_reports_paginate });
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
                  closeFilter={this.showFilter}
                  clientes={this.props.clientes}
                  cost_centers={this.props.cost_center}

                  /* AUTOCOMPLETE CENTRO DE COSTO */
                  centro={this.state.dataCostCenter}
                  onChangeAutocompleteCentro={this.handleChangeAutocompleteCentro}
                  formAutocompleteCentro={this.state.selectedOptionCentro}

                  /* AUTOCOMPLETE CUSTOMER */
                  formAutocompleteCustomer={this.state.selectedOption}
                  onChangeAutocompleteCustomer={this.handleChangeAutocompleteCustomer}
                  clientes={this.state.clients}
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
                        estados={this.props.estados}
                        clientes={this.props.clientes}
                        contacts={this.props.contacts}
                        show={this.showFilter}
                      />

                      <div className="col-md-12" style={{ marginTop: "50px" }}>
                        <div className="row">

                          <div className="col-md-9 text-left pl-0">
                              <p>
                                  Mostrando {this.state.data.length} de {this.state.customer_reports_total}
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
                              totalItemsCount={this.state.customer_reports_total}
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
