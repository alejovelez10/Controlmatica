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
            formFilter: {
              date_desde: "",
              date_hasta: "",
              number_order: "",
              cost_center_id: "",
            },

            activePage: 1,
            sales_orders_total: 0, 
            countPage: 10,
            isLoaded: false,

            selectedOptionCentro: {
              cost_center_id: "",
              label: "Centro de costo"
            },

            dataCostCenter: [],
        }
    }

    loadData = () => {
        fetch("/get_sales_order")
        .then(response => response.json())
        .then(data => {
          console.log(data)
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

        this.props.cost_centers.map((item) => (
          array.push({label: item.code, value: item.id})
        ))
    
        this.setState({
          dataCostCenter: array,
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

    showFilter = valor => {
      if (valor == true) {
        this.setState({ show_filter: false });
        this.loadData();
      } else {
        this.setState({ show_filter: true });
      }
      
      this.setState({
        formFilter: {
          date_desde: "",
          date_hasta: "",
          number_order: "",
          cost_center_id: "",
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
      fetch(`/get_sales_order?date_desde=${this.state.formFilter.date_desde != undefined ? this.state.formFilter.date_desde : "" }&date_hasta=${this.state.formFilter.date_hasta != undefined ? this.state.formFilter.date_hasta : ""}&number_order=${this.state.formFilter.number_order != undefined ? this.state.formFilter.number_order : ""}&cost_center_id=${this.state.formFilter.cost_center_id != undefined ? this.state.formFilter.cost_center_id : ""}`)
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
      fetch(`/get_sales_order?page=${pageNumber}&filter=${this.state.countPage}`) 
        .then(response => response.json())
        .then(data => {
          this.setState({           
            data: data.sales_order,
            sales_orders_total: data.sales_orders_total,
          });
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

                />
              </div>

              <div className="row">
                <div className="col-md-12">
                  <div className="card card-table">
                    <div className="card-body">
      
                        {this.state.isLoaded == true ? (
                            <Table 
                                dataActions={this.state.data} 
                                loadInfo={this.loadData}
                                usuario={this.props.usuario}
                                estados={this.props.estados}
                                cost_centers={this.props.cost_centers}
                                show={this.showFilter}
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
