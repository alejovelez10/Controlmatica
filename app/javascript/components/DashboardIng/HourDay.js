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

    componentWillReceiveProps(nextProps) {
        this.loadData(10,nextProps.user);
    }

    componentDidMount() {
        this.loadData(10, this.props.user);
    }

    loadData = (type, user) => {

        fetch(`/home/get_dashboard_four_ing/${type}/${user}`, {
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
        this.loadData(e.target.value,this.props.user);
    }


    render() {
        return (
            <div>
                <div className='dashboard-filters'>
                    <select
                        name="value"
                        className="dashboard-select"
                        value={this.state.form.value}
                        onChange={this.handleChange}
                    >
                        <option value="">Seleccione período</option>
                        <option value="10">Últimos 10 días</option>
                        <option value="15">Últimos 15 días</option>
                        <option value="30">Últimos 30 días</option>
                    </select>
                </div>
                <div className="dashboard-card">
                    <BarReporterHours data={this.state.data} title={"Horas por Proyecto por Día"} leyend={true} height={this.props.height}/>
                </div>
            </div>
        )

    }
}

export default HourDay;
