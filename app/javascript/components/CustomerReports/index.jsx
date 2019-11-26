import React from 'react';
import Table from "../CustomerReports/table";

class index extends React.Component {
    constructor(props){
        super(props)

        this.state = {
            data: [],
        }
    }

    loadData = () => {
        fetch("/get_customer_reports")
        .then(response => response.json())
        .then(data => {
          console.log(data)
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
                        loadInfo={this.loadData}
                        usuario={this.props.usuario}
                        estados={this.props.estados}
                        clientes={this.props.clientes}
                        contacts={this.props.contacts}
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
