import React from "react";
import Swal from "sweetalert2/dist/sweetalert2.js";
import { CmDataTable, CmPageActions, CmModal } from "../../generalcomponents/ui";

const EMPTY_FORM = { name: "", email: "", nit: "", phone: "", address: "", web: "" };
const EMPTY_CONTACT = { name: "", phone: "", email: "", position: "" };

const selectStyles = {
  control: (base, state) => ({
    ...base,
    background: "#f8f9fa",
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
      submitBtnFile: false,
      file: null,
      searchTerm: "",
      sortKey: null,
      sortDir: "asc",
      meta: { total: 0, page: 1, per_page: 10, total_pages: 1 },
      // Modal
      modalOpen: false,
      modalMode: "new",
      editId: null,
      form: { ...EMPTY_FORM },
      contacts: [],
      errors: [],
      saving: false,
    };

    this.columns = [
      { key: "name", label: "Nombre" },
      { key: "phone", label: "Teléfono" },
      { key: "address", label: "Dirección" },
      { key: "nit", label: "Nit" },
      { key: "web", label: "Web" },
      { key: "email", label: "Email" },
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

    let url = `/get_providers?page=${p}&per_page=${pp}`;
    if (term) url += `&name=${encodeURIComponent(term)}`;
    if (sk) url += `&sort=${encodeURIComponent(sk)}&dir=${sd}`;

    fetch(url)
      .then((response) => response.json())
      .then((result) => {
        this.setState({ data: result.data, meta: result.meta, loading: false });
      });
  };

  handleSearch = (term) => {
    this.setState({ searchTerm: term }, () => {
      this.loadData(1, this.state.meta.per_page, term);
    });
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
      form: { ...EMPTY_FORM }, contacts: [], errors: [], saving: false,
    });
  };

  openEditModal = (id) => {
    this.setState({ modalOpen: true, modalMode: "edit", editId: id, errors: [], saving: false });
    fetch(`/providers/${id}.json`)
      .then((r) => r.json())
      .then((data) => {
        this.setState({
          form: {
            name: data.name || "", email: data.email || "", nit: data.nit || "",
            phone: data.phone || "", address: data.address || "", web: data.web || "",
          },
          contacts: (data.contacts || []).map((c) => ({
            id: c.id, name: c.name || "", phone: c.phone || "",
            email: c.email || "", position: c.position || "",
          })),
        });
      });
  };

  closeModal = () => { this.setState({ modalOpen: false }); };
  handleFormChange = (field, value) => {
    this.setState((prev) => ({ form: { ...prev.form, [field]: value } }));
  };

  addContact = () => {
    this.setState((prev) => ({ contacts: [...prev.contacts, { ...EMPTY_CONTACT }] }));
  };

  removeContact = (index) => {
    this.setState((prev) => {
      const contact = prev.contacts[index];
      if (contact.id) {
        const updated = [...prev.contacts];
        updated[index] = { ...contact, _destroy: true };
        return { contacts: updated };
      }
      return { contacts: prev.contacts.filter((_, i) => i !== index) };
    });
  };

  handleContactChange = (index, field, value) => {
    this.setState((prev) => {
      const contacts = [...prev.contacts];
      contacts[index] = { ...contacts[index], [field]: value };
      return { contacts };
    });
  };

  handleSubmit = () => {
    const { form, contacts, modalMode, editId } = this.state;
    const contactsAttributes = {};
    contacts.forEach((c, i) => {
      const entry = { name: c.name, phone: c.phone, email: c.email, position: c.position };
      if (c.id) entry.id = c.id;
      if (c._destroy) entry._destroy = "1";
      contactsAttributes[i] = entry;
    });

    const body = { provider: { ...form, contacts_attributes: contactsAttributes } };
    const isNew = modalMode === "new";
    const url = isNew ? "/providers" : `/providers/${editId}`;
    const method = isNew ? "POST" : "PATCH";

    this.setState({ saving: true, errors: [] });

    fetch(`${url}.json`, {
      method,
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() },
      body: JSON.stringify(body),
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (ok) {
          this.closeModal();
          this.loadData(isNew ? 1 : undefined);
          Swal.fire({ position: "center", type: "success", title: data.message, showConfirmButton: false, timer: 1500 });
        } else {
          this.setState({ errors: data.errors || ["Error al guardar"], saving: false });
        }
      })
      .catch(() => { this.setState({ errors: ["Error de conexión"], saving: false }); });
  };

  delete = (id) => {
    Swal.fire({
      title: "¿Estás seguro?", text: "El registro será eliminado permanentemente",
      type: "warning", showCancelButton: true,
      confirmButtonColor: "#2a3f53", cancelButtonColor: "#dc3545",
      confirmButtonText: "Sí, eliminar", cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.value) {
        fetch("/providers/" + id, { method: "delete", headers: { "X-CSRF-Token": csrfToken() } })
          .then((response) => response.json())
          .then(() => {
            this.loadData();
            Swal.fire("Eliminado", "El registro fue eliminado con éxito", "success");
          });
      }
    });
  };

  messageSuccess = (response) => {
    Swal.fire({ position: "center", type: "success", title: `${response.success}`, showConfirmButton: false, timer: 1500 });
  };

  uploadExel = (e) => { this.setState({ file: e.target.files[0], submitBtnFile: true }); };

  handleClickUpload = () => {
    const formData = new FormData();
    formData.append("file", this.state.file);
    fetch(`/import_providers`, { method: "POST", body: formData, headers: { "X-CSRF-Token": csrfToken() } })
      .then((res) => res.json())
      .catch((error) => console.error("Error:", error))
      .then((data) => {
        this.loadData(1);
        this.messageSuccess(data);
        this.setState({ submitBtnFile: false });
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
            <button onClick={() => this.openEditModal(row.id)} className="cm-dt-menu-item">
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
          <a href="/download_file/providers.xls" target="_blank" className="cm-btn cm-btn-outline cm-btn-sm">
            <i className="fas fa-file-excel" /> Exportar
          </a>
        )}
        <div className="dropdown">
          <button className="cm-btn cm-btn-outline cm-btn-sm dropdown-toggle" type="button" data-toggle="dropdown">
            <i className="fas fa-upload" /> Importar
          </button>
          <div className="dropdown-menu dropdown-menu-right">
            <a className="dropdown-item" href="https://mybc1.s3.amazonaws.com/uploads/rseguimiento/evidencia/701/FORMATO_SUBIR_PROVEEDORES.xlsx">
              Descargar formato
            </a>
            <label className="dropdown-item" htmlFor="providerFile" style={{ cursor: "pointer", marginBottom: 0 }}>
              Cargar archivo
            </label>
          </div>
        </div>
        <input type="file" id="providerFile" onChange={(e) => this.uploadExel(e)} style={{ display: "none" }} />
        {this.state.submitBtnFile && (
          <button onClick={() => this.handleClickUpload()} className="cm-btn cm-btn-primary cm-btn-sm">
            Subir <i className="fas fa-file-upload" />
          </button>
        )}
      </React.Fragment>
    );
  };

  renderModal = () => {
    const { modalOpen, modalMode, form, contacts, errors, saving } = this.state;
    const title = modalMode === "new" ? "Nuevo Proveedor" : "Editar Proveedor";
    const visibleContacts = contacts.filter((c) => !c._destroy);

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
          {/* Header - Same style as CustomerReports */}
          <div className="cm-modal-header" style={{
            background: "#f8f9fa",
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
                <i className="fas fa-truck" style={{ color: "#fff", fontSize: "20px" }} />
              </div>
              <div className="cm-modal-header-text">
                <h2 className="cm-modal-title" style={{ margin: "0 0 2px 0", fontSize: "18px", fontWeight: 600, color: "#333" }}>{title}</h2>
                <p className="cm-modal-subtitle" style={{ margin: 0, fontSize: "12px", color: "#6c757d" }}>
                  {modalMode === "new" ? "Complete los datos del nuevo proveedor" : "Modifique los datos del proveedor"}
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

            {/* Provider Info Section */}
            <div className="cm-form-grid-2" style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "24px"
            }}>
              <div>
                <label className="cm-label" style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "6px",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#374151"
                }}>
                  <i className="fa fa-building" style={{ color: "#6b7280", fontSize: "12px" }} />
                  Nombre
                </label>
                <input
                  type="text"
                  className="cm-input"
                  placeholder="Nombre del proveedor"
                  value={form.name}
                  onChange={(e) => this.handleFormChange("name", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #e2e5ea",
                    borderRadius: "8px",
                    fontSize: "14px",
                    background: "#f8f9fa",
                    transition: "all 0.2s",
                    outline: "none"
                  }}
                />
              </div>
              <div>
                <label className="cm-label" style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "6px",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#374151"
                }}>
                  <i className="fa fa-envelope" style={{ color: "#6b7280", fontSize: "12px" }} />
                  Email
                </label>
                <input
                  type="email"
                  className="cm-input"
                  placeholder="correo@ejemplo.com"
                  value={form.email}
                  onChange={(e) => this.handleFormChange("email", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #e2e5ea",
                    borderRadius: "8px",
                    fontSize: "14px",
                    background: "#f8f9fa",
                    transition: "all 0.2s",
                    outline: "none"
                  }}
                />
              </div>
              <div>
                <label className="cm-label" style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "6px",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#374151"
                }}>
                  <i className="fa fa-phone" style={{ color: "#6b7280", fontSize: "12px" }} />
                  Telefono
                </label>
                <input
                  type="text"
                  className="cm-input"
                  placeholder="Telefono"
                  value={form.phone}
                  onChange={(e) => this.handleFormChange("phone", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #e2e5ea",
                    borderRadius: "8px",
                    fontSize: "14px",
                    background: "#f8f9fa",
                    transition: "all 0.2s",
                    outline: "none"
                  }}
                />
              </div>
              <div>
                <label className="cm-label" style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "6px",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#374151"
                }}>
                  <i className="fa fa-map-marker-alt" style={{ color: "#6b7280", fontSize: "12px" }} />
                  Direccion
                </label>
                <input
                  type="text"
                  className="cm-input"
                  placeholder="Direccion"
                  value={form.address}
                  onChange={(e) => this.handleFormChange("address", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #e2e5ea",
                    borderRadius: "8px",
                    fontSize: "14px",
                    background: "#f8f9fa",
                    transition: "all 0.2s",
                    outline: "none"
                  }}
                />
              </div>
              <div>
                <label className="cm-label" style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "6px",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#374151"
                }}>
                  <i className="fa fa-id-card" style={{ color: "#6b7280", fontSize: "12px" }} />
                  NIT
                </label>
                <input
                  type="text"
                  className="cm-input"
                  placeholder="NIT"
                  value={form.nit}
                  onChange={(e) => this.handleFormChange("nit", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #e2e5ea",
                    borderRadius: "8px",
                    fontSize: "14px",
                    background: "#f8f9fa",
                    transition: "all 0.2s",
                    outline: "none"
                  }}
                />
              </div>
              <div>
                <label className="cm-label" style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "6px",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#374151"
                }}>
                  <i className="fa fa-globe" style={{ color: "#6b7280", fontSize: "12px" }} />
                  Web
                </label>
                <input
                  type="text"
                  className="cm-input"
                  placeholder="https://..."
                  value={form.web}
                  onChange={(e) => this.handleFormChange("web", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #e2e5ea",
                    borderRadius: "8px",
                    fontSize: "14px",
                    background: "#f8f9fa",
                    transition: "all 0.2s",
                    outline: "none"
                  }}
                />
              </div>
            </div>

            {/* Contacts Section */}
            <div style={{
              background: "#f8f9fa",
              borderRadius: "12px",
              padding: "20px",
              marginTop: "8px"
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "rgba(245, 166, 35, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <i className="fa fa-address-book" style={{ color: "#f5a623", fontSize: "16px" }} />
                  </div>
                  <span style={{ fontWeight: 600, color: "#374151", fontSize: "16px" }}>
                    Contactos ({visibleContacts.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={this.addContact}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 14px",
                    background: "#fff",
                    border: "1px solid #e2e5ea",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#374151",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  <i className="fa fa-plus" style={{ fontSize: "11px" }} /> Agregar
                </button>
              </div>

              {contacts.map((contact, index) => {
                if (contact._destroy) return null;
                return (
                  <div key={index} style={{
                    background: "#fff",
                    borderRadius: "10px",
                    padding: "16px",
                    marginBottom: "12px",
                    border: "1px solid #e2e5ea",
                    position: "relative"
                  }}>
                    <button
                      type="button"
                      onClick={() => this.removeContact(index)}
                      title="Eliminar contacto"
                      style={{
                        position: "absolute",
                        top: "12px",
                        right: "12px",
                        width: "28px",
                        height: "28px",
                        borderRadius: "6px",
                        border: "none",
                        background: "#fef2f2",
                        color: "#dc2626",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s"
                      }}
                    >
                      <i className="fa fa-times" style={{ fontSize: "12px" }} />
                    </button>
                    <div className="cm-form-grid-2" style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "12px"
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
                          <i className="fa fa-user" style={{ fontSize: "11px" }} /> Nombre
                        </label>
                        <input
                          type="text"
                          className="cm-input"
                          placeholder="Nombre"
                          value={contact.name}
                          onChange={(e) => this.handleContactChange(index, "name", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            border: "1px solid #e2e5ea",
                            borderRadius: "6px",
                            fontSize: "13px",
                            background: "#f8f9fa"
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
                          <i className="fa fa-mobile-alt" style={{ fontSize: "11px" }} /> Celular
                        </label>
                        <input
                          type="text"
                          className="cm-input"
                          placeholder="Celular"
                          value={contact.phone}
                          onChange={(e) => this.handleContactChange(index, "phone", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            border: "1px solid #e2e5ea",
                            borderRadius: "6px",
                            fontSize: "13px",
                            background: "#f8f9fa"
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
                          <i className="fa fa-envelope" style={{ fontSize: "11px" }} /> Email
                        </label>
                        <input
                          type="email"
                          className="cm-input"
                          placeholder="Email"
                          value={contact.email}
                          onChange={(e) => this.handleContactChange(index, "email", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            border: "1px solid #e2e5ea",
                            borderRadius: "6px",
                            fontSize: "13px",
                            background: "#f8f9fa"
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
                          <i className="fa fa-briefcase" style={{ fontSize: "11px" }} /> Cargo
                        </label>
                        <input
                          type="text"
                          className="cm-input"
                          placeholder="Cargo"
                          value={contact.position}
                          onChange={(e) => this.handleContactChange(index, "position", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            border: "1px solid #e2e5ea",
                            borderRadius: "6px",
                            fontSize: "13px",
                            background: "#f8f9fa"
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {visibleContacts.length === 0 && (
                <div style={{
                  textAlign: "center",
                  padding: "24px",
                  color: "#9ca3af",
                  fontSize: "14px"
                }}>
                  <i className="fa fa-users" style={{ fontSize: "24px", marginBottom: "8px", display: "block", opacity: 0.5 }} />
                  No hay contactos agregados
                </div>
              )}
            </div>
          </div>

          {/* Footer - Same style as CustomerReports */}
          <div className="cm-modal-footer" style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            padding: "16px 32px",
            background: "#f8f9fa",
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
              <i className="fas fa-plus" /> Nuevo Proveedor
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
          searchPlaceholder="Buscar proveedor..."
          emptyMessage="No hay proveedores registrados"
          emptyAction={
            this.props.estados.create ? (
              <button onClick={this.openNewModal} className="cm-btn cm-btn-accent cm-btn-sm" style={{ marginTop: "8px" }}>
                <i className="fas fa-plus" /> Nuevo Proveedor
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
