import React, { Component } from 'react';
import LineChartIndicator from "../../generalcomponents/LineChart"

class Index extends Component {
    constructor(props) {
        super(props)
        this.token = document.querySelector("[name='csrf-token']").content;
        this.state = {
            dataLine: [],
        }

    }

    componentWillReceiveProps(nextProps) {

        if (this.props !== nextProps) {
           this.dataLineAccumulated(nextProps) 
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
    
       /*  let months_lleno =[] 
        months.map((month,index)=>{
            let total = []
            total = nextProps.dataCostCenter.filter((data)=>{
                return new Date(data.start_date).getMonth() == index
            })

            let valuer = 0;
            if (total.length > 0)
            {
                total.map(value=>{
                    valuer = valuer + value.quotation_value
                })
            }

            else{
                valuer = 0;
            }


            months_lleno.push(valuer)
        }) */
       
        let array = [['x', 'datos', { role: "annotation", type: "string" }, '%', { role: "annotation", type: "string" }]]

        
        


        nextProps.dataCostCenter.map((data, index) => {

            let data_percent = data
            let data_percent_num = data
            let data_percent_currency = this.numberToCurrency(data)
            
            let gastos =  nextProps.dataMaterials[index] + nextProps.dataReports[index] + nextProps.dataTableristas[index]
            let gastos_currency = this.numberToCurrency(gastos)
     
            /* if (!data.state) {
                data_percent_num = null
            } */

            array.push([months[index], data_percent_num,data_percent_currency, gastos,gastos_currency ])



        })


        this.setState((state, props) => ({
            dataLineAccumulated: array
        }));
    }

     numberToCurrency=(amount)=> {

        var thousandsSeparator = ","
        var currencyNum = "";
        var amountString = amount.toString();
        var digits = amountString.split("");

        var countDigits = digits.length;
        var revDigits = digits.reverse();

        for(var i=0; i<countDigits; i++) {
            if ((i%3 == 0) && (i !=0)) {
                currencyNum += thousandsSeparator+revDigits[i];
            } else {
                currencyNum += digits[i];
            }
        };

        var revCurrency = currencyNum.split("").reverse().join("");

        var finalCurrency = "$"+revCurrency;

        return finalCurrency;
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
                    <div className="col-md-12">
                    <div className="card">
                        <div className="card-body">
                            <h3>Tendencia de Aiu</h3>
                            <LineChartIndicator data={this.state.dataLineAccumulated} />
                        </div>
                    </div>
                </div>
                </div>
            </React.Fragment>
        );
    }
}

export default Index;