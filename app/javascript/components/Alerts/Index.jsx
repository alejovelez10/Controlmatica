import React from "react";
import Swal from "sweetalert2/dist/sweetalert2.js";
import { CmDataTable, CmPageActions, CmModal, CmInput, CmButton } from "../../generalcomponents/ui";

const EMPTY_FORM = {
  name: "",
  ing_ejecucion_min: "", ing_ejecucion_med: "",
  ing_costo_min: "", ing_costo_med: "",
  tab_ejecucion_min: "", tab_ejecucion_med: "",
  tab_costo_min: "", tab_costo_med: "",
  desp_min: "", desp_med: "",
  mat_min: "", mat_med: "",
  via_min: "", via_med: "",
  total_min: "", total_med: "",
  alert_min: 100, color_min: "#d26666",
  alert_med: 150, color_mid: "#d4b21e",
  alert_max: 151, color_max: "#24bc6b",
  alert_hour_min: 100, alert_hour_med: 100, alert_hour_max: 100,
  color_hour_min: "#d26666", color_hour_med: "#d4b21e", color_hour_max: "#24bc6b",
};

function csrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}

// Helper: section with two fields (verde / naranja)
function AlertSection({ label, fieldMin, fieldMed, form, onChange }) {
  return (
    <React.Fragment>
      <div className="cm-form-section-title" style={{ marginTop: 12 }}>
        <span>{label}</span>
      </div>
      <div className="cm-form-row">
        <CmInput label="Máx. verde" type="number" placeholder="0" value={form[fieldMin]} onChange={(e) => onChange(fieldMin, e.target.value)} />
        <CmInput label="Máx. naranja" type="number" placeholder="0" value={form[fieldMed]} onChange={(e) => onChange(fieldMed, e.target.value)} />
      </div>
    </React.Fragment>
  );
}

// Helper: color config row
function ColorRow({ label, valueField, colorField, form, onChange }) {
  return (
    <div className="cm-form-row" style={{ alignItems: "end" }}>
      {valueField ? (
        <CmInput label={label} type="number" placeholder="0" value={form[valueField]} onChange={(e) => onChange(valueField, e.target.value)} />
      ) : (
        <div className="cm-form-group"><label className="cm-label">{label}</label></div>
      )}
      <div className="cm-form-group">
        <label className="cm-label">Color</label>
        <input type="color" className="cm-input" value={form[colorField]} onChange={(e) => onChange(colorField, e.target.value)} style={{ height: 38, padding: 4, cursor: "pointer" }} />
      </div>
    </div>
  );
}

