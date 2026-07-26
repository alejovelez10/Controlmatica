import React from "react";
import PropTypes from "prop-types";

class CmInput extends React.Component {
  render() {
    const { label, error, className, ...rest } = this.props;
    const inputClass = [
      "cm-input",
      error ? "cm-input-error" : "",
      className || ""
    ].filter(Boolean).join(" ");

    return (
      <div className="cm-form-group">
        {label && <label className="cm-label">{label}</label>}
        <input className={inputClass} {...rest} />
        {error && <div className="cm-form-error">{error}</div>}
      </div>
    );
  }
}

CmInput.propTypes = {
  label: PropTypes.string,
  error: PropTypes.string,
  className: PropTypes.string
};

export default CmInput;
