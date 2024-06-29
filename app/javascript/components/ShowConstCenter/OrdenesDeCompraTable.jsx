import React, { Component } from 'react';
import NumberFormat from "react-number-format";
import FormCreate from '../PurchaseOrders/FormCreate';
import { UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import SweetAlert from "sweetalert2-react";
import Swal from "sweetalert2/dist/sweetalert2.js";
import IndexInvoice from '../SalesOrders/IndexInvoice';

class OrdenesDeCompraTable extends Component {
    constructor(props) {
        super(props)
        this.token = document.querySelector("[name='csrf-token']").content;
        this.state = {
            data: [],
            modal: false,
            modalIndexInvoice: false,
            modeEdit: false,
            ErrorValues: true,
            purchase_order_id: "",
            order_file: {},
            sales_order: {},

            form: {
                created_date: "",
                order_number: "",
                order_value: "",
                order_file: {},
                user_id: this.props.usuario.id,
                description: "",
                cost_center_id: this.props.cost_center.id
            },
        }
    }

    componentDidMount = () => {
        setTimeout(() => {
            this.setState({
                data: this.props.dataSalesOrdes
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

    toogleIndexInvoice = (from, sales_order) => {
        if (from == "new") {
            this.setState({ modalIndexInvoice: true, sales_order: sales_order })
        } else {
            this.setState({ modalIndexInvoice: false, sales_order: {} })
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
                        cost_center: register.cost_center,
                        cost_center_id: register.cost_center_id,
                        created_at: register.created_at,
                        created_date: register.created_date,
                        customer_invoices: register.customer_invoices,
                        description: register.description,
                        last_user_edited_id: register.last_user_edited_id,
                        order_file: register.order_file,
                        order_number: register.order_number,
                        order_value: register.order_value,
                        state: register.state,
                        sum_invoices: register.sum_invoices,
                        update_user: register.update_user,
                        updated_at: register.updated_at,
                        user_id: register.user_id,
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
            purchase_order_id: "",

            form: {
                ...this.state.form,
                created_date: "",
                order_number: "",
                order_value: "",
                order_file: {},
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
                fetch(`/sales_orders/${id}`, {
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
        const formData = new FormData();
        formData.append("created_date", this.state.form.created_date);
        formData.append("order_number", this.state.form.order_number);
        formData.append("order_value", this.state.form.order_value);
        formData.append("order_file", this.state.form.order_file);
        formData.append("user_id", this.props.usuario.id);
        formData.append("cost_center_id", this.props.cost_center.id);
        formData.append("description", this.state.form.description);

        if (true) {
            if (this.state.purchase_order_id) {
                fetch(`/sales_orders/${this.state.purchase_order_id}`, {
                    method: 'PATCH', // or 'PUT'
                    body: formData, // data can be `string` or {object}!
                    headers: {}
                })

                    .then(res => res.json())
                    .catch(error => console.error("Error:", error))
                    .then(data => {
                        this.updateItem(data.register);
                        this.setState({ material_id: "", modal: false });
                    });
            } else {
                fetch(`/sales_orders`, {
                    method: 'POST', // or 'PUT'
                    body: formData, // data can be `string` or {object}!
                    headers: {}
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

    edit = (purchase_order) => {
        this.setState({
            modal: true,
            purchase_order_id: purchase_order.id,

            form: {
                ...this.state.form,
                created_date: purchase_order.created_date,
                order_number: purchase_order.order_number,
                order_value: purchase_order.order_value,
                description: purchase_order.description,
            },
        })
    }

    loadData = () => {
        fetch(`/get_sales_order`, {
            method: 'GET', // or 'PUT'
            headers: {
                "X-CSRF-Token": this.token,
                "Content-Type": "application/json"
            }
        })
            .then(response => response.json())
            .then(data => {
                this.setState({
                    data: data.sales_order,
                    isLoaded: false
                });
            });
    }

    date_short = (fecha) => {
        var d = new Date(fecha)
        return (d.getDate() + 1 > 9 ? "" : "0") + (d.getDate() + 1) + "/" + (d.getMonth() + 1 > 9 ? "" : "0") + (d.getMonth() + 1) + " " + '/' + d.getFullYear()
    }

    handleFileOrderFile = e => {
        this.setState({
            form: {
                ...this.state.form,
                order_file: e.target.files[0]
            },
        });
    };

    render() {
        return (
            <React.Fragment>
                {this.state.modal && (
                    <FormCreate
                        toggle={this.toogle}
                        backdrop={"static"}
                        modal={this.state.modal}

                        onChangeForm={this.HandleChange}
                        formValues={this.state.form}
                        submit={this.HandleClick}

                        titulo={this.state.purchase_order_id ? "Actualizar" : "Crear"}
                        nameSubmit={this.state.purchase_order_id ? "Actualizar" : "Crear"}
                        errorValues={this.state.ErrorValues}
                        modeEdit={this.state.purchase_order_id ? true : false}

                        onChangehandleFileOrderFile={this.handleFileOrderFile}
                        cost_center_id={this.props.cost_center.id}
                    />
                )}

                {this.state.modalIndexInvoice && (
                    <IndexInvoice
                        toggle={this.toogleIndexInvoice}
                        backdrop={"static"}
                        modal={this.state.modalIndexInvoice}
                        sales_order={this.state.sales_order}
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

                    <table
                        className="table table-hover table-bordered"
                        id="sampleTable"
                    >
                        <thead>
                            <tr className="tr-title">
                                <th style={{ width: "10px" }}>Acciones</th>
                                <th style={{ width: "150px" }}>Cliente</th>
                                <th style={{ width: "150px" }}>Fecha de Orden</th>
                                <th style={{ width: "150px" }}>Numero</th>
                                <th style={{ width: "150px" }}>Valor</th>
                                <th style={{ width: "450px" }}>Facturas</th>
                                <th style={{ width: "200px" }}>Total Facturas</th>
                                <th style={{ width: "300px" }}>Descripción</th>
                                <th style={{ width: "250px" }}>Estado Centro de Costo</th>
                                <th style={{ width: "120px" }}>Archivo</th>
                            </tr>
                        </thead>

                        <tbody>
                            {this.state.data.length >= 1 ? (
                                this.state.data.map(sales_order => (
                                    <tr key={sales_order.id}>
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
                                                                onClick={() => this.toogleIndexInvoice("new", sales_order)}
                                                            >
                                                                Facturas
                                                            </DropdownItem>
                                                        )}

                                                        {true && (
                                                            <DropdownItem
                                                                className="dropdown-item"
                                                                onClick={() => this.edit(sales_order)}
                                                            >
                                                                Editar
                                                            </DropdownItem>
                                                        )}

                                                        {true && (
                                                            <DropdownItem
                                                                onClick={() => this.delete(sales_order.id)}
                                                                className="dropdown-item"
                                                            >
                                                                Eliminar
                                                            </DropdownItem>
                                                        )}
                                                    </DropdownMenu>
                                                </UncontrolledDropdown>
                                            )}
                                        </td>

                                        <td>{sales_order.cost_center.customer.name}</td>
                                        <td><p>{sales_order.created_date}</p></td>
                                        <td><p>{sales_order.order_number}</p></td>
                                        <td><NumberFormat value={sales_order.order_value} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                                        <td>
                                            <table style={{ tableLayout: "fixed", width: "100%" }}>
                                                <tr>
                                                    <td style={{ padding: "0px", textAlign: "center" }}>Numero</td>
                                                    <td style={{ padding: "0px", textAlign: "center" }}>Fecha</td>
                                                    <td style={{ padding: "0px", textAlign: "center" }}>Valor</td>
                                                </tr>
                                                {sales_order.customer_invoices.map(customer => (
                                                    <tr>
                                                        <td style={{ padding: "5px", textAlign: "center" }}>{customer.number_invoice}</td>
                                                        <td style={{ padding: "5px", textAlign: "center" }}>{this.date_short(customer.invoice_date)}</td>
                                                        <td style={{ padding: "5px", textAlign: "center" }} ><NumberFormat value={customer.invoice_value} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                                                    </tr>
                                                ))}
                                            </table>
                                        </td>
                                        <td><NumberFormat value={sales_order.sum_invoices} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                                        <th>{sales_order.description}</th>
                                        <th>{sales_order.cost_center.invoiced_state}</th>

                                        <td>
                                            {sales_order.order_file && sales_order.order_file.url != null ? (
                                                <a data-toggle="tooltip" data-placement="bottom" title="" target="_blank" className="btn" href={sales_order.order_file.url} data-original-title="Descargar Archivo" >
                                                    <i className="fas fa-download"></i>
                                                </a>
                                            ) : (
                                                <i className="fas fa-times color-false"></i>
                                            )}
                                        </td>

                                    </tr>
                                ))
                            ) : (
                                <td colSpan="10" className="text-center">
                                    <div className="text-center mt-1 mb-1">
                                        <h4>Ordenes de Compra</h4>
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

export default OrdenesDeCompraTable;