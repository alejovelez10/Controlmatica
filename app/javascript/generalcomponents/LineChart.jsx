import React from "react";
import Chart from "react-google-charts";

class LineChartIndicator extends React.Component {
    constructor(props) {
        super(props);
        this.chartReference = React.createRef();


    }
    componentDidMount() {
        console.log(this.chartReference); // returns a Chart.js instance reference
    }

    
    render() {
        
        return (

            
            <React.Fragment>
                <div>
                    
                    <Chart
                        width={'100%'}
                        height={'400px'}
                        chartType="ColumnChart"
                        loader={<div>Loading Chart</div>}
                        data={this.props.data} options={{
                            title: "TENDENCIA DE CALIFICACIÓN",
                            hAxis: {
                                title: 'FECHA',
                            }, vAxis: {
                                title: 'RESULTADO',
                            },
                        }}
                        options={{
                            chartArea:{left:50,top:20, bottom:20,width:"100%"},
                            vAxis: { minValue: 0, maxValue: 100 },
                            hAxis: { minValue: 0, maxValue: 31,
                            },
                           
                          }}
                        rootProps={{ 'data-testid': '1' }}
                    />


                </div>





            </React.Fragment>
        );
    }
}

export default LineChartIndicator;
