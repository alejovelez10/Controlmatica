import React, { Component } from "react";
import { Modal, ModalBody } from "reactstrap";
import { csrfToken, pesoLegible, tipoDeArchivo, extensionDe, mensajesServidor } from "./helpers";

// Modal para CREAR un modulo o EDITARLO (renombrar y agregar archivos).
//
// Valida en el cliente formato, tamaño y cantidad con los MISMOS limites que
// manda el servidor por props (`limits`), para avisar antes de subir 50 MB que
// iban a ser rechazados. Es cortesia: el uploader vuelve a validar todo.
//
// Sube con XMLHttpRequest y no con fetch porque fetch no informa el progreso
// de la subida, y con archivos grandes una barra quieta parece un cuelgue.

var DEFAULT_MAX_SIZE = 50 * 1024 * 1024;
var DEFAULT_MAX_FILES = 20;
var DEFAULT_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "csv", "txt", "jpg", "jpeg", "png", "webp", "zip"];

var contador = 0;
function nuevaClave() { contador += 1; return "f" + contador; }

class FormModule extends Component {
  constructor(props) {
    super(props);
    var m = props.module || {};
    this.state = {
      name: m.name || "",
      description: m.description || "",
      files: [],          // [{ key, file }]
      rejected: [],       // [{ name, reason }]
      dragging: false,
      saving: false,
      progress: 0,
      errors: [],
      submitted: false,
    };
    this.dragDepth = 0;
  }

  componentWillUnmount() {
    if (this.xhr) this.xhr.abort();
  }

  limits = () => {
    var l = this.props.limits || {};
    return {
      maxSize: l.max_file_size || DEFAULT_MAX_SIZE,
      maxFiles: l.max_files || DEFAULT_MAX_FILES,
      extensions: (l.extensions && l.extensions.length ? l.extensions : DEFAULT_EXTENSIONS),
    };
  };

  isEdit = () => !!this.props.module;

  // --- Seleccion de archivos -------------------------------------------------

  agregarArchivos = (lista) => {
    var lim = this.limits();
    var actuales = this.state.files.slice();
    var rechazados = [];

    Array.prototype.forEach.call(lista || [], function(file) {
      var ext = extensionDe(file.name);
      if (lim.extensions.indexOf(ext) === -1) {
        rechazados.push({ name: file.name, reason: "formato no permitido" });
      } else if (file.size <= 0) {
        rechazados.push({ name: file.name, reason: "el archivo está vacío" });
      } else if (file.size > lim.maxSize) {
        rechazados.push({ name: file.name, reason: "pesa " + pesoLegible(file.size) + " y el máximo es " + pesoLegible(lim.maxSize) });
      } else if (actuales.some(function(f) { return f.file.name === file.name && f.file.size === file.size; })) {
        // Soltar dos veces el mismo archivo es un descuido, no una intencion.
        rechazados.push({ name: file.name, reason: "ya está en la lista" });
      } else if (actuales.length >= lim.maxFiles) {
        rechazados.push({ name: file.name, reason: "se pueden subir hasta " + lim.maxFiles + " archivos a la vez" });
      } else {
        actuales.push({ key: nuevaClave(), file: file });
      }
    });

    this.setState({ files: actuales, rejected: rechazados, errors: [] });
  };

  quitarArchivo = (key) => {
    this.setState({ files: this.state.files.filter(function(f) { return f.key !== key; }) });
  };

  abrirSelector = () => {
    if (this.input && !this.state.saving) this.input.click();
  };

  handleInputChange = (e) => {
    this.agregarArchivos(e.target.files);
    // Se limpia para que elegir OTRA VEZ el mismo archivo dispare onChange.
    e.target.value = "";
  };

  // dragenter/dragleave se disparan tambien al pasar sobre los hijos; el
  // contador evita que el resaltado parpadee.
  handleDragEnter = (e) => {
    e.preventDefault();
    this.dragDepth += 1;
    if (!this.state.dragging) this.setState({ dragging: true });
  };

  handleDragOver = (e) => { e.preventDefault(); };

  handleDragLeave = (e) => {
    e.preventDefault();
    this.dragDepth = Math.max(0, this.dragDepth - 1);
    if (this.dragDepth === 0) this.setState({ dragging: false });
  };

  handleDrop = (e) => {
    e.preventDefault();
    this.dragDepth = 0;
    this.setState({ dragging: false });
    if (this.state.saving) return;
    if (e.dataTransfer && e.dataTransfer.files) this.agregarArchivos(e.dataTransfer.files);
  };

  // --- Guardado --------------------------------------------------------------

  blockReason = () => {
    if (!this.state.name.trim()) return "Escriba el nombre del módulo";
    if (this.isEdit()) {
      var m = this.props.module;
      var sinCambios = this.state.name.trim() === (m.name || "") &&
                       this.state.description.trim() === (m.description || "").trim() &&
                       this.state.files.length === 0;
      if (sinCambios) return "No hay cambios para guardar";
    }
    return null;
  };

