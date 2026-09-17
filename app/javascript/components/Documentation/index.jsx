import React, { Component } from "react";
import { Modal, ModalBody } from "reactstrap";
import Swal from "sweetalert2";
import { CmPageActions } from "../../generalcomponents/ui";
import ModuleCard from "./ModuleCard";
import FormModule from "./FormModule";
import { csrfToken, normalizar, mensajesServidor, pesoLegible, tipoDeArchivo } from "./helpers";

// Configuracion > Documentacion.
//
// Todo usuario con sesion ve la pagina y puede ver y descargar. `estados.manage`
// (solo Administrador) agrega Crear, Editar y Eliminar. Esa bandera es
// cosmetica: el servidor rechaza con 403 a quien no es administrador.
//
// El listado llega completo (son decenas de modulos, no miles) y el buscador
// filtra en el cliente, sin ir al servidor en cada tecla.

// Normaliza caracter por caracter para que los indices del texto normalizado
// coincidan con los del original y el resaltado caiga en su sitio.
function normalizarPorCaracter(texto) {
  return Array.from(String(texto || "")).map(function(c) { return normalizar(c).charAt(0) || c; }).join("");
}

class DocumentationIndex extends Component {
  constructor(props) {
    super(props);
    this.state = {
      modules: [],
      loading: true,
      error: null,
      search: "",
      form: null,        // null | { module: null|modulo }
      preview: null,     // null | archivo
      previewError: false,
    };
  }

  componentDidMount() {
    this.loadData();
  }

  canManage = () => !!(this.props.estados || {}).manage;

  loadData = () => {
    var self = this;
    fetch("/documentation_modules.json", { headers: { Accept: "application/json" }, credentials: "same-origin" })
      .then(function(r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function(data) {
        self.setState({ modules: data.data || [], loading: false, error: null });
      })
      .catch(function() {
        self.setState({ loading: false, error: "No se pudo cargar la documentación. Recargue la página para intentarlo de nuevo." });
      });
  };

  // Reemplaza (o agrega) un modulo con lo que devolvio el servidor, sin
  // volver a pedir la lista entera.
  upsertModule = (register) => {
    if (!register) { this.loadData(); return; }
    var existe = this.state.modules.some(function(m) { return m.id === register.id; });
    var lista = existe
      ? this.state.modules.map(function(m) { return m.id === register.id ? register : m; })
      : this.state.modules.concat([register]);
    lista.sort(function(a, b) { return a.name.localeCompare(b.name, "es", { sensitivity: "base" }); });
    this.setState({ modules: lista });
  };

  // --- Crear / editar --------------------------------------------------------

  openCreate = () => { this.setState({ form: { module: null } }); };
  openEdit = (m) => { this.setState({ form: { module: m } }); };
  closeForm = () => { this.setState({ form: null }); };

  handleSaved = (register, mensaje) => {
    this.setState({ form: null });
    this.upsertModule(register);
    Swal.fire({ position: "center", icon: "success", title: mensaje, showConfirmButton: false, timer: 1500 });
  };

  // --- Eliminar --------------------------------------------------------------

  borrar = (url, onOk) => {
    fetch(url, {
      method: "DELETE",
      credentials: "same-origin",
      headers: { "X-CSRF-Token": csrfToken(), Accept: "application/json" },
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.type === "error") {
          Swal.fire({ icon: "error", title: "¡Ocurrió un error!", text: mensajesServidor(data.message).join(" "), confirmButtonColor: "#2a3f53" });
          return;
        }
        onOk(data);
        Swal.fire({ position: "center", icon: "success", title: data.success, showConfirmButton: false, timer: 1500 });
      })
      .catch(function() {
        Swal.fire({ icon: "error", title: "No se pudo eliminar. Intente de nuevo.", confirmButtonColor: "#2a3f53" });
      });
  };

  deleteModule = (m) => {
    var self = this;
    var n = (m.files || []).length;
    Swal.fire({
      title: "¿Eliminar el módulo «" + m.name + "»?",
      text: n > 0
        ? "Se borrarán también sus " + (n === 1 ? "1 documento" : n + " documentos") + ". Esta acción no se puede deshacer."
        : "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      focusCancel: true,
    }).then(function(result) {
      if (!result.value) return;
      self.borrar("/documentation_modules/" + m.id, function() {
        self.setState({ modules: self.state.modules.filter(function(x) { return x.id !== m.id; }) });
      });
    });
  };

