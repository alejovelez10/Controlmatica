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
// TODO EL FORMULARIO HABLA DE CUANDO UN GASTO SE FRENA (2026-10-16), nunca de
// lo que se permite. Es lo que el cliente leia al reves: «Solo estos tipos» lo
// entendia como «solo estos tipos se permiten». Cada etiqueta dice «frenar si…»
// y el aviso de arriba lo recuerda siempre.
//
// LO QUE ESTE FORMULARIO TIENE QUE ENSENAR, Y NO ES DECORACION:
//
//   1. Hay DOS CLASES DE REGLA y se elige arriba: la que frena por LIMITES
//      (antiguedad, tope, duplicados, lo que la IA no acepta) y la que frena
//      TIPOS DE GASTO COMPLETOS. Antes «Prohibir el gasto» era una casilla al
//      final, con los limites y el texto de la IA todavia activos al lado: la
//      regla de Representacion del cliente termino con un texto que la IA no
//      podia verificar y frenaba gastos con ese texto como motivo. En modo
//      prohibir lo de limites no se pinta, y el servidor no lo aplica.
//   2. Los tipos significan cosas distintas en cada clase: en una prohibicion
//      son LOS TIPOS QUE SE FRENAN; en una de limites son DONDE se revisan los
//      limites, y elegirlos no prohibe nada. Por eso cambian etiqueta y texto.
//   3. El multi-select de roles vacio significa NINGUN rol, no todos. En TIPOS
//      es al reves —vacio es todos— y por eso se dice al lado de cada campo.
//   4. Lo que pasa cuando la regla frena (no se guarda / se guarda sin aprobar)
//      va al final, con un aviso que cambia con la opcion. Elegir «se guarda»
//      por error no produce ningun error visible: los gastos empiezan a entrar.
//   5. "Frenar si el comprobante trae" es lo que la IA busca LEYENDO LA FOTO O
//      EL PDF, y nada mas: se escribe lo que no se acepta. La IA no ve a quien
//      registra, su rol ni el tipo elegido; lo que se escriba ahi sobre eso lo
//      adivina, y frena gastos legitimos.
class ExpenseRuleFormCreate extends Component {
  render() {
    var p = this.props;
    var f = p.formValues || {};
    var esProhibicion = !!f.prohibits_expense;
    // Una regla de limites sin ningun limite no frena nada. Es valida —una
    // regla de «Solo estos roles» vacia deja a esos roles sin la regla por
    // defecto—, pero quien la arma tiene que saberlo.
    var sinLimites = !esProhibicion && !f.max_invoice_age_days && !f.max_invoice_value &&
                     !f.check_duplicates && !String(f.agent_instructions || "").trim();

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

          {/* Descripcion para quien administra. NO la lee el servidor ni la
              IA: lo que la IA revisa en el comprobante va en su propio campo,
              mas abajo. */}
          <div className="cm-form-group">
            <label className="cm-label">
              <i className="fa fa-comment-dots" /> Observaciones
            </label>
            <textarea
              rows="2"
              name="observations"
              className="cm-input cm-textarea"
              value={f.observations || ""}
              onChange={p.onChangeForm}
              placeholder="Para qué es la regla, quién la pidió…"
              data-testid="rule-observations"
            />
            <div className="cm-field-hint">
              Opcional. Es solo una descripción para quien administra: no cambia lo que hace la regla.
            </div>
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

        {/* --- Para que sirve una regla -------------------------------------
            SIEMPRE VISIBLE: es la frase que ordena todo lo demas. Sin ella, cada
            campo se puede leer como «lo que se permite». */}
        <div className="cm-alert cm-alert-info" data-testid="rule-purpose" style={{ marginTop: 16 }}>
          <i className="fa fa-hand-paper" />{" "}
          <span>
            <b>Una regla dice cuándo un gasto NO pasa.</b> Todo lo que configure aquí es un motivo
            para <b>frenar</b> un gasto; lo que deje vacío no se revisa.
          </span>
        </div>

        {/* --- 1. Que frena ------------------------------------------------- */}
        <div className="cm-form-section" style={{ marginTop: 16 }}>
          <div className="cm-form-section-title">
            <i className="fa fa-question-circle" /> ¿Qué frena esta regla?
          </div>

          <div className="cm-form-group" style={{ marginBottom: 8 }}>
            <label className="cm-label" style={{ margin: 0 }}>
              <input type="radio" name="rule_kind" checked={!esProhibicion}
                     onChange={() => p.onSetField("prohibits_expense", false)}
                     data-testid="rule-kind-limits" />
              {" "}<b>Gastos que incumplan unos límites</b>
            </label>
            <div className="cm-field-hint" style={{ marginLeft: 22 }}>
              La factura es muy vieja, supera un tope, está repetida o trae algo que no se acepta.
            </div>
          </div>

          <div className="cm-form-group" style={{ marginBottom: 0 }}>
            {/* Conserva el data-testid de la antigua casilla «Prohibir el gasto»:
                la prueba E2E de las prohibiciones lo marca con `.check()`, que
                sirve igual para un radio. */}
            <label className="cm-label" style={{ margin: 0 }}>
              <input type="radio" name="rule_kind" checked={esProhibicion}
                     onChange={() => p.onSetField("prohibits_expense", true)}
                     data-testid="rule-prohibits-expense" />
              {" "}<b>Tipos de gasto completos</b>
            </label>
            <div className="cm-field-hint" style={{ marginLeft: 22 }}>
              Cualquier gasto de los tipos que elija, sin mirar el comprobante. Ejemplo:
              «Representación solo para administradores».
            </div>
          </div>
        </div>

        {esProhibicion ? (
          /* --- 2b. Que tipos se frenan ------------------------------------ */
          <div className="cm-form-section" style={{ marginTop: 16 }}>
            <div className="cm-form-section-title">
              <i className="fa fa-ban" /> Tipos de gasto que se frenan
            </div>
            <div data-testid="rule-included-types-select">
              <Select
                isMulti
                closeMenuOnSelect={false}
                name="included_type_ids"
                options={p.tipos || []}
                value={p.selectedIncludedTypes}
                onChange={p.onChangeLista("selectedIncludedTypes")}
                styles={selectStyles}
                menuPortalTarget={document.body}
                placeholder="Elija los tipos que no se pueden registrar…"
                noOptionsMessage={() => "No hay más tipos"}
              />
            </div>
            <div className="cm-alert cm-alert-danger" data-testid="rule-prohibits-hint" style={{ marginTop: 10 }}>
              <i className="fa fa-ban" />{" "}
              <span>
                A quien le aplique esta regla se le frena <b>cualquier gasto de estos tipos</b>. Lo
                revisa el sistema, no la IA, por la web y por WhatsApp.
              </span>
            </div>
          </div>
        ) : (
          <div>
            {/* --- 2a. Cuando se frena el gasto ------------------------------ */}
            <div className="cm-form-section" style={{ marginTop: 16 }}>
              <div className="cm-form-section-title">
                <i className="fa fa-shield-alt" /> ¿Cuándo se frena el gasto?
              </div>
              <div className="cm-field-hint" style={{ marginBottom: 12 }}>
                Lo revisa el sistema siempre, entren los gastos por la web o por WhatsApp. Lo que
                deje vacío no se revisa.
              </div>

              <div className="cm-form-grid-2">
                <div className="cm-form-group">
                  <label className="cm-label"><i className="fa fa-calendar-alt" /> Frenar si la factura tiene más de</label>
                  <input
                    type="number"
                    name="max_invoice_age_days"
                    min="1"
                    className="cm-input"
                    value={f.max_invoice_age_days === null || f.max_invoice_age_days === undefined ? "" : f.max_invoice_age_days}
                    onChange={p.onChangeForm}
                    placeholder="Días (vacío = no se revisa)"
                    data-testid="rule-max-age"
                  />
                  <div className="cm-field-hint">Días de antigüedad, contados hasta hoy.</div>
                </div>

                <div className="cm-form-group">
                  <label className="cm-label"><i className="fa fa-dollar-sign" /> Frenar si el valor supera</label>
                  <NumberFormat
                    name="max_invoice_value"
                    thousandSeparator={true}
                    prefix={"$"}
                    className="cm-input"
                    value={f.max_invoice_value === null || f.max_invoice_value === undefined ? "" : f.max_invoice_value}
                    onChange={p.onChangeMoney}
                    placeholder="$ (vacío = no se revisa)"
                    data-testid="rule-max-value"
                  />
                  <div className="cm-field-hint">Un gasto por el valor exacto <b>sí</b> pasa.</div>
                </div>
              </div>

              <div className="cm-form-group">
                <label className="cm-label">
                  <input type="checkbox" name="check_duplicates" checked={!!f.check_duplicates}
                         onChange={p.onToggleBool} data-testid="rule-check-duplicates" />
                  {" "}Frenar si la factura está repetida
                </label>
                <div className="cm-field-hint">
                  Ya existe otro gasto con el mismo número de factura y el mismo NIT. Los viáticos y
                  los números de relleno (N/A, S/N) no cuentan.
                </div>
              </div>

              {/* SE ESCRIBE LO QUE NO SE ACEPTA, NO LO QUE SE PERMITE. Antes la
                  gente escribio aqui quien puede cargar que tipo de gasto: la IA
                  solo ve la foto o el PDF y adivinaba (2026-10-14). */}
              <div className="cm-form-group" style={{ marginTop: 6 }}>
                <label className="cm-label"><i className="fa fa-robot" /> Frenar si el comprobante trae…</label>
                <div className="cm-alert cm-alert-info" data-testid="rule-agent-help" style={{ marginBottom: 8 }}>
                  <i className="fa fa-info-circle" />{" "}
                  <span>
                    Escriba lo que <b>no se acepta</b>. La IA lo busca en la foto o el PDF y, si lo
                    encuentra, frena el gasto. Ejemplos: <i>bebidas alcohólicas, propinas mayores al
                    10%, artículos personales, compras en bares o casinos.</i>
                  </span>
                </div>
                <textarea
                  name="agent_instructions"
                  rows="3"
                  className="cm-input cm-textarea"
                  value={f.agent_instructions || ""}
                  onChange={p.onChangeForm}
                  placeholder="Ej.: Bebidas alcohólicas, propinas mayores al 10%, artículos personales."
                  data-testid="rule-agent-instructions"
                />
                <div className="cm-field-hint">
                  La IA solo ve el comprobante: no sabe quién registra, su rol ni el tipo de gasto.
                  Eso se elige en <b>¿A quién se le frenan los gastos?</b> y en los tipos, no aquí.
                </div>
              </div>

              {sinLimites && (
                <div className="cm-alert cm-alert-warning" data-testid="rule-no-limits-hint">
                  <i className="fa fa-exclamation-triangle" />{" "}
                  <span>Así como está, esta regla <b>no frena ningún gasto</b>: no tiene ningún límite.</span>
                </div>
              )}
            </div>

            {/* --- 2a'. En que tipos se revisan los limites ------------------ */}
            <div className="cm-form-section" style={{ marginTop: 16 }}>
              <div className="cm-form-section-title">
                <i className="fa fa-tags" /> ¿En qué tipos de gasto se revisan estos límites?
              </div>

              <div className="cm-form-grid-2">
                <div className="cm-form-group">
                  <label className="cm-label">Solo en estos tipos</label>
                  <div data-testid="rule-included-types-select">
                    <Select
                      isMulti
                      closeMenuOnSelect={false}
                      name="included_type_ids"
                      options={p.tipos || []}
                      value={p.selectedIncludedTypes}
                      onChange={p.onChangeLista("selectedIncludedTypes")}
                      styles={selectStyles}
                      menuPortalTarget={document.body}
                      placeholder="En todos los tipos…"
                      noOptionsMessage={() => "No hay más tipos"}
                    />
                  </div>
                  {/* AL REVES QUE ROLES: en roles vacio es nadie; en tipos vacio
                      es todos. */}
                  <div className="cm-field-hint"><b>Vacío: en todos los tipos.</b></div>
                </div>

                <div className="cm-form-group">
                  <label className="cm-label">En todos, excepto estos</label>
                  <div data-testid="rule-excluded-types-select">
                    <Select
                      isMulti
                      closeMenuOnSelect={false}
                      name="excluded_type_ids"
                      options={p.tipos || []}
                      value={p.selectedExcludedTypes}
                      onChange={p.onChangeLista("selectedExcludedTypes")}
                      styles={selectStyles}
                      menuPortalTarget={document.body}
                      placeholder="Ninguno (opcional)…"
                      noOptionsMessage={() => "No hay más tipos"}
                    />
                  </div>
                  <div className="cm-field-hint">
                    En estos tipos los límites <b>no</b> se revisan. Ejemplo: «sin licor, excepto en
                    Representación».
                  </div>
                </div>
              </div>

              <div className="cm-field-hint" data-testid="rule-types-not-prohibit">
                Elegir tipos aquí <b>no los prohíbe</b>: solo dice dónde se revisan los límites de
                arriba. Para frenar un tipo completo, elija arriba <b>«Tipos de gasto completos»</b>.
              </div>
            </div>
          </div>
        )}

        {/* --- 3. A quien ---------------------------------------------------- */}
        <div className="cm-form-section" style={{ marginTop: 16 }}>
          <div className="cm-form-section-title">
            <i className="fa fa-users" /> ¿A quién se le frenan los gastos?
          </div>

          {/* DOS MODOS Y NO DOS LISTAS A LA VEZ: con "solo estos" y "excepto
              estos" llenas al mismo tiempo nadie sabria cual manda. El servidor
              vacia la que no corresponde al modo elegido. */}
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
              SIEMPRE en un div envolvente. El menu se portaliza a document.body,
              asi que las opciones se buscan en la pagina, no dentro del div. */}
          {!f.applies_to_all_roles ? (
            <div>
              <div data-testid="rule-roles-select">
                <Select
                  isMulti
                  closeMenuOnSelect={false}
                  name="rol_ids"
                  options={p.roles || []}
                  value={p.selectedRoles}
                  onChange={p.onChangeRoles}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                  placeholder="Roles a los que se les frenan los gastos…"
                  noOptionsMessage={() => "No hay más roles"}
                />
              </div>

              {/* EL AVISO DE LA LISTA VACIA. Va siempre visible, no solo cuando la
                  lista esta vacia: quien esta quitando el ultimo rol tiene que
                  haberlo leido ANTES de guardar. */}
              <div className="cm-alert cm-alert-warning" data-testid="rule-roles-empty-warning"
                   style={{ marginTop: 10 }}>
                <i className="fa fa-exclamation-triangle" />{" "}
                <span>
                  Dejar esta lista vacía significa <b>que la regla no frena a nadie</b>, no que frena
                  a todos. Para que aplique a todos, elija <b>«Todos los roles, excepto…»</b>.
                </span>
              </div>

              <div className="cm-field-hint" style={{ marginTop: 8 }} data-testid="rule-roles-count">
                {(p.selectedRoles || []).length === 0
                  ? "Actualmente no se aplica a ningún rol."
                  : "Se aplica a " + (p.selectedRoles || []).length + " rol(es)."}
              </div>
            </div>
          ) : (
            <div>
              <div data-testid="rule-excluded-roles-select">
                <Select
                  isMulti
                  closeMenuOnSelect={false}
                  name="excluded_rol_ids"
                  options={p.roles || []}
                  value={p.selectedExcludedRoles}
                  onChange={p.onChangeLista("selectedExcludedRoles")}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                  placeholder="Roles a los que NO se les frena (vacío = a todos se les frena)…"
                  noOptionsMessage={() => "No hay más roles"}
                />
              </div>
              {/* LAS DOS COSAS QUE ESTE MODO HACE Y NO SE VEN: incluye los roles
                  que se creen despues, y se SUMA a la regla por defecto en vez
                  de reemplazarla. La segunda es la que sorprende. */}
              <div className="cm-field-hint" style={{ marginTop: 8 }} data-testid="rule-roles-todos-hint">
                Se aplica a todos los roles, también a los que se creen después, menos a los que
                elija aquí. Esta regla <b>se suma</b> a las demás y a la regla por defecto: no
                las reemplaza.
              </div>
            </div>
          )}

