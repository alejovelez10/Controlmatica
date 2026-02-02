import React from "react";
import Swal from "sweetalert2/dist/sweetalert2.js";
import { CmDataTable, CmPageActions, CmModal, CmInput, CmButton } from "../../generalcomponents/ui";

const EMPTY_MODULE = { name: "", description: "" };
const EMPTY_ACTION = { name: "", description: "" };

function csrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}

class Index extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      // Modules table
      data: [],
      loading: true,
      searchTerm: "",
      sortKey: null,
      sortDir: "asc",
      meta: { total: 0, page: 1, per_page: 10, total_pages: 1 },
      // Module modal
      moduleModalOpen: false,
      moduleMode: "new",
      moduleEditId: null,
      moduleForm: { ...EMPTY_MODULE },
      moduleErrors: [],
      moduleSaving: false,
      // Actions modal
      actionsModalOpen: false,
      actionsModule: null,
      actions: [],
      actionsLoading: false,
      // Action form (inline in actions modal)
      actionMode: null, // null | "new" | "edit"
      actionEditId: null,
      actionForm: { ...EMPTY_ACTION },
      actionErrors: [],
      actionSaving: false,
    };

    this.columns = [
      { key: "name", label: "Nombre" },
      { key: "description", label: "Descripción" },
      {
        key: "actions_count",
        label: "Acciones",
        sortable: false,
        render: (row) => {
          const count = row.accion_modules ? row.accion_modules.length : 0;
          return count + (count === 1 ? " acción" : " acciones");
        },
      },
    ];
  }

  componentDidMount() {
    this.loadData();
  }

  // ─── Modules Table ───

  loadData = (page, perPage, searchTerm, sortKey, sortDir) => {
    const p = page || this.state.meta.page;
    const pp = perPage || this.state.meta.per_page;
    const term = searchTerm !== undefined ? searchTerm : this.state.searchTerm;
    const sk = sortKey !== undefined ? sortKey : this.state.sortKey;
    const sd = sortDir !== undefined ? sortDir : this.state.sortDir;

    this.setState({ loading: true });

    let url = `/modules?page=${p}&per_page=${pp}`;
    if (term) url += `&name=${encodeURIComponent(term)}`;
    if (sk) url += `&sort=${encodeURIComponent(sk)}&dir=${sd}`;

    fetch(url)
      .then((r) => r.json())
      .then((result) => {
        this.setState({ data: result.data, meta: result.meta, loading: false });
      });
  };

  handleSearch = (term) => {
    this.setState({ searchTerm: term }, () => { this.loadData(1, this.state.meta.per_page, term); });
  };
  handlePageChange = (page) => { this.loadData(page, this.state.meta.per_page); };
  handlePerPageChange = (perPage) => { this.loadData(1, perPage); };
  handleSort = (key, dir) => {
    this.setState({ sortKey: key, sortDir: dir }, () => {
      this.loadData(1, this.state.meta.per_page, undefined, key, dir);
    });
  };

  // ─── Module Modal ───

  openNewModuleModal = () => {
    this.setState({
      moduleModalOpen: true, moduleMode: "new", moduleEditId: null,
      moduleForm: { ...EMPTY_MODULE }, moduleErrors: [], moduleSaving: false,
    });
  };

  openEditModuleModal = (row) => {
    this.setState({
      moduleModalOpen: true, moduleMode: "edit", moduleEditId: row.id,
      moduleForm: { name: row.name || "", description: row.description || "" },
      moduleErrors: [], moduleSaving: false,
    });
  };

  closeModuleModal = () => { this.setState({ moduleModalOpen: false }); };

  handleModuleFormChange = (field, value) => {
    this.setState((prev) => ({ moduleForm: { ...prev.moduleForm, [field]: value } }));
  };

  handleModuleSubmit = () => {
    const { moduleForm, moduleMode, moduleEditId } = this.state;
    const isNew = moduleMode === "new";

    if (!moduleForm.name) {
      this.setState({ moduleErrors: ["El nombre es obligatorio"] });
      return;
    }

    const url = isNew ? "/module_controls" : `/module_controls/${moduleEditId}`;
    const method = isNew ? "POST" : "PATCH";

    this.setState({ moduleSaving: true, moduleErrors: [] });

    fetch(url, {
      method,
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() },
      body: JSON.stringify(moduleForm),
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (ok || data.success) {
          this.closeModuleModal();
          this.loadData(isNew ? 1 : undefined);
          Swal.fire({ position: "center", type: "success", title: data.message, showConfirmButton: false, timer: 1500 });
        } else {
          this.setState({ moduleErrors: data.errors || [data.message || "Error al guardar"], moduleSaving: false });
        }
      })
      .catch(() => { this.setState({ moduleErrors: ["Error de conexión"], moduleSaving: false }); });
  };

  deleteModule = (id) => {
    Swal.fire({
      title: "¿Estás seguro?", text: "El módulo y sus acciones serán eliminados permanentemente",
      type: "warning", showCancelButton: true,
      confirmButtonColor: "#2a3f53", cancelButtonColor: "#dc3545",
      confirmButtonText: "Sí, eliminar", cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.value) {
        fetch("/module_controls/" + id, { method: "delete", headers: { "X-CSRF-Token": csrfToken() } })
          .then((r) => r.json())
          .then(() => {
            this.loadData();
            Swal.fire("Eliminado", "El módulo fue eliminado con éxito", "success");
          });
      }
    });
  };

  // ─── Actions Modal ───

  openActionsModal = (row) => {
    this.setState({
      actionsModalOpen: true, actionsModule: row, actions: row.accion_modules || [],
      actionMode: null, actionEditId: null, actionForm: { ...EMPTY_ACTION }, actionErrors: [],
    });
    this.loadActions(row.id);
  };

  closeActionsModal = () => {
    this.setState({ actionsModalOpen: false, actionMode: null });
    this.loadData(); // refresh counts
  };

  loadActions = (moduleId) => {
    this.setState({ actionsLoading: true });
    fetch(`/get_accion_modules/${moduleId}`)
      .then((r) => r.json())
      .then((actions) => { this.setState({ actions, actionsLoading: false }); });
  };

  startNewAction = () => {
    this.setState({ actionMode: "new", actionEditId: null, actionForm: { ...EMPTY_ACTION }, actionErrors: [] });
  };

  startEditAction = (action) => {
    this.setState({
      actionMode: "edit", actionEditId: action.id,
      actionForm: { name: action.name || "", description: action.description || "" }, actionErrors: [],
    });
  };

  cancelActionForm = () => {
    this.setState({ actionMode: null, actionEditId: null, actionForm: { ...EMPTY_ACTION }, actionErrors: [] });
  };

  handleActionFormChange = (field, value) => {
    this.setState((prev) => ({ actionForm: { ...prev.actionForm, [field]: value } }));
  };

  handleActionSubmit = () => {
    const { actionForm, actionMode, actionEditId, actionsModule } = this.state;
    const isNew = actionMode === "new";

    if (!actionForm.name) {
      this.setState({ actionErrors: ["El nombre es obligatorio"] });
      return;
    }

    const body = { ...actionForm, module_control_id: actionsModule.id };
    const url = isNew ? "/accion_modules" : `/accion_modules/${actionEditId}`;
    const method = isNew ? "POST" : "PATCH";

    this.setState({ actionSaving: true, actionErrors: [] });

    fetch(url, {
      method,
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() },
      body: JSON.stringify(body),
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (ok || data.success) {
          this.cancelActionForm();
          this.loadActions(actionsModule.id);
          this.setState({ actionSaving: false });
        } else {
          this.setState({ actionErrors: data.errors || [data.message || "Error al guardar"], actionSaving: false });
        }
      })
      .catch(() => { this.setState({ actionErrors: ["Error de conexión"], actionSaving: false }); });
  };

  deleteAction = (id) => {
    Swal.fire({
      title: "¿Estás seguro?", text: "La acción será eliminada permanentemente",
      type: "warning", showCancelButton: true,
      confirmButtonColor: "#2a3f53", cancelButtonColor: "#dc3545",
      confirmButtonText: "Sí, eliminar", cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.value) {
        fetch("/accion_modules/" + id, { method: "delete", headers: { "X-CSRF-Token": csrfToken() } })
          .then((r) => r.json())
          .then(() => {
            this.loadActions(this.state.actionsModule.id);
            Swal.fire("Eliminado", "La acción fue eliminada con éxito", "success");
          });
      }
    });
  };

  // ─── Render ───

  openMenu = (e) => {
    e.stopPropagation();
    var btn = e.currentTarget;
    var menu = btn.nextElementSibling;
    var all = document.querySelectorAll('.cm-dt-menu-dropdown.open');
    all.forEach(function(m) { m.classList.remove('open'); });
    var rect = btn.getBoundingClientRect();
    document.body.appendChild(menu);
    menu.style.top = (rect.bottom + 4) + 'px';
    menu.style.left = (rect.right - 160) + 'px';
    menu.classList.add('open');
    var close = function(ev) { if (!menu.contains(ev.target) && !btn.contains(ev.target)) { menu.classList.remove('open'); btn.parentNode.appendChild(menu); document.removeEventListener('click', close); } };
    document.addEventListener('click', close);
  };

  renderActions = (row) => {
    const { estados } = this.props;
    return (
      <div className="cm-dt-menu">
        <button className="cm-dt-menu-trigger" onClick={this.openMenu}>
          <i className="fas fa-ellipsis-v" />
        </button>
        <div className="cm-dt-menu-dropdown">
          {estados.gestionar && (
            <button onClick={() => this.openActionsModal(row)} className="cm-dt-menu-item">
              <i className="fas fa-cogs" /> Gestionar acciones
            </button>
          )}
          {estados.edit && (
            <button onClick={() => this.openEditModuleModal(row)} className="cm-dt-menu-item">
              <i className="fas fa-pen" /> Editar
            </button>
          )}
          {estados.delete && (
            <button onClick={() => this.deleteModule(row.id)} className="cm-dt-menu-item cm-dt-menu-item--danger">
              <i className="fas fa-trash" /> Eliminar
            </button>
          )}
        </div>
      </div>
    );
  };

  renderModuleModal = () => {
    const { moduleModalOpen, moduleMode, moduleForm, moduleErrors, moduleSaving } = this.state;
    const title = moduleMode === "new" ? "Nuevo Módulo" : "Editar Módulo";
    const icon = moduleMode === "new" ? "fas fa-plus-circle" : "fas fa-edit";

    return (
      <CmModal
        isOpen={moduleModalOpen} toggle={this.closeModuleModal}
        title={<span><i className={icon} /> {title}</span>} size="md"
        footer={
          <React.Fragment>
            <CmButton variant="outline" onClick={this.closeModuleModal}>Cancelar</CmButton>
            <CmButton variant="accent" onClick={this.handleModuleSubmit} disabled={moduleSaving}>
              {moduleSaving ? <React.Fragment><i className="fas fa-spinner fa-spin" /> Guardando...</React.Fragment> : <React.Fragment><i className="fas fa-save" /> Guardar</React.Fragment>}
            </CmButton>
          </React.Fragment>
        }
      >
        {moduleErrors.length > 0 && (
          <div className="cm-form-errors"><ul>{moduleErrors.map((e, i) => <li key={i}>{e}</li>)}</ul></div>
        )}
        <div className="cm-form-row">
          <CmInput label="Nombre" placeholder="Nombre del módulo" value={moduleForm.name} onChange={(e) => this.handleModuleFormChange("name", e.target.value)} />
          <CmInput label="Descripción" placeholder="Descripción" value={moduleForm.description} onChange={(e) => this.handleModuleFormChange("description", e.target.value)} />
        </div>
      </CmModal>
    );
  };

  renderActionsModal = () => {
    const { actionsModalOpen, actionsModule, actions, actionsLoading, actionMode, actionForm, actionErrors, actionSaving } = this.state;
    if (!actionsModule) return null;

    return (
      <CmModal
        isOpen={actionsModalOpen} toggle={this.closeActionsModal}
        title={<span><i className="fas fa-cogs" /> Acciones de {actionsModule.name}</span>} size="lg"
        footer={
          <CmButton variant="outline" onClick={this.closeActionsModal}>Cerrar</CmButton>
        }
      >
        {/* Action form */}
        {actionMode && (
          <div className="cm-form-section" style={{ marginBottom: 16 }}>
            <div className="cm-form-section-title">
              <span>{actionMode === "new" ? "Nueva Acción" : "Editar Acción"}</span>
            </div>
            {actionErrors.length > 0 && (
              <div className="cm-form-errors"><ul>{actionErrors.map((e, i) => <li key={i}>{e}</li>)}</ul></div>
            )}
            <div className="cm-form-row">
              <CmInput label="Nombre" placeholder="Nombre de la acción" value={actionForm.name} onChange={(e) => this.handleActionFormChange("name", e.target.value)} />
              <CmInput label="Descripción" placeholder="Descripción" value={actionForm.description} onChange={(e) => this.handleActionFormChange("description", e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <CmButton variant="accent" onClick={this.handleActionSubmit} disabled={actionSaving}>
                {actionSaving ? "Guardando..." : "Guardar"}
              </CmButton>
              <CmButton variant="outline" onClick={this.cancelActionForm}>Cancelar</CmButton>
            </div>
          </div>
        )}

        {!actionMode && (
          <div style={{ marginBottom: 12 }}>
            <button onClick={this.startNewAction} className="cm-btn cm-btn-accent cm-btn-sm">
              <i className="fas fa-plus" /> Nueva Acción
            </button>
          </div>
        )}

        {/* Actions list */}
        {actionsLoading ? (
          <div style={{ textAlign: "center", padding: 20, color: "#999" }}>Cargando...</div>
        ) : actions.length === 0 ? (
          <div style={{ textAlign: "center", padding: 20, color: "#999" }}>No hay acciones en este módulo</div>
        ) : (
          <table className="cm-dt-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th className="cm-dt-th">Nombre</th>
                <th className="cm-dt-th">Descripción</th>
                <th className="cm-dt-th" style={{ width: 90, textAlign: "center" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((action) => (
                <tr key={action.id} className="cm-dt-row">
                  <td className="cm-dt-td">{action.name}</td>
                  <td className="cm-dt-td">{action.description}</td>
                  <td className="cm-dt-td" style={{ textAlign: "center" }}>
                    <button onClick={() => this.startEditAction(action)} className="cm-dt-action-btn edit" title="Editar">
                      <i className="fas fa-pen" />
                    </button>
                    <button onClick={() => this.deleteAction(action.id)} className="cm-dt-action-btn delete" title="Eliminar">
                      <i className="fas fa-trash" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CmModal>
    );
  };

  render() {
    const { meta } = this.state;
    return (
      <React.Fragment>
        {this.props.estados.create && (
          <CmPageActions>
            <button onClick={this.openNewModuleModal} className="cm-btn cm-btn-accent cm-btn-sm">
              <i className="fas fa-plus" /> Nuevo Módulo
            </button>
          </CmPageActions>
        )}
        <CmDataTable
          columns={this.columns}
          data={this.state.data}
          loading={this.state.loading}
          actions={this.renderActions}
          onSearch={this.handleSearch}
          searchPlaceholder="Buscar módulo..."
          emptyMessage="No hay módulos registrados"
          emptyAction={
            this.props.estados.create ? (
              <button onClick={this.openNewModuleModal} className="cm-btn cm-btn-accent cm-btn-sm" style={{ marginTop: "8px" }}>
                <i className="fas fa-plus" /> Nuevo Módulo
              </button>
            ) : null
          }
          serverPagination
          serverMeta={meta}
          onSort={this.handleSort}
          onPageChange={this.handlePageChange}
          onPerPageChange={this.handlePerPageChange}
        />
        {this.renderModuleModal()}
        {this.renderActionsModal()}
      </React.Fragment>
    );
  }
}

export default Index;
