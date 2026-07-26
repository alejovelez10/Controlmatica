import React from "react";
import { Modal } from "reactstrap";
import NumberFormat from "react-number-format";

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
          className="modal-lg modal-dialog-centered"
          toggle={this.props.toggle}
          backdrop={this.props.backdrop}
        >
          <div className="cm-modal-container">
            <div className="cm-modal-header">
              <div className="cm-modal-header-content">
                <div className="cm-modal-icon"><i className="fas fa-sliders-h" /></div>
                <div>
                  <h2 className="cm-modal-title">{this.props.titulo}</h2>
                  <p className="cm-modal-subtitle">Complete los datos de la parametrizacion</p>
                </div>
              </div>
              <button type="button" className="cm-modal-close" onClick={this.props.toggle}>
                <i className="fas fa-times" />
              </button>
            </div>

            <form onSubmit={this.props.FormSubmit}>
              <div className="cm-modal-body">
                <div className="cm-form-grid-2">
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-tag" />
                      Nombre <span className="cm-required">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={this.props.formValues.name}
                      onChange={this.props.onChangeForm}
                      autoComplete="off"
                      placeholder="Nombre"
                      className={`cm-input${this.props.errorValues === false && this.props.formValues.name === "" ? " cm-input-error" : ""}`}
                    />
                  </div>

                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-dollar-sign" />
                      Valor monetario <span className="cm-required">*</span>
                    </label>
                    <NumberFormat
                      name="money_value"
                      thousandSeparator={true}
                      prefix={"$"}
                      value={this.props.formValues.money_value}
                      onChange={this.props.onChangeForm}
                      placeholder="Valor monetario"
                      className={`cm-input${this.props.errorValues === false && this.props.formValues.money_value === "" ? " cm-input-error" : ""}`}
                    />
                  </div>
                </div>

                {this.props.errorValues === false && (
                  <div className="cm-alert cm-alert-danger">
                    <i className="fa fa-exclamation-circle" />
                    <span>Debes de completar todos los campos requeridos</span>
                  </div>
                )}
              </div>

              <div className="cm-modal-footer">
                <button type="button" className="cm-btn cm-btn-cancel" onClick={this.props.toggle}>
                  <i className="fa fa-times" /> Cerrar
                </button>
                <button type="submit" className="cm-btn cm-btn-submit" onClick={this.props.submit}>
                  <i className="fa fa-check" /> {this.props.nameSubmit}
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