          <div className="cm-form-group" style={{ marginTop: 14 }}>
            <label className="cm-label"><i className="fa fa-user-times" /> Personas a las que no se les aplica</label>
            <div data-testid="rule-excluded-users-select">
              <Select
                isMulti
                closeMenuOnSelect={false}
                name="excluded_user_ids"
                options={p.usuarios || []}
                value={p.selectedExcludedUsers}
                onChange={p.onChangeLista("selectedExcludedUsers")}
                styles={selectStyles}
                menuPortalTarget={document.body}
                placeholder="Nadie (opcional)…"
                noOptionsMessage={() => "No hay más personas"}
              />
            </div>
            <div className="cm-field-hint">
              Opcional. A estas personas esta regla <b>nunca</b> les frena un gasto, aunque su rol
              esté incluido. Ejemplo: frenar el combustible a todos y excluir aquí a las cuatro
              personas que sí lo pueden cargar.
            </div>
          </div>
        </div>

        {/* --- 4. Que pasa al frenar -------------------------------------------
            EL INTERRUPTOR CON MAS CONSECUENCIAS DE ESTA PANTALLA, y va al final,
            con todo lo anterior ya leido. Dos opciones con nombre en vez de una
            casilla: «obligatoria» no le decia a nadie que iba a pasar. El aviso
            cambia con la opcion porque elegir «se guarda» por error no produce
            ningun error visible: los gastos simplemente EMPIEZAN A ENTRAR. */}
        <div className="cm-form-section" style={{ marginTop: 16 }}>
          <div className="cm-form-section-title">
            <i className="fa fa-gavel" /> Cuando esta regla frena un gasto…
          </div>

          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 8 }}>
            <label className="cm-label" style={{ margin: 0 }}>
              <input type="radio" name="mandatory_mode" checked={!!f.mandatory}
                     onChange={() => p.onSetField("mandatory", true)} data-testid="rule-mandatory" />
              {" "}<b>No se guarda</b>
            </label>
            <label className="cm-label" style={{ margin: 0 }}>
              <input type="radio" name="mandatory_mode" checked={!f.mandatory}
                     onChange={() => p.onSetField("mandatory", false)} data-testid="rule-mandatory-off" />
              {" "}<b>Se guarda sin aprobar</b>
            </label>
          </div>

          {f.mandatory ? (
            <div className="cm-alert cm-alert-danger" data-testid="rule-mandatory-hint">
              <i className="fa fa-ban" />{" "}
              <span>
                El gasto <b>se rechaza y no se guarda</b>, entre por la web o por WhatsApp. La
                persona ve el motivo y tiene que corregirlo; <b>no</b> hay forma de registrarlo de
                todos modos.
              </span>
            </div>
          ) : (
            <div className="cm-alert cm-alert-warning" data-testid="rule-mandatory-hint">
              <i className="fa fa-exclamation-triangle" />{" "}
              <span>
                El gasto <b>sí se registra</b>, con el motivo anotado y en estado
                <b> «sin aprobar»</b>. Alguien tiene que revisarlo después: esta regla <b>avisa, no
                impide</b>.
              </span>
            </div>
          )}
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
