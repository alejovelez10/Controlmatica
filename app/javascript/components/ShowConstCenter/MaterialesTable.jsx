import React, { Component } from 'react';
import NumberFormat from "react-number-format";
import FormCreate from '../Materials/FormCreate';
import { UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import SweetAlert from "sweetalert2-react";
import Swal from "sweetalert2/dist/sweetalert2.js";
import IndexInvoice from '../incomeDetail/IndexInvoice';

class MaterialesTable extends Component {
    constructor(props) {
        super(props)
        this.token = document.querySelector("[name='csrf-token']").content;
        this.state = {
            data: [],
            modal: false,
            modeEdit: false,
            modalIndexInvoice: false,
            ErrorValues: true,
            material_id: "",
            material: {},

            form: {
                provider_id: "",
                sales_date: "",
                sales_number: "",
                amount: "",
                delivery_date: "",
                sales_state: "",
                description: "",
                user_id: this.props.usuario.id,
                cost_center_id: this.props.cost_center.id
            },
        }
    }

    componentDidMount = () => {
        setTimeout(() => {
            this.setState({
                data: this.props.dataMateriales
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
                        provider: register.provider,
                        sales_number: register.sales_number,
                        amount: register.amount,
                        description: register.description,
                        sales_date: register.sales_date,
                        delivery_date: register.delivery_date,
                        provider_invoice_value: register.provider_invoice_value,
                        sales_state: register.sales_state
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
                provider_id: "",
                sales_date: "",
                sales_number: "",
                amount: "",
                delivery_date: "",
                sales_state: "",
                description: "",
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
                fetch(`/materials/${id}`, {
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
            if (this.state.material_id) {
                fetch(`/materials/${this.state.material_id}`, {
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
                fetch(`/materials`, {
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

    edit = (material) => {
        this.setState({
            modal: true,
            material_id: material.id,

            form: {
                ...this.state.form,
                provider_id: material.provider_id,
                sales_date: material.sales_date,
                sales_number: material.sales_number,
                amount: material.amount,
                delivery_date: material.delivery_date,
                sales_state: material.sales_state,
                description: material.description,
            },
        })
    }

    toogleIndexInvoice = (from, material) => {
        if (from == "new") {
            this.setState({ modalIndexInvoice: true, material: material })
        } else {
            this.setState({ modalIndexInvoice: false, material: {} })
        }
    }

    loadData = () => {
        fetch(`/get_materials`, {
            method: 'GET', // or 'PUT'
            headers: {
                "X-CSRF-Token": this.token,
                "Content-Type": "application/json"
            }
        })
            .then(response => response.json())
            .then(data => {
                this.setState({
                    data: data.materials_paginate,
                    isLoaded: false
                });
            });
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
                        FormSubmit={this.handleSubmit}
                        titulo={this.state.material_id ? "Actualizar material" : "Crear material"}
                        nameSubmit={this.state.material_id ? "Actualizar" : "Crear"}
                        errorValues={this.state.ErrorValues}
                        modeEdit={this.state.material_id ? true : false}
                        providers={this.props.providers}
                        cost_center_id={this.props.cost_center.id}
                    />
                )}

                {this.state.modalIndexInvoice && (
                    <IndexInvoice
                        toggle={this.toogleIndexInvoice}
                        backdrop={"static"}
                        modal={this.state.modalIndexInvoice}
                        material={this.state.material}
                        loadData={this.loadData}
                    />
                )}

                <div className="content-table">
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

                    <table className="table table-hover table-bordered" id="sampleTable">
                        <thead>
                            <tr className="tr-title">
                                <th style={{ width: "1%" }}>Acciones</th>
                                <th style={{ width: "8%" }}>Proveedor</th>
                                <th style={{ width: "6%" }}># Orden</th>
                                <th style={{ width: "5%" }}>Valor</th>
                                <th style={{ width: "370px", maxWidth: "370px" }}>Descripción</th>
                                <th style={{ width: "8%" }}>Fecha de Orden</th>
                                <th style={{ width: "8%" }}>Fecha Entrega</th>
                                <th style={{ width: "450px" }}>Facturas</th>
                                <th style={{ width: "7%" }}>Valor Facturasdddd</th>
                                <th style={{ width: "11%" }}>Estado</th>
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
                                                                onClick={() => this.toogleIndexInvoice("new", accion)}
                                                            >
                                                                Facturas
                                                            </DropdownItem>
                                                        )}

                                                        {this.props.estados.edit_materials && (
                                                            <DropdownItem
                                                                className="dropdown-item"
                                                                onClick={() => this.edit(accion)}
                                                            >
                                                                Editar
                                                            </DropdownItem>
                                                        )}

                                                        {this.props.estados.delete_materials && (
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

                                        <td>{accion.provider.name}</td>
                                        <td>{accion.sales_number}</td>
                                        <td><NumberFormat value={accion.amount} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                                        <td style={{ width: "370px", maxWidth: "370px" }}>{accion.description}</td>
                                        <td>{accion.sales_date}</td>
                                        <td>{accion.delivery_date}</td>
                                        <td>
                                            {accion.material_invoices && (
                                                <table style={{ tableLayout: "fixed", width: "100%" }}>
                                                    <tr>
                                                        <td style={{ padding: "0px", textAlign: "center" }}>Numero de factura</td>
                                                        <td style={{ padding: "0px", textAlign: "center" }}>Valor</td>
                                                        <td style={{ padding: "0px", textAlign: "center" }}>Descripcion</td>
                                                    </tr>
                                                    {accion.material_invoices.map(customer => (
                                                        <tr>
                                                            <td style={{ padding: "5px", textAlign: "center" }}>{customer.number}</td>
                                                            <td style={{ padding: "5px", textAlign: "center" }}><NumberFormat value={customer.value} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                                                            <td style={{ padding: "5px", textAlign: "center" }}>{customer.observation}</td>
                                                        </tr>
                                                    ))}
                                                </table>
                                            )}
                                        </td>
                                        <td><NumberFormat value={accion.provider_invoice_value} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                                        <td>
                                            <p>{accion.sales_state}</p>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <td colSpan="10" className="text-center">
                                    <div className="text-center mt-1 mb-1">
                                        <h4>No hay materiales</h4>
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

export default MaterialesTable;