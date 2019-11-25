import React from 'react';
import Table from "../Customers/table";

class index extends React.Component {
    constructor(props){
        super(props)

        this.state = {
            data: [],
            formSearch: {
              name: "",
            },

            stateSearch: false,
            stateSearchCancel: false,
        }
    }

    loadData = () => {
        fetch("/get_customers")
        .then(response => response.json())
        .then(data => {
          this.setState({
            data: data
          });
        });


      }
    
    componentDidMount() {
        this.loadData();
    }

    handleChange = e => {
      this.setState({
        formSearch: {
          ...this.state.formSearch,
          [e.target.name]: e.target.value
        }
      });
    };

    HandleClickFilter = e => {
      fetch(`/get_customers?name=${this.state.formSearch.name != undefined ? this.state.formSearch.name : "" }`)
        .then(response => response.json())
        .then(data => {
          this.setState({
            data: data,
            stateSearchCancel: true
          });
        });
    };


    CancelFilter = () =>{
      this.setState({
        formSearch: {
          name: "",
        },
        stateSearchCancel: false
      });
      this.loadData();
    }


    render() {
        return (
            <React.Fragment>
              <div className="row">
                <div className="col-md-12">
                  <div className="card card-table">
                    <div className="card-body">

                    <div className="row mb-4">
                        <div className="col-md-12">
                            <div className="row">

                                <div className="col-md-8">
                                   <div className="col-md-5 pl-0">

                                   <div className="input-group">
                                      <input type="text" name="name" style={{ height: "37px" }} className="form-control" onChange={this.handleChange} value={this.state.formSearch.name} placeholder="Buscador" />

                                      <div className="input-group-append">
                                        
                                        
                                          <button className="btn btn-secondary" onClick={this.HandleClickFilter}>
                                            <i className="fas fa-search"></i>
                                          </button>
                                      

                                        {this.state.stateSearchCancel == true && (
                                          <button className="btn btn-danger" onClick={this.CancelFilter} type="button">Cancel</button>
                                        )}

                                      </div>

                                    </div>

                                   </div>
                                </div>

                                <div className="col-md-4 text-right">
                                  {this.props.estados.create == true && (
                                    <a href="/customers/new" className="btn btn-secondary" >Nuevo Cliente</a>
                                  )}
                                </div>
                            </div>
                        </div>
                    </div>
      
                      <Table 
                        dataActions={this.state.data} 
                        loadInfo={this.loadData}
                        usuario={this.props.usuario}
                        estados={this.props.estados}
                      />
                    
      
                    </div>
                  </div>
                </div>
              </div>

            </React.Fragment>

        )
      
    }
}

export default index;
