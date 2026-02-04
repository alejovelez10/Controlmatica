import React from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "reactstrap";
import NumberFormat from "react-number-format";

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

class FormCreate extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <React.Fragment>
        <Modal
          returnFocusAfterClose={true}
          isOpen={this.props.modal}
          className="modal-dialog-centered"
          toggle={this.props.toggle}
          backdrop={this.props.backdrop}
        >
          <ModalHeader className="cm-modal-header" toggle={this.props.toggle}>
            <i className="fa fa-cogs cm-header-icon"></i>
            {this.props.titulo}
          </ModalHeader>

          <form onSubmit={this.props.FormSubmit}>
            <ModalBody className="cm-modal-body">
              <div className="cm-form-grid-2">
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-tag"></i> Nombre <span className="cm-required">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={this.props.formValues.name}
                    onChange={this.props.onChangeForm}
                    className={`cm-input ${this.props.errorValues === false && this.props.formValues.name === "" ? "cm-input-error" : ""}`}
                    autoComplete="off"
                    placeholder="Nombre"
                  />
                </div>

                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-dollar-sign"></i> Valor monetario <span className="cm-required">*</span>
                  </label>
                  <NumberFormat
                    name="money_value"
                    thousandSeparator={true}
                    prefix={"$"}
                    className={`cm-input ${this.props.errorValues === false && this.props.formValues.money_value === "" ? "cm-input-error" : ""}`}
                    value={this.props.formValues.money_value}
                    onChange={this.props.onChangeForm}
                    placeholder="Valor monetario"
                  />
                </div>
              </div>

              {this.props.errorValues === false && (
                <div className="cm-alert cm-alert-error">
                  <i className="fa fa-exclamation-circle"></i>
                  <span>Debes de completar todos los campos requeridos</span>
                </div>
              )}
            </ModalBody>

            <ModalFooter className="cm-modal-footer">
              <button type="button" className="cm-btn cm-btn-cancel" onClick={this.props.toggle}>
                <i className="fa fa-times"></i> Cerrar
              </button>
              <button type="submit" className="cm-btn cm-btn-submit" onClick={this.props.submit}>
                <i className="fa fa-check"></i> {this.props.nameSubmit}
              </button>
            </ModalFooter>
          </form>
        </Modal>

        <style>{`
          .cm-modal-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff;
            border-radius: 8px 8px 0 0;
            padding: 16px 20px;
            display: flex;
            align-items: center;
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
          .cm-header-icon {
            margin-right: 10px;
            font-size: 18px;
          }
          .cm-modal-body {
            padding: 24px;
            background: #fff;
          }
          .cm-form-grid-2 {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }
          @media (max-width: 576px) {
            .cm-form-grid-2 {
              grid-template-columns: 1fr;
            }
          }
          .cm-form-group {
            display: flex;
            flex-direction: column;
          }
          .cm-label {
            font-size: 13px;
            font-weight: 400;
            color: #495057;
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .cm-label i {
            color: #667eea;
            font-size: 12px;
          }
          .cm-required {
            color: #dc3545;
            font-weight: bold;
          }
          .cm-input {
            width: 100%;
            padding: 10px 14px;
            font-size: 14px;
            border: 1px solid #e2e5ea;
            border-radius: 8px;
            background: #f8f9fa;
            transition: all 0.2s ease;
          }
          .cm-input:focus {
            outline: none;
            border-color: #f5a623;
            box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.15);
            background: #fff;
          }
          .cm-input::placeholder {
            color: #adb5bd;
          }
          .cm-input-error {
            border-color: #dc3545;
            background: #fff5f5;
          }
          .cm-input-error:focus {
            box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.15);
          }
          .cm-alert {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 16px;
            border-radius: 8px;
            margin-top: 20px;
            font-size: 14px;
          }
          .cm-alert-error {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #dc2626;
          }
          .cm-alert-error i {
            font-size: 16px;
          }
          .cm-modal-footer {
            background: #f8f9fa;
            border-top: 1px solid #e9ecef;
            padding: 16px 20px;
            display: flex;
            justify-content: flex-end;
            gap: 12px;
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
            color: #6c757d;
            border: 1px solid #dee2e6;
          }
          .cm-btn-cancel:hover {
            background: #f8f9fa;
            border-color: #c6ccd2;
          }
          .cm-btn-submit {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff;
          }
          .cm-btn-submit:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          }
        `}</style>
      </React.Fragment>
    );
  }
}

export default FormCreate;
