import React from "react";
import PropTypes from "prop-types";

class CmAlert extends React.Component {
  render() {
    const { variant, children, className } = this.props;

    return (
      <div className={`cm-alert cm-alert-${variant || "info"} ${className || ""}`}>
        {children}
      </div>
    );
  }
}

CmAlert.propTypes = {
  variant: PropTypes.oneOf(["success", "danger", "warning", "info"]),
  children: PropTypes.node.isRequired,
  className: PropTypes.string
};

export default CmAlert;
