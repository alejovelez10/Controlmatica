import React, { Component } from 'react';
import NumberFormat from "react-number-format";
import FormCreate from '../PurchaseOrders/FormCreate';
import { UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import SweetAlert from "sweetalert2-react";
import Swal from "sweetalert2/dist/sweetalert2.js";

class OrdenesDeCompraTable extends Component {
    constructor(props) {
        super(props)
        this.token = document.querySelector("[name='csrf-token']").content;
        this.state = {
            data: [],
            modal: false,
            modeEdit: false,
            ErrorValues: true,
            purchase_order_id: "",
            order_file: {},

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
        }, 1000)
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

    date_short = (fecha) => {
        var d = new Date(fecha)
        return (d.getDate() + 1 > 9 ? "" : "0") + (d.getDate() +  1)  + "/" + (d.getMonth() +1  > 9 ? "" : "0") + (d.getMonth()  +  1) + " " + '/' + d.getFullYear()
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
                        backdrop={this.state.backdrop}
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
                            <th style={{width: "10px"}}>Acciones</th>
                            <th style={{width: "150px"}}>Cliente</th>
                            <th style={{width: "150px"}}>Fecha de Orden</th>
                            <th style={{width: "150px"}}>Numero</th>
                            <th style={{width: "150px"}}>Valor</th>
                            <th style={{width: "450px"}}>Facturas</th>
                            <th style={{width: "200px"}}>Total Facturas</th>
                            <th style={{width: "300px"}}>Descripción</th>
                            <th style={{width: "250px"}}>Estado Centro de Costo</th>
                            <th style={{width: "120px"}}>Archivo</th>
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
                                    
                                    <td>{accion.cost_center.customer.name}</td>
                                    <td><p>{accion.created_date}</p></td>
                                    <td><p>{accion.order_number}</p></td>
                                    <td><NumberFormat value={accion.order_value} displayType={"text"} thousandSeparator={true} prefix={"$"}/></td>
                                    <td>  
                                        <table style={{tableLayout: "fixed", width:"100%"}}>
                                        <tr>
                                            <td style={{padding:"0px", textAlign:"center"}}>Numero</td>
                                            <td style={{padding:"0px", textAlign:"center"}}>Fecha</td>
                                            <td style={{padding:"0px", textAlign:"center"}}>Valor</td>
                                            </tr>
                                        {accion.customer_invoices.map(customer => (
                                            <tr>
                                            <td style={{padding:"5px", textAlign:"center"}}>{customer.number_invoice}</td>
                                            <td style={{padding:"5px", textAlign:"center"}}>{this.date_short(customer.invoice_date)}</td>
                                            <td style={{padding:"5px", textAlign:"center"}} ><NumberFormat value={customer.invoice_value} displayType={"text"} thousandSeparator={true} prefix={"$"}/></td>
                                            </tr>
                                        ))}
                                            
                                        </table>
                                    </td>
                                    <td><NumberFormat value={accion.sum_invoices} displayType={"text"} thousandSeparator={true} prefix={"$"}/></td>
                                    <th>{accion.description}</th>
                                    <th>{accion.cost_center.invoiced_state}</th>

                                <td>
                                        <React.Fragment>
                                            {accion.order_file && accion.order_file.url != null ? (
                                                    <a data-toggle="tooltip" data-placement="bottom" title="" target="_blank" className="btn" href={accion.order_file.url} data-original-title="Descargar Archivo" >
                                                    <i className="fas fa-download"></i>
                                                    </a>
                                                ) : (
                                                    <i className="fas fa-times color-false"></i>
                                            )}
                                        </React.Fragment>
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