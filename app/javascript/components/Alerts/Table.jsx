import React, { Component } from 'react';
import SweetAlert from "sweetalert2-react";
import Swal from "sweetalert2";
import FormCreate from './FormCreate'

class Table extends Component {
    constructor(props) {
        super(props)
        this.token = document.querySelector("[name='csrf-token']").content;
        this.state = {
            modal: false,
            ErrorValues: true,
            modeEdit: false,
            id: "",

            form: {
                name: "",
                ing_ejecucion_min: "",
                ing_ejecucion_med: "",
                ing_ejecucion_max: "",
                ing_costo_min: "",
                ing_costo_med: "",
                ing_costo_max: "",
                tab_ejecucion_min: "",
                tab_ejecucion_med: "",
                tab_ejecucion_max: "",
                tab_costo_min: "",
                tab_costo_med: "",
                tab_costo_max: "",
                desp_min: "",
                desp_med: "",
                desp_max: "",
                mat_min: "",
                mat_med: "",
                mat_max: "",
                via_min: "",
                via_med: "",
                via_max: "",
                total_min: "",
                total_med: "",
                tatal_max: "",
                
                //configuration hours for month
                alert_min: 100,
                color_min: "#d26666",
                alert_med: 150,
                color_mid: "#d4b21e",
                alert_max: 151,
                color_max: "#24bc6b",

                //configuration 

                alert_hour_min:  100,
                alert_hour_med:  100,
                alert_hour_max:  100,
                color_hour_min:  "#d26666",
                color_hour_med:  "#d4b21e",
                color_hour_max:  "#24bc6b",
                commision_porcentaje: "",
            },

        }
    }

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
            id: "",
            form: {
                name: "",
                ing_ejecucion_min: "",
                ing_ejecucion_med: "",
                ing_ejecucion_max: "",
                ing_costo_min: "",
                ing_costo_med: "",
                ing_costo_max: "",
                tab_ejecucion_min: "",
                tab_ejecucion_med: "",
                tab_ejecucion_max: "",
                tab_costo_min: "",
                tab_costo_med: "",
                tab_costo_max: "",
                desp_min: "",
                desp_med: "",
                desp_max: "",
                mat_min: "",
                mat_med: "",
                mat_max: "",
                via_min: "",
                via_med: "",
                via_max: "",
                total_min: "",
                total_med: "",
                tatal_max: "",

                //configuration hours for month
                alert_min: 100,
                color_min: "#d26666",
                alert_med: 150,
                color_mid: "#d4b21e",
                alert_max: 151,
                color_max: "#24bc6b",

                //configuration 

                alert_hour_min:  100,
                alert_hour_med:  100,
                alert_hour_max:  100,
                color_hour_min:  "#d26666",
                color_hour_med:  "#d4b21e",
                color_hour_max:  "#24bc6b",
                commision_porcentaje: "",
            }
        })
    }

    edit = (alert) => {
        this.setState({
            modeEdit: true,
            modal: true,
            id: alert.id,
            form: {
                name: alert.name,
                ing_ejecucion_min: alert.ing_ejecucion_min,
                ing_ejecucion_med: alert.ing_ejecucion_med,
                ing_ejecucion_max: alert.ing_ejecucion_max,
                ing_costo_min: alert.ing_costo_min,
                ing_costo_med: alert.ing_costo_med,
                ing_costo_max: alert.ing_costo_max,
                tab_ejecucion_min: alert.tab_ejecucion_min,
                tab_ejecucion_med: alert.tab_ejecucion_med,
                tab_ejecucion_max: alert.tab_ejecucion_max,
                tab_costo_min: alert.tab_costo_min,
                tab_costo_med: alert.tab_costo_med,
                tab_costo_max: alert.tab_costo_max,
                desp_min: alert.desp_min,
                desp_med: alert.desp_med,
                desp_max: alert.desp_max,
                mat_min: alert.mat_min,
                mat_med: alert.mat_med,
                mat_max: alert.mat_max,
                via_min: alert.via_min,
                via_med: alert.via_med,
                via_max: alert.via_max,
                total_min: alert.total_min,
                total_med: alert.total_med,
                tatal_max: alert.tatal_max,

                //configuration hours for month
                alert_min: alert.alert_min,
                color_min: alert.color_min,
                alert_med: alert.alert_med,
                color_mid: alert.color_mid,
                alert_max: alert.alert_max,
                color_max: alert.color_max,

                //configuration 

                alert_hour_min: alert.alert_hour_min,
                alert_hour_med: alert.alert_hour_med,
                alert_hour_max: alert.alert_hour_max,
                color_hour_min: alert.color_hour_min,
                color_hour_med: alert.color_hour_med,
                color_hour_max: alert.color_hour_max,
                commision_porcentaje: alert.commision_porcentaje,
            }
        })
    }

    validationForm = () => {
        if (this.state.form.name != "") {
            console.log("los campos estan llenos")
            this.setState({ ErrorValues: true })
            return true
        } else {
            console.log("los campos no se han llenado")
            this.setState({ ErrorValues: false })
            return false
        }
    }

    HandleChange = (e) => {
        this.setState({
            form: {
                ...this.state.form,
                [e.target.name]: e.target.value
            }
        });
    }

    toogle = (from) => {
        if (from == "new") {
            this.setState({ modal: true })
            this.clearValues();
        } else {
            this.setState({ modal: false })
        }
    }

    HandleClick = () => {
        if (this.validationForm() == true && this.state.modeEdit == true) {
            fetch(`/alerts/${this.state.id}`, {
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
                this.clearValues();
                this.props.loadData();
                this.setState({ modal: false})
                this.messageSuccess(data);
            });
        }else{
            fetch("/alerts", {
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
                this.clearValues();
                this.props.loadData();
                this.setState({ modal: false})
                this.messageSuccess(data);
            });
        }
    }


    delete = id => {
        Swal.fire({
            title: "Estas seguro?",
            text: "El registro sera eliminado para siempre!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#009688",
            cancelButtonColor: "#d33",
            confirmButtonText: "Si"
        }).then(result => {
            if (result.value) {
                fetch(`/alerts/${id}`, {
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

    
    render() {
        return (
            <React.Fragment>

                {this.state.modal && (
                    <FormCreate
                        //modal props
                        backdrop={"static"}
                        modal={this.state.modal}
                        toggle={this.toogle}
                        title={this.state.modeEdit ? "Actualizar alerta" : "Agregar nueva alerta"}
                        nameSubmit={this.state.modeEdit ? "Actualizar" : "Crear"}

                        //form props
                        formValues={this.state.form}
                        errorValues={this.state.ErrorValues}
                        onChangeForm={this.HandleChange}
                        submitForm={this.HandleClick}
                    />
                )}

                {!this.props.isLoaded ? (
                    <div className="content main-card mb-3 card">
                        <div className="col-md-12 mt-4">
                            <div className="row">
                                <div className="col-md-8 text-left">
                                    
                                </div>

                                <div className="col-md-4 text-right">      
                                    {true && (
                                        <button  onClick={() => this.toogle("new")} className="btn btn-secondary">Nueva alerta</button>
                                    )}
                                </div>

                            </div>
                        </div>

                        <div className="card-body">
                            <table className="table table-hover table-bordered" id="sampleTable">
                                <thead>
                                    <tr className="tr-title">
                                        <th>Nombre</th>
                                        {(true) && (
                                            <th className="text-center"></th>
                                        )}
                                    </tr>
                                </thead>

                                <tbody>
                                    {this.props.data.length >= 1 ? (
                                        this.props.data.map(alert => (
                                            <tr key={alert.id}>
                                                <td>{alert.name}</td>

                                                {(true || true) && (
                                                    <td className="text-right" style={{ width: "10px" }}>
                                                                <div className="btn-group" role="group" aria-label="Button group with nested dropdown">
                                                                    <div className="btn-group" role="group">
                                                                        <button
                                                                            className="btn btn-secondary"
                                                                            id="btnGroupDrop1"
                                                                            type="button"
                                                                            data-toggle="dropdown"
                                                                            aria-haspopup="true"
                                                                            aria-expanded="false"
                                                                        >
                                                                            <i className="fas fa-bars"></i>
                                                                        </button>

                                                                        <div className="dropdown-menu dropdown-menu-right">
                                                                            {true && (
                                                                                <button
                                                                                    onClick={() => this.edit(alert)}
                                                                                    className="dropdown-item"
                                                                                >
                                                                                    Editar
                                                                                </button>
                                                                            )}

                                                                            {true && (
                                                                                <button
                                                                                    onClick={() => this.delete(alert.id)}
                                                                                    className="dropdown-item"
                                                                                >
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
                                            <tr>
                                                <td colSpan="8" className="text-center">
                                                    <div className="text-center mt-4 mb-4">
                                                        <h4>No hay registros</h4>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="content main-card mb-3 card">
                        <div className="card-body text-center">
                            <p>Cargando..</p>
                        </div>
                    </div>
                )}
            </React.Fragment>
        );
    }
}

export default Table;