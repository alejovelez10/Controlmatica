import React, { Component } from 'react';
import FormCreate from './FormCreate'
import SweetAlert from "sweetalert2-react";
import Swal from "sweetalert2/dist/sweetalert2.js";
import { Modal, ModalHeader, ModalBody, ModalFooter, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import NumberFormat from 'react-number-format';

class Index extends Component {
    constructor(props) {
        super(props)
        this.token = document.querySelector("[name='csrf-token']").content;
        this.state = {
            data: [],
            modal: false,
            modeEdit: false,
            showTable: false,
            ErrorValues: true,
            quotation_id: "",

            form: {
                cost_center_id: this.props.cost_center_id, 
                description: "", 
                quotation_number: "", 
                eng_hours: "", 
                hour_real: 50000, 
                hour_cotizada: 80000, 
                hours_contractor: "", 
                hours_contractor_real: 50000, 
                hours_contractor_invoices: "", 
                displacement_hours: "", 
                value_displacement_hours: 50000, 
                materials_value: "", 
                viatic_value: "", 
                quotation_value: ""
            },
        }
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
    updateItem = quotation => {
        this.setState({
            data: this.state.data.map(item => {
                if (quotation.id === item.id) {
                    return {
                        ...item,
                        description: quotation.description, 
                        quotation_number: quotation.quotation_number, 
                        eng_hours: quotation.eng_hours, 
                        hour_real: quotation.hour_real, 
                        hour_cotizada: quotation.hour_cotizada, 
                        hours_contractor: quotation.hours_contractor, 
                        hours_contractor_real: quotation.hours_contractor_real, 
                        hours_contractor_invoices: quotation.hours_contractor_invoices, 
                        displacement_hours: quotation.displacement_hours, 
                        value_displacement_hours: quotation.value_displacement_hours, 
                        materials_value: quotation.materials_value, 
                        viatic_value: quotation.viatic_value, 
                        quotation_value: quotation.quotation_value
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
                description: "", 
                quotation_number: "", 
                eng_hours: "", 
                hour_real: 50000, 
                hour_cotizada: 80000, 
                hours_contractor: "", 
                hours_contractor_real: 50000, 
                hours_contractor_invoices: "", 
                displacement_hours: "", 
                value_displacement_hours: 50000, 
                materials_value: "", 
                viatic_value: "", 
                quotation_value: ""
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
                fetch(`/quotations/${id}`, {
                    method: "delete",
                    headers: {
                        "X-CSRF-Token": this.token,
                        "Content-Type": "application/json"
                    }
                })
                    .then(response => response.json())
                    .then(response => {
                        this.loadData()
                        this.messageSuccess(response)
                    });
            }
        });
    };

    componentDidMount = () => {
        this.loadData();
    }

    loadData = () => {
        fetch(`/get_quotations/${this.props.cost_center_id}`, {
            method: 'GET', // or 'PUT'
            headers: {
                "X-CSRF-Token": this.token,
                "Content-Type": "application/json"
            }
        })
        .then(response => response.json())
        .then(data => {
            this.setState({
                data: data.data,
                isLoaded: false
            });
        });
    }

    validationForm = () => {
        if (this.state.form.format_select_id != "" &&
            this.state.form.question_asociation_id != ""
        ) {
            this.setState({ ErrorValues: true })
            return true
        } else {
            this.setState({ ErrorValues: false })
            return false
        }
    }

    HandleClick = () => {
        if (this.validationForm()) {
            if (this.state.modeEdit) {
                fetch(`/quotations/${this.state.quotation_id}`, {
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
                        this.updateItem(data.register)
                        this.clearValues();
                        this.setState({ modal: false })
                    });
            } else {
                fetch(`/quotations`, {
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
                        this.updateData(data.register)
                        this.clearValues();
                        this.setState({ modal: false, showTable: true })
                    });
            }
        }
    }


    edit = (quotation) => {
        this.setState({
            modal: true,
            modeEdit: true,
            quotation_id: quotation.id,

            form: {
                ...this.state.form,
                description: quotation.description, 
                quotation_number: quotation.quotation_number, 
                eng_hours: quotation.eng_hours, 
                hour_real: quotation.hour_real, 
                hour_cotizada: quotation.hour_cotizada, 
                hours_contractor: quotation.hours_contractor, 
                hours_contractor_real: quotation.hours_contractor_real, 
                hours_contractor_invoices: quotation.hours_contractor_invoices, 
                displacement_hours: quotation.displacement_hours, 
                value_displacement_hours: quotation.value_displacement_hours, 
                materials_value: quotation.materials_value, 
                viatic_value: quotation.viatic_value, 
                quotation_value: quotation.quotation_value
            },
        })
    }

    HandleChangeMoney = (e) => {
        const value = e.target.value.replaceAll("$", '').replaceAll(",", '')

        this.setState({
            form: {
                ...this.state.form,
                [e.target.name]: value,
            }
        })
    }

    render() {
        return (
            <React.Fragment>
                        {this.state.modal && (
                            <FormCreate
                                backdrop={"static"}
                                modal={this.state.modal}
                                toggle={this.toogle}
                                title={this.state.modeEdit ? "Actualizar cotizacion" : "Crear cotizacion"}
                                nameBnt={this.state.modeEdit ? "Actualizar" : "Crear"}

                                //form props
                                formValues={this.state.form}
                                onChangeForm={this.HandleChange}
                                handleChangeMoney={this.HandleChangeMoney}
                                submitForm={this.HandleClick}
                                errorValues={this.state.ErrorValues}
                            />
                        )}

                        <div className="col-md-12 mb-3 text-right pr-0">
                            {!this.state.modal && (
                                <button
                                    className="btn-shadow btn btn-secondary"
                                    onClick={() => this.toogle("new")}
                                >
                                    Abrir formulario
                                </button>
                            )}
                        </div>


                                    <table className="table table-hover table-bordered" id="sampleTable">
                                        <thead style={{ color: "gray" }}>
                                            <tr className="tr-title">
                                                <th className="text-right" style={{ width: "2%" }}>Acciones</th>
                                                <th>Descripción</th>
                                                <th >Número de cotización</th>
                                                <th>Hora Ingeniería</th>
                                                <th>Valor hora costo</th>
                                                <th>Total Ingenería costo</th>
                                                <th>Valor hora cotiazada</th>
                                                <th>Total Ingenería cotizada</th>
                                                <th>Hora Tablerista</th>
                                                <th>Valor hora costo Tablerista</th>
                                                <th>Total Tablerista costo</th>
                                                <th>Valor hora cotizada Tablerista</th>
                                                <th>Total Tablerista cotizado</th>
                                                <th >Horas de desplazamiento</th>
                                                <th >Valor hora de desplazamiento</th>
                                                <th>Total desplazamiento</th>
                                                <th>Valor materiales</th>
                                                <th>Valor Viaticos</th>
                                                <th>Total Cotizacion</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {this.state.data.length >= 1 ? (
                                                this.state.data.map((quotation, index) => (
                                                    <React.Fragment>
                                                        <tr key={quotation.id}>
                                                            <td className="text-right">
                                                                {true && (
                                                                    <UncontrolledDropdown className='btn-group'>
                                                                        <DropdownToggle className='btn-shadow btn btn-info'>
                                                                            <i className="fas fa-bars"></i>
                                                                        </DropdownToggle>
                                                                        <DropdownMenu className="dropdown-menu dropdown-menu-right">
                                                                            {true && (
                                                                                <DropdownItem
                                                                                    className="dropdown-item"
                                                                                    onClick={() => this.edit(quotation)}
                                                                                >
                                                                                    Editar
                                                                                </DropdownItem>
                                                                            )}
                                                                            {true && (
                                                                                <DropdownItem
                                                                                    onClick={() => this.delete(quotation.id)}
                                                                                    className="dropdown-item"
                                                                                >
                                                                                    Eliminar
                                                                                </DropdownItem>
                                                                            )}
                                                                        </DropdownMenu>
                                                                    </UncontrolledDropdown>
                                                                )}
                                                            </td>

                                                            <td>{quotation.description}</td>
                                                            <td>{quotation.quotation_number}</td>
                                                            <td>{quotation.eng_hours}</td>
                                                            <td><NumberFormat value={quotation.hour_real} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                                                            <td><NumberFormat value={quotation.ingenieria_total_costo} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                                                            <td><NumberFormat value={quotation.hour_cotizada} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                                                            <td><NumberFormat value={quotation.engineering_value} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                                                            <td>{quotation.hours_contractor}</td>
                                                            <td><NumberFormat value={quotation.hours_contractor_real} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                                                            <td><NumberFormat value={quotation.contractor_total_costo} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                                                            <td><NumberFormat value={quotation.hours_contractor_invoices} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                                                            <td><NumberFormat value={quotation.work_force_contractor} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                                                            <td>{quotation.displacement_hours}</td>
                                                            <td><NumberFormat value={quotation.value_displacement_hours} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                                                            <td><NumberFormat value={quotation.offset_value} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                                                            <td><NumberFormat value={quotation.materials_value} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                                                            <td><NumberFormat value={quotation.viatic_value} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                                                            <td><NumberFormat value={quotation.quotation_value} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                                                        </tr>
                                                    </React.Fragment>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="11" className="text-center">
                                                        <div className="text-center mt-4 mb-4">
                                                            <h4>No hay registros</h4>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
            </React.Fragment>
        );
    }
}

export default Index;