import React from "react";
import Swal from "sweetalert2";
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
      meta: { total: 0, page: 1, per_page: 50, total_pages: 1 },
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
      formCostCenterOptions: [],
      formCostCenterLoading: false,
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

    this.costCenterOptions = [];

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
          Swal.fire({ position: "center", icon: "success", title: data.message, showConfirmButton: false, timer: 1500 });
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
      selectedCostCenter: null,
      formCostCenterOptions: [],
      formCostCenterLoading: false
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

    // Get cost center from row data
    if (row.cost_center_id && row.cost_center) {
      costCenterOption = { value: row.cost_center_id, label: row.cost_center.code };
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
      selectedCostCenter: costCenterOption,
      formCostCenterOptions: costCenterOption ? [costCenterOption] : [],
      formCostCenterLoading: false
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

  handleFormCostCenterSearch = function(inputValue) {
    var self = this;
    if (!inputValue || inputValue.length < 3) {
      self.setState({ formCostCenterOptions: [] });
      return;
    }
    if (self._formCcTimer) clearTimeout(self._formCcTimer);
    self._formCcTimer = setTimeout(function() {
      self.setState({ formCostCenterLoading: true });
      fetch("/search_cost_centers?q=" + encodeURIComponent(inputValue), {
        headers: { "X-CSRF-Token": csrfToken() }
      })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          self.setState({
            formCostCenterOptions: data.map(function(d) { return { value: d.id, label: d.label }; }),
            formCostCenterLoading: false,
          });
        });
    }, 300);
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
    Swal.fire({ title: "¿Estás seguro?", text: "El registro será eliminado permanentemente", icon: "warning", showCancelButton: true, confirmButtonColor: "#2a3f53", cancelButtonColor: "#dc3545", confirmButtonText: "Eliminar", cancelButtonText: "Cancelar" })
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

    var isEdit = !!state.facturasEditId;

    var tableStyles = {
      tableWrap: { overflowX: "auto", borderRadius: 10, border: "1px solid #e2e5ea" },
      table: { width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "'Poppins', sans-serif" },
      th: { padding: "10px 14px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "#5a6a7e", background: "#f4f5f8", borderBottom: "2px solid #e2e5ea", whiteSpace: "nowrap", textAlign: "left" },
      thCenter: { padding: "10px 14px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "#5a6a7e", background: "#f4f5f8", borderBottom: "2px solid #e2e5ea", whiteSpace: "nowrap", textAlign: "center" },
      td: { padding: "10px 14px", borderBottom: "1px solid #f0f1f3", color: "#333", verticalAlign: "middle" },
      tdCenter: { padding: "10px 14px", borderBottom: "1px solid #f0f1f3", color: "#333", verticalAlign: "middle", textAlign: "center" },
      actionBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, border: "none", borderRadius: 6, background: "#eef0f4", color: "#5a6a7e", fontSize: 12, cursor: "pointer", marginRight: 4 },
      actionBtnDanger: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, border: "none", borderRadius: 6, background: "rgba(220,53,69,0.08)", color: "#dc3545", fontSize: 12, cursor: "pointer" }
    };

    var inputStyle = { width: "100%", padding: "10px 14px", border: "1px solid #e2e5ea", borderRadius: "8px", fontSize: "14px", background: "#fcfcfd", outline: "none", boxSizing: "border-box" };
    var labelStyle = { display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", fontSize: "14px", fontWeight: 500, color: "#374151" };
    var labelIconStyle = { color: "#6b7280", fontSize: "12px" };

    // Form component
    var renderForm = function() {
      return React.createElement("div", { style: { background: "#fff", border: "1px solid #e2e5ea", borderRadius: "12px", marginBottom: "20px", overflow: "hidden" }},
        // Form Header
        React.createElement("div", { style: { background: "#fcfcfd", padding: "16px 20px", borderBottom: "1px solid #e9ecef", display: "flex", alignItems: "center", justifyContent: "space-between" }},
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "12px" }},
            React.createElement("div", { style: { width: "36px", height: "36px", background: "linear-gradient(135deg, #f5a623 0%, #f7b731 100%)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(245, 166, 35, 0.3)" }},
              React.createElement("i", { className: isEdit ? "fas fa-pen" : "fas fa-plus", style: { color: "#fff", fontSize: "14px" }})
            ),
            React.createElement("div", null,
              React.createElement("h3", { style: { margin: 0, fontSize: "15px", fontWeight: 600, color: "#333" }}, isEdit ? "Editar Factura" : "Nueva Factura"),
              React.createElement("p", { style: { margin: 0, fontSize: "11px", color: "#6c757d" }}, isEdit ? "Modifique los datos de la factura" : "Complete los datos de la nueva factura")
            )
          ),
          React.createElement("button", { type: "button", onClick: self.toggleFacturasForm, style: { width: "28px", height: "28px", border: "none", background: "#e9ecef", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6c757d" }},
            React.createElement("i", { className: "fas fa-times", style: { fontSize: "12px" }})
          )
        ),
        // Form Content
        React.createElement("div", { style: { padding: "20px" }},
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }},
            React.createElement("div", null,
              React.createElement("label", { style: labelStyle },
                React.createElement("i", { className: "fa fa-hashtag", style: labelIconStyle }),
                "Numero de factura"
              ),
              React.createElement("input", { type: "text", name: "number", value: state.facturasForm.number, onChange: self.handleFacturasFormChange, placeholder: "Ej: FAC-001", style: inputStyle })
            ),
            React.createElement("div", null,
              React.createElement("label", { style: labelStyle },
                React.createElement("i", { className: "fa fa-dollar-sign", style: labelIconStyle }),
                "Valor"
              ),
              React.createElement(NumberFormat, { name: "value", thousandSeparator: true, prefix: "$", value: state.facturasForm.value, onChange: self.handleFacturasFormChange, placeholder: "$0", style: inputStyle })
            ),
            React.createElement("div", null,
              React.createElement("label", { style: labelStyle },
                React.createElement("i", { className: "fa fa-align-left", style: labelIconStyle }),
                "Descripción"
              ),
              React.createElement("input", { type: "text", name: "observation", value: state.facturasForm.observation, onChange: self.handleFacturasFormChange, placeholder: "Descripción", style: inputStyle })
            )
          )
        ),
        // Form Footer
        React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: "12px", padding: "16px 20px", background: "#fcfcfd", borderTop: "1px solid #e9ecef" }},
          React.createElement("button", { type: "button", onClick: self.toggleFacturasForm, style: { display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 16px", fontSize: "13px", fontWeight: 500, borderRadius: "8px", cursor: "pointer", border: "1px solid #dee2e6", background: "#fff", color: "#6c757d" }},
            React.createElement("i", { className: "fas fa-times" }), " Cancelar"
          ),
          React.createElement("button", { type: "button", onClick: self.submitFactura, style: { display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 16px", fontSize: "13px", fontWeight: 500, borderRadius: "8px", cursor: "pointer", border: "none", background: "linear-gradient(135deg, #f5a623 0%, #f7b731 100%)", color: "#fff" }},
            React.createElement("i", { className: "fas fa-save" }), isEdit ? " Actualizar" : " Crear"
          )
        )
      );
    };

    // Open menu handler
    var openMenu = function(e) {
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

    // Table component
    var renderTable = function() {
      if (state.facturasData.length === 0) {
        return React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px", textAlign: "center" }},
          React.createElement("i", { className: "fas fa-file-invoice", style: { fontSize: 36, color: "#d0d4db", marginBottom: 10 }}),
          React.createElement("p", { style: { color: "#999", margin: 0, fontSize: 14 }}, "No hay facturas registradas")
        );
      }
      return React.createElement("div", { style: tableStyles.tableWrap },
        React.createElement("table", { style: tableStyles.table },
          React.createElement("thead", null,
            React.createElement("tr", null,
              React.createElement("th", { style: Object.assign({}, tableStyles.thCenter, { width: 80 }) }),
              React.createElement("th", { style: tableStyles.th }, "Numero de factura"),
              React.createElement("th", { style: tableStyles.th }, "Valor"),
              React.createElement("th", { style: tableStyles.th }, "Descripcion")
            )
          ),
          React.createElement("tbody", null,
            state.facturasData.map(function(inv) {
              return React.createElement("tr", { key: inv.id },
                React.createElement("td", { style: tableStyles.tdCenter },
                  React.createElement("div", { className: "cm-dt-menu" },
                    React.createElement("button", { className: "cm-dt-menu-trigger", onClick: openMenu },
                      React.createElement("i", { className: "fas fa-ellipsis-v" })
                    ),
                    React.createElement("div", { className: "cm-dt-menu-dropdown" },
                      React.createElement("button", { onClick: function() { self.editFactura(inv); }, className: "cm-dt-menu-item" },
                        React.createElement("i", { className: "fas fa-pen" }), " Editar"
                      ),
                      React.createElement("button", { onClick: function() { self.deleteFactura(inv.id); }, className: "cm-dt-menu-item cm-dt-menu-item--danger" },
                        React.createElement("i", { className: "fas fa-trash" }), " Eliminar"
                      )
                    )
                  )
                ),
                React.createElement("td", { style: tableStyles.td }, inv.number),
                React.createElement("td", { style: tableStyles.td }, React.createElement(NumberFormat, { value: inv.value, displayType: "text", thousandSeparator: true, prefix: "$" })),
                React.createElement("td", { style: tableStyles.td }, inv.observation)
              );
            })
          )
        )
      );
    };

    return React.createElement(CmModal, {
      isOpen: true,
      toggle: self.closeFacturas,
      size: "lg",
      footer: null,
      hideHeader: true
    },
      React.createElement("div", { style: { margin: "-20px -24px -24px -24px", display: "flex", flexDirection: "column", maxHeight: "85vh" }},
        // Header
        React.createElement("div", { style: { background: "#fcfcfd", padding: "20px 32px", borderBottom: "1px solid #e9ecef", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }},
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "16px" }},
            React.createElement("div", { style: { width: "48px", height: "48px", background: "linear-gradient(135deg, #f5a623 0%, #f7b731 100%)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(245, 166, 35, 0.3)" }},
              React.createElement("i", { className: "fas fa-file-invoice-dollar", style: { color: "#fff", fontSize: "20px" }})
            ),
            React.createElement("div", null,
              React.createElement("h2", { style: { margin: "0 0 2px 0", fontSize: "18px", fontWeight: 600, color: "#333" }}, "Facturas"),
              React.createElement("p", { style: { margin: 0, fontSize: "12px", color: "#6c757d" }}, "Gestión de facturas del material")
            )
          ),
          React.createElement("button", { type: "button", onClick: self.closeFacturas, style: { width: "32px", height: "32px", border: "none", background: "#e9ecef", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6c757d", transition: "all 0.2s" }},
            React.createElement("i", { className: "fas fa-times" })
          )
        ),
        // Content
        React.createElement("div", { style: { padding: "24px 32px", flex: 1, overflowY: "auto" }},
          state.facturasFormOpen ? renderForm() : null,
          renderTable()
        ),
        // Footer
        React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: "12px", padding: "16px 32px", background: "#fcfcfd", borderTop: "1px solid #e9ecef", flexShrink: 0 }},
          !state.facturasFormOpen ? React.createElement("button", { type: "button", onClick: self.toggleFacturasForm, style: { display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: 500, borderRadius: "8px", cursor: "pointer", border: "none", background: "linear-gradient(135deg, #f5a623 0%, #f7b731 100%)", color: "#fff" }},
            React.createElement("i", { className: "fas fa-plus" }), " Nueva Factura"
          ) : null,
          React.createElement("button", { type: "button", onClick: self.closeFacturas, style: { display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: 500, borderRadius: "8px", cursor: "pointer", border: "1px solid #dee2e6", background: "#fff", color: "#6c757d" }}, "Cerrar")
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
            icon: "success",
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
      icon: "warning",
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
            Swal.fire({ title: "Eliminado", text: "El registro fue eliminado con éxito", icon: "success", confirmButtonColor: "#2a3f53" });
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
    var usuario = this.props.usuario;
    var hasCostCenter = usuario && usuario.cost_center_id;

    var selectStyles = {
      control: function(base, s) {
        return Object.assign({}, base, {
          background: "#fcfcfd",
          borderColor: s.isFocused ? "#f5a623" : "#e2e5ea",
          boxShadow: s.isFocused ? "0 0 0 3px rgba(245, 166, 35, 0.15)" : "none",
          borderRadius: "8px",
          padding: "2px 4px",
          fontSize: "14px"
        });
      },
      option: function(base, s) {
        return Object.assign({}, base, {
          backgroundColor: s.isSelected ? "#f5a623" : s.isFocused ? "#fff3e0" : "#fff",
          color: s.isSelected ? "#fff" : "#333",
          fontSize: "14px"
        });
      },
      menuPortal: function(base) { return Object.assign({}, base, { zIndex: 9999 }); }
    };

    return React.createElement(CmModal, {
      isOpen: state.modalOpen,
      toggle: self.closeModal,
      hideHeader: true,
      footer: null,
      size: "lg"
    },
      // Custom Header
      React.createElement("div", { style: {
        background: "#fcfcfd",
        padding: "20px 32px",
        borderBottom: "1px solid #e9ecef",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }},
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "16px" }},
          React.createElement("div", { style: {
            width: "48px",
            height: "48px",
            background: "linear-gradient(135deg, #f5a623 0%, #f7b731 100%)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
            color: "#fff",
            boxShadow: "0 4px 12px rgba(245, 166, 35, 0.3)"
          }},
            React.createElement("i", { className: "fas fa-boxes" })
          ),
          React.createElement("div", null,
            React.createElement("h2", { style: {
              fontFamily: "'Poppins', sans-serif",
              fontSize: "18px",
              fontWeight: "600",
              color: "#333",
              margin: "0 0 2px 0"
            }}, title),
            React.createElement("p", { style: {
              fontSize: "12px",
              color: "#6c757d",
              margin: "0"
            }}, "Complete los campos para gestionar el material")
          )
        ),
        React.createElement("button", {
          onClick: self.closeModal,
          style: {
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
          }
        },
          React.createElement("i", { className: "fas fa-times" })
        )
      ),

      // Body
      React.createElement("div", { style: { padding: "24px 32px" }},
        errors.length > 0 ? React.createElement("div", { style: {
          background: "#fff5f5",
          border: "1px solid #ffcdd2",
          borderRadius: "8px",
          padding: "12px 16px",
          marginBottom: "16px",
          color: "#c62828",
          fontSize: "14px"
        }},
          React.createElement("ul", { style: { margin: "0", paddingLeft: "20px" }},
            errors.map(function(e, i) {
              return React.createElement("li", { key: i, style: { margin: "4px 0" } }, e);
            })
          )
        ) : null,

        React.createElement("div", { style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px"
        }},
          // Proveedor
          React.createElement("div", { style: { display: "flex", flexDirection: "column" }},
            React.createElement("label", { style: {
              fontSize: "13px",
              fontWeight: "400",
              color: "#495057",
              marginBottom: "6px"
            }},
              React.createElement("i", { className: "fas fa-truck", style: { color: "#6c757d", marginRight: "6px", width: "14px" }}),
              "Proveedor"
            ),
            React.createElement(Select, {
              options: self.providerOptions,
              value: state.selectedProvider,
              onChange: self.handleProviderChange,
              placeholder: "Seleccione proveedor",
              styles: selectStyles,
              menuPortalTarget: document.body
            })
          ),

          // Centro de Costo
          !hasCostCenter ? React.createElement("div", { style: { display: "flex", flexDirection: "column" }},
            React.createElement("label", { style: {
              fontSize: "13px",
              fontWeight: "400",
              color: "#495057",
              marginBottom: "6px"
            }},
              React.createElement("i", { className: "fas fa-building", style: { color: "#6c757d", marginRight: "6px", width: "14px" }}),
              "Centro de Costo ",
              React.createElement("small", { style: { fontSize: "11px", color: "#9ca3af", marginLeft: "6px" }}, "(escribe al menos 3 letras)")
            ),
            React.createElement(Select, {
              options: state.formCostCenterOptions,
              value: state.selectedCostCenter,
              onChange: self.handleCostCenterChange,
              onInputChange: self.handleFormCostCenterSearch,
              isLoading: state.formCostCenterLoading,
              placeholder: "Buscar centro de costo...",
              noOptionsMessage: function() { return "Escribe al menos 3 letras"; },
              styles: selectStyles,
              menuPortalTarget: document.body
            })
          ) : null,

          // Fecha de Orden
          React.createElement("div", { style: { display: "flex", flexDirection: "column" }},
            React.createElement("label", { style: {
              fontSize: "13px",
              fontWeight: "400",
              color: "#495057",
              marginBottom: "6px"
            }},
              React.createElement("i", { className: "fas fa-calendar-alt", style: { color: "#6c757d", marginRight: "6px", width: "14px" }}),
              "Fecha de Orden"
            ),
            React.createElement("input", {
              type: "date",
              value: form.sales_date || "",
              onChange: function(e) { self.handleFormChange("sales_date", e.target.value); },
              style: {
                width: "100%",
                padding: "10px 14px",
                fontFamily: "'Poppins', sans-serif",
                fontSize: "14px",
                color: "#333",
                background: "#fcfcfd",
                border: "1px solid #e2e5ea",
                borderRadius: "8px",
                boxSizing: "border-box"
              }
            })
          ),

          // Número de Orden
          React.createElement("div", { style: { display: "flex", flexDirection: "column" }},
            React.createElement("label", { style: {
              fontSize: "13px",
              fontWeight: "400",
              color: "#495057",
              marginBottom: "6px"
            }},
              React.createElement("i", { className: "fas fa-hashtag", style: { color: "#6c757d", marginRight: "6px", width: "14px" }}),
              "Número de Orden"
            ),
            React.createElement("input", {
              type: "text",
              placeholder: "Número de orden",
              value: form.sales_number || "",
              onChange: function(e) { self.handleFormChange("sales_number", e.target.value); },
              style: {
                width: "100%",
                padding: "10px 14px",
                fontFamily: "'Poppins', sans-serif",
                fontSize: "14px",
                color: "#333",
                background: "#fcfcfd",
                border: "1px solid #e2e5ea",
                borderRadius: "8px",
                boxSizing: "border-box"
              }
            })
          ),

          // Valor
          React.createElement("div", { style: { display: "flex", flexDirection: "column" }},
            React.createElement("label", { style: {
              fontSize: "13px",
              fontWeight: "400",
              color: "#495057",
              marginBottom: "6px"
            }},
              React.createElement("i", { className: "fas fa-dollar-sign", style: { color: "#6c757d", marginRight: "6px", width: "14px" }}),
              "Valor"
            ),
            React.createElement(NumberFormat, {
              name: "amount",
              thousandSeparator: true,
              prefix: "$",
              value: form.amount || "",
              onChange: function(e) { self.handleFormChange("amount", e.target.value); },
              placeholder: "Valor",
              style: {
                width: "100%",
                padding: "10px 14px",
                fontFamily: "'Poppins', sans-serif",
                fontSize: "14px",
                color: "#333",
                background: "#fcfcfd",
                border: "1px solid #e2e5ea",
                borderRadius: "8px",
                boxSizing: "border-box"
              }
            })
          ),

          // Fecha Entrega
          React.createElement("div", { style: { display: "flex", flexDirection: "column" }},
            React.createElement("label", { style: {
              fontSize: "13px",
              fontWeight: "400",
              color: "#495057",
              marginBottom: "6px"
            }},
              React.createElement("i", { className: "fas fa-calendar-check", style: { color: "#6c757d", marginRight: "6px", width: "14px" }}),
              "Fecha Entrega"
            ),
            React.createElement("input", {
              type: "date",
              value: form.delivery_date || "",
              onChange: function(e) { self.handleFormChange("delivery_date", e.target.value); },
              style: {
                width: "100%",
                padding: "10px 14px",
                fontFamily: "'Poppins', sans-serif",
                fontSize: "14px",
                color: "#333",
                background: "#fcfcfd",
                border: "1px solid #e2e5ea",
                borderRadius: "8px",
                boxSizing: "border-box"
              }
            })
          ),

          // Estado
          React.createElement("div", { style: { display: "flex", flexDirection: "column" }},
            React.createElement("label", { style: {
              fontSize: "13px",
              fontWeight: "400",
              color: "#495057",
              marginBottom: "6px"
            }},
              React.createElement("i", { className: "fas fa-flag", style: { color: "#6c757d", marginRight: "6px", width: "14px" }}),
              "Estado"
            ),
            React.createElement("select", {
              value: form.sales_state || "",
              onChange: function(e) { self.handleFormChange("sales_state", e.target.value); },
              style: {
                width: "100%",
                padding: "10px 14px",
                fontFamily: "'Poppins', sans-serif",
                fontSize: "14px",
                color: "#333",
                background: "#fcfcfd",
                border: "1px solid #e2e5ea",
                borderRadius: "8px",
                boxSizing: "border-box",
                cursor: "pointer",
                appearance: "none",
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 12px center",
                paddingRight: "32px"
              }
            },
              React.createElement("option", { value: "" }, "Seleccione estado"),
              React.createElement("option", { value: "Pendiente" }, "Pendiente"),
              React.createElement("option", { value: "Parcial" }, "Parcial"),
              React.createElement("option", { value: "Entregado" }, "Entregado"),
              React.createElement("option", { value: "Cancelado" }, "Cancelado")
            )
          )
        ),

        // Descripción - full width
        React.createElement("div", { style: { display: "flex", flexDirection: "column", marginTop: "16px" }},
          React.createElement("label", { style: {
            fontSize: "13px",
            fontWeight: "400",
            color: "#495057",
            marginBottom: "6px"
          }},
            React.createElement("i", { className: "fas fa-align-left", style: { color: "#6c757d", marginRight: "6px", width: "14px" }}),
            "Descripción"
          ),
          React.createElement("textarea", {
            rows: "4",
            value: form.description || "",
            onChange: function(e) { self.handleFormChange("description", e.target.value); },
            placeholder: "Descripción del material",
            style: {
              width: "100%",
              padding: "10px 14px",
              fontFamily: "'Poppins', sans-serif",
              fontSize: "14px",
              color: "#333",
              background: "#fcfcfd",
              border: "1px solid #e2e5ea",
              borderRadius: "8px",
              boxSizing: "border-box",
              resize: "vertical",
              minHeight: "80px"
            }
          })
        )
      ),

      // Custom Footer
      React.createElement("div", { style: {
        display: "flex",
        justifyContent: "flex-end",
        gap: "12px",
        padding: "16px 32px",
        background: "#fcfcfd",
        borderTop: "1px solid #e9ecef"
      }},
        React.createElement("button", {
          onClick: self.closeModal,
          style: {
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 20px",
            fontFamily: "'Poppins', sans-serif",
            fontSize: "14px",
            fontWeight: "500",
            borderRadius: "8px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            background: "#fff",
            color: "#6c757d",
            border: "1px solid #dee2e6"
          }
        },
          React.createElement("i", { className: "fas fa-times" }),
          " Cancelar"
        ),
        React.createElement("button", {
          onClick: self.handleSubmit,
          disabled: saving,
          style: {
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 20px",
            fontFamily: "'Poppins', sans-serif",
            fontSize: "14px",
            fontWeight: "500",
            borderRadius: "8px",
            cursor: saving ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            background: "linear-gradient(135deg, #f5a623 0%, #f7b731 100%)",
            color: "#fff",
            border: "none",
            opacity: saving ? 0.6 : 1
          }
        },
          saving
            ? React.createElement(React.Fragment, null, React.createElement("i", { className: "fas fa-spinner fa-spin" }), " Guardando...")
            : React.createElement(React.Fragment, null, React.createElement("i", { className: "fas fa-save" }), " Guardar")
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
        estados.create ? React.createElement(CmPageActions, { label: "Crear material" },
          React.createElement("button", {
            onClick: self.openNewModal,
            className: "cm-btn cm-btn-accent cm-btn-sm"
          }, React.createElement("i", { className: "fas fa-plus" }), " Nuevo Material")
        ) : null,

        self.state.showFilters ? React.createElement("div", { className: "cm-filter-panel" },
          // Header con título y botón cerrar
          React.createElement("div", { className: "cm-filter-header" },
            React.createElement("h3", { className: "cm-filter-title" },
              React.createElement("i", { className: "fas fa-filter" }), " Filtros avanzados"
            ),
            React.createElement("button", {
              type: "button",
              onClick: self.toggleFilters,
              className: "cm-filter-close"
            }, React.createElement("i", { className: "fas fa-times" }))
          ),
          React.createElement("div", { className: "cm-filter-row" },
            React.createElement("div", { className: "cm-form-group" },
              React.createElement("label", { className: "cm-label" },
                React.createElement("i", { className: "fas fa-truck" }), " Proveedor"
              ),
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
              React.createElement("label", { className: "cm-label" },
                React.createElement("i", { className: "fas fa-align-left" }), " Descripcion"
              ),
              React.createElement("input", { className: "cm-input", name: "description", value: self.state.filters.description, onChange: self.handleFilterChange })
            ),
            React.createElement("div", { className: "cm-form-group" },
              React.createElement("label", { className: "cm-label" },
                React.createElement("i", { className: "fas fa-calendar-alt" }), " Fecha de Orden"
              ),
              React.createElement("input", { className: "cm-input", type: "date", name: "sales_date", value: self.state.filters.sales_date, onChange: self.handleFilterChange })
            ),
            React.createElement("div", { className: "cm-form-group" },
              React.createElement("label", { className: "cm-label" },
                React.createElement("i", { className: "fas fa-map-marker-alt" }), " Centro de costo ",
                React.createElement("small", { className: "cm-label-hint" }, "(3+ letras)")
              ),
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
              React.createElement("label", { className: "cm-label" },
                React.createElement("i", { className: "fas fa-flag" }), " Estado de compra"
              ),
              React.createElement("select", { className: "cm-input", name: "estado", value: self.state.filters.estado, onChange: self.handleFilterChange },
                React.createElement("option", { value: "" }, "Todos"),
                React.createElement("option", { value: "Pendiente" }, "Pendiente"),
                React.createElement("option", { value: "Parcial" }, "Parcial"),
                React.createElement("option", { value: "Entregado" }, "Entregado"),
                React.createElement("option", { value: "Cancelado" }, "Cancelado")
              )
            ),
            React.createElement("div", { className: "cm-form-group" },
              React.createElement("label", { className: "cm-label" },
                React.createElement("i", { className: "fas fa-calendar-alt" }), " Fecha desde"
              ),
              React.createElement("input", { className: "cm-input", type: "date", name: "date_desde", value: self.state.filters.date_desde, onChange: self.handleFilterChange })
            ),
            React.createElement("div", { className: "cm-form-group" },
              React.createElement("label", { className: "cm-label" },
                React.createElement("i", { className: "fas fa-calendar-alt" }), " Fecha hasta"
              ),
              React.createElement("input", { className: "cm-input", type: "date", name: "date_hasta", value: self.state.filters.date_hasta, onChange: self.handleFilterChange })
            ),
            React.createElement("div", { className: "cm-form-group" },
              React.createElement("label", { className: "cm-label" },
                React.createElement("i", { className: "fas fa-hashtag" }), " # Orden"
              ),
              React.createElement("input", { className: "cm-input", name: "sales_number", value: self.state.filters.sales_number, onChange: self.handleFilterChange })
            )
          ),
          React.createElement("div", { className: "cm-filter-row" },
            React.createElement("div", null),
            React.createElement("div", null),
            React.createElement("div", null),
            React.createElement("div", { className: "cm-form-group", style: { display: "flex", alignItems: "flex-end", justifyContent: "flex-end", gap: "8px" } },
              React.createElement("button", { type: "button", onClick: self.toggleFilters, className: "cm-btn cm-btn-outline cm-btn-sm" },
                React.createElement("i", { className: "fas fa-eraser" }), " Limpiar"
              ),
              React.createElement("button", { type: "button", onClick: self.applyFilters, className: "cm-btn cm-btn-accent cm-btn-sm" },
                React.createElement("i", { className: "fas fa-search" }), " Aplicar filtros"
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
