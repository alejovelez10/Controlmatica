import React, { Component } from 'react';
import FormCreate from './FormCreate'
import FormImportFile from './FormImportFile';
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
            modalImport: false,
            modeEdit: false,
            ErrorValues: true,
            id: "",
            report_expense_id: "",

            formCreate: {
                cost_center_id: "",
                user_invoice_id: this.props.current_user.actual_user,
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
                user_invoice_id: this.props.current_user.actual_user,
                label: this.props.current_user.names
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

        }
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

    toogle = (from) => {
        if (from == "new") {
            this.setState({ modal: true })
        } else {
            this.setState({ modal: false })
            this.clearValues()
        }
    }

    toogleFile = (from) => {
        if (from == "new") {
            this.setState({ modalImport: true })
        } else {
            this.setState({ modalImport: false })
        }
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
                cost_center_id: "",
                user_invoice_id: this.props.current_user.id,
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
                user_invoice_id: this.props.current_user.id,
                label: this.props.current_user.names
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

    updateFilterValues = () => {
        fetch(`/update_filter_values?cost_center_id=${this.props.formFilter.cost_center_id}&user_invoice_id=${this.props.formFilter.user_invoice_id}&invoice_name=${this.props.formFilter.invoice_name}&invoice_date=${this.props.formFilter.invoice_date}&identification=${this.props.formFilter.identification}&description=${this.props.formFilter.description}&invoice_number=${this.props.formFilter.invoice_number}&type_identification_id=${this.props.formFilter.type_identification_id}&payment_type_id=${this.props.formFilter.payment_type_id}&invoice_value=${this.props.formFilter.invoice_value}&invoice_tax=${this.props.formFilter.invoice_tax}&invoice_total=${this.props.formFilter.invoice_total}&start_date=${this.props.formFilter.start_date}&end_date=${this.props.formFilter.end_date}`, {
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
                this.props.HandleClickFilter();
                this.messageSuccess(data)
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
                        this.props.loadData()
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
                        this.props.loadData()
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

    setValuesReportExpenseOption = (report_expense_option) => {
        if (report_expense_option.category == "Tipo") {
            let data = { label: report_expense_option.name, value: report_expense_option.id }
            this.props.updateDataReportExpenseOptionType(data)

            this.setState({
                formCreate: {
                    ...this.state.formCreate,
                    type_identification_id: report_expense_option.id
                },

                selectedOptionTypeIndentification: {
                    type_identification_id: report_expense_option.id,
                    label: report_expense_option.name
                },
            })

        } else {
            let data = { label: report_expense_option.name, value: report_expense_option.id }
            this.props.updateDataReportExpenseOptionPayment(data)

            this.setState({
                formCreate: {
                    ...this.state.formCreate,
                    payment_type_id: report_expense_option.id
                },

                selectedOptionPaymentType: {
                    payment_type_id: report_expense_option.id,
                    label: report_expense_option.name,
                },
            })
        }
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
        var timeValue;
    
        if (hours > 0 && hours <= 12) {
          timeValue= "" + hours;
        } else if (hours > 12) {
          timeValue= "" + (hours - 12);
        } else if (hours == 0) {
          timeValue= "12";
        }
        
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

    render() {
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
                        estados={this.props.estados}
                        current_user={this.props.current_user}
                        //select values

                        handleChangeAutocompleteCostCenter={this.handleChangeAutocompleteCostCenter}
                        selectedOptionCostCenter={this.state.selectedOptionCostCenter}
                        cost_centers={this.props.cost_centers}

                        handleChangeAutocompleteUser={this.handleChangeAutocompleteUser}
                        selectedOptionUser={this.state.selectedOptionUser}
                        users={this.props.users}

                        selectedOptionTypeIndentification={this.state.selectedOptionTypeIndentification}
                        handleChangeAutocompleteReportExpenceOptionType={this.handleChangeAutocompleteReportExpenceOptionType}
                        report_expense_options_type={this.props.report_expense_options_type}

                        selectedOptionPaymentType={this.state.selectedOptionPaymentType}
                        handleChangeAutocompleteReportExpenceOptionPaymentType={this.handleChangeAutocompleteReportExpenceOptionPaymentType}
                        report_expense_options_payment={this.props.report_expense_options_payment}

                        updateDataReportExpenseOptionType={this.props.updateDataReportExpenseOptionType}
                        updateDataReportExpenseOptionPayment={this.props.updateDataReportExpenseOptionPayment}
                    />
                )}

                {this.state.modalImport && (
                    <FormImportFile
                        //modal props
                        backdrop={"static"}
                        modal={this.state.modalImport}
                        toggle={this.toogleFile}
                        title={"Importar archivo"}
                        nameBnt={"Subir archivo"}
                        closeModal={this.closeModal}
                        loadDataTable={this.props.loadData}
                        showMsgLoad={this.showMsgLoad}
                    />
                )}

                <div className="row">
                    <div className="col-md-12">
                        <div className="tile">

                            <div className="row">
                                <div className="col-md-6">
                                    {this.state.showMsgLoadState && (
                                        <div className="col-md-12">
                                            <div class="alert alert-warning alert-dismissible fade show" role="alert">
                                                <strong>- {this.state.showMsgLoadData.data[0].length} Registros fueron cargados exitosamente.</strong><br />
                                                <strong>- {this.state.showMsgLoadData.data[1].length} Registros no se pudieron cargar Filas({this.state.showMsgLoadData.data[1].map((value,index) => (
                                                    <span>{ index == 0 ?  "" : ","} {value} </span>
                                                ))}).</strong>
                                                <button type="button" class="close" onClick={() => this.setState({showMsgLoadState:false})}>
                                                    <span aria-hidden="true">&times;</span>
                                                </button>
                                            </div>

                                        </div>
                                    )}
                                </div>
                                <div className="col-md-6 text-right mb-3">
                                    <div style={{ display: "inline-flex" }}>

                                        {false && (
                                            <a
                                                className="btn btn-secondary ml-3"
                                                href={`/indicators_expenses`}
                                                target="_blank"
                                            >
                                                Informes de gastos
                                            </a>
                                        )}

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

                                                    {this.props.estados.create && (
                                                        <a class="dropdown-item" onClick={() => this.toogleFile("new")}><img src="https://cdn.iconscout.com/icon/premium/png-256-thumb/import-2033519-1712953.png" alt="" style={{ height: "35px" }} /> Importar</a>
                                                    )}
                                                    {this.props.estados.export && (
                                                        <a
                                                            className="dropdown-item"
                                                            href={`/download_file/report_expenses/${!this.props.isFiltering ? "todos.xlsx" : `filtro.xlsx?cost_center_id=${this.props.formFilter.cost_center_id}&user_invoice_id=${this.props.formFilter.user_invoice_id}&invoice_name=${this.props.formFilter.invoice_name}&invoice_date=${this.props.formFilter.invoice_date}&identification=${this.props.formFilter.identification}&description=${this.props.formFilter.description}&invoice_number=${this.props.formFilter.invoice_number}&type_identification_id=${this.props.formFilter.type_identification_id}&payment_type_id=${this.props.formFilter.payment_type_id}&invoice_value=${this.props.formFilter.invoice_value}&invoice_tax=${this.props.formFilter.invoice_tax}&invoice_total=${this.props.formFilter.invoice_total}&start_date=${this.props.formFilter.start_date}&end_date=${this.props.formFilter.end_date}`}`}
                                                            target="_blank"
                                                        >
                                                            <img src="https://mybc1.s3.amazonaws.com/uploads/rseguimiento/evidencia/244/file_formats_4_csv-512.png" alt="" style={{ height: "25px" }} /> Exportar
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {(this.props.isFiltering && this.props.estados.closed) && (
                                            <button
                                                className="btn btn-secondary ml-3"
                                                onClick={() => this.updateFilterValues()}
                                            >
                                                Aceptar gastos
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
                                                <th style={{ width: "80px" }} className="text-center">Acciones</th>
                                                <th style={{ width: "150px" }}>Centro de costo</th>
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
                                                <th style={{ width: "200px" }}>Creación</th>
                                                <th style={{ width: "200px" }}>Ultima actualización</th>
                                            </tr>
                                        </thead>

                                        <tbody>


                                            {this.props.data.length >= 1 ? (
                                                this.props.data.map(accion => (
                                                    <tr key={accion.id}>

                                                        <td className="text-center" style={{ width: "10px" }}>
                                                            {(!accion.is_acepted || this.props.estados.closed) && (
                                                                <div className="btn-group" role="group" aria-label="Button group with nested dropdown">
                                                                    <div className="btn-group" role="group">
                                                                        <button className="btn btn-secondary" id="btnGroupDrop1" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                                                            <i className="fas fa-bars"></i>
                                                                        </button>

                                                                        <div className="dropdown-menu dropdown-menu-right">

                                                                            {(this.props.estados.edit && accion.cost_center.execution_state != "FINALIZADO") && (
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


                                                        <td>{accion.cost_center ? accion.cost_center.code : ""}</td>
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
                                                        <td>
                                                            {this.state.report_expense_id == accion.id ? (
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
                                                                        onClick={() => this.setState({ report_expense_id: "" })}
                                                                    >
                                                                            
                                                                    </i>
                                                                </React.Fragment>
                                                            ) : (
                                                                <React.Fragment>
                                                                    <span>{accion.is_acepted ? "Aceptado" : "Creado"} <i onClick={() => this.setState({ report_expense_id: accion.id })} className="fas fa-pencil-alt float-right"></i></span>
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
                                                    <td colSpan="13" className="text-center">
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
