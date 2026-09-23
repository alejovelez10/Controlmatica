import React, { Component } from 'react';
import NumberFormat from "react-number-format";
import Swal from "sweetalert2";
import { CmDataTable } from '../../generalcomponents/ui';
import BudgetSummaryBoard from './BudgetSummaryBoard';
import BudgetFormCreate from './BudgetFormCreate';

// Copiado tal cual de ExpensesTable.jsx:8-11.
function csrfToken() {
  var meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}

// Copiado de packs/ReportExpenseIndex.js:15-22 para que las fechas de las dos
// tablas del modulo se lean igual.
function formatDate(fecha) {
  if (!fecha) return "";
  var d = new Date(fecha);
  var months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  var minutes = d.getMinutes();
  var timeValue = d.getHours() + (minutes < 10 ? ":0" + minutes : ":" + minutes);
  return months[d.getMonth()] + " " + d.getDate() + " del " + d.getFullYear() + " / " + timeValue;
}

// Para el texto del mensaje de bloqueo. Dentro de un string no se puede usar
// NumberFormat, que es un componente.
function formatoCorto(x) {
  return Number(x || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 });
}

class BudgetsTable extends Component {
  constructor(props) {
    super(props);

    this.state = {
      data: [], loading: true, error: null,
      meta: { total: 0, page: 1, per_page: 50, total_pages: 1 },
      searchTerm: "", sortKey: null, sortDir: "desc", onlyActive: "",
      summary: null, summaryLoading: true, summaryError: null,
      // Apertura del modal "Resumen por persona". Vive aqui y no en
      // BudgetSummaryBoard porque el boton que lo abre esta en la barra de
      // acciones de la tabla general, que se arma en este componente.
      summaryModal: false,
      modal: false, modeEdit: false, id: "", saving: false, formError: null,
      // La fila que se esta editando. Se guarda para devolverle su propio monto
      // al limite: al editar, esa partida YA esta contada dentro de `assigned`,
      // asi que sin esto no se podria guardar una partida sin cambiarla.
      original: null,
      formCreate: { cost_center_id: props.cost_center.id, user_id: "", amount: "", notes: "", active: true },
      selectedOptionUser: null,
      availability: { loading: false, error: null, has_budget: false, assigned: "0.0", spent: "0.0", available: "0.0" },
    };

    // this.columns SE DECLARA COMPLETO AQUI, en el constructor. CmDataTable
    // congela `visibleColumns` en el suyo (CmDataTable.jsx:16) y no lo
    // resincroniza nunca: una columna agregada en componentDidMount o
    // dependiente de un `estados` que llega despues NO SE PINTA y no hay error
    // en consola.
    this.columns = [
      // `sortable` por defecto (true) solo en las cinco columnas de la allowlist
      // del servidor (ExpenseBudgetsController::SORT_COLUMNS + user_name).
      // Cualquier otra key llega al servidor, se ignora en silencio y el usuario
      // ve una flecha que no ordena.
      { key: "user_name", label: "Beneficiario", render: (r) => (
        // Ancla de fila de §7.6. Va en la primera celda y no en el <tr> porque
        // CmDataTable ya escribe alli su propio data-testid="cm-datatable-row".
        <span data-testid={"budget-row-" + r.id}>{r.user ? r.user.names : "—"}</span>
      ) },
      { key: "amount", label: "Asignado", render: (r) => (
        <NumberFormat value={parseFloat(r.amount || 0)} displayType="text" thousandSeparator={true} prefix="$" />
      ) },
      { key: "spent", label: "Gastado", sortable: false, render: (r) => (
        <NumberFormat value={parseFloat(r.spent || 0)} displayType="text" thousandSeparator={true} prefix="$" />
      ) },
      { key: "available", label: "Disponible", sortable: false, render: (r) => {
        var v = parseFloat(r.available || 0);
        return (
          <span data-testid={"budget-available-" + r.id} style={v < 0 ? { color: "#c82333" } : undefined}>
            <NumberFormat value={v} displayType="text" thousandSeparator={true} prefix="$" />
          </span>
        );
      } },
      { key: "notes", label: "Notas", sortable: false, render: (r) => (
        <div className="cm-cell-truncate" data-tooltip={r.notes || ""}>
          <span className="cm-cell-truncate-text">{r.notes || "—"}</span>
        </div>
      ) },
      { key: "active", label: "Estado", render: (r) => (
        r.active
          ? <span className="cm-badge cm-badge-success">Activa</span>
          : <span className="cm-badge cm-badge-danger">Anulada</span>
      ) },
      { key: "created_by_name", label: "Creada por", sortable: false, render: (r) => (
        r.created_by ? r.created_by.names : "—"
      ) },
      { key: "updated_at", label: "Actualizada", render: (r) => formatDate(r.updated_at) },
    ];
  }

