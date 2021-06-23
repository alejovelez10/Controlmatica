import React, { Component } from 'react';
import FormCreate from './FormCreate'
import SweetAlert from "sweetalert2-react";
import Swal from "sweetalert2/dist/sweetalert2.js";
import NumberFormat from 'react-number-format';

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
                creation_date: "", 
                user_report_id: "",
                start_date: "", 
                end_date: "", 
                area: "", 
                observations: "", 
                user_direction_id: "",
            },

            selectedOptionUserDirection: {
                user_direction_id: "",
                label: "Nombre del director"
            },

            selectedOptionUserReport: {
                user_report_id: "",
                label: "Nombre del empleado"
            },
        }
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

    handleChangeAutocompleteUserDirection = selectedOptionUserDirection => {
        this.setState({
            selectedOptionUserDirection,
                formCreate: {
                    ...this.state.formCreate,
                    user_direction_id: selectedOptionUserDirection.value
                }
        });
    };

    handleChangeAutocompleteUserReport = selectedOptionUserReport => {
        this.setState({
            selectedOptionUserReport,
                formCreate: {
                    ...this.state.formCreate,
                    user_report_id: selectedOptionUserReport.value
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
                fetch(`/expense_ratios/${id}`, {
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
                creation_date: "", 
                user_report_id: "",
                start_date: "", 
                end_date: "", 
                area: "", 
                observations: "", 
                user_direction_id: "",
            },

            selectedOptionUserDirection: {
                user_direction_id: "",
                label: "Nombre del director"
            },

            selectedOptionUserReport: {
                user_report_id: "",
                label: "Nombre del empleado"
            },
        })
    }

    HandleClick = () => {
        if(this.validationForm()){
            if (!this.state.modeEdit)
                fetch(`/expense_ratios`, {
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
                fetch(`/expense_ratios/${this.state.id}`, {
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

    edit = (expense_ratio) => {
        this.setState({
            modeEdit: true,
            modal: true,
            id: expense_ratio.id,

            formCreate: {
                ...this.state.formCreate,
                creation_date: expense_ratio.creation_date, 
                user_report_id: expense_ratio.user_report_id,
                start_date: expense_ratio.start_date, 
                end_date: expense_ratio.end_date, 
                area: expense_ratio.area, 
                observations: expense_ratio.observations, 
                user_direction_id: expense_ratio.user_direction_id,
            },

            selectedOptionUserDirection: {
                cost_center_id: `${expense_ratio.user_direction != null ? expense_ratio.user_direction.id : ""}`,
                label: `${expense_ratio.user_direction != null ? expense_ratio.user_direction.names : "Nombre del director"}`
            },

            selectedOptionUserReport: {
                user_invoice_id: `${expense_ratio.user_report != null ? expense_ratio.user_report.id : ""}`,
                label: `${expense_ratio.user_report != null ? expense_ratio.user_report.names : "Nombre del empleado"}`
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
                        title={this.state.modeEdit ? "Actualizar relación de gasto" : "Crear relación de gasto"}
                        nameBnt={this.state.modeEdit ? "Actualizar" : "Añadir"}

                        //form props
                        formValues={this.state.formCreate}
                        submitForm={this.HandleClick}
                        onChangeForm={this.HandleChange}
                        errorValues={this.state.ErrorValues}

                        //select values

                        handleChangeAutocompleteUserDirection={this.handleChangeAutocompleteUserDirection}
                        selectedOptionUserDirection={this.state.selectedOptionUserDirection}

                        handleChangeAutocompleteUserReport={this.handleChangeAutocompleteUserReport}
                        selectedOptionUserReport={this.state.selectedOptionUserReport}
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
                                        <button 
                                            className="btn btn-primary ml-3"
                                            onClick={() => this.props.filter(true)}
                                        >
                                            Filtros
                                        </button> 
                                    )}  

                                    
                                    {true && (
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
                                <div className=""> {/* content-table */}
                                <table className="table table-hover table-bordered" id="sampleTable" > {/*  table-width */}
                                    <thead>
                                        <tr>
                                            <th className="text-left">Acciones</th>
                                            <th className="text-left">Pdf</th>
                                            <th>Nombre del director</th>
                                            <th>Nombre del empleado</th>
                                            <th>Area</th>
                                            <th>Fecha de creación</th>
                                            <th>Fecha inicial</th>
                                            <th>Fecha final</th>
                                            <th>Observaciones</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {this.props.data.length >= 1 ? (
                                            this.props.data.map(expense_ratio => (
                                                <tr key={expense_ratio.id}>
                                                    {(true || true) && (
                                                        <td className="text-right" style={{ width: "10px"}}>          
                                                            <div className="btn-group" role="group" aria-label="Button group with nested dropdown">
                                                                <div className="btn-group" role="group">
                                                                    <button className="btn btn-secondary" id="btnGroupDrop1" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                                                        <i className="fas fa-bars"></i>
                                                                    </button>
                                                                    
                                                                    <div className="dropdown-menu dropdown-menu-right">

                                                                        {true && (
                                                                            <button onClick={() => this.edit(expense_ratio)} className="dropdown-item">
                                                                                Editar
                                                                            </button>
                                                                        )}

                                                                        {true && (
                                                                            <button onClick={() => this.delete(expense_ratio.id)} className="dropdown-item">
                                                                                Eliminar
                                                                            </button>
                                                                        )}

                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    )}

                                                    <td>
                                                        <a href={`/expense_ratio_pdf/${expense_ratio.id}.pdf`} target="_blank" className="btn">
                                                            <i className="fas fa-file-pdf"></i>
                                                        </a>
                                                    </td>
                                                    <td>{expense_ratio.user_direction.names}</td>
                                                    <td>{expense_ratio.user_report.names}</td>
                                                    <td>{expense_ratio.area}</td>
                                                    <td>{expense_ratio.creation_date}</td>
                                                    <td>{expense_ratio.start_date}</td>
                                                    <td>{expense_ratio.end_date}</td>
                                                    <td>{expense_ratio.observations}</td>
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
