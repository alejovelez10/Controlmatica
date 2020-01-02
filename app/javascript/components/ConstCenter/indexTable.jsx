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
            formFilter: {
              descripcion: "",
              customer_id: "",
              execution_state: "",
              invoiced_state: "",
              cliente_name: "",
            },

            activePage: 1,
            cost_centers_total: 0, 
            countPage: 10,
            showInput: false
        }
    }

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
        this.loadData();
    }

      
  showFilter = (valor) => {
    if (valor == true) {
      this.setState({ 
        show_filter: false,
        formFilter: {
          descripcion: "",
          customer_id: "",
          execution_state: "",
          invoiced_state: "",
          cliente_name: "",
        }
    
      });

      this.loadData();
    }else{
      this.setState({ show_filter: true });
    }
  }
  
  cancelFilter = () => {
    console.log("cancelFilter")
    this.setState({
      formFilter: {
        descripcion: "",
        customer_id: "",
        execution_state: "",
        invoiced_state: "",
        cliente_name: "",
      }

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

  handleChangeCheckBox = e => {
      this.setState({ 
        showInput: (this.state.showInput == true ? false : true),
        formFilter: {
          ...this.state.formFilter,
          cliente_name: "",
          customer_id: "",
        }
      })
  };



  HandleClickFilter = e => {
    fetch(`/get_cost_centers?descripcion=${this.state.formFilter.descripcion != undefined ? this.state.formFilter.descripcion : "" }&customer_id=${this.state.formFilter.customer_id != undefined ? this.state.formFilter.customer_id : ""}&execution_state=${this.state.formFilter.execution_state != undefined ? this.state.formFilter.execution_state : ""}&invoiced_state=${this.state.formFilter.invoiced_state != undefined ? this.state.formFilter.invoiced_state : ""}&cliente_name=${this.state.formFilter.cliente_name != undefined ? this.state.formFilter.cliente_name : ""}`)
      .then(response => response.json())
      .then(data => {
        this.setState({
          data: data.cost_centers_paginate,
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
    fetch(`/get_cost_centers?page=${pageNumber}&filter=${this.state.countPage}`) 
      .then(response => response.json())
      .then(data => {
        this.setState({ data: data.cost_centers_paginate });
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
                clientes={this.props.clientes}

                onChangeCheckBox={this.handleChangeCheckBox}
                showInput={this.state.showInput}
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

