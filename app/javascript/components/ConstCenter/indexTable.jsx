import React from 'react';
import Table from "../ConstCenter/tableIndex";
import NumberFormat from 'react-number-format';
import Filter from "../ConstCenter/FormFilter"
import Pagination from "react-js-pagination";

class indexTable extends React.Component {
    constructor(props){
        super(props)

        this.state = {
            data: [],
            exel_values: [],
            isLoaded: false,
            show_filter: false,
            filtering: false,

            formFilter: {
              descripcion: "",
              customer_id: "",
              cost_center_id: "",
              execution_state: "",
              service_type: "",
              invoiced_state: "",
              start_date: "",
              end_date:"",
              quotation_number:"",
            },

            activePage: 1,
            cost_centers_total: 0, 
            countPage: 10,

            selectedOption: {
              customer_id: "",
              label: "Buscar cliente"
            },

            clients: [],

            selectedOptionCentro: {
              cost_center_id: "",
              label: "Centro de costo"
            },
            
            users: [],
            dataCostCenter: []
        }
    }

    handleChangeAutocompleteCustomer = selectedOption => {
      this.setState({
        selectedOption,
        formFilter: {
          ...this.state.formFilter,
          customer_id: selectedOption.value
        }
      });
    };

    loadData = () => {
        fetch("/get_cost_centers")
        .then(response => response.json())
        .then(data => {

          this.setState({
            data: data.cost_centers_paginate,
            cost_centers_total: data.cost_centers_total,
          });

          setTimeout(() => {
            this.setState({
              isLoaded: true
              
            });
            
          },1000)
        });

    }


    //add items
    updateData = (data) => {
      this.setState({
        data: [...this.state.data, data].reverse(),
      })
    }

    //add update
    updateItem = cost_center => {
        this.setState({
            data: this.state.data.map(item => {
            if (cost_center.id === item.id) {
              return { ...item, 
                id: cost_center.id,
                aiu_percent: cost_center.aiu_percent,
                aiu_percent_real: cost_center.aiu_percent_real,
                aiu_real: cost_center.aiu_real,
                code: cost_center.code,
                cont_costo_cotizado: cost_center.cont_costo_cotizado,
                cont_costo_porcentaje: cost_center.cont_costo_porcentaje,
                cont_costo_real: cost_center.cont_costo_real,
                cont_horas_eje: cost_center.cont_horas_eje,
                cont_horas_porcentaje: cost_center.cont_horas_porcentaje,
                contact: cost_center.contact,
                contact_id: cost_center.contact_id,
                contractor_total_costo: cost_center.contractor_total_costo,
                count: cost_center.count,
                create_type: cost_center.create_type,
                created_at: cost_center.created_at,
                customer: cost_center.customer,
                customer_id: cost_center.customer_id,
                description: cost_center.description,
                desp_horas_eje: cost_center.desp_horas_eje,
                desp_horas_porcentaje: cost_center.desp_horas_porcentaje,
                displacement_hours: cost_center.displacement_hours,
                end_date: cost_center.end_date,
                eng_hours: cost_center.eng_hours,
                engineering_value: cost_center.engineering_value,
                execution_state: cost_center.execution_state,
                fact_porcentaje: cost_center.fact_porcentaje,
                fact_real: cost_center.fact_real,
                hour_cotizada: cost_center.hour_cotizada,
                hour_real: cost_center.hour_real,
                hours_contractor: cost_center.hours_contractor,
                hours_contractor_invoices: cost_center.hours_contractor_invoices,
                hours_contractor_real: cost_center.hours_contractor_real,
                ing_costo_cotizado: cost_center.ing_costo_cotizado,
                ing_costo_porcentaje: cost_center.ing_costo_porcentaje,
                ing_costo_real: cost_center.ing_costo_real,
                ing_horas_eje: cost_center.ing_horas_eje,
                ing_horas_porcentaje: cost_center.ing_horas_porcentaje,
                ingenieria_total_costo: cost_center.ingenieria_total_costo,
                invoiced_state: cost_center.invoiced_state,
                last_user_edited: cost_center.last_user_edited.last_user_edited,
                last_user_edited_id: cost_center.last_user_edited_id,
                mat_costo_porcentaje: cost_center.mat_costo_porcentaje,
                mat_costo_real: cost_center.mat_costo_real,
                materials_value: cost_center.materials_value,
                offset_value: cost_center.offset_value,
                quotation_number: cost_center.quotation_number,
                quotation_value: cost_center.quotation_value,
                sales_orders: cost_center.sales_orders,
                sales_state: cost_center.sales_state,
                service_type: cost_center.service_type,
                start_date: cost_center.start_date,
                sum_contractor_costo: cost_center.sum_contractor_costo,
                sum_contractor_cot: cost_center.sum_contractor_cot,
                sum_contractors: cost_center.sum_contractors,
                sum_executed: cost_center.sum_executed,
                sum_materials: cost_center.sum_materials,
                sum_materials_costo: cost_center.sum_materials_costo,
                sum_materials_cot: cost_center.sum_materials_cot,
                sum_materials_value: cost_center.sum_materials_value,
                
                sum_viatic: cost_center.sum_viatic,
                total_expenses: cost_center.total_expenses,
                update_user: cost_center.update_user,
                updated_at: cost_center.updated_at,
                user: cost_center.user,
                user_id: cost_center.user_id,
                user_owner: cost_center.user_owner,
                user_owner_id: cost_center.user_owner_id,
                value_displacement_hours: cost_center.value_displacement_hours,

                viat_costo_porcentaje: cost_center.viat_costo_porcentaje,
                viat_costo_real: cost_center.viat_costo_real,
                viatic_value: cost_center.viatic_value,
                work_force_contractor: cost_center.work_force_contractor,
              }
            }
            return item;
          })
        });
    }
    
