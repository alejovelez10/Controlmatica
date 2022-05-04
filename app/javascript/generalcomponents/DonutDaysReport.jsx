import React from 'react';
import ApexCharts from 'react-apexcharts'
class DonutDaysReport extends React.Component {
  constructor(props) {
    super(props);

    this.state = {

      series: [],
      options: {
        chart: {
          type: 'donut',
        },
        responsive: [{
          breakpoint: 480,
          options: {
            chart: {
              width: 200
            },
            legend: {
              position: 'bottom'
            }
          }
        }]
      },
    }
  }




  componentWillReceiveProps(nextProps) {
    console.log('componentWillReceiveProps', nextProps);
    if (this.props !== nextProps) {
      this.setState({
        series: nextProps.data.series,
        options: {
          chart: {
            type: 'donut',
          },
          title: {
            text: 'Horas por proyecto mes %'
          },
          labels: nextProps.data.categories,
          responsive: [{
            breakpoint: 480,
            options: {
              chart: {
                width: 200
              },
              legend: {
                position: 'bottom'
              }
            }
          }]
        },
      }
      );
    }
  }




  render() {
    return (
      <div id="chart">
      {this.state.series.length > 0 ? (
       <ApexCharts options={this.state.options} series={this.state.series} type="donut"  />
      ) : (
        <div>
          <p className="no-chart">Horas por mes por proyecto</p>
          <div className='no-chart-container'><p>No hay datos</p></div>
        </div>

      )}
    </div>

    );
  }
}


export default DonutDaysReport;