  submit = () => {
    this.setState({ submitted: true });
    if (this.blockReason() || this.state.saving) return;

    var self = this;
    var fd = new FormData();
    fd.append("name", this.state.name.trim());
    fd.append("description", this.state.description.trim());
    this.state.files.forEach(function(f) { fd.append("files[]", f.file, f.file.name); });

    var xhr = new XMLHttpRequest();
    this.xhr = xhr;
    var url = this.isEdit() ? "/documentation_modules/" + this.props.module.id : "/documentation_modules";
    xhr.open(this.isEdit() ? "PATCH" : "POST", url);
    xhr.setRequestHeader("X-CSRF-Token", csrfToken());
    xhr.setRequestHeader("Accept", "application/json");

    xhr.upload.onprogress = function(e) {
      if (e.lengthComputable) self.setState({ progress: Math.round((e.loaded / e.total) * 100) });
    };
    xhr.onload = function() {
      self.xhr = null;
      var data = null;
      try { data = JSON.parse(xhr.responseText); } catch (err) { data = null; }

      if (!data) {
        var texto = xhr.status === 413
          ? "Los archivos superan el tamaño que acepta el servidor. Intente subirlos en tandas más pequeñas."
          : "No se pudo guardar el módulo. Intente de nuevo.";
        self.setState({ saving: false, errors: [texto] });
        return;
      }
      if (data.type === "error") {
        self.setState({ saving: false, errors: mensajesServidor(data.message) });
        return;
      }
      self.setState({ saving: false });
      self.props.onSaved(data.register, data.success);
    };
    xhr.onerror = function() {
      self.xhr = null;
      self.setState({ saving: false, errors: ["Se perdió la conexión mientras se subían los archivos. Intente de nuevo."] });
    };

    this.setState({ saving: true, progress: 0, errors: [] });
    xhr.send(fd);
  };

  cerrar = () => {
    if (this.state.saving) return;
    this.props.onClose();
  };

  // --- Render ----------------------------------------------------------------

