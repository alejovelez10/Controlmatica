import React from "react";
import PropTypes from "prop-types";

class CmTable extends React.Component {
  render() {
    const { columns, data, actions, className } = this.props;

    return (
      <div className="cm-table-wrapper">
        <table className={`cm-table ${className || ""}`}>
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th key={i} style={col.width ? { width: col.width } : {}}>
                  {col.label}
                </th>
              ))}
              {actions && <th style={{ width: "120px" }}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={row.id || i}>
                {columns.map((col, j) => (
                  <td key={j}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
                {actions && <td>{actions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
}

CmTable.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string,
      label: PropTypes.string.isRequired,
      width: PropTypes.string,
      render: PropTypes.func
    })
  ).isRequired,
  data: PropTypes.array.isRequired,
  actions: PropTypes.func,
  className: PropTypes.string
};

export default CmTable;
