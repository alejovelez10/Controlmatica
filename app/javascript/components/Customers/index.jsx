import React from "react";
import Swal from "sweetalert2";
import { CmDataTable, CmPageActions, CmModal, CmButton } from "../../generalcomponents/ui";

const EMPTY_FORM = { name: "", email: "", nit: "", phone: "", address: "", code: "", web: "" };
const EMPTY_CONTACT = { name: "", phone: "", email: "", position: "" };

// Modern select styles for react-select components
const selectStyles = {
  control: (base, state) => ({
    ...base,
    background: "#fcfcfd",
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

// Embedded styles for modern form
const modalStyles = {
  header: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontSize: "18px",
    fontWeight: "600",
    color: "#2a3f53",
  },
  headerIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    background: "linear-gradient(135deg, #f5a623 0%, #f7b84b 100%)",
    color: "#fff",
    fontSize: "18px",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "16px",
    marginBottom: "20px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    fontWeight: "500",
    color: "#495057",
  },
  labelIcon: {
    color: "#6c757d",
    fontSize: "12px",
    width: "14px",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #e2e5ea",
    borderRadius: "8px",
    fontSize: "14px",
    background: "#fcfcfd",
    transition: "all 0.2s ease",
    outline: "none",
    boxSizing: "border-box",
  },
  sectionTitle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 0",
    marginTop: "8px",
    marginBottom: "16px",
    borderBottom: "2px solid #f5a623",
    fontSize: "15px",
    fontWeight: "600",
    color: "#2a3f53",
  },
  sectionIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    background: "#fff3e0",
    color: "#f5a623",
    marginRight: "10px",
    fontSize: "13px",
  },
  contactCard: {
    position: "relative",
    background: "#fcfcfd",
    borderRadius: "10px",
    padding: "16px",
    marginBottom: "12px",
    border: "1px solid #e2e5ea",
  },
  removeBtn: {
    position: "absolute",
    top: "8px",
    right: "8px",
    width: "26px",
    height: "26px",
    borderRadius: "50%",
    border: "none",
    background: "#fee2e2",
    color: "#dc3545",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    transition: "all 0.2s ease",
  },
  addBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    width: "100%",
    padding: "12px",
    border: "2px dashed #e2e5ea",
    borderRadius: "10px",
    background: "transparent",
    color: "#6c757d",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    paddingTop: "16px",
    borderTop: "1px solid #e9ecef",
  },
  cancelBtn: {
    padding: "10px 20px",
    border: "1px solid #e2e5ea",
    borderRadius: "8px",
    background: "#fff",
    color: "#6c757d",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  saveBtn: {
    padding: "10px 24px",
    border: "none",
    borderRadius: "8px",
    background: "linear-gradient(135deg, #f5a623 0%, #f7b84b 100%)",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transition: "all 0.2s ease",
  },
  saveBtnDisabled: {
    opacity: 0.7,
    cursor: "not-allowed",
  },
  errorBox: {
    background: "#fee2e2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    padding: "12px 16px",
    marginBottom: "16px",
    color: "#dc3545",
    fontSize: "13px",
  },
  errorList: {
    margin: 0,
    paddingLeft: "20px",
  },
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
      importDropdownOpen: false,
    };

    this.columns = [
      { key: "name", label: "Nombre" },
      { key: "code", label: "Prefijo" },
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

  // ─── Data Loading ───

  loadData = (page, perPage, searchTerm, sortKey, sortDir) => {
    const p = page || this.state.meta.page;
    const pp = perPage || this.state.meta.per_page;
    const term = searchTerm !== undefined ? searchTerm : this.state.searchTerm;
    const sk = sortKey !== undefined ? sortKey : this.state.sortKey;
    const sd = sortDir !== undefined ? sortDir : this.state.sortDir;

    this.setState({ loading: true });

    let url = `/get_customers?page=${p}&per_page=${pp}`;
    if (term) url += `&name=${encodeURIComponent(term)}`;
    if (sk) url += `&sort=${encodeURIComponent(sk)}&dir=${sd}`;

    fetch(url)
      .then((response) => response.json())
      .then((result) => {
        this.setState({
          data: result.data,
          meta: result.meta,
          loading: false,
        });
      });
  };

  handleSearch = (term) => {
    this.setState({ searchTerm: term }, () => {
      this.loadData(1, this.state.meta.per_page, term);
    });
  };

  handlePageChange = (page) => {
    this.loadData(page, this.state.meta.per_page);
  };

  handlePerPageChange = (perPage) => {
    this.loadData(1, perPage);
  };

  handleSort = (key, dir) => {
    this.setState({ sortKey: key, sortDir: dir }, () => {
      this.loadData(1, this.state.meta.per_page, undefined, key, dir);
    });
  };

  // ─── Modal ───

  openNewModal = () => {
    this.setState({
      modalOpen: true,
      modalMode: "new",
      editId: null,
      form: { ...EMPTY_FORM },
      contacts: [],
      errors: [],
      saving: false,
    });
  };

  openEditModal = (id) => {
    this.setState({ modalOpen: true, modalMode: "edit", editId: id, errors: [], saving: false });
    fetch(`/customers/${id}.json`)
      .then((r) => r.json())
      .then((data) => {
        this.setState({
          form: {
            name: data.name || "",
            email: data.email || "",
            nit: data.nit || "",
            phone: data.phone || "",
            address: data.address || "",
            code: data.code || "",
            web: data.web || "",
          },
          contacts: (data.contacts || []).map((c) => ({
            id: c.id,
            name: c.name || "",
            phone: c.phone || "",
            email: c.email || "",
            position: c.position || "",
          })),
        });
      });
  };

  closeModal = () => {
    this.setState({ modalOpen: false });
  };

  handleFormChange = (field, value) => {
    this.setState((prev) => ({ form: { ...prev.form, [field]: value } }));
  };

  // ─── Contacts ───

  addContact = () => {
    this.setState((prev) => ({ contacts: [...prev.contacts, { ...EMPTY_CONTACT }] }));
  };

  removeContact = (index) => {
    this.setState((prev) => {
      const contact = prev.contacts[index];
      if (contact.id) {
        // Mark for destruction
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

  // ─── Submit ───

  handleSubmit = () => {
    const { form, contacts, modalMode, editId } = this.state;

    const contactsAttributes = {};
    contacts.forEach((c, i) => {
      const entry = { name: c.name, phone: c.phone, email: c.email, position: c.position };
      if (c.id) entry.id = c.id;
      if (c._destroy) entry._destroy = "1";
      contactsAttributes[i] = entry;
    });

    const body = {
      customer: {
        ...form,
        contacts_attributes: contactsAttributes,
      },
    };

    const isNew = modalMode === "new";
    const url = isNew ? "/customers" : `/customers/${editId}`;
    const method = isNew ? "POST" : "PATCH";

    this.setState({ saving: true, errors: [] });

    fetch(`${url}.json`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken(),
      },
      body: JSON.stringify(body),
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (ok) {
          this.closeModal();
          this.loadData(isNew ? 1 : undefined);
          Swal.fire({
            position: "center",
            icon: "success",
            title: data.message,
            showConfirmButton: false,
            timer: 1500,
          });
        } else {
          this.setState({ errors: data.errors || ["Error al guardar"], saving: false });
        }
      })
      .catch(() => {
        this.setState({ errors: ["Error de conexión"], saving: false });
      });
  };

  // ─── Delete ───

  delete = (id) => {
    Swal.fire({
      title: "¿Estás seguro?",
      text: "El registro será eliminado permanentemente",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#2a3f53",
      cancelButtonColor: "#dc3545",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.value) {
        fetch("/customers/" + id, {
          method: "delete",
          headers: { "X-CSRF-Token": csrfToken() },
        })
          .then((response) => response.json())
          .then(() => {
            this.loadData();
            Swal.fire({ title: "Eliminado", text: "El registro fue eliminado con éxito", icon: "success", confirmButtonColor: "#2a3f53" });
          });
      }
    });
  };

  // ─── Upload ───

  messageSuccess = (response) => {
    Swal.fire({
      position: "center",
      icon: "success",
      title: `${response.success}`,
      showConfirmButton: false,
      timer: 1500,
    });
  };

  uploadExel = (e) => {
    this.setState({ file: e.target.files[0], submitBtnFile: true });
  };

  handleClickUpload = () => {
    const formData = new FormData();
    formData.append("file", this.state.file);
    fetch(`/import_customers`, {
      method: "POST",
      body: formData,
      headers: { "X-CSRF-Token": csrfToken() },
    })
      .then((res) => res.json())
      .catch((error) => console.error("Error:", error))
      .then((data) => {
        this.loadData(1);
        this.messageSuccess(data);
        this.setState({ submitBtnFile: false });
      });
  };

  // ─── Renders ───

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
          <a href="/download_file/customers.xls" target="_blank" className="cm-btn cm-btn-outline cm-btn-sm">
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
              href="https://mybc1.s3.amazonaws.com/uploads/rseguimiento/evidencia/700/FORMATO_SUBIR_CLIENTES.xlsx"
              onClick={this.closeImportDropdown}
            >
              <i className="fas fa-file-download" /> Descargar formato
            </a>
            <div className="cm-dropdown-divider" />
            <label
              className="cm-dropdown-item"
              htmlFor="customerFile"
              onClick={this.closeImportDropdown}
            >
              <i className="fas fa-file-upload" /> Cargar archivo
            </label>
          </div>
        </div>

        <input
          type="file"
          id="customerFile"
          onChange={(e) => this.uploadExel(e)}
          style={{ display: "none" }}
        />

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
    const isNew = modalMode === "new";
    const titleText = isNew ? "Nuevo Cliente" : "Editar Cliente";
    const subtitleText = isNew ? "Complete los datos del nuevo cliente" : "Modifique los datos del cliente";

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
                <i className="fas fa-building" style={{ color: "#fff", fontSize: "20px" }} />
              </div>
              <div className="cm-modal-header-text">
                <h2 className="cm-modal-title" style={{ margin: "0 0 2px 0", fontSize: "18px", fontWeight: 600, color: "#333" }}>{titleText}</h2>
                <p className="cm-modal-subtitle" style={{ margin: 0, fontSize: "12px", color: "#6c757d" }}>{subtitleText}</p>
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

          {/* Body - Scrollable */}
          <div className="cm-modal-body-scroll" style={{
            padding: "24px 32px",
            flex: 1,
            overflowY: "auto"
          }}>
        {/* Error messages */}
        {errors.length > 0 && (
          <div style={modalStyles.errorBox}>
            <ul style={modalStyles.errorList}>
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        {/* Main form fields - 2 column grid */}
        <div style={modalStyles.formGrid} className="cm-form-grid-2">
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label} className="cm-label">
              <i className="fas fa-user" style={modalStyles.labelIcon} />
              Nombre
            </label>
            <input
              type="text"
              style={modalStyles.input}
              className="cm-input"
              placeholder="Nombre del cliente"
              value={form.name}
              onChange={(e) => this.handleFormChange("name", e.target.value)}
            />
          </div>

          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label} className="cm-label">
              <i className="fas fa-envelope" style={modalStyles.labelIcon} />
              Email
            </label>
            <input
              type="email"
              style={modalStyles.input}
              className="cm-input"
              placeholder="correo@ejemplo.com"
              value={form.email}
              onChange={(e) => this.handleFormChange("email", e.target.value)}
            />
          </div>

          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label} className="cm-label">
              <i className="fas fa-phone" style={modalStyles.labelIcon} />
              Teléfono
            </label>
            <input
              type="text"
              style={modalStyles.input}
              className="cm-input"
              placeholder="Teléfono"
              value={form.phone}
              onChange={(e) => this.handleFormChange("phone", e.target.value)}
            />
          </div>

          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label} className="cm-label">
              <i className="fas fa-map-marker-alt" style={modalStyles.labelIcon} />
              Dirección
            </label>
            <input
              type="text"
              style={modalStyles.input}
              className="cm-input"
              placeholder="Dirección"
              value={form.address}
              onChange={(e) => this.handleFormChange("address", e.target.value)}
            />
          </div>

          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label} className="cm-label">
              <i className="fas fa-id-card" style={modalStyles.labelIcon} />
              NIT
            </label>
            <input
              type="text"
              style={modalStyles.input}
              className="cm-input"
              placeholder="NIT"
              value={form.nit}
              onChange={(e) => this.handleFormChange("nit", e.target.value)}
            />
          </div>

          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label} className="cm-label">
              <i className="fas fa-tag" style={modalStyles.labelIcon} />
              Prefijo
            </label>
            <input
              type="text"
              style={modalStyles.input}
              className="cm-input"
              placeholder="Ej: RTC"
              value={form.code}
              onChange={(e) => this.handleFormChange("code", e.target.value)}
              maxLength={4}
            />
          </div>

          <div style={{ ...modalStyles.formGroup, gridColumn: "1 / -1" }}>
            <label style={modalStyles.label} className="cm-label">
              <i className="fas fa-globe" style={modalStyles.labelIcon} />
              Web
            </label>
            <input
              type="text"
              style={modalStyles.input}
              className="cm-input"
              placeholder="https://..."
              value={form.web}
              onChange={(e) => this.handleFormChange("web", e.target.value)}
            />
          </div>
        </div>

        {/* Contacts Section */}
        <div style={{
          background: "#fcfcfd",
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
                <i className="fas fa-address-book" style={{ color: "#f5a623", fontSize: "16px" }} />
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
              <i className="fas fa-plus" style={{ fontSize: "11px" }} /> Agregar
            </button>
          </div>

          {contacts.map((contact, index) => {
            if (contact._destroy) return null;
            return (
              <div key={index} style={{
                background: "#fff",
                borderRadius: "10px",
                padding: "16px 50px 16px 16px",
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
                    top: "10px",
                    right: "10px",
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    border: "1px solid #fecaca",
                    background: "#fef2f2",
                    color: "#dc2626",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s",
                    fontSize: "14px"
                  }}
                >
                  <i className="fas fa-trash-alt" />
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
                      <i className="fas fa-user" style={{ fontSize: "11px" }} /> Nombre
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
                        borderRadius: "8px",
                        fontSize: "14px",
                        background: "#fcfcfd"
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
                      <i className="fas fa-mobile-alt" style={{ fontSize: "11px" }} /> Celular
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
                        borderRadius: "8px",
                        fontSize: "14px",
                        background: "#fcfcfd"
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
                      <i className="fas fa-envelope" style={{ fontSize: "11px" }} /> Email
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
                        borderRadius: "8px",
                        fontSize: "14px",
                        background: "#fcfcfd"
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
                      <i className="fas fa-briefcase" style={{ fontSize: "11px" }} /> Cargo
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
                        borderRadius: "8px",
                        fontSize: "14px",
                        background: "#fcfcfd"
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
              <i className="fas fa-users" style={{ fontSize: "24px", marginBottom: "8px", display: "block", opacity: 0.5 }} />
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
              <i className="fas fa-plus" /> Nuevo Cliente
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
          searchPlaceholder="Buscar cliente..."
          emptyMessage="No hay clientes registrados"
          emptyAction={
            this.props.estados.create ? (
              <button onClick={this.openNewModal} className="cm-btn cm-btn-accent cm-btn-sm" style={{ marginTop: "8px" }}>
                <i className="fas fa-plus" /> Nuevo Cliente
              </button>
            ) : null
          }
          // Server-side
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
