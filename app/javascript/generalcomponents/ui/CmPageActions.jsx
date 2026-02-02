import React from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";

class CmPageActions extends React.Component {
  constructor(props) {
    super(props);
    this.el = document.getElementById("page-actions-portal");
  }

  render() {
    if (!this.el) return null;
    return ReactDOM.createPortal(this.props.children, this.el);
  }
}

CmPageActions.propTypes = {
  children: PropTypes.node.isRequired,
};

export default CmPageActions;
