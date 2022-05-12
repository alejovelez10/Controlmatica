import React from 'react';
import ApexCharts from 'react-apexcharts'
class BarReporterHours extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      leyend: this.props.leyend,
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
          text: undefined,
          style: {
            fontSize: '20px',
            fontWeight: 'bold',
            fontFamily: undefined,
            color: '#a0a0a0'
          },
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
        leyend: nextProps.leyend,
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
            },
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
              color: '#a0a0a0'
            },
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
          },
          tooltip: {
            y: {
              formatter: (val) => {
                  return val
              }
            }
          },
        },
      }
      );
    }
  }




  render() {
    return (



      <React.Fragment>
        <div className='title-chart-item'>{this.props.title}</div>
        {this.state.leyend &&(
          <div className='chart-leyend'><div className='chart-max chart-leyend-item'>VAS MUY BIEN <span></span></div> <div className='chart-med chart-leyend-item'>PUEDES MEJORAR <span></span></div> <div className='chart-min chart-leyend-item'>NO TE DESCUIDES<span></span></div></div>
        )}
        <div id="chart">
          {this.state.options.xaxis.categories.length > 0 ? (
            <ApexCharts options={this.state.options} series={this.state.series} type="bar" height={this.props.height} />
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


export default BarReporterHours;