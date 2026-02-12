import React from "react";
import NumberFormat from "react-number-format";
import Select from "react-select";
import { CmModal } from "../../generalcomponents/ui";

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

var inputStyle = {
  width: "100%",
  padding: "10px 14px",
  border: "1px solid #e2e5ea",
  borderRadius: "8px",
  fontSize: "14px",
  background: "#fcfcfd",
  outline: "none",
  boxSizing: "border-box",
};

var inputErrorStyle = Object.assign({}, inputStyle, {
  borderColor: "#dc3545",
  background: "#fff5f5",
});

var labelStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginBottom: "6px",
  fontSize: "14px",
  fontWeight: 500,
  color: "#374151",
};

var labelIconStyle = { color: "#6b7280", fontSize: "12px" };

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

    return (
      <CmModal
        isOpen={props.modal}
        toggle={props.toggle}
        size="lg"
        footer={null}
        hideHeader={true}
      >
        <div style={{
          margin: "-20px -24px -24px -24px",
          display: "flex",
          flexDirection: "column",
          maxHeight: "85vh",
        }}>
          {/* Header */}
          <div style={{
            background: "#fcfcfd",
            padding: "20px 32px",
            borderBottom: "1px solid #e9ecef",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{
                width: "48px",
                height: "48px",
                background: "linear-gradient(135deg, #f5a623 0%, #f7b731 100%)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(245, 166, 35, 0.3)",
              }}>
                <i className="fas fa-file-alt" style={{ color: "#fff", fontSize: "20px" }} />
              </div>
              <div>
                <h2 style={{ margin: "0 0 2px 0", fontSize: "18px", fontWeight: 600, color: "#333" }}>{title}</h2>
                <p style={{ margin: 0, fontSize: "12px", color: "#6c757d" }}>{subtitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={props.toggle}
              style={{
                width: "32px",
                height: "32px",
                border: "none",
                background: "#e9ecef",
                borderRadius: "50%",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6c757d",
                transition: "all 0.2s",
              }}
              onMouseOver={function(e) { e.currentTarget.style.background = "#dc3545"; e.currentTarget.style.color = "#fff"; }}
              onMouseOut={function(e) { e.currentTarget.style.background = "#e9ecef"; e.currentTarget.style.color = "#6c757d"; }}
            >
              <i className="fas fa-times" />
            </button>
          </div>

          {/* Form Content */}
          <div style={{ padding: "24px 32px", flex: 1, overflowY: "auto" }} className="cm-modal-scroll">
            {/* Error alert */}
            {props.errorValues === false && (
              <div style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                padding: "12px 16px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                color: "#dc2626",
                fontSize: "14px",
              }}>
                <i className="fa fa-exclamation-circle" style={{ fontSize: "16px" }} />
                <span>Debes completar todos los campos requeridos</span>
              </div>
            )}

            {/* Centro de costo - PRIMERO */}
            <div style={{ marginBottom: "16px" }}>
              <input type="hidden" name="cost_center_id" value={props.formAutocompleteCentro.value} />
              <label style={labelStyle}>
                <i className="fa fa-sitemap" style={labelIconStyle} />
                Centro de costo <span style={{ color: "#888", fontWeight: "normal", fontSize: "12px" }}>(escribe al menos 3 letras)</span> <span style={{ color: "#dc3545" }}>*</span>
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
                noOptionsMessage={() => this.state.centroSearchTerm.length < 3 ? "Escribe al menos 3 letras para buscar" : "No se encontraron resultados"}
              />
              {props.formValues.cost_center_id && (
                <p style={{ margin: "8px 0 0 0", fontSize: "12px", color: "#28a745" }}>
                  <i className="fa fa-check-circle" style={{ marginRight: "6px" }} />
                  Cliente y contacto cargados automáticamente del centro de costo
                </p>
              )}
            </div>

            {/* Cliente & Contacto - Se auto-llenan con el centro de costo */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <input type="hidden" name="customer_id" value={props.formAutocomplete.value} />
                <label style={labelStyle}>
                  <i className="fa fa-building" style={labelIconStyle} />
                  Cliente <span style={{ color: "#dc3545" }}>*</span>
                </label>
                <Select
                  onChange={props.onChangeAutocomplete}
                  options={props.clientes}
                  autoFocus={false}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                  value={props.formAutocomplete}
                  placeholder="Seleccione cliente"
                  isDisabled={!!props.formValues.cost_center_id}
                />
              </div>

              <div>
                <input type="hidden" name="contact_id" value={props.formAutocompleteContact.value} />
                <label style={labelStyle}>
                  <i className="fa fa-user" style={labelIconStyle} />
                  Contacto <span style={{ color: "#dc3545" }}>*</span>
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
                    style={{
                      display: "inline-block",
                      marginTop: "8px",
                      color: "#f5a623",
                      fontSize: "13px",
                      cursor: "pointer",
                      textDecoration: "none",
                    }}
                  >
                    + Crear contacto
                  </a>
                )}
              </div>
            </div>

            {/* Contact create form (collapsible) */}
            {props.create_state === false && props.formValues.customer_id && (
              <div className="collapse" id="collapseExample" style={{ marginBottom: "16px" }}>
                <div style={{
                  background: "#fafbfc",
                  border: "1px solid #e2e5ea",
                  borderRadius: "12px",
                  padding: "20px",
                }}>
                  <h4 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: 600, color: "#333" }}>
                    <i className="fa fa-user-plus" style={{ color: "#f5a623", marginRight: "8px" }} />
                    Crear nuevo contacto
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div>
                      <label style={labelStyle}>
                        <i className="fa fa-id-card" style={labelIconStyle} />
                        Nombre del Contacto
                      </label>
                      <input
                        name="contact_name"
                        type="text"
                        style={props.errorValuesContact === false && props.formContactValues.contact_name === "" ? inputErrorStyle : inputStyle}
                        value={props.formContactValues.contact_name}
                        onChange={props.onChangeFormContact}
                        placeholder="Nombre del Contacto"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>
                        <i className="fa fa-briefcase" style={labelIconStyle} />
                        Cargo del Contacto
                      </label>
                      <input
                        name="contact_position"
                        type="text"
                        style={props.errorValuesContact === false && props.formContactValues.contact_position === "" ? inputErrorStyle : inputStyle}
                        value={props.formContactValues.contact_position}
                        onChange={props.onChangeFormContact}
                        placeholder="Cargo del Contacto"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>
                        <i className="fa fa-phone" style={labelIconStyle} />
                        Teléfono del Contacto
                      </label>
                      <input
                        name="contact_phone"
                        type="number"
                        style={props.errorValuesContact === false && props.formContactValues.contact_phone === "" ? inputErrorStyle : inputStyle}
                        value={props.formContactValues.contact_phone}
                        onChange={props.onChangeFormContact}
                        placeholder="Teléfono del Contacto"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>
                        <i className="fa fa-envelope" style={labelIconStyle} />
                        Email del Contacto
                      </label>
                      <input
                        name="contact_email"
                        type="email"
                        style={props.errorValuesContact === false && props.formContactValues.contact_email === "" ? inputErrorStyle : inputStyle}
                        value={props.formContactValues.contact_email}
                        onChange={props.onChangeFormContact}
                        placeholder="Email del Contacto"
                      />
                    </div>
                  </div>
                  <div style={{ textAlign: "right", marginTop: "16px" }}>
                    <button
                      type="button"
                      onClick={props.FormSubmitContact}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 16px",
                        fontSize: "13px",
                        fontWeight: 500,
                        borderRadius: "8px",
                        cursor: "pointer",
                        border: "none",
                        background: "linear-gradient(135deg, #f5a623 0%, #f7b731 100%)",
                        color: "#fff",
                      }}
                    >
                      <i className="fa fa-plus" /> Crear Contacto
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Divider */}
            <div style={{ borderTop: "1px solid #e9ecef", margin: "20px 0" }} />

            {/* Fecha y Responsable */}
            <div style={{ display: "grid", gridTemplateColumns: props.estados.responsible ? "1fr 1fr" : "1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={labelStyle}>
                  <i className="fa fa-calendar-alt" style={labelIconStyle} />
                  Fecha del reporte <span style={{ color: "#dc3545" }}>*</span>
                </label>
                <input
                  type="date"
                  name="report_date"
                  value={props.formValues.report_date}
                  onChange={props.onChangeForm}
                  style={props.errorValues === false && props.formValues.report_date === "" ? inputErrorStyle : inputStyle}
                  autoComplete="off"
                />
              </div>

              {props.estados.responsible === true && (
                <div>
                  <label style={labelStyle}>
                    <i className="fa fa-user-tie" style={labelIconStyle} />
                    Responsable de Ejecución
                  </label>
                  <select
                    name="report_execute_id"
                    value={props.formValues.report_execute_id}
                    onChange={props.onChangeForm}
                    style={props.errorValues === false && props.formValues.report_execute_id === "" ? inputErrorStyle : inputStyle}
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={labelStyle}>
                  <i className="fa fa-clock" style={labelIconStyle} />
                  Tiempo de Trabajo (Horas) <span style={{ color: "#dc3545" }}>*</span>
                </label>
                <input
                  name="working_time"
                  type="text"
                  style={props.errorValues === false && props.formValues.working_time === "" ? inputErrorStyle : inputStyle}
                  value={props.formValues.working_time}
                  onChange={props.onChangeForm}
                  placeholder="Horas trabajadas"
                />
              </div>

              <div>
                <label style={labelStyle}>
                  <i className="fa fa-car" style={labelIconStyle} />
                  Horas de desplazamiento <span style={{ color: "#dc3545" }}>*</span>
                </label>
                <input
                  name="displacement_hours"
                  type="number"
                  style={props.errorValues === false && props.formValues.displacement_hours === "" ? inputErrorStyle : inputStyle}
                  value={props.formValues.displacement_hours}
                  onChange={props.onChangeForm}
                  placeholder="Horas de desplazamiento"
                />
              </div>
            </div>

            {/* Descripción del trabajo */}
            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>
                <i className="fa fa-align-left" style={labelIconStyle} />
                Descripción del trabajo
              </label>
              <textarea
                name="work_description"
                style={Object.assign({}, props.errorValues === false && props.formValues.work_description === "" ? inputErrorStyle : inputStyle, { resize: "vertical", minHeight: "100px" })}
                value={props.formValues.work_description}
                onChange={props.onChangeForm}
                rows="4"
                placeholder="Descripción del trabajo realizado..."
              />
            </div>

            {/* Viatics section */}
            {props.estados.viatics && (
              <React.Fragment>
                <div style={{ borderTop: "1px solid #e9ecef", margin: "20px 0" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={labelStyle}>
                      <i className="fa fa-dollar-sign" style={labelIconStyle} />
                      Valor de viáticos <span style={{ color: "#dc3545" }}>*</span>
                    </label>
                    <NumberFormat
                      name="viatic_value"
                      thousandSeparator={true}
                      prefix="$"
                      style={props.errorValues === false && props.formValues.viatic_value === "" ? inputErrorStyle : inputStyle}
                      value={props.formValues.viatic_value}
                      onChange={props.onChangeForm}
                      placeholder="$0"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>
                      <i className="fa fa-sticky-note" style={labelIconStyle} />
                      Descripción viáticos
                    </label>
                    <textarea
                      name="viatic_description"
                      style={Object.assign({}, inputStyle, { resize: "vertical", minHeight: "100px" })}
                      value={props.formValues.viatic_description}
                      onChange={props.onChangeForm}
                      rows="4"
                      placeholder="Descripción de los viáticos..."
                    />
                  </div>
                </div>
              </React.Fragment>
            )}

          </div>

          {/* Footer */}
          <div style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            padding: "16px 32px",
            background: "#fcfcfd",
            borderTop: "1px solid #e9ecef",
            flexShrink: 0,
          }}>
            <button
              type="button"
              onClick={props.toggle}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: 500,
                borderRadius: "8px",
                cursor: "pointer",
                border: "1px solid #dee2e6",
                background: "#fff",
                color: "#6c757d",
              }}
            >
              <i className="fas fa-times" /> Cancelar
            </button>
            <button
              type="button"
              onClick={props.submit}
              disabled={props.isLoading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: 500,
                borderRadius: "8px",
                cursor: props.isLoading ? "not-allowed" : "pointer",
                border: "none",
                background: "linear-gradient(135deg, #f5a623 0%, #f7b731 100%)",
                color: "#fff",
                opacity: props.isLoading ? 0.7 : 1,
              }}
            >
              {props.isLoading ? (
                <React.Fragment><i className="fas fa-spinner fa-spin" /> Guardando...</React.Fragment>
              ) : (
                <React.Fragment><i className="fas fa-save" /> {props.nameSubmit}</React.Fragment>
              )}
            </button>
          </div>
        </div>
      </CmModal>
    );
  }
}

export default FormCreate;
