import React from "react";
import Swal from "sweetalert2/dist/sweetalert2.js";
import NumberFormat from "react-number-format";
import Select from "react-select";
import { CmDataTable, CmPageActions, CmModal, CmButton } from "../../generalcomponents/ui";
import IndexInvoice from "../SalesOrders/IndexInvoice";

function csrfToken() {
  var meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}

var EMPTY_FORM = {
  created_date: "",
  order_number: "",
  order_value: "",
  cost_center_id: "",
  description: "",
};

function formatDate(fecha) {
  if (!fecha) return "";
  var d = new Date(fecha);
  var months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  var minutes = d.getMinutes();
  var timeValue = d.getHours() + (minutes < 10 ? ":0" + minutes : ":" + minutes);
  return months[d.getMonth()] + " " + d.getDate() + " del " + d.getFullYear() + " / " + timeValue;
}

class index extends React.Component {
  constructor(props) {
    super(props);

    var costCenterOptions = [];
    if (props.cost_centers) {
      props.cost_centers.forEach(function(item) {
        costCenterOptions.push({ label: item.code, value: item.id });
      });
    }

    var clientOptions = [];
    if (props.clientes) {
      props.clientes.forEach(function(item) {
        clientOptions.push({ label: item.name, value: item.id });
      });
    }

    this.state = {
      // Modal create/edit
      modalOpen: false,
      modalMode: "new",
      editId: null,
      form: Object.assign({}, EMPTY_FORM),
      selectedOptionCentro: { value: "", label: "Centro de costo" },
      order_file: null,
      ErrorValues: true,
      saving: false,

      // Modal invoices
      modalInvoiceOpen: false,
      invoiceSalesOrder: {},

      // Options
      dataCostCenter: costCenterOptions,
      dataClients: clientOptions,

      // Filter panel
      showFilter: false,
      filterForm: {
        date_desde: "",
        date_hasta: "",
        number_order: "",
        cost_center_id: "",
        state: "",
        description: "",
        customer: "",
        number_invoice: "",
        quotation_number: "",
      },
      filterCentro: null,
      filterCustomer: null,
      filterCostCenterOptions: [],
      filterCostCenterLoading: false,
    };

    this.columns = [
      {
        key: "cost_center_code",
        label: "Centro de Costo",
        width: "150px",
        render: function(r) {
          return r.cost_center ? r.cost_center.code : "";
        }
      },
      {
        key: "customer_name",
        label: "Cliente",
        width: "150px",
        render: function(r) {
          return r.cost_center && r.cost_center.customer ? r.cost_center.customer.name : "";
        }
      },
      { key: "created_date", label: "Fecha Orden", width: "130px" },
      { key: "order_number", label: "# Orden", width: "130px" },
      {
        key: "quotation_number",
        label: "# Cotización",
        width: "150px",
        render: function(r) {
          return r.cost_center ? r.cost_center.quotation_number : "";
        }
      },
      {
        key: "order_value",
        label: "Valor",
        width: "140px",
        render: function(r) {
          return React.createElement(NumberFormat, {
            value: r.order_value,
            displayType: "text",
            thousandSeparator: true,
            prefix: "$"
          });
        }
      },
      {
        key: "customer_invoices",
        label: "Facturas",
        width: "420px",
        sortable: false,
        render: function(r) {
          if (!r.customer_invoices || r.customer_invoices.length === 0) {
            return React.createElement("span", { style: { color: "#999", fontSize: "12px" } }, "Sin facturas");
          }
          return React.createElement("table", { style: { tableLayout: "fixed", width: "100%", fontSize: "12px", borderCollapse: "collapse" } },
            React.createElement("thead", null,
              React.createElement("tr", null,
                React.createElement("td", { style: { padding: "4px", textAlign: "center", fontWeight: "bold", border: "1px solid #e0e0e0" } }, "Numero"),
                React.createElement("td", { style: { padding: "4px", textAlign: "center", fontWeight: "bold", border: "1px solid #e0e0e0" } }, "Fecha"),
                React.createElement("td", { style: { padding: "4px", textAlign: "center", fontWeight: "bold", border: "1px solid #e0e0e0" } }, "Valor")
              )
            ),
            React.createElement("tbody", null,
              r.customer_invoices.map(function(inv) {
                return React.createElement("tr", { key: inv.id },
                  React.createElement("td", { style: { padding: "5px", textAlign: "center", border: "1px solid #e0e0e0" } }, inv.number_invoice),
                  React.createElement("td", { style: { padding: "5px", textAlign: "center", border: "1px solid #e0e0e0" } }, inv.invoice_date),
                  React.createElement("td", { style: { padding: "5px", textAlign: "center", border: "1px solid #e0e0e0" } },
                    React.createElement(NumberFormat, {
                      value: inv.invoice_value,
                      displayType: "text",
                      thousandSeparator: true,
                      prefix: "$"
                    })
                  )
                );
              })
            )
          );
        }
      },
      {
        key: "sum_invoices",
        label: "Total Facturas",
        width: "150px",
        render: function(r) {
          return React.createElement(NumberFormat, {
            value: r.sum_invoices,
            displayType: "text",
            thousandSeparator: true,
            prefix: "$"
          });
        }
      },
      {
        key: "total_engineering_values",
        label: "Total Ingeniería",
        width: "150px",
        render: function(r) {
          return React.createElement(NumberFormat, {
            value: r.total_engineering_values,
            displayType: "text",
            thousandSeparator: true,
            prefix: "$"
          });
        }
      },
      { key: "description", label: "Descripción", width: "250px" },
      {
        key: "invoiced_state",
        label: "Estado CC",
        width: "180px",
        render: function(r) {
          return r.cost_center ? r.cost_center.invoiced_state : "";
        }
      },
      {
        key: "order_file",
        label: "Archivo",
        width: "90px",
        sortable: false,
        render: function(r) {
          if (r.order_file && r.order_file.url != null) {
            return React.createElement("a", {
              href: r.order_file.url,
              target: "_blank",
              className: "btn btn-sm"
            }, React.createElement("i", { className: "fas fa-download" }));
          }
          return React.createElement("i", { className: "fas fa-times color-false" });
        }
      },
      {
        key: "created_at",
        label: "Creación",
        width: "220px",
        render: function(r) {
          return React.createElement("span", null,
            formatDate(r.created_at),
            r.user ? React.createElement("span", null, React.createElement("br"), r.user.name) : null
          );
        }
      },
      {
        key: "updated_at",
        label: "Ultima actualización",
        width: "220px",
        render: function(r) {
          return React.createElement("span", null,
            formatDate(r.updated_at),
            r.last_user_edited ? React.createElement("span", null, React.createElement("br"), r.last_user_edited.name) : null
          );
        }
      },
    ];
  }

  // ─── Permission helper ───

  getState = (userId) => {
    var estados = this.props.estados;
    if (estados.edit && this.props.usuario.id === userId) return true;
    if (estados.edit_all) return true;
    if (estados.edit && estados.edit_all) return true;
    return false;
  };

  // ─── Create / Edit modal ───

  openNewModal = () => {
    this.setState({
      modalOpen: true,
      modalMode: "new",
      editId: null,
      form: Object.assign({}, EMPTY_FORM),
      selectedOptionCentro: { value: "", label: "Centro de costo" },
      order_file: null,
      ErrorValues: true,
      saving: false,
    });
  };

  openEditModal = (row) => {
    this.setState({
      modalOpen: true,
      modalMode: "edit",
      editId: row.id,
      form: {
        created_date: row.created_date || "",
        order_number: row.order_number || "",
        order_value: row.order_value || "",
        cost_center_id: row.cost_center_id || "",
        description: row.description || "",
      },
      selectedOptionCentro: {
        value: row.cost_center_id,
        label: row.cost_center ? row.cost_center.code : "Centro de costo",
      },
      order_file: null,
      ErrorValues: true,
      saving: false,
    });
  };

  closeModal = () => {
    this.setState({ modalOpen: false });
  };

  handleFormChange = (e) => {
    var form = Object.assign({}, this.state.form);
    form[e.target.name] = e.target.value;
    this.setState({ form: form });
  };

  handleChangeAutocompleteCentro = (selectedOptionCentro) => {
    var form = Object.assign({}, this.state.form, { cost_center_id: selectedOptionCentro.value });
    this.setState({ selectedOptionCentro: selectedOptionCentro, form: form });
  };

