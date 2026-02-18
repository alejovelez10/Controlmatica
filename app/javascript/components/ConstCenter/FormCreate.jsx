import React from "react";
import { Modal, ModalBody } from "reactstrap";
import NumberFormat from "react-number-format";
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

class FormCreate extends React.Component {
  constructor(props) {
    super(props);
  }

  getServiceFields = () => {
    const { formValues, estados, errorValues, onChangeForm } = this.props;
    const type = formValues.service_type;
    if (!type) return null;

    const hasError = (field) => errorValues === false && formValues[field] === "";

    return (
      <React.Fragment>
        {/* Ingenieria */}
        {(type === "SERVICIO" || type === "PROYECTO") && (
          <React.Fragment>
            <div className="cm-form-group">
              <label className="cm-label">
                <i className="fa fa-clock"></i> Horas ingenieria <span className="cm-required">*</span>
              </label>
              <input
                type="text"
                name="eng_hours"
                value={formValues.eng_hours}
                onChange={onChangeForm}
                className={`cm-input ${hasError("eng_hours") ? "cm-input-error" : ""}`}
                placeholder="Horas ingenieria"
              />
            </div>

            {estados.show_hours && (
              <div className="cm-form-group">
                <label className="cm-label">
                  <i className="fa fa-dollar-sign"></i> Valor hora costo <span className="cm-required">*</span>
                </label>
                <NumberFormat
                  name="hour_real"
                  thousandSeparator={true}
                  prefix={"$"}
                  className={`cm-input ${hasError("hour_real") ? "cm-input-error" : ""}`}
                  value={formValues.hour_real}
                  onChange={onChangeForm}
                  placeholder="Valor hora costo"
                />
              </div>
            )}

            <div className="cm-form-group">
              <label className="cm-label">
                <i className="fa fa-dollar-sign"></i> Hora valor cotizada <span className="cm-required">*</span>
              </label>
              <NumberFormat
                name="hour_cotizada"
                thousandSeparator={true}
                prefix={"$"}
                className={`cm-input ${hasError("hour_cotizada") ? "cm-input-error" : ""}`}
                value={formValues.hour_cotizada}
                onChange={onChangeForm}
                placeholder="Hora valor cotizada"
              />
            </div>
          </React.Fragment>
        )}

        {/* Tableristas */}
        {type === "PROYECTO" && (
          <React.Fragment>
            <div className="cm-form-group">
              <label className="cm-label">
                <i className="fa fa-clock"></i> Horas tablerista <span className="cm-required">*</span>
              </label>
              <input
                type="text"
                name="hours_contractor"
                value={formValues.hours_contractor}
                onChange={onChangeForm}
                className={`cm-input ${hasError("hours_contractor") ? "cm-input-error" : ""}`}
                placeholder="Horas tablerista"
              />
            </div>

            {estados.show_hours && (
              <div className="cm-form-group">
                <label className="cm-label">
                  <i className="fa fa-dollar-sign"></i> Valor hora costo <span className="cm-required">*</span>
                </label>
                <NumberFormat
                  name="hours_contractor_real"
                  thousandSeparator={true}
                  prefix={"$"}
                  className={`cm-input ${hasError("hours_contractor_real") ? "cm-input-error" : ""}`}
                  value={formValues.hours_contractor_real}
                  onChange={onChangeForm}
                  placeholder="Valor hora costo"
                />
              </div>
            )}

            <div className="cm-form-group">
              <label className="cm-label">
                <i className="fa fa-dollar-sign"></i> Valor hora cotizada <span className="cm-required">*</span>
              </label>
              <NumberFormat
                name="hours_contractor_invoices"
                thousandSeparator={true}
                prefix={"$"}
                className={`cm-input ${hasError("hours_contractor_invoices") ? "cm-input-error" : ""}`}
                value={formValues.hours_contractor_invoices}
                onChange={onChangeForm}
                placeholder="Valor hora cotizada"
              />
            </div>
          </React.Fragment>
        )}

        {/* Desplazamiento */}
        {(type === "SERVICIO" || type === "PROYECTO") && (
          <React.Fragment>
            <div className="cm-form-group">
              <label className="cm-label">
                <i className="fa fa-car"></i> Horas de desplazamiento <span className="cm-required">*</span>
              </label>
              <input
                type="number"
                name="displacement_hours"
                value={formValues.displacement_hours}
                onChange={onChangeForm}
                className={`cm-input ${hasError("displacement_hours") ? "cm-input-error" : ""}`}
                placeholder="Horas de desplazamiento"
              />
            </div>

            {(type === "SERVICIO" || estados.show_hours) && (
              <div className="cm-form-group">
                <label className="cm-label">
                  <i className="fa fa-dollar-sign"></i> Valor hora desplazamiento <span className="cm-required">*</span>
                </label>
                <NumberFormat
                  name="value_displacement_hours"
                  thousandSeparator={true}
                  prefix={"$"}
                  className={`cm-input ${hasError("value_displacement_hours") ? "cm-input-error" : ""}`}
                  value={formValues.value_displacement_hours}
                  onChange={onChangeForm}
                  placeholder="Valor hora desplazamiento"
                />
              </div>
            )}
          </React.Fragment>
        )}

        {/* Valores */}
        {(type === "VENTA" || type === "PROYECTO") && (
          <div className="cm-form-group">
            <label className="cm-label">
              <i className="fa fa-boxes"></i> Valor materiales <span className="cm-required">*</span>
            </label>
            <NumberFormat
              name="materials_value"
              thousandSeparator={true}
              prefix={"$"}
              className={`cm-input ${hasError("materials_value") ? "cm-input-error" : ""}`}
              value={formValues.materials_value}
              onChange={onChangeForm}
              placeholder="Valor materiales"
            />
          </div>
        )}

        {(type === "SERVICIO" || type === "PROYECTO") && (
          <div className="cm-form-group">
            <label className="cm-label">
              <i className="fa fa-utensils"></i> Valor viaticos <span className="cm-required">*</span>
            </label>
            <NumberFormat
              name="viatic_value"
              thousandSeparator={true}
              prefix={"$"}
              className={`cm-input ${hasError("viatic_value") ? "cm-input-error" : ""}`}
              value={formValues.viatic_value}
              onChange={onChangeForm}
              placeholder="Valor viaticos"
            />
          </div>
        )}

        <div className="cm-form-group">
          <label className="cm-label">
            <i className="fa fa-calculator"></i> Total cotizacion <span className="cm-required">*</span>
          </label>
          <NumberFormat
            name="quotation_value"
            thousandSeparator={true}
            prefix={"$"}
            className={`cm-input ${hasError("quotation_value") ? "cm-input-error" : ""}`}
            value={formValues.quotation_value}
            onChange={onChangeForm}
            placeholder="Total cotizacion"
          />
        </div>
      </React.Fragment>
    );
  };

