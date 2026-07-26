import React from "react";
import PropTypes from "prop-types";

class CmBadge extends React.Component {
  render() {
    const { variant, children, className } = this.props;

    return (
      <span className={`cm-badge cm-badge-${variant || "primary"} ${className || ""}`}>
        {children}
      </span>
    );
  }
}

CmBadge.propTypes = {
  variant: PropTypes.oneOf(["primary", "success", "danger", "warning", "info"]),
  children: PropTypes.node.isRequired,
  className: PropTypes.string
};

export default CmBadge;
