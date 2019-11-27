import React from 'react';
import Table from "../ConstCenter/tableIndex";
import NumberFormat from 'react-number-format';
import Filter from "../ConstCenter/FormFilter"

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
              invoiced_state: ""
            }
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
      this.setState({ 
        show_filter: false,
        formFilter: {
          descripcion: "",
          customer_id: "",
          execution_state: "",
          invoiced_state: ""
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
        invoiced_state: ""
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


  HandleClickFilter = e => {
    fetch(`/get_cost_centers?descripcion=${this.state.formFilter.descripcion != undefined ? this.state.formFilter.descripcion : "" }&customer_id=${this.state.formFilter.customer_id != undefined ? this.state.formFilter.customer_id : ""}&execution_state=${this.state.formFilter.execution_state != undefined ? this.state.formFilter.execution_state : ""}&invoiced_state=${this.state.formFilter.invoiced_state != undefined ? this.state.formFilter.invoiced_state : ""}`)
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
                clientes={this.props.clientes}
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

      
                    </div>
                  </div>
                </div>
              </div>

            </React.Fragment>

        )
      
    }
}

export default indexTable;

