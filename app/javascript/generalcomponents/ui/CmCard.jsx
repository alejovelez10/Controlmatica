import React from "react";
import PropTypes from "prop-types";

class CmCard extends React.Component {
  render() {
    const { title, actions, children, className } = this.props;

    return (
      <div className={`cm-card ${className || ""}`}>
        {(title || actions) && (
          <div className="cm-card-header">
            {title && <h3 className="cm-card-title">{title}</h3>}
            {actions && <div>{actions}</div>}
          </div>
        )}
        {children}
      </div>
    );
  }
}

CmCard.propTypes = {
  title: PropTypes.string,
  actions: PropTypes.node,
  children: PropTypes.node.isRequired,
  className: PropTypes.string
};

export default CmCard;
