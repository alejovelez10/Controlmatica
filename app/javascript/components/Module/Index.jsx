import React  from 'react';
import Table from "../Module/table";

class Index extends React.Component {

    constructor(props){
        super(props)

        this.state = {
            data: [],
            activePage: 1,
            users_total: 0
        }
    }

    loadData = () => {
        fetch("/modules")
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
                  <div className="tile">
                    <div className="tile-body">
      
                      <Table 
                        dataActions={this.state.data} 
                        show={this.showFilter} 
                        showFilter={this.change}
                        loadInfo={this.loadData}
                        usuario={this.props.usuario}
                        estados={this.props.estados}
                      />

                      <div className="col-md-12">
                        <div className="row">
      
                          <div className="col-md-8 text-left p-0">
                              <p>
                                  Mostrando {this.state.data.length} de {this.state.users_total}
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

export default Index;
