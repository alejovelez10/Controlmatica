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
            toolbar: {
              show: false
            }
          },
          title: {
            text: undefined,
            style: {
              fontSize: '20px',
              fontWeight: 'bold',
              fontFamily: undefined,
              color: '#a0a0a0',
              marging: 10
            },
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
      <React.Fragment>
        <div className='title-chart-item'>{this.props.title}</div>
        <div id="chart">
          {this.state.series.length > 0 ? (
            <ApexCharts options={this.state.options} series={this.state.series} type="donut" height={this.props.height} />
          ) : (
            <div>
              <p className="no-chart">Horas por mes por proyecto</p>
              <div className='no-chart-container'><p>No hay datos</p></div>
            </div>

          )}
        </div>
      </React.Fragment>
    );
  }
}


export default DonutDaysReport;