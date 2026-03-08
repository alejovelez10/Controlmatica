import React from "react";
import Swal from "sweetalert2";
import { CmDataTable, CmPageActions } from "../../generalcomponents/ui";
import { Modal } from "reactstrap";

const EMPTY_FORM = { name: "", email: "", nit: "", phone: "", address: "", web: "" };
const EMPTY_CONTACT = { name: "", phone: "", email: "", position: "" };


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
      importDropdownOpen: false,
    };

    this.columns = [
      { key: "name", label: "Nombre" },
      { key: "nit", label: "Nit" },
      { key: "phone", label: "Teléfono" },
      { key: "email", label: "Email" },
      { key: "address", label: "Dirección" },
      { key: "web", label: "Web" },
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
          Swal.fire({ position: "center", icon: "success", title: data.message, showConfirmButton: false, timer: 1500 });
        } else {
          this.setState({ errors: data.errors || ["Error al guardar"], saving: false });
        }
      })
      .catch(() => { this.setState({ errors: ["Error de conexión"], saving: false }); });
  };

  delete = (id) => {
    Swal.fire({
      title: "¿Estás seguro?", text: "El registro será eliminado permanentemente",
      icon: "warning", showCancelButton: true,
      confirmButtonColor: "#2a3f53", cancelButtonColor: "#dc3545",
      confirmButtonText: "Sí, eliminar", cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.value) {
        fetch("/providers/" + id, { method: "delete", headers: { "X-CSRF-Token": csrfToken() } })
          .then((response) => response.json())
          .then(() => {
            this.loadData();
            Swal.fire({ title: "Eliminado", text: "El registro fue eliminado con éxito", icon: "success", confirmButtonColor: "#2a3f53" });
          });
      }
    });
  };

  messageSuccess = (response) => {
    Swal.fire({ position: "center", icon: "success", title: `${response.success}`, showConfirmButton: false, timer: 1500 });
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

  toggleImportDropdown = (e) => {
    if (e) e.stopPropagation();
    this.setState((prev) => ({ importDropdownOpen: !prev.importDropdownOpen }));
  };

  closeImportDropdown = () => {
    this.setState({ importDropdownOpen: false });
  };

  componentDidUpdate(prevProps, prevState) {
    if (this.state.importDropdownOpen && !prevState.importDropdownOpen) {
      document.addEventListener("click", this.closeImportDropdown);
    } else if (!this.state.importDropdownOpen && prevState.importDropdownOpen) {
      document.removeEventListener("click", this.closeImportDropdown);
    }
  }

  componentWillUnmount() {
    document.removeEventListener("click", this.closeImportDropdown);
  }

  renderHeaderActions = () => {
    const { estados } = this.props;
    const { importDropdownOpen } = this.state;
    return (
      <React.Fragment>
        {estados.download_file && (
          <a href="/download_file/providers.xls" target="_blank" className="cm-btn cm-btn-outline cm-btn-sm">
            <i className="fas fa-file-excel" /> Exportar
          </a>
        )}
        <div className={`cm-dropdown ${importDropdownOpen ? "open" : ""}`}>
          <button
            className="cm-btn cm-btn-outline cm-btn-sm"
            type="button"
            onClick={this.toggleImportDropdown}
          >
            <i className="fas fa-upload" /> Importar <i className="fas fa-chevron-down" style={{ fontSize: 10, marginLeft: 4 }} />
          </button>
          <div className="cm-dropdown-menu">
            <a
              className="cm-dropdown-item"
              href="https://mybc1.s3.amazonaws.com/uploads/rseguimiento/evidencia/701/FORMATO_SUBIR_PROVEEDORES.xlsx"
              onClick={this.closeImportDropdown}
            >
              <i className="fas fa-file-download" /> Descargar formato
            </a>
            <div className="cm-dropdown-divider" />
            <label
              className="cm-dropdown-item"
              htmlFor="providerFile"
              onClick={this.closeImportDropdown}
            >
              <i className="fas fa-file-upload" /> Cargar archivo
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
      <Modal isOpen={modalOpen} toggle={this.closeModal} className="modal-lg modal-dialog-centered">
        <div className="cm-modal-container">
          <div className="cm-modal-header">
            <div className="cm-modal-header-content">
              <div className="cm-modal-icon"><i className="fas fa-truck" /></div>
              <div>
                <h2 className="cm-modal-title">{title}</h2>
                <p className="cm-modal-subtitle">
                  {modalMode === "new" ? "Complete los datos del nuevo proveedor" : "Modifique los datos del proveedor"}
                </p>
              </div>
            </div>
            <button type="button" className="cm-modal-close" onClick={this.closeModal}><i className="fas fa-times" /></button>
          </div>

          <div className="cm-modal-body cm-modal-scroll">
            {errors.length > 0 && (
              <div className="cm-alert cm-alert-danger">
                <ul style={{ margin: 0, paddingLeft: "20px" }}>
                  {errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            <div className="cm-form-grid-2">
              <div className="cm-form-group">
                <label className="cm-label"><i className="fa fa-building" /> Nombre</label>
                <input
                  type="text"
                  className="cm-input"
                  placeholder="Nombre del proveedor"
                  value={form.name}
                  onChange={(e) => this.handleFormChange("name", e.target.value)}
                />
              </div>
              <div className="cm-form-group">
                <label className="cm-label"><i className="fa fa-envelope" /> Email</label>
                <input
                  type="email"
                  className="cm-input"
                  placeholder="correo@ejemplo.com"
                  value={form.email}
                  onChange={(e) => this.handleFormChange("email", e.target.value)}
                />
              </div>
              <div className="cm-form-group">
                <label className="cm-label"><i className="fa fa-phone" /> Telefono</label>
                <input
                  type="text"
                  className="cm-input"
                  placeholder="Telefono"
                  value={form.phone}
                  onChange={(e) => this.handleFormChange("phone", e.target.value)}
                />
              </div>
              <div className="cm-form-group">
                <label className="cm-label"><i className="fa fa-map-marker-alt" /> Direccion</label>
                <input
                  type="text"
                  className="cm-input"
                  placeholder="Direccion"
                  value={form.address}
                  onChange={(e) => this.handleFormChange("address", e.target.value)}
                />
              </div>
              <div className="cm-form-group">
                <label className="cm-label"><i className="fa fa-id-card" /> NIT</label>
                <input
                  type="text"
                  className="cm-input"
                  placeholder="NIT"
                  value={form.nit}
                  onChange={(e) => this.handleFormChange("nit", e.target.value)}
                />
              </div>
              <div className="cm-form-group">
                <label className="cm-label"><i className="fa fa-globe" /> Web</label>
                <input
                  type="text"
                  className="cm-input"
                  placeholder="https://..."
                  value={form.web}
                  onChange={(e) => this.handleFormChange("web", e.target.value)}
                />
              </div>
            </div>

            <div className="cm-contacts-section">
              <div className="cm-contacts-header">
                <div className="cm-contacts-title">
                  <div className="cm-contacts-icon"><i className="fa fa-address-book" /></div>
                  <span style={{ fontWeight: 600, color: "#374151", fontSize: "16px" }}>
                    Contactos ({visibleContacts.length})
                  </span>
                </div>
                <button type="button" className="cm-btn cm-btn-outline cm-btn-sm" onClick={this.addContact}>
                  <i className="fa fa-plus" /> Agregar
                </button>
              </div>

              {contacts.map((contact, index) => {
                if (contact._destroy) return null;
                return (
                  <div key={index} className="cm-contact-card">
                    <button type="button" className="cm-contact-remove" onClick={() => this.removeContact(index)} title="Eliminar contacto">
                      <i className="fa fa-trash-alt" />
                    </button>
                    <div className="cm-form-grid-2">
                      <div className="cm-form-group">
                        <label className="cm-label"><i className="fa fa-user" /> Nombre</label>
                        <input
                          type="text"
                          className="cm-input"
                          placeholder="Nombre"
                          value={contact.name}
                          onChange={(e) => this.handleContactChange(index, "name", e.target.value)}
                        />
                      </div>
                      <div className="cm-form-group">
                        <label className="cm-label"><i className="fa fa-mobile-alt" /> Celular</label>
                        <input
                          type="text"
                          className="cm-input"
                          placeholder="Celular"
                          value={contact.phone}
                          onChange={(e) => this.handleContactChange(index, "phone", e.target.value)}
                        />
                      </div>
                      <div className="cm-form-group">
                        <label className="cm-label"><i className="fa fa-envelope" /> Email</label>
                        <input
                          type="email"
                          className="cm-input"
                          placeholder="Email"
                          value={contact.email}
                          onChange={(e) => this.handleContactChange(index, "email", e.target.value)}
                        />
                      </div>
                      <div className="cm-form-group">
                        <label className="cm-label"><i className="fa fa-briefcase" /> Cargo</label>
                        <input
                          type="text"
                          className="cm-input"
                          placeholder="Cargo"
                          value={contact.position}
                          onChange={(e) => this.handleContactChange(index, "position", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {visibleContacts.length === 0 && (
                <div className="cm-contacts-empty">
                  <i className="fa fa-users" style={{ fontSize: "24px", marginBottom: "8px", display: "block", opacity: 0.5 }} />
                  No hay contactos agregados
                </div>
              )}
            </div>
          </div>

          <div className="cm-modal-footer">
            <button type="button" className="cm-btn cm-btn-cancel" onClick={this.closeModal}>
              <i className="fas fa-times" /> Cancelar
            </button>
            <button type="button" className="cm-btn cm-btn-submit" onClick={this.handleSubmit} disabled={saving}>
              {saving ? (
                <React.Fragment><i className="fas fa-spinner fa-spin" /> Guardando...</React.Fragment>
              ) : (
                <React.Fragment><i className="fas fa-save" /> Guardar</React.Fragment>
              )}
            </button>
          </div>
        </div>
      </Modal>
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