  deleteFile = (m, f) => {
    var self = this;
    Swal.fire({
      title: "¿Eliminar este documento?",
      text: "«" + f.name + "» dejará de estar disponible en «" + m.name + "» para todos los usuarios.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      focusCancel: true,
    }).then(function(result) {
      if (!result.value) return;
      self.borrar("/documentation_files/" + f.id, function(data) { self.upsertModule(data.register); });
    });
  };

  // --- Vista previa ----------------------------------------------------------

  openPreview = (f) => { this.setState({ preview: f, previewError: false }); };
  closePreview = () => { this.setState({ preview: null, previewError: false }); };

  renderPreview() {
    var self = this;
    var f = this.state.preview;
    if (!f) return null;
    // `?disposition=inline` para PINTAR; sin el, el servidor fuerza la
    // descarga y el modal sale en blanco (mismo caso que el comprobante).
    var src = f.download_url + "?disposition=inline";
    var esPdf = f.content_type === "application/pdf";
    var tipo = tipoDeArchivo(f.name);

    return (
      <Modal isOpen={true} toggle={this.closePreview} className="modal-dialog-centered modal-xl cm-doc-preview-modal">
        <div className="cm-modal-container">
          <div className="cm-modal-header">
            <div className="cm-modal-header-content cm-doc-preview-heading">
              <div className="cm-modal-icon"><i className={tipo.icon} /></div>
              <div className="cm-doc-preview-titles">
                <h2 className="cm-modal-title" title={f.name}>{f.name}</h2>
                <p className="cm-modal-subtitle">{tipo.label} · {pesoLegible(f.byte_size)}</p>
              </div>
            </div>
            <button type="button" className="cm-modal-close" onClick={this.closePreview} aria-label="Cerrar">
              <i className="fa fa-times" />
            </button>
          </div>
          <ModalBody className="cm-modal-body cm-doc-preview-body">
            {this.state.previewError ? (
              <div className="cm-alert cm-alert-warning">
                <i className="fas fa-exclamation-triangle" /> No se pudo mostrar el documento. Puede descargarlo con el botón de abajo.
              </div>
            ) : esPdf ? (
              <iframe className="cm-doc-preview-frame" src={src} title={f.name} data-testid="doc-preview-frame" />
            ) : (
              <img className="cm-doc-preview-image" src={src} alt={f.name}
                   onError={function() { self.setState({ previewError: true }); }}
                   data-testid="doc-preview-image" />
            )}
          </ModalBody>
          <div className="cm-modal-footer" style={{ justifyContent: "space-between" }}>
            <a className="cm-btn cm-btn-outline" href={f.download_url} data-testid="doc-preview-download">
              <i className="fas fa-download" /> Descargar
            </a>
            <button type="button" className="cm-btn cm-btn-submit" onClick={this.closePreview}>
              <i className="fas fa-times" /> Cerrar
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // --- Busqueda --------------------------------------------------------------

  // Si el termino coincide con el nombre del modulo, se muestra el modulo
  // entero; si solo coincide con algunos documentos, solo esos.
  filtered() {
    var term = normalizar(this.state.search.trim());
    var modules = this.state.modules;
    if (!term) return modules.map(function(m) { return { module: m, files: m.files || [] }; });

    var out = [];
    modules.forEach(function(m) {
      var files = m.files || [];
      if (normalizar(m.name).indexOf(term) !== -1 || normalizar(m.description).indexOf(term) !== -1) {
        out.push({ module: m, files: files });
        return;
      }
      var hits = files.filter(function(f) { return normalizar(f.name).indexOf(term) !== -1; });
      if (hits.length > 0) out.push({ module: m, files: hits });
    });
    return out;
  }

  highlight = (texto) => {
    var term = normalizar(this.state.search.trim());
    var original = String(texto || "");
    if (!term) return original;
    var i = normalizarPorCaracter(original).indexOf(term);
    if (i === -1) return original;
    var chars = Array.from(original);
    return (
      <React.Fragment>
        {chars.slice(0, i).join("")}
        <mark className="cm-doc-mark">{chars.slice(i, i + term.length).join("")}</mark>
        {chars.slice(i + term.length).join("")}
      </React.Fragment>
    );
  };

  // --- Render ----------------------------------------------------------------

  renderToolbar(resultados) {
    var totalDocs = this.state.modules.reduce(function(acc, m) { return acc + (m.files || []).length; }, 0);
    var nMod = this.state.modules.length;
    return (
      <div className="cm-doc-toolbar">
        <div className="cm-doc-search">
          <i className="fas fa-search cm-doc-search-icon" />
          <input type="search" className="cm-input"
                 placeholder="Buscar un módulo o un documento…"
                 value={this.state.search}
                 onChange={(e) => this.setState({ search: e.target.value })}
                 aria-label="Buscar documentación"
                 data-testid="doc-search" />
          {this.state.search && (
            <button type="button" className="cm-doc-search-clear" onClick={() => this.setState({ search: "" })}
                    aria-label="Limpiar búsqueda">
              <i className="fas fa-times" />
            </button>
          )}
        </div>
        <div className="cm-doc-summary">
          {this.state.search.trim()
            ? (resultados === 1 ? "1 módulo coincide" : resultados + " módulos coinciden")
            : (nMod === 1 ? "1 módulo" : nMod + " módulos") + " · " + (totalDocs === 1 ? "1 documento" : totalDocs + " documentos")}
        </div>
      </div>
    );
  }

  renderEmpty() {
    return (
      <div className="cm-doc-empty" data-testid="doc-empty">
        <span className="cm-doc-empty-icon"><i className="fas fa-book-open" /></span>
        <h3>Todavía no hay documentación</h3>
        {this.canManage() ? (
          <React.Fragment>
            <p>Cree el primer módulo y suba los manuales, formatos o políticas que el equipo necesita tener a mano.</p>
            <button type="button" className="cm-btn cm-btn-submit" onClick={this.openCreate} data-testid="doc-empty-create">
              <i className="fas fa-plus" /> Crear el primer módulo
            </button>
          </React.Fragment>
        ) : (
          <p>Cuando el administrador publique manuales o formatos, los encontrará aquí.</p>
        )}
      </div>
    );
  }

  renderBody() {
    var self = this;
    if (this.state.loading) {
      return (
        <div className="cm-doc-grid" aria-busy="true">
          {[0, 1, 2].map(function(i) { return <div key={i} className="cm-doc-card cm-doc-card--skeleton" />; })}
        </div>
      );
    }
    if (this.state.error) {
      return <div className="cm-alert cm-alert-danger"><i className="fas fa-exclamation-circle" /> {this.state.error}</div>;
    }
    if (this.state.modules.length === 0) return this.renderEmpty();

    var resultados = this.filtered();
    var filtrando = !!this.state.search.trim();

    return (
      <React.Fragment>
        {this.renderToolbar(resultados.length)}
        {resultados.length === 0 ? (
          <div className="cm-doc-empty cm-doc-empty--compact">
            <span className="cm-doc-empty-icon"><i className="fas fa-search" /></span>
            <h3>No encontramos nada con «{this.state.search.trim()}»</h3>
            <p>Revise cómo lo escribió o pruebe con otra palabra.</p>
          </div>
        ) : (
          <div className="cm-doc-grid">
            {resultados.map(function(r) {
              return (
                <ModuleCard key={r.module.id}
                            module={r.module}
                            files={r.files}
                            filtering={filtrando}
                            canManage={self.canManage()}
                            highlight={self.highlight}
                            onPreview={self.openPreview}
                            onEdit={self.openEdit}
                            onDelete={self.deleteModule}
                            onDeleteFile={self.deleteFile} />
              );
            })}
          </div>
        )}
      </React.Fragment>
    );
  }

  render() {
    return (
      <div className="cm-doc-page">
        {this.canManage() && (
          <CmPageActions onNew={this.openCreate} label="Crear módulo" testId="doc-create" />
        )}

        {this.renderBody()}

        {this.state.form && (
          <FormModule module={this.state.form.module}
                      limits={this.props.limits}
                      onClose={this.closeForm}
                      onSaved={this.handleSaved} />
        )}

        {this.renderPreview()}
      </div>
    );
  }
}

export default DocumentationIndex;
