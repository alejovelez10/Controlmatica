import React, { Component } from 'react';
import Select from "react-select";

class FormFilter extends Component {
    constructor(props){
        super(props)
        this.state = {
            selectedOptionCostCenter: {
                cost_center_id: "",
                label: "Seleccione el centro de costo",
            },

            selectedOptionUser: {
                user_responsible_id: "", 
                label: "Seleccione el usuario responsable"
            }
        }
    }

    handleChangeAutocompleteCostCenter = selectedOptionCostCenter => {
        this.props.handleChangeFilter({ target: { name: "cost_center_id", value: selectedOptionCostCenter.value } } )
        this.setState({ selectedOptionCostCenter });
    };


    handleChangeAutocompleteUser = (selectedOptionUser) => {
        this.props.handleChangeFilter({ target: { name: "user_responsible_id", value: selectedOptionUser.value } } )
        this.setState({ selectedOptionUser });
    }

    render() {
        return (
            <React.Fragment>
                <div className="tile">
                    <div className="tile-body">
                        <div className="row">
                            {this.props.cost_centers.length >= 2 && (
                                <div className="col-md-4 mb-3">
                                    <input
                                        type="hidden"
                                        name="cost_center_id"
                                        value={this.state.selectedOptionCostCenter.cost_center_id}
                                    />                                                        
                                    <label>Centro de costo </label>
                                    <Select
                                        onChange={this.handleChangeAutocompleteCostCenter}
                                        options={this.props.cost_centers}
                                        autoFocus={false}
                                        className={`link-form`}
                                        value={this.state.selectedOptionCostCenter}
                                    />
                                </div>   
                            )}

                            <div className="col-md-4 mb-3">
                                <input
                                    type="hidden"
                                    name="user_responsible_id"
                                    value={this.state.selectedOptionUser.user_responsible_id}
                                />                                                        
                                <label>Usuario responsable </label>
                                <Select
                                    onChange={this.handleChangeAutocompleteUser}
                                    options={this.props.users}
                                    autoFocus={false}
                                    className={`link-form`}
                                    value={this.state.selectedOptionUser}
                                />
                            </div>
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
