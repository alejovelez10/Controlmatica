import React from 'react';
import Table from "../PurchaseOrders/table";
import NumberFormat from 'react-number-format';
import ShowInfo from "../ConstCenter/show"

class index extends React.Component {
    constructor(props){
        super(props)

        this.state = {
            data_show: [],
            data_purchase_orders: [],
            isLoaded: false
        }
    }

    loadData = () => {
        fetch("/get_show_center/" + this.props.cost_center.id)
        .then(response => response.json())
        .then(data => {

          this.setState({
            data_show: data.data_show,
            data_purchase_orders: data.data_orders
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
                {this.state.isLoaded == true ? (
                    <ShowInfo 
                        data_info={this.state.data_show}
                    />
                  ) : (
                    <div className="col-md-12 text-center p-0">
                          <p>Cargando..</p>
                    </div>
                )}
        

              <div className="row mt-5">
                <div className="col-md-12">
                  <div className="card card-table">
                    <div className="card-body">


                        {
                        this.state.isLoaded == true ? (
                            <Table 
                                dataActions={this.state.data_purchase_orders} 
                                cost_center={this.state.data_show}
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

export default index;
