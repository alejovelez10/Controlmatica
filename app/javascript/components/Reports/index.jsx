import React from 'react';
import Table from "../Reports/table";
import Filter from "../Reports/FormFilter"

class index extends React.Component {
    constructor(props){
        super(props)

        this.state = {
            data: [],
            show_filter: false,
            formFilter: {
              work_description: "",
              report_execute_id: "",
              date_ejecution: "",
              report_sate: ""
            }
        }
    }

    loadData = () => {
        fetch("/get_reports")
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

    showFilter = valor => {
      if (valor == true) {
        this.setState({ show_filter: false });
        this.loadData();
      } else {
        this.setState({ show_filter: true });
      }
      
      this.setState({
        formFilter: {
          work_description: "",
          report_execute_id: "",
          date_ejecution: "",
          report_sate: ""
        }
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
      fetch(`/get_reports?work_description=${this.state.formFilter.work_description != undefined ? this.state.formFilter.work_description : "" }&report_execute_id=${this.state.formFilter.report_execute_id != undefined ? this.state.formFilter.report_execute_id : ""}&date_ejecution=${this.state.formFilter.date_ejecution != undefined ? this.state.formFilter.date_ejecution : ""}&report_sate=${this.state.formFilter.report_sate != undefined ? this.state.formFilter.report_sate : ""}`)
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
                  users={this.props.users}
                />
              </div>

              <div className="row">
                <div className="col-md-12">
                  <div className="card card-table">
                    <div className="card-body">
      
                      <Table 
                        dataActions={this.state.data} 
                        loadInfo={this.loadData}
                        usuario={this.props.usuario}
                        show={this.showFilter}
                        clientes={this.props.clientes}
                        users={this.props.users}
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
