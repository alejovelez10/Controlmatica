import React, { Component } from 'react';
import NumberFormat from 'react-number-format';
import Select from "react-select";
import { CmModal, CmButton } from "../../generalcomponents/ui";

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

// Nombres legibles de los campos que devuelve la extraccion. Son las claves DEL
// SERVICIO (provider_name, value…), que es como llega la matriz `confidence`.
// Espeja EXTRACTION_FIELD_LABELS de report_expenses_controller.rb.
const ETIQUETAS_EXTRACCION = {
  provider_name: "el nombre del proveedor",
  identification: "el NIT o cédula",
  invoice_number: "el número de factura",
  invoice_date: "la fecha de la factura",
  currency: "la moneda",
  value: "el valor",
  tax: "los impuestos",
  total: "el total",
  description: "la descripción",
};

// Peso del comprobante. Se corta en MB porque el tope son 10 MB: no hay nada
// que decir por encima de eso.
function pesoLegible(bytes) {
  const n = Number(bytes);
  if (!n || n <= 0) return "Archivo listo";
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return Math.round(n / 1024) + " KB";
  return (n / (1024 * 1024)).toFixed(1).replace(".", ",") + " MB";
}

class FormCreate extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showMessage: false,
      message: "",
      costCenterInputValue: "",
      // Zona de arrastre. `receiptDragging` es puramente visual y `receiptSize`
      // se guarda AQUI —no en el padre— porque el padre solo expone el nombre
      // del archivo por props y agregarle una prop nueva obligaria a tocar
      // ExpensesTable, que es de otro dueno.
      receiptDragging: false,
      receiptSize: 0,
    };
    this.debounceTimer = null;
    this.receiptInput = null;
  }

  // --- Comprobante: seleccion y arrastre -------------------------------------
  //
  // El padre sigue siendo el que valida (extension y 10 MB) y el que guarda el
  // File: aqui solo se le entrega el archivo con la forma que ya entiende,
  // `{ target: { files } }`, para no duplicar las validaciones ni por el
  // arrastre ni por el clic.
  entregarArchivo = (files) => {
    const file = files && files[0];
    this.setState({ receiptSize: file ? file.size : 0 });
    if (this.props.onChangeFile) this.props.onChangeFile({ target: { files: files } });
  };

  handleReceiptChange = (e) => {
    this.entregarArchivo(e.target.files);
  };

  // preventDefault en dragOver es OBLIGATORIO: sin el, el navegador no considera
  // la zona un destino valido, nunca dispara drop y ABRE EL ARCHIVO en la
  // pestana, perdiendo el formulario a medio llenar.
  handleReceiptDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!this.state.receiptDragging) this.setState({ receiptDragging: true });
  };

  handleReceiptDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ receiptDragging: false });
  };

  handleReceiptDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ receiptDragging: false });
    // Solo el primero: el gasto tiene UN comprobante.
    this.entregarArchivo(e.dataTransfer && e.dataTransfer.files);
  };

  abrirSelectorComprobante = () => {
    if (this.receiptInput) this.receiptInput.click();
  };

  handleSubmit = (e) => {
    e.preventDefault();
  };

  copyQuestion = (value, name) => {
    this.setState({
      showMessage: true,
      message: name,
    });
    setTimeout(() => {
      this.setState({ showMessage: false });
    }, 2000);
    navigator.clipboard.writeText(value);
  };

  handleCostCenterInputChange = (inputValue, { action }) => {
    if (action === "input-change") {
      this.setState({ costCenterInputValue: inputValue });
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      if (inputValue.length >= 2 && this.props.onCostCenterSearch) {
        this.debounceTimer = setTimeout(() => {
          this.props.onCostCenterSearch(inputValue);
        }, 300);
      }
    }
  };

  componentWillUnmount() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }

  // Aviso de disponible presupuestal. Es INFORMATIVO: nunca deshabilita el boton
  // Guardar. Un gasto que excede el cupo se guarda igual y queda marcado como
  // "Excedido" (requisito explicito §2.1/§3.2); bloquearlo aqui seria un defecto,
  // no una mejora.
  renderBudgetHint = () => {
    const a = this.props.budgetAvailability;
    if (!a || a.loading || a.error) return null;

    if (!a.has_budget) {
      return (
        <div className="cm-field-hint" data-testid="expense-budget-none">
          Esta persona no tiene presupuesto asignado en este centro de costos.
        </div>
      );
    }

    const disponible = parseFloat(a.available || 0);
    const valor = parseFloat(this.props.formValues.invoice_value || 0);

    if (valor <= disponible) {
      return (
        <div className="cm-field-hint" data-testid="expense-budget-ok">
          Disponible: <NumberFormat value={disponible} displayType="text" thousandSeparator={true} prefix="$" />
        </div>
      );
    }

    return (
      <div className="cm-alert cm-alert-warning" data-testid="expense-budget-warning">
        Este gasto excede el disponible en{" "}
        <NumberFormat value={valor - disponible} displayType="text" thousandSeparator={true} prefix="$" />.
        {" "}Se guardará marcado como <strong>Excedido</strong>.
      </div>
    );
  };

  // Estados de la consulta de TRM. Un fallo es ADVERTENCIA, no bloqueo: el
  // usuario escribe la tasa a mano y `exchange_rate_source` pasa a "manual".
  renderRateStatus = () => {
    const e = this.props.exchange || {};

    // EL ERROR VA PRIMERO. Con la tasa escrita a mano, `exchange_rate_source` es
    // "manual", y esa rama devolvia antes de llegar aqui: el aviso de por que
    // fallo la consulta quedaba tapado por el texto "Tasa ingresada manualmente"
    // y el usuario no veia nada al pulsar el boton.
    if (e.status === "error") {
      return <div className="cm-alert cm-alert-warning" data-testid="expense-rate-error">{e.message}</div>;
    }
    if (e.status === "loading") {
      return <div className="cm-field-hint" data-testid="expense-rate-loading"><i className="fa fa-spinner fa-spin"></i> Consultando la tasa…</div>;
    }
    if (this.props.formValues.exchange_rate_source === "manual") {
      return <div className="cm-field-hint">Tasa ingresada manualmente</div>;
    }
    if (e.status === "ok" && e.rate_date !== e.requested_date) {
      return (
        <div className="cm-alert cm-alert-warning" data-testid="expense-rate-shifted">
          No hay tasa para el {e.requested_date}; se aplicó la del {e.rate_date}.
        </div>
      );
    }
    if (e.status === "ok") {
      return <div className="cm-field-hint" data-testid="expense-rate-ok">Tasa de {e.rate_date} ({e.source})</div>;
    }
    return null;
  };

  renderForeignBlock = () => {
    const f = this.props.formValues;
    if (!f || f.currency === "COP" || !f.currency) return null;

    return (
      <div className="cm-budget-foreign" data-testid="expense-foreign-block">
        <div className="cm-form-grid-3">
          <div className="cm-form-group">
            <label className="cm-label"><i className="fa fa-money-bill"></i> Valor en {f.currency}</label>
            <NumberFormat
              name="foreign_value" thousandSeparator={true} className="cm-input"
              value={f.foreign_value} onChange={this.props.onChangeForeignMoney}
              placeholder="0" data-testid="expense-foreign-value"
            />
          </div>
          <div className="cm-form-group">
            <label className="cm-label"><i className="fa fa-percent"></i> IVA en {f.currency}</label>
            <NumberFormat
              name="foreign_tax" thousandSeparator={true} className="cm-input"
              value={f.foreign_tax} onChange={this.props.onChangeForeignMoney}
              placeholder="0" data-testid="expense-foreign-tax"
            />
          </div>
          <div className="cm-form-group">
            <label className="cm-label"><i className="fa fa-calculator"></i> Total en {f.currency}</label>
            <NumberFormat
              thousandSeparator={true} className="cm-input cm-input-disabled"
              value={f.foreign_total} disabled data-testid="expense-foreign-total"
            />
          </div>
        </div>

        <div className="cm-form-grid-3">
          <div className="cm-form-group">
            <label className="cm-label"><i className="fa fa-exchange-alt"></i> TRM</label>
            <NumberFormat
              name="exchange_rate" thousandSeparator={true} decimalScale={6} className="cm-input"
              value={f.exchange_rate} onChange={this.props.onChangeRate}
              placeholder="0" data-testid="expense-rate"
            />
          </div>
          <div className="cm-form-group">
            <label className="cm-label"><i className="fa fa-calendar"></i> Fecha de la tasa</label>
            <input type="date" name="exchange_rate_date" className="cm-input cm-input-disabled"
                   disabled value={f.exchange_rate_date || ""} readOnly
                   data-testid="expense-rate-date" />
          </div>
          <div className="cm-form-group">
            <label className="cm-label">&nbsp;</label>
            <button type="button" className="cm-btn cm-btn-outline cm-btn-sm"
                    onClick={this.props.onFetchRate} data-testid="expense-fetch-rate-btn">
              <i className="fa fa-sync"></i> Consultar TRM
            </button>
          </div>
        </div>

        {this.renderRateStatus()}

        <div className="cm-info-row" data-testid="expense-cop-preview">
          <span className="cm-info-label">Equivalente en COP</span>
          <NumberFormat value={f.invoice_total} displayType="text" thousandSeparator={true} prefix="$" className="cm-info-value" />
        </div>

        {/* Marcar esta casilla escribe LAS DOS banderas (`cop_manual_override` y
            `exchange_rate_source = "manual"`). Sin la primera, el servidor
            recalcula el COP en cada save desde foreign_* x TRM y pisa en
            silencio lo que el usuario ajusto a mano. */}
        <label className="cm-label" style={{ marginTop: 8 }}>
          <input type="checkbox" checked={!!f.cop_manual_override}
                 onChange={this.props.onToggleCopManual} data-testid="expense-cop-manual-toggle" />
          {" "}Ajusté el valor en COP a mano (no recalcular)
        </label>
      </div>
    );
  };

  renderExtraction = () => {
    // KILL SWITCH: sin el flag, el boton no se pinta. El endpoint de extraccion
    // lo completa Taimes (ver ESTADO.md, "Frontera de alcance"), asi que arranca
    // apagado y el formulario se llena a mano, que es lo que se hace hoy.
    if (!this.props.extractionEnabled) return null;

    const x = this.props.extraction || { status: "idle", filled: [], confidence: {}, warnings: [], violations: [] };

    // TODOS los avisos van a UNA sola lista. Antes cada tipo abria su propia
    // caja .cm-alert con su borde y sus 16px de margen: una extraccion normal
    // (un aviso de tasa + dos reglas + tres campos dudosos) apilaba SEIS cajas
    // debajo del boton y empujaba fuera de la pantalla los campos que justamente
    // hay que revisar.
    const avisos = [];

    (x.warnings || []).forEach((w, i) => avisos.push({ key: "w" + i, tono: "warn", texto: w }));

    // Una violacion blocking:true INFORMA pero no deshabilita Guardar: la puerta
    // de bloqueo es del servidor.
    (x.violations || []).forEach((v, i) => avisos.push({
      key: "v" + i,
      tono: v.blocking ? "danger" : "warn",
      texto: v.message || v.rule || "",
      testid: "expense-rule-violation",
    }));

    // SOLO la franja 0,60–0,80. Por debajo de 0,60 el servidor ya manda su
    // propio aviso redactado (CONFIDENCE_WARN en receipt_extraction_service.rb),
    // asi que pintar todo lo menor que 0,80 mostraba el MISMO campo dos veces:
    // una con texto entendible y otra con la clave cruda ("provider_name").
    Object.keys(x.confidence || {}).forEach((k) => {
      const c = x.confidence[k];
      if (!(c >= 0.6 && c < 0.8)) return;
      avisos.push({
        key: "c" + k,
        tono: "info",
        texto: "Revise " + (ETIQUETAS_EXTRACCION[k] || k) + ": la lectura no es del todo segura.",
        testid: "expense-low-confidence-" + k,
      });
    });

    return (
      <div className="cm-extract">
        <button type="button" className="cm-btn cm-btn-pastel cm-btn-pastel--blue cm-btn-sm"
                onClick={this.props.onExtract}
                disabled={!this.props.receiptFileName || x.status === "loading"}
                data-testid="expense-extract-btn">
          <i className="fa fa-magic"></i> Extraer datos del comprobante
        </button>

        {/* La barra indeterminada existe porque la espera llega a 20 s y un
            spinner quieto tanto rato se lee como "se colgo". */}
        {x.status === "loading" && (
          <div className="cm-extract-progress" data-testid="expense-extract-loading">
            <div className="cm-extract-progress-bar"></div>
            <span className="cm-extract-progress-text">
              <i className="fa fa-spinner fa-spin"></i> Leyendo el comprobante… Esto puede tardar hasta 20 segundos.
            </span>
          </div>
        )}

        {x.status === "error" && (
          <div className="cm-extract-note cm-extract-note--warn" data-testid="expense-extract-error">
            <i className="fa fa-exclamation-triangle cm-extract-note-icon"></i>
            <span>{x.message} Complete los datos manualmente.</span>
          </div>
        )}

        {x.status === "done" && (
          <div className="cm-extract-result">
            <div className="cm-extract-head" data-testid="expense-extract-done">
              <i className="fa fa-check-circle cm-extract-head-icon"></i>
              <span>
                Se precargaron {x.filled.length} campos. <strong>Revíselos antes de guardar.</strong>
              </span>
            </div>

            {avisos.length > 0 && (
              <ul className="cm-extract-notes" data-testid="expense-extract-warnings">
                {avisos.map((a) => (
                  <li key={a.key} className={"cm-extract-note cm-extract-note--" + a.tono}
                      data-testid={a.testid}>
                    <i className={"cm-extract-note-icon fa " + (a.tono === "info" ? "fa-info-circle" : "fa-exclamation-triangle")}></i>
                    <span>{a.texto}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  };

  renderReceiptBlock = () => (
    <div className="cm-form-grid-1">
      <div className="cm-form-group">
        <label className="cm-label">
          <i className="fa fa-paperclip"></i> Comprobante
        </label>
        {/* ZONA DE ARRASTRE. Reemplaza al `<input type="file">` nativo, que cada
            navegador pinta a su manera ("Choose File" en ingles dentro de una app
            en espanol) y que no admite soltar el archivo encima, que es como
            llega la foto de la factura desde el escritorio.

            El input sigue en el DOM con su data-testid, solo que oculto: es lo
            unico que necesitan `setInputFiles` de Playwright y los lectores de
            pantalla. */}
        <div className={"cm-dropzone"
                        + (this.state.receiptDragging ? " cm-dropzone--active" : "")
                        + (this.props.receiptFileName ? " cm-dropzone--filled" : "")}
             onDragOver={this.handleReceiptDragOver}
             onDragEnter={this.handleReceiptDragOver}
             onDragLeave={this.handleReceiptDragLeave}
             onDrop={this.handleReceiptDrop}
             onClick={this.abrirSelectorComprobante}
             onKeyDown={(e) => {
               if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.abrirSelectorComprobante(); }
             }}
             role="button"
             tabIndex={0}
             data-testid="expense-receipt-dropzone">
          <input type="file" className="cm-dropzone-input"
                 ref={(el) => { this.receiptInput = el; }}
                 accept=".jpg,.jpeg,.png,.webp,.heic,.pdf,image/*,application/pdf"
                 onChange={this.handleReceiptChange}
                 /* Sin esto el clic del input vuelve a burbujear al div, que
                    llama otra vez a click(): el selector se abre en bucle. */
                 onClick={(e) => e.stopPropagation()}
                 data-testid="expense-receipt-input" />

          {this.props.receiptFileName ? (
            <div className="cm-dropzone-file" data-testid="expense-receipt-name">
              <i className="fa fa-file-invoice cm-dropzone-file-icon"></i>
              <div className="cm-dropzone-file-body">
                <span className="cm-dropzone-file-name">{this.props.receiptFileName}</span>
                <span className="cm-dropzone-file-meta">
                  {pesoLegible(this.state.receiptSize)} · Haga clic o suelte otro archivo para reemplazarlo
                </span>
              </div>
              <button type="button" className="cm-dropzone-clear" title="Quitar el archivo"
                      onClick={(e) => { e.stopPropagation(); this.entregarArchivo(null); }}
                      data-testid="expense-receipt-clear">
                <i className="fa fa-times"></i>
              </button>
            </div>
          ) : (
            <div className="cm-dropzone-empty">
              <i className="fa fa-cloud-upload-alt cm-dropzone-icon"></i>
              <span className="cm-dropzone-title">Arrastre aquí su comprobante</span>
              <span className="cm-dropzone-hint">
                o haga clic para buscarlo · JPG, PNG, WEBP, HEIC o PDF · hasta 10 MB
              </span>
            </div>
          )}
        </div>

        {this.props.receiptExistingId ? (
          <div className="cm-field-hint" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {/* El destino es SIEMPRE /download_receipt/report_expenses/:id.
                La URL firmada de S3 caduca a los 600 s. */}
            <a href={"/download_receipt/report_expenses/" + this.props.receiptExistingId}
               target="_blank" rel="noopener noreferrer">
              <i className="fa fa-download"></i> Ver comprobante actual
            </a>
            <button type="button" className="cm-btn cm-btn-outline cm-btn-sm"
                    onClick={this.props.onPreviewReceipt}>
              <i className="fa fa-eye"></i> Previsualizar
            </button>
            {this.props.onDeleteReceipt ? (
              <button type="button" className="cm-btn cm-btn-outline cm-btn-sm"
                      onClick={this.props.onDeleteReceipt} data-testid="expense-receipt-delete">
                <i className="fa fa-trash"></i> Quitar
              </button>
            ) : null}
          </div>
        ) : null}

        {this.props.receiptError ? (
          <div className="cm-alert cm-alert-danger" data-testid="expense-receipt-error">
            {this.props.receiptError}
          </div>
        ) : null}

        {this.renderExtraction()}
      </div>
    </div>
  );

  render() {
    const costCenterOptions = this.props.costCenterOptions || this.props.cost_centers || [];
    const costCenterLoading = this.props.costCenterLoading || false;

    return (
      <CmModal
        isOpen={this.props.modal}
        toggle={this.props.toggle}
        size="lg"
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <i className="fa fa-receipt" style={{ color: "#f5a623" }}></i>
            {this.props.title}
          </div>
        }
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <CmButton variant="outline" onClick={() => this.props.toggle()}>
              <i className="fa fa-times"></i> Cancelar
            </CmButton>
            <CmButton variant="accent" onClick={this.props.submitForm} disabled={!!this.props.saving}>
              {this.props.saving
                ? <span><i className="fa fa-spinner fa-spin"></i> Guardando…</span>
                : <span><i className="fa fa-save"></i> {this.props.nameBnt}</span>}
            </CmButton>
          </div>
        }
      >
        <form onSubmit={this.handleSubmit}>
              {this.state.showMessage && (
                <div className="alert alert-warning mb-3">
                  {this.state.message} copiado
                </div>
              )}

              <div className="cm-form-grid-2">
                {this.props.cost_center_id === undefined && (
                  <div className="cm-form-group">
                    <input
                      type="hidden"
                      name="cost_center_id"
                      value={this.props.selectedOptionCostCenter.cost_center_id}
                    />
                    <label className="cm-label">
                      <i className="fa fa-building"></i> Centro de costo
                    </label>
                    {/* react-select no propaga atributos sueltos al DOM: el
                        data-testid va en un div envolvente. Solo se agrega el
                        div; ni el isDisabled, ni las opciones, ni el onChange
                        se tocan. */}
                    <div data-testid="expense-cost-center-select">
                    <Select
                      onChange={this.props.handleChangeAutocompleteCostCenter}
                      options={costCenterOptions}
                      autoFocus={false}
                      styles={selectStyles}
                      menuPortalTarget={document.body}
                      className={`${
                        !this.props.errorValues &&
                        this.props.formValues.cost_center_id === ""
                          ? "error-class"
                          : ""
                      }`}
                      value={this.props.selectedOptionCostCenter}
                      onInputChange={this.handleCostCenterInputChange}
                      inputValue={this.state.costCenterInputValue}
                      isLoading={costCenterLoading}
                      placeholder="Buscar centro de costo..."
                      noOptionsMessage={() =>
                        this.state.costCenterInputValue.length < 2
                          ? "Escribe al menos 2 caracteres"
                          : "Sin resultados"
                      }
                    />
                    </div>
                  </div>
                )}

                <div className="cm-form-group">
                  <input
                    type="hidden"
                    name="user_invoice_id"
                    value={this.props.selectedOptionUser.user_invoice_id}
                  />
                  <label className="cm-label">
                    <i className="fa fa-user"></i> Usuario
                  </label>
                  <div data-testid="expense-user-select">
                  <Select
                    onChange={this.props.handleChangeAutocompleteUser}
                    options={this.props.users}
                    autoFocus={false}
                    styles={selectStyles}
                    menuPortalTarget={document.body}
                    className={`${
                      !this.props.errorValues &&
                      this.props.formValues.user_invoice_id === ""
                        ? "error-class"
                        : ""
                    }`}
                    value={this.props.selectedOptionUser}
                    isDisabled={!this.props.estados.show_user}
                    placeholder="Seleccionar usuario..."
                  />
                  </div>
                  {this.renderBudgetHint()}
                </div>

                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-calendar"></i> Fecha de factura
                  </label>
                  <input
                    type="date"
                    name="invoice_date"
                    value={this.props.formValues.invoice_date}
                    onChange={this.props.onChangeForm}
                    className={`cm-input ${
                      !this.props.errorValues &&
                      this.props.formValues.invoice_date === ""
                        ? "error-class"
                        : ""
                    }`}
                  />
                </div>

                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-id-card"></i> NIT / Cedula
                  </label>
                  <input
                    type="text"
                    name="identification"
                    value={this.props.formValues.identification}
                    onChange={this.props.onChangeForm}
                    className={`cm-input ${
                      !this.props.errorValues &&
                      this.props.formValues.name === ""
                        ? "error-class"
                        : ""
                    }`}
                    placeholder="Ingrese NIT o cedula"
                  />
                </div>
              </div>

              <div className="cm-form-grid-1">
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-user-circle"></i> Nombre
                  </label>
                  <input
                    type="text"
                    name="invoice_name"
                    value={this.props.formValues.invoice_name}
                    onChange={this.props.onChangeForm}
                    className={`cm-input ${
                      !this.props.errorValues &&
                      this.props.formValues.name === ""
                        ? "error-class"
                        : ""
                    }`}
                    placeholder="Nombre del proveedor o tercero"
                  />
                </div>

                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-align-left"></i> Descripcion
                  </label>
                  <textarea
                    rows="3"
                    name="description"
                    value={this.props.formValues.description}
                    onChange={this.props.onChangeForm}
                    className={`cm-input cm-textarea ${
                      !this.props.errorValues &&
                      this.props.formValues.description === ""
                        ? "error-class"
                        : ""
                    }`}
                    placeholder="Descripcion del gasto"
                  />
                </div>
              </div>

              <div className="cm-form-grid-3">
                <div className="cm-form-group">
                  <input
                    type="hidden"
                    name="type_identification_id"
                    value={this.props.selectedOptionTypeIndentification.type_identification_id}
                  />
                  <label className="cm-label">
                    <i className="fa fa-tag"></i> Tipo
                  </label>
                  <Select
                    onChange={this.props.handleChangeAutocompleteReportExpenceOptionType}
                    options={this.props.report_expense_options_type}
                    autoFocus={false}
                    styles={selectStyles}
                    menuPortalTarget={document.body}
                    className={`${
                      !this.props.errorValues &&
                      this.props.formValues.type_identification_id === ""
                        ? "error-class"
                        : ""
                    }`}
                    value={this.props.selectedOptionTypeIndentification}
                    placeholder="Seleccionar tipo..."
                  />
                  {this.props.selectedOptionTypeIndentification && this.props.selectedOptionTypeIndentification.label ? (
                    <div className="cm-field-hint cm-field-hint--copyable" onClick={() => this.copyQuestion(this.props.selectedOptionTypeIndentification.label, "Tipo")}>
                      <i className="fa fa-copy"></i> {this.props.selectedOptionTypeIndentification.label}
                    </div>
                  ) : null}
                </div>

                <div className="cm-form-group">
                  <input
                    type="hidden"
                    name="payment_type_id"
                    value={this.props.selectedOptionPaymentType.payment_type_id}
                  />
                  <label className="cm-label">
                    <i className="fa fa-credit-card"></i> Medio de pago
                  </label>
                  <Select
                    onChange={this.props.handleChangeAutocompleteReportExpenceOptionPaymentType}
                    options={this.props.report_expense_options_payment}
                    autoFocus={false}
                    styles={selectStyles}
                    menuPortalTarget={document.body}
                    className={`${
                      !this.props.errorValues &&
                      this.props.formValues.payment_type_id === ""
                        ? "error-class"
                        : ""
                    }`}
                    value={this.props.selectedOptionPaymentType}
                    placeholder="Seleccionar medio..."
                  />
                  {this.props.selectedOptionPaymentType && this.props.selectedOptionPaymentType.label ? (
                    <div className="cm-field-hint cm-field-hint--copyable" onClick={() => this.copyQuestion(this.props.selectedOptionPaymentType.label, "Medio de pago")}>
                      <i className="fa fa-copy"></i> {this.props.selectedOptionPaymentType.label}
                    </div>
                  ) : null}
                </div>

                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-file-invoice"></i> Numero de factura
                  </label>
                  <input
                    type="text"
                    name="invoice_number"
                    value={this.props.formValues.invoice_number}
                    onChange={this.props.onChangeForm}
                    className={`cm-input ${
                      !this.props.errorValues &&
                      this.props.formValues.invoice_number === ""
                        ? "error-class"
                        : ""
                    }`}
                    placeholder="Numero de factura"
                  />
                </div>
              </div>

              <hr className="cm-divider" />

              <div className="cm-form-grid-3">
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-coins"></i> Moneda
                  </label>
                  {/* El select de moneda esta SIEMPRE visible, tambien en COP:
                      es lo que le dice al usuario en que moneda esta el gasto
                      que ya existe. El sub-bloque extranjero es el condicional. */}
                  <div data-testid="expense-currency-select">
                    <Select
                      options={this.props.currencyOptions || []}
                      value={this.props.selectedOptionCurrency}
                      onChange={this.props.onChangeCurrency}
                      styles={selectStyles}
                      menuPortalTarget={document.body}
                      placeholder="Moneda..."
                    />
                  </div>
                </div>

                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-dollar-sign"></i> Valor del pago
                  </label>
                  <NumberFormat
                    name="invoice_value"
                    thousandSeparator={true}
                    prefix={"$"}
                    className={`cm-input ${
                      !this.props.errorValues &&
                      this.props.formValues.invoice_value === ""
                        ? "error-class"
                        : ""
                    }`}
                    value={this.props.formValues.invoice_value}
                    onChange={this.props.onChangeFormMoney}
                    placeholder="$0"
                  />
                </div>

                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-percent"></i> IVA
                  </label>
                  <NumberFormat
                    name="invoice_tax"
                    thousandSeparator={true}
                    prefix={"$"}
                    className={`cm-input ${
                      !this.props.errorValues &&
                      (!this.props.formValues.invoice_tax ||
                        this.props.formValues.invoice_tax !== "") &&
                      this.props.formValues.invoice_tax !== 0
                        ? "error-class"
                        : ""
                    }`}
                    value={this.props.formValues.invoice_tax}
                    onChange={this.props.onChangeFormMoney}
                    placeholder="$0"
                  />
                </div>

              </div>

              {this.renderForeignBlock()}

              <div className="cm-form-grid-3">
                <div className="cm-form-group">
                  <label className="cm-label">
                    <i className="fa fa-calculator"></i> Total
                  </label>
                  <NumberFormat
                    thousandSeparator={true}
                    prefix={"$"}
                    className={`cm-input cm-input-disabled ${
                      !this.props.errorValues &&
                      this.props.formValues.invoice_total === ""
                        ? "error-class"
                        : ""
                    }`}
                    value={this.props.formValues.invoice_total}
                    disabled
                  />
                </div>
              </div>

              {this.renderReceiptBlock()}

              {!this.props.errorValues && (
                <div className="cm-error-message">
                  <i className="fa fa-exclamation-circle"></i>
                  Debes completar todos los campos requeridos
                </div>
              )}
        </form>

        <style>{`
          .cm-form-grid-1 {
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px;
            margin-bottom: 16px;
          }
          .cm-form-grid-2 {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin-bottom: 16px;
          }
          .cm-form-grid-3 {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-bottom: 16px;
          }
          @media (max-width: 768px) {
            .cm-form-grid-2,
            .cm-form-grid-3 {
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
            color: #374151;
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .cm-label i {
            color: #6b7280;
            font-size: 12px;
          }
          .cm-input {
            width: 100%;
            padding: 10px 14px;
            border: 1px solid #e2e5ea;
            border-radius: 8px;
            font-size: 14px;
            background: #fcfcfd;
            transition: all 0.2s ease;
            box-sizing: border-box;
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
          .cm-input::placeholder {
            color: #9ca3af;
          }
          .cm-textarea {
            resize: vertical;
            min-height: 80px;
          }
          .cm-input-disabled {
            background: #edf2f7;
            cursor: not-allowed;
            color: #6b7280;
          }
          .cm-field-hint {
            font-size: 12px;
            color: #6b7280;
            margin-top: 4px;
          }
          .cm-field-hint--copyable {
            cursor: pointer;
            color: #4d99db;
            display: inline-flex;
            align-items: center;
            gap: 4px;
          }
          .cm-field-hint--copyable:hover {
            text-decoration: underline;
            color: #2a7ac0;
          }
          .cm-divider {
            border: none;
            border-top: 1px solid #e2e5ea;
            margin: 20px 0;
          }
          .cm-error-message {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 12px 16px;
            color: #dc2626;
            font-size: 14px;
            margin-top: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .error-class {
            border-color: #dc3545 !important;
            box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.15) !important;
          }
        `}</style>
      </CmModal>
    );
  }
}

export default FormCreate;
