import React from "react";
import NumberFormat from "react-number-format";
import Select from "react-select";
import { CmModal } from "../../generalcomponents/ui";

class FormCreate extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    var props = this.props;

    var footer = React.createElement(React.Fragment, null,
      React.createElement("button", {
        className: "cm-btn cm-btn-outline",
        onClick: props.toggle,
      }, "Cerrar"),
      React.createElement("button", {
        className: "cm-btn cm-btn-accent",
        onClick: props.submit,
        disabled: props.isLoading,
      }, props.isLoading ? "Guardando..." : props.nameSubmit)
    );

    return React.createElement(CmModal, {
      isOpen: props.modal,
      toggle: props.toggle,
      title: React.createElement("span", null,
        React.createElement("i", { className: "app-menu__icon fa fa-street-view", style: { marginRight: 8 } }),
        props.titulo
      ),
      size: "lg",
      footer: footer,
    },
      // Error alert
      props.errorValues === false ? React.createElement("div", {
        className: "cm-form-errors",
        style: { marginBottom: 16 },
      },
        React.createElement("b", null, "Debes de completar todos los campos requeridos")
      ) : null,

      React.createElement("div", { className: "row" },
        // Cliente
        React.createElement("div", { className: "col-md-6" },
          React.createElement("input", { type: "hidden", name: "customer_id", value: props.formAutocomplete.value }),
          React.createElement("label", null, "Cliente ", React.createElement("small", { className: "validate-label" }, "*")),
          React.createElement(Select, {
            onChange: props.onChangeAutocomplete,
            options: props.clientes,
            autoFocus: false,
            className: "link-form" + (props.errorValues === false && props.formValues.customer_id === "" ? " error-class" : ""),
            value: props.formAutocomplete,
          })
        ),

        // Contacto
        React.createElement("div", { className: "col-md-6" },
          React.createElement("input", { type: "hidden", name: "contact_id", value: props.formAutocompleteContact.value }),
          React.createElement("label", null, "Contacto ", React.createElement("small", { className: "validate-label" }, "*")),
          React.createElement(Select, {
            onChange: props.onChangeAutocompleteContact,
            options: props.contacto,
            autoFocus: false,
            className: "link-form" + (props.errorValues === false && props.formValues.contact_id === "" ? " error-class" : ""),
            value: props.formAutocompleteContact,
          }),
          props.create_state === false ? React.createElement("a", {
            "data-toggle": "collapse",
            href: "#collapseExample",
            "aria-expanded": "false",
            "aria-controls": "collapseExample",
          }, "Crear contacto") : null
        ),

        // Centro de costo
        React.createElement("div", { className: "col-md-12" },
          React.createElement("input", { type: "hidden", name: "cost_center_id", value: props.formAutocompleteCentro.value }),
          React.createElement("label", null, "Centro de costo ", React.createElement("small", { className: "validate-label" }, "*")),
          React.createElement(Select, {
            onChange: props.onChangeAutocompleteCentro,
            options: props.centro,
            autoFocus: false,
            className: "link-form",
            value: props.formAutocompleteCentro,
          })
        ),

        // Contact create form (collapsible)
        props.create_state === false ? React.createElement("div", {
          className: "collapse col-md-12",
          id: "collapseExample",
        },
          React.createElement("div", { className: "row" },
            React.createElement("div", { className: "col-md-4 mt-4" },
              React.createElement("label", null, "Nombre del Contacto"),
              React.createElement("input", {
                name: "contact_name",
                type: "text",
                className: "form form-control" + (props.errorValuesContact === false && props.formContactValues.contact_name === "" ? " error-class" : ""),
                value: props.formContactValues.contact_name,
                onChange: props.onChangeFormContact,
                placeholder: "Nombre del Contacto",
              })
            ),
            React.createElement("div", { className: "col-md-4 mt-4" },
              React.createElement("label", null, "Cargo del Contacto"),
              React.createElement("input", {
                name: "contact_position",
                type: "text",
                className: "form form-control" + (props.errorValuesContact === false && props.formContactValues.contact_position === "" ? " error-class" : ""),
                value: props.formContactValues.contact_position,
                onChange: props.onChangeFormContact,
                placeholder: "Cargo del Contacto",
              })
            ),
            React.createElement("div", { className: "col-md-4 mt-4" },
              React.createElement("label", null, "Telefono del Contacto"),
              React.createElement("input", {
                name: "contact_phone",
                type: "number",
                className: "form form-control" + (props.errorValuesContact === false && props.formContactValues.contact_phone === "" ? " error-class" : ""),
                value: props.formContactValues.contact_phone,
                onChange: props.onChangeFormContact,
                placeholder: "Telefono del Contacto",
              })
            ),
            React.createElement("div", { className: "col-md-4 mt-4" },
              React.createElement("label", null, "Email del Contacto"),
              React.createElement("input", {
                name: "contact_email",
                type: "email",
                className: "form form-control" + (props.errorValuesContact === false && props.formContactValues.contact_email === "" ? " error-class" : ""),
                value: props.formContactValues.contact_email,
                onChange: props.onChangeFormContact,
                placeholder: "Email del Contacto",
              })
            ),
            React.createElement("div", { className: "col-md-8 text-right" },
              React.createElement("label", {
                className: "btn btn-secondary mt-5 mb-0",
                onClick: props.FormSubmitContact,
              }, props.nameSubmit, " Contacto")
            )
          )
        ) : null,

        // Divider
        React.createElement("div", { className: "col-md-12" },
          React.createElement("hr", null)
        ),

        // Fecha del reporte
        React.createElement("div", { className: "col-md-4 mt-4" },
          React.createElement("label", null, "Fecha del reporte ", React.createElement("small", { className: "validate-label" }, "*")),
          React.createElement("input", {
            type: "date",
            name: "report_date",
            value: props.formValues.report_date,
            onChange: props.onChangeForm,
            className: "form form-control" + (props.errorValues === false && props.formValues.report_date === "" ? " error-class" : ""),
            autoComplete: "off",
          })
        ),

        // Responsable de Ejecucion
        props.estados.responsible === true ? React.createElement("div", { className: "col-md-4 mt-4" },
          React.createElement("label", null, "Responsable de Ejecucion"),
          React.createElement("select", {
            name: "report_execute_id",
            value: props.formValues.report_execute_id,
            onChange: props.onChangeForm,
            className: "form form-control" + (props.errorValues === false && props.formValues.report_execute_id === "" ? " error-class" : ""),
          },
            React.createElement("option", { value: "" }, "Seleccione un nombre"),
            props.users.map(function (item) {
              return React.createElement("option", { key: item.id, value: item.id }, item.names);
            })
          )
        ) : null,

        // Divider
        React.createElement("div", { className: "col-md-12 mt-4" },
          React.createElement("hr", null)
        ),

        // Tiempo de Trabajo
        React.createElement("div", { className: "col-md-4 mt-4" },
          React.createElement("label", null, "Tiempo de Trabajo (Horas)", React.createElement("small", { className: "validate-label" }, "*")),
          React.createElement("input", {
            name: "working_time",
            type: "text",
            className: "form form-control" + (props.errorValues === false && props.formValues.working_time === "" ? " error-class" : ""),
            value: props.formValues.working_time,
            onChange: props.onChangeForm,
            placeholder: "",
          })
        ),

        // Descripcion del trabajo
        React.createElement("div", { className: "col-md-8 mt-4" },
          React.createElement("label", null, "Descripcion del trabajo"),
          React.createElement("textarea", {
            name: "work_description",
            className: "form form-control" + (props.errorValues === false && props.formValues.work_description === "" ? " error-class" : ""),
            value: props.formValues.work_description,
            onChange: props.onChangeForm,
            rows: "5",
            placeholder: "Descripcion del trabajo",
          })
        ),

        // Divider
        React.createElement("div", { className: "col-md-12 mt-4" },
          React.createElement("hr", null)
        ),

        // Horas de desplazamiento
        React.createElement("div", { className: "col-md-6" },
          React.createElement("label", null, "Horas de desplazamiento", React.createElement("small", { className: "validate-label" }, "*")),
          React.createElement("input", {
            name: "displacement_hours",
            type: "number",
            className: "form form-control" + (props.errorValues === false && props.formValues.displacement_hours === "" ? " error-class" : ""),
            value: props.formValues.displacement_hours,
            onChange: props.onChangeForm,
            placeholder: "Horas de desplazamiento",
          })
        ),

        // Viatics section
        props.estados.viatics ? React.createElement(React.Fragment, null,
          React.createElement("div", { className: "col-md-12 mt-4" },
            React.createElement("hr", null)
          ),
          React.createElement("div", { className: "col-md-4 mt-4" },
            React.createElement("label", null, "Valor de viaticos ", React.createElement("small", { className: "validate-label" }, "*")),
            React.createElement(NumberFormat, {
              name: "viatic_value",
              thousandSeparator: true,
              prefix: "$",
              className: "form form-control" + (props.errorValues === false && props.formValues.viatic_value === "" ? " error-class" : ""),
              value: props.formValues.viatic_value,
              onChange: props.onChangeForm,
              placeholder: "Valor de viaticos",
            })
          ),
          React.createElement("div", { className: "col-md-8 mt-4" },
            React.createElement("label", null, "Descripcion viaticos"),
            React.createElement("textarea", {
              name: "viatic_description",
              className: "form form-control",
              value: props.formValues.viatic_description,
              onChange: props.onChangeForm,
              rows: "5",
              placeholder: "Descripcion viaticos",
            })
          )
        ) : null
      )
    );
  }
}

export default FormCreate;
