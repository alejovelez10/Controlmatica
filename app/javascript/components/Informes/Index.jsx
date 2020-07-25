import React, { Component } from 'react';
import LineChartIndicator from "../../generalcomponents/LineChart"
import DonaIndicator from "../../generalcomponents/DoughnutChart"
import LineChartGastos from "../../generalcomponents/LineChartGastos"


class Index extends Component {
    constructor(props) {
        super(props)
        this.token = document.querySelector("[name='csrf-token']").content;
        this.state = {
            dataLine: [],
            dataPie: [],
            dataLineGastos: [],
        }

    }

    componentWillReceiveProps(nextProps) {

        if (this.props !== nextProps) {
            this.dataLineAccumulated(nextProps)
            this.donaChart(nextProps)
            this.dataLineGastos(nextProps)

        }
    }

    date = (fecha) => {
        var d = new Date(fecha),
            months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'jun', 'jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return months[fecha];

    }


    dataLineAccumulated = (nextProps) => {

        let target = this.props.alert[0].total_min

        let months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'jun', 'jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        let array = [['x', 'datos', '%']]

        nextProps.dataCostCenter.map((data, index) => {

            let data_percent = data
            let data_percent_num = data
            let data_percent_currency = this.numberToCurrency(data)

            let gastos = nextProps.dataMaterials[index] + nextProps.dataReports[index] + nextProps.dataTableristas[index]
            let gastos_currency = this.numberToCurrency(gastos)

            /* if (!data.state) {
                data_percent_num = null
            } */

            array.push([months[index], data_percent_num, gastos])



        })


        this.setState((state, props) => ({
            dataLine: array
        }));
    }

    dataLineGastos = (nextProps) => {

        let target = this.props.alert[0].total_min

        let months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'jun', 'jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        let array = [['x', 'datos', '%', '%']]

        nextProps.dataCostCenter.map((data, index) => {


            let mat = nextProps.dataMaterials[index]
            let mat_currency = this.numberToCurrency(mat)

            let rep = nextProps.dataReports[index]
            let rep_currency = this.numberToCurrency(rep)

            let tab = nextProps.dataTableristas[index]
            let tab_currency = this.numberToCurrency(tab)

            /* if (!data.state) {
                data_percent_num = null
            } */

            array.push([months[index], rep, tab, mat])



        })


        this.setState((state, props) => ({
            dataLineGastos: array
        }));
    }

    donaChart = (nextProps) => {
        let array = [['x', 'datos']]



        this.setState((state, props) => ({
            dataPie: nextProps.dataTotales
        }));
    }

    numberToCurrency = (amount) => {

        var thousandsSeparator = ","
        var currencyNum = "";
        var amountString = amount.toString();
        var digits = amountString.split("");

        var countDigits = digits.length;
        var revDigits = digits.reverse();

        for (var i = 0; i < countDigits; i++) {
            if ((i % 3 == 0) && (i != 0)) {
                currencyNum += thousandsSeparator + revDigits[i];
            } else {
                currencyNum += digits[i];
            }
        };

        var revCurrency = currencyNum.split("").reverse().join("");

        var finalCurrency = "$" + revCurrency;

        return finalCurrency;
    }

    getfacturaGastos=(value)=>{
       
        let porcentaje = 0 
        if (value[1] != undefined)
        {
        let gastos = value[1][2];
        let facturacion = value[1][1];
        let resta = facturacion - gastos
        let porcentaje = 0  
        if (facturacion > 0)
        {
            porcentaje = Math.round((resta/facturacion)*100,0)
        }
    }
        return porcentaje
    }

    getfacturaVentas=(value)=>{
       
        let porcentaje = 0 
        if (value[1] != undefined)
        {
            let facturacion = value[1][1];
            let ventas = value[1][2];
            let resta = ventas - facturacion
             
            if (ventas > 0)
            {
                porcentaje = Math.round((resta/ventas)*100,0)
            }
        }
     
        return porcentaje
    }
    
