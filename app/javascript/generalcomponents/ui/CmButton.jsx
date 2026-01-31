import React from "react";
import PropTypes from "prop-types";

class CmButton extends React.Component {
  render() {
    const { variant, size, icon, children, className, ...rest } = this.props;
    const classes = [
      "cm-btn",
      variant ? `cm-btn-${variant}` : "cm-btn-primary",
      size ? `cm-btn-${size}` : "",
      className || ""
    ].filter(Boolean).join(" ");

    return (
      <button className={classes} {...rest}>
        {icon && <i className={icon} />}
        {children}
      </button>
    );
  }
}

CmButton.propTypes = {
  variant: PropTypes.oneOf(["primary", "accent", "outline", "danger", "success"]),
  size: PropTypes.oneOf(["sm", "lg"]),
  icon: PropTypes.string,
  children: PropTypes.node.isRequired,
  className: PropTypes.string
};

export default CmButton;
