import React from "react";
import Table from "../Users/table";
import Pagination from "react-js-pagination";

class index extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: [],
      isLoaded: false,
      activePage: 1,
      users_total: 0,
      show_filter: false,  
      formFilter: {
        name: "",
        email: "",
        state: "",
        rol_id: "",
        number_document: ""
      },

      countPage: 30,

    };
  }

  loadData = () => {
    fetch("/get_users")
    .then(response => response.json())
    .then(data => {
      this.setState({
        data: data.users_paginate,
        users_total: data.users_total,
        isLoaded: true
      });
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
        name: "",
        email: "",
        rol_id: "",
        state: "",
        number_document: ""
      },



    })
  }
  
  cancelFilter = () => {
    this.setState({
      formFilter: {
        name: "",
        email: "",
        rol_id: "",
        state: "",
        number_document: ""
      }

    })

    this.loadData();
  }

  change = e => {
    this.setState({
      countPage: e.target.value,
      activePage: this.state.countPage
    });
    fetch("/users/get_users?filter=" + e.target.value)
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
    fetch(`/users/get_users?page=${pageNumber}&filter=${this.state.countPage}`) 
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
    fetch(`/users/get_users?name=${this.state.formFilter.name}&email=${this.state.formFilter.email}&rol_id=${this.state.formFilter.rol_id}&state=${this.state.formFilter.state}&number_document=${this.state.formFilter.number_document}`)
      .then(response => response.json())
      .then(data => {
        this.setState({
          data: data.users_paginate,
          users_total: data.users_total,
          activePage: 1
        });
      });
   
  };

  render() {
    return (
      <React.Fragment>
       {/* <div style={{ display: this.state.show_filter == true ? "block" : "none" } }>
          <Filter
            onChangeFilter={this.handleChangeFilter}
            formValuesFilter={this.state.formFilter}
            onClick={this.HandleClickFilter}
            cancelFilter={this.cancelFilter}
            closeFilter={this.showFilter}
            rols={this.props.rols}
          />
        </div>*/}

              <div className="row">
                <div className="col-md-12">
                  <div className="card card-table">
                    <div className="card-body">
                {
                  this.state.isLoaded == true ? (
                    <Table 
                      dataUsers={this.state.data} 
                      users={this.loadData}
                      name={this.state.show} 
                      show={this.showFilter} 
                      showFilter={this.change}
                      loadDataTable={this.loadData}
                      isLoaded={this.state.isLoaded}
                      rols={this.props.rols}
                      all_users ={this.state.users_total}
                      estados={this.props.estados}
                    />
                  ) : (

                    <div className="col-md-12 text-center">
                      <p>Cargando....</p>
                    </div>
                  )
                }

                <div className="col-md-12">
                  <div className="row">

                    <div className="col-md-10 text-left p-0">
                        <p>
                            Mostrando {this.state.data.length} de {this.state.users_total}
                        </p>
                    </div>

                    <div className="col-md-2">
                      <Pagination
                        hideNavigation
                        activePage={this.state.activePage}
                        itemsCountPerPage={this.state.countPage}
                        itemClass="page-item"
                        innerClass="pagination"
                        linkClass="page-link"
                        totalItemsCount={this.state.users_total}
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
    );
  }
}

export default index;
