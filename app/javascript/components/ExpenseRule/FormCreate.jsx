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
// (index.jsx#blockReason) y aqui solo se pinta.
//
// EL FORMULARIO SIMPLE (2026-10-16), en el orden en que lo pidio el cliente:
//
//   1. A QUIEN: roles (solo estos / todos excepto) y personas excluidas.
//   2. QUE REVISA: antiguedad, monto maximo, duplicados, tipos de gasto no
//      permitidos y lo que la IA no acepta en el comprobante.
//   3. A QUE NO APLICA: tipos de gasto excluidos de la regla entera.
//   4. UNA CASILLA, «Impedir guardar el gasto»: marcada, lo que incumpla no se
//      guarda; desmarcada, se guarda pero no se aprueba solo aunque este
//      dentro del presupuesto.
//
// Lo que no puede perderse, aunque el formulario sea corto:
//   * Roles vacio es NADIE; tipos vacio es NINGUNO. Se dice al lado del campo.
//   * La IA solo ve el comprobante: quien registra y el tipo de gasto se
//     eligen en sus campos, no se le escriben a la IA (2026-10-14).
class ExpenseRuleFormCreate extends Component {
  render() {
    var p = this.props;
    var f = p.formValues || {};
    var impide = !!f.mandatory;
    // Una regla sin nada que revisar no frena ningun gasto. Es valida —una
    // regla de «Solo estos roles» vacia deja a esos roles sin la regla por
    // defecto—, pero quien la arma tiene que saberlo.
    var sinNada = (p.selectedIncludedTypes || []).length === 0 &&
                  !f.max_invoice_age_days && !f.max_invoice_value && !f.check_duplicates &&
                  !f.cross_check_receipt && !String(f.agent_instructions || "").trim();

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
            <input type="text" name="name" className="cm-input" value={f.name || ""}
                   onChange={p.onChangeForm} placeholder="Regla general, Regla directivos…"
                   data-testid="rule-name" />
          </div>

          {/* Descripcion para quien administra. NO la lee el servidor ni la IA. */}
          <div className="cm-form-group">
            <label className="cm-label"><i className="fa fa-comment-dots" /> Observaciones</label>
            <textarea rows="2" name="observations" className="cm-input cm-textarea"
                      value={f.observations || ""} onChange={p.onChangeForm}
                      placeholder="Para qué es la regla, quién la pidió… (opcional)"
                      data-testid="rule-observations" />
          </div>
        </div>

        <div className="cm-form-grid-2">
          <div className="cm-form-group">
            <label className="cm-label">
              <input type="checkbox" name="active" checked={!!f.active}
                     onChange={p.onToggleBool} data-testid="rule-active" />
              {" "}Regla activa
            </label>
          </div>
          <div className="cm-form-group">
            <label className="cm-label">
              <input type="checkbox" name="is_default" checked={!!f.is_default}
                     onChange={p.onToggleBool} data-testid="rule-is-default" />
              {" "}Regla por defecto
            </label>
            <div className="cm-field-hint">Para quien no tenga ninguna otra regla asignada.</div>
          </div>
        </div>

        {/* --- 1. A quien ---------------------------------------------------- */}
        <div className="cm-form-section" style={{ marginTop: 12 }}>
          <div className="cm-form-section-title">
            <i className="fa fa-users" /> ¿A quién aplica?
          </div>

          {/* DOS MODOS Y NO DOS LISTAS A LA VEZ: el servidor vacia la que no
              corresponde al modo elegido. */}
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 10 }}>
            <label className="cm-label" style={{ margin: 0 }}>
              <input type="radio" name="roles_mode" checked={!f.applies_to_all_roles}
                     onChange={() => p.onChangeRolesMode(false)} data-testid="rule-roles-mode-solo" />
              {" "}Solo estos roles
            </label>
            <label className="cm-label" style={{ margin: 0 }}>
              <input type="radio" name="roles_mode" checked={!!f.applies_to_all_roles}
                     onChange={() => p.onChangeRolesMode(true)} data-testid="rule-roles-mode-todos" />
              {" "}Todos los roles, excepto…
            </label>
          </div>

          {/* react-select NO propaga atributos sueltos al DOM: el data-testid va
              SIEMPRE en un div envolvente. */}
          {!f.applies_to_all_roles ? (
            <div>
              <div data-testid="rule-roles-select">
                <Select isMulti closeMenuOnSelect={false} name="rol_ids" options={p.roles || []}
                        value={p.selectedRoles} onChange={p.onChangeRoles} styles={selectStyles}
                        menuPortalTarget={document.body} placeholder="Elija los roles…"
                        noOptionsMessage={() => "No hay más roles"} />
              </div>
              {/* Siempre visible: quien quita el ultimo rol tiene que haberlo
                  leido ANTES de guardar. */}
              <div className="cm-field-hint" data-testid="rule-roles-empty-warning">
                <b>Vacío: la regla no aplica a nadie.</b> Para que aplique a todos, elija «Todos los
                roles, excepto…».
              </div>
            </div>
          ) : (
            <div>
              <div data-testid="rule-excluded-roles-select">
                <Select isMulti closeMenuOnSelect={false} name="excluded_rol_ids" options={p.roles || []}
                        value={p.selectedExcludedRoles} onChange={p.onChangeLista("selectedExcludedRoles")}
                        styles={selectStyles} menuPortalTarget={document.body}
                        placeholder="Roles a los que NO aplica (opcional)…"
                        noOptionsMessage={() => "No hay más roles"} />
              </div>
              {/* Lo que este modo hace y no se ve: se SUMA a la regla por
                  defecto en vez de reemplazarla. */}
              <div className="cm-field-hint" data-testid="rule-roles-todos-hint">
                Incluye los roles que se creen después. Esta regla <b>se suma</b> a la regla por
                defecto, no la reemplaza.
              </div>
            </div>
          )}

          <div className="cm-form-group" style={{ marginTop: 12 }}>
            <label className="cm-label"><i className="fa fa-user-times" /> Personas a las que no aplica</label>
            <div data-testid="rule-excluded-users-select">
              <Select isMulti closeMenuOnSelect={false} name="excluded_user_ids" options={p.usuarios || []}
                      value={p.selectedExcludedUsers} onChange={p.onChangeLista("selectedExcludedUsers")}
                      styles={selectStyles} menuPortalTarget={document.body} placeholder="Nadie (opcional)…"
                      noOptionsMessage={() => "No hay más personas"} />
            </div>
          </div>
        </div>

        {/* --- 2. Que revisa --------------------------------------------------- */}
        <div className="cm-form-section" style={{ marginTop: 12 }}>
          <div className="cm-form-section-title">
            <i className="fa fa-shield-alt" /> ¿Qué revisa?
          </div>
          <div className="cm-field-hint" style={{ marginBottom: 10 }}>
            Lo que deje vacío no se revisa.
          </div>

          <div className="cm-form-grid-2">
            <div className="cm-form-group">
              <label className="cm-label"><i className="fa fa-calendar-alt" /> Antigüedad máxima de la factura</label>
              <input type="number" name="max_invoice_age_days" min="1" className="cm-input"
                     value={f.max_invoice_age_days === null || f.max_invoice_age_days === undefined ? "" : f.max_invoice_age_days}
                     onChange={p.onChangeForm} placeholder="Días" data-testid="rule-max-age" />
            </div>
            <div className="cm-form-group">
              <label className="cm-label"><i className="fa fa-dollar-sign" /> Monto máximo</label>
              <NumberFormat name="max_invoice_value" thousandSeparator={true} prefix={"$"} className="cm-input"
                            value={f.max_invoice_value === null || f.max_invoice_value === undefined ? "" : f.max_invoice_value}
                            onChange={p.onChangeMoney} placeholder="$" data-testid="rule-max-value" />
            </div>
          </div>

          <div className="cm-form-group">
            <label className="cm-label">
              <input type="checkbox" name="check_duplicates" checked={!!f.check_duplicates}
                     onChange={p.onToggleBool} data-testid="rule-check-duplicates" />
              {" "}Facturas duplicadas
            </label>
            <div className="cm-field-hint">Mismo número de factura y mismo NIT que otro gasto.</div>
          </div>

          {/* COTEJO DEL COMPROBANTE (2026-10-25). Nunca frena, aunque abajo se
              marque «Impedir guardar»: lo que compara sale de una lectura de
              IA. Se dice al lado para que nadie espere lo contrario. */}
          <div className="cm-form-group">
            <label className="cm-label">
              <input type="checkbox" name="cross_check_receipt" checked={!!f.cross_check_receipt}
                     onChange={p.onToggleBool} data-testid="rule-cross-check-receipt" />
              {" "}Cotejar el comprobante con los datos del gasto
            </label>
            <div className="cm-field-hint" data-testid="rule-cross-check-hint">
              La IA lee el comprobante y lo compara con el total, el IVA, la fecha, el NIT, el número de factura
              y la moneda que se escribieron. Si algo no coincide, o no se puede leer, el gasto se guarda pero
              <b> queda pendiente de aprobación</b>. Lo que coincide sigue su curso normal.
            </div>
          </div>

          {/* LOS TIPOS DE LA REGLA SON LOS NO PERMITIDOS (2026-10-16): elegir uno
              ya es prohibirlo, con la consecuencia de la casilla de abajo. */}
          <div className="cm-form-group">
            <label className="cm-label"><i className="fa fa-ban" /> Tipos de gasto no permitidos</label>
            <div data-testid="rule-included-types-select">
              <Select isMulti closeMenuOnSelect={false} name="included_type_ids" options={p.tipos || []}
                      value={p.selectedIncludedTypes} onChange={p.onChangeLista("selectedIncludedTypes")}
                      styles={selectStyles} menuPortalTarget={document.body} placeholder="Ninguno (opcional)…"
                      noOptionsMessage={() => "No hay más tipos"} />
            </div>
            {(p.selectedIncludedTypes || []).length > 0 && (
              <div className="cm-field-hint" data-testid="rule-prohibits-hint">
                {impide
                  ? <span>Quien tenga esta regla <b>no podrá registrar</b> gastos de estos tipos.</span>
                  : <span>Los gastos de estos tipos se guardan, pero <b>no se aprueban solos</b>.</span>}
              </div>
            )}
          </div>

          {/* SE ESCRIBE LO QUE NO SE ACEPTA. La IA solo ve la foto o el PDF. */}
          <div className="cm-form-group">
            <label className="cm-label"><i className="fa fa-robot" /> Lo que no se acepta en el comprobante (IA)</label>
            <textarea name="agent_instructions" rows="3" className="cm-input cm-textarea"
                      value={f.agent_instructions || ""} onChange={p.onChangeForm}
                      placeholder="Ej.: bebidas alcohólicas, propinas mayores al 10%, artículos personales."
                      data-testid="rule-agent-instructions" />
            <div className="cm-field-hint" data-testid="rule-agent-help">
              La IA lo busca en la foto o el PDF. No sabe quién registra ni el tipo de gasto: eso va en
              sus campos, no aquí.
            </div>
          </div>
        </div>

        {/* --- 3. A que no aplica ---------------------------------------------- */}
        <div className="cm-form-section" style={{ marginTop: 12 }}>
          <div className="cm-form-section-title">
            <i className="fa fa-tags" /> Tipos de gasto a los que no aplica esta regla
          </div>
          <div data-testid="rule-excluded-types-select">
            <Select isMulti closeMenuOnSelect={false} name="excluded_type_ids" options={p.tipos || []}
                    value={p.selectedExcludedTypes} onChange={p.onChangeLista("selectedExcludedTypes")}
                    styles={selectStyles} menuPortalTarget={document.body} placeholder="Ninguno (opcional)…"
                    noOptionsMessage={() => "No hay más tipos"} />
          </div>
          <div className="cm-field-hint">
            En gastos de estos tipos la regla no revisa nada. Ej.: «sin licor», excepto en Representación.
          </div>
        </div>

        {/* --- 4. La casilla ----------------------------------------------------
            EL INTERRUPTOR CON MAS CONSECUENCIAS, al final y con el texto que
            cambia con la casilla: desmarcarla por error no da ningun error
            visible, los gastos simplemente empiezan a entrar. */}
        <div className="cm-form-section" style={{ marginTop: 12 }}>
          <label className="cm-label" style={{ fontSize: 15 }}>
            <input type="checkbox" name="mandatory" checked={impide}
                   onChange={p.onToggleBool} data-testid="rule-mandatory" />
            {" "}<b>Impedir guardar el gasto</b>
          </label>
          <div className={"cm-alert " + (impide ? "cm-alert-danger" : "cm-alert-warning")}
               data-testid="rule-mandatory-hint" style={{ marginTop: 6, marginBottom: 0 }}>
            {impide
              ? <span><i className="fa fa-ban" /> El gasto que incumpla esta regla <b>no se guarda</b>.</span>
              : <span><i className="fa fa-exclamation-triangle" /> El gasto que incumpla esta regla se
                  guarda, pero <b>no se aprueba automáticamente</b>, aunque esté dentro del presupuesto.</span>}
          </div>
        </div>

        {/* --- 5. Doble aprobacion (2026-10-18) ---------------------------------
            Solo en reglas que dejan guardar: si la regla impide guardar, el
            gasto no existe y no hay nada que aprobar dos veces. */}
        <div className="cm-form-section" style={{ marginTop: 12 }}>
          <div className="cm-form-section-title">
            <i className="fa fa-user-check" /> Doble aprobación
          </div>
          <label className="cm-label" style={{ opacity: impide ? 0.55 : 1 }}>
            <input type="checkbox" name="requires_second_approval" checked={!!f.requires_second_approval}
                   disabled={impide && !f.requires_second_approval}
                   onChange={p.onToggleBool} data-testid="rule-second-approval" />
            {" "}Pedir una segunda aprobación antes de pasar a Contabilidad
          </label>
          {impide && (
            <div className="cm-field-hint" data-testid="rule-second-approval-disabled-hint">
              Solo para reglas que dejan guardar: desmarque «Impedir guardar el gasto» para usarla.
            </div>
          )}
          {f.requires_second_approval && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 8 }}>
                <label className="cm-label" style={{ margin: 0 }}>
                  <input type="radio" name="second_approver_kind" checked={f.second_approver_kind !== "user"}
                         onChange={() => p.onChangeSecondApproverKind("rol")} data-testid="rule-second-approver-kind-rol" />
                  {" "}Un cargo
                </label>
                <label className="cm-label" style={{ margin: 0 }}>
                  <input type="radio" name="second_approver_kind" checked={f.second_approver_kind === "user"}
                         onChange={() => p.onChangeSecondApproverKind("user")} data-testid="rule-second-approver-kind-user" />
                  {" "}Una persona
                </label>
              </div>
              {f.second_approver_kind === "user" ? (
                <div data-testid="rule-second-approver-user-select">
                  <Select name="second_approver_user_id" options={p.usuarios || []} isClearable
                          value={p.selectedSecondApproverUser} onChange={p.onChangeSecondApprover("selectedSecondApproverUser")}
                          styles={selectStyles} menuPortalTarget={document.body} placeholder="Elija la persona…"
                          noOptionsMessage={() => "No hay personas"} />
                </div>
              ) : (
                <div data-testid="rule-second-approver-rol-select">
                  <Select name="second_approver_rol_id" options={p.roles || []} isClearable
                          value={p.selectedSecondApproverRol} onChange={p.onChangeSecondApprover("selectedSecondApproverRol")}
                          styles={selectStyles} menuPortalTarget={document.body} placeholder="Elija el cargo…"
                          noOptionsMessage={() => "No hay cargos"} />
                </div>
              )}
              <div className="cm-field-hint" data-testid="rule-second-approval-hint">
                Cuando un gasto incumpla esta regla, después de la aprobación de siempre queda en
                «Pendiente 2ª aprobación» y <b>solo pasa a Contabilidad cuando la dé</b>{" "}
                {f.second_approver_kind === "user" ? "esa persona" : "alguien de ese cargo"}. Quien dio
                la primera aprobación no puede dar la segunda.
              </div>
            </div>
          )}
        </div>

        {sinNada && (
          <div className="cm-alert cm-alert-warning" data-testid="rule-no-limits-hint" style={{ marginTop: 12 }}>
            <i className="fa fa-exclamation-triangle" /> Así como está, esta regla no revisa nada.
          </div>
        )}

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
