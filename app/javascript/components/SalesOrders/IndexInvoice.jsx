import React, { Component } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import NumberFormat from 'react-number-format';
import SweetAlert from 'sweetalert2-react';
import Swal from 'sweetalert2/dist/sweetalert2.js'

class IndexInvoice extends Component {

    constructor(props){
        super(props)
        this.token = document.querySelector("[name='csrf-token']").content;
        this.state = {
            isLoaded: true,
            modal: false,
            customer_invoice_id: "",
            data: [],
            form: {
                sales_order_id: this.props.sales_order.id,
                cost_center_id: this.props.sales_order.cost_center_id,
                invoice_date: "",
                invoice_value: "",
                number_invoice: "",
                delivery_certificate_file: {},
                reception_report_file: {},
                engineering_value: "",
            },
        }
    }

    handleSubmit = e => {
        e.preventDefault();
    };

    componentDidMount = () => {
        this.loadData();
    }

    handleChange = e => {
        this.setState({
            form: {
                ...this.state.form,
                [e.target.name]: e.target.value
            }
        });
    };

    handleChangeFile = (e) => {
        this.setState({
            form: {
                ...this.state.form,
                [e.target.name]: e.target.files[0]
            }
        });
    };

    loadData = () => {
        fetch(`/get_sales_order_invoice/${this.props.sales_order.id}`, {
            method: 'GET', // or 'PUT'
            headers: {
                "X-CSRF-Token": this.token,
                "Content-Type": "application/json"
            }
        })
        .then(response => response.json())
        .then(data => {
            this.setState({
                data: data.sales_orders,
                isLoaded: false
            });
        });
    }

