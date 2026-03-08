import React from "react";
import NumberFormat from "react-number-format";
import Select from "react-select";
import { Modal, ModalBody } from "reactstrap";

var selectStyles = {
  control: function(base, state) {
    return Object.assign({}, base, {
      background: "#fcfcfd",
      borderColor: state.isFocused ? "#f5a623" : "#e2e5ea",
      boxShadow: state.isFocused ? "0 0 0 3px rgba(245, 166, 35, 0.15)" : "none",
      borderRadius: "8px",
      padding: "2px 4px",
      fontSize: "14px",
    });
  },
  option: function(base, state) {
    return Object.assign({}, base, {
      backgroundColor: state.isSelected ? "#f5a623" : state.isFocused ? "#fff3e0" : "#fff",
      color: state.isSelected ? "#fff" : "#333",
      fontSize: "14px",
    });
  },
  menuPortal: function(base) { return Object.assign({}, base, { zIndex: 9999 }); },
};

class FormCreate extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      centroSearchTerm: "",
      isCentroLoading: false,
    };
    this.debounceTimer = null;
  }

  handleCentroInputChange = (inputValue, action) => {
    if (action.action === "input-change") {
      this.setState({ centroSearchTerm: inputValue });

      if (inputValue.length >= 3) {
        this.setState({ isCentroLoading: true });

        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
          if (this.props.onSearchCentro) {
            this.props.onSearchCentro(inputValue);
          }
          this.setState({ isCentroLoading: false });
        }, 300);
      }
    }
    return inputValue;
  };

  componentWillUnmount() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }

  render() {
    var props = this.props;
    var isNew = props.titulo === "Nuevo Reporte";
    var title = props.titulo;
    var subtitle = isNew ? "Complete los datos del nuevo reporte de servicio" : "Modifique los datos del reporte de servicio";

    var hasError = function(field) {
      return props.errorValues === false && props.formValues[field] === "";
    };

    return (
      <React.Fragment>
        <Modal
          returnFocusAfterClose={true}
          isOpen={props.modal}
          className="modal-dialog-centered modal-lg"
          toggle={props.toggle}
          backdrop="static"
        >
          <div className="cm-modal-container">
            <div className="cm-modal-header">
              <div className="cm-modal-header-content">
                <div className="cm-modal-icon">
                  <i className="fas fa-file-alt"></i>
                </div>
                <div>
                  <h2 className="cm-modal-title">{title}</h2>
                  <p className="cm-modal-subtitle">{subtitle}</p>
                </div>
              </div>
              <button type="button" className="cm-modal-close" onClick={props.toggle}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={function(e) { e.preventDefault(); }}>
              <ModalBody className="cm-modal-body cm-modal-scroll">
                {/* Error alert */}
                {props.errorValues === false && (
                  <div className="cm-alert cm-alert-error">
                    <i className="fa fa-exclamation-circle"></i>
                    <span>Debes completar todos los campos requeridos</span>
                  </div>
                )}

                {/* Centro de costo */}
                {!props.cost_center_id && (
                  <div className="cm-form-group">
                    <input type="hidden" name="cost_center_id" value={props.formAutocompleteCentro.value} />
                    <label className="cm-label">
                      <i className="fa fa-sitemap"></i> Centro de costo <span className="cm-hint">(escribe al menos 3 letras)</span> <span className="cm-required">*</span>
                    </label>
                    <Select
                      onChange={props.onChangeAutocompleteCentro}
                      onInputChange={this.handleCentroInputChange}
                      options={props.centro}
                      autoFocus={false}
                      styles={selectStyles}
                      menuPortalTarget={document.body}
                      isLoading={this.state.isCentroLoading}
                      value={props.formAutocompleteCentro}
                      placeholder="Buscar centro de costo..."
                      noOptionsMessage={function() { return this.state.centroSearchTerm.length < 3 ? "Escribe al menos 3 letras para buscar" : "No se encontraron resultados"; }.bind(this)}
                    />
                    {props.formValues.cost_center_id && (
                      <p style={{ margin: "8px 0 0 0", fontSize: "12px", color: "#28a745" }}>
                        <i className="fa fa-check-circle" style={{ marginRight: "6px" }} />
                        Cliente y contacto cargados automáticamente del centro de costo
                      </p>
                    )}
                  </div>
                )}

                {/* Cliente & Contacto */}
                <div className="cm-form-grid-2">
                  <div className="cm-form-group">
                    <input type="hidden" name="customer_id" value={props.formAutocomplete.value} />
                    <label className="cm-label">
                      <i className="fa fa-building"></i> Cliente <span className="cm-required">*</span>
                    </label>
                    <Select
                      onChange={props.onChangeAutocomplete}
                      options={props.clientes}
                      autoFocus={false}
                      styles={selectStyles}
                      menuPortalTarget={document.body}
                      value={props.formAutocomplete}
                      placeholder="Seleccione cliente"
                      isDisabled={!!props.cost_center_id}
                    />
                  </div>

                  <div className="cm-form-group">
                    <input type="hidden" name="contact_id" value={props.formAutocompleteContact.value} />
                    <label className="cm-label">
                      <i className="fa fa-user"></i> Contacto <span className="cm-required">*</span>
                    </label>
                    <Select
                      onChange={props.onChangeAutocompleteContact}
                      options={props.contacto}
                      autoFocus={false}
                      styles={selectStyles}
                      menuPortalTarget={document.body}
                      value={props.formAutocompleteContact}
                      placeholder="Seleccionar Contacto"
                    />
                    {props.create_state === false && props.formValues.customer_id && (
                      <a
                        data-toggle="collapse"
                        href="#collapseExample"
                        aria-expanded="false"
                        aria-controls="collapseExample"
                        style={{ display: "inline-block", marginTop: "8px", color: "#f5a623", fontSize: "13px", cursor: "pointer", textDecoration: "none" }}
                      >
                        + Crear contacto
                      </a>
                    )}
                  </div>
                </div>

                {/* Contact create form (collapsible) */}
                {props.create_state === false && props.formValues.customer_id && (
                  <div className="collapse" id="collapseExample" style={{ marginBottom: "16px" }}>
                    <div style={{ background: "#fafbfc", border: "1px solid #e2e5ea", borderRadius: "12px", padding: "20px" }}>
                      <h4 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: 600, color: "#333" }}>
                        <i className="fa fa-user-plus" style={{ color: "#f5a623", marginRight: "8px" }} />
                        Crear nuevo contacto
                      </h4>
                      <div className="cm-form-grid-2">
                        <div className="cm-form-group">
                          <label className="cm-label"><i className="fa fa-id-card"></i> Nombre del Contacto</label>
                          <input name="contact_name" type="text" className={"cm-input" + (props.errorValuesContact === false && props.formContactValues.contact_name === "" ? " cm-input-error" : "")} value={props.formContactValues.contact_name} onChange={props.onChangeFormContact} placeholder="Nombre del Contacto" />
                        </div>
                        <div className="cm-form-group">
                          <label className="cm-label"><i className="fa fa-briefcase"></i> Cargo del Contacto</label>
                          <input name="contact_position" type="text" className={"cm-input" + (props.errorValuesContact === false && props.formContactValues.contact_position === "" ? " cm-input-error" : "")} value={props.formContactValues.contact_position} onChange={props.onChangeFormContact} placeholder="Cargo del Contacto" />
                        </div>
                        <div className="cm-form-group">
                          <label className="cm-label"><i className="fa fa-phone"></i> Teléfono del Contacto</label>
                          <input name="contact_phone" type="number" className={"cm-input" + (props.errorValuesContact === false && props.formContactValues.contact_phone === "" ? " cm-input-error" : "")} value={props.formContactValues.contact_phone} onChange={props.onChangeFormContact} placeholder="Teléfono del Contacto" />
                        </div>
                        <div className="cm-form-group">
                          <label className="cm-label"><i className="fa fa-envelope"></i> Email del Contacto</label>
                          <input name="contact_email" type="email" className={"cm-input" + (props.errorValuesContact === false && props.formContactValues.contact_email === "" ? " cm-input-error" : "")} value={props.formContactValues.contact_email} onChange={props.onChangeFormContact} placeholder="Email del Contacto" />
                        </div>
                      </div>
                      <div style={{ textAlign: "right", marginTop: "16px" }}>
                        <button type="button" onClick={props.FormSubmitContact} className="cm-btn cm-btn-submit">
                          <i className="fa fa-plus"></i> Crear Contacto
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Divider */}
                <div style={{ borderTop: "1px solid #e9ecef", margin: "20px 0" }} />

                {/* Fecha y Responsable */}
                <div className={props.estados.responsible ? "cm-form-grid-2" : ""}>
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-calendar-alt"></i> Fecha del reporte <span className="cm-required">*</span>
                    </label>
                    <input
                      type="date"
                      name="report_date"
                      value={props.formValues.report_date}
                      onChange={props.onChangeForm}
                      className={"cm-input" + (hasError("report_date") ? " cm-input-error" : "")}
                      autoComplete="off"
                    />
                  </div>

                  {props.estados.responsible === true && (
                    <div className="cm-form-group">
                      <label className="cm-label">
                        <i className="fa fa-user-tie"></i> Responsable de Ejecución
                      </label>
                      <select
                        name="report_execute_id"
                        value={props.formValues.report_execute_id}
                        onChange={props.onChangeForm}
                        className={"cm-input" + (hasError("report_execute_id") ? " cm-input-error" : "")}
                      >
                        <option value="">Seleccione un nombre</option>
                        {props.users.map(function(item) {
                          return <option key={item.id} value={item.id}>{item.names}</option>;
                        })}
                      </select>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div style={{ borderTop: "1px solid #e9ecef", margin: "20px 0" }} />

                {/* Tiempo de Trabajo y Horas de desplazamiento */}
                <div className="cm-form-grid-2">
                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-clock"></i> Tiempo de Trabajo (Horas) <span className="cm-required">*</span>
                    </label>
                    <input
                      name="working_time"
                      type="text"
                      className={"cm-input" + (hasError("working_time") ? " cm-input-error" : "")}
                      value={props.formValues.working_time}
                      onChange={props.onChangeForm}
                      placeholder="Horas trabajadas"
                    />
                  </div>

                  <div className="cm-form-group">
                    <label className="cm-label">
                      <i className="fa fa-car"></i> Horas de desplazamiento <span className="cm-required">*</span>
                    </label>
                    <input
                      name="displacement_hours"
                      type="number"
                      className={"cm-input" + (hasError("displacement_hours") ? " cm-input-error" : "")}
                      value={props.formValues.displacement_hours}
                      onChange={props.onChangeForm}
                      placeholder="Horas de desplazamiento"
                    />
                  </div>
                </div>

                {/* Descripción del trabajo */}
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-align-left"></i> Descripción del trabajo
                  </label>
                  <textarea
                    name="work_description"
                    className={"cm-input" + (hasError("work_description") ? " cm-input-error" : "")}
                    value={props.formValues.work_description}
                    onChange={props.onChangeForm}
                    rows="4"
                    placeholder="Descripción del trabajo realizado..."
                    style={{ resize: "vertical", minHeight: "100px" }}
                  />
                </div>

                {/* Viatics section */}
                {props.estados.viatics && (
                  <React.Fragment>
                    <div style={{ borderTop: "1px solid #e9ecef", margin: "20px 0" }} />
                    <div className="cm-form-grid-2">
                      <div className="cm-form-group">
                        <label className="cm-label">
                          <i className="fa fa-dollar-sign"></i> Valor de viáticos <span className="cm-required">*</span>
                        </label>
                        <NumberFormat
                          name="viatic_value"
                          thousandSeparator={true}
                          prefix="$"
                          className={"cm-input" + (hasError("viatic_value") ? " cm-input-error" : "")}
                          value={props.formValues.viatic_value}
                          onChange={props.onChangeForm}
                          placeholder="$0"
                        />
                      </div>
                      <div className="cm-form-group">
                        <label className="cm-label">
                          <i className="fa fa-sticky-note"></i> Descripción viáticos
                        </label>
                        <textarea
                          name="viatic_description"
                          className="cm-input"
                          value={props.formValues.viatic_description}
                          onChange={props.onChangeForm}
                          rows="4"
                          placeholder="Descripción de los viáticos..."
                          style={{ resize: "vertical", minHeight: "100px" }}
                        />
                      </div>
                    </div>
                  </React.Fragment>
                )}
              </ModalBody>

              <div className="cm-modal-footer">
                <button type="button" className="cm-btn cm-btn-cancel" onClick={props.toggle}>
                  <i className="fas fa-times"></i> Cancelar
                </button>
                <button type="button" className="cm-btn cm-btn-submit" onClick={props.submit} disabled={props.isLoading}>
                  {props.isLoading ? (
                    <React.Fragment><i className="fas fa-spinner fa-spin"></i> Guardando...</React.Fragment>
                  ) : (
                    <React.Fragment><i className="fas fa-save"></i> {props.nameSubmit}</React.Fragment>
                  )}
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
