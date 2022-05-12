import React from 'react';
import ApexCharts from 'react-apexcharts'
class BarDayIng extends React.Component {
  constructor(props) {
    super(props);

    this.state = {

      series: [],
      options: {
        chart: {
          type: 'bar',
          height: 350,
          stacked: true,
        },
        plotOptions: {
          bar: {
            horizontal: false,
          },
        },
        stroke: {
          width: 1,
          colors: ['#fff']
        },
        title: {
          text: undefined,
            style: {
              fontSize:  '24px',
              fontWeight:  'bold',
              fontFamily:  undefined,
              color:  '#a0a0a0'
            },
        },
        xaxis: {
          categories: [],
          labels: {
            formatter: (val) => {
              return this.numberToCurrency(val)
            }
          }
        },
        yaxis: {

        },
        tooltip: {
          y: {
            formatter: (val) => {
              return this.numberToCurrency(val)
            }
          }
        },
        fill: {
          opacity: 1
        },
        legend: {
          position: 'top',
          horizontalAlign: 'left',
          offsetX: 40
        }
      },


    };


  }


  numberToCurrency = (amount) => {
    if (amount != undefined) {
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
  }



  componentWillReceiveProps(nextProps) {
    console.log('componentWillReceiveProps', nextProps);
    if (this.props !== nextProps) {
      this.setState({
        series: nextProps.data.series.length > 0 ? nextProps.data.series : [],
        options: {
          chart: {
            type: 'bar',
            stacked: true,
            toolbar: {
              show: false
            }
          },
          plotOptions: {
            bar: {
              horizontal: false,
            },
          },
          stroke: {
            width: 1,
            colors: ['#fff']
          },
          xaxis: {
            categories: nextProps.data.series.length > 0 ? nextProps.data.categories : [],
            labels: {
              formatter: (val) => {
                return val
              }
            }
          },
          yaxis: {
            title: {
              text: undefined
            },
            labels: {
              formatter: (val) => {
                if (nextProps.type == "currency") {
                  return this.numberToCurrency(val)
                } else {
                  return val
                }

              }
            },
          },
          tooltip: {
            y: {
              formatter: (val) => {
                if (nextProps.type == "currency") {
                  return this.numberToCurrency(val)
                } else {
                  return val
                }
              }
            }
          },
          fill: {
            opacity: 1
          },
          legend: {
            position: 'top',
            horizontalAlign: 'left',
            offsetX: 40
          }
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


export default BarDayIng;