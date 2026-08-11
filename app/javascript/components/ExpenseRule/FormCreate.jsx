import React, { Component } from 'react';
import NumberFormat from "react-number-format";
import Select from "react-select";
import { CmModal, CmButton } from "../../generalcomponents/ui";

// Copiado de ShowConstCenter/BudgetFormCreate.jsx:9-27, que a su vez lo copio
// de ReportExpense/FormCreate.jsx. No se importa de ninguno de los dos a
// proposito: esos archivos exportan el componente, no los estilos, y sacar el
// objeto a un modulo compartido obligaria a tocar archivos de otros paquetes.
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

// Modal de alta/edicion de una regla de gastos. PRESENTACIONAL: no valida, no
// llama al servidor y no decide nada. El motivo de bloqueo lo calcula el padre
// (index.jsx#blockReason) y aqui solo se pinta, para que la regla exista UNA
// sola vez y no dos que se desincronizan.
//
// LO QUE ESTE FORMULARIO TIENE QUE ENSENAR, Y NO ES DECORACION:
//
//   1. El multi-select vacio significa NINGUN usuario, no todos. Es la
//      confusion obvia de quien administra, y por eso el aviso esta AL LADO del
//      campo, en la pantalla, no en un manual que nadie abre.
//   2. Las instrucciones para el agente son texto en español para una persona
//      (bueno, para un modelo que lee como una persona), NO reglas de fecha ni
//      de monto: esas tienen sus propios campos y las evalua el servidor. Si
//      alguien escribe ahi "no aceptar facturas de mas de 30 dias", ese limite
//      NO se aplica a los gastos que entran por la web.
class ExpenseRuleFormCreate extends Component {
  render() {
    var p = this.props;
    var f = p.formValues || {};

    return (
      <CmModal
        isOpen={p.modal}
        toggle={p.toggle}
        size="lg"
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <i className="fa fa-gavel" style={{ color: "#f5a623" }} />
            {p.title}
          </div>
        }
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <CmButton variant="outline" onClick={p.toggle} data-testid="rule-cancel">
              <i className="fa fa-times" /> Cancelar
            </CmButton>
            {/* CmButton reenvia `...rest` al <button>, asi que `disabled` y
                `data-testid` llegan al DOM. */}
            <CmButton variant="accent" onClick={p.submitForm}
                      disabled={!!p.saving || !!p.blockReason}
                      data-testid="rule-submit">
              {p.saving
                ? <span><i className="fa fa-spinner fa-spin" /> Guardando…</span>
                : <span><i className="fa fa-save" /> {p.nameBnt}</span>}
            </CmButton>
          </div>
        }
      >
        {/* --- Identificacion --------------------------------------------- */}
        <div className="cm-form-grid-1">
          <div className="cm-form-group">
            <label className="cm-label">
              <i className="fa fa-tag" /> Nombre de la regla <span className="cm-required">*</span>
            </label>
            <input
              type="text"
              name="name"
              className="cm-input"
              value={f.name || ""}
              onChange={p.onChangeForm}
              placeholder="Regla general, Regla directivos…"
              data-testid="rule-name"
            />
          </div>
        </div>

        <div className="cm-form-grid-2">
          <div className="cm-form-group">
            <label className="cm-label">
              <input type="checkbox" name="active" checked={!!f.active}
                     onChange={p.onToggleBool} data-testid="rule-active" />
              {" "}Regla activa
            </label>
            <div className="cm-field-hint">
              Desactivarla la archiva sin borrarla: deja de aplicar, pero se conserva el histórico.
            </div>
          </div>

          <div className="cm-form-group">
            <label className="cm-label">
              <input type="checkbox" name="is_default" checked={!!f.is_default}
                     onChange={p.onToggleBool} data-testid="rule-is-default" />
              {" "}Es la regla por defecto
            </label>
            <div className="cm-field-hint">
              Aplica a <b>todo el que no tenga ninguna regla asignada</b>. Solo puede haber una regla
              por defecto activa a la vez.
            </div>
          </div>
        </div>

        {/* --- Limites deterministas --------------------------------------- */}
        <div className="cm-form-section" style={{ marginTop: 16 }}>
          <div className="cm-form-section-title">
            <i className="fa fa-shield-alt" /> Límites que verifica el sistema
          </div>
          <div className="cm-field-hint" style={{ marginBottom: 12 }}>
            Estos tres los revisa el servidor siempre, entren los gastos por la web o por WhatsApp.
            Una violación nunca impide guardar el gasto, pero lo deja marcado y sin aprobación
            automática de presupuesto.
          </div>

          <div className="cm-form-grid-2">
            <div className="cm-form-group">
              <label className="cm-label"><i className="fa fa-calendar-alt" /> Antigüedad máxima del comprobante</label>
              <input
                type="number"
                name="max_invoice_age_days"
                min="1"
                className="cm-input"
                value={f.max_invoice_age_days === null || f.max_invoice_age_days === undefined ? "" : f.max_invoice_age_days}
                onChange={p.onChangeForm}
                placeholder="Días (vacío = sin límite)"
                data-testid="rule-max-age"
              />
              <div className="cm-field-hint">
                En días, contra la fecha de hoy. <b>Vacío significa sin límite de antigüedad.</b>
              </div>
            </div>

