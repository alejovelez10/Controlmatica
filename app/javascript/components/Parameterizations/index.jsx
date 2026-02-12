import React from "react";
import Swal from "sweetalert2";
import { CmDataTable, CmPageActions, CmModal, CmInput, CmButton } from "../../generalcomponents/ui";

const EMPTY_FORM = { name: "", money_value: "" };

function csrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}

function formatMoney(val) {
  if (!val && val !== 0) return "";
  return "$" + Number(val).toLocaleString("es-CO");
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
      errors: [],
      saving: false,
    };

    this.columns = [
      { key: "name", label: "Nombre" },
      {
        key: "money_value",
        label: "Valor monetario",
        render: (row) => formatMoney(row.money_value),
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

    let url = `/get_parameterizations?page=${p}&per_page=${pp}`;
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

  openNewModal = () => {
    this.setState({ modalOpen: true, modalMode: "new", editId: null, form: { ...EMPTY_FORM }, errors: [], saving: false });
  };

  openEditModal = (id) => {
    this.setState({ modalOpen: true, modalMode: "edit", editId: id, errors: [], saving: false });
    fetch(`/parameterizations/${id}.json`)
      .then((r) => r.json())
      .then((data) => {
        this.setState({ form: { name: data.name || "", money_value: data.money_value || "" } });
      });
  };

  closeModal = () => { this.setState({ modalOpen: false }); };
  handleFormChange = (field, value) => {
    this.setState((prev) => ({ form: { ...prev.form, [field]: value } }));
  };

  handleSubmit = () => {
    const { form, modalMode, editId } = this.state;
    const isNew = modalMode === "new";
    const url = isNew ? "/parameterizations" : `/parameterizations/${editId}`;
    const method = isNew ? "POST" : "PATCH";

    this.setState({ saving: true, errors: [] });

    fetch(`${url}.json`, {
      method,
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() },
      body: JSON.stringify({ parameterization: form }),
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
        fetch("/parameterizations/" + id, { method: "delete", headers: { "X-CSRF-Token": csrfToken() } })
          .then((r) => r.json())
          .then(() => {
            this.loadData();
            Swal.fire({ title: "Eliminado", text: "El registro fue eliminado con éxito", icon: "success", confirmButtonColor: "#2a3f53" });
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

  renderModal = () => {
    const { modalOpen, modalMode, form, errors, saving } = this.state;
    const title = modalMode === "new" ? "Nueva Parametrización" : "Editar Parametrización";
    const subtitle = modalMode === "new" ? "Complete los datos de la nueva parametrización" : "Modifique los datos de la parametrización";

    return (
      <CmModal
        isOpen={modalOpen}
        toggle={this.closeModal}
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
                <i className="fas fa-sliders-h" style={{ color: "#fff", fontSize: "20px" }} />
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

          {/* Form Content */}
          <div style={{ padding: "24px 32px" }}>
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
                  placeholder="Nombre"
                  value={form.name}
                  onChange={(e) => this.handleFormChange("name", e.target.value)}
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
                  <i className="fa fa-dollar-sign" style={{ color: "#6b7280", fontSize: "12px" }} />
                  Valor monetario
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={form.money_value}
                  onChange={(e) => this.handleFormChange("money_value", e.target.value)}
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
              <i className="fas fa-plus" /> Nueva Parametrización
            </button>
          </CmPageActions>
        )}
        <CmDataTable
          columns={this.columns}
          data={this.state.data}
          loading={this.state.loading}
          actions={this.renderActions}
          onSearch={this.handleSearch}
          searchPlaceholder="Buscar parametrización..."
          emptyMessage="No hay parametrizaciones registradas"
          emptyAction={
            this.props.estados.create ? (
              <button onClick={this.openNewModal} className="cm-btn cm-btn-accent cm-btn-sm" style={{ marginTop: "8px" }}>
                <i className="fas fa-plus" /> Nueva Parametrización
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
