import React, { Component } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import Select from "react-select";

const selectStyles = {
  control: (base, state) => ({
    ...base,
    background: "#f8f9fa",
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

  handleSubmit = (e) => {
    e.preventDefault();
  };

  render() {
    return (
      <React.Fragment>
        <Modal
          isOpen={this.props.modal}
          toggle={this.props.toggle}
          className="modal-dialog-centered"
          backdrop={this.props.backdrop}
        >
          <ModalHeader className="cm-modal-header" toggle={this.props.toggle}>
            <div className="cm-header-content">
              <i className="fa fa-link cm-header-icon"></i>
              <span>{this.props.title}</span>
            </div>
          </ModalHeader>

          <form onSubmit={this.handleSubmit}>
            <ModalBody className="cm-modal-body">
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
                    className={`${!this.props.errorValues && this.props.formValues.user_direction_id == "" ? "cm-select-error" : ""}`}
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
                    className={`${!this.props.errorValues && this.props.formValues.user_report_id == "" ? "cm-select-error" : ""}`}
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
                  className={`cm-input cm-textarea ${!this.props.errorValues && this.props.formValues.observations == "" ? "cm-input-error" : ""}`}
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
                    className={`cm-input ${!this.props.errorValues && this.props.formValues.start_date == "" ? "cm-input-error" : ""}`}
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
                    className={`cm-input ${!this.props.errorValues && this.props.formValues.end_date == "" ? "cm-input-error" : ""}`}
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
                    className={`cm-input ${!this.props.errorValues && this.props.formValues.creation_date == "" ? "cm-input-error" : ""}`}
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
                    className={`cm-input ${!this.props.errorValues && this.props.formValues.area == "" ? "cm-input-error" : ""}`}
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

            <ModalFooter className="cm-modal-footer">
              <button
                type="button"
                className="cm-btn cm-btn-cancel"
                onClick={() => this.props.toggle()}
              >
                <i className="fa fa-times"></i> Cerrar
              </button>
              <button
                type="button"
                className="cm-btn cm-btn-submit"
                onClick={this.props.submitForm}
              >
                <i className="fa fa-save"></i> {this.props.nameBnt}
              </button>
            </ModalFooter>
          </form>
        </Modal>

        <style>{`
          .cm-modal-header {
            background: linear-gradient(135deg, #f5a623 0%, #f7b84b 100%);
            color: #fff;
            border-radius: 8px 8px 0 0;
            padding: 16px 20px;
            border-bottom: none;
          }

          .cm-modal-header .close {
            color: #fff;
            opacity: 0.8;
            text-shadow: none;
          }

          .cm-modal-header .close:hover {
            opacity: 1;
          }

          .cm-header-content {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 18px;
            font-weight: 600;
          }

          .cm-header-icon {
            font-size: 20px;
          }

          .cm-modal-body {
            padding: 24px;
            background: #fff;
          }

          .cm-form-grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
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
            color: #444;
            margin-bottom: 8px;
          }

          .cm-label i {
            color: #f5a623;
            font-size: 14px;
            width: 16px;
          }

          .cm-input {
            width: 100%;
            padding: 10px 14px;
            font-size: 14px;
            border: 1px solid #e2e5ea;
            border-radius: 8px;
            background: #f8f9fa;
            transition: all 0.2s ease;
            box-sizing: border-box;
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

          .cm-input-error {
            border-color: #dc3545 !important;
            box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.15) !important;
          }

          .cm-select-error .css-13cymwt-control,
          .cm-select-error .css-t3ipsp-control {
            border-color: #dc3545 !important;
            box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.15) !important;
          }

          .cm-alert {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            margin-top: 8px;
          }

          .cm-alert-danger {
            background: #fff5f5;
            border: 1px solid #fed7d7;
            color: #c53030;
          }

          .cm-alert i {
            font-size: 16px;
          }

          .cm-modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding: 16px 24px;
            background: #f8f9fa;
            border-top: 1px solid #e2e5ea;
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
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .cm-btn-cancel {
            background: #fff;
            color: #666;
            border: 1px solid #e2e5ea;
          }

          .cm-btn-cancel:hover {
            background: #f8f9fa;
            border-color: #ccc;
          }

          .cm-btn-submit {
            background: linear-gradient(135deg, #f5a623 0%, #f7b84b 100%);
            color: #fff;
            box-shadow: 0 2px 4px rgba(245, 166, 35, 0.3);
          }

          .cm-btn-submit:hover {
            background: linear-gradient(135deg, #e6951a 0%, #f5a623 100%);
            box-shadow: 0 4px 8px rgba(245, 166, 35, 0.4);
            transform: translateY(-1px);
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
