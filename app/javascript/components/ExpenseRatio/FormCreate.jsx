import React, { Component } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
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

    constructor(props) {
        super(props);
    }

    handleSubmit = e => {
        e.preventDefault();
    };

    render() {
        return (
            <React.Fragment>
                <Modal isOpen={this.props.modal} toggle={this.props.toggle} className="modal-dialog-centered" backdrop={this.props.backdrop}>
                    <form onSubmit={this.handleSubmit}>
                        <div className="cm-modal-header">
                            <div className="cm-modal-title">
                                <i className="fa fa-calculator cm-modal-icon"></i>
                                <span>{this.props.title}</span>
                            </div>
                            <button type="button" className="cm-modal-close" onClick={() => this.props.toggle()}>
                                <i className="fa fa-times"></i>
                            </button>
                        </div>

                        <ModalBody>
                            <div className="cm-form-grid-2">
                                <div className="cm-form-group">
                                    <input
                                        type="hidden"
                                        name="user_direction_id"
                                        value={this.props.selectedOptionUserDirection.user_direction_id}
                                    />
                                    <label className="cm-label">
                                        <i className="fa fa-user-tie"></i> Nombre director
                                    </label>
                                    <Select
                                        onChange={this.props.handleChangeAutocompleteUserDirection}
                                        options={this.props.users}
                                        autoFocus={false}
                                        className={`${!this.props.errorValues && this.props.formValues.user_direction_id == "" ? "error-class" : ""}`}
                                        value={this.props.selectedOptionUserDirection}
                                        styles={selectStyles}
                                        menuPortalTarget={document.body}
                                    />
                                </div>

                                <div className="cm-form-group">
                                    <input
                                        type="hidden"
                                        name="user_report_id"
                                        value={this.props.selectedOptionUserReport.user_report_id}
                                    />
                                    <label className="cm-label">
                                        <i className="fa fa-user"></i> Nombre del empleado
                                    </label>
                                    <Select
                                        onChange={this.props.handleChangeAutocompleteUserReport}
                                        options={this.props.users}
                                        autoFocus={false}
                                        className={`${!this.props.errorValues && this.props.formValues.user_report_id == "" ? "error-class" : ""}`}
                                        value={this.props.selectedOptionUserReport}
                                        styles={selectStyles}
                                        menuPortalTarget={document.body}
                                    />
                                </div>
                            </div>

                            <div className="cm-form-group">
                                <label className="cm-label">
                                    <i className="fa fa-comment-alt"></i> Observaciones
                                </label>
                                <textarea
                                    name="observations"
                                    rows="4"
                                    value={this.props.formValues.observations}
                                    onChange={this.props.onChangeForm}
                                    className={`cm-input cm-textarea ${!this.props.errorValues && this.props.formValues.observations == "" ? "error-class" : ""}`}
                                />
                            </div>

                            <div className="cm-form-grid-2">
                                <div className="cm-form-group">
                                    <label className="cm-label">
                                        <i className="fa fa-calendar-alt"></i> Fecha inicial
                                    </label>
                                    <input
                                        type="date"
                                        name="start_date"
                                        value={this.props.formValues.start_date}
                                        onChange={this.props.onChangeForm}
                                        className={`cm-input ${!this.props.errorValues && this.props.formValues.start_date == "" ? "error-class" : ""}`}
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
                                        className={`cm-input ${!this.props.errorValues && this.props.formValues.end_date == "" ? "error-class" : ""}`}
                                    />
                                </div>
                            </div>

                            <div className="cm-form-grid-2">
                                <div className="cm-form-group">
                                    <label className="cm-label">
                                        <i className="fa fa-calendar-plus"></i> Fecha de creacion
                                    </label>
                                    <input
                                        type="date"
                                        name="creation_date"
                                        value={this.props.formValues.creation_date}
                                        onChange={this.props.onChangeForm}
                                        className={`cm-input ${!this.props.errorValues && this.props.formValues.creation_date == "" ? "error-class" : ""}`}
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
                                        className={`cm-input ${!this.props.errorValues && this.props.formValues.area == "" ? "error-class" : ""}`}
                                    />
                                </div>
                            </div>

                            <div className="cm-form-grid-2">
                                <div className="cm-form-group">
                                    <label className="cm-label">
                                        <i className="fa fa-dollar-sign"></i> Anticipos a favor CIA
                                    </label>
                                    <NumberFormat
                                        name="anticipo"
                                        thousandSeparator={true}
                                        prefix={'$'}
                                        className={`cm-input ${!this.props.errorValues && this.props.formValues.anticipo == "" ? "error-class" : ""}`}
                                        value={this.props.formValues.anticipo}
                                        onChange={this.props.handlePageChangeMoney}
                                    />
                                </div>
                            </div>

                            {!this.props.errorValues && (
                                <div className="cm-alert cm-alert-danger">
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
                </Modal>

                <style>{`
                    .cm-modal-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 20px 24px;
                        border-bottom: 1px solid #e2e5ea;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        border-radius: 8px 8px 0 0;
                    }

                    .cm-modal-title {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        font-size: 18px;
                        font-weight: 600;
                        color: #fff;
                    }

                    .cm-modal-icon {
                        font-size: 20px;
                        color: #fff;
                    }

                    .cm-modal-close {
                        background: rgba(255, 255, 255, 0.2);
                        border: none;
                        color: #fff;
                        width: 32px;
                        height: 32px;
                        border-radius: 50%;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.2s ease;
                    }

                    .cm-modal-close:hover {
                        background: rgba(255, 255, 255, 0.3);
                    }

                    .cm-form-grid-2 {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 16px;
                        margin-bottom: 16px;
                    }

                    .cm-form-group {
                        margin-bottom: 16px;
                    }

                    .cm-form-grid-2 .cm-form-group {
                        margin-bottom: 0;
                    }

                    .cm-label {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        font-size: 14px;
                        font-weight: 400;
                        color: #374151;
                        margin-bottom: 8px;
                    }

                    .cm-label i {
                        color: #6b7280;
                        font-size: 14px;
                    }

                    .cm-input {
                        width: 100%;
                        padding: 10px 14px;
                        font-size: 14px;
                        border: 1px solid #e2e5ea;
                        border-radius: 8px;
                        background: #fcfcfd;
                        transition: all 0.2s ease;
                    }

                    .cm-input:focus {
                        outline: none;
                        border-color: #f5a623;
                        box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.15);
                        background: #fff;
                    }

                    .cm-input:hover {
                        border-color: #f5a623;
                    }

                    .cm-textarea {
                        resize: vertical;
                        min-height: 100px;
                    }

                    .cm-input.error-class {
                        border-color: #ef4444;
                        background: #fef2f2;
                    }

                    .error-class .css-yk16xz-control,
                    .error-class .css-1pahdxg-control {
                        border-color: #ef4444 !important;
                        background: #fef2f2 !important;
                    }

                    .cm-alert {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        padding: 12px 16px;
                        border-radius: 8px;
                        font-size: 14px;
                        margin-top: 16px;
                    }

                    .cm-alert-danger {
                        background: #fef2f2;
                        color: #dc2626;
                        border: 1px solid #fecaca;
                    }

                    .cm-modal-footer {
                        display: flex;
                        justify-content: flex-end;
                        gap: 12px;
                        padding: 16px 24px;
                        border-top: 1px solid #e2e5ea;
                        background: #fcfcfd;
                        border-radius: 0 0 8px 8px;
                    }

                    .cm-btn {
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        padding: 10px 20px;
                        font-size: 14px;
                        font-weight: 500;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        border: none;
                    }

                    .cm-btn-cancel {
                        background: #fff;
                        color: #6b7280;
                        border: 1px solid #e2e5ea;
                    }

                    .cm-btn-cancel:hover {
                        background: #f3f4f6;
                        color: #374151;
                    }

                    .cm-btn-submit {
                        background: linear-gradient(135deg, #f5a623 0%, #f57c00 100%);
                        color: #fff;
                        box-shadow: 0 2px 4px rgba(245, 166, 35, 0.3);
                    }

                    .cm-btn-submit:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 4px 8px rgba(245, 166, 35, 0.4);
                    }

                    @media (max-width: 576px) {
                        .cm-form-grid-2 {
                            grid-template-columns: 1fr;
                        }
                    }
                `}</style>
            </React.Fragment>
        );
    }
}

export default FormCreate;