    componentDidMount() {
      this.loadData()
      let arrayClients = [];
      let arryUsers = [];
      let array_cost_center = []

      this.props.clientes.map((item) => (
        arrayClients.push({label: item.name, value: item.id})
      ))

      this.props.users.map((item) => (
        arryUsers.push({label: item.name, value: item.id})
      ))

      this.props.cost_center.map((item) => (
        array_cost_center.push({label: item.code, value: item.id})
      ))
  
      this.setState({
        dataCostCenter: array_cost_center,
        clients: arrayClients,
        users: arryUsers,
      })
    }

      
  showFilter = (valor) => {
    if (valor == true) {
      this.setState({ 
        show_filter: false,
        filtering: false,
        
        formFilter: {
          descripcion: "",
          customer_id: "",
          cost_center_id: "",
          service_type:"",
          execution_state: "",
          invoiced_state: "",
          start_date: "",
          end_date:"",
          quotation_number:"",
        },

        selectedOption: {
          customer_id: "",
          label: "Buscar cliente"
        },
        selectedOptionCentro: {
          cost_center_id: "",
          label: "Centro de costo"
        },
    
      });

      this.loadData();
    }else{
      this.setState({ show_filter: true, filtering: true });
    }
  }
  
  cancelFilter = () => {
    this.setState({
      formFilter: {
        descripcion: "",
        customer_id: "",
        cost_center_id: "",
        execution_state: "",
        service_type: "",
        invoiced_state: "",
        start_date: "",
        end_date:"",
        quotation_number:"",
      },

      selectedOption: {
        customer_id: "",
        label: "Buscar cliente"
      },

    })

    this.loadData();
  }


  

  handleChangeFilter = e => {
    this.setState({
      formFilter: {
        ...this.state.formFilter,
        [e.target.name]: e.target.value
      }
    });
  };


  HandleClickFilter = e => {
    fetch(`/get_cost_centers?descripcion=${this.state.formFilter.descripcion != undefined ? this.state.formFilter.descripcion : "" }&customer_id=${this.state.formFilter.customer_id != undefined ? this.state.formFilter.customer_id : ""}&cost_center_id=${this.state.formFilter.cost_center_id != undefined ? this.state.formFilter.cost_center_id : ""}&execution_state=${this.state.formFilter.execution_state != undefined ? this.state.formFilter.execution_state : ""}&service_type=${this.state.formFilter.service_type != undefined ? this.state.formFilter.service_type : ""}&invoiced_state=${this.state.formFilter.invoiced_state != undefined ? this.state.formFilter.invoiced_state : ""}&date_desde=${this.state.formFilter.date_desde != undefined ? this.state.formFilter.date_desde : ""}&date_hasta=${this.state.formFilter.date_hasta != undefined ? this.state.formFilter.date_hasta : ""}&quotation_number=${this.state.formFilter.quotation_number != undefined ? this.state.formFilter.quotation_number : ""}&filtering=${this.state.filtering}`)
      .then(response => response.json())
      .then(data => {
        this.setState({
          data: data.cost_centers_paginate,
          cost_centers_total: data.cost_centers_total,
          activePage: 1
        });
      });
  };

