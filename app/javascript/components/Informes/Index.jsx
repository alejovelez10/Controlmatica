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
    dataLineAccumulated = (nextProps) => {

        let target = this.props.alert[0].total_min
        let array = [['x', 'datos', { role: "annotation", type: "string" }, '%'], [0, 0, "", target]]


        


        nextProps.dataCostCenter.map((data, index) => {

            let data_percent = data.aiu_percent_real + "%"
            let data_percent_num = data.aiu_percent_real
            if (data.percent == 0) {
                data_percent = ""
            }
            /* if (!data.state) {
                data_percent_num = null
            } */

            array.push([index + 1, data_percent_num, data_percent, target])



        })


        this.setState((state, props) => ({
            dataLineAccumulated: array
        }));
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