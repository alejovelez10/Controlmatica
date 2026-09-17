import React from "react";
import { pesoLegible, fechaCorta, tipoDeArchivo } from "./helpers";

// Tarjeta de un modulo de documentacion. PRESENTACIONAL: no llama al servidor;
// todas las acciones suben al padre, que es quien confirma y refresca.
//
// `canManage` solo decide que botones se pintan. Quien no es administrador y
// llama a los endpoints igual recibe 403.

// Archivos visibles antes de "Ver todos". Una tarjeta con 40 documentos
// desalinea la grilla entera; con el buscador se llega al resto.
var VISIBLES = 6;

class ModuleCard extends React.Component {
  constructor(props) {
    super(props);
    this.state = { expanded: false };
  }

  renderFile(f) {
    var p = this.props;
    var tipo = tipoDeArchivo(f.name);
    return (
      <li key={f.id} className="cm-doc-file" data-testid={"doc-file-" + f.id}>
        <span className={"cm-doc-file-icon cm-doc-tone-" + tipo.tone} title={tipo.label}>
          <i className={tipo.icon} />
        </span>
        <div className="cm-doc-file-body">
          {/* El nombre abre la vista previa si se puede; si no, descarga. Es
              el gesto que la gente intenta primero. */}
          {f.previewable ? (
            <button type="button" className="cm-doc-file-name cm-doc-link" title={f.name}
                    onClick={() => p.onPreview(f)}>
              {p.highlight(f.name)}
            </button>
          ) : (
            <a className="cm-doc-file-name cm-doc-link" href={f.download_url} title={f.name}>
              {p.highlight(f.name)}
            </a>
          )}
          <span className="cm-doc-file-meta">{tipo.label} · {pesoLegible(f.byte_size)}</span>
        </div>
        <div className="cm-doc-file-actions">
          {f.previewable && (
            <button type="button" className="cm-doc-icon-btn" title="Ver" aria-label={"Ver " + f.name}
                    onClick={() => p.onPreview(f)} data-testid={"doc-preview-" + f.id}>
              <i className="fas fa-eye" />
            </button>
          )}
          <a className="cm-doc-icon-btn" href={f.download_url} title="Descargar"
             aria-label={"Descargar " + f.name} data-testid={"doc-download-" + f.id}>
            <i className="fas fa-download" />
          </a>
          {p.canManage && (
            <button type="button" className="cm-doc-icon-btn cm-doc-icon-btn--danger" title="Eliminar documento"
                    aria-label={"Eliminar " + f.name}
                    onClick={() => p.onDeleteFile(p.module, f)} data-testid={"doc-delete-file-" + f.id}>
              <i className="fas fa-trash-alt" />
            </button>
          )}
        </div>
      </li>
    );
  }

  render() {
    var p = this.props;
    var m = p.module;
    var files = p.files || [];
    var total = (m.files || []).length;
    // Con busqueda activa se muestran todas las coincidencias: esconder
    // justo lo que la persona busco seria absurdo.
    var mostrarTodo = this.state.expanded || p.filtering;
    var visibles = mostrarTodo ? files : files.slice(0, VISIBLES);
    var ocultos = files.length - visibles.length;

    return (
      <article className="cm-doc-card" data-testid={"doc-module-" + m.id}>
        <header className="cm-doc-card-header">
          <span className="cm-doc-card-icon"><i className="fas fa-book" /></span>
          <div className="cm-doc-card-titles">
            <h3 className="cm-doc-card-title" title={m.name}>{p.highlight(m.name)}</h3>
            <span className="cm-doc-card-meta">
              {total === 1 ? "1 documento" : total + " documentos"}
              {" · Actualizado el "}{fechaCorta(m.updated_at)}
            </span>
          </div>
          {p.canManage && (
            <div className="cm-doc-card-tools">
              <button type="button" className="cm-doc-icon-btn" title="Editar módulo"
                      aria-label={"Editar " + m.name}
                      onClick={() => p.onEdit(m)} data-testid={"doc-edit-" + m.id}>
                <i className="fas fa-pen" />
              </button>
              <button type="button" className="cm-doc-icon-btn cm-doc-icon-btn--danger" title="Eliminar módulo"
                      aria-label={"Eliminar " + m.name}
                      onClick={() => p.onDelete(m)} data-testid={"doc-delete-" + m.id}>
                <i className="fas fa-trash-alt" />
              </button>
            </div>
          )}
        </header>

        {m.description && <p className="cm-doc-card-description">{m.description}</p>}

        {total === 0 ? (
          <div className="cm-doc-card-empty">
            <i className="far fa-folder-open" />
            <span>Este módulo todavía no tiene documentos.</span>
            {p.canManage && (
              <button type="button" className="cm-doc-link" onClick={() => p.onEdit(m)}>Agregar documentos</button>
            )}
          </div>
        ) : (
          <ul className="cm-doc-file-list">
            {visibles.map((f) => this.renderFile(f))}
          </ul>
        )}

        {(ocultos > 0 || (this.state.expanded && files.length > VISIBLES && !p.filtering)) && (
          <button type="button" className="cm-doc-card-more"
                  onClick={() => this.setState({ expanded: !this.state.expanded })}>
            {this.state.expanded
              ? <span>Ver menos <i className="fas fa-chevron-up" /></span>
              : <span>Ver {ocultos} más <i className="fas fa-chevron-down" /></span>}
          </button>
        )}
      </article>
    );
  }
}

export default ModuleCard;