            <div className="cm-form-group">
              <label className="cm-label"><i className="fa fa-dollar-sign" /> Tope de valor del comprobante</label>
              <NumberFormat
                name="max_invoice_value"
                thousandSeparator={true}
                prefix={"$"}
                className="cm-input"
                value={f.max_invoice_value === null || f.max_invoice_value === undefined ? "" : f.max_invoice_value}
                onChange={p.onChangeMoney}
                placeholder="$ (vacío = sin tope)"
                data-testid="rule-max-value"
              />
              <div className="cm-field-hint">
                El tope es inclusivo: un gasto por el valor exacto <b>no</b> viola la regla.
                <b> Vacío significa sin tope.</b>
              </div>
            </div>
          </div>

          <div className="cm-form-grid-1">
            <div className="cm-form-group">
              <label className="cm-label">
                <input type="checkbox" name="check_duplicates" checked={!!f.check_duplicates}
                       onChange={p.onToggleBool} data-testid="rule-check-duplicates" />
                {" "}Validar comprobantes duplicados
              </label>
              <div className="cm-field-hint">
                Marca el gasto cuando ya existe otro con el mismo número de factura y el mismo NIT
                de proveedor. Si alguno de los dos datos viene vacío, no se evalúa.
              </div>
            </div>
          </div>
        </div>

        {/* --- Regla semantica --------------------------------------------- */}
        <div className="cm-form-section" style={{ marginTop: 16 }}>
          <div className="cm-form-section-title">
            <i className="fa fa-comments" /> Instrucciones para el agente de WhatsApp
          </div>

          {/* ESTA AYUDA NO ES OPCIONAL. Quien llena el campo tiene que entender
              que escribe para que lo LEA un agente, y que las reglas de fecha y
              de monto NO van aqui: tienen sus campos arriba. */}
          <div className="cm-alert cm-alert-info" data-testid="rule-agent-help"
               style={{ marginBottom: 12 }}>
            <i className="fa fa-info-circle" />{" "}
            <span>
              Esto se le pasa al agente de WhatsApp para que lo interprete;
              escríbelo como se lo dirías a una persona. Aquí <b>no</b> van reglas de fecha ni de
              monto —esas tienen sus propios campos arriba y las verifica el sistema—, sino los
              criterios que hay que juzgar: <i>"no se aceptan licores, ni gastos personales, ni
              propinas superiores al 10%"</i>.
            </span>
          </div>

          <div className="cm-form-group">
            <textarea
              name="agent_instructions"
              rows="5"
              className="cm-input cm-textarea"
              value={f.agent_instructions || ""}
              onChange={p.onChangeForm}
              placeholder="No se aceptan licores, ni gastos personales, ni propinas superiores al 10%…"
              data-testid="rule-agent-instructions"
            />
            <div className="cm-field-hint">
              Opcional. Solo aplica cuando el gasto entra conversando con el agente: un gasto
              registrado desde la web no se puede juzgar con este texto.
            </div>
          </div>
        </div>

        {/* --- Usuarios ---------------------------------------------------- */}
        <div className="cm-form-section" style={{ marginTop: 16 }}>
          <div className="cm-form-section-title">
            <i className="fa fa-users" /> Usuarios a los que aplica
          </div>

          {/* react-select NO propaga atributos sueltos al DOM: el data-testid va
              SIEMPRE en un div envolvente. El menu se portaliza a document.body,
              asi que las opciones se buscan en la pagina, no dentro del div. */}
          <div data-testid="rule-users-select">
            <Select
              isMulti
              closeMenuOnSelect={false}
              name="user_ids"
              options={p.users || []}
              value={p.selectedUsers}
              onChange={p.onChangeUsers}
              styles={selectStyles}
              menuPortalTarget={document.body}
              placeholder="Seleccione las personas a las que aplica…"
              noOptionsMessage={() => "No hay más usuarios"}
            />
          </div>

          {/* EL AVISO DE LA LISTA VACIA. Va siempre visible, no solo cuando la
              lista esta vacia: quien esta quitando el ultimo usuario tiene que
              haberlo leido ANTES de guardar. */}
          <div className="cm-alert cm-alert-warning" data-testid="rule-users-empty-warning"
               style={{ marginTop: 10 }}>
            <i className="fa fa-exclamation-triangle" />{" "}
            <span>
              Dejar esta lista vacía significa <b>que la regla no aplica a nadie</b>, no que aplica
              a todos. Para que aplique a todo el mundo, marque arriba
              <b> «Es la regla por defecto»</b>.
            </span>
          </div>

          <div className="cm-field-hint" style={{ marginTop: 8 }} data-testid="rule-users-count">
            {(p.selectedUsers || []).length === 0
              ? "Actualmente no aplica a ninguna persona."
              : "Aplica a " + (p.selectedUsers || []).length + " persona(s)."}
          </div>
        </div>

        {p.blockReason && (
          <div className="cm-alert cm-alert-danger" data-testid="rule-block-message" style={{ marginTop: 12 }}>
            <i className="fa fa-exclamation-circle" /> {p.blockReason}
          </div>
        )}

        {p.serverError && (
          <div className="cm-alert cm-alert-danger" data-testid="rule-server-error" style={{ marginTop: 12 }}>
            {p.serverError}
          </div>
        )}
      </CmModal>
    );
  }
}

export default ExpenseRuleFormCreate;