class Index extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      data: [],
      loading: true,
      searchTerm: "",
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
    ];
  }

  componentDidMount() {
    this.loadData();
  }

  loadData = (page, perPage, searchTerm) => {
    const p = page || this.state.meta.page;
    const pp = perPage || this.state.meta.per_page;
    const term = searchTerm !== undefined ? searchTerm : this.state.searchTerm;

    this.setState({ loading: true });

    let url = `/get_alerts?page=${p}&per_page=${pp}`;
    if (term) url += `&name=${encodeURIComponent(term)}`;

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

  // ─── Modal ───

  openNewModal = () => {
    this.setState({
      modalOpen: true, modalMode: "new", editId: null,
      form: { ...EMPTY_FORM }, errors: [], saving: false,
    });
  };

  openEditModal = (row) => {
    const form = {};
    Object.keys(EMPTY_FORM).forEach((k) => { form[k] = row[k] !== null && row[k] !== undefined ? row[k] : EMPTY_FORM[k]; });
    this.setState({
      modalOpen: true, modalMode: "edit", editId: row.id,
      form, errors: [], saving: false,
    });
  };

  closeModal = () => { this.setState({ modalOpen: false }); };

  handleFormChange = (field, value) => {
    this.setState((prev) => ({ form: { ...prev.form, [field]: value } }));
  };

  handleSubmit = () => {
    const { form, modalMode, editId } = this.state;
    const isNew = modalMode === "new";

    if (!form.name) {
      this.setState({ errors: ["El nombre es obligatorio"] });
      return;
    }

    const url = isNew ? "/alerts" : `/alerts/${editId}`;
    const method = isNew ? "POST" : "PATCH";

    this.setState({ saving: true, errors: [] });

    fetch(url, {
      method,
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() },
      body: JSON.stringify(form),
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (ok || data.success) {
          this.closeModal();
          this.loadData(isNew ? 1 : undefined);
          Swal.fire({ position: "center", type: "success", title: data.message, showConfirmButton: false, timer: 1500 });
        } else {
          this.setState({ errors: data.errors || [data.message || "Error al guardar"], saving: false });
        }
      })
      .catch(() => { this.setState({ errors: ["Error de conexión"], saving: false }); });
  };

  delete = (id) => {
    Swal.fire({
      title: "¿Estás seguro?", text: "La alerta será eliminada permanentemente",
      type: "warning", showCancelButton: true,
      confirmButtonColor: "#2a3f53", cancelButtonColor: "#dc3545",
      confirmButtonText: "Sí, eliminar", cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.value) {
        fetch("/alerts/" + id, { method: "delete", headers: { "X-CSRF-Token": csrfToken() } })
          .then((r) => r.json())
          .then(() => {
            this.loadData();
            Swal.fire("Eliminado", "La alerta fue eliminada con éxito", "success");
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
    const { modalOpen, modalMode, form, errors, saving } = this.state;
    const title = modalMode === "new" ? "Nueva Alerta" : "Editar Alerta";
    const icon = modalMode === "new" ? "fas fa-plus-circle" : "fas fa-edit";
    const onChange = this.handleFormChange;

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
          <CmInput label="Nombre" placeholder="Nombre de la alerta" value={form.name} onChange={(e) => onChange("name", e.target.value)} />
        </div>

        <div className="cm-form-section">
          <div className="cm-form-section-title">
            <span><i className="fas fa-percentage" style={{ marginRight: 6 }} /> Umbrales de porcentaje</span>
          </div>
          <AlertSection label="Ingeniería Ejecución" fieldMin="ing_ejecucion_min" fieldMed="ing_ejecucion_med" form={form} onChange={onChange} />
          <AlertSection label="Ingeniería Costo" fieldMin="ing_costo_min" fieldMed="ing_costo_med" form={form} onChange={onChange} />
          <AlertSection label="Tablerista Ejecución" fieldMin="tab_ejecucion_min" fieldMed="tab_ejecucion_med" form={form} onChange={onChange} />
          <AlertSection label="Tablerista Costo" fieldMin="tab_costo_min" fieldMed="tab_costo_med" form={form} onChange={onChange} />
          <AlertSection label="Desplazamiento" fieldMin="desp_min" fieldMed="desp_med" form={form} onChange={onChange} />
          <AlertSection label="Materiales" fieldMin="mat_min" fieldMed="mat_med" form={form} onChange={onChange} />
          <AlertSection label="Viáticos" fieldMin="via_min" fieldMed="via_med" form={form} onChange={onChange} />
          <AlertSection label="Total" fieldMin="total_min" fieldMed="total_med" form={form} onChange={onChange} />
        </div>

        <div className="cm-form-section">
          <div className="cm-form-section-title">
            <span><i className="fas fa-clock" style={{ marginRight: 6 }} /> Configuración horas por mes</span>
          </div>
          <ColorRow label="Menor o igual (valor)" valueField="alert_min" colorField="color_min" form={form} onChange={onChange} />
          <ColorRow label="Mayor que anterior y menor que" valueField="alert_med" colorField="color_mid" form={form} onChange={onChange} />
          <ColorRow label="Mayor o igual al anterior" valueField={null} colorField="color_max" form={form} onChange={onChange} />
        </div>

        <div className="cm-form-section">
          <div className="cm-form-section-title">
            <span><i className="fas fa-clock" style={{ marginRight: 6 }} /> Configuración horas por día</span>
          </div>
          <ColorRow label="Menor o igual (valor)" valueField="alert_hour_min" colorField="color_hour_min" form={form} onChange={onChange} />
          <ColorRow label="Mayor que anterior y menor que" valueField="alert_hour_med" colorField="color_hour_med" form={form} onChange={onChange} />
          <ColorRow label="Mayor o igual al anterior" valueField={null} colorField="color_hour_max" form={form} onChange={onChange} />
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
              <i className="fas fa-plus" /> Nueva Alerta
            </button>
          </CmPageActions>
        )}
        <CmDataTable
          columns={this.columns}
          data={this.state.data}
          loading={this.state.loading}
          actions={this.renderActions}
          onSearch={this.handleSearch}
          searchPlaceholder="Buscar alerta..."
          emptyMessage="No hay alertas registradas"
          emptyAction={
            this.props.estados.create ? (
              <button onClick={this.openNewModal} className="cm-btn cm-btn-accent cm-btn-sm" style={{ marginTop: "8px" }}>
                <i className="fas fa-plus" /> Nueva Alerta
              </button>
            ) : null
          }
          serverPagination
          serverMeta={meta}
          onPageChange={this.handlePageChange}
          onPerPageChange={this.handlePerPageChange}
        />
        {this.renderModal()}
      </React.Fragment>
    );
  }
}

export default Index;
