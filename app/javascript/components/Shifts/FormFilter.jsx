import React, { Component } from 'react';
import Select from "react-select";

class FormFilter extends Component {
    constructor(props){
        super(props)
        this.state = {
            selectedOptionCostCenter: {
                cost_center_ids: [],
                label: "Seleccione el centro de costo",
            },

            selectedOptionUser: {
                user_responsible_ids: "", 
                label: "Seleccione el usuario responsable"
            }
        }
    }

    handleChangeAutocompleteCostCenter = selectedOptionCostCenter => {
        let array = []

        if(selectedOptionCostCenter){
            selectedOptionCostCenter.map((item) => (
                array.push(item.value)
            ))
        }

        this.props.handleChangeFilter({ target: { name: "cost_center_ids", value: selectedOptionCostCenter ? array : [] } } )
        this.setState({ selectedOptionCostCenter });
    };


    handleChangeAutocompleteUser = (selectedOptionUser) => {
        let array = []

        if(selectedOptionUser){
            selectedOptionUser.map((item) => (
                array.push(item.value)
            ))
        }

        this.props.handleChangeFilter({ target: { name: "user_responsible_ids", value: selectedOptionUser ? array : [] } } )
        this.setState({ selectedOptionUser });
    }

    render() {
        return (
            <React.Fragment>
                <div className="tile">
                    <div className="tile-body">
                        <div className="row">

                            <div className="col-md-4 mb-3">
                                <label>Fecha inicial</label>
                                <input
                                    type="datetime-local"
                                    name="start_date"
                                    value={this.props.formValues.start_date}
                                    onChange={this.props.handleChangeFilter}
                                    className={`form form-control`}
                                />
                            </div>

                            <div className="col-md-4 mb-3">
                                <label>Fecha final</label>
                                <input
                                    type="datetime-local"
                                    name="end_date"
                                    value={this.props.formValues.end_date}
                                    onChange={this.props.handleChangeFilter}
                                    className={`form form-control`}
                                />
                            </div>
                            
                            {this.props.cost_centers.length >= 2 && (
                                <div className="col-md-4 mb-3">
                                    <input
                                        type="hidden"
                                        name="cost_center_ids"
                                        value={this.state.selectedOptionCostCenter.cost_center_ids}
                                    />
                                    <label>Centros de costo</label>
                                    <Select
                                        onChange={this.handleChangeAutocompleteCostCenter}
                                        options={this.props.cost_centers}
                                        isMulti
                                        closeMenuOnSelect={false}
                                        autoFocus={false}
                                        className={`link-form`}
                                        classNamePrefix="select"
                                        placeholder="Seleccione"
                                        name="cost_center_ids"
                                    />
                                </div>   
                            )}

                            {this.props.cost_centers.length >= 2 && (
                                <div className="col-md-4 mb-3">
                                    <input
                                        type="hidden"
                                        name="user_responsible_ids"
                                        value={this.state.selectedOptionUser.user_responsible_ids}
                                    />
                                    <label>Usuarios responsables</label>
                                    <Select
                                        onChange={this.handleChangeAutocompleteUser}
                                        options={this.props.users}
                                        isMulti
                                        closeMenuOnSelect={false}
                                        autoFocus={false}
                                        className={`link-form`}
                                        classNamePrefix="select"
                                        placeholder="Seleccione"
                                        name="user_responsible_ids"
                                    />
                                </div>   
                            )}
                        </div>
                    </div>

                    <div className="tile-footer">
                        <button onClick={() => this.props.handleClickFilter()} className="btn btn-secondary mr-3">Aplicar</button>
                        <button onClick={() => this.props.closeFilter()} className="btn btn-light mr-2">Cerrar filtros</button>
                    </div>
                </div>

            </React.Fragment>
        );
    }
}

export default FormFilter;
