import React from "react";
import Swal from "sweetalert2";
import { CmDataTable, CmPageActions, CmModal } from "../../generalcomponents/ui";

const EMPTY_FORM = {
  names: "", email: "", document_type: "", number_document: "",
  rol_id: "", password: "", password_confirmation: "",
};

const DOC_TYPES = [
  "Cédula de Ciudadanía", "Tarjeta de Identidad", "Registro Civil de Nacimiento",
  "Cédula de Extranjería", "Pasaporte", "Menor sin Identificación",
  "Adulto sin Identificación", "Carnet Diplomático",
];

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
      avatar: null,
      avatarPreview: null,
      currentAvatarUrl: null,
      errors: [],
      saving: false,
    };

    this.columns = [
      { key: "names", label: "Nombre" },
      { key: "email", label: "Email" },
      { key: "rol", label: "Rol", render: (row) => (row.rol ? row.rol.name : "Sin rol"), sortable: false },
      { key: "document_type", label: "Tipo documento" },
      { key: "number_document", label: "Documento" },
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

    let url = `/get_users?page=${p}&per_page=${pp}`;
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

  openNewModal = () => {
    this.setState({
      modalOpen: true, modalMode: "new", editId: null,
      avatar: null, avatarPreview: null, currentAvatarUrl: null,
      form: { ...EMPTY_FORM }, errors: [], saving: false,
    });
  };

  openEditModal = (row) => {
    const avatarUrl = row.avatar && row.avatar.url ? row.avatar.url : null;
    this.setState({
      modalOpen: true, modalMode: "edit", editId: row.id,
      avatar: null, avatarPreview: null, currentAvatarUrl: avatarUrl,
      errors: [], saving: false,
      form: {
        names: row.names || "", email: row.email || "",
        document_type: row.document_type || "", number_document: row.number_document || "",
        rol_id: row.rol_id || "", password: "", password_confirmation: "",
      },
    });
  };

  closeModal = () => { this.setState({ modalOpen: false }); };

  handleFormChange = (field, value) => {
    this.setState((prev) => ({ form: { ...prev.form, [field]: value } }));
  };

  handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      this.setState({ avatar: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        this.setState({ avatarPreview: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  handleSubmit = () => {
    const { form, avatar, modalMode, editId } = this.state;
    const isNew = modalMode === "new";

    // Validación básica
    if (!form.names || !form.email || !form.rol_id) {
      this.setState({ errors: ["Nombre, email y rol son obligatorios"] });
      return;
    }
    if (isNew && (!form.password || form.password.length < 6)) {
      this.setState({ errors: ["La contraseña debe tener mínimo 6 caracteres"] });
      return;
    }
    if (form.password && form.password !== form.password_confirmation) {
      this.setState({ errors: ["Las contraseñas no coinciden"] });
      return;
    }

    const formData = new FormData();
    formData.append("names", form.names);
    formData.append("email", form.email);
    formData.append("document_type", form.document_type);
    formData.append("number_document", form.number_document);
    formData.append("rol_id", form.rol_id);
    if (form.password) {
      formData.append("password", form.password);
      formData.append("password_confirmation", form.password_confirmation);
    }
    if (avatar) {
      formData.append("avatar", avatar);
    }

    const url = isNew ? "/create_user" : `/update_user/${editId}`;
    const method = isNew ? "POST" : "PATCH";

    this.setState({ saving: true, errors: [] });

    fetch(url, {
      method,
      body: formData,
      headers: { "X-CSRF-Token": csrfToken() },
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (ok || data.success) {
          this.closeModal();
          this.loadData();
          Swal.fire({ position: "center", icon: "success", title: data.message, showConfirmButton: false, timer: 1500 });
        } else {
          this.setState({ errors: data.errors || [data.message || "Error al guardar"], saving: false });
        }
      })
      .catch(() => { this.setState({ errors: ["Error de conexión"], saving: false }); });
  };

  delete = (id) => {
    Swal.fire({
      title: "¿Estás seguro?", text: "El usuario será eliminado permanentemente",
      icon: "warning", showCancelButton: true,
      confirmButtonColor: "#2a3f53", cancelButtonColor: "#dc3545",
      confirmButtonText: "Sí, eliminar", cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.value) {
        fetch("/user/" + id, { method: "delete", headers: { "X-CSRF-Token": csrfToken() } })
          .then((r) => r.json())
          .then(() => {
            this.loadData();
            Swal.fire({ title: "Eliminado", text: "El usuario fue eliminado con éxito", icon: "success", confirmButtonColor: "#2a3f53" });
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

  renderHeaderActions = () => {
    const { estados } = this.props;
    return (
      <React.Fragment>
        {estados.download_file && (
          <a href="/download_file/users.xls" target="_blank" className="cm-btn cm-btn-outline cm-btn-sm">
            <i className="fas fa-file-excel" /> Exportar
          </a>
        )}
      </React.Fragment>
    );
  };

  renderModal = () => {
    const { modalOpen, modalMode, form, errors, saving } = this.state;
    const title = modalMode === "new" ? "Nuevo Usuario" : "Editar Usuario";
    const icon = modalMode === "new" ? "fas fa-user-plus" : "fas fa-user-edit";
    const roles = this.props.rols || [];

    const inputStyle = {
      width: "100%",
      padding: "10px 14px",
      border: "1px solid #e2e5ea",
      borderRadius: "8px",
      fontSize: "14px",
      background: "#fcfcfd",
      transition: "all 0.2s",
      outline: "none"
    };

    const labelStyle = {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginBottom: "6px",
      fontSize: "14px",
      fontWeight: 500,
      color: "#374151"
    };

    const labelIconStyle = { color: "#6b7280", fontSize: "12px" };

    return (
      <CmModal
        isOpen={modalOpen}
        toggle={this.closeModal}
        size="lg"
        footer={null}
        hideHeader={true}
      >
        <div className="cm-modal-container" style={{
          margin: "-20px -24px -24px -24px",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh"
        }}>
          {/* Header */}
          <div className="cm-modal-header" style={{
            background: "#fcfcfd",
            padding: "20px 32px",
            borderBottom: "1px solid #e9ecef",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0
          }}>
            <div className="cm-modal-header-content" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div className="cm-modal-icon" style={{
                width: "48px",
                height: "48px",
                background: "linear-gradient(135deg, #f5a623 0%, #f7b731 100%)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(245, 166, 35, 0.3)"
              }}>
                <i className={icon} style={{ color: "#fff", fontSize: "20px" }} />
              </div>
              <div className="cm-modal-header-text">
                <h2 className="cm-modal-title" style={{ margin: "0 0 2px 0", fontSize: "18px", fontWeight: 600, color: "#333" }}>{title}</h2>
                <p className="cm-modal-subtitle" style={{ margin: 0, fontSize: "12px", color: "#6c757d" }}>
                  {modalMode === "new" ? "Complete los datos del nuevo usuario" : "Modifique los datos del usuario"}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="cm-modal-close"
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
          <div className="cm-modal-body-scroll" style={{
            padding: "24px 32px",
            flex: 1,
            overflowY: "auto"
          }}>
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

            {/* User Info Section */}
            <div className="cm-form-grid-2" style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "24px"
            }}>
              <div>
                <label className="cm-label" style={labelStyle}>
                  <i className="fa fa-user" style={labelIconStyle} />
                  Nombre completo
                </label>
                <input
                  type="text"
                  className="cm-input"
                  placeholder="Nombre y apellido"
                  value={form.names}
                  onChange={(e) => this.handleFormChange("names", e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="cm-label" style={labelStyle}>
                  <i className="fa fa-envelope" style={labelIconStyle} />
                  Correo electrónico
                </label>
                <input
                  type="email"
                  className="cm-input"
                  placeholder="correo@ejemplo.com"
                  value={form.email}
                  onChange={(e) => this.handleFormChange("email", e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="cm-label" style={labelStyle}>
                  <i className="fa fa-id-card" style={labelIconStyle} />
                  Tipo de documento
                </label>
                <select
                  className="cm-input"
                  value={form.document_type}
                  onChange={(e) => this.handleFormChange("document_type", e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Seleccione un tipo</option>
                  {DOC_TYPES.map((dt) => <option key={dt} value={dt}>{dt}</option>)}
                </select>
              </div>
              <div>
                <label className="cm-label" style={labelStyle}>
                  <i className="fa fa-hashtag" style={labelIconStyle} />
                  Número de documento
                </label>
                <input
                  type="number"
                  className="cm-input"
                  placeholder="Documento"
                  value={form.number_document}
                  onChange={(e) => this.handleFormChange("number_document", e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="cm-label" style={labelStyle}>
                  <i className="fa fa-user-tag" style={labelIconStyle} />
                  Rol
                </label>
                <select
                  className="cm-input"
                  value={form.rol_id}
                  onChange={(e) => this.handleFormChange("rol_id", e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Seleccione un rol</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="cm-label" style={labelStyle}>
                  <i className="fa fa-image" style={labelIconStyle} />
                  Avatar
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{
                    width: "72px",
                    height: "72px",
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: "3px solid #e2e5ea",
                    background: "#fcfcfd",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}>
                    {(this.state.avatarPreview || this.state.currentAvatarUrl) ? (
                      <img
                        src={this.state.avatarPreview || this.state.currentAvatarUrl}
                        alt="Avatar"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <i className="fas fa-user" style={{ fontSize: "28px", color: "#9ca3af" }} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      type="file"
                      className="cm-input"
                      accept="image/*"
                      onChange={this.handleAvatarChange}
                      style={{ ...inputStyle, padding: "8px" }}
                    />
                    <small style={{ color: "#6b7280", fontSize: "12px", marginTop: "4px", display: "block" }}>
                      JPG, PNG o GIF. Máximo 2MB.
                    </small>
                  </div>
                </div>
              </div>
            </div>

            {/* Password Section */}
            <div style={{
              background: "#fcfcfd",
              borderRadius: "12px",
              padding: "20px",
              marginTop: "8px"
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
                  <i className="fa fa-lock" style={{ color: "#f5a623", fontSize: "16px" }} />
                </div>
                <span style={{ fontWeight: 600, color: "#374151", fontSize: "16px" }}>
                  Contraseña {modalMode === "edit" && <span style={{ fontWeight: 400, fontSize: "13px", color: "#6b7280" }}>(dejar vacío para no cambiar)</span>}
                </span>
              </div>
              <div className="cm-form-grid-2" style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px"
              }}>
                <div>
                  <label className="cm-label" style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginBottom: "4px",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#6b7280"
                  }}>
                    <i className="fa fa-key" style={{ fontSize: "11px" }} /> Contraseña
                  </label>
                  <input
                    type="password"
                    className="cm-input"
                    placeholder="Mínimo 6 caracteres"
                    value={form.password}
                    onChange={(e) => this.handleFormChange("password", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #e2e5ea",
                      borderRadius: "6px",
                      fontSize: "13px",
                      background: "#fff"
                    }}
                  />
                </div>
                <div>
                  <label className="cm-label" style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginBottom: "4px",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#6b7280"
                  }}>
                    <i className="fa fa-check-circle" style={{ fontSize: "11px" }} /> Confirmar contraseña
                  </label>
                  <input
                    type="password"
                    className="cm-input"
                    placeholder="Confirmar"
                    value={form.password_confirmation}
                    onChange={(e) => this.handleFormChange("password_confirmation", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #e2e5ea",
                      borderRadius: "6px",
                      fontSize: "13px",
                      background: "#fff"
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="cm-modal-footer" style={{
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
              className="cm-btn cm-btn-outline"
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
              className="cm-btn cm-btn-accent"
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
                transition: "all 0.2s ease",
                border: "none",
                background: "linear-gradient(135deg, #f5a623 0%, #f7b731 100%)",
                color: "#fff",
                opacity: saving ? 0.7 : 1
              }}
            >
              {saving ? (
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

  render() {
    const { meta } = this.state;
    return (
      <React.Fragment>
        {this.props.estados.create && (
          <CmPageActions>
            <button onClick={this.openNewModal} className="cm-btn cm-btn-accent cm-btn-sm">
              <i className="fas fa-plus" /> Nuevo Usuario
            </button>
          </CmPageActions>
        )}
        <CmDataTable
          columns={this.columns}
          data={this.state.data}
          loading={this.state.loading}
          actions={this.renderActions}
          headerActions={this.renderHeaderActions()}
          onSearch={this.handleSearch}
          searchPlaceholder="Buscar usuario..."
          emptyMessage="No hay usuarios registrados"
          emptyAction={
            this.props.estados.create ? (
              <button onClick={this.openNewModal} className="cm-btn cm-btn-accent cm-btn-sm" style={{ marginTop: "8px" }}>
                <i className="fas fa-plus" /> Nuevo Usuario
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
