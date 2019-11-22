import React from 'react';
import Table from "../Rol/table";

class index extends React.Component {
    constructor(props){
        super(props)

        this.state = {
            data: [],
            activePage: 1,
            users_total: 0
        }
    }

    loadData = () => {
        fetch("/get_rols")
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


    render() {
        return (
            <React.Fragment>
              <div className="row">
                <div className="col-md-12">
                  <div className="card card-table">
                    <div className="card-body">
      
                      <Table 
                        dataActions={this.state.data} 
                        show={this.showFilter} 
                        showFilter={this.change}
                        loadInfo={this.loadData}
                        usuario={this.props.usuario}
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