  render() {
    const {
      modal,
      toggle,
      titulo,
      submit,
      FormSubmit,
      isLoading,
      nameSubmit,
      errorValues,
      formValues,
      formAutocomplete,
      formAutocompleteContact,
      formAutocompleteUserOwner,
      onChangeAutocomplete,
      onChangeAutocompleteContact,
      onChangeAutocompleteUserOwner,
      onChangeForm,
      clientes,
      contacto,
      users,
      modeEdit,
    } = this.props;

    const hasError = (field) => errorValues === false && formValues[field] === "";
    const hasErrorAutocomplete = (value) => errorValues === false && (!value || !value.value);

    return (
      <React.Fragment>
        <Modal
          returnFocusAfterClose={true}
          isOpen={modal}
          className="modal-dialog-centered modal-lg"
          toggle={toggle}
          backdrop="static"
        >
          <div className="cm-modal-container">
            <div className="cm-modal-header">
              <div className="cm-modal-header-content">
                <div className="cm-modal-icon">
                  <i className="fa fa-building"></i>
                </div>
                <div>
                  <h2 className="cm-modal-title">{titulo}</h2>
                  <p className="cm-modal-subtitle">Complete los campos para gestionar el centro de costo</p>
                </div>
              </div>
              <button type="button" className="cm-modal-close" onClick={toggle}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={FormSubmit}>
              <ModalBody className="cm-modal-body">
              <div className="cm-form-grid-2">
                {/* Cliente */}
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-user-tie"></i> Cliente <span className="cm-required">*</span>
                  </label>
                  <Select
                    onChange={onChangeAutocomplete}
                    options={clientes}
                    value={formAutocomplete}
                    styles={selectStyles}
                    menuPortalTarget={document.body}
                    placeholder="Buscar cliente..."
                    noOptionsMessage={() => "Sin resultados"}
                    className={hasErrorAutocomplete(formAutocomplete) ? "cm-select-error" : ""}
                  />
                </div>

                {/* Contacto */}
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-address-book"></i> Contacto <span className="cm-required">*</span>
                  </label>
                  <Select
                    onChange={onChangeAutocompleteContact}
                    options={contacto}
                    value={formAutocompleteContact}
                    styles={selectStyles}
                    menuPortalTarget={document.body}
                    placeholder="Buscar contacto..."
                    noOptionsMessage={() => "Sin resultados"}
                    className={hasErrorAutocomplete(formAutocompleteContact) ? "cm-select-error" : ""}
                  />
                </div>

                {/* Tipo de Servicio */}
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-cogs"></i> Tipo de Servicio <span className="cm-required">*</span>
                  </label>
                  <select
                    name="service_type"
                    value={formValues.service_type}
                    onChange={onChangeForm}
                    className={`cm-input ${hasError("service_type") ? "cm-input-error" : ""}`}
                    disabled={modeEdit}
                  >
                    <option value="">Seleccione...</option>
                    <option value="SERVICIO">SERVICIO</option>
                    <option value="VENTA">VENTA</option>
                    <option value="PROYECTO">PROYECTO</option>
                  </select>
                </div>

                {/* Propietario */}
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-user"></i> Propietario <span className="cm-required">*</span>
                  </label>
                  <Select
                    onChange={onChangeAutocompleteUserOwner}
                    options={users}
                    value={formAutocompleteUserOwner}
                    styles={selectStyles}
                    menuPortalTarget={document.body}
                    placeholder="Buscar propietario..."
                    noOptionsMessage={() => "Sin resultados"}
                    className={hasErrorAutocomplete(formAutocompleteUserOwner) ? "cm-select-error" : ""}
                  />
                </div>

                {/* Descripcion - full width */}
                <div className="cm-form-group cm-full-width">
                  <label className="cm-label">
                    <i className="fa fa-align-left"></i> Descripcion
                  </label>
                  <textarea
                    name="description"
                    className="cm-input"
                    value={formValues.description}
                    onChange={onChangeForm}
                    rows="3"
                    placeholder="Descripcion del centro de costo"
                  />
                </div>

                {/* Fecha de inicio */}
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-calendar"></i> Fecha de inicio <span className="cm-required">*</span>
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={formValues.start_date}
                    onChange={onChangeForm}
                    className={`cm-input ${hasError("start_date") ? "cm-input-error" : ""}`}
                  />
                </div>

                {/* Fecha final */}
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-calendar-check"></i> Fecha final <span className="cm-required">*</span>
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    value={formValues.end_date}
                    onChange={onChangeForm}
                    className={`cm-input ${hasError("end_date") ? "cm-input-error" : ""}`}
                  />
                </div>

                {/* Numero de cotizacion */}
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-hashtag"></i> Numero de cotizacion <span className="cm-required">*</span>
                  </label>
                  <input
                    type="text"
                    name="quotation_number"
                    value={formValues.quotation_number}
                    onChange={onChangeForm}
                    className={`cm-input ${hasError("quotation_number") ? "cm-input-error" : ""}`}
                    placeholder="Numero de cotizacion"
                  />
                </div>

                {/* Service-specific fields */}
                {this.getServiceFields()}
              </div>

              {errorValues === false && (
                <div className="cm-alert cm-alert-error">
                  <i className="fa fa-exclamation-circle"></i>
                  <span>Debes de completar todos los campos requeridos</span>
                </div>
              )}
            </ModalBody>

              <div className="cm-modal-footer">
                <button type="button" className="cm-btn cm-btn-cancel" onClick={() => toggle()}>
                  <i className="fa fa-times"></i> Cancelar
                </button>
                <button type="submit" className="cm-btn cm-btn-submit" onClick={submit} disabled={isLoading}>
                  {isLoading ? (
                    <React.Fragment>
                      <i className="fas fa-spinner fa-spin"></i> Procesando...
                    </React.Fragment>
                  ) : (
                    <React.Fragment>
                      <i className="fas fa-save"></i> {nameSubmit}
                    </React.Fragment>
                  )}
                </button>
              </div>
            </form>
          </div>
        </Modal>

        <style>{`
          .cm-modal-container {
            background: #fff;
            border-radius: 16px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            max-height: 90vh;
          }
          .cm-modal-header {
            background: #fcfcfd;
            padding: 20px 32px;
            border-bottom: 1px solid #e9ecef;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-shrink: 0;
          }
          .cm-modal-header .close { display: none; }
          .cm-modal-header-content {
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .cm-modal-icon {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #f5a623 0%, #f7b731 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            color: #fff;
            box-shadow: 0 4px 12px rgba(245, 166, 35, 0.3);
            flex-shrink: 0;
          }
          .cm-modal-title {
            font-family: 'Poppins', sans-serif;
            font-size: 18px;
            font-weight: 600;
            color: #333;
            margin: 0;
          }
          .cm-modal-subtitle {
            font-size: 12px;
            color: #6c757d;
            margin: 2px 0 0 0;
          }
          .cm-modal-close {
            width: 32px;
            height: 32px;
            border: none;
            background: #e9ecef;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #6c757d;
            transition: all 0.2s;
            flex-shrink: 0;
          }
          .cm-modal-close:hover {
            background: #dc3545;
            color: #fff;
          }
          .cm-modal-body {
            padding: 24px 32px !important;
            background: #fff;
            max-height: 70vh;
            overflow-y: auto;
          }
          .cm-form-grid-2 {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }
          @media (max-width: 576px) {
            .cm-form-grid-2 {
              grid-template-columns: 1fr;
            }
          }
          .cm-form-group {
            display: flex;
            flex-direction: column;
            margin-bottom: 0;
          }
          .cm-form-group.cm-full-width {
            grid-column: 1 / -1;
          }
          .cm-label {
            display: block;
            font-family: 'Poppins', sans-serif;
            font-size: 13px;
            font-weight: 400;
            color: #495057;
            margin-bottom: 6px;
          }
          .cm-label i {
            color: #6c757d;
            margin-right: 6px;
            width: 14px;
          }
          .cm-required {
            color: #dc3545;
            font-weight: 600;
          }
          .cm-input {
            width: 100%;
            padding: 10px 14px;
            font-family: 'Poppins', sans-serif;
            font-size: 14px;
            color: #333;
            background: #fcfcfd;
            border: 1px solid #e2e5ea;
            border-radius: 8px;
            transition: all 0.2s ease;
            box-sizing: border-box;
          }
          .cm-input:focus {
            outline: none;
            background: #fff;
            border-color: #f5a623;
            box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.15);
          }
          .cm-input::placeholder {
            color: #adb5bd;
          }
          .cm-input:disabled {
            background: #e9ecef;
            cursor: not-allowed;
            opacity: 0.7;
          }
          .cm-input-error {
            border-color: #dc3545 !important;
            background: #fff5f5 !important;
          }
          .cm-select-error .css-13cymwt-control,
          .cm-select-error .css-t3ipsp-control {
            border-color: #dc3545 !important;
            background: #fff5f5 !important;
          }
          textarea.cm-input {
            resize: vertical;
            min-height: 80px;
          }
          .cm-alert {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            margin-top: 16px;
          }
          .cm-alert-error {
            background: #fee2e2;
            color: #dc2626;
            border: 1px solid #fecaca;
          }
          .cm-modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding: 16px 32px;
            background: #fcfcfd;
            border-top: 1px solid #e9ecef;
            flex-shrink: 0;
          }
          .cm-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            font-family: 'Poppins', sans-serif;
            font-size: 14px;
            font-weight: 500;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
          }
          .cm-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          .cm-btn-cancel {
            background: #fff;
            color: #6c757d;
            border: 1px solid #dee2e6;
          }
          .cm-btn-cancel:hover:not(:disabled) {
            background: #fcfcfd;
            border-color: #adb5bd;
          }
          .cm-btn-submit {
            background: linear-gradient(135deg, #f5a623 0%, #f7b731 100%);
            color: #fff;
          }
          .cm-btn-submit:hover:not(:disabled) {
            background: linear-gradient(135deg, #e09520 0%, #e5a82a 100%);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(245, 166, 35, 0.35);
          }
          @media (max-width: 768px) {
            .cm-modal-header,
            .cm-modal-body,
            .cm-modal-footer {
              padding-left: 20px !important;
              padding-right: 20px !important;
            }
          }
        `}</style>
      </React.Fragment>
    );
  }
}

export default FormCreate;
