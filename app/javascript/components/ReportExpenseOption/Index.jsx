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
                name: "",
                category: "",
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
            this.state.formCreate.category != "" 
        ) {
            this.setState({ ErrorValues: true })
            return true
        }else{
            this.setState({ ErrorValues: false })
            return false
        }
    }

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
                fetch(`/report_expense_options/${id}`, {
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
                name: "",
                category: "",
            },
        })
    }

    HandleClick = () => {
        if(this.validationForm()){
            if (!this.state.modeEdit)
                fetch(`/report_expense_options`, {
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
                fetch(`/report_expense_options/${this.state.id}`, {
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

    edit = (report_expense_option) => {
        this.setState({
            modeEdit: true,
            modal: true,
            id: report_expense_option.id,

            formCreate: {
                ...this.state.formCreate,
                name: report_expense_option.name,
                category: report_expense_option.category
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
                        title={this.state.modeEdit ? "Actualizar Gasto" : "Crear Gasto"}
                        nameBnt={this.state.modeEdit ? "Actualizar" : "Añadir"}

                        //form props
                        formValues={this.state.formCreate}
                        submitForm={this.HandleClick}
                        onChangeForm={this.HandleChange}
                        errorValues={this.state.ErrorValues}
                    />
                )}

                <div className="row">
                    <div className="col-md-12">
                        <div className="tile">

                            <div className="row">
                                <div className="col-md-8"></div>
                                <div className="col-md-4 text-right mb-3">

                                    {false && (
                                        <a 
                                            className="btn btn-secondary ml-3"
                                            href={`/indicators_expenses`}
                                            target="_blank"
                                        >
                                            Informes de gastos
                                        </a>   
                                    )} 

                                    {false && (
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
                                
                                <table className="table table-hover table-bordered" id="sampleTable" >
                                <thead>
                                        <tr >
                                            <th>Nombre</th>
                                            <th>Tipo</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {this.props.data.length >= 1 ? (
                                            this.props.data.map(accion => (
                                                <tr key={accion.id}>

                                                    <td>{accion.name}</td>
                                                    <td>{accion.category}</td>

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

            </React.Fragment>
        );
    }
}

export default Index;
