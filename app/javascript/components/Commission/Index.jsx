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
                user_invoice_id: "",
                start_date: "",
                end_date: "",
                customer_invoice_id: "",
                observation: "",
                hours_worked: "",
                total_value: "",
            },

            selectedOptionUser: {
                user_invoice_id: "",
                label: "Usuario"
            },

            selectedOptionCustomerInvoice: {
                customer_invoice_id: "",
                label: "Facturas"
            },
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
            this.state.formCreate.total_value != ""
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
                user_invoice_id: "",
                start_date: "",
                end_date: "",
                customer_invoice_id: "",
                observation: "",
                hours_worked: "",
                total_value: "",
            },

            selectedOptionUser: {
                user_invoice_id: "",
                label: "Usuario"
            },

            selectedOptionCustomerInvoice: {
                customer_invoice_id: "",
                label: "Facturas"
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
        this.setState({
            formCreate: {
                ...this.state.formCreate,
                [e.target.name]: e.target.value
            }
        })
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

    handleChangeAutocompleteUser = selectedOptionUser => {
        this.setState({
            selectedOptionUser,
                formCreate: {
                    ...this.state.formCreate,
                    user_invoice_id: selectedOptionUser.value
                }
        });
    };

    edit = (report_expense) => {
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
                total_value: report_expense.total_value,
                is_acepted: report_expense.is_acepted,
            },

            selectedOptionCustomerInvoice: {
                customer_invoice_id: `${report_expense.customer_invoice != null ? report_expense.customer_invoice.id : ""}`,
                label: `${report_expense.customer_invoice != null ? report_expense.customer_invoice.number_invoice : "Centro de costo"}`
            },

            selectedOptionUser: {
                user_invoice_id: `${report_expense.user_invoice != null ? report_expense.user_invoice.id : ""}`,
                label: `${report_expense.user_invoice != null ? report_expense.user_invoice.names : "Usuario"}`
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

                        handleChangeAutocompleteCustomerInvoice={this.handleChangeAutocompleteCustomerInvoice}
                        selectedOptionCustomerInvoice={this.state.selectedOptionCustomerInvoice}
                        customer_invoices={this.props.customer_invoices}
                        
                        handleChangeAutocompleteUser={this.handleChangeAutocompleteUser}
                        selectedOptionUser={this.state.selectedOptionUser}
                        users={this.props.users}
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
                                                Aceptar Comisiones
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
                                                <th style={{ width: "20px" }} className="text-center">Acciones</th>
                                                <th style={{ width: "70px" }}>Responsable</th>
                                                <th style={{ width: "100px" }}>Fecha de inicial</th>
                                                <th style={{ width: "100px" }}>Fecha de finalización</th>
                                                <th style={{ width: "7%" }}>Factura</th>
                                                <th style={{ width: "7%" }}>Horas trabajadas</th>
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
                                                        <td>{accion.start_date}</td>
                                                        <td>{accion.end_date}</td>
                                                        <td>{accion.customer_invoice.number_invoice}</td>
                                                        <td>{accion.hours_worked}</td>
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
