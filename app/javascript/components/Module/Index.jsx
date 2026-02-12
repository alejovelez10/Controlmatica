import React from "react";
import Swal from "sweetalert2";
import { CmDataTable, CmPageActions, CmModal } from "../../generalcomponents/ui";

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
          Swal.fire({ position: "center", icon: "success", title: data.message, showConfirmButton: false, timer: 1500 });
        } else {
          this.setState({ moduleErrors: data.errors || [data.message || "Error al guardar"], moduleSaving: false });
        }
      })
      .catch(() => { this.setState({ moduleErrors: ["Error de conexión"], moduleSaving: false }); });
  };

  deleteModule = (id) => {
    Swal.fire({
      title: "¿Estás seguro?", text: "El módulo y sus acciones serán eliminados permanentemente",
      icon: "warning", showCancelButton: true,
      confirmButtonColor: "#2a3f53", cancelButtonColor: "#dc3545",
      confirmButtonText: "Sí, eliminar", cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.value) {
        fetch("/module_controls/" + id, { method: "delete", headers: { "X-CSRF-Token": csrfToken() } })
          .then((r) => r.json())
          .then(() => {
            this.loadData();
            Swal.fire({ title: "Eliminado", text: "El módulo fue eliminado con éxito", icon: "success", confirmButtonColor: "#2a3f53" });
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
      icon: "warning", showCancelButton: true,
      confirmButtonColor: "#2a3f53", cancelButtonColor: "#dc3545",
      confirmButtonText: "Sí, eliminar", cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.value) {
        fetch("/accion_modules/" + id, { method: "delete", headers: { "X-CSRF-Token": csrfToken() } })
          .then((r) => r.json())
          .then(() => {
            this.loadActions(this.state.actionsModule.id);
            Swal.fire({ title: "Eliminado", text: "La acción fue eliminada con éxito", icon: "success", confirmButtonColor: "#2a3f53" });
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
    const subtitle = moduleMode === "new" ? "Complete los datos del nuevo módulo" : "Modifique los datos del módulo";
    const icon = moduleMode === "new" ? "fa-cubes" : "fa-cube";

    return (
      <CmModal
        isOpen={moduleModalOpen}
        toggle={this.closeModuleModal}
        size="md"
        footer={null}
        hideHeader={true}
      >
        <div style={{
          margin: "-20px -24px -24px -24px",
          display: "flex",
          flexDirection: "column"
        }}>
          {/* Header */}
          <div style={{
            background: "#fcfcfd",
            padding: "20px 32px",
            borderBottom: "1px solid #e9ecef",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{
                width: "48px",
                height: "48px",
                background: "linear-gradient(135deg, #f5a623 0%, #f7b731 100%)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(245, 166, 35, 0.3)"
              }}>
                <i className={`fas ${icon}`} style={{ color: "#fff", fontSize: "20px" }} />
              </div>
              <div>
                <h2 style={{ margin: "0 0 2px 0", fontSize: "18px", fontWeight: 600, color: "#333" }}>{title}</h2>
                <p style={{ margin: 0, fontSize: "12px", color: "#6c757d" }}>{subtitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={this.closeModuleModal}
              style={{
                width: "32px",
                height: "32px",
                border: "none",
                background: "#e9ecef",
                borderRadius: "50%",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6c757d",
                transition: "all 0.2s"
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = "#dc3545"; e.currentTarget.style.color = "#fff"; }}
              onMouseOut={(e) => { e.currentTarget.style.background = "#e9ecef"; e.currentTarget.style.color = "#6c757d"; }}
            >
              <i className="fas fa-times" />
            </button>
          </div>

          {/* Form Content */}
          <div style={{ padding: "24px 32px" }}>
            {moduleErrors.length > 0 && (
              <div style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                padding: "12px 16px",
                marginBottom: "20px"
              }}>
                <ul style={{ margin: 0, paddingLeft: "20px", color: "#dc2626" }}>
                  {moduleErrors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px"
            }}>
              <div>
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "6px",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#374151"
                }}>
                  <i className="fa fa-tag" style={{ color: "#6b7280", fontSize: "12px" }} />
                  Nombre
                </label>
                <input
                  type="text"
                  placeholder="Nombre del módulo"
                  value={moduleForm.name}
                  onChange={(e) => this.handleModuleFormChange("name", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #e2e5ea",
                    borderRadius: "8px",
                    fontSize: "14px",
                    background: "#fcfcfd",
                    transition: "all 0.2s",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "6px",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#374151"
                }}>
                  <i className="fa fa-align-left" style={{ color: "#6b7280", fontSize: "12px" }} />
                  Descripción
                </label>
                <input
                  type="text"
                  placeholder="Descripción"
                  value={moduleForm.description}
                  onChange={(e) => this.handleModuleFormChange("description", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #e2e5ea",
                    borderRadius: "8px",
                    fontSize: "14px",
                    background: "#fcfcfd",
                    transition: "all 0.2s",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            padding: "16px 32px",
            background: "#fcfcfd",
            borderTop: "1px solid #e9ecef"
          }}>
            <button
              type="button"
              onClick={this.closeModuleModal}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: 500,
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                border: "1px solid #dee2e6",
                background: "#fff",
                color: "#6c757d"
              }}
            >
              <i className="fas fa-times" /> Cancelar
            </button>
            <button
              type="button"
              onClick={this.handleModuleSubmit}
              disabled={moduleSaving}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: 500,
                borderRadius: "8px",
                cursor: moduleSaving ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                border: "none",
                background: "linear-gradient(135deg, #f5a623 0%, #f7b731 100%)",
                color: "#fff",
                opacity: moduleSaving ? 0.7 : 1
              }}
            >
              {moduleSaving ? (
                <React.Fragment>
                  <i className="fas fa-spinner fa-spin" /> Guardando...
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <i className="fas fa-save" /> Guardar
                </React.Fragment>
              )}
            </button>
          </div>
        </div>
      </CmModal>
    );
  };

  renderActionsModal = () => {
    const { actionsModalOpen, actionsModule, actions, actionsLoading, actionMode, actionForm, actionErrors, actionSaving } = this.state;
    if (!actionsModule) return null;

    return (
      <CmModal
        isOpen={actionsModalOpen}
        toggle={this.closeActionsModal}
        size="lg"
        footer={null}
        hideHeader={true}
      >
        <div style={{
          margin: "-20px -24px -24px -24px",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh"
        }}>
          {/* Header */}
          <div style={{
            background: "#fcfcfd",
            padding: "20px 32px",
            borderBottom: "1px solid #e9ecef",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{
                width: "48px",
                height: "48px",
                background: "linear-gradient(135deg, #f5a623 0%, #f7b731 100%)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(245, 166, 35, 0.3)"
              }}>
                <i className="fas fa-cogs" style={{ color: "#fff", fontSize: "20px" }} />
              </div>
              <div>
                <h2 style={{ margin: "0 0 2px 0", fontSize: "18px", fontWeight: 600, color: "#333" }}>
                  Acciones de {actionsModule.name}
                </h2>
                <p style={{ margin: 0, fontSize: "12px", color: "#6c757d" }}>
                  Gestione las acciones del módulo
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={this.closeActionsModal}
              style={{
                width: "32px",
                height: "32px",
                border: "none",
                background: "#e9ecef",
                borderRadius: "50%",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6c757d",
                transition: "all 0.2s"
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = "#dc3545"; e.currentTarget.style.color = "#fff"; }}
              onMouseOut={(e) => { e.currentTarget.style.background = "#e9ecef"; e.currentTarget.style.color = "#6c757d"; }}
            >
              <i className="fas fa-times" />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div style={{
            padding: "24px 32px",
            flex: 1,
            overflowY: "auto"
          }}>
            {/* Action form */}
            {actionMode && (
              <div style={{
                background: "#fcfcfd",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "20px"
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "16px"
                }}>
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "rgba(245, 166, 35, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <i className={`fa ${actionMode === "new" ? "fa-plus" : "fa-edit"}`} style={{ color: "#f5a623", fontSize: "16px" }} />
                  </div>
                  <span style={{ fontWeight: 600, color: "#374151", fontSize: "16px" }}>
                    {actionMode === "new" ? "Nueva Acción" : "Editar Acción"}
                  </span>
                </div>

                {actionErrors.length > 0 && (
                  <div style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    marginBottom: "16px"
                  }}>
                    <ul style={{ margin: 0, paddingLeft: "20px", color: "#dc2626" }}>
                      {actionErrors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                )}

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  marginBottom: "16px"
                }}>
                  <div>
                    <label style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "6px",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#374151"
                    }}>
                      <i className="fa fa-tag" style={{ color: "#6b7280", fontSize: "12px" }} />
                      Nombre
                    </label>
                    <input
                      type="text"
                      placeholder="Nombre de la acción"
                      value={actionForm.name}
                      onChange={(e) => this.handleActionFormChange("name", e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        border: "1px solid #e2e5ea",
                        borderRadius: "8px",
                        fontSize: "14px",
                        background: "#fff",
                        transition: "all 0.2s",
                        outline: "none",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "6px",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#374151"
                    }}>
                      <i className="fa fa-align-left" style={{ color: "#6b7280", fontSize: "12px" }} />
                      Descripción
                    </label>
                    <input
                      type="text"
                      placeholder="Descripción"
                      value={actionForm.description}
                      onChange={(e) => this.handleActionFormChange("description", e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        border: "1px solid #e2e5ea",
                        borderRadius: "8px",
                        fontSize: "14px",
                        background: "#fff",
                        transition: "all 0.2s",
                        outline: "none",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    type="button"
                    onClick={this.handleActionSubmit}
                    disabled={actionSaving}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 20px",
                      fontSize: "14px",
                      fontWeight: 500,
                      borderRadius: "8px",
                      cursor: actionSaving ? "not-allowed" : "pointer",
                      transition: "all 0.2s ease",
                      border: "none",
                      background: "linear-gradient(135deg, #f5a623 0%, #f7b731 100%)",
                      color: "#fff",
                      opacity: actionSaving ? 0.7 : 1
                    }}
                  >
                    {actionSaving ? (
                      <React.Fragment>
                        <i className="fas fa-spinner fa-spin" /> Guardando...
                      </React.Fragment>
                    ) : (
                      <React.Fragment>
                        <i className="fas fa-save" /> Guardar
                      </React.Fragment>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={this.cancelActionForm}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 20px",
                      fontSize: "14px",
                      fontWeight: 500,
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      border: "1px solid #dee2e6",
                      background: "#fff",
                      color: "#6c757d"
                    }}
                  >
                    <i className="fas fa-times" /> Cancelar
                  </button>
                </div>
              </div>
            )}

            {!actionMode && (
              <div style={{ marginBottom: "20px" }}>
                <button
                  onClick={this.startNewAction}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 20px",
                    fontSize: "14px",
                    fontWeight: 500,
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    border: "none",
                    background: "linear-gradient(135deg, #f5a623 0%, #f7b731 100%)",
                    color: "#fff"
                  }}
                >
                  <i className="fas fa-plus" /> Nueva Acción
                </button>
              </div>
            )}

            {/* Actions list */}
            {actionsLoading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: "24px", marginBottom: "12px", display: "block" }} />
                Cargando...
              </div>
            ) : actions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>
                <i className="fas fa-cog" style={{ fontSize: "32px", marginBottom: "12px", display: "block", opacity: 0.5 }} />
                No hay acciones en este módulo
              </div>
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
                        <div className="cm-dt-menu">
                          <button className="cm-dt-menu-trigger" onClick={this.openMenu}>
                            <i className="fas fa-ellipsis-v" />
                          </button>
                          <div className="cm-dt-menu-dropdown">
                            <button onClick={() => this.startEditAction(action)} className="cm-dt-menu-item">
                              <i className="fas fa-pen" /> Editar
                            </button>
                            <button onClick={() => this.deleteAction(action.id)} className="cm-dt-menu-item cm-dt-menu-item--danger">
                              <i className="fas fa-trash" /> Eliminar
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            padding: "16px 32px",
            background: "#fcfcfd",
            borderTop: "1px solid #e9ecef",
            flexShrink: 0
          }}>
            <button
              type="button"
              onClick={this.closeActionsModal}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: 500,
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                border: "1px solid #dee2e6",
                background: "#fff",
                color: "#6c757d"
              }}
            >
              <i className="fas fa-times" /> Cerrar
            </button>
          </div>
        </div>
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
