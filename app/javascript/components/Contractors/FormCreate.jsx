import React from "react";
import Select from "react-select";
import NumberFormat from "react-number-format";
import { CmModal, CmButton } from "../../generalcomponents/ui";

class FormCreate extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    var props = this.props;

    var footer = React.createElement(React.Fragment, null,
      React.createElement(CmButton, { variant: "outline", onClick: props.toggle }, "Cerrar"),
      React.createElement(CmButton, {
        variant: "accent",
        onClick: props.submit,
        disabled: props.isLoading
      }, props.isLoading
        ? React.createElement(React.Fragment, null, React.createElement("i", { className: "fas fa-spinner fa-spin" }), " Guardando...")
        : React.createElement(React.Fragment, null, React.createElement("i", { className: "fas fa-save" }), " ", props.nameSubmit)
      )
    );

    return React.createElement(CmModal, {
      isOpen: props.modal,
      toggle: props.toggle,
      title: React.createElement("span", null, React.createElement("i", { className: "fas fa-hard-hat", style: { marginRight: 8 } }), props.titulo),
      size: "lg",
      footer: footer
    },
      props.errorValues === false ? React.createElement("div", { className: "cm-form-errors" },
        React.createElement("ul", null,
          React.createElement("li", null, "Debes completar todos los campos requeridos")
        )
      ) : null,

      React.createElement("div", { className: "cm-form-row" },
        // Fecha
        React.createElement("div", { className: "cm-input-group", style: { flex: "1 1 45%" } },
          React.createElement("label", { className: "cm-input-label" }, "Fecha ", React.createElement("small", { className: "validate-label" }, "*")),
          React.createElement("input", {
            type: "date",
            name: "sales_date",
            value: props.formValues.sales_date,
            onChange: props.onChangeForm,
            className: "cm-input" + (props.errorValues === false && props.formValues.sales_date === "" ? " error-class" : "")
          })
        ),

        // Horas
        React.createElement("div", { className: "cm-input-group", style: { flex: "1 1 45%" } },
          React.createElement("label", { className: "cm-input-label" }, "Horas trabajadas ", React.createElement("small", { className: "validate-label" }, "*")),
          React.createElement("input", {
            type: "text",
            name: "hours",
            value: props.formValues.hours,
            onChange: props.onChangeForm,
            className: "cm-input" + (props.errorValues === false && props.formValues.hours === "" ? " error-class" : ""),
            placeholder: "Horas trabajadas"
          })
        ),

        // Realizado por (Select)
        React.createElement("div", { className: "cm-input-group", style: { flex: "1 1 45%" } },
          React.createElement("label", { className: "cm-input-label" }, "Realizado por ", React.createElement("small", { className: "validate-label" }, "*")),
          React.createElement(Select, {
            onChange: props.onChangeAutocompleteUsers,
            options: props.users,
            autoFocus: false,
            className: "link-form" + (props.errorValues === false && props.formValues.user_execute_id === "" ? " error-class" : ""),
            value: props.formAutocompleteUsers
          })
        ),

        // Centro de costo (Select)
        React.createElement("div", { className: "cm-input-group", style: { flex: "1 1 45%" } },
          React.createElement("label", { className: "cm-input-label" }, "Centro de costo ", React.createElement("small", { className: "validate-label" }, "*")),
          React.createElement(Select, {
            onChange: props.onChangeAutocompleteCentro,
            options: props.centro,
            autoFocus: false,
            className: "link-form" + (props.errorValues === false && props.formValues.cost_center_id === "" ? " error-class" : ""),
            value: props.formAutocompleteCentro
          })
        ),

        // Monto
        React.createElement("div", { className: "cm-input-group", style: { flex: "1 1 45%" } },
          React.createElement("label", { className: "cm-input-label" }, "Monto"),
          React.createElement(NumberFormat, {
            name: "ammount",
            value: props.formValues.ammount,
            thousandSeparator: true,
            prefix: "$",
            className: "cm-input",
            placeholder: "$0",
            onValueChange: function (values) {
              var ev = { target: { name: "ammount", value: values.formattedValue } };
              props.onChangeForm(ev);
            }
          })
        ),

        // Descripción
        React.createElement("div", { className: "cm-input-group", style: { flex: "1 1 100%" } },
          React.createElement("label", { className: "cm-input-label" }, "Descripción ", React.createElement("small", { className: "validate-label" }, "*")),
          React.createElement("textarea", {
            name: "description",
            className: "cm-input" + (props.errorValues === false && props.formValues.description === "" ? " error-class" : ""),
            value: props.formValues.description,
            onChange: props.onChangeForm,
            placeholder: "Descripción...",
            rows: "4"
          })
        )
      )
    );
  }
}

export default FormCreate;
