import React from "react";
import Swal from "sweetalert2/dist/sweetalert2.js";
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
        fetch("/parameterizations/" + id, { method: "delete", headers: { "X-CSRF-Token": csrfToken() } })
          .then((r) => r.json())
          .then(() => {
            this.loadData();
            Swal.fire("Eliminado", "El registro fue eliminado con éxito", "success");
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
    const icon = modalMode === "new" ? "fas fa-plus-circle" : "fas fa-edit";

    return (
      <CmModal
        isOpen={modalOpen} toggle={this.closeModal}
        title={<span><i className={icon} /> {title}</span>} size="md"
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
          <CmInput label="Nombre" placeholder="Nombre" value={form.name} onChange={(e) => this.handleFormChange("name", e.target.value)} />
          <CmInput label="Valor monetario" type="number" placeholder="0" value={form.money_value} onChange={(e) => this.handleFormChange("money_value", e.target.value)} />
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
