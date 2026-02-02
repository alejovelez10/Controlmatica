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
      // Autocomplete
      selectedProvider: null,
      selectedCostCenter: null
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
        render: function(row) {
          return row.provider ? row.provider.name : "";
        }
      },
      {
        key: "cost_center_code",
        label: "Centro de Costo",
        render: function(row) {
          return row.cost_center ? row.cost_center.code : "";
        }
      },
      { key: "sales_number", label: "# Orden" },
      {
        key: "amount",
        label: "Valor",
        render: function(row) {
          return formatCurrency(row.amount);
        }
      },
      { key: "description", label: "Descripción" },
      { key: "sales_date", label: "Fecha Orden" },
      { key: "delivery_date", label: "Fecha Entrega" },
      {
        key: "provider_invoice_value",
        label: "Valor Facturas",
        render: function(row) {
          return formatCurrency(row.provider_invoice_value);
        }
      },
      { key: "sales_state", label: "Estado" }
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
    return (
      React.createElement(React.Fragment, null,
        estados.download_file ? React.createElement("a", {
          href: "/download_file/materials.xls",
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
        self.renderShowInfo()
      )
    );
  }
}

export default index;
