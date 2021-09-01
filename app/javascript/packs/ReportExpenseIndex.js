import React, { Component } from 'react';
import Table from '../components/ReportExpense/Index'
import FormFilter from '../components/ReportExpense/FormFilter';
import WebpackerReact from 'webpacker-react';

class ReportExpenseIndex extends Component {
    constructor(props) {
        super(props);
        this.token = document.querySelector("[name='csrf-token']").content;
        this.state = {
            data: [],
            isLoaded: true,
            showFilter: false,
            isFiltering: false,

            formFilter: {
                cost_center_id: "",
                user_invoice_id: "",
                invoice_name: "",
                invoice_date: "",
                identification: "",
                description: "",
                invoice_number: "",
                invoice_type: "",
                invoice_value: "",
                invoice_tax: "",
                invoice_total: "",
                type_identification_id: "",
                payment_type_id: "",
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
            report_expense_options_type: [],
            report_expense_options_payment: [],
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
            data: [...this.state.data, data],
        })
    }

    updateDataReportExpenseOptionType = (data) => {
        this.setState({
            report_expense_options_type: [...this.state.report_expense_options_type, data],
        })
    }

    updateDataReportExpenseOptionPayment = (data) => {
        this.setState({
            report_expense_options_payment: [...this.state.report_expense_options_payment, data],
        })
    }

    configSelect = () => {
        let arrayCostCenters = [];
        let arrayUsers = [];
        let arrayReportExpenseOptionType = [];
        let arrayReportExpenseOptionPayment = [];

        this.props.cost_centers.map((item) => (
            arrayCostCenters.push({label: `${item.code}`, value: item.id})
        ))

        this.props.users.map((item) => (
            arrayUsers.push({label: `${item.names}`, value: item.id})
        ))

        this.props.report_expense_options.filter(item => item.category == "Tipo").map((item) => (
            arrayReportExpenseOptionType.push({label: `${item.name}`, value: item.id})
        ))

        this.props.report_expense_options.filter(item => item.category == "Medio de pago").map((item) => (
            arrayReportExpenseOptionPayment.push({label: `${item.name}`, value: item.id})
        ))

        this.setState({
            cost_centers: arrayCostCenters,
            users: arrayUsers,
            report_expense_options_type: arrayReportExpenseOptionType,
            report_expense_options_payment: arrayReportExpenseOptionPayment,
        })
    }

    //add update
    updateItem = format => {
        this.setState({
            data: this.state.data.map(item => {
            if (format.id === item.id) {
              return { ...item, 
                cost_center_id: format.cost_center_id,
                user_invoice_id: format.user_invoice_id,
                invoice_name: format.invoice_name,
                invoice_date: format.invoice_date,
                identification: format.identification,
                description: format.description,
                invoice_number: format.invoice_number,
                invoice_type: format.invoice_type,
                payment_type: format.payment_type,
                invoice_value: format.invoice_value,
                invoice_tax: format.invoice_tax,
                invoice_total: format.invoice_total,
                cost_center: format.cost_center,
                user_invoice: format.user_invoice,
                payment_type: format.payment_type,
                type_identification: format.type_identification,
                payment_type_id: format.payment_type_id,
                type_identification_id: format.type_identification_id,
              }
            }
            return item;
          })
        });
    }

    loadData = () => {
        fetch(`/get_report_expenses`, {
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
        fetch(`/get_report_expenses?cost_center_id=${this.state.formFilter.cost_center_id}&user_invoice_id=${this.state.formFilter.user_invoice_id}&invoice_name=${this.state.formFilter.invoice_name}&invoice_date=${this.state.formFilter.invoice_date}&identification=${this.state.formFilter.identification}&description=${this.state.formFilter.description}&invoice_number=${this.state.formFilter.invoice_number}&type_identification_id=${this.state.formFilter.type_identification_id}&payment_type_id=${this.state.formFilter.payment_type_id}&invoice_value=${this.state.formFilter.invoice_value}&invoice_tax=${this.state.formFilter.invoice_tax}&invoice_total=${this.state.formFilter.invoice_total}`, {
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
            isFiltering: false,
            formFilter: {
                cost_center_id: "",
                user_invoice_id: "",
                invoice_name: "",
                invoice_date: "",
                identification: "",
                description: "",
                invoice_number: "",
                invoice_type: "",
                invoice_value: "",
                invoice_tax: "",
                invoice_total: "",
                type_identification_id: "",
                payment_type_id: "",
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
                        report_expense_options={this.props.report_expense_options}
                        
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
                    report_expense_options_type={this.state.report_expense_options_type}
                    report_expense_options_payment={this.state.report_expense_options_payment}
                    HandleClickFilter={this.HandleClickFilter}
                    cost_centers={this.state.cost_centers}
                    users={this.state.users}

                    updateDataReportExpenseOptionType={this.updateDataReportExpenseOptionType}
                    updateDataReportExpenseOptionPayment={this.updateDataReportExpenseOptionPayment}
                    isFiltering={this.state.isFiltering}
                    formFilter={this.state.formFilter}
                />
            </React.Fragment>
        );
    }
}


export default ReportExpenseIndex;
WebpackerReact.setup({ ReportExpenseIndex });
