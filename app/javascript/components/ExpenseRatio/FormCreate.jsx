import React, { Component } from 'react';
import { Modal, ModalBody } from 'reactstrap';
import NumberFormat from 'react-number-format';
import Select from "react-select";

const selectStyles = {
  control: (base, state) => ({
    ...base,
    background: "#fcfcfd",
    borderColor: state.isFocused ? "#f5a623" : "#e2e5ea",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(245, 166, 35, 0.15)" : "none",
    "&:hover": { borderColor: "#f5a623" },
    borderRadius: "8px",
    padding: "2px 4px",
    fontSize: "14px",
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? "#f5a623" : state.isFocused ? "#fff3e0" : "#fff",
    color: state.isSelected ? "#fff" : "#333",
    fontSize: "14px",
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

class FormCreate extends Component {
    handleSubmit = e => {
        e.preventDefault();
    };

    render() {
        return (
            <React.Fragment>
                <Modal isOpen={this.props.modal} toggle={this.props.toggle} className="modal-dialog-centered" backdrop={this.props.backdrop}>
                    <div className="cm-modal-container">
                        <div className="cm-modal-header">
                            <div className="cm-modal-header-content">
                                <div className="cm-modal-icon">
                                    <i className="fa fa-calculator"></i>
                                </div>
                                <div>
                                    <h2 className="cm-modal-title">{this.props.title}</h2>
                                    <p className="cm-modal-subtitle">Complete los datos del control de gastos</p>
                                </div>
                            </div>
                            <button type="button" className="cm-modal-close" onClick={() => this.props.toggle()}>
                                <i className="fa fa-times"></i>
                            </button>
                        </div>

                        <form onSubmit={this.handleSubmit}>
                            <ModalBody className="cm-modal-body cm-modal-scroll">
                                <div className="cm-form-grid-2">
                                    <div className="cm-form-group">
                                        <label className="cm-label">
                                            <i className="fa fa-user-tie"></i> Nombre director
                                        </label>
                                        <Select
                                            onChange={this.props.handleChangeAutocompleteUserDirection}
                                            options={this.props.users}
                                            autoFocus={false}
                                            className={!this.props.errorValues && this.props.formValues.user_direction_id == "" ? "cm-select-error" : ""}
                                            value={this.props.selectedOptionUserDirection}
                                            styles={selectStyles}
                                            menuPortalTarget={document.body}
                                        />
                                    </div>

                                    <div className="cm-form-group">
                                        <label className="cm-label">
                                            <i className="fa fa-user"></i> Nombre del empleado
                                        </label>
                                        <Select
                                            onChange={this.props.handleChangeAutocompleteUserReport}
                                            options={this.props.users}
                                            autoFocus={false}
                                            className={!this.props.errorValues && this.props.formValues.user_report_id == "" ? "cm-select-error" : ""}
                                            value={this.props.selectedOptionUserReport}
                                            styles={selectStyles}
                                            menuPortalTarget={document.body}
                                        />
                                    </div>

                                    <div className="cm-form-group cm-full-width">
                                        <label className="cm-label">
                                            <i className="fa fa-comment-alt"></i> Observaciones
                                        </label>
                                        <textarea
                                            name="observations"
                                            rows="3"
                                            value={this.props.formValues.observations}
                                            onChange={this.props.onChangeForm}
                                            className={"cm-input" + (!this.props.errorValues && this.props.formValues.observations == "" ? " cm-input-error" : "")}
                                            style={{ resize: "vertical", minHeight: "80px" }}
                                        />
                                    </div>

                                    <div className="cm-form-group">
                                        <label className="cm-label">
                                            <i className="fa fa-calendar-alt"></i> Fecha inicial
                                        </label>
                                        <input
                                            type="date"
                                            name="start_date"
                                            value={this.props.formValues.start_date}
                                            onChange={this.props.onChangeForm}
                                            className={"cm-input" + (!this.props.errorValues && this.props.formValues.start_date == "" ? " cm-input-error" : "")}
                                        />
                                    </div>

                                    <div className="cm-form-group">
                                        <label className="cm-label">
                                            <i className="fa fa-calendar-check"></i> Fecha final
                                        </label>
                                        <input
                                            type="date"
                                            name="end_date"
                                            value={this.props.formValues.end_date}
                                            onChange={this.props.onChangeForm}
                                            className={"cm-input" + (!this.props.errorValues && this.props.formValues.end_date == "" ? " cm-input-error" : "")}
                                        />
                                    </div>

                                    <div className="cm-form-group">
                                        <label className="cm-label">
                                            <i className="fa fa-calendar-plus"></i> Fecha de creacion
                                        </label>
                                        <input
                                            type="date"
                                            name="creation_date"
                                            value={this.props.formValues.creation_date}
                                            onChange={this.props.onChangeForm}
                                            className={"cm-input" + (!this.props.errorValues && this.props.formValues.creation_date == "" ? " cm-input-error" : "")}
                                        />
                                    </div>

                                    <div className="cm-form-group">
                                        <label className="cm-label">
                                            <i className="fa fa-building"></i> Area
                                        </label>
                                        <input
                                            type="text"
                                            name="area"
                                            value={this.props.formValues.area}
                                            onChange={this.props.onChangeForm}
                                            className={"cm-input" + (!this.props.errorValues && this.props.formValues.area == "" ? " cm-input-error" : "")}
                                        />
                                    </div>

                                    <div className="cm-form-group">
                                        <label className="cm-label">
                                            <i className="fa fa-dollar-sign"></i> Anticipos a favor CIA
                                        </label>
                                        <NumberFormat
                                            name="anticipo"
                                            thousandSeparator={true}
                                            prefix={'$'}
                                            className={"cm-input" + (!this.props.errorValues && this.props.formValues.anticipo == "" ? " cm-input-error" : "")}
                                            value={this.props.formValues.anticipo}
                                            onChange={this.props.handlePageChangeMoney}
                                        />
                                    </div>
                                </div>

                                {!this.props.errorValues && (
                                    <div className="cm-alert cm-alert-error">
                                        <i className="fa fa-exclamation-circle"></i>
                                        <span>Debes de completar todos los campos requeridos</span>
                                    </div>
                                )}
                            </ModalBody>

                            <div className="cm-modal-footer">
                                <button type="button" className="cm-btn cm-btn-cancel" onClick={() => this.props.toggle()}>
                                    <i className="fa fa-times"></i> Cerrar
                                </button>
                                <button type="button" className="cm-btn cm-btn-submit" onClick={this.props.submitForm}>
                                    <i className="fa fa-save"></i> {this.props.nameBnt}
                                </button>
                            </div>
                        </form>
                    </div>
                </Modal>
            </React.Fragment>
        );
    }
}

export default FormCreate;