  renderDropzone() {
    var lim = this.limits();
    var clases = "cm-dropzone cm-doc-dropzone" + (this.state.dragging ? " cm-dropzone--active" : "");
    return (
      <div className={clases}
           onDragEnter={this.handleDragEnter}
           onDragOver={this.handleDragOver}
           onDragLeave={this.handleDragLeave}
           onDrop={this.handleDrop}
           onClick={this.abrirSelector}
           onKeyDown={(e) => {
             if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.abrirSelector(); }
           }}
           role="button"
           tabIndex={0}
           data-testid="doc-dropzone">
        <input type="file" multiple className="cm-dropzone-input"
               ref={(el) => { this.input = el; }}
               accept={lim.extensions.map(function(x) { return "." + x; }).join(",")}
               onChange={this.handleInputChange}
               onClick={(e) => e.stopPropagation()}
               data-testid="doc-files-input" />
        <div className="cm-doc-dropzone-inner">
          <span className="cm-doc-dropzone-badge">
            <i className="fas fa-cloud-upload-alt" />
          </span>
          <span className="cm-dropzone-title">
            {this.state.dragging ? "Suelte los archivos aquí" : "Arrastre aquí los documentos"}
          </span>
          <span className="cm-dropzone-link">o haga clic para seleccionarlos</span>
          <span className="cm-doc-dropzone-meta">
            PDF, Word, Excel, PowerPoint, CSV, TXT, imágenes o ZIP · hasta {pesoLegible(lim.maxSize)} por archivo · {lim.maxFiles} archivos por vez
          </span>
        </div>
      </div>
    );
  }

  renderSeleccionados() {
    var self = this;
    var files = this.state.files;
    if (files.length === 0) return null;
    var total = files.reduce(function(acc, f) { return acc + f.file.size; }, 0);

    return (
      <div className="cm-doc-picked">
        <div className="cm-doc-picked-head">
          <span>{files.length === 1 ? "1 archivo listo para subir" : files.length + " archivos listos para subir"}</span>
          <span>{pesoLegible(total)}</span>
        </div>
        <ul className="cm-doc-picked-list">
          {files.map(function(f) {
            var tipo = tipoDeArchivo(f.file.name);
            return (
              <li key={f.key} className="cm-doc-picked-item">
                <span className={"cm-doc-file-icon cm-doc-tone-" + tipo.tone}><i className={tipo.icon} /></span>
                <span className="cm-doc-picked-name" title={f.file.name}>{f.file.name}</span>
                <span className="cm-doc-picked-size">{pesoLegible(f.file.size)}</span>
                <button type="button" className="cm-doc-icon-btn cm-doc-icon-btn--danger"
                        title="Quitar de la lista" aria-label={"Quitar " + f.file.name}
                        disabled={self.state.saving}
                        onClick={() => self.quitarArchivo(f.key)}>
                  <i className="fas fa-times" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  render() {
    var edit = this.isEdit();
    var m = this.props.module || {};
    var bloqueo = this.blockReason();
    var nombreInvalido = this.state.submitted && !this.state.name.trim();
    var existentes = (m.files || []).length;

    return (
      <Modal isOpen={true} toggle={this.cerrar} className="modal-dialog-centered modal-lg" backdrop="static">
        <div className="cm-modal-container">
          <div className="cm-modal-header">
            <div className="cm-modal-header-content">
              <div className="cm-modal-icon"><i className={edit ? "fas fa-pen" : "fas fa-folder-plus"} /></div>
              <div>
                <h2 className="cm-modal-title">{edit ? "Editar módulo" : "Crear módulo de documentación"}</h2>
                <p className="cm-modal-subtitle">
                  {edit
                    ? "Cambie el nombre o agregue más documentos"
                    : "Póngale un nombre y suba los documentos que quiera compartir"}
                </p>
              </div>
            </div>
            <button type="button" className="cm-modal-close" onClick={this.cerrar} disabled={this.state.saving} aria-label="Cerrar">
              <i className="fa fa-times" />
            </button>
          </div>

          <ModalBody className="cm-modal-body cm-modal-scroll">
            {this.state.errors.length > 0 && (
              <div className="cm-alert cm-alert-danger" data-testid="doc-form-errors">
                <i className="fas fa-exclamation-circle" /> No se pudo guardar:
                <ul className="cm-doc-alert-list">
                  {this.state.errors.map(function(e, i) { return <li key={i}>{e}</li>; })}
                </ul>
              </div>
            )}

            <div className="cm-form-group">
              <label className="cm-label" htmlFor="doc-module-name">
                <i className="fa fa-tag" /> Nombre del módulo <span className="cm-required">*</span>
              </label>
              <input id="doc-module-name" type="text"
                     className={"cm-input" + (nombreInvalido ? " cm-input-error" : "")}
                     value={this.state.name}
                     maxLength={120}
                     autoFocus
                     placeholder="Ej.: Manuales de gastos, Políticas internas…"
                     disabled={this.state.saving}
                     onChange={(e) => this.setState({ name: e.target.value })}
                     onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); this.submit(); } }}
                     data-testid="doc-module-name" />
              {nombreInvalido && <span className="cm-form-error">Escriba el nombre del módulo</span>}
            </div>

            <div className="cm-form-group">
              <label className="cm-label" htmlFor="doc-module-description">
                <i className="fa fa-align-left" /> Descripción <span className="cm-label-hint">(opcional)</span>
              </label>
              <textarea id="doc-module-description" className="cm-input" rows={2}
                        value={this.state.description}
                        placeholder="Para qué sirven estos documentos o a quién van dirigidos"
                        disabled={this.state.saving}
                        onChange={(e) => this.setState({ description: e.target.value })} />
            </div>

            <div className="cm-form-group">
              <label className="cm-label">
                <i className="fa fa-paperclip" /> {edit ? "Agregar documentos" : "Documentos"}
              </label>
              {edit && existentes > 0 && (
                <p className="cm-field-hint cm-doc-hint">
                  Este módulo ya tiene {existentes === 1 ? "1 documento" : existentes + " documentos"}. Los que suba aquí se suman a los actuales;
                  para quitar uno, use la papelera en la tarjeta.
                </p>
              )}
              {this.renderDropzone()}
            </div>

            {this.state.rejected.length > 0 && (
              <div className="cm-alert cm-alert-warning" data-testid="doc-rejected">
                <i className="fas fa-exclamation-triangle" /> Estos archivos no se agregaron:
                <ul className="cm-doc-alert-list">
                  {this.state.rejected.map(function(r, i) {
                    return <li key={i}><strong>{r.name}</strong>: {r.reason}</li>;
                  })}
                </ul>
              </div>
            )}

            {this.renderSeleccionados()}

            {this.state.saving && this.state.files.length > 0 && (
              <div className="cm-doc-progress" aria-live="polite">
                <div className="cm-doc-progress-bar"><span style={{ width: this.state.progress + "%" }} /></div>
                <span className="cm-doc-progress-text">
                  {this.state.progress < 100 ? "Subiendo archivos… " + this.state.progress + " %" : "Procesando…"}
                </span>
              </div>
            )}
          </ModalBody>

          <div className="cm-modal-footer">
            <button type="button" className="cm-btn cm-btn-cancel" onClick={this.cerrar} disabled={this.state.saving}>
              Cancelar
            </button>
            <button type="button" className="cm-btn cm-btn-submit"
                    onClick={this.submit}
                    disabled={this.state.saving || (!!bloqueo && this.state.submitted) || bloqueo === "No hay cambios para guardar"}
                    title={bloqueo || ""}
                    data-testid="doc-submit">
              {this.state.saving
                ? <span><i className="fas fa-spinner fa-spin" /> Guardando…</span>
                : <span><i className="fas fa-save" /> {edit ? "Guardar cambios" : "Crear módulo"}</span>}
            </button>
          </div>
        </div>
      </Modal>
    );
  }
}

export default FormModule;
