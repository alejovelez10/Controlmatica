import React, { Component } from 'react';
import Table from '../components/Commission/Index'
import FormFilter from '../components/Commission/FormFilter';
import WebpackerReact from 'webpacker-react';

class CommissionIndex extends Component {
    constructor(props) {
        super(props);
        this.token = document.querySelector("[name='csrf-token']").content;
        this.state = {
            data: [],
            isLoaded: true,
            showFilter: false,
            isFiltering: false,

            activePage: 1,
            total: 0, 
            countPage: 10,

            formFilter: {
                user_invoice_id: "",
                start_date: "",
                end_date: "",
                customer_invoice_id: "",
                observation: "",
                hours_worked: "",
                total_value: "",
                is_acepted: "",
            },

            selectedOptionUser: {
                user_invoice_id: "",
                label: "Usuario"
            },

            selectedOptionCustomerInvoice: {
                customer_invoice_id: "",
                label: "Facturas"
            },

            users: [],
            customer_invoices: [],
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
        let arrayCustomerInvoices = [];

        this.props.users.map((item) => (
            arrayUsers.push({label: `${item.names}`, value: item.id})
        ))

        this.props.customer_invoices.map((item) => (
            arrayCustomerInvoices.push({label: `${item.number_invoice}`, value: item.id})
        ))

        this.setState({
            users: arrayUsers,
            customer_invoices: arrayCustomerInvoices,
        })
    }

    //add update
    updateItem = format => {
        this.setState({
            data: this.state.data.map(item => {
            if (format.id === item.id) {
              return { ...item, 
                created_at: format.created_at,
                customer_invoice: format.customer_invoice,
                customer_invoice_id: format.customer_invoice_id,
                hours_worked: format.hours_worked,
                is_acepted: format.is_acepted,
                last_user_edited: format.last_user_edited,
                observation: format.observation,
                start_date: format.start_date,
                total_value: format.total_value,
                updated_at: format.updated_at,
                user: format.user,
                user_invoice: format.user_invoice,
                user_invoice_id: format.user_invoice_id,
                customer_report: format.customer_report,
                cost_center: format.cost_center,
              }
            }
            return item;
          })
        });
    }

    loadData = () => {
        fetch(`/get_commissions`, {
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
        fetch(`/get_commissions?user_invoice_id=${this.state.formFilter.user_invoice_id}&start_date=${this.state.formFilter.start_date}&end_date=${this.state.formFilter.end_date}&customer_invoice_id=${this.state.formFilter.customer_invoice_id}&observation=${this.state.formFilter.observation}&hours_worked=${this.state.formFilter.hours_worked}&total_value=${this.state.formFilter.total_value}&is_acepted=${this.state.formFilter.is_acepted}`, {
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
                isLoaded: false,
            });
        });
    };

    handlePageChange = pageNumber => {
        this.setState({ activePage: pageNumber }); 
        fetch(`/get_commissions?page=${pageNumber}&filter=${this.state.countPage}?user_invoice_id=${this.state.formFilter.user_invoice_id}&start_date=${this.state.formFilter.start_date}&end_date=${this.state.formFilter.end_date}&customer_invoice_id=${this.state.formFilter.customer_invoice_id}&observation=${this.state.formFilter.observation}&hours_worked=${this.state.formFilter.hours_worked}&total_value=${this.state.formFilter.total_value}&is_acepted=${this.state.formFilter.is_acepted}`, {
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

    clearValues = () => {
        this.setState({
            isFiltering: false,
            formFilter: {
                user_invoice_id: "",
                start_date: "",
                end_date: "",
                customer_invoice_id: "",
                observation: "",
                hours_worked: "",
                total_value: "",
                is_acepted: "",
            },

            selectedOptionUser: {
                user_invoice_id: "",
                label: "Usuario"
            },

            selectedOptionCustomerInvoice: {
                customer_invoice_id: "",
                label: "Centro de costo"
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

    handleChangeAutocompleteCustomerInvoice = selectedOptionCustomerInvoice => {
        this.setState({
            selectedOptionCustomerInvoice,
                formFilter: {
                    ...this.state.formFilter,
                    customer_invoice_id: selectedOptionCustomerInvoice.value
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

    updateAllData = (data) => {
        this.setState({ data: data })
    }

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

                        handleChangeAutocompleteCustomerInvoice={this.handleChangeAutocompleteCustomerInvoice}
                        selectedOptionCustomerInvoice={this.state.selectedOptionCustomerInvoice}
                        customer_invoices={this.state.customer_invoices}
                        
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
                    HandleClickFilter={this.HandleClickFilter}
                    filter={this.filter}
                    updateAllData={this.updateAllData}

                    estados={this.props.estados}

                    users={this.state.users}
                    customer_invoices={this.state.customer_invoices}

                    isFiltering={this.state.isFiltering}
                    formFilter={this.state.formFilter}

                    activePage={this.state.activePage}
                    total={this.state.total}
                    countPage={this.state.countPage}
                    handlePageChange={this.handlePageChange}

                    cost_centers={this.props.cost_centers}
                    customer_reports={this.props.customer_reports}
                />
            </React.Fragment>
        );
    }
}


export default CommissionIndex;
WebpackerReact.setup({ CommissionIndex });
