import React, { Component } from 'react';
import NumberFormat from "react-number-format";
import Select from "react-select";
import { CmModal, CmButton } from "../../generalcomponents/ui";

// Copiado literalmente de components/ReportExpense/FormCreate.jsx:6-24. No se
// importa de alli a proposito: ese archivo exporta el componente, no los
// estilos, y crear un modulo compartido tocaria un archivo de otro paquete.
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

// Modal de alta/edicion de partida presupuestal. PRESENTACIONAL: no valida, no
// calcula el tope y no llama al servidor. El motivo de bloqueo (`blockReason`)
// lo calcula BudgetsTable y aqui solo se pinta y se usa para deshabilitar el
// boton; asi hay UNA sola definicion de la regla y no dos que se desincronizan.
//
// NO se define ningun <style> aqui: las clases cm-budget-* estan en
// design_system.css.
class BudgetFormCreate extends Component {
  render() {
    var p = this.props;
    var f = p.formValues || {};
    var availability = p.availability || {};

    // El disponible de la persona tiene TRES estados que no son "$0":
    // calculando, no disponible (fallo de red) y sin presupuesto asignado.
    // Pintar "$0" cuando la persona no tiene partida es mentir: no es que se le
    // acabo el cupo, es que nunca tuvo (contrato A.4).
    var disponiblePersona;
    if (availability.loading) {
      disponiblePersona = <span className="cm-info-value">Calculando...</span>;
    } else if (availability.error) {
      disponiblePersona = <span className="cm-info-value">No disponible</span>;
    } else if (!availability.has_budget) {
      disponiblePersona = <span className="cm-info-value">Sin presupuesto asignado</span>;
    } else {
      disponiblePersona = (
        <NumberFormat
          value={parseFloat(availability.available || 0)}
          displayType="text" thousandSeparator={true} prefix="$"
          className="cm-info-value" data-testid="budget-live-available"
        />
      );
    }

    return (
      <CmModal
        isOpen={p.modal}
        toggle={p.toggle}
        size="md"
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <i className="fa fa-wallet" style={{ color: "#f5a623" }} />
            {p.title}
          </div>
        }
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <CmButton variant="outline" onClick={p.toggle}>
              <i className="fa fa-times" /> Cancelar
            </CmButton>
            {/* CmButton reenvia `...rest` al <button>, asi que `disabled` y
                `data-testid` llegan al DOM: verificado en CmButton.jsx:15. */}
            <CmButton variant="accent" onClick={p.submitForm}
                      disabled={!!p.saving || !!p.blockReason}
                      data-testid="budget-submit">
              {p.saving
                ? <span><i className="fa fa-spinner fa-spin" /> Guardando…</span>
                : <span><i className="fa fa-save" /> {p.nameBnt}</span>}
            </CmButton>
          </div>
        }
      >
        <div className="cm-form-grid-1">
          <div className="cm-form-group">
            <label className="cm-label"><i className="fa fa-user" /> Beneficiario</label>
            {/* react-select NO propaga atributos sueltos al DOM: el
                data-testid va SIEMPRE en un div envolvente. Y como el menu se
                portaliza a document.body, las opciones se buscan en la pagina,
                no dentro de este div. */}
            <div data-testid="budget-user-select">
              <Select
                options={p.users || []}
                value={p.selectedOptionUser}
                onChange={p.onChangeUser}
                styles={selectStyles}
                menuPortalTarget={document.body}
                isDisabled={!!p.modeEdit}
                placeholder="Seleccionar persona..."
                className={p.blockReason && !f.user_id ? "cm-select-error" : ""}
              />
            </div>
            {p.modeEdit && (
              <div className="cm-field-hint">
                El beneficiario no se puede cambiar. Anule la partida y cree otra.
              </div>
            )}
          </div>
        </div>

        <div className="cm-form-grid-1">
          <div className="cm-form-group">
            <label className="cm-label"><i className="fa fa-dollar-sign" /> Valor asignado</label>
            <NumberFormat
              name="amount"
              thousandSeparator={true}
              prefix={"$"}
              className="cm-input"
              value={f.amount}
              onChange={p.onChangeMoney}
              placeholder="$0"
              data-testid="budget-amount"
            />
          </div>

          <div className="cm-form-group">
            <label className="cm-label"><i className="fa fa-align-left" /> Notas</label>
            <textarea
              name="notes" rows="3"
              className="cm-input cm-textarea"
              value={f.notes || ""}
              onChange={p.onChangeForm}
              placeholder="Para qué es esta partida"
              data-testid="budget-notes"
            />
          </div>

          {p.modeEdit && (
            <div className="cm-form-group">
              <label className="cm-label">
                <input type="checkbox" checked={!!f.active} onChange={p.onToggleActive} data-testid="budget-active" />
                {" "}Partida activa
              </label>
              <div className="cm-field-hint">
                Una partida anulada no aporta cupo, pero conserva la trazabilidad de los gastos ya imputados.
              </div>
            </div>
          )}
        </div>

        <div className="cm-budget-live" data-testid="budget-live-panel">
          <div className="cm-info-row">
            <span className="cm-info-label">Cotizado del centro</span>
            <NumberFormat value={p.viaticValue || 0} displayType="text" thousandSeparator={true} prefix="$" className="cm-info-value" />
          </div>
          <div className="cm-info-row">
            <span className="cm-info-label">Disponible para asignar</span>
            {/* `limite === null` significa "el resumen todavia no llego". Se
                dice, no se pinta un 0 que el usuario leeria como "no hay cupo".
                El data-testid va en el envolvente para que exista SIEMPRE: un
                selector que aparece y desaparece produce specs intermitentes. */}
            <span className="cm-info-value" data-testid="budget-live-limit">
              {p.limite === null || p.limite === undefined
                ? "Calculando..."
                : <NumberFormat value={p.limite} displayType="text" thousandSeparator={true} prefix="$" />}
            </span>
          </div>
          <div className="cm-info-row">
            <span className="cm-info-label">Disponible actual de la persona</span>
            {disponiblePersona}
          </div>
        </div>

        {p.blockReason && (
          <div className="cm-alert cm-alert-danger" data-testid="budget-block-message" style={{ marginTop: 12 }}>
            <i className="fa fa-exclamation-circle" /> {p.blockReason}
          </div>
        )}

        {p.serverError && (
          <div className="cm-alert cm-alert-danger" data-testid="budget-server-error" style={{ marginTop: 12 }}>
            {p.serverError}
          </div>
        )}
      </CmModal>
    );
  }
}

export default BudgetFormCreate;
