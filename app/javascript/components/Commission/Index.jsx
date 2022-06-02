import React, { Component } from 'react';
import FormCreate from './FormCreate'
import SweetAlert from "sweetalert2-react";
import Swal from "sweetalert2/dist/sweetalert2.js";
import NumberFormat from "react-number-format";
import Pagination from "react-js-pagination";

class Index extends Component {
    constructor(props) {
        super(props);
        this.token = document.querySelector("[name='csrf-token']").content;

        this.state = {
            modal: false,
            modeEdit: false,
            ErrorValues: true,

            id: "",
            commission_id: "",
            formCreate: {
                user_invoice_id: this.props.current_user.id,
                start_date: "",
                end_date: "",
                customer_invoice_id: "",
                observation: "",
                hours_worked: "",
                total_value: "",
                value_hour: "",
                hours_worked_code: "",
                hours_paid: "",
                cost_center_id: "",
                customer_report_id: "",
            },

            selectedOptionUser: {
                user_invoice_id: this.props.current_user.id,
                label: this.props.current_user.names
            },


            msg_error: "",
            state_msg_error: false,

            selectedOptionCustomerInvoice: {
                customer_invoice_id: "",
                label: "Facturas"
            },

            selectedOptionCostCenter: {
                cost_center_id: "",
                label: "Centro de costo"
            },

            selectedOptionCustomerReport: {
                customer_report_id: "",
                label: "Reporte de cliente"
            },

            customer_reports: [],
            customer_invoices: [],
        }
    }

    toogle = (from) => {
        if (from == "new") {
            this.setState({ modal: true })
        } else {
            this.setState({ modal: false })
            this.clearValues()
        }
    }

    validationForm = () => {
        if (this.state.formCreate.user_invoice_id != "" &&
            this.state.formCreate.start_date != "" &&
            this.state.formCreate.end_date != "" &&
            this.state.formCreate.customer_invoice_id != "" &&
            this.state.formCreate.hours_worked != "" &&
            this.state.formCreate.value_hour != ""
        ) {
            this.setState({ ErrorValues: true })
            return true
        } else {
            this.setState({ ErrorValues: false })
            return false
        }
    }

