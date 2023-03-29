import React from 'react';
import Table from "../PurchaseOrders/table";
import NumberFormat from 'react-number-format';
import ShowInfo from "../ConstCenter/show"

class index extends React.Component {
    constructor(props){
        super(props)

        this.state = {
            data_show: [],
            data_purchase_orders: [],
            isLoaded: false,
            horas_eje: 0,
            porc_eje: 0,

            via_cotizado: 0,
            via_real: 0,
            porc_via: 0,

            costo_en_dinero: 0,
            costo_real_en_dinero: 0,
            porc_eje_costo: 0,

            facturacion: 0,
            porc_fac: 0,
            sum_materials: 0,
            sum_contractors: 0,
            porc_eje_contractor:0,
            hours_contractor:0,
            hours_eje_contractor:0,
            costo_en_dinero_contractor: 0,
            costo_real_en_dinero_contractor: 0,
            porc_eje_costo_contractor:0,
            porc_mat: 0,
            ejecutado_desplazamiento: 0,
            porc_desplazamiento: 0,
        }
    }

    loadData = () => {
        fetch("/get_show_center/" + this.props.cost_center.id)
        .then(response => response.json())
        .then(data => {
          console.log(data)
          this.setState({
            data_show: data.data_show,
            data_purchase_orders: data.data_orders,
            horas_eje: data.horas_eje,
            porc_eje: data.porc_eje,
            
            via_cotizado: data.via_cotizado,
            via_real: data.via_real,
            porc_via: data.porc_via,

            costo_en_dinero: data.costo_en_dinero,
            costo_real_en_dinero: data.costo_real_en_dinero,
            porc_eje_costo: data.porc_eje_costo,

            facturacion: data.facturacion,
            porc_fac: data.porc_fac,

            sum_materials: data.sum_materials,
            sum_contractors: data.sum_contractors,
            porc_mat: data.porc_mat,
            hours_contractor: data.hours_contractor,
            hours_eje_contractor: data.hours_eje_contractor,
            porc_eje_contractor: data.porc_eje_contractor,
            costo_en_dinero_contractor: data.costo_en_dinero_contractor,
            costo_real_en_dinero_contractor: data.costo_real_en_dinero_contractor,
            porc_eje_costo_contractor:data.porc_eje_costo_contractor,

            ejecutado_desplazamiento_horas: data.ejecutado_desplazamiento_horas,
            porc_desplazamiento: data.porc_desplazamiento,


          });

          setTimeout(() => {
            this.setState({
              isLoaded: true
              
            });
            
          },1000)
        });

      }
    
    componentDidMount() {
        this.loadData();
    }

      
  showFilter = (valor) => {
    if (valor == true) {
      this.setState({ show_filter: false });
    }else{
      this.setState({ show_filter: true });
    }

    this.setState({
      formFilter: {
        date_of_entry: "",
        value: "",
        number_account: "",
        voucher_number: ""
      }

    })


    this.loadData();
  }
  
  cancelFilter = () => {
    this.setState({
      formFilter: {
        date_of_entry: "",
        value: "",
        number_account: "",
        voucher_number: ""
      }

    })

    this.loadData();
  }

  change = e => {
    this.setState({
      countPage: e.target.value,
      activePage: this.state.countPage
    });
    fetch("/get_payments?filter=" + e.target.value)
    .then(response => response.json())
    .then(data => {
      this.setState({
        data: data.users_paginate,
        users_total: data.users_total,
        activePage: 1
      });
    });
  }
  
  handlePageChange = pageNumber => {
    this.setState({ activePage: pageNumber });
    fetch(`/get_incomes?page=${pageNumber}&filter=${this.state.countPage}`) 
      .then(response => response.json())
      .then(data => {
        this.setState({ data: data.users_paginate });
      });
     
  };

  handleChangeFilter = e => {
    this.setState({
      formFilter: {
        ...this.state.formFilter,
        [e.target.name]: e.target.value
      }
    });
  };

  HandleClickFilter = e => {
    fetch(`/get_incomes/${this.props.agreement.id}?date_of_entry=${this.state.formFilter.date_of_entry}&value=${this.state.formFilter.value}&number_account=${this.state.formFilter.number_account}&voucher_number=${this.state.formFilter.voucher_number}`)
      .then(response => response.json())
      .then(data => {
        this.setState({
          data: data.income_paginate,
          users_total: data.income_total,
          activePage: 1
        });
      });
   
  };


    render() {
        return (
            <React.Fragment>
   
                      <ShowInfo 
                          data_info={this.state.data_show}

                          horas_eje={this.state.horas_eje}
                          porc_eje={this.state.porc_eje}
                          
                          via_cotizado={this.state.via_cotizado}
                          via_real={this.state.via_real}
                          porc_via={this.state.porc_via}

                          costo_en_dinero={this.state.costo_en_dinero}
                          costo_real_en_dinero={this.state.costo_real_en_dinero}
                          porc_eje_costo={this.state.porc_eje_costo}

                          porc_fac={this.state.porc_fac}
                          facturacion={this.state.facturacion}

                          sum_materials={this.state.sum_materials}
                          porc_mat={this.state.porc_mat}
                          sum_contractors={this.state.sum_contractors}

                          sales_orders_state={true}

                          hours_contractor= {this.state.hours_contractor}
                          hours_eje_contractor = {this.state.hours_eje_contractor}
                          porc_eje_contractor = {this.state.porc_eje_contractor}
                          costo_en_dinero_contractor={this.state.costo_en_dinero_contractor}
                          costo_real_en_dinero_contractor={this.state.costo_real_en_dinero_contractor}
                          porc_eje_costo_contractor={this.state.porc_eje_costo_contractor}

                
                          ejecutado_desplazamiento_horas= {this.state.ejecutado_desplazamiento_horas}
                          porc_desplazamiento= {this.state.porc_desplazamiento}

                          loadData={this.loadData}
                          clientes={this.props.clientes}
                          estados={this.props.estados}
                          alerts={this.props.alerts}
                          users={this.props.users}
                          users_select={this.props.users_select}
                          cost_center={this.props.cost_center}
                          current_tab={this.props.current_tab}
                          microsoft_auth={this.props.microsoft_auth}
                          current_user_name={this.props.current_user_name}
                          providers={this.props.providers}
                          usuario={this.props.usuario} 
                          report_expense_options={this.props.report_expense_options}
                          
                      />

            </React.Fragment>

        )
      
    }
}

export default index;
