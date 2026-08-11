import React, { Component } from 'react';
import NumberFormat from "react-number-format";
import Swal from "sweetalert2";
import FormCreate from '../ReportExpense/FormCreate';
import { CmDataTable, CmModal, CmButton } from '../../generalcomponents/ui';
import { budgetStatusBadge, accountingBadge, shortDate, toNumber } from '../../generalcomponents/expenseIndicators';

function csrfToken() {
  var meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}

// FUENTE UNICA del catalogo de monedas: el global que el paquete 05 publica en
// layouts/user.html.erb. Llega igual a los dos formularios de gasto, incluido el
// modal del indice de Gastos, que por props no recibiria nada. El fallback a COP
// evita que un layout sin el script tumbe el render entero del formulario.
function currencyOptions() {
  return window.CM_CURRENCIES || [{ value: "COP", label: "COP — Peso colombiano" }];
}

// KILL SWITCH DE LA CAPTURA ASISTIDA.
//
// Arranca APAGADO a proposito: el endpoint POST /extract_receipt/report_expenses
// todavia no existe (la llamada al modelo de vision la completa Taimes, ver
// docs/plan-gastos-ia/ESTADO.md "Frontera de alcance"). El boton queda
// construido y probado, pero no se pinta hasta que alguien publique el flag.
//
// Para encenderlo hace falta UNA linea en layouts/user.html.erb —
//   window.CM_RECEIPT_EXTRACTION_ENABLED = <%= ReceiptExtractionService.enabled? %>;
// — y ese archivo tiene dueno por bloque (paquetes 01, 05 y 09), asi que no se
// escribe desde aqui. Queda anotado como pendiente en ESTADO.md.
function receiptExtractionEnabled() {
  return window.CM_RECEIPT_EXTRACTION_ENABLED === true;
}

var EXTENSIONES_COMPROBANTE = ["jpg", "jpeg", "png", "pdf", "webp", "heic"];
var TAMANO_MAXIMO_COMPROBANTE = 10 * 1024 * 1024;

var EXTRACTION_VACIA = { status: "idle", message: null, filled: [], confidence: {}, warnings: [], violations: [] };
var EXCHANGE_VACIO = { status: "idle", message: null, rate_date: null, requested_date: null, source: null };
var DISPONIBLE_VACIO = { loading: false, error: null, has_budget: false, assigned: "0.0", spent: "0.0", available: "0.0" };

class ExpensesTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      modal: false,
      modeEdit: false,
      ErrorValues: true,
      saving: false,
      id: "",
      data: [],
      loading: true,
      meta: { total: 0, page: 1, per_page: 100, total_pages: 1 },
      searchTerm: "",
      sortKey: null,
      sortDir: "desc",
      report_expense_options_type: [],
      report_expense_options_payment: [],
      formCreate: this.emptyForm(),
      selectedOptionCostCenter: { cost_center_id: "", label: "Centro de costo" },
      selectedOptionUser: { user_invoice_id: this.props.usuario.id, label: this.props.usuario.names },
      selectedOptionTypeIndentification: { type_identification_id: "", label: "" },
      selectedOptionPaymentType: { payment_type_id: "", label: "" },
      selectedOptionCurrency: { value: "COP", label: "COP — Peso colombiano" },
      // Comprobante. `receiptExistingId` guarda el ID DEL GASTO, nunca la URL
      // firmada: con fog_public = false esa URL caduca a los 600 s y el enlace
      // se rompe solo. El destino siempre se arma contra
      // /download_receipt/report_expenses/:id.
      receiptFile: null,
      receiptFileName: "",
      receiptExistingId: null,
      receiptError: null,
      receiptPreview: { open: false, id: null, name: "" },
      receiptPreviewError: false,
      extraction: Object.assign({}, EXTRACTION_VACIA),
      exchange: Object.assign({}, EXCHANGE_VACIO),
      budgetAvailability: Object.assign({}, DISPONIBLE_VACIO),
    };

    this.columns = [
      // Mismo prefijo `expense-*` que el indice de Gastos a proposito: es la
      // misma entidad y los E2E distinguen la pantalla por la URL, no por el
      // testid.
      { key: "id", label: "ID", width: "80px", render: (r) => <span data-testid={"expense-ref-" + r.id} style={{ fontWeight: 600, color: "#6c757d" }}>{"#" + r.id}</span> },
      { key: "user_invoice_name", label: "Responsable", render: (r) => r.user_invoice ? r.user_invoice.names : "" },
      { key: "invoice_name", label: "Nombre" },
      { key: "invoice_date", label: "Fecha factura" },
      { key: "identification", label: "NIT / Cédula" },
      { key: "description", label: "Descripción", render: (r) => <div className="cm-cell-truncate" data-tooltip={r.description || ""}><span className="cm-cell-truncate-text">{r.description || "—"}</span></div> },
      { key: "invoice_number", label: "# Factura" },
      { key: "type_identification_name", label: "Tipo", render: (r) => r.type_identification ? r.type_identification.name : "" },
      { key: "payment_type_name", label: "Medio pago", render: (r) => r.payment_type ? r.payment_type.name : "" },
      { key: "invoice_value", label: "Valor", render: (r) => <NumberFormat value={r.invoice_value} displayType="text" thousandSeparator={true} prefix="$" /> },
      { key: "invoice_tax", label: "IVA", render: (r) => <NumberFormat value={r.invoice_tax} displayType="text" thousandSeparator={true} prefix="$" /> },
      { key: "invoice_total", label: "Total", render: (r) => <NumberFormat value={r.invoice_total} displayType="text" thousandSeparator={true} prefix="$" /> },
      { key: "budget_status", label: "Estado presupuestal", width: "190px", render: (r) => {
        const badge = budgetStatusBadge(r.budget_status);
        return (
          <div data-testid={"expense-budget-status-" + r.id}>
            <span className={badge.className}>{badge.label}</span>
            {r.budget_status === "excedido" && r.budget_reason && (
              <div className="cm-cell-truncate" data-tooltip={r.budget_reason}>
                <span className="cm-cell-truncate-text">{r.budget_reason}</span>
              </div>
            )}
          </div>
        );
      } },
      { key: "currency", label: "Moneda", width: "90px", render: (r) => <span data-testid={"expense-currency-" + r.id}>{r.currency || "COP"}</span> },
      // sortable: false — `foreign_total` no esta en la allowlist de orden que
      // usa get_cost_center_report_expenses (F.2 solo agrego id, currency y
      // budget_status). Con sortable true el servidor ordenaria por el default
      // y la flecha del header mentiria.
      { key: "foreign_total", label: "Valor extranjero", width: "150px", sortable: false, render: (r) => {
        const total = toNumber(r.foreign_total);
        if (r.currency === "COP" || total === null) return "—";

        const rate = toNumber(r.exchange_rate);
        return (
          <span>
            <NumberFormat value={total} displayType="text" thousandSeparator={true} suffix={" " + r.currency} />
            {rate !== null && (
              <span className="cm-hint" style={{ display: "block" }}>
                {"TRM "}
                <NumberFormat value={rate} displayType="text" thousandSeparator={true} />
              </span>
            )}
          </span>
        );
      } },
      { key: "is_acepted", label: "Estado", render: (r) => r.is_acepted ? "Aceptado" : "Creado" },
      // sortable: false por la misma razon que foreign_total: F.2 no agrego
      // `accounting_approved` a la allowlist de este endpoint.
      { key: "accounting_approved", label: "Contabilidad", width: "170px", sortable: false, render: (r) => {
        const badge = accountingBadge(r.accounting_approved);
        return (
          <div data-testid={"expense-accounting-status-" + r.id}>
            <span className={badge.className}>{badge.label}</span>
            {r.accounting_approved && (
              <span className="cm-hint" style={{ display: "block" }}>
                {shortDate(r.accounting_approved_at) + (r.accounting_approved_by ? " · " + r.accounting_approved_by.names : "")}
              </span>
            )}
          </div>
        );
      } },
      // El href NUNCA es r.receipt_file.url. Esa es la URL firmada de S3 y
      // expira a los 600 s: una tabla abierta hace diez minutos entregaria 403
      // al hacer clic. `receipt_file.url` se usa SOLO como condicion de
      // existencia. sortable:false porque no es una columna real de la base.
      { key: "receipt_file", label: "Comprobante", width: "120px", sortable: false, render: (r) => {
        if (!r.receipt_file || !r.receipt_file.url) return <i className="fas fa-times" style={{ color: "#ccc" }} />;

        return (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <a href={"/download_receipt/report_expenses/" + r.id}
               target="_blank" rel="noopener noreferrer"
               className="cm-btn cm-btn-outline cm-btn-sm"
               title="Descargar comprobante"
               data-testid={"expense-receipt-link-" + r.id}>
              <i className="fas fa-download" />
            </a>
            <button type="button" className="cm-btn cm-btn-outline cm-btn-sm"
                    title="Previsualizar comprobante"
                    onClick={() => this.openReceiptPreview(r.id, r.receipt_file.name)}
                    data-testid={"expense-receipt-preview-" + r.id}>
              <i className="fas fa-eye" />
            </button>
          </div>
        );
      } },
    ];
  }

  componentDidMount() {
    this.configSelect();
    this.loadData();
  }

  componentWillUnmount() {
    if (this._availTimer) clearTimeout(this._availTimer);
  }

  // Formulario en blanco. Se usa en el constructor Y en clearValues para que no
  // haya dos listas de campos que se desincronizan: olvidar uno de los siete
  // campos de moneda deja el gasto siguiente con la TRM del anterior.
  emptyForm = () => ({
    cost_center_id: this.props.cost_center.id,
    user_invoice_id: this.props.usuario.id,
    invoice_name: "", invoice_date: "", description: "", invoice_number: "",
    identification: "", invoice_type: "", invoice_value: "", invoice_tax: "",
    invoice_total: "", type_identification_id: "", payment_type_id: "",
    currency: "COP", foreign_value: "", foreign_tax: "", foreign_total: "",
    exchange_rate: "", exchange_rate_date: "", exchange_rate_source: "",
    cop_manual_override: false,
  });

  configSelect = () => {
    var type = [], payment = [];
    if (this.props.report_expense_options) {
      this.props.report_expense_options.filter((i) => i.category === "Tipo").forEach((i) => { type.push({ label: i.name, value: i.id }); });
      this.props.report_expense_options.filter((i) => i.category === "Medio de pago").forEach((i) => { payment.push({ label: i.name, value: i.id }); });
    }
    this.setState({ report_expense_options_type: type, report_expense_options_payment: payment });
  };

  loadData = (page, perPage, searchTerm, sortKey, sortDir) => {
    var p = page || this.state.meta.page;
    var pp = perPage || this.state.meta.per_page;
    var term = searchTerm !== undefined ? searchTerm : this.state.searchTerm;
    var sk = sortKey !== undefined ? sortKey : this.state.sortKey;
    var sd = sortDir !== undefined ? sortDir : this.state.sortDir;

    this.setState({ loading: true });

    var params = ["page=" + p, "per_page=" + pp];
    if (term) params.push("q=" + encodeURIComponent(term));
    if (sk) params.push("sort=" + sk + "&dir=" + sd);

    fetch("/get_cost_center_report_expenses/" + this.props.cost_center.id + "?" + params.join("&"))
      .then((r) => r.json())
      .then((data) => {
        var total = data.total || 0;
        var lastPage = Math.max(1, Math.ceil(total / pp));
        // Si la página quedó fuera de rango (ej. tras eliminar el último registro), recargar la última válida
        if (p > lastPage) { return this.loadData(lastPage, pp, term, sk, sd); }
        this.setState({
          data: data.data || [],
          meta: { total: total, page: p, per_page: pp, total_pages: Math.max(1, Math.ceil(total / pp)) },
          loading: false,
          searchTerm: term,
          sortKey: sk,
          sortDir: sd,
        });
      });
  };

  handlePageChange = (page) => { this.loadData(page); };
  handlePerPageChange = (pp) => { this.loadData(1, pp); };
  handleSearch = (term) => { this.loadData(1, undefined, term); };
  handleSort = (key, dir) => { this.loadData(1, undefined, undefined, key, dir); };

  toogle = (from) => {
    if (from === "new") {
      // Limpiar ANTES de abrir y no solo al cerrar. Si el usuario edita un gasto
      // con PDF y luego abre "Nuevo Gasto", sin esto el comprobante del gasto
      // anterior se subiria al nuevo sin que nada lo advierta.
      this.clearValues();
      this.setState({ modal: true });
      this.loadBudgetAvailability(this.props.usuario.id, null);
    } else {
      this.setState({ modal: false });
      this.clearValues();
    }
  };

  clearValues = () => {
    this.setState({
      modeEdit: false, ErrorValues: true, saving: false, id: "",
      formCreate: this.emptyForm(),
      selectedOptionCostCenter: { cost_center_id: "", label: "Centro de costo" },
      selectedOptionUser: { user_invoice_id: this.props.usuario.id, label: this.props.usuario.names },
      selectedOptionTypeIndentification: { type_identification_id: "", label: "" },
      selectedOptionPaymentType: { payment_type_id: "", label: "" },
      selectedOptionCurrency: { value: "COP", label: "COP — Peso colombiano" },
      receiptFile: null, receiptFileName: "", receiptExistingId: null, receiptError: null,
      extraction: Object.assign({}, EXTRACTION_VACIA),
      exchange: Object.assign({}, EXCHANGE_VACIO),
      budgetAvailability: Object.assign({}, DISPONIBLE_VACIO),
    });
  };

  edit = (row) => {
    var moneda = row.currency || "COP";
    var opciones = currencyOptions();
    var opcionMoneda = opciones.filter(function(o) { return o.value === moneda; })[0] || { value: moneda, label: moneda };

    this.setState({
      modeEdit: true, modal: true, id: row.id, ErrorValues: true, saving: false,
      formCreate: Object.assign({}, this.emptyForm(), {
        cost_center_id: row.cost_center ? row.cost_center.id : "",
        user_invoice_id: row.user_invoice ? row.user_invoice.id : "",
        invoice_name: row.invoice_name, invoice_date: row.invoice_date,
        identification: row.identification, description: row.description,
        invoice_number: row.invoice_number, invoice_type: row.invoice_type,
        invoice_value: row.invoice_value,
        invoice_tax: row.invoice_tax, invoice_total: row.invoice_total,
        type_identification_id: row.type_identification_id, payment_type_id: row.payment_type_id,
        currency: moneda,
        foreign_value: row.foreign_value || "", foreign_tax: row.foreign_tax || "",
        foreign_total: row.foreign_total || "", exchange_rate: row.exchange_rate || "",
        exchange_rate_date: row.exchange_rate_date || "",
        exchange_rate_source: row.exchange_rate_source || "",
        cop_manual_override: !!row.cop_manual_override,
      }),
      selectedOptionTypeIndentification: { type_identification_id: row.type_identification ? String(row.type_identification.id) : "", label: row.type_identification ? row.type_identification.name : "" },
      selectedOptionPaymentType: { payment_type_id: row.payment_type ? String(row.payment_type.id) : "", label: row.payment_type ? row.payment_type.name : "" },
      selectedOptionCostCenter: { cost_center_id: row.cost_center ? String(row.cost_center.id) : "", label: row.cost_center ? row.cost_center.code : "Centro de costo" },
      selectedOptionUser: { user_invoice_id: row.user_invoice ? String(row.user_invoice.id) : "", label: row.user_invoice ? row.user_invoice.name : "Usuario" },
      selectedOptionCurrency: opcionMoneda,
      // Se guarda el ID del gasto, NO row.receipt_file.url (firmada y con 600 s
      // de vida). Y receiptFile queda en null: el archivo que ya esta en S3 no
      // se vuelve a subir.
      receiptFile: null, receiptFileName: "", receiptError: null,
      receiptExistingId: row.receipt_file && row.receipt_file.url ? row.id : null,
      extraction: Object.assign({}, EXTRACTION_VACIA),
      exchange: Object.assign({}, EXCHANGE_VACIO),
      budgetAvailability: Object.assign({}, DISPONIBLE_VACIO),
    });

    this.loadBudgetAvailability(row.user_invoice ? row.user_invoice.id : null, row.id);
  };

  // --- Campos del formulario -------------------------------------------------

  HandleChange = (e) => {
    var name = e.target.name;
    var value = e.target.value;
    this.setState({ formCreate: Object.assign({}, this.state.formCreate, { [name]: value }) }, () => {
      // La TRM depende de la fecha de la factura: cambiarla con moneda
      // extranjera obliga a volver a consultar, o se guardaria la tasa de otro
      // dia.
      if (name === "invoice_date" && this.state.formCreate.currency !== "COP") {
        this.fetchExchangeRate();
      }
    });
  };

  // Los tres campos en COP. Siguen editables con moneda extranjera (1.3), y si
  // el usuario los toca se marcan LAS DOS banderas: sin `cop_manual_override` el
  // servidor recalcula desde foreign_* x TRM y pisa en silencio el ajuste.
  HandleChangeMoney = (e) => {
    var value = e.target.value.replace(/[$,]/g, '');
    var esExtranjera = this.state.formCreate.currency !== "COP";
    var cambios = { [e.target.name]: value };
    if (esExtranjera) {
      cambios.cop_manual_override = true;
      cambios.exchange_rate_source = "manual";
    }
    this.setState({ formCreate: Object.assign({}, this.state.formCreate, cambios) }, () => {
      var total = Number(this.state.formCreate.invoice_value) + Number(this.state.formCreate.invoice_tax);
      this.setState({ formCreate: Object.assign({}, this.state.formCreate, { invoice_total: total }) }, this.refreshBudgetAvailability);
    });
  };

  handleChangeAutocompleteCostCenter = (opt) => { this.setState({ selectedOptionCostCenter: opt, formCreate: Object.assign({}, this.state.formCreate, { cost_center_id: opt.value }) }); };

  handleChangeAutocompleteUser = (opt) => {
    this.setState({ selectedOptionUser: opt, formCreate: Object.assign({}, this.state.formCreate, { user_invoice_id: opt.value }) });
    this.loadBudgetAvailability(opt ? opt.value : null, this.state.modeEdit ? this.state.id : null);
  };

  handleChangeAutocompleteReportExpenceOptionType = (opt) => { this.setState({ selectedOptionTypeIndentification: opt, formCreate: Object.assign({}, this.state.formCreate, { type_identification_id: opt.value }) }); };
  handleChangeAutocompleteReportExpenceOptionPaymentType = (opt) => { this.setState({ selectedOptionPaymentType: opt, formCreate: Object.assign({}, this.state.formCreate, { payment_type_id: opt.value }) }); };

  // --- Moneda extranjera -----------------------------------------------------

  handleChangeCurrency = (opt) => {
    var code = opt ? opt.value : "COP";
    var f = Object.assign({}, this.state.formCreate, { currency: code });
    if (code === "COP") {
      // Volver a COP limpia TODO lo extranjero. Dejar un foreign_value colgando
      // con currency COP hace que el serializer y los exportables muestren un
      // valor extranjero de una moneda que ya no es.
      f.foreign_value = ""; f.foreign_tax = ""; f.foreign_total = "";
      f.exchange_rate = ""; f.exchange_rate_date = ""; f.exchange_rate_source = "";
      f.cop_manual_override = false;
    }
    this.setState(
      { selectedOptionCurrency: opt, formCreate: f, exchange: Object.assign({}, EXCHANGE_VACIO) },
      code === "COP" ? undefined : this.fetchExchangeRate
    );
  };

  HandleChangeForeignMoney = (e) => {
    var v = e.target.value.replace(/[$,]/g, "");
    this.setState({ formCreate: Object.assign({}, this.state.formCreate, { [e.target.name]: v }) }, this.recomputeConversion);
  };

  handleChangeRate = (e) => {
    var v = e.target.value.replace(/[$,]/g, "");
    this.setState({ formCreate: Object.assign({}, this.state.formCreate, { exchange_rate: v, exchange_rate_source: "manual" }) }, this.recomputeConversion);
  };

  // El toggle marca a la vez `exchange_rate_source = "manual"` y
  // `cop_manual_override = true`. Nunca una sin la otra: la primera solo dice de
  // donde salio la tasa, la segunda es la que le prohibe al servidor recalcular.
  handleToggleCopManual = (e) => {
    var on = !!e.target.checked;
    this.setState({ formCreate: Object.assign({}, this.state.formCreate, {
      cop_manual_override: on,
      exchange_rate_source: on ? "manual" : this.state.formCreate.exchange_rate_source,
    }) });
  };

  // INVARIANTE: invoice_value / invoice_tax / invoice_total SIEMPRE en COP. El
  // valor extranjero jamas se escribe en esos tres campos; si se rompe,
  // recalculate_cost_center corrompe el % de viaticos de todos los centros en
  // silencio (application_helper.rb:585).
  recomputeConversion = () => {
    var f = this.state.formCreate;
    if (f.currency === "COP") return;
    if (f.cop_manual_override) return;   // el usuario fijo el COP a mano: no se pisa

    var rate = parseFloat(f.exchange_rate) || 0;
    var fv = parseFloat(f.foreign_value) || 0;
    var ft = parseFloat(f.foreign_tax) || 0;
    var round2 = function(x) { return Math.round(x * 100) / 100; };

    this.setState({ formCreate: Object.assign({}, this.state.formCreate, {
      foreign_total: round2(fv + ft),
      invoice_value: round2(fv * rate),
      invoice_tax: round2(ft * rate),
      invoice_total: round2(fv * rate) + round2(ft * rate),
    }) }, this.refreshBudgetAvailability);
  };

  fetchExchangeRate = () => {
    var self = this;
    var f = this.state.formCreate;
    if (f.currency === "COP" || !f.invoice_date) return;

    this.setState({ exchange: { status: "loading", message: null, rate_date: null, requested_date: f.invoice_date, source: null } });

    fetch("/get_exchange_rate?currency=" + encodeURIComponent(f.currency) + "&date=" + encodeURIComponent(f.invoice_date),
          { headers: { "X-CSRF-Token": csrfToken() } })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.type === "error") {
          // NO se inventa una tasa. El usuario la escribe a mano y el guardado
          // no se bloquea: un aviso, nunca una puerta cerrada.
          self.setState({ exchange: { status: "error", message: (d.message || []).join(" "), rate_date: null, requested_date: f.invoice_date, source: null } });
          return;
        }
        self.setState({
          formCreate: Object.assign({}, self.state.formCreate, {
            exchange_rate: d.rate_to_cop, exchange_rate_date: d.rate_date, exchange_rate_source: d.source,
          }),
          exchange: { status: "ok", message: null, rate_date: d.rate_date, requested_date: d.requested_date, source: d.source },
        }, self.recomputeConversion);
      })
      .catch(function() {
        self.setState({ exchange: { status: "error", message: "No se pudo consultar la tasa. Ingrésela manualmente.", rate_date: null, requested_date: f.invoice_date, source: null } });
      });
  };

  // --- Comprobante -----------------------------------------------------------

  // Espejo en cliente de las dos allowlists del uploader (4.8). No sustituye la
  // validacion del servidor: la adelanta para no gastarle al usuario una subida
  // de 10 MB que va a terminar en error.
  handleFileReceipt = (e) => {
    var file = e.target.files && e.target.files[0];
    if (!file) { this.setState({ receiptFile: null, receiptFileName: "", receiptError: null }); return; }

    var ext = (file.name.split(".").pop() || "").toLowerCase();
    if (EXTENSIONES_COMPROBANTE.indexOf(ext) === -1) {
      this.setState({ receiptFile: null, receiptFileName: "", receiptError: "Formato no permitido. Use JPG, PNG, WEBP, HEIC o PDF." });
      return;
    }
    if (file.size > TAMANO_MAXIMO_COMPROBANTE) {
      this.setState({ receiptFile: null, receiptFileName: "", receiptError: "El archivo supera los 10 MB permitidos." });
      return;
    }
    this.setState({ receiptFile: file, receiptFileName: file.name, receiptError: null });
  };

  handleDeleteReceipt = () => {
    var self = this;
    if (!this.state.modeEdit || !this.state.receiptExistingId) return;

    Swal.fire({
      title: "¿Quitar el comprobante?",
      text: "El archivo se eliminará del gasto.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#2a3f53",
      cancelButtonColor: "#dc3545",
      confirmButtonText: "Sí, quitar",
      cancelButtonText: "Cancelar",
    }).then(function(result) {
      if (!result.value) return;
      fetch("/delete_receipt/report_expenses/" + self.state.id, {
        method: "DELETE",
        headers: { "X-CSRF-Token": csrfToken(), "Content-Type": "application/json" },
      })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.type !== "success") {
            Swal.fire({ icon: "error", title: "No se pudo quitar el comprobante", text: (data.message || []).join(" "), confirmButtonColor: "#2a3f53" });
            return;
          }
          self.setState({ receiptExistingId: null });
          self.loadData();
        })
        .catch(function() {
          Swal.fire({ icon: "error", title: "No se pudo quitar el comprobante", confirmButtonColor: "#2a3f53" });
        });
    });
  };

  // openReceiptPreview / closeReceiptPreview viven FUERA del constructor a
  // proposito: la columna "Comprobante" del indice de Gastos (paquete 09) llama
  // a este mismo par de metodos por nombre. Renombrarlos obliga a actualizar la
  // Tarea 2 del 09 en el mismo PR.
  openReceiptPreview = (id, name) => {
    this.setState({ receiptPreview: { open: true, id: id, name: name || "" }, receiptPreviewError: false });
  };

  closeReceiptPreview = () => {
    this.setState({ receiptPreview: { open: false, id: null, name: "" }, receiptPreviewError: false });
  };

  // --- Captura asistida ------------------------------------------------------

  handleExtract = () => {
    var self = this;
    if (!(this.state.receiptFile instanceof File)) {
      this.setState({ extraction: Object.assign({}, EXTRACTION_VACIA, { status: "error", message: "Primero seleccione el archivo del comprobante." }) });
      return;
    }

    var fd = new FormData();
    fd.append("file", this.state.receiptFile);
    fd.append("cost_center_id", this.props.cost_center.id);

    this.setState({ extraction: Object.assign({}, EXTRACTION_VACIA, { status: "loading" }) });

    fetch("/extract_receipt/report_expenses", { method: "POST", body: fd, headers: { "X-CSRF-Token": csrfToken() } })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.type === "error") {
          // El registro manual NUNCA se bloquea por un fallo de la lectura.
          self.setState({ extraction: Object.assign({}, EXTRACTION_VACIA, { status: "error", message: (d.message || []).join(" ") }) });
          return;
        }
        // WHITELIST. `budget_status`, `accounting_*`, `expense_budget_id`,
        // `is_acepted`, `cost_center_id` y `user_invoice_id` no se sobreescriben
        // jamas desde la respuesta, aunque el servidor los mandara.
        var allowed = ["invoice_name", "identification", "invoice_number", "invoice_date", "description",
                       "currency", "foreign_value", "foreign_tax", "foreign_total",
                       "exchange_rate", "exchange_rate_date", "exchange_rate_source",
                       "invoice_value", "invoice_tax", "invoice_total"];
        var f = Object.assign({}, self.state.formCreate);
        var filled = [];
        allowed.forEach(function(k) {
          var v = d.fields ? d.fields[k] : null;
          // null deja el input VACIO. Nunca se rellena con "—", "N/A" ni con el
          // valor anterior: el contrato D.1 dice que lo no detectado viene en
          // null y el frontend no inventa.
          if (v === null || v === undefined || v === "") return;
          f[k] = v; filled.push(k);
        });

        var newState = {
          formCreate: f,
          extraction: { status: "done", message: null, filled: filled,
                        confidence: d.confidence || {}, warnings: d.warnings || [],
                        violations: d.rule_violations || [] },
        };
        if (f.currency && f.currency !== "COP") {
          var opcion = currencyOptions().filter(function(o) { return o.value === f.currency; })[0];
          newState.selectedOptionCurrency = opcion || { value: f.currency, label: f.currency };
        }
        // NADA SE GUARDA SOLO: la extraccion precarga y ya. El guardado sigue
        // siendo el boton del footer.
        self.setState(newState);
      })
      .catch(function() {
        self.setState({ extraction: Object.assign({}, EXTRACTION_VACIA, { status: "error", message: "No se pudo leer el comprobante. Complete los datos manualmente." }) });
      });
  };

  // --- Disponible presupuestal (informativo, nunca bloquea) ------------------

  refreshBudgetAvailability = () => {
    var f = this.state.formCreate;
    this.loadBudgetAvailability(f.user_invoice_id, this.state.modeEdit ? this.state.id : null);
  };

  loadBudgetAvailability = (userId, excludeExpenseId) => {
    var self = this;
    if (this._availTimer) clearTimeout(this._availTimer);

    if (!userId || !this.state.formCreate.cost_center_id) {
      this.setState({ budgetAvailability: Object.assign({}, DISPONIBLE_VACIO) });
      return;
    }

    this.setState({ budgetAvailability: Object.assign({}, this.state.budgetAvailability, { loading: true, error: null }) });

    this._availTimer = setTimeout(function() {
      var qs = "cost_center_id=" + self.state.formCreate.cost_center_id + "&user_id=" + userId;
      // exclude_expense_id en modo edicion: sin el, el gasto que se esta
      // editando se cuenta a si mismo y el disponible sale rebajado dos veces.
      if (excludeExpenseId) qs += "&exclude_expense_id=" + excludeExpenseId;

      fetch("/get_expense_budget_available?" + qs, { headers: { "X-CSRF-Token": csrfToken() } })
        .then(function(r) { return r.json(); })
        .then(function(d) {
          if (d.type === "error") {
            self.setState({ budgetAvailability: Object.assign({}, DISPONIBLE_VACIO, { error: (d.message || []).join(" ") }) });
            return;
          }
          self.setState({ budgetAvailability: { loading: false, error: null, has_budget: !!d.has_budget, assigned: d.assigned, spent: d.spent, available: d.available } });
        })
        .catch(function() {
          self.setState({ budgetAvailability: Object.assign({}, self.state.budgetAvailability, { loading: false, error: "No se pudo consultar el disponible" }) });
        });
    }, 400);
  };

  // --- Guardado --------------------------------------------------------------

  HandleClick = () => {
    var self = this;
    var f = this.state.formCreate;

    if (!f.cost_center_id || !f.user_invoice_id || !f.invoice_name || !f.invoice_date) {
      this.setState({ ErrorValues: false });
      return;
    }

    // FormData y no JSON, porque ahora puede llevar un archivo. `fd.append(k, "")`
    // para los vacios: FormData convierte undefined en el string "undefined", que
    // un to_f en el servidor lee como 0.0.
    var fd = new FormData();
    ["cost_center_id", "user_invoice_id", "invoice_name", "invoice_date", "description", "invoice_number",
     "identification", "invoice_type", "invoice_value", "invoice_tax", "invoice_total",
     "type_identification_id", "payment_type_id",
     "currency", "foreign_value", "foreign_tax", "foreign_total",
     "exchange_rate", "exchange_rate_date", "exchange_rate_source", "cop_manual_override"
    ].forEach(function(k) { fd.append(k, f[k] === null || f[k] === undefined ? "" : f[k]); });

    // Solo si es un File. OrdenesDeCompraTable.jsx:108 hace el append siempre y
    // por eso manda el string "[object Object]" cuando no hay archivo.
    if (this.state.receiptFile instanceof File) fd.append("receipt_file", this.state.receiptFile);

    var isEdit = this.state.modeEdit;
    var url = isEdit ? "/report_expenses/" + this.state.id : "/report_expenses";
    this.setState({ saving: true });

    // NUNCA se fija Content-Type con FormData: el navegador tiene que escribir el
    // boundary. Si se pone a mano, Rails recibe el body como basura y el archivo
    // se pierde en silencio.
    fetch(url, { method: isEdit ? "PATCH" : "POST", body: fd, headers: { "X-CSRF-Token": csrfToken() } })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.type === "error") {
          self.setState({ saving: false });
          Swal.fire({ icon: "error", title: "¡Ocurrió un error!", text: (data.message || []).join(" "), confirmButtonColor: "#2a3f53" });
          return;
        }
        self.setState({ modal: false, saving: false });
        self.loadData(isEdit ? undefined : 1);
        self.clearValues();
        Swal.fire({ position: "center", icon: "success", title: data.success || "Guardado", showConfirmButton: false, timer: 1500 });
      })
      .catch(function() {
        self.setState({ saving: false });
        Swal.fire({ icon: "error", title: "No se pudo guardar el gasto", confirmButtonColor: "#2a3f53" });
      });
  };

  delete = (id) => {
    Swal.fire({ title: "¿Estás seguro?", text: "El gasto será eliminado permanentemente", icon: "warning", showCancelButton: true, confirmButtonColor: "#2a3f53", cancelButtonColor: "#dc3545", confirmButtonText: "Sí, eliminar", cancelButtonText: "Cancelar" })
      .then((result) => {
        if (result.value) {
          fetch("/report_expenses/" + id, { method: "delete", headers: { "X-CSRF-Token": csrfToken(), "Content-Type": "application/json" } })
            .then((r) => r.json())
            .then(() => { this.loadData(); Swal.fire({ title: "Eliminado", text: "El gasto fue eliminado", icon: "success", confirmButtonColor: "#2a3f53" }); });
        }
      });
  };

  openMenu = (e) => { window.cmOpenMenu(e); };

  renderActions = (row) => (
    <div className="cm-dt-menu">
      <button className="cm-dt-menu-trigger" onClick={this.openMenu}><i className="fas fa-ellipsis-v" /></button>
      <div className="cm-dt-menu-dropdown">
        {this.props.estados.cost_center_edit && <button onClick={() => this.edit(row)} className="cm-dt-menu-item"><i className="fas fa-pen" /> Editar</button>}
        {this.props.estados.cost_center_edit && <button onClick={() => this.delete(row.id)} className="cm-dt-menu-item cm-dt-menu-item--danger"><i className="fas fa-trash" /> Eliminar</button>}
      </div>
    </div>
  );

  // Modal de previsualizacion. SIEMPRE contra /download_receipt/report_expenses/:id,
  // nunca contra la URL firmada. Si el iframe o la imagen no cargan (403, archivo
  // borrado) se degrada a un aviso y la descarga sigue disponible: la
  // previsualizacion nunca bloquea la descarga.
  renderReceiptPreview = () => {
    var p = this.state.receiptPreview;
    if (!p.open) return null;

    var src = "/download_receipt/report_expenses/" + p.id;
    // El <img> solo se usa cuando el nombre del archivo dice claramente que es
    // una imagen. En cualquier otro caso —incluido "no se conoce el nombre",
    // que es lo normal desde la tabla porque el serializer solo expone `url`—
    // se usa <iframe>, que sirve tanto para PDF como para imagen. Al reves, un
    // <img> sobre un PDF muestra el icono de imagen rota.
    var nombre = (p.name || "").toLowerCase();
    var esImagen = /\.(jpe?g|png|webp|heic|gif)$/.test(nombre);

    return (
      <CmModal
        isOpen={true}
        toggle={this.closeReceiptPreview}
        size="lg"
        title={<span><i className="fa fa-file" /> Comprobante del gasto #{p.id}</span>}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            {/* Sin data-testid: `expense-receipt-link-{id}` ya lo emite la fila
                de la tabla, que es donde §7.6 lo situa. Repetirlo aqui daria dos
                nodos con el mismo selector justo cuando el modal esta abierto,
                que es el momento en que el spec E4.2 del paquete 12 lo busca. */}
            <a className="cm-btn cm-btn-outline" href={src} target="_blank" rel="noopener noreferrer">
              <i className="fa fa-download" /> Descargar
            </a>
            <CmButton variant="accent" onClick={this.closeReceiptPreview}>
              <i className="fa fa-times" /> Cerrar
            </CmButton>
          </div>
        }
      >
        <div data-testid="receipt-preview-modal">
          {this.state.receiptPreviewError ? (
            <div className="cm-alert cm-alert-warning">
              <i className="fa fa-exclamation-triangle" /> No se pudo previsualizar el comprobante. Intente descargarlo.
            </div>
          ) : esImagen ? (
            <img src={src} alt="Comprobante" style={{ maxWidth: "100%" }}
                 onError={() => this.setState({ receiptPreviewError: true })} />
          ) : (
            <iframe src={src} title="Comprobante" style={{ width: "100%", height: "70vh", border: 0 }}
                    onError={() => this.setState({ receiptPreviewError: true })} />
          )}
        </div>
      </CmModal>
    );
  };

  render() {
    return (
      <React.Fragment>
        {this.state.modal && (
          <FormCreate
            backdrop="static" modal={this.state.modal} toggle={this.toogle}
            title={this.state.modeEdit ? "Actualizar Gasto" : "Crear Gasto"}
            nameBnt={this.state.modeEdit ? "Actualizar" : "Añadir"}
            formValues={this.state.formCreate} submitForm={this.HandleClick}
            saving={this.state.saving}
            onChangeForm={this.HandleChange} onChangeFormMoney={this.HandleChangeMoney}
            errorValues={this.state.ErrorValues}
            // Los flags salen de @estados y ya no van hardcodeados en true.
            // `show_user` gobierna el isDisabled del select de Usuario: quien no
            // tenga "Gastos / Ver todos" solo registra gastos a su nombre.
            estados={{
              closed: true,
              create: this.props.estados.expense_create,
              edit: this.props.estados.expense_edit,
              delete: this.props.estados.expense_delete,
              export: true,
              show_user: this.props.estados.expense_show_all === true,
            }}
            current_user={this.props.usuario}
            handleChangeAutocompleteCostCenter={this.handleChangeAutocompleteCostCenter} selectedOptionCostCenter={this.state.selectedOptionCostCenter}
            handleChangeAutocompleteUser={this.handleChangeAutocompleteUser} selectedOptionUser={this.state.selectedOptionUser} users={this.props.users}
            selectedOptionTypeIndentification={this.state.selectedOptionTypeIndentification}
            handleChangeAutocompleteReportExpenceOptionType={this.handleChangeAutocompleteReportExpenceOptionType}
            report_expense_options_type={this.state.report_expense_options_type}
            selectedOptionPaymentType={this.state.selectedOptionPaymentType}
            handleChangeAutocompleteReportExpenceOptionPaymentType={this.handleChangeAutocompleteReportExpenceOptionPaymentType}
            report_expense_options_payment={this.state.report_expense_options_payment}
            cost_center_id={this.props.cost_center.id}
            onChangeFile={this.handleFileReceipt}
            receiptFileName={this.state.receiptFileName}
            receiptExistingId={this.state.receiptExistingId}
            receiptError={this.state.receiptError}
            onDeleteReceipt={this.state.modeEdit ? this.handleDeleteReceipt : null}
            onPreviewReceipt={() => this.openReceiptPreview(this.state.receiptExistingId, this.state.receiptFileName)}
            extractionEnabled={receiptExtractionEnabled()}
            extraction={this.state.extraction}
            onExtract={this.handleExtract}
            currencyOptions={currencyOptions()}
            selectedOptionCurrency={this.state.selectedOptionCurrency}
            onChangeCurrency={this.handleChangeCurrency}
            onChangeForeignMoney={this.HandleChangeForeignMoney}
            onChangeRate={this.handleChangeRate}
            onToggleCopManual={this.handleToggleCopManual}
            onFetchRate={this.fetchExchangeRate}
            exchange={this.state.exchange}
            budgetAvailability={this.state.budgetAvailability}
          />
        )}
        {this.renderReceiptPreview()}
        <CmDataTable
          columns={this.columns} data={this.state.data} loading={this.state.loading}
          serverPagination serverMeta={this.state.meta}
          onPageChange={this.handlePageChange} onPerPageChange={this.handlePerPageChange}
          onSearch={this.handleSearch} onSort={this.handleSort}
          actions={this.renderActions} stickyActions
          searchPlaceholder="Buscar gasto..." emptyMessage="No hay gastos registrados"
          headerActions={this.props.estados.cost_center_edit ? <button className="cm-btn cm-btn-accent cm-btn-sm" onClick={() => this.toogle("new")}><i className="fas fa-plus" /> Nuevo Gasto</button> : null}
          emptyAction={this.props.estados.cost_center_edit ? <button onClick={() => this.toogle("new")} className="cm-btn cm-btn-accent cm-btn-sm" style={{ marginTop: "8px" }}><i className="fas fa-plus" /> Nuevo Gasto</button> : null}
        />
      </React.Fragment>
    );
  }
}

export default ExpensesTable;
