import React from "react";
import Chart from "react-google-charts";
import NumberFormat from "react-number-format";

// Paleta de colores moderna
const modernColors = [
    "#6366f1",  // Indigo
    "#f59e0b",  // Amber
    "#10b981",  // Emerald
    "#ec4899",  // Pink
    "#3b82f6",  // Blue
    "#8b5cf6",  // Violet
    "#14b8a6",  // Teal
    "#f97316",  // Orange
];

const styles = {
    legendContainer: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '16px',
        justifyContent: 'center'
    },
    legendItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        background: '#f8fafc',
        borderRadius: '8px',
        fontSize: '13px'
    },
    legendDot: {
        width: '10px',
        height: '10px',
        borderRadius: '50%'
    },
    legendLabel: {
        color: '#4b5563',
        fontWeight: '500'
    },
    legendValue: {
        color: '#1f2937',
        fontWeight: '600'
    }
};

class DoughnutChart extends React.Component {
    constructor(props) {
        super(props);
        this.chartReference = React.createRef();
    }

    componentDidMount() {
        console.log(this.chartReference);
    }

    render() {
        const chartColors = this.props.colors || modernColors;

        return (
            <React.Fragment>
                <div style={styles.legendContainer}>
                    {this.props.data.map((dn, index) => (
                        index > 0 && (
                            <div key={index} style={styles.legendItem}>
                                <span style={{...styles.legendDot, background: chartColors[index - 1] || chartColors[0]}}></span>
                                <span style={styles.legendLabel}>{dn[0]}</span>
                                <span style={styles.legendValue}>
                                    <NumberFormat displayType={"text"} thousandSeparator={true} prefix={'$'} value={dn[1]}/>
                                </span>
                            </div>
                        )
                    ))}
                </div>
                <div>
                    <Chart
                        width={'100%'}
                        height={'300px'}
                        chartType="PieChart"
                        loader={<div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Cargando gráfica...</div>}
                        data={this.props.data}
                        options={{
                            legend: 'none',
                            colors: chartColors,
                            pieHole: 0.5,
                            pieSliceText: 'percentage',
                            pieSliceTextStyle: {
                                color: '#fff',
                                fontSize: 12,
                                bold: true
                            },
                            chartArea: { width: '90%', height: '90%' },
                            sliceVisibilityThreshold: 0,
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
                        rootProps={{ 'data-testid': '3' }}
                    />
                </div>
            </React.Fragment>
        );
    }
}

export default DoughnutChart;