  handleFileOrderFile = (e) => {
    this.setState({ order_file: e.target.files[0] });
  };

  validationForm = () => {
    var f = this.state.form;
    if (f.created_date !== "" && f.order_number !== "" && f.order_value !== "") {
      this.setState({ ErrorValues: true });
      return true;
    }
    this.setState({ ErrorValues: false });
    return false;
  };

  handleSubmit = () => {
    if (!this.validationForm()) return;

    var formData = new FormData();
    formData.append("created_date", this.state.form.created_date);
    formData.append("order_number", this.state.form.order_number);
    formData.append("order_value", this.state.form.order_value);
    formData.append("order_file", this.state.order_file == null ? "" : this.state.order_file);
    formData.append("user_id", this.props.usuario.id);
    formData.append("cost_center_id", this.state.form.cost_center_id);
    formData.append("description", this.state.form.description);

    var isNew = this.state.modalMode === "new";
    var url = isNew ? "/sales_orders" : "/sales_orders/" + this.state.editId;
    var method = isNew ? "POST" : "PATCH";

    this.setState({ saving: true });

    fetch(url, {
      method: method,
      body: formData,
      headers: { "X-CSRF-Token": csrfToken() },
    })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        this.setState({ modalOpen: false, saving: false });
        this.props.loadData();
        Swal.fire({
          position: "center",
          type: data.type,
          title: data.message,
          showConfirmButton: false,
          timer: 1500
        });
      }.bind(this))
      .catch(function(error) {
        console.error("Error:", error);
        this.setState({ saving: false });
      }.bind(this));
  };

  // ─── Delete ───

  handleDelete = (row) => {
    Swal.fire({
      title: "¿Estas seguro?",
      text: "El registro sera eliminado permanentemente",
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#2a3f53",
      cancelButtonColor: "#dc3545",
      confirmButtonText: "Si, eliminar",
      cancelButtonText: "Cancelar",
    }).then(function(result) {
      if (result.value) {
        fetch("/sales_orders/" + row.id, {
          method: "delete",
          headers: { "X-CSRF-Token": csrfToken() },
        })
          .then(function(response) { return response.json(); })
          .then(function() {
            this.props.loadData();
            Swal.fire("Eliminado", "El registro fue eliminado con exito", "success");
          }.bind(this));
      }
    }.bind(this));
  };

  // ─── Invoice modal ───

  openInvoiceModal = (row) => {
    this.setState({ modalInvoiceOpen: true, invoiceSalesOrder: row });
  };

  closeInvoiceModal = () => {
    this.setState({ modalInvoiceOpen: false, invoiceSalesOrder: {} });
  };

  // ─── Filters ───

  toggleFilter = () => {
    if (this.state.showFilter) {
      this.setState({
        showFilter: false,
        filterForm: {
          date_desde: "", date_hasta: "", number_order: "", cost_center_id: "",
          state: "", description: "", customer: "", number_invoice: "", quotation_number: "",
        },
        filterCentro: null,
        filterCustomer: null,
        filterCostCenterOptions: [],
      });
      if (this.props.onClearFilters) this.props.onClearFilters();
    } else {
      this.setState({ showFilter: true });
    }
  };

  handleFilterChange = (e) => {
    var filterForm = Object.assign({}, this.state.filterForm);
    filterForm[e.target.name] = e.target.value;
    this.setState({ filterForm: filterForm });
  };

  handleFilterCentro = (opt) => {
    var filterForm = Object.assign({}, this.state.filterForm, { cost_center_id: opt ? opt.value : "" });
    this.setState({ filterCentro: opt, filterForm: filterForm });
  };

  handleFilterCostCenterSearch = (inputValue) => {
    if (!inputValue || inputValue.length < 3) {
      this.setState({ filterCostCenterOptions: [] });
      return;
    }
    if (this._ccTimer) clearTimeout(this._ccTimer);
    this._ccTimer = setTimeout(() => {
      this.setState({ filterCostCenterLoading: true });
      fetch("/search_cost_centers?q=" + encodeURIComponent(inputValue), {
        headers: { "X-CSRF-Token": csrfToken() },
      })
        .then(function(r) { return r.json(); })
        .then((data) => {
          this.setState({
            filterCostCenterOptions: data.map(function(d) { return { value: d.id, label: d.label }; }),
            filterCostCenterLoading: false,
          });
        });
    }, 300);
  };

  handleFilterCustomer = (opt) => {
    var filterForm = Object.assign({}, this.state.filterForm, { customer: opt ? opt.value : "" });
    this.setState({ filterCustomer: opt, filterForm: filterForm });
  };

  applyFilters = () => {
    if (this.props.onApplyFilters) this.props.onApplyFilters(this.state.filterForm);
  };

  getExportUrl = () => {
    if (!this.props.filtering) return "/download_file/sales_orders/todos.xls";
    var f = this.props.filters || {};
    var params = [];
    if (f.date_desde) params.push("date_desde=" + encodeURIComponent(f.date_desde));
    if (f.date_hasta) params.push("date_hasta=" + encodeURIComponent(f.date_hasta));
    if (f.number_order) params.push("number_order=" + encodeURIComponent(f.number_order));
    if (f.cost_center_id) params.push("cost_center_id=" + encodeURIComponent(f.cost_center_id));
    if (f.state) params.push("state=" + encodeURIComponent(f.state));
    if (f.description) params.push("description=" + encodeURIComponent(f.description));
    if (f.customer) params.push("customer=" + encodeURIComponent(f.customer));
    if (f.number_invoice) params.push("number_invoice=" + encodeURIComponent(f.number_invoice));
    if (f.quotation_number) params.push("quotation_number=" + encodeURIComponent(f.quotation_number));
    return "/download_file/sales_orders/filtro.xls?" + params.join("&");
  };

  // ─── Hamburger menu ───

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
    var close = function(ev) {
      if (!menu.contains(ev.target) && !btn.contains(ev.target)) {
        menu.classList.remove('open');
        btn.parentNode.appendChild(menu);
        document.removeEventListener('click', close);
      }
    };
    document.addEventListener('click', close);
  };

  renderActions = (row) => {
    var estados = this.props.estados;
    var canEdit = this.getState(row.user_id);
    return (
      <div className="cm-dt-menu">
        <button className="cm-dt-menu-trigger" onClick={this.openMenu}>
          <i className="fas fa-ellipsis-v" />
        </button>
        <div className="cm-dt-menu-dropdown">
          <button onClick={this.openInvoiceModal.bind(this, row)} className="cm-dt-menu-item">
            <i className="fas fa-file-invoice" /> Facturas
          </button>
          {canEdit && (
            <button onClick={this.openEditModal.bind(this, row)} className="cm-dt-menu-item">
              <i className="fas fa-pen" /> Editar
            </button>
          )}
          {estados.delete && (
            <button onClick={this.handleDelete.bind(this, row)} className="cm-dt-menu-item cm-dt-menu-item--danger">
              <i className="fas fa-trash" /> Eliminar
            </button>
          )}
        </div>
      </div>
    );
  };

  renderHeaderActions = () => {
    var estados = this.props.estados;
    return (
      <React.Fragment>
        <button
          onClick={this.toggleFilter}
          className={"cm-btn cm-btn-sm" + (this.state.showFilter ? " cm-btn-accent" : " cm-btn-outline")}
        >
          <i className="fas fa-filter" /> Filtros
        </button>
        {estados.download_file && (
          <a href={this.getExportUrl()} target="_blank" className="cm-btn cm-btn-outline cm-btn-sm">
            <i className="fas fa-file-excel" /> Exportar
          </a>
        )}
      </React.Fragment>
    );
  };

  // ─── Create/Edit Modal render ───

  renderFormModal = () => {
    var s = this.state;
    var isNew = s.modalMode === "new";
    var title = isNew ? "Nueva Orden de Compra" : "Editar Orden de Compra";
    var icon = "fas fa-money-check-alt";

    return (
      <CmModal
        isOpen={s.modalOpen}
        toggle={this.closeModal}
        title={<span><i className={icon} /> {title}</span>}
        size="lg"
        footer={
          <React.Fragment>
            <CmButton variant="outline" onClick={this.closeModal}>Cancelar</CmButton>
            <CmButton variant="accent" onClick={this.handleSubmit} disabled={s.saving}>
              {s.saving
                ? <React.Fragment><i className="fas fa-spinner fa-spin" /> Guardando...</React.Fragment>
                : <React.Fragment><i className="fas fa-save" /> {isNew ? "Crear" : "Actualizar"}</React.Fragment>
              }
            </CmButton>
          </React.Fragment>
        }
      >
        <div className="row">
          <div className="col-md-6 mb-4">
            <label>Fecha de generacion <small className="validate-label">*</small></label>
            <input
              type="date"
              name="created_date"
              value={s.form.created_date}
              onChange={this.handleFormChange}
              className={"form form-control" + (s.ErrorValues === false && s.form.created_date === "" ? " error-class" : "")}
            />
          </div>

          <div className="col-md-6 mb-4">
            <label>Numero de orden <small className="validate-label">*</small></label>
            <input
              type="text"
              name="order_number"
              value={s.form.order_number}
              onChange={this.handleFormChange}
              className={"form form-control" + (s.ErrorValues === false && s.form.order_number === "" ? " error-class" : "")}
              placeholder="Numero de orden"
            />
          </div>

          <div className="col-md-6 mt-2">
            <label>Valor <small className="validate-label">*</small></label>
            <NumberFormat
              name="order_value"
              thousandSeparator={true}
              prefix={"$"}
              className={"form form-control" + (s.ErrorValues === false && s.form.order_value === "" ? " error-class" : "")}
              value={s.form.order_value}
              onChange={this.handleFormChange}
              placeholder="Valor"
            />
          </div>

          <div className="col-md-6 mt-2">
            <input
              type="hidden"
              name="cost_center_id"
              value={s.selectedOptionCentro.value}
            />
            <label>Centro de costo</label>
            <Select
              onChange={this.handleChangeAutocompleteCentro}
              options={this.state.dataCostCenter}
              autoFocus={false}
              className={"link-form" + (s.ErrorValues === false && s.form.cost_center_id === "" ? " error-class" : "")}
              value={s.selectedOptionCentro}
            />
          </div>

          <div className="col-md-12 mt-2">
            <label>Archivo</label>
            <input
              type="file"
              name="order_file"
              onChange={this.handleFileOrderFile}
              className="form form-control"
              placeholder="Comprobante"
            />
          </div>

          <div className="col-md-12 mt-4">
            <textarea
              name="description"
              value={s.form.description}
              onChange={this.handleFormChange}
              rows="4"
              className="form form-control"
              placeholder="Descripcion..."
            />
          </div>

          {s.ErrorValues === false && (
            <div className="col-md-12 mt-2">
              <div className="alert alert-danger" role="alert">
                <b>Debes de completar todos los campos requeridos</b>
              </div>
            </div>
          )}
        </div>
      </CmModal>
    );
  };

  renderFilterPanel = () => {
    if (!this.state.showFilter) return null;
    var f = this.state.filterForm;

    return (
      <div className="cm-filter-panel">
        {/* Row 1: Fecha desde | Fecha hasta | Numero | Centro de costo */}
        <div className="cm-filter-row">
          <div className="cm-form-group">
            <label className="cm-label">Fecha desde</label>
            <input type="date" name="date_desde" className="cm-input" value={f.date_desde} onChange={this.handleFilterChange} />
          </div>
          <div className="cm-form-group">
            <label className="cm-label">Fecha hasta</label>
            <input type="date" name="date_hasta" className="cm-input" value={f.date_hasta} onChange={this.handleFilterChange} />
          </div>
          <div className="cm-form-group">
            <label className="cm-label">Numero</label>
            <input type="text" name="number_order" className="cm-input" value={f.number_order} onChange={this.handleFilterChange} placeholder="Numero de orden" />
          </div>
          <div className="cm-form-group">
            <label className="cm-label">Centro de costo</label>
            <Select
              placeholder="Centro de costo"
              options={this.state.filterCostCenterOptions}
              isLoading={this.state.filterCostCenterLoading}
              onInputChange={this.handleFilterCostCenterSearch}
              onChange={this.handleFilterCentro}
              isClearable={true}
              value={this.state.filterCentro}
              noOptionsMessage={() => "Escriba 3+ letras para buscar"}
              filterOption={null}
              menuPortalTarget={document.body}
              styles={{ menuPortal: (base) => Object.assign({}, base, { zIndex: 9999 }) }}
            />
          </div>
        </div>
        {/* Row 2: Estado de centro de costo | Descripción | Clientes | Numero de factura */}
        <div className="cm-filter-row">
          <div className="cm-form-group">
            <label className="cm-label">Estado de centro de costo</label>
            <select name="state" className="cm-input" value={f.state} onChange={this.handleFilterChange}>
              <option value="">Seleccione un estado</option>
              <option value="LEGALIZADO">LEGALIZADO</option>
              <option value="FACTURADO">FACTURADO</option>
              <option value="FACTURADO PARCIAL">FACTURADO PARCIAL</option>
              <option value="PENDIENTE DE ORDEN DE COMPRA">PENDIENTE DE ORDEN DE COMPRA</option>
              <option value="PENDIENTE DE COTIZACION">PENDIENTE DE COTIZACION</option>
              <option value="LEGALIZADO PARCIAL">LEGALIZADO PARCIAL</option>
            </select>
          </div>
          <div className="cm-form-group">
            <label className="cm-label">Descripción</label>
            <input type="text" name="description" className="cm-input" value={f.description} onChange={this.handleFilterChange} placeholder="Descripción..." />
          </div>
          <div className="cm-form-group">
            <label className="cm-label">Clientes</label>
            <Select
              placeholder="Cliente"
              options={this.state.dataClients}
              onChange={this.handleFilterCustomer}
              isClearable={true}
              value={this.state.filterCustomer}
              menuPortalTarget={document.body}
              styles={{ menuPortal: (base) => Object.assign({}, base, { zIndex: 9999 }) }}
            />
          </div>
          <div className="cm-form-group">
            <label className="cm-label">Numero de factura</label>
            <input type="text" name="number_invoice" className="cm-input" value={f.number_invoice} onChange={this.handleFilterChange} placeholder="Numero de factura" />
          </div>
        </div>
        {/* Row 3: Numero de cotización | (empty) | (empty) | Aplicar + Cerrar filtros */}
        <div className="cm-filter-row">
          <div className="cm-form-group">
            <label className="cm-label">Numero de cotización</label>
            <input type="text" name="quotation_number" className="cm-input" value={f.quotation_number} onChange={this.handleFilterChange} placeholder="Numero de cotización" />
          </div>
          <div className="cm-form-group" />
          <div className="cm-form-group" />
          <div className="cm-form-group" style={{ display: "flex", alignItems: "flex-end", justifyContent: "flex-end", gap: 8 }}>
            <button className="cm-btn cm-btn-primary cm-btn-sm" onClick={this.applyFilters}>Aplicar</button>
            <button className="cm-btn cm-btn-outline cm-btn-sm" onClick={this.toggleFilter}>Cerrar filtros</button>
          </div>
        </div>
      </div>
    );
  };

  render() {
    var meta = this.props.meta;
    return (
      <React.Fragment>
        <CmPageActions>
          {this.props.estados.create && (
            <button onClick={this.openNewModal} className="cm-btn cm-btn-accent cm-btn-sm">
              <i className="fas fa-plus" /> Nueva Orden
            </button>
          )}
        </CmPageActions>
        {this.renderFilterPanel()}
        <CmDataTable
          columns={this.columns}
          data={this.props.data}
          loading={this.props.loading}
          actions={this.renderActions}
          headerActions={this.renderHeaderActions()}
          onSearch={this.props.onSearch}
          searchPlaceholder="Buscar orden..."
          emptyMessage="No hay ordenes de compra registradas"
          emptyAction={
            this.props.estados.create
              ? <button onClick={this.openNewModal} className="cm-btn cm-btn-accent cm-btn-sm" style={{ marginTop: "8px" }}>
                  <i className="fas fa-plus" /> Nueva Orden
                </button>
              : null
          }
          serverPagination
          serverMeta={meta}
          onSort={this.props.onSort}
          onPageChange={this.props.onPageChange}
          onPerPageChange={this.props.onPerPageChange}
        />
        {this.renderFormModal()}
        {this.state.modalInvoiceOpen && (
          <IndexInvoice
            toggle={this.closeInvoiceModal}
            backdrop="static"
            modal={this.state.modalInvoiceOpen}
            sales_order={this.state.invoiceSalesOrder}
            loadData={this.props.loadData}
          />
        )}
      </React.Fragment>
    );
  }
}

export default index;
