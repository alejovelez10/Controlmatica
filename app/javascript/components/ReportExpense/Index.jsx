import React, { Component } from 'react';
import FormCreate from './FormCreate'
import SweetAlert from "sweetalert2-react";
import Swal from "sweetalert2/dist/sweetalert2.js";

class Index extends Component {
    constructor(props) {
        super(props);
        this.token = document.querySelector("[name='csrf-token']").content;

        this.state = {
            modal: false,
            modeEdit: false,
            ErrorValues:  true,
            id: "",

            formCreate: {
                cost_center_id: "",
                user_invoice_id: "",
                invoice_name: "",
                invoice_date: "",
                type_identification: "",
                description: "",
                invoice_number: "",
                invoice_type: "",
                payment_type: "",
                invoice_value: "",
                invoice_tax: "",
                invoice_total: "",
            },

            selectedOptionCostCenter: {
                cost_center_id: "",
                label: "Centro de costo"
            },

            selectedOptionUser: {
                user_invoice_id: "",
                label: "Usuario"
            },
        }
    }

    HandleChangeMoney = (e) => {
        const value = e.target.value.replace("$", '').replace(",", '').replace(",", '').replace(",", '').replace(",", '')

        this.setState({
            formCreate: {
                ...this.state.formCreate,
                [e.target.name]: value,
            }
        },() => {
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

    validationForm = () => {
        if (this.state.formCreate.name != "" &&  
            this.state.formCreate.year != "" 
        ) {
            this.setState({ ErrorValues: true })
            return true
        }else{
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
                user_invoice_id: "",
                invoice_name: "",
                invoice_date: "",
                type_identification: "",
                description: "",
                invoice_number: "",
                invoice_type: "",
                payment_type: "",
                invoice_value: "",
                invoice_tax: "",
                invoice_total: "",
            },

            selectedOptionCostCenter: {
                cost_center_id: "",
                label: "Centro de costo"
            },

            selectedOptionUser: {
                user_invoice_id: "",
                label: "Usuario"
            },
        })
    }

    HandleClick = () => {
        if(this.validationForm()){
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
                    this.props.updateData(data.register);
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
                type_identification: report_expense.type_identification,
                description: report_expense.description,
                invoice_number: report_expense.invoice_number,
                invoice_type: report_expense.invoice_type,
                payment_type: report_expense.payment_type,
                invoice_value: report_expense.invoice_value,
                invoice_tax: report_expense.invoice_tax,
                invoice_total: report_expense.invoice_total,
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

    render() {
        return (
            <React.Fragment>

                {this.state.modal && (
                    <FormCreate
                        //modal props
                        backdrop={"static"}
                        modal={this.state.modal}
                        toggle={this.toogle}
                        title={this.state.modeEdit ? "Actualizar control de gasto" : "Crear control de gasto"}
                        nameBnt={this.state.modeEdit ? "Actualizar" : "Añadir"}

                        //form props
                        formValues={this.state.formCreate}
                        submitForm={this.HandleClick}
                        onChangeForm={this.HandleChange}
                        onChangeFormMoney={this.HandleChangeMoney}
                        errorValues={this.state.ErrorValues}

                        //select values

                        handleChangeAutocompleteCostCenter={this.handleChangeAutocompleteCostCenter}
                        selectedOptionCostCenter={this.state.selectedOptionCostCenter}
                        cost_centers={this.props.cost_centers}

                        handleChangeAutocompleteUser={this.handleChangeAutocompleteUser}
                        selectedOptionUser={this.state.selectedOptionUser}
                        users={this.props.users}
                    />
                )}

                <div className="row">
                    <div className="col-md-12">
                        <div className="tile">

                            <div className="row">
                                <div className="col-md-7"></div>
                                <div className="col-md-5 text-right mb-3">

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

                            <div className="tile-body">
                                <div className="content-table">
                                <table className="table table-hover table-bordered table-width" id="sampleTable" >
                                    <thead>
                                        <tr>
                                            {(this.props.estados.delete || this.props.estados.edit) && (
                                                <th className="text-center">Acciones</th>
                                            )}
                                            <th>Centro de costo</th>
                                            <th>Usuario</th>
                                            <th>Nombre factura</th>
                                            <th>Fecha de factura</th>
                                            <th>NIT / CEDULA</th>
                                            <th>Descripcion</th>
                                            <th>Numero de factura</th>
                                            <th>Tipo de factura</th>
                                            <th>Tipo de pago</th>
                                            <th>Valor del pago</th>
                                            <th>Impuesto a la factura</th>
                                            <th>Total</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {this.props.data.length >= 1 ? (
                                            this.props.data.map(accion => (
                                                <tr key={accion.id}>
                                                    {(this.props.estados.delete || this.props.estados.edit) && (
                                                        <td className="text-right" style={{ width: "10px"}}>          
                                                            <div className="btn-group" role="group" aria-label="Button group with nested dropdown">
                                                                <div className="btn-group" role="group">
                                                                    <button className="btn btn-secondary" id="btnGroupDrop1" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                                                        <i className="fas fa-bars"></i>
                                                                    </button>
                                                                    
                                                                    <div className="dropdown-menu dropdown-menu-right">

                                                                        {this.props.estados.edit && (
                                                                            <button onClick={() => this.edit(accion)} className="dropdown-item">
                                                                                Editar
                                                                            </button>
                                                                        )}

                                                                        {this.props.estados.delete && (
                                                                            <button onClick={() => this.delete(accion.id)} className="dropdown-item">
                                                                                Eliminar
                                                                            </button>
                                                                        )}

                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    )}

                                                    <td>{accion.cost_center.code}</td>
                                                    <td>{accion.user_invoice.name}</td>
                                                    <td>{accion.invoice_name}</td>
                                                    <td>{accion.invoice_date}</td>
                                                    <td>{accion.type_identification}</td>
                                                    <td>{accion.description}</td>
                                                    <td>{accion.invoice_number}</td>
                                                    <td>{accion.invoice_type}</td>
                                                    <td>{accion.payment_type}</td>
                                                    <td>{accion.invoice_value}</td>
                                                    <td>{accion.invoice_tax}</td>
                                                    <td>{accion.invoice_total}</td>
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
                            </div>
                        </div>
                    </div>
                </div>

            </React.Fragment>
        );
    }
}

export default Index;
