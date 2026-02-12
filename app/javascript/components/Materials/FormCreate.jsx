import React, { useState, useCallback } from "react";
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

const FormCreate = (props) => {
  const [costCenterOptions, setCostCenterOptions] = useState([]);
  const [isLoadingCostCenter, setIsLoadingCostCenter] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);

  const form = props.formValues;
  const errors = props.errors || [];
  const saving = props.isLoading;
  const isNew = props.modalMode === "new";
  const title = isNew ? "Nuevo Material" : "Editar Material";
  const hasCostCenter = props.cost_center_id != null && props.cost_center_id !== undefined;

  const handleCostCenterInputChange = useCallback((inputValue, { action }) => {
    if (action !== "input-change") return;

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (inputValue.length >= 3) {
      setIsLoadingCostCenter(true);
      const timeout = setTimeout(() => {
        fetch("/search_cost_centers?q=" + encodeURIComponent(inputValue))
          .then((response) => response.json())
          .then((data) => {
            setCostCenterOptions(data || []);
            setIsLoadingCostCenter(false);
          })
          .catch(() => {
            setCostCenterOptions([]);
            setIsLoadingCostCenter(false);
          });
      }, 300);
      setSearchTimeout(timeout);
    } else {
      setCostCenterOptions([]);
      setIsLoadingCostCenter(false);
    }
  }, [props.centro, props.onSearchCostCenter, searchTimeout]);

  if (!props.modal) return null;

  return (
    <div className="cm-modal-overlay">
      <div className="cm-modal cm-modal-lg">
        {/* Header */}
        <div className="cm-modal-header">
          <h2 className="cm-modal-title">
            <i className="fas fa-boxes" style={{ marginRight: "10px", color: "#f5a623" }} />
            {title}
          </h2>
          <button className="cm-modal-close" onClick={props.toggle}>
            <i className="fas fa-times" />
          </button>
        </div>

        {/* Body */}
        <div className="cm-modal-body">
          {props.errorValues === false && (
            <div className="cm-form-errors">
              <p>Debes de completar todos los campos requeridos</p>
            </div>
          )}

          {errors.length > 0 && (
            <div className="cm-form-errors">
              <ul>
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Form Fields */}
          <div className="cm-form-grid-2">
            {/* Proveedor */}
            <div className="cm-form-group">
              <label className="cm-label">
                <i className="fas fa-truck" /> Proveedor
              </label>
              <Select
                options={props.providerOptions}
                value={props.selectedProvider}
                onChange={props.onChangeAutocompleteProvider}
                placeholder="Seleccione proveedor"
                styles={selectStyles}
                menuPortalTarget={document.body}
              />
            </div>

            {/* Centro de Costo - with debounce autocomplete */}
            {!hasCostCenter && (
              <div className="cm-form-group">
                <label className="cm-label">
                  <i className="fas fa-building" /> Centro de Costo{" "}
                  <span style={{ fontSize: "11px", color: "#888", fontWeight: "normal" }}>
                    (escribe al menos 3 letras)
                  </span>
                </label>
                <Select
                  options={costCenterOptions}
                  value={props.formAutocompleteCentro}
                  onChange={props.onChangeAutocompleteCentro}
                  onInputChange={handleCostCenterInputChange}
                  isLoading={isLoadingCostCenter}
                  placeholder="Centro de costos"
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                  noOptionsMessage={() => "Escribe al menos 3 letras para buscar"}
                />
              </div>
            )}

            {/* Fecha de Orden */}
            <div className="cm-form-group">
              <label className="cm-label">
                <i className="fas fa-calendar-alt" /> Fecha de Orden
              </label>
              <input
                type="date"
                name="sales_date"
                className="cm-input"
                value={form.sales_date || ""}
                onChange={props.onChangeForm}
              />
            </div>

            {/* Numero de Orden */}
            <div className="cm-form-group">
              <label className="cm-label">
                <i className="fas fa-hashtag" /> Numero de Orden
              </label>
              <input
                type="text"
                name="sales_number"
                className="cm-input"
                placeholder="Numero de orden"
                value={form.sales_number || ""}
                onChange={props.onChangeForm}
              />
            </div>

            {/* Valor */}
            <div className="cm-form-group">
              <label className="cm-label">
                <i className="fas fa-dollar-sign" /> Valor
              </label>
              <NumberFormat
                name="amount"
                thousandSeparator={true}
                prefix="$"
                className="cm-input"
                value={form.amount || ""}
                onChange={props.onChangeForm}
                placeholder="Valor"
              />
            </div>

            {/* Fecha Entrega */}
            <div className="cm-form-group">
              <label className="cm-label">
                <i className="fas fa-calendar-check" /> Fecha Entrega
              </label>
              <input
                type="date"
                name="delivery_date"
                className="cm-input"
                value={form.delivery_date || ""}
                onChange={props.onChangeForm}
              />
            </div>

            {/* Estado */}
            <div className="cm-form-group">
              <label className="cm-label">
                <i className="fas fa-flag" /> Estado
              </label>
              <select
                className="cm-input"
                name="sales_state"
                value={form.sales_state || ""}
                onChange={props.onChangeForm}
              >
                <option value="">Seleccione estado</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Parcial">Parcial</option>
                <option value="Entregado">Entregado</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          {/* Descripcion - full width */}
          <div className="cm-form-group" style={{ marginTop: "16px" }}>
            <label className="cm-label">
              <i className="fas fa-align-left" /> Descripcion
            </label>
            <textarea
              className="cm-input"
              name="description"
              rows="4"
              value={form.description || ""}
              onChange={props.onChangeForm}
              placeholder="Descripcion del material"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="cm-modal-footer">
          <button className="cm-btn cm-btn-secondary" onClick={props.toggle}>
            <i className="fas fa-times" /> Cancelar
          </button>
          <button
            className="cm-btn cm-btn-primary"
            onClick={props.submit}
            disabled={saving}
          >
            {saving ? (
              <span>
                <i className="fas fa-spinner fa-spin" /> Guardando...
              </span>
            ) : (
              <span>
                <i className="fas fa-save" /> {props.nameSubmit || "Guardar"}
              </span>
            )}
          </button>
        </div>
      </div>

      <style>{`
        .cm-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .cm-modal {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .cm-modal-lg {
          width: 100%;
          max-width: 700px;
        }

        .cm-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid #e2e5ea;
          background: linear-gradient(135deg, #f8f9fa 0%, #fff 100%);
        }

        .cm-modal-title {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: #333;
          display: flex;
          align-items: center;
        }

        .cm-modal-close {
          background: none;
          border: none;
          font-size: 20px;
          color: #888;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .cm-modal-close:hover {
          background: #f0f0f0;
          color: #333;
        }

        .cm-modal-body {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }

        .cm-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #e2e5ea;
          background: #fcfcfd;
        }

        .cm-form-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        @media (max-width: 600px) {
          .cm-form-grid-2 {
            grid-template-columns: 1fr;
          }
        }

        .cm-form-group {
          display: flex;
          flex-direction: column;
        }

        .cm-label {
          font-size: 13px;
          font-weight: 400;
          color: #555;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .cm-label i {
          color: #f5a623;
          width: 16px;
          text-align: center;
        }

        .cm-input {
          width: 100%;
          padding: 10px 12px;
          font-size: 14px;
          border: 1px solid #e2e5ea;
          border-radius: 8px;
          background: #fcfcfd;
          transition: all 0.2s;
          box-sizing: border-box;
        }

        .cm-input:focus {
          outline: none;
          border-color: #f5a623;
          box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.15);
          background: #fff;
        }

        .cm-input::placeholder {
          color: #aaa;
        }

        textarea.cm-input {
          resize: vertical;
          min-height: 80px;
        }

        select.cm-input {
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 32px;
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
          transition: all 0.2s;
        }

        .cm-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .cm-btn-primary {
          background: linear-gradient(135deg, #f5a623 0%, #e6951c 100%);
          color: #fff;
          box-shadow: 0 2px 8px rgba(245, 166, 35, 0.3);
        }

        .cm-btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #e6951c 0%, #d58619 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(245, 166, 35, 0.4);
        }

        .cm-btn-secondary {
          background: #fff;
          color: #666;
          border: 1px solid #ddd;
        }

        .cm-btn-secondary:hover:not(:disabled) {
          background: #f5f5f5;
          border-color: #ccc;
        }

        .cm-form-errors {
          background: #fff5f5;
          border: 1px solid #ffcdd2;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 16px;
          color: #c62828;
          font-size: 14px;
        }

        .cm-form-errors ul {
          margin: 0;
          padding-left: 20px;
        }

        .cm-form-errors li {
          margin: 4px 0;
        }

        .cm-form-errors p {
          margin: 0;
        }
      `}</style>
    </div>
  );
};

export default FormCreate;
