import React from 'react';
import Table from "../ConstCenter/tableIndex";
import NumberFormat from 'react-number-format';
import Filter from "../ConstCenter/FormFilter"
import Pagination from "react-js-pagination";

class indexTable extends React.Component {
    constructor(props){
        super(props)

        this.state = {
            data: [],
            isLoaded: false,
            show_filter: false,
            filtering: false,

            formFilter: {
              descripcion: "",
              customer_id: "",
              cost_center_id: "",
              execution_state: "",
              service_type: "",
              invoiced_state: "",
              start_date: "",
              end_date:"",
              quotation_number:"",

            },

            activePage: 1,
            cost_centers_total: 0, 
            countPage: 10,

            selectedOption: {
              customer_id: "",
              label: "Buscar cliente"
            },

            clients: [],

            selectedOptionCentro: {
              cost_center_id: "",
              label: "Centro de costo"
            },
      
            dataCostCenter: []
        }
    }

    handleChangeAutocompleteCustomer = selectedOption => {
      this.setState({
        selectedOption,
        formFilter: {
          ...this.state.formFilter,
          customer_id: selectedOption.value
        }
      });
    };

    loadData = () => {
        fetch("/get_cost_centers")
        .then(response => response.json())
        .then(data => {

          this.setState({
            data: data.cost_centers_paginate,
            cost_centers_total: data.cost_centers_total
          });

          setTimeout(() => {
            this.setState({
              isLoaded: true
              
            });
            
          },1000)
        });

      }
    
    componentDidMount() {
      let arrayClients = []

      this.props.clientes.map((item) => (
        arrayClients.push({label: item.name, value: item.id})
      ))
  
      this.setState({
          clients: arrayClients,
      })


      let array_cost_center = []

      this.props.cost_center.map((item) => (
        array_cost_center.push({label: item.code, value: item.id})
      ))
  
      this.setState({
        dataCostCenter: array_cost_center
      })

      this.loadData()
    }

      
  showFilter = (valor) => {
    if (valor == true) {
      this.setState({ 
        show_filter: false,
        filtering: false,
        
        formFilter: {
          descripcion: "",
          customer_id: "",
          cost_center_id: "",
          service_type:"",
          execution_state: "",
          invoiced_state: "",
          start_date: "",
          end_date:"",
          quotation_number:"",
        },

        selectedOption: {
          customer_id: "",
          label: "Buscar cliente"
        },
        selectedOptionCentro: {
          cost_center_id: "",
          label: "Centro de costo"
        },
    
      });

      this.loadData();
    }else{
      this.setState({ show_filter: true, filtering: true });
    }
  }
  
  cancelFilter = () => {
    console.log("cancelFilter")
    this.setState({
      formFilter: {
        descripcion: "",
        customer_id: "",
        cost_center_id: "",
        execution_state: "",
        service_type: "",
        invoiced_state: "",
        start_date: "",
        end_date:"",
        quotation_number:"",
      },

      selectedOption: {
        customer_id: "",
        label: "Buscar cliente"
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
    fetch(`/get_cost_centers?descripcion=${this.state.formFilter.descripcion != undefined ? this.state.formFilter.descripcion : "" }&customer_id=${this.state.formFilter.customer_id != undefined ? this.state.formFilter.customer_id : ""}&cost_center_id=${this.state.formFilter.cost_center_id != undefined ? this.state.formFilter.cost_center_id : ""}&execution_state=${this.state.formFilter.execution_state != undefined ? this.state.formFilter.execution_state : ""}&service_type=${this.state.formFilter.service_type != undefined ? this.state.formFilter.service_type : ""}&invoiced_state=${this.state.formFilter.invoiced_state != undefined ? this.state.formFilter.invoiced_state : ""}&date_desde=${this.state.formFilter.date_desde != undefined ? this.state.formFilter.date_desde : ""}&date_hasta=${this.state.formFilter.date_hasta != undefined ? this.state.formFilter.date_hasta : ""}&quotation_number=${this.state.formFilter.quotation_number != undefined ? this.state.formFilter.quotation_number : ""}&filtering=${this.state.filtering}`)
      .then(response => response.json())
      .then(data => {
        this.setState({
          data: data.cost_centers_paginate,
          cost_centers_total: data.cost_centers_total,
          activePage: 1
        });
      });
  };

  change = e => {
    this.setState({
      countPage: e.target.value,
      activePage: this.state.countPage
    });
    fetch("/get_cost_centers?filter=" + e.target.value)
    .then(response => response.json())
    .then(data => {
      this.setState({
        data: data.cost_centers_paginate,
        cost_centers_total: data.cost_centers_total,
        activePage: 1
      });
    });
  }
  
  handlePageChange = pageNumber => {
    this.setState({ activePage: pageNumber });
    fetch(`/get_cost_centers?page=${pageNumber}&filter=${this.state.countPage}&descripcion=${this.state.filtering == true ? this.state.formFilter.descripcion : "" }&customer_id=${this.state.filtering == true && this.state.formFilter.customer_id != undefined ? this.state.formFilter.customer_id : ""}&execution_state=${this.state.filtering == true ? this.state.formFilter.execution_state : ""}&invoiced_state=${this.state.filtering == true ? this.state.formFilter.invoiced_state : ""}&filtering=${this.state.filtering}`) 
      .then(response => response.json())
      .then(data => {
        this.setState({ 
          data: data.cost_centers_paginate,
          cost_centers_total: data.cost_centers_total,
        });
      });
     
  };

  handleChangeAutocompleteCentro = selectedOptionCentro => {
    this.setState({
      selectedOptionCentro,
      formFilter: {
        ...this.state.formFilter,
        cost_center_id: selectedOptionCentro.value
      }
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


                formAutocompleteCustomer={this.state.selectedOption}
                onChangeAutocompleteCustomer={this.handleChangeAutocompleteCustomer}
                clientes={this.state.clients}

                   /* AUTOCOMPLETE CENTRO DE COSTO */

                   centro={this.state.dataCostCenter}
                   onChangeAutocompleteCentro={this.handleChangeAutocompleteCentro}
                   formAutocompleteCentro={this.state.selectedOptionCentro}

              />
            </div>


              <div className="row">
                <div className="col-md-12">
                  <div className="card card-table">
                    <div className="card-body">


                        {
                        this.state.isLoaded == true ? (
                            <Table 
                                dataActions={this.state.data} 
                                loadInfo={this.loadData}
                                usuario={this.props.usuario}
                                show={this.showFilter}
                                clientes={this.props.clientes}
                                estados={this.props.estados}
                                hours_real={this.props.hours_real}
                                hours_invoices={this.props.hours_invoices}
                            />

                        ) : (

                                <div className="col-md-12 text-center">
                                    <p>Cargando....</p>
                                </div>
                            )
                        }

                      <div className="col-md-12" style={{ marginTop: "50px" }}>
                        <div className="row">

                          <div className="col-md-9 text-left pl-0">
                              <p>
                                  Mostrando {this.state.data.length} de {this.state.cost_centers_total}
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
                              totalItemsCount={this.state.cost_centers_total}
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

export default indexTable;

