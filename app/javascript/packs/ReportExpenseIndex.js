import React from "react";
import WebpackerReact from "webpacker-react";
import Swal from "sweetalert2";
import Select from "react-select";
import NumberFormat from "react-number-format";
import { CmDataTable, CmPageActions } from "../generalcomponents/ui";
import { budgetStatusBadge, accountingBadge, shortDate, toNumber, budgetWarningIcon, operationalState } from "../generalcomponents/expenseIndicators";
import { hallazgosVigentes, veredictoParaGuardar } from "../generalcomponents/agentVerdict";
import { prepararLote, ACCEPT_LOTE, MAX_COMPROBANTES } from "../generalcomponents/receiptBatch";
import { Modal, ModalBody } from "reactstrap";

function csrfToken() {
  var meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}

function formatDate(fecha) {
  if (!fecha) return "";
  var d = new Date(fecha);
  var months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  var minutes = d.getMinutes();
  var timeValue = d.getHours() + (minutes < 10 ? ":0" + minutes : ":" + minutes);
  return months[d.getMonth()] + " " + d.getDate() + " del " + d.getFullYear() + " / " + timeValue;
}

// PESTAÑA CON LA QUE ABRE LA PANTALLA.
//
// Se puede pedir por la URL (`/report_expenses?scope=owned_centers`) y de ahi
// sale el enlace "Ver los gastos de mis centros" del correo de aprobacion: el
// dueño llega directo a su lista y no a una tabla que tiene que reencuadrar.
//
// SE VALIDA CONTRA LO QUE EL USUARIO PUEDE USAR y no se confia en el parametro.
// No es un agujero de seguridad —el servidor recorta igual, mande lo que mande—
// pero pedir `scope=all` sin el permiso dejaria la pestaña "Todos" marcada
// mostrando una lista recortada, que es peor que no hacer caso.
//
// Sin parametro, o con uno que no aplica, manda el default de siempre: "Todos"
// con permiso, "Mis gastos" sin el.
function scopeInicial(estados) {
  var porDefecto = estados.show_all ? "all" : "mine";
  var pedido;

  try {
    pedido = new URLSearchParams(window.location.search).get("scope");
  } catch (e) {
    return porDefecto;
  }

  if (pedido === "mine") return "mine";
  if (pedido === "owned_centers" && estados.owns_cost_centers) return "owned_centers";
  if (pedido === "all" && estados.show_all) return "all";
  // DOBLE APROBACION (2026-10-18): el correo del segundo aprobador aterriza aqui.
  if (pedido === "second_approval" && estados.second_approver) return "second_approval";
  return porDefecto;
}

// Tope de la seleccion para exportar y descargar comprobantes. Es el mismo
// ReceiptsZip::MAX del servidor (y el MAX_BULK de Contabilidad): pasarse aqui
// solo serviria para que el servidor lo rechace.
var MAX_SELECCION = 500;

var EMPTY_FILTERS = {
  cost_center_id: "",
  user_invoice_id: "",
  start_date: "",
  end_date: "",
  operational_state: "",
  budget_status: "",
  currency: "",
  accounting_approved: "",
};

var EMPTY_FORM = {
  cost_center_id: "",
  user_invoice_id: "",
  invoice_name: "",
  invoice_date: "",
  description: "",
  observations: "",
  invoice_number: "",
  identification: "",
  invoice_type: "",
  invoice_value: "",
  invoice_tax: "",
  invoice_total: "",
  type_identification_id: "",
  payment_type_id: "",
  // Moneda. `currency` arranca en COP porque es el default de la columna y
  // porque el bloque extranjero del modal se decide por este valor.
  currency: "COP",
  foreign_value: "",
  foreign_tax: "",
  foreign_total: "",
  exchange_rate: "",
  exchange_rate_date: "",
  exchange_rate_source: "",
  // Bandera que le prohibe al servidor recalcular el COP. Viaja SIEMPRE en el
  // FormData: sin ella, cada save recalcula desde foreign_* x TRM y pisa en
  // silencio el valor que la persona ajusto a mano.
  cop_manual_override: false,
};

