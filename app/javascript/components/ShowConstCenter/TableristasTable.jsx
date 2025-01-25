import React, { Component } from 'react';
import FormCreate from '../Contractors/FormCreate';
import { UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import SweetAlert from "sweetalert2-react";
import Swal from "sweetalert2/dist/sweetalert2.js";

class TableristasTable extends Component {
    constructor(props) {
        super(props)
        this.token = document.querySelector("[name='csrf-token']").content;
        this.state = {
            data: [],
            modal: false,
            modeEdit: false,
            ErrorValues: true,
            contractor_id: "",

            form: {
                sales_number: "",
                sales_date: "",
                ammount: "",
                description: "",
                hours: "",
                user_id: this.props.usuario.id,
                cost_center_id: this.props.cost_center.id,
                user_execute_id: "",
            },

            selectedOptionUsers: {
                user_execute_id: "",
                label: "Horas trabajadas por"
            },
        }
    }

    handleChangeAutocompleteUsers = selectedOptionUsers => {
        this.setState({
            selectedOptionUsers,
            form: {
                ...this.state.form,
                user_execute_id: selectedOptionUsers.value
            }
        });
    };

    componentDidMount = () => {
        setTimeout(() => {
            this.setState({
                data: this.props.dataContractors
            })
        }, 2000)
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
    updateItem = register => {
        this.setState({
            data: this.state.data.map(item => {
                if (register.id === item.id) {
                    return {
                        ...item,
                        sales_date: register.sales_date,
                        hours: register.hours,
                        user_execute: register.user_execute,
                        description: register.description,
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
                sales_number: "",
                sales_date: "",
                ammount: "",
                description: "",
                hours: "",
                user_execute_id: "",
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
                fetch(`/contractors/${id}`, {
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
            if (this.state.contractor_id) {
                fetch(`/contractors/${this.state.contractor_id}`, {
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
                        this.setState({ contractor_id: "", modal: false });
                    });
            } else {
                fetch(`/contractors`, {
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
                        this.setState({ contractor_id: "", modal: false });
                    });
            }
        }
    }

    edit = (contractor) => {
        this.setState({
            modal: true,
            contractor_id: contractor.id,

            form: {
                ...this.state.form,
                sales_number: contractor.sales_number,
                sales_date: contractor.sales_date,
                ammount: contractor.ammount,
                description: contractor.description,
                hours: contractor.hours,
                user_execute_id: contractor.user_execute ? contractor.user_execute.id : "",
            },

            selectedOptionUsers: {
                user_execute_id: contractor.user_execute_id,
                label: `${contractor.user_execute ? contractor.user_execute.names : "Horas trabajadas por"}`
            },
        })
    }

    render() {
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

                        titulo={this.state.contractor_id ? "Actualizar tablerista" : "Crear tablerista"}
                        nameSubmit={this.state.contractor_id ? "Actualizar" : "Crear"}
                        errorValues={this.state.ErrorValues}
                        modeEdit={this.state.contractor_id ? true : false}

                        /* AUTOCOMPLETE CENTRO DE COSTO */

                        centro={this.state.dataCostCenter}
                        onChangeAutocompleteCentro={this.handleChangeAutocompleteCentro}
                        formAutocompleteCentro={this.state.selectedOptionCentro}

                        /* AUTOCOMPLETE USERS */

                        users={this.props.users}
                        onChangeAutocompleteUsers={this.handleChangeAutocompleteUsers}
                        formAutocompleteUsers={this.state.selectedOptionUsers}

                        isLoading={this.state.isLoading}
                        cost_center_id={this.props.cost_center.id}
                    />
                )}

                <div className="content">
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

                    <table
                        className="table table-hover table-bordered"
                        id="sampleTable"
                    >
                        <thead>
                            <tr className="tr-title">
                                <th style={{ width: "1%" }}>Acciones</th>
                                <th style={{ width: "10%" }}>Fecha</th>
                                <th style={{ width: "7%" }}>Horas</th>
                                <th style={{ width: "16%" }}>Trabajo realizado por</th>
                                <th style={{ width: "16%" }}>Descripcion</th>
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
                                        <td>{accion.sales_date}</td>
                                        <td>{accion.hours}</td>
                                        <td>{accion.user_execute ? accion.user_execute.names : ""}</td>
                                        <td>{accion.description}</td>
                                    </tr>
                                ))
                            ) : (
                                <td colSpan="8" className="text-center">
                                    <div className="text-center mt-1 mb-1">
                                        <h4>No hay tableristas</h4>
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

export default TableristasTable;