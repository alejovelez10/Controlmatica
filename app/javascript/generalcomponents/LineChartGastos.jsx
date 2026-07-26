import React from "react";
import Chart from "react-google-charts";

// Colores modernos por defecto
const defaultColors = ["#14b8a6", "#f59e0b", "#3b82f6"];

class LineChartGastos extends React.Component {
    constructor(props) {
        super(props);
        this.chartReference = React.createRef();
    }

    componentDidMount() {
        console.log(this.chartReference);
    }

    render() {
        const chartColors = this.props.colors || defaultColors;

        return (
            <React.Fragment>
                <div>
                    <Chart
                        width={'100%'}
                        height={'400px'}
                        chartType="ColumnChart"
                        loader={<div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Cargando gráfica...</div>}
                        data={this.props.data}
                        options={{
                            chartArea: { left: 60, top: 20, bottom: 40, width: "85%", height: "75%" },
                            vAxis: {
                                minValue: 0,
                                gridlines: { color: '#f3f4f6', count: 5 },
                                textStyle: { color: '#6b7280', fontSize: 11 },
                                format: 'short'
                            },
                            hAxis: {
                                textStyle: { color: '#6b7280', fontSize: 11 },
                                slantedText: false
                            },
                            colors: chartColors,
                            legend: { position: 'none' },
                            bar: { groupWidth: '70%' },
                            isStacked: false,
                            animation: {
                                startup: true,
                                duration: 500,
                                easing: 'out'
                            },
                            tooltip: {
                                textStyle: { fontSize: 12 },
                                showColorCode: true
                            }
                        }}
                        rootProps={{ 'data-testid': '1' }}
                    />
                </div>
            </React.Fragment>
        );
    }
}

export default LineChartGastos;
