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

                execution_state: [],
                service_type: [],
                invoiced_state: [],

                start_date: "",
                end_date:"",
                quotation_number:"",
                centro_incluido: "Excluidos",
                cliente_incluido: "Excluidos",
            },

            selectedOption: {
                customer_id: "",
                label: "Buscar cliente"
            },

            selectedOptionCentro: {
                cost_center_id: "",
                label: "Centro de costo"
            },

            //states 

            selectedOptionType: {
                execution_state: "",
                label: "Estado de tipo"
            },

            selectedOptionEjecucion: {
                service_type: "",
                label: "Estado de ejecución"
            },

            selectedOptionFacturado: {
                invoiced_state: "",
                label: "Estado facturado"
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
            
            //states 

            dataType: [],
            dataEjecucion: [],
            dataFacturado: [],
  
        }
    }

    componentDidMount(){
        let dataType = ["PROYECTO", "SERVICIO", "VENTA"]
        let dataEjecucion = ["FINALIZADO", "PENDIENTE", "EJECUCION"]
        let dataFacturado = ["FACTURADO", "FACTURADO PARCIAL", "LEGALIZADO", "LEGALIZADO PARCIAL", "POR FACTURAR", "PENDIENTE DE ORDEN DE COMPRA", "PENDIENTE DE COTIZACION"]

        let arrayType = []
        let arrayEjecucion = []
        let arrayFacturado = []


        let arrayClients = []
        let array_cost_center = []
  
        this.props.clientes.map((item) => (
          arrayClients.push({label: item.name, value: item.id})
        ))
    
        this.props.cost_center.map((item) => (
          array_cost_center.push({label: item.code, value: item.id})
        ))

        // selects states

        dataType.map((item) => (
          arrayType.push({label: item, value: item})
        ))

        dataEjecucion.map((item) => (
          arrayEjecucion.push({label: item, value: item})
        ))

        dataFacturado.map((item) => (
          arrayFacturado.push({label: item, value: item})
        ))

        this.setState({
            dataCostCenterSelect: array_cost_center,
            clientes: arrayClients,
            dataType: arrayType,
            dataEjecucion: arrayEjecucion,
            dataFacturado: arrayFacturado,
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

    //select states 

    handleChangeAutocompleteType = selectedOptionType => {
      let array = []

        selectedOptionType.map((item) => (
          array.push(item.value)
        ))
    
        this.setState({
          formFilter: {
            ...this.state.formFilter,
            service_type: array
          }
        })
    };

    handleChangeAutocompleteEjecucion = selectedOptionEjecucion => {
      let array = []

        selectedOptionEjecucion.map((item) => (
          array.push(item.value)
        ))
    
        this.setState({
          formFilter: {
            ...this.state.formFilter,
            execution_state: array
          }
        })
    };

    handleChangeAutocompleteFacturado = selectedOptionFacturado => {
      let array = []

        selectedOptionFacturado.map((item) => (
          array.push(item.value)
        ))
    
        this.setState({
          formFilter: {
            ...this.state.formFilter,
            invoiced_state: array
          }
        })
    };

    updateStateLoad = (state) => {
      this.setState({ isLoaded: state })
    } 
    
    handleChangeCheckCentro = (e) => {
      const checked = e.target.checked

      this.setState({
        formFilter: {
          ...this.state.formFilter,
          centro_incluido: e.target.value,
        }
      })

    }

    handleChangeCheckClientes = (e) => {
      const checked = e.target.checked

      this.setState({
        formFilter: {
          ...this.state.formFilter,
          cliente_incluido: e.target.value,
        }
      })

    }


    HandleClickFilter = e => {
        this.setState({ isLoaded: true })
        fetch(`/get_informes?customer_id=${this.state.formFilter.customer_id != undefined ? this.state.formFilter.customer_id : ""}&cost_center_id=${this.state.formFilter.cost_center_id != undefined ? this.state.formFilter.cost_center_id : ""}&execution_state=${this.state.formFilter.execution_state != undefined ? this.state.formFilter.execution_state : ""}&service_type=${this.state.formFilter.service_type != undefined ? this.state.formFilter.service_type : ""}&invoiced_state=${this.state.formFilter.invoiced_state != undefined ? this.state.formFilter.invoiced_state : ""}&date_desde=${this.state.formFilter.start_date != undefined ? this.state.formFilter.start_date : ""}&date_hasta=${this.state.formFilter.end_date != undefined ? this.state.formFilter.end_date : ""}&centro_incluido=${this.state.formFilter.centro_incluido}&cliente_incluido=${this.state.formFilter.cliente_incluido}`)
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

              execution_state: [],
              service_type: [],
              invoiced_state: [],

              start_date: "",
              end_date:"",
              quotation_number:"",
              centro_incluido: "Excluidos",
              cliente_incluido: "Excluidos",
            },
    
            selectedOption: {
              customer_id: "",
              label: "Buscar cliente"
            },
            
            selectedOptionCentro: {
              cost_center_id: "",
              label: "Centro de costo"
            },

            //states 

            selectedOptionType: {
                execution_state: "",
                label: "Estado de tipo"
            },

            selectedOptionEjecucion: {
                service_type: "",
                label: "Estado de ejecución"
            },

            selectedOptionFacturado: {
                invoiced_state: "",
                label: "Estado facturado"
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

            execution_state: [],
            service_type: [],
            invoiced_state: [],

            start_date: "",
            end_date:"",
            quotation_number:"",
            centro_incluido: "Excluidos",
            cliente_incluido: "Excluidos",
          },
  
          selectedOption: {
            customer_id: "",
            label: "Buscar cliente"
          },
          
          selectedOptionCentro: {
            cost_center_id: "",
            label: "Centro de costo"
          },

          //states 

          selectedOptionType: {
              execution_state: "",
              label: "Estado de tipo"
          },

          selectedOptionEjecucion: {
              service_type: "",
              label: "Estado de ejecución"
          },

          selectedOptionFacturado: {
              invoiced_state: "",
              label: "Estado facturado"
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

                  handleChangeCheckCentro={this.handleChangeCheckCentro}
                  handleChangeCheckClientes={this.handleChangeCheckClientes}


                  formAutocompleteCustomer={this.state.selectedOption}
                  onChangeAutocompleteCustomer={this.handleChangeAutocompleteCustomer}
                  clientes={this.state.clientes}

                  /* AUTOCOMPLETE CENTRO DE COSTO */

                  centro={this.state.dataCostCenterSelect}
                  onChangeAutocompleteCentro={this.handleChangeAutocompleteCentro}
                  formAutocompleteCentro={this.state.selectedOptionCentro}


                  /* AUTOCOMPLETE TIPO */

                  dataType={this.state.dataType}
                  onChangeAutocompleteType={this.handleChangeAutocompleteType}
                  formAutocompleteType={this.state.selectedOptionType}


                  /* AUTOCOMPLETE ESTADO DE EJECUCION */

                  dataEjecucion={this.state.dataEjecucion}
                  onChangeAutocompleteEjecucion={this.handleChangeAutocompleteEjecucion}
                  formAutocompleteEjecucion={this.state.selectedOptionEjecucion}

                  /* AUTOCOMPLETE ESTADO DE FACTURADO */

                  dataFacturado={this.state.dataFacturado}
                  onChangeAutocompleteFacturado={this.handleChangeAutocompleteFacturado}
                  formAutocompleteFacturado={this.state.selectedOptionFacturado}

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