import React from "react";
import NumberFormat from "react-number-format";
import Select from "react-select";
import { CmModal } from "../../generalcomponents/ui";

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
    this.state = {
      centroSearchTerm: "",
      isCentroLoading: false,
    };
    this.debounceTimer = null;
  }

  handleCentroInputChange = (inputValue, { action }) => {
    if (action === "input-change") {
      this.setState({ centroSearchTerm: inputValue });

      if (inputValue.length >= 2) {
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
    const { props } = this;

    const footer = (
      <div className="cm-modal-footer-buttons">
        <button className="cm-btn cm-btn-outline" onClick={props.toggle}>
          Cancelar
        </button>
        <button
          className="cm-btn cm-btn-accent"
          onClick={props.submit}
          disabled={props.isLoading}
        >
          <i className="fa fa-save" style={{ marginRight: 6 }}></i>
          {props.isLoading ? "Guardando..." : props.nameSubmit}
        </button>
      </div>
    );

    return (
      <CmModal
        isOpen={props.modal}
        toggle={props.toggle}
        title={
          <span>
            <i className="fa fa-file-alt" style={{ marginRight: 10, color: "#f5a623" }}></i>
            {props.titulo}
          </span>
        }
        size="lg"
        footer={footer}
      >
        {/* Error alert */}
        {props.errorValues === false && (
          <div className="cm-form-errors" style={{ marginBottom: 16 }}>
            <b>Debes de completar todos los campos requeridos</b>
          </div>
        )}

        {/* Cliente & Contacto */}
        <div className="cm-form-grid-2">
          <div className="cm-form-group">
            <input type="hidden" name="customer_id" value={props.formAutocomplete.value} />
            <label className="cm-label">
              <i className="fa fa-building"></i> Cliente <small className="validate-label">*</small>
            </label>
            <Select
              onChange={props.onChangeAutocomplete}
              options={props.clientes}
              autoFocus={false}
              styles={selectStyles}
              menuPortalTarget={document.body}
              className={props.errorValues === false && props.formValues.customer_id === "" ? "error-class" : ""}
              value={props.formAutocomplete}
              placeholder="Seleccione un cliente"
            />
          </div>

          <div className="cm-form-group">
            <input type="hidden" name="contact_id" value={props.formAutocompleteContact.value} />
            <label className="cm-label">
              <i className="fa fa-user"></i> Contacto <small className="validate-label">*</small>
            </label>
            <Select
              onChange={props.onChangeAutocompleteContact}
              options={props.contacto}
              autoFocus={false}
              styles={selectStyles}
              menuPortalTarget={document.body}
              className={props.errorValues === false && props.formValues.contact_id === "" ? "error-class" : ""}
              value={props.formAutocompleteContact}
              placeholder="Seleccione un contacto"
            />
            {props.create_state === false && (
              <a
                data-toggle="collapse"
                href="#collapseExample"
                aria-expanded="false"
                aria-controls="collapseExample"
                className="cm-link-create"
              >
                + Crear contacto
              </a>
            )}
          </div>
        </div>

        {/* Centro de costo */}
        <div className="cm-form-group">
          <input type="hidden" name="cost_center_id" value={props.formAutocompleteCentro.value} />
          <label className="cm-label">
            <i className="fa fa-sitemap"></i> Centro de costo <small style={{ color: "#888", fontWeight: "normal" }}>(escribe al menos 2 letras)</small> <small className="validate-label">*</small>
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
            placeholder="Centro de costos"
            noOptionsMessage={() => this.state.centroSearchTerm.length < 2 ? "Escribe al menos 2 letras para buscar" : "No se encontraron resultados"}
          />
        </div>

        {/* Contact create form (collapsible) */}
        {props.create_state === false && (
          <div className="collapse" id="collapseExample" style={{ marginTop: 16 }}>
            <div className="cm-form-section-card">
              <div className="cm-form-grid-2">
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-id-card"></i> Nombre del Contacto
                  </label>
                  <input
                    name="contact_name"
                    type="text"
                    className={"cm-input" + (props.errorValuesContact === false && props.formContactValues.contact_name === "" ? " error-class" : "")}
                    value={props.formContactValues.contact_name}
                    onChange={props.onChangeFormContact}
                    placeholder="Nombre del Contacto"
                  />
                </div>
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-briefcase"></i> Cargo del Contacto
                  </label>
                  <input
                    name="contact_position"
                    type="text"
                    className={"cm-input" + (props.errorValuesContact === false && props.formContactValues.contact_position === "" ? " error-class" : "")}
                    value={props.formContactValues.contact_position}
                    onChange={props.onChangeFormContact}
                    placeholder="Cargo del Contacto"
                  />
                </div>
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-phone"></i> Telefono del Contacto
                  </label>
                  <input
                    name="contact_phone"
                    type="number"
                    className={"cm-input" + (props.errorValuesContact === false && props.formContactValues.contact_phone === "" ? " error-class" : "")}
                    value={props.formContactValues.contact_phone}
                    onChange={props.onChangeFormContact}
                    placeholder="Telefono del Contacto"
                  />
                </div>
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-envelope"></i> Email del Contacto
                  </label>
                  <input
                    name="contact_email"
                    type="email"
                    className={"cm-input" + (props.errorValuesContact === false && props.formContactValues.contact_email === "" ? " error-class" : "")}
                    value={props.formContactValues.contact_email}
                    onChange={props.onChangeFormContact}
                    placeholder="Email del Contacto"
                  />
                </div>
              </div>
              <div style={{ textAlign: "right", marginTop: 12 }}>
                <button
                  className="cm-btn cm-btn-secondary"
                  onClick={props.FormSubmitContact}
                  type="button"
                >
                  <i className="fa fa-plus" style={{ marginRight: 6 }}></i>
                  {props.nameSubmit} Contacto
                </button>
              </div>
            </div>
          </div>
        )}

        <hr className="cm-divider" />

        {/* Fecha y Responsable */}
        <div className="cm-form-grid-2">
          <div className="cm-form-group">
            <label className="cm-label">
              <i className="fa fa-calendar-alt"></i> Fecha del reporte <small className="validate-label">*</small>
            </label>
            <input
              type="date"
              name="report_date"
              value={props.formValues.report_date}
              onChange={props.onChangeForm}
              className={"cm-input" + (props.errorValues === false && props.formValues.report_date === "" ? " error-class" : "")}
              autoComplete="off"
            />
          </div>

          {props.estados.responsible === true && (
            <div className="cm-form-group">
              <label className="cm-label">
                <i className="fa fa-user-tie"></i> Responsable de Ejecucion
              </label>
              <select
                name="report_execute_id"
                value={props.formValues.report_execute_id}
                onChange={props.onChangeForm}
                className={"cm-input" + (props.errorValues === false && props.formValues.report_execute_id === "" ? " error-class" : "")}
              >
                <option value="">Seleccione un nombre</option>
                {props.users.map((item) => (
                  <option key={item.id} value={item.id}>{item.names}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <hr className="cm-divider" />

        {/* Tiempo de Trabajo y Descripcion */}
        <div className="cm-form-grid-2">
          <div className="cm-form-group">
            <label className="cm-label">
              <i className="fa fa-clock"></i> Tiempo de Trabajo (Horas) <small className="validate-label">*</small>
            </label>
            <input
              name="working_time"
              type="text"
              className={"cm-input" + (props.errorValues === false && props.formValues.working_time === "" ? " error-class" : "")}
              value={props.formValues.working_time}
              onChange={props.onChangeForm}
              placeholder="Ej: 8"
            />
          </div>

          <div className="cm-form-group">
            <label className="cm-label">
              <i className="fa fa-car"></i> Horas de desplazamiento <small className="validate-label">*</small>
            </label>
            <input
              name="displacement_hours"
              type="number"
              className={"cm-input" + (props.errorValues === false && props.formValues.displacement_hours === "" ? " error-class" : "")}
              value={props.formValues.displacement_hours}
              onChange={props.onChangeForm}
              placeholder="Horas de desplazamiento"
            />
          </div>
        </div>

        <div className="cm-form-group">
          <label className="cm-label">
            <i className="fa fa-align-left"></i> Descripcion del trabajo
          </label>
          <textarea
            name="work_description"
            className={"cm-input cm-textarea" + (props.errorValues === false && props.formValues.work_description === "" ? " error-class" : "")}
            value={props.formValues.work_description}
            onChange={props.onChangeForm}
            rows="4"
            placeholder="Descripcion del trabajo realizado..."
          />
        </div>

        {/* Viatics section */}
        {props.estados.viatics && (
          <div className="cm-viatics-section">
            <hr className="cm-divider" />
            <div className="cm-form-grid-2">
              <div className="cm-form-group">
                <label className="cm-label">
                  <i className="fa fa-dollar-sign"></i> Valor de viaticos <small className="validate-label">*</small>
                </label>
                <NumberFormat
                  name="viatic_value"
                  thousandSeparator={true}
                  prefix="$"
                  className={"cm-input" + (props.errorValues === false && props.formValues.viatic_value === "" ? " error-class" : "")}
                  value={props.formValues.viatic_value}
                  onChange={props.onChangeForm}
                  placeholder="$0"
                />
              </div>
              <div className="cm-form-group">
                <label className="cm-label">
                  <i className="fa fa-sticky-note"></i> Descripcion viaticos
                </label>
                <textarea
                  name="viatic_description"
                  className="cm-input cm-textarea"
                  value={props.formValues.viatic_description}
                  onChange={props.onChangeForm}
                  rows="4"
                  placeholder="Descripcion de los viaticos..."
                />
              </div>
            </div>
          </div>
        )}

        <style>{`
          .cm-form-grid-2 {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin-bottom: 16px;
          }
          @media (max-width: 768px) {
            .cm-form-grid-2 {
              grid-template-columns: 1fr;
            }
          }
          .cm-form-group {
            margin-bottom: 16px;
          }
          .cm-label {
            display: block;
            font-weight: 400;
            color: #333;
            margin-bottom: 6px;
            font-size: 14px;
          }
          .cm-label i {
            color: #f5a623;
            margin-right: 6px;
            width: 16px;
          }
          .cm-input {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #e2e5ea;
            border-radius: 8px;
            font-size: 14px;
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
          .cm-input.error-class {
            border-color: #dc3545;
            background: #fff8f8;
          }
          .cm-textarea {
            resize: vertical;
            min-height: 80px;
          }
          .cm-divider {
            border: none;
            border-top: 1px solid #e2e5ea;
            margin: 20px 0;
          }
          .cm-link-create {
            display: inline-block;
            margin-top: 8px;
            color: #f5a623;
            font-size: 13px;
            cursor: pointer;
            text-decoration: none;
          }
          .cm-link-create:hover {
            color: #d4890a;
            text-decoration: underline;
          }
          .cm-form-section-card {
            background: #fafbfc;
            border: 1px solid #e2e5ea;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
          }
          .cm-modal-footer-buttons {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
          }
          .cm-btn {
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
          }
          .cm-btn-outline {
            background: #fff;
            border: 1px solid #e2e5ea;
            color: #666;
          }
          .cm-btn-outline:hover {
            background: #f8f9fa;
            border-color: #ccc;
          }
          .cm-btn-accent {
            background: linear-gradient(135deg, #f5a623 0%, #f39c12 100%);
            color: #fff;
          }
          .cm-btn-accent:hover {
            background: linear-gradient(135deg, #e6951a 0%, #d68910 100%);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(245, 166, 35, 0.3);
          }
          .cm-btn-accent:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
          }
          .cm-btn-secondary {
            background: #6c757d;
            color: #fff;
          }
          .cm-btn-secondary:hover {
            background: #5a6268;
          }
          .cm-form-errors {
            background: #fff3f3;
            border: 1px solid #ffcdd2;
            color: #c62828;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
          }
          .validate-label {
            color: #dc3545;
          }
        `}</style>
      </CmModal>
    );
  }
}

export default FormCreate;
