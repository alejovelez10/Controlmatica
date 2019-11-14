import React from 'react';
import Table from "../ConstCenter/tableIndex";
import NumberFormat from 'react-number-format';

class indexTable extends React.Component {
    constructor(props){
        super(props)

        this.state = {
            data: [],
            isLoaded: false
        }
    }

    loadData = () => {
        fetch("/get_cost_centers")
        .then(response => response.json())
        .then(data => {

          this.setState({
            data: data.cost_centers_paginate,
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
      this.setState({ show_filter: false });
    }else{
      this.setState({ show_filter: true });
    }

    this.setState({
      formFilter: {
        date_of_entry: "",
        value: "",
        number_account: "",
        voucher_number: ""
      }

    })


    this.loadData();
  }
  
  cancelFilter = () => {
    this.setState({
      formFilter: {
        date_of_entry: "",
        value: "",
        number_account: "",
        voucher_number: ""
      }

    })

    this.loadData();
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
    fetch(`/get_incomes/${this.props.agreement.id}?date_of_entry=${this.state.formFilter.date_of_entry}&value=${this.state.formFilter.value}&number_account=${this.state.formFilter.number_account}&voucher_number=${this.state.formFilter.voucher_number}`)
      .then(response => response.json())
      .then(data => {
        this.setState({
          data: data.income_paginate,
          users_total: data.income_total,
          activePage: 1
        });
      });
   
  };


    render() {
        return (
            <React.Fragment>

    
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

export default indexTable;

