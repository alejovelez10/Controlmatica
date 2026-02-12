import React from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";

var newButtonStyle = {
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
  border: "none",
  background: "linear-gradient(135deg, #f5a623 0%, #f7b731 100%)",
  color: "#fff",
  boxShadow: "0 4px 12px rgba(245, 166, 35, 0.3)",
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

    // Render "Nuevo" button if onNew is provided
    if (!this.props.onNew) return null;

    return ReactDOM.createPortal(
      React.createElement("button", {
        onClick: this.props.onNew,
        style: newButtonStyle,
      },
        React.createElement("i", { className: "fas fa-plus" }),
        " Nuevo"
      ),
      this.el
    );
  }
}

CmPageActions.propTypes = {
  children: PropTypes.node,
  onNew: PropTypes.func,
};

export default CmPageActions;
