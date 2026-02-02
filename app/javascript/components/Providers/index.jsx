import React from "react";
import Swal from "sweetalert2/dist/sweetalert2.js";
import { CmDataTable, CmPageActions, CmModal, CmInput, CmButton } from "../../generalcomponents/ui";

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
    const icon = modalMode === "new" ? "fas fa-user-plus" : "fas fa-user-edit";
    const visibleContacts = contacts.filter((c) => !c._destroy);

    return (
      <CmModal
        isOpen={modalOpen} toggle={this.closeModal}
        title={<span><i className={icon} /> {title}</span>} size="lg"
        footer={
          <React.Fragment>
            <CmButton variant="outline" onClick={this.closeModal}>Cancelar</CmButton>
            <CmButton variant="accent" onClick={this.handleSubmit} disabled={saving}>
              {saving ? <React.Fragment><i className="fas fa-spinner fa-spin" /> Guardando...</React.Fragment> : <React.Fragment><i className="fas fa-save" /> Guardar</React.Fragment>}
            </CmButton>
          </React.Fragment>
        }
      >
        {errors.length > 0 && (
          <div className="cm-form-errors"><ul>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul></div>
        )}
        <div className="cm-form-row">
          <CmInput label="Nombre" placeholder="Nombre del proveedor" value={form.name} onChange={(e) => this.handleFormChange("name", e.target.value)} />
          <CmInput label="Email" type="email" placeholder="correo@ejemplo.com" value={form.email} onChange={(e) => this.handleFormChange("email", e.target.value)} />
          <CmInput label="Teléfono" placeholder="Teléfono" value={form.phone} onChange={(e) => this.handleFormChange("phone", e.target.value)} />
          <CmInput label="Dirección" placeholder="Dirección" value={form.address} onChange={(e) => this.handleFormChange("address", e.target.value)} />
          <CmInput label="NIT" placeholder="NIT" value={form.nit} onChange={(e) => this.handleFormChange("nit", e.target.value)} />
          <CmInput label="Web" placeholder="https://..." value={form.web} onChange={(e) => this.handleFormChange("web", e.target.value)} />
        </div>
        <div className="cm-form-section">
          <div className="cm-form-section-title">
            <span><i className="fas fa-address-book" style={{ marginRight: 6 }} /> Contactos ({visibleContacts.length})</span>
          </div>
          {contacts.map((contact, index) => {
            if (contact._destroy) return null;
            return (
              <div key={index} className="cm-form-section-item">
                <button type="button" className="cm-form-section-remove" onClick={() => this.removeContact(index)} title="Eliminar contacto">
                  <i className="fas fa-times" />
                </button>
                <div className="cm-form-row">
                  <CmInput label="Nombre" placeholder="Nombre" value={contact.name} onChange={(e) => this.handleContactChange(index, "name", e.target.value)} />
                  <CmInput label="Celular" placeholder="Celular" value={contact.phone} onChange={(e) => this.handleContactChange(index, "phone", e.target.value)} />
                  <CmInput label="Email" type="email" placeholder="Email" value={contact.email} onChange={(e) => this.handleContactChange(index, "email", e.target.value)} />
                  <CmInput label="Cargo" placeholder="Cargo" value={contact.position} onChange={(e) => this.handleContactChange(index, "position", e.target.value)} />
                </div>
              </div>
            );
          })}
          <button type="button" className="cm-form-add-btn" onClick={this.addContact}>
            <i className="fas fa-plus" /> Agregar contacto
          </button>
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