  change = e => {
    this.setState({
      countPage: e.target.value,
      activePage: this.state.countPage
    });
    fetch("/get_cost_centers?filter=" + e.target.value)
    .then(response => response.json())
    .then(data => {
      this.setState({
        data: data.cost_centers_paginate,
        cost_centers_total: data.cost_centers_total,
        activePage: 1
      });
    });
  }
  
  handlePageChange = pageNumber => {
    this.setState({ activePage: pageNumber });
    fetch(`/get_cost_centers?page=${pageNumber}&filter=${this.state.countPage}&filtering=${this.state.filtering}&descripcion=${this.state.filtering == true ? this.state.formFilter.descripcion : "" }&customer_id=${this.state.filtering == true && this.state.formFilter.customer_id != undefined ? this.state.formFilter.customer_id : ""}&cost_center_id=${this.state.filtering == true && this.state.formFilter.cost_center_id != undefined ? this.state.formFilter.cost_center_id : ""}&execution_state=${this.state.filtering == true ? this.state.formFilter.execution_state : ""}&service_type=${this.state.filtering == true ? this.state.formFilter.service_type : ""}&invoiced_state=${this.state.filtering == true ? this.state.formFilter.invoiced_state : ""}&date_desde=${this.state.filtering == true && this.state.formFilter.start_date != undefined ? this.state.formFilter.start_date : ""}&date_hasta=${this.state.filtering == true && this.state.formFilter.end_date != undefined ? this.state.formFilter.end_date : ""}&quotation_number=${this.state.filtering == true ? this.state.formFilter.quotation_number : ""}`) 
      .then(response => response.json())
      .then(data => {
        this.setState({ 
          data: data.cost_centers_paginate,
          cost_centers_total: data.cost_centers_total,
        });
      });
     
  };

  handleChangeAutocompleteCentro = selectedOptionCentro => {
    this.setState({
      selectedOptionCentro,
      formFilter: {
        ...this.state.formFilter,
        cost_center_id: selectedOptionCentro.value
      }
    });
  };





    render() {
        return (
            <React.Fragment>

            <div style={{ display: this.state.show_filter == true ? "block" : "none" }}>
              <Filter
                onChangeFilter={this.handleChangeFilter}
                formValuesFilter={this.state.formFilter}
                onClick={this.HandleClickFilter}
                cancelFilter={this.cancelFilter}
                closeFilter={this.showFilter}     


                formAutocompleteCustomer={this.state.selectedOption}
                onChangeAutocompleteCustomer={this.handleChangeAutocompleteCustomer}
                clientes={this.state.clients}

                   /* AUTOCOMPLETE CENTRO DE COSTO */

                   centro={this.state.dataCostCenter}
                   onChangeAutocompleteCentro={this.handleChangeAutocompleteCentro}
                   formAutocompleteCentro={this.state.selectedOptionCentro}

              />
            </div>


              <div className="row">
                <div className="col-md-12">
                  <div className="card card-table">
                    <div className="card-body">


                        {
                        this.state.isLoaded == true ? (
                            <Table 
                                dataActions={this.state.data} 
                                loadInfo={this.loadData}
                                usuario={this.props.usuario}
                                show={this.showFilter}
                                clientes={this.props.clientes}
                                estados={this.props.estados}
                                hours_real={this.props.hours_real}
                                hours_invoices={this.props.hours_invoices} 
                                hours_real_contractor={this.props.hours_real_contractor}
                                value_displacement_hours={this.props.value_displacement_hours}
                                exel_values={this.state.exel_values}
                                filtering={this.state.filtering}
                                alerts={this.props.alerts}
                                users={this.state.users}
                                formFilter={this.state.formFilter}
                                updateData={this.updateData}
                                updateItem={this.updateItem}
                            />
                        ) : (
                          <div className="col-md-12 text-center">
                              <p>Cargando....</p>
                          </div>
                        )}

                      <div className="col-md-12" style={{ marginTop: "50px" }}>
                        <div className="row">

                          <div className="col-md-5 text-left pl-0">
                              <p>
                                  Mostrando {this.state.data.length} de {this.state.cost_centers_total}
                              </p>
                          </div>

                          <div className="col-md-6 p-0 text-right">
                            <Pagination
                              hideNavigation
                              activePage={this.state.activePage}
                              itemsCountPerPage={this.state.countPage}
                              itemClass="page-item"
                              innerClass="pagination"
                              linkClass="page-link"
                              totalItemsCount={this.state.cost_centers_total}
                              pageRangeDisplayed={this.state.countPage}
                              onChange={this.handlePageChange}
                            />
                          </div>

                        </div>
                      </div>

      
                    </div>
                  </div>
                </div>
              </div>

            </React.Fragment>

        )
      
    }
}

export default indexTable;

