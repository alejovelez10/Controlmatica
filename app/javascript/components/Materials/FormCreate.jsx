import React from "react";
import NumberFormat from "react-number-format";
import Select from "react-select";
import { CmModal, CmInput, CmButton } from "../../generalcomponents/ui";

class FormCreate extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    var self = this;
    var props = this.props;
    var form = props.formValues;
    var errors = props.errors || [];
    var saving = props.isLoading;
    var isNew = props.modalMode === "new";
    var title = isNew ? "Nuevo Material" : "Editar Material";
    var icon = isNew ? "fas fa-plus" : "fas fa-pen";
    var hasCostCenter = props.cost_center_id != null && props.cost_center_id !== undefined;

    return React.createElement(CmModal, {
      isOpen: props.modal,
      toggle: props.toggle,
      title: React.createElement("span", null,
        React.createElement("i", { className: icon }),
        " ",
        title
      ),
      size: "lg",
      footer: React.createElement(React.Fragment, null,
        React.createElement(CmButton, { variant: "outline", onClick: props.toggle }, "Cerrar"),
        React.createElement(CmButton, { variant: "accent", onClick: props.submit, disabled: saving },
          saving
            ? React.createElement(React.Fragment, null, React.createElement("i", { className: "fas fa-spinner fa-spin" }), " Guardando...")
            : React.createElement(React.Fragment, null, React.createElement("i", { className: "fas fa-save" }), " ", props.nameSubmit || "Guardar")
        )
      )
    },
      props.errorValues === false ? React.createElement("div", { className: "cm-form-errors" },
        React.createElement("p", null, "Debes de completar todos los campos requeridos")
      ) : null,

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
            options: props.providerOptions,
            value: props.selectedProvider,
            onChange: props.onChangeAutocompleteProvider,
            placeholder: "Seleccione proveedor",
            className: "link-form"
          })
        ),

        !hasCostCenter ? React.createElement("div", { className: "cm-input-group", style: { minWidth: "250px" } },
          React.createElement("label", { className: "cm-input-label" }, "Centro de Costo"),
          React.createElement(Select, {
            options: props.centro,
            value: props.formAutocompleteCentro,
            onChange: props.onChangeAutocompleteCentro,
            placeholder: "Seleccione centro de costo",
            className: "link-form"
          })
        ) : null,

        React.createElement(CmInput, {
          label: "Fecha de Orden",
          type: "date",
          value: form.sales_date,
          onChange: props.onChangeForm
        }),

        React.createElement(CmInput, {
          label: "Número de Orden",
          placeholder: "Número de orden",
          value: form.sales_number,
          onChange: props.onChangeForm
        }),

        React.createElement("div", { className: "cm-input-group" },
          React.createElement("label", { className: "cm-input-label" }, "Valor"),
          React.createElement(NumberFormat, {
            name: "amount",
            thousandSeparator: true,
            prefix: "$",
            className: "cm-input",
            value: form.amount,
            onChange: props.onChangeForm,
            placeholder: "Valor"
          })
        ),

        React.createElement(CmInput, {
          label: "Fecha Entrega",
          type: "date",
          value: form.delivery_date,
          onChange: props.onChangeForm
        }),

        React.createElement("div", { className: "cm-input-group" },
          React.createElement("label", { className: "cm-input-label" }, "Estado"),
          React.createElement("select", {
            className: "cm-input",
            name: "sales_state",
            value: form.sales_state,
            onChange: props.onChangeForm
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
            name: "description",
            rows: "4",
            value: form.description,
            onChange: props.onChangeForm,
            placeholder: "Descripción del material"
          })
        )
      )
    );
  }
}

export default FormCreate;