  componentDidMount() {
    this.loadData();
    this.loadSummary();
  }

  componentWillUnmount() {
    if (this._availTimer) clearTimeout(this._availTimer);
  }

  // --- Carga de datos --------------------------------------------------------

  loadData = (page, perPage, searchTerm, sortKey, sortDir) => {
    var self = this;
    var p = page || this.state.meta.page;
    var pp = perPage || this.state.meta.per_page;
    var term = searchTerm !== undefined ? searchTerm : this.state.searchTerm;
    var sk = sortKey !== undefined ? sortKey : this.state.sortKey;
    var sd = sortDir !== undefined ? sortDir : this.state.sortDir;

    this.setState({ loading: true, error: null });

    var params = ["page=" + p, "per_page=" + pp];
    if (term) params.push("q=" + encodeURIComponent(term));
    if (sk) params.push("sort=" + sk + "&dir=" + sd);
    if (this.state.onlyActive !== "") params.push("only_active=" + this.state.onlyActive);

    fetch("/get_expense_budgets/" + this.props.cost_center.id + "?" + params.join("&"))
      .then(function(r) { if (!r.ok && r.status !== 403) throw new Error(r.status); return r.json(); })
      .then(function(data) {
        // 403 formateado: el servidor responde { type: "error", message: [...] }
        // con cuerpo JSON justamente para poder pintarlo.
        if (data.type === "error") {
          self.setState({ loading: false, data: [], error: (data.message || []).join(" ") });
          return;
        }
        var total = data.total || 0;
        var lastPage = Math.max(1, Math.ceil(total / pp));
        if (p > lastPage) { return self.loadData(lastPage, pp, term, sk, sd); }
        self.setState({
          data: data.data || [],
          meta: { total: total, page: p, per_page: pp, total_pages: lastPage },
          loading: false, error: null, searchTerm: term, sortKey: sk, sortDir: sd,
        });
      })
      // ExpensesTable.loadData NO tiene catch y por eso una caida de red deja la
      // tabla en esqueleto para siempre. Ese bug no se replica aqui.
      .catch(function() {
        self.setState({ loading: false, error: "No se pudieron cargar las partidas" });
      });
  };

  // El fallo del resumen no impide que la tabla se pinte, ni al reves: son dos
  // peticiones con estados independientes.
  loadSummary = () => {
    var self = this;
    // El modal se cierra al recargar el resumen. Mientras `summaryLoading` es
    // true BudgetSummaryBoard pinta el esqueleto y desmonta el modal; si
    // `summaryModal` siguiera en true, el modal volveria a aparecer solo cuando
    // llegara la respuesta. Cerrarlo aqui evita ese parpadeo.
    this.setState({ summaryLoading: true, summaryError: null, summaryModal: false });

    fetch("/get_expense_budget_summary/" + this.props.cost_center.id)
      .then(function(r) { if (!r.ok && r.status !== 403) throw new Error(r.status); return r.json(); })
      .then(function(data) {
        if (data.type === "error") {
          self.setState({ summaryLoading: false, summary: null, summaryError: (data.message || []).join(" ") });
          return;
        }
        self.setState({ summary: data, summaryLoading: false, summaryError: null });
      })
      .catch(function() {
        self.setState({ summaryLoading: false, summaryError: "No se pudo cargar el resumen" });
      });
  };

  handlePageChange = (page) => { this.loadData(page); };
  handlePerPageChange = (pp) => { this.loadData(1, pp); };
  handleSearch = (term) => { this.loadData(1, undefined, term); };
  handleSort = (key, dir) => { this.loadData(1, undefined, undefined, key, dir); };

  handleOnlyActiveChange = (e) => {
    this.setState({ onlyActive: e.target.value }, () => { this.loadData(1); });
  };

  // --- Permisos (COSMETICOS: el servidor revalida en cada endpoint) -----------

  canCreate = () => {
    var e = this.props.estados || {};
    return !!(e.budget_create && (e.is_center_owner || e.budget_show_all));
  };

  canEdit = () => {
    var e = this.props.estados || {};
    return !!(e.budget_edit && (e.is_center_owner || e.budget_show_all));
  };

