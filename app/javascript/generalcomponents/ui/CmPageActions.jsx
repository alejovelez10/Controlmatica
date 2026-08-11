import React from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";

var newButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "8px 16px",
  fontFamily: "'Poppins', sans-serif",
  fontSize: "13px",
  fontWeight: "500",
  borderRadius: "6px",
  cursor: "pointer",
  transition: "all 0.2s ease",
  border: "none",
  background: "linear-gradient(135deg, #f5a623 0%, #f7b731 100%)",
  color: "#fff",
  boxShadow: "0 2px 8px rgba(245, 166, 35, 0.25)",
};

class CmPageActions extends React.Component {
  constructor(props) {
    super(props);
    this.el = document.getElementById("page-actions-portal");
  }

  render() {
    if (!this.el) return null;

    // If children are passed, render them directly (backward compatibility)
    if (this.props.children) {
      return ReactDOM.createPortal(this.props.children, this.el);
    }

    // Render button if onNew is provided
    if (!this.props.onNew) return null;

    var label = this.props.label || "Nuevo";

    // `testId` es OPCIONAL y aditivo: sin la prop, React no emite el atributo y
    // el DOM de las ~20 pantallas que usan este boton queda identico. Existe
    // porque el boton se renderiza por PORTAL a #page-actions-portal, fuera del
    // arbol del pack, y no hay forma de anotarlo desde afuera (paquete 09,
    // Tarea 2 bis: `expense-new` es el selector con el que el paquete 12 abre el
    // modal de gasto en tres escenarios).
    return ReactDOM.createPortal(
      React.createElement("button", {
        onClick: this.props.onNew,
        style: newButtonStyle,
        "data-testid": this.props.testId,
      },
        React.createElement("i", { className: "fas fa-plus" }),
        " " + label
      ),
      this.el
    );
  }
}

CmPageActions.propTypes = {
  children: PropTypes.node,
  onNew: PropTypes.func,
  label: PropTypes.string,
  testId: PropTypes.string,
};

export default CmPageActions;
