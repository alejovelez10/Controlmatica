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
            notifications_total: 0, 
            countPage: 10,
            isLoaded: false,
        }
    }

    loadData = () => {
        fetch(`/${this.props.urlLoadData}`)
        .then(response => response.json())
        .then(data => {
          console.log(data)
          this.setState({
            data: data.data,
            notifications_total: data.data.length,
            isLoaded: true,
          });
        });


      }
    
    componentDidMount() {
        this.loadData();
    }

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
      fetch(`/get_notifications?date_desde=${this.state.formFilter.date_desde != undefined ? this.state.formFilter.date_desde : "" }&date_hasta=${this.state.formFilter.date_hasta != undefined ? this.state.formFilter.date_hasta : ""}&number_order=${this.state.formFilter.number_order != undefined ? this.state.formFilter.number_order : ""}&cost_center_id=${this.state.formFilter.cost_center_id != undefined ? this.state.formFilter.cost_center_id : ""}`)
        .then(response => response.json())
        .then(data => {
          this.setState({
            data: data.data,
            notifications_total: data.data.length,
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
          data: data.notifications,
          notifications_total: data.notifications.length,
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
            data: data.data,
            notifications_total: data.data.length,
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

                />
              </div>

              <div className="row">
                <div className="col-md-12">
                  <div className="card card-table">
                    <div className="card-body">
      
                        {this.state.isLoaded == true ? (
                            <Table 
                              data={this.state.data} 
                                loadInfo={this.loadData}
                                usuario={this.props.usuario}
                                url={this.props.url}
                                urlUpdateAll={this.props.urlUpdateAll}
                                show={this.showFilter}
                                from={this.props.from}

                                pending={this.props.pending}
                                review={this.props.review}
                                estados={this.props.estados}
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
                                  Mostrando {this.state.data.length} de {this.state.notifications_total}
                              </p>
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
