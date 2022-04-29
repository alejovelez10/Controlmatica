import React, { Component } from 'react';
import WebpackerReact from 'webpacker-react';
import { BarDayIng } from '../generalcomponents/BarDayIng';

class InformeIng extends Component {
    constructor(props) {
        super(props);
        this.token = document.querySelector("[name='csrf-token']").content;
        this.state = {
            data: []
        }
    }



    componentDidMount() {
        this.loadData();
    }

    loadData = () => {
        fetch(`/home/get_dashboard_ing`, {
            method: 'GET', // or 'PUT'
            headers: {
                "X-CSRF-Token": this.token,
                "Content-Type": "application/json"
            }
        })
            .then(response => response.json())
            .then(data => {
                this.setState({
                    data: data.data
                });
            });
    }



    render() {
        return (
            <div className='row'>
                <div className='col-md-12'>
                    <BarDayIng data={this.state.data} />
                </div>
                <div className='col-md-12'>
                    <hr />
                </div>
                <div className='col-md-6'>
                    <BarDayIng data={this.state.data} />
                </div>
                <div className='col-md-6'>
                    <BarDayIng data={this.state.data} />
                </div>
            </div>
        )

    }
}

export default InformeIng;
WebpackerReact.setup({ InformeIng });