    render() {
        return (
            <React.Fragment>
                <div className="row">
                    <div className="col-md-12">
                        <div className="card card-table">
                            <div className="card-body">
                                <div className="col-md-12 p-0 mb-4">
                                    <div className="row">
                                        <div className="col-md-8 text-left">

                                        </div>

                                        <div className="col-md-4 text-right mt-1 mb-1">
                                            <button
                                                className="btn btn-light mr-3"
                                                onClick={this.props.show}
                                            >
                                                Filtros <i className="fas fa-search ml-2"></i>
                                            </button>

                                        </div>

                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="card">
                            <div className="card-body">
                                <h3>MARGEN</h3>
                                <div style={{ display: "flex", justifyContent: "flex-end" }}> <div style={{ borderRadius: "4px", padding: "10px", background: "#65ab84", color: "white", marginRight: "10px" }}>Ventas</div> <div style={{ borderRadius: "4px", padding: "10px", background: "#206ba7", color: "white" }}>Gastos</div></div>
                                <LineChartIndicator data={this.state.dataLine} />
                            </div>
                        </div>
                    </div>

                    <div className="col-md-6">
                        <div className="card">
                            <div className="card-body">
                                <h3>GASTOS</h3>
                                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                    <div style={{ borderRadius: "4px", padding: "10px", background: "#4ab77b", color: "white", marginRight: "10px" }}>Ingenieria</div>
                                    <div style={{ borderRadius: "4px", padding: "10px", background: "#ffc800", color: "white", marginRight: "10px" }}>Tableristas</div>
                                    <div style={{ borderRadius: "4px", padding: "10px", background: "#2196f3", color: "white", marginRight: "10px" }}>Materiales</div>

                                </div>
                                <LineChartGastos data={this.state.dataLineGastos} />
                            </div>
                        </div>
                    </div>
                    <div className="col-md-12"><hr /></div>
                    <div className="col-md-6">
                        <div className="card">
                            <div className="card-body">
                                <h3>FACTURACION VS GASTOS</h3>
                                <p>Utilidad {this.getfacturaGastos(this.props.facturaGastos)}%</p>
                                <div style={{ display: "flex", justifyContent: "flex-end" }}> <div style={{ borderRadius: "4px", padding: "10px", background: "#65ab84", color: "white", marginRight: "10px" }}>FACTURACION</div> <div style={{ borderRadius: "4px", padding: "10px", background: "#206ba7", color: "white" }}>GASTOS</div></div>

                                <LineChartIndicator data={this.props.facturaGastos} />
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="card">
                            <div className="card-body">
                                <h3>VENTAS VS GASTOS</h3>
                                <p>Utilidad {this.getfacturaGastos(this.props.facturaVentas)}%</p>

                                <div style={{ display: "flex", justifyContent: "flex-end" }}> <div style={{ borderRadius: "4px", padding: "10px", background: "#65ab84", color: "white", marginRight: "10px" }}>VENTAS</div> <div style={{ borderRadius: "4px", padding: "10px", background: "#206ba7", color: "white" }}>GASTOS</div></div>
                                <LineChartIndicator data={this.props.ventaGastos} />
                            </div>
                        </div>
                    </div>
                    <div className="col-md-12"><hr /></div>
                    <div className="col-md-6">
                        <div className="card">
                            <div className="card-body">
                                <h3>FACTURACION VS VENTAS</h3>
                                <p>Se a facturado un  {this.getfacturaVentas(this.props.facturaVentas)}% de las ventas</p>
                            </div>
                            <div style={{ display: "flex", justifyContent: "flex-end" }}> <div style={{ borderRadius: "4px", padding: "10px", background: "#65ab84", color: "white", marginRight: "10px" }}>FACTURACION</div> <div style={{ borderRadius: "4px", padding: "10px", background: "#206ba7", color: "white" , marginRight: "10px"}}>VENTAS</div></div>

                            <LineChartIndicator data={this.props.facturaVentas} />
                        </div>
                    </div>
 
                    <div className="col-md-6">
                        <div className="card">
                            <div className="card-body">
                                <h3>DISTRIBUCION DE GASTOS</h3>
                                <DonaIndicator data={this.state.dataPie} />
                            </div>
                        </div>
                    </div>

                </div>
            </React.Fragment >
        );
    }
}

export default Index;