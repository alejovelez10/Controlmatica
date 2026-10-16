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
//   1. El multi-select de roles vacio significa NINGUN rol, no todos. Es la
//      confusion obvia de quien administra, y por eso el aviso esta AL LADO del
//      campo, en la pantalla, no en un manual que nadie abre. En TIPOS es al
//      reves —vacio es todos— y por eso tambien se dice al lado del campo.
//   2. «Al incumplirse» decide si la regla RECHAZA el gasto o solo lo marca, y
//      el aviso que lo explica cambia con la casilla. Una regla desmarcada por
//      error no produce ningun error visible: simplemente deja de rechazar, y
//      eso no se nota hasta la auditoria contable.
//   3. "Que no se acepta en el comprobante" es lo que la IA busca LEYENDO LA
//      FOTO O EL PDF, y nada mas: se escribe lo prohibido, no lo permitido. No son reglas de fecha ni de monto (tienen sus campos
//      y las evalua el servidor), ni de quien o de que tipo de gasto: la IA no
//      ve a quien registra, su rol ni el tipo elegido. Lo que se escriba ahi
//      sobre eso lo adivina, y bloquea gastos legitimos.
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
            Lo que pasa cuando uno se incumple lo decide <b>«Al incumplirse»</b>, más abajo.
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

          {/* EL INTERRUPTOR CON MAS CONSECUENCIAS DE ESTA PANTALLA, y por eso
              no es un checkbox suelto arriba: gobierna a los tres limites de
              esta seccion y va despues de ellos, ya leidos.

              EL AVISO DE ABAJO CAMBIA CON LA CASILLA A PROPOSITO. La casilla
              sola dice "obligatoria", que no le dice a nadie que va a pasar;
              quien la desmarca tiene que leer, en la pantalla y en ese momento,
              que los gastos van a EMPEZAR A ENTRAR. */}
          <div className="cm-form-grid-1" style={{ marginTop: 4 }}>
            <div className="cm-form-group">
              <label className="cm-label">
                <input type="checkbox" name="mandatory" checked={!!f.mandatory}
                       onChange={p.onToggleBool} data-testid="rule-mandatory" />
                {" "}Al incumplirse, <b>no dejar crear el gasto</b>
              </label>

              {f.mandatory ? (
                <div className="cm-alert cm-alert-danger" data-testid="rule-mandatory-hint"
                     style={{ marginTop: 8 }}>
                  <i className="fa fa-ban" />{" "}
                  <span>
                    Un gasto que incumpla cualquiera de los tres límites de arriba, o que esta
                    regla prohíba,<b> se rechaza y no se guarda</b>, entre por la web o por WhatsApp. La persona
                    tendrá que corregir el comprobante para poder reportarlo; <b>no</b> hay forma de
                    registrarlo de todos modos.
                  </span>
                </div>
              ) : (
                <div className="cm-alert cm-alert-warning" data-testid="rule-mandatory-hint"
                     style={{ marginTop: 8 }}>
                  <i className="fa fa-exclamation-triangle" />{" "}
                  <span>
                    El gasto <b>sí se registra</b>: queda guardado, con la violación anotada y en
                    estado <b>«sin aprobar»</b>, y la persona ve el motivo por el que no quedó
                    aprobado. Alguien tiene que revisarlo después: esta regla <b>avisa, no impide</b>.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- Lo que no se acepta en el comprobante ----------------------- */}
        <div className="cm-form-section" style={{ marginTop: 16 }}>
          <div className="cm-form-section-title">
            <i className="fa fa-ban" /> Qué no se acepta en el comprobante
          </div>

          {/* SE ESCRIBE LO QUE NO SE ACEPTA, NO LO QUE SE PERMITE. Antes decia
              "escribelo como se lo dirias a una persona" y la gente escribio aqui
              quien puede cargar que tipo de gasto: la IA solo ve la foto o el
              PDF, nunca a quien registra, su rol ni el tipo de gasto, y
              adivinaba (2026-10-14). Lo de quien y que tipo tiene sus campos. */}
          <div className="cm-alert cm-alert-info" data-testid="rule-agent-help"
               style={{ marginBottom: 12 }}>
            <i className="fa fa-info-circle" />{" "}
            <span>
              Escriba lo que <b>no se acepta</b> en la factura. La IA lo busca en la foto o el PDF
              y, si lo encuentra, el gasto incumple esta regla. Ejemplos: <i>bebidas alcohólicas,
              propinas mayores al 10%, artículos personales, compras en bares o casinos.</i>
            </span>
          </div>

          <div className="cm-form-group">
            <textarea
              name="agent_instructions"
              rows="4"
              className="cm-input cm-textarea"
              value={f.agent_instructions || ""}
              onChange={p.onChangeForm}
              placeholder="Ej.: Bebidas alcohólicas, propinas mayores al 10%, artículos personales."
              data-testid="rule-agent-instructions"
            />
            <div className="cm-field-hint">
              Opcional. La IA solo ve el comprobante: a quién aplica la regla y a qué tipos de
              gasto se eligen en <b>A quién aplica</b> y <b>Tipos de gasto</b>.
            </div>
          </div>
        </div>

        {/* --- A quien aplica ----------------------------------------------- */}
        <div className="cm-form-section" style={{ marginTop: 16 }}>
          <div className="cm-form-section-title">
            <i className="fa fa-users" /> A quién aplica
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
                  placeholder="Seleccione los roles a los que aplica…"
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
                  Dejar esta lista vacía significa <b>que la regla no aplica a nadie</b>, no que aplica
                  a todos. Para que aplique a todo el mundo, elija <b>«Todos los roles, excepto…»</b>.
                </span>
              </div>

              <div className="cm-field-hint" style={{ marginTop: 8 }} data-testid="rule-roles-count">
                {(p.selectedRoles || []).length === 0
                  ? "Actualmente no aplica a ningun rol."
                  : "Aplica a " + (p.selectedRoles || []).length + " rol(es)."}
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
                  placeholder="Roles a los que NO aplica (vacío = aplica a todos)…"
                  noOptionsMessage={() => "No hay más roles"}
                />
              </div>
              {/* LAS DOS COSAS QUE ESTE MODO HACE Y NO SE VEN: incluye los roles
                  que se creen despues, y se SUMA a la regla por defecto en vez
                  de reemplazarla. La segunda es la que sorprende. */}
              <div className="cm-field-hint" style={{ marginTop: 8 }} data-testid="rule-roles-todos-hint">
                Aplica a todos los roles, también a los que se creen después, menos a los que
                elija aquí. Esta regla <b>se suma</b> a las demás y a la regla por defecto: no
                las reemplaza.
              </div>
            </div>
          )}

          <div className="cm-form-group" style={{ marginTop: 14 }}>
            <label className="cm-label"><i className="fa fa-user-times" /> Personas excluidas</label>
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
              Opcional. A estas personas la regla <b>no les aplica</b>, aunque su rol esté incluido.
              Sirve para excepciones con nombre propio: «el combustible solo lo pueden cargar
              estas cuatro personas».
            </div>
          </div>
        </div>

        {/* --- A que tipos de gasto aplica ------------------------------------ */}
        <div className="cm-form-section" style={{ marginTop: 16 }}>
          <div className="cm-form-section-title">
            <i className="fa fa-tags" /> Tipos de gasto
          </div>

          <div className="cm-form-grid-2">
            <div className="cm-form-group">
              <label className="cm-label">Solo estos tipos</label>
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
                  placeholder="Todos los tipos…"
                  noOptionsMessage={() => "No hay más tipos"}
                />
              </div>
              {/* AL REVES QUE ROLES, y por eso se dice aqui: en roles vacio es
                  nadie; en tipos vacio es todos. */}
              <div className="cm-field-hint">
                <b>Vacío significa todos los tipos.</b> Con tipos elegidos, la regla solo aplica a
                los gastos de esos tipos.
              </div>
            </div>

            <div className="cm-form-group">
              <label className="cm-label">Excepto estos</label>
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
                La regla <b>nunca</b> aplica a los gastos de estos tipos. Ejemplo: «sin licor,
                excepto en Representación».
              </div>
            </div>
          </div>

          {/* PROHIBIR VA CON LOS TIPOS Y NO CON LOS LIMITES: lo que se prohibe es
              un tipo de gasto para unas personas. El aviso cambia con la casilla
              por el mismo motivo que el de «Al incumplirse»: la casilla sola no
              le dice a nadie lo que va a pasar. */}
          <div className="cm-form-group" style={{ marginTop: 8 }}>
            <label className="cm-label">
              <input type="checkbox" name="prohibits_expense" checked={!!f.prohibits_expense}
                     onChange={p.onToggleBool} data-testid="rule-prohibits-expense" />
              {" "}<b>Prohibir el gasto</b>: a quien le aplique esta regla no puede registrar gastos
              de los tipos elegidos
            </label>
            {f.prohibits_expense && (
              <div className="cm-alert cm-alert-danger" data-testid="rule-prohibits-hint"
                   style={{ marginTop: 8 }}>
                <i className="fa fa-ban" />{" "}
                <span>
                  Lo revisa el sistema, por la web y por WhatsApp, sin pasar por el agente. Si
                  «Al incumplirse, no dejar crear el gasto» está marcado, el gasto <b>no se
                  guarda</b>; si no, se guarda <b>sin aprobar</b> con el motivo.
                </span>
              </div>
            )}
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
