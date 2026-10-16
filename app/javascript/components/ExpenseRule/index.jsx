import React, { Component } from 'react';
import NumberFormat from "react-number-format";
import Swal from "sweetalert2";
import { CmDataTable, CmPageActions } from '../../generalcomponents/ui';
import ExpenseRuleFormCreate from './FormCreate';

// Pantalla de administracion de Reglas de gastos (paquete 14, tarea 6).
//
// El backend ya existia completo (modelo, servicio, controller, 65 pruebas):
// aqui NO se reimplementa ninguna regla, solo se consume. Todo lo que decide
// que es valido lo decide el servidor; esta pantalla no valida limites, no
// resuelve que regla aplica a quien y no evalua las instrucciones del agente.
//
// Lo unico que se comprueba en el cliente es que el formulario no se pueda
// mandar VACIO (`blockReason`), y es cortesia: el servidor lo rechazaria igual.

function csrfToken() {
  var meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}

// Junta los mensajes del servidor en una frase presentable.
//
// La mayuscula inicial es cosmetica pero no es un capricho: los mensajes de
// `errors.full_messages` de este modelo estan traducidos con `format:
// "%{message}"` (config/locales/expense_rule.en.yml) para que no salga el
// nombre del atributo en ingles, y como el modelo escribe la frase sin sujeto,
// llegan empezando en minuscula. Se arregla al PINTAR y no en el modelo: el
// texto del modelo lo afirman las pruebas del backend, que no son de este
// paquete.
function mensajeServidor(mensajes) {
  var texto = (mensajes || []).join(" ").trim();
  if (!texto) return null;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Copiado de ShowConstCenter/BudgetsTable.jsx:16-23 para que las fechas de
// todas las tablas del modulo de gastos se lean igual.
function formatDate(fecha) {
  if (!fecha) return "";
  var d = new Date(fecha);
  var months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  var minutes = d.getMinutes();
  var timeValue = d.getHours() + (minutes < 10 ? ":0" + minutes : ":" + minutes);
  return months[d.getMonth()] + " " + d.getDate() + " del " + d.getFullYear() + " / " + timeValue;
}

var EMPTY_FORM = {
  name: "",
  active: true,
  is_default: false,
  // `""` y no `0`: el campo vacio significa "sin limite", y un 0 seria un
  // limite de cero dias que el modelo rechaza por no ser positivo.
  max_invoice_age_days: "",
  max_invoice_value: "",
  check_duplicates: true,
  // `true` IGUAL QUE LA COLUMNA EN LA BASE: una regla nueva frena, y aflojarla
  // es un acto deliberado. Al reves, quien crea una regla creeria haber puesto
  // un control y solo habria puesto un aviso.
  mandatory: true,
  agent_instructions: "",
  // `false` en los dos: una regla nueva aplica a los roles que se elijan y no
  // prohibe nada. Prohibir es un acto deliberado, igual que aflojar.
  applies_to_all_roles: false,
  prohibits_expense: false,
  observations: "",
};

// Las cuatro listas del 2026-10-14, vacias. Van aparte de EMPTY_FORM porque son
// opciones {value, label} de react-select y no valores del formulario.
var LISTAS_VACIAS = {
  selectedRoles: [],
  selectedExcludedRoles: [],
  selectedExcludedUsers: [],
  selectedIncludedTypes: [],
  selectedExcludedTypes: [],
};

function idsDe(opciones) {
  return (opciones || []).map(function(o) { return o.value; });
}

// Busca la opcion {value, label} en el catalogo que llego por props. Si ya no
// esta (un rol borrado, un tipo eliminado) se arma con el nombre que trajo el
// serializer, para no perder la asignacion en silencio al guardar.
function opcionDe(catalogo, item) {
  var opciones = catalogo || [];
  for (var i = 0; i < opciones.length; i++) {
    if (opciones[i].value === item.id) return opciones[i];
  }
  return { value: item.id, label: item.name };
}

class ExpenseRuleIndex extends Component {
  constructor(props) {
    super(props);

    this.state = {
      data: [], loading: true, error: null,
      searchTerm: "", onlyActive: "",
      modal: false, modeEdit: false, id: "", saving: false, formError: null,
      formCreate: Object.assign({}, EMPTY_FORM),
      // Opciones {value, label} de react-select, NO ids. Se guardan asi para
      // pintarlas sin buscar el label en cada render.
      ...LISTAS_VACIAS,
    };

    // this.columns SE DECLARA COMPLETO AQUI, en el constructor: CmDataTable
    // congela `visibleColumns` en el suyo y no lo resincroniza nunca, asi que
    // una columna agregada despues NO SE PINTA y no hay error en consola.
    this.columns = [
      { key: "name", label: "Nombre", width: "200px", render: (r) => (
        // Ancla de fila. Va en la primera celda y no en el <tr> porque
        // CmDataTable ya escribe alli su propio data-testid.
        <span data-testid={"rule-row-" + r.id}>
          {r.name}
          {r.is_default && (
            <span className="cm-badge cm-badge-info" style={{ marginLeft: 6 }}
                  data-testid={"rule-default-badge-" + r.id}>
              Por defecto
            </span>
          )}
        </span>
      ) },
      // Junto al nombre porque es su descripcion. Dos lineas como maximo, con
      // el texto completo en el tooltip, igual que las demas celdas de texto.
      { key: "observations", label: "Observaciones", width: "240px", sortable: false, render: (r) => (
        <div className="cm-cell-truncate" data-tooltip={r.observations || ""} data-testid={"rule-observations-" + r.id}>
          <span className="cm-cell-truncate-text">{r.observations || "—"}</span>
        </div>
      ) },
      { key: "active", label: "Estado", width: "110px", render: (r) => (
        r.active
          ? <span className="cm-badge cm-badge-success">Activa</span>
          : <span className="cm-badge cm-badge-danger">Inactiva</span>
      ) },
      // EN UNA PROHIBICION LOS LIMITES NO APLICAN y la celda lo dice con un
      // guion: una regla vieja puede tener valores guardados que el servidor ya
      // no usa (ExpenseRuleService.effective_limits), y mostrarlos haria creer
      // que siguen frenando.
      { key: "max_invoice_age_days", label: "Antigüedad máx.", width: "140px", render: (r) => (
        r.prohibits_expense ? "—" : (r.max_invoice_age_days ? r.max_invoice_age_days + " días" : "No se revisa")
      ) },
      { key: "max_invoice_value", label: "Tope de valor", width: "150px", render: (r) => (
        r.prohibits_expense ? "—" : r.max_invoice_value
          ? <NumberFormat value={parseFloat(r.max_invoice_value)} displayType="text" thousandSeparator={true} prefix="$" />
          : "No se revisa"
      ) },
      { key: "check_duplicates", label: "Repetidas", width: "120px", render: (r) => (
        r.prohibits_expense ? "—" : r.check_duplicates
          ? <span className="cm-badge cm-badge-success">Se frenan</span>
          : <span className="cm-badge cm-badge-warning">No se revisan</span>
      ) },
      // VA EN LA TABLA Y NO SOLO EN EL FORMULARIO: es lo primero que alguien
      // necesita saber al mirar la lista —cual de estas reglas rechaza gastos y
      // cual solo los marca— y averiguarlo abriendo una por una no lo hace
      // nadie. El texto dice la consecuencia, no el nombre del campo.
      { key: "mandatory", label: "Al frenar un gasto", width: "170px", render: (r) => (
        r.mandatory
          ? <span className="cm-badge cm-badge-danger" data-testid={"rule-mandatory-" + r.id}>
              No se guarda
            </span>
          : <span className="cm-badge cm-badge-warning" data-testid={"rule-mandatory-" + r.id}>
              Se guarda sin aprobar
            </span>
      ) },
      // `sortable: false`: el orden del cliente compara `row[key]` y aqui la
      // celda es un arreglo de objetos. Una flecha que no ordena es peor que
      // ninguna flecha.
      { key: "rols", label: "Aplica a", width: "240px", sortable: false, render: (r) => {
        var texto = this.alcancePorRol(r);
        var excluidas = (r.excluded_users || []).map(function(u) { return u.name; });
        if (excluidas.length) texto += " · Sin: " + excluidas.join(", ");
        if (!texto) {
          // Se dice explicitamente. Una celda vacia se lee como "todos", que es
          // exactamente lo contrario de lo que significa.
          return (
            <span className="cm-badge cm-badge-warning" data-testid={"rule-roles-none-" + r.id}>
              {r.is_default ? "Todos (por defecto)" : "Nadie"}
            </span>
          );
        }
        return (
          <div className="cm-cell-truncate" data-tooltip={texto} data-testid={"rule-roles-" + r.id}>
            <span className="cm-cell-truncate-text">{texto}</span>
          </div>
        );
      } },
      // TIPOS Y PROHIBICION EN LA TABLA, no solo en el formulario: "esta regla
      // prohibe Representacion" es lo primero que alguien busca al mirar la
      // lista, y abrir regla por regla no lo hace nadie.
      { key: "included_types", label: "Tipos de gasto", width: "220px", sortable: false, render: (r) => {
        // Los tipos dicen cosas distintas en cada clase de regla: en una
        // prohibicion son LOS QUE SE FRENAN; en una de limites, DONDE se revisan.
        var solo = (r.included_types || []).map(function(t) { return t.name; });
        var excepto = (r.excluded_types || []).map(function(t) { return t.name; });
        var texto;
        if (r.prohibits_expense) {
          texto = "Frena: " + (solo.join(", ") || "—");
        } else {
          texto = "Revisa en: " + (solo.length ? solo.join(", ") : "todos");
          if (excepto.length) texto += " · Excepto: " + excepto.join(", ");
        }
        return (
          <div data-testid={"rule-types-" + r.id}>
            {r.prohibits_expense && (
              <span className="cm-badge cm-badge-danger" style={{ marginRight: 6 }}
                    data-testid={"rule-prohibits-" + r.id}>
                Prohíbe
              </span>
            )}
            <span className="cm-cell-truncate" data-tooltip={texto}>
              <span className="cm-cell-truncate-text">{texto}</span>
            </span>
          </div>
        );
      } },
      { key: "agent_instructions", label: "Frena si el comprobante trae", width: "260px", sortable: false, render: (r) => {
        // Mismo criterio que ExpenseRule#texto_para_el_agente: en una
        // prohibicion el texto no se usa aunque este guardado.
        var texto = r.prohibits_expense ? "" : (r.agent_instructions || "");
        return (
          <div className="cm-cell-truncate" data-tooltip={texto}>
            <span className="cm-cell-truncate-text">{texto || "—"}</span>
          </div>
        );
      } },
      { key: "updated_at", label: "Actualizada", width: "180px", render: (r) => formatDate(r.updated_at) },
    ];
  }

  componentDidMount() {
    this.loadData();
  }

  // --- Carga de datos --------------------------------------------------------
  //
  // El endpoint NO pagina (son decenas de reglas como mucho): devuelve la lista
  // entera y CmDataTable la pagina en el cliente. Por eso no se pasa
  // `serverPagination`.
  loadData = (searchTerm) => {
    var self = this;
    var term = searchTerm !== undefined ? searchTerm : this.state.searchTerm;

    this.setState({ loading: true, error: null });

    var params = [];
    if (term) params.push("q=" + encodeURIComponent(term));
    if (this.state.onlyActive !== "") params.push("only_active=" + this.state.onlyActive);
    var qs = params.length ? "?" + params.join("&") : "";

    fetch("/get_expense_rules" + qs)
      .then(function(r) { if (!r.ok && r.status !== 403) throw new Error(r.status); return r.json(); })
      .then(function(data) {
        // 403 formateado: el servidor responde { type: "error", message: [...] }
        // con cuerpo JSON justamente para poder pintarlo.
        if (data.type === "error") {
          self.setState({ loading: false, data: [], error: mensajeServidor(data.message) });
          return;
        }
        self.setState({ data: data.data || [], loading: false, error: null, searchTerm: term });
      })
      .catch(function() {
        self.setState({ loading: false, error: "No se pudieron cargar las reglas de gastos" });
      });
  };

  handleSearch = (term) => { this.loadData(term); };

  handleOnlyActiveChange = (e) => {
    this.setState({ onlyActive: e.target.value }, () => { this.loadData(); });
  };

  // --- Permisos (COSMETICOS: el servidor revalida en cada endpoint) -----------

  canCreate = () => !!(this.props.estados || {}).create;
  canEdit = () => !!(this.props.estados || {}).edit;
  canDelete = () => !!(this.props.estados || {}).delete;

  // --- Alta y edicion --------------------------------------------------------

  // "Ingeniero, Contador" o "Todos los roles, excepto Gerente". Vacio cuando
  // la regla no aplica a ningun rol, para que la celda diga "Nadie".
  alcancePorRol = (r) => {
    if (r.applies_to_all_roles) {
      var excepto = (r.excluded_rols || []).map(function(x) { return x.name; });
      return excepto.length ? "Todos los roles, excepto " + excepto.join(", ") : "Todos los roles";
    }
    return (r.rols || []).map(function(x) { return x.name; }).join(", ");
  };

  openNew = () => {
    this.setState({
      modal: true, modeEdit: false, id: "", saving: false, formError: null,
      formCreate: Object.assign({}, EMPTY_FORM),
      ...LISTAS_VACIAS,
    });
  };

  edit = (row) => {
    var self = this;
    this.setState({
      modal: true, modeEdit: true, id: row.id, saving: false, formError: null,
      formCreate: {
        name: row.name || "",
        active: !!row.active,
        is_default: !!row.is_default,
        // `null` se convierte a "" y no a "null": el input mostraria el texto.
        max_invoice_age_days: row.max_invoice_age_days === null || row.max_invoice_age_days === undefined
          ? "" : String(row.max_invoice_age_days),
        // `parseFloat` y no `String` a secas: el serializer manda el decimal
        // como "1500000.0" y el campo mostraria "$1,500,000.0", con un decimal
        // suelto que el usuario lee como un error de la pantalla. parseFloat
        // conserva los decimales reales (1500.5 sigue siendo 1500.5).
        max_invoice_value: row.max_invoice_value === null || row.max_invoice_value === undefined
          ? "" : String(parseFloat(row.max_invoice_value)),
        check_duplicates: !!row.check_duplicates,
        mandatory: !!row.mandatory,
        agent_instructions: row.agent_instructions || "",
        applies_to_all_roles: !!row.applies_to_all_roles,
        prohibits_expense: !!row.prohibits_expense,
        observations: row.observations || "",
      },
      selectedRoles: (row.rols || []).map(function(x) { return opcionDe(self.props.roles, x); }),
      selectedExcludedRoles: (row.excluded_rols || []).map(function(x) { return opcionDe(self.props.roles, x); }),
      selectedExcludedUsers: (row.excluded_users || []).map(function(x) { return opcionDe(self.props.usuarios, x); }),
      selectedIncludedTypes: (row.included_types || []).map(function(x) { return opcionDe(self.props.tipos, x); }),
      selectedExcludedTypes: (row.excluded_types || []).map(function(x) { return opcionDe(self.props.tipos, x); }),
    });
  };

  toggleModal = () => { this.setState({ modal: false }); };

  handleChangeForm = (e) => {
    this.setState({ formCreate: Object.assign({}, this.state.formCreate, { [e.target.name]: e.target.value }) });
  };

  // NumberFormat entrega el valor ya formateado ("$1,500,000"): hay que quitarle
  // el prefijo y los separadores de miles antes de mandarlo. Se quitan `$` y `,`
  // y NO el punto, que con `thousandSeparator={true}` es el separador DECIMAL:
  // borrarlo convertiria 1500.50 en 150050. Mismo tratamiento que
  // ShowConstCenter/BudgetsTable.jsx#HandleChangeMoney.
  handleChangeMoney = (e) => {
    var value = e.target.value.replace(/[$,]/g, "");
    this.setState({ formCreate: Object.assign({}, this.state.formCreate, { max_invoice_value: value }) });
  };

  handleToggleBool = (e) => {
    var name = e.target.name;
    var checked = !!e.target.checked;
    this.setState({ formCreate: Object.assign({}, this.state.formCreate, { [name]: checked }) });
  };

  // react-select devuelve `null` (no `[]`) cuando se quita la ultima opcion.
  // Sin este `|| []` el multi-select quedaria descontrolado y `.length`
  // reventaria en el render del contador.
  handleChangeRoles = (opts) => {
    this.setState({ selectedRoles: opts || [] });
  };

  // Una sola funcion para las cuatro listas nuevas: el `|| []` es el mismo
  // motivo de arriba y repetirlo cuatro veces es como se termina olvidando uno.
  handleChangeLista = (clave) => (opts) => {
    this.setState({ [clave]: opts || [] });
  };

  // Los radios de «¿Que frena esta regla?» y «Cuando esta regla frena un
  // gasto…» escriben un booleano con nombre; un evento de checkbox no sirve.
  handleSetField = (name, value) => {
    this.setState({ formCreate: Object.assign({}, this.state.formCreate, { [name]: value }) });
  };

  handleChangeRolesMode = (todos) => {
    this.setState({ formCreate: Object.assign({}, this.state.formCreate, { applies_to_all_roles: todos }) });
  };

  // UNICA definicion del motivo de bloqueo. El modal solo la pinta.
  blockReason = () => {
    var f = this.state.formCreate;
    if (!f.name || !String(f.name).trim()) return "La regla necesita un nombre";
    var prohibe = !!f.prohibits_expense;
    if (!prohibe && f.max_invoice_age_days !== "" && parseInt(f.max_invoice_age_days, 10) <= 0) {
      return "La antigüedad máxima debe ser mayor a cero, o déjela vacía para no tener límite";
    }
    if (!prohibe && f.max_invoice_value !== "" && parseFloat(f.max_invoice_value) <= 0) {
      return "El tope de valor debe ser mayor a cero, o déjelo vacío para no tener tope";
    }
    // "Solo estos tipos" vacio es TODOS los tipos: prohibir sin tipos seria
    // prohibir cualquier gasto. El servidor tambien lo rechaza.
    if (prohibe && (this.state.selectedIncludedTypes || []).length === 0) {
      return "Elija al menos un tipo de gasto que prohibir";
    }
    var incluidos = idsDe(this.state.selectedIncludedTypes);
    var cruzados = (this.state.selectedExcludedTypes || []).filter(function(o) { return incluidos.indexOf(o.value) !== -1; });
    if (!prohibe && cruzados.length) {
      return "Un tipo no puede estar en «Solo estos tipos» y en «Excepto estos» a la vez: " +
        cruzados.map(function(o) { return o.label; }).join(", ");
    }
    if (f.is_default && f.applies_to_all_roles) {
      return "Una regla para todos los roles ya aplica a todos: no puede ser además la regla por defecto";
    }
    return null;
  };

  submit = () => {
    var self = this;
    if (this.blockReason()) return;   // cinturon: el boton ya esta disabled

    var f = this.state.formCreate;
    var isEdit = this.state.modeEdit;
    var url = isEdit ? "/expense_rules/" + this.state.id : "/expense_rules";

    // UNA PROHIBICION NO MANDA LIMITES, TEXTO NI «EXCEPTO ESTOS»: la pantalla
    // no los muestra en ese modo y no pueden viajar escondidos. El estado del
    // formulario si los conserva, para no perderlos si se vuelve al otro modo
    // antes de guardar. El servidor los vacia igual
    // (ExpenseRule#limpiar_lo_que_una_prohibicion_no_usa).
    var prohibe = !!f.prohibits_expense;

    var body = {
      name: String(f.name).trim(),
      active: !!f.active,
      is_default: !!f.is_default,
      // `null` explicito y no `""`: el controller hace `params.permit`, y un
      // string vacio llegaria como "" que ActiveRecord castea a 0 en un
      // integer. 0 no es "sin limite", es un limite imposible.
      max_invoice_age_days: prohibe || f.max_invoice_age_days === "" ? null : parseInt(f.max_invoice_age_days, 10),
      max_invoice_value: prohibe || f.max_invoice_value === "" ? null : parseFloat(f.max_invoice_value),
      check_duplicates: !prohibe && !!f.check_duplicates,
      mandatory: !!f.mandatory,
      agent_instructions: prohibe ? "" : (f.agent_instructions || ""),
      // SIEMPRE se manda, incluso vacio. El controller distingue con
      // `params.key?(:rol_ids)`: mandar la lista vacia es la operacion
      // legitima "esta regla ya no aplica a nadie", y omitir la clave
      // significaria "no toques las asignaciones".
      rol_ids: idsDe(this.state.selectedRoles),
      // Las dos listas de roles viajan siempre: el servidor vacia la que no
      // corresponde al modo, para que no quede una asignacion escondida.
      applies_to_all_roles: !!f.applies_to_all_roles,
      excluded_rol_ids: idsDe(this.state.selectedExcludedRoles),
      excluded_user_ids: idsDe(this.state.selectedExcludedUsers),
      included_type_ids: idsDe(this.state.selectedIncludedTypes),
      excluded_type_ids: prohibe ? [] : idsDe(this.state.selectedExcludedTypes),
      prohibits_expense: !!f.prohibits_expense,
      observations: f.observations || "",
    };

    this.setState({ saving: true, formError: null });

    // JSON PLANO: el controller hace `params.permit(...)` sin `require`, asi que
    // un { expense_rule: {...} } llegaria vacio.
    fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() },
      body: JSON.stringify(body),
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        // `type === "error"` CON HTTP 200 es la convencion del proyecto: el
        // status no dice nada, hay que mirar el `type`. Aqui es lo que muestra
        // "ya existe otra regla marcada como regla por defecto" sin cerrar el
        // modal, para que el usuario pueda corregir sin volver a escribirlo todo.
        if (data.type === "error") {
          self.setState({ saving: false, formError: mensajeServidor(data.message) });
          return;   // el modal NO se cierra
        }
        self.setState({ modal: false, saving: false });
        self.loadData();
        Swal.fire({ position: "center", icon: "success", title: data.success, showConfirmButton: false, timer: 1500 });
      })
      .catch(function() {
        self.setState({ saving: false, formError: "No se pudo guardar la regla. Intente de nuevo." });
      });
  };

  destroy = (row) => {
    var self = this;
    Swal.fire({
      title: "¿Eliminar «" + row.name + "»?",
      text: "Los usuarios que solo tenían esta regla pasarán a la regla por defecto, si existe. " +
            "Si prefiere conservar el histórico, desactívela en vez de borrarla.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#2a3f53",
      cancelButtonColor: "#dc3545",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    }).then(function(result) {
      if (!result.value) return;
      fetch("/expense_rules/" + row.id, {
        method: "DELETE",
        headers: { "X-CSRF-Token": csrfToken(), "Content-Type": "application/json" },
      })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.type === "error") {
            Swal.fire({ icon: "error", title: "¡Ocurrió un error!", text: mensajeServidor(data.message), confirmButtonColor: "#2a3f53" });
            return;
          }
          self.loadData();
          Swal.fire({ title: "Eliminada", text: data.success, icon: "success", confirmButtonColor: "#2a3f53" });
        })
        .catch(function() {
          Swal.fire({ icon: "error", title: "No se pudo eliminar la regla", confirmButtonColor: "#2a3f53" });
        });
    });
  };

  // --- Render ----------------------------------------------------------------

  openMenu = (e) => { window.cmOpenMenu(e); };

  // El dropdown es HERMANO INMEDIATO del trigger: window.cmOpenMenu lo busca
  // por nextElementSibling.
  renderActions = (row) => {
    if (!this.canEdit() && !this.canDelete()) return null;
    return (
      <div className="cm-dt-menu">
        <button className="cm-dt-menu-trigger" onClick={this.openMenu} data-testid={"rule-row-menu-" + row.id}>
          <i className="fas fa-ellipsis-v" />
        </button>
        <div className="cm-dt-menu-dropdown">
          {this.canEdit() && (
            <button className="cm-dt-menu-item" onClick={() => this.edit(row)} data-testid={"rule-row-edit-" + row.id}>
              <i className="fas fa-pen" /> Editar
            </button>
          )}
          {this.canDelete() && (
            <button className="cm-dt-menu-item cm-dt-menu-item--danger" onClick={() => this.destroy(row)} data-testid={"rule-row-delete-" + row.id}>
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
              onChange={this.handleOnlyActiveChange} data-testid="rule-filter-active">
        <option value="">Todas</option>
        <option value="true">Solo activas</option>
        <option value="false">Solo inactivas</option>
      </select>
      {this.canCreate() && (
        <button className="cm-btn cm-btn-accent cm-btn-sm" onClick={this.openNew} data-testid="rule-new-btn">
          <i className="fas fa-plus" /> Nueva regla
        </button>
      )}
    </div>
  );

  // Aviso permanente de la pantalla, fuera del formulario: quien mira la tabla
  // tiene que poder entender por que una regla aplica a alguien sin abrirla.
  renderResolutionHelp = () => (
    <div className="cm-alert cm-alert-info" data-testid="rules-resolution-help"
         style={{ marginBottom: 12 }}>
      <i className="fa fa-info-circle" />{" "}
      <span>
        A cada persona le aplican <b>las reglas de su rol</b>; si no tiene ninguna, le aplica
        la <b>regla por defecto</b>. Las reglas de <b>«Todos los roles»</b> se suman siempre y no
        reemplazan a la por defecto. Cada regla aplica solo a los <b>tipos de gasto</b> que
        tenga elegidos (sin tipos, a todos). Cuando alguien tiene varias, gana el límite más
        restrictivo. Una regla sin roles asignados <b>no aplica a nadie</b>.
      </span>
    </div>
  );

  render() {
    return (
      <React.Fragment>
        {this.renderResolutionHelp()}

        {this.state.error && (
          <div className="cm-alert cm-alert-danger" data-testid="rules-error">
            <i className="fa fa-exclamation-circle" /> {this.state.error}
          </div>
        )}

        <CmPageActions>{this.renderHeaderActions()}</CmPageActions>

        <div data-testid="rules-page">
          <CmDataTable
            columns={this.columns}
            data={this.state.data}
            loading={this.state.loading}
            actions={this.renderActions}
            onSearch={this.handleSearch}
            searchPlaceholder="Buscar por nombre o instrucciones..."
            emptyMessage="No hay reglas de gastos registradas"
            emptyAction={
              this.canCreate() ? (
                <button onClick={this.openNew} className="cm-btn cm-btn-accent cm-btn-sm"
                        style={{ marginTop: "8px" }} data-testid="rule-new-btn-empty">
                  <i className="fas fa-plus" /> Nueva regla
                </button>
              ) : null
            }
          />
        </div>

        {this.state.modal && (
          <ExpenseRuleFormCreate
            modal={this.state.modal}
            toggle={this.toggleModal}
            title={this.state.modeEdit ? "Editar regla de gastos" : "Nueva regla de gastos"}
            nameBnt={this.state.modeEdit ? "Actualizar" : "Crear"}
            modeEdit={this.state.modeEdit}
            formValues={this.state.formCreate}
            roles={this.props.roles || []}
            usuarios={this.props.usuarios || []}
            tipos={this.props.tipos || []}
            selectedRoles={this.state.selectedRoles}
            selectedExcludedRoles={this.state.selectedExcludedRoles}
            selectedExcludedUsers={this.state.selectedExcludedUsers}
            selectedIncludedTypes={this.state.selectedIncludedTypes}
            selectedExcludedTypes={this.state.selectedExcludedTypes}
            onChangeLista={this.handleChangeLista}
            onChangeRolesMode={this.handleChangeRolesMode}
            onSetField={this.handleSetField}
            onChangeForm={this.handleChangeForm}
            onChangeMoney={this.handleChangeMoney}
            onToggleBool={this.handleToggleBool}
            onChangeRoles={this.handleChangeRoles}
            submitForm={this.submit}
            saving={this.state.saving}
            blockReason={this.blockReason()}
            serverError={this.state.formError}
          />
        )}
      </React.Fragment>
    );
  }
}

export default ExpenseRuleIndex;
