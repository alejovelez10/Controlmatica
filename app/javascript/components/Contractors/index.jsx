import React from 'react';
import Table from "../Contractors/table";
import NumberFormat from 'react-number-format';
import Filter from "../Contractors/FormFilter"
import Pagination from "react-js-pagination";

class index extends React.Component {
    constructor(props){
        super(props)

        this.state = {
          data: [],
          show_filter: false,
          formFilter: {
            user_execute_id: "",
            sales_date: "",
            cost_center_id: "",
            date_desde: "",
            date_hasta: "",
          },

          activePage: 1,
          contractors_total: 0, 
          countPage: 10,

          selectedOptionCentro: {
            cost_center_id: "",
            label: "Centro de costo"
          },
    
          dataCostCenter: []

        }
    }

    loadDataTable = () => {
      fetch("/get_contractors/")
      .then(response => response.json())
      .then(data => {
        console.log(data)
        this.setState({
          data: data.contractors_paginate,
          contractors_total: data.contractors_total,
        });

        setTimeout(() => {
          this.setState({
            isLoaded: true
            
          });
          
        },1000)
      });
    }
    
    componentDidMount() {
        this.loadDataTable();
        let array = []

        this.props.cost_center.map((item) => (
          array.push({label: item.code, value: item.id})
        ))
    
        this.setState({
          dataCostCenter: array
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

      
  showFilter = (valor) => {
    if (valor == true) {
      this.setState({ show_filter: false });
    }else{
      this.setState({ show_filter: true });
    }

    this.setState({
      formFilter: {
        user_execute_id: "",
        sales_date: "",
        cost_center_id: "",
        date_desde: "",
        date_hasta: "",
      },

      selectedOptionCentro: {
        cost_center_id: "",
        label: "Centro de costo"
      },

    })


    this.loadDataTable();
  }
  

  change = e => {
    this.setState({
      countPage: e.target.value,
      activePage: this.state.countPage
    });
    fetch("/get_contractors?filter=" + e.target.value)
    .then(response => response.json())
    .then(data => {
      this.setState({
        data: data.contractors_paginate,
        contractors_total: data.contractors_total,
        activePage: 1
      });
    });
  }
  
  handlePageChange = pageNumber => {
    this.setState({ activePage: pageNumber });
    fetch(`/get_contractors?page=${pageNumber}&filter=${this.state.countPage}`) 
      .then(response => response.json())
      .then(data => {
        this.setState({ data: data.contractors_paginate });
      });
     
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
    fetch(`/get_contractors?user_execute_id=${this.state.formFilter.user_execute_id}&sales_date=${this.state.formFilter.sales_date}&cost_center_id=${this.state.formFilter.cost_center_id}&date_desde=${this.state.formFilter.date_desde}&date_hasta=${this.state.formFilter.date_hasta}`)
      .then(response => response.json())
      .then(data => {
        this.setState({
          data: data.contractors_paginate,
          contractors_total: data.contractors_total,
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
                  users={this.props.users}
                  cost_centers={this.props.cost_center}

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
                                loadInfo={this.loadDataTable}
                                usuario={this.props.usuario}
                                estados={this.props.estados}
                                cost_center={this.props.cost_center}
                                users={this.props.users}
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
                                    Mostrando {this.state.data.length} de {this.state.contractors_total}
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
                                totalItemsCount={this.state.contractors_total}
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
