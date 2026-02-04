import React from "react";
import Swal from "sweetalert2/dist/sweetalert2.js";
import NumberFormat from "react-number-format";
import Select from "react-select";
import { CmDataTable, CmPageActions, CmModal, CmInput, CmButton } from "../../generalcomponents/ui";

var EMPTY_FORM = {
  provider_id: "",
  sales_date: "",
  sales_number: "",
  amount: "",
  delivery_date: "",
  sales_state: "",
  description: "",
  cost_center_id: ""
};

var EMPTY_FILTERS = {
  provider_id: "",
  description: "",
  sales_date: "",
  cost_center_id: "",
  estado: "",
  date_desde: "",
  date_hasta: "",
  sales_number: "",
};

function csrfToken() {
  var meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}

function formatCurrency(value) {
  if (value == null || value === "") return "";
  return React.createElement(NumberFormat, {
    value: value,
    displayType: "text",
    thousandSeparator: true,
    prefix: "$"
  });
}

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

    var self = this;

    this.state = {
      data: [],
      loading: true,
      searchTerm: "",
      sortKey: null,
      sortDir: "asc",
      meta: { total: 0, page: 1, per_page: 10, total_pages: 1 },
      // Modal
      modalOpen: false,
      modalMode: "new",
      editId: null,
      form: Object.assign({}, EMPTY_FORM),
      errors: [],
      saving: false,
      // ShowInfo
      showInfoOpen: false,
      showInfoData: null,
      // Facturas modal
      facturasOpen: false,
      facturasData: [],
      facturasMaterialId: null,
      facturasFormOpen: false,
      facturasEditId: null,
      facturasForm: { number: "", value: "", observation: "" },
      // Inline state edit
      editingStateId: null,
      // Autocomplete
      selectedProvider: null,
      selectedCostCenter: null,
      // Filters
      showFilters: false,
      filters: Object.assign({}, EMPTY_FILTERS),
      filterCentro: null,
      filterCostCenterOptions: [],
      filterCostCenterLoading: false,
    };

    this.providerOptions = (props.providers || []).map(function(p) {
      return { label: p.name, value: p.id };
    });

    this.costCenterOptions = (props.cost_center || []).map(function(cc) {
      return { label: cc.code, value: cc.id };
    });

    this.columns = [
      {
        key: "provider_name",
        label: "Proveedor",
        width: "180px",
        render: function(row) {
          return row.provider ? row.provider.name : "";
        }
      },
      {
        key: "cost_center_code",
        label: "Centro de Costo",
        width: "150px",
        render: function(row) {
          return row.cost_center ? row.cost_center.code : "";
        }
      },
      { key: "sales_number", label: "# Orden", width: "120px" },
      {
        key: "amount",
        label: "Valor",
        width: "130px",
        render: function(row) {
          return formatCurrency(row.amount);
        }
      },
      { key: "description", label: "Descripción", width: "250px" },
      { key: "sales_date", label: "Fecha Orden", width: "120px" },
      { key: "delivery_date", label: "Fecha Entrega", width: "120px" },
      {
        key: "material_invoices",
        label: "Facturas",
        width: "380px",
        sortable: false,
        render: function(row) {
          if (!row.material_invoices || row.material_invoices.length === 0) {
            return React.createElement("span", { style: { color: "#999", fontSize: "12px" } }, "Sin facturas");
          }
          return React.createElement("table", { style: { tableLayout: "fixed", width: "100%", fontSize: "12px", borderCollapse: "collapse" } },
            React.createElement("thead", null,
              React.createElement("tr", null,
                React.createElement("td", { style: { padding: "4px", textAlign: "center", fontWeight: "bold", border: "1px solid #e0e0e0" } }, "Numero de factura"),
                React.createElement("td", { style: { padding: "4px", textAlign: "center", fontWeight: "bold", border: "1px solid #e0e0e0" } }, "Valor"),
                React.createElement("td", { style: { padding: "4px", textAlign: "center", fontWeight: "bold", border: "1px solid #e0e0e0" } }, "Descripcion")
              )
            ),
            React.createElement("tbody", null,
              row.material_invoices.map(function(inv) {
                return React.createElement("tr", { key: inv.id },
                  React.createElement("td", { style: { padding: "5px", textAlign: "center", border: "1px solid #e0e0e0" } }, inv.number),
                  React.createElement("td", { style: { padding: "5px", textAlign: "center", border: "1px solid #e0e0e0" } },
                    React.createElement(NumberFormat, { value: inv.value, displayType: "text", thousandSeparator: true, prefix: "$" })
                  ),
                  React.createElement("td", { style: { padding: "5px", textAlign: "center", border: "1px solid #e0e0e0" } }, inv.observation)
                );
              })
            )
          );
        }
      },
      {
        key: "sum_material_invoices",
        label: "Valor Facturas",
        width: "130px",
        render: function(row) {
          return formatCurrency(row.sum_material_invoices);
        }
      },
      {
        key: "sales_state",
        label: "Estado",
        width: "200px",
        render: function(row) {
          if (self.state.editingStateId === row.id) {
            return React.createElement(React.Fragment, null,
              React.createElement("select", {
                className: "cm-input",
                defaultValue: row.sales_state || "",
                onChange: function(e) { self.handleStateChange(row.id, e.target.value); },
                style: { display: "inline", width: "85%" }
              },
                React.createElement("option", { value: "" }, "Seleccione"),
                React.createElement("option", { value: "PROCESADO" }, "PROCESADO"),
                React.createElement("option", { value: "INGRESADO TOTAL" }, "INGRESADO TOTAL"),
                React.createElement("option", { value: "INGRESADO CON MAYOR VALOR EN FACTURA" }, "INGRESADO CON MAYOR VALOR EN FACTURA"),
                React.createElement("option", { value: "INGRESADO PARCIAL" }, "INGRESADO PARCIAL")
              ),
              React.createElement("i", { className: "fas fa-times", style: { cursor: "pointer", marginLeft: "6px" }, onClick: function() { self.toggleStateEdit(null); } })
            );
          }
          return React.createElement("span", null,
            row.sales_state, " ",
            self.props.estados.update_state ? React.createElement("i", { className: "fas fa-pencil-alt", style: { cursor: "pointer", marginLeft: "4px" }, onClick: function() { self.toggleStateEdit(row.id); } }) : null
          );
        }
      },
      {
        key: "created_at",
        label: "Creación",
        width: "200px",
        render: function(row) {
          return React.createElement("span", null,
            formatDate(row.created_at),
            row.user ? React.createElement("span", null, React.createElement("br"), row.user.names) : null
          );
        }
      },
      {
        key: "updated_at",
        label: "Ultima actualización",
        width: "200px",
        render: function(row) {
          return React.createElement("span", null,
            formatDate(row.updated_at),
            row.last_user_edited && row.last_user_edited.names ? React.createElement("span", null, React.createElement("br"), row.last_user_edited.names) : null
          );
        }
      },
    ];
  }

  componentDidMount() {
    this.loadData();
  }

  // ─── Data Loading ───

  loadData = function(page, perPage, searchTerm, sortKey, sortDir) {
    var self = this;
    var p = page || this.state.meta.page;
    var pp = perPage || this.state.meta.per_page;
    var term = searchTerm !== undefined ? searchTerm : this.state.searchTerm;
    var sk = sortKey !== undefined ? sortKey : this.state.sortKey;
    var sd = sortDir !== undefined ? sortDir : this.state.sortDir;

    this.setState({ loading: true });

    var url = "/get_materials?page=" + p + "&per_page=" + pp;
    if (term) url += "&search=" + encodeURIComponent(term);
    if (sk) url += "&sort=" + encodeURIComponent(sk) + "&dir=" + sd;

    var filters = self.state.filters;
    Object.keys(filters).forEach(function(key) {
      if (filters[key]) url += "&" + key + "=" + encodeURIComponent(filters[key]);
    });

    fetch(url, { headers: { "X-CSRF-Token": csrfToken() } })
      .then(function(response) { return response.json(); })
      .then(function(result) {
        self.setState({
          data: result.data,
          meta: result.meta,
          loading: false
        });
      });
  }.bind(this);

  handleSearch = function(term) {
    var self = this;
    this.setState({ searchTerm: term }, function() {
      self.loadData(1, self.state.meta.per_page, term);
    });
  }.bind(this);

  handlePageChange = function(page) {
    this.loadData(page, this.state.meta.per_page);
  }.bind(this);

  handlePerPageChange = function(perPage) {
    this.loadData(1, perPage);
  }.bind(this);

  handleSort = function(key, dir) {
    var self = this;
    this.setState({ sortKey: key, sortDir: dir }, function() {
      self.loadData(1, self.state.meta.per_page, undefined, key, dir);
    });
  }.bind(this);

  // ─── Filters ───

  toggleFilters = function() {
    if (this.state.showFilters) {
      this.setState({ showFilters: false, filters: Object.assign({}, EMPTY_FILTERS), filterCentro: null, filterCostCenterOptions: [] }, function() {
        this.loadData(1, this.state.meta.per_page);
      }.bind(this));
    } else {
      this.setState({ showFilters: true });
    }
  }.bind(this);

  handleFilterChange = function(e) {
    var newFilters = Object.assign({}, this.state.filters);
    newFilters[e.target.name] = e.target.value;
    this.setState({ filters: newFilters });
  }.bind(this);

  handleFilterCentro = function(opt) {
    var newFilters = Object.assign({}, this.state.filters, { cost_center_id: opt ? opt.value : "" });
    this.setState({ filterCentro: opt, filters: newFilters });
  }.bind(this);

  handleFilterCostCenterSearch = function(inputValue) {
    var self = this;
    if (!inputValue || inputValue.length < 3) { self.setState({ filterCostCenterOptions: [] }); return; }
    if (self._ccTimer) clearTimeout(self._ccTimer);
    self._ccTimer = setTimeout(function() {
      self.setState({ filterCostCenterLoading: true });
      fetch("/search_cost_centers?q=" + encodeURIComponent(inputValue), { headers: { "X-CSRF-Token": csrfToken() } })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          self.setState({
            filterCostCenterOptions: data.map(function(d) { return { value: d.id, label: d.label }; }),
            filterCostCenterLoading: false,
          });
        });
    }, 300);
  }.bind(this);

  applyFilters = function() {
    this.loadData(1, this.state.meta.per_page);
  }.bind(this);

  getExportUrl = function() {
    var filters = this.state.filters;
    var hasFilters = Object.keys(filters).some(function(k) { return filters[k]; });
    if (!hasFilters) return "/download_file/materials/todos.xls";
    var parts = [];
    Object.keys(filters).forEach(function(key) {
      if (filters[key]) parts.push(key + "=" + encodeURIComponent(filters[key]));
    });
    return "/download_file/materials/filtro.xls?" + parts.join("&");
  }.bind(this);

  // ─── Inline State Edit ───

  toggleStateEdit = function(id) {
    this.setState({ editingStateId: this.state.editingStateId === id ? null : id });
  }.bind(this);

  handleStateChange = function(materialId, newState) {
    var self = this;
    fetch("/update_state_materials/" + materialId + "/" + encodeURIComponent(newState), {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken() }
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.type === "success") {
          self.setState({ editingStateId: null });
          self.loadData();
          Swal.fire({ position: "center", type: "success", title: data.message, showConfirmButton: false, timer: 1500 });
        }
      });
  }.bind(this);

  // ─── Modal ───

  openNewModal = function() {
    this.setState({
      modalOpen: true,
      modalMode: "new",
      editId: null,
      form: Object.assign({}, EMPTY_FORM),
      errors: [],
      saving: false,
      selectedProvider: null,
      selectedCostCenter: null
    });
  }.bind(this);

  openEditModal = function(row) {
    var providerOption = null;
    var costCenterOption = null;

    if (row.provider_id) {
      for (var i = 0; i < this.providerOptions.length; i++) {
        if (this.providerOptions[i].value === row.provider_id) {
          providerOption = this.providerOptions[i];
          break;
        }
      }
    }

    if (row.cost_center_id) {
      for (var j = 0; j < this.costCenterOptions.length; j++) {
        if (this.costCenterOptions[j].value === row.cost_center_id) {
          costCenterOption = this.costCenterOptions[j];
          break;
        }
      }
    }

    this.setState({
      modalOpen: true,
      modalMode: "edit",
      editId: row.id,
      form: {
        provider_id: row.provider_id || "",
        sales_date: row.sales_date || "",
        sales_number: row.sales_number || "",
        amount: row.amount || "",
        delivery_date: row.delivery_date || "",
        sales_state: row.sales_state || "",
        description: row.description || "",
        cost_center_id: row.cost_center_id || ""
      },
      errors: [],
      saving: false,
      selectedProvider: providerOption,
      selectedCostCenter: costCenterOption
    });
  }.bind(this);

  closeModal = function() {
    this.setState({ modalOpen: false });
  }.bind(this);

  handleFormChange = function(field, value) {
    var self = this;
    this.setState(function(prev) {
      var newForm = Object.assign({}, prev.form);
      newForm[field] = value;
      return { form: newForm };
    });
  }.bind(this);

  handleProviderChange = function(option) {
    this.setState({ selectedProvider: option });
    this.handleFormChange("provider_id", option ? option.value : "");
  }.bind(this);

  handleCostCenterChange = function(option) {
    this.setState({ selectedCostCenter: option });
    this.handleFormChange("cost_center_id", option ? option.value : "");
  }.bind(this);

  // ─── ShowInfo ───

  openShowInfo = function(row) {
    this.setState({ showInfoOpen: true, showInfoData: row });
  }.bind(this);

  closeShowInfo = function() {
    this.setState({ showInfoOpen: false, showInfoData: null });
  }.bind(this);

  // ─── Facturas ───

  openFacturas = function(row) {
    var self = this;
    self.setState({ facturasOpen: true, facturasMaterialId: row.id, facturasData: [], facturasFormOpen: false, facturasEditId: null, facturasForm: { number: "", value: "", observation: "" } });
    fetch("/get_material_invoice/" + row.id, { headers: { "X-CSRF-Token": csrfToken(), "Content-Type": "application/json" } })
      .then(function(r) { return r.json(); })
      .then(function(data) { self.setState({ facturasData: data }); });
  }.bind(this);

  closeFacturas = function() {
    this.setState({ facturasOpen: false, facturasData: [], facturasMaterialId: null, facturasFormOpen: false });
  }.bind(this);

  toggleFacturasForm = function() {
    this.setState({ facturasFormOpen: !this.state.facturasFormOpen, facturasEditId: null, facturasForm: { number: "", value: "", observation: "" } });
  }.bind(this);

  handleFacturasFormChange = function(e) {
    var f = Object.assign({}, this.state.facturasForm);
    f[e.target.name] = e.target.value;
    this.setState({ facturasForm: f });
  }.bind(this);

  submitFactura = function() {
    var self = this;
    var isEdit = !!self.state.facturasEditId;
    var url = isEdit ? "/material_invoices/" + self.state.facturasEditId : "/material_invoices";
    var method = isEdit ? "PATCH" : "POST";
    var body = Object.assign({}, self.state.facturasForm, { material_id: self.state.facturasMaterialId });
    fetch(url, { method: method, headers: { "X-CSRF-Token": csrfToken(), "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.register) {
          if (isEdit) {
            self.setState({ facturasData: self.state.facturasData.map(function(inv) { return inv.id === data.register.id ? data.register : inv; }) });
          } else {
            self.setState({ facturasData: self.state.facturasData.concat([data.register]) });
          }
          self.setState({ facturasFormOpen: false, facturasEditId: null, facturasForm: { number: "", value: "", observation: "" } });
          self.loadData();
        }
      });
  }.bind(this);

  editFactura = function(inv) {
    this.setState({ facturasFormOpen: true, facturasEditId: inv.id, facturasForm: { number: inv.number || "", value: inv.value || "", observation: inv.observation || "" } });
  }.bind(this);

  deleteFactura = function(id) {
    var self = this;
    Swal.fire({ title: "¿Estás seguro?", text: "El registro será eliminado permanentemente", type: "warning", showCancelButton: true, confirmButtonColor: "#2a3f53", cancelButtonColor: "#dc3545", confirmButtonText: "Eliminar", cancelButtonText: "Cancelar" })
      .then(function(result) {
        if (result.value) {
          fetch("/material_invoices/" + id, { method: "delete", headers: { "X-CSRF-Token": csrfToken() } })
            .then(function(r) { return r.json(); })
            .then(function() {
              self.setState({ facturasData: self.state.facturasData.filter(function(inv) { return inv.id !== id; }) });
              self.loadData();
            });
        }
      });
  }.bind(this);

  renderFacturasModal = function() {
    var self = this;
    var state = this.state;
    if (!state.facturasOpen) return null;

    return React.createElement(CmModal, {
      isOpen: true,
      toggle: self.closeFacturas,
      title: React.createElement("span", null, React.createElement("i", { className: "fas fa-file-invoice" }), " Facturas"),
      size: "lg",
      footer: React.createElement(CmButton, { variant: "outline", onClick: self.closeFacturas }, "Cerrar")
    },
      state.facturasFormOpen ? React.createElement("div", { className: "cm-form-row", style: { marginBottom: "12px" } },
        React.createElement(CmInput, { label: "Numero de factura", name: "number", value: state.facturasForm.number, onChange: self.handleFacturasFormChange }),
        React.createElement("div", { className: "cm-input-group" },
          React.createElement("label", { className: "cm-input-label" }, "Valor"),
          React.createElement(NumberFormat, { name: "value", thousandSeparator: true, prefix: "$", className: "cm-input", value: state.facturasForm.value, onChange: self.handleFacturasFormChange, placeholder: "Valor" })
        ),
        React.createElement(CmInput, { label: "Descripcion", name: "observation", value: state.facturasForm.observation, onChange: self.handleFacturasFormChange })
      ) : null,

      React.createElement("div", { style: { textAlign: "right", marginBottom: "12px" } },
        state.facturasFormOpen ? React.createElement(React.Fragment, null,
          React.createElement(CmButton, { variant: "outline", onClick: self.toggleFacturasForm, style: { marginRight: "8px" } }, "Cerrar"),
          React.createElement(CmButton, { variant: "accent", onClick: self.submitFactura }, state.facturasEditId ? "Actualizar" : "Crear factura")
        ) : React.createElement(CmButton, { variant: "accent", onClick: self.toggleFacturasForm }, "Crear factura")
      ),

      React.createElement("table", { className: "cm-table", style: { width: "100%", borderCollapse: "collapse" } },
        React.createElement("thead", null,
          React.createElement("tr", { style: { background: "#2a3f53", color: "#fff" } },
            React.createElement("th", { style: { padding: "8px" } }, "Acciones"),
            React.createElement("th", { style: { padding: "8px" } }, "Numero de factura"),
            React.createElement("th", { style: { padding: "8px" } }, "Valor"),
            React.createElement("th", { style: { padding: "8px" } }, "Descripcion")
          )
        ),
        React.createElement("tbody", null,
          state.facturasData.length > 0 ? state.facturasData.map(function(inv) {
            return React.createElement("tr", { key: inv.id, style: { borderBottom: "1px solid #e0e0e0" } },
              React.createElement("td", { style: { padding: "8px" } },
                React.createElement("button", { className: "cm-btn cm-btn-outline cm-btn-sm", onClick: function() { self.editFactura(inv); }, style: { marginRight: "4px" } },
                  React.createElement("i", { className: "fas fa-pen" })
                ),
                React.createElement("button", { className: "cm-btn cm-btn-outline cm-btn-sm", onClick: function() { self.deleteFactura(inv.id); }, style: { color: "#dc3545" } },
                  React.createElement("i", { className: "fas fa-trash" })
                )
              ),
              React.createElement("td", { style: { padding: "8px" } }, inv.number),
              React.createElement("td", { style: { padding: "8px" } }, React.createElement(NumberFormat, { value: inv.value, displayType: "text", thousandSeparator: true, prefix: "$" })),
              React.createElement("td", { style: { padding: "8px" } }, inv.observation)
            );
          }) : React.createElement("tr", null,
            React.createElement("td", { colSpan: "4", style: { padding: "20px", textAlign: "center" } }, "Facturas")
          )
        )
      )
    );
  }.bind(this);

  // ─── Submit ───

  handleSubmit = function() {
    var self = this;
    var form = this.state.form;
    var modalMode = this.state.modalMode;
    var editId = this.state.editId;

    var isNew = modalMode === "new";
    var url = isNew ? "/materials" : "/materials/" + editId;
    var method = isNew ? "POST" : "PATCH";

    var body = Object.assign({}, form);

    this.setState({ saving: true, errors: [] });

    fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken()
      },
      body: JSON.stringify(body)
    })
      .then(function(r) {
        return r.json().then(function(data) { return { ok: r.ok, data: data }; });
      })
      .then(function(result) {
        if (result.data.type === "success") {
          self.closeModal();
          self.loadData(isNew ? 1 : undefined);
          Swal.fire({
            position: "center",
            type: "success",
            title: result.data.message,
            showConfirmButton: false,
            timer: 1500
          });
        } else {
          self.setState({
            errors: result.data.message_error || [result.data.message || "Error al guardar"],
            saving: false
          });
        }
      })
      .catch(function() {
        self.setState({ errors: ["Error de conexión"], saving: false });
      });
  }.bind(this);

  // ─── Delete ───

  handleDelete = function(id) {
    var self = this;
    Swal.fire({
      title: "¿Estás seguro?",
      text: "El registro será eliminado permanentemente",
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#2a3f53",
      cancelButtonColor: "#dc3545",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar"
    }).then(function(result) {
      if (result.value) {
        fetch("/materials/" + id, {
          method: "delete",
          headers: { "X-CSRF-Token": csrfToken() }
        })
          .then(function(response) { return response.json(); })
          .then(function() {
            self.loadData();
            Swal.fire("Eliminado", "El registro fue eliminado con éxito", "success");
          });
      }
    });
  }.bind(this);

  // ─── Renders ───

  openMenu = function(e) {
    e.stopPropagation();
    var btn = e.currentTarget;
    var menu = btn.nextElementSibling;
    var all = document.querySelectorAll(".cm-dt-menu-dropdown.open");
    all.forEach(function(m) { m.classList.remove("open"); });
    var rect = btn.getBoundingClientRect();
    document.body.appendChild(menu);
    menu.style.top = (rect.bottom + 4) + "px";
    menu.style.left = (rect.right - 160) + "px";
    menu.classList.add("open");
    var close = function(ev) {
      if (!menu.contains(ev.target) && !btn.contains(ev.target)) {
        menu.classList.remove("open");
        btn.parentNode.appendChild(menu);
        document.removeEventListener("click", close);
      }
    };
    document.addEventListener("click", close);
  };

  renderActions = function(row) {
    var estados = this.props.estados;
    var self = this;
    return (
      React.createElement("div", { className: "cm-dt-menu" },
        React.createElement("button", { className: "cm-dt-menu-trigger", onClick: self.openMenu },
          React.createElement("i", { className: "fas fa-ellipsis-v" })
        ),
        React.createElement("div", { className: "cm-dt-menu-dropdown" },
          React.createElement("button", {
            onClick: function() { self.openShowInfo(row); },
            className: "cm-dt-menu-item"
          }, React.createElement("i", { className: "fas fa-eye" }), " Ver informacion"),
          React.createElement("button", {
            onClick: function() { self.openFacturas(row); },
            className: "cm-dt-menu-item"
          }, React.createElement("i", { className: "fas fa-file-invoice" }), " Facturas"),
          estados.edit ? React.createElement("button", {
            onClick: function() { self.openEditModal(row); },
            className: "cm-dt-menu-item"
          }, React.createElement("i", { className: "fas fa-pen" }), " Editar") : null,
          estados.delete ? React.createElement("button", {
            onClick: function() { self.handleDelete(row.id); },
            className: "cm-dt-menu-item cm-dt-menu-item--danger"
          }, React.createElement("i", { className: "fas fa-trash" }), " Eliminar") : null
        )
      )
    );
  }.bind(this);

  renderHeaderActions = function() {
    var estados = this.props.estados;
    var self = this;
    return (
      React.createElement(React.Fragment, null,
        React.createElement("button", {
          onClick: self.toggleFilters,
          className: "cm-btn cm-btn-outline cm-btn-sm"
        }, React.createElement("i", { className: "fas fa-filter" }), self.state.showFilters ? " Cerrar filtros" : " Filtros"),
        estados.download_file ? React.createElement("a", {
          href: self.getExportUrl(),
          target: "_blank",
          className: "cm-btn cm-btn-outline cm-btn-sm"
        }, React.createElement("i", { className: "fas fa-file-excel" }), " Exportar") : null
      )
    );
  }.bind(this);

  renderModal = function() {
    var self = this;
    var state = this.state;
    var form = state.form;
    var errors = state.errors;
    var saving = state.saving;
    var modalMode = state.modalMode;
    var isNew = modalMode === "new";
    var title = isNew ? "Nuevo Material" : "Editar Material";
    var icon = isNew ? "fas fa-plus" : "fas fa-pen";
    var usuario = this.props.usuario;
    var hasCostCenter = usuario && usuario.cost_center_id;

    return React.createElement(CmModal, {
      isOpen: state.modalOpen,
      toggle: self.closeModal,
      title: React.createElement("span", null,
        React.createElement("i", { className: icon }),
        " ",
        title
      ),
      size: "lg",
      footer: React.createElement(React.Fragment, null,
        React.createElement(CmButton, { variant: "outline", onClick: self.closeModal }, "Cancelar"),
        React.createElement(CmButton, { variant: "accent", onClick: self.handleSubmit, disabled: saving },
          saving
            ? React.createElement(React.Fragment, null, React.createElement("i", { className: "fas fa-spinner fa-spin" }), " Guardando...")
            : React.createElement(React.Fragment, null, React.createElement("i", { className: "fas fa-save" }), " Guardar")
        )
      )
    },
      errors.length > 0 ? React.createElement("div", { className: "cm-form-errors" },
        React.createElement("ul", null,
          errors.map(function(e, i) {
            return React.createElement("li", { key: i }, e);
          })
        )
      ) : null,

      React.createElement("div", { className: "cm-form-row" },
        React.createElement("div", { className: "cm-input-group", style: { minWidth: "250px" } },
          React.createElement("label", { className: "cm-input-label" }, "Proveedor"),
          React.createElement(Select, {
            options: self.providerOptions,
            value: state.selectedProvider,
            onChange: self.handleProviderChange,
            placeholder: "Seleccione proveedor",
            className: "link-form"
          })
        ),

        !hasCostCenter ? React.createElement("div", { className: "cm-input-group", style: { minWidth: "250px" } },
          React.createElement("label", { className: "cm-input-label" }, "Centro de Costo"),
          React.createElement(Select, {
            options: self.costCenterOptions,
            value: state.selectedCostCenter,
            onChange: self.handleCostCenterChange,
            placeholder: "Seleccione centro de costo",
            className: "link-form"
          })
        ) : null,

        React.createElement(CmInput, {
          label: "Fecha de Orden",
          type: "date",
          value: form.sales_date,
          onChange: function(e) { self.handleFormChange("sales_date", e.target.value); }
        }),

        React.createElement(CmInput, {
          label: "Número de Orden",
          placeholder: "Número de orden",
          value: form.sales_number,
          onChange: function(e) { self.handleFormChange("sales_number", e.target.value); }
        }),

        React.createElement("div", { className: "cm-input-group" },
          React.createElement("label", { className: "cm-input-label" }, "Valor"),
          React.createElement(NumberFormat, {
            name: "amount",
            thousandSeparator: true,
            prefix: "$",
            className: "cm-input",
            value: form.amount,
            onChange: function(e) { self.handleFormChange("amount", e.target.value); },
            placeholder: "Valor"
          })
        ),

        React.createElement(CmInput, {
          label: "Fecha Entrega",
          type: "date",
          value: form.delivery_date,
          onChange: function(e) { self.handleFormChange("delivery_date", e.target.value); }
        }),

        React.createElement("div", { className: "cm-input-group" },
          React.createElement("label", { className: "cm-input-label" }, "Estado"),
          React.createElement("select", {
            className: "cm-input",
            value: form.sales_state,
            onChange: function(e) { self.handleFormChange("sales_state", e.target.value); }
          },
            React.createElement("option", { value: "" }, "Seleccione estado"),
            React.createElement("option", { value: "Pendiente" }, "Pendiente"),
            React.createElement("option", { value: "Parcial" }, "Parcial"),
            React.createElement("option", { value: "Entregado" }, "Entregado"),
            React.createElement("option", { value: "Cancelado" }, "Cancelado")
          )
        )
      ),

      React.createElement("div", { className: "cm-form-row", style: { marginTop: "12px" } },
        React.createElement("div", { className: "cm-input-group", style: { width: "100%" } },
          React.createElement("label", { className: "cm-input-label" }, "Descripción"),
          React.createElement("textarea", {
            className: "cm-input",
            rows: "4",
            value: form.description,
            onChange: function(e) { self.handleFormChange("description", e.target.value); },
            placeholder: "Descripción del material"
          })
        )
      )
    );
  }.bind(this);

  renderShowInfo = function() {
    var self = this;
    var row = this.state.showInfoData;
    if (!row) return null;

    return React.createElement(CmModal, {
      isOpen: this.state.showInfoOpen,
      toggle: self.closeShowInfo,
      title: React.createElement("span", null,
        React.createElement("i", { className: "fas fa-info-circle" }),
        " Detalle Material"
      ),
      size: "lg",
      footer: React.createElement(CmButton, { variant: "outline", onClick: self.closeShowInfo }, "Cerrar")
    },
      React.createElement("div", { className: "cm-form-row" },
        React.createElement("div", { className: "cm-input-group" },
          React.createElement("label", { className: "cm-input-label" }, "Proveedor"),
          React.createElement("p", null, row.provider ? row.provider.name : "")
        ),
        React.createElement("div", { className: "cm-input-group" },
          React.createElement("label", { className: "cm-input-label" }, "Centro de Costo"),
          React.createElement("p", null, row.cost_center ? row.cost_center.code : "")
        ),
        React.createElement("div", { className: "cm-input-group" },
          React.createElement("label", { className: "cm-input-label" }, "# Orden"),
          React.createElement("p", null, row.sales_number)
        ),
        React.createElement("div", { className: "cm-input-group" },
          React.createElement("label", { className: "cm-input-label" }, "Valor"),
          React.createElement("p", null, formatCurrency(row.amount))
        ),
        React.createElement("div", { className: "cm-input-group" },
          React.createElement("label", { className: "cm-input-label" }, "Fecha Orden"),
          React.createElement("p", null, row.sales_date)
        ),
        React.createElement("div", { className: "cm-input-group" },
          React.createElement("label", { className: "cm-input-label" }, "Fecha Entrega"),
          React.createElement("p", null, row.delivery_date)
        ),
        React.createElement("div", { className: "cm-input-group" },
          React.createElement("label", { className: "cm-input-label" }, "Valor Facturas"),
          React.createElement("p", null, formatCurrency(row.provider_invoice_value))
        ),
        React.createElement("div", { className: "cm-input-group" },
          React.createElement("label", { className: "cm-input-label" }, "Estado"),
          React.createElement("p", null, row.sales_state)
        ),
        React.createElement("div", { className: "cm-input-group", style: { width: "100%" } },
          React.createElement("label", { className: "cm-input-label" }, "Descripción"),
          React.createElement("p", null, row.description)
        )
      )
    );
  }.bind(this);

  render() {
    var self = this;
    var meta = this.state.meta;
    var estados = this.props.estados;

    return (
      React.createElement(React.Fragment, null,
        estados.create ? React.createElement(CmPageActions, null,
          React.createElement("button", {
            onClick: self.openNewModal,
            className: "cm-btn cm-btn-accent cm-btn-sm"
          }, React.createElement("i", { className: "fas fa-plus" }), " Nuevo Material")
        ) : null,

        self.state.showFilters ? React.createElement("div", { className: "cm-filter-panel" },
          React.createElement("div", { className: "cm-filter-row" },
            React.createElement("div", { className: "cm-form-group" },
              React.createElement("label", { className: "cm-label" }, "Proveedor"),
              React.createElement(Select, {
                options: self.providerOptions,
                value: self.state.filters.provider_id ? self.providerOptions.find(function(o) { return o.value == self.state.filters.provider_id; }) || null : null,
                onChange: function(opt) {
                  var f = Object.assign({}, self.state.filters, { provider_id: opt ? opt.value : "" });
                  self.setState({ filters: f });
                },
                isClearable: true,
                placeholder: "Seleccione",
                menuPortalTarget: document.body,
                styles: { menuPortal: function(base) { return Object.assign({}, base, { zIndex: 9999 }); } }
              })
            ),
            React.createElement("div", { className: "cm-form-group" },
              React.createElement("label", { className: "cm-label" }, "Descripcion"),
              React.createElement("input", { className: "cm-input", name: "description", value: self.state.filters.description, onChange: self.handleFilterChange })
            ),
            React.createElement("div", { className: "cm-form-group" },
              React.createElement("label", { className: "cm-label" }, "Fecha de Orden"),
              React.createElement("input", { className: "cm-input", type: "date", name: "sales_date", value: self.state.filters.sales_date, onChange: self.handleFilterChange })
            ),
            React.createElement("div", { className: "cm-form-group" },
              React.createElement("label", { className: "cm-label" }, "Centro de costo"),
              React.createElement(Select, {
                options: self.state.filterCostCenterOptions,
                value: self.state.filterCentro,
                onChange: self.handleFilterCentro,
                onInputChange: self.handleFilterCostCenterSearch,
                isClearable: true,
                isLoading: self.state.filterCostCenterLoading,
                placeholder: "Escriba 3+ letras...",
                noOptionsMessage: function() { return "Escriba para buscar"; },
                menuPortalTarget: document.body,
                styles: { menuPortal: function(base) { return Object.assign({}, base, { zIndex: 9999 }); } }
              })
            )
          ),
          React.createElement("div", { className: "cm-filter-row" },
            React.createElement("div", { className: "cm-form-group" },
              React.createElement("label", { className: "cm-label" }, "Estado de compra"),
              React.createElement("select", { className: "cm-input", name: "estado", value: self.state.filters.estado, onChange: self.handleFilterChange },
                React.createElement("option", { value: "" }, "Todos"),
                React.createElement("option", { value: "Pendiente" }, "Pendiente"),
                React.createElement("option", { value: "Parcial" }, "Parcial"),
                React.createElement("option", { value: "Entregado" }, "Entregado"),
                React.createElement("option", { value: "Cancelado" }, "Cancelado")
              )
            ),
            React.createElement("div", { className: "cm-form-group" },
              React.createElement("label", { className: "cm-label" }, "Fecha desde"),
              React.createElement("input", { className: "cm-input", type: "date", name: "date_desde", value: self.state.filters.date_desde, onChange: self.handleFilterChange })
            ),
            React.createElement("div", { className: "cm-form-group" },
              React.createElement("label", { className: "cm-label" }, "Fecha hasta"),
              React.createElement("input", { className: "cm-input", type: "date", name: "date_hasta", value: self.state.filters.date_hasta, onChange: self.handleFilterChange })
            ),
            React.createElement("div", { className: "cm-form-group" },
              React.createElement("label", { className: "cm-label" }, "# Orden"),
              React.createElement("input", { className: "cm-input", name: "sales_number", value: self.state.filters.sales_number, onChange: self.handleFilterChange })
            )
          ),
          React.createElement("div", { className: "cm-filter-row" },
            React.createElement("div", null),
            React.createElement("div", null),
            React.createElement("div", null),
            React.createElement("div", { style: { display: "flex", gap: "8px", alignItems: "flex-end" } },
              React.createElement("button", { className: "cm-btn cm-btn-accent cm-btn-sm", onClick: self.applyFilters },
                React.createElement("i", { className: "fas fa-search" }), " Aplicar"
              ),
              React.createElement("button", { className: "cm-btn cm-btn-outline cm-btn-sm", onClick: self.toggleFilters },
                React.createElement("i", { className: "fas fa-times" }), " Cerrar filtros"
              )
            )
          )
        ) : null,

        React.createElement(CmDataTable, {
          columns: self.columns,
          data: self.state.data,
          loading: self.state.loading,
          actions: self.renderActions,
          headerActions: self.renderHeaderActions(),
          onSearch: self.handleSearch,
          searchPlaceholder: "Buscar material...",
          emptyMessage: "No hay materiales registrados",
          emptyAction: estados.create
            ? React.createElement("button", {
                onClick: self.openNewModal,
                className: "cm-btn cm-btn-accent cm-btn-sm",
                style: { marginTop: "8px" }
              }, React.createElement("i", { className: "fas fa-plus" }), " Nuevo Material")
            : null,
          serverPagination: true,
          serverMeta: meta,
          onSort: self.handleSort,
          onPageChange: self.handlePageChange,
          onPerPageChange: self.handlePerPageChange
        }),

        self.renderModal(),
        self.renderShowInfo(),
        self.renderFacturasModal()
      )
    );
  }
}

export default index;