    clearValues = () => {
        this.setState({
            customer_invoice_id: "",

            form: {
                ...this.state.form,
                invoice_date: "",
                invoice_value: "",
                number_invoice: "",
                delivery_certificate_file: {},
                reception_report_file: {},
                engineering_value: "",
            },
        })
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
                fetch(`/customer_invoices/${id}`, {
                    method: "delete",
                    headers: {
                        "X-CSRF-Token": this.token,
                        "Content-Type": "application/json"
                    }
                })
                .then(response => response.json())
                .then(response => {
                    this.props.loadData();
                    this.setState({
                        data: this.state.data.filter((e) => e.id != id) 
                    })
                });
            }
        });
    };

    HandleClick = () => {
        const formData = new FormData();
        formData.append("sales_order_id", this.props.sales_order.id);
        formData.append("invoice_date", this.state.form.invoice_date);
        formData.append("invoice_value", this.state.form.invoice_value);
        formData.append("number_invoice", this.state.form.number_invoice);
        formData.append("delivery_certificate_file", this.state.form.delivery_certificate_file);
        formData.append("reception_report_file", this.state.form.reception_report_file);
        formData.append("cost_center_id", this.state.form.cost_center_id);
        formData.append("engineering_value", this.state.form.engineering_value);

        if (true) {
            if (this.state.customer_invoice_id) {
                fetch(`/customer_invoices/${this.state.customer_invoice_id}`, {
                    method: 'PATCH', // or 'PUT'
                    body: formData, // data can be `string` or {object}!
                    headers: {}
                })
                .then(res => res.json())
                .catch(error => console.error("Error:", error))
                .then(data => {
                    this.updateItem(data.register);
                    this.props.loadData();
                    this.setState({ customer_invoice_id: "", modal: false });
                });
            } else {
                fetch(`/customer_invoices`, {
                    method: 'POST', // or 'PUT'
                    body: formData, // data can be `string` or {object}!
                    headers: {}
                })
                .then(res => res.json())
                .catch(error => console.error("Error:", error))
                .then(data => {
                    this.updateData(data.register);
                    this.props.loadData();
                    this.setState({ customer_invoice_id: "", modal: false });
                });
            }
        }
    }

    handleClickForm = () => {
        this.setState({ modal: !this.state.modal })
        this.clearValues()
    }

    edit = (invoice) => {
        this.setState({
            customer_invoice_id: invoice.id,
            modal: true,

            form: {
                ...this.state.form,
                invoice_date: invoice.invoice_date,
                invoice_value: invoice.invoice_value,
                number_invoice: invoice.number_invoice,
                delivery_certificate_file: invoice.delivery_certificate_file,
                reception_report_file: invoice.reception_report_file,
                engineering_value: invoice.engineering_value,
            },
        })
    }

    render() {
        return (
            <Modal isOpen={this.props.modal} toggle={this.props.toggle} className="modal-dialog-centered modal-lg" backdrop={this.props.backdrop}>
                <ModalHeader className="title-modal" toggle={this.props.toggle}><i className="app-menu__icon fa fa-user mr-2"></i> {"Facturas"}</ModalHeader>
                    <ModalBody>
                        {this.state.modal && (
                            <div className="col-md-12">
                                <div className="row">
                                    <div className="col-md-6">
                                        <label>Fecha de Factura</label>
                                        <input 
                                            type="date" 
                                            name="invoice_date"
                                            className='form form-control'
                                            value={this.state.form.invoice_date}
                                            onChange={this.handleChange}
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label>Valor</label>
                                        <input 
                                            type="number" 
                                            name="invoice_value"
                                            className='form form-control'
                                            value={this.state.form.invoice_value}
                                            onChange={this.handleChange}
                                        />
                                    </div>

                                    <div className="col-md-6 mt-3 mb-3">
                                        <label>Valor de ingeniería</label>
                                        <input 
                                            type="number" 
                                            name="engineering_value"
                                            className='form form-control'
                                            value={this.state.form.engineering_value}
                                            onChange={this.handleChange}
                                        />
                                    </div>

                                    <div className="col-md-6 mt-3 mb-3">
                                        <label>Numero de factura</label>
                                        <input 
                                            type="number" 
                                            name="number_invoice"
                                            className='form form-control'
                                            value={this.state.form.number_invoice}
                                            onChange={this.handleChange}
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label>Archivo de certificado de entrega</label>
                                        <input 
                                            type="file" 
                                            name="delivery_certificate_file"
                                            className='form form-control'
                                            onChange={this.handleChangeFile}
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label>Archivo de informe de recepción</label>
                                        <input 
                                            type="file" 
                                            name="reception_report_file"
                                            className='form form-control'
                                            onChange={this.handleChangeFile}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="col-md-12 mb-3 mt-3">
                            <div className="row">
                                <div className="col-md-8"></div>
                                <div className="col-md-4" style={{ textAlign: "right" }}>
                                    <button
                                        className={`btn btn-${this.state.modal ? "danger" : "secondary"} btn btn-${this.state.modal ? "danger" : "secondary"}`}
                                        onClick={this.handleClickForm}
                                        style={{ marginRight: this.state.modal ? 10 : 0 }}
                                    >
                                        {this.state.modal ? "Cerrar" : "Crear factura"}
                                    </button>

                                    {this.state.modal && (
                                        <button
                                            className={`btn btn-secondary btn btn-secondary`}
                                            onClick={this.HandleClick}
                                        >
                                            { this.state.customer_invoice_id ? "Actualizar" : "Crear factura"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className='content'>
                            <table className="table table-hover table-bordered" id="sampleTable">
                                <thead>
                                    <tr className="tr-title">
                                        <th style={{width: "10px"}}>Acciones</th>
                                        <th style={{width: "150px"}}>Fecha</th>
                                        <th style={{width: "150px"}}>Valor</th>
                                        <th style={{width: "150px"}}>Valor de ingeniería</th>
                                        <th style={{width: "25%"}}>Numero de factura</th>
                                        <th style={{width: "25%"}}>Certificado de entrega</th>
                                        <th style={{width: "25%"}}>Informe de recepción</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {this.state.data.length >= 1 ? (
                                        this.state.data.map(invoice => (
                                            <tr key={invoice.id}>
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
                                                                        onClick={() => this.edit(invoice)}
                                                                    >
                                                                        Editar
                                                                    </DropdownItem>
                                                                )}

                                                                {true && (
                                                                    <DropdownItem
                                                                        onClick={() => this.delete(invoice.id)}
                                                                        className="dropdown-item"
                                                                    >
                                                                        Eliminar
                                                                    </DropdownItem>
                                                                )}
                                                            </DropdownMenu>
                                                        </UncontrolledDropdown>
                                                    )}
                                                </td>
                                                
                                                <td>{invoice.invoice_date}</td>
                                                <th><NumberFormat value={invoice.invoice_value} displayType={'text'} thousandSeparator={true} prefix={'$'} /></th>
                                                <th><NumberFormat value={invoice.engineering_value} displayType={'text'} thousandSeparator={true} prefix={'$'} /></th>
                                                <th>{invoice.number_invoice}</th>

                                                <th>
                                                    {invoice.delivery_certificate_file.url ? (
                                                        <a data-toggle="tooltip" data-placement="bottom" title="" target="_blank" className="btn" href={invoice.delivery_certificate_file.url} data-original-title="Descargar Archivo" >
                                                            <i className="fas fa-download"></i>
                                                        </a>
                                                    ) : (
                                                        <i className="fas fa-times color-false"></i>
                                                    )}
                                                </th>

                                                <th>
                                                    {invoice.reception_report_file.url ? (
                                                        <a data-toggle="tooltip" data-placement="bottom" title="" target="_blank" className="btn" href={invoice.reception_report_file.url} data-original-title="Descargar Archivo" >
                                                            <i className="fas fa-download"></i>
                                                        </a>
                                                    ) : (
                                                        <i className="fas fa-times color-false"></i>
                                                    )}
                                                </th>
                                            </tr>
                                        ))
                                    ) : (
                                        <td colSpan="10" className="text-center">
                                            <div className="text-center mt-1 mb-1">
                                                <h4>Facturas</h4>
                                            </div>
                                        </td>
                                    )}
                                    
                                </tbody>
                            </table>
                        </div>
                    </ModalBody>

                <ModalFooter>
                    <label className="btn btn-light mt-2" onClick={() => this.props.toggle()}>Cerrar</label>
                </ModalFooter>
            </Modal>
        );
    }
}

export default IndexInvoice;