import React from 'react';
import Table from "../Providers/table";

class index extends React.Component {
    constructor(props){
        super(props)

        this.state = {
            data: [],
        }
    }

    loadData = () => {
        fetch("/get_providers")
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
      
                      <Table 
                        dataActions={this.state.data} 
                        loadInfo={this.loadData}
                        usuario={this.props.usuario}
                      />
                    
      
                    </div>
                  </div>

            </React.Fragment>

        )
      
    }
}

export default index;
