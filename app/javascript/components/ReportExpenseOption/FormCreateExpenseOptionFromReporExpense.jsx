import React, { Component } from 'react';

class FormCreateExpenseOptionFromReporExpense extends Component {
    constructor(props){
        super(props)
        this.token = document.querySelector("[name='csrf-token']").content;
        this.state = {
            modeEdit: false,
            showForm: false,
            ErrorValues:  true,
            formCreate: {
                name: "",
                category: "",
            },
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
                    this.cancelForm();
                    this.props.setValuesReportExpenseOption(data.register);
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
                    this.setState({ showForm: false })
                    this.props.setValuesReportExpenseOption(data.register)
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

    cancelForm = () => {
        this.setState({
            showForm: false,
            formCreate: {
                name: "",
                category: "",
            },
        })
    }


    render() {
        return (
            <React.Fragment>
                <hr />
                    {this.state.showForm ? (
                        <div className="card">
                            <div className="card-header">
                                Crear tipo de gasto
                            </div>

                            <div className="card-body">
                                <div className="row">
                                    <div className="col-md-6">
                                        <label>Nombre</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={this.state.formCreate.name}
                                            onChange={this.HandleChange}
                                            className={`form form-control`}
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label>Tipo</label>
                                        <select 
                                            name="category"
                                            value={this.state.formCreate.category}
                                            onChange={this.HandleChange}
                                            className={`form form-control`}
                                        >
                                            <option value="">Selecciona un tipo</option>
                                            <option value="Tipo">Tipo</option>
                                            <option value="Medio de pago">Medio de pago</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="card-footer text-right">
                                <button
                                    className="btn btn-secondary mr-3"
                                    onClick={() => this.HandleClick()}
                                >
                                    Crear registro
                                </button>

                                <button
                                    className="btn btn-light"
                                    onClick={() => this.cancelForm()}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p 
                            style={{ cursor: "pointer", color: "#0090ff", textDecoration: "underline" }}
                            onClick={() => this.setState({ showForm: true })}
                        >
                            Crear tipo
                        </p>
                    )}
                <hr />
            </React.Fragment>
        );
    }
}

export default FormCreateExpenseOptionFromReporExpense;
