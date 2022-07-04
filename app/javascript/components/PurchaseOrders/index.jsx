import React from 'react';
import Table from "./table";
import Filter from "./FormFilter"
import Pagination from "react-js-pagination";

class index extends React.Component {
    constructor(props){
        super(props)

        this.state = {
            data: [],
            show_filter: false,
            filtering: false,

            formFilter: {
              date_desde: "",
              date_hasta: "",
              number_order: "",
              cost_center_id: "",
              state: "",
              description: "",
              customer: "",
              number_invoice: "",
              quotation_number: ""
            },

            activePage: 1,
            sales_orders_total: 0, 
            sales_orders_total_exel: 0,
            countPage: 10,
            isLoaded: false,

            selectedOptionCentro: {
              cost_center_id: "",
              label: "Centro de costo"
            },

            selectedOptionCustomer: {
              customer: "",
              label: "Cliente"
            },

            dataCostCenter: [],
            clients: []
        }
    }

    loadData = () => {
        fetch("/get_sales_order")
        .then(response => response.json())
        .then(data => {
          console.log(data)
          console.log(data.sales_orders_total)
          this.setState({
            data: data.sales_order,
            sales_orders_total: data.sales_orders_total,
            isLoaded: true,
          });
        });


      }
    
    componentDidMount() {
        this.loadData();

        let array = []
        let arrayClientes = []

        this.props.cost_centers.map((item) => (
          array.push({label: item.code, value: item.id})
        ))

        this.props.clientes.map((item) => (
          arrayClientes.push({label: item.name, value: item.id})
        ))
    
        this.setState({
          dataCostCenter: array,
          clients: arrayClientes
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

    handleChangeAutocompleteCustomer = selectedOptionCustomer => {
      this.setState({
        selectedOptionCustomer,
        formFilter: {
          ...this.state.formFilter,
          customer: selectedOptionCustomer.value
        }
      });
    };

    showFilter = valor => {
      if (valor == true) {
        this.setState({ show_filter: false, filtering: false  });
        this.loadData();
      } else {
        this.setState({ show_filter: true, filtering: true  });
      }
      
      this.setState({
        formFilter: {
          date_desde: "",
          date_hasta: "",
          number_order: "",
          cost_center_id: "",
          state: "",
          description: "",
          number_invoice: "",
          quotation_number: ""
        },

        selectedOptionCentro: {
          cost_center_id: "",
          label: "Centro de costo"
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
      fetch(`/get_sales_order?date_desde=${this.state.formFilter.date_desde != undefined ? this.state.formFilter.date_desde : "" }&date_hasta=${this.state.formFilter.date_hasta != undefined ? this.state.formFilter.date_hasta : ""}&number_order=${this.state.formFilter.number_order != undefined ? this.state.formFilter.number_order : ""}&cost_center_id=${this.state.formFilter.cost_center_id != undefined ? this.state.formFilter.cost_center_id : ""}&state=${this.state.formFilter.state}&description=${this.state.formFilter.description}&customer=${this.state.formFilter.customer != undefined ? this.state.formFilter.customer : ""}&number_invoice=${this.state.formFilter.number_invoice != undefined ? this.state.formFilter.number_invoice : ""}&quotation_number=${this.state.formFilter.quotation_number != undefined ? this.state.formFilter.quotation_number : "" }&filtering=${this.state.filtering}`)
        .then(response => response.json())
        .then(data => {
          this.setState({
            data: data.sales_order,
            sales_orders_total: data.sales_orders_total,
            activePage: 1
          });
        });
    };

    change = e => {
      this.setState({
        countPage: e.target.value,
        activePage: this.state.countPage
      });
      fetch("/get_sales_order?filter=" + e.target.value)
      .then(response => response.json())
      .then(data => {
        this.setState({
          data: data.sales_order,
          sales_orders_total: data.sales_orders_total,
          activePage: 1
        });
      });
    }
    
    handlePageChange = pageNumber => {
      this.setState({ activePage: pageNumber });
      fetch(`/get_sales_order?page=${pageNumber}&filter=${this.state.countPage}&filtering=${this.state.filtering}&date_desde=${this.state.filtering == true ? this.state.formFilter.date_desde : "" }&date_hasta=${this.state.filtering == true ? this.state.formFilter.date_hasta : ""}&number_order=${this.state.filtering == true ? this.state.formFilter.number_order : ""}&cost_center_id=${this.state.filtering == true && this.state.formFilter.cost_center_id != undefined ? this.state.formFilter.cost_center_id : ""}&state=${this.state.filtering == true ? this.state.formFilter.state : ""}&description=${this.state.filtering == true ? this.state.formFilter.description : ""}&customer=${this.state.filtering == true && this.state.formFilter.customer != undefined ? this.state.formFilter.customer : ""}&number_invoice=${this.state.formFilter.number_invoice != undefined ? this.state.formFilter.number_invoice : ""}&quotation_number=${this.state.formFilter.quotation_number != undefined ? this.state.formFilter.quotation_number : "" }`) 
        .then(response => response.json())
        .then(data => {
          this.setState({           
            data: data.sales_order,
            sales_orders_total: data.sales_orders_total,
          });
        });
       
    };


    //add items
    updateData = (data) => {
      this.setState({
        data: [...this.state.data, data].reverse(),
      })
    }

    //add update
    updateItem = sales_order => {
        this.setState({
            data: this.state.data.map(item => {
            if (sales_order.id === item.id) {
              return { ...item, 
                cost_center: sales_order.cost_center,
                created_date: sales_order.created_date,
                cost_center_id: sales_order.cost_center_id,
                created_at: sales_order.created_at,
                customer_invoices: sales_order.customer_invoices,
                description: sales_order.description,
                last_user_edited: sales_order.last_user_edited,

                last_user_edited_id: sales_order.last_user_edited_id,
                order_file: sales_order.order_file,
                order_number: sales_order.order_number,
                order_value: sales_order.order_value,
                state: sales_order.state,
                sum_invoices: sales_order.sum_invoices,
                update_user: sales_order.update_user,
                updated_at: sales_order.updated_at,
                user: sales_order.user,
                user_id: sales_order.user_id,
              }
            }
            return item;
          })
        });
    }


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


                  /* AUTOCOMPLETE CLIENTE */
                  clientes={this.state.clients}
                  onChangeAutocompleteCustomer={this.handleChangeAutocompleteCustomer}
                  formAutocompleteCustomer={this.state.selectedOptionCustomer}
                />
              </div>

              <div className="row">
                <div className="col-md-12">
                  <div className="card card-table">
                    <div className="card-body">
      
                        {this.state.isLoaded ? (
                            <Table 
                                dataActions={this.state.data} 
                                loadInfo={this.loadData}
                                usuario={this.props.usuario}
                                estados={this.props.estados}
                                cost_centers={this.props.cost_centers}
                                show={this.showFilter}
                                filtering={this.state.filtering}
                                sales_orders_total_exel={this.state.sales_orders_total_exel}
                                formFilter={this.state.formFilter}

                                updateData={this.updateData}
                                updateItem={this.updateItem}
                            />

                        ) : (

                                <div className="col-md-12 text-center">
                                    <p>Cargando....</p>
                                </div>
                        )}

                      <div className="col-md-12" style={{ marginTop: "50px" }}>
                        <div className="row">

                          <div className="col-md-7 text-left pl-0">
                              <p>
                                  Mostrando {this.state.data.length} de {this.state.sales_orders_total}
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
                              totalItemsCount={this.state.sales_orders_total}
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