  canDelete = () => {
    var e = this.props.estados || {};
    return !!(e.budget_delete && (e.is_center_owner || e.budget_show_all));
  };

  // --- Validacion en vivo ----------------------------------------------------

  // Maximo que ESTA partida puede tomar. `null` significa "todavia no se sabe":
  // con informacion incompleta NO se bloquea, porque el servidor sigue siendo la
  // autoridad y bloquear aqui produciria falsos negativos que el usuario no
  // puede resolver.
  assignableLimit = () => {
    var s = this.state.summary;
    if (!s || !s.totals) return null;
    // `assignable` (cotizado - asignado - gastos sin aceptar) es el numero que
    // valida el servidor. El respaldo en `unassigned` es para una pantalla
    // abierta contra una version anterior del backend, que no lo devuelve.
    var disponible = parseFloat(
      s.totals.assignable !== undefined && s.totals.assignable !== null ? s.totals.assignable : (s.totals.unassigned || 0)
    );
    var o = this.state.original;
    if (this.state.modeEdit && o && o.active) disponible += parseFloat(o.amount || 0);
    return Math.round(disponible * 100) / 100;
  };

  // Devuelve null o el string exacto a mostrar. Se evalua en cada render y es la
  // UNICA fuente del bloqueo: el modal solo lo pinta.
  blockReason = () => {
    var s = this.state.summary;
    var f = this.state.formCreate;
    var limit = this.assignableLimit();

    if (s && s.cost_center && parseFloat(s.cost_center.viatic_value || 0) <= 0) {
      return "El centro de costos no tiene valor de viáticos cotizado; no es posible asignar partidas";
    }
    if (!f.user_id) return "Seleccione el beneficiario de la partida";
    if (f.amount === "" || f.amount === null || f.amount === undefined || isNaN(parseFloat(f.amount))) {
      return "Ingrese el valor de la partida";
    }
    if (parseFloat(f.amount) <= 0) return "El valor de la partida debe ser mayor a cero";
    // La tolerancia 0.005 NO es opcional: `unassigned` viaja como string de un
    // decimal(15,2) pero `viatic_value` es un float en la base, asi que la resta
    // del servidor puede devolver 1799999.9999999998. Sin ella, asignar el
    // disponible exacto se bloquearia y el usuario no entenderia por que.
    //
    // Una partida INACTIVA no consume cupo: la regla de tope no le aplica.
    if (f.active !== false && limit !== null && parseFloat(f.amount) > limit + 0.005) {
      // Si hay gastos sin aceptar se dice, porque si no el usuario ve un
      // disponible menor que "cotizado - asignado" y no sabe de donde sale.
      var pendientes = s && s.totals ? parseFloat(s.totals.pending || 0) : 0;
      var motivo = pendientes > 0
        ? " Se reservan $" + formatoCorto(pendientes) + " en gastos creados sin aceptar."
        : "";
      return "El valor supera lo disponible para asignar en este centro." + motivo +
             " Disponible: $" + formatoCorto(limit);
    }
    return null;
  };

  loadAvailability = (userId) => {
    var self = this;
    if (this._availTimer) clearTimeout(this._availTimer);

    if (!userId) {
      this.setState({ availability: { loading: false, error: null, has_budget: false, assigned: "0.0", spent: "0.0", available: "0.0" } });
      return;
    }

    this.setState({ availability: Object.assign({}, this.state.availability, { loading: true, error: null }) });

    this._availTimer = setTimeout(function() {
      var qs = "cost_center_id=" + self.props.cost_center.id + "&user_id=" + userId;
      fetch("/get_expense_budget_available?" + qs, { headers: { "X-CSRF-Token": csrfToken() } })
        .then(function(r) { return r.json(); })
        .then(function(d) {
          if (d.type === "error") {
            self.setState({ availability: { loading: false, error: (d.message || []).join(" "), has_budget: false, assigned: "0.0", spent: "0.0", available: "0.0" } });
            return;
          }
          self.setState({ availability: { loading: false, error: null, has_budget: !!d.has_budget, assigned: d.assigned, spent: d.spent, available: d.available } });
        })
        .catch(function() {
          self.setState({ availability: Object.assign({}, self.state.availability, { loading: false, error: "No se pudo consultar el disponible" }) });
        });
    }, 400);
  };

  // --- Alta, edicion y anulacion ---------------------------------------------

