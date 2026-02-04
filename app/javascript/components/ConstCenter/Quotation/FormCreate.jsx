import React, { Component } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import NumberFormat from 'react-number-format';

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
  handleSubmit = e => {
    e.preventDefault();
  };

  getChangeInput = () => {
    if (this.props.cost_center.service_type == "SERVICIO") {
      return this.services();
    } else if (this.props.cost_center.service_type == "VENTA") {
      return this.sale();
    } else if (this.props.cost_center.service_type == "PROYECTO") {
      return this.draft();
    }
  };

  draft = () => {
    return (
      <React.Fragment>
        <Modal isOpen={this.props.modal} toggle={this.props.toggle} className="modal-dialog-centered modal-lg" backdrop={this.props.backdrop}>
          <ModalHeader className="cm-modal-header" toggle={this.props.toggle}>
            <i className="fas fa-file-invoice cm-header-icon"></i>
            {this.props.title}
          </ModalHeader>

          <form onSubmit={this.handleSubmit}>
            <ModalBody className="cm-modal-body">
              <div className="cm-form-grid-2">
                <div className="cm-form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="cm-label">
                    <i className="fas fa-align-left"></i> Descripcion
                  </label>
                  <textarea
                    name="description"
                    className="cm-input cm-textarea"
                    value={this.props.formValues.description}
                    onChange={this.props.onChangeForm}
                    rows="4"
                  />
                </div>

                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fas fa-hashtag"></i> Numero de cotizacion *
                  </label>
                  <input
                    name="quotation_number"
                    type="text"
                    className="cm-input"
                    value={this.props.formValues.quotation_number}
                    onChange={this.props.handleChangeMoney}
                  />
                </div>
              </div>

              <div className="cm-form-grid-3">
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fas fa-clock"></i> Horas ingenieria *
                  </label>
                  <input
                    name="eng_hours"
                    type="number"
                    className="cm-input"
                    value={this.props.formValues.eng_hours}
                    onChange={this.props.handleChangeMoney}
                    placeholder="Horas"
                  />
                </div>

                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fas fa-dollar-sign"></i> Valor hora costo *
                  </label>
                  <NumberFormat
                    name="hour_real"
                    thousandSeparator={true}
                    prefix={'$'}
                    className="cm-input"
                    value={this.props.formValues.hour_real}
                    onChange={this.props.handleChangeMoney}
                    placeholder="$0"
                  />
                </div>

                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fas fa-dollar-sign"></i> Hora valor cotizada *
                  </label>
                  <NumberFormat
                    name="hour_cotizada"
                    thousandSeparator={true}
                    prefix={'$'}
                    className="cm-input"
                    value={this.props.formValues.hour_cotizada}
                    onChange={this.props.handleChangeMoney}
                    placeholder="$0"
                  />
                </div>
              </div>

              <div className="cm-form-grid-3">
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fas fa-tools"></i> Horas tablerista *
                  </label>
                  <input
                    name="hours_contractor"
                    type="number"
                    className="cm-input"
                    value={this.props.formValues.hours_contractor}
                    onChange={this.props.handleChangeMoney}
                    placeholder="Horas"
                  />
                </div>

                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fas fa-dollar-sign"></i> Valor hora costo *
                  </label>
                  <NumberFormat
                    name="hours_contractor_real"
                    thousandSeparator={true}
                    prefix={'$'}
                    className="cm-input"
                    value={this.props.formValues.hours_contractor_real}
                    onChange={this.props.handleChangeMoney}
                    placeholder="$0"
                  />
                </div>

                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fas fa-dollar-sign"></i> Valor hora cotizada *
                  </label>
                  <NumberFormat
                    name="hours_contractor_invoices"
                    thousandSeparator={true}
                    prefix={'$'}
                    className="cm-input"
                    value={this.props.formValues.hours_contractor_invoices}
                    onChange={this.props.handleChangeMoney}
                    placeholder="$0"
                  />
                </div>
              </div>

              <div className="cm-form-grid-2">
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fas fa-route"></i> Horas de desplazamiento *
                  </label>
                  <input
                    name="displacement_hours"
                    type="number"
                    className="cm-input"
                    value={this.props.formValues.displacement_hours}
                    onChange={this.props.handleChangeMoney}
                    placeholder="Horas"
                  />
                </div>

                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fas fa-dollar-sign"></i> Valor hora desplazamiento *
                  </label>
                  <NumberFormat
                    name="value_displacement_hours"
                    thousandSeparator={true}
                    prefix={'$'}
                    className="cm-input"
                    value={this.props.formValues.value_displacement_hours}
                    onChange={this.props.handleChangeMoney}
                    placeholder="$0"
                  />
                </div>
              </div>

              <div className="cm-form-grid-3">
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fas fa-boxes"></i> Valor materiales *
                  </label>
                  <NumberFormat
                    name="materials_value"
                    thousandSeparator={true}
                    prefix={'$'}
                    className="cm-input"
                    value={this.props.formValues.materials_value}
                    onChange={this.props.handleChangeMoney}
                    placeholder="$0"
                  />
                </div>

                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fas fa-utensils"></i> Valor viaticos *
                  </label>
                  <NumberFormat
                    name="viatic_value"
                    thousandSeparator={true}
                    prefix={'$'}
                    className="cm-input"
                    value={this.props.formValues.viatic_value}
                    onChange={this.props.handleChangeMoney}
                    placeholder="$0"
                  />
                </div>

                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fas fa-calculator"></i> Total cotizacion *
                  </label>
                  <NumberFormat
                    name="quotation_value"
                    thousandSeparator={true}
                    prefix={'$'}
                    className="cm-input"
                    value={this.props.formValues.quotation_value}
                    onChange={this.props.handleChangeMoney}
                    placeholder="$0"
                  />
                </div>
              </div>
            </ModalBody>

            <ModalFooter className="cm-modal-footer">
              <button type="button" className="cm-btn cm-btn-cancel" onClick={() => this.props.toggle()}>
                <i className="fas fa-times"></i> Cerrar
              </button>
              <button type="button" className="cm-btn cm-btn-submit" onClick={() => this.props.submitForm()}>
                <i className="fas fa-save"></i> {this.props.nameBnt}
              </button>
            </ModalFooter>
          </form>
        </Modal>
      </React.Fragment>
    );
  };

  services = () => {
    return (
      <React.Fragment>
        <Modal isOpen={this.props.modal} toggle={this.props.toggle} className="modal-dialog-centered modal-lg" backdrop={this.props.backdrop}>
          <ModalHeader className="cm-modal-header" toggle={this.props.toggle}>
            <i className="fas fa-file-invoice cm-header-icon"></i>
            {this.props.title}
          </ModalHeader>

          <form onSubmit={this.handleSubmit}>
            <ModalBody className="cm-modal-body">
              <div className="cm-form-grid-2">
                <div className="cm-form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="cm-label">
                    <i className="fas fa-align-left"></i> Descripcion
                  </label>
                  <textarea
                    name="description"
                    className="cm-input cm-textarea"
                    value={this.props.formValues.description}
                    onChange={this.props.onChangeForm}
                    rows="4"
                  />
                </div>

                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fas fa-hashtag"></i> Numero de cotizacion *
                  </label>
                  <input
                    name="quotation_number"
                    type="text"
                    className="cm-input"
                    value={this.props.formValues.quotation_number}
                    onChange={this.props.handleChangeMoney}
                  />
                </div>
              </div>

              <div className="cm-form-grid-3">
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fas fa-clock"></i> Horas ingenieria *
                  </label>
                  <input
                    name="eng_hours"
                    type="number"
                    className="cm-input"
                    value={this.props.formValues.eng_hours}
                    onChange={this.props.handleChangeMoney}
                    placeholder="Horas"
                  />
                </div>

                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fas fa-dollar-sign"></i> Valor hora costo *
                  </label>
                  <NumberFormat
                    name="hour_real"
                    thousandSeparator={true}
                    prefix={'$'}
                    className="cm-input"
                    value={this.props.formValues.hour_real}
                    onChange={this.props.handleChangeMoney}
                    placeholder="$0"
                  />
                </div>

                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fas fa-dollar-sign"></i> Hora valor cotizada *
                  </label>
                  <NumberFormat
                    name="hour_cotizada"
                    thousandSeparator={true}
                    prefix={'$'}
                    className="cm-input"
                    value={this.props.formValues.hour_cotizada}
                    onChange={this.props.handleChangeMoney}
                    placeholder="$0"
                  />
                </div>
              </div>

              <div className="cm-form-grid-2">
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fas fa-route"></i> Horas de desplazamiento *
                  </label>
                  <input
                    name="displacement_hours"
                    type="number"
                    className="cm-input"
                    value={this.props.formValues.displacement_hours}
                    onChange={this.props.handleChangeMoney}
                    placeholder="Horas"
                  />
                </div>

                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fas fa-dollar-sign"></i> Valor hora desplazamiento *
                  </label>
                  <NumberFormat
                    name="value_displacement_hours"
                    thousandSeparator={true}
                    prefix={'$'}
                    className="cm-input"
                    value={this.props.formValues.value_displacement_hours}
                    onChange={this.props.handleChangeMoney}
                    placeholder="$0"
                  />
                </div>
              </div>

              <div className="cm-form-grid-2">
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fas fa-utensils"></i> Valor viaticos *
                  </label>
                  <NumberFormat
                    name="viatic_value"
                    thousandSeparator={true}
                    prefix={'$'}
                    className="cm-input"
                    value={this.props.formValues.viatic_value}
                    onChange={this.props.handleChangeMoney}
                    placeholder="$0"
                  />
                </div>

                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fas fa-calculator"></i> Total cotizacion *
                  </label>
                  <NumberFormat
                    name="quotation_value"
                    thousandSeparator={true}
                    prefix={'$'}
                    className="cm-input"
                    value={this.props.formValues.quotation_value}
                    onChange={this.props.handleChangeMoney}
                    placeholder="$0"
                  />
                </div>
              </div>
            </ModalBody>

            <ModalFooter className="cm-modal-footer">
              <button type="button" className="cm-btn cm-btn-cancel" onClick={() => this.props.toggle()}>
                <i className="fas fa-times"></i> Cerrar
              </button>
              <button type="button" className="cm-btn cm-btn-submit" onClick={() => this.props.submitForm()}>
                <i className="fas fa-save"></i> {this.props.nameBnt}
              </button>
            </ModalFooter>
          </form>
        </Modal>
      </React.Fragment>
    );
  };

  sale = () => {
    return (
      <React.Fragment>
        <Modal isOpen={this.props.modal} toggle={this.props.toggle} className="modal-dialog-centered modal-lg" backdrop={this.props.backdrop}>
          <ModalHeader className="cm-modal-header" toggle={this.props.toggle}>
            <i className="fas fa-file-invoice cm-header-icon"></i>
            {this.props.title}
          </ModalHeader>

          <form onSubmit={this.handleSubmit}>
            <ModalBody className="cm-modal-body">
              <div className="cm-form-grid-2">
                <div className="cm-form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="cm-label">
                    <i className="fas fa-align-left"></i> Descripcion
                  </label>
                  <textarea
                    name="description"
                    className="cm-input cm-textarea"
                    value={this.props.formValues.description}
                    onChange={this.props.onChangeForm}
                    rows="4"
                  />
                </div>

                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fas fa-hashtag"></i> Numero de cotizacion *
                  </label>
                  <input
                    name="quotation_number"
                    type="text"
                    className="cm-input"
                    value={this.props.formValues.quotation_number}
                    onChange={this.props.handleChangeMoney}
                  />
                </div>
              </div>

              <div className="cm-form-grid-2">
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fas fa-boxes"></i> Valor materiales *
                  </label>
                  <NumberFormat
                    name="materials_value"
                    thousandSeparator={true}
                    prefix={'$'}
                    className="cm-input"
                    value={this.props.formValues.materials_value}
                    onChange={this.props.handleChangeMoney}
                    placeholder="$0"
                  />
                </div>

                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fas fa-calculator"></i> Total cotizacion *
                  </label>
                  <NumberFormat
                    name="quotation_value"
                    thousandSeparator={true}
                    prefix={'$'}
                    className="cm-input"
                    value={this.props.formValues.quotation_value}
                    onChange={this.props.handleChangeMoney}
                    placeholder="$0"
                  />
                </div>
              </div>
            </ModalBody>

            <ModalFooter className="cm-modal-footer">
              <button type="button" className="cm-btn cm-btn-cancel" onClick={() => this.props.toggle()}>
                <i className="fas fa-times"></i> Cerrar
              </button>
              <button type="button" className="cm-btn cm-btn-submit" onClick={() => this.props.submitForm()}>
                <i className="fas fa-save"></i> {this.props.nameBnt}
              </button>
            </ModalFooter>
          </form>
        </Modal>
      </React.Fragment>
    );
  };

  render() {
    return (
      <React.Fragment>
        {this.props.cost_center.service_type != "" && (
          <React.Fragment>
            {this.getChangeInput()}
          </React.Fragment>
        )}

        <style>{`
          .cm-modal-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 12px 12px 0 0;
            padding: 1.25rem 1.5rem;
            border-bottom: none;
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }
          .cm-modal-header .close {
            color: white;
            opacity: 0.8;
            text-shadow: none;
          }
          .cm-modal-header .close:hover {
            opacity: 1;
          }
          .cm-header-icon {
            font-size: 1.25rem;
            margin-right: 0.5rem;
          }
          .cm-modal-body {
            padding: 1.5rem;
            background: #fafbfc;
          }
          .cm-form-grid-2 {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
            margin-bottom: 1rem;
          }
          .cm-form-grid-3 {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
            margin-bottom: 1rem;
          }
          .cm-form-group {
            display: flex;
            flex-direction: column;
          }
          .cm-label {
            font-size: 13px;
            font-weight: 400;
            color: #4a5568;
            margin-bottom: 0.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          .cm-label i {
            color: #f5a623;
            font-size: 12px;
          }
          .cm-input {
            width: 100%;
            padding: 0.625rem 0.875rem;
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
          .cm-input:hover {
            border-color: #f5a623;
          }
          .cm-textarea {
            resize: vertical;
            min-height: 100px;
          }
          .cm-modal-footer {
            background: #fff;
            border-top: 1px solid #e2e5ea;
            padding: 1rem 1.5rem;
            display: flex;
            justify-content: flex-end;
            gap: 0.75rem;
            border-radius: 0 0 12px 12px;
          }
          .cm-btn {
            padding: 0.625rem 1.25rem;
            font-size: 14px;
            font-weight: 500;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.2s ease;
          }
          .cm-btn-cancel {
            background: #f1f3f4;
            color: #5f6368;
          }
          .cm-btn-cancel:hover {
            background: #e8eaed;
          }
          .cm-btn-submit {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .cm-btn-submit:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          }
          @media (max-width: 768px) {
            .cm-form-grid-2,
            .cm-form-grid-3 {
              grid-template-columns: 1fr;
            }
            .cm-form-group[style*="grid-column: span 2"] {
              grid-column: span 1 !important;
            }
          }
        `}</style>
      </React.Fragment>
    );
  }
}

export default FormCreate;
