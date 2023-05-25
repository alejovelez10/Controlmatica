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
            material_invoice_id: "",
            data: [],
            form: {
                number: "",
                value: "",
                observation: "",
                material_id: this.props.material.id,
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
        fetch(`/get_material_invoice/${this.props.material.id}`, {
            method: 'GET', // or 'PUT'
            headers: {
                "X-CSRF-Token": this.token,
                "Content-Type": "application/json"
            }
        })
        .then(response => response.json())
        .then(data => {
            this.setState({
                data: data,
                isLoaded: false
            });
        });
    }

    clearValues = () => {
        this.setState({
            material_invoice_id: "",

            form: {
                ...this.state.form,
                number: "",
                value: "",
                observation: "",
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
                        number: register.number, 
                        value: register.value, 
                        observation: register.observation, 
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
                fetch(`/material_invoices/${id}`, {
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
        if (true) {
            if (this.state.material_invoice_id) {
                fetch(`/material_invoices/${this.state.material_invoice_id}`, {
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
                    this.props.loadData();
                    this.setState({ customer_invoice_id: "", modal: false });
                });
            } else {
                fetch(`/material_invoices`, {
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

    edit = (material_invoice) => {
        this.setState({
            material_invoice_id: material_invoice.id,
            modal: true,

            form: {
                ...this.state.form,
                number: material_invoice.number,
                value: material_invoice.value,
                observation: material_invoice.observation,
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
                                    <div className="col-md-4">
                                        <label>Numero de factura</label>
                                        <input 
                                            type="text" 
                                            name="number"
                                            className='form form-control'
                                            value={this.state.form.number}
                                            onChange={this.handleChange}
                                        />
                                    </div>

                                    <div className="col-md-4">
                                        <label>Valor</label>
                                        <NumberFormat 
                                            name="value"
                                            thousandSeparator={true} 
                                            onChange={this.handleChange}
                                            value={this.state.form.value}
                                            prefix={'$'} 
                                            className="form form-control" 
                                            placeholder="Valor"
                                        /> 
                                    </div>

                                    <div className="col-md-4">
                                        <label>Descripcion</label>
                                        <input 
                                            type="text" 
                                            name="observation"
                                            className='form form-control'
                                            value={this.state.form.observation}
                                            onChange={this.handleChange}
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
                                            { this.state.material_invoice_id ? "Actualizar" : "Crear factura"}
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
                                        <th style={{width: "150px"}}>Numero de factura</th>
                                        <th style={{width: "150px"}}>Valor</th>
                                        <th style={{width: "150px"}}>Descripcion</th>
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
                                                
                                                <td>{invoice.number}</td>
                                                <td><NumberFormat value={invoice.value} displayType={'text'} thousandSeparator={true} prefix={'$'} /></td>
                                                <td>{invoice.observation}</td>
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