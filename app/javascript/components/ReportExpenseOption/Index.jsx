import React, { Component } from 'react';
import Swal from "sweetalert2/dist/sweetalert2.js";
import FormCreate from './FormCreate';
import { CmDataTable, CmPageActions } from '../../generalcomponents/ui';

function csrfToken() {
  var meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}

class Index extends Component {
  constructor(props) {
    super(props);
    this.state = {
      modal: false,
      modeEdit: false,
      ErrorValues: true,
      id: "",
      formCreate: {
        name: "",
        category: "",
      },
    };

    this.columns = [
      { key: "name", label: "Nombre" },
      { key: "category", label: "Tipo" },
    ];
  }

  toogle = (from) => {
    if (from === "new") {
      this.setState({ modal: true });
      this.clearValues();
    } else {
      this.setState({ modal: false });
      this.clearValues();
    }
  };

  clearValues = () => {
    this.setState({
      modeEdit: false,
      ErrorValues: true,
      id: "",
      formCreate: { name: "", category: "" },
    });
  };

  HandleChange = (e) => {
    this.setState({
      formCreate: Object.assign({}, this.state.formCreate, { [e.target.name]: e.target.value }),
    });
  };

  validationForm = () => {
    if (this.state.formCreate.name !== "" && this.state.formCreate.category !== "") {
      this.setState({ ErrorValues: true });
      return true;
    }
    this.setState({ ErrorValues: false });
    return false;
  };

  HandleClick = () => {
    if (!this.validationForm()) return;
    var self = this;
    var url = this.state.modeEdit ? "/report_expense_options/" + this.state.id : "/report_expense_options";
    var method = this.state.modeEdit ? "PATCH" : "POST";

    fetch(url, {
      method: method,
      body: JSON.stringify(this.state.formCreate),
      headers: { "X-CSRF-Token": csrfToken(), "Content-Type": "application/json" },
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        self.setState({ modal: false });
        self.clearValues();
        self.props.loadData();
        Swal.fire({ position: "center", type: data.type, title: data.success, showConfirmButton: false, timer: 1500 });
      });
  };

  edit = (row) => {
    this.setState({
      modeEdit: true,
      modal: true,
      id: row.id,
      formCreate: { name: row.name, category: row.category },
    });
  };

  delete = (id) => {
    var self = this;
    Swal.fire({
      title: "¿Estás seguro?",
      text: "El registro será eliminado permanentemente",
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#2a3f53",
      cancelButtonColor: "#dc3545",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    }).then(function(result) {
      if (result.value) {
        fetch("/report_expense_options/" + id, {
          method: "delete",
          headers: { "X-CSRF-Token": csrfToken(), "Content-Type": "application/json" },
        })
          .then(function(r) { return r.json(); })
          .then(function() { self.props.loadData(); });
      }
    });
  };

  openMenu = (e) => {
    e.stopPropagation();
    var btn = e.currentTarget;
    var menu = btn.nextElementSibling;
    document.querySelectorAll('.cm-dt-menu-dropdown.open').forEach(function(m) { m.classList.remove('open'); });
    var rect = btn.getBoundingClientRect();
    document.body.appendChild(menu);
    menu.style.top = (rect.bottom + 4) + 'px';
    menu.style.left = (rect.right - 160) + 'px';
    menu.classList.add('open');
    var close = function(ev) {
      if (!menu.contains(ev.target) && !btn.contains(ev.target)) {
        menu.classList.remove('open');
        btn.parentNode.appendChild(menu);
        document.removeEventListener('click', close);
      }
    };
    document.addEventListener('click', close);
  };

  renderActions = (row) => (
    <div className="cm-dt-menu">
      <button className="cm-dt-menu-trigger" onClick={this.openMenu}><i className="fas fa-ellipsis-v" /></button>
      <div className="cm-dt-menu-dropdown">
        {this.props.estados.edit && (
          <button onClick={() => this.edit(row)} className="cm-dt-menu-item"><i className="fas fa-pen" /> Editar</button>
        )}
        {this.props.estados.delete && (
          <button onClick={() => this.delete(row.id)} className="cm-dt-menu-item cm-dt-menu-item--danger"><i className="fas fa-trash" /> Eliminar</button>
        )}
      </div>
    </div>
  );

  render() {
    return (
      <React.Fragment>
        <CmPageActions title="Tipos de Gastos" />

        {this.state.modal && (
          <FormCreate
            backdrop="static"
            modal={this.state.modal}
            toggle={this.toogle}
            title={this.state.modeEdit ? "Actualizar Tipo de Gasto" : "Crear Tipo de Gasto"}
            nameBnt={this.state.modeEdit ? "Actualizar" : "Crear"}
            formValues={this.state.formCreate}
            submitForm={this.HandleClick}
            onChangeForm={this.HandleChange}
            errorValues={this.state.ErrorValues}
          />
        )}

        <CmDataTable
          columns={this.columns}
          data={this.props.data}
          loading={this.props.loading}
          actions={this.renderActions}
          searchPlaceholder="Buscar tipo de gasto..."
          emptyMessage="No hay tipos de gastos registrados"
          onSearch={this.props.onSearch}
          serverPagination
          serverMeta={this.props.meta}
          onSort={this.props.onSort}
          onPageChange={this.props.onPageChange}
          onPerPageChange={this.props.onPerPageChange}
          headerActions={
            this.props.estados.create
              ? <button className="cm-btn cm-btn-accent cm-btn-sm" onClick={() => this.toogle("new")}><i className="fas fa-plus" /> Nuevo Tipo de Gasto</button>
              : null
          }
          emptyAction={
            this.props.estados.create
              ? <button onClick={() => this.toogle("new")} className="cm-btn cm-btn-accent cm-btn-sm" style={{ marginTop: "8px" }}><i className="fas fa-plus" /> Nuevo Tipo de Gasto</button>
              : null
          }
        />
      </React.Fragment>
    );
  }
}

export default Index;