// Espejo exacto de components/ShowConstCenter/ExpensesTable.jsx. Los dos
// formularios de gasto de la plataforma son del mismo paquete y todo campo nuevo
// va DOS veces; si uno se queda atras, el usuario ve columnas de moneda y estado
// presupuestal que no puede llenar desde esta pantalla.
// Sin `violations`: LAS REGLAS YA NO SE EVALUAN EN LA EXTRACCION. Se informan al
// guardar, que es el unico punto por el que pasan tanto el gasto leido del
// comprobante como el escrito a mano.
// El mensaje de una regla lo escribe un administrador en la tabla de reglas y se
// pinta con `html:` en SweetAlert, asi que se escapa. No es paranoia: el nombre
// del proveedor y el numero de factura entran en el texto del duplicado.
function escaparHtml(texto) {
  return String(texto).replace(/[&<>"']/g, function(c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

// `policy` es el veredicto del agente sobre las instrucciones de la regla de
// gasto (el texto libre que el servidor no sabe evaluar). null = nadie lo
// juzgo, que NO es lo mismo que "lo cumple".
var EXTRACTION_VACIA = { status: "idle", message: null, filled: [], confidence: {}, warnings: [], policy: null };

var EXCHANGE_VACIO = { status: "idle", message: null, rate_date: null, requested_date: null, source: null };
var DISPONIBLE_VACIO = { loading: false, error: null, has_budget: false, assigned: "0.0", spent: "0.0", available: "0.0" };

// Decide si el comprobante se puede pintar en pantalla.
//
// La PISTA puede ser un nombre de archivo o una URL: el serializer de
// CarrierWave solo emite `{ url: ... }` —NO hay `name`, y ese fue justo el
// bug: `p.name` llegaba undefined, la deteccion daba falso, se montaba un
// <iframe> sobre una respuesta con Content-Disposition: attachment y el modal
// salia en blanco. La URL si trae la extension, asi que sirve de pista.
//
// Se recorta la query porque la URL firmada de S3 llega con `?X-Amz-...`
// pegado detras de la extension.
function esComprobanteImagen(pista) {
  var limpia = String(pista || "").split("?")[0].split("#")[0].toLowerCase();
  return /\.(jpe?g|png|webp|heic|gif)$/.test(limpia);
}

var EXTENSIONES_COMPROBANTE = ["jpg", "jpeg", "png", "pdf", "webp", "heic"];
var TAMANO_MAXIMO_COMPROBANTE = 20 * 1024 * 1024;
// Un solo literal: el cambio de tipo compara contra el para saber si puede borrarlo.
var AVISO_COMPROBANTE = "Adjunte el comprobante: es obligatorio.";

// Nombres legibles de los campos que devuelve la extraccion. Son las claves DEL
// SERVICIO (provider_name, value…), no las del formulario, porque asi llega la
// matriz `confidence`. Espeja EXTRACTION_FIELD_LABELS de
// report_expenses_controller.rb: si alla se agrega un campo, aqui tambien.
var ETIQUETAS_EXTRACCION = {
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

// Peso del comprobante para la zona de arrastre. Se corta en MB porque el tope
// son 20 MB: no hay nada que decir por encima de eso.
function pesoLegible(bytes) {
  var n = Number(bytes);
  if (!n || n <= 0) return "Archivo listo";
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return Math.round(n / 1024) + " KB";
  return (n / (1024 * 1024)).toFixed(1).replace(".", ",") + " MB";
}

// Columnas que NO se pintan hoy, por decision de producto (2026-08-18).
//
// Se ocultan aqui en vez de borrarse porque el dato sigue existiendo de punta a
// punta —el servicio lo calcula, el serializer lo emite y el FILTRO "Estado
// presupuestal" de esta misma pantalla lo sigue usando—, y volver a mostrarlas
// es quitar la clave de este objeto, no reescribir un render.
//
// 🔴 Consecuencia medida: al ocultar `budget_status` desaparece del DOM el
// `data-testid="expense-budget-status-<id>"`, del que dependian 4 aserciones de
// navegador (budget.spec.js x2, rules.spec.js x2). Esas pruebas verifican el
// MISMO hecho contra la respuesta del servidor (`body.register.budget_status`),
// que es donde vive la regla; lo que se perdio es la comprobacion de que el
// badge se pinta. Si la columna vuelve, las aserciones vuelven con ella.
var COLUMNAS_OCULTAS = { budget_status: true };

// Estado del comprobante y de sus dos acompanantes, para resetearlo de una sola
// vez al abrir el modal. Que este junto no es cosmetico: olvidar uno solo de
// estos campos hace que el comprobante del gasto anterior se suba al siguiente.
function estadoComprobanteVacio() {
  return {
    receiptFile: null,
    receiptFileName: "",
    receiptSize: 0,
    receiptDragging: false,
    receiptExistingId: null,
    // La URL del comprobante YA GUARDADO. Se necesita aparte de
    // `receiptFileName` —que solo se llena cuando el usuario acaba de elegir
    // un archivo— para saber si lo adjuntado es una imagen al EDITAR un gasto.
    receiptExistingUrl: "",
    // Violaciones de reglas del gasto EN CURSO. Se llenan al adjuntar el
    // comprobante; el Guardar las vuelve a validar en el servidor, que es quien
    // manda. Esto solo adelanta el aviso.
    receiptError: null,
    extraction: Object.assign({}, EXTRACTION_VACIA),
    exchange: Object.assign({}, EXCHANGE_VACIO),
    budgetAvailability: Object.assign({}, DISPONIBLE_VACIO),
  };
}

// KILL SWITCH de la captura asistida. Arranca APAGADO: la lectura le habla a
// Claude (paquete 17) y se enciende con RECEIPT_EXTRACTION_ENABLED una vez
// cargada la api key. El flag lo publica layouts/user.html.erb, archivo con
// dueno por bloque, asi que no se escribe desde aqui.
function receiptExtractionEnabled() {
  return window.CM_RECEIPT_EXTRACTION_ENABLED === true;
}

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

class ReportExpenseIndex extends React.Component {
  constructor(props) {
    super(props);
    var self = this;

    this.state = {
      data: [],
      loading: true,
      searchTerm: "",
      sortKey: null,
      sortDir: "asc",
      meta: { total: 0, page: 1, per_page: 50, total_pages: 1 },
      // PESTAÑA DE LA LISTA. Sin nada en la URL reproduce lo que hacia la
      // pantalla antes de que hubiera pestañas: con "Ver todos" abre en "Todos",
      // sin el permiso en "Mis gastos", que es lo unico que el servidor
      // devolvia. No abre en "Centros a mi cargo" ni a quien los tenga: al
      // entrar a Gastos uno viene a ver los propios. Con `?scope=` en la URL
      // manda eso (ver `scopeInicial`), que es como aterriza el correo.
      scope: scopeInicial(props.estados),
      // SELECCION MULTIPLE (M10, 2026-10-09): para exportar solo lo marcado y
      // bajar sus comprobantes. Se conserva al paginar —se arma un lote de
      // varias paginas— y se limpia al cambiar de pestaña, filtro o busqueda,
      // porque ahi el conjunto de fondo ya es otro.
      selectedIds: [],
      // Filters
      showFilters: false,
      isFiltering: false,
      filters: Object.assign({}, EMPTY_FILTERS),
      filterCostCenter: null,
      filterCostCenterOptions: [],
      filterCostCenterLoading: false,
      filterUser: null,
      // Modal
      modal: false,
      modalImport: false,
      importFileName: "",
      importSize: 0,
      importDragging: false,
      importing: false,
      modeEdit: false,
      editId: null,
      ErrorValues: true,
      form: Object.assign({}, EMPTY_FORM, { user_invoice_id: props.current_user.id }),
      selectedCostCenter: null,
      formCostCenterOptions: [],
      formCostCenterLoading: false,
      selectedUser: { value: props.current_user.id, label: props.current_user.names },
      selectedType: null,
      selectedPayment: null,
      // CARGA DE VARIOS COMPROBANTES (2026-10-18). null fuera del lote. Ver
      // `handleArchivosLote`.
      lote: null,
      preparandoLote: false,
      // Estado inline edit
      editingStatusId: null,
      // Copy hint
      copyMessage: "",
    };

    this.userOptions = (props.users || []).map(function(u) {
      return { label: u.names, value: u.id };
    });

    this.typeOptions = (props.report_expense_options || []).filter(function(o) { return o.category === "Tipo"; }).map(function(o) {
      return { label: o.name, value: o.id };
    });

    this.paymentOptions = (props.report_expense_options || []).filter(function(o) { return o.category === "Medio de pago"; }).map(function(o) {
      return { label: o.name, value: o.id };
    });

    // Triple guarda obligatoria. La prop la pasa la vista con `get_currencies`
    // (helper del paquete 05), pero si la vista se renderiza sin ella el
    // fallback es window.CM_CURRENCIES —la fuente unica del layout— y, si
    // tampoco esta, un array vacio. Sin el `|| []`, el `.map` del select de
    // moneda revienta el render COMPLETO de la pantalla de Gastos: no se cae un
    // filtro, se cae la tabla entera.
    this.currencyOptions = props.currencies || window.CM_CURRENCIES || [];

    // ORDEN POR RELEVANCIA (2026-08-18). La tabla mide ~2.900px y el viewport
    // util son ~1.300px, asi que SIEMPRE hay scroll horizontal: lo unico que se
    // puede decidir es que se ve sin arrastrar la barra. Las 9 primeras son las
    // que caben en una pantalla y son las que el usuario mira a diario
    // —referencia, cuando, de quien, cuanto y en que estado va—; el resto es
    // detalle de la factura y auditoria, que se consulta cuando ya se encontro
    // la fila. Antes el Total caia en la posicion 13 y habia que hacer scroll
    // para ver la plata, que es justo el dato por el que se entra a esta
    // pantalla.
    this.columns = [
      // El ID de referencia va PRIMERO: es lo que el usuario copia al chat de
      // soporte y lo que el buscador acepta desde que C.2/F.1 metieron
      // `id::text` en el LIKE.
      { key: "id", label: "ID", width: "80px", render: function(row) {
        return React.createElement("span", { "data-testid": "expense-ref-" + row.id, style: { fontWeight: 600, color: "#6c757d" } }, "#" + row.id);
      }},
      { key: "invoice_date", label: "Fecha de factura", width: "120px" },
      { key: "cost_center_code", label: "Centro de costo", width: "150px", render: function(row) { return row.cost_center ? row.cost_center.code : ""; } },
      { key: "user_invoice_name", label: "Responsable", width: "150px", render: function(row) { return row.user_invoice ? row.user_invoice.names : ""; } },
      { key: "invoice_name", label: "Nombre", width: "200px" },
      // decimalScale: 2 NO es cosmetico. `invoice_value/tax/total` son columnas
      // `float` en Postgres (db/schema.rb:504-506), asi que la aritmetica del
      // gasto guarda ruido de coma flotante EN LA BASE: hay filas con
      // 1006416.3200000001 guardado. El peso tiene dos decimales y punto, de modo
      // que todo lo que venga detras es ruido por definicion y se corta al
      // pintar. Esto arregla las 5.011 filas que ya existen; la causa raiz —el
      // tipo de la columna— sigue ahi y no se toca desde el frontend.
      { key: "invoice_total", label: "Total", width: "120px", render: function(row) { return React.createElement(NumberFormat, { value: row.invoice_total, displayType: "text", thousandSeparator: true, decimalScale: 2, prefix: "$" }); } },
      // El motivo del exceso va SIEMPRE dentro de .cm-cell-truncate con
      // data-tooltip: `budget_reason` lo escribe el servicio de presupuesto y
      // puede traer el nombre del centro, el cupo y lo disponible en una sola
      // frase; suelto, esa celda estira la tabla y rompe el scroll horizontal.
      { key: "budget_status", label: "Estado presupuestal", width: "190px", render: function(row) {
        var badge = budgetStatusBadge(row.budget_status);
        return React.createElement("div", { "data-testid": "expense-budget-status-" + row.id },
          React.createElement("span", { className: badge.className }, badge.label),
          row.budget_status === "excedido" && row.budget_reason
            ? React.createElement("div", { className: "cm-cell-truncate", "data-tooltip": row.budget_reason },
                React.createElement("span", { className: "cm-cell-truncate-text" }, row.budget_reason))
            : null
        );
      }},
      // EL DESPLEGABLE VA DIRECTO, sin el lapiz que antes lo precedia. Cambiar
      // el estado eran dos clics (lapiz -> select) y el lapiz no decia que iba a
      // pasar al pulsarlo. Con el select a la vista el estado se lee y se cambia
      // en el mismo gesto, y de paso desaparece la equis de cancelar: no hay
      // nada que cancelar si nunca se entro en un modo.
      //
      // `editingStatusId` y sus dos metodos quedan vivos a proposito: la tabla
      // del centro de costos todavia usa el patron viejo.
      { key: "is_acepted", label: "Estado", width: "150px", sortable: false, render: function(row) {
        // Sin permiso de cierre el estado es SOLO LECTURA. Antes esto se notaba
        // porque no aparecia el lapiz; ahora hay que pintar la pildora, o el
        // usuario sin permiso veria un desplegable que el servidor le rechaza.
        // EL `!` ACOMPAÑA AL ESTADO EN LAS DOS RAMAS. Es la senal de que el
        // gasto se paso del presupuesto o no tiene partida, y su tooltip es el
        // unico sitio donde se lee el motivo. Va envuelto en un flex para que
        // el icono no empuje la pildora ni el desplegable.
        var aviso = budgetWarningIcon(row);
        var estado = operationalState(row);
        var doble = self.notaDobleAprobacion(row);

        // Sin permiso, el estado es una pildora de solo lectura. Con permiso es
        // un desplegable con los TRES estados, incluido el de volver un
        // rechazado a "Creado": una decision que no se puede deshacer desde la
        // misma pantalla donde se tomo obliga a entrar a la base de datos.
        //
        // EL PERMISO ES POR FILA desde M4 (2026-10-09): con "Aceptar gasto" a
        // secas solo se deciden los propios y los de los centros a cargo, y un
        // desplegable en una fila ajena seria un 403 esperando a pasar.
        //
        // DOBLE APROBACION (2026-10-18): en un gasto que espera la segunda firma
        // decide tambien el segundo aprobador, aunque no tenga "Aceptar gasto".
        if (!self.puedeDecidir(row) && !self.puedeDarSegunda(row)) {
          return React.createElement("div", { className: "cm-status-cell" },
            React.createElement("span", {
              className: "cm-status-pill" + (estado.isOk ? " cm-status-pill--ok" : "")
                         + (estado.isRejected ? " cm-status-pill--danger" : "")
                         + (estado.isPendingSecond ? " cm-status-pill--pending" : ""),
              "data-testid": "expense-status-" + row.id,
              title: doble || undefined,
            }, estado.label),
            aviso
          );
        }

        return React.createElement("div", { className: "cm-status-cell", title: doble || undefined },
        React.createElement("select", {
          className: "cm-status-select" + (estado.isOk ? " cm-status-select--ok" : "")
                     + (estado.isPendingSecond ? " cm-status-select--pending" : ""),
          value: estado.value,
          onChange: function(e) { self.updateStatus(e, row); },
          // stopPropagation SIGUE SIENDO OBLIGATORIO: el clic en la fila abre el
          // detalle, y sin esto elegir un estado abriria el modal encima.
          onClick: function(e) { e.stopPropagation(); },
          "data-testid": "expense-status-select-" + row.id,
        },
          React.createElement("option", { value: "creado" }, "Creado"),
          // Solo se pinta en la fila que ya esta ahi: no se elige, se llega
          // aceptando un gasto que necesita dos firmas.
          estado.isPendingSecond
            ? React.createElement("option", { value: "pendiente_segunda", disabled: true }, "Pendiente 2ª")
            : null,
          React.createElement("option", { value: "aceptado" }, estado.isPendingSecond ? "Aceptado (2ª aprobación)" : "Aceptado"),
          React.createElement("option", { value: "rechazado" }, "Rechazado")
        ),
          aviso
        );
      }},
      { key: "accounting_approved", label: "Contabilidad", width: "170px", render: function(row) {
        var badge = accountingBadge(row.accounting_approved);
        return React.createElement("div", { "data-testid": "expense-accounting-status-" + row.id },
          React.createElement("span", { className: badge.className }, badge.label),
          row.accounting_approved
            ? React.createElement("span", { className: "cm-hint", style: { display: "block" } },
                shortDate(row.accounting_approved_at) + (row.accounting_approved_by ? " · " + row.accounting_approved_by.names : ""))
            : null
        );
      }},
      // El destino es SIEMPRE /download_receipt/report_expenses/:id y nunca
      // `row.receipt_file.url`: esa es la URL firmada de S3 y expira a los 600
      // segundos, asi que una tabla abierta desde hace diez minutos entregaria
      // 403 al hacer clic.
      //
      // UN SOLO CONTROL, no dos. Habia una descarga y un ojo, pero la eleccion
      // entre mirar y guardar no la hace el usuario: la hace el archivo. Una
      // foto se mira en el modal —y desde ahi se descarga—; un PDF se lo queda
      // el navegador, que ya sabe mostrarlo, imprimirlo y guardarlo.
      { key: "receipt_file", label: "Comprobante", width: "120px", sortable: false, render: function(row) {
        // Guion centrado y NO una equis: la equis se lee como "fallo" o como un
        // boton de quitar. Aqui no hay error ni accion, solo ausencia de dato,
        // que es lo que dice un guion en el resto de la tabla.
        if (!row.receipt_file || !row.receipt_file.url) {
          return React.createElement("div", { className: "cm-celda-vacia" }, "—");
        }

        // CON ETIQUETA, no solo un icono. Un boton mudo obliga a adivinar o a
        // parar el raton encima; con dos letras se sabe sin tocarlo. Y el verbo
        // cambia con el archivo, porque no hacen lo mismo: la imagen se VE aqui
        // dentro, el resto se ABRE en una pestana del navegador.
        //
        // Iconos de FontAwesome 5 (layouts/user.html.erb carga la 5.15.4):
        // `fa-receipt` y `fa-external-link-alt` existen ahi. Ojo con los nombres
        // de la 6 —`fa-file-arrow-down`, `fa-arrow-up-right-from-square`—: no
        // fallan, simplemente no pintan nada.
        var imagen = esComprobanteImagen(row.receipt_file.url);
        return React.createElement("div", { style: { display: "flex", justifyContent: "center" } },
          React.createElement("button", {
            type: "button",
            className: "cm-btn cm-btn-outline cm-btn-sm",
            title: imagen ? "Ver el comprobante" : "Abrir el comprobante en otra pestaña",
            onClick: function(e) { e.stopPropagation(); self.abrirComprobante(row.id, row.receipt_file.url); },
            "data-testid": "expense-receipt-preview-" + row.id
          },
            React.createElement("i", { className: imagen ? "fas fa-receipt" : "fas fa-external-link-alt" }),
            imagen ? " Ver" : " Abrir"
          )
        );
      }},

      // --- A partir de aqui hay que arrastrar la barra: detalle de la factura,
      // --- desglose del monto y auditoria. Se consulta cuando ya se encontro la
      // --- fila, no para encontrarla.
      { key: "type_name", label: "Tipo", width: "180px", render: function(row) { return row.type_identification ? row.type_identification.name : ""; } },
      { key: "payment_name", label: "Medio de pago", width: "150px", render: function(row) { return row.payment_type ? row.payment_type.name : ""; } },
      { key: "invoice_value", label: "Valor", width: "100px", render: function(row) { return React.createElement(NumberFormat, { value: row.invoice_value, displayType: "text", thousandSeparator: true, decimalScale: 2, prefix: "$" }); } },
      { key: "invoice_tax", label: "IVA", width: "100px", render: function(row) { return React.createElement(NumberFormat, { value: row.invoice_tax, displayType: "text", thousandSeparator: true, decimalScale: 2, prefix: "$" }); } },
      { key: "currency", label: "Moneda", width: "90px", render: function(row) {
        return React.createElement("span", { "data-testid": "expense-currency-" + row.id }, row.currency || "COP");
      }},
      // sortable: false A PROPOSITO. `foreign_total` NO esta en
      // EXPENSE_SORT_COLUMNS (F.1): con sortable true el servidor cae al `else`
      // y ordena por created_at, pero la flecha del header cambia igual. El
      // usuario ve una tabla reordenada por el criterio equivocado y nada avisa.
      { key: "foreign_total", label: "Valor extranjero", width: "150px", sortable: false, render: function(row) {
        var total = toNumber(row.foreign_total);
        if (row.currency === "COP" || total === null) return "—";

        var rate = toNumber(row.exchange_rate);
        return React.createElement("span", null,
          React.createElement(NumberFormat, { value: total, displayType: "text", thousandSeparator: true, decimalScale: 2, suffix: " " + row.currency }),
          rate !== null
            ? React.createElement("span", { className: "cm-hint", style: { display: "block" } },
                "TRM ",
                React.createElement(NumberFormat, { value: rate, displayType: "text", thousandSeparator: true, decimalScale: 6 }))
            : null
        );
      }},
      { key: "description", label: "Descripcion", width: "200px" },
      // Texto libre de quien registra el gasto: sin el recorte a dos lineas una
      // observacion larga estira la fila entera. El texto completo queda en el
      // tooltip. sortable: false porque `observations` no esta en
      // EXPENSE_SORT_COLUMNS (mismo caso que `foreign_total`).
      { key: "observations", label: "Observaciones", width: "220px", sortable: false, render: function(row) {
        if (!row.observations) return "—";
        return React.createElement("div", { className: "cm-cell-truncate", "data-tooltip": row.observations, "data-testid": "expense-observations-" + row.id },
          React.createElement("span", { className: "cm-cell-truncate-text" }, row.observations));
      }},
      { key: "identification", label: "NIT / CEDULA", width: "120px" },
      { key: "invoice_number", label: "#Factura", width: "140px" },
      {
        key: "created_at", label: "Creación", width: "220px",
        render: function(row) {
          return React.createElement("span", null,
            formatDate(row.created_at),
            row.user ? React.createElement("span", null, React.createElement("br"), row.user.names) : null
          );
        }
      },
      {
        key: "updated_at", label: "Ultima actualización", width: "220px",
        render: function(row) {
          return React.createElement("span", null,
            formatDate(row.updated_at),
            row.last_user_edited ? React.createElement("span", null, React.createElement("br"), row.last_user_edited.names) : null
          );
        }
      },
    ].filter(function(c) { return !COLUMNAS_OCULTAS[c.key]; });
  }

  componentDidMount() {
    this.loadData();
    window.addEventListener("beforeunload", this.avisarSiHayLotePendiente);
  }

  componentWillUnmount() {
    window.removeEventListener("beforeunload", this.avisarSiHayLotePendiente);
    // El debounce del disponible presupuestal sobrevive al desmontaje y su
    // callback hace setState: sin este clear, React avisa por consola y el
    // fetch sale igual con el formulario ya cerrado.
    if (this._availTimer) clearTimeout(this._availTimer);
  }

  // UNICA fuente de los parametros de filtro. Antes la lista estaba copiada en
  // cuatro sitios (loadData, acceptFilteredExpenses, getExportUrl y
  // EMPTY_FILTERS) y agregar un filtro en tres de los cuatro produce el peor bug
  // del modulo: el usuario ve tres filas filtradas, hace clic en "Aceptar
  // gastos" y el servidor acepta miles porque el PATCH salio sin el filtro.
  filterParams = function() {
    var f = this.state.filters;
    var out = [];
    // LA PESTAÑA VIAJA CON LOS FILTROS, y por eso vive aqui dentro y no en
    // loadData. Es un recorte de la lista igual que los demas, y las otras dos
    // salidas de esta funcion —el Excel y "Aceptar gastos"— tienen que
    // respetarlo: aceptar desde "Centros a mi cargo" sin mandar el scope
    // aceptaria todo lo que el permiso alcance, no lo que el usuario ve.
    if (this.state.scope) out.push("scope=" + this.state.scope);
    if (f.cost_center_id) out.push("cost_center_id=" + f.cost_center_id);
    if (f.user_invoice_id) out.push("user_invoice_id=" + f.user_invoice_id);
    if (f.start_date) out.push("start_date=" + f.start_date);
    if (f.end_date) out.push("end_date=" + f.end_date);
    if (f.operational_state) out.push("operational_state=" + f.operational_state);
    if (f.budget_status) out.push("budget_status=" + f.budget_status);
    if (f.currency) out.push("currency=" + f.currency);
    if (f.accounting_approved) out.push("accounting_approved=" + f.accounting_approved);
    return out;
  }.bind(this);

  loadData = function(page, perPage, searchTerm, sortKey, sortDir) {
    var self = this;
    var p = page || this.state.meta.page;
    var pp = perPage || this.state.meta.per_page;
    var term = searchTerm !== undefined ? searchTerm : this.state.searchTerm;
    var sk = sortKey !== undefined ? sortKey : this.state.sortKey;
    var sd = sortDir !== undefined ? sortDir : this.state.sortDir;

    self.setState({ loading: true });

    var params = ["page=" + p, "per_page=" + pp];
    if (term) params.push("q=" + encodeURIComponent(term));
    if (sk) params.push("sort=" + sk + "&dir=" + sd);
    params = params.concat(this.filterParams());

    fetch("/get_report_expenses?" + params.join("&"), { headers: { "X-CSRF-Token": csrfToken() } })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        self.setState({
          data: data.data || [],
          meta: { total: data.total || 0, page: p, per_page: pp, total_pages: Math.ceil((data.total || 0) / pp) },
          loading: false,
          searchTerm: term,
          sortKey: sk,
          sortDir: sd,
        });
      });
  }.bind(this);

  handlePageChange = function(page) { this.loadData(page); }.bind(this);
  handlePerPageChange = function(pp) { this.loadData(1, pp); }.bind(this);
  handleSearch = function(term) { this.setState({ selectedIds: [] }); this.loadData(1, undefined, term); }.bind(this);
  handleSort = function(key, dir) { this.loadData(1, undefined, undefined, key, dir); }.bind(this);

  toggleFilters = function() {
    var self = this;
    var willClose = this.state.showFilters;
    this.setState({ showFilters: !this.state.showFilters }, function() {
      if (willClose) {
        self.setState({ filters: Object.assign({}, EMPTY_FILTERS), filterCostCenter: null, filterUser: null, filterCostCenterOptions: [], isFiltering: false, selectedIds: [] }, function() {
          self.loadData(1);
        });
      }
    });
  }.bind(this);

  handleFilterChange = function(e) {
    var f = Object.assign({}, this.state.filters);
    f[e.target.name] = e.target.value;
    this.setState({ filters: f });
  }.bind(this);

  handleFilterCostCenterSearch = function(inputValue) {
    var self = this;
    if (!inputValue || inputValue.length < 3) { self.setState({ filterCostCenterOptions: [] }); return; }
    if (self._filterCcTimer) clearTimeout(self._filterCcTimer);
    self._filterCcTimer = setTimeout(function() {
      self.setState({ filterCostCenterLoading: true });
      fetch("/search_cost_centers?q=" + encodeURIComponent(inputValue), { headers: { "X-CSRF-Token": csrfToken() } })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          self.setState({ filterCostCenterOptions: data.map(function(d) { return { value: d.id, label: d.label }; }), filterCostCenterLoading: false });
        });
    }, 300);
  }.bind(this);

  applyFilters = function() {
    this.setState({ isFiltering: true, selectedIds: [] });
    this.loadData(1);
  }.bind(this);

  clearFilters = function() {
    this.setState({ filters: Object.assign({}, EMPTY_FILTERS), filterCostCenter: null, filterUser: null, filterCostCenterOptions: [], isFiltering: false, selectedIds: [] }, this.loadData.bind(this, 1));
  }.bind(this);

  // --- Seleccion multiple (M10) ----------------------------------------------
  // Mismo manejo que Contabilidad: CmDataTable pinta los checkboxes y avisa;
  // la lista de ids vive aqui.
  toggleRow = function(row) {
    var ids = this.state.selectedIds.slice();
    var i = ids.indexOf(row.id);
    if (i === -1) { ids.push(row.id); } else { ids.splice(i, 1); }
    this.setState({ selectedIds: ids });
  }.bind(this);

  toggleAllPage = function(rows, checked) {
    var ids = this.state.selectedIds.slice();
    rows.forEach(function(r) {
      var i = ids.indexOf(r.id);
      if (checked && i === -1) { ids.push(r.id); }
      if (!checked && i !== -1) { ids.splice(i, 1); }
    });
    this.setState({ selectedIds: ids });
  }.bind(this);

  clearSelection = function() { this.setState({ selectedIds: [] }); }.bind(this);

  // La PESTAÑA viaja con los ids: el servidor recorta la descarga a lo que esa
  // pestaña deja ver, igual que la tabla. Sin ella, ids marcados en "Todos los
  // gastos" se recortarian contra el permiso a secas.
  //
  // `window.location` y no `fetch`: las dos respuestas son binarios con
  // Content-Disposition: attachment y lo que se quiere es que el navegador los
  // guarde. Con fetch habria que materializar el blob en memoria para lo mismo.
  urlDeSeleccion = function(base) {
    var params = this.state.selectedIds.map(function(id) { return "ids[]=" + id; });
    if (this.state.scope) params.push("scope=" + this.state.scope);
    return base + "?" + params.join("&");
  }.bind(this);

  exportSelected = function() {
    var n = this.state.selectedIds.length;
    if (n === 0 || n > MAX_SELECCION) return;
    window.location = this.urlDeSeleccion("/download_file/report_expenses/seleccion.xlsx");
  }.bind(this);

  downloadSelectedReceipts = function() {
    var n = this.state.selectedIds.length;
    if (n === 0 || n > MAX_SELECCION) return;
    window.location = this.urlDeSeleccion("/download_receipts/report_expenses");
  }.bind(this);

  // La barra aparece SOLO con algo marcado, y cada boton dice cuantos gastos
  // baja: el "Exportar" de arriba sigue bajando el filtro completo, y dos
  // botones que exportan cosas distintas tienen que distinguirse a la vista.
  renderSelectionBar = function() {
    var self = this;
    var n = this.state.selectedIds.length;
    if (n === 0 || !this.props.estados.export) return null;
    var overLimit = n > MAX_SELECCION;

    return React.createElement("div", { className: "cm-dt-selection-bar", "data-testid": "expense-selection-bar" },
      React.createElement("span", null,
        React.createElement("strong", { "data-testid": "expense-selection-count" }, String(n)),
        " seleccionados"
      ),
      React.createElement("button", {
        type: "button",
        className: "cm-btn cm-btn-outline cm-btn-sm",
        onClick: self.exportSelected,
        disabled: overLimit,
        title: "Exporta a Excel solo los gastos seleccionados",
        "data-testid": "expense-export-selected"
      }, React.createElement("i", { className: "fas fa-file-excel" }), " Exportar seleccionados (" + n + ")"),
      React.createElement("button", {
        type: "button",
        className: "cm-btn cm-btn-outline cm-btn-sm",
        onClick: self.downloadSelectedReceipts,
        disabled: overLimit,
        title: "Descarga los comprobantes de los gastos seleccionados en un ZIP",
        "data-testid": "expense-download-receipts"
      }, React.createElement("i", { className: "fas fa-file-archive" }), " Descargar comprobantes (" + n + ")"),
      React.createElement("button", {
        type: "button",
        className: "cm-btn cm-btn-outline cm-btn-sm",
        onClick: self.clearSelection,
        "data-testid": "expense-clear-selection"
      }, React.createElement("i", { className: "fas fa-times" }), " Limpiar selección"),
      overLimit
        ? React.createElement("span", { className: "cm-hint", style: { color: "#dc3545", width: "100%" } },
            "Máximo " + MAX_SELECCION + " por descarga. Reduzca la selección.")
        : null
    );
  }.bind(this);

  // La confirmacion es el UNICO freno de esta accion: /update_filter_values NO
  // verifica en el servidor que hubiera filtros (deuda documentada en §3.9, que
  // este proyecto no corrige). Con los tres filtros nuevos el riesgo sube: si el
  // backend todavia no soportara uno de ellos, el usuario veria tres filas y
  // aceptaria miles. El conteo del texto sale de meta.total —el total del filtro
  // que el servidor ya devolvio— y no del largo de la pagina.
  acceptFilteredExpenses = function() {
    var self = this;
    var params = this.filterParams();

    Swal.fire({
      title: "¿Aceptar " + this.state.meta.total + " gastos?",
      text: "Se marcarán como Aceptados todos los gastos que coinciden con el filtro actual, no solo los de esta página.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#2a3f53",
      cancelButtonColor: "#dc3545",
      confirmButtonText: "Sí, aceptar",
      cancelButtonText: "Cancelar",
    }).then(function(result) {
      if (!result.value) return;

      fetch("/update_filter_values?" + params.join("&"), {
        method: "PATCH",
        headers: { "X-CSRF-Token": csrfToken(), "Content-Type": "application/json" },
      })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          self.loadData();
          Swal.fire({ position: "center", icon: data.type || "success", title: data.success || "Gastos aceptados", showConfirmButton: false, timer: 1500 });
        });
    });
  }.bind(this);

  openImportModal = function() { this.setState({ modalImport: true }); }.bind(this);
  closeImportModal = function() { this.aceptarArchivoImport(null); this.setState({ modalImport: false }); }.bind(this);

  // El Excel sale SIEMPRE con los parametros, incluso sin filtros: aunque no
  // haya ninguno puesto, la pestaña sigue siendo un recorte y "todos.xlsx" a
  // secas exportaria la lista entera desde "Centros a mi cargo".
  getExportUrl = function() {
    var tipo = this.state.isFiltering ? "filtro" : "todos";
    return "/download_file/report_expenses/" + tipo + ".xlsx?" + this.filterParams().join("&");
  }.bind(this);

  // Cambiar de pestaña vuelve a la pagina 1 y RESPETA los filtros, el orden y
  // la busqueda: son preguntas distintas —"sobre que conjunto" y "que de ese
  // conjunto"— y limpiarlos aqui obligaria a rehacerlos en cada salto.
  handleScopeChange = function(scope) {
    if (scope === this.state.scope) return;
    // La seleccion SI se limpia: los ids marcados eran de otro conjunto, y
    // exportarlos desde esta pestaña recortaria en silencio los que no caben.
    this.setState({ scope: scope, selectedIds: [] }, this.loadData.bind(this, 1));
  }.bind(this);

  openNewModal = function() {
    var self = this;
    // El estado del comprobante se limpia AL ABRIR y no solo al cerrar: si el
    // usuario edito antes un gasto con PDF, sin esto el archivo anterior se
    // subiria al gasto nuevo sin que nada lo advierta.
    this.setState(Object.assign({
      modal: true, modeEdit: false, editId: null, ErrorValues: true, saving: false,
      form: Object.assign({}, EMPTY_FORM, { user_invoice_id: self.props.current_user.id }),
      selectedCostCenter: null, formCostCenterOptions: [],
      selectedUser: { value: self.props.current_user.id, label: self.props.current_user.names },
      selectedType: null, selectedPayment: null,
      selectedCurrency: self.currencyOption("COP"),
    }, estadoComprobanteVacio()));
  }.bind(this);

  openEditModal = function(row) {
    var self = this;
    var costCenterOption = row.cost_center ? { value: row.cost_center.id, label: row.cost_center.code } : null;
    var moneda = row.currency || "COP";

    this.setState(Object.assign({
      modal: true, modeEdit: true, editId: row.id, ErrorValues: true, saving: false,
      form: {
        cost_center_id: row.cost_center_id || "",
        user_invoice_id: row.user_invoice_id || "",
        invoice_name: row.invoice_name || "",
        invoice_date: row.invoice_date || "",
        description: row.description || "",
        observations: row.observations || "",
        invoice_number: row.invoice_number || "",
        identification: row.identification || "",
        invoice_type: row.invoice_type || "",
        invoice_value: row.invoice_value || "",
        invoice_tax: row.invoice_tax || "",
        invoice_total: row.invoice_total || "",
        type_identification_id: row.type_identification_id || "",
        payment_type_id: row.payment_type_id || "",
        currency: moneda,
        foreign_value: row.foreign_value || "",
        foreign_tax: row.foreign_tax || "",
        foreign_total: row.foreign_total || "",
        exchange_rate: row.exchange_rate || "",
        exchange_rate_date: row.exchange_rate_date || "",
        exchange_rate_source: row.exchange_rate_source || "",
        cop_manual_override: !!row.cop_manual_override,
      },
      selectedCostCenter: costCenterOption,
      formCostCenterOptions: costCenterOption ? [costCenterOption] : [],
      selectedUser: row.user_invoice ? { value: row.user_invoice.id, label: row.user_invoice.names } : null,
      selectedType: row.type_identification ? { value: row.type_identification.id, label: row.type_identification.name } : null,
      selectedPayment: row.payment_type ? { value: row.payment_type.id, label: row.payment_type.name } : null,
      selectedCurrency: self.currencyOption(moneda),
    }, estadoComprobanteVacio(), {
      // Se guarda el ID DEL GASTO, nunca `row.receipt_file.url`: esa URL esta
      // firmada y caduca a los 600 s. El destino se arma siempre contra
      // /download_receipt/report_expenses/:id.
      receiptExistingId: row.receipt_file && row.receipt_file.url ? row.id : null,
      receiptExistingUrl: row.receipt_file && row.receipt_file.url ? row.receipt_file.url : "",
    }));

    this.loadBudgetAvailability(row.user_invoice_id, row.id);
  }.bind(this);

  currencyOption = function(code) {
    var encontrada = (this.currencyOptions || []).filter(function(o) { return o.value === code; })[0];
    return encontrada || { value: code, label: code };
  }.bind(this);

  closeModal = function() {
    var self = this;
    var lote = this.state.lote;
    // EN EL LOTE, cerrar con comprobantes sin registrar se confirma: lo que no
    // se guardo hay que volver a subirlo.
    if (lote && lote.paso === "revisar") {
      var faltan = this.pendientesDelLote(lote).length;
      if (faltan > 0) {
        Swal.fire({
          icon: "warning",
          title: "Quedan " + faltan + " comprobante" + (faltan === 1 ? "" : "s") + " sin registrar",
          text: "Lo que ya guardó queda guardado. Los que faltan tendrá que volver a subirlos.",
          showCancelButton: true,
          confirmButtonColor: "#dc3545",
          cancelButtonColor: "#2a3f53",
          confirmButtonText: "Cerrar de todas formas",
          cancelButtonText: "Seguir registrando",
        }).then(function(r) { if (r.isConfirmed) self.cerrarLote(); });
        return;
      }
    }
    if (lote) return this.cerrarLote();
    this.setState({ modal: false });
  }.bind(this);

  handleFormChange = function(e) {
    var self = this;
    var name = e.target.name;
    var value = e.target.value;
    this.setState({ form: Object.assign({}, this.state.form, { [name]: value }) }, function() {
      // La TRM depende de la fecha de la factura: cambiarla con moneda
      // extranjera obliga a volver a consultar, o se guardaria la tasa de otro
      // dia.
      if (name === "invoice_date" && self.state.form.currency !== "COP") self.fetchExchangeRate();
    });
  }.bind(this);

  // Los TRES campos en COP. Siguen editables con moneda extranjera (§1.3), y si
  // el usuario los toca se marcan LAS DOS banderas: sin `cop_manual_override` el
  // servidor recalcula desde foreign_* x TRM y pisa el ajuste en silencio.
  handleFormChangeMoney = function(e) {
    var self = this;
    var value = e.target.value.replace(/\$|,/g, "");
    var newForm = Object.assign({}, this.state.form, { [e.target.name]: value });
    if (newForm.currency && newForm.currency !== "COP") {
      newForm.cop_manual_override = true;
      newForm.exchange_rate_source = "manual";
    }
    // Redondeado a dos: sumar dos floats da 119000.11999999999 y ese numero
    // es el que viajaba al servidor. El modelo lo vuelve a redondear (es el
    // guardian de los cuatro canales); aqui se hace ademas para que el usuario
    // vea el mismo numero que se va a guardar.
    var total = Math.round(((Number(newForm.invoice_value) || 0) + (Number(newForm.invoice_tax) || 0)) * 100) / 100;
    newForm.invoice_total = total;
    this.setState({ form: newForm }, self.refreshBudgetAvailability);
  }.bind(this);

  // --- Moneda extranjera -----------------------------------------------------

  handleChangeCurrency = function(opt) {
    var self = this;
    var code = opt ? opt.value : "COP";
    var anterior = this.state.form.currency || "COP";
    var f = Object.assign({}, this.state.form, { currency: code });
    var round2 = function(x) { return Math.round(x * 100) / 100; };

    // EL VALOR ESCRITO SE CONSERVA. Cambiar la moneda corrige de que moneda es
    // el numero del comprobante, no el numero: antes, pasar de COP a USD
    // dejaba vacio el valor extranjero y el recalculo ponia en 0 los COP que ya
    // estaban escritos (o precargados por la extraccion).
    if (anterior === "COP" && code !== "COP" && !toNumber(f.foreign_value) && toNumber(f.invoice_value)) {
      f.foreign_value = f.invoice_value;
      f.foreign_tax = f.invoice_tax || "";
    }
    if (anterior !== "COP" && code === "COP" && toNumber(f.foreign_value)) {
      f.invoice_value = f.foreign_value;
      f.invoice_tax = f.foreign_tax || "";
      f.invoice_total = round2(toNumber(f.foreign_value) + toNumber(f.foreign_tax));
    }

    if (code === "COP") {
      // Volver a COP limpia TODO lo extranjero: un foreign_value colgando con
      // currency COP haria que la tabla y los exportables muestren un valor
      // extranjero de una moneda que ya no es.
      f.foreign_value = ""; f.foreign_tax = ""; f.foreign_total = "";
      f.exchange_rate = ""; f.exchange_rate_date = ""; f.exchange_rate_source = "";
      f.cop_manual_override = false;
    } else if (code !== anterior) {
      // La tasa de la moneda anterior no sirve para la nueva: si la consulta
      // falla (o no hay fecha) no puede quedarse convirtiendo EUR con la TRM
      // del dolar.
      f.exchange_rate = ""; f.exchange_rate_date = ""; f.exchange_rate_source = "";
      f.cop_manual_override = false;
    }
    this.setState(
      { selectedCurrency: opt, form: f, exchange: Object.assign({}, EXCHANGE_VACIO) },
      code === "COP" ? self.refreshBudgetAvailability : function() {
        self.recomputeConversion();
        self.fetchExchangeRate();
      }
    );
  }.bind(this);

  // Boton "Recalcular" del bloque extranjero. Dice QUE falta en vez de no
  // hacer nada: sin fecha no hay TRM que consultar y sin valor no hay nada que
  // convertir.
  handleRecalcular = function() {
    var f = this.state.form;
    var faltan = [];
    if (!f.invoice_date) faltan.push("la fecha de factura");
    if (!toNumber(f.foreign_value)) faltan.push("el valor en " + f.currency);
    if (faltan.length) {
      this.setState({ exchange: { status: "error", requested_date: null, rate_date: null, source: null,
        message: "Para recalcular indique " + faltan.join(" y ") + "." } });
      return;
    }
    this.fetchExchangeRate();
  }.bind(this);

  handleFormChangeForeignMoney = function(e) {
    var self = this;
    var v = e.target.value.replace(/\$|,/g, "");
    this.setState({ form: Object.assign({}, this.state.form, { [e.target.name]: v }) }, self.recomputeConversion);
  }.bind(this);

  handleChangeRate = function(e) {
    var self = this;
    var v = e.target.value.replace(/\$|,/g, "");
    this.setState({ form: Object.assign({}, this.state.form, { exchange_rate: v, exchange_rate_source: "manual" }) }, self.recomputeConversion);
  }.bind(this);

  handleToggleCopManual = function(e) {
    var on = !!e.target.checked;
    var self = this;
    // Recalcular DESPUES de cambiar la bandera, en los dos sentidos: al
    // desmarcarla hay que devolver los COP a lo que dice la TRM (antes se
    // quedaban con el valor manual hasta que el usuario tocara otro campo), y al
    // marcarla hay que refrescar igual el total extranjero, que no depende de la
    // tasa.
    this.setState({ form: Object.assign({}, this.state.form, {
      cop_manual_override: on,
      exchange_rate_source: on ? "manual" : this.state.form.exchange_rate_source,
    }) }, self.recomputeConversion);
  }.bind(this);

  // INVARIANTE: invoice_value / invoice_tax / invoice_total SIEMPRE en COP. El
  // valor extranjero jamas se escribe en esos tres campos; si se rompe,
  // recalculate_cost_center corrompe el % de viaticos de todos los centros en
  // silencio.
  recomputeConversion = function() {
    var self = this;
    var f = this.state.form;
    if (f.currency === "COP") return;

    var rate = parseFloat(f.exchange_rate) || 0;
    var fv = parseFloat(f.foreign_value) || 0;
    var ft = parseFloat(f.foreign_tax) || 0;
    var round2 = function(x) { return Math.round(x * 100) / 100; };

    // EL TOTAL EXTRANJERO SE CALCULA SIEMPRE. Es aritmetica dentro de la misma
    // moneda (valor + impuesto): no depende de la TRM ni del ajuste manual del
    // COP. Antes vivia dentro del early return de `cop_manual_override`, asi que
    // marcar la casilla dejaba el campo "Total en USD" vacio o desactualizado
    // aunque el usuario siguiera editando el valor y el impuesto.
    var cambios = { foreign_total: round2(fv + ft) };

    // Lo unico que protege la casilla son los tres campos en COP.
    if (!f.cop_manual_override) {
      cambios.invoice_value = round2(fv * rate);
      cambios.invoice_tax = round2(ft * rate);
      // El round2 EXTERIOR no sobra. Sumar dos numeros ya redondeados vuelve a
      // producir binario sucio: 314414 + 59738.66 da 374152.66000000003 en JS, y
      // ese valor se pinta tal cual en el campo Total y viaja asi en el
      // FormData. Verificado en pantalla contra USD 100 + 19 con TRM 3.144,14.
      cambios.invoice_total = round2(round2(fv * rate) + round2(ft * rate));
    }

    this.setState({ form: Object.assign({}, this.state.form, cambios) },
                  self.refreshBudgetAvailability);
  }.bind(this);

  fetchExchangeRate = function() {
    var self = this;
    var f = this.state.form;
    if (f.currency === "COP") return;

    // ANTES ESTO ERA UN `return` MUDO. Sin fecha del gasto el boton no hacia
    // nada: ni spinner, ni error, ni mensaje. Desde fuera se veia como un boton
    // roto. La TRM se pide SIEMPRE para una fecha concreta, asi que sin ella no
    // hay consulta posible; lo que faltaba era decirlo.
    if (!f.invoice_date) {
      this.setState({ exchange: { status: "error", requested_date: null, rate_date: null, source: null,
        message: "Indique primero la fecha del gasto: la TRM se consulta para esa fecha." } });
      return;
    }

    this.setState({ exchange: { status: "loading", message: null, rate_date: null, requested_date: f.invoice_date, source: null } });

    fetch("/get_exchange_rate?currency=" + encodeURIComponent(f.currency) + "&date=" + encodeURIComponent(f.invoice_date),
          { headers: { "X-CSRF-Token": csrfToken() } })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.type === "error") {
          // NO se inventa una tasa: el usuario la escribe a mano y el guardado
          // no se bloquea.
          self.setState({ exchange: { status: "error", message: (d.message || []).join(" "), rate_date: null, requested_date: f.invoice_date, source: null } });
          return;
        }
        self.setState({
          form: Object.assign({}, self.state.form, {
            exchange_rate: d.rate_to_cop, exchange_rate_date: d.rate_date, exchange_rate_source: d.source,
          }),
          exchange: { status: "ok", message: null, rate_date: d.rate_date, requested_date: d.requested_date, source: d.source },
        }, self.recomputeConversion);
      })
      .catch(function() {
        self.setState({ exchange: { status: "error", message: "No se pudo consultar la tasa. Ingrésela manualmente.", rate_date: null, requested_date: f.invoice_date, source: null } });
      });
  }.bind(this);

  // --- Comprobante -----------------------------------------------------------

  handleFileReceipt = function(e) {
    this.aceptarComprobante(e.target.files && e.target.files[0]);
  }.bind(this);

  // UNICA puerta de entrada del comprobante: la usan el selector de archivos y
  // el arrastre. Estaba escrita dentro de handleFileReceipt y el arrastre habria
  // duplicado las dos validaciones —que es justo como se termina aceptando por
  // arrastre un archivo que el boton rechaza.
  aceptarComprobante = function(file) {
    var vacio = { receiptFile: null, receiptFileName: "", receiptSize: 0 };
    if (!file) { this.setState(Object.assign({}, vacio, { receiptError: null })); return; }

    var ext = (file.name.split(".").pop() || "").toLowerCase();
    if (EXTENSIONES_COMPROBANTE.indexOf(ext) === -1) {
      this.setState(Object.assign({}, vacio, { receiptError: "Formato no permitido. Use JPG, PNG, WEBP, HEIC o PDF." }));
      return;
    }
    if (file.size > TAMANO_MAXIMO_COMPROBANTE) {
      this.setState(Object.assign({}, vacio, { receiptError: "El archivo supera los 20 MB permitidos." }));
      return;
    }
    // EL VEREDICTO MUERE CON EL ARCHIVO. Es el juicio sobre UN comprobante: si
    // se adjunta otro, dejarlo puesto significaria bloquear (o dejar pasar) el
    // nuevo por lo que decia el anterior.
    this.setState({ receiptFile: file, receiptFileName: file.name, receiptSize: file.size, receiptError: null,
                    extraction: Object.assign({}, EXTRACTION_VACIA) });
  }.bind(this);

  // LAS REGLAS NO SE AVISAN EN VIVO (2026-10-16). Antes se evaluaban al elegir
  // el tipo, el responsable o el comprobante, y el aviso salia mientras la
  // persona todavia llenaba el formulario. El cliente pidio que solo aparezcan
  // AL GUARDAR (el servidor las evalua y responde) y cuando la IA lee el
  // comprobante (su propio panel). /validate_expense_rules sigue existiendo.

  // --- Arrastrar y soltar ----------------------------------------------------
  //
  // preventDefault en dragOver es OBLIGATORIO: sin el, el navegador no considera
  // la zona un destino valido, nunca dispara drop y ABRE EL ARCHIVO en la
  // pestana, perdiendo el formulario a medio llenar.
  handleReceiptDragOver = function(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!this.state.receiptDragging) this.setState({ receiptDragging: true });
  }.bind(this);

  handleReceiptDragLeave = function(e) {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ receiptDragging: false });
  }.bind(this);

  handleReceiptDrop = function(e) {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ receiptDragging: false });
    var dt = e.dataTransfer;
    // Solo el primero: el gasto tiene UN comprobante, y aceptar en silencio el
    // ultimo de tres arrastrados es peor que ignorar los otros dos.
    this.aceptarComprobante(dt && dt.files && dt.files[0]);
  }.bind(this);

  abrirSelectorComprobante = function() {
    if (this._receiptInput) this._receiptInput.click();
  }.bind(this);

  handleDeleteReceipt = function() {
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
      fetch("/delete_receipt/report_expenses/" + self.state.editId, {
        method: "DELETE",
        headers: { "X-CSRF-Token": csrfToken(), "Content-Type": "application/json" },
      })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.type !== "success") {
            Swal.fire({ icon: "error", title: "No se pudo quitar el comprobante", text: (data.message || []).join(" "), confirmButtonColor: "#2a3f53" });
            return;
          }
          self.setState({ receiptExistingId: null, receiptExistingUrl: "" });
          self.loadData();
        })
        .catch(function() {
          Swal.fire({ icon: "error", title: "No se pudo quitar el comprobante", confirmButtonColor: "#2a3f53" });
        });
    });
  }.bind(this);

  // openReceiptPreview / closeReceiptPreview los define ESTE paquete y viven
  // FUERA del constructor: la columna "Comprobante" de this.columns (paquete 09)
  // llama a openReceiptPreview(id) por nombre. Renombrarlos obliga a actualizar
  // la Tarea 2 del 09 en el mismo PR.
  // UNICO punto de entrada al comprobante desde la tabla y desde el formulario.
  //
  // Imagen -> modal (se puede mirar sin salir de la pantalla).
  // Cualquier otra cosa (PDF, etc.) -> descarga directa, SIN modal: un visor
  // de PDF embebido no aporta nada sobre el del navegador, y abrir un modal
  // para que el usuario tenga que pulsar "Descargar" es un clic de mas.
  abrirComprobante = function(id, pista) {
    if (esComprobanteImagen(pista)) { this.openReceiptPreview(id, pista); return; }
    window.open("/download_receipt/report_expenses/" + id, "_blank", "noopener");
  }.bind(this);

  openReceiptPreview = function(id, name) {
    this.setState({ receiptPreview: { open: true, id: id, name: name || "" }, receiptPreviewError: false });
  }.bind(this);

  closeReceiptPreview = function() {
    this.setState({ receiptPreview: { open: false, id: null, name: "" }, receiptPreviewError: false });
  }.bind(this);

  // --- Captura asistida ------------------------------------------------------

  handleExtract = function() {
    var self = this;
    if (!(this.state.receiptFile instanceof File)) {
      this.setState({ extraction: Object.assign({}, EXTRACTION_VACIA, { status: "error", message: "Primero seleccione el archivo del comprobante." }) });
      return;
    }

    var fd = new FormData();
    fd.append("file", this.state.receiptFile);
    if (this.state.form.cost_center_id) fd.append("cost_center_id", this.state.form.cost_center_id);
    // EL RESPONSABLE DECIDE QUE REGLAS SE JUZGAN: se asignan por rol, y quien
    // digita puede no ser la persona por la que responde el gasto.
    if (this.state.form.user_invoice_id) fd.append("user_invoice_id", this.state.form.user_invoice_id);
    // Con el tipo ya elegido el agente juzga solo las reglas de ese tipo; sin el,
    // las de todos, y la pantalla filtra cuando se elija (hallazgosVigentes).
    if (this.state.form.type_identification_id) fd.append("type_identification_id", this.state.form.type_identification_id);

    this.setState({ extraction: Object.assign({}, EXTRACTION_VACIA, { status: "loading" }) });

    fetch("/extract_receipt/report_expenses", { method: "POST", body: fd, headers: { "X-CSRF-Token": csrfToken() } })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        // El registro manual NUNCA se bloquea por un fallo de la lectura.
        if (d.type === "error") return self.aplicarLecturaAlFormulario({ error: (d.message || []).join(" ") });
        self.aplicarLecturaAlFormulario({ datos: d });
      })
      .catch(function() {
        self.setState({ extraction: Object.assign({}, EXTRACTION_VACIA, { status: "error", message: "No se pudo leer el comprobante. Complete los datos manualmente." }) });
      });
  }.bind(this);


  // Pone en el formulario lo que leyo la IA de un comprobante. Lo usan el boton
  // "Extraer datos" y la carga de varios comprobantes, que lee por adelantado
  // y aplica la lectura cuando la persona llega a ese comprobante.
  //
  // `resultado` es `{ datos: <respuesta de /extract_receipt> }` o
  // `{ error: "mensaje" }`.
  aplicarLecturaAlFormulario = function(resultado) {
    var self = this;
    if (!resultado || resultado.error) {
      self.setState({ extraction: Object.assign({}, EXTRACTION_VACIA, { status: "error",
        message: (resultado && resultado.error) || "No se pudo leer el comprobante. Complete los datos manualmente." }) });
      return;
    }
    var d = resultado.datos || {};

    // WHITELIST de 15 claves. `budget_status`, `accounting_*`,
    // `expense_budget_id`, `is_acepted`, `cost_center_id` y
    // `user_invoice_id` no se sobreescriben jamas desde la extraccion.
    var allowed = ["invoice_name", "identification", "invoice_number", "invoice_date", "description",
                   "currency", "foreign_value", "foreign_tax", "foreign_total",
                   "exchange_rate", "exchange_rate_date", "exchange_rate_source",
                   "invoice_value", "invoice_tax", "invoice_total"];
    var f = Object.assign({}, self.state.form);
    var filled = [];
    allowed.forEach(function(k) {
      var v = d.fields ? d.fields[k] : null;
      // null deja el input VACIO: no se rellena con "—", "N/A" ni con el
      // valor previo.
      if (v === null || v === undefined || v === "") return;
      f[k] = v; filled.push(k);
    });

    var newState = {
      form: f,
      extraction: { status: "done", message: null, filled: filled,
                    confidence: d.confidence || {}, warnings: d.warnings || [],
                    policy: d.policy || null },
    };
    if (f.currency && f.currency !== "COP") newState.selectedCurrency = self.currencyOption(f.currency);
    // NADA SE GUARDA SOLO: la extraccion precarga y la persona pulsa Guardar.
    self.setState(newState);
  }.bind(this);

  // === CARGA DE VARIOS COMPROBANTES (2026-10-18) ===============================
  //
  // Un ZIP o varios archivos a la vez. El recorrido es el MISMO modal de crear
  // gasto, un comprobante a la vez, con el formulario ya lleno por la lectura de
  // la IA: la persona revisa, completa lo que falte y guarda, y el modal pasa
  // solo al siguiente. Cada gasto se guarda por el camino de siempre
  // (handleSubmit), asi que comprobante obligatorio, reglas, presupuesto y
  // correos funcionan igual que con uno solo.
  //
  //   paso "inicio"  -> los archivos que entraron y los que no, y los datos
  //                     comunes (centro, responsable, tipo, forma de pago);
  //   paso "revisar" -> el formulario, comprobante por comprobante;
  //   paso "resumen" -> cuantos se guardaron y cuales quedaron sin registrar.
  //
  // LA LECTURA VA POR ADELANTADO, DOS A LA VEZ: mientras la persona revisa uno,
  // ya se estan leyendo los siguientes, y no tiene que esperar a la IA en cada
  // comprobante. Dos y no todos: cada lectura es una llamada a la IA, y diez en
  // paralelo serian diez peticiones largas compitiendo por el mismo servidor.
  //
  // Estado de cada comprobante: "cola" -> "leyendo" -> "listo" -> "guardado"
  // u "omitido". Un error al guardar no lo saca de "listo": se anota en
  // `error` y se puede corregir.

  abrirSelectorLote = function() {
    if (this._inputLote) this._inputLote.click();
  }.bind(this);

  handleArchivosLote = function(e) {
    var self = this;
    // Copia ANTES de vaciar el input: `files` es una lista viva y vaciarlo la
    // deja en cero. Vaciarlo es lo que permite volver a elegir el mismo ZIP.
    var archivos = Array.prototype.slice.call((e.target && e.target.files) || []);
    if (e.target) e.target.value = "";
    if (!archivos.length) return;

    self.setState({ preparandoLote: true });
    prepararLote(archivos).then(function(res) {
      self.setState({ preparandoLote: false });
      if (!res.items.length) {
        Swal.fire({ icon: "warning", title: "No hay comprobantes para registrar",
                    html: self.listaDeIgnorados(res.ignorados), confirmButtonColor: "#2a3f53" });
        return;
      }
      var items = res.items.map(function(it) {
        return Object.assign({}, it, { estado: "cola", lectura: null, error: null, gastoId: null });
      });
      self.setState(Object.assign({
        lote: { id: Date.now(), paso: "inicio", items: items, ignorados: res.ignorados, actual: 0, comunes: {} },
        modal: true, modeEdit: false, editId: null, ErrorValues: true, saving: false,
        form: Object.assign({}, EMPTY_FORM, { user_invoice_id: self.props.current_user.id }),
        selectedCostCenter: null, formCostCenterOptions: [],
        selectedUser: { value: self.props.current_user.id, label: self.props.current_user.names },
        selectedType: null, selectedPayment: null,
        selectedCurrency: self.currencyOption("COP"),
      }, estadoComprobanteVacio()));
    }).catch(function() {
      self.setState({ preparandoLote: false });
      Swal.fire({ icon: "error", title: "No se pudieron abrir los archivos", confirmButtonColor: "#2a3f53" });
    });
  }.bind(this);

  listaDeIgnorados = function(ignorados) {
    if (!ignorados || !ignorados.length) return "";
    return "<ul style=\"text-align:left;margin:8px auto;max-width:28em\">" +
      ignorados.map(function(i) { return "<li><b>" + escaparHtml(i.name) + "</b>: " + escaparHtml(i.motivo) + "</li>"; }).join("") +
      "</ul>";
  }.bind(this);

  // Lo que todavia falta por resolver: ni guardado ni omitido.
  pendientesDelLote = function(lote) {
    return ((lote && lote.items) || []).filter(function(i) { return i.estado !== "guardado" && i.estado !== "omitido"; });
  }.bind(this);

  // Los datos comunes salen del formulario: en el paso "inicio" y despues de
  // cada guardado, para que el siguiente comprobante llegue con lo mismo que el
  // anterior (casi siempre es el mismo centro, responsable y forma de pago).
  comunesDelFormulario = function() {
    var f = this.state.form;
    return {
      cost_center_id: f.cost_center_id || "", user_invoice_id: f.user_invoice_id || "",
      type_identification_id: f.type_identification_id || "", payment_type_id: f.payment_type_id || "",
      selectedCostCenter: this.state.selectedCostCenter, selectedUser: this.state.selectedUser,
      selectedType: this.state.selectedType, selectedPayment: this.state.selectedPayment,
    };
  }.bind(this);

  empezarLote = function() {
    var self = this;
    var lote = Object.assign({}, this.state.lote, { paso: "revisar", comunes: this.comunesDelFormulario() });
    this.setState({ lote: lote }, function() { self.cargarItemDelLote(0); });
  }.bind(this);

  // Cambia UN comprobante del lote. Por funcion de estado previo y con el id del
  // lote: las lecturas terminan cuando quieren, y una que llega tarde no puede
  // escribir en un lote que ya se cerro o en otro que se abrio despues.
  actualizarItem = function(loteId, idx, cambios, cb) {
    this.setState(function(prev) {
      if (!prev.lote || prev.lote.id !== loteId || !prev.lote.items[idx]) return null;
      var items = prev.lote.items.slice();
      items[idx] = Object.assign({}, items[idx], cambios);
      return { lote: Object.assign({}, prev.lote, { items: items }) };
    }, cb);
  }.bind(this);

  bombearLecturas = function() {
    var lote = this.state.lote;
    if (!lote || lote.paso !== "revisar") return;
    var self = this;

    // Sin la lectura de la IA encendida no hay nada que leer: se llenan a mano.
    if (!receiptExtractionEnabled()) {
      lote.items.forEach(function(it, idx) {
        if (it.estado === "cola") self.actualizarItem(lote.id, idx, { estado: "listo" });
      });
      return;
    }

    var leyendo = lote.items.filter(function(i) { return i.estado === "leyendo"; }).length;
    var n = lote.items.length;
    // Desde el que se esta revisando hacia adelante: el siguiente que la
    // persona va a ver es el primero que tiene que estar listo.
    for (var k = 0; k < n && leyendo < 2; k++) {
      var idx = (lote.actual + k) % n;
      if (lote.items[idx].estado === "cola" && !self.lecturaIniciada(lote.id, idx)) {
        self.leerItemDelLote(lote.id, idx);
        leyendo++;
      }
    }
  }.bind(this);

  leerItemDelLote = function(loteId, idx) {
    var self = this;
    var lote = this.state.lote;
    var item = lote.items[idx];
    var c = lote.comunes || {};
    // Se anota aparte y de inmediato, no solo en el estado: setState puede
    // llegar despues de que otro `bombearLecturas` del mismo tick lo vea en
    // "cola", y la IA leeria el mismo comprobante dos veces.
    this._lecturasIniciadas = this._lecturasIniciadas || {};
    this._lecturasIniciadas[loteId + ":" + idx] = true;
    this.actualizarItem(loteId, idx, { estado: "leyendo" });

    var fd = new FormData();
    fd.append("file", item.file);
    if (c.cost_center_id) fd.append("cost_center_id", c.cost_center_id);
    if (c.user_invoice_id) fd.append("user_invoice_id", c.user_invoice_id);
    if (c.type_identification_id) fd.append("type_identification_id", c.type_identification_id);

    fetch("/extract_receipt/report_expenses", { method: "POST", body: fd, headers: { "X-CSRF-Token": csrfToken() } })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        self.alTerminarLectura(loteId, idx, d.type === "error"
          ? { error: (d.message || []).join(" ") || "No se pudo leer el comprobante. Complete los datos manualmente." }
          : { datos: d });
      })
      .catch(function() {
        self.alTerminarLectura(loteId, idx, { error: "No se pudo leer el comprobante. Complete los datos manualmente." });
      });
  }.bind(this);

  lecturaIniciada = function(loteId, idx) {
    return !!(this._lecturasIniciadas && this._lecturasIniciadas[loteId + ":" + idx]);
  }.bind(this);

  alTerminarLectura = function(loteId, idx, resultado) {
    var self = this;
    // Solo pasa a "listo" si seguia leyendose: un comprobante que la persona
    // omitio (o ya guardo a mano) mientras la IA lo leia se queda como esta.
    var item = this.state.lote && this.state.lote.id === loteId ? this.state.lote.items[idx] : null;
    var cambios = { lectura: resultado };
    if (item && item.estado === "leyendo") cambios.estado = "listo";
    this.actualizarItem(loteId, idx, cambios, function() {
      var lote = self.state.lote;
      if (!lote || lote.id !== loteId) return;
      // Si la persona ya esta en este comprobante, la lectura entra al
      // formulario en cuanto llega.
      if (lote.paso === "revisar" && lote.actual === idx && self.state.modal) self.aplicarLecturaAlFormulario(resultado);
      self.bombearLecturas();
    });
  }.bind(this);

  // Abre en el formulario el comprobante `idx`: los datos comunes, el archivo
  // ya adjunto y, si ya se leyo, lo que encontro la IA.
  cargarItemDelLote = function(idx) {
    var self = this;
    var lote = this.state.lote;
    var item = lote.items[idx];
    var c = lote.comunes || {};
    var responsable = c.selectedUser || { value: self.props.current_user.id, label: self.props.current_user.names };
    var form = Object.assign({}, EMPTY_FORM, {
      cost_center_id: c.cost_center_id || "",
      user_invoice_id: c.user_invoice_id || self.props.current_user.id,
      type_identification_id: c.type_identification_id || "",
      payment_type_id: c.payment_type_id || "",
    });
    // Un viatico propone a la persona responsable como nombre, igual que al
    // elegir el tipo en el formulario.
    form.invoice_name = self.nombreDeViatico(form, form.type_identification_id, responsable.label, responsable.label);

    this.setState(Object.assign({
      lote: Object.assign({}, lote, { actual: idx }),
      modal: true, modeEdit: false, editId: null, ErrorValues: true, saving: false,
      form: form,
      selectedCostCenter: c.selectedCostCenter || null,
      formCostCenterOptions: c.selectedCostCenter ? [c.selectedCostCenter] : [],
      selectedUser: responsable,
      selectedType: c.selectedType || null,
      selectedPayment: c.selectedPayment || null,
      selectedCurrency: self.currencyOption("COP"),
    }, estadoComprobanteVacio(), {
      receiptFile: item.file, receiptFileName: item.name, receiptSize: item.file.size, receiptError: null,
      extraction: Object.assign({}, EXTRACTION_VACIA, item.estado === "leyendo" || item.estado === "cola" ? { status: "loading" } : {}),
    }), function() {
      if (item.lectura) self.aplicarLecturaAlFormulario(item.lectura);
      self.loadBudgetAvailability(form.user_invoice_id, null);
      self.bombearLecturas();
    });
  }.bind(this);

  // El siguiente sin resolver, dando la vuelta: los omitidos y los guardados
  // no vuelven a salir. Sin ninguno, el resumen.
  irAlSiguienteDelLote = function() {
    var lote = this.state.lote;
    if (!lote) return;
    var n = lote.items.length;
    for (var k = 1; k <= n; k++) {
      var idx = (lote.actual + k) % n;
      var estado = lote.items[idx].estado;
      if (estado !== "guardado" && estado !== "omitido") return this.cargarItemDelLote(idx);
    }
    this.setState(Object.assign({ lote: Object.assign({}, lote, { paso: "resumen" }), saving: false }, estadoComprobanteVacio()));
  }.bind(this);

  irAItemDelLote = function(idx) {
    var lote = this.state.lote;
    if (!lote || lote.paso === "inicio" || this.state.saving) return;
    if (lote.items[idx].estado === "guardado") return;
    if (lote.items[idx].estado === "omitido") this.actualizarItem(lote.id, idx, { estado: lote.items[idx].lectura ? "listo" : "cola" });
    this.setState({ lote: Object.assign({}, this.state.lote, { paso: "revisar" }) }, this.cargarItemDelLote.bind(this, idx));
  }.bind(this);

  omitirItemDelLote = function() {
    var self = this;
    var lote = this.state.lote;
    this.actualizarItem(lote.id, lote.actual, { estado: "omitido" }, function() { self.irAlSiguienteDelLote(); });
  }.bind(this);

  // Despues de guardar un comprobante del lote: queda "guardado", lo que se
  // puso en el formulario pasa a ser lo comun del siguiente, y se avanza.
  alGuardarItemDelLote = function(data) {
    var self = this;
    var lote = this.state.lote;
    var items = lote.items.slice();
    items[lote.actual] = Object.assign({}, items[lote.actual], {
      estado: "guardado", error: null, gastoId: data && data.register ? data.register.id : null,
    });
    this.setState({ saving: false, lote: Object.assign({}, lote, { items: items, comunes: this.comunesDelFormulario() }) },
                  function() {
                    self.loadData();
                    self.irAlSiguienteDelLote();
                  });
  }.bind(this);

  cerrarLote = function() {
    this.setState(Object.assign({ modal: false, lote: null, saving: false }, estadoComprobanteVacio()));
  }.bind(this);

  // Cerrar la pestaña con comprobantes sin registrar los pierde: el navegador
  // pregunta antes. Lo guardado ya esta guardado.
  avisarSiHayLotePendiente = function(e) {
    var lote = this.state.lote;
    if (!lote || lote.paso !== "revisar" || !this.pendientesDelLote(lote).length) return undefined;
    e.preventDefault();
    e.returnValue = "";
    return "";
  }.bind(this);

  // --- Disponible presupuestal (informativo, nunca bloquea) ------------------

  refreshBudgetAvailability = function() {
    this.loadBudgetAvailability(this.state.form.user_invoice_id, this.state.modeEdit ? this.state.editId : null);
  }.bind(this);

  loadBudgetAvailability = function(userId, excludeExpenseId) {
    var self = this;
    if (this._availTimer) clearTimeout(this._availTimer);

    if (!userId || !this.state.form.cost_center_id) {
      this.setState({ budgetAvailability: Object.assign({}, DISPONIBLE_VACIO) });
      return;
    }

    this.setState({ budgetAvailability: Object.assign({}, this.state.budgetAvailability || DISPONIBLE_VACIO, { loading: true, error: null }) });

    this._availTimer = setTimeout(function() {
      var qs = "cost_center_id=" + self.state.form.cost_center_id + "&user_id=" + userId;
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
          self.setState({ budgetAvailability: Object.assign({}, DISPONIBLE_VACIO, { error: "No se pudo consultar el disponible" }) });
        });
    }, 400);
  }.bind(this);

  handleFormCostCenterSearch = function(inputValue) {
    var self = this;
    if (!inputValue || inputValue.length < 3) { self.setState({ formCostCenterOptions: [] }); return; }
    if (self._formCcTimer) clearTimeout(self._formCcTimer);
    self._formCcTimer = setTimeout(function() {
      self.setState({ formCostCenterLoading: true });
      fetch("/search_cost_centers?q=" + encodeURIComponent(inputValue) + "&exclude_finalized=true", { headers: { "X-CSRF-Token": csrfToken() } })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          self.setState({ formCostCenterOptions: data.map(function(d) { return { value: d.id, label: d.label }; }), formCostCenterLoading: false });
        });
    }, 300);
  }.bind(this);

  // Obligatoriedad del comprobante PARA EL TIPO ELEGIDO. El flag global manda,
  // pero los viaticos quedan exentos (ReportExpenseOption::PREFIJOS_SIN_COMPROBANTE):
  // el servidor publica sus ids en `estados.receipt_optional_type_ids`.
  comprobanteObligatorio = function(typeId) {
    var e = this.props.estados || {};
    if (!e.receipt_required) return false;
    return (e.receipt_optional_type_ids || []).indexOf(Number(typeId)) === -1;
  }.bind(this);

  // NOMBRE EN LOS VIATICOS (2026-09-21). El campo "Nombre" se penso para el
  // proveedor que factura, pero un viatico se le paga a una PERSONA: no hay
  // tercero que poner ahi y cada quien escribia una cosa distinta. Al elegir un
  // tipo de viatico el formulario propone el nombre del responsable.
  //
  // Es una PROPUESTA, no un candado: el campo sigue editable, y solo se pisa lo
  // que escribio el propio formulario (el campo vacio, o el nombre del
  // responsable anterior). Lo que la persona teclea NUNCA se toca.
  esViatico = function(typeId) {
    var e = this.props.estados || {};
    return (e.viatic_type_ids || []).indexOf(Number(typeId)) !== -1;
  }.bind(this);

  // `labelAnterior` es el nombre que el formulario habria puesto antes del
  // cambio: si el campo trae eso mismo (o esta vacio) es suyo y lo puede
  // reescribir; si trae otra cosa, la escribio la persona y se respeta.
  nombreDeViatico = function(form, typeId, labelNuevo, labelAnterior) {
    var actual = (form.invoice_name || "").trim();
    var esDelFormulario = actual === "" || actual === (labelAnterior || "").trim();
    if (!esDelFormulario) return form.invoice_name;
    return this.esViatico(typeId) ? (labelNuevo || "") : "";
  }.bind(this);

  handleSubmit = function() {
    var self = this;
    var form = this.state.form;

    if (!form.cost_center_id || !form.user_invoice_id || !form.invoice_name || !form.invoice_date) {
      this.setState({ ErrorValues: false });
      return;
    }

    // COMPROBANTE OBLIGATORIO AL CREAR. El servidor tambien lo rechaza (es el
    // guardian de verdad); aqui se corta antes para no gastarle a la persona
    // una subida y un viaje al servidor por algo que se ve desde el formulario.
    // Al EDITAR no se exige: los ~7.000 gastos historicos no tienen comprobante
    // y con esto no se podrian ni tocar.
    if (this.comprobanteObligatorio(form.type_identification_id) && !this.state.modeEdit && !(this.state.receiptFile instanceof File)) {
      this.setState({ receiptError: AVISO_COMPROBANTE });
      return;
    }

    var isEdit = this.state.modeEdit;
    var url = isEdit ? "/report_expenses/" + this.state.editId : "/report_expenses";
    var method = isEdit ? "PATCH" : "POST";

    // FormData y no JSON, porque ahora el gasto puede llevar un archivo.
    // `fd.append(k, "")` para los vacios: FormData convierte undefined en el
    // string "undefined", que un to_f en el servidor lee como 0.0.
    var fd = new FormData();
    ["cost_center_id", "user_invoice_id", "invoice_name", "invoice_date", "description", "observations", "invoice_number",
     "identification", "invoice_type", "invoice_value", "invoice_tax", "invoice_total",
     "type_identification_id", "payment_type_id",
     "currency", "foreign_value", "foreign_tax", "foreign_total",
     "exchange_rate", "exchange_rate_date", "exchange_rate_source", "cop_manual_override"
    ].forEach(function(k) { fd.append(k, form[k] === null || form[k] === undefined ? "" : form[k]); });

    // Solo si es un File: hacer el append siempre manda el string
    // "[object Object]" cuando no hay archivo.
    if (this.state.receiptFile instanceof File) fd.append("receipt_file", this.state.receiptFile);

    // EL VEREDICTO VIAJA AL GUARDAR. Quien lo aplica es el servidor
    // (ReportExpense#agent_policy_verdict): sin esto, el aviso de la pantalla
    // seria decorativo y el gasto se guardaria igual. Solo se manda si el
    // agente juzgo de verdad: sin veredicto no se manda la clave, porque
    // ausente significa "nadie lo juzgo" y no frena nada.
    var veredicto = veredictoParaGuardar((this.state.extraction || {}).policy);
    if (veredicto) fd.append("policy_verdict", veredicto);

    this.setState({ saving: true });

    // NUNCA se fija Content-Type con FormData: el navegador tiene que escribir
    // el boundary. Si se pone a mano, Rails recibe el body como basura y el
    // gasto se crea SIN comprobante y sin error visible.
    fetch(url, { method: method, headers: { "X-CSRF-Token": csrfToken() }, body: fd })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        // `type === "error"` con HTTP 200 es la convencion del proyecto: el
        // modal no se cierra y el mensaje del servidor se muestra tal cual.
        if (data.type === "error") {
          self.setState({ saving: false });
          // En el lote, el error queda anotado en el comprobante para la lista.
          if (self.state.lote && !isEdit) {
            var motivoLote = (data.blocking_rule_violations || []).map(function(v) { return v.message; }).join(" ") ||
                             (data.message || []).join(" ");
            self.actualizarItem(self.state.lote.id, self.state.lote.actual, { error: motivoLote || "No se pudo guardar" });
          }

          // UNA REGLA CON «IMPEDIR GUARDAR» RECHAZO EL GASTO: este modal se
          // queda abierto con los datos puestos, para corregir sin volver a
          // escribirlo todo. Se separa del error generico porque no es un fallo
          // del sistema sino una decision de negocio.
          //
          // SOLO LAS QUE FRENAN (`blocking_rule_violations`), no la lista
          // completa: una regla que deja guardar no es la causa del rechazo, y
          // mostrarla aqui la hacia pasar por regla dura (2026-10-16).
          var violaciones = data.blocking_rule_violations || [];
          if (violaciones.length > 0) {
            Swal.fire({
              icon: "warning",
              title: "No se puede guardar: incumple las reglas de gasto",
              html: "<ul style=\"text-align:left;margin:8px auto;max-width:26em\">" +
                    violaciones.map(function(v) { return "<li>" + escaparHtml(v.message || "") + "</li>"; }).join("") +
                    "</ul>",
              confirmButtonColor: "#2a3f53",
              confirmButtonText: "Corregir",
            });
            return;
          }

          Swal.fire({ icon: "error", title: "¡Ocurrió un error!", text: (data.message || []).join(" "), confirmButtonColor: "#2a3f53" });
          return;
        }
        // EN EL LOTE NO SE CIERRA: pasa al siguiente comprobante.
        if (self.state.lote && !isEdit) {
          self.alGuardarItemDelLote(data);
          Swal.fire({ position: "top-end", icon: "success", title: "Gasto guardado", toast: true,
                      showConfirmButton: false, timer: 1200 });
          return;
        }
        self.setState({ modal: false, saving: false });
        self.loadData();

        // UNA REGLA QUE DEJA GUARDAR NO SE AVISA AQUI (2026-10-17): el gasto se
        // guardo y eso es lo que se dice. Que quede sin aprobar se ve en la
        // tabla (estado presupuestal y motivo), no en un modal.
        Swal.fire({ position: "center", icon: "success", title: data.success || (isEdit ? "Actualizado" : "Creado"), showConfirmButton: false, timer: 1500 });
      })
      .catch(function() {
        self.setState({ saving: false });
        Swal.fire({ icon: "error", title: "No se pudo guardar el gasto", confirmButtonColor: "#2a3f53" });
      });
  }.bind(this);

  handleDelete = function(row) {
    var self = this;
    Swal.fire({
      title: "¿Estás seguro?",
      text: "El registro será eliminado permanentemente",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#2a3f53",
      cancelButtonColor: "#dc3545",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    }).then(function(result) {
      if (result.value) {
        fetch("/report_expenses/" + row.id, { method: "DELETE", headers: { "X-CSRF-Token": csrfToken() } })
          .then(function(r) { return r.json(); })
          .then(function() {
            self.loadData();
            Swal.fire({ title: "Eliminado", icon: "success", timer: 1500, showConfirmButton: false });
          });
      }
    });
  }.bind(this);

  openStatusEdit = function(rowId) {
    this.setState({ editingStatusId: rowId });
  }.bind(this);

  closeStatusEdit = function() {
    this.setState({ editingStatusId: null });
  }.bind(this);

  // Manda el estado y, si es un rechazo, el motivo. Separado de `updateStatus`
  // para que el camino normal —aceptar, volver a Creado— siga siendo una sola
  // peticion sin ninguna ventana de por medio.
  enviarEstado = function(row, estado, motivo) {
    var self = this;
    var cuerpo = motivo ? JSON.stringify({ rejection_reason: motivo }) : null;

    fetch("/update_state_report_expense/" + row.id + "/" + estado, {
      method: "PATCH",
      headers: { "X-CSRF-Token": csrfToken(), "Content-Type": "application/json" },
      body: cuerpo,
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        self.setState({ editingStatusId: null });
        self.loadData();
        if (data && data.type === "error") {
          Swal.fire({ icon: "error", title: "No se pudo cambiar el estado",
                      text: (data.message || []).join(" "), confirmButtonColor: "#2a3f53" });
          return;
        }
        // DOBLE APROBACION: el "Aceptado" fue la primera de dos firmas. Se dice,
        // o la persona cree que el gasto ya va para Contabilidad.
        if (data && data.register && data.register.operational_state === "pendiente_segunda") {
          Swal.fire({ icon: "info", title: "Primera aprobación registrada",
                      text: data.success, confirmButtonColor: "#2a3f53" });
        }
      });
  }.bind(this);

  updateStatus = function(e, row) {
    var self = this;
    var nuevoEstado = e.target.value;

    if (nuevoEstado !== "rechazado") return this.enviarEstado(row, nuevoEstado, null);

    // EL MOTIVO SE PIDE ANTES DE RECHAZAR, no despues. Es lo unico que el correo
    // le va a poder decir a quien reporto el gasto; sin el, el aviso dice "su
    // gasto fue rechazado" y nada mas, que es lo que termina en una llamada
    // telefonica preguntando por que.
    //
    // Es OPCIONAL —se puede rechazar sin escribirlo— porque obligar a redactar
    // para poder frenar un gasto equivocado es peor que un rechazo escueto.
    Swal.fire({
      title: "Rechazar este gasto",
      input: "textarea",
      inputLabel: "Motivo del rechazo (opcional)",
      inputPlaceholder: "Por ejemplo: la factura no corresponde a este centro de costos",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#2a3f53",
      confirmButtonText: "Sí, rechazar",
      cancelButtonText: "Cancelar",
    }).then(function(result) {
      // `result.value` es "" cuando se confirma sin escribir nada, asi que la
      // guarda mira `isConfirmed` y no el valor: con `if (!result.value)` un
      // rechazo sin motivo se cancelaria solo.
      if (!result.isConfirmed) {
        // El <select> ya se pinto con el valor nuevo: hay que recargar para que
        // vuelva a mostrar el estado real del gasto.
        self.loadData();
        return;
      }
      self.enviarEstado(row, "rechazado", result.value);
    });
  }.bind(this);

  openMenu = function(e) { window.cmOpenMenu(e); }.bind(this);

  // ¿Puede este usuario aceptar o rechazar ESTA fila? Es la misma regla que
  // `puede_decidir?` del servidor, que es quien decide de verdad; aqui solo se
  // usa para no pintar controles que el servidor va a rechazar.
  //   * "Aceptar todos los gastos" (o administrador) -> cualquiera;
  //   * "Aceptar gasto" -> los suyos (responsable) y los de sus centros.
  puedeDecidir = function(row) {
    var estados = this.props.estados;
    if (estados.accept_all) return true;
    if (!estados.closed) return false;
    if (row.user_invoice_id === this.props.current_user.id) return true;
    return (estados.owned_cost_center_ids || []).indexOf(row.cost_center_id) !== -1;
  }.bind(this);

  // ¿Puede este usuario dar la segunda aprobacion de ESTA fila? Misma regla que
  // `puede_dar_segunda_aprobacion?` del modelo: figura en la regla (por persona
  // o por cargo) y no dio la primera. Solo para no pintar un desplegable que el
  // servidor va a rechazar; quien decide de verdad es el servidor.
  puedeDarSegunda = function(row) {
    var doble = row.double_approval;
    if (!doble || row.operational_state !== "pendiente_segunda") return false;
    var yo = this.props.current_user || {};
    if (doble.first_by && doble.first_by.id === yo.id) return false;
    return (doble.user_ids || []).indexOf(yo.id) !== -1 || (doble.rol_ids || []).indexOf(yo.rol_id) !== -1;
  }.bind(this);

  // El texto del tooltip del estado: quien dio cada firma y quien falta. null
  // en los gastos de siempre.
  notaDobleAprobacion = function(row) {
    var partes = [];
    var doble = row.double_approval;
    if (doble) {
      if (doble.first_by) partes.push("1ª aprobación: " + doble.first_by.names);
      if (doble.second_by) partes.push("2ª aprobación: " + doble.second_by.names);
      else partes.push("2ª aprobación de: " + doble.approvers);
      (doble.reasons || []).forEach(function(r) { partes.push(r); });
    }
    return partes.length ? partes.join("\n") : null;
  }.bind(this);

  getRowActions = function(row) {
    var self = this;
    var estados = this.props.estados;

    // Un gasto ACEPTADO solo lo edita o elimina quien podria decidirlo: editar
    // lo devuelve a "Creado" (M6) y deshace la aceptacion de otro. Lo mismo un
    // gasto que espera la segunda aprobacion: ya tiene una firma.
    var estadoFila = operationalState(row);
    if ((!estadoFila.isOk && !estadoFila.isPendingSecond) || self.puedeDecidir(row)) {
      var hasEdit = estados.edit && row.cost_center && row.cost_center.execution_state !== "FINALIZADO";
      var hasDelete = estados.delete;

      if (!hasEdit && !hasDelete) return null;

      return React.createElement("div", { className: "cm-dt-menu" },
        React.createElement("button", { className: "cm-dt-menu-trigger", onClick: self.openMenu },
          React.createElement("i", { className: "fas fa-ellipsis-v" })
        ),
        React.createElement("div", { className: "cm-dt-menu-dropdown" },
          hasEdit && React.createElement("button", {
            onClick: function() { self.openEditModal(row); },
            className: "cm-dt-menu-item"
          }, React.createElement("i", { className: "fas fa-pen" }), " Editar"),
          hasDelete && React.createElement("button", {
            onClick: function() { self.handleDelete(row); },
            className: "cm-dt-menu-item cm-dt-menu-item--danger"
          }, React.createElement("i", { className: "fas fa-trash" }), " Eliminar")
        )
      );
    }
    return null;
  }.bind(this);

  // LAS PESTAÑAS DE LA LISTA. Van ARRIBA de los filtros porque no son un filtro
  // mas: eligen el conjunto sobre el que los filtros trabajan, y esa es la
  // primera decision que toma quien entra a la pantalla.
  //
  // Se pinta solo lo que el usuario puede usar: sin "Ver todos" no hay "Todos",
  // y sin centros propios no hay "Centros a mi cargo". Si eso deja una sola
  // pestaña no se pinta ninguna —una pestaña unica no es una eleccion, es
  // ruido— y la pantalla queda igual que antes de este cambio.
  renderScopeTabs = function() {
    var self = this;
    var estados = this.props.estados;

    var tabs = [{ value: "mine", label: "Mis gastos", icon: "fas fa-user" }];
    if (estados.owns_cost_centers) {
      tabs.push({ value: "owned_centers", label: "Centros a mi cargo", icon: "fas fa-sitemap" });
    }
    if (estados.show_all) {
      tabs.push({ value: "all", label: "Todos los gastos", icon: "fas fa-list-ul" });
    }
    // DOBLE APROBACION (2026-10-18): lo que espera MI segunda firma. Solo a
    // quien una regla nombra segundo aprobador o tiene algo pendiente.
    if (estados.second_approver) {
      tabs.push({ value: "second_approval", label: "Por aprobar (2ª)", icon: "fas fa-user-check" });
    }

    if (tabs.length < 2) return null;

    return React.createElement("div", { className: "cm-scope-tabs", "data-testid": "expense-scope-tabs" },
      tabs.map(function(t) {
        var activa = self.state.scope === t.value;
        return React.createElement("button", {
          key: t.value,
          type: "button",
          className: "cm-scope-tab" + (activa ? " cm-scope-tab--active" : ""),
          onClick: function() { self.handleScopeChange(t.value); },
          "aria-pressed": activa,
          "data-testid": "expense-scope-" + t.value,
        },
          React.createElement("i", { className: t.icon }),
          " " + t.label
        );
      })
    );
  }.bind(this);

  renderFilters = function() {
    var self = this;
    var f = this.state.filters;

    return React.createElement("div", { style: { marginBottom: 16 } },
      React.createElement("div", { className: "cm-filter-panel" },
        // Header con botón cerrar
        React.createElement("div", { style: { padding: "14px 20px", borderBottom: "1px solid var(--cm-border)", display: "flex", alignItems: "center", justifyContent: "space-between" } },
          React.createElement("span", { style: { fontFamily: "'Poppins', sans-serif", fontSize: 13, fontWeight: 600, color: "var(--cm-text-muted)" } },
            React.createElement("i", { className: "fas fa-filter", style: { marginRight: 8, opacity: 0.6 } }),
            "Filtros avanzados"
          ),
          React.createElement("button", { onClick: self.toggleFilters, className: "cm-dt-action-btn", title: "Cerrar filtros", style: { width: 28, height: 28 } },
            React.createElement("i", { className: "fas fa-times" })
          )
        ),
        // Content - Grid de 4 columnas
        React.createElement("div", { className: "cm-filter-grid" },
          // Row 1
          React.createElement("div", { className: "cm-form-group", style: { marginBottom: 0 } },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-building", style: { marginRight: 6, opacity: 0.5 } }),
              "Centro de costo",
              React.createElement("span", { className: "cm-hint", style: { marginLeft: 4 } }, "(3+ letras)")
            ),
            React.createElement(Select, {
              options: self.state.filterCostCenterOptions,
              value: self.state.filterCostCenter,
              onChange: function(opt) { self.setState({ filterCostCenter: opt, filters: Object.assign({}, f, { cost_center_id: opt ? opt.value : "" }) }); },
              onInputChange: self.handleFilterCostCenterSearch,
              isLoading: self.state.filterCostCenterLoading,
              placeholder: "Buscar centro...",
              isClearable: true,
              noOptionsMessage: function() { return "Escribe al menos 3 letras"; },
              styles: selectStyles,
              menuPortalTarget: document.body,
            })
          ),
          React.createElement("div", { className: "cm-form-group", style: { marginBottom: 0 } },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-user", style: { marginRight: 6, opacity: 0.5 } }),
              "Responsable"
            ),
            React.createElement(Select, {
              options: self.userOptions,
              value: self.state.filterUser,
              onChange: function(opt) { self.setState({ filterUser: opt, filters: Object.assign({}, f, { user_invoice_id: opt ? opt.value : "" }) }); },
              placeholder: "Seleccione responsable...",
              isClearable: true,
              styles: selectStyles,
              menuPortalTarget: document.body,
            })
          ),
          React.createElement("div", { className: "cm-form-group", style: { marginBottom: 0 } },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-calendar", style: { marginRight: 6, opacity: 0.5 } }),
              "Fecha desde"
            ),
            React.createElement("input", { type: "date", name: "start_date", className: "cm-input", value: f.start_date, onChange: self.handleFilterChange })
          ),
          React.createElement("div", { className: "cm-form-group", style: { marginBottom: 0 } },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-calendar", style: { marginRight: 6, opacity: 0.5 } }),
              "Fecha hasta"
            ),
            React.createElement("input", { type: "date", name: "end_date", className: "cm-input", value: f.end_date, onChange: self.handleFilterChange })
          ),
          // Row 2
          React.createElement("div", { className: "cm-form-group", style: { marginBottom: 0 } },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-flag", style: { marginRight: 6, opacity: 0.5 } }),
              "Estado"
            ),
            React.createElement("select", { name: "operational_state", className: "cm-input", value: f.operational_state, onChange: self.handleFilterChange },
              React.createElement("option", { value: "" }, "Todos"),
              React.createElement("option", { value: "creado" }, "Creado"),
              React.createElement("option", { value: "aceptado" }, "Aceptado"),
              React.createElement("option", { value: "pendiente_segunda" }, "Pendiente 2ª aprobación"),
              React.createElement("option", { value: "rechazado" }, "Rechazado")
            )
          ),
          React.createElement("div", { className: "cm-form-group", style: { marginBottom: 0 } },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-coins", style: { marginRight: 6, opacity: 0.5 } }),
              "Estado presupuestal"
            ),
            React.createElement("select", { name: "budget_status", className: "cm-input", value: f.budget_status, onChange: self.handleFilterChange, "data-testid": "filter-budget-status" },
              React.createElement("option", { value: "" }, "Todos"),
              React.createElement("option", { value: "aprobado" }, "Aprobado"),
              React.createElement("option", { value: "excedido" }, "Excedido"),
              React.createElement("option", { value: "sin_presupuesto" }, "Sin presupuesto")
            )
          ),
          React.createElement("div", { className: "cm-form-group", style: { marginBottom: 0 } },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-money-bill-wave", style: { marginRight: 6, opacity: 0.5 } }),
              "Moneda"
            ),
            React.createElement("select", { name: "currency", className: "cm-input", value: f.currency, onChange: self.handleFilterChange, "data-testid": "filter-currency" },
              [React.createElement("option", { key: "", value: "" }, "Todas")].concat(
                self.currencyOptions.map(function(c) {
                  return React.createElement("option", { key: c.value, value: c.value }, c.label);
                })
              )
            )
          ),
          // Fila 3
          React.createElement("div", { className: "cm-form-group", style: { marginBottom: 0 } },
            React.createElement("label", { className: "cm-label" },
              React.createElement("i", { className: "fas fa-file-invoice-dollar", style: { marginRight: 6, opacity: 0.5 } }),
              "Estado contable"
            ),
            React.createElement("select", { name: "accounting_approved", className: "cm-input", value: f.accounting_approved, onChange: self.handleFilterChange, "data-testid": "filter-accounting-approved" },
              React.createElement("option", { value: "" }, "Todos"),
              React.createElement("option", { value: "true" }, "Contabilizado"),
              React.createElement("option", { value: "false" }, "No contabilizado")
            )
          ),
          React.createElement("div", { style: { gridColumn: "1 / -1", display: "flex", alignItems: "flex-end", justifyContent: "flex-end", gap: 10 } },
            React.createElement("button", { className: "cm-btn cm-btn-outline cm-btn-sm", type: "button", onClick: self.clearFilters },
              React.createElement("i", { className: "fas fa-eraser" }), " Limpiar"
            ),
            React.createElement("button", { className: "cm-btn cm-btn-accent cm-btn-sm", type: "button", onClick: self.applyFilters },
              React.createElement("i", { className: "fas fa-search" }), " Aplicar filtros"
            )
          )
        )
      )
    );
  }.bind(this);

  // Aviso de disponible presupuestal. INFORMATIVO: nunca deshabilita Guardar.
  // Un gasto que excede el cupo se guarda igual y queda marcado como "Excedido"
  // (§2.1); bloquearlo aqui seria un defecto, no una mejora.
  renderBudgetHint = function() {
    var a = this.state.budgetAvailability;
    if (!a || a.loading || a.error) return null;

    if (!a.has_budget) {
      return React.createElement("div", { className: "cm-field-hint", "data-testid": "expense-budget-none" },
        "Esta persona no tiene presupuesto asignado en este centro de costos.");
    }

    var disponible = parseFloat(a.available || 0);
    var valor = parseFloat(this.state.form.invoice_value || 0);

    if (valor <= disponible) {
      return React.createElement("div", { className: "cm-field-hint", "data-testid": "expense-budget-ok" },
        "Disponible: ",
        React.createElement(NumberFormat, { value: disponible, displayType: "text", thousandSeparator: true, prefix: "$" }));
    }

    return React.createElement("div", { className: "cm-alert cm-alert-warning", "data-testid": "expense-budget-warning" },
      "Este gasto excede el disponible en ",
      React.createElement(NumberFormat, { value: valor - disponible, displayType: "text", thousandSeparator: true, prefix: "$" }),
      ". Se guardará marcado como ",
      React.createElement("strong", null, "Excedido"), ".");
  }.bind(this);

  // Estados de la consulta de TRM. Un fallo es ADVERTENCIA, no bloqueo: la
  // persona escribe la tasa a mano y `exchange_rate_source` pasa a "manual".
  renderRateStatus = function() {
    var e = this.state.exchange || EXCHANGE_VACIO;
    var f = this.state.form;

    // EL ERROR VA PRIMERO. Con la tasa escrita a mano, `exchange_rate_source` es
    // "manual", y esa rama devolvia antes de llegar aqui: el aviso de por que
    // fallo la consulta quedaba tapado por el texto "Tasa ingresada manualmente"
    // y el usuario no veia nada al pulsar el boton.
    if (e.status === "error") {
      return React.createElement("div", { className: "cm-alert cm-alert-warning", "data-testid": "expense-rate-error" }, e.message);
    }
    if (e.status === "loading") {
      return React.createElement("div", { className: "cm-field-hint", "data-testid": "expense-rate-loading" },
        React.createElement("i", { className: "fa fa-spinner fa-spin" }), " Consultando la tasa…");
    }
    if (f.exchange_rate_source === "manual") {
      return React.createElement("div", { className: "cm-field-hint" }, "Tasa ingresada manualmente");
    }
    if (e.status === "ok" && e.rate_date !== e.requested_date) {
      return React.createElement("div", { className: "cm-alert cm-alert-warning", "data-testid": "expense-rate-shifted" },
        "No hay tasa para el " + e.requested_date + "; se aplicó la del " + e.rate_date + ".");
    }
    if (e.status === "ok") {
      return React.createElement("div", { className: "cm-field-hint", "data-testid": "expense-rate-ok" },
        "Tasa de " + e.rate_date + " (" + e.source + ")");
    }
    return null;
  }.bind(this);

  renderForeignBlock = function() {
    var self = this;
    var f = this.state.form;
    if (!f || !f.currency || f.currency === "COP") return null;

    return React.createElement("div", { className: "cm-budget-foreign", "data-testid": "expense-foreign-block" },
      React.createElement("div", { className: "cm-form-grid-2" },
        React.createElement("div", { className: "cm-form-group" },
          React.createElement("label", { className: "cm-label" },
            "Valor en " + f.currency),
          React.createElement(NumberFormat, { name: "foreign_value", thousandSeparator: true, className: "cm-input",
            value: f.foreign_value || "", onChange: self.handleFormChangeForeignMoney, placeholder: "0",
            "data-testid": "expense-foreign-value" })
        ),
        React.createElement("div", { className: "cm-form-group" },
          React.createElement("label", { className: "cm-label" },
            "IVA en " + f.currency),
          React.createElement(NumberFormat, { name: "foreign_tax", thousandSeparator: true, className: "cm-input",
            value: f.foreign_tax || "", onChange: self.handleFormChangeForeignMoney, placeholder: "0",
            "data-testid": "expense-foreign-tax" })
        ),
        React.createElement("div", { className: "cm-form-group" },
          React.createElement("label", { className: "cm-label" },
            "Total en " + f.currency),
          React.createElement(NumberFormat, { thousandSeparator: true, className: "cm-input", disabled: true,
            style: { background: "#e9ecef" }, value: f.foreign_total || "",
            "data-testid": "expense-foreign-total" })
        ),
        React.createElement("div", { className: "cm-form-group" },
          React.createElement("label", { className: "cm-label" },
            "TRM"),
          React.createElement(NumberFormat, { name: "exchange_rate", thousandSeparator: true, decimalScale: 6,
            className: "cm-input", value: f.exchange_rate || "", onChange: self.handleChangeRate, placeholder: "0",
            "data-testid": "expense-rate" })
        ),
        React.createElement("div", { className: "cm-form-group" },
          React.createElement("label", { className: "cm-label" },
            "Fecha de la tasa"),
          React.createElement("input", { type: "date", name: "exchange_rate_date", className: "cm-input",
            disabled: true, readOnly: true, style: { background: "#e9ecef" }, value: f.exchange_rate_date || "",
            "data-testid": "expense-rate-date" })
        ),
        React.createElement("div", { className: "cm-form-group" },
          React.createElement("label", { className: "cm-label" }, " "),
          React.createElement("button", { type: "button", className: "cm-btn cm-btn-outline cm-btn-sm",
            onClick: self.handleRecalcular, "data-testid": "expense-fetch-rate-btn" },
            React.createElement("i", { className: "fa fa-refresh" }), " Recalcular")
        )
      ),

      self.renderRateStatus(),

      React.createElement("div", { className: "cm-info-row", "data-testid": "expense-cop-preview" },
        React.createElement("span", { className: "cm-info-label" }, "Equivalente en COP"),
        React.createElement(NumberFormat, { value: f.invoice_total || 0, displayType: "text",
          thousandSeparator: true, prefix: "$", className: "cm-info-value" })
      ),

      // Marcar esta casilla escribe LAS DOS banderas. Sin `cop_manual_override`
      // el servidor recalcula el COP en cada save y pisa el ajuste en silencio.
      React.createElement("label", { className: "cm-label", style: { marginTop: 8 } },
        React.createElement("input", { type: "checkbox", checked: !!f.cop_manual_override,
          onChange: self.handleToggleCopManual, "data-testid": "expense-cop-manual-toggle" }),
        " Ajusté el valor en COP a mano (no recalcular)")
    );
  }.bind(this);

  renderExtraction = function() {
    var self = this;
    // KILL SWITCH: sin el flag el boton no se pinta y el formulario se llena
    // a mano.
    if (!receiptExtractionEnabled()) return null;

    var x = this.state.extraction || EXTRACTION_VACIA;

    // TODOS los avisos van a UNA sola lista. Antes cada tipo abria su propia
    // caja de alerta con su propio borde y su propio margen de 16px: una
    // extraccion normal (un warning de tasa + dos reglas + tres campos dudosos)
    // apilaba SEIS cajas debajo del boton y empujaba el formulario fuera de la
    // pantalla, justo cuando lo que hay que hacer es revisar los campos de
    // arriba.
    var avisos = [];

    (x.warnings || []).forEach(function(w, i) {
      avisos.push({ key: "w" + i, tono: "warn", texto: w });
    });

    // VEREDICTO DEL AGENTE sobre las instrucciones de la regla. Va primero en
    // intencion aunque se pinte aqui: es lo unico de esta lista que puede
    // impedir guardar.
    var pol = x.policy || {};
    var vigente = pol.compliant === false ? hallazgosVigentes(pol, this.state.form.type_identification_id) : null;
    // SOLO SI FRENA (2026-10-17): lo que encuentra la IA por una regla que deja
    // guardar no se muestra, igual que al guardar.
    if (vigente && vigente.mostrar && vigente.frena) {
      var cabeza = "Incumple las instrucciones de la regla de gasto y no se podrá guardar:";
      avisos.push({ key: "pol", tono: "warn", texto: cabeza, testid: "expense-policy-verdict" });
      vigente.hallazgos.forEach(function(h, i) {
        avisos.push({ key: "pf" + i, tono: "warn", texto: "— " + h.message, testid: "expense-policy-finding-" + i });
      });
    }

    // SOLO la franja 0,60–0,80. Por debajo de 0,60 el servidor ya manda su
    // propio aviso redactado (CONFIDENCE_WARN en receipt_extraction_service.rb),
    // asi que pintar todo lo menor que 0,80 mostraba el MISMO campo dos veces:
    // una con texto entendible y otra con la clave cruda ("provider_name").
    Object.keys(x.confidence || {}).forEach(function(k) {
      var c = x.confidence[k];
      if (!(c >= 0.6 && c < 0.8)) return;
      avisos.push({
        key: "c" + k,
        tono: "info",
        texto: "Revise " + (ETIQUETAS_EXTRACCION[k] || k) + ": la lectura no es del todo segura.",
        testid: "expense-low-confidence-" + k,
      });
    });

    return React.createElement("div", { className: "cm-extract" },
      React.createElement("button", {
        type: "button", className: "cm-btn cm-btn-pastel cm-btn-pastel--blue cm-btn-sm",
        onClick: self.handleExtract,
        disabled: !self.state.receiptFileName || x.status === "loading",
        "data-testid": "expense-extract-btn",
      }, React.createElement("i", { className: "fa fa-magic" }), " Extraer datos del comprobante"),

      // La barra indeterminada existe porque la espera llega a 20 s y un spinner
      // quieto tanto rato se lee como "se colgo".
      x.status === "loading"
        ? React.createElement("div", { className: "cm-extract-progress", "data-testid": "expense-extract-loading" },
            React.createElement("div", { className: "cm-extract-progress-bar" }),
            React.createElement("span", { className: "cm-extract-progress-text" },
              React.createElement("i", { className: "fa fa-spinner fa-spin" }),
              " Leyendo el comprobante… Esto puede tardar hasta 20 segundos."))
        : null,

      x.status === "error"
        ? React.createElement("div", { className: "cm-extract-note cm-extract-note--warn", "data-testid": "expense-extract-error" },
            React.createElement("i", { className: "fa fa-exclamation-triangle cm-extract-note-icon" }),
            React.createElement("span", null, (x.message || "") + " Complete los datos manualmente."))
        : null,

      x.status === "done"
        ? React.createElement("div", { className: "cm-extract-result" },
            React.createElement("div", { className: "cm-extract-head", "data-testid": "expense-extract-done" },
              React.createElement("i", { className: "fa fa-check-circle cm-extract-head-icon" }),
              React.createElement("span", null,
                "Se precargaron " + x.filled.length + " campos. ",
                React.createElement("strong", null, "Revíselos antes de guardar."))),

            avisos.length > 0
              ? React.createElement("ul", { className: "cm-extract-notes", "data-testid": "expense-extract-warnings" },
                  avisos.map(function(a) {
                    return React.createElement("li", {
                        key: a.key,
                        className: "cm-extract-note cm-extract-note--" + a.tono,
                        "data-testid": a.testid,
                      },
                      React.createElement("i", {
                        className: "cm-extract-note-icon fa " + (a.tono === "info" ? "fa-info-circle" : "fa-exclamation-triangle"),
                      }),
                      React.createElement("span", null, a.texto));
                  }))
              : null)
        : null
    );
  }.bind(this);

  renderReceiptBlock = function() {
    var self = this;

    return React.createElement("div", { className: "cm-form-group cm-form-group--receipt", style: { marginTop: 0 } },
      React.createElement("label", { className: "cm-label" },
        "Comprobante",
        // El asterisco sigue al flag EXPENSE_RECEIPT_REQUIRED: marcarlo mientras
        // el flag esta apagado seria mentirle a la persona.
        self.comprobanteObligatorio(self.state.form.type_identification_id)
          ? React.createElement("span", { className: "cm-required" }, " *")
          : ((self.props.estados || {}).receipt_required
              ? React.createElement("span", { className: "cm-field-hint", "data-testid": "expense-receipt-optional" }, " (opcional para viáticos)")
              : null)),

      // ZONA DE ARRASTRE. Reemplaza al `<input type="file">` nativo, que en cada
      // navegador se pinta distinto ("Choose File" en ingles aunque la app este
      // en espanol) y no admite soltar el archivo encima, que es como llega la
      // foto de la factura desde el escritorio.
      //
      // El input sigue existiendo y conserva su data-testid: esta oculto por CSS
      // pero presente en el DOM, que es lo unico que necesitan `setInputFiles`
      // de Playwright y los lectores de pantalla.
      React.createElement("div", {
          className: "cm-dropzone"
            + (self.state.receiptDragging ? " cm-dropzone--active" : "")
            + (self.state.receiptFileName ? " cm-dropzone--filled" : ""),
          onDragOver: self.handleReceiptDragOver,
          onDragEnter: self.handleReceiptDragOver,
          onDragLeave: self.handleReceiptDragLeave,
          onDrop: self.handleReceiptDrop,
          onClick: self.abrirSelectorComprobante,
          onKeyDown: function(e) {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); self.abrirSelectorComprobante(); }
          },
          role: "button",
          tabIndex: 0,
          "data-testid": "expense-receipt-dropzone",
        },
        React.createElement("input", {
          type: "file", className: "cm-dropzone-input",
          ref: function(el) { self._receiptInput = el; },
          accept: ".jpg,.jpeg,.png,.webp,.heic,.pdf,image/*,application/pdf",
          onChange: self.handleFileReceipt,
          // Sin esto el clic del input vuelve a burbujear al div, que llama otra
          // vez a input.click(): el selector de archivos se abre en bucle.
          onClick: function(e) { e.stopPropagation(); },
          "data-testid": "expense-receipt-input",
        }),

        self.state.receiptFileName
          ? React.createElement("div", { className: "cm-dropzone-file", "data-testid": "expense-receipt-name" },
              React.createElement("i", { className: "fa fa-file-invoice cm-dropzone-file-icon" }),
              React.createElement("div", { className: "cm-dropzone-file-body" },
                React.createElement("span", { className: "cm-dropzone-file-name" }, self.state.receiptFileName),
                React.createElement("span", { className: "cm-dropzone-file-meta" },
                  pesoLegible(self.state.receiptSize) + " · Haga clic o suelte otro archivo para reemplazarlo")),
              React.createElement("button", {
                type: "button", className: "cm-dropzone-clear", title: "Quitar el archivo",
                onClick: function(e) { e.stopPropagation(); self.aceptarComprobante(null); },
                "data-testid": "expense-receipt-clear",
              }, React.createElement("i", { className: "fa fa-times" })))
          : React.createElement("div", { className: "cm-dropzone-empty" },
              React.createElement("span", { className: "cm-dropzone-badge" },
                React.createElement("i", { className: "fa fa-cloud-upload-alt cm-dropzone-icon" })),
              React.createElement("div", { className: "cm-dropzone-body" },
                React.createElement("span", { className: "cm-dropzone-title" },
                  "Arrastre aquí su comprobante"),
                React.createElement("span", { className: "cm-dropzone-link" },
                  "o haga clic para seleccionar")),
              React.createElement("div", { className: "cm-dropzone-meta" },
                React.createElement("span", null, "JPG, PNG, WEBP, HEIC o PDF"),
                React.createElement("span", null, "hasta 20 MB")))
      ),

      self.state.receiptExistingId
        ? React.createElement("div", { className: "cm-field-hint", style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
            // El destino es SIEMPRE /download_receipt/report_expenses/:id: la
            // URL firmada de S3 caduca a los 600 s.
            React.createElement("a", { href: "/download_receipt/report_expenses/" + self.state.receiptExistingId, target: "_blank", rel: "noopener noreferrer" },
              React.createElement("i", { className: "fa fa-download" }), " Ver comprobante actual"),
            React.createElement("button", { type: "button", className: "cm-btn cm-btn-outline cm-btn-sm",
              // La pista es el archivo recien elegido si lo hay, y si no la URL
              // del ya guardado: al editar, `receiptFileName` esta vacio.
              onClick: function() { self.abrirComprobante(self.state.receiptExistingId, self.state.receiptFileName || self.state.receiptExistingUrl); } },
              React.createElement("i", { className: "fa fa-eye" }), " Previsualizar"),
            self.state.modeEdit
              ? React.createElement("button", { type: "button", className: "cm-btn cm-btn-outline cm-btn-sm",
                  onClick: self.handleDeleteReceipt, "data-testid": "expense-receipt-delete" },
                  React.createElement("i", { className: "fa fa-trash" }), " Quitar")
              : null
          )
        : null,

      self.state.receiptError
        ? React.createElement("div", { className: "cm-alert cm-alert-danger", "data-testid": "expense-receipt-error" }, self.state.receiptError)
        : null,

      self.renderExtraction()
    );
  }.bind(this);

  // Modal de previsualizacion. SIEMPRE contra /download_receipt/report_expenses/:id,
  // nunca contra la URL firmada. Si no carga (403, archivo borrado) degrada a un
  // aviso: la previsualizacion nunca bloquea la descarga.
  renderReceiptPreview = function() {
    var self = this;
    var p = this.state.receiptPreview;
    if (!p || !p.open) return null;

    // `?disposition=inline` para PINTAR. Sin el, el endpoint responde con
    // Content-Disposition: attachment y la vista previa sale VACIA: ese era el
    // sintoma. La descarga usa la misma ruta sin el parametro, donde el default
    // sigue forzando el guardado.
    var src = "/download_receipt/report_expenses/" + p.id + "?disposition=inline";
    var descarga = "/download_receipt/report_expenses/" + p.id;


    return React.createElement(Modal, { isOpen: true, toggle: self.closeReceiptPreview, className: "modal-dialog-centered modal-lg" },
      React.createElement("div", { className: "cm-modal-container" },
        React.createElement("div", { className: "cm-modal-header" },
          React.createElement("div", { className: "cm-modal-header-content" },
            React.createElement("div", { className: "cm-modal-icon" }, React.createElement("i", { className: "fas fa-file" })),
            React.createElement("div", null,
              React.createElement("h2", { className: "cm-modal-title" }, "Comprobante del gasto #" + p.id),
              React.createElement("p", { className: "cm-modal-subtitle" }, "Previsualización del archivo adjunto")
            )
          ),
          React.createElement("button", { type: "button", className: "cm-modal-close", onClick: self.closeReceiptPreview },
            React.createElement("i", { className: "fa fa-times" })
          )
        ),
        React.createElement(ModalBody, { className: "cm-modal-body" },
          React.createElement("div", { "data-testid": "receipt-preview-modal" },
            self.state.receiptPreviewError
              ? React.createElement("div", { className: "cm-alert cm-alert-warning" },
                  React.createElement("i", { className: "fa fa-exclamation-triangle" }),
                  " No se pudo previsualizar el comprobante. ",
                  React.createElement("a", { href: descarga, target: "_blank", rel: "noopener noreferrer" }, "Descargarlo"),
                  ".")
              // Solo <img>: `abrirComprobante` ya desvio a descarga todo lo que
              // no sea imagen, asi que el <iframe> para PDF sobra. Era ademas
              // el que dejaba el modal en blanco.
              : React.createElement("img", { src: src, alt: "Comprobante",
                  style: { maxWidth: "100%", display: "block", margin: "0 auto" },
                  onError: function() { self.setState({ receiptPreviewError: true }); } })
          )
        ),
        React.createElement("div", { className: "cm-modal-footer", style: { justifyContent: "space-between" } },
          // VUELVE "Descargar". El comentario anterior era cierto mientras la
          // fila tenia dos controles —un enlace de descarga y un ojo—; ahora
          // tiene uno solo, asi que este modal es el UNICO sitio desde donde se
          // puede guardar la imagen.
          //
          // Sin `?disposition=inline`: el default del endpoint fuerza el
          // guardado, que es justo lo que se quiere aqui.
          React.createElement("a", {
            href: descarga, target: "_blank", rel: "noopener noreferrer",
            className: "cm-btn cm-btn-outline",
            "data-testid": "receipt-preview-download",
          }, React.createElement("i", { className: "fa fa-download" }), " Descargar"),
          React.createElement("button", { type: "button", className: "cm-btn cm-btn-submit", onClick: self.closeReceiptPreview },
            React.createElement("i", { className: "fa fa-times" }), " Cerrar")
        )
      )
    );
  }.bind(this);


  // La barra del lote encima del formulario: el avance y un chip por
  // comprobante con su estado. Se puede saltar a cualquiera que no este
  // guardado.
  renderBarraDelLote = function() {
    var self = this;
    var lote = this.state.lote;
    if (!lote) return null;
    var total = lote.items.length;
    var guardados = lote.items.filter(function(i) { return i.estado === "guardado"; }).length;
    var omitidos = lote.items.filter(function(i) { return i.estado === "omitido"; }).length;
    var avance = Math.round(((guardados + omitidos) / total) * 100);

    var ICONO = { cola: "far fa-clock", leyendo: "fas fa-spinner fa-spin", listo: "far fa-file-alt",
                  guardado: "fas fa-check-circle", omitido: "fas fa-forward" };
    var COLOR = { guardado: "#155724", omitido: "#6c757d" };

    return React.createElement("div", { className: "cm-batch-bar", "data-testid": "batch-bar", style: { marginBottom: 14 } },
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 } },
        React.createElement("strong", { "data-testid": "batch-progress" }, guardados + " de " + total + " guardados"),
        omitidos ? React.createElement("span", { className: "cm-hint" }, omitidos + " omitido" + (omitidos === 1 ? "" : "s")) : null
      ),
      React.createElement("div", { style: { height: 6, background: "#e9ecef", borderRadius: 4, overflow: "hidden" } },
        React.createElement("div", { style: { width: avance + "%", height: "100%", background: "#28a745", transition: "width .3s" } })
      ),
      React.createElement("div", { style: { display: "flex", gap: 6, overflowX: "auto", padding: "8px 0 2px" } },
        lote.items.map(function(it, idx) {
          var actual = idx === lote.actual;
          var titulo = it.name + (it.error ? " — " + it.error : "");
          return React.createElement("button", {
            key: it.id, type: "button", title: titulo,
            onClick: function() { if (!actual) self.irAItemDelLote(idx); },
            disabled: it.estado === "guardado",
            "data-testid": "batch-item-" + idx,
            "data-estado": it.estado,
            style: {
              flex: "0 0 auto", maxWidth: 170, display: "inline-flex", alignItems: "center", gap: 5,
              padding: "3px 9px", borderRadius: 999, fontSize: 12, cursor: it.estado === "guardado" ? "default" : "pointer",
              border: actual ? "2px solid #f5a623" : "1px solid #e2e5ea",
              background: it.estado === "guardado" ? "#d4edda" : it.error ? "#fdf2f3" : "#fff",
              color: COLOR[it.estado] || (it.error ? "#c82333" : "#333"),
            },
          },
            React.createElement("i", { className: it.error && it.estado !== "guardado" ? "fas fa-exclamation-circle" : ICONO[it.estado] }),
            React.createElement("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, it.name)
          );
        })
      )
    );
  }.bind(this);

  // El inicio y el resumen del lote.
  renderModalDelLote = function() {
    var self = this;
    var lote = this.state.lote;
    var esInicio = lote.paso === "inicio";
    var guardados = lote.items.filter(function(i) { return i.estado === "guardado"; });
    var sinRegistrar = lote.items.filter(function(i) { return i.estado !== "guardado"; });

    var cuerpo = esInicio ? this.renderInicioDelLote() : React.createElement("div", { "data-testid": "batch-summary" },
      React.createElement("div", { className: "cm-alert cm-alert-success", style: { marginBottom: 12 } },
        React.createElement("i", { className: "fas fa-check-circle" }),
        " Se registraron ", React.createElement("strong", { "data-testid": "batch-summary-saved" }, guardados.length),
        " de " + lote.items.length + " comprobantes."
      ),
      sinRegistrar.length ? React.createElement("div", null,
        React.createElement("p", { className: "cm-label", style: { marginBottom: 6 } }, "Quedaron sin registrar:"),
        React.createElement("ul", { style: { paddingLeft: 18, margin: 0 } },
          sinRegistrar.map(function(it) {
            var idx = lote.items.indexOf(it);
            return React.createElement("li", { key: it.id, style: { marginBottom: 4 } },
              it.name, it.error ? React.createElement("span", { className: "cm-hint" }, " — " + it.error) : null, " ",
              React.createElement("button", { type: "button", className: "cm-btn cm-btn-outline", style: { padding: "1px 8px", fontSize: 12 },
                                              onClick: function() { self.irAItemDelLote(idx); } }, "Registrar")
            );
          })
        )
      ) : null,
      lote.ignorados.length ? React.createElement("div", { style: { marginTop: 12 } },
        React.createElement("p", { className: "cm-label", style: { marginBottom: 6 } }, "No se cargaron:"),
        React.createElement("ul", { style: { paddingLeft: 18, margin: 0 } },
          lote.ignorados.map(function(i, k) {
            return React.createElement("li", { key: k }, i.name, React.createElement("span", { className: "cm-hint" }, " — " + i.motivo));
          })
        )
      ) : null
    );

    return React.createElement(Modal, { isOpen: true, toggle: self.closeModal, className: "modal-dialog-centered modal-lg", backdrop: "static" },
      React.createElement("div", { className: "cm-modal-container", "data-testid": "batch-modal" },
        React.createElement("div", { className: "cm-modal-header" },
          React.createElement("div", { className: "cm-modal-header-content" },
            React.createElement("div", null,
              React.createElement("h2", { className: "cm-modal-title" }, esInicio ? "Subir varios comprobantes" : "Lote terminado"),
              React.createElement("p", { className: "cm-modal-subtitle" },
                esInicio ? lote.items.length + " comprobante" + (lote.items.length === 1 ? "" : "s") + " para registrar"
                         : "Así quedó el lote")
            )
          ),
          React.createElement("button", { type: "button", className: "cm-modal-close", onClick: self.closeModal },
            React.createElement("i", { className: "fa fa-times" })
          )
        ),
        React.createElement(ModalBody, { className: "cm-modal-body cm-modal-scroll" }, cuerpo),
        React.createElement("div", { className: "cm-modal-footer" },
          React.createElement("button", { type: "button", className: "cm-btn cm-btn-cancel", onClick: self.closeModal },
            esInicio ? "Cancelar" : "Cerrar"
          ),
          esInicio ? React.createElement("button", { type: "button", className: "cm-btn cm-btn-submit", onClick: self.empezarLote,
                                                     "data-testid": "batch-start" },
            "Empezar"
          ) : null
        )
      )
    );
  }.bind(this);

  // Los archivos que entraron, los que no y por que, y los datos comunes. Los
  // datos son los MISMOS campos del formulario (mismo estado): lo que se elija
  // aqui llega puesto en cada comprobante, y se puede cambiar en cualquiera.
  renderInicioDelLote = function() {
    var self = this;
    var lote = this.state.lote;
    var form = this.state.form;

    var campo = function(label, testid, select) {
      return React.createElement("div", { className: "cm-form-group" },
        React.createElement("label", { className: "cm-label" }, label),
        React.createElement("div", { "data-testid": testid }, select)
      );
    };

    return React.createElement("div", { "data-testid": "batch-start-step" },
      React.createElement("div", { className: "cm-alert cm-alert-info", style: { marginBottom: 12 } },
        React.createElement("i", { className: "fas fa-info-circle" }),
        " Se abrirá el formulario de crear gasto con cada comprobante ya leído. Revise, complete lo que falte y guarde: ",
        "pasa solo al siguiente. Lo que elija aquí abajo queda puesto en todos (se puede cambiar en cada uno)."
      ),
      lote.ignorados.length ? React.createElement("div", { className: "cm-alert cm-alert-warning", style: { marginBottom: 12 }, "data-testid": "batch-ignored" },
        React.createElement("strong", null, lote.ignorados.length + " archivo" + (lote.ignorados.length === 1 ? "" : "s") + " no se cargaron:"),
        React.createElement("ul", { style: { margin: "6px 0 0", paddingLeft: 18 } },
          lote.ignorados.map(function(i, k) { return React.createElement("li", { key: k }, i.name + ": " + i.motivo); })
        )
      ) : null,
      React.createElement("div", { className: "cm-form-grid-2" },
        campo("Centro de costo (3 letras)", "batch-cost-center-select", React.createElement(Select, {
          options: self.state.formCostCenterOptions, value: self.state.selectedCostCenter,
          onChange: function(opt) { self.setState({ selectedCostCenter: opt, form: Object.assign({}, form, { cost_center_id: opt ? opt.value : "" }) }); },
          onInputChange: self.handleFormCostCenterSearch, isLoading: self.state.formCostCenterLoading,
          placeholder: "Buscar centro de costo...", noOptionsMessage: function() { return "Escribe al menos 3 letras"; },
          isClearable: true, styles: selectStyles, menuPortalTarget: document.body,
        })),
        campo("Responsable", "batch-user-select", React.createElement(Select, {
          options: self.userOptions, value: self.state.selectedUser,
          onChange: function(opt) { self.setState({ selectedUser: opt, form: Object.assign({}, form, { user_invoice_id: opt ? opt.value : "" }) }); },
          placeholder: "Seleccionar...", styles: selectStyles, menuPortalTarget: document.body,
        })),
        campo("Tipo", "batch-type-select", React.createElement(Select, {
          options: self.typeOptions, value: self.state.selectedType,
          onChange: function(opt) { self.setState({ selectedType: opt, form: Object.assign({}, form, { type_identification_id: opt ? opt.value : "" }) }); },
          placeholder: "Varía en cada uno (opcional)", isClearable: true, styles: selectStyles, menuPortalTarget: document.body,
        })),
        campo("Medio de pago", "batch-payment-select", React.createElement(Select, {
          options: self.paymentOptions, value: self.state.selectedPayment,
          onChange: function(opt) { self.setState({ selectedPayment: opt, form: Object.assign({}, form, { payment_type_id: opt ? opt.value : "" }) }); },
          placeholder: "Varía en cada uno (opcional)", isClearable: true, styles: selectStyles, menuPortalTarget: document.body,
        }))
      ),
      React.createElement("p", { className: "cm-hint", style: { margin: "4px 0 0" } },
        "Cada comprobante se lee con la inteligencia artificial (una lectura por comprobante). Máximo " + MAX_COMPROBANTES + " por lote."
      )
    );
  }.bind(this);

  renderModal = function() {
    var self = this;
    var form = this.state.form;
    var isEdit = this.state.modeEdit;
    var title = isEdit ? "Editar Gasto" : "Nuevo Gasto";
    var subtitle = "Complete los campos para gestionar el gasto";
    var hasError = function(field) { return self.state.ErrorValues === false && !form[field]; };

    if (!this.state.modal) return null;

    // CARGA DE VARIOS COMPROBANTES: el inicio y el resumen tienen su propio
    // modal; el recorrido usa este mismo formulario.
    var lote = this.state.lote;
    if (lote && lote.paso !== "revisar") return this.renderModalDelLote();
    if (lote) {
      title = "Comprobante " + (lote.actual + 1) + " de " + lote.items.length;
      subtitle = lote.items[lote.actual].name;
    }

    return React.createElement(Modal, { isOpen: true, toggle: self.closeModal, className: "modal-dialog-centered modal-lg", backdrop: "static" },
      React.createElement("div", { className: "cm-modal-container" },
        React.createElement("div", { className: "cm-modal-header" },
          React.createElement("div", { className: "cm-modal-header-content" },
            React.createElement("div", null,
              React.createElement("h2", { className: "cm-modal-title", "data-testid": lote ? "batch-title" : undefined }, title),
              React.createElement("p", { className: "cm-modal-subtitle" }, subtitle)
            )
          ),
          React.createElement("button", { type: "button", className: "cm-modal-close", onClick: self.closeModal },
            React.createElement("i", { className: "fa fa-times" })
          )
        ),
        React.createElement("form", null,
          React.createElement(ModalBody, { className: "cm-modal-body cm-modal-scroll" },
            self.renderBarraDelLote(),
            // EL TIPO VA PRIMERO, ANTES DEL COMPROBANTE (2026-10-16). Decide dos
            // cosas que el archivo necesita saber: si el comprobante es
            // obligatorio (un viatico no lo exige) y que reglas juzga el agente
            // al extraer (sin tipo juzga las de TODOS los tipos de la persona y
            // marca de mas). Elegido al final, una prohibicion se veia despues
            // de haber subido el archivo.
            React.createElement("div", { className: "cm-form-group" },
              React.createElement("label", { className: "cm-label" },
                "Tipo"
              ),
              // Envoltorio con data-testid: react-select no lo propaga al DOM,
              // y la prueba E2E de las prohibiciones elige el tipo por aqui.
              React.createElement("div", { "data-testid": "expense-type-select" },
              React.createElement(Select, {
                options: self.typeOptions,
                value: self.state.selectedType,
                // Al pasar a viaticos el aviso de "comprobante obligatorio"
                // deja de ser cierto; cualquier otro error del archivo se queda.
                onChange: function(opt) {
                  var tipoId = opt ? opt.value : "";
                  var responsable = self.state.selectedUser ? self.state.selectedUser.label : "";
                  self.setState({
                    selectedType: opt,
                    receiptError: self.state.receiptError === AVISO_COMPROBANTE ? null : self.state.receiptError,
                    form: Object.assign({}, form, {
                      type_identification_id: tipoId,
                      // El nombre propuesto entra y sale con el tipo: al dejar
                      // de ser viatico se limpia, o quedaria una persona en el
                      // campo de un gasto que ya factura un proveedor.
                      invoice_name: self.nombreDeViatico(form, tipoId, responsable, responsable),
                    }),
                  });
                },
                placeholder: "Seleccionar tipo...",
                isClearable: true,
                styles: selectStyles,
                menuPortalTarget: document.body,
              })),
              self.state.selectedType && self.state.selectedType.label ? React.createElement("div", {
                className: "cm-field-hint cm-field-hint--copyable",
                onClick: function() { navigator.clipboard.writeText(self.state.selectedType.label); self.setState({ copyMessage: "Tipo copiado" }); setTimeout(function() { self.setState({ copyMessage: "" }); }, 2000); }
              }, self.state.selectedType.label) : null
            ),

            // EL COMPROBANTE VA JUSTO DESPUES DEL TIPO y antes de los datos. Es
            // el campo que manda: al adjuntarlo se evaluan las reglas contra lo
            // que ya haya en el formulario, y con EXPENSE_RECEIPT_REQUIRED
            // encendido sin el no se guarda. Pedirlo de ultimo invitaba a llenar
            // diez campos para enterarse al final de que la factura no servia.
            self.renderReceiptBlock(),

            // El divider va JUSTO DEBAJO DEL COMPROBANTE y no al final del
            // formulario. Separa las dos mitades del modal —adjuntar el archivo
            // arriba, escribir los datos abajo—, que es la unica division real
            // que hay aqui. Al final no separaba nada: quedaba pegado a una
            // alerta que casi nunca se pinta.
            React.createElement("hr", { className: "cm-divider" }),

            self.state.copyMessage ? React.createElement("div", { className: "alert alert-warning", style: { marginBottom: "12px" } }, self.state.copyMessage) : null,
            React.createElement("div", { className: "cm-form-grid-2" },
              // Centro de costo. El data-testid va en un DIV envolvente:
              // react-select no propaga atributos sueltos al DOM.
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  "Centro de costo ", React.createElement("span", { className: "cm-hint" }, "(3 letras)")
                ),
                React.createElement("div", { "data-testid": "expense-cost-center-select" },
                  React.createElement(Select, {
                    options: self.state.formCostCenterOptions,
                    value: self.state.selectedCostCenter,
                    onChange: function(opt) {
                      self.setState({ selectedCostCenter: opt, form: Object.assign({}, form, { cost_center_id: opt ? opt.value : "" }) },
                                    self.refreshBudgetAvailability);
                    },
                    onInputChange: self.handleFormCostCenterSearch,
                    isLoading: self.state.formCostCenterLoading,
                    placeholder: "Buscar centro de costo...",
                    noOptionsMessage: function() { return "Escribe al menos 3 letras"; },
                    styles: selectStyles,
                    menuPortalTarget: document.body,
                    className: hasError("cost_center_id") ? "cm-select-error" : "",
                  })
                )
              ),
              // Usuario
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  "Responsable"
                ),
                React.createElement("div", { "data-testid": "expense-user-select" },
                  React.createElement(Select, {
                    options: self.userOptions,
                    value: self.state.selectedUser,
                    onChange: function(opt) {
                      var anterior = self.state.selectedUser ? self.state.selectedUser.label : "";
                      self.setState({
                        selectedUser: opt,
                        form: Object.assign({}, form, {
                          user_invoice_id: opt ? opt.value : "",
                          // Si el gasto es viatico, cambiar de responsable cambia
                          // tambien el nombre propuesto: sin esto quedaria a
                          // nombre de la persona anterior.
                          invoice_name: self.nombreDeViatico(form, form.type_identification_id, opt ? opt.label : "", anterior),
                        }),
                      }, function() {
                        self.loadBudgetAvailability(opt ? opt.value : null, self.state.modeEdit ? self.state.editId : null);
                      });
                    },
                    placeholder: "Seleccionar...",
                    styles: selectStyles,
                    menuPortalTarget: document.body,
                    className: hasError("user_invoice_id") ? "cm-select-error" : "",
                  })
                ),
                self.renderBudgetHint()
              ),
              // Moneda. Visible SIEMPRE, tambien en COP: es lo que le dice al
              // usuario en que moneda esta el gasto. El sub-bloque extranjero es
              // el condicional.
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  "Moneda"
                ),
                React.createElement("div", { "data-testid": "expense-currency-select" },
                  React.createElement(Select, {
                    options: self.currencyOptions,
                    value: self.state.selectedCurrency || self.currencyOption(form.currency || "COP"),
                    onChange: self.handleChangeCurrency,
                    placeholder: "Moneda...",
                    styles: selectStyles,
                    menuPortalTarget: document.body,
                  })
                )
              ),
              // Nombre. En un viatico es el de la PERSONA, no el de un
              // proveedor: lo dice el placeholder, que cambia con el tipo. La
              // etiqueta se queda en "Nombre" a secas para no descuadrar la
              // rejilla de dos columnas con un titulo el doble de largo.
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  "Nombre"
                ),
                React.createElement("input", { type: "text", name: "invoice_name", value: form.invoice_name || "", onChange: self.handleFormChange, placeholder: self.esViatico(form.type_identification_id) ? "Nombre de quien recibe el viático" : "Nombre del proveedor o tercero", className: hasError("invoice_name") ? "cm-input cm-input-error" : "cm-input" })
              ),
              // Fecha
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  "Fecha de factura"
                ),
                React.createElement("input", { type: "date", name: "invoice_date", value: form.invoice_date || "", onChange: self.handleFormChange, className: hasError("invoice_date") ? "cm-input cm-input-error" : "cm-input" })
              ),
              // NIT/Cedula
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  "NIT / Cédula"
                ),
                React.createElement("input", { type: "text", name: "identification", value: form.identification || "", onChange: self.handleFormChange, placeholder: "NIT o cédula", className: "cm-input" })
              ),
              // # Factura
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  "# Factura"
                ),
                React.createElement("input", { type: "text", name: "invoice_number", value: form.invoice_number || "", onChange: self.handleFormChange, placeholder: "Número de factura", className: "cm-input" })
              ),
              // Medio de pago
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  "Medio de pago"
                ),
                React.createElement(Select, {
                  options: self.paymentOptions,
                  value: self.state.selectedPayment,
                  onChange: function(opt) { self.setState({ selectedPayment: opt, form: Object.assign({}, form, { payment_type_id: opt ? opt.value : "" }) }); },
                  placeholder: "Seleccionar...",
                  isClearable: true,
                  styles: selectStyles,
                  menuPortalTarget: document.body,
                }),
                self.state.selectedPayment && self.state.selectedPayment.label ? React.createElement("div", {
                  className: "cm-field-hint cm-field-hint--copyable",
                  onClick: function() { navigator.clipboard.writeText(self.state.selectedPayment.label); self.setState({ copyMessage: "Medio de pago copiado" }); setTimeout(function() { self.setState({ copyMessage: "" }); }, 2000); }
                }, self.state.selectedPayment.label) : null
              ),
              // Valor
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  "Valor"
                ),
                React.createElement(NumberFormat, { name: "invoice_value", thousandSeparator: true, prefix: "$", value: form.invoice_value || "", onChange: self.handleFormChangeMoney, placeholder: "$0", className: "cm-input" })
              ),
              // IVA
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  "IVA"
                ),
                React.createElement(NumberFormat, { name: "invoice_tax", thousandSeparator: true, prefix: "$", value: form.invoice_tax || "", onChange: self.handleFormChangeMoney, placeholder: "$0", className: "cm-input" })
              ),
              // Total
              React.createElement("div", { className: "cm-form-group" },
                React.createElement("label", { className: "cm-label" },
                  "Total"
                ),
                React.createElement(NumberFormat, { name: "invoice_total", thousandSeparator: true, prefix: "$", value: form.invoice_total || "", displayType: "input", className: "cm-input", disabled: true, style: { background: "#e9ecef" } })
              ),
              // Descripcion
              React.createElement("div", { className: "cm-form-group cm-full-width" },
                React.createElement("label", { className: "cm-label" },
                  "Descripción"
                ),
                React.createElement("textarea", { name: "description", rows: "3", value: form.description || "", onChange: self.handleFormChange, placeholder: "Descripción del gasto...", className: "cm-input", style: { resize: "vertical", minHeight: "80px" } })
              ),
              // Observaciones. Campo libre de quien REGISTRA el gasto: el
              // motivo de un rechazo no va aqui, va en su propio campo.
              React.createElement("div", { className: "cm-form-group cm-full-width" },
                React.createElement("label", { className: "cm-label" },
                  "Observaciones"
                ),
                React.createElement("textarea", { name: "observations", rows: "3", value: form.observations || "", onChange: self.handleFormChange, placeholder: "Observaciones del gasto...", className: "cm-input", style: { resize: "vertical", minHeight: "80px" } })
              )
            ),

            self.renderForeignBlock(),

            self.state.ErrorValues === false && React.createElement("div", { className: "cm-alert cm-alert-error" },
              React.createElement("i", { className: "fas fa-exclamation-circle" }),
              React.createElement("span", null, "Debe completar todos los campos requeridos")
            )
          ),
          React.createElement("div", { className: "cm-modal-footer" },
            React.createElement("button", { type: "button", className: "cm-btn cm-btn-cancel", onClick: self.closeModal },
              lote ? "Cerrar" : "Cancelar"
            ),
            // En el lote, saltar un comprobante sin registrarlo: queda en el
            // resumen como omitido y se puede volver a el.
            lote ? React.createElement("button", { type: "button", className: "cm-btn cm-btn-outline", onClick: self.omitirItemDelLote,
                                                   disabled: !!self.state.saving, "data-testid": "batch-skip" },
              "Omitir"
            ) : null,
            React.createElement("button", { type: "button", className: "cm-btn cm-btn-submit", onClick: self.handleSubmit, disabled: !!self.state.saving,
                                            "data-testid": lote ? "batch-save" : undefined },
              self.state.saving
                ? React.createElement("span", null, React.createElement("i", { className: "fa fa-spinner fa-spin" }), " Guardando…")
                : lote ? "Guardar y siguiente" : isEdit ? "Actualizar" : "Crear"
            )
          )
        )
      )
    );
  }.bind(this);

  // Punto UNICO por el que entra un archivo al modal de importar: lo usan el
  // selector, el arrastre y el boton de quitar. Tenerlo suelto en tres sitios es
  // como se produce el estado a medias (nombre puesto y archivo no, o al reves).
  aceptarArchivoImport = function(archivo) {
    this._importFile = archivo || null;
    this.setState({
      importFileName: archivo ? archivo.name : "",
      importSize: archivo ? archivo.size : 0,
      importDragging: false,
    });
    // El input se limpia para que elegir DOS VECES el mismo archivo vuelva a
    // disparar onChange (el navegador no lo emite si el value no cambia).
    if (!archivo && this._importInput) this._importInput.value = "";
  }.bind(this);

  handleImportDragOver = function(e) {
    e.preventDefault();
    if (!this.state.importDragging) this.setState({ importDragging: true });
  }.bind(this);

  handleImportDragLeave = function(e) {
    e.preventDefault();
    // `relatedTarget` dentro de la zona significa que se paso a un hijo, no que
    // se salio: sin esta guarda el borde parpadea al mover el mouse por dentro.
    if (e.currentTarget.contains(e.relatedTarget)) return;
    this.setState({ importDragging: false });
  }.bind(this);

  handleImportDrop = function(e) {
    e.preventDefault();
    var archivo = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (archivo) this.aceptarArchivoImport(archivo);
    else this.setState({ importDragging: false });
  }.bind(this);

  handleImportSubmit = function(e) {
    e.preventDefault();
    var self = this;

    var archivo = self._importFile;
    if (!archivo) return;

    var fd = new FormData();
    fd.append("file", archivo);

    self.setState({ importing: true });

    fetch("/upload_file/report_expenses", {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken() },
      body: fd,
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        self.setState({ importing: false });

        if (data.type === "error") {
          Swal.fire({ icon: "error", title: "No se pudo importar",
                      text: (data.message || []).join(" "), confirmButtonColor: "#2a3f53" });
          return;
        }

        // `data.data` es [filas_ok, filas_con_error]. Las filas malas se listan
        // por NUMERO DE FILA DEL EXCEL, que es lo unico que le sirve a quien
        // tiene que corregirlas.
        var fallidas = (data.data && data.data[1]) || [];
        self.aceptarArchivoImport(null);
        self.setState({ modalImport: false });
        self.loadData();

        if (fallidas.length > 0) {
          Swal.fire({
            icon: "warning",
            title: "Importado con errores",
            html: "<p>" + escaparHtml(data.success || "") + "</p>" +
                  "<p class=\"cm-hint\">Revise las filas: " + fallidas.join(", ") + "</p>",
            confirmButtonColor: "#2a3f53",
          });
          return;
        }

        Swal.fire({ position: "center", icon: "success", title: data.success || "Importado",
                    showConfirmButton: false, timer: 2500 });
      })
      .catch(function() {
        self.setState({ importing: false });
        Swal.fire({ icon: "error", title: "No se pudo importar el archivo", confirmButtonColor: "#2a3f53" });
      });
  }.bind(this);

  renderImportModal = function() {
    var self = this;
    if (!this.state.modalImport) return null;

    return React.createElement(Modal, { isOpen: true, toggle: self.closeImportModal, className: "modal-dialog-centered", backdrop: "static" },
      React.createElement("div", { className: "cm-modal-container" },
        React.createElement("div", { className: "cm-modal-header" },
          React.createElement("div", { className: "cm-modal-header-content" },
            React.createElement("div", { className: "cm-modal-icon" },
              React.createElement("i", { className: "fas fa-file-import" })
            ),
            React.createElement("div", null,
              React.createElement("h2", { className: "cm-modal-title" }, "Importar archivo"),
              React.createElement("p", { className: "cm-modal-subtitle" }, "Suba un archivo Excel para importar gastos")
            )
          ),
          React.createElement("button", { type: "button", className: "cm-modal-close", onClick: self.closeImportModal },
            React.createElement("i", { className: "fa fa-times" })
          )
        ),
        React.createElement("form", {
          // `onSubmit` y no un POST nativo del formulario: con el POST nativo el
          // navegador ABANDONA la pagina y pinta el JSON crudo de la respuesta,
          // tanto al importar bien como al fallar. Con fetch, el resultado se
          // cuenta en el mismo modal y la tabla se refresca sola.
          onSubmit: self.handleImportSubmit,
        },
          React.createElement(ModalBody, { className: "cm-modal-body" },
            // LA PLANTILLA VA ARRIBA DEL SELECTOR, no debajo: es el primer paso,
            // no una nota al pie. Quien abre este modal sin plantilla sube un
            // archivo con las columnas en otro orden y los datos entran al campo
            // equivocado sin un solo error.
            // LA ZONA DE ARRASTRE, la misma del comprobante en el formulario de
            // gastos (.cm-dropzone). El `<input type="file">` nativo se pinta
            // distinto en cada navegador —"Choose File" en ingles aunque la app
            // este en castellano— y no admite soltar el archivo encima. El input
            // sigue en el DOM, oculto por CSS: es lo que necesitan Playwright y
            // los lectores de pantalla.
            React.createElement("div", {
                className: "cm-dropzone"
                  + (self.state.importDragging ? " cm-dropzone--active" : "")
                  + (self.state.importFileName ? " cm-dropzone--filled" : ""),
                onDragOver: self.handleImportDragOver,
                onDragEnter: self.handleImportDragOver,
                onDragLeave: self.handleImportDragLeave,
                onDrop: self.handleImportDrop,
                onClick: function() { if (self._importInput) self._importInput.click(); },
                onKeyDown: function(e) {
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (self._importInput) self._importInput.click(); }
                },
                role: "button",
                tabIndex: 0,
                "data-testid": "expense-import-dropzone",
              },
              React.createElement("input", {
                type: "file", className: "cm-dropzone-input",
                ref: function(el) { self._importInput = el; },
                accept: ".xlsx,.xls",
                onChange: function(e) { self.aceptarArchivoImport(e.target.files[0]); },
                // Sin esto el clic del input vuelve a burbujear al div, que llama
                // otra vez a input.click(): el selector se abre en bucle.
                onClick: function(e) { e.stopPropagation(); },
                "data-testid": "expense-import-file",
              }),

              self.state.importFileName
                ? React.createElement("div", { className: "cm-dropzone-file", "data-testid": "expense-import-name" },
                    React.createElement("i", { className: "fa fa-file-excel cm-dropzone-file-icon" }),
                    React.createElement("div", { className: "cm-dropzone-file-body" },
                      React.createElement("span", { className: "cm-dropzone-file-name" }, self.state.importFileName),
                      React.createElement("span", { className: "cm-dropzone-file-meta" },
                        pesoLegible(self.state.importSize) + " · Haga clic o suelte otro archivo para reemplazarlo")),
                    React.createElement("button", {
                      type: "button", className: "cm-dropzone-clear", title: "Quitar el archivo",
                      onClick: function(e) { e.stopPropagation(); self.aceptarArchivoImport(null); },
                      "data-testid": "expense-import-clear",
                    }, React.createElement("i", { className: "fa fa-times" })))
                : React.createElement("div", { className: "cm-dropzone-empty" },
                    React.createElement("i", { className: "fa fa-cloud-upload-alt cm-dropzone-icon" }),
                    React.createElement("span", { className: "cm-dropzone-title" },
                      "Arrastre aquí su archivo de Excel"),
                    React.createElement("span", { className: "cm-dropzone-hint" },
                      "o haga clic para buscarlo · XLSX o XLS"))
            ),

            // La plantilla, al pie y en una sola linea: es una ayuda, no el
            // asunto del modal. Antes ocupaba un bloque destacado ARRIBA del
            // selector y le robaba el protagonismo a lo que se viene a hacer
            // aqui, que es subir un archivo.
            React.createElement("div", { className: "cm-field-hint", style: { marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" } },
              React.createElement("span", null,
                "Una fila con errores no detiene el archivo: las demás se importan."),
              React.createElement("a", {
                href: "/import_template/report_expenses",
                "data-testid": "expense-import-template",
              }, React.createElement("i", { className: "fas fa-file-excel" }), " Descargar plantilla")
            )
          ),
          React.createElement("div", { className: "cm-modal-footer" },
            React.createElement("button", { type: "button", className: "cm-btn cm-btn-cancel", onClick: self.closeImportModal },
              React.createElement("i", { className: "fa fa-times" }), " Cancelar"
            ),
            React.createElement("button", {
              type: "submit",
              className: "cm-btn cm-btn-submit",
              disabled: !self.state.importFileName || self.state.importing,
              "data-testid": "expense-import-submit",
            },
              React.createElement("i", { className: "fas fa-upload" }),
              self.state.importing ? " Subiendo..." : " Subir plantilla"
            )
          )
        )
      )
    );
  }.bind(this);

  renderHeaderActions = function() {
    var self = this;

    var buttons = [];

    // Filtros
    buttons.push(
      React.createElement("button", {
        key: "filter",
        onClick: self.toggleFilters,
        className: "cm-btn " + (self.state.showFilters ? "cm-btn-accent" : "cm-btn-outline"),
      },
        React.createElement("i", { className: "fas fa-filter" }),
        " Filtros"
      )
    );

    // Aceptar gastos (solo cuando hay filtros activos y tiene permiso closed)
    if (this.state.isFiltering && this.props.estados.closed) {
      buttons.push(
        React.createElement("button", {
          key: "accept",
          onClick: self.acceptFilteredExpenses,
          className: "cm-btn cm-btn-success",
        },
          React.createElement("i", { className: "fas fa-check" }),
          " Aceptar gastos"
        )
      );
    }

    // SUBIR VARIOS COMPROBANTES (2026-10-18): un ZIP o varios archivos. Mismo
    // permiso que crear un gasto: es crear gastos, uno por uno, por el mismo
    // formulario.
    if (this.props.estados.create) {
      buttons.push(
        React.createElement("button", {
          key: "batch",
          onClick: self.abrirSelectorLote,
          className: "cm-btn cm-btn-outline",
          disabled: !!self.state.preparandoLote,
          "data-testid": "expense-batch-upload",
        },
          React.createElement("i", { className: self.state.preparandoLote ? "fas fa-spinner fa-spin" : "fas fa-file-archive" }),
          self.state.preparandoLote ? " Abriendo…" : " Subir varios"
        ),
        React.createElement("input", {
          key: "batch-input", type: "file", multiple: true, accept: ACCEPT_LOTE, style: { display: "none" },
          ref: function(el) { self._inputLote = el; },
          onChange: self.handleArchivosLote,
          "data-testid": "expense-batch-input",
        })
      );
    }

    // Importar. Va con `estados.import` —que el servidor calcula como "es
    // administrador"— y no con `estados.create`: crear un gasto por el
    // formulario y crear 300 por un Excel no son el mismo permiso. El import
    // salta el formulario, el presupuesto y las reglas de gasto.
    if (this.props.estados.import) {
      buttons.push(
        React.createElement("button", {
          key: "import",
          onClick: self.openImportModal,
          className: "cm-btn cm-btn-outline",
        },
          React.createElement("i", { className: "fas fa-file-import" }),
          " Importar"
        )
      );
    }

    // Exportar
    if (this.props.estados.export) {
      buttons.push(
        React.createElement("a", {
          key: "export",
          href: self.getExportUrl(),
          target: "_blank",
          className: "cm-btn cm-btn-outline",
        },
          React.createElement("i", { className: "fas fa-file-excel" }),
          " Exportar"
        )
      );
    }

    return React.createElement("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap" }}, buttons);
  }.bind(this);

  render() {
    return React.createElement("div", { className: "cm-page", "data-testid": "page-report-expenses" },
      React.createElement(CmPageActions, {
        onNew: this.props.estados.create ? this.openNewModal : null,
        label: "Crear gasto",
        testId: "expense-new",
      }),

      this.renderScopeTabs(),

      this.state.showFilters && this.renderFilters(),

      this.renderSelectionBar(),

      React.createElement(CmDataTable, {
        columns: this.columns,
        data: this.state.data,
        loading: this.state.loading,
        serverPagination: true,
        serverMeta: this.state.meta,
        onSort: this.handleSort,
        onPageChange: this.handlePageChange,
        onPerPageChange: this.handlePerPageChange,
        onSearch: this.handleSearch,
        actions: this.getRowActions,
        // Los checkboxes solo con permiso de exportar: es lo unico que se hace
        // con la seleccion, y sin el permiso el servidor responde 403.
        selectable: !!this.props.estados.export,
        selectedIds: this.state.selectedIds,
        onToggleRow: this.toggleRow,
        onToggleAllPage: this.toggleAllPage,
        headerActions: this.renderHeaderActions(),
        // El vacio se explica por la pestaña. "No hay gastos registrados" en
        // "Centros a mi cargo" se lee como que el modulo esta vacio, cuando lo
        // que pasa es que a esos centros todavia no les han cargado nada.
        emptyMessage: this.state.scope === "owned_centers"
          ? "Todavía no hay gastos en los centros de costo a su cargo"
          : this.state.scope === "mine"
            ? "Usted no tiene gastos registrados"
            : "No hay gastos registrados",
      }),

      this.renderModal(),
      this.renderImportModal(),
      this.renderReceiptPreview()
    );
  }
}

export default ReportExpenseIndex;
WebpackerReact.setup({ ReportExpenseIndex });
