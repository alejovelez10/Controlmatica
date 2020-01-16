import React from 'react';
import Table from "../Materials/table";
import NumberFormat from 'react-number-format';
import Filter from "../Materials/FormFilter"
import Pagination from "react-js-pagination";

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
              estado: "",
              date_desde: "",
              date_hasta: "",
            },

            activePage: 1,
            materials_total: 0, 
            countPage: 10,

            selectedOptionCentro: {
              cost_center_id: "",
              label: "Centro de costo"
            },
      
            dataCostCenter: []

        }
    }

    loadDataTable = () => {
      fetch("/get_materials/")
      .then(response => response.json())
      .then(data => {
        this.setState({
          data: data.materials_paginate,
          materials_total: data.materials_total,
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
            cost_center_id: "",
            estado: "",
            date_desde: "",
            date_hasta: "",
          },

          selectedOptionCentro: {
            cost_center_id: "",
            label: "Centro de costo"
          },
      
        });
  
        this.loadDataTable();
      }else{
        this.setState({ show_filter: true });
      }
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
  

      
  change = e => {
    this.setState({
      countPage: e.target.value,
      activePage: this.state.countPage
    });
    fetch("/get_materials?filter=" + e.target.value)
    .then(response => response.json())
    .then(data => {
      this.setState({
        data: data.materials_paginate,
        materials_total: data.materials_total,
        activePage: 1
      });
    });
  }
  
  handlePageChange = pageNumber => {
    this.setState({ activePage: pageNumber });
    fetch(`/get_materials?page=${pageNumber}&filter=${this.state.countPage}`) 
      .then(response => response.json())
      .then(data => {
        this.setState({ 
          data: data.materials_paginate,
          materials_total: data.materials_total,
        });
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
    fetch(`/get_materials?provider_id=${this.state.formFilter.provider_id}&sales_date=${this.state.formFilter.sales_date}&description=${this.state.formFilter.description}&cost_center_id=${this.state.formFilter.cost_center_id}&estado=${this.state.formFilter.estado}&date_desde=${this.state.formFilter.date_desde}&date_hasta=${this.state.formFilter.date_hasta}`)
      .then(response => response.json())
      .then(data => {
        this.setState({
          data: data.materials_paginate,
          materials_total: data.materials_total,
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

                        <div className="col-md-12" style={{ marginTop: "50px" }}>
                          <div className="row">

                            <div className="col-md-9 text-left pl-0">
                                <p>
                                    Mostrando {this.state.data.length} de {this.state.materials_total}
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
                                totalItemsCount={this.state.materials_total}
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