    getInfoCostCenter = (cost_center_id, type) => {
        const form = {
            start_date: this.state.formCreate.start_date,
            end_date: this.state.formCreate.end_date,
            cost_center_id: cost_center_id,
            user_id: this.state.formCreate.user_invoice_id
        }

        fetch(`/get_info_cost_center/${cost_center_id}`, {
            method: 'POST', // or 'PUT'
            body: JSON.stringify(form), // data can be `string` or {object}!
            headers: {
                "X-CSRF-Token": this.token,
                "Content-Type": "application/json"
            }
        })

            .then(res => res.json())
            .catch(error => console.error("Error:", error))
            .then(data => {

                let arrayCustomerReports = [];
                let arrayCustomerInvoices = [];

                data.customer_reports.map((item) => (
                    arrayCustomerReports.push({ label: `${item.report_code}`, value: item.id })
                ))

                data.customer_invoices.map((item) => (
                    arrayCustomerInvoices.push({ label: `${item.number_invoice}`, value: item.id })
                ))
                if (type == "si") {
                    console.log("si")
                    this.setState({
                        customer_reports: arrayCustomerReports,
                        customer_invoices: arrayCustomerInvoices,
                        formCreate: {
                            ...this.state.formCreate,
                            value_hour: data.value_hour,
                            hours_worked_code: data.hours_worked_code,
                            hours_paid: data.hours_paid

                        }
                    })
                } else {
                    console.log("no")
                    this.setState({
                        customer_reports: arrayCustomerReports,
                        customer_invoices: arrayCustomerInvoices,
                    })
                }

            });
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
        console.log(selectedOptionUser)
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
                fetch(`/commissions/${id}`, {
                    method: "delete",
                    headers: {
                        "X-CSRF-Token": this.token,
                        "Content-Type": "application/json"
                    }
                })

                    .then(response => response.json())
                    .then(response => {
                        this.props.loadData()
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
                user_invoice_id: this.props.current_user.id,
                start_date: "",
                end_date: "",
                customer_invoice_id: "",
                observation: "",
                hours_worked: "",
                total_value: "",
                value_hour: "",

                cost_center_id: "",
                customer_report_id: "",
            },

            selectedOptionUser: {
                user_invoice_id: this.props.current_user.id,
                label: this.props.current_user.names
            },

            selectedOptionCustomerInvoice: {
                customer_invoice_id: "",
                label: "Facturas"
            },

            selectedOptionCostCenter: {
                cost_center_id: "",
                label: "Centro de costo"
            },

            selectedOptionCustomerReport: {
                customer_report_id: "",
                label: "Reporte de cliente"
            },
        })
    }

    updateFilterValues = () => {
        fetch(`/update_filter_values_commissions?user_invoice_id=${this.props.formFilter.user_invoice_id}&start_date=${this.props.formFilter.start_date}&end_date=${this.props.formFilter.end_date}&customer_invoice_id=${this.props.formFilter.customer_invoice_id}&observation=${this.props.formFilter.observation}&hours_worked=${this.props.formFilter.hours_worked}&total_value=${this.props.formFilter.total_value}&is_acepted=${this.props.formFilter.is_acepted}`, {
            method: 'PATCH', // or 'PUT'
            headers: {
                "X-CSRF-Token": this.token,
                "Content-Type": "application/json"
            }
        })

            .then(res => res.json())
            .catch(error => console.error("Error:", error))
            .then(data => {
                this.props.updateAllData(data.data)
                this.messageSuccess(data)
            });
    }

    HandleClick = () => {
        if (this.validationForm()) {
            if (!this.state.modeEdit)
                fetch(`/commissions`, {
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
                        this.props.updateData(data.register);
                        this.clearValues();
                    });
            else {
                fetch(`/commissions/${this.state.id}`, {
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
                        this.props.updateItem(data.register);
                        this.clearValues();
                    });
            }
        }
    }

    HandleChange = (e) => {
        let state = true;

        if (e.target.name == "hours_worked"){
            if (this.state.formCreate.hours_worked_code - this.state.formCreate.hours_paid - e.target.value >= 0){
                    console.log(this.state.formCreate.hours_worked_code - this.state.formCreate.hours_paid - e.target.value, " 1")
                    state = true;
                    this.setState({
                
                            msg_error: "",
                            state_msg_error : false

                    })
            }else{
                    console.log(this.state.formCreate.hours_worked_code - this.state.formCreate.hours_paid - e.target.value, " 2")
                    state = false;
                    this.setState({
  
                            msg_error: "No puedes pasarte de las horas",
                            state_msg_error : true
 
                    })
            }
        }

        if ( state ){
            this.setState({
                formCreate: {
                    ...this.state.formCreate,
                    [e.target.name]: e.target.value
                }
            })
        }

    }

    handleChangeAutocompleteCustomerInvoice = selectedOptionCustomerInvoice => {
        this.setState({
            selectedOptionCustomerInvoice,
            formCreate: {
                ...this.state.formCreate,
                customer_invoice_id: selectedOptionCustomerInvoice.value
            }
        });
    };

    /*     handleChangeAutocompleteUser = selectedOptionUser => {
            this.setState({
                selectedOptionUser,
                    formCreate: {
                        ...this.state.formCreate,
                        customer_report_id: selectedOptionUser.value
                    }
            });
        }; */

    handleChangeAutocompleteCostCenter = selectedOptionCostCenter => {
        this.getInfoCostCenter(selectedOptionCostCenter.value, "si");
        this.setState({
            selectedOptionCostCenter,
            formCreate: {
                ...this.state.formCreate,
                cost_center_id: selectedOptionCostCenter.value
            }
        });
    };

    handleChangeAutocompleteCustomerReport = selectedOptionCustomerReport => {
        this.setState({
            selectedOptionCustomerReport,
            formCreate: {
                ...this.state.formCreate,
                customer_report_id: selectedOptionCustomerReport.value
            }
        });
    };

    edit = (report_expense) => {
        if (report_expense.cost_center) {
            this.getInfoCostCenter(report_expense.cost_center.id, "no")
        }

        this.setState({
            modeEdit: true,
            modal: true,
            id: report_expense.id,

            formCreate: {
                ...this.state.formCreate,
                user_invoice_id: report_expense.user_invoice_id,
                start_date: report_expense.start_date,
                end_date: report_expense.end_date,
                customer_invoice_id: report_expense.customer_invoice_id,
                observation: report_expense.observation,
                hours_worked: report_expense.hours_worked,
                value_hour: report_expense.value_hour,
                total_value: 343,
                is_acepted: report_expense.is_acepted,

                cost_center_id: (report_expense.cost_center ? report_expense.cost_center.id : ""),
                customer_report_id: (report_expense.customer_report ? report_expense.customer_report.id : ""),
            },

            selectedOptionCustomerInvoice: {
                customer_invoice_id: `${report_expense.customer_invoice != null ? report_expense.customer_invoice.id : ""}`,
                label: `${report_expense.customer_invoice != null ? report_expense.customer_invoice.number_invoice : "Factura del cliente"}`
            },

            selectedOptionUser: {
                user_invoice_id: `${report_expense.user_invoice != null ? report_expense.user_invoice.id : ""}`,
                label: `${report_expense.user_invoice != null ? report_expense.user_invoice.names : "Usuario"}`
            },

            selectedOptionCostCenter: {
                cost_center_id: `${report_expense.cost_center != null ? report_expense.cost_center.id : ""}`,
                label: `${report_expense.cost_center != null ? report_expense.cost_center.code : "Centro de costo"}`
            },

            selectedOptionCustomerReport: {
                customer_report_id: `${report_expense.customer_report != null ? report_expense.customer_report.id : ""}`,
                label: `${report_expense.customer_report != null ? report_expense.customer_report.description : "Reporte de cliente"}`
            },
        })
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

    updateSelect = (e, report_expense) => {
        fetch(`/update_state_commission/${report_expense.id}/${e.target.value}`, {
            method: 'PATCH', // or 'PUT'
            headers: {
                "X-CSRF-Token": this.token,
                "Content-Type": "application/json"
            }
        })

            .then(res => res.json())
            .catch(error => console.error("Error:", error))
            .then(data => {
                this.setState({ commission_id: "" })
                this.props.updateItem(data.register)
            });
    }

    render() {
        return (
            <React.Fragment>

                {this.state.modal && (
                    <FormCreate
                        //modal props
                        backdrop={"static"}
                        modal={this.state.modal}
                        toggle={this.toogle}
                        title={this.state.modeEdit ? "Actualizar comisión" : "Crear comisión"}
                        nameBnt={this.state.modeEdit ? "Actualizar" : "Añadir"}

                        //form props
                        formValues={this.state.formCreate}
                        submitForm={this.HandleClick}
                        onChangeForm={this.HandleChange}
                        errorValues={this.state.ErrorValues}
                        estados={this.props.estados}
                        //select values

                        state_msg_error={this.state.state_msg_error}
                        msg_error={this.state.msg_error}

                        hours_worked_code={ this.state.hours_worked_code}
                        hours_paid= {this.state.hours_paid}

                        handleChangeAutocompleteCustomerInvoice={this.handleChangeAutocompleteCustomerInvoice}
                        selectedOptionCustomerInvoice={this.state.selectedOptionCustomerInvoice}
                        customer_invoices={this.state.customer_invoices}

                        handleChangeAutocompleteUser={this.handleChangeAutocompleteUser}
                        selectedOptionUser={this.state.selectedOptionUser}
                        users={this.props.users}

                        //cost center
                        handleChangeAutocompleteCostCenter={this.handleChangeAutocompleteCostCenter}
                        selectedOptionCostCenter={this.state.selectedOptionCostCenter}
                        cost_centers={this.props.cost_centers}

                        //customer report 
                        handleChangeAutocompleteCustomerReport={this.handleChangeAutocompleteCustomerReport}
                        selectedOptionCustomerReport={this.state.selectedOptionCustomerReport}
                        customer_reports={this.state.customer_reports}
                    />
                )}

                <div className="row">
                    <div className="col-md-12">
                        <div className="tile">

                            <div className="row">
                                <div className="col-md-6"></div>
                                <div className="col-md-6 text-right mb-3">
                                    <div style={{ display: "inline-flex" }}>

                                        <button
                                            className="btn btn-primary ml-3"
                                            onClick={() => this.props.filter(true)}
                                        >
                                            Filtros
                                        </button>

                                        {(this.props.estados.export || this.props.estados.create) && (
                                            <div class="dropdown ml-3">

                                                <button class="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                                    Acciones
                                                </button>
                                                <div class="dropdown-menu" aria-labelledby="dropdownMenuButton">

                                                    {false && (
                                                        <a class="dropdown-item" onClick={() => this.toogleFile("new")}><img src="https://cdn.iconscout.com/icon/premium/png-256-thumb/import-2033519-1712953.png" alt="" style={{ height: "35px" }} /> Importar</a>
                                                    )}

                                                    {this.props.estados.export_exel && (
                                                        <a
                                                            className="dropdown-item"
                                                            href={`/download_file/commissions/${!this.props.isFiltering ? "todos.xlsx" : `filtro.xlsx?user_invoice_id=${this.props.formFilter.user_invoice_id}&start_date=${this.props.formFilter.start_date}&end_date=${this.props.formFilter.end_date}&customer_invoice_id=${this.props.formFilter.customer_invoice_id}&observation=${this.props.formFilter.observation}&hours_worked=${this.props.formFilter.hours_worked}&total_value=${this.props.formFilter.total_value}&is_acepted=${this.props.formFilter.is_acepted}`}`}
                                                            target="_blank"
                                                        >
                                                            <img src="https://mybc1.s3.amazonaws.com/uploads/rseguimiento/evidencia/244/file_formats_4_csv-512.png" alt="" style={{ height: "25px" }} /> Exportar
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {(this.props.isFiltering && this.props.estados.accept_commission) && (
                                            <button
                                                className="btn btn-secondary ml-3"
                                                onClick={() => this.updateFilterValues()}
                                            >
                                                Aceptar comisiones
                                            </button>
                                        )}


                                        {this.props.estados.create && (
                                            <button
                                                className="btn btn-secondary ml-3"
                                                onClick={() => this.toogle("new")}
                                            >
                                                Nuevo
                                            </button>
                                        )}

                                    </div>
                                </div>
                            </div>

                            <div className="tile-body">
                                <div className="content-table">
                                    <table className="table table-hover table-bordered" id="sampleTable" style={{ width: "2700px", maxWidth: "2500px", tableLayout: "fixed" }} >
                                        <thead>
                                            <tr >
                                                <th style={{ width: "38px" }} className="text-center">Acciones</th>
                                                <th style={{ width: "70px" }}>Responsable</th>

                                                <th style={{ width: "70px" }}>Centro de costo</th>
                                                <th style={{ width: "70px" }}>Reporte de cliente</th>

                                                <th style={{ width: "100px" }}>Fecha desde</th>
                                                <th style={{ width: "100px" }}>Fecha hasta</th>
                                                <th style={{ width: "7%" }}>Factura</th>
                                                <th style={{ width: "7%" }}>Horas trabajadas</th>
                                                {this.props.estados.change_value_hour && (
                                                    <th style={{ width: "7%" }}>Valor hora </th>
                                                )}
                                                <th style={{ width: "7%" }}>Total</th>
                                                <th style={{ width: "7%" }}>Observaciónes</th>
                                                <th style={{ width: "7%" }}>Estado</th>
                                                <th style={{ width: "100px" }}>Creación</th>
                                                <th style={{ width: "100px" }}>Ultima actualización</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {this.props.data.length >= 1 ? (
                                                this.props.data.map(accion => (
                                                    <tr key={accion.id}>

                                                        <td className="text-center" style={{ width: "10px" }}>
                                                            {(!accion.is_acepted || this.props.estados.edit || this.props.estados.delete) && (
                                                                <div className="btn-group" role="group" aria-label="Button group with nested dropdown">
                                                                    <div className="btn-group" role="group">
                                                                        <button className="btn btn-secondary" id="btnGroupDrop1" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                                                            <i className="fas fa-bars"></i>
                                                                        </button>

                                                                        <div className="dropdown-menu dropdown-menu-right">

                                                                            {(this.props.estados.edit) && (
                                                                                <button onClick={() => this.edit(accion)} className="dropdown-item">
                                                                                    Editar
                                                                                </button>
                                                                            )}

                                                                            {(this.props.estados.delete) && (
                                                                                <button onClick={() => this.delete(accion.id)} className="dropdown-item">
                                                                                    Eliminar
                                                                                </button>
                                                                            )}

                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </td>


                                                        <td>{accion.user_invoice.names}</td>

                                                        <td>{accion.cost_center ? accion.cost_center.code : ""}</td>
                                                        <td>{accion.customer_report ? accion.customer_report.description : ""}</td>

                                                        <td>{accion.start_date}</td>
                                                        <td>{accion.end_date}</td>
                                                        <td>{accion.customer_invoice.number_invoice}</td>
                                                        <td>{accion.hours_worked}</td>
                                                        {this.props.estados.change_value_hour && (
                                                            <td><NumberFormat value={accion.value_hour} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                                                        )}
                                                        <td><NumberFormat value={accion.total_value} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                                                        <td>{accion.observation}</td>
                                                        <td>
                                                            {this.state.commission_id == accion.id ? (
                                                                <React.Fragment>
                                                                    <select
                                                                        value={accion.is_acepted}
                                                                        onChange={(e) => this.updateSelect(e, accion)}
                                                                        className={`form form-control`}
                                                                    >
                                                                        <option value="true">Aceptado</option>
                                                                        <option value="false">Creado</option>
                                                                    </select>

                                                                    <hr />

                                                                    <i
                                                                        className="fas fa-times-circle"
                                                                        onClick={() => this.setState({ commission_id: "" })}
                                                                    >

                                                                    </i>
                                                                </React.Fragment>
                                                            ) : (
                                                                <React.Fragment>

                                                                    <span>{accion.is_acepted ? "Aceptado" : "Creado"}
                                                                        {this.props.estados.accept_commission && (
                                                                            <i onClick={() => this.setState({ commission_id: accion.id })} className="fas fa-pencil-alt float-right"></i>
                                                                        )}
                                                                    </span>

                                                                </React.Fragment>
                                                            )}
                                                        </td>

                                                        <th>
                                                            {this.getDate(accion.created_at)} <br />
                                                            {accion.user != undefined ? <React.Fragment> <b></b> {accion.user != undefined ? accion.user.names : ""} </React.Fragment> : null}
                                                        </th>

                                                        <th>
                                                            {this.getDate(accion.updated_at)} <br />
                                                            {accion.last_user_edited != undefined ? <React.Fragment> <b> </b> {accion.last_user_edited != undefined ? accion.last_user_edited.names : ""} </React.Fragment> : null}
                                                        </th>
                                                    </tr>
                                                ))
                                            ) : (
                                                <td colSpan="11" className="text-center">
                                                    <div className="text-center mt-4 mb-4">
                                                        <h4>No hay registros</h4>
                                                    </div>
                                                </td>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="col-md-12" style={{ marginTop: "50px" }}>
                                    <div className="row">

                                        <div className="col-md-7 text-left pl-0">
                                            <p>
                                                Mostrando {this.props.data.length} de {this.props.total}
                                            </p>
                                        </div>

                                        <div className="col-md-5 p-0 text-right">
                                            <Pagination
                                                hideNavigation
                                                activePage={this.props.activePage}
                                                itemsCountPerPage={this.props.countPage}
                                                itemClass="page-item"
                                                innerClass="pagination"
                                                linkClass="page-link"
                                                totalItemsCount={this.props.total}
                                                pageRangeDisplayed={this.props.countPage}
                                                onChange={this.props.handlePageChange}
                                            />
                                        </div>

                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>

            </React.Fragment>
        );
    }
}

export default Index;
