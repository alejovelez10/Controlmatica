import React, { Component } from 'react';
import Table from '../components/ReportExpenseOption/Index';
import WebpackerReact from 'webpacker-react';

function csrfToken() {
  var meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}

class ReportExpenseOptionIndex extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: [],
      loading: true,
      meta: { total: 0, page: 1, per_page: 10, total_pages: 1 },
      search: "",
      sort: "",
      dir: "asc",
    };
  }

  componentDidMount() {
    this.loadData();
  }

  loadData = () => {
    var s = this.state;
    this.setState({ loading: true });
    var url = "/get_report_expense_options?page=" + s.meta.page +
      "&per_page=" + s.meta.per_page +
      "&search=" + encodeURIComponent(s.search) +
      "&sort=" + encodeURIComponent(s.sort) +
      "&dir=" + encodeURIComponent(s.dir);

    fetch(url, {
      method: "GET",
      headers: { "X-CSRF-Token": csrfToken(), "Content-Type": "application/json" }
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        this.setState({ data: data.data, meta: data.meta, loading: false });
      }.bind(this));
  };

  handleSearch = (term) => {
    this.setState({ search: term, meta: Object.assign({}, this.state.meta, { page: 1 }) }, this.loadData);
  };

  handleSort = (key, dir) => {
    this.setState({ sort: key, dir: dir, meta: Object.assign({}, this.state.meta, { page: 1 }) }, this.loadData);
  };

  handlePageChange = (page) => {
    this.setState({ meta: Object.assign({}, this.state.meta, { page: page }) }, this.loadData);
  };

  handlePerPageChange = (perPage) => {
    this.setState({ meta: Object.assign({}, this.state.meta, { per_page: perPage, page: 1 }) }, this.loadData);
  };

  render() {
    return (
      <Table
        data={this.state.data}
        loading={this.state.loading}
        meta={this.state.meta}
        estados={this.props.estados}
        loadData={this.loadData}
        onSearch={this.handleSearch}
        onSort={this.handleSort}
        onPageChange={this.handlePageChange}
        onPerPageChange={this.handlePerPageChange}
      />
    );
  }
}

export default ReportExpenseOptionIndex;
WebpackerReact.setup({ ReportExpenseOptionIndex });