  openNew = () => {
    this.setState({
      modal: true, modeEdit: false, id: "", original: null, formError: null, saving: false,
      formCreate: { cost_center_id: this.props.cost_center.id, user_id: "", amount: "", notes: "", active: true },
      selectedOptionUser: null,
    });
    this.loadAvailability(null);
  };

  edit = (row) => {
    this.setState({
      modal: true, modeEdit: true, id: row.id, original: row, formError: null, saving: false,
      formCreate: {
        cost_center_id: this.props.cost_center.id,
        user_id: row.user_id,
        amount: String(row.amount),
        notes: row.notes || "",
        active: row.active,
      },
      selectedOptionUser: { value: row.user_id, label: row.user ? row.user.names : "" },
    });
    this.loadAvailability(row.user_id);
  };

  toggleModal = () => { this.setState({ modal: false }); };

  // Abrir/cerrar el resumen por persona NO recarga nada: el modal se pinta con
  // el `summary` que ya esta en estado. Si algun dia hace falta refrescarlo, se
  // llama a loadSummary() explicitamente, no desde aqui.
  openSummaryModal = () => { this.setState({ summaryModal: true }); };

  closeSummaryModal = () => { this.setState({ summaryModal: false }); };

  handleChangeUser = (opt) => {
    var value = opt ? opt.value : "";
    this.setState({
      selectedOptionUser: opt,
      formCreate: Object.assign({}, this.state.formCreate, { user_id: value }),
    });
    this.loadAvailability(value);
  };

  HandleChangeForm = (e) => {
    this.setState({ formCreate: Object.assign({}, this.state.formCreate, { [e.target.name]: e.target.value }) });
  };

  HandleChangeMoney = (e) => {
    var value = e.target.value.replace(/[$,]/g, "");
    this.setState({ formCreate: Object.assign({}, this.state.formCreate, { amount: value }) });
  };

  handleToggleActive = (e) => {
    this.setState({ formCreate: Object.assign({}, this.state.formCreate, { active: !!e.target.checked }) });
  };

