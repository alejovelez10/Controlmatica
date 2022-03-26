import React, { Component } from 'react';
import Table from '../components/ReportExpenseOption/Index'
import FormFilter from '../components/ReportExpenseOption/FormFilter';
import WebpackerReact from 'webpacker-react';

class ReportExpenseOptionIndex extends Component {
    constructor(props) {
        super(props);
        this.token = document.querySelector("[name='csrf-token']").content;
        this.state = {
            data: [],
            isLoaded: true,
            showFilter: false,

            formFilter: {
                cost_center_id: "",
                user_invoice_id: "",
                invoice_name: "",
                invoice_date: "",
                type_identification: "",
                description: "",
                invoice_number: "",
                invoice_type: "",
                payment_type: "",
                invoice_value: "",
                invoice_tax: "",
                invoice_total: "",
            },

            selectedOptionCostCenter: {
                cost_center_id: "",
                label: "Centro de costo"
            },

            selectedOptionUser: {
                user_invoice_id: "",
                label: "Usuario"
            },

            users: [],
            cost_centers: [],
        }
    }

    componentDidMount(){
        this.loadData();
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
        let arrayCostCenters = [];
        let arrayUsers = [];

        this.props.cost_centers.map((item) => (
            arrayCostCenters.push({label: `${item.code}`, value: item.id})
        ))

        this.props.users.map((item) => (
            arrayUsers.push({label: `${item.names}`, value: item.id})
        ))

        this.setState({
            cost_centers: arrayCostCenters,
            users: arrayUsers,
        })
    }

    //add update
    updateItem = format => {
        this.setState({
            data: this.state.data.map(item => {
            if (format.id === item.id) {
              return { ...item, 
                name: format.name,
                category: format.category,
              }
            }
            return item;
          })
        });
    }

    loadData = () => {
        fetch(`/get_report_expense_options`, {
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
            isLoaded: false
          });
        });
    }


    HandleClickFilter = e => {
        this.setState({ isLoaded: true, isFiltering: true })
        fetch(`/get_report_expense_options?cost_center_id=${this.state.formFilter.cost_center_id}&user_invoice_id=${this.state.formFilter.user_invoice_id}&invoice_name=${this.state.formFilter.invoice_name}&invoice_date=${this.state.formFilter.invoice_date}&type_identification=${this.state.formFilter.type_identification}&description=${this.state.formFilter.description}&invoice_number=${this.state.formFilter.invoice_number}&invoice_type=${this.state.formFilter.invoice_type}&payment_type=${this.state.formFilter.payment_type}&invoice_value=${this.state.formFilter.invoice_value}&invoice_tax=${this.state.formFilter.invoice_tax}&invoice_total=${this.state.formFilter.invoice_total}`, {
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
                cost_center_id: "",
                user_invoice_id: "",
                invoice_name: "",
                invoice_date: "",
                type_identification: "",
                description: "",
                invoice_number: "",
                invoice_type: "",
                payment_type: "",
                invoice_value: "",
                invoice_tax: "",
                invoice_total: "",
            },

            selectedOptionCostCenter: {
                cost_center_id: "",
                label: "Centro de costo"
            },

            selectedOptionUser: {
                user_invoice_id: "",
                label: "Usuario"
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

    handleChangeAutocompleteCostCenter = selectedOptionCostCenter => {
        this.setState({
            selectedOptionCostCenter,
                formFilter: {
                    ...this.state.formFilter,
                    cost_center_id: selectedOptionCostCenter.value
                }
        });
    };

    handleChangeAutocompleteUser = selectedOptionUser => {
        this.setState({
            selectedOptionUser,
                formFilter: {
                    ...this.state.formFilter,
                    user_invoice_id: selectedOptionUser.value
                }
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

                        handleChangeAutocompleteCostCenter={this.handleChangeAutocompleteCostCenter}
                        selectedOptionCostCenter={this.state.selectedOptionCostCenter}
                        cost_centers={this.state.cost_centers}
                        
                        handleChangeAutocompleteUser={this.handleChangeAutocompleteUser}
                        selectedOptionUser={this.state.selectedOptionUser}
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

                    cost_centers={this.state.cost_centers}
                    users={this.state.users}
                />
            </React.Fragment>
        );
    }
}


export default ReportExpenseOptionIndex;
WebpackerReact.setup({ ReportExpenseOptionIndex });
