import React, { Component } from 'react';
import WebpackerReact from 'webpacker-react';
import HourPerMonth from '../components/DashboardIng/HourPerMonth';
import ReporterHours from '../components/DashboardIng/ReporterHours';
import HourProjectMonth from '../components/DashboardIng/HourProjectMonth';
import HourDay from '../components/DashboardIng/HourDay';



class InformeIng extends Component {
    constructor(props) {
        super(props);

    }

    render() {
        return (
            <div className='row'>
                <div style={{ background: "white", padding: "10px" }} className='col-md-6'>
                    <HourPerMonth />
                </div>
                <div style={{ background: "white", padding: "10px" }} className='col-md-6'>
                    <ReporterHours />
                </div>
               <div className='col-md-12'> <hr/></div>
            
                <div style={{ background: "white", padding: "10px" }} className='col-md-12'>
                    <HourProjectMonth />
                </div>
                <div className='col-md-12'> <hr/></div>
                <div style={{ background: "white", padding: "10px" }} className='col-md-6'>
                    <ReporterHours />
                </div>
                <div style={{ background: "white", padding: "10px" }} className='col-md-6'>
                    <HourDay />
                </div>

            </div>
        )

    }
}

export default InformeIng;
WebpackerReact.setup({ InformeIng });