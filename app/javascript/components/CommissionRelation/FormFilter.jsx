import React, { Component } from 'react';
import NumberFormat from 'react-number-format';
import Select from "react-select";

class FormFilter extends Component {
    close = () => {
        this.props.filter(false);
    };

    render() {
        return (
            <React.Fragment>
                <div className="row">
                    <div className="col-md-12">
                        <div className="tile">

                            {/* Header con botón de cerrar */}
                            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--cm-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: 13, fontWeight: 600, color: "var(--cm-text-muted)" }}>
                                    <i className="fas fa-filter" style={{ marginRight: 8, opacity: 0.6 }} />
                                    Filtros avanzados
                                </span>
                                <button onClick={this.close} className="cm-dt-action-btn" title="Cerrar filtros" style={{ width: 28, height: 28 }}>
                                    <i className="fas fa-times" />
                                </button>
                            </div>

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

                            <div className="tile-footer" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                                <button onClick={this.props.cancelFilter} className="cm-btn cm-btn-outline cm-btn-sm" type="button">
                                    <i className="fas fa-eraser" /> Limpiar
                                </button>
                                <button onClick={() => this.props.HandleClickFilter()} className="cm-btn cm-btn-accent cm-btn-sm" type="button">
                                    <i className="fas fa-search" /> Aplicar filtros
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
