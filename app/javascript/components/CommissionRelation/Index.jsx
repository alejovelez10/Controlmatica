import React, { Component } from 'react';
import FormCreate from './FormCreate'
import SweetAlert from "sweetalert2-react";
import Swal from "sweetalert2/dist/sweetalert2.js";
import NumberFormat from 'react-number-format';
import Pagination from "react-js-pagination";

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
                label: "Nombre director"
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
        if (this.state.formCreate.creation_date != "" &&  
            this.state.formCreate.user_report_id != "" &&  
            this.state.formCreate.start_date != "" &&  
            this.state.formCreate.end_date != "" &&  
            this.state.formCreate.area != "" &&  
            this.state.formCreate.observations != "" &&  
            this.state.formCreate.user_direction_id != ""
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
                fetch(`/commission_relations/${id}`, {
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
                label: "Nombre director"
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
                fetch(`/commission_relations`, {
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
                    this.props.loadData();
                    this.clearValues();
                });
            else {
                fetch(`/commission_relations/${this.state.id}`, {
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
                    this.props.loadData();
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

    handlePageChangeMoney = (e) => {
    console.log("hola como esta")
        const value = e.target.value.replace("$", '').replace(",", '').replace(",", '').replace(",", '').replace(",", '')

        this.setState({
            formCreate: {
                ...this.state.formCreate,
                [e.target.name]: value
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

    getDate = (date) => {
        var d = new Date(date),
        months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'junio', 'julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const hoursAndMinutes = d.getHours() + ':' + d.getMinutes();

        var time = hoursAndMinutes; // your input
        
        time = time.split(':'); // convert to array
    
        // fetch
        var hours = Number(time[0]);
        var minutes = Number(time[1]);
        var seconds = Number(time[2]);
    
        // calculate
        var timeValue = hours;
    
        /*  if (hours > 0 && hours <= 12) {
           timeValue= "" + hours;
         } else if (hours > 12) {
           timeValue= "" + (hours - 12);
         } else if (hours == 0) {
           timeValue= "12";
         } */
        
        timeValue += (minutes < 10) ? ":0" + minutes : ":" + minutes;  // get minutes
        //timeValue += (hours >= 12) ? " PM" : " AM";  // get AM/PM
        
        return months[d.getMonth()] + " " + d.getDate() + " " + 'del' + " " + d.getFullYear() + " / " + timeValue
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
                        handlePageChangeMoney={this.handlePageChangeMoney}
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

                                    {true && (
                                        <button 
                                            className="btn btn-primary ml-3"
                                            onClick={() => this.props.filter(true)}
                                        >
                                            Filtros
                                        </button> 
                                    )}  

                                    
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
                                <div className="content-table"> {/* content-table */}
                                    <table className="table table-hover table-bordered" style={{ width: "1800px", maxWidth: "1800px", minWidth: "100%" }} id="sampleTable" > {/*  table-width */}
                                        <thead>
                                            <tr>
                                                {(this.props.estados.delete || this.props.estados.edit) && (
                                                    <th className="text-left">Acciones</th>
                                                )}

                                                {this.props.estados.pdf && (
                                                    <th className="text-left">Pdf</th>
                                                )}
                                                <th style={{width:"200px"}}>Nombre del director</th>
                                                <th style={{width:"200px"}}>Nombre del empleado</th>
                                                <th style={{width:"200px"}}>Area</th>
                                                <th style={{width:"200px"}}>Fecha de creación</th>
                                                <th style={{width:"200px"}}>Fecha inicial</th>
                                                <th style={{width:"200px"}}>Fecha final</th>
                                                <th style={{width:"250px"}}>Observaciones</th>
                                                <th style={{width:"200px"}}>Creación</th>
                                                <th style={{width:"200px"}}>Ultima actualización</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {this.props.data.length >= 1 ? (
                                                this.props.data.map(expense_ratio => (
                                                    <tr key={expense_ratio.id}>
                                                        {(this.props.estados.delete || this.props.estados.edit) && (
                                                            <td className="text-right" style={{ width: "10px"}}>          
                                                                <div className="btn-group" role="group" aria-label="Button group with nested dropdown">
                                                                    <div className="btn-group" role="group">
                                                                        <button className="btn btn-secondary" id="btnGroupDrop1" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                                                            <i className="fas fa-bars"></i>
                                                                        </button>
                                                                        
                                                                        <div className="dropdown-menu dropdown-menu-right">

                                                                            {this.props.estados.edit && (
                                                                                <button onClick={() => this.edit(expense_ratio)} className="dropdown-item">
                                                                                    Editar
                                                                                </button>
                                                                            )}

                                                                            {this.props.estados.delete && (
                                                                                <button onClick={() => this.delete(expense_ratio.id)} className="dropdown-item">
                                                                                    Eliminar
                                                                                </button>
                                                                            )}

                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        )}

                                                        {this.props.estados.pdf && (
                                                            <td>
                                                                <a href={`/commission_relations_pdf/${expense_ratio.id}.pdf`} target="_blank" className="btn">
                                                                    <i className="fas fa-file-pdf"></i>
                                                                </a>
                                                            </td>
                                                        )}
                                                        
                                                        <td>{expense_ratio.user_direction.names}</td>
                                                        <td>{expense_ratio.user_report.names}</td>
                                                        <td>{expense_ratio.area}</td>
                                                        <td>{expense_ratio.creation_date}</td>
                                                        <td>{expense_ratio.start_date}</td>
                                                        <td>{expense_ratio.end_date}</td>
                                                        <td>{expense_ratio.observations}</td>
                                                        <th>
                                                            {this.getDate(expense_ratio.created_at)} <br />
                                                            {expense_ratio.user != undefined ? <React.Fragment> <b></b> {expense_ratio.user != undefined ? expense_ratio.user.names : ""} </React.Fragment> : null}
                                                        </th>

                                                        <th>
                                                            {this.getDate(expense_ratio.updated_at)} <br />
                                                            {expense_ratio.last_user_edited != undefined ? <React.Fragment> <b> </b> {expense_ratio.last_user_edited != undefined ? expense_ratio.last_user_edited.names : ""} </React.Fragment> : null }
                                                        </th>
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

                                <div className="col-md-12" style={{ marginTop: "50px" }}>
                                    <div className="row">

                                        <div className="col-md-7 text-left pl-0">
                                            <p>
                                                Mostrando {this.props.data.length} de {this.props.total}
                                            </p>
                                        </div>

                                        <div className="col-md-5 p-0 text-right">
                                            <Pagination
                                                hideNavigation
                                                activePage={this.props.activePage}
                                                itemsCountPerPage={this.props.countPage}
                                                itemClass="page-item"
                                                innerClass="pagination"
                                                linkClass="page-link"
                                                totalItemsCount={this.props.total}
                                                pageRangeDisplayed={this.props.countPage}
                                                onChange={this.props.handlePageChange}
                                            />
                                        </div>

                                    </div>
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