  submit = () => {
    var self = this;
    if (this.blockReason()) return;   // cinturon: el boton ya esta disabled

    var isEdit = this.state.modeEdit;
    var url = isEdit ? "/expense_budgets/" + this.state.id : "/expense_budgets";
    // PATCH NO manda cost_center_id ni user_id (A.6): mover una partida de
    // centro o de beneficiario cambiaria retroactivamente el cupo de dos pares.
    var body = isEdit
      ? { amount: this.state.formCreate.amount, notes: this.state.formCreate.notes, active: this.state.formCreate.active }
      : this.state.formCreate;

    this.setState({ saving: true, formError: null });

    // JSON PLANO: el controller hace params.permit(...) sin require, asi que un
    // { expense_budget: {...} } llegaria vacio.
    fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() },
      body: JSON.stringify(body),
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        // `type === "error"` CON HTTP 200 es la convencion del proyecto.
        // ExpensesTable ignora el type y muestra "Guardado" aunque el servidor
        // haya fallado; aqui se discrimina siempre.
        if (data.type === "error") {
          self.setState({ saving: false, formError: (data.message || []).join(" ") });
          return;   // el modal NO se cierra
        }
        self.setState({ modal: false, saving: false });
        self.loadData(isEdit ? undefined : 1);
        // El resumen se recarga SIEMPRE: A.5/A.6/A.7 reevaluan el budget_status
        // de los gastos del par (centro, usuario), y eso cambia spent,
        // available y exceeded_expenses_count.
        self.loadSummary();
        Swal.fire({ position: "center", icon: "success", title: data.success, showConfirmButton: false, timer: 1500 });
      })
      .catch(function() {
        self.setState({ saving: false, formError: "No se pudo guardar la partida. Intente de nuevo." });
      });
  };

  // Texto de la confirmacion de anulacion. Se arma con las cifras de la fila
  // (`spent` y `available` ya vienen en el JSON del listado) para que el usuario
  // vea ANTES de confirmar cuanto se lleva gastado y cuanto se va a liberar.
  //
  // La ultima palabra la tiene el servidor: estas cifras pueden estar viejas si
  // alguien registro un gasto mientras la tabla estaba abierta, asi que el
  // dialogo describe lo que va a pasar pero no decide nada.
  annulText = (row) => {
    var monto = parseFloat(row.amount || 0);
    var gastado = parseFloat(row.spent || 0);
    var libera = Math.max(monto - gastado, 0);

    if (gastado <= 0) {
      return "Esta partida no tiene gastos ejecutados: se anulará por completo y se liberarán $" +
             formatoCorto(monto) + " al centro de costos.";
    }
    if (gastado < monto) {
      return "Esta partida tiene $" + formatoCorto(gastado) + " ejecutados de $" + formatoCorto(monto) +
             ". No se puede anular del todo: el monto se recortará a $" + formatoCorto(gastado) +
             " y la partida seguirá activa para respaldar ese gasto. Se liberarán $" +
             formatoCorto(libera) + " al centro de costos.";
    }
    return "Esta partida ya tiene $" + formatoCorto(gastado) + " ejecutados sobre $" + formatoCorto(monto) +
           " asignados: no hay saldo por liberar y no se realizará ningún cambio.";
  };

  // Anular NO tiene endpoint propio: es un PATCH con `active: false` al mismo
  // update de siempre. Los tres casos (anulacion completa, recorte parcial o sin
  // saldo que liberar) los resuelve el servicio y aqui solo se muestra su
  // mensaje.
  annul = (row) => {
    var self = this;
    Swal.fire({
      title: "¿Anular esta partida?",
      text: this.annulText(row),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#2a3f53",
      cancelButtonColor: "#dc3545",
      confirmButtonText: "Sí, anular",
      cancelButtonText: "Cancelar",
    }).then(function(result) {
      if (!result.value) return;
      fetch("/expense_budgets/" + row.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() },
        body: JSON.stringify({ active: false }),
      })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.type === "error") {
            // Icono de aviso y no de error: el caso "no hay saldo por liberar"
            // no es una falla, es la regla de negocio explicandose. Un 403 o una
            // validacion caen por aqui igual y se leen bien con este titulo.
            Swal.fire({ icon: "warning", title: "No se anuló la partida",
                        text: (data.message || []).join(" "), confirmButtonColor: "#2a3f53" });
            return;
          }
          self.loadData();
          // El resumen cambia SIEMPRE tras una anulacion: se libera cupo del
          // centro y los gastos del par se reevaluan.
          self.loadSummary();
          Swal.fire({ icon: "success", title: "Partida anulada", text: data.success,
                      confirmButtonColor: "#2a3f53" });
        })
        .catch(function() {
          Swal.fire({ icon: "error", title: "No se pudo anular la partida", confirmButtonColor: "#2a3f53" });
        });
    });
  };

  destroy = (row) => {
    var self = this;
    Swal.fire({
      title: "¿Estás seguro?",
      text: "Los gastos imputados a esta partida quedarán sin partida y se reevaluarán.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#2a3f53",
      cancelButtonColor: "#dc3545",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    }).then(function(result) {
      if (!result.value) return;
      fetch("/expense_budgets/" + row.id, {
        method: "DELETE",
        headers: { "X-CSRF-Token": csrfToken(), "Content-Type": "application/json" },
      })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.type === "error") {
            Swal.fire({ icon: "error", title: "¡Ocurrió un error!", text: (data.message || []).join(" "), confirmButtonColor: "#2a3f53" });
            return;
          }
          self.loadData();
          self.loadSummary();
          Swal.fire({ title: "Eliminada", text: data.success, icon: "success", confirmButtonColor: "#2a3f53" });
        })
        .catch(function() {
          Swal.fire({ icon: "error", title: "No se pudo eliminar la partida", confirmButtonColor: "#2a3f53" });
        });
    });
  };

  // --- Render ----------------------------------------------------------------

  openMenu = (e) => { window.cmOpenMenu(e); };

  // El dropdown es HERMANO INMEDIATO del trigger: window.cmOpenMenu lo busca por
  // nextElementSibling.
  renderActions = (row) => {
    if (!this.canEdit() && !this.canDelete()) return null;
    return (
      <div className="cm-dt-menu">
        <button className="cm-dt-menu-trigger" onClick={this.openMenu} data-testid={"budget-row-menu-" + row.id}>
          <i className="fas fa-ellipsis-v" />
        </button>
        <div className="cm-dt-menu-dropdown">
          {this.canEdit() && (
            <button className="cm-dt-menu-item" onClick={() => this.edit(row)} data-testid={"budget-row-edit-" + row.id}>
              <i className="fas fa-pen" /> Editar
            </button>
          )}
          {/* Solo sobre partidas ACTIVAS: anular una ya anulada no hace nada, y
              el gate de permisos es el mismo de "Editar" porque anular ES una
              edicion (el servidor lo revalida en el mismo endpoint). */}
          {this.canEdit() && row.active && (
            <button className="cm-dt-menu-item" onClick={() => this.annul(row)} data-testid={"budget-row-annul-" + row.id}>
              <i className="fas fa-ban" /> Anular
            </button>
          )}
          {this.canDelete() && (
            <button className="cm-dt-menu-item cm-dt-menu-item--danger" onClick={() => this.destroy(row)} data-testid={"budget-row-delete-" + row.id}>
              <i className="fas fa-trash" /> Eliminar
            </button>
          )}
        </div>
      </div>
    );
  };

  renderHeaderActions = () => (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <select className="cm-state-select" value={this.state.onlyActive}
              onChange={this.handleOnlyActiveChange} data-testid="budget-filter-active">
        <option value="">Todas</option>
        <option value="true">Solo activas</option>
        <option value="false">Solo anuladas</option>
      </select>
      {/* Deshabilitado mientras no haya resumen en memoria (cargando o error):
          el modal es PURAMENTE lector del estado, asi que abrirlo sin datos
          mostraria un cuadro vacio sin explicar por que. El error ya se anuncia
          arriba, con su boton de reintentar. */}
      <button className="cm-btn cm-btn-outline cm-btn-sm" onClick={this.openSummaryModal}
              disabled={!this.state.summary} data-testid="budget-summary-btn">
        <i className="fas fa-users" /> Resumen
      </button>
      {this.canCreate() && (
        <button className="cm-btn cm-btn-accent cm-btn-sm" onClick={this.openNew} data-testid="budget-new-btn">
          <i className="fas fa-plus" /> Nueva partida
        </button>
      )}
    </div>
  );

  render() {
    var summary = this.state.summary;
    var viatic = summary && summary.cost_center ? parseFloat(summary.cost_center.viatic_value || 0) : 0;

    return (
      <React.Fragment>
        <BudgetSummaryBoard
          summary={this.state.summary}
          loading={this.state.summaryLoading}
          error={this.state.summaryError}
          onRetry={this.loadSummary}
          showByUser={this.state.summaryModal}
          onCloseByUser={this.closeSummaryModal}
        />

        {this.state.modal && (
          <BudgetFormCreate
            modal={this.state.modal}
            toggle={this.toggleModal}
            title={this.state.modeEdit ? "Editar partida" : "Nueva partida"}
            nameBnt={this.state.modeEdit ? "Actualizar" : "Crear"}
            modeEdit={this.state.modeEdit}
            formValues={this.state.formCreate}
            users={this.props.users_select}
            selectedOptionUser={this.state.selectedOptionUser}
            onChangeUser={this.handleChangeUser}
            onChangeForm={this.HandleChangeForm}
            onChangeMoney={this.HandleChangeMoney}
            onToggleActive={this.handleToggleActive}
            submitForm={this.submit}
            saving={this.state.saving}
            limite={this.assignableLimit()}
            viaticValue={viatic}
            availability={this.state.availability}
            blockReason={this.blockReason()}
            serverError={this.state.formError}
          />
        )}

        {this.state.error && (
          <div className="cm-alert cm-alert-danger" data-testid="budget-table-error">{this.state.error}</div>
        )}

        {/* serverMeta es obligatorio junto con serverPagination: si llega
            undefined, CmDataTable:246 cae a paginacion de CLIENTE sin avisar y
            muestra 10 filas de la pagina actual.

            El boton de `emptyAction` NO lleva data-testid: el canonico
            `budget-new-btn` ya esta en headerActions, que se pinta siempre.
            Emitirlo dos veces con la tabla vacia haria que el locator del
            paquete 12 encuentre dos nodos y falle por strict mode, justo en el
            escenario "centro sin partidas" con que arrancan sus specs. */}
        <CmDataTable
          columns={this.columns}
          data={this.state.data}
          loading={this.state.loading}
          serverPagination
          serverMeta={this.state.meta}
          onPageChange={this.handlePageChange}
          onPerPageChange={this.handlePerPageChange}
          onSearch={this.handleSearch}
          onSort={this.handleSort}
          actions={this.renderActions}
          searchPlaceholder="Buscar por beneficiario o nota..."
          emptyMessage="No hay partidas presupuestales en este centro de costos"
          headerActions={this.renderHeaderActions()}
          emptyAction={this.canCreate() ? (
            <button className="cm-btn cm-btn-accent cm-btn-sm" onClick={this.openNew}
                    style={{ marginTop: "8px" }}>
              <i className="fas fa-plus" /> Nueva partida
            </button>
          ) : null}
        />
      </React.Fragment>
    );
  }
}

export default BudgetsTable;
