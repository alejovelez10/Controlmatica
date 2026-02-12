import React from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "reactstrap";
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
          <ModalHeader className="cm-modal-header" toggle={toggle}>
            <i className="fa fa-building cm-header-icon"></i>
            {titulo}
          </ModalHeader>

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

            <ModalFooter className="cm-modal-footer">
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
            max-height: 70vh;
            overflow-y: auto;
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
          .cm-form-group.cm-full-width {
            grid-column: 1 / -1;
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
            background: #fcfcfd;
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
          .cm-input:disabled {
            background: #e9ecef;
            cursor: not-allowed;
            opacity: 0.7;
          }
          .cm-input-error {
            border-color: #dc3545;
            background: #fff5f5;
          }
          .cm-input-error:focus {
            box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.15);
          }
          .cm-select-error .css-13cymwt-control,
          .cm-select-error .css-t3ipsp-control {
            border-color: #dc3545;
            background: #fff5f5;
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
            background: #fcfcfd;
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
            border-color: #c6ccd2;
          }
          .cm-btn-submit {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff;
          }
          .cm-btn-submit:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          }
        `}</style>
      </React.Fragment>
    );
  }
}

export default FormCreate;
