import React, { Component } from 'react';
import NumberFormat from 'react-number-format';
import Select from "react-select";

class FormFilter extends Component {
    render() {
        return (
            <React.Fragment>
                <div className="row">
                    <div className="col-md-12">
                        <div className="tile">

                            <div className="tile-body">
                                <div className="row">

                                    <div className="col-md-3 mb-3">
                                        <input
                                            type="hidden"
                                            name="user_direction_id"
                                            value={this.props.selectedOptionUserDirection.user_direction_id}
                                        />                                                        
                                        <label>Nombre del director </label>
                                        <Select
                                            onChange={this.props.handleChangeAutocompleteUserDirection}
                                            options={this.props.users}
                                            autoFocus={false}
                                            className={`link-form`}
                                            value={this.props.selectedOptionUserDirection}
                                        />
                                    </div>

                                    <div className="col-md-3 mb-3">
                                        <input
                                            type="hidden"
                                            name="user_report_id"
                                            value={this.props.selectedOptionUserReport.user_report_id}
                                        />                                                        
                                        <label>Nombre del empleado </label>
                                        <Select
                                            onChange={this.props.handleChangeAutocompleteUserReport}
                                            options={this.props.users}
                                            autoFocus={false}
                                            className={`link-form`}
                                            value={this.props.selectedOptionUserReport}
                                        />
                                    </div>

                                    <div className="col-md-3">
                                        <label>Observaciones </label>
                                        <input
                                            type="text"
                                            name="observations"
                                            value={this.props.formValues.observations}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control mb-3 ${!this.props.errorValues && this.props.formValues.name == "" ? "error-class" : ""}`}
                                        />
                                    </div>

                                    <div className="col-md-3">
                                        <label>Fecha inicial </label>
                                        <input
                                            type="date"
                                            name="start_date"
                                            value={this.props.formValues.start_date}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control ${!this.props.errorValues && this.props.formValues.name == "" ? "error-class" : ""}`}
                                        />
                                    </div>

                                    <div className="col-md-3 mt-3">
                                        <label>Fecha final </label>
                                        <input
                                            type="date"
                                            name="end_date"
                                            value={this.props.formValues.end_date}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control ${!this.props.errorValues && this.props.formValues.name == "" ? "error-class" : ""}`}
                                        />
                                    </div>

                                    <div className="col-md-3 mt-3">
                                        <label>Fecha de creación </label>
                                        <input
                                            type="date"
                                            name="creation_date"
                                            value={this.props.formValues.creation_date}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control`}
                                        />
                                    </div>

                                    <div className="col-md-3 mt-3">
                                        <label>Area </label>
                                        <input
                                            type="text"
                                            name="area"
                                            value={this.props.formValues.area}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control`}
                                        />
                                    </div>

                                </div>
                            </div>

                            <div className="tile-footer">
                                <button
                                    className="btn btn-secondary mr-3"
                                    onClick={() => this.props.HandleClickFilter()}
                                >
                                    Aplicar
                                </button>

                                <button
                                    className="btn btn-danger"
                                    onClick={() => this.props.filter(false)}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </React.Fragment>
        );
    }
}

export default FormFilter;
