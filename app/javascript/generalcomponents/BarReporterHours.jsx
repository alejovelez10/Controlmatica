import React from 'react';
import ApexCharts from 'react-apexcharts'
class BarReporterHours extends React.Component {
  constructor(props) {
    super(props);

    this.state = {

      series: [{
        data: []
      }],
      options: {
        chart: {
          height: 350,
          type: 'bar',
          events: {
            click: function (chart, w, e) {
              // console.log(chart, w, e)
            }
          }
        },
        title: {
          text: 'Horas por mes'
        },
        colors: ["blue", "blue", "blue", "blue", "blue", "blue", "blue", "blue"],
        plotOptions: {
          bar: {
            columnWidth: '45%',
            distributed: true,
          }
        },
        dataLabels: {
          enabled: false
        },
        legend: {
          show: false
        },
        xaxis: {
          categories: [

          ],
          labels: {
            style: {
              colors: ["blue", "blue", "blue", "blue", "blue", "blue", "blue", "blue"],
              fontSize: '12px'
            }
          }
        }
      },


    };
  }




  componentWillReceiveProps(nextProps) {
    console.log('componentWillReceiveProps', nextProps);
    if (this.props !== nextProps) {
      this.setState({
        series: [{
          data: nextProps.data.series
        }],
        options: {
          chart: {
            height: 350,
            type: 'bar',
            events: {
              click: function (chart, w, e) {
                // console.log(chart, w, e)
              }
            }
          },
          title: {
            text: nextProps.title
          },
          colors: nextProps.data.colors,
          plotOptions: {
            bar: {
              columnWidth: '45%',
              distributed: true,
            }
          },
          dataLabels: {
            enabled: true
          },
          legend: {
            show: false
          },
          xaxis: {
            categories: nextProps.data.categories,
            labels: {
              style: {
                colors: nextProps.data.colors_lables,
                fontSize: '12px'
              }
            }
          }
        },
      }
      );
    }
  }




  render() {
    return (




      <div id="chart">
        {this.state.options.xaxis.categories.length > 0 ? (
          <ApexCharts options={this.state.options} series={this.state.series} type="bar"  />
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


export default BarReporterHours;