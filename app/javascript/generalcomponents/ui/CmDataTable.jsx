import React from "react";
import PropTypes from "prop-types";

class CmDataTable extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      search: "",
      appliedSearch: "",
      activeSearch: false,
      sortKey: null,
      sortDir: "asc",
      page: 1,
      perPage: props.perPage || 10,
      visibleColumns: props.columns.map((c) => c.key),
      showColumnPicker: false,
    };
  }

  // Búsqueda
  handleSearchChange = (e) => {
    this.setState({ search: e.target.value });
  };

  handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      this.executeSearch();
    }
  };

  executeSearch = () => {
    const { onSearch } = this.props;
    const { search } = this.state;

    if (onSearch) {
      onSearch(search.trim());
    }
    this.setState({ appliedSearch: search.trim(), activeSearch: search.trim() !== "", page: 1 });
  };

  cancelSearch = () => {
    const { onSearch } = this.props;
    this.setState({ search: "", appliedSearch: "", activeSearch: false, page: 1 });
    if (onSearch) {
      onSearch("");
    }
  };

  // Ordenamiento
  handleSort = (key) => {
    this.setState((prev) => {
      const newDir = prev.sortKey === key && prev.sortDir === "asc" ? "desc" : "asc";
      if (this.props.serverPagination && this.props.onSort) {
        this.props.onSort(key, newDir);
      }
      return { sortKey: key, sortDir: newDir, page: 1 };
    });
  };

  // Paginación
  goToPage = (page) => {
    if (this.props.serverPagination && this.props.onPageChange) {
      this.props.onPageChange(page);
    } else {
      this.setState({ page });
    }
  };

  handlePerPage = (e) => {
    const val = parseInt(e.target.value);
    if (this.props.serverPagination && this.props.onPerPageChange) {
      this.props.onPerPageChange(val);
    } else {
      this.setState({ perPage: val, page: 1 });
    }
  };

  // Visibilidad de columnas
  toggleColumnPicker = () => {
    this.setState((prev) => ({ showColumnPicker: !prev.showColumnPicker }));
  };

  toggleColumn = (key) => {
    this.setState((prev) => {
      const visible = prev.visibleColumns.includes(key)
        ? prev.visibleColumns.filter((k) => k !== key)
        : [...prev.visibleColumns, key];
      return { visibleColumns: visible };
    });
  };

  // Filtrar y ordenar datos (solo cuando NO hay onSearch, búsqueda local)
  getProcessedData = () => {
    const { data, columns, onSearch } = this.props;
    const { appliedSearch, sortKey, sortDir } = this.state;

    let result = data || [];

    // Búsqueda local solo si no hay onSearch (backend)
    if (!onSearch && appliedSearch) {
      const term = appliedSearch.toLowerCase();
      result = result.filter((row) =>
        columns.some((col) => {
          const val = row[col.key];
          return val != null && String(val).toLowerCase().includes(term);
        })
      );
    }

    // Ordenar (solo client-side cuando no hay server pagination con onSort)
    if (sortKey && !(this.props.serverPagination && this.props.onSort)) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortKey] != null ? a[sortKey] : "";
        const bVal = b[sortKey] != null ? b[sortKey] : "";

        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDir === "asc" ? aVal - bVal : bVal - aVal;
        }

        const comp = String(aVal).localeCompare(String(bVal), "es", {
          numeric: true,
        });
        return sortDir === "asc" ? comp : -comp;
      });
    }

    return result;
  };

  // Paginar
  getPaginatedData = (processed) => {
    const { perPage, page } = this.state;
    const start = (page - 1) * perPage;
    return processed.slice(start, start + perPage);
  };

  renderSortIcon = (key) => {
    const { sortKey, sortDir } = this.state;
    if (sortKey !== key) {
      return <span className="cm-dt-sort-icon"><i className="fas fa-sort" /></span>;
    }
    return (
      <span className="cm-dt-sort-icon active">
        <i className={sortDir === "asc" ? "fas fa-sort-up" : "fas fa-sort-down"} />
      </span>
    );
  };

  renderSkeleton = () => {
    const { columns } = this.props;
    const allVisible = columns.filter((c) =>
      this.state.visibleColumns.includes(c.key)
    );
    const visibleCols = allVisible.slice(0, 6);
    const rows = 15;

    return (
      <div className="cm-dt cm-dt--skeleton">
        <div className="cm-dt-toolbar">
          <div className="cm-dt-search">
            <div className="cm-dt-skeleton-bar" style={{ width: "250px", height: "38px" }} />
          </div>
        </div>
        <div className="cm-dt-table-wrapper">
          <table className="cm-dt-table">
            <thead>
              <tr>
                {this.props.actions && (
                  <th style={{ width: "50px" }}>
                    <div className="cm-dt-skeleton-bar" style={{ width: "28px", height: "14px", margin: "0 auto" }} />
                  </th>
                )}
                {visibleCols.map((col, i) => (
                  <th key={i}>
                    <div className="cm-dt-skeleton-bar" style={{ width: "70%", height: "14px" }} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, i) => (
                <tr key={i}>
                  {this.props.actions && (
                    <td style={{ textAlign: "center" }}>
                      <div className="cm-dt-skeleton-circle" />
                    </td>
                  )}
                  {visibleCols.map((col, j) => (
                    <td key={j}>
                      <div
                        className="cm-dt-skeleton-bar"
                        style={{
                          width: `${55 + Math.random() * 35}%`,
                          height: "14px",
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  render() {
    const { columns, data, actions, loading, emptyMessage, emptyAction, headerActions, searchPlaceholder, serverPagination, serverMeta, stickyActions } = this.props;
    const { search, activeSearch, visibleColumns, showColumnPicker } = this.state;

    if (loading) {
      return this.renderSkeleton();
    }

    const visibleCols = columns.filter((c) => visibleColumns.includes(c.key));

    // Server-side vs client-side pagination
    let rows, currentPage, currentPerPage, totalPages, total, start, end_;

    if (serverPagination && serverMeta) {
      rows = this.getProcessedData(); // solo aplica sort client-side
      currentPage = serverMeta.page;
      currentPerPage = serverMeta.per_page;
      totalPages = Math.max(1, serverMeta.total_pages);
      total = serverMeta.total;
      start = total > 0 ? (currentPage - 1) * currentPerPage + 1 : 0;
      end_ = Math.min(currentPage * currentPerPage, total);
    } else {
      const processed = this.getProcessedData();
      const { page, perPage } = this.state;
      currentPage = page;
      currentPerPage = perPage;
      rows = this.getPaginatedData(processed);
      totalPages = Math.max(1, Math.ceil(processed.length / perPage));
      total = processed.length;
      start = total > 0 ? (page - 1) * perPage + 1 : 0;
      end_ = Math.min(page * perPage, total);
    }

    return (
      <div className="cm-dt">
        {/* Toolbar */}
        <div className="cm-dt-toolbar">
          <div className="cm-dt-search-group">
            <div className="cm-dt-search">
              <i className="fas fa-search cm-dt-search-icon" />
              <input
                type="text"
                className="cm-dt-search-input"
                placeholder={searchPlaceholder || "Buscar..."}
                value={search}
                onChange={this.handleSearchChange}
                onKeyDown={this.handleSearchKeyDown}
              />
            </div>
            <button className="cm-dt-search-btn" onClick={this.executeSearch} title="Buscar">
              <i className="fas fa-search" />
            </button>
            {activeSearch && (
              <button className="cm-dt-search-cancel" onClick={this.cancelSearch} title="Limpiar búsqueda">
                <i className="fas fa-times" />
              </button>
            )}
          </div>

          <div className="cm-dt-toolbar-right">
            {headerActions && <div className="cm-dt-header-actions">{headerActions}</div>}

            {/* Column Picker - Comentado temporalmente
            <div className="cm-dt-col-picker">
              <button
                className="cm-dt-col-picker-btn"
                onClick={this.toggleColumnPicker}
              >
                <i className="fas fa-columns" /> Columnas
              </button>
              {showColumnPicker && (
                <div className="cm-dt-col-picker-dropdown">
                  {columns.map((col) => (
                    <label key={col.key} className="cm-dt-col-picker-item">
                      <input
                        type="checkbox"
                        checked={visibleColumns.includes(col.key)}
                        onChange={() => this.toggleColumn(col.key)}
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
            */}
          </div>
        </div>

        {/* Tabla */}
        <div className="cm-dt-table-wrapper">
          <table className="cm-dt-table">
            <thead>
              <tr>
                {actions && <th className="cm-dt-actions-header" style={{ width: 50, padding: "8px 4px" }}></th>}
                {visibleCols.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable !== false && this.handleSort(col.key)}
                    className={col.sortable !== false ? "cm-dt-sortable" : ""}
                    style={col.width ? { minWidth: col.width, width: col.width } : {}}
                  >
                    {col.label}
                    {col.sortable !== false && this.renderSortIcon(col.key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row, i) => (
                  <tr key={row.id || i}>
                    {actions && (
                      <td className="cm-dt-actions-cell" style={{ padding: "8px 4px" }}>{actions(row)}</td>
                    )}
                    {visibleCols.map((col) => (
                      <td key={col.key}>
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={visibleCols.length + (actions ? 1 : 0)}
                    className="cm-dt-empty"
                  >
                    <div className="cm-dt-empty-content">
                      <i className="fas fa-inbox cm-dt-empty-icon" />
                      <p>{emptyMessage || "No hay registros"}</p>
                      {emptyAction && emptyAction}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Paginación */}
        {total > 0 && (
          <div className="cm-dt-footer">
            <div className="cm-dt-info">
              Mostrando {start} - {end_} de {total} registros
            </div>

            <div className="cm-dt-pagination">
              <div className="cm-dt-per-page">
                <span>Por página:</span>
                <select value={currentPerPage} onChange={this.handlePerPage}>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="cm-dt-pages">
                <button
                  className="cm-dt-page-btn"
                  disabled={currentPage === 1}
                  onClick={() => this.goToPage(1)}
                >
                  «
                </button>
                <button
                  className="cm-dt-page-btn"
                  disabled={currentPage === 1}
                  onClick={() => this.goToPage(currentPage - 1)}
                >
                  ‹
                </button>
                <span className="cm-dt-page-info">
                  {currentPage} / {totalPages}
                </span>
                <button
                  className="cm-dt-page-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => this.goToPage(currentPage + 1)}
                >
                  ›
                </button>
                <button
                  className="cm-dt-page-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => this.goToPage(totalPages)}
                >
                  »
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

CmDataTable.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      width: PropTypes.string,
      sortable: PropTypes.bool,
      render: PropTypes.func,
    })
  ).isRequired,
  data: PropTypes.array.isRequired,
  actions: PropTypes.func,
  loading: PropTypes.bool,
  perPage: PropTypes.number,
  emptyMessage: PropTypes.string,
  emptyAction: PropTypes.node,
  headerActions: PropTypes.node,
  onSearch: PropTypes.func,
  searchPlaceholder: PropTypes.string,
  serverPagination: PropTypes.bool,
  serverMeta: PropTypes.shape({
    total: PropTypes.number,
    page: PropTypes.number,
    per_page: PropTypes.number,
    total_pages: PropTypes.number,
  }),
  stickyActions: PropTypes.bool,
  onSort: PropTypes.func,
  onPageChange: PropTypes.func,
  onPerPageChange: PropTypes.func,
};

export default CmDataTable;
