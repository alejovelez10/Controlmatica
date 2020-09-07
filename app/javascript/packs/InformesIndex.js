import React, { Component } from 'react';
import WebpackerReact from 'webpacker-react';
import Index from '../components/Informes/Index'
import Filter from '../components/Informes/FormFilter'

class InformesIndex extends Component {
    constructor(props) {
        super(props);
        this.token = document.querySelector("[name='csrf-token']").content;
        this.state = {
            formFilter: {
                descripcion: "",
                customer_id: [],
                cost_center_id: [],
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

            selectedOptionCentro: {
                cost_center_id: "",
                label: "Centro de costo"
            },
    

            isLoaded: true,
            show_filter: false,
            dataCostCenter: [],
            dataMaterials: [],
            dataTableristas: [],
            dataReports: [],

            clientes: [],
            dataCostCenterSelect: [],
            gastosTotales: [],
            facturaGastos: [],
            facturaVentas: [],
            ventaGastos: [],
            entradasTotales:[],
            ingenieriaComparativa: [],
            contratistaComparativa: [],
            materialesComparativa: [],



            
        }
    }

    componentDidMount(){
        let arrayClients = []
        let array_cost_center = []
  
        this.props.clientes.map((item) => (
          arrayClients.push({label: item.name, value: item.id})
        ))
    
        this.props.cost_center.map((item) => (
          array_cost_center.push({label: item.code, value: item.id})
        ))
    
        this.setState({
            dataCostCenterSelect: array_cost_center,
            clientes: arrayClients,
        })
  
        this.loadData()
    }
    

    updateStateLoad = (state) => {
        this.setState({ isLoaded: state })
    } 
  

    loadData = () => {
        fetch(`/get_informes`, {
            method: 'GET', // or 'PUT'
            headers: {
                "X-CSRF-Token": this.token,
                "Content-Type": "application/json"
            }
        })
        .then(response => response.json())
        .then(data => {
          this.setState({
            dataCostCenter: data.dataCostCenter,
            dataMaterials: data.dataMaterials,
            dataTableristas: data.dataTableristas,
            dataReports: data.dataReports,
            gastosTotales: data.gastosTotales,
            facturaGastos: data.facturaGastos,
            facturaVentas: data.facturaVentas,
            ventaGastos: data.ventaGastos,
            entradasTotales: data.entradasTotales,
            ingenieriaComparativa: data.ingenieriaComparativa,
            contratistaComparativa: data.contratistaComparativa,
            materialesComparativa: data.materialesComparativa,
            isLoaded: false
          });
        });
    }

    //filter props

    handleChangeAutocompleteCustomer = selectedOption => {
      let array = []

        selectedOption.map((item) => (
          array.push(item.value)
        ))
    
        this.setState({
          formFilter: {
            ...this.state.formFilter,
            customer_id: array
          }
        })
    };

    handleChangeAutocompleteCentro = selectedOptionCentro => {
      let array = []

        selectedOptionCentro.map((item) => (
          array.push(item.value)
        ))
    
        this.setState({
          formFilter: {
            ...this.state.formFilter,
            cost_center_id: array
          }
        })
    };

    updateStateLoad = (state) => {
      this.setState({ isLoaded: state })
    } 

    

    HandleClickFilter = e => {
        this.setState({ isLoaded: true })
        fetch(`/get_informes?customer_id=${this.state.formFilter.customer_id != undefined ? this.state.formFilter.customer_id : ""}&cost_center_id=${this.state.formFilter.cost_center_id != undefined ? this.state.formFilter.cost_center_id : ""}&execution_state=${this.state.formFilter.execution_state != undefined ? this.state.formFilter.execution_state : ""}&service_type=${this.state.formFilter.service_type != undefined ? this.state.formFilter.service_type : ""}&invoiced_state=${this.state.formFilter.invoiced_state != undefined ? this.state.formFilter.invoiced_state : ""}&date_desde=${this.state.formFilter.start_date != undefined ? this.state.formFilter.start_date : ""}&date_hasta=${this.state.formFilter.end_date != undefined ? this.state.formFilter.end_date : ""}`)
          .then(response => response.json())
          .then(data => {
            this.setState({
              dataCostCenter: data.dataCostCenter,
              dataMaterials: data.dataMaterials,
              dataTableristas: data.dataTableristas,
              dataReports: data.dataReports,
              gastosTotales: data.gastosTotales,
              facturaGastos: data.facturaGastos,
              facturaVentas: data.facturaVentas,
              ventaGastos: data.ventaGastos,
              entradasTotales: data.entradasTotales,
              ingenieriaComparativa: data.ingenieriaComparativa,
              contratistaComparativa: data.contratistaComparativa,
              materialesComparativa: data.materialesComparativa,
              isLoaded: false
            });
        });
    };

    showFilter = (valor) => {
        if (valor == true) {
          this.setState({ 
            show_filter: false,
            filtering: false,
            
            formFilter: {
              descripcion: "",
              customer_id: [],
              cost_center_id: [],
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

    handleChangeFilter = e => {
        this.setState({
          formFilter: {
            ...this.state.formFilter,
            [e.target.name]: e.target.value
          }
        });
    };

    cancelFilter = () => {
        this.setState({
          formFilter: {
            descripcion: "",
            customer_id: [],
            cost_center_id: [],
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

          selectedOptionCentro: {
            cost_center_id: "",
            label: "Centro de costo"
          },
    
        })
    
        this.loadData();
      }
    
    

    render() {
        return (
            <React.Fragment>

              {this.state.show_filter &&(
                <Filter
                  onChangeFilter={this.handleChangeFilter}
                  formValuesFilter={this.state.formFilter}
                  onClick={this.HandleClickFilter}
                  cancelFilter={this.cancelFilter}
                  closeFilter={this.showFilter}     


                  formAutocompleteCustomer={this.state.selectedOption}
                  onChangeAutocompleteCustomer={this.handleChangeAutocompleteCustomer}
                  clientes={this.state.clientes}

                  /* AUTOCOMPLETE CENTRO DE COSTO */

                  centro={this.state.dataCostCenterSelect}
                  onChangeAutocompleteCentro={this.handleChangeAutocompleteCentro}
                  formAutocompleteCentro={this.state.selectedOptionCentro}

                />
              )}

              <Index
                  updateStateLoad={this.updateStateLoad}
                  loadData={this.loadData}
                  estados={this.props.estados}
                  isLoaded={this.state.isLoaded}
                  show={this.showFilter}

                  dataCostCenter={this.state.dataCostCenter}
                  dataMaterials={this.state.dataMaterials}
                  dataTableristas={this.state.dataTableristas}
                  dataReports={this.state.dataReports}
                  dataTotales={this.state.gastosTotales}
                  facturaGastos={this.state.facturaGastos}
                  facturaVentas={this.state.facturaVentas}
                  ventaGastos={this.state.ventaGastos}
                  entradasTotales={this.state.entradasTotales}

                  ingenieriaComparativa={this.state.ingenieriaComparativa}
                  contratistaComparativa={this.state.contratistaComparativa}
                  materialesComparativa={this.state.materialesComparativa}



                  alert={this.props.alert}

              />

            </React.Fragment>
        );
    }
}


export default InformesIndex;
WebpackerReact.setup({ InformesIndex });