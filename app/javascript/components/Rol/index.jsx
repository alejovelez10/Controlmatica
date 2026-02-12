import React from "react";
import Swal from "sweetalert2";
import { CmDataTable, CmPageActions, CmModal, CmInput, CmButton } from "../../generalcomponents/ui";

const EMPTY_FORM = { name: "", description: "" };

function csrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}

class index extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      data: [],
      loading: true,
      searchTerm: "",
      sortKey: null,
      sortDir: "asc",
      meta: { total: 0, page: 1, per_page: 10, total_pages: 1 },
      modalOpen: false,
      modalMode: "new",
      editId: null,
      form: { ...EMPTY_FORM },
      checkedIds: new Set(),
      modules: [],
      errors: [],
      saving: false,
    };

    this.columns = [
      { key: "name", label: "Nombre" },
      { key: "description", label: "Descripción" },
      {
        key: "permissions",
        label: "Permisos",
        sortable: false,
        render: (row) => {
          const count = row.accion_modules ? row.accion_modules.length : 0;
          return count + (count === 1 ? " permiso" : " permisos");
        },
      },
    ];
  }

  componentDidMount() {
    this.loadData();
  }

  loadData = (page, perPage, searchTerm, sortKey, sortDir) => {
    const p = page || this.state.meta.page;
    const pp = perPage || this.state.meta.per_page;
    const term = searchTerm !== undefined ? searchTerm : this.state.searchTerm;
    const sk = sortKey !== undefined ? sortKey : this.state.sortKey;
    const sd = sortDir !== undefined ? sortDir : this.state.sortDir;

    this.setState({ loading: true });

    let url = `/get_rols?page=${p}&per_page=${pp}`;
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

  // ─── Modal ───

  loadModules = () => {
    fetch("/get_modules_with_actions")
      .then((r) => r.json())
      .then((modules) => { this.setState({ modules }); });
  };

  openNewModal = () => {
    this.setState({
      modalOpen: true, modalMode: "new", editId: null,
      form: { ...EMPTY_FORM }, checkedIds: new Set(), errors: [], saving: false,
    });
    this.loadModules();
  };

  openEditModal = (row) => {
    const checkedIds = new Set(
      (row.accion_modules || []).map((am) => String(am.id))
    );
    this.setState({
      modalOpen: true, modalMode: "edit", editId: row.id,
      form: { name: row.name || "", description: row.description || "" },
      checkedIds, errors: [], saving: false,
    });
    this.loadModules();
  };

  closeModal = () => { this.setState({ modalOpen: false }); };

  handleFormChange = (field, value) => {
    this.setState((prev) => ({ form: { ...prev.form, [field]: value } }));
  };

  handleCheckboxChange = (e) => {
    const id = e.target.value;
    const checked = e.target.checked;
    this.setState((prev) => {
      const next = new Set(prev.checkedIds);
      if (checked) next.add(id); else next.delete(id);
      return { checkedIds: next };
    });
  };

  handleSubmit = () => {
    const { form, checkedIds, modalMode, editId } = this.state;
    const isNew = modalMode === "new";

    if (!form.name) {
      this.setState({ errors: ["El nombre es obligatorio"] });
      return;
    }

    const body = {
      name: form.name,
      description: form.description,
      accion_module_ids: Array.from(checkedIds),
    };

    const url = isNew ? "/rols" : `/rols/${editId}`;
    const method = isNew ? "POST" : "PATCH";

    this.setState({ saving: true, errors: [] });

    fetch(url, {
      method,
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() },
      body: JSON.stringify(body),
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (ok || data.success) {
          this.closeModal();
          this.loadData(isNew ? 1 : undefined);
          Swal.fire({ position: "center", icon: "success", title: data.message, showConfirmButton: false, timer: 1500 });
        } else {
          this.setState({ errors: data.errors || [data.message || "Error al guardar"], saving: false });
        }
      })
      .catch(() => { this.setState({ errors: ["Error de conexión"], saving: false }); });
  };

  delete = (id) => {
    Swal.fire({
      title: "¿Estás seguro?", text: "El rol será eliminado permanentemente",
      icon: "warning", showCancelButton: true,
      confirmButtonColor: "#2a3f53", cancelButtonColor: "#dc3545",
      confirmButtonText: "Sí, eliminar", cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.value) {
        fetch("/rols/" + id, { method: "delete", headers: { "X-CSRF-Token": csrfToken() } })
          .then((r) => r.json())
          .then(() => {
            this.loadData();
            Swal.fire({ title: "Eliminado", text: "El rol fue eliminado con éxito", icon: "success", confirmButtonColor: "#2a3f53" });
          });
      }
    });
  };

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
          {estados.edit && (
            <button onClick={() => this.openEditModal(row)} className="cm-dt-menu-item">
              <i className="fas fa-pen" /> Editar
            </button>
          )}
          {estados.delete && (
            <button onClick={() => this.delete(row.id)} className="cm-dt-menu-item cm-dt-menu-item--danger">
              <i className="fas fa-trash" /> Eliminar
            </button>
          )}
        </div>
      </div>
    );
  };

  renderModal = () => {
    const { modalOpen, modalMode, form, errors, saving, modules, checkedIds } = this.state;
    const title = modalMode === "new" ? "Nuevo Rol" : "Editar Rol";
    const subtitle = modalMode === "new" ? "Configure los permisos del nuevo rol" : "Modifique los permisos del rol";

    return (
      <CmModal
        isOpen={modalOpen}
        toggle={this.closeModal}
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
                <i className="fas fa-user-tag" style={{ color: "#fff", fontSize: "20px" }} />
              </div>
              <div>
                <h2 style={{ margin: "0 0 2px 0", fontSize: "18px", fontWeight: 600, color: "#333" }}>{title}</h2>
                <p style={{ margin: 0, fontSize: "12px", color: "#6c757d" }}>{subtitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={this.closeModal}
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

          {/* Form Content - Scrollable */}
          <div style={{ padding: "24px 32px", flex: 1, overflowY: "auto" }}>
            {errors.length > 0 && (
              <div style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                padding: "12px 16px",
                marginBottom: "20px"
              }}>
                <ul style={{ margin: 0, paddingLeft: "20px", color: "#dc2626" }}>
                  {errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "24px"
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
                  placeholder="Nombre del rol"
                  value={form.name}
                  onChange={(e) => this.handleFormChange("name", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #e2e5ea",
                    borderRadius: "8px",
                    fontSize: "14px",
                    background: "#fcfcfd",
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
                  value={form.description}
                  onChange={(e) => this.handleFormChange("description", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #e2e5ea",
                    borderRadius: "8px",
                    fontSize: "14px",
                    background: "#fcfcfd",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
              </div>
            </div>

            <div className="cm-form-section">
              <div className="cm-form-section-title">
                <span><i className="fas fa-shield-alt" style={{ marginRight: 6 }} /> Permisos</span>
              </div>
              <div className="cm-permissions-grid">
                {modules.map((mod) => (
                  <div key={mod.id} className="cm-permissions-module">
                    <div className="cm-permissions-module-title">{mod.name}</div>
                    {(mod.accion_modules || []).map((action) => (
                      <label key={action.id} className="cm-permissions-checkbox">
                        <input
                          type="checkbox"
                          value={String(action.id)}
                          checked={checkedIds.has(String(action.id))}
                          onChange={this.handleCheckboxChange}
                        />
                        <span>{action.name}</span>
                      </label>
                    ))}
                  </div>
                ))}
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
            borderTop: "1px solid #e9ecef",
            flexShrink: 0
          }}>
            <button
              type="button"
              onClick={this.closeModal}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: 500,
                borderRadius: "8px",
                cursor: "pointer",
                border: "1px solid #dee2e6",
                background: "#fff",
                color: "#6c757d"
              }}
            >
              <i className="fas fa-times" /> Cancelar
            </button>
            <button
              type="button"
              onClick={this.handleSubmit}
              disabled={saving}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: 500,
                borderRadius: "8px",
                cursor: saving ? "not-allowed" : "pointer",
                border: "none",
                background: "linear-gradient(135deg, #f5a623 0%, #f7b731 100%)",
                color: "#fff",
                opacity: saving ? 0.7 : 1
              }}
            >
              {saving ? (
                <React.Fragment><i className="fas fa-spinner fa-spin" /> Guardando...</React.Fragment>
              ) : (
                <React.Fragment><i className="fas fa-save" /> Guardar</React.Fragment>
              )}
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
            <button onClick={this.openNewModal} className="cm-btn cm-btn-accent cm-btn-sm">
              <i className="fas fa-plus" /> Nuevo Rol
            </button>
          </CmPageActions>
        )}
        <CmDataTable
          columns={this.columns}
          data={this.state.data}
          loading={this.state.loading}
          actions={this.renderActions}
          onSearch={this.handleSearch}
          searchPlaceholder="Buscar rol..."
          emptyMessage="No hay roles registrados"
          emptyAction={
            this.props.estados.create ? (
              <button onClick={this.openNewModal} className="cm-btn cm-btn-accent cm-btn-sm" style={{ marginTop: "8px" }}>
                <i className="fas fa-plus" /> Nuevo Rol
              </button>
            ) : null
          }
          serverPagination
          serverMeta={meta}
          onSort={this.handleSort}
          onPageChange={this.handlePageChange}
          onPerPageChange={this.handlePerPageChange}
        />
        {this.renderModal()}
      </React.Fragment>
    );
  }
}

export default index;
