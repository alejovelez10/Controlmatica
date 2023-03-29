import React, { Component } from 'react';
import NumberFormat from "react-number-format";
import { UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import SweetAlert from "sweetalert2-react";
import Swal from "sweetalert2/dist/sweetalert2.js";
import FormCreate from '../ReportExpense/FormCreate';

class ExpensesTable extends Component {
    constructor(props) {
        super(props);
        this.token = document.querySelector("[name='csrf-token']").content;

        this.state = {
            modal: false,
            modalImport: false,
            modeEdit: false,
            ErrorValues: true,
            id: "",
            report_expense_id: "",

            formCreate: {
                cost_center_id: this.props.cost_center.id,
                user_invoice_id: this.props.usuario.id,
                invoice_name: "",
                invoice_date: "",
                description: "",
                invoice_number: "",
                identification: "",
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
                user_invoice_id: this.props.usuario.id,
                label: this.props.usuario.names
            },

            selectedOptionTypeIndentification: {
                type_identification_id: "",
                label: ""
            },

            selectedOptionPaymentType: {
                payment_type_id: "",
                label: ""
            },

            showMsgLoadState: false,
            showMsgLoadData: [],
            data: [],
            report_expense_options_type: [],
            report_expense_options_payment: [],
        }
    }

    componentDidMount = () => {
        this.configSelect();
        setTimeout(() => {
            this.setState({
                data: this.props.dataExpenses
            })
        }, 1000)
    }

    configSelect = () => {
        let arrayReportExpenseOptionType = [];
        let arrayReportExpenseOptionPayment = [];

        this.props.report_expense_options.filter(item => item.category == "Tipo").map((item) => (
            arrayReportExpenseOptionType.push({label: `${item.name}`, value: item.id})
        ))

        this.props.report_expense_options.filter(item => item.category == "Medio de pago").map((item) => (
            arrayReportExpenseOptionPayment.push({label: `${item.name}`, value: item.id})
        ))

        this.setState({
            report_expense_options_type: arrayReportExpenseOptionType,
            report_expense_options_payment: arrayReportExpenseOptionPayment,
        })
    }

    edit = (report_expense) => {
        this.setState({
            modeEdit: true,
            modal: true,
            id: report_expense.id,

            formCreate: {
                ...this.state.formCreate,
                cost_center_id: report_expense.cost_center != null ? report_expense.cost_center.id : "",
                user_invoice_id: report_expense.user_invoice != null ? report_expense.user_invoice.id : "",
                invoice_name: report_expense.invoice_name,
                invoice_date: report_expense.invoice_date,
                identification: report_expense.identification,
                description: report_expense.description,
                invoice_number: report_expense.invoice_number,
                invoice_type: report_expense.invoice_type,
                payment_type: report_expense.payment_type,
                invoice_value: report_expense.invoice_value,
                invoice_tax: report_expense.invoice_tax,
                invoice_total: report_expense.invoice_total,
                type_identification_id: report_expense.type_identification_id,
                payment_type_id: report_expense.payment_type_id,
            },

            selectedOptionTypeIndentification: {
                type_identification_id: `${report_expense.type_identification != null ? report_expense.type_identification.id : ""}`,
                label: `${report_expense.type_identification != null ? report_expense.type_identification.name : ""}`,
            },

            selectedOptionPaymentType: {
                payment_type_id: `${report_expense.payment_type != null ? report_expense.payment_type.id : ""}`,
                label: `${report_expense.payment_type != null ? report_expense.payment_type.name : ""}`
            },

            selectedOptionCostCenter: {
                cost_center_id: `${report_expense.cost_center != null ? report_expense.cost_center.id : ""}`,
                label: `${report_expense.cost_center != null ? report_expense.cost_center.code : "Centro de costo"}`
            },

            selectedOptionUser: {
                user_invoice_id: `${report_expense.user_invoice != null ? report_expense.cost_center.id : ""}`,
                label: `${report_expense.user_invoice != null ? report_expense.user_invoice.name : "Usuario"}`
            },
        })
    }

    HandleChangeMoney = (e) => {
        const value = e.target.value.replace("$", '').replace(",", '').replace(",", '').replace(",", '').replace(",", '')

        this.setState({
            formCreate: {
                ...this.state.formCreate,
                [e.target.name]: value,
            }
        }, () => {
            const total = (Number(this.state.formCreate.invoice_value) + Number(this.state.formCreate.invoice_tax))

            this.setState({
                formCreate: {
                    ...this.state.formCreate,
                    invoice_total: total,
                }
            })
        });
    }

    validationForm = () => {
        if (this.state.formCreate.cost_center_id != "" &&
            this.state.formCreate.description != "" &&
            this.state.formCreate.identification != "" &&
            this.state.formCreate.invoice_date != "" &&
            this.state.formCreate.invoice_number != "" &&
            (this.state.formCreate.invoice_tax || this.state.formCreate.invoice_tax == 0) &&
            this.state.formCreate.invoice_total != "" &&
            this.state.formCreate.payment_type_id != "" &&
            this.state.formCreate.type_identification_id != "" &&
            this.state.formCreate.user_invoice_id != ""
        ) {
            this.setState({ ErrorValues: true })
            return true
        } else {
            this.setState({ ErrorValues: false })
            return false
        }
    }

    handleChangeAutocompleteCostCenter = selectedOptionCostCenter => {
        this.setState({
            selectedOptionCostCenter,
            formCreate: {
                ...this.state.formCreate,
                cost_center_id: selectedOptionCostCenter.value
            }
        });
    };

    handleChangeAutocompleteUser = selectedOptionUser => {
        this.setState({
            selectedOptionUser,
            formCreate: {
                ...this.state.formCreate,
                user_invoice_id: selectedOptionUser.value
            }
        });
    };

    delete = id => {
        Swal.fire({
            title: "Estas seguro?",
            text: "El registro sera eliminado para siempre!",
            type: "warning",
            showCancelButton: true,
            confirmButtonColor: "#009688",
            cancelButtonColor: "#d33",
            confirmButtonText: "Si"
        }).then(result => {
            if (result.value) {
                fetch(`/report_expenses/${id}`, {
                    method: "delete",
                    headers: {
                        "X-CSRF-Token": this.token,
                        "Content-Type": "application/json"
                    }
                })

                    .then(response => response.json())
                    .then(response => {
                        this.loadData()
                        this.messageSuccess(response)
                    });
            }
        });
    };

    messageSuccess = (response) => {
        Swal.fire({
            position: "center",
            type: `${response.type}`,
            title: `${response.success}`,
            showConfirmButton: false,
            timer: 1500,
        });
    };

    clearValues = () => {
        this.setState({
            modeEdit: false,
            ErrorValues: true,

            formCreate: {
                cost_center_id: this.props.cost_center.id,
                user_invoice_id: this.props.usuario.id,
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
                user_invoice_id: this.props.usuario.id,
                label: this.props.usuario.names
            },

            selectedOptionTypeIndentification: {
                type_identification_id: "",
                label: ""
            },

            selectedOptionPaymentType: {
                payment_type_id: "",
                label: ""
            },
        })
    }

    //add items
    updateData = (data) => {
        this.setState({
            data: [...this.state.data, data].reverse(),
        })
    }

    loadData = () => {
        fetch(`/get_cost_center_report_expenses/${this.props.cost_center.id}`, {
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
            });
        });
    }

    HandleClick = () => {
        if (this.validationForm()) {
            if (!this.state.modeEdit)
                fetch(`/report_expenses`, {
                    method: 'POST', // or 'PUT'
                    body: JSON.stringify(this.state.formCreate), // data can be `string` or {object}!
                    headers: {
                        "X-CSRF-Token": this.token,
                        "Content-Type": "application/json"
                    }
                })

                    .then(res => res.json())
                    .catch(error => console.error("Error:", error))
                    .then(data => {
                        this.setState({ modal: false })
                        this.messageSuccess(data);
                        this.loadData()
                        //this.props.updateData(data.register);
                        this.clearValues();
                    });
            else {
                fetch(`/report_expenses/${this.state.id}`, {
                    method: 'PATCH', // or 'PUT'
                    body: JSON.stringify(this.state.formCreate), // data can be `string` or {object}!
                    headers: {
                        "X-CSRF-Token": this.token,
                        "Content-Type": "application/json"
                    }
                })

                    .then(res => res.json())
                    .catch(error => console.error("Error:", error))
                    .then(data => {
                        this.setState({ modal: false })
                        this.messageSuccess(data);
                        /* this.props.updateItem(data.register); */
                        this.loadData()
                        this.clearValues();
                    });
            }
        }
    }

    HandleChange = (e) => {
        this.setState({
            formCreate: {
                ...this.state.formCreate,
                [e.target.name]: e.target.value
            }
        })
    }

    handleChangeAutocompleteReportExpenceOptionType = selectedOptionTypeIndentification => {
        this.setState({
            selectedOptionTypeIndentification,
            formCreate: {
                ...this.state.formCreate,
                type_identification_id: selectedOptionTypeIndentification.value
            }
        });
    }

    handleChangeAutocompleteReportExpenceOptionPaymentType = selectedOptionPaymentType => {
        this.setState({
            selectedOptionPaymentType,
            formCreate: {
                ...this.state.formCreate,
                payment_type_id: selectedOptionPaymentType.value
            }
        });
    }

    getDate = (date) => {
        var d = new Date(date),
        months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'junio', 'julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const hoursAndMinutes = d.getHours() + ':' + d.getMinutes();

        var time = hoursAndMinutes; // your input
        
        time = time.split(':'); // convert to array
    
        // fetch
        var hours = Number(time[0]);
        var minutes = Number(time[1]);
        var seconds = Number(time[2]);
    
        // calculate
        var timeValue = hours;
    
        /*  if (hours > 0 && hours <= 12) {
           timeValue= "" + hours;
         } else if (hours > 12) {
           timeValue= "" + (hours - 12);
         } else if (hours == 0) {
           timeValue= "12";
         } */
        
        timeValue += (minutes < 10) ? ":0" + minutes : ":" + minutes;  // get minutes
        //timeValue += (hours >= 12) ? " PM" : " AM";  // get AM/PM

        return months[d.getMonth()] + " " + d.getDate() + " " + 'del' + " " + d.getFullYear() + " / " + timeValue
    }


    closeModal = () => {
        this.setState({
            modalImport: false
        })
    }

    showMsgLoad = (data) => {
        console.log("papa", data)
        this.setState({
            showMsgLoadData: data,
            showMsgLoadState: true
        })
    }

    updateSelect = (e, report_expense) => {
        fetch(`/update_state_report_expense/${report_expense.id}/${e.target.value}`, {
            method: 'PATCH', // or 'PUT'
            body: JSON.stringify(this.state.formCreate), // data can be `string` or {object}!
            headers: {
                "X-CSRF-Token": this.token,
                "Content-Type": "application/json"
            }
        })

        .then(res => res.json())
        .catch(error => console.error("Error:", error))
        .then(data => {
            this.setState({ report_expense_id: "" })
            this.props.updateItem(data.register)
        });
    }

    toogle = (from) => {
        if (from == "new") {
            this.setState({ modal: true })
        } else {
            this.setState({ modal: false })
            this.clearValues()
        }
    }

    render() {
        const estados = {
            closed: true,
            create: true,
            delete: true,
            edit: true,
            export: true,
            show_user: true,
        }

        return (
            <React.Fragment>
                {this.state.modal && (
                    <FormCreate
                        //modal props
                        backdrop={"static"}
                        modal={this.state.modal}
                        toggle={this.toogle}
                        title={this.state.modeEdit ? "Actualizar Gasto" : "Crear Gasto"}
                        nameBnt={this.state.modeEdit ? "Actualizar" : "Añadir"}

                        //form props
                        formValues={this.state.formCreate}
                        submitForm={this.HandleClick}
                        onChangeForm={this.HandleChange}
                        onChangeFormMoney={this.HandleChangeMoney}
                        errorValues={this.state.ErrorValues}
                        setValuesReportExpenseOption={this.setValuesReportExpenseOption}
                        estados={estados}
                        current_user={this.props.usuario}
                        //select values

                        handleChangeAutocompleteCostCenter={this.handleChangeAutocompleteCostCenter}
                        selectedOptionCostCenter={this.state.selectedOptionCostCenter}
                        cost_centers={this.props.cost_centers}

                        handleChangeAutocompleteUser={this.handleChangeAutocompleteUser}
                        selectedOptionUser={this.state.selectedOptionUser}
                        users={this.props.users}

                        selectedOptionTypeIndentification={this.state.selectedOptionTypeIndentification}
                        handleChangeAutocompleteReportExpenceOptionType={this.handleChangeAutocompleteReportExpenceOptionType}
                        report_expense_options_type={this.state.report_expense_options_type}

                        selectedOptionPaymentType={this.state.selectedOptionPaymentType}
                        handleChangeAutocompleteReportExpenceOptionPaymentType={this.handleChangeAutocompleteReportExpenceOptionPaymentType}
                        report_expense_options_payment={this.state.report_expense_options_payment}

                        updateDataReportExpenseOptionType={this.props.updateDataReportExpenseOptionType}
                        updateDataReportExpenseOptionPayment={this.props.updateDataReportExpenseOptionPayment}
                        cost_center_id={this.props.cost_center.id}
                    />
                )}

                <div className="content">
                    <div className="col-md-12 mb-3 text-right pr-0">
                        {!this.state.modal && (
                            <button
                                className="btn-shadow btn btn-secondary"
                                onClick={() => this.toogle("new")}
                            >
                                Crear
                            </button>
                        )}
                    </div>

                    <table
                        className="table table-hover table-bordered"
                        id="sampleTable"
                    >
                        <thead>
                            <tr className="tr-title">
                                <th>Acciones</th>
                                <th style={{ width: "250px" }}>Responsable</th>
                                <th style={{ width: "250px" }}>Nombre</th>
                                <th>Fecha de factura</th>
                                <th>NIT / CEDULA</th>
                                <th style={{ width: "300px" }}>Descripcion</th>
                                <th>#Factura</th>
                                <th>Tipo</th>
                                <th>Medio de pago</th>
                                <th>Valor</th>
                                <th>IVA</th>
                                <th>Total</th>
                                <th style={{ width: "5%" }}>Estado</th>
                            </tr>
                        </thead>

                        <tbody>
                            {this.state.data.length >= 1 ? (
                                this.state.data.map(accion => (
                                    <tr key={accion.id}>
                                        <td className="text-left">
                                            {true && (
                                                <UncontrolledDropdown className='btn-group'>
                                                    <DropdownToggle className='btn-shadow btn btn-info'>
                                                        <i className="fas fa-bars"></i>
                                                    </DropdownToggle>
                                                    <DropdownMenu className="dropdown-menu dropdown-menu-right">
                                                        {true && (
                                                            <DropdownItem
                                                                className="dropdown-item"
                                                                onClick={() => this.edit(accion)}
                                                            >
                                                                Editar
                                                            </DropdownItem>
                                                        )}

                                                        {true && (
                                                            <DropdownItem
                                                                onClick={() => this.delete(accion.id)}
                                                                className="dropdown-item"
                                                            >
                                                                Eliminar
                                                            </DropdownItem>
                                                        )}
                                                    </DropdownMenu>
                                                </UncontrolledDropdown>
                                            )}
                                        </td>
                                        <td>{accion.user_invoice.name}</td>
                                        <td>{accion.invoice_name}</td>
                                        <td>{accion.invoice_date}</td>
                                        <td>{accion.identification}</td>
                                        <td>{accion.description}</td>
                                        <td>{accion.invoice_number}</td>
                                        <td>{accion.type_identification != undefined ? accion.type_identification.name : ""}</td>
                                        <td>{accion.payment_type != undefined ? accion.payment_type.name : ""}</td>
                                        <td><NumberFormat value={accion.invoice_value} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                                        <td><NumberFormat value={accion.invoice_tax} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                                        <td><NumberFormat value={accion.invoice_total} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                                        <td>{accion.is_acepted ? "Aceptado" : "Creado"} </td>
                                    </tr>
                                ))
                            ) : (
                                <td colSpan="13" className="text-center">
                                    <div className="text-center mt-1 mb-1">
                                        <h4>No hay gastos</h4>
                                    </div>
                                </td>
                            )}

                        </tbody>

                    </table>
                </div>
            </React.Fragment>
        );
    }
}

export default ExpensesTable;