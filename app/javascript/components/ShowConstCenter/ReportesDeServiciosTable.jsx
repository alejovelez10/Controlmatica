import React, { Component } from 'react';
import NumberFormat from "react-number-format";
import { UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import SweetAlert from "sweetalert2-react";
import Swal from "sweetalert2/dist/sweetalert2.js";
import FormCreate from '../Reports/FormCreate';


class ReportesDeServiciosTable extends Component {
    constructor(props) {
        super(props)
        this.token = document.querySelector("[name='csrf-token']").content;
        this.state = {
            data: [],
            modal: false,
            modeEdit: false,
            ErrorValues: true,
            report_id: "",

            form: {
                customer_id: "",
                contact_id: "",
                report_date: "",
                working_time: "",
                work_description: "",
                viatic_value: "",
                viatic_description: "",
                report_code: 0,
                displacement_hours: "",
                value_displacement_hours: "",
                cost_center_id: this.props.cost_center.id,
                report_execute_id: this.props.usuario.id,
                user_id: this.props.usuario.id,
            },


            formContact: {
                contact_name: "",
                contact_position: "",
                contact_phone: "",
                contact_email: "",
                customer_id: "",
            },

            selectedOption: {
                customer_id: "",
                label: "Buscar cliente"
            },

            selectedOptionContact: {
                contact_id: "",
                label: "Seleccionar Contacto"
            },

            selectedOptionCentro: {
                cost_center_id: "",
                label: "Centro de costo"
            },

            dataContact: [],
            clients: [],
            users: [],
            dataCostCenter: []
        }
    }

    componentDidMount = () => {
        setTimeout(() => {
            this.configSelect();
            this.setState({
                data: this.props.dataReports
            })
        }, 2000)
    }

    configSelect = () => {
        let array = [];

        this.props.users.map((item) => (
            array.push({ names: item.label, id: item.value })
        ))

        this.setState({
            users: array,
        })
    }

    HandleChange = (e) => {
        this.setState({
            form: {
                ...this.state.form,
                [e.target.name]: e.target.value,
            }
        });
    }

    toogle = (from) => {
        if (from == "new") {
            this.setState({ modal: true })
            this.clearValues();
        } else {
            this.setState({ modal: false })
            this.clearValues();
        }
    }

    //add items
    updateData = (data) => {
        this.setState({
            data: [...this.state.data, data],
        })
    }

    //add update
    updateItem = report => {
        this.setState({
            data: this.state.data.map(item => {
                if (report.id === item.id) {
                    return {
                        ...item,
                        code_report: report.code_report,
                        contact: report.contact,
                        contact_email: report.contact_email,
                        contact_id: report.contact_id,
                        contact_name: report.contact_name,
                        contact_phone: report.contact_phone,
                        contact_position: report.contact_position,
                        cost_center: report.cost_center,
                        cost_center_id: report.cost_center_id,
                        count: report.count,
                        created_at: report.created_at,
                        customer: report.customer,
                        customer_id: report.customer_id,
                        customer_name: report.customer_name,
                        displacement_hours: report.displacement_hours,
                        last_user_edited: report.last_user_edited,
                        last_user_edited_id: report.last_user_edited_id,
                        report_code: report.report_code,
                        report_date: report.report_date,
                        report_execute: report.report_execute,
                        report_execute_id: report.report_execute_id,
                        report_sate: report.report_sate,
                        total_value: report.total_value,
                        update_user: report.update_user,
                        updated_at: report.updated_at,
                        user: report.user,
                        user_id: report.user_id,
                        value_displacement_hours: report.value_displacement_hours,
                        viatic_description: report.viatic_description,
                        viatic_value: report.viatic_value,
                        work_description: report.work_description,
                        working_time: report.working_time,
                        working_value: report.working_value,
                    }
                }
                return item;
            })
        });
    }

    clearValues = () => {
        this.setState({
            modeEdit: false,
            ErrorValues: true,

            form: {
                ...this.state.form,
                customer_id: "",
                contact_id: "",
                report_date: "",
                working_time: "",
                work_description: "",
                viatic_value: "",
                viatic_description: "",
                report_code: 0,
                displacement_hours: "",
                value_displacement_hours: "",
            },

            formContact: {
                contact_name: "",
                contact_position: "",
                contact_phone: "",
                contact_email: "",
                customer_id: "",
            },

            selectedOption: {
                customer_id: "",
                label: "Buscar cliente"
            },

            selectedOptionContact: {
                contact_id: "",
                label: "Seleccionar Contacto"
            },

            selectedOptionCentro: {
                cost_center_id: "",
                label: "Centro de costo"
            },
        })
    }

    delete = id => {
        Swal.fire({
            title: "¿Estás seguro?",
            text: "¡El registro será eliminado para siempre!",
            type: "warning",
            showCancelButton: true,
            confirmButtonColor: "#009688",
            cancelButtonColor: "#d33",
            confirmButtonText: "Eliminar",
            cancelButtonText: "Cancelar"
        }).then(result => {
            if (result.value) {
                fetch(`/reports/${id}`, {
                    method: "delete",
                    headers: {
                        "X-CSRF-Token": this.token,
                        "Content-Type": "application/json"
                    }
                })
                    .then(response => response.json())
                    .then(response => {
                        this.setState({
                            data: this.state.data.filter((e) => e.id != id)
                        })
                    });
            }
        });
    };

    HandleClick = () => {
        if (true) {
            if (this.state.report_id) {
                fetch(`/reports/${this.state.report_id}`, {
                    method: 'PATCH', // or 'PUT'
                    body: JSON.stringify(this.state.form), // data can be `string` or {object}!
                    headers: {
                        "X-CSRF-Token": this.token,
                        "Content-Type": "application/json"
                    }
                })

                    .then(res => res.json())
                    .catch(error => console.error("Error:", error))
                    .then(data => {
                        this.updateItem(data.register);
                        this.setState({ material_id: "", modal: false });
                    });
            } else {
                fetch(`/reports`, {
                    method: 'POST', // or 'PUT'
                    body: JSON.stringify(this.state.form), // data can be `string` or {object}!
                    headers: {
                        "X-CSRF-Token": this.token,
                        "Content-Type": "application/json"
                    }
                })
                    .then(res => res.json())
                    .catch(error => console.error("Error:", error))
                    .then(data => {
                        this.updateData(data.register);
                        this.setState({ material_id: "", modal: false });
                    });
            }
        }
    }

    edit = (report) => {
        this.setState({
            modal: true,
            report_id: report.id,

            form: {
                ...this.state.form,
                customer_id: report.customer_id,
                contact_id: report.contact_id,
                report_date: report.report_date,
                report_execute_id: report.report_execute_id,
                working_time: report.working_time,
                work_description: report.work_description,
                viatic_value: report.viatic_value,
                viatic_description: report.viatic_description,
                report_code: report.report_code,
                displacement_hours: report.displacement_hours,
                value_displacement_hours: report.value_displacement_hours,
            },

            selectedOption: {
                customer_id: report.customer_id,
                label: `${report.customer.name}`
            },

            selectedOptionContact: {
                contact_id: report.contact_id,
                label: `${report.contact.name}`
            },
        })
    }

    handleChangeAutocomplete = selectedOption => {
        let array = []
        let arrayCentro = []

        fetch(`/get_client/${selectedOption.value}`, {
            method: 'GET', // or 'PUT'
            headers: {
                "X-CSRF-Token": this.token,
                "Content-Type": "application/json"
            }
        })
            .then(response => response.json())
            .then(data => {

                data.map((item) => (
                    array.push({ label: item.name, value: item.id })
                ))

                this.setState({
                    dataContact: array
                })
            });

        fetch(`/customer_user/${selectedOption.value}`, {
            method: 'GET', // or 'PUT'
            headers: {
                "X-CSRF-Token": this.token,
                "Content-Type": "application/json"
            }
        })
            .then(response => response.json())
            .then(data => {

                data.map((item) => (
                    arrayCentro.push({ label: `${item.code} - (${item.description})`, value: item.id })
                ))

                this.setState({
                    dataCostCenter: arrayCentro
                })
            });

        this.setState({
            selectedOption,
            form: {
                ...this.state.form,
                customer_id: selectedOption.value
            },

            formContact: {
                ...this.state.formContact,
                customer_id: selectedOption.value
            },
        });
    };

    handleChangeAutocompleteContact = selectedOptionContact => {
        this.setState({
            selectedOptionContact,
            form: {
                ...this.state.form,
                contact_id: selectedOptionContact.value
            }
        });
    };

    render() {
        const estados = {
            create: true,
            delete: true,
            download_file: true,
            edit: true,
            edit_all: true,
            responsible: true,
            viatics: true,
        }

        return (
            <React.Fragment>
                {this.state.modal && (
                    <FormCreate
                        toggle={this.toogle}
                        backdrop={this.state.backdrop}
                        modal={this.state.modal}

                        onChangeForm={this.HandleChange}
                        formValues={this.state.form}
                        submit={this.HandleClick}

                        titulo={this.state.report_id ? "Actualizar reporte" : "Crear reporte"}
                        nameSubmit={this.state.report_id ? "Actualizar" : "Crear"}
                        errorValues={this.state.ErrorValues}
                        users={this.state.users}

                        /* CONTACT FORM */

                        formContactValues={this.state.formContact}
                        FormSubmitContact={this.HandleClickContact}
                        create_state={this.state.state_create}
                        errorValuesContact={this.state.ErrorValuesContact}
                        onChangeFormContact={this.handleChangeContact}

                        /* AUTOCOMPLETE CLIENTE */

                        clientes={this.props.clients}
                        onChangeAutocomplete={this.handleChangeAutocomplete}
                        formAutocomplete={this.state.selectedOption}

                        /* AUTOCOMPLETE CONTACTO */

                        contacto={this.state.dataContact}
                        onChangeAutocompleteContact={this.handleChangeAutocompleteContact}
                        formAutocompleteContact={this.state.selectedOptionContact}

                        /* AUTOCOMPLETE CENTRO DE COSTO */

                        centro={this.state.dataCostCenter}
                        onChangeAutocompleteCentro={this.handleChangeAutocompleteCentro}
                        formAutocompleteCentro={this.state.selectedOptionCentro}

                        rol={this.props.rol}
                        estados={estados}
                        isLoading={this.state.isLoading}
                        cost_center_id={this.props.cost_center.id}
                    />
                )}

                <div className="col-md-12 mb-3 text-right pr-0">
                    {!this.state.modal && this.props.estados.cost_center_edit && (
                        <button
                            className="btn-shadow btn btn-secondary"
                            onClick={() => this.toogle("new")}
                        >
                            Crear
                        </button>
                    )}
                </div>

                <div className="content-table">
                    <table className="table table-hover table-bordered table-width" id="sampleTable">
                        <thead>
                            <tr className="tr-title">
                                <th style={{ width: "1%" }}>Acciones</th>
                                <th style={{ width: "6%" }}>Codigo</th>
                                <th style={{ width: "6%" }}>Cliente</th>
                                <th style={{ width: "7%" }}>Fecha de Ejecucion</th>
                                <th style={{ width: "8%" }}>Responsable Ejecucion</th>
                                <th style={{ width: "6%" }}>Horas Laboradas</th>
                                <th>Descripcion del Trabajo</th>
                                <th style={{ width: "7%" }}>Valor de los Viaticos</th>
                                <th style={{ width: "8%" }}>Descripcion de Viaticos</th>
                                <th style={{ width: "6%" }}>Valor del Reporte</th>
                                <th style={{ width: "5%" }}>Estado</th>
                            </tr>
                        </thead>

                        <tbody>
                            {this.state.data.length >= 1 ? (
                                this.state.data.map(accion => (
                                    <tr key={accion.id}>
                                        <td className="text-left">
                                            {this.props.estados.cost_center_edit && (
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
                                        <td>{accion.code_report}</td>
                                        <td>
                                            {accion.cost_center.customer.name}
                                        </td>
                                        <td>{accion.report_date}</td>
                                        <td>{accion.report_execute != undefined ? accion.report_execute.names : ""}</td>
                                        <td>{accion.working_time}</td>
                                        <td>{accion.work_description}</td>
                                        <td><NumberFormat value={accion.viatic_value} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                                        <td>{accion.viatic_description}</td>
                                        <td><NumberFormat value={accion.total_value} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                                        <td>{accion.report_sate ? "Aprobado" : "Sin Aprobar"}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="11" className="text-center">
                                        <div className="text-center mt-4 mb-4">
                                            <h4>No hay reportes de servicios</h4>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </React.Fragment>
        );
    }
}

export default ReportesDeServiciosTable;