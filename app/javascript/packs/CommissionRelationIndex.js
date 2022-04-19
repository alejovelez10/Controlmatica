import React, { Component } from 'react';
import Table from '../components/CommissionRelation/Index'
import FormFilter from '../components/CommissionRelation/FormFilter';
import WebpackerReact from 'webpacker-react';

class CommissionRelationIndex extends Component {
    constructor(props) {
        super(props);
        this.token = document.querySelector("[name='csrf-token']").content;
        this.state = {
            data: [],
            isLoaded: true,
            showFilter: false,

            activePage: 1,
            total: 0, 
            countPage: 10,

            formFilter: {
                creation_date: "", 
                user_report_id: "",
                start_date: "", 
                end_date: "", 
                area: "", 
                observations: "", 
                user_direction_id: "",
            },

            selectedOptionUserDirection: {
                user_direction_id: "",
                label: "Nombre del director"
            },

            selectedOptionUserReport: {
                user_report_id: "",
                label: "Nombre del empleado"
            },

            users: [],
        }
    }

    componentDidMount(){
        this.loadData();
        this.configSelect();
    }

    updateStateLoad = (state) => {
        this.setState({ isLoaded: state })
    } 

    //add items
    updateData = (data) => {
        this.setState({
            data: [...this.state.data, data].reverse(),
        })
    }

    configSelect = () => {
        let arrayUsers = [];

        this.props.users.map((item) => (
            arrayUsers.push({label: `${item.names}`, value: item.id})
        ))

        this.setState({
            users: arrayUsers,
        })
    }

    //add update
    updateItem = format => {
        this.setState({
            data: this.state.data.map(item => {
            if (format.id === item.id) {
              return { ...item, 
                area: format.area,
                creation_date: format.creation_date,
                end_date: format.end_date,
                observations: format.observations,
                start_date: format.start_date,
                user_direction: format.user_direction,
                user_direction_id: format.user_direction_id,
                user_report: format.user_report,
                user_report_id: format.user_report_id,
              }
            }
            return item;
          })
        });
    }

    loadData = () => {
        fetch(`/get_commission_relations`, {
            method: 'GET', // or 'PUT'
            headers: {
                "X-CSRF-Token": this.token,
                "Content-Type": "application/json"
            }
        })
        .then(response => response.json())
        .then(data => {
            this.setState({
                data: data.data,
                total: data.total,
                isLoaded: false
            });
        });
    }


    HandleClickFilter = e => {
        this.setState({ isLoaded: true, isFiltering: true })
        fetch(`/get_commission_relations?user_direction_id=${this.state.formFilter.user_direction_id}&user_report_id=${this.state.formFilter.user_report_id}&observations=${this.state.formFilter.observations}&start_date=${this.state.formFilter.start_date}&end_date=${this.state.formFilter.end_date}&creation_date=${this.state.formFilter.creation_date}&area=${this.state.formFilter.area}`, {
            method: 'GET', // or 'PUT'
            headers: {
                "X-CSRF-Token": this.token,
                "Content-Type": "application/json"
            }
        })

        .then(response => response.json())
        .then(data => {
            this.setState({
                data: data.data,
                isLoaded: false,
            });
        });
    };

    clearValues = () => {
        this.setState({
            formFilter: {
                creation_date: "", 
                user_report_id: "",
                start_date: "", 
                end_date: "", 
                area: "", 
                observations: "", 
                user_direction_id: "",
            },

            selectedOptionUserDirection: {
                user_direction_id: "",
                label: "Nombre director"
            },

            selectedOptionUserReport: {
                user_report_id: "",
                label: "Nombre del empleado"
            },

        })
    }

    filter = (state) => {
        this.setState({ showFilter: state })
        if (!state){
            this.loadData();
            this.clearValues();
        }
    }

    HandleChange = (e) => {
        this.setState({
            formFilter: {
                ...this.state.formFilter,
                [e.target.name]: e.target.value
            }
        })
    }

    handleChangeAutocompleteUserDirection = selectedOptionUserDirection => {
        this.setState({
            selectedOptionUserDirection,
                formFilter: {
                    ...this.state.formFilter,
                    user_direction_id: selectedOptionUserDirection.value
                }
        });
    };

    handleChangeAutocompleteUserReport = selectedOptionUserReport => {
        this.setState({
            selectedOptionUserReport,
                formFilter: {
                    ...this.state.formFilter,
                    user_report_id: selectedOptionUserReport.value
                }
        });
    };

    handlePageChange = pageNumber => {
        this.setState({ activePage: pageNumber }); 
        fetch(`/get_commission_relations?page=${pageNumber}&filter=${this.state.countPage}&user_direction_id=${this.state.formFilter.user_direction_id}&user_report_id=${this.state.formFilter.user_report_id}&observations=${this.state.formFilter.observations}&start_date=${this.state.formFilter.start_date}&end_date=${this.state.formFilter.end_date}&creation_date=${this.state.formFilter.creation_date}&area=${this.state.formFilter.area}`, {
            method: 'GET', // or 'PUT'
            headers: {
                "X-CSRF-Token": this.token,
                "Content-Type": "application/json"
            }
        })
        .then(response => response.json())
        .then(data => {
            this.setState({ 
                data: data.data,
                total: data.total,
            });
        });     
    };

    render() {
        return (
            <React.Fragment>
                {this.state.showFilter && (
                    <FormFilter
                        HandleClickFilter={this.HandleClickFilter}
                        formValues={this.state.formFilter}
                        onChangeForm={this.HandleChange}
                        filter={this.filter}

                        //select values

                        handleChangeAutocompleteUserDirection={this.handleChangeAutocompleteUserDirection}
                        selectedOptionUserDirection={this.state.selectedOptionUserDirection}

                        handleChangeAutocompleteUserReport={this.handleChangeAutocompleteUserReport}
                        selectedOptionUserReport={this.state.selectedOptionUserReport}
                        users={this.state.users}
                    />
                )}
                
                <Table
                    updateStateLoad={this.updateStateLoad}
                    loadData={this.loadData}
                    data={this.state.data}
                    isLoaded={this.state.isLoaded}
                    updateItem={this.updateItem}
                    updateData={this.updateData}
                    filter={this.filter}
                    estados={this.props.estados}
                    users={this.state.users}

                    activePage={this.state.activePage}
                    total={this.state.total}
                    countPage={this.state.countPage}
                    handlePageChange={this.handlePageChange}
                />
            </React.Fragment>
        );
    }
}


export default CommissionRelationIndex
WebpackerReact.setup({ CommissionRelationIndex });
