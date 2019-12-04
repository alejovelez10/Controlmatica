import React from 'react';
import Table from "../Contractors/table";
import NumberFormat from 'react-number-format';
import Filter from "../Contractors/FormFilter"

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
          }

        }
    }

    loadDataTable = () => {
      fetch("/get_contractors/")
      .then(response => response.json())
      .then(data => {
        console.log(data)
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
    
    componentDidMount() {
        this.loadDataTable();
    }

      
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
      }

    })


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
    fetch(`/get_contractors?user_execute_id=${this.state.formFilter.user_execute_id}&sales_date=${this.state.formFilter.sales_date}&cost_center_id=${this.state.formFilter.cost_center_id}`)
      .then(response => response.json())
      .then(data => {
        this.setState({
          data: data
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

      
                    </div>
                  </div>
                </div>
              </div>

            </React.Fragment>

        )
      
    }
}

export default index;
