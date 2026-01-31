import React from "react";
import Swal from "sweetalert2/dist/sweetalert2.js";
import { CmDataTable } from "../../generalcomponents/ui";

class index extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      data: [],
      loading: true,
      submitBtnFile: false,
      file: null,
      searchTerm: "",
      meta: { total: 0, page: 1, per_page: 10, total_pages: 1 },
    };

    this.columns = [
      { key: "name", label: "Nombre" },
      { key: "code", label: "Prefijo" },
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

  loadData = (page, perPage, searchTerm) => {
    const p = page || this.state.meta.page;
    const pp = perPage || this.state.meta.per_page;
    const term = searchTerm !== undefined ? searchTerm : this.state.searchTerm;

    this.setState({ loading: true });

    let url = `/get_customers?page=${p}&per_page=${pp}`;
    if (term) url += `&name=${encodeURIComponent(term)}`;

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

  messageSuccess = (response) => {
    Swal.fire({
      position: "center",
      type: "success",
      title: `${response.success}`,
      showConfirmButton: false,
      timer: 1500,
    });
  };

  uploadExel = (e) => {
    this.setState({
      file: e.target.files[0],
      submitBtnFile: true,
    });
  };

  handleClickUpload = () => {
    const formData = new FormData();
    formData.append("file", this.state.file);
    fetch(`/import_customers`, {
      method: "POST",
      body: formData,
      headers: {},
    })
      .then((res) => res.json())
      .catch((error) => console.error("Error:", error))
      .then((data) => {
        this.loadData(1);
        this.messageSuccess(data);
        this.setState({ submitBtnFile: false });
      });
  };

  delete = (id) => {
    Swal.fire({
      title: "¿Estás seguro?",
      text: "El registro será eliminado permanentemente",
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#2a3f53",
      cancelButtonColor: "#dc3545",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.value) {
        fetch("/customers/" + id, { method: "delete" })
          .then((response) => response.json())
          .then(() => {
            this.loadData();
            Swal.fire("Eliminado", "El registro fue eliminado con éxito", "success");
          });
      }
    });
  };

  renderActions = (row) => {
    const { estados } = this.props;
    return (
      <React.Fragment>
        {estados.edit && (
          <a href={`/customers/${row.id}/edit`} className="cm-dt-action-btn edit" title="Editar">
            <i className="fas fa-pen" />
          </a>
        )}
        {estados.delete && (
          <button onClick={() => this.delete(row.id)} className="cm-dt-action-btn delete" title="Eliminar">
            <i className="fas fa-trash" />
          </button>
        )}
      </React.Fragment>
    );
  };

  renderHeaderActions = () => {
    const { estados } = this.props;
    return (
      <React.Fragment>
        {estados.download_file && (
          <a href="/download_file/customers.xls" target="_blank" className="cm-btn cm-btn-outline cm-btn-sm">
            <i className="fas fa-file-excel" /> Exportar
          </a>
        )}

        <div className="dropdown">
          <button
            className="cm-btn cm-btn-outline cm-btn-sm dropdown-toggle"
            type="button"
            data-toggle="dropdown"
          >
            <i className="fas fa-upload" /> Importar
          </button>
          <div className="dropdown-menu dropdown-menu-right">
            <a
              className="dropdown-item"
              href="https://mybc1.s3.amazonaws.com/uploads/rseguimiento/evidencia/700/FORMATO_SUBIR_CLIENTES.xlsx"
            >
              Descargar formato
            </a>
            <label className="dropdown-item" htmlFor="customerFile" style={{ cursor: "pointer", marginBottom: 0 }}>
              Cargar archivo
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

        {estados.create && (
          <a href="/customers/new" className="cm-btn cm-btn-accent cm-btn-sm">
            <i className="fas fa-plus" /> Nuevo Cliente
          </a>
        )}
      </React.Fragment>
    );
  };

  render() {
    const { meta } = this.state;
    return (
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
            <a href="/customers/new" className="cm-btn cm-btn-accent cm-btn-sm" style={{ marginTop: "8px" }}>
              <i className="fas fa-plus" /> Nuevo Cliente
            </a>
          ) : null
        }
        // Paginación server-side
        serverPagination
        serverMeta={meta}
        onPageChange={this.handlePageChange}
        onPerPageChange={this.handlePerPageChange}
      />
    );
  }
}

export default index;
