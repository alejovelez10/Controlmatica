import React from 'react';
import Table from "../Materials/table";
import NumberFormat from 'react-number-format';
import Filter from "../Materials/FormFilter"

class index extends React.Component {
    constructor(props){
        super(props)

        this.state = {
            data: [],
            show_filter: false,
            formFilter: {
              provider_id: "",
              sales_date: "",
              description: "",
              cost_center_id: "",
            }

        }
    }

    loadDataTable = () => {
      fetch("/get_materials/")
      .then(response => response.json())
      .then(data => {
        this.setState({
          data: data
        });

        setTimeout(() => {
          this.setState({
            isLoaded: true
            
          });
          
        },1000)
      });
    }

    showFilter = (valor) => {
      if (valor == true) {
        this.setState({ 
          show_filter: false,
          formFilter: {
            provider_id: "",
            sales_date: "",
            description: "",
            cost_center_id: ""
          }
      
        });
  
        this.loadDataTable();
      }else{
        this.setState({ show_filter: true });
      }
    }
    
    
    componentDidMount() {
        this.loadDataTable();
    }

      
  change = e => {
    this.setState({
      countPage: e.target.value,
      activePage: this.state.countPage
    });
    fetch("/get_payments?filter=" + e.target.value)
    .then(response => response.json())
    .then(data => {
      this.setState({
        data: data.users_paginate,
        users_total: data.users_total,
        activePage: 1
      });
    });
  }
  
  handlePageChange = pageNumber => {
    this.setState({ activePage: pageNumber });
    fetch(`/get_incomes?page=${pageNumber}&filter=${this.state.countPage}`) 
      .then(response => response.json())
      .then(data => {
        this.setState({ data: data.users_paginate });
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
    fetch(`/get_materials?provider_id=${this.state.formFilter.provider_id}&sales_date=${this.state.formFilter.sales_date}&description=${this.state.formFilter.description}&cost_center_id=${this.state.formFilter.cost_center_id}`)
      .then(response => response.json())
      .then(data => {
        this.setState({
          data: data,
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
                  providers={this.props.providers}
                  cost_centers={this.props.cost_center}
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
                                cost_center={this.props.cost_center}
                                loadInfo={this.loadDataTable}
                                usuario={this.props.usuario}
                                providers={this.props.providers}
                                estados={this.props.estados}
                                show={this.showFilter}
                            />

                        ) : (

                                <div className="col-md-12 text-center">
                                    <p>Cargando....</p>
                                </div>
                            )
                        }

      
                    </div>
                  </div>
                </div>
              </div>

            </React.Fragment>

        )
      
    }
}

export default index;
