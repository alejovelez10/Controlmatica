import React from "react";
import Chart from "react-google-charts";
import NumberFormat from "react-number-format";

class DoughnutChart extends React.Component {
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
        <div className="pie-header">
          <div className="datos">
            {this.props.data.map((dn,index) => (
              <div key={index} className={dn[0].replace(" " , "_")}>
                <p>{dn[0]}</p>
                <p><NumberFormat displayType={"text"} thousandSeparator={true} prefix={'$'} value={dn[1]}/></p>
              </div>
            )
            )}

          </div>
        </div>
        <div>
          <Chart
            width={'100%'}
            height={'300px'}
            chartType="PieChart"
            loader={<div>Loading Chart</div>}

            data={
              this.props.data
            }
            options={{
              legend: 'none',
              colors: ["#4ab77b", "#ffc800", "#2196f3"],
              // Just add this option
              pieHole: 0.4,
            }}
            rootProps={{ 'data-testid': '3' }}
          />
        </div>

      </React.Fragment>
    );
  }
}

export default DoughnutChart;
