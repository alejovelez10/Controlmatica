import React, { Component } from 'react';
import Index from '../components/PurchaseOrders/index';
import WebpackerReact from 'webpacker-react';

var EMPTY_FILTER = {
  date_desde: "",
  date_hasta: "",
  number_order: "",
  cost_center_id: "",
  state: "",
  description: "",
  customer: "",
  number_invoice: "",
  quotation_number: "",
};

function csrfToken() {
  var meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}

class SalesOrders extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: [],
      loading: true,
      meta: { total: 0, page: 1, per_page: 50, total_pages: 1 },
      search: "",
      sort: "",
      dir: "asc",
      filters: Object.assign({}, EMPTY_FILTER),
      filtering: false,
    };
  }

  componentDidMount() {
    this.loadData();
  }

  loadData = () => {
    var s = this.state;
    this.setState({ loading: true });
    var url = "/get_sales_order?page=" + s.meta.page +
      "&per_page=" + s.meta.per_page +
      "&search=" + encodeURIComponent(s.search) +
      "&sort=" + encodeURIComponent(s.sort) +
      "&dir=" + encodeURIComponent(s.dir);

    // Append advanced filters
    if (s.filtering) {
      var f = s.filters;
      if (f.date_desde) url += "&date_desde=" + encodeURIComponent(f.date_desde);
      if (f.date_hasta) url += "&date_hasta=" + encodeURIComponent(f.date_hasta);
      if (f.number_order) url += "&number_order=" + encodeURIComponent(f.number_order);
      if (f.cost_center_id) url += "&cost_center_id=" + encodeURIComponent(f.cost_center_id);
      if (f.state) url += "&state=" + encodeURIComponent(f.state);
      if (f.description) url += "&description=" + encodeURIComponent(f.description);
      if (f.customer) url += "&customer=" + encodeURIComponent(f.customer);
      if (f.number_invoice) url += "&number_invoice=" + encodeURIComponent(f.number_invoice);
      if (f.quotation_number) url += "&quotation_number=" + encodeURIComponent(f.quotation_number);
    }

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

  handleApplyFilters = (filters) => {
    this.setState({
      filters: filters,
      filtering: true,
      meta: Object.assign({}, this.state.meta, { page: 1 }),
    }, this.loadData);
  };

  handleClearFilters = () => {
    this.setState({
      filters: Object.assign({}, EMPTY_FILTER),
      filtering: false,
      meta: Object.assign({}, this.state.meta, { page: 1 }),
    }, this.loadData);
  };

  render() {
    return (
      <Index
        data={this.state.data}
        loading={this.state.loading}
        meta={this.state.meta}
        usuario={this.props.usuario}
        estados={this.props.estados}
        cost_centers={this.props.cost_centers}
        clientes={this.props.clientes}
        loadData={this.loadData}
        onSearch={this.handleSearch}
        onSort={this.handleSort}
        onPageChange={this.handlePageChange}
        onPerPageChange={this.handlePerPageChange}
        filters={this.state.filters}
        filtering={this.state.filtering}
        onApplyFilters={this.handleApplyFilters}
        onClearFilters={this.handleClearFilters}
      />
    );
  }
}

export default SalesOrders;
WebpackerReact.setup({ SalesOrders });
