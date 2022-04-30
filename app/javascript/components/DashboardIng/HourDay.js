import React, { Component } from 'react';
import BarReporterHours from '../../generalcomponents/BarReporterHours';

class HourDay extends Component {
    constructor(props) {
        super(props);
        this.token = document.querySelector("[name='csrf-token']").content;
        this.state = {
            data: [],
            form: {
                value: 10
            }
        }
    }



    componentDidMount() {
        this.loadData(10);
    }

    loadData = (type) => {

        fetch(`/home/get_dashboard_four_ing/${type}`, {
            method: 'GET', // or 'PUT'
            headers: {
                "X-CSRF-Token": this.token,
                "Content-Type": "application/json"
            }
        })
            .then(response => response.json())
            .then(data => {
                this.setState({
                    data: data
                });
            });
    }

    handleChange = e => {
        this.setState({
            form: {
                ...this.state.form,
                [e.target.name]: e.target.value
            }
        });
        this.loadData(e.target.value);
    }


    render() {
        return (
            <div >
                <div className='p-1'>
                    <select
                        name="value"
                        className={`form form-control`}
                        value={this.state.form.value}
                        onChange={this.handleChange}
                        style={{ width: "200px" }}
                    >
                        <option value="">Seleccione año</option>
                        <option value="10">10</option>
                        <option value="15">15</option>
                        <option value="30">30</option>

                    </select>
                    {/* <button className='btn btn-primary' onClick={()=>this.loadData("6")}> 6 </button>
                        <button className='btn btn-primary' onClick={()=>this.loadData("3")}> 3 </button> */}
                </div>
                <hr />
                <BarReporterHours data={this.state.data} title={"Horas por día"} />
            </div>
        )

    }
}

export default HourDay